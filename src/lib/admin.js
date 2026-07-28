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
    const admin = await currentAdmin(env, request);
    if (admin) return seeOther('/admin');
    return html(page({ title: 'Sign in', body: loginBody() }));
  }

  const admin = await currentAdmin(env, request);
  if (!admin) return seeOther('/admin/login');

  if (path === '/admin') {
    const [revisions, orders] = await Promise.all([loadRevisionInbox(env), loadOrders(env)]);
    return html(page({ title: 'Dashboard', body: dashboardBody(revisions, orders) }));
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
  const admin = await currentAdmin(env, request);
  if (!admin) return seeOther('/admin/login');
  if (!originIsSelf(request)) return html(page({ title: 'Admin', body: errorBody('Request origin did not match. Try again from the dashboard itself.') }), 403);

  if (path === '/admin/logout') return handleLogout(context, admin);

  const statusMatch = path.match(/^\/admin\/orders\/(\d+)\/status$/);
  if (statusMatch) return handleStatusUpdate(context, Number(statusMatch[1]));

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
    : await verifyPassword(password, DUMMY_HASH);

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
// cost as one against a real row. Precomputed at module load, once.
const DUMMY_HASH = await hashPassword('vis-admin-dummy-hash-constant-time-decoy');

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
// DATA
// ─────────────────────────────────────────────────────────────────────────────

async function currentAdmin(env, request) {
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
  // Best-effort touch; a failed write here should not cost the request a 500.
  env.DB.prepare('UPDATE admin_sessions SET last_used_at = datetime(\'now\') WHERE id = ?1')
    .bind(row.session_id).run().catch(() => {});
  return row;
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
    `SELECT id, ref, service, status, tier, brand, email, product_count,
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
 */
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

function dashboardBody(revisions, orders) {
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
${orders.length ? orders.map(orderCard).join('') : '<p class="empty">No orders yet.</p>'}`;
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

function orderCard(o) {
  const options = STATUSES.map(
    (s) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${STATUS_LABEL[s]}</option>`
  ).join('');
  const window = o.window_start ? `${esc(o.window_start)} → ${esc(o.window_end)}` : '—';
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
