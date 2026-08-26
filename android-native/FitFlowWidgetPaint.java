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

    static void drawNeon(Canvas c, int w, int h, float den, FitFlowWidgetData d) {
        glass(c, w, h, den, 0x800A1020, 0x24FFFFFF);
        float pad = 10f * den;
        float chrome = 40f * den;
        float R = Math.min(w * 0.42f, h - chrome - pad * 2);
        if (R < 48f * den) R = 48f * den;
        float cx = pad;
        float cy = pad;
        int[] colors = {CYAN, ORANGE, PURPLE};
        String[] ids = {"water", "food", "steps"};
        int[] pcts = {d.waterPct(), d.foodPct(), d.stepsPct()};
        float[] widths = {9f * den, 8f * den, 7f * den};
        int drawn = 0;
        for (int i = 0; i < 3; i++) {
            if (!shows(d, ids[i])) continue;
            float inset = 4f * den + drawn * 13f * den;
            RectF box = new RectF(cx + inset, cy + inset, cx + R - inset, cy + R - inset);
            if (box.width() < 16f * den) break;
            neonRing(c, box, pcts[i] / 100f, colors[i], widths[i]);
            drawn++;
        }
        int day = 0;
        int n = 0;
        for (int i = 0; i < 3; i++) if (shows(d, ids[i])) { day += pcts[i]; n++; }
        if (n > 0) day = Math.round(day / (float) n);
        Paint mid = text(0xFFFFFFFF, 8f * den, font, Paint.Align.CENTER);
        centered(c, "FitFlow · " + day + "%", cx + R / 2f, cy + R / 2f - 6f * den, mid);
        centered(c, "дня", cx + R / 2f, cy + R / 2f + 8f * den,
            text(0xA8A8B8CC, 8f * den, fontReg, Paint.Align.CENTER));

        float lx = cx + R + 10f * den;
        float ly = pad + 8f * den;
        Paint ink = text(0xFFFFFFFF, 10f * den, font, Paint.Align.LEFT);
        String[] labs = {"Вода", "Питание", "Шаги"};
        String[] vals = {
            spaced(d.water) + " / " + spaced(d.waterGoal) + " мл",
            spaced(d.food) + " / " + spaced(d.foodGoal) + " ккал",
            spaced(d.steps) + " / " + spaced(d.stepsGoal)
        };
        for (int i = 0; i < 3; i++) {
            if (!shows(d, ids[i])) continue;
            c.drawCircle(lx + 4f * den, ly + 6f * den, 3.2f * den, fill(colors[i]));
            if (i == 0) iconDropSmall(c, lx + 12f * den, ly - 2f * den, 12f * den, colors[i]);
            else if (i == 1) iconBowl(c, lx + 12f * den, ly - 2f * den, 12f * den, colors[i]);
            else iconSneaker(c, lx + 12f * den, ly - 2f * den, 12f * den, colors[i]);
            ellipsizeDraw(c, labs[i] + ":  " + vals[i], lx + 28f * den, ly + 10f * den, ink,
                w - lx - pad - 28f * den);
            ly += 22f * den;
        }
        if (shows(d, "courses") && d.coursesLine != null && d.coursesLine.length() > 0) {
            Paint vit = text(0xA8A8B8CC, 8f * den, fontReg, Paint.Align.LEFT);
            ellipsizeDraw(c, d.coursesLine, pad + 4f * den, h - chrome - 4f * den, vit, w - pad * 2);
        }
    }
}
