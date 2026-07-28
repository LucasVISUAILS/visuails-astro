// VISUAILS — /account, the client-facing customer dashboard. Task #257, 2026-07-27.
//
// WHAT THIS ANSWERS
// Lucas, verbatim: "Accounts regelen met een klanten dashboard wanneer ze zijn
// ingelogd waar ze hun vaste brand lock instellingen per style (catalog,
// lifestyle of video) kunnen kiezen en ze hun transacties en bestellingen
// kunnen bekijken/downloaden." Three things, all here: login, an order
// history with downloads, and a per-style brand-lock picker backed by
// customer_style_locks (migrations/0003).
//
// WHY THIS FILE EXISTS RATHER THAN LIVING IN functions/account/
// Same reason src/lib/portal.js and src/lib/admin.js exist outside functions/
// — one implementation, importable from a thin Pages Function AND runnable
// under plain `node` with a stubbed env, which is the only way any of this can
// be tested without wrangler or miniflare. See portal.js's header for the
// fuller argument.
//
// WHY MAGIC-LINK AND NOT A PASSWORD (compare admin.js)
// admin.js's header explains the opposite choice for the opposite population:
// one studio owner, one login, a password costs nothing extra for a single
// person who already trusts the device. Customers are dozens of brands who
// placed an order and never chose a VISUAILS password — there is no password
// to check, because there was never a signup form to set one on. A magic link
// reuses the one credential every customer already has: the email address the
// order was placed under. There is also, deliberately, no public "create an
// account" endpoint here, for the same reason admin.js has no signup route —
// an account is not created by visiting this file, it already exists the
// moment upsertCustomer() in functions/api/order.js runs on a first order.
//
// WHY THIS PAGE HAS A COOKIE (and why that changes the CSRF answer)
// portal.js has no cookie and, correctly, no CSRF token — the URL token IS the
// credential there. This file DOES set a cookie once a magic link is redeemed,
// which is an AMBIENT credential exactly like admin.js's session cookie, so
// the same defence applies: SameSite=Strict plus an Origin check on every
// state-changing POST once a session exists. /account/login itself is exempt
// from the Origin check — it requires no session to call, so there is no
// ambient credential for a forged request to ride on; the worst a forged POST
// there can do is make this endpoint send a login email to an address the
// attacker could have entered directly anyway.
//
// TWO TOKEN TABLES, ON PURPOSE
// account_tokens is the emailed link: minutes-scale TTL, single-use, dead the
// moment it is clicked. account_sessions is the resulting logged-in cookie:
// weeks-scale TTL, refreshed on every authenticated request. Collapsing them
// into one table would mean either the emailed link stays valid for weeks
// (a link sitting in an inbox becomes a standing credential) or the login
// cookie expires in minutes (logged out mid-session for no reason the
// customer can see). schema.sql's header for this section makes the same
// point; this file is where it turns into code.

import { hashToken, isWellFormedToken, mintToken, isExpired } from './token.js';
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from './ratelimit.js';
import { sendMail } from './mail.js';
import { PER_PRODUCT } from '../data/pricing.js';

/** account_tokens.expires_at — long enough to find the email on a phone, short enough that a stale inbox hit is dead. */
const LOGIN_TOKEN_TTL_MINUTES = 30;

/** account_sessions.expires_at — refreshed on every authenticated request; see the header. */
const ACCOUNT_SESSION_TTL_DAYS = 30;

const SESSION_COOKIE = 'vis_account';

/** Sending an email is rarer and more expensive to abuse than reading a page. */
const LOGIN_LIMIT = 10;
/** A token click, same shape-checked-first reasoning as portal.js's PAGE_LIMIT. */
const VERIFY_LIMIT = 20;
/** The dashboard itself. */
const PAGE_LIMIT = 60;
/** File reads get their own, larger budget — one dashboard view can trigger several. */
const FILE_LIMIT = 300;
/** Logout and the lock form. */
const POST_LIMIT = 20;

/** Longest revision-style free text this file accepts. Unused today but kept for parity with portal.js's NOTE_MAX shape, should a note field land here. */

/**
 * Which styles a brand can lock a custom model to. Read off PER_PRODUCT rather
 * than typed again — those ids ('catalog' | 'lifestyle' | 'video') are exactly
 * what customer_style_locks.style is documented to hold (migrations/0003).
 * Typing a second list here would be a second place for the two to drift.
 */
const STYLES = PER_PRODUCT.en.map((p) => p.id);

