# Zet een korte tekst in Urbanist om naar een pad (lettervorm), zodat hulplijnen en kruisjes op de echte
# randen en hoeken van de letters kunnen staan in plaats van op het oog.
import pathlib, functools
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen
from shapely.geometry import Polygon
from shapely.ops import unary_union

def _opp(r):
    return sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r))) / 2

HIER = pathlib.Path(__file__).parent
FONT = HIER / 'fonts/urbanist-latin-wght-normal.woff2'      # Urbanist, de letter van de site (@fontsource-variable/urbanist)

@functools.lru_cache(None)
def _font(gewicht):
    f = TTFont(str(FONT))
    return instancer.instantiateVariableFont(f, {'wght': gewicht})

def _vlak(rec, stappen=16):
    """Opname van een pen → lijst ringen (krommen benaderd met korte stukjes)."""
    ringen, ring, cur = [], [], None
    def q(p0, p1, p2, t):
        return ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
    def c(p0, p1, p2, p3, t):
        u = 1 - t
        return (u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0], u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1])
    for op, args in rec.value:
        if op == 'moveTo':
            ring = [args[0]]; cur = args[0]
        elif op == 'lineTo':
            ring.append(args[0]); cur = args[0]
        elif op == 'qCurveTo':
            pts = list(args)
            # TrueType: impliciete punten tussen opeenvolgende controlepunten
            ctrl, eind = pts[:-1], pts[-1]
            reeks = []
            for i, p in enumerate(ctrl):
                if i + 1 < len(ctrl):
                    m = ((p[0] + ctrl[i + 1][0]) / 2, (p[1] + ctrl[i + 1][1]) / 2)
                    reeks.append((p, m))
                else:
                    reeks.append((p, eind))
            for p1, p2 in reeks:
                for k in range(1, stappen + 1):
                    ring.append(q(cur, p1, p2, k / stappen))
                cur = p2
        elif op == 'curveTo':
            p1, p2, p3 = args
            for k in range(1, stappen + 1):
                ring.append(c(cur, p1, p2, p3, k / stappen))
            cur = p3
        elif op in ('closePath', 'endPath'):
            if len(ring) >= 3:
                ringen.append(ring)
            ring = []
    return ringen

def tekst_pad(t, x, y_basis, grootte, gewicht=500, spatie=0.0):
    """Geeft (svg-pad d, vorm in postercoördinaten, lijst (teken, x-begin, x-eind van de advance))."""
    f = _font(gewicht)
    upm = f['head'].unitsPerEm
    s = grootte / upm
    gs = f.getGlyphSet(); cmap = f.getBestCmap(); hmtx = f['hmtx']
    d_alles, vorm, tekens = [], None, []
    xx = x
    for ch in t:
        g = cmap[ord(ch)]
        # y omdraaien: lettertype y omhoog → svg y omlaag
        svg = SVGPathPen(gs)
        gs[g].draw(TransformPen(svg, (s, 0, 0, -s, xx, y_basis)))
        d_alles.append(svg.getCommands())
        rec = RecordingPen()
        gs[g].draw(TransformPen(rec, (s, 0, 0, -s, xx, y_basis)))
        ringen = _vlak(rec)
        if ringen:
            # TrueType vult met de 'nonzero'-regel: ringen met dezelfde draairichting als de grootste zijn buitenranden,
            # de andere zijn binnenruimtes (de gaten in e, o, €). Overlappende buitenranden worden samengevoegd.
            opp = [_opp(r) for r in ringen]
            teken = 1 if opp[max(range(len(opp)), key=lambda i: abs(opp[i]))] > 0 else -1
            buiten = unary_union([Polygon(r).buffer(0) for r, a in zip(ringen, opp) if a * teken > 0])
            binnen = unary_union([Polygon(r).buffer(0) for r, a in zip(ringen, opp) if a * teken < 0])
            gl = buiten.difference(binnen) if not binnen.is_empty else buiten
            vorm = gl if vorm is None else vorm.union(gl)
        adv = hmtx[g][0] * s
        tekens.append((ch, xx, xx + adv))
        xx += adv + spatie
    return ' '.join(d_alles), vorm, tekens

def maten(gewicht=500):
    f = _font(gewicht)
    os2 = f['OS/2']
    return {'upm': f['head'].unitsPerEm, 'kap': os2.sCapHeight, 'x': os2.sxHeight}
