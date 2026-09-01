/* Zoekt zijwaartse overloop op elke gebouwde pagina, op vier breedtes.
   Een breedtewijziging breekt niet de opmaak die je toevallig bekijkt maar de
   ene tabel die net niet meer past — en die vind je alleen door te meten. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, globSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST = '/tmp/vb/dist';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f).then((b) => { res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); }, () => { res.writeHead(404); res.end(); });
});
await new Promise((r) => server.listen(8092, r));
const paden = globSync(join(DIST, '**/index.html')).map((f) => f.slice(DIST.length).replace(/\\/g, '/').replace(/\/index\.html$/, '') || '/');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const BREEDTES = [390, 768, 1280, 1920];
let stuk = 0;
for (const w of BREEDTES) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  const wachtrij = [...paden];
  const werker = async () => {
    let pad;
    while ((pad = wachtrij.shift())) {
      const p = await ctx.newPage();
      await p.goto(`http://localhost:8092${pad}`, { waitUntil: 'networkidle' }).catch(() => {});
      const uit = await p.evaluate(() => {
        const over = document.documentElement.scrollWidth - window.innerWidth;
        const boosdoeners = [];
        if (over > 1) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0) continue;
            if (r.right > window.innerWidth + 1 || r.left < -1) {
              boosdoeners.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.')} → ${Math.round(r.left)}..${Math.round(r.right)}`);
            }
            if (boosdoeners.length > 4) break;
          }
        }
        return { over, boosdoeners };
      }).catch(() => ({ over: 0, boosdoeners: [] }));
      if (uit.over > 1) { stuk++; console.log(`FAIL ${String(w).padStart(4)} ${pad}  +${uit.over}px`, uit.boosdoeners.join(' | ').slice(0, 160)); }
      await p.close();
    }
  };
  await Promise.all([werker(), werker(), werker(), werker()]);
  await ctx.close();
}
await b.close(); server.close();
console.log(stuk ? `\n${stuk} pagina/breedte-paren lopen over` : `\ngeen enkele overloop op ${paden.length} pagina's × ${BREEDTES.length} breedtes`);