// ─────────────────────────────────────────────────────────────────────────────
// COPY — bilingual, like every client-facing surface. See portal.js's own note:
// which language renders is read from data (the customer's most recent order),
// never guessed from the page itself, except on the pages reached before any
// order is known — login and a bad link — which fall back to Accept-Language,
// exactly as portal.js's plainPage() does for the same reason.
// ─────────────────────────────────────────────────────────────────────────────

const COPY = {
  en: {
    loginTitle: 'Sign in',
    loginLede: 'Enter the email you order under. We send a link — no password to remember.',
    loginEmailLabel: 'Email',
    loginSubmit: 'Send my link',
    loginTooMany: 'Too many attempts. Wait a minute and try again.',

    checkTitle: 'Check your email',
    checkBody: 'If that address has ordered with us before, a sign-in link is on its way. It works once, and for 30 minutes.',

    badLinkTitle: 'This link does not work',
    badLinkBody: 'It may have expired, already been used, or been mistyped. Request a new one below.',

    dashSub: 'Studio Dashboard',
    dashTitle: 'Your account',
    dashLede: 'Your orders, your files, and how your brand should look every time.',

    ordersHeading: 'Orders',
    emptyOrders: 'Nothing here yet — your first order will show up the moment it comes in.',
    fRef: 'Reference',
    fService: 'Service',
    fPlaced: 'Placed',
    fWindow: 'Window',
    fProducts: 'Products',
    windowPending: 'Being scheduled',

    filesHeading: 'Files',
    emptyFiles: 'Not delivered yet.',
    bView: 'View',
    bDownload: 'Download',

    lockHeading: 'Brand lock',
    lockLede: 'Pick the custom model each style should always use. Leave a style unset and we ask per order, as usual.',
    lockNoModels: 'No custom models on your account yet — nothing to lock to. Ask us to set one up.',
    lockUnset: '— not locked —',
    lockSave: 'Save',

    signOut: 'Sign out',
    footAsk: 'Anything else,',
    dbDown: 'We cannot reach your account right now. This is our end, not yours — try again in a few minutes.',
    notFound: 'Not found.',
  },

  nl: {
    loginTitle: 'Inloggen',
    loginLede: 'Vul het e-mailadres in waaronder je bestelt. We sturen een link — geen wachtwoord nodig.',
    loginEmailLabel: 'E-mail',
    loginSubmit: 'Stuur mijn link',
    loginTooMany: 'Te veel pogingen. Even wachten en opnieuw proberen.',

    checkTitle: 'Check je e-mail',
    checkBody: 'Als dat adres al eerder bij ons besteld heeft, is er een inloglink onderweg. Hij werkt één keer, en 30 minuten lang.',

    badLinkTitle: 'Deze link werkt niet',
    badLinkBody: 'Mogelijk is hij verlopen, al gebruikt, of verkeerd overgetypt. Vraag hieronder een nieuwe aan.',

    dashSub: 'Studio-dashboard',
    dashTitle: 'Jouw account',
    dashLede: 'Jouw bestellingen, jouw bestanden, en hoe je merk er iedere keer uit moet zien.',

    ordersHeading: 'Bestellingen',
    emptyOrders: 'Hier staat nog niets — je eerste bestelling verschijnt zodra hij binnenkomt.',
    fRef: 'Referentie',
    fService: 'Dienst',
    fPlaced: 'Geplaatst',
    fWindow: 'Venster',
    fProducts: 'Producten',
    windowPending: 'Wordt ingepland',

    filesHeading: 'Bestanden',
    emptyFiles: 'Nog niet geleverd.',
    bView: 'Bekijken',
    bDownload: 'Downloaden',

    lockHeading: 'Brand lock',
    lockLede: 'Kies het merkmodel dat elke style altijd moet gebruiken. Laat een style leeg en we vragen het per bestelling, zoals gebruikelijk.',
    lockNoModels: 'Nog geen merkmodellen op je account — niets om aan vast te zetten. Vraag ons er een in te stellen.',
    lockUnset: '— niet vastgezet —',
    lockSave: 'Opslaan',

    signOut: 'Uitloggen',
    footAsk: 'Verder iets,',
    dbDown: 'We kunnen je account nu niet bereiken. Dit ligt aan ons, niet aan jou — probeer het over een paar minuten opnieuw.',
    notFound: 'Niet gevonden.',
  },
};

/** Display names for orders.service — mirrors portal.js's SERVICE, duplicated for the same reason: this needs four words, not ui.js's whole dictionary. */
const SERVICE = {
  catalog: { en: 'Catalog', nl: 'Catalog' },
  lifestyle: { en: 'Lifestyle', nl: 'Lifestyle' },
  video: { en: 'Video', nl: 'Video' },
  custom: { en: 'Your Brand Model', nl: 'Jouw merkmodel' },
  'test-sample': { en: 'Test sample', nl: 'Proefvisual' },
};

