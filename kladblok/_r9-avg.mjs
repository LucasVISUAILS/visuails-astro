// Ronde 9 · stap 6.5: AVG-verzoek — klant met betaalde bestelling + factuur wissen in /admin; wat verdwijnt, wat blijft.
import { start, SITE, sql, sqlw } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { adminLogin } from './_admin.mjs';
const k = await start(); const { page } = k;
const uit = [];
await sqlw('DELETE FROM rate_limits');
const email = `avg${Date.now() % 100000}@merk.test`;
await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Avg', brand: 'Merk AVG' }, land: 'NL', vat: null });
if (/4478|nep-mollie/.test(page.url())) await betaal(page);
await page.waitForTimeout(800);
const [o] = await sql(`SELECT id, ref, customer_id FROM orders WHERE email='${email}'`);
const telling = async () => {
  const [r] = await sql(`SELECT
    (SELECT COUNT(*) FROM customers WHERE id=${o.customer_id}) AS klant,
    (SELECT COUNT(*) FROM orders WHERE customer_id=${o.customer_id} OR email='${email}') AS bestellingen,
    (SELECT COUNT(*) FROM files WHERE order_id=${o.id}) AS bestanden,
    (SELECT COUNT(*) FROM invoices WHERE order_id=${o.id}) AS facturen,
    (SELECT COUNT(*) FROM account_sessions s WHERE s.customer_id=${o.customer_id}) AS sessies`).catch(async () => sql(`SELECT
    (SELECT COUNT(*) FROM customers WHERE id=${o.customer_id}) AS klant,
    (SELECT COUNT(*) FROM orders WHERE customer_id=${o.customer_id} OR email='${email}') AS bestellingen,
    (SELECT COUNT(*) FROM files WHERE order_id=${o.id}) AS bestanden,
    (SELECT COUNT(*) FROM invoices WHERE order_id=${o.id}) AS facturen`));
  return JSON.stringify(r);
};
uit.push(`vóór: ${o.ref} · ${await telling()}`);
const admin = await k.ctx.newPage(); await adminLogin(admin);
await admin.goto(`${SITE}/admin/customers/${o.customer_id}`);
const paneel = await admin.evaluate(() => { const d = document.querySelector('details.danger'); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 600) : 'geen paneel'; });
uit.push(`paneel: ${paneel}`);
const post = async (waarde) => {
  await admin.goto(`${SITE}/admin/customers/${o.customer_id}`);
  await admin.evaluate((w) => { const f = document.querySelector('form[action$="/wipe"]'); f.elements.confirm.value = w; f.requestSubmit(); }, waarde);
  await admin.waitForLoadState('load'); await admin.waitForTimeout(600);
  return `${admin.url().replace(SITE, '')} — ${(await admin.evaluate(() => (document.querySelector('main .okline, main .err, main .notice, main .warnline, main p')?.textContent || '').trim().slice(0, 200)))}`;
};
uit.push(`verkeerde naam: ${await post('Merk Fout')}`);
uit.push(`  na verkeerde naam: ${await telling()}`);
uit.push(`goede naam: ${await post('Merk AVG')}`);
uit.push(`  na wissen: ${await telling()}`);
const [inv] = await sql(`SELECT number, customer_id, substr(snapshot_json,1,160) AS snap FROM invoices WHERE order_id=${o.id}`).catch(() => [null]);
uit.push(`  factuur na wissen: ${inv ? JSON.stringify(inv) : 'geen'}`);
const r = await k.page.request.get(`${SITE}/account/orders`, { maxRedirects: 0 });
uit.push(`  klant opent Studio daarna: ${r.status()} ${r.headers().location || ''}`);
console.log(uit.join('\n'));
process.exit(0);
