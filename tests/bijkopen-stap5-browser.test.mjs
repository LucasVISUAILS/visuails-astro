/*
 * STAP 5: TE WEINIG CREDITS, EN BIJKOPEN — 12 oktober 2026 (ab-v4 = b)
 *
 * Het gebouwde bestelformulier (dist/) met een nagebootste /account/me van een
 * ingelogde abonnee. Draai via de wachtrij, na een build:
 *   $S/zwaar.sh node tests/bijkopen-stap5-browser.test.mjs
 *
 * Op 390 en 1280 px, NL en EN, licht en donker:
 *   · te weinig credits (30, de bestelling kost 48): "Je komt 18 credits tekort.
 *     Koop 25 credits bij voor €157 excl. btw, of betaal deze bestelling gewoon
 *     via Mollie." met de link naar Studio (pakket 25, en de weg terug);
 *   · met de hint "Overstappen naar … is voordeliger" als /account/me die geeft;
 *   · geen pakket dat past (deze maand al vol): geen bijkoopregel;
 *   · genoeg credits maar boven het spaarplafond na de volgende termijn: de zin
 *     "gebruik er vóór die dag nog …";
 *   · contrast ≥ 4,5 en tekst ≥ 11,5 px, geen horizontale scroll, geen scriptfouten.
 * Schermafdrukken in .render/bijkopen-stap5-*.png.
 */
import http from 'node:http';
import { metVisIn } from './lib/vis-in.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { SERVICE_CREDITS, PLAN_CREDITS, PLAN_AMOUNT, bijkoopPrijs, spaarPlafond } from '../src/data/pricing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(80)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

