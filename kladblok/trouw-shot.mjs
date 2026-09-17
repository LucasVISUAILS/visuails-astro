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
const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
await pg.addStyleTag; // noop

for (const [naam, url, sel] of [
  ['trouw-gids', 'http://localhost:4321/nl/upload-guidelines/', '.ug-trouw'],
  ['trouw-faq', 'http://localhost:4321/nl/faq/', null],
]) {
  await pg.goto(url, { waitUntil: 'networkidle' });
  await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' });
  if (sel) {
    const el = await pg.$(sel);
    const box = await el.boundingBox();
    console.log(naam, 'breedte', Math.round(box.width), 'hoogte', Math.round(box.height));
    await pg.locator('.ug-set').screenshot({ path: `kladblok/${naam}.png` });
  } else {
    const vraag = pg.getByText('Lijkt het beeld echt op mijn product?').first();
    await vraag.scrollIntoViewIfNeeded();
    await vraag.click();
    await pg.waitForTimeout(500);
    const kaart = pg.locator('details, li, section').filter({ hasText: 'Lijkt het beeld echt op mijn product?' }).last();
    await kaart.screenshot({ path: `kladblok/${naam}.png` });
  }
  console.log('geschreven', naam);
}
await b.close();
srv.close();
