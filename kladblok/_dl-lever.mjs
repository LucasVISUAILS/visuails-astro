// Volledige keten: klant bestelt + betaalt → admin levert → status geleverd → klant keurt goed → feedback.
import { start, foto, tekst, sql, mails, mailtekst, paneel, SITE, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { bestel, betaal } from './_bestel.mjs';
const email = process.argv[2] || 'lever@merk.test';
const s = await start(); const { page } = s;
const r = await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Lies', last_name: 'Lever', brand: 'Lever BV' }, land: 'NL', vat: null });
if (/nep-mollie/.test(page.url())) await betaal(page);
await page.waitForTimeout(3000);
const [o] = await sql("SELECT id, ref, payment_status FROM orders ORDER BY id DESC LIMIT 1");
console.log('bestelling', o);
const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + `/admin/orders/${o.id}/files`, { waitUntil: 'load' });
console.log(JSON.stringify(await a.page.evaluate(() => [...document.querySelectorAll('form')].map((f) => f.getAttribute('action') + ' :: ' + [...f.elements].filter(e => e.name).map((e) => `${e.tagName}/${e.type} ${e.name}=${(e.value || '').slice(0, 20)}${e.multiple ? '[multi]' : ''}${e.webkitdirectory ? '[dir]' : ''}`).join(', ')).filter((x) => /deliver|status|announce/.test(x))), null, 1));
console.log(a.fouten); await a.stop(); await s.stop();
