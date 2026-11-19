"""VISUAILS Display 2 (levering 120, 19 november 2026, lijst 130 en 132): DM Sans 40pt, rustiger. Bouw met BAK=1 STIJL=Light python3 familie2.py <map met familie.py> <DMSans40pt-Light.ttf> <uit.woff2>.
   Standaard = DM Sans + de a met het driehoekgat; met BAK=1 ook de vierkante punt, de zachte hoek in hoofd- en kleine letters.
   Zonder BAK: elk idee als stilistische set (ss01..ss08) voor een specimen.
Elk idee als stilistische set (ss01..ss08), zodat het specimen ze los aan en uit kan zetten."""
import sys, os
sys.path.insert(0, sys.argv[1])
import pathops
from familie import Letter, veelhoek, cirkel, T, KAP_SNEDE, KAP_HOEK, PUNTEN, UITEINDEN
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
import copy

BRON, UIT = sys.argv[2], sys.argv[3]
L = Letter(BRON); f = L.f
kap = f['OS/2'].sCapHeight; xh = f['OS/2'].sxHeight

def stam_breedte(naam, y):
    g = L.glyf[naam]; x = g.xMin + 1
    while not L.binnen(naam, x, y) and x < g.xMax: x += 1
    x0 = x
    while L.binnen(naam, x, y) and x < g.xMax: x += 1
    return x0, x

def nieuw(naam, pad, achtervoegsel):
    """kopie van glyph naam als naam.achtervoegsel met het nieuwe pad"""
    nn = f'{naam}.{achtervoegsel}'
    if nn not in f.getGlyphOrder():
        f.setGlyphOrder(f.getGlyphOrder() + [nn])
    L.glyf.glyphs[nn] = copy.deepcopy(L.glyf[naam]); f['hmtx'][nn] = f['hmtx'][naam]
    L.glyf.glyphOrder = f.getGlyphOrder()
    L.zet(nn, pad); return nn

sets = {}
def voeg(ss, naam, pad):
    sets.setdefault(ss, []).append((naam, nieuw(naam, pad, ss)))

# standaard: alleen de a (en æ) met het driehoekgat
for n in ['a', 'ae']:
    L.zet(n, L.a_gat(L.pad_van(n), n))

# ss01 vierkante punt met de snede (zoals nu), ss02 snede op f r t g j (zoals nu)
for n, ks in PUNTEN.items():
    if n not in L.glyf or L.glyf[n].isComposite(): continue
    bb = L.contouren(n); rest = [k for k in range(len(bb)) if k not in ks]
    p = L.pad_van(n, rest)
    for k in ks: p = pathops.op(p, veelhoek(L.vierkante_punt(*bb[k])), pathops.PathOp.UNION)
    voeg('ss01', n, p)
for n in ['f', 'r', 't', 'g', 'j']:
    voeg('ss02', n, L.snede(L.pad_van(n), n))
# ss03 de zachte hoek linksboven in de hoofdletters (zoals nu), ss04 de kap-snede (zoals nu)
for n in KAP_HOEK: voeg('ss03', n, L.kap_hoek(L.pad_van(n), n, kap))
for n in KAP_SNEDE: voeg('ss04', n, L.kap_snede(L.pad_van(n), n))

# ss05 NIEUW: de punt als het vlagje van de V: een parallellogram met de zijkanten op 53,13°, even breed als de
#   oude ronde punt, op dezelfde plek (dus hetzelfde gewicht als een punt, alleen de vorm komt uit het logo).
def vlag_punt(x0, x1, y0, y1):
    z = min(x1 - x0, y1 - y0) * 0.92; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    d = T * z / 2   # halve verschuiving
    return [(cx - z / 2 - d, cy - z / 2), (cx + z / 2 - d, cy - z / 2), (cx + z / 2 + d, cy + z / 2), (cx - z / 2 + d, cy + z / 2)]
for n, ks in PUNTEN.items():
    if n not in L.glyf or L.glyf[n].isComposite(): continue
    bb = L.contouren(n); rest = [k for k in range(len(bb)) if k not in ks]
    p = L.pad_van(n, rest)
    for k in ks: p = pathops.op(p, veelhoek(vlag_punt(*bb[k])), pathops.PathOp.UNION)
    voeg('ss05', n, p)

