// Ronde 9 · klanttype 14: tablet 768 × 1024 (touch), lifestyle Glow, 2 producten — elke stap vastgelegd.
import { start, SITE, sql } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
const email = `tablet${Date.now() % 100000}@merk.test`;
const k = await start({ viewport: { width: 768, height: 1024 }, touch: true });
const { page, fouten } = k;
const D = '/tmp/claude-0/kb';
const breedte = async (wat) => {
  const r = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    te: [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 4).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join('.')}`),
  }));
  console.log(`${wat}: scrollWidth ${r.sw} / ${r.cw}${r.te.length ? ' — breder: ' + r.te.join(', ') : ''}`);
};
await page.goto(SITE + '/nl/stijlen/glow'); await page.waitForTimeout(800); await breedte('glow-pagina'); await page.screenshot({ path: `${D}/t-glow.png` });
const r = await bestel(page, {
  pad: '/nl/start/lifestyle/?style=glow', aantal: 2, look: 'glow',
  klant: { email, first_name: 'Tessa', last_name: 'Tablet', brand: 'Merk Tablet' }, land: 'NL', vat: null,
  stap1: async (p) => { await breedte('stap 1'); await p.screenshot({ path: `${D}/t-stap1.png`, fullPage: true }); },
  stap2: async (p) => { await breedte('stap 2'); await p.screenshot({ path: `${D}/t-stap2.png`, fullPage: true }); },
  stap3: async (p) => { await breedte('stap 3'); await p.screenshot({ path: `${D}/t-stap3.png`, fullPage: true }); },
  stap5: async (p) => { await breedte('stap 5'); await p.screenshot({ path: `${D}/t-stap5.png`, fullPage: true }); },
});
console.log('log:', r.log.join(' | '));
console.log('overzicht:', r.overzicht.replace(/\s+/g, ' ').slice(0, 600));
console.log('api', r.apiStatus, r.url.replace(SITE, ''));
if (/4478|nep-mollie/.test(page.url())) await betaal(page);
await page.waitForTimeout(1000); await breedte('bedankt'); await page.screenshot({ path: `${D}/t-bedankt.png`, fullPage: true });
console.log('db:', JSON.stringify(await sql(`SELECT ref, service, product_count, total_cents, vat_cents, payment_status FROM orders WHERE email='${email}'`)));
console.log('fouten:', fouten.slice(0, 8));
process.exit(0);
