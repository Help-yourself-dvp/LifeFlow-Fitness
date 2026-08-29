package com.fitflow.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.RemoteViews;

import java.util.ArrayList;

/* Бенто: подложка PNG (оболочка + три плиты) и полный overlay поверх.

   0.9.28 — три изменения по полевому скрину 0.9.27.

   1. Слоты обезличены. Подписи «Вода» / «Калории» больше не впечатаны
      в картинку: их пишет TextView. Значит, показатель в слоте можно
      менять — берём его из выбора пользователя (prefs widgetItems,
      тот же список, что у классического виджета).
   2. Единый шрифт. Всё, что рисует overlay, идёт одним семейством
      sans-serif; жирный только у значения, подпись и цель — обычные.
      Раньше «Шаги» рисовал TextView, а «Вода» и «Калории» были частью
      картинки другим начертанием — отсюда разнобой.
   3. Кнопка быстрого ввода в слоте питания — по просьбе владельца:
      круг с карандашом открывает «Быстрый ввод» (widget_action =
      smart_entry), тот же экран, что кнопка «📝 Записать»
      классического виджета.

   0.9.30 — компактная раскладка 4x2 по замечаниям владельца.

   4. Круглые кнопки уменьшены (46 -> 38 dp) и переехали в правый
      верхний угол плиты. Раньше кнопка стояла по центру и делила
      высоту с текстом — под текстом зияла пустота, а полоса прогресса
      жалась к нижней кромке. Теперь полоса лежит во всю ширину плиты,
      и виджету хватает двух рядов ячеек вместо трёх.
   5. Кнопка питания приглушена по цвету (#FF8A5C -> #D9714A): на
      тёмном экране она выжигала правый край.
   6. Шестерёнка в углу крупной плиты открывает настройки состава
      виджета — переключить «Питание» на «Активность» стало можно
      прямо с рабочего стола, в два тапа.

   Питание = съедено / цель, не remaining. */
public class FitFlowWidgetBentoProvider extends AppWidgetProvider {

    private static final int REQ = 600;

    /* Что бенто умеет показывать. Порядок важен: слот A (крупный,
       с кольцом) получает первый выбранный показатель, B и C — следующие.
       Показатели, у которых нет числовой пары «значение / цель», на бенто
       не идут: три плиты — это три шкалы, текстовой строке тут не место
       (правило «никаких видимых заглушек»). */
    private static final String[] SUPPORTED = { "steps", "water", "food", "activity" };

    /* 0.9.40 (владелец: «выбираю сон — на бенто появляется пустой блок»).
       Показатели без пары «значение / цель». Раньше они молча
       выбрасывались из состава, и если выбор пользователя состоял
       в основном из них, плита оставалась пустой. Теперь такие
       показатели занимают маленькую плиту и печатаются строкой,
       а шкала на ней прячется — заполнять её нечем.
       Строки считает app.js, натив их только показывает. */
    private static final String[] SUPPORTED_LINES = {
        "sleep", "weight", "day-plan", "day-mood", "workout", "courses"
    };

    /* 0.9.41: нижний ряд делится надвое, поэтому показателей помещается
       четыре, а не три. Больше не берём: половинка уже широкой плиты, и
       пятому месту взяться неоткуда. */
    private static final int MAX_SLOTS = 4;

    private static boolean isLine(String id) {
        for (String s : SUPPORTED_LINES) if (s.equals(id)) return true;
        return false;
    }

    /* Текст строкового показателя. Пусто = данных нет, слот не занимаем:
       пустая плита хуже отсутствующей (правило «никаких заглушек»). */
    private static String lineOf(FitFlowWidgetData d, String id) {
        String s = null;
        if ("sleep".equals(id)) s = d.sleepLine;
        else if ("weight".equals(id)) s = d.weightLine;
        else if ("day-plan".equals(id)) s = d.dayPlanLine;
        else if ("day-mood".equals(id)) s = d.moodLine;
        else if ("workout".equals(id)) s = d.workoutLine;
        else if ("courses".equals(id)) s = d.coursesLine;
        return s == null ? "" : s.trim();
    }

    /* Хвост после двоеточия: подпись слота печатается отдельно. */
    private static String lineTail(String line) {
        String s = line == null ? "" : line.trim();
        int colon = s.indexOf(':');
        if (colon >= 0 && colon + 1 < s.length()) s = s.substring(colon + 1).trim();
        return s;
    }

