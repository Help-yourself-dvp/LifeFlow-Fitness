package com.fitflow.app
import android.content.Context
import android.os.Build
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.HeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
object HealthConnectHelper {
    @JvmStatic
    var lastError: String = ""

    @JvmStatic
    var lastBedTime: String = ""

    @JvmStatic
    var lastWakeTime: String = ""

    // Время последней записи шагов с часов (epoch ms, 0 = нет) —
    // для определения свежести данных в режиме «Авто» (часы сняты?).
    @JvmStatic
    var lastWatchEndMs: Long = 0L

    // 0.9.52: время ПЕРВОЙ записи шагов с часов за сегодня (epoch ms, 0 = нет).
    // Вместе с lastWatchEndMs даёт «покрытие дня» часами: если записи тянутся
    // через большую часть суток — часы были на руке и им можно доверять в
    // режиме «Авто»; если только вечером — телефон донёс остальной день.
    @JvmStatic
    var lastWatchStartMs: Long = 0L

    // Приложения-спутники носимых устройств (часы/браслеты), которые пишут
    // в Health Connect данные именно с устройства, а не с телефона.
    // ВАЖНО: Google Fit (com.google.android.apps.fitness) сюда НЕ входит —
    // он пишет шаги с телефона, и мы не хотим помечать их как «часы».
    private val WEARABLE_PACKAGES = setOf(
        "com.huami.watch.hmwatchmanager",         // Zepp / Amazfit
        "com.garmin.android.apps.connectmobile",  // Garmin Connect
        "fi.polar.polarflow",                     // Polar Flow
        "com.suunto.sports",                      // Suunto
        "com.coros.health",                       // COROS
        "com.huawei.health",                      // Huawei Health (Huawei Watch/Band)
        "com.hihonor.health",                     // Honor Health
        "com.xiaomi.hm.health",                   // Zepp Life (бывш. Mi Fit) / Xiaomi Band
        "com.xiaomi.wearable",                    // Mi Fitness (Xiaomi Wear)
        "com.sec.android.app.shealth",            // Samsung Health (Galaxy Watch)
        "com.fitbit.FitbitMobile",                // Fitbit
        "com.withings.wiscale2"                   // Withings Health Mate
    )

    // 0.9.15: разрешение на чтение Health Connect В ФОНЕ.
    // По умолчанию Health Connect отдаёт данные только приложению на переднем
    // плане: наш часовой HealthSyncReceiver честно просыпался и получал отказ,
    // поэтому данные подтягивались лишь при открытии приложения. Начиная с
    // Android 15 существует отдельное разрешение, снимающее этот запрет.
    //
    // ВАЖНО (иначе сборка падает): строку пишем литералом, а НЕ берём из
    // HealthPermission. Проект собирается с connect-client:1.1.0-alpha07
    // (январь 2024), а константа PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
    // и класс HealthConnectFeatures появились только в 1.1.0-alpha09.
    // Поднимать библиотеку сейчас нельзя: в 1.1.0-alpha12 поле metadata у
    // записей стало обязательным, а его конструктор — внутренним, и наш
    // insertWorkoutSession перестал бы компилироваться. Разрешение всё равно
    // проверяет системная служба Health Connect, а не клиентская библиотека:
    // достаточно объявить его в манифесте и получить согласие пользователя.
    // Значение зафиксировано платформой и не меняется.
    @JvmStatic
    val BACKGROUND_READ_PERMISSION: String = "android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"

