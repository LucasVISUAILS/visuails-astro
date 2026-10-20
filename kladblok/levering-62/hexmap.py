# Levering 62 · de kleurentabel van schema A voor letterlijke waarden (#hex, rgb(), %23hex).
# Elke oude kleur krijgt één nieuwe. Violet en violet-diep worden standaard ZWART (een
# knop, link, stip of rand); alleen op regels die een van de BEHOUD-patronen bevatten
# blijven ze violet (het nieuwe violet). Lila wordt standaard neutraal, behalve bij het logo.
#   python3 hexmap.py <bestand> [--droog] [--behoud 'patroon1|patroon2']
import re, sys

NEUTRAAL = {
    # de hal (licht)
    'F5F5F9': 'F2F2F2', 'ECEBF3': 'E8E8E8', 'DEDCE8': 'DDDDDD', 'C9C6D8': 'C8C8C8', '8E8BA2': '8A8A8A',
    '0F0C24': '000000', '4B4960': '3D3D3D', '6A6880': '616161', '807E97': '6E6E6E', '74728C': '6E6E6E',
    '9C9AB0': '9C9C9C', 'F1EFF7': 'F2F2F2', 'E6E4EF': 'E8E8E8', 'E6E4EE': 'E8E8E8', 'A3A1B5': 'A3A3A3',
    'A9A7B8': 'A9A9A9', '4C4960': '3D3D3D', '858393': '858585', '6F6D80': '6F6F6F', '5B5872': '5B5B5B',
    '5E5B75': '5E5E5E', 'A6A3BC': 'A6A6A6', 'F4F2FB': 'F2F2F2', 'EDE9FF': 'F2F2F2',
    # /admin donker: dezelfde rollen, zonder de inkttint
    '0F0C1C': '0E0E0E', '18152A': '181818', '221E38': '212121', 'F2F1F8': 'F2F2F2', '1F1C30': '1F1F1F', '0A0815': '0A0A0A',
    # de lila vlakken: neutraal
    'F1EEFF': 'F2F2F2', 'E7E2FF': 'DDDDDD', 'DCD5FF': 'DDDDDD', 'E4DFFF': 'EDEDED', 'BFB2FF': 'BCBCBC',
    'C9BFFF': 'C7C7C7', 'C9BDFF': 'C5C5C5', '1E1840': '1E1E1E',
    # nacht en het oude geleverd: zwart
    '2A0E8F': '000000', '1F0B66': '000000',
}
# het vorige schema (20 september – 13 oktober): koel grijs met een blauwe zweem. Schema A
# heeft grijs zonder kleur, dus ook deze naar het grijs met dezelfde helderheid (contrast gelijk).
OUDSCHEMA = {
    'F2F3F5': 'F2F2F2', 'E4E7EC': 'E7E7E7', 'DADEE5': 'DEDEDE', '0C0D10': '0D0D0D', '14161A': '161616', '1C1F25': '1F1F1F',
    '7C8096': '818181', '4A4E6B': '505050', '83868A': '868686', '3E4145': '414141', '5B5F7A': '606060', 'A7ABC7': 'ACACAC',
    '1B1E23': '1E1E1E', '5C6066': '606060', 'A0A4AA': 'A4A4A4', '17191E': '191919', '15171C': '171717', '0A0B0E': '0B0B0B',
    '262A33': '2A2A2A', '34383F': '383838', '303236': '323232', '3A3E46': '3E3E3E', 'AFB4BC': 'B4B4B4', 'EEF0F6': 'F0F0F0',
    'F3F5F8': 'F5F5F5', '1F2229': '222222', '55585F': '585858', '8A8F98': '8F8F8F', 'F4F5F7': 'F5F5F5', 'E9EDEE': 'ECECEC',
    '0E1013': '101010', '9BA1A8': 'A0A0A0', 'E8EAEC': 'EAEAEA', '16181F': '181818', '0B0C0E': '0C0C0C', '1E1E24': '1F1F1F',
}
RGB_OUDSCHEMA = {(242, 243, 245): 'F2F3F5', (12, 13, 16): '0C0D10', (20, 22, 26): '14161A'}
VIOLET = {'4A1FFF': ('4400FF', '000000'), '3D17D6': ('3600CC', '000000'), 'A694FF': ('8F66FF', 'C8C8C8'), '6B4BFF': ('4400FF', '000000')}
RGB_OUD = {(15, 12, 36): '0F0C24', (74, 31, 255): '4A1FFF', (61, 23, 214): '3D17D6', (42, 14, 143): '2A0E8F',
           (166, 148, 255): 'A694FF', (241, 238, 255): 'F1EEFF', (220, 213, 255): 'DCD5FF', (31, 11, 102): '1F0B66',
           (228, 223, 255): 'E4DFFF', (30, 24, 64): '1E1840', (242, 241, 248): 'F2F1F8', (245, 245, 249): 'F5F5F9'}

