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
import {
  ORDER_QUESTIONS, isProductQuestionId, productQuestion,
} from '../../src/data/attributes.js';
import { isWellFormedBatch, listBatch } from '../../src/lib/uploads.js';
import { mintToken, hashToken, portalUrl } from '../../src/lib/token.js';
import { sendMail } from '../../src/lib/mail.js';
import { createTestSampleMolliePayment, createOrderMolliePayment } from '../../src/lib/mollie.js';
import { quoteOrder, centsToMollieValue, paymentDescription, PAYABLE_SERVICES } from '../../src/lib/quote.js';

const ORDER_SERVICES = new Set(['catalog', 'lifestyle', 'video', 'custom', 'test-sample', 'drop']);

// ─────────────────────────────────────────────────────────────────────────────
// HOW MUCH OF THE CLIENT'S UPLOAD RIDES ALONG IN THE STUDIO'S EMAIL
//
// The count was not enough. "3 uploaded files" told the studio that something
// arrived and nothing about what, so the only way to SEE a client's reference
// photographs was the R2 dashboard with a batch prefix typed in by hand. The
// photographs now travel with the notice.
//
// Not all of them, and that is deliberate. A batch may legally hold 80 files of
// 25 MB — two gigabytes — and Resend refuses a message over 40 MB outright, so
// an unbounded attach would turn a large order into NO notification at all.
// That is strictly worse than the count it replaces. So: a hard budget, the
// files that fit are attached, and EVERY file is listed by name, size and key
// whether it was attached or not. The email is never the only copy; R2 is.
//
// Base64 inflates by 4/3, so 8 MB of photographs is ~11 MB on the wire — well
// inside Resend's limit with room for a second thought later.
// ─────────────────────────────────────────────────────────────────────────────
const MAIL_ATTACH_MAX_BYTES = 8 * 1024 * 1024;
const MAIL_ATTACH_MAX_FILES = 10;

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
    const cleaned = vetAnswer(k, v);
    if (cleaned) details[k] = cleaned;
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

  const products = countOf(get('products'));

  // DERIVED, NOT POSTED. This used to read `get('tier') === 'attended'`, which
  // let the browser tell the server which service level the order gets. Under
  // the ladder that is no longer a choice a customer makes — it follows from
  // the product count (tierFor() in src/data/pricing.js, WINDOW_THRESHOLD) —
  // so a posted `tier` is at best redundant and at worst a crafted
  // `products=30&tier=unattended`, which would book a full order into the
  // queue that reserves nothing AND miscount it in the upgrade-prompt query
  // further down, which selects on tier.
  //
  // The form still posts `tier`; it is ignored here on purpose rather than
  // removed there, because a hidden field that vanishes from the markup is a
  // change a future editor can make by accident, and one that is read and
  // discarded is a change they have to make deliberately.
  //
  // Falls to 'unattended' whenever the count is unknown — the tier that
  // reserves nothing is the direction a mistake should fall.
  const tier = tierForProducts(products);

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
  // ── THE PRICE, WORKED OUT HERE AND NOWHERE ELSE ────────────────────────────
  // August 2026: catalog and lifestyle became payable, and `orders.total_cents`
  // finally has a writer. Everything about the amount is recomputed from the
  // ladder against the order's own fields — the service, the product count, and
  // the two paid add-ons counted out of the posted form. NOTHING here reads an
  // amount the browser sent, because pipeline.js's running total is a preview
  // and a preview a customer can edit is not a price. See src/lib/quote.js.
  //
  // The add-on counts are read off the SAME fields the uploader posts, so a
  // customer who asked for two extra photos on product 3 is charged for two
  // extra photos. Counting them here rather than trusting a summary field means
  // there is no total to tamper with, only per-product answers to add up.
  const outfitCount = countOf(get('outfit_count'));
  let extraCount = 0;
  for (const [k, v] of form.entries()) {
    if (typeof k === 'string' && k.startsWith('extra_') && !k.startsWith('extra_note_')) {
      extraCount += Math.max(0, Math.floor(Number(v) || 0));
    }
  }
  const quote = quoteOrder({ service: svc, products, outfits: outfitCount, extras: extraCount });

  // ── THE WITHDRAWAL WAIVER, RECORDED ────────────────────────────────────────
  // A customer with no VAT number is a consumer, and a consumer buying at a
  // distance has fourteen days to withdraw while this studio delivers in
  // forty-eight hours. Step 5 asks for the two statements the exception needs
  // (see src/data/consent.js); this is where the answer is written down.
  //
  // Stored as the VERSION ID, not as a boolean: the evidence is not that a box
  // was ticked, it is which sentence was above it. consent.js maps the id back
  // to the wording, and old ids are never edited.
  //
  // A missing tick is RECORDED, not rejected. The checkbox is `required`, so
  // this only happens on a hand-built POST — and refusing the order there would
  // break this file's standing rule about never losing an order to protect a
  // secondary step. Writing 'MISSING' puts it in front of the studio in the
  // notification email instead, which is the outcome that can actually be acted
  // on. It is never written as consent.
  details.withdrawal_consent = get('withdrawal_consent') === 'yes'
    ? (get('consent_version') || 'unversioned')
    : 'MISSING';

  await safe(() => env.DB && env.DB
    .prepare(`INSERT INTO orders (ref, customer_id, service, name, brand, email, phone, vat_number, details_json, source, lang,
                                  tier, product_count, window_start, window_end, total_cents)
              VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)`)
    .bind(ref, customerId, svc, name || null, brand || null, email, phone || null, vat || null,
          JSON.stringify(details), get('source') || null, lang,
          tier, products, gate.window?.start || null, gate.window?.end || null,
          quote ? quote.netCents : null).run());

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

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 10 · THE LINK THAT MAKES THE PORTAL REACHABLE.
  //
  // /o/<token> has been finished, rate-limited and tested since section 10, and
  // it had never once been reachable. Nothing in the shipping codebase wrote an
  // order_tokens row, so the table stayed permanently empty, every lookup
  // missed, portalUrl() had no callers, and no confirmation ever carried a
  // link. A portal nobody can open is the same thing as no portal.
  //
  // This is the only moment both halves exist at once: an order row to hang the
  // token on, and an address to send it to. The raw token lives in this scope
  // and in the client's inbox; what reaches the database is its SHA-256. See
  // src/lib/token.js — that asymmetry is the whole design, and it is why the
  // link cannot be re-derived later from the row. It goes out now or never.
  //
  // Wrapped in safe(), like every other side effect here. If the mint or the
  // insert fails, the client still gets a confirmation — without a link, which
  // is a worse email but is still an email. The order is what must survive.
  // ───────────────────────────────────────────────────────────────────────────
  let portalLink = null;
  if (orderId) {
    await safe(async () => {
      if (!env.DB) return;
      const token = mintToken();
      await env.DB.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?1, ?2)')
        .bind(orderId, await hashToken(token)).run();
      portalLink = portalUrl(token, requestOrigin(request));
    });
  }

  // The photographs themselves, not a count of them. Awaited rather than
  // deferred: the notice that an order exists is the one message in this
  // function that has no second delivery path, and a waitUntil that is dropped
  // by the runtime loses it silently. The cost is a bounded read from R2 in the
  // same network, and only on orders that actually carried files.
  const packed = staged.length ? await packAttachments(env, staged) : { attachments: [], keys: [] };

  await safe(async () => {
    const to = env.NOTIFY_EMAIL || 'hello@visuails.com';
    const subject = `${raced ? '[WINDOW LOST] ' : ''}New ${svc} order — ${ref}`;
    const body = (attached) => notifyEmail(ref, svc, { name, brand, email, phone, vat, website }, details, {
      tier, products, window: finalWindow, raced, asked, uploads: staged.length,
      upgrade: upgradeCount, files: staged, attached, portal: portalLink,
    });
    try {
      await sendMail(env, { to, subject, html: body(packed.keys), attachments: packed.attachments });
    } catch (e) {
      // A REFUSED ATTACHMENT MUST NOT COST THE NOTIFICATION. Resend can reject
      // the whole message for a reason that belongs to the files — total size,
      // a type it will not carry — and losing the order notice to save the
      // photographs is exactly backwards. Retry once, plain, with copy that
      // matches what actually went: the second body says nothing was attached,
      // because nothing was, and the keys are in the table either way.
      //
      // ONLY when something was actually attached. A message with no files that
      // Resend refused was refused for a reason the retry cannot change — the
      // service is down, the key is wrong — and sending it a second time is one
      // more failed request and, on the day Resend is merely slow rather than
      // broken, one duplicate in the studio's inbox. Rethrow instead and let
      // safe() log it, which is what every other unattached send here does.
      if (!packed.attachments.length) throw e;
      console.error('[order] notify with attachments refused, retrying plain —', e && e.message ? e.message : e);
      await sendMail(env, { to, subject, html: body([]) });
    }
  });
  // ── THE PAYMENT LINK ───────────────────────────────────────────────────────
  // Lucas's choice, August 2026: "betaallink na bevestiging". The order is
  // confirmed exactly as it was before — step 5 still says you are confirming
  // rather than paying, and that sentence stays true — and the link to pay
  // arrives in this same confirmation email.
  //
  // WHY NOT A REDIRECT TO CHECKOUT. That is what the test sample does, and it
  // suits a €0.99 impulse. A catalog order is €89 to several thousand, and
  // sending somebody who has just filled in five steps straight into a payment
  // wall is where they close the tab. It also keeps the capacity gate's promise
  // intact: the window is confirmed before you pay, which is what TIERS has
  // said all along.
  //
  // FAILING OPEN, like everything else in this file. If Mollie is unreachable
  // or the key is missing, the order still exists and the client still gets
  // their confirmation — without a link this once. Losing an order to protect a
  // checkout step is the mistake this file refuses to make everywhere else.
  // ── THE RESERVATION COUNTDOWN ──────────────────────────────────────────────
  // Lucas's choice: hold the window, but let it expire if nobody pays. Written
  // only when there is BOTH a window to lose and something to pay — an
  // unattended order has no reservation to release, and an order with no quote
  // has nothing to wait for. The webhook clears this the moment payment lands.
  //
  // Seven days, and the number lives here rather than in a sweep query for the
  // reason migration 0006 gives: a policy recomputed at read time is a policy
  // that lives in whichever query ran last.
  if (finalWindow && quote) {
    await safe(() => env.DB && env.DB
      .prepare(`UPDATE orders SET window_expires_at = datetime('now', '+7 days') WHERE ref = ?1`)
      .bind(ref).run());
  }

  let payUrl = null;
  if (quote && PAYABLE_SERVICES.has(svc) && env.MOLLIE_API_KEY) {
    const payment = await safe(() => createOrderMolliePayment(env, {
      ref,
      lang,
      valueEuros: centsToMollieValue(quote.grossCents),
      grossCents: quote.grossCents,
      description: paymentDescription(quote, lang),
      successUrl: requestOrigin(request) + back + (back.includes('?') ? '&' : '?') + 'paid=' + encodeURIComponent(ref),
      webhookUrl: requestOrigin(request) + '/api/webhook/mollie',
    }));
    payUrl = payment?._links?.checkout?.href || null;
  }

  await safe(() => sendMail(env, {
    to: email,
    subject: lang === 'nl' ? `We hebben je aanvraag — ${ref}` : `We've got your request — ${ref}`,
    html: customerEmail(lang, ref, svc, name,
      { tier, window: finalWindow, upgrade: upgradeLine, portal: portalLink, pay: payUrl, quote }),
  }));

  const done = back + (back.includes('?') ? '&' : '?') + 'ref=' + encodeURIComponent(ref);

  // ───────────────────────────────────────────────────────────────────────────
  // MOLLIE — TEST SAMPLE ONLY (see BACKEND-SETUP.md §9). The order row above
  // is already written with payment_status defaulting to whatever schema.sql
  // says; this branch sends the client to pay before they ever see the
  // thank-you page. Scoped deliberately to svc === 'test-sample': every other
  // service still has no server-side price to charge against, so they keep
  // going straight to the free-flow thank-you page below.
  //
  // This replaces an earlier Stripe integration: Checkout Session creation
  // from this Pages Function was coming back as a blank HTTP 400 specifically
  // when called from Cloudflare (never from Stripe's own CLI, never from a
  // local Node test) — a networking-layer failure between Cloudflare and
  // api.stripe.com that neither Stripe's nor Cloudflare's support had
  // resolved. See BACKEND-SETUP.md §9 for the history; src/lib/stripe.js is
  // left in place rather than deleted in case that gets resolved later.
  //
  // Failing OPEN, not closed: if Mollie or the env var is unavailable, the
  // order still exists and the client still gets a confirmation — they just
  // don't get a payment link this one time. Losing the order to protect the
  // checkout step would be exactly the mistake this file already refuses to
  // make everywhere else (see the file header).
  //
  // The webhook at the URL below now exists (functions/api/webhook/mollie.js)
  // and is what actually moves the order to paid. This branch still only sends
  // the customer to Mollie — reaching the checkout page is not paying, and the
  // redirect below fires whether they complete the payment or close the tab.
  // Nothing downstream should read "we redirected them" as "the order is
  // paid"; read orders.payment_status, which only the webhook writes.
  //
  // NOTE ON THE PATH: this used to say `/api/webhooks/mollie`, plural, while
  // the Stripe handler sat at `/api/webhook/stripe`, singular — two sibling
  // directories one letter apart, and the plural one had nothing in it. They
  // are one directory now. Nothing was live on the old path, so nothing broke;
  // if a test payment created before this change is still being retried by
  // Mollie it will 404 for its 26-hour window and then stop.
  // ───────────────────────────────────────────────────────────────────────────
  if (svc === 'test-sample' && env.MOLLIE_API_KEY) {
    // createTestSampleMolliePayment() resolves the whole Mollie payment
    // object ({ id, status, _links, ... }), not a URL string —
    // _links.checkout.href is what the browser actually needs to go to. Same
    // [object Object] trap as the Stripe version had if this were redirected
    // to directly instead of pulling the URL out first.
    const payment = await safe(() => createTestSampleMolliePayment(env, {
      ref,
      lang,
      successUrl: requestOrigin(request) + done,
      webhookUrl: requestOrigin(request) + '/api/webhook/mollie',
    }));
    const checkoutUrl = payment?._links?.checkout?.href;
    if (checkoutUrl) {
      if (wantsJson) {
        return json({ ok: true, ref, tier, window: finalWindow, windowLost: raced, redirect: checkoutUrl });
      }
      return redirect(checkoutUrl);
    }
  }

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