/** orders.status, in words. Mirrors portal.js's/admin.js's own copies. */
const STATUS = {
  received: { en: 'Received', nl: 'Ontvangen' },
  in_production: { en: 'In production', nl: 'In productie' },
  human_check: { en: 'In human check', nl: 'In menselijke controle' },
  delivered: { en: 'Delivered', nl: 'Geleverd' },
  cancelled: { en: 'Cancelled', nl: 'Geannuleerd' },
};

const STUDIO_EMAIL = 'hello@visuails.com';

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

export async function accountGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/account';

  if (!env?.DB) {
    const lang = negotiate(request);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(COPY[lang]) }), 503);
  }

  const verifyMatch = path.match(/^\/account\/verify\/([^/]+)$/);
  if (verifyMatch) {
    let token;
    try {
      token = decodeURIComponent(verifyMatch[1]);
    } catch {
      token = verifyMatch[1];
    }
    return handleVerify(context, token);
  }

  const fileMatch = path.match(/^\/account\/files\/(\d+)\/(f|d)$/);
  if (fileMatch) {
    const gate = await checkRate(env, { ip: clientIp(request), action: 'account-file', limit: FILE_LIMIT });
    if (!gate.allowed) return new Response(null, { status: 429, headers: { ...fileHeaders(), 'retry-after': String(Math.max(1, gate.retryAfter || 60)) } });
    const customer = await currentCustomer(env, request);
    if (!customer) return seeOther('/account/login');
    return serveAccountFile(context, customer, Number(fileMatch[1]), fileMatch[2]);
  }

  if (path === '/account/login') {
    const customer = await currentCustomer(env, request);
    if (customer) return seeOther('/account');
    const lang = negotiate(request);
    return html(page({ lang, title: COPY[lang].loginTitle, body: loginBody(COPY[lang], lang) }));
  }

  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-page', limit: PAGE_LIMIT });
  if (!gate.allowed) {
    const lang = negotiate(request);
    return new Response(null, { status: 429, headers: { 'retry-after': String(Math.max(1, gate.retryAfter || 60)), 'content-type': 'text/plain' } });
  }

  maybeSweep(context, env);

  const customer = await currentCustomer(env, request);
  if (!customer) return seeOther('/account/login');

  if (path === '/account') return dashboardGet(context, customer);

  const lang = negotiate(request);
  return html(page({ lang, title: COPY[lang].notFound, body: errorBody(COPY[lang], COPY[lang].notFound) }), 404);
}

export async function accountPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  if (!env?.DB) {
    const lang = negotiate(request);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(COPY[lang]) }), 503);
  }

  // No Origin check here — see the file header. Sending a login email requires
  // no ambient credential, so there is nothing for a forged cross-site POST to
  // ride on.
  if (path === '/account/login') return handleLoginPost(context);

  const customer = await currentCustomer(env, request);
  if (!customer) return seeOther('/account/login');
  if (!originIsSelf(request)) {
    const lang = negotiate(request);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(COPY[lang], lang === 'nl'
      ? 'De herkomst van dit verzoek klopte niet. Probeer het opnieuw vanaf je accountpagina.'
      : 'Request origin did not match. Try again from your account page.') }), 403);
  }

  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-post', limit: POST_LIMIT });
  if (!gate.allowed) return new Response(null, { status: 429, headers: { 'retry-after': String(Math.max(1, gate.retryAfter || 60)), 'content-type': 'text/plain' } });

  if (path === '/account/logout') return handleLogout(context, customer);
  if (path === '/account/lock') return handleLockUpdate(context, customer);

  const lang = negotiate(request);
  return html(page({ lang, title: COPY[lang].notFound, body: errorBody(COPY[lang], COPY[lang].notFound) }), 404);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN / VERIFY / LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

async function handleLoginPost({ request, env }) {
  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-login', limit: LOGIN_LIMIT });
  const form = await request.formData().catch(() => null);
  const lang = form && String(form.get('lang') || '') === 'nl' ? 'nl' : negotiate(request);
  const t = COPY[lang];

  if (!gate.allowed) {
    return html(page({ lang, title: t.loginTitle, body: loginBody(t, lang, t.loginTooMany) }), 429);
  }

  const email = String(form?.get('email') || '').trim().toLowerCase();

  // Same response whether or not the address matches a customer — see the file
  // header on account enumeration. A Resend failure is swallowed for the same
  // reason: nothing about the reply may differ based on what happened server-side.
  if (isEmail(email)) {
    await sendLoginLink(env, request, email, lang).catch(() => {});
  }

  return html(page({ lang, title: t.checkTitle, body: checkEmailBody(t) }));
}

