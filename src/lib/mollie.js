// VISUAILS — the one place any function talks to Mollie. Mirrors src/lib/stripe.js
// in shape and reasoning; see that file's header for why bare fetch() over an
// SDK is the right call in a Cloudflare Pages Function. This exists because
// Stripe checkout sessions were coming back as blank HTTP 400s specifically
// when called from this project's Pages Function (never from Stripe's own
// CLI, never from a local Node test) — a networking-layer failure between
// Cloudflare and api.stripe.com that neither Stripe nor Cloudflare support
// had resolved. (This file and order.js both used to cite "BACKEND-SETUP.md §9"
// for that history. That file is not in the tree — the reference was dead. The
// Mollie half of what it was meant to hold is in MOLLIE.md now.)
//
// Bindings: env.MOLLIE_API_KEY (secret) — used to CREATE a payment and, since
// the webhook landed, to READ one back. See MOLLIE.md for where the key comes
// from and how to set it.
//
// SCOPE, TODAY: the €0.99 test sample only, same as the Stripe version it
// replaces — see the note in functions/api/order.js above the call site.
// Extending this to real orders still needs server-side price computation
// first, for the same reason stripe.js's header gave: a payment is never
// created from an amount the client can influence.
//
// ── THE READ CALL IS THE SECURITY MODEL, NOT A CONVENIENCE ──────────────────
// Mollie's webhook carries no signature and no status — the entire body is
// `id=tr_...`. That is deliberate on their side: since the status never
// travels over the wire, a forged call cannot assert "paid". The only way to
// learn what actually happened is to fetch the payment back with our own API
// key, which is what getMolliePayment() below is for. It is also why an
// attacker POSTing a random id gets nothing: Mollie only returns payments
// belonging to the key that asks, and a test key cannot read live payments or
// the other way round.
//
// Their words: "Since the status is not transmitted in the webhook, fake calls
// to your webhook will never result in orders being processed without being
// actually paid." Everything in functions/api/webhook/mollie.js follows from
// that sentence.

import { AMOUNT } from '../data/pricing.js';

const MOLLIE_API = 'https://api.mollie.com/v2';

/**
 * A Payment for exactly the test sample. AMOUNT.testSample is imported, not
 * repeated, for the same reason nothing else on the site hardcodes a price —
 * see the header of src/data/pricing.js. Mollie wants the amount as a
 * decimal string with exactly two places ("0.99", not 0.99 or "0.9"), so
 * toFixed(2) does that conversion rather than trusting string interpolation
 * to land on the right format.
 *
 * Throws on any non-2xx from Mollie (missing/bad API key, malformed params,
 * Mollie itself down) — the caller decides what a failed payment means for
 * the order, this function does not swallow it.
 */
export async function createTestSampleMolliePayment(env, { ref, lang, successUrl, webhookUrl }) {
  if (!env.MOLLIE_API_KEY) throw new Error('mollie: MOLLIE_API_KEY not configured');

  const body = {
    amount: {
      currency: 'EUR',
      value: AMOUNT.testSample.toFixed(2),
    },
    description: lang === 'nl' ? 'VISUAILS proefvisual' : 'VISUAILS test sample',
    redirectUrl: successUrl,
    webhookUrl,
    // locale steers which language Mollie's own checkout page renders in —
    // the equivalent of Stripe's line item name switching on lang above.
    locale: lang === 'nl' ? 'nl_NL' : 'en_US',
    // metadata.order_ref is how the webhook handler ties a payment back to
    // the order row, the same role client_reference_id/metadata played on
    // the Stripe side.
    metadata: { order_ref: ref },
  };

  const res = await fetch(`${MOLLIE_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MOLLIE_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  const parsed = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  if (!res.ok) {
    // Surface everything Mollie sent back so a failure shows up in the
    // deployment log as an actionable message instead of a generic "it
    // failed" — same reasoning as the equivalent block in stripe.js.
    const detail = parsed?.title
      ? `${parsed.title} (field: ${parsed.field || 'n/a'}) — ${parsed.detail || ''}`
      : raw.slice(0, 500) || '(empty body)';
    throw new Error(`Mollie ${res.status}: ${detail}`);
  }
  return parsed; // { id, status, _links: { checkout: { href } }, ... } — _links.checkout.href is where the browser goes next.
}

/**
 * Fetch a payment back from Mollie. This is the webhook's verification step —
 * see the "READ CALL IS THE SECURITY MODEL" note in this file's header.
 *
 * Returns the payment object. Throws on any non-2xx, INCLUDING 404, because
 * the two callers want to treat those differently and swallowing the
 * distinction here would take that choice away from them:
 *
 *   404  the id is not ours (forged webhook, or a live id arriving at a test
 *        key). Permanent — the caller should NOT ask Mollie to retry.
 *   5xx  Mollie is having a moment. Transient — the caller SHOULD let Mollie
 *        retry, which it will do for about 26 hours.
 *
 * The thrown error carries `.status` so the caller can tell them apart without
 * parsing the message.
 */
export async function getMolliePayment(env, id) {
  if (!env.MOLLIE_API_KEY) throw new Error('mollie: MOLLIE_API_KEY not configured');
  if (!isMolliePaymentId(id)) throw new Error(`mollie: refusing to fetch a malformed payment id (${String(id).slice(0, 40)})`);

  const res = await fetch(`${MOLLIE_API}/payments/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${env.MOLLIE_API_KEY}`,
      Accept: 'application/json',
    },
  });
  const raw = await res.text();
  const parsed = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  if (!res.ok) {
    const detail = parsed?.title
      ? `${parsed.title} — ${parsed.detail || ''}`
      : raw.slice(0, 300) || '(empty body)';
    const err = new Error(`Mollie GET payment ${res.status}: ${detail}`);
    err.status = res.status;
    throw err;
  }
  return parsed;
}

/**
 * Mollie payment ids are `tr_` + alphanumerics. Checked before the id ever
 * reaches a URL, so a hostile webhook body cannot steer the request path — the
 * encodeURIComponent above would already stop traversal, but a shape check
 * fails it earlier and more loudly, and it costs one regex.
 */
export function isMolliePaymentId(id) {
  return typeof id === 'string' && /^tr_[A-Za-z0-9]{5,64}$/.test(id);
}

/**
 * Mollie sends money as a decimal STRING ("0.99"), because a float cannot hold
 * a currency amount exactly. Converting via Number() and multiplying by 100 is
 * the classic way to turn €8.15 into 814.9999999999999 cents, so the rounding
 * is explicit rather than implied.
 *
 * Returns null rather than 0 when the amount is unreadable: a payment we
 * cannot price is a payment we should log and look at, not silently record as
 * costing nothing.
 */
export function mollieAmountToCents(amount) {
  const value = amount && typeof amount.value === 'string' ? amount.value : null;
  if (!value || !/^\d+\.\d{2}$/.test(value)) return null;
  return Math.round(Number(value) * 100);
}
