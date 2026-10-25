# Posters, posterraster en icoonschema voor het merkschema (§10).
# Alles in SVG op een vast raster, zodat elke poster dezelfde marges, balken en lijnen heeft.
# Lijnen: 0,6 px (niet-schalend), met een zachte fade aan één of beide uiteinden.
import json, math, pathlib, re

HIER = pathlib.Path(__file__).parent
Q = json.load(open(HIER / 'hoeken.json'))
SRC_W, SRC_H = 1728, 1296          # het kader: de witte stand (2304 × 1296) vanaf x 420, 4:3

LIJN = 0.6          # lijndikte in px
M = 28              # marge op een poster van 400 x 500
_n = [0]

def uid(p):
    _n[0] += 1
    return f'{p}{_n[0]}'

def lijn(x1, y1, x2, y2, kleur, fade='beide', op=1.0, dikte=LIJN):
    g = uid('g')
    st = {'beide': [(0, 0), (.22, 1), (.78, 1), (1, 0)],
          'begin': [(0, 0), (.3, 1), (1, 1)],
          'eind': [(0, 1), (.7, 1), (1, 0)],
          'geen': [(0, 1), (1, 1)]}[fade]
    stops = ''.join(f'<stop offset="{o}" stop-color="{kleur}" stop-opacity="{a * op:.2f}"/>' for o, a in st)
    return (f'<linearGradient id="{g}" gradientUnits="userSpaceOnUse" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}">{stops}</linearGradient>'
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="url(#{g})" stroke-width="{dikte}" vector-effect="non-scaling-stroke"/>')

def kruis(x, y, kleur, r=5, op=1):
    return f'<path d="M{x - r:.1f} {y:.1f}h{2 * r}M{x:.1f} {y - r:.1f}v{2 * r}" stroke="{kleur}" stroke-opacity="{op}" stroke-width="{LIJN}" vector-effect="non-scaling-stroke"/>'

def hoeken(kleur, w=400, h=500, m=M, op=.55):
    k = 7
    return (f'<g fill="none" stroke="{kleur}" stroke-opacity="{op}" stroke-width="{LIJN}" vector-effect="non-scaling-stroke">'
            f'<path d="M{m} {m + k}V{m}h{k}M{w - m - k} {m}h{k}v{k}M{w - m} {h - m - k}v{k}h{-k}M{m + k} {h - m}h{-k}v{-k}"/></g>')

def balken(kleur, links_boven, rechts_boven, links_onder, rechts_onder='visuails.com', w=400, h=500, m=M, fs=10):
    """De balken. Boven: het label van de site (IBM Plex Mono, hoofdletters): "/ 01" met het nummer in het
    accent (blauw uur op licht, blauw licht op donker), rechts de naam. Onder: de regel en het adres in Urbanist."""
    f = f'font-family="Urbanist, sans-serif" font-weight="600" font-size="{fs}" fill="{kleur}"'
    mono = f'font-family="IBM Plex Mono, monospace" font-weight="500" font-size="{fs - 1}" letter-spacing=".06em" fill="{kleur}"'
    accent = BLAUW_LICHT if kleur.upper() in ('#FFFFFF', '#FFF', 'WHITE') else VIOLET
    m_ = re.match(r'^(\d\d) / (\d\d)$', links_boven)
    if m_:
        lb = f'<text x="{m + 12}" y="{m + 14}" {mono}>/ <tspan fill="{accent}">{m_.group(1)}</tspan><tspan fill-opacity=".55"> — {m_.group(2)}</tspan></text>'
    else:
        lb = f'<text x="{m + 12}" y="{m + 14}" {mono}>{links_boven.upper()}</text>'
    return (lb + f'<text x="{w - m - 12}" y="{m + 14}" text-anchor="end" {mono}>{rechts_boven.upper()}</text>'
            f'<text x="{m + 12}" y="{h - m - 8}" {f}>{links_onder}</text>'
            f'<text x="{w - m - 12}" y="{h - m - 8}" text-anchor="end" {f}>{rechts_onder}</text>')

def stapel(x, y, b, kleur):
    """De gestapelde lockup (V-merk boven het woordmerk), breedte b."""
    return f'<svg x="{x:.1f}" y="{y:.1f}" width="{b:.1f}" height="{b * 1069 / 1650:.1f}" viewBox="0 0 1650 1069" style="color:{kleur}"><use href="#l-stapel"/></svg>'

def merk(x, y, b, kleur):
    """Alleen het V-merk, breedte b."""
    return f'<svg x="{x:.1f}" y="{y:.1f}" width="{b:.1f}" height="{b * 813.25 / 702:.1f}" viewBox="0 0 702 813.25" style="color:{kleur}"><use href="#l-mark"/></svg>'

def woordmerk(x, y, b, kleur):
    return f'<svg x="{x:.1f}" y="{y:.1f}" width="{b:.1f}" height="{b * 278 / 1650:.1f}" viewBox="0 0 1650 278" style="color:{kleur}"><use href="#l-wm"/></svg>'

def pt(p, s, ox, oy):
    return (p[0] * s + ox, p[1] * s + oy)

def verleng(a, b, t0, t1):
    return ((a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1))

def poster(inhoud, label, beschrijving, vorm='p', alt=''):
    vb = {'p': '0 0 400 500', 's': '0 0 360 640', 'b': '0 0 640 360'}[vorm]
    return (f'<figure class="pst pst-{vorm}"><svg viewBox="{vb}" role="img" aria-label="{alt or label}">{inhoud}</svg>'
            f'<figcaption><b>{label}</b>{beschrijving}</figcaption></figure>')

# ── kleuren ──
# Blauw uur (lijst 55, 24 oktober 2026). De namen blijven, zodat de opbouw van elke poster dezelfde blijft:
# LILA is nu de lijn op licht (veldlijn), VIOLET het ene accent (blauw uur), NACHT en INKT allebei inkt.
LILA, VIOLET, NACHT, INKT, WIT = '#858A94', '#25508B', '#0B0F17', '#0B0F17', '#FFFFFF'
BLAUW_LICHT, GRIJS, VLAK = '#80A7DD', '#636974', '#F4F5F7'

def beeld_met_fade(href, x, y, w, h, boven=.16, onder=.80, links=0.0):
    mid = uid('m'); gid = uid('f')
    stops = f'<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="{boven}" stop-color="#fff"/><stop offset="{onder}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>'
    lg = ''
    rect = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#{gid})"/>'
    if links:
        g2 = uid('f')
        lg = f'<linearGradient id="{g2}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="{links}" stop-color="#fff"/></linearGradient>'
        m2 = uid('m')
        return (f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">{stops}</linearGradient>{lg}'
                f'<mask id="{mid}">{rect}</mask><mask id="{m2}"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#{g2})"/></mask></defs>'
                f'<g mask="url(#{m2})"><image href="{href}" x="{x}" y="{y}" width="{w}" height="{h}" mask="url(#{mid})" preserveAspectRatio="xMidYMid slice"/></g>')
    return (f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">{stops}</linearGradient><mask id="{mid}">{rect}</mask></defs>'
            f'<image href="{href}" x="{x}" y="{y}" width="{w}" height="{h}" mask="url(#{mid})" preserveAspectRatio="xMidYMid slice"/>')

def scherm_lijnen(s, ox, oy, kleur, tot_rand=True, w=400, h=500):
    q = {k: pt(v, s, ox, oy) for k, v in Q['laptop'].items()}
    out = []
    for a, b, f in [('tl', 'tr', 'beide'), ('bl', 'br', 'beide'), ('tl', 'bl', 'beide'), ('tr', 'br', 'beide')]:
        p0, p1 = verleng(q[a], q[b], -0.55, 1.55)
        out.append(lijn(*p0, *p1, kleur, f, op=.85))
    for k in q.values():
        out.append(kruis(*k, VIOLET, 4.5, .9))
    return ''.join(out), q


def xray(achter, ov, masker, w=400, h=500, boven=''):
    """Tekent de lijnen en tekst twee keer: gewoon, en in wit waar de foto donker is (masker)."""
    mid = uid('xm')
    return (achter + ov(False)
            + f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="{w}" height="{h}"><image href="{masker}" x="0" y="0" width="{w}" height="{h}" preserveAspectRatio="none"/></mask>'
            + f'<g mask="url(#{mid})">{ov(True)}</g>' + boven)

def kl(x, kleur):
    return WIT if x else kleur

# De posters zelf staan in posters9.py (versie 9, Blauw uur sinds levering 68).

def lijnstaal():
    g = ['<rect width="400" height="160" fill="#fff"/>']
    rows = [('beide', 'fade aan beide kanten · standaard'), ('eind', 'fade aan één kant · een lijn die uit een vorm komt'), ('geen', 'zonder fade · alleen voor maatlijnen')]
    for i, (fd, t) in enumerate(rows):
        y = 34 + i * 44
        g.append(lijn(24, y, 376, y, VIOLET, fd, .9))
        g.append(f'<text x="24" y="{y + 18}" font-family="Urbanist, sans-serif" font-weight="600" font-size="10" fill="#636974">{t}</text>')
    return f'<svg viewBox="0 0 400 160" role="img" aria-label="Drie soorten lijnen met en zonder fade">{"".join(g)}</svg>'

ICOON_NAMEN = ['pijl', 'rechts', 'links', 'neer', 'check', 'speel', 'pauze', 'info', 'menu', 'doos', 'label', 'klok', 'schild', 'chat', 'camera', 'f']

def iconen():
    V = 'viewBox="0 0 702 813.25"'
    verloop = 'background:#25508B'            # Blauw uur: vlak, geen verloop
    maten = ''.join(f'<span class="ic-maat"><span class="icoon" style="width:{p}px;{verloop}"><svg style="color:#fff" {V} aria-hidden="true"><use href="#l-mark"/></svg></span><em>{p}</em></span>' for p in (180, 120, 64, 32, 16))
    ui = ''.join(f'<span class="ui-tegel"><svg viewBox="0 0 16 16" aria-hidden="true"><use href="#i-{n}"/></svg><em>{n}</em></span>' for n in ICOON_NAMEN)
    return f'''
  <h3 style="margin-top:40px">Iconen</h3>
  <div class="raster r2" style="margin-top:14px">
    <div class="kaart wit"><h4>App-icoon in alle maten</h4>
      <div class="ic-rij">{maten}</div>
      <p class="klein" style="margin:14px 0 0">Een afgerond vierkant (23%), het V-merk op 46% van de breedte, precies in het midden. Onder de 32 px valt het blaadje rechtsboven weg in het beeld. Daarom bestaat 16 px alleen als tab-icoon: wit op blauw uur.</p></div>
    <div class="kaart wit"><h4>Tab, profiel en deelplaatje</h4>
      <div class="tabje"><span class="fav"><svg style="color:#fff" {V} aria-hidden="true"><use href="#l-mark"/></svg></span><span>Productbeelden zonder shoot | VISUAILS</span><i>×</i></div>
      <div class="profiel"><span class="rond" style="{verloop}"><svg style="color:#fff" {V} aria-hidden="true"><use href="#l-mark"/></svg></span><div><b>visuails_com</b><span>Productbeelden voor kledingmerken</span></div></div>
      <div class="deel"><span class="deel-beeld"><img src="img/laptop-foto-klein.webp" alt=""></span><div><em>visuails.com</em><b>Productbeelden zonder shoot</b><span>Catalog, lifestyle en video van je eigen productfoto's.</span></div></div>
      <p class="klein" style="margin:14px 0 0">Tab: wit V op blauw uur. Profielfoto: een cirkel, het V op 42%. Deelplaatje: het laptopbeeld, zonder tekst erop.</p></div>
  </div>
  <div class="kaart wit" style="margin-top:16px"><h4>Lijniconen op de site</h4>
    <div class="ui-raster">{ui}</div>
    <p class="klein" style="margin:14px 0 0">Raster van 16 × 16, lijn 1,6, ronde uiteinden en hoeken, geen vulling (behalve "speel"). Ze staan altijd in een cirkel (knop) of naast tekst, nooit los als versiering. Nieuwe iconen volgen dezelfde regels.</p></div>
'''
