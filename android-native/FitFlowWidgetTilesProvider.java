package com.fitflow.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.graphics.Canvas;
import android.os.Handler;
import android.os.Looper;
import android.widget.RemoteViews;

/* 0.9.35 — «плитки». Референс владельца: слева блок с каплей и кнопкой
   воды ВНУТРИ виджета, справа сетка плиток без графиков. Состав
   настраивается тем же списком, что у «колец».

   Светлый вариант основной (владелец: «ориентируемся под светлый»),
   тёмный — FitFlowWidgetTilesDarkProvider.

   Анимация заполнения капли (просьба владельца, пробуем на этом виджете):
   виджет на экране не умеет анимироваться сам — система разрешает только
   перерисовку картинки целиком. Поэтому после нажатия «+250 мл» мы
   быстро перерисовываем виджет несколько раз, доводя уровень от старого
   к новому. Это НЕ бесплатно, поэтому анимация проигрывается только по
   нажатию и строго ограничена по числу кадров. */
public class FitFlowWidgetTilesProvider extends FitFlowWidgetCanvasProvider {

    /* Кадров и шаг. 12 x 40 мс = ~0.5 c: достаточно, чтобы глаз увидел
       «проползание», и мало, чтобы не грузить лаунчер. */
    static final int ANIM_FRAMES = 12;
    static final long ANIM_STEP_MS = 40L;

    @Override
    int requestCodeBase() { return 820; }

    @Override
    int layoutRes() { return R.layout.fitflow_widget_tiles; }

    /* В разметке «плиток» есть ТОЛЬКО кнопка воды и шестерёнка — кнопок
       «Еда» и «Витамины» там нет. Общий showWaterOnly() трогает их по id
       и на этой разметке молча промахнётся, поэтому не используем его. */
    @Override
    void configureButtons(RemoteViews views) {
        views.setViewVisibility(R.id.widget_canvas_water_btn, android.view.View.VISIBLE);
    }

    /* Кнопка воды есть, только если показатель выбран (правило 0.9.33). */
    @Override
    void configureButtons(RemoteViews views, FitFlowWidgetData data) {
        views.setViewVisibility(R.id.widget_canvas_water_btn,
            data.shows("water") ? android.view.View.VISIBLE : android.view.View.GONE);
    }

    @Override
    void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData data) {
        FitFlowWidgetPaint.drawTiles(null, canvas, width, height, density, data,
            theme(), -1f);
    }

    @Override
    void drawWidget(Context context, Canvas canvas, int width, int height,
                    float density, FitFlowWidgetData data, float pct) {
        FitFlowWidgetPaint.drawTiles(context, canvas, width, height, density, data,
            theme(), pct);
    }

    FitFlowWidgetPaint.TilesTheme theme() {
        return FitFlowWidgetPaint.TILES_LIGHT;
    }

    /* Проигрывает доливание капли от fromPct к текущему уровню.
       Вызывается из FitFlowWidgetProvider после нажатия «+250 мл». */
    static void animateWater(final Context context, final float fromPct) {
        final Class<?>[] classes = {
            FitFlowWidgetTilesProvider.class, FitFlowWidgetTilesDarkProvider.class
        };
        final AppWidgetManager manager = AppWidgetManager.getInstance(context);
        final Handler handler = new Handler(Looper.getMainLooper());
        for (final Class<?> cls : classes) {
            final int[] ids;
            final FitFlowWidgetCanvasProvider provider;
            try {
                ids = manager.getAppWidgetIds(new ComponentName(context, cls));
                if (ids == null || ids.length == 0) continue;
                provider = (FitFlowWidgetCanvasProvider) cls.newInstance();
            } catch (Exception e) {
                continue;
            }
            FitFlowWidgetData data = FitFlowWidgetData.load(context);
            final float to = data.waterGoal > 0
                ? Math.min(1f, data.water / (float) data.waterGoal) : 0f;
            if (Math.abs(to - fromPct) < 0.005f) continue;
            for (int i = 1; i <= ANIM_FRAMES; i++) {
                final float t = i / (float) ANIM_FRAMES;
                /* ease-out: быстро в начале, мягко в конце — так «доливание»
                   выглядит естественнее равномерного. */
                final float eased = 1f - (1f - t) * (1f - t);
                final float value = fromPct + (to - fromPct) * eased;
                final boolean last = i == ANIM_FRAMES;
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        for (int id : ids) {
                            provider.render(context, manager, id, last ? -1f : value);
                        }
                    }
                }, i * ANIM_STEP_MS);
            }
        }
    }
}
