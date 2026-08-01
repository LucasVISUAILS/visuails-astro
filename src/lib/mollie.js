// VISUAILS — the one place any function talks to Mollie. Mirrors src/lib/stripe.js
// in shape and reasoning; see that file's header for why bare fetch() over an
// SDK is the right call in a Cloudflare Pages Function. This exists because
// Stripe checkout sessions were coming back as blank HTTP 400s specifically
// when called from this project's Pages Function (never from Stripe's own
// CLI, never from a local Node test) — a networking-layer failure between
// Cloudflare and api.stripe.com that neither Stripe nor Cloudflare support
// had resolved. See BACKEND-SETUP.md §9 for the full history.
//
// Bindings: env.MOLLIE_API_KEY (secret, payment creation only). See
// BACKEND-SETUP.md §9 for where this comes from and how it's handed over.
//
// SCOPE, TODAY: the €0.99 test sample only, same as the Stripe version it
// replaces — see the note in functions/api/order.js above the call site.
// Extending this to real orders still needs server-side price computation
// first, for the same reason stripe.js's header gave: a payment is never
// created from an amount the client can influence.

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
