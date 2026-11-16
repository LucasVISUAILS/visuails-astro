"""VISUAILS Display Blok: de blokkige kopletter van de hoofdkop op de voorpagina, uit het systeem van het V-merk.

Levering 110 (16 november 2026). Gekozen in lijst 119 (Q1 d, de smalle richting), breder gemaakt na zijn notitie
("Ik wil de letters breder hebben"): richting D, tussen C (smal) en A in. Alleen voor de ene hoofdkop; nooit voor
het woord VISUAILS (dat is het woordmerk).

Lucas, 16 november 2026, 01:52: "een wat meer hoekerige variant maar wel met hetzelfde systeem. Een beetje als het voorbeeld
maar dan gebruik maken van het VISUAILS font systeem."

Het systeem (docs/letter/LEESMIJ.md, de skill visuails-ontwerptaal):
  stam      21,8 % van de kaphoogte (de lijndikte van het V-merk); liggende streken iets dunner (optisch gelijk)
  binnen    vierkante binnenvormen, platte uiteinden
  hoek      één zachte hoek per teken, linksboven, R = 24,7 % van de kaphoogte (de bocht van het V-merk)
  snede     één recht open uiteinde per teken eindigt schuin als "/" op 53,13° (0,75 opzij op 1 omhoog)
  kier      (richting B) achter de snede een los vlagje, met een kier van 7,6 % van de kaphoogte en een kleine verschuiving,
            zoals de vlag van de V
  punt      vierkant, met de hoek rechtsboven eraf (0,38 × de zijde breed, 4/3 daarvan hoog)
Alleen hoofdletters (de kop staat in hoofdletters); kleine letters wijzen naar dezelfde tekens.

Gebruik: python3 blok.py [D|A|B|C] uitmap   (nodig: fonttools, shapely, brotli)
Uit: VISUAILSDisplayBlok.ttf en .woff2; de site gebruikt public/fonts/visuails-display/VISUAILSDisplayBlok-Bold.woff2.
"""
import sys, math
from shapely.geometry import Polygon, box, Point, MultiPolygon
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

RICHTING = sys.argv[1] if len(sys.argv) > 1 else 'D'   # D is de letter van de site (levering 110); A, B en C zijn de proeven uit lijst 119 en 120
UIT = sys.argv[2] if len(sys.argv) > 2 else '.'
H = 700
S = round(0.218 * H)            # 153: de stam
h = round(S * 0.9)              # 138: liggend
R = 0.247 * H                   # 173: de zachte hoek
T = 0.75                        # de snede
KIER = 0.076 * H                # 53
BREED = RICHTING == 'B'
W0 = 700 if BREED else {"C": 450, "D": 500}.get(RICHTING, 540)   # gewone breedte van een teken (C smal zoals het woordmerk, D daartussen)
ZIJ = {"C": 50, "D": 56}.get(RICHTING, 64)   # ruimte links en rechts
NAAM = 'VISUAILS Display Blok' + ('' if RICHTING == 'D' else ' ' + RICHTING)


