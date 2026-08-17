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
// SCOPE, TODAY: the €1 test sample only, same as the Stripe version it
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
 * The API key, cleaned and checked before it is ever put in a header.
 *
 * WHY THIS IS NOT JUST `env.MOLLIE_API_KEY`
 * A secret arrives by being pasted into a terminal or a dashboard field, and
 * paste is lossy in ways that are invisible in a text box: a trailing newline
 * from hitting Enter, a leading space, or — the nasty one — a NON-BREAKING
 * SPACE (U+00A0) picked up from copying out of a styled web page. Ordinary
 * spaces and newlines are stripped by the Fetch spec's header normalisation
 * and do no harm. U+00A0 is not whitespace to that rule: it survives, gets
 * encoded as the raw byte 0xA0, and goes onto the wire inside the header
 * value. A byte outside the printable ASCII range is not legal in a header
 * value, so the receiving end rejects the whole request at the HTTP layer —
 * which is to say **400 Bad Request with an empty body**, before any of
 * Mollie's own code runs and therefore with none of Mollie's own JSON error
 * shape. Verified on the wire: `Bearer test_abc ` is transmitted intact,
 * where `Bearer test_abc\n` and `Bearer test_abc ` are silently trimmed.
 *
 * That is a specific, checkable cause for a symptom that has otherwise been
 * chased twice on this project — see the Stripe history in this file's header,
 * which is the same empty 400 from a different provider. It may not be THE
 * cause. It is cheap to rule out permanently, and the alternative is a stray
 * byte that no log will ever name.
 *
 * So: strip anything that is not a printable ASCII character, then insist on
 * the shape Mollie documents (`test_` or `live_` followed by alphanumerics).
 * A key that fails that check throws HERE, with a message that says what is
 * wrong with it, instead of becoming a blank 400 forty milliseconds later.
 */
export function mollieKey(env) {
  const raw = env?.MOLLIE_API_KEY;
  if (!raw) throw new Error('mollie: MOLLIE_API_KEY not configured');

  const cleaned = String(raw).replace(/[^\x21-\x7E]/g, '');
  if (!/^(test|live)_[A-Za-z0-9]{20,}$/.test(cleaned)) {
    // The key itself never appears in an error. Its length and its first five
    // characters do: `test_` / `live_` is not a secret and is the single most
    // useful thing to know when a payment fails on the wrong environment.
    throw new Error(
      `mollie: MOLLIE_API_KEY does not look like a Mollie key ` +
      `(${cleaned.length} usable chars, starts "${cleaned.slice(0, 5)}", ` +
      `${String(raw).length - cleaned.length} character(s) stripped as non-printable). ` +
      `Expected test_… or live_… — re-paste it, and mind invisible characters.`
    );
  }
  return cleaned;
}

/** What was wrong with the stored key, for a diagnostic to report without ever
 *  showing the key. Returns null when it is clean. */
export function mollieKeyProblems(env) {
  const raw = env?.MOLLIE_API_KEY;
  if (!raw) return ['not set'];
  const s = String(raw);
  const bad = [];
  if (s !== s.trim()) bad.push('leading or trailing whitespace');
  const nonAscii = [...s].filter((c) => c.charCodeAt(0) < 0x21 || c.charCodeAt(0) > 0x7e);
  if (nonAscii.length) {
    bad.push(`${nonAscii.length} non-printable character(s): ` +
      nonAscii.map((c) => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(', '));
  }
  if (!/^(test|live)_/.test(s.trim())) bad.push('does not start with test_ or live_');
  // Length last, so a key that is BOTH dirty and short reports both rather
  // than only the one that happens to be checked first.
  if (s.replace(/[^\x21-\x7E]/g, '').length < 25) bad.push('too short to be a Mollie key');
  return bad.length ? bad : null;
}

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
  return createMolliePayment(env, {
    ref,
    lang,
    successUrl,
    webhookUrl,
    valueEuros: AMOUNT.testSample.toFixed(2),
    description: lang === 'nl' ? 'VISUAILS proefvisual' : 'VISUAILS test sample',
  });
}