HOVER = False
MET_OUD = '--oud' in sys.argv
def naar(oud, behoud):
    oud = oud.upper()
    if MET_OUD and oud in OUDSCHEMA: return OUDSCHEMA[oud]
    if oud in VIOLET:
        if not behoud and HOVER and oud in ('4A1FFF', '3D17D6'): return '3D3D3D'  # het vlak van een zwarte knop onder de muis
        return VIOLET[oud][0 if behoud else 1]
    return NEUTRAAL.get(oud)

def per_regel(regel, behoud_re):
    global HOVER
    behoud = bool(behoud_re and behoud_re.search(regel))
    HOVER = bool(re.search(r':hover|:active', regel)) and bool(re.search(r'background|border-color|box-shadow', regel))
    def hx(m):
        pre, h = m.group(1), m.group(2)
        n = naar(h, behoud)
        if not n: return m.group(0)
        if h.islower(): n = n.lower()
        return pre + n
    r = re.sub(r'(#|%23)([0-9A-Fa-f]{6})(?![0-9A-Fa-f])', hx, regel)
    def rg(m):
        sleutel = (int(m.group(2)), int(m.group(4)), int(m.group(6)))
        oud = RGB_OUD.get(sleutel) or (MET_OUD and RGB_OUDSCHEMA.get(sleutel))
        if not oud: return m.group(0)
        n = naar(oud, behoud)
        if not n: return m.group(0)
        return f"{m.group(1)}{int(n[0:2], 16)}{m.group(3)}{int(n[2:4], 16)}{m.group(5)}{int(n[4:6], 16)}"
    r = re.sub(r'(rgba?\(\s*)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})(?=\s*[,/)])', rg, r)
    return r

def verwerk(tekst, behoud_re, commentaar_ook=False):
    # commentaar laten staan: dat is geschiedenis
    uit, verslag = [], []
    delen = re.split(r'(/\*.*?\*/|<!--.*?-->)', tekst, flags=re.S) if not commentaar_ook else [tekst]
    for d in delen:
        if not commentaar_ook and (d.startswith('/*') or d.startswith('<!--')):
            uit.append(d); continue
        regels = d.split('\n')
        nieuw = []
        for r in regels:
            n = per_regel(r, behoud_re)
            if n != r: verslag.append((r.strip()[:150], n.strip()[:150]))
            nieuw.append(n)
        uit.append('\n'.join(nieuw))
    return ''.join(uit), verslag

if __name__ == '__main__':
    pad = sys.argv[1]
    behoud = None
    if '--behoud' in sys.argv:
        behoud = re.compile(sys.argv[sys.argv.index('--behoud') + 1])
    t = open(pad, encoding='utf-8').read()
    u, verslag = verwerk(t, behoud, '--ook-commentaar' in sys.argv)
    for a, b in verslag:
        print('  ' + a + '\n→ ' + b)
    print(len(verslag), 'regels gewijzigd in', pad, file=sys.stderr)
    if '--droog' not in sys.argv:
        open(pad, 'w', encoding='utf-8').write(u)
