/* VISUAILS — de bedankpagina in drie standen (punt 1.05, 8 oktober 2026).
 *   node tests/bedankpagina-standen.test.mjs        (na `npx astro build`)
 *   SCHERMEN=<map> node tests/bedankpagina-standen.test.mjs   (bewaart ook schermafdrukken)
 *
 * Na de terugkeer van Mollie (`/thank-you?paid=VIS-…`) kent de pagina drie
 * standen, en Lucas koos ze zo:
 *   (a) betaald;
 *   (b) bevestigen: "Je hoeft niet opnieuw te betalen", GEEN knop, de pagina
 *       vraagt zelf door en stopt na ongeveer een minuut;
 *   (c) alleen als Mollie geannuleerd, verlopen of mislukt meldt: een knop om
 *       opnieuw te betalen.
 * Daaronder het blok "Zo gaat het verder" uit src/lib/verder.js.
 *
 * Tot 8 oktober zei de pagina na vier vragen zonder antwoord al "niet
 * afgerond" met een knop: wie net betaald had, betaalde bij een trage webhook
 * misschien twee keer. Deze test houdt dat dicht.
 *
 * De pagina is statisch; /api/order-status wordt hier per stand nagebootst, en
 * de klok van de pagina loopt via page.clock, zodat "een minuut" geen minuut duurt.
 * Start een server en een browser: draai hem via zwaar.sh.
 */