// ---------- the questions in src/data/attributes.js --------------------------

/**
 * The per-product questions post as `<question>_<product key>` — today that is
 * `material_p3` — beside the product name the uploader already posts as
 * `product_p3`. NO SCHEMA CHANGE IS NEEDED and none was made:
 * they are answers about the order, so they land in details_json with
 * everything else the customer typed, and `p3` is the key that joins them to
 * the files rows attachUploads() writes. The studio's email prints
 * details_json verbatim, so each answer arrives under its own product's key
 * with no code in the mail path at all. The single order-level question
 * (`audience`) is an ordinary field and needs nothing beyond the cap below.
 *
 * WHAT IS CHECKED, AND WHY ONLY THIS MUCH. details_json is a record of what a
 * customer told us, not an input to anything that executes, so the job here is
 * to stop it becoming a place to store arbitrary volume or an invented
 * vocabulary — not to argue with prose:
 *
 *   · LENGTH. Every text question declares a maxLength and the browser applies
 *     it; a posted field is not a browser, so it is applied again here. Cut
 *     rather than rejected: an over-long answer is a client with a long
 *     sentence, not an attack, and dropping their material entirely to punish
 *     the twenty-first word would be the wrong trade.
 *   · A CLOSED LIST STAYS CLOSED. No question is a <select> today, but the
 *     branch stays: attributes.js may declare one, and its ids would be read
 *     by the studio as an instruction, so anything outside its own option list
 *     is dropped rather than truncated. Half of a closed-list word is worse
 *     than none of it.
 *   · `material` is open text on purpose. attributes.js's `examples` are a
 *     datalist — suggestions, never a closed list — so a fabric nobody thought
 *     of has to survive this function.
 *
 * Anything that is not one of these keys is returned untouched, so every other
 * field on every other form behaves exactly as it did.
 */
