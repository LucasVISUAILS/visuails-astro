/* VISUAILS — ELKE TEKST OP ELKE PAGINA, GEMETEN OP CONTRAST
 * ═══════════════════════════════════════════════════════════════════════════
 * Lucas: *"Sommige woorden/teksten zijn ook nog niet goed leesbaar, controleer
 * waar dit nog meer voorkomt op de website door elke pagina te scannen."*
 *
 * tests/leesbaar.test.mjs meet al de KNOPPEN en de voettekst, en legt in zijn
 * kop uit waarom hij niet verder gaat: een algemene veeg levert vier soorten
 * vals alarm op, en een toets die je moet wegwuiven is een toets die je gaat
 * overslaan. Dat klopt voor een toets die de bouw moet tegenhouden.
 *
 * Dit is geen toets maar een DOORLICHTING, en dan draait die afweging om: hier
 * wil je juist alles zien, mits het gesorteerd is. Vandaar drie bakken:
 *
 *   FOUT        — tekst op een effen vlak, onder de norm. Meetbaar, geen twijfel.
 *   NAKIJKEN    — tekst op een beeld of een verloop. Een rekensom kan daar niet
 *                 over oordelen; de mens wel, en die krijgt de lijst.
 *   OVERGESLAGEN — de vier bekende uitzonderingen uit de kop van leesbaar.test.
 *
 * De norm is WCAG 2.1 SC 1.4.3: 4,5:1 voor gewone tekst, 3:1 voor groot
 * (>=24px, of >=18,66px vet).
 *
 *   node kladblok/leesbaar-alles.mjs            (vereist: npm run build +
 *                                                de dist-server op 4399)
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASIS = process.env.BASIS || 'http://127.0.0.1:4399';
const PADEN = process.argv.length > 2 ? process.argv.slice(2)
  : JSON.parse(readFileSync('kladblok/_paden.json', 'utf8')).flatMap((p) => [p, p === '/' ? '/nl/' : '/nl' + p]);

const METEN = () => {
  /* ── DE REKENSOM ──────────────────────────────────────────────────────── */
  const kanaal = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = ([r, g, b]) => 0.2126 * kanaal(r / 255) + 0.7152 * kanaal(g / 255) + 0.0722 * kanaal(b / 255);
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const d = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return { r: d[0], g: d[1], b: d[2], a: d.length > 3 ? d[3] : 1 };
  };
  /* Een doorzichtige letter op een vlak is de mengkleur, niet de letterkleur. */
  const meng = (voor, achter) => [0, 1, 2].map((i) => Math.round(
    [voor.r, voor.g, voor.b][i] * voor.a + [achter.r, achter.g, achter.b][i] * (1 - voor.a),
  ));

  const fout = [], nakijken = [], over = [], versiering = [];
  const gezien = new Set();

  for (const el of document.querySelectorAll('body *')) {
    /* Alleen elementen met hun EIGEN tekst, anders meet je elke ouder mee. */
    let eigen = '';
    for (const n of el.childNodes) if (n.nodeType === 3) eigen += n.textContent;
    eigen = eigen.replace(/\s+/g, ' ').trim();
    if (!eigen) continue;

    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) { continue; }
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;

    /* ── DE VIER BEKENDE UITZONDERINGEN ──────────────────────────────────
       Zie de kop van tests/leesbaar.test.mjs; ze staan hier met naam zodat
       niemand ze per ongeluk opnieuw "ontdekt". */
    if (cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || cs.webkitTextStrokeWidth !== '0px') {
      over.push(el.tagName.toLowerCase() + ' (omtrekletter) ' + eigen.slice(0, 28)); continue;
    }
    if (el.closest('svg, symbol, defs')) { over.push('svg ' + eigen.slice(0, 28)); continue; }
    /* ── TWEE PLEKKEN DIE DEZE REKENSOM NIET KAN METEN ───────────────────
       · DE BOVENBALK. Sinds 19 september is hij bovenaan doorzichtig, dus het
         vlak áchter de letters is de sectie eronder en niet een ouder in de
         boom. Wie de boom omhoog loopt komt bij <body> uit en meet donkere
         letters tegen een donkere grond die er niet staat: 1,00:1 op zeven
         menu-items, zeven keer vals alarm. kladblok/_kopleesbaar.mjs meet dit
         wél goed — op de PIXELS van een schermafdruk — en deed dat op 658
         teksten. Daar hoort het dus, en niet hier.
       · HET LAPTOPSCHERM. `.lc-*` bootst de webshop van de klant na, tot en
         met een knopje "In winkelmand" van drie pixels hoog. Dat is een
         tekening van een interface en geen tekst van deze site; zelfde
         uitzondering en zelfde reden als in kladblok/lib/dichtmeter.mjs. */
    if (el.closest('.site-header, header')) { over.push('bovenbalk ' + eigen.slice(0, 28)); continue; }
    if (el.closest('.lc, [class^="lc-"], [class*=" lc-"]')) { over.push('laptopscherm ' + eigen.slice(0, 28)); continue; }

    const voor = parse(cs.color);
    if (!voor || voor.a === 0) { over.push(el.tagName.toLowerCase() + ' (onzichtbaar) ' + eigen.slice(0, 28)); continue; }

    /* De achtergrond: omhoog tot een vlak dat ondoorzichtig genoeg is. Een
       beeld of verloop onderweg maakt het onmeetbaar. */
    let beeld = false, achter = null, opa = 1;
    for (let p = el; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      opa *= Number(ps.opacity);
      if (ps.backgroundImage && ps.backgroundImage !== 'none') { beeld = true; break; }
      const bg = parse(ps.backgroundColor);
      if (bg && bg.a >= 0.92) { achter = bg; break; }
      if (bg && bg.a > 0) { beeld = true; break; }   /* half doorschijnend vlak */
    }
    const sleutel = (el.className || el.tagName) + '|' + eigen.slice(0, 24);
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);

    const px = parseFloat(cs.fontSize);
    const vet = Number(cs.fontWeight) >= 700;
    const groot = px >= 24 || (vet && px >= 18.66);
    const norm = groot ? 3 : 4.5;
    const naam = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');

    if (beeld || !achter) {
      nakijken.push(`${naam} — "${eigen.slice(0, 34)}" (${Math.round(px)}px op beeld/verloop)`);
      continue;
    }
    const kleur = meng(voor, achter);
    const c = ratio(kleur, [achter.r, achter.g, achter.b]);
    if (c + 0.05 < norm) {
      /* ── VERSIERING TELT NIET ALS ONLEESBAAR ──────────────────────────
         `aria-hidden="true"` zegt: dit is geen mededeling, laat het weg. De
         grote getallen op /about (.stap-nr, 67 px op 22 %) zijn daar het
         voorbeeld van — een watermerk achter de stap en niet de stap zelf.
         WCAG stelt aan zulke tekst geen contrasteis, en een lijst waarin die
         achttien meldingen tussen de echte staan, is een lijst die je niet
         meer leest. Ze verdwijnen niet: ze staan in hun eigen bak, zodat de
         keuze om ze zo licht te laten een KEUZE blijft en geen vergetelheid. */
      if (el.closest('[aria-hidden="true"]')) {
        versiering.push(`${c.toFixed(2)}:1 ${naam} — "${eigen.slice(0, 24)}"`);
      } else {
        fout.push(`${c.toFixed(2)}:1 (norm ${norm}) ${naam} — "${eigen.slice(0, 34)}" ${Math.round(px)}px`);
      }
    }
  }
  return { fout, nakijken: nakijken.slice(0, 6), over: over.length, versiering };
};

