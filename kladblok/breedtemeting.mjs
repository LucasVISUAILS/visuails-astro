/* Wat er van de pagina daadwerkelijk gebruikt wordt, per schermbreedte.
   Meet de RENDERED breedte van .container op een gebouwde pagina — geen
   berekening uit de tokens, want dan meet je je eigen aanname. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST = '/tmp/vb/dist';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f).then((b) => { res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); }, () => { res.writeHead(404); res.end(); });
});
await new Promise((r) => server.listen(8094, r));
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const BREEDTES = [390, 768, 1024, 1280, 1440, 1600, 1920, 2560];
const PAGINA = process.argv[2] || '/';
console.log(`scherm   container  inhoud   marge   (${PAGINA})`);
for (const w of BREEDTES) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(`http://localhost:8094${PAGINA}`, { waitUntil: 'domcontentloaded' });
  const m = await p.evaluate(() => {
    /* De BREEDSTE gewone container op de pagina, en niet de eerste: de eerste
       kan in een blok zitten dat --container zelf overschrijft (HuidKantig zet
       hem op 100%), en dan meet je een uitzondering in plaats van de maat. */
    const kandidaten = [...document.querySelectorAll('.container')]
      .filter((e) => !e.classList.contains('narrow') && !e.classList.contains('wide') && !e.classList.contains('bleed'))
      .map((e) => {
        const cs = getComputedStyle(e);
        const box = e.getBoundingClientRect();
        const pad = parseFloat(cs.paddingInlineStart);
        return { doos: Math.round(box.width), inhoud: Math.round(box.width - 2 * pad), pad: Math.round(pad), max: cs.maxWidth };
      })
      .filter((x) => x.doos > 0);
    if (!kandidaten.length) return null;
    kandidaten.sort((a, z) => z.inhoud - a.inhoud);
    return kandidaten[0];
  });
  console.log(String(w).padStart(5), String(m?.doos ?? '—').padStart(10), String(m?.inhoud ?? '—').padStart(8), String(m?.pad ?? '—').padStart(7), '  max-width:', m?.max ?? '—');
  await p.close();
}
await b.close(); server.close();
