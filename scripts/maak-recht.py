"""
VISUAILS — stap 2 "Wij maken": rechtzetten, opbouwen en nakijken (voorpagina).
15 oktober 2026.

Lucas om 11:59: "De generatie animatie mag wel iets interessanter en mooier ogen.
Steek hier wat meer moeite in. Ook mag de controle animatie wel wat mooier en
interessanter dan dit." En eerder (afvinklijst 24): het mag niet voelen als een
AI-tool, het is handwerk. Dus geen ruis die oplost, maar drie handelingen:

  1 RECHTZETTEN  Een transformatiekader met acht grepen om de broek op je
                 telefoonfoto. De muis pakt de greep rechtsonder en de foto kantelt,
                 draait en rekt tot de broek recht staat: precies op de plek van het
                 geleverde beeld. Gemeten, niet gegokt: de homografie tussen je foto
                 en het geleverde beeld (vier hoeken van de broek, daarna verfijnd op
                 de omtrek: IoU 0,94), uitgedrukt als een CSS-transform.
  2 OPBOUWEN     Het penseel (een ring zo groot als de kwast, met een zachte rand)
                 werkt de rechtgezette foto over tot het geleverde beeld.
  3 NAKIJKEN     Een loep die echt vergroot (2x) langs de knoop, het stiksel van de zak
                 en de kleur. In de loep eerst je foto op die plek, dan schuift er een
                 scheidslijn over en staat ons beeld er: zelfde plek, zelfde detail.
                 Een vinkje per punt.

Dit script schrijft:
  public/img/ba2-voor-front-recht.webp   je foto, rechtgezet in de ruimte van het
                                         geleverde beeld (760 x 760): de loep leest hem
  src/data/maakRecht.js                  de vormen voor de markup (VoorpaginaHal.astro)
  src/styles/maak-recht.css              de keyframes en de tijden van 0 tot 4,25 s

Daarna `npm run avif` voor de AVIF naast de webp.

    python scripts/maak-recht.py        (numpy, opencv, pillow, scipy)

WAAROM GEEN matrix3d(). De vergroting van het vak verschilt per breedte (216 px op
1440, 123 px op 320). matrix3d() rekent in pixels en zou per breedte anders moeten
zijn. Deze transform rekent in procenten van de laag en in cqw van het vierkante vak
(container-type: size), en klopt dus op elke breedte. En hij is een rij losse
functies (translate, rotate, skewX, scale, perspective, rotateX, rotateY), zodat elke
browser hem functie voor functie overvloeit: de banen van de grepen hieronder zijn
daardoor uit te rekenen in plaats van te schatten.
"""
import json, math, os
import numpy as np, cv2
from PIL import Image
from scipy.optimize import least_squares

HIER = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HIER, '..')
IMG = os.path.join(ROOT, 'public', 'img')
MAAT = 760

voor = cv2.imread(os.path.join(IMG, 'ba2-voor-front.webp'))           # 760 x 1013, je telefoonfoto
na = cv2.imread(os.path.join(IMG, 'ba2-na-front.webp'))               # 760 x 760, het geleverde beeld
uit = np.asarray(Image.open(os.path.join(IMG, 'ba2-na-front-uitgeknipt.webp')))[..., 3]
FH, FW = voor.shape[:2]

# ── 1 · DE BROEK OP BEIDE FOTO'S ────────────────────────────────────────────
hsv = cv2.cvtColor(voor, cv2.COLOR_BGR2HSV)
h, s, v = cv2.split(hsv)
m_voor = (((h >= 150) | (h <= 12)) & (s > 38) & (v > 90)).astype(np.uint8) * 255
m_voor = cv2.morphologyEx(m_voor, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
m_voor = cv2.morphologyEx(m_voor, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(m_voor)
m_voor = ((lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])) * 255).astype(np.uint8)
m_na = (uit > 128).astype(np.uint8) * 255

