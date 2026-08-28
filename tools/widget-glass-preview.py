#!/usr/bin/env python3
"""0.9.32: предпросмотр «стеклянного» виджета (FitFlow · кольца).

ЗЕРКАЛО Java-кода. Все числа здесь обязаны совпадать с
FitFlowWidgetPaint.drawNeon()/neonPill()/neonCenter() и с отступами
разметки fitflow_widget_neon.xml в build.yml:
  кольцо   R = min(w*0.38, h-chrome-2*pad), inset 3.5+i*9.5 dp,
           толщины 7 / 6 / 5 dp
  строки   шаг 22 dp, значок 11 dp, текст с отступом 15 dp от значка
  кнопки   высота 26 dp, снизу 7 dp, по бокам 10 dp, между 8 dp
Разъедутся — предпросмотр начнёт врать, и вёрстку придётся проверять
только сборкой APK.

Скрипт НЕ участвует в сборке APK. Он повторяет то, что рисует
FitFlowWidgetPaint.drawNeon() на Canvas, чтобы подбирать вёрстку
в песочнице, где нет Android SDK. Правите Java — правьте и здесь,
иначе предпросмотр начнёт врать.

    python3 tools/widget-glass-preview.py

Пишет design/widget-glass-preview.png (несколько вариантов состава).
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path('design/widget-glass-preview.png')

# Палитра — та же, что в FitFlowWidgetPaint.
CYAN = (34, 211, 238)
ORANGE = (251, 146, 60)
PURPLE = (192, 132, 252)
GREEN = (52, 211, 153)
WHITE = (255, 255, 255)
MUTED = (168, 184, 204)

RU_MONTH_DOW = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
DOW_INDEX = 4  # пятница — только для предпросмотра

# Показатели, у которых есть кольцо (числовая пара «значение / цель»).
RINGED = ('water', 'food', 'steps', 'activity')
# Запасные контуры только для этого предпросмотра — в APK их нет.
FALLBACK_ICON = {}

LABEL = {'water': 'Вода', 'food': 'Питание', 'steps': 'Шаги',
         'activity': 'Активность', 'workout': 'Тренировка',
         'courses': 'Витамины', 'weight': 'Вес'}
UNIT = {'water': ' мл', 'food': ' ккал', 'steps': '', 'activity': ' мин'}
COLOR = {'water': CYAN, 'food': ORANGE, 'steps': PURPLE,
         'activity': GREEN, 'workout': (148, 163, 184),
         'courses': (154, 230, 180), 'weight': (148, 163, 184)}


def font(size, bold=False):
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    for base in ('/usr/share/fonts/truetype/dejavu/', '/usr/share/fonts/truetype/'):
        p = Path(base) / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def emoji_font(size):
    """Шрифт цветных эмодзи. На телефоне их рисует система, здесь берём
    NotoColorEmoji, если он есть; иначе предпросмотр покажет квадратики —
    это нормально, на устройстве значки будут цветными."""
    for path in ('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
                 '/usr/share/fonts/noto/NotoColorEmoji.ttf',
                 '/usr/share/fonts/truetype/noto-color-emoji/NotoColorEmoji.ttf'):
        p = Path(path)
        if p.exists():
            for s in (size, 109):        # у NotoColorEmoji фиксированный кегль
                try:
                    return ImageFont.truetype(str(p), s)
                except OSError:
                    continue
    return None


def draw_emoji(im, d, ch, x, mid_y, size, slot=None, colour=None):
    """Рисует эмодзи по левому краю x с центром по вертикали mid_y.

    На телефоне значки рисует система (drawText по шрифту), и они цветные.
    Если в этой машине шрифта эмодзи нет, подставляем старые векторные
    контуры — иначе предпросмотр выглядит рядом пустых квадратов.
    """
    f = emoji_font(size)
    if f is None:
        fn = FALLBACK_ICON.get(slot)
        if fn is not None:
            fn(d, x, mid_y - size / 2, size, colour or (230, 236, 245))
        else:
            d.text((x, mid_y - size / 2), ch, font=font(size), fill=(230, 236, 245))
        return
    try:
        tmp = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
        ImageDraw.Draw(tmp).text((0, 0), ch, font=f, embedded_color=True)
        bb = tmp.getbbox()
        if bb:
            glyph = tmp.crop(bb)
            k = size / max(glyph.width, glyph.height)
            glyph = glyph.resize((max(1, int(glyph.width * k)),
                                  max(1, int(glyph.height * k))),
                                 Image.Resampling.LANCZOS)
            im.alpha_composite(glyph, (int(x), int(mid_y - glyph.height / 2)))
    except Exception:
        d.text((x, mid_y - size / 2), ch, font=font(size), fill=(230, 236, 245))


def spaced(n):
    s = str(abs(int(n)))
    out = ''
    for i, ch in enumerate(s):
        if i and (len(s) - i) % 3 == 0:
            out += ' '
        out += ch
    return out


def pct(value, goal):
    return 0 if goal <= 0 else max(0, min(100, round(value * 100.0 / goal)))


def ellipsize(d, text, f, max_w):
    if d.textbbox((0, 0), text, font=f)[2] <= max_w:
        return text
    cut = text
    while cut and d.textbbox((0, 0), cut + '…', font=f)[2] > max_w:
        cut = cut[:-1]
    return (cut + '…') if cut else ''


def glass(im, den):
    """Стеклянная карточка: тёмный tint, верхний блик, тонкая кромка."""
    w, h = im.size
    r = int(20 * den)
    card = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    box = (int(1.5 * den), int(1.5 * den), w - int(1.5 * den), h - int(1.5 * den))
    d.rounded_rectangle(box, radius=r, fill=(14, 20, 34, 205))
    # Верхний блик — вертикальный градиент от белого 22 % к нулю.
    sheen = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheen)
    top = int(h * 0.34)
    for y in range(top):
        a = int(56 * (1 - y / float(top)))
        sd.line([(0, y), (w, y)], fill=(255, 255, 255, a))
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=r, fill=255)
    card.alpha_composite(Image.composite(sheen, Image.new('RGBA', (w, h), (0, 0, 0, 0)), mask))
    d.rounded_rectangle(box, radius=r, outline=(255, 255, 255, 46), width=max(1, int(1.4 * den)))
    im.alpha_composite(card)


def neon_ring(im, box, percent, colour, width, den):
    """Кольцо со свечением: дорожка, три размытых слоя, яркий сердечник."""
    sweep = max(0.0, min(1.0, percent)) * 360.0
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.arc(box, 0, 360, fill=colour + (42,), width=int(width))
    im.alpha_composite(layer)
    if sweep <= 0.5:
        return
    for i in range(3):
        extra = width * (2.1 - i * 0.7)
        gl = Image.new('RGBA', im.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(gl)
        gd.arc(box, -90, -90 + sweep, fill=colour + (40 + i * 34,),
               width=max(1, int(width + extra)))
        gl = gl.filter(ImageFilter.GaussianBlur(width * (1.6 - i * 0.4)))
        im.alpha_composite(gl)
    core = Image.new('RGBA', im.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(core)
    cd.arc(box, -90, -90 + sweep, fill=colour + (255,), width=int(width))
    hi = tuple(min(255, ch + 40) for ch in colour)
    cd.arc(box, -90, -90 + sweep, fill=hi + (255,), width=max(2, int(width / 3)))
    im.alpha_composite(core)


def icon_drop(d, x, y, s, colour):
    pts = []
    for i in range(121):
        a = -math.pi / 2 + 2 * math.pi * i / 120
        t = (math.sin(a) + 1) / 2
        k = t ** 0.62
        pts.append((x + s / 2 + math.cos(a) * s * 0.42 * k,
                    y + s * 0.06 + (s * 0.60 + math.sin(a) * s * 0.42 - s * 0.06) * (0.30 + 0.70 * k)))
    d.polygon(pts, fill=colour)


def icon_flame(d, x, y, s, colour):
    """Костёр/пламя — показатель «Питание» (как на референсе владельца)."""
    pts = []
    for i in range(101):
        t = i / 100.0
        a = math.pi * 2 * t
        # каплевидное пламя с языком вверх
        r = 0.34 + 0.10 * math.cos(a * 3)
        pts.append((x + s / 2 + math.sin(a) * s * r,
                    y + s * 0.56 - math.cos(a) * s * (r * 1.30 if math.cos(a) > 0 else r)))
    d.polygon(pts, fill=colour)
    inner = []
    for i in range(101):
        t = i / 100.0
        a = math.pi * 2 * t
        r = 0.17
        inner.append((x + s / 2 + math.sin(a) * s * r,
                      y + s * 0.66 - math.cos(a) * s * (r * 1.15 if math.cos(a) > 0 else r)))
    d.polygon(inner, fill=(255, 236, 200))


def icon_sneaker(d, x, y, s, colour):
    d.rounded_rectangle((x + s * 0.06, y + s * 0.58, x + s * 0.96, y + s * 0.80),
                        radius=s / 7, fill=colour)
    d.polygon([(x + s * 0.16, y + s * 0.60), (x + s * 0.25, y + s * 0.30),
               (x + s * 0.54, y + s * 0.24), (x + s * 0.64, y + s * 0.44),
               (x + s * 0.92, y + s * 0.60)], fill=colour)


def icon_clock(d, x, y, s, colour):
    m = max(2, int(s / 9))
    d.ellipse((x + s * 0.10, y + s * 0.10, x + s * 0.90, y + s * 0.90),
              outline=colour, width=m)
    cx, cy = x + s / 2, y + s / 2
    d.line((cx, cy, cx, y + s * 0.26), fill=colour, width=m)
    d.line((cx, cy, x + s * 0.72, y + s * 0.60), fill=colour, width=m)


def icon_dumbbell(d, x, y, s, colour):
    """Гантель — строка-статус «Тренировка»."""
    m = max(2, int(s / 7))
    cy = y + s / 2
    d.line((x + s * 0.20, cy, x + s * 0.80, cy), fill=colour, width=m)
    for bx in (0.16, 0.84):
        d.rounded_rectangle((x + s * bx - m, cy - s * 0.26, x + s * bx + m, cy + s * 0.26),
                            radius=m, fill=colour)


def icon_bottle(d, x, y, s, colour):
    d.rounded_rectangle((x + s * 0.40, y + s * 0.06, x + s * 0.60, y + s * 0.24),
                        radius=s / 12, fill=colour)
    d.rounded_rectangle((x + s * 0.28, y + s * 0.22, x + s * 0.72, y + s * 0.94),
                        radius=s / 5, fill=colour)


def icon_check(d, x, y, s, colour):
    m = max(2, int(s / 7))
    d.ellipse((x + s * 0.06, y + s * 0.06, x + s * 0.94, y + s * 0.94),
              outline=colour, width=m)
    d.line((x + s * 0.30, y + s * 0.52, x + s * 0.45, y + s * 0.68),
           fill=colour, width=m)
    d.line((x + s * 0.45, y + s * 0.68, x + s * 0.72, y + s * 0.33),
           fill=colour, width=m)


# 0.9.33: значки — системные эмодзи, как на референсе владельца.
# Свои контуры из линий в 11 dp читались как клякса.
EMOJI = {'water': '💧', 'food': '🔥', 'steps': '👟', 'activity': '🏃',
         'workout': '🏋️', 'courses': '💊', 'weight': '⚖️',
         'day-mood': '🌗', 'day-plan': '📋'}
RINGED = ('water', 'food', 'steps', 'activity')
# Запасные контуры только для этого предпросмотра — в APK их нет.
FALLBACK_ICON = {}


def draw_gear(d, cx, cy, s, den):
    """Шестерёнка настроек. Середину не вырезаем прозрачностью: под виджетом
    обои пользователя, дыра в стекле выглядела бы браком. Обод — обводкой."""
    colour = (150, 160, 176)
    r_out, r_in = s * 0.50, s * 0.30
    for i in range(8):
        a = math.radians(i * 45)
        pts = []
        for da, r in ((-14, r_in), (-10, r_out), (10, r_out), (14, r_in)):
            ang = a + math.radians(da)
            pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
        d.polygon(pts, fill=colour + (140,))
    rr = r_in * 0.82
    d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=colour + (140,),
              width=max(1, int(s * 0.16)))


FALLBACK_ICON.update({
    'water': icon_drop, 'food': icon_flame, 'steps': icon_sneaker,
    'activity': icon_clock, 'workout': icon_dumbbell,
    'courses': icon_check, 'weight': icon_clock,
    'btn-water': icon_bottle, 'btn-food': icon_flame, 'btn-dose': icon_check,
})


def pill_button(im, box, colour, emoji, label, den, btn_slot=None):
    """Кнопка-пилюля: полупрозрачная заливка, цветная кромка, значок + текст."""
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = box
    r = (y1 - y0) // 2
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle(box, radius=r, fill=colour + (28,))
    ld.rounded_rectangle(box, radius=r, outline=colour + (190,),
                         width=max(1, int(1.5 * den)))
    im.alpha_composite(layer)

    f = font(int(9 * den), bold=False)
    s = int(11 * den)
    tw = d.textbbox((0, 0), label, font=f)[2]
    total = s + int(5 * den) + tw
    ix = (x0 + x1) / 2 - total / 2
    draw_emoji(im, d, emoji, ix, (y0 + y1) / 2, s,
               slot=btn_slot, colour=colour)
    th = d.textbbox((0, 0), label, font=f)[3]
    d.text((ix + s + int(5 * den), (y0 + y1) / 2 - th / 2), label, font=f, fill=colour)


def slot_line(slot, data):
    """Текст строки справа. Кольцевые — «значение / цель», прочие — статус."""
    v = data.get(slot)
    if isinstance(v, tuple):
        return '%s: %s / %s%s' % (LABEL[slot], spaced(v[0]), spaced(v[1]),
                                  UNIT.get(slot, ''))
    return '%s: %s' % (LABEL[slot], v)


def render(slots, data, today, width=760, height=428):
    """slots — список показателей в порядке пользователя (как widgetItems).

    ЗЕРКАЛО FitFlowWidgetPaint.drawNeon(). Все числа обязаны совпадать —
    их сверяет тест «0.9.32 предпросмотр — зеркало drawNeon».
    """
    im = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    den = width / 250.0            # ячейка ~250 dp по ширине
    glass(im, den)
    d = ImageDraw.Draw(im)

    pad = 10 * den
    chrome = 34 * den              # полоса кнопок внизу

    # 0.9.33: сколько строк влезает по высоте, столько и показываем —
    # шрифт при этом не уменьшаем (решение владельца «автоматически»).
    row_h = 23 * den
    # Полоса списка начинается ПОД шестерёнкой (14 dp + зазор), иначе
    # последняя строка вылезала бы под значок настроек.
    list_top = pad + 14 * den + 4 * den
    list_bottom = height - chrome - 4 * den
    max_rows = int((list_bottom - list_top) // row_h)
    max_rows = max(1, min(6, max_rows))

    # Кольца достаются только показателям с парой «значение / цель»,
    # и их не больше трёх. Остальные живут строкой справа.
    ringed, others = [], []
    for s in slots:
        (ringed if s in RINGED and len(ringed) < 3 else others).append(s)
    shown = (ringed + others)[:max_rows]

    R = min(width * 0.38, height - chrome - pad * 2)
    R = max(R, 48 * den)
    cx = cy = pad
    widths = [7 * den, 6 * den, 5 * den]
    drawn = 0
    for slot in ringed:
        if drawn >= 3:
            break
        inset = 3.5 * den + drawn * 9.5 * den
        box = (cx + inset, cy + inset, cx + R - inset, cy + R - inset)
        if box[2] - box[0] < 16 * den:
            break
        neon_ring(im, box, pct(*data[slot]) / 100.0, COLOR[slot], widths[drawn], den)
        drawn += 1

    # ---- центр кольца: дата и день недели ----
    # Средний процент не показываем: он не хранится в приложении и «плывёт»
    # при смене состава показателей (решение владельца, 0.9.32).
    rings_n = max(1, drawn)
    hole = R - 2 * (3.5 * den + (rings_n - 1) * 9.5 * den) - 2 * widths[rings_n - 1]
    avail = hole * 0.86
    dt_long, dow_long = today
    dt_short, dow_short = today[0][:5], RU_MONTH_DOW[DOW_INDEX]
    f_date = f_dow = None
    dt = dow = ''
    floor = max(7, int(6.5 * den))     # ниже этого дата уже не читается
    for cand_dt, cand_dow in ((dt_long, dow_long), (dt_short, dow_short),
                              (dt_short, '')):
        for size in range(int(hole * 0.34), floor - 1, -1):
            fd = font(size, bold=True)
            fw = font(max(7, int(size * 0.74)))
            if (d.textbbox((0, 0), cand_dt, font=fd)[2] <= avail
                    and (not cand_dow
                         or d.textbbox((0, 0), cand_dow, font=fw)[2] <= avail)):
                f_date, f_dow, dt, dow = fd, fw, cand_dt, cand_dow
                break
        if f_date:
            break
    ccx, ccy = cx + R / 2, cy + R / 2
    if f_date:
        bb = d.textbbox((0, 0), dt, font=f_date)
        if dow:
            bb2 = d.textbbox((0, 0), dow, font=f_dow)
            gap = 2 * den
            top = ccy - (bb[3] + gap + bb2[3]) / 2
            d.text((ccx - bb[2] / 2, top), dt, font=f_date, fill=WHITE)
            d.text((ccx - bb2[2] / 2, top + bb[3] + gap), dow, font=f_dow, fill=MUTED)
        else:
            d.text((ccx - bb[2] / 2, ccy - bb[3] / 2), dt, font=f_date, fill=WHITE)

    # ---- шестерёнка в правом верхнем углу (пункт 4) ----
    gear_s = 14 * den
    gear_cy = pad + gear_s / 2
    draw_gear(d, width - pad - gear_s / 2, gear_cy, gear_s, den)

    # ---- правая колонка: значок, подпись, значения ----
    # 0.9.33: отодвинута от кольца (10 -> 16 dp) и укрупнена (10 -> 11.5 dp).
    lx = cx + R + 16 * den
    tx = lx + 17 * den
    room = width - tx - pad
    size = 11.5 * den
    min_size = max(6, 7 * den)
    f_row = None
    while size > min_size:
        cand = font(int(size), bold=True)
        if all(d.textbbox((0, 0), slot_line(s, data), font=cand)[2] <= room
               for s in shown):
            f_row = cand
            break
        size -= 0.5
    if f_row is None:
        f_row = font(int(min_size), bold=True)
    # Список центрирован по кольцу, но при большом числе строк центрирование
    # вынесло бы их за карточку — зажимаем блок в отведённую полосу.
    block = len(shown) * row_h
    ly = cy + R / 2 - block / 2 + 2 * den
    ly = max(list_top, min(ly, list_bottom - block))
    for slot in shown:
        mid = ly + 6 * den
        draw_emoji(im, d, EMOJI.get(slot, '•'), lx, mid, size,
                   slot=slot, colour=COLOR.get(slot, (230, 236, 245)))
        # Строка под шестерёнкой обрывается раньше, чтобы не лезть под неё.
        row_room = room - (gear_s + 6 * den) if mid < gear_cy + gear_s else room
        txt = ellipsize(d, slot_line(slot, data), f_row, row_room)
        th = d.textbbox((0, 0), txt, font=f_row)[3]
        d.text((tx, mid - th / 2), txt, font=f_row, fill=WHITE)
        ly += row_h

    # ---- кнопки: набор следует составу виджета (пункт 6) ----
    btns = []
    if 'water' in slots:
        btns.append((CYAN, '🍶', '+250 мл', 'btn-water'))
    if 'food' in slots:
        btns.append((ORANGE, '🍽️', 'Еда', 'btn-food'))
    if 'courses' in slots:
        done, total = data.get('courses_done', (0, 0))
        all_done = done > 0 and done >= total
        btns.append(((52, 211, 153) if all_done else (154, 230, 180),
                     '✅' if all_done else '💊',
                     'готово' if all_done else ('%d/%d' % (done, total) if total else 'Витамины'),
                     'btn-dose'))
    if not btns:
        return im
    bh = 26 * den
    by1 = height - 7 * den
    by0 = by1 - bh
    gap = 8 * den
    inner = width - 2 * pad
    bw = (inner - gap * (len(btns) - 1)) / len(btns)
    bx = pad
    for colour, emoji, label, bslot in btns:
        pill_button(im, (bx, by0, bx + bw, by1), colour, emoji, label, den,
                    btn_slot=bslot)
        bx += bw + gap
    return im


def main():
    data = {
        'water': (1850, 2500),
        'food': (1600, 2200),
        'steps': (8430, 10000),
        'activity': (18, 21),
        'workout': 'Ноги и плечи',
        'courses': '1 из 2',
        'weight': '78,4 кг',
        'courses_done': (1, 2),
    }
    today = ('28.08.2026', 'пятница')
    variants = [
        ('как на референсе: вода · питание · шаги', ['water', 'food', 'steps']),
        ('высокая ячейка 4x3: строк влезает больше, шрифт тот же',
         ['water', 'food', 'steps', 'activity', 'workout', 'weight']),
        ('без питания: пропала и дуга, и кнопка «Еда»',
         ['water', 'steps', 'courses']),
    ]
    # У высокого варианта ячейка выше — на ней видно, что число строк
    # подбирается автоматически, а кегль остаётся прежним.
    shots = []
    for i, (title, s) in enumerate(variants):
        shots.append((title, render(s, data, today,
                                    height=620 if i == 1 else 428)))

    pad = 28
    f = font(20, bold=True)
    w = max(s.width for _, s in shots) + pad * 2
    line = f.getbbox('Ag')[3] + 12
    h = sum(s.height + line + pad for _, s in shots) + pad
    sheet = Image.new('RGBA', (w, h), (18, 22, 30, 255))
    d = ImageDraw.Draw(sheet)
    y = pad
    for title, shot in shots:
        d.text((pad, y), title, font=f, fill='#C7CEDA')
        y += line
        sheet.alpha_composite(shot, (pad, y))
        y += shot.height + pad
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT, format='PNG')
    print('wrote', OUT, sheet.size)


if __name__ == '__main__':
    main()
