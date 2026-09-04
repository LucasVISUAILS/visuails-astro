/* De publieke site als schermafdrukken, uit dist/ — 3 september 2026.
   node kladblok/site-afdrukken.mjs  → kladblok/site/<pad>-<breedte>.png */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('dist');
const OUT = path.resolve('kladblok/site');
await mkdir(OUT, { recursive: true });
const PORT = 8098;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  try { if ((await stat(p)).isDirectory()) p = path.join(p, 'index.html'); } catch { /* */ }
  try { const body = await readFile(p); res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(url.pathname.startsWith('/account/me') ? 401 : 404); res.end('{}'); }
}).listen(PORT);

const PADEN = (process.argv[2] ? [process.argv[2]] : ['/nl/', '/nl/pricing/', '/nl/catalog/', '/nl/lifestyle/', '/nl/how-it-works/', '/nl/faq/', '/nl/contact/', '/nl/start/', '/nl/test-sample/', '/nl/plans/', '/nl/studio/', '/nl/gallery/']);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  for (const p of PADEN) {
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}${p}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(400);
    const naam = `${p.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home'}-${w}.png`;
    await page.screenshot({ path: path.join(OUT, naam), fullPage: true });
    const hoogte = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`${naam.padEnd(34)} ${hoogte}px`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server.close();
