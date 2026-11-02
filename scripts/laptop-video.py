"""VISUAILS — de laptopvideo van de opening, uitgeknipt en gestapeld (levering 80, 1 november 2026).

    python3 scripts/laptop-video.py kladblok/levering-80/21_9_laptop.mp4 <werkmap>

Lucas, 1 november (17:05 en 17:13): de 21 : 9-video van zijn laptop (de klep klapt dicht, laptop en
telefoon gaan het beeld uit) speelt bij de tweede scroll, met de winkel op het scherm die meeklapt.

Wat dit script doet, per beeld van de video (2944 × 1248, 24 per seconde):
1. **Uitknippen.** De grond van de video is egaal #F1F4FB (241, 244, 251), niet die van de site. Elke
   pixel wordt ontmengd: de kern (donker: handen, laptop, rand van het toestel) blijft, de grond en
   de witte schermen worden doorzichtig, en op de rand geldt I = a·O + (1 − a)·R, met O de kleur
   van de dichtstbijzijnde kernpixel en R de grond (#F1F4FB) of, naast een scherm, wit. Zo komt er
   geen grijze of witte zoom op de grond van de site.
2. **De schermen meten.** Het witte vlak van het laptopscherm en van het telefoonscherm: de vier
   hoeken uit vier rechte lijnen door de rand (cv2.fitLine), in breukdelen van de breedte en de
   hoogte. Is de klep bijna dicht (minder dan 0,15 % van het beeld), dan heeft het scherm geen hoeken
   meer en blijft het wit. Gaat de telefoon het beeld uit, dan rekent het script zijn hoeken door
   vanuit de linkerrand en de bovenrand, met de maat van het laatste hele beeld.
3. **Stapelen.** Kleur boven, dekking eronder, in één H.264-video (yuv420p, zonder geluid). De browser
   tekent hem met WebGL (HalLaptopVideo.astro): de kleur keer de dekking, en in de gaten de winkel
   en de telefoonfoto in perspectief. Zo is de grond overal precies de grond van de site, ook in
   Safari (dat geen doorzichtige webm speelt).

Uit (in <werkmap>): kleur/NNN.png en dekking/NNN.png per beeld, schermen.json, en daarna met
scripts/laptop-video.mjs de video's in public/video/.
"""
import sys, os, json, subprocess
import numpy as np
import cv2
from scipy import ndimage as ndi

bron, werk = sys.argv[1], sys.argv[2]
EIND = float(os.environ.get('EIND', '4.62'))      # na 4,5 s is alles uit beeld; een paar beelden marge
os.makedirs(f'{werk}/kleur', exist_ok=True); os.makedirs(f'{werk}/dekking', exist_ok=True)

W, H = 2944, 1248
G = np.array([241, 244, 251], np.float32)           # de grond van de video
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', bron, '-t', str(EIND), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)


