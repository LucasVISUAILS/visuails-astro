"""De lockups van het V-merk (V_D) en het tekstlogo (K5), uitgerekend in de maten van K5 (kaphoogte c = 700)."""
import json, math, re
from shapely.geometry import Polygon
from shapely import affinity
import os
P = os.path.dirname(os.path.abspath(__file__))
V_D = ['M 0.0 16.0 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 L 515.5 546.25 L 264.5 119.0 A 201.21 201.21 0 0 0 101.0 15.75 L 0.0 16.0 Z',
       'M 701.75 0.0 L 543.25 366.25 L 507.25 453.75 L 652.0 259.25 L 702.0 338.25 L 701.75 0.0 Z']
K5 = json.load(open(os.path.join(P, 'k-varianten.json')))['K5']
C = 700.0                      # kaphoogte van K5
STAM = 152.6                   # stam van de I in K5 (21,8 % van c)
VB, VH = 702.0, 813.25         # V-merk
ARM = 178.34                   # de arm van de V loodrecht gemeten (21,9 % van VH)
KB = 3763.74                   # breedte van K5
# zwaartepunt van de V (vlak), met de boog als veelhoek
def v_poly():
    a = [(0, 16), (144.25, 266.75), (463.25, 813.25), (662.75, 354.75), (619.25, 408.25), (515.5, 546.25), (264.5, 119.0)]
    # boog van (264.5,119) naar (101,15.75), straal 201.21, linksom (sweep 0): benader met punten
    x1, y1, x2, y2, r = 264.5, 119.0, 101.0, 15.75, 201.21
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2; dx, dy = x2 - x1, y2 - y1; q = math.hypot(dx, dy); h = math.sqrt(r * r - (q / 2) ** 2)
    # sweep-flag 0, large-arc 0: middelpunt aan de kant die de boog tegen de klok in laat lopen (in y-omlaag)
    cands = [(mx - dy / q * h, my + dx / q * h), (mx + dy / q * h, my - dx / q * h)]
    best = None
    for cx, cy in cands:
        t1 = math.atan2(y1 - cy, x1 - cx); t2 = math.atan2(y2 - cy, x2 - cx)
        d = (t2 - t1)
        while d > math.pi: d -= 2 * math.pi
        while d < -math.pi: d += 2 * math.pi
        if d < 0 and best is None: best = (cx, cy, t1, d)   # tegen de klok in (scherm): negatieve hoek
    cx, cy, t1, d = best
    boog = [(cx + r * math.cos(t1 + d * i / 24), cy + r * math.sin(t1 + d * i / 24)) for i in range(1, 24)]
    links = Polygon(a + boog + [(101.0, 15.75)]).buffer(0)
    rechts = Polygon([(701.75, 0), (543.25, 366.25), (507.25, 453.75), (652.0, 259.25), (702.0, 338.25)]).buffer(0)
    return links.union(rechts)
VP = v_poly()
ZW = VP.centroid
LOCK = {}
def maak(naam, s, plaats):
    LOCK[naam] = dict(s=s, **plaats)
# L1 · naast, even zwaar: de arm van de V = de stam van K5, dus de V is zo hoog als de kaphoogte; tussenruimte = één arm
s1 = STAM / ARM
g1 = ARM * s1
maak('L1', s1, dict(vx=0, vy=-C + (C - VH * s1) / 2, tx=VB * s1 + g1, ty=0, gap=g1))
# L2 · naast, de V twee kaphoogtes: de kaphoogte van de tekst staat midden op het zwaartepunt van de V; tussenruimte = één arm
s2 = 2 * C / VH
g2 = ARM * s2
vy2 = -C / 2 - ZW.y * s2        # zwaartepunt (y) van de V op het midden van de kaphoogte (y = −350)
maak('L2', s2, dict(vx=0, vy=vy2, tx=VB * s2 + g2, ty=0, gap=g2))
# L3 · gestapeld: dezelfde V (twee kaphoogtes), het zwaartepunt (x) boven het midden van het woord; tussenruimte = één arm
s3 = s2; g3 = ARM * s3
maak('L3', s3, dict(vx=KB / 2 - ZW.x * s3, vy=-C - g3 - VH * s3, tx=0, ty=0, gap=g3))
def kader(L):
    vx, vy, s = L['vx'], L['vy'], L['s']
    x0 = min(vx, L['tx']); x1 = max(vx + VB * s, L['tx'] + KB)
    y0 = min(vy, -712); y1 = max(vy + VH * s, 12)
    return x0, y0, x1, y1
