# Levering 62 · schema A. Loopt elke CSS-regel langs (ook binnen @media en @keyframes),
# en vervangt per declaratie de kleur volgens de rol: violet alleen waar schema A het
# toestaat (de voet, het €1-blok, Bestellen bovenin, wat je kiest, tekstselectie, het logo),
# verder zwart; lila vlakken worden neutraal.
#   python3 herkleur.py <bestand> [--droog]   → schrijft het bestand, en een verslag naar stdout
import re, sys

TOEGESTAAN = re.compile(
    r'::selection|nav-cta|mobile-cta|wm-echo|:checked|\[aria-checked="true"\]|is-gekozen'
    r'|\.wk-(vormen|drie|stuk)\b[^,{]*\[aria-pressed="true"\]'
)

def is_hover(sel):
    return ':hover' in sel or ':active' in sel

def vervang(sel, prop, waarde, at):
    """Geeft de nieuwe waarde voor één declaratie."""
    v = waarde
    houd = bool(TOEGESTAAN.search(sel)) or prop in ('accent-color', '--mk-line-ink')
    hover = is_hover(sel)
    vlak = prop in ('background', 'background-color', 'border-color', 'border', 'box-shadow') or prop.startswith('border')
    deco = prop.startswith('text-decoration')
    if not houd:
        # violet → zwart; op een hover van een zwart vlak: grijs 2
        if hover and vlak:
            v = v.replace('var(--h-violet-diep)', 'var(--h-inkt-2)').replace('var(--h-violet)', 'var(--h-inkt-2)')
        v = v.replace('var(--h-violet-diep)', 'var(--h-inkt)').replace('var(--h-violet)', 'var(--h-inkt)')
        v = v.replace('var(--h-nacht)', 'var(--h-inkt)')
        # lila: in een onderstreping de veldlijn, verder de sterke lijn
        if deco:
            v = v.replace('var(--h-lila)', 'var(--h-veldlijn)')
        else:
            v = v.replace('var(--h-lila)', 'var(--h-lijn-sterk)')
    # mist en waas: neutraal. Op een hover een tree dieper, anders valt hij weg op nevel.
    if hover:
        v = v.replace('var(--h-mist)', 'var(--h-vak)').replace('var(--h-waas)', 'var(--h-vak)')
    else:
        v = v.replace('var(--h-mist)', 'var(--h-nevel)').replace('var(--h-waas)', 'var(--h-lijn)')
    # vaste waarden uit het oude palet
    v = re.sub(r'rgba\(\s*15,\s*12,\s*36,', 'rgba(0, 0, 0,', v)
    v = re.sub(r'rgb\(\s*15\s+12\s+36\s*/', 'rgb(0 0 0 /', v)
    v = re.sub(r'rgba\(\s*241,\s*238,\s*255,', 'rgba(242, 242, 242,', v)
    if not houd:
        v = re.sub(r'rgba\(\s*74,\s*31,\s*255,', 'rgba(0, 0, 0,', v)
        v = re.sub(r'rgba\(\s*61,\s*23,\s*214,', 'rgba(0, 0, 0,', v)
        v = re.sub(r'rgba\(\s*42,\s*14,\s*143,', 'rgba(0, 0, 0,', v)
    else:
        v = re.sub(r'rgba\(\s*74,\s*31,\s*255,', 'rgba(68, 0, 255,', v)
    v = re.sub(r'#E7E2FF\b', '#DDDDDD', v, flags=re.I)
    v = re.sub(r'#F1EEFF\b', '#F2F2F2', v, flags=re.I)
    return v

def splits_decls(body):
    """Splitst een declaratieblok op ; buiten haakjes en strings. Geeft (stukken) terug met de scheidingstekens."""
    out, diepte, q, start = [], 0, None, 0
    i = 0
    while i < len(body):
        c = body[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
        elif c in '"\'': q = c
        elif c == '(': diepte += 1
        elif c == ')': diepte -= 1
        elif c == ';' and diepte == 0:
            out.append(body[start:i + 1]); start = i + 1
        i += 1
    out.append(body[start:])
    return out

def verwerk(tekst):
    # Maskeer commentaar, zodat het niet meetelt en niet wordt veranderd.
    res, i, n = [], 0, len(tekst)
    stapel = []  # selectors van open blokken
    laatste = 0  # begin van de huidige selector/declaratie
    wijzig = []
    while i < n:
        if tekst.startswith('/*', i):
            j = tekst.find('*/', i + 2); i = (j + 2) if j >= 0 else n; continue
        c = tekst[i]
        if c in '"\'':
            q = c; i += 1
            while i < n and tekst[i] != q:
                if tekst[i] == '\\': i += 1
                i += 1
            i += 1; continue
        if c == '{':
            sel = re.sub(r'/\*.*?\*/', '', tekst[laatste:i], flags=re.S).strip()
            stapel.append((sel, i + 1)); laatste = i + 1
        elif c == '}':
            if stapel:
                sel, begin = stapel.pop()
                body = tekst[begin:i]
                if '{' not in re.sub(r'/\*.*?\*/', '', body, flags=re.S):
                    at = ' '.join(s for s, _ in stapel)
                    wijzig.append((begin, i, sel, at))
            laatste = i + 1
        elif c == ';' and not stapel:
            laatste = i + 1
        i += 1
    # vervang van achter naar voren
    uit = tekst
    verslag = []
    for begin, eind, sel, at in sorted(wijzig, reverse=True):
        body = uit[begin:eind]
        stukken = splits_decls(body)
        nieuw = []
        for st in stukken:
            m = re.match(r'(\s*(?:/\*.*?\*/\s*)*)([-\w]+)(\s*:\s*)(.*?)(\s*;?\s*)$', st, re.S)
            if not m: nieuw.append(st); continue
            pre, prop, kol, waarde, post = m.groups()
            # commentaar binnen de waarde laten staan
            delen = re.split(r'(/\*.*?\*/)', waarde, flags=re.S)
            nw = ''.join(d if d.startswith('/*') else vervang(sel + ' @' + at if '@keyframes' in at else sel, prop.lower(), d, at) for d in delen)
            if nw != waarde: verslag.append((sel[:120], prop, waarde.strip()[:110], nw.strip()[:110]))
            nieuw.append(pre + prop + kol + nw + post)
        uit = uit[:begin] + ''.join(nieuw) + uit[eind:]
    return uit, verslag

if __name__ == '__main__':
    pad = sys.argv[1]
    t = open(pad, encoding='utf-8').read()
    u, verslag = verwerk(t)
    # de schermen van de laptop (de winkel van de klant, JOUWMERK) houden hun eigen kleuren:
    # die regels tellen mee in de vingerafdruk van scripts/lib/laptopbron.mjs
    SCHERM = re.compile(r'\.(sc|sc-[a-z-]+|hl-scherm[a-z-]*|hl-laag)\b')
    a, b = t.split('\n'), u.split('\n')
    assert len(a) == len(b), 'regelaantal veranderd'
    terug = 0
    for k in range(len(a)):
        if a[k] != b[k] and SCHERM.search(a[k]) and not re.match(r'\s*(/\*|\*)', a[k]):
            b[k] = a[k]; terug += 1
    u = '\n'.join(b)
    print(terug, 'schermregels teruggezet', file=sys.stderr)
    for s, p, a, b in reversed(verslag):
        print(f'{s}\n    {p}: {a}\n    →   {b}')
    print(len(verslag), 'declaraties gewijzigd', file=sys.stderr)
    if '--droog' not in sys.argv:
        open(pad, 'w', encoding='utf-8').write(u)
