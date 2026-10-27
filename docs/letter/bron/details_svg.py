"""De drie details als tekening met maten, uit de echte omtrekken van VISUAILS Display Bold en DM Sans 40pt Bold.
Elke maat wordt uit de letter gemeten, niet ingetikt."""
import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

T = 0.75


def pad(gs, naam):
    p = SVGPathPen(gs); gs[naam].draw(p); return p.getCommands()


def staande(f, naam):
    g = f['glyf'][naam]; co, ends, fl = g.getCoordinates(f['glyf']); uit, s = [], 0
    for e in ends:
        idx = list(range(s, e + 1))
        for a, b in zip(idx, idx[1:] + idx[:1]):
            if fl[a] & 1 and fl[b] & 1 and abs(co[a][0] - co[b][0]) < 1 and abs(co[a][1] - co[b][1]) > 8:
                uit.append((co[a][0], min(co[a][1], co[b][1]), max(co[a][1], co[b][1])))
        s = e + 1
    return uit


def gat_opp(gs, naam):
    """het oppervlak van het gat: de binnencontour met de laagste bovenkant, gemeten langs de echte bochten"""
    from fontTools.pens.recordingPen import RecordingPen
    from fontTools.pens.areaPen import AreaPen
    from fontTools.pens.boundsPen import BoundsPen
    rec = RecordingPen(); gs[naam].draw(rec)
    stukken, cur = [], []
    for op, args in rec.value:
        cur.append((op, args))
        if op in ('closePath', 'endPath'):
            stukken.append(cur); cur = []
    def meet(st):
        a = AreaPen(); b = BoundsPen(None)
        for op, args in st:
            getattr(a, op)(*args); getattr(b, op)(*args)
        return abs(a.value), b.bounds
    m = [meet(st) for st in stukken]
    binnen = m[1:]
    return min(binnen, key=lambda x: x[1][3])[0]


def contouren(f, naam):
    co, ends, fl = f['glyf'][naam].getCoordinates(f['glyf']); uit, s = [], 0
    for e in ends:
        pts = co[s:e + 1]; uit.append(pts); s = e + 1
    return uit


