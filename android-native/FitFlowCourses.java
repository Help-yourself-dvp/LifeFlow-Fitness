package com.fitflow.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;

/* 0.9.13 — общая модель «Моего курса» (витамины и добавки) на нативной стороне.

   Зачем она вообще нужна, если курсы живут в app.js: подтверждение приёма из
   шторки не должно открывать приложение (требование владельца — как у воды).
   Значит и расписание, и отметки должны читаться/писаться без WebView. Здесь
   лежит единственная копия правил: какие приёмы есть на дату, что уже отмечено,
   когда ближайший сигнал. Ею пользуются CourseReminderReceiver (уведомления),
   FitFlowWidgetProvider (строка витаминов и отметка тапом) и MainActivity
   (обмен с app.js). Второй копии правил в разных файлах быть не должно.

   Источник истины — приложение: при каждом saveState() app.js присылает план
   и сегодняшние отметки. Отметки, сделанные из шторки или с виджета, копятся
   в очереди pending и доезжают в app.js при ближайшем открытии. */
public final class FitFlowCourses {

    static final String PREFS = "fitflow_courses";
    private static final String KEY_PLAN = "plan";
    private static final String KEY_DONE = "done";
    private static final String KEY_PENDING = "pending";

    /* Отметки храним только за несколько последних дней: виджету и шторке
       нужен «сегодня», плюс запас на полночь и часовые пояса. */
    private static final int DONE_KEEP_DAYS = 3;

    private FitFlowCourses() { }

    /* Один приём одного курса на конкретную дату. */
    static final class Dose {
        String courseId = "";
        String courseName = "";
        int doseIndex = 0;      // порядковый номер приёма внутри курса (0..3)
        int coursePos = 0;      // позиция курса в плане — нужна для стабильного id уведомления
        int minute = 0;         // минуты от полуночи
        int totalDoses = 1;
        int dayNumber = 0;      // «день 3»
        int daysTotal = 0;      // 0 = бессрочный курс
        boolean done = false;

        String time() {
            return String.format(Locale.US, "%02d:%02d", minute / 60, minute % 60);
        }

