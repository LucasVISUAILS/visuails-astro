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
import { issueInvoice } from '../../../src/lib/invoice.js';
import { mailInvoice } from '../../../src/lib/invoiceMail.js';
import { notifyPaid, notifyPaymentFailed, notifySampleBlocked } from '../../../src/lib/notify.js';
import { payerHash } from '../../../src/lib/payer.js';

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

async function recordPaid(env, payment, mode) {
  // metadata comes back as whatever was sent. order.js sends an object; a
  // string is accepted too so a payment created by hand in Mollie's dashboard
  // (which is the natural way to test this) can still be tied to an order.
  const meta = typeof payment.metadata === 'string'
    ? (() => { try { return JSON.parse(payment.metadata); } catch { return {}; } })()
    : (payment.metadata || {});
  const ref = meta.order_ref;

  if (!ref) {
    // A payment on our own account with no order attached: possible if one was
    // created outside this codebase. Loud, because it means money arrived that
    // no order will ever show — but not a 500, because retrying cannot attach
    // metadata that was never set.
    console.error('[mollie-webhook] paid payment carries no order_ref —', payment.id, `(${mode})`);
    return;
  }

  const order = await env.DB.prepare('SELECT id, service, status, payment_status, total_cents, refunded_cents FROM orders WHERE ref = ?1').bind(ref).first();
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
  const refunded = mollieAmountToCents(payment.amountRefunded) ?? 0;
  const known = Math.max(0, Math.floor(Number(order.refunded_cents) || 0));
  if (refunded > known) {
    // Fully refunded when it covers everything that was charged. `paid` with a
    // partial refund recorded is deliberately NOT downgraded: the work was
    // bought and part of it was given back, and calling that 'refunded' would
    // tell the studio to stop on an order that is still running.
    const full = cents !== null && refunded >= cents;
    await env.DB.prepare(
      `UPDATE orders SET refunded_cents = ?1, payment_status = ?2 WHERE id = ?3`
    ).bind(refunded, full ? 'refunded' : order.payment_status || 'paid', order.id).run();

    await env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, 'system')`
    ).bind(
      order.id,
      order.status,
      `Refund recorded: ${(refunded / 100).toFixed(2)} EUR of ${cents === null ? '?' : (cents / 100).toFixed(2)} (Mollie ${payment.id})`
    ).run().catch(() => {});

    console.log(`[mollie-webhook] refund on ${payment.id} (${mode}): ${known} -> ${refunded} cents, ${full ? 'full' : 'partial'}`);
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
        JSON.stringify(payment)
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
   * ── GEEN FACTUUR VOOR HET TESTEXEMPLAAR — 10 AUGUSTUS 2026 ─────────────────
   *
   * issueInvoice() werd hier onvoorwaardelijk aangeroepen, ook voor een €1-proefbeeld.
   * En dat leverde een AANTOONBAAR ONJUIST document op: quoteOrder() geeft null voor
   * 'test-sample' (het staat niet in PAYABLE_SERVICES), dus `orders.total_cents` blijft
   * NULL en `vat_cents` 0. snapshotFromOrder() leest `Number(order.total_cents) || 0`,
   * de regelsomcontrole in invoicePdf komt langs met 0 === 0, en de klant krijgt een
   * genummerde factuur die "Subtotaal € 0,00 · btw € 0,00 · Betaald € 0,00" zegt terwijl
   * er €1 is afgeschreven. Bovendien verbruikt zo'n factuur een nummer in een reeks die
   * geen gaten mag hebben.
   *
   * WAAROM OVERSLAAN EN NIET REPAREREN. quote.js:206 heeft `quoteTestSample()` staan,
   * met nul aanroepers in de hele repo, en die zegt: netCents €1, vatCents 0, "treated
   * as VAT-inclusive". Die keuze — of dat €1 inclusief 21% is of buiten de btw valt —
   * is een fiscale beslissing en niet iets om hier stilzwijgend in te bakken. Een fout
   * document niet uitgeven is onomstreden; een tarief verzinnen is dat niet.
   *
   * De betaling zelf is niet zoek: hij staat in `payments` en bij Mollie. Wil je hier
   * wél een factuur, dan is dat één regel zodra de fiscale vraag beantwoord is.
   */
  if (order.service === 'test-sample') {
    console.log('[mollie-webhook] testexemplaar', ref, '— geen factuur, zie de noot hierboven');
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