const PRODUCT_ANSWER_KEY = /^([a-z]+)_(p[0-9]{1,3})$/;

function vetAnswer(key, value) {
  const orderQ = ORDER_QUESTIONS.find((x) => x.id === key);
  if (orderQ) return capAnswer(value, orderQ.maxLength);

  const m = PRODUCT_ANSWER_KEY.exec(key);
  if (!m || !isProductQuestionId(m[1])) return value;

  const q = productQuestion(m[1]);
  const v = String(value).trim();
  if (q.type === 'select') {
    return q.options.some((o) => o.id && o.id === v) ? v : '';
  }
  return capAnswer(v, q.maxLength);
}

function capAnswer(value, max) {
  const v = String(value).trim();
  return Number.isInteger(max) && max > 0 ? v.slice(0, max) : v;
}

// ---------- uploads ----------------------------------------------------------

/**
 * Turn a staged batch into files rows.
 *
 * kind='upload' matters: the portal's serveFile filters on kind='delivery', so
 * a client's own reference photographs are recorded against the order and are
 * not re-served from it. They are input, not output.
 *
 * WHERE THE PER-PRODUCT MAPPING LANDS, AUGUST 2026. product_key and shot come
 * off the R2 object's customMetadata by way of listBatch(), and this insert is
 * the only place they are written. They are deliberately NOT also folded into
 * details_json: the mapping is a fact about one file and this is the row that
 * already names that file, whereas details_json holds the ORDER's answers —
 * including 'product_p1', the name the customer typed for that card, which
 * arrives as an ordinary form field and needs no code here at all. One fact,
 * one home; the key 'p1' is what joins them.
 *
 * `|| null` rather than `|| ''` on both: listBatch returns '' for an object
 * nobody placed, and a column full of empty strings is a column that has to be
 * checked two ways forever.
 */
