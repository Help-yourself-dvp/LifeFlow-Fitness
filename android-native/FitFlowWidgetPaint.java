package com.fitflow.app;

import android.content.Context;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;

/* 0.9.24: рисунок трёх оформлений пункта 5. Порт макетов
   tools/widget-preview-p5.py на Canvas. Честный потолок RemoteViews —
   полупрозрачная карточка (tint с alpha) + капля / S-волна / neon-glow.
   Wallpaper-blur не рисуем: его умеет только лаунчер. Постоянной анимации нет. */
final class FitFlowWidgetPaint {

    static final int INK = 0xFF1C222E;
    static final int MUTE = 0xFF6E7884;
    static final int CYAN = 0xFF22D3EE;
    static final int ORANGE = 0xFFFB923C;
    static final int PURPLE = 0xFFC084FC;
    static final int NEON_GREEN = 0xFF34D399;
    static final int TEAL_PILL = 0xFF5ED6C4;
    static final int WATER_DEEP = 0xB0249894;
    static final int WATER_TOP = 0xA876E4D6;

    static Typeface font = Typeface.create("sans-serif-medium", Typeface.NORMAL);
    static Typeface fontReg = Typeface.create("sans-serif", Typeface.NORMAL);

    private FitFlowWidgetPaint() { }

    static void ensureFont(Context context) {
        if (context == null) return;
        try {
            Typeface t = Typeface.createFromAsset(context.getAssets(),
                "public/assets/fonts/manrope.ttf");
            if (t != null) {
                font = t;
                fontReg = t;
            }
        } catch (Exception e) {
            // системный гротеск — капля и кольца всё равно читаются
        }
    }

    static String spaced(int n) {
        int v = Math.abs(n);
        if (v < 1000) return String.valueOf(n);
        String raw = String.valueOf(v);
        StringBuilder b = new StringBuilder();
        int len = raw.length();
        for (int i = 0; i < len; i++) {
            if (i > 0 && (len - i) % 3 == 0) b.append(' ');
            b.append(raw.charAt(i));
        }
        return n < 0 ? "-" + b : b.toString();
    }

    static boolean shows(FitFlowWidgetData d, String id) {
        return d != null && d.shows(id);
    }