import { createServer } from 'node:http';
import { metVisIn } from './lib/vis-in.mjs';
import { readFile, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { zoGaatHetVerder, leverregel, stilteRegel } from '../src/lib/verder.js';
import { voorrangZin } from '../src/data/pricing.js';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const POORT = 8097;
const SCHERMEN = process.env.SCHERMEN || '';
if (SCHERMEN) mkdirSync(SCHERMEN, { recursive: true });

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const gelijk = JSON.stringify(w) === JSON.stringify(v);
  if (gelijk) goed++; else fout++;
  console.log(`${gelijk ? '  ok ' : 'FAIL'}  ${naam}${gelijk ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

if (!existsSync(join(DIST, 'thank-you/index.html'))) {
  console.log('dist/thank-you ontbreekt — draai eerst `npx astro build`. Deze toets slaat over.');
  process.exit(0);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(DIST, p);
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('nope'); }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(POORT, '127.0.0.1', r));
const browser = metVisIn(await chromium.launch({ executablePath: browserPad() }));

const STATUS = {
  open: { cancelled: false, kind: null, paid: false, payable: true, failed: false, refund: false },
  betaald: { cancelled: false, kind: null, paid: true, payable: false, failed: false, refund: false },
  mislukt: { cancelled: false, kind: null, paid: false, payable: true, failed: true, refund: false },
};

/**
 * Open de bedankpagina met een nagebootst statuseindpunt.
 * @param {object} o
 * @param {(n: number) => object} o.antwoord  het antwoord op de n-de vraag (vanaf 1)
 */
async function open({ lang = 'nl', breedte = 1280, query, antwoord, sessie = null }) {
  const ctx = await browser.newContext({ viewport: { width: breedte, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(e.message));
  let vragen = 0;
  await page.route('**/api/order-status**', (route) => {
    vragen += 1;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(antwoord(vragen)) });
  });
  await page.route('**/account/me', (route) => route.fulfill({ status: 401, body: '' }));
  await page.clock.install();
  if (sessie) {
    await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) sessionStorage.setItem(k, v); }, sessie);
  }
  const pad = `${lang === 'nl' ? '/nl' : ''}/thank-you${query}`;
  await page.goto(`http://127.0.0.1:${POORT}${pad}`, { waitUntil: 'load' });
  const loop = async (ms) => {
    /* In stappen, zodat elke fetch tussen twee tikken kan landen. */
    for (let t = 0; t < ms; t += 1000) {
      await page.clock.runFor(1000);
      await page.waitForTimeout(15);
    }
  };
  const lees = () => page.evaluate(() => ({
    kop: document.querySelector('[data-ty-title]')?.textContent.trim(),
    stand: document.querySelector('[data-ty-status]')?.hidden ? '' : document.querySelector('[data-ty-status]')?.textContent.trim(),
    knop: Array.from(document.querySelectorAll('a[href*="/api/order-pay"]')).filter((a) => a.offsetParent !== null).map((a) => a.textContent.trim()),
    verder: document.querySelector('[data-ty-verder]')?.hidden ? [] : Array.from(document.querySelectorAll('[data-ty-verder] li')).map((li) => li.textContent.trim()),
    kopVerder: document.querySelector('.ty-now h2')?.textContent.trim(),
    vinkje: getComputedStyle(document.querySelector('.ty-check')).display !== 'none',
    breed: document.documentElement.scrollWidth,
  }));
  const schot = async (naam) => {
    if (!SCHERMEN) return;
    await page.screenshot({ path: join(SCHERMEN, `${naam}.png`), fullPage: true });
  };
  return { page, ctx, loop, lees, schot, vragen: () => vragen, fouten };
}

const T = {
  nl: { betaald: 'Betaald — we gaan aan de slag.', bevestigd: 'Je betaling wordt bevestigd.', niet: 'De betaling is niet afgerond.', opnieuw: 'Opnieuw betalen', hoeftNiet: 'Je hoeft niet opnieuw te betalen', mailen: 'we mailen je zodra de betaling binnen is' },
  en: { betaald: 'Paid — we are on it.', bevestigd: 'Your payment is being confirmed.', niet: 'The payment was not completed.', opnieuw: 'Pay again', hoeftNiet: 'You do not need to pay again', mailen: 'we email you as soon as the payment is in' },
};

console.log('\nVISUAILS — de bedankpagina in drie standen (1.05)\n');

for (const lang of ['nl', 'en']) {
  const t = T[lang];
  const v = zoGaatHetVerder({ lang, factuur: 'volgt' });
  const onbetaald = stilteRegel({ lang, factuur: 'na-betaling' });

  console.log(`${lang} · (a) betaald`);
  for (const breedte of [390, 1280]) {
    const p = await open({ lang, breedte, query: '?paid=VIS-TEST-001', antwoord: () => STATUS.betaald });
    await p.loop(2000);
    const s = await p.lees();
    ok(`  ${breedte}px: de kop zegt betaald`, s.kop, t.betaald);
    ok(`  ${breedte}px: geen betaalknop`, s.knop, []);
    ok(`  ${breedte}px: het vinkje staat er`, s.vinkje, true);
    ok(`  ${breedte}px: "Zo gaat het verder" met drie regels uit verder.js`, s.verder, v.regels);
    ok(`  ${breedte}px: met de kop van het blok`, s.kopVerder, v.kop);
    ok(`  ${breedte}px: niets steekt buiten beeld`, s.breed <= breedte, true);
    await p.schot(`${lang}-a-betaald-${breedte}`);
    ok(`  ${breedte}px: geen scriptfouten`, p.fouten, []);
    await p.ctx.close();
  }

  console.log(`${lang} · (b) bevestigen`);
  for (const breedte of [390, 1280]) {
    const p = await open({ lang, breedte, query: '?paid=VIS-TEST-002', antwoord: () => STATUS.open });
    await p.loop(3000);
    let s = await p.lees();
    ok(`  ${breedte}px: de kop zegt "wordt bevestigd"`, s.kop, t.bevestigd);
    ok(`  ${breedte}px: "je hoeft niet opnieuw te betalen"`, s.stand.includes(t.hoeftNiet), true);
    ok(`  ${breedte}px: en GEEN knop`, s.knop, []);
    ok(`  ${breedte}px: geen vinkje zolang het niet bevestigd is`, s.vinkje, false);
    await p.schot(`${lang}-b-bevestigen-${breedte}`);
    /* Na een halve minuut vraagt hij nog door. */
    const halverwege = p.vragen();
    await p.loop(27000);
    ok(`  ${breedte}px: na een halve minuut vraagt hij nog`, p.vragen() > halverwege, true);
    await p.loop(40000);
    s = await p.lees();
    const na = p.vragen();
    ok(`  ${breedte}px: na ongeveer een minuut stopt hij met "we mailen je"`, s.stand.includes(t.mailen), true);
    ok(`  ${breedte}px: nog steeds geen knop`, s.knop, []);
    await p.loop(30000);
    ok(`  ${breedte}px: en daarna vraagt hij niets meer`, p.vragen(), na);
    ok(`  ${breedte}px: hoogstens zestien vragen in totaal (limiet 30 per minuut)`, na <= 16, true);
    await p.schot(`${lang}-b-gestopt-${breedte}`);
    await p.ctx.close();
  }

  console.log(`${lang} · (b) → (a): de webhook komt na een paar tellen`);
  {
    const p = await open({ lang, query: '?paid=VIS-TEST-003', antwoord: (n) => (n < 6 ? STATUS.open : STATUS.betaald) });
    await p.loop(25000);
    const s = await p.lees();
    ok('  eerst bevestigen, daarna betaald', s.kop, t.betaald);
    ok('  zonder dat er ooit een knop stond', s.knop, []);
    await p.ctx.close();
  }

  console.log(`${lang} · (c) Mollie meldt mislukt`);
  for (const breedte of [390, 1280]) {
    const p = await open({ lang, breedte, query: '?paid=VIS-TEST-004', antwoord: () => STATUS.mislukt });
    await p.loop(2000);
    const s = await p.lees();
    ok(`  ${breedte}px: de kop zegt niet afgerond`, s.kop, t.niet);
    ok(`  ${breedte}px: precies één knop "opnieuw betalen"`, s.knop, [t.opnieuw]);
    ok(`  ${breedte}px: het blok zegt "na je betaling de factuur"`, s.verder[2], onbetaald);
    ok(`  ${breedte}px: niets steekt buiten beeld`, s.breed <= breedte, true);
    await p.schot(`${lang}-c-mislukt-${breedte}`);
    await p.ctx.close();
  }

  console.log(`${lang} · de leverregel volgt de bestelling`);
  {
    const p = await open({
      lang, query: '?paid=VIS-TEST-005', antwoord: () => STATUS.betaald,
      sessie: { 'vis-ty-ref': 'VIS-TEST-005', 'vis-ty-venster': '14 okt – 15 okt', 'vis-ty-n': '12' },
    });
    await p.loop(2000);
    const s = await p.lees();
    ok('  gereserveerde dagen: de dagen staan in de tweede regel', s.verder[1], leverregel({ lang, levering: { soort: 'datum' }, datumTekst: '14 okt – 15 okt' }));
    await p.ctx.close();
  }
  {
    const p = await open({
      lang, query: '?paid=VIS-TEST-006', antwoord: () => STATUS.betaald,
      sessie: { 'vis-ty-ref': 'VIS-TEST-006', 'vis-ty-n': '12' },
    });
    await p.loop(2000);
    const s = await p.lees();
    ok('  vanaf de drempel zonder dagen: de datum volgt', s.verder[1], leverregel({ lang, levering: { soort: 'datum-volgt' } }));
    await p.ctx.close();
  }
  /* Naloop A2 (8 okt 2026): voorrang stond er niet; de pagina zei "zo snel mogelijk". */
  {
    const p = await open({
      lang, query: '?paid=VIS-TEST-008', antwoord: () => STATUS.betaald,
      sessie: { 'vis-ty-ref': 'VIS-TEST-008', 'vis-ty-n': '3', 'vis-ty-voorrang': '1' },
    });
    await p.loop(2000);
    const s = await p.lees();
    ok('  voorrang: de voorrangsregel staat in de tweede regel', s.verder[1], leverregel({ lang, levering: { soort: 'voorrang' } }));
    const rij = await p.page.evaluate(() => document.querySelector('dd[data-ty-timing]')?.textContent.trim());
    ok('  voorrang: ook de Levertijd-rij zegt voorrang', rij, voorrangZin(lang));
    await p.ctx.close();
  }
  {
    const p = await open({
      lang, query: '?paid=VIS-TEST-009', antwoord: () => STATUS.betaald,
      sessie: { 'vis-ty-ref': 'VIS-TEST-OUD', 'vis-ty-n': '3', 'vis-ty-voorrang': '1' },
    });
    await p.loop(2000);
    const s = await p.lees();
    ok('  voorrang van een ándere bestelling telt niet: zo snel mogelijk', s.verder[1], leverregel({ lang, levering: { soort: 'zsm' } }));
    await p.ctx.close();
  }
  {
    const p = await open({ lang, query: '?soort=aanvraag&ref=VIS-TEST-007', antwoord: () => STATUS.open });
    await p.loop(2000);
    const s = await p.lees();
    ok('  een aanvraag krijgt geen verder-blok', s.verder, []);
    await p.ctx.close();
  }
}

await browser.close();
server.close();
console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
