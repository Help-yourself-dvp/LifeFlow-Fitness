#!/usr/bin/env python3
"""Скачивает значки виджетов из Material Symbols и кладёт в папку (0.9.36).

Почему Material Symbols: Apache 2.0 — можно использовать в приложении,
которое выкладывается в магазины, атрибуция в интерфейсе не требуется
(см. THIRD_PARTY_LICENSES.md). Берём стиль Rounded, вариант fill1
(залитый) — залитые силуэты читаются в мелком размере намного лучше
контурных, а виджет рисует значки размером ~12 dp.

Требуется настроенный gh (сети наружу в песочнице нет, curl не работает).

Запуск:  python3 tools/fetch-widget-icons.py
Результат: assets/widget-icons/*.png (96x96, белым по прозрачному).
"""
import base64
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'widget-icons'
sys.path.insert(0, str(ROOT / 'tools'))

REPO = 'google/material-design-icons'
STYLE = 'materialsymbolsrounded'

# id значка в приложении -> имя символа в Material Symbols.
# Подбирал по смыслу показателя; вес отдельно — владелец дважды отверг
# весы-«весики» ⚖️, поэтому берём напольные (monitor_weight).
ICONS = {
    'water': 'water_drop',
    'food': 'restaurant',
    'steps': 'directions_walk',
    'activity': 'directions_run',
    'sleep': 'bedtime',
    'weight': 'monitor_weight',
    'courses': 'medication',
    'workout': 'fitness_center',
    'day-plan': 'checklist',
    'day-mood': 'mood',
    'btn-water': 'water_drop',
    'btn-food': 'restaurant',
    'btn-courses': 'medication',
    'gear': 'settings',
}


def gh_json(path):
    r = subprocess.run(['gh', 'api', path], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:200])
    return json.loads(r.stdout)


def fetch_svg(symbol):
    """Ищем самый крупный залитый вариант: fill1 48px, иначе что есть."""
    base = 'repos/%s/contents/symbols/web/%s/%s' % (REPO, symbol, STYLE)
    files = [f['name'] for f in gh_json(base) if f['name'].endswith('.svg')]
    for want in ('%s_fill1_48px.svg' % symbol, '%s_fill1_24px.svg' % symbol,
                 '%s_48px.svg' % symbol, '%s_24px.svg' % symbol):
        if want in files:
            pick = want
            break
    else:
        pick = sorted(files)[0]
    blob = gh_json(base + '/' + pick)
    return base64.b64decode(blob['content']).decode('utf-8'), pick


def main():
    from importlib import import_module
    conv = import_module('svg-to-widget-icon'.replace('-', '_')) \
        if False else None
    # модуль с дефисами импортируем вручную
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        'svgconv', ROOT / 'tools' / 'svg-to-widget-icon.py')
    conv = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(conv)

    OUT.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    ok, bad = 0, []
    for icon_id, symbol in sorted(ICONS.items()):
        try:
            svg, name = fetch_svg(symbol)
            src = tmp / (icon_id + '.svg')
            src.write_text(svg, encoding='utf-8')
            conv.convert(str(src), str(OUT / (icon_id + '.png')))
            print('  %-12s <- %s' % (icon_id, name))
            ok += 1
        except Exception as e:
            bad.append((icon_id, str(e)[:80]))
    print('готово: %d значков в %s' % (ok, OUT.relative_to(ROOT)))
    for i, e in bad:
        print('  НЕ вышло:', i, e)


if __name__ == '__main__':
    main()
