import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const fouten = [];
p.on('pageerror', (e) => fouten.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fouten.push(m.type() + ': ' + m.text()); });
const pad = process.argv[2] || '/nl/start/catalog/';
await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => document.querySelectorAll('.cc,[class*="cookie"]').forEach(e => e.remove()));
const zet = (sel, val) => p.evaluate(([s2, v]) => { const e = document.querySelector(s2); if (!e) return false; e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); return true; }, [sel, val]);
await p.evaluate(() => { const i = document.querySelector('[data-pl-qty-input]'); i.value = '3'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); });
await p.waitForTimeout(300);
/* naar stap 2 */
await p.evaluate(() => { const b2 = document.querySelector('[data-pl-step="1"] [data-pl-next]'); if (b2) b2.click(); });
await p.waitForTimeout(700);
/* type voor alles + naam op kaart 1 */
if (!(await zet('[data-pl-garment]', 'top'))) fouten.push('geen garment-select');
await p.evaluate(() => { const i = document.querySelector('input[name="product_p1"]'); if (i) { i.value = 'Boxy hoodie · zwart'; i.dispatchEvent(new Event('change', { bubbles: true })); } });
await p.waitForTimeout(300);
/* rij 2 afwijken naar broek */
if (!(await zet('select[name="garment_p2"]', 'trousers'))) fouten.push('geen garment_p2');
await p.waitForTimeout(300);
const sec = await p.$('[data-pl-styling]');
if (sec) { await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await sec.screenshot({ path: 'kladblok/kledingproef/echt-styling.png' }); }
else fouten.push('geen [data-pl-styling] gevonden');
console.log(JSON.stringify(await p.evaluate(() => ({
  rijen: document.querySelectorAll('[data-pl-styling-rows] > li').length,
  ctxVakjes: [...document.querySelectorAll('[data-pl-styling-rows] .pu-slot')].map(e => e.dataset.puSlot),
  velden: [...document.querySelectorAll('[data-pl-styling-rows] input[type=hidden]')].map(e => e.name + '=' + e.value),
  oudDisabled: [...document.querySelectorAll('[data-pl-ctx] select')].every(s => s.disabled),
  ons: [...document.querySelectorAll('.st-ons')].map(e => e.textContent),
})), null, 1));
console.log('fouten:', fouten.length ? fouten : 'geen');
await b.close();
