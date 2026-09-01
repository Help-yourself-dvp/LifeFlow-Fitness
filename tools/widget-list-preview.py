#!/usr/bin/env python3
"""0.9.47: предпросмотр классического виджета «FitFlow · список».

Зачем: пункт 9 владельца — у «списка» в системном перечне виджетов не было
картинки, поэтому лаунчер подставлял иконку приложения и отличить его от
остальных было нельзя. Картинка обязана показывать НАСТОЯЩИЙ виджет, а не
рисунок от руки: иначе через пару версий она начнёт врать.

ЗЕРКАЛО двух мест в коде — правите там, правьте и здесь:
  1. tools/github-workflows/build.yml → widget_layout_xml() — геометрия:
     поля, размеры шрифтов, высота полос прогресса и кнопок, цвета
     (фон #E8F5F4, кромка #7AA6A6, заголовок #00696B, текст #002021,
     подпись профиля #4A6363, полосы #00696B и #FF9E3D).
  2. android-native/FitFlowWidgetProvider.java → updateWidget() — тексты
     строк и правило стоимости слота: вода и питание занимают по ДВА
     слота (текст + полоса), остальные — по одному; сколько строк влезает,
     считает формула (высота − chrome) / row, у LARGE chrome=110dp, row=30dp.

Превью рисуется в раскладке LARGE (ширина 250dp), а высота подбирается под
композицию по умолчанию «вода, питание, шаги» так, чтобы влезло ровно то,
что влезает на телефоне: вода(2)+питание(2)=4 слота => высота 230dp.

Скрипт НЕ участвует в сборке APK напрямую: его вызывает
tools/make-widget-previews.py, результат кладётся в
assets/widget-previews/fitflow_preview_list.png, а сборка копирует его
в res/drawable-nodpi/.

    python3 tools/widget-list-preview.py

Пишет design/widget-list-preview.png (для просмотра глазами).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path('design/widget-list-preview.png')

# Палитра — зеркало shape-drawable и textColor из widget_layout_xml().
BG = (232, 245, 244, 255)          # fitflow_widget_background: #E8F5F4
BORDER = (122, 166, 166, 255)      # кромка 1dp: #7AA6A6
TITLE = (0, 105, 107, 255)         # заголовок: #00696B
PROFILE = (74, 99, 99, 255)        # строка профиля: #4A6363
INK = (0, 32, 33, 255)             # текст показателя: #002021
BAR_WATER = (0, 105, 107, 255)     # progressTint воды/шагов: #00696B
BAR_FOOD = (255, 158, 61, 255)     # progressTint питания: #FF9E3D
BAR_TRACK = (200, 222, 220, 255)   # фон полосы (непрокрашенная часть)
BTN_MAIN = (0, 105, 107, 255)      # fitflow_widget_btn_water: #00696B
BTN_MAIN_INK = (255, 255, 255, 255)
BTN_SOFT = (224, 242, 241, 255)    # fitflow_widget_btn_secondary: #E0F2F1

# Геометрия LARGE-раскладки: widget_layout_xml(10, 16, 12, 11, 15, 5, 5, 38, 12)
PAD = 16
TITLE_SP = 12
PROFILE_SP = 11
TEXT_SP = 15
BAR_H = 5
GAP = 5
BTN_H = 38
BTN_SP = 12
# Зеркало FitFlowWidgetProvider: chrome и высота одной строки для LARGE.
CHROME_DP = 110
ROW_DP = 30


def font(size, bold=False):
    """Те же файлы, что грузит виджет на устройстве (assets/fonts/manrope-*.ttf).

    Иначе предпросмотр врёт о начертании — на системном DejaVu разница
    обычного и жирного выглядит иначе, чем на Manrope.
    """
    own = (Path(__file__).resolve().parent.parent / 'assets' / 'fonts'
           / ('manrope-bold.ttf' if bold else 'manrope-regular.ttf'))
    if own.exists():
        return ImageFont.truetype(str(own), size)
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    for base in ('/usr/share/fonts/truetype/dejavu/', '/usr/share/fonts/truetype/'):
        p = Path(base) / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def line_for(item, data):
    """Текст строки — зеркало updateWidget() в FitFlowWidgetProvider.java."""
    if item == 'water':
        v, g = data['water']
        return 'Вода: %d / %d мл' % (v, g), BAR_WATER, v * 100.0 / g
    if item == 'food':
        v, g = data['food']
        return 'Питание: %d / %d ккал' % (v, g), BAR_FOOD, v * 100.0 / g
    if item == 'steps':
        v, g = data['steps']
        return 'Шаги: %d' % v, BAR_WATER, None
    if item == 'activity':
        v, g = data['activity']
        return 'Активность: %d из %d мин' % (v, g), BAR_WATER, v * 100.0 / g
    if item == 'sleep':
        return 'Сон: %s' % data['sleep'], BAR_WATER, None
    if item == 'weight':
        return 'Вес: %s' % data['weight'], BAR_WATER, None
    if item == 'day-mood':
        return 'Самочувствие: %s' % data['day-mood'], BAR_WATER, None
    if item == 'courses':
        return 'Витамины: %s' % data['courses'], BAR_WATER, None
    if item == 'workout':
        return 'Тренировка: %s' % data['workout'], BAR_WATER, None
    if item == 'day-plan':
        return 'План дня: %s' % data['day-plan'], BAR_WATER, None
    return item, BAR_WATER, None


def _rr(d, box, radius, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def fit_slots(height_dp):
    """Сколько слотов влезает: зеркало (maxHeight - chrome) / row из Java."""
    return max(1, (height_dp - CHROME_DP) // ROW_DP)


def render(slots, data, width=500, height_dp=230, profile='Мой профиль',
           today_title='FITFLOW · СЕГОДНЯ'):
    """slots — показатели в порядке пользователя (как prefs widgetItems).

    Высота превью = width*(height_dp/250): композиция «вода+питание» (4 слота)
    влезает именно в 230dp — как на телефоне. Что не поместилось, молча
    пропускается (то же правило, что в Java), а не лезет под кнопки.
    """
    den = width / 250.0
    height = int(round(width * height_dp / 250.0))
    im = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # Карточка: фон + кромка 1dp, радиус 20dp.
    _rr(d, [0, 0, width - 1, height - 1], 20 * den,
        fill=BG, outline=BORDER, width=max(1, int(round(den))))

    pad = PAD * den
    y = pad

    f_title = font(int(round(TITLE_SP * den)), bold=True)
    d.text((pad, y), today_title, font=f_title, fill=TITLE)
    y += f_title.size * 1.2

    f_profile = font(int(round(PROFILE_SP * den)))
    d.text((pad, y), 'Профиль: ' + profile, font=f_profile, fill=PROFILE)
    y += f_profile.size * 1.25

    # Ряд кнопок прижат к низу (в разметке контейнер строк имеет weight=1).
    btn_h = BTN_H * den
    btn_top = height - pad - btn_h

    budget = fit_slots(height_dp)
    used = 0
    rows = []
    for item in slots:
        cost = 2 if item in ('water', 'food') else 1
        if used + cost > budget:
            continue
        text, color, pct = line_for(item, data)
        rows.append((text, color, pct))
        used += cost

    f_text = font(int(round(TEXT_SP * den)), bold=True)
    avail_top = y
    avail_h = btn_top - 7 * den - avail_top
    # Высота строки: текст (с межстрочным) + необязательная полоса + зазор.
    def row_h(pct):
        h = f_text.size * 1.3
        if pct is not None:
            h += (BAR_H + 3) * den
        return h
    total = sum(row_h(r[2]) for r in rows) + GAP * den * max(0, len(rows) - 1)
    # Если строк меньше, чем места, — распределяем лишнее между ними,
    # как LinearLayout с весом, чтобы не оставалось пустоты над кнопками.
    extra = max(0.0, (avail_h - total) / len(rows)) if rows else 0.0

    for text, color, pct in rows:
        d.text((pad, y), text, font=f_text, fill=INK)
        y += f_text.size * 1.3
        if pct is not None:
            bh = BAR_H * den
            _rr(d, [pad, y, width - pad, y + bh], bh / 2, fill=BAR_TRACK)
            fw = (width - 2 * pad) * max(0.0, min(1.0, pct / 100.0))
            if fw > bh:
                _rr(d, [pad, y, pad + fw, y + bh], bh / 2, fill=color)
            y += bh + 3 * den
        y += GAP * den + extra

    # Кнопки: «+250 мл», «📝 Записать», «⟳» (узкая, фиксированной ширины).
    f_btn = font(int(round(BTN_SP * den)), bold=True)
    refresh_w = btn_h
    gap = 4 * den
    two_w = (width - 2 * pad - 2 * gap - refresh_w) / 2.0

    _rr(d, [pad, btn_top, pad + two_w, btn_top + btn_h], 12 * den, fill=BTN_MAIN)
    label = '+250 мл'
    tw = d.textlength(label, font=f_btn)
    d.text((pad + (two_w - tw) / 2, btn_top + (btn_h - f_btn.size) / 2 - 1),
           label, font=f_btn, fill=BTN_MAIN_INK)

    x2 = pad + two_w + gap
    _rr(d, [x2, btn_top, x2 + two_w, btn_top + btn_h], 12 * den,
        fill=BTN_SOFT, outline=TITLE, width=max(1, int(round(den))))
    label = '📝 Записать'
    tw = d.textlength(label, font=f_btn)
    d.text((x2 + (two_w - tw) / 2, btn_top + (btn_h - f_btn.size) / 2 - 1),
           label, font=f_btn, fill=TITLE)

    x3 = x2 + two_w + gap
    _rr(d, [x3, btn_top, x3 + refresh_w, btn_top + btn_h], 12 * den,
        fill=BTN_SOFT, outline=TITLE, width=max(1, int(round(den))))
    label = '⟳'
    tw = d.textlength(label, font=f_btn)
    d.text((x3 + (refresh_w - tw) / 2, btn_top + (btn_h - f_btn.size) / 2 - 1),
           label, font=f_btn, fill=TITLE)

    return im


# Демо-данные — те же, что в tools/make-widget-previews.py, чтобы все
# превью в системном списке показывали один и тот же «наполовину прожитый» день.
DEMO = {
    'water': (1500, 2300),
    'food': (1250, 2200),
    'steps': (6430, 10000),
    'activity': (18, 21),
    'sleep': '7 ч 40 мин',
    'weight': '78,4 кг',
    'courses': '1 из 2',
    'workout': 'отдых',
    'day-mood': 'Хорошее',
    'day-plan': '3 из 5',
}
# Состав по умолчанию из FitFlowWidgetProvider: prefs "widgetItems" = "water,food,steps".
DEMO_SLOTS = ['water', 'food', 'steps']


def main():
    im = render(DEMO_SLOTS, DEMO, width=500, height_dp=230)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT)
    print('wrote %s (%dx%d)' % (OUT, im.width, im.height))


if __name__ == '__main__':
    main()
