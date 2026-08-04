// VISUAILS — /admin: the delivery mail, the brand model preview upload, and the
// status filter. August 2026.
//
// WHY THIS FILE EXISTS
//
// Two of the three things covered here had never worked, and neither failed
// loudly. That is the pattern worth testing for.
//
// §1 — SETTING AN ORDER TO DELIVERED NEVER EMAILED ANYONE. sendDeliveryMail()
// minted a second portal token, schema.sql:275 allows exactly one live token per
// order, and handleStatusUpdate calls the mail inside .catch(console.error) so
// that a Resend outage cannot turn a successful status change into an error
// page. The constraint violation went into that catch. delivered_at was written,
// the dashboard said delivered, and the customer was never told their images
// were ready. Every assertion here is about the SEQUENCE of writes, because the
// bug was a sequence and not a value.
//
// §2 — THE PICTURE AND THE PERMISSION. A brand model is offered to the customer
// only when it has a preview AND its status is past 'in_design'. Those were two
// separate forms, so the ordinary outcome of uploading a face was a face nobody
// could see. Also: `accept="image/*"` is a file-picker hint, not a check.
//
// §3 — the status filter Lucas asked for, including the part that is easy to get
// wrong: filtering must happen in the QUERY, because the list is capped at 200
// rows and "the received orders among the newest 200" is not "the received
// orders".
//
// Runs under plain `node` against hand-built D1 and R2 stubs — see
// tests/account-brand-kit.test.mjs's header for why that is the right shape.
import { adminGet, adminPost } from '../src/lib/admin.js';
import { mintToken } from '../src/lib/token.js';

const ORDERS = [
  { id: 91, customer_id: 7, ref: 'VIS-8K2-QQ1', service: 'catalog', status: 'received', tier: 'attended', brand: 'VOLT', email: 'studio@voltbrand.nl', product_count: 30, window_start: '2026-08-10', window_end: '2026-08-14', payment_status: 'paid', created_at: '2026-08-01', delivered_at: null, delivery_mailed_at: null, file_count: 0, lang: 'nl', name: 'Mara' },
  { id: 90, customer_id: 8, ref: 'VIS-7F4-M3A', service: 'lifestyle', status: 'delivered', tier: 'attended', brand: 'Kade', email: 'hi@kade.nl', product_count: 12, window_start: null, window_end: null, payment_status: 'paid', created_at: '2026-07-31', delivered_at: '2026-08-02', delivery_mailed_at: null, file_count: 6, lang: 'en', name: 'Ilse' },
];

const MODELS = {
  31: { id: 31, customer_id: 7, label: 'Nadia', status: 'in_design', preview_key: null },
  32: { id: 32, customer_id: 7, label: 'Tomas', status: 'locked', preview_key: 'models/7/32-tomas.jpg' },
};

