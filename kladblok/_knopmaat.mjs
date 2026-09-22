/* VISUAILS — de maat van elk knopje, op alle drie de schermen naast elkaar.
 *
 * Lucas: *"Waar ik nog steeds tegenaan loop in /admin en visuails studio is dat
 * sommige knoppen overdreven groot zijn en andere elementen ook uit proportie
 * zijn. Dit moet echt veel consistenter met de website worden."*
 *
 * Dit script meet in plaats van te kijken: het pakt elke knop, elk <a class=knop>
 * en elke <button> op de site, in Studio en in /admin, en zet er de vier maten
 * bij die een knop een maat geven — hoogte, lettergrootte, zijpadding en
 * ronding. Wat eruit rolt is een tabel per scherm, gesorteerd op hoogte, zodat
 * "overdreven groot" een getal wordt.
 *
 *   node kladblok/_knopmaat.mjs           (vereist: npm run build, en de
 *                                          dist-server op 4399 voor de site)
 */
import { chromium } from 'playwright';
import { startStudio, VOLT } from '../tests/lib/studio-worker.mjs';

const METEN = `(() => {
  const uit = [];
  const zien = new Set();
  for (const el of document.querySelectorAll('a.knop, button, .knop, [class*="knop"], .btn, [class*="-btn"]')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    const klas = (el.className || '').toString().trim().split(/\\s+/).slice(0, 3).join(' ');
    const sleutel = klas + '|' + Math.round(r.height);
    if (zien.has(sleutel)) continue;
    zien.add(sleutel);
    uit.push({
      klas: klas || el.tagName.toLowerCase(),
      h: Math.round(r.height),
      fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      px: cs.paddingLeft + '/' + cs.paddingRight,
      r: cs.borderRadius.split(' ')[0],
      tekst: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24),
    });
  }
  return uit;
})()`;

function tabel(naam, rijen) {
  console.log('\\n══ ' + naam + ' ' + '═'.repeat(Math.max(0, 62 - naam.length)));
  rijen.sort((a, b) => b.h - a.h || b.fs - a.fs);
  for (const r of rijen) {
    console.log(
      String(r.h).padStart(4) + 'px  ' +
      (r.fs + 'px').padStart(7) + '  ' +
      r.px.padStart(18) + '  ' +
      r.r.padStart(7) + '  ' +
      r.klas.padEnd(34).slice(0, 34) + '  ' + r.tekst,
    );
  }
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

/* ── 1 · de site ── */
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const alles = new Map();
  for (const pad of ['/nl/', '/nl/catalog/', '/nl/pricing/', '/nl/start/', '/nl/how-it-works/']) {
    await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    for (const r of await p.evaluate(METEN)) alles.set(r.klas + '|' + r.h, r);
  }
  tabel('DE SITE', [...alles.values()]);
  await p.close();
}

/* ── 2 · Studio ── */
{
  const studio = await startStudio();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, url: studio.url }]);
  const p = await ctx.newPage();
  const alles = new Map();
  for (const pad of ['/account', '/account/orders', '/account/plan', '/account/plan?tab=planning', '/account/plan?tab=bestellen', '/account/details', '/account/invoices']) {
    await p.goto(studio.url + pad, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    for (const r of await p.evaluate(METEN)) alles.set(r.klas + '|' + r.h, r);
  }
  tabel('VISUAILS STUDIO', [...alles.values()]);
  await ctx.close();
  await studio.dispose();
}

await browser.close();
