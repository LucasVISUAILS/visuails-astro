// VISUAILS — order / signup / contact intake (Cloudflare Pages Function).
//
// One POST endpoint for every form on the site. The form's hidden `service`
// field selects the flow:
//   • subscribe               → lead-magnet email capture (briefing checklist)
//   • contact                 → contact-form message
//   • catalog|lifestyle|video|custom|test-sample → an order
//
// Design notes:
//   • Defensive by construction: a missing binding or a failing email must
//     never show the customer a broken page. Every side-effect is wrapped in
//     try/catch and we ALWAYS redirect to the (localized) thank-you page.
//   • No personal data in the redirect URL — only a generated order ref.
//   • The customer row is upserted by email on every order, so the account /
//     profile-prefill phase has data to work with from day one.
//
// Bindings (see wrangler.toml): env.DB (D1), env.UPLOADS (R2),
// env.RESEND_API_KEY (secret), env.NOTIFY_EMAIL, env.FROM_EMAIL.
//
// The confirmation email reads its timing from the tier model in
// src/data/pricing.js rather than typing it. It used to promise "within about
// 24 hours" — the exact claim the repositioning retired — and it survived every
// sweep because every sweep was scoped to src/. An email is the one surface a
// customer keeps, so it is the last place a stale promise should be allowed to
// live, and the only way to guarantee that is to stop it having its own copy.
//
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 · THIS ENDPOINT IS NOW THE BOOKING PATH
//
// /start's pipeline posts here with { tier, products, window_start, window_end,
// upload_batch }. Three things follow from that, and they are the reason this
// file grew:
//
//  1. THE GATE RUNS AGAIN, HERE, SERVER-SIDE. /api/capacity is a cacheable
//     public read and cannot reserve anything — its own header says so: "Nothing
//     here is a reservation. The reservation is orders.window_start." Two people
//     can be looking at the same last window at the same instant, and the client
//     could have had that page open for an hour. So the window arriving in this
//     request is a REQUEST for a date, never a grant of one, and it is checked
//     against live rows before it is written.
//
//  2. A WINDOW IS WRITTEN ONLY IF clearedWindows() STILL RETURNS IT. Not "if it
//     looks close", not "if it used to fit". The brief's one absolute rule about
//     time is "never promise a delivery date the capacity gate hasn't cleared",
//     and the only way to make that a property of the database rather than of
//     our own discipline is for this to be the single place window_start is ever
//     assigned, from the single function allowed to produce a date.
//
//  3. FAILING CLOSED ON DATES IS NOT THE SAME AS FAILING THE ORDER. If D1 is
//     unreachable the window is not written — but the order still is, and the
//     confirmation says we will come back with the dates. Losing a client's
//     order to protect a calendar would be the wrong thing to protect.
// ─────────────────────────────────────────────────────────────────────────────

import { aftercare, turnaround, tierRow, shouldPromptUpgrade, upgradePrompt } from '../../src/data/pricing.js';
import {
  ATTENDED_PER_WINDOW,
  HORIZON_DAYS,
  addDays,
  bookedFromRows,
  clearedWindows,
} from '../../src/data/capacity.js';
import { isWellFormedBatch, listBatch } from '../../src/lib/uploads.js';

const ORDER_SERVICES = new Set(['catalog', 'lifestyle', 'video', 'custom', 'test-sample', 'drop']);

// Fields we lift into their own columns; everything else goes to details_json.
//
// `source` was always read into a column and was ALSO landing in details_json,
// which is the same duplication the section-10 fields would have caused. It is
// listed here now for the same reason they are.
const TOP_FIELDS = [
  'service', 'redirect', 'lang', 'name', 'brand', 'company', 'email', 'phone', 'vat', 'website',
  'company_hp', 'source',
  // ── section 10 · the pipeline's own fields ──
  'tier', 'products', 'window_start', 'window_end', 'upload_batch', 'mode',
];

