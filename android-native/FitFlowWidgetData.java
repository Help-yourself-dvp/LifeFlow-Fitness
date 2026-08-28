package com.fitflow.app;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.HashSet;

/* Один источник цифр для всех виджетов: prefs, дата-страж, приоритет шагов.
   0.9.24: плюс выбранные пункты раскладки, самочувствие и строка курса —
   новым оформлениям они нужны, чтобы не рисовать выключенное
   (правило «никаких видимых заглушек»). */
class FitFlowWidgetData {
    int water;
    int waterGoal;
    int food;
    int foodGoal;
    int activity;
    int activityGoal;
    int steps;
    int stepsGoal;
    int mood; // 0 = не отмечено, 1..5
    String profileName = "Мой профиль";
    String moodLine = "";
    String coursesLine = "";
    /* 0.9.32: строка тренировки («Ноги и плечи» / «отдых»). Её считает
       app.js (widgetWorkoutLine) — натив не знает про шаблоны и план.
       Нужна «кольцам»: там это показатель-статус, без пары значение/цель. */
    String workoutLine = "";
    final HashSet<String> items = new HashSet<String>();
    /* 0.9.32: тот же список, но С СОХРАНЕНИЕМ ПОРЯДКА пользователя.
       HashSet порядок теряет, а «кольцам» он нужен: первая выбранная
       строка получает внешнее кольцо и идёт первой в списке справа. */
    final java.util.ArrayList<String> ordered = new java.util.ArrayList<String>();

    static FitFlowWidgetData load(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("fitflow_widget", Context.MODE_PRIVATE);
        FitFlowWidgetData d = new FitFlowWidgetData();
        String savedDate = prefs.getString("date", "");
        String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            .format(new java.util.Date());
        boolean fresh = savedDate != null && savedDate.equals(today);

        d.water = fresh ? prefs.getInt("waterTotal", 0) : 0;
        d.waterGoal = Math.max(1, prefs.getInt("waterGoal", 2500));
        d.food = fresh ? prefs.getInt("foodTotal", 0) : 0;
        d.foodGoal = Math.max(1, prefs.getInt("foodGoal", 2000));
        d.activity = fresh ? prefs.getInt("activityMinutes", 0) : 0;
        d.activityGoal = Math.max(1, prefs.getInt("activityGoal", 21));
        d.stepsGoal = Math.max(1, prefs.getInt("stepsGoal", 8000));
        d.steps = FitFlowWidgetProvider.resolveWidgetSteps(context);

        String name = prefs.getString("profileName", "Мой профиль");
        if (name != null && name.trim().length() > 0) d.profileName = name.trim();

        String raw = prefs.getString("widgetItems", "water,food,steps");
        if (raw == null) raw = "";
        for (String part : raw.split(",")) {
            String id = part == null ? "" : part.trim();
            if (id.length() > 0 && d.items.add(id)) d.ordered.add(id);
        }
        if (d.items.isEmpty()) {
            for (String id : new String[] { "water", "food", "steps" }) {
                d.items.add(id);
                d.ordered.add(id);
            }
        }

        d.workoutLine = prefs.getString("workoutLine", "");
        if (d.workoutLine == null) d.workoutLine = "";
        d.moodLine = prefs.getString("moodLine", "");
        if (d.moodLine == null) d.moodLine = "";
        d.mood = parseMood(d.moodLine);
        try {
            d.coursesLine = FitFlowCourses.widgetLine(context, today);
        } catch (Exception e) {
            d.coursesLine = "";
        }
        if (d.coursesLine == null) d.coursesLine = "";
        return d;
    }

    boolean shows(String id) {
        return items.contains(id);
    }

    /* Выбранные показатели в порядке пользователя. */
    java.util.List<String> order() {
        return ordered;
    }

    String moodLineShort() {
        if (mood <= 0) return "не отмечено";
        String s = moodLine;
        int slash = s.lastIndexOf("/5");
        if (slash > 2) {
            int from = Math.max(0, slash - 8);
            return s.substring(from, Math.min(s.length(), slash + 2)).trim();
        }
        return mood + " из 5";
    }

    private static int parseMood(String line) {
        if (line == null) return 0;
        int slash = line.lastIndexOf("/5");
        if (slash <= 0) return 0;
        char ch = line.charAt(slash - 1);
        if (ch >= '1' && ch <= '5') return ch - '0';
        return 0;
    }

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

    /* Хвост строки после «Тренировка: » — на виджете подпись рисуется
       отдельно, дублировать её в значении незачем. Пусто -> «отдых». */
    String workoutShort() {
        String s = workoutLine == null ? "" : workoutLine.trim();
        int colon = s.indexOf(':');
        if (colon >= 0 && colon + 1 < s.length()) s = s.substring(colon + 1).trim();
        return s.length() == 0 ? "отдых" : s;
    }

    String waterValue() { return water + "/" + waterGoal + " мл"; }
    String foodValue() { return food + "/" + foodGoal + " ккал"; }
    String stepsValue() { return compact(steps) + "/" + compact(stepsGoal); }
    String activityValue() { return activity + "/" + activityGoal + " мин"; }

    static String compact(int value) {
        if (value < 10000) return String.valueOf(value);
        return (value / 1000) + " тыс.";
    }
}
