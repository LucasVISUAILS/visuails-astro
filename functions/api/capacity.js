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

import {
  ATTENDED_PER_WINDOW,
  HORIZON_DAYS,
  QUEUE_DAYS_MAX,
  QUEUE_DAYS_MIN,
  addDays,
  bookedFromRows,
  clearedWindows,
} from '../../src/data/capacity.js';

/** The queue's answer, in working days. See the note in handle() for why not dates. */
const QUEUE = { minDays: QUEUE_DAYS_MIN, maxDays: QUEUE_DAYS_MAX, committed: false };

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const products = Number.parseInt(url.searchParams.get('products') ?? '', 10);
  const tier = url.searchParams.get('tier') === 'attended' ? 'attended' : 'unattended';
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
        max: ATTENDED_PER_WINDOW,
        windows: [],
        queue: QUEUE,
      },
      503,
      { 'cache-control': 'no-store' }
    );
  }

  const gate = clearedWindows({ today, products, booked, blackouts });

  return json({
    ok: true,
    today,
    tier,
    products: Number.isInteger(products) ? products : null,
    // 'ok' | 'full' | 'too-large' | 'invalid' — three of these are empty results
    // that mean different things, and /start must not flatten them into one
    // apology. See clearedWindows() in src/data/capacity.js.
    reason: gate.reason,
    max: gate.max,
    windows: gate.windows.map((w) => ({ start: w.start, end: w.end })),
    queue: QUEUE,
  });
}

/**
 * The two facts the gate needs, and nothing else.
 *
 * Throws on any D1 problem — including a missing binding — because the caller
 * must be able to tell "the calendar is empty" from "I could not see the
 * calendar". Returning {} for both would make those identical.
 */
async function readCalendar(env, today) {
  if (!env || !env.DB) throw new Error('capacity: no DB binding');

  // A window that starts just inside the horizon still runs past it, and a
  // blackout on its second day matters, so the blackout read runs long.
  const horizonEnd = addDays(today, HORIZON_DAYS + 14);

  const [blackoutRows, orderRows] = await Promise.all([
    env.DB.prepare('SELECT day FROM blackout_days WHERE day >= ?1 AND day <= ?2')
      .bind(today, horizonEnd)
      .all(),
    // Live attended reservations only. COALESCE covers rows written before
    // window_end existed; cancelled orders release their days immediately.
    env.DB.prepare(
      `SELECT window_start, window_end, product_count
         FROM orders
        WHERE tier = 'attended'
          AND window_start IS NOT NULL
          AND status <> 'cancelled'
          AND COALESCE(window_end, window_start) >= ?1`
    )
      .bind(today)
      .all(),
  ]);

  const blackouts = new Set((blackoutRows.results || []).map((r) => r.day));
  return { blackouts, booked: bookedFromRows(orderRows.results || [], blackouts) };
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
      // See the caching note at the top of this file — this is the rate limiter.
      'cache-control': 'public, max-age=60',
      ...headers,
    },
  });
}