export async function onRequestPost({ request, env, waitUntil }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return redirect('/thank-you');
  }

  // A multipart field is either a string or a File, and toString() on a File
  // gives the literal "[object File]" — a value that would then be stored,
  // emailed and compared as if the client had typed it. The details loop below
  // guards the same way. Behaviour is unchanged for a string or a missing key.
  const get = (k) => { const v = form.get(k); return typeof v === 'string' ? v.trim() : ''; };

  const service = get('service') || 'catalog';
  const lang = get('lang') === 'nl' ? 'nl' : 'en';
  const back = safeRedirect(get('redirect'), lang);

  // The pipeline posts with fetch and wants an answer it can act on — "that
  // window has gone, here are the ones that are left" is useless as a 303 to a
  // thank-you page. Every other form on the site posts without JS and keeps the
  // redirect. One endpoint, two response shapes, chosen by the caller.
  const wantsJson = get('mode') === 'json';

  // Honeypot: a hidden field real users never see. Bots fill it. Pretend success.
  if (get('company_hp')) return wantsJson ? json({ ok: true, redirect: back }) : redirect(back);

  const email = get('email');
  if (!isEmail(email)) {
    if (wantsJson) return json({ ok: false, error: 'email' }, 400);
    // JS validation normally blocks this; for JS-off users, bounce back to the
    // form they came from (same-origin Referer), not the thank-you page.
    let dest = back;
    try {
      const ref = request.headers.get('Referer');
      if (ref) {
        const u = new URL(ref);
        if (u.origin === new URL(request.url).origin) dest = u.pathname + u.search;
      }
    } catch {}
    return redirect(dest + (dest.includes('?') ? '&' : '?') + 'error=email');
  }
  const name = get('name');
  const brand = get('brand') || get('company');
  const phone = get('phone');
  const vat = get('vat');
  const website = get('website');

  // Everything not lifted to a column becomes the order detail record.
  const details = {};
  for (const [k, v] of form.entries()) {
    if (TOP_FIELDS.includes(k)) continue;
    // A FILE IS NOT AN ANSWER. Every order form carries <input type="file">, and
    // a browser submits an entry for it whether or not anything was picked. The
    // old line here was `(v || '').toString()`, which on a File yields the
    // literal string "[object File]" — so every order ever placed stored
    // photos:"[object File]" in details_json and printed it in the studio's
    // notification email. Files are handled by /api/upload and land in the files
    // table further down; they have no business in this record at all.
    if (typeof v !== 'string') continue;
    if (v) details[k] = v;
  }

  // ---- subscribe (lead magnet) --------------------------------------------
  if (service === 'subscribe') {
    await safe(() => env.DB && env.DB
      .prepare('INSERT INTO subscribers (email, source) VALUES (?1, ?2) ON CONFLICT(email) DO NOTHING')
      .bind(email, get('subscribe') || 'lead-magnet').run());
    await safe(() => sendMail(env, {
      to: email,
      subject: lang === 'nl' ? 'Je briefing-foto checklist' : 'Your briefing-photo checklist',
      html: subscriberEmail(lang),
    }));
    await safe(() => sendMail(env, {
      to: env.NOTIFY_EMAIL || 'hello@visuails.com',
      subject: `Checklist signup — ${email}`,
      html: `<p>New checklist signup:</p><p><strong>${esc(email)}</strong></p>`,
    }));
    const okUrl = back + (back.includes('?') ? '&' : '?') + 'ok=1';
    return wantsJson ? json({ ok: true, redirect: okUrl }) : redirect(okUrl);
  }

  // ---- contact -------------------------------------------------------------
  if (service === 'contact') {
    const body = details.message || details.notes || '';
    let customerId = null;
    await safe(async () => { customerId = await upsertCustomer(env, { email, name, brand, phone, website, vat }); });
    await safe(() => env.DB && env.DB
      .prepare('INSERT INTO messages (customer_id, email, name, subject, body) VALUES (?1,?2,?3,?4,?5)')
      .bind(customerId, email, name || null, get('subject') || 'Contact form', body || null).run());
    await safe(() => sendMail(env, {
      to: env.NOTIFY_EMAIL || 'hello@visuails.com',
      subject: `Contact — ${name || email}`,
      html: `<p>Contact message from <strong>${esc(name || email)}</strong> (${esc(email)}):</p><p>${esc(body).replace(/\n/g, '<br>')}</p>`,
    }));
    const okUrl = back + (back.includes('?') ? '&' : '?') + 'ok=1';
    return wantsJson ? json({ ok: true, redirect: okUrl }) : redirect(okUrl);
  }

  // ---- order ---------------------------------------------------------------
  const svc = ORDER_SERVICES.has(service) ? service : 'catalog';
  const ref = makeRef();

  // 'attended' on an exact match and on nothing else. Every form that predates
  // the pipeline sends no tier at all and is Tier 0, which is also the D1
  // default — so a typo, an empty string or a bot's guess all land on the tier
  // that reserves nothing, which is the direction a mistake should fall.
  const tier = get('tier') === 'attended' ? 'attended' : 'unattended';
  const products = countOf(get('products'));

  // Staged reference material, if the client uploaded any. Read before the
  // insert so the count can go into details_json with everything else; the rows
  // themselves cannot exist until the order does (files.order_id is NOT NULL).
  const batch = get('upload_batch');
  const staged = isWellFormedBatch(batch) ? await listBatch(env, batch) : [];
  if (staged.length) {
    details.uploads = String(staged.length);
    details.upload_batch = batch;
  }

  // THE GATE, AGAIN, AGAINST LIVE ROWS. See note 1 at the top of this file.
  const asked = { start: get('window_start'), end: get('window_end') };
  const gate = await clearRequestedWindow(env, { tier, products, asked });

  // The window the client chose filled while they were filling in the form. In
  // the pipeline this is recoverable and worth recovering: their answers are
  // still on screen, so hand back the windows that ARE clear and let them pick
  // again rather than booking them onto nothing and emailing an apology. No
  // order row is written, so a second submit is a first order.
  //
  // Without JS there is nowhere to hand it back TO, so that path falls through
  // and creates the order undated — the confirmation then says we will come
  // back with the dates, which is true and is the same thing a human would say.
  if (wantsJson && gate.reason === 'gone') {
    return json({ ok: false, error: 'window-gone', windows: gate.windows, reason: gate.listReason }, 409);
  }

  let customerId = null;
  await safe(async () => { customerId = await upsertCustomer(env, { email, name, brand, phone, website, vat }); });

  // `lang` is stored, not just used. This request is the last moment the client's
  // language is known for free — every later message (the portal, the delivery
  // mail, an aftercare check-in) arrives with no form attached and would have to
  // guess.
  //
  // window_start being non-null IS the reservation, and gate.window is the only
  // value that ever reaches it. Nothing else in this function may assign it.
  await safe(() => env.DB && env.DB
    .prepare(`INSERT INTO orders (ref, customer_id, service, name, brand, email, phone, vat_number, details_json, source, lang,
                                  tier, product_count, window_start, window_end)
              VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`)
    .bind(ref, customerId, svc, name || null, brand || null, email, phone || null, vat || null,
          JSON.stringify(details), get('source') || null, lang,
          tier, products, gate.window?.start || null, gate.window?.end || null).run());

  let orderId = null;
  await safe(async () => {
    const row = await env.DB?.prepare('SELECT id FROM orders WHERE ref = ?1').bind(ref).first();
    orderId = row?.id ?? null;
  });

  // TWO PEOPLE, ONE LAST WINDOW, THE SAME INSTANT. Both passed the gate above,
  // because both read the calendar before either had written to it. Resolving it
  // here — after the write, when the rows exist — is what makes the outcome a
  // fact rather than a guess. See loseRaceIfOversold for why the lower id wins.
  let raced = false;
  if (gate.window && orderId) {
    raced = await loseRaceIfOversold(env, { orderId, products, window: gate.window });
  }
  const finalWindow = raced ? null : gate.window;

  // SECTION 13 · THE UPGRADE PATH. Only ever on a Tier 0 order — a brand that
  // has just booked a drop does not need to be told what a drop costs, and
  // asking would burn their once-a-quarter slot to say nothing. The claim runs
  // after the insert so the order in hand is part of the count it reports.
  const upgradeCount = tier === 'unattended' ? await claimUpgradePrompt(env, customerId) : null;
  const upgradeLine = upgradeCount ? upgradePrompt(upgradeCount, lang) : null;

  await safe(async () => {
    if (!orderId || !env.DB) return;
    await env.DB.prepare('INSERT INTO order_events (order_id, status, note) VALUES (?1, ?2, ?3)')
      .bind(orderId, 'received', eventNote({
        tier, window: finalWindow, raced, uploads: staged.length, upgrade: upgradeCount,
      })).run();
  });

  // The staged objects become rows now that there is an order to hang them on.
  // They keep the key they were uploaded under; nothing is copied or moved,
  // because a 25 MB copy per photograph to make a prefix prettier is a cost the
  // client pays in latency for no benefit at all.
  if (orderId && staged.length) await safe(() => attachUploads(env, orderId, staged));

  await safe(() => sendMail(env, {
    to: env.NOTIFY_EMAIL || 'hello@visuails.com',
    subject: `${raced ? '[WINDOW LOST] ' : ''}New ${svc} order — ${ref}`,
    html: notifyEmail(ref, svc, { name, brand, email, phone, vat, website }, details, {
      tier, products, window: finalWindow, raced, asked, uploads: staged.length,
      upgrade: upgradeCount,
    }),
  }));
  await safe(() => sendMail(env, {
    to: email,
    subject: lang === 'nl' ? `We hebben je aanvraag — ${ref}` : `We've got your request — ${ref}`,
    html: customerEmail(lang, ref, svc, name, { tier, window: finalWindow, upgrade: upgradeLine }),
  }));

  const done = back + (back.includes('?') ? '&' : '?') + 'ref=' + encodeURIComponent(ref);
  if (wantsJson) {
    return json({
      ok: true,
      ref,
      tier,
      window: finalWindow,
      // The client screen has to say something different when this is true, and
      // it must not be inferred from `window: null` — an attended order that
      // never asked for a date looks identical from the outside.
      windowLost: raced,
      redirect: done,
    });
  }
  return redirect(done);
}

