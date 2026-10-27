"""VISUAILS — de armen van de opening doortrekken buiten het videobeeld (25 oktober 2026, levering 75).

Lucas, 23:35: de foto groot maar gecentreerd, niet het hele beeld vullend, en "zonder dat de foto
in het midden van het witte komt te staan". In de video lopen beide armen via de zijkant het beeld
uit; staat het beeld kleiner dan het venster, dan zouden ze midden in het wit ophouden. Daarom
lopen ze hier door tot ver buiten het beeld.

Per arm de bovenrand en de onderrand vlak bij de rand van het beeld, elk als rechte lijn. Buiten
het beeld krijgt elke pixel tussen die lijnen de kleur van de rand van het beeld op dezelfde
relatieve hoogte in de arm (r: 0 = bovenrand, 1 = onderrand). Links is die rand de linkerkolom;
rechts gaat de arm door de hoek, dus de rechterkolom en dan de onderste rij. Met dezelfde korrel
als het echte beeld, en 40 px overloop in het echte beeld, zodat er geen naad is.

Een arm is warm (rood boven blauw); de laptop en de telefoon zijn grijs. Zo pakt het meten nooit
de laptop of de telefoon als "arm", ook niet als die aan het eind van de video het beeld uit
schuiven. Wat geen arm is, vervaagt in de laatste 60 px voor de rand naar wit: anders hield de
laptop op het eind op bij een onzichtbare lijn midden in het wit.
"""
import numpy as np
import cv2


def runs(col):
    d = np.concatenate([[0], col.astype(np.int8), [0]])
    v = np.diff(d)
    return list(zip(np.nonzero(v == 1)[0], np.nonzero(v == -1)[0]))


def warm(bgr, x, a, b):
    stuk = bgr[a:b, max(0, x - 1):x + 2, :3].reshape(-1, 3).astype(float)
    return float(stuk[:, 2].mean() - stuk[:, 0].mean())


def meet_arm(bgr, kant, L=200, T=120, warmte=8.0):
    """De arm aan de linker- of rechterkant: twee lijnen (y = a·x + b) voor zijn boven- en
    onderrand, de kolom van een hele doorsnede (xr) en de korrel. None als er geen arm is."""
    g = cv2.cvtColor(bgr[..., :3], cv2.COLOR_BGR2GRAY)
    h, w = g.shape
    # per pixel: donker én warm (rood boven blauw). Zo hoort de grijze laptop die op de hand ligt
    # er nooit bij, ook niet als hij er tegenaan ligt (beeld 90 – 100 maakte er anders een wig van)
    rb = bgr[..., 2].astype(np.int16) - bgr[..., 0].astype(np.int16)
    # de kern van een arm is bijna zwart en dan nauwelijks warm; de laptop en de telefoon zijn
    # grijs (helderder dan 35) en niet warm. Dus: donker, behalve grijs-en-niet-warm.
    donker = (g < T) & ~((g >= 35) & (rb <= 2))
    donker = cv2.morphologyEx(donker.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) > 0
    xs = list(range(0, L)) if kant == 'links' else list(range(w - 1, w - 1 - L, -1))
    vorige, rij = None, []
    for x in xs:
        rs = [r for r in runs(donker[:, x]) if r[1] - r[0] > 20 and (kant == 'links' or r[0] > h * 0.3)]
        rs = [r for r in rs if warm(bgr, x, r[0], r[1]) > warmte]
        if not rs: break
        r = min(rs, key=lambda r: abs((r[0] + r[1]) / 2 - vorige)) if vorige is not None else max(rs, key=lambda r: r[1] - r[0])
        vorige = (r[0] + r[1]) / 2
        rij.append((x, int(r[0]), int(r[1]), r[0] <= 1, r[1] >= h - 1))
    if len(rij) < 25 or rij[0][0] not in (0, w - 1):
        return None
    boven = [(x, t) for x, t, b, tr, br in rij[:120] if not tr]
    onder = [(x, b) for x, t, b, tr, br in rij if not br][:120]
    if len(boven) < 15 or len(onder) < 15:
        return None
    lt = np.polyfit([p[0] for p in boven], [p[1] for p in boven], 1)
    lb = np.polyfit([p[0] for p in onder], [p[1] for p in onder], 1)
    # lijkt het op een arm? niet te dun aan de rand, niet te steil, en de lijnen lopen buiten het
    # beeld niet in elkaar of wild uit elkaar (anders: geen doortrekken, het vervaagt gewoon)
    xb = 0 if kant == 'links' else w - 1
    dik_rand = np.polyval(lb, xb) - np.polyval(lt, xb)
    xv = -600 if kant == 'links' else w + 600
    dik_ver = np.polyval(lb, xv) - np.polyval(lt, xv)
    if dik_rand < 60 * (w / 1920) or abs(lt[0]) > 1.6 or abs(lb[0]) > 1.6 or not (0.6 * dik_rand < dik_ver < 2.6 * dik_rand):
        return None
    heel = [p for p in rij if not p[3] and not p[4]]
    if not heel:
        return None
    xr = heel[0][0]
    xm = heel[min(len(heel) - 1, 20)][0]
    tm, bm = np.polyval(lt, xm), np.polyval(lb, xm)
    y0, y1 = int(tm + 0.3 * (bm - tm)), int(tm + 0.7 * (bm - tm))
    x0, x1 = (xm, xm + 30) if kant == 'links' else (xm - 30, xm)
    stuk = g[max(0, y0):y1, max(0, x0):x1].astype(np.float32)
    korrel = float(np.std(stuk - cv2.GaussianBlur(stuk, (0, 0), 2))) if stuk.size > 50 else 3.0
    return dict(lt=[float(v) for v in lt], lb=[float(v) for v in lb], xr=int(xr), korrel=korrel)


