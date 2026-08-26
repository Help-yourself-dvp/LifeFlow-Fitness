package com.fitflow.app;

import android.graphics.Canvas;
import android.widget.RemoteViews;

/* 0.9.24 — капля: вода слева, плитки шаги / питание / активность /
   самочувствие справа. +250 мл — overlay. */
public class FitFlowWidgetDropProvider extends FitFlowWidgetCanvasProvider {

    @Override
    int requestCodeBase() { return 500; }

    @Override
    void configureButtons(RemoteViews views) {
        showWaterOnly(views);
    }

    @Override
    void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData d) {
        FitFlowWidgetPaint.drawDrop(canvas, width, height, density, d);
    }
}
