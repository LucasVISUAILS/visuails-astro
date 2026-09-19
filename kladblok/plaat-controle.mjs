import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const TYPES = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.svg':'image/svg+xml',
  '.woff2':'font/woff2', '.json':'application/json', '.mp4':'video/mp4', '.ico':'image/x-icon' };

const srv = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(ROOT, p);
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
  catch { f = join(ROOT, p.replace(/\/$/, '') + '.html'); }
  try {
    const b = await readFile(f);
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end('x'); }
});
await new Promise((r) => srv.listen(4399, r));

const PAGINAS = [
  ['home', '/nl/'],
  ['catalog', '/nl/catalog/'],
  ['lifestyle', '/nl/lifestyle/'],
  ['video', '/nl/video/'],
  ['plans', '/nl/plans/'],
  ['pricing', '/nl/pricing/'],
  ['upload', '/nl/upload-guidelines/'],
];

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [maat, opts] of [['bureau', { viewport: { width: 1440, height: 1000 } }], ['telefoon', devices['Pixel 5']]]) {
  const ctx = await br.newContext({ ...opts, deviceScaleFactor: 1 });
  for (const [naam, pad] of PAGINAS) {
    const pg = await ctx.newPage();
    await pg.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' });
    await pg.addStyleTag({ content: '[data-cookie], .cc, #cookie, .cookie-band { display: none !important }' });
    const lc = pg.locator('.lc').first();
    if (await lc.count()) {
      await lc.scrollIntoViewIfNeeded();
      await pg.waitForTimeout(700);
      const box = await lc.boundingBox();
      const vh = pg.viewportSize().height;
      await pg.screenshot({
        path: `kladblok/uit/plaat-${maat}-${naam}.png`,
        clip: box ? { x: 0, y: Math.max(0, box.y - 40), width: pg.viewportSize().width,
                      height: Math.min(vh, box.height + 120) } : undefined,
      });
      console.log(maat, naam, 'lc', box && { w: Math.round(box.width), h: Math.round(box.height) });
    } else console.log(maat, naam, 'GEEN .lc');
    await pg.close();
  }
  await ctx.close();
}
await br.close(); srv.close();
