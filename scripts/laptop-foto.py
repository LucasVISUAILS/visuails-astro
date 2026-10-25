"""
VISUAILS — de foto onder de laptopstanden: meten, maskers en maten. 23 oktober 2026.
═══════════════════════════════════════════════════════════════════════════════

    python scripts/laptop-foto.py "<pad naar de foto>"

Lucas koos op 23 oktober 2026 een nieuwe foto voor de opening, uit images/BG
(magnific__a-minimal-studio-product-photograph-a-dark-silhoue__50205.png, 5504 × 3072):
twee donkere handen in silhouet op een lichte studiogrond, links een hand onder een
laptop, rechts een hand met een telefoon die voor de rechteronderhoek van de laptop
hangt. Beide schermen wit. (Tot vandaag de POV-foto van 20 oktober, 2048 × 1152.)
Dit script maakt daaruit wat de laptopstanden nodig hebben:

  1. DE FOTO op de maat van de doos: 2304 × 1296 (16:9). De bron is 5504 × 3072
     (1,7917:1, iets breder dan 16:9): links en rechts gaan er 21 px af (5461 × 3072,
     alleen lege grond), dan Lanczos naar 2304 × 1296. Zo blijven de namen en breedtes
     van de standen (1000, 1600, 2304) wat ze waren.
     public/img/hal/pov-2304.webp, met de lege schermen: de ondergrond van de bron van de
     standen (src/pages/laptop-bron). De naam blijft, al is het geen POV-foto meer: de
     vingerafdruk (scripts/lib/laptopbron.mjs) en de bron noemen hem zo.
  2. DE HOEKEN van de twee schermen, GEMETEN: langs elke rand op honderden scanlijnen
     van binnen (het witte scherm) naar buiten tot de val naar de zwarte rand, op de
     helft (subpixel); per rand een lijn door die punten (uitschieters eruit), de hoeken
     zijn de snijpunten. Waar iets voor een rand hangt, telt dat stuk niet mee:
       laptop  rechts alleen boven de telefoon (de telefoon dekt de rand vanaf y 466),
               onder alleen links van de vingers (die beginnen bij x 1494);
       telefoon de ronde hoeken niet, en bovenaan niet onder het eiland (x 1624 tot 1728).
     Ze komen in src/data/halLaptop.js.
  3. DE MASKERS, in schermcoördinaten (laptop 1600 × 1034, telefoon 540 × 1170): voor elk
     schermpixel waar het in de foto valt (de homografie), en hoe wit de foto daar is.
     NIEUW: alleen het witte vlak dat aan het scherm zelf vastzit telt mee (vanuit het
     midden van het scherm gevuld, 3 px verruimd voor de zachte rand). Anders zou de
     laptop ook door het witte scherm van de telefoon heen tekenen, want dat ligt binnen
     de hoeken van de laptop. Wat zwart is (de vingers, de telefoon, het eiland, de ronde
     hoeken) blijft van de foto. public/img/hal/masker-laptop.png en masker-fon.png.

Daarna: `node scripts/laptop-standen.mjs` fotografeert de standen opnieuw.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

WORTEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HAL = os.path.join(WORTEL, 'public', 'img', 'hal')
DOOS = (2304, 1296)
SCHERM = {'laptop': (1600, 1034), 'fon': (540, 1170)}

bron = Image.open(sys.argv[1]).convert('RGB')
# naar 16:9: wat te breed is gaat er links en rechts gelijk af
bw = round(bron.height * DOOS[0] / DOOS[1])
if bw < bron.width:
    x0 = (bron.width - bw) // 2
    bron = bron.crop((x0, 0, x0 + bw, bron.height))
foto = bron.resize(DOOS, Image.LANCZOS)
L = np.asarray(foto).astype(np.float64) @ np.array([.299, .587, .114])


# ── 2. meten ─────────────────────────────────────────────────────────────────
def val(prof, binnen=20):
    """Van binnen naar buiten: de eerste plek (subpixel) onder de helft tussen het wit
    hier en het donkerste stuk erachter."""
    hi = np.median(prof[:binnen]); lo = prof[binnen:].min(); mid = (hi + lo) / 2
    for i in range(1, len(prof)):
        if prof[i - 1] >= mid > prof[i]:
            return i - 1 + (prof[i - 1] - mid) / (prof[i - 1] - prof[i])
    return None

def rand(kant, bereik, binnen, verst):
    """binnen: een coördinaat op het scherm (loodrecht op de rand), verst: tot waar buiten."""
    pts = []
    for t in bereik:
        prof = {'boven': lambda: L[verst:binnen + 1, t][::-1], 'onder': lambda: L[binnen:verst + 1, t],
                'links': lambda: L[t, verst:binnen + 1][::-1], 'rechts': lambda: L[t, binnen:verst + 1]}[kant]()
        k = val(prof)
        if k is None: continue
        pts.append({'boven': (t, binnen - k), 'onder': (t, binnen + k), 'links': (binnen - k, t), 'rechts': (binnen + k, t)}[kant])
    return np.array(pts)

def lijn(pts, horizontaal):
    p = pts.copy()
    for _ in range(6):
        u, v = (p[:, 0], p[:, 1]) if horizontaal else (p[:, 1], p[:, 0])
        a, b = np.polyfit(u, v, 1); r = v - (a * u + b)
        keep = np.abs(r) < max(.6, 2.5 * r.std())
        if keep.all(): break
        p = p[keep]
    u, v = (p[:, 0], p[:, 1]) if horizontaal else (p[:, 1], p[:, 0])
    a, b = np.polyfit(u, v, 1)
    return (a, b), len(p), float(np.abs(v - (a * u + b)).max())

def snij(h, v):
    (a1, b1), (a2, b2) = h, v
    y = (a1 * b2 + b1) / (1 - a1 * a2)
    return [round(float(a2 * y + b2), 2), round(float(y), 2)]

def meet(naam, links, rechts, boven, onder):
    """Per rand: (welke rijen of kolommen, een punt op het scherm, tot waar buiten), in doospixels."""
    r = {}
    for k, kant, (bereik, binnen, verst) in (('l', 'links', links), ('r', 'rechts', rechts), ('b', 'boven', boven), ('o', 'onder', onder)):
        r[k] = lijn(rand(kant, bereik, binnen, verst), kant in ('boven', 'onder'))
    hoek = {'tl': snij(r['b'][0], r['l'][0]), 'tr': snij(r['b'][0], r['r'][0]), 'br': snij(r['o'][0], r['r'][0]), 'bl': snij(r['o'][0], r['l'][0])}
    print(f"{naam:7s} punten {r['b'][1]}/{r['o'][1]}/{r['l'][1]}/{r['r'][1]}  grootste afwijking {max(v[2] for v in r.values()):.2f} px  {hoek}")
    return hoek

hoeken = {
    'laptop': meet('laptop', (range(330, 880), 640, 540), (range(310, 440), 1600, 1700),
                   (range(660, 1600), 330, 215), (range(660, 1440), 880, 990)),
    'fon': meet('fon', (range(570, 940), 1640, 1520), (range(570, 940), 1720, 1840),
                (list(range(1592, 1616)) + list(range(1738, 1760)), 560, 450), (range(1598, 1755), 940, 1060)),
}
MIDDEN = {'laptop': (1100, 600), 'fon': (1676, 750)}   # een punt midden op elk wit scherm


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

# het wit van de schermen is hier 242 (telefoon) tot 251 (laptop), de zwarte rand 2 tot 15.
# De overgang ligt HOOG (185 tot 230) en niet op de helft: de nagels van de vingers voor de
# laptop zijn 100 tot 175 licht, en die moeten foto blijven. Aan de rand van een scherm
# verschuift dat het masker minder dan een halve pixel (de val naar zwart is 2 px breed).
wit = np.clip((L - 185) / 45, 0, 1)
for naam, (w, h) in SCHERM.items():
    # alleen het witte vlak dat aan dit scherm vastzit (vullen vanuit het midden)
    vlak = Image.fromarray(np.where(L > 128, 255, 0).astype(np.uint8), 'L').copy()
    ImageDraw.floodfill(vlak, MIDDEN[naam], 128)
    eigen = (np.asarray(vlak) == 128)
    eigen = np.asarray(Image.fromarray((eigen * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
    dekking = wit * eigen
    Hm = homografie(w, h, hoeken[naam])
    # 2 × 2 deelpixels per schermpixel, zodat de rand van het masker zacht en juist is
    ss = 2
    u, v = np.meshgrid((np.arange(w * ss) + .5) / ss, (np.arange(h * ss) + .5) / ss)
    p = Hm @ np.stack([u.ravel(), v.ravel(), np.ones(u.size)])
    x, y = p[0] / p[2], p[1] / p[2]
    a = bilineair(dekking, x, y).reshape(h * ss, w * ss)
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
