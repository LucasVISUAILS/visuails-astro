// VISUAILS — GET /api/order-pay?ref=VIS-XXXX-YYY  →  302 naar een verse Mollie-checkout
//
// ── WAAROM DIT EINDPUNT ER IS — 19 september 2026 ────────────────────────────
//
// Sinds vandaag gaat elke bestelling met een betaallink meteen door naar Mollie
// (functions/api/order.js). Mollie stuurt de klant daarna terug naar de
// bedankpagina met `?paid=` — bij een geslaagde betaling, maar óók als hij op
// "annuleren" drukte, de bank nee zei of de link verliep: de terugkeer-URL is
// per betaling één adres. De bedankpagina vraagt daarom aan /api/order-status
// of er écht betaald is, en zo niet, dan staat daar een knop "Opnieuw betalen".
// Die knop komt hier.
//
// EEN VERSE BETALING, NIET DE OUDE LINK. Een checkout-link van Mollie is aan één
// betaling gebonden; is die betaling mislukt of verlopen, dan is de link dood.
// Dus wordt er hier een nieuwe betaling aangemaakt op dezelfde bestelling — met
// hetzelfde bedrag zoals het nú op de rij staat (netto + btw), hetzelfde
// kenmerk en dezelfde webhook. De webhook koppelt op `ref`, dus welke van de
// twee betalingen slaagt maakt niet uit; dat is precies hoe het Studio-pad
// (handleOrderPay in src/lib/account.js) en de betaallinkmail het al doen.
//
// ── WIE DIT MAG AANROEPEN ────────────────────────────────────────────────────
//
// Wie de referentie heeft. Die is geen geheim (hij staat in de mail en in de
// URL van de bedankpagina), en wat je ermee kunt is: een betaalpagina openen
// voor die bestelling en er zelf voor betalen. Daar wordt niemand slechter van.
// Wat er NIET kan: een bestelling betaalbaar maken die dat niet is. Dezelfde
// lijst-van-wat-mag als in Studio: niet geannuleerd, niet betaald, niet op de
// btw-beoordelingslijst, een echt bedrag. Alles daarbuiten gaat stil terug naar
// de bedankpagina zonder link.
//
// Rate-limited per ip, zodat niemand de Mollie-sleutel als betalingen-fabriek
// kan gebruiken.
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from '../../src/lib/ratelimit.js';
import { createOrderMolliePayment } from '../../src/lib/mollie.js';
import { centsToMollieValue, paymentDescription, isPayableService, ladderKey } from '../../src/lib/quote.js';
import { SAMPLE_SERVICE } from '../../src/data/pricing.js';
import { REVIEW } from '../../src/data/vat.js';

const REF_SHAPE = /^VIS-[0-9A-Z-]{3,20}$/i;
const LIMIT = 10;
const PAYABLE_REVIEW = new Set(['', REVIEW.approved]);

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const raw = (url.searchParams.get('ref') || '').trim();
  const lang = url.searchParams.get('lang') === 'nl' ? 'nl' : 'en';
  const terug = `${url.origin}${lang === 'nl' ? '/nl' : ''}/thank-you`;
  if (!REF_SHAPE.test(raw)) return redirect(terug);
  const ref = raw.toUpperCase();
  const naarBedankpagina = redirect(`${terug}?ref=${encodeURIComponent(ref)}`);

  const gate = await checkRate(env, { ip: clientIp(request), action: 'order-pay', limit: LIMIT });
  if (typeof waitUntil === 'function' && shouldSweep()) waitUntil(sweepRateLimits(env));
  if (!gate.allowed) return naarBedankpagina;
  if (!env?.DB || !env.MOLLIE_API_KEY) return naarBedankpagina;

  let o = null;
  const KOLOMMEN = 'id, ref, lang, service, product_count, total_cents, vat_cents, vat_rate, payment_status, status';
  try {
    try {
      o = await env.DB.prepare(`SELECT ${KOLOMMEN}, review_state FROM orders WHERE ref = ?1`).bind(ref).first();
    } catch (e) {
      if (!/no such column/i.test(String(e && e.message))) throw e;
      o = await env.DB.prepare(`SELECT ${KOLOMMEN} FROM orders WHERE ref = ?1`).bind(ref).first();
    }
  } catch (err) {
    console.error('[order-pay]', err && err.message ? err.message : err);
    return naarBedankpagina;
  }
  if (!o) return naarBedankpagina;
  if (o.status === 'cancelled') return naarBedankpagina;
  if (String(o.payment_status || 'unpaid') !== 'unpaid') return naarBedankpagina;
  if (!PAYABLE_REVIEW.has(String(o.review_state || ''))) return naarBedankpagina;
  if (!(isPayableService(o.service) || o.service === SAMPLE_SERVICE)) return naarBedankpagina;

  const bruto = (Number(o.total_cents) || 0) + (Number(o.vat_cents) || 0);
  if (!(bruto > 0)) return naarBedankpagina;

  const taal = o.lang === 'nl' ? 'nl' : 'en';
  const back = `${url.origin}${taal === 'nl' ? '/nl' : ''}/thank-you`;
  try {
    const payment = await createOrderMolliePayment(env, {
      ref: o.ref,
      lang: taal,
      valueEuros: centsToMollieValue(bruto),
      grossCents: bruto,
      description: o.service === SAMPLE_SERVICE
        ? `VISUAILS ${o.ref}`
        : paymentDescription({ service: ladderKey(o.service), products: o.product_count || 1 }, taal),
      successUrl: `${back}?paid=${encodeURIComponent(o.ref)}`,
      webhookUrl: `${url.origin}/api/webhook/mollie`,
      /* Bij 0% geen iDEAL — dezelfde regel als op de drie andere betaalpaden. */
      excludeIdeal: Number(o.vat_rate) === 0,
    });
    const checkout = payment?._links?.checkout?.href || null;
    if (checkout) return redirect(checkout);
  } catch (err) {
    console.error('[order-pay] Mollie gaf geen betaallink voor', o.ref, '—', err?.message || err);
  }
  return redirect(`${back}?ref=${encodeURIComponent(o.ref)}`);
}

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