# ss07 NIEUW: de zachte hoek ook in de kleine letters, linksboven aan de linker stok (b h k l i j m n p r u ı),
#   R = de stamdikte, zodat de bocht in verhouding even zacht is als in de hoofdletters.
for n in ['b', 'h', 'k', 'l', 'i', 'j', 'm', 'n', 'p', 'r', 'u', 'dotlessi']:
    if n not in L.glyf or L.glyf[n].isComposite(): continue
    g = L.glyf[n]
    sa, sb = stam_breedte(n, 120 if n != 'j' else 300)   # de linker stok, laag in de letter
    if n == 'j':
        sa, sb = stam_breedte(n, 200)
    mx = (sa + sb) / 2
    plafond = (g.yMax if n in ('b', 'h', 'k', 'l') else xh + 40)
    top = 0
    y = 100
    while y < plafond + 5:
        if L.binnen(n, mx, y): top = y
        y += 1
    stam = sb - sa; R = stam * 1.0
    cx, cy = sa + R, top - R
    vak = veelhoek([(sa - 1, top + 2), (cx, top + 2), (cx, cy), (sa - 1, cy)])
    buiten = pathops.op(vak, cirkel(cx, cy, R), pathops.PathOp.DIFFERENCE)
    voeg('ss07', n, pathops.op(L.pad_van(n), buiten, pathops.PathOp.DIFFERENCE))

# ss08 NIEUW: de A met het driehoekgat van de a (het gat iets kleiner en hoger, de dwarsbalk blijft)
#   = alleen het binnengat op 53,13° rechtgezet; zie het specimen. (Schets: de A blijft DM Sans, ss08 is de
#   A uit het woordmerk zonder dwarsbalk, alleen om te laten zien waarom we hem NIET doen.)
n = 'A'; bb = L.contouren(n)
if len(bb) > 1:
    k = 1
    p = pathops.op(L.pad_van(n), L.pad_van(n, [k]), pathops.PathOp.UNION)  # gat dicht
    x0, x1, y0, y1 = bb[k]
    # balk weg: alles tussen de benen onder het gat
    co, ends, fl = L.punten(n)
    g = L.glyf[n]
    # driehoek tussen de benen van de basislijn tot boven de balk
    mid = (g.xMin + g.xMax) / 2
    yb = y0 - 1
    while L.binnen(n, mid, yb) and yb > 0: yb -= 1
    # open: maak het gat door tot de basislijn met de hellingen van de binnenbenen
    sl = (mid - x0) / (y1 - y0) if y1 > y0 else 0
    gat = veelhoek([(x0 - sl * (y0 - 0), -5), (x1 + sl * (y0 - 0), -5), (mid, y1)])
    p = pathops.op(p, gat, pathops.PathOp.DIFFERENCE)
    voeg('ss08', n, p)

# Lijst 130 (19 november 2026, Lucas): goed = de a (standaard), ss01 vierkante punt, ss03 zachte hoek hoofdletters,
# ss07 zachte hoek kleine letters; niet = de sneden (ss02, ss04), het vlagje als punt (ss05), de A zonder balk (ss08).
import os as _os
if _os.environ.get('BAK'):
    for ss in ('ss01', 'ss03', 'ss07'):
        for a_, b_ in sets.get(ss, []):
            L.glyf.glyphs[a_] = copy.deepcopy(L.glyf[b_]); f['hmtx'][a_] = f['hmtx'][b_]
    naam = 'VISUAILS Display 2'
    stijl = _os.environ.get('STIJL', 'Light')
    for r in f['name'].names:
        if r.nameID == 1: r.string = naam + ('' if stijl in ('Regular', 'Bold') else ' ' + stijl)
        elif r.nameID == 2: r.string = stijl if stijl in ('Regular', 'Bold') else 'Regular'
        elif r.nameID == 4: r.string = naam + ' ' + stijl
        elif r.nameID == 6: r.string = 'VISUAILSDisplay2-' + stijl
        elif r.nameID == 16: r.string = naam
        elif r.nameID == 17: r.string = stijl
else:
    fea = ''
    for ss, paren in sorted(sets.items()):
        fea += f'feature {ss} {{\n' + ''.join(f'  sub {a} by {b};\n' for a, b in paren) + f'}} {ss};\n'
    addOpenTypeFeaturesFromString(f, fea)
    for r in f['name'].names:
        if r.nameID in (1, 4, 16): r.string = 'VISUAILS Display Schets'
f['post'].formatType = 2.0
f.flavor = 'woff2'; f.save(UIT)
print('ok', {k: len(v) for k, v in sets.items()})
