#!/usr/bin/env python3
"""Ищет кнопки, которые вылезут за край экрана (0.9.43).

Полевой баг: в теме «Спорт» кнопка «✨ Анализировать выбранный период»
уходила за правую границу. Причин было три сразу:
  1) `flex: 0 0 auto` — кнопке запрещено сжиматься;
  2) `height` фиксированной величиной — перенос текста её бы разорвал;
  3) тема «Спорт» пишет подписи капслоком и добавляет letter-spacing,
     отчего строка становится примерно на четверть шире.
На других темах та же подпись чуть не дотягивала до края — поэтому баг
и выглядел «только спортивным».

Браузера в песочнице нет, поэтому оцениваем ширину аналитически: берём
реальный шрифт из assets, применяем правила темы (uppercase + разрядку) и
сравниваем с шириной контента на самом узком типовом экране.

Запуск: python3 tools/check-button-overflow.py
Код возврата 1, если найдена кнопка, которая не влезает и не умеет
переноситься или сжиматься.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')
CSS_RAW = (ROOT / 'style.css').read_text(encoding='utf-8')
# Комментарии убираем до разбора: иначе пояснение вида «height: 38px
# фиксировал одну строку» читается как объявление и даёт ложный вызов.
CSS = re.sub(r'/\*.*?\*/', '', CSS_RAW, flags=re.S)

# Самый узкий экран, который стоит держать: 360 dp — типовой бюджетный
# Android. Из него вычитаем поля страницы и внутренние поля карточки.
SCREEN_DP = 360
PAGE_PAD = 16 * 2      # поля контента
CARD_PAD = 14 * 2      # поля карточки
BTN_PAD = 16 * 2       # горизонтальные поля самой кнопки
CONTENT = SCREEN_DP - PAGE_PAD - CARD_PAD - BTN_PAD

# Тема «Спорт»: капслок + разрядка 0.05em для .btn.
SPORT_TRACKING = 0.05

FONT = ROOT / 'assets' / 'fonts' / 'manrope-bold.ttf'


def rules(css):
    out, depth, buf, sel = [], 0, '', ''
    for ch in css:
        if ch == '{':
            depth += 1
            if depth == 1:
                sel, buf = buf.strip(), ''
                continue
        elif ch == '}':
            depth -= 1
            if depth == 0:
                out.append((sel, buf))
                buf = ''
                continue
        buf += ch
    return out


def props_for(rule_list, ident):
    """Все объявления, относящиеся к #id (в порядке следования)."""
    acc = {}
    for sel, body in rule_list:
        if not re.search(r'#%s\b' % re.escape(ident), sel):
            continue
        for m in re.finditer(r'([\w-]+)\s*:\s*([^;]+)', body):
            acc[m.group(1).strip()] = m.group(2).strip()
    return acc


def measure(text, px, tracking_em):
    try:
        from PIL import ImageFont
    except ImportError:
        # без Pillow — грубая оценка
        return len(text) * px * 0.55
    f = ImageFont.truetype(str(FONT), int(px))
    return f.getlength(text) + len(text) * px * tracking_em


def main():
    rule_list = rules(CSS)
    problems = []

    for m in re.finditer(
            r'<button[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>(.*?)</button>',
            HTML, re.S):
        tag, inner = m.group(0), m.group(1)
        idm = re.search(r'id="([\w-]+)"', tag)
        if not idm:
            continue
        ident = idm.group(1)
        label = re.sub(r'<[^>]+>', '', inner)
        label = re.sub(r'\s+', ' ', label).strip()
        if len(label) < 12:
            continue

        p = props_for(rule_list, ident)
        # кегль кнопки: своё правило или базовые 0.9rem
        size_rem = 0.9
        if 'font-size' in p:
            fm = re.match(r'([\d.]+)rem', p['font-size'])
            if fm:
                size_rem = float(fm.group(1))
        px = size_rem * 16

        # тема «Спорт» — капслок и разрядка
        width = measure(label.upper(), px, SPORT_TRACKING)
        if width <= CONTENT:
            continue

        # Не влезает в одну строку — это само по себе НЕ баг: <button>
        # по умолчанию переносит текст (white-space: normal), и подпись
        # просто займёт две строки. Ищем только то, что переносу мешает.
        flex = p.get('flex', '')
        why = []
        if flex.startswith('0 0') or p.get('flex-shrink') == '0':
            why.append('flex не даёт сжиматься')
        # фиксированная высота: перенесённая строка вылезет или обрежется
        if 'height' in p and not re.match(r'auto|fit-content', p['height']):
            why.append('фиксированная height ломает перенос')
        if p.get('white-space') == 'nowrap':
            why.append('white-space: nowrap')
        if why:
            problems.append((ident, round(width), label, why))

    for ident, w, label, why in problems:
        print('#%s: «%s»' % (ident, label))
        print('   в теме «Спорт» ~%d dp при доступных %d dp; %s'
              % (w, CONTENT, ', '.join(why)))
    if problems:
        print('\nНайдено: %d' % len(problems))
        return 1
    print('кнопки с длинными подписями умеют переноситься '
          'или сжиматься (проверено на %d dp, тема «Спорт»)' % SCREEN_DP)
    return 0


if __name__ == '__main__':
    sys.exit(main())