    static Paint fill(int color) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.FILL);
        p.setColor(color);
        return p;
    }

    static Paint stroke(int color, float w) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setColor(color);
        p.setStrokeWidth(w);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        return p;
    }

    static Paint text(int color, float size, Typeface face, Paint.Align align) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color);
        p.setTextSize(size);
        p.setTypeface(face);
        p.setTextAlign(align);
        return p;
    }

    static void centered(Canvas c, String s, float cx, float midY, Paint p) {
        Paint.FontMetrics fm = p.getFontMetrics();
        c.drawText(s, cx, midY - (fm.ascent + fm.descent) / 2f, p);
    }

    /* Честное стекло: tint с alpha, верхний блик, тонкая обводка. Без blur обоев. */
    static void glass(Canvas c, int w, int h, float den, int tint, int border) {
        float r = 20f * den;
        RectF box = new RectF(1.5f * den, 1.5f * den, w - 1.5f * den, h - 1.5f * den);
        c.drawRoundRect(box, r, r, fill(tint));
        Paint sheen = new Paint(Paint.ANTI_ALIAS_FLAG);
        sheen.setShader(new LinearGradient(0, box.top, 0, box.top + h * 0.34f,
            0x38FFFFFF, 0x00FFFFFF, Shader.TileMode.CLAMP));
        c.drawRoundRect(box, r, r, sheen);
        c.drawRoundRect(box, r, r, stroke(border, 1.4f * den));
    }

    static Path dropPath(float w, float h) {
        Path p = new Path();
        p.moveTo(0.50f * w, 0.04f * h);
        p.cubicTo(0.18f * w, 0.14f * h, 0.00f * w, 0.42f * h, 0.02f * w, 0.66f * h);
        p.cubicTo(0.02f * w, 0.94f * h, 0.26f * w, 0.995f * h, 0.50f * w, 0.995f * h);
        p.cubicTo(0.74f * w, 0.995f * h, 0.98f * w, 0.94f * h, 0.98f * w, 0.66f * h);
        p.cubicTo(1.00f * w, 0.42f * h, 0.82f * w, 0.14f * h, 0.50f * w, 0.04f * h);
        p.close();
        return p;
    }

    static float sWaveY(float x, float w, float fy, float amp, float phase, float lift) {
        float t = w <= 1 ? 0 : x / (w - 1f);
        float base = (float) Math.cos(t * Math.PI);
        float wobble = (float) Math.sin(t * Math.PI * 2.3 + phase) * 0.30f;
        return fy - lift * (1f - t) - amp * (base * 0.50f + wobble);
    }

    static Path sWavePoly(float w, float h, float fy, float amp, float phase, float lift) {
        Path p = new Path();
        p.moveTo(0, sWaveY(0, w, fy, amp, phase, lift));
        int steps = Math.max(24, (int) (w / 4f));
        for (int i = 1; i <= steps; i++) {
            float x = w * i / (float) steps;
            p.lineTo(x, sWaveY(x, w, fy, amp, phase, lift));
        }
        p.lineTo(w, h);
        p.lineTo(0, h);
        p.close();
        return p;
    }

    static void paintDrop(Canvas c, RectF box, float pct, float den) {
        float w = box.width();
        float h = box.height();
        if (w < 8 || h < 8) return;
        int sc = c.save();
        c.translate(box.left, box.top);
        Path drop = dropPath(w, h);
        c.clipPath(drop);
        c.drawPath(drop, fill(0x1CFFFFFF));
        float p = Math.max(0f, Math.min(1f, pct));
        float fy = h * (0.88f - 0.62f * p);
        float amp = w * 0.075f;
        float lift = h * 0.09f;
        c.drawPath(sWavePoly(w, h, fy + h * 0.06f, amp * 1.05f, 0.3f, lift), fill(WATER_DEEP));
        c.drawPath(sWavePoly(w, h, fy, amp, 1.05f, lift), fill(WATER_TOP));
        Paint shade = new Paint(Paint.ANTI_ALIAS_FLAG);
        shade.setShader(new LinearGradient(0, 0, w * 0.55f, 0,
            0x38125652, 0x00125652, Shader.TileMode.CLAMP));
        c.drawPath(sWavePoly(w, h, fy, amp, 1.05f, lift), shade);
        float hx = w * 0.34f;
        float hy = sWaveY(hx, w, fy, amp, 1.05f, lift);
        Paint hi = new Paint(Paint.ANTI_ALIAS_FLAG);
        hi.setColor(0xA6FFFFFF);
        hi.setMaskFilter(new BlurMaskFilter(Math.max(2f, 3f * den), BlurMaskFilter.Blur.NORMAL));
        c.drawOval(new RectF(hx - w * 0.24f, hy - h * 0.08f, hx + w * 0.24f, hy + h * 0.03f), hi);
        c.restoreToCount(sc);
        c.drawPath(translated(drop, box.left, box.top), stroke(0x2EFFFFFF, 1.2f * den));
    }

    static Path translated(Path src, float dx, float dy) {
        Path p = new Path(src);
        p.offset(dx, dy);
        return p;
    }

    static void neonRing(Canvas c, RectF box, float pct, int color, float width) {
        float sweep = Math.max(0f, Math.min(1f, pct)) * 360f;
        Paint track = stroke((color & 0x00FFFFFF) | 0x2A000000, width);
        track.setStrokeCap(Paint.Cap.ROUND);
        c.drawArc(box, 0, 360, false, track);
        if (sweep <= 0.5f) return;
        for (int i = 0; i < 3; i++) {
            float extra = width * (2.1f - i * 0.7f);
            Paint glow = stroke((color & 0x00FFFFFF) | (0x28000000 + i * 0x22000000), width + extra);
            glow.setMaskFilter(new BlurMaskFilter(width * (1.6f - i * 0.4f), BlurMaskFilter.Blur.NORMAL));
            c.drawArc(box, -90, sweep, false, glow);
        }
        Paint core = stroke(color, width);
        core.setStrokeCap(sweep >= 359 ? Paint.Cap.BUTT : Paint.Cap.ROUND);
        c.drawArc(box, -90, sweep, false, core);
        int hi = 0xFF000000
            | Math.min(255, ((color >> 16) & 0xFF) + 40) << 16
            | Math.min(255, ((color >> 8) & 0xFF) + 40) << 8
            | Math.min(255, (color & 0xFF) + 30);
        c.drawArc(box, -90, sweep, false, stroke(hi, Math.max(2f, width / 3f)));
    }

    static void tile(Canvas c, RectF r, float rad, int fill, int border) {
        c.drawRoundRect(r, rad, rad, fill(fill));
        if (border != 0) c.drawRoundRect(r, rad, rad, stroke(border, 1f));
    }

    static void iconSneaker(Canvas c, float x, float y, float s, int color) {
        Paint p = fill(color);
        c.drawRoundRect(new RectF(x + s * 0.08f, y + s * 0.60f, x + s * 0.94f, y + s * 0.78f),
            s / 8f, s / 8f, p);
        Path up = new Path();
        up.moveTo(x + s * 0.16f, y + s * 0.62f);
        up.lineTo(x + s * 0.24f, y + s * 0.34f);
        up.lineTo(x + s * 0.52f, y + s * 0.28f);
        up.lineTo(x + s * 0.62f, y + s * 0.46f);
        up.lineTo(x + s * 0.90f, y + s * 0.62f);
        up.close();
        c.drawPath(up, p);
    }

    static void iconBowl(Canvas c, float x, float y, float s, int color) {
        c.drawArc(new RectF(x + s * 0.08f, y + s * 0.30f, x + s * 0.92f, y + s * 0.98f),
            0, 180, true, fill(color));
        Paint st = stroke(color, Math.max(2f, s / 12f));
        c.drawArc(new RectF(x + s * 0.08f, y + s * 0.22f, x + s * 0.92f, y + s * 0.50f),
            200, 140, false, st);
    }

    static void iconClock(Canvas c, float x, float y, float s, int color) {
        float m = Math.max(2f, s / 10f);
        c.drawCircle(x + s / 2f, y + s / 2f, s * 0.40f, stroke(color, m));
        c.drawLine(x + s / 2f, y + s / 2f, x + s / 2f, y + s * 0.28f, stroke(color, m));
        c.drawLine(x + s / 2f, y + s / 2f, x + s * 0.70f, y + s * 0.62f, stroke(color, m));
    }

    static void iconMood(Canvas c, float x, float y, float s, int color) {
        float m = Math.max(2f, s / 10f);
        c.drawCircle(x + s / 2f, y + s / 2f, s * 0.40f, stroke(color, m));
        c.drawCircle(x + s * 0.36f, y + s * 0.40f, s * 0.05f, fill(color));
        c.drawCircle(x + s * 0.64f, y + s * 0.40f, s * 0.05f, fill(color));
        c.drawArc(new RectF(x + s * 0.28f, y + s * 0.40f, x + s * 0.72f, y + s * 0.78f),
            20, 140, false, stroke(color, m));
    }

    static void iconDropSmall(Canvas c, float x, float y, float s, int color) {
        Path p = dropPath(s, s);
        p.offset(x, y);
        c.drawPath(p, fill(color));
    }

    /* 0.9.32: пламя — показатель «Питание» на «кольцах» (референс владельца).
       Тарелка там читалась хуже: значок мелкий, 11 dp, а у пламени
       узнаваемый силуэт даже в таком размере. */
    static void iconFlame(Canvas c, float x, float y, float s, int color) {
        Path p = new Path();
        for (int i = 0; i <= 100; i++) {
            double a = Math.PI * 2 * i / 100.0;
            double r = 0.34 + 0.10 * Math.cos(a * 3);
            float px = x + s / 2f + (float) (Math.sin(a) * s * r);
            float py = y + s * 0.56f - (float) (Math.cos(a) * s
                * (Math.cos(a) > 0 ? r * 1.30 : r));
            if (i == 0) p.moveTo(px, py); else p.lineTo(px, py);
        }
        p.close();
        c.drawPath(p, fill(color));
        Path in = new Path();
        for (int i = 0; i <= 100; i++) {
            double a = Math.PI * 2 * i / 100.0;
            double r = 0.17;
            float px = x + s / 2f + (float) (Math.sin(a) * s * r);
            float py = y + s * 0.66f - (float) (Math.cos(a) * s
                * (Math.cos(a) > 0 ? r * 1.15 : r));
            if (i == 0) in.moveTo(px, py); else in.lineTo(px, py);
        }
        in.close();
        c.drawPath(in, fill(0xFFFFECC8));
    }

    /* Гантель — строка-статус «Тренировка» (у неё нет пары значение/цель). */
    static void iconDumbbell(Canvas c, float x, float y, float s, int color) {
        float m = Math.max(2f, s / 7f);
        float cy = y + s / 2f;
        c.drawLine(x + s * 0.20f, cy, x + s * 0.80f, cy, stroke(color, m));
        for (float bx : new float[] { 0.16f, 0.84f }) {
            c.drawRoundRect(new RectF(x + s * bx - m, cy - s * 0.26f,
                x + s * bx + m, cy + s * 0.26f), m, m, fill(color));
        }
    }

    /* Значки на кнопках: бутылка (+250 мл) и галочка в круге (витамины). */
    static void iconBottle(Canvas c, float x, float y, float s, int color) {
        c.drawRoundRect(new RectF(x + s * 0.40f, y + s * 0.06f, x + s * 0.60f, y + s * 0.24f),
            s / 12f, s / 12f, fill(color));
        c.drawRoundRect(new RectF(x + s * 0.28f, y + s * 0.22f, x + s * 0.72f, y + s * 0.94f),
            s / 5f, s / 5f, fill(color));
    }

    static void iconCheck(Canvas c, float x, float y, float s, int color) {
        float m = Math.max(2f, s / 7f);
        c.drawCircle(x + s / 2f, y + s / 2f, s * 0.44f, stroke(color, m));
        c.drawLine(x + s * 0.30f, y + s * 0.52f, x + s * 0.45f, y + s * 0.68f, stroke(color, m));
        c.drawLine(x + s * 0.45f, y + s * 0.68f, x + s * 0.72f, y + s * 0.33f, stroke(color, m));
    }

    static void ellipsizeDraw(Canvas c, String value, float x, float y, Paint p, float maxW) {
        String s = value == null ? "" : value;
        if (p.measureText(s) > maxW) {
            String ell = "…";
            float ew = p.measureText(ell);
            int end = s.length();
            while (end > 0 && p.measureText(s, 0, end) + ew > maxW) end--;
            s = end <= 0 ? ell : s.substring(0, end).trim() + ell;
        }
        c.drawText(s, x, y, p);
    }

    /* ---- три оформления ---- */

    static void drawDrop(Canvas c, int w, int h, float den, FitFlowWidgetData d) {
        glass(c, w, h, den, 0x76FFFAF6, 0x96FFFFFF);
        float pad = 12f * den;
        float chrome = 36f * den;
        float leftW = w * 0.36f;
        Paint num = text(INK, 18f * den, font, Paint.Align.LEFT);
        Paint lab = text(INK, 11f * den, font, Paint.Align.LEFT);
        Paint sub = text(MUTE, 9f * den, fontReg, Paint.Align.LEFT);
        if (shows(d, "water")) {
            c.drawText(spaced(d.water) + " мл", pad, pad + 16f * den, num);
            c.drawText("Вода", pad, pad + 30f * den, lab);
        } else {
            c.drawText("FitFlow", pad, pad + 16f * den, num);
        }
        float dropTop = pad + 36f * den;
        float dropH = Math.max(40f * den, h - dropTop - chrome - 8f * den);
        float dropW = Math.min(leftW - pad, dropH * 0.88f);
        if (shows(d, "water") && dropW > 20f * den) {
            paintDrop(c, new RectF(pad, dropTop, pad + dropW, dropTop + dropH),
                d.waterPct() / 100f, den);
            Paint pctP = text(0xE6FFFFFF, 8f * den, font, Paint.Align.CENTER);
            float fy = dropTop + dropH * (0.88f - 0.62f * d.waterPct() / 100f);
            centered(c, "~" + d.waterPct() + "%", pad + dropW * 0.50f, fy + 8f * den, pctP);
        }
        c.drawText("из " + spaced(d.waterGoal) + " мл", pad + 4f * den,
            h - chrome + 4f * den, sub);

        String[] ids = {"steps", "food", "activity", "day-mood"};
        String[] labels = {"Шаги", "Питание", "Активность", "Самочувствие"};
        java.util.ArrayList<Integer> vis = new java.util.ArrayList<Integer>();
        for (int i = 0; i < ids.length; i++) if (shows(d, ids[i])) vis.add(i);
        if (vis.isEmpty()) return;
        float gx = leftW + 2f * den;
        float gy = 10f * den;
        float gap = 6f * den;
        int cols = vis.size() == 1 ? 1 : 2;
        int rows = (vis.size() + cols - 1) / cols;
        float tw = (w - gx - pad - gap * (cols - 1)) / cols;
        float th = (h - gy - chrome - gap * (rows - 1)) / rows;
        if (tw < 36f * den || th < 28f * den) return;
        float rad = 11f * den;
        for (int n = 0; n < vis.size(); n++) {
            int i = vis.get(n);
            int col = n % cols;
            int row = n / cols;
            float x = gx + col * (tw + gap);
            float y = gy + row * (th + gap);
            RectF tr = new RectF(x, y, x + tw, y + th);
            tile(c, tr, rad, 0xE4FFFFFF, 0x5AFFFFFF);
            float ico = 11f * den;
            float ix = x + 7f * den;
            float iy = y + 6f * den;
            if (i == 0) iconSneaker(c, ix, iy, ico, 0xFF48C4A8);
            else if (i == 1) iconBowl(c, ix, iy, ico, 0xFFE88C60);
            else if (i == 2) iconClock(c, ix, iy, ico, 0xFF60B078);
            else iconMood(c, ix, iy, ico, 0xFFE8B040);
            Paint tLab = text(MUTE, 8f * den, font, Paint.Align.LEFT);
            ellipsizeDraw(c, labels[i], ix + ico + 4f * den, y + 15f * den, tLab, tw - ico - 16f * den);
            String val;
            String hint;
            if (i == 0) { val = spaced(d.steps); hint = "из " + spaced(d.stepsGoal); }
            else if (i == 1) { val = spaced(d.food); hint = "ккал съедено"; }
            else if (i == 2) { val = d.activity + " мин"; hint = "из " + d.activityGoal + " мин"; }
            else {
                if (d.mood > 0) { val = d.mood + " из 5"; hint = d.moodLineShort(); }
                else { val = "—"; hint = "не отмечено"; }
            }
            Paint tVal = text(INK, Math.min(14f * den, th * 0.32f), font, Paint.Align.LEFT);
            FitFlowWidgetDraw.fitTextSize(tVal, val, tw - 14f * den, 9f * den);
            c.drawText(val, ix, y + th * 0.58f, tVal);
            Paint tHint = text(MUTE, 8f * den, fontReg, Paint.Align.LEFT);
            ellipsizeDraw(c, hint, ix, y + th - 8f * den, tHint, tw - 14f * den);
        }
    }

    static void drawBento(Canvas c, int w, int h, float den, FitFlowWidgetData d) {
        glass(c, w, h, den, 0x84100C1C, 0x24FFFFFF);
        float pad = 10f * den;
        float chrome = 36f * den;
        float leftW = w * 0.46f;
        float leftH = h - pad - chrome;
        RectF left = new RectF(pad, pad, pad + leftW, pad + leftH);
        tile(c, left, 12f * den, 0x0EFFFFFF, 0x16FFFFFF);
        Paint mute = text(0xA8A8B0C4, 9f * den, font, Paint.Align.LEFT);
        Paint ink = text(0xFFFFFFFF, 18f * den, font, Paint.Align.LEFT);
        if (shows(d, "steps")) {
            c.drawText("Шаги", pad + 10f * den, pad + 16f * den, mute);
            c.drawText(spaced(d.steps), pad + 10f * den, pad + 36f * den, ink);
            c.drawText("шагов", pad + 10f * den, pad + 50f * den,
                text(0xA8A8B0C4, 8f * den, fontReg, Paint.Align.LEFT));
            c.drawText("цель " + spaced(d.stepsGoal), pad + 10f * den, pad + leftH - 8f * den,
                text(0xA8A8B0C4, 8f * den, fontReg, Paint.Align.LEFT));
            float rs = Math.min(leftH * 0.72f, leftW * 0.48f);
            float rx = pad + leftW - rs - 6f * den;
            float ry = pad + (leftH - rs) / 2f;
            neonRing(c, new RectF(rx, ry, rx + rs, ry + rs), d.stepsPct() / 100f, 0xFFC4A0FF, 8f * den);
            iconSneaker(c, rx + rs / 2f - 9f * den, ry + rs / 2f - 14f * den, 18f * den, 0xFFF0ECFF);
            centered(c, d.stepsPct() + "%", rx + rs / 2f, ry + rs / 2f + 12f * den,
                text(0xFFDCC8FF, 8f * den, font, Paint.Align.CENTER));
        } else {
            c.drawText("FitFlow", pad + 10f * den, pad + 22f * den, ink);
        }

        float rw = w - pad * 3 - leftW;
        float rh = (leftH - 6f * den) / 2f;
        float rx0 = pad * 2 + leftW;
        if (shows(d, "water")) {
            RectF wt = new RectF(rx0, pad, rx0 + rw, pad + rh);
            tile(c, wt, 11f * den, 0x8C0A182C, 0x3722D3EE);
            int sc = c.save();
            Path clip = new Path();
            clip.addRoundRect(wt, 11f * den, 11f * den, Path.Direction.CW);
            c.clipPath(clip);
            c.translate(rx0, pad);
            float fy = rh * 0.50f;
            c.drawPath(sWavePoly(rw, rh, fy + 8f * den, 10f * den, 0.15f, 8f * den), fill(0xDC0682A8));
            c.drawPath(sWavePoly(rw, rh, fy, 9f * den, 1.0f, 7f * den), fill(0xC322D3EE));
            Paint blob = fill(0x46C8FCFF);
            blob.setMaskFilter(new BlurMaskFilter(4f * den, BlurMaskFilter.Blur.NORMAL));
            c.drawOval(new RectF(rw * 0.66f, rh * 0.40f, rw * 0.86f, rh * 0.68f), blob);
            c.restoreToCount(sc);
            c.drawText("Вода", rx0 + 8f * den, pad + 14f * den,
                text(0xFF94D2E6, 8f * den, font, Paint.Align.LEFT));
            ellipsizeDraw(c, spaced(d.water) + " / " + spaced(d.waterGoal) + " мл",
                rx0 + 8f * den, pad + 30f * den,
                text(0xFFFFFFFF, 11f * den, font, Paint.Align.LEFT), rw - 16f * den);
        }
        if (shows(d, "food")) {
            float fy0 = pad + rh + 6f * den;
            RectF ft = new RectF(rx0, fy0, rx0 + rw, fy0 + rh);
            tile(c, ft, 11f * den, 0x961C1016, 0x12FFFFFF);
            c.drawText("Питание", rx0 + 8f * den, fy0 + 14f * den, mute);
            ellipsizeDraw(c, spaced(d.food) + " ккал съедено",
                rx0 + 8f * den, fy0 + 32f * den,
                text(0xFFFFFFFF, 11f * den, font, Paint.Align.LEFT), rw - 50f * den);
            Paint pctP = text(ORANGE, 9f * den, font, Paint.Align.RIGHT);
            c.drawText(d.foodPct() + "%", rx0 + rw - 8f * den, fy0 + 16f * den, pctP);
            float bx = rx0 + 8f * den;
            float by = fy0 + rh - 18f * den;
            float bw = rw - 16f * den;
            float bh = 5f * den;
            c.drawRoundRect(new RectF(bx, by, bx + bw, by + bh), 3f * den, 3f * den, fill(0xFF3C2824));
            float fillW = bw * d.foodPct() / 100f;
            if (d.foodPct() > 0 && fillW < bh) fillW = bh;
            if (fillW > 0) {
                c.drawRoundRect(new RectF(bx, by, bx + fillW, by + bh), 3f * den, 3f * den, fill(ORANGE));
            }
            c.drawText("цель " + spaced(d.foodGoal) + " ккал", rx0 + 8f * den, fy0 + rh - 6f * den,
                text(0xA8A8B0C4, 7.5f * den, fontReg, Paint.Align.LEFT));
        }
    }

    /* Показатели «колец», у которых есть числовая пара «значение / цель»,
       то есть те, из которых можно нарисовать дугу. Порядок фиксирован —
       он задаёт и цвет, и толщину кольца. */
    private static final String[] NEON_RINGED = { "water", "food", "steps", "activity" };

    private static boolean isRinged(String id) {
        for (String s : NEON_RINGED) if (s.equals(id)) return true;
        return false;
    }

    private static int neonColor(String id) {
        if ("water".equals(id)) return CYAN;
        if ("food".equals(id)) return ORANGE;
        if ("steps".equals(id)) return PURPLE;
        if ("activity".equals(id)) return NEON_GREEN;
        return 0xFF94A3B8;
    }

    private static String neonLabel(String id) {
        if ("water".equals(id)) return "Вода";
        if ("food".equals(id)) return "Питание";
        if ("steps".equals(id)) return "Шаги";
        if ("activity".equals(id)) return "Активность";
        if ("workout".equals(id)) return "Тренировка";
        return id;
    }

    private static int neonPct(FitFlowWidgetData d, String id) {
        if ("water".equals(id)) return d.waterPct();
        if ("food".equals(id)) return d.foodPct();
        if ("steps".equals(id)) return d.stepsPct();
        if ("activity".equals(id)) return d.activityPct();
        return 0;
    }

    private static String neonValue(FitFlowWidgetData d, String id) {
        if ("water".equals(id)) return spaced(d.water) + " / " + spaced(d.waterGoal) + " мл";
        if ("food".equals(id)) return spaced(d.food) + " / " + spaced(d.foodGoal) + " ккал";
        if ("steps".equals(id)) return spaced(d.steps) + " / " + spaced(d.stepsGoal);
        if ("activity".equals(id)) return spaced(d.activity) + " / " + spaced(d.activityGoal) + " мин";
        if ("workout".equals(id)) return d.workoutShort();
        return "";
    }

    private static void neonIcon(Canvas c, String id, float x, float y, float s, int color) {
        if ("water".equals(id)) iconDropSmall(c, x, y, s, color);
        else if ("food".equals(id)) iconFlame(c, x, y, s, color);
        else if ("steps".equals(id)) iconSneaker(c, x, y, s, color);
        else if ("activity".equals(id)) iconClock(c, x, y, s, color);
        else iconDumbbell(c, x, y, s, color);
    }

    /* Строки виджета в порядке, который выбрал пользователь. Порядок берём
       из d.order() (widgetItems), а не из фиксированного массива:
       иначе «Активность» никогда не попала бы на виджет вперёд «Воды».
       Больше трёх строк не рисуем — не помещаются по высоте. */
    private static java.util.ArrayList<String> neonSlots(FitFlowWidgetData d) {
        java.util.ArrayList<String> out = new java.util.ArrayList<String>();
        for (String id : d.order()) {
            if (out.size() >= 3) break;
            if (out.contains(id)) continue;
            if (isRinged(id) || "workout".equals(id)) out.add(id);
        }
        if (out.isEmpty()) {
            out.add("water");
            out.add("food");
            out.add("steps");
        }
        return out;
    }

    /* Кнопка-пилюля: полупрозрачная заливка, цветная кромка, значок + текст.
       Рисуется в картинке, а нажатие ловит прозрачная Button поверх неё
       (RemoteViews не умеет рисовать такие кнопки сам). */
    private static void neonPill(Canvas c, RectF box, int color, String label,
                                 int icon, float den) {
        float r = box.height() / 2f;
        c.drawRoundRect(box, r, r, fill((color & 0x00FFFFFF) | 0x1C000000));
        c.drawRoundRect(box, r, r, stroke((color & 0x00FFFFFF) | 0xBE000000,
            Math.max(1f, 1.5f * den)));
        Paint p = text(color, 9f * den, font, Paint.Align.LEFT);
        float s = 11f * den;
        float tw = p.measureText(label);
        float total = s + 5f * den + tw;
        float ix = box.centerX() - total / 2f;
        float iy = box.centerY() - s / 2f;
        if (icon == 0) iconBottle(c, ix, iy, s, color);
        else if (icon == 1) iconFlame(c, ix, iy, s, color);
        else iconCheck(c, ix, iy, s, color);
        Paint.FontMetrics fm = p.getFontMetrics();
        c.drawText(label, ix + s + 5f * den,
            box.centerY() - (fm.ascent + fm.descent) / 2f, p);
    }

    /* Дата в середине колец. Владелец отказался от среднего процента:
       такого показателя в приложении нет, его пришлось бы считать на лету,
       и он менялся бы при каждой смене состава виджета. Дата честнее.
       Подбираем самый полный вариант, который влезает в просвет:
       «28.08.2026 / пятница» -> «28.08 / пт» -> «28.08». */
    private static void neonCenter(Canvas c, float ccx, float ccy, float hole, float den) {
        java.util.Calendar cal = java.util.Calendar.getInstance();
        String full = new java.text.SimpleDateFormat("dd.MM.yyyy", new java.util.Locale("ru"))
            .format(cal.getTime());
        String shortDate = new java.text.SimpleDateFormat("dd.MM", new java.util.Locale("ru"))
            .format(cal.getTime());
        String[] dowFull = { "воскресенье", "понедельник", "вторник", "среда",
            "четверг", "пятница", "суббота" };
        String[] dowShort = { "вс", "пн", "вт", "ср", "чт", "пт", "сб" };
        int dw = cal.get(java.util.Calendar.DAY_OF_WEEK) - 1;
        if (dw < 0 || dw > 6) dw = 0;

        String[][] variants = {
            { full, dowFull[dw] }, { shortDate, dowShort[dw] }, { shortDate, "" }
        };
        float avail = hole * 0.86f;
        float floor = Math.max(7f, 6.5f * den);
        for (String[] v : variants) {
            for (float size = hole * 0.34f; size >= floor; size -= 1f) {
                Paint pd = text(0xFFFFFFFF, size, font, Paint.Align.CENTER);
                Paint pw = text(0xA8A8B8CC, Math.max(7f, size * 0.74f), fontReg,
                    Paint.Align.CENTER);
                if (pd.measureText(v[0]) > avail) continue;
                if (v[1].length() > 0 && pw.measureText(v[1]) > avail) continue;
                if (v[1].length() == 0) {
                    centered(c, v[0], ccx, ccy, pd);
                } else {
                    float hd = pd.getTextSize();
                    float hw = pw.getTextSize();
                    float gap = 2f * den;
                    float top = ccy - (hd + gap + hw) / 2f;
                    centered(c, v[0], ccx, top + hd / 2f, pd);
                    centered(c, v[1], ccx, top + hd + gap + hw / 2f, pw);
                }
                return;
            }
        }
    }

    /* 0.9.32 — «кольца» по референсу владельца: стекло, неоновые дуги,
       список показателей со значками справа, три кнопки-пилюли внизу.

       Состав настраивается тем же списком, что у остальных виджетов
       (Настройки → Виджет на рабочем столе). Кольцо рисуется только у
       показателей с парой «значение / цель»; «Тренировка» приходит
       строкой-статусом и кольца не получает — поэтому пустых дуг здесь
       быть не может. */
    static void drawNeon(Canvas c, int w, int h, float den, FitFlowWidgetData d) {
        glass(c, w, h, den, 0x800A1020, 0x24FFFFFF);
        float pad = 10f * den;
        float chrome = 34f * den;
        java.util.ArrayList<String> slots = neonSlots(d);

        java.util.ArrayList<String> ringed = new java.util.ArrayList<String>();
        for (String id : slots) if (isRinged(id)) ringed.add(id);

        float R = Math.min(w * 0.38f, h - chrome - pad * 2);
        if (R < 48f * den) R = 48f * den;
        float cx = pad;
        float cy = pad;
        float[] widths = { 7f * den, 6f * den, 5f * den };
        int drawn = 0;
        for (int i = 0; i < ringed.size() && drawn < 3; i++) {
            String id = ringed.get(i);
            float inset = 3.5f * den + drawn * 9.5f * den;
            RectF box = new RectF(cx + inset, cy + inset, cx + R - inset, cy + R - inset);
            if (box.width() < 16f * den) break;
            neonRing(c, box, neonPct(d, id) / 100f, neonColor(id), widths[drawn]);
            drawn++;
        }

        int ringsN = Math.max(1, drawn);
        float hole = R - 2f * (3.5f * den + (ringsN - 1) * 9.5f * den)
            - 2f * widths[ringsN - 1];
        neonCenter(c, cx + R / 2f, cy + R / 2f, hole, den);

        /* Правая колонка. Кегль общий для всех строк и подобран по самой
           длинной: разнобой размеров в списке выглядит неряшливо, а резать
           подпись нельзя — без неё «1 600 / 2 200 ккал» читается хуже. */
        float lx = cx + R + 10f * den;
        float tx = lx + 15f * den;
        float room = w - tx - pad;
        float rowH = 22f * den;
        float size = 10f * den;
        float minSize = Math.max(6f, 6.5f * den);
        while (size > minSize) {
            Paint probe = text(0xFFFFFFFF, size, font, Paint.Align.LEFT);
            boolean fits = true;
            for (String id : slots) {
                if ("workout".equals(id)) continue;
                if (probe.measureText(neonLabel(id) + ": " + neonValue(d, id)) > room) {
                    fits = false;
                    break;
                }
            }
            if (fits) break;
            size -= 1f;
        }
        Paint ink = text(0xFFFFFFFF, size, font, Paint.Align.LEFT);
        Paint.FontMetrics fm = ink.getFontMetrics();
        float ly = cy + R / 2f - slots.size() * rowH / 2f + 2f * den;
        for (String id : slots) {
            int color = neonColor(id);
            neonIcon(c, id, lx, ly + 1f * den, 11f * den, color);
            String line = neonLabel(id) + ": " + neonValue(d, id);
            ellipsizeDraw(c, line, tx, ly + 6f * den - (fm.ascent + fm.descent) / 2f,
                ink, room);
            ly += rowH;
        }

        /* Кнопки. Рисуем ровно те же три, что и раньше: вода / еда /
           витамины — их видимость и действия задаёт провайдер. */
        float bh = 26f * den;
        float by1 = h - 7f * den;
        float by0 = by1 - bh;
        float gap = 8f * den;
        float inner = w - 2f * pad;
        float bw = (inner - gap * 2f) / 3f;
        float bx = pad;
        neonPill(c, new RectF(bx, by0, bx + bw, by1), CYAN, "+250 мл", 0, den);
        bx += bw + gap;
        neonPill(c, new RectF(bx, by0, bx + bw, by1), ORANGE, "Еда", 1, den);
        bx += bw + gap;
        neonPill(c, new RectF(bx, by0, bx + bw, by1), NEON_GREEN, "Витамины", 2, den);
    }
}