// GET on this route → send people to the order hub rather than a blank 405.
// Points at /start, not /order: section 10 retires /order and its four siblings,
// and a redirect into a redirect is a loop.
export function onRequestGet() {
  return redirect('/start');
}

// ---------- the capacity gate, server side -----------------------------------

/**
 * Is the window this request asked for still clear, right now?
 *
 * Returns { window, reason, windows, listReason }:
 *   • window     the range that may be written to orders, or null. NEVER a range
 *                clearedWindows() did not just return.
 *   • reason     'queue' Tier 0, which has no window by definition
 *                'none'  nothing was asked for
 *                'ok'    asked for, and still clear
 *                'gone'  asked for, and no longer clear
 *                'unavailable' the calendar could not be read
 *   • windows    what IS clear, so a caller can offer them instead
 *
 * FAILING CLOSED ON DATES. If D1 cannot be read this returns no window. That is
 * the one place in this file that refuses rather than degrades, and it is the
 * same choice /api/capacity makes for the same reason: a date invented while the
 * calendar is unreadable is exactly the promise the gate exists to prevent. The
 * order itself is unaffected — see note 3 at the top.
 */
async function clearRequestedWindow(env, { tier, products, asked }) {
  const empty = { window: null, windows: [], listReason: null };
  if (tier !== 'attended') return { ...empty, reason: 'queue' };
  if (!asked?.start) return { ...empty, reason: 'none' };
  if (!env?.DB) return { ...empty, reason: 'unavailable' };
  // A count the gate cannot use costs no database read. Both verdicts about the
  // count alone are reached before clearedWindows looks at a calendar, so asking
  // it with none — `limit: 0` yields no windows and does no window work — is the
  // exact classification rather than an approximation of it.
  //
  // The classification is DELEGATED, never repeated. Re-deriving it here is what
  // flattened 'too-large' into 'invalid', which capacity.js's own docstring
  // forbids: the caller "must not flatten them into one 'sorry'". A count larger
  // than one window and a count that is not a number are different facts and
  // /start has a different panel for each. Only the "is this worth the I/O"
  // decision is local; if the classification ever moves, this follows it.
  const early = clearedWindows({ today: todayUTC(), products, limit: 0 }).reason;
  if (early === 'invalid' || early === 'too-large') {
    return { ...empty, reason: 'gone', listReason: early };
  }

  try {
    const today = todayUTC();
    const { blackouts, booked } = await readCalendar(env, today);

    // A wider limit than the six /api/capacity offers. The client can only have
    // chosen from those six, and windows never appear EARLIER than one already
    // offered — time does not run backwards — so six would in fact be enough.
    // Twelve costs one more loop iteration and removes that argument from the
    // list of things this correctness depends on.
    const { windows, reason } = clearedWindows({ today, products, booked, blackouts, limit: 12 });

    const match = windows.find(
      (w) => w.start === asked.start && (!asked.end || w.end === asked.end)
    );
    if (!match) return { window: null, windows, reason: 'gone', listReason: reason };

    // The stored pair is the gate's own answer, not the client's echo of it.
    return { window: { start: match.start, end: match.end }, windows, reason: 'ok', listReason: reason };
  } catch {
    return { ...empty, reason: 'unavailable' };
  }
}

