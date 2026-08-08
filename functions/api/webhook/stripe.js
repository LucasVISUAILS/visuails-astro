// VISUAILS — Stripe webhook handler (Cloudflare Pages Function).
//
// POST /api/webhook/stripe
//
// The only thing on the site that reaches here today is the €1 test
// sample (functions/api/order.js creates the Checkout Session via
// src/lib/stripe.js only when svc === 'test-sample'). The handler itself
// doesn't assume that scope, though: it reads whatever order the session's
// client_reference_id points at and marks it paid, which stays correct
// however many products end up wired to Stripe later.
//
// Bindings: env.DB (D1), env.STRIPE_WEBHOOK_SECRET (secret).
//
// ── WHY THE RAW BODY, READ ONCE, BEFORE ANYTHING ELSE ───────────────────────
// Stripe signs the exact bytes it sent. Parsing JSON and re-serializing it
// would not reproduce those bytes byte-for-byte (key order, whitespace and
// number formatting can all drift), so the signature has to be checked
// against request.text(), never against JSON.stringify(await request.json()).
// See verifyStripeSignature in src/lib/stripe.js.
//
// ── WHY A DUPLICATE EVENT IS NOT AN ERROR ───────────────────────────────────
// Stripe retries a webhook that doesn't answer fast enough with a 2xx, and
// can send the same event more than once by its own admission. schema.sql's
// idx_payments_external is a UNIQUE(provider, external_id) built exactly for
// this — the second INSERT for the same session id throws, and that throw IS
// the "already handled" signal, not a failure. See the comment on the
// payments table there.

import { verifyStripeSignature } from '../../../src/lib/stripe.js';

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    return new Response('not configured', { status: 500 });
  }

  // Read the raw body exactly once, before any parsing — see the file header.
  const raw = await request.text();
  const signature = request.headers.get('stripe-signature');

  let ok = false;
  try {
    ok = await verifyStripeSignature(raw, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('[stripe-webhook] signature check errored —', e && e.message ? e.message : e);
  }
  if (!ok) return new Response('invalid signature', { status: 400 });

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('bad json', { status: 400 });
  }

  // checkout.session.completed covers card payments, which settle
  // synchronously; async_payment_succeeded is included for payment methods
  // that don't (not offered today — payment_method_types is card-only in
  // src/lib/stripe.js — but handling it now costs nothing and means nobody
  // has to remember to add it later if that changes).
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    await safe(() => handlePaid(env, event.data.object));
  }
  // Every other event type — checkout.session.expired,
  // async_payment_failed, and anything else Stripe ever adds — is
  // acknowledged and otherwise ignored on purpose. Those leave the order
  // exactly as it was (unpaid), and the client can simply try again from
  // the same order; there is nothing here for the studio to act on.

  // 200 quickly. Stripe treats anything else, including a slow response, as
  // "retry me", and there is nothing further to do once the row is written.
  return new Response('ok', { status: 200 });
}

async function handlePaid(env, session) {
  if (!env.DB) { console.error('[stripe-webhook] no DB binding'); return; }

  const ref = session.client_reference_id || session.metadata?.order_ref;
  if (!ref) { console.error('[stripe-webhook] session carries no order reference —', session.id); return; }

  const order = await env.DB.prepare('SELECT id, status, payment_status FROM orders WHERE ref = ?1').bind(ref).first();
  if (!order) { console.error('[stripe-webhook] no order for ref', ref, '(session', session.id, ')'); return; }

  // The idempotency gate. See the file header — a UNIQUE-constraint failure
  // here means a prior delivery of this exact event already ran the update
  // below, so this delivery has nothing left to do.
  try {
    await env.DB.prepare(
      `INSERT INTO payments (order_id, provider, external_id, status, amount_cents, currency, raw_payload)
       VALUES (?1, 'stripe', ?2, ?3, ?4, ?5, ?6)`
    )
      .bind(
        order.id,
        session.id,
        session.payment_status || 'paid',
        session.amount_total ?? 0,
        (session.currency || 'eur').toUpperCase(),
        JSON.stringify(session)
      )
      .run();
  } catch (e) {
    console.log('[stripe-webhook] duplicate delivery for', session.id, '— already processed, skipping');
    return;
  }

  if (order.payment_status === 'paid') return; // belt and braces alongside the INSERT guard above

  await env.DB.prepare(
    `UPDATE orders SET payment_status = 'paid', payment_provider = 'stripe', payment_ref = ?1, paid_at = datetime('now')
     WHERE id = ?2 AND payment_status <> 'paid'`
  )
    .bind(session.id, order.id)
    .run();

  // order_events.status carries the order's PIPELINE status (received | ...),
  // not a payment status — see schema.sql. This event doesn't move the
  // pipeline, so it re-states the order's current status and lets the note
  // carry the payment fact, the same shape admin.js uses for a manual status
  // write.
  await env.DB.prepare('INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, ?4)')
    .bind(order.id, order.status, `Payment received via Stripe (${session.id})`, 'system')
    .run();
}

async function safe(fn) {
  try {
    return await fn();
  } catch (e) {
    console.error('[stripe-webhook]', e && e.message ? e.message : e);
  }
}
