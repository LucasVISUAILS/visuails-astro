"""
VISUAILS — de foto onder de laptopstanden: meten, maskers en maten. 20 oktober 2026.
═══════════════════════════════════════════════════════════════════════════════

    python scripts/laptop-foto.py "<pad naar de foto>"

Lucas koos voor de opening zijn POV-foto uit images/BG (een telefoon in de linkerhand,
een laptop op schoot, allebei met een wit scherm, en links de violette schets van een
studio). Dit script maakt daaruit wat de laptopstanden nodig hebben:

  1. DE FOTO op de maat van de doos: 2304 × 1296 (16:9). De bron is 2048 × 1152; hij
     wordt 1,125 × groter gemaakt (Lanczos), zodat de namen en breedtes van de standen
     (1000, 1600, 2304) blijven wat ze waren en elke stand zijn oude bestand overschrijft.
     public/img/hal/pov-2304.webp, met de lege schermen: de ondergrond van de bron van de
     standen (src/pages/laptop-bron). De foto MET schermen (laptop-<breedte>.webp, voor
     het deelplaatje en als er geen standen zijn) maakt scripts/laptop-standen.mjs.
  2. DE HOEKEN van de twee schermen, GEMETEN: langs elke rand op honderden scanlijnen
     van binnen (het witte scherm) naar buiten tot de val naar de zwarte rand, op de
     helft (subpixel); per rand een lijn door die punten (uitschieters eruit), de hoeken
     zijn de snijpunten. Bij de telefoon alleen het rechte stuk van elke rand (zijn hoeken
     zijn rond) en bovenaan niet onder het eiland. Ze komen in src/data/halLaptop.js.
  3. DE MASKERS, in schermcoördinaten (laptop 1600 × 1034, telefoon 540 × 1170): voor elk
     schermpixel waar het in de foto valt (de homografie), en hoe wit de foto daar is.
     Wat zwart is (de inkeping van de laptop, het eiland van de telefoon, de ronde hoeken)
     blijft van de foto. public/img/hal/masker-laptop.png en masker-fon.png.

Daarna: `node scripts/laptop-standen.mjs` fotografeert de standen opnieuw.
"""
import json, os, sys
import numpy as np
from PIL import Image

WORTEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HAL = os.path.join(WORTEL, 'public', 'img', 'hal')
DOOS = (2304, 1296)
SCHERM = {'laptop': (1600, 1034), 'fon': (540, 1170)}

bron = Image.open(sys.argv[1]).convert('RGB')
foto = bron.resize(DOOS, Image.LANCZOS)
L = np.asarray(foto).astype(np.float64) @ np.array([.299, .587, .114])


# ── 2. meten ─────────────────────────────────────────────────────────────────
def val(prof, binnen=28):
    """Van binnen naar buiten: de eerste plek (subpixel) onder de helft tussen het wit
    hier en het donkerste stuk erachter."""
    hi = np.median(prof[:binnen]); lo = prof[binnen:].min(); mid = (hi + lo) / 2
    for i in range(1, len(prof)):
        if prof[i - 1] >= mid > prof[i]:
            return i - 1 + (prof[i - 1] - mid) / (prof[i - 1] - prof[i])
    return None

def rand(kant, bereik, midden, verst):
    pts = []
    for t in bereik:
        prof = {'boven': lambda: L[verst:midden + 1, t][::-1], 'onder': lambda: L[midden:verst + 1, t],
                'links': lambda: L[t, verst:midden + 1][::-1], 'rechts': lambda: L[t, midden:verst + 1]}[kant]()
        k = val(prof)
        if k is None: continue
        pts.append({'boven': (t, midden - k), 'onder': (t, midden + k), 'links': (midden - k, t), 'rechts': (midden + k, t)}[kant])
    return np.array(pts)

def lijn(pts, horizontaal):
    p = pts.copy()
    for _ in range(4):
        u, v = (p[:, 0], p[:, 1]) if horizontaal else (p[:, 1], p[:, 0])
        a, b = np.polyfit(u, v, 1); r = v - (a * u + b)
        keep = np.abs(r) < max(1.0, 2.5 * r.std())
        if keep.all(): break
        p = p[keep]
    u, v = (p[:, 0], p[:, 1]) if horizontaal else (p[:, 1], p[:, 0])
    a, b = np.polyfit(u, v, 1)
    return (a, b), len(p), float(np.abs(v - (a * u + b)).max())

def snij(h, v):
    (a1, b1), (a2, b2) = h, v
    y = (a1 * b2 + b1) / (1 - a1 * a2)
    return [round(float(a2 * y + b2), 2), round(float(y), 2)]

