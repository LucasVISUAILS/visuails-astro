# Posters 13-20 (levering 87): de bewogen beelden. Bewegingsonscherpte langs een richting, in lineair licht
# (zo branden lichte strepen door het donker zoals bij een lange sluitertijd), op halve maat gerekend en daarna
# terug naar de volle maat. Gebruik: python3 beeld.py
import numpy as np, pathlib, sys
from PIL import Image
from scipy import ndimage

HIER = pathlib.Path(__file__).parent
import os
BRON = pathlib.Path(os.environ.get('VISUAILS_BEELDEN') or HIER.parents[3] / 'images' / 'Before & After' / 'Catalog Custom styles')
UIT = HIER / 'img'; UIT.mkdir(exist_ok=True)

def lin(a): return np.where(a <= .04045, a / 12.92, ((a + .055) / 1.055) ** 2.4)
def srgb(a): a = np.clip(a, 0, 1); return np.where(a <= .0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - .055)

def bewogen(im, hoek, lengte, schaal=.5, staart=0.0):
    """hoek in graden tegen de klok in vanaf horizontaal (53.13 = de snede, '/'); lengte als deel van de breedte;
    staart 0 = gelijk naar twee kanten, 1 = alleen een spoor naar achteren (snelheid)."""
    W, H = im.size
    k = im.resize((round(W * schaal), round(H * schaal)), Image.LANCZOS)
    a = lin(np.asarray(k).astype(np.float32) / 255)
    L = max(3, int(lengte * k.size[0]))
    P = int(.6 * max(k.size)) + L
    a = np.pad(a, ((P, P), (P, P), (0, 0)), mode='reflect')
    # draai zo dat de bewegingsrichting horizontaal ligt, smeer langs x, draai terug
    r = ndimage.rotate(a, -hoek, axes=(1, 0), reshape=False, order=1, mode='reflect')
    x = np.linspace(0, 1, L)
    kern = (1 - staart) * np.ones(L) + staart * (1 - x) ** 1.6
    kern /= kern.sum()
    r = ndimage.convolve1d(r, kern, axis=1, mode='nearest', origin=int(staart * L * .35))
    r = ndimage.rotate(r, hoek, axes=(1, 0), reshape=False, order=1, mode='reflect')
    r = r[P:-P, P:-P]
    uit = Image.fromarray((srgb(r) * 255 + .5).astype(np.uint8))
    return uit.resize((W, H), Image.LANCZOS)

def laad(pad): return Image.open(BRON / pad).convert('RGB')

KLUSSEN = {
    # naam: (bron, hoek, lengte, staart)
    'p13': ('NONSTD/Hoodie/On-model.jpg', 53.13, .16, .55),
    'p15': ('Room 84/T-shirt/On-model.jpg', 0, .26, 1.0),   # achtergordijnflits: zie flitsspoor()
    'p17': ('NONSTD/Pants/On-model.jpg', 0, .2, .65),
    'p19': ('NONSTD/Hoodie/Detail.jpg', 53.13, .55, .2),
}

def flitsspoor(im, masker, lengte):
    """Poster 15 (Lucas, lijst 74: "andere achtergrond foto of geen tekstlogo"): een flits aan het eind van een lange
    sluitertijd. Het figuur staat scherp (de flits), op de muur ernaast blijft een spoor achter: alleen waar het spoor
    donkerder is dan de muur (lineair licht, min). Het masker is het figuur, lokaal uitgeknipt met rembg (birefnet)."""
    from PIL import ImageFilter
    sp = bewogen(im, 0, lengte, schaal=.35, staart=1)
    a = lin(np.asarray(im).astype(np.float32) / 255); b = lin(np.asarray(sp).astype(np.float32) / 255)
    m = (np.asarray(masker.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255)[..., None]
    r = m * a + (1 - m) * np.minimum(a, b)
    return Image.fromarray((srgb(r) * 255 + .5).astype(np.uint8))

def main(welke):
    for naam, (pad, hoek, lengte, staart) in KLUSSEN.items():
        if welke and naam not in welke: continue
        im = laad(pad)
        im.save(UIT / f'{naam}-scherp.jpg', quality=93)
        if naam == 'p15':
            flitsspoor(im, Image.open(UIT / 'p15-masker.png').convert('L'), lengte).save(UIT / f'{naam}-bewogen.jpg', quality=93)
        else:
            bewogen(im, hoek, lengte, staart=staart).save(UIT / f'{naam}-bewogen.jpg', quality=93)
        print(naam, im.size)

if __name__ == '__main__':
    main(sys.argv[1:])
