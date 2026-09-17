/**
 * Schiet stap 1 t/m 5 van het echte bestelformulier, om te zien welke
 * visuele middelen er per stap gebruikt worden. Alleen kijken, niets vullen.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
               '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.avif':'image/avif',
               '.json':'application/json', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(ROOT, p);
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
  catch { try { await stat(f + '.html'); f += '.html'; } catch { res.writeHead(404); return res.end(); } }
  try {
    const buf = await readFile(f);
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await pg.goto(`${base}/nl/start/catalog`, { waitUntil: 'networkidle' });
await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' });
await pg.waitForTimeout(600);

const stappen = await pg.$$('[data-pl-step]');
console.log('stappen gevonden:', stappen.length);

for (const [i, s] of stappen.entries()) {
  const nr = await s.getAttribute('data-pl-step');
  // Alles zichtbaar maken, ook de stappen die nog niet aan de beurt zijn.
  await s.evaluate((el) => {
    el.hidden = false;
    el.style.display = 'block';
    el.classList.add('is-current');
  });
  await pg.waitForTimeout(150);
  try {
    await s.screenshot({ path: `kladblok/stap-${i + 1}-nu.png` });
    console.log(`stap ${i + 1} (data-pl-step=${nr}) geschoten`);
  } catch (e) { console.log(`stap ${i + 1}: ${e.message.split('\n')[0]}`); }
}

await b.close();
server.close();
