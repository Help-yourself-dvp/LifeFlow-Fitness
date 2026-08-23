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
    /* 0.9.5: ручное обновление прямо с виджета (просьба владельца) — перерисовать
       все экземпляры из текущих prefs, не удаляя и не добавляя виджет заново. */
    private static final String ACTION_REFRESH = "com.fitflow.app.WIDGET_REFRESH";

    /* 0.9.4: универсальные слоты строк вместо зашитых «вода/питание/шаги».
       Компактная раскладка — 5 слотов, большая — 10; строка с полосой
       прогресса занимает два слота (см. cost в updateWidget). */
    private static final int[] SLOT_IDS_SMALL = {
        R.id.widget_slot_1, R.id.widget_slot_2, R.id.widget_slot_3, R.id.widget_slot_4, R.id.widget_slot_5
    };
    private static final int[] SLOT_TEXT_IDS_SMALL = {
        R.id.widget_slot_1_text, R.id.widget_slot_2_text, R.id.widget_slot_3_text,
        R.id.widget_slot_4_text, R.id.widget_slot_5_text
    };
    private static final int[] SLOT_BAR_IDS_SMALL = {
        R.id.widget_slot_1_bar, R.id.widget_slot_2_bar, R.id.widget_slot_3_bar,
        R.id.widget_slot_4_bar, R.id.widget_slot_5_bar
    };
    /* Янтарная полоса (питание) — отдельная вьюха: цвет прогресса
       из RemoteViews на minSdk 26 не меняется, поэтому два готовых бара. */
    private static final int[] SLOT_BAR2_IDS_SMALL = {
        R.id.widget_slot_1_bar2, R.id.widget_slot_2_bar2, R.id.widget_slot_3_bar2,
        R.id.widget_slot_4_bar2, R.id.widget_slot_5_bar2
    };
    private static final int[] SLOT_IDS_LARGE = {
        R.id.widget_slot_1, R.id.widget_slot_2, R.id.widget_slot_3, R.id.widget_slot_4, R.id.widget_slot_5,
        R.id.widget_slot_6, R.id.widget_slot_7, R.id.widget_slot_8, R.id.widget_slot_9, R.id.widget_slot_10
    };
    private static final int[] SLOT_TEXT_IDS_LARGE = {
        R.id.widget_slot_1_text, R.id.widget_slot_2_text, R.id.widget_slot_3_text, R.id.widget_slot_4_text,
        R.id.widget_slot_5_text, R.id.widget_slot_6_text, R.id.widget_slot_7_text, R.id.widget_slot_8_text,
        R.id.widget_slot_9_text, R.id.widget_slot_10_text
    };
    private static final int[] SLOT_BAR_IDS_LARGE = {
        R.id.widget_slot_1_bar, R.id.widget_slot_2_bar, R.id.widget_slot_3_bar, R.id.widget_slot_4_bar,
        R.id.widget_slot_5_bar, R.id.widget_slot_6_bar, R.id.widget_slot_7_bar, R.id.widget_slot_8_bar,
        R.id.widget_slot_9_bar, R.id.widget_slot_10_bar
    };
    private static final int[] SLOT_BAR2_IDS_LARGE = {
        R.id.widget_slot_1_bar2, R.id.widget_slot_2_bar2, R.id.widget_slot_3_bar2, R.id.widget_slot_4_bar2,
        R.id.widget_slot_5_bar2, R.id.widget_slot_6_bar2, R.id.widget_slot_7_bar2, R.id.widget_slot_8_bar2,
        R.id.widget_slot_9_bar2, R.id.widget_slot_10_bar2
    };

    /* 0.9.5: размеры для подбора числа строк под фактическую высоту виджета.
       chrome = заголовок + строка профиля + ряд кнопок + вертикальные отступы;
       row = строка показателя (текст + полоса прогресса + зазор). Значения
       соответствуют widget_layout_xml в build.yml: если менять там — менять и тут. */
    private static final int SMALL_CHROME_DP = 100;
    private static final int SMALL_ROW_DP = 26;
    private static final int LARGE_CHROME_DP = 110;
    private static final int LARGE_ROW_DP = 30;

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

        /* 0.9.4 (пункты 4 и 5 владельца): состав виджета задаёт пользователь
           в настройках приложения. Раньше все строки рисовались безусловно —
           «Питание» оставалось на виджете даже после выключения карточки.
           Теперь показываем ровно выбранные элементы, в выбранном порядке,
           и обрезаем по числу слотов реальной раскладки. */
        /* 0.9.5 (владелец: «либо кнопки наполовину закрыты, либо под ними много
           пустого места»). Раньше число строк зависело только от выбранной
           раскладки, а не от реальной высоты виджета на экране. Теперь считаем,
           сколько строк физически помещается: из высоты вычитаем шапку, ряд
           кнопок и отступы, остаток делим на высоту одной строки. Кнопки
           прижаты к низу (layout_weight у контейнера строк), поэтому лишние
           строки больше не выдавливают их за край, а недостающие не оставляют
           пустоту. Минимум одна строка — иначе виджет выглядел бы пустым. */
        int chromeDp = large ? LARGE_CHROME_DP : SMALL_CHROME_DP;
        int rowDp = large ? LARGE_ROW_DP : SMALL_ROW_DP;
        int maxSlots = large ? SLOT_IDS_LARGE.length : SLOT_IDS_SMALL.length;
        int fitSlots = (maxHeight - chromeDp) / rowDp;
        int slots = Math.max(1, Math.min(maxSlots, fitSlots));
        String itemsRaw = prefs.getString("widgetItems", "water,food,steps");
        if (itemsRaw == null) itemsRaw = "";
        int waterPct = Math.min(100, Math.round(waterGoal > 0 ? water * 100f / waterGoal : 0));
        int foodPct = Math.min(100, Math.round(foodGoal > 0 ? food * 100f / foodGoal : 0));
        int steps = resolveWidgetSteps(context);

        int used = 0;
        /* 0.9.5 (владелец: «после перемещения воды в настройках на виджете стало
           две одинаковые строки с водой»). Список приходит строкой из prefs, и
           если в него по любой причине попал повторяющийся id (гонка записи при
           перестановке: два updateWidget подряд, старое и новое значение), строка
           рисовалась дважды в разные слоты. Защищаемся на стороне отрисовки —
           каждый показатель выводится не более одного раза. */
        java.util.HashSet<String> drawn = new java.util.HashSet<String>();
        for (String rawId : itemsRaw.split(",")) {
            String itemId = rawId == null ? "" : rawId.trim();
            if (itemId.length() == 0) continue;
            if (!drawn.add(itemId)) continue; // дубликат — уже нарисован выше
            int cost = ("water".equals(itemId) || "food".equals(itemId)) ? 2 : 1;
            if (used + cost > slots) continue; // не помещается — пропускаем, следующий может влезть
            String text;
            int pct = -1;
            boolean amberBar = false; // питание — янтарная полоса, вода — бирюзовая
            if ("water".equals(itemId)) {
                text = "Вода: " + water + " / " + waterGoal + " мл";
                pct = waterPct;
            } else if ("food".equals(itemId)) {
                text = "Питание: " + food + " / " + foodGoal + " ккал";
                pct = foodPct;
                amberBar = true;
            } else if ("steps".equals(itemId)) {
                text = "Шаги: " + steps;
            } else if ("activity".equals(itemId)) {
                text = fallbackLine(prefs, "activityLine", "Активность: " + formatActivity(activity));
            } else if ("weight".equals(itemId)) {
                text = fallbackLine(prefs, "weightLine", "Вес: нет записей");
            } else if ("day-plan".equals(itemId)) {
                text = fallbackLine(prefs, "dayPlanLine", "План дня");
            } else if ("day-mood".equals(itemId)) {
                text = fallbackLine(prefs, "moodLine", "Самочувствие: не отмечено");
            } else if ("workout".equals(itemId)) {
                text = fallbackLine(prefs, "workoutLine", "Тренировка: отдых");
            } else {
                continue; // неизвестный элемент из будущей версии — молча пропускаем
            }
            int slotIndex = used;
            int slotId = large ? SLOT_IDS_LARGE[slotIndex] : SLOT_IDS_SMALL[slotIndex];
            int textId = large ? SLOT_TEXT_IDS_LARGE[slotIndex] : SLOT_TEXT_IDS_SMALL[slotIndex];
            int barId = large ? SLOT_BAR_IDS_LARGE[slotIndex] : SLOT_BAR_IDS_SMALL[slotIndex];
            int bar2Id = large ? SLOT_BAR2_IDS_LARGE[slotIndex] : SLOT_BAR2_IDS_SMALL[slotIndex];
            views.setViewVisibility(slotId, android.view.View.VISIBLE);
            views.setTextViewText(textId, text);
            int shownBar = amberBar ? bar2Id : barId;
            int hiddenBar = amberBar ? barId : bar2Id;
            views.setViewVisibility(hiddenBar, android.view.View.GONE);
            if (pct >= 0) {
                views.setViewVisibility(shownBar, android.view.View.VISIBLE);
                views.setProgressBar(shownBar, 100, pct, false);
            } else {
                views.setViewVisibility(shownBar, android.view.View.GONE);
            }
            used += cost;
        }
        /* Гасим ВСЕ оставшиеся слоты раскладки, а не только до slots: число
           видимых строк теперь зависит от высоты виджета, и при уменьшении
           размера в слотах выше лимита осталась бы старая строка. */
        for (int i = used; i < maxSlots; i++) {
            views.setViewVisibility(large ? SLOT_IDS_LARGE[i] : SLOT_IDS_SMALL[i], android.view.View.GONE);
        }
        // Пустой виджет без подсказки выглядел бы сломанным — говорим, что делать.
        views.setViewVisibility(R.id.widget_empty, used == 0 ? android.view.View.VISIBLE : android.view.View.GONE);

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

        Intent refreshBtn = new Intent(context, FitFlowWidgetProvider.class);
        refreshBtn.setAction(ACTION_REFRESH);
        PendingIntent refreshPi = PendingIntent.getBroadcast(context, 3, refreshBtn,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_refresh_btn, refreshPi);
        manager.updateAppWidget(id, views);
    }

    /* Тексты, которые считает JS (вес, план дня, самочувствие, тренировка).
       Пока приложение ни разу не открывали после обновления, их в prefs нет —
       показываем нейтральную заглушку вместо пустой строки. */
    private static String fallbackLine(SharedPreferences prefs, String key, String fallback) {
        String value = prefs.getString(key, "");
        return (value == null || value.trim().length() == 0) ? fallback : value;
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
        if (intent != null && ACTION_REFRESH.equals(intent.getAction())) {
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
