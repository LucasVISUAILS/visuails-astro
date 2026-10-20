# VISUAILS — lijnschetsen voor het zijpaneel "Wat je krijgt" (15 oktober 2026, afvinklijst 27, k-credits).
# Illustraties van de beeldsoorten, geen logo's en geen merk: één neutraal shirt, inkt op wit.
# Schema A (levering 62, 19 oktober 2026): zwart op wit, het grijs zonder lila (vak en licht
# als in hal.css, de lijn van de stof #9C9C9C met dezelfde helderheid als #9C9C9C).
INKT = '#000000'; WIT = '#FFFFFF'; VAK = '#E8E8E8'; LICHT = '#F2F2F2'
SW = 2.2

def svg(binnen, titel):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="{titel}">'
            f'<title>{titel}</title>'
            f'<g fill="none" stroke="{INKT}" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round">{binnen}</g></svg>\n')

def shirt(dx=0, dy=0, s=1.0, achter=False, vul=WIT):
    # een t-shirt, plat; (dx,dy) verschuiving, s schaal rond (60,60)
    def p(x, y):
        return f'{60 + (x - 60) * s + dx:.1f} {60 + (y - 60) * s + dy:.1f}'
    hals = (p(60, 31) if achter else p(60, 39))
    rib = (p(60, 35) if achter else p(60, 44))
    d = (f'M{p(44,27)} Q{hals} {p(76,27)} L{p(90,31)} L{p(104,47)} L{p(93,55)} L{p(88,50)} '
         f'L{p(88,96)} L{p(32,96)} L{p(32,50)} L{p(27,55)} L{p(16,47)} L{p(30,31)} Z')
    uit = f'<path d="{d}" fill="{vul}"/>'
    uit += f'<path d="M{p(44,27)} Q{rib} {p(76,27)}" stroke-width="{SW*0.7:.2f}"/>'
    # zoom van de mouwen en de onderrand: gestippeld
    uit += f'<path d="M{p(36,91)} L{p(84,91)}" stroke-width="{SW*0.6:.2f}" stroke-dasharray="2 2.6"/>'
    uit += f'<path d="M{p(100.5,51)} L{p(91,57)}" stroke-width="{SW*0.6:.2f}" stroke-dasharray="2 2.6"/>'
    uit += f'<path d="M{p(19.5,51)} L{p(29,57)}" stroke-width="{SW*0.6:.2f}" stroke-dasharray="2 2.6"/>'
    if achter:
        # schouderpas op de rug
        uit += f'<path d="M{p(33,38)} Q{p(60,44)} {p(87,38)}" stroke-width="{SW*0.6:.2f}" stroke-dasharray="2 2.6"/>'
    return uit

def schaduw(y=103, rx=30):
    return f'<ellipse cx="60" cy="{y}" rx="{rx}" ry="3.2" fill="{VAK}" stroke="none"/>'

