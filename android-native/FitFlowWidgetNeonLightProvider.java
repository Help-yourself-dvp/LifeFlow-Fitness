package com.fitflow.app;

import android.graphics.Canvas;
import android.widget.RemoteViews;

/* 0.9.34 (пункт 4 владельца): «кольца» для СВЕТЛЫХ обоев.

   Это не копия тёмного виджета, а тот же рисунок с другой палитрой:
   вся геометрия живёт в FitFlowWidgetPaint.drawNeon(..., NeonTheme), и
   правка компоновки автоматически попадает в оба оформления. Отличия
   светлой темы — молочное стекло, тёмный текст, насыщенные дуги и
   ВЫКЛЮЧЕННОЕ свечение: неон на белом фоне выглядит грязным пятном.

   Разметку переиспользуем тёмную (fitflow_widget_neon): прозрачные
   кнопки-ловушки не зависят от цвета, а плодить второй одинаковый XML
   значит завести мину — правку пришлось бы вносить в оба файла.
   requestCodeBase свой: PendingIntent'ы двух виджетов не должны
   перетирать друг друга. */
public class FitFlowWidgetNeonLightProvider extends FitFlowWidgetCanvasProvider {

    @Override
    int requestCodeBase() { return 760; }

    @Override
    int layoutRes() { return R.layout.fitflow_widget_neon; }

    @Override
    void configureButtons(RemoteViews views) {
        showThreeActions(views);
    }

    @Override
    void configureButtons(RemoteViews views, FitFlowWidgetData data) {
        showActionsFor(views, data);
    }

    @Override
    void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData d) {
        FitFlowWidgetPaint.drawNeonLight(canvas, width, height, density, d);
    }
}
