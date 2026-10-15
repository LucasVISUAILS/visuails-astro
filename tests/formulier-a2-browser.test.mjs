/*
 * RONDE A2 · F2 IN EEN ECHTE BROWSER — 8 oktober 2026 (1.07, 1.08, 8.06)
 *
 * Loopt het gebouwde bestelformulier (dist/) door in Chromium, zoals een klant:
 * 390 en 1280 px breed, NL en EN, met 1, 5 en 16 producten, met een
 * Nederlandse, een Belgische en een Amerikaanse klant, en de €1-proef. Wat het
 * nagaat:
 *
 *   1.07  de besparingsregel staat er alleen waar de staffel het zegt, met de
 *         bedragen uit pricing.js, één klik zet het aantal; "Inbegrepen" staat
 *         onder het totaal; stap 5 noemt wanneer het komt en de revisieronde
 *         (niet bij de proef);
 *   1.08  onder elke stap één App-ons-link; het bericht noemt de stand en het
 *         aantal, en niets van wat de klant in stap 3 typte;
 *   8.06  het land staat voorgevuld (nagebootst /api/land) en is te wijzigen;
 *         het aparte 0%-vinkje is weg; bij BE staat de verleggingszin in het
 *         zakelijk-vinkje en gaat vat_confirmed=yes mee, bij NL en VS niet;
 *   en    contrast ≥ 4,5:1 en tekst ≥ 11,5 px op alles wat nieuw is.
 *
 * De API's (/api/land, /account/me, /api/capacity, /api/step, /api/botcheck)
 * worden in de browser nagebootst; er wordt niets verstuurd. Schermafdrukken in
 * .render/a2-f2-*.png.
 *
 * Zwaar (browser): $S/zwaar.sh node tests/formulier-a2-browser.test.mjs — na een build.
 */
import http from 'node:http';
import { metVisIn } from './lib/vis-in.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { ladderGroterGoedkoper, ladderTotal, WINDOW_THRESHOLD } from '../src/data/pricing.js';
import { verleggingZin } from '../src/data/business.js';

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
const PORT = 4296;
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

/* ── HULP ────────────────────────────────────────────────────────────────── */
async function open(url, { breed = 1280, land = 'NL' } = {}) {
  const page = await browser.newPage({ viewport: { width: breed, height: breed < 600 ? 844 : 900 } });
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  const landVragen = [];
  await page.route('**/api/land', (r) => { landVragen.push(1); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ land }) }); });
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
  await page.route('**/api/capacity**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, reason: 'ok', windows: [{ start: '2026-10-14', end: '2026-10-15' }], from: '2026-10-12', earlier: false, more: false }),
  }));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
  await page.waitForTimeout(300);
  return { page, fouten, landVragen };
}

const tekst = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el && !el.hidden ? el.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const zetAantal = async (page, n) => { await page.fill('[data-pl-qty-input]', String(n)); await page.waitForTimeout(150); };
const appOns = (page) => page.evaluate(() => [...document.querySelectorAll('[data-pl-appons]')].map((a) => [a.dataset.plAppons, new URL(a.href).searchParams.get('text')]));
const huidigeStap = (page) => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));

/* Contrast en lettergrootte van een element, tegen de eerste niet-doorzichtige achtergrond. */
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
  ok(`${label}: ${sel} contrast ≥ 4,5 (${l.ratio}) en tekst ≥ 11,5 px (${l.px})`, l.ratio >= 4.5 && l.px >= 11.5);
}

/* Stap 1 → 2 → 3: de vragen die erbij horen beantwoorden, foto's overslaan.
   Het gezicht staat sinds 11 oktober 2026 in stap 1 (F3, 1.09), dus dat wordt
   nu vóór de eerste klik gekozen; de regel verderop vindt het dan al gekozen. */
