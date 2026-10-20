# VISUAILS — bewogen achtergronden voor de sfeervlakken (levering 62, afvinklijst 42, 19 oktober 2026).
#
# Lucas: geen vlakken in één volle kleur meer, maar een afbeelding met motion blur. Alleen zijn
# eigen foto's uit public/img; dit script beweegt ze en zet ze in schema A. De korrel zit niet in
# het beeld maar in hal.css (--h-korrel-fijn): dan blijft hij fijn op elk scherm en weegt een
# beeld 10 tot 30 KB in plaats van 150.
#   - licht:  de foto op nevel (#F2F2F2), muur weggewerkt, kleuren buiten violet naar grijs,
#             dan 62 % foto en 38 % nevel, zodat het een lichte grond blijft;
#   - sluiter: strepen langs de beweging met een scherpere flits erdoorheen (je ziet een mens) —
#             op de vlakken met een groot getal of lege ruimte;
#   - stroom: een lange beweging waarin het figuur oplost — achter kaarten met tekst;
#   - glas:   het €1-blok: een donker figuur met een lila spookrand op nevel, onder het violette
#             glaspaneel uit hal.css;
#   - violet: de voet: een toon van zwart naar #4400FF.
# Waar de figuur staat (x, hoogte) is per beeld gekozen zodat de tekst op rustige grond staat;
# de contrastmeting staat in kladblok/levering-62. Kies een foto met een lichte muur: een donkere
# grond wordt bij het wegwerken van de muur een lichte, en dan wordt het figuur een negatief
# (voor een licht figuur op een donkere grond is er negatief=True, zoals bij Flash).
#
#   python3 scripts/maak-achtergronden.py            → alle beelden in public/img/achter/
#   python3 scripts/maak-achtergronden.py home-sluiter nf   → alleen deze
# Vereist: numpy en Pillow (pip install numpy pillow).
import sys, os
import numpy as np
from PIL import Image, ImageFilter

HIER = os.path.dirname(os.path.abspath(__file__))
BRON = os.path.join(HIER, '..', 'public', 'img')
UIT = os.path.join(BRON, 'achter')

def hexk(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)
NEVEL = hexk('F2F2F2'); INKT = hexk('050505'); LILA = hexk('8F66FF'); VIOLET = hexk('4400FF')

# ── gereedschap ──────────────────────────────────────────────────────────────
def lees(naam):
    return np.asarray(Image.open(os.path.join(BRON, naam)).convert('RGB')).astype(np.float32) / 255

def naar_beeld(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8))