def figuur(achter=False, dy=0):
    # een staand figuur met het shirt aan, in de maat van een modeschets (zeven koppen). Gezichtloos.
    S = 0.44
    T = -13.8 + dy   # verschuiving van het shirt naar beneden
    def p(x, y):
        return (60 + (x - 60) * S, 60 + (y - 60) * S + T)
    nx, ny = p(60, 27)
    zoom = p(32, 96)[1]
    g = ''
    # broek: twee pijpen tot op de grond, schoenen
    voet = 110 + dy
    g += (f'<path d="M{60-12.4:.1f} {zoom-1:.1f} L{60-13.6:.1f} {voet:.1f} L{60-2.6:.1f} {voet:.1f} L60 {zoom+7:.1f} '
          f'L{60+2.6:.1f} {voet:.1f} L{60+13.6:.1f} {voet:.1f} L{60+12.4:.1f} {zoom-1:.1f} Z" fill="{LICHT}"/>')
    g += f'<path d="M{60-16.5:.1f} {voet+2.6:.1f} H{60-2.6:.1f} M{60+2.6:.1f} {voet+2.6:.1f} H{60+16.5:.1f}" stroke-width="{SW*1.25:.2f}"/>'
    # armen: smal, licht gebogen, de hand net onder de heup
    for k in (-1, 1):
        ux, uy = p(60 + k * 44, 47)
        ix, iy = p(60 + k * 33, 55)
        hand = zoom + 7
        g += (f'<path d="M{ux - k*0.6:.1f} {uy + 2.2:.1f} Q{60 + k*21:.1f} {(uy + hand)/2:.1f} {60 + k*19.6:.1f} {hand:.1f} '
              f'Q{60 + k*17.6:.1f} {hand + 3.4:.1f} {60 + k*16:.1f} {hand - 0.8:.1f} Q{60 + k*16.6:.1f} {(iy + hand)/2:.1f} {ix:.1f} {iy + 0.8:.1f}" fill="{WIT}"/>')
    g += shirt(dy=T, s=S, achter=achter)
    # hals en hoofd
    g += f'<path d="M57.2 {ny+0.8:.1f} V{ny-4:.1f} M62.8 {ny+0.8:.1f} V{ny-4:.1f}" />'
    cy = ny - 10.6
    g += f'<circle cx="60" cy="{cy:.1f}" r="6.8" fill="{WIT}"/>'
    if achter:
        g += f'<circle cx="60" cy="{cy:.1f}" r="6.8" fill="{INKT}"/>'
    else:
        g += f'<path d="M53.3 {cy-0.6:.1f} A6.8 6.8 0 0 1 66.7 {cy-0.6:.1f} Q61.5 {cy-4.2:.1f} 53.3 {cy-0.6:.1f} Z" fill="{INKT}"/>'
    return g

def boog():
    # een raam of nis achter het figuur: de "setting" van lifestyle
    return (f'<path d="M24 114 V48 A36 36 0 0 1 96 48 V114 Z" fill="{LICHT}" stroke="none"/>'
            f'<path d="M14 114 H106" stroke-width="{SW*0.8:.2f}"/>')

def loep(inhoud, cx=54, cy=54, r=33):
    clip = f'<clipPath id="k"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>'
    return (f'<defs>{clip}</defs>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{WIT}"/>'
            f'<g clip-path="url(#k)">{inhoud}</g>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}"/>'
            f'<path d="M{cx + r*0.72:.1f} {cy + r*0.72:.1f} L{cx + r*1.35:.1f} {cy + r*1.35:.1f}" stroke-width="6"/>')

def stof():
    # keperbinding: schuine lijntjes, een zoom en een knoop
    g = ''.join(f'<path d="M{x} 10 L{x+60} 110" stroke-width="0.9" stroke="#9C9C9C"/>' for x in range(-40, 100, 7))
    g += '<path d="M10 70 Q54 64 100 70" stroke-width="1.4" stroke-dasharray="2.4 2.6"/>'
    g += '<path d="M10 76 Q54 70 100 76" stroke-width="1.4"/>'
    g += f'<circle cx="54" cy="46" r="10.5" fill="{WIT}"/>'
    g += f'<circle cx="54" cy="46" r="7" stroke-width="1.2"/>'
    for x, y in ((51, 43), (57, 43), (51, 49), (57, 49)):
        g += f'<circle cx="{x}" cy="{y}" r="1.25" fill="{INKT}" stroke="none"/>'
    return g

def kraag():
    # de kraag en schouder van iemand die het shirt draagt, dichtbij; de stof met zijn binding
    vorm = 'M0 120 L0 76 Q22 60 42 55 Q55 72 68 55 Q88 60 110 76 L110 120 Z'
    g = f'<defs><clipPath id="s"><path d="{vorm}"/></clipPath></defs>'
    g += f'<path d="M47 34 V60 M63 34 V60" fill="{WIT}"/>'
    g += f'<path d="{vorm}" fill="{WIT}"/>'
    g += '<g clip-path="url(#s)">' + ''.join(f'<path d="M{x} 40 L{x+50} 125" stroke-width="0.9" stroke="#9C9C9C"/>' for x in range(-60, 110, 7)) + '</g>'
    g += f'<path d="{vorm}"/>'
    g += f'<path d="M42 55 Q55 80 68 55" stroke-width="1.6" fill="{WIT}"/>'
    g += '<path d="M8 84 Q26 70 37 66" stroke-width="1.4" stroke-dasharray="2.4 2.6"/>'
    g += '<path d="M73 66 Q86 70 102 84" stroke-width="1.4" stroke-dasharray="2.4 2.6"/>'
    return g