def glad(reeks, venster=5, gat=15):
    """De lijnen over de beelden heen rustig maken (mediaan over vijf beelden), zodat het
    doorgetrokken stuk niet trilt. Een gat van hooguit 15 beelden tussen twee metingen wordt
    gevuld (anders flitst de arm buiten het beeld even weg en weer terug)."""
    reeks = list(reeks)
    mets = [i for i, a in enumerate(reeks) if a is not None]
    for i0, i1 in zip(mets, mets[1:]):
        if 1 < i1 - i0 <= gat:
            a0, a1 = reeks[i0], reeks[i1]
            for j in range(i0 + 1, i1):
                f = (j - i0) / (i1 - i0)
                reeks[j] = dict(lt=[a0['lt'][k] * (1 - f) + a1['lt'][k] * f for k in (0, 1)],
                                lb=[a0['lb'][k] * (1 - f) + a1['lb'][k] * f for k in (0, 1)],
                                xr=a0['xr'], korrel=a0['korrel'])
    uit = []
    for i, a in enumerate(reeks):
        if a is None:
            uit.append(None)
            continue
        buren = [reeks[j] for j in range(max(0, i - venster // 2), min(len(reeks), i + venster // 2 + 1)) if reeks[j] is not None]
        uit.append(dict(
            lt=[float(np.median([b['lt'][k] for b in buren])) for k in (0, 1)],
            lb=[float(np.median([b['lb'][k] for b in buren])) for k in (0, 1)],
            xr=a['xr'], korrel=float(np.median([b['korrel'] for b in buren]))))
    return uit


def geschaald(a, f):
    """Dezelfde arm op een beeld dat f keer zo groot is (de still op 2×)."""
    if a is None:
        return None
    return dict(lt=[a['lt'][0], a['lt'][1] * f], lb=[a['lb'][0], a['lb'][1] * f], xr=int(round(a['xr'] * f)), korrel=a['korrel'])


def rand_pad(img, arm, kant):
    h, w = img.shape[:2]
    if kant == 'links':
        pts = np.stack([np.zeros(h), np.arange(h)], 1)
    else:
        rechts = np.stack([np.full(h, w - 1), np.arange(h)], 1)
        onder = np.stack([np.arange(w - 2, w // 2, -1), np.full(w - 2 - w // 2, h - 1)], 1)
        pts = np.concatenate([rechts, onder], 0)
    x, y = pts[:, 0], pts[:, 1]
    t, b = np.polyval(arm['lt'], x), np.polyval(arm['lb'], x)
    r = (y - t) / np.maximum(b - t, 1.0)
    kl = img[y.astype(int), x.astype(int)].astype(np.float32)
    # wat op de rand grijs en niet warm is, is de laptop of de telefoon die tegen de arm ligt:
    # die wordt niet mee de rand uit getrokken (beeld 84 – 96: anders een lange grijze stok)
    lum = kl[:, :3].mean(1); rb = kl[:, 2] - kl[:, 0]
    apparaat = (lum >= 35) & (lum < 235) & (rb <= 2)
    kl[apparaat] = 255
    kl = cv2.GaussianBlur(kl[:, None], (0, 0), sigmaX=0.01, sigmaY=1.5)[:, 0]
    ok = (r > -0.15) & (r < 1.15)
    r, kl = r[ok], kl[ok]
    if len(r) < 10:
        return None
    orde = np.argsort(r)
    return r[orde], kl[orde]


def in_arm(a, x, y, marge=0.2):
    t, b = np.polyval(a['lt'], x), np.polyval(a['lb'], x)
    r = (y - t) / np.maximum(b - t, 1.0)
    return (r > -marge) & (r < 1 + marge)


def verleng(img, EL, ER, EB, armen, f=1.0, OV=40.0, VAAG=60.0):
    """img: het uitgesneden beeld (BGRA). Uit: het beeld met EL, ER en EB px wit erbij (links,
    rechts, onder) en de armen erin doorgetrokken. f: de schaal ten opzichte van de video."""
    h, w = img.shape[:2]
    H, W = h + EB, w + EL + ER
    nk = img.shape[2]
    OV, VAAG = OV * f, VAAG * f
    rng = np.random.default_rng(74)
    KORREL = rng.standard_normal((H, W)).astype(np.float32)
    uit = np.full((H, W, nk), 255, np.float32)
    uit[:h, EL:EL + w] = img
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    x, y = xx - EL, yy
    buiten = (x < 0) | (x > w - 1) | (y > h - 1)

    # 1 · wat geen arm is, vervaagt naar wit vlak voor de linker- en rechterrand
    arm_masker = np.zeros((H, W), bool)
    for a in armen.values():
        if a is not None:
            arm_masker |= in_arm(a, x, y)
    afst = np.minimum(x, (w - 1) - x)
    vaag = (~buiten) & (afst < VAAG) & ~arm_masker
    if vaag.any():
        k = (1 - np.clip(afst[vaag] / VAAG, 0, 1))[:, None] ** 1.2
        wit = np.full((1, nk), 255, np.float32)
        uit[vaag] = uit[vaag] * (1 - k) + wit * k

    # 2 · de armen doortrekken
    for kant, a in armen.items():
        if a is None:
            continue
        pad = rand_pad(img, a, kant)
        if pad is None:
            continue
        rp, kp = pad
        t, b = np.polyval(a['lt'], x), np.polyval(a['lb'], x)
        r = (y - t) / np.maximum(b - t, 1.0)
        sterkte = a.get('korrel', 3.0)
        gebied = buiten & ((x < 0) if kant == 'links' else (x >= a['xr']))
        m = gebied & (r >= rp[0]) & (r <= rp[-1])
        if m.any():
            kleur = np.stack([np.interp(r[m], rp, kp[:, c]) for c in range(nk)], 1)
            dk = np.clip(1 - kleur[:, :3].mean(1, keepdims=True) / 255, 0, 1) ** 0.7
            kleur[:, :3] += KORREL[m][:, None] * sterkte * dk
            oud = uit[m]
            dd = kleur[:, :3].mean(1) < oud[:, :3].mean(1)
            oud[dd] = kleur[dd]
            uit[m] = oud
        if kant == 'links':
            zone, fz = (x >= 0) & (x < OV), 1 - x / OV
        else:
            afs = np.minimum((w - 1) - x, (h - 1) - y)
            zone, fz = (~buiten) & (x >= a['xr'] - OV) & (afs < OV), 1 - afs / OV
        zone &= (r >= rp[0]) & (r <= rp[-1])
        if zone.any():
            kz = np.stack([np.interp(r[zone], rp, kp[:, c]) for c in range(nk)], 1)
            kz[:, :3] += KORREL[zone][:, None] * sterkte * np.clip(1 - kz[:, :3].mean(1, keepdims=True) / 255, 0, 1) ** 0.7
            ff = (fz[zone] ** 1.5)[:, None]
            uit[zone] = uit[zone] * (1 - ff) + kz * ff
    return uit.clip(0, 255).astype(np.uint8)


def kaal(img, EL, ER, EB, F=160.0, f=1.0):
    """Het beeld zonder doorgetrokken armen: alleen het videobeeld op wit, met een zachte rand
    links, rechts en onder (F videopixels). Vanaf beeld 75 schuiven de laptop en de telefoon
    zelf het videobeeld uit; doortrekken kan dan niet meer (er is geen laptop buiten de video),
    dus lossen ze op in het wit in plaats van op een harde lijn te stoppen."""
    h, w = img.shape[:2]
    H, W = h + EB, w + EL + ER
    nk = img.shape[2]
    F = F * f
    uit = np.full((H, W, nk), 255, np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    afst = np.minimum(np.minimum(xx, (w - 1) - xx), (h - 1) - yy)
    k = np.clip(afst / F, 0, 1)
    k = (k * k * (3 - 2 * k))[..., None]
    uit[:h, EL:EL + w] = img.astype(np.float32) * k + 255 * (1 - k)
    return uit.clip(0, 255).astype(np.uint8)
