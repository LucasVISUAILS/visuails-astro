/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * STAP 2 ALS ÉÉN KAART PER PRODUCT, IN EEN ECHTE BROWSER — 11 oktober 2026 (F3)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas vond het bestelformulier "moeizaam en chaotisch". Gemeten met vijf
 * catalogproducten vóór de ombouw: vijftien keer een fotokiezer (elk vak één
 * foto), vijf keer "Sla deze over" bij de draagfoto, het gezicht zes keer op het
 * scherm (één keer voor de bestelling en één rij per product) en ±1.000 woorden
 * in stap 2. Hij koos (afvinklijst 2, form = a): één kaart per product.
 *
 * Deze toets loopt het gebouwde formulier (dist/) door in Chromium, zoals een
 * klant: 390 en 1280 px, NL en EN, met 1, 5 en 20 producten, en gaat na:
 *
 *   ·  het gezicht staat in stap 1 en niet meer open in stap 2;
 *   ·  per product één knop voor de foto's — 3 of 4 tegelijk vallen vanzelf in
 *      voorkant / achterkant / detail / gedragen, ook op naam ("achterkant.jpg");
 *      meer dan vier gaan naar de gratis referentievakken;
 *   ·  omwisselen met één keuze per vak, en dat stuurt de twee foto's opnieuw
 *      met het juiste `shot` (de server verandert niet);
 *   ·  de draagfoto overslaan zonder klik, met de aanname bij het vak;
 *   ·  de soort staat op de kaart en neemt die van het vorige product over;
 *   ·  geen tippaneel, geen "Wat je opstuurt", geen "Volgend product";
 *   ·  een te kleine foto wordt geweigerd zoals altijd; de daggrens ook;
 *   ·  lege verplichte vakken: één lijst uit src/lib/ontbreekt.js, en "later in
 *      VISUAILS Studio" gaat door naar stap 3;
 *   ·  stap 3: "Telefoon of WhatsApp";
 *   ·  de €1-proef, een abonnee en een merkmodel;
 *   ·  contrast ≥ 4,5:1 en tekst ≥ 11,5 px, geen horizontale scroll, en de
 *      wisselkeuze en de balk werken met het toetsenbord.
 *
 * Alle API's worden in de browser nagebootst; er wordt niets verstuurd.
 *
 * Zwaar (browser): $S/zwaar.sh node tests/stap2-kaart-browser.test.mjs — na een build.
 */
import http from 'node:http';
import { metVisIn } from './lib/vis-in.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { vakRegel, SHOTS } from '../src/data/shots.js';
import { VOORKEUR_COPY } from '../src/data/contactvoorkeur.js';

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
/* Een vrije poort, gekozen bij het starten (14 oktober 2026). Hier stond een vaste
   poort die drie toetsen deelden; UITROLLEN.bat draait vier toetsen tegelijk, en
   dan viel de tweede om op een bezette poort. */
let PORT = 0;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, () => { PORT = server.address().port; r(); }));
const browser = metVisIn(await chromium.launch({ executablePath: process.env.CHROME || browserPad() }));

/* Echte beelden, zodat de beeldkeuring meet: 1200 × 1500 is groot genoeg, 400 × 400 te klein. */
const beeld = async (naam, kleur, w = 1200, h = 1500) => ({
  name: naam,
  mimeType: 'image/jpeg',
  buffer: await sharp({ create: { width: w, height: h, channels: 3, background: kleur } }).jpeg({ quality: 85 }).toBuffer(),
});
const KLEUREN = ['#c86464', '#64c864', '#6464c8', '#c8c864', '#c864c8', '#64c8c8'];
const vier = await Promise.all(['IMG_0001.jpg', 'IMG_0002.jpg', 'IMG_0003.jpg', 'IMG_0004.jpg'].map((n, i) => beeld(n, KLEUREN[i])));
const zes = await Promise.all(['a.jpg', 'b2.jpg', 'c3.jpg', 'd4.jpg', 'e5.jpg', 'f6.jpg'].map((n, i) => beeld(`foto-${n}`, KLEUREN[i])));
const opNaam = [await beeld('hoodie-achterkant.jpg', '#888888'), await beeld('hoodie-voorkant.jpg', '#999999'), await beeld('hoodie-detail.jpg', '#777777')];
const klein = { name: 'screenshot.png', mimeType: 'image/png', buffer: await sharp({ create: { width: 400, height: 400, channels: 3, background: '#aaaaaa' } }).png().toBuffer() };