/**
 * The calendar the gate reads. Mirrors readCalendar in functions/api/capacity.js
 * deliberately and exactly — same filters, same horizon — because a booking that
 * measured capacity differently from the page that offered it would clear
 * windows the page had already sold.
 *
 * `beforeId`, when set, counts only orders written before this one. That is the
 * race resolution and nothing else; see loseRaceIfOversold.
 */
async function readCalendar(env, today, beforeId = null) {
  const horizonEnd = addDays(today, HORIZON_DAYS + 14);
  const orderSql =
    `SELECT window_start, window_end, product_count
       FROM orders
      WHERE tier = 'attended'
        AND window_start IS NOT NULL
        AND status <> 'cancelled'
        AND COALESCE(window_end, window_start) >= ?1` + (beforeId ? ' AND id < ?2' : '');

  const orderStmt = beforeId
    ? env.DB.prepare(orderSql).bind(today, beforeId)
    : env.DB.prepare(orderSql).bind(today);

  const [blackoutRows, orderRows] = await Promise.all([
    env.DB.prepare('SELECT day FROM blackout_days WHERE day >= ?1 AND day <= ?2').bind(today, horizonEnd).all(),
    orderStmt.all(),
  ]);

  const blackouts = new Set((blackoutRows.results || []).map((r) => r.day));
  return { blackouts, booked: bookedFromRows(orderRows.results || [], blackouts) };
}

