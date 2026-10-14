/*
 * NALOOP RONDE A2 IN DE BROWSER — 8 oktober 2026
 *
 *   1  de ladderregel in stap 1 staat zonder kader, in gewone tekstkleur, met
 *      alleen de bedragen vet — leesbaar op 390 en 1280 px (de publieke site
 *      heeft geen donkere stand; die heeft alleen Studio, zie thema.test.mjs);
 *   2  het merkmodelformulier: geen apart 0%-vinkje, de verleggingszin in het
 *      zakelijk-vinkje en het verborgen veld alleen bij EU (niet NL) met nummer;
 *   3  het abonnementsformulier vult het land voor via /api/land, maar nooit
 *      over een eigen keuze, een land uit het account of een terugkeer met ?fout=;
 *   4  de vier pagina's met vanaf-bedragen: uitlegregel leesbaar, geen
 *      horizontale scroll (schermafdrukken in .render/);
 *   5  StylePicker zegt "Gekozen bij de look" bij een look uit de URL.
 * Voorrang op de bedankpagina (9) staat in tests/bedankpagina-standen.test.mjs.
 *
 * Statisch tegen dist/ (eerst bouwen), de API's nagebootst:
 *   $S/zwaar.sh npx astro build && $S/zwaar.sh node tests/naloop-a2-browser.test.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { verleggingZin } from '../src/data/business.js';
import { eenProductRegel, euro, ladderRate } from '../src/data/pricing.js';

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

if (!fs.existsSync(path.join(DIST, 'nl/start/plan/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const PORT = 4337;
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

/* ── HULP ────────────────────────────────────────────────────────────────── */
async function open(url, { breed = 1280, land = 'NL', landVertraging = 0, me = null, wacht = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: breed < 600 ? 844 : 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  const landVragen = [];
  await page.route('**/api/land', async (r) => {
    landVragen.push(1);
    if (landVertraging) await new Promise((res) => setTimeout(res, landVertraging));
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ land }) });
  });
  await page.route('**/account/me**', (r) => (me
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(me) })
    : r.fulfill({ status: 401, contentType: 'application/json', body: 'null' })));
  await page.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
  await page.route('**/api/capacity**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, reason: 'ok', windows: [{ start: '2026-10-14', end: '2026-10-15' }], from: '2026-10-12', earlier: false, more: false }),
  }));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
  if (wacht) await page.waitForSelector(wacht, { timeout: 15000 });
  await page.waitForTimeout(300);
  return { page, ctx, fouten, landVragen };
}

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
const geenScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/* ── 1 · DE LADDERREGEL ZONDER KADER ──────────────────────────────────────── */
console.log('\n1 · de ladderregel is net zo rustig als de besparingsregel');
for (const [taal, pad] of [['nl', '/nl/start/catalog/'], ['en', '/start/catalog/']]) {
  for (const breed of [390, 1280]) {
    {
      const tag = `${taal} ${breed}`;
      const { page, ctx, fouten } = await open(pad, { breed, wacht: '#pl-form.is-live' });
      await page.fill('[data-pl-qty-input]', '3');
      await page.waitForTimeout(200);
      const s = await page.evaluate(() => {
        const el = document.querySelector('[data-pl-rung]');
        if (!el || el.hidden) return null;
        const cs = getComputedStyle(el);
        const probe = document.createElement('span');
        probe.style.color = 'var(--ink-2)';
        el.parentElement.appendChild(probe);
        const ink2 = getComputedStyle(probe).color;
        probe.remove();
        return {
          tekst: el.textContent.replace(/\s+/g, ' ').trim(),
          rand: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].every((w) => w === '0px'),
          achtergrond: cs.backgroundColor,
          kleurGewoon: cs.color === ink2,
          vet: [...el.querySelectorAll('b')].map((b) => b.textContent.trim()),
          gewichtTekst: cs.fontWeight,
        };
      });
      ok(`${tag}: bij 3 producten staat de ladderregel er`, !!(s && s.tekst));
      if (!s) { await ctx.close(); continue; }
      ok(`${tag}: geen kader`, s.rand);
      ok(`${tag}: geen eigen achtergrond`, /rgba\(0, 0, 0, 0\)|transparent/.test(s.achtergrond));
      ok(`${tag}: gewone tekstkleur (--ink-2), geen signaalkleur`, s.kleurGewoon);
      ok(`${tag}: alleen de bedragen vet (${s.vet.join(' · ')})`, s.vet.length === 3 && s.vet.every((v) => /^€\s?\d/.test(v)));
      await leesbaarOk(page, '[data-pl-rung]', tag);
      ok(`${tag}: geen horizontale scroll`, await geenScroll(page));
      ok(`${tag}: geen scriptfouten`, fouten, []);
      if (taal === 'nl') {
        await page.locator('[data-pl-rung]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(OUT, `n2-ladderregel-${breed}.png`) });
      }
      await ctx.close();
    }
  }
}

