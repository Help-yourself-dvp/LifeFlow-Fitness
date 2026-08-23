#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
0.9.6 — предпросмотр оформлений виджета (пункт 5 владельца).

Скрипт повторяет композицию, которую рисует Android-код
(android-native/FitFlowWidget*Provider.java), чтобы посмотреть варианты
рядом ДО сборки APK. Это макет: шрифты и сглаживание на телефоне свои,
поэтому мелкие отличия в толщине букв — норма. Пропорции, состав и цвета
соответствуют коду.

Запуск:  python3 tools/widget-preview.py
Результат: design/widget-variants.png
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

SCALE = 3          # плотность экрана (примерно xxhdpi)
COLOR_WATER = (0, 160, 166)
COLOR_FOOD = (255, 158, 61)
COLOR_STEPS = (91, 141, 239)
COLOR_ACTIVITY = (99, 195, 135)
COLOR_TRACK = (215, 231, 230)
COLOR_TEXT = (0, 32, 33)
COLOR_MUTED = (74, 99, 99)
BG = (232, 245, 244)
BORDER = (122, 166, 166)

# Одни и те же показатели во всех вариантах — иначе сравнение бессмысленно.
DATA = dict(water=1500, water_goal=2500, food=1450, food_goal=2000,
            steps=6200, steps_goal=8000, activity=25, activity_goal=21)


def pct(v, g):
    return max(0, min(100, round(v * 100 / g))) if g else 0


P = dict(water=pct(DATA['water'], DATA['water_goal']),
         food=pct(DATA['food'], DATA['food_goal']),
         steps=pct(DATA['steps'], DATA['steps_goal']),
         activity=pct(DATA['activity'], DATA['activity_goal']))

VALUES = ["%d/%d мл" % (DATA['water'], DATA['water_goal']),
          "%d/%d ккал" % (DATA['food'], DATA['food_goal']),
          "%d/%d" % (DATA['steps'], DATA['steps_goal']),
          "%d/%d мин" % (DATA['activity'], DATA['activity_goal'])]
LABELS = ["Вода", "Питание", "Шаги", "Актив."]
COLORS = [COLOR_WATER, COLOR_FOOD, COLOR_STEPS, COLOR_ACTIVITY]
PCTS = [P['water'], P['food'], P['steps'], P['activity']]


def font(size, bold=False):
    # DejaVu идёт первым: у него есть отдельное жирное начертание и полная
    # кириллица — на макете видно ту же иерархию, что даёт sans-serif-medium.
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "assets/fonts/manrope.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            try:
                return ImageFont.truetype(c, int(size))
            except Exception:
                pass
    return ImageFont.load_default()


def card_bg(d, w, h):
    d.rounded_rectangle([1, 1, w - 2, h - 2], radius=20 * SCALE, fill=BG, outline=BORDER, width=SCALE)


def ring(d, cx, cy, r, width, percent, color):
    box = [cx - r, cy - r, cx + r, cy + r]
    d.arc(box, 0, 360, fill=COLOR_TRACK, width=int(width))
    if percent > 0:
        d.arc(box, -90, -90 + percent * 3.6, fill=color, width=int(width))


def fit_font(text, max_w, size, bold=True, min_size=9):
    f = font(size, bold)
    while size > min_size and f.getlength(text) > max_w:
        size -= 1
        f = font(size, bold)
    return f


def bar(d, x, y, w, h, percent, color, track=COLOR_TRACK):
    d.rounded_rectangle([x, y, x + w, y + h], radius=h / 2, fill=track)
    fw = w * percent / 100
    if 0 < fw < h:
        fw = h
    if fw > 0:
        d.rounded_rectangle([x, y, x + fw, y + h], radius=h / 2, fill=color)


def title(d, pad):
    d.text((pad, pad), "FITFLOW · СЕГОДНЯ", font=font(10 * SCALE, True), fill=COLOR_WATER)


def draw_ring_rows(w, h):
    """Вариант «а»: кольцо воды + строки."""
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    card_bg(d, w, h)
    pad = 12 * SCALE
    title(d, pad)
    top = pad + 16 * SCALE
    avail = h - top - pad
    r = min(avail / 2, min(w * 0.20, 34 * SCALE))
    cx, cy = pad + r, top + avail / 2
    stroke = max(5 * SCALE, r * 0.28)
    ring(d, cx, cy, r, stroke, P['water'], COLOR_WATER)
    f1 = font(r * 0.52, True)
    t = "%d%%" % P['water']
    d.text((cx, cy - 3 * SCALE), t, font=f1, fill=COLOR_TEXT, anchor="mm")
    d.text((cx, cy + r * 0.42), "вода", font=font(r * 0.30), fill=COLOR_MUTED, anchor="mm")

    left = cx + r + 10 * SCALE
    rw = w - pad - left
    rowh, gap = 13 * SCALE, 4 * SCALE
    rows = min(4, int((avail + gap) / (rowh + gap)))
    y = top + (avail - (rows * rowh + (rows - 1) * gap)) / 2
    for i in range(rows):
        d.text((left, y), LABELS[i], font=font(9.5 * SCALE, True), fill=COLOR_TEXT)
        d.text((left + rw, y), VALUES[i], font=font(8.5 * SCALE), fill=COLOR_MUTED, anchor="ra")
        bar(d, left, y + 10 * SCALE, rw, 3.5 * SCALE, PCTS[i], COLORS[i])
        y += rowh + gap
    return img