/**
 * Did this order lose a race for the window it just wrote? If so, give it back.
 *
 * WHY LOWER ID WINS, AND WHY THAT IS THE WHOLE DESIGN
 * Two orders can both pass the gate and both write the same window: each read
 * the calendar before either had written to it. Detecting that afterwards is
 * easy; deciding WHICH one backs off is the part that has to be got right,
 * because the obvious implementations are all wrong in the same way. "Back off
 * if the window is oversold" makes both back off, and the window is now free and
 * nobody has it. "Back off if someone else is in it" is the same bug wearing a
 * different sentence.
 *
 * So the rule is a total order that every racer computes identically: measure
 * yourself against the orders written BEFORE you, and only those. The earlier
 * order sees a calendar without the later one and keeps its window. The later
 * order sees the earlier one and finds it no longer fits. Exactly one survives,
 * both agree on which, and neither needs a lock or a transaction to know it.
 *
 * The test is windowFits' own test — clearedWindows against a calendar that
 * excludes this order — and not a cheaper sum against ATTENDED_PER_WINDOW,
 * because capacity is per-day and a window's days are shared with its
 * neighbours' days. Re-asking the gate is the only check that cannot drift from
 * what the gate would have said.
 *
 * Returns true if the window was surrendered.
 */
async function loseRaceIfOversold(env, { orderId, products, window }) {
  if (!env?.DB || !orderId || !window?.start) return false;
  try {
    const today = todayUTC();
    const { blackouts, booked } = await readCalendar(env, today, orderId);
    const { windows } = clearedWindows({ today, products, booked, blackouts, limit: 12 });
    if (windows.some((w) => w.start === window.start && w.end === window.end)) return false;

    await env.DB.prepare('UPDATE orders SET window_start = NULL, window_end = NULL WHERE id = ?1')
      .bind(orderId).run();
    return true;
  } catch {
    // A failure here leaves the window written. That is the right way round: the
    // check is a correction to a rare double-book, and dropping a client's
    // reserved date because a follow-up query timed out would be a far more
    // common and far worse outcome than the double-book it is guarding.
    return false;
  }
}

/** The day the gate treats as today. UTC, matching every date in capacity.js. */
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- section 13 · the upgrade path -------------------------------------

/**
 * Has this brand ordered enough individual products this quarter to be told what
 * a Full Drop costs — and is this the first time they would be told this
 * quarter? Returns the product count to name in the line, or null for "say
 * nothing".
 *
 * Section 13: "Track per-brand per-product order volume in D1. When a brand
 * crosses 12 individual products in a rolling quarter, surface a one-line prompt
 * in their confirmation [...] Factual, no pressure, once per quarter maximum."
 * And, on why the tier earns its place at all: "Tier 0's job is not revenue. It
 * is portfolio material, catching brands before they grow, and filling gaps
 * between committed drops."
 *
 * THE VOLUME IS SUMMED, NOT COUNTED, and there is no counter column. The orders
 * table already holds every fact the sum needs; a stored total is a second
 * source of truth that goes wrong the first time an order is cancelled by hand,
 * and it would go wrong silently, in the direction of nagging a client who has
 * spent less than the number claims. One read on idx_orders_customer is cheaper
 * than being wrong about that.
 *
 * A NULL product_count CONTRIBUTES NOTHING, which is the right direction to be
 * wrong in. countOf() deliberately refuses to guess at "More than 10", so some
 * genuine Tier 0 orders carry no count — those brands reach the threshold later
 * than their real volume, or not at all. Under-prompting is a missed
 * conversation; over-prompting is a sentence with a number in it the client
 * knows is wrong.
 *
 * ONCE PER QUARTER IS ENFORCED BY THE WRITE, NOT BY THE READ. The UPDATE is a
 * compare-and-set — it touches the row only if the last prompt is older than a
 * quarter, and `changes` says whether we were the ones who claimed it. Two
 * orders arriving in the same second therefore cannot both print the line, with
 * no lock and no transaction. Same shape, and the same reason, as
 * loseRaceIfOversold above: make the outcome a fact rather than a guess.
 *
 * THE SLOT IS CLAIMED BEFORE THE EMAIL IS SENT, deliberately. If the send then
 * fails the brand does not see the prompt this quarter — which is what happened
 * every quarter before this existed, so it costs nothing anyone had. Claiming
 * afterwards would risk printing it twice, and "once per quarter maximum" is the
 * constraint section 13 actually wrote down.
 *
 * A FAILURE HERE IS SILENT AND THE ORDER IS UNAFFECTED. This is a marketing
 * line; nothing about it is worth risking a confirmation email over.
 */
