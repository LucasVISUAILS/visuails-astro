"""
VISUAILS — de beeldreeks van de opening. 25 oktober 2026.

    python scripts/opening-reeks.py <video.mp4> <still-3840.png> [werkmap]
    node scripts/opening-reeks.mjs [werkmap]          (daarna: AVIF/WebP in public/img/hal/opening/)

Lucas, 25 oktober: "Ik heb dan ook een video hiervan die ik als scroll animatie op de
beginsectie wil hebben." De video (images/BG/magnific_static-shot-…_78824.mp4, 6,0 s,
24 fps, 1920 × 1080, puur wit) wordt een reeks losse beelden die de voorpagina met de
scroll afspeelt; de still (opening-laptop-telefoon-wit-3840x2160.png, beeld 0 op 2×) is
het rustbeeld en het eerste wat de bezoeker ziet.

WAT DIT SCRIPT DOET, PER BEELD (0 – 133):
  1. De schermen zoeken: wit dat helemaal door de rand van het apparaat is ingesloten
     (een vloedvulling vanaf de rand van het beeld, drempel 150). Laptop links, telefoon
     rechts, elk groter dan 20.000 px.
  2. De hoeken van elk scherm meten (laptop: links-, rechtsboven en linksonder uit de
     omtrek, rechtsonder als parallellogram; telefoon: het kleinste draaiende rechthoek
     om de omtrek, met dezelfde hoekvolgorde als het beeld ervoor). De pagina zet de
     winkel van JOUWMERK en de telefoonfoto met een matrix3d precies op die vier punten.
  3. Het scherm doorzichtig maken. De alfa wordt gemeten tegen de helderheid van DAT
     scherm in DAT beeld: als de klep dichtgaat wordt het witte scherm in de video grijs
     (van 255 naar 159 bij beeld 41), en met een vaste drempel lag dat grijs als een waas
     over de winkel. Dat was het grijs dat Lucas zag (25 oktober, 13:07).
  4. Het donker per beeld: d = 1 − r^1,6, met r de hoogte van het laptopscherm ten
     opzichte van beeld 17. Lucas: "niet grijs maar echt langzaam donkergrijs naar een
     zwarte kleur als een echte laptop dichtklapt." De pagina legt een laag inkt met die
     dekking op de winkel: beeld 25 6 %, 33 42 %, 37 67 %, 41 88 %.
  5. Beeld 42 – 46: daar is het scherm een reepje dat niet meer als gat te vinden is. Per
     kolom onder de bovenrand van de klep gevonden, per regel doorgetrokken langs de
     vingers, en naar inkt getrokken (rand en scherm samen, zoals bij een echte laptop).
  6. Uitsnijden (x 0 – 1681, y 110 – 992: beide armen gaan via de zijkant het beeld uit,
     de onderste rij is wit) en verkleinen naar 1600 × 840.
Beeld 133 is het eerste helemaal witte beeld; daar houdt de reeks op. Beeld 0 – 16 staan
stil (de still dekt ze), dus de pagina laadt 17 – 133.

UIT: <werkmap>/png/NNN.png (RGBA), <werkmap>/still.png (2400 breed, RGBA) en
src/data/openingSchermen.json (de hoeken in 1600-ruimte, 2,5 px ruimer zodat er nooit een
licht randje langs het scherm komt, en het donker per beeld).
"""
import json, os, subprocess, sys, tempfile
import cv2
import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
VIDEO, STILL = sys.argv[1], sys.argv[2]
WERK = sys.argv[3] if len(sys.argv) > 3 else os.path.join(tempfile.gettempdir(), 'opening-reeks')
os.makedirs(os.path.join(WERK, 'png'), exist_ok=True)

X0, Y0, X1, Y1 = 0, 110, 1681, 992
BW = 1600
K = BW / (X1 - X0)
BH = round((Y1 - Y0) * K)          # 840
N = 134                            # beeld 0 – 133
INKT = np.array([11, 15, 23], float)

# ── de beelden uit de video ──────────────────────────────────────────────
BRON = os.path.join(WERK, 'bron')
os.makedirs(BRON, exist_ok=True)
if not os.path.exists(os.path.join(BRON, f'{N:03d}.png')):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', VIDEO, os.path.join(BRON, '%03d.png')], check=True)


