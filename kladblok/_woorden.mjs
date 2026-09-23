// Zichtbare woorden per pagina en per sectie: node kladblok/_woorden.mjs [taal]
import { chromium } from 'playwright';
import { globSync, writeFileSync } from 'node:fs';
const taal = process.argv[2] || 'en';
const paden = globSync('dist/**/index.html').map((f) => '/' + f.replace(/^dist\//, '').replace(/index\.html$/, ''))
  .filter((p) => (taal === 'nl' ? p.startsWith('/nl/') : !p.startsWith('/nl/')))
  .filter((p) => !/\/(account|admin|o|portal|concept|terms|privacy|cookie-policy|data-processing-agreement|ai-act|404|thank-you)\b/.test(p));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ locale: 'en-US', viewport: { width: 1440, height: 900 } });
const uit = [];
for (const pad of paden.sort()) {
  await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'domcontentloaded' });
  const r = await p.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const secties = [...main.querySelectorAll('section')].filter((s) => !s.parentElement.closest('section'));
    const tel = (el) => (el.innerText || '').split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ]/.test(w)).length;
    return { totaal: tel(main), secties: secties.map((s) => ({ kop: (s.querySelector('h1,h2')?.innerText || '').replace(/\s+/g, ' ').slice(0, 50), w: tel(s) })) };
  });
  uit.push({ pad, ...r });
}
await b.close();
writeFileSync(`/tmp/claude-0/woorden-${taal}.json`, JSON.stringify(uit, null, 1));
for (const x of uit.sort((a, b) => b.totaal - a.totaal)) {
  console.log(`${String(x.totaal).padStart(5)}  ${x.pad}`);
  for (const s of x.secties.filter((s) => s.w > 90)) console.log(`         ${String(s.w).padStart(4)}  ${s.kop}`);
}