/* ── HULP ────────────────────────────────────────────────────────────────── */
async function open(url, { breed = 1280, me = null, daggrens = false, donker = false } = {}) {
  const page = await browser.newPage({ viewport: { width: breed, height: breed < 600 ? 844 : 900 }, colorScheme: donker ? 'dark' : 'light' });
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (/\[pipeline\]/.test(m.text())) fouten.push(m.text().slice(0, 200)); });
  const uploads = { posts: [], dels: [] };
  let n = 0;
  await page.route('**/api/upload**', async (r) => {
    const req = r.request();
    if (req.method() === 'DELETE') { uploads.dels.push(new URL(req.url()).searchParams.get('key')); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    if (req.method() !== 'POST') return r.fulfill({ status: 405, contentType: 'application/json', body: '{"ok":false}' });
    if (daggrens) return r.fulfill({ status: 429, contentType: 'application/json', body: '{"ok":false,"error":"dag-limiet","retryAfter":3600}' });
    const t = (req.postDataBuffer() || Buffer.from('')).toString('latin1');
    const veld = (naam) => (new RegExp(`name="${naam}"\\r\\n\\r\\n([^\\r]*)`).exec(t) || [])[1] || '';
    const bestand = (/filename="([^"]+)"/.exec(t) || [])[1] || '';
    /* De te kleine foto komt traag terug, zoals een echte upload: dan landt de
       meting eerst, en dat is de volgorde waarin het live misging (14 okt 2026). */
    if (bestand === 'screenshot.png') await new Promise((w) => setTimeout(w, 800));
    n += 1;
    const b = 'b'.repeat(43);
    uploads.posts.push({ product: veld('product'), shot: veld('shot'), bestand });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, batch: b, file: { key: `intake/${b}/${String(n).padStart(3, '0')}-${bestand}`, name: bestand, bytes: 9, product: veld('product'), shot: veld('shot') } }) });
  });
  await page.route('**/api/land', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"NL"}' }));
  await page.route('**/account/me**', (r) => (me
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(me) })
    : r.fulfill({ status: 401, contentType: 'application/json', body: 'null' })));
  await page.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
  await page.route('**/api/capacity**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, reason: 'ok', windows: [{ start: '2026-10-20', end: '2026-10-21' }], from: '2026-10-19', earlier: false, more: false }),
  }));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
  await page.waitForTimeout(300);
  return { page, fouten, uploads };
}

const huidigeStap = (page) => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));
const zetAantal = async (page, n) => { if (await page.$('[data-pl-qty-input]')) { await page.fill('[data-pl-qty-input]', String(n)); await page.waitForTimeout(150); } };
const kiesInStap1 = (page) => page.evaluate(() => {
  const kies = (naam) => {
    const r = document.querySelector(`.pl-step.is-current input[name="${naam}"]`);
    if (r && !document.querySelector(`input[name="${naam}"]:checked`)) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  kies('style'); kies('model');
});
async function naarStap2(page, n) {
  await zetAantal(page, n);
  await kiesInStap1(page);
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(300);
  return huidigeStap(page);
}
const kaart = (page, i) => page.locator('.pu-card').nth(i);
const vakken = (page, i) => page.evaluate((k) => Object.fromEntries([...document.querySelectorAll('.pu-card')[k].querySelectorAll('.pu-slots .pu-slot')]
  .map((s) => [s.dataset.puSlot, `${s.dataset.state}:${(s.querySelector('.pu-slot-btn').getAttribute('aria-label') || '').split(' — ')[1]?.split(' · ')[0] || ''}`])), i);
const wachtTot = async (page, fn, arg, ms = 6000) => {
  for (let t = 0; t < ms; t += 150) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(150); }
  return false;
};
const allesVerstuurd = (page) => wachtTot(page, () => ![...document.querySelectorAll('.pu-slot')].some((s) => s.dataset.state === 'sending'));

