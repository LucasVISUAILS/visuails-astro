"""VISUAILS — het masker van de telefoon in de bannervideo (levering 114, 17 november 2026).

Lucas, 00:46: "wanneer de telefoon omhoog komt [moet] de telefoon over de tekst heen gaan dus dat je het gedeelte van de
tekst achter de telefoon niet ziet en wanneer hij switched naar het product dat op de grond valt dat de tekst dan weer
gewoon er vol op zit."

De eerste scène (0 tot 4,25 s: 102 beelden bij 24 per seconde) is een telefoon in een hand op een effen witte grond
(min(r, g, b) = 0,988 overal). De rand van de telefoon rekent de browser zelf uit de video, scherp, per beeldpunt
(HalBanner94.astro: alles wat niet bijna wit is). Maar het scherm van de telefoon is licht (een houten vloer, een witte
sluiterknop): daar zou de tekst door de telefoon heen schijnen. Dit masker vult die gaten: per beeld de vorm van de
telefoon, de hand en de mouw, met de gaten dicht, iets ingekrompen zodat de rand uit de video blijft komen.

Uit: één plaat van 8 × 13 vakken van 240 × 135 (1920 × 1755), grijs, beeld k in vak (k mod 8, k div 8).

    ffmpeg -i public/img/hal/banner/banner-1920.mp4 -frames:v 102 -vf scale=960:540 <map>/%03d.png
    python3 scripts/telefoon-masker.py <map> public/img/hal/banner/telefoon-masker.webp
"""
import sys, glob
import numpy as np
from PIL import Image
from scipy import ndimage as nd

bron, uit = sys.argv[1], sys.argv[2]
K, R, CW, CH = 8, 13, 240, 135
plaat = Image.new('L', (K * CW, R * CH), 0)
fs = sorted(glob.glob(bron + '/*.png'))[:K * R]
for i, f in enumerate(fs):
    a = np.asarray(Image.open(f).convert('RGB'), float) / 255
    donker = nd.binary_opening(a.min(2) < 0.94, iterations=1)
    p = np.vstack([donker, np.ones((1, donker.shape[1]), bool)])   # de onderrand dicht: de hand komt van onderen
    vol = nd.binary_fill_holes(p)[:-1]
    vol = nd.binary_erosion(vol, iterations=5)                      # 5 px op 960 breed = 10 px op 1920: binnen de rand
    m = Image.fromarray((vol * 255).astype(np.uint8)).resize((CW, CH), Image.BILINEAR)
    plaat.paste(m, ((i % K) * CW, (i // K) * CH))
plaat.save(uit, 'WEBP', lossless=True)
print(len(fs), 'beelden ->', uit)
