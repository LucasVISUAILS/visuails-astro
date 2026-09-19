import sys
from PIL import Image
# maakt van een lange paginascreenshot een contactvel: kolommen van stroken, verkleind
src, dst = sys.argv[1], sys.argv[2]
strook = int(sys.argv[3]) if len(sys.argv) > 3 else 1500   # hoogte per strook in bronpixels
kol = int(sys.argv[4]) if len(sys.argv) > 4 else 3
schaal = float(sys.argv[5]) if len(sys.argv) > 5 else 0.4
im = Image.open(src).convert('RGB'); w, h = im.size
n = (h + strook - 1) // strook
rijen = (n + kol - 1) // kol
sw, sh = int(w * schaal), int(strook * schaal)
vel = Image.new('RGB', (kol * sw + (kol - 1) * 8, rijen * sh + (rijen - 1) * 8), (255, 0, 255))
for i in range(n):
    s = im.crop((0, i * strook, w, min(h, (i + 1) * strook))).resize((sw, int((min(h, (i + 1) * strook) - i * strook) * schaal)), Image.LANCZOS)
    vel.paste(s, ((i % kol) * (sw + 8), (i // kol) * (sh + 8)))
vel.save(dst, quality=88)
print(dst, vel.size, 'stroken', n)
