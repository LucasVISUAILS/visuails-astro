"""VISUAILS — de laptopvideo van de opening als gewone video, met het veld erin (levering 90, 8 november 2026).

    python3 scripts/laptop-video-90.py kladblok/levering-90/21_9_laptop-90.mp4 <werkmap>

Lucas, 8 november (15:59): "Ik heb 21 9 laptop.mp4 verbeterd en de nieuwe video staat in de map. Ik wil dat je deze gebruikt
voor de home page. Gewoon de video gebruiken niet zelf animeren omdat de lag dan alleen maar erger word. Zorg dat hij er strak
uit komt te zien en perfect van foto naar video overgaat." Zijn keuzes (16:20): de fade in de video zelf, de winkel vervaagt in
de eerste stille beelden naar wit, Wat we maken schuift erover, 1,5 ×.

Wat dit script doet (zijn video: 2944 × 1248, 24 per seconde, 124 beelden, egale grond #F1F4FB):
1. **De grond.** De mediaan van de lege beelden aan het eind (110 – 123) is de grond, per pixel (ruis 0,09).
2. **Uitknippen.** Zoals scripts/laptop-video.py (levering 80): de kern (donker) blijft, de grond gaat weg, en op de rand
   geldt I = a·O + (1 − a)·G, met O de kleur van de dichtstbijzijnde kernpixel. Anders dan toen blijven de witte schermen
   staan (ondoorzichtig wit: daar speelt de video gewoon), en ook de lichte ring tussen de rand van het toestel en het scherm.
3. **Het veld erachter.** Het veld B1 Horizon (public/img/hal/veld-b1.webp, levering 89) zoals het nu op 1440 × 900 achter de
   laptop staat (gerekt over het podium van 1440 × 844, de laptop op 120,5 % en in het midden), met de korrel van de site
   (korrel-256, dekking 0,9). Het veld hoort zo bij de laptop: op elk scherm staat de horizon op dezelfde plek achter hem.
4. **Uit:** beeld/NNN.png (het hele beeld, ondoorzichtig), stil.png (beeld 0 met de schermen doorzichtig: daaronder liggen de
   standen van de winkel) en video.json (de schermen van beeld 0, in breukdelen, en de maten).
5. **De schermen omvatten hun gat** (8 november, nagemeten): een rechte lijn door het midden van een rand ligt op een licht
   gebogen rand (de lens) tot 5 beeldpunten binnen het gat, en dan zie je een witte streep tussen de winkel en de rand van
   het toestel. Elke lijn schuift daarom naar buiten tot het hele gat erbinnen valt (ruimOm).
Daarna maakt scripts/laptop-video-90.mjs er de video's en de foto's van.

    ALLEEN_BEELD0=1 python3 scripts/laptop-video-90.py …    alleen beeld 0 (stil.png en video.json), de andere beelden niet
"""
import sys, os, json, subprocess
import numpy as np
import cv2
from scipy import ndimage as ndi

bron, werk = sys.argv[1], sys.argv[2]
LAATSTE = int(os.environ.get('LAATSTE', '111'))   # na beeld 108 is alles uit beeld; tot en met 111
ALLEEN_BEELD0 = os.environ.get('ALLEEN_BEELD0') == '1'
os.makedirs(f'{werk}/beeld', exist_ok=True)
W, H = 2944, 1248
WORTEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 1 · alle beelden en de grond ──
proc = subprocess.run(['ffmpeg', '-v', 'error', '-i', bron, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, check=True)
alle = np.frombuffer(proc.stdout, np.uint8).reshape(-1, H, W, 3)
print('beelden in de bron:', len(alle))
G = np.median(alle[110:124].astype(np.float32), axis=0)            # de grond, per pixel

# ── 3 · het veld, één keer ──
def lees(p, mode):
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    if im is None:
        from PIL import Image
        im = np.asarray(Image.open(p).convert(mode))
        return im.astype(np.float32)
    if im.ndim == 3 and im.shape[2] == 4: im = cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA)
    elif im.ndim == 3: im = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
    return im.astype(np.float32)
