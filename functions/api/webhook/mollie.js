// VISUAILS — Mollie webhook handler (Cloudflare Pages Function).
//
// POST /api/webhook/mollie
//
// The other half of the €0.99 test sample. functions/api/order.js creates the
// payment and sends the customer to Mollie; this is what runs when Mollie
// comes back to say what happened. Until this file existed, that URL 404'd and
// nothing on the site ever moved an order to `paid` — an order could reach
// Mollie's checkout page, be paid for, and still read "payment pending" in the
// admin forever.
//
// Bindings: env.DB (D1), env.MOLLIE_API_KEY (secret).
//
// ── THIS IS NOT THE STRIPE HANDLER WITH THE NAMES CHANGED ───────────────────
// Stripe signs its payload and puts the whole event in the body, so its
// handler reads request.text(), checks an HMAC, and trusts what it parsed.
// Mollie does the opposite on purpose: no signature, and the body is exactly
//
//     id=tr_5B8cwPMGnU6qLbRvo7qEZo
//
// as form-encoding. No status, no amount, no metadata. Their reasoning is
// that a status which never travels cannot be forged — so verification is not
// "check the signature", it is "ask Mollie". We fetch the payment back with
// our own API key, and what THAT says is the only thing this file believes.
//
// Two consequences worth stating, because both look like bugs otherwise:
//   · An unauthenticated POST here is harmless and expected. Anyone can send
//     us an id. They cannot make Mollie's API return `paid` for it.
//   · A test-mode key cannot read a live payment, or the other way round. A
//     404 from Mollie is therefore a normal, permanent outcome for a webhook
//     aimed at the wrong deployment — not a transient error to retry.
//
// ── WHY THE STATUS CODES ARE NOT ALL 200 ────────────────────────────────────
// The Stripe handler answers 200 to everything, on the reasoning that anything
// else means "retry me" and there is nothing to retry. Mollie retries up to 10
// times over ~26 hours with exponential backoff, and that is worth having when
// the failure is ours and transient. So this handler distinguishes:
//
//   200  handled, or deliberately ignored (not-yet-final status, a status
//        other than paid, a duplicate delivery, an order we cannot find).
//        Retrying changes none of those.
//   400  the body carried no usable payment id. Not a Mollie problem and not
//        one that improves in 26 hours.
//   500  WE failed — Mollie's API was unreachable, or the database write threw.
//        This is the case the retry schedule exists for, and answering 200
//        here is how a paid order silently stays unpaid.
//
// Mollie times a webhook out at 15 seconds, so everything below is one API
// read and at most three small D1 statements. Nothing slow belongs here.
//
// ── WHY A DUPLICATE DELIVERY IS NOT AN ERROR ────────────────────────────────
// Same mechanism as the Stripe handler: schema.sql's UNIQUE(provider,
// external_id) on `payments` is the idempotency gate. The second INSERT for
// the same payment id throws, and that throw IS the "already handled" signal.
// Mollie will re-deliver — on its own retry schedule, and again on any later
// status change of the same payment (a refund, a chargeback) — so this is a
// normal path, not an edge case.

import { getMolliePayment, isMolliePaymentId, mollieAmountToCents } from '../../../src/lib/mollie.js';

