/*
 * STAP 5 MET CREDITS, IN DE BROWSER — ronde B, 8 oktober 2026 (§28.2, 6.03, 6.06)
 *
 * Het gebouwde bestelformulier (dist/) met een nagebootste /account/me van een
 * ingelogde abonnee. Draai via de wachtrij, na een build:
 *   $S/zwaar.sh node tests/credits-stap5-browser.test.mjs
 *
 * Wat hier vast moet staan, op 390 en 1280 px, NL en EN, licht en donker:
 *   · genoeg credits: "Deze bestelling kost 48 credits · je hebt er 120 ·
 *     daarna 72", welke credits als eerste opgaan, en de knop "Bestellen met
 *     credits"; de Mollie-zinnen zijn weg en het tegoed "blijft staan";
 *   · te weinig: wat er wél past ("haal 5 producten eraf"), wanneer er nieuwe
 *     bijkomen en wat Mollie kost; de knop blijft "Bestellen en betalen";
 *   · voorrang aan: "gaat niet met credits", via Mollie;
 *   · zonder credits (geen abonnee): het blok is er niet;
 *   · contrast ≥ 4,5 en tekst ≥ 11,5 px; geen scriptfouten.
 * Schermafdrukken in .render/credits-stap5-*.png.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { SERVICE_CREDITS, PLAN_CREDITS } from '../src/data/pricing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(78)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

if (!fs.existsSync(path.join(DIST, 'nl/start/catalog/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const PORT = 4363;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });

const dag = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
/* Een abonnee met 120 credits, waarvan 20 over tien dagen vervallen, en
   nieuwe credits over drie weken. Geen echt adres: alles verzonnen. */
const ME = (credits, tegoedCents = 0) => ({
  email: 'inkoop@proefmerk.test', name: 'Testa Proef', first_name: 'Testa', last_name: 'Proef', brand: 'Proefmerk BV',
  phone: '+31 6 00000000', country: 'NL', address_line1: 'Verzonnenstraat 1', postal_code: '1234 AB', city: 'Nergenshuizen',
  regNumber: '12345678', vat: '', noVat: false, locks: {}, models: [], styles: [], saved: true, label: 'Proefmerk BV',
  tegoedCents, credits,
});
const MET = { saldo: 120, vervalt: [{ op: dag(10), aantal: 20 }, { op: dag(80), aantal: 100 }], nieuw: { op: dag(21), aantal: PLAN_CREDITS.studio } };
const WEINIG = { saldo: 30, vervalt: [{ op: dag(60), aantal: 30 }], nieuw: { op: dag(21), aantal: PLAN_CREDITS.studio } };

async function open(url, { breed = 1280, me = null, donker = false } = {}) {
  const page = await browser.newPage({ viewport: { width: breed, height: breed < 600 ? 844 : 900 }, colorScheme: donker ? 'dark' : 'light' });
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.route('**/api/land', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"NL"}' }));
  await page.route('**/account/me**', (r) => (me
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(me) })
    : r.fulfill({ status: 401, contentType: 'application/json', body: 'null' })));
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
const huidigeStap = (page) => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));
const zetAantal = async (page, n) => { await page.fill('[data-pl-qty-input]', String(n)); await page.waitForTimeout(150); };

/* Naar stap 5: look, model, foto's overslaan, gegevens (voorgevuld), levertijd. */
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

