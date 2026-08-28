#!/usr/bin/env python3
"""Лист сравнения наборов значков (0.9.38).

Владелец спросил: «есть где посмотреть варианты, не ставя их на виджет?».
Онлайн-галереи есть у каждого набора, но там значки чужие и разного
размера. Здесь — НАШИ 10 показателей, отрисованные одинаково, из четырёх
свободных наборов. Результат: design/icon-packs-compare.png.

Все наборы разрешают коммерческое использование без атрибуции в
интерфейсе (см. THIRD_PARTY_LICENSES.md).

Запуск: python3 tools/compare-icon-packs.py
"""
import base64
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'design' / 'icon-packs-compare.png'

SLOTS = ['water', 'food', 'steps', 'activity', 'sleep',
         'weight', 'courses', 'workout', 'day-plan', 'day-mood']
TITLES = {'water': 'Вода', 'food': 'Питание', 'steps': 'Шаги',
          'activity': 'Актив.', 'sleep': 'Сон', 'weight': 'Вес',
          'courses': 'Курсы', 'workout': 'Спорт',
          'day-plan': 'План', 'day-mood': 'Настрой'}

# path в репозитории для каждого набора. None = у набора нет такого значка.
PACKS = [
    ('Material Symbols (сейчас)', 'Apache 2.0', 'google/material-design-icons',
     'symbols/web/{n}/materialsymbolsrounded/{n}_fill1_48px.svg', {
         'water': 'water_drop', 'food': 'restaurant', 'steps': 'directions_walk',
         'activity': 'directions_run', 'sleep': 'bedtime', 'weight': 'monitor_weight',
         'courses': 'medication', 'workout': 'fitness_center',
         'day-plan': 'checklist', 'day-mood': 'mood'}),
    ('Phosphor (fill)', 'MIT', 'phosphor-icons/core',
     'assets/fill/{n}-fill.svg', {
         'water': 'drop', 'food': 'fork-knife', 'steps': 'footprints',
         'activity': 'person-simple-run', 'sleep': 'moon', 'weight': 'scales',
         'courses': 'pill', 'workout': 'barbell',
         'day-plan': 'list-checks', 'day-mood': 'smiley'}),
    ('Tabler (filled)', 'MIT', 'tabler/tabler-icons',
     'icons/filled/{n}.svg', {
         'water': 'droplet', 'food': 'tools-kitchen-2', 'steps': 'shoe',
         'activity': 'run', 'sleep': 'moon', 'weight': 'scale',
         'courses': 'capsule-horizontal', 'workout': 'barbell',
         'day-plan': 'checklist', 'day-mood': 'mood-smile'}),
    ('Iconoir (regular)', 'MIT', 'iconoir-icons/iconoir',
     'icons/regular/{n}.svg', {
         'water': 'droplet', 'food': 'fork-knife', 'steps': 'walking',
         'activity': 'running', 'sleep': 'half-moon', 'weight': 'weight-alt',
         'courses': 'pharmacy-cross-circle', 'workout': 'gym',
         'day-plan': 'task-list', 'day-mood': 'emoji'}),
]

CELL = 108
ICON = 62
LEFT = 250
HEAD = 46


def gh_raw(repo, path):
    r = subprocess.run(['gh', 'api', 'repos/%s/contents/%s' % (repo, path)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None
    try:
        return base64.b64decode(json.loads(r.stdout)['content']).decode('utf-8')
    except Exception:
        return None


def font(size, bold=False):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf'
              % ('-Bold' if bold else ''),):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    spec = importlib.util.spec_from_file_location(
        'svgconv', ROOT / 'tools' / 'svg-to-widget-icon.py')
    conv = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(conv)

    tmp = Path(tempfile.mkdtemp())
    w = LEFT + CELL * len(SLOTS)
    h = HEAD + CELL * len(PACKS) + 14
    sheet = Image.new('RGBA', (w, h), (24, 27, 34, 255))
    d = ImageDraw.Draw(sheet)

    f_head = font(19, bold=True)
    f_name = font(18, bold=True)
    f_lic = font(15)
    f_slot = font(15)

    for i, slot in enumerate(SLOTS):
        x = LEFT + i * CELL + CELL // 2
        t = TITLES[slot]
        d.text((x - d.textbbox((0, 0), t, font=f_slot)[2] / 2, 16), t,
               font=f_slot, fill='#9AA6B4')

    for row, (name, lic, repo, tpl, names) in enumerate(PACKS):
        y = HEAD + row * CELL
        if row % 2 == 0:
            d.rectangle((0, y, w, y + CELL), fill=(31, 36, 46, 255))
        d.text((16, y + CELL // 2 - 22), name, font=f_name, fill='#E8EDF4')
        d.text((16, y + CELL // 2 + 2), lic, font=f_lic, fill='#7C8796')
        for i, slot in enumerate(SLOTS):
            sym = names.get(slot)
            cx = LEFT + i * CELL + CELL // 2
            cy = y + CELL // 2
            svg = gh_raw(repo, tpl.format(n=sym)) if sym else None
            if not svg:
                d.text((cx - 6, cy - 8), '—', font=f_name, fill='#5A6472')
                continue
            src = tmp / ('%d-%s.svg' % (row, slot))
            src.write_text(svg, encoding='utf-8')
            dst = tmp / ('%d-%s.png' % (row, slot))
            try:
                conv.convert(str(src), str(dst), size=ICON)
            except Exception:
                d.text((cx - 6, cy - 8), '?', font=f_name, fill='#B4553C')
                continue
            g = Image.open(dst).convert('RGBA')
            sheet.alpha_composite(g, (cx - g.width // 2, cy - g.height // 2))

    d.text((16, h - 26),
           'Все наборы: коммерческое использование разрешено, '
           'атрибуция в интерфейсе не требуется',
           font=f_lic, fill='#6E7A88')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert('RGB').save(OUT)
    print('wrote', OUT.relative_to(ROOT), sheet.size)


if __name__ == '__main__':
    main()
