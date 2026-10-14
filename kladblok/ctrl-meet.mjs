// node kladblok/ctrl-meet.mjs dist [pad] — de controle (HalControle) terwijl hij speelt: elke 40 ms per
// markering of hij te zien is, en of de foto waar hij bij hoort dan helemaal te zien is. Faalt (exit 1) als
// er ooit een markering op een andere foto staat. CHROMIUM=<pad> als Playwright zijn eigen browser niet vindt.
import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const [DIST, PAD = '/nl/voorbeeld/uitleg/'] = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer((req, res) => { let f = join(DIST, decodeURIComponent(req.url.split('?')[0])); if (!extname(f)) f = join(f, 'index.html'); readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); }); });
await new Promise((r) => server.listen(0, r));
const br = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let fout = 0;
for (const W of [1440, 390]) {
  const p = await br.newPage({ viewport: { width: W, height: 1000 } });
  await p.goto(`http://127.0.0.1:${server.address().port}${PAD}`, { waitUntil: 'load' });
  await p.evaluate(() => { for (const e of document.querySelectorAll('.h-in, .h-op')) e.classList.add('is-in'); document.querySelector('.h-ov-ctrl').scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.h-ov-ctrl')._u.opnieuw());
  const r = await p.evaluate(async () => {
    const w = document.querySelector('.h-ov-ctrl');
    const uit = []; const t0 = performance.now();
    while (performance.now() - t0 < 10500) {
      const beeld = {}; for (const i of w.querySelectorAll('.h-ov-ctrl-paar img')) beeld[i.dataset.it] = Math.min(beeld[i.dataset.it] ?? 1, Number(getComputedStyle(i).opacity));
      const merk = [...w.querySelectorAll('.h-ctrl-merk')].map((m) => [m.dataset.it, Number(getComputedStyle(m).opacity)]).filter(([, o]) => o > 0.03);
      uit.push({ t: Math.round(performance.now() - t0), beeld, merk, k: [1, 2, 3, 4, 5].filter((n) => w.classList.contains(`u-s${n}`)).length, staat: w.dataset.uitlegStaat });
      await new Promise((z) => setTimeout(z, 40));
    }
    return uit;
  });
  let slecht = 0;
  for (const x of r) for (const [it, o] of x.merk) if (o > 0.05 && x.beeld[it] < 0.95) { slecht += 1; if (slecht < 5) console.log(`  FOUT ${W}px t=${x.t} markering ${it} (${o.toFixed(2)}) op foto ${it} met opacity ${x.beeld[it].toFixed(2)}`); }
  const volg = []; for (const x of r) { const s = `${x.k}:${x.merk.filter(([, o]) => o > 0.9).map(([i]) => i)[0] || '-'}`; if (volg.at(-1)?.s !== s) volg.push({ s, t: x.t }); }
  console.log(`${W}px: ${r.length} metingen, ${slecht} keer een markering op de verkeerde foto · eind ${r.at(-1).staat}`);
  console.log('   stap:markering → ' + volg.map((v) => `${v.s}@${v.t}`).join('  '));
  fout += slecht;
  await p.close();
}
await br.close(); server.close();
console.log(fout ? `NIET GOED: ${fout}` : 'GOED: elke markering staat op zijn eigen foto');
process.exit(fout ? 1 : 0);