    /* Порядок во всех трёх массивах — water, food, activity, steps
       (см. indexOf). Он же порядок наложенных ProgressBar в разметке. */
    private static final int[] RINGS_A = {
        R.id.widget_bento_a_ring_water, R.id.widget_bento_a_ring_food,
        R.id.widget_bento_a_ring_activity, R.id.widget_bento_a_ring_steps
    };
    private static final int[] BARS_B = {
        R.id.widget_bento_b_bar_water, R.id.widget_bento_b_bar_food,
        R.id.widget_bento_b_bar_activity, R.id.widget_bento_b_bar_steps
    };
    private static final int[] BARS_C = {
        R.id.widget_bento_c_bar_water, R.id.widget_bento_c_bar_food,
        R.id.widget_bento_c_bar_activity, R.id.widget_bento_c_bar_steps
    };
    /* 0.9.41: вторая половинка нижнего ряда. */
    private static final int[] BARS_D = {
        R.id.widget_bento_d_bar_water, R.id.widget_bento_d_bar_food,
        R.id.widget_bento_d_bar_activity, R.id.widget_bento_d_bar_steps
    };

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, FitFlowWidgetBentoProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids == null || ids.length == 0) return;
        FitFlowWidgetBentoProvider provider = new FitFlowWidgetBentoProvider();
        for (int id : ids) provider.render(context, manager, id);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
        try { FitFlowWidgetProvider.updateAll(context); } catch (Exception e) { }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        render(context, manager, id);
    }

    /* Выбор пользователя, суженный до того, что бенто умеет рисовать.
       Если пересечение пустое (например, оставили только «Вес» и «План
       дня») — возвращаем классическую тройку, чтобы виджет не оказался
       пустым прямоугольником. */
    private static ArrayList<String> slotsFor(FitFlowWidgetData d) {
        ArrayList<String> out = new ArrayList<String>();
        for (String id : SUPPORTED) {
            if (d.shows(id) && !out.contains(id)) out.add(id);
        }
        /* 0.9.40: строковые показатели идут ПОСЛЕ числовых — крупная плита A
           с кольцом должна достаться тому, у кого есть цель. Порядок между
           самими строками — пользовательский. */
        for (String id : d.order()) {
            if (out.size() >= MAX_SLOTS) break;
            if (!isLine(id) || out.contains(id)) continue;
            if (lineOf(d, id).length() == 0) continue;  // нет данных — не занимаем плиту
            out.add(id);
        }
        if (out.isEmpty()) {
            out.add("steps");
            out.add("water");
            out.add("food");
        }
        return out;
    }

    /* 0.9.41: в половинке нижнего ряда под текст остаётся ~53 dp (при
       ячейке 4x2). Длинные подписи и единицы туда не помещаются, а
       владелец требовал, чтобы информация влезала ПОЛНОСТЬЮ, а не
       обрезалась многоточием. Поэтому для узкой плиты — короткие
       варианты. Мельчить шрифт вместо этого нельзя: владелец запретил
       уменьшать шрифты бенто. */
    private static String labelNarrow(String id) {
        if ("day-mood".equals(id)) return "Настрой";
        if ("activity".equals(id)) return "Актив.";
        if ("day-plan".equals(id)) return "План";
        if ("workout".equals(id)) return "Спорт";
        if ("food".equals(id)) return "Ккал";
        return labelOf(id);
    }

    /* Единицы в узкой плите не пишем: «из 2 500» вместо «из 2 500 ккал».
       Показатель уже назван в подписи, единица — избыточна. */
    private static String goalNarrow(FitFlowWidgetData d, String id) {
        return "из " + FitFlowWidgetPaint.spaced(goalOf(d, id));
    }

    /* Строковое значение в узкой плите: «7 ч 40 мин» → «7 ч 40».
       Отрезаем только заведомо избыточный хвост единиц. */
    private static String lineNarrow(String value) {
        String s = value == null ? "" : value.trim();
        if (s.endsWith(" мин") && s.contains(" ч ")) {
            s = s.substring(0, s.length() - 4);   // «7 ч 40 мин» → «7 ч 40»
        }
        if (s.endsWith(" кг")) {
            s = s.substring(0, s.length() - 3);   // «78,4 кг» → «78,4»
        }
        return s;
    }

    private static String labelOf(String id) {
        if ("water".equals(id)) return "Вода";
        if ("food".equals(id)) return "Калории";
        if ("activity".equals(id)) return "Активность";
        if ("sleep".equals(id)) return "Сон";
        if ("weight".equals(id)) return "Вес";
        if ("day-plan".equals(id)) return "План дня";
        if ("day-mood".equals(id)) return "Самочувствие";
        if ("workout".equals(id)) return "Тренировка";
        if ("courses".equals(id)) return "Витамины";
        return "Шаги";
    }

    private static int iconOf(String id) {
        if ("water".equals(id)) return R.drawable.widget_bento_ic_drop;
        if ("food".equals(id)) return R.drawable.widget_bento_ic_plate;
        if ("activity".equals(id)) return R.drawable.widget_bento_ic_clock;
        /* 0.9.40: у бенто ровно шесть своих PNG (новые требуют правки
           сборки), поэтому строковым показателям отдаём подходящие из
           имеющихся: «Сон» — часы (время), остальным — карандаш (запись).
           Ботинок оставляем только шагам, иначе он врёт. */
        if ("sleep".equals(id)) return R.drawable.widget_bento_ic_clock;
        if (isLine(id)) return R.drawable.widget_bento_ic_pencil;
        return R.drawable.widget_bento_shoe;
    }

    private static int valueOf(FitFlowWidgetData d, String id) {
        if ("water".equals(id)) return d.water;
        if ("food".equals(id)) return d.food;
        if ("activity".equals(id)) return d.activity;
        return d.steps;
    }

    private static int goalOf(FitFlowWidgetData d, String id) {
        if ("water".equals(id)) return d.waterGoal;
        if ("food".equals(id)) return d.foodGoal;
        if ("activity".equals(id)) return d.activityGoal;
        return d.stepsGoal;
    }

    private static int pctOf(FitFlowWidgetData d, String id) {
        if ("water".equals(id)) return d.waterPct();
        if ("food".equals(id)) return d.foodPct();
        if ("activity".equals(id)) return d.activityPct();
        return d.stepsPct();
    }

    /* Единица измерения ставится ТОЛЬКО в строку цели, у всех слотов
       одинаково: «0» сверху, «из 2 300 мл» снизу. Владелец просил один
       подход для обоих блоков — две строки везде, включая крупный слот. */
    private static String unitOf(String id) {
        if ("water".equals(id)) return " мл";
        if ("food".equals(id)) return " ккал";
        if ("activity".equals(id)) return " мин";
        return "";
    }

    /* RemoteViews на minSdk 26 не умеет менять progressDrawable у
       ProgressBar (setProgressDrawable не входит в белый список удалённых
       методов). Цвет же обязан следовать показателю, иначе «Активность»
       в слоте воды осталась бы бирюзовой. Поэтому в разметке лежат четыре
       шкалы (и четыре кольца) одна поверх другой, а провайдер показывает
       нужную и прячет остальные. */
    private static void showBar(RemoteViews views, int[] ids, int pick, int pct) {
        for (int i = 0; i < ids.length; i++) {
            boolean on = i == pick;
            views.setViewVisibility(ids[i], on ? android.view.View.VISIBLE : android.view.View.GONE);
            if (on) views.setProgressBar(ids[i], 100, pct, false);
        }
    }

    /* Индекс показателя в порядке water, food, activity, steps —
       он же порядок наложенных шкал и колец в разметке. */
    private static int indexOf(String id) {
        if ("water".equals(id)) return 0;
        if ("food".equals(id)) return 1;
        if ("activity".equals(id)) return 2;
        return 3;
    }

    void render(Context context, AppWidgetManager manager, int id) {
        try {
            FitFlowWidgetData d = FitFlowWidgetData.load(context);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.fitflow_widget_bento);
            ArrayList<String> slots = slotsFor(d);

            String a = slots.get(0);
            String b = slots.size() > 1 ? slots.get(1) : null;
            String c = slots.size() > 2 ? slots.get(2) : null;

            // --- Слот A: крупный, кольцо вокруг иконки ---
            views.setTextViewText(R.id.widget_bento_a_label, labelOf(a));
            views.setImageViewResource(R.id.widget_bento_a_icon, iconOf(a));
            if (isLine(a)) {
                /* Строковый показатель в крупной плите (числовых не выбрано
                   вовсе): значение — текстом, кольцо гасим полностью, иначе
                   висела бы пустая дуга на 0 %. */
                views.setTextViewText(R.id.widget_bento_a_value, lineTail(lineOf(d, a)));
                views.setTextViewText(R.id.widget_bento_a_goal, "");
                showBar(views, RINGS_A, -1, 0);
            } else {
                views.setTextViewText(R.id.widget_bento_a_value,
                    FitFlowWidgetPaint.spaced(valueOf(d, a)));
                views.setTextViewText(R.id.widget_bento_a_goal,
                    "из " + FitFlowWidgetPaint.spaced(goalOf(d, a)) + unitOf(a));
                showBar(views, RINGS_A, indexOf(a), pctOf(d, a));
            }

            renderSmallSlot(context, views, b,
                R.id.widget_bento_b_card, R.id.widget_bento_b_label,
                R.id.widget_bento_b_value, R.id.widget_bento_b_goal,
                BARS_B, R.id.widget_bento_b_btn,
                R.id.widget_bento_b_btn_icon, d, REQ + 1, true);

            /* 0.9.41 (просьба владельца): нижний ряд — одна широкая плита
               или две половинки. Когда показателей ровно три, D скрыт и C
               занимает всю строку; при четырёх обе половинки заняты.
               Кнопку в половинке не показываем: 38 dp круг съедает
               половину её ширины, и значение перестаёт помещаться —
               владелец требовал, чтобы информация влезала полностью. */
            String dSlot = slots.size() > 3 ? slots.get(3) : null;
            boolean split = dSlot != null;

            /* Отступы плиты C зависят от режима. В одиночном она широкая и
               может показать кнопку — под неё нужен коридор 46 dp справа;
               в парном кнопки нет, и текст занимает всю половинку.
               setViewPadding принимает ПИКСЕЛИ, поэтому переводим из dp. */
            float dens = context.getResources().getDisplayMetrics().density;
            int padStart = Math.round((split ? 10f : 14f) * dens);
            int padEnd = Math.round((split ? 10f : 46f) * dens);
            int padTop = Math.round(4f * dens);
            int padBottom = Math.round(16f * dens);
            views.setViewPadding(R.id.widget_bento_c_text,
                padStart, padTop, padEnd, padBottom);

            renderSmallSlot(context, views, c,
                R.id.widget_bento_c_card, R.id.widget_bento_c_label,
                R.id.widget_bento_c_value, R.id.widget_bento_c_goal,
                BARS_C, R.id.widget_bento_c_btn,
                R.id.widget_bento_c_btn_icon, d, REQ + 2, !split);

            renderSmallSlot(context, views, dSlot,
                R.id.widget_bento_d_card, R.id.widget_bento_d_label,
                R.id.widget_bento_d_value, R.id.widget_bento_d_goal,
                BARS_D, R.id.widget_bento_d_btn,
                R.id.widget_bento_d_btn_icon, d, REQ + 4, false);

            /* Промежуток между половинками нужен только когда их две. */
            views.setViewVisibility(R.id.widget_bento_split_gap,
                split ? android.view.View.VISIBLE : android.view.View.GONE);

            /* Кегль плиты C: в одиночном режиме тот же, что был до
               деления (17/12/11 sp), в парном — уменьшенный, иначе
               «7 ч 40 мин» не помещается в половину ширины.
               COMPLEX_UNIT_SP, чтобы уважать системный масштаб шрифта. */
            int sp = android.util.TypedValue.COMPLEX_UNIT_SP;
            views.setTextViewTextSize(R.id.widget_bento_c_value, sp, split ? 14f : 17f);
            views.setTextViewTextSize(R.id.widget_bento_c_label, sp, split ? 11f : 12f);
            views.setTextViewTextSize(R.id.widget_bento_c_goal, sp, split ? 10f : 11f);

            StringBuilder talk = new StringBuilder("FitFlow.");
            for (String slot : slots) {
                if (isLine(slot)) {
                    talk.append(' ').append(lineOf(d, slot)).append('.');
                } else {
                    talk.append(' ').append(labelOf(slot)).append(' ')
                        .append(valueOf(d, slot)).append(" из ").append(goalOf(d, slot))
                        .append(unitOf(slot)).append('.');
                }
            }
            views.setContentDescription(R.id.widget_bento_root, talk.toString());

            /* 0.9.30 (пункт 3 владельца): шестерёнка ведёт в настройки состава
               виджета. Отдельным действием, а не «просто открыть приложение»:
               смысл кнопки — попасть сразу в нужный диалог. Обработчик —
               window.onWidgetAction('widget_settings') в app.js. */
            Intent gear = new Intent(context, MainActivity.class);
            gear.putExtra("widget_action", "widget_settings");
            gear.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            views.setContentDescription(R.id.widget_bento_gear, "Настроить показатели виджета");
            views.setOnClickPendingIntent(R.id.widget_bento_gear, PendingIntent.getActivity(
                context, REQ + 3, gear, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

            Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launch == null) launch = new Intent(context, MainActivity.class);
            launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            views.setOnClickPendingIntent(R.id.widget_bento_root, PendingIntent.getActivity(
                context, REQ, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

            manager.updateAppWidget(id, views);
        } catch (Throwable t) {
            // не роняем лаунчер
        }
    }

    /* Маленькая плита: подпись, значение, цель, шкала и — если показателю
       есть что нажать — круглая кнопка. Пустой слот прячем целиком:
       полуживых плит на виджете быть не должно. */
    private void renderSmallSlot(Context context, RemoteViews views, String slot,
                                 int cardId, int labelId, int valueId, int goalId,
                                 int[] barIds, int btnId, int btnIconId,
                                 FitFlowWidgetData d, int req, boolean allowBtn) {
        if (slot == null) {
            views.setViewVisibility(cardId, android.view.View.GONE);
            return;
        }
        views.setViewVisibility(cardId, android.view.View.VISIBLE);
        /* narrow = плита-половинка: allowBtn выключён именно у них. */
        boolean narrow = !allowBtn;
        views.setTextViewText(labelId, narrow ? labelNarrow(slot) : labelOf(slot));
        if (isLine(slot)) {
            /* 0.9.40: строковый показатель — значение текстом, строка цели
               пустая, шкала спрятана (pick = -1 гасит все слои). */
            String v = lineTail(lineOf(d, slot));
            views.setTextViewText(valueId, narrow ? lineNarrow(v) : v);
            views.setTextViewText(goalId, "");
            showBar(views, barIds, -1, 0);
        } else {
            views.setTextViewText(valueId, FitFlowWidgetPaint.spaced(valueOf(d, slot)));
            views.setTextViewText(goalId, narrow ? goalNarrow(d, slot)
                : "из " + FitFlowWidgetPaint.spaced(goalOf(d, slot)) + unitOf(slot));
            showBar(views, barIds, indexOf(slot), pctOf(d, slot));
        }

        boolean textBtn = allowBtn && "water".equals(slot);
        boolean iconBtn = allowBtn && "food".equals(slot);
        views.setViewVisibility(btnId, textBtn ? android.view.View.VISIBLE : android.view.View.GONE);
        views.setViewVisibility(btnIconId, iconBtn ? android.view.View.VISIBLE : android.view.View.GONE);

        if (textBtn) {
            // Вода уходит броадкастом — приложение не открывается.
            views.setTextViewText(btnId, "+250\nмл");
            views.setContentDescription(btnId, "Добавить 250 миллилитров воды");
            Intent waterBtn = new Intent(context, FitFlowWidgetProvider.class);
            waterBtn.setAction("com.fitflow.app.ADD_WATER_250");
            views.setOnClickPendingIntent(btnId, PendingIntent.getBroadcast(
                context, req, waterBtn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        if (iconBtn) {
            /* 0.9.28 (просьба владельца): карандаш открывает «Быстрый ввод» —
               то же действие, что кнопка «📝 Записать» классического виджета.
               Записать еду одним тапом с рабочего стола, как воду, нельзя:
               блюдо и его калории надо ввести, поэтому здесь честный переход
               в приложение, а не тихая запись. */
            views.setContentDescription(btnIconId, "Записать приём пищи");
            Intent record = new Intent(context, MainActivity.class);
            record.putExtra("widget_action", "smart_entry");
            record.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            views.setOnClickPendingIntent(btnIconId, PendingIntent.getActivity(
                context, req, record, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
    }
}