async function claimUpgradePrompt(env, customerId) {
  if (!env?.DB || !customerId) return null;
  try {
    // test-sample is excluded on purpose: it is one per business, charged
    // upfront, and explicitly a trial rather than volume. It sends no count
    // today, so this changes nothing today — it is here so that the day that
    // form gains a quantity, a free trial does not start pushing brands over a
    // threshold about what they have bought.
    const row = await env.DB.prepare(
      `SELECT COALESCE(SUM(product_count), 0) AS n
         FROM orders
        WHERE customer_id = ?1
          AND tier = 'unattended'
          AND service <> 'test-sample'
          AND status <> 'cancelled'
          AND created_at >= datetime('now', '-3 months')`
    ).bind(customerId).first();

    const products = Number(row?.n) || 0;
    // The threshold lives in pricing.js with the arithmetic it belongs to, so
    // this file never has a number in it that could disagree with the sentence.
    if (!shouldPromptUpgrade(products)) return null;

    const claimed = await env.DB.prepare(
      `UPDATE customers
          SET upgrade_prompt_at = datetime('now')
        WHERE id = ?1
          AND (upgrade_prompt_at IS NULL
               OR upgrade_prompt_at < datetime('now', '-3 months'))`
    ).bind(customerId).run();

    return claimed?.meta?.changes ? products : null;
  } catch {
    return null;
  }
}

/**
 * A product count, or null.
 *
 * Deliberately strict about what a number is, and deliberately quiet when it is
 * not one. The pipeline sends an integer; the older forms send a <select> whose
 * last option is "More than 10", which is not a count and must not be guessed at
 * — an invented count is capacity the gate would then reserve against.
 */
function countOf(raw) {
  const n = Number.parseInt(String(raw || '').trim(), 10);
  return Number.isInteger(n) && n > 0 && n <= 999 ? n : null;
}

// ---------- uploads ----------------------------------------------------------

/**
 * Turn a staged batch into files rows.
 *
 * kind='upload' matters: the portal's serveFile filters on kind='delivery', so
 * a client's own reference photographs are recorded against the order and are
 * not re-served from it. They are input, not output.
 */
async function attachUploads(env, orderId, staged) {
  if (!env?.DB || !staged.length) return;
  const sql = `INSERT INTO files (order_id, kind, r2_key, filename, bytes) VALUES (?1, 'upload', ?2, ?3, ?4)`;
  const rows = staged.map((f) => [orderId, f.key, f.name || null, f.bytes || null]);

  if (typeof env.DB.batch === 'function') {
    const stmt = env.DB.prepare(sql);
    await env.DB.batch(rows.map((r) => stmt.bind(...r)));
    return;
  }
  for (const r of rows) await env.DB.prepare(sql).bind(...r).run();
}

// ---------- helpers ----------------------------------------------------------

async function upsertCustomer(env, c) {
  if (!env.DB) return null;
  await env.DB.prepare(
    `INSERT INTO customers (email, name, brand, phone, website, vat_number)
     VALUES (?1,?2,?3,?4,?5,?6)
     ON CONFLICT(email) DO UPDATE SET
       name=COALESCE(excluded.name, customers.name),
       brand=COALESCE(excluded.brand, customers.brand),
       phone=COALESCE(excluded.phone, customers.phone),
       website=COALESCE(excluded.website, customers.website),
       vat_number=COALESCE(excluded.vat_number, customers.vat_number),
       updated_at=datetime('now')`
  ).bind(c.email, c.name || null, c.brand || null, c.phone || null, c.website || null, c.vat || null).run();
  const row = await env.DB.prepare('SELECT id FROM customers WHERE email = ?1').bind(c.email).first();
  return row?.id ?? null;
}

async function sendMail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return;                 // not configured yet → skip quietly
  const from = env.FROM_EMAIL || 'VISUAILS <orders@visuails.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, reply_to: 'hello@visuails.com' }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function safe(fn) { try { return await fn(); } catch (e) { console.error('[order]', e && e.message ? e.message : e); } }

function makeRef() {
  const t = Date.now().toString(36).toUpperCase().slice(-4);
  const r = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `VIS-${t}-${r}`;
}

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

function redirect(location, status = 303) { return new Response(null, { status, headers: { Location: location } }); }

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

