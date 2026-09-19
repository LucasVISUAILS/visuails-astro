/* Nacontrole van de doorlichting-fixes op de lokale dist (19 sep 2026).
   node kladblok/dist-server.mjs & node kladblok/nacontrole-audit.mjs
   Schrijft naar kladblok/schermen/nacontrole/. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const B = process.env.BASIS || 'http://127.0.0.1:4399';
const UIT = new URL('./schermen/nacontrole/', import.meta.url).pathname;
mkdirSync(UIT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const REVEAL = '.js .reveal.pending{opacity:1!important;transform:none!important}';

async function pagina(vp, url, naam, stappen) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(B + url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: REVEAL });
  await page.waitForTimeout(300);
  const uit = await (stappen ? stappen(page) : null);
  await page.screenshot({ path: `${UIT}${naam}.png`, fullPage: !!(uit && uit.full) });
  console.log(naam, uit ? JSON.stringify(uit) : '');
  await ctx.close();
}

const D = { width: 1440, height: 900 };
const T = { width: 390, height: 844 };

// 1. Bestelformulier stap 1 — hero-hoogte, voorrangblok, aantal-chips, rail
async function aantalEen(page) {
  const chip = await page.$('.pl-qty-chip[data-pl-qty-set="1"]');
  if (chip) { await chip.click(); await page.waitForTimeout(250); }
}
await pagina(D, '/nl/start/catalog', 'catalog-stap1', async (page) => {
  await aantalEen(page);
  const hero = await page.evaluate(() => { const h = document.querySelector('.of-open'); return h ? Math.round(h.getBoundingClientRect().height) : null; });
  const railCells = await page.evaluate(() => [...document.querySelectorAll('.pl-rail > li')].filter((li) => !li.hidden).length);
  const railCols = await page.evaluate(() => { const r = document.querySelector('.pl-rail'); return r ? getComputedStyle(r).gridTemplateColumns.split(' ').length : null; });
  const chip = await page.evaluate(() => { const c = document.querySelector('.pl-qty-chip'); const cs = c && getComputedStyle(c); return cs ? { border: cs.borderStyle, deco: cs.textDecorationLine, fs: cs.fontSize } : null; });
  const chipsLabel = await page.evaluate(() => { const c = document.querySelector('.pl-qty-chips'); return c ? getComputedStyle(c, '::before').fontSize : null; });
  const voorrang = await page.evaluate(() => {
    const v = document.querySelector('.pl-voorrang'); if (!v) return null;
    const cs = getComputedStyle(v); const b = v.querySelector('b'); const bcs = b && getComputedStyle(b);
    return { border: cs.borderTopWidth + ' ' + cs.borderTopStyle, radius: cs.borderTopLeftRadius, kop: bcs && { fs: bcs.fontSize, fw: bcs.fontWeight, tt: bcs.textTransform, ff: bcs.fontFamily.slice(0, 18) } };
  });
  const dubbeleLijn = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.pl-form .dc-plain')];
    return els.map((e) => { const cs = getComputedStyle(e); return `${cs.borderTopWidth}/${cs.borderBottomWidth}${e.hidden || cs.display === 'none' ? ' (verborgen)' : ''}`; });
  });
  // voorrang zichtbaar in beeld zetten
  await page.evaluate(() => document.querySelector('.pl-voorrang')?.scrollIntoView({ block: 'center' }));
  const voorrangHidden = await page.evaluate(() => document.querySelector('[data-pl-voorrang]')?.hidden);
  return { voorrangHidden, hero, railCells, railCols, chip, chipsLabel, voorrang, dubbeleLijn };
});

// 1b. Voorrang aangevinkt
await pagina(D, '/nl/start/catalog', 'catalog-stap1-voorrang-aan', async (page) => {
  await aantalEen(page);
  const cb = await page.$('.pl-voorrang input[type=checkbox]');
  if (cb) { await cb.check(); await page.waitForTimeout(200); await page.evaluate(() => document.querySelector('.pl-voorrang')?.scrollIntoView({ block: 'center' })); }
  const border = await page.evaluate(() => { const v = document.querySelector('.pl-voorrang'); return v ? getComputedStyle(v).borderTopColor : null; });
  return { border };
});

// 2. Stapwissel: scrollpositie na "Verder" (stap 1 → 2 kan zonder invoer? anders alleen meten dat show() scrolt)
await pagina(D, '/nl/start/catalog', 'catalog-stapwissel', async (page) => {
  await page.evaluate(() => window.scrollTo(0, 1800));
  await page.waitForTimeout(100);
  const voor = await page.evaluate(() => Math.round(window.scrollY));
  const btn = await page.$('[data-pl-step="1"] [data-pl-next], .pl-step.is-on [data-pl-next], button[data-pl-next]');
  if (btn) await btn.click();
  await page.waitForTimeout(500);
  const na = await page.evaluate(() => Math.round(window.scrollY));
  const stap = await page.evaluate(() => { const s = document.querySelector('.pl-step:not([hidden]), [data-pl-step]:not([hidden])'); return s ? s.getAttribute('data-pl-step') || s.className : null; });
  const foutZichtbaar = await page.evaluate(() => { const f = document.querySelector('[role=alert]:not([hidden]), .pl-fout:not([hidden])'); return f ? f.textContent.trim().slice(0, 80) : null; });
  return { voor, na, stap, foutZichtbaar };
});

// 3. Bedankpagina: kop bij ?pay en ?paid en ?soort=aanvraag
for (const [q, naam] of [['?ref=VIS-TEST-001&pay=' + encodeURIComponent('https://www.mollie.com/checkout/select-method/abc'), 'thankyou-pay'], ['?paid=VIS-TEST-001', 'thankyou-paid'], ['?soort=aanvraag&ref=VIS-TEST-002', 'thankyou-aanvraag']]) {
  await pagina(D, '/nl/thank-you' + q, naam, async (page) => {
    const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent.trim());
    const flow = await page.evaluate(() => document.querySelector('[data-ty-flow]')?.textContent.trim().slice(0, 90));
    const timing = await page.evaluate(() => { const t = document.querySelector('[data-ty-timing]'); return t ? (t.closest('.ty-row') || t).hidden || getComputedStyle(t.closest('.ty-row') || t).display === 'none' ? 'verborgen' : 'zichtbaar' : 'geen'; });
    return { h1, flow, timing };
  });
}

// 4. Telefoon: tabellen (pricing) en beeldvormen (catalog stap 1)
await pagina(T, '/nl/pricing', 'tel-pricing', async (page) => {
  const th = await page.evaluate(() => [...document.querySelectorAll('.tabel-schuif th')].slice(0, 6).map((t) => ({ t: t.textContent.trim().slice(0, 20), w: Math.round(t.getBoundingClientRect().width), h: Math.round(t.getBoundingClientRect().height) })));
  return { th, full: true };
});
await pagina(T, '/nl/start/catalog', 'tel-catalog-stap1', async (page) => {
  await aantalEen(page);
  await page.evaluate(() => document.querySelector('.fmt-item')?.scrollIntoView({ block: 'center' }));
  const caps = await page.evaluate(() => [...document.querySelectorAll('.fmt-item')].slice(0, 4).map((i) => ({ w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height), cap: i.textContent.trim().replace(/\s+/g, ' ').slice(0, 30) })));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  return { caps, overflow };
});

// 5. Navigatie zonder koppeltekens op 958 breed, H1 op 1424
await pagina({ width: 958, height: 800 }, '/nl/', 'nav-958', async (page) => {
  const nav = await page.evaluate(() => [...document.querySelectorAll('nav a')].map((a) => ({ t: a.textContent.trim(), h: Math.round(a.getBoundingClientRect().height), hy: getComputedStyle(a).hyphens })));
  return { nav };
});
await pagina({ width: 1424, height: 900 }, '/nl/', 'h1-1424', async (page) => {
  const h1 = await page.evaluate(() => { const h = document.querySelector('h1'); return h ? { hy: getComputedStyle(h).hyphens, h: Math.round(h.getBoundingClientRect().height), lines: Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)) } : null; });
  return { h1 };
});

// 6. Lifestyle stap 1: geen lege combi-balk, geen lege haarlijnen
await pagina(D, '/nl/start/lifestyle', 'lifestyle-stap1', async (page) => {
  const balk = await page.evaluate(() => { const b = document.querySelector('.pl-combi-balk'); return b ? { hidden: b.hidden, display: getComputedStyle(b).display } : 'geen'; });
  return { balk };
});

await browser.close();
