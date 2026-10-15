/* VISUAILS — de dichte proef ("opent in rondes") in de browser. 11 oktober 2026 (kG2, K5 punt 4).
 *
 *   npx astro build && node tests/proef-schaarste-browser.test.mjs     (via zwaar.sh)
 *
 * /test-sample (NL en EN) met de stand dicht en alleen lifestyle, op 390 en
 * 1280 px: de nieuwe kop, tekst minstens 11,5 px en 4,5:1 tegen zijn
 * ondergrond, geen horizontale scroll. Schermafdrukken in .render/ (proef-dicht-*.png).
 */
import fs from 'node:fs';
import { metVisIn } from './lib/vis-in.mjs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
if (!fs.existsSync(path.join(DIST, 'test-sample/index.html'))) { console.log(' FAIL er is geen dist/ — bouw eerst'); process.exit(1); }

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

const METING = `(() => {
  const rgba = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const uit = { gemeten: 0, klein: [], laag: [] };
  for (const el of document.querySelectorAll('#even-dicht h2, #even-dicht .h-ts-dicht-zin, #even-dicht .h-pil, #even-dicht label, #even-dicht button, #even-dicht .h-ts-wacht-noot, #even-dicht .h-ts-wacht-noot a')) {
    if (el.closest('[hidden]') || !el.getClientRects().length) continue;
    const t = (el.innerText || '').trim(); if (!t) continue;
    let bg = [255, 255, 255, 1];
    for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { bg = b; break; } }
    const fg = rgba(getComputedStyle(el).color);
    const mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [lum(mix), lum(bg.slice(0, 3))];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const px = parseFloat(getComputedStyle(el).fontSize);
    uit.gemeten++;
    if (px < 11.5) uit.klein.push(t.slice(0, 30) + ' ' + px + 'px');
    if (ratio + 0.01 < 4.5) uit.laag.push(t.slice(0, 30) + ' ' + ratio.toFixed(2));
  }
  return uit;
})()`;

async function open(url, stand, breed) {
  /* De cookiekeuze vooraf gezet, zodat de balk de schermafdruk niet bedekt. */
  const ctx = await browser.newContext({ viewport: { width: breed, height: 900 } });
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-11T00:00:00.000Z' })), domain: '127.0.0.1', path: '/' }]);
  const page = await ctx.newPage();
  await page.route('**/api/proef-stand', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stand }) }));
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/land', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"NL"}' }));
  await page.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
  await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  return page;
}

const KOP = {
  nl: { dicht: 'De proef opent in rondes', lifestyle: 'De catalogproef zit tussen twee rondes' },
  en: { dicht: 'The test sample opens in rounds', lifestyle: 'The catalog test sample is between rounds' },
};
try {
  for (const [lang, url] of [['nl', '/nl/test-sample/'], ['en', '/test-sample/']]) {
    for (const stand of ['dicht', 'lifestyle']) {
      for (const breed of [390, 1280]) {
        const tag = `${lang} ${stand} ${breed}px`;
        const page = await open(url, stand, breed);
        /* Wachten tot het blok er staat (14 oktober 2026): met vier toetsen
           tegelijk (UITROLLEN.bat) was 250 ms na networkidle soms te kort. */
        await page.waitForSelector('#even-dicht:not([hidden]) h2', { timeout: 8000 }).catch(() => {});
        const kop = await page.evaluate(() => document.querySelector('#even-dicht:not([hidden]) h2')?.textContent.trim() || '');
        ok(`${tag}: de kop "${KOP[lang][stand]}"`, kop === KOP[lang][stand], kop);
        const m = await page.evaluate(METING);
        ok(`${tag}: tekst minstens 11,5 px en 4,5:1`, m.gemeten >= 5 && !m.klein.length && !m.laag.length, `${m.gemeten} · ${m.klein.concat(m.laag).join(' | ')}`);
        ok(`${tag}: geen horizontale scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
        const blok = await page.$('#even-dicht');
        if (blok) await blok.screenshot({ path: path.join(OUT, `proef-dicht-${lang}-${stand}-${breed}.png`) });
        await page.context().close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
