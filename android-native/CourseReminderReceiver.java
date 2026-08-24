package com.fitflow.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.ArrayList;

/* 0.9.13 — напоминания «Моего курса» (витамины и добавки) с кнопкой
   «✓ Принял» прямо в шторке.

   Почему это нативный ресивер, а не планировщик Capacitor, которым курс
   пользовался раньше: в @capacitor/local-notifications кнопки уведомления
   создаются через PendingIntent.getActivity(), поэтому любое нажатие
   разворачивает приложение — флаг foreground:false в Android-реализации
   не читается вовсе. Владелец просил обратного: отметил приём в шторке —
   уведомление обновилось и ушло, приложение не открылось. Та же схема, что
   у воды (WaterReminderReceiver), поэтому и устройство файла зеркальное.

   Расписание и отметки берём из FitFlowCourses — единственной нативной
   копии правил курса. */
public class CourseReminderReceiver extends BroadcastReceiver {
    /* Диапазон id: 4300–4399. Вода занимает 4250, пересечься нельзя —
       иначе одно напоминание затирало бы другое. */
    static final int COURSE_NOTIFICATION_BASE = 4300;
    private static final int ALARM_REQUEST_CODE = 4300;

    private static final String CHANNEL_ID = "fitflow_course_reminders_native";
    static final String ACTION_ALARM = "com.fitflow.app.COURSE_REMINDER_ALARM";
    static final String ACTION_TAKEN = "com.fitflow.app.COURSE_DOSE_TAKEN";

