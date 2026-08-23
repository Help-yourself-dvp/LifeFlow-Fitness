package com.fitflow.app;

import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;

/* 0.9.6: общие примитивы рисования для сравниваемых оформлений виджета.
   Вынесены отдельно, чтобы четыре варианта отличались только композицией,
   а не своими копиями «нарисовать кольцо» и «обрезать длинный текст». */
final class FitFlowWidgetDraw {

    private FitFlowWidgetDraw() { }

    static final Typeface FONT_BOLD = Typeface.create("sans-serif-medium", Typeface.NORMAL);
    static final Typeface FONT_REGULAR = Typeface.create("sans-serif", Typeface.NORMAL);

    static Paint fill(int color) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.FILL);
        p.setColor(color);
        return p;
    }

    static Paint stroke(int color, float widthPx) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setColor(color);
        p.setStrokeWidth(widthPx);
        p.setStrokeCap(Paint.Cap.ROUND);
        return p;
    }

    static Paint text(int color, float sizePx, Typeface face, Paint.Align align) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color);
        p.setTextSize(sizePx);
        p.setTypeface(face);
        p.setTextAlign(align);
        return p;
    }

    /* Фон карточки: тот же скруглённый прямоугольник и та же обводка, что у
       классического виджета (fitflow_widget_background), чтобы сравнение шло
       по содержимому, а не по разной подложке. */
    static void background(Canvas canvas, int width, int height, float density) {
        float inset = 1f * density;
        RectF rect = new RectF(inset, inset, width - inset, height - inset);
        float radius = 20f * density;
        canvas.drawRoundRect(rect, radius, radius, fill(0xFFE8F5F4));
        canvas.drawRoundRect(rect, radius, radius, stroke(0xFF7AA6A6, 1f * density));
    }

    /* Кольцо прогресса: серый трек на всю окружность + цветная дуга от
       12 часов по часовой стрелке. Ровно то, что нельзя получить из
       ProgressBar в RemoteViews на minSdk 26. */
    static void ring(Canvas canvas, float cx, float cy, float radius, float strokePx,
                     int pct, int color, int trackColor) {
        RectF box = new RectF(cx - radius, cy - radius, cx + radius, cy + radius);
        canvas.drawArc(box, 0, 360, false, stroke(trackColor, strokePx));
        float sweep = Math.max(0, Math.min(100, pct)) * 3.6f;
        if (sweep <= 0) return;
        // Полный круг рисуем без ROUND-шапок: иначе концы наезжают друг на друга.
        Paint p = stroke(color, strokePx);
        if (sweep >= 360) p.setStrokeCap(Paint.Cap.BUTT);
        canvas.drawArc(box, -90, sweep, false, p);
    }

    /* Дуга в заданном секторе (для варианта «круг + 4 дуги по четвертям»):
       трек рисуется по всему сектору, заливка — по проценту от него. */
    static void arcSegment(Canvas canvas, float cx, float cy, float radius, float strokePx,
                           float startAngle, float sweepAngle, int pct, int color, int trackColor) {
        RectF box = new RectF(cx - radius, cy - radius, cx + radius, cy + radius);
        canvas.drawArc(box, startAngle, sweepAngle, false, stroke(trackColor, strokePx));
        float filled = sweepAngle * Math.max(0, Math.min(100, pct)) / 100f;
        if (filled > 0) canvas.drawArc(box, startAngle, filled, false, stroke(color, strokePx));
    }

    /* Горизонтальная полоса со скруглением — для плиток и строк. */
    static void bar(Canvas canvas, float left, float top, float width, float height,
                    int pct, int color, int trackColor) {
        float r = height / 2f;
        canvas.drawRoundRect(new RectF(left, top, left + width, top + height), r, r, fill(trackColor));
        float filled = width * Math.max(0, Math.min(100, pct)) / 100f;
        // Слишком короткую заливку всё равно показываем «таблеткой», иначе
        // при 1–2 % полоса выглядит пустой и непонятно, что запись прошла.
        if (pct > 0 && filled < height) filled = height;
        if (filled > 0) canvas.drawRoundRect(new RectF(left, top, left + filled, top + height), r, r, fill(color));
    }

    /* Скруглённая плитка-карточка. */
    static void card(Canvas canvas, RectF rect, float radius, int color) {
        canvas.drawRoundRect(rect, radius, radius, fill(color));
    }

    /* Обрезка по ширине с многоточием: длинное имя профиля не должно
       вылезать за край картинки (в bitmap нет ellipsize, как у TextView). */
    static String ellipsize(String value, Paint paint, float maxWidth) {
        if (value == null) return "";
        if (paint.measureText(value) <= maxWidth) return value;
        String ell = "…";
        float ellWidth = paint.measureText(ell);
        int end = value.length();
        while (end > 0 && paint.measureText(value, 0, end) + ellWidth > maxWidth) end--;
        return end <= 0 ? ell : value.substring(0, end).trim() + ell;
    }

    /* Подгонка размера шрифта под ширину: для чисел («6200», «25 мин»)
       обрезать многоточием нельзя — значение станет нечитаемым, поэтому
       уменьшаем кегль до нижней границы, и лишь потом обрезаем. */
    static void fitTextSize(Paint paint, String value, float maxWidth, float minSizePx) {
        if (value == null || value.length() == 0 || maxWidth <= 0) return;
        while (paint.getTextSize() > minSizePx && paint.measureText(value) > maxWidth) {
            paint.setTextSize(Math.max(minSizePx, paint.getTextSize() - 1f));
        }
    }

    /* Текст по центру строки: y задаёт середину, а не базовую линию —
       так проще центрировать подписи внутри колец и плиток. */
    static void centeredText(Canvas canvas, String value, float cx, float cyMiddle, Paint paint) {
        Paint.FontMetrics fm = paint.getFontMetrics();
        float baseline = cyMiddle - (fm.ascent + fm.descent) / 2f;
        canvas.drawText(value, cx, baseline, paint);
    }
}
