import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const w of [1440, 390]) {
const p = await b.newPage({ viewport: { width: w, height: 900 } });
await p.goto('http://127.0.0.1:4399/nl/', { waitUntil: 'networkidle' });
for (let y = 0; y < 11000; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(80); }
console.log(w, JSON.stringify(await p.evaluate(() => {
  const L = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.height)]; };
  const pan = document.querySelector('.vn'); const cs = getComputedStyle(pan);
  return { vnH2: L('.vn h2'), vwH2: L('.vw h2'), edH2: L('.ed h2'), edBeeld: L('.ed-beeld'), vnPanel: L('.vn'), vnPad: cs.paddingLeft + ' ' + cs.marginLeft, ssRij: L('.ss-rij'),
    faces: [...document.querySelectorAll('.gz-foto img')].map((i) => i.complete && i.naturalWidth > 0),
    secties: [...document.querySelectorAll('.s22.thuis > section, .s22.thuis > ul')].map((s) => (s.className.split(' ').slice(0,3).join('.') || s.tagName) + ':' + Math.round(s.getBoundingClientRect().height)),
  };
})));
await p.close(); }
await b.close();