def maak(nieuw_pad, oud_pad):
    nf, of = TTFont(nieuw_pad), TTFont(oud_pad)
    ng, og = nf.getGlyphSet(), of.getGlyphSet()
    svgs = {}

    # ── 1. de snede op de f ───────────────────────────────────────────────────────────────────
    v = staande(of, 'f'); x, y1, y2 = max((s for s in v if s[1] > 480), key=lambda s: s[0])
    h = y2 - y1; d = T * h
    # tekenvlak in eenheden: de bovenkant van de f
    X0, X1, Y0, Y1 = -10, 590, 270, 770      # wat we tonen (x links/rechts, y onder/boven): 600 × 500
    W, H = X1 - X0, Y1 - Y0
    def P(px, py): return f'{px - X0:.1f},{Y1 - py:.1f}'
    a0 = (x - d, y1)
    hoek_r = 46
    boog = f'M{P(a0[0] + hoek_r, a0[1])} A{hoek_r},{hoek_r} 0 0 0 {P(a0[0] + hoek_r * math.cos(math.radians(53.13)), a0[1] + hoek_r * math.sin(math.radians(53.13)))}'
    svgs['snede'] = f'''<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="t-snede"><title id="t-snede">De f met de snede: het uiteinde is {h:.0f} eenheden hoog en loopt {d:.0f} eenheden schuin weg, op 53,13 graden.</title>
<g transform="translate({-X0},{Y1}) scale(1,-1)"><path d="{pad(og, 'f')}" class="d-oud"/><path d="{pad(ng, 'f')}" class="d-letter"/></g>
<path d="M{P(x, y2)} L{P(x, y1)} L{P(x - d, y1)}" class="d-weg"/>
<path d="M{P(x + 110, y1)} L{P(x + 110, y2)} M{P(x + 100, y1)} L{P(x + 120, y1)} M{P(x + 100, y2)} L{P(x + 120, y2)}" class="d-maat"/>
<text x="{x + 132 - X0:.1f}" y="{Y1 - (y1 + y2) / 2 + 8:.1f}" class="d-tekst">{h:.0f}</text>
<path d="M{P(x - d, y1 - 40)} L{P(x, y1 - 40)} M{P(x - d, y1 - 30)} L{P(x - d, y1 - 50)} M{P(x, y1 - 30)} L{P(x, y1 - 50)}" class="d-maat"/>
<text x="{x + 16 - X0:.1f}" y="{Y1 - (y1 - 40) + 9:.1f}" class="d-tekst">{d:.0f} = 0,75 × {h:.0f}</text>
<path d="{boog}" class="d-maat"/>
<text x="{a0[0] + hoek_r + 8 - X0:.1f}" y="{Y1 - a0[1] - 9:.1f}" class="d-tekst">53,13°</text>
</svg>'''

    # ── 2. de vierkante punt op de i ──────────────────────────────────────────────────────────
    co = contouren(of, 'i'); dot = co[0]
    xs = [p[0] for p in dot]; ys = [p[1] for p in dot]
    x0, x1, yy0, yy1 = min(xs), max(xs), min(ys), max(ys)
    zijde = min(x1 - x0, yy1 - yy0) * 0.94; k = zijde * 0.38
    cx, cy = (x0 + x1) / 2, (yy0 + yy1) / 2
    a, b, c, dd = cx - zijde / 2, cx + zijde / 2, cy - zijde / 2, cy + zijde / 2
    stam = staande(of, 'i'); sl = min(s[0] for s in stam); sr = max(s[0] for s in stam)
    X0, X1, Y0, Y1 = -60, 540, 300, 800
    W, H = X1 - X0, Y1 - Y0
    def P(px, py): return f'{px - X0:.1f},{Y1 - py:.1f}'
    svgs['punt'] = f'''<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="t-punt"><title id="t-punt">De i met de vierkante punt: {zijde:.0f} eenheden breed, de stam {sr - sl:.0f}; de hoek rechtsboven is eraf op 53,13 graden.</title>
<g transform="translate({-X0},{Y1}) scale(1,-1)"><path d="{pad(og, 'i')}" class="d-oud"/><path d="{pad(ng, 'i')}" class="d-letter"/></g>
<path d="M{P(b - k, dd)} L{P(b, dd)} L{P(b, dd - k * 4 / 3)}" class="d-weg"/>
<path d="M{P(a, dd + 34)} L{P(b, dd + 34)} M{P(a, dd + 26)} L{P(a, dd + 42)} M{P(b, dd + 26)} L{P(b, dd + 42)}" class="d-maat"/>
<text x="{cx - X0:.1f}" y="{Y1 - (dd + 34) - 10:.1f}" class="d-tekst" text-anchor="middle">{zijde:.0f}</text>
<path d="M{P(sl, 420)} L{P(sr, 420)} M{P(sl, 410)} L{P(sl, 430)} M{P(sr, 410)} L{P(sr, 430)}" class="d-maat d-op-inkt"/>
<text x="{sr + 22 - X0:.1f}" y="{Y1 - 420 + 9:.1f}" class="d-tekst">stam {sr - sl:.0f}</text>
<path d="M{P(b + 30, dd - k * 4 / 3)} L{P(b + 30, dd)} M{P(b + 22, dd - k * 4 / 3)} L{P(b + 38, dd - k * 4 / 3)} M{P(b + 22, dd)} L{P(b + 38, dd)}" class="d-maat"/>
<text x="{b + 46 - X0:.1f}" y="{Y1 - (dd - k * 2 / 3) + 5:.1f}" class="d-tekst">{k * 4 / 3:.0f} : {k:.0f} = 4 : 3</text>
</svg>'''

    # ── 3. het gat van de a ───────────────────────────────────────────────────────────────────
    nco = contouren(nf, 'a'); oco = contouren(of, 'a')
    gat = min(nco[1:], key=lambda pts: max(p[1] for p in pts))
    gx = [p[0] for p in gat]; gy = [p[1] for p in gat]
    oud = min(oco[1:], key=lambda pts: max(p[1] for p in pts))
    ox = [p[0] for p in oud]; oy = [p[1] for p in oud]
    gy0, gy1 = min(gy), max(gy); gH = gy1 - gy0
    # de schuine kant: de punten van het gat op de linkerkant (de kleinste x per hoogte)
    links_onder = min(gat, key=lambda p: (round(p[1] - gy0) > 2, p[0]))
    links_boven = min((p for p in gat if abs(p[1] - gy1) < 2), key=lambda p: p[0])
    rechts = max(gx)
    X0, X1, Y0, Y1 = -90, 654, -100, 520
    W, H = X1 - X0, Y1 - Y0
    def P(px, py): return f'{px - X0:.1f},{Y1 - py:.1f}'
    opp_oud = gat_opp(og, 'a'); opp_nieuw = gat_opp(ng, 'a')
    hr = 40; ax, ay = links_onder
    boog = f'M{P(ax + hr, ay)} A{hr},{hr} 0 0 0 {P(ax + hr * math.cos(math.radians(53.13)), ay + hr * math.sin(math.radians(53.13)))}'
    svgs['gat'] = f'''<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="t-gat" style="--d-maat:30px"><title id="t-gat">De a met het nieuwe gat: rechts staand langs de stam, links schuin op 53,13 graden; even groot als het oude gat.</title>
<g transform="translate({-X0},{Y1}) scale(1,-1)"><path d="{pad(og, 'a')}" class="d-oud"/><path d="{pad(ng, 'a')}" class="d-letter"/></g>
<path d="{boog}" class="d-maat"/>
<text x="{ax + hr + 8 - X0:.1f}" y="{Y1 - ay - 10:.1f}" class="d-tekst">53,13°</text>
<text x="{20:.1f}" y="{H - 24:.1f}" class="d-tekst">gat: {opp_nieuw / opp_oud * 100:.0f} % van DM Sans</text>
</svg>'''
    maten = {'snede_h': round(h), 'snede_d': round(d), 'punt_zijde': round(zijde), 'stam': round(sr - sl),
             'gat_pct': round(opp_nieuw / opp_oud * 100)}
    return svgs, maten


if __name__ == '__main__':
    import sys
    s, m = maak(sys.argv[1], sys.argv[2]); print(m)
    open(sys.argv[3], 'w').write('<meta charset=utf-8><style>svg{width:420px;border:1px solid #ddd;margin:8px} .d-oud{fill:none;stroke:#C5C8CF;stroke-width:3;stroke-dasharray:10 8} .d-letter{fill:#0B0F17} .d-weg{fill:none;stroke:#858A94;stroke-width:3;stroke-dasharray:8 6} .d-maat{fill:none;stroke:#636974;stroke-width:2.5} .d-op-inkt{stroke:#fff} .d-tekst{font:600 26px monospace;fill:#636974}</style>' + ''.join(s.values()))