export async function onRequestPost({ request, env }) {
  if (!env.MOLLIE_API_KEY) {
    console.error('[mollie-webhook] MOLLIE_API_KEY not configured');
    return new Response('not configured', { status: 500 });
  }

  // Mollie posts application/x-www-form-urlencoded. Read it defensively: a
  // stray GET-style body or a JSON body from something that is not Mollie
  // should be a clean 400, not an unhandled throw.
  let id = null;
  try {
    const form = await request.formData();
    id = form.get('id');
  } catch {
    // Not form-encoded. Mollie always is; something else is talking to us.
  }
  if (!isMolliePaymentId(id)) {
    console.warn('[mollie-webhook] no usable payment id in body —', JSON.stringify(String(id ?? '')).slice(0, 60));
    return new Response('missing or malformed id', { status: 400 });
  }

  // ── Verification. Everything after this line trusts `payment`, and nothing
  //    before it trusted anything. ────────────────────────────────────────────
  let payment;
  try {
    payment = await getMolliePayment(env, id);
  } catch (e) {
    // 404 / 401 / 422: permanent for this delivery. Either the id is not ours
    // (someone poking the endpoint, or a live payment arriving at a test
    // deployment) or the key is wrong — and a wrong key does not fix itself
    // inside Mollie's retry window either. Log it and stop asking.
    if (e.status && e.status >= 400 && e.status < 500) {
      console.warn('[mollie-webhook] Mollie will not give us', id, '—', e.message);
      return new Response('ok', { status: 200 });
    }
    // Anything else — Mollie 5xx, DNS, a timeout — is transient and exactly
    // what the retry schedule is for.
    console.error('[mollie-webhook] could not reach Mollie for', id, '—', e && e.message ? e.message : e);
    return new Response('upstream unavailable', { status: 500 });
  }

  const mode = payment.mode === 'live' ? 'live' : 'test';

  // `paid` is the only status that means money arrived. `canceled`, `expired`
  // and `failed` are equally final but leave the order exactly as it was —
  // unpaid, still in the pipeline, and the customer can pay again from the
  // same order. There is nothing for the studio to act on, so they are
  // acknowledged and dropped. `open`, `pending` and `authorized` are not final
  // at all; `authorized` in particular means a hold, not a payment, and
  // treating it as paid is how a Klarna order ships before it settles. Nothing
  // on the site offers those methods today for a €0.99 payment, which is
  // exactly why this is written down rather than left to be discovered.
  if (payment.status !== 'paid') {
    console.log(`[mollie-webhook] ${id} is "${payment.status}" (${mode}) — acknowledged, order unchanged`);
    return new Response('ok', { status: 200 });
  }

  if (!env.DB) {
    console.error('[mollie-webhook] no DB binding — cannot record', id);
    return new Response('no database', { status: 500 });
  }

  try {
    await recordPaid(env, payment, mode);
  } catch (e) {
    // A failed write is the one thing genuinely worth a retry: the customer
    // has paid and the order does not know it.
    console.error('[mollie-webhook] write failed for', id, '—', e && e.message ? e.message : e);
    return new Response('write failed', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}

async function recordPaid(env, payment, mode) {
  // metadata comes back as whatever was sent. order.js sends an object; a
  // string is accepted too so a payment created by hand in Mollie's dashboard
  // (which is the natural way to test this) can still be tied to an order.
  const meta = typeof payment.metadata === 'string'
    ? (() => { try { return JSON.parse(payment.metadata); } catch { return {}; } })()
    : (payment.metadata || {});
  const ref = meta.order_ref;

  if (!ref) {
    // A payment on our own account with no order attached: possible if one was
    // created outside this codebase. Loud, because it means money arrived that
    // no order will ever show — but not a 500, because retrying cannot attach
    // metadata that was never set.
    console.error('[mollie-webhook] paid payment carries no order_ref —', payment.id, `(${mode})`);
    return;
  }

  const order = await env.DB.prepare('SELECT id, status, payment_status FROM orders WHERE ref = ?1').bind(ref).first();
  if (!order) {
    // The order row is written before the payment is ever created, so this is
    // not a race — it means the ref does not exist here. The usual cause is a
    // webhook from one deployment landing on another (preview vs production
    // share a Mollie account but not a database). Retrying will not conjure
    // the row, so: acknowledge, and say clearly what probably happened.
    console.error('[mollie-webhook] no order', ref, 'in this database for payment', payment.id,
      `(${mode}) — wrong environment? preview and production share a Mollie account but not a D1.`);
    return;
  }

  const cents = mollieAmountToCents(payment.amount);
  if (cents === null) {
    console.warn('[mollie-webhook] unreadable amount on', payment.id, '—', JSON.stringify(payment.amount));
  }

  // The idempotency gate — see the file header. A UNIQUE violation here means
  // a previous delivery of this payment already did everything below.
  try {
    await env.DB.prepare(
      `INSERT INTO payments (order_id, provider, external_id, status, amount_cents, currency, raw_payload)
       VALUES (?1, 'mollie', ?2, ?3, ?4, ?5, ?6)`
    )
      .bind(
        order.id,
        payment.id,
        payment.status,
        cents ?? 0,
        (payment.amount?.currency || 'EUR').toUpperCase(),
        JSON.stringify(payment)
      )
      .run();
  } catch {
    console.log('[mollie-webhook] duplicate delivery for', payment.id, '— already processed, skipping');
    return;
  }

  if (order.payment_status === 'paid') return; // belt and braces alongside the INSERT guard

  await env.DB.prepare(
    `UPDATE orders SET payment_status = 'paid', payment_provider = 'mollie', payment_ref = ?1, paid_at = datetime('now')
     WHERE id = ?2 AND payment_status <> 'paid'`
  )
    .bind(payment.id, order.id)
    .run();

  // order_events.status carries the order's PIPELINE status, not a payment
  // status — see schema.sql. A payment does not move the pipeline, so this
  // re-states the current status and lets the note carry the fact.
  //
  // The mode is in the note ON PURPOSE and in capitals. A test payment writes
  // a real `paid` into whichever database the deployment is pointed at, and
  // six weeks from now the only thing distinguishing it from a real €0.99 in
  // the admin timeline is this word.
  await env.DB.prepare('INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, ?4)')
    .bind(
      order.id,
      order.status,
      `Payment received via Mollie (${payment.id})${mode === 'test' ? ' — TEST MODE, no money moved' : ''}`,
      'system'
    )
    .run();

  console.log(`[mollie-webhook] order ${ref} marked paid from ${payment.id} (${mode})`);
}

// A GET here is not part of the protocol — Mollie only ever POSTs. It answers
// anyway, with nothing but "this route is deployed", because the first
// question when a webhook does not fire is whether the endpoint exists at all
// and the honest way to answer it is to open the URL. It deliberately reveals
// nothing else: not whether a key is set, not which mode, not the database.
export function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, route: 'mollie-webhook', method: 'POST' }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
