// VISUAILS — the capacity gate. Section 10 of the brief.
//
// WHY THIS FILE EXISTS
// The brief carries one absolute rule about time: **never promise a delivery
// date the capacity gate hasn't cleared.** Every other constraint in the
// repositioning is a matter of taste; that one is a promise a one-person studio
// can be held to in writing. /terms §6 now says outright that "a date we have
// not reserved capacity for is not a date". This file is the thing that makes
// that sentence true rather than decorative.
//
// It is pure arithmetic. No database, no fetch, no Date.now() at module scope —
// every function takes the day it should treat as "today" as an argument, so
// the same code runs in a Pages Function, in a page's frontmatter and in a test
// with a frozen clock and gives the same answer. The database supplies two
// things and nothing else: which days are blacked out, and what is already
// booked. The rules live here.
//
// WHY PRODUCTS PER DAY AND NOT DROPS PER WEEK
// AUDIT-TASK-0.md §H·4 is explicit: "I'd want the ceiling constant set
// deliberately (products/48h, not drops/week) before /start ships a date the
// site is bound to." Drops-per-week cannot express the difference between a
// Drop Pilot of 8 and a Full Drop of 30, so a calendar built on it would clear
// dates it cannot keep. The unit is a product-day.
//
// ─────────────────────────────────────────────────────────────────────────────
// FLAGGED FOR LUCAS — PRODUCTS_PER_DAY IS AN OPERATIONAL CLAIM, NOT A DESIGN
// DECISION, AND IT IS THE ONE NUMBER IN THIS FILE I CANNOT SET FOR YOU.
//
// Everything below is derived from it, and it is what the site is bound to the
// moment /start offers a window. At drop scope one product is a catalog set
// (4 images) plus a lifestyle carousel (3), so 18 products/day is 126 finished,
// human-checked images in a day. If that is wrong, it is wrong in one place:
// change PRODUCTS_PER_DAY and the whole calendar moves with it. The assertions
// at the bottom will tell you immediately if a new value stops the Full Drop
// fitting inside the window it is sold with.
// ─────────────────────────────────────────────────────────────────────────────

import { FULL_DROP_MAX, PILOT_PRODUCTS } from './pricing.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1 · THE CEILING
// ─────────────────────────────────────────────────────────────────────────────

/** Total product throughput one studio working day can hold. See the flag above. */
export const PRODUCTS_PER_DAY = 18;

/**
 * Capacity an attended window may never take.
 *
 * Without this the gate is free to sell every working day to drops, and Tier 0's
 * "typically 2–4 working days" — which the site prints as a promise, not an
 * estimate — quietly stops being true while every individual dashboard still
 * looks green. Section 13 says Tier 0 "always yields to Tier 1 in the capacity
 * gate"; yielding is not the same as starving. This is the floor under the
 * yielding.
 */
export const QUEUE_FLOOR_PER_DAY = 3;

/** What is actually sellable as a reserved window, per day. */
export const ATTENDED_PER_DAY = PRODUCTS_PER_DAY - QUEUE_FLOOR_PER_DAY;

/**
 * A reserved window is two consecutive working days.
 *
 * The site sells "a reserved 48-hour window" (TIERS.attended.turnaround). Two
 * working days is the honest reading of 48 hours for a studio that does not
 * work weekends: a window opened on Friday runs Friday and Monday, and the
 * client is told the calendar dates, never the phrase "48 hours" as a countdown.
 */
export const WINDOW_DAYS = 2;

/** The most products one reserved window can hold. */
export const ATTENDED_PER_WINDOW = ATTENDED_PER_DAY * WINDOW_DAYS;

/**
 * Working days between an order being complete and the earliest window it may
 * be offered. This is briefing time, not production time — the products have to
 * arrive and be looked at before a window means anything.
 */
export const LEAD_DAYS = 2;

/** How far ahead the gate will offer a window at all. */
export const HORIZON_DAYS = 60;

/** Working days the standard queue is allowed to quote. Mirrors Tier 0's copy. */
export const QUEUE_DAYS_MIN = 2;
export const QUEUE_DAYS_MAX = 4;

// ─────────────────────────────────────────────────────────────────────────────
// 2 · DAY ARITHMETIC — UTC, ISO strings, no timezone anywhere.
//
// Every date in this module is a 'YYYY-MM-DD' string and every comparison is a
// string comparison, which for ISO dates is the same as a chronological one.
// Nothing here constructs a Date from a local-time value, so a studio in
// Enschede and a Cloudflare worker in Frankfurt agree on what Tuesday is.
// ─────────────────────────────────────────────────────────────────────────────