def stofklein():
    g = ''.join(f'<path d="M{x} 10 L{x+40} 90" stroke-width="0.9" stroke="#9C9C9C"/>' for x in range(20, 120, 6))
    g += '<path d="M50 52 Q79 46 110 52" stroke-width="1.3" stroke-dasharray="2.2 2.4"/>'
    g += '<path d="M50 58 Q79 52 110 58" stroke-width="1.3"/>'
    return g

def hanger():
    g = f'<path d="M60 34 V28 a5 5 0 1 1 5 -5" />'
    g += f'<path d="M60 34 L30 46 H90 Z" stroke-width="{SW*0.8:.2f}"/>'
    g += shirt(dy=8, s=0.78)
    return g


# ── de extra hoeken (15 oktober 2026): dezelfde lijn, voor de hoekenkiezer en het zijpaneel ──
def hoeken(ramen=True):
    # vier hoekjes van een zoeker: "dit is het kader van de foto"
    if not ramen: return ''
    d = ''
    for x, y, sx, sy in ((14, 14, 1, 1), (106, 14, -1, 1), (14, 106, 1, -1), (106, 106, -1, -1)):
        d += f'M{x} {y + 9*sy} V{y} H{x + 9*sx} '
    return f'<path d="{d}" stroke-width="{SW*0.8:.2f}"/>'

def draaipijl(y=112):
    # een halve baan om de voeten, met een pijlpunt: het model is gedraaid
    return (f'<path d="M34 {y} A26 6.5 0 0 0 86 {y}" stroke-width="{SW*0.8:.2f}" stroke-dasharray="2.6 2.8"/>'
            f'<path d="M80.5 {y+3.6} L86.2 {y-0.2} L80.4 {y-3.2}" stroke-width="{SW*0.8:.2f}"/>')

def potlood(x=78, y=82):
    # een potlood dat een lijn trekt
    return (f'<g transform="translate({x} {y}) rotate(-45)">'
            f'<path d="M0 -4.5 H26 V4.5 H0 Z" fill="{WIT}"/><path d="M26 -4.5 H31 V4.5 H26 Z" fill="{LICHT}"/>'
            f'<path d="M0 -4.5 L-9 0 L0 4.5 Z" fill="{WIT}"/><path d="M-6 -1.5 L-9 0 L-6 1.5 Z" fill="{INKT}" stroke="none"/></g>')

def gestippeld(binnen):
    return f'<g stroke-dasharray="3 3">{binnen}</g>'

def plat():
    # recht van boven: het shirt uitgelegd, de mouwen recht opzij, op een vlak
    g = f'<rect x="10" y="18" width="100" height="84" rx="8" fill="{LICHT}" stroke="none"/>'
    d = ('M45 30 Q60 39 75 30 L88 33 L106 41 L101 55 L88 51 L88 92 L32 92 L32 51 L19 55 L14 41 L32 33 Z')
    g += f'<path d="{d}" fill="{WIT}"/>'
    g += f'<path d="M45 30 Q60 43 75 30" stroke-width="{SW*0.7:.2f}"/>'
    g += f'<path d="M36 88 L84 88" stroke-width="{SW*0.6:.2f}" stroke-dasharray="2 2.6"/>'
    g += hoeken()
    return g

def binnenkant():
    # het shirt van voren, de hals open: binnen het label en de naad
    g = schaduw()
    g += shirt()
    g += f'<path d="M48.5 30.5 Q60 37.5 71.5 30.5 L71.5 40 Q60 45 48.5 40 Z" fill="{LICHT}" stroke-width="{SW*0.6:.2f}"/>'
    g += f'<rect x="55" y="31.5" width="10" height="7" rx="1" fill="{WIT}" stroke-width="1.2"/>'
    g += '<path d="M57 34 H63 M57 36.4 H61.5" stroke-width="0.9"/>'
    # een omgeslagen hoek onderaan: de binnenkant
    g += f'<path d="M66 96 L88 96 L88 78 Z" fill="{LICHT}" stroke-width="{SW*0.8:.2f}"/>'
    g += '<path d="M70 93 L85 81" stroke-width="1.2" stroke-dasharray="2 2.4"/>'
    return g

