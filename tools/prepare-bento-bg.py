#!/usr/bin/env python3
# 0.9.27: готовит подложку бенто — без светлой кромки, кроссовок меньше,
# пилюли и круг «+250» закрашены (их рисует overlay, чтобы не двоились).
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

SRC = Path('design/widget_bento_bg.png')
OUT = Path('design/widget_bento_bg_round.png')


def cover_rect(im, box, color, radius):
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(box, radius=radius, fill=color)


def main():
    raw = Image.open(SRC).convert('RGBA')
    w, h = raw.size
    px = raw.load()

    # 1) Светлая кромка сверху-справа — обои, попавшие в прямоугольник.
    #    Любой непрозрачный пиксель у края с яркостью выше тёмной карты
    #    перекрашиваем в цвет оболочки.
    shell = (16, 19, 24, 255)
    margin = max(8, int(min(w, h) * 0.03))
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            edge = x < margin or y < margin or x >= w - margin or y >= h - margin
            if edge and (r + g + b) > 90:
                px[x, y] = shell

    # 2) Кроссовок меньше: вырезаем фиолетовое пятно, масштабируем, кладём назад.
    sneaker_box = (196, 214, 438, 408)
    sx0, sy0, sx1, sy1 = sneaker_box
    pad = 18
    crop = raw.crop((sx0 - pad, sy0 - pad, sx1 + pad, sy1 + pad)).convert('RGBA')
    cp = crop.load()
    for yy in range(crop.height):
        for xx in range(crop.width):
            r, g, b, a = cp[xx, yy]
            if a < 8 or b < 90 or r < 40 or g > r + 40:
                cp[xx, yy] = (0, 0, 0, 0)
    left_card = raw.getpixel((70, 70))
    cover_rect(raw, (48, 48, 575, 575), left_card, 28)
    scale = 0.78
    nw, nh = int(crop.width * scale), int(crop.height * scale)
    small = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    cx = (sx0 + sx1) // 2
    cy = (sy0 + sy1) // 2 - 12
    raw.paste(small, (cx - nw // 2, cy - nh // 2), small)

    # 3) Закрасить пилюли и круг «+250» (включая бирюзовое свечение).
    #    Полосы и круглую кнопку рисует overlay в dp — так круг не вытягивается.
    water_card = raw.getpixel((820, 100))
    food_card = raw.getpixel((820, 430))
    cover_rect(raw, (650, 168, 1070, 258), water_card, 20)
    cover_rect(raw, (650, 470, 1160, 565), food_card, 20)
    cover_rect(raw, (1000, 120, 1190, 290), water_card, 40)

    # 4) Скругление внешнего контура, чуть внутрь — без светлого ободка.
    tw = 960
    th = max(1, int(tw * raw.height / raw.width))
    raw = raw.resize((tw, th), Image.Resampling.LANCZOS)
    radius = max(36, int(min(tw, th) * 0.10))
    mask = Image.new('L', (tw, th), 0)
    ImageDraw.Draw(mask).rounded_rectangle((1, 1, tw - 2, th - 2), radius=radius, fill=255)
    raw.putalpha(mask)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    raw.save(OUT, format='PNG')
    print('wrote', OUT, raw.size, 'radius', radius)


if __name__ == '__main__':
    main()
