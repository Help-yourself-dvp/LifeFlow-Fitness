package com.fitflow.app;

import android.graphics.Canvas;
import android.graphics.Paint;

/* 0.9.6 — вариант «в», описанный владельцем подробнее прочих: центральный
   круг, вокруг него четыре дуги по четвертям, у каждой — свой процент вдоль
   дуги, снизу/сбоку легенда по цветам.

   В центре — «день целиком»: среднее по четырём целям. Это единственная
   цифра, которую имеет смысл ставить в середину такой композиции, иначе
   центр либо пустует, либо дублирует одну из четвертей. */
public class FitFlowWidgetDialProvider extends FitFlowWidgetCanvasProvider {

    @Override
    int requestCodeBase() { return 300; }

    @Override
    void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData d) {
        FitFlowWidgetDraw.background(canvas, width, height, density);

        float pad = 12f * density;
        Paint title = FitFlowWidgetDraw.text(COLOR_WATER, 10f * density,
            FitFlowWidgetDraw.FONT_BOLD, Paint.Align.LEFT);
        canvas.drawText("FITFLOW · СЕГОДНЯ", pad, pad + 9f * density, title);
        float top = pad + 16f * density;

        int[] pcts = { d.waterPct(), d.foodPct(), d.stepsPct(), d.activityPct() };
        int[] colors = { COLOR_WATER, COLOR_FOOD, COLOR_STEPS, COLOR_ACTIVITY };
        String[] labels = { "Вода", "Питание", "Шаги", "Актив." };
        String[] values = { d.waterValue(), d.foodValue(), d.stepsValue(), d.activityValue() };

        boolean legendSide = width > height * 1.35f;
        float dialAreaW = legendSide ? width * 0.44f : width - 2 * pad;
        float dialAreaH = legendSide ? height - top - pad : (height - top - pad) * 0.60f;

        float radius = Math.min(dialAreaW, dialAreaH) / 2f - 3f * density;
        if (radius < 18f * density) radius = 18f * density;
        float cx = legendSide ? pad + dialAreaW / 2f : width / 2f;
        float cy = top + dialAreaH / 2f;

        float arcStroke = Math.max(6f * density, radius * 0.20f);
        float arcRadius = radius - arcStroke / 2f;

        /* Четверти с зазором: без него дуги сливаются в сплошное кольцо и
           перестают читаться как четыре отдельных показателя. */
        float gapDeg = 8f;
        float sweep = 90f - gapDeg;
        for (int i = 0; i < 4; i++) {
            float start = -90f + i * 90f + gapDeg / 2f;
            FitFlowWidgetDraw.arcSegment(canvas, cx, cy, arcRadius, arcStroke,
                start, sweep, pcts[i], colors[i], COLOR_TRACK);
        }

        // Проценты вдоль каждой дуги — снаружи, в середине своей четверти.
        Paint arcPct = FitFlowWidgetDraw.text(COLOR_TEXT, Math.max(8f * density, radius * 0.17f),
            FitFlowWidgetDraw.FONT_BOLD, Paint.Align.CENTER);
        float labelRadius = arcRadius + arcStroke * 0.5f + 8f * density;
        for (int i = 0; i < 4; i++) {
            double mid = Math.toRadians(-90f + i * 90f + 45f);
            float lx = cx + (float) Math.cos(mid) * labelRadius;
            float ly = cy + (float) Math.sin(mid) * labelRadius;
            // Не выпускаем подпись за границы картинки на тесных размерах.
            lx = Math.max(pad + 8f * density, Math.min(width - pad - 8f * density, lx));
            ly = Math.max(top + 6f * density, Math.min(height - pad, ly));
            FitFlowWidgetDraw.centeredText(canvas, pcts[i] + "%", lx, ly, arcPct);
        }

        // Центр: средний процент по дню.
        int overall = Math.round((pcts[0] + pcts[1] + pcts[2] + pcts[3]) / 4f);
        float innerR = arcRadius - arcStroke / 2f - 4f * density;
        if (innerR > 8f * density) {
            canvas.drawCircle(cx, cy, innerR, FitFlowWidgetDraw.fill(0xFFFFFFFF));
            FitFlowWidgetDraw.centeredText(canvas, overall + "%", cx, cy - innerR * 0.12f,
                FitFlowWidgetDraw.text(COLOR_TEXT, innerR * 0.62f, FitFlowWidgetDraw.FONT_BOLD, Paint.Align.CENTER));
            if (innerR > 16f * density) {
                FitFlowWidgetDraw.centeredText(canvas, "день", cx, cy + innerR * 0.45f,
                    FitFlowWidgetDraw.text(COLOR_MUTED, innerR * 0.30f, FitFlowWidgetDraw.FONT_REGULAR, Paint.Align.CENTER));
            }
        }

        // Легенда по цветам.
        Paint legendLabel = FitFlowWidgetDraw.text(COLOR_TEXT, 9.5f * density,
            FitFlowWidgetDraw.FONT_BOLD, Paint.Align.LEFT);
        Paint legendValue = FitFlowWidgetDraw.text(COLOR_MUTED, 9f * density,
            FitFlowWidgetDraw.FONT_REGULAR, Paint.Align.LEFT);
        float dotR = 3.2f * density;

        if (legendSide) {
            float lx = pad + dialAreaW + 10f * density;
            float lw = width - pad - lx;
            if (lw < 30f * density) return;
            float rowH = Math.min(20f * density, (height - top - pad) / 4f);
            float y = top + ((height - top - pad) - rowH * 4) / 2f + rowH / 2f;
            for (int i = 0; i < 4; i++) {
                canvas.drawCircle(lx + dotR, y, dotR, FitFlowWidgetDraw.fill(colors[i]));
                float tx = lx + dotR * 2 + 5f * density;
                canvas.drawText(FitFlowWidgetDraw.ellipsize(labels[i], legendLabel, lw - (tx - lx)),
                    tx, y - 1f * density, legendLabel);
                canvas.drawText(FitFlowWidgetDraw.ellipsize(values[i], legendValue, lw - (tx - lx)),
                    tx, y + 9f * density, legendValue);
                y += rowH;
            }
        } else {
            float ly = top + dialAreaH + 2f * density;
            float colW = (width - 2 * pad) / 2f;
            float rowH = 14f * density;
            for (int i = 0; i < 4; i++) {
                float lx = pad + (i % 2) * colW;
                float y = ly + (i / 2) * rowH + rowH / 2f;
                if (y + 5f * density > height - pad / 2f) break;
                canvas.drawCircle(lx + dotR, y - 1f * density, dotR, FitFlowWidgetDraw.fill(colors[i]));
                float tx = lx + dotR * 2 + 4f * density;
                canvas.drawText(FitFlowWidgetDraw.ellipsize(labels[i], legendLabel, colW - (tx - lx) - 4f * density),
                    tx, y + 2f * density, legendLabel);
            }
        }
    }
}
