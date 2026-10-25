# Merkschema versie 9: posterreeks 01–12 en andere beelden. Blauw uur sinds levering 68 (24 oktober 2026):
# wit, inkt #0B0F17, blauw uur #25508B, grijs #636974; vlakken zijn vlak (geen verloop, geen korrel), lijnen op
# licht in veldlijngrijs, het ene accent (kruisjes, de V, de ronde hoek) in blauw uur; op donker blauw licht.
# Nieuw t.o.v. versie 8: het V-merk staat nooit meer in het geometrische midden met lijnen erdoor.
# Elke lijn en elk kruisje hangt aan iets echts (een hoek of rand van het merk, een letter, een scherm of een foto),
# en alles wordt bij het bouwen nagerekend: een lijn die onder het merk door loopt en er ergens willekeurig uit
# komt, of een kruisje dat niet op een echte hoek staat, geeft een melding (controle()).
import json, math
import numpy as np
from shapely.geometry import LineString, Point, box
import posters as P
import merk, geo, tekstvorm
from posters import (hoeken, balken, beeld_met_fade, xray, kl, pt, uid, Q, SRC_W,
                     LIJN, M, LILA, VIOLET, NACHT, INKT, WIT, BLAUW_LICHT, GRIJS, VLAK, lijnstaal)

MIST, NEVEL, KOPLICHT, INKT3, WAAS = '#F4F5F7', '#F4F5F7', '#636974', '#636974', '#C5C8CF'   # vlak, vlak, grijs, grijs, lijn sterk (tweede regel op donker, 11,8:1)
U = 'font-family="Urbanist, sans-serif"'
MONO = 'font-family="IBM Plex Mono, monospace"'
LOGO = json.loads((geo.HIER / 'logo-paden.json').read_text())

def nl(x, d=2):
    return f'{x:.{d}f}'.replace('.', ',')

# ─────────────────────────── registratie en controle ───────────────────────────
def _leeg():
    return {'lijnen': [], 'kruisen': [], 'vormen': [], 'punten': [], 'randen': []}
REG = _leeg()
MELDINGEN = []
_lijn0, _kruis0 = P.lijn, P.kruis

def lijn(x1, y1, x2, y2, kleur, fade='beide', op=1.0, dikte=LIJN, over=False):
    REG['lijnen'].append(((x1, y1), (x2, y2), over))
    return _lijn0(x1, y1, x2, y2, kleur, fade, op, dikte)

def kruis(x, y, kleur, r=5, op=1):
    REG['kruisen'].append((x, y))
    return _kruis0(x, y, kleur, r, op)

P.lijn, P.kruis = lijn, kruis          # ook scherm_lijnen() in posters.py gaat nu via de registratie

def echt_punt(*pts):
    REG['punten'] += [tuple(map(float, p)) for p in pts]

def echte_rand(a, b):
    REG['randen'].append((tuple(map(float, a)), tuple(map(float, b))))

def echte_vorm(vorm, naam, kap=None, basis=None, min_hoek=14):
    REG['vormen'].append((vorm, naam, kap, basis))
    REG['punten'] += geo.hoekpunten(vorm, min_hoek)
    REG['randen'] += geo.randen(vorm, 1.5)

def echte_rechthoek(x, y, w, h, r=0):
    if not r:
        echt_punt((x, y), (x + w, y), (x + w, y + h), (x, y + h))
    echte_rand((x + r, y), (x + w - r, y)); echte_rand((x + r, y + h), (x + w - r, y + h))
    echte_rand((x, y + r), (x, y + h - r)); echte_rand((x + w, y + r), (x + w, y + h - r))

def echte_vierhoek(q):
    echt_punt(*q.values())
    for a, b in (('tl', 'tr'), ('tr', 'br'), ('br', 'bl'), ('bl', 'tl')):
        echte_rand(q[a], q[b])

def _lang(L):
    (x1, y1), (x2, y2) = L.coords
    dx, dy = x2 - x1, y2 - y1
    return [(x1 - dx * 50, y1 - dy * 50), (x2 + dx * 50, y2 + dy * 50)]

def controle(label):
    gezien = set(); uit = []
    for a, b, over in REG['lijnen']:
        sleutel = (round(a[0], 1), round(a[1], 1), round(b[0], 1), round(b[1], 1))
        if sleutel in gezien:
            continue
        gezien.add(sleutel)
        L = LineString([a, b])
        if L.length < 0.5:
            continue
        for vorm, naam, kap, basis in REG['vormen']:
            test = vorm
            if kap is not None and abs(a[1] - b[1]) < 1e-6 and (abs(a[1] - kap) < .35 or abs(a[1] - basis) < .35):
                test = vorm.intersection(box(-1e5, kap, 1e5, basis))      # kap- en basislijn mogen door het overschot
            binnen = L.intersection(test.buffer(-0.3)).length
            if binnen > 0.4 and not over:
                uit.append(f'lijn ({a[0]:.1f},{a[1]:.1f})–({b[0]:.1f},{b[1]:.1f}) loopt {binnen:.1f} px onder {naam} door')
        lang = LineString(_lang(L))
        vast = any(L.distance(Point(p)) < 0.6 or (lang.distance(Point(p)) < 0.6 and L.distance(Point(p)) < 6) for p in REG['punten']) or \
            any(_rand_op_lijn(lang, r) for r in REG['randen'])
        if not vast:
            uit.append(f'lijn ({a[0]:.1f},{a[1]:.1f})–({b[0]:.1f},{b[1]:.1f}) hangt nergens aan')
    for x, y in set((round(x, 2), round(y, 2)) for x, y in REG['kruisen']):
        d = min((math.dist((x, y), p) for p in REG['punten']), default=99)
        if d > 0.8:
            uit.append(f'kruisje ({x:.1f},{y:.1f}) staat {d:.1f} px naast een echte hoek')
    for u in uit:
        MELDINGEN.append(f'{label}: {u}')
    REG.clear(); REG.update(_leeg())

def _rand_op_lijn(lang, r):
    a, b = r
    if math.dist(a, b) < 1.5:
        return False
    (x1, y1), (x2, y2) = lang.coords
    lx, ly = x2 - x1, y2 - y1; ex, ey = b[0] - a[0], b[1] - a[1]
    sin = abs(lx * ey - ly * ex) / (math.hypot(lx, ly) * math.hypot(ex, ey))
    return sin < 0.006 and lang.distance(Point(a)) < 0.5 and lang.distance(Point(b)) < 0.5

# ─────────────────────────── vormen tekenen (en registreren) ───────────────────────────
def wm_hoogte(b):
    return b * merk.WM_H / merk.WM_W

def wm_kaphoogte(b):
    return merk.KAP * b / merk.WM_W

def woordmerk(x, y, b, kleur, registreer=True):
    if registreer:
        s, _ = geo.woord_plaats(x, y, b)
        vorm = geo.zet_vorm(geo.WOORD, s, x - merk.WM_X * s, y - merk.WM_Y * s)
        echte_vorm(vorm, 'het woordmerk', y + (-merk.KAP - merk.WM_Y) * s, y + (0 - merk.WM_Y) * s)
    return (f'<svg x="{x:.2f}" y="{y:.2f}" width="{b:.2f}" height="{wm_hoogte(b):.2f}" viewBox="{merk.VB}" style="color:{kleur}">'
            f'<use href="#l-wm"/></svg>')

def woordmerk_kap(x, y_kap, b, kleur):
    """Woordmerk met zijn kaplijn op y_kap. Geeft (svg, y van de basislijn)."""
    hh = wm_hoogte(b); y = y_kap - merk.WM_KAP * hh
    return woordmerk(x, y, b, kleur), y + merk.WM_BASIS * hh

def woordmerk_op_basis(x, y_basis, b, kleur):
    hh = wm_hoogte(b)
    return woordmerk(x, y_basis - merk.WM_BASIS * hh, b, kleur)

def wm_hoek(x, y, b, letter_nr, hoek):
    """Een echte hoek van een letter in het woordmerk (letter_nr 0 = V … 7 = S), in postercoördinaten.
    hoek: 'lb', 'rb', 'lo', 'ro' (links/rechts, boven/onder) → het hoekpunt dat het dichtst bij die kaderhoek ligt."""
    s, f = geo.woord_plaats(x, y, b)
    k = merk.KADERS[letter_nr]                  # y omhoog
    doel = {'lb': (k[0], -k[3]), 'rb': (k[2], -k[3]), 'lo': (k[0], -k[1]), 'ro': (k[2], -k[1])}[hoek]
    stuk = geo.WOORD.intersection(box(k[0] - 1, -k[3] - 1, k[2] + 1, -k[1] + 1))
    p = min(geo.hoekpunten(stuk), key=lambda q: math.dist(q, doel))
    return f(p), math.dist(p, doel) * s

