#!/usr/bin/env python3
"""Макеты виджета п.5 — потолок Canvas + вид «лаунчер блюрит обои».

Не APK. Числа и кнопки — наши (вода / питание съедено / шаги / активность /
самочувствие / витамины). Сон, burned kcal, remaining, 4-е кольцо не рисуем.

Два режима карточки:
  frost=True  — размытые обои под стеклом. Так умеет лаунчер (Samsung One UI
                и подобные), не RemoteViews.
  frost=False — полупрозрачный слой без blur. Обои под карточкой резкие.
                Это потолок самого приложения: alpha + Canvas (капля, волна,
                glow). Живой wallpaper-blur только если лаунчер рисует сам.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "design"
FONT = ROOT / "assets" / "fonts" / "manrope.ttf"

WATER, WATER_G = 1750, 2500
FOOD, FOOD_G = 1450, 2000
STEPS, STEPS_G = 8420, 10000
ACT, ACT_G = 45, 60
MOOD, MOOD_G = 4, 5
VIT_TAKEN, VIT_TOTAL = 1, 2
VIT_NEXT = "21:00"

P_WATER = WATER / WATER_G
P_FOOD = FOOD / FOOD_G
P_STEPS = STEPS / STEPS_G
P_ACT = ACT / ACT_G
P_MOOD = MOOD / MOOD_G
P_DAY = (P_WATER + P_FOOD + P_STEPS) / 3.0

# Внутренний масштаб (паддинги, шрифты). Холст сцен — 1280x800.
s = 2


def lerp(a, b, t):
    return a + (b - a) * t


def font(px, *, bold=False):
    if not FONT.exists():
        return ImageFont.load_default()
    return ImageFont.truetype(str(FONT), max(10, int(px)))


def fmt(n):
    return f"{int(n):,}".replace(",", " ")


def cover(im, size):
    tw, th = size
    w, h = im.size
    scale = max(tw / w, th / h)
    nw, nh = max(1, int(w * scale + 0.5)), max(1, int(h * scale + 0.5))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x = max(0, (nw - tw) // 2)
    y = max(0, (nh - th) // 2)
    return im.crop((x, y, x + tw, y + th))


def load_wallpaper(kind, size):
    """Живые обои из design/wp-*.jpg; иначе синтетика."""
    names = {
        "dawn": ("wp-dawn.jpg", "wp-dawn.png"),
        "night": ("wp-night.jpg", "wp-night.png"),
        "night-warm": ("wp-night.jpg", "wp-night.png"),
    }[kind]
    for name in names:
        p = OUT / name
        if p.exists():
            im = Image.open(p).convert("RGB")
            out = cover(im, size).convert("RGBA")
            if kind == "night-warm":
                r, g, b, a = out.split()
                r = r.point(lambda v: min(255, int(v * 1.06 + 6)))
                b = b.point(lambda v: min(255, int(v * 1.04)))
                out = Image.merge("RGBA", (r, g, b, a))
            return out
    return wallpaper_synth(kind, size)


def wallpaper_synth(kind, size):
    w, h = size
    im = Image.new("RGB", (w, h))
    px = im.load()
    if kind == "dawn":
        for y in range(h):
            t = y / max(1, h - 1)
            if t < 0.42:
                u = t / 0.42
                col = (
                    int(lerp(255, 255, u)),
                    int(lerp(176, 210, u)),
                    int(lerp(140, 186, u)),
                )
            elif t < 0.62:
                u = (t - 0.42) / 0.20
                col = (
                    int(lerp(255, 232, u)),
                    int(lerp(210, 168, u)),
                    int(lerp(186, 168, u)),
                )
            else:
                u = (t - 0.62) / 0.38
                col = (
                    int(lerp(196, 142, u)),
                    int(lerp(118, 78, u)),
                    int(lerp(128, 96, u)),
                )
            for x in range(w):
                px[x, y] = col
        d = ImageDraw.Draw(im)
        d.ellipse((int(w * 0.62), int(h * 0.10), int(w * 0.86), int(h * 0.38)), fill=(255, 236, 176))
    else:
        warm = kind == "night-warm"
        for y in range(h):
            t = y / max(1, h - 1)
            if warm:
                col = (
                    int(lerp(48, 18, t)),
                    int(lerp(16, 10, t)),
                    int(lerp(64, 28, t)),
                )
            else:
                col = (
                    int(lerp(10, 6, t)),
                    int(lerp(18, 12, t)),
                    int(lerp(44, 28, t)),
                )
            for x in range(w):
                px[x, y] = col
        d = ImageDraw.Draw(im)
        import random
        rng = random.Random(7 if warm else 3)
        for _ in range(70):
            x = rng.randint(0, w - 1)
            y = rng.randint(0, int(h * 0.85))
            r = rng.choice((1, 1, 2))
            col = (255, 236, 180) if warm else (210, 230, 255)
            d.ellipse((x, y, x + r, y + r), fill=col)
    return im.convert("RGBA")


def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    return m


def cubic(p0, p1, p2, p3, n=28):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1.0 - t
        x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0]
        y = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]
        pts.append((x, y))
    return pts


def drop_mask(w, h):
    """Капля вверх: круглое брюхо, короткий носик. Кубики Безье."""
    def pt(nx, ny):
        return (nx * (w - 1), ny * (h - 1))

    left = cubic(pt(0.50, 0.04), pt(0.18, 0.14), pt(0.00, 0.42), pt(0.02, 0.66), 32)
    bot_l = cubic(pt(0.02, 0.66), pt(0.02, 0.94), pt(0.26, 0.995), pt(0.50, 0.995), 24)
    bot_r = cubic(pt(0.50, 0.995), pt(0.74, 0.995), pt(0.98, 0.94), pt(0.98, 0.66), 24)
    right = cubic(pt(0.98, 0.66), pt(1.00, 0.42), pt(0.82, 0.14), pt(0.50, 0.04), 32)
    pts = left + bot_l[1:] + bot_r[1:] + right[1:]
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m


def mask_fill_y(mask, pct):
    w, h = mask.size
    raw = mask.tobytes()
    totals = [0] * h
    for y in range(h):
        row = raw[y * w : (y + 1) * w]
        totals[y] = sum(1 for v in row if v > 128)
    total = sum(totals) or 1
    need = total * pct
    acc = 0
    for y in range(h - 1, -1, -1):
        acc += totals[y]
        if acc >= need:
            return y
    return int(h * (1.0 - pct))


def apply_mask(im, mask):
    r, g, b, a = im.split()
    a = ImageChops.multiply(a, mask)
    return Image.merge("RGBA", (r, g, b, a))


def drop_shadow(size, radius, blur=22, alpha=70, dy=8):
    w, h = size
    pad = blur * 2
    sh = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    core = Image.new("RGBA", (w, h), (0, 0, 0, alpha))
    core = apply_mask(core, rounded_mask(w, h, radius))
    sh.paste(core, (pad, pad + dy), core)
    return sh.filter(ImageFilter.GaussianBlur(blur * 0.55)), pad


def glass_card(size, radius, tint, wallpaper=None, pos=(0, 0), frost=False, blur=36, border=(255, 255, 255, 90)):
    """frost: размытый кроп обоев (лаунчер). Иначе — только tint с alpha."""
    w, h = size
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = rounded_mask(w, h, radius)
    if frost and wallpaper is not None:
        x, y = pos
        # чуть шире кроп, чтобы blur не тащил край холста
        m = blur * 2
        cx0, cy0 = max(0, x - m), max(0, y - m)
        cx1, cy1 = min(wallpaper.size[0], x + w + m), min(wallpaper.size[1], y + h + m)
        crop = wallpaper.crop((cx0, cy0, cx1, cy1)).convert("RGBA")
        crop = crop.filter(ImageFilter.GaussianBlur(blur))
        crop = crop.filter(ImageFilter.GaussianBlur(max(8, blur // 2)))
        crop = ImageEnhance.Brightness(crop).enhance(1.10)
        crop = ImageEnhance.Color(crop).enhance(0.62)
        # вырезаем обратно размер карточки
        ox, oy = x - cx0, y - cy0
        crop = crop.crop((ox, oy, ox + w, oy + h))
        if crop.size != (w, h):
            crop = crop.resize((w, h), Image.Resampling.LANCZOS)
        card = crop
    veil = Image.new("RGBA", (w, h), tint)
    card = Image.alpha_composite(card.convert("RGBA"), veil)
    card = apply_mask(card, mask)
    # верхний блик
    sheen = Image.new("L", (w, h), 0)
    sp = sheen.load()
    band = max(8, h // 3)
    for y in range(band):
        v = int(48 * (1.0 - y / band))
        for x in range(w):
            sp[x, y] = v
    sheen = ImageChops.multiply(sheen, mask)
    glow = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    glow.putalpha(sheen)
    card = Image.alpha_composite(card, glow)
    # обводка
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle((1, 1, w - 2, h - 2), radius=max(1, radius - 1), outline=border, width=2)
    card = Image.alpha_composite(card, apply_mask(ov, mask))
    return card


def wave_poly(w, h, fy, amp, phase, extra=0.0):
    pts = []
    for x in range(w):
        t = x / max(1, w - 1)
        yy = fy + int(amp * math.sin(t * math.pi * 2 + phase)) + int(amp * 0.35 * math.sin(t * math.pi * 4 + phase * 1.7))
        pts.append((x, yy + extra))
    pts += [(w - 1, h - 1), (0, h - 1)]
    return pts


def s_wave_y(x, w, fy, amp, phase, left_lift):
    """S-кромка: слева выше, справа ниже."""
    t = x / max(1.0, w - 1)
    base = math.cos(t * math.pi)
    wobble = math.sin(t * math.pi * 2.3 + phase) * 0.30
    return fy - int(left_lift * (1.0 - t)) - int(amp * (base * 0.50 + wobble))


def s_wave_poly(w, h, fy, amp, phase=0.0, left_lift=0):
    pts = [(x, s_wave_y(x, w, fy, amp, phase, left_lift)) for x in range(w)]
    pts += [(w - 1, h - 1), (0, h - 1)]
    return pts


def paint_drop(size, fill_pct, ss=3):
    """Капля: вода снизу, S-кромка (лево выше). Без контура. Блик — черта."""
    w, h = size
    W, H = w * ss, h * ss
    mask = drop_mask(W, H)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # тело капли почти прозрачное — обои читаются сквозь пустую часть
    body = Image.new("RGBA", (W, H), (255, 255, 255, 28))
    layer = Image.alpha_composite(layer, apply_mask(body, mask))
    fy = mask_fill_y(mask, fill_pct)
    amp = int(W * 0.075)
    lift = int(H * 0.09)
    water = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dw = ImageDraw.Draw(water)
    dw.polygon(s_wave_poly(W, H, fy + int(H * 0.06), int(amp * 1.05), 0.3, lift), fill=(36, 152, 148, 175))
    dw.polygon(s_wave_poly(W, H, fy, amp, 1.05, lift), fill=(118, 228, 214, 168))
    layer = Image.alpha_composite(layer, apply_mask(water, mask))
    # объём: левая сторона воды чуть темнее
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sp = shade.load()
    for x in range(W):
        t = x / max(1, W - 1)
        a = int(56 * (1.0 - t) ** 1.35)
        if a <= 0:
            continue
        y0 = s_wave_y(x, W, fy, amp, 1.05, lift)
        for y in range(max(0, y0), H):
            sp[x, y] = (18, 86, 82, a)
    layer = Image.alpha_composite(layer, apply_mask(shade, mask))
    # блик — мягкая капля на гребне слева, не полоска на всю ширину
    hi = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hx = int(W * 0.34)
    hy = s_wave_y(hx, W, fy, amp, 1.05, lift)
    rx, ry = int(W * 0.24), int(H * 0.08)
    hd.ellipse((hx - rx, hy - ry, hx + rx, hy + int(ry * 0.4)), fill=(255, 255, 255, 165))
    hi = hi.filter(ImageFilter.GaussianBlur(max(2, ss * 3)))
    water_m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(water_m).polygon(s_wave_poly(W, H, fy, amp, 1.05, lift), fill=255)
    ha = hi.split()[-1]
    hi.putalpha(ImageChops.multiply(ha, water_m))
    layer = Image.alpha_composite(layer, apply_mask(hi, mask))
    # мягкий внутренний ободок, не тёмный контур MinFilter
    inner = mask.filter(ImageFilter.MinFilter(ss * 2 + 1))
    rim_m = ImageChops.subtract(mask, inner).filter(ImageFilter.GaussianBlur(ss))
    rim = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    rim.putalpha(rim_m.point(lambda v: int(v * 0.18)))
    layer = Image.alpha_composite(layer, apply_mask(rim, mask))
    out = layer.resize((w, h), Image.Resampling.LANCZOS)
    return out, int(fy / ss)


def arc_caps(draw, box, start, end, color, width):
    draw.arc(box, start, end, fill=color, width=width)
    cx = (box[0] + box[2]) / 2
    cy = (box[1] + box[3]) / 2
    rx = (box[2] - box[0]) / 2
    ry = (box[3] - box[1]) / 2
    r = width / 2
    for ang in (start, end):
        a = math.radians(ang)
        x = cx + rx * math.cos(a)
        y = cy + ry * math.sin(a)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def neon_ring(size, box, pct, color, width, track=None):
    """Кольцо с bloom. Углы Pillow: 0 = 3 часа, по часовой."""
    w, h = size
    start = -90
    sweep = max(8, min(350, 360 * pct))
    end = start + sweep
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    if track:
        tr = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(tr).arc(box, 0, 360, fill=track, width=width)
        out = Image.alpha_composite(out, tr)
    # bloom: широкий мягкий ореол + более плотный
    for br, extra, al in (
        (26, int(width * 2.4), 64),
        (12, int(width * 1.2), 110),
        (5, int(width * 0.45), 160),
    ):
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        col = (color[0], color[1], color[2], al)
        arc_caps(ImageDraw.Draw(glow), inflate(box, extra // 2), start, end, col, width + extra)
        out = Image.alpha_composite(out, glow.filter(ImageFilter.GaussianBlur(br)))
    core = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hi = (min(255, color[0] + 40), min(255, color[1] + 40), min(255, color[2] + 30), 255)
    arc_caps(ImageDraw.Draw(core), box, start, end, color, width)
    arc_caps(ImageDraw.Draw(core), box, start, end, hi, max(2, width // 3))
    out = Image.alpha_composite(out, core)
    return out


def inflate(box, d):
    return (box[0] - d, box[1] - d, box[2] + d, box[3] + d)


def rounded_tile(size, radius, fill, border=None):
    w, h = size
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=fill, outline=border, width=1 if border else 0)
    return im


def text_w(d, t, fnt):
    b = d.textbbox((0, 0), t, font=fnt)
    return b[2] - b[0], b[3] - b[1]


def icon_layer(size, painter, ss=4):
    S = size * ss
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    painter(ImageDraw.Draw(im), S)
    return im.resize((size, size), Image.Resampling.LANCZOS)


def icon_foot(size, color):
    def p(d, S):
        d.ellipse((int(S * 0.30), int(S * 0.55), int(S * 0.70), int(S * 0.94)), fill=color)
        d.polygon(
            [
                (int(S * 0.32), int(S * 0.62)),
                (int(S * 0.28), int(S * 0.38)),
                (int(S * 0.68), int(S * 0.32)),
                (int(S * 0.70), int(S * 0.62)),
            ],
            fill=color,
        )
        d.ellipse((int(S * 0.22), int(S * 0.18), int(S * 0.72), int(S * 0.48)), fill=color)
        d.ellipse((int(S * 0.12), int(S * 0.20), int(S * 0.30), int(S * 0.40)), fill=color)
        d.ellipse((int(S * 0.22), int(S * 0.08), int(S * 0.36), int(S * 0.22)), fill=color)
        d.ellipse((int(S * 0.38), int(S * 0.04), int(S * 0.50), int(S * 0.18)), fill=color)
        d.ellipse((int(S * 0.52), int(S * 0.06), int(S * 0.62), int(S * 0.18)), fill=color)

    return icon_layer(size, p, ss=4)


def icon_bowl(size, color):
    def p(d, S):
        d.chord((int(S * 0.08), int(S * 0.30), int(S * 0.92), int(S * 0.98)), 0, 180, fill=color)
        d.arc((int(S * 0.08), int(S * 0.22), int(S * 0.92), int(S * 0.50)), 200, 340, fill=color, width=max(2, S // 12))
        wln = max(2, S // 14)
        d.arc((int(S * 0.28), int(S * 0.02), int(S * 0.44), int(S * 0.36)), 210, 330, fill=color, width=wln)
        d.arc((int(S * 0.44), int(S * 0.00), int(S * 0.58), int(S * 0.32)), 210, 330, fill=color, width=wln)
        d.arc((int(S * 0.58), int(S * 0.02), int(S * 0.74), int(S * 0.36)), 210, 330, fill=color, width=wln)

    return icon_layer(size, p, ss=4)


def icon_clock(size, color):
    def p(d, S):
        m = max(2, S // 10)
        d.ellipse((int(S * 0.10), int(S * 0.10), int(S * 0.90), int(S * 0.90)), outline=color, width=m)
        d.line((S // 2, S // 2, S // 2, int(S * 0.28)), fill=color, width=m)
        d.line((S // 2, S // 2, int(S * 0.70), int(S * 0.62)), fill=color, width=m)

    return icon_layer(size, p, ss=4)


def icon_mood(size, color):
    def p(d, S):
        d.ellipse((int(S * 0.08), int(S * 0.08), int(S * 0.92), int(S * 0.92)), outline=color, width=max(2, S // 10))
        d.ellipse((int(S * 0.30), int(S * 0.32), int(S * 0.42), int(S * 0.46)), fill=color)
        d.ellipse((int(S * 0.58), int(S * 0.32), int(S * 0.70), int(S * 0.46)), fill=color)
        d.arc((int(S * 0.28), int(S * 0.40), int(S * 0.72), int(S * 0.78)), 20, 160, fill=color, width=max(2, S // 11))

    return icon_layer(size, p, ss=4)


def icon_drop(size, color):
    def p(d, S):
        m = drop_mask(S, S)
        d.bitmap((0, 0), m, fill=color)

    return icon_layer(size, p, ss=4)


def icon_flame(size, color):
    def p(d, S):
        pts = [
            (S * 0.50, S * 0.08),
            (S * 0.78, S * 0.48),
            (S * 0.70, S * 0.86),
            (S * 0.30, S * 0.86),
            (S * 0.22, S * 0.48),
        ]
        d.polygon(pts, fill=color)
        d.polygon(
            [(S * 0.50, S * 0.40), (S * 0.62, S * 0.66), (S * 0.50, S * 0.82), (S * 0.38, S * 0.66)],
            fill=(255, 255, 255, 90),
        )

    return icon_layer(size, p, ss=4)


def icon_sneaker(size, color):
    def p(d, S):
        sole = (int(S * 0.08), int(S * 0.60), int(S * 0.94), int(S * 0.78))
        d.rounded_rectangle(sole, radius=S // 8, fill=color)
        d.polygon(
            [
                (int(S * 0.16), int(S * 0.62)),
                (int(S * 0.24), int(S * 0.34)),
                (int(S * 0.52), int(S * 0.28)),
                (int(S * 0.62), int(S * 0.46)),
                (int(S * 0.90), int(S * 0.62)),
            ],
            fill=color,
        )
        stripe = (max(0, color[0] - 40), max(0, color[1] - 40), max(0, color[2] - 40), color[3] if len(color) > 3 else 255)
        d.line((int(S * 0.30), int(S * 0.58), int(S * 0.52), int(S * 0.40)), fill=stripe, width=max(2, S // 14))

    return icon_layer(size, p, ss=4)


def icon_plus(size, color, bg):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((0, 0, size - 1, size - 1), fill=bg)
    m = max(2, size // 8)
    c = size // 2
    d.line((c, size * 0.28, c, size * 0.72), fill=color, width=m)
    d.line((size * 0.28, c, size * 0.72, c), fill=color, width=m)
    return im


def icon_check(size, color):
    def p(d, S):
        w = max(2, S // 8)
        d.line((int(S * 0.18), int(S * 0.52), int(S * 0.42), int(S * 0.76)), fill=color, width=w)
        d.line((int(S * 0.42), int(S * 0.76), int(S * 0.84), int(S * 0.24)), fill=color, width=w)

    return icon_layer(size, p, ss=4)


def icon_bottle(size, color):
    def p(d, S):
        d.rounded_rectangle((int(S * 0.34), int(S * 0.08), int(S * 0.66), int(S * 0.22)), radius=S // 14, outline=color, width=max(2, S // 12))
        d.rounded_rectangle((int(S * 0.28), int(S * 0.20), int(S * 0.72), int(S * 0.90)), radius=S // 6, outline=color, width=max(2, S // 12))
        d.rectangle((int(S * 0.34), int(S * 0.52), int(S * 0.66), int(S * 0.80)), fill=color)

    return icon_layer(size, p, ss=4)


def pill_filled(size, fill, text, tcol=(255, 255, 255, 255), fnt=None):
    w, h = size
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=fill)
    fnt = fnt or font(22)
    tw, th = text_w(d, text, fnt)
    d.text(((w - tw) / 2, (h - th) / 2 - 1), text, font=fnt, fill=tcol)
    return im


def pill_outline(size, stroke, text, icon=None, fnt=None):
    w, h = size
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((1, 1, w - 2, h - 2), radius=h // 2, outline=stroke, width=3)
    fnt = fnt or font(18)
    tw, th = text_w(d, text, fnt)
    gap = 8
    iw = icon.size[0] if icon is not None else 0
    total = tw + (iw + gap if icon is not None else 0)
    x = (w - total) / 2
    y = (h - th) / 2 - 1
    if icon is not None:
        iy = (h - icon.size[1]) // 2
        im.alpha_composite(icon, (int(x), iy))
        x += iw + gap
    d.text((x, y), text, font=fnt, fill=stroke)
    return im


def widget_light(frost, wallpaper, pos):
    ww, wh = int(1000 * s / 2), int(430 * s / 2)
    radius = 36
    # frost: тонкая вуаль, чтобы был виден размытый пейзаж
    # honest: тоже просвечивает, но обои резкие
    tint = (255, 250, 246, 92 if frost else 118)
    border = (255, 255, 255, 210 if frost else 150)
    card = glass_card((ww, wh), radius, tint, wallpaper, pos, frost, blur=40, border=border)
    d = ImageDraw.Draw(card)
    ink = (28, 34, 46, 255)
    mute = (110, 120, 132, 255)
    pad = 28
    left_w = int(ww * 0.36)
    f_num = font(42)
    f_lab = font(24)
    f_sub = font(15)
    t1 = f"{fmt(WATER)} мл"
    d.text((pad, 18), t1, font=f_num, fill=ink)
    d.text((pad, 64), "Вода", font=f_lab, fill=ink)
    dw, dh = 190, 214
    dx = pad + 4
    dy = 94
    drop, fy = paint_drop((dw, dh), P_WATER, ss=3)
    card.alpha_composite(drop, (dx, dy))
    pct = f"~{int(P_WATER * 100)}%"
    d.text((dx + int(dw * 0.50), dy + fy + 4), pct, font=font(13), fill=(255, 255, 255, 235))
    pill = pill_filled((148, 36), (94, 214, 196, 255), "+250 мл", tcol=(18, 48, 46, 255), fnt=font(15))
    card.alpha_composite(pill, (pad, wh - 52))
    d.text((pad + 156, wh - 42), f"из {fmt(WATER_G)} мл", font=f_sub, fill=mute)

    gx = left_w + 4
    gy = 20
    gap = 12
    tw = (ww - gx - pad - gap) // 2
    th = (wh - gy - 20 - gap) // 2
    tiles = [
        ("Шаги", fmt(STEPS), f"из {fmt(STEPS_G)}", icon_foot(22, (72, 196, 168, 255))),
        ("Питание", fmt(FOOD), "ккал съедено", icon_bowl(22, (232, 140, 96, 255))),
        ("Активность", f"{ACT} мин", f"из {ACT_G} мин", icon_clock(22, (96, 176, 120, 255))),
        ("Самочувствие", "хороший", f"{MOOD} из {MOOD_G}", icon_mood(22, (232, 176, 64, 255))),
    ]
    for i, (lab, val, sub, ico) in enumerate(tiles):
        col, row = i % 2, i // 2
        x = gx + col * (tw + gap)
        y = gy + row * (th + gap)
        tile = rounded_tile((tw, th), 22, (255, 255, 255, 228), border=(255, 255, 255, 90))
        card.alpha_composite(tile, (x, y))
        td = ImageDraw.Draw(card)
        card.alpha_composite(ico, (x + 14, y + 14))
        td.text((x + 42, y + 16), lab, font=font(13), fill=mute)
        td.text((x + 14, y + 46), val, font=font(28), fill=ink)
        td.text((x + 14, y + th - 28), sub, font=font(13), fill=mute)
    return card


def widget_bento(frost, wallpaper, pos):
    ww, wh = int(1000 * s / 2), int(430 * s / 2)
    radius = 36
    tint = (16, 12, 28, 100 if frost else 132)
    border = (255, 255, 255, 36)
    card = glass_card((ww, wh), radius, tint, wallpaper, pos, frost, blur=36, border=border)
    pad = 20
    ink = (255, 255, 255, 255)
    mute = (168, 176, 196, 255)
    left_w = int(ww * 0.46)
    left_h = wh - pad * 2
    left = rounded_tile((left_w, left_h), 24, (255, 255, 255, 14), border=(255, 255, 255, 22))
    card.alpha_composite(left, (pad, pad))
    d = ImageDraw.Draw(card)
    d.text((pad + 18, pad + 14), "Шаги", font=font(16), fill=mute)
    d.text((pad + 18, pad + 48), fmt(STEPS), font=font(40), fill=ink)
    d.text((pad + 18, pad + 100), "шагов", font=font(15), fill=mute)
    d.text((pad + 18, pad + left_h - 32), f"цель {fmt(STEPS_G)}", font=font(14), fill=mute)

    # кольцо справа в левой плитке
    rs = 176
    rx = pad + left_w - rs - 10
    ry = pad + (left_h - rs) // 2 - 2
    ring = neon_ring(
        (ww, wh),
        (rx, ry, rx + rs, ry + rs),
        P_STEPS,
        (196, 160, 255, 255),
        18,
        track=(183, 148, 246, 48),
    )
    card.alpha_composite(ring, (0, 0))
    shoe = icon_sneaker(34, (240, 236, 255, 255))
    card.alpha_composite(shoe, (rx + rs // 2 - 17, ry + rs // 2 - 26))
    pct = f"{int(P_STEPS * 100)}%"
    tw, _ = text_w(d, pct, font(14))
    d.text((rx + (rs - tw) / 2, ry + rs // 2 + 14), pct, font=font(14), fill=(220, 200, 255, 255))

    # вода
    rw = ww - pad * 3 - left_w
    rh = (left_h - 12) // 2
    rx0 = pad * 2 + left_w
    water_tile = rounded_tile((rw, rh), 22, (10, 24, 44, 140), border=(34, 211, 238, 55))
    card.alpha_composite(water_tile, (rx0, pad))
    wave = Image.new("RGBA", (rw, rh), (0, 0, 0, 0))
    fy = int(rh * 0.50)
    ImageDraw.Draw(wave).polygon(s_wave_poly(rw, rh, fy + 14, 26, 0.15, 22), fill=(6, 130, 168, 220))
    ImageDraw.Draw(wave).polygon(s_wave_poly(rw, rh, fy, 22, 1.0, 20), fill=(34, 211, 238, 195))
    wave = apply_mask(wave, rounded_mask(rw, rh, 22))
    card.alpha_composite(wave, (rx0, pad))
    blob = Image.new("RGBA", (rw, rh), (0, 0, 0, 0))
    ImageDraw.Draw(blob).ellipse(
        (int(rw * 0.66), int(rh * 0.40), int(rw * 0.86), int(rh * 0.68)),
        fill=(200, 252, 255, 70),
    )
    blob = blob.filter(ImageFilter.GaussianBlur(7))
    water_m = Image.new("L", (rw, rh), 0)
    ImageDraw.Draw(water_m).polygon(s_wave_poly(rw, rh, fy, 22, 1.0, 20), fill=255)
    blob = apply_mask(blob, water_m)
    blob = apply_mask(blob, rounded_mask(rw, rh, 22))
    card.alpha_composite(blob, (rx0, pad))
    d.text((rx0 + 16, pad + 12), "Вода", font=font(14), fill=(148, 210, 230, 255))
    d.text((rx0 + 16, pad + 34), f"{fmt(WATER)} / {fmt(WATER_G)} мл", font=font(22), fill=ink)
    plus = icon_plus(44, (8, 20, 32, 255), (34, 211, 238, 255))
    card.alpha_composite(plus, (rx0 + rw - 58, pad + 10))
    tw, _ = text_w(d, "+250 мл", font(13))
    d.text((rx0 + rw - tw - 14, pad + rh - 26), "+250 мл", font=font(13), fill=(180, 240, 250, 255))

    # питание
    fy0 = pad + rh + 12
    food_tile = rounded_tile((rw, rh), 22, (28, 16, 22, 150), border=(255, 255, 255, 18))
    card.alpha_composite(food_tile, (rx0, fy0))
    d.text((rx0 + 16, fy0 + 12), "Питание", font=font(14), fill=mute)
    d.text((rx0 + 16, fy0 + 36), f"{fmt(FOOD)} ккал съедено", font=font(20), fill=ink)
    d.text((rx0 + rw - 58, fy0 + 16), f"{int(P_FOOD * 100)}%", font=font(16), fill=(251, 146, 60, 255))
    bx, by, bw, bh = rx0 + 16, fy0 + rh - 36, rw - 32, 10
    ImageDraw.Draw(card).rounded_rectangle((bx, by, bx + bw, by + bh), radius=5, fill=(60, 40, 36, 255))
    ImageDraw.Draw(card).rounded_rectangle((bx, by, bx + int(bw * P_FOOD), by + bh), radius=5, fill=(251, 146, 60, 255))
    d.text((rx0 + 16, fy0 + rh - 22), f"цель {fmt(FOOD_G)} ккал", font=font(12), fill=mute)
    return card


def widget_rings(frost, wallpaper, pos):
    ww, wh = int(1000 * s / 2), int(430 * s / 2)
    radius = 36
    tint = (10, 16, 32, 96 if frost else 128)
    border = (255, 255, 255, 36)
    card = glass_card((ww, wh), radius, tint, wallpaper, pos, frost, blur=36, border=border)
    d = ImageDraw.Draw(card)
    ink = (255, 255, 255, 255)
    mute = (168, 184, 204, 255)
    cx, cy, R = 22, 16, 220
    colors = [(34, 211, 238, 255), (251, 146, 60, 255), (192, 132, 252, 255)]
    pcts = [P_WATER, P_FOOD, P_STEPS]
    widths = [20, 17, 15]
    for i, (col, pct, wd) in enumerate(zip(colors, pcts, widths)):
        inset = 6 + i * 30
        box = (cx + inset, cy + inset, cx + R - inset, cy + R - inset)
        ring = neon_ring((ww, wh), box, pct, col, wd, track=(col[0], col[1], col[2], 42))
        card.alpha_composite(ring, (0, 0))
    mid = f"{int(P_DAY * 100)}%"

    def ctr_txt(txt, fy, fnt, col):
        tw, _ = text_w(d, txt, fnt)
        d.text((cx + (R - tw) / 2, fy), txt, font=fnt, fill=col)

    ctr_txt(f"FitFlow · {mid}", cy + 88, font(14), ink)
    ctr_txt("дня", cy + 112, font(13), mute)

    rows = [
        (icon_drop(24, (34, 211, 238, 255)), "Вода", f"{fmt(WATER)} / {fmt(WATER_G)} мл", colors[0]),
        (icon_bowl(24, (251, 146, 60, 255)), "Питание", f"{fmt(FOOD)} / {fmt(FOOD_G)} ккал", colors[1]),
        (icon_sneaker(24, (192, 132, 252, 255)), "Шаги", f"{fmt(STEPS)} / {fmt(STEPS_G)}", colors[2]),
    ]
    rx = cx + R + 18
    ry = 32
    for ico, lab, val, col in rows:
        ImageDraw.Draw(card).ellipse((rx, ry + 10, rx + 8, ry + 18), fill=col)
        card.alpha_composite(ico, (rx + 16, ry + 2))
        d.text((rx + 46, ry + 2), f"{lab}:  {val}", font=font(18), fill=ink)
        ry += 50

    vit = f"Витамины:  принято {VIT_TAKEN} из {VIT_TOTAL}   след. {VIT_NEXT}"
    d.text((28, 242), vit, font=font(14), fill=mute)

    # outline-пилюли
    pw, ph = 292, 48
    gap = 12
    total = pw * 3 + gap * 2
    x0 = (ww - total) // 2
    y0 = wh - ph - 22
    pills = [
        ((34, 211, 238, 255), "+250 мл", icon_bottle(18, (34, 211, 238, 255))),
        ((251, 146, 60, 255), "Еда", icon_bowl(18, (251, 146, 60, 255))),
        ((52, 211, 153, 255), "Витамины", icon_check(18, (52, 211, 153, 255))),
    ]
    for i, (col, lab, ico) in enumerate(pills):
        pill = pill_outline((pw, ph), col, lab, icon=ico, fnt=font(16))
        card.alpha_composite(pill, (x0 + i * (pw + gap), y0))
    return card


def badge(im, text="FitFlow · макет п.5 · не APK"):
    d = ImageDraw.Draw(im)
    fnt = font(13)
    tw, th = text_w(d, text, fnt)
    pad = 8
    x, y = 16, 14
    d.rounded_rectangle((x, y, x + tw + pad * 2, y + th + pad), radius=10, fill=(8, 10, 16, 200))
    d.text((x + pad, y + pad // 2), text, font=fnt, fill=(255, 255, 255, 230))


def caption(im, text, y=None):
    d = ImageDraw.Draw(im)
    fnt = font(16)
    tw, th = text_w(d, text, fnt)
    W, H = im.size
    yy = H - 36 if y is None else y
    d.rounded_rectangle(((W - tw) / 2 - 12, yy - 6, (W + tw) / 2 + 12, yy + th + 6), radius=10, fill=(8, 10, 16, 170))
    d.text(((W - tw) / 2, yy), text, font=fnt, fill=(255, 255, 255, 230))


def place_widget(bg, card, xy, radius=36):
    x, y = xy
    sh, pad = drop_shadow(card.size, radius)
    bg.alpha_composite(sh, (x - pad, y - pad))
    bg.alpha_composite(card, (x, y))


def scene(kind, frost=True, caption_text=None, show_badge=True):
    W, H = 1280, 800
    wp_kind = {"light": "dawn", "bento": "night-warm", "rings": "night"}[kind]
    bg = load_wallpaper(wp_kind, (W, H))
    ww = int(1000 * s / 2)
    wh = int(430 * s / 2)
    x = (W - ww) // 2
    # светлый — ниже, на горы: так frost/honest читаются
    y = 168 if kind == "light" else 150
    pos = (x, y)
    if kind == "light":
        card = widget_light(frost, bg, pos)
        place_widget(bg, card, pos)
    elif kind == "bento":
        card = widget_bento(frost, bg, pos)
        place_widget(bg, card, pos)
    else:
        card = widget_rings(frost, bg, pos)
        place_widget(bg, card, pos)
    if show_badge:
        badge(bg)
    if caption_text:
        caption(bg, caption_text)
    return bg.convert("RGB")


def scene_honest_board():
    W, H = 1280, 1600
    im = Image.new("RGB", (W, H), (12, 14, 20))
    d = ImageDraw.Draw(im)
    d.text((40, 28), "Честный вид RemoteViews — без blur обоев", font=font(26), fill=(255, 255, 255))
    d.text((40, 66), "Полупрозрачная карточка. Обои под ней резкие. Капля, волна, glow — Canvas.", font=font(16), fill=(180, 188, 200))
    kinds = [("light", "Капля"), ("bento", "Бенто"), ("rings", "Кольца")]
    y = 110
    for kind, title in kinds:
        shot = scene(kind, frost=False, caption_text=None, show_badge=False)
        shot = shot.resize((1200, 750), Image.Resampling.LANCZOS)
        # crop widget band
        band = shot.crop((0, 40, 1200, 700))
        band = band.resize((1200, 460), Image.Resampling.LANCZOS)
        im.paste(band, (40, y))
        d = ImageDraw.Draw(im)
        d.text((52, y + 12), title, font=font(14), fill=(255, 255, 255, 230))
        y += 480
    return im


def scene_ceiling():
    """A/B: лаунчерный blur vs честный RemoteViews. Один виджет, живые обои."""
    W, H = 1280, 1680
    im = Image.new("RGB", (W, H), (10, 12, 18))
    d = ImageDraw.Draw(im)
    d.text((40, 24), "Потолок виджета FitFlow  (макет, не APK)", font=font(26), fill=(255, 255, 255))

    a = scene("light", frost=True, caption_text=None, show_badge=False)
    b = scene("light", frost=False, caption_text=None, show_badge=False)
    a = a.resize((1200, 750), Image.Resampling.LANCZOS)
    b = b.resize((1200, 750), Image.Resampling.LANCZOS)
    d.text((40, 72), "1. Лаунчер блюрит обои (Samsung One UI и подобные). Это не API приложения.", font=font(16), fill=(186, 220, 210))
    im.paste(a.crop((0, 20, 1200, 720)), (40, 104))
    d = ImageDraw.Draw(im)
    d.text((40, 840), "2. RemoteViews: полупрозрачность без blur. Обои резкие. Так умеем сами.", font=font(16), fill=(210, 196, 170))
    im.paste(b.crop((0, 20, 1200, 720)), (40, 872))
    d = ImageDraw.Draw(im)
    note = "3D нет. Постоянной анимации волны нет. Glow/капля/волна — статичный Canvas. Ripple на нажатии — системный."
    d.text((40, 1610), note, font=font(14), fill=(160, 168, 180))
    return im


def scene_sheet():
    W = 1080
    blocks = [
        ("light", True, "Капля · лаунчерное стекло"),
        ("bento", True, "Бенто · лаунчерное стекло"),
        ("rings", True, "Кольца · лаунчерное стекло"),
        ("light", False, "Капля · честный RemoteViews (обои резкие)"),
    ]
    pieces = []
    for kind, frost, title in blocks:
        shot = scene(kind, frost=frost, caption_text=None, show_badge=False)
        shot = shot.resize((1008, 630), Image.Resampling.LANCZOS)
        band = shot.crop((0, 30, 1008, 600))
        pieces.append((title, band))
    header_h = 110
    H = header_h + sum(36 + band.size[1] + 28 for _, band in pieces) + 48
    im = Image.new("RGB", (W, H), (12, 14, 22))
    d = ImageDraw.Draw(im)
    d.text((36, 28), "FitFlow · три макета виджета", font=font(28), fill=(255, 255, 255))
    d.text((36, 68), "Поля наши. Стекло — лаунчерный blur (верх) или честная полупрозрачность.", font=font(15), fill=(176, 184, 196))
    y = header_h
    for title, band in pieces:
        d = ImageDraw.Draw(im)
        d.text((36, y), title, font=font(16), fill=(210, 220, 230))
        y += 36
        im.paste(band, (36, y))
        y += band.size[1] + 28
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("widget-p5-light.png", lambda: scene("light", True)),
        ("widget-p5-bento.png", lambda: scene("bento", True)),
        ("widget-p5-rings.png", lambda: scene("rings", True)),
        ("widget-p5-honest.png", scene_honest_board),
        ("widget-p5-ceiling.png", scene_ceiling),
        ("widget-p5-sheet.png", scene_sheet),
    ]
    for name, fn in jobs:
        im = fn()
        path = OUT / name
        im.save(path, "PNG", optimize=True)
        print(f"wrote {path.relative_to(ROOT)} {im.size}")


if __name__ == "__main__":
    main()