def schermvlakken(g, T=150):
    """Wit dat door de rand van een apparaat is ingesloten: alles wat een vloedvulling
    vanaf de rand van het beeld niet bereikt."""
    wit = (g > T).astype(np.uint8)
    h, w = wit.shape
    ff = wit.copy()
    m = np.zeros((h + 2, w + 2), np.uint8)
    for x in range(0, w, 40):
        for y in (0, h - 1):
            if ff[y, x] == 1: cv2.floodFill(ff, m, (x, y), 2)
    for y in range(0, h, 40):
        for x in (0, w - 1):
            if ff[y, x] == 1: cv2.floodFill(ff, m, (x, y), 2)
    binnen = (ff == 1).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(binnen, 8)
    return [(int(st[i, cv2.CC_STAT_AREA]), (lab == i).astype(np.uint8), cen[i]) for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 1500]


def omtrek(mask):
    cs, _ = cv2.findContours(mask * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    return max(cs, key=cv2.contourArea).reshape(-1, 2).astype(float)


def laptop_quad(mask):
    p = omtrek(mask)
    s = p[:, 0] + p[:, 1]
    d = p[:, 0] - p[:, 1]
    tl, tr, bl = p[np.argmin(s)], p[np.argmax(d)], p[np.argmin(d)]
    br = np.array([tr[0] - (bl[0] - tl[0]), bl[1] + (tr[1] - tl[1])])
    return [tl, tr, br, bl]


def telefoon_quad(mask, vorige):
    box = cv2.boxPoints(cv2.minAreaRect(omtrek(mask).astype(np.float32)))
    if vorige is None:
        s = box[:, 0] + box[:, 1]
        d = box[:, 0] - box[:, 1]
        return [box[np.argmin(s)], box[np.argmax(d)], box[np.argmax(s)], box[np.argmin(d)]]
    beste = None
    for kant in (box, box[::-1]):
        for r in range(4):
            q = np.roll(kant, -r, axis=0)
            afstand = np.abs(q - np.array(vorige)).sum()
            if beste is None or afstand < beste[0]: beste = (afstand, q)
    return list(beste[1])


def naar_reeks(q):
    return [[(float(x) - X0) * K, (float(y) - Y0) * K] for x, y in q]


def ruimer(q, e=2.5):
    """2,5 px ruimer dan het gat (in 1600-ruimte): de rand van het apparaat dekt de
    winkel dan altijd af, en er komt nooit een licht randje langs het scherm."""
    if q is None: return None
    cx = sum(p[0] for p in q) / 4
    cy = sum(p[1] for p in q) / 4
    uit = []
    for x, y in q:
        dx, dy = x - cx, y - cy
        n = max(1e-6, (dx * dx + dy * dy) ** .5)
        uit.append([round(x + dx / n * e, 1), round(y + dy / n * e, 1)])
    return uit


def reepje(g):
    """Beeld 42 – 46: het scherm onder de bovenrand van de klep, per kolom."""
    m = np.zeros_like(g, dtype=np.float32)
    ys, ye = 600, 800
    for x in range(420, 1460):
        col = g[ys:ye, x].astype(int)
        dk = np.where(col < 100)[0]
        if len(dk) == 0 or dk[0] < 8: continue
        a = dk[0]
        if col[:a - 6].min() < 180: continue          # boven de klep moet wit staan (anders: hand of telefoon)
        k = a
        while k < len(col) and 20 < col[k] <= 200: k += 1
        if k - a < 3: continue
        vlak = np.median(col[a:k])
        while k - 1 > a and col[k - 1] > vlak + 15: k -= 1   # het lichte randje van de onderkant blijft
        m[ys + a: ys + k, x] = 1
        m[ys + a - 1, x] = 0.5
    gi = g.astype(int)
    for y in range(ys, ye):                            # langs de vingers: per regel doortrekken over hetzelfde grijs
        xs = np.where(m[y] >= 1)[0]
        if len(xs) < 20: continue
        for kant, x0 in ((1, xs.max()), (-1, xs.min())):
            v = int(np.median(gi[y, x0 - 12: x0] if kant == 1 else gi[y, x0 + 1: x0 + 13]))
            x = x0 + kant
            while 300 < x < 1500 and abs(gi[y, x] - v) <= 18:
                m[y, x] = 1
                x += kant
    dicht = cv2.morphologyEx((m >= 1).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((1, 25), np.uint8))
    m = np.maximum(m, (dicht * (g < 238)).astype(np.float32))
    return cv2.GaussianBlur(m, (3, 3), 0)


def gaten(g, bgr_vlakken, quads):
    """De alfa van de schermen, gemeten tegen de helderheid van elk scherm zelf."""
    gat = np.zeros_like(g, dtype=np.float32)
    for soort, xmin, xmax in (('l', 0, 1250), ('f', 1150, 1900)):
        if quads[soort] is None: continue
        kand = [v for v in bgr_vlakken if xmin <= v[2][0] < xmax and v[0] > 20000]
        if not kand: continue
        a, m, c = max(kand, key=lambda v: v[0])
        m = cv2.dilate(m, np.ones((3, 3), np.uint8))
        binnen = cv2.erode(m, np.ones((7, 7), np.uint8)) > 0
        med = float(np.median(g[binnen])) if binnen.any() else 255.0
        licht = np.clip((g.astype(float) - 70) / max(30.0, (med - 12) - 70), 0, 1)
        gat = np.maximum(gat, m * licht)
    return gat


# ── de reeks ─────────────────────────────────────────────────────────────
beelden = []
vorige_fon = None
for i in range(N):
    bgr = cv2.imread(os.path.join(BRON, f'{i + 1:03d}.png'))
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    vl = schermvlakken(g)
    lap = [v for v in vl if v[2][0] < 1250 and v[0] > 20000]
    fon = [v for v in vl if 1150 <= v[2][0] < 1900 and v[0] > 20000]
    q = {'l': None, 'f': None}
    if lap:
        q['l'] = naar_reeks(laptop_quad(max(lap, key=lambda v: v[0])[1]))
    if fon:
        vorige_fon = telefoon_quad(max(fon, key=lambda v: v[0])[1], vorige_fon)
        q['f'] = naar_reeks(vorige_fon)
    beelden.append(q)

    alfa = 1 - gaten(g, vl, q)
    rgb = bgr[..., ::-1].astype(float)
    if 42 <= i <= 46:
        r = reepje(g)[..., None]
        rgb = rgb * (1 - r) + (INKT + (rgb - INKT) * 0.1) * r
    buiten = (alfa >= 1)[..., None]
    rgb = np.where(buiten & (rgb >= 248), 255, rgb)    # wit trekken: geen rand om het beeld
    rgba = np.dstack([rgb, alfa * 255]).clip(0, 255).astype(np.uint8)
    klein = cv2.resize(rgba[Y0:Y1, X0:X1], (BW, BH), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(WERK, 'png', f'{i:03d}.png'), cv2.cvtColor(klein, cv2.COLOR_RGBA2BGRA))

h0 = beelden[17]['l'][3][1] - beelden[17]['l'][0][1]
donker = []
for i, q in enumerate(beelden):
    if i <= 17: donker.append(0)
    elif q['l'] is None: donker.append(1)
    else: donker.append(round(1 - max(0.0, (q['l'][3][1] - q['l'][0][1]) / h0) ** 1.6, 3))

# ── de still: beeld 0 op 2×, dezelfde uitsnede, de schermen doorzichtig ──
st = cv2.imread(STILL)
gs = cv2.cvtColor(st, cv2.COLOR_BGR2GRAY)
sch = st.shape[1] / 1920
vl = schermvlakken(gs)
gat = np.zeros_like(gs, dtype=np.float32)
for xmin, xmax in ((0, 1250 * sch), (1150 * sch, 1900 * sch)):
    kand = [v for v in vl if xmin <= v[2][0] < xmax and v[0] > 20000 * sch * sch]
    if kand:
        m = cv2.dilate(max(kand, key=lambda v: v[0])[1], np.ones((5, 5), np.uint8))
        licht = np.clip((gs.astype(float) - 70) / (243 - 70), 0, 1)
        gat = np.maximum(gat, m * licht)
srgb = st[..., ::-1].astype(float)
sbuiten = (gat == 0)[..., None]
srgb = np.where(sbuiten & (srgb >= 248), 255, srgb)
srgba = np.dstack([srgb, (1 - gat) * 255]).clip(0, 255).astype(np.uint8)
sx0, sy0, sx1, sy1 = [round(v * sch) for v in (X0, Y0, X1, Y1)]
still = cv2.resize(srgba[sy0:sy1, sx0:sx1], (2400, round((sy1 - sy0) * 2400 / (sx1 - sx0))), interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(WERK, 'still.png'), cv2.cvtColor(still, cv2.COLOR_RGBA2BGRA))

data = {
    'bron': 'scripts/opening-reeks.py, 25 oktober 2026',
    'w': BW, 'h': BH, 'eerste': 17, 'laatste': N - 1,
    'b': [[ruimer(q['l']), ruimer(q['f'])] for q in beelden],
    'd': donker,
}
with open(os.path.join(REPO, 'src', 'data', 'openingSchermen.json'), 'w') as f:
    json.dump(data, f, separators=(',', ':'))
print('klaar:', N, 'beelden, laptop tot', max(i for i, q in enumerate(beelden) if q['l']), ', telefoon tot', max(i for i, q in enumerate(beelden) if q['f']), ', still', still.shape[1], '×', still.shape[0])
