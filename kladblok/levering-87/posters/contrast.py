# Meet het contrast van elke tekst op de posters tegen wat er in de kale versie onder ligt (WCAG).
# Per tekst: het slechtste 2 %-punt en de mediaan over het vak van de tekst. Eis: 4,5 (kop 3,0 vanaf 24 px vet).
import json, re, pathlib, sys
import numpy as np
from PIL import Image
HIER = pathlib.Path(__file__).parent / f'uit-{sys.argv[1] if len(sys.argv) > 1 else "nl"}'
def lin(a): return np.where(a <= .04045, a / 12.92, ((a + .055) / 1.055) ** 2.4)
def L(rgb): r, g, b = [lin(c) for c in rgb]; return .2126 * r + .7152 * g + .0722 * b
maten = json.load(open(HIER / 'maten.json'))
fout = 0
for p in maten:
    f = HIER / f'kaal-{p["naam"]}.png'
    if not f.exists(): continue
    a = np.asarray(Image.open(f).convert('RGB')).astype(float) / 255
    print('──', p['naam'])
    for t in p['tekst']:
        m = re.findall(r'[\d.]+', t['kleur']); r, g, b = [float(x) / 255 for x in m[:3]]; al = float(m[3]) if len(m) > 3 else 1
        x0, y0 = max(0, int(t['x'])), max(0, int(t['y'])); x1, y1 = min(a.shape[1], int(t['x'] + t['w'])), min(a.shape[0], int(t['y'] + t['h']))
        vak = a[y0:y1, x0:x1].reshape(-1, 3)
        if not len(vak): continue
        tk = np.array([r, g, b]) * al + vak * (1 - al)  # tekst met dekking over de grond
        Lt, Lg = L(tk.T), L(vak.T)
        cr = (np.maximum(Lt, Lg) + .05) / (np.minimum(Lt, Lg) + .05)
        slecht, mid = np.percentile(cr, 2), np.median(cr)
        groot = t['px'] >= 24 and 'kop' in t['soort']
        eis = 3.0 if groot else 4.5
        ok = slecht >= eis
        fout += not ok
        print(f'  {"ok " if ok else "!! "} {slecht:5.2f} (mid {mid:5.2f}) eis {eis}  {t["px"]:.0f}px  {t["tekst"][:60]}')
print('te laag:', fout)