/* Zichtbare woorden in de huidige stap, zonder de opties van keuzelijsten. */
const woorden = (page) => page.evaluate(() => {
  const s = document.querySelector('.pl-step.is-current');
  let n = 0;
  const tw = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
  for (let t = tw.nextNode(); t; t = tw.nextNode()) {
    const p = t.parentElement;
    if (!p || p.closest('select, option, template, script, style, noscript')) continue;
    /* Wat in een dichte <details> staat, leest niemand (de samenvatting wel). */
    const dt = p.closest('details');
    if (dt && !dt.open && !p.closest('summary')) continue;
    if (!p.getClientRects().length) continue;
    const r = p.getBoundingClientRect();
    if (r.width <= 1 && r.height <= 1) continue;
    n += (t.textContent.match(/\S+/g) || []).length;
  }
  return n;
});

/* Contrast en lettergrootte van elk zichtbaar element dat de selector vindt. */
const leesbaar = (page, sel) => page.evaluate((s) => {
  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  let slechtst = null;
  for (const el of document.querySelectorAll(s)) {
    if (el.hidden || !el.getClientRects().length || !el.textContent.trim()) continue;
    let bg = [255, 255, 255, 1];
    for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { bg = b; break; } }
    const fg = rgba(getComputedStyle(el).color);
    const mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [lum(mix), lum(bg.slice(0, 3))];
    const ratio = Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (!slechtst || ratio < slechtst.ratio || px < slechtst.px) slechtst = { ratio: Math.min(ratio, slechtst ? slechtst.ratio : 99), px: Math.min(px, slechtst ? slechtst.px : 99) };
  }
  return slechtst;
}, sel);
async function leesbaarOk(page, sel, label) {
  const l = await leesbaar(page, sel);
  if (!l) { ok(`${label}: ${sel} is te zien`, false); return; }
  ok(`${label}: ${sel} contrast ≥ 4,5 (${l.ratio}) en tekst ≥ 11,5 px (${l.px})`, l.ratio >= 4.5 && l.px >= 11.5);
}
const geenScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const telling = [];

