"""VISUAILS — het licht achter de bannerkop, per videobeeld (levering 120, ronde 2, 19 november 2026).

Meet met ffmpeg op public/img/hal/banner/banner-1920.mp4, in het klein (384 x 216, elk punt 5 x 5 videopunten), in het vak
waar de kop op een breed scherm staat (3,3 - 36 % van de breedte, 17 - 49 % van de hoogte van de video): per beeld het licht
(lineair, WCAG) van het donkerste 40 % en het lichtste 40 % van dat vak, zoals de oude kopKleur (levering 115). Beide
gaan terug naar een byte (0 - 255, sRGB-gecodeerd) en samen als base64 naar KOP_LICHT in src/data/banner94.js.
Draai opnieuw als de video verandert:   python3 scripts/kop-licht-120.py
"""
import base64, subprocess, sys
import numpy as np

VIDEO = 'public/img/hal/banner/banner-1920.mp4'
W, H = 384, 216
VAK = (0.033, 0.36, 0.17, 0.49)   # x0, x1, y0, y1 als deel van de video
ruw = subprocess.run(['ffmpeg', '-v', 'error', '-i', VIDEO, '-vf', f'scale={W}:{H},format=rgb24', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
a = np.frombuffer(ruw, np.uint8).reshape(-1, H, W, 3).astype(float) / 255
n = a.shape[0]
lin = lambda c: np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
L = 0.2126 * lin(a[..., 0]) + 0.7152 * lin(a[..., 1]) + 0.0722 * lin(a[..., 2])
x0, x1, y0, y1 = VAK
v = L[:, int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)].reshape(n, -1)
donker, licht = np.percentile(v, 40, axis=1), np.percentile(v, 60, axis=1)
code = lambda l: np.round(255 * np.where(l <= 0.0031308, 12.92 * l, 1.055 * l ** (1 / 2.4) - 0.055)).clip(0, 255).astype(np.uint8)
uit = np.stack([code(donker), code(licht)], 1).reshape(-1)
print(f"export const KOP_LICHT = {{ fps: 24, beelden: {n}, vak: {list(VAK)}, d: '{base64.b64encode(uit.tobytes()).decode()}' }};")