/**
 * A Payment for a real order, at an amount THIS SERVER worked out.
 *
 * Added August 2026, when catalog and lifestyle became payable. Everything
 * about the request is identical to the test sample's — same endpoint, same
 * metadata, same webhook, same error reporting — so the two share one
 * implementation below rather than being two copies that drift.
 *
 * THE AMOUNT COMES FROM src/lib/quote.js AND NOWHERE ELSE. This function takes
 * a value in euros as a string because Mollie's API wants one, but the caller
 * must produce it with centsToMollieValue() from a quoteOrder() result. There
 * is deliberately no path here that accepts a figure the browser posted: an
 * amount a customer can influence is an amount a customer can choose.
 *
 * `grossCents` is passed separately purely so this function can refuse a
 * mismatch — a formatting slip between the cents we recorded and the string we
 * send is the kind of bug that charges the wrong amount silently and is only
 * found in a bank reconciliation weeks later.
 */
export async function createOrderMolliePayment(env, {
  ref, lang, successUrl, webhookUrl, valueEuros, grossCents, description, excludeIdeal,
}) {
  const asCents = Math.round(Number(valueEuros) * 100);
  if (!Number.isFinite(asCents) || asCents !== Math.round(Number(grossCents))) {
    throw new Error(
      `mollie: refusing to charge ${valueEuros} against a quote of ${grossCents} cents — `
      + 'the formatted value and the computed total disagree (src/lib/quote.js).'
    );
  }
  // Mollie's own floor. Below it the API refuses the request anyway; catching
  // it here gives a message that names the order instead of a raw 422.
  if (asCents < 1) throw new Error(`mollie: refusing to create a payment of ${valueEuros} for ${ref}`);

  return createMolliePayment(env, { ref, lang, successUrl, webhookUrl, valueEuros, description, excludeIdeal });
}

/*
 * WAAROM iDEAL SOMS NIET WORDT AANGEBODEN — augustus 2026.
 *
 * `btwverleggingspecificatie.md` §3 wil iDEAL gebruiken als kruiscontrole op een
 * niet-Nederlandse btw-claim: betaalt iemand met iDEAL terwijl hij zegt een Duits
 * bedrijf te zijn, markeer de order dan. Dat is een goed signaal, maar het komt
 * te laat om er iets aan te doen — het middel wordt gekozen op de betaalpagina
 * van Mollie, ná het vaststellen van het tarief, dus je ziet het pas als de 0%
 * al op de factuur staat.
 *
 * Dus doen we het andersom. Staat een order op 0% omdat de klant zegt buiten
 * Nederland te zitten, dan bieden we iDEAL niet aan. Een Nederlandse
 * bankrekening is dan geen bewijs meer dat achteraf moet worden uitgezocht: de
 * samenloop kan simpelweg niet ontstaan. Wie werkelijk een Duitse GmbH is,
 * betaalt met een kaart of een SEPA-overboeking en merkt er niets van.
 *
 * `paymentMismatch()` in src/data/vat.js blijft bestaan als tweede net, voor de
 * gevallen waar deze uitsluiting niet greep — een oudere betaallink, of een
 * order die met de hand is aangemaakt.
 *
 * WERKING BIJ MOLLIE. Er is geen "exclude"-parameter. `method` op een array zet
 * juist een witte lijst: alleen die middelen worden aangeboden. Dus noemen we de
 * middelen die wél mogen. Staat er in dit account iets niet aan, dan negeert
 * Mollie dat middel gewoon; wat overblijft is wat er is.
 */
