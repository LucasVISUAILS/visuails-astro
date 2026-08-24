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
// one place a price is worked out from the ladder and the order’s own fields,
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
  MAX_OUTFIT_PRODUCTS, AMOUNT, VAT_RATE,
} from '../data/pricing.js';
/* Twee namen voor dezelfde import, met opzet: de controle onderaan vergelijkt
   ze en dat leest alleen als een controle wanneer er twee namen staan. Zou
   iemand de export hierboven ooit terugzetten naar een eigen constante, dan
   valt deze tweede naam er niet mee terug en slaat de controle aan. */
import { VAT_RATE as PRICING_VAT_RATE } from '../data/pricing.js';

/**
 * The DUTCH rate. Not "the rate everyone pays" any more.
 *
 * This constant used to be commented "the rate Mollie collects from everyone,
 * pending the per-country model", and BRIEF-14 described that model as future
 * work. It is not future work now: quoteOrder() takes a rate, src/data/vat.js
 * decides which one, and this is only the default — the answer for a Dutch
 * customer, and for every case where we could not prove otherwise.
 *
 * ── HET WAS EEN KOPIE, EN DE MOTIVERING KLOPTE NIET — 23 augustus 2026 ────
 *
 * Hier stond `export const VAT_RATE = 0.21`, met als reden dat deze module door
 * een Cloudflare Worker wordt geladen en dat de twee helften bij het bouwen
 * tegen elkaar worden gecontroleerd door assertQuoteMatches().
 *
 * Allebei die halve waarheden gaven samen een gat. Deze module IMPORTEERT AL uit
 * ../data/pricing.js — de ladder, de toeslagen, AMOUNT — dus de Worker-reden
 * bestond niet: er was geen enkele grens die één extra naam niet ook kon
 * oversteken. En assertQuoteMatches() controleerde het tarief NIET: die functie
 * loopt diensten en laddertreden af en toetst netCents. De string VAT_RATE kwam
 * er niet in voor.
 *
 * Netto-effect: `pricing.js` op 0.19 zetten liet de kassa 21 procent rekenen,
 * met alle tests groen. Dit is dus geen opruiming maar een reparatie.
 *
 * Doorgegeven en niet opnieuw geschreven, zodat elke lezer die
 * `import { VAT_RATE } from './quote.js'` doet — subscription.js, account.js,
 * invoice.js en vier tests — ongewijzigd de ENE waarde krijgt.
 */
export { VAT_RATE };

/** Services that can be priced from the ladder. Anything else is not payable. */
export const PAYABLE_SERVICES = new Set(['catalog', 'lifestyle', 'complete']);

/**
 * DIENSTEN MET ÉÉN VAST BEDRAG, EN WAAROM DIE NIET IN PAYABLE_SERVICES STAAN.
 *
 * PAYABLE_SERVICES betekent iets preciezers dan "hier valt voor te betalen": het
 * betekent *deze dienst is uit de ladder te prijzen*. quoteOrder() leest die
 * verzameling en gaat daarna meteen naar ladderRate(), en ladderRate() GOOIT bij
 * een onbekende sleutel in plaats van terug te vallen — met opzet, zie
 * pricing.js. Een merkmodel op die lijst zetten zou dus geen prijs opleveren maar
 * een uitzondering, op het pad dat een betaling aanmaakt.
 *
 * Een merkmodel heeft geen aantal en geen trede. Het is één bedrag, één keer, en
 * dat staat in AMOUNT.brandModel. Vandaar een tweede verzameling met een eigen
 * offertefunctie ernaast (quoteBrandModel), precies zoals de proefvisual dat al
 * deed — alleen stond die als los `svc === 'test-sample'` in de aanroeper en
 * daarmee nergens bij naam.
 *
 * DE PROEFVISUAL STAAT HIER BEWUST NIET IN. isPayableService() hieronder wordt
 * óók gelezen door het klantdashboard, dat er een knop "Nu betalen" van maakt,
 * en account.js zet daar `|| order.service === SAMPLE_SERVICE` naast omdat de
 * proef zijn eigen pad heeft (betalen gebeurt meteen, of helemaal niet). Die
 * uitzondering hier binnentrekken verandert bestaand gedrag op een pad waar niets
 * mis mee is; tests/order-api.test.mjs legt dat ook vast.
 */
export const FIXED_PRICE_SERVICES = new Set(['brand-model']);

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
  const kind = ladderKey(service);
  return PAYABLE_SERVICES.has(kind) || FIXED_PRICE_SERVICES.has(kind);
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
 * Een btw-tarief dat je in een berekening durft te stoppen.
 *
 * Stond inline in quoteOrder() en wordt nu door twee functies gebruikt, dus hier
 * een keer. Een NaN die hier langs komt maakt vatCents NaN, grossCents NaN, en laat
 * centsToMollieValue() ergens veel onduidelijker omvallen; een negatief tarief maakt
 * van een verkoop een teruggave. Alles wat geen zinnige fractie is valt terug op het
 * Nederlandse tarief -- dezelfde faalrichting als de rest van dit pad.
 */
