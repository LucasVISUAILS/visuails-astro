import { start, foto, tekst, sql, mails, mailtekst, paneel, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { bestel, betaal } from './_bestel.mjs';
const s = await start(); const { page } = s;
// 1 · een NL-bestelling met KVK: label + validatie
await page.goto(SITE + '/nl/start/catalog', { waitUntil: 'load' });
const r = await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email: 'us@brand.test', first_name: 'Ava' }, land: 'US', vat: null,
  stap3: async (p) => {} });
console.log('US bestelling', r.apiStatus, r.url);
const [o] = await sql("SELECT id, ref, review_state FROM orders ORDER BY id DESC LIMIT 1"); console.log(o);
let n0 = (await mails()).length;
console.log('mails bij bestellen:', (await mails()).slice(-3).map((m) => m.subject));
const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + '/admin/vat', { waitUntil: 'load' });
console.log('knoppen:', await a.page.locator(`form[action="/admin/orders/${o.id}/vat"] button`).allInnerTexts());
await Promise.all([a.page.waitForNavigation(), a.page.locator(`form[action="/admin/orders/${o.id}/vat"]:has(input[value="approve"]) button`).click()]);
const lijst = await mails(); const m = lijst[lijst.length - 1];
console.log('MAIL', m.subject); console.log(String(await mailtekst(m.n)).slice(0, 700));
const html = String(await paneel('/mail/' + m.n));
const link = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1].replace(/&amp;/g, '&')).find((h) => /order-pay/.test(h));
console.log('link', link);
await page.goto(link, { waitUntil: 'load' }).catch((e) => console.log('goto fout', e.message));
console.log('landt op', page.url());
if (/nep-mollie/.test(page.url())) { console.log(await betaal(page)); await page.waitForTimeout(4000); console.log((await tekst(page, 'main')).replace(/\n{2,}/g, '\n').slice(0, 700)); await foto(page, 'verif-bedankt-na-maillink'); }
console.log(JSON.stringify(await sql(`SELECT payment_status FROM orders WHERE id=${o.id}`)));
console.log(s.fouten, a.fouten); await a.stop(); await s.stop();