if (!fs.existsSync(path.join(DIST, 'nl/start/catalog/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const PORT = 4381;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const browser = metVisIn(await chromium.launch({ executablePath: process.env.CHROME || browserPad() }));

const dag = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
/* Een Pro-abonnee, verzonnen gegevens. */
const ME = (credits) => ({
  email: 'inkoop@proefmerk.test', name: 'Testa Proef', first_name: 'Testa', last_name: 'Proef', brand: 'Proefmerk BV',
  phone: '+31 6 00000000', country: 'NL', address_line1: 'Verzonnenstraat 1', postal_code: '1234 AB', city: 'Nergenshuizen',
  regNumber: '12345678', vat: '', noVat: false, locks: {}, models: [], styles: [], saved: true, label: 'Proefmerk BV',
  tegoedCents: 0, credits,
});
const pakketten = (hint = null) => [10, 25, 50].map((x) => ({ credits: x, euros: bijkoopPrijs(PLAN_AMOUNT.studio, PLAN_CREDITS.studio, x), hint: x === 25 ? hint : null }));
const nieuw = { op: dag(21), aantal: PLAN_CREDITS.studio };
const WEINIG = { saldo: 30, vervalt: [], nieuw, plafond: spaarPlafond(PLAN_CREDITS.studio), aboSaldo: 30, bijkoop: { ruimte: 100, pakketten: pakketten() } };
const WEINIG_HINT = { ...WEINIG, bijkoop: { ruimte: 100, pakketten: pakketten({ naam: 'Merk', bedrag: PLAN_AMOUNT.brand, credits: PLAN_CREDITS.brand, reden: 'twee-maanden' }) } };
const VOL = { ...WEINIG, bijkoop: { ruimte: 0, pakketten: pakketten() } };
const BOVEN = { saldo: 340, vervalt: [], nieuw, plafond: spaarPlafond(PLAN_CREDITS.studio), aboSaldo: 340, bijkoop: { ruimte: 100, pakketten: pakketten() } };

async function open(url, { breed = 1280, me = null, donker = false } = {}) {
  const page = await browser.newPage({ viewport: { width: breed, height: breed < 600 ? 844 : 900 }, colorScheme: donker ? 'dark' : 'light' });
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.route('**/api/land', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"NL"}' }));
  await page.route('**/account/me**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(me) }));
  await page.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
  await page.route('**/api/capacity**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, reason: 'ok', windows: [{ start: dag(6), end: dag(7) }], from: dag(5), earlier: false, more: false }),
  }));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
  await page.waitForTimeout(400);
  return { page, fouten };
}

const tekst = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el && !el.hidden ? el.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const href = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el && !el.closest('[hidden]') ? el.getAttribute('href') : null; }, sel);
const huidigeStap = (page) => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));
const zetAantal = async (page, n) => { await page.fill('[data-pl-qty-input]', String(n)); await page.waitForTimeout(150); };
async function naarStap5(page) {
  for (let i = 0; i < 6; i += 1) {
    if (await huidigeStap(page) === 5) return 5;
    await page.evaluate(() => {
      const kies = (naam) => {
        const r = document.querySelector(`.pl-step.is-current input[name="${naam}"]`);
        if (r && !document.querySelector(`input[name="${naam}"]:checked`)) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      };
      kies('style'); kies('model');
      const g = document.querySelector('.pl-step.is-current select[name="garment"]');
      if (g && !g.value) { const o = [...g.options].find((x) => x.value); if (o) { g.value = o.value; g.dispatchEvent(new Event('change', { bubbles: true })); } }
    });
    if (await page.$('.pl-dagen button[data-start]:visible')) { await page.click('.pl-dagen button[data-start]'); await page.waitForTimeout(150); }
    await page.click('.pl-step.is-current [data-pl-next]');
    await page.waitForTimeout(350);
    if (await page.$('[data-pl-missing]:not([hidden]) [data-pl-missing-go]')) { await page.click('[data-pl-missing-go]'); await page.waitForTimeout(300); }
  }
  return huidigeStap(page);
}
const leesbaar = (page, sel) => page.evaluate((s) => {
  const uit = [];
  for (const el of document.querySelectorAll(s)) {
    if (!el || el.closest('[hidden]') || !el.getClientRects().length) continue;
    const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    let bg = [255, 255, 255, 1];
    for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { bg = b; break; } }
    const fg = rgba(getComputedStyle(el).color);
    const mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const [a, b] = [lum(mix), lum(bg.slice(0, 3))];
    uit.push({ ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100, px: parseFloat(getComputedStyle(el).fontSize) });
  }
  return uit;
}, sel);
async function leesbaarOk(page, sel, label) {
  const l = await leesbaar(page, sel);
  ok(`${label}: ${sel} (${l.length}×) contrast ≥ 4,5 en ≥ 11,5 px`, l.length > 0 && l.every((x) => x.ratio >= 4.5 && x.px >= 11.5));
}
const geenScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const kost12 = 12 * SERVICE_CREDITS.catalog;
const tekort = kost12 - 30;
const prijs25 = bijkoopPrijs(PLAN_AMOUNT.studio, PLAN_CREDITS.studio, 25);
for (const [url, taal] of [['/nl/start/catalog/', 'nl'], ['/start/catalog/', 'en']]) {
  for (const breed of [390, 1280]) {
    for (const donker of [false, true]) {
      const tag = `${taal} ${breed}px ${donker ? 'donker' : 'licht'}`;
      console.log(`\n${tag}`);
      {
        const { page, fouten } = await open(url, { breed, donker, me: ME(WEINIG) });
        await zetAantal(page, 12);
        ok(`${tag}: stap 5 bereikt`, await naarStap5(page), 5);
        const bij = await tekst(page, '[data-pl-credits-bij]');
        ok(`${tag}: "Je komt ${tekort} credits tekort. Koop 25 credits bij …"`, bij, taal === 'nl'
          ? `Je komt ${tekort} credits tekort. Koop 25 credits bij voor €${prijs25} excl. btw, of betaal deze bestelling gewoon via Mollie. Credits bijkopen`
          : `You are ${tekort} credits short. Buy 25 credits for €${prijs25} excl. VAT, or simply pay for this order through Mollie. Buy credits`);
        ok(`${tag}: de link naar Studio met het pakket en de weg terug`, await href(page, '[data-pl-credits-bij-link]'), `/account/plan/?pakket=25&verder=${encodeURIComponent(url)}#bijkopen`);
        ok(`${tag}: zonder hint geen hint`, await tekst(page, '[data-pl-credits-hint]'), null);
        ok(`${tag}: de knop blijft "Bestellen en betalen"`, await tekst(page, '[data-pl-submit]'), taal === 'nl' ? 'Bestellen en betalen' : 'Order and pay');
        ok(`${tag}: geen horizontale scroll`, await geenScroll(page));
        await leesbaarOk(page, '[data-pl-credits-bij] span, [data-pl-credits-bij] a', tag);
        await page.locator('[data-pl-credits]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(OUT, `bijkopen-stap5-${taal}-${breed}-${donker ? 'donker' : 'licht'}.png`) });
        ok(`${tag}: geen scriptfouten`, fouten, []);
        await page.close();
      }
      {
        const { page, fouten } = await open(url, { breed, donker, me: ME(WEINIG_HINT) });
        await zetAantal(page, 12);
        await naarStap5(page);
        const h = await tekst(page, '[data-pl-credits-hint]');
        ok(`${tag}: met de hint "Overstappen naar … is voordeliger"`, h, taal === 'nl'
          ? `Overstappen naar Merk is voordeliger: €${PLAN_AMOUNT.brand.toLocaleString('nl-NL')} per maand voor ${PLAN_CREDITS.brand} credits. Overstappen`
          : `Switching to Merk is better value: €${PLAN_AMOUNT.brand.toLocaleString('en-GB')} a month for ${PLAN_CREDITS.brand} credits. Switch plans`);
        /* Sinds 15 oktober 2026 (v29-overstap = a) naar het overstapformulier, met het plan erbij. */
        ok(`${tag}:   met een link naar Overstappen in /account/plan`, /^\/account\/plan\/\?tab=plan(&naar=[a-z]+)?#overstappen$/.test(await href(page, '[data-pl-credits-hint-link]')), true);
        if (breed === 390) await leesbaarOk(page, '[data-pl-credits-hint] span, [data-pl-credits-hint] a', tag);
        ok(`${tag}: geen scriptfouten (hint)`, fouten, []);
        await page.close();
      }
      if (breed === 1280 && !donker) {
        const { page, fouten } = await open(url, { breed, donker, me: ME(VOL) });
        await zetAantal(page, 12);
        await naarStap5(page);
        ok(`${tag}: deze maand al vol: geen bijkoopregel`, await tekst(page, '[data-pl-credits-bij]'), null);
        await page.close();
        const b = await open(url, { breed, donker, me: ME(BOVEN) });
        await zetAantal(b.page, 12);
        await naarStap5(b.page);
        const regels = await tekst(b.page, '[data-pl-credits-regels]') || '';
        const eraf = 340 - kost12 + PLAN_CREDITS.studio - spaarPlafond(PLAN_CREDITS.studio);
        ok(`${tag}: met credits, maar boven het plafond na de termijn: "nog ${eraf}"`, taal === 'nl'
          ? new RegExp(`komen er ${PLAN_CREDITS.studio} bij: gebruik er vóór die dag nog ${eraf}, anders vallen ze weg`).test(regels)
          : new RegExp(`${PLAN_CREDITS.studio} more come in: use ${eraf} more before that day, or they lapse`).test(regels), true);
        ok(`${tag}: geen scriptfouten (vol, boven)`, [...fouten, ...b.fouten], []);
        await b.page.close();
      }
    }
  }
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
