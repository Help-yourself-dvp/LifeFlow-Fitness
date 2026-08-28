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
    /* Жёлтый «принято частично» на кнопке витаминов (0.9.34). */
    static final int DOSE_AMBER = 0xFFF5B301;

    /* 0.9.34 (пункт 4 владельца): второе оформление «колец» — для светлых
       обоев. Отличаются только цвета и сила свечения, вся геометрия общая,
       поэтому вместо копии drawNeon() заведена тема. Неон на белом фоне
       выглядит грязно, поэтому в светлой теме размытые слои выключены
       (glow=false), а цвета дуг взяты темнее — иначе бледнят. */
    static final class NeonTheme {
        final int tint, border, ink, muted, gear, ringTrack;
        final boolean glow;
        final int water, food, steps, activity;

        NeonTheme(int tint, int border, int ink, int muted, int gear, int ringTrack,
                  boolean glow, int water, int food, int steps, int activity) {
            this.tint = tint; this.border = border; this.ink = ink;
            this.muted = muted; this.gear = gear; this.ringTrack = ringTrack;
            this.glow = glow; this.water = water; this.food = food;
            this.steps = steps; this.activity = activity;
        }
    }

    static final NeonTheme NEON_DARK = new NeonTheme(
        0x800A1020, 0x24FFFFFF, 0xFFFFFFFF, 0xA8A8B8CC, 0x8C96A0B0, 0x2A000000,
        true, CYAN, ORANGE, PURPLE, NEON_GREEN);

    /* Светлая: молочное стекло, тёмный текст, насыщенные дуги без свечения. */
    static final NeonTheme NEON_LIGHT = new NeonTheme(
        0xF0FFFFFF, 0x33FFFFFF, 0xFF16202E, 0xFF5B6676, 0x8C6E7884, 0x33000000,
        false, 0xFF0E9BB5, 0xFFE06A12, 0xFF7C3AED, 0xFF0E9F6E);

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
        neonRing(c, box, pct, color, width, NEON_DARK);
    }

    static void neonRing(Canvas c, RectF box, float pct, int color, float width,
                         NeonTheme th) {
        float sweep = Math.max(0f, Math.min(1f, pct)) * 360f;
        Paint track = stroke((color & 0x00FFFFFF) | th.ringTrack, width);
        track.setStrokeCap(Paint.Cap.ROUND);
        c.drawArc(box, 0, 360, false, track);
        if (sweep <= 0.5f) return;
        for (int i = 0; th.glow && i < 3; i++) {
            float extra = width * (2.1f - i * 0.7f);
            Paint glow = stroke((color & 0x00FFFFFF) | (0x28000000 + i * 0x22000000), width + extra);
            glow.setMaskFilter(new BlurMaskFilter(width * (1.6f - i * 0.4f), BlurMaskFilter.Blur.NORMAL));
            c.drawArc(box, -90, sweep, false, glow);
        }
        Paint core = stroke(color, width);
        core.setStrokeCap(sweep >= 359 ? Paint.Cap.BUTT : Paint.Cap.ROUND);
        c.drawArc(box, -90, sweep, false, core);
        /* Светлая жила по центру штриха — на тёмной теме читается как неон.
           На светлой она бы высветляла дугу до бледной, поэтому пропускаем. */
        if (!th.glow) return;
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
        return neonColor(id, NEON_DARK);
    }

    private static int neonColor(String id, NeonTheme th) {
        if ("water".equals(id)) return th.water;
        if ("food".equals(id)) return th.food;
        if ("steps".equals(id)) return th.steps;
        if ("activity".equals(id)) return th.activity;
        return 0xFF94A3B8;
    }

    private static String neonLabel(String id) {
        if ("water".equals(id)) return "Вода";
        if ("food".equals(id)) return "Питание";
        if ("steps".equals(id)) return "Шаги";
        if ("activity".equals(id)) return "Активность";
        if ("workout".equals(id)) return "Тренировка";
        if ("courses".equals(id)) return "Витамины";
        if ("weight".equals(id)) return "Вес";
        if ("day-mood".equals(id)) return "Самочувствие";
        if ("day-plan".equals(id)) return "План дня";
        return id;
    }

    /* 0.9.33 (пункт 1 владельца): значки — СИСТЕМНЫЕ ЭМОДЗИ, а не
       нарисованные вручную фигуры. На референсе стоят именно они: цветные,
       узнаваемые, одинаковые во всём Android. Свои контуры из линий и
       дуг в 11 dp читались как «клякса» — владелец забраковал.
       Рисуются обычным drawText: шрифт эмодзи в системе уже есть,
       никаких PNG в проект класть не нужно. */
    private static String neonEmoji(String id) {
        /* Набор ОДИН и тот же для списка справа и для кнопок внизу
           (0.9.34, пункт 1 владельца: «вода — капля и там, и там»).
           Значения совпадают с WIDGET_ITEMS в app.js, чтобы виджет и
           диалог настройки показывали одно и то же. */
        if ("water".equals(id)) return "💧";
        if ("food".equals(id)) return "🍽️";
        if ("steps".equals(id)) return "👟";
        if ("activity".equals(id)) return "🏃";
        if ("workout".equals(id)) return "🗓️";
        if ("courses".equals(id)) return "💊";
        if ("day-mood".equals(id)) return "🌗";
        if ("day-plan".equals(id)) return "📋";
        return "•";        // weight рисуется вектором, см. isVectorIcon
    }

    /* Вес — единственный показатель с рисованным значком: эмодзи ⚖️ это
       «весы правосудия», владелец справедливо забраковал (в приложении по
       той же причине с 0.4.14 стоит SVG напольных весов). Здесь его порт. */
    private static boolean isVectorIcon(String id) {
        return "weight".equals(id);
    }

    /* Напольные весы: корпус, табло, стрелка-дуга. Порт WEIGHT_SCALE_SVG_SM
       из app.js (viewBox 24) — значок в виджете и на карточке «Вес» один. */
    static void iconScale(Canvas c, float x, float midY, float s, int color) {
        float k = s / 24f;
        float y = midY - s / 2f;
        float sw = Math.max(1.2f, 2f * k);
        RectF body = new RectF(x + 3f * k, y + 4f * k, x + 21f * k, y + 20f * k);
        c.drawRoundRect(body, 3.5f * k, 3.5f * k, stroke(color, sw));
        RectF screen = new RectF(x + 8.5f * k, y + 7.3f * k, x + 15.5f * k, y + 11.1f * k);
        c.drawRoundRect(screen, 1.2f * k, 1.2f * k, fill(color));
        Path dial = new Path();
        dial.moveTo(x + 7.5f * k, y + 16.6f * k);
        dial.cubicTo(x + 8.2f * k, y + 14.6f * k, x + 9.7f * k, y + 13.6f * k,
            x + 12f * k, y + 13.6f * k);
        dial.cubicTo(x + 14.3f * k, y + 13.6f * k, x + 15.8f * k, y + 14.6f * k,
            x + 16.5f * k, y + 16.6f * k);
        Paint dp = stroke(color, Math.max(1.1f, 1.8f * k));
        dp.setStrokeCap(Paint.Cap.ROUND);
        c.drawPath(dial, dp);
    }

    /* Кружок с галочкой для кнопки витаминов (пункт 2 владельца).
       Зелёный — курс за день закрыт, жёлтый — принята только часть.
       Круг, а не квадрат: так значок вписывается в скругления пилюли. */
    static void iconCheckCircle(Canvas c, float x, float midY, float s, int color,
                                boolean filled) {
        float r = s / 2f;
        float ccx = x + r;
        if (filled) {
            c.drawCircle(ccx, midY, r, fill(color));
        } else {
            c.drawCircle(ccx, midY, r - Math.max(0.8f, s * 0.07f),
                stroke(color, Math.max(1.2f, s * 0.13f)));
        }
        Paint tick = stroke(filled ? 0xFF0B1220 : color, Math.max(1.3f, s * 0.15f));
        tick.setStrokeCap(Paint.Cap.ROUND);
        tick.setStrokeJoin(Paint.Join.ROUND);
        Path p = new Path();
        p.moveTo(ccx - r * 0.42f, midY + r * 0.02f);
        p.lineTo(ccx - r * 0.10f, midY + r * 0.34f);
        p.lineTo(ccx + r * 0.46f, midY - r * 0.34f);
        c.drawPath(p, tick);
    }

    /* Единая точка отрисовки значка: эмодзи или вектор. Списку и кнопкам
       нужен ОДИН значок на показатель, поэтому обе стороны зовут её. */
    static void neonIcon(Canvas c, String id, float x, float midY, float size,
                         int color, Paint emojiPaint) {
        if (isVectorIcon(id)) {
            iconScale(c, x, midY, size, color);
            return;
        }
        Paint.FontMetrics fm = emojiPaint.getFontMetrics();
        c.drawText(neonEmoji(id), x, midY - (fm.ascent + fm.descent) / 2f, emojiPaint);
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
        if ("courses".equals(id)) return d.coursesShort();
        if ("weight".equals(id)) return tail(d.weightLine);
        if ("day-mood".equals(id)) return d.moodLineShort();
        if ("day-plan".equals(id)) return tail(d.dayPlanLine);
        return "";
    }

    /* Хвост строки после двоеточия: подпись слева рисуется отдельно,
       дублировать её в значении незачем. */
    private static String tail(String line) {
        String s = line == null ? "" : line.trim();
        int colon = s.indexOf(':');
        if (colon >= 0 && colon + 1 < s.length()) s = s.substring(colon + 1).trim();
        return s;
    }

    /* Показатели без кольца, которые всё же можно показать строкой.
       Строку для них считает app.js — натив их не вычисляет. */
    private static boolean isLineOnly(FitFlowWidgetData d, String id) {
        if ("workout".equals(id)) return true;
        if ("courses".equals(id)) return true;
        if ("weight".equals(id)) return d.weightLine != null && d.weightLine.length() > 0;
        if ("day-mood".equals(id)) return d.moodLine != null && d.moodLine.length() > 0;
        if ("day-plan".equals(id)) return d.dayPlanLine != null && d.dayPlanLine.length() > 0;
        return false;
    }

    /* 0.9.33 (пункт 5 владельца): строк может быть больше трёх.
       Кольцо получают максимум ТРИ показателя с парой «значение / цель» —
       больше дуг не помещается и они сливаются. Остальные выбранные идут
       строками без кольца, пока хватает высоты (maxRows считает вызывающий
       код по реальной высоте ячейки, шрифт при этом не уменьшается). */
    private static java.util.ArrayList<String> neonSlots(FitFlowWidgetData d, int maxRows) {
        java.util.ArrayList<String> out = new java.util.ArrayList<String>();
        int rings = 0;
        for (String id : d.order()) {
            if (out.size() >= maxRows) break;
            if (out.contains(id)) continue;
            if (isRinged(id)) {
                if (rings >= 3) continue;   // четвёртой дуге места нет
                out.add(id);
                rings++;
            } else if (isLineOnly(d, id)) {
                out.add(id);
            }
        }
        if (out.isEmpty()) {
            out.add("water");
            out.add("food");
            out.add("steps");
        }
        return out;
    }

    /* Кнопка-пилюля: полупрозрачная заливка, цветная кромка, эмодзи + текст.
       Рисуется в картинке, а нажатие ловит прозрачная Button поверх неё
       (RemoteViews не умеет рисовать такие кнопки сам). */
    private static void neonPill(Canvas c, RectF box, int color, String slotId,
                                 String label, float den) {
        float r = box.height() / 2f;
        c.drawRoundRect(box, r, r, fill((color & 0x00FFFFFF) | 0x1C000000));
        c.drawRoundRect(box, r, r, stroke((color & 0x00FFFFFF) | 0xBE000000,
            Math.max(1f, 1.5f * den)));
        Paint p = text(color, 9.5f * den, font, Paint.Align.LEFT);
        Paint pe = text(color, 11f * den, fontReg, Paint.Align.LEFT);
        /* Значок тот же, что у показателя в списке справа (пункт 1):
           вода — капля и там, и там. Ширину меряем одинаково для эмодзи
           и для вектора, иначе содержимое перестанет быть по центру. */
        float ew = isVectorIcon(slotId) ? 11f * den : pe.measureText(neonEmoji(slotId));
        float tw = p.measureText(label);
        float total = ew + 4f * den + tw;
        float ix = box.centerX() - total / 2f;
        neonIcon(c, slotId, ix, box.centerY(), 11f * den, color, pe);
        Paint.FontMetrics fm = p.getFontMetrics();
        c.drawText(label, ix + ew + 4f * den,
            box.centerY() - (fm.ascent + fm.descent) / 2f, p);
    }

    /* Кнопка витаминов. Подпись постоянная, состояние — кружком с галочкой:
       залитый зелёный = всё принято, контурный жёлтый = часть, серая
       таблетка = сегодня ещё ничего не отмечено. */
    private static void neonPillCourses(Canvas c, RectF box, int color, String label,
                                        float den, NeonTheme th,
                                        boolean allDone, boolean partial) {
        float r = box.height() / 2f;
        c.drawRoundRect(box, r, r, fill((color & 0x00FFFFFF) | 0x1C000000));
        c.drawRoundRect(box, r, r, stroke((color & 0x00FFFFFF) | 0xBE000000,
            Math.max(1f, 1.5f * den)));
        Paint p = text(color, 9.5f * den, font, Paint.Align.LEFT);
        Paint pe = text(color, 11f * den, fontReg, Paint.Align.LEFT);
        float s = 11f * den;
        float ew = (allDone || partial) ? s : pe.measureText(neonEmoji("courses"));
        float tw = p.measureText(label);
        float total = ew + 4f * den + tw;
        float ix = box.centerX() - total / 2f;
        if (allDone || partial) {
            iconCheckCircle(c, ix, box.centerY(), s, color, allDone);
        } else {
            neonIcon(c, "courses", ix, box.centerY(), s, color, pe);
        }
        Paint.FontMetrics fm = p.getFontMetrics();
        c.drawText(label, ix + ew + 4f * den,
            box.centerY() - (fm.ascent + fm.descent) / 2f, p);
    }

    /* Шестерёнка настроек в правом верхнем углу (пункт 4 владельца).
       Серая и полупрозрачная: служебная кнопка не должна спорить с
       показателями. Нажатие ловит прозрачная Button из разметки. */
    static void neonGear(Canvas c, float cx, float cy, float s, float den) {
        neonGear(c, cx, cy, s, den, 0x8C96A0B0);
    }

    static void neonGear(Canvas c, float cx, float cy, float s, float den, int color) {
        /* Зубцы по кругу плюс кольцо-обод. Середину НЕ вырезаем прозрачностью:
           под виджетом обои пользователя, и PorterDuff.CLEAR пробил бы в
           стеклянной карточке настоящую дыру. Поэтому обод рисуется
           обводкой — просвет получается сам собой. */
        float rOut = s * 0.50f;
        float rIn = s * 0.30f;
        Paint p = fill(color);
        for (int i = 0; i < 8; i++) {
            double a = Math.toRadians(i * 45);
            Path tooth = new Path();
            double[][] pts = { { -14, rIn }, { -10, rOut }, { 10, rOut }, { 14, rIn } };
            for (int k = 0; k < pts.length; k++) {
                double ang = a + Math.toRadians(pts[k][0]);
                float px = cx + (float) (Math.cos(ang) * pts[k][1]);
                float py = cy + (float) (Math.sin(ang) * pts[k][1]);
                if (k == 0) tooth.moveTo(px, py); else tooth.lineTo(px, py);
            }
            tooth.close();
            c.drawPath(tooth, p);
        }
        c.drawCircle(cx, cy, rIn * 0.82f, stroke(color, Math.max(1.6f, s * 0.16f)));
    }

    /* Дата в середине колец. Владелец отказался от среднего процента:
       такого показателя в приложении нет, его пришлось бы считать на лету,
       и он менялся бы при каждой смене состава виджета. Дата честнее.
       Подбираем самый полный вариант, который влезает в просвет:
       «28.08.2026 / пятница» -> «28.08 / пт» -> «28.08». */
    private static void neonCenter(Canvas c, float ccx, float ccy, float hole, float den,
                                   NeonTheme th) {
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
                Paint pd = text(th.ink, size, font, Paint.Align.CENTER);
                Paint pw = text(th.muted, Math.max(7f, size * 0.74f), fontReg,
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
       список показателей со значками справа, кнопки-пилюли внизу.

       0.9.33 — правки по полевому скрину:
       1. значки — системные эмодзи (свои контуры не читались);
       2. список отодвинут от кольца и укрупнён;
       3. кнопка витаминов появляется только если показатель выбран,
          и показывает, сколько приёмов отмечено;
       4. шестерёнка настроек в правом верхнем углу;
       5. строк может быть больше трёх — сколько влезает по высоте;
       6. набор кнопок следует составу виджета: выключили «Питание» —
          пропала и дуга, и кнопка «Еда».

       Кольцо рисуется только у показателей с парой «значение / цель»;
       «Тренировка», «Витамины» и прочие приходят строкой-статусом —
       поэтому пустых дуг здесь быть не может. */
    static void drawNeon(Canvas c, int w, int h, float den, FitFlowWidgetData d) {
        drawNeon(c, w, h, den, d, NEON_DARK);
    }

    /* 0.9.34: светлый вариант — та же геометрия, другая палитра. */
    static void drawNeonLight(Canvas c, int w, int h, float den, FitFlowWidgetData d) {
        drawNeon(c, w, h, den, d, NEON_LIGHT);
    }

    static void drawNeon(Canvas c, int w, int h, float den, FitFlowWidgetData d,
                         NeonTheme th) {
        glass(c, w, h, den, th.tint, th.border);
        float pad = 10f * den;
        float chrome = 34f * den;

        /* Сколько строк поместится СПРАВА от кольца, не уменьшая шрифт.
           Владелец просил шрифт крупнее, поэтому число строк подстраиваем
           под высоту ячейки, а не наоборот (решение «автоматически»). */
        float rowH = 23f * den;
        /* Полоса списка начинается ПОД шестерёнкой (14 dp + зазор): считать
           строки от самого верха нельзя — последняя лишняя строка вылезала
           бы под значок настроек и обрывалась многоточием. */
        float listTop = pad + 14f * den + 4f * den;
        float listBottom = h - chrome - 4f * den;
        int maxRows = (int) Math.floor((listBottom - listTop) / rowH);
        if (maxRows < 1) maxRows = 1;
        if (maxRows > 6) maxRows = 6;

        java.util.ArrayList<String> slots = neonSlots(d, maxRows);

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
            neonRing(c, box, neonPct(d, id) / 100f, neonColor(id, th), widths[drawn], th);
            drawn++;
        }

        int ringsN = Math.max(1, drawn);
        float hole = R - 2f * (3.5f * den + (ringsN - 1) * 9.5f * den)
            - 2f * widths[ringsN - 1];
        neonCenter(c, cx + R / 2f, cy + R / 2f, hole, den, th);

        /* Шестерёнка — правый верхний угол. Рисуем до списка, чтобы список
           при нехватке ширины обрезался под неё, а не налез сверху. */
        float gearS = 14f * den;
        float gearCx = w - pad - gearS / 2f;
        float gearCy = pad + gearS / 2f;
        neonGear(c, gearCx, gearCy, gearS, den, th.gear);

        /* Правая колонка. 0.9.33: отодвинута от кольца (10 -> 16 dp) и
           укрупнена (10 -> 11.5 dp) по просьбе владельца. Кегль общий для
           всех строк и подобран по самой длинной: разнобой размеров в
           списке выглядит неряшливо, а резать подпись нельзя — без неё
           «1 600 / 2 200 ккал» читается хуже. */
        float lx = cx + R + 16f * den;
        float tx = lx + 17f * den;
        float room = w - tx - pad;
        float size = 11.5f * den;
        float minSize = Math.max(6f, 7f * den);
        while (size > minSize) {
            Paint probe = text(0xFFFFFFFF, size, font, Paint.Align.LEFT);
            boolean fits = true;
            for (String id : slots) {
                if (probe.measureText(neonLabel(id) + ": " + neonValue(d, id)) > room) {
                    fits = false;
                    break;
                }
            }
            if (fits) break;
            size -= 0.5f;
        }
        Paint ink = text(th.ink, size, font, Paint.Align.LEFT);
        Paint.FontMetrics fm = ink.getFontMetrics();
        Paint emo = text(th.ink, size * 1.05f, fontReg, Paint.Align.LEFT);
        /* По умолчанию список центрирован по кольцу, но когда строк много,
           центрирование выносит их за карточку — поэтому зажимаем блок в
           отведённую полосу. */
        float block = slots.size() * rowH;
        float ly = cy + R / 2f - block / 2f + 2f * den;
        if (ly + block > listBottom) ly = listBottom - block;
        if (ly < listTop) ly = listTop;
        for (String id : slots) {
            float mid = ly + 6f * den;
            neonIcon(c, id, lx, mid, size * 1.05f, neonColor(id, th), emo);
            /* Строка, попавшая под шестерёнку, обрывается раньше, чтобы
               текст не лез под неё. */
            float rowRoom = mid < gearCy + gearS ? room - (gearS + 6f * den) : room;
            String line = neonLabel(id) + ": " + neonValue(d, id);
            ellipsizeDraw(c, line, tx, mid - (fm.ascent + fm.descent) / 2f, ink, rowRoom);
            ly += rowH;
        }

        /* Кнопки. 0.9.33 (пункт 6): набор следует составу виджета —
           выключили показатель, пропала и его кнопка. Пустую полосу не
           рисуем вовсе, оставшиеся кнопки делят ширину поровну. */
        java.util.ArrayList<String> btns = new java.util.ArrayList<String>();
        if (d.shows("water")) btns.add("water");
        if (d.shows("food")) btns.add("food");
        if (d.shows("courses")) btns.add("courses");
        if (btns.isEmpty()) return;

        float bh = 26f * den;
        float by1 = h - 7f * den;
        float by0 = by1 - bh;
        float gap = 8f * den;
        float inner = w - 2f * pad;
        float bw = (inner - gap * (btns.size() - 1)) / btns.size();
        float bx = pad;
        for (String id : btns) {
            RectF box = new RectF(bx, by0, bx + bw, by1);
            if ("courses".equals(id)) {
                /* 0.9.34 (пункт 2 владельца): подпись всегда «Витамины» —
                   иначе по слову «готово» не понять, о чём кнопка. Состояние
                   показывает кружок с галочкой: зелёный залитый — курс за
                   день закрыт, жёлтый контурный — принята лишь часть. */
                boolean allDone = d.coursesDone > 0 && d.coursesDone >= d.coursesTotal;
                boolean partial = d.coursesDone > 0 && !allDone;
                int tone = allDone ? NEON_GREEN : (partial ? DOSE_AMBER : th.muted);
                neonPillCourses(c, box, tone, "Витамины", den, th,
                    allDone, partial);
            } else {
                int tone = "water".equals(id) ? th.water : th.food;
                neonPill(c, box, tone, id, "water".equals(id) ? "+250 мл" : "Еда", den);
            }
            bx += bw + gap;
        }
    }
}