package com.fitflow.app;

import android.graphics.Canvas;
import android.graphics.Paint;

/* 0.9.6 — вариант «а» из списка владельца: одно крупное кольцо + строки.
   Кольцо отдано воде (главный показатель продукта), остальное — компактными
   строками с полосами справа. Расчёт на беглый взгляд: «сколько выпил» видно
   с расстояния, детали читаются вблизи. */
public class FitFlowWidgetRingProvider extends FitFlowWidgetCanvasProvider {

    @Override
    int requestCodeBase() { return 100; }

    @Override
    void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData d) {
        FitFlowWidgetDraw.background(canvas, width, height, density);

        float pad = 12f * density;
        float top = pad;

        Paint title = FitFlowWidgetDraw.text(FitFlowWidgetCanvasProvider.COLOR_WATER,
            10f * density, FitFlowWidgetDraw.FONT_BOLD, Paint.Align.LEFT);
        canvas.drawText("FITFLOW · СЕГОДНЯ", pad, top + 9f * density, title);
        top += 16f * density;

        /* Кольцо слева, размер — от свободной высоты, чтобы на узком виджете
           оно не съедало место под строки, а на большом не терялось. */
        float available = height - top - pad;
        float ringRadius = Math.min(available / 2f, Math.min(width * 0.20f, 34f * density));
        if (ringRadius < 14f * density) ringRadius = 14f * density;
        float cx = pad + ringRadius;
        float cy = top + available / 2f;
        float ringStroke = Math.max(5f * density, ringRadius * 0.28f);

        FitFlowWidgetDraw.ring(canvas, cx, cy, ringRadius, ringStroke,
            d.waterPct(), COLOR_WATER, COLOR_TRACK);
        FitFlowWidgetDraw.centeredText(canvas, d.waterPct() + "%", cx, cy - 3f * density,
            FitFlowWidgetDraw.text(COLOR_TEXT, ringRadius * 0.52f, FitFlowWidgetDraw.FONT_BOLD, Paint.Align.CENTER));
        FitFlowWidgetDraw.centeredText(canvas, "вода", cx, cy + ringRadius * 0.42f,
            FitFlowWidgetDraw.text(COLOR_MUTED, ringRadius * 0.30f, FitFlowWidgetDraw.FONT_REGULAR, Paint.Align.CENTER));

        // Строки справа от кольца.
        float rowsLeft = cx + ringRadius + 10f * density;
        float rowsWidth = width - pad - rowsLeft;
        if (rowsWidth < 40f * density) return; // слишком узко — оставляем только кольцо

        String[] labels = { "Вода", "Питание", "Шаги", "Актив." };
        String[] values = { d.waterValue(), d.foodValue(), d.stepsValue(), d.activityValue() };
        int[] pcts = { d.waterPct(), d.foodPct(), d.stepsPct(), d.activityPct() };
        int[] colors = { COLOR_WATER, COLOR_FOOD, COLOR_STEPS, COLOR_ACTIVITY };

        // 13dp вместо 15dp: при стандартной высоте 4×2 иначе влезали только
        // три строки из четырёх и «Активность» молча пропадала.
        float rowH = 13f * density;
        float gap = 4f * density;
        int rows = (int) Math.floor((available + gap) / (rowH + gap));
        if (rows > labels.length) rows = labels.length;
        if (rows < 1) rows = 1;

        float blockH = rows * rowH + (rows - 1) * gap;
        float y = top + (available - blockH) / 2f;

        Paint labelPaint = FitFlowWidgetDraw.text(COLOR_TEXT, 10f * density,
            FitFlowWidgetDraw.FONT_BOLD, Paint.Align.LEFT);
        Paint valuePaint = FitFlowWidgetDraw.text(COLOR_MUTED, 9f * density,
            FitFlowWidgetDraw.FONT_REGULAR, Paint.Align.RIGHT);

        for (int i = 0; i < rows; i++) {
            canvas.drawText(labels[i], rowsLeft, y + 7.5f * density, labelPaint);
            canvas.drawText(FitFlowWidgetDraw.ellipsize(values[i], valuePaint, rowsWidth * 0.60f),
                rowsLeft + rowsWidth, y + 7.5f * density, valuePaint);
            FitFlowWidgetDraw.bar(canvas, rowsLeft, y + 10f * density, rowsWidth, 3.5f * density,
                pcts[i], colors[i], COLOR_TRACK);
            y += rowH + gap;
        }
    }
}
