/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * 1.04 · HET FORMULIER ONTHOUDT DE KEUZES EN DE FOTO'S, NIET DE GEGEVENS
 * 11 oktober 2026 (F3, V51 = a)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Het gebouwde formulier (dist/) in Chromium, met een nagebootste /api/upload die
 * onthoudt wat er "in R2" staat. Wat dit nagaat:
 *
 *   ·  op het apparaat (localStorage `vis-bestelling`) staan look, aantal,
 *      opties, per product naam/soort/materiaal, en van de foto's alleen de
 *      sleutels — NOOIT naam, e-mail, telefoon of adres, ook niet nadat ze in
 *      stap 3 zijn ingevuld;
 *   ·  bij terugkomst: eerst GET /api/upload?batch=… (alleen eigen uploads), dan
 *      "Je was bezig met een bestelling" met wat er nog staat, en hoeveel foto's
 *      er niet meer zijn;
 *   ·  "Verder gaan" zet alles terug — de foto's in hun vak, de batch in het
 *      formulier — en "Opnieuw beginnen" wist en begint een nieuwe batch;
 *   ·  een concept ouder dan CONCEPT_DAGEN of van een andere pagina komt niet terug;
 *   ·  na een geplaatste bestelling is alles gewist;
 *   ·  zonder opslag (privévenster) werkt het formulier gewoon.
 *
 * En los, zonder browser: de nieuwe GET-route van /api/upload.
 *
 * Zwaar (browser): $S/zwaar.sh node tests/concept-browser.test.mjs — na een build.
 */
import http from 'node:http';
import { metVisIn } from './lib/vis-in.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { CONCEPT_SLEUTEL, CONCEPT_DAGEN } from '../src/data/cookies.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(80)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ══ 0 · DE ROUTE: GET /api/upload?batch=… ═══════════════════════════════════ */
console.log('\n0 · GET /api/upload?batch=… — alleen eigen uploads');
{
  const { onRequestGet } = await import('../functions/api/upload.js');
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const B1 = 'a'.repeat(43);
  const B2 = 'c'.repeat(43);
  const objecten = [
    { key: `intake/${B1}/001-x-voorkant.jpg`, size: 10, customMetadata: { original: 'voorkant.jpg', product: 'p1', shot: 'front' } },
    { key: `intake/${B1}/002-x-achterkant.jpg`, size: 11, customMetadata: { original: 'achterkant.jpg', product: 'p1', shot: 'back' } },
    { key: `intake/${B2}/001-y-ander.jpg`, size: 12, customMetadata: { original: 'ander.jpg', product: 'p1', shot: 'front' } },
  ];
  const env = { DB: d1(db), UPLOADS: { async list({ prefix }) { return { objects: objecten.filter((o) => o.key.startsWith(prefix)) }; } } };
  const vraag = async (qs, ip = '203.0.113.50') => {
    const res = await onRequestGet({ request: new Request(`https://visuails.com/api/upload${qs}`, { headers: { 'cf-connecting-ip': ip } }), env });
    return { status: res.status, body: await res.json() };
  };
  ok('zonder batch: zoals altijd 405', (await vraag('')).status, 405);
  ok('een kenmerk dat geen kenmerk is: 400 bad-batch', [(await vraag('?batch=..%2F..')).status, (await vraag('?batch=kort')).body.error], [400, 'bad-batch']);
  const r = await vraag(`?batch=${B1}`);
  ok('met het eigen kenmerk: de foto\'s van die batch, en alleen die', r.body.files.map((f) => `${f.product}/${f.shot}/${f.name}`), ['p1/front/voorkant.jpg', 'p1/back/achterkant.jpg']);
  ok('  zonder iets anders dan sleutel, naam, grootte, product en vak', Object.keys(r.body.files[0]).sort(), ['bytes', 'key', 'name', 'product', 'shot']);
  let laatste = null;
  for (let i = 0; i < 21; i++) laatste = await vraag(`?batch=${B1}`, '203.0.113.51');
  ok('een eigen snelheidsgrens (20 per minuut per adres)', [laatste.status, laatste.body.error], [429, 'rate']);
  ok('zonder opslag: 503', (await onRequestGet({ request: new Request(`https://visuails.com/api/upload?batch=${B1}`), env: { DB: d1(db) } })).status, 503);
}

