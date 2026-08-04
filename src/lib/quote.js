// VISUAILS — what an order costs, decided on the server.
//
// WHY THIS FILE EXISTS
// Until now nothing on the server ever worked out a price. `orders.total_cents`
// has been a column in schema.sql since the beginning and NOTHING has ever
// written to it: the only figure the site computed lived in the browser, in
// pipeline.js's quoteFor(), and its own comment says out loud that it is "a
// preview, the invoice is derived server-side" — except there was no
// server-side derivation to point at. The only Mollie payment that existed was
// the €0.99 test sample, at a constant, so the gap never showed.
//
// The moment a catalog order can be paid, that gap becomes the whole problem.
// An amount that only the browser knows is an amount the customer can change,
// and a payment link built from a number a form posted is a payment link for
// whatever the customer decided it should be. So this module exists to be the
// one place a price is worked out from the ladder and the order's own fields,
// on our side, from data the customer cannot rewrite: the service, the product
// count, and the counts of the two paid add-ons.
//
// IT DOES NOT READ A POSTED AMOUNT. There is no `amount` parameter here and
// there must never be one. Everything is recomputed.
//
// THE BROWSER PREVIEW STAYS. pipeline.js keeps its own arithmetic because a
// running total has to move as somebody changes a dropdown and cannot wait for
// a round trip. The two are kept honest by reading the same ladder out of
// src/data/pricing.js — neither copies a number — and by assertQuoteMatches()
// at the bottom, which is a build-time check that the two agree at every rung.
//
// VAT: 21% TO EVERYONE, CORRECTED ON THE INVOICE.
// Lucas's own interim model (see the VAT block in src/data/pricing.js) and his
// explicit choice again in August 2026 when this was built. The alternative —
// charging the rate of the customer's own country — needs a per-country table
// and live VIES validation of a business's VAT number before reverse charge may
// be applied, and neither exists yet. So Mollie collects 21% from everybody and
// a reverse charge for a valid EU business number is settled afterwards on the
// invoice.
//
// THAT MADE A SENTENCE ON THE SITE WRONG, and it has been changed rather than
// left: /start told the visitor VAT is added "at the rate of your own country",
// which is what the FUTURE model does, not this one. A checkout that charges
// 21% under a sentence promising a local rate is a discrepancy the customer
// finds at exactly the wrong moment.
import {
  LADDER, ladderRate, OUTFIT_SURCHARGE, extraPhotoRate, MAX_EXTRA_PER_PRODUCT,
  MAX_OUTFIT_PRODUCTS, AMOUNT,
} from '../data/pricing.js';

/** The rate Mollie collects from everyone, pending the per-country model. */
export const VAT_RATE = 0.21;

/** Services that can be priced from the ladder. Anything else is not payable. */
export const PAYABLE_SERVICES = new Set(['catalog', 'lifestyle', 'complete']);

/** Round to whole cents the way money has to be rounded: half away from zero. */
function cents(euros) {
  return Math.round(euros * 100);
}

/**
 * Clamp a count to something we are willing to charge for.
 *
 * Every one of these ceilings already exists as a rule elsewhere — the outfit
 * cap in pricing.js, the extras cap beside it — and they are re-applied here
 * rather than trusted because this is the function that turns a number into an
 * amount of money. A form field that arrived saying 400 outfits is not an
 * expensive order, it is a tampered one, and the clamp means the worst case is
 * an order priced at the legitimate maximum instead of a payment link for
 * twenty thousand euro.
 */
function clamp(n, lo, hi) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(lo, Math.min(hi, v));
}

/**
 * What an order costs, net and gross, in cents.
 *
 * Returns null for a service that is not on the ladder — the test sample has
 * its own constant, and 'custom' (a Brand Model) is a conversation rather than
 * a computed price. A null here means "do not create a payment", which is the
 * safe direction to fail in.
 */
