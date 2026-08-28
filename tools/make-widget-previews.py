#!/usr/bin/env python3
"""Картинки предпросмотра для СИСТЕМНОГО СПИСКА выбора виджетов (0.9.35).

Зачем: владелец справедливо заметил, что после появления собственных имён
(«FitFlow · кольца», «FitFlow · плитки») по одному названию всё равно не
понять, что内 внутри. Android умеет показывать в списке картинку —
`android:previewImage` в appwidget-provider. Без неё лаунчер рисует просто
иконку приложения, одинаковую для всех.

Откуда берём картинку: из ТЕХ ЖЕ генераторов, которые зеркалят реальную
отрисовку (widget-glass-preview.py и widget-tiles-preview.py). Поэтому
превью не «нарисованная от руки картинка», которая рано или поздно
разойдётся с виджетом, а то же самое изображение с демо-данными.

Результат кладётся в assets/widget-previews/*.png, сборка копирует их в
res/drawable-nodpi/. Запуск: python3 tools/make-widget-previews.py
"""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'widget-previews'

# Демо-данные: правдоподобные, «наполовину выполненные» цели — так в списке
# видно и заполнение, и цифры. Пустые нули выглядели бы сломанным виджетом.
DATA = {
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
SLOTS = ['water', 'steps', 'sleep', 'food']

# Размер: 4x2 в пропорции реальной ячейки. Крупнее нет смысла — лаунчер
# всё равно ужимает превью, а вес drawable растёт.
W, H = 500, 300


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    glass = load('glass', 'widget-glass-preview.py')
    tiles = load('tiles', 'widget-tiles-preview.py')
    bento = load('bento', 'widget-bento-preview.py')
    today = ('28.08.2026', 'пятница')

    # Бенто рисуется по картинке-подложке с фиксированными пропорциями,
    # поэтому размер задаём шириной и не растягиваем (0.9.36).
    bento_im = bento.render(['steps', 'water', 'food'],
                            {'steps': (6430, 10000), 'water': (1500, 2300),
                             'food': (1250, 2200), 'activity': (18, 21)},
                            width=W)

    shots = [
        ('fitflow_preview_bento', bento_im),
        ('fitflow_preview_neon',
         glass.render(SLOTS, DATA, today, width=W, height=H, theme='dark')),
        ('fitflow_preview_neon_light',
         glass.render(SLOTS, DATA, today, width=W, height=H, theme='light')),
        ('fitflow_preview_tiles',
         tiles.render(SLOTS, DATA, width=W, height=H, theme='light')),
        ('fitflow_preview_tiles_dark',
         tiles.render(SLOTS, DATA, width=W, height=H, theme='dark')),
    ]
    for name, im in shots:
        p = OUT / (name + '.png')
        im.save(p)
        print('wrote %s (%dx%d)' % (p.relative_to(ROOT), im.width, im.height))


if __name__ == '__main__':
    main()