def hoeken(m):
    """Linksboven, rechtsboven, rechtsonder, linksonder van de omhullende."""
    c = max(cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)[:, 0, :].astype(float)
    hull = cv2.convexHull(c.astype(np.float32))[:, 0, :]
    ap = cv2.approxPolyDP(hull, 0.02 * cv2.arcLength(hull, True), True)[:, 0, :].astype(float)
    return ap

# De vier hoeken van de broek: tailleband links en rechts, zoom buiten links en rechts.
# Op de foto ligt hij schuin; daarom per hoek het punt dat het verst in die richting ligt.
def vier(m, richtingen):
    ys, xs = np.nonzero(m)
    P = np.stack([xs, ys], 1).astype(float)
    return np.array([P[np.argmax(P @ np.array(r))] for r in richtingen])

H_VOOR = vier(m_voor, [(-0.15, -1), (1, -0.35), (0.45, 1), (-1, 0.4)])
H_NA = vier(m_na, [(-0.3, -1), (0.3, -1), (0.3, 1), (-0.3, 1)])
H = cv2.getPerspectiveTransform(H_VOOR.astype(np.float32), H_NA.astype(np.float32))
iou = lambda a, b: ((a > 0) & (b > 0)).sum() / ((a > 0) | (b > 0)).sum()
iou4 = iou(cv2.warpPerspective(m_voor, H, (MAAT, MAAT)), m_na)
try:
    _, Hr = cv2.findTransformECC(m_na.astype(np.float32) / 255, cv2.GaussianBlur(cv2.warpPerspective(m_voor, H, (MAAT, MAAT)), (21, 21), 0).astype(np.float32) / 255,
                                 np.eye(3, dtype=np.float32), cv2.MOTION_HOMOGRAPHY, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
    H2 = np.linalg.inv(Hr) @ H
    H2 /= H2[2, 2]
    if iou(cv2.warpPerspective(m_voor, H2, (MAAT, MAAT)), m_na) > iou4:
        H = H2
except cv2.error:
    pass
H /= H[2, 2]
IOU = iou(cv2.warpPerspective(m_voor, H, (MAAT, MAAT)), m_na)
print(f'homografie: IoU van de omtrek {iou4:.3f} op vier hoeken, {IOU:.3f} verfijnd')

# ── 2 · JE FOTO RECHTGEZET, VOOR DE LOEP ────────────────────────────────────
recht = cv2.warpPerspective(voor, H, (MAAT, MAAT), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
# (wordt na stap 7 bewaard: alleen wat de loep ooit laat zien, de rest wit)

# ── 3 · DE CSS-TRANSFORM ────────────────────────────────────────────────────
# De laag met je foto staat zoals altijd: passend (contain) in het vierkant, dus
# 570 x 760 eenheden, 95 eenheden van links. Lokaal punt u (eenheden) = foto-px * 0,75.
S0 = MAAT / FH
LW, LH, OX = FW * S0, MAAT, (MAAT - FW * S0) / 2

def css_kaart(par, p, voortgang=1.0):
    """Waar foto-punt p staat bij `voortgang` (0 = begin, 1 = rechtgezet).
    par = (tx, ty, rot, skew, sx, sy, D, phi, theta), hoeken in radialen, D in eenheden."""
    tx, ty, rot, skew, sx, sy, D, ph, th = par
    k = voortgang
    x, y = p[:, 0] * S0, p[:, 1] * S0
    th, ph = th * k, ph * k
    X = x * np.cos(th); Y = y; Z = -x * np.sin(th)                    # rotateY
    Y2 = Y * np.cos(ph) - Z * np.sin(ph); Z2 = Y * np.sin(ph) + Z * np.cos(ph)  # rotateX
    w = 1 - Z2 / D                                                      # perspective(D)
    X, Y = X / w, Y2 / w
    X, Y = X * (1 + k * (sx - 1)), Y * (1 + k * (sy - 1))              # scale
    X = X + np.tan(skew * k) * Y                                        # skewX
    c, s_ = np.cos(rot * k), np.sin(rot * k)
    X, Y = c * X - s_ * Y, s_ * X + c * Y                               # rotate
    return np.c_[X + k * tx + OX, Y + k * ty]                           # translate

ys, xs = np.nonzero(m_voor[::6, ::6])
P = np.r_[np.stack([xs * 6, ys * 6], 1).astype(float), np.array([[x, y] for x in np.linspace(0, FW, 9) for y in np.linspace(0, FH, 11)])]
gew = np.r_[np.full(len(xs), 3.0), np.ones(99)]
def Hk(p):
    q = np.c_[p, np.ones(len(p))] @ H.T
    return q[:, :2] / q[:, 2:]
Q = Hk(P)
def rest(par):
    return np.r_[((css_kaart(par, P) - Q) * gew[:, None]).ravel(), 40 * par[7], 40 * par[8], 20 * par[3]]
fit = None
for r0 in (-0.3, 0, 0.3):
    for p0 in (-0.4, 0, 0.4):
        f = least_squares(rest, [-300, -260, r0, 0.1, 1.6, 2.6, 900, p0, 0.0],
                          bounds=([-2000, -2000, -1.6, -0.9, 0.3, 0.3, 300, -1.2, -1.2], [2000, 2000, 1.6, 0.9, 6, 6, 40000, 1.2, 1.2]))
        if fit is None or f.cost < fit.cost:
            fit = f
PAR = fit.x
FOUT = float(np.max(np.linalg.norm(css_kaart(PAR, P[:len(xs)]) - Q[:len(xs)], axis=1)))
print(f'css-transform: hoogstens {FOUT:.2f} eenheden naast de homografie (op 760)')
tx, ty, rot, skew, sx, sy, D, ph, th = PAR
f4 = lambda v: f'{v:.4f}'.rstrip('0').rstrip('.')
RECHT_NAAR = (f'translate({f4(tx / LW * 100)}%, {f4(ty / LH * 100)}%) rotate({f4(math.degrees(rot))}deg) skewX({f4(math.degrees(skew))}deg) '
              f'scale({f4(sx)}, {f4(sy)}) perspective({f4(D / MAAT * 100)}cqw) rotateX({f4(math.degrees(ph))}deg) rotateY({f4(math.degrees(th))}deg)')
RECHT_VAN = f'translate(0%, 0%) rotate(0deg) skewX(0deg) scale(1, 1) perspective({f4(D / MAAT * 100)}cqw) rotateX(0deg) rotateY(0deg)'

# ── 4 · DE TIJDLIJN (seconden vanaf het begin van stap 2) ───────────────────
T = dict(
    foto_in=0.0, label_in=0.05,
    kader_van=0.15, kader_tot=0.5,          # het kader trekt zich om de broek
    grepen_van=0.25,                        # de acht grepen, 35 ms na elkaar
    muis_in=0.38, druk=0.55,                # de muis pakt de greep rechtsonder
    recht_van=0.6, recht_tot=1.3,           # rechtzetten
    los=1.3, los_tot=1.48,                  # loslaten, kader weg
    kwast_van=1.45, kwast_tot=2.35,         # opbouwen met het penseel
    begin=2.3,                              # het geleverde beeld dekt alles
    loep_van=2.4, loep_tot=4.25,            # nakijken
    label_uit=4.25,
)
EASE_RECHT = (.65, 0, .3, 1)
def bezier(x1, y1, x2, y2):
    def f(t):
        lo, hi = 0.0, 1.0
        for _ in range(60):
            m = (lo + hi) / 2
            x = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3
            lo, hi = (m, hi) if x < t else (lo, m)
        s_ = (lo + hi) / 2
        return 3 * (1 - s_) ** 2 * s_ * y1 + 3 * (1 - s_) * s_ * s_ * y2 + s_ ** 3
    return f
E = bezier(*EASE_RECHT)

# ── 5 · HET KADER EN DE GREPEN ──────────────────────────────────────────────
# Een rechthoek om de broek in het geleverde beeld (dat is waar hij uitkomt), terug
# naar je foto gerekend: op je foto een schuin vierkant om de schuine broek.
ysn, xsn = np.nonzero(m_na)
X0, X1, Y0, Y1 = int(xsn.min()) - 18, int(xsn.max()) + 18, int(ysn.min()) - 18, int(ysn.max()) + 18
MX, MY = (X0 + X1) / 2, (Y0 + Y1) / 2
DOEL = np.array([(X0, Y0), (MX, Y0), (X1, Y0), (X1, MY), (X1, Y1), (MX, Y1), (X0, Y1), (X0, MY)], float)
Hi = np.linalg.inv(H)
q = np.c_[DOEL, np.ones(8)] @ Hi.T
FOTO_PT = q[:, :2] / q[:, 2:]
N = 16
BANEN = [css_kaart(PAR, FOTO_PT, E(k / N)) for k in range(N + 1)]  # per stap 8 punten
r1 = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')
def kader_d(pts):
    hk = pts[[0, 2, 4, 6]]
    return 'M' + ' L'.join(f'{r1(x)} {r1(y)}' for x, y in hk) + ' Z'
KADER_START = kader_d(BANEN[0])

# ── 6 · HET PENSEEL ─────────────────────────────────────────────────────────
# Vijf halen van boven naar beneden, met een ronde keer buiten het beeld en een
# lichte golf erin: een hand, geen machine. Breed genoeg (250) en met een zachte rand
# om samen het hele vlak te dekken; daarna dekt het geleverde beeld de laatste naden.
# De keer blijft binnen x 60–700, zodat de ring (r 105) nauwelijks buiten het vak
# komt; wat er toch buiten valt, knipt de markup af op het vierkant.
VEEG = ('M90 95 C260 70 470 120 670 95 C700 95 700 245 670 245 C470 270 280 220 90 245 C60 245 60 395 90 395 '
        'C280 370 470 420 670 395 C700 395 700 545 670 545 C470 570 280 520 90 545 C60 545 60 695 90 695 C280 670 470 720 670 695')
KWAST_R = 105

# ── 7 · DE LOEP ─────────────────────────────────────────────────────────────
LOEP_R, LOEP_M = 130, 2.0
# De knoop, het stiksel van de linkerzak en de kleur op de rechterpijp, gemeten op
# ba2-na-front.webp. Op die drie plekken ligt je rechtgezette foto binnen enkele
# eenheden op het geleverde beeld (template matching). De kleur van je foto en van
# ons beeld op de derde plek staat hieronder gemeten (bij het draaien): #DCB4B9 en
# #E2BFBD, voor het oog dezelfde roze.
STOPS = [(383, 88), (262, 125), (480, 300)]

# Alleen wat de loep laat zien (langs zijn weg, met marge); de rest wit. Een <image>
# in een svg laadt niet lui, dus elke kilobyte telt op de voorpagina.
zicht = np.zeros((MAAT, MAAT), np.uint8)
cv2.polylines(zicht, [np.array(STOPS, np.int32).reshape(-1, 1, 2)], False, 255, thickness=int(2 * (LOEP_R / LOEP_M + 30)))
zicht = cv2.GaussianBlur(zicht, (0, 0), 6).astype(np.float32)[..., None] / 255
bewaar = (recht.astype(np.float32) * zicht + 255 * (1 - zicht)).astype(np.uint8)
Image.fromarray(cv2.cvtColor(bewaar, cv2.COLOR_BGR2RGB)).save(os.path.join(IMG, 'ba2-voor-front-recht.webp'), quality=78, method=6)

def kleur(img, x, y, r=14):
    c = img[y - r:y + r, x - r:x + r].reshape(-1, 3).mean(0)
    return '#%02X%02X%02X' % (int(c[2]), int(c[1]), int(c[0]))
for (x, y) in STOPS:
    print(f'plek {x},{y}: je foto {kleur(recht, x, y)}, ons beeld {kleur(na, x, y)}')

# ── 8 · DE CSS ──────────────────────────────────────────────────────────────
PRE = '.hal .h-hoe.u-s2:not([data-uitleg-staat="klaar"])'
css = []
def kf(naam, stappen):
    css.append(f'@keyframes {naam} {{\n' + '\n'.join(f'  {pct} {{ {decl} }}' for pct, decl in stappen) + '\n}')
def pct(t, van, tot):
    return f'{(t - van) / (tot - van) * 100:.2f}'.rstrip('0').rstrip('.') + '%'
def regel(sel, decl):
    css.append(f'{PRE} {sel} {{ {decl} }}')

dur = T['recht_tot'] - T['recht_van']
kf('h-maak-recht', [('0%', f'transform: {RECHT_VAN};'), ('100%', f'transform: {RECHT_NAAR};')])
# kader: de vorm (d) volgt de grepen; trekken; weg na het loslaten
kf('h-maak-kader-d', [(f'{k / N * 100:.2f}'.rstrip('0').rstrip('.') + '%', f"d: path('{kader_d(BANEN[k])}');") for k in range(N + 1)])
regel('.h-maak-kader', f'animation: h-maak-kader-d {dur:.2f}s linear {T["recht_van"]}s both, h-maak-trek {T["kader_tot"] - T["kader_van"]:.2f}s var(--h-zacht) {T["kader_van"]}s both, h-maak-even {T["los_tot"] - T["kader_van"]:.2f}s linear {T["kader_van"]}s both;')
for i in range(8):
    kf(f'h-maak-greep-{i}', [(f'{k / N * 100:.2f}'.rstrip('0').rstrip('.') + '%', f'transform: translate({r1(BANEN[k][i][0])}px, {r1(BANEN[k][i][1])}px);') for k in range(N + 1)])
    regel(f'.h-maak-greep:nth-child({i + 1})', f'animation: h-maak-greep-{i} {dur:.2f}s linear {T["recht_van"]}s both;')
    regel(f'.h-maak-greep:nth-child({i + 1}) rect', f'animation: h-maak-anker .28s var(--h-veer) {T["grepen_van"] + i * 0.035:.3f}s both, h-maak-weg .18s ease {T["los"] + 0.05:.2f}s forwards;')
regel('.h-maak-greep:nth-child(5) rect', f'animation: h-maak-anker .28s var(--h-veer) {T["grepen_van"] + 4 * 0.035:.3f}s both, h-maak-gepakt .12s ease {T["druk"]}s both, h-maak-weg .18s ease {T["los"] + 0.05:.2f}s forwards;')
# de muis: komt aan, pakt de greep rechtsonder, sleept mee, laat los
mv, mt = T['muis_in'], T['los_tot']
br0, br1 = BANEN[0][4], BANEN[N][4]
stappen = [('0%', f'opacity: 0; transform: translate({r1(br0[0] + 70)}px, {r1(br0[1] + 80)}px);'),
           (pct(T['druk'], mv, mt), f'opacity: 1; transform: translate({r1(br0[0])}px, {r1(br0[1])}px);'),
           (pct(T['druk'] + 0.03, mv, mt), f'opacity: 1; transform: translate({r1(br0[0])}px, {r1(br0[1])}px) scale(.88);')]
for k in range(N + 1):
    t = T['recht_van'] + k / N * dur
    stappen.append((pct(t, mv, mt), f'opacity: 1; transform: translate({r1(BANEN[k][4][0])}px, {r1(BANEN[k][4][1])}px) scale(.88);'))
stappen += [(pct(T['los'] + 0.04, mv, mt), f'opacity: 1; transform: translate({r1(br1[0])}px, {r1(br1[1])}px);'),
            ('100%', f'opacity: 0; transform: translate({r1(br1[0] + 50)}px, {r1(br1[1] + 60)}px);')]
kf('h-maak-muis', stappen)
regel('.h-maak-muis', f'animation: h-maak-muis {mt - mv:.2f}s linear {mv}s both;')
# het penseel
kd = T['kwast_tot'] - T['kwast_van']
regel('.h-maak-veeg', f'animation: h-maak-trek {kd:.2f}s cubic-bezier(.4, 0, .6, 1) {T["kwast_van"]}s both;')
regel('.h-maak-bouwkwast', f'animation: h-maak-loop {kd:.2f}s cubic-bezier(.4, 0, .6, 1) {T["kwast_van"]}s both, h-maak-even {kd + 0.15:.2f}s linear {T["kwast_van"] - 0.05:.2f}s both;')
regel('.h-maak-laag', f'animation: h-maak-recht {dur:.2f}s cubic-bezier({", ".join(map(str, EASE_RECHT))}) {T["recht_van"]}s both, h-maak-tot {T["begin"] + 0.12:.2f}s linear 0s both;')
# de loep: plaats, inhoud, gordijn, scheidslijn en vinkje per stop
lv, lt = T['loep_van'], T['loep_tot']
# per stop: aankomst a, veeg van a+.05 tot a+.30, vinkje op a+.27, vertrek a+.37
A = [lv + 0.15, lv + 0.74, lv + 1.33]
VERTREK = [a + 0.37 for a in A]
def plek(i):
    return STOPS[i]
loep, binnen, gordijn, deler, vink = [], [], [], [], []
def add(lst, t, decl):
    lst.append((pct(t, lv, lt), decl))
x, y = plek(0)
add(loep, lv, f'opacity: 0; transform: translate({x}px, {y}px) scale(.6);')
add(binnen, lv, f'transform: translate({-LOEP_M * x}px, {-LOEP_M * y}px) scale({LOEP_M});')
add(gordijn, lv, 'transform: translateX(0);')
add(deler, lv, 'opacity: 0; transform: translateX(0);')
add(vink, lv, 'opacity: 0; transform: scale(.3);')
for i in range(3):
    x, y = plek(i)
    a, v = A[i], VERTREK[i]
    add(loep, a, f'opacity: 1; transform: translate({x}px, {y}px) scale(1);')
    add(binnen, a, f'transform: translate({-LOEP_M * x}px, {-LOEP_M * y}px) scale({LOEP_M});')
    if i < 2:
        add(loep, v, f'opacity: 1; transform: translate({x}px, {y}px) scale(1);')
        add(binnen, v, f'transform: translate({-LOEP_M * x}px, {-LOEP_M * y}px) scale({LOEP_M});')
    add(gordijn, a - 0.01, 'transform: translateX(0);')
    add(gordijn, a + 0.05, 'transform: translateX(0);')
    add(gordijn, a + 0.30, f'transform: translateX({2 * LOEP_R + 4}px);')
    if i < 2:
        add(gordijn, v, f'transform: translateX({2 * LOEP_R + 4}px);')
        add(gordijn, v + 0.01, 'transform: translateX(0);')
    add(deler, a + 0.02, 'opacity: 0; transform: translateX(0);')
    add(deler, a + 0.06, 'opacity: 1; transform: translateX(0);')
    add(deler, a + 0.29, f'opacity: 1; transform: translateX({2 * LOEP_R}px);')
    add(deler, a + 0.33, f'opacity: 0; transform: translateX({2 * LOEP_R}px);')
    add(vink, a + 0.24, 'opacity: 0; transform: scale(.3);')
    add(vink, a + 0.32, 'opacity: 1; transform: scale(1);')
    if i < 2:
        add(vink, v - 0.02, 'opacity: 1; transform: scale(1);')
        add(vink, v + 0.03, 'opacity: 0; transform: scale(1);')
    else:
        add(vink, lt - 0.12, 'opacity: 1; transform: scale(1);')
x, y = plek(2)
add(loep, lt - 0.12, f'opacity: 1; transform: translate({x}px, {y}px) scale(1);')
add(loep, lt, f'opacity: 0; transform: translate({x}px, {y}px) scale(.85);')
add(binnen, lt, f'transform: translate({-LOEP_M * x}px, {-LOEP_M * y}px) scale({LOEP_M});')
add(gordijn, lt, f'transform: translateX({2 * LOEP_R + 4}px);')
add(deler, lt, f'opacity: 0; transform: translateX({2 * LOEP_R}px);')
add(vink, lt, 'opacity: 0; transform: scale(1);')
def uniek(lst):
    uit, gezien = [], {}
    for p_, d_ in lst:
        gezien[p_] = d_
    return sorted(gezien.items(), key=lambda kv: float(kv[0][:-1]))
for naam, lst in [('h-maak-lp', loep), ('h-maak-lp-in', binnen), ('h-maak-lp-gordijn', gordijn), ('h-maak-lp-deler', deler), ('h-maak-lp-vink', vink)]:
    kf(naam, uniek(lst))
ld = lt - lv
regel('.h-maak-lp', f'animation: h-maak-lp {ld:.2f}s cubic-bezier(.5, 0, .3, 1) {lv}s both;')
regel('.h-maak-lp-in', f'animation: h-maak-lp-in {ld:.2f}s cubic-bezier(.5, 0, .3, 1) {lv}s both;')
regel('.h-maak-lp-gordijn', f'animation: h-maak-lp-gordijn {ld:.2f}s cubic-bezier(.45, 0, .35, 1) {lv}s both;')
regel('.h-maak-lp-deler', f'animation: h-maak-lp-deler {ld:.2f}s cubic-bezier(.45, 0, .35, 1) {lv}s both;')
regel('.h-maak-lp-vink', f'animation: h-maak-lp-vink {ld:.2f}s var(--h-veer) {lv}s both;')
# de drie punten onder "Nagekeken" en het vinkje ervoor
for j, a in enumerate(A):
    regel(f'.h-lagen-punten span:nth-child({j + 1})', f'animation: h-maak-punt .32s var(--h-veer) {a + 0.3:.2f}s both;')
regel('.h-lagen li:nth-child(1) i', f'animation-delay: {lt:.2f}s;')
# het label: drie woorden, op tijd gewisseld
LABEL = [(T['label_in'], T['kwast_van'] - 0.05), (T['kwast_van'] - 0.05, lv), (lv, T['label_uit'])]
regel('.h-maak-doe', f'animation: h-maak-even {T["label_uit"] + 0.15 - T["label_in"]:.2f}s linear {T["label_in"]}s both;')
for j, (van, tot) in enumerate(LABEL):
    regel(f'.h-maak-doe > span:nth-child({j + 1})', f'animation: h-maak-woord {tot - van:.2f}s linear {van:.2f}s both;')

kop = f"""/* GEGENEREERD door scripts/maak-recht.py — niet met de hand aanpassen.
   Stap 2 "Wij maken", 0 tot {T['loep_tot']} s: rechtzetten, opbouwen, nakijken.
   De homografie tussen je foto en het geleverde beeld: IoU {IOU:.3f}; de CSS-transform
   ligt er hoogstens {FOUT:.2f} eenheden (op 760) naast. Alle selectors onder .hal. */
"""
open(os.path.join(ROOT, 'src', 'styles', 'maak-recht.css'), 'w', encoding='utf-8').write(kop + '\n'.join(css) + '\n')

js = f"""// GEGENEREERD door scripts/maak-recht.py — niet met de hand aanpassen.
// Stap 2 "Wij maken": de vormen bij het rechtzetten, het penseel en de loep (760 x 760).
export const RECHT = {{ foto: '/img/ba2-voor-front-recht.webp', iou: {IOU:.3f} }};
/** Het kader om de broek op je foto (begin; de css laat het meebewegen). */
export const KADER = '{KADER_START}';
/** De acht grepen: hoeken en middens, in de volgorde van de css (h-maak-greep-0 … 7). */
export const GREPEN = {json.dumps([[round(float(x), 1), round(float(y), 1)] for x, y in BANEN[0]])};
export const VEEG = '{VEEG}';
export const KWAST_R = {KWAST_R};
export const LOEP = {{ r: {LOEP_R}, m: {LOEP_M}, stops: {json.dumps(STOPS)} }};
/** Seconden vanaf het begin van stap 2. */
export const TIJD = {json.dumps(T)};
"""
open(os.path.join(ROOT, 'src', 'data', 'maakRecht.js'), 'w', encoding='utf-8').write(js)
print('geschreven: public/img/ba2-voor-front-recht.webp, src/data/maakRecht.js, src/styles/maak-recht.css')
