package com.fitflow.app;

import android.graphics.Canvas;
import android.widget.RemoteViews;

/* 0.9.24 — три неоновых кольца: вода / питание / шаги. Кнопки
   +250 / Еда / Витамины — overlay, те же действия, что у классического. */
public class FitFlowWidgetNeonProvider extends FitFlowWidgetCanvasProvider {

    @Override
    int requestCodeBase() { return 700; }

    @Override
    void configureButtons(RemoteViews views) {
        showThreeActions(views);
    }

    @Override
    void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData d) {
        FitFlowWidgetPaint.drawNeon(canvas, width, height, density, d);
    }
}
