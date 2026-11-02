"""VISUAILS — de laptopvideo nabewerken (levering 80): de hoeken glad maken en de gaten vastleggen.

    python3 scripts/laptop-video-na.py kladblok/levering-80/21_9_laptop.mp4 <werkmap>

Na scripts/laptop-video.py. Twee dingen:

1. **De hoeken glad.** Gemeten per beeld trillen de hoeken een paar beeldpunten, en als de klep bijna
   dicht is (vanaf beeld 40) of de telefoon de rand raakt, is de meting onbetrouwbaar.
   - De telefoon is stijf: elk beeld is beeld 0, verschoven en een fractie gedraaid. De verschuiving en
     de draaiing komen uit de bovenrand (linksboven en rechtsboven), alleen uit beelden waarin het
     scherm helemaal in beeld is; daarna glad (Savitzky-Golay, 7 beelden) en voor de laatste beelden
     doorgetrokken met dezelfde snelheid.
   - De laptop: elke hoek glad over 7 beelden; vanaf beeld 40 doorgetrokken uit de lijn van 30 – 39,
     tot de bovenrand de onderrand raakt. Daarna geen scherm meer.
2. **De gaten.** Waar de winkel en de telefoonfoto mogen staan: alleen waar de video doorzichtig is én
   het scherm was (licht, binnen de gemeten vierhoek). Een derde band in de gestapelde video. Zo komt
   de inhoud van een scherm nooit op de grond, ook niet als een hoek een paar beeldpunten mis is.

Uit: <werkmap>/gat/NNN.png en src/data/laptopVideo.json.
"""
import sys, os, json, subprocess
import numpy as np
import cv2
from scipy.signal import savgol_filter

bron, werk = sys.argv[1], sys.argv[2]
d = json.load(open(f'{werk}/schermen.json'))
W, H, N = d['b'], d['h'], d['beelden']
S = d['schermen']

# ── de telefoon: stijf ────────────────────────────────────────────────────────
# De draaiing uit de linker- en de rechterrand (de bovenrand heeft de inkeping, die de lijn scheef
# trekt), de verschuiving uit het midden van de vier hoeken. Alleen beelden waarin het scherm heel is.
f0 = np.array(S[0][1]) * [W, H]
hoek = lambda a, b: np.arctan2(b[0] - a[0], b[1] - a[1])          # t.o.v. verticaal
r0 = (hoek(f0[0], f0[3]) + hoek(f0[1], f0[2])) / 2
m0 = f0.mean(0)
goed = []
for i in range(N):
    q = S[i][1]
    if q is None: continue
    q = np.array(q) * [W, H]
    if q[:, 0].max() > W - 6: continue                     # raakt de rand: niet betrouwbaar
    if abs(np.linalg.norm(q[3] - q[0]) - np.linalg.norm(f0[3] - f0[0])) > 8: continue
    r = (hoek(q[0], q[3]) + hoek(q[1], q[2])) / 2
    m = q.mean(0)
    goed.append((i, m[0], m[1], r))
g = np.array(goed)
laatste_fon = max(i for i in range(N) if S[i][1] is not None)
ii = np.arange(0, laatste_fon + 1)
tx = np.interp(ii, g[:, 0], g[:, 1]); ty = np.interp(ii, g[:, 0], g[:, 2]); th = np.interp(ii, g[:, 0], g[:, 3])
# doortrekken na het laatste betrouwbare beeld: zelfde snelheid als de laatste 6 beelden
k = int(g[-1, 0])
for arr, kol in ((tx, 1), (ty, 2), (th, 3)):
    staart = g[-6:]
    v = np.polyfit(staart[:, 0], staart[:, kol], 1)[0]
    arr[k + 1:] = g[-1, kol] + v * (ii[k + 1:] - k)
from scipy.ndimage import median_filter
tx, ty, th = (median_filter(x, 5, mode='nearest') for x in (tx, ty, th))
tx = savgol_filter(tx, 7, 2); ty = savgol_filter(ty, 7, 2); th = savgol_filter(th, 9, 1)
fon = [None] * N
for i in ii:
    a = -(th[i] - r0); R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    fon[i] = (f0 - m0) @ R.T + [tx[i], ty[i]]

# ── de laptop: glad, en het einde doorgetrokken ───────────────────────────────
lap_i = [i for i in range(N) if S[i][0] is not None]
L = np.array([np.array(S[i][0]) * [W, H] for i in range(40)])          # 0 – 39 betrouwbaar
Lg = savgol_filter(L, 7, 2, axis=0)
lap = [None] * N
for i in range(40): lap[i] = Lg[i]
t = np.arange(30, 40)
fit = [[np.polyfit(t, L[30:40, c, a], 2) for a in range(2)] for c in range(4)]
for i in range(40, 60):
    q = np.array([[np.polyval(fit[c][0], i), np.polyval(fit[c][1], i)] for c in range(4)])
    # de onderrand houdt de lijn van beeld 39 (de scharnier zakt niet sneller dan hij al deed)
    if q[0][1] >= q[3][1] - 2 or q[1][1] >= q[2][1] - 2: break
    lap[i] = q

# ── de gaten: doorzichtig én licht in de bron én binnen de vierhoek (ruim) ───
os.makedirs(f'{werk}/gat', exist_ok=True)
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', bron, '-frames:v', str(N), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
for i in range(N):
    I = np.frombuffer(proc.stdout.read(W * H * 3), np.uint8).reshape(H, W, 3)
    a = cv2.imread(f'{werk}/dekking/{i:03d}.png', cv2.IMREAD_GRAYSCALE)
    gat = np.zeros((H, W), np.uint8)
    for q, links in ((S[i][0], True), (S[i][1], False)):
        if q is None: continue
        poly = np.zeros((H, W), np.uint8)
        cv2.fillConvexPoly(poly, np.round(np.array(q) * [W, H]).astype(np.int32), 255)
        poly = cv2.dilate(poly, np.ones((15, 15), np.uint8))
        zone = np.zeros((H, W), bool)
        if links: zone[:, : int(W * 0.70)] = True
        else: zone[:, int(W * 0.70):] = True
        gat |= ((poly > 0) & zone & (I.mean(2) > 160)).astype(np.uint8) * 255
    # het gat is waar de video niet dekt: 255 − dekking, binnen het scherm
    gat = np.minimum(gat, 255 - a)
    cv2.imwrite(f'{werk}/gat/{i:03d}.png', gat)

nr = lambda q: None if q is None else [[round(float(x) / W, 5), round(float(y) / H, 5)] for x, y in q]
uit = {'bron': 'kladblok/levering-80/21_9_laptop.mp4 (Lucas, 1 november 2026); scripts/laptop-video.py en -na.py',
       'b': W, 'h': H, 'fps': 24, 'beelden': N,
       'schermen': [[nr(lap[i]), nr(fon[i])] for i in range(N)]}
json.dump(uit, open('src/data/laptopVideo.json', 'w'), separators=(',', ':'))
print('laptop tot beeld', max(i for i in range(N) if lap[i] is not None), '· telefoon tot beeld', laatste_fon, '· beelden', N)
