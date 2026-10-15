/*
 * Het tussenscherm van stap 2 met een bijbestelde hoek, in een echte browser —
 * 12 oktober 2026 (K6, k-hoeken = a).
 *
 * Tot vandaag maakte het tussenscherm voor een ontbrekende hoekfoto een eigen
 * regel naast de lijst uit src/lib/ontbreekt.js. Nu telt ontbreekt.js de hoeken
 * zelf, dus hoort het scherm precies te zeggen wat Studio, de mails en /admin
 * zeggen. Gemeten: catalog, één hoek (Driekwart) gekozen, twee producten:
 *   · p1 met voorkant, achterkant en detail → "Product 1: geen driekwart";
 *   · p2 met alleen voorkant en achterkant  → één regel "Product 2: geen detail, geen
 *     driekwart" (vroeger twee regels voor hetzelfde product);
 *   · NL en EN, 390 en 1280 px, contrast en lettergrootte van de regels.
 *
 * Zwaar (browser): $S/zwaar.sh node tests/hoeken-ontbreekt-browser.test.mjs — na een build.
 */
import http from 'node:http';
import { metVisIn } from './lib/vis-in.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name}${good ? '' : `  verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
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

const beeld = async (naam, kleur) => ({
  name: naam,
  mimeType: 'image/jpeg',
  buffer: await sharp({ create: { width: 1200, height: 1500, channels: 3, background: kleur } }).jpeg({ quality: 85 }).toBuffer(),
});
const drie = await Promise.all(['IMG_0101.jpg', 'IMG_0102.jpg', 'IMG_0103.jpg'].map((n, i) => beeld(n, ['#c86464', '#64c864', '#6464c8'][i])));

async function open(url, breed) {
  const page = await browser.newPage({ viewport: { width: breed, height: breed < 600 ? 844 : 900 } });
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (/\[pipeline\]/.test(m.text())) fouten.push(m.text().slice(0, 200)); });
  let n = 0;
  await page.route('**/api/upload**', async (r) => {
    const req = r.request();
    if (req.method() === 'DELETE') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    const t = (req.postDataBuffer() || Buffer.from('')).toString('latin1');
    const veld = (naam) => (new RegExp(`name="${naam}"\\r\\n\\r\\n([^\\r]*)`).exec(t) || [])[1] || '';
    const bestand = (/filename="([^"]+)"/.exec(t) || [])[1] || '';
    n += 1;
    const b = 'h'.repeat(43);
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, batch: b, file: { key: `intake/${b}/${String(n).padStart(3, '0')}-${bestand}`, name: bestand, bytes: 9, product: veld('product'), shot: veld('shot') } }) });
  });
  await page.route('**/api/land', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"NL"}' }));
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
  await page.route('**/api/capacity**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reason: 'ok', windows: [{ start: '2026-10-20', end: '2026-10-21' }], from: '2026-10-19', earlier: false, more: false }) }));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
  await page.waitForTimeout(300);
  return { page, fouten };
}
const huidigeStap = (page) => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));
const kaart = (page, i) => page.locator('.pu-card').nth(i);
const wachtTot = async (page, fn, ms = 6000) => {
  for (let t = 0; t < ms; t += 150) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(150); }
  return false;
};
const allesVerstuurd = (page) => wachtTot(page, () => ![...document.querySelectorAll('.pu-slot')].some((s) => s.dataset.state === 'sending'));
const leesbaar = (page, sel) => page.evaluate((s) => {
  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  let slechtst = { ratio: 99, px: 99 };
  for (const el of document.querySelectorAll(s)) {
    if (!el.getClientRects().length || !el.textContent.trim()) continue;
    let bg = [255, 255, 255, 1];
    for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { bg = b; break; } }
    const fg = rgba(getComputedStyle(el).color);
    const mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [lum(mix), lum(bg.slice(0, 3))];
    slechtst = { ratio: Math.min(slechtst.ratio, Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100), px: Math.min(slechtst.px, parseFloat(getComputedStyle(el).fontSize)) };
  }
  return slechtst;
}, sel);

for (const [url, taal] of [['/nl/start/catalog', 'nl'], ['/start/catalog', 'en']]) {
  for (const breed of [390, 1280]) {
    const tag = `${taal} ${breed}px`;
    const { page, fouten } = await open(url, breed);
    if (await page.$('[data-pl-qty-input]')) { await page.fill('[data-pl-qty-input]', '2'); await page.waitForTimeout(150); }
    /* Stap 1: stijl, gezicht en één hoek (Driekwart). */
    await page.evaluate(() => {
      const kies = (naam) => {
        const r = document.querySelector(`.pl-step.is-current input[name="${naam}"]`);
        if (r && !document.querySelector(`input[name="${naam}"]:checked`)) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      };
      kies('style'); kies('model');
      const h = document.querySelector('input[name="angle_three-quarter"]');
      if (h && !h.checked) h.click();
    });
    ok(`${tag}: de hoek Driekwart is gekozen`, await page.evaluate(() => !!document.querySelector('input[name="angle_three-quarter"]:checked')), true);
    await page.click('.pl-step.is-current [data-pl-next]');
    await page.waitForTimeout(400);
    ok(`${tag}: naar stap 2`, await huidigeStap(page), 2);
    ok(`${tag}: elk product heeft een vak voor de hoek (extra1)`, await page.locator('.pu-card [data-pu-slot="extra1"]').count(), 2);

    await kaart(page, 0).locator('.pu-kies-input').setInputFiles(drie);
    await allesVerstuurd(page);
    await kaart(page, 1).locator('.pu-kies-input').setInputFiles(drie.slice(0, 2));
    await allesVerstuurd(page);
    await page.click('.pl-step.is-current [data-pl-next]');
    await page.waitForTimeout(400);
    const lijst = await page.locator('[data-pl-missing-list] .pu-mis-regel').allTextContents();
    ok(`${tag}: het tussenscherm noemt de hoek, één regel per product (ontbreekt.js)`, lijst,
      taal === 'nl' ? ['Product 1: geen driekwart', 'Product 2: geen detail, geen driekwart'] : ['Product 1: no three-quarter', 'Product 2: no detail, no three-quarter']);
    const l = await leesbaar(page, '.pu-mis-regel');
    ok(`${tag}: de regels: contrast ≥ 4,5 (${l.ratio}) en tekst ≥ 11,5 px (${l.px})`, l.ratio >= 4.5 && l.px >= 11.5, true);
    ok(`${tag}: geen horizontale scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    ok(`${tag}: geen fouten op de pagina`, fouten, []);
    await page.close();
  }
}

await browser.close();
await new Promise((r) => setTimeout(r, 300));
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
