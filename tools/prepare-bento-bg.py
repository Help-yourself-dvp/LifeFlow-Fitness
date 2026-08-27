#!/usr/bin/env python3
"""0.9.28: подложка бенто = только геометрия (оболочка + три плиты).

Что изменилось против 0.9.27 и почему.

В 0.9.27 подложка несла на себе и плиты, и кроссовок, и подписи «Вода» /
«Калории». Это давало три полевых дефекта разом:

1. Кроссовок нарисован в центре плиты картинки, а кольцо шагов —
   в центре плиты overlay. Две системы координат (растянутый fitXY
   bitmap против dp-разметки) не совпадают ни на одном размере ячейки,
   поэтому кроссовок «наступал» на кольцо.
2. Подписи «Вода» и «Калории» были впечатаны в картинку жирным, а «Шаги»
   рисовал TextView обычным начертанием — отсюда разнобой шрифтов,
   который невозможно починить в разметке.
3. Впечатанную подпись нельзя переименовать, поэтому слот нельзя было
   отдать другому показателю.

Теперь картинка не знает ни одного показателя: это тёмная оболочка и три
плиты в точной сетке. Всё остальное (подписи, цифры, кольцо, полосы,
иконки, кнопки) рисует overlay в той же сетке через layout_weight —
поэтому совпадение гарантировано на любом размере ячейки.

Сетка (эталон для android-res/layout/fitflow_widget_bento.xml):

    холст            1200 x 675
    поле p           36
    промежуток g     30
    плита слева      x 36..574   (538)   y 36..639 (603)
    колонка справа   x 604..1164 (560)
    плита воды       y 36..322   (286)
    плита питания    y 353..639  (286)

Файлы на выходе:

    design/widget_bento_bg_round.png   подложка (оболочка + плиты)
    design/widget_bento_shoe.png       неоновый кроссовок, вырезан из арта
    design/widget_bento_ic_drop.png    неоновая капля  (слот «Вода»)
    design/widget_bento_ic_plate.png   неоновая тарелка (слот «Питание»)
    design/widget_bento_ic_clock.png   неоновые часы   (слот «Активность»)
    design/widget_bento_ic_pencil.png  карандаш для кнопки быстрого ввода
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SRC = Path('design/widget_bento_bg.png')
OUT_BG = Path('design/widget_bento_bg_round.png')
OUT_SHOE = Path('design/widget_bento_shoe.png')
OUT_DROP = Path('design/widget_bento_ic_drop.png')
OUT_PLATE = Path('design/widget_bento_ic_plate.png')
OUT_CLOCK = Path('design/widget_bento_ic_clock.png')
OUT_PENCIL = Path('design/widget_bento_ic_pencil.png')

# Сетка подложки. Те же числа стоят в weightSum разметки overlay —
# менять их можно только парой, иначе плиты и содержимое разъедутся.
W, H = 1200, 675
PAD = 36
GAP = 30
LEFT_W = 538
RIGHT_W = W - 2 * PAD - GAP - LEFT_W          # 560
CARD_H = H - 2 * PAD                          # 542
SMALL_H = (CARD_H - GAP) // 2                 # 256

# Палитра снята с арта 0.9.26 (оболочка (17,20,25), плита (21,22,27)).
# Контраст там почти нулевой, плиты читались только за счёт мягкой тени,
# которая при масштабировании пропадала. Разводим на пару ступеней и
# добавляем тонкую кромку — вид тот же, границы плит честно видны.
SHELL = (14, 16, 20, 255)
CARD = (27, 30, 36, 255)
CARD_EDGE = (38, 42, 50, 255)

# Чистый неон кроссовка и иконок — им же подкрашивается дальний ореол.
GLOW = (168, 85, 247)

# Ширина итоговой подложки. 960 хватает даже планшетной ячейке, а вес
# файла остаётся небольшим — в APK картинка едет как есть.
TARGET_W = 960


def neon(size, draw_fn, core=(255, 255, 255, 255), glow=(192, 132, 252, 255)):
    """Неоновая иконка: цветное свечение под светлым сердечником.

    draw_fn(draw, width) рисует контур указанной толщины — вызывается
    трижды: широко для дальнего ореола, средне для ближнего и тонко для
    самого сердечника. Так получается тот же вид, что у кроссовка с арта.
    """
    w, h = size
    far = Image.new('RGBA', size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(far), 26, glow)
    far = far.filter(ImageFilter.GaussianBlur(22))

    near = Image.new('RGBA', size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(near), 16, glow)
    near = near.filter(ImageFilter.GaussianBlur(8))

    sharp = Image.new('RGBA', size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(sharp), 9, glow)

    heart = Image.new('RGBA', size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(heart), 4, core)

    out = Image.new('RGBA', size, (0, 0, 0, 0))
    for layer in (far, near, sharp, heart):
        out = Image.alpha_composite(out, layer)
    return out


def extract_shoe():
    """Вырезает неоновый кроссовок из арта 0.9.26 в отдельный файл.

    Прозрачность считаем ТОЛЬКО по «фиолетовости» (насколько синий и
    красный выше зелёного). Яркость в маску не берём: плита под
    кроссовком хоть и тёмная, но не чёрная, и по яркости вокруг иконки
    появлялся серый прямоугольный ореол — сама плита, вырезанная вместе
    со свечением. Неон же всегда цветной, поэтому цветовой признак
    отделяет его от подложки начисто.
    """
    art = Image.open(SRC).convert('RGBA')
    crop = art.crop((150, 170, 490, 455))
    px = crop.load()
    w, h = crop.size

    # 1) Берём только сам контур (яркий сердечник), без дальнего ореола.
    #    Ореол с арта смешан с плитой и в прозрачности читается грязным
    #    серо-сиреневым пятном — его мы не вырезаем, а рисуем заново.
    core = Image.new('L', (w, h), 0)
    cp = core.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            violet = min(r, b) - g
            lum = (r + g + b) / 3.0
            if violet < 20:
                continue
            # Порог по яркости, а не по «фиолетовости»: сам штрих на арте
            # светлый (lum > 150), а всё, что тусклее, — уже размытый
            # ореол. Ловим штрих, ореол потом рисуем сами.
            if lum >= 150:
                cp[x, y] = 255
            elif lum >= 105:
                cp[x, y] = int((lum - 105) / 45.0 * 255)

    # 2) Собираем неон заново из этой маски: два размытых слоя свечения
    #    чистого цвета плюс светлый сердечник сверху.
    def tint(mask, color, blur, gain):
        layer = Image.new('RGBA', (w, h), color + (0,))
        alpha = mask.filter(ImageFilter.GaussianBlur(blur)) if blur else mask.copy()
        alpha = alpha.point(lambda v: min(255, int(v * gain)))
        layer.putalpha(alpha)
        return layer

    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for layer in (tint(core, GLOW, 18, 0.85),
                  tint(core, GLOW, 7, 1.25),
                  tint(core, (233, 213, 255), 0, 1.0)):
        out = Image.alpha_composite(out, layer)
    return out.crop(out.getbbox())


def drop_path(steps=180):
    """Точки контура капли: острый верх, круглый низ.

    Радиус растёт от нуля на макушке до полного у основания, поэтому
    линия замкнута сама на себя и рисуется одним polygon — без стыков
    дуги и отрезков, которые в 0.9.28-черновике давали разрыв контура.
    """
    import math

    cx, cy, r = 128, 152, 74
    top = 36.0
    pts = []
    for i in range(steps + 1):
        a = -math.pi / 2 + 2 * math.pi * i / steps
        t = (math.sin(a) + 1) / 2          # 0 на макушке, 1 у основания
        k = t ** 0.62
        x = cx + math.cos(a) * r * k
        y = top + (cy + math.sin(a) * r - top) * (0.30 + 0.70 * k)
        pts.append((x, y))
    return pts


def draw_drop(draw, width, color):
    """Капля — слот «Вода»."""
    draw.line(drop_path() + [drop_path()[0]], fill=color, width=width, joint='curve')


def draw_plate(draw, width, color):
    """Тарелка между вилкой и ножом — слот «Питание».

    Приборы по бокам обязательны: одна тарелка (кольцо в кольце) читается
    как мишень или лупа, а не как еда.
    """
    draw.ellipse((74, 60, 182, 168), outline=color, width=width)
    draw.ellipse((98, 84, 158, 144), outline=color, width=width)
    # Вилка слева: три зубца, сходящиеся в черенок.
    for x in (26, 42, 58):
        draw.line((x, 44, x, 92), fill=color, width=width)
    draw.line((26, 92, 58, 92), fill=color, width=width)
    draw.line((42, 92, 42, 194), fill=color, width=width)
    # Нож справа: лезвие и рукоять.
    draw.line((214, 44, 214, 118), fill=color, width=width)
    draw.line((214, 118, 214, 194), fill=color, width=width)
    draw.line((196, 66, 214, 44), fill=color, width=width)


def draw_clock(draw, width, color):
    """Циферблат со стрелками — слот «Активность» (минуты)."""
    pad = 34
    box = (pad, pad, 256 - pad, 256 - pad)
    draw.ellipse(box, outline=color, width=width)
    cx = cy = 128
    draw.line((cx, cy, cx, cy - 52), fill=color, width=width)
    draw.line((cx, cy, cx + 40, cy + 16), fill=color, width=width)


def draw_pencil(draw, width, color):
    """Карандаш для кнопки быстрого ввода.

    Рисуется заливкой, а не обводкой: на бирюзовой кнопке 46 dp контурный
    карандаш превращался в неразборчивую палку.
    """
    body = [(60, 196), (168, 88), (196, 116), (88, 224), (48, 236)]
    draw.polygon(body, fill=color)
    # Грифель — треугольник на кончике, чуть темнее самого корпуса.
    draw.polygon([(48, 236), (88, 224), (60, 196)], fill=color)
    # Резинка сверху: короткая перемычка поперёк корпуса.
    draw.line((168, 88, 196, 116), fill=color, width=width)


def build_background():
    """Оболочка и три плиты в точной сетке — без единого показателя."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    shell_radius = int(min(W, H) * 0.105)
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=shell_radius, fill=SHELL)

    card_radius = 30
    plates = [
        (PAD, PAD, PAD + LEFT_W, PAD + CARD_H),
        (PAD + LEFT_W + GAP, PAD, W - PAD, PAD + SMALL_H),
        (PAD + LEFT_W + GAP, PAD + SMALL_H + GAP, W - PAD, PAD + CARD_H),
    ]
    for x0, y0, x1, y1 in plates:
        d.rounded_rectangle((x0, y0, x1 - 1, y1 - 1), radius=card_radius,
                            fill=CARD, outline=CARD_EDGE, width=2)

    th = max(1, int(TARGET_W * H / W))
    im = im.resize((TARGET_W, th), Image.Resampling.LANCZOS)

    # Внешний контур режем маской по уже уменьшенной картинке: иначе после
    # LANCZOS по краю остаётся светлый ободок (полевой дефект 0.9.26).
    mask = Image.new('L', im.size, 0)
    radius = max(36, int(min(im.size) * 0.105))
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.size[0] - 1, im.size[1] - 1),
                                           radius=radius, fill=255)
    im.putalpha(mask)
    return im


