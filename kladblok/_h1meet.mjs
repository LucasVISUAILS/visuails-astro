import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const w of [1440, 1280, 1100, 960, 900, 700, 390]) for (const pad of ['/', '/nl/']) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' });
  const r = await p.evaluate(() => { const h = document.querySelector('.hero-h1'); const kol = h.parentElement.getBoundingClientRect().width; const regels = [...h.querySelectorAll('.kop-regel')].map((r) => Math.round(r.scrollWidth)); const woorden = [...h.querySelectorAll('.wissel-woord')].map((e) => Math.round(e.getBoundingClientRect().width)); return { kol: Math.round(kol), regels, breedst: Math.max(...woorden), over: Math.max(...woorden) > kol }; });
  console.log(w, pad, JSON.stringify(r));
  await p.close();
}
await b.close();
