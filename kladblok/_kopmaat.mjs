/* Dezelfde vraag als _knopmaat.mjs, maar voor de koppen en de lopende tekst.
   "Andere elementen zijn ook uit proportie" is pas een opdracht als je weet
   welke maten er nu naast elkaar staan. */
import { chromium } from 'playwright';
import { startStudio, VOLT } from '../tests/lib/studio-worker.mjs';

const METEN = `(() => {
  const uit = {}; 
  for (const el of document.querySelectorAll('h1,h2,h3,p,li')) {
    const r = el.getBoundingClientRect(); if (!r.height) continue;
    const cs = getComputedStyle(el);
    const k = el.tagName.toLowerCase() + ' ' + Math.round(parseFloat(cs.fontSize) * 10) / 10 + 'px/' + cs.fontWeight;
    uit[k] = (uit[k] || 0) + 1;
  }
  return uit;
})()`;

function toon(naam, tel) {
  console.log('\\n══ ' + naam + ' ' + '═'.repeat(Math.max(0, 56 - naam.length)));
  const rijen = Object.entries(tel).map(([k, n]) => {
    const m = /^(\w+) ([\d.]+)px\/(\d+)$/.exec(k);
    return { tag: m[1], px: Number(m[2]), w: m[3], n };
  });
  for (const t of ['h1', 'h2', 'h3', 'p', 'li']) {
    const r = rijen.filter((x) => x.tag === t).sort((a, b) => b.px - a.px);
    if (!r.length) continue;
    console.log(' ' + t + ': ' + r.map((x) => x.px + 'px/' + x.w + '×' + x.n).join('  '));
  }
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const tel = {};
  for (const pad of ['/nl/', '/nl/catalog/', '/nl/pricing/', '/nl/how-it-works/']) {
    await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    for (const [k, n] of Object.entries(await p.evaluate(METEN))) tel[k] = (tel[k] || 0) + n;
  }
  toon('DE SITE', tel); await p.close();
}
{
  const studio = await startStudio();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, url: studio.url }]);
  const p = await ctx.newPage();
  const tel = {};
  for (const pad of ['/account', '/account/orders', '/account/plan', '/account/invoices', '/account/details']) {
    await p.goto(studio.url + pad, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    for (const [k, n] of Object.entries(await p.evaluate(METEN))) tel[k] = (tel[k] || 0) + n;
  }
  toon('VISUAILS STUDIO', tel);
  await ctx.close(); await studio.dispose();
}
await browser.close();
