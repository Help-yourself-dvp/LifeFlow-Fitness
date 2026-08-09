package ru.fitflow.localai

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Base64
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.MessageCallback
import com.google.ai.edge.litertlm.SamplerConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * FitFlow Local AI — мост к LiteRT-LM (нейросеть Gemma на устройстве).
 *
 * Принципы проекта: полный офлайн (сеть не используется вообще), честные
 * ошибки на русском, одна модель в памяти за раз. Файл модели (.litertlm)
 * пользователь выбирает сам через системный диалог — скачанный заранее
 * файл подхватывается из «Загрузок» и копируется в приватную папку
 * приложения (filesDir/models).
 */
@CapacitorPlugin(
    name = "FitFlowLocalAI",
    permissions = [Permission(alias = "camera", strings = [Manifest.permission.CAMERA])]
)
class FitFlowLocalAiPlugin : Plugin() {

    private var engine: Engine? = null
    private var conversation: Conversation? = null
    private var loadedPath: String? = null
    /** Температура последней загруженной модели: resetConversation собирает
        новый диалог с той же, а не с молчаливым дефолтом (0.3.38). */
    private var lastTemperature: Double = 0.7
    /** true, если веса модели поднялись со зрением (E2B/E4B); text-only — false (0.4.0). */
    private var visionEnabled: Boolean = false
    /** Фактический бэкенд движка: GPU удалось инициализировать (0.4.6). */
    @Volatile private var gpuEnabled = false
    private val generating = AtomicBoolean(false)
    private val scope = CoroutineScope(Dispatchers.IO)

    @PluginMethod
    fun status(call: PluginCall) {
        val ret = JSObject()
        ret.put("available", Build.VERSION.SDK_INT >= 24)
        ret.put("engineLoaded", engine != null)
        ret.put("path", loadedPath)
        ret.put("generating", generating.get())
        ret.put("vision", visionEnabled)
            ret.put("gpu", gpuEnabled)
        call.resolve(ret)
    }