function safeRate(vatRate) {
  const ok = typeof vatRate === 'number' && isFinite(vatRate) && vatRate >= 0 && vatRate <= 1;
  return ok ? vatRate : VAT_RATE;
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
  const effectiveRate = safeRate(vatRate);

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

/**
 * De proefvisual, en die rekent van boven naar beneden in plaats van omgekeerd.
 *
 * ── DE FISCALE KEUZE, 12 AUGUSTUS 2026 ──────────────────────────────────────
 *
 * Deze functie had tot vandaag nul aanroepers en zei `vatCents: 0` met de noot
 * "treated as VAT-inclusive". Dat was geen behandeling maar een uitgestelde
 * beslissing: btw nul zetten en het bedrag inclusief noemen zijn twee verschillende
 * dingen, en de webhook sloeg de factuur daarom over (zie de noot bij de
 * factuurstap in functions/api/webhook/mollie.js).
 *
 * De keuze is nu gemaakt: **€1 is een brutobedrag, inclusief btw.** Dat is de enige
 * variant die klopt met wat er gebeurt — Mollie schrijft precies €1,00 af, en dat
 * bedrag is dus per definitie wat de klant totaal betaalt. Er staat op geen enkele
 * pagina "excl. btw" bij, en dat mag ook niet: bij een prijs die aan een consument
 * getoond wordt is inclusief de norm, en €1 is juist gekozen omdat het rond is.
 *
 * ── WAAROM BRUTO MIN NETTO, EN NIET NETTO MAAL TARIEF ───────────────────────
 *
 * Hier zit de enige val in deze functie. Bij 21% is het netto 100 / 1,21 = 82,6446…
 * cent, dus 83 cent afgerond. Zou de btw dan `round(83 × 0,21) = 17` worden, dan
 * telt het toevallig op tot 100 — maar dat is toeval. Bij een brutobedrag van 100
 * cent doen 3068 van de 10.001 tarieven tussen 0% en 100% het anders, en op 21%
 * lopen 868 van de eerste 5000 bedragen uiteen. Neem je de btw als VERSCHIL
 * (100 − 83 = 17), dan tellen netto en btw altijd op tot precies het bedrag dat is
 * afgeschreven. Dat is dezelfde regel die de creditnota's aanhouden, en om dezelfde
 * reden: een factuur die een cent afwijkt van de betaling is elke keer handwerk.
 * tests/sample-invoice.test.mjs loopt alle tarieven langs.
 *
 * Bij verlegging of buiten de heffing (tarief 0) komt hier netto €1 en btw €0 uit,
 * en betaalt de klant nog steeds €1. Het brutobedrag verschuift nooit — alleen de
 * verdeling erbinnen.
 */
export function quoteTestSample({ vatRate = VAT_RATE } = {}) {
  const grossCents = cents(AMOUNT.testSample);
  const effectiveRate = safeRate(vatRate);
  const netCents = Math.round(grossCents / (1 + effectiveRate));
  return {
    service: 'test-sample',
    products: 1,
    outfits: 0,
    extras: 0,
    netCents,
    vatCents: grossCents - netCents,
    grossCents,
    vatRate: effectiveRate,
  };
}

/**
 * Het merkmodel: één bedrag, één keer, en de btw gaat eróver.
 *
 * ── WAAROM DIT DE ANDERE KANT OP REKENT DAN quoteTestSample() ──────────────
 *
 * De proefvisual rekent van bruto naar netto: € 1 is wat er van de kaart gaat en
 * de btw zit erin. Dat is daar de goede keuze omdat "één euro" de belofte is die
 * op de pagina staat.
 *
 * Hier is de belofte een andere. Elk bedrag op deze site is exclusief btw — dat
 * is niet een detail maar een regel met een eigen functie eromheen (vatLead() in
 * pricing.js, zichtbaar op elke pagina met een prijs). € 450 is dus het NETTO
 * bedrag, en een zakelijke klant met een geldig btw-nummer in een ander EU-land
 * betaalt precies die € 450 doordat het tarief 0 is. Zou dit van bruto naar netto
 * rekenen, dan kreeg diezelfde klant € 371,90 + € 0 op zijn factuur en betaalde
 * hij minder dan de prijs die er stond.
 *
 * ── EN HET AANTAL IS 1, NIET 0 ────────────────────────────────────────────
 *
 * invoice.js maakt van een offerte één factuurregel met qty 1 (zie regel ~237),
 * en de bevestigingsmail drukt `quote.products` af als er een getal staat. Nul
 * zou daar "0 producten" van maken op een factuur van € 544,50. Eén merkmodel is
 * één stuk, en dat is ook wat het is.
 */
export function quoteBrandModel({ vatRate = VAT_RATE } = {}) {
  const netCents = cents(AMOUNT.brandModel);
  const effectiveRate = safeRate(vatRate);
  const vatCents = Math.round(netCents * effectiveRate);
  return {
    service: 'brand-model',
    products: 1,
    outfits: 0,
    extras: 0,
    netCents,
    vatCents,
    grossCents: netCents + vatCents,
    vatRate: effectiveRate,
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
  /* Zonder deze regel viel een merkmodel door naar de `what`-tabel hieronder,
     die op laddernamen is gesleuteld, en werd de omschrijving op de
     checkoutpagina én op het bankafschrift *"VISUAILS — 1 producten,
     undefined"*. Precies de fout die drie regels lager in vijfentwintig regels
     staat beschreven; hier voorkomen in plaats van herhaald. */
  if (quote.service === 'brand-model') return nl ? 'VISUAILS merkmodel' : 'VISUAILS Brand Model';
  const what = nl
    ? { catalog: 'catalogsets', lifestyle: 'lifestyle-carousels', complete: 'catalog + lifestyle' }
    : { catalog: 'catalog sets', lifestyle: 'lifestyle carousels', complete: 'catalog + lifestyle' };
  /*
   * ── DEZELFDE VAL, VOOR DE DERDE KEER — 14 AUGUSTUS 2026 ────────────────────
   *
   * `what` is gesleuteld op de LADDERNAAM, en `quote.service` draagt de
   * WIRE-waarde: /start/complete post 'drop'. Zonder deze vertaling gaf deze
   * functie letterlijk *"VISUAILS — 30 producten, undefined"* terug — gemeten,
   * niet beredeneerd — en dat is de omschrijving die Mollie op de checkoutpagina
   * zet en die op het bankafschrift van de klant terechtkomt. Op de duurste deur
   * van de site, bij elk aantal producten, in elke bevestigingsmail.
   *
   * De reparatie stond al ergens: account.js:3233 wikkelde de dienst in
   * ladderKey() met precies deze uitleg erboven. Alleen het primaire pad —
   * functions/api/order.js, de link die élke bestelling meekrijgt — was nooit
   * meegenomen. Vandaar dat de vertaling nu HIER staat en niet bij de aanroeper:
   * zie de kop van ladderKey() over waarom een vertaling die elke aanroeper zelf
   * moet kennen, de aanroeper is die hem vergeet.
   */
  const kind = ladderKey(quote.service);
  const n = quote.products;
  return nl
    ? `VISUAILS — ${n} ${n === 1 ? 'product' : 'producten'}, ${what[kind]}`
    : `VISUAILS — ${n} ${n === 1 ? 'product' : 'products'}, ${what[kind]}`;
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
  /* ── EERST HET TARIEF, WANT DAT WAS HET GAT — 23 augustus 2026 ────────────
     Deze controle liep diensten en laddertreden af en toetste netCents. Het
     BTW-TARIEF kwam er niet in voor, terwijl de kop van dit bestand beweerde
     dat "de twee helften tegen elkaar worden gecontroleerd". Het tarief is nu
     één waarde (zie de noot bij de export bovenaan), dus uit elkaar lopen kan
     niet meer — maar deze regels blijven staan als vangnet voor de volgende die
     hem toch weer overtypt, en ze toetsen meteen of het bedrag dat een klant
     betaalt echt uit dat tarief volgt.

     De rekensom en niet alleen de gelijkheid: `quoteOrder` mag het tarief
     onderweg niet kwijtraken, afronden op de verkeerde plek of op safeRate()
     terugvallen. Eén order doorrekenen bewijst dat in één regel. */
  if (VAT_RATE !== PRICING_VAT_RATE) {
    throw new Error(
      `quote.js: het btw-tarief is ${VAT_RATE} en pricing.js zegt ${PRICING_VAT_RATE}. `
      + 'Er hoort er maar één te zijn — zie de noot bij de export van VAT_RATE.'
    );
  }
  {
    const q = quoteOrder({ service: 'catalog', products: 10 });
    const verwacht = Math.round(q.netCents * VAT_RATE);
    if (q.vatCents !== verwacht || q.grossCents !== q.netCents + verwacht) {
      throw new Error(
        `quote.js: over ${q.netCents} cent netto werd ${q.vatCents} cent btw gerekend, `
        + `verwacht ${verwacht} bij een tarief van ${VAT_RATE}. Het bedrag dat de klant `
        + 'betaalt volgt niet meer uit het tarief.'
      );
    }
  }

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
