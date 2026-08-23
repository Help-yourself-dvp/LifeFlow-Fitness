package com.fitflow.app;

import android.content.Context;
import android.content.SharedPreferences;

/* 0.9.6 (пункт 5 владельца — сравнение оформлений виджета).
   Все варианты виджета читают одни и те же показатели за сегодня, поэтому
   чтение prefs вынесено в один класс: иначе каждая новая визуализация
   тащила бы свою копию правил (дата-страж, приоритет источника шагов,
   деление недельной цели активности на день) и они бы разъезжались.

   Важное правило, унаследованное от 0.4.12: прогресс дня валиден только
   для своей даты. Если в prefs лежит вчерашняя дата — показываем честные
   нули, а не вчерашние цифры. */
class FitFlowWidgetData {
    int water;
    int waterGoal;
    int food;
    int foodGoal;
    int activity;      // минуты за сегодня
    int activityGoal;  // дневная доля недельной цели активности
    int steps;
    int stepsGoal;
    String profileName = "Мой профиль";

    static FitFlowWidgetData load(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("fitflow_widget", Context.MODE_PRIVATE);
        FitFlowWidgetData d = new FitFlowWidgetData();
        String savedDate = prefs.getString("date", "");
        String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
        boolean fresh = savedDate != null && savedDate.equals(today);

        d.water = fresh ? prefs.getInt("waterTotal", 0) : 0;
        d.waterGoal = Math.max(1, prefs.getInt("waterGoal", 2500));
        d.food = fresh ? prefs.getInt("foodTotal", 0) : 0;
        d.foodGoal = Math.max(1, prefs.getInt("foodGoal", 2000));
        d.activity = fresh ? prefs.getInt("activityMinutes", 0) : 0;
        d.activityGoal = Math.max(1, prefs.getInt("activityGoal", 21));
        d.stepsGoal = Math.max(1, prefs.getInt("stepsGoal", 8000));
        // Шаги живут в сенсорных prefs и подчиняются приоритету «часы vs телефон» —
        // берём ровно ту же функцию, что и классический виджет, без второй копии правил.
        d.steps = FitFlowWidgetProvider.resolveWidgetSteps(context);

        String name = prefs.getString("profileName", "Мой профиль");
        if (name != null && name.trim().length() > 0) d.profileName = name.trim();
        return d;
    }

    /* Проценты для заливки колец/дуг — обрезаны сверху сотней: перелив
       не должен рисовать второй круг поверх первого. */
    int waterPct() { return pct(water, waterGoal); }
    int foodPct() { return pct(food, foodGoal); }
    int stepsPct() { return pct(steps, stepsGoal); }
    int activityPct() { return pct(activity, activityGoal); }

    private static int pct(int value, int goal) {
        if (goal <= 0) return 0;
        int p = Math.round(value * 100f / goal);
        if (p < 0) return 0;
        return Math.min(100, p);
    }

    /* Подписи под легенду: короткие, чтобы влезали в узкий виджет. */
    String waterValue() { return water + "/" + waterGoal + " мл"; }
    String foodValue() { return food + "/" + foodGoal + " ккал"; }
    String stepsValue() { return compact(steps) + "/" + compact(stepsGoal); }
    String activityValue() { return activity + "/" + activityGoal + " мин"; }

    /* 8000 → «8 тыс.»: полное число шагов не помещается в плитку 2×2. */
    static String compact(int value) {
        if (value < 10000) return String.valueOf(value);
        return (value / 1000) + " тыс.";
    }
}
