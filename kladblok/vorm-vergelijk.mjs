/* WAT MAAKT HET PROEFFORMULIER GROTER DAN HET BETAALDE — 10 september 2026 */
import { chromium } from 'playwright';
const B = process.env.BASIS || 'http://127.0.0.1:4331';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [pad, naam] of [['/test-sample/', 'PROEF'], ['/start/catalog/', 'CATALOG']]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.goto(`${B}${pad}`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { for (const k of document.querySelectorAll('button, a')) if (/noodzakelijke|akkoord|accepteer/i.test(k.textContent || '')) k.click(); });
  await p.waitForTimeout(500);
  const u = await p.evaluate(() => {
    const zichtbaar = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    const of = document.querySelector('.of');
    const loop = (el, diepte) => [...el.children].filter(zichtbaar).flatMap((e) => {
      const h = Math.round(e.getBoundingClientRect().height);
      const naam = e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '');
      const w = (e.innerText.match(/\S+/g) || []).length;
      const rij = { naam, h, w, diepte };
      return diepte < 2 && h > 120 ? [rij, ...loop(e, diepte + 1)] : [rij];
    });
    return { totaal: Math.round(of.getBoundingClientRect().height), rijen: loop(of, 0) };
  });
  console.log(`\n══ ${naam} — .of is ${u.totaal}px`);
  for (const r of u.rijen) console.log(`   ${'  '.repeat(r.diepte)}${String(r.h).padStart(5)}px ${String(r.w).padStart(4)}w  ${r.naam}`);
  await p.close();
}
await b.close();
