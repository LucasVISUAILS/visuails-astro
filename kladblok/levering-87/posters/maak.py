# VISUAILS · posters 13-20 (levering 87), in het Nederlands en het Engels. Schrijft posters-nl.html en posters-en.html;
# render.cjs fotografeert elke poster en meet het contrast van elke tekst tegen wat eronder ligt (contrast.py).
# Letters uit public/fonts, kleuren uit docs/KLEURENSCHEMA.md, teksten van de site (NL en EN), prijzen uit
# src/data/pricing.js. Beelden: Catalog Custom styles (NONSTD, Room 84). Om en om bewogen (13, 15, 17, 19) en stil.
#
# Hoofdletters: de koppen staan in hoofdletters (text-transform). "Eén" wordt dan "EÉN", in het Nederlands is
# het "ÉÉN"; daarom staat het hier als "Één" (alleen in koppen die in hoofdletters staan).
import json, pathlib
HIER = pathlib.Path(__file__).parent
ROOT = HIER.parents[2]                                   # visuails-astro
FONTS = (ROOT / 'public' / 'fonts').as_uri()
# de foto's: images\Before & After\Catalog Custom styles naast de sitemap (of VISUAILS_BEELDEN)
import os
BRON = pathlib.Path(os.environ.get('VISUAILS_BEELDEN') or ROOT.parent / 'images' / 'Before & After' / 'Catalog Custom styles').as_uri()
WM = json.load(open(HIER / 'woordmerk.json'))

INKT, WIT, GRIJS, LIJN = '#0F1217', '#FBFCFF', '#636974', '#E6E8EC'
PW, PH, M = 1200, 1500, 64

# ── het merk: alleen de bestaande paden, herkleurd ──────────────────────────────────────────────────────────
V_D = ['M 0.0 16.0 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 L 515.5 546.25 L 264.5 119.0 '
       'A 201.21 201.21 0 0 0 101.0 15.75 L 0.0 16.0 Z',
       'M 701.75 0.0 L 543.25 366.25 L 507.25 453.75 L 652.0 259.25 L 702.0 338.25 L 701.75 0.0 Z']
V_W, V_H = 702, 813.25
WM_X, WM_Y, WM_W, WM_H = [float(x) for x in WM['symbool'].split()]

def snede(x1, y1, x2, y2, id_):
    return (f'<linearGradient id="{id_}" gradientUnits="userSpaceOnUse" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}">'
            '<stop offset="0" stop-color="#1A4279"/><stop offset=".55" stop-color="#25508B"/><stop offset="1" stop-color="#2D61A8"/></linearGradient>')

def snede_vak(x, y, w, h, id_):
    """de snede-fade (126,87°) zoals CSS hem over een vak van w × h legt"""
    L = .8 * w + .6 * h; cx, cy = x + w / 2, y + h / 2
    return snede(cx - .4 * L, cy - .3 * L, cx + .4 * L, cy + .3 * L, id_)

DEFS = (snede_vak(0, 0, V_W, V_H, 'v-snede') + snede(4.25, 10.2, 19.75, 13.8, 'st-snede'))

def v_paden(x, y, h):
    """het V-merk als paden op (x, y) met hoogte h, voor een clipPath"""
    s = h / V_H; t = f'translate({x:.2f} {y:.2f}) scale({s:.5f})'
    return f'<path transform="{t}" d="{V_D[0]}"/><path transform="{t}" d="{V_D[1]}"/>'

def wm_pad(x, y, w):
    s = w / WM_W
    return f'<path transform="translate({x:.2f} {y + s * -WM_Y:.2f}) scale({s:.5f})" fill-rule="evenodd" clip-rule="evenodd" d="{WM["d"]}"/>'

def v_merk(x, y, h, kleur=INKT):
    w = h * V_W / V_H
    return (f'<svg class="merk" style="left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px;height:{h}px" viewBox="0 0 {V_W} {V_H}">'
            f'<g fill="{kleur}"><path d="{V_D[0]}"/><path d="{V_D[1]}"/></g></svg>')

STREEP = '<svg class="streep" viewBox="0 0 24 24" aria-hidden="true"><path fill="{k}" d="M19.75 10.2L17.05 13.8L4.25 13.8L6.95 10.2Z"/></svg>'