def meet(naam, kader, eiland, hoekvrij):
    """kader: grofweg het witte vlak (x0, y0, x1, y1) in doospixels; eiland: het stuk van de
    bovenrand (fractie van de breedte) dat niet meedoet; hoekvrij: hoeveel van elke rand bij
    de hoeken niet meedoet (ronde hoeken)."""
    x0, y0, x1, y1 = kader; cx, cy = (x0 + x1) // 2, (y0 + y1) // 2; m = 34
    h = y1 - y0
    rijen = range(int(y0 + hoekvrij * h), int(y1 - hoekvrij * h))
    links, nl, el = lijn(rand('links', rijen, cx, x0 - m), False)
    rechts, nr, er = lijn(rand('rechts', rijen, cx, x1 + m), False)
    def kolommen(y, stukken):
        xl = links[0] * y + links[1]; xr = rechts[0] * y + rechts[1]
        return [x for x in range(int(xl), int(xr) + 1) if any(a <= (x - xl) / (xr - xl) <= b for a, b in stukken)]
    vrij = (hoekvrij, 1 - hoekvrij)
    boven, nb, eb = lijn(rand('boven', kolommen(y0, [(vrij[0], eiland[0]), (eiland[1], vrij[1])]), cy, y0 - m), True)
    onder, no, eo = lijn(rand('onder', kolommen(y1, [vrij]), cy, y1 + m), True)
    hoek = {'tl': snij(boven, links), 'tr': snij(boven, rechts), 'br': snij(onder, rechts), 'bl': snij(onder, links)}
    print(f'{naam:7s} punten {nb}/{no}/{nl}/{nr}  grootste afwijking {max(eb, eo, el, er):.2f} px  {hoek}')
    return hoek

k = DOOS[0] / bron.width
hoeken = {
    'laptop': meet('laptop', [round(v * k) for v in (954, 216, 1762, 716)], (.40, .60), .12),
    'fon': meet('fon', [round(v * k) for v in (565, 386, 783, 824)], (.32, .68), .22),
}


# ── 3. de maskers ────────────────────────────────────────────────────────────
def homografie(w, h, q):
    bronp = [(0, 0), (w, 0), (w, h), (0, h)]; doel = [q['tl'], q['tr'], q['br'], q['bl']]
    A, b = [], []
    for (x, y), (u, v) in zip(bronp, doel):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    hv = np.linalg.solve(np.array(A, float), np.array(b, float))
    return np.append(hv, 1).reshape(3, 3)

def bilineair(img, x, y):
    x0 = np.clip(np.floor(x).astype(int), 0, img.shape[1] - 2); y0 = np.clip(np.floor(y).astype(int), 0, img.shape[0] - 2)
    fx = np.clip(x - x0, 0, 1); fy = np.clip(y - y0, 0, 1)
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

for naam, (w, h) in SCHERM.items():
    Hm = homografie(w, h, hoeken[naam])
    # 2 × 2 deelpixels per schermpixel, zodat de rand van het masker zacht en juist is
    ss = 2
    u, v = np.meshgrid((np.arange(w * ss) + .5) / ss, (np.arange(h * ss) + .5) / ss)
    p = Hm @ np.stack([u.ravel(), v.ravel(), np.ones(u.size)])
    x, y = p[0] / p[2], p[1] / p[2]
    lum = bilineair(L, x, y).reshape(h * ss, w * ss)
    # het wit van het scherm is hier zo'n 225 tot 235, de zwarte rand 15 tot 40: de helft
    # (≈ 128) is de rand, met een overgang van 50 luminantie breed
    a = np.clip((lum - 103) / 50, 0, 1)
    a = a.reshape(h, ss, w, ss).mean((1, 3))
    rgba = np.zeros((h, w, 4), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = np.round(a * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(HAL, f'masker-{naam}.png'), optimize=True)
    print(f'masker-{naam}.png  {w} × {h}  dekking {a.mean() * 100:.1f} %')


# ── 1. de foto met de lege schermen ──────────────────────────────────────────
p = os.path.join(HAL, 'pov-2304.webp')
foto.save(p, 'WEBP', quality=90, method=6)
print(f'pov-2304.webp  {DOOS[0]} × {DOOS[1]}  {os.path.getsize(p) // 1024} kB')

print('\nDe hoeken voor src/data/halLaptop.js (SCHERMEN):')
for naam, q in hoeken.items():
    print(f"  {naam}: tl: {q['tl']}, tr: {q['tr']}, br: {q['br']}, bl: {q['bl']}")
print('Zet ze daar en draai node scripts/laptop-standen.mjs.')