def vmerk(x, y, b, kleur, registreer=True):
    if registreer:
        s = b / geo.MW
        echte_vorm(geo.zet_vorm(geo.MERK, s, x, y), 'het V-merk', y + geo.KAP_Y * s, y + geo.BASIS_Y * s)
        echt_punt((x + geo.BOOG_C[0] * s, y + geo.BOOG_C[1] * s))
    return f'<svg x="{x:.2f}" y="{y:.2f}" width="{b:.2f}" height="{b * geo.MH / geo.MW:.2f}" viewBox="0 0 702 813.25" style="color:{kleur}"><use href="#l-mark"/></svg>'

def mp(x, y, b, p):
    """Punt van het merk (naam uit geo.H of (x, y) in merkeenheden) → postercoördinaten."""
    s = b / geo.MW
    q = geo.H[p] if isinstance(p, str) else p
    return (x + q[0] * s, y + q[1] * s)

def richting(a, b):
    l = math.dist(a, b)
    return ((b[0] - a[0]) / l, (b[1] - a[1]) / l)

def straal(p, d, veld):
    """Eindpunt van een halve lijn vanaf p in richting d, tot hij het veld (x0, y0, x1, y1) verlaat."""
    ts = []
    for i, (lo, hi) in enumerate(((veld[0], veld[2]), (veld[1], veld[3]))):
        if d[i] > 1e-12: ts.append((hi - p[i]) / d[i])
        elif d[i] < -1e-12: ts.append((lo - p[i]) / d[i])
    t = min(ts)
    return (p[0] + t * d[0], p[1] + t * d[1])

def snij(p, d, q, e):
    """Snijpunt van de lijnen p + t·d en q + u·e."""
    det = d[0] * (-e[1]) - d[1] * (-e[0])
    t = ((q[0] - p[0]) * (-e[1]) - (q[1] - p[1]) * (-e[0])) / det
    return (p[0] + t * d[0], p[1] + t * d[1])

def merk_clip(x, y, b):
    """clipPath met de echte vorm van het merk (voor lijnen die óver het merk lopen, in wit)."""
    cid = uid('mc'); s = b / geo.MW
    tr = f'translate({x:.3f} {y:.3f}) scale({s:.6f})'
    paden = ''.join(f'<path transform="{tr}" d="{d}"/>' for d in LOGO['mark'])
    return cid, f'<clipPath id="{cid}">{paden}</clipPath>'

VORMEN = {'p': (400, 500), 's': (360, 640), 'b': (640, 360), 'k': (400, 400), 'l': (800, 200), 'm': (600, 200), 'c': (425, 275)}

def veld(w, h, m=M):
    """Waar lijnen mogen lopen: de hele breedte, en in de hoogte tot 8 px van de balken."""
    return (0, m + 24 + 8, w, h - m - 24 - 8)

def poster(inhoud, label, beschrijving, vorm='p', alt=''):
    controle(label)
    w, h = VORMEN[vorm]
    return (f'<figure class="pst pst-{vorm}"><svg viewBox="0 0 {w} {h}" role="img" aria-label="{alt or label}">{inhoud}</svg>'
            f'<figcaption><b>{label}</b>{beschrijving}</figcaption></figure>')

def tekst(x, y, t, grootte, kleur, gewicht=500, anker='start', extra=''):
    a = f' text-anchor="{anker}"' if anker != 'start' else ''
    return f'<text x="{x:.1f}" y="{y:.1f}"{a} {U} font-weight="{gewicht}" font-size="{grootte}" fill="{kleur}"{extra}>{t}</text>'

def tekst_links(x_rand, y, t, grootte, kleur, gewicht=500):
    """Tekst waarvan de eerste letter met zijn echte linkerrand op x_rand staat (zonder de witruimte van de letter)."""
    _, v, _ = tekstvorm.tekst_pad(t[0], 0, 0, grootte, gewicht)
    return tekst(x_rand - v.bounds[0], y, t, grootte, kleur, gewicht)

def pil(x, y, t, b, vul='#fff', dot=VIOLET, kleur=INKT, op=.92):
    return (f'<rect x="{x:.1f}" y="{y:.1f}" width="{b}" height="20" rx="10" fill="{vul}" fill-opacity="{op}"/>'
            f'<circle cx="{x + 10:.1f}" cy="{y + 10:.1f}" r="2.6" fill="{dot}"/>'
            + tekst(x + 18, y + 13.6, t, 9.5, kleur, 600))

def beeld(href, x, y, w, h, clip_r=0, registreer=True):
    if registreer:
        echte_rechthoek(x, y, w, h, clip_r)
    if not clip_r:
        return f'<image href="{href}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" preserveAspectRatio="xMidYMid slice"/>'
    cid = uid('c')
    return (f'<defs><clipPath id="{cid}"><rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{clip_r}"/></clipPath></defs>'
            f'<image href="{href}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" preserveAspectRatio="xMidYMid slice" clip-path="url(#{cid})"/>')

def verloop_violet(w, h, korrel=True, kleur=INKT):
    """Was het violette verloop met korrel. In Blauw uur is een vlak een vlak: inkt (of blauw uur), zonder verloop en zonder korrel."""
    return f'<rect width="{w}" height="{h}" fill="{kleur}"/>'

def letter(k, x, y_basis, kap, kleur, registreer=True):
    """Eén letter van de merkletter, linkerkant op x, basislijn op y_basis, kaphoogte kap (px)."""
    d, b = merk.letter_pad(k)
    s = kap / merk.KAP
    if registreer:
        echte_vorm(geo.zet_vorm(geo.LETTER[k], s, x - b[0] * s, y_basis), f'de letter {k}', y_basis - kap, y_basis)
    return f'<g transform="translate({x - b[0] * s:.2f} {y_basis:.2f}) scale({s:.5f})" fill="{kleur}"><path fill-rule="evenodd" d="{d}"/></g>'

def letter_breedte(k, kap):
    b = merk.LETTERS[k]['b']
    return (b[2] - b[0]) * kap / merk.KAP

def tekst_als_vorm(t, x, y_basis, grootte, gewicht, spatie, kleur):
    """Tekst als lettervorm (pad), met zijn echte hoeken en randen geregistreerd."""
    d, v, tekens = tekstvorm.tekst_pad(t, x, y_basis, grootte, gewicht, spatie)
    kap = y_basis - tekstvorm.maten(gewicht)['kap'] * grootte / tekstvorm.maten(gewicht)['upm']
    echte_vorm(v, f'"{t}"', kap, y_basis, 25)
    return f'<path d="{d}" fill="{kleur}"/>', v, kap

def iconen():
    vx, vy = zwaartepunt_verschuiving()
    oud = 'Een afgerond vierkant (23%), het V-merk op 46% van de breedte, precies in het midden.'
    h = P.iconen()
    assert oud in h
    return h.replace(oud, f'Een afgerond vierkant (23%), het V-merk op 46% van de breedte. Het merk is expres scheef, dus niet zijn kader maar zijn zwaartepunt staat in het midden: {nl(-vx)}% van zijn breedte naar links en {nl(vy)}% van zijn hoogte omlaag, uitgerekend uit de vorm.')

N = 12

def nr(i):
    return f'{i:02d} / {N:02d}'

# ── laptopscherm ──
def scherm_q(s, ox, oy):
    q = {k: pt(v, s, ox, oy) for k, v in Q['laptop'].items()}
    echte_vierhoek(q)
    return q

def scherm_naar_poster(x, y, s, ox, oy):
    sx, sy = geo.scherm_punt(x, y)
    return (sx * s + ox, sy * s + oy)

def scherm_lijnen(s, ox, oy, kleur, w=400, h=500):
    scherm_q(s, ox, oy)
    return P.scherm_lijnen(s, ox, oy, kleur, w=w, h=h)

def foto_registreren(s, ox, oy):
    """De grote productfoto op het scherm: zijn rechte randen (de hoeken zijn rond, r 22 css-px)."""
    x0, y0, x1, y1 = geo.FOTO; r = geo.FOTO_R
    f = lambda x, y: scherm_naar_poster(x, y, s, ox, oy)
    echte_rand(f(x0 + r, y0), f(x1 - r, y0)); echte_rand(f(x0 + r, y1), f(x1 - r, y1))
    echte_rand(f(x0, y0 + r), f(x0, y1 - r)); echte_rand(f(x1, y0 + r), f(x1, y1 - r))
    return f

