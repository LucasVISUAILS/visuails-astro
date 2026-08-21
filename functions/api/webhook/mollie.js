// VISUAILS — Mollie webhook handler (Cloudflare Pages Function).
//
// POST /api/webhook/mollie
//
// The other half of the €1 test sample. functions/api/order.js creates the
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

import { getMolliePayment, isMolliePaymentId, mollieAmountToCents, refundMolliePayment } from '../../../src/lib/mollie.js';
import { paymentMismatch } from '../../../src/data/vat.js';
/* Hoeveel producten een plan per maand toekent. Uit plans.js en niet uit een
   getal hier: welk plan wat geeft, is een verkoopbesluit dat op één plek hoort te
   staan — zie de kop van dat bestand. */
import { productsFor } from '../../../src/data/plans.js';
import { issueInvoice, issueCreditNote, issueSubscriptionInvoice } from '../../../src/lib/invoice.js';
import { mailInvoice } from '../../../src/lib/invoiceMail.js';
import { notifyPaid, notifyPaymentFailed, notifySampleBlocked } from '../../../src/lib/notify.js';
import { payerHash } from '../../../src/lib/payer.js';

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * WAT ER VAN EEN BETALING WORDT BEWAARD — EN WAT NIET
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * GEVONDEN OP 17 AUGUSTUS 2026 door de vraag of het systeem betaalgegevens bevat.
 * Het antwoord was ja, en meer dan nodig: hier stond `JSON.stringify(payment)`,
 * dus de hele reactie van Mollie ging de database in. Bij iDEAL en bij een
 * SEPA-incasso zit daar `details.consumerName`, `details.consumerAccount` — het
 * IBAN — en `details.consumerBic` in. Bij een kaartbetaling `cardHolder` en de
 * laatste vier cijfers.
 *
 * Dat is bewaard zonder dat iets het ooit las. Eén grep: `raw_payload` wordt in
 * deze codebase alleen GESCHREVEN, en verder alleen door de AVG-knop op NULL
 * gezet. Er is dus nooit een reconciliatie geweest die het nodig had.
 *
 * En met een abonnement zou het elke maand opnieuw binnenkomen. Twaalf IBANs per
 * abonnee per jaar, in een kolom die niemand leest.
 *
 * ── EEN TOELATINGSLIJST EN GEEN VERBODSLIJST ────────────────────────────────
 *
 * `delete payment.details.consumerAccount` zou werken tot Mollie een veld
 * toevoegt. Een lijst van wat er WEL in mag, blijft kloppen als er iets bij komt:
 * wat we niet kennen, bewaren we niet. Dat is dezelfde afweging als bij de
 * kanalen in de brand kit — lidmaatschap toetsen in plaats van uitzonderingen
 * opsommen.
 *
 * ── EN WAT ALS ER EEN GESCHIL KOMT ──────────────────────────────────────────
 *
 * De kop van de tabel zei "kept for reconciliation and disputes". Bij een geschil
 * heb je de naam van de betaler nodig, en die staat in het dashboard van Mollie —
 * bij de verwerker die er wettelijk voor is ingericht, zeven jaar lang. Een tweede
 * kopie bij ons voegt geen bewijs toe en wel een risico.
 *
 * `payer_hash` op de bestelling blijft wel: dat is een eenrichtingsafdruk om te
 * zien of twee bestellingen dezelfde betaler hebben, en daar is geen naam uit
 * terug te halen. Zie src/lib/payer.js.
 */
const PAYLOAD_VELDEN = [
  'id', 'mode', 'status', 'method', 'sequenceType',
  'amount', 'amountRefunded', 'amountRemaining', 'settlementAmount',
  'description', 'metadata', 'locale',
  'createdAt', 'paidAt', 'canceledAt', 'expiredAt', 'failedAt',
  'customerId', 'mandateId', 'subscriptionId', 'orderId', 'settlementId',
  'profileId', 'isCancelable',
];

