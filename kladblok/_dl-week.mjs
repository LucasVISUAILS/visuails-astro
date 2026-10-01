import { start, foto, tekst, mails, mailtekst, sql, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const s = await start(); const { page } = s;
await adminLogin(page);
const cid = (await sql("SELECT id FROM customers WHERE email='yara@merk.test'"))[0].id;
const voor = (await mails()).length;
await page.goto(SITE + `/admin/customers/${cid}`, { waitUntil: 'load' });
const f = page.locator(`form[action="/admin/customers/${cid}/week"]`);
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), f.locator('button[type="submit"]').click()]);
console.log('na week:', page.url());
const t = (await tekst(page, 'body')).replace(/\n{2,}/g, '\n');
console.log(t.slice(t.indexOf('ABONNEMENTSWEEK'), t.indexOf('ABONNEMENTSWEEK') + 800));
console.log(t.slice(t.indexOf('ORDERS'), t.indexOf('ORDERS') + 400));
for (const m of (await mails()).slice(voor)) { console.log(`MAIL #${m.n} → ${JSON.stringify(m.to)} "${m.subject}"`); console.log((await mailtekst(m.n)).slice(0, 1200)); }
console.log(await sql(`SELECT id, ref, service, status, product_count, total_cents, payment_status, details_json FROM orders WHERE customer_id=${cid}`));
console.log(await sql(`SELECT id, name, kind, locked_at, order_id FROM plan_queue WHERE customer_id=${cid}`));
console.log(s.fouten);
await s.stop();
