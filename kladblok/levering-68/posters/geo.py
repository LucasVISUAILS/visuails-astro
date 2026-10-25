# De echte vormen achter de posters: het V-merk, het woordmerk, de letters en het laptopscherm.
# Wordt gebruikt om lijnen en kruisjes aan echte punten en randen te hangen, en om dat na te rekenen.
import json, math, pathlib, re
import numpy as np
from shapely.geometry import Polygon, MultiPolygon, LineString, Point, box
from shapely.ops import unary_union
import merk

HIER = pathlib.Path(__file__).parent

# ── het V-merk (SVG: y omlaag, viewBox 0 0 702 813.25) ──
MW, MH = 702.0, 813.25
KAP_Y, BASIS_Y = 16.0, 797.25          # kaplijn en basislijn; punt en blaadje steken 16 uit
R_BOOG = 201.21
_x1, _y1, _x2, _y2 = 264.5, 119.0, 101.0, 15.75
_dx, _dy = (_x1 - _x2) / 2, (_y1 - _y2) / 2
_k = -math.sqrt((R_BOOG ** 2 - _dx * _dx - _dy * _dy) / (_dx * _dx + _dy * _dy))
BOOG_C = (_k * _dy + (_x1 + _x2) / 2, -_k * _dx + (_y1 + _y2) / 2)     # (88.53, 216.57)

def _boog(n=72):
    cx, cy = BOOG_C
    a1, a2 = math.atan2(_y1 - cy, _x1 - cx), math.atan2(_y2 - cy, _x2 - cx)
    return [(cx + R_BOOG * math.cos(a1 + (a2 - a1) * i / n), cy + R_BOOG * math.sin(a1 + (a2 - a1) * i / n)) for i in range(n + 1)]

# hoekpunten met naam (alleen echte, zichtbare hoeken)
H = {
    'linksboven': (0.0, 16.0),          # bovenkant dikke been, links
    'boog_begin': (101.0, 15.75),       # eind van de vlakke bovenkant, begin van de boog
    'boog_eind': (264.5, 119.0),        # boog raakt de binnenrand
    'punt': (463.25, 813.25),           # de punt van de V
    'snede_boven': (662.75, 354.75),    # bovenkant dunne been
    'snede_onder': (515.5, 546.25),     # snede raakt de binnenrand
    'blad_top': (701.75, 0.0),
    'blad_knik': (543.25, 366.25),
    'blad_punt': (507.25, 453.75),
    'blad_onder': (652.0, 259.25),
    'blad_rechts': (702.0, 338.25),
}
_P1 = [H['linksboven'], (144.25, 266.75), H['punt'], H['snede_boven'], (619.25, 408.25), H['snede_onder']] + _boog() + [H['linksboven']]
_P2 = [H['blad_top'], H['blad_knik'], H['blad_punt'], H['blad_onder'], H['blad_rechts'], H['blad_top']]
MERK = MultiPolygon([Polygon(_P1), Polygon(_P2)])

# randen die je mag doortrekken (begin, eind), in de richting van begin → eind
RAND = {
    'dik_buiten': ((144.25, 266.75), H['punt']),            # buitenrand dikke been (59,65°)
    'dik_buiten_top': (H['linksboven'], (144.25, 266.75)),   # het korte stuk bovenaan
    'dik_binnen': (H['snede_onder'], H['boog_eind']),        # binnenrand dikke been
    'dun_buiten': (H['snede_boven'], H['punt']),             # buitenrand dunne been (66,54°)
    'blad_rechts': (H['blad_top'], H['blad_rechts']),        # rechterkant blaadje (verticaal)
    'top': (H['linksboven'], H['boog_begin']),               # vlakke bovenkant dikke been
    'snede': (H['snede_boven'], H['snede_onder']),
    'blad_onder': (H['blad_onder'], H['blad_punt']),
}

ZWAARTEPUNT = (MERK.centroid.x, MERK.centroid.y)          # (361.18, 358.75)

# ── woordmerk en letters (uit hoek.json) ──
_NUM = re.compile(r'[-+]?\d*\.?\d+(?:e[-+]?\d+)?')

