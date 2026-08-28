package com.fitflow.app;

import android.graphics.Canvas;
import android.widget.RemoteViews;

/* 0.9.24 — неоновые кольца. Кнопки +250 / Еда / Витамины — overlay,
   те же действия, что у классического виджета.

   0.9.32 (референс владельца): состав колец и строк настраивается тем же
   списком, что у остальных виджетов; в центре — дата и день недели;
   «Тренировка» приходит строкой-статусом без кольца. Пилюли кнопок
   рисует Canvas, поэтому разметка своя — с прозрачными кнопками-ловушками
   (fitflow_widget_neon), а не общая с «каплей». */
public class FitFlowWidgetNeonProvider extends FitFlowWidgetCanvasProvider {

    @Override
    int requestCodeBase() { return 700; }

    @Override
    int layoutRes() { return R.layout.fitflow_widget_neon; }

    @Override
    void configureButtons(RemoteViews views) {
        showThreeActions(views);
    }

    @Override
    void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData d) {
        FitFlowWidgetPaint.drawNeon(canvas, width, height, density, d);
    }
}