// Only allow same-site thank-you targets, and match the language.
function safeRedirect(raw, lang) {
  if (raw && raw.startsWith('/') && !raw.startsWith('//') && raw.includes('thank-you')) return raw;
  return lang === 'nl' ? '/nl/thank-you' : '/thank-you';
}

function esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }

function detailRows(obj) {
  return Object.entries(obj).map(([k, v]) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#8a8aa0">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`
  ).join('');
}

/**
 * What went into order_events. Short, and true about what was actually reserved.
 *
 * `upgrade` is the product count claimPromptUpgrade() decided to name, or null.
 * It is recorded because customers.upgrade_prompt_at only remembers WHEN the
 * quarter was claimed, never at what volume, and "why did this brand get the
 * line at 12 when the next got it at 19" is the first question anyone asks of a
 * prompt that fired. The event log is the only place that answer can live.
 */
function eventNote({ tier, window, raced, uploads, upgrade }) {
  const bits = [`Order submitted via website (${tier})`];
  if (window) bits.push(`window ${window.start}→${window.end}`);
  else if (tier === 'attended') bits.push(raced ? 'window lost to a concurrent booking' : 'no window reserved');
  if (uploads) bits.push(`${uploads} file${uploads === 1 ? '' : 's'} uploaded`);
  if (upgrade) bits.push(`upgrade prompt shown (${upgrade} products this quarter)`);
  return bits.join(' · ');
}

/**
 * The studio's copy. This one is allowed to say things the client's must not —
 * what was asked for versus what was cleared, and loudly when those differ.
 */