async function attachUploads(env, orderId, staged) {
  if (!env?.DB || !staged.length) return;
  const sql = `INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot)
               VALUES (?1, 'upload', ?2, ?3, ?4, ?5, ?6)`;
  const rows = staged.map((f) => [orderId, f.key, f.name || null, f.bytes || null, f.product || null, f.shot || null]);

  if (typeof env.DB.batch === 'function') {
    const stmt = env.DB.prepare(sql);
    await env.DB.batch(rows.map((r) => stmt.bind(...r)));
    return;
  }
  for (const r of rows) await env.DB.prepare(sql).bind(...r).run();
}

/**
 * The client's uploads, ready for Resend's attachments array, under a hard budget.
 *
 * Returns { attachments, keys } — `keys` is the r2_key of everything that
 * actually travelled, so the email can mark each row of its file table rather
 * than assume the first N fit. They are not always the first N: a 20 MB file is
 * stepped over and a 200 kB one after it still rides along, which is the right
 * use of a fixed budget and the wrong thing to describe with a count.
 *
 * Order is listBatch's order, oldest first — the four angles arrive in the
 * order they were shot, not sorted by size.
 *
 * Never throws, and never lets one unreadable object stop the rest. An R2
 * outage here costs the studio the pictures in that one email, not the notice
 * that there is an order at all; the objects and the files rows both survive it.
 */
