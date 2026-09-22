/* Maten van site, Studio en admin naast elkaar: container, letter, koppen, knoppen. */
import { chromium } from 'playwright';
import { startStudio, VOLT } from '../tests/lib/studio-worker.mjs';
const studio = await startStudio();
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, url: studio.url }]);
const MEET = () => {
  const cs = (el) => el && getComputedStyle(el);
  const f = (el) => el ? `${cs(el).fontFamily.split(',')[0].replace(/"/g,'')} ${cs(el).fontSize} ${cs(el).fontWeight}` : '-';
  const main = document.querySelector('main') || document.body;
  const h1 = document.querySelector('h1'); const h2 = document.querySelector('h2'); const p = document.querySelector('main p, .paneel p, p');
  const knop = document.querySelector('main .knop, main .btn, main button, .knop, .btn, button');
  const mono = document.querySelector('.mono, .meta, .label');
  const paneel = document.querySelector('.paneel, .kaart, .card, section');
  const inner = document.querySelector('main > *, .paneel');
  const r = (inner || main).getBoundingClientRect();
  return {
    body: f(document.body), h1: f(h1), h2: f(h2), p: f(p), knop: knop ? `${f(knop)} pad ${cs(knop).paddingTop}/${cs(knop).paddingLeft} r ${cs(knop).borderRadius}` : '-',
    mono: f(mono), breedte: Math.round(r.width), paneelPad: paneel ? cs(paneel).paddingTop + ' ' + cs(paneel).paddingLeft : '-', paneelR: paneel ? cs(paneel).borderRadius : '-',
  };
};
for (const [naam, url] of [['site /nl/pricing', 'http://127.0.0.1:4399/nl/pricing/'], ['studio /account', studio.url + '/account'], ['studio /account/orders', studio.url + '/account/orders']]) {
  const p = await ctx.newPage(); await p.goto(url, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  console.log(naam, JSON.stringify(await p.evaluate(MEET), null, 0));
  await p.screenshot({ path: `/tmp/claude-0/maat-${naam.split(' ')[0]}-${naam.split('/').pop()}.png`, fullPage: true });
  await p.close();
}
await ctx.close(); await b.close(); await studio.dispose();