async function sendLoginLink(env, request, email, lang) {
  const customer = await env.DB.prepare('SELECT id FROM customers WHERE email = ?1').bind(email).first();
  if (!customer) return;

  const { token, tokenHash } = await mintCredential();
  await env.DB.prepare(
    'INSERT INTO account_tokens (customer_id, token_hash, expires_at) VALUES (?1, ?2, ?3)'
  ).bind(customer.id, tokenHash, loginTokenExpiry()).run();

  const link = `${requestOrigin(request)}/account/verify/${token}`;
  await sendMail(env, {
    to: email,
    subject: lang === 'nl' ? 'Je inloglink voor VISUAILS' : 'Your VISUAILS sign-in link',
    html: magicLinkEmail(lang, link),
  });
}

// env.DB is guaranteed here — accountGet checks it before this is ever reached,
// same single-entry-guard pattern as admin.js's adminGet/handleLogin.
async function handleVerify(context, token) {
  const { request, env } = context;
  const lang = negotiate(request);
  const t = COPY[lang];

  if (!isWellFormedToken(token)) return html(page({ lang, title: t.badLinkTitle, body: badLinkBody(t) }), 404);

  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-verify', limit: VERIFY_LIMIT });
  if (!gate.allowed) return new Response(null, { status: 429, headers: { 'retry-after': String(Math.max(1, gate.retryAfter || 60)), 'content-type': 'text/plain' } });

  const hash = await hashToken(token);
  let row;
  try {
    row = await env.DB.prepare(
      'SELECT id, customer_id, expires_at, used_at FROM account_tokens WHERE token_hash = ?1'
    ).bind(hash).first();
  } catch {
    return html(page({ lang, title: 'VISUAILS', body: errorBody(t) }), 503);
  }

  if (!row || row.used_at || isExpired(row.expires_at, null)) {
    return html(page({ lang, title: t.badLinkTitle, body: badLinkBody(t) }), 410);
  }

  const { token: sessionToken, tokenHash: sessionHash } = await mintCredential();
  await env.DB.batch([
    env.DB.prepare("UPDATE account_tokens SET used_at = datetime('now') WHERE id = ?1").bind(row.id),
    env.DB.prepare(
      'INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (?1, ?2, ?3)'
    ).bind(row.customer_id, sessionHash, accountSessionExpiry()),
    // Clicking an emailed link IS proving control of the inbox — the same proof
    // a dedicated verification email would establish, so this piggybacks on it
    // rather than sending a second message nobody asked for.
    env.DB.prepare("UPDATE customers SET email_verified = 1 WHERE id = ?1").bind(row.customer_id),
  ]);

  return seeOther('/account', [setSessionCookie(sessionToken)]);
}

async function handleLogout({ env }, customer) {
  await env.DB.prepare('DELETE FROM account_sessions WHERE id = ?1').bind(customer.session_id).run().catch(() => {});
  return seeOther('/account/login', [clearSessionCookie()]);
}

/** A fresh { token, tokenHash } pair — used for both the emailed link and the session cookie; see the file header on why they are two tables. */
async function mintCredential() {
  const token = mintToken();
  return { token, tokenHash: await hashToken(token) };
}

function loginTokenExpiry(fromDate = new Date()) {
  return new Date(fromDate.getTime() + LOGIN_TOKEN_TTL_MINUTES * 60000).toISOString();
}

function accountSessionExpiry(fromDate = new Date()) {
  return new Date(fromDate.getTime() + ACCOUNT_SESSION_TTL_DAYS * 86400000).toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

async function dashboardGet(context, customer) {
  const { env, request } = context;
  let orders, files, models, locks;
  try {
    [orders, files, models, locks] = await Promise.all([
      loadOrders(env, customer.customer_id),
      loadCustomerFiles(env, customer.customer_id),
      loadCustomModels(env, customer.customer_id),
      loadStyleLocks(env, customer.customer_id),
    ]);
  } catch {
    const lang = negotiate(request);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(COPY[lang]) }), 503);
  }

  // The customer's own most recent order decides the language, same as
  // portal.js reads orders.lang rather than guessing — a brand who ordered in
  // Dutch should not land on an English dashboard. A brand new to the account
  // system with zero orders yet (should not happen — accounts are never
  // created except by ordering — but nothing here assumes it) falls back to
  // Accept-Language, same as the pre-login pages.
  const lang = orders[0]?.lang === 'nl' ? 'nl' : orders[0]?.lang === 'en' ? 'en' : negotiate(request);
  const t = COPY[lang];

  const filesByOrder = groupFilesByOrder(files);
  const lockByStyle = Object.fromEntries(locks.map((l) => [l.style, l.custom_model_id]));

  const body = dashboardBody(t, lang, customer, orders, filesByOrder, models, lockByStyle);
  return html(page({ lang, title: t.dashTitle, body }));
}