const NON_NL_METHODS = ['creditcard', 'bancontact', 'banktransfer', 'paypal', 'eps', 'giropay', 'sofort'];

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HERHALING — 16 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas vroeg of een abonnement kan. Het antwoord was: Mollie kan het wel, dit
 * bestand kon het niet — er stonden negen functies en geen ervan raakte aan een
 * mandaat, een customer of een subscription. Dit blok is dat gat.
 *
 * ── DE KETEN, EN WAAROM ELKE STAP APART STAAT ──────────────────────────────
 *
 *   1 · createMollieCustomer()      een klant bij Mollie, één keer per klant
 *   2 · createFirstPayment()        een ECHTE betaling met sequenceType 'first'
 *   3 · firstPaymentMandate()       het mandaat dat daaruit rolde, uitlezen
 *   4 · createMollieSubscription()  Mollie schrijft vanaf nu zelf af
 *   5 · cancelMollieSubscription()  en stopt weer
 *
 * Vier functies en niet één `setUpSubscription()`, omdat de vier stappen op vier
 * verschillende momenten gebeuren en er tussen 2 en 3 een BEZOEKER zit: hij
 * moet naar Mollie, betalen, en terugkomen. Een functie die de hele keten in één
 * aanroep doet, zou die redirect niet kunnen bestaan.
 *
 * ── HET MANDAAT KOMT ALLEEN UIT EEN ECHTE BETALING ─────────────────────────
 *
 * Dat is de enige harde beperking in het hele verhaal. Volledig gratis beginnen
 * kan niet; er moet één transactie zijn. Vandaar dat een gratis periode wordt
 * gebouwd als: een kleine eerste betaling om het mandaat te zetten, en daarna een
 * subscription met `startDate` in de toekomst. Zie createMollieSubscription().
 *
 * ── EN WAAROM MOLLIE ZELF AFSCHRIJFT EN NIET WIJ ───────────────────────────
 *
 * Er zijn twee manieren: de Subscriptions API (Mollie schrijft af op een
 * interval) of zelf betalingen aanmaken met sequenceType 'recurring'. Wij nemen
 * de eerste, en dat is een besluit over ONDERHOUD en niet over elegantie: de
 * tweede vraagt een taak die elke maand op tijd moet draaien, moet weten wie er
 * aan de beurt is, en moet onthouden wat er al gelukt is. Dat is precies het
 * soort ding dat bij één persoon stilletjes stukgaat. Mollie doet het, en wij
 * verwerken alleen de melding.
 */

/**
 * Een klant bij Mollie. Nodig voordat er een mandaat kan bestaan.
 *
 * `metadata.customer_id` gaat mee zodat een rij in het Mollie-dashboard terug te
 * vinden is in onze eigen database — dezelfde reden als `order_ref` op een
 * betaling. Zonder dat is een mandaat in hun overzicht een e-mailadres en verder
 * niets.
 */
export async function createMollieCustomer(env, { customerId, email, name }) {
  return mollieRequest(env, 'POST', '/customers', {
    name: String(name || email || 'VISUAILS-klant').slice(0, 100),
    email: String(email || '').slice(0, 200),
    locale: 'nl_NL',
    metadata: { customer_id: String(customerId) },
  });
}

/**
 * De eerste betaling: die zet het mandaat.
 *
 * `sequenceType: 'first'` is het hele verschil met createOrderMolliePayment().
 * Wat de klant hier betaalt, is niet noodzakelijk de eerste maand — bij een
 * gratis periode is het € 1 en niets meer. Wat het WEL doet is een mandaat
 * opleveren waarmee Mollie daarna mag afschrijven.
 *
 * iDEAL BLIJFT AANGEBODEN, en dat is bij een abonnement anders dan bij een
 * bestelling op 0% btw (zie NON_NL_METHODS hierboven): een eerste betaling via
 * iDEAL levert een SEPA-incassomandaat op, en dat is precies hoe een Nederlands
 * zakelijk abonnement normaal loopt. Uitsluiten zou de meest gebruikelijke weg
 * dichtgooien.
 *
 * `ref` reist mee in de metadata onder `sub_ref` en NIET onder `order_ref`. Dat
 * verschil is opzettelijk en het is de reden dat recordPaid() in de webhook deze
 * betaling niet als een verdwaalde bestelling behandelt.
 */
