// VISUAILS — het statuseindpunt van de bedankpagina (Cloudflare Pages Function).
//
// GET /api/order-status?ref=VIS-XXXX-YYY  →  { cancelled: boolean, kind: string|null }
//
// ══════════════════════════════════════════════════════════════════════════════
// WAAROM DIT BESTAND ER PAS NU IS
// ══════════════════════════════════════════════════════════════════════════════
//
// Op 11 augustus 2026 is de annulering van een tweede proefvisual gebouwd: de
// webhook zet `status = 'cancelled'` met `cancel_reason = 'sample-duplicate'`, de
// bedankpagina heeft een blok `[data-ty-cancelled]` en interactions.js vraagt dit
// eindpunt drie keer of het zichtbaar moet worden.
//
// Alleen: dit eindpunt is nooit geschreven. functions/api/ had capacity, order,
// step, upload en webhook — en geen order-status. Elke fetch gaf dus een 404, en
// omdat checkCancelled() met opzet STIL faalt (een gewone besteller mag nooit een
// annuleringsmelding zien omdat er iets omvalt) was er niets te zien: geen
// foutmelding, geen melding in de console, alleen een blok dat nooit opende.
//
// Dat is precies het soort fout dat je niet vindt door te kijken of het werkt.
// Het "werkte" — er gebeurde niets, en er hoort in het gewone geval ook niets te
// gebeuren. Vandaar dat de test onderaan de lijst niet op het gedrag maar op het
// BESTAAN van de route staat.
//
// ══════════════════════════════════════════════════════════════════════════════
// WAT ER WEL EN NIET UIT DIT EINDPUNT KOMT
// ══════════════════════════════════════════════════════════════════════════════
//
// Wie de referentie heeft, kan dit eindpunt aanroepen. Een referentie is geen
// geheim: hij staat in de URL van de bedankpagina, in de bevestigingsmail en in
// het e-mailverkeer erna. Dus is de vraag niet "hoe beveilig ik dit" maar "wat
// mag hier hoe dan ook uit komen".
//
// `cancel_reason` NIET. Bij een annulering met de hand is dat een vrij tekstveld
// dat Lucas in het adminpaneel invult — een interne notitie ("klant belt niet
// terug", "vermoeden van doorverkoop"), en dat is precies het soort tekst dat
// nooit een publiek antwoord in mag. Er gaat daarom alleen een BEKEND
// machinewoord de deur uit: 'sample-duplicate' of niets. Wat een mens getypt
// heeft, blijft binnen.
//
// `cancelled` mag wel echt zeggen of de bestelling geannuleerd is. Wie zijn eigen
// referentie heeft, heeft daar recht op, en het staat toch al in zijn mail.
//
// En verder niets: geen bedrag, geen dienst, geen e-mailadres, geen datum. De
// bedankpagina heeft precies twee bits nodig en krijgt precies twee bits.
//
// ── EEN ONBEKENDE REFERENTIE KRIJGT HETZELFDE ANTWOORD ──────────────────────
//
// Niet 404 maar 200 met `cancelled: false`. Een 404 op een onbekende referentie
// en een 200 op een bekende maakt dit eindpunt een orakel dat vertelt WELKE
// referenties bestaan, en daarmee hoeveel bestellingen er zijn — het formaat is
// zeven tekens uit base36, dus dat is aftastbaar. Hetzelfde antwoord voor "hij
// bestaat niet" en "hij is niet geannuleerd" haalt die vraag weg. De
// bedankpagina merkt er niets van: die wil alleen weten of het blok open moet.
//
// ══════════════════════════════════════════════════════════════════════════════
// GEEN CACHE, EN DAT IS HIER GEEN DETAIL
// ══════════════════════════════════════════════════════════════════════════════
//
// /api/capacity heeft juist WEL een cache van zestig seconden, en dat is daar het
// hele verdedigingsmiddel. Hier zou diezelfde cache de functie slopen.
//
// checkCancelled() vraagt het drie keer — op 0, 2 en 4 seconden — omdat er een
// wedloop is: Mollie stuurt de bezoeker terug én roept de webhook aan, en wie
// eerst aankomt staat niet vast. Die drie pogingen bestaan dus juist om een
// ANDER antwoord te krijgen dan de eerste keer. Met een cache van zestig seconden
// zijn poging twee en drie letterlijk hetzelfde antwoord als poging één, en is de
// hele wedloop-afhandeling een lus die niets doet.
//
// Vandaar `no-store`, en vandaar de teller uit ratelimit.js in plaats van een
// cache: dit is qua vorm de portal (per referentie, niet te cachen, raakt D1 bij
// elk verzoek) en niet de capaciteitskaart (publiek, identiek voor iedereen).

