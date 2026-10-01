/*
 * Een bestelling die HELEMAAL met tegoed betaald wordt — 29 september 2026.
 *
 * Dan gaat er geen betaling naar Mollie en komt er dus ook geen webhook. Wat de
 * webhook bij een betaling doet (functions/api/webhook/mollie.js, recordPaid),
 * gebeurt dan hier, in dezelfde volgorde: op betaald zetten, het tegoed
 * afboeken, de tijdlijn, het logboek, het bericht aan de studio, de factuur.
 * Zie de kop van src/lib/tegoedVerrekening.js.
 */
import { boekTegoedAf, tegoedOpBestelling, brutoVan } from './tegoedVerrekening.js';
import { issueInvoice } from './invoice.js';
import { mailInvoice } from './invoiceMail.js';
import { notifyPaid } from './notify.js';

export async function betaalVolledigMetTegoed(env, orderId) {
  const order = await env.DB.prepare(
    'SELECT id, ref, customer_id, status, payment_status, total_cents, vat_cents, details_json, lang, email FROM orders WHERE id = ?1'
  ).bind(orderId).first();
  if (!order) return false;
  const tegoed = tegoedOpBestelling(order);
  if (!(tegoed > 0) || tegoed < brutoVan(order)) return false;

  const gezet = await env.DB.prepare(
    `UPDATE orders SET payment_status = 'paid', payment_provider = 'tegoed', paid_at = datetime('now'),
                       window_expires_at = NULL
      WHERE id = ?1 AND COALESCE(payment_status, 'unpaid') NOT IN ('paid', 'refunded')
      RETURNING id`
  ).bind(order.id).first();
  if (!gezet) return false;

  await boekTegoedAf(env, order);
  const nl = order.lang === 'nl';
  await env.DB.prepare('INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, ?4)')
    .bind(order.id, order.status || 'received',
      nl ? 'Betaald met je tegoed' : 'Paid with your credit', 'system').run().catch(() => {});
  await env.DB.prepare(
    `INSERT INTO admin_log (admin_id, admin_email, action, order_id, customer_id, detail)
     VALUES (NULL, NULL, 'payment.tegoed', ?1, ?2, ?3)`
  ).bind(order.id, order.customer_id || null, `${order.ref}: volledig betaald met ${tegoed} cent tegoed`)
    .run().catch(() => {});
  await notifyPaid(env, order.id);
  try {
    const invoice = await issueInvoice(env, order.id);
    if (invoice) await mailInvoice(env, { order: { ref: order.ref, email: order.email, lang: order.lang }, invoice });
  } catch (e) {
    console.error('[tegoed] factuur voor', order.ref, 'niet uitgegeven —', e?.message || e);
  }
  return true;
}
