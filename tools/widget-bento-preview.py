#!/usr/bin/env python3
"""0.9.30: предпросмотр бенто (раскладка 4x2) — как его соберёт Android из подложки и overlay.

Скрипт НЕ участвует в сборке APK. Он существует ровно затем, чтобы
проверять вёрстку в песочнице, где нет Android SDK: повторяет ту же
сетку весов, что лежит в android-res/layout/fitflow_widget_bento.xml,
и рисует поверх подложки те же тексты, кольца, шкалы и кнопки.

Если правите разметку — правьте и проценты здесь, иначе предпросмотр
начнёт врать.

    python3 tools/widget-bento-preview.py

Пишет design/widget-bento-preview.png (три варианта состава слотов).
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BG = Path('design/widget_bento_bg_round.png')
OUT = Path('design/widget-bento-preview.png')

ICONS = {
    'steps': 'design/widget_bento_shoe.png',
    'water': 'design/widget_bento_ic_drop.png',
    'food': 'design/widget_bento_ic_plate.png',
    'activity': 'design/widget_bento_ic_clock.png',
    # 0.9.40: своих PNG у бенто ровно шесть, новые требуют правки сборки,
    # поэтому строковым показателям отдаём подходящие из имеющихся.
    'sleep': 'design/widget_bento_ic_clock.png',
    'weight': 'design/widget_bento_ic_pencil.png',
    'day-plan': 'design/widget_bento_ic_pencil.png',
    'day-mood': 'design/widget_bento_ic_pencil.png',
    'workout': 'design/widget_bento_ic_pencil.png',
    'courses': 'design/widget_bento_ic_pencil.png',
}
PENCIL = 'design/widget_bento_ic_pencil.png'
GEAR = 'design/widget_bento_ic_gear.png'

COLORS = {
    'water': '#00D2B4',
    'food': '#FF6B4A',
    'activity': '#38BDF8',
    'steps': '#C084FC',
    'sleep': '#818CF8',
    'weight': '#94A3B8',
    'day-plan': '#94A3B8',
    'day-mood': '#F59E0B',
    'workout': '#94A3B8',
    'courses': '#10B981',
}
LABEL = {'water': 'Вода', 'food': 'Калории', 'activity': 'Активность', 'steps': 'Шаги',
         'sleep': 'Сон', 'weight': 'Вес', 'day-plan': 'План дня',
         'day-mood': 'Самочувствие', 'workout': 'Тренировка', 'courses': 'Витамины'}
UNIT = {'water': ' мл', 'food': ' ккал', 'activity': ' мин', 'steps': ''}

# 0.9.40: показатели без пары «значение / цель» — зеркало SUPPORTED_LINES
# в FitFlowWidgetBentoProvider. Значение печатается строкой, шкалы нет.
LINES = ('sleep', 'weight', 'day-plan', 'day-mood', 'workout', 'courses')


def is_line(slot):
    return slot in LINES

TRACK = '#2A2E36'
WHITE = '#FFFFFF'
MUTED = '#98A0AE'

# Веса из разметки (см. weightSum в fitflow_widget_bento.xml).
# 0.9.30: раскладка 4x2 — вертикальные поля и промежуток ужаты.
PAD_V = 26 / 1000.0
ROW = 948 / 1000.0
PAD_H = 30 / 1000.0
LEFT = 448 / 1000.0
MID = 25 / 1000.0
RIGHT = 467 / 1000.0
SMALL = 480 / 1000.0
GAP_V = 40 / 1000.0
# 0.9.41: промежуток между половинками нижнего ряда (weight 36 из 2036).
SPLIT_GAP = 36 / 2036.0


def font(size, bold=False):
    # На виджете стоит sans-serif (Roboto). В песочнице берём DejaVu —
    # метрики близкие, для проверки вёрстки этого достаточно.
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    for base in ('/usr/share/fonts/truetype/dejavu/',
                 '/usr/share/fonts/truetype/'):
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


def ellipsize(draw, text, f, max_w):
    """Обрезает строку многоточием — как android:ellipsize="end".

    Предпросмотр обязан врать не в нашу пользу: если текст не влезает,
    он должен обрезаться здесь так же, как обрежется на телефоне.
    """
    if draw.textbbox((0, 0), text, font=f)[2] <= max_w:
        return text
    cut = text
    while cut and draw.textbbox((0, 0), cut + '…', font=f)[2] > max_w:
        cut = cut[:-1]
    return (cut + '…') if cut else ''


def pct(value, goal):
    if goal <= 0:
        return 0
    return max(0, min(100, round(value * 100.0 / goal)))


def paste_icon(im, path, box, target_h):
    icon = Image.open(path).convert('RGBA')
    k = target_h / icon.height
    icon = icon.resize((max(1, int(icon.width * k)), target_h), Image.Resampling.LANCZOS)
    cx = (box[0] + box[2]) // 2
    cy = (box[1] + box[3]) // 2
    im.alpha_composite(icon, (cx - icon.width // 2, cy - icon.height // 2))


def ring(im, cx, cy, r, thickness, colour, percent):
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    box = (cx - r, cy - r, cx + r, cy + r)
    d.arc(box, 0, 360, fill=colour + '55', width=thickness)
    if percent > 0:
        d.arc(box, -90, -90 + 360 * percent / 100.0, fill=colour, width=thickness)
    im.alpha_composite(layer)


def pill(im, box, colour, percent):
    """Шкала-пилюля. Радиус = половина высоты, поэтому оба конца круглые."""
    x0, y0, x1, y1 = box
    h = y1 - y0
    r = h // 2
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(box, radius=r, fill=TRACK)
    if percent > 0:
        w = max(h, int((x1 - x0) * percent / 100.0))
        d.rounded_rectangle((x0, y0, x0 + w, y1), radius=r, fill=colour)
    im.alpha_composite(layer)


def circle_button(im, cx, cy, r, colour, text=None, icon=None):
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=colour)
    im.alpha_composite(layer)
    if text:
        d2 = ImageDraw.Draw(im)
        f = font(max(9, int(r * 0.44)), bold=True)
        lines = text.split('\n')
        total = sum(d2.textbbox((0, 0), ln, font=f)[3] for ln in lines)
        y = cy - total // 2
        for ln in lines:
            bb = d2.textbbox((0, 0), ln, font=f)
            d2.text((cx - bb[2] // 2, y), ln, font=f, fill='#082028')
            y += bb[3]
    if icon:
        ic = Image.open(icon).convert('RGBA')
        k = (r * 1.05) / max(ic.width, ic.height)
        ic = ic.resize((max(1, int(ic.width * k)), max(1, int(ic.height * k))),
                       Image.Resampling.LANCZOS)
        im.alpha_composite(ic, (cx - ic.width // 2, cy - ic.height // 2))


# 0.9.41: короткие подписи для половинок — зеркало labelNarrow() в Java.
LABEL_NARROW = {'day-mood': 'Настрой', 'activity': 'Актив.', 'day-plan': 'План',
                'workout': 'Спорт', 'food': 'Ккал'}


def line_narrow(value):
    """«7 ч 40 мин» → «7 ч 40» — зеркало lineNarrow() в Java."""
    s = (value or '').strip()
    if s.endswith(' мин') and ' ч ' in s:
        s = s[:-4]
    if s.endswith(' кг'):
        s = s[:-3]
    # 0.9.42: «принято 2 из 2 ✓» → «2 из 2 ✓» (слово избыточно — плита
    # уже подписана «Витамины»), хвост «· след. 12:00» отбрасываем.
    if s.startswith('принято '):
        s = s[8:]
    mid = s.find(' · ')
    if mid > 0:
        s = s[:mid]
    if s.startswith('нет на'):
        return 'нет'
    if s.startswith('курс не'):
        return 'нет курса'
    # Галочки ✓ в Manrope нет (подставляется системным шрифтом,
    # ширина непредсказуема), а в узкой плите она избыточна.
    if s.endswith(' ✓'):
        s = s[:-2].strip()
    return s


def card(im, box, dp):
    """Фон плиты нижнего ряда — зеркало drawable/fitflow_bento_card.xml.

    0.9.41: раньше все плиты были впечатаны в подложку, но нижний ряд стал
    переменным (одна широкая или две половинки), поэтому его фон рисует
    разметка. Цвета те же, что у плит подложки.
    """
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(box, radius=int(8 * dp),
                        fill=(27, 30, 36, 255), outline=(38, 42, 50, 255), width=1)


def small_slot(im, box, slot, data, dp, narrow=False):
    """Плита B/C: подпись, значение, цель, шкала во всю ширину,
    круглая кнопка в правом верхнем углу (0.9.30)."""
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = box
    line = is_line(slot)
    value, goal = (0, 1) if line else data[slot]
    colour = COLORS[slot]

    # 0.9.41: в половинке кнопки нет — круг 38 dp съел бы половину
    # ширины и значение перестало бы помещаться.
    has_btn = (not narrow) and slot in ('water', 'food')
    pad_end = int(46 * dp) if has_btn else int((10 if narrow else 14) * dp)
    tx = x0 + int((10 if narrow else 14) * dp)
    ty = y0 + int(4 * dp)

    f_label = font(int((11 if narrow else 12) * dp))
    f_goal = font(int((10 if narrow else 11) * dp))
    # 0.9.42: кегль значения подбирается под ширину плиты — зеркало fitSp().
    room = (x1 - pad_end) - (x0 + int((10 if narrow else 14) * dp))
    shown_probe = data[slot] if is_line(slot) else spaced(value)
    if narrow and is_line(slot):
        shown_probe = line_narrow(shown_probe)
    vs = (14 if narrow else 17) * dp
    while vs > 9 * dp and len(shown_probe) * vs * 0.55 > room:
        vs -= 0.5 * dp
    f_value = font(int(vs), bold=True)

    lab = LABEL_NARROW.get(slot, LABEL[slot]) if narrow else LABEL[slot]
    d.text((tx, ty), lab, font=f_label, fill=MUTED)
    ty += f_label.getbbox('Ag')[3] + int(1 * dp)
    shown = data[slot] if line else spaced(value)
    if narrow and line:
        shown = line_narrow(shown)
    d.text((tx, ty), ellipsize(d, shown, f_value, x1 - pad_end - tx),
           font=f_value, fill=WHITE)
    if not line:
        ty += f_value.getbbox('0')[3]
        goal_txt = ('из ' + spaced(goal)) if narrow else ('из ' + spaced(goal) + UNIT[slot])
        d.text((tx, ty), ellipsize(d, goal_txt, f_goal,
                                   x1 - pad_end - tx), font=f_goal, fill=MUTED)

    # Шкала — отдельным слоем, во всю ширину плиты: кнопка ей больше
    # не мешает, потому что уехала наверх. У строкового показателя её нет:
    # заполнять нечем (0.9.40).
    if not line:
        bar_h = int(10 * dp)
        bar_bottom = y1 - int(5 * dp)
        pill(im, (tx, bar_bottom - bar_h, x1 - int((10 if narrow else 14) * dp),
                  bar_bottom), colour, pct(value, goal))

    if has_btn:
        r = int(19 * dp)
        cx = x1 - int(8 * dp) - r
        cy = y0 + int(6 * dp) + r
        if slot == 'water':
            circle_button(im, cx, cy, r, '#00B79E', text='+250\nмл')
        else:
            circle_button(im, cx, cy, r, '#D9714A', icon=PENCIL)


def render(slots, data, width=960):
    bg = Image.open(BG).convert('RGBA')
    k = width / bg.width
    im = bg.resize((width, int(bg.height * k)), Image.Resampling.LANCZOS)
    W, H = im.size
    dp = W / 320.0  # ячейка 4x2 ≈ 320 dp по ширине

    top = H * PAD_V
    row_h = H * ROW
    x = W * PAD_H
    left_w = W * LEFT
    a_box = (int(x), int(top), int(x + left_w), int(top + row_h))

    x2 = x + left_w + W * MID
    right_w = W * RIGHT
    small_h = row_h * SMALL
    b_box = (int(x2), int(top), int(x2 + right_w), int(top + small_h))
    c_top = top + small_h + row_h * GAP_V
    c_box = (int(x2), int(c_top), int(x2 + right_w), int(c_top + small_h))

    d = ImageDraw.Draw(im)

    # --- слот A ---
    a = slots[0]
    a_line = is_line(a)
    value, goal = (0, 1) if a_line else data[a]
    f_label = font(int(12 * dp))
    d.text((a_box[0] + int(14 * dp), a_box[1] + int(10 * dp)),
           LABEL[a], font=f_label, fill=MUTED)

    # 0.9.30: шестерёнка в правом верхнем углу — вход в настройки состава.
    gear = Image.open(GEAR).convert('RGBA')
    gs = int(16 * dp)
    gear = gear.resize((gs, gs), Image.Resampling.LANCZOS)
    gear.putalpha(gear.getchannel('A').point(lambda v: int(v * 0.55)))
    im.alpha_composite(gear, (a_box[2] - int(8 * dp) - gs, a_box[1] + int(8 * dp)))

    ring_r = int(35 * dp)
    cx = (a_box[0] + a_box[2]) // 2
    cy = (a_box[1] + a_box[3]) // 2 - int(12 * dp)
    if not a_line:
        ring(im, cx, cy, ring_r, int(6 * dp), COLORS[a], pct(value, goal))
    paste_icon(im, ICONS[a], (cx - 1, cy - 1, cx + 1, cy + 1), int(40 * dp))

    # Значение и цель — две строки, как в малых плитах.
    f_value = font(int(20 * dp), bold=True)
    f_goal = font(int(11 * dp))
    txt = data[a] if a_line else spaced(value)
    g = '' if a_line else 'из ' + spaced(goal) + UNIT[a]
    bb = d.textbbox((0, 0), txt, font=f_value)
    gb = d.textbbox((0, 0), g, font=f_goal)
    cxm = (a_box[0] + a_box[2]) // 2
    by = a_box[3] - int(8 * dp) - bb[3] - gb[3] - int(2 * dp)
    d.text((cxm - bb[2] // 2, by), txt, font=f_value, fill=WHITE)
    d.text((cxm - gb[2] // 2, by + bb[3] + int(2 * dp)), g, font=f_goal, fill=MUTED)

    if slots[1] if len(slots) > 1 else None:
        small_slot(im, b_box, slots[1], data, dp)

    # 0.9.41: нижний ряд — широкая плита или две половинки.
    c_slot = slots[2] if len(slots) > 2 else None
    d_slot = slots[3] if len(slots) > 3 else None
    if d_slot:
        gap = right_w * SPLIT_GAP
        half = (right_w - gap) / 2
        c_half = (c_box[0], c_box[1], int(c_box[0] + half), c_box[3])
        d_half = (int(c_box[0] + half + gap), c_box[1], c_box[2], c_box[3])
        for box, slot in ((c_half, c_slot), (d_half, d_slot)):
            card(im, box, dp)
            small_slot(im, box, slot, data, dp, narrow=True)
    elif c_slot:
        card(im, c_box, dp)
        small_slot(im, c_box, c_slot, data, dp)

    return im


def main():
    data = {
        'steps': (39, 8000),
        'water': (1000, 2300),
        'food': (0, 2500),
        'activity': (18, 21),
    }
    # 0.9.40: строковые показатели — готовый текст, как его считает app.js.
    data['sleep'] = '7 ч 40 мин'
    data['weight'] = '78,4 кг'
    data['day-plan'] = '2 из 3'
    data['day-mood'] = '4/5'
    data['workout'] = 'отдых'
    data['courses'] = 'принято 2 из 2 ✓'
    variants = [
        ('по умолчанию: шаги · вода · калории', ['steps', 'water', 'food']),
        ('питание заменено активностью', ['steps', 'water', 'activity']),
        ('вода крупно, без питания', ['water', 'steps', 'activity']),
        ('0.9.40: выбран сон — плита со строкой, а не пустой блок',
         ['steps', 'water', 'sleep']),
        ('0.9.40: только строковые показатели', ['sleep', 'weight', 'day-plan']),
        ('0.9.41: нижний блок разделён — четыре показателя',
         ['steps', 'water', 'food', 'sleep']),
        ('0.9.41: деление с длинными значениями',
         ['water', 'steps', 'sleep', 'weight']),
        ('0.9.42: витамины в половинке — «принято» больше не режется',
         ['steps', 'water', 'courses', 'day-mood']),
    ]
    shots = [(title, render(slots, data)) for title, slots in variants]

    pad = 28
    f = font(20, bold=True)
    w = max(s.width for _, s in shots) + pad * 2
    line = f.getbbox('Ag')[3] + 12
    h = sum(s.height + line + pad for _, s in shots) + pad
    sheet = Image.new('RGBA', (w, h), (12, 14, 18, 255))
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
