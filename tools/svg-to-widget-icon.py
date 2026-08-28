#!/usr/bin/env python3
"""Конвертер SVG → PNG-значок виджета (0.9.36).

Зачем свой: в сборочной песочнице нет ни одного растеризатора SVG
(cairosvg/rsvg/inkscape недоступны). Нам нужен узкий случай — залитые
одноцветные значки Material Symbols, у которых путь состоит из команд
M/L/H/V/C/Q/A/Z. Это несложно нарисовать самим.

Как рисуем: разбираем path, переводим кривые и дуги в ломаные,
закрашиваем по правилу EVEN-ODD (пересечение подконтуров даёт дырку —
именно так устроены «кольцевые» значки). Рисуем в 4-кратном размере и
уменьшаем — получаем сглаживание без внешних библиотек.

Результат: белый силуэт на прозрачном фоне 96x96, как требует
assets/widget-icons/README.md (виджет перекрашивает его в цвет
показателя).

Использование:
    python3 tools/svg-to-widget-icon.py вход.svg выход.png
"""
import math
import re
import sys

from PIL import Image, ImageDraw

SS = 4          # суперсэмплинг
SIZE = 96       # итоговый размер
MARGIN = 0.04   # небольшой воздух, чтобы значок не лип к краю


def tokenize_path(d):
    """Строка path d → список (команда, [числа])."""
    out = []
    for cmd, args in re.findall(r'([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)', d):
        nums = [float(n) for n in re.findall(
            r'[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?', args)]
        out.append((cmd, nums))
    return out


def bezier3(p0, p1, p2, p3, steps=16):
    pts = []
    for i in range(1, steps + 1):
        t = i / steps
        u = 1 - t
        pts.append((u ** 3 * p0[0] + 3 * u * u * t * p1[0]
                    + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                    u ** 3 * p0[1] + 3 * u * u * t * p1[1]
                    + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
    return pts


def bezier2(p0, p1, p2, steps=12):
    pts = []
    for i in range(1, steps + 1):
        t = i / steps
        u = 1 - t
        pts.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return pts


def arc(p0, rx, ry, rot, large, sweep, p1, steps=24):
    """Эллиптическая дуга SVG (A) → ломаная. Формулы из спецификации."""
    if rx == 0 or ry == 0 or p0 == p1:
        return [p1]
    rx, ry = abs(rx), abs(ry)
    phi = math.radians(rot)
    dx2, dy2 = (p0[0] - p1[0]) / 2.0, (p0[1] - p1[1]) / 2.0
    x1 = math.cos(phi) * dx2 + math.sin(phi) * dy2
    y1 = -math.sin(phi) * dx2 + math.cos(phi) * dy2
    lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry)
    if lam > 1:
        s = math.sqrt(lam)
        rx, ry = rx * s, ry * s
    num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    den = rx * rx * y1 * y1 + ry * ry * x1 * x1
    co = math.sqrt(max(0.0, num / den)) if den else 0.0
    if large == sweep:
        co = -co
    cx1, cy1 = co * rx * y1 / ry, -co * ry * x1 / rx
    cx = math.cos(phi) * cx1 - math.sin(phi) * cy1 + (p0[0] + p1[0]) / 2.0
    cy = math.sin(phi) * cx1 + math.cos(phi) * cy1 + (p0[1] + p1[1]) / 2.0

    def ang(ux, uy, vx, vy):
        dot = ux * vx + uy * vy
        n = math.hypot(ux, uy) * math.hypot(vx, vy)
        a = math.acos(max(-1.0, min(1.0, dot / n))) if n else 0.0
        return -a if ux * vy - uy * vx < 0 else a

    t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
    dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry,
             (-x1 - cx1) / rx, (-y1 - cy1) / ry)
    if not sweep and dt > 0:
        dt -= 2 * math.pi
    elif sweep and dt < 0:
        dt += 2 * math.pi
    pts = []
    for i in range(1, steps + 1):
        t = t1 + dt * i / steps
        px = math.cos(phi) * rx * math.cos(t) - math.sin(phi) * ry * math.sin(t) + cx
        py = math.sin(phi) * rx * math.cos(t) + math.cos(phi) * ry * math.sin(t) + cy
        pts.append((px, py))
    return pts