function makeEnv() {
  const writes = [];
  const prepared = [];
  const mails = [];
  const puts = [];
  const models = JSON.parse(JSON.stringify(MODELS));

  const pick = (sql, binds) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM admin_sessions') || s.includes('FROM admin_users')) {
      return { admin_id: 1, id: 1, email: 'hello@visuails.com', expires_at: '2099-01-01' };
    }
    if (s.includes('FROM rate_limits')) return null;
    if (s.includes('FROM custom_models WHERE id')) return models[binds[0]] || null;
    if (s.includes('FROM custom_models')) return Object.values(models);
    if (s.includes('SELECT status, COUNT(*)')) {
      return [{ status: 'received', n: 2 }, { status: 'delivered', n: 41 }];
    }
    if (s.includes('COUNT(*) AS n FROM files')) return { n: 6 };
    if (s.includes('COUNT(*) AS n')) return { n: 1 };
    if (s.includes("review_state = 'revision_requested'")) return [];
    if (s.includes('FROM orders WHERE id')) return ORDERS.find((o) => o.id === binds[0]) || null;
    if (s.includes('FROM orders')) return binds.length ? ORDERS.filter((o) => o.status === binds[0]) : ORDERS;
    if (s.includes('FROM customers WHERE id')) return { id: 7, email: 'studio@voltbrand.nl', brand: 'VOLT' };
    if (s.includes('FROM customer_style_locks')) return [];
    return null;
  };

  const stmt = (sql) => {
    prepared.push(sql.replace(/\s+/g, ' '));
    const st = {
      sql,
      _b: [],
      bind(...a) { st._b = a; return st; },
      async first() { const r = pick(sql, st._b); return Array.isArray(r) ? r[0] : r; },
      async all() { const r = pick(sql, st._b); return { results: Array.isArray(r) ? r : (r ? [r] : []) }; },
      async run() { record(st); return { success: true }; },
    };
    return st;
  };

  const record = (st) => {
    const s = st.sql.replace(/\s+/g, ' ');
    if (!/^\s*(UPDATE|INSERT|DELETE)/i.test(st.sql)) return;
    writes.push({ sql: s, binds: st._b });
    // Keep the stub's own model rows in step, so a second request in the same
    // test sees what the first one wrote.
    const m = /UPDATE custom_models SET preview_key = \?1(, status = \?2)? WHERE id = \?(\d)/.exec(s);
    if (m) {
      const id = st._b[m[1] ? 2 : 1];
      if (models[id]) {
        models[id].preview_key = st._b[0];
        if (m[1]) models[id].status = st._b[1];
      }
    }
  };

  const DB = {
    writes,
    prepared,
    prepare: stmt,
    async batch(list) { for (const st of list) record(st); return list.map(() => ({ success: true })); },
  };

  const UPLOADS = {
    async put(key, body, opts) { puts.push({ key, type: opts?.httpMetadata?.contentType }); return { key }; },
    async get(key) {
      if (!key.startsWith('models/')) return null;
      return { body: 'JPEGBYTES', httpMetadata: { contentType: 'image/jpeg' } };
    },
  };

  return { DB, UPLOADS, mails, puts, models, RESEND_API_KEY: 'test-key' };
}

async function adminReq(method, path, { env, body, headers = {} } = {}) {
  const token = await mintToken();
  const init = {
    method,
    headers: {
      cookie: `vis_admin=${token}`,
      ...(method === 'POST' ? { origin: 'https://visuails.com' } : {}),
      ...headers,
    },
  };
  if (body) init.body = body;
  const request = new Request(`https://visuails.com${path}`, init);
  const res = method === 'POST'
    ? await adminPost({ request, env, waitUntil() {} })
    : await adminGet({ request, env, waitUntil() {} });
  return res;
}

let fails = 0;
const check = (name, cond, got = '') => {
  console.log(`${cond ? ' ok  ' : 'FAIL '} ${String(name).padEnd(62)} ${got}`);
  if (!cond) fails++;
};
const section = (n) => console.log(`\n${n}`);

const has = (writes, re) => writes.some((w) => re.test(w.sql));
const indexOfWrite = (writes, re) => writes.findIndex((w) => re.test(w.sql));

// Resend is called through src/lib/mail.js, which uses fetch. Intercept it
// rather than stubbing the module, so the real code path runs.
const realFetch = globalThis.fetch;
let sentMail = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('resend.com')) {
    sentMail.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: 'mail_1' }), { status: 200 });
  }
  return realFetch(url, init);
};

// ─────────────────────────────────────────────────────────────────────────────
section('§1 · setting an order to delivered actually emails the customer');
// ─────────────────────────────────────────────────────────────────────────────

{
  sentMail = [];
  const env = makeEnv();
  const body = new URLSearchParams({ status: 'delivered', note: '' });
  const res = await adminReq('POST', '/admin/orders/90/status', { env, body });

  const revokeAt = indexOfWrite(env.DB.writes, /UPDATE order_tokens SET revoked_at/);
  const insertAt = indexOfWrite(env.DB.writes, /INSERT INTO order_tokens/);

  check('the status change redirects, not errors', res.status === 303, res.status);
  check('delivered_at is stamped', has(env.DB.writes, /UPDATE orders SET delivered_at/));
  check('the live token is revoked first', revokeAt >= 0 && insertAt >= 0 && revokeAt < insertAt,
    `revoke@${revokeAt} insert@${insertAt}`);
  check('only ONE new token is minted',
    env.DB.writes.filter((w) => /INSERT INTO order_tokens/.test(w.sql)).length === 1);
  check('the revoke is scoped to live tokens on this order',
    /WHERE order_id = \?1 AND revoked_at IS NULL/.test(
      env.DB.writes.find((w) => /UPDATE order_tokens SET revoked_at/.test(w.sql)).sql));
  check('the customer is emailed', sentMail.length === 1, `${sentMail.length} mail(s)`);
  check('at their own address', sentMail[0]?.to === 'hi@kade.nl', sentMail[0]?.to);
  check('with a portal link in it', /\/p\/|portal/.test(sentMail[0]?.html || ''), 'link present');
  check('and delivery_mailed_at is written so it cannot send twice',
    has(env.DB.writes, /UPDATE orders SET delivery_mailed_at/));
}