async function currentCustomer(env, request) {
  const token = readSessionCookie(request);
  if (!token) return null;
  const hash = await hashToken(token);
  let row;
  try {
    row = await env.DB.prepare(
      `SELECT s.id AS session_id, s.expires_at, c.id AS customer_id, c.email, c.name, c.brand
         FROM account_sessions s JOIN customers c ON c.id = s.customer_id
        WHERE s.token_hash = ?1`
    ).bind(hash).first();
  } catch {
    return null;
  }
  if (!row) return null;
  if (isExpired(row.expires_at, null)) return null;

  // Refreshed on use — see the file header on why account_sessions is a
  // separate, sliding-expiry table from the single-use account_tokens. A
  // customer who opens the dashboard every week never gets signed out; one
  // who does not is signed out ACCOUNT_SESSION_TTL_DAYS after their last visit,
  // not after their first. Best-effort: a failed write here must not cost the
  // request a 500, same reasoning as admin.js's touch of admin_sessions.
  env.DB.prepare('UPDATE account_sessions SET last_used_at = datetime(\'now\'), expires_at = ?2 WHERE id = ?1')
    .bind(row.session_id, accountSessionExpiry()).run().catch(() => {});

  return row;
}

/** All orders this customer has placed, most recent first. */
async function loadOrders(env, customerId) {
  const res = await env.DB.prepare(
    `SELECT id, ref, service, status, tier, product_count, window_start, window_end, lang, created_at
       FROM orders
      WHERE customer_id = ?1
      ORDER BY created_at DESC, id DESC
      LIMIT 200`
  ).bind(customerId).all();
  return res.results || [];
}

/**
 * Every delivered file across every one of this customer's orders, one query.
 * Grouped by order_id in JS afterward rather than queried per-order — a
 * dashboard with twenty orders would otherwise be twenty round trips for
 * exactly the rows this single join already returns.
 */
async function loadCustomerFiles(env, customerId) {
  const res = await env.DB.prepare(
    `SELECT f.id, f.order_id, f.filename, f.bytes, f.expires_at
       FROM files f JOIN orders o ON o.id = f.order_id
      WHERE o.customer_id = ?1 AND f.kind = 'delivery'
      ORDER BY f.order_id, f.id`
  ).bind(customerId).all();
  return res.results || [];
}

function groupFilesByOrder(files) {
  const map = new Map();
  for (const f of files) {
    if (!map.has(f.order_id)) map.set(f.order_id, []);
    map.get(f.order_id).push(f);
  }
  return map;
}

async function loadCustomModels(env, customerId) {
  const res = await env.DB.prepare(
    'SELECT id, label, status FROM custom_models WHERE customer_id = ?1 ORDER BY created_at DESC'
  ).bind(customerId).all();
  return res.results || [];
}

