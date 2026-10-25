# Levering 68 · de kleurentabel van schema Blauw uur (lijst 55, 24 oktober 2026) voor
# letterlijke waarden (#hex, rgb()/rgba(), %23hex in een data:-adres).
#
#   python3 kleurmap.py <bestand> [--droog] [--sla-over 'regex']
#
# Regels:
#  - Elk grijs zonder kleur (R=G=B) wordt het koele grijs met DEZELFDE helderheid
#    (toon 263°, de toon van inkt en grijs), zodat elk contrast gelijk blijft.
#  - Vaste ankers gaan voor: zwart → inkt, nevel → vlak, vak en lijn → lijn,
#    grijs 3 en de lichte kop → grijs, lopende tekst → inkt.
#  - Violet → blauw uur; violet diep → blauw diep; lila → blauw licht (alleen op donker).
#  - Amber (aandacht) verlaat het schema niet meer: vlak met blauwe letters.
#  - Regels met een :hover/:active en een achtergrond: grijs 2 (het oude vlak van een
#    zwarte knop onder de muis) wordt blauw uur.
#  - Commentaar blijft staan (geschiedenis). Regels die op --sla-over passen ook
#    (de laptopschermen: die tonen de winkel van een klant, niet VISUAILS).
import re, sys, json, math
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from kleur import lum, vanlch

INKT, BLAUW, BLAUW_DIEP, BLAUW_LICHT = '0B0F17', '25508B', '1A4279', '80A7DD'
VLAK, LIJN, LIJN_STERK, VELDLIJN, GRIJS = 'F4F5F7', 'E6E8EC', 'C5C8CF', '858A94', '636974'

ANKER = {
    '000000': INKT, '0E0E0E': INKT,
    'F2F2F2': VLAK, 'E8E8E8': LIJN, 'DDDDDD': LIJN, 'C8C8C8': LIJN_STERK, '8A8A8A': VELDLIJN,
    '616161': GRIJS, '6E6E6E': GRIJS, '3D3D3D': INKT,
    # violet en zijn familie
    '4400FF': BLAUW, '3600CC': BLAUW_DIEP, '8F66FF': BLAUW_LICHT,
    '4A1FFF': BLAUW, '3D17D6': BLAUW_DIEP, 'A694FF': BLAUW_LICHT, '6B4BFF': BLAUW,
    '2A0E8F': INKT, '1F0B66': INKT, '0F0C24': INKT,
    # aandacht (amber) → vlak met blauw
    'F6E7D1': VLAK, '8A4D06': BLAUW, '8A4F06': BLAUW,
}
# oudere lila-grijzen (schema's voor 19 oktober): eerst naar het grijs met dezelfde
# helderheid, dan koel. Dit is de tabel van levering 62.
OUD = {
    'F5F5F9': 'F2F2F2', 'ECEBF3': 'E8E8E8', 'DEDCE8': 'DDDDDD', 'C9C6D8': 'C8C8C8', '8E8BA2': '8A8A8A',
    '4B4960': '3D3D3D', '6A6880': '616161', '807E97': '6E6E6E', '74728C': '6E6E6E',
    '9C9AB0': '9C9C9C', 'F1EFF7': 'F2F2F2', 'E6E4EF': 'E8E8E8', 'E6E4EE': 'E8E8E8', 'A3A1B5': 'A3A3A3',
    'A9A7B8': 'A9A9A9', '4C4960': '3D3D3D', '858393': '858585', '6F6D80': '6F6F6F', '5B5872': '5B5B5B',
    '5E5B75': '5E5E5E', 'A6A3BC': 'A6A6A6', 'F4F2FB': 'F2F2F2', 'EDE9FF': 'F2F2F2',
    '0F0C1C': '0E0E0E', '18152A': '181818', '221E38': '212121', 'F2F1F8': 'F2F2F2', '1F1C30': '1F1F1F', '0A0815': '0A0A0A',
    'F1EEFF': 'F2F2F2', 'E7E2FF': 'DDDDDD', 'DCD5FF': 'DDDDDD', 'E4DFFF': 'EDEDED', 'BFB2FF': 'BCBCBC',
    'C9BFFF': 'C7C7C7', 'C9BDFF': 'C5C5C5', '1E1840': '1E1E1E',
    'F2F3F5': 'F2F2F2', 'E4E7EC': 'E7E7E7', 'DADEE5': 'DEDEDE', '0C0D10': '0D0D0D', '14161A': '161616', '1C1F25': '1F1F1F',
    '7C8096': '818181', '4A4E6B': '505050', '83868A': '868686', '3E4145': '414141', '5B5F7A': '606060', 'A7ABC7': 'ACACAC',
    '1B1E23': '1E1E1E', '5C6066': '606060', 'A0A4AA': 'A4A4A4', '17191E': '191919', '15171C': '171717', '0A0B0E': '0B0B0B',
    '262A33': '2A2A2A', '34383F': '383838', '303236': '323232', '3A3E46': '3E3E3E', 'AFB4BC': 'B4B4B4', 'EEF0F6': 'F0F0F0',
    'F3F5F8': 'F5F5F5', '1F2229': '222222', '55585F': '585858', '8A8F98': '8F8F8F', 'F4F5F7': None, 'E9EDEE': 'ECECEC',
    '0E1013': '101010', '9BA1A8': 'A0A0A0', 'E8EAEC': 'EAEAEA', '16181F': '181818', '0B0C0E': '0C0C0C', '1E1E24': '1F1F1F',
}
H_KOEL = 263.0
_cache = {}
def koel(grijs):
    """Het koele grijs met dezelfde WCAG-helderheid als #grijs (R=G=B)."""
    if grijs in _cache: return _cache[grijs]
    doel = lum('#' + grijs)
    if doel <= 0.0001 or doel >= 0.9999:
        _cache[grijs] = grijs; return grijs
    lo, hi = 0.0, 1.0
    h = grijs
    for _ in range(50):
        mid = (lo + hi) / 2
        c = 0.017 * min(1.0, 4 * mid * (1 - mid))   # het meeste kleur in het midden, zoals grijs
        h = vanlch(mid, c, H_KOEL)
        if lum(h) < doel: lo = mid
        else: hi = mid
    h = h.lstrip('#').upper()
    _cache[grijs] = h
    return h

