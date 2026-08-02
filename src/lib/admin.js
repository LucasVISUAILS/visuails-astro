// VISUAILS — /admin, Lucas's own dashboard. 2026-07-27.
//
// WHAT THIS ANSWERS
// Task #256: an order overview with a working status control (nothing in this
// codebase ever wrote to orders.status after order creation before this file
// existed — see functions/api/order.js, which INSERTs 'received' once and
// touches it never again), and a revision inbox — the files clients flag with
// review_state = 'revision_requested' and a note, in the portal, which until
// now had nowhere to surface on the studio's side except a manual D1 query.
//
// WHY THIS FILE EXISTS RATHER THAN LIVING IN functions/admin/
// Same reason src/lib/portal.js exists rather than living in functions/o/: one
// implementation, importable from a thin Pages Function AND runnable under
// plain `node` with a stubbed env, which is the only way any of this can be
// tested in an environment with no wrangler. See portal.js's own header for
// the fuller argument; it applies here unchanged.
//
// WHY THIS PAGE HAS A COOKIE AND THE PORTAL DELIBERATELY DOES NOT
// portal.js's header explains, correctly, that the portal has no CSRF token
// because it has no cookie — the token IS the credential, so anyone who could
// forge a cross-site POST already holds it. That reasoning does not carry over
// here. /admin is a real login: a password proves who Lucas is once, and a
// cookie carries that proof on every later request — which is exactly the
// AMBIENT credential CSRF exploits. So every state-changing route below is
// guarded twice: the session cookie proves the caller is logged in, and an
// Origin check proves the request was actually composed by a page this site
// served, not assembled by a third-party site the browser attached the cookie
// to automatically. SameSite=Strict on the cookie is the first line of defence
// and covers ordinary browsers; the Origin check is the second, for anything
// that does not honour SameSite.
//
// WHY PASSWORD AUTH HERE AND A DIFFERENT DESIGN FOR CLIENTS (src/lib/account.js)
// One studio, one login, chosen once and typed from memory or a password
// manager on a device Lucas already trusts — a password costs nothing extra
// for that case. Clients are a different population entirely: dozens of
// brands who have never set a VISUAILS password and never should have to, so
// account.js uses a magic link instead. Two different credentials for two
// different relationships to the site, not an inconsistency.

import { hashToken } from './token.js';
import { checkRate, clientIp } from './ratelimit.js';
import {
  adminSessionExpiry,
  hashPassword,
  mintAdminSession,
  verifyPassword,
} from './adminAuth.js';

const LOGIN_LIMIT = 10; // attempts per minute per IP — a password login, not a token lookup
const SESSION_COOKIE = 'vis_admin';

/** orders.status, in the order the studio actually moves through them. */
const STATUSES = ['received', 'in_production', 'human_check', 'delivered', 'cancelled'];
const STATUS_LABEL = {
  received: 'Received',
  in_production: 'In production',
  human_check: 'In human check',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/admin';

  if (!env?.DB) return html(page({ title: 'Admin', body: errorBody('The database is not reachable. Check the DB binding.') }), 503);

  if (path === '/admin/login') {
    const admin = await currentAdmin(context);
    if (admin) return seeOther('/admin');
    return html(page({ title: 'Sign in', body: loginBody() }));
  }

  const admin = await currentAdmin(context);
  if (!admin) return seeOther('/admin/login');

  if (path === '/admin') {
    const [revisions, orders] = await Promise.all([loadRevisionInbox(env), loadOrders(env)]);
    const modelsByCustomer = await loadCustomModelsByCustomer(env, orders.map((o) => o.customer_id));
    return html(page({ title: 'Dashboard', body: dashboardBody(revisions, orders, modelsByCustomer) }));
  }

  return html(page({ title: 'Not found', body: errorBody('Not found.') }), 404);
}