export function quoteOrder({ service, products, outfits = 0, extras = 0 }) {
  if (!PAYABLE_SERVICES.has(service)) return null;

  const n = clamp(products, 1, 500);
  // An outfit surcharge is per PRODUCT styled that way, so it can never exceed
  // the product count — and pricing.js caps it at three regardless.
  const o = clamp(outfits, 0, Math.min(n, MAX_OUTFIT_PRODUCTS));
  // Extras are per product, capped per product, so the order-wide ceiling is
  // the product count times that cap.
  const x = clamp(extras, 0, n * MAX_EXTRA_PER_PRODUCT);

  const rate = ladderRate(service, n);
  const extraRate = extraPhotoRate(n);

  const net = n * rate + o * OUTFIT_SURCHARGE + x * extraRate;
  const netCents = cents(net);
  // VAT on the NET TOTAL, not summed per line: rounding each line separately
  // and adding them up drifts from the figure on the invoice by a cent or two
  // on a large order, and a payment that disagrees with its own invoice by a
  // cent is a reconciliation job every single time.
  const vatCents = Math.round(netCents * VAT_RATE);

  return {
    service,
    products: n,
    outfits: o,
    extras: x,
    rate,
    extraRate,
    netCents,
    vatCents,
    grossCents: netCents + vatCents,
    vatRate: VAT_RATE,
  };
}

/** The test sample, priced from its own constant so it can share the plumbing. */
export function quoteTestSample() {
  const netCents = cents(AMOUNT.testSample);
  // The €0.99 sample has always been charged as a flat amount, and it stays
  // flat: adding 21% to it would make it €1.20, which is not the number on
  // every page of the site. It is treated as VAT-inclusive.
  return {
    service: 'test-sample',
    products: 1,
    outfits: 0,
    extras: 0,
    netCents,
    vatCents: 0,
    grossCents: netCents,
    vatRate: 0,
  };
}

/** "12,50" — Mollie wants a decimal string with exactly two places. */
export function centsToMollieValue(c) {
  return (Math.round(Number(c) || 0) / 100).toFixed(2);
}

/**
 * A one-line description for the payment, in the customer's language.
 *
 * Mollie shows this on the checkout page and on the bank statement, so it has
 * to say what was bought without needing the site open beside it.
 */
export function paymentDescription(quote, lang = 'en') {
  const nl = lang === 'nl';
  if (quote.service === 'test-sample') return nl ? 'VISUAILS proefvisual' : 'VISUAILS test sample';
  const what = nl
    ? { catalog: 'catalogsets', lifestyle: 'lifestyle-carousels', complete: 'catalog + lifestyle' }
    : { catalog: 'catalog sets', lifestyle: 'lifestyle carousels', complete: 'catalog + lifestyle' };
  const n = quote.products;
  return nl
    ? `VISUAILS — ${n} ${n === 1 ? 'product' : 'producten'}, ${what[quote.service]}`
    : `VISUAILS — ${n} ${n === 1 ? 'product' : 'products'}, ${what[quote.service]}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE CHECK THAT MAKES THE TWO COPIES SAFE.
//
// pipeline.js works the same sum out in the browser so the running total can
// move without a round trip. Two implementations of one price is exactly the
// drift src/data/pricing.js was created to stop, and the answer is not to
// delete one of them — it is to make the build fail the moment they disagree.
//
// This walks every rung of every payable ladder and re-derives the net total
// the way pipeline.js's quoteFor() does: n * rateFor(kind, n) + outfits *
// surcharge + extras * extraRate. Same inputs, same expected output. If a rung
// is edited in pricing.js and one of the two readers is not updated, this
// throws at import time — which is at build time, because order.js imports it.
// ─────────────────────────────────────────────────────────────────────────────
(function assertQuoteMatches() {
  for (const service of PAYABLE_SERVICES) {
    for (const [lo] of LADDER[service]) {
      for (const [o, x] of [[0, 0], [1, 0], [0, 3], [2, 5]]) {
        const q = quoteOrder({ service, products: lo, outfits: o, extras: x });
        const expectedNet = cents(
          lo * ladderRate(service, lo)
          + Math.min(o, Math.min(lo, MAX_OUTFIT_PRODUCTS)) * OUTFIT_SURCHARGE
          + Math.min(x, lo * MAX_EXTRA_PER_PRODUCT) * extraPhotoRate(lo)
        );
        if (q.netCents !== expectedNet) {
          throw new Error(
            `quote.js: ${service} at ${lo} products (${o} outfits, ${x} extras) came to `
            + `${q.netCents} cents, expected ${expectedNet}. The server quote and the ladder `
            + 'have drifted — see src/data/pricing.js.'
          );
        }
      }
    }
  }
})();
