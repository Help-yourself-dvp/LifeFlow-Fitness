package com.fitflow.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.RemoteViews;

public class FitFlowWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_MIDNIGHT = "com.fitflow.app.WIDGET_MIDNIGHT_REFRESH";

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, FitFlowWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) updateWidget(context, manager, id);
        scheduleMidnightRefresh(context);
    }

    /* 0.5.5 (полевой баг: утром виджет показывал вчерашний день):
       самоподдерживающийся будильник на ближайшую полночь — updateWidget
       сам обнулит чужую дату (страж 0.4.12) и перевооружит следующий. */
    private static void scheduleMidnightRefresh(Context context) {
        try {
            java.util.Calendar cal = java.util.Calendar.getInstance();
            cal.add(java.util.Calendar.DAY_OF_YEAR, 1);
            cal.set(java.util.Calendar.HOUR_OF_DAY, 0);
            cal.set(java.util.Calendar.MINUTE, 0);
            cal.set(java.util.Calendar.SECOND, 5);
            cal.set(java.util.Calendar.MILLISECOND, 0);
            Intent i = new Intent(context, FitFlowWidgetProvider.class);
            i.setAction(ACTION_MIDNIGHT);
            android.app.PendingIntent pi = android.app.PendingIntent.getBroadcast(context, 9, i,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
            android.app.AlarmManager am = (android.app.AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            if (android.os.Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
            } else {
                am.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
            }
        } catch (Exception e) { }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) updateWidget(context, manager, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        updateWidget(context, manager, id);
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int id) {
        SharedPreferences prefs = context.getSharedPreferences("fitflow_widget", Context.MODE_PRIVATE);
        int water = prefs.getInt("waterTotal", 0);
        int waterGoal = prefs.getInt("waterGoal", 2500);
        int food = prefs.getInt("foodTotal", 0);
        int foodGoal = prefs.getInt("foodGoal", 2000);
        int activity = prefs.getInt("activityMinutes", 0);
        // 0.4.12 (полевой баг: утром виджет показывал вчерашние цифры):
        // прогресс дня валиден только для своей даты; новый день —
        // честные нули, пока приложение не пришлёт свежие значения.
        String savedDate = prefs.getString("date", "");
        String today = new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
        if (savedDate == null || !savedDate.equals(today)) { water = 0; food = 0; activity = 0; }
        String profileName = prefs.getString("profileName", "Мой профиль");
        if (profileName == null || profileName.trim().length() == 0) profileName = "Мой профиль";

        Bundle options = manager.getAppWidgetOptions(id);
        int maxWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 180);
        int maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 110);
        boolean large = maxWidth >= 250 || maxHeight >= 180;
        RemoteViews views = new RemoteViews(context.getPackageName(), large ? R.layout.fitflow_widget_large : R.layout.fitflow_widget);
        views.setTextViewText(R.id.widget_profile, "Профиль: " + profileName);
        views.setTextViewText(R.id.widget_water, "Вода: " + water + " / " + waterGoal + " мл");
        views.setTextViewText(R.id.widget_food, "Питание: " + food + " / " + foodGoal + " ккал");
        views.setProgressBar(R.id.widget_water_bar, 100, Math.min(100, Math.round(waterGoal > 0 ? water * 100f / waterGoal : 0)), false);
        views.setProgressBar(R.id.widget_food_bar, 100, Math.min(100, Math.round(foodGoal > 0 ? food * 100f / foodGoal : 0)), false);
        int steps = resolveWidgetSteps(context);
        views.setTextViewText(R.id.widget_steps, "Шаги: " + steps);
        if (large) {
            views.setTextViewText(R.id.widget_water_pct, Math.min(100, Math.round(waterGoal > 0 ? water * 100f / waterGoal : 0)) + "% цели");
            views.setTextViewText(R.id.widget_food_pct, Math.min(100, Math.round(foodGoal > 0 ? food * 100f / foodGoal : 0)) + "% цели");
            String actStr = "Активность: " + formatActivity(activity);
            if (steps > 0) actStr += " · " + steps + " ш.";
            views.setTextViewText(R.id.widget_activity, actStr);
        }

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 0, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        Intent waterBtn = new Intent(context, FitFlowWidgetProvider.class);
        waterBtn.setAction("com.fitflow.app.ADD_WATER_250");
        PendingIntent waterPi = PendingIntent.getBroadcast(context, 1, waterBtn,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_water_btn, waterPi);

        Intent recordBtn = new Intent(context, MainActivity.class);
        recordBtn.putExtra("widget_action", "smart_entry");
        recordBtn.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent recordPi = PendingIntent.getActivity(context, 2, recordBtn,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_record_btn, recordPi);
        manager.updateAppWidget(id, views);
    }

    private static String formatActivity(int minutes) {
        if (minutes <= 0) return "0 мин";
        int hours = minutes / 60;
        int rest = minutes % 60;
        if (hours == 0) return minutes + " мин";
        if (rest == 0) return hours + " ч";
        return hours + " ч " + rest + " мин";
    }

    /* 0.7.13: шаги виджета по приоритету пользователя (часы vs телефон) —
       без суммы источников и без устаревшего значения из JS-кэша.
       phone_only → аппаратный шагомер; health_connect_only → часы;
       auto → часы при наличии, иначе телефон. */
    private static int resolveWidgetSteps(Context context) {
        SharedPreferences s = context.getSharedPreferences("fitflow_sensor_prefs", Context.MODE_PRIVATE);
        String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
        String savedDate = s.getString("steps_date", "");
        int phone = today.equals(savedDate) ? s.getInt("steps_today", 0) : 0;
        int watch = today.equals(savedDate) ? s.getInt("hc_steps_today", 0) : 0;
        String priority = s.getString("health_priority", "auto");
        if ("phone_only".equals(priority)) return phone;
        if ("health_connect_only".equals(priority)) return watch;
        return watch > 0 ? watch : phone;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        // 0.5.5: полночь — перерисовать (дата-страж обнулит вчерашнее)
        // и перевооружить будильник на следующую полночь.
        if (intent != null && ACTION_MIDNIGHT.equals(intent.getAction())) {
            updateAll(context);
            return;
        }
        if (intent != null && "com.fitflow.app.ADD_WATER_250".equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences("fitflow_widget", Context.MODE_PRIVATE);
            // 0.4.12: вчерашний остаток не наследуем — за полночь база
            // начинается с нуля и дата в prefs поднимается до сегодня.
            String savedDate = prefs.getString("date", "");
            String today = new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
            boolean fresh = savedDate != null && savedDate.equals(today);
            int waterTotal = (fresh ? prefs.getInt("waterTotal", 0) : 0) + 250;
            int pendingAdd = (fresh ? prefs.getInt("pendingWaterAdd", 0) : 0) + 250;
            prefs.edit()
                .putInt("waterTotal", waterTotal)
                .putInt("pendingWaterAdd", pendingAdd)
                .putString("date", today)
                .putLong("lastWaterAt", System.currentTimeMillis()) // 0.5.5
                .apply();
            updateAll(context);
            // Если на экране висит напоминание о воде — обновить его текст вживую
            try { WaterReminderReceiver.onWaterAdded(context); } catch (Exception e) { }
        }
    }
}
