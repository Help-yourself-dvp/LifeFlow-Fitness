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

                    long lastSync = prefs.getLong("hc_last_sync_ts", 0);
                    if (System.currentTimeMillis() - lastSync >= BACKGROUND_SYNC_MIN_INTERVAL) {
                        try {
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