export async function createFirstPayment(env, {
  subscriptionRef, mollieCustomerId, valueEuros, description, lang, successUrl, webhookUrl,
}) {
  const cents = Math.round(Number(valueEuros) * 100);
  if (!Number.isFinite(cents) || cents < 1) {
    throw new Error(`mollie: een eerste betaling van ${valueEuros} kan niet — het mandaat vraagt een echte transactie`);
  }
  return mollieRequest(env, 'POST', '/payments', {
    amount: { currency: 'EUR', value: Number(valueEuros).toFixed(2) },
    customerId: mollieCustomerId,
    sequenceType: 'first',
    description: String(description || 'VISUAILS abonnement').slice(0, 255),
    redirectUrl: successUrl,
    webhookUrl,
    locale: lang === 'nl' ? 'nl_NL' : 'en_GB',
    metadata: { sub_ref: String(subscriptionRef) },
  });
}

/**
 * Het mandaat dat uit een geslaagde eerste betaling is gerold.
 *
 * NIET UIT DE BETALING ZELF, en dat is gemeten gedrag en geen voorkeur: het veld
 * `mandateId` op een payment is er niet altijd op het moment dat de webhook komt.
 * De mandaten van de klant opvragen en de nieuwste geldige pakken, werkt altijd —
 * en het is dezelfde afweging als bij RETURNING in admin.js: vraag het aan de
 * bron in plaats van te hopen dat een veld al gevuld is.
 *
 * `valid` en niet 'pending': een mandaat dat nog niet geldig is, kan niet
 * afschrijven, en een subscription erop aanmaken levert een abonnement op dat
 * niets doet.
 */
export async function firstPaymentMandate(env, mollieCustomerId) {
  const list = await mollieRequest(env, 'GET', `/customers/${encodeURIComponent(mollieCustomerId)}/mandates?limit=50`);
  const mandates = list?._embedded?.mandates || [];
  const geldig = mandates.filter((m) => m.status === 'valid');
  if (!geldig.length) return null;
  // De nieuwste. Mollie geeft ze nieuwste-eerst, maar dat is niet gedocumenteerd
  // als garantie, dus wordt er op createdAt gesorteerd in plaats van op de
  // volgorde van de lijst.
  geldig.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return geldig[0];
}

/**
 * Vanaf hier schrijft Mollie zelf af.
 *
 * ── `startDate` IS HOE EEN GRATIS PERIODE WERKT ────────────────────────────
 *
 * Nagekeken in de Create-subscription-documentatie: `startDate` (YYYY-MM-DD)
 * stelt de eerste afschrijving uit. Twee maanden gratis is dus: een eerste
 * betaling van € 1 voor het mandaat, en deze subscription met `startDate` op
 * vandaag plus twee maanden. De klant betaalt twee maanden niets en daarna elke
 * maand het volle bedrag, automatisch.
 *
 * ── `times` MAAKT DE JAARVERBINTENIS ZELFSTOPPEND ──────────────────────────
 *
 * Ook uit de documentatie: na `times` afschrijvingen is de subscription
 * voltooid. Bij een termijn van twaalf maanden zetten we hem daarom op 12 in
 * plaats van te onthouden dat hij ooit opgezegd moet worden. Een verbintenis die
 * zichzelf beëindigt, is een verbintenis die niet per ongeluk doorloopt — en bij
 * één persoon is dat het verschil tussen een systeem en een aantekening.
 *
 * Bij de maandtermijn blijft `times` weg: die loopt door tot iemand hem stopt.
 */
