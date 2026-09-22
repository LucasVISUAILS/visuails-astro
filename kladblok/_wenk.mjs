import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:4399/nl/', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => { const e = document.querySelector('.scroll-wenk'); if (!e) return 'geen'; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); const h = document.querySelector('.hero').getBoundingClientRect(); return { r: [r.x, r.y, r.width, r.height], display: cs.display, opacity: cs.opacity, hero: [h.height, h.bottom] }; }));
await b.close();