def naar(oud, hover=False):
    oud = oud.upper()
    if hover and oud in ('3D3D3D',): return BLAUW
    if oud in ANKER: return ANKER[oud]
    if oud in OUD and OUD[oud]:
        tussen = OUD[oud]
        return ANKER.get(tussen) or koel(tussen)
    if oud[0:2] == oud[2:4] == oud[4:6] and oud not in ('FFFFFF',):
        return koel(oud)
    return None

RGB_SPECIAAL = {(138, 77, 6): (37, 80, 139), (74, 31, 255): (37, 80, 139), (68, 0, 255): (37, 80, 139),
                (143, 102, 255): (128, 167, 221), (166, 148, 255): (128, 167, 221)}

def per_regel(regel, hover_toegestaan=True):
    hover = False
    if hover_toegestaan and re.search(r':hover|:active', regel):
        # alleen het vlak van een knop onder de muis: grijs 2 als achtergrond of rand → blauw uur
        regel = re.sub(r'((?:background(?:-color)?|border-color)\s*:\s*)#3[dD]3[dD]3[dD](?![0-9A-Fa-f])', lambda m: m.group(1) + '#' + BLAUW, regel)
    def hx(m):
        pre, h = m.group(1), m.group(2)
        n = naar(h, hover)
        if not n or n.upper() == h.upper(): return m.group(0)
        if h.islower(): n = n.lower()
        return pre + n
    r = re.sub(r'(#|%23)([0-9A-Fa-f]{6})(?![0-9A-Fa-f\w-])', hx, regel)
    def hx3(m):
        pre, h = m.group(1), m.group(2)
        vol = ''.join(c * 2 for c in h)
        n = naar(vol, hover)
        if not n: return m.group(0)
        if h.islower(): n = n.lower()
        return pre + n
    r = re.sub(r'(#|%23)([0-9A-Fa-f]{3})(?![0-9A-Fa-f\w-])', hx3, r)
    def rg(m):
        t = (int(m.group(2)), int(m.group(4)), int(m.group(6)))
        if t in RGB_SPECIAAL: n = RGB_SPECIAAL[t]
        elif t[0] == t[1] == t[2] and t[0] != 255:
            h = naar('%02X%02X%02X' % t, hover)
            if not h: return m.group(0)
            n = (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
        else: return m.group(0)
        return f"{m.group(1)}{n[0]}{m.group(3)}{n[1]}{m.group(5)}{n[2]}"
    r = re.sub(r'(rgba?\(\s*)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})(?=\s*[,/)])', rg, r)
    return r

def verwerk(tekst, sla_over=None):
    uit, verslag = [], []
    delen = re.split(r'(/\*.*?\*/|<!--.*?-->)', tekst, flags=re.S)
    for d in delen:
        if d.startswith('/*') or d.startswith('<!--'):
            uit.append(d); continue
        nieuw = []
        for r in d.split('\n'):
            if sla_over and sla_over.search(r):
                nieuw.append(r); continue
            n = per_regel(r)
            if n != r: verslag.append((r.strip()[:140], n.strip()[:140]))
            nieuw.append(n)
        uit.append('\n'.join(nieuw))
    return ''.join(uit), verslag

if __name__ == '__main__':
    pad = sys.argv[1]
    sla = re.compile(sys.argv[sys.argv.index('--sla-over') + 1]) if '--sla-over' in sys.argv else None
    t = open(pad, encoding='utf-8').read()
    u, verslag = verwerk(t, sla)
    if '--toon' in sys.argv:
        for a, b in verslag: print('  ' + a + '\n→ ' + b)
    print(f'{len(verslag):5d} regels  {pad}', file=sys.stderr)
    if '--droog' not in sys.argv and u != t:
        open(pad, 'w', encoding='utf-8', newline='').write(u)
