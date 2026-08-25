package com.fitflow.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;

/* Напоминания о воде с кнопкой «+250 мл» прямо в шторке уведомлений.
   Расписание приходит из приложения (CSV минут от полуночи) и хранится
   в SharedPreferences, поэтому после перезагрузки телефона будильник
   перевооружается через BOOT_COMPLETED без открытия приложения. */
public class WaterReminderReceiver extends BroadcastReceiver {
    public static final int WATER_NOTIFICATION_ID = 4250;
    private static final int ALARM_REQUEST_CODE = 4250;
    private static final String PREFS = "fitflow_reminders";
    private static final String KEY_TIMES = "waterTimes";
    private static final String CHANNEL_ID = "fitflow_water_reminders_native";
    private static final String ACTION_ALARM = "com.fitflow.app.WATER_REMINDER_ALARM";
    // 0.4.13 (полевой баг: «смахиваю уведомление — приходит повторно»):
    // смахивание = «увидел», даём 45 минут тишины вместо новых сигналов.
    private static final String ACTION_DISMISS = "com.fitflow.app.WATER_REMINDER_DISMISSED";
    private static final String KEY_MUTE_UNTIL = "muteUntilMs";
    private static final long DISMISS_MUTE_MS = 45L * 60L * 1000L;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = (intent == null) ? "" : intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            rescheduleFromPrefs(context);
            return;
        }
        // 0.4.13: смахнутое напоминание не возвращается минимум 45 минут.
        if (ACTION_DISMISS.equals(action)) {
            prefs(context).edit().putLong(KEY_MUTE_UNTIL, System.currentTimeMillis() + DISMISS_MUTE_MS).apply();
            rescheduleFromPrefs(context);
            return;
        }
        // 0.5.6 (решение владельца вместо настройки «пауза»): вода записана
        // недавно — ближайший сигнал пропускаем; сетка НЕ сдвигается, следующее
        // напоминание придёт в свой обычный час. Порог — сам интервал сетки:
        // пьёшь не реже, чем напоминает FitFlow, — значит, не донимаем.
        SharedPreferences wprefs = context.getSharedPreferences("fitflow_widget", Context.MODE_PRIVATE);
        long lastWaterAt = wprefs.getLong("lastWaterAt", 0);
        if (lastWaterAt > 0
                && System.currentTimeMillis() - lastWaterAt < scheduleIntervalMs(context)) {
            rescheduleFromPrefs(context);
            return;
        }
        // Время пришло: показать напоминание и перевооружить на следующее
        postWaterNotification(context, false);
        rescheduleFromPrefs(context);
    }

    /* Установить расписание (вызывается из JS-моста MainActivity) */
    public static void setSchedule(Context context, String csv) {
        prefs(context).edit().putString(KEY_TIMES, csv == null ? "" : csv).apply();
        rescheduleFromPrefs(context);
    }

    /* Полностью выключить напоминания */
    public static void clearSchedule(Context context) {
        prefs(context).edit().remove(KEY_TIMES).apply();
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmPi(context));
        try { NotificationManagerCompat.from(context).cancel(WATER_NOTIFICATION_ID); } catch (Exception e) { }
    }

    /* Кнопка «+250 мл» нажата (или вода добавлена с виджета):
       обновить текст уже показанного напоминания. Если напоминания
       на экране нет — новое не создаём. */
    public static void onWaterAdded(Context context) {
        if (Build.VERSION.SDK_INT >= 23) {
            boolean active = false;
            try {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    for (android.service.notification.StatusBarNotification n : nm.getActiveNotifications()) {
                        if (n.getId() == WATER_NOTIFICATION_ID) { active = true; break; }
                    }
                }
            } catch (Exception e) { }
            if (!active) return;
        }
        postWaterNotification(context, true);
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static PendingIntent alarmPi(Context c) {
        Intent i = new Intent(c, WaterReminderReceiver.class);
        i.setAction(ACTION_ALARM);
        return PendingIntent.getBroadcast(c, ALARM_REQUEST_CODE, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void rescheduleFromPrefs(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmPi(context);
        long next = computeNextTrigger(context, System.currentTimeMillis());
        if (next <= 0) { am.cancel(pi); return; }
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
            }
        } catch (SecurityException se) {
            try { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi); } catch (Exception e2) { }
        } catch (Exception e) { }
    }

    /* 0.5.6: интервал сетки в мс — минимальный положительный зазор между
       соседними слотами сохранённого расписания (оно в минутах от полуночи,
       через запятую: "480,570,660,..."). Если вычислить нельзя — 90 минут. */
    private static long scheduleIntervalMs(Context context) {
        try {
            String csv = prefs(context).getString(KEY_TIMES, "");
            if (csv == null || csv.trim().length() == 0) return 90L * 60000L;
            ArrayList<Integer> mins = new ArrayList<>();
            for (String part : csv.split(",")) {
                try {
                    int v = Integer.parseInt(part.trim());
                    if (v >= 0 && v < 1440) mins.add(v);
                } catch (Exception e) { }
            }
            Collections.sort(mins);
            int best = 0;
            for (int i = 1; i < mins.size(); i++) {
                int diff = mins.get(i) - mins.get(i - 1);
                if (diff > 0 && (best == 0 || diff < best)) best = diff;
            }
            if (best > 0) return best * 60000L;
        } catch (Exception e) { }
        return 90L * 60000L;
    }

    static long computeNextTrigger(Context context, long nowMs) {
        String csv = prefs(context).getString(KEY_TIMES, "");
        if (csv == null || csv.trim().length() == 0) return -1;
        // 0.4.13: в период тишины после смахивания ближайшие слоты пропускаются.
        long mutedUntil = prefs(context).getLong(KEY_MUTE_UNTIL, 0);
        if (mutedUntil > nowMs) nowMs = mutedUntil;
        ArrayList<Integer> times = new ArrayList<>();
        for (String part : csv.split(",")) {
            try {
                int v = Integer.parseInt(part.trim());
                if (v >= 0 && v < 1440) times.add(v);
            } catch (Exception e) { }
        }
        if (times.isEmpty()) return -1;
        Collections.sort(times);
        Calendar now = Calendar.getInstance();
        now.setTimeInMillis(nowMs);
        int nowMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        int chosen = -1;
        for (int t : times) { if (t > nowMin) { chosen = t; break; } }
        int daysAdd = 0;
        if (chosen < 0) { chosen = times.get(0); daysAdd = 1; }
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(nowMs);
        cal.add(Calendar.DAY_OF_YEAR, daysAdd);
        cal.set(Calendar.HOUR_OF_DAY, chosen / 60);
        cal.set(Calendar.MINUTE, chosen % 60);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= 26) {
            try {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm == null) return;
                if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                    NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "FitFlow: вода", NotificationManager.IMPORTANCE_DEFAULT);
                    ch.setDescription("Напоминания выпить воду с быстрой записью +250 мл");
                    nm.createNotificationChannel(ch);
                }
            } catch (Exception e) { }
        }
    }

    private static void postWaterNotification(Context context, boolean justAdded) {
        ensureChannel(context);
        SharedPreferences w = context.getSharedPreferences("fitflow_widget", Context.MODE_PRIVATE);
        int total = w.getInt("waterTotal", 0);
        int goal = w.getInt("waterGoal", 2500);
        // 0.4.12 (полевой баг «утреннее уведомление со вчерашними
        // цифрами»): прогресс — только за свою дату, иначе честный 0.
        String savedDate = w.getString("date", "");
        String today = new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
        if (savedDate == null || !savedDate.equals(today)) total = 0;

        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open == null) open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(context, 10, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Та же броадкаст-цепочка, что и у кнопки виджета «+250 мл»
        Intent add = new Intent(context, FitFlowWidgetProvider.class);
        add.setAction("com.fitflow.app.ADD_WATER_250");
        PendingIntent addPi = PendingIntent.getBroadcast(context, 42, add,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // 0.5.5 (владелец): «⚙️ Настроить» — сразу в раздел напоминаний
        // о воде с подсветкой (маршрут делает app.js: openNotificationSettings).
        Intent nset = new Intent(context, MainActivity.class);
        nset.putExtra("widget_action", "notif_settings_water");
        nset.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent nsetPi = PendingIntent.getActivity(context, 44, nset,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String text = justAdded
            ? "✓ Записано! Сегодня: " + total + " из " + goal + " мл."
            // 0.5.7 (владелец: «не виден весь текст, последняя фраза —
            // записывать можно...»): короткая строка видна целиком.
            : "Сегодня: " + total + " из " + goal + " мл.";

        // 0.4.13: смахивание ловим и глушим повторы (ветка ACTION_DISMISS выше).
        Intent dismiss = new Intent(context, WaterReminderReceiver.class);
        dismiss.setAction(ACTION_DISMISS);
        PendingIntent dismissPi = PendingIntent.getBroadcast(context, 43, dismiss,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_icon)
            .setContentTitle("💧 Время выпить воду")
            .setContentText(text)
            .setColor(0xFF00696B)
            .setContentIntent(openPi)
            // 0.4.13 (полевой баг «после +250 мл ещё 1–2 сигнала без новых
            // уведомлений»): обновление текста того же уведомления звучало
            // как новое. Только первый показ будит, правки текста — молча.
            .setOnlyAlertOnce(true)
            .setDeleteIntent(dismissPi)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .addAction(R.drawable.ic_stat_icon, "+ 250 мл воды", addPi)
            .addAction(R.drawable.ic_stat_icon, "⚙️ Настроить", nsetPi);

        /* 0.9.19 (владелец: «на часах уведомление можно только смахнуть») —
           отдельный список действий для умных часов.

           Как это работает. Обычные addAction() часы на Wear OS подхватывают
           сами, но кладут их во вторую карточку, до которой доскроллить
           получается не всегда. Как только WearableExtender.addAction() не
           пуст, на часах видны ТОЛЬКО перечисленные здесь кнопки — поэтому
           дублируем сюда «+250 мл» и НЕ дублируем «Настроить»: настройки
           всё равно открываются на телефоне, а лишняя кнопка на маленьком
           экране только мешает («простое приложение», один нужный жест).

           Кнопка запускает тот же PendingIntent, что и на телефоне, — броадкаст
           ADD_WATER_250. Приложение при этом не открывается: вода уходит
           в очередь prefs и доезжает в дневник при следующем запуске.

           setDismissalId связывает смахивание: убрали уведомление на часах —
           оно исчезнет и с телефона (и сработает та же 45-минутная тишина),
           убрали на телефоне — пропадёт с часов.

           Важное ограничение: это протокол Wear OS. На часах Zepp/Amazfit
           и других «компаньонных» браслетах кнопок не появится — их приложение
           читает уведомление через Notification Listener и пересылает на часы
           только текст, кнопки Android туда не пробрасываются в принципе. */
        b.extend(new NotificationCompat.WearableExtender()
            .addAction(new NotificationCompat.Action.Builder(
                    R.drawable.ic_stat_icon, "+ 250 мл", addPi)
                .build())
            .setDismissalId("fitflow-water-" + WATER_NOTIFICATION_ID));
        try {
            NotificationManagerCompat.from(context).notify(WATER_NOTIFICATION_ID, b.build());
            // 0.4.15 (просьба владельца): подтверждение «+250 мл» показывает
            // итог — и САМО уходит через 2 секунды, смахивать руками не нужно.
            if (justAdded) {
                final Context fctx = context.getApplicationContext();
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override public void run() {
                        try { NotificationManagerCompat.from(fctx).cancel(WATER_NOTIFICATION_ID); } catch (Exception e) { }
                    }
                }, 2000);
            }
        } catch (SecurityException se) { } catch (Exception e) { }
    }
}