def kopregel(nr, naam, licht=False):
    """het sectielabel linksboven (de streep in de snede, het nummer, de naam) en het adres rechtsboven"""
    k = WIT if licht else 'url(#st-snede)'
    c = 'wit' if licht else 'inkt'
    return (f'<div class="t lab {c}" style="left:{M}px">{STREEP.format(k=k)}<span>{nr}</span><span>{naam}</span></div>'
            f'<div class="t lab {c}" style="right:{M}px">visuails.com</div>')

def kop(regels, w, px, kleur='inkt'):
    spans = ''.join(f'<span class="r">{r}</span>' for r in regels)
    return f'<h2 class="t kop {kleur}" data-w="{w}" style="font-size:{px}px">{spans}</h2>'

def zin(tekst, w, kleur='inkt', px=26):
    return f'<p class="t zin {kleur}" style="max-width:{w}px;font-size:{px}px">{tekst}</p>'

def mono(tekst, kleur='inkt', stijl=''):
    return f'<div class="t mono {kleur}" style="{stijl}">{tekst}</div>'

def groep(inhoud, x=M, y=None, onder=None, gap=24, rechts=None):
    pos = f'left:{x}px;' if rechts is None else f'right:{rechts}px;'
    pos += f'top:{y}px' if y is not None else f'bottom:{onder}px'
    return f'<div class="groep" style="{pos};gap:{gap}px">{inhoud}</div>'

def img(src, stijl='', cls='beeld'):
    return f'<img class="{cls}" src="{src}" style="{stijl}" alt="">'

def bron(pad): return f'{BRON}/{pad}'

def poster(nr, slug, inhoud, grond=WIT):
    return f'<section class="p" data-naam="{nr}-{slug}" style="background:{grond}">{inhoud}</section>'

def doek(inhoud):
    return f'<svg class="vul" viewBox="0 0 {PW} {PH}" preserveAspectRatio="none">{inhoud}</svg>'

def svgbeeld(src, clip=''):
    c = f' clip-path="url(#{clip})"' if clip else ''
    return f'<image href="{src}" x="0" y="0" width="{PW}" height="{PH}" preserveAspectRatio="xMidYMid slice"{c}/>'

# ── de teksten, letterlijk van de site (VoorpaginaHal.astro, hoeHetWerkt.js, catalogStyles, schema.js, pricing.js) ──
TEKST = {
  'nl': dict(
    namen={13: 'Bewogen', 14: 'Proefvel', 15: 'Nachtspoor', 16: 'Anatomie', 17: 'De snede', 18: 'Twee looks', 19: 'Eerst zien', 20: 'De wereld'},
    k13=['Jouw merk,', 'zoals jij hem ziet.'], z13='Productfoto’s, lifestyle en video voor je fashionmerk, gemaakt van een paar foto’s van je product.',
    k14=['Gelijk aan', 'je set.'], z14='Voorkant, achterkant, detail en op model, op de achtergrond die bij je merk past.',
    r14=['Voorkant', 'Achterkant', 'Detail', 'Op model'], o14='04 · Op model, vergroot', v14='Vanaf €39 per product',
    k15=['Kies een look.'], z15='Je collectie als één shoot.',
    l16=[['Jouw', 'achtergrond'], ['Nagekeken'], ['Uitgeknipt'], ['Schaduw'], ['Gelijk aan', 'je set']],
    z16='Jij stuurt alleen een paar foto’s.', k16=['Wij doen', 'de rest.'],
    k17=['Elk beeld', 'voor je merk.'], z17='Van productpagina tot feed.', a17='Feed · bewogen', b17='Productpagina · stil',
    k18=['Onmiskenbaar', 'van jou.'], e18='Eigen look', z18='Een look uit de collectie, of een eigen stijl die wij voor je merk ontwerpen.',
    p19='Proef', k19=['Eerst zien?', 'Één product voor €1'], z19='Gemaakt van jouw eigen foto · één per bedrijf.',
    k20=['Bouw de wereld', 'van je merk.'], z20='Elk beeld is een look die je kunt bestellen.'),
  'en': dict(
    namen={13: 'In motion', 14: 'Contact sheet', 15: 'Night trail', 16: 'Anatomy', 17: 'The cut', 18: 'Two looks', 19: 'See it first', 20: 'The world'},
    k13=['Your brand,', 'as you see it.'], z13='Product photos, lifestyle and video for your fashion brand, made from a few photos of your product.',
    k14=['Matches', 'your set.'], z14='Front, back, detail and on model, on the background that suits your brand.',
    r14=['Front', 'Back', 'Detail', 'On model'], o14='04 · On model, enlarged', v14='From €39 per product',
    k15=['Pick a look.'], z15='Your collection as one shoot.',
    l16=[['Your', 'background'], ['Checked'], ['Cut out'], ['Shadow'], ['Matches', 'your set']],
    z16='You only send a few photos.', k16=['We do', 'the rest.'],
    k17=['Every image', 'for your brand.'], z17='From product page to feed.', a17='Feed · in motion', b17='Product page · still',
    k18=['Unmistakably', 'yours.'], e18='Custom look', z18='A look from the collection, or a style of your own that we design for your brand.',
    p19='Trial', k19=['See it first?', 'One product for €1'], z19='Made from your own photo · one per business.',
    k20=['Build the world', 'of your brand.'], z20='Every image is a look you can order.'),
}


