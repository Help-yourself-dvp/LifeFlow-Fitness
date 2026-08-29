#!/usr/bin/env python3
"""Статические начертания Manrope для виджетов (0.9.41).

Зачем. `assets/fonts/manrope.ttf` — ВАРИАТИВНЫЙ шрифт с осью веса
200…800, и его начертание по умолчанию — 200 (ExtraLight). В вебе это
неважно: CSS объявляет `font-weight: 100 900`, браузер сам двигает ось.
А вот Android до API 26+ через `Typeface.createFromAsset` берёт
экземпляр по умолчанию и НЕ умеет менять ось — виджеты рисовались
сверхтонким весом 200, а `Typeface.create(t, BOLD)` поверх ExtraLight
давал едва заметную разницу. Отсюда жалоба владельца «жирный на кнопках
так и не жирный».

Решение: заранее «запечь» два статических файла по фиксированным весам.
Их натив грузит как два независимых шрифта, и жирность становится
настоящей, а не синтетической.

Веса подобраны под мелкий текст на виджете: 500 (Medium) для обычного —
на тёмном фоне 400 выглядит блёкло, и 800 (ExtraBold) для жирного —
контраст с 500 виден даже в 9 dp.

Запуск: python3 tools/make-widget-fonts.py
Результат: assets/fonts/manrope-regular.ttf, assets/fonts/manrope-bold.ttf
"""
from pathlib import Path

from fontTools import ttLib
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'fonts' / 'manrope.ttf'
OUT = ROOT / 'assets' / 'fonts'

TARGETS = [('manrope-regular.ttf', 500, 'Regular'),
           ('manrope-bold.ttf', 800, 'Bold')]


def build(weight, subfamily, dst):
    font = ttLib.TTFont(SRC)
    if 'fvar' not in font:
        raise SystemExit('ОШИБКА: %s не вариативный — нечего запекать' % SRC)
    inst = instancer.instantiateVariableFont(font, {'wght': weight})
    # Имена приводим в порядок: иначе оба файла назовутся
    # «Manrope ExtraLight» и система может их слить в одно семейство.
    family = 'Manrope Widget'
    full = family + ' ' + subfamily
    ps = full.replace(' ', '')
    for rec in inst['name'].names:
        if rec.nameID == 1:
            rec.string = family
        elif rec.nameID == 2:
            rec.string = subfamily
        elif rec.nameID == 4:
            rec.string = full
        elif rec.nameID == 6:
            rec.string = ps
    inst['OS/2'].usWeightClass = weight
    if subfamily == 'Bold':
        inst['OS/2'].fsSelection |= 1 << 5      # BOLD
        inst['OS/2'].fsSelection &= ~(1 << 6)   # снять REGULAR
        inst['head'].macStyle |= 1
    else:
        inst['OS/2'].fsSelection |= 1 << 6
        inst['OS/2'].fsSelection &= ~(1 << 5)
        inst['head'].macStyle &= ~1
    inst.save(dst)
    return dst.stat().st_size


def main():
    for name, weight, subfamily in TARGETS:
        dst = OUT / name
        size = build(weight, subfamily, dst)
        print('  %-22s wght=%d  %d КБ' % (name, weight, size // 1024))
    print('готово: статические начертания в %s' % OUT.relative_to(ROOT))


if __name__ == '__main__':
    main()
