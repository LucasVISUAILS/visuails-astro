"""VISUAILS Display: DM Sans 40pt (OFL 1.1) met drie details uit het V-merk, in negen gewichten.

Gekozen in lijst 60 (27 oktober 2026), alles volgens advies:
  snede   de rechte open uiteinden (f, fi, g, j, ȷ, r, t) worden afgesneden als "/" op 53,13°, zoals het vlagje van
          de V: 0,75 × de dikte van het uiteinde opzij (de 3-4-5-driehoek). Ronde uiteinden blijven zoals DM Sans.
  punt    de punten (i, j, ë ï ü, ġ ż, . : ; … ! ? ¡ ¿ ·) worden vierkant, ongeveer zo breed als de stam, met de hoek
          rechtsboven eraf op 53,13°: het vlagje als punt.
  a       het gat van de a (ook in à á â ä å ã ā ą ă): één staande kant langs de stam, één schuine kant op 53,13° aan
          de open kant, even groot als het oude gat.
Alles wat niet in die lijst staat, blijft DM Sans: vormen, afstanden, kernen, ligaturen.

Gebruik: python3 familie.py [map met DMSans40pt-*.ttf] [uitmap]
Nodig: Python 3 met fonttools, skia-pathops en ttfautohint-py (pip install fonttools skia-pathops ttfautohint-py brotli).
"""
import os, sys
import pathops
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.basePen import BasePen

FAMILIE = 'VISUAILS Display'
PS = 'VISUAILSDisplay'
VERSIE = '1.000'
T = 0.75  # tan(36,87°): de 3-4-5-driehoek, zoals in de vlag van de V
GEWICHTEN = [('Thin', 100), ('ExtraLight', 200), ('Light', 300), ('Regular', 400), ('Medium', 500),
             ('SemiBold', 600), ('Bold', 700), ('ExtraBold', 800), ('Black', 900)]

UITEINDEN = ['f', 'fi', 'g', 'j', 'uni0237', 'r', 't']
A_GAT = ['a', 'ae']   # de a en de a in æ (ª is in DM Sans een a met één verdieping: die blijft rond)
PUNTEN = {'i': [0], 'j': [0], 'fi': [1], 'period': [0], 'exclam': [1], 'question': [1], 'exclamdown': [1],
          'questiondown': [1], 'periodcentered': [0], 'uni0308': [0, 1], 'uni0308.case': [0, 1], 'dieresis': [0, 1],
          'uni0307': [0], 'uni0307.case': [0], 'dotaccent': [0]}


