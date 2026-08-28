#!/usr/bin/env python3
"""Ловит перекрытие локальной переменной параметром catch (0.9.39).

Зачем: в песочнице нет JDK, ошибки компиляции всплывают только на
GitHub Actions через две минуты сборки. Этот класс ошибок —
`catch (Throwable t)` там, где `t` уже объявлена в объемлющем блоке —
javac считает фатальным ("variable t is already defined"), а глазами он
не виден: точно такой же catch двумя методами ниже совершенно законен.

Разбор грубый, но для наших файлов достаточный: следим за глубиной
фигурных скобок и держим стек объявленных простых имён.

Запуск: python3 tools/check-java-scopes.py [файлы...]
Код возврата 1, если что-то найдено.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DECL = re.compile(
    r'\b(?:final\s+)?(?:int|long|float|double|boolean|char|byte|short|String|'
    r'Throwable|Exception|Paint|Canvas|Bitmap|Context|RemoteViews|View|'
    r'var)\s+([a-z_]\w*)\s*(?==[^=]|;|:|\))')
CATCH = re.compile(r'\bcatch\s*\(\s*(?:final\s+)?[\w.]+\s+([a-z_]\w*)\s*\)')
FOR_EACH = re.compile(r'\bfor\s*\(\s*(?:final\s+)?[\w.<>\[\]]+\s+([a-z_]\w*)\s*:')
PARAMS = re.compile(r'\b[\w.<>\[\],\s]+\s+([a-z_]\w*)\s*(?:,|\))')


def strip_noise(src):
    """Убирает строки и комментарии, сохраняя длину текста."""
    out = list(src)
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            while i < n and src[i] != '\n':
                out[i] = ' '
                i += 1
        elif c == '/' and i + 1 < n and src[i + 1] == '*':
            while i < n and not (src[i] == '*' and i + 1 < n and src[i + 1] == '/'):
                if src[i] != '\n':
                    out[i] = ' '
                i += 1
            for j in range(i, min(i + 2, n)):
                out[j] = ' '
            i += 2
        elif c in '"\'':
            q = c
            out[i] = ' '
            i += 1
            while i < n and src[i] != q:
                if src[i] == '\\':
                    out[i] = ' '
                    i += 1
                if i < n and src[i] != '\n':
                    out[i] = ' '
                i += 1
            if i < n:
                out[i] = ' '
            i += 1
        else:
            i += 1
    return ''.join(out)


def check(path):
    raw = Path(path).read_text(encoding='utf-8')
    src = strip_noise(raw)
    problems = []
    # стек областей: список множеств имён; индекс = глубина скобок
    scopes = [set()]
    line = 1
    i, n = 0, len(src)
    # позиции начала каждой строки для расчёта номера
    while i < n:
        c = src[i]
        if c == '\n':
            line += 1
            i += 1
            continue
        if c == '{':
            scopes.append(set())
            i += 1
            continue
        if c == '}':
            if len(scopes) > 1:
                scopes.pop()
            i += 1
            continue
        m = CATCH.match(src, i)
        if m:
            name = m.group(1)
            for depth, s in enumerate(scopes):
                if name in s:
                    problems.append((line, name))
                    break
            # параметр catch живёт в своём блоке — добавим при '{'
            i = m.end()
            continue
        m = FOR_EACH.match(src, i)
        if m:
            scopes[-1].add(m.group(1))
            i = m.end()
            continue
        m = DECL.match(src, i)
        if m:
            scopes[-1].add(m.group(1))
            i = m.end()
            continue
        i += 1
    return problems


def main():
    files = sys.argv[1:] or sorted(
        str(p) for p in (ROOT / 'android-native').glob('*.java'))
    bad = 0
    for f in files:
        for line, name in check(f):
            rel = Path(f).relative_to(ROOT) if str(f).startswith(str(ROOT)) else f
            print('%s:%d: параметр catch «%s» перекрывает локальную '
                  'переменную — javac откажется компилировать' % (rel, line, name))
            bad += 1
    if bad:
        print('\nНайдено проблем: %d' % bad)
        return 1
    print('перекрытий в catch нет (%d файлов)' % len(files))
    return 0


if __name__ == '__main__':
    sys.exit(main())
