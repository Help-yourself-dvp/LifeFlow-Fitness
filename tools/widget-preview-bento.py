#!/usr/bin/env python3
"""Превью бенто-виджета 0.9.28 — симуляция RemoteViews поверх подложки.

Не APK и не скриншот: числа примерные, шрифт Manrope вместо системного
Roboto. Геометрия повторяет android-res/layout/fitflow_widget_bento.xml
в масштабе 3 px на 1 dp (виджет ~320x164 dp).
"""
from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BG = ROOT / 'design' / 'widget_bento_bg_round.png'
SNEAKER = ROOT / 'android-res' / 'drawable' / 'widget_bento_sneaker.png'
FONT = ROOT / 'assets' / 'fonts' / 'manrope.ttf'
OUT = ROOT / 'design' / 'widget-bento-0928-preview.png'

K = 3  # px на dp

# Примерные данные (как в поле у владельца, не из prefs)
STEPS, STEPS_G = 5630, 8000
WATER, WATER_G = 1000, 2300
FOOD, FOOD_G = 1450, 2500

GRAY = (142, 149, 162, 255)   # #8E95A2
WHITE = (255, 255, 255, 255)
TEAL = (0, 210, 180, 255)     # #00D2B4
ORANGE = (255, 107, 74, 255)  # #FF6B4A
TRACK = (42, 46, 54, 255)     # #2A2E36
RING_BG = (157, 92, 255, 51)
RING_FG = (192, 132, 252, 255)


def font(px, bold=False):
    f = ImageFont.truetype(str(FONT), int(px))
    return f


def fmt(n):
    return f'{int(n):,}'.replace(',', ' ')


def text(d, xy, s, px, color, bold=False, anchor='la'):
    d.text(xy, s, font=font(px), fill=color, anchor=anchor,
           stroke_width=(1 if bold else 0), stroke_fill=color)


def pill(d, x0, y0, x1, y1, pct, color):
    r = (y1 - y0) / 2
    d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=TRACK)
    w = max(2 * r, (x1 - x0) * min(1.0, pct))
    d.rounded_rectangle((x0, y0, x0 + w, y1), radius=r, fill=color)


def main():
    im = Image.open(BG).convert('RGBA')
    W, H = 320 * K, 180 * K  # виджет 320x180 dp, подложка растянется fitXY
    im = im.resize((W, H), Image.Resampling.LANCZOS)
    d = ImageDraw.Draw(im)

    pad = 10 * K
    inner_w = W - 2 * pad
    left_w = inner_w * 0.48 - 6 * K
    lx0, ly0 = pad, pad
    lx1, ly1 = pad + left_w, H - pad

    # Шаги: заголовок
    text(d, (lx0 + 10 * K, ly0 + 6 * K), 'Шаги', 12 * K, GRAY)

    # Кольцо 92dp + кроссовок 46dp в центре (marginBottom 14dp)
    ring = 92 * K
    cx = (lx0 + lx1) / 2
    cy = (ly0 + ly1) / 2 - 7 * K
    th = 7 * K
    box = (cx - ring / 2, cy - ring / 2, cx + ring / 2, cy + ring / 2)
    ring_layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring_layer)
    rd.arc(box, 0, 360, fill=RING_BG, width=th)
    pct = min(1.0, STEPS / STEPS_G)
    rd.arc(box, -90, -90 + 360 * pct, fill=RING_FG, width=th)
    im.alpha_composite(ring_layer)
    d = ImageDraw.Draw(im)
    sn = Image.open(SNEAKER).convert('RGBA')
    side = 46 * K
    sc = min(side / sn.width, side / sn.height)
    sn = sn.resize((int(sn.width * sc), int(sn.height * sc)), Image.Resampling.LANCZOS)
    im.alpha_composite(sn, (int(cx - sn.width / 2), int(cy - sn.height / 2)))
    d = ImageDraw.Draw(im)

    # Цифры шагов внизу
    text(d, (cx, ly1 - 4 * K - 11 * K * 1.2), fmt(STEPS), 20 * K, WHITE, bold=True, anchor='ms')
    text(d, (cx, ly1 - 4 * K), 'из ' + fmt(STEPS_G), 11 * K, GRAY, anchor='ms')

    # Правые карточки
    rx0 = pad + inner_w * 0.48
    rx1 = W - pad
    half = (H - 2 * pad) / 2
    cards = [
        ('Вода', fmt(WATER), 'из ' + fmt(WATER_G) + ' мл', WATER / WATER_G, TEAL, ly0),
        ('Калории', fmt(FOOD), 'из ' + fmt(FOOD_G) + ' ккал', FOOD / FOOD_G, ORANGE, ly0 + half),
    ]
    for title, val, goal, p, accent, cy0 in cards:
        tx = rx0 + 10 * K
        y = cy0 + 6 * K
        text(d, (tx, y), title, 12 * K, GRAY)
        y += 12 * K * 1.17 + 1 * K
        text(d, (tx, y), val, 14 * K, WHITE, bold=True)
        y += 14 * K * 1.17
        text(d, (tx, y), goal, 11 * K, GRAY)
        # полоса у низа карточки
        bx1 = rx1 - 58 * K
        by1 = cy0 + half - 10 * K
        pill(d, tx, by1 - 12 * K, bx1, by1, p, accent)
        # круглая кнопка справа по центру
        bc = 44 * K / 2
        bcx = rx1 - 10 * K - bc
        bcy = cy0 + half / 2
        d.ellipse((bcx - bc, bcy - bc, bcx + bc, bcy + bc), fill=accent)
        if accent == TEAL:
            text(d, (bcx, bcy - 5 * K), '+250', 10 * K, (8, 32, 40, 255), bold=True, anchor='mm')
            text(d, (bcx, bcy + 6 * K), 'мл', 10 * K, (8, 32, 40, 255), bold=True, anchor='mm')
        else:
            # Карандаш рисуем линиями: в Manrope нет глифа U+270E,
            # а на устройстве его берёт системный шрифт.
            pen = (43, 16, 9, 255)
            s = 9 * K
            x0, y0 = bcx + s, bcy - s
            x1, y1 = bcx - s * 0.55, bcy + s * 0.55
            d.line((x0, y0, x1, y1), fill=pen, width=int(4.6 * K))
            tipx, tipy = bcx - s, bcy + s
            d.polygon((x1 - 2.4 * K, y1 - 0.4 * K, x1 + 0.4 * K, y1 + 2.4 * K,
                       tipx, tipy), fill=pen)

    im.save(OUT)
    print('wrote', OUT, im.size)


if __name__ == '__main__':
    main()