    static final String EXTRA_COURSE_ID = "courseId";
    static final String EXTRA_DOSE_INDEX = "doseIndex";
    static final String EXTRA_DATE = "dateKey";
    static final String EXTRA_NOTIFICATION_ID = "notifId";
    static final String EXTRA_COURSE_NAME = "courseName";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = (intent == null) ? "" : intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            reschedule(context);
            return;
        }
        if (ACTION_TAKEN.equals(action)) {
            handleTaken(context, intent);
            return;
        }
        // Сработал будильник: показать всё, чему подошло время, и перевооружиться.
        showDueNotifications(context);
        reschedule(context);
    }

    /* Кнопка «✓ Принял» в шторке. Приложение не открываем: пишем отметку в
       nativeные prefs, обновляем виджет, показываем короткое подтверждение
       и гасим его через 2 секунды — руками смахивать не нужно (тот же приём,
       что в напоминании о воде). */
    private void handleTaken(Context context, Intent intent) {
        String courseId = intent.getStringExtra(EXTRA_COURSE_ID);
        String courseName = intent.getStringExtra(EXTRA_COURSE_NAME);
        int doseIndex = intent.getIntExtra(EXTRA_DOSE_INDEX, -1);
        String dateKey = intent.getStringExtra(EXTRA_DATE);
        final int notifId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, COURSE_NOTIFICATION_BASE);
        if (dateKey == null || dateKey.length() == 0) dateKey = FitFlowCourses.todayKey();
        if (courseId == null || doseIndex < 0) {
            try { NotificationManagerCompat.from(context).cancel(notifId); } catch (Exception e) { }
            return;
        }
        FitFlowCourses.markDose(context, dateKey, courseId, doseIndex, true);
        try { FitFlowWidgetProvider.updateAll(context); } catch (Exception e) { }

        ensureChannel(context);
        String title = (courseName == null || courseName.length() == 0) ? "Курс" : courseName;
        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_icon)
            .setContentTitle("💊 " + title)
            .setContentText("✓ Приём отмечен")
            .setColor(0xFFFF9E3D)
            .setOnlyAlertOnce(true)   // подтверждение не должно звучать как новое напоминание
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(openAppPi(context, notifId));
        try {
            NotificationManagerCompat.from(context).notify(notifId, b.build());
            final Context fctx = context.getApplicationContext();
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override public void run() {
                    try { NotificationManagerCompat.from(fctx).cancel(notifId); } catch (Exception e) { }
                }
            }, 2000);
        } catch (SecurityException se) { } catch (Exception e) { }
        reschedule(context);
    }

    /* Вызывается из JS-моста и после правки плана: перевооружить будильник. */
    static void reschedule(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmPi(context);
        long next = FitFlowCourses.nextTriggerMs(context, System.currentTimeMillis());
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

    /* Курсов не осталось (или напоминания выключены) — снять будильник и
       убрать возможные висящие уведомления курса. */
    static void clearAll(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmPi(context));
        try {
            NotificationManagerCompat nm = NotificationManagerCompat.from(context);
            for (int i = 0; i < 40; i++) nm.cancel(COURSE_NOTIFICATION_BASE + i);
        } catch (Exception e) { }
    }

    private static PendingIntent alarmPi(Context c) {
        Intent i = new Intent(c, CourseReminderReceiver.class);
        i.setAction(ACTION_ALARM);
        return PendingIntent.getBroadcast(c, ALARM_REQUEST_CODE, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openAppPi(Context context, int requestCode) {
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open == null) open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, requestCode, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= 26) {
            try {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm == null) return;
                if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                    NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "FitFlow: мой курс",
                        NotificationManager.IMPORTANCE_DEFAULT);
                    ch.setDescription("Напоминания о приёмах курса с отметкой прямо из шторки");
                    nm.createNotificationChannel(ch);
                }
            } catch (Exception e) { }
        }
    }

    private static void showDueNotifications(Context context) {
        ArrayList<FitFlowCourses.Dose> due = FitFlowCourses.dueDoses(context, System.currentTimeMillis());
        if (due.isEmpty()) return;
        ensureChannel(context);
        String dateKey = FitFlowCourses.todayKey();
        for (FitFlowCourses.Dose dose : due) postDose(context, dose, dateKey);
    }

    private static void postDose(Context context, FitFlowCourses.Dose dose, String dateKey) {
        int notifId = dose.notificationId();

        Intent taken = new Intent(context, CourseReminderReceiver.class);
        taken.setAction(ACTION_TAKEN);
        taken.putExtra(EXTRA_COURSE_ID, dose.courseId);
        taken.putExtra(EXTRA_COURSE_NAME, dose.courseName);
        taken.putExtra(EXTRA_DOSE_INDEX, dose.doseIndex);
        taken.putExtra(EXTRA_DATE, dateKey);
        taken.putExtra(EXTRA_NOTIFICATION_ID, notifId);
        /* Каждому приёму — свой requestCode, иначе PendingIntent переиспользуется
           и кнопка отмечала бы чужой приём (флаг IMMUTABLE не даёт подменить extras). */
        PendingIntent takenPi = PendingIntent.getBroadcast(context, notifId, taken,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // «⚙️ Настроить» — в раздел курса (маршрут делает app.js: openNotificationSettings).
        Intent nset = new Intent(context, MainActivity.class);
        nset.putExtra("widget_action", "notif_settings_course");
        nset.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent nsetPi = PendingIntent.getActivity(context, notifId + 1000, nset,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String day = dose.daysTotal > 0
            ? "день " + dose.dayNumber + " из " + dose.daysTotal
            : "день " + dose.dayNumber;
        String body = dose.totalDoses > 1
            ? "Приём " + (dose.doseIndex + 1) + " из " + dose.totalDoses + " · " + day
            : day;

        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_icon)
            .setContentTitle("💊 " + dose.courseName + " · " + dose.time())
            .setContentText(body)
            .setColor(0xFFFF9E3D)
            .setContentIntent(openAppPi(context, notifId))
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .addAction(R.drawable.ic_stat_icon, "✓ Принял", takenPi)
            .addAction(R.drawable.ic_stat_icon, "⚙️ Настроить", nsetPi);
        try {
            NotificationManagerCompat.from(context).notify(notifId, b.build());
        } catch (SecurityException se) { } catch (Exception e) { }
    }
}