/* ══ 1 · DE VORM VAN STAP 2, IN TWEE BREEDTES, TWEE TALEN EN DRIE AANTALLEN ══ */
console.log('\n1 · de vorm van stap 2');
for (const [url, taal] of [['/nl/start/catalog', 'nl'], ['/start/catalog', 'en']]) {
  for (const breed of [390, 1280]) {
    for (const n of [1, 5, 20]) {
      const tag = `${taal} ${breed}px ${n}×`;
      const { page, fouten } = await open(url, { breed });
      await zetAantal(page, n);
      ok(`${tag}: het gezicht staat in stap 1`, await page.evaluate(() => !!document.querySelector('[data-pl-step="1"] input[name="model"]')), true);
      if (n === 5 && breed === 1280) {
        /* Op catalog is de keuze verplicht: zonder gezicht blijft stap 1 staan. */
        await page.evaluate(() => { const s = document.querySelector('input[name="style"]'); if (s && !document.querySelector('input[name="style"]:checked')) { s.checked = true; s.dispatchEvent(new Event('change', { bubbles: true })); } });
        await page.click('.pl-step.is-current [data-pl-next]');
        await page.waitForTimeout(250);
        ok(`${tag}: zonder gezicht blijft stap 1 staan`, await huidigeStap(page), 1);
      }
      ok(`${tag}: naar stap 2`, await naarStap2(page, n), 2);
      const vorm = await page.evaluate(() => {
        const s = document.querySelector('.pl-step.is-current');
        const zicht = (el) => !!el && !el.hidden && el.getClientRects().length > 0;
        return {
          kaarten: [...s.querySelectorAll('.pu-card')].filter(zicht).length,
          knoppen: [...s.querySelectorAll('.pu-kies-knop')].filter(zicht).length,
          gezichten: [...s.querySelectorAll('[role="radiogroup"]')].filter((g) => zicht(g) && g.querySelector('input[name^="model"]')).length,
          tips: !!s.querySelector('[data-pu-tips]'),
          wjo: !!s.querySelector('[data-pl-styling]'),
          volgende: !!s.querySelector('[data-pl-volgende]'),
          overslaan: [...s.querySelectorAll('button')].filter((b) => zicht(b) && /Sla deze over|Skip this one/.test(b.textContent)).length,
          balk: zicht(s.querySelector('[data-pl-rij]')),
          telling: (s.querySelector('[data-pl-progress]') || {}).textContent || '',
        };
      });
      ok(`${tag}: ${n} kaarten, allemaal open`, vorm.kaarten, n);
      ok(`${tag}: één knop voor de foto's per product`, vorm.knoppen, n);
      ok(`${tag}: geen gezicht open in stap 2`, vorm.gezichten, 0);
      ok(`${tag}: geen tippaneel, geen "Wat je opstuurt", geen "Volgend product"`, [vorm.tips, vorm.wjo, vorm.volgende], [false, false, false]);
      ok(`${tag}: geen "Sla deze over"`, vorm.overslaan, 0);
      ok(`${tag}: de balk staat er alleen bij meer dan één product`, vorm.balk, n > 1);
      ok(`${tag}: de telling staat bovenaan`, new RegExp(taal === 'nl' ? `0 van ${n} product` : `0 of ${n} product`).test(vorm.telling), true);
      ok(`${tag}: geen horizontale scroll`, await geenScroll(page), true);
      const w = await woorden(page);
      telling.push({ tag, woorden: w });
      if (n === 5) ok(`${tag}: stap 2 houdt het onder de 500 woorden (${w})`, w < 500, true);
      if (n === 5) {
        for (const sel of ['.pu-progress', '.pu-stap-lead', '.pu-kies-hint', '.pu-card.is-uitleg .pu-slot-regel', '.pu-slot-name', '.pu-slot-eis', '.pu-state', '.pu-meer-vat', '.pu-meer-t']) {
          await leesbaarOk(page, sel, tag);
        }
        await page.screenshot({ path: path.join(OUT, `f3-stap2-${taal}-${breed}.png`), fullPage: true });
      }
      ok(`${tag}: geen fouten op de pagina`, fouten, []);
      await page.close();
    }
  }
}

