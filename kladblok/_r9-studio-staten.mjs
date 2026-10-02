// Ronde 9 · stap 4: elke bestelstatus zoals de klant hem in Studio ziet (status via de database gezet).
import { start, SITE, sql, sqlw } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { studioLogin } from './_studio.mjs';
const email = `staat${Date.now() % 100000}@merk.test`;
const k = await start(); const { page } = k;
await sqlw('DELETE FROM rate_limits');
await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Sta', brand: 'Merk Staat' }, land: 'NL', vat: null });
if (/4478|nep-mollie/.test(page.url())) await betaal(page);
const [o] = await sql(`SELECT id, ref FROM orders WHERE email='${email}'`);
await studioLogin(page, email);
const staten = [
  ['onbetaald', `payment_status='unpaid', status='received', review_state=NULL`],
  ['wacht op btw-controle', `payment_status='unpaid', status='received', review_state='pending'`],
  ['betaald', `payment_status='paid', status='received', review_state=NULL`],
  ['in productie', `status='in_production'`],
  ['in controle', `status='human_check'`],
  ['geleverd', `status='delivered', delivered_at=datetime('now'), closed_at=NULL`],
  ['afgerond', `status='delivered', closed_at=datetime('now')`],
  ['geannuleerd + tegoed', `status='cancelled', cancel_payment='credit', closed_at=NULL`],
  ['geannuleerd + terugbetaald', `status='cancelled', cancel_payment='refund', payment_status='refunded', refunded_cents=total_cents+vat_cents`],
  ['terugbetaald zonder annuleren', `status='delivered', cancel_payment=NULL, payment_status='refunded', refunded_cents=total_cents+vat_cents, closed_at=datetime('now')`],
];
for (const [naam, set] of staten) {
  await sqlw(`UPDATE orders SET ${set} WHERE id=${o.id}`);
  await page.goto(`${SITE}/account/orders?order=${o.id}&r=${Math.random()}#order-${o.id}`); await page.waitForTimeout(400);
  const v = await page.evaluate((id) => {
    const c = document.getElementById(`order-${id}`); if (!c) return null;
    return { pil: c.querySelector('.st-pil, [class*="pil"]')?.textContent.trim(), nu: (c.innerText.match(/Nu: [^\n]*/) || [''])[0], geld: (c.querySelector('.st-betaal')?.innerText || '').replace(/\s+/g, ' ').slice(0, 90), knop: [...c.querySelectorAll('.st-betaal a, .st-betaal button')].map((b) => b.textContent.trim()).join(',') };
  }, o.id);
  console.log(`${naam.padEnd(30)} ${v ? `[${v.pil}] ${v.nu} | ${v.geld}${v.knop ? ' | knop: ' + v.knop : ''}` : 'kaart niet gevonden'}`);
}
/* Beelden verlopen: een geleverde bestelling met bestanden waarvan de termijn voorbij is. */
await sqlw(`UPDATE orders SET status='delivered', payment_status='paid', refunded_cents=0, closed_at=datetime('now'), cancel_payment=NULL WHERE id=${o.id}`);
await sqlw(`INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot, expires_at) VALUES (${o.id}, 'delivery', 'delivery/${o.ref}/x.jpg', 'x.jpg', 100, 'p1', 'front', datetime('now','-1 day'))`).catch((e) => console.log('insert', e.message));
await page.goto(`${SITE}/account/orders?order=${o.id}&r=2#order-${o.id}`); await page.waitForTimeout(400);
console.log('beelden verlopen:', (await page.evaluate((id) => document.getElementById(`order-${id}`)?.innerText.replace(/\s+/g, ' ').slice(0, 600), o.id)));
process.exit(0);