        /* Стабильный id уведомления: курсов не больше 10, приёмов — 4. */
        int notificationId() {
            return CourseReminderReceiver.COURSE_NOTIFICATION_BASE + coursePos * 10 + doseIndex;
        }
    }

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String dateKey(long ms) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(ms));
    }

    static String todayKey() {
        return dateKey(System.currentTimeMillis());
    }

    /* ---------- план ---------- */

    static void setPlan(Context context, String json) {
        prefs(context).edit().putString(KEY_PLAN, json == null ? "" : json).apply();
    }

    static void clearPlan(Context context) {
        prefs(context).edit().remove(KEY_PLAN).apply();
    }

    static JSONArray plan(Context context) {
        try {
            String raw = prefs(context).getString(KEY_PLAN, "");
            if (raw == null || raw.trim().length() == 0) return new JSONArray();
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    static boolean hasPlan(Context context) {
        return plan(context).length() > 0;
    }

    /* «день N» курса на дату: 1 — стартовый день, 0 и меньше — курс ещё не начался. */
    static int dayNumber(String startDate, String dateKey) {
        Calendar start = parseDate(startDate);
        Calendar day = parseDate(dateKey);
        if (start == null || day == null) return 0;
        long diff = day.getTimeInMillis() - start.getTimeInMillis();
        return (int) Math.floor(diff / 86400000.0) + 1;
    }

    /* Полдень вместо полуночи: перевод часов на летнее время не сдвигает день. */
    private static Calendar parseDate(String value) {
        if (value == null || value.length() != 10) return null;
        try {
            String[] parts = value.split("-");
            if (parts.length != 3) return null;
            Calendar cal = Calendar.getInstance();
            cal.clear();
            cal.set(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1, Integer.parseInt(parts[2]), 12, 0, 0);
            return cal;
        } catch (Exception e) {
            return null;
        }
    }

    private static int parseTime(String value) {
        try {
            String[] parts = String.valueOf(value).trim().split(":");
            if (parts.length != 2) return -1;
            int h = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
            return h * 60 + m;
        } catch (Exception e) {
            return -1;
        }
    }

    /* Все приёмы на дату, отсортированные по времени. onlyReminding=true —
       только курсы с включёнными напоминаниями (для будильника); виджет
       показывает все активные курсы, даже если сигналы выключены. */
    static ArrayList<Dose> dosesForDate(Context context, String dateKey, boolean onlyReminding) {
        ArrayList<Dose> result = new ArrayList<Dose>();
        JSONArray list = plan(context);
        JSONObject doneMap = doneForDate(context, dateKey);
        for (int i = 0; i < list.length(); i++) {
            JSONObject course = list.optJSONObject(i);
            if (course == null) continue;
            if (onlyReminding && !course.optBoolean("remind", true)) continue;
            String start = course.optString("start", "");
            int daysTotal = course.optInt("days", 0);
            int day = dayNumber(start, dateKey);
            if (day < 1) continue;                              // ещё не начался
            if (daysTotal > 0 && day > daysTotal) continue;     // уже закончился
            JSONArray times = course.optJSONArray("times");
            if (times == null || times.length() == 0) continue;
            String id = course.optString("id", "");
            if (id.length() == 0) continue;
            JSONArray marks = doneMap == null ? null : doneMap.optJSONArray(id);
            for (int k = 0; k < times.length(); k++) {
                int minute = parseTime(times.optString(k, ""));
                if (minute < 0) continue;
                Dose dose = new Dose();
                dose.courseId = id;
                dose.courseName = course.optString("name", "Курс");
                dose.doseIndex = k;
                dose.coursePos = i;
                dose.minute = minute;
                dose.totalDoses = times.length();
                dose.dayNumber = day;
                dose.daysTotal = daysTotal;
                dose.done = containsInt(marks, k);
                result.add(dose);
            }
        }
        Collections.sort(result, new Comparator<Dose>() {
            @Override public int compare(Dose a, Dose b) {
                if (a.minute != b.minute) return a.minute < b.minute ? -1 : 1;
                return a.coursePos - b.coursePos;
            }
        });
        return result;
    }

    private static boolean containsInt(JSONArray arr, int value) {
        if (arr == null) return false;
        for (int i = 0; i < arr.length(); i++) {
            if (arr.optInt(i, -1) == value) return true;
        }
        return false;
    }

    /* ---------- отметки ---------- */

    private static JSONObject doneRoot(Context context) {
        try {
            String raw = prefs(context).getString(KEY_DONE, "");
            if (raw == null || raw.trim().length() == 0) return new JSONObject();
            return new JSONObject(raw);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static JSONObject doneForDate(Context context, String dateKey) {
        return doneRoot(context).optJSONObject(dateKey);
    }

    /* Полная замена отметок за дату значением из приложения (app.js — истина). */
    static void setDoneForDate(Context context, String dateKey, String json) {
        try {
            JSONObject root = doneRoot(context);
            if (json == null || json.trim().length() == 0) root.remove(dateKey);
            else root.put(dateKey, new JSONObject(json));
            saveDoneRoot(context, root);
        } catch (Exception e) { }
    }

    private static void saveDoneRoot(Context context, JSONObject root) {
        try {
            // Старые даты выбрасываем: prefs — не архив, история живёт в приложении.
            Calendar cutoff = Calendar.getInstance();
            cutoff.add(Calendar.DAY_OF_YEAR, -DONE_KEEP_DAYS);
            String cutoffKey = dateKey(cutoff.getTimeInMillis());
            JSONObject fresh = new JSONObject();
            java.util.Iterator<String> keys = root.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                if (key != null && key.compareTo(cutoffKey) >= 0) fresh.put(key, root.get(key));
            }
            prefs(context).edit().putString(KEY_DONE, fresh.toString()).apply();
        } catch (Exception e) { }
    }

    static boolean isDone(Context context, String dateKey, String courseId, int doseIndex) {
        JSONObject map = doneForDate(context, dateKey);
        return map != null && containsInt(map.optJSONArray(courseId), doseIndex);
    }

    /* Отметить/снять приём и положить событие в очередь для app.js.
       Возвращает true, если состояние действительно изменилось. */
    static boolean markDose(Context context, String dateKey, String courseId, int doseIndex, boolean done) {
        if (courseId == null || courseId.length() == 0) return false;
        try {
            JSONObject root = doneRoot(context);
            JSONObject dayMap = root.optJSONObject(dateKey);
            if (dayMap == null) dayMap = new JSONObject();
            JSONArray marks = dayMap.optJSONArray(courseId);
            ArrayList<Integer> values = new ArrayList<Integer>();
            if (marks != null) {
                for (int i = 0; i < marks.length(); i++) {
                    int v = marks.optInt(i, -1);
                    if (v >= 0 && !values.contains(v)) values.add(v);
                }
            }
            boolean had = values.contains(doseIndex);
            if (had == done) return false;
            if (done) values.add(doseIndex);
            else values.remove(Integer.valueOf(doseIndex));
            Collections.sort(values);
            if (values.isEmpty()) dayMap.remove(courseId);
            else {
                JSONArray next = new JSONArray();
                for (int v : values) next.put(v);
                dayMap.put(courseId, next);
            }
            if (dayMap.length() == 0) root.remove(dateKey);
            else root.put(dateKey, dayMap);
            saveDoneRoot(context, root);
            queuePending(context, courseId, doseIndex, dateKey, done);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /* ---------- очередь для app.js ---------- */

    private static void queuePending(Context context, String courseId, int doseIndex, String dateKey, boolean done) {
        try {
            JSONArray queue = pendingRaw(context);
            // Повторное нажатие по тому же приёму не плодит записи — обновляем последнюю.
            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.optJSONObject(i);
                if (item != null && courseId.equals(item.optString("id", ""))
                        && item.optInt("dose", -1) == doseIndex
                        && dateKey.equals(item.optString("date", ""))) {
                    item.put("done", done ? 1 : 0);
                    prefs(context).edit().putString(KEY_PENDING, queue.toString()).apply();
                    return;
                }
            }
            JSONObject item = new JSONObject();
            item.put("id", courseId);
            item.put("dose", doseIndex);
            item.put("date", dateKey);
            item.put("done", done ? 1 : 0);
            queue.put(item);
            prefs(context).edit().putString(KEY_PENDING, queue.toString()).apply();
        } catch (Exception e) { }
    }

    private static JSONArray pendingRaw(Context context) {
        try {
            String raw = prefs(context).getString(KEY_PENDING, "");
            if (raw == null || raw.trim().length() == 0) return new JSONArray();
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    static boolean hasPending(Context context) {
        return pendingRaw(context).length() > 0;
    }

    /* Забрать очередь и сразу очистить: доставку в WebView повторяет MainActivity. */
    static JSONArray takePending(Context context) {
        JSONArray queue = pendingRaw(context);
        if (queue.length() > 0) prefs(context).edit().remove(KEY_PENDING).apply();
        return queue;
    }

    /* ---------- расписание ---------- */

    /* Ближайший момент, когда нужно показать напоминание: перебираем приёмы
       сегодня (ещё не наступившие и не отмеченные) и завтра. Дальше двух суток
       не заглядываем — будильник перевооружается после каждого срабатывания. */
    static long nextTriggerMs(Context context, long nowMs) {
        Calendar now = Calendar.getInstance();
        now.setTimeInMillis(nowMs);
        int nowMinute = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        for (int dayShift = 0; dayShift <= 2; dayShift++) {
            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(nowMs);
            cal.add(Calendar.DAY_OF_YEAR, dayShift);
            String key = dateKey(cal.getTimeInMillis());
            ArrayList<Dose> doses = dosesForDate(context, key, true);
            for (Dose dose : doses) {
                if (dose.done) continue;
                if (dayShift == 0 && dose.minute <= nowMinute) continue;
                Calendar at = Calendar.getInstance();
                at.setTimeInMillis(cal.getTimeInMillis());
                at.set(Calendar.HOUR_OF_DAY, dose.minute / 60);
                at.set(Calendar.MINUTE, dose.minute % 60);
                at.set(Calendar.SECOND, 0);
                at.set(Calendar.MILLISECOND, 0);
                if (at.getTimeInMillis() > nowMs) return at.getTimeInMillis();
            }
        }
        return -1;
    }

    /* Приёмы, время которых уже наступило и которые ещё не отмечены.
       Окно в 5 минут: будильник может сработать с задержкой в Doze, а
       показывать напоминание за вчерашний вечер в полдень — незачем. */
    static ArrayList<Dose> dueDoses(Context context, long nowMs) {
        ArrayList<Dose> due = new ArrayList<Dose>();
        Calendar now = Calendar.getInstance();
        now.setTimeInMillis(nowMs);
        int nowMinute = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        for (Dose dose : dosesForDate(context, dateKey(nowMs), true)) {
            if (dose.done) continue;
            int lag = nowMinute - dose.minute;
            if (lag >= 0 && lag <= 5) due.add(dose);
        }
        return due;
    }

    /* ---------- виджет ---------- */

    /* Строка витаминов на виджете. Считаем сами, а не берём готовый текст из
       app.js: после полуночи виджет должен показывать новый день даже если
       приложение с тех пор не открывали. */
    static String widgetLine(Context context, String dateKey) {
        ArrayList<Dose> doses = dosesForDate(context, dateKey, false);
        if (doses.isEmpty()) return hasPlan(context) ? "Витамины: на сегодня нет" : "Витамины: курс не заведён";
        int done = 0;
        for (Dose dose : doses) if (dose.done) done++;
        if (done >= doses.size()) return "Витамины: принято " + done + " из " + doses.size() + " ✓";
        Dose next = null;
        for (Dose dose : doses) { if (!dose.done) { next = dose; break; } }
        String tail = next == null ? "" : " · след. " + next.time();
        return "Витамины: принято " + done + " из " + doses.size() + tail;
    }

    /* Что произойдёт по нажатию на строку витаминов: отмечаем первый
       неотмеченный приём, а когда отмечены все — снимаем последний
       («забыл»/нажал случайно). Одно место — обе операции, лишних кнопок нет. */
    static Dose toggleTarget(Context context, String dateKey) {
        ArrayList<Dose> doses = dosesForDate(context, dateKey, false);
        if (doses.isEmpty()) return null;
        Dose target = null;
        for (Dose dose : doses) {
            if (!dose.done) { target = dose; break; }
        }
        boolean makeDone = target != null;
        if (target == null) target = doses.get(doses.size() - 1); // всё принято — снимаем последний
        markDose(context, dateKey, target.courseId, target.doseIndex, makeDone);
        target.done = makeDone;
        if (makeDone) {
            // Напоминание об этом приёме больше не актуально — убираем из шторки.
            try {
                androidx.core.app.NotificationManagerCompat.from(context).cancel(target.notificationId());
            } catch (Exception e) { }
        }
        return target;
    }
}