/* ══ 0b · HET COOKIEBELEID ═══════════════════════════════════════════════════ */
console.log('\n0b · het cookiebeleid noemt de notitie, in beide talen');
for (const [p, taal] of [['src/pages/nl/cookie-policy.astro', 'nl'], ['src/pages/cookie-policy.astro', 'en']]) {
  const s = lees(p);
  const blok = s.slice(s.indexOf(taal === 'nl' ? 'In je browser bewaard, niet als cookie' : 'Stored in your browser, not as a cookie'));
  ok(`${taal}: onder "in je browser bewaard" staat ${CONCEPT_SLEUTEL}`, /\{CONCEPT_SLEUTEL\}/.test(blok.slice(0, 2500)), true);
  ok(`${taal}: met de termijn uit cookies.js`, /cookieDuur\(CONCEPT_DAGEN/.test(blok.slice(0, 2500)), true);
  ok(`${taal}: en dat naam, e-mail, telefoon en adres er niet in staan`, taal === 'nl' ? /naam, e-mailadres, telefoon en adres staan daar niet in/.test(blok) : /name, email address, phone and address are not in it/.test(blok), true);
}
ok('de termijn sluit aan op de nachtelijke opruiming (korter dan INTAKE_TTL_DAYS)', CONCEPT_DAGEN < Number((/const INTAKE_TTL_DAYS = (\d+);/.exec(lees('cron/index.js')) || [])[1]), true);

if (!fs.existsSync(path.join(DIST, 'nl/start/catalog/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const PORT = 4372;
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

const beeld = async (naam, kleur) => ({ name: naam, mimeType: 'image/jpeg', buffer: await sharp({ create: { width: 1200, height: 1500, channels: 3, background: kleur } }).jpeg().toBuffer() });
const vier = await Promise.all(['IMG_1.jpg', 'IMG_2.jpg', 'IMG_3.jpg', 'IMG_4.jpg'].map((n, i) => beeld(n, ['#c66', '#6c6', '#66c', '#cc6'][i])));

/* "R2" voor de hele toets: wat er gePOST is, staat erin tot het gedeletet wordt. */
const R2 = new Map();
const B = 'k'.repeat(43);
let nr = 0;
async function nieuweContext({ opslagStuk = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (opslagStuk) {
    await ctx.addInitScript(() => {
      const stuk = () => { throw new Error('opslag geblokkeerd'); };
      Object.defineProperty(window, 'localStorage', { get: stuk, configurable: true });
    });
  }
  return ctx;
}
async function open(ctx, url = '/nl/start/catalog') {
  const page = await ctx.newPage();
  const fouten = [];
  const lijstVragen = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (/\[pipeline\]/.test(m.text())) fouten.push(m.text().slice(0, 200)); });
  await page.route('**/api/upload**', async (r) => {
    const req = r.request();
    const u = new URL(req.url());
    if (req.method() === 'GET') {
      lijstVragen.push(u.searchParams.get('batch'));
      const b = u.searchParams.get('batch') || '';
      const files = [...R2.values()].filter((o) => o.key.startsWith(`intake/${b}/`)).map(({ key, name, bytes, product, shot }) => ({ key, name, bytes, product, shot }));
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, batch: b, files }) });
    }
    if (req.method() === 'DELETE') { R2.delete(u.searchParams.get('key')); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    const t = (req.postDataBuffer() || Buffer.from('')).toString('latin1');
    const veld = (naam) => (new RegExp(`name="${naam}"\\r\\n\\r\\n([^\\r]*)`).exec(t) || [])[1] || '';
    const bestand = (/filename="([^"]+)"/.exec(t) || [])[1] || '';
    nr += 1;
    const key = `intake/${B}/${String(nr).padStart(3, '0')}-${bestand}`;
    R2.set(key, { key, name: bestand, bytes: 9, product: veld('product'), shot: veld('shot') });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, batch: B, file: { key, name: bestand, bytes: 9, product: veld('product'), shot: veld('shot') } }) });
  });
  await page.route('**/api/land', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"NL"}' }));
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
  await page.route('**/api/order', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ref: 'VIS-PROEF1', redirect: '/nl/thank-you/?ref=VIS-PROEF1' }) }));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
  await page.waitForTimeout(400);
  return { page, fouten, lijstVragen };
}
const huidigeStap = (page) => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));
const concept = (page) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return 'stuk'; } }, CONCEPT_SLEUTEL);
const allesVerstuurd = async (page) => { for (let i = 0; i < 40; i++) { if (!(await page.evaluate(() => [...document.querySelectorAll('.pu-slot')].some((s) => s.dataset.state === 'sending')))) return; await page.waitForTimeout(150); } };

