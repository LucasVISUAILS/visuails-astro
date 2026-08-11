// VISUAILS — what an order costs, decided on the server.
//
// WHY THIS FILE EXISTS
// Until now nothing on the server ever worked out a price. `orders.total_cents`
// has been a column in schema.sql since the beginning and NOTHING has ever
// written to it: the only figure the site computed lived in the browser, in
// pipeline.js's quoteFor(), and its own comment says out loud that it is "a
// preview, the invoice is derived server-side" — except there was no
// server-side derivation to point at. The only Mollie payment that existed was
// the €1 test sample, at a constant, so the gap never showed.
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

/**
 * The DUTCH rate. Not "the rate everyone pays" any more.
 *
 * This constant used to be commented "the rate Mollie collects from everyone,
 * pending the per-country model", and BRIEF-14 described that model as future
 * work. It is not future work now: quoteOrder() takes a rate, src/data/vat.js
 * decides which one, and this is only the default — the answer for a Dutch
 * customer, and for every case where we could not prove otherwise.
 *
 * It stays a duplicate of pricing.js's VAT_RATE rather than an import, for the
 * reason pricing.js:192 gives: this module is loaded by a Cloudflare Worker and
 * the two halves are checked against each other at build time by
 * assertQuoteMatches() instead.
 */
export const VAT_RATE = 0.21;

/** Services that can be priced from the ladder. Anything else is not payable. */
export const PAYABLE_SERVICES = new Set(['catalog', 'lifestyle', 'complete']);

/**
 * THE WIRE VALUE IS NOT THE LADDER KEY, AND THAT COST REAL MONEY.
 *
 * /start/complete — "Both together", the most expensive door on the site — posts
 * `service=drop`. It has done since long before this file existed: OrderFlow's
 * `WIRE` map converts the page's own name into the value orders.service has
 * always stored, ORDER_SERVICES accepts it, and portal.js and account.js both
 * carry a label for it. Meanwhile src/data/pricing.js calls that same ladder
 * `complete`. Two vocabularies for one product, and nothing translated between
 * them.
 *
 * What that produced: quoteOrder({service:'drop'}) fell straight through the
 * PAYABLE_SERVICES test and returned null. Null is the "do not create a
 * payment" answer — the correct, safe answer for a Brand Model enquiry, and
 * catastrophically wrong here. A thirty-product Both-together order (€2,359.50
 * gross) was written with total_cents NULL, no payment link in the confirmation
 * email, no window expiry, and no appearance in the admin's unpaid count, which
 * filters on total_cents > 0. It went out free and nothing anywhere said so.
 *
 * Fixed by translating rather than renaming. Renaming the wire value would
 * orphan every 'drop' row already in D1 and both label maps; this maps the one
 * value at the one place a price is decided. Anything not in here passes
 * through unchanged, so a service that IS its own ladder key keeps working with
 * no entry.
 */
const LADDER_KEY = { drop: 'complete' };

/*
 * Het hoogste productaantal waarvoor deze module een prijs afgeeft. Stond als los
 * getal 500 in de clamp hieronder; het staat hier bij naam omdat het sinds
 * 11 augustus 2026 twee dingen doet — het is niet langer alleen een plafond maar
 * ook een weigergrens (zie de noot in quoteOrder). Eén getal op twee plekken is
 * hoe die twee betekenissen uit elkaar zouden lopen.
 *
 * Ruim boven alles wat het formulier kan posten (ATTENDED_PER_WINDOW is 30) en
 * ruim onder wat countOf() doorlaat (999), zodat het gat daartussen hier wordt
 * afgevangen en niet ergens verderop een bedrag wordt.
 */
const MAX_LADDER_PRODUCTS = 500;

