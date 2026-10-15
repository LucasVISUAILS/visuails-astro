"""
VISUAILS — het pad van de pen in stap 2 "Wij maken" (voorpagina). 15 oktober 2026.

Lucas: "de 2e stap 'we create' wat meer een handmatig gevoel te geven dat de klant echt
ziet dat het met de hand word gedaan de achtergrond en de Shadow en ook erbij aan te
tonen dat dit voor optimale consistentie zorgt."

Leest de uitsnede (public/img/ba2-na-front-uitgeknipt.webp, 760 × 760) en schrijft
src/data/maakPad.js: de omtrek van de broek als SVG-pad (de lijn die de pen trekt),
de ankerpunten erop, en de hulplijnen (boven, onder, midden) — GEMETEN uit de uitsnede
van de voorkant én het masker van de achterkant (scripts/grijze-set.py); die liggen op
1 à 2 px na op elkaar, en dat is precies wat de hulplijnen laten zien.

    python scripts/maak-pad.py
"""
import os
import numpy as np, cv2
from PIL import Image

HIER = os.path.dirname(__file__)
IMG = os.path.join(HIER, '..', 'public', 'img')
a = np.asarray(Image.open(os.path.join(IMG, 'ba2-na-front-uitgeknipt.webp')))[..., 3]
m = (a > 128).astype(np.uint8)
cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cs, key=cv2.contourArea)
# Beginnen linksboven aan de tailleband: daar zet je de pen neer.
pts = c[:, 0, :]
start = int(np.argmin(pts[:, 0] + pts[:, 1]))
pts = np.roll(pts, -start, axis=0)
gl = cv2.approxPolyDP(pts.reshape(-1, 1, 2).astype(np.int32), 2.2, True)[:, 0, :]
d = 'M' + ' L'.join(f'{x} {y}' for x, y in gl) + ' Z'
# Ankers: de hoekpunten zelf, zoals de pen ze zet, met het deel van de omtrek waar de
# pen er langskomt (voor de vertraging in de animatie).
lengte = np.cumsum(np.r_[0, np.linalg.norm(np.diff(np.vstack([gl, gl[:1]]), axis=0), axis=1)])
totaal = float(lengte[-1])
ankers = [(int(x), int(y), float(lengte[i])) for i, (x, y) in enumerate(gl)]
ys, xs = np.nonzero(m)
boven, onder, links, rechts = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
midden = round((links + rechts) / 2)
uit = f"""// GEGENEREERD door scripts/maak-pad.py — niet met de hand aanpassen.
// De omtrek van de roze jeans (voorkant, 760 × 760) en de hulplijnen, gemeten uit de uitsnede.
export const MAAT = 760;
export const PAD = '{d}';
/** [x, y, deel van de omtrek 0–1]: wanneer de pen er langskomt. */
export const ANKERS = {[[x, y, float(round(l / totaal, 3))] for x, y, l in ankers]};
export const LIJNEN = {{ boven: {boven}, onder: {onder}, links: {links}, rechts: {rechts}, midden: {midden} }};
"""
open(os.path.join(HIER, '..', 'src', 'data', 'maakPad.js'), 'w').write(uit)
print(len(gl), 'punten,', len(ankers), 'ankers, lijnen', boven, onder, midden)