export function payloadZonderPersoon(payment) {
  const uit = {};
  for (const k of PAYLOAD_VELDEN) {
    if (payment && payment[k] !== undefined) uit[k] = payment[k];
  }
  /* `details` gaat er in zijn geheel uit en niet veld voor veld. Daar zit alles in
     wat een persoon aanwijst, en er is niets in dat wij gebruiken. Wel een spoor
     dat er iets is weggelaten, zodat een lezer van deze rij niet denkt dat Mollie
     niets stuurde. */
  if (payment?.details) uit._details = 'weggelaten — persoonsgegevens, zie payloadZonderPersoon()';
  return JSON.stringify(uit);
}


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
  // on the site offers those methods today for a €1 payment, which is
  // exactly why this is written down rather than left to be discovered.
  // 'refunded' joins 'paid' here as of August 2026. Mollie fires this same
  // webhook when money goes back, and depending on whether the refund is
  // partial or full the payment arrives either still `paid` with a non-zero
  // amountRefunded, or flipped to `refunded` outright. Both have to reach the
  // reconciliation below; dropping the second at this gate is half of why a
  // refund used to disappear without trace.
  if (payment.status !== 'paid' && payment.status !== 'refunded') {
    console.log(`[mollie-webhook] ${id} is "${payment.status}" (${mode}) — acknowledged, order unchanged`);
    /*
     * ── EN NU VALT HET NIET MEER STIL, 9 AUGUSTUS 2026 ─────────────────────────
     *
     * Deze regel logde het en liet het vallen. Een klant die het betaalscherm
     * sloot of wiens betaling verliep, was daarmee onzichtbaar: geen mail, geen
     * markering, niets. De enige plek waar het stond was het Cloudflare-log, waar
     * niemand kijkt.
     *
     * ALLEEN DE EINDTOESTANDEN. 'open' en 'pending' zijn normale tussenstappen —
     * Mollie stuurt die webhook ook als iemand nog aan het betalen is. Een mail bij
     * elke tussenstap zou dit bericht binnen een week onleesbaar maken en dan mis
     * je de definitieve.
     *
     * De bestelling wordt NIET aangeraakt. Er is niets fout: hij staat nog op
     * onbetaald en de klant kan het gewoon opnieuw proberen in VISUAILS Studio.
     * Een markering zetten zou een tweede poging in de weg staan.
     */
    if (['failed', 'canceled', 'expired'].includes(payment.status) && env.DB) {
      /*
       * `metadata.order_ref`, NIET `metadata.ref` — GECORRIGEERD 10 AUGUSTUS 2026.
       *
       * Hier stond `payment?.metadata?.ref`. Die sleutel bestaat niet: src/lib/mollie.js
       * regel 213 schrijft `metadata: { order_ref: ref }`, en het betaalde pad tien
       * regels lager in dit bestand leest hem ook zo. De optionele ketting maakte er
       * `undefined` van, waarna de terugval de betaalomschrijving pakte
       * ("VISUAILS — 12 producten, catalogsets") en die matcht nooit op orders.ref.
       *
       * Netto: de SELECT vond nooit iets en notifyPaymentFailed() is nooit één keer
       * aangeroepen. De hele melding die hierboven in twintig regels wordt uitgelegd —
       * "en nu valt het niet meer stil" — stond dood in de code, en dat is precies het
       * soort fout dat je niet ziet: er komt geen mail, en dat is wat je verwacht als er
       * niets mis is.
       *
       * De terugval op description is weg. Hij kon nooit werken, en een terugval die
       * nooit werkt maskeert alleen dat de eerste sleutel fout is.
       */
      const ref = payment?.metadata?.order_ref || '';
      try {
        const row = ref
          ? await env.DB.prepare('SELECT id FROM orders WHERE ref = ?1').bind(ref).first()
          : null;
        if (row?.id) await notifyPaymentFailed(env, row.id, payment.status);
      } catch (err) {
        console.error('[mollie-webhook] kon geen bericht sturen over', payment.status, '—', err?.message || err);
      }
    }
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

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN MAANDTERMIJN VAN EEN ABONNEMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wat hier gebeurt is precies twee dingen: de betaling boeken, en de producten van
 * die maand toekennen. Wat hier NIET gebeurt is een bestelling aanmaken — dat doet
 * de nachtelijke taak als het venster van de abonnee aanbreekt, uit zijn eigen
 * wachtrij. Betalen en produceren zijn twee momenten, en ze in één functie zetten
 * zou betekenen dat een klant die op de eerste van de maand betaalt, op de eerste
 * van de maand geproduceerd wil hebben.
 *
 * ── DE IDEMPOTENTIE ZIT IN DE DATABASE EN NIET IN EEN VLAG ─────────────────
 *
 * Mollie levert dezelfde melding desnoods drie keer af. De UNIQUE index op
 * (subscription_id, month) in migratie 0030 is wat de tweede aflevering tegenhoudt
 * — niet een `if (al_verwerkt)`, want die vraag heeft een venster tussen lezen en
 * schrijven waar de derde aflevering precies in past. `INSERT ... ON CONFLICT DO
 * NOTHING` heeft dat venster niet.
 *
 * ── HET AANTAL WORDT HIER VASTGELEGD EN NIET LATER OPGEZOCHT ───────────────
 *
 * `granted` komt uit plans.js op het moment van betalen en gaat de rij in. Wie in
 * maart Studio had en in juni Brand, heeft in maart twaalf producten gekregen —
 * dat is een historisch feit en geen huidige eigenschap van zijn plan. Zelfde
 * onderscheid als tussen de ladder en `orders.total_cents`.
 *
 * ── EN EEN ONBEKENDE SUBSCRIPTION IS LUIDRUCHTIG ───────────────────────────
 *
 * Dan is er bij Mollie een abonnement dat hier niet bestaat, en dat is geld dat
 * binnenkomt zonder dat er iemand recht op iets krijgt. Geen 500 — opnieuw
 * aanbieden verandert niets aan een rij die er niet is — maar wel een foutregel
 * die de subscription-id noemt, want dat is het enige waarmee je hem terugvindt.
 */
async function recordSubscriptionPaid(env, payment, mode) {
  const subId = String(payment.subscriptionId);
  const cents = mollieAmountToCents(payment.amount) ?? 0;

  let sub;
  try {
    sub = await env.DB.prepare(
      'SELECT id, customer_id, plan, term, status FROM subscriptions WHERE mollie_subscription_id = ?1'
    ).bind(subId).first();
  } catch (err) {
    // Zonder migratie 0030 bestaat de tabel niet. Dat is geen reden om Mollie een
    // 500 te geven — hij zou het blijven proberen — maar het is wel een reden om
    // luid te zijn, want er komt geld binnen dat nergens landt.
    if (!/no such table|no such column/i.test(String(err?.message || err))) throw err;
    console.error('[mollie-webhook] abonnementsbetaling maar geen subscriptions-tabel — draai migratie 0030 —', payment.id);
    return;
  }

  if (!sub) {
    console.error('[mollie-webhook] betaling voor onbekend abonnement', subId, '—', payment.id, `(${mode})`);
    return;
  }

  /* De maand waar deze termijn bij hoort, uit de betaaldatum van Mollie en niet
     uit `datetime('now')`. Een melding die een dag later wordt afgeleverd — of
     opnieuw wordt aangeboden na een storing — hoort bij de maand waarin betaald
     is en niet bij de maand waarin wij hem verwerkten. */
  const betaald = String(payment.paidAt || payment.createdAt || '');
  const month = /^\d{4}-\d{2}/.test(betaald) ? betaald.slice(0, 7) : new Date().toISOString().slice(0, 7);

  const granted = productsFor(sub.plan);

  // De betaling zelf, in dezelfde tabel als elke andere. `order_id` blijft leeg:
  // deze betaling hoort bij een abonnement en niet bij een bestelling, en er een
  // bestelling bij verzinnen zou de bestellijst vervuilen met rijen waar geen
  // werk aan hangt.
  try {
    await env.DB.prepare(
      `INSERT INTO subscription_payments (subscription_id, external_id, status, amount_cents, currency, month, raw_payload)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    ).bind(
      /* EIGEN TABEL EN NIET `payments` — 17 augustus 2026. Die tabel heeft
         `order_id NOT NULL`, en een abonnementsafschrijving hoort bij geen
         bestelling. Elke INSERT hier werd dus geweigerd, en de catch hieronder
         slikte hem in omdat "NOT NULL constraint failed" het woord constraint
         bevat: saldo toegekend, betaling verdwenen, geen spoor van ontvangen geld.
         Zie de kop van subscription_payments in migratie 0030. */
      sub.id,
      payment.id,
      payment.status,
      cents,
      (payment.amount?.currency || 'EUR').toUpperCase(),
      month,
      payloadZonderPersoon(payment)
    ).run();
  } catch (err) {
    /* ALLEEN EEN DUBBELE AFLEVERING MAG HIER STIL AFLOPEN, en dat is nu ook echt
       alleen dat. Hier stond /UNIQUE|constraint/i, en dat tweede woord maakte van
       deze catch een doofpot voor élke databasefout — precies waardoor de fout
       hierboven maandenlang onzichtbaar had kunnen blijven. De maand hieronder
       wordt alsnog geprobeerd, want de twee kunnen los van elkaar mislukken. */
    if (!/UNIQUE/i.test(String(err?.message || err))) {
      console.error('[mollie-webhook] abonnementsbetaling niet vastgelegd —', payment.id, '—', err?.message || err);
    }
  }

  const toegekend = await env.DB.prepare(
    `INSERT INTO subscription_months (subscription_id, month, granted, payment_id)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (subscription_id, month) DO NOTHING
     RETURNING id`
  ).bind(sub.id, month, granted, payment.id).first();

  if (!toegekend) {
    console.log(`[mollie-webhook] abonnement ${sub.id} had ${month} al — niets toegekend (${mode})`);
    return;
  }

  /* EEN GESLAAGDE AFSCHRIJVING HEFT EEN PAUZE OP. Dat is de tegenhanger van de
     zelfherstelregel: een abonnement dat op 'paused' stond wegens een mislukte
     betaling, hoort weer te lopen zodra er wél betaald is — zonder dat Lucas
     ergens op hoeft te klikken. Een pauze die de klant zelf heeft gezet, wordt
     NIET opgeheven: dan is `pause_reason` 'customer' en is dit zijn keuze. */
  await env.DB.prepare(
    `UPDATE subscriptions
        SET status = 'active', paused_at = NULL, pause_reason = NULL, updated_at = datetime('now')
      WHERE id = ?1 AND (status <> 'paused' OR pause_reason = 'payment_failed')`
  ).bind(sub.id).run();

  console.log(`[mollie-webhook] abonnement ${sub.id}: ${month} toegekend, ${granted} producten (${mode})`);

  /* ── EN DE FACTUUR — 20 AUGUSTUS 2026 ──────────────────────────────────────
     Tot vandaag hield het hier op: betaling vastgelegd, maand toegekend, klaar.
     Er ging geen document uit. Voor een terugkerende zakelijke afschrijving hoort
     daar een factuur tegenover, uit dezelfde doorlopende nummerreeks als een
     factuur op een bestelling. Zie issueSubscriptionInvoice() in
     src/lib/invoice.js en de kop van migratie 0032.

     NA de toekenning en niet ervoor. De volgorde is: geld vastleggen, tegoed
     toekennen, dan pas papier. Valt het papier om, dan heeft de klant nog steeds
     waar hij voor betaald heeft — andersom zou een factuur bestaan voor een maand
     die de klant niet gekregen heeft.

     In een try, om dezelfde reden als bij een bestelling: een factuur die niet
     lukt mag de webhook geen 500 laten geven, want dan komt Mollie terug en wordt
     alles hierboven opnieuw geprobeerd. De factuur is te herstellen, een dubbele
     toekenning niet. */
  try {
    const rijId = await betalingId(env, payment.id);
    const factuur = rijId ? await issueSubscriptionInvoice(env, rijId) : null;
    if (factuur) console.log(`[mollie-webhook] factuur ${factuur.number} voor abonnement ${sub.ref || sub.id} (${mode})`);
  } catch (e) {
    console.error('[mollie-webhook] abonnementsfactuur voor', sub.ref || sub.id, 'niet uitgegeven —',
      e && e.message ? e.message : e);
  }
}

/* Het id van de zojuist weggeschreven betaalrij. Apart, omdat de INSERT hierboven
   in een try zit die een dubbele aflevering stil laat aflopen: dan is er geen
   nieuwe rij maar bestaat de oude wél, en die is wat de factuur nodig heeft. */
async function betalingId(env, externalId) {
  const rij = await env.DB.prepare(
    'SELECT id FROM subscription_payments WHERE external_id = ?1'
  ).bind(externalId).first();
  return rij ? rij.id : null;
}

async function recordPaid(env, payment, mode) {
  // metadata comes back as whatever was sent. order.js sends an object; a
  // string is accepted too so a payment created by hand in Mollie's dashboard
  // (which is the natural way to test this) can still be tied to an order.
  const meta = typeof payment.metadata === 'string'
    ? (() => { try { return JSON.parse(payment.metadata); } catch { return {}; } })()
    : (payment.metadata || {});
  const ref = meta.order_ref;

  /*
   * ── EEN ABONNEMENTSAFSCHRIJVING HEEFT GEEN order_ref — 16 AUGUSTUS 2026 ────
   *
   * Dit was de belangrijkste regel om te wijzigen voordat er één abonnement kon
   * bestaan. Mollie hangt aan een subscription-betaling een `subscriptionId` en
   * GEEN order-metadata — dat staat in hun documentatie en het is logisch: er is
   * geen bestelling, er is een maandtermijn. De tak hieronder logde dat als
   * "money arrived that no order will ever show" en gaf `return`. Geld binnen,
   * foutregel in het log, saldo niet toegekend.
   *
   * VÓÓR de !ref-tak en niet erna, want een abonnementsbetaling MAG geen ref
   * hebben. Hem eerst als verdwaalde bestelling afkeuren en daarna alsnog
   * behandelen, zou betekenen dat elke geslaagde afschrijving een foutregel
   * achterlaat — en een logboek dat bij normaal gedrag alarm slaat, is een
   * logboek dat niemand meer leest.
   */
  if (payment.subscriptionId) {
    await recordSubscriptionPaid(env, payment, mode);
    return;
  }

  /* ── DE € 1 VAN HET MANDAAT ────────────────────────────────────────────────
     20 augustus 2026. Deze betaling heeft geen `order_ref` (createFirstPayment()
     zet `sub_ref`) en ook geen `subscriptionId` — dat veld krijgt Mollie pas bij
     de termijnen die uit het mandaat volgen. Ze viel dus in de tak hieronder en
     leverde bij ELKE nieuwe abonnee een rode regel op: "paid payment carries no
     order_ref". Een logboek dat bij normaal gedrag alarm slaat, is een logboek
     dat niemand meer leest — precies het argument dat twintig regels hoger staat
     voor de abonnementstak.

     Wat hier NIET gebeurt en wat opzettelijk een openstaand punt is: er wordt
     geen rij weggeschreven. Het abonnement wordt niet hier geactiveerd maar op de
     terugkeerpagina (activeerAbonnement() in src/lib/subscribe.js haalt het
     mandaat op), dus de keten loopt zonder deze webhook. Maar die euro ís
     ontvangen en staat nergens — of daar een factuur bij hoort is een vraag over
     btw en niet over code, en die hoort Lucas te beantwoorden voordat er iets
     wordt vastgelegd wat later niet meer klopt. */
  if (!ref && meta && meta.sub_ref) {
    console.log('[mollie-webhook] mandaatbetaling voor abonnement', String(meta.sub_ref), '—', payment.id, `(${mode})`);
    return;
  }

  if (!ref) {
    // A payment on our own account with no order attached: possible if one was
    // created outside this codebase. Loud, because it means money arrived that
    // no order will ever show — but not a 500, because retrying cannot attach
    // metadata that was never set.
    console.error('[mollie-webhook] paid payment carries no order_ref —', payment.id, `(${mode})`);
    return;
  }

  /* `vat_cents` staat er sinds 14 augustus 2026 bij: een restitutie komt op het
     BRUTO binnen, en `total_cents` is exclusief btw. Zonder die kolom zou "volledig
     terugbetaald" op elke btw-plichtige bestelling te vroeg waar worden — zie
     orderGrossCents(). Migratie 0015 bracht de kolom; draait die niet, dan geeft
     D1 hier "no such column" en valt de query terug op de oude set. */
  const order = await env.DB.prepare(
    'SELECT id, service, status, payment_status, total_cents, vat_cents, refunded_cents, cancel_reason FROM orders WHERE ref = ?1'
  ).bind(ref).first().catch(async (err) => {
    if (!/no such column/i.test(String(err?.message || err))) throw err;
    return env.DB.prepare(
      'SELECT id, service, status, payment_status, total_cents, refunded_cents, cancel_reason FROM orders WHERE ref = ?1'
    ).bind(ref).first();
  });
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

/**
 * Het brutobedrag van een bestelling: wat er is afgeschreven en dus wat er terug
 * kan komen.
 *
 * `total_cents` is EXCLUSIEF btw — zie orderMoney() in src/lib/account.js — en
 * `vat_cents` staat ernaast. Een restitutie komt op het bruto binnen, dus die twee
 * horen hier opgeteld te worden. Ontbreekt `total_cents`, dan geeft deze functie
 * null en valt de aanroeper terug op wat hij zeker weet; een verzonnen totaal is
 * hier erger dan geen totaal, want er hangt een creditnota aan.
 */
function orderGrossCents(order) {
  const net = Number(order?.total_cents);
  if (!Number.isFinite(net) || net <= 0) return null;
  const vat = Number(order?.vat_cents);
  return Math.round(net + (Number.isFinite(vat) && vat > 0 ? vat : 0));
}

/**
 * Het restitutietotaal van deze betaling wegschrijven, en het totaal van de hele
 * bestelling teruggeven.
 *
 * ── WAAROM DIT ÉÉN FUNCTIE IS EN GEEN TWEE REGELS TER PLEKKE ────────────────
 *
 * Omdat de twee stappen niet los van elkaar kloppen. Schrijf je alleen weg, dan
 * heeft niemand het totaal; lees je alleen, dan mis je wat deze aflevering meldt.
 * En de volgorde is dwingend: eerst de eigen regel bijwerken, dan sommeren, anders
 * telt de som de nieuwe waarde niet mee en boekt de bestelling te weinig terug.
 *
 * DE UPDATE IS EEN TOEWIJZING EN GEEN OPTELLING. `amountRefunded` is bij Mollie
 * een lopend totaal per betaling, dus dezelfde melding twee keer afleveren zet
 * hetzelfde getal nog een keer neer — en verandert niets. Dat is precies de
 * eigenschap die deze hele sectie nodig heeft.
 *
 * ── EN HIJ VALT NOOIT OM ────────────────────────────────────────────────────
 *
 * Zonder migratie 0029 bestaat de kolom niet. Dan geeft deze functie het bedrag
 * van deze betaling terug, en gedraagt de webhook zich exact zoals hij zich vóór
 * vandaag gedroeg. Een niet-gedraaide migratie mag een betaling niet laten
 * mislukken; hij mag alleen de verbetering uitstellen.
 *
 * De payments-RIJ bestaat op dit moment misschien nog niet — de INSERT staat
 * verderop, achter de idempotentiepoort. Bij de allereerste aflevering met een
 * restitutie erin raakt de UPDATE dus nul rijen, en dan valt de som terug op wat
 * deze betaling meldt. Ook dat is de oude situatie en nooit slechter.
 */
async function recordRefundOnPayment(env, orderId, externalId, refunded) {
  const eigen = Math.max(0, Math.floor(Number(refunded) || 0));
  try {
    await env.DB.prepare(
      `UPDATE payments SET refunded_cents = ?1
        WHERE provider = 'mollie' AND external_id = ?2 AND ?1 > refunded_cents`
    ).bind(eigen, externalId).run();

    const row = await env.DB.prepare(
      'SELECT COALESCE(SUM(refunded_cents), 0) AS n FROM payments WHERE order_id = ?1'
    ).bind(orderId).first();

    const som = Math.max(0, Math.floor(Number(row?.n) || 0));
    // De som telt deze betaling alleen mee als haar rij al bestaat. Zo niet, dan
    // is het eigen bedrag het beste antwoord dat er is.
    return Math.max(som, eigen);
  } catch (err) {
    if (!/no such column|no such table/i.test(String(err?.message || err))) throw err;
    console.warn('[mollie-webhook] payments.refunded_cents ontbreekt — draai migratie 0029. Terugval op het bedrag van deze betaling.');
    return eigen;
  }
}

  // ── HET BETAALMIDDEL, EN WAAROM HET HIER PAS BEKEND IS ─────────────────────
  //
  // `btwverleggingspecificatie.md` §3 zet de iDEAL-kruiscontrole midden in de
  // btw-beslissing bij checkout. Daar kan hij niet staan: op dat moment is er
  // nog geen betaling en dus geen middel. Dit is het eerste punt in de hele
  // keten waar `payment.method` bestaat.
  //
  // Vandaar deze twee stappen, en de volgorde is niet vrij:
  //   1 · Het middel vastleggen. Ook als er niets aan de hand is, want een lege
  //       kolom is geen bewijs dat er met een kaart is betaald.
  //   2 · Alleen als het niet klopt met de claim: de order markeren. Niet
  //       tegenhouden — het geld is binnen en de dienst is verkocht. Wat hier
  //       gebeurt is dat het in het overzicht komt te staan.
  //
  // De echte voorkoming zit een stap eerder, in src/lib/mollie.js: bij een order
  // op 0% wordt iDEAL niet aangeboden. Dit is het net voor wat daar doorheen valt
  // — een oudere betaallink, of een order die met de hand is aangemaakt.
  await recordPaymentMethod(env, order.id, payment, ref, mode);

  // ── REFUNDS, AND WHY THIS SITS ABOVE THE IDEMPOTENCY GATE ──────────────────
  //
  // This is a real gap being closed, not a feature. Mollie fires THIS SAME
  // webhook, with THIS SAME payment id, when money goes back. The INSERT below
  // is guarded by UNIQUE(provider, external_id) so that a retried delivery
  // cannot be counted twice — which is correct, and which meant every refund
  // notification was caught by that guard, logged as a duplicate, and dropped.
  // The order stayed `paid` forever. At €1 nobody noticed; at €1,101.10 the
  // books would not balance.
  //
  // So the refund is reconciled FIRST, from the payment's own amountRefunded,
  // and the gate below keeps protecting what it was written to protect: the
  // one-row-per-attempt payments log.
  //
  // It compares against what we already recorded rather than adding, because
  // amountRefunded is a RUNNING TOTAL on Mollie's side. Adding it on every
  // delivery would double-count a retried webhook — the exact bug this whole
  // section exists to fix, reintroduced one line lower down.
  //
  // ── PER BETALING GETELD, PER BESTELLING GEBOEKT — 14 AUGUSTUS 2026 ─────────
  //
  // Hier stond `refunded` (het lopende totaal van DEZE betaling) rechtstreeks
  // vergeleken met en weggeschreven naar `orders.refunded_cents` (het totaal van
  // de BESTELLING), en werd `full` getoetst tegen `cents` — het bedrag van deze
  // betaling — terwijl `order.total_cents` een paar regels hoger wél wordt
  // opgehaald en nergens in die vergelijking voorkwam.
  //
  // Zolang er één betaling per bestelling is, zijn die twee getallen hetzelfde en
  // valt er niets op. Twee betalingen op één bestelling is echter de normale gang:
  // de bevestigingsmail draagt een betaallink en handleOrderPay() maakt er nóg
  // één zodra de klant op "Nu betalen" drukt — er wordt daar alleen gekeken of de
  // bestelling nog `unpaid` is, niet of er al een betaling openstaat.
  //
  // Wat er dan gebeurde bij het terugstorten van de dubbele: `full` werd waar
  // tegen het bedrag van díe betaling, de bestelling ging op 'refunded', en
  // issueCreditNote() zette een VOLLEDIGE creditnota tegenover de factuur van de
  // betaling die níet is teruggestort. Netto omzet nul op een bestelling die
  // gewoon betaald, geleverd en correct gecorrigeerd is. En de spiegel: stond
  // `refunded_cents` eenmaal op dat bedrag, dan kwam een echte deelrestitutie op
  // de andere betaling binnen met `amountRefunded < known`, sloeg dit hele blok
  // over, en werd nooit geboekt.
  //
  // Nu: elke betaling houdt zijn eigen restitutietotaal bij (migratie 0029), de
  // bestelling draagt de SOM daarvan, en `full` wordt getoetst tegen wat de
  // bestelling kostte. Zie de kop van die migratie voor waarom dat een kolom is
  // en geen som uit `raw_payload`.
  const refunded = mollieAmountToCents(payment.amountRefunded) ?? 0;
  const orderRefunded = await recordRefundOnPayment(env, order.id, payment.id, refunded);
  const known = Math.max(0, Math.floor(Number(order.refunded_cents) || 0));

  if (orderRefunded > known) {
    /*
     * VOLLEDIG WANNEER HET DEKT WAT DE BESTELLING KOSTTE, en niet wat deze ene
     * betaling kostte. `total_cents` is exclusief btw en `orderMoney()` telt de
     * btw erbij; hier wordt met BRUTO gerekend, want dat is wat er is afgeschreven
     * en wat er terugkomt. Ontbreekt een van beide getallen, dan valt de toets
     * terug op het bedrag van deze betaling — dezelfde richting als voorheen, en
     * nooit strenger dan wat we zeker weten.
     *
     * `paid` met een deelrestitutie wordt bewust NIET afgewaardeerd: het werk is
     * gekocht en er is een deel teruggegeven, en dat 'refunded' noemen zou de
     * studio vertellen te stoppen met een bestelling die nog loopt.
     */
    const bruto = orderGrossCents(order);
    const full = bruto !== null ? orderRefunded >= bruto : (cents !== null && refunded >= cents);
    await env.DB.prepare(
      `UPDATE orders SET refunded_cents = ?1, payment_status = ?2 WHERE id = ?3`
    ).bind(orderRefunded, full ? 'refunded' : order.payment_status || 'paid', order.id).run();

    await env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, 'system')`
    ).bind(
      order.id,
      order.status,
      `Refund recorded: ${(orderRefunded / 100).toFixed(2)} EUR of ${bruto === null ? '?' : (bruto / 100).toFixed(2)} (Mollie ${payment.id}, this payment ${(refunded / 100).toFixed(2)})`
    ).run().catch(() => {});

    console.log(`[mollie-webhook] refund on ${payment.id} (${mode}): order ${known} -> ${orderRefunded} cents, ${full ? 'full' : 'partial'}`);

    /*
     * ── EN DE CREDITNOTA — 12 augustus 2026 ──────────────────────────────────
     *
     * Hierboven werd de terugbetaling correct geboekt en daar bleef het bij. De
     * uitgereikte factuur stond nog op het volle bedrag, dus vanaf de eerste
     * terugbetaling was er een factuur van bijvoorbeeld € 1.101,10 tegenover geld dat
     * terug was. Een uitgereikte factuur pas je niet aan; je credit hem.
     *
     * HET DOORLOPENDE TOTAAL GAAT MEE, niet het verschil. `refunded` is Mollie's
     * amountRefunded, en dat is een lopend totaal; issueCreditNote() telt zelf op wat er
     * al gecrediteerd is en geeft alleen het verschil uit. Daarmee is een tweede
     * aflevering van dezelfde melding vanzelf onschadelijk — dezelfde afspraak als bij
     * issueInvoice(), en om dezelfde reden.
     *
     * BINNEN safe() EN NIET ERBUITEN. Er is op dit punt al geboekt dat er terugbetaald
     * is, en dat is het deel dat niet verloren mag gaan. Mislukt de nota — R2 niet
     * bereikbaar, de pdf-renderer die valt — dan blijft de rij op 'pending' met haar
     * nummer staan en pakt de nachtelijke taak hem op. Deze webhook mag daar niet op
     * omvallen, want dan komt Mollie hem opnieuw aanbieden en begint alles opnieuw.
     *
     * GEEN FACTUUR BETEKENT GEEN NOTA, en dat is de normale gang bij een proefvisual
     * van € 1: daar wordt niet gefactureerd zolang het fiscale standpunt over die euro
     * niet genomen is. issueCreditNote() geeft dan null terug en dat is geen fout.
     */
    try {
      const note = await issueCreditNote(env, order.id, {
        // Het totaal van de BESTELLING en niet van deze ene betaling —
        // issueCreditNote() telt zelf op wat er al gecrediteerd is en geeft
        // alleen het verschil uit, dus dit moet het lopende totaal zijn waar de
        // factuur tegenover staat.
        refundedGrossCents: orderRefunded,
        reason: order.cancel_reason || null,
      });
      if (note) console.log(`[mollie-webhook] creditnota ${note.number} voor ${ref} (${note.status})`);
    } catch (err) {
      console.error('[mollie-webhook] creditnota niet uitgegeven voor', ref, '—', err?.message || err);
    }
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
        payloadZonderPersoon(payment)
      )
      .run();
  } catch (err) {
    /*
     * ── ALLEEN EEN DUBBELE AFLEVERING MAG HIER STIL AFLOPEN — 10 AUGUSTUS 2026 ──
     *
     * Hier stond een kale `catch {}` met de mededeling "already processed, skipping".
     * Het commentaar erboven beweert dat een fout hier een UNIQUE-overtreding betekent,
     * maar de catch ving ELKE fout op, gaf `return`, en de handler antwoordt daarna met
     * 200 — waarmee Mollie te horen krijgt dat het gelukt is en niet meer opnieuw komt.
     *
     * WAT DAT KOST. Eén hapering van D1 op deze INSERT en de bestelling wordt nooit op
     * betaald gezet, `window_expires_at` nooit gewist, geen factuur uitgegeven en geen
     * melding verstuurd — permanent, want het retryvenster van 26 uur is met die 200
     * afgezegd. De klant heeft betaald en het systeem weet het nooit.
     *
     * Nu wordt er gekeken naar WELKE fout het is. Een UNIQUE-overtreding op
     * (provider, external_id) betekent inderdaad dat een eerdere aflevering dit al deed:
     * stil aflopen is dan juist. Alles anders gaat omhoog, de handler antwoordt 500, en
     * Mollie komt terug — precies waar dat retryschema voor is.
     *
     * De tekst van D1 bij een schending is "UNIQUE constraint failed: payments…". Er
     * wordt op beide woorden gematcht en niet op de volledige zin, want die zin is van
     * Cloudflare en niet van ons.
     */
    const text = String(err?.message || err || '');
    const duplicate = /unique/i.test(text) && /constraint/i.test(text);
    if (!duplicate) {
      console.error('[mollie-webhook] betaling', payment.id, 'niet vastgelegd —', text);
      throw err;
    }
    console.log('[mollie-webhook] duplicate delivery for', payment.id, '— already processed, skipping');
    return;
  }

  if (order.payment_status === 'paid') return; // belt and braces alongside the INSERT guard

  // window_expires_at goes to NULL here: the countdown exists only to release a
  // reservation nobody paid for, and this order has now been paid for. Clearing
  // it in the same statement means there is no window in which a sweep could
  // see a paid order still counting down.
  // `NOT IN ('paid','refunded')`, not `<> 'paid'`. The refund block above can
  // have just written 'refunded' on this very request, and 'refunded' <> 'paid'
  // is true — so the narrow guard let this statement overwrite a refund back to
  // paid, in the same execution that recorded it.
  //
  // The path is narrow and it is real: it needs a payment whose ORIGINAL
  // notification never made it into the payments table, so that the idempotency
  // INSERT above succeeds instead of returning. A payment created by hand in
  // Mollie's dashboard does exactly that (recordPaid's own metadata comment
  // names it as a supported case), as does any first delivery lost to an outage
  // and retried after the money went back. The result would be an order marked
  // paid, with refunded_cents equal to the full amount, and no trace of the
  // contradiction outside the events log.
  //
  // Both terminal states are now excluded, which also makes the belt-and-braces
  // return above genuinely redundant rather than load-bearing.
  await env.DB.prepare(
    `UPDATE orders SET payment_status = 'paid', payment_provider = 'mollie', payment_ref = ?1, paid_at = datetime('now'),
                       window_expires_at = NULL
     WHERE id = ?2 AND payment_status NOT IN ('paid', 'refunded')`
  )
    .bind(payment.id, order.id)
    .run();

  // order_events.status carries the order's PIPELINE status, not a payment
  // status — see schema.sql. A payment does not move the pipeline, so this
  // re-states the current status and lets the note carry the fact.
  //
  // The mode is in the note ON PURPOSE and in capitals. A test payment writes
  // a real `paid` into whichever database the deployment is pointed at, and
  // six weeks from now the only thing distinguishing it from a real €1 in
  // the admin timeline is this word.
  await env.DB.prepare('INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, ?4)')
    .bind(
      order.id,
      order.status,
      `Payment received via Mollie (${payment.id})${mode === 'test' ? ' — TEST MODE, no money moved' : ''}`,
      'system'
    )
    .run();

  /*
   * ═══════════════════════════════════════════════════════════════════════════
   * DE TWEEDE PROEFVISUAL, HERKEND AAN DE BANKREKENING — 11 AUGUSTUS 2026
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Lucas, vandaag: *"IBAN lijkt het meest betrouwbare, dit was ik al van plan om
   * handmatig te controleren."* Dit is die handmatige controle.
   *
   * De weigering in functions/api/order.js draait vóór de betaling en kijkt naar
   * e-mail en telefoon. Die vangt de eerlijke herhaling af en zegt het netjes. Wat
   * hij per definitie niet kan, is iemand herkennen die een nieuw adres en een
   * nieuw nummer invult — want alles op dat formulier vult de bezoeker zelf in.
   *
   * Het IBAN niet. Dat komt van de bank, en het is hier voor het eerst bekend.
   *
   * ── WAAROM DIT PAS NA 'PAID' STAAT ────────────────────────────────────────
   *
   * De betaling is een feit en wordt als feit weggeschreven, ook als de bestelling
   * daarna wordt geannuleerd. Anders ontstaat er een geannuleerde order waar geld
   * bij hoort dat nergens geboekt staat, en dat is precies het soort gat waar de
   * refundsectie hierboven over gaat.
   *
   * ── EN WAAROM VÓÓR notifyPaid EN DE FACTUUR ───────────────────────────────
   *
   * Omdat dit allebei dingen zijn die je bij een geannuleerde bestelling niet wilt:
   * notifyPaid() is het bericht waar het WERK mee begint, en een factuur voor een
   * teruggestorte euro is een correctie die je daarna weer moet maken. Beide worden
   * overgeslagen met een `return` onderaan deze tak.
   *
   * ── FAALT OPEN, ZOALS ALLES HIER ──────────────────────────────────────────
   *
   * Elke stap zit in zijn eigen try. Kan de hash niet gemaakt worden, kan de
   * database niet gelezen worden, of weigert Mollie de terugbetaling — dan gaat de
   * bestelling gewoon door als een normale proefvisual. Eén proef te veel maken is
   * een kleinere fout dan een betalende klant annuleren op grond van een controle
   * die zelf omviel.
   */
  if (order.service === 'test-sample') {
    let mine = null;
    try {
      mine = await payerHash(env, payment);
    } catch (err) {
      console.error('[mollie-webhook] betalershash mislukt voor', ref, '—', err?.message || err);
    }

    if (mine) {
      /* Eerst vastleggen, dan pas vergelijken. Ook als deze proef gewoon doorgaat
         moet de hash er staan — anders is er bij de VOLGENDE poging niets om
         tegen te vergelijken en vangt deze klep structureel alleen de derde. */
      try {
        await env.DB.prepare('UPDATE orders SET payer_hash = ?1, payer_kind = ?2 WHERE id = ?3')
          .bind(mine.hash, mine.kind, order.id).run();
      } catch (err) {
        console.error('[mollie-webhook] payer_hash niet opgeslagen voor', ref, '—', err?.message || err);
      }

      let earlier = null;
      try {
        /* `id != order.id` sluit de rij uit die we net zelf hebben bijgewerkt.
           Zonder dat vindt elke proefvisual zichzelf en wordt er niets ooit nog
           gemaakt. Oudste eerst, zodat het bericht naar de ECHTE eerste verwijst
           en niet naar de vorige poging. */
        earlier = await env.DB.prepare(
          `SELECT ref, paid_at FROM orders
            WHERE service = 'test-sample'
              AND payer_hash = ?1
              AND payment_status = 'paid'
              AND id != ?2
            ORDER BY id ASC LIMIT 1`
        ).bind(mine.hash, order.id).first();
      } catch (err) {
        console.error('[mollie-webhook] betalerscontrole kon niet lezen voor', ref, '—', err?.message || err);
      }

      if (earlier) {
        console.log(`[mollie-webhook] ${ref} is een tweede proefvisual op dezelfde ${mine.kind} — eerder: ${earlier.ref}`);

        /* De euro terug. Eerst, want dit is het enige deel dat buiten onze eigen
           database gebeurt en dus het enige dat echt kan weigeren. Lukt het niet,
           dan gaat de annulering tóch door en zegt het bericht aan Lucas dat er met
           de hand teruggestort moet worden — een klant die zijn geld niet terugkreeg
           én zijn proef niet kreeg is de enige uitkomst die hier onacceptabel is, en
           die wordt zo in elk geval altijd gezien. */
        let refunded = false;
        try {
          if (cents !== null && cents > 0) {
            await refundMolliePayment(env, payment.id, {
              cents,
              description: `Geannuleerd: tweede proefvisual (eerder ${earlier.ref})`,
            });
            refunded = true;
          }
        } catch (err) {
          console.error('[mollie-webhook] terugbetaling mislukt voor', ref, '—', err?.message || err);
        }

        try {
          /* Het vocabulaire van migratie 0014, en niet iets eigens ernaast:
             `cancel_reason`, `cancel_payment` ('refund' | 'credit' | 'none') en
             `cancelled_at` zijn gebouwd voor de annuleringen die met de hand vanuit
             het adminscherm gedaan worden. Door ze hier te vullen ziet een
             automatische annulering er in dat scherm precies zo uit als een
             handmatige — en dat is het verschil tussen een controle die zichtbaar
             is en een die alleen in de logs bestaat.

             `cancel_payment` volgt wat er ECHT gebeurd is en niet wat de bedoeling
             was: mislukte de terugbetaling, dan staat er 'none' en niet 'refund'.
             Anders zegt de administratie dat het geld terug is terwijl het er nog
             staat, en dat is precies het soort stille onwaarheid waar je later
             boekhoudkundig tegenaan loopt. */
          await env.DB.prepare(
            `UPDATE orders SET status = 'cancelled',
                               cancel_reason = 'sample-duplicate',
                               cancel_payment = ?2,
                               cancelled_at = datetime('now')
              WHERE id = ?1`
          ).bind(order.id, refunded ? 'refund' : 'none').run();
          await env.DB.prepare('INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, ?4)')
            .bind(
              order.id,
              'cancelled',
              `Tweede proefvisual op dezelfde ${mine.kind} als ${earlier.ref} — geannuleerd, `
                + (refunded ? 'euro teruggestort' : 'TERUGBETALING MISLUKT, met de hand doen'),
              'system'
            ).run();
        } catch (err) {
          console.error('[mollie-webhook] annulering niet weggeschreven voor', ref, '—', err?.message || err);
        }

        await notifySampleBlocked(env, {
          orderId: order.id,
          earlierRef: earlier.ref,
          earlierAt: earlier.paid_at,
          refunded,
        });

        /* Hier stopt het. Geen notifyPaid (dat is het sein om te beginnen) en geen
           factuur (die zou meteen gecorrigeerd moeten worden). Wat de bezoeker te
           zien krijgt, staat op de terugkeerpagina en leest `cancel_reason`. */
        return;
      }
    }
  }

  /*
   * ── EN DE STUDIO HOORT HET OOK, 9 AUGUSTUS 2026 ────────────────────────────
   *
   * Tot nu ging er bij een geslaagde betaling alléén een mail naar de klant (de
   * factuur, src/lib/invoiceMail.js). Lucas hoorde niets, dus de enige manier om te
   * weten dat er geld binnen was, was zelf het dashboard openen. Dit is het bericht
   * waar het werk mee mag beginnen.
   *
   * NA de order_events-regel en niet ervoor: de administratie is belangrijker dan het
   * bericht erover, en zou de mail omvallen dan staat de betaling er nog steeds.
   * notifyPaid() vangt zijn eigen fouten en geeft niets terug, dus dit kan de webhook
   * niet laten mislukken — en een webhook die 500 teruggeeft, wordt door Mollie 26 uur
   * lang opnieuw aangeboden.
   */
  await notifyPaid(env, order.id);

  console.log(`[mollie-webhook] order ${ref} marked paid from ${payment.id} (${mode})`);

  // ── DE FACTUUR ─────────────────────────────────────────────────────────────
  //
  // Dit is het moment waarop een factuur mag bestaan: er is betaald, het bedrag
  // staat vast en de btw-behandeling is niet meer te veranderen. Eerder zou het
  // een offerte zijn met het woord factuur erboven.
  //
  // ── WAAROM DIT NIET IN DE 500 MAG EINDIGEN ─────────────────────────────────
  //
  // De regel bovenaan dit bestand — 500 betekent "lever opnieuw af" — geldt hier
  // niet meer. Op dit punt is de betaling al geboekt EN heeft de idempotentiegate
  // hierboven de rij in `payments` geschreven. Een tweede aflevering komt dus niet
  // eens tot hier; hem uitlokken met een 500 levert alleen een mislukte poging op
  // die niets herstelt. Vandaar: alles wat hieronder misgaat wordt gelogd en
  // verder genegeerd.
  //
  // ── EN WAAROM DAT GEEN VERLOREN FACTUUR IS ─────────────────────────────────
  //
  // De herstelroute zit in VISUAILS Studio: /account/invoices roept issueInvoice()
  // zelf aan voor elke betaalde bestelling die er nog geen heeft. Deze aanroep is
  // dus het gemak — de klant hoeft er niet naar te zoeken — en niet de enige weg.
  // Wat hier faalt, komt bij het eerstvolgende bezoek alsnog goed, met de datum
  // van de betaling en niet die van het bezoek.
  //
  // Mollie hanteert 15 seconden. Een pdf van één pagina met de veertien
  // standaardfonts is een kwestie van tientallen milliseconden, de put in R2 gaat
  // over een paar kilobyte en de mail is één fetch. Ruim binnen de tijd, en als
  // het onverhoopt toch niet lukt, zie de alinea hierboven.
  /*
   * ── HET TESTEXEMPLAAR KRIJGT NU WÉL EEN FACTUUR — 12 AUGUSTUS 2026 ─────────
   *
   * Hier stond een `return` voor het testexemplaar, en tussen 10 en 12 augustus was
   * dat het juiste antwoord: `orders.total_cents` bleef NULL, dus de klant zou een
   * genummerde factuur hebben gekregen die "Subtotaal € 0,00 · btw € 0,00 · Betaald
   * € 0,00" zei terwijl er €1 was afgeschreven — en die zou ook een nummer verbruiken
   * in een reeks die geen gaten mag hebben. Een fout document niet uitgeven is
   * onomstreden; een btw-tarief verzinnen in een webhook is dat niet.
   *
   * De fiscale vraag is nu beantwoord: €1 is een brutobedrag inclusief btw. De
   * gevolgen daarvan zitten niet hier maar bij de bron — quoteTestSample() in
   * src/lib/quote.js haalt de btw uit het bedrag, en functions/api/order.js schrijft
   * `total_cents` en `vat_cents` weg zoals bij elke andere bestelling. Daarmee is er
   * niets bijzonders meer aan een proefvisual op dit punt, en verdwijnt de uitzondering
   * in plaats van dat hij wordt bijgewerkt.
   *
   * WAT DIT BETEKENT VOOR BESTELLINGEN VAN VÓÓR VANDAAG. Een proefvisual die eerder is
   * betaald heeft `total_cents` NULL en zou dus alsnog een factuur van €0,00 krijgen.
   * Vandaar de ondergrens hieronder: geen factuur voor een bestelling zonder bedrag.
   * Dat is geen uitzondering voor de proefvisual maar een regel over facturen — een
   * factuur van nul euro is nooit een geldig document, voor welke dienst dan ook.
   * Dezelfde controle staat in catchupOrder() in src/lib/account.js, want dat is de
   * tweede weg naar issueInvoice() en die moet zelfstandig kloppen.
   */
  if (!(Number(order.total_cents) > 0)) {
    console.log('[mollie-webhook]', ref, 'heeft geen bedrag (total_cents =',
      order.total_cents, ') — geen factuur, zie de noot hierboven');
    return;
  }

  try {
    // Geen `today` mee: issueInvoice() pakt dan `paid_at`, dat de UPDATE hierboven
    // net heeft gezet. De factuurdatum is de betaaldatum, ook als deze aflevering
    // van Mollie een dag later komt.
    const invoice = await issueInvoice(env, order.id);
    if (invoice) {
      const full = await env.DB.prepare(
        'SELECT ref, email, lang FROM orders WHERE id = ?1'
      ).bind(order.id).first();
      await mailInvoice(env, { order: full, invoice });
    }
  } catch (e) {
    console.error('[mollie-webhook] factuur voor', ref, 'niet uitgegeven —', e && e.message ? e.message : e,
      '— wordt hersteld zodra de klant VISUAILS Studio opent (/account/invoices).');
  }
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

/**
 * Het betaalmiddel opslaan, en markeren als het niet bij de btw-claim past.
 *
 * Elke stap hier is best-effort en vangt zijn eigen fout op. Dit is een webhook:
 * gooit hij, dan levert Mollie opnieuw af, en dan wordt de betaling twee keer
 * verwerkt of de order helemaal niet bijgewerkt. Een ontbrekend betaalmiddel is
 * een gat in het spoor; een omgevallen webhook is een gat in de boekhouding.
 *
 * De kolommen komen uit migratie 0018. Bestaan ze nog niet — deploy vóór
 * migratie, wat in de praktijk voorkomt — dan slaat dit stil over in plaats van
 * de betaling mee te sleuren.
 */
async function recordPaymentMethod(env, orderId, payment, ref, mode) {
  const method = typeof payment.method === 'string' ? payment.method : null;
  if (!method) return;

  let row = null;
  try {
    row = await env.DB.prepare(
      'SELECT country, vat_treatment, review_state, review_reason FROM orders WHERE id = ?1'
    ).bind(orderId).first();
  } catch (err) {
    // `review_state` bestaat pas na 0018. Zonder die kolom kunnen we niet
    // markeren, maar het middel opslaan kan wel — dus vallen we terug.
    console.warn('[mollie-webhook] kan de btw-velden van', ref, 'niet lezen —', err && err.message);
  }

  try {
    await env.DB.prepare('UPDATE orders SET payment_method = ?1 WHERE id = ?2').bind(method, orderId).run();
  } catch (err) {
    console.warn('[mollie-webhook] payment_method niet opgeslagen voor', ref,
      '— migratie 0018 gedraaid? —', err && err.message);
    return;
  }

  if (!row) return;

  const mismatch = paymentMismatch({
    method,
    country: row.country,
    treatment: row.vat_treatment,
  });
  if (!mismatch) return;

  // ── WAAROM DIT LOGT EN NIET MARKEERT ───────────────────────────────────────
  //
  // Lucas koos 8 augustus 2026 voor voorkómen in plaats van achteraf nakijken:
  // bij een order op 0% wordt iDEAL niet aangeboden (src/lib/mollie.js), dus de
  // samenloop hoort niet te kunnen ontstaan. Kwam hij er tóch, dan is de order op
  // dat moment al betaald en al gestart — hem dan op een beoordelingslijst zetten
  // levert werk op zonder dat er nog iets te beslissen valt.
  //
  // Dus geen vlag, maar ook niet weggooien: dit is het enige teken dat de
  // uitsluiting is omzeild, of dat er met de hand een betaallink is gemaakt. Het
  // betaalmiddel staat hierboven al in de kolom; deze regel maakt zichtbaar
  // waarom je ernaar zou kijken.
  console.warn('[mollie-webhook]', ref, `betaalmiddel past niet bij de btw-claim (${mode}):`, mismatch,
    '— iDEAL hoort bij 0% niet aangeboden te worden; check src/lib/mollie.js en of deze link met de hand is gemaakt.');
}
