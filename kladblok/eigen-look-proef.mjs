/* De eigen look in het bestelformulier, in beeld — 4 september 2026.
   dist/ met een nep-/account/me dat twee eigen looks teruggeeft; pipeline.js
   zet ze neer zoals bij een ingelogde klant. Draai `npm run build` eerst.
     node kladblok/eigen-look-proef.mjs  → kladblok/eigen-look/*.png */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('dist');
const OUT = path.resolve('kladblok/eigen-look');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8096;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const ME = {
  email: 'studio@voorbeeld-volt.nl', name: 'Mara Visser', brand: 'VOLT', models: [], locks: {},
  styles: [
    { id: 1, name: 'Rooftop', service: 'both', line: 'Heet betondak, hard middaglicht', surchargeCents: 1500, preview: '/img/lifestyle-glow-w420.webp' },
    { id: 2, name: 'Nachtmarkt', service: 'lifestyle', line: 'Neon, nat asfalt', surchargeCents: 0, preview: null },
  ],
};
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/account/me')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(ME)); }
  if (url.pathname.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  try { if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); } catch { /* */ }
  try { res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(fs.readFileSync(p)); }
  catch { res.writeHead(404); res.end(''); }
}).listen(PORT);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h] of [[1280, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  for (const [naam, pad, stap] of [
    ['lifestyle', '/nl/start/lifestyle/?style=cs-1', '[name="style"]'],
    ['catalog', '/nl/start/catalog/', '[data-pl-own-look]'],
    ['custom-look', '/nl/start/custom-look/', 'form'],
  ]) {
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', (e) => fouten.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}${pad}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
    /* Naar de stap waar de keuze staat: doorklikken tot het element zichtbaar is. */
    for (let i = 0; i < 6; i++) {
      const zichtbaar = await page.$eval(stap, (el) => !!(el.offsetWidth || el.offsetHeight)).catch(() => false);
      if (zichtbaar) break;
      const knop = await page.$('[data-pl-next]:not([hidden]), .pl-next:not([hidden]), button[data-next]');
      if (!knop) break;
      await knop.click().catch(() => {});
      await page.waitForTimeout(300);
    }
    await page.$$eval('[data-pl-own-look]', (els) => els.forEach((e) => { const d = e.closest('details'); if (d) d.open = true; }));
    const el = await page.$(stap);
    if (el) await el.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(200);
    const naamBestand = `${naam}-${w}.png`;
    await page.screenshot({ path: path.join(OUT, naamBestand), fullPage: true });
    const tegels = await page.$$eval('.look.is-own, .own-look-opt', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)));
    const gekozen = await page.$eval('input[name="style"]:checked', (e) => e.value).catch(() => '(niets)');
    console.log(`${naamBestand.padEnd(22)} eigen tegels: ${JSON.stringify(tegels)}  gekozen: ${gekozen}${fouten.length ? '  FOUTEN: ' + fouten.join(' | ') : ''}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server.close();
