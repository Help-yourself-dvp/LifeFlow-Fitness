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

    /* 12 x 40 мс = ~0.5 c: глаз видит движение, лаунчер не захлёбывается. */
    static final int ANIM_FRAMES = 12;
    static final long ANIM_STEP_MS = 40L;

    /* Поколение анимации: если пользователь жмёт кнопку часто, кадры
       прошлого запуска не должны перебивать новый. */
    private static volatile int sGeneration = 0;

    static void animateWater(final Context context, final int fromMl, final int toMl) {
        if (context == null || fromMl == toMl) return;
        final int generation = ++sGeneration;
        final Handler handler = new Handler(Looper.getMainLooper());
        for (int i = 1; i <= ANIM_FRAMES; i++) {
            final boolean last = i == ANIM_FRAMES;
            final float t = i / (float) ANIM_FRAMES;
            /* ease-out: быстро в начале, мягко в конце — «доливание»
               выглядит естественнее равномерного движения. */
            final float eased = 1f - (1f - t) * (1f - t);
            final int value = Math.round(fromMl + (toMl - fromMl) * eased);
            handler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    if (generation != sGeneration) return;
                    FitFlowWidgetData.sWaterOverride = last ? -1 : value;
                    redrawAll(context);
                }
            }, i * ANIM_STEP_MS);
        }
    }

    /* Перерисовка всех семейств. Каждое — в своём try: упавшее
       оформление не должно срывать анимацию остальным. */
    private static void redrawAll(Context context) {
        try { FitFlowWidgetProvider.updateAll(context); } catch (Throwable t) { }
        try { FitFlowWidgetBentoProvider.updateAll(context); } catch (Throwable t) { }
        try { FitFlowWidgetCanvasProvider.updateAllCanvas(context); } catch (Throwable t) { }
    }
}
