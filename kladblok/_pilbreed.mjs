/* Staat er ergens een statuspil die uitrekt? Meet elke .stand op de gebouwde
   site + de Studio-pagina's en meldt alles breder dan 320px. */
import { chromium } from 'playwright';
import { startStudio, VOLT } from '../tests/lib/studio-worker.mjs';
const studio = await startStudio();
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, url: studio.url }]);
let n = 0;
for (const pad of ['/account', '/account/orders', '/account/invoices', '/account/plan']) {
  const p = await ctx.newPage();
  await p.goto(studio.url + pad, { waitUntil: 'load' });
  const breed = await p.evaluate(() => [...document.querySelectorAll('.stand')]
    .map((e) => ({ w: Math.round(e.getBoundingClientRect().width), t: e.textContent.trim().slice(0, 24) }))
    .filter((x) => x.w > 320));
  for (const x of breed) { console.log(pad, x.w + 'px', x.t); n++; }
  await p.close();
}
console.log(n === 0 ? 'geen uitgerekte pil in Studio' : `${n} uitgerekte pil(len)`);
await b.close(); await studio.dispose();
