// Schermafdrukken van de gebouwde site (dist/) voor de huisstijlronde: een reeks
// pagina's, breed en telefoon, volle hoogte, naar kladblok/stijl/*.png.
//   node kladblok/stijl-kijk.mjs [/pad ...]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist');
fs.mkdirSync('kladblok/stijl', { recursive: true });
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  const ext = path.extname(f);
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.mp4': 'video/mp4' }[ext] || 'application/octet-stream';
  res.setHeader('content-type', mime); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(4499, r));
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['/nl/', '/nl/catalog/', '/nl/lifestyle/', '/nl/plans/', '/nl/pricing/', '/nl/start/', '/nl/faq/', '/nl/custom-models/'];
const browser = await chromium.launch({ executablePath: browserPad() });
for (const [w, naam] of [[1280, 'breed'], [420, 'telefoon']]) {
  /* Hoog venster en geen beweging: onthulanimaties en lazy beelden onder de vouw
     staan anders leeg op een volle afdruk — zie kladblok/looks-proef.mjs. */
  const ctx = await browser.newContext({ viewport: { width: w, height: 1100 }, reducedMotion: 'reduce' });
  await ctx.route('**/*.html', (route) => route.continue());
  await ctx.route('**/*', (route) => route.continue());
  for (const url of PAGES) {
    const page = await ctx.newPage();
    await page.route('**/*', (route) => route.continue());
    await page.goto(`http://localhost:4499${url}`, { waitUntil: 'load' });
    await page.evaluate(() => { for (const im of document.querySelectorAll('img[loading="lazy"]')) im.loading = 'eager'; });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(600);
    const file = `kladblok/stijl/${(url.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'home')}-${naam}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(' ', file);
    await page.close();
  }
  await ctx.close();
}
await browser.close(); srv.close();