def bouw(taal):
    T = TEKST[taal]; N = T['namen']; P = []

    # ── 13 · BEWOGEN ─ het V-merk is een raam. Erin staat het beeld stil en scherp, eromheen beweegt het langs de
    #    snede (53,13°) en kleurt het in het blauwe uur (multiply met de fade Blauw uur → Nevel, omgedraaid).
    Vh = 1000; Vw = Vh * V_W / V_H; Vx = (PW - Vw) / 2 + 40; Vy = 118
    d13 = ('<defs><linearGradient id="b13" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#44699D"/>'
           '<stop offset="1" stop-color="#25508B"/></linearGradient>'
           f'<clipPath id="c13">{v_paden(Vx, Vy, Vh)}</clipPath></defs>'
           + svgbeeld('img/p13-bewogen.jpg')
           + f'<rect width="{PW}" height="{PH}" fill="url(#b13)" style="mix-blend-mode:multiply"/>'
           + svgbeeld('img/p13-scherp.jpg', 'c13'))
    P.append(poster(13, 'bewogen', doek(d13) + kopregel('13', N[13], licht=True)
                    + groep(kop(T['k13'], 780, 112, 'wit') + zin(T['z13'], 660, 'wit', 24), onder=M)))

    # ── 14 · PROEFVEL ─ vier opnamen van één product als contactblad; de gekozen omcirkeld en hieronder vergroot.
    fw = (PW - 2 * M - 3 * 16) / 4; fh = fw * 5 / 4; fy = 560
    ramen = ''.join(
        f'<figure class="raam" style="left:{M + i * (fw + 16):.1f}px;top:{fy}px;width:{fw:.1f}px">'
        f'<div class="t mono inkt">{n:02d}<span class="grijs-t">&nbsp;{lbl}</span></div>'
        f'<div class="foto" style="height:{fh:.1f}px;border-radius:12px">{img(bron("Room 84/Shoes/" + f))}</div></figure>'
        for i, (n, lbl, f) in enumerate(zip([1, 2, 3, 4], T['r14'], ['Front.jpg', 'Back.jpg', 'Detail.jpg', 'On-model.jpg'])))
    gx = M + 3 * (fw + 16); fy_foto = fy + 22.5 + 16
    big_y = fy_foto + fh + 48; big_h = PH - M - 22.5 - 24 - big_y
    P.append(poster(14, 'proefvel', kopregel('14', N[14])
                    + groep(kop(T['k14'], 1072, 140) + zin(T['z14'], 620), y=144) + ramen
                    + f'<div class="omcirkel" style="left:{gx - 10:.1f}px;top:{fy_foto - 10:.1f}px;width:{fw + 20:.1f}px;height:{fh + 20:.1f}px"></div>'
                    + f'<div class="foto" style="left:{M}px;top:{big_y:.1f}px;width:{PW - 2 * M}px;height:{big_h:.1f}px;border-radius:32px">'
                    + img(bron('Room 84/Shoes/On-model.jpg'), 'object-position:50% 74%') + '</div>'
                    + groep(mono(T['o14']), onder=M) + groep(mono(T['v14']), onder=M, rechts=M)))

    # ── 15 · NACHTSPOOR ─ Room 84 is één directe flits van dichtbij, 's avonds. Hier aan het eind van een lange
    #    sluitertijd (achtergordijnflits): het figuur staat scherp, op de muur blijft een spoor achter (beeld.py,
    #    flitsspoor). Onderaan valt de nacht in: de Inkt-fade van het inktblok, met de kop in wit. Geen woordmerk
    #    meer (Lucas, lijst 74: "andere achtergrond foto of geen tekstlogo").
    d15 = ('<defs><linearGradient id="n15" x1="0" y1="0" x2="0" y2="1">'
           '<stop offset=".5" stop-color="#0F1217" stop-opacity="0"/><stop offset=".74" stop-color="#0F1217" stop-opacity=".86"/>'
           '<stop offset=".9" stop-color="#172945" stop-opacity=".93"/><stop offset="1" stop-color="#1A4279" stop-opacity=".96"/>'
           f'</linearGradient></defs><rect width="{PW}" height="{PH}" fill="url(#n15)"/>')
    P.append(poster(15, 'nachtspoor', '<div class="vul">' + img('img/p15-bewogen.jpg', 'object-position:50% 30%') + '</div>'
                    + doek(d15) + kopregel('15', N[15])
                    + groep(kop(T['k15'], 1072, 140, 'wit') + zin(T['z15'], 700, 'wit', 26), onder=M)))

    # ── 16 · ANATOMIE ─ één product en wat er gebeurt, met de woorden van de voorpagina (lagen).
    s16 = .42; ix, iy = 184, 130
    def pt(X, Y): return (ix + s16 * X, iy + s16 * Y)
    merk16 = [('03', T['l16'][0], pt(300, 500), 'l'), ('01', T['l16'][1], pt(946, 880), 'l'),
              ('02', T['l16'][2], pt(190, 1400), 'l'), ('04', T['l16'][3], pt(1380, 1810), 'r')]
    maat_x = ix + s16 * 1770; maat_y0, maat_y1 = iy + s16 * 232, iy + s16 * 2036
    lijnen = (f'<path d="M{maat_x:.1f} {maat_y0:.1f}V{maat_y1:.1f}M{maat_x - 10:.1f} {maat_y0:.1f}h20M{maat_x - 10:.1f} {maat_y1:.1f}h20" stroke="{INKT}" stroke-width="1.5" fill="none"/>')
    labels = ''
    for nr, regels, (px, py), kant in merk16:
        h = (len(regels) + 1) * 22.5
        tekst = nr + ''.join(f'<br>{r}' for r in regels)
        breed = max(len(r) for r in regels + [nr]) * 12.6 + 8
        if kant == 'l':
            x_eind = M + breed + 16
            labels += mono(tekst, 'inkt', f'left:{M}px;top:{py - h / 2:.1f}px')
        else:
            x_eind = PW - M - breed - 16
            labels += mono(tekst, 'inkt', f'right:{M}px;top:{py - h / 2:.1f}px;text-align:right')
        lijnen += (f'<line x1="{px:.1f}" y1="{py:.1f}" x2="{x_eind:.1f}" y2="{py:.1f}" stroke="{INKT}" stroke-width="1.5"/>'
                   f'<path d="M{px - 9:.1f} {py:.1f}h18M{px:.1f} {py - 9:.1f}v18" stroke="{INKT}" stroke-width="2.5"/>')
    my = (maat_y0 + maat_y1) / 2
    l5 = T['l16'][4]; b5 = max(len(r) for r in l5) * 12.6 + 8
    labels += mono('05' + ''.join(f'<br>{r}' for r in l5), 'inkt', f'right:{M}px;top:{my - 33.75:.1f}px;text-align:right')
    lijnen += f'<line x1="{maat_x:.1f}" y1="{my:.1f}" x2="{PW - M - b5 - 16:.1f}" y2="{my:.1f}" stroke="{INKT}" stroke-width="1.5"/>'
    P.append(poster(16, 'anatomie',
                    img('img/p16-voor.jpg', f'position:absolute;left:{ix}px;top:{iy}px;width:{1856 * s16:.1f}px;height:{2304 * s16:.1f}px')
                    + doek(lijnen) + labels + kopregel('16', N[16])
                    + groep(zin(T['z16'], 700, 'inkt', 28) + kop(T['k16'], 1072, 150), onder=M)))

    # ── 17 · DE SNEDE ─ één beeld, gesneden langs 53,13° met de kier van het merk: boven beweegt het (de feed),
    #    onder staat het stil (de productpagina). De twee bijschriften staan langs de snede, elk aan zijn eigen kant
    #    van de kier, op dezelfde hoogte (Lucas, lijst 74: "kleine teksten staan niet echt op fijne plekken").
    kier = 16
    x0 = PW / 2 - .75 * PH / 2
    def lijn_x(y): return x0 + .75 * (PH - y)
    dx = kier / 2 / .8
    boven = f'0,0 {lijn_x(0) - dx:.1f},0 {lijn_x(PH) - dx:.1f},{PH} 0,{PH}'
    onder_ = f'{lijn_x(0) + dx:.1f},0 {PW},0 {PW},{PH} {lijn_x(PH) + dx:.1f},{PH}'
    Py = SNEDE_Y; Px = lijn_x(Py); afst = kier / 2 + 14 + 11.25       # het midden van elk bijschrift, haaks op de snede
    def langs(tekst, kant):
        cx, cy = Px - kant * .8 * afst, Py - kant * .6 * afst
        return mono(tekst, 'inkt', f'left:{cx:.1f}px;top:{cy:.1f}px;transform:translate(-50%,-50%) rotate(-53.13deg);white-space:nowrap')
    d17 = (f'<defs><clipPath id="c17a"><polygon points="{boven}"/></clipPath><clipPath id="c17b"><polygon points="{onder_}"/></clipPath></defs>'
           + svgbeeld('img/p17-bewogen.jpg', 'c17a') + svgbeeld('img/p17-scherp.jpg', 'c17b'))
    P.append(poster(17, 'de-snede', doek(d17) + kopregel('17', N[17])
                    + groep(kop(T['k17'], 660, 116) + zin(T['z17'], 520), y=144)
                    + langs(T['a17'], 1) + langs(T['b17'], -1)))

    # ── 18 · TWEE LOOKS ─ twee merken, twee werelden, dezelfde opname. Niet gespiegeld: de tweede staat lager.
    tw = (PW - 2 * M - 32) / 2; th = tw * 5 / 4; t1, t2 = 470, 560
    P.append(poster(18, 'twee-looks', kopregel('18', N[18]) + groep(kop(T['k18'], 1072, 150), y=144)
                    + f'<div class="foto lijn" style="left:{M}px;top:{t1}px;width:{tw:.1f}px;height:{th:.1f}px;border-radius:24px">{img(bron("NONSTD/Socks/Front.jpg"))}</div>'
                    + f'<div class="foto lijn" style="left:{M + tw + 32:.1f}px;top:{t2}px;width:{tw:.1f}px;height:{th:.1f}px;border-radius:24px">{img(bron("Room 84/Bag/Front.jpg"))}</div>'
                    + groep(mono(T['e18'] + ' · 01'), y=t1 + th + 20)
                    + groep(mono(T['e18'] + ' · 02'), x=M + tw + 32, y=t2 + th + 20)
                    + groep(zin(T['z18'], 480), onder=M)
                    + v_merk(PW - M - 96 * V_W / V_H, PH - M - 96, 96, 'url(#v-snede)')))

    # ── 19 · EERST ZIEN ─ de kleuren van één product, uitgetrokken langs de snede; het V-merk in wit snijdt erdoor,
    #    de proef staat in het ene inktblok (de nacht, afgesneden op 53° rechtsonder: 48 × 64).
    bh = 560; by = PH - M - bh
    blok = doek(f'<defs><linearGradient id="nacht19" gradientUnits="userSpaceOnUse" x1="{M}" y1="{by}" x2="{PW - M}" y2="{PH - M}">'
                '<stop offset="0" stop-color="#0F1217"/><stop offset=".38" stop-color="#0F1217"/><stop offset=".72" stop-color="#172945"/><stop offset="1" stop-color="#1A4279"/></linearGradient></defs>'
                f'<path fill="url(#nacht19)" d="M{M + 32} {by} H{PW - M - 32} A32 32 0 0 1 {PW - M} {by + 32} V{PH - M - 64} L{PW - M - 48} {PH - M} H{M + 32} A32 32 0 0 1 {M} {PH - M - 32} V{by + 32} A32 32 0 0 1 {M + 32} {by} Z"/>')
    d19 = ('<defs><linearGradient id="b19" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25508B"/><stop offset=".45" stop-color="#44699D"/><stop offset="1" stop-color="#A2B7D2"/></linearGradient></defs>'
           + svgbeeld('img/p19-bewogen.jpg') + f'<rect width="{PW}" height="{PH}" fill="url(#b19)" style="mix-blend-mode:multiply"/>')
    P.append(poster(19, 'eerst-zien', doek(d19) + v_merk(470, -120, 1000, WIT) + blok + kopregel('19', N[19], licht=True)
                    + groep(mono(T['p19'], 'wit') + kop(T['k19'], 960, 104, 'wit'), x=M + 56, y=by + 56, gap=28)
                    + groep(zin(T['z19'], 700, 'wit86'), x=M + 56, onder=M + 56)))

    # ── 20 · DE WERELD ─ een sfeerbeeld over de hele poster, onderaan een wit vlak (32 rondom) met de kop.
    P.append(poster(20, 'de-wereld', '<div class="vul">' + img(bron('Room 84/Bag/on-model.jpg'), 'object-position:50% 30%') + '</div>'
                    + f'<div class="paneel" style="left:{M}px;right:{M}px;bottom:{M}px;height:320px;border-radius:32px"></div>'
                    + kopregel('20', N[20])
                    + groep(kop(T['k20'], 760, 104) + zin(T['z20'], 640), x=M + 48, onder=M + 48)
                    + v_merk(PW - M - 48 - 128 * V_W / V_H, PH - M - 320 + 48, 128, 'url(#v-snede)')))
    return P