/* ── 2 · HET MERKMODELFORMULIER ───────────────────────────────────────────── */
console.log('\n2 · merkmodel: de verleggingszin in het zakelijk-vinkje, geen apart vinkje');
for (const [taal, pad] of [['nl', '/nl/start/brand-model/'], ['en', '/start/brand-model/']]) {
  const { page, ctx, fouten } = await open(pad, { wacht: 'form[data-bm-form].is-live' });
  ok(`${taal}: geen apart 0%-vinkje meer`, await page.$('[data-bm-vatconfirm], input[type="checkbox"][name="vat_confirmed"]'), null);
  const zet = (velden) => page.evaluate((v) => {
    const f = document.querySelector('form[data-bm-form]');
    for (const [naam, waarde] of Object.entries(v)) {
      const el = f.querySelector(`[name="${naam}"]`);
      if (el.type === 'checkbox') el.checked = !!waarde; else el.value = waarde;
      el.dispatchEvent(new Event(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', { bubbles: true }));
    }
    const zin = f.querySelector('[data-bm-verlegd]');
    return { zin: zin && !zin.hidden ? zin.textContent : null, veld: f.querySelector('[data-bm-verlegd-veld]').value };
  }, velden);
  const de = await zet({ brand: 'Proefmerk GmbH', country: 'DE', vat: 'DE123456789' });
  ok(`${taal}: DE met nummer → de zin staat in het zakelijk-vinkje`, de.zin, verleggingZin(taal, { merk: 'Proefmerk GmbH', btw: 'DE123456789' }));
  ok(`${taal}: DE met nummer → vat_confirmed = yes`, de.veld, 'yes');
  const nlLand = await zet({ country: 'NL', vat: 'NL000099998B57' });
  ok(`${taal}: NL → geen zin, geen verlegging`, [nlLand.zin, nlLand.veld], [null, '']);
  const geen = await zet({ country: 'DE', vat: 'DE123456789', no_vat: true });
  ok(`${taal}: "geen btw-nummer" aangevinkt → geen zin`, [geen.zin, geen.veld], [null, '']);
  ok(`${taal}: geen scriptfouten`, fouten, []);
  await ctx.close();
}

/* ── 3 · HET LAND OP HET ABONNEMENTSFORMULIER ────────────────────────────── */
console.log('\n3 · abonnementsformulier: land voorgevuld via /api/land');
const landNu = (page) => page.evaluate(() => document.querySelector('[data-ps-geg] select[name="country"]')?.value || '');
async function wachtLand(page, want, ms = 3000) {
  const eind = Date.now() + ms;
  let v = await landNu(page);
  while (v !== want && Date.now() < eind) { await page.waitForTimeout(100); v = await landNu(page); }
  return v;
}
for (const breed of [390, 1280]) {
  const { page, ctx, fouten, landVragen } = await open('/nl/start/plan/', { breed, land: 'BE' });
  ok(`${breed}: /api/land is gevraagd`, landVragen.length >= 1);
  ok(`${breed}: het land staat op België (BE)`, await wachtLand(page, 'BE'), 'BE');
  ok(`${breed}: geen scriptfouten`, fouten, []);
  ok(`${breed}: geen horizontale scroll`, await geenScroll(page));
  const sel = page.locator('[data-ps-geg] select[name="country"]');
  if (await sel.isVisible()) {
    await sel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `n2-plan-land-${breed}.png`) });
  }
  await ctx.close();
}
{
  const { page, ctx } = await open('/nl/start/plan/', { land: 'BE', landVertraging: 900 });
  await page.evaluate(() => {
    const s = document.querySelector('[data-ps-geg] select[name="country"]');
    s.value = 'DE';
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1400);
  ok('eigen keuze terwijl het verzoek onderweg is, blijft staan (DE)', await landNu(page), 'DE');
  await ctx.close();
}
{
  const { page, ctx } = await open('/nl/start/plan/', { land: 'BE', me: { email: 'inkoop@proefmerk.test', country: 'FR' } });
  await page.waitForTimeout(800);
  ok('een land uit het account (FR) gaat voor op het ip-land', await landNu(page), 'FR');
  await ctx.close();
}
{
  const { page, ctx } = await open('/nl/start/plan/', { land: null });
  await page.waitForTimeout(800);
  ok('land onbekend: de voorzet NL blijft staan', await landNu(page), 'NL');
  await ctx.close();
}
{
  const { page, ctx, landVragen } = await open('/nl/start/plan/?fout=telefoon', { land: 'BE' });
  await page.waitForTimeout(800);
  ok('terug met ?fout=: niets voorgevuld, geen verzoek', [await landNu(page), landVragen.length], ['NL', 0]);
  await ctx.close();
}

/* ── 4 · DE VIER PAGINA'S MET VANAF-BEDRAGEN ─────────────────────────────── */
console.log('\n4 · vanaf-bedragen: de uitlegregel leesbaar, geen horizontale scroll');
/* De voorpagina is sinds 12 oktober 2026 de hal: daar staat de korte vorm van
   dezelfde regel (afvinklijst 5, akkoord), onder de drie dienstbeelden in
   `.h-onderregel`. Zie ook tests/vanaf-bedragen.test.mjs. */
const KORT_NL = `Eén product: ${euro(ladderRate('catalog', 1), 'nl')} (catalog) of ${euro(ladderRate('lifestyle', 1), 'nl')} (lifestyle). Meer producten, lager tarief.`;
const VIER = [
  ['/nl/', '.h-onderregel', KORT_NL, 'voorpagina'],
  /* Start, catalog en lifestyle staan sinds 12 oktober 2026 (avond) ook in de
     hal: de regel staat op /start in .h-st-regel (StartHal.astro) en op de twee
     dienstpagina's als eerste zin van de prijsband (.h-pr-band-zin). */
  ['/nl/start/', '.h-st-regel', eenProductRegel('nl'), 'start'],
  ['/nl/catalog/', '.h-pr-band-zin', eenProductRegel('nl', ['catalog']), 'catalog'],
  ['/nl/lifestyle/', '.h-pr-band-zin', eenProductRegel('nl', ['lifestyle']), 'lifestyle'],
];
for (const [pad, sel, regel, naam] of VIER) {
  for (const breed of [390, 1280]) {
    {
      const tag = `${naam} ${breed}`;
      const { page, ctx } = await open(pad, { breed });
      const t = await page.evaluate((s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() || '', sel);
      ok(`${tag}: de uitlegregel staat er`, t.includes(regel));
      await leesbaarOk(page, sel, tag);
      ok(`${tag}: geen horizontale scroll`, await geenScroll(page));
      await page.locator(sel).first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUT, `n2-vanaf-${naam}-${breed}.png`) });
      await ctx.close();
    }
  }
}
{
  /* De Classic-kaart op /catalog: "Vanaf €39", niet meer "vanaf €89". */
  const { page, ctx } = await open('/nl/catalog/', { breed: 1280 });
  await page.locator('#looks').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, 'n2-vanaf-catalog-looks-1280.png') });
  await ctx.close();
}

/* ── 5 · STYLEPICKER: "GEKOZEN BIJ DE LOOK" ──────────────────────────────── */
console.log('\n5 · StylePicker zegt "Gekozen bij de look"');
for (const [taal, pad, want] of [
  ['nl', '/nl/start/lifestyle/?style=dunes', 'Gekozen bij de look. Hier veranderen kan met één klik.'],
  ['en', '/start/lifestyle/?style=dunes', 'Picked from the looks. Changing it here is one click.'],
]) {
  for (const breed of [390, 1280]) {
    const { page, ctx } = await open(pad, { breed, wacht: '#pl-form.is-live' });
    const vast = await page.evaluate(() => {
      const v = document.querySelector('[data-look-vast]');
      return v && !v.hidden ? v.querySelector('.look-vast-hint')?.textContent.trim() : null;
    });
    ok(`${taal} ${breed}: de look uit de URL staat vast met de nieuwe zin`, vast, want);
    if (vast) await leesbaarOk(page, '.look-vast-hint', `${taal} ${breed}`);
    if (taal === 'nl') {
      await page.locator('[data-look-vast]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUT, `n2-stylepicker-${breed}.png`) });
    }
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
