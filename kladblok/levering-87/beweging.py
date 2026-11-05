# VISUAILS · levering 87 (4 november 2026): hoe snel beweegt de laptopvideo per beeld?
#
#   python3 kladblok/levering-87/beweging.py <werkmap met dekking/000.png … 110.png>
#
# Lucas (lijst 74): de laptopsectie blijft staan en het scrollen speelt de animatie af. Dan moet elke centimeter scrollen
# ongeveer even veel beweging geven: de video begint bijna stil (de klep, beeld 0 – 11), heeft een adem (47 – 58) en eindigt
# snel (de laptop gaat links het beeld uit, de telefoon rechts). Dit script meet in de dekkingsband:
#   energie  het gemiddelde verschil tussen twee beelden (de klep die dichtgaat)
#   vaart    hoe ver de laptop (zwaartepunt links) of de telefoon (rechts) per beeld zijdelings schuift, als breukdeel van de
#            breedte; daaruit komt de bewegingsonscherpte in src/scripts/laptopdoek.js
#   loop     de opgetelde beweging per beeld (0 → 1): HalOpening80.astro zet de scroll hiermee om in een beeld, met een
#            vloer van 0,22 zodat ook de stille beelden een stukje scroll krijgen
# Schrijft vaart en loop in src/data/laptopVideo.json.
import json, sys, pathlib
import numpy as np
from PIL import Image

werk = pathlib.Path(sys.argv[1])
prev = None; energie = []; lx = []; rx = []; massa = []
for i in range(111):
    a = np.asarray(Image.open(werk / 'dekking' / f'{i:03d}.png').resize((736, 312))).astype(np.float32) / 255
    a = a[52:]                                   # zonder de lege bovenkant (206 van de 1248 rijen)
    w = a.shape[1]; xs = np.arange(w)[None, :]; g = int(w * .62)
    L, R = a[:, :g], a[:, g:]
    lx.append((L * xs[:, :g]).sum() / max(L.sum(), 1e-6))
    rx.append((R * xs[:, g:]).sum() / max(R.sum(), 1e-6) if R.sum() > 5 else np.nan)
    massa.append(float(a.mean()))
    if prev is not None: energie.append(float(np.abs(a - prev).mean()))
    prev = a
e = np.array(energie) * 1000
massa = np.array(massa)
dl = np.where(massa[1:] > .004, np.abs(np.diff(lx)), 0)       # bijna niets meer in beeld: geen zwaartepunt
dr = np.nan_to_num(np.abs(np.diff(np.array(rx, dtype=float))))
vaart = np.minimum(np.maximum(dl, dr) / 736, .012)
gewicht = np.clip(.22 + e / 20 + vaart * 736 / 6, .22, 1.6)
loop = np.concatenate([[0], np.cumsum(gewicht)]); loop /= loop[-1]

p = pathlib.Path(__file__).resolve().parents[2] / 'src' / 'data' / 'laptopVideo.json'
d = json.loads(p.read_text())
d['vaart'] = [round(float(v), 5) for v in np.concatenate([[0], vaart])]
d['loop'] = [round(float(v), 4) for v in loop]
p.write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
print('vaart en loop in', p)
