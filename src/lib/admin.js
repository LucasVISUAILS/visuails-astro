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

import { hashToken, mintToken, portalUrl } from './token.js';
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
import { sendMail } from './mail.js';

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

  // The two read-only routes added in August 2026. Both sit under /admin
  // deliberately — the session cookie is scoped there and the file header is
  // explicit that a route wanting to authenticate as the admin has to live
  // under this prefix rather than widening the cookie's path.
  const filesMatch = path.match(/^\/admin\/orders\/(\d+)\/files$/);
  if (filesMatch) return renderFiles(context, Number(filesMatch[1]));

  if (path === '/admin/customers') return renderCustomers(context);
  const customerMatch = path.match(/^\/admin\/customers\/(\d+)$/);
  if (customerMatch) return renderCustomer(context, Number(customerMatch[1]));

  const fileMatch = path.match(/^\/admin\/files\/(\d+)$/);
  if (fileMatch) return serveAdminFile(context, Number(fileMatch[1]));

  const modelImgMatch = path.match(/^\/admin\/models\/(\d+)\/image$/);
  if (modelImgMatch) return serveModelPreview(context, Number(modelImgMatch[1]));

  if (path === '/admin') {
    // ?status= narrows the order list — Lucas, August 2026: "als je op received
    // bijvoorbeeld klikt je alle orders ziet staan gesorteerd op received."
    // Checked against STATUSES rather than passed through: an unknown value
    // becomes no filter, because a dashboard showing nothing is the one failure
    // mode that reads as "there is no work" when there is.
    const wanted = url.searchParams.get('status') || '';
    const statusFilter = STATUSES.includes(wanted) ? wanted : '';

    const [revisions, orders, counts, statusCounts] = await Promise.all([
      loadRevisionInbox(env), loadOrders(env, statusFilter), loadTodayCounts(env), loadStatusCounts(env),
    ]);
    const modelsByCustomer = await loadCustomModelsByCustomer(env, orders.map((o) => o.customer_id));
    return html(page({
      title: statusFilter ? `Dashboard · ${STATUS_LABEL[statusFilter] || statusFilter}` : 'Dashboard',
      body: dashboardBody(revisions, orders, modelsByCustomer, counts, statusCounts, statusFilter),
    }));
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

  // Delivery upload — August 2026. The studio's own files going the other way.
  const uploadMatch = path.match(/^\/admin\/orders\/(\d+)\/deliver$/);
  if (uploadMatch) return handleDeliveryUpload(context, Number(uploadMatch[1]));

  const previewMatch = path.match(/^\/admin\/models\/(\d+)\/preview$/);
  if (previewMatch) return handleModelPreview(context, Number(previewMatch[1]));

  const modelStatusMatch = path.match(/^\/admin\/models\/(\d+)\/status$/);
  if (modelStatusMatch) return handleModelStatus(context, Number(modelStatusMatch[1]));

  // Adding a model from the CUSTOMER page rather than from an order card. Same
  // handler, reached by customer id instead of by order id — the existing route
  // resolves the customer through an order, which is the wrong way round when
  // you are already looking at the brand.
  const custModelMatch = path.match(/^\/admin\/customers\/(\d+)\/models$/);
  if (custModelMatch) return handleAddCustomModelForCustomer(context, Number(custModelMatch[1]));

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

async function handleStatusUpdate(context, orderId) {
  const { request, env } = context;
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

  // DELIVERED IS THE ONE STATUS THAT LEAVES THE BUILDING. Lucas asked for the
  // customer to be emailed a portal link at exactly this moment, so this is
  // where it hangs — off the status change itself rather than off the upload,
  // because uploading and announcing are different decisions. The studio
  // routinely puts files up before it is ready to say so.
  //
  // Not awaited into the response: the redirect back to the dashboard must not
  // wait on Resend, and a mail that fails must not turn a successful status
  // change into an error page. sendDeliveryMail() is idempotent on
  // delivery_mailed_at, so a retry cannot double-send.
  if (status === 'delivered') {
    await env.DB.prepare(
      "UPDATE orders SET delivered_at = COALESCE(delivered_at, datetime('now')) WHERE id = ?1"
    ).bind(orderId).run();
    await sendDeliveryMail(context, orderId).catch((err) => {
      console.error('[admin] delivery mail failed for order', orderId, '—', err && err.message ? err.message : err);
    });
  }

  // Back to the list this update was made from, filter and all. `back` came off
  // the form, so it is re-checked against STATUSES here rather than pasted into
  // a Location header — the same rule the filter itself follows on the way in.
  // Anything else redirects to the plain dashboard, which is where a form with
  // no `back` was always going.
  const back = String(form?.get('back') || '');
  return seeOther(STATUSES.includes(back) ? `/admin?status=${encodeURIComponent(back)}` : '/admin');
}


// ─────────────────────────────────────────────────────────────────────────────
// FILES — August 2026.
//
// WHY THIS EXISTS. Lucas placed a 30-product test order and the studio
// notification said "10 of 60 attached to this email. The rest are in R2 under
// the keys below." Correct, and unusable: fifty object keys and no way to open
// one. functions/api/order.js caps attachments at 10 files and 8 MB on purpose
// — a mail provider that rejects an oversized message would cost the
// notification itself, and that email is how the studio learns an order exists.
// So the email stays a heads-up and this is where the files actually are.
//
// A LIST OF LINKS, NOT A ZIP. Streaming a zip out of a Worker means writing a
// zip encoder or carrying a library into the bundle, and it buys one click. The
// problem being solved is that the files were unreachable, not that they took
// two clicks. If a whole-order download is wanted later, scripts/fetch-order.mjs
// already does it from a terminal and is the cheaper place to grow that.
//
// BOTH DIRECTIONS ON ONE PAGE. Intake (kind='upload') is what the customer
// sent; delivery (kind='delivery') is what the studio sent back. Seeing them
// together is the whole point of a per-order workbench — the question is never
// "what did they upload", it is "what did they upload and what have we
// delivered against it".
// ─────────────────────────────────────────────────────────────────────────────

async function loadOrderFiles(env, orderId) {
  const order = await env.DB.prepare(
    `SELECT id, ref, service, status, brand, name, email, lang, product_count
     FROM orders WHERE id = ?1`
  ).bind(orderId).first();
  if (!order) return null;
  const { results } = await env.DB.prepare(
    `SELECT id, kind, filename, bytes, product_key, shot, created_at
     FROM files WHERE order_id = ?1 ORDER BY kind, id`
  ).bind(orderId).all();
  return { order, files: results || [] };
}

async function renderFiles(context, orderId) {
  const { env } = context;
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  const data = await loadOrderFiles(env, orderId);
  if (!data) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  const { order, files } = data;
  const intake = files.filter((f) => f.kind === 'upload');
  const delivery = files.filter((f) => f.kind === 'delivery');

  const row = (f) => `<tr>
    <td>${esc(f.product_key || '')}</td>
    <td>${esc(f.shot || '')}</td>
    <td><a href="/admin/files/${f.id}">${esc(f.filename || `file-${f.id}`)}</a></td>
    <td class="num">${f.bytes ? Math.round(f.bytes / 1024) + ' kB' : ''}</td>
  </tr>`;

  const table = (rows, empty) => rows.length
    ? `<table class="files"><thead><tr><th>Product</th><th>Shot</th><th>File</th><th class="num">Size</th></tr></thead>
       <tbody>${rows.map(row).join('')}</tbody></table>`
    : `<p class="muted">${empty}</p>`;

  const body = `
  <p><a href="/admin">&larr; Dashboard</a></p>
  <h1>${esc(order.ref)}</h1>
  <p class="muted">${esc(order.brand || order.name || '')} &middot; ${esc(order.service)} &middot; ${esc(order.status)}${order.product_count ? ` &middot; ${order.product_count} products` : ''}</p>

  <h2>Client uploads (${intake.length})</h2>
  ${table(intake, 'Nothing was uploaded with this order.')}

  <h2>Delivered (${delivery.length})</h2>
  ${table(delivery, 'Nothing delivered yet.')}

  <h2>Upload the finished work</h2>
  <p class="muted">Files land against this order and appear in the client&rsquo;s portal. Setting the status to <strong>delivered</strong> on the dashboard is what emails them the link &mdash; uploading alone does not.</p>
  <form class="controls" method="post" action="/admin/orders/${order.id}/deliver" enctype="multipart/form-data">
    <input type="file" name="files" multiple required />
    <button type="submit">Upload</button>
  </form>
  `;
  return html(page({ title: order.ref, body }));
}

/**
 * Stream one file straight out of R2.
 *
 * The id is looked up rather than trusted, and the r2_key is never accepted
 * from the request — the same rule portal.js follows for a client. An admin
 * session is not a reason to let a path travel in a URL.
 */
async function serveAdminFile(context, fileId) {
  const { env } = context;
  if (!Number.isInteger(fileId)) return new Response('Bad id', { status: 400 });
  const row = await env.DB.prepare(
    'SELECT r2_key, filename FROM files WHERE id = ?1'
  ).bind(fileId).first();
  if (!row) return new Response('Not found', { status: 404 });
  if (!env.UPLOADS) return new Response('No bucket binding', { status: 503 });

  const obj = await env.UPLOADS.get(row.r2_key);
  if (!obj) return new Response('The object is not in the bucket', { status: 404 });

  const headers = new Headers();
  if (typeof obj.writeHttpMetadata === 'function') obj.writeHttpMetadata(headers);
  // attachment, not inline: this is a working file being collected, not
  // something to preview in a tab and then have to save again.
  headers.set('Content-Disposition', `attachment; filename="${(row.filename || 'file').replace(/"/g, '')}"`);
  headers.set('Cache-Control', 'private, no-store');
  return new Response(obj.body, { headers });
}

/**
 * The studio's finished files, going the other way.
 *
 * Writes kind='delivery' rows, which is what the client portal reads — see
 * portal.js's serveFile, which filters on exactly that. review_state defaults
 * to 'pending' in the schema, which is the honest starting point: an image
 * nobody has looked at yet is not an approved image.
 */
async function handleDeliveryUpload({ request, env }, orderId) {
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  const order = await env.DB.prepare('SELECT id, ref FROM orders WHERE id = ?1').bind(orderId).first();
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);
  if (!env.UPLOADS) return html(page({ title: 'Admin', body: errorBody('No R2 binding — cannot store files.') }), 503);

  const form = await request.formData().catch(() => null);
  const incoming = form ? form.getAll('files').filter((f) => f && typeof f === 'object' && f.size >= 0) : [];
  if (!incoming.length) return seeOther(`/admin/orders/${orderId}/files`);

  let stored = 0;
  const failed = [];
  for (const file of incoming) {
    const clean = String(file.name || 'file').split(/[\\/]/).pop().slice(0, 120) || 'file';
    // Under delivery/<ref>/ rather than intake/: the two directions are never
    // mixed in the bucket, so a lifecycle rule or a manual clean-up can tell
    // what a customer sent from what we made.
    const key = `delivery/${order.ref}/${String(stored + 1).padStart(3, '0')}-${clean}`;
    try {
      await env.UPLOADS.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      });
      await env.DB.prepare(
        `INSERT INTO files (order_id, kind, r2_key, filename, bytes)
         VALUES (?1, 'delivery', ?2, ?3, ?4)`
      ).bind(orderId, key, clean, file.size ?? null).run();
      stored++;
    } catch (err) {
      failed.push(`${clean}: ${err && err.message ? err.message : 'failed'}`);
    }
  }

  if (failed.length) {
    return html(page({
      title: 'Upload',
      body: errorBody(`${stored} stored, ${failed.length} failed:<br>${failed.map(esc).join('<br>')}`),
    }), 500);
  }
  return seeOther(`/admin/orders/${orderId}/files`);
}

