// VISUAILS — the one place any function talks to Stripe. See src/lib/mail.js
// for why shared plumbing like this lives in src/lib rather than being
// copy-pasted into every function file that needs it.
//
// No Stripe SDK. mail.js talks to Resend with a bare fetch() rather than
// pulling in its client library, and this does the same for the same reason:
// a Cloudflare Pages Function is a small, cold-started thing, and Stripe's
// REST API needs nothing an SDK adds except types this project doesn't build
// with. Two fetch-based integrations is also one fewer pattern to hold in
// your head than "fetch for Resend, an SDK for Stripe".
//
// Bindings: env.STRIPE_SECRET_KEY (secret, checkout only),
// env.STRIPE_WEBHOOK_SECRET (secret, verification only). See BACKEND-SETUP.md
// §9 for where these come from and how they're handed over.
//
// SCOPE, TODAY: the €0.99 test sample only. The full order pricing model
// (tiers, packages, per-product, VAT) has no server-side price computation
// yet — see the note in functions/api/order.js above the call site — so
// nothing here builds a Checkout Session for anything else. Extending this
// to real orders needs that pricing function first, deliberately, so a
// Checkout Session is never built from an amount the client can influence.

import { AMOUNT } from '../data/pricing.js';
import { timingSafeEqual } from './token.js';

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * A Checkout Session for exactly the test sample. AMOUNT.testSample is
 * imported, not repeated, for the same reason nothing else on the site
 * hardcodes a price — see the header of src/data/pricing.js. Stripe wants
 * the amount in cents; Math.round guards the euros→cents arithmetic rather
 * than trusting float multiplication to land on a whole number by luck.
 *
 * Throws on any non-2xx from Stripe (missing/bad secret key, malformed
 * params, Stripe itself down) — the caller decides what a failed checkout
 * means for the order, this function does not swallow it.
 */
export async function createTestSampleCheckoutSession(env, { ref, email, lang, successUrl, cancelUrl }) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('stripe: STRIPE_SECRET_KEY not configured');

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.append('payment_method_types[]', 'card');
  // client_reference_id is the field Stripe's own dashboard and Checkout UI
  // are built around; metadata.order_ref is a second copy so the webhook
  // handler has a fallback if a future change ever stops setting the first.
  params.set('client_reference_id', ref);
  params.set('metadata[order_ref]', ref);
  if (email) params.set('customer_email', email);
  params.set('success_url', successUrl);
  params.set('cancel_url', cancelUrl);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'eur');
  params.set('line_items[0][price_data][unit_amount]', String(Math.round(AMOUNT.testSample * 100)));
  params.set(
    'line_items[0][price_data][product_data][name]',
    lang === 'nl' ? 'VISUAILS proefvisual' : 'VISUAILS test sample'
  );

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      // Stripe's own edge sits behind bot protection that has, in practice,
      // quietly rejected requests with no User-Agent before they ever reach
      // the application layer — a blank 400 that never shows up in the
      // dashboard's request log, because it was never logged as a request.
      // A Workers `fetch()` sends none by default, so one is set explicitly.
      'User-Agent': 'VISUAILS/1.0 (+https://visuails.com)',
      Accept: 'application/json',
    },
    body: params.toString(),
  });
  const raw = await res.text();
  const body = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  if (!res.ok) {
    // Surface everything Stripe sent back — code, param, and the raw body if
    // it didn't even parse as JSON — so a failure shows up in the deployment
    // log as an actionable message instead of a generic "it failed". Response
    // headers too: a request-id here is the one thing that would let Stripe
    // support trace a request their own dashboard log never recorded.
    const reqId = res.headers.get('request-id') || res.headers.get('cf-ray') || 'n/a';
    const detail = body?.error
      ? `${body.error.type || ''} ${body.error.code || ''} (param: ${body.error.param || 'n/a'}) — ${body.error.message || ''}`
      : raw.slice(0, 500) || '(empty body)';
    throw new Error(`Stripe ${res.status} [req:${reqId}]: ${detail}`);
  }
  return body; // { id, url, ... } — .url is where the browser goes next.
}

/**
 * Verifies a webhook request actually came from Stripe and hasn't been
 * replayed from an old capture.
 *
 * Stripe signs `${timestamp}.${rawBody}` with HMAC-SHA256 using the webhook
 * signing secret, and sends the result in the Stripe-Signature header as
 * `t=<unix seconds>,v1=<hex>[,v1=<hex>...]` — more than one v1 appears while
 * a secret is being rotated, and a match against ANY of them is a pass. The
 * RAW body is what was signed, not the parsed object, so the caller must
 * pass request.text() verbatim and must read it before touching JSON.parse.
 *
 * A five-minute tolerance on the timestamp (Stripe's own default) is what
 * makes this a signature check AND a replay check — a captured request
 * replayed an hour later has a valid signature but a stale timestamp.
 */
export async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const tMatch = signatureHeader.match(/(?:^|,)t=(\d+)/);
  const candidates = signatureHeader
    .split(',')
    .filter((kv) => kv.startsWith('v1='))
    .map((kv) => kv.slice(3));
  if (!tMatch || !candidates.length) return false;

  const t = tMatch[1];
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');

  return candidates.some((c) => timingSafeEqual(c, expected));
}
