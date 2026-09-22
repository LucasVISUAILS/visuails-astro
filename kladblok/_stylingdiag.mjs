import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const fouten = [];
p.on('pageerror', (e) => fouten.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
await p.goto('http://127.0.0.1:4399/nl/start/catalog/', { waitUntil: 'load' });
await p.waitForTimeout(800);
console.log(JSON.stringify(await p.evaluate(() => ({
  live: document.querySelector('form.is-live, [data-pl-form].is-live, .is-live') ? true : false,
  stappen: [...document.querySelectorAll('[data-pl-step]')].map(s => s.getAttribute('data-pl-step') + ':' + (s.hidden ? 'hidden' : 'zichtbaar')),
  next1: !!document.querySelector('[data-pl-step="1"] [data-pl-next]'),
  err1: document.querySelector('#pl-err-1')?.textContent,
  styling: !!document.querySelector('[data-pl-styling]'),
})), null, 1));
await p.evaluate(() => { const i = document.querySelector('[data-pl-qty-input]'); i.value = '3'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); });
await p.waitForTimeout(300);
await p.evaluate(() => { const b2 = document.querySelector('[data-pl-step="1"] [data-pl-next]'); if (b2) b2.click(); });
await p.waitForTimeout(700);
console.log(JSON.stringify(await p.evaluate(() => ({
  stappen: [...document.querySelectorAll('[data-pl-step]')].map(s => s.getAttribute('data-pl-step') + ':' + (s.hidden ? 'hidden' : 'zichtbaar')),
  err1: document.querySelector('[data-pl-step="1"] [data-pl-step-error]')?.textContent,
  kaarten: document.querySelectorAll('[data-pl-cards] > li').length,
  rijen: document.querySelectorAll('[data-pl-styling-rows] > li').length,
  actief: document.querySelector('.pl-step.is-active, [data-pl-step][aria-current]')?.getAttribute('data-pl-step'),
  stylingZichtbaar: (() => { const e = document.querySelector('[data-pl-styling]'); const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })(),
})), null, 1));
console.log('fouten:', fouten);
await b.close();
