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
    static final long ANIM_DURATION_MS = 600L;
    static final long ANIM_MIN_STEP_MS = 33L;
    /* Страховка от бесконечного цикла, если устройство совсем тормозит. */
    static final int ANIM_MAX_FRAMES = 40;

    /* Поколение анимации: если пользователь жмёт кнопку часто, кадры
       прошлого запуска не должны перебивать новый. */
    private static volatile int sGeneration = 0;

    static void animateWater(final Context context, final int fromMl, final int toMl) {
        if (context == null || fromMl == toMl) return;
        final int generation = ++sGeneration;
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
                if (!last) handler.postDelayed(frame[0], ANIM_MIN_STEP_MS);
            }
        };
        /* Первый кадр — сразу: он показывает исходный уровень, с которого
           начинается доливание. */
        handler.post(frame[0]);
    }

    /* Перерисовка всех семейств. Каждое — в своём try: упавшее
       оформление не должно срывать анимацию остальным. */
    private static void redrawAll(Context context) {
        try { FitFlowWidgetProvider.updateAll(context); } catch (Throwable t) { }
        try { FitFlowWidgetBentoProvider.updateAll(context); } catch (Throwable t) { }
        try { FitFlowWidgetCanvasProvider.updateAllCanvas(context); } catch (Throwable t) { }
    }
}