// The guard: an order already announced must not be announced again.
{
  sentMail = [];
  const env = makeEnv();
  const order = ORDERS.find((o) => o.id === 90);
  const prev = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-08-02 10:00';
  await adminReq('POST', '/admin/orders/90/status', { env, body: new URLSearchParams({ status: 'delivered' }) });
  check('an order already announced is not emailed again', sentMail.length === 0, `${sentMail.length} mail(s)`);
  check('and no second token is minted for it', !has(env.DB.writes, /INSERT INTO order_tokens/));
  order.delivery_mailed_at = prev;
}

// A status that is not 'delivered' must touch none of this.
{
  sentMail = [];
  const env = makeEnv();
  await adminReq('POST', '/admin/orders/91/status', { env, body: new URLSearchParams({ status: 'in_production' }) });
  check('moving an order to in_production emails nobody', sentMail.length === 0);
  check('and mints no token', !has(env.DB.writes, /INSERT INTO order_tokens/));
}

// ─────────────────────────────────────────────────────────────────────────────
section('§2 · uploading a brand model photo, from admin to the customer');
// ─────────────────────────────────────────────────────────────────────────────

const jpeg = (name = 'nadia.jpg', bytes = 4096, type = 'image/jpeg') =>
  new File([new Uint8Array(bytes)], name, { type });

{
  const env = makeEnv();
  const fd = new FormData();
  fd.set('preview', jpeg());
  fd.set('publish', '1');
  const res = await adminReq('POST', '/admin/models/31/preview', { env, body: fd });

  check('the upload redirects back to the customer', res.status === 303, res.headers.get('location'));
  check('the file lands in R2 under the customer and model', env.puts[0]?.key === 'models/7/31-nadia.jpg', env.puts[0]?.key);
  check('stored with its real content type', env.puts[0]?.type === 'image/jpeg', env.puts[0]?.type);
  check('the key is written to the row', has(env.DB.writes, /UPDATE custom_models SET preview_key/));
  check('and the model is published in the SAME write',
    /SET preview_key = \?1, status = \?2/.test(
      env.DB.writes.find((w) => /UPDATE custom_models/.test(w.sql))?.sql || ''));
  check('promoted to approved, which is what the customer\'s account requires',
    env.models[31].status === 'approved', env.models[31].status);
}

{
  const env = makeEnv();
  const fd = new FormData();
  fd.set('preview', jpeg());          // no `publish` — the box was unticked
  await adminReq('POST', '/admin/models/31/preview', { env, body: fd });
  check('unticking "show it straight away" leaves the status alone',
    env.models[31].status === 'in_design', env.models[31].status);
  check('but the picture is still stored', env.puts.length === 1);
}

{
  const env = makeEnv();
  const fd = new FormData();
  fd.set('preview', jpeg('tomas2.jpg'));
  fd.set('publish', '1');
  await adminReq('POST', '/admin/models/32/preview', { env, body: fd });
  check('a locked model is not walked backwards to approved',
    env.models[32].status === 'locked', env.models[32].status);
}

{
  const env = makeEnv();
  const fd = new FormData();
  fd.set('preview', new File([new Uint8Array(2048)], 'brief.pdf', { type: 'application/pdf' }));
  const res = await adminReq('POST', '/admin/models/31/preview', { env, body: fd });
  check('a PDF is refused with a reason', res.status === 415, res.status);
  check('and nothing reaches the bucket', env.puts.length === 0);
  check('and the row is untouched', !has(env.DB.writes, /UPDATE custom_models/));
}

{
  const env = makeEnv();
  const fd = new FormData();
  fd.set('preview', new File([new Uint8Array(64)], 'logo.svg', { type: 'image/svg+xml' }));
  const res = await adminReq('POST', '/admin/models/31/preview', { env, body: fd });
  check('an SVG is refused too — it is a script container, not a photograph', res.status === 415, res.status);
}

