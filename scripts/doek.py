"""VISUAILS — het grote doek (lijst 124, 16 november 2026).
Lucas, 20:30: "dat space achtige gevoel met film grain en rust met het logo erop. Weer een groot canvas maken met een
design dat het gevoel van het voorbeeld geeft en daar allemaal stukken uitknippen zodat alles hetzelfde gevoel krijgt."
Het voorbeeld is het bureaublad uit pakket 89: een donkere ruimte, één brede zijden golf van licht, een warme gloed in
één hoek, fijne filmkorrel. Hier in de kleuren van levering 100 (zwart, wit, mint), in drie richtingen.

    python3 doek.py <richting A|B|C> <breed> <hoog> <uit.png> [korrel 0|1]
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

def hex3(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255

ZW, M950, M900, M800, M700, M600, M500, M300, M100 = map(hex3, ['090D0B', '01140B', '002416', '023D29', '016645', '11976A', '3DFFB0', '9DF5D2', 'E4FCEF'])
WIT = np.ones(3)
GRAFIET = hex3('1A1F1D')
ZILVER = hex3('C9D2CE')

RICHTING = {
    # A · nacht en mint: zwart met een diepgroene nevel, een zilveren golf met een mint rand, mint gloed in een hoek
    'A': dict(grond=[ZW, M950, M900], nevel=M800, golf=WIT, rand=M300, gloed=M600, kern=M300, gloedSterk=.55),
    # B · zwart en zilver: grafiet, een zilverwitte golf, alleen een zweem mint in één hoek (het stilst)
    'B': dict(grond=[ZW, GRAFIET * .8, GRAFIET], nevel=GRAFIET * 1.4, golf=WIT, rand=ZILVER, gloed=M800, kern=M600, gloedSterk=.35),
    # C · diep groen: de grond zelf groen, een licht mint golf, een felle mint gloed (het dichtst bij de kleur van het voorbeeld)
    'C': dict(grond=[M950, M900, M800], nevel=M700, golf=M100, rand=M300, gloed=M500, kern=M100, gloedSterk=.6),
}

def ruis(h, w, schaal, zaad):
    rng = np.random.default_rng(zaad)
    k = rng.random((max(2, h // schaal + 3), max(2, w // schaal + 3)))
    k = gaussian_filter(k, 1)
    im = Image.fromarray((k * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    a = np.asarray(im, float) / 255
    return (a - a.min()) / (a.max() - a.min() + 1e-9)

def golf(X, Y, W, H, pts, dikte, zaad):
    """Een zijden golf: een vloeiende lijn door pts (in fracties), met een felle kam, een brede gloed en een schaduwkant."""
    xs = np.array([p[0] for p in pts]) * W; ys = np.array([p[1] for p in pts]) * H
    from scipy.interpolate import CubicSpline
    cs = CubicSpline(xs, ys, bc_type='natural')
    yl = cs(X[0]); dy = cs(X[0], 1)
    d = (Y - yl[None, :]) / np.sqrt(1 + dy[None, :] ** 2)        # afstand loodrecht op de lijn, ongeveer
    s = dikte * H
    kam = np.exp(-(d / (s * .42)) ** 2)            # een brede, zachte kam: zijde, geen draad
    gloed = np.exp(-(d / (s * 1.1)) ** 2)
    licht = np.exp(-((d + s * .9) / (s * 1.8)) ** 2)             # de lichte kant boven de kam
    schaduw = 1 / (1 + np.exp(-(d - s * .5) / (s * .45)))        # onder de kam zakt het weg
    # langs de lijn: hier feller, daar zwakker (zoals licht op zijde)
    langs = .55 + .45 * ruis(1, X.shape[1], max(8, X.shape[1] // 5), zaad)[0][None, :]
    return kam * langs, gloed * langs, licht * langs, schaduw

def maak(richting, W, H, korrel=True, zaad=7):
    R = RICHTING[richting]
    Y, X = np.mgrid[0:H, 0:W].astype(float)
    n1, n2, n3 = ruis(H, W, W // 6, zaad), ruis(H, W, W // 3, zaad + 1), ruis(H, W, W // 10, zaad + 2)
    g0, g1, g2 = R['grond']
    t = np.clip(.55 * (X / W) + .25 * (Y / H) + .35 * (n1 - .5), 0, 1)[..., None]
    c = g0 * (1 - t) + g1 * t
    c = c * (1 - .5 * n2[..., None] ** 2) + g2 * (.5 * n2[..., None] ** 2)
    c = c * (1 - .25 * n3[..., None]) + R['nevel'] * (.25 * n3[..., None] * n2[..., None])
    # de golven: één grote die het hele doek over gaat, en twee kleinere, zodat elk stuk een eigen deel heeft
    golven = [
        ([(0, .1), (.2, .27), (.42, .5), (.64, .62), (.84, .66), (1, .7)], .12, 1.0),
        ([(0, .86), (.3, .8), (.6, .9), (1, 1.02)], .1, .35),
    ]
    for i, (pts, dk, sterk) in enumerate(golven):
        kam, gl, li, sch = golf(X, Y, W, H, pts, dk, zaad + 10 + i)
        c = c * (1 - .35 * sterk * sch[..., None] * gl[..., None])
        c = c + R['rand'] * (.22 * sterk * li[..., None]) + R['rand'] * (.25 * sterk * gl[..., None])
        c = c * (1 - .42 * sterk * kam[..., None]) + R['golf'] * (.42 * sterk * kam[..., None])
    # de gloed in de hoek (rechtsonder), zoals het warme licht in het voorbeeld
    gx, gy = .86 * W, .9 * H
    gd = np.sqrt(((X - gx) / (.45 * W)) ** 2 + ((Y - gy) / (.55 * H)) ** 2)
    gl = np.exp(-gd ** 2 * 1.6) * R['gloedSterk']
    c = c * (1 - gl[..., None]) + R['gloed'] * gl[..., None]
    kd = np.exp(-gd ** 2 * 7) * R['gloedSterk'] * .5
    c = c * (1 - kd[..., None]) + R['kern'] * kd[..., None]
    # vignet
    vd = np.sqrt(((X / W) - .45) ** 2 + ((Y / H) - .45) ** 2)
    c = c * (1 - .45 * np.clip(vd - .25, 0, 1)[..., None])
    if korrel:
        rng = np.random.default_rng(zaad + 99)
        k = rng.normal(0, 1, (H, W))
        lum = (c @ np.array([.2126, .7152, .0722]))
        c = c + (k * (.022 + .05 * lum))[..., None]
    return np.clip(c, 0, 1)

if __name__ == '__main__':
    r, W, H, uit = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    korrel = (sys.argv[5] if len(sys.argv) > 5 else '1') == '1'
    a = maak(r, W, H, korrel)
    Image.fromarray((a * 255 + .5).astype(np.uint8)).save(uit)
    print(uit, W, H)
