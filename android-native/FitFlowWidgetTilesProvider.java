package com.fitflow.app;

import android.content.Context;
import android.graphics.Canvas;
import android.widget.RemoteViews;

/* 0.9.35 — «плитки». Референс владельца: слева блок с каплей и кнопкой
   воды ВНУТРИ виджета, справа сетка плиток без графиков. Состав
   настраивается тем же списком, что у «колец».

   Светлый вариант основной (владелец: «ориентируемся под светлый»),
   тёмный — FitFlowWidgetTilesDarkProvider.

   Плавное доливание воды живёт в общем FitFlowWidgetAnimator: оно
   работает для всех оформлений сразу, а не только для этой капли. */
public class FitFlowWidgetTilesProvider extends FitFlowWidgetCanvasProvider {

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

}
