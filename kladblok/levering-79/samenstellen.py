"""Zet het beeld op een grondkleur met de alfa en de achtergrondschatting uit maak_wit.py.
Schermen (ingesloten door de rand van het toestel) blijven wit, ook op een grijze grond.
Losse pixels ver van een voorwerp worden precies de grondkleur.
Gebruik: samenstellen.py bron.png alfa.npy B.npy HEX uit.png [HEX uit.png ...]"""
import sys, os
import numpy as np
from PIL import Image, PngImagePlugin
from scipy import ndimage as ndi

bron, alfa, bpad = sys.argv[1:4]
im = Image.open(bron)
info = im.info
I = np.asarray(im.convert('RGB')).astype(np.float32)
L = I.mean(2)
a = np.load(alfa).astype(np.float32) / 255.0
B = np.load(bpad).astype(np.float32)

kern_ruw = ndi.binary_dilation(L < 170, iterations=10)
licht = ~kern_ruw
lab, _ = ndi.label(licht)
rand = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
rand = rand[rand > 0]
ingesloten = licht & ~np.isin(lab, rand)
ver = ~ndi.binary_dilation(L < 200, iterations=25)

# --- de schaduw onder de voet van de laptop en onder de telefoon (Lucas, 02:38: "moet ook weg").
# In deze stroken blijft alleen wat echt donker is (voet, rand, hand, telefoon). De randen daarvan worden
# opnieuw ontmengd tegen de grijze strook in dezelfde rij, zodat ze zacht blijven zonder grijze rest.
def strook(x0, x1, y0, y1):
    sl = (slice(y0, y1), slice(x0, x1))
    Ls = L[sl]
    kern = Ls < 90
    # helderheid van de strook per rij, zonder de kern (rij van 1 px hoog, 61 px breed)
    w = (~kern).astype(np.float32)
    som = ndi.uniform_filter1d(Ls * w, 61, axis=1, mode='nearest')
    n = ndi.uniform_filter1d(w, 61, axis=1, mode='nearest')
    Bref = np.where(n > 0.05, som / np.maximum(n, 1e-6), 255.0)
    afst, idx = ndi.distance_transform_edt(~kern, return_distances=True, return_indices=True)
    O = I[sl][idx[0], idx[1]]
    OL = O.mean(2)
    ar = np.clip((Bref - Ls) / np.maximum(Bref - OL, 20.0), 0, 1)
    ar[kern] = 1.0
    ar[afst > 3] = 0.0          # alleen de zachte rand van de voet of de telefoon telt; de rest van de strook is grond
    return sl, ar, O, kern

y_voet = int(np.argmax(L[2090:2200, 3400] > 150)) + 2090   # eerste lichte rij onder de voet van de laptop
stroken = [strook(2870, 4600, y_voet + 2, 2190), strook(4600, 5150, 2140, 2190)]
print('strook onder de laptop vanaf y =', y_voet)

for hexkleur, pad in zip(sys.argv[4::2], sys.argv[5::2]):
    G = np.array([int(hexkleur[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
    uit = I + (1.0 - a)[..., None] * (G - B)
    uit[a == 0] = G
    uit[ver & ~ingesloten] = G
    # schermen: wit, ook op een grijze grond (op de site komt daar de inhoud)
    wit = np.float32(255.0)
    uit_s = I + (1.0 - a)[..., None] * (wit - B)
    if os.environ.get('GATEN') == '1':
        pass  # schermen doorzichtig: de inhoud ligt op de site onder de foto
    else:
        uit[ingesloten] = np.where((a[ingesloten] == 0)[:, None], wit, uit_s[ingesloten])
    for sl, ar, O, kern in stroken:
        blok = ar[..., None] * O + (1.0 - ar)[..., None] * G
        blok[kern] = I[sl][kern]
        # schermen en de lichte naad tussen de voet en de laptop zijn hier geen strook: alleen buiten ingesloten
        ins = ingesloten[sl] if os.environ.get('GATEN') != '1' else np.zeros_like(ingesloten[sl])
        doel = uit[sl]
        doel[~ins] = blok[~ins]
        uit[sl] = doel
    uit = np.clip(np.rint(uit), 0, 255).astype(np.uint8)
    buiten = ~ingesloten
    g8 = G.astype(np.uint8)
    rest = ((uit != g8).any(2) & buiten & ver).sum()
    print(hexkleur, 'grondkleur:', round(((uit == g8).all(2)).mean() * 100, 2), '% ; losse afwijkers ver van een voorwerp:', int(rest))
    pi = PngImagePlugin.PngInfo()
    if info.get('XML:com.adobe.xmp'):
        pi.add_itxt('XML:com.adobe.xmp', info['XML:com.adobe.xmp'])
    kw = {'exif': info['exif']} if 'exif' in info else {}
    Image.fromarray(uit, 'RGB').save(pad, pnginfo=pi, optimize=True, **kw)
    print('  ', pad)