/* ══ 2 · DE FOTO'S: TEGELIJK, OP NAAM, TE VEEL, TE KLEIN, EN WISSELEN ══════ */
console.log('\n2 · de foto\'s van een product');
for (const breed of [1280, 390]) {
  const tag = `nl ${breed}px`;
  const { page, fouten, uploads } = await open('/nl/start/catalog', { breed });
  await naarStap2(page, 5);

  /* Product 1: vier tegelijk, namen zonder betekenis → de volgorde van kiezen. */
  await kaart(page, 0).locator('.pu-kies-input').setInputFiles(vier);
  await allesVerstuurd(page);
  const v1 = await vakken(page, 0);
  ok(`${tag}: vier tegelijk vallen in voorkant, achterkant, detail, gedragen`,
    [v1.front, v1.back, v1.detail, v1.worn], ['filled:IMG_0001.jpg', 'filled:IMG_0002.jpg', 'filled:IMG_0003.jpg', 'filled:IMG_0004.jpg']);
  ok(`${tag}: elke foto ging apart naar /api/upload met product en vak`,
    uploads.posts.slice(0, 4).map((p) => `${p.product}/${p.shot}`), ['p1/front', 'p1/back', 'p1/detail', 'p1/worn']);
  ok(`${tag}: product 1 is klaar`, await kaart(page, 0).evaluate((el) => el.classList.contains('is-ready')), true);
  ok(`${tag}: de knop wordt daarna rustig ("Foto’s bijzetten")`, (await kaart(page, 0).locator('.pu-kies-knop').textContent()).trim(), 'Foto’s bijzetten');

  /* De regel en de aanname op de eerste kaart; de tip bij het detail. */
  const regels = await kaart(page, 0).locator('.pu-slot-regel').allTextContents();
  ok(`${tag}: bij de draagfoto staat de aanname`, regels.some((r) => r.includes('Zonder draagfoto gaan we uit van een normale, rechte pasvorm.')), true);
  ok(`${tag}: bij het detail staat de tip met het witte vel`, regels.some((r) => /wit vel printpapier half in beeld/.test(r)), true);
  ok(`${tag}: de regel is die uit shots.js`, regels[0], vakRegel('front', 'nl'));
  ok(`${tag}: op kaart twee staan geen regels`, await kaart(page, 1).locator('.pu-slot-regel').count(), 0);

  /* Wisselen: voorkant ↔ achterkant, met het toetsenbord. */
  const wissel = kaart(page, 0).locator('[data-pu-slot="front"] .pu-wissel');
  await wissel.focus();
  ok(`${tag}: de wisselkeuze krijgt de focus`, await page.evaluate(() => document.activeElement?.classList.contains('pu-wissel')), true);
  const voorWissel = uploads.posts.length;
  await wissel.selectOption('back');
  await allesVerstuurd(page);
  const v1b = await vakken(page, 0);
  ok(`${tag}: na wisselen staan voor- en achterkant omgedraaid`, [v1b.front, v1b.back], ['filled:IMG_0002.jpg', 'filled:IMG_0001.jpg']);
  ok(`${tag}: de twee oude objecten zijn weggehaald`, uploads.dels.length >= 2, true);
  ok(`${tag}: en opnieuw verstuurd met het nieuwe vak`, uploads.posts.slice(voorWissel).map((p) => `${p.shot}:${p.bestand}`).sort(), ['back:IMG_0001.jpg', 'front:IMG_0002.jpg']);

  /* Product 2: drie tegelijk → zonder draagfoto, toch klaar, zonder klik. */
  await kaart(page, 1).locator('.pu-kies-input').setInputFiles(vier.slice(0, 3));
  await allesVerstuurd(page);
  const v2 = await vakken(page, 1);
  ok(`${tag}: drie tegelijk: de draagfoto blijft leeg`, v2.worn.startsWith('empty'), true);
  ok(`${tag}: en het product is toch klaar, zonder klik`, await kaart(page, 1).evaluate((el) => el.classList.contains('is-ready')), true);

  /* Product 3: op naam — "achterkant" eerst gekozen, toch in het achterkantvak. */
  await kaart(page, 2).locator('.pu-kies-input').setInputFiles(opNaam);
  await allesVerstuurd(page);
  const v3 = await vakken(page, 2);
  ok(`${tag}: een naam die het vak noemt, gaat naar dat vak`, [v3.front, v3.back, v3.detail], ['filled:hoodie-voorkant.jpg', 'filled:hoodie-achterkant.jpg', 'filled:hoodie-detail.jpg']);

  /* Product 4: zes tegelijk → vier vakken plus twee referentievakken, lade open. */
  await kaart(page, 3).locator('.pu-kies-input').setInputFiles(zes);
  await allesVerstuurd(page);
  const refs = await kaart(page, 3).evaluate((el) => [...el.querySelectorAll('.pu-refs .pu-slot')].map((s) => s.dataset.state));
  ok(`${tag}: zes tegelijk: twee in de gratis referentievakken`, refs, ['filled', 'filled']);
  ok(`${tag}: en de lade staat dan open`, await kaart(page, 3).locator('.pu-meer-in').isVisible(), true);

  /* Product 5: een te kleine foto wordt geweigerd, zoals altijd. */
  await kaart(page, 4).locator('[data-pu-slot="front"] .pu-slot-input').setInputFiles(klein);
  await wachtTot(page, () => document.querySelectorAll('.pu-card')[4].querySelector('[data-pu-slot="front"]').dataset.state === 'failed');
  /* En dat BLIJFT hij (14 oktober 2026). Landde de meting vóór het antwoord op
     de upload, dan zette dat antwoord het vak terug op "Verstuurd" en ging de
     foto alsnog mee (zie verstuurSlot in pipeline.js). De upload hierboven komt
     daarom pas na 800 ms terug; hier wachten tot hij binnen is. */
  await page.waitForTimeout(1200);
  ok(`${tag}: een te kleine foto wordt geweigerd`, await kaart(page, 4).locator('[data-pu-slot="front"]').getAttribute('data-state'), 'failed');
  ok(`${tag}: met de bestaande melding`, /Te klein/.test(await kaart(page, 4).locator('[data-pu-slot="front"] .pu-slot-msg').textContent()), true);
  ok(`${tag}: en de upload die al onderweg was, gaat er weer uit`, uploads.dels.some((k) => /screenshot\.png$/.test(k || '')), true);

  /* De soort: product 1 kiest, de rest neemt over; een eigen keuze verderop
     geldt voor de producten daarna. */
  await kaart(page, 0).locator('.pu-soort-sel').selectOption('top');
  await kaart(page, 2).locator('.pu-soort-sel').selectOption('trousers');
  const soorten = await page.evaluate(() => [...document.querySelectorAll('.pu-soort-sel')].map((s) => s.value));
  ok(`${tag}: de soort neemt die van het vorige product over`, soorten, ['top', 'top', 'trousers', 'trousers', 'trousers']);
  ok(`${tag}: en de bestelling krijgt die van het eerste product`, await page.evaluate(() => document.querySelector('input[name="garment"]')?.value), 'top');
  /* Erbij in beeld: de contextvakjes van de soort, in de lade. */
  await kaart(page, 0).locator('.pu-meer-knop').click();
  const erbij = await kaart(page, 0).evaluate((el) => [...el.querySelectorAll('.pu-erbij .pu-slot')].map((s) => s.dataset.puSlot));
  ok(`${tag}: bij een top kan eronder en een broek erbij`, erbij, ['ctx-underlayer', 'ctx-bottom']);
  ok(`${tag}: met een verborgen veld per plek op "wij kiezen"`, await page.evaluate(() => [...document.querySelectorAll('input[name^="context_"][name$="_p1"]')].map((i) => `${i.name}=${i.value}`)), ['context_underlayer_p1=ours', 'context_bottom_p1=ours']);
  ok(`${tag}: het gezicht per product staat in de lade`, await kaart(page, 0).locator('.pu-meer-in .pu-mk-rij input').count() > 1, true);

  /* De balk met het toetsenbord. */
  await page.locator('[data-pl-rail-knop]').first().focus();
  await page.keyboard.press('ArrowRight');
  ok(`${tag}: pijltje rechts in de balk gaat naar product 2`, await page.evaluate(() => document.activeElement?.getAttribute('aria-current')), 'true');
  /* p1 (vier), p2 (drie), p3 (op naam) en p4 (zes) zijn af; p5 niet. */
  ok(`${tag}: de telling klopt`, (await page.textContent('[data-pl-progress]')).split(' · ')[0], '4 van 5 producten klaar');

  /* Verder met lege verplichte vakken: één lijst, en later in Studio. */
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(400);
  const lijst = await page.locator('[data-pl-missing-list] .pu-mis-regel').allTextContents();
  /* p1–p4 zijn af; p5 heeft alleen een geweigerde (te kleine) voorkant. */
  ok(`${tag}: het tussenscherm noemt per product wat er mist (ontbreekt.js)`, lijst, ['Product 5: geen voorkant, geen achterkant, geen detail']);
  ok(`${tag}: met de zin over VISUAILS Studio`, /VISUAILS Studio/.test(await page.textContent('[data-pl-missing]')), true);
  await leesbaarOk(page, '.pu-mis-regel', tag);
  await page.click('[data-pl-missing-go]');
  await page.waitForTimeout(400);
  ok(`${tag}: "Later in VISUAILS Studio" gaat door naar stap 3`, await huidigeStap(page), 3);
  /* Stap 3: de contactvoorkeur. */
  const opties = await page.locator('.pl-voorkeur-optie span').allTextContents();
  ok(`${tag}: stap 3: "E-mail" en "Telefoon of WhatsApp"`, opties, [VOORKEUR_COPY.nl.email, VOORKEUR_COPY.nl.whatsapp]);
  ok(`${tag}: en de waarde blijft "whatsapp"`, await page.evaluate(() => [...document.querySelectorAll('input[name="contact_preference"]')].map((i) => i.value)), ['email', 'whatsapp']);
  ok(`${tag}: geen horizontale scroll`, await geenScroll(page), true);
  ok(`${tag}: geen fouten op de pagina`, fouten, []);
  await page.close();
}

