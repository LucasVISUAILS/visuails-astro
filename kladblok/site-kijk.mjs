// Schermafdruk van een gebouwde pagina uit dist/, om naast het dashboard te leggen.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import path from 'node:path';
const ROOT = path.resolve('dist');
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  const ext = path.extname(f);
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' }[ext] || 'application/octet-stream';
  res.setHeader('content-type', mime); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(4499, r));
const browser = await chromium.launch({ executablePath: browserPad() });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const url = process.argv[2] || '/';
await page.goto(`http://localhost:4499${url}`, { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.screenshot({ path: `kladblok/site-${url.replace(/\W+/g, '_') || 'home'}.png`, fullPage: false });
await browser.close(); srv.close();
