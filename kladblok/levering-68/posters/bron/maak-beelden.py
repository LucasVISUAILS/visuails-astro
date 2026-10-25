# VISUAILS · de beelden voor de posterreeks in Blauw uur (levering 68, 24 oktober 2026).
#
#   python3 bron/maak-beelden.py <stand.png> <lifestyle-glow-05.webp>
#
# stand.png: de witte catalogstand van de opening (public/img/hal/stand, nl-catalog-0, op volle maat).
# Het kader van de posters is die stand vanaf x 420, 1728 × 1296 (4:3); de hoeken van laptop en
# telefoon in dat kader staan in hoeken.json (src/data/halLaptop.js, min 420 in x).
# De witte hal: lifestyle-glow-05 met de grond naar puur wit (Out = In + (1 − a)(255 − B)),
# zo laag geplaatst dat het woordmerk en de balk boven nooit over het gezicht vallen.
import sys, json, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

HIER = pathlib.Path(__file__).resolve().parent.parent
IMG = HIER / 'img'
X0 = 420

def kader_uitsnede(N, x0, y0, w, h, uitW, uitH, naam):
    k = N.width / 2304
    fx0, fy0, fw, fh = (X0 + x0) * k, y0 * k, w * k, h * k
    doek = Image.new('RGB', (round(fw), round(fh)), (255, 255, 255))
    bx0, by0 = max(0, round(fx0)), max(0, round(fy0))
    bx1, by1 = min(N.width, round(fx0 + fw)), min(N.height, round(fy0 + fh))
    doek.paste(N.crop((bx0, by0, bx1, by1)), (bx0 - round(fx0), by0 - round(fy0)))
    uit = doek.resize((uitW, uitH), Image.LANCZOS)
    uit.save(IMG / naam, quality=90, method=6) if naam.endswith('webp') else uit.save(IMG / naam, quality=92)

def wit_maken(pad):
    g = np.asarray(Image.open(pad).convert('RGB')).astype(np.float64)
    L = g @ np.array([.299, .587, .114])
    zeker = ndimage.minimum_filter(L, 15) > 200
    idx = ndimage.distance_transform_edt(~zeker, return_distances=False, return_indices=True)
    B = ndimage.gaussian_filter(L[idx[0], idx[1]], 8)
    a = np.clip((B - L) / (B - 12), 0, 1)
    return Image.fromarray(np.clip(g + (1 - a)[..., None] * (255 - B)[..., None], 0, 255).astype(np.uint8))

def plaats(W, uitW, uitH, schaal, boven, midden_x):
    doek = Image.new('RGB', (uitW, uitH), (255, 255, 255))
    kl = W.resize((round(W.width * schaal), round(W.height * schaal)), Image.LANCZOS)
    doek.paste(kl, (round(uitW / 2 - midden_x * schaal), boven))
    return doek

if __name__ == '__main__':
    N = Image.open(sys.argv[1]).convert('RGB')
    kader_uitsnede(N, 0, 0, 1728, 1296, 1200, 900, 'poster-scherm.webp')
    kader_uitsnede(N, 110, -88, 1180, 1475, 800, 1000, 'poster-detail.webp')
    kader_uitsnede(N, 760, -30, 1040, 1300, 800, 1000, 'poster-twee.webp')
    W = wit_maken(sys.argv[2])
    mx = (779 + 1787) / 2                     # het model in lifestyle-glow-05 loopt van x 779 tot 1787
    plaats(W, 800, 1000, .5, 300, mx).save(IMG / 'poster-hal.jpg', quality=92)       # hoofd onder de kaplijn + 1 h
    plaats(W, 720, 1280, .47, 440, mx).save(IMG / 'story-xray.webp', quality=90, method=6)
    Image.new('RGB', (800, 1000), (255, 255, 255)).save(IMG / 'poster-icoon.webp', quality=90)
    sys.path.insert(0, str(HIER)); import xray
    for n in ['poster-detail.webp', 'poster-twee.webp', 'poster-hal.jpg', 'story-xray.webp']:
        print(n, xray.masker(IMG / n, IMG / (n.rsplit('.', 1)[0] + '-x.png')))
