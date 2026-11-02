"""VISUAILS — een model of product uitknippen, met zijn schaduw (levering 80, 1 november 2026).

    python3 scripts/uitknippen.py <foto> <uit.png> [--schaduw] [--onder-dicht]

Lucas, 1 november: "sommige beelden uit te knippen (schaduw wanneer aanwezig altijd behouden), de
objecten/personen uit te knippen en clean in de website te verwerken."

1. Het masker: rembg met isnet-general-use (pip install "rembg[cpu]"; het model komt van de
   releases van github.com/danielgatis/rembg). BiRefNet is scherper maar past niet in 8 GB.
2. --onder-dicht: een foto die onderaan is afgesneden (de hoodie) verliest soms een stuk broek in
   het masker. Wat onderin (laagste 20 %) donkerder is dan de grond en aan het lichaam vastzit,
   hoort erbij; gaten in het lichaam worden gevuld.
3. De rand wordt ontmengd: op de rand is een pixel een menging van het voorwerp en de grond B
   (I = a·C + (1 − a)·B), dus C = (I − (1 − a)·B) / a. B wordt per plek geschat uit de pixels
   buiten het masker. Zo komt er geen witte zoom op een gekleurde grond.
4. --schaduw: wat buiten het voorwerp donkerder is dan de belichte grond is schaduw. De belichte
   grond is de 92e percentiel in vakken van 96 px (zo telt de schaduw zelf niet mee), uitgesmeerd.
   De schaduw wordt zwart met dekking s = 1 − I / grond, iets verzacht, zodat hij op elke grond
   klopt (op de grond van de site wordt hij net zo donker als op de foto).
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

args = [a for a in sys.argv[1:] if not a.startswith('--')]
vlag = set(a for a in sys.argv[1:] if a.startswith('--'))
foto, uit = args[0], args[1]

from rembg import new_session, remove  # noqa: E402

beeld = Image.open(foto).convert('RGB')
I = np.asarray(beeld).astype(np.float32)
L = I.mean(2)
H, W = L.shape
a = np.asarray(remove(beeld, session=new_session('isnet-general-use'), only_mask=True)).astype(np.float32) / 255.0

buiten = a < 0.02
grondL = float(np.median(L[buiten])) if buiten.any() else 250.0

if '--onder-dicht' in vlag:
    kand = L < grondL - 14
    kand[: int(H * 0.80)] = False
    lab, _ = ndi.label(kand | (a > 0.5))
    hou = np.unique(lab[a > 0.5]); hou = hou[hou > 0]
    lijf = ndi.binary_fill_holes(np.isin(lab, hou))
    erbij = lijf & (a < 0.5) & kand
    a = np.maximum(a, np.clip(ndi.gaussian_filter(erbij.astype(np.float32), 1.2) * 1.4, 0, 1) * (L < grondL - 6))
    a[erbij] = 1.0

# de grond per plek, voor het ontmengen van de rand
w = (a < 0.02).astype(np.float32)
B = np.zeros_like(I)
den = ndi.gaussian_filter(w, 25)
for c in range(3):
    B[..., c] = ndi.gaussian_filter(I[..., c] * w, 25) / np.maximum(den, 1e-4)
med = np.median(I[w > 0], axis=0) if w.sum() > 0 else np.array([250, 250, 250], np.float32)
B = np.where(den[..., None] > 0.02, B, med)
ae = np.clip(a, 1e-3, 1)[..., None]
C = np.where(a[..., None] > 0.995, I, (I - (1 - ae) * B) / ae)
C = np.clip(C, 0, 255)
a = np.where(a < 0.03, 0, a)

if '--schaduw' in vlag:
    # de belichte grond: 92e percentiel per vak van 96 px, daarna zacht uitgesmeerd
    v = 96
    gh, gw = (H + v - 1) // v, (W + v - 1) // v
    rooster = np.zeros((gh, gw), np.float32)
    for y in range(gh):
        for x in range(gw):
            blok = L[y * v:(y + 1) * v, x * v:(x + 1) * v]
            m = buiten[y * v:(y + 1) * v, x * v:(x + 1) * v]
            rooster[y, x] = np.percentile(blok[m], 92) if m.sum() > 50 else np.nan
    # gaten (vakken vol voorwerp) vullen met de dichtstbijzijnde waarde
    gat = np.isnan(rooster)
    if gat.any():
        idx = ndi.distance_transform_edt(gat, return_distances=False, return_indices=True)
        rooster = rooster[idx[0], idx[1]]
    licht = np.asarray(Image.fromarray(rooster).resize((W, H), Image.BICUBIC)).astype(np.float32)
    licht = ndi.gaussian_filter(licht, 40)
    s = np.clip(1.0 - L / np.maximum(licht, 1.0), 0, 1)
    s = ndi.gaussian_filter(s, 1.5)
    s[s < 0.035] = 0
    s = np.where(a > 0.02, 0, s)
    # losse spikkels (ruis van de jpeg) weg: alleen schaduwvlekken van minstens 400 px blijven
    lab, n = ndi.label(s > 0)
    if n:
        maat = ndi.sum(np.ones_like(s), lab, index=np.arange(1, n + 1))
        klein = np.isin(lab, np.nonzero(maat < 400)[0] + 1)
        s[klein] = 0
    # samenvoegen: het voorwerp over zijn zwarte schaduw
    ua = a + (1 - a) * s
    C = np.where(ua[..., None] > 0, (a[..., None] * C) / np.maximum(ua[..., None], 1e-4), 0)
    a = ua

uitbeeld = np.dstack([np.rint(C).astype(np.uint8), np.rint(np.clip(a, 0, 1) * 255).astype(np.uint8)])
im = Image.fromarray(uitbeeld, 'RGBA')
# bijsnijden tot wat er staat (+ 2 px)
ys, xs = np.nonzero(uitbeeld[..., 3] > 3)
im = im.crop((max(0, xs.min() - 2), max(0, ys.min() - 2), min(W, xs.max() + 3), min(H, ys.max() + 3)))
im.save(uit, optimize=True)
print(uit, im.size, 'grond', round(grondL, 1))
