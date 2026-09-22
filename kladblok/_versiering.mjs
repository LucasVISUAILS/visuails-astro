/* Laat zien WELKE aria-hidden versiering onder de contrastnorm zit. Zelfde
   meting als leesbaar-alles.mjs, maar dan met de lijst erbij. */
import { chromium } from 'playwright';
const PADEN = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
for (const pad of PADEN) {
  const r = await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' }).catch(() => null);
  if (!r || r.status() !== 200) continue;
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(x => setTimeout(x, 40)); } window.scrollTo(0,0); });
  await p.waitForTimeout(400);
  const uit = await p.evaluate(() => {
    const res = [];
    for (const el of document.querySelectorAll('[aria-hidden="true"], [aria-hidden="true"] *')) {
      if (!el.checkVisibility?.()) continue;
      const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
      if (!t) continue;
      const s = getComputedStyle(el);
      res.push({ k: el.tagName.toLowerCase() + '.' + String(el.className).split(' ').filter(Boolean).slice(0,2).join('.'),
                 px: Math.round(parseFloat(s.fontSize)), kleur: s.color, t: t.slice(0, 18) });
    }
    return res;
  });
  const uniek = new Map(); for (const x of uit) uniek.set(x.k + x.px, x);
  if (uniek.size) { console.log('\n' + pad); for (const v of uniek.values()) console.log(`   ${v.k.padEnd(28)} ${String(v.px).padStart(3)}px ${v.kleur.padEnd(22)} "${v.t}"`); }
}
await b.close();
