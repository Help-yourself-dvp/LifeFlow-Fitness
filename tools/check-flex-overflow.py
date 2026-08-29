#!/usr/bin/env python3
"""Ищет флекс-контейнеры, чьи дети могут вылезти за экран (0.9.42).

Полевой баг: в теме «Спорт» блок «Анализ периода · Помощник FitFlow»
выходил за правую границу. Причина — не тема, а `min-width: auto` по
умолчанию у флекс-детей: элемент не может стать уже своего содержимого,
поэтому длинный заголовок в одну строку распирает контейнер. Тема лишь
проявила дефект (letter-spacing + отсутствующий на Android сжатый шрифт).

Браузера в песочнице нет, поэтому проверяем статически: для каждого
правила с `display:flex` смотрим, объявлен ли где-нибудь `min-width: 0`
для него самого или его детей. Ищем те шапки/строки, внутри которых
по разметке лежит длинный текст (h1…h3, .card-subtitle, .settings-hint).

Запуск: python3 tools/check-flex-overflow.py
Код возврата 1, если найден незащищённый контейнер с длинным текстом.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / 'style.css'
HTML = ROOT / 'index.html'

# Классы, внутри которых заведомо лежит длинный текст.
TEXTY = ('h1', 'h2', 'h3', 'card-subtitle', 'settings-hint', 'settings-label')

# Контейнеры, которым сжиматься не нужно: у них фиксированный
# нетекстовый контент либо горизонтальная прокрутка предусмотрена.
SKIP = {'.card-icon', '.segmented', '.chip-row', '.stats-periods',
        # переключатель: фиксированные 48x30 px, текста внутри нет —
        # проверка ловит текст соседней подписи, это ложный вызов
        '.switch-track', '.switch-thumb'}

# Что ещё спасает от переполнения, кроме min-width:0.
SAFE = (
    # перенос: дети уходят на следующую строку, а не распирают контейнер
    r'flex-wrap\s*:\s*wrap',
    # прокрутка предусмотрена автором
    r'overflow-x\s*:\s*(auto|scroll)',
    r'overflow\s*:\s*(auto|scroll)',
    # сам элемент — не контейнер строки, а inline-кнопка/бейдж
    r'display\s*:\s*inline-flex',
)


def rules(css):
    """(селектор, тело) для каждого правила верхнего уровня."""
    out = []
    depth = 0
    buf = ''
    sel = ''
    i = 0
    while i < len(css):
        ch = css[i]
        if ch == '{':
            depth += 1
            if depth == 1:
                sel = buf.strip()
                buf = ''
                i += 1
                continue
        elif ch == '}':
            depth -= 1
            if depth == 0:
                out.append((sel, buf))
                buf = ''
                i += 1
                continue
        buf += ch
        i += 1
    return out


def main():
    css = CSS.read_text(encoding='utf-8')
    html = HTML.read_text(encoding='utf-8')
    all_rules = rules(css)

    flex, guarded = set(), set()
    for sel, body in all_rules:
        if re.search(r'display\s*:\s*(inline-)?flex', body):
            for part in sel.split(','):
                part = part.strip()
                if part:
                    flex.add(part)
        # правило считается защитой, если задаёт перенос/прокрутку
        if any(re.search(pat, body) for pat in SAFE):
            for part in sel.split(','):
                part = part.strip()
                if part:
                    guarded.add(part)
        if re.search(r'min-width\s*:\s*0', body):
            for part in sel.split(','):
                part = part.strip()
                # `.x > *` защищает детей `.x`
                guarded.add(re.sub(r'\s*>\s*\*$', '', part).strip())

    problems = []
    for sel in sorted(flex):
        base = sel.split()[-1]
        if base in SKIP or sel in SKIP:
            continue
        cls = re.match(r'^\.([\w-]+)$', base)
        if not cls:
            continue
        name = cls.group(1)
        if base in guarded or sel in guarded:
            continue
        # есть ли в разметке длинный текст внутри такого блока?
        risky = False
        for m in re.finditer(r'class="[^"]*\b%s\b[^"]*"' % re.escape(name), html):
            chunk = html[m.end():m.end() + 700]
            if any(('<%s' % t) in chunk or ('"%s' % t) in chunk for t in TEXTY):
                risky = True
                break
        if risky:
            problems.append(base)

    for sel in problems:
        print('%s: флекс без min-width:0, а внутри длинный текст — '
              'на узком экране содержимое вылезет за край' % sel)
    if problems:
        print('\nНайдено: %d' % len(problems))
        return 1
    print('флекс-контейнеры с текстом защищены от переполнения '
          '(%d flex-правил, %d с min-width:0)' % (len(flex), len(guarded)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