def pad_naar_vorm(d):
    """Pad met alleen M/L/Z (zoals in hoek.json) naar een vorm, met even-oneven-vulling."""
    ringen = []
    for stuk in re.split(r'(?=M)', d.strip()):
        if not stuk.strip():
            continue
        getallen = [float(v) for v in _NUM.findall(stuk)]
        pts = list(zip(getallen[0::2], getallen[1::2]))
        if len(pts) >= 3:
            ringen.append(Polygon(pts).buffer(0))
    vorm = None
    for r in ringen:
        vorm = r if vorm is None else vorm.symmetric_difference(r)
    return vorm

WOORD = pad_naar_vorm(merk.D)                     # in de coördinaten van #l-wm (y omlaag, basislijn 0)
LETTER = {k: pad_naar_vorm(v['d']) for k, v in merk.LETTERS.items()}

def hoekpunten(vorm, min_hoek=14):
    """Echte hoeken van een vorm: punten waar de rand meer dan min_hoek graden knikt."""
    uit = []
    geoms = vorm.geoms if hasattr(vorm, 'geoms') else [vorm]
    for g in geoms:
        for ring in [g.exterior] + list(g.interiors):
            c = list(ring.coords)[:-1]
            n = len(c)
            for i in range(n):
                a, b, e = c[i - 1], c[i], c[(i + 1) % n]
                v1 = (b[0] - a[0], b[1] - a[1]); v2 = (e[0] - b[0], e[1] - b[1])
                l1, l2 = math.hypot(*v1), math.hypot(*v2)
                if l1 < 1e-9 or l2 < 1e-9:
                    continue
                cos = max(-1, min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)))
                if math.degrees(math.acos(cos)) >= min_hoek:
                    uit.append(b)
    return uit

def randen(vorm, min_lengte=1.0):
    uit = []
    geoms = vorm.geoms if hasattr(vorm, 'geoms') else [vorm]
    for g in geoms:
        for ring in [g.exterior] + list(g.interiors):
            c = list(ring.coords)
            for a, b in zip(c, c[1:]):
                if math.dist(a, b) >= min_lengte:
                    uit.append((a, b))
    return uit

# ── plaatsing: van eigen coördinaten naar postercoördinaten ──
def zet_vorm(vorm, s, tx, ty):
    from shapely import affinity
    return affinity.affine_transform(vorm, [s, 0, 0, s, tx, ty])

def merk_plaats(x, y, b):
    """V-merk op (x, y) met breedte b: geeft (schaal, functie punt→poster)."""
    s = b / MW
    return s, (lambda p: (x + p[0] * s, y + p[1] * s))

def woord_plaats(x, y, b):
    s = b / merk.WM_W
    return s, (lambda p: (x + (p[0] - merk.WM_X) * s, y + (p[1] - merk.WM_Y) * s))

# ── laptopscherm: homografie van de webshoppagina (1600 × 1034 css-px) naar de laptopfoto ──
Q = json.load(open(HIER / 'hoeken.json'))
SCHERM_W, SCHERM_H = 1600, 1034
FOTO = (178, 116, 1038, 976)         # de grote productfoto (.hoofd, 860 × 860), gemeten in de laptopbron van 24 oktober 2026
RIJ = (1098, 587, 1240, 729)         # het eerste catalogbeeld van de rij onder de knop (142 × 142, r 16)
FOTO_R = 22
INFO_X = 1068                        # linkerkant van de infokolom (.info), midden tussen foto (1038) en tekst (1098)

def _homografie(src, dst):
    A = []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y, -u])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y, -v])
    _, _, vt = np.linalg.svd(np.array(A, float))
    h = vt[-1].reshape(3, 3)
    return h / h[2, 2]

_HS = {n: _homografie([(0, 0), (SCHERM_W, 0), (SCHERM_W, SCHERM_H), (0, SCHERM_H)],
                      [Q[n]['tl'], Q[n]['tr'], Q[n]['br'], Q[n]['bl']]) for n in ('laptop',)}

def scherm_punt(x, y, n='laptop'):
    """Punt op de webshoppagina (css-px) → punt in het kader (bronpixels 1728 × 1296)."""
    h = _HS[n]
    p = h @ np.array([x, y, 1.0])
    return (p[0] / p[2], p[1] / p[2])
