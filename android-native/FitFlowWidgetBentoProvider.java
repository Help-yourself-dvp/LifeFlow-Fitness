package com.fitflow.app;

import android.graphics.Canvas;
import android.widget.RemoteViews;

/* 0.9.24 — бенто: кольцо шагов, S-волна воды, бар питания. +250 мл — overlay. */
public class FitFlowWidgetBentoProvider extends FitFlowWidgetCanvasProvider {

    @Override
    int requestCodeBase() { return 600; }

    @Override
    void configureButtons(RemoteViews views) {
        showWaterOnly(views);
    }

    @Override
    void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData d) {
        FitFlowWidgetPaint.drawBento(canvas, width, height, density, d);
    }
}
