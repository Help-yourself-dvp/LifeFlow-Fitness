#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Макеты виджетов пункта 5.

Не APK и не RemoteViews: Pillow-картинки, чтобы владелец увидел три
оформления до правок в android-native. Цифры и поля — наши
(вода / питание / шаги / активность / самочувствие / витамины).
Сон и burned kcal с референсов Midjourney не рисуем.

Запуск из корня репозитория:

    python3 tools/widget-preview-p5.py
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "design"
FONT_MANROPE = ROOT / "assets" / "fonts" / "manrope.ttf"
FONT_DV = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT_DVB = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")

# Одни цифры на все три макета. Питание — съедено/цель, не remaining.
WATER = 1750
WATER_GOAL = 2500
FOOD = 1450
FOOD_GOAL = 2000
STEPS = 8420
STEPS_GOAL = 10000
ACT = 45
ACT_GOAL = 60
MOOD_N = 4
MOOD_WORD = "хороший"
VIT_LINE = "Витамины: принято 1 из 2 · след. 21:00"


def pct(n: int, d: int) -> int:
    if d <= 0:
        return 0
    return max(0, min(100, int(round(100.0 * n / d))))


P_WATER = pct(WATER, WATER_GOAL)
P_FOOD = pct(FOOD, FOOD_GOAL)
P_STEPS = pct(STEPS, STEPS_GOAL)
P_ACT = pct(ACT, ACT_GOAL)
P_DAY = int(round((P_WATER + P_FOOD + P_STEPS) / 3.0))


def ru_int(n: int) -> str:
    """Разрядность обычным пробелом: в Manrope нет U+202F, он рисует тофу."""
    s = str(int(n))
    parts = []
    while s:
        parts.append(s[-3:])
        s = s[:-3]
    return " ".join(reversed(parts))


_FONT_CACHE: dict[tuple[int], ImageFont.FreeTypeFont] = {}


def font(size: int) -> ImageFont.FreeTypeFont:
    size = max(10, int(round(size)))
    key = (size,)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    path = FONT_MANROPE if FONT_MANROPE.is_file() else FONT_DV
    try:
        f = ImageFont.truetype(str(path), size)
    except OSError:
        f = ImageFont.load_default()
    _FONT_CACHE[key] = f
    return f


def fs(min_side: float, frac: float, lo: int = 11, hi: int = 96) -> ImageFont.FreeTypeFont:
    return font(max(lo, min(hi, int(min_side * frac))))


def text_w(fnt: ImageFont.ImageFont, s: str) -> float:
    return float(fnt.getlength(s))


def draw_text(d, xy, s, fnt, fill, anchor="lt"):
    d.text(xy, s, font=fnt, fill=fill, anchor=anchor)


def draw_text_strong(d, xy, s, fnt, fill, anchor="lt"):
    x, y = xy
    d.text((x + 0.7, y), s, font=fnt, fill=fill, anchor=anchor)
    d.text((x, y), s, font=fnt, fill=fill, anchor=anchor)


def rounded_mask(w: int, h: int, r: int) -> Image.Image:
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=max(1, r), fill=255)
    return m


def apply_round(im: Image.Image, r: int) -> Image.Image:
    im = im.convert("RGBA")
    mask = rounded_mask(im.width, im.height, r)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0))
    out.putalpha(ImageChops.multiply(out.split()[-1], mask))
    return out


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c0, c1, t: float):
    return tuple(int(lerp(c0[i], c1[i], t)) for i in range(3))


def vgrad(size, c0, c1) -> Image.Image:
    w, h = size
    im = Image.new("RGB", (w, h))
    px = im.load()
    for y in range(h):
        c = lerp_rgb(c0, c1, y / max(1, h - 1))
        for x in range(w):
            px[x, y] = c
    return im


def hgrad(size, c0, c1) -> Image.Image:
    w, h = size
    im = Image.new("RGB", (w, h))
    px = im.load()
    for x in range(w):
        c = lerp_rgb(c0, c1, x / max(1, w - 1))
        for y in range(h):
            px[x, y] = c
    return im


def soft_orb(canvas: Image.Image, cx: float, cy: float, r: float, color, blur: int) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    if blur > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(layer)