class Letter:
    def __init__(self, pad):
        self.f = TTFont(pad)
        self.gs = self.f.getGlyphSet()
        self.glyf = self.f['glyf']
        self.log = []

    # ── hulp ────────────────────────────────────────────────────────────────────────────────
    def pad_van(self, naam, alleen=None):
        rec = RecordingPen(); self.gs[naam].draw(rec)
        p = pathops.Path(); pen = p.getPen(); k = 0
        for op, args in rec.value:
            if alleen is None or k in alleen:
                getattr(pen, op)(*args)
            if op in ('closePath', 'endPath'):
                k += 1
        return p

    def binnen(self, naam, x, y):
        pen = PointInsidePen(self.gs, (x, y)); self.gs[naam].draw(pen); return pen.getResult()

    def punten(self, naam):
        return self.glyf[naam].getCoordinates(self.glyf)

    def contouren(self, naam):
        co, ends, fl = self.punten(naam); uit, s = [], 0
        for e in ends:
            xs = [p[0] for p in co[s:e + 1]]; ys = [p[1] for p in co[s:e + 1]]
            uit.append((min(xs), max(xs), min(ys), max(ys))); s = e + 1
        return uit

    def staande(self, naam):
        """rechte staande stukken: twee opeenvolgende punten op de lijn met dezelfde x"""
        co, ends, fl = self.punten(naam); uit, s = [], 0
        for e in ends:
            idx = list(range(s, e + 1))
            for a, b in zip(idx, idx[1:] + idx[:1]):
                if fl[a] & 1 and fl[b] & 1 and abs(co[a][0] - co[b][0]) < 1 and abs(co[a][1] - co[b][1]) > 8:
                    uit.append((a, b, co[a][0], min(co[a][1], co[b][1]), max(co[a][1], co[b][1])))
            s = e + 1
        return uit

    def zet(self, naam, pad):
        """het nieuwe omtrek terug, met dezelfde voortgang; buitenkant met de klok mee (TrueType)"""
        tp = TTGlyphPen(None)
        pad.draw(Cu2QuPen(tp, max_err=0.6, reverse_direction=True))
        g = tp.glyph(); g.recalcBounds(self.glyf)
        self.glyf[naam] = g
        breed, _ = self.f['hmtx'][naam]
        self.f['hmtx'][naam] = (breed, g.xMin if hasattr(g, 'xMin') else 0)

    # ── de snede ────────────────────────────────────────────────────────────────────────────
    def kies_uiteinde(self, naam):
        v = self.staande(naam)
        if naam in ('f', 'fi'):
            return max((x for x in v if x[3] > 480), key=lambda x: x[2])   # de kop van de f
        if naam in ('g', 'r'):
            return max(v, key=lambda x: x[2])                               # het oor van de g, de arm van de r
        if naam in ('j', 'uni0237'):
            return min(v, key=lambda x: x[2])                               # de staart van de j
        if naam == 't':
            return max((x for x in v if x[4] < 260), key=lambda x: x[2])   # de voet van de t
        raise SystemExit(naam)

    def kies_stam(self, naam, u):
        v = self.staande(naam)
        if naam in ('f', 'fi'):     # de rechterkant van de stam tussen de dwarsstreep en de kop
            k = [x[2] for x in v if x[3] >= 380 and x[4] <= u[3] + 1 and x[2] < u[2] - 30 and x[4] - x[3] < 400]
            return max(k) if k else None
        if naam in ('j', 'uni0237'):  # de linkerkant van de stam
            return min(x[2] for x in v if x[2] > u[2] + 30 and x[4] - x[3] > 300)
        return None

    def snede(self, pad, naam, ruim=0.25):
        u = self.kies_uiteinde(naam); stam = self.kies_stam(naam, u)
        co, _, _ = self.punten(naam)
        (xa, ya), (xb, yb) = co[u[0]], co[u[1]]
        y1, y2, x = min(ya, yb), max(ya, yb), xa
        h = y2 - y1; d = T * h; m, L, r = 3.0, 6 * h + 400, ruim * h
        if self.binnen(naam, x - 2, (y1 + y2) / 2):
            # materiaal links: de lijn door de bovenhoek (x, y2) naar (x - d, y1); weg wat rechtsonder ligt
            a, b = (x + T * L, y2 + L), (x - d - T * L, y1 - L)
            kant = [a, b, (b[0] + 4 * L, b[1]), (a[0] + 4 * L, a[1])]
            if stam is not None:
                doos = [(stam, y1 - h), (x + m, y1 - h), (x + m, y2 + m), (stam, y2 + m)]
            else:
                doos = [(x - d - r, y1 - r), (x + m, y1 - r), (x + m, y2 + m), (x - d - r, y2 + m)]
            test = (x - min(2, h / 4), y1 + min(2, h / 4))
        else:
            # materiaal rechts: de lijn door de onderhoek (x, y1) naar (x + d, y2); weg wat linksboven ligt
            a, b = (x - T * L, y1 - L), (x + d + T * L, y2 + L)
            kant = [a, b, (b[0] - 4 * L, b[1]), (a[0] - 4 * L, a[1])]
            if stam is not None:
                doos = [(x - m, y1 - m), (stam, y1 - m), (stam, y2 + h), (x - m, y2 + h)]
            else:
                doos = [(x - m, y1 - m), (x + d + r, y1 - m), (x + d + r, y2 + r), (x - m, y2 + r)]
            test = (x + min(2, h / 4), y2 - min(2, h / 4))
        stuk = pathops.op(pathops.op(pad, veelhoek(kant), pathops.PathOp.INTERSECTION), veelhoek(doos), pathops.PathOp.INTERSECTION)
        kap = [c for c in stuk.contours if c.contains(test)]
        if not kap:
            raise SystemExit(f'{naam}: de kap niet gevonden')
        self.log.append(f'{naam}: snede h={h:.0f} d={d:.1f}' + (f' stam={stam:.0f}' if stam is not None else ''))
        return pathops.op(pad, kap[0], pathops.PathOp.DIFFERENCE)

    # ── de punt ─────────────────────────────────────────────────────────────────────────────
    @staticmethod
    def vierkante_punt(x0, x1, y0, y1):
        zijde = min(x1 - x0, y1 - y0) * 0.94
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        a, b = cx - zijde / 2, cx + zijde / 2
        c, d = cy - zijde / 2, cy + zijde / 2
        k = zijde * 0.38           # de snede: 0,38 × de zijde breed, 4/3 daarvan hoog (53,13°)
        return [(a, c), (b, c), (b, d - k * 4 / 3), (b - k, d), (a, d)]

    # ── het gat van de a ────────────────────────────────────────────────────────────────────
    def a_gat(self, pad, naam='a'):
        """Het nieuwe gat: een trapezium (rechts staand langs de stam, links schuin op 53,13°, boven en onder vlak),
        begrensd door het oude gat, vergroot met een deel van de dikte van de buik. In de vette gewichten valt het
        trapezium daar ruim binnen en zie je het hele vlagje; in de dunne gewichten zou een hoek van het trapezium
        door de dunne buik heen snijden, dus daar volgt de hoek de buik en blijft alleen de schuine kant over.
        Zo houdt de buik overal minstens 70 % van zijn dikte."""
        bb = self.contouren(naam)
        k = min(range(1, len(bb)), key=lambda i: bb[i][3])        # het oog van de a: de laagste binnencontour
        x0, x1, y0, y1 = bb[k]
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        # de dikte van de buik onder het gat, gemeten op het midden
        y = y0 - 1
        while self.binnen(naam, cx, y) and y > y0 - 400:
            y -= 1
        dik = y0 - y
        r = min(x1 - x0, y1 - y0) / 2
        f = 1 + 0.3 * dik / r
        oog = self.pad_van(naam, [k])
        groot = pathops.Path(); oog.draw(TransformPen(groot.getPen(), (f, 0, 0, f, cx - f * cx, cy - f * cy)))
        H = y1 - y0; xr = x1 - 5
        # De schuine kant groeit mee met de dikte van de streek, zoals de snede (0,75 × de dikte): het stuk dat hij
        # van het gat afsnijdt is hoogstens 0,41 × de dikte van de buik dik. Dat is de maat van Bold (lijst 60);
        # in Thin wordt het een smalle rechte kant in plaats van een zwarte wig.
        mon = Monster(None); oog.draw(mon)
        laagst = min(x - T * (y - y0) for x, y in mon.p)          # de kant van het gat die het verst naar linksboven ligt
        xl = min(x0 - 5, laagst + 1.25 * 0.41 * dik)
        trap = veelhoek([(xl, y0), (xr, y0), (xr, y1), (xl + T * H, y1)])
        gat = pathops.op(trap, groot, pathops.PathOp.INTERSECTION)
        dicht = pathops.op(pad, oog, pathops.PathOp.UNION)
        oud, nieuw = abs(opp(oog)), abs(opp(gat))
        self.log.append(f'{naam}: buik {dik} schaal {f:.2f} wig {(x0 - 5 - xl):.0f} gat {oud:.0f} → {nieuw:.0f} ({nieuw / oud * 100:.0f} %)')
        return pathops.op(dicht, gat, pathops.PathOp.DIFFERENCE)

    # ── alles ───────────────────────────────────────────────────────────────────────────────
    def pas_toe(self):
        gewijzigd = []
        for naam in sorted(set(UITEINDEN) | set(PUNTEN) | set(A_GAT)):
            if naam not in self.glyf or self.glyf[naam].isComposite():
                continue
            n = len(self.contouren(naam)); pad = self.pad_van(naam)
            if naam in PUNTEN:
                bbox = self.contouren(naam)
                rest = [k for k in range(n) if k not in PUNTEN[naam]]
                pad = self.pad_van(naam, rest)
                for k in PUNTEN[naam]:
                    pad = pathops.op(pad, veelhoek(self.vierkante_punt(*bbox[k])), pathops.PathOp.UNION)
            if naam in UITEINDEN:
                pad = self.snede(pad, naam)
            if naam in A_GAT:
                pad = self.a_gat(pad, naam)
            self.zet(naam, pad); gewijzigd.append(naam)
        return gewijzigd

    def noem(self, stijl, gewicht):
        f = self.f; name = f['name']
        ribbi = stijl in ('Regular', 'Bold')
        fam_oud = FAMILIE if ribbi else f'{FAMILIE} {stijl}'
        sub_oud = stijl if ribbi else 'Regular'
        waarden = {
            0: 'Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts). '
               'Aanpassingen (snede, punten, het gat van de a) 2026 VISUAILS.',
            1: fam_oud, 2: sub_oud,
            3: f'{VERSIE};VSLS;{PS}-{stijl}',
            4: f'{FAMILIE} {stijl}',
            5: f'Version {VERSIE}; gebaseerd op DM Sans 40pt 4.004',
            6: f'{PS}-{stijl}',
            8: 'VISUAILS (aanpassingen); Colophon Foundry (DM Sans)',
            9: 'Colophon Foundry, Jonny Pinhorn (DM Sans); aangepast door VISUAILS',
            11: 'https://visuails.com',
            12: 'https://www.colophon-foundry.org',
            13: 'This Font Software is licensed under the SIL Open Font License, Version 1.1. '
                'This license is available with a FAQ at: https://openfontlicense.org',
            14: 'https://openfontlicense.org',
            16: FAMILIE, 17: stijl,
        }
        name.names = [r for r in name.names if r.nameID not in waarden and r.nameID not in (7, 10, 25)]
        for nid, s in sorted(waarden.items()):
            if nid in (16, 17) and ribbi:
                continue
            name.setName(s, nid, 3, 1, 0x409)
        os2 = f['OS/2']
        os2.usWeightClass = gewicht
        os2.achVendID = 'VSLS'
        sel = os2.fsSelection & ~0b1100001  # italic, bold, regular uit
        if stijl == 'Bold':
            sel |= 0b100000
        elif stijl == 'Regular':
            sel |= 0b1000000
        os2.fsSelection = sel | 0b10000000   # USE_TYPO_METRICS blijft aan
        f['head'].macStyle = 1 if stijl == 'Bold' else 0
        f['head'].fontRevision = float(VERSIE)

    def bewaar(self, pad):
        # de oude hinting past niet meer op de aangepaste letters: weg, en straks opnieuw met ttfautohint
        for t in ('fpgm', 'prep', 'cvt '):
            if t in self.f:
                del self.f[t]
        for n in self.f.getGlyphOrder():
            g = self.glyf[n]
            if hasattr(g, 'program'):
                from fontTools.ttLib.tables import ttProgram
                g.program = ttProgram.Program(); g.program.fromBytecode([])
        self.f.save(pad)


