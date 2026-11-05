"""VISUAILS — de schermen van de laptopvideo meten, per beeld (levering 84, 2 november 2026).

    python3 scripts/laptop-video-na.py <werkmap>

Na scripts/laptop-video.py (de werkmap met kleur/ en dekking/). Schrijft src/data/laptopVideo.json: per beeld de
vier hoeken van het laptopscherm en van het telefoonscherm, in breukdelen van de breedte en de hoogte.

WAAROM OPNIEUW (levering 84). Lucas, 2 november: "ook zitten de beelden er niet goed in en gaan ze tijdens de
animatie verkeerd vervormen". Nagemeten (kladblok/LEVERING-84.md): de oude hoeken waren over 7 beelden glad
gemaakt en vanaf beeld 40 doorgetrokken; het telefoonscherm was 11 × 15 beeldpunten te klein; het gat (de derde
band) miste bij de bijna dichte klep tot 76 000 beeldpunten, waar de grond door het scherm scheen; en toen de
telefoon het beeld uit ging, lag het gat deels naast de telefoon en bleef een strook van zijn scherm leeg.

HOE NU
1. **Het scherm is wat het toestel omsluit.** Uit de dekking: alles wat doorzichtig is en niet vastzit aan de
   boven-, linker- of onderrand (rechts gaat de telefoon uit beeld). Dat is het scherm, ook als het in de bron
   donker werd (de klep bijna dicht), en nooit de grond ernaast. Met de zachte rand: 1 − dekking.
2. **Vier rechte lijnen, op een tiende beeldpunt.** Per rij en per kolom het punt waar de rand de helft is
   (tussen twee pixels in gerekend), dan per zijde een rechte lijn (twee keer passen, de uitschieters eruit). De
   afgeronde hoeken tellen niet mee, en bij de telefoon de inkeping niet (de bovenrand alleen naast de inkeping).
   De hoeken zijn waar de lijnen elkaar snijden. Niet glad over de tijd: elk beeld is zijn eigen meting, zodat het
   beeld op het scherm blijft liggen waar het scherm in die video-opname echt is.
3. **De telefoon is stijf.** Eén vorm (het gemiddelde van de eerste beelden, waarin hij stilstaat), per beeld
   alleen gedraaid en verschoven, zodat hij niet groter en kleiner wordt. Steekt hij rechts uit beeld, dan komt
   de draaiing uit de linkerrand en de plek uit de hoek linksboven; is er te weinig van hem over, dan rekent hij
   door met de snelheid van de laatste vier beelden, tot hij helemaal uit beeld is.
4. **De lege bovenkant.** De bovenste 206 rijen zijn in elk beeld leeg (de klep komt nooit hoger dan rij 211):
   'boven' in de json; scripts/laptop-video.mjs knipt ze eraf en het canvas begint daar. De hoeken blijven in
   breukdelen van het hele beeld.
5. **De klep dicht.** Ligt de bovenrand minder dan 2 beeldpunten boven de onderrand, dan is er geen scherm meer.
6. **De stilstaande foto** (public/img/hal/breed/laptop-3840.webp) op dezelfde manier: zijn gaten zijn 2 tot 3
   beeldpunten ruimer dan beeld 0 van de video ('stil' in de json; HalOpening80 zet de stilstaande schermen daarop).

De browser (src/scripts/laptopdoek.js) legt de winkel en de telefoonfoto op deze vierhoeken, 1,5 beeldpunt
ruimer, en toont ze waar de video niet dekt (1 − dekking): zo vult het scherm het hele gat en nooit de grond, en is
er geen derde band meer nodig.
"""
import sys, os, json
import numpy as np
import cv2

werk = sys.argv[1]
W, H, FPS = 2944, 1248, 24
N = len([f for f in os.listdir(f'{werk}/dekking') if f.endswith('.png')])
GRENS = int(W * 0.70)          # de laptop links, de telefoon rechts (ze bewegen uit elkaar)


def omsloten(a):
    """het scherm: doorzichtig en niet vast aan de boven-, linker- of onderrand, 2 beeldpunten ruimer, zacht (1 − a)"""
    n, lab = cv2.connectedComponents((a < 0.5).astype(np.uint8), connectivity=4)
    rand = set(np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0]]))) | {0}
    o = np.isin(lab, [k for k in range(1, n) if k not in rand]).astype(np.uint8)
    o = cv2.dilate(o, np.ones((5, 5), np.uint8)).astype(bool)
    return np.where(o, 1 - a, 0)