def hoeken(masker):
    """Vier hoeken (lb, rb, ro, lo) van het grootste witte vlak, uit vier rechte lijnen, of None."""
    n, lab, stats, _ = cv2.connectedComponentsWithStats(masker.astype(np.uint8), 8)
    if n < 2: return None, 0
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA])); opp = int(stats[i, cv2.CC_STAT_AREA])
    if opp < 0.0015 * W * H: return None, opp
    vlak = (lab == i).astype(np.uint8)
    cs, _ = cv2.findContours(vlak, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea).reshape(-1, 2).astype(np.float32)
    s, d = c.sum(1), c[:, 0] - c[:, 1]
    ruw = np.array([c[np.argmin(s)], c[np.argmax(d)], c[np.argmax(s)], c[np.argmin(d)]])  # lb, rb, ro, lo
    # elke randpixel bij de zijde waar hij het dichtst bij ligt, dan een rechte lijn per zijde
    zijden = [(0, 1), (1, 2), (2, 3), (3, 0)]
    def afst(p, a, b):
        ab = b - a; t = np.clip(((p - a) @ ab) / max(ab @ ab, 1e-6), 0.08, 0.92)
        return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
    D = np.stack([afst(c, ruw[a], ruw[b]) for a, b in zijden], 1)
    k = np.argmin(D, 1)
    lijnen = []
    for z, (a, b) in enumerate(zijden):
        p = c[(k == z) & (D[:, z] < 6)]
        # de afgeronde hoeken niet meetellen: alleen het middelste 80 % van de zijde
        ab = ruw[b] - ruw[a]; t = ((p - ruw[a]) @ ab) / max(ab @ ab, 1e-6); p = p[(t > 0.1) & (t < 0.9)]
        if len(p) < 8: return ruw, opp
        vx, vy, x0, y0 = cv2.fitLine(p, cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
        lijnen.append((np.array([x0, y0]), np.array([vx, vy])))
    def snij(l1, l2):
        (p1, d1), (p2, d2) = l1, l2
        A = np.array([d1, -d2]).T
        if abs(np.linalg.det(A)) < 1e-6: return None
        t = np.linalg.solve(A, p2 - p1); return p1 + t[0] * d1
    pts = [snij(lijnen[3], lijnen[0]), snij(lijnen[0], lijnen[1]), snij(lijnen[1], lijnen[2]), snij(lijnen[2], lijnen[3])]
    if any(p is None for p in pts): return ruw, opp
    return np.array(pts), opp


schermen = []
laatste_fon = None
i = 0
while True:
    buf = proc.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    I = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
    L = I.mean(2)
    wit = (I.min(2) >= 248)
    # de schermen: laptop links van 70 % van de breedte, telefoon rechts (ze bewegen uit elkaar)
    grens = int(W * 0.70)
    wl = wit.copy(); wl[:, grens:] = False
    wf = wit.copy(); wf[:, :grens] = False
    ql, _ = hoeken(wl)
    qf, opp_f = hoeken(wf)
    # de telefoon aan de rand: zijn witte vlak raakt de rechterrand
    if qf is not None and (qf[:, 0].max() > W - 3):
        qf = None
    if qf is not None:
        laatste_fon = qf.copy()
    elif laatste_fon is not None and opp_f > 0:
        # doorrekenen: dezelfde vorm, verschoven naar de linkerrand en de bovenkant van wat er nog is
        ys, xs = np.nonzero(wf)
        if len(xs):
            links = np.percentile(xs, 0.5); boven = np.percentile(ys, 0.5)
            qf = laatste_fon + np.array([links - laatste_fon[:, 0].min(), boven - laatste_fon[:, 1].min()])
    # de vlakken die een scherm zijn (en dus doorzichtig worden): alleen als het scherm hoeken heeft
    scherm = np.zeros((H, W), bool)
    for q, zone in ((ql, wl), (qf, wf)):
        if q is None: continue
        poly = np.zeros((H, W), np.uint8)
        cv2.fillConvexPoly(poly, np.round(q).astype(np.int32), 1)
        poly = cv2.dilate(poly, np.ones((9, 9), np.uint8))
        # alles wat licht is binnen het scherm hoort erbij (ook het bijna-wit langs de rand)
        zl = np.zeros((H, W), bool); zl[:, :grens] = True
        helder = (I.mean(2) > 200) & (zl if zone is wl else ~zl)
        scherm |= (poly.astype(bool) & helder)
    # de kern en de grond
    dG = np.abs(I - G).max(2)
    grond = dG <= 6
    kern = (L < 150)
    zacht = ~(grond | kern | scherm)
    # wit dat geen scherm is (een scherm zonder hoeken, een glimlicht): ondoorzichtig houden
    witkern = wit & ~scherm
    # wit dat aan de grond grenst (een lichte rand om een arm, ruis) is geen glimlicht: weg
    n_w, lab_w = cv2.connectedComponents(witkern.astype(np.uint8), connectivity=8)
    if n_w > 1:
        raakt = np.unique(lab_w[cv2.dilate(grond.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & witkern])
        weg = np.isin(lab_w, raakt[raakt > 0])
        grond = grond | weg
        witkern = witkern & ~weg
    kern = kern | witkern
    zacht &= ~witkern
    idx = ndi.distance_transform_edt(~kern, return_distances=False, return_indices=True)
    O = I[idx[0], idx[1]]
    # de grond per zachte pixel: wit naast een scherm, anders de grond van de video
    bij_scherm = cv2.dilate(scherm.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
    R = np.where(bij_scherm[..., None], np.float32(255), G[None, None, :])
    RL, OL = R.mean(2), O.mean(2)
    a = np.zeros((H, W), np.float32)
    a[kern] = 1.0
    az = np.clip((RL - L) / np.maximum(RL - OL, 12.0), 0, 1)
    a[zacht] = az[zacht]
    a[grond | scherm] = 0.0
    ae = np.maximum(a, 1e-3)[..., None]
    C = np.where(a[..., None] >= 0.999, I, (I - (1 - ae) * R) / ae)
    C = np.clip(C, 0, 255)
    # waar niets staat de kleur van de dichtstbijzijnde zichtbare pixel (geen randen in de kleurlaag)
    zicht = a > 0.02
    if zicht.any():
        j = ndi.distance_transform_edt(~zicht, return_distances=False, return_indices=True)
        C = C[j[0], j[1]]
    cv2.imwrite(f'{werk}/kleur/{i:03d}.png', cv2.cvtColor(np.rint(C).astype(np.uint8), cv2.COLOR_RGB2BGR))
    cv2.imwrite(f'{werk}/dekking/{i:03d}.png', np.rint(a * 255).astype(np.uint8))
    norm = lambda q: None if q is None else [[round(float(x) / W, 5), round(float(y) / H, 5)] for x, y in q]
    schermen.append([norm(ql), norm(qf)])
    if i % 12 == 0:
        print(i, 'laptop', None if ql is None else np.round(ql).astype(int).tolist(), 'telefoon', None if qf is None else np.round(qf).astype(int).tolist(), flush=True)
    i += 1

json.dump({'bron': '21_9_laptop.mp4 (Lucas, 1 november 2026)', 'b': W, 'h': H, 'fps': 24, 'beelden': i,
           'grond_video': '#F1F4FB', 'schermen': schermen}, open(f'{werk}/schermen.json', 'w'))
print('klaar', i, 'beelden')
