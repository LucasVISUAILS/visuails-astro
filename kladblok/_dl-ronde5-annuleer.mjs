// Ronde 5 · A2.7: een bestelling met tegoed annuleren (terugbetalen) via /admin.
import { start, sql, paneel, mails, mailtekst, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { VOLT } from '../tests/lib/studio-seed.mjs';

const uit = (...a) => console.log(...a);
const s = await start();
const { page } = s;
await adminLogin(page);
const orders = await sql(`SELECT id, ref, payment_status, payment_provider FROM orders WHERE customer_id = ${VOLT.id} AND payment_status = 'paid' ORDER BY id DESC LIMIT 2`);
uit(orders);
for (const o of orders) {
  uit(`\n## annuleren ${o.ref} (${o.payment_provider})`);
  const voor = (await mails()).length;
  await page.goto(`${SITE}/admin?q=${o.ref}`, { waitUntil: 'load' });
  const blok = await page.evaluate(() => document.querySelector('.danger-body')?.innerText || document.body.innerText.match(/Annuleren[\s\S]{0,600}/)?.[0]);
  uit('tegoedblok/annuleren:', String(blok).replace(/\n+/g, ' | ').slice(0, 500));
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  await page.fill('form[action$="/cancel"] input[name="reason"]', 'Proef: klant zag ervan af');
  await page.selectOption('form[action$="/cancel"] select[name="payment"]', 'refund');
  const bevestig = page.locator('form[action$="/cancel"] input[type="checkbox"]');
  for (let i = 0; i < await bevestig.count(); i++) await bevestig.nth(i).check();
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator('form[action$="/cancel"] button[type="submit"]').click()]);
  uit('naar:', page.url());
  uit(await sql(`SELECT delta_cents, reason FROM customer_credits WHERE order_id = ${o.id} ORDER BY id`));
  uit(await sql(`SELECT note, actor FROM order_events WHERE order_id = ${o.id} AND status = 'cancelled'`));
  uit(await sql(`SELECT number, total_cents FROM credit_notes WHERE order_id = ${o.id}`).catch((e) => String(e)));
  const refunds = await paneel('/refunds').catch(() => null);
  if (Array.isArray(refunds)) uit('refunds:', JSON.stringify(refunds.slice(-2)));
  for (const m of (await mails()).slice(voor)) { uit(`MAIL → ${JSON.stringify(m.to)} "${m.subject}"`); if (/geannuleerd|cancel/i.test(m.subject)) uit((await mailtekst(m.n)).slice(0, 700)); }
}
uit('\nsaldo:', await sql(`SELECT SUM(delta_cents) AS c FROM customer_credits WHERE customer_id = ${VOLT.id}`));
uit('fouten:', s.fouten);
await s.stop();
