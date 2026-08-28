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

LABEL = {'water': 'Вода', 'food': 'Питание', 'steps': 'Шаги',
         'activity': 'Активность', 'workout': 'Тренировка'}
UNIT = {'water': ' мл', 'food': ' ккал', 'steps': '', 'activity': ' мин'}
COLOR = {'water': CYAN, 'food': ORANGE, 'steps': PURPLE,
         'activity': GREEN, 'workout': (148, 163, 184)}


def font(size, bold=False):
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    for base in ('/usr/share/fonts/truetype/dejavu/', '/usr/share/fonts/truetype/'):
        p = Path(base) / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


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


ICON = {'water': icon_drop, 'food': icon_flame, 'steps': icon_sneaker,
        'activity': icon_clock, 'workout': icon_dumbbell}


def pill_button(im, box, colour, label, icon_fn, den):
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
    icon_fn(d, ix, (y0 + y1) / 2 - s / 2, s, colour)
    th = d.textbbox((0, 0), label, font=f)[3]
    d.text((ix + s + int(5 * den), (y0 + y1) / 2 - th / 2), label, font=f, fill=colour)


def render(slots, data, today, width=760, height=428):
    """slots — список показателей в порядке пользователя (как widgetItems)."""
    im = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    den = width / 250.0            # ячейка ~250 dp по ширине
    glass(im, den)
    d = ImageDraw.Draw(im)

    pad = 10 * den
    chrome = 34 * den              # полоса кнопок внизу

    # ---- кольца: только показатели с числовой парой ----
    ringed = [s for s in slots if s in RINGED]
    R = min(width * 0.38, height - chrome - pad * 2)
    R = max(R, 48 * den)
    cx = pad
    cy = pad
    widths = [7 * den, 6 * den, 5 * den]
    for i, slot in enumerate(ringed[:3]):
        inset = 3.5 * den + i * 9.5 * den
        box = (cx + inset, cy + inset, cx + R - inset, cy + R - inset)
        if box[2] - box[0] < 16 * den:
            break
        neon_ring(im, box, pct(*data[slot]) / 100.0, COLOR[slot], widths[i], den)

    # ---- центр кольца: дата и день недели ----
    # Средний процент не показываем: он не хранится в приложении и «плывёт»
    # при смене состава показателей (решение владельца, 0.9.32).
    # Дырка внутри последнего кольца. Кегль и сама надпись подбираются под
    # неё: сначала пробуем «28.08.2026 / пятница», если не лезет — «28.08 / пт».
    # Так виджет не врёт и не обрезает дату многоточием на узких ячейках.
    rings_n = max(1, min(3, len(ringed)))
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

    # ---- правая колонка: значок, подпись, значения ----
    lx = cx + R + 10 * den
    rows = slots[:3]
    row_h = 22 * den
    ly = pad + 8 * den
    # Вертикально центрируем блок строк относительно кольца.
    block = len(rows) * row_h
    ly = cy + R / 2 - block / 2 + 2 * den
    def row_text(slot):
        if slot == 'workout':
            return LABEL[slot] + ': ' + data[slot]
        v, g = data[slot]
        return '%s: %s / %s%s' % (LABEL[slot], spaced(v), spaced(g), UNIT[slot])

    # Кегль общий для всех строк и подобран по самой длинной: разнобой
    # размеров в списке выглядит неряшливо, а срезать подпись нельзя —
    # без неё «1 600 / 2 200 ккал» читается хуже.
    room0 = width - (lx + 15 * den) - pad
    f_row = None
    for size in range(int(10 * den), max(6, int(6.5 * den)) - 1, -1):
        cand = font(size, bold=True)
        if all(d.textbbox((0, 0), row_text(s), font=cand)[2] <= room0
               for s in rows if s != 'workout'):
            f_row = cand
            break
    if f_row is None:
        f_row = font(max(6, int(6.5 * den)), bold=True)
    for slot in rows:
        colour = COLOR[slot]
        ICON[slot](d, lx, ly + 1 * den, 11 * den, colour)
        txt = row_text(slot)
        tx = lx + 15 * den
        room = width - tx - pad
        txt = ellipsize(d, txt, f_row, room)
        th = d.textbbox((0, 0), txt, font=f_row)[3]
        d.text((tx, ly + 6 * den - th / 2), txt, font=f_row, fill=WHITE)
        ly += row_h

    # ---- кнопки ----
    bh = 26 * den
    by1 = height - 7 * den
    by0 = by1 - bh
    gap = 8 * den
    inner = width - 2 * (10 * den)
    bw = (inner - gap * 2) / 3
    bx = 10 * den
    for colour, label, icon_fn in ((CYAN, '+250 мл', icon_bottle),
                                   (ORANGE, 'Еда', icon_flame),
                                   (GREEN, 'Витамины', icon_check)):
        pill_button(im, (bx, by0, bx + bw, by1), colour, label, icon_fn, den)
        bx += bw + gap
    return im


def main():
    data = {
        'water': (1850, 2500),
        'food': (1600, 2200),
        'steps': (8430, 10000),
        'activity': (18, 21),
        'workout': 'Ноги и плечи',
    }
    today = ('28.08.2026', 'пятница')
    variants = [
        ('как на референсе: вода · питание · шаги', ['water', 'food', 'steps']),
        ('шаги · активность · тренировка (строка-статус)', ['steps', 'activity', 'workout']),
        ('два показателя: вода · шаги', ['water', 'steps']),
    ]
    shots = [(t, render(s, data, today)) for t, s in variants]

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