/* ══ 1 · BEWAREN ═════════════════════════════════════════════════════════════ */
console.log('\n1 · wat er op het apparaat komt te staan');
const ctx = await nieuweContext();
{
  const { page, fouten } = await open(ctx);
  ok('een leeg formulier bewaart niets', await concept(page), null);
  await page.fill('[data-pl-qty-input]', '3');
  await page.evaluate(() => { const m = document.querySelector('input[name="model"][value="ava"]') || document.querySelectorAll('input[name="model"]')[1]; m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(300);
  await page.locator('.pu-card').nth(0).locator('.pu-kies-input').setInputFiles(vier);
  await allesVerstuurd(page);
  await page.locator('.pu-card').nth(0).locator('.pu-name').fill('Hoodie zwart');
  await page.locator('.pu-card').nth(0).locator('.pu-soort-sel').selectOption('top');
  /* Levering 59: één product tegelijk in beeld; naar product 2 met de knop bovenaan. */
  await page.locator('[data-pl-rail-knop]').nth(1).click();
  await page.waitForTimeout(150);
  await page.locator('.pu-card').nth(1).locator('.pu-meer-knop').click();
  await page.locator('.pu-card').nth(1).locator('input[name="material_p2"]').fill('katoen');
  await page.waitForTimeout(800);
  const c1 = await concept(page);
  const velden = Object.fromEntries((c1 && c1.velden || []).map((v) => [v[0], v[1]]));
  ok('het concept staat er', !!c1 && c1.v === 1, true);
  ok('  met het aantal, de naam, de soort en het materiaal', [velden.products, velden.product_p1, velden.garment_p1, velden.material_p2], ['3', 'Hoodie zwart', 'top', 'katoen']);
  ok('  en het gezicht uit stap 1', !!velden.model, true);
  ok('  en van de foto\'s alleen de sleutels en het vak', (c1.fotos || []).map((f) => `${f.p}/${f.s}`), ['p1/front', 'p1/back', 'p1/detail', 'p1/worn']);
  ok('  met het batchkenmerk', c1.batch, B);
  /* Stap 3 invullen: dat mag er NOOIT in komen. */
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(300);
  if (await page.$('[data-pl-missing]:not([hidden]) [data-pl-missing-go]')) { await page.click('[data-pl-missing-go]'); await page.waitForTimeout(300); }
  ok('stap 3 bereikt', await huidigeStap(page), 3);
  for (const [naam, waarde] of [['first_name', 'Testa'], ['last_name', 'Proef'], ['brand', 'Proefmerk BV'], ['email', 'inkoop@proefmerk.test'], ['phone', '+31 6 00000000'], ['address_line1', 'Verzonnenstraat 1'], ['postal_code', '1234 AB'], ['city', 'Nergenshuizen']]) {
    if (await page.$(`[name="${naam}"]:visible`)) await page.fill(`[name="${naam}"]`, waarde);
  }
  await page.waitForTimeout(800);
  const ruw = await page.evaluate((k) => localStorage.getItem(k) || '', CONCEPT_SLEUTEL);
  ok('naam, e-mail, telefoon en adres staan er NIET in', /Testa|Proef(?!merk)|proefmerk\.test|\+31|Verzonnen|1234 AB|Nergenshuizen|first_name|email|phone|address/.test(ruw), false);
  ok('geen fouten', fouten, []);
  await page.close();
}

/* ══ 2 · TERUGKOMEN, MET ÉÉN FOTO DIE ER NIET MEER IS ════════════════════════ */
console.log('\n2 · terugkomen: "Je was bezig met een bestelling"');
{
  /* Eén foto is intussen weg (zoals na de nachtelijke opruiming van één object). */
  const weg = [...R2.keys()].find((k) => R2.get(k).shot === 'worn');
  R2.delete(weg);
  const { page, fouten, lijstVragen } = await open(ctx);
  await page.waitForSelector('[data-pl-concept]:not([hidden])', { timeout: 5000 }).catch(() => {});
  ok('het formulier vraagt eerst welke foto\'s er van die batch nog staan', lijstVragen, [B]);
  ok('het blok staat er', await page.isVisible('[data-pl-concept]'), true);
  ok('  met wat er was', (await page.textContent('[data-pl-concept-wat]')).trim(), 'Catalogsets · 3 producten · 3 foto’s');
  ok('  en wat er niet meer is', (await page.textContent('[data-pl-concept-weg]')).trim(), 'Eén foto is niet meer bij ons; zet die opnieuw neer.');
  ok('  met "Verder gaan" en "Opnieuw beginnen"', [await page.textContent('[data-pl-concept-verder]'), await page.textContent('[data-pl-concept-opnieuw]')].map((t) => t.trim()), ['Verder gaan', 'Opnieuw beginnen']);
  /* Leesbaar: contrast en lettergrootte van wat er in het blok staat. */
  const maat = await page.evaluate(() => [...document.querySelectorAll('[data-pl-concept] p:not([hidden]), [data-pl-concept] h2')].map((el) => {
    const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    let bg = [255, 255, 255];
    for (let n = el; n; n = n.parentElement) { const b = rgb(getComputedStyle(n).backgroundColor); if (b.length && (b.length < 4 || b[3] > 0.99)) { bg = b.slice(0, 3); break; } }
    const fg = rgb(getComputedStyle(el).color).slice(0, 3);
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const [a, b] = [lum(fg), lum(bg)];
    return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), px: parseFloat(getComputedStyle(el).fontSize) };
  }));
  ok('  het blok is leesbaar (contrast ≥ 4,5, tekst ≥ 11,5 px)', maat.length > 0 && maat.every((m) => m.ratio >= 4.5 && m.px >= 11.5), true);
  fs.mkdirSync(path.join(ROOT, '.render'), { recursive: true });
  await page.locator('[data-pl-concept]').screenshot({ path: path.join(ROOT, '.render', 'f3-concept-blok.png') });
  await page.click('[data-pl-concept-verder]');
  await page.waitForTimeout(500);
  ok('Verder gaan: terug in stap 2', await huidigeStap(page), 2);
  ok('  met drie kaarten', await page.locator('.pu-card').count(), 3);
  const vak = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pu-card')[0].querySelectorAll('.pu-slots .pu-slot')].map((s) => [s.dataset.puSlot, s.dataset.state])));
  ok('  de foto\'s die er nog staan in hun vak, de weggevallen leeg', vak, { front: 'filled', back: 'filled', detail: 'filled', worn: 'empty' });
  ok('  de naam, de soort en het materiaal terug', await page.evaluate(() => [document.querySelector('[name="product_p1"]').value, document.querySelector('[name="garment_p1"]').value, document.querySelector('[name="material_p2"]').value]), ['Hoodie zwart', 'top', 'katoen']);
  ok('  en de soort is overgenomen door de producten erna', await page.evaluate(() => document.querySelector('[name="garment_p3"]').value), 'top');
  ok('  het batchkenmerk staat weer in het formulier', await page.inputValue('input[name="upload_batch"]'), B);
  ok('  stap 3 is leeg (de gegevens zijn niet bewaard)', await page.evaluate(() => [...document.querySelectorAll('[data-pl-step="3"] input[type="text"], [data-pl-step="3"] input[type="email"], [data-pl-step="3"] input[type="tel"]')].every((i) => !i.value)), true);
  /* Een herstelde foto weghalen haalt hem ook bij ons weg. */
  const voor = R2.size;
  await page.locator('.pu-card').nth(0).locator('[data-pu-slot="detail"] .pu-act', { hasText: 'Verwijderen' }).click();
  await page.waitForTimeout(400);
  ok('  een herstelde foto verwijderen haalt hem ook uit de opslag', R2.size, voor - 1);
  ok('geen fouten', fouten, []);
  await page.close();
}