    /** Системный выбор файла модели + копия в приватную папку приложения. */
    @PluginMethod
    fun importModel(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 24) {
            call.reject("unsupported", "Нейросеть на устройстве требует Android 7.0 (API 24) или новее.")
            return
        }
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivityForResult(call, intent, "onModelPicked")
    }

    @ActivityCallback
    private fun onModelPicked(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val uri: Uri? = result.data?.data
        if (uri == null) {
            call.reject("cancelled", "Выбор файла отменён.")
            return
        }
        scope.launch {
            try {
                val resolver = context.contentResolver
                var displayName = "model.litertlm"
                resolver.query(uri, null, null, null, null)?.use { cursor ->
                    val idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0 && cursor.moveToFirst()) {
                        displayName = cursor.getString(idx) ?: displayName
                    }
                }
                val lower = displayName.lowercase()
                if (!lower.endsWith(".litertlm") && !lower.endsWith(".task")) {
                    call.reject("bad_ext", "Файл «$displayName» не похож на модель: нужен файл .litertlm (или .task) для LiteRT-LM, не GGUF.")
                    return@launch
                }
                val dir = File(context.filesDir, "models").apply { mkdirs() }
                val target = File(dir, displayName)
                val input = resolver.openInputStream(uri)
                    ?: throw IllegalStateException("Не удалось прочитать выбранный файл.")
                input.use { source -> FileOutputStream(target).use { dest -> source.copyTo(dest) } }
                if (target.length() < 100L * 1024 * 1024) {
                    target.delete()
                    call.reject("too_small", "Файл меньше 100 МБ — настоящая модель занимает 0.7–4 ГБ. Проверьте, что скачивание завершилось.")
                    return@launch
                }
                val ret = JSObject()
                ret.put("path", target.absolutePath)
                ret.put("name", displayName)
                ret.put("size", target.length())
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("import_failed", "Не удалось скопировать модель: ${e.message}", e)
            }
        }
    }

    /** Движок: со зрением — visionBackend, текст — null (0.4.0); GPU-бэкенд
        ускоряет prefill (0.4.6 — «думает дольше», E4B зрение ~10 с): не у всех
        весов/чипов он инициализируется — честный откат на CPU в loadModel. */
    private fun buildEngine(path: String, maxTokens: Int, withVision: Boolean, useGpu: Boolean): Engine {
        return Engine(
            EngineConfig(
                modelPath = path,
                backend = if (useGpu) Backend.GPU() else Backend.CPU(),
                visionBackend = if (withVision) (if (useGpu) Backend.GPU() else Backend.CPU()) else null,
                maxNumTokens = maxTokens
            )
        )
    }

    /** Загрузка модели в память. Первая загрузка большой модели может занять десятки секунд. */
    @PluginMethod
    fun loadModel(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 24) {
            call.reject("unsupported", "Нейросеть на устройстве требует Android 7.0 (API 24) или новее.")
            return
        }
        val path = call.getString("path") ?: loadedPath
        if (path.isNullOrBlank()) {
            call.reject("no_model", "Модель не выбрана: сначала укажите файл .litertlm.")
            return
        }
        val file = File(path)
        if (!file.exists()) {
            call.reject("bad_file", "Файл модели не найден по пути $path — выберите его заново.")
            return
        }
        val maxTokens = call.getInt("maxTokens") ?: 4096
        // v0.12.0: SamplerConfig принимает topP/temperature как Double (проверено
        // по тегированным исходникам — Float-литералы (0.95f) здесь НЕ компилируются).
        val temperature = call.getDouble("temperature") ?: 0.7
        lastTemperature = temperature
        scope.launch {
            try {
                // Старый движок освобождаем: две модели в памяти телефона — перебор.
                try { conversation?.close() } catch (_: Exception) {}
                try { engine?.close() } catch (_: Exception) {}
                conversation = null
                engine = null
                // Откатный каскад (0.4.0 зрение, 0.4.6 GPU): функциональность
                // (зрение — сценарий ТЗ) важнее скорости: GPU+зрение →
                // CPU+зрение → CPU text-only; каждый провал инициализации
                // честно фиксируется в status() флагами vision/gpu.
                var withVision = true
                var withGpu = true
                var newEngine = buildEngine(path, maxTokens, true, true)
                try {
                    newEngine.initialize()
                } catch (gpuError: Exception) {
                    try { newEngine.close() } catch (_: Exception) {}
                    withGpu = false
                    newEngine = buildEngine(path, maxTokens, true, false)
                    try {
                        newEngine.initialize()
                    } catch (visionError: Exception) {
                        try { newEngine.close() } catch (_: Exception) {}
                        withVision = false
                        newEngine = buildEngine(path, maxTokens, false, false)
                        newEngine.initialize()
                    }
                }
                val convConfig = ConversationConfig(
                    samplerConfig = SamplerConfig(topK = 40, topP = 0.95, temperature = temperature)
                )
                conversation = newEngine.createConversation(convConfig)
                engine = newEngine
                visionEnabled = withVision
                gpuEnabled = withGpu
                loadedPath = path
                val ret = JSObject()
                ret.put("loaded", true)
                ret.put("path", path)
                ret.put("vision", withVision)
                call.resolve(ret)
            } catch (e: Exception) {
                try { engine?.close() } catch (_: Exception) {}
                engine = null
                conversation = null
                call.reject(
                    "load_failed",
                    "Модель не загрузилась: ${e.message}. Проверьте, что это файл .litertlm именно для LiteRT-LM (репозитории *-litert-lm на Hugging Face) и что хватает памяти.",
                    e
                )
            }
        }
    }

    /** Генерация ответа. История диалога живёт в самой Conversation. */
    @PluginMethod
    fun generate(call: PluginCall) {
        val prompt = call.getString("prompt")
        if (prompt.isNullOrBlank()) {
            call.reject("empty", "Пустой запрос.")
            return
        }
        val conv = conversation
        if (conv == null) {
            call.reject("not_loaded", "Модель не загружена: Настройки → ИИ-помощник → выбор файла модели.")
            return
        }
        if (!generating.compareAndSet(false, true)) {
            call.reject("busy", "Модель ещё отвечает на предыдущий запрос — дождитесь завершения.")
            return
        }
        scope.launch {
            val sb = StringBuilder()
            val latch = CountDownLatch(1)
            val seenError = arrayOfNulls<Throwable>(1)
            try {
                conv.sendMessageAsync(prompt, object : MessageCallback {
                    override fun onMessage(message: Message) {
                        sb.append(message.toString())
                        // 0.3.39: частичный текст — в WebView (событие generateProgress).
                        // Долгая генерация на CPU перестаёт быть «мёртвым ожиданием»:
                        // пользователь читает ответ по ходу печати.
                        val progress = JSObject()
                        progress.put("text", sb.toString())
                        notifyListeners("generateProgress", progress)
                    }

                    override fun onDone() {
                        latch.countDown()
                    }

                    override fun onError(throwable: Throwable) {
                        seenError[0] = throwable
                        latch.countDown()
                    }
                })
                val finished = latch.await(180, TimeUnit.SECONDS)
                generating.set(false)
                if (!finished) {
                    call.reject("timeout", "Модель думала дольше 3 минут — запрос остановлен. Спросите короче.")
                    return@launch
                }
                seenError[0]?.let { throw it }
                val text = sb.toString().trim()
                if (text.isEmpty()) {
                    call.reject("empty_answer", "Модель вернула пустой ответ — переформулируйте вопрос.")
                    return@launch
                }
                val ret = JSObject()
                ret.put("text", text)
                call.resolve(ret)
            } catch (e: Exception) {
                generating.set(false)
                call.reject("generate_failed", "Ошибка генерации: ${e.message}", e)
            }
        }
    }

    /** Пересобрать диалог с новой температурой (движок и веса не трогаем —
        это дёшево). 0.4.2: фото-экстракция идёт на 0.2 против фантазий
        («2 кг бананов»), чат остаётся на своей температуре (0.4.0 — 0.7). */
    private fun recreateConversation(temp: Double) {
        val eng = engine ?: return
        try { conversation?.close() } catch (_: Exception) {}
        conversation = eng.createConversation(
            ConversationConfig(samplerConfig = SamplerConfig(topK = 40, topP = 0.95, temperature = temp))
        )
        lastTemperature = temp
    }

    /** Пункт «Камера» в системном выборе фото WebView виден только при ВЫДАННОМ
        разрешении (0.4.5, полевой баг: declared в манифесте мало — спросить
        надо заранее и по делу, при первом нажатии 📷, а не при старте). */
    @PluginMethod
    fun ensureCameraPermission(call: PluginCall) {
        if (getPermissionState("camera") == PermissionState.GRANTED) { call.resolve(); return }
        requestPermissionForAlias("camera", call, "cameraPermCallback")
    }

    @PermissionCallback
    private fun cameraPermCallback(call: PluginCall) {
        if (getPermissionState("camera") == PermissionState.GRANTED) call.resolve()
        else call.reject("no_camera", "Без разрешения камеры пункт «Снять фото» в выборе не появится. Разрешите вручную: Настройки → Приложения → FitFlow → Разрешения → Камера.")
    }

    /** Разбор фото еды (0.4.0, целевой сценарий ТЗ): картинка + промпт,
        живой стриминг — зрение на CPU медленнее текста, процесс виден.
        0.4.2: опциональный параметр temperature — диалог пересобирается на неё
        и честно возвращается к чатовой после ответа/ошибки/таймаута. */
    @PluginMethod
    fun generateWithImage(call: PluginCall) {
        val prompt = call.getString("prompt") ?: ""
        val imageBase64 = call.getString("imageBase64")
        if (imageBase64.isNullOrBlank()) {
            call.reject("empty_image", "Нет данных изображения.")
            return
        }
        if (conversation == null) {
            call.reject("not_loaded", "Модель не загружена: Настройки → ИИ-помощник.")
            return
        }
        if (!visionEnabled) {
            call.reject("no_vision", "Эта модель без зрения — фото не разберёт. Нужна зрячая Gemma E2B/E4B (.litertlm).")
            return
        }
        if (!generating.compareAndSet(false, true)) {
            call.reject("busy", "Модель ещё отвечает на предыдущий запрос — дождитесь завершения.")
            return
        }
        val photoTemp = call.getDouble("temperature")
        val chatTemp = lastTemperature
        if (photoTemp != null && photoTemp != chatTemp) recreateConversation(photoTemp)
        scope.launch {
            val sb = StringBuilder()
            val latch = CountDownLatch(1)
            val seenError = arrayOfNulls<Throwable>(1)
            try {
                val imageBytes = Base64.decode(imageBase64, Base64.DEFAULT)
                val contents = Contents.of(Content.ImageBytes(imageBytes), Content.Text(prompt))
                val conv = conversation ?: throw IllegalStateException("Модель выгружена посреди разбора фото.")
                conv.sendMessageAsync(contents, object : MessageCallback {
                    override fun onMessage(message: Message) {
                        sb.append(message.toString())
                        val progress = JSObject()
                        progress.put("text", sb.toString())
                        notifyListeners("generateProgress", progress)
                    }

                    override fun onDone() {
                        latch.countDown()
                    }

                    override fun onError(throwable: Throwable) {
                        seenError[0] = throwable
                        latch.countDown()
                    }
                })
                val finished = latch.await(300, TimeUnit.SECONDS)
                generating.set(false)
                if (photoTemp != null && photoTemp != chatTemp) recreateConversation(chatTemp)
                if (!finished) {
                    call.reject("timeout", "Модель разглядывала фото дольше 5 минут — остановлено. Попробуйте снимок светлее и ближе.")
                    return@launch
                }
                seenError[0]?.let { throw it }
                val text = sb.toString().trim()
                if (text.isEmpty()) {
                    call.reject("empty_answer", "Модель ничего не ответила по фото — попробуйте другой снимок.")
                    return@launch
                }
                val ret = JSObject()
                ret.put("text", text)
                call.resolve(ret)
            } catch (e: Exception) {
                generating.set(false)
                if (photoTemp != null && photoTemp != chatTemp) recreateConversation(chatTemp)
                call.reject("photo_failed", "Не удалось разобрать фото: ${e.message}", e)
            }
        }
    }

    /** Сброс диалога (новый разговор) без выгрузки весов модели из памяти. */
    @PluginMethod
    fun resetConversation(call: PluginCall) {
        val currentEngine = engine
        if (currentEngine == null) {
            call.reject("not_loaded", "Модель не загружена.")
            return
        }
        scope.launch {
            try {
                try { conversation?.close() } catch (_: Exception) {}
                conversation = currentEngine.createConversation(
                    ConversationConfig(
                        samplerConfig = SamplerConfig(topK = 40, topP = 0.95, temperature = lastTemperature)
                    )
                )
                call.resolve()
            } catch (e: Exception) {
                call.reject("reset_failed", "Не удалось начать новый диалог: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun unloadModel(call: PluginCall) {
        try { conversation?.close() } catch (_: Exception) {}
        try { engine?.close() } catch (_: Exception) {}
        conversation = null
        engine = null
        loadedPath = null
        call.resolve()
    }

    override fun handleOnDestroy() {
        try { conversation?.close() } catch (_: Exception) {}
        try { engine?.close() } catch (_: Exception) {}
        conversation = null
        engine = null
    }
}
