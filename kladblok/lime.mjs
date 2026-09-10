/* Waar staat het limegroen, en is het daar een KNOP, een STATUS of decoratie?
   Manus: "de limegroene accentkleur is zeer aanwezig (…) reserveer lime voor
   interactie, status en highlights". Dat is te meten in plaats van te vinden. */
import { chromium } from 'playwright';
const B = 'http://127.0.0.1:4340';
const PADEN = ['/', '/start/', '/pricing/', '/catalog/', '/lifestyle/', '/gallery/', '/how-it-works/', '/start/plan/'];
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await br.newPage({ viewport: { width: 1440, height: 900 } });
const LIME = /rgb\(2[01][0-9], 2[12][0-9], (7[0-9]|6[0-9]|4[0-9])\)|rgb\(200, 242, 6\)|210, 224, 74/;
let totaal = 0;
for (const pad of PADEN) {
  await pg.goto(B + pad, { waitUntil: 'load' });
  await pg.waitForTimeout(500);
  const hits = await pg.evaluate((re) => {
    const rx = new RegExp(re);
    const uit = [];
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el);
      const b = s.backgroundColor, c = s.color, o = s.borderColor;
      const waar = [];
      if (rx.test(b)) waar.push('vlak');
      if (rx.test(c)) waar.push('tekst');
      if (rx.test(o) && parseFloat(s.borderTopWidth) > 0) waar.push('rand');
      if (!waar.length) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 3 || r.height < 3) continue;
      const klikbaar = !!el.closest('a,button,label,summary,[role="button"]');
      uit.push({
        tag: el.tagName.toLowerCase(),
        klas: (el.className && String(el.className).slice(0, 40)) || '',
        waar: waar.join('+'),
        opp: Math.round(r.width * r.height),
        klikbaar,
        tekst: (el.textContent || '').trim().slice(0, 26),
      });
    }
    return uit;
  }, LIME.source);
  const deco = hits.filter((h) => !h.klikbaar);
  totaal += hits.length;
  console.log(`\n${pad}  ${hits.length} limegroene elementen, waarvan ${deco.length} niet klikbaar`);
  for (const d of deco) console.log(`   decoratief: ${d.tag}.${d.klas} (${d.waar}, ${d.opp}px²) "${d.tekst}"`);
}
console.log(`\ntotaal ${totaal}`);
await br.close();