def rand(r, van_voren):
    """waar een rij (of kolom) de helft haalt, van buiten naar binnen, in beeldpunten (pixelmidden = k + 0,5)"""
    idx = np.nonzero(r >= 0.5)[0]
    if not len(idx): return None
    if van_voren:
        j = idx[0]
        if j == 0: return None
        a, b = r[j - 1], r[j]; return (j - 1) + (0.5 - a) / max(b - a, 1e-6) + 0.5
    j = idx[-1]
    if j >= len(r) - 1: return None
    a, b = r[j], r[j + 1]; return j + (a - 0.5) / max(a - b, 1e-6) + 0.5


def lijn(pt):
    """v = c · t + d door de randpunten, robuust; (c, d) of None"""
    if len(pt) < 6: return None
    ts, vs = (np.asarray(x, float) for x in zip(*pt))
    for _ in range(3):
        c, d = np.polyfit(ts, vs, 1)
        res = np.abs(vs - (c * ts + d))
        hou = res <= max(0.6, np.percentile(res, 80))
        if hou.all() or hou.sum() < 6: break
        ts, vs = ts[hou], vs[hou]
    return float(c), float(d)


def snij(xv, yh):
    """xv: x = a · y + b (een zijkant); yh: y = c · x + d (boven of onder)"""
    (a, b), (c, d) = xv, yh
    y = (c * b + d) / (1 - a * c)
    return [a * y + b, y]


def meet(g, telefoon, ref_breed=None):
    """de vier randen van een scherm (g: 0 – 1, alleen dit toestel)"""
    ys, xs = np.nonzero(g >= 0.5)
    if len(ys) < 200: return None
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    hoog, breed = max(y1 - y0, 1), max(x1 - x0, 1)
    rr = (0.10, 0.90) if telefoon else (0.04, 0.96)
    L, R = [], []
    for y in range(y0, y1 + 1):
        if not rr[0] < (y - y0) / hoog < rr[1]: continue
        l, r = rand(g[y], True), rand(g[y], False)
        if l is not None: L.append((y + 0.5, l))
        if r is not None: R.append((y + 0.5, r))
    if telefoon:
        bb = ref_breed if (ref_breed and x1 >= W - 2) else breed      # steekt hij uit beeld: de echte breedte
        f = lambda x: (x - x0) / bb
        kb = [x for x in range(x0, x1 + 1) if 0.14 < f(x) < 0.27 or 0.73 < f(x) < 0.86]   # naast de inkeping
        ko = [x for x in range(x0, x1 + 1) if 0.14 < f(x) < 0.86]
    else:
        kb = ko = [x for x in range(x0, x1 + 1) if 0.03 < (x - x0) / breed < 0.97]
    T = [(x + 0.5, t) for x in kb if (t := rand(g[:, x], True)) is not None]
    B = [(x + 0.5, b) for x in ko if (b := rand(g[:, x], False)) is not None]
    uit_beeld = x1 >= W - 2
    return {'l': lijn(L), 'r': None if uit_beeld else lijn(R), 't': lijn(T), 'b': lijn(B)}