async function packAttachments(env, staged) {
  const out = { attachments: [], keys: [] };
  if (!env?.UPLOADS || typeof env.UPLOADS.get !== 'function') return out;

  let budget = MAIL_ATTACH_MAX_BYTES;
  for (const f of staged) {
    if (out.attachments.length >= MAIL_ATTACH_MAX_FILES) break;
    if (!f || !f.key) continue;
    // Cheap rejection first, on the size R2 already told us, so a file that
    // cannot fit is never pulled across the network to find that out.
    if (Number(f.bytes) > budget) continue;

    const obj = await safe(() => env.UPLOADS.get(f.key));
    if (!obj || typeof obj.arrayBuffer !== 'function') continue;
    const buf = await safe(() => obj.arrayBuffer());
    // The measured length is the authority, not customMetadata and not the
    // listing: `bytes` can arrive as 0 from a bucket that did not report a size,
    // and a budget checked against 0 is not a budget.
    if (!buf || buf.byteLength > budget) continue;

    budget -= buf.byteLength;
    out.attachments.push({ filename: mailFilename(f.name, out.attachments.length), content: toBase64(buf) });
    out.keys.push(f.key);
  }
  return out;
}

/**
 * A filename an email client can be handed.
 *
 * The source is customMetadata.original, which is whatever the visitor's browser
 * put in the multipart part — client-controlled, so path separators, control
 * characters and quotes come off before it is written into a MIME header. The
 * tail is kept rather than the head, because the extension is the part a mail
 * client reads.
 */