async function loadStyleLocks(env, customerId) {
  const res = await env.DB.prepare(
    'SELECT style, custom_model_id FROM customer_style_locks WHERE customer_id = ?1'
  ).bind(customerId).all();
  return res.results || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND LOCK
// ─────────────────────────────────────────────────────────────────────────────

async function handleLockUpdate({ request, env }, customer) {
  const form = await request.formData().catch(() => null);
  const style = String(form?.get('style') || '');
  const raw = String(form?.get('custom_model_id') || '');

  if (!STYLES.includes(style)) return seeOther('/account');

  if (raw === '') {
    // Explicitly clearing the lock — back to "ask per order, as usual."
    await env.DB.prepare(
      'DELETE FROM customer_style_locks WHERE customer_id = ?1 AND style = ?2'
    ).bind(customer.customer_id, style).run();
    return seeOther('/account');
  }

  const modelId = Number.parseInt(raw, 10);
  if (!Number.isInteger(modelId)) return seeOther('/account');

  // The model must belong to THIS customer — without this, a forged form post
  // could lock a style to another brand's custom_models row. Same "owned?"
  // check portal.js runs before touching a file (files WHERE id AND order_id).
  const owned = await env.DB.prepare(
    'SELECT id FROM custom_models WHERE id = ?1 AND customer_id = ?2'
  ).bind(modelId, customer.customer_id).first();
  if (!owned) return seeOther('/account');

  await env.DB.prepare(
    `INSERT INTO customer_style_locks (customer_id, style, custom_model_id, updated_at)
     VALUES (?1, ?2, ?3, datetime('now'))
     ON CONFLICT(customer_id, style) DO UPDATE SET
       custom_model_id = excluded.custom_model_id,
       updated_at = datetime('now')`
  ).bind(customer.customer_id, style, modelId).run();

  return seeOther('/account');
}

// ─────────────────────────────────────────────────────────────────────────────
// FILES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One delivered object out of R2, behind the account session rather than a
 * portal token. This is portal.js's serveFile() in shape — range/conditional
 * handling, the same MIME table, the same Content-Disposition rule — but NOT
 * imported from it: portal.js's version is reached by parsing a token out of
 * the URL and checking it against order_tokens, and this one is reached by an
 * already-authenticated customer_id checked against orders.customer_id. There
 * is no shared "verify, then serve" call it could be factored down to without
 * either function taking a parameter that means something different to each
 * caller. The genuinely shared, stateless part — the MIME table, the
 * Content-Disposition builder, the response headers — is duplicated below,
 * the same judgment call portal.js's own SERVICE dictionary makes about
 * ui.js: three small pure helpers are cheaper to keep in step by eye than to
 * add a third caller-agnostic module for.
 */
async function serveAccountFile(context, customer, fileId, mode) {
  const { request, env } = context;

  if (!env.UPLOADS) return new Response(null, { status: 503, headers: fileHeaders() });

  let file;
  try {
    file = await env.DB.prepare(
      `SELECT f.id, f.r2_key, f.preview_key, f.filename, f.expires_at
         FROM files f JOIN orders o ON o.id = f.order_id
        WHERE f.id = ?1 AND o.customer_id = ?2 AND f.kind = 'delivery'`
    ).bind(fileId, customer.customer_id).first();
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!file) return new Response(null, { status: 404, headers: fileHeaders() });
  if (file.expires_at && isExpired(file.expires_at, null)) return new Response(null, { status: 410, headers: fileHeaders() });

  const key = mode === 'f' ? file.preview_key || file.r2_key : file.r2_key;

  let object;
  try {
    object = await env.UPLOADS.get(key, { onlyIf: request.headers, range: request.headers });
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!object) return new Response(null, { status: 404, headers: fileHeaders() });

  const headers = new Headers(fileHeaders());
  if (typeof object.writeHttpMetadata === 'function') object.writeHttpMetadata(headers);
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');

  const type = mimeFor(file.filename || key, headers.get('content-type'));
  headers.set('content-type', type);
  headers.set(
    'content-disposition',
    mode === 'd' ? `attachment; ${dispositionFilename(file.filename || 'file')}` : 'inline'
  );

  if (!object.body) {
    return new Response(null, { status: request.headers.get('if-none-match') ? 304 : 412, headers });
  }

  const range = object.range;
  if (range && typeof range.offset === 'number') {
    const start = range.offset;
    const length = typeof range.length === 'number' ? range.length : object.size - start;
    headers.set('content-range', `bytes ${start}-${start + length - 1}/${object.size}`);
    headers.set('content-length', String(length));
    return new Response(object.body, { status: 206, headers });
  }

  if (typeof object.size === 'number') headers.set('content-length', String(object.size));
  return new Response(object.body, { status: 200, headers });
}

function fileHeaders() {
  return {
    'cache-control': 'private, max-age=3600',
    'referrer-policy': 'no-referrer',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
  };
}

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
  zip: 'application/zip',
};

function mimeFor(name, stored) {
  const ext = String(name).toLowerCase().split('.').pop();
  return MIME[ext] || (stored && stored !== 'application/octet-stream' ? stored : 'application/octet-stream');
}