    // Доступна ли функция на этом устройстве. У пользователя может стоять
    // старая версия Android/Health Connect, где фонового чтения нет вовсе —
    // тогда просить разрешение бессмысленно и мы не показываем ничего.
    // Штатная проверка (features.getFeatureStatus) недоступна в закреплённой
    // версии библиотеки, поэтому опираемся на два факта: сама служба доступна
    // и версия Android не ниже 15 (VANILLA_ICE_CREAM, API 35) — именно там
    // появилось фоновое чтение. Если разрешение уже выдано, считаем функцию
    // доступной без оглядки на версию: выданное разрешение — лучшее из
    // возможных доказательств поддержки.
    @JvmStatic
    fun isBackgroundReadAvailable(context: Context): Boolean {
        return try {
            if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) return false
            if (hasBackgroundReadPermission(context)) return true
            Build.VERSION.SDK_INT >= 35
        } catch (e: Exception) {
            false
        }
    }

    // Выдано ли разрешение. Проверяем ровно так же, как остальные разрешения HC —
    // через getGrantedPermissions, а не через проверку манифеста: пользователь
    // может отозвать доступ в настройках в любой момент. На старых версиях
    // службы этой строки в выданных просто не будет — вернётся false.
    @JvmStatic
    fun hasBackgroundReadPermission(context: Context): Boolean {
        return try {
            if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) return false
            val client = HealthConnectClient.getOrCreate(context)
            runBlocking {
                client.permissionController.getGrantedPermissions()
                    .contains(BACKGROUND_READ_PERMISSION)
            }
        } catch (e: Exception) {
            false
        }
    }

    // Одна строка состояния для JS: чтобы не гонять два моста подряд.
    // unavailable — фонового чтения на этом устройстве нет; granted — всё
    // хорошо, фон работает; denied — функция есть, разрешения нет, можно
    // предложить выдать.
    @JvmStatic
    fun backgroundReadStatus(context: Context): String {
        if (!isBackgroundReadAvailable(context)) return "unavailable"
        return if (hasBackgroundReadPermission(context)) "granted" else "denied"
    }

    @JvmStatic
    fun syncNow(context: Context): IntArray {
        return try {
            val client = HealthConnectClient.getOrCreate(context)
            val today = LocalDate.now()
            val zone = ZoneId.systemDefault()
            val startOfDay = today.atStartOfDay(zone).toInstant()
            val endOfDay = today.plusDays(1).atStartOfDay(zone).toInstant()

            // 1. ШАГИ: читаем сырые записи и разделяем по источнику (часы vs телефон),
            // чтобы приложение не складывало шаги телефона и часов.
            // Читаем ПОСТРАНИЧНО: readRecords возвращает до 1000 записей за
            // страницу (pageSize по умолчанию) и pageToken при продолжении —
            // без цикла часть шагов за день могла бы молча потеряться.
            var totalSteps = 0L
            var watchSteps = 0L
            var watchLastEndMs = 0L
            var watchFirstStartMs = Long.MAX_VALUE // 0.9.52: покрытие дня часами
            val origins = mutableMapOf<String, Long>()
            var pageToken: String? = null
            do {
                val stepsReq = ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(startOfDay, endOfDay),
                    pageToken = pageToken
                )
                val stepsResponse = runBlocking { client.readRecords(stepsReq) }
                for (record in stepsResponse.records) {
                    val pkg = record.metadata.dataOrigin?.packageName ?: ""
                    val endMs = record.endTime.toEpochMilli()
                    totalSteps += record.count
                    origins[pkg] = (origins[pkg] ?: 0L) + record.count
                    if (WEARABLE_PACKAGES.contains(pkg)) {
                        watchSteps += record.count
                        if (endMs > watchLastEndMs) watchLastEndMs = endMs
                        val startMs = record.startTime.toEpochMilli()
                        if (startMs < watchFirstStartMs) watchFirstStartMs = startMs
                    }
                }
                pageToken = stepsResponse.pageToken
            } while (pageToken != null)
            lastWatchEndMs = watchLastEndMs
            lastWatchStartMs = if (watchFirstStartMs == Long.MAX_VALUE) 0L else watchFirstStartMs

            // 2. СОН: ночная сессия пересекает полночь, поэтому окно с 18:00
            // вчерашнего дня до 18:00 сегодняшнего накрывает её целиком.
            var sleepMin = 0
            try {
                val sleepStart = today.minusDays(1).atTime(18, 0).atZone(zone).toInstant()
                val sleepEnd = today.atTime(18, 0).atZone(zone).toInstant()
                val sleepReq = ReadRecordsRequest(SleepSessionRecord::class, TimeRangeFilter.between(sleepStart, sleepEnd))
                val sleepResponse = runBlocking { client.readRecords(sleepReq) }
                var totalMs = 0L
                var bestMs = 0L
                var bestStart: Instant? = null
                var bestEnd: Instant? = null
                for (record in sleepResponse.records) {
                    val ms = record.endTime.toEpochMilli() - record.startTime.toEpochMilli()
                    if (ms > 0) {
                        totalMs += ms
                        if (ms > bestMs) {
                            bestMs = ms
                            bestStart = record.startTime
                            bestEnd = record.endTime
                        }
                    }
                }
                sleepMin = (totalMs / 60000).toInt()
                val fmt = DateTimeFormatter.ofPattern("HH:mm")
                lastBedTime = if (bestStart != null) fmt.format(bestStart.atZone(zone)) else ""
                lastWakeTime = if (bestEnd != null) fmt.format(bestEnd.atZone(zone)) else ""
            } catch (_: Exception) {
                lastBedTime = ""
                lastWakeTime = ""
            }

            val originsDesc = origins.entries.joinToString(", ") { it.key + ": " + it.value }
            lastError = "OK (часы: " + watchSteps + ", всего в HC: " + totalSteps + ", сон: " + sleepMin + "м, источники: " + (if (originsDesc.isEmpty()) "нет" else originsDesc) + ")"
            intArrayOf(watchSteps.toInt(), totalSteps.toInt(), sleepMin)
        } catch (e: Exception) {
            var grantedStr = ""
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = runBlocking { client.permissionController.getGrantedPermissions() }
                grantedStr = " (выдано в ОС: " + granted.size + ")"
            } catch (_: Exception) {}
            lastError = e.javaClass.simpleName + ": " + (e.message ?: "ошибка доступа") + grantedStr
            intArrayOf(0, 0, 0)
        }
    }

    /* 0.8.0: сессии тренировок из Health Connect (ExerciseSessionRecord).
       Возвращает JSON-массив: [{recordId, type, title, start, end, minutes}].
       Тип мапится по надёжным константам; остальное JS доопределяет по заголовку.
       0.8.25: окно расширено с «сегодня» до последних WORKOUTS_LOOKBACK_DAYS суток —
       если владелец не открывал приложение пару дней, тренировки с часов за эти дни
       всё равно подхватятся (JS сам решает: сегодняшние ждут подтверждения,
       прошлые добавляются автоматически с возможностью отмены). */
    private const val WORKOUTS_LOOKBACK_DAYS = 3L

    /* 0.9.14: минимальная длительность сессии. Короче — это не тренировка,
       а случайно включённый и сразу выключенный режим на часах. Тот же порог
       продублирован в JS (onHealthWorkoutsReceived), менять надо в обоих местах. */
    private const val MIN_WORKOUT_MINUTES = 5

    /* 0.9.15: суммарные минуты тренировок ЗА СЕГОДНЯ — для фоновой проверки
       вечернего напоминания. Отдельный лёгкий метод вместо разбора JSON из
       readTodayWorkouts: тому окно 3 суток и он возвращает строку, а фоновому
       ресиверу нужно одно число и как можно быстрее. Свой экспорт и слишком
       короткие отрезки отбрасываем ровно по тем же правилам, иначе фон и
       приложение считали бы день по-разному. */
    @JvmStatic
    fun readTodayExerciseMinutes(context: Context): Int {
        return try {
            val client = HealthConnectClient.getOrCreate(context)
            val zone = ZoneId.systemDefault()
            val today = LocalDate.now()
            val start = today.atStartOfDay(zone).toInstant()
            val end = today.plusDays(1).atStartOfDay(zone).toInstant()
            val selfPkg = context.packageName
            var total = 0
            var pageToken: String? = null
            do {
                val req = ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    pageToken = pageToken
                )
                val resp = runBlocking { client.readRecords(req) }
                for (rec in resp.records) {
                    if ((rec.metadata.dataOrigin?.packageName ?: "") == selfPkg) continue
                    val minutes = ((rec.endTime.toEpochMilli() - rec.startTime.toEpochMilli()) / 60000L).toInt()
                    if (minutes < MIN_WORKOUT_MINUTES) continue
                    total += minutes
                }
                pageToken = resp.pageToken
            } while (pageToken != null)
            total
        } catch (e: Exception) {
            -1
        }
    }

    @JvmStatic
    fun readTodayWorkouts(context: Context): String {
        return try {
            val client = HealthConnectClient.getOrCreate(context)
            val today = LocalDate.now()
            val zone = ZoneId.systemDefault()
            val startOfDay = today.minusDays(WORKOUTS_LOOKBACK_DAYS).atStartOfDay(zone).toInstant()
            val endOfDay = today.plusDays(1).atStartOfDay(zone).toInstant()
            val req = ReadRecordsRequest(ExerciseSessionRecord::class, TimeRangeFilter.between(startOfDay, endOfDay))
            val resp = runBlocking { client.readRecords(req) }
            val arr = JSONArray()
            val selfPkg = context.packageName
            for (rec in resp.records) {
                /* 0.9.10: не возвращаем собственный экспорт. Кнопка «Записать в
                   Health Connect» кладёт туда наши же тренировки, и они читались
                   обратно как «сессии с часов» — тренировка задваивалась сама
                   с собой. У шагов такой фильтр по источнику был с самого начала. */
                if ((rec.metadata.dataOrigin?.packageName ?: "") == selfPkg) continue
                val minutes = ((rec.endTime.toEpochMilli() - rec.startTime.toEpochMilli()) / 60000L).toInt()
                if (minutes < MIN_WORKOUT_MINUTES) continue
                val obj = JSONObject()
                obj.put("recordId", rec.metadata.id)
                obj.put("type", mapExerciseType(rec.exerciseType))
                obj.put("title", rec.title ?: "")
                obj.put("start", rec.startTime.toEpochMilli())
                obj.put("end", rec.endTime.toEpochMilli())
                obj.put("minutes", minutes)
                arr.put(obj)
            }
            arr.toString()
        } catch (e: Exception) {
            "[]"
        }
    }

    /* 0.9.14: история тренировок за последние N дней — обратная заливка.
       Раньше сессии читались только за WORKOUTS_LOOKBACK_DAYS (3 суток), и всё,
       что старше, не подтягивалось НИКОГДА — даже при ручной синхронизации.
       У шагов (0.8.11) и сна (0.9.11) обратная заливка за 30 дней была, а у
       тренировок её просто забыли сделать. Читаем постранично: за месяц сессий
       может быть больше страницы (часы пишут «тренировкой» и обычную ходьбу).
       Формат ответа тот же, что у readTodayWorkouts — JS-слой общий. */
    @JvmStatic
    fun readWorkoutsHistory(context: Context, days: Int): String {
        return try {
            val n = if (days in 1..90) days else 30
            val client = HealthConnectClient.getOrCreate(context)
            val today = LocalDate.now()
            val zone = ZoneId.systemDefault()
            val start = today.minusDays((n - 1).toLong()).atStartOfDay(zone).toInstant()
            val end = today.plusDays(1).atStartOfDay(zone).toInstant()
            val records = mutableListOf<ExerciseSessionRecord>()
            var pageToken: String? = null
            do {
                val req = ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    pageToken = pageToken
                )
                val resp = runBlocking { client.readRecords(req) }
                records.addAll(resp.records)
                pageToken = resp.pageToken
            } while (pageToken != null)
            val arr = JSONArray()
            val selfPkg = context.packageName
            for (rec in records) {
                // 0.9.10: собственный экспорт обратно не читаем — иначе тренировка
                // задваивается сама с собой (см. readTodayWorkouts).
                if ((rec.metadata.dataOrigin?.packageName ?: "") == selfPkg) continue
                val minutes = ((rec.endTime.toEpochMilli() - rec.startTime.toEpochMilli()) / 60000L).toInt()
                if (minutes < MIN_WORKOUT_MINUTES) continue
                val obj = JSONObject()
                obj.put("recordId", rec.metadata.id)
                obj.put("type", mapExerciseType(rec.exerciseType))
                obj.put("title", rec.title ?: "")
                obj.put("start", rec.startTime.toEpochMilli())
                obj.put("end", rec.endTime.toEpochMilli())
                obj.put("minutes", minutes)
                arr.put(obj)
            }
            arr.toString()
        } catch (e: Exception) {
            "[]"
        }
    }

    private fun mapExerciseType(t: Int): String = when (t) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "run"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "bike"
        ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "walk"
        ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT -> "other"
        else -> ""
    }

    /* 0.8.11: история шагов за последние N дней — обратная заливка (P28).
       Группируем StepsRecord по локальной дате (сумма всех источников). */
    @JvmStatic
    fun readStepsHistory(context: Context, days: Int): String {
        return try {
            val n = if (days in 1..90) days else 30
            val client = HealthConnectClient.getOrCreate(context)
            val today = LocalDate.now()
            val zone = ZoneId.systemDefault()
            val start = today.minusDays((n - 1).toLong()).atStartOfDay(zone).toInstant()
            val end = today.plusDays(1).atStartOfDay(zone).toInstant()
            // 0.9.12: читаем ПОСТРАНИЧНО. readRecords отдаёт до 1000 записей за
            // страницу; за 30 дней часы пишут шаги мелкими кусками — это тысячи
            // записей. Без цикла приходила только первая страница (самые старые
            // дни), и свежие дни молча не доезжали до приложения. Именно поэтому
            // сон дозаливался (1-2 записи за ночь), а шаги — нет.
            val records = mutableListOf<StepsRecord>()
            var pageToken: String? = null
            do {
                val req = ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    pageToken = pageToken
                )
                val resp = runBlocking { client.readRecords(req) }
                records.addAll(resp.records)
                pageToken = resp.pageToken
            } while (pageToken != null)
            // 0.9.11: раньше суммировались ВСЕ источники — шаги телефона и часов
            // складывались в один день, завышая итог. Считаем раздельно, как в syncNow:
            // если за день есть данные с часов, день описывают именно они.
            val byDate = sortedMapOf<String, Long>()
            val byDateWatch = sortedMapOf<String, Long>()
            for (rec in records) {
                val isWatch = WEARABLE_PACKAGES.contains(rec.metadata.dataOrigin?.packageName ?: "")
                // 0.9.11: запись, пересекающую полночь, раньше целиком относили к дню
                // начала — из-за этого ночные шаги утекали во вчера. Делим количество
                // между сутками пропорционально времени, попавшему в каждые из них.
                val startDate = rec.startTime.atZone(zone).toLocalDate()
                val endDate = rec.endTime.atZone(zone).toLocalDate()
                if (startDate == endDate) {
                    val k = startDate.toString()
                    byDate[k] = (byDate[k] ?: 0L) + rec.count
                    if (isWatch) byDateWatch[k] = (byDateWatch[k] ?: 0L) + rec.count
                    continue
                }
                val totalMs = rec.endTime.toEpochMilli() - rec.startTime.toEpochMilli()
                if (totalMs <= 0L) {
                    val k = startDate.toString()
                    byDate[k] = (byDate[k] ?: 0L) + rec.count
                    if (isWatch) byDateWatch[k] = (byDateWatch[k] ?: 0L) + rec.count
                    continue
                }
                var cursor = startDate
                var assigned = 0L
                while (!cursor.isAfter(endDate)) {
                    val dayStart = cursor.atStartOfDay(zone).toInstant()
                    val dayEnd = cursor.plusDays(1).atStartOfDay(zone).toInstant()
                    val from = if (rec.startTime.isAfter(dayStart)) rec.startTime else dayStart
                    val to = if (rec.endTime.isBefore(dayEnd)) rec.endTime else dayEnd
                    val overlapMs = to.toEpochMilli() - from.toEpochMilli()
                    if (overlapMs > 0L) {
                        val part = if (cursor == endDate) rec.count - assigned
                                   else rec.count * overlapMs / totalMs
                        if (part > 0L) {
                            val k = cursor.toString()
                            byDate[k] = (byDate[k] ?: 0L) + part
                            if (isWatch) byDateWatch[k] = (byDateWatch[k] ?: 0L) + part
                            assigned += part
                        }
                    }
                    cursor = cursor.plusDays(1)
                }
            }
            val arr = JSONArray()
            for ((date, steps) in byDate) {
                val watch = byDateWatch[date] ?: 0L
                val obj = JSONObject()
                obj.put("date", date)
                // Часы приоритетнее: телефон в кармане и часы на руке считают одно и то же.
                obj.put("steps", if (watch > 0L) watch else steps)
                obj.put("watchSteps", watch)
                obj.put("totalSteps", steps)
                arr.put(obj)
            }
            arr.toString()
        } catch (e: Exception) {
            "[]"
        }
    }

    /* 0.8.11: записать завершённую тренировку в Health Connect
       (ExerciseSessionRecord). Возвращает "OK" или текст ошибки. */
    @JvmStatic
    fun insertWorkoutSession(context: Context, title: String, typeKey: String, startMillis: Long, endMillis: Long): String {
        return try {
            val client = HealthConnectClient.getOrCreate(context)
            val start = Instant.ofEpochMilli(startMillis)
            val end = Instant.ofEpochMilli(endMillis)
            val offset = ZoneId.systemDefault().rules.getOffset(start)
            val rec = ExerciseSessionRecord(
                startTime = start,
                startZoneOffset = offset,
                endTime = end,
                endZoneOffset = offset,
                exerciseType = mapWorkoutTypeToHC(typeKey),
                title = title
            )
            runBlocking { client.insertRecords(listOf(rec)) }
            "OK"
        } catch (e: Exception) {
            e.javaClass.simpleName + ": " + (e.message ?: "ошибка записи")
        }
    }

    private fun mapWorkoutTypeToHC(t: String): Int = when (t) {
        "cardio" -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
        "bike" -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING
        "walk" -> ExerciseSessionRecord.EXERCISE_TYPE_HIKING
        else -> ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT
    }

    /* 0.8.23: показатели тела с умных весов (любой производитель через
       Health Connect): вес по дням + последний рост. WeightRecord/HeightRecord
       существуют с ранних alpha connect-client — стабильно. BodyFatRecord
       добавлен только в 1.1.0 stable — НЕ используем (alpha07 может не знать). */
    @JvmStatic
    fun readBodyMetrics(context: Context, days: Int): String {
        return try {
            val n = if (days in 1..90) days else 30
            val client = HealthConnectClient.getOrCreate(context)
            val today = LocalDate.now()
            val zone = ZoneId.systemDefault()
            val start = today.minusDays((n - 1).toLong()).atStartOfDay(zone).toInstant()
            val end = today.plusDays(1).atStartOfDay(zone).toInstant()
            val timeRange = TimeRangeFilter.between(start, end)

            val weights = JSONArray()
            try {
                val resp = runBlocking { client.readRecords(ReadRecordsRequest(WeightRecord::class, timeRange)) }
                val byDate = sortedMapOf<String, Double>()
                for (rec in resp.records) {
                    val date = rec.time.atZone(zone).toLocalDate().toString()
                    byDate[date] = rec.weight.inKilograms
                }
                for ((date, kg) in byDate) {
                    val o = JSONObject()
                    o.put("date", date)
                    o.put("kg", Math.round(kg * 10) / 10.0)
                    weights.put(o)
                }
            } catch (_: Exception) {}

            var heightM = 0.0
            try {
                val resp = runBlocking { client.readRecords(ReadRecordsRequest(HeightRecord::class, timeRange)) }
                if (resp.records.isNotEmpty()) {
                    heightM = resp.records.last().height.inMeters
                }
            } catch (_: Exception) {}

            val out = JSONObject()
            out.put("weights", weights)
            out.put("heightM", heightM)
            out.toString()
        } catch (e: Exception) {
            "{}"
        }
    }

    /* 0.9.11: история сна за последние N дней — обратная заливка.
       Раньше сон читался только в окне «вчера 18:00 → сегодня 18:00» (syncNow),
       поэтому пропущенная ночь задним числом не восстанавливалась никогда:
       не открыл приложение утром — данные за ту ночь потеряны навсегда.
       Ночь относим к дню ПРОБУЖДЕНИЯ (как и чек-ин: «сколько я спал сегодня»),
       сессии одной ночи суммируем, для времени отхода/подъёма берём самую
       длинную сессию этой ночи. */
    @JvmStatic
    fun readSleepHistory(context: Context, days: Int): String {
        return try {
            val n = if (days in 1..90) days else 30
            val client = HealthConnectClient.getOrCreate(context)
            val today = LocalDate.now()
            val zone = ZoneId.systemDefault()
            // Берём с запасом в сутки назад: ночь, засчитанная в первый день окна,
            // начинается ещё накануне вечером.
            val start = today.minusDays(n.toLong()).atStartOfDay(zone).toInstant()
            val end = today.plusDays(1).atStartOfDay(zone).toInstant()
            // 0.9.12: постранично — как и шаги (страница ограничена 1000 записей).
            val records = mutableListOf<SleepSessionRecord>()
            var pageToken: String? = null
            do {
                val req = ReadRecordsRequest(
                    recordType = SleepSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    pageToken = pageToken
                )
                val resp = runBlocking { client.readRecords(req) }
                records.addAll(resp.records)
                pageToken = resp.pageToken
            } while (pageToken != null)

            val totals = sortedMapOf<String, Long>()
            val bestMs = mutableMapOf<String, Long>()
            val bestStart = mutableMapOf<String, Instant>()
            val bestEnd = mutableMapOf<String, Instant>()
            for (rec in records) {
                val ms = rec.endTime.toEpochMilli() - rec.startTime.toEpochMilli()
                if (ms <= 0L) continue
                val date = rec.endTime.atZone(zone).toLocalDate().toString()
                totals[date] = (totals[date] ?: 0L) + ms
                if (ms > (bestMs[date] ?: 0L)) {
                    bestMs[date] = ms
                    bestStart[date] = rec.startTime
                    bestEnd[date] = rec.endTime
                }
            }

            val fmt = DateTimeFormatter.ofPattern("HH:mm")
            val arr = JSONArray()
            for ((date, ms) in totals) {
                val minutes = (ms / 60000L).toInt()
                if (minutes <= 0) continue
                val obj = JSONObject()
                obj.put("date", date)
                obj.put("minutes", minutes)
                bestStart[date]?.let { obj.put("bedTime", fmt.format(it.atZone(zone))) }
                bestEnd[date]?.let { obj.put("wakeTime", fmt.format(it.atZone(zone))) }
                arr.put(obj)
            }
            arr.toString()
        } catch (e: Exception) {
            "[]"
        }
    }
}
