/* ── WAAROM GEEN fullPage HIER — 20 september 2026 ────────────────────────
   Een fullPage-opname zet de viewport tijdelijk op de volle paginahoogte, en
   daarmee beginnen alle `animation-timeline: view()`-onthullingen opnieuw: het
   halve scherm komt er doorzichtig op te staan terwijl er in een echte browser
   niets aan de hand is (nagemeten met kladblok/_revealcheck.mjs: nul blokken
   blijven doorzichtig). Dus: gewoon venster, scrollen, en per scherm een
   opname. */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 });
await p.goto('http://127.0.0.1:4399/nl/faq/', { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => { document.querySelectorAll('.cc, [class*="cookie"], [class*="wa-"]').forEach((e) => e.remove()); });
const open = process.argv[2] === 'open';
if (open) await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
await p.waitForTimeout(500);
const h = await p.evaluate(() => document.body.scrollHeight);
let i = 0;
for (let y = 0; y < h; y += 900) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `kladblok/_faq${open ? '-open' : ''}-${String(++i).padStart(2, '0')}.png` });
}
console.log(i, 'schermen, hoogte', h);
await b.close();
