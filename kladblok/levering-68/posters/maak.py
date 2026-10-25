# VISUAILS · de posterreeks in Blauw uur (levering 68). node-vrij: dit schrijft posters.html;
# render.mjs fotografeert elke poster los.
import json, re, sys, pathlib
import posters9 as P9
HIER = pathlib.Path(__file__).parent
DEFS = json.load(open(HIER / 'defs.json'))['defs']
R = P9.posters(); ST, SO, BR, DR = P9.stories(), P9.social(), P9.breed(), P9.drukwerk()
alles = R + ST + SO + BR + DR
def slug(n): return re.sub(r'[^a-z0-9]+', '-', n.lower().replace('é', 'e').replace('’', '')).strip('-')
blokken = []
for fig in alles:
    m = re.search(r'<svg viewBox="([^"]+)" role="img" aria-label="([^"]+)">', fig)
    vb, naam = m.group(1), m.group(2)
    svg = fig[m.start():fig.rindex('</svg>') + 6]
    w, h = vb.split()[2:]
    svg = svg.replace('<svg viewBox=', '<svg width="100%" height="100%" viewBox=', 1)
    blokken.append(f'<div class="p" data-naam="{slug(naam)}" style="width:{w}px;height:{h}px">{svg}</div>')
# de letters liggen naast dit script (fonts/), zodat het zonder internet hetzelfde tekent: Urbanist (de letter van de
# site) en IBM Plex Mono (de labels)
fonts = ('<style>'
         '@font-face{font-family:Urbanist;font-weight:100 900;src:url(fonts/urbanist-latin-wght-normal.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}'
         '@font-face{font-family:Urbanist;font-weight:100 900;src:url(fonts/urbanist-latin-ext-wght-normal.woff2) format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}'
         '@font-face{font-family:"IBM Plex Mono";font-weight:500;src:url(fonts/IBMPlexMono-500.woff2) format("woff2")}'
         '@font-face{font-family:"IBM Plex Mono";font-weight:600;src:url(fonts/IBMPlexMono-600.woff2) format("woff2")}'
         '</style>')
html = f'<!doctype html><html><head><meta charset="utf-8">{fonts}<style>body{{margin:0;background:#fff}} use{{fill:currentColor}} .p{{display:block;margin:0 0 20px}} .p svg{{display:block}}</style></head><body><svg width="0" height="0" style="position:absolute"><defs>{DEFS}</defs></svg>{"".join(blokken)}</body></html>'
open(HIER / sys.argv[1], 'w').write(html)
print(len(blokken), 'beelden;', len(P9.MELDINGEN), 'meldingen')
for m in P9.MELDINGEN: print('  !', m)
