# X-ray-maskers voor de posters: wit waar de foto donker is, zwart waar hij licht is.
# Een poster tekent zijn lijnen en tekst twee keer: gewoon (blauw uur, inkt, grijs) en daarboven
# in wit, alleen zichtbaar binnen dit masker. Zo wordt tekst die over het model, de broek of
# een donkere streep valt vanzelf wit, en blijft hij op de lichte grond blauw uur of inkt.
import pathlib
import numpy as np
from PIL import Image, ImageFilter

HIER = pathlib.Path(__file__).parent
IMG = HIER / 'img'
LICHT, DONKER = 0.62, 0.46     # boven LICHT: gewone kleur; onder DONKER: wit; ertussen een zachte overgang

def masker(beeld, uit, blur=1.2):
    im = Image.open(beeld).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255
    L = a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722
    m = np.clip((LICHT - L) / (LICHT - DONKER), 0, 1)
    mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    mi.save(uit, optimize=True)
    return im.size, round(float(m.mean()) * 100, 1)

# De maskers worden gemaakt door bron/maak-beelden.py (levering 68), samen met de beelden zelf.
