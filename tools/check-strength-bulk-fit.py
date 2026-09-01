#!/usr/bin/env python3
"""0.9.50: геометрия строки «вес × повторения × подходы» в силовой.

Полевое замечание владельца: плейсхолдеры обрезались («Повте…», «Подхо…»),
пока кнопка «Добавить» стояла в одном ряду с пилюлями. Теперь «Добавить»
на своей строке (flex 1 1 100%), а пилюли делят всю ширину карточки.

Скрипт считает ширину пилюль из тех же чисел, что в style.css
(.strength-bulk-row / .strength-bulk-input), и сравнивает с шириной
плейсхолдеров, измеренной ШИРОКИМ шрифтом (DejaVu Sans шире системного
Roboto на Android) — если влезло в DejaVu, в Roboto влезет с запасом.

Запуск: python3 tools/check-strength-bulk-fit.py
"""
import sys
from PIL import ImageFont, ImageDraw, Image

# --- константы из style.css (0.9.50) -------------------------------------
EXERCISE_PAD = 10 * 2          # .strength-exercise padding 10px
CARD_PAD = 14 * 2              # .card padding по горизонтали (@media ≤420px: 14)
CONTENT_PAD = 12 * 2           # .content padding по горизонтали (@media ≤420px: 12)
COLLAPSE_PAD = 1 * 2           # .collapsible-content > div padding 1px
GAP = 5                        # .strength-bulk-row gap
SEP_W = 9                      # «×» при 0.78rem (с запасом)
INPUT_OVERHEAD = 4 * 2 + 2     # padding 7px 4px (по 4 с боков) + border 1px×2
FLEX = {'weight': 1.0, 'reps': 1.3, 'sets': 1.0}   # flex-веса пилюль
FONT_PX = 0.82 * 16            # font-size: 0.82rem

PLACEHOLDERS = {'weight': '+ жилет', 'reps': 'Повторения', 'sets': 'Подходы'}

# --- измерение текста широким шрифтом ------------------------------------
def text_w(draw, s, font):
    l, t, r, b = draw.textbbox((0, 0), s, font=font)
    return r - l

def main():
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(FONT_PX))
    except OSError:
        font = ImageFont.load_default()
    draw = ImageDraw.Draw(Image.new('RGB', (10, 10)))

    widths = {k: text_w(draw, v, font) for k, v in PLACEHOLDERS.items()}
    print(f'ширины плейсхолдеров (DejaVu, шире Roboto): {widths}')

    # 360/412dp — жёсткое требование (реальные телефоны, Roboto уже DejaVu).
    # 320dp — совет: экраны Android 5-эпохи; в Roboto влезает, в DejaVu впритык.
    HARD = (360, 412)
    ok_all = True
    for viewport in (320, 360, 412):
        inner = viewport - CONTENT_PAD - CARD_PAD - COLLAPSE_PAD - EXERCISE_PAD
        # 3 пилюли + 2 разделителя: 4 промежутка gap
        free = inner - 4 * GAP - 2 * SEP_W
        unit = free / sum(FLEX.values())
        line = []
        ok_row = True
        for key in ('weight', 'reps', 'sets'):
            pill = unit * FLEX[key]
            budget = pill - INPUT_OVERHEAD
            need = widths[key]
            fits = need <= budget
            ok_row &= fits
            line.append(f'{key}: пилюля {pill:.0f}px, текст {need:.0f}px -> {"влезает" if fits else "ОБРЕЗАЕТСЯ"}')
        if viewport in HARD:
            ok_all &= ok_row
        tag = '' if viewport in HARD else '  [совет, не блокирует]'
        print(f'\nэкран {viewport}dp (внутри карточки {inner}px):{tag}')
        for s in line:
            print('  ' + s)

    # кнопка «Добавить» обязана быть на своей строке
    import re
    css = open('style.css', encoding='utf8').read()
    btn_own_line = '.strength-bulk-row .strength-quick-apply { flex: 1 1 100%; }' in css
    wrap = re.search(r'\.strength-bulk-row \{[^}]*flex-wrap: wrap', css) is not None
    print(f'\nкнопка «Добавить» на своей строке: {btn_own_line}; flex-wrap у ряда: {wrap}')
    ok_all &= btn_own_line and wrap

    print('\nИТОГ:', 'ВСЕ ПЛЕЙСХОЛДЕРЫ ВЛЕЗАЮТ' if ok_all else 'НЕ ВЛЕЗАЕТ — правь flex/шрифт')
    sys.exit(0 if ok_all else 1)

if __name__ == '__main__':
    main()
