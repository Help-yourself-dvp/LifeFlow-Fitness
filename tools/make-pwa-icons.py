#!/usr/bin/env python3
"""Иконки веб-версии FitFlow (PWA) — из одного источника icon.png.

Запуск:  python3 tools/make-pwa-icons.py

Кладёт в assets/pwa/:
  apple-touch-icon-180.png — иконка «на Домой» в iOS (Safari берёт именно её);
  icon-192.png             — обычная иконка манифеста;
  icon-512.png             — крупная иконка манифеста (сплэш при запуске);
  icon-maskable-512.png    — вариант для маскировки (Android режет по кругу).

Источник один — icon.png. Поэтому иконка APK и иконка веб-версии не могут
разъехаться: поменяли icon.png — прогнали скрипт, готово.

Проверка «безопасной зоны»: у maskable-иконки логотип обязан уложиться в
центральный круг диаметром 80% (иначе Android срежет часть рисунка). Скрипт
считает фактические границы рисунка и падает, если правило нарушено, —
вместо того чтобы молча положить обрезанную иконку.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'icon.png'
OUT = ROOT / 'assets' / 'pwa'

# Безопасная зона maskable-иконки: диаметр 80% от стороны (требование Android).
MASKABLE_SAFE_FRACTION = 0.80


def content_bbox(im: Image.Image, tolerance: int = 40) -> tuple:
    """Границы «не фона»: считаем от цвета левого верхнего угла."""
    rgb = im.convert('RGB')
    w, h = rgb.size
    bg = rgb.getpixel((2, 2))
    px = rgb.load()
    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > tolerance:
                min_x, min_y = min(min_x, x), min(min_y, y)
                max_x, max_y = max(max_x, x), max(max_y, y)
    return min_x, min_y, max_x, max_y


def main() -> int:
    if not SRC.exists():
        raise SystemExit(f'ОШИБКА: нет исходной иконки {SRC}')
    src = Image.open(SRC).convert('RGBA')
    if src.width != src.height:
        raise SystemExit(f'ОШИБКА: иконка не квадратная ({src.width}x{src.height})')

    # Проверка безопасной зоны до генерации: логотип не должен вылезать из
    # центрального круга. Для FitFlow рисунок занимает ~70% — правило
    # выполняется с запасом, но проверка сторожит будущую замену icon.png.
    box = content_bbox(src)
    logo_w = (box[2] - box[0] + 1) / src.width
    logo_h = (box[3] - box[1] + 1) / src.height
    if max(logo_w, logo_h) > MASKABLE_SAFE_FRACTION:
        raise SystemExit(
            'ОШИБКА: рисунок занимает %.0f%% ширины (предел %.0f%%) — '
            'Android срежет края maskable-иконки. Уменьшите логотип в icon.png.'
            % (max(logo_w, logo_h) * 100, MASKABLE_SAFE_FRACTION * 100))

    OUT.mkdir(parents=True, exist_ok=True)
    sizes = {
        'apple-touch-icon-180.png': 180,
        'icon-192.png': 192,
        'icon-512.png': 512,
        'icon-maskable-512.png': 512,
    }
    for name, size in sizes.items():
        resized = src.resize((size, size), Image.LANCZOS)
        resized.save(OUT / name, 'PNG', optimize=True)
        print(f'OK {OUT.relative_to(ROOT)}/{name} ({size}x{size}, '
              f'{(OUT / name).stat().st_size // 1024} КБ)')
    print('Иконки веб-версии обновлены. Логотип занимает %.0f%% стороны — '
          'в безопасной зоне maskable.' % (max(logo_w, logo_h) * 100))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