/* ══ 3 · OPNIEUW BEGINNEN ════════════════════════════════════════════════════ */
console.log('\n3 · opnieuw beginnen');
{
  const { page, fouten } = await open(ctx);
  await page.waitForSelector('[data-pl-concept]:not([hidden])', { timeout: 5000 }).catch(() => {});
  ok('het blok staat er weer', await page.isVisible('[data-pl-concept]'), true);
  await page.click('[data-pl-concept-opnieuw]');
  await page.waitForTimeout(700);
  ok('Opnieuw beginnen wist het concept', await concept(page), null);
  /* Levering 59 (afvinklijst 36, b-werkplaats): een leeg formulier staat op 1 product, met
     meteen een prijs. Het is de standaard en geen keuze (data-wk-standaard). */
  ok('  het formulier staat leeg op stap 1 (op de standaard van 1 product)', [await huidigeStap(page), await page.inputValue('[data-pl-qty-input]'), await page.evaluate(() => document.querySelector('select[name="products"]').dataset.wkStandaard)], [1, '1', '1']);
  ok('  zonder batch: de eerste nieuwe foto begint een nieuwe', await page.inputValue('input[name="upload_batch"]'), '');
  ok('geen fouten', fouten, []);
  await page.close();
}

/* ══ 4 · TE OUD, OF VAN EEN ANDERE PAGINA ════════════════════════════════════ */
console.log('\n4 · te oud, of van een andere pagina');
{
  const { page } = await open(ctx);
  await page.evaluate(({ k, dagen }) => localStorage.setItem(k, JSON.stringify({ v: 1, t: Date.now() - (dagen + 1) * 864e5, pad: location.pathname, stap: 1, velden: [['products', '2']], fotos: [], batch: '' })), { k: CONCEPT_SLEUTEL, dagen: CONCEPT_DAGEN });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live');
  await page.waitForTimeout(400);
  ok(`ouder dan ${CONCEPT_DAGEN} dagen: geen blok`, await page.isVisible('[data-pl-concept]'), false);
  ok('  en het concept is gewist', await concept(page), null);
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, t: Date.now(), pad: '/nl/start/lifestyle/', stap: 1, velden: [['products', '2']], fotos: [], batch: '' })), CONCEPT_SLEUTEL);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live');
  await page.waitForTimeout(400);
  ok('van een andere bestelpagina: geen blok', await page.isVisible('[data-pl-concept]'), false);
  ok('  maar het blijft staan voor die pagina', (await concept(page) || {}).pad, '/nl/start/lifestyle/');
  await page.evaluate((k) => localStorage.removeItem(k), CONCEPT_SLEUTEL);
  await page.close();
}

