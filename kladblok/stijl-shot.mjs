import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const TYPES = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.avif':'image/avif', '.json':'application/json' };
const srv = createServer((req, res) => {
  let p = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p) && existsSync(p + '/index.html')) p = p + '/index.html';
  if (!existsSync(p)) { res.writeHead(404); res.end('nee'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(4321, r));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const doel = process.argv.slice(2);
const taken = doel.length ? doel : ['lifestyle', 'catalog', 'video'];
for (const naam of taken) {
  for (const breed of [1280, 430]) {
    const pg = await b.newPage({ viewport: { width: breed, height: 1000 } });
    await pg.goto(`http://localhost:4321/nl/${naam}/`, { waitUntil: 'networkidle' });
    await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' });
    /* Eerst de hele pagina doorlopen: alles staat op loading="lazy", en een
       schermafdruk van een sectie die nooit in beeld is geweest toont lege
       vakken die er in werkelijkheid niet zijn. */
    await pg.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
    });
    await pg.waitForLoadState('networkidle');
    const sec = pg.locator('#looks').first();
    await sec.scrollIntoViewIfNeeded();
    await pg.waitForTimeout(800);
    const box = await sec.boundingBox();
    console.log(naam, breed, 'sectie', Math.round(box.width), 'x', Math.round(box.height));
    await sec.screenshot({ path: `kladblok/stijl-${naam}-${breed}.png` });
    await pg.close();
  }
}
await b.close();
srv.close();