function dispositionFilename(name) {
  const clean = String(name).replace(/[\\/"\r\n\t\x00-\x1f]/g, '_').slice(0, 120) || 'file';
  const ascii = clean.replace(/[^\x20-\x7e]/g, '_');
  return `filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COOKIE
// ─────────────────────────────────────────────────────────────────────────────

function readSessionCookie(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function setSessionCookie(token) {
  const maxAge = ACCOUNT_SESSION_TTL_DAYS * 86400;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/account; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/account; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

/** Same check, same reasoning, as admin.js's originIsSelf() — see that file's header. */
function originIsSelf(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERING
// ─────────────────────────────────────────────────────────────────────────────

// login/check-email/bad-link share one framed .authcard (account.css) rather
// than a bare form floating on the page — these are the first thing a
// customer sees of the account system, before there is a dashboard bar or
// any brand/order context to anchor the page, so the card itself has to do
// that job.
function loginBody(t, lang, error = null) {
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<div class="authcard">
  <h1>${esc(t.loginTitle)}</h1>
  <p class="lede">${esc(t.loginLede)}</p>
  ${error ? `<p class="error">${esc(error)}</p>` : ''}
  <form class="login" method="post" action="/account/login">
    <input type="hidden" name="lang" value="${esc(lang)}">
    <input type="email" name="email" placeholder="${esc(t.loginEmailLabel)}" autocomplete="email" required>
    <button class="btn btn-primary" type="submit">${esc(t.loginSubmit)}</button>
  </form>
</div>`;
}

function checkEmailBody(t) {
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<div class="authcard">
  <h1>${esc(t.checkTitle)}</h1>
  <p class="lede">${esc(t.checkBody)}</p>
</div>`;
}

function badLinkBody(t) {
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<div class="authcard">
  <h1>${esc(t.badLinkTitle)}</h1>
  <p class="lede">${esc(t.badLinkBody)}</p>
  <p class="note"><a href="/account/login">${esc(t.loginSubmit)}</a></p>
</div>`;
}

function dashboardBody(t, lang, customer, orders, filesByOrder, models, lockByStyle) {
  return `
<div class="bar">
  <div class="bar-left">
    <a class="mark" href="/">VISUAILS</a>
    <span class="bar-sub">${esc(t.dashSub)}</span>
  </div>
  <div class="bar-right">
    <span>${esc(customer.brand || customer.name || customer.email)}</span>
    <form method="post" action="/account/logout"><button class="btn btn-ghost" type="submit">${esc(t.signOut)}</button></form>
  </div>
</div>
<h1>${esc(t.dashTitle)}</h1>
<p class="lede">${esc(t.dashLede)}</p>

<h2>${esc(t.lockHeading)}</h2>
<p class="lede">${esc(t.lockLede)}</p>
${lockSection(t, models, lockByStyle)}

<h2>${esc(t.ordersHeading)}${orders.length ? ` <span class="h2-count">(${orders.length})</span>` : ''}</h2>
${orders.length ? orders.map((o) => orderCard(t, lang, o, filesByOrder.get(o.id) || [])).join('') : `<p class="empty">${esc(t.emptyOrders)}</p>`}`;
}

// One panel, one row per style — was three separate .card+.controls forms
// stacked with their own margins, three visually distinct boxes for what is
// conceptually one settings list (see account.css's .lockpanel comment).
function lockSection(t, models, lockByStyle) {
  if (!models.length) return `<p class="empty">${esc(t.lockNoModels)}</p>`;

  const rows = STYLES.map((style) => {
    const current = lockByStyle[style] ?? '';
    const options =
      `<option value=""${current === '' ? ' selected' : ''}>${esc(t.lockUnset)}</option>` +
      models.map((m) => `<option value="${m.id}"${String(m.id) === String(current) ? ' selected' : ''}>${esc(m.label)}</option>`).join('');
    return `
<form class="lockrow" method="post" action="/account/lock">
  <input type="hidden" name="style" value="${esc(style)}">
  <span class="lockrow-name">${esc(styleLabel(style))}</span>
  <span class="lockrow-controls">
    <select name="custom_model_id">${options}</select>
    <button class="btn btn-primary" type="submit">${esc(t.lockSave)}</button>
  </span>
</form>`;
  }).join('');

  return `<div class="lockpanel">${rows}</div>`;
}

function styleLabel(style) {
  // A one-word label per style id, the same three ids SERVICE already names —
  // reused rather than re-typed for the two ('catalog','lifestyle') that
  // overlap with a service name; 'video' does too.
  return SERVICE[style]?.en || style;
}

function orderCard(t, lang, o, files) {
  const window = o.window_start ? `${esc(o.window_start)} → ${esc(o.window_end || '—')}` : t.windowPending;
  // Status is not repeated here — it already has the pill in row-head, and a
  // second plain-text copy of the same word two lines down read as clutter
  // rather than information. Placed (the order date) replaces it: real,
  // useful, and nowhere else on the card.
  const facts = [
    [t.fRef, o.ref],
    [t.fService, serviceLabel(o.service, lang) || o.service],
    o.product_count ? [t.fProducts, String(o.product_count)] : null,
    o.created_at ? [t.fPlaced, String(o.created_at).slice(0, 10)] : null,
  ].filter(Boolean);

  const fileList = files.length
    ? `<ul class="files">${files.map((f) => fileRow(t, f)).join('')}</ul>`
    : `<p class="meta">${esc(t.emptyFiles)}</p>`;

  return `
<div class="card">
  <div class="row-head">
    <span class="ref">${esc(o.ref)}</span>
    <span class="pill is-${esc(o.status)}">${esc(statusLabel(o.status, lang) || o.status)}</span>
  </div>
  <dl class="facts">${facts.map(([k, v]) => `<div class="fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  <p class="meta">${esc(t.fWindow)}: ${o.window_start ? window : esc(window)}</p>
  <h3>${esc(t.filesHeading)}</h3>
  ${fileList}
</div>`;
}

// Two flex groups per row — .file-info (name + size) left, .file-actions
// (View/Download) right — rather than one flat run of four inline elements
// that used to wrap mid-sentence on narrow screens. See account.css.
function fileRow(t, f) {
  const gone = f.expires_at && isExpired(f.expires_at, null);
  const size = f.bytes ? formatBytes(f.bytes) : '';
  const info = `<span class="file-info"><span class="name">${esc(f.filename || `#${f.id}`)}</span>${size ? `<span class="meta">${esc(size)}</span>` : ''}</span>`;
  if (gone) {
    return `<li>${info}</li>`;
  }
  return `<li>
  ${info}
  <span class="file-actions">
    <a class="btn btn-ghost" href="/account/files/${f.id}/f">${esc(t.bView)}</a>
    <a class="btn btn-ghost" href="/account/files/${f.id}/d">${esc(t.bDownload)}</a>
  </span>
</li>`;
}

function errorBody(t, message = null) {
  return `<div class="bar"><a class="mark" href="/">VISUAILS</a></div><p class="error" style="margin-top:2rem">${esc(message || (t && t.dbDown) || 'Something went wrong.')}</p>`;
}

function page({ lang, title, body }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="color-scheme" content="light">
<title>${esc(title)} — VISUAILS</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="stylesheet" href="/account.css">
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}

/** Same header set and reasoning as portal.js's html() — no script on this page, so default-src 'none' is a fact, not an aspiration. */
function html(body, status = 200, extraSetCookies = []) {
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
    'content-security-policy':
      "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  for (const c of extraSetCookies) headers.append('Set-Cookie', c);
  return new Response(body, { status, headers });
}

function seeOther(location, setCookies = []) {
  const headers = new Headers({ Location: location, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
  for (const c of setCookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 303, headers });
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL THINGS
// ─────────────────────────────────────────────────────────────────────────────

function serviceLabel(service, lang) {
  const s = SERVICE[service];
  return s ? s[lang] || s.en : null;
}

function statusLabel(status, lang) {
  const s = STATUS[status];
  return s ? s[lang] || s.en : null;
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Same fallback reasoning as functions/api/order.js's requestOrigin() — a link that cannot be clicked in staging is untested until a client has it. */
function requestOrigin(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return 'https://visuails.com';
  }
}

/** Language for the pages reached before any order is known — same as portal.js's negotiate(). */
function negotiate(request) {
  const header = request?.headers?.get?.('accept-language') || '';
  return /(^|[,\s])nl\b/i.test(header) ? 'nl' : 'en';
}

function formatBytes(n) {
  const b = Number(n);
  if (!Number.isFinite(b) || b <= 0) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function later(context, promise) {
  if (context && typeof context.waitUntil === 'function') context.waitUntil(promise);
}

function maybeSweep(context, env) {
  if (env?.DB && shouldSweep()) later(context, sweepRateLimits(env));
}

function esc(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/**
 * The magic-link email itself. Plain, on purpose — a login email that looks
 * like a marketing template is the one a spam filter or a wary customer
 * distrusts most. No logo image, no styled button: one link, one sentence of
 * context, the studio's own signature.
 */
function magicLinkEmail(lang, link) {
  const copy = lang === 'nl'
    ? {
        h: 'Je inloglink',
        p: 'Klik op de link hieronder om in te loggen bij je VISUAILS-account. Deze link werkt één keer en verloopt over 30 minuten.',
        b: 'Inloggen',
        f: 'Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren — er verandert niets aan je account.',
      }
    : {
        h: 'Your sign-in link',
        p: 'Click the link below to sign in to your VISUAILS account. It works once and expires in 30 minutes.',
        b: 'Sign in',
        f: 'Did not request this? You can ignore this email — nothing about your account changes.',
      };
  return `<div style="font-family:Arial,sans-serif;color:#222;max-width:480px;margin:0 auto">
<h2 style="margin:0 0 12px">${copy.h}</h2>
<p style="margin:0 0 20px">${copy.p}</p>
<p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none">${copy.b}</a></p>
<p style="margin:0;color:#666;font-size:13px">${copy.f}</p>
</div>`;
}
