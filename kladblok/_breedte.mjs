// Horizontale scroll op 320–1440: node kladblok/_breedte.mjs [pad ...]
import { chromium } from 'playwright';
import { globSync } from 'node:fs';
const alle = globSync('dist/**/index.html').map((f) => '/' + f.replace(/^dist\//, '').replace(/index\.html$/, ''))
  .filter((p) => !/\/(account|admin|o|portal)\//.test(p));
const PADEN = process.argv.length > 2 ? process.argv.slice(2) : alle;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const fout = [];
for (const w of [320, 390, 768, 1024, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } });
  for (const pad of PADEN) {
    try { await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch { continue; }
    const breed = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (breed > 1) fout.push(`${pad} ${w}: ${breed}px te breed`);
  }
  await p.close();
}
await b.close();
console.log(fout.join('\n') || 'geen horizontale scroll');
console.log(`${PADEN.length} pagina's × 5 breedtes`);