{
  const env = makeEnv();
  const fd = new FormData();
  fd.set('preview', jpeg('huge.jpg', 13 * 1024 * 1024));
  const res = await adminReq('POST', '/admin/models/31/preview', { env, body: fd });
  check('a 13 MB file is refused', res.status === 413, res.status);
  check('and nothing reaches the bucket', env.puts.length === 0);
}

{
  const env = makeEnv();
  const res = await adminReq('GET', '/admin/models/32/image', { env });
  check('the studio can see the picture it uploaded', res.status === 200, res.status);
  check('served as an image', res.headers.get('content-type') === 'image/jpeg', res.headers.get('content-type'));
  check('never cached', /no-store/.test(res.headers.get('cache-control') || ''), res.headers.get('cache-control'));
  check('never indexed', /noindex/.test(res.headers.get('x-robots-tag') || ''));

  const miss = await adminReq('GET', '/admin/models/31/image', { env });
  check('a model with no picture 404s rather than serving a placeholder', miss.status === 404, miss.status);
}

{
  const env = makeEnv();
  const res = await adminReq('GET', '/admin/customers/7', { env });
  const html = await res.text();
  check('the customer page shows the picture, not just a filename',
    html.includes('src="/admin/models/32/image"'));
  check('and says so when there is none', html.includes('modelcard-img is-blank'));
  check('the publish checkbox ships checked', /name="publish" value="1" checked/.test(html));
}

// ─────────────────────────────────────────────────────────────────────────────
section('§3 · the status filter on the dashboard');
// ─────────────────────────────────────────────────────────────────────────────

{
  const env = makeEnv();
  const html = await (await adminReq('GET', '/admin', { env })).text();
  check('unfiltered, both orders are listed', html.includes('VIS-8K2-QQ1') && html.includes('VIS-7F4-M3A'));
  check('every status gets a chip, zeros included', ['received', 'in_production', 'human_check', 'delivered', 'cancelled']
    .every((s) => html.includes(`/admin?status=${s}`)));
  check('"all" is active', /fl-chip is-active" aria-current="true">All/.test(html));
  check('a delivered order that was never emailed says so', html.includes('has not been emailed'));
}

{
  const env = makeEnv();
  const html = await (await adminReq('GET', '/admin?status=received', { env })).text();
  check('filtered, only the received order is listed',
    html.includes('VIS-8K2-QQ1') && !html.includes('VIS-7F4-M3A'));
  // THE POINT OF THIS ONE. The dashboard list is capped at 200 rows. Filtering
  // after the fact would silently mean "the received orders among the 200 most
  // recent", which stops being "the received orders" exactly when the studio is
  // busiest. So the WHERE has to be IN the statement that carries the LIMIT.
  const listQuery = env.DB.prepared.find((q) => /FROM orders WHERE status = \?1/.test(q) && /LIMIT 200/.test(q));
  check('the filter is applied in the query that carries the LIMIT',
    !!listQuery, listQuery ? 'WHERE ... LIMIT 200' : 'NOT FOUND');
  check('the active chip is the one asked for', /fl-chip is-active" aria-current="true">Received/.test(html));
  check('the status form carries the filter back', /name="back" value="received"/.test(html));
}

{
  const env = makeEnv();
  const html = await (await adminReq('GET', '/admin?status=not_a_status', { env })).text();
  check('an unknown status shows everything rather than an empty dashboard',
    html.includes('VIS-8K2-QQ1') && html.includes('VIS-7F4-M3A'));
}

{
  const env = makeEnv();
  const res = await adminReq('POST', '/admin/orders/91/status', {
    env, body: new URLSearchParams({ status: 'in_production', back: 'received' }),
  });
  check('updating from a filtered list returns to that same filter',
    res.headers.get('location') === '/admin?status=received', res.headers.get('location'));

  const bogus = await adminReq('POST', '/admin/orders/91/status', {
    env, body: new URLSearchParams({ status: 'in_production', back: '/evil.example' }),
  });
  check('a hand-built "back" cannot redirect anywhere else',
    bogus.headers.get('location') === '/admin', bogus.headers.get('location'));
}

globalThis.fetch = realFetch;
console.log(`\n${fails ? `${fails} FAILED` : 'all passed'}`);
process.exit(fails ? 1 : 0);
