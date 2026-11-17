"""VISUAILS — de stukken van het doek voor de kaarten op de site (levering 115, 17 november 2026, lijst 124).

Lucas koos in lijst 124: doek A (nacht en mint), stille korrel, alles naar het doek. Het doek zelf maakt scripts/doek.py
(3200 × 1800). Voor de kaarten op de site gaat het licht omlaag: witte tekst moet op elk punt van een kaart minstens
4,5 : 1 halen, dus geen punt lichter dan relatieve luminantie 0,18 (wit: 1,05 / 0,23 = 4,57). Boven 0,07 loopt het licht
zacht af naar 0,14 (tanh; ruimte voor de korrel, die er in css overheen ligt en hoogstens 9 % lichter maakt), zodat de golf en de gloed er nog zijn, alleen gedempt. De korrel ligt er in css overheen (public/img/doek/korrel.webp, één tegel voor alle kaarten), zodat de stukken klein blijven.
Acht stukken uit hetzelfde doek, elk 1440 × 900, op verschillende plekken, zodat elke kaart een eigen stuk heeft.

    python3 scripts/doek.py A 3200 1800 /tmp/doek-A.png
    python3 scripts/doek-stukken.py /tmp/doek-A.png public/img/doek
"""
import sys, os
import numpy as np
from PIL import Image

bron, uit = sys.argv[1], sys.argv[2]
os.makedirs(uit, exist_ok=True)
a = np.asarray(Image.open(bron).convert('RGB'), float) / 255

def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055)

l = lin(a)
L = l @ np.array([.2126, .7152, .0722])
K, T = 0.07, 0.14
Ln = np.where(L > K, K + (T - K) * np.tanh((L - K) / (T - K)), L)
f = np.where(L > 1e-6, Ln / np.maximum(L, 1e-6), 1)
b = np.clip(srgb(l * f[..., None]), 0, 1)
H, W = b.shape[:2]
# (x, y) van de linkerbovenhoek, als breukdeel van wat er over is; elk stuk 1440 × 900 (45 % van de breedte)
PLEK = [(0, 0), (1, 1), (.45, .55), (.15, .9), (.85, .25), (.6, 0), (.3, .35), (1, .7)]
sw, sh = 1440, 900
for i, (px, py) in enumerate(PLEK):
    x, y = round(px * (W - sw)), round(py * (H - sh))
    stuk = b[y:y + sh, x:x + sw]
    Ls = (lin(stuk) @ np.array([.2126, .7152, .0722])).max()
    Image.fromarray((stuk * 255 + .5).astype(np.uint8)).save(f'{uit}/stuk-{i}.webp', 'WEBP', quality=82, method=6)
    print(f'stuk-{i}.webp  lichtste punt L {Ls:.3f}  wit erop {(1.05) / (Ls + .05):.2f} : 1')