/**
 * The delivery email, sent when — and only when — an order becomes delivered.
 *
 * Lucas: "als ik een bestelling op geleverd zet [wil ik dat] de klant een mail
 * krijgt met deze info en een link naar zijn portaal waar hij ze kan
 * downloaden."
 *
 * A FRESH TOKEN IS MINTED rather than reusing the one from the confirmation.
 * Only the hash of that first token was ever stored (src/lib/token.js), so the
 * original cannot be recovered — by design. Minting a second one is not a
 * workaround for that, it is the correct behaviour: the delivery mail is the
 * link people actually keep, and issuing it fresh means a confirmation
 * forwarded to a colleague months ago is not the key to the finished work.
 *
 * delivery_mailed_at is what stops a second send. Setting a status to delivered
 * twice is a thing that happens — a mis-click, a correction, a second admin —
 * and a customer receiving "your order is ready" twice reads as a mistake in
 * the studio rather than in the software.
 */
async function sendDeliveryMail(context, orderId) {
  const { request, env } = context;
  const order = await env.DB.prepare(
    `SELECT id, ref, email, name, lang, delivery_mailed_at FROM orders WHERE id = ?1`
  ).bind(orderId).first();
  if (!order || !order.email) return;
  if (order.delivery_mailed_at) return;

  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM files WHERE order_id = ?1 AND kind = 'delivery'"
  ).bind(orderId).first();
  const n = Number(count?.n || 0);

  const origin = (() => {
    try { return new URL(request.url).origin; } catch { return 'https://visuails.com'; }
  })();

  // ── REVOKE, THEN MINT. THIS ORDER CAN ONLY HAVE ONE LIVE TOKEN ─────────────
  //
  // This used to be a bare INSERT, and it meant the delivery mail NEVER WENT
  // OUT — not once, for any order. schema.sql:275 declares
  //
  //   CREATE UNIQUE INDEX idx_order_tokens_live
  //     ON order_tokens(order_id) WHERE revoked_at IS NULL
  //
  // and functions/api/order.js:379 already inserted a live token for this order
  // the moment it was placed. So the second insert hit "UNIQUE constraint
  // failed: order_tokens.order_id" and threw. handleStatusUpdate calls this
  // inside .catch(console.error) — deliberately, so a mail failure cannot turn
  // a successful status change into an error page — which meant the throw was
  // swallowed, delivered_at was already written, the dashboard showed success,
  // and the customer was simply never told their images were ready. Reproduced
  // against SQLite before this was changed.
  //
  // The fix is the one the schema was clearly built for: `revoked_at` exists,
  // portal.js:306 already renders a "this link has been replaced" page for a
  // token that has it, and nothing in the codebase had ever written it — a
  // column and a page waiting for the call that is now here.
  //
  // ONE batch, so the revoke and the insert cannot land apart. If they did, the
  // order would be left with either two live tokens (impossible — the index
  // refuses it) or none at all, and none means the customer's confirmation link
  // dies without a replacement being mailed.
  //
  // WHAT THE CUSTOMER SEES. The link in their confirmation email stops working
  // and the new one, in the mail below, takes over. That is a real cost — the
  // confirmation mail invites them to forward it to a colleague — and it is the
  // trade the one-live-token rule already chose. The replacement page names the
  // situation rather than 404ing, and the delivery mail goes to the same address
  // moments later.
  const token = mintToken();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE order_tokens SET revoked_at = datetime('now') WHERE order_id = ?1 AND revoked_at IS NULL"
    ).bind(orderId),
    env.DB.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?1, ?2)')
      .bind(orderId, await hashToken(token)),
  ]);
  const link = portalUrl(token, origin);

  const nl = order.lang === 'nl';
  const hi = order.name ? `Hi ${esc(order.name)},` : 'Hi,';
  const body = nl
    ? `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
        <p>${hi}</p>
        <p>Je bestelling <strong>${esc(order.ref)}</strong> is klaar${n ? ` — ${n} ${n === 1 ? 'beeld' : 'beelden'}` : ''}.</p>
        <p>In je portaal kun je alles bekijken, downloaden, en per beeld goedkeuren of een revisie aanvragen:<br>
           <a href="${esc(link)}">${esc(link)}</a></p>
        <p>Deze link is de sleutel tot je bestelling — stuur hem gerust door aan een collega die mee moet kijken.</p>
        <p style="color:#666;font-size:13px">VISUAILS &middot; Enschede, NL &middot; hello@visuails.com</p>
      </div>`
    : `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
        <p>${hi}</p>
        <p>Your order <strong>${esc(order.ref)}</strong> is ready${n ? ` — ${n} ${n === 1 ? 'image' : 'images'}` : ''}.</p>
        <p>Your portal has everything: view it, download it, and approve or ask for a revision image by image:<br>
           <a href="${esc(link)}">${esc(link)}</a></p>
        <p>That link is the key to the order — pass it on to a colleague who needs to look.</p>
        <p style="color:#666;font-size:13px">VISUAILS &middot; Enschede, NL &middot; hello@visuails.com</p>
      </div>`;

  await sendMail(env, {
    to: order.email,
    subject: nl ? `Je bestelling staat klaar — ${order.ref}` : `Your order is ready — ${order.ref}`,
    html: body,
  });

  await env.DB.prepare(
    "UPDATE orders SET delivery_mailed_at = datetime('now') WHERE id = ?1"
  ).bind(orderId).run();
}


