# Opnamefout (alleen in de film, niet in de browser): tijdens de wachttijd van zijn animatie staat elk deel van Wat we
# maken al half in beeld. Per deel (gevonden in het laatste beeld) wordt dat stuk in die beelden het witte beeld ervoor.
import sys, glob
import numpy as np
from PIL import Image
map_ = sys.argv[1]
fs = sorted(glob.glob(f'{map_}/f*.png'))
laatste = np.asarray(Image.open(fs[-1]).convert('L')).astype(int)
H, W = laatste.shape
donker = laatste < 235
donker[:70] = False                                     # de balk
rijen = donker.any(axis=1)
banden, y = [], 0
while y < H:
    if rijen[y]:
        y0 = y
        while y < H and rijen[y:y + 12].any(): y += 1
        banden.append((y0, y))
    y += 1
delen = []
for (y0, y1) in banden:
    kol = donker[y0:y1].any(axis=0)
    x, stukken = 0, []
    while x < W:
        if kol[x]:
            x0 = x
            while x < W and kol[x:x + 40].any(): x += 1
            stukken.append((x0, x))
        x += 1
    for (x0, x1) in stukken: delen.append((max(0, x0 - 6), max(0, y0 - 6), min(W, x1 + 6), min(H, y1 + 6)))
print('delen', delen)
beelden = [np.asarray(Image.open(f).convert('RGB')) for f in fs]
grijs = [b.mean(axis=2) for b in beelden]
wit = next(i for i in range(100, len(fs)) if beelden[i][H - 20, W // 2, 0] >= 248)
aangepast = {}
for (x0, y0, x1, y1) in delen:
    d = [255 - g[y0:y1, x0:x1].mean() for g in grijs]
    basis = d[wit]
    eerste = next((i for i in range(wit, len(fs)) if d[i] > basis + 0.6), None)
    if eerste is None: continue
    # de bevroren reeks: beelden met precies dezelfde stand, vanaf het eerste beeld waarin het deel te zien is
    herstart = eerste + 1
    while herstart < len(fs) and abs(d[herstart] - d[eerste]) < 0.05: herstart += 1
    if herstart - eerste < 2 or herstart - eerste > 20: continue
    for i in range(eerste, herstart):
        b = aangepast.setdefault(i, beelden[i].copy())
        b[y0:y1, x0:x1] = beelden[eerste - 1][y0:y1, x0:x1]
    print('deel', (x0, y0, x1, y1), 'beelden', eerste, '..', herstart - 1)
for i, b in aangepast.items(): Image.fromarray(b).save(fs[i])
print(len(aangepast), 'beelden aangepast')