def main():
    OUT_BG.parent.mkdir(parents=True, exist_ok=True)

    bg = build_background()
    bg.save(OUT_BG, format='PNG')
    print('wrote', OUT_BG, bg.size)

    shoe = extract_shoe()
    shoe.thumbnail((320, 320), Image.Resampling.LANCZOS)
    shoe.save(OUT_SHOE, format='PNG')
    print('wrote', OUT_SHOE, shoe.size)

    for path, fn, glow in ((OUT_DROP, draw_drop, (34, 211, 238)),
                           (OUT_PLATE, draw_plate, (251, 146, 60)),
                           (OUT_CLOCK, draw_clock, GLOW)):
        icon = neon((256, 256), fn, glow=glow + (255,))
        icon = icon.crop(icon.getbbox())
        icon.save(path, format='PNG')
        print('wrote', path, icon.size)

    # Карандаш живёт на бирюзовой кнопке, поэтому он не неоновый, а плотный
    # тёмный — как текст «+250 мл» на кнопке воды.
    pencil = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    draw_pencil(ImageDraw.Draw(pencil), 22, (8, 32, 40, 255))
    pencil = pencil.crop(pencil.getbbox())
    pencil.save(OUT_PENCIL, format='PNG')
    print('wrote', OUT_PENCIL, pencil.size)


if __name__ == '__main__':
    main()