async function naarStap3(page) {
  await page.evaluate(() => {
    const look = document.querySelector('[data-pl-look]');
    const eerste = look && !look.hidden ? look.querySelector('input[name="style"]') : null;
    if (eerste && !document.querySelector('input[name="style"]:checked')) { eerste.checked = true; eerste.dispatchEvent(new Event('change', { bubbles: true })); }
    const m = document.querySelector('[data-pl-step="1"] input[name="model"]');
    if (m && !document.querySelector('input[name="model"]:checked')) { m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const m = document.querySelector('input[name="model"]');
    if (m && !document.querySelector('input[name="model"]:checked')) { m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); }
    const g = document.querySelector('select[name="garment"]');
    if (g && !g.value) { const o = [...g.options].find((x) => x.value); if (o) { g.value = o.value; g.dispatchEvent(new Event('change', { bubbles: true })); } }
  });
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(250);
  if (await page.$('[data-pl-missing]:not([hidden]) [data-pl-missing-go]')) await page.click('[data-pl-missing-go]');
  await page.waitForTimeout(250);
  return huidigeStap(page);
}
async function vulStap3(page, klant) {
  const veld = async (naam, waarde) => { if (await page.$(`[name="${naam}"]:visible`)) await page.fill(`[name="${naam}"]`, waarde); };
  await veld('first_name', 'Testa');
  await veld('last_name', 'Proef');
  await veld('brand', klant.merk);
  await veld('email', 'inkoop@proefmerk.test');
  await veld('phone', '+31 6 00000000');
  await veld('address_line1', 'Verzonnenstraat 1');
  await veld('postal_code', klant.postcode);
  await veld('city', 'Nergenshuizen');
  if (klant.btw) await veld('vat', klant.btw);
  if (klant.kvk) await veld('reg_number', klant.kvk);
  if (klant.geenBtw) {
    const box = await page.$('input[name="no_vat"]:visible');
    if (box && !(await box.isChecked())) await box.check();
  }
}
async function verder(page) {
  const voor = await huidigeStap(page);
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(400);
  if (await page.$('.pl-dagen button[data-start]')) {
    await page.click('.pl-dagen button[data-start]');
    await page.waitForTimeout(200);
    await page.click('.pl-step.is-current [data-pl-next]');
    await page.waitForTimeout(400);
  }
  const na = await huidigeStap(page);
  if (na === voor) console.log('    blijft op stap', voor, '—', await tekst(page, '.pl-step.is-current [data-pl-step-error]'));
  return na;
}

/* ── 1 · STAP 1: DE BESPARINGSREGEL, IN TWEE BREEDTES EN TWEE TALEN ─────── */
console.log('\nstap 1 — de besparingsregel en "Inbegrepen"');
for (const [url, taal] of [['/nl/start/catalog', 'nl'], ['/start/catalog', 'en']]) {
  for (const breed of [390, 1280]) {
    const { page, fouten } = await open(url, { breed });
    const tag = `${taal} ${breed}px`;
    for (const n of [1, 5, 16]) {
      await zetAantal(page, n);
      const moet = ladderGroterGoedkoper('catalog', n);
      const regel = await tekst(page, '[data-pl-besparing]');
      if (!moet) {
        ok(`${tag}: ${n} producten — geen besparingsregel`, regel, null);
      } else {
        const euro = (x) => (taal === 'nl' ? `€${x.toLocaleString('nl-NL')}` : `€${x.toLocaleString('en-GB')}`);
        ok(`${tag}: ${n} producten — regel noemt ${moet.aantal}, ${euro(moet.dan)} en ${euro(moet.nu)}`,
          !!regel && regel.includes(String(moet.aantal)) && regel.includes(euro(moet.dan)) && regel.includes(euro(moet.nu)));
        ok(`${tag}: ${n} producten — de ladderregel zwijgt dan`, await tekst(page, '[data-pl-rung]'), null);
        ok(`${tag}: ${n} producten — datumzin alleen als het voorgestelde aantal de drempel haalt`,
          /vaste leverdatum|fixed delivery date/.test(regel || ''), n < WINDOW_THRESHOLD && moet.aantal >= WINDOW_THRESHOLD);
        if (n === 16 && breed === 1280) await leesbaarOk(page, '[data-pl-besparing]', tag);
      }
      const links = await appOns(page);
      ok(`${tag}: ${n} producten — App ons noemt het aantal in elk bericht`,
        links.length === 5 && links.every(([, t]) => t.includes(taal === 'nl' ? `met ${n} ${n === 1 ? 'product' : 'producten'}` : `with ${n} ${n === 1 ? 'product' : 'products'}`)));
    }
    /* Vier producten: de regel, en één klik zet er vijf neer. */
    await zetAantal(page, 4);
    const vier = ladderGroterGoedkoper('catalog', 4);
    ok(`${tag}: bij 4 staat de regel er`, !!(await tekst(page, '[data-pl-besparing]')));
    if (breed === 390) await page.screenshot({ path: path.join(OUT, `a2-f2-stap1-${taal}-${breed}.png`), fullPage: false, clip: undefined });
    await page.locator('[data-pl-besparing]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `a2-f2-besparing-${taal}-${breed}.png`) });
    await page.click('.pl-besparing-knop');
    await page.waitForTimeout(200);
    ok(`${tag}: één klik zet het aantal op ${vier.aantal}`, await page.inputValue('[data-pl-qty-input]'), String(vier.aantal));
    ok(`${tag}: en het totaal is dan het bedrag uit de regel`, (await tekst(page, '[data-pl-total]')) || '', taal === 'nl' ? `€${ladderTotal('catalog', vier.aantal)}` : `€${ladderTotal('catalog', vier.aantal)}`);
    ok(`${tag}: "Inbegrepen" staat er, met de revisieronde`, /revisieronde|revision round/.test((await tekst(page, '.pl-inbegrepen')) || ''));
    await leesbaarOk(page, '.pl-inbegrepen', tag);
    await leesbaarOk(page, '.pl-appons', tag);
    await leesbaarOk(page, '.pl-appons a', tag);
    await page.locator('.pl-step.is-current .pl-appons').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `a2-f2-appons-${taal}-${breed}.png`) });
    ok(`${tag}: geen scriptfouten`, fouten, []);
    await page.close();
  }
}

