"""VISUAILS — de foto's van de productpagina's in de laptop, als galerij (levering 96, lijst 97, 13 november 2026).

    python3 scripts/opening-galerij-96.py

Lucas (lijst 97, notitie): "Zorg ervoor dat de producten (vooral bij jeans en sokken) goed gecentreerd zijn en ze niet
worden afgesneden." Daarom staat de galerij in 4 : 5, de verhouding van de foto's zelf (1200 × 1490): niets wordt
afgesneden. De voor- en achterkant op de grond van de foto's (#FBFDFF, gemeten in de hoeken van alle zes) worden
opnieuw gecentreerd: het product precies in het midden, met 8 % lucht rondom aan de lange kant. Op model en het detail
blijven zoals ze zijn (ze vullen hun vak al). Uit: public/img/hal/opening/galerij/<product>-<0..3>.{webp,avif}, 880 × 1100.
"""
import os
import numpy as np
from PIL import Image

WORTEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRON = os.path.join(WORTEL, 'public', 'img')
UIT = os.path.join(WORTEL, 'public', 'img', 'hal', 'opening', 'galerij')
os.makedirs(UIT, exist_ok=True)
GROND = (251, 253, 255)
B, H = 880, 1100
PRODUCTEN = {
    'hoodie': ['hoodie-na-front', 'hoodie-na-achter', 'hoodie-na-model', 'hoodie-na-detail'],
    'broek': ['nonstd-broek-front', 'nonstd-broek-achter', 'nonstd-broek-model', 'nonstd-broek-detail'],
    'sokken': ['nonstd-sokken-front', 'nonstd-sokken-achter', 'nonstd-sokken-model', 'nonstd-sokken-detail'],
}


def centreer(im):
    a = np.asarray(im).astype(int)
    verschil = np.abs(a - np.array(GROND)).max(axis=2) > 10
    ys, xs = np.where(verschil)
    # de zachte schaduw hoort bij het product: een ruime drempel (10) houdt hem erbij
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    stuk = im.crop((x0, y0, x1, y1))
    w, h = stuk.size
    s = min(B * .84 / w, H * .84 / h)
    stuk = stuk.resize((round(w * s), round(h * s)), Image.LANCZOS)
    doek = Image.new('RGB', (B, H), GROND)
    doek.paste(stuk, ((B - stuk.width) // 2, (H - stuk.height) // 2))
    return doek


for naam, bronnen in PRODUCTEN.items():
    for i, b in enumerate(bronnen):
        im = Image.open(os.path.join(BRON, b + '.webp')).convert('RGB')
        uit = centreer(im) if i < 2 else im.resize((B, H), Image.LANCZOS)
        uit.save(os.path.join(UIT, f'{naam}-{i}.webp'), quality=78, method=6)
        uit.save(os.path.join(UIT, f'{naam}-{i}.avif'), quality=62)
        print(naam, i, os.path.getsize(os.path.join(UIT, f'{naam}-{i}.webp')) // 1024, 'kB')
