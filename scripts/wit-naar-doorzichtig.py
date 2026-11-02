"""VISUAILS — een foto op een witte grond doorzichtig maken (levering 79, 1 november 2026).

    python3 scripts/wit-naar-doorzichtig.py <in> <uit.png|uit.webp>

Voor foto's waarvan de grond precies wit is (#FFFFFF, zoals public/img/hal/pov-2304.webp na
scripts/laptop-foto.py). Sinds levering 79 is de grond van de site #F4F7FD; een foto met een
ingebakken witte grond wordt daarop een wit blok. Doorzichtig is altijd exact de grond, ook als die
later verandert.

De ontmenging (dezelfde als voor de laptopfoto van de opening, kladblok/levering-79/LEESMIJ.md):
- de kern (handen, laptop, telefoon): duidelijk donker (helderheid < 170). Die blijft onaangeroerd.
- de grond: alles wat vanaf de rand bereikbaar is zonder door de kern te gaan. Een pixel daar is
  een menging van het voorwerp O (de kleur van de dichtstbijzijnde kernpixel) en wit:
  I = a·O + (1 − a)·255, dus a = (255 − I) / (255 − O). De kleur wordt (I − (1 − a)·255) / a.
  Zo blijven de randen zacht en komt er geen witte zoom op een grijze grond.
- wat ingesloten is (de schermen, binnen de rand van het toestel) blijft dekkend.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

bron, uit = sys.argv[1], sys.argv[2]
I = np.asarray(Image.open(bron).convert('RGB')).astype(np.float32)
L = I.mean(2)
kern = L < 170
grens = ndi.binary_dilation(kern, iterations=6)
lab, _ = ndi.label(~grens)
rand = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
rand = rand[rand > 0]
buiten = np.isin(lab, rand)
# de zoom rond de kern hoort bij de grond als hij aan de grond grenst (niet ingesloten)
zoom = grens & ~kern
lab2, _ = ndi.label(zoom | buiten)
rand2 = np.unique(lab2[buiten])
grond = np.isin(lab2, rand2[rand2 > 0]) & ~kern

idx = ndi.distance_transform_edt(~kern, return_distances=False, return_indices=True)
O = I[idx[0], idx[1]]
OL = O.mean(2)
a = np.ones(L.shape, np.float32)
ag = np.clip((255.0 - L) / np.maximum(255.0 - OL, 20.0), 0, 1)
ag[L >= 253] = 0.0            # de grond zelf (en ruis van een gecomprimeerd wit) telt niet mee
a[grond] = ag[grond]
C = np.where(a[..., None] > 0, (I - (1.0 - a[..., None]) * 255.0) / np.maximum(a[..., None], 1e-6), 0)
C = np.clip(np.rint(C), 0, 255).astype(np.uint8)
A = np.rint(a * 255).astype(np.uint8)
out = Image.fromarray(np.dstack([C, A]), 'RGBA')
if uit.endswith('.webp'):
    out.save(uit, lossless=True, quality=100, method=6)
else:
    out.save(uit, optimize=True)
print(uit, out.size, 'doorzichtig', round(float((A == 0).mean()) * 100, 1), '%')
