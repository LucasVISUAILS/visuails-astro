# De rechterrand van de laptop per filmbeeld, gemeten in de schermafdruk (MEET=1: alleen de laptop op wit).
# python3 rand.py <map met f0000.png …> <log> [van tot]
import sys, glob, json
import numpy as np
from PIL import Image
map_, logf = sys.argv[1], sys.argv[2]
log = {}
for regel in open(logf):
    d = regel.split(' ', 1)
    if len(d) == 2 and d[0].isdigit() and d[1].startswith('['):
        log[int(d[0])] = json.loads(d[1])
uit = []
for f in sorted(glob.glob(f'{map_}/f*.png')):
    i = int(f[-8:-4])
    a = np.asarray(Image.open(f).convert('RGB')).astype(int)
    band = a[150:800]                       # waar de laptop staat
    niet_wit = (np.abs(band - 255).max(2) > 40)
    kol = np.where(niet_wit.sum(0) >= 3)[0]
    r = int(kol.max()) if len(kol) else -1
    uit.append((i, r, log.get(i, [None])[0]))
json.dump(uit, open(f'{map_}/../rand.json', 'w'))
rit = [(i, r, u) for i, r, u in uit if u is not None and 0 < u < 1 and r > 0]
st = [rit[k - 1][1] - rit[k][1] for k in range(1, len(rit))]
print('rit in beeld:', len(rit), 'beelden; stappen (px naar links per filmbeeld):')
print(' '.join(str(s) for s in st))
if st: print('gem %.1f, min %d, max %d' % (sum(st) / len(st), min(st), max(st)))
voor = [(i, r) for i, r, u in uit if u == 0 and r > 0][-12:]
print('voor de rit (scroll, video):', ' '.join(f'{voor[k-1][1]-voor[k][1]}' for k in range(1, len(voor))))