// ─────────────────────────────────────────────────────────────────────────────
// THE NUMBERS, AND THE CUSTOMER VIEW — August 2026.
//
// Lucas: "zorg dat admin meer kan doen want het voelt nu best leeg terwijl
// admin pagina veel gebruikt gaat worden."
//
// It felt empty because it answered one question — what is the status of each
// order — and a dashboard that is opened all day has to answer the two that
// come before it: what needs me today, and who is this brand.
//
// WHAT WENT IN, AND WHAT DID NOT.
//
//   · A TODAY STRIP. Six counts, each one a thing that can be acted on rather
//     than a metric. "Revisions waiting" is work; "total orders ever" is a
//     number to feel something about, so it is not here.
//   · A CUSTOMERS PAGE. Orders are the unit of work but a BRAND is the unit of
//     relationship, and until now nothing in the admin grouped by one. It is
//     also where a brand's standing preferences finally became visible to the
//     studio: the customer sets a brand kit in their portal, the studio
//     produces against it, and the studio could not see it.
//   · NO CHARTS. A count you can read in a second beats a sparkline of the
//     same count, and this dashboard is opened between jobs rather than
//     studied.
// ─────────────────────────────────────────────────────────────────────────────

async function loadTodayCounts(env) {
  const one = async (sql, ...bind) => {
    try {
      const row = await env.DB.prepare(sql).bind(...bind).first();
      return Number(row?.n || 0);
    } catch { return 0; }
  };
  const [newToday, inProduction, checking, undelivered, unpaid, revisions] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM orders WHERE date(created_at) = date('now')"),
    one("SELECT COUNT(*) AS n FROM orders WHERE status = 'in_production'"),
    one("SELECT COUNT(*) AS n FROM orders WHERE status = 'human_check'"),
    // Not "not delivered" — an order that is cancelled is not waiting on
    // anybody, and counting it as work is how a dashboard starts lying.
    one("SELECT COUNT(*) AS n FROM orders WHERE status IN ('received','in_production','human_check')"),
    // Only what is actually owed: the test sample and anything with no total
    // priced against it are not debts, they are rows.
    one("SELECT COUNT(*) AS n FROM orders WHERE payment_status = 'unpaid' AND total_cents > 0"),
    one("SELECT COUNT(*) AS n FROM files WHERE review_state = 'revision_requested'"),
  ]);
  return { newToday, inProduction, checking, undelivered, unpaid, revisions };
}

