"""Bouwt het specimen van VISUAILS Display als één bestand met alle letters erin (werkt ook zonder internet).
Gebruik: python maak_specimen.py [--kaal]
Standaard leest hij de letters uit ../fonts, DM Sans uit dm-sans-40pt en de opmaak uit specimen-bron.html, en schrijft
hij ../VISUAILS-Display-specimen.html. Met --kaal komt er alleen de inhoud (zonder <!doctype>), voor een artifact."""
import base64, json, os, sys, unicodedata
sys.dont_write_bytecode = True   # geen __pycache__ in de map
from fontTools.ttLib import TTFont
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from details_svg import maak as details

KAAL = '--kaal' in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith('--')]
LETTERS = args[0] if len(args) > 0 else os.path.join(HIER, '..', 'fonts')
DM = args[1] if len(args) > 1 else os.path.join(HIER, 'dm-sans-40pt')
BRON = args[2] if len(args) > 2 else os.path.join(HIER, 'specimen-bron.html')
UIT = args[3] if len(args) > 3 else os.path.join(HIER, '..', 'VISUAILS-Display-specimen.html')
PLEX = os.environ.get('PLEX', os.path.join(HIER, '..', '..', '..', 'public', 'fonts', 'ibm-plex-mono'))
DMVAR = os.path.join(HIER, 'dm-sans-var-latin.woff2')
GEW = [('Thin', 100), ('ExtraLight', 200), ('Light', 300), ('Regular', 400), ('Medium', 500), ('SemiBold', 600), ('Bold', 700), ('ExtraBold', 800), ('Black', 900)]
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()

css = []
for st, w in GEW:
    css.append(f"@font-face{{font-family:'VISUAILS Display';font-style:normal;font-weight:{w};font-display:block;src:url(data:font/woff2;base64,{b64(os.path.join(LETTERS, f'VISUAILSDisplay-{st}.woff2'))}) format('woff2');}}")
css.append(f"@font-face{{font-family:'DM Sans L';font-style:normal;font-weight:100 1000;font-display:block;src:url(data:font/woff2;base64,{b64(DMVAR)}) format('woff2');}}")
for w in (500, 600):
    css.append(f"@font-face{{font-family:'Plex Mono L';font-weight:{w};font-display:block;src:url(data:font/woff2;base64,{b64(os.path.join(PLEX, f'IBMPlexMono-{w}.woff2'))}) format('woff2');}}")

# de tekens: wat er in de letter zit, per groep, en welke een V-detail hebben
bold = TTFont(os.path.join(LETTERS, 'VISUAILSDisplay-Bold.ttf')); dmb = TTFont(os.path.join(DM, 'DMSans40pt-Bold.ttf'))
anders = {n for n in bold.getGlyphOrder() if not bold['glyf'][n].isComposite()
          and dmb['glyf'][n].getCoordinates(dmb['glyf'])[0] != bold['glyf'][n].getCoordinates(bold['glyf'])[0]}
def detail(n):
    g = bold['glyf'][n]
    return n in anders or (g.isComposite() and any(detail(c.glyphName) for c in g.components))
def groep(c):
    cat = unicodedata.category(c)
    if c.isascii() and c.isupper(): return 'hoofd'
    if c.isascii() and c.islower(): return 'klein'
    if cat.startswith('L'): return 'accent'
    if cat.startswith('N'): return 'cijfer'
    if cat.startswith('P'): return 'lees'
    if cat.startswith('S'): return 'teken'
    return None
tekens = []
for cp, n in sorted(bold.getBestCmap().items()):
    c = chr(cp); g = groep(c)
    if g is None or cp in (0xAD,):
        continue
    tekens.append([c, n, f'U+{cp:04X}', g, detail(n)])
fonts = [TTFont(os.path.join(LETTERS, f'VISUAILSDisplay-{st}.ttf')) for st, _ in GEW]
breedte = {t[1]: [f['hmtx'][t[1]][0] for f in fonts] for t in tekens}
gs = bold.getGlyphSet()
from fontTools.pens.boundsPen import BoundsPen
def grens(n):
    p = BoundsPen(gs); gs[n].draw(p); return p.bounds
maten = {'kap': round(grens('H')[3]), 'x': round(grens('x')[3]), 'onder': round(grens('p')[1])}
svgs, dm = details(os.path.join(LETTERS, 'VISUAILSDisplay-Bold.ttf'), os.path.join(DM, 'DMSans40pt-Bold.ttf'))
kb = lambda p: f'{os.path.getsize(p) / 1024:.0f} kB'
bestanden = [[st, w, f'VISUAILSDisplay-{st}.ttf · {kb(os.path.join(LETTERS, f"VISUAILSDisplay-{st}.ttf"))}',
              f'VISUAILSDisplay-{st}.woff2 · {kb(os.path.join(LETTERS, f"VISUAILSDisplay-{st}.woff2"))}'] for st, w in GEW]

t = open(BRON, encoding='utf-8').read()
vervang = {'/*@LETTERS@*/': '\n'.join(css), '/*@TEKENS@*/': json.dumps(tekens, ensure_ascii=False), '/*@BREEDTE@*/': json.dumps(breedte),
           '/*@MATEN@*/': json.dumps(maten), '/*@BESTANDEN@*/': json.dumps(bestanden, ensure_ascii=False),
           '@AANTAL@': str(len(tekens)), '@MET_DETAIL@': str(sum(1 for x in tekens if x[4])),
           '@SNEDE@': svgs['snede'], '@PUNT@': svgs['punt'], '@GAT@': svgs['gat'],
           '@SNEDE_D@': str(dm['snede_d']), '@SNEDE_H@': str(dm['snede_h'])}
for k, v in vervang.items():
    if k not in t:
        raise SystemExit('ontbreekt in de bron: ' + k)
    t = t.replace(k, v)
if not KAAL:
    t = '<!doctype html>\n<html lang="nl">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + t + '\n</html>\n'
open(UIT, 'w', encoding='utf-8', newline='\n').write(t)
print('klaar', len(tekens), 'tekens,', sum(1 for x in tekens if x[4]), 'met detail,', f'{os.path.getsize(UIT) / 1024:.0f} kB', maten, dm)