def path_to_subpaths(d):
    """path d → список замкнутых ломаных."""
    subs, cur = [], []
    x = y = sx = sy = 0.0
    prev_c = prev_q = None
    for cmd, a in tokenize_path(d):
        up = cmd.upper()
        rel = cmd.islower()
        i = 0
        if up == 'Z':
            if cur:
                subs.append(cur)
                cur = []
            x, y = sx, sy
            continue
        while True:
            if up == 'M':
                if i + 2 > len(a):
                    break
                nx, ny = a[i], a[i + 1]
                if rel:
                    nx, ny = x + nx, y + ny
                if cur:
                    subs.append(cur)
                cur = [(nx, ny)]
                x, y = sx, sy = nx, ny
                i += 2
                up = 'L'      # последующие пары — линии
            elif up == 'L':
                if i + 2 > len(a):
                    break
                nx, ny = a[i], a[i + 1]
                if rel:
                    nx, ny = x + nx, y + ny
                cur.append((nx, ny))
                x, y = nx, ny
                i += 2
            elif up in 'HV':
                if i + 1 > len(a):
                    break
                v = a[i]
                if up == 'H':
                    nx = x + v if rel else v
                    ny = y
                else:
                    nx = x
                    ny = y + v if rel else v
                cur.append((nx, ny))
                x, y = nx, ny
                i += 1
            elif up in 'CS':
                need = 6 if up == 'C' else 4
                if i + need > len(a):
                    break
                if up == 'C':
                    c1 = (a[i] + (x if rel else 0), a[i + 1] + (y if rel else 0))
                    c2 = (a[i + 2] + (x if rel else 0), a[i + 3] + (y if rel else 0))
                    ex = (a[i + 4] + (x if rel else 0), a[i + 5] + (y if rel else 0))
                else:
                    c1 = (2 * x - prev_c[0], 2 * y - prev_c[1]) if prev_c else (x, y)
                    c2 = (a[i] + (x if rel else 0), a[i + 1] + (y if rel else 0))
                    ex = (a[i + 2] + (x if rel else 0), a[i + 3] + (y if rel else 0))
                cur.extend(bezier3((x, y), c1, c2, ex))
                prev_c, prev_q = c2, None
                x, y = ex
                i += need
            elif up in 'QT':
                need = 4 if up == 'Q' else 2
                if i + need > len(a):
                    break
                if up == 'Q':
                    c1 = (a[i] + (x if rel else 0), a[i + 1] + (y if rel else 0))
                    ex = (a[i + 2] + (x if rel else 0), a[i + 3] + (y if rel else 0))
                else:
                    c1 = (2 * x - prev_q[0], 2 * y - prev_q[1]) if prev_q else (x, y)
                    ex = (a[i] + (x if rel else 0), a[i + 1] + (y if rel else 0))
                cur.extend(bezier2((x, y), c1, ex))
                prev_q, prev_c = c1, None
                x, y = ex
                i += need
            elif up == 'A':
                if i + 7 > len(a):
                    break
                ex = (a[i + 5] + (x if rel else 0), a[i + 6] + (y if rel else 0))
                cur.extend(arc((x, y), a[i], a[i + 1], a[i + 2],
                               int(a[i + 3]), int(a[i + 4]), ex))
                x, y = ex
                i += 7
            else:
                break
            if i >= len(a):
                break
    if cur:
        subs.append(cur)
    return subs


def viewbox(svg):
    m = re.search(r'viewBox\s*=\s*"([^"]+)"', svg)
    if m:
        v = [float(n) for n in m.group(1).split()]
        if len(v) == 4:
            return v
    return [0, 0, 24, 24]


def convert(src, dst, size=SIZE):
    svg = open(src, encoding='utf-8').read()
    vx, vy, vw, vh = viewbox(svg)
    S = size * SS

    # Собираем геометрию: path + примитивы, которые встречаются в наборах.
    subpaths = []
    for d in re.findall(r'<path[^>]*\sd\s*=\s*"([^"]+)"', svg):
        subpaths.extend(path_to_subpaths(d))
    for cx, cy, r in re.findall(
            r'<circle[^>]*cx="([-\d.]+)"[^>]*cy="([-\d.]+)"[^>]*r="([-\d.]+)"', svg):
        cx, cy, r = float(cx), float(cy), float(r)
        subpaths.append([(cx + r * math.cos(a * math.pi / 18),
                          cy + r * math.sin(a * math.pi / 18)) for a in range(36)])
    for x1, y1, x2, y2 in re.findall(
            r'<rect[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*width="([-\d.]+)"[^>]*height="([-\d.]+)"',
            svg):
        x1, y1, w, h = float(x1), float(y1), float(x2), float(y2)
        subpaths.append([(x1, y1), (x1 + w, y1), (x1 + w, y1 + h), (x1, y1 + h)])
    if not subpaths:
        raise SystemExit('в %s нет распознанной геометрии' % src)

    k = (1 - 2 * MARGIN) * S / max(vw, vh)
    ox = (S - vw * k) / 2 - vx * k
    oy = (S - vh * k) / 2 - vy * k

    # EVEN-ODD: каждый подконтур инвертирует область. Так получаются дырки
    # (кольца, циферблаты) без разбора направления обхода.
    acc = Image.new('L', (S, S), 0)
    for sp in subpaths:
        if len(sp) < 3:
            continue
        layer = Image.new('L', (S, S), 0)
        ImageDraw.Draw(layer).polygon(
            [(p[0] * k + ox, p[1] * k + oy) for p in sp], fill=255)
        acc = Image.frombytes('L', acc.size, bytes(
            a ^ b for a, b in zip(acc.tobytes(), layer.tobytes())))

    mask = acc.resize((size, size), Image.Resampling.LANCZOS)
    out = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    out.putalpha(mask)
    white = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    white.putalpha(mask)
    white.save(dst)
    return white


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    convert(sys.argv[1], sys.argv[2])
    print('wrote', sys.argv[2])