export async function createMollieSubscription(env, {
  mollieCustomerId, mandateId, valueEuros, description, webhookUrl, startDate, times,
}) {
  const cents = Math.round(Number(valueEuros) * 100);
  if (!Number.isFinite(cents) || cents < 1) {
    throw new Error(`mollie: een abonnement van ${valueEuros} per maand kan niet`);
  }
  const body = {
    amount: { currency: 'EUR', value: Number(valueEuros).toFixed(2) },
    interval: '1 month',
    description: String(description || 'VISUAILS abonnement').slice(0, 255),
    webhookUrl,
  };
  // Alleen meesturen als ze er zijn. Een `startDate` van vandaag is niet
  // hetzelfde als geen startDate — Mollie mag zelf bepalen wanneer de eerste
  // termijn valt — en een `times: null` is een veld dat de API niet verwacht.
  if (mandateId) body.mandateId = mandateId;
  if (startDate) body.startDate = startDate;
  if (Number.isInteger(times) && times > 0) body.times = times;

  return mollieRequest(env, 'POST', `/customers/${encodeURIComponent(mollieCustomerId)}/subscriptions`, body);
}

/**
 * Stoppen. Onmiddellijk en zonder verdere afschrijving.
 *
 * EEN 404 IS HIER GEEN FOUT. Een abonnement dat bij Mollie al voltooid of al
 * opgezegd is, is precies de toestand die we willen — hem als mislukking
 * behandelen zou betekenen dat een klant die twee keer op opzeggen drukt een
 * foutpagina krijgt voor iets dat gelukt is. Zelfde soort afweging als de
 * `no such column`-terugvallen elders in dit project: verdragen wat al waar is.
 */
export async function cancelMollieSubscription(env, { mollieCustomerId, subscriptionId }) {
  try {
    return await mollieRequest(
      env, 'DELETE',
      `/customers/${encodeURIComponent(mollieCustomerId)}/subscriptions/${encodeURIComponent(subscriptionId)}`
    );
  } catch (err) {
    if (/\b404\b/.test(String(err?.message || ''))) return { status: 'canceled', alreadyGone: true };
    throw err;
  }
}

/**
 * Eén verzoek aan Mollie, met de foutbehandeling die dit bestand al had.
 *
 * WAAROM DIT ER NU IS. De drie bestaande aanroepen hadden elk hun eigen fetch met
 * hun eigen kopieerde headers en hun eigen foutblok — driemaal dezelfde twintig
 * regels. Met vijf nieuwe functies erbij zou dat acht keer worden, en dan is de
 * negende de kopie die één regel mist. De foutmelding hieronder is woordelijk de
 * melding die createMolliePayment() al maakte, inclusief de lege-body-diagnose:
 * een 400 zonder inhoud komt niet van Mollie's applicatie maar van iets ervoor,
 * en dan zijn de headers het enige bewijs van wie dat was.
 */