/* ── 2 · STAP 3 EN 5 PER KLANT: NL, BE, VS ─────────────────────────────── */
console.log('\nstap 3 en 5 — land, btw-vinkje, wanneer, App ons');
const KLANTEN = [
  { id: 'NL', land: 'NL', merk: 'Proefmerk BV', postcode: '1234 AB', kvk: '12345678' },
  { id: 'BE', land: 'BE', merk: 'Proefmerk BV', postcode: '1000', btw: 'BE0123456749' },
  { id: 'US', land: 'US', merk: 'Proefmerk Inc', postcode: '10001' },
];
for (const klant of KLANTEN) {
  for (const [url, taal, n, breed] of [['/nl/start/catalog', 'nl', 5, 390], ['/start/lifestyle', 'en', 16, 1280]]) {
    const tag = `${klant.id} ${taal} ${n}× ${breed}px`;
    const { page, fouten, landVragen } = await open(url, { breed, land: klant.land });
    await zetAantal(page, n);
    const stap = await naarStap3(page);
    ok(`${tag}: stap 3 bereikt`, stap, 3);
    ok(`${tag}: /api/land is gevraagd`, landVragen.length >= 1);
    ok(`${tag}: het land staat voorgevuld op ${klant.land}`, await page.inputValue('select[name="country"]'), klant.land);
    ok(`${tag}: het land is zichtbaar en te wijzigen`, await page.isVisible('select[name="country"]') && await page.isEnabled('select[name="country"]'));
    ok(`${tag}: het aparte 0%-vinkje bestaat niet meer`, await page.$('[data-pl-vatconfirm], input[type="checkbox"][name="vat_confirmed"]'), null);
    if (klant.id === 'NL') {
      ok(`${tag}: de KVK-regel zegt waarom`, /alleen voor bedrijven|businesses only/.test((await tekst(page, '[data-pl-reg-hint]')) || ''));
      await leesbaarOk(page, '[data-pl-reg-hint]', tag);
    }
    await vulStap3(page, klant);
    const links3 = await appOns(page);
    ok(`${tag}: App ons bevat niets van wat de klant typte`, links3.every(([, t]) => !/Testa|Proef|proefmerk|Verzonnen|\+31|1234|12345678|BE0123/i.test(t)));
    let s = await verder(page);
    if (n >= WINDOW_THRESHOLD) ok(`${tag}: stap 4 (levertijd) doorlopen met een gekozen venster`, s, 5);
    else ok(`${tag}: onder de drempel meteen naar stap 5`, s, 5);
    s = await huidigeStap(page);
    if (s !== 5) { await page.close(); continue; }
    const verlegd = await tekst(page, '[data-pl-verlegd]');
    const veld = await page.inputValue('[data-pl-verlegd-veld]');
    if (klant.id === 'BE') {
      ok(`${tag}: de verleggingszin staat in het zakelijk-vinkje`, verlegd, verleggingZin(taal, { merk: klant.merk, btw: klant.btw }));
      ok(`${tag}: en vat_confirmed=yes gaat mee`, veld, 'yes');
      await leesbaarOk(page, '[data-pl-verlegd]', tag);
      await page.locator('.pl-consent').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUT, `a2-f2-stap5-be-${taal}-${breed}.png`) });
      /* Ander land gekozen → zin weg. */
      await page.evaluate(() => { const sel = document.querySelector('select[name="country"]'); sel.value = 'NL'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
      ok(`${tag}: land naar NL gewijzigd → de zin en het veld zijn weg`, [await tekst(page, '[data-pl-verlegd]'), await page.inputValue('[data-pl-verlegd-veld]')], [null, '']);
    } else {
      ok(`${tag}: geen verleggingszin`, verlegd, null);
      ok(`${tag}: vat_confirmed blijft leeg`, veld, '');
    }
    const wanneer = await tekst(page, '[data-pl-wanneer]');
    ok(`${tag}: stap 5 zegt wanneer het komt`, n >= WINDOW_THRESHOLD ? /14|Oct|okt/.test(wanneer || '') : /zo snel mogelijk|as soon as/.test(wanneer || ''));
    ok(`${tag}: en de revisieronde met de dagen`, /7 dagen voor één revisieronde|7 days for one revision round/.test(wanneer || ''));
    await leesbaarOk(page, '[data-pl-wanneer]', tag);
    if (klant.id === 'BE') {
      await page.locator('.pl-step.is-current .pl-appons').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUT, `a2-f2-stap5-onder-${taal}-${breed}.png`) });
    }
    const links5 = await appOns(page);
    ok(`${tag}: vijf App-ons-links, elk met zijn eigen stap`, links5.map(([st]) => st), ['1', '2', '3', '4', '5']);
    ok(`${tag}: stap 5 noemt de stap en het aantal`, (links5[4] || [])[1] || '',
      taal === 'nl' ? `Hoi, ik zit bij stap 5 (betalen) van een catalogbestelling met ${n} producten.` : `Hi, I am at step 5 (payment) of a lifestyle order with ${n} products.`);
    ok(`${tag}: geen scriptfouten`, fouten, []);
    await page.close();
  }
}