/* Engels, kort: de contactvoorkeur en de woorden op de knop. */
{
  const { page } = await open('/start/catalog', { breed: 1280 });
  await naarStap2(page, 1);
  ok('en: de knop heet "Choose this product’s photos"', (await kaart(page, 0).locator('.pu-kies-knop').textContent()).trim(), 'Choose this product’s photos');
  ok('en: bij de draagfoto staat de aanname', (await kaart(page, 0).locator('.pu-slot-regel').allTextContents()).some((r) => r.includes('Without a worn photo we assume a regular, straight fit.')), true);
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(300);
  ok('en: zonder foto\'s zegt het tussenscherm dat er nog niets is', (await page.textContent('[data-pl-missing-h]')).trim(), 'You have not chosen any photos yet');
  ok('  en geen lijst (ontbreekt.js: onbekend)', await page.locator('[data-pl-missing-list] li').count(), 0);
  await page.click('[data-pl-missing-go]');
  await page.waitForTimeout(300);
  ok('en: stap 3: "Email" en "Phone or WhatsApp"', await page.locator('.pl-voorkeur-optie span').allTextContents(), [VOORKEUR_COPY.en.email, VOORKEUR_COPY.en.whatsapp]);
  await page.close();
}

/* ══ 2b · LICHT EN DONKER, MET FOTO'S ERIN ═══════════════════════════════════ */
console.log('\n2b · leesbaar in licht en donker, ook met foto\'s erin');
for (const donker of [false, true]) {
  for (const breed of [390, 1280]) {
    const tag = `nl ${breed}px ${donker ? 'donker' : 'licht'}`;
    const { page } = await open('/nl/start/catalog', { breed, donker });
    await naarStap2(page, 3);
    await kaart(page, 0).locator('.pu-kies-input').setInputFiles(vier);
    await allesVerstuurd(page);
    await kaart(page, 1).locator('.pu-meer-knop').click();
    for (const sel of ['.pu-progress', '.pu-stap-lead', '.pu-kies-hint', '.pu-card.is-uitleg .pu-slot-regel', '.pu-slot-name', '.pu-slot-eis', '.pu-slot-msg', '.pu-act', '.pu-wissel', '.pu-state', '.pu-meer-vat', '.pu-erbij-hint', '.pu-mk-naam', '.pu-q-label']) {
      await leesbaarOk(page, sel, tag);
    }
    ok(`${tag}: geen horizontale scroll`, await geenScroll(page), true);
    await page.screenshot({ path: path.join(OUT, `f3-stap2-gevuld-${breed}-${donker ? 'donker' : 'licht'}.png`), fullPage: false });
    await page.close();
  }
}

