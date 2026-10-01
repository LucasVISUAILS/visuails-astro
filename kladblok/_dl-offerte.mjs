// Offerte in admin op een aanvraag (eigen look / video) → mail → betalen.
import { start, foto, tekst, mails, mailtekst, paneel, sql, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { betaal } from './_bestel.mjs';
const [id, bedrag] = [process.argv[2], process.argv[3] || '1250'];
const s = await start(); const { page } = s;
await adminLogin(page);
await page.goto(SITE + '/admin/vat', { waitUntil: 'load' });
console.log('STAAT OP BTW-LIJST:', (await tekst(page, 'main, body')).includes((await sql(`SELECT ref FROM orders WHERE id=${id}`))[0].ref));
await page.goto(SITE + `/admin/orders/${id}/files`, { waitUntil: 'load' });
const t = (await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n');
console.log('ORDERPAGINA:\n' + t.slice(0, 3000));
await foto(page, `admin-order-${id}`, { vol: true });
const f = page.locator(`form[action="/admin/orders/${id}/quote"]`);
console.log('offerteformulier:', await f.count(), await f.first().innerText().catch(() => '-'));
const voor = (await mails()).length;
await f.locator('input[name="amount"]').fill(bedrag);
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), f.locator('button[type="submit"]').click()]);
console.log('na offerte →', page.url());
console.log((await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n').slice(0, 1200));
await foto(page, `admin-order-${id}-offerte`, { vol: true });
for (const m of (await mails()).slice(voor)) {
  console.log(`MAIL → ${JSON.stringify(m.to)} "${m.subject}"`); 
}
const n = (await mails()).length;
const html = String(await paneel(`/mail/${n}`));
console.log(String(await mailtekst(n)).slice(0, 1200));
const link = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')).find((h) => /checkout|order-pay/.test(h));
console.log('link', link);
await page.goto(link.replace(/^https?:\/\/[^/]+(?=\/api)/, SITE), { waitUntil: 'load' });
console.log('landt op', page.url());
if (/nep-mollie|4478/.test(page.url())) { console.log('na betalen', await betaal(page, 'paid')); await page.waitForTimeout(5000); console.log((await tekst(page, 'main')).replace(/\n{2,}/g, '\n').slice(0, 500)); }
console.log(JSON.stringify(await sql(`SELECT status, payment_status, total_cents, vat_cents FROM orders WHERE id=${id}`)));
console.log(s.fouten.filter((x) => !/account\/me/.test(x))); await s.stop();