/** True for Mon–Fri. Weekends are not studio days. */
export function isWorkingDay(iso, blackouts = new Set()) {
  if (blackouts.has(iso)) return false;
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6;
}

/** The ISO day `n` calendar days after `iso`. */
export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The `n`th working day strictly after `iso`. n=1 is the next working day. */
export function addWorkingDays(iso, n, blackouts = new Set()) {
  let cur = iso;
  let left = n;
  let guard = 0;
  while (left > 0) {
    cur = addDays(cur, 1);
    if (isWorkingDay(cur, blackouts)) left -= 1;
    if (++guard > 400) throw new Error('capacity.js: addWorkingDays ran away — check blackouts');
  }
  return cur;
}

/**
 * The consecutive working days a window starting on `iso` occupies.
 * Returns [] if `iso` is not itself a working day — a window cannot open on a
 * day the studio is closed, even if the days after it are free.
 */
export function windowDays(iso, blackouts = new Set()) {
  if (!isWorkingDay(iso, blackouts)) return [];
  const days = [iso];
  let cur = iso;
  while (days.length < WINDOW_DAYS) {
    cur = addWorkingDays(cur, 1, blackouts);
    days.push(cur);
  }
  return days;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · THE GATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Can a window starting on `startIso` hold `products` more attended products?
 *
 * `booked` maps 'YYYY-MM-DD' → attended products already committed on that day.
 * A day the gate has never heard of is empty; a day in `blackouts` is closed and
 * makes the whole window unofferable rather than merely tight.
 *
 * The load is spread evenly across the window's days, which is the pessimistic
 * reading: a 30-product drop asks for 15 on each of two days rather than "30
 * somewhere in there". A gate that lets work slide between days is a gate that
 * clears a date it has to move later.
 */
export function windowFits(startIso, products, booked = {}, blackouts = new Set()) {
  const days = windowDays(startIso, blackouts);
  if (days.length !== WINDOW_DAYS) return false;
  const perDay = Math.ceil(products / WINDOW_DAYS);
  return days.every((d) => (booked[d] || 0) + perDay <= ATTENDED_PER_DAY);
}

/**
 * Every window the gate has actually cleared for this order, soonest first.
 *
 * This is the ONLY function allowed to produce a date the site shows a client.
 * If it returns [], /start says so in words and offers to talk — it must never
 * fall back to a guess, and there is deliberately no "closest we can do"
 * fallback here to make that easy to do by accident.
 *
 * An order larger than one window cannot be dated at all: ATTENDED_PER_WINDOW is
 * the hard ceiling and a drop is sold as one window, not two. That case returns
 * [] with `tooLarge` set by clearedWindows below.
 */
export function offerableWindows({
  today,
  products,
  booked = {},
  blackouts = new Set(),
  limit = 6,
}) {
  if (!Number.isInteger(products) || products < 1) return [];
  if (products > ATTENDED_PER_WINDOW) return [];

  const first = addWorkingDays(today, LEAD_DAYS, blackouts);
  const last = addDays(today, HORIZON_DAYS);
  const out = [];

  let cur = first;
  while (cur <= last && out.length < limit) {
    if (windowFits(cur, products, booked, blackouts)) {
      const days = windowDays(cur, blackouts);
      out.push({ start: days[0], end: days[days.length - 1], days });
    }
    cur = addDays(cur, 1);
  }
  return out;
}

/**
 * The gate's full answer, in the shape /start and the order endpoint both need.
 *
 * `windows` is empty in three different situations and the caller must not
 * flatten them into one "sorry": too large to be one window, nothing free
 * inside the horizon, and a product count that is not a number at all. Each
 * gets its own reason so the page can say the true thing.
 */
export function clearedWindows({ today, products, booked = {}, blackouts = new Set(), limit = 6 }) {
  if (!Number.isInteger(products) || products < 1) {
    return { windows: [], reason: 'invalid', max: ATTENDED_PER_WINDOW };
  }
  if (products > ATTENDED_PER_WINDOW) {
    return { windows: [], reason: 'too-large', max: ATTENDED_PER_WINDOW };
  }
  const windows = offerableWindows({ today, products, booked, blackouts, limit });
  return {
    windows,
    reason: windows.length ? 'ok' : 'full',
    max: ATTENDED_PER_WINDOW,
  };
}

/**
 * INTERNAL ONLY — the studio's own view of when a queue item is due, so it is
 * possible to see one slipping. Not a client-facing number, in any channel.
 *
 * Section 13: "NO named delivery date — show 'typically 2-4 working days,' never
 * a date. This is the single most important constraint in this section." That
 * applies to the confirmation email as much as to the page, so /api/capacity
 * deliberately returns QUEUE_DAYS_MIN/MAX as counts and never calls this. The
 * sentence a Tier 0 client actually sees is TIERS.unattended.turnaround, which
 * is a duration, and the two must not be allowed to converge.
 *
 * Note what this does NOT do: it does not consult `booked`. Tier 0 yields, so
 * its span is a statement about the queue's shape, not a reservation. The moment
 * this function starts returning a single date it has become a promise, and it
 * is not allowed to be one.
 */
export function queueSpan(today, blackouts = new Set()) {
  return {
    from: addWorkingDays(today, QUEUE_DAYS_MIN, blackouts),
    to: addWorkingDays(today, QUEUE_DAYS_MAX, blackouts),
    committed: false,
  };
}

/**
 * Every weekday from `startIso` to `endIso` inclusive.
 *
 * Deliberately does NOT take blackouts — see bookedFromRows for why.
 */
export function weekdaysInRange(startIso, endIso) {
  if (!startIso || !endIso || endIso < startIso) return [];
  const out = [];
  let cur = startIso;
  let guard = 0;
  while (cur <= endIso) {
    if (isWorkingDay(cur)) out.push(cur);
    cur = addDays(cur, 1);
    if (++guard > 400) throw new Error('capacity.js: weekdaysInRange ran away — check the stored window');
  }
  return out;
}

/**
 * Attended load per day, from the rows the database hands back.
 * Each row is { window_start, window_end, product_count } for a live attended order.
 *
 * WHY THIS READS window_end AND IGNORES BLACKOUTS
 * A reservation's footprint is the range it was SOLD with, not a range
 * recomputed against today's calendar. If a blackout day is added after a window
 * was cleared, recomputing would shuffle that order onto different days — or, if
 * the blackout landed on its start, drop it from the gate's view entirely, and
 * the gate would then cheerfully sell the same days to somebody else. The stored
 * pair is the record of what was promised; nothing later is allowed to edit it.
 * schema.sql says the same thing from the other side: a calendar edit does not
 * move an order, a person does, after telling the client.
 *
 * A row missing window_end predates that pair being stored, and falls back to
 * the computed window. A range that contains no weekday at all still occupies
 * its start day rather than vanishing — a reservation the gate cannot see is the
 * one failure this whole file exists to prevent.
 */
export function bookedFromRows(rows = [], blackouts = new Set()) {
  const booked = {};
  for (const r of rows) {
    const start = r.window_start;
    const n = Number(r.product_count) || 0;
    if (!start || !n) continue;

    let days = r.window_end ? weekdaysInRange(start, r.window_end) : windowDays(start, blackouts);
    if (!days.length) days = [start];

    const perDay = Math.ceil(n / days.length);
    for (const d of days) booked[d] = (booked[d] || 0) + perDay;
  }
  return booked;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · BUILD-TIME ASSERTIONS
//
// Same pattern as assertLadder() in pricing.js, and for the same reason: the
// numbers above are load-bearing against numbers in another file, and a
// contradiction between them is not a rendering bug, it is the site selling a
// window it cannot hold. Fail the build, not the delivery.
// ─────────────────────────────────────────────────────────────────────────────

function assertCapacity() {
  if (QUEUE_FLOOR_PER_DAY >= PRODUCTS_PER_DAY) {
    throw new Error('capacity.js: QUEUE_FLOOR_PER_DAY leaves no attended capacity at all.');
  }
  if (ATTENDED_PER_WINDOW < FULL_DROP_MAX) {
    throw new Error(
      `capacity.js: a Full Drop is sold at up to ${FULL_DROP_MAX} products in one reserved ` +
      `window, but a window only holds ${ATTENDED_PER_WINDOW}. Either raise PRODUCTS_PER_DAY, ` +
      `lower QUEUE_FLOOR_PER_DAY, or lower FULL_DROP_MAX in pricing.js — the site must not ` +
      `offer a package the gate can never clear.`
    );
  }
  if (PILOT_PRODUCTS > ATTENDED_PER_WINDOW) {
    throw new Error('capacity.js: the Drop Pilot does not fit inside one reserved window.');
  }
  if (QUEUE_DAYS_MIN >= QUEUE_DAYS_MAX) {
    throw new Error('capacity.js: the queue span is inverted.');
  }
  if (LEAD_DAYS < 1) {
    throw new Error('capacity.js: LEAD_DAYS below 1 offers a window before the brief can be read.');
  }
}

assertCapacity();
