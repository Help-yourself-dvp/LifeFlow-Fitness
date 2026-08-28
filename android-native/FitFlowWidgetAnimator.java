package com.fitflow.app;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

/* 0.9.35 — плавное доливание воды на ВСЕХ виджетах.

   Почему так, а не «настоящей» анимацией: виджет на домашнем экране не
   умеет анимироваться сам. Система разрешает только заменить картинку
   целиком, поэтому «проползание» — это серия быстрых перерисовок.

   Приём: вместо того чтобы учить каждую рисовалку принимать «процент
   кадра», мы на время анимации подменяем САМО значение воды
   (FitFlowWidgetData.sWaterOverride) и просто просим виджеты
   перерисоваться. За счёт этого анимацию бесплатно получают все
   оформления сразу — список, бенто, кольца и плитки, — включая
   проценты, полосы и подписи, а не только капля.

   Ограничения соблюдаются строго:
   - только по нажатию кнопки «+250 мл», никакой постоянной анимации;
   - фиксированное число кадров (дорогая операция: каждый кадр — это
     полная перерисовка и передача картинки лаунчеру);
   - последний кадр всегда рисуется по реальным данным, иначе при сбое
     на экране осталось бы «подвисшее» промежуточное значение. */
class FitFlowWidgetAnimator {

    /* Длительность и минимальный шаг. Анимация идёт ПО ВРЕМЕНИ, а не по
       номеру кадра: перерисовка виджета — дорогая операция (картинка
       целиком + передача лаунчеру), и на слабом устройстве кадры не
       успевают. При счёте по номеру кадра очередь копилась и движение
       выглядело рывками — владелец это и увидел. Считая по часам, мы
       просто пропускаем то, что не успели, и приходим в конец вовремя. */
    static final long ANIM_DURATION_MS = 900L;
    static final long ANIM_MIN_STEP_MS = 16L;
    /* Страховка от бесконечного цикла, если устройство совсем тормозит. */
    static final int ANIM_MAX_FRAMES = 40;

    /* Поколение анимации: если пользователь жмёт кнопку часто, кадры
       прошлого запуска не должны перебивать новый. */
    private static volatile int sGeneration = 0;

    static void animateWater(final Context context, final int fromMl, final int toMl) {
        if (context == null || fromMl == toMl) return;
        final int generation = ++sGeneration;
        detectFamilies(context);
        final Handler handler = new Handler(Looper.getMainLooper());
        final long start = android.os.SystemClock.uptimeMillis();

        /* Следующий кадр ставится в очередь ТОЛЬКО после того, как
           предыдущий отрисован. Так очередь не копится, а анимация
           автоматически подстраивается под скорость устройства. */
        final Runnable[] frame = new Runnable[1];
        final int[] count = new int[1];
        frame[0] = new Runnable() {
            @Override
            public void run() {
                if (generation != sGeneration) return;
                long elapsed = android.os.SystemClock.uptimeMillis() - start;
                float t = elapsed / (float) ANIM_DURATION_MS;
                if (t > 1f) t = 1f;
                boolean last = t >= 1f || ++count[0] >= ANIM_MAX_FRAMES;
                /* ease-out: быстро в начале, мягко в конце — «доливание»
                   выглядит естественнее равномерного движения. */
                float eased = 1f - (1f - t) * (1f - t);
                int value = Math.round(fromMl + (toMl - fromMl) * eased);
                /* Последний кадр — по реальным данным (override сброшен),
                   иначе на экране осталось бы промежуточное значение. */
                FitFlowWidgetData.sWaterOverride = last ? -1 : value;
                redrawAll(context);
                if (last && sHasBento) {
                    /* Бенто пропустил анимацию — показываем ему итог.
                       Имя ошибки НЕ «t»: в этом методе t — доля времени
                       анимации, и параметр catch её перекроет (javac:
                       "variable t is already defined"). Сборка 0.9.38
                       упала именно здесь. */
                    try { FitFlowWidgetBentoProvider.updateAll(context); }
                    catch (Throwable err) { }
                }
                if (!last) handler.postDelayed(frame[0], ANIM_MIN_STEP_MS);
            }
        };
        /* Первый кадр — сразу: он показывает исходный уровень, с которого
           начинается доливание. */
        handler.post(frame[0]);
    }

    /* Перерисовка всех семейств. Каждое — в своём try: упавшее
       оформление не должно срывать анимацию остальным.

       0.9.37: во время анимации перерисовываем ТОЛЬКО те семейства, что
       реально стоят на экране. Раньше каждый кадр дёргал все три, включая
       отсутствующие: лишние обходы провайдеров на кадр — это и есть те
       рывки, которые владелец видел на устройстве. */
    private static void redrawAll(Context context) {
        if (sHasList) {
            /* updateListOnly, а НЕ updateAll: полный вариант каскадом
               перерисовывает бенто и канвасы и каждый раз перевооружает
               полуночный будильник — на кадре анимации это недопустимо
               дорого (и рисовало всё по два раза). */
            try { FitFlowWidgetProvider.updateListOnly(context); } catch (Throwable t) { }
        }
        /* 0.9.38: бенто в анимации НЕ участвует (решение владельца).
           Он собран из готовой картинки-подложки и десятка вложенных
           вьюх, перерисовка тяжелее прочих, а выигрыш незаметен.
           Итоговое значение он получит обычным обновлением. */
        if (sHasCanvas) {
            try { FitFlowWidgetCanvasProvider.updateAllCanvas(context); } catch (Throwable t) { }
        }
    }

    /* Что стоит на экране — считаем ОДИН раз перед анимацией, а не на
       каждом кадре: getAppWidgetIds ходит в системную службу. */
    private static volatile boolean sHasList, sHasBento, sHasCanvas;

    private static void detectFamilies(Context context) {
        android.appwidget.AppWidgetManager m =
            android.appwidget.AppWidgetManager.getInstance(context);
        sHasList = present(m, context, FitFlowWidgetProvider.class);
        sHasBento = present(m, context, FitFlowWidgetBentoProvider.class);
        /* бенто в кадрах не участвует — его обновим один раз по окончании */
        sHasCanvas = false;
        for (Class<?> cls : FitFlowWidgetCanvasProvider.CANVAS_PROVIDERS) {
            if (present(m, context, cls)) { sHasCanvas = true; break; }
        }
    }

    private static boolean present(android.appwidget.AppWidgetManager m,
                                   Context context, Class<?> cls) {
        try {
            int[] ids = m.getAppWidgetIds(
                new android.content.ComponentName(context, cls));
            return ids != null && ids.length > 0;
        } catch (Throwable t) {
            return true;   // не смогли выяснить — лучше нарисовать лишнее
        }
    }
}
