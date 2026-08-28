#!/usr/bin/env python3
"""0.9.35: предпросмотр виджета «плитки» (FitFlow · плитки).

ЗЕРКАЛО Java-кода FitFlowWidgetPaint.drawTiles(). Все числа обязаны
совпадать — их сверяет тест «0.9.35 предпросмотр плиток — зеркало
drawTiles» в test-ui-init.js. Правите Java — правьте и здесь.

Макет по референсу владельца (скриншот 28.08.2026):
  - слева большой блок с «каплей», которая заполняется по мере питья;
  - справа сетка маленьких плиток 2 x N с показателями без графиков;
  - кнопка «+250 мл» ВНУТРИ виджета (на референсе была снаружи),
    выпуклая, с лёгким зеленоватым оттенком;
  - состав плиток настраивается, как у «колец»: что выбрано в
    приложении, то и показывается; лишнее тихо отбрасывается.

Скрипт НЕ участвует в сборке APK.

    python3 tools/widget-tiles-preview.py

Пишет design/widget-tiles-preview.png.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path('design/widget-tiles-preview.png')

# Палитра плиток — зеркало TilesTheme в FitFlowWidgetPaint.
TILES_THEMES = {
    'light': {
        'bg': (238, 242, 246, 255),      # подложка виджета
        'tile': (255, 255, 255, 255),    # плитка
        'ink': (17, 24, 39),
        'muted': (107, 114, 128),
        'shadow': (148, 163, 184, 70),
        'btn': (209, 250, 229, 255),     # зеленоватая кнопка
        'btn_ink': (6, 95, 70),
        'drop_empty': (226, 232, 240, 255),
        'gear': (154, 166, 180, 140),
        'sheet': (203, 213, 225, 255),
        'title': '#33415A',
    },
    'dark': {
        'bg': (17, 24, 39, 240),
        'tile': (31, 41, 55, 255),
        'ink': (243, 244, 246),
        'muted': (156, 163, 175),
        'shadow': (0, 0, 0, 90),
        'btn': (6, 78, 59, 255),
        'btn_ink': (167, 243, 208),
        'drop_empty': (55, 65, 81, 255),
        'gear': (124, 135, 150, 140),
        'sheet': (15, 18, 26, 255),
        'title': '#C7CEDA',
    },
}

WATER_DEEP = (45, 212, 191)
WATER_TOP = (153, 246, 228)

# Цвет значка в плитке — по показателю (как в «кольцах»).
COLOR = {
    'water': (20, 184, 166), 'food': (249, 115, 22), 'steps': (139, 92, 246),
    'activity': (16, 185, 129), 'sleep': (129, 140, 248),
    'weight': (100, 116, 139), 'courses': (16, 185, 129),
    'day-mood': (245, 158, 11), 'day-plan': (100, 116, 139),
    'workout': (100, 116, 139),
}
EMOJI = {
    'water': '💧', 'food': '🍽️', 'steps': '👟', 'activity': '🏃',
    'sleep': '🌙', 'weight': '⚖️', 'courses': '💊', 'day-mood': '🌗',
    'day-plan': '📋', 'workout': '🗓️',
}
LABEL = {
    'water': 'Вода', 'food': 'Питание', 'steps': 'Шаги',
    'activity': 'Активность', 'sleep': 'Сон', 'weight': 'Вес',
    'courses': 'Витамины', 'day-mood': 'Самочувствие',
    'day-plan': 'План дня', 'workout': 'Тренировка',
}
# Показатели с парой «значение / цель» — у них есть вторая строка «из N».
PAIRED = ('water', 'food', 'steps', 'activity')


def font(size, bold=False):
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    for base in ('/usr/share/fonts/truetype/dejavu/', '/usr/share/fonts/truetype/'):
        p = Path(base) / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def spaced(n):
    """Разряды неразрывным пробелом: 1 850, 10 000."""
    s = str(abs(int(n)))
    out = ''
    while len(s) > 3:
        out = ' ' + s[-3:] + out
        s = s[:-3]
    return ('-' if n < 0 else '') + s + out


def shadowed_tile(im, box, radius, fill, shadow, den):
    """Плитка с мягкой тенью снизу — «выпуклость» референса."""
    x0, y0, x1, y1 = box
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        (x0, y0 + 2 * den, x1, y1 + 3 * den), radius=radius, fill=shadow)
    sh = sh.filter(ImageFilter.GaussianBlur(3 * den))
    im.alpha_composite(sh)
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(box, radius=radius, fill=fill)
    im.alpha_composite(layer)


def drop_path(w, h):
    """Контур капли (зеркало dropPath в Java) как список точек.

    Настоящая капля: ОСТРАЯ вершина сверху, круглое пузо снизу. Прошлый
    контур начинался пологой дугой и читался как яйцо — владелец это и
    заметил. Ключевое: у вершины касательные почти вертикальные, поэтому
    первые управляющие точки прижаты к оси (0.5), а не разведены вбок.
    """
    pts = []
    segs = [((0.50, 0.00), (0.545, 0.10), (0.72, 0.28), (0.86, 0.45)),
            ((0.86, 0.45), (0.955, 0.565), (1.00, 0.70), (1.00, 0.775)),
            ((1.00, 0.775), (1.00, 0.90), (0.885, 1.00), (0.50, 1.00)),
            ((0.50, 1.00), (0.115, 1.00), (0.00, 0.90), (0.00, 0.775)),
            ((0.00, 0.775), (0.00, 0.70), (0.045, 0.565), (0.14, 0.45)),
            ((0.14, 0.45), (0.28, 0.28), (0.455, 0.10), (0.50, 0.00))]
    for p0, p1, p2, p3 in segs:
        for i in range(19):
            t = i / 18.0
            u = 1 - t
            x = (u ** 3 * p0[0] + 3 * u * u * t * p1[0]
                 + 3 * u * t * t * p2[0] + t ** 3 * p3[0])
            y = (u ** 3 * p0[1] + 3 * u * u * t * p1[1]
                 + 3 * u * t * t * p2[1] + t ** 3 * p3[1])
            pts.append((x * w, y * h))
    return pts


def wave_y(x, w, fy, amp, phase, lift):
    t = 0 if w <= 1 else x / (w - 1.0)
    base = math.cos(t * math.pi)
    wobble = math.sin(t * math.pi * 2.3 + phase) * 0.30
    return fy - lift * (1 - t) - amp * (base * 0.50 + wobble)


DROP_SHAPE = Path(__file__).resolve().parent.parent / 'assets' / 'widget-icons' / 'drop-shape.png'


def drop_aspect():
    """Ширина/высота капли: у шаблона своя, у встроенного контура 0.80."""
    if DROP_SHAPE.exists():
        im = Image.open(DROP_SHAPE)
        if im.height:
            ar = im.width / float(im.height)
            if 0.3 < ar < 2.5:
                return ar
    return 0.80


def paint_drop(im, box, pct, den, th):
    """Капля с уровнем воды. pct = 0..1 — доля заполнения.

    0.9.36: если владелец положил свой шаблон капли (drop-shape.png),
    маской служит его альфа-канал — зеркало ensureDropShape() в Java.
    """
    x0, y0, x1, y1 = box
    w, h = int(x1 - x0), int(y1 - y0)
    if w < 8 or h < 8:
        return
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    if DROP_SHAPE.exists():
        mask = Image.open(DROP_SHAPE).convert('RGBA').resize(
            (w, h), Image.Resampling.LANCZOS).split()[3]
    else:
        mask = Image.new('L', (w, h), 0)
        ImageDraw.Draw(mask).polygon(drop_path(w, h), fill=255)
    empty = Image.new('RGBA', (w, h), th['drop_empty'])
    empty.putalpha(mask)
    layer.alpha_composite(empty)

    p = max(0.0, min(1.0, pct))
    fy = h * (0.97 - 0.72 * p)
    amp = w * 0.075
    lift = h * 0.09
    water = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(water)
    for colour, off, phase in ((WATER_DEEP, h * 0.06, 0.3), (WATER_TOP, 0, 1.05)):
        pts = [(x, wave_y(x, w, fy + off, amp, phase, lift)) for x in range(w)]
        wd.polygon(pts + [(w, h), (0, h)], fill=colour + (235,))
    layer.alpha_composite(water)
    layer.putalpha(Image.composite(layer.split()[3], Image.new('L', (w, h), 0), mask))
    im.alpha_composite(layer, (int(x0), int(y0)))


ICON_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'widget-icons'


# Набор значков плиток — зеркало FitFlowWidgetPaint.TILES_ICONS (Phosphor).
TILES_ICONS = 'tiles'


def draw_emoji(im, d, ch, x, mid_y, size, colour, slot=None, family=None):
    """Значок показателя.

    0.9.36: сначала пробуем НАСТОЯЩИЙ png из assets/widget-icons — тот же,
    что возьмёт виджет на устройстве. Так предпросмотр показывает реальный
    вид, а не заглушку. Значок перекрашивается в цвет показателя, как это
    делает натив.
    """
    if slot:
        # 0.9.39: тот же порядок поиска, что в нативе — сначала набор
        # оформления (tiles-<id>), потом общий значок.
        names = []
        if family:
            names += [family + '-' + slot + '-color.png',
                      family + '-' + slot + '.png']
        names += [slot + '-color.png', slot + '.png']
        src = None
        for name in names:
            cand = ICON_DIR / name
            if cand.exists():
                src = cand
                break
        if src is not None:
            is_color = src.name.endswith('-color.png')
            g = Image.open(src).convert('RGBA')
            k = size / max(g.width, g.height)
            g = g.resize((max(1, int(g.width * k)), max(1, int(g.height * k))),
                         Image.Resampling.LANCZOS)
            if not is_color:
                tint = Image.new('RGBA', g.size, colour + (255,))
                tint.putalpha(g.split()[3])
                g = tint
            im.alpha_composite(g, (int(x), int(mid_y - g.height / 2)))
            return
    """Значок. В песочнице нет шрифта эмодзи — рисуем метку-заглушку."""
    for path in ('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',):
        if Path(path).exists():
            try:
                f = ImageFont.truetype(path, 109)
                tmp = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
                ImageDraw.Draw(tmp).text((0, 0), ch, font=f, embedded_color=True)
                bb = tmp.getbbox()
                if bb:
                    g = tmp.crop(bb)
                    k = size / max(g.width, g.height)
                    g = g.resize((max(1, int(g.width * k)), max(1, int(g.height * k))),
                                 Image.Resampling.LANCZOS)
                    im.alpha_composite(g, (int(x), int(mid_y - g.height / 2)))
                    return
            except Exception:
                pass
    r = size / 2.0
    d.ellipse((x, mid_y - r, x + size, mid_y + r), fill=colour + (60,))
    d.ellipse((x + size * 0.28, mid_y - size * 0.22,
               x + size * 0.72, mid_y + size * 0.22), fill=colour)


def tiles_label(d, slot, full, f, room):
    """Короткий синоним, если полная подпись не влезает (зеркало tilesLabel)."""
    if d.textbbox((0, 0), full, font=f)[2] <= room:
        return full
    short = {'workout': 'Спорт', 'day-mood': 'Настрой',
             'activity': 'Актив.', 'day-plan': 'План',
             'food': 'Еда', 'courses': 'Курсы'}.get(slot)
    return short or full


def fit_label(d, text, f, room):
    """Обрезает подпись многоточием, если не влезает."""
    if room <= 0 or d.textbbox((0, 0), text, font=f)[2] <= room:
        return text
    while text and d.textbbox((0, 0), text + '…', font=f)[2] > room:
        text = text[:-1]
    return (text + '…') if text else ''


def draw_gear(im, cx, cy, s, colour):
    """Шестерёнка настроек (зеркало neonGear): зубчатый круг + отверстие."""
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(layer)
    r = s / 2.0
    for i in range(8):
        a = math.pi * i / 4.0
        g.ellipse((cx + math.cos(a) * r * 0.82 - r * 0.30,
                   cy + math.sin(a) * r * 0.82 - r * 0.30,
                   cx + math.cos(a) * r * 0.82 + r * 0.30,
                   cy + math.sin(a) * r * 0.82 + r * 0.30), fill=colour)
    g.ellipse((cx - r * 0.72, cy - r * 0.72, cx + r * 0.72, cy + r * 0.72),
              fill=colour)
    g.ellipse((cx - r * 0.30, cy - r * 0.30, cx + r * 0.30, cy + r * 0.30),
              fill=(0, 0, 0, 0))
    im.alpha_composite(layer)


def value_lines(slot, data):
    """Что писать в плитке: крупное значение и подпись под ним."""
    v = data.get(slot)
    if isinstance(v, tuple):
        if slot == 'water':
            return spaced(v[0]), 'из %s мл' % spaced(v[1])
        if slot == 'food':
            return spaced(v[0]), 'из %s ккал' % spaced(v[1])
        if slot == 'activity':
            return spaced(v[0]), 'из %s мин' % spaced(v[1])
        return spaced(v[0]), 'из %s' % spaced(v[1])
    return str(v), ''


def fit_font(d, text, max_w, start, floor, bold=True):
    """Наибольший кегль, при котором строка влезает в max_w."""
    size = start
    while size > floor:
        f = font(int(size), bold=bold)
        if d.textbbox((0, 0), text, font=f)[2] <= max_w:
            return f
        size -= 1
    return font(int(floor), bold=bold)


def render(slots, data, width=760, height=428, theme='light', water_pct=None):
    """slots — показатели в порядке пользователя (как widgetItems).

    Вода (если выбрана) уходит в большой левый блок с каплей и кнопкой;
    остальные показатели — в сетку плиток 2 x N справа.
    """
    th = TILES_THEMES[theme]
    im = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    den = width / 250.0
    d = ImageDraw.Draw(im)

    pad = 8 * den
    gap = 7 * den
    rad = 14 * den

    ImageDraw.Draw(im).rounded_rectangle(
        (0, 0, width, height), radius=18 * den, fill=th['bg'])

    has_water = 'water' in slots
    btn_h = 30 * den
    # Правая сетка занимает ВСЮ высоту: кнопка живёт только под каплей,
    # иначе плитки теряют целый ряд впустую.
    body_top, body_bottom = pad, height - pad
    left_w = (width - 2 * pad - gap) * 0.42 if has_water else 0
    grid_x = pad + (left_w + gap if has_water else 0)

    if has_water:
        big = (pad, body_top, pad + left_w, body_bottom - btn_h - gap)
        shadowed_tile(im, big, rad, th['tile'], th['shadow'], den)
        wv, wg = data['water']
        pct = (water_pct if water_pct is not None
               else (wv / float(wg) if wg else 0))
        inner = left_w - 18 * den
        # Заголовок в ОДНУ строку («1 850 мл Вода» не помещается, а две
        # строки съедали половину блока и капля становилась крошечной).
        f_big = fit_font(d, spaced(wv) + ' мл', inner, 13 * den, 8 * den)
        f_sub = font(int(8 * den))
        f_name = font(int(max(6, 7.5 * den)))
        tx = big[0] + 9 * den
        ty = big[1] + 5 * den
        d.text((tx, ty), spaced(wv) + ' мл', font=f_big, fill=th['ink'])
        hb = d.textbbox((0, 0), spaced(wv) + ' мл', font=f_big)
        # «Вода» — на одной строке с числом (справа, по базовой линии), иначе
        # вторая строка съедала высоту и капля выходила крошечной.
        nb = d.textbbox((0, 0), 'Вода', font=f_name)
        if hb[2] + 4 * den + nb[2] <= inner:
            d.text((tx + hb[2] + 4 * den, ty + hb[3] - nb[3]), 'Вода',
                   font=f_name, fill=th['muted'])
            head_bottom = ty + hb[3] + 2 * den
        else:
            d.text((tx, ty + hb[3] + 1 * den), 'Вода', font=f_name,
                   fill=th['muted'])
            head_bottom = ty + hb[3] + nb[3] + 3 * den

        # Капля — в оставшемся месте под заголовком, по центру блока.
        sub = 'из %s мл' % spaced(wg)
        sb = d.textbbox((0, 0), sub, font=f_sub)
        room_top = head_bottom + 1 * den
        room_bottom = big[3] - sb[3] - 5 * den
        dh = max(10 * den, room_bottom - room_top)
        # пропорции берём у шаблона, если он положен (зеркало dropAspect)
        drop_ar = drop_aspect()
        dw = min(dh * drop_ar, left_w - 10 * den)
        dh = dw / drop_ar
        dx = (big[0] + big[2]) / 2 - dw / 2
        dy = room_top + (room_bottom - room_top - dh) / 2
        paint_drop(im, (dx, dy, dx + dw, dy + dh), pct, den, th)
        # Процент — ВНУТРИ капли: сбоку он отжимал её и мельчил.
        f_pct = font(int(max(8, min(11 * den, dh * 0.22))), bold=True)
        pl = '%d%%' % round(pct * 100)
        pb = d.textbbox((0, 0), pl, font=f_pct)
        d.text((dx + dw / 2 - pb[2] / 2, dy + dh * 0.66 - pb[3] / 2),
               pl, font=f_pct, fill=(15, 60, 70))
        d.text(((big[0] + big[2]) / 2 - sb[2] / 2, big[3] - sb[3] - 4 * den),
               sub, font=f_sub, fill=th['muted'])

        # Кнопка «+250 мл» — ВНУТРИ виджета (на референсе была снаружи).
        by0 = body_bottom - btn_h
        shadowed_tile(im, (big[0], by0, big[2], by0 + btn_h), btn_h / 2,
                      th['btn'], th['shadow'], den)
        f_btn = fit_font(d, '+250 мл', left_w - 12 * den, 11 * den, 7 * den)
        bb = d.textbbox((0, 0), '+250 мл', font=f_btn)
        d.text(((big[0] + big[2]) / 2 - bb[2] / 2,
                by0 + btn_h / 2 - bb[3] / 2 - 1 * den),
               '+250 мл', font=f_btn, fill=th['btn_ink'])

    # Сетка 2 колонки. Число рядов — сколько влезает по высоте.
    rest = [s for s in slots if s != 'water']
    grid_w = width - pad - grid_x
    cols = 2
    tw = (grid_w - gap * (cols - 1)) / cols
    grid_h = body_bottom - body_top
    min_tile = 38 * den
    rows = max(1, min(4, int((grid_h + gap) // (min_tile + gap))))
    rows = max(1, min(rows, -(-len(rest) // cols)))
    tile_h = (grid_h - gap * (rows - 1)) / rows
    shown = rest[:rows * cols]

    for i, slot in enumerate(shown):
        r, c = divmod(i, cols)
        x0 = grid_x + c * (tw + gap)
        y0 = body_top + r * (tile_h + gap)
        # Нечётный «хвост» растягиваем на обе колонки, иначе в углу зияет
        # пустое место (замечание владельца по первой сборке).
        wide = (i == len(shown) - 1 and c == 0)
        x1 = grid_x + grid_w if wide else x0 + tw
        box = (x0, y0, x1, y0 + tile_h)
        shadowed_tile(im, box, 11 * den, th['tile'], th['shadow'], den)
        colour = COLOR.get(slot, (100, 116, 139))
        px = x0 + 7 * den
        inner = (x1 - x0) - 14 * den

        # Содержимое распределяется по ВСЕЙ высоте плитки: шапка сверху,
        # значение по центру остатка, «из N» прижато к низу. Раньше всё
        # лепилось к верху и низ плитки оставался пустым (замечание владельца).
        ic = min(13 * den, tile_h * 0.26)
        lab_y = y0 + 7 * den + ic / 2
        draw_emoji(im, d, EMOJI.get(slot, '\u2022'), px, lab_y, ic, colour,
                   slot, TILES_ICONS)
        f_lab = font(int(max(7, min(10.5 * den, tile_h * 0.21))))
        lab = LABEL.get(slot, slot)
        # под шестерёнкой подпись короче, иначе заезжает под неё
        lab_room = inner - ic - 4 * den
        if r == 0 and (c == cols - 1 or wide):
            lab_room -= 4 * den
        lab = tiles_label(d, slot, lab, f_lab, lab_room)
        # не влезло даже сокращение — уменьшаем кегль, потом уже многоточие
        lab_size = int(max(7, min(10.5 * den, tile_h * 0.21)))
        while (d.textbbox((0, 0), lab, font=f_lab)[2] > lab_room
               and lab_size > int(7 * den)):
            lab_size -= 1
            f_lab = font(lab_size)
        lab = fit_label(d, lab, f_lab, lab_room)
        lb = d.textbbox((0, 0), lab, font=f_lab)
        d.text((px + ic + 4 * den, lab_y - lb[3] / 2), lab, font=f_lab,
               fill=th['muted'])
        head_b = lab_y + ic / 2 + 2 * den

        val, unit = value_lines(slot, data)
        f_unit = font(int(max(6, min(8.5 * den, tile_h * 0.15))))
        ub = d.textbbox((0, 0), unit, font=f_unit) if unit else (0, 0, 0, 0)
        foot_h = (ub[3] + 5 * den) if unit else 0
        # Значение занимает освободившуюся середину — плитка перестаёт
        # выглядеть полупустой.
        room = (y0 + tile_h - 6 * den - foot_h) - head_b
        f_val = fit_font(d, val, inner, min(17 * den, room * 0.78), 9 * den, bold=True)
        vb = d.textbbox((0, 0), val, font=f_val)
        d.text((px, head_b + (room - vb[3]) / 2 - vb[1] / 2), val,
               font=f_val, fill=th['ink'])
        if unit:
            d.text((px, y0 + tile_h - 6 * den - ub[3]), unit, font=f_unit,
                   fill=th['muted'])
    # Шестерёнка настроек — поверх всего, правый верхний угол (0.9.36).
    draw_gear(im, width - 11 * den, 11 * den, 11 * den, th['gear'])
    return im


def main():
    data = {
        'water': (1850, 2600),
        'food': (1600, 2200),
        'steps': (6430, 10000),
        'activity': (18, 21),
        'sleep': '7 ч 40 мин',
        'weight': '78,4 кг',
        'courses': '1 из 2',
        'day-mood': 'Хорошее',
    }
    rows = [
        ('светлый (основной) · вода · шаги · сон · питание',
         ['water', 'steps', 'sleep', 'food'], 'light', None),
        ('светлый · другой состав: вода · сон · вес · витамины',
         ['water', 'sleep', 'weight', 'courses'], 'light', None),
        ('тёмный (дополнительный) · тот же макет',
         ['water', 'steps', 'sleep', 'food'], 'dark', None),
        ('без воды: блок с каплей и кнопка исчезают, плитки занимают всё',
         ['steps', 'sleep', 'food', 'activity'], 'light', None),
    ]
    shots = [(t, render(s, data, theme=th, water_pct=wp), th)
             for t, s, th, wp in rows]

    pad = 28
    f = font(20, bold=True)
    w = max(s.width for _, s, _ in shots) + pad * 2
    line = f.getbbox('Ag')[3] + 12
    h = sum(s.height + line + pad for _, s, _ in shots) + pad
    sheet = Image.new('RGBA', (w, h), (18, 22, 30, 255))
    d = ImageDraw.Draw(sheet)
    y = pad
    for title, shot, theme in shots:
        if theme == 'light':
            d.rectangle((0, y - 8, w, y + line + shot.height + 10),
                        fill=TILES_THEMES['light']['sheet'])
        d.text((pad, y), title, font=f, fill=TILES_THEMES[theme]['title'])
        y += line
        sheet.alpha_composite(shot, (pad, y))
        y += shot.height + pad
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT, format='PNG')
    print('wrote', OUT, sheet.size)


if __name__ == '__main__':
    main()