function mailFilename(name, index) {
  const cleaned = String(name || '')
    .replace(/[/\\]/g, '-')
    .replace(/[\u0000-\u001f\u007f"']/g, '')
    .trim()
    .slice(-120);
  return cleaned || `upload-${index + 1}`;
}

/**
 * Bytes → base64, in chunks.
 *
 * String.fromCharCode(...bytes) on a 25 MB photograph is a stack overflow, not a
 * slow path — the spread becomes one call with 25 million arguments. 32 kB at a
 * time is well under every engine's argument limit and costs one concatenation
 * per chunk.
 */
function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

// ---------- helpers ----------------------------------------------------------

/**
 * The origin the request actually arrived on, for links read outside a browser.
 *
 * Not hardcoded: a preview deployment then mails preview links and a local
 * `wrangler pages dev` mails localhost ones, so the portal link is followable
 * from the environment that sent it. A link you cannot click in staging is a
 * link nobody tests until a client has it. Falls back to the canonical host,
 * which is what portalUrl() would have used on its own.
 */
function requestOrigin(request) {
  try { return new URL(request.url).origin; } catch { return 'https://visuails.com'; }
}

/** A file size a person reads at a glance. '' for nothing, so the cell stays empty. */
function fileSize(bytes) {
  const n = Number(bytes) || 0;
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} kB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The customer row behind an order. Created on a first order and topped up on
 * every one after — this is why /account has anything to show and why
 * /account/me has anything to prefill.
 *
 * WHOSE VALUE WINS, AND WHY IT DEPENDS ON details_saved_at (August 2026).
 *
 * The old rule was "the newest order wins": COALESCE(excluded.x, customers.x)
 * overwrites any field this order supplied and leaves alone any it did not.
 * That is still exactly what happens for a customer who has never saved their
 * details — the behaviour below is unchanged for them, and they are everyone
 * who existed before this column did.
 *
 * For a customer who HAS saved their details, it inverts: the saved value wins
 * and the order can only fill a blank. The reason is a specific, reachable bug
 * rather than a preference. /start now collapses its brief step for these
 * customers and offers an edit affordance labelled "change for this order" —
 * so a brand that ships one order to a different contact name would, under the
 * old rule, silently rewrite the standing default they explicitly asked us to
 * keep, and every later order would then be prefilled with the exception. A
 * setting a form can overwrite from the side is not a setting.
 *
 * Changing a saved detail for good is therefore one place only: POST
 * /account/details, behind the session cookie, from the dashboard or from the
 * end-of-order opt-in. See src/lib/account.js's handleDetails().
 */
async function upsertCustomer(env, c) {
  if (!env.DB) return null;
  await env.DB.prepare(
    `INSERT INTO customers (email, name, brand, phone, website, vat_number)
     VALUES (?1,?2,?3,?4,?5,?6)
     ON CONFLICT(email) DO UPDATE SET
       name=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.name, customers.name)
                 ELSE COALESCE(customers.name, excluded.name) END,
       brand=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.brand, customers.brand)
                 ELSE COALESCE(customers.brand, excluded.brand) END,
       phone=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.phone, customers.phone)
                 ELSE COALESCE(customers.phone, excluded.phone) END,
       website=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.website, customers.website)
                 ELSE COALESCE(customers.website, excluded.website) END,
       vat_number=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.vat_number, customers.vat_number)
                 ELSE COALESCE(customers.vat_number, excluded.vat_number) END,
       updated_at=datetime('now')`
  ).bind(c.email, c.name || null, c.brand || null, c.phone || null, c.website || null, c.vat || null).run();
  const row = await env.DB.prepare('SELECT id FROM customers WHERE email = ?1').bind(c.email).first();
  return row?.id ?? null;
}

// sendMail() moved to src/lib/mail.js on 2026-07-27 — see that file's header
// for why. Imported above, alongside token.js/uploads.js.

async function safe(fn) { try { return await fn(); } catch (e) { console.error('[order]', e && e.message ? e.message : e); } }

function makeRef() {
  const t = Date.now().toString(36).toUpperCase().slice(-4);
  const r = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `VIS-${t}-${r}`;
}

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

// The server's copy of pricing.js's tierFor(). NOT an import: this file runs as
// a Cloudflare Pages Function and pulling in the whole pricing module — with its
// build-time assertions and its bilingual copy tables — to read one threshold
// would be a lot of module for one comparison. The threshold is duplicated on
// purpose and named here so a grep for WINDOW_THRESHOLD finds both halves.
// pricing.js: export const WINDOW_THRESHOLD = 10.
const WINDOW_THRESHOLD = 10;
function tierForProducts(products) {
  const n = Number(products);
  return Number.isFinite(n) && Math.floor(n) >= WINDOW_THRESHOLD ? 'attended' : 'unattended';
}

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

// PALETTE, HAND-CARRIED. Every hex in the mail HTML below is a literal on
// purpose: a mail client cannot resolve a custom property, and half of them
// strip <style> too, so var(--warn-ink) in an inline style is a dead
// declaration and the text renders in whatever the client's default is. That
// makes this file a generated-asset dependency on global.css in the same way
// the logo raster and the shader's vec3 are — when a token moves, these move
// by hand or the studio mail keeps the old palette.
//
// The live set, and what each one is:
//   #8F4023  --warn-ink   the lost-window banner and the no-window line
//   #0F5F6F  --signal-ink "attached", the affirmative state in the file table
//   #8F8C87  muted label  keys in the detail table, "R2 only", the R2 key
// #666, #333 and #f4f4f8 elsewhere are generic mail greys with no token
// behind them and are deliberately left alone. #8F8C87 is NOT one of those:
// it used to be #8a8aa0, a grey-VIOLET tinted toward the old blue-black ink,
// which is now the one wrong temperature on the page. It was retinted to the
// warm ink hue at the same luminance (Y 0.261 -> 0.264), so nothing about its
// legibility changed — only which family it belongs to.
/**
 * What to call a product in the studio's email.
 *
 * The two halves of the mapping meet here and nowhere else: the file row knows
 * its product KEY ('p3', off customMetadata) and details_json knows what the
 * customer typed for that card ('product_p3'). Neither stores the other, so
 * this is a join, not a lookup of a duplicated value.
 *
 * Falls back to the bare key, then to an em dash. A photograph nobody placed is
 * a photograph nobody placed — it is listed, unlabelled, with everything else,
 * because it is still in the batch and still the client's material.
 */
function productLabel(key, details) {
  if (!key) return '—';
  const typed = details && typeof details[`product_${key}`] === 'string' ? details[`product_${key}`].trim() : '';
  return typed ? `${typed} (${key})` : key;
}

function detailRows(obj) {
  return Object.entries(obj).map(([k, v]) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#8F8C87">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`
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
  const { tier, products, window, raced, asked, uploads, upgrade, portal } = gate;
  const files = gate.files || [];
  const attached = gate.attached || [];

  const banner = raced
    ? `<p style="margin:0 0 16px;padding:12px;background:#8F4023;color:#fff;font-size:14px">
         <strong>Window lost.</strong> This order asked for
         ${esc(asked?.start || '?')}&nbsp;→&nbsp;${esc(asked?.end || '?')} and passed the gate, but a
         concurrent booking took it first, so no date is reserved. The client has been told we will
         come back with the dates. <strong>Call them.</strong>
       </p>`
    : '';

  const reserved = window
    ? `<p style="margin:0 0 16px">Window reserved: <strong>${esc(window.start)} → ${esc(window.end)}</strong></p>`
    : tier === 'attended'
      ? `<p style="margin:0 0 16px;color:#8F4023">Attended order with <strong>no reserved window</strong>.</p>`
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

  // THE LINK, ON THE STUDIO'S COPY TOO. Same URL the client got, and there is no
  // second copy of it anywhere: the database holds a hash, so if this email is
  // deleted the only way back into that order is to issue a new token. Worth
  // saying once, here, rather than discovering it the first time it matters.
  const portalNote = portal
    ? `<p style="margin:0 0 16px">
         <a href="${esc(portal)}">Open the client's order page →</a><br>
         <span style="color:#666;font-size:12px">
           The same link the client received, and the only copy — the database stores a hash of it.
         </span>
       </p>`
    : '';

  // WHAT THE CLIENT SENT, NOT HOW MANY THINGS THEY SENT.
  //
  // This was one clause in `meta` reading "3 uploaded files". The photographs
  // were in R2 and in the files table the whole time; the studio's only route to
  // them was the R2 dashboard with a batch prefix typed in by hand, which is not
  // a route, it is a scavenger hunt. Every file is named, sized and keyed here
  // whether or not it fit in the attachment budget, so the row is useful even
  // when the picture did not travel.
  const fileTable = files.length
    ? `<h3 style="margin:20px 0 6px;font-size:14px">Client uploads (${files.length})</h3>
       <p style="margin:0 0 8px;color:#666;font-size:12px">${
         attached.length
           ? `${esc(attached.length)} of ${esc(files.length)} attached to this email. The rest are in R2 under the keys below.`
           : 'Nothing attached — over the mail budget, or the bucket was unreachable. All of them are in R2 under the keys below.'
       }</p>
       <table style="border-collapse:collapse;font-size:13px">${
         files.map((f) => `<tr>
           <td style="padding:3px 12px 3px 0;color:${attached.includes(f.key) ? '#0F5F6F' : '#8F8C87'}">${
             attached.includes(f.key) ? 'attached' : 'R2 only'
           }</td>
           <td style="padding:3px 12px 3px 0;white-space:nowrap">${esc(productLabel(f.product, details))}</td>
           <td style="padding:3px 12px 3px 0;color:#666;white-space:nowrap">${esc(f.shot || '—')}</td>
           <td style="padding:3px 12px 3px 0"><strong>${esc(f.name || '—')}</strong></td>
           <td style="padding:3px 12px 3px 0;color:#666;white-space:nowrap">${esc(fileSize(f.bytes))}</td>
           <td style="padding:3px 0;color:#8F8C87;font-family:ui-monospace,Menlo,monospace;font-size:11px">${esc(f.key || '')}</td>
         </tr>`).join('')
       }</table>`
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
    ${portalNote}
    ${upgradeNote}
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
    ${fileTable}
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
function customerEmail(lang, ref, service, name,
  { tier = 'unattended', window = null, upgrade = null, portal = null, pay = null, quote = null } = {}) {
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

  // THE PORTAL LINK. After the timing and before the aftercare line, because it
  // answers the question the timing sentence just raised — so where do I watch
  // this happen — and because the last thing a confirmation should say is still
  // that a person checks the work.
  //
  // The warning under it is not boilerplate and is not legal cover. This URL is
  // the only thing between the order and the internet: there is no password to
  // add later, and a client who forwards it to a supplier has handed over the
  // gallery. They can only weigh that if we tell them, in the message that
  // carries the link, at the moment they first have it.
  //
  // The URL is printed as well as linked. Mail clients that strip anchors, and
  // people who read on a phone and continue on a desktop, both need the text.
  const portalNote = portal
    ? (nl
      ? `<p>Je order staat hier: <a href="${esc(portal)}">${esc(portal)}</a><br>
         <span style="color:#666;font-size:13px">Deze link is de sleutel tot je order — iedereen die hem heeft, kan meekijken. Houd hem binnen je team.</span></p>`
      : `<p>Your order lives here: <a href="${esc(portal)}">${esc(portal)}</a><br>
         <span style="color:#666;font-size:13px">This link is the key to your order — anyone who has it can see it. Keep it inside your team.</span></p>`)
    : '';

  // THE AMOUNT AND THE LINK, in that order and never one without the other. A
  // "pay now" button with no figure beside it asks somebody to click through to
  // find out what they owe, and the figure has to name which side of VAT it is
  // on — BRIEF-14's hardest rule, and an email is the one surface a copy sweep
  // scoped to src/ never reaches.
  //
  // 21% is stated as a line rather than folded silently into the total, because
  // that is what is actually charged to everyone right now: a valid EU business
  // number is settled as a reverse charge afterwards on the invoice, and a
  // customer who expected that needs to see it was not applied here.
  const payBlock = (pay && quote)
    ? (nl
      ? `<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid #e6e6ee">
           <strong>Te betalen: &euro;${(quote.grossCents / 100).toFixed(2).replace('.', ',')}</strong>
           <span style="color:#555"> (&euro;${(quote.netCents / 100).toFixed(2).replace('.', ',')} excl. btw + 21% btw)</span><br>
           <a href="${esc(pay)}">Betaal je bestelling</a><br>
           <span style="color:#666;font-size:13px">Heb je een geldig EU-btw-nummer buiten Nederland? Dan wordt de verlegging op je factuur rechtgezet.</span>
         </p>`
      : `<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid #e6e6ee">
           <strong>To pay: &euro;${(quote.grossCents / 100).toFixed(2)}</strong>
           <span style="color:#555"> (&euro;${(quote.netCents / 100).toFixed(2)} excl. VAT + 21% VAT)</span><br>
           <a href="${esc(pay)}">Pay for your order</a><br>
           <span style="color:#666;font-size:13px">Have a valid EU VAT number outside the Netherlands? The reverse charge is settled on your invoice.</span>
         </p>`)
    : '';

  return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
    <p>${hi}</p>
    <p>${received}</p>
    <p>${timing}</p>
    ${payBlock}
    ${portalNote}
    <p>${care}</p>
    ${upgradeNote}
        <p style="color:#666;font-size:13px">
      ${nl
        ? `Onze <a href="https://visuails.com${nl ? '/nl' : ''}/terms">algemene voorwaarden</a> en <a href="https://visuails.com${nl ? '/nl' : ''}/privacy">privacyverklaring</a>.`
        : `Our <a href="https://visuails.com/terms">terms</a> and <a href="https://visuails.com/privacy">privacy policy</a>.`}
    </p>
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