function notifyEmail(ref, service, top, details, gate = {}) {
  const rows = detailRows({ ...top, ...details });
  const { tier, products, window, raced, asked, uploads, upgrade } = gate;

  const banner = raced
    ? `<p style="margin:0 0 16px;padding:12px;background:#844B00;color:#fff;font-size:14px">
         <strong>Window lost.</strong> This order asked for
         ${esc(asked?.start || '?')}&nbsp;→&nbsp;${esc(asked?.end || '?')} and passed the gate, but a
         concurrent booking took it first, so no date is reserved. The client has been told we will
         come back with the dates. <strong>Call them.</strong>
       </p>`
    : '';

  const reserved = window
    ? `<p style="margin:0 0 16px">Window reserved: <strong>${esc(window.start)} → ${esc(window.end)}</strong></p>`
    : tier === 'attended'
      ? `<p style="margin:0 0 16px;color:#844B00">Attended order with <strong>no reserved window</strong>.</p>`
      : `<p style="margin:0 0 16px;color:#666">Standard queue — no window, by design.</p>`;

  // SECTION 13 · the upgrade path, from the studio's side. Deliberately its own
  // line rather than a fact buried in `meta`: a brand that has put 12+ products
  // through the queue in a quarter is the exact brand section 13 built Tier 0 to
  // catch — "catching brands before they grow" — and that is a conversation, not
  // a statistic. It is also the only notice that the client's once-a-quarter
  // slot has now been spent, so a second nudge this quarter has to be a human one.
  //
  // NOT styled as an alert. The raced banner above is an emergency and looks like
  // one; this is an opportunity, and dressing it the same way would train the eye
  // to skip both.
  const upgradeNote = upgrade
    ? `<p style="margin:0 0 16px;padding:10px 12px;background:#f4f4f8;color:#333;font-size:14px">
         <strong>Upgrade prompt sent.</strong> ${esc(upgrade)} individual products in the last
         rolling quarter, so the confirmation names what a Full Drop covers. Their once-a-quarter
         slot is now spent — anything further this quarter is a conversation, not an automation.
       </p>`
    : '';

  const meta = [
    tier ? `tier <strong>${esc(tier)}</strong>` : null,
    products ? `${esc(products)} products` : null,
    uploads ? `${esc(uploads)} uploaded file${uploads === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
    ${banner}
    <h2 style="margin:0 0 8px">New ${esc(service)} order</h2>
    <p style="margin:0 0 4px">Reference <strong>${esc(ref)}</strong></p>
    ${meta ? `<p style="margin:0 0 12px;color:#666;font-size:13px">${meta}</p>` : ''}
    ${reserved}
    ${upgradeNote}
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
  </div>`;
}

/**
 * The order confirmation.
 *
 * The timing paragraph is assembled from TIERS in src/data/pricing.js and is
 * never typed here. That is the whole point: this email said "within about 24
 * hours" for months after the site stopped saying it, because an email is the
 * one surface nobody greps.
 *
 * THE DATE RULE, IN THE PLACE IT MATTERS MOST. A window is named only when one
 * was actually reserved — `window` is written from orders.window_start /
 * window_end, which only ever hold a range clearedWindows() returned. An
 * attended order without a reserved window says so and names nothing. An
 * unattended order can never reach the date branch at all, because Tier 0 has a
 * queue span, not a date: "NO named delivery date — show 'typically 2-4 working
 * days,' never a date."
 *
 * `upgrade` is section 13's upgrade prompt — one already-composed sentence, or
 * null. This function does not decide whether to send it, what it says, or which
 * language it is in; upgradePrompt() in pricing.js owns all three, and
 * claimUpgradePrompt() owns whether the quarter was free. All that happens here
 * is placement, which is the one thing the copy cannot carry itself.
 */
function customerEmail(lang, ref, service, name, { tier = 'unattended', window = null, upgrade = null } = {}) {
  const nl = lang === 'nl';
  const hi = name ? `Hi ${esc(name)},` : 'Hi,';
  const attended = tier === 'attended';
  const dated = attended && window && window.start && window.end;

  const received = nl
    ? `Bedankt — we hebben je ${esc(service)}-aanvraag ontvangen. Je referentie is <strong>${esc(ref)}</strong>.`
    : `Thanks — we've received your ${esc(service)} request. Your reference is <strong>${esc(ref)}</strong>.`;

  let timing;
  if (dated) {
    const from = formatDay(window.start, lang);
    const to = formatDay(window.end, lang);
    timing = nl
      ? `Je venster staat gereserveerd: ${esc(from)} tot en met ${esc(to)}.`
      : `Your window is reserved: ${esc(from)} to ${esc(to)}.`;
  } else if (attended) {
    timing = nl
      ? `${turnaround('attended', 'nl')}. We komen bij je terug met de exacte data — zolang die niet bevestigd zijn, noemen we er geen.`
      : `${turnaround('attended', 'en')}. We'll come back with the exact dates — until they're confirmed, we won't name one.`;
  } else {
    // THIS WAS TWO STRING LITERALS, and the docstring above already claimed it
    // was not. They happened to match TIERS.unattended byte-for-byte — verified
    // before the swap, in both languages — so this changes nothing a client
    // reads. It changes who owns the sentence. Every other timing branch in this
    // file already goes through pricing.js; this one being copy meant the tier's
    // only sanctioned timing language existed in two places, and the second one
    // was inside an email, which is precisely the surface the docstring above
    // names as "the one surface nobody greps".
    timing = `${tierRow('unattended', 'queue', lang)}. ${turnaround('unattended', lang)}.`;
  }

  const care = nl
    ? `Een mens controleert elke visual voordat hij bij je komt. ${aftercare(tier, 'nl')}.`
    : `A person checks every visual before it reaches you. ${aftercare(tier, 'en')}.`;

  // SECTION 13 · "Factual, no pressure, once per quarter maximum." The styling
  // IS the "no pressure" half, and it is the half a copy review cannot enforce:
  // the same true sentence set at body weight directly under the confirmation
  // reads as an upsell, and the client is right to read it that way. Below a rule,
  // smaller and muted, it reads as what it is — a note that the cheaper door
  // exists, placed where someone looking for it will find it and someone who only
  // wanted their order confirmed will not trip over it.
  //
  // AFTER `care`, not before. The last thing a confirmation should say is that a
  // person checks the work; a price comparison must not be allowed to take that
  // position.
  const upgradeNote = upgrade
    ? `<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid #e6e6ee;color:#555;font-size:13px">${esc(upgrade)}</p>`
    : '';

  return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
    <p>${hi}</p>
    <p>${received}</p>
    <p>${timing}</p>
    <p>${care}</p>
    ${upgradeNote}
    <p style="color:#666;font-size:13px">VISUAILS · Enschede, NL · hello@visuails.com</p>
  </div>`;
}

/** A reserved date, written the way a person reads one. UTC, to match the gate. */
function formatDay(iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'nl' ? 'nl-NL' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}

function subscriberEmail(lang) {
  const url = 'https://visuails.com' + (lang === 'nl' ? '/nl/upload-guidelines' : '/upload-guidelines');
  if (lang === 'nl') {
    return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
      <p>Hi,</p>
      <p>Hier is de briefing-foto checklist — de vier hoeken, het licht en de achtergrond die een telefoonfoto tot een campagne maken:</p>
      <p><a href="${url}">Bekijk de checklist →</a></p>
      <p style="color:#666;font-size:13px">VISUAILS · Enschede, NL</p>
    </div>`;
  }
  return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
    <p>Hi,</p>
    <p>Here's the briefing-photo checklist — the four angles, lighting and background that turn a phone photo into a campaign:</p>
    <p><a href="${url}">Read the checklist →</a></p>
    <p style="color:#666;font-size:13px">VISUAILS · Enschede, NL</p>
  </div>`;
}