export async function adminPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  if (!env?.DB) return html(page({ title: 'Admin', body: errorBody('The database is not reachable.') }), 503);

  if (path === '/admin/login') return handleLogin(context);

  // Everything past this point changes state and requires both a live session
  // AND an Origin that matches this site — see the file header.
  const admin = await currentAdmin(context);
  if (!admin) return seeOther('/admin/login');
  if (!originIsSelf(request, env)) {
    // Task #271e, 2026-07-29: this used to say only "try again from the
    // dashboard itself" — true, but useless if the cause is a genuine host
    // mismatch, because there was nothing to look at to tell which one it
    // was. Only Lucas, already authenticated, ever sees this page, so the
    // raw values are safe to print — see originMismatchDetail()'s header.
    return html(page({ title: 'Admin', body: errorBody(
      `Request origin did not match. Try again from the dashboard itself. ${originMismatchDetail(request)}`
    ) }), 403);
  }

  if (path === '/admin/logout') return handleLogout(context, admin);

  const statusMatch = path.match(/^\/admin\/orders\/(\d+)\/status$/);
  if (statusMatch) return handleStatusUpdate(context, Number(statusMatch[1]));

  const modelMatch = path.match(/^\/admin\/orders\/(\d+)\/models$/);
  if (modelMatch) return handleAddCustomModel(context, Number(modelMatch[1]));

  return html(page({ title: 'Not found', body: errorBody('Not found.') }), 404);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN / LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

async function handleLogin({ request, env }) {
  const gate = await checkRate(env, { ip: clientIp(request), action: 'admin-login', limit: LOGIN_LIMIT });
  if (!gate.allowed) {
    return html(page({ title: 'Sign in', body: loginBody('Too many attempts. Wait a minute and try again.') }), 429);
  }

  const form = await request.formData().catch(() => null);
  const email = String(form?.get('email') || '').trim().toLowerCase();
  const password = String(form?.get('password') || '');

  const row = email
    ? await env.DB.prepare('SELECT id, password_hash FROM admin_users WHERE email = ?1').bind(email).first()
    : null;

  // Verify against a hash even when no row matched, so the response time does
  // not tell an attacker whether the email exists. The dummy hash is a fixed,
  // never-matching PBKDF2 string — cheap to keep around, expensive to skip.
  const ok = row
    ? await verifyPassword(password, row.password_hash)
    : await verifyPassword(password, await dummyHash());

  if (!ok || !row) {
    return html(page({ title: 'Sign in', body: loginBody('Wrong email or password.') }), 401);
  }

  const { token, tokenHash } = await mintAdminSession();
  await env.DB.prepare(
    'INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?1, ?2, ?3)'
  ).bind(row.id, tokenHash, adminSessionExpiry()).run();

  return seeOther('/admin', [setSessionCookie(token)]);
}

async function handleLogout({ request, env }, admin) {
  await env.DB.prepare('DELETE FROM admin_sessions WHERE id = ?1').bind(admin.session_id).run().catch(() => {});
  return seeOther('/admin/login', [clearSessionCookie()]);
}

