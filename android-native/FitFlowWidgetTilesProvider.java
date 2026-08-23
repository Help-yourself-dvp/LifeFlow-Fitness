package com.fitflow.app;

import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;

/* 0.9.6 — вариант «г»: плитки-карточки 2×2. Каждый показатель — своя
   карточка с крупным числом; проценты уходят на второй план, на первом —
   сами значения. Самый «крупноблочный» вариант: читается издалека, но
   занимает больше места на одну цифру, чем кольца. */
public class FitFlowWidgetTilesProvider extends FitFlowWidgetCanvasProvider {

    @Override
    int requestCodeBase() { return 400; }

    /* Мягкие подложки плиток — светлые версии основных цветов. Прозрачность
       не используем: под виджетом могут быть любые обои, и полупрозрачный
       фон давал бы разный вид на разных экранах. */
    private static final int[] TILE_BG = { 0xFFDCF1F2, 0xFFFFEBD6, 0xFFE1EAFB, 0xFFDDF2E5 };

    @Override
    void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData d) {
        FitFlowWidgetDraw.background(canvas, width, height, density);

        float pad = 10f * density;
        Paint title = FitFlowWidgetDraw.text(COLOR_WATER, 10f * density,
            FitFlowWidgetDraw.FONT_BOLD, Paint.Align.LEFT);
        canvas.drawText("FITFLOW · СЕГОДНЯ", pad + 2f * density, pad + 9f * density, title);
        float top = pad + 15f * density;

        String[] labels = { "Вода", "Питание", "Шаги", "Актив." };
        String[] bigValues = {
            d.water + " мл",
            d.food + " ккал",
            FitFlowWidgetData.compact(d.steps),
            d.activity + " мин"
        };
        int[] pcts = { d.waterPct(), d.foodPct(), d.stepsPct(), d.activityPct() };
        int[] colors = { COLOR_WATER, COLOR_FOOD, COLOR_STEPS, COLOR_ACTIVITY };

        /* Форма сетки подстраивается под виджет: длинный и низкий — один ряд
           из четырёх плиток, иначе 2×2. */
        boolean singleRow = width > height * 2.2f;
        int cols = singleRow ? 4 : 2;
        int rows = singleRow ? 1 : 2;

        float gap = 6f * density;
        float areaW = width - 2 * pad;
        float areaH = height - top - pad;
        float tileW = (areaW - gap * (cols - 1)) / cols;
        float tileH = (areaH - gap * (rows - 1)) / rows;
        if (tileW < 24f * density || tileH < 20f * density) return; // не влезает — не мельчим

        float radius = 12f * density;

        for (int i = 0; i < 4; i++) {
            int col = i % cols;
            int row = i / cols;
            if (row >= rows) break;
            float left = pad + col * (tileW + gap);
            float tileTop = top + row * (tileH + gap);
            RectF rect = new RectF(left, tileTop, left + tileW, tileTop + tileH);
            FitFlowWidgetDraw.card(canvas, rect, radius, TILE_BG[i]);

            float inner = 7f * density;
            Paint labelPaint = FitFlowWidgetDraw.text(colors[i], Math.min(9.5f * density, tileH * 0.22f),
                FitFlowWidgetDraw.FONT_BOLD, Paint.Align.LEFT);
            FitFlowWidgetDraw.fitTextSize(labelPaint, labels[i], tileW - inner * 2, 7f * density);
            canvas.drawText(FitFlowWidgetDraw.ellipsize(labels[i], labelPaint, tileW - inner * 2),
                left + inner, tileTop + inner + labelPaint.getTextSize() * 0.85f, labelPaint);

            Paint valuePaint = FitFlowWidgetDraw.text(COLOR_TEXT, Math.min(16f * density, tileH * 0.34f),
                FitFlowWidgetDraw.FONT_BOLD, Paint.Align.LEFT);
            // Сначала уменьшаем кегль, и только если совсем не влезло — обрезаем:
            // «25 мин» не должно превращаться в «25…».
            FitFlowWidgetDraw.fitTextSize(valuePaint, bigValues[i], tileW - inner * 2, 9f * density);
            String big = FitFlowWidgetDraw.ellipsize(bigValues[i], valuePaint, tileW - inner * 2);
            canvas.drawText(big, left + inner, tileTop + tileH * 0.62f, valuePaint);

            // Полоса прогресса прижата к низу плитки, над ней — процент.
            float barH = Math.max(3.5f * density, tileH * 0.075f);
            float barY = tileTop + tileH - inner - barH;
            FitFlowWidgetDraw.bar(canvas, left + inner, barY, tileW - inner * 2, barH,
                pcts[i], colors[i], 0x33000000);

            Paint pctPaint = FitFlowWidgetDraw.text(COLOR_MUTED, Math.min(9f * density, tileH * 0.19f),
                FitFlowWidgetDraw.FONT_REGULAR, Paint.Align.RIGHT);
            canvas.drawText(pcts[i] + "%", left + tileW - inner, barY - 3f * density, pctPaint);
        }
    }
}