/* ── DE NACHTPROEF MEELOPEN — 20 september 2026 ──────────────────────────────
   VIS_NACHT=1 injecteert kladblok/nachtproef.css en zet `data-nacht` op <html>,
   zodat dezelfde veeg over de donkere stand loopt. Het is met opzet DEZE lus en
   geen tweede script: één pagina die 120 keer navigeert houdt de kladblokserver
   bij; zestig verse pagina's deden dat niet (gezien: vanaf pagina 30 kwam er
   alleen nog 404 terug, en dan meet je de 404-pagina). */
const NACHT = process.env.VIS_NACHT === '1'
  ? readFileSync(new URL('./nachtproef.css', import.meta.url), 'utf8') : null;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let totaalFout = 0, totaalNakijk = 0, totaalVersiering = 0;
for (const [w, maat] of [[1440, 'breed'], [390, 'telefoon']]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  for (const pad of PADEN) {
    await page.goto(BASIS + pad, { waitUntil: 'load', timeout: 20000 }).catch(() => null);
    if (NACHT) {
      await page.addStyleTag({ content: NACHT }).catch(() => null);
      await page.evaluate(() => document.documentElement.setAttribute('data-nacht', ''));
    }
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { document.querySelectorAll('.cc, [class*="cookie"]').forEach((e) => e.remove()); });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    const uit = await page.evaluate(METEN);
    totaalFout += uit.fout.length; totaalNakijk += uit.nakijken.length; totaalVersiering += uit.versiering.length;
    if (uit.fout.length) {
      console.log('\n' + pad + '  (' + maat + ')');
      for (const f of uit.fout.slice(0, 10)) console.log('   FOUT      ' + f);
      if (uit.fout.length > 10) console.log('   … en nog ' + (uit.fout.length - 10));
    }
  }
  await page.close();
}
console.log('\n' + PADEN.length + ' pagina\'s × 2 breedtes · ' + totaalFout + ' onleesbaar, ' + totaalVersiering + ' versiering (aria-hidden), ' + totaalNakijk + ' op beeld/verloop (handmatig)');
await browser.close();