function todayStrip(c) {
  const cell = (n, label, warn) =>
    `<div class="stat${warn && n ? ' is-warn' : ''}"><span class="stat-n">${n}</span><span class="stat-l">${esc(label)}</span></div>`;
  return `<div class="stats">
    ${cell(c.newToday, 'in today')}
    ${cell(c.inProduction, 'in production')}
    ${cell(c.checking, 'in review')}
    ${cell(c.undelivered, 'open')}
    ${cell(c.unpaid, 'unpaid', true)}
    ${cell(c.revisions, 'revisions', true)}
  </div>`;
}

async function loadCustomers(env) {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.email, c.brand, c.name, c.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS orders,
            (SELECT COALESCE(SUM(o.total_cents),0) FROM orders o
              -- orders.total_cents holds the NET figure (functions/api/order.js
              -- binds quote.netCents), while Mollie collects the gross. The
              -- column header says "excl. VAT" for that reason: a column headed
              -- "Paid" showing a number 21% below what actually arrived in the
              -- account is a revenue figure that quietly disagrees with the
              -- bank. Summing net and labelling it net is the honest pair —
              -- deriving a gross here would hardcode a rate that quote.js owns.
              WHERE o.customer_id = c.id AND o.payment_status = 'paid') AS paid_cents,
            (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id) AS last_order
       FROM customers c
      ORDER BY last_order IS NULL, last_order DESC, c.id DESC
      LIMIT 300`
  ).all();
  return results || [];
}

async function renderCustomers(context) {
  const { env } = context;
  const rows = await loadCustomers(env);
  const body = `
  <p><a href="/admin">&larr; Dashboard</a></p>
  <h1>Customers</h1>
  <p class="lede">${rows.length} brand${rows.length === 1 ? '' : 's'}</p>
  ${rows.length ? `<table class="files">
    <thead><tr><th>Brand</th><th>Email</th><th class="num">Orders</th><th class="num">Paid excl. VAT</th><th>Last order</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td><a href="/admin/customers/${r.id}">${esc(r.brand || r.name || '—')}</a></td>
      <td>${esc(r.email)}</td>
      <td class="num">${r.orders}</td>
      <td class="num">${r.paid_cents ? '€' + (r.paid_cents / 100).toFixed(2) : '—'}</td>
      <td>${esc((r.last_order || '').slice(0, 10) || '—')}</td>
    </tr>`).join('')}</tbody></table>` : '<p class="empty">No customers yet.</p>'}
  `;
  return html(page({ title: 'Customers', body }));
}

