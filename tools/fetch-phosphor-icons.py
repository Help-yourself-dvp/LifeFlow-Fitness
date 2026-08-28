#!/usr/bin/env python3
"""Значки Phosphor для виджета «плитки» (0.9.39).

Владелец выбрал Phosphor после листа сравнения (design/icon-packs-compare.png).
Ставим их ТОЛЬКО на третий виджет: у первых двух оформление принято и
менять его без просьбы нельзя. Поэтому файлы кладутся с префиксом
`tiles-`, а натив ищет сначала `tiles-<id>.png`, потом общий `<id>.png`.

Стиль fill: виджет рисует значок ~12 dp, контурные линии в таком размере
сливаются (проверено на листе сравнения — Iconoir нечитаем).

Лицензия MIT, атрибуция в интерфейсе не нужна, текст — в
THIRD_PARTY_LICENSES.md.

Требуется настроенный gh (прямой сети в песочнице нет).

Запуск:  python3 tools/fetch-phosphor-icons.py
Результат: assets/widget-icons/tiles-*.png (96x96, белым по прозрачному).
"""
import base64
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'widget-icons'

REPO = 'phosphor-icons/core'
WEIGHT = 'fill'

# id показателя -> имя значка в Phosphor.
# ВЕСА ЗДЕСЬ НЕТ НАМЕРЕННО: единственные весы у Phosphor — `scales`,
# то есть чаши-балансир, тот самый ⚖️, который владелец отверг дважды
# (0.4.14 и 0.9.34). Напольных весов в наборе нет, поэтому для веса
# срабатывает откат на общий значок Material (monitor_weight).
ICONS = {
    'water': 'drop',
    'food': 'fork-knife',
    'steps': 'footprints',
    'activity': 'person-simple-run',
    'sleep': 'moon',
    'courses': 'pill',
    'workout': 'barbell',
    'day-plan': 'list-checks',
    'day-mood': 'smiley',
    # Шестерёнка и значки на кнопках воды/еды/курсов НЕ входят: шестерёнка
    # рисуется кодом (neonGear), а кнопки — общие с «кольцами», где
    # оформление уже принято владельцем.
}


def gh_raw(path):
    r = subprocess.run(['gh', 'api', 'repos/%s/contents/%s' % (REPO, path)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:160])
    return base64.b64decode(json.loads(r.stdout)['content']).decode('utf-8')


def main():
    spec = importlib.util.spec_from_file_location(
        'svgconv', ROOT / 'tools' / 'svg-to-widget-icon.py')
    conv = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(conv)

    OUT.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    ok, bad = 0, []
    for icon_id, name in sorted(ICONS.items()):
        try:
            svg = gh_raw('assets/%s/%s-%s.svg' % (WEIGHT, name, WEIGHT))
            src = tmp / (icon_id + '.svg')
            src.write_text(svg, encoding='utf-8')
            conv.convert(str(src), str(OUT / ('tiles-' + icon_id + '.png')))
            print('  tiles-%-12s <- %s-%s' % (icon_id, name, WEIGHT))
            ok += 1
        except Exception as e:
            bad.append((icon_id, str(e)[:90]))
    print('готово: %d значков Phosphor в %s' % (ok, OUT.relative_to(ROOT)))
    for i, e in bad:
        print('  НЕ вышло:', i, e)


if __name__ == '__main__':
    main()