def draw_nested_rings(w, h):
    """Вариант «б»: вложенные кольца."""
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    card_bg(d, w, h)
    pad = 12 * SCALE
    title(d, pad)
    top = pad + 16 * SCALE
    legend_side = w > h * 1.35
    aw = w * 0.42 if legend_side else w - 2 * pad
    ah = (h - top - pad) if legend_side else (h - top - pad) * 0.68
    ro = min(aw, ah) / 2 - 2 * SCALE
    cx = pad + aw / 2 if legend_side else w / 2
    cy = top + ah / 2
    sw = max(4 * SCALE, ro * 0.17)
    sw = max(min(sw, ro / 5.1), 3 * SCALE)
    step = sw * 1.35
    for i in range(4):
        r = ro - i * step
        if r < sw * 0.9:
            break
        ring(d, cx, cy, r, sw, PCTS[i], COLORS[i])
    dot = 3.2 * SCALE
    if legend_side:
        lx = pad + aw + 10 * SCALE
        rowh = min(20 * SCALE, (h - top - pad) / 4)
        y = top + ((h - top - pad) - rowh * 4) / 2 + rowh / 2
        for i in range(4):
            d.ellipse([lx, y - dot, lx + 2 * dot, y + dot], fill=COLORS[i])
            tx = lx + 2 * dot + 5 * SCALE
            d.text((tx, y - 1 * SCALE), LABELS[i], font=font(9.5 * SCALE, True), fill=COLOR_TEXT, anchor="ls")
            d.text((tx, y + 9 * SCALE), VALUES[i], font=font(9 * SCALE), fill=COLOR_MUTED, anchor="ls")
            y += rowh
    else:
        ly = top + ah + 4 * SCALE
        colw = (w - 2 * pad) / 2
        rowh = 14 * SCALE
        for i in range(4):
            lx = pad + (i % 2) * colw
            y = ly + (i // 2) * rowh + rowh / 2
            d.ellipse([lx, y - dot - SCALE, lx + 2 * dot, y + dot - SCALE], fill=COLORS[i])
            d.text((lx + 2 * dot + 4 * SCALE, y + 2 * SCALE),
                   "%s %d%%" % (LABELS[i], PCTS[i]), font=font(9.5 * SCALE, True), fill=COLOR_TEXT, anchor="ls")
    return img


def draw_dial(w, h):
    """Вариант «в»: центральный круг + 4 дуги по четвертям."""
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    card_bg(d, w, h)
    pad = 12 * SCALE
    title(d, pad)
    top = pad + 16 * SCALE
    legend_side = w > h * 1.35
    aw = w * 0.44 if legend_side else w - 2 * pad
    ah = (h - top - pad) if legend_side else (h - top - pad) * 0.60
    radius = min(aw, ah) / 2 - 3 * SCALE
    cx = pad + aw / 2 if legend_side else w / 2
    cy = top + ah / 2
    stroke = max(6 * SCALE, radius * 0.20)
    ar = radius - stroke / 2
    box = [cx - ar, cy - ar, cx + ar, cy + ar]
    gap_deg, sweep = 8, 90 - 8
    for i in range(4):
        start = -90 + i * 90 + gap_deg / 2
        d.arc(box, start, start + sweep, fill=COLOR_TRACK, width=int(stroke))
        filled = sweep * PCTS[i] / 100
        if filled > 0:
            d.arc(box, start, start + filled, fill=COLORS[i], width=int(stroke))
    import math
    lr = ar + stroke * 0.5 + 8 * SCALE
    for i in range(4):
        mid = math.radians(-90 + i * 90 + 45)
        lx = cx + math.cos(mid) * lr
        ly = cy + math.sin(mid) * lr
        d.text((lx, ly), "%d%%" % PCTS[i], font=font(max(8 * SCALE, radius * 0.17), True),
               fill=COLOR_TEXT, anchor="mm")
    overall = round(sum(PCTS) / 4)
    inner = ar - stroke / 2 - 4 * SCALE
    if inner > 8 * SCALE:
        d.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], fill="white")
        d.text((cx, cy - inner * 0.12), "%d%%" % overall, font=font(inner * 0.62, True),
               fill=COLOR_TEXT, anchor="mm")
        d.text((cx, cy + inner * 0.45), "день", font=font(inner * 0.30), fill=COLOR_MUTED, anchor="mm")
    dot = 3.2 * SCALE
    if legend_side:
        lx = pad + aw + 10 * SCALE
        rowh = min(20 * SCALE, (h - top - pad) / 4)
        y = top + ((h - top - pad) - rowh * 4) / 2 + rowh / 2
        for i in range(4):
            d.ellipse([lx, y - dot, lx + 2 * dot, y + dot], fill=COLORS[i])
            tx = lx + 2 * dot + 5 * SCALE
            d.text((tx, y - 1 * SCALE), LABELS[i], font=font(9.5 * SCALE, True), fill=COLOR_TEXT, anchor="ls")
            d.text((tx, y + 9 * SCALE), VALUES[i], font=font(9 * SCALE), fill=COLOR_MUTED, anchor="ls")
            y += rowh
    else:
        ly = top + ah + 2 * SCALE
        colw = (w - 2 * pad) / 2
        rowh = 14 * SCALE
        for i in range(4):
            lx = pad + (i % 2) * colw
            y = ly + (i // 2) * rowh + rowh / 2
            d.ellipse([lx, y - dot - SCALE, lx + 2 * dot, y + dot - SCALE], fill=COLORS[i])
            d.text((lx + 2 * dot + 4 * SCALE, y + 2 * SCALE), LABELS[i],
                   font=font(9.5 * SCALE, True), fill=COLOR_TEXT, anchor="ls")
    return img


def draw_tiles(w, h):
    """Вариант «г»: плитки-карточки."""
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    card_bg(d, w, h)
    pad = 10 * SCALE
    d.text((pad + 2 * SCALE, pad), "FITFLOW · СЕГОДНЯ", font=font(10 * SCALE, True), fill=COLOR_WATER)
    top = pad + 15 * SCALE
    tile_bg = [(220, 241, 242), (255, 235, 214), (225, 234, 251), (221, 242, 229)]
    big = ["%d мл" % DATA['water'], "%d ккал" % DATA['food'],
           str(DATA['steps']), "%d мин" % DATA['activity']]
    single_row = w > h * 2.2
    cols, rows = (4, 1) if single_row else (2, 2)
    gap = 6 * SCALE
    tw = (w - 2 * pad - gap * (cols - 1)) / cols
    th = (h - top - pad - gap * (rows - 1)) / rows
    for i in range(4):
        col, row = i % cols, i // cols
        if row >= rows:
            break
        x = pad + col * (tw + gap)
        y = top + row * (th + gap)
        d.rounded_rectangle([x, y, x + tw, y + th], radius=12 * SCALE, fill=tile_bg[i])
        inner = 7 * SCALE
        lf = fit_font(LABELS[i], tw - inner * 2, min(9.5 * SCALE, th * 0.22), True, 7 * SCALE)
        d.text((x + inner, y + inner), LABELS[i], font=lf, fill=COLORS[i])
        vf = fit_font(big[i], tw - inner * 2, min(16 * SCALE, th * 0.34), True, 9 * SCALE)
        d.text((x + inner, y + th * 0.62), big[i], font=vf, fill=COLOR_TEXT, anchor="ls")
        bh = max(3.5 * SCALE, th * 0.075)
        by = y + th - inner - bh
        bar(d, x + inner, by, tw - inner * 2, bh, PCTS[i], COLORS[i], (205, 210, 210))
        d.text((x + tw - inner, by - 3 * SCALE), "%d%%" % PCTS[i],
               font=font(min(9 * SCALE, th * 0.19)), fill=COLOR_MUTED, anchor="rs")
    return img


def main():
    # Размеры в dp: как реальный виджет на экране, минус ряд кнопок (38dp).
    wide = (250 * SCALE, (150 - 38) * SCALE)
    square = (180 * SCALE, (180 - 38) * SCALE)

    panels = [
        ("а · кольцо + строки", draw_ring_rows(*wide)),
        ("б · вложенные кольца", draw_nested_rings(*square)),
        ("в · циферблат (круг + 4 дуги)", draw_dial(*square)),
        ("г · плитки", draw_tiles(*wide)),
    ]

    cap_h = 26 * SCALE
    margin = 16 * SCALE
    cols = 2
    cw = max(p[1].width for p in panels) + margin
    ch = max(p[1].height for p in panels) + cap_h + margin
    total_w = cw * cols + margin
    total_h = ch * 2 + margin + 30 * SCALE

    sheet = Image.new("RGB", (int(total_w), int(total_h)), (247, 250, 250))
    sd = ImageDraw.Draw(sheet)
    sd.text((margin, margin / 2), "FitFlow · варианты виджета (одни и те же показатели)",
            font=font(13 * SCALE, True), fill=COLOR_TEXT)

    for idx, (caption, img) in enumerate(panels):
        col, row = idx % cols, idx // cols
        x = margin + col * cw
        y = margin + 26 * SCALE + row * ch
        sd.text((x, y), caption, font=font(11 * SCALE, True), fill=COLOR_MUTED)
        sheet.paste(img, (int(x), int(y + cap_h)))

    out = Path("design/widget-variants.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, format="PNG", optimize=True)
    print("saved", out, sheet.size)


if __name__ == "__main__":
    main()