/* ══ 3 · DE DAGGRENS ══════════════════════════════════════════════════════ */
console.log('\n3 · de daggrens');
{
  const { page } = await open('/nl/start/catalog', { breed: 1280, daggrens: true });
  await naarStap2(page, 2);
  await kaart(page, 0).locator('.pu-kies-input').setInputFiles(vier.slice(0, 1));
  await wachtTot(page, () => !document.querySelector('[data-pl-upload-note="limiet"]').hidden);
  ok('bij de daggrens verschijnt de bestaande melding', await page.locator('[data-pl-upload-note="limiet"]').isVisible(), true);
  ok('  en het vak zegt waarom', await kaart(page, 0).locator('[data-pu-slot="front"]').getAttribute('data-state'), 'failed');
  await page.close();
}

/* ══ 4 · DE €1-PROEF ══════════════════════════════════════════════════════ */
console.log('\n4 · de €1-proef');
for (const breed of [390, 1280]) {
  const { page, fouten } = await open('/nl/test-sample', { breed });
  ok(`proef ${breed}px: het gezicht staat in stap 1`, await page.evaluate(() => !!document.querySelector('[data-pl-step="1"] input[name="model"]')), true);
  ok(`proef ${breed}px: naar stap 2 zonder een gezicht te kiezen`, await (async () => { await page.click('.pl-step.is-current [data-pl-next]'); await page.waitForTimeout(300); return huidigeStap(page); })(), 2);
  ok(`proef ${breed}px: één kaart, één knop`, await page.locator('.pl-step.is-current .pu-kies-knop:visible').count(), 1);
  ok(`proef ${breed}px: geen soort (de proef heeft geen styling)`, await page.locator('.pu-soort-sel').count(), 0);
  await kaart(page, 0).locator('.pu-kies-input').setInputFiles(vier);
  await allesVerstuurd(page);
  ok(`proef ${breed}px: vier tegelijk vallen in de vier vakken`, Object.values(await vakken(page, 0)).every((v) => v.startsWith('filled')), true);
  ok(`proef ${breed}px: geen horizontale scroll`, await geenScroll(page), true);
  ok(`proef ${breed}px: geen fouten`, fouten, []);
  await page.close();
}

