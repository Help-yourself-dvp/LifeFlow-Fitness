package com.fitflow.app;

import android.content.Context;
import android.content.Intent;
import android.app.PendingIntent;
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

    /* 0.9.37: тап по плитке открывает раздел ИМЕННО этого показателя.
       Прозрачные кнопки в разметке лежат по той же сетке, что рисует
       drawTiles, поэтому порядок слотов здесь обязан совпадать с ним:
       вода — слева, остальные — по строкам сетки 2x2. */
    private static final int[] SLOT_BTN = {
        R.id.widget_tiles_slot_1, R.id.widget_tiles_slot_2,
        R.id.widget_tiles_slot_3, R.id.widget_tiles_slot_4
    };

    @Override
    void configureSlotActions(Context context, RemoteViews views,
                              FitFlowWidgetData data) {
        java.util.ArrayList<String> slots = FitFlowWidgetPaint.tilesSlots(data);
        boolean hasWater = slots.contains("water");
        views.setViewVisibility(R.id.widget_tiles_slot_water,
            hasWater ? android.view.View.VISIBLE : android.view.View.GONE);
        if (hasWater) openSlot(context, views, R.id.widget_tiles_slot_water, "water", 0);

        java.util.ArrayList<String> rest = new java.util.ArrayList<String>();
        for (String id : slots) if (!"water".equals(id)) rest.add(id);
        for (int i = 0; i < SLOT_BTN.length; i++) {
            boolean on = i < rest.size();
            views.setViewVisibility(SLOT_BTN[i],
                on ? android.view.View.VISIBLE : android.view.View.GONE);
            if (on) openSlot(context, views, SLOT_BTN[i], rest.get(i), i + 1);
        }
    }

    /* Каждому слоту — свой requestCode, иначе система переиспользует один
       PendingIntent и все плитки поведут в один раздел (грабля 0.9.6). */
    private void openSlot(Context context, RemoteViews views, int viewId,
                          String slotId, int index) {
        Intent it = new Intent(context, MainActivity.class);
        it.putExtra("widget_action", "open_" + slotId);
        it.setData(android.net.Uri.parse("fitflow://tiles/" + slotId));
        it.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(viewId, PendingIntent.getActivity(
            context, requestCodeBase() + 10 + index, it,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
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
