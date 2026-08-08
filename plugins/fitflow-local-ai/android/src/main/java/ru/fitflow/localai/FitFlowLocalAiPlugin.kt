package ru.fitflow.localai

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
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
@CapacitorPlugin(name = "FitFlowLocalAI")
class FitFlowLocalAiPlugin : Plugin() {

    private var engine: Engine? = null
    private var conversation: Conversation? = null
    private var loadedPath: String? = null
    /** Температура последней загруженной модели: resetConversation собирает
        новый диалог с той же, а не с молчаливым дефолтом (0.3.38). */
    private var lastTemperature: Double = 0.7
    private val generating = AtomicBoolean(false)
    private val scope = CoroutineScope(Dispatchers.IO)

    @PluginMethod
    fun status(call: PluginCall) {
        val ret = JSObject()
        ret.put("available", Build.VERSION.SDK_INT >= 24)
        ret.put("engineLoaded", engine != null)
        ret.put("path", loadedPath)
        ret.put("generating", generating.get())
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
                val newEngine = Engine(
                    EngineConfig(
                        modelPath = path,
                        backend = Backend.CPU(),
                        maxNumTokens = maxTokens
                    )
                )
                newEngine.initialize()
                val convConfig = ConversationConfig(
                    samplerConfig = SamplerConfig(topK = 40, topP = 0.95, temperature = temperature)
                )
                conversation = newEngine.createConversation(convConfig)
                engine = newEngine
                loadedPath = path
                val ret = JSObject()
                ret.put("loaded", true)
                ret.put("path", path)
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