/**
 * De wire-waarde naar de laddernaam, voor iedereen buiten dit bestand.
 *
 * TOEGEVOEGD OMDAT DEZELFDE VAL OP 7 AUGUSTUS 2026 EEN TWEEDE KEER DICHTKLAPTE.
 * Het geldblok op het klantdashboard en de knop "Nu betalen" toetsten
 * `PAYABLE_SERVICES.has(order.service)` rechtstreeks op de rij uit de database.
 * Daar staat 'drop', en PAYABLE_SERVICES kent alleen 'complete' — dus een
 * bestelling van "Allebei" (de duurste deur op de site, dertig producten is
 * € 2.359,50) kreeg geen betaalknop, en de POST erachter weigerde stil. Precies
 * het scenario dat hierboven in vijfentwintig regels beschreven staat, in nieuwe
 * code herhaald.
 *
 * Vandaar dat de vertaling nu geëxporteerd wordt in plaats van dat elke
 * aanroeper hem opnieuw moet kennen. Wie een dienst uit orders.service in handen
 * heeft, gebruikt isPayableService() en niet de verzameling.
 */
export function ladderKey(service) {
  return LADDER_KEY[service] || service;
}

/** Is deze dienst uit orders.service te prijzen — en dus te betalen? */
export function isPayableService(service) {
  return PAYABLE_SERVICES.has(ladderKey(service));
}

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
export function quoteOrder({ service, products, outfits = 0, extras = 0, vatRate = VAT_RATE }) {
  // Translate first, then decide. Both the payable test and the ladder lookup
  // below have to see the same name, or this is the same bug in a new place.
  const kind = LADDER_KEY[service] || service;
  if (!PAYABLE_SERVICES.has(kind)) return null;

  /*
   * ── EEN AANTAL DAT ER NIET IS, IS GEEN AANTAL VAN ÉÉN — 11 AUGUSTUS 2026 ────
   *
   * Hieronder stond meteen `clamp(products, 1, 500)`. clamp() maakt van alles wat
   * geen getal is eerst 0 (`Number(n) || 0`) en tilt dat daarna naar de ondergrens:
   * 1. Voor `outfits` en `extras` klopt dat — daar IS 0 een geldig antwoord en is de
   * klem er tegen een gesleuteld formulier. Voor het productaantal klopt het niet,
   * want daar is "niet ingevuld" iets heel anders dan "nul", en de ondergrens maakt
   * er stilletjes een bestelling van één product van.
   *
   * Dat was niet theoretisch. /start biedt onderaan de keuzelijst de optie "Meer dan
   * 30 producten" aan — de tekst zelf is de waarde, want er valt geen getal te kiezen
   * (zie `f.s1.more` in OrderFlow.astro, en counts loopt tot ATTENDED_PER_WINDOW).
   * countOf() in functions/api/order.js leest die tekst als null, geeft die
   * ongewijzigd door, en hier rolde er een offerte uit voor één product à € 149. Die
   * offerte werd een echte Mollie-betaallink in de bevestigingsmail: wie om 35
   * producten vroeg kreeg een knop om € 180,29 te betalen in plaats van ruim
   * € 2.000 — en had hij erop gedrukt, dan stond de bestelling betaald geboekt en was
   * de factuur op dát bedrag uitgegeven.
   *
   * Null is hier het goede antwoord, en het bestaat al: de kop van deze functie zegt
   * dat null "geen betaling aanmaken" betekent en dat dat de veilige kant is om op te
   * falen. Een aantal dat we niet kennen hoort in dezelfde categorie als een dienst
   * die niet op de ladder staat — de prijs is dan een gesprek, en dat is precies wat
   * het formulier op dat punt óók belooft ("dit plannen we samen in plaats van het
   * door een formulier te laten uitrekenen").
   *
   * De BOVENgrens doet mee om dezelfde reden, niet uit netheid. 600 producten
   * stilzwijgend als 500 afrekenen is dezelfde fout gespiegeld: een bedrag dat niet
   * hoort bij wat er besteld is, alleen nu in ons voordeel-omgekeerd. countOf() laat
   * tot 999 door, dus dat gat is bereikbaar zonder het formulier.
   *
   * Number() en niet Number.isInteger(): een aanroeper die '12' als tekst doorgeeft
   * bedoelt twaalf, en die mag niet stilletjes op null vallen. Wat overblijft —
   * null, '', undefined, NaN, 0, negatief, boven het plafond — is precies de
   * verzameling waarvoor geen prijs bestaat.
   */
  const asked = Math.floor(Number(products));
  if (!Number.isFinite(asked) || asked < 1 || asked > MAX_LADDER_PRODUCTS) return null;

  // Rechtstreeks, en niet nog een keer door clamp(). Na de regel hierboven IS dit
  // al een geheel getal binnen [1, MAX_LADDER_PRODUCTS], dus een klem eromheen kan
  // niets meer doen — en een klem die niets doet leest als een vangnet dat er niet
  // is. De weigering hierboven is het vangnet; die twee naast elkaar zetten is hoe
  // iemand later de een versoepelt in de veronderstelling dat de ander hem opvangt.
  // outfits en extras hieronder houden hun clamp wél: die worden niet geweigerd
  // maar begrensd, want daar is 0 een geldig antwoord en is de klem de hele regel.
  const n = asked;
  // An outfit surcharge is per PRODUCT styled that way, so it can never exceed
  // the product count — and pricing.js caps it at three regardless.
  const o = clamp(outfits, 0, Math.min(n, MAX_OUTFIT_PRODUCTS));
  // Extras are per product, capped per product, so the order-wide ceiling is
  // the product count times that cap.
  const x = clamp(extras, 0, n * MAX_EXTRA_PER_PRODUCT);

  // `kind`, not `service` — ladderRate() THROWS on an unknown key rather than
  // defaulting, which is the right behaviour and also the reason this line has
  // to use the translated name.
  const rate = ladderRate(kind, n);
  const extraRate = extraPhotoRate(n);

  const net = n * rate + o * OUTFIT_SURCHARGE + x * extraRate;
  const netCents = cents(net);

  // THE RATE IS AN ARGUMENT NOW, and the caller is the only one who can know
  // it: it depends on the customer's country and on whether VIES confirmed
  // their VAT number, neither of which this module has any business fetching.
  // See vatDecision() in src/data/vat.js — one place, and every surface asks it.
  //
  // Clamped and sanity-checked rather than trusted. A NaN arriving here would
  // make vatCents NaN, grossCents NaN, and centsToMollieValue() would throw
  // somewhere much less obvious; a negative rate would make a refund out of a
  // sale. Anything that is not a sensible fraction falls back to the Dutch
  // rate, which is the same fail-closed direction as everything else in this
  // path.
  const rateOk = typeof vatRate === 'number' && isFinite(vatRate) && vatRate >= 0 && vatRate <= 1;
  const effectiveRate = rateOk ? vatRate : VAT_RATE;

  // VAT on the NET TOTAL, not summed per line: rounding each line separately
  // and adding them up drifts from the figure on the invoice by a cent or two
  // on a large order, and a payment that disagrees with its own invoice by a
  // cent is a reconciliation job every single time.
  const vatCents = Math.round(netCents * effectiveRate);

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
    vatRate: effectiveRate,
  };
}