def gauss(a, r):
    return np.asarray(naar_beeld(a).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255

def _box(a, n, as_):
    if n < 2: return a
    pad = [(0, 0)] * a.ndim; pad[as_] = (n // 2, n - n // 2)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=as_, dtype=np.float64)
    r = (c[n:] - c[:-n]) if as_ == 0 else (c[:, n:] - c[:, :-n])
    return (r / n).astype(np.float32)

def beweeg(a, lengte, passes=3):
    """Horizontale motion blur: drie keer een box-blur, samen bijna een gauss langs x."""
    n = max(2, int(lengte / passes)); b = a
    for _ in range(passes): b = _box(b, n, 1)
    return b

def schuif(a, dx, vul):
    """Horizontaal verschuiven zonder rondlopen: wat binnenkomt is `vul` (np.roll zou de andere
    rand van het beeld naar binnen halen)."""
    b = np.roll(a, dx, axis=1)
    if dx > 0: b[:, :dx] = vul
    elif dx < 0: b[:, dx:] = vul
    return b

def helder(a):
    return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722

def grijs_behalve_violet(a):
    """Kleuren buiten het violet (tint 235°–290°) naar grijs met dezelfde helderheid; violet blijft."""
    mx = a.max(-1); mn = a.min(-1); d = mx - mn + 1e-6
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    violet = np.clip(1 - np.abs(h - 262) / 30, 0, 1) * np.clip(d * 3, 0, 1)
    L = helder(a)[..., None]
    return a * violet[..., None] + L * (1 - violet[..., None])

def doek(naam, W, H, x, hoog, y=0.0, spiegel=False, negatief=False):
    """De foto op een doek van W×H: hoogte H*hoog, midden op x; de muur van de foto wordt nevel
    (per kanaal schalen, zodat een donkere lucht licht wordt en het figuur donker blijft)."""
    im = Image.open(os.path.join(BRON, naam)).convert('RGB')
    if spiegel: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    h = int(H * hoog); w = int(im.width * h / im.height)
    a = np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255
    if negatief: a = 1 - a                 # een licht figuur op een donkere grond wordt een schaduw
    a = grijs_behalve_violet(a)
    rand = np.concatenate([a[:, :max(2, w // 25)].reshape(-1, 3), a[:, -max(2, w // 25):].reshape(-1, 3), a[:max(2, h // 25)].reshape(-1, 3)])
    muur = np.median(rand, axis=0)
    a = np.clip(a * (NEVEL / np.maximum(muur, .05)), 0, 1)
    uit = np.ones((H, W, 3), np.float32) * NEVEL
    x0 = int(W * x - w / 2); y0 = int(H * y)
    sx0, sy0 = max(0, -x0), max(0, -y0); dx0, dy0 = max(0, x0), max(0, y0)
    ww = min(w - sx0, W - dx0); hh = min(h - sy0, H - dy0)
    stuk = a[sy0:sy0 + hh, sx0:sx0 + ww]
    # de randen van de foto zacht laten overlopen in de nevel (80 px)
    # (alleen waar die rand binnen het doek valt)
    z = 80.0
    def helling(n): return np.clip(np.arange(n, dtype=np.float32) / z, 0, 1)
    m = np.ones((hh, ww), np.float32)
    if dx0 > 0: m *= helling(ww)[None, :]
    if dx0 + ww < W: m *= helling(ww)[::-1][None, :]
    if dy0 > 0: m *= helling(hh)[:, None]
    if dy0 + hh < H: m *= helling(hh)[::-1][:, None]
    m = m[..., None]
    uit[dy0:dy0 + hh, dx0:dx0 + ww] = stuk * m + NEVEL * (1 - m)
    return uit

def bewaar(a, id_, q=80):
    os.makedirs(UIT, exist_ok=True)
    p = os.path.join(UIT, id_ + '.webp')
    naar_beeld(a).save(p, 'WEBP', quality=q, method=6)
    print(f'{id_:28s} {a.shape[1]}×{a.shape[0]}  {os.path.getsize(p) // 1024} KB')

# ── de drie soorten ──────────────────────────────────────────────────────────
def licht(id_, bron, modus, x=.88, hoog=1.0, y=0.0, spiegel=False, negatief=False, W=1800, H=1100, gloed=.5, sterkte=.62):
    a = doek(bron, W, H, x, hoog, y, spiegel, negatief)
    if modus == 'sluiter':
        strepen = beweeg(a, W * .14)
        flits = schuif(gauss(a, 2.0), int(W * .012), NEVEL)
        a = strepen * .66 + flits * .34
    else:  # stroom
        a = beweeg(a, W * .30, 4)
        a = gauss(a, 10) * .7 + beweeg(a, W * .12) * .3
    # violet alleen als gloed: een verschoven, vage kopie van het figuur, achter het figuur langs
    f = np.clip(1 - helder(a) / helder(NEVEL[None, None, :])[0, 0], 0, 1)
    g = schuif(beweeg(f[..., None].repeat(3, -1), W * .20)[..., 0], -int(W * .035), 0)
    g = gauss(g[..., None].repeat(3, -1), 16)[..., 0]
    g = np.clip((g - f * .9) * 2.2, 0, 1)[..., None] * gloed
    a = a * (1 - g) + VIOLET * g
    a = a * sterkte + NEVEL * (1 - sterkte)   # 62 %: een lichte grond, het figuur als schim
    bewaar(a, id_)

def glas(id_, bron, W, H, x, hoog, y, lengte, spook_dx, spiegel=False, zaad=7, uitloop=None):
    im = Image.open(os.path.join(BRON, bron)).convert('RGB')
    if spiegel: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    h = int(H * hoog); w = int(im.width * h / im.height)
    L = helder(np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255)
    d = np.ones((H, W), np.float32)
    x0 = int(W * x - w / 2); y0 = int(H * y)
    sx0, sy0 = max(0, -x0), max(0, -y0); dx0, dy0 = max(0, x0), max(0, y0)
    ww = min(w - sx0, W - dx0); hh = min(h - sy0, H - dy0)
    d[dy0:dy0 + hh, dx0:dx0 + ww] = L[sy0:sy0 + hh, sx0:sx0 + ww]
    m = np.clip((d - .55) / .30, 0, 1)
    f = 1 - (m + (1 - m) * d * .55)                    # hoeveel figuur (0 = muur)
    if uitloop:
        yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
        t = np.clip((uitloop[1] - yy) / (uitloop[1] - uitloop[0]), 0, 1); f = f * (t * t * (3 - 2 * t))
    f3 = f[..., None].repeat(3, -1)
    s = beweeg(f3, lengte)[..., 0]
    f2 = np.clip(s * .72 + gauss(np.clip(f3, 0, 1), 2.2)[..., 0] * .38, 0, 1)
    ruis = np.random.default_rng(zaad).random((H, W)).astype(np.float32)
    f2 = np.clip(f2 + (ruis - .5) * np.clip(s * (1 - s) * 4, 0, 1) * .55, 0, 1)
    sp = schuif(beweeg(f3, lengte * 1.6)[..., 0], spook_dx, 0)
    spook = np.clip(gauss(np.clip(sp - f2 * 1.1, 0, 1)[..., None].repeat(3, -1), 6)[..., 0] * 2.4, 0, 1)
    a = NEVEL * (1 - f2[..., None]) + INKT * f2[..., None]
    a = a * (1 - spook[..., None] * .9) + LILA * spook[..., None] * .9
    bewaar(a, id_)

def violet(id_, bron, W=2400, H=1400, x=.88, hoog=1.1, y=-.05):
    """De voet: het figuur als een donkere stroom in het violet (zwart → #4400FF)."""
    a = doek(bron, W, H, x, hoog, y)
    a = beweeg(a, W * .42, 4)
    a = gauss(a, 6) * .4 + beweeg(a, W * .18) * .6
    L = helder(a) * .78 + .22                 # niet zwarter dan een diep violet
    stops = [(0, '03000F'), (.25, '14004D'), (.55, '2E00B3'), (.85, '4400FF'), (1, '4C0DFF')]
    t = np.array([s for s, _ in stops], np.float32); k = np.array([hexk(c) for _, c in stops])
    a = np.stack([np.interp(L, t, k[:, i]) for i in range(3)], -1)
    bewaar(a, id_)

# ── welk beeld waar (per soort pagina een eigen foto; €1-blok en voet één vast beeld) ──
BEELDEN = {
    # vast
    'glas-proef':        lambda i: glas(i, 'lifestyle-glow-05.webp', 2400, 1200, .34, 1.35, -.08, 230, -46),
    'glas-proef-tel':    lambda i: glas(i, 'lifestyle-glow-05.webp', 800, 1800, .62, 1.05, .04, 110, -26, zaad=5),
    'voet':              lambda i: violet(i, 'hal/sfeer-4x5.webp'),
    # prijzen, abonnementen, vergelijken, abonnementsformulier
    'prijs-sluiter':     lambda i: licht(i, 'hal/sfeer-4x5.webp', 'sluiter', x=.88),
    'prijs-stroom':      lambda i: licht(i, 'hal/sfeer-4x5.webp', 'stroom', x=.84),
    # contact, edities, studio, home, 404, juridisch, over
    'contact':           lambda i: licht(i, 'banners-11.webp', 'sluiter', x=.88),
    'edities-sluiter':   lambda i: licht(i, 'custom-models-02.webp', 'sluiter', x=.88),
    'edities-stroom':    lambda i: licht(i, 'custom-models-02.webp', 'stroom', x=.84),
    'studio-sluiter':    lambda i: licht(i, 'lifestyle-glow-04.webp', 'sluiter', x=.88, spiegel=True),
    'studio-stroom':     lambda i: licht(i, 'lifestyle-glow-04.webp', 'stroom', x=.84, spiegel=True),
    'home-sluiter':      lambda i: licht(i, 'lifestyle-glow-02.webp', 'sluiter', x=.88),
    'home-stroom':       lambda i: licht(i, 'lifestyle-glow-02.webp', 'stroom', x=.50),   # midden: rechtsboven staat een link
    'nf':                lambda i: licht(i, 'banners-10.webp', 'sluiter', x=.90, sterkte=.5),
    'juridisch':         lambda i: licht(i, 'custom-models-05.webp', 'sluiter', x=.88, hoog=.85, y=.15),
    'over-sluiter':      lambda i: licht(i, 'ba2-na-model-wit.webp', 'sluiter', x=.88),
    'over-stroom':       lambda i: licht(i, 'ba2-na-model-wit.webp', 'stroom', x=.84),
    # merkmodel en modellen; uploadrichtlijnen en proef
    'merkmodel':         lambda i: licht(i, 'custom-models-03.webp', 'stroom', x=.86, sterkte=.45),
    'upload':            lambda i: licht(i, 'catalog-before.webp', 'stroom', x=.84),
    # lookpagina's: een beeld van die look
    'look-classic':      lambda i: licht(i, 'catalog-after.webp', 'stroom', x=.84),
    'look-catalog-custom': lambda i: licht(i, 'ba2-na-front.webp', 'stroom', x=.84),
    'look-lifestyle-custom': lambda i: licht(i, 'banners-13.webp', 'stroom', x=.84),
    'look-dunes':        lambda i: licht(i, 'lifestyle-dunes-01.webp', 'stroom', x=.84),
    'look-flash':        lambda i: licht(i, 'lifestyle-flash-03.webp', 'stroom', x=.84, negatief=True),
    'look-glow':         lambda i: licht(i, 'lifestyle-glow-05.webp', 'stroom', x=.84, spiegel=True),
    'look-phone-made':   lambda i: licht(i, 'lifestyle-phone-made-05.webp', 'stroom', x=.84),
    # video: de hub, de drie stijlen, en de plekken waar een clip komt
    'video':             lambda i: licht(i, 'banners-15.webp', 'stroom', x=.84),
    'video-campaign':    lambda i: licht(i, 'banners-04.webp', 'stroom', x=.84),
    'video-custom':      lambda i: licht(i, 'banners-14.webp', 'stroom', x=.84),
    'video-lifestyle':   lambda i: licht(i, 'lifestyle-dunes-02.webp', 'stroom', x=.84),
    'video-motion':      lambda i: licht(i, 'banners-01.webp', 'stroom', x=.84),
    'klip-campaign':     lambda i: licht(i, 'custom-models-01.webp', 'stroom', x=.50, W=900, H=1100, sterkte=.38),
    'klip-lifestyle':    lambda i: licht(i, 'lifestyle-dunes-02.webp', 'stroom', x=.50, W=900, H=1100, sterkte=.38),
    'klip-motion':       lambda i: licht(i, 'banners-01.webp', 'stroom', x=.50, W=900, H=1100, sterkte=.38),
    'hooks':             lambda i: licht(i, 'banners-05.webp', 'stroom', x=.84),
}

if __name__ == '__main__':
    welke = sys.argv[1:] or list(BEELDEN)
    for i in welke:
        BEELDEN[i](i)