class Monster(BasePen):
    """punten langs een omtrek, om er een maat op te nemen"""
    def __init__(self, gs):
        super().__init__(gs); self.p = []
    def _moveTo(self, p): self.p.append(p)
    def _lineTo(self, p):
        a = self._getCurrentPoint(); self.p += [(a[0] + (p[0] - a[0]) * t / 8, a[1] + (p[1] - a[1]) * t / 8) for t in range(1, 9)]
    def _qCurveToOne(self, p1, p2):
        a = self._getCurrentPoint()
        for i in range(1, 17):
            t = i / 16; u = 1 - t
            self.p.append((u * u * a[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * a[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    def _curveToOne(self, p1, p2, p3):
        a = self._getCurrentPoint()
        for i in range(1, 17):
            t = i / 16; u = 1 - t
            self.p.append(tuple(u**3 * a[j] + 3 * u * u * t * p1[j] + 3 * u * t * t * p2[j] + t**3 * p3[j] for j in (0, 1)))


def veelhoek(punten):
    p = pathops.Path(); pen = p.getPen(); pen.moveTo(punten[0])
    for q in punten[1:]:
        pen.lineTo(q)
    pen.closePath(); return p


def opp(pad):
    pen = AreaPen(); pad.draw(pen); return pen.value


def hint_en_web(onhint, ttf):
    """ttfautohint (zoals DM Sans zelf) en daarna een woff2 voor de site"""
    import ttfautohint
    ttfautohint.ttfautohint(in_file=onhint, out_file=ttf, no_info=True)
    t = TTFont(ttf); t.flavor = 'woff2'; t.save(ttf[:-4] + '.woff2')


if __name__ == '__main__':
    # python3 familie.py [map met DMSans40pt-*.ttf] [uitmap]; standaard: bron/dm-sans-40pt en ../fonts naast dit script
    import tempfile
    hier = os.path.dirname(os.path.abspath(__file__))
    bron = sys.argv[1] if len(sys.argv) > 1 else os.path.join(hier, 'dm-sans-40pt')
    uit = sys.argv[2] if len(sys.argv) > 2 else os.path.join(hier, '..', 'fonts')
    os.makedirs(uit, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for stijl, gewicht in GEWICHTEN:
            L = Letter(os.path.join(bron, f'DMSans40pt-{stijl}.ttf'))
            g = L.pas_toe(); L.noem(stijl, gewicht)
            onhint = os.path.join(tmp, f'{PS}-{stijl}.ttf')
            L.bewaar(onhint)
            hint_en_web(onhint, os.path.join(uit, f'{PS}-{stijl}.ttf'))
            print(f'{stijl:10} {gewicht}  {len(g)} glyphs aangepast')