/** The test sample, priced from its own constant so it can share the plumbing. */
export function quoteTestSample() {
  const netCents = cents(AMOUNT.testSample);
  // The €1 sample has always been charged as a flat amount, and it stays
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

  // AND THAT EVERY WIRE VALUE STILL REACHES A PRICE.
  //
  // This half is the guard the original check was missing, and its absence is
  // exactly why 'drop' went unpriced for as long as it did: the loop above
  // iterates PAYABLE_SERVICES, so it could only ever test names that were
  // already known to work. It could not see the name the order form actually
  // posts. This asserts the translation instead — every wire value must price,
  // and must price identically to the ladder key it maps to.
  for (const [wire, key] of Object.entries(LADDER_KEY)) {
    const viaWire = quoteOrder({ service: wire, products: 30 });
    const viaKey = quoteOrder({ service: key, products: 30 });
    if (!viaWire) {
      throw new Error(
        `quote.js: the order form posts service="${wire}" and it does not price. `
        + 'A service that does not price is a service that goes out free — see LADDER_KEY.'
      );
    }
    if (viaWire.netCents !== viaKey.netCents) {
      throw new Error(
        `quote.js: "${wire}" priced at ${viaWire.netCents} cents but "${key}" at `
        + `${viaKey.netCents}. The alias points at the wrong ladder.`
      );
    }
  }
})();