schermen, soort, uit_beeld = [[None, None] for _ in range(N)], {}, {}
ref_fon = None
for i in range(N):
    a = cv2.imread(f'{werk}/dekking/{i:03d}.png', cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255
    g = omsloten(a)
    for s in (0, 1):
        z = np.zeros_like(g)
        if s == 0: z[:, :GRENS] = g[:, :GRENS]
        else: z[:, GRENS - 60:] = g[:, GRENS - 60:]
        n, lab, st, _ = cv2.connectedComponentsWithStats((z >= 0.5).astype(np.uint8), 8)
        if n < 2: continue
        k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        vlek = cv2.dilate((lab == k).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        m = meet(z * vlek, s == 1, None if ref_fon is None else float(ref_fon[1][0] - ref_fon[0][0]))
        if m is None: continue
        q = None
        if all(m[x] is not None for x in 'lrtb'):
            q = np.array([snij(m['l'], m['t']), snij(m['r'], m['t']), snij(m['r'], m['b']), snij(m['l'], m['b'])])
            soort[(i, s)] = 'gemeten'
            if s == 1: ref_fon = q
        elif s == 1 and ref_fon is not None and m['l'] is not None and m['t'] is not None:
            # uit beeld: de vorm van het laatste hele beeld, gedraaid naar de linkerrand, op de hoek linksboven
            lb = np.array(snij(m['l'], m['t']))
            q = lb + (ref_fon - ref_fon[0])          # voorlopig; hieronder in de vaste vorm, gedraaid
            uit_beeld[i] = (lb, float(np.arctan2(m['l'][0], 1.0)))
            soort[(i, s)] = 'uit beeld'
        if q is not None and s == 0 and q[3][1] - q[0][1] < 2.0: q = None          # de klep is dicht
        if q is not None: schermen[i][s] = q

# de telefoon stijf: één vorm, per beeld gedraaid en verschoven (Procrustes zonder schaal)
heel = [i for i in range(N) if soort.get((i, 1)) == 'gemeten']
REF = np.mean([schermen[i][1] for i in heel[:20]], 0)
for i in heel:
    Q = schermen[i][1]
    u, _, vt = np.linalg.svd((REF - REF.mean(0)).T @ (Q - Q.mean(0)))
    Rm = (u @ vt).T
    if np.linalg.det(Rm) > 0: schermen[i][1] = (REF - REF.mean(0)) @ Rm.T + Q.mean(0)
# uit beeld: de vaste vorm op de hoek linksboven, gedraaid naar de linkerrand
hoek_ref = np.arctan2(REF[3][0] - REF[0][0], REF[3][1] - REF[0][1])
for i, (lb, hoek) in uit_beeld.items():
    dt = hoek_ref - hoek
    Rm = np.array([[np.cos(dt), np.sin(dt)], [-np.sin(dt), np.cos(dt)]])
    schermen[i][1] = lb + (REF - REF[0]) @ Rm.T
# te weinig over om te meten: doorrekenen met de snelheid van de laatste vier beelden
laatst = max(i for i in range(N) if schermen[i][1] is not None)
q = np.array(schermen[laatst][1]); v = (q - np.array(schermen[laatst - 4][1])) / 4
for i in range(laatst + 1, N):
    q = q + v
    if q[:, 0].min() >= W: break
    schermen[i][1] = q
    soort[(i, 1)] = 'doorgerekend'

# De stilstaande foto (public/img/hal/breed/laptop-3840.webp, de laptop voordat de video speelt) heeft zijn eigen
# gaten, 2 tot 3 beeldpunten ruimer dan beeld 0 van de video: gemeten in levering 84, daar scheen de grond boven
# het scherm door. Dus ook die gemeten, op dezelfde manier; HalOpening80 zet de stilstaande schermen daarop.
stil = [None, None]
FOTO = 'public/img/hal/breed/laptop-3840.webp'
if os.path.exists(FOTO):
    from PIL import Image
    af = np.asarray(Image.open(FOTO).convert('RGBA'))[..., 3].astype(np.float32) / 255
    af = cv2.resize(af, (W, H), interpolation=cv2.INTER_AREA)
    gf = omsloten(af)
    for s in (0, 1):
        z = np.zeros_like(gf)
        if s == 0: z[:, :GRENS] = gf[:, :GRENS]
        else: z[:, GRENS - 60:] = gf[:, GRENS - 60:]
        m = meet(z, s == 1)
        if m and all(m[x] is not None for x in 'lrtb'):
            stil[s] = np.array([snij(m['l'], m['t']), snij(m['r'], m['t']), snij(m['r'], m['b']), snij(m['l'], m['b'])])

nr = lambda q: None if q is None else [[round(float(x) / W, 5), round(float(y) / H, 5)] for x, y in q]
uit = {'bron': 'kladblok/levering-80/21_9_laptop.mp4 (Lucas, 1 november 2026); scripts/laptop-video.py en -na.py (levering 84)',
       'b': W, 'h': H, 'boven': 206, 'fps': FPS, 'beelden': N, 'stil': [nr(stil[0]), nr(stil[1])], 'schermen': [[nr(s[0]), nr(s[1])] for s in schermen]}
json.dump(uit, open('src/data/laptopVideo.json', 'w'), separators=(',', ':'))
lap = [i for i in range(N) if schermen[i][0] is not None]
fon = [i for i in range(N) if schermen[i][1] is not None]
print(f'laptop beeld {lap[0]} – {lap[-1]} · telefoon beeld {fon[0]} – {fon[-1]} '
      f'({sum(1 for k, v in soort.items() if k[1] == 1 and v != "gemeten")} uit beeld of doorgerekend) · {N} beelden')
