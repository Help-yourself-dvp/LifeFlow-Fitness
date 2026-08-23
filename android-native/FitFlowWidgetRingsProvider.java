package com.fitflow.app;

import android.graphics.Canvas;
import android.graphics.Paint;

/* 0.9.6 — вариант «б»: кольца-«матрёшка». Четыре вложенных кольца, каждое —
   свой показатель, легенда снизу или сбоку (зависит от формы виджета).
   Самое плотное по информации оформление: все четыре цели видны одним
   взглядом, но конкретные числа читаются только по легенде. */
public class FitFlowWidgetRingsProvider extends FitFlowWidgetCanvasProvider {

    @Override
    int requestCodeBase() { return 200; }

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

        /* Широкий виджет — легенда сбоку, узкий — под кольцами. Так одно и то
           же оформление остаётся читаемым и в 4×1, и в 2×2. */
        boolean legendSide = width > height * 1.35f;
        float ringsAreaW = legendSide ? width * 0.42f : width - 2 * pad;
        float ringsAreaH = legendSide ? height - top - pad : (height - top - pad) * 0.68f;

        float radiusOuter = Math.min(ringsAreaW, ringsAreaH) / 2f - 2f * density;
        if (radiusOuter < 16f * density) radiusOuter = 16f * density;

        float cx = legendSide ? pad + ringsAreaW / 2f : width / 2f;
        float cy = top + ringsAreaH / 2f;

        /* Толщина подбирается так, чтобы ВСЕ четыре кольца гарантированно
           поместились: шаг = strokeW * 1.35, значит внутреннему кольцу нужно
           radiusOuter >= strokeW * 5.05. Иначе «Активность» просто не
           рисовалась бы — показатель молча пропадал с виджета. */
        float strokeW = Math.max(4f * density, radiusOuter * 0.17f);
        strokeW = Math.min(strokeW, radiusOuter / 5.1f);
        strokeW = Math.max(strokeW, 3f * density);
        float step = strokeW * 1.35f;

        for (int i = 0; i < 4; i++) {
            float r = radiusOuter - i * step;
            if (r < strokeW * 0.9f) break; // мельче уже неразличимо — лучше не рисовать
            FitFlowWidgetDraw.ring(canvas, cx, cy, r, strokeW, pcts[i], colors[i], COLOR_TRACK);
        }

        // Легенда: цветная точка + подпись + значение.
        Paint legendLabel = FitFlowWidgetDraw.text(COLOR_TEXT, 9.5f * density,
            FitFlowWidgetDraw.FONT_BOLD, Paint.Align.LEFT);
        Paint legendValue = FitFlowWidgetDraw.text(COLOR_MUTED, 9f * density,
            FitFlowWidgetDraw.FONT_REGULAR, Paint.Align.LEFT);
        float dotR = 3.2f * density;

        if (legendSide) {
            float lx = pad + ringsAreaW + 10f * density;
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
            /* Под кольцами — две колонки по две строки: четыре подписи в один
               столбик не влезают в квадратный виджет. */
            float ly = top + ringsAreaH + 4f * density;
            float colW = (width - 2 * pad) / 2f;
            float rowH = 14f * density;
            for (int i = 0; i < 4; i++) {
                float lx = pad + (i % 2) * colW;
                float y = ly + (i / 2) * rowH + rowH / 2f;
                if (y + 5f * density > height - pad / 2f) break;
                canvas.drawCircle(lx + dotR, y - 1f * density, dotR, FitFlowWidgetDraw.fill(colors[i]));
                float tx = lx + dotR * 2 + 4f * density;
                String line = labels[i] + " " + pcts[i] + "%";
                canvas.drawText(FitFlowWidgetDraw.ellipsize(line, legendLabel, colW - (tx - lx) - 4f * density),
                    tx, y + 2f * density, legendLabel);
            }
        }
    }
}
