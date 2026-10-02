package com.fitflow.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class HealthSyncReceiver extends BroadcastReceiver {
    public static final String ACTION_PERIODIC_SYNC = "com.fitflow.app.ACTION_HEALTH_PERIODIC_SYNC";
    private static final long BACKGROUND_SYNC_MIN_INTERVAL = 15 * 60 * 1000L; // не чаще раза в 15 минут

    @Override
    public void onReceive(Context context, Intent intent) {
        // 0.7.13: фоновое обновление шагов для виджета без открытия приложения.
        // Работа в отдельном потоке (goAsync), чтобы не блокировать главный.
        final PendingResult pending = goAsync();
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    SharedPreferences prefs = context.getSharedPreferences("fitflow_sensor_prefs", Context.MODE_PRIVATE);
                    String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
                    String savedDate = prefs.getString("steps_date", "");
                    if (!today.equals(savedDate)) {
                        prefs.edit()
                            .putString("steps_date", today)
                            .putString("steps_base_date", "")
                            .putInt("steps_base", -1)
                            .putInt("steps_today", 0)
                            .putInt("hc_steps_today", 0)
                            .putInt("hc_total_steps_today", 0)
                            .putInt("hc_sleep_min", 0)
                            .putFloat("hc_kcal_today", 0.0f)
                            .putLong("hc_last_sync_ts", System.currentTimeMillis())
                            .apply();
                    }

                    /* 0.9.57: день уже закрыт активностью — снимаем вечерний вопрос,
                       даже если приложение сегодня не открывали после тренировки.
                       Два источника, берём максимум:
                         ① снимок приложения (fitflow_widget) — минуты «как их видит
                            владелец»: записанные + пришедшие с часов и ждущие
                            подтверждения (app.js: activityMinutesWithWatch);
                         ② прямое чтение Health Connect в фоне (на Android 15+ нужно
                            разрешение «чтение в фоне»; если его нет — придёт -1).
                       ВАЖНО, в чём была причина полевой жалобы владельца: старая
                       функция cancelTrainingReminderNotification() снимает только УЖЕ
                       ПОКАЗАННОЕ уведомление, а сам будильник на 20:00 живёт в
                       AlarmManager (его ставит плагин LocalNotifications). Фон его не
                       отменял, поэтому вопрос приходил, хотя часы уже отчитались.
                       Добавлена cancelScheduledTrainingReminder(). */
                    int snapshotMin = readWidgetActivityMinutesWithWatch(context, today);
                    if (snapshotMin >= ACTIVITY_REMINDER_MIN_MINUTES) {
                        cancelScheduledTrainingReminder(context, today);
                        cancelTrainingReminderNotification(context, today);
                    }

                    long lastSync = prefs.getLong("hc_last_sync_ts", 0);
                    if (System.currentTimeMillis() - lastSync >= BACKGROUND_SYNC_MIN_INTERVAL) {
                        try {
                            /* 0.9.15: минуты тренировок за сегодня — для вечернего
                               напоминания. С фоновым чтением (Android 15+) часы
                               доезжают сами, и приложение узнаёт об активности,
                               даже если его сегодня не открывали. */
                            int exerciseMin = HealthConnectHelper.readTodayExerciseMinutes(context);
                            if (exerciseMin >= 0) {
                                prefs.edit()
                                    .putInt("hc_exercise_min_today", exerciseMin)
                                    .putString("hc_exercise_min_date", today)
                                    .apply();
                                // День уже закрыт активностью — убираем и показанный
                                // вопрос, и запланированный будильник на сегодня (0.9.57).
                                if (exerciseMin >= ACTIVITY_REMINDER_MIN_MINUTES) {
                                    cancelScheduledTrainingReminder(context, today);
                                    cancelTrainingReminderNotification(context, today);
                                }
                            }
                            int[] result = HealthConnectHelper.syncNow(context);
                            int watchSteps = result[0];
                            int totalSteps = result[1];
                            int sleepMin = result[2];
                            prefs.edit()
                                .putInt("hc_steps_today", watchSteps)
                                .putInt("hc_total_steps_today", totalSteps)
                                .putInt("hc_sleep_min", sleepMin)
                                .putString("hc_sleep_bed", HealthConnectHelper.getLastBedTime())
                                .putString("hc_sleep_wake", HealthConnectHelper.getLastWakeTime())
                                .putLong("hc_watch_last_ts", HealthConnectHelper.getLastWatchEndMs())
                                .putLong("hc_watch_first_ts", HealthConnectHelper.getLastWatchStartMs()) // 0.9.52 покрытие
                                .putLong("hc_last_sync_ts", System.currentTimeMillis())
                                .putString("hc_last_error", HealthConnectHelper.getLastError())
                                .apply();
                        } catch (Exception e) { }
                        // Виджет перерисовывается сам по resolveWidgetSteps (часы/телефон по приоритету).
                        try { FitFlowWidgetProvider.updateAll(context); } catch (Exception e) { }
                    }
                } catch (Exception e) { } finally {
                    pending.finish();
                }
            }
        }).start();
    }

    /* Вечерний вопрос «Была сегодня активность?».
       Идентификатор считается тем же алгоритмом, что и в app.js
       (FNV-1a от даты + TRAINING_REMINDER_BASE_ID) — иначе фон снимал бы
       чужое уведомление или не находил нужное.
       0.9.15: функция появилась, чтобы убирать уже показанное уведомление.
       0.9.57: выяснилось, что этого мало — запланированный будильник живёт в
       AlarmManager, и если приложение после тренировки не открывали (а именно
       так обычно и бывает вечером), он всё равно срабатывал. Теперь фон
       отменяет и его — см. cancelScheduledTrainingReminder() ниже. */
    private static final int TRAINING_REMINDER_BASE_ID = 76000;
    private static final int ACTIVITY_REMINDER_MIN_MINUTES = 15;

    static int trainingReminderId(String dateKey) {
        int hash = (int) 2166136261L;
        for (int i = 0; i < dateKey.length(); i++) {
            hash ^= dateKey.charAt(i);
            hash *= 16777619;
        }
        long unsigned = ((long) hash) & 0xFFFFFFFFL;
        return TRAINING_REMINDER_BASE_ID + (int) (unsigned % 900000L);
    }

    /* 0.9.57: минуты активности за сегодня «как их видит владелец» из снимка
       приложения (его пишет MainActivity.updateWidget при каждом сохранении).
       Пусто или снимок от прошлого дня → 0. */
    private static int readWidgetActivityMinutesWithWatch(Context context, String today) {
        try {
            SharedPreferences widget = context.getSharedPreferences("fitflow_widget", Context.MODE_PRIVATE);
            if (!today.equals(widget.getString("date", ""))) return 0;
            return Math.max(0, widget.getInt("activityMinutesWithWatch", 0));
        } catch (Exception e) {
            return 0;
        }
    }

    /* 0.9.57: отменить ЗАПЛАНИРОВАННЫЙ вечерний вопрос на сегодня.
       Уведомление ставит плагин LocalNotifications (@capacitor/local-notifications
       5.0.7) через AlarmManager: PendingIntent.getBroadcast с requestCode = id
       уведомления и Intent на его собственный ресивер
       com.capacitorjs.plugins.localnotifications.TimedNotificationPublisher.
       Класс задаётся СТРОКОЙ, а не ссылкой на класс: так сборка не зависит от
       внутренностей плагина, а совпадение PendingIntent проверяется по
       ComponentName (имя класса — то же). Тот же id-алгоритм, что в app.js
       (FNV-1a от даты + 76000) — см. trainingReminderId(). */
    private static void cancelScheduledTrainingReminder(Context context, String dateKey) {
        try {
            Intent intent = new Intent();
            intent.setClassName(context.getPackageName(),
                "com.capacitorjs.plugins.localnotifications.TimedNotificationPublisher");
            int flags = 0;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                // На Android 12+ платформа требует явный флаг изменяемости;
                // плагин ставит FLAG_MUTABLE — повторяем ровно его.
                flags = PendingIntent.FLAG_MUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, trainingReminderId(dateKey), intent, flags);
            if (pi != null) {
                AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (am != null) am.cancel(pi);
            }
        } catch (Exception e) { }
    }

    private static void cancelTrainingReminderNotification(Context context, String dateKey) {
        try {
            android.app.NotificationManager nm =
                (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(trainingReminderId(dateKey));
        } catch (Exception e) { }
    }

    public static void schedulePeriodicSync(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent i = new Intent(context, HealthSyncReceiver.class);
            i.setAction(ACTION_PERIODIC_SYNC);
            PendingIntent pi = PendingIntent.getBroadcast(context, 8402, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (am != null) {
                long interval = 60 * 60 * 1000L; // каждый 1 час в фоне
                long next = System.currentTimeMillis() + interval;
                am.setInexactRepeating(AlarmManager.RTC_WAKEUP, next, interval, pi);
            }
        } catch (Exception e) { }
    }
}