def wallpaper_dawn(w: int, h: int) -> Image.Image:
    im = vgrad((w, h), (255, 214, 176), (232, 168, 176)).convert("RGBA")
    d = ImageDraw.Draw(im)
    sx, sy, sr = int(w * 0.78), int(h * 0.22), int(min(w, h) * 0.11)
    soft_orb(im, sx, sy, sr * 2.4, (255, 236, 190, 90), max(8, sr // 3))
    d.ellipse((sx - sr, sy - sr, sx + sr, sy + sr), fill=(255, 236, 196, 255))
    d.polygon(
        [
            (0, h),
            (0, int(h * 0.70)),
            (int(w * 0.18), int(h * 0.58)),
            (int(w * 0.38), int(h * 0.66)),
            (int(w * 0.55), int(h * 0.52)),
            (int(w * 0.78), int(h * 0.64)),
            (w, int(h * 0.56)),
            (w, h),
        ],
        fill=(214, 140, 132, 210),
    )
    d.polygon(
        [
            (0, h),
            (0, int(h * 0.82)),
            (int(w * 0.22), int(h * 0.70)),
            (int(w * 0.48), int(h * 0.78)),
            (int(w * 0.72), int(h * 0.66)),
            (w, int(h * 0.76)),
            (w, h),
        ],
        fill=(176, 108, 118, 230),
    )
    # жёсткие детали — чтобы было видно blur стекла
    for i, fx in enumerate((0.08, 0.16, 0.24, 0.33)):
        x = int(w * fx)
        top = int(h * (0.34 + 0.04 * (i % 2)))
        d.rectangle((x, top, x + max(3, w // 180), int(h * 0.62)), fill=(190, 90, 80, 90))
        d.ellipse((x - 18, top - 22, x + 22, top + 10), fill=(80, 140, 90, 110))
    return im


def wallpaper_night(w: int, h: int, warm: bool = False) -> Image.Image:
    if warm:
        im = vgrad((w, h), (38, 22, 48), (12, 10, 22)).convert("RGBA")
        orbs = [
            (0.18, 0.22, 0.28, (120, 60, 140, 70)),
            (0.78, 0.18, 0.22, (80, 50, 160, 60)),
            (0.62, 0.78, 0.30, (40, 80, 140, 50)),
            (0.88, 0.62, 0.16, (180, 90, 80, 45)),
        ]
    else:
        im = vgrad((w, h), (18, 28, 48), (8, 12, 22)).convert("RGBA")
        orbs = [
            (0.20, 0.20, 0.26, (40, 90, 140, 70)),
            (0.82, 0.16, 0.20, (60, 40, 140, 55)),
            (0.70, 0.80, 0.28, (20, 120, 140, 50)),
            (0.12, 0.72, 0.18, (30, 70, 120, 40)),
        ]
    for fx, fy, fr, col in orbs:
        soft_orb(im, w * fx, h * fy, min(w, h) * fr, col, int(min(w, h) * fr * 0.45))
    d = ImageDraw.Draw(im)
    # окна-точки с жёсткими краями — blur их смазывает, честное стекло нет
    for i in range(40):
        x = 20 + int((i * 137) % max(1, w - 40))
        y = 20 + int((i * 89) % max(1, h - 40))
        ww = 5 + (i % 3) * 3
        hh = 7 + (i % 2) * 4
        col = (255, 214, 150, 70 + (i * 13) % 90) if warm else (170, 210, 255, 55 + (i * 11) % 80)
        d.rectangle((x, y, x + ww, y + hh), fill=col)
    return im


def glass_card(
    wallpaper: Image.Image | None,
    pos: tuple[int, int],
    size: tuple[int, int],
    radius: int,
    tint,
    frost: bool,
    blur: int = 22,
    border=None,
) -> Image.Image:
    """Стекло.

    frost=True — размытый кусок обоев + тинт (цель, нарисована в превью).
    frost=False — только полупрозрачный rounded rect: так умеет RemoteViews.
    """
    w, h = size
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = rounded_mask(w, h, radius)

    if frost and wallpaper is not None:
        x0, y0 = pos
        pad = blur * 2
        cx0 = max(0, x0 - pad)
        cy0 = max(0, y0 - pad)
        cx1 = min(wallpaper.width, x0 + w + pad)
        cy1 = min(wallpaper.height, y0 + h + pad)
        crop = wallpaper.crop((cx0, cy0, cx1, cy1)).convert("RGB")
        blurred = crop.filter(ImageFilter.GaussianBlur(blur))
        lx, ly = x0 - cx0, y0 - cy0
        piece = blurred.crop((lx, ly, lx + w, ly + h)).convert("RGBA")
        card.paste(piece, (0, 0))
    card.putalpha(mask)

    overlay = Image.new("RGBA", (w, h), tuple(tint))
    overlay.putalpha(ImageChops.multiply(overlay.split()[-1], mask))
    card = Image.alpha_composite(card, overlay)

    hi = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(hi).rectangle((0, 0, w, int(h * 0.22)), fill=(255, 255, 255, 18))
    hi.putalpha(ImageChops.multiply(hi.split()[-1], mask))
    hi = hi.filter(ImageFilter.GaussianBlur(max(4, h // 40)))
    card = Image.alpha_composite(card, hi)

    d = ImageDraw.Draw(card)
    if border is None:
        border = (255, 255, 255, 70)
    d.rounded_rectangle((1, 1, w - 2, h - 2), radius=radius, outline=border, width=max(2, w // 420))
    return card


def drop_mask(w: int, h: int) -> Image.Image:
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.ellipse((int(w * 0.08), int(h * 0.26), int(w * 0.92), int(h * 0.98)), fill=255)
    tip = (w // 2, int(h * 0.02))
    d.polygon([tip, (int(w * 0.12), int(h * 0.52)), (int(w * 0.88), int(h * 0.52))], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(max(2, w // 55)))
    m = m.point(lambda p: 255 if p > 88 else 0)
    m = m.filter(ImageFilter.GaussianBlur(1))
    return m


def draw_drop(card: Image.Image, box, fill_pct: float) -> None:
    x0, y0, x1, y1 = [int(v) for v in box]
    w, h = x1 - x0, y1 - y0
    mask = drop_mask(w, h)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    fat = mask.filter(ImageFilter.MaxFilter(9))
    inner = mask.filter(ImageFilter.MinFilter(7))
    ring = ImageChops.subtract(fat, inner)
    outline = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    outline.paste(Image.new("RGBA", (w, h), (48, 168, 160, 255)), (0, 0), ring)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glow.paste(Image.new("RGBA", (w, h), (90, 210, 200, 70)), (0, 0), fat)
    glow = glow.filter(ImageFilter.GaussianBlur(5))

    water = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(water)
    top = int(h * (0.94 - 0.68 * fill_pct))
    amp = max(4, h // 36)
    pts = [(x, top + int(amp * math.sin(x / max(8.0, w / 14) + 0.5))) for x in range(0, w + 3, 2)]
    pts += [(w, h), (0, h)]
    wd.polygon(pts, fill=(72, 198, 190, 230))
    deep = top + int(h * 0.20)
    dpts = [(x, deep + int(amp * 0.6 * math.sin(x / max(8.0, w / 11) + 1.6))) for x in range(0, w + 3, 2)]
    dpts += [(w, h), (0, h)]
    wd.polygon(dpts, fill=(46, 168, 164, 200))
    crest = []
    for x in range(0, w + 3, 2):
        crest.append((x, top + int(amp * math.sin(x / max(8.0, w / 14) + 0.5))))
    for x in range(w, -1, -2):
        crest.append((x, top + int(amp * math.sin(x / max(8.0, w / 14) + 0.5)) + max(5, h // 40)))
    wd.polygon(crest, fill=(190, 245, 238, 140))
    water.putalpha(ImageChops.multiply(water.split()[-1], mask))

    hi = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(hi).ellipse((int(w * 0.30), int(h * 0.22), int(w * 0.48), int(h * 0.36)), fill=(255, 255, 255, 55))
    hi = hi.filter(ImageFilter.GaussianBlur(3))
    hi.putalpha(ImageChops.multiply(hi.split()[-1], mask))

    layer.alpha_composite(glow)
    layer.alpha_composite(water)
    layer.alpha_composite(outline)
    layer.alpha_composite(hi)
    card.alpha_composite(layer, (x0, y0))


def icon_steps(d, cx, cy, s, color):
    def one(x, y, sc):
        d.ellipse((x - 0.22 * sc, y + 0.08 * sc, x + 0.16 * sc, y + 0.50 * sc), fill=color)
        d.ellipse((x - 0.18 * sc, y - 0.46 * sc, x + 0.20 * sc, y + 0.16 * sc), fill=color)

    one(cx - 0.22 * s, cy + 0.10 * s, s * 0.78)
    one(cx + 0.26 * s, cy - 0.12 * s, s * 0.66)


def icon_food(d, cx, cy, s, color):
    d.arc((cx - 0.55 * s, cy - 0.05 * s, cx + 0.55 * s, cy + 0.80 * s), 12, 168, fill=color, width=max(2, int(s * 0.14)))
    d.line((cx - 0.48 * s, cy + 0.34 * s, cx + 0.48 * s, cy + 0.34 * s), fill=color, width=max(2, int(s * 0.12)))
    for dx in (-0.20, 0.0, 0.20):
        d.arc(
            (cx + dx * s - 0.10 * s, cy - 0.62 * s, cx + dx * s + 0.10 * s, cy + 0.02 * s),
            200,
            340,
            fill=color,
            width=max(2, int(s * 0.09)),
        )


def icon_act(d, cx, cy, s, color):
    d.ellipse((cx - 0.46 * s, cy - 0.28 * s, cx + 0.46 * s, cy + 0.64 * s), outline=color, width=max(2, int(s * 0.13)))
    d.rounded_rectangle((cx - 0.16 * s, cy - 0.56 * s, cx + 0.16 * s, cy - 0.26 * s), radius=s * 0.08, fill=color)
    d.line((cx, cy + 0.18 * s, cx + 0.22 * s, cy - 0.02 * s), fill=color, width=max(2, int(s * 0.11)))
    d.ellipse((cx - 0.07 * s, cy + 0.10 * s, cx + 0.07 * s, cy + 0.24 * s), fill=color)


def icon_mood(d, cx, cy, s, color):
    d.ellipse((cx - 0.50 * s, cy - 0.50 * s, cx + 0.50 * s, cy + 0.50 * s), fill=color)
    eye = (90, 64, 40, 255)
    d.ellipse((cx - 0.22 * s, cy - 0.16 * s, cx - 0.08 * s, cy - 0.02 * s), fill=eye)
    d.ellipse((cx + 0.08 * s, cy - 0.16 * s, cx + 0.22 * s, cy - 0.02 * s), fill=eye)
    d.arc((cx - 0.22 * s, cy - 0.04 * s, cx + 0.22 * s, cy + 0.32 * s), 20, 160, fill=eye, width=max(2, int(s * 0.09)))


def icon_sneaker(d, cx, cy, s, color, sole_col=None):
    if sole_col is None:
        sole_col = color
    sole = [
        (cx - 0.72 * s, cy + 0.16 * s),
        (cx + 0.74 * s, cy + 0.06 * s),
        (cx + 0.72 * s, cy + 0.34 * s),
        (cx - 0.74 * s, cy + 0.40 * s),
    ]
    d.polygon(sole, fill=sole_col)
    upper = [
        (cx - 0.58 * s, cy + 0.16 * s),
        (cx - 0.52 * s, cy - 0.22 * s),
        (cx - 0.18 * s, cy - 0.38 * s),
        (cx + 0.10 * s, cy - 0.12 * s),
        (cx + 0.58 * s, cy + 0.00 * s),
        (cx + 0.62 * s, cy + 0.16 * s),
    ]
    d.polygon(upper, fill=color)
    swoosh = (255, 255, 255, 200)
    d.arc((cx - 0.18 * s, cy - 0.08 * s, cx + 0.52 * s, cy + 0.30 * s), 200, 345, fill=swoosh, width=max(2, int(s * 0.08)))
    for i, dx in enumerate((-0.28, -0.14, 0.00)):
        d.line(
            (cx + dx * s, cy - 0.18 * s + i * 0.02 * s, cx + dx * s + 0.10 * s, cy - 0.04 * s),
            fill=(255, 255, 255, 160),
            width=max(2, int(s * 0.05)),
        )


def icon_plus(d, cx, cy, r, bg, fg):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=bg)
    t = max(2, int(r * 0.16))
    arm = r * 0.42
    d.rounded_rectangle((cx - arm, cy - t, cx + arm, cy + t), radius=t, fill=fg)
    d.rounded_rectangle((cx - t, cy - arm, cx + t, cy + arm), radius=t, fill=fg)


def pill(d, box, fill, text, text_fill, fnt):
    x0, y0, x1, y1 = box
    d.rounded_rectangle(box, radius=(y1 - y0) / 2, fill=fill)
    d.text(((x0 + x1) / 2, (y0 + y1) / 2), text, font=fnt, fill=text_fill, anchor="mm")


def widget_light(size, wallpaper=None, pos=(0, 0), frost=True) -> Image.Image:
    w, h = size
    m = min(w, h)
    pill_h = int(h * 0.12)
    gap = int(h * 0.035)
    card_h = h - pill_h - gap
    radius = int(m * 0.09)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    card = glass_card(
        wallpaper,
        (pos[0], pos[1]),
        (w, card_h),
        radius,
        (255, 250, 246, 205 if frost else 175),
        frost,
        blur=26,
        border=(255, 255, 255, 120),
    )
    drop_box = (int(w * 0.045), int(card_h * 0.08), int(w * 0.37), int(card_h * 0.92))
    draw_drop(card, drop_box, P_WATER / 100.0)
    d = ImageDraw.Draw(card)
    dxc = (drop_box[0] + drop_box[2]) / 2
    top = drop_box[1]
    bot = drop_box[3]
    draw_text(d, (dxc, top + (bot - top) * 0.16), "Вода", fs(m, 0.045), (36, 100, 102), "mm")
    draw_text_strong(d, (dxc, top + (bot - top) * 0.52), ru_int(WATER), fs(m, 0.095), (16, 64, 66), "mm")
    draw_text(d, (dxc, top + (bot - top) * 0.66), "мл", fs(m, 0.040), (30, 90, 92), "mm")
    draw_text(d, (dxc, top + (bot - top) * 0.78), f"из {ru_int(WATER_GOAL)} мл", fs(m, 0.036), (40, 100, 102), "mm")
    draw_text_strong(d, (dxc, top + (bot - top) * 0.90), f"{P_WATER}%", fs(m, 0.042), (20, 88, 90), "mm")

    gx0, gy0 = int(w * 0.40), int(card_h * 0.09)
    gx1, gy1 = int(w * 0.955), int(card_h * 0.91)
    gap_t = max(10, int(m * 0.025))
    tw = (gx1 - gx0 - gap_t) // 2
    th = (gy1 - gy0 - gap_t) // 2
    cells = [
        ((gx0, gy0), (196, 228, 224), (40, 140, 132), icon_steps, "Шаги", ru_int(STEPS), f"из {ru_int(STEPS_GOAL)}"),
        ((gx0 + tw + gap_t, gy0), (244, 214, 196), (190, 108, 70), icon_food, "Питание", ru_int(FOOD), "ккал съедено"),
        ((gx0, gy0 + th + gap_t), (206, 226, 200), (70, 130, 80), icon_act, "Активность", f"{ACT} мин", f"из {ACT_GOAL} мин"),
        ((gx0 + tw + gap_t, gy0 + th + gap_t), (244, 226, 176), (220, 170, 50), icon_mood, "Самочувствие", MOOD_WORD, f"{MOOD_N} из 5"),
    ]
    f_lab = fs(m, 0.032)
    f_val = fs(m, 0.055)
    f_sub = fs(m, 0.028)
    for (x, y), bg, icc, ic, lab, val, sub in cells:
        d.rounded_rectangle((x, y, x + tw, y + th), radius=max(14, int(m * 0.035)), fill=bg)
        ic(d, x + tw - int(m * 0.055), y + int(m * 0.055), int(m * 0.042), icc)
        pad = int(m * 0.035)
        draw_text(d, (x + pad, y + th * 0.22), lab, f_lab, (90, 100, 110), "lm")
        draw_text_strong(d, (x + pad, y + th * 0.52), val, f_val, (28, 34, 42), "lm")
        draw_text(d, (x + pad, y + th * 0.78), sub, f_sub, (110, 118, 126), "lm")

    out.alpha_composite(card, (0, 0))
    pd = ImageDraw.Draw(out)
    pw = int(w * 0.30)
    px0 = (w - pw) // 2
    py0 = card_h + gap
    pill(pd, (px0, py0, px0 + pw, py0 + pill_h), (72, 198, 188, 245), "+250 мл", (255, 255, 255, 255), fs(m, 0.048))
    return out


def wave_band(w: int, h: int, fill_pct: float) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    base = int(h * (1.0 - 0.82 * fill_pct))
    amp = max(5, h // 16)
    pts = []
    for x in range(0, w + 4, 3):
        y = base + int(amp * math.sin(x / max(10.0, w / 16) + 0.3)) + int(amp * 0.35 * math.sin(x / max(6.0, w / 28) + 1.2))
        pts.append((x, y))
    pts += [(w, h), (0, h)]
    d.polygon(pts, fill=(34, 200, 210, 205))
    deep = base + int(h * 0.32)
    dpts = [(x, deep + int(amp * 0.5 * math.sin(x / max(10.0, w / 14) + 2.0))) for x in range(0, w + 4, 3)]
    dpts += [(w, h), (0, h)]
    d.polygon(dpts, fill=(20, 140, 170, 185))
    foam = []
    for x in range(0, w + 4, 3):
        y = base + int(amp * math.sin(x / max(10.0, w / 16) + 0.3))
        foam.append((x, y))
    for x in range(w, -1, -3):
        y = base + int(amp * math.sin(x / max(10.0, w / 16) + 0.3)) + max(5, h // 18)
        foam.append((x, y))
    d.polygon(foam, fill=(180, 250, 255, 120))
    return im


def widget_bento(size, wallpaper=None, pos=(0, 0), frost=True) -> Image.Image:
    w, h = size
    m = min(w, h)
    radius = int(m * 0.09)
    card = glass_card(
        wallpaper,
        pos,
        (w, h),
        radius,
        (24, 18, 40, 216 if frost else 192),
        frost,
        blur=24,
        border=(255, 255, 255, 40),
    )
    d = ImageDraw.Draw(card)

    cx, cy = int(w * 0.23), int(h * 0.48)
    R = int(m * 0.30)
    track_w = max(12, int(R * 0.20))
    d.ellipse((cx - R, cy - R, cx + R, cy + R), outline=(50, 42, 78, 255), width=track_w)
    start, end = -90, -90 + int(360 * P_STEPS / 100.0)
    bbox = (cx - R, cy - R, cx + R, cy + R)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).arc(bbox, start, end, fill=(176, 148, 255, 150), width=track_w + 10)
    card.alpha_composite(glow.filter(ImageFilter.GaussianBlur(7)))
    d = ImageDraw.Draw(card)
    d.arc(bbox, start, end, fill=(176, 148, 255, 255), width=track_w)
    icon_sneaker(d, cx, cy - int(m * 0.04), int(R * 0.42), (214, 204, 255, 255), (150, 136, 210, 255))
    draw_text_strong(d, (cx, cy + int(R * 0.28)), ru_int(STEPS), fs(m, 0.085), (245, 242, 255), "mm")
    draw_text(d, (cx, cy + int(R * 0.48)), f"{P_STEPS}%", fs(m, 0.040), (176, 148, 255), "mm")
    draw_text(d, (int(w * 0.055), int(h * 0.075)), "Шаги", fs(m, 0.038), (170, 160, 200), "lt")
    draw_text(d, (cx, int(h * 0.92)), f"цель {ru_int(STEPS_GOAL)}", fs(m, 0.032), (150, 142, 180), "mm")

    rx0, rx1 = int(w * 0.46), int(w * 0.955)
    wy0, wy1 = int(h * 0.08), int(h * 0.52)
    d.rounded_rectangle((rx0, wy0, rx1, wy1), radius=max(16, int(m * 0.04)), fill=(28, 24, 50, 200))
    # текст сверху, волна снизу — не пересекаются
    split = wy0 + int((wy1 - wy0) * 0.46)
    inner = (rx0 + 8, split, rx1 - 8, wy1 - 8)
    wave = apply_round(wave_band(inner[2] - inner[0], inner[3] - inner[1], P_WATER / 100.0), 12)
    card.alpha_composite(wave, (inner[0], inner[1]))
    d = ImageDraw.Draw(card)
    draw_text(d, (rx0 + int(m * 0.04), wy0 + int(m * 0.055)), "Вода", fs(m, 0.034), (140, 200, 210), "lm")
    draw_text_strong(
        d,
        (rx0 + int(m * 0.04), wy0 + int(m * 0.13)),
        f"{ru_int(WATER)} мл",
        fs(m, 0.062),
        (235, 250, 255),
        "lm",
    )
    draw_text(
        d,
        (rx0 + int(m * 0.04), wy0 + int(m * 0.20)),
        f"из {ru_int(WATER_GOAL)} мл",
        fs(m, 0.032),
        (150, 190, 200),
        "lm",
    )
    icon_plus(d, rx1 - int(m * 0.07), wy0 + int(m * 0.08), int(m * 0.042), (34, 211, 238, 235), (12, 30, 40, 255))
    draw_text(d, (rx1 - int(m * 0.035), wy1 - int(m * 0.035)), "+250 мл", fs(m, 0.028), (190, 245, 250), "rb")

    fy0, fy1 = int(h * 0.56), int(h * 0.92)
    d.rounded_rectangle((rx0, fy0, rx1, fy1), radius=max(16, int(m * 0.04)), fill=(38, 26, 42, 200))
    draw_text(d, (rx0 + int(m * 0.04), fy0 + int(m * 0.055)), "Питание", fs(m, 0.034), (230, 180, 140), "lm")
    draw_text_strong(
        d,
        (rx0 + int(m * 0.04), fy0 + int(m * 0.145)),
        f"{ru_int(FOOD)} ккал",
        fs(m, 0.056),
        (255, 240, 230),
        "lm",
    )
    draw_text_strong(d, (rx1 - int(m * 0.04), fy0 + int(m * 0.145)), f"{P_FOOD}%", fs(m, 0.048), (251, 160, 80), "rm")
    bx0, by0 = rx0 + int(m * 0.04), fy1 - int(m * 0.11)
    bx1, by1 = rx1 - int(m * 0.04), fy1 - int(m * 0.075)
    d.rounded_rectangle((bx0, by0, bx1, by1), radius=7, fill=(60, 40, 48, 255))
    fill_w = int((bx1 - bx0) * P_FOOD / 100.0)
    if fill_w > 10:
        d.rounded_rectangle((bx0, by0, bx0 + fill_w, by1), radius=7, fill=(251, 146, 60, 255))
    draw_text(
        d,
        (bx0, fy1 - int(m * 0.038)),
        f"съедено · цель {ru_int(FOOD_GOAL)}",
        fs(m, 0.028),
        (170, 150, 150),
        "lm",
    )
    return card


def glow_arc(size, bbox, start, end, color, width, blur):
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(im).arc(bbox, start, end, fill=color, width=width)
    return im.filter(ImageFilter.GaussianBlur(blur)) if blur else im


def widget_rings(size, wallpaper=None, pos=(0, 0), frost=True) -> Image.Image:
    w, h = size
    m = min(w, h)
    radius = int(m * 0.09)
    card = glass_card(
        wallpaper,
        pos,
        (w, h),
        radius,
        (10, 16, 28, 220 if frost else 196),
        frost,
        blur=24,
        border=(120, 200, 220, 50),
    )
    d = ImageDraw.Draw(card)

    cx, cy = int(w * 0.28), int(h * 0.40)
    R = int(m * 0.28)
    rings = [
        (R, (34, 211, 238), P_WATER),
        (int(R * 0.70), (251, 146, 60), P_FOOD),
        (int(R * 0.40), (192, 132, 252), P_STEPS),
    ]
    tw = max(10, int(R * 0.13))
    for rr, col, p in rings:
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(28, 40, 58, 255), width=tw)
    for rr, col, p in rings:
        start, end = -90, -90 + int(360 * p / 100.0)
        bbox = (cx - rr, cy - rr, cx + rr, cy + rr)
        card.alpha_composite(glow_arc((w, h), bbox, start, end, col + (140,), tw + 10, 7))
        d = ImageDraw.Draw(card)
        d.arc(bbox, start, end, fill=col + (255,), width=tw)

    draw_text_strong(d, (cx, cy - int(m * 0.018)), "FitFlow", fs(m, 0.048), (230, 240, 250), "mm")
    draw_text(d, (cx, cy + int(m * 0.038)), f"{P_DAY}% дня", fs(m, 0.032), (150, 185, 205), "mm")

    lx = int(w * 0.54)
    ly0 = int(h * 0.12)
    row_h = int(h * 0.145)
    rows = [
        ((34, 211, 238), "Вода", f"{ru_int(WATER)} мл", f"{P_WATER}%"),
        ((251, 146, 60), "Питание", f"{ru_int(FOOD)} ккал", f"{P_FOOD}%"),
        ((192, 132, 252), "Шаги", ru_int(STEPS), f"{P_STEPS}%"),
    ]
    for i, (col, name, val, pr) in enumerate(rows):
        y = ly0 + i * row_h
        d.ellipse((lx, y + int(m * 0.012), lx + int(m * 0.028), y + int(m * 0.040)), fill=col + (255,))
        draw_text(d, (lx + int(m * 0.045), y), name, fs(m, 0.030), (160, 175, 190), "lt")
        draw_text_strong(d, (lx + int(m * 0.045), y + int(m * 0.048)), val, fs(m, 0.044), (240, 245, 250), "lt")
        draw_text_strong(d, (int(w * 0.945), y + int(m * 0.048)), pr, fs(m, 0.038), col + (255,), "rt")

    # витамины — отдельная строка над кнопками, не на кольцах
    draw_text(d, (int(w * 0.05), int(h * 0.72)), VIT_LINE, fs(m, 0.030), (150, 168, 184), "lt")

    bw = int(w * 0.28)
    gapb = int(w * 0.025)
    total = 3 * bw + 2 * gapb
    bx0 = (w - total) // 2
    by0, by1 = int(h * 0.80), int(h * 0.93)
    pills = [
        ((34, 211, 238, 235), (8, 24, 32, 255), "+250 мл"),
        ((251, 146, 60, 235), (40, 20, 8, 255), "Еда"),
        ((192, 132, 252, 235), (28, 16, 40, 255), "Витамины"),
    ]
    fnt = fs(m, 0.036)
    for i, (bg, fg, lab) in enumerate(pills):
        x = bx0 + i * (bw + gapb)
        pill(d, (x, by0, x + bw, by1), bg, lab, fg, fnt)
    return card


def stamp(im: Image.Image, text: str) -> Image.Image:
    d = ImageDraw.Draw(im)
    f = font(max(14, im.width // 70))
    pad = 10
    tw = text_w(f, text)
    d.rounded_rectangle((pad, pad, pad + tw + 16, pad + 26), radius=10, fill=(0, 0, 0, 110))
    d.text((pad + 8, pad + 13), text, font=f, fill=(255, 255, 255, 220), anchor="lm")
    return im


def scene(kind: str, frost: bool, size=(1280, 800)) -> Image.Image:
    scale = 2
    W, H = size[0] * scale, size[1] * scale
    if kind == "light":
        wp = wallpaper_dawn(W, H)
        ww, wh = int(W * 0.80), int(H * 0.60)
        draw = widget_light
    elif kind == "bento":
        wp = wallpaper_night(W, H, warm=True)
        ww, wh = int(W * 0.80), int(H * 0.58)
        draw = widget_bento
    else:
        wp = wallpaper_night(W, H, warm=False)
        ww, wh = int(W * 0.82), int(H * 0.58)
        draw = widget_rings
    x = (W - ww) // 2
    y = (H - wh) // 2
    card = draw((ww, wh), wallpaper=wp, pos=(x, y), frost=frost)
    wp.alpha_composite(card, (x, y))
    return wp.resize(size, Image.Resampling.LANCZOS)


def wrap(text: str, fnt, max_w: float) -> list[str]:
    words = text.split()
    lines, cur = [], ""
    for word in words:
        t = (cur + " " + word).strip()
        if text_w(fnt, t) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_paragraph(d, xy, text, fnt, fill, max_w, leading=1.38):
    x, y = xy
    lines = wrap(text, fnt, max_w)
    ascent = fnt.size
    for i, line in enumerate(lines):
        d.text((x, y + i * ascent * leading), line, font=fnt, fill=fill)
    return len(lines) * ascent * leading


def make_sheet() -> Image.Image:
    W = 1080
    light_f = scene("light", True, (1000, 620))
    bento_f = scene("bento", True, (1000, 620))
    rings_f = scene("rings", True, (1000, 620))
    light_h = scene("light", False, (480, 300))
    bento_h = scene("bento", False, (480, 300))
    rings_h = scene("rings", False, (480, 300))
    light_ft = scene("light", True, (480, 300))
    bento_ft = scene("bento", True, (480, 300))
    rings_ft = scene("rings", True, (480, 300))

    H = 3720
    sheet = Image.new("RGB", (W, H), (18, 20, 26))
    sheet.paste(hgrad((W, 8), (34, 211, 238), (192, 132, 252)), (0, 0))
    canvas = sheet.convert("RGBA")
    d = ImageDraw.Draw(canvas)

    x, y = 40, 36
    draw_text_strong(d, (x, y), "FitFlow · пункт 5 · три оформления", font(34), (240, 244, 250))
    y += 48
    y += draw_paragraph(
        d,
        (x, y),
        "Макет, не APK. Одни цифры на всех трёх. Поля наши: вода, питание (съедено / цель), "
        "шаги, активность, самочувствие, витамины. Сон и «сожжённые ккал» с картинок Midjourney не переносим.",
        font(20),
        (170, 178, 190),
        W - 80,
    )
    y += 18

    sections = [
        ("1 · Капля", "Светлая карточка. Капля — вода. Плитки: шаги, питание, активность, самочувствие. Пилюля +250 мл.", light_f),
        ("2 · Бенто", "Тёмная сетка. Кольцо шагов, волна воды с «+», полоска питания (съедено, не remaining).", bento_f),
        ("3 · Кольца", "Три неоновых кольца — вода / питание / шаги. Кнопки +250 мл, Еда, Витамины.", rings_f),
    ]
    for title, cap, img in sections:
        draw_text_strong(d, (x, y), title, font(26), (230, 236, 244))
        y += 34
        y += draw_paragraph(d, (x, y), cap, font(18), (150, 158, 170), W - 80)
        y += 10
        frame = apply_round(img, 18)
        canvas.alpha_composite(frame, ((W - frame.width) // 2, int(y)))
        y += frame.height + 28

    draw_text_strong(d, (x, y), "Стекло: как хочется и как умеет виджет", font(26), (230, 236, 244))
    y += 36
    y += draw_paragraph(
        d,
        (x, y),
        "Слева размытие обоев нарисовано в превью. Справа — честный вид: полупрозрачный "
        "скруглённый прямоугольник без blur. Живой RemoteViews обои не семплирует, "
        "постоянной анимации нет. Glow, волна и капля на устройстве — Canvas Path + BlurMaskFilter.",
        font(18),
        (150, 158, 170),
        W - 80,
    )
    y += 16

    pairs = [
        ("Капля · цель", light_ft, "Капля · честно", light_h),
        ("Бенто · цель", bento_ft, "Бенто · честно", bento_h),
        ("Кольца · цель", rings_ft, "Кольца · честно", rings_h),
    ]
    col_w, gap = 480, 40
    left = (W - (col_w * 2 + gap)) // 2
    for lcap, limg, rcap, rimg in pairs:
        draw_text(d, (left, y), lcap, font(16), (120, 200, 190))
        draw_text(d, (left + col_w + gap, y), rcap, font(16), (200, 170, 130))
        y += 24
        canvas.alpha_composite(apply_round(limg, 14), (left, int(y)))
        canvas.alpha_composite(apply_round(rimg, 14), (left + col_w + gap, int(y)))
        y += 320

    y += draw_paragraph(
        d,
        (x, y),
        f"Цифры макета: вода {ru_int(WATER)}/{ru_int(WATER_GOAL)} мл ({P_WATER}%), "
        f"питание {ru_int(FOOD)}/{ru_int(FOOD_GOAL)} ккал съедено ({P_FOOD}%), "
        f"шаги {ru_int(STEPS)}/{ru_int(STEPS_GOAL)} ({P_STEPS}%), "
        f"активность {ACT}/{ACT_GOAL} мин ({P_ACT}%), самочувствие {MOOD_WORD} {MOOD_N}/5. "
        f"{VIT_LINE}. Кнопки: +250 мл = ADD_WATER_250, Еда = smart_entry, Витамины = ACTION_COURSE_DOSE. "
        "Кнопки «Обновить» на макетах нет. Если оформления примут — текущие Ring / Rings / Dial / Tiles "
        "из приложения уберём.",
        font(17),
        (140, 148, 160),
        W - 80,
    )
    return canvas.crop((0, 0, W, min(H, int(y + 40)))).convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    light = stamp(scene("light", True), "FitFlow · макет п.5 · не APK")
    bento = stamp(scene("bento", True), "FitFlow · макет п.5 · не APK")
    rings = stamp(scene("rings", True), "FitFlow · макет п.5 · не APK")

    honest = Image.new("RGB", (1280, 900), (16, 18, 24))
    hc = honest.convert("RGBA")
    hd = ImageDraw.Draw(hc)
    draw_text_strong(hd, (40, 24), "Честный вид RemoteViews — без blur обоев", font(28), (230, 236, 244))
    draw_text(
        hd,
        (40, 62),
        "Полупрозрачное стекло, обои под карточкой резкие. Так виджет умеет сейчас.",
        font(18),
        (150, 158, 170),
    )
    for i, kind in enumerate(("light", "bento", "rings")):
        hc.alpha_composite(apply_round(scene(kind, False, (380, 240)), 14), (40 + i * 410, 100))
    hc.alpha_composite(apply_round(scene("bento", False, (1200, 500)), 16), (40, 370))
    honest = hc.convert("RGB")

    sheet = make_sheet()
    files = {
        "widget-p5-light.png": light,
        "widget-p5-bento.png": bento,
        "widget-p5-rings.png": rings,
        "widget-p5-honest.png": honest,
        "widget-p5-sheet.png": sheet,
    }
    for name, im in files.items():
        path = OUT / name
        im.save(path, "PNG", optimize=True)
        print(f"wrote {path.relative_to(ROOT)}  {im.size[0]}×{im.size[1]}")


if __name__ == "__main__":
    main()
