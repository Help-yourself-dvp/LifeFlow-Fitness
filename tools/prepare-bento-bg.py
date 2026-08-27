#!/usr/bin/env python3
# 0.9.28: готовит подложку бенто — без светлой кромки, БЕЗ кроссовка и БЕЗ
# надписей «Вода» / «Калории» (их кладёт overlay живыми вьюхами: заголовки
# больше не наезжают на цифры, а кроссовок всегда точно в центре кольца).
# Пилюли и круг «+250» тоже закрашены — их рисует overlay в dp.
# Кроссовок вырезается в android-res/drawable/widget_bento_sneaker.png.
from pathlib import Path
from PIL import Image, ImageDraw

SRC = Path('design/widget_bento_bg.png')
OUT = Path('design/widget_bento_bg_round.png')
SNEAKER = Path('android-res/drawable/widget_bento_sneaker.png')


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

    # 2) Кроссовок — в отдельный слой. Вырезаем фиолетовое пятно с запасом
    #    на свечение, чистим фон до прозрачности и сохраняем PNG для
    #    ImageView, который лежит в одном FrameLayout с кольцом
    #    (layout_gravity="center") — поэтому мимо центра он не промахнётся.
    sneaker_box = (192, 211, 442, 413)
    sx0, sy0, sx1, sy1 = sneaker_box
    pad = 22
    crop = raw.crop((sx0 - pad, sy0 - pad, sx1 + pad, sy1 + pad)).convert('RGBA')
    cp = crop.load()
    for yy in range(crop.height):
        for xx in range(crop.width):
            r, g, b, a = cp[xx, yy]
            if a < 8 or b < 90 or r < 40 or g > r + 40:
                cp[xx, yy] = (0, 0, 0, 0)
    bbox = crop.getbbox()
    if bbox:
        crop = crop.crop(bbox)
    SNEAKER.parent.mkdir(parents=True, exist_ok=True)
    crop.save(SNEAKER, format='PNG')

    # 3) С подложки кроссовок убираем совсем (карточка «Шаги» пустая).
    left_card = raw.getpixel((70, 70))
    cover_rect(raw, (48, 48, 575, 575), left_card, 28)

    # 4) Стираем нарисованные заголовки «Вода» и «Калории»: их кладёт overlay
    #    тем же стилем, что «Шаги» (#8E95A2, без bold) — единый шрифт и
    #    никакого налезания цифр на заголовок на любом экране.
    water_card = raw.getpixel((820, 100))
    food_card = raw.getpixel((820, 430))
    cover_rect(raw, (655, 75, 800, 140), water_card, 12)
    cover_rect(raw, (655, 365, 885, 432), food_card, 12)

    # 5) Закрасить пилюли и круг «+250» (включая бирюзовое свечение).
    #    Полосы и круглые кнопки рисует overlay в dp — так круг не вытягивается.
    cover_rect(raw, (650, 168, 1070, 258), water_card, 20)
    cover_rect(raw, (650, 470, 1160, 565), food_card, 20)
    cover_rect(raw, (1000, 120, 1190, 290), water_card, 40)

    # 6) Скругление внешнего контура, чуть внутрь — без светлого ободка.
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
    print('wrote', SNEAKER, crop.size)


if __name__ == '__main__':
    main()