/* ── 3 · DE €1-PROEF ──────────────────────────────────────────────────────── */
console.log('\nde €1-proef');
for (const [url, taal] of [['/nl/test-sample', 'nl'], ['/test-sample', 'en']]) {
  for (const breed of [390, 1280]) {
    const tag = `proef ${taal} ${breed}px`;
    const { page, fouten } = await open(url, { breed, land: 'BE' });
    ok(`${tag}: geen besparingsregel`, await tekst(page, '[data-pl-besparing]'), null);
    ok(`${tag}: "Inbegrepen" zonder revisieronde`, !/revisie|revision/.test((await tekst(page, '.pl-inbegrepen')) || 'revisie'));
    ok(`${tag}: de stap-5-regel (hier stap 4) zonder revisieronde`, !/revisie|revision/.test((await page.evaluate(() => document.querySelector('[data-pl-wanneer]')?.textContent || 'revisie'))));
    const links = await appOns(page);
    ok(`${tag}: vier App-ons-links (geen levertijd)`, links.map(([s]) => s), ['1', '2', '3', '4']);
    ok(`${tag}: het bericht noemt de proef en geen aantal`, links.every(([, t]) => /proef \(Probeer VISUAILS|trial \(Try VISUAILS/.test(t) && !/producten|products/.test(t)));
    ok(`${tag}: stap 4 heet "betalen"`, /stap 4 \(betalen\)|step 4 \(payment\)/.test((links[3] || [])[1] || ''));
    await leesbaarOk(page, '.pl-inbegrepen', tag);
    if (breed === 390) await page.screenshot({ path: path.join(OUT, `a2-f2-proef-${taal}-${breed}.png`) });
    ok(`${tag}: geen scriptfouten`, fouten, []);
    await page.close();
  }
}

/* ── 4 · HET LAND OVERSCHRIJFT NIETS ─────────────────────────────────────── */
console.log('\nhet land overschrijft niets');
{
  const { page } = await open('/nl/start/catalog', { breed: 1280, land: 'DE' });
  ok('zonder eerdere keuze: DE voorgevuld', await page.inputValue('select[name="country"]'), 'DE');
  await page.close();
  const p2 = await browser.newPage();
  await p2.route('**/api/land', async (r) => { await new Promise((res) => setTimeout(res, 800)); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"DE"}' }); });
  await p2.route('**/account/me**', (r) => r.fulfill({ status: 401, body: 'null' }));
  await p2.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
  await p2.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await p2.goto(`http://localhost:${PORT}/nl/start/catalog`, { waitUntil: 'load' });
  await p2.waitForSelector('#pl-form.is-live');
  await p2.evaluate(() => { const s = document.querySelector('select[name="country"]'); s.value = 'FR'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await p2.waitForTimeout(1200);
  ok('zelf gekozen terwijl het verzoek liep: blijft FR', await p2.inputValue('select[name="country"]'), 'FR');
  await p2.close();
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