SNEDE_Y = 330
CSS = f'''
@font-face{{font-family:"VISUAILS Display";font-weight:700;src:url({FONTS}/visuails-display/VISUAILSDisplay-Bold.woff2) format("woff2")}}
@font-face{{font-family:"DM Sans";font-weight:300 700;src:url({FONTS}/dm-sans/dm-sans-latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}}
@font-face{{font-family:"DM Sans";font-weight:300 700;src:url({FONTS}/dm-sans/dm-sans-latin-ext.woff2) format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF}}
@font-face{{font-family:"IBM Plex Mono";font-weight:600;src:url({FONTS}/ibm-plex-mono/IBMPlexMono-600.woff2) format("woff2")}}
body{{margin:0;background:#E4E7ED}}
.p{{position:relative;width:{PW}px;height:{PH}px;overflow:hidden;margin:0 0 24px;color:{INKT}}}
.vul{{position:absolute;inset:0;width:100%;height:100%}}
.vul .beeld,.foto .beeld{{width:100%;height:100%;object-fit:cover;display:block}}
.foto{{position:absolute;overflow:hidden;background:#F0F1F6}}
.foto.lijn::after{{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px {LIJN}}}
.raam{{position:absolute;margin:0;display:flex;flex-direction:column;gap:16px}} .raam .foto{{position:relative}}
.omcirkel{{position:absolute;border:3px solid #25508B;border-radius:20px}}
.paneel{{position:absolute;background:{WIT}}}
.merk{{position:absolute;overflow:visible}}
.groep{{position:absolute;display:flex;flex-direction:column;align-items:flex-start}}
.groep .t,.raam .t{{position:static}}
.t{{position:absolute;margin:0}}
.kop{{font-family:"VISUAILS Display";font-weight:700;text-transform:uppercase;letter-spacing:-.01em;line-height:.92;white-space:nowrap}}
.kop .r{{display:block}}
.zin{{font-family:"DM Sans";font-weight:400;line-height:1.3;letter-spacing:-.005em;text-wrap:pretty}}
.mono,.lab{{font-family:"IBM Plex Mono";font-weight:600;font-size:18px;line-height:1.25;letter-spacing:.1em;text-transform:uppercase}}
.lab{{top:{M}px;display:flex;align-items:center;gap:12px}}
.lab .streep{{width:28px;height:28px;margin:-4px -2px -4px -4px}}
.inkt{{color:{INKT}}} .wit{{color:{WIT}}} .wit86{{color:rgba(251,252,255,.86)}}
.grijs-t{{color:{GRIJS}}}
body.kaal .t{{visibility:hidden}}
'''

SCRIPT = '''<script>
/* elke kop zo groot dat de langste regel in data-w past (hoogstens de opgegeven maat) */
window.pas = () => { for (const k of document.querySelectorAll('.kop')) {
  const w = +k.dataset.w; let px = parseFloat(k.style.fontSize);
  const br = () => Math.max(...[...k.querySelectorAll('.r')].map((s) => { const g = document.createRange(); g.selectNodeContents(s); return g.getBoundingClientRect().width; }));
  while (br() > w && px > 40) { px -= 1; k.style.fontSize = px + 'px'; }
  k.dataset.px = px; } };
</script></body></html>'''

if __name__ == '__main__':
    for taal in TEKST:
        P = bouw(taal)
        html = (f'<!doctype html><html lang="{taal}"><head><meta charset="utf-8"><style>{CSS}</style></head><body>'
                f'<svg width="0" height="0" style="position:absolute"><defs>{DEFS}</defs></svg>' + ''.join(P) + SCRIPT)
        open(HIER / f'posters-{taal}.html', 'w').write(html)
        print(taal, len(P), 'posters')
