// Herontwerp Studio (3 oktober 2026): elk tabblad op 1440 en 390, licht en donker.
import { start, SITE } from './_dl.mjs';
import fs from 'node:fs';
const D = process.argv[2] || '/tmp/claude-0/studio-nieuw';
fs.mkdirSync(D, { recursive: true });
const alleen = process.argv[3] ? process.argv[3].split(',') : null;
const volt = await fetch('http://localhost:4478/').then((r) => r.json()).then((j) => j.volt);
const tabs = [['overzicht', '/account'], ['bestellingen', '/account/orders'], ['look', '/account/brand-kit'], ['gegevens', '/account/details'], ['facturen', '/account/invoices'], ['abonnement', '/account/plan'], ['planning', '/account/plan?tab=planning'], ['producten', '/account/plan?tab=bestellen'], ['facturering', '/account/plan?tab=facturering']];
const meet = () => {
  const klein = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(e); const r = e.getBoundingClientRect();
    if (r.width && r.height && s.visibility !== 'hidden' && parseFloat(s.fontSize) < 11.5) klein.push(`${e.className || e.tagName}:${s.fontSize}`);
  }
  return { scroll: document.documentElement.scrollWidth - innerWidth, klein: [...new Set(klein)].slice(0, 6) };
};
for (const thema of ['licht', 'donker']) for (const [w, mob] of [[1440, false], [390, true]]) {
  const k = await start({ mobiel: mob, viewport: mob ? null : { width: w, height: 900 } });
  await k.ctx.addCookies([{ name: 'vis_account', value: volt.token, url: SITE }]);
  await k.page.goto(SITE + `/account?thema=${thema}`);
  for (const [n, p] of tabs) {
    if (alleen && !alleen.includes(n)) continue;
    await k.page.goto(SITE + p); await k.page.waitForTimeout(300);
    const m = await k.page.evaluate(meet);
    console.log(`${thema} ${w} ${n}: scroll ${m.scroll} ${m.klein.length ? 'KLEIN ' + m.klein.join(' ') : ''}`);
    await k.page.screenshot({ path: `${D}/${n}-${thema}-${w}.png`, fullPage: true });
  }
  await k.ctx.close?.();
}
{ const k = await start({ viewport: { width: 1440, height: 900 } }); await k.page.goto(SITE + '/account/login'); await k.page.screenshot({ path: `${D}/login-licht-1440.png` }); }
console.log('klaar');
process.exit(0);
