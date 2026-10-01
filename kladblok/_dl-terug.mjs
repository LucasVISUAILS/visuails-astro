// Terugknop na Mollie, en dubbel klikken op versturen.
import { start, tekst, sql, SITE, foto } from './_dl.mjs';
import { bestel } from './_bestel.mjs';
const s = await start(); const { page } = s;
const voor = (await sql('SELECT COUNT(*) n FROM orders'))[0].n;
const r = await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email: 'terug@merk.test' }, land: 'NL', vat: null });
console.log('na versturen:', page.url(), 'orders +', (await sql('SELECT COUNT(*) n FROM orders'))[0].n - voor);
await page.goBack({ waitUntil: 'load' }).catch((e) => console.log('goBack', e.message));
await page.waitForTimeout(1500);
console.log('terug op:', page.url());
const st = await page.evaluate(() => ({ stap: document.querySelector('.pl-step.is-current')?.dataset.plStep, knop: document.querySelector('[data-pl-submit]')?.disabled, tekst: document.querySelector('[data-pl-submit]')?.textContent?.trim(), sending: document.querySelector('#pl-form')?.classList.contains('is-sending') }));
console.log('staat:', st);
const banner = await page.evaluate(() => { const b = document.querySelector('[data-pl-open]'); return b && !b.hidden ? b.innerText.replace(/\s+/g, ' ') + ' | pay=' + b.querySelector('[data-pl-open-pay]').getAttribute('href') : '(geen banner)'; });
console.log('banner:', banner);
await foto(page, 'terug-na-mollie');
const pay = await page.locator('[data-pl-open-pay]').getAttribute('href').catch(() => null);
if (pay) { const r2 = await page.request.get(SITE + pay, { maxRedirects: 0 }); console.log('betaalknop →', r2.status(), r2.headers().location); }
await page.locator('[data-pl-open-new]').click().catch(() => {});
console.log('na nieuw:', await page.evaluate(() => document.querySelector('[data-pl-open]').hidden), await page.evaluate(() => sessionStorage.getItem('vis-open-order')));
console.log((await tekst(page, 'main')).replace(/\s+/g, ' ').slice(0, 300));
console.log(s.fouten.filter((x) => !/account\/me/.test(x))); await s.stop();