/* Contrast en lettergrootte, zoals tests/formulier-a2-browser.test.mjs. */
const leesbaar = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el || el.hidden || !el.getClientRects().length) return null;
  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  let bg = [255, 255, 255, 1];
  for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { bg = b; break; } }
  const fg = rgba(getComputedStyle(el).color);
  const mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const [a, b] = [lum(mix), lum(bg.slice(0, 3))];
  return { ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100, px: parseFloat(getComputedStyle(el).fontSize) };
}, sel);
async function leesbaarOk(page, sel, label) {
  const l = await leesbaar(page, sel);
  if (!l) { ok(`${label}: ${sel} is te zien`, false); return; }
  ok(`${label}: ${sel} contrast ≥ 4,5 (${l.ratio}) en ≥ 11,5 px (${l.px})`, l.ratio >= 4.5 && l.px >= 11.5);
}
const geenScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const kost12 = 12 * SERVICE_CREDITS.catalog;
for (const [url, taal] of [['/nl/start/catalog', 'nl'], ['/start/catalog', 'en']]) {
  for (const breed of [390, 1280]) {
    for (const donker of [false, true]) {
      const tag = `${taal} ${breed}px ${donker ? 'donker' : 'licht'}`;
      console.log(`\n${tag}`);

      /* 1 · genoeg credits (12 catalogsets = 48), met tegoed erbij. */
      {
        const { page, fouten } = await open(url, { breed, donker, me: ME(MET, 5000) });
        await zetAantal(page, 12);
        ok(`${tag}: stap 5 bereikt`, await naarStap5(page), 5);
        const kop = await tekst(page, '[data-pl-credits-kop]');
        ok(`${tag}: "kost 48 · je hebt er 120 · daarna 72"`, kop, taal === 'nl'
          ? `Deze bestelling kost ${kost12} credits · je hebt er 120 · daarna ${120 - kost12}`
          : `This order costs ${kost12} credits · you have 120 · ${120 - kost12} left after`);
        const regels = await tekst(page, '[data-pl-credits-regels]') || '';
        ok(`${tag}: de oudste gaan eerst (20 die binnenkort vervallen)`, /De oudste gaan eerst: 20|The oldest go first: 20/.test(regels));
        ok(`${tag}: de knop heet "Bestellen met credits"`, await tekst(page, '[data-pl-submit]'), taal === 'nl' ? 'Bestellen met credits' : 'Order with credits');
        ok(`${tag}: de Mollie-zin is weg`, await tekst(page, '.pl-pay-note'), null);
        ok(`${tag}: het tegoed blijft staan voor Mollie`, /blijft staan voor een betaling via Mollie|stays for a payment through Mollie/.test(await tekst(page, '[data-pl-tegoed]') || ''));
        ok(`${tag}: geen horizontale scroll`, await geenScroll(page));
        await leesbaarOk(page, '[data-pl-credits-kop]', tag);
        await leesbaarOk(page, '.pl-credits-regels li', tag);
        await page.locator('[data-pl-credits]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(OUT, `credits-stap5-genoeg-${taal}-${breed}-${donker ? 'donker' : 'licht'}.png`) });

        /* 2 · voorrang aan: niet met credits, via Mollie. */
        await page.evaluate(() => { const v = document.querySelector('input[name="voorrang"]'); if (v) { v.checked = true; v.dispatchEvent(new Event('change', { bubbles: true })); } });
        await page.waitForTimeout(200);
        const voorrang = await tekst(page, '[data-pl-credits-kop]') || '';
        ok(`${tag}: voorrang → "gaat niet met credits", via Mollie`, /Met voorrang gaat deze bestelling niet met credits|With priority, this order cannot be paid with credits/.test(voorrang));
        ok(`${tag}:   met het bedrag in euro`, /€\d/.test(voorrang));
        ok(`${tag}:   de knop is weer de gewone`, await tekst(page, '[data-pl-submit]'), taal === 'nl' ? 'Bestellen en betalen' : 'Order and pay');
        ok(`${tag}:   de Mollie-zin staat er weer`, !!(await tekst(page, '.pl-pay-note')));
        if (breed === 390 && !donker) {
          await page.locator('[data-pl-credits]').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(OUT, `credits-stap5-voorrang-${taal}-${breed}.png`) });
        }
        ok(`${tag}: geen scriptfouten`, fouten, []);
        await page.close();
      }

      /* 3 · te weinig credits (30, 12 catalogsets = 48). */
      {
        const { page, fouten } = await open(url, { breed, donker, me: ME(WEINIG) });
        await zetAantal(page, 12);
        ok(`${tag}: stap 5 bereikt (te weinig)`, await naarStap5(page), 5);
        ok(`${tag}: "kost 48, je hebt er 30"`, await tekst(page, '[data-pl-credits-kop]'),
          taal === 'nl' ? `Deze bestelling kost ${kost12} credits, je hebt er 30.` : `This order costs ${kost12} credits; you have 30.`);
        const regels = await tekst(page, '[data-pl-credits-regels]') || '';
        ok(`${tag}: wat wel past: 7, haal 5 eraf`, taal === 'nl'
          ? regels.includes('Daarmee kun je 7 catalogsets bestellen: haal 5 producten eraf')
          : regels.includes('That is enough for 7 catalog sets: take 5 products off'));
        ok(`${tag}: wanneer er nieuwe bijkomen`, /komen er 120 bij|120 new credits come in/.test(regels));
        ok(`${tag}: en wat Mollie kost`, /via Mollie: €\d|through Mollie: €\d/.test(regels));
        ok(`${tag}: de knop blijft "Bestellen en betalen"`, await tekst(page, '[data-pl-submit]'), taal === 'nl' ? 'Bestellen en betalen' : 'Order and pay');
        ok(`${tag}: geen horizontale scroll`, await geenScroll(page));
        await leesbaarOk(page, '.pl-credits-regels li', tag);
        await page.locator('[data-pl-credits]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(OUT, `credits-stap5-teweinig-${taal}-${breed}-${donker ? 'donker' : 'licht'}.png`) });
        ok(`${tag}: geen scriptfouten`, fouten, []);
        await page.close();
      }
    }
  }
}

/* 4 · geen abonnee: geen blok. */
{
  const { page, fouten } = await open('/nl/start/catalog', { breed: 1280, me: ME(null) });
  await zetAantal(page, 3);
  await naarStap5(page);
  ok('zonder credits: geen creditblok', await tekst(page, '[data-pl-credits]'), null);
  ok('  en de gewone knop', await tekst(page, '[data-pl-submit]'), 'Bestellen en betalen');
  ok('  geen scriptfouten', fouten, []);
  await page.close();
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