veld = lees(os.path.join(WORTEL, 'public/img/hal/veld-b1.webp'), 'RGB')          # 1920 × 1080
korrel = lees(os.path.join(WORTEL, 'public/img/stuk/korrel-256.webp'), 'RGBA')    # 256 × 256, de 2×-korrel
# de maat van het podium op 1440 × 900 (opening-80.css tot levering 89): 1440 × 844; de foto fw = 120,5 vw = 1735 breed,
# met zijn zichtbare deel (rij 206 – 1248) in het midden. Een bronpixel is dan s css-px.
FW, HP, VW = 1735.2, 844.0, 1440.0
s = FW / W
C = 0.35396 * FW
boven = (HP - C) / 2 - 0.069945 * FW                                   # de bovenkant van de hele foto in het podium (−6,4)
u = np.arange(W, dtype=np.float32); v = np.arange(H, dtype=np.float32)
x = (VW - FW) / 2 + s * (u + 0.5)                                     # css-px in het podium
y = boven + s * (v + 0.5)
X = np.clip(x * veld.shape[1] / VW - 0.5, 0, veld.shape[1] - 1)       # het veld is over het podium gerekt
Y = np.clip(y * veld.shape[0] / HP - 0.5, 0, veld.shape[0] - 1)
mx, my = np.meshgrid(X, Y)
F = cv2.remap(veld, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
# de korrel (tot 8 november 21:44 op 0,9): Lucas, "De grain op de achtergrond achter de laptop maakt de overloop tussen
# secties niet smooth. Los dit op door het smooth te laten faden of te verwijderen." Weg (KORREL=0): dan loopt het veld overal
# glad over in de secties eromheen, en de video wordt kleiner. KORREL=0.9 geeft de korrel van levering 90 terug.
KORREL = float(os.environ.get('KORREL', '0'))
if KORREL > 0:
    kx = np.mod(np.floor(x * 2), 256).astype(np.int32); ky = np.mod(np.floor(y * 2), 256).astype(np.int32)
    K = korrel[ky[:, None], kx[None, :]]
    ka = (K[..., 3:4] / 255.0) * KORREL
    F = F * (1 - ka) + K[..., :3] * ka
F = np.clip(F, 0, 255).astype(np.float32)
# levering 94 (Lucas, 12 november 07:50: "Verwijder de kleuren achter de laptop"): VELD=wit zet in plaats van het veld de grond
# van de site eronder, (250, 252, 255): dat is in H.264 (BT.709, beperkt bereik) precies te maken en tekent in Chromium als de
# grond #FBFCFF op één na in rood (zie scratchpad/94/banner-kleur.py: 251 kan niet exact).
VELD = os.environ.get('VELD', 'b1')
if VELD == 'wit':
    F = np.empty_like(F); F[...] = (250.0, 252.0, 255.0)
cv2.imwrite(f'{werk}/veld.png', cv2.cvtColor(np.rint(F).astype(np.uint8), cv2.COLOR_RGB2BGR))


def hoeken(masker):
    """Vier hoeken (lb, rb, ro, lo) van het grootste witte vlak, uit vier rechte lijnen (scripts/laptop-video.py)."""
    n, lab, stats, _ = cv2.connectedComponentsWithStats(masker.astype(np.uint8), 8)
    if n < 2: return None, None
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    if stats[i, cv2.CC_STAT_AREA] < 0.0015 * W * H: return None, None
    vlak = (lab == i)
    cs, _ = cv2.findContours(vlak.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea).reshape(-1, 2).astype(np.float32)
    s_, d = c.sum(1), c[:, 0] - c[:, 1]
    ruw = np.array([c[np.argmin(s_)], c[np.argmax(d)], c[np.argmax(s_)], c[np.argmin(d)]])
    zijden = [(0, 1), (1, 2), (2, 3), (3, 0)]
    def afst(p, a, b):
        ab = b - a; t = np.clip(((p - a) @ ab) / max(ab @ ab, 1e-6), 0.08, 0.92)
        return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
    D = np.stack([afst(c, ruw[a], ruw[b]) for a, b in zijden], 1)
    k = np.argmin(D, 1)
    lijnen = []
    for z, (a, b) in enumerate(zijden):
        p = c[(k == z) & (D[:, z] < 6)]
        ab = ruw[b] - ruw[a]; t = ((p - ruw[a]) @ ab) / max(ab @ ab, 1e-6); p = p[(t > 0.1) & (t < 0.9)]
        if len(p) < 8: return ruw, vlak
        vx, vy, x0, y0 = cv2.fitLine(p, cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
        lijnen.append((np.array([x0, y0]), np.array([vx, vy])))
    def snij(l1, l2):
        (p1, d1), (p2, d2) = l1, l2
        A = np.array([d1, -d2]).T
        t = np.linalg.solve(A, p2 - p1); return p1 + t[0] * d1
    # de lijnen lopen door de middens van de randpixels: + 0,5 voor de rand van het vlak in beeldcoördinaten
    return np.array([snij(lijnen[3], lijnen[0]), snij(lijnen[0], lijnen[1]), snij(lijnen[1], lijnen[2]), snij(lijnen[2], lijnen[3])]) + 0.5, vlak


def ruimOm(q, gat):
    """De vierhoek q (lb, rb, ro, lo) met elke rand naar buiten geschoven tot alle pixels van het gat erbinnen vallen."""
    if q is None or not gat.any(): return q
    ys, xs = np.nonzero(gat)
    P = np.stack([xs + 0.5, ys + 0.5], 1).astype(np.float64)      # de middens van de pixels (de hoeken zijn in randcoördinaten)
    q = np.asarray(q, np.float64); c = q.mean(0); lijnen = []; schuif = []
    for z in range(4):
        a, b = q[z], q[(z + 1) % 4]
        d = (b - a) / np.linalg.norm(b - a); n = np.array([d[1], -d[0]])
        if (c - a) @ n > 0: n = -n                                   # naar buiten
        s_ = max(0.0, float(((P - a) @ n).max()) + 0.5)             # tot de buitenkant van de buitenste pixel
        lijnen.append((a + n * s_, d)); schuif.append(round(s_, 2))
    def snij(l1, l2):
        (p1, d1), (p2, d2) = l1, l2
        t = np.linalg.solve(np.array([d1, -d2]).T, p2 - p1); return p1 + t[0] * d1
    print('  ruimer om het gat (beeldpunten per rand: boven, rechts, onder, links):', schuif)
    return np.array([snij(lijnen[3], lijnen[0]), snij(lijnen[0], lijnen[1]), snij(lijnen[1], lijnen[2]), snij(lijnen[2], lijnen[3])])


def uitknippen(I):
    """De dekking a en de kleur O (alleen de voorgrond) van één beeld."""
    L = I.mean(2)
    dG = np.abs(I - G).max(2)
    grond = dG <= 6
    wit = I.min(2) >= 248
    donker = L < 150
    # wit dat aan de grond grenst (een lichte rand om een arm, ruis) is geen scherm of glimlicht: weg
    # (alleen kleine stukjes: een scherm is een groot wit vlak en blijft altijd staan)
    n_w, lab_w, st_w, _ = cv2.connectedComponentsWithStats(wit.astype(np.uint8), connectivity=8)
    if n_w > 1:
        raakt = np.unique(lab_w[cv2.dilate(grond.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & wit])
        raakt = raakt[(raakt > 0) & (st_w[raakt, cv2.CC_STAT_AREA] < 4000)] if len(raakt) else raakt
        weg = np.isin(lab_w, raakt)
        grond |= weg; wit &= ~weg
    kern = donker | wit
    # de lichte ring tussen de rand van het toestel en het scherm: binnen het toestel, dus ondoorzichtig
    ring = cv2.dilate(donker.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool) & cv2.dilate(wit.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool) & ~grond
    kern |= ring
    # lichter dan de grond naast een scherm: het scherm zelf, onscherp door de beweging (de grond is egaal; niets in de grond is
    # lichter dan hij, op ruis van 0,09 na). Ondoorzichtig, anders schijnt het veld door de rand van een bewegend scherm.
    bijwit = cv2.dilate(wit.astype(np.uint8), np.ones((11, 11), np.uint8)).astype(bool)
    # (naast een scherm telt ook grijs zonder het blauw van de grond: de grond is (241, 244, 251), een onscherp scherm grijs)
    licht = bijwit & ((L > G.mean(2) + 2.0) | (dG > 3) & (I[..., 2] - I[..., 0] < 6))
    kern |= licht; grond &= ~licht
    # en de ring tussen de rand van het toestel en zo'n onscherp scherm (4 px aan beide kanten)
    ring2 = cv2.dilate(donker.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool) & cv2.dilate((wit | licht).astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool) & ~grond
    kern |= ring2
    zacht = ~(grond | kern)
    idx = ndi.distance_transform_edt(~kern, return_distances=False, return_indices=True)
    O = I[idx[0], idx[1]]
    GL, OL = G.mean(2), O.mean(2)
    a = np.zeros((H, W), np.float32)
    a[kern] = 1.0
    # donkerder dan de grond: naar de donkere kern toe; lichter dan de grond (naast wit): naar het wit toe
    az = np.clip((GL - L) / np.where(np.abs(GL - OL) < 12, np.sign(GL - OL + 1e-6) * 12, GL - OL), 0, 1)
    a[zacht] = az[zacht]
    ae = np.maximum(a, 1e-3)[..., None]
    Okleur = np.where(a[..., None] >= 0.999, I, (I - (1 - ae) * G) / ae)
    return a, np.clip(Okleur, 0, 255)


def uitknippen93(I):
    """Levering 93 (10 november 2026). Lucas: "Er zijn een soort grijze plekken te vinden om de armen en handen heen bij de
    laptop en ook tijdens het afspelen." Twee oorzaken, nagemeten in beeld 0:
    - de kern was alles onder L 150: een randpixel die half huid en half lichte grond is (L 100 – 150), bleef zo ondoorzichtig
      staan met zijn grijze mengkleur, en op het blauwe veld werd dat een grijze rand om de arm;
    - de bron heeft om de vingers en de onderkant van de arm een lichte, warme rand (bijv. 248, 232, 230): lichter dan de grond,
      maar niet de grond. Naast een wit vlakje telde dat als scherm (ondoorzichtig): de witte vlekjes onder de vingers.
    Nu: de kern is echt donker (L < 90) plus de grote schermen; alles wat lichter is dan de grond en niet bij een groot scherm
    hoort, is grond; de zachte rand mengt de kleur van de dichtstbijzijnde donkere pixel met het veld, met een kleine knijp
    (KNIJP) zodat er geen lichte waas om de huid blijft.
    Uit: a (dekking), O (kleur van de voorgrond), scherm (0 – 1: hoeveel van de pixel scherm is)."""
    L = I.mean(2)
    GL = G.mean(2)
    dG = np.abs(I - G).max(2)
    donker = L < DONKER
    wit = I.min(2) >= 248
    n_w, lab_w, st_w, _ = cv2.connectedComponentsWithStats(wit.astype(np.uint8), connectivity=8)
    groot = np.zeros(n_w, bool)
    if n_w > 1: groot[1:] = st_w[1:, cv2.CC_STAT_AREA] >= GROOT_SCHERM
    schermwit = groot[lab_w]
    # het gebied van een scherm: alles wat licht is en met het witte vlak samenhangt binnen de donkere rand van het toestel
    # (een scherm is niet overal ≥ 248: bij de bovenrand en in de beweging lijkt het soms op de grond). Een rand die door de
    # beweging zo licht wordt dat het gebied naar de grond lekt (veel groter dan het witte vlak), telt niet: dan alleen het wit.
    licht_ = L >= 160
    n_l, lab_l = cv2.connectedComponents(licht_.astype(np.uint8), connectivity=4)
    scherm = schermwit.copy()
    if n_l > 1:
        opp = np.bincount(lab_l.ravel(), minlength=n_l)
        wit_in = np.bincount(lab_l.ravel(), weights=schermwit.ravel().astype(np.float64), minlength=n_l)
        goed = (wit_in > 0) & (opp <= 1.5 * wit_in + 5000); goed[0] = False
        scherm |= goed[lab_l]
    # de lichte ring tussen de rand van het toestel en het scherm (de lens): tot 6 px naast het scherm, waar het scherm
    # dichterbij is dan de grond buiten het toestel
    rond = cv2.dilate(scherm.astype(np.uint8), np.ones((13, 13), np.uint8)).astype(bool)
    buiten = ((dG <= 6) | (L >= GL - 10)) & ~rond
    dichtbij = rond & (ndi.distance_transform_edt(~scherm) < ndi.distance_transform_edt(~buiten))
    zone = scherm | (dichtbij & ~donker)
    kern = donker | schermwit | zone
    # grond: wat (bijna) de grond is, en alles wat lichter is dan de grond buiten een scherm
    grond = ~kern & ((dG <= 6) | (L >= GL - 10))
    zacht = ~(grond | kern)
    idx = ndi.distance_transform_edt(~donker, return_distances=False, return_indices=True)
    Od = I[idx[0], idx[1]]                                   # de dichtstbijzijnde echt donkere pixel
    OL = Od.mean(2)
    a = np.zeros((H, W), np.float32)
    a[kern] = 1.0
    az = np.clip((GL - L) / np.maximum(GL - OL, 12.0), 0, 1)
    az = np.clip((az - KNIJP) / (1 - KNIJP), 0, 1)
    a[zacht] = az[zacht]
    O = np.where(donker[..., None], I, Od)                   # de rand krijgt de kleur van de huid of het toestel ernaast
    # het scherm: hoeveel van de pixel scherm is, gemeten tegen het donkerste van de rand ernaast (de kern van de rand van het
    # toestel, binnen 7 px). Ook de grijze mengpixels aan de binnenkant van de rand (L 25 – 90) tellen mee: bij een wit scherm
    # waren ze de zachte overgang, bij een scherm dat uit staat werden ze een lichte lijn langs de rand.
    Lmin = np.minimum(ndi.minimum_filter(L, size=15), OL)     # (midden in het scherm: de rand van het toestel verderop)
    rand = np.stack([Lmin, Lmin, Lmin * 1.05 + 1], 2)
    gebied = zone | schermwit | (dichtbij & donker)
    s = np.zeros((H, W), np.float32)
    s[gebied] = np.clip((L - Lmin) / np.maximum(255.0 - Lmin, 1.0), 0, 1)[gebied]
    O = np.where(gebied[..., None], I, O)
    a[gebied] = 1.0
    return a, np.clip(O, 0, 255), s, rand


# levering 93: de schermen staan uit (Lucas: "een echte donkere grijze/zwarte kleur van wanneer die schermen echt uit gaan")
DONKER = float(os.environ.get('DONKER', '90'))
GROOT_SCHERM = int(os.environ.get('GROOT_SCHERM', '20000'))
KNIJP = float(os.environ.get('KNIJP', '0.08'))
_uit = os.environ.get('SCHERM_UIT', '#16181E').lstrip('#')
SCHERM_UIT = np.array([int(_uit[k:k + 2], 16) for k in (0, 2, 4)], np.float32) if _uit else None
NIEUW = os.environ.get('UITKNIP', '93') == '93'

schermen0 = None
REEKS = [int(x) for x in os.environ['BEELDEN'].split(',')] if os.environ.get('BEELDEN') else range(0, 1 if ALLEEN_BEELD0 else LAATSTE + 1)
for i in REEKS:
    I = alle[i].astype(np.float32)
    if NIEUW:
        a, O, sch, rand = uitknippen93(I)
        if SCHERM_UIT is not None:
            # wit wordt de kleur van een uitgezet scherm; de mengpixels naar de rand van het toestel mengen mee
            Ouit = sch[..., None] * SCHERM_UIT + (1 - sch[..., None]) * rand
            O = np.where((sch > 0)[..., None], Ouit, O)
    else:
        a, O = uitknippen(I)
    uit = a[..., None] * O + (1 - a[..., None]) * F
    rgb = np.rint(np.clip(uit, 0, 255)).astype(np.uint8)
    cv2.imwrite(f'{werk}/beeld/{i:03d}.png', cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
    if i == 0:
        # de schermen van beeld 0: laptop links van 70 %, telefoon rechts
        wit = I.min(2) >= 248
        grens = int(W * 0.70)
        wl = wit.copy(); wl[:, grens:] = False
        wf = wit.copy(); wf[:, :grens] = False
        ql, vl = hoeken(wl); qf, vf = hoeken(wf)
        # de stilstaande foto: de schermen doorzichtig, met een zachte rand (van wit naar de rand van het toestel)
        # Op de rand is een pixel deels toestel, deels wit scherm. In het gat telt alleen het toestel: de kleur van de dichtstbijzijnde
        # donkere pixel (de rand), de dekking hoeveel daarvan erin zit: (255 − L) / (255 − L_rand). Dan ligt de winkel strak tegen
        # de rand (met de lichte mengkleur zelf erin zag je een witte streep van 1 pixel).
        L0 = I.mean(2)
        # (de rand zelf: echt donker, L < 60; een grijze mengpixel is zelf al half scherm)
        idx0 = ndi.distance_transform_edt(~(L0 < 60), return_distances=False, return_indices=True)
        O0 = I[idx0[0], idx0[1]]
        dek = np.clip((255.0 - L0) / np.maximum(255.0 - O0.mean(2), 1.0), 0, 1)
        dek[I.min(2) >= 248] = 0
        dekking = np.ones((H, W), np.float32)
        zones = []
        for vlak in (vl, vf):
            if vlak is None: zones.append(None); continue
            # tot 6 pixels buiten het witte vlak: zo ver lopen de lichtgrijze bovenrand van het scherm en de lichte rand (lens,
            # onscherpte) in het toestel; de rand van het toestel zelf is dikker en blijft dicht (donker: dekking 1)
            zone = cv2.dilate(vlak.astype(np.uint8), np.ones((13, 13), np.uint8)).astype(bool)
            dekking[zone] = np.minimum(dekking[zone], dek[zone])
            zones.append(zone)
        alfa = np.rint(dekking * 255).astype(np.uint8)
        in_gat = alfa < 255
        rgb = rgb.copy(); rgb[in_gat] = np.rint(np.clip(O0[in_gat], 0, 255)).astype(np.uint8)
        # de schermen omvatten hun hele gat (alles wat in de foto doorzichtig is, ook een beetje)
        ql = ruimOm(ql, (alfa < 255) & zones[0]) if zones[0] is not None else ql
        qf = ruimOm(qf, (alfa < 255) & zones[1]) if zones[1] is not None else qf
        cv2.imwrite(f'{werk}/stil.png', cv2.cvtColor(np.dstack([rgb, alfa]), cv2.COLOR_RGBA2BGRA))
        norm = lambda q: None if q is None else [[round(float(px) / W, 6), round(float(py) / H, 6)] for px, py in q]
        schermen0 = [norm(ql), norm(qf)]
        print('beeld 0 · laptop', None if ql is None else np.round(ql, 1).tolist(), '· telefoon', None if qf is None else np.round(qf, 1).tolist())
    if i % 12 == 0: print('beeld', i, flush=True)

json.dump({'bron': 'kladblok/levering-90/21_9_laptop-90.mp4 (Lucas, 8 november 2026); scripts/laptop-video-90.py en -90.mjs (levering 90)',
           'b': W, 'h': H, 'fps': 24, 'beelden': LAATSTE + 1, 'grond_video': '#F1F4FB',
           'veld': ('wit (250, 252, 255): de grond van de site, levering 94' if VELD == 'wit' else 'veld-b1.webp zoals op 1440 × 900 (podium 1440 × 844, foto 120,5 %, midden)' + (f', korrel-256 op {KORREL}' if KORREL > 0 else ', zonder korrel')),
           'schermen': schermen0}, open(f'{werk}/video.json', 'w'), ensure_ascii=False)
print('klaar', LAATSTE + 1, 'beelden')