# ─────────────────────────────── de posters ───────────────────────────────
def posters():
    R = []
    # 01 · Scherm: woordmerk midden boven, met zijn kap–basisband midden tussen de balk en de foto
    s = 400 / SRC_W; oy = 150
    lijnen, q = scherm_lijnen(s, 0, oy, LILA)
    b = 150; yk = (M + 24 + oy) / 2 - wm_kaphoogte(b) / 2
    wsvg, _ = woordmerk_kap((400 - b) / 2, yk, b, VIOLET)
    inh = ('<rect width="400" height="500" fill="#fff"/>'
           + beeld_met_fade('img/poster-scherm.webp', 0, oy, 400, 300, .14, .78)
           + lijnen + wsvg + hoeken(INKT)
           + balken(INKT, nr(1), 'Scherm', 'Al je productbeelden. Zonder shoot.'))
    R.append(poster(inh, 'Poster 01 · Scherm', 'Het hele laptopbeeld, met de randen van het scherm doorgetrokken tot ze vervagen.'))

    # 02 · Detail: de maatlijn staat langs de lange zijde van de productfoto (2048 px), niet langs het scherm
    s = 400 / 1180; ox, oy = -110 * s, 88 * s           # poster-detail.webp: kader x 110, y −88, 1180 × 1475
    q = scherm_q(s, ox, oy)
    f = foto_registreren(s, ox, oy)
    x0, y0, x1, y1 = geo.FOTO; xm = geo.INFO_X          # 1068: precies midden tussen foto (1038) en tekst (1098)
    A, B = f(xm, y0), f(xm, y1)                          # maatlijn
    E1 = (f(x1 + 6, y0), f(xm + 6, y0)); E2 = (f(x1 + 6, y1), f(xm + 6, y1))   # maathulplijnen langs boven- en onderrand
    C = f(xm, (geo.RIJ[3] + y1) / 2)                     # het label op het vrije stuk van de lijn, onder de rij beelden
    echt_punt(A, B)                                      # de maatlijn eindigt op de lijnen van de boven- en onderrand
    hoek = math.degrees(math.atan2(A[1] - B[1], A[0] - B[0]))      # langs de lijn, leesrichting omhoog
    def ov(x):
        c = kl(x, NACHT)
        return (lijn(*A, *B, c, 'geen', .6)
                + lijn(*E1[0], *E1[1], c, 'geen', .6) + lijn(*E2[0], *E2[1], c, 'geen', .6)
                + ''.join(kruis(*q[k], kl(x, VIOLET), 5, .9) for k in ('tl', 'tr', 'br'))
                + lijn(q['tr'][0], q['tr'][1], q['br'][0] + (q['br'][0] - q['tr'][0]) * .4, q['br'][1] + (q['br'][1] - q['tr'][1]) * .4, kl(x, LILA), 'eind', .9)
                + hoeken(kl(x, INKT), op=.7 if x else .4)
                + balken(kl(x, INKT), nr(2), 'Detail', 'Catalogbeeld · 2048 px', '')
                + woordmerk_op_basis(400 - M - 12 - 74, 500 - M - 8, 74, kl(x, INKT)))
    pl = (f'<g transform="translate({C[0]:.2f} {C[1]:.2f}) rotate({hoek:.2f})">'
          f'<rect x="-26" y="-8" width="52" height="16" rx="8" fill="#fff" fill-opacity=".92"/>'
          + tekst(0, 3.4, '2048 px', 9.5, NACHT, 600, 'middle') + '</g>')
    R.append(poster(xray('<image href="img/poster-detail.webp" x="0" y="0" width="400" height="500"/>', ov, 'img/poster-detail-x.png', boven=pl),
                    'Poster 02 · Detail', 'Ingezoomd op het scherm. De maatlijn staat langs de lange zijde van de productfoto: 2048 px, de maat die je krijgt. Kruisjes op de hoeken van het scherm.'))

    # 03 · Twee schermen: de twee wijzers eindigen op de bovenrand van de telefoon en op de catalogbeelden
    s = 400 / 1040; ox, oy = -760 * s, 30 * s            # poster-twee.webp: kader x 760, y −30, 1040 × 1300
    fq = {k: pt(v, s, ox, oy) for k, v in Q['fon'].items()}
    echte_vierhoek(fq); scherm_q(s, ox, oy)
    fx, fy = (fq['tl'][0] + fq['tr'][0]) / 2, (fq['tl'][1] + fq['tr'][1]) / 2
    echt_punt((fx, fy))                                  # midden van de bovenrand van de telefoon
    # het eerste van de catalogbeelden onder de knop (geo.RIJ, r 16): de wijzer eindigt op zijn onderrand
    rx0, _, rx1, ry1 = geo.RIJ
    r0 = scherm_naar_poster(rx0 + 16, ry1, s, ox, oy); r1 = scherm_naar_poster(rx1 - 16, ry1, s, ox, oy)
    echte_rand(r0, r1)
    rx, ry = (r0[0] + r1[0]) / 2, (r0[1] + r1[1]) / 2
    echt_punt((rx, ry))
    p2y = 352
    def ov(x):
        return (lijn(fx, fy - 4, fx, 74, kl(x, NACHT), 'begin', .6) + lijn(rx, p2y, rx, ry + 4, kl(x, NACHT), 'eind', .6)
                + ''.join(kruis(*fq[k], kl(x, VIOLET), 4, .9) for k in ('tl', 'tr'))
                + hoeken(kl(x, INKT), op=.7 if x else .45) + balken(kl(x, INKT), nr(3), 'Twee schermen', 'Eén telefoonfoto erin', 'visuails.com'))
    R.append(poster(xray('<image href="img/poster-twee.webp" x="0" y="0" width="400" height="500"/>', ov, 'img/poster-twee-x.png',
                         boven=pil(fx - 41, 54, 'Wat jij stuurt', 82) + pil(rx - 24, p2y, 'Wat je terugkrijgt', 104)),
                    'Poster 03 · Twee schermen', 'Telefoon en laptop naast elkaar. De twee wijzers eindigen op de bovenrand van de telefoon en op de catalogbeelden in de webshop.'))

    # 04 · Witte hal: hulplijnen op kap- en basislijn; kruisjes alleen op echte hoeken van V en S
    yk = 66; b = 300; x0 = 50
    def ov(x):
        svg, ybs = woordmerk_kap(x0, yk, b, kl(x, VIOLET))
        y = yk - merk.WM_KAP * wm_hoogte(b)
        hk = [wm_hoek(x0, y, b, 0, 'lb')[0], wm_hoek(x0, y, b, 7, 'rb')[0], wm_hoek(x0, y, b, 7, 'ro')[0]]
        return (lijn(0, yk, 400, yk, kl(x, LILA), 'beide') + lijn(0, ybs, 400, ybs, kl(x, LILA), 'beide')
                + lijn(x0, 60, x0, 330, kl(x, LILA), 'eind') + lijn(x0 + b, 60, x0 + b, 330, kl(x, LILA), 'eind')
                + ''.join(kruis(*p, kl(x, VIOLET)) for p in hk)
                + svg + hoeken(kl(x, INKT), op=.7 if x else .45) + balken(kl(x, INKT), nr(4), 'Witte hal', 'Enschede, NL'))
    R.append(poster(xray('<image href="img/poster-hal.jpg" x="0" y="0" width="400" height="500" preserveAspectRatio="xMidYMid slice"/>', ov, 'img/poster-hal-x.png'),
                    'Poster 04 · Witte hal', 'Het woordmerk groot tussen zijn kap- en basislijn, met 1 h ruimte boven het hoofd: nooit een merk of balk over een gezicht. Kruisjes alleen op echte hoeken: linksboven de V, rechtsboven en rechtsonder de S. Waar een lijn of de balk over het shirt valt, wordt hij wit (x-ray).'))

    # 05 · Beweging: het merk rechts op de tekstlijn, de punt op de onderste rasterlijn,
    # en sporen evenwijdig aan het dikke been (59,65°), op de afstand van de spleet
    R.append(poster(beweging(400, 500, 150, 400 - M - 12, 1000 / 3, nr(5)), 'Poster 05 · Beweging',
                    'Het V-merk staat niet in het midden maar hangt aan het raster: het blaadje op de rechtertekstlijn, de punt op de onderste rasterlijn. Drie sporen lopen evenwijdig aan het dikke been, op de afstand van de spleet, en stoppen op de lijn door de punt.'))

    # 06 · Icoon: de app-tegel, vlak in blauw uur (hoek 23%, het merk op 46%), met zijn randen doorgetrokken;
    # het merk met zijn zwaartepunt in het midden
    b, x0, y0 = 150, 125, 165
    vx, vy = zwaartepunt_verschuiving()
    c = NACHT; v = veld(400, 500); rt = b * .23
    echte_rechthoek(x0, y0, b, b, rt)
    bw = b * .46; bh = bw * geo.MH / geo.MW
    vxp = x0 + (b - bw) / 2 + vx / 100 * bw; vyp = y0 + (b - bh) / 2 + vy / 100 * bh
    g = ['<rect width="400" height="500" fill="#fff"/>',
         lijn(0, y0, 400, y0, c, 'beide', .35), lijn(0, y0 + b, 400, y0 + b, c, 'beide', .35),
         lijn(x0, v[1], x0, v[3], c, 'beide', .35), lijn(x0 + b, v[1], x0 + b, v[3], c, 'beide', .35),
         f'<rect x="{x0}" y="{y0}" width="{b}" height="{b}" rx="{rt:.2f}" fill="{VIOLET}"/>',
         vmerk(vxp, vyp, bw, WIT, registreer=False),
         hoeken(c, op=.45), balken(c, nr(6), 'Icoon', 'Het V-merk, op blauw uur', '')]
    R.append(poster(''.join(g), 'Poster 06 · Icoon', 'De app-tegel: vlak blauw uur, hoek 23%, het witte V-merk op 46%. De randen van de tegel zijn doorgetrokken. In de tegel staat het zwaartepunt van het merk in het midden, niet zijn kader.'))

    # 07 · Proef: €1 als lettervorm, de lijnen op de echte kaplijn, basislijn en randen
    R.append(poster(proef(400, 500, 42, 330, 232, -12, nr(7), 'Proef', 'Probeer VISUAILS · €1', 'visuails.com'), 'Poster 07 · Proef',
                    'Het grote €1 wit op vlak inkt. De lijnen staan op de echte kap- en basislijn van de 1 en langs de randen van € en 1; de kruisjes op de hoeken van de 1.'))

    # 08 · Alfabet: de merkletter A–Z, op nacht
    kap = 36; ruimte = merk.MATEN['ruimte'] * kap / merk.KAP
    rijen = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZ']
    basis = [196, 268, 340, 412]
    g = [f'<rect width="400" height="500" fill="{INKT}"/>']
    for r, yb_ in zip(rijen, basis):
        g.append(lijn(0, yb_, 400, yb_, WIT, 'beide', .22) + lijn(0, yb_ - kap, 400, yb_ - kap, WIT, 'beide', .14))
        x = M + 12
        for k in r:
            g.append(letter(k, x, yb_, kap, BLAUW_LICHT if k == 'V' else WIT))
            x += letter_breedte(k, kap) + ruimte
    g.append(tekst(M + 12, 112, 'Merkletter', 22, '#fff'))
    g.append(tekst(M + 12, 132, 'Elke maat uit het V-merk. Elke letter één ronde hoek.', 11, WAAS, 400))
    g.append(hoeken(WIT, op=.5) + balken(WIT, nr(8), 'Alfabet', 'Van A tot Z, uit het merk'))
    R.append(poster(''.join(g), 'Poster 08 · Alfabet', 'De merkletter van A tot Z op inkt. De V is het merk, in blauw licht. De letterafstand is die van het woordmerk.'))

    # 09 · Voor en na
    t, x1, x2, y1 = 152, 40, 208, 140
    g = ['<rect width="400" height="500" fill="#fff"/>',
         beeld('img/catalog-before.jpg', x1, y1, t, t), beeld('img/catalog-after.jpg', x2, y1, t, t),
         lijn(0, y1, 400, y1, LILA, 'beide', .9), lijn(0, y1 + t, 400, y1 + t, LILA, 'beide', .9),
         ''.join(kruis(px, py, VIOLET, 5, .9) for px in (x1, x2 + t) for py in (y1, y1 + t)),
         pil(x1 + t / 2 - 34, y1 + t + 14, 'Jouw foto', 68, MIST, op=1),
         pil(x2 + t / 2 - 42, y1 + t + 14, 'Catalogbeeld', 84, MIST, op=1),
         tekst(M + 12, 384, 'Eén telefoonfoto erin.', 17, INKT), tekst(M + 12, 405, 'Een catalogbeeld eruit.', 17, KOPLICHT, 400),
         woordmerk_op_basis(400 - M - 12 - 74, 500 - M - 8, 74, INKT),
         hoeken(INKT), balken(INKT, nr(9), 'Voor en na', 'Jouw eigen foto', '')]
    R.append(poster(''.join(g), 'Poster 09 · Voor en na', 'Links je eigen foto, rechts het catalogbeeld. Twee vierkanten op één rij, met hun boven- en onderrand doorgetrokken en kruisjes op de buitenhoeken.'))

    # 10 · Looks: vier looks in een raster van 2 × 2
    tw, th, gap = 151.2, 189, 12
    xa = (400 - 2 * tw - gap) / 2; ya = 56
    looks = [('look-dunes.jpg', 'Dunes'), ('look-eigen.jpg', 'Eigen'), ('look-flash.jpg', 'Flash'), ('look-glow.jpg', 'Glow')]
    g = ['<rect width="400" height="500" fill="#fff"/>']
    for i, (src, naam) in enumerate(looks):
        x = xa + (i % 2) * (tw + gap); y = ya + (i // 2) * (th + gap)
        g.append(beeld('img/' + src, x, y, tw, th, 10))
        g.append(pil(x + 10, y + th - 30, naam, 18 + len(naam) * 6.2 + 8))
    g.append(hoeken(INKT) + balken(INKT, nr(10), 'Looks', 'Kies je look'))
    R.append(poster(''.join(g), 'Poster 10 · Looks', 'Vier looks in een raster van 2 × 2, elk met zijn naam in een pil. De tegels vullen de poster binnen de balken.'))

    # 11 · Bouwtekening
    R.append(poster(bouwtekening(), 'Poster 11 · Bouwtekening',
                    'Het V-merk met zijn echte maten: kap- en basislijn met het overschot van 16, de hoeken van de twee benen, de boog en de spleet. De cirkel van de boog loopt óver het merk, in wit, zodat geen lijn ergens halverwege in het merk ophoudt.'))

    # 12 · Eén ronde hoek: de S, links op de tekstlijn, de cirkel van de boog óver de letter
    R.append(poster(ronde_hoek(), 'Poster 12 · Eén ronde hoek',
                    'De S van de merkletter, groot en links op de tekstlijn. Alleen de ronde hoek is blauw uur. De cirkel van de boog loopt over de letter heen, wit waar hij de letter raakt.'))
    return R

# ── 05 · Beweging (ook voor het visitekaartje) ──
def beweging(w, h, b, x_rechts, y_punt, linksboven, rechtsboven='Beweging', m=M, onderregel='Productbeelden voor kledingmerken',
             achter=True, sporen=3, veld_=None):
    s = b / geo.MW
    x = x_rechts - geo.H['blad_rechts'][0] * s
    y = y_punt - geo.H['punt'][1] * s
    v = veld_ or veld(w, h, m)
    pnt = mp(x, y, b, 'punt'); lb = mp(x, y, b, 'linksboven')
    u = richting(geo.RAND['dik_buiten'][0], geo.RAND['dik_buiten'][1])          # omlaag naar rechts, 59,65°
    u_top = richting(*geo.RAND['dik_buiten_top'])
    n = (-u[1], u[0])                                                           # naar linksonder, weg van het merk
    d = merk.MATEN['spleet'] * s
    g = []
    if achter:
        g.append(f'<rect width="400" height="500" fill="{VIOLET}"/>')            # vlak blauw uur, geen beeld en geen verloop
    # de lijn door de punt (raakt het merk alleen in de punt)
    g.append(lijn(0, y_punt, w, y_punt, WIT, 'beide', .4))
    # de rechterrand van het blaadje, doorgetrokken
    g.append(lijn(x_rechts, v[1], x_rechts, v[3], WIT, 'beide', .3))
    # de buitenrand van het dikke been, doorgetrokken vanaf de hoek linksboven
    ver = straal(lb, (-u_top[0], -u_top[1]), v)
    g.append(lijn(*ver, *lb, WIT, 'begin', .45))
    # de sporen: evenwijdig, op 1, 2 en 3 spleten afstand, tot de lijn door de punt
    for k in range(1, sporen + 1):
        p0 = (pnt[0] + n[0] * d * k, pnt[1] + n[1] * d * k)
        onder = snij(p0, u, (0, y_punt), (1, 0))
        boven = straal(onder, (-u[0], -u[1]), v)
        echt_punt(onder)                     # snijpunt met de lijn door de punt: daar stopt het spoor
        g.append(lijn(*boven, *onder, WIT, 'begin', .45 - .1 * k))
    g.append(vmerk(x, y, b, WIT))
    if achter:
        g.append(hoeken(WIT, op=.5) + balken(WIT, linksboven, rechtsboven, onderregel))
    return ''.join(g)

def zwaartepunt_verschuiving():
    """Hoeveel het merk verschuift (in % van zijn eigen breedte en hoogte) als zijn zwaartepunt in het midden moet."""
    zx, zy = geo.ZWAARTEPUNT
    return (geo.MW / 2 - zx) / geo.MW * 100, (geo.MH / 2 - zy) / geo.MH * 100

# ── 07 · Proef (ook als story) ──
def proef(w, h, x, y_basis, grootte, spatie, lb, rb, lo, ro, groot=False):
    pad, v, kap = tekst_als_vorm('€1', x, y_basis, grootte, 200, spatie, '#fff')
    vk = veld(w, h)
    # echte randen: links de uiteinden van de twee streepjes van €, rechts de stok van de 1
    xl = v.bounds[0]
    een = [g for g in v.geoms if g.bounds[0] > x + grootte * .4][0]
    xr = een.bounds[2]
    g = [verloop_violet(w, h),
         lijn(0, kap, w, kap, WIT, 'beide', .35), lijn(0, y_basis, w, y_basis, WIT, 'beide', .35),
         lijn(xl, vk[1], xl, vk[3], WIT, 'beide', .3), lijn(xr, vk[1], xr, vk[3], WIT, 'beide', .22),
         kruis(xr, kap, WIT, 5, .7), kruis(xr, y_basis, WIT, 5, .7),
         pad]
    if not groot:
        g += [tekst_links(xl, y_basis + 42, 'Eerst zien? Eén product voor €1.', 15, '#fff'),
              tekst_links(xl, y_basis + 62, 'Gemaakt van jouw eigen foto · één per bedrijf', 11, WAAS, 400)]
    else:
        g += [tekst_links(xl, y_basis + 52, 'Eerst zien?', 22, '#fff'), tekst_links(xl, y_basis + 80, 'Eén product voor €1.', 22, WAAS, 400),
              tekst_links(xl, y_basis + 112, 'Gemaakt van jouw eigen foto', 12, WAAS, 400)]
    bm = 26 if not groot else 28
    g.append(vmerk(w - M - 12 - bm, M + 24 + 8, bm, WIT))
    g.append(hoeken(WIT, w, h, op=.5))
    g.append(balken(WIT, lb, rb, lo, ro, w, h))
    return ''.join(g)

# ── 11 · Bouwtekening ──
def bouwtekening():
    s = .3
    cx, cy = geo.BOOG_C
    x = M + 12 + (geo.R_BOOG - cx) * s            # de cirkel van de boog raakt de linkertekstlijn
    y = 1000 / 3 - geo.H['punt'][1] * s           # de punt op de onderste rasterlijn
    b = geo.MW * s
    yk, yb = y + geo.KAP_Y * s, y + geo.BASIS_Y * s
    P_ = lambda p: mp(x, y, b, p)
    f8 = f'{MONO} font-size="8" fill="{NACHT}"'
    g = [f'<rect width="400" height="500" fill="{MIST}"/>',
         lijn(0, yk, 400, yk, LILA, 'beide'), lijn(0, yb, 400, yb, LILA, 'beide'),
         f'<text x="{400 - M - 12}" y="{yk - 7:.1f}" text-anchor="end" {f8}>kaplijn</text><text x="{400 - M - 12}" y="{yb - 7:.1f}" text-anchor="end" {f8}>basislijn</text>']
    v = veld(400, 500)
    # buitenrand dikke been, beide kanten doorgetrokken
    lb, pnt = P_('linksboven'), P_('punt')
    ut = richting(*geo.RAND['dik_buiten_top']); u = richting(*geo.RAND['dik_buiten'])
    g.append(lijn(*straal(lb, (-ut[0], -ut[1]), v), *lb, LILA, 'begin', .9))
    g.append(lijn(*pnt, *straal(pnt, u, (0, 0, 400, 1000 / 3 + 40)), LILA, 'eind', .9))
    # binnenrand dikke been, doorgetrokken tot de kaplijn: daar zou de scherpe hoek zitten
    be = P_('boog_eind'); ub = richting(geo.H['snede_onder'], geo.H['boog_eind'])
    hk = snij(be, ub, (0, yk), (1, 0))
    g.append(lijn(*be, *hk, LILA, 'geen', .7))
    echt_punt(hk)
    # hoeken van de benen, gemeten op de basislijn
    for rand, naar, waarde, kant in (('dik_buiten', (-1, 0), merk.MATEN['dik_hoek'], -1), ('dun_buiten', (1, 0), merk.MATEN['dun_hoek'], 1)):
        a, c = geo.RAND[rand]
        a, c = P_(a), P_(c)
        dr = richting(a, c)
        X = snij(a, dr, (0, yb), (1, 0))
        omhoog = dr if dr[1] < 0 else (-dr[0], -dr[1])
        r = 26
        p1 = (X[0] + naar[0] * r, X[1]); p2 = (X[0] + omhoog[0] * r, X[1] + omhoog[1] * r)
        veeg = 1 if kant < 0 else 0
        g.append(f'<path d="M{p1[0]:.2f} {p1[1]:.2f}A{r} {r} 0 0 {veeg} {p2[0]:.2f} {p2[1]:.2f}" fill="none" stroke="{NACHT}" stroke-opacity=".6" stroke-width="{LIJN}" vector-effect="non-scaling-stroke"/>')
        bis = richting((0, 0), (naar[0] + omhoog[0], naar[1] + omhoog[1]))
        tx, ty = X[0] + bis[0] * (r + 8), X[1] + bis[1] * (r + 8)
        g.append(f'<text x="{tx:.1f}" y="{ty + 3:.1f}" text-anchor="{"end" if kant < 0 else "start"}" {f8}>{nl(waarde)}°</text>')
        echt_punt(X)
    # overschot: de punt onder de basislijn, het blaadje boven de kaplijn (16)
    for p, ref, onder in ((pnt, yb, True), (P_('blad_top'), yk, False)):
        xo = p[0] + 16
        g.append(lijn(p[0] + 2, p[1], xo + 4, p[1], NACHT, 'geen', .5))
        g.append(f'<path d="M{xo:.2f} {ref:.2f}V{p[1]:.2f}" stroke="{NACHT}" stroke-opacity=".6" stroke-width="{LIJN}" vector-effect="non-scaling-stroke"/>')
        g.append(f'<text x="{xo + 5:.1f}" y="{(ref + p[1]) / 2 + 3:.1f}" {f8}>16</text>')
    # spleet: loodrecht tussen de snede en de onderkant van het blaadje
    k = (619.25, 408.25)
    a, c = geo.H['blad_onder'], geo.H['blad_punt']
    ua = richting(a, c)
    t = (k[0] - a[0]) * ua[0] + (k[1] - a[1]) * ua[1]
    voet = (a[0] + ua[0] * t, a[1] + ua[1] * t)
    S1, S2 = P_(voet), P_(k)
    g.append(lijn(*S1, *S2, NACHT, 'geen', .7))
    echt_punt(S1, S2)
    xl = P_('blad_rechts')[0] + 18
    g.append(f'<text x="{xl:.1f}" y="{(S1[1] + S2[1]) / 2 + 3:.1f}" {f8}>spleet {nl(merk.MATEN["spleet"])}</text>')
    g.append(f'<text x="{xl:.1f}" y="{(S1[1] + S2[1]) / 2 + 15:.1f}" {f8}>snede {nl(merk.MATEN["snede"])}°</text>')
    # het merk, en daarover de cirkel van de boog: grijs naast het merk, wit op het merk
    cc = P_(geo.BOOG_C); rr = geo.R_BOOG * s
    a1 = math.atan2(geo.H['boog_eind'][1] - geo.BOOG_C[1], geo.H['boog_eind'][0] - geo.BOOG_C[0])
    a2 = math.atan2(geo.H['boog_begin'][1] - geo.BOOG_C[1], geo.H['boog_begin'][0] - geo.BOOG_C[0])
    am = (a1 + a2) / 2
    rp = (cc[0] + rr * math.cos(am), cc[1] + rr * math.sin(am))
    cid, clip = merk_clip(x, y, b)
    cirkel = lambda kleur, op: (f'<circle cx="{cc[0]:.2f}" cy="{cc[1]:.2f}" r="{rr:.2f}" fill="none" stroke="{kleur}" stroke-opacity="{op}" stroke-width="{LIJN}" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>'
                                f'<path d="M{cc[0]:.2f} {cc[1]:.2f}L{rp[0]:.2f} {rp[1]:.2f}" stroke="{kleur}" stroke-opacity="{op}" stroke-width="{LIJN}" vector-effect="non-scaling-stroke"/>')
    g.append(cirkel(LILA, 1))
    g.append(vmerk(x, y, b, VIOLET))
    g.append(f'<defs>{clip}</defs><g clip-path="url(#{cid})">{cirkel(WIT, .9)}</g>')
    g.append(kruis(*cc, NACHT, 4, .8))
    g.append(f'<text x="{cc[0] - 6:.1f}" y="{cc[1] + 14:.1f}" text-anchor="end" {f8}>r {nl(geo.R_BOOG)}</text>')
    g.append(tekst(M + 12, 412, 'Elke maat uitgerekend.', 17, INKT) + tekst(M + 12, 433, 'Niets op het oog.', 17, KOPLICHT, 400))
    g.append(hoeken(INKT) + balken(INKT, nr(11), 'Bouwtekening', 'De maten van het merk'))
    return ''.join(g)

# ── 12 · Eén ronde hoek ──
def ronde_hoek():
    kap = 250; sx = kap / merk.KAP
    sb = merk.LETTERS['S']['b']; sw = (sb[2] - sb[0]) * sx
    x0 = M + 12; ybas = 330; ytop = ybas - kap
    r = geo.R_BOOG * sx; c = (x0 + r, ytop + r)
    cid = uid('h'); sid = uid('s')
    d, _ = merk.letter_pad('S')
    tr = f'translate({x0 - sb[0] * sx:.2f} {ybas:.2f}) scale({sx:.5f})'
    cirkel = lambda kleur, op: f'<circle cx="{c[0]:.2f}" cy="{c[1]:.2f}" r="{r:.2f}" fill="none" stroke="{kleur}" stroke-opacity="{op}" stroke-width="{LIJN}" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>'
    v = veld(400, 500)
    g = ['<rect width="400" height="500" fill="#fff"/>',
         lijn(0, ytop, 400, ytop, LILA, 'beide'), lijn(0, ybas, 400, ybas, LILA, 'beide'),
         lijn(x0, v[1], x0, v[3], LILA, 'beide', .6), lijn(x0 + sw, v[1], x0 + sw, v[3], LILA, 'beide', .6),
         cirkel(LILA, 1),
         letter('S', x0, ybas, kap, INKT),
         f'<defs><clipPath id="{cid}"><rect x="{x0 - 1:.2f}" y="{ytop - 1:.2f}" width="{r + 1:.2f}" height="{r + 1:.2f}"/></clipPath>'
         f'<clipPath id="{sid}"><path transform="{tr}" clip-rule="evenodd" d="{d}"/></clipPath></defs>',
         f'<g clip-path="url(#{cid})">{letter("S", x0, ybas, kap, VIOLET, False)}</g>',
         f'<g clip-path="url(#{sid})">{cirkel(WIT, .9)}</g>',
         kruis(*c, NACHT, 4, .8),
         f'<text x="{c[0] + 7:.1f}" y="{c[1] + 3:.1f}" {MONO} font-size="8" fill="{NACHT}">r {nl(geo.R_BOOG)}</text>',
         tekst(M + 12, 384, 'Elke letter: één ronde hoek.', 17, INKT), tekst(M + 12, 405, 'De boog uit het merk.', 17, KOPLICHT, 400),
         hoeken(INKT), balken(INKT, nr(12), 'Eén ronde hoek', 'Merkletter · S')]
    echt_punt(c)
    return ''.join(g)

# ─────────────────────────────── andere beelden ───────────────────────────────
def stories():
    F = []
    # Scherm
    s = 360 / SRC_W; oy = 210
    lijnen, q = scherm_lijnen(s, 0, oy, LILA, w=360, h=640)
    b = 150; yk = (M + 24 + oy) / 2 - wm_kaphoogte(b) / 2
    wsvg, _ = woordmerk_kap((360 - b) / 2, yk, b, VIOLET)
    inh = ('<rect width="360" height="640" fill="#fff"/>' + beeld_met_fade('img/poster-scherm.webp', 0, oy, 360, 270, .14, .80)
           + lijnen + wsvg + hoeken(INKT, 360, 640)
           + tekst(180, 540, 'Al je productbeelden.', 19, INKT, 500, 'middle') + tekst(180, 564, 'Zonder shoot.', 19, KOPLICHT, 400, 'middle')
           + balken(INKT, 'Productbeelden', 'Story', 'Probeer · €1', 'visuails.com', 360, 640))
    F.append(poster(inh, 'Story · Scherm', 'Het laptopbeeld in het midden.', 's'))
    # X-ray
    yk = 96; b = 260; x0 = 50
    def ov(x):
        svg, ybs = woordmerk_kap(x0, yk, b, kl(x, VIOLET))
        y = yk - merk.WM_KAP * wm_hoogte(b)
        hk = [wm_hoek(x0, y, b, 0, 'lb')[0], wm_hoek(x0, y, b, 7, 'rb')[0], wm_hoek(x0, y, b, 7, 'ro')[0]]
        return (lijn(0, yk, 360, yk, kl(x, LILA), 'beide') + lijn(0, ybs, 360, ybs, kl(x, LILA), 'beide')
                + lijn(x0, 60, x0, 260, kl(x, LILA), 'eind') + lijn(x0 + b, 60, x0 + b, 260, kl(x, LILA), 'eind')
                + ''.join(kruis(*p, kl(x, VIOLET)) for p in hk) + svg
                + tekst_links(x0, ybs + 30, 'Al je productbeelden.', 13, kl(x, INKT))
                + tekst_links(x0, ybs + 47, 'Zonder shoot.', 13, 'rgba(255,255,255,.88)' if x else INKT3, 400)
                + hoeken(kl(x, INKT), 360, 640, op=.7 if x else .45) + balken(kl(x, INKT), 'Nieuwe look', 'Story', 'Witte hal', 'visuails.com', 360, 640))
    F.append(poster(xray('<image href="img/story-xray.webp" x="0" y="0" width="360" height="640"/>', ov, 'img/story-xray-x.png', 360, 640),
                    'Story · X-ray', 'Het woordmerk en de regel boven het model; waar de balk onder over de broek valt, wordt hij wit (x-ray).', 's'))
    # Proef
    F.append(poster(proef(360, 640, 36, 400, 260, -14, 'Probeer', 'Story', 'Eén per bedrijf', 'visuails.com', groot=True), 'Story · Proef',
                    'Het €1-aanbod staand, met het V-merk klein rechtsboven.', 's'))
    # Voor en na, onder elkaar
    g = ['<rect width="360" height="640" fill="#fff"/>',
         beeld('img/catalog-before.jpg', 90, 92, 180, 180), beeld('img/catalog-after.jpg', 40, 300, 280, 280),
         lijn(0, 92, 360, 92, LILA, 'beide', .8), lijn(0, 272, 360, 272, LILA, 'beide', .8),
         lijn(0, 300, 360, 300, LILA, 'beide', .5), lijn(0, 580, 360, 580, LILA, 'beide', .8),
         kruis(90, 92, VIOLET, 5, .9), kruis(270, 92, VIOLET, 5, .9), kruis(40, 580, VIOLET, 5, .9), kruis(320, 580, VIOLET, 5, .9),
         pil(100, 242, 'Jouw foto', 68), pil(50, 550, 'Catalogbeeld', 84),
         hoeken(INKT, 360, 640), balken(INKT, 'Voor en na', 'Story', 'Jouw eigen foto', 'visuails.com', 360, 640)]
    F.append(poster(''.join(g), 'Story · Voor en na', 'Je foto klein bovenaan, het catalogbeeld groot eronder.', 's'))
    return F

def social():
    F = []
    # 1:1 · product en model, half om half
    b = 140; yk = (M + 24 + 96) / 2 - wm_kaphoogte(b) / 2
    wsvg, _ = woordmerk_kap((400 - b) / 2, yk, b, VIOLET)
    g = ['<rect width="400" height="400" fill="#fff"/>',
         beeld('img/ba2-front.jpg', 0, 96, 200, 304), beeld('img/ba2-model.jpg', 200, 96, 200, 304),
         lijn(0, 96, 400, 96, LILA, 'beide', .8), lijn(200, 96, 200, 380, LILA, 'eind', .8), kruis(200, 96, VIOLET, 4, .9),
         wsvg,
         pil(40, 330, 'Product', 62), pil(240, 330, 'Op model', 70),
         hoeken(INKT, 400, 400), balken(INKT, '1:1', 'Post', 'Eén foto, twee beelden', 'visuails.com', 400, 400)]
    F.append(poster(''.join(g), 'Post · 1:1', 'Het product en hetzelfde product op een model, half om half.', 'k'))
    # 4:5 · een look: de lijn staat op de basislijn van "Flash"
    _, vf, _ = tekstvorm.tekst_pad('Flash', 0, 0, 46, 500)
    yf = 404
    echt_punt((M + 12, yf))
    g = [beeld('img/look-flash.jpg', 0, 0, 400, 500, registreer=False),
         f'<rect width="400" height="500" fill="{INKT}" fill-opacity=".18"/>',
         woordmerk(M + 12, 66, 150, WIT),
         tekst_links(M + 12, yf, 'Flash', 46, '#fff'), tekst_links(M + 12, yf + 24, 'Jouw product, ’s avonds op straat.', 13, 'rgba(255,255,255,.85)', 400),
         lijn(0, yf, 400, yf, WIT, 'beide', .3),
         hoeken(WIT, op=.5), balken(WIT, 'Look', 'Post 4:5', 'Kies je look', 'visuails.com')]
    F.append(poster(''.join(g), 'Post · 4:5', 'Eén look groot, met zijn naam op een lijn. Het woordmerk wit linksboven, op het donkere deel van de foto.', 'p'))
    return F

def breed():
    F = []
    # banner 16:9: lijnen op kap- en basislijn van het woordmerk, kruisjes op echte hoeken
    s = 400 / SRC_W; ox, oy = 250, 10
    q = scherm_q(s, ox, oy)
    x0, yk, b = 62, 170, 150
    wsvg, ywb = woordmerk_kap(x0, yk, b, VIOLET)
    y = yk - merk.WM_KAP * wm_hoogte(b)
    hk = [wm_hoek(x0, y, b, 0, 'lb')[0], wm_hoek(x0, y, b, 7, 'rb')[0], wm_hoek(x0, y, b, 7, 'ro')[0]]
    inh = ('<rect width="640" height="360" fill="#fff"/>' + beeld_met_fade('img/poster-scherm.webp', ox, oy, 400, 300, .10, .82, links=.28)
           + lijn(20, yk, 330, yk, LILA, 'eind', .8) + lijn(20, ywb, 330, ywb, LILA, 'eind', .8) + lijn(x0, 70, x0, 300, LILA, 'beide', .6)
           + ''.join(kruis(*p, VIOLET, 4, .8) for p in hk) + ''.join(kruis(*q[k], VIOLET, 4, .9) for k in q)
           + wsvg + tekst_links(x0, ywb + 31, 'Al je productbeelden.', 17, INKT) + tekst_links(x0, ywb + 50, 'Zonder shoot.', 17, KOPLICHT, 400)
           + hoeken(INKT, 640, 360, 20) + balken(INKT, 'Productbeelden', 'Banner', 'Enschede, NL', 'visuails.com', 640, 360, 20))
    F.append(poster(inh, 'Banner · 16:9', 'Voor een nieuwsbrief, een presentatie of een advertentie.', 'b'))
    # e-mail 3:1
    b = 260; x0 = (600 - b) / 2; yk = 100 - wm_kaphoogte(b) / 2
    wsvg, ywb = woordmerk_kap(x0, yk, b, NACHT)
    y = yk - merk.WM_KAP * wm_hoogte(b)
    hk = [wm_hoek(x0, y, b, 0, 'lb')[0], wm_hoek(x0, y, b, 7, 'rb')[0], wm_hoek(x0, y, b, 7, 'ro')[0]]
    inh = (f'<rect width="600" height="200" fill="{MIST}"/>' + lijn(0, yk, 600, yk, LILA, 'beide') + lijn(0, ywb, 600, ywb, LILA, 'beide')
           + ''.join(kruis(*p, VIOLET, 4, .8) for p in hk) + wsvg
           + tekst(300, 172, 'De Studiobrief · oktober 2026', 10, NACHT, 600, 'middle') + hoeken(NACHT, 600, 200, 16))
    F.append(poster(inh, 'E-mailkop · 3:1', 'Bovenaan de Studiobrief: het woordmerk tussen zijn kap- en basislijn.', 'm'))
    # LinkedIn 4:1
    x0, yk, b = 48, 70, 230
    wsvg, ywb = woordmerk_kap(x0, yk, b, VIOLET)
    y = yk - merk.WM_KAP * wm_hoogte(b)
    hk = [wm_hoek(x0, y, b, 0, 'lb')[0], wm_hoek(x0, y, b, 7, 'rb')[0], wm_hoek(x0, y, b, 7, 'ro')[0]]
    inh = ('<rect width="800" height="200" fill="#fff"/>' + beeld_met_fade('img/poster-scherm.webp', 430, -40, 370, 278, .12, .86, links=.34)
           + lijn(20, yk, 460, yk, LILA, 'eind', .8) + lijn(20, ywb, 460, ywb, LILA, 'eind', .8)
           + ''.join(kruis(*p, VIOLET, 4, .8) for p in hk) + wsvg
           + tekst_links(x0, ywb + 40, 'Productbeelden voor kledingmerken.', 15, INKT) + tekst_links(x0, ywb + 59, 'Zonder shoot.', 15, KOPLICHT, 400)
           + hoeken(INKT, 800, 200, 16))
    F.append(poster(inh, 'LinkedIn · 4:1', 'Bedrijfspagina: links het woordmerk en de regel, rechts het laptopbeeld dat wegvloeit.', 'l'))
    return F

def drukwerk():
    F = []
    w, h, m = 425, 275, 18
    x0, yk, b = m + 16, 62, 190
    wsvg, ywb = woordmerk_kap(x0, yk, b, NACHT)
    y = yk - merk.WM_KAP * wm_hoogte(b)
    hk = [wm_hoek(x0, y, b, 0, 'lb')[0], wm_hoek(x0, y, b, 7, 'rb')[0], wm_hoek(x0, y, b, 7, 'ro')[0]]
    inh = ('<rect width="425" height="275" fill="#fff"/>' + lijn(0, yk, 425, yk, LILA, 'beide', .8) + lijn(0, ywb, 425, ywb, LILA, 'beide', .8)
           + ''.join(kruis(*p, VIOLET, 4, .8) for p in hk) + wsvg
           + tekst_links(x0, 190, 'Voornaam Achternaam', 12, INKT, 600) + tekst_links(x0, 206, 'Studio voor productbeelden', 10, INKT3, 400)
           + tekst_links(x0, 230, 'hallo@voorbeeld.nl · +31 6 00 00 00 00', 9.5, INKT, 500) + tekst(w - m - 16, 230, 'visuails.com', 9.5, VIOLET, 600, 'end')
           + hoeken(INKT, w, h, m, .4))
    F.append(poster(inh, 'Visitekaartje · voor', '85 × 55 mm. Het woordmerk tussen zijn hulplijnen, de gegevens onderaan (hier verzonnen).', 'c'))
    # achterkant: hetzelfde idee als poster 05, in het klein. Het blaadje op de rechtertekstlijn, de punt op de regel van visuails.com
    yr = 230
    inh = (f'<rect width="425" height="275" fill="{VIOLET}"/>'                  # vlak blauw uur
           + beweging(w, h, 96, w - m - 16, yr, '', achter=False, veld_=(0, m + 8, w, h - m - 8))
           + tekst_links(m + 16, yr, 'visuails.com', 9.5, 'rgba(255,255,255,.8)', 600) + hoeken(WIT, w, h, m, .45))
    F.append(poster(inh, 'Visitekaartje · achter', 'Poster 05 in het klein: het V-merk rechts op de tekstlijn, zijn punt op de regel van visuails.com, met de drie sporen van het dikke been.', 'c'))
    return F

def raster():
    f = f'{U} font-weight="600" font-size="9" fill="#0B0F17"'
    g = ['<rect width="400" height="500" fill="#F4F5F7"/>',
         f'<rect x="{M}" y="{M}" width="{400 - 2 * M}" height="{500 - 2 * M}" fill="none" stroke="#636974" stroke-opacity=".6" stroke-dasharray="3 4" stroke-width="{LIJN}" vector-effect="non-scaling-stroke"/>',
         f'<rect x="{M}" y="{M}" width="{400 - 2 * M}" height="24" fill="#E6E8EC" fill-opacity=".9"/>',
         f'<rect x="{M}" y="{500 - M - 24}" width="{400 - 2 * M}" height="24" fill="#E6E8EC" fill-opacity=".9"/>',
         f'<text x="{M + 12}" y="{M + 15}" {f}>Balk boven · index en reeks</text>',
         f'<text x="{M + 12}" y="{500 - M - 9}" {f}>Balk onder · regel en adres</text>']
    for x in (400 / 3, 800 / 3):
        g.append(_lijn0(x, M + 24, x, 500 - M - 24, LILA, 'beide', .7))
    for y in (500 / 3, 1000 / 3):
        g.append(_lijn0(M, y, 400 - M, y, LILA, 'beide', .7))
    # tekstlijnen: 12 binnen de marge
    for x in (M + 12, 400 - M - 12):
        g.append(f'<path d="M{x} {M + 24}V{500 - M - 24}" stroke="#25508B" stroke-opacity=".5" stroke-dasharray="1 3" stroke-width="{LIJN}" vector-effect="non-scaling-stroke"/>')
    hb = 150 * merk.WM_H / merk.WM_W
    for (x, y, b, n, r) in [(125, (M + 24 + 150) / 2 - merk.KAP * 150 / merk.WM_W / 2 - merk.WM_KAP * hb, 150, 'woordmerk M · 150', merk.WM_H / merk.WM_W),
                            (M + 14, 360, 74, 'S · 74', merk.WM_H / merk.WM_W),
                            (50, 236, 300, 'L · 300', merk.WM_H / merk.WM_W)]:
        hh = b * r
        g.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{b}" height="{hh:.1f}" fill="none" stroke="#25508B" stroke-opacity=".7" stroke-dasharray="2 3" stroke-width="{LIJN}" vector-effect="non-scaling-stroke"/>')
        g.append(f'<text x="{x + 4:.1f}" y="{y - 5:.1f}" {f}>{n}</text>')
    # V-merk: rechts op de tekstlijn, de punt op de onderste rasterlijn (zoals poster 05)
    bv = 48; xv = 400 - M - 12 - bv; yv = 1000 / 3 - geo.MH * bv / geo.MW
    g.append(f'<rect x="{xv:.1f}" y="{yv:.1f}" width="{bv}" height="{bv * geo.MH / geo.MW:.1f}" fill="none" stroke="#25508B" stroke-opacity=".7" stroke-dasharray="2 3" stroke-width="{LIJN}" vector-effect="non-scaling-stroke"/>')
    g.append(f'<text x="{xv + bv:.1f}" y="{yv - 5:.1f}" text-anchor="end" {f}>V-merk</text>')
    g.append(f'<path d="M0 {M / 2}H{M}M{M / 2} 0V{M}" stroke="#0B0F17" stroke-width="{LIJN}" vector-effect="non-scaling-stroke"/>')
    g.append(f'<text x="{M + 4}" y="{M - 6}" {f}>marge 28</text>')
    g.append(hoeken('#0B0F17', op=.6))
    REG.clear(); REG.update(_leeg())
    return f'<svg viewBox="0 0 400 500" role="img" aria-label="Het posterraster: marge, balken, tekstlijnen, drie kolommen, het woordmerk in drie maten en het V-merk">{"".join(g)}</svg>'

def merkschema():
    MELDINGEN.clear()
    R = posters()
    ST, SO, BR, DR = stories(), social(), breed(), drukwerk()
    return f'''
  <h3 style="margin-top:40px">Posterraster</h3>
  <div class="raster r2" style="margin-top:14px;align-items:start">
    <figure class="pst pst-p" style="margin:0">{raster()}<figcaption><b>Het raster</b>Elke poster: 400 × 500, marge 28, een balk boven (index en reeks) en onder (regel en adres), twee tekstlijnen 12 binnen de marge, drie kolommen en drie rijen, en óf het woordmerk (S, M of L) óf het V-merk. Het V-merk staat nooit in het midden: het hangt met een echt punt aan het raster.</figcaption></figure>
    <div>
      <div class="kaart wit" style="margin-bottom:16px"><h4>Regels</h4><ul class="punt" style="margin:0">
        <li><b>Lijnen</b> zijn 0,6 px, in veldlijngrijs (#858A94) op licht en in wit (15–45%) op donker. Kruisjes in blauw uur.</li>
        <li><b>Fade</b>: een lijn vervaagt aan het uiteinde waar hij de rand raakt, nooit midden in beeld. Verticale lijnen stoppen 8 px voor de balken.</li>
        <li><b>Elke lijn hangt aan iets echts</b>: een rand of hoek van het merk, een letter, een scherm, een foto of een tegel. Nooit aan het midden van het kader.</li>
        <li><b>Het V-merk is expres scheef</b>, dus nooit in het geometrische midden en nooit met lijnen erdoorheen. Een lijn raakt het merk alleen in een hoek of langs een rand. In een bouwtekening mag een hulplijn óver het merk lopen, maar dan helemaal en in wit.</li>
        <li><b>In een tegel</b> (app-icoon, profielfoto) moet het merk wel in het midden. Daar staat zijn zwaartepunt in het midden, niet zijn kader.</li>
        <li><b>Kruisjes</b> (10 px) alleen op een hoek die er echt is. Dus niet op de hoek van het kader van een woord: linksonder het woordmerk zit geen hoek.</li>
        <li><b>Maatlijnen</b> meten wat er staat: de 2048 px staat op de lange zijde van de productfoto.</li>
        <li><b>Logo</b>: óf het woordmerk óf het V-merk, nooit samen, hoogstens één per beeld. Minstens 1 h ruimte tot lijnen en tekst.</li>
        <li><b>Tekst</b>: Urbanist; de balken boven in IBM Plex Mono, hoofdletters, het nummer in het accent (/ 01), zoals de sectielabels op de site. Eén regel per hoek, hoogstens vijf woorden. Koppen in 500, de tweede regel in 400 en lichter. Tekst onder een woordmerk of getal begint op dezelfde rand.</li>
        <li><b>De merkletter</b> alleen voor het woordmerk en voor losse letters als beeld (poster 08 en 12), nooit voor zinnen.</li>
        <li><b>Vlakken zijn vlak</b>: wit, inkt of blauw uur. Geen verloop en geen korrel (sinds Blauw uur, 24 oktober 2026).</li>
        <li><b>X-ray</b>: valt tekst, een lijn of het woordmerk over een donker deel van de foto, dan wordt precies dat stukje wit.</li>
      </ul></div>
      <div class="kaart wit">{lijnstaal()}</div>
    </div>
  </div>

  <div class="kaart wit" id="nagerekend" style="margin-top:28px"><h4>Nagerekend in versie 9</h4>
    <p class="klein" style="margin:0 0 10px">Elke lijn en elk kruisje wordt nu bij het bouwen nagerekend tegen de echte vormen (merk, letters, scherm, foto's). Dit was er mis, naast de drie die jij vond:</p>
    <ul class="punt" style="margin:0">
      <li><b>02</b>: 2048 px is de lange zijde. Die is bij de productfoto de hoogte, dus de maatlijn staat nu verticaal.</li>
      <li><b>03</b>: de wijzer naar "Wat je terugkrijgt" eindigde op een lege plek; nu op de catalogbeelden onder de knop.</li>
      <li><b>04, X-ray-story, e-mailkop, LinkedIn, visitekaartje</b>: een kruisje linksonder het woordmerk, waar geen hoek zit (5×). Weg.</li>
      <li><b>06</b>: een cirkel om de tegel die niets raakte. Weg.</li>
      <li><b>07 en de Proef-story</b>: de lijnen stonden op het oog, 17 à 18 px boven de echte kaplijn van de 1 en net naast het €-teken (8×). Nu is €1 een lettervorm en staan lijnen en kruisjes op de echte randen en hoeken.</li>
      <li><b>09</b>: een lijn door het midden die nergens aan hing. Weg.</li>
      <li><b>11 en de constructie in §10</b>: lijnen die onder het merk door liepen en er ergens uit kwamen, en kruisjes op hoeken van het kader in plaats van het merk (12×).</li>
      <li><b>Post 4:5</b>: een lijn net onder "Flash". Nu op zijn basislijn.</li>
      <li><b>Banner</b>: twee lijnen en een verticale lijn op plekken van het oude woordmerk, met twee kruisjes (5×). Nu op kap- en basislijn en echte hoeken.</li>
    </ul></div>

  <h3 style="margin-top:40px">Posters · reeks 01–12</h3>
  <p class="klein" style="margin:6px 0 14px">Twaalf posters, elk met een eigen opbouw maar op hetzelfde raster. Nieuw in versie 9: 05 Beweging en de achterkant van het visitekaartje zijn opnieuw opgezet (het merk niet meer in het midden), de maatlijn op 02 staat nu op de foto, en alle lijnen en kruisjes zijn nagerekend.</p>
  <div class="pst-raster">{''.join(R)}</div>

  <h3 style="margin-top:44px">Andere beelden</h3>
  <p class="klein" style="margin:6px 0 14px">Dezelfde regels, op de maten die je echt gebruikt.</p>
  <h4 style="margin:18px 0 10px">Stories · 9:16</h4>
  <div class="pst-groep g4">{''.join(ST)}</div>
  <h4 style="margin:26px 0 10px">Posts · 1:1 en 4:5</h4>
  <div class="pst-groep g2">{''.join(SO)}</div>
  <h4 style="margin:26px 0 10px">Breed · banner, e-mail en LinkedIn</h4>
  <div class="pst-groep gbreed">{''.join(BR)}</div>
  <h4 style="margin:26px 0 10px">Drukwerk · visitekaartje</h4>
  <div class="pst-groep g2">{''.join(DR)}</div>
'''

if __name__ == '__main__':
    merkschema()
    print('\n'.join(MELDINGEN) or 'geen meldingen')