import { checkRate, clientIp, shouldSweep, sweepRateLimits } from '../../src/lib/ratelimit.js';

/**
 * Het enige woord dat naar buiten mag.
 *
 * Zet de webhook er ooit een tweede machinereden bij, dan komt die hier in de
 * lijst en niet in een `if`. Alles wat niet in deze verzameling staat — inclusief
 * elke met de hand getypte reden — wordt `null`.
 */
const PUBLIC_REASONS = new Set(['sample-duplicate']);

/**
 * Ruim, maar begrensd.
 *
 * makeRef() in order.js maakt `VIS-` + vier tekens + `-` + drie tekens, allemaal
 * uit base36 in hoofdletters. Deze test staat iets losser omdat de vorm van een
 * referentie in de loop van het project veranderd kan zijn en een te strakke
 * test dan STIL de melding wegneemt bij een oudere bestelling. De bovengrens is
 * er wel: hij houdt onzin uit de bind en uit de tellerbucket.
 */
const REF_SHAPE = /^VIS-[0-9A-Z-]{3,20}$/i;

/** Drie pogingen per paginaweergave, dus dertig is ruim voor een mens en krap voor een script. */
const LIMIT = 30;

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const raw = (url.searchParams.get('ref') || '').trim();

  // Vormfout: nooit de database aanraken. Zelfde afspraak als
  // isWellFormedToken() voor de portal — de goedkoopste afwijzing is de eerste.
  if (!REF_SHAPE.test(raw)) return json({ cancelled: false, kind: null });

  const ref = raw.toUpperCase();

  // ── DE TELLER ─────────────────────────────────────────────────────────────
  // Eigen actienaam, zodat een stortvloed hierop de portal niet dichtzet en
  // omgekeerd. checkRate() faalt open bij een D1-hik; zie de noot daar voor
  // waarom dat de goede kant is om fout te gaan.
  const gate = await checkRate(env, { ip: clientIp(request), action: 'order-status', limit: LIMIT });
  if (typeof waitUntil === 'function' && shouldSweep()) waitUntil(sweepRateLimits(env));
  if (!gate.allowed) {
    return json({ cancelled: false, kind: null }, 429, {
      'retry-after': String(Math.max(1, gate.retryAfter || 1)),
    });
  }

  // ── GEEN DATABASE IS GEEN ANTWOORD ────────────────────────────────────────
  // Niet stil `cancelled: false` teruggeven: dat is een bewering over deze
  // bestelling die we op dit moment niet kunnen doen. 503, precies zoals
  // /api/capacity bij een onbereikbare kalender. De bezoeker merkt er niets van
  // — checkCancelled() behandelt elke niet-ok als "niets tonen" — maar het
  // verschil tussen "niet geannuleerd" en "ik kon niet kijken" blijft bestaan,
  // en dat verschil staat in de logs.
  if (!env?.DB) return json({ cancelled: false, kind: null }, 503, { 'cache-control': 'no-store' });

  let row;
  try {
    row = await env.DB.prepare('SELECT status, cancel_reason FROM orders WHERE ref = ?1')
      .bind(ref)
      .first();
  } catch (err) {
    console.error('[order-status]', err && err.message ? err.message : err);
    return json({ cancelled: false, kind: null }, 503, { 'cache-control': 'no-store' });
  }

  // Onbekende referentie: hetzelfde antwoord als een niet-geannuleerde. Zie de
  // noot over het orakel hierboven.
  if (!row) return json({ cancelled: false, kind: null });

  const cancelled = row.status === 'cancelled';
  const reason = typeof row.cancel_reason === 'string' ? row.cancel_reason : '';

  return json({
    cancelled,
    kind: cancelled && PUBLIC_REASONS.has(reason) ? reason : null,
  });
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      /* nosniff: dit is JSON en mag door geen enkele browser voor iets anders
         worden aangezien. api/upload.js en api/order.js zetten hem al; deze twee
         waren de uitzondering. */
      'x-content-type-options': 'nosniff',
      // Zie het blok over de cache bovenaan: dit eindpunt bestaat om binnen zes
      // seconden van antwoord te kunnen veranderen.
      'cache-control': 'no-store',
      ...headers,
    },
  });
}