/* ══ 5 · NA EEN GEPLAATSTE BESTELLING IS ALLES GEWIST ═══════════════════════ */
console.log('\n5 · na de bestelling is alles gewist');
{
  const { page, fouten } = await open(ctx);
  await page.fill('[data-pl-qty-input]', '1');
  await page.evaluate(() => { const m = document.querySelector('input[name="model"]'); m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(300);
  await page.locator('.pu-card').nth(0).locator('.pu-kies-input').setInputFiles(vier.slice(0, 3));
  await allesVerstuurd(page);
  await page.waitForTimeout(800);
  ok('er staat een concept', !!(await concept(page)), true);
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(300);
  for (const [naam, waarde] of [['first_name', 'Testa'], ['last_name', 'Proef'], ['brand', 'Proefmerk BV'], ['email', 'inkoop@proefmerk.test'], ['phone', '+31 6 00000000'], ['address_line1', 'Verzonnenstraat 1'], ['postal_code', '1234 AB'], ['city', 'Nergenshuizen'], ['reg_number', '12345678']]) {
    if (await page.$(`[name="${naam}"]:visible`)) await page.fill(`[name="${naam}"]`, waarde);
  }
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(500);
  ok('stap 5 bereikt', await huidigeStap(page), 5);
  const box = await page.$('input[name="business_declaration"]');
  if (box && !(await box.isChecked())) await box.check();
  await Promise.all([page.waitForURL(/thank-you/, { timeout: 8000 }).catch(() => {}), page.click('[data-pl-submit]')]);
  await page.waitForTimeout(300);
  ok('na de bestelling: het concept is weg', await concept(page), null);
  ok('geen fouten', fouten, []);
  await page.close();
}
await ctx.close();

/* ══ 6 · ZONDER OPSLAG ═══════════════════════════════════════════════════════ */
console.log('\n6 · zonder opslag (privévenster, geblokkeerd)');
{
  const ctx2 = await nieuweContext({ opslagStuk: true });
  const { page, fouten } = await open(ctx2);
  await page.fill('[data-pl-qty-input]', '2');
  await page.evaluate(() => { const m = document.querySelector('input[name="model"]'); m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(300);
  ok('het formulier werkt gewoon', await huidigeStap(page), 2);
  await page.waitForTimeout(800);
  ok('  zonder fouten', fouten, []);
  await page.close();
  await ctx2.close();
}

await browser.close();
await new Promise((r) => setTimeout(r, 300));
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