async function renderCustomer(context, customerId) {
  const { env } = context;
  if (!Number.isInteger(customerId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad customer id.') }), 400);
  }
  const customer = await env.DB.prepare(
    'SELECT id, email, brand, name, phone, website, vat_number, created_at FROM customers WHERE id = ?1'
  ).bind(customerId).first();
  if (!customer) return html(page({ title: 'Admin', body: errorBody('No such customer.') }), 404);

  const [orders, models, locks] = await Promise.all([
    env.DB.prepare(
      `SELECT id, ref, service, status, payment_status, total_cents, product_count, created_at
         FROM orders WHERE customer_id = ?1 ORDER BY id DESC LIMIT 100`
    ).bind(customerId).all().then((r) => r.results || []).catch(() => []),
    env.DB.prepare(
      'SELECT id, label, status, preview_key FROM custom_models WHERE customer_id = ?1 ORDER BY id DESC'
    ).bind(customerId).all().then((r) => r.results || []).catch(() => []),
    env.DB.prepare(
      `SELECT l.style, l.roster_model, l.background_hex, m.label AS custom_label
         FROM customer_style_locks l LEFT JOIN custom_models m ON m.id = l.custom_model_id
        WHERE l.customer_id = ?1`
    ).bind(customerId).all().then((r) => r.results || []).catch(() => []),
  ]);

  // THE BRAND KIT, READ-ONLY AND ON PURPOSE. The customer owns these settings
  // in their own portal; the studio needs to SEE them before producing, not
  // edit them behind the customer's back. A studio that can silently change a
  // brand's standing preference is a studio that will get blamed for a change
  // nobody made.
  const lockRows = locks.length
    ? `<table class="files"><thead><tr><th>Service</th><th>Face</th><th>Background</th></tr></thead><tbody>
       ${locks.map((l) => `<tr><td>${esc(l.style)}</td>
         <td>${esc(l.custom_label || l.roster_model || '—')}</td>
         <td>${esc(l.background_hex || '—')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="empty">No standing preferences set. Every order asks from scratch.</p>';

  // WHAT MAKES A MODEL ORDERABLE, spelled out on the card rather than left to
  // be learned. Two conditions, both visible here: it needs a picture, and it
  // has to be past 'in_design'. account.js's /account/me applies exactly that
  // filter, so a model failing either one is invisible to the customer — and a
  // studio that cannot see WHY is a studio that files a bug.
  const MODEL_STATUSES = ['in_design', 'approved', 'locked'];
  const modelRows = models.length
    ? models.map((m) => {
      const live = m.preview_key && m.status !== 'in_design';
      const missing = !m.preview_key
        ? 'No picture yet — the customer cannot pick it.'
        : m.status === 'in_design'
          ? 'Still in design — the customer cannot pick it.'
          : 'Live: the customer sees this as a tile when they order.';
      return `<div class="card modelcard">
        <div class="row-head"><span class="ref">${esc(m.label)}</span><span class="pill${live ? ' is-delivered' : ''}">${esc(m.status)}</span></div>
        <div class="modelcard-body">
          <!-- THE PICTURE ITSELF, not just the fact that a key exists. Before
               this the studio uploaded a file and got back a sentence saying a
               file was there — no way to see WHICH file, whether it was the
               right crop, or whether it was the right person. The customer saw
               the face and the studio did not. /admin/models/:id/image is that
               view, admin-authenticated, reading the key off the row exactly
               like every other file route here. -->
          ${m.preview_key
            ? `<img class="modelcard-img" src="/admin/models/${m.id}/image" alt="${esc(m.label)}" width="300" height="400" loading="lazy" decoding="async">`
            : '<span class="modelcard-img is-blank">no picture</span>'}
          <div class="modelcard-side">
            <p class="meta">${esc(missing)}</p>
            <form class="stack" method="post" action="/admin/models/${m.id}/preview" enctype="multipart/form-data">
              <input type="file" name="preview" accept="image/*" required />
              <!-- ONE ACTION, NOT TWO. Uploading the picture and making the
                   model orderable used to be separate forms with an undeclared
                   dependency between them: a face could sit in the customer's
                   account invisible for days because the status was still
                   'in_design' and nothing said so at the moment of upload. It
                   ships checked because uploading the photograph IS the moment
                   the model becomes real; unticking it is how you stage one
                   that is not ready to be seen. -->
              <label class="checkline">
                <input type="checkbox" name="publish" value="1" checked>
                <span>Show it in the customer's account straight away${m.status === 'in_design' ? '' : ' (already visible)'}</span>
              </label>
              <button class="btn btn-ghost" type="submit">${m.preview_key ? 'Replace picture' : 'Add picture'}</button>
            </form>
          </div>
        </div>
        <form class="controls" method="post" action="/admin/models/${m.id}/status">
          <select name="status">${MODEL_STATUSES.map((st) =>
            `<option value="${st}"${st === m.status ? ' selected' : ''}>${st}</option>`).join('')}</select>
          <button class="btn btn-ghost" type="submit">Set status</button>
        </form>
      </div>`;
    }).join('')
    : '<p class="empty">No models of their own yet. Every order still includes one of the ten standard faces.</p>';

  const orderRows = orders.length
    ? `<table class="files"><thead><tr><th>Ref</th><th>Service</th><th>Status</th><th>Payment</th><th class="num">Net</th><th>Placed</th></tr></thead><tbody>
       ${orders.map((o) => `<tr>
         <td><a href="/admin/orders/${o.id}/files">${esc(o.ref)}</a></td>
         <td>${esc(o.service)}${o.product_count ? ` · ${o.product_count}` : ''}</td>
         <td>${esc(o.status)}</td>
         <td>${esc(o.payment_status)}</td>
         <td class="num">${o.total_cents ? '€' + (o.total_cents / 100).toFixed(2) : '—'}</td>
         <td>${esc((o.created_at || '').slice(0, 10))}</td>
       </tr>`).join('')}</tbody></table>`
    : '<p class="empty">No orders yet.</p>';

  const body = `
  <p><a href="/admin/customers">&larr; Customers</a></p>
  <h1>${esc(customer.brand || customer.name || customer.email)}</h1>
  <p class="lede">${esc(customer.email)}${customer.vat_number ? ` · VAT ${esc(customer.vat_number)}` : ''}${customer.website ? ` · ${esc(customer.website)}` : ''}</p>

  <h2>Brand kit</h2>
  <p class="meta">Set by the customer in their own portal. Read-only here, deliberately.</p>
  ${lockRows}

  <h2>Custom models</h2>
  ${modelRows}
  <!-- ONE FORM, NOT TWO. Lucas: "hier voeg ik dan de foto toe" — adding a
       model and giving it a face is one action in his head and it should be one
       action here. The photo is optional so a model can still be created before
       there is anything to show, but the common path is both at once. -->
  <form class="controls" method="post" action="/admin/customers/${customer.id}/models" enctype="multipart/form-data">
    <input type="text" name="label" placeholder="New brand model name (e.g. 'Nora')" style="flex:1; min-width:12rem; padding:.5rem .6rem; border:1px solid var(--line-strong); background:var(--paper-lift); color:var(--ink);" required>
    <input type="file" name="preview" accept="image/*">
    <button class="btn btn-primary" type="submit">Add brand model</button>
  </form>
  <p class="meta">Only you see this. The moment a model has a picture it appears as a tile the customer can pick when they place an order.</p>

  <h2>Orders</h2>
  ${orderRows}
  `;
  return html(page({ title: customer.brand || customer.email, body }));
}

/**
 * A preview image for a custom model.
 *
 * custom_models.preview_key has existed since migration 0003 and nothing has
 * ever written to it — the same shape of gap orders.total_cents had. A brand
 * model with no picture is a label in a dropdown, which is exactly what the
 * customer's brand kit was reduced to before this.
 */
/**
 * Add a custom model from the customer page.
 *
 * The existing handler resolves a customer THROUGH an order, which is right
 * when you are looking at a job and wrong when you are looking at a brand — and
 * it cannot be used at all for a customer who has not ordered yet, which is
 * exactly when you would be setting one up.
 */
async function handleAddCustomModelForCustomer({ request, env }, customerId) {
  if (!Number.isInteger(customerId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad customer id.') }), 400);
  }
  const exists = await env.DB.prepare('SELECT id FROM customers WHERE id = ?1').bind(customerId).first();
  if (!exists) return html(page({ title: 'Admin', body: errorBody('No such customer.') }), 404);

  const form = await request.formData().catch(() => null);
  const label = String(form?.get('label') || '').trim().slice(0, 80);
  if (!label) return seeOther(`/admin/customers/${customerId}`);

  await env.DB.prepare(
    "INSERT INTO custom_models (customer_id, label, status) VALUES (?1, ?2, 'in_design')"
  ).bind(customerId, label).run();

  // The picture, if one came with it. Looked up rather than assumed: D1 has no
  // RETURNING here, and last_insert_rowid across a fresh prepare is not a
  // promise worth relying on when a re-read by (customer, label) is exact.
  const file = form && form.get('preview');
  if (file && typeof file === 'object' && file.size && env.UPLOADS) {
    const row = await env.DB.prepare(
      'SELECT id FROM custom_models WHERE customer_id = ?1 AND label = ?2 ORDER BY id DESC LIMIT 1'
    ).bind(customerId, label).first();
    if (row?.id) {
      const clean = String(file.name || 'preview').split(/[\\/]/).pop().slice(0, 100) || 'preview';
      const key = `models/${customerId}/${row.id}-${clean}`;
      await env.UPLOADS.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      });
      await env.DB.prepare('UPDATE custom_models SET preview_key = ?1 WHERE id = ?2')
        .bind(key, row.id).run();
    }
  }

  return seeOther(`/admin/customers/${customerId}`);
}

/**
 * Move a brand model between in_design, approved and locked.
 *
 * This is the switch that decides whether a customer can order against a face.
 * It exists because /account/me refuses to offer an 'in_design' model, and
 * without a control the studio could create a model, give it a picture, and
 * never understand why it did not appear.
 */
async function handleModelStatus({ request, env }, modelId) {
  if (!Number.isInteger(modelId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad model id.') }), 400);
  }
  const model = await env.DB.prepare(
    'SELECT id, customer_id FROM custom_models WHERE id = ?1'
  ).bind(modelId).first();
  if (!model) return html(page({ title: 'Admin', body: errorBody('No such model.') }), 404);

  const form = await request.formData().catch(() => null);
  const status = String(form?.get('status') || '');
  // The three the schema documents, checked rather than trusted: a status this
  // codebase does not know about would make the model invisible everywhere and
  // look like data loss.
  if (!['in_design', 'approved', 'locked'].includes(status)) {
    return seeOther(`/admin/customers/${model.customer_id}`);
  }

  await env.DB.prepare('UPDATE custom_models SET status = ?1 WHERE id = ?2')
    .bind(status, modelId).run();
  return seeOther(`/admin/customers/${model.customer_id}`);
}

/** Images only, and a ceiling. See handleModelPreview() for why both. */
const PREVIEW_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const PREVIEW_MAX_BYTES = 12 * 1024 * 1024;

async function handleModelPreview({ request, env }, modelId) {
  if (!Number.isInteger(modelId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad model id.') }), 400);
  }
  const model = await env.DB.prepare(
    'SELECT id, customer_id, status FROM custom_models WHERE id = ?1'
  ).bind(modelId).first();
  if (!model) return html(page({ title: 'Admin', body: errorBody('No such model.') }), 404);
  if (!env.UPLOADS) return html(page({ title: 'Admin', body: errorBody('No R2 binding.') }), 503);

  const form = await request.formData().catch(() => null);
  const file = form && form.get('preview');
  if (!file || typeof file !== 'object' || !file.size) {
    return seeOther(`/admin/customers/${model.customer_id}`);
  }

  // ── WHAT IS ALLOWED THROUGH, AND WHY IT IS CHECKED HERE ────────────────────
  //
  // `accept="image/*"` on the input is a file-picker filter and nothing more —
  // it is trivially bypassed and it is not a check. This IS the check, and it
  // matters more than usual because of where the bytes end up: on a tile in a
  // paying customer's own account. A PDF stored here renders as a broken image
  // in the brand kit, and addBrandModels() in pipeline.js REMOVES a tile whose
  // picture fails to load — so a bad upload becomes a face that silently is not
  // offered, which is precisely the class of bug this whole page exists to make
  // visible. An explicit list rather than a `startsWith('image/')`: image/svg+xml
  // is an image by that test and a script container in practice.
  const type = String(file.type || '').toLowerCase();
  if (!PREVIEW_TYPES.includes(type)) {
    return html(page({
      title: 'Admin',
      body: errorBody(
        `"${esc(String(file.name || 'that file'))}" is ${esc(type || 'of an unknown type')}. `
        + 'A brand model preview has to be a JPEG, PNG, WebP or AVIF — it is shown to the customer as a photograph.'
      ),
    }), 415);
  }
  if (file.size > PREVIEW_MAX_BYTES) {
    return html(page({
      title: 'Admin',
      body: errorBody(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The preview is drawn at about 400px wide in `
        + 'the customer\'s brand kit, so anything over 12 MB is bytes they wait for and never see.'
      ),
    }), 413);
  }

  const clean = String(file.name || 'preview').split(/[\\/]/).pop().slice(0, 100) || 'preview';
  const key = `models/${model.customer_id}/${modelId}-${clean}`;
  await env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: type },
  });

  // ── THE PICTURE AND THE PERMISSION, IN ONE WRITE ───────────────────────────
  //
  // A model is offered to the customer only when it has a preview AND its status
  // is past 'in_design' — /account/me applies both, and so does the brand kit's
  // own picker. Those were two forms on this page with an undeclared dependency
  // between them, which is a face uploaded on Monday and invisible until someone
  // remembers the dropdown on Thursday. The checkbox ships checked, so the
  // ordinary path is one action; unticking it stages a picture that is not ready
  // to be seen.
  //
  // Only ever 'in_design' -> 'approved'. A model already at 'locked' is left
  // where it is: locked is further along, and quietly walking it backwards
  // because someone replaced a photograph would be this handler deciding
  // something it was not asked to decide.
  const publish = form.get('publish') === '1';
  if (publish && model.status === 'in_design') {
    await env.DB.batch([
      env.DB.prepare('UPDATE custom_models SET preview_key = ?1, status = ?2 WHERE id = ?3')
        .bind(key, 'approved', modelId),
    ]);
  } else {
    await env.DB.prepare('UPDATE custom_models SET preview_key = ?1 WHERE id = ?2')
      .bind(key, modelId).run();
  }

  return seeOther(`/admin/customers/${model.customer_id}`);
}

/**
 * The brand model preview, served back to the studio.
 *
 * The customer has had this route since August 2026 (account.js's
 * handleModelPreviewImage) and the studio did not, which is backwards: the
 * people uploading the file could not see what they had uploaded. Same two
 * rules that route follows — the R2 key comes off the row and never from the
 * URL, and a miss is a 404 rather than a placeholder, so a broken preview looks
 * broken here rather than looking like a design decision.
 */
async function serveModelPreview({ env }, modelId) {
  if (!Number.isInteger(modelId)) return new Response('Bad id', { status: 400 });
  const row = await env.DB.prepare(
    'SELECT preview_key FROM custom_models WHERE id = ?1'
  ).bind(modelId).first();
  if (!row?.preview_key) return new Response('Not found', { status: 404 });
  if (!env.UPLOADS) return new Response('No bucket binding', { status: 503 });

  const obj = await env.UPLOADS.get(row.preview_key);
  if (!obj) return new Response('The object is not in the bucket', { status: 404 });

  return new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
      // Same as every other admin file route: never cached, never indexed.
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
    },
  });
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

/**
 * Is this request carrying a live admin session? Exported so a diagnostic
 * endpoint outside this file can stand behind the same login rather than
 * inventing a second, weaker gate — a debug route that reports on a payment
 * provider is not something to leave open to the internet, and a second shared
 * secret is one more thing to leak.
 *
 * Read-only by design: it deliberately does NOT touch last_used_at, because
 * hitting a debug page is not the admin using the dashboard and should not
 * extend a session's idle life.
 */
export async function hasAdminSession(context) {
  try {
    const { env, request } = context;
    if (!env?.DB) return false;
    const token = readSessionCookie(request);
    if (!token) return false;
    const row = await env.DB.prepare(
      'SELECT expires_at FROM admin_sessions WHERE token_hash = ?1'
    ).bind(await hashToken(token)).first();
    return !!row && Date.parse(normalizeStamp(row.expires_at)) > Date.now();
  } catch {
    return false;
  }
}

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

/**
 * Recent orders, active ones first — "duidelijk overzicht van wat er gedaan
 * moet worden."
 *
 * FILTERED IN SQL, NOT IN JS, and the difference matters here in a way it does
 * not in account.js. That page filters a customer's own orders in memory
 * because it already holds all of them. This query is capped at 200 rows across
 * every brand on the site, so filtering after the fact would mean "the received
 * orders among the 200 most recent" — which silently stops being "the received
 * orders" the moment the studio is busy. The cap has to apply to the filtered
 * set, so the WHERE has to be in the statement.
 *
 * `status` is validated by the caller against STATUSES before it arrives; this
 * function still treats anything falsy as "no filter" rather than binding it,
 * so a bug upstream shows up as an unfiltered list and never as a query with an
 * empty string in it.
 */
async function loadOrders(env, status = '') {
  const where = status ? 'WHERE status = ?1' : '';
  const stmt = env.DB.prepare(
    // file_count added August 2026 so the Files link on each card can say how
    // many there are without a second query per order. A correlated subquery
    // rather than a join, because a join would multiply the order rows and
    // every column above would then need a GROUP BY it does not otherwise want.
    // delivered_at / delivery_mailed_at are read so the card can say whether
    // the customer was actually TOLD. They are two different facts and the
    // difference is not academic: the delivery mail is sent on a best-effort
    // path (see handleStatusUpdate's .catch), so "delivered" and "delivered and
    // announced" can and do come apart.
    `SELECT id, customer_id, ref, service, status, tier, brand, email, product_count,
            window_start, window_end, payment_status, created_at,
            delivered_at, delivery_mailed_at,
            (SELECT COUNT(*) FROM files f WHERE f.order_id = orders.id) AS file_count
       FROM orders
      ${where}
      ORDER BY
        CASE status WHEN 'received' THEN 0 WHEN 'in_production' THEN 1
                    WHEN 'human_check' THEN 2 WHEN 'delivered' THEN 3
                    ELSE 4 END,
        id DESC
      LIMIT 200`
  );
  const res = await (status ? stmt.bind(status) : stmt).all();
  return res.results || [];
}

/**
 * How many orders sit at each status, all of them, ignoring the 200-row cap
 * above — because the filter row has to be able to say "delivered 412" while
 * the list below it shows the newest 200. One grouped query rather than five
 * counts, and it returns a plain object so the renderer can read a status that
 * has no rows as 0 without testing for undefined.
 */
async function loadStatusCounts(env) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const res = await env.DB.prepare(
    'SELECT status, COUNT(*) AS n FROM orders GROUP BY status'
  ).all();
  for (const row of res.results || []) {
    if (Object.prototype.hasOwnProperty.call(counts, row.status)) counts[row.status] = row.n;
  }
  return counts;
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

// PATH=/admin IS LOAD-BEARING, AND IT CATCHES PEOPLE OUT.
// The browser attaches this cookie to `/admin/...` and to nothing else. That is
// the point — an ambient credential should travel as narrowly as it can — but
// it means **any new route that wants to authenticate as the admin has to live
// under /admin**. A route at `/api/whatever` will not receive this cookie, will
// see no session, and will tell a visibly-signed-in browser to sign in. That
// happened once already (functions/admin/debug-mollie.js, which started life at
// /api/debug-mollie). Move the route; do not widen the path.
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

function dashboardBody(revisions, orders, modelsByCustomer, counts, statusCounts, statusFilter = '') {
  return `
<div class="bar">
  <a class="mark" href="/">VISUAILS</a>
  <div class="bar-right">
    <span>Admin</span>
    <form method="post" action="/admin/logout"><button class="btn btn-ghost" type="submit">Sign out</button></form>
  </div>
</div>
<h1>Dashboard</h1>
<p class="lede"><a href="/admin/customers">Customers &rarr;</a></p>
${counts ? todayStrip(counts) : ''}

<h2>Revision requests</h2>
${revisions.length ? revisions.map(revisionCard).join('') : '<p class="empty">Nothing waiting. A client\'s "request a revision" in their portal lands here, with their note.</p>'}

<h2>Orders${statusFilter ? ` · ${esc(STATUS_LABEL[statusFilter] || statusFilter)}` : ''}</h2>
${statusFilterRow(statusCounts, statusFilter)}
${orders.length
  ? orders.map((o) => orderCard(o, modelsByCustomer.get(o.customer_id) || [], statusFilter)).join('')
  : statusFilter
    ? `<p class="empty">Nothing at "${esc(STATUS_LABEL[statusFilter] || statusFilter)}" right now. <a href="/admin">All orders</a></p>`
    : '<p class="empty">No orders yet.</p>'}`;
}

/**
 * The status filter — a row of links, one per status, each carrying its count.
 *
 * EVERY STATUS IS SHOWN HERE, including the ones with no orders, which is the
 * opposite of what account.js does with the same control and the difference is
 * deliberate. A customer's chip row is about their own history, so an empty
 * status is noise. This row is a tool Lucas uses all day, and a "cancelled"
 * link that appears and disappears depending on the week is a control whose
 * position he cannot learn. A 0 here is information: it says nothing is stuck.
 *
 * The active one is a <span> rather than a link to the page you are already on.
 */
function statusFilterRow(statusCounts, statusFilter) {
  if (!statusCounts) return '';
  const total = STATUSES.reduce((n, s) => n + (statusCounts[s] || 0), 0);
  const chip = (href, label, n, active) => active
    ? `<span class="fl-chip is-active" aria-current="true">${esc(label)} <span class="fl-n">${n}</span></span>`
    : `<a class="fl-chip" href="${esc(href)}">${esc(label)} <span class="fl-n">${n}</span></a>`;

  return `<nav class="fl" aria-label="Filter orders by status">
    ${chip('/admin', 'All', total, !statusFilter)}
    ${STATUSES.map((s) => chip(
      `/admin?status=${encodeURIComponent(s)}`,
      STATUS_LABEL[s] || s,
      statusCounts[s] || 0,
      statusFilter === s,
    )).join('')}
  </nav>`;
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

function orderCard(o, models, statusFilter = '') {
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

  // DELIVERED, BUT WAS THEY TOLD? The mail is deliberately not awaited into the
  // response and its failure is deliberately swallowed — a mail that fails must
  // not turn a successful status change into an error page. The cost of that
  // choice is silence, and this line is what pays it back: the one place the
  // studio can see that an order is marked delivered and the customer still
  // does not know. Pressing Update on 'delivered' again retries the send —
  // sendDeliveryMail is guarded on delivery_mailed_at, which is exactly the
  // column that is still empty here, so a retry is safe and cannot double-send.
  const unannounced = o.status === 'delivered' && !o.delivery_mailed_at
    ? '<p class="warnline">Delivered, but the customer has not been emailed. Set the status to <strong>delivered</strong> again to retry the mail.</p>'
    : '';
  return `
<div class="card">
  <div class="row-head">
    <span class="ref">${esc(o.ref)}</span>
    <span class="pill is-${esc(o.status)}">${STATUS_LABEL[o.status] || esc(o.status)}</span>
    <!-- The way in to this order's files, both directions. Added August 2026,
         when the 30-product test order made it clear the notification email is
         a heads-up and not a delivery mechanism. -->
    <a class="files-link" href="/admin/orders/${o.id}/files">Files${o.file_count ? ` (${o.file_count})` : ''}</a>
  </div>
  <p class="meta">${esc(o.brand || '—')} · ${esc(o.email)} · ${esc(o.service)}/${esc(o.tier)} ·
     ${o.product_count ? `${esc(o.product_count)} products · ` : ''}window ${window} ·
     payment ${esc(o.payment_status)} · ${esc(when(o.created_at))}</p>
  <form class="controls" method="post" action="/admin/orders/${o.id}/status">
    <!-- Where to go back to. Without this, moving one order out of a filtered
         list drops Lucas back on the unfiltered dashboard and he has to re-pick
         the filter after every single update — which is the whole working
         session, not an edge case. handleStatusUpdate re-validates it against
         STATUSES rather than trusting the round trip. -->
    ${statusFilter ? `<input type="hidden" name="back" value="${esc(statusFilter)}">` : ''}
    <select name="status">${options}</select>
    <input type="text" name="note" placeholder="Note (optional, goes on the client's timeline too)" style="flex:1; min-width:12rem; padding:.5rem .6rem; border:1px solid var(--line-strong); background:var(--paper-lift); color:var(--ink);">
    <button class="btn btn-primary" type="submit">Update</button>
  </form>
  ${unannounced}
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