// A fixed PBKDF2 hash (100000 iterations) of a string nobody will ever type,
// so a login attempt against an unknown email still pays the same hashing
// cost as one against a real row.
//
// NOT precomputed at module load — that was the original shape of this and it
// shipped a real deploy failure: "Uncaught Error: Disallowed operation called
// within global scope... at hashPassword". Cloudflare Workers explicitly
// forbid asynchronous I/O, timers, and random-value generation while a module
// is still being evaluated — hashPassword() does both (crypto.getRandomValues
// for the salt, crypto.subtle.deriveBits to derive) — and a top-level `await`
// runs during that evaluation, before any request exists to run it inside of.
// Plain node has no such restriction, which is why test_admin.mjs never
// caught this: everything in this suite runs under node, and node was happy
// to await it at import time.
//
// ratelimit.js's getSalt() already solved this exact shape of problem, for
// the same reason (its salt is also crypto.getRandomValues output): a
// per-isolate cache, computed lazily on first USE — inside a request handler,
// where async work is allowed — rather than at load. This is that pattern.
let dummyHashCache = null;
async function dummyHash() {
  if (dummyHashCache) return dummyHashCache;
  dummyHashCache = await hashPassword('vis-admin-dummy-hash-constant-time-decoy');
  return dummyHashCache;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS UPDATE
// ─────────────────────────────────────────────────────────────────────────────

async function handleStatusUpdate({ request, env }, orderId) {
  const form = await request.formData().catch(() => null);
  const status = String(form?.get('status') || '');
  const note = String(form?.get('note') || '').slice(0, 2000).trim() || null;

  if (!STATUSES.includes(status)) {
    return html(page({ title: 'Admin', body: errorBody(`"${esc(status)}" is not a known status.`) }), 400);
  }
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }

  const exists = await env.DB.prepare('SELECT id FROM orders WHERE id = ?1').bind(orderId).first();
  if (!exists) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  // Two writes, not one — orders.status is what every other query in the
  // codebase reads (the capacity gate's idx_orders_status, the notify mail),
  // order_events is what the client's own portal timeline reads (portal.js,
  // loadEvents()). A status change that only touched one would move Lucas's
  // view of the order out of step with the client's, silently.
  await env.DB.batch([
    env.DB.prepare('UPDATE orders SET status = ?1 WHERE id = ?2').bind(status, orderId),
    env.DB.prepare(
      "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, 'admin')"
    ).bind(orderId, status, note),
  ]);

  return seeOther('/admin');
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM MODELS — task #271e, 2026-07-29
//
// custom_models had a reader (account.js's brand-lock picker, and the
// "owned?" check on the lock POST) but no writer anywhere in the codebase —
// grep for `INSERT INTO custom_models` before this change returns nothing.
// A brand could never have anything to lock a style to, and the portal's own
// "No custom models on your account yet — ask us to set one up" message had
// no admin-side action behind the "ask us" it names. This is that action:
// the smallest thing that unblocks it — a label, tied to the order's
// customer — not a redesign of whatever the eventual "custom-models flow"
// (the one schema.sql's own comment on this table alludes to, that promotes
// a row from 'in_design' to 'approved' to 'locked') turns out to need.
// Every row created here starts 'in_design', schema.sql's own default;
// nothing here writes 'approved' or 'locked' — those two remain unreachable
// from any UI until that flow is actually designed, which is a separate,
// bigger decision than "let Lucas create the row" and is not made here.
// ─────────────────────────────────────────────────────────────────────────────

async function handleAddCustomModel({ request, env }, orderId) {
  const form = await request.formData().catch(() => null);
  const label = String(form?.get('label') || '').trim().slice(0, 200);

  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  if (!label) {
    return html(page({ title: 'Admin', body: errorBody('A label is required to add a custom model.') }), 400);
  }

  const order = await env.DB.prepare('SELECT customer_id FROM orders WHERE id = ?1').bind(orderId).first();
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);
  if (!order.customer_id) {
    // Real, if rare: upsertCustomer() in functions/api/order.js runs inside a
    // safe() wrapper, so a DB hiccup at order time can leave orders.customer_id
    // NULL without failing the order itself. Nothing to attach a model to
    // until that's fixed by hand — surfacing it beats a foreign-key 500.
    return html(page({ title: 'Admin', body: errorBody('This order has no linked customer account (customer_id is empty), so there is no brand to attach a custom model to.') }), 409);
  }

  await env.DB.prepare(
    "INSERT INTO custom_models (customer_id, label, status) VALUES (?1, ?2, 'in_design')"
  ).bind(order.customer_id, label).run();

  return seeOther('/admin');
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

async function currentAdmin(context) {
  const { env, request, waitUntil } = context;
  const token = readSessionCookie(request);
  if (!token) return null;
  const hash = await hashToken(token);
  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.expires_at, a.id AS admin_id, a.email
       FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
      WHERE s.token_hash = ?1`
  ).bind(hash).first();
  if (!row) return null;
  if (Date.parse(normalizeStamp(row.expires_at)) <= Date.now()) return null;
  // Best-effort touch; a failed write here should not cost the request a 500,
  // hence the .catch() swallowing it. That alone was not enough: an unawaited
  // promise with nowhere else holding it can be dropped mid-flight the moment
  // this isolate finishes handing back the response — Workers make no promise
  // that a request handler's side effects outlive the response it returns.
  // portal.js's identical touch (bumpUse, in its own currentAdmin-equivalent
  // path) has always gone through `later(context, promise)` for exactly this
  // reason; this one didn't, found in the 2026-07-28 audit (task #263). Same
  // fix, same reasoning: register it with waitUntil so the runtime keeps the
  // isolate alive long enough for the UPDATE to actually land.
  later(waitUntil, env.DB.prepare('UPDATE admin_sessions SET last_used_at = datetime(\'now\') WHERE id = ?1')
    .bind(row.session_id).run().catch(() => {}));
  return row;
}

/** Fire-and-forget, when the runtime offers it. Mirrors portal.js's later(). */
function later(waitUntil, promise) {
  if (typeof waitUntil === 'function') waitUntil(promise);
}

/**
 * Files clients have flagged for a revision, most recent first — the inbox
 * Lucas asked for explicitly: "revisies binnen krijg wanneer klanten het in
 * hun portaal met een notitie aanvragen."
 */
async function loadRevisionInbox(env) {
  const res = await env.DB.prepare(
    `SELECT f.id AS file_id, f.filename, f.review_note, f.reviewed_at,
            o.id AS order_id, o.ref, o.brand, o.email, o.lang
       FROM files f JOIN orders o ON o.id = f.order_id
      WHERE f.review_state = 'revision_requested'
      ORDER BY f.reviewed_at DESC
      LIMIT 100`
  ).all();
  return res.results || [];
}

/** Recent orders, active ones first — "duidelijk overzicht van wat er gedaan moet worden." */
async function loadOrders(env) {
  const res = await env.DB.prepare(
    `SELECT id, customer_id, ref, service, status, tier, brand, email, product_count,
            window_start, window_end, payment_status, created_at
       FROM orders
      ORDER BY
        CASE status WHEN 'received' THEN 0 WHEN 'in_production' THEN 1
                    WHEN 'human_check' THEN 2 WHEN 'delivered' THEN 3
                    ELSE 4 END,
        id DESC
      LIMIT 200`
  ).all();
  return res.results || [];
}

/**
 * Every custom_models row for the customers behind this page's orders, keyed
 * by customer_id — one query, grouped in JS, the same shape account.js's
 * groupFilesByOrder() already uses for the identical "N orders, each with
 * their own child rows" problem. `customerIds` carries duplicates (several
 * orders can share a customer) and NULLs (orders.customer_id is nullable —
 * see handleAddCustomModel's comment); both are filtered before the query so
 * neither becomes a wasted IN() slot or, worse, a NULL bind.
 */
async function loadCustomModelsByCustomer(env, customerIds) {
  const ids = [...new Set(customerIds.filter((id) => Number.isInteger(id)))];
  const byCustomer = new Map();
  if (!ids.length) return byCustomer;

  const placeholders = ids.map((_, i) => `?${i + 1}`).join(',');
  const res = await env.DB.prepare(
    `SELECT customer_id, id, label, status FROM custom_models
      WHERE customer_id IN (${placeholders})
      ORDER BY created_at DESC`
  ).bind(...ids).all();

  for (const row of res.results || []) {
    if (!byCustomer.has(row.customer_id)) byCustomer.set(row.customer_id, []);
    byCustomer.get(row.customer_id).push(row);
  }
  return byCustomer;
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
  const maxAge = 14 * 86400; // ADMIN_SESSION_TTL_DAYS, in seconds — kept in step by hand, see adminAuth.js
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/admin; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * Is this request's Origin this site? The second line of CSRF defence — see
 * the file header. A same-site form POST always carries Origin in modern
 * browsers; its absence is treated as a mismatch rather than waved through,
 * because "no Origin" is also what a handful of ancient or misbehaving
 * clients send, and admitting that gap for their sake would reopen the one
 * this check exists to close.
 *
 * Task #271e, 2026-07-29: checked against request.url's own host first (the
 * original, and still the common, case), then against ALLOWED_ORIGIN_HOSTS —
 * a comma-separated env var — if that misses. This exists because a same-site
 * browser POST from a hostname this exact Worker legitimately answers under
 * is not a forged request, and Cloudflare Pages can legitimately put more
 * than one live hostname in front of the same deployment (an apex/www pair,
 * or the project's own *.pages.dev domain alongside a custom domain) — cases
 * request.url alone cannot see because it only ever reflects the ONE host the
 * current request happened to arrive on. Unset, this is byte-for-byte the
 * original behaviour: nothing here narrows what used to pass.
 */
function originIsSelf(request, env) {
  // Sec-Fetch-Site FIRST, and this ordering is the whole fix.
  //
  // THE BUG THIS REPLACES, because it is worth writing down: every response
  // from this file carried `Referrer-Policy: no-referrer`, for a good reason
  // (portal tokens live in the URL path and must not leak through Referer).
  // Under `no-referrer` Chrome does not merely strip Referer — it also sends
  // `Origin: null` on a same-origin form POST. So this function, whose entire
  // job is to compare Origin against our own host, was handed the string
  // "null", `new URL('null')` threw, and it returned false. Every
  // state-changing POST behind this gate answered 403 in production: sign out
  // on /admin and /account, the order status change, adding a custom model,
  // the brand lock, and file review. Login was unaffected because it is
  // dispatched before the gate — which is exactly why the dashboard could be
  // entered and then did nothing. Diagnosed 2026-08-01 by POSTing to a route
  // that matches nothing, which prints "Seen Origin: null" and changes no
  // state.
  //
  // The policy is now `same-origin`: full referrer to ourselves, nothing at
  // all cross-origin, so the token still cannot leak and Origin survives.
  //
  // Sec-Fetch-Site is checked first anyway, because it is the better signal.
  // It is set by the browser, script cannot forge it, and it is not affected
  // by Referrer-Policy — so it keeps working even if some future policy
  // change suppresses Origin again. `cross-site` is a hard reject; anything
  // else falls through to the Origin comparison, which still covers browsers
  // that send neither header.
  const site = request.headers.get('Sec-Fetch-Site');
  if (site === 'same-origin') return true;
  if (site === 'cross-site') return false;

  const origin = request.headers.get('Origin');
  if (!origin || origin === 'null') return false;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  if (originHost === new URL(request.url).host) return true;
  const allowed = String(env?.ALLOWED_ORIGIN_HOSTS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.includes(originHost);
}

/** The two values behind an origin-mismatch 403 — same shape both call sites
 * need to build a message a human can act on instead of a dead end. */
function originMismatchDetail(request) {
  const origin = request.headers.get('Origin') || '(no Origin header sent)';
  let host = '(unreadable)';
  try { host = new URL(request.url).host; } catch { /* leave the placeholder */ }
  return `Seen Origin: ${origin}. Expected host: ${host}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERING
// ─────────────────────────────────────────────────────────────────────────────

function loginBody(error = null) {
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<form class="login" method="post" action="/admin/login">
  ${error ? `<p class="error">${esc(error)}</p>` : ''}
  <input type="email" name="email" placeholder="Email" autocomplete="username" required>
  <input type="password" name="password" placeholder="Password" autocomplete="current-password" required>
  <button class="btn btn-primary" type="submit">Sign in</button>
</form>`;
}

function dashboardBody(revisions, orders, modelsByCustomer) {
  return `
<div class="bar">
  <a class="mark" href="/">VISUAILS</a>
  <div class="bar-right">
    <span>Admin</span>
    <form method="post" action="/admin/logout"><button class="btn btn-ghost" type="submit">Sign out</button></form>
  </div>
</div>
<h1>Dashboard</h1>
<p class="lede">${orders.length} order${orders.length === 1 ? '' : 's'} · ${revisions.length} revision${revisions.length === 1 ? '' : 's'} waiting</p>

<h2>Revision requests</h2>
${revisions.length ? revisions.map(revisionCard).join('') : '<p class="empty">Nothing waiting. A client\'s "request a revision" in their portal lands here, with their note.</p>'}

<h2>Orders</h2>
${orders.length ? orders.map((o) => orderCard(o, modelsByCustomer.get(o.customer_id) || [])).join('') : '<p class="empty">No orders yet.</p>'}`;
}

function revisionCard(r) {
  return `
<div class="card is-attention">
  <div class="row-head">
    <span class="ref">${esc(r.ref)}</span>
    <span class="meta">${esc(r.brand || r.email)} · ${esc(r.filename || 'file #' + r.file_id)} · ${esc(when(r.reviewed_at))}</span>
  </div>
  ${r.review_note ? `<div class="note">${esc(r.review_note)}</div>` : '<p class="meta">No note left.</p>'}
</div>`;
}

function orderCard(o, models) {
  const options = STATUSES.map(
    (s) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${STATUS_LABEL[s]}</option>`
  ).join('');
  const window = o.window_start ? `${esc(o.window_start)} → ${esc(o.window_end)}` : '—';
  // Task #271e: custom_models for this order's customer, read-only, so Lucas
  // can see what a brand already has before adding another with the same
  // name by accident — see loadCustomModelsByCustomer()'s header.
  const modelList = models.length
    ? `<p class="meta">Custom models: ${models.map((m) => `${esc(m.label)} (${esc(m.status)})`).join(', ')}</p>`
    : '';
  return `
<div class="card">
  <div class="row-head">
    <span class="ref">${esc(o.ref)}</span>
    <span class="pill is-${esc(o.status)}">${STATUS_LABEL[o.status] || esc(o.status)}</span>
  </div>
  <p class="meta">${esc(o.brand || '—')} · ${esc(o.email)} · ${esc(o.service)}/${esc(o.tier)} ·
     ${o.product_count ? `${esc(o.product_count)} products · ` : ''}window ${window} ·
     payment ${esc(o.payment_status)} · ${esc(when(o.created_at))}</p>
  <form class="controls" method="post" action="/admin/orders/${o.id}/status">
    <select name="status">${options}</select>
    <input type="text" name="note" placeholder="Note (optional, goes on the client's timeline too)" style="flex:1; min-width:12rem; padding:.5rem .6rem; border:1px solid var(--line-strong); background:var(--paper-lift); color:var(--ink);">
    <button class="btn btn-primary" type="submit">Update</button>
  </form>
  ${modelList}
  <form class="controls" method="post" action="/admin/orders/${o.id}/models">
    <input type="text" name="label" placeholder="New custom model label (e.g. 'Studio Look A')" style="flex:1; min-width:12rem; padding:.5rem .6rem; border:1px solid var(--line-strong); background:var(--paper-lift); color:var(--ink);" required>
    <button class="btn btn-ghost" type="submit">Add custom model</button>
  </form>
</div>`;
}

function errorBody(message) {
  return `<div class="bar"><a class="mark" href="/">VISUAILS</a></div><p class="error" style="margin-top:2rem">${esc(message)}</p>`;
}

function page({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="color-scheme" content="light">
<title>${esc(title)} — VISUAILS admin</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="stylesheet" href="/admin.css">
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}

/**
 * Response headers, matching portal.js's html()/security posture — this page
 * is even more sensitive (it changes state, not just approves photos), so
 * nothing here should be weaker than the portal's own defaults. See
 * portal.js's html() for what each header defends and why.
 */
function html(body, status = 200, extraSetCookies = []) {
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'same-origin',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
    'content-security-policy':
      "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  for (const c of extraSetCookies) headers.append('Set-Cookie', c);
  return new Response(body, { status, headers });
}

function seeOther(location, setCookies = []) {
  const headers = new Headers({ Location: location, 'cache-control': 'no-store', 'referrer-policy': 'same-origin' });
  for (const c of setCookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 303, headers });
}

function esc(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/** SQLite's datetime('now') has no timezone marker and IS UTC — same fix as token.js's parseStamp. */
function normalizeStamp(value) {
  if (!value) return value;
  return /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
}

function when(stamp) {
  if (!stamp) return '—';
  const t = Date.parse(normalizeStamp(stamp));
  if (Number.isNaN(t)) return '—';
  return new Date(t).toISOString().slice(0, 16).replace('T', ' ');
}