def rect(x0, y0, x1, y1): return box(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
def poly(*p): return Polygon(p)


def hoek_lb(g, x0=0, y1=H, r=R):
    """de zachte hoek linksboven op (x0, y1)"""
    weg = rect(x0 - 1, y1 - r, x0 + r, y1 + 1).difference(Point(x0 + r, y1 - r).buffer(r, resolution=48))
    return g.difference(weg)


def snede(g, xr, y0, y1):
    """het uiteinde van een liggende arm (y0..y1) rechts op xr wordt '/': boven xr, onder xr − 0,75 × de dikte.
    Richting B: daarachter een los vlagje met een kier, iets omhoog geschoven."""
    t = y1 - y0
    if not BREED:
        return g.difference(poly((xr - T * t, y0 - 1), (xr + 400, y0 - 1), (xr + 400, y1 + 0.5), (xr, y1 + 0.5)))
    fl = T * t * 1.05                       # het vlagje: even breed als de snede zelf
    gh = KIER * 1.25                        # liggende maat van een loodrechte kier van KIER
    xa = xr - fl - gh                       # hier stopt de arm (boven)
    g = g.difference(poly((xa - T * t, y0 - 1), (xr + 400, y0 - 1), (xr + 400, y1 + 0.5), (xa, y1 + 0.5)))
    sh = KIER * 0.5                         # de kleine verschuiving
    vlag = poly((xr - fl - T * t, y0 + sh), (xr - T * t, y0 + sh), (xr, y1 + sh), (xr - fl, y1 + sh))
    return g.union(vlag)


def vierkant_punt(x, y, z):
    """vierkante punt met de hoek rechtsboven eraf"""
    b = rect(x, y, x + z, y + z)
    a = 0.38 * z
    return b.difference(poly((x + z - a, y + z + 1), (x + z + 1, y + z + 1), (x + z + 1, y + z - a * 4 / 3)))


def schuin(x0, y0, x1, y1, d):
    """een schuine streek van (x0,y0) naar (x1,y1), liggend gemeten d breed"""
    return poly((x0, y0), (x0 + d, y0), (x1 + d, y1), (x1, y1))


W = {}
def teken(c, w=None):
    def reg(f):
        W[c] = (f, w)
        return f
    return reg


def bw(k=1.0): return round(W0 * k)

# ── de letters ───────────────────────────────────────────────────────────────────────────────
@teken('A')
def A(w):
    g = rect(0, 0, w, H).difference(rect(S, 0 - 1, w - S, H * 0.42 - h / 2)).difference(rect(S, H * 0.42 + h / 2, w - S, H - h))
    c = 0.55 * S   # de rechterbovenhoek op 53°
    g = g.difference(poly((w - c * 1.0, H + 1), (w + 1, H + 1), (w + 1, H - c / T)))
    return hoek_lb(g)

@teken('B')
def B(w):
    m = H * 0.5
    g = rect(0, 0, w, H).difference(rect(S, h, w - S, m - h / 2)).difference(rect(S, m + h / 2, w - S * 1.05, H - h))
    g = g.difference(rect(w - S * 0.42, m - h * 0.32, w + 1, m + h * 0.32))   # de inkeping rechts in het midden
    return hoek_lb(g)

@teken('C')
def C(w):
    g = rect(0, 0, w, H).difference(rect(S, h, w + 1, H - h))
    return snede(hoek_lb(g), w, H - h, H)

@teken('D')
def D(w):
    g = rect(0, 0, w, H).difference(rect(S, h, w - S, H - h))
    c = 1.05 * S
    g = g.difference(poly((w - c, -1), (w + 1, -1), (w + 1, c / T))).difference(poly((w - c, H + 1), (w + 1, H + 1), (w + 1, H - c / T)))
    return hoek_lb(g)

@teken('E')
def E(w):
    m = H * 0.5
    g = unary_union([rect(0, 0, S, H), rect(0, H - h, w, H), rect(0, m - h / 2, w * 0.86, m + h / 2), rect(0, 0, w, h)])
    return snede(hoek_lb(g), w, H - h, H)

@teken('F')
def F(w):
    m = H * 0.48
    g = unary_union([rect(0, 0, S, H), rect(0, H - h, w, H), rect(0, m - h / 2, w * 0.86, m + h / 2)])
    return snede(hoek_lb(g), w, H - h, H)

@teken('G')
def G(w):
    m = H * 0.48
    g = rect(0, 0, w, H).difference(rect(S, h, w + 1, H - h))
    g = unary_union([g, rect(w - S, 0, w, m + h / 2), rect(w * 0.5, m - h / 2, w, m + h / 2)])
    return snede(hoek_lb(g), w, H - h, H)

@teken('H')
def H_(w):
    m = H * 0.5
    return unary_union([rect(0, 0, S, H), rect(w - S, 0, w, H), rect(0, m - h / 2, w, m + h / 2)])

@teken('I', 0)
def I(w): return rect(0, 0, S, H)

@teken('J', 0.86)
def J(w):
    return unary_union([rect(w - S, 0, w, H), rect(0, 0, w, h), rect(0, 0, S, H * 0.36)])

@teken('K')
def K(w):
    m = H * 0.5
    d = S * 1.12
    arm = schuin(S * 0.6, m - h / 2, w - d, H, d).intersection(rect(S, m - h / 2, w, H))
    been = schuin(w - d, 0, S * 0.6, m + h / 2, d).intersection(rect(S, 0, w, m + h / 2))
    return unary_union([rect(0, 0, S, H), arm, been])

@teken('L', 0.9)
def L(w):
    g = unary_union([rect(0, 0, S, H), rect(0, 0, w, h)])
    return snede(g, w, 0, h)

@teken('M', 1.32)
def M(w):
    g = rect(0, 0, w, H).difference(rect(S, -1, w / 2 - S / 2, H - h)).difference(rect(w / 2 + S / 2, -1, w - S, H - h))
    return hoek_lb(g)

@teken('N', 1.04)
def N(w):
    d = S * 1.18
    return unary_union([rect(0, 0, S, H), rect(w - S, 0, w, H), schuin(0, H, w - d, 0, d).intersection(rect(0, 0, w, H))])

@teken('O')
def O(w): return hoek_lb(rect(0, 0, w, H).difference(rect(S, h, w - S, H - h)))

@teken('P')
def P(w):
    m = H * 0.4
    g = unary_union([rect(0, 0, S, H), rect(0, m - h / 2, w, H).difference(rect(S, m + h / 2, w - S, H - h))])
    return hoek_lb(g)

@teken('Q')
def Q(w):
    g = rect(0, 0, w, H).difference(rect(S, h, w - S, H - h))
    staart = schuin(w * 0.52, h * 1.6, w * 0.52 + 2 * S * T * 1.4, -h * 0.7, S * 1.0)
    g = g.union(staart.intersection(rect(w * 0.45, -h, w + S * 0.6, h * 1.6)))
    return hoek_lb(g)

@teken('R')
def R_(w):
    m = H * 0.42
    bol = rect(0, m - h / 2, w, H).difference(rect(S, m + h / 2, w - S, H - h))
    d = S * 1.12
    been = schuin(w - d, 0, w * 0.36, m, d).intersection(rect(0, 0, w, m))
    return hoek_lb(unary_union([rect(0, 0, S, H), bol, been]))

@teken('S')
def S_(w):
    m = H * 0.5
    g = unary_union([rect(0, H - h, w, H), rect(0, m, S, H), rect(0, m - h / 2, w, m + h / 2), rect(w - S, 0, w, m), rect(0, 0, w, h)])
    return snede(hoek_lb(g), w, H - h, H)

@teken('T')
def T_(w):
    g = unary_union([rect(0, H - h, w, H), rect(w / 2 - S / 2, 0, w / 2 + S / 2, H)])
    return snede(g, w, H - h, H)

@teken('U')
def U(w): return rect(0, 0, w, H).difference(rect(S, h, w - S, H + 1))

@teken('V', 1.0)
def V(w):
    # recht omlaag, dan op 53,13° naar binnen (de snede van het V-merk), onderaan plat
    xb = min(H * 0.5 * T, (w - S * 1.1) / 2)   # onderaan blijft hij minstens zo breed als de stam
    yk = xb / T
    buiten = poly((0, H), (0, yk), (xb, 0), (w - xb, 0), (w, yk), (w, H))
    binnen = buiten.buffer(-S, join_style=2, mitre_limit=4).buffer(0).union(rect(S, max(yk, h * 1.6), w - S, H + 10))
    return buiten.difference(binnen)

@teken('W', 1.32)
def W_(w):
    return rect(0, 0, w, H).difference(rect(S, h, w / 2 - S / 2, H + 1)).difference(rect(w / 2 + S / 2, h, w - S, H + 1))

@teken('X', 1.04)
def X(w):
    d = S * 1.15
    return unary_union([schuin(0, H, w - d, 0, d), schuin(0, 0, w - d, H, d)]).intersection(rect(0, 0, w, H))

@teken('Y', 1.0)
def Y(w):
    m = H * 0.45
    return unary_union([rect(0, m - h / 2, S, H), rect(w - S, m - h / 2, w, H), rect(0, m - h / 2, w, m + h / 2), rect(w / 2 - S / 2, 0, w / 2 + S / 2, m)])

@teken('Z')
def Z(w):
    d = S * 1.25
    g = unary_union([rect(0, H - h, w, H), rect(0, 0, w, h), schuin(0, h - 1, w - d, H - h + 1, d)])
    return snede(g, w, 0, h)

# ── leestekens ────────────────────────────────────────────────────────────────────────────────
PZ = round(S * 1.02)
@teken('.', 0)
def punt(w): return vierkant_punt(0, 0, PZ)
@teken(',', 0)
def komma(w): return poly((0, -PZ * 0.75), (PZ * 0.62, -PZ * 0.75), (PZ, PZ), (PZ * 0.38, PZ)).union(rect(PZ * 0.12, 0, PZ, PZ).intersection(poly((0, -PZ * 0.75), (PZ * 0.62, -PZ * 0.75), (PZ, PZ), (PZ * 0.38, PZ))))
@teken('’', 0)
def aanhalingstekens(w): return poly((0, H - PZ * 1.45), (PZ * 0.62, H - PZ * 1.45), (PZ * 0.62 + PZ * 1.45 * T, H), (PZ * 1.45 * T, H))
@teken('-', 0)
def streep(w): return rect(0, H * 0.42, W0 * 0.55, H * 0.42 + h)
@teken('!', 0)
def uitroep(w): return unary_union([rect(0, PZ + KIER * 1.2, S, H), vierkant_punt(0, 0, S)])
@teken('?', 0.86)
def vraag(w):
    m = H * 0.52
    return unary_union([rect(0, H - h, w, H), rect(w - S, m, w, H), rect(w / 2 - S / 2, m - h / 2 + h / 2, w, m + h / 2),
                        rect(w / 2 - S / 2, PZ + KIER * 1.2, w / 2 + S / 2, m + h / 2), vierkant_punt(w / 2 - S / 2, 0, S)]).difference(Point(-1, -1).buffer(1))
@teken(':', 0)
def dubbelpunt(w): return unary_union([vierkant_punt(0, 0, PZ), vierkant_punt(0, H * 0.5, PZ)])

# accenten: de kaplijn + een kier, dan het teken
def acuut(cx):
    y = H + KIER * 1.4; z = S * 0.95
    return poly((cx - z * 0.5, y), (cx + z * 0.15, y), (cx + z * 0.15 + z * 1.1 * T * 1.4, y + z * 1.1), (cx - z * 0.5 + z * 1.1 * T * 1.4, y + z * 1.1))
def trema(cx):
    y = H + KIER * 1.4; z = S * 0.92
    return unary_union([vierkant_punt(cx - z * 1.35, y, z), vierkant_punt(cx + z * 0.35, y, z)])

ACCENT = {'É': ('E', acuut), 'Ë': ('E', trema), 'È': ('E', None), 'Ó': ('O', acuut), 'Ö': ('O', trema), 'Ü': ('U', trema),
          'Ï': ('I', trema), 'Á': ('A', acuut), 'Ä': ('A', trema), 'Í': ('I', acuut), 'Ú': ('U', acuut)}


def vorm(c):
    if c in ACCENT:
        basis, acc = ACCENT[c]
        g, w = vorm(basis)
        if acc: g = g.union(acc(w / 2))
        return g, w
    f, k = W[c]
    w = S if k == 0 and c in 'I!' else (bw(k) if k else (PZ if c in '.,:' else bw(1)))
    if c == '’': w = PZ + PZ * 1.45 * T
    if c == '-': w = W0 * 0.55
    g = f(w)
    return g, w


def naar_pen(g, pen, dx):
    ps = [g] if isinstance(g, Polygon) else list(g.geoms)
    for p in ps:
        if p.is_empty or p.area < 1: continue
        p = orient(p, sign=-1.0)   # TrueType: buitenkant met de klok mee
        for ring in [p.exterior] + list(p.interiors):
            pts = [(round(x + dx), round(y)) for x, y in list(ring.coords)[:-1]]
            schoon = []
            for q in pts:
                if not schoon or schoon[-1] != q: schoon.append(q)
            if len(schoon) > 1 and schoon[0] == schoon[-1]: schoon.pop()
            if len(schoon) < 3: continue
            pen.moveTo(schoon[0])
            for q in schoon[1:]: pen.lineTo(q)
            pen.closePath()


def bouw():
    tekens = list(W.keys()) + list(ACCENT.keys())
    namen = {c: ('uni%04X' % ord(c)) for c in tekens}
    orde = ['.notdef', 'space'] + [namen[c] for c in tekens]
    glyfen, maten, cmap = {}, {}, {32: 'space', 0xA0: 'space'}
    pen = TTGlyphPen(None); pen.moveTo((0, 0)); pen.lineTo((0, H)); pen.lineTo((400, H)); pen.lineTo((400, 0)); pen.closePath()
    glyfen['.notdef'] = pen.glyph(); maten['.notdef'] = (500, 0)
    glyfen['space'] = TTGlyphPen(None).glyph(); maten['space'] = (round(W0 * (0.42 if BREED else 0.48)), 0)
    for c in tekens:
        g, w = vorm(c)
        g = g.buffer(0)
        pen = TTGlyphPen(None); naar_pen(g, pen, ZIJ)
        n = namen[c]; glyfen[n] = pen.glyph()
        maten[n] = (round(w + 2 * ZIJ), ZIJ)
        cmap[ord(c)] = n
        lo = c.lower()
        if lo != c and len(lo) == 1: cmap[ord(lo)] = n
    cmap[ord("'")] = namen['’']; cmap[0x2018] = namen['’']; cmap[0x2013] = namen['-']; cmap[0x2010] = namen['-']
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(orde); fb.setupCharacterMap(cmap); fb.setupGlyf(glyfen)
    hm = {}
    for n in orde:
        adv, _ = maten[n]
        gl = fb.font['glyf'][n]
        lsb = gl.xMin if hasattr(gl, 'xMin') and gl.numberOfContours else 0
        hm[n] = (adv, lsb)
    fb.setupHorizontalMetrics(hm)
    fb.setupHorizontalHeader(ascent=900, descent=-260)
    ps = 'VISUAILSDisplayBlok' + ('' if RICHTING == 'D' else RICHTING)
    fb.setupNameTable({'familyName': NAAM, 'styleName': 'Bold', 'psName': ps, 'uniqueFontIdentifier': ps + '-proef119',
                       'fullName': NAAM + ' Bold', 'version': 'Version 0.119'})
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, sTypoLineGap=0, usWinAscent=950, usWinDescent=300, sCapHeight=H, sxHeight=H,
                usWeightClass=700, fsSelection=0x20)
    fb.setupPost(); fb.setupMaxp() if hasattr(fb, 'setupMaxp') else None
    fb.save(f'{UIT}/{ps}.ttf')
    fb.font.flavor = 'woff2'; fb.save(f'{UIT}/{ps}.woff2')
    print('klaar', ps, len(tekens), 'tekens')


bouw()