for n, L in LOCK.items():
    L['kader'] = kader(L)
def svg(naam, kleur='#0F1217', ruimte=C, maat=False, extra=''):
    L = LOCK[naam]; x0, y0, x1, y1 = L['kader']
    vb = (x0 - ruimte, y0 - ruimte, x1 - x0 + 2 * ruimte, y1 - y0 + 2 * ruimte)
    v = ''.join(f'<path d="{d}"/>' for d in V_D)
    m = ''
    if maat:
        m = maatlijnen(naam)
    return (f'<svg viewBox="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VISUAILS">'
            f'<g fill="{kleur}"><g transform="translate({L["vx"]:.2f} {L["vy"]:.2f}) scale({L["s"]:.5f})">{v}</g>'
            f'<path transform="translate({L["tx"]:.2f} {L["ty"]:.2f})" d="{K5["d"]}" fill-rule="evenodd"/></g>{m}{extra}</svg>')
def maatlijnen(naam, kleur='#25508B'):
    L = LOCK[naam]; x0, y0, x1, y1 = L['kader']; s = L['s']
    w = 7; o = []
    o.append(f'<rect x="{x0 - C:.1f}" y="{y0 - C:.1f}" width="{x1 - x0 + 2 * C:.1f}" height="{y1 - y0 + 2 * C:.1f}" fill="none" stroke="{kleur}" stroke-width="{w}" stroke-dasharray="40 30"/>')
    o.append(f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{x1 - x0:.1f}" height="{y1 - y0:.1f}" fill="none" stroke="{kleur}" stroke-width="{w * .6}" opacity=".5"/>')
    tx = L['tx']
    for y in (-C, 0):   # kaplijn en basislijn
        o.append(f'<line x1="{x0 - C * .6:.1f}" x2="{x1 + C * .6:.1f}" y1="{y}" y2="{y}" stroke="{kleur}" stroke-width="{w * .6}"/>')
    zx, zy = L['vx'] + ZW.x * s, L['vy'] + ZW.y * s
    o.append(f'<circle cx="{zx:.1f}" cy="{zy:.1f}" r="{30}" fill="none" stroke="#C2410C" stroke-width="{w}"/><line x1="{zx - 60:.1f}" x2="{zx + 60:.1f}" y1="{zy:.1f}" y2="{zy:.1f}" stroke="#C2410C" stroke-width="{w}"/><line y1="{zy - 60:.1f}" y2="{zy + 60:.1f}" x1="{zx:.1f}" x2="{zx:.1f}" stroke="#C2410C" stroke-width="{w}"/>')
    return ''.join(o)
if __name__ == '__main__':
    print('zwaartepunt V', round(ZW.x, 2), round(ZW.y, 2), 'vlak', round(VP.area))
    for n, L in LOCK.items():
        x0, y0, x1, y1 = L['kader']
        print(n, 's', round(L['s'], 4), 'V-hoogte', round(VH * L['s'], 1), f'({VH * L["s"] / C:.3f} c)', 'tussen', round(L['gap'], 1), f'({L["gap"] / C:.3f} c)',
              'kader', round(x1 - x0, 1), '×', round(y1 - y0, 1), f'= {(x1 - x0) / C:.3f} c × {(y1 - y0) / C:.3f} c')
    html = '<!doctype html><meta charset=utf-8><body style="margin:0;background:#fff">' + ''.join(
        f'<div style="padding:20px;border-bottom:1px solid #ddd">{svg(n, maat=True).replace("<svg ", "<svg style=\"height:260px;width:auto;display:block\" ")}</div>' for n in LOCK)
    os.makedirs(os.path.join(P, 'lock'), exist_ok=True)
    open(os.path.join(P, 'lock', 'proef.html'), 'w').write(html)