/* ══ 5 · EEN ABONNEE MET EEN MERKMODEL ═══════════════════════════════════ */
console.log('\n5 · een abonnee met een eigen merkmodel');
{
  /* Verzonnen gegevens; geen echt adres. */
  const portret = `data:image/png;base64,${(await sharp({ create: { width: 30, height: 40, channels: 3, background: '#ddbbaa' } }).png().toBuffer()).toString('base64')}`;
  const me = {
    email: 'inkoop@proefmerk.test', name: 'Testa Proef', first_name: 'Testa', last_name: 'Proef', brand: 'Proefmerk BV',
    phone: '+31 6 00000000', country: 'NL', address_line1: 'Verzonnenstraat 1', postal_code: '1234 AB', city: 'Nergenshuizen',
    regNumber: '12345678', vat: '', noVat: false, locks: {}, styles: [], saved: true, label: 'Proefmerk BV',
    models: [{ id: 7, preview: portret, label: 'Mila' }],
    tegoedCents: 0, credits: { saldo: 120, vervalt: [{ op: '2026-12-31', aantal: 120 }], nieuw: null },
  };
  const { page, fouten } = await open('/nl/start/catalog', { breed: 1280, me });
  await page.waitForTimeout(400);
  ok('abonnee: het eigen merkmodel staat in stap 1', await page.evaluate(() => !!document.querySelector('[data-pl-step="1"] input[name="model"][value="c7"]')), true);
  await page.evaluate(() => { const r = document.querySelector('input[name="model"][value="c7"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); });
  ok('abonnee: naar stap 2', await naarStap2(page, 2), 2);
  await kaart(page, 1).locator('.pu-meer-knop').click();
  const tegels = await kaart(page, 1).locator('.pu-mk-naam').allTextContents();
  ok('abonnee: in de lade staat "Zelfde" voor het merkmodel van de bestelling', tegels[0], 'Zelfde');
  await kaart(page, 0).locator('.pu-kies-input').setInputFiles(vier);
  await allesVerstuurd(page);
  ok('abonnee: de foto\'s gaan erin', (await vakken(page, 0)).front.startsWith('filled'), true);
  ok('abonnee: geen fouten', fouten, []);
  await page.close();
}

/* ══ 6 · LIFESTYLE: 4K EN DE VERHOUDING STAAN IN DE LADE ═════════════════ */
console.log('\n6 · lifestyle');
{
  const { page, fouten } = await open('/nl/start/lifestyle', { breed: 390 });
  ok('lifestyle: naar stap 2', await naarStap2(page, 3), 2);
  ok('lifestyle: 4K staat niet open op de kaart', await kaart(page, 0).locator('.pu-hoog-rij').isVisible(), false);
  await kaart(page, 0).locator('.pu-meer-knop').click();
  ok('lifestyle: maar wel in de lade', await kaart(page, 0).locator('.pu-hoog-rij').isVisible(), true);
  ok('lifestyle: geen horizontale scroll', await geenScroll(page), true);
  ok('lifestyle: geen fouten', fouten, []);
  await page.close();
}

console.log('\nwoorden in stap 2 (zichtbaar, zonder opties van keuzelijsten):');
for (const t of telling) console.log(`      ${t.tag.padEnd(22)} ${t.woorden}`);

await browser.close();
await new Promise((r) => setTimeout(r, 300));
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
