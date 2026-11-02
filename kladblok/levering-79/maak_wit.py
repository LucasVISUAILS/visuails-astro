"""Maakt de achtergrond van het 21:9-beeld egaal wit (#FFFFFF).

Werkwijze (geen knipwerk met harde randen):
1. Schat de achtergrond B per pixel: het grijze verloop boven de plank en de iets donkerdere band eronder
   apart, zodat de lijn van de plank scherp blijft en daarna precies verdwijnt.
2. Kern van de voorwerpen (handen, laptop, telefoon): duidelijk donkerder dan B. Daar blijft elke pixel
   onaangeroerd.
3. Randen: de pixel is een menging van voorwerp O en achtergrond B: I = a*O + (1-a)*B.
   a = (B - I) / (B - O), met O de kleur van de dichtstbijzijnde kernpixel. Nieuw: a*O + (1-a)*255,
   dus I + (1-a)*(255 - B). Zo houden de randen hun zachtheid, zonder grijze rand.
4. Schermen (ingesloten door de rand van het toestel) en alles wat lichter is dan B: wit.
De metagegevens (EXIF en XMP met 'Made with Google AI' / trainedAlgorithmicMedia) gaan mee.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import cv2

bron, uit = sys.argv[1], sys.argv[2]
im = Image.open(bron)
info = im.info
I = np.asarray(im.convert('RGB')).astype(np.float32)
H, W, _ = I.shape
L = I.mean(2)

# --- 1. plaats van de plank: de sprong van licht naar iets donkerder, per kolom waar hij vrij ligt
f = W / 1999.0
y0, y1 = int(660 * f), int(720 * f)
g = L[y0 + 1:y1] - L[y0:y1 - 1]          # negatief bij licht -> donker
kols = []
for xs in range(1425, 1470, 3):           # tussen laptop en telefoon
    x = int(xs * f)
    c = g[:, x - 2:x + 3].mean(1)
    kols.append(y0 + int(c.argmin()) + 1)
for xs in range(930, 1390, 20):           # onder de laptop, onder de rand van de voet
    x = int(xs * f)
    seg = L[int(682 * f):y1, x - 2:x + 3].mean(1)
    gg = np.diff(seg)
    kols.append(int(682 * f) + int(gg.argmin()) + 1)
yplank = int(np.median(kols))
print('plank op y =', yplank, '(spreiding', min(kols), '-', max(kols), ')')

# --- 2. kandidaat-achtergrond en ingesloten delen (schermen)
kern_ruw = L < 170
kern_ruw = ndi.binary_dilation(kern_ruw, iterations=10)
licht = ~kern_ruw
lab, n = ndi.label(licht)
rand = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
rand = rand[rand > 0]
buiten = np.isin(lab, rand)
ingesloten = licht & ~buiten              # schermen en kleine lichte stukjes binnen een toestel
print('ingesloten pixels:', int(ingesloten.sum()))

# --- 3. achtergrond schatten: genormaliseerde convolutie, boven en onder de plank apart, op 1/4 schaal
def schat(masker_rijen):
    k = 4
    h, w = H // k, W // k
    Ik = cv2.resize(I, (w, h), interpolation=cv2.INTER_AREA)
    mk = cv2.resize((buiten & masker_rijen).astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    mk = (mk > 0.999).astype(np.float32)
    B = np.zeros_like(Ik)
    gevuld = np.zeros((h, w), bool)
    for sy, sx in ((2, 12), (6, 40), (20, 120), (60, 400), (200, 1200)):
        wgt = ndi.gaussian_filter(mk, (sy, sx), mode='nearest')
        ok = (wgt > 0.02) & ~gevuld
        for c in range(3):
            num = ndi.gaussian_filter(Ik[..., c] * mk, (sy, sx), mode='nearest')
            B[..., c][ok] = (num / np.maximum(wgt, 1e-6))[ok]
        gevuld |= ok
    return cv2.resize(B, (W, H), interpolation=cv2.INTER_CUBIC)

rij = np.arange(H)[:, None] * np.ones((1, W))
boven = rij < yplank - 3
onder = rij > yplank + 3
Bb = schat(boven)
Bo = schat(onder)
B = np.where((rij < yplank)[..., None], Bb, Bo)
BL = B.mean(2)

# --- 4. kern en kleur van het dichtstbijzijnde voorwerp
D = BL - L
kern = D > 60
kern = ndi.binary_opening(kern, iterations=1)
# dichtstbijzijnde kernpixel (alleen nodig in een band rond de kern)
band = ndi.binary_dilation(kern, iterations=40) & ~kern
idx = ndi.distance_transform_edt(~kern, return_distances=False, return_indices=True)
O = I[idx[0], idx[1]]
OL = O.mean(2)
del idx

a = np.zeros((H, W), np.float32)
a[kern] = 1.0
noem = np.maximum(BL - OL, 20.0)
ab = np.clip(D / noem, 0, 1)
# ruis in het grijs (sd ~0,7) mag geen spikkels geven: onder 3 grijswaarden telt niet mee, daarna zacht op
ruis = np.clip((D - 3.0) / 3.0, 0, 1)
ab = ab * ruis
a[band] = ab[band]
a[ingesloten & ~kern] = 0.0

np.save(uit + '.B.npy', B.astype(np.float16))
for hexkleur, pad in zip(sys.argv[3::2], sys.argv[4::2]):
    G = np.array([int(hexkleur[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
    uitb = I + (1.0 - a)[..., None] * (G - B)
    uitb[a == 0] = G
    uitb = np.clip(np.rint(uitb), 0, 255).astype(np.uint8)
    grond = (uitb == G.astype(np.uint8)).all(2)
    print(hexkleur, 'precies de grondkleur:', round(grond.mean() * 100, 2), '% van het beeld')
    Image.fromarray(uitb, 'RGB').save(pad, pnginfo=None, optimize=True, **({'exif': info['exif']} if 'exif' in info else {}))
    from PIL import PngImagePlugin
    pi = PngImagePlugin.PngInfo()
    if info.get('XML:com.adobe.xmp'):
        pi.add_itxt('XML:com.adobe.xmp', info['XML:com.adobe.xmp'])
    Image.fromarray(uitb, 'RGB').save(pad, pnginfo=pi, optimize=True, **({'exif': info['exif']} if 'exif' in info else {}))

uitb = I + (1.0 - a)[..., None] * (255.0 - B)
uitb[a == 0] = 255.0
uitb = np.clip(np.rint(uitb), 0, 255).astype(np.uint8)

# controle
wit = (uitb == 255).all(2)
print('zuiver wit:', round(wit.mean() * 100, 2), '% van het beeld')
kern_verschil = np.abs(uitb[kern].astype(int) - I[kern].astype(int)).max()
print('grootste verandering in de kern:', kern_verschil)

uitim = Image.fromarray(uitb, 'RGB')
kw = {}
if 'exif' in info:
    kw['exif'] = info['exif']
xmp = info.get('XML:com.adobe.xmp')
pnginfo = None
from PIL import PngImagePlugin
pnginfo = PngImagePlugin.PngInfo()
if xmp:
    pnginfo.add_itxt('XML:com.adobe.xmp', xmp)
uitim.save(uit, pnginfo=pnginfo, optimize=True, **kw)
np.save(uit + '.alpha.npy', (a * 255).astype(np.uint8))
print('klaar', uit)
