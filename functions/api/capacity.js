// VISUAILS — the capacity endpoint (Cloudflare Pages Function). Section 10.
//
// GET /api/capacity?products=12&tier=attended
//
// This is the only network-facing route that can produce a delivery date, and it
// exists so that /start can offer one. All the arithmetic lives in
// src/data/capacity.js — shared, pure, and testable with a frozen clock. This
// file does three things and nothing else: read the two facts the calendar needs
// out of D1, pick "today", and hand back what the gate cleared.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE ONE RULE
// The brief: never promise a delivery date the capacity gate hasn't cleared.
// The failure mode that rule is really about is not a bug in the arithmetic — it
// is the database being unreachable. An endpoint that shrugs and treats a failed
// query as "nothing is booked" hands back a wide-open calendar at exactly the
// moment it knows least, and every window it offers is a promise made blind.
//
// So a D1 failure here is a hard 503 with no windows. Not a fallback, not a
// guess, not an empty booked map. If the gate cannot see the calendar, the site
// says so and offers to talk. That is the whole reason this file is separate
// from the arithmetic: the arithmetic cannot know that it is being fed nothing.
// ─────────────────────────────────────────────────────────────────────────────
//
// WHY THERE IS NO RATE LIMITER HERE
// The brief asks for rate-limited lookups on the PORTAL, where a token can be
// guessed. This endpoint has no secret to guess. Putting a D1-backed counter in
// front of it would add a write to every read and turn a hammering client into
// write amplification — strictly worse than what it protects against. The right
// defence for a public read is caching, so the response carries a 60-second
// Cache-Control and repeat hits never reach D1 at all.
//
// Sixty seconds of staleness is safe because a shown window is not a held one.
// The booking path re-runs the gate against live rows at the moment of booking
// and refuses if the window has gone — which it has to do regardless of caching,
// since two people can be looking at the same last window at the same instant.
// Nothing here is a reservation. The reservation is orders.window_start.

import { readCalendar } from '../../src/lib/agenda.js';
import { kindImages } from '../../src/data/pricing.js';
import {
  MAX_PRODUCTS_ANY_SERVICE,
  ATTENDED_PER_WINDOW,
  QUEUE_DAYS_MAX,
  QUEUE_DAYS_MIN,
  clearedWindows,
} from '../../src/data/capacity.js';

/** The queue's answer, in working days. See the note in handle() for why not dates. */
const QUEUE = { minDays: QUEUE_DAYS_MIN, maxDays: QUEUE_DAYS_MAX, committed: false };

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  /* ── DE CACHESLEUTEL MOET BEGRENSD ZIJN — 31 augustus 2026 ────────────────
   *
   * De noot bovenaan zegt dat er geen snelheidsbegrenzer nodig is omdat een
   * cache van zestig seconden de belasting wegneemt. Dat klopt alleen als het
   * AANTAL VERSCHILLENDE ANTWOORDEN begrensd is, en dat was het niet: de
   * cachesleutel is de hele URL, en `products` was elk geheel getal en `service`
   * elke tekenreeks. Een lus met een oplopende `products` mist de rand-cache dus
   * elke keer en komt met drie query's zonder LIMIT bij D1 uit — dezelfde D1
   * waar de studio op draait, en het bezwijken ervan is een 503 op precies het
   * endpoint dat leverdata maakt.
   *
   * Nu wordt allebei genormaliseerd vóórdat er iets mee gebeurt. Een aantal
   * buiten bereik wordt geknipt en een onbekende dienst valt terug op 'complete',
   * dus er zijn nog hooguit een paar honderd verschillende antwoorden en de cache
   * doet wat de noot belooft. Knippen en niet weigeren: het antwoord op een te
   * groot aantal is 'too-large' met een uitleg, en dat is een echt antwoord dat
   * /start toont — een 400 zou daar een lege pagina van maken. */
  const gevraagd = Number.parseInt(url.searchParams.get('products') ?? '', 10);
  const products = Number.isInteger(gevraagd)
    ? Math.min(Math.max(gevraagd, 1), MAX_PRODUCTS_ANY_SERVICE + 1)
    : gevraagd;
  const tier = url.searchParams.get('tier') === 'attended' ? 'attended' : 'unattended';
  /* WELKE DIENST, WANT HET PLAFOND HANGT ERVAN AF — 31 augustus 2026.
     De agenda rekent in beelden, dus dertig catalogsets (120) passen in een
     venster waar dertig complete producten (210) precies in gaan en eenendertig
     niet meer. Ontbreekt de parameter, dan is het antwoord 'complete': het
     zwaarste gewicht, en precies wat deze poort vóór vandaag voor elke order
     aannam. Een oude aanroeper krijgt daarmee exact het antwoord van gisteren. */
  const gevraagdeDienst = url.searchParams.get('service') || 'complete';
  const service = kindImages(gevraagdeDienst, 1) === null ? 'complete' : gevraagdeDienst;
  const today = todayUTC();

  // Tier 0 does not use the gate at all. It is not "cleared for nothing" and it
  // is not full — it is a different service model, and saying so with its own
  // reason keeps /start from rendering a queue order as a failed drop.
  if (tier !== 'attended') {
    return json({
      ok: true,
      today,
      tier,
      products: Number.isInteger(products) ? products : null,
      reason: 'queue',
      service,
      max: ATTENDED_PER_WINDOW,
      windows: [],
      queue: QUEUE,
    });
  }

  let booked;
  let blackouts;
  try {
    ({ booked, blackouts } = await readCalendar(env, today));
  } catch (err) {
    // See THE ONE RULE above. No windows, and the caller is told why so it can
    // say the true thing rather than "we are fully booked".
    return json(
      {
        ok: false,
        today,
        tier,
        products: Number.isInteger(products) ? products : null,
        reason: 'unavailable',
        service,
        max: ATTENDED_PER_WINDOW,
        windows: [],
        queue: QUEUE,
      },
      503,
      { 'cache-control': 'no-store' }
    );
  }

  const gate = clearedWindows({ today, products, service, booked, blackouts });

  return json({
    ok: true,
    today,
    tier,
    products: Number.isInteger(products) ? products : null,
    service,
    // 'ok' | 'full' | 'too-large' | 'invalid' | 'unweighed' — four of these are
    // empty results that mean different things, and /start must not flatten them
    // into one apology. See clearedWindows() in src/data/capacity.js.
    reason: gate.reason,
    max: gate.max,
    maxImages: gate.maxImages,
    windows: gate.windows.map((w) => ({ start: w.start, end: w.end })),
    queue: QUEUE,
  });
}



/**
 * Today, as the studio's calendar sees it.
 *
 * This is the single place in the whole capacity system where a clock is read —
 * src/data/capacity.js takes the day as an argument precisely so that it stays
 * that way. UTC, to match every other date in the system: the Netherlands runs
 * an hour or two ahead of UTC, so between midnight and 02:00 local the studio's
 * "today" and this "today" differ by one day. Being a day CONSERVATIVE about
 * when work can start is the safe direction to be wrong in, and the alternative
 * — a local-time date built inside a worker whose timezone is not the studio's —
 * is wrong in the unsafe direction and much harder to see.
 */
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
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
      // See the caching note at the top of this file — this is the rate limiter.
      'cache-control': 'public, max-age=60',
      ...headers,
    },
  });
}