async function mollieRequest(env, method, path, body) {
  const key = mollieKey(env);
  const res = await fetch(`${MOLLIE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await res.text();
  const parsed = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  if (!res.ok) {
    const detail = parsed?.title
      ? `${parsed.title} (field: ${parsed.field || 'n/a'}) — ${parsed.detail || ''}`
      : raw.slice(0, 500) || `(EMPTY BODY — not a Mollie application error. Response headers: ${describeHeaders(res)})`;
    throw new Error(`mollie ${method} ${path} failed (${res.status}): ${detail}`);
  }
  return parsed;
}

/** The one request both creators make. */
async function createMolliePayment(env, { ref, lang, successUrl, webhookUrl, valueEuros, description, excludeIdeal }) {
  const key = mollieKey(env);

  const body = {
    amount: {
      currency: 'EUR',
      value: valueEuros,
    },
    description,
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

  // Alleen zetten als het nodig is: een lege of onnodige witte lijst zou
  // middelen wegnemen bij gewone Nederlandse bestellingen, en dat is precies het
  // soort stille verslechtering waar niemand een melding van krijgt.
  if (excludeIdeal) body.method = NON_NL_METHODS;

  const res = await fetch(`${MOLLIE_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
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
    // An EMPTY body is itself the diagnosis and has to be reported as one.
    // Mollie answers every application-level error with JSON — a 400 with
    // nothing in it did not come from Mollie's application at all, it came
    // from whatever sits in front of it rejecting the request before it got
    // there. The response headers are the only evidence of who that was, so
    // they go in the message rather than being thrown away. Chasing this
    // without them is what made the identical Stripe failure unfixable.
    const detail = parsed?.title
      ? `${parsed.title} (field: ${parsed.field || 'n/a'}) — ${parsed.detail || ''}`
      : raw.slice(0, 500) || `(EMPTY BODY — not a Mollie application error. Response headers: ${describeHeaders(res)})`;
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
  const key = mollieKey(env);
  if (!isMolliePaymentId(id)) throw new Error(`mollie: refusing to fetch a malformed payment id (${String(id).slice(0, 40)})`);

  const res = await fetch(`${MOLLIE_API}/payments/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${key}`,
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

/*
 * ── HET GELD TERUGSTUREN — 11 AUGUSTUS 2026 ─────────────────────────────────
 *
 * Toegevoegd voor één geval: een tweede proefvisual die door de betalerscontrole
 * in de webhook wordt geannuleerd. De bestelling gaat niet door, dus de € 1 hoort
 * terug. Geld houden voor werk dat je hebt geweigerd te doen, is niet te
 * verdedigen — ook niet voor één euro, en juist niet bij iemand die op dat moment
 * al het gevoel heeft dat hij tegengehouden wordt.
 *
 * Het bedrag gaat MEE en wordt niet door Mollie afgeleid. Een refund zonder
 * bedrag bestaat daar niet, en het expliciet meesturen betekent dat deze functie
 * ook een deelbetaling terug kan storten als daar ooit reden voor is. De beller
 * geeft door wat er betaald is — die waarde is op dat moment al uit
 * `payment.amount` gelezen en gecontroleerd.
 *
 * GOOIT, en vangt niet zelf af. De beller in de webhook zit al in een safe() en
 * moet zelf kunnen beslissen wat een mislukte terugbetaling betekent: daar is het
 * antwoord "annuleer de bestelling toch, en meld dat de terugbetaling met de hand
 * moet" — en dat is een afweging die hier niet thuishoort.
 */
export async function refundMolliePayment(env, id, { cents, description }) {
  const key = mollieKey(env);
  if (!isMolliePaymentId(id)) throw new Error(`mollie: refusing to refund a malformed payment id (${String(id).slice(0, 40)})`);
  if (!Number.isInteger(cents) || cents <= 0) throw new Error(`mollie: refusing to refund a nonsensical amount (${cents})`);

  const res = await fetch(`${MOLLIE_API}/payments/${encodeURIComponent(id)}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: (cents / 100).toFixed(2) },
      description: String(description || 'Refund').slice(0, 140),
    }),
  });

  const raw = await res.text();
  const parsed = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  if (!res.ok) {
    const detail = parsed?.title
      ? `${parsed.title} — ${parsed.detail || ''}`
      : raw.slice(0, 300) || '(empty body)';
    const err = new Error(`Mollie POST refund ${res.status}: ${detail}`);
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

/**
 * The handful of response headers worth having in a log line when a request
 * fails with nothing in the body. `server` and `cf-ray` between them say
 * whether an answer came from Mollie, from a WAF in front of Mollie, or from
 * Cloudflare's own edge — which is the first question and, without this, an
 * unanswerable one.
 */
export function describeHeaders(res) {
  const want = ['server', 'cf-ray', 'content-type', 'content-length', 'x-request-id', 'retry-after'];
  const got = want
    .map((h) => [h, res.headers.get(h)])
    .filter(([, v]) => v)
    .map(([h, v]) => `${h}=${v}`);
  return got.length ? got.join(' ') : '(none of interest)';
}