def rits():
    # één ding, beeldvullend: een rits met de schuif. Twee stroken stof, de tanden grijpen om en om.
    g = f'<path d="M14 0 H49 V120 H14 Z" fill="{LICHT}" stroke="none"/><path d="M71 0 H106 V120 H71 Z" fill="{LICHT}" stroke="none"/>'
    g += '<path d="M22 0 V120 M98 0 V120" stroke-width="1.4" stroke-dasharray="2.4 2.6"/>'
    for k, y in enumerate(range(-2, 124, 7)):
        if k % 2 == 0: g += f'<rect x="45" y="{y}" width="16" height="4.6" rx="2" fill="{WIT}" stroke-width="1.3"/>'
        else: g += f'<rect x="59" y="{y}" width="16" height="4.6" rx="2" fill="{WIT}" stroke-width="1.3"/>'
    g += f'<path d="M44 34 H76 L72 58 H48 Z" fill="{WIT}"/>'
    g += f'<rect x="53" y="55" width="14" height="40" rx="7" fill="{WIT}"/><rect x="57" y="64" width="6" height="20" rx="3" fill="{LICHT}" stroke-width="1.3"/>'
    return g

def eigen_model():
    return gestippeld(figuur()) + potlood(80, 86)

def eigen_grond():
    return gestippeld(shirt()) + potlood(80, 86)

HOEKEN = {
  'hoek-three-quarter': ('<g transform="translate(60 0) scale(0.84 1) translate(-60 0)">' + figuur(dy=-2) + '</g>' + draaipijl(), 'Schets: het model iets gedraaid, het hele product in beeld'),
  'hoek-back-on-model': (schaduw(115, 24) + figuur(achter=True), 'Schets: het product van achteren, gedragen'),
  'hoek-detail-on-model': (schaduw(115, 24) + '<g transform="translate(-17 0)">' + figuur() + '</g>' + loep(stofklein(), cx=79, cy=46, r=23), 'Schets: een detail van het product, gedragen'),
  'hoek-eigen-model': (eigen_model(), 'Schets: een eigen hoek op een model, die je zelf omschrijft'),
  'hoek-flat-lay': (plat(), 'Schets: het product recht van boven, uitgelegd'),
  'hoek-inside': (binnenkant(), 'Schets: de binnenkant, met het label'),
  'hoek-hardware': (rits(), 'Schets: één detail, beeldvullend, zoals een rits'),
  'hoek-eigen-ground': (eigen_grond(), 'Schets: een eigen hoek op de ondergrond, die je zelf omschrijft'),
}

B = {
  'catalog-voorkant': (schaduw() + shirt(), 'Schets: het product van voren, op wit'),
  'catalog-achterkant': (schaduw() + shirt(achter=True), 'Schets: het product van achteren, op wit'),
  'catalog-detail': (loep(stof()), 'Schets: een detail van de stof, dichtbij'),
  'catalog-model': (schaduw(115, 24) + figuur(), 'Schets: het product gedragen door een model'),
  'lifestyle-voorkant': (boog() + figuur(dy=1), 'Schets: een model met het product, van voren, in een setting'),
  'lifestyle-achterkant': (boog() + figuur(achter=True, dy=1), 'Schets: een model met het product, van achteren, in een setting'),
  'lifestyle-product': (boog() + hanger(), 'Schets: alleen het product, in een setting'),
  'lifestyle-detail': (boog() + '<g transform="translate(-17 0)">' + figuur(dy=1) + '</g>' + loep(stofklein(), cx=79, cy=46, r=23), 'Schets: een detail van het product, gedragen door een model'),
}
import pathlib
# python3 scripts/schetsen-zijpaneel.py  → public/img/schets/*.svg (zie src/data/overzichtbeelden.js)
uit = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'img' / 'schets'
uit.mkdir(parents=True, exist_ok=True)
for naam, (binnen, titel) in {**B, **HOEKEN}.items():
    (uit / f'{naam}.svg').write_text(svg(binnen, titel))
print(f'{len(B) + len(HOEKEN)} schetsen in {uit}')
