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
import { adminGet, adminPost, guessProductShot } from '../src/lib/admin.js';
import { mintToken } from '../src/lib/token.js';
/* De bewaartermijn wordt geïmporteerd en niet ingetypt: een toets die 12
   intypt, bewijst dat 12 nog steeds 12 is. */
import { DELIVERY_MONTHS } from '../src/lib/retention.js';

const ORDERS = [
  { id: 91, customer_id: 7, ref: 'VIS-8K2-QQ1', service: 'catalog', status: 'received', tier: 'attended', brand: 'VOLT', email: 'studio@voltbrand.nl', product_count: 30, window_start: '2026-08-10', window_end: '2026-08-14', payment_status: 'paid', total_cents: 102000, vat_cents: 21420, paid_at: '2026-08-01', created_at: '2026-08-01', delivered_at: null, delivery_mailed_at: null, file_count: 0, lang: 'nl', name: 'Mara' },
  { id: 90, customer_id: 8, ref: 'VIS-7F4-M3A', service: 'lifestyle', status: 'delivered', tier: 'attended', brand: 'Kade', email: 'hi@kade.nl', product_count: 12, window_start: null, window_end: null, payment_status: 'paid', total_cents: 48000, vat_cents: 10080, paid_at: '2026-07-31', created_at: '2026-07-31', delivered_at: '2026-08-02', delivery_mailed_at: null, file_count: 6, lang: 'en', name: 'Ilse' },
];

const MODELS = {
  31: { id: 31, customer_id: 7, label: 'Nadia', status: 'in_design', preview_key: null },
  32: { id: 32, customer_id: 7, label: 'Tomas', status: 'locked', preview_key: 'models/7/32-tomas.jpg' },
};

function makeEnv(opts = {}) {
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
    // De twee tellingen van de herleveringsknop, vóór de algemene
    // bestandstelling — anders vangt die regel ze allebei op en telt elke
    // bestelling zes onaangekondigde beelden.
    // TELLINGEN EERST, DAN DE LIJST. `SELECT COUNT(*) ... FROM files WHERE
    // order_id = ?1` bevat óók "FROM files WHERE order_id", dus de lijstregel
    // hieronder vangt hem af als hij eerder staat — en dan telt de
    // leveringsmail nul beelden zonder dat er iets omvalt.
    if (s.includes('announced_at IS NULL')) return { n: opts.unannounced ?? 0 };
    if (s.includes('FROM revision_requests')) return { n: opts.openRevisions ?? 0 };
    if (s.includes('COUNT(*) AS n FROM files')) return { n: 6 };
    // De bestandenlijst van één bestelling — de pagina waar de meldknop op staat.
    if (s.includes("SELECT id FROM files WHERE order_id")) return (opts.deliveryIds || []).map((id) => ({ id }));
    // Vóór de algemene bestandenregel: deze twee queries vragen iets anders van
    // dezelfde tabel, en wie eerst staat wint.
    if (s.includes('r2_key, preview_key FROM files')) return opts.keys || [];
    if (s.includes('FROM files f JOIN orders o ON o.id = f.order_id')) return opts.keys || [];
    if (s.includes('FROM files WHERE order_id')) return opts.files || [];
    if (s.includes('FROM order_notes')) return opts.notes || [];
    if (s.includes('FROM admin_log')) return [];
    if (s.includes('r2_key, preview_key FROM files')) return opts.keys || [];
    if (s.includes('FROM customers WHERE id')) return opts.customer || { id: 7, email: 'studio@voltbrand.nl', brand: 'VOLT', name: 'Mara' };
    // De opzoekactie van handleRevisionResolve. Moet vóór de generieke
    // revision_requested-regel staan, anders krijgt hij een lege lijst terug en
    // stopt de handler stil.
    if (s.includes('SELECT id, order_id FROM files WHERE id')) return { id: binds[0], order_id: 90 };
    if (s.includes('COUNT(*) AS n')) return { n: 1 };
    if (s.includes("review_state = 'revision_requested'")) return [];
    if (s.includes('FROM orders WHERE customer_id')) return ORDERS;
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

  const deletes = [];
  const UPLOADS = {
    async delete(key) { deletes.push(key); },
    async put(key, body, opts) { puts.push({ key, type: opts?.httpMetadata?.contentType }); return { key }; },
    async get(key) {
      if (!key.startsWith('models/')) return null;
      return { body: 'JPEGBYTES', httpMetadata: { contentType: 'image/jpeg' } };
    },
  };

  return { DB, UPLOADS, mails, puts, deletes, models, RESEND_API_KEY: 'test-key' };
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

// ─────────────────────────────────────────────────────────────────────────────
section('§4 · de herlevering — "je revisie staat klaar", los van de eerste mail');
// ─────────────────────────────────────────────────────────────────────────────
//
// WAAROM DIT GETEST WORDT. De revisieknop in het klantportaal eindigde in
// stilte: orders.delivery_mailed_at zorgt ervoor dat "je bestelling staat
// klaar" één keer verstuurd wordt, en dus werd er na een opgeloste revisie
// nooit meer iets gemaild. De reparatie is een tweede mailsoort met een eigen
// teller, en de hele waarde ervan zit in vier dingen die geen van alle luid
// falen: hij verstuurt niet als er niets nieuws is, hij stempelt pas ná een
// geslaagde verzending, hij laat delivery_mailed_at met rust, en hij mag niet
// de eerste aankondiging zijn.

// Het normale geval: drie nieuwe beelden, twee openstaande revisies.
{
  sentMail = [];
  const env = makeEnv({ unannounced: 3, openRevisions: 2 });
  const order = ORDERS.find((o) => o.id === 90);
  const prev = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-08-02 10:00';

  const res = await adminReq('POST', '/admin/orders/90/announce', {
    env, body: new URLSearchParams({ note: 'Achtergrond op beeld 4 rechtgetrokken.' }),
  });

  check('the announce redirects back to the files page with a count',
    res.headers.get('location') === '/admin/orders/90/files?announced=3', res.headers.get('location'));
  check('exactly one mail goes out', sentMail.length === 1, `${sentMail.length} mail(s)`);
  check('it is the REVISION mail, not the delivery mail',
    /revision is ready/i.test(sentMail[0]?.subject || ''), sentMail[0]?.subject);
  check('the studio note travels with it',
    /beeld 4 rechtgetrokken/.test(sentMail[0]?.html || ''));
  check('the files are stamped as announced',
    has(env.DB.writes, /UPDATE files SET announced_at/));
  check('the re-delivery counter goes up',
    has(env.DB.writes, /UPDATE orders SET redelivery_mailed_at[\s\S]*redelivery_count/));
  // DE KERN VAN LUCAS' EIS. De eerste aankondiging houdt zijn eigen bewaker.
  check('delivery_mailed_at is NOT touched',
    !has(env.DB.writes, /UPDATE orders SET delivery_mailed_at/));
  check('the customer gets a working link (old token revoked, new one minted)',
    has(env.DB.writes, /UPDATE order_tokens SET revoked_at/) && has(env.DB.writes, /INSERT INTO order_tokens/));
  check('and it lands on their timeline too',
    has(env.DB.writes, /INSERT INTO order_events/));

  order.delivery_mailed_at = prev;
}

// Niets nieuws: de knop mag dan niets doen. Dit is de dubbelklik, en aan de
// kant van de klant is een tweede identieke mail niet te onderscheiden van een
// studio die zichzelf herhaalt.
{
  sentMail = [];
  const env = makeEnv({ unannounced: 0, openRevisions: 1 });
  const order = ORDERS.find((o) => o.id === 90);
  const prev = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-08-02 10:00';

  const res = await adminReq('POST', '/admin/orders/90/announce', { env, body: new URLSearchParams() });

  check('nothing unannounced means no mail', sentMail.length === 0, `${sentMail.length} mail(s)`);
  check('and no token is burned for a mail that was not sent',
    !has(env.DB.writes, /INSERT INTO order_tokens/));
  check('the page says so rather than erroring',
    res.headers.get('location') === '/admin/orders/90/files?announced=none', res.headers.get('location'));

  order.delivery_mailed_at = prev;
}

// Een bestelling die nog nooit is aangekondigd. "Je revisie staat klaar" als
// allereerste bericht verwijst naar iets wat de klant nog nooit gezien heeft.
{
  sentMail = [];
  const env = makeEnv({ unannounced: 4, openRevisions: 0 });   // order 91: delivery_mailed_at is null
  const res = await adminReq('POST', '/admin/orders/91/announce', { env, body: new URLSearchParams() });

  check('a never-announced order is refused', res.status === 400, res.status);
  check('and nothing is mailed', sentMail.length === 0, `${sentMail.length} mail(s)`);
  check('and nothing is stamped', !has(env.DB.writes, /UPDATE files SET announced_at/));
}

// Bijgeleverd zonder dat er om gevraagd is: dan is het geen revisie, en dat
// hoort de mail ook niet te beweren.
{
  sentMail = [];
  const env = makeEnv({ unannounced: 2, openRevisions: 0 });
  const order = ORDERS.find((o) => o.id === 90);
  const prev = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-08-02 10:00';

  await adminReq('POST', '/admin/orders/90/announce', { env, body: new URLSearchParams() });

  check('with no revisions open it announces new images, not a revision',
    /new images/i.test(sentMail[0]?.subject || '') && !/revision/i.test(sentMail[0]?.subject || ''),
    sentMail[0]?.subject);

  order.delivery_mailed_at = prev;
}

// De pagina zelf: de knop moet er staan met het juiste aantal erop, en bij een
// bestelling die nog nooit is aangekondigd moet hij er juist NIET staan.
{
  const env = makeEnv({
    unannounced: 2,
    files: [
      { id: 10, kind: 'delivery', filename: 'volt-01.webp', bytes: 900000, product_key: 'p1', shot: 'front', created_at: '2026-08-02 09:00', announced_at: '2026-08-02 10:00' },
      { id: 11, kind: 'delivery', filename: 'volt-02.webp', bytes: 910000, product_key: 'p1', shot: 'back', created_at: '2026-08-05 12:00', announced_at: null },
      { id: 12, kind: 'delivery', filename: 'volt-03.webp', bytes: 880000, product_key: 'p2', shot: 'front', created_at: '2026-08-05 12:01', announced_at: null },
    ],
  });
  const order = ORDERS.find((o) => o.id === 90);
  const prev = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-08-02 10:00';

  const res = await adminReq('GET', '/admin/orders/90/files', { env });
  const body = await res.text();
  check('the files page offers the button, counted from the files themselves',
    /Announce 2 new images/.test(body));
  check('it posts to the announce route',
    /action="\/admin\/orders\/90\/announce"/.test(body));
  check('and each delivered file says whether the customer knows about it',
    /not announced/.test(body));

  order.delivery_mailed_at = prev;
}

{
  const env = makeEnv({
    unannounced: 1,
    files: [{ id: 13, kind: 'delivery', filename: 'x.webp', bytes: 1, product_key: '', shot: '', created_at: '2026-08-06', announced_at: null }],
  });
  const res = await adminReq('GET', '/admin/orders/91/files', { env });   // nooit aangekondigd
  const body = await res.text();
  check('an order that was never announced gets no announce button',
    !/Announce 1 new image/.test(body));
  check('it is pointed at the delivered status instead',
    /never been announced/.test(body));
}

// ─────────────────────────────────────────────────────────────────────────────
section('§5 · welk beeld hoort bij welk product');
// ─────────────────────────────────────────────────────────────────────────────
//
// Uploads dragen product_key en shot sinds migratie 0005; leveringen droegen
// niets, omdat de uploadroute van admin de kolommen niet vulde. Gevolg op het
// klantdashboard: twee stapels beelden naast elkaar zonder verband. Bij dertig
// producten onbruikbaar — en dat is de bestelling waar het geld in zit.
//
// De gok uit de bestandsnaam is het halve werk, dus hij wordt hier vastgelegd:
// wat hij herkent, en vooral wat hij NIET raadt.

{
  const g = (n) => guessProductShot(n);
  check('p3 in de naam is product 3', g('VOLT-p3-back.webp').product === 'p3', g('VOLT-p3-back.webp').product);
  check('en het shotwoord komt mee', g('VOLT-p3-back.webp').shot === 'back');
  check('nederlandse shotwoorden tellen ook', g('volt 07 achterkant.jpg').shot === 'back');
  check('een los volgnummer telt als product', g('volt 07 achterkant.jpg').product === 'p7', g('volt 07 achterkant.jpg').product);
  check('nullen ervoor verdwijnen', g('VOLT_03_front.webp').product === 'p3', g('VOLT_03_front.webp').product);
  // DE BELANGRIJKSTE: niet raden als er niets staat. "niemand heeft het
  // gezegd" is een ander antwoord dan "voorkant", en een verkeerde gok die als
  // waarheid wordt opgeslagen is erger dan een leeg veld dat om aandacht vraagt.
  check('een naam zonder aanwijzing levert niets op',
    g('final render.png').product === null && g('final render.png').shot === null);
  check('een lang referentienummer is geen product', g('IMG_4471.jpg').product === null, String(g('IMG_4471.jpg').product));
}

// De upload zelf schrijft de gok mee de rij in.
{
  const env = makeEnv();
  const fd = new FormData();
  fd.append('files', new File([new Uint8Array(2048)], 'VOLT-p4-detail.webp', { type: 'image/webp' }));
  await adminReq('POST', '/admin/orders/90/deliver', { env, body: fd });
  const w = env.DB.writes.find((x) => /INSERT INTO files/.test(x.sql));
  check('een geüploade levering krijgt product en shot mee',
    /product_key, shot/.test(w?.sql || '') && w?.binds?.includes('p4') && w?.binds?.includes('detail'),
    JSON.stringify(w?.binds || []));
}

// Het indeelformulier: bevestigen of corrigeren, in één keer voor de hele
// bestelling.
{
  const env = makeEnv({ deliveryIds: [201, 202] });
  const body = new URLSearchParams({ p201: 'p1', s201: 'front', p202: 'p1', s202: 'front' });
  const res = await adminReq('POST', '/admin/orders/90/map', { env, body });

  check('de indeling wordt opgeslagen', has(env.DB.writes, /UPDATE files SET product_key = \?2, shot = \?3/));
  check('en de pagina bevestigt hoeveel', /mapped=2$/.test(res.headers.get('location') || ''), res.headers.get('location'));
  // De vervangregel: twee beelden op dezelfde product+shot betekent dat het
  // oudste vervangen is. Eerst alles vrijgeven, dan opnieuw bepalen — anders is
  // een correctie in de indeling niet terug te draaien.
  const clearAt = indexOfWrite(env.DB.writes, /UPDATE files SET superseded_at = NULL/);
  const setAt = indexOfWrite(env.DB.writes, /UPDATE files SET superseded_at = datetime/);
  check('vervangen wordt opnieuw bepaald, niet opgestapeld',
    clearAt >= 0 && setAt > clearAt, `clear@${clearAt} set@${setAt}`);
}

{
  const env = makeEnv({ deliveryIds: [201] });
  // Een id dat niet bij deze bestelling hoort, en een verzonnen shot.
  const body = new URLSearchParams({ p999: 'p1', s999: 'front', p201: 'p2', s201: 'vanaf-de-maan' });
  await adminReq('POST', '/admin/orders/90/map', { env, body });
  const writes = env.DB.writes.filter((w) => /UPDATE files SET product_key/.test(w.sql));
  check('een bestand van een andere bestelling wordt genegeerd', writes.length === 1, `${writes.length} write(s)`);
  check('en een onbekende shot wordt leeg, niet doorgelaten',
    writes[0]?.binds[2] === null, String(writes[0]?.binds[2]));
}

// Melden sluit alleen de revisies waarvan het beeld echt vervangen is.
{
  sentMail = [];
  const env = makeEnv({ unannounced: 2, openRevisions: 1 });
  const order = ORDERS.find((o) => o.id === 90);
  const prev = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-08-02 10:00';

  await adminReq('POST', '/admin/orders/90/announce', { env, body: new URLSearchParams() });
  const w = env.DB.writes.find((x) => /UPDATE revision_requests SET resolved_at/.test(x.sql));
  check('melden sluit openstaande revisies', !!w);
  check('maar alleen die waarvan het beeld vervangen is',
    /superseded_at IS NOT NULL/.test(w?.sql || ''));

  order.delivery_mailed_at = prev;
}

// ─────────────────────────────────────────────────────────────────────────────
section('§6 · het werkbord: eerst invullen, dan pushen');
// ─────────────────────────────────────────────────────────────────────────────
//
// Lucas: *"ik wil de order eerst visueel invullen en dan samen pushen naar de
// klant in 1 keer per product of order, zodat ik er meerdere dagen over kan
// doen en gelijk zie welke nog missen."* Het bord kan dat alleen als een gat
// eruitziet als een gat, als een upload precies in zijn vakje landt, en als
// pushen te beperken is tot één product.

{
  const env = makeEnv({
    files: [
      { id: 501, kind: 'delivery', filename: 'a.webp', bytes: 1, product_key: 'p1', shot: 'front', created_at: '2026-08-01', review_state: 'pending', announced_at: null, superseded_at: null },
    ],
  });
  const res = await adminReq('GET', '/admin/orders/90/files', { env });
  const body = await res.text();
  check('the board draws a slot per shot, labelled',
    /FRONT|Front/.test(body) && body.includes('On model') && body.includes('Detail'));
  check('an empty slot carries the product and shot it stands for',
    /name="product" value="p1"[\s\S]{0,200}name="shot" value="back"/.test(body));
  check('and it counts what is filled', /1\/4/.test(body));
}

// De upload uit een vakje raadt niets: het vakje weet het al.
{
  const env = makeEnv();
  const fd = new FormData();
  fd.set('product', 'p2');
  fd.set('shot', 'worn');
  fd.append('files', new File([new Uint8Array(1024)], 'export-final-v3.webp', { type: 'image/webp' }));
  await adminReq('POST', '/admin/orders/90/deliver', { env, body: fd });
  const w = env.DB.writes.find((x) => /INSERT INTO files/.test(x.sql));
  check('a slot upload lands on that exact product and shot',
    w?.binds?.includes('p2') && w?.binds?.includes('worn'), JSON.stringify(w?.binds || []));
  // Een upload in een gevuld vakje is een vervanging, dus de vervangregel moet
  // meteen draaien — anders staan er twee beelden voor dezelfde plek.
  check('and the replace rule runs straight away',
    has(env.DB.writes, /UPDATE files SET superseded_at = datetime/));
}

// Pushen per product raakt alleen dat product.
{
  sentMail = [];
  const env = makeEnv({ unannounced: 2, openRevisions: 0 });
  const order = ORDERS.find((o) => o.id === 90);
  const prev = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-08-02 10:00';

  await adminReq('POST', '/admin/orders/90/announce', { env, body: new URLSearchParams({ product: 'p7' }) });
  const stamp = env.DB.writes.find((x) => /UPDATE files SET announced_at/.test(x.sql));
  check('pushing one product stamps only that product', stamp?.binds?.includes('p7'), JSON.stringify(stamp?.binds || []));
  check('and the mail says which product it is about',
    /product 7/i.test(sentMail[0]?.html || ''));

  order.delivery_mailed_at = prev;
}

// ─────────────────────────────────────────────────────────────────────────────
section('§7 · notities: wat de klant leest, en wat alleen jij leest');
// ─────────────────────────────────────────────────────────────────────────────
//
// Lucas: *"een klant vraagt een revisie met een notitie, jij lost hem op, en
// daarna is er geen kanaal meer. Over drie maanden weet niemand meer waarom die
// extra ronde er was."* Het verschil tussen de twee soorten notities moet in de
// KOLOM zitten en niet in het hoofd van degene die tikt — dus deze sectie
// bewijst dat ze naar twee verschillende plekken gaan.

{
  const env = makeEnv();
  await adminReq('POST', '/admin/orders/90/note', { env, body: new URLSearchParams({ note: 'Stof kwam donkerder uit, belichting opgetrokken.' }) });
  const w = env.DB.writes.find((x) => /UPDATE orders SET customer_note/.test(x.sql));
  check('the shared note lands on the order', !!w && w.binds.includes('Stof kwam donkerder uit, belichting opgetrokken.'));
  check('and it stamps when it changed', /customer_note_at/.test(w?.sql || ''));
}

{
  const env = makeEnv();
  await adminReq('POST', '/admin/orders/90/note', { env, body: new URLSearchParams({ note: '   ' }) });
  const w = env.DB.writes.find((x) => /UPDATE orders SET customer_note/.test(x.sql));
  check('an empty note clears the message rather than storing blanks', w?.binds[1] === null, String(w?.binds[1]));
}

{
  const env = makeEnv();
  await adminReq('POST', '/admin/orders/90/internal', { env, body: new URLSearchParams({ body: 'Derde ronde omdat de eerste upload een prototype was.' }) });
  check('an internal note goes to its own table', has(env.DB.writes, /INSERT INTO order_notes/));
  // DE GARANTIE. Niet een kolom die gefilterd moet worden, maar een tabel die
  // de klantkant niet kent.
  check('and never touches the order the customer reads',
    !has(env.DB.writes, /UPDATE orders SET customer_note/));
}

{
  const env = makeEnv();
  const res = await adminReq('POST', '/admin/revisions/501/resolve', { env, body: new URLSearchParams({ fixed: '' }) });
  check('resolving without saying what changed is refused', res.status === 400, res.status);
  check('and nothing is written', !has(env.DB.writes, /UPDATE revision_requests/));
}

{
  const env = makeEnv();
  await adminReq('POST', '/admin/revisions/501/resolve', { env, body: new URLSearchParams({ fixed: 'Achtergrond egaal wit gemaakt.' }) });
  check('with a line, the request is closed and the line is kept',
    has(env.DB.writes, /UPDATE revision_requests SET resolved_at = datetime\('now'\), resolution_note/));
  check('and the customer sees it on their own timeline',
    has(env.DB.writes, /INSERT INTO order_events/));
}

// ─────────────────────────────────────────────────────────────────────────────
section('§8 · annuleren, verbergen, verwijderen — drie dingen, geen knop');
// ─────────────────────────────────────────────────────────────────────────────
//
// Lucas: *"'orders verwijderen' klinkt als één knop, maar er zitten drie
// verschillende situaties onder. Ze op één hoop gooien is hoe je per ongeluk een
// betaalde bestelling weggooit die je zeven jaar moet bewaren."* De regel is
// daarom in de CODE gezet en niet in het hoofd van degene die klikt: het
// verschil zit in payment_status, en de knop kijkt zelf.

{
  const env = makeEnv();
  const res = await adminReq('POST', '/admin/orders/90/cancel', { env, body: new URLSearchParams({ reason: '' }) });
  check('cancelling without a reason is refused', res.status === 400, res.status);
  check('and nothing changes', !has(env.DB.writes, /status = 'cancelled'/));
}

{
  // Order 90 is paid in the fixture. Dan moet er iets over het geld gezegd zijn.
  const env = makeEnv();
  const res = await adminReq('POST', '/admin/orders/90/cancel', { env, body: new URLSearchParams({ reason: 'Merk stopt met de lijn.' }) });
  check('a paid order cannot be cancelled without deciding about the money', res.status === 400, res.status);
}

{
  const env = makeEnv();
  await adminReq('POST', '/admin/orders/90/cancel', {
    env, body: new URLSearchParams({ reason: 'Merk stopt met de lijn.', payment: 'refund' }),
  });
  check('with a reason and a decision it cancels', has(env.DB.writes, /status = 'cancelled'/));
  const ev = env.DB.writes.find((w) => /INSERT INTO order_events/.test(w.sql));
  check('the customer sees the reason and what happens with the money',
    /Merk stopt/.test(ev?.binds?.[1] || '') && /Refund/.test(ev?.binds?.[1] || ''), ev?.binds?.[1]);
  check('and it lands in the admin log', has(env.DB.writes, /INSERT INTO admin_log/));
}

{
  const env = makeEnv();
  await adminReq('POST', '/admin/orders/90/hide', { env, body: new URLSearchParams({ action: 'hide' }) });
  check('hiding stamps hidden_at', has(env.DB.writes, /SET hidden_at = datetime/));
  check('and does not touch the status', !has(env.DB.writes, /SET status/));
}

{
  // DE BELANGRIJKSTE REGEL VAN DEZE SECTIE.
  const env = makeEnv();
  const res = await adminReq('POST', '/admin/orders/90/delete', { env, body: new URLSearchParams({ confirm: 'VIS-7F4-M3A' }) });
  check('a PAID order cannot be deleted, even with the right confirmation', res.status === 400, res.status);
  check('and not a single row is dropped', !has(env.DB.writes, /DELETE FROM orders/));
}

{
  // Order 91 staat op 'paid' in de fixture; even op onbetaald zetten.
  const o = ORDERS.find((x) => x.id === 91);
  const prev = o.payment_status;
  o.payment_status = 'unpaid';

  const wrong = makeEnv();
  const r1 = await adminReq('POST', '/admin/orders/91/delete', { env: wrong, body: new URLSearchParams({ confirm: 'weet ik veel' }) });
  check('the reference has to be typed exactly', r1.status === 400, r1.status);
  check('nothing deleted on a wrong confirmation', !has(wrong.DB.writes, /DELETE FROM orders/));

  const env = makeEnv({ keys: [{ r2_key: 'intake/VIS-8K2-QQ1/001-a.jpg', preview_key: null }] });
  await adminReq('POST', '/admin/orders/91/delete', { env, body: new URLSearchParams({ confirm: 'VIS-8K2-QQ1' }) });
  check('an unpaid order with the right reference is deleted', has(env.DB.writes, /DELETE FROM orders WHERE id/));
  check('its files leave R2 too', env.deletes.includes('intake/VIS-8K2-QQ1/001-a.jpg'), env.deletes.join(','));
  check('and the children go first, so nothing is orphaned',
    indexOfWrite(env.DB.writes, /DELETE FROM files/) < indexOfWrite(env.DB.writes, /DELETE FROM orders WHERE id/));

  o.payment_status = prev;
}

// Het AVG-verzoek: alles van één merk weg, behalve wat de boekhouding nodig heeft.
{
  const env = makeEnv();
  const r = await adminReq('POST', '/admin/customers/7/wipe', { env, body: new URLSearchParams({ confirm: 'iets anders' }) });
  check('erasing a customer needs their brand name typed exactly', r.status === 400, r.status);
  check('and erases nothing until it is', !has(env.DB.writes, /DELETE FROM customers/));
}

{
  const env = makeEnv();
  await adminReq('POST', '/admin/customers/7/wipe', { env, body: new URLSearchParams({ confirm: 'VOLT' }) });
  const archive = indexOfWrite(env.DB.writes, /INSERT INTO invoice_archive/);
  const wipe = indexOfWrite(env.DB.writes, /DELETE FROM customers/);
  // DE VOLGORDE IS HET HELE PUNT. Andersom levert een fout halverwege een klant
  // zonder bestellingen én zonder boekhouding op, en dat is de enige uitkomst
  // hier die je niet meer kunt repareren.
  check('the invoice lines are archived BEFORE anything is deleted',
    archive >= 0 && wipe > archive, `archief@${archive} wissen@${wipe}`);
  check('the archive carries no name, only money and dates',
    !/brand|email|name/i.test(env.DB.writes.find((w) => /INSERT INTO invoice_archive/.test(w.sql))?.sql || ''));
  check('sessions and tokens go too, so nobody stays logged in',
    has(env.DB.writes, /DELETE FROM account_sessions/) && has(env.DB.writes, /DELETE FROM account_tokens/));
  check('and the whole thing is logged', has(env.DB.writes, /INSERT INTO admin_log/));
}

// ─────────────────────────────────────────────────────────────────────────────
section('§9 · zoeken, filteren en een spoor');
// ─────────────────────────────────────────────────────────────────────────────

{
  const env = makeEnv();
  await adminReq('GET', '/admin?q=VOLT', { env });
  const listQuery = env.DB.prepared.find((sql) => /FROM orders/.test(sql) && /LIMIT 200/.test(sql));
  check('searching happens in the query that carries the LIMIT',
    /ref LIKE/.test(listQuery || '') && /brand LIKE/.test(listQuery || ''), 'LIKE ... LIMIT 200');
  check('and hidden orders stay out by default', /hidden_at IS NULL/.test(listQuery || ''));
}

{
  const env = makeEnv();
  await adminReq('GET', '/admin?hidden=1', { env });
  const listQuery = env.DB.prepared.find((sql) => /FROM orders/.test(sql) && /LIMIT 200/.test(sql));
  check('asking for hidden orders drops that condition', !/hidden_at IS NULL/.test(listQuery || ''));
}

{
  for (const [f, needle] of [['revisions', /revision_requested/], ['unpaid', /payment_status = 'unpaid'/], ['unannounced', /announced_at IS NULL/]]) {
    const env = makeEnv();
    await adminReq('GET', `/admin?f=${f}`, { env });
    const listQuery = env.DB.prepared.find((sql) => /FROM orders/.test(sql) && /LIMIT 200/.test(sql));
    check(`the "${f}" filter is a real condition, not a client-side sieve`, needle.test(listQuery || ''));
  }
}

{
  const env = makeEnv();
  const res = await adminReq('GET', '/admin?f=verzonnen', { env });
  check('an invented filter falls back to everything rather than to nothing', res.status === 200, res.status);
}

// ─────────────────────────────────────────────────────────────────────────────
section('§10 · de fouten van de nachtelijke controle, vastgezet');
// ─────────────────────────────────────────────────────────────────────────────
//
// Vier dingen die geen van alle luid faalden en die een tweede paar ogen eruit
// haalde. Ze staan hier zodat ze niet terugkomen.

{
  // 1 · De R2-sleutel liep bij elke aanvraag opnieuw vanaf 001, dus twee keer
  // hetzelfde bestand in hetzelfde vakje overschreef het eerste beeld — de
  // vervangwerkwijze van het bord, dus geen randgeval.
  const env = makeEnv();
  const one = new FormData();
  one.set('product', 'p1'); one.set('shot', 'front');
  one.append('files', new File([new Uint8Array(64)], 'front.jpg', { type: 'image/jpeg' }));
  await adminReq('POST', '/admin/orders/90/deliver', { env, body: one });

  const two = new FormData();
  two.set('product', 'p1'); two.set('shot', 'front');
  two.append('files', new File([new Uint8Array(64)], 'front.jpg', { type: 'image/jpeg' }));
  await adminReq('POST', '/admin/orders/90/deliver', { env, body: two });

  check('replacing a slot with the same filename does not overwrite the old object',
    env.puts.length === 2 && env.puts[0].key !== env.puts[1].key, env.puts.map((p) => p.key).join(' | '));
  check('and the key still says where the image belongs', /p1-front/.test(env.puts[1].key), env.puts[1].key);
}

{
  // 2 · Een beeld dat vervangen is voordat het gemeld werd, is geen nieuws.
  // De knop telde het niet, de mail wel — "push 1" en dan "2 new images".
  const env = makeEnv({ unannounced: 1, openRevisions: 0 });
  const order = ORDERS.find((o) => o.id === 90);
  const prev = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-08-02 10:00';
  await adminReq('POST', '/admin/orders/90/announce', { env, body: new URLSearchParams() });
  const tally = env.DB.prepared.find((q) => /COUNT\(\*\) AS n FROM files/.test(q) && /announced_at IS NULL/.test(q));
  check('the announce tally ignores superseded files', /superseded_at IS NULL/.test(tally || ''));
  order.delivery_mailed_at = prev;
}

{
  // 3 · Melden sloot de regel in revision_requests maar liet files.review_state
  // op 'revision_requested' staan — en dát is wat de inbox en de teller lezen.
  // Twee schermen die iets anders beweren over hetzelfde werk.
  const env = makeEnv({ unannounced: 2, openRevisions: 1 });
  const order = ORDERS.find((o) => o.id === 90);
  const prev = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-08-02 10:00';
  await adminReq('POST', '/admin/orders/90/announce', { env, body: new URLSearchParams() });
  check('closing a revision also clears the state the inbox reads',
    has(env.DB.writes, /UPDATE files SET review_state = 'pending'[\s\S]*superseded_at IS NOT NULL/));
  order.delivery_mailed_at = prev;
}

{
  // 4 · Een verborgen testbestelling telde nog wel mee in de strook en in de
  // chips — dan liegt het cijfer boven de lijst die eronder staat.
  const env = makeEnv();
  await adminReq('GET', '/admin', { env });
  const revisionCount = env.DB.prepared.find((q) => /review_state = 'revision_requested'/.test(q) && /COUNT/.test(q));
  const chips = env.DB.prepared.find((q) => /GROUP BY status/.test(q));
  check('the revision counter skips hidden orders', /hidden_at IS NULL/.test(revisionCount || ''));
  check('and so do the status chips', /hidden_at IS NULL/.test(chips || ''));
}


// ─────────────────────────────────────────────────────────────────────────────
section('§5 · "mail ons en we sturen een nieuwe link" — 23 augustus 2026');
// ─────────────────────────────────────────────────────────────────────────────
//
// /terms en /privacy beloven dit in beide talen, en tot vandaag kon niemand het
// uitvoeren. freshPortalLink() bestond, maar zijn twee aanroepers zaten allebei
// achter een poort die NIEUWE BESTANDEN vereist — en een klant die na vier
// maanden mailt omdat zijn link is verlopen, heeft per definitie niets nieuws.
//
// De toetsen hieronder gaan over dat "niets nieuws": de knop moet werken juist
// als er niets aan te kondigen valt, en hij mag tegelijk niet doen alsof er wél
// iets is.

{
  sentMail = [];
  // unannounced: 0 — precies het geval waarin de herleveringsknop niets doet.
  const env = makeEnv({ unannounced: 0 });
  const order = ORDERS.find((o) => o.id === 90);
  const was = order.delivery_mailed_at;
  order.delivery_mailed_at = '2026-04-02';   // vier maanden geleden aangekondigd

  const res = await adminReq('POST', '/admin/orders/90/fresh-link', { env });

  const revokeAt = indexOfWrite(env.DB.writes, /UPDATE order_tokens SET revoked_at/);
  const insertAt = indexOfWrite(env.DB.writes, /INSERT INTO order_tokens/);

  check('a fresh link works when there is nothing to announce', res.status === 303, res.status);
  check('the old token is revoked first', revokeAt >= 0 && insertAt >= 0 && revokeAt < insertAt,
    `revoke@${revokeAt} insert@${insertAt}`);
  check('exactly one new token is minted',
    env.DB.writes.filter((w) => /INSERT INTO order_tokens/.test(w.sql)).length === 1);
  check('the customer is mailed', sentMail.length === 1, `${sentMail.length} mails`);

  /* DE MAIL MAG NIET DOEN ALSOF ER IETS NIEUWS IS. Dat is het hele verschil met
     de herleveringsknop, en het is precies het soort bericht dat een klant één
     keer opent en daarna niet meer vertrouwt. */
  const m = sentMail[0] || {};
  check('the subject says "new link", not "new images"',
    /new link/i.test(m.subject || '') && !/new images|nieuwe beelden/i.test(m.subject || ''), m.subject);
  check('and the body promises nothing new',
    /nothing about your images has changed/i.test(m.html || ''));
  check('it says the previous link is dead',
    /replaces the previous one/i.test(m.html || ''));
  check('and it names the retention period from the constant',
    new RegExp(`${DELIVERY_MONTHS} months`).test(m.html || ''));

  /* NIETS AANGEKONDIGD. redelivery_count omhoog zetten of announced_at stempelen
     zou de volgende echte herlevering laten denken dat die beelden al gemeld
     zijn — en dan komt de mail die er wél toe doet nooit aan. */
  check('redelivery_count is NOT bumped', !has(env.DB.writes, /redelivery_count/));
  check('nothing is stamped as announced', !has(env.DB.writes, /SET announced_at/));

  check('the customer timeline records it',
    has(env.DB.writes, /INSERT INTO order_events/));

  order.delivery_mailed_at = was;
}

{
  // Een bestelling die de klant nooit heeft gezien, heeft een leeg portaal.
  // Een link daarheen sturen is een mail over iets waarvan hij het bestaan niet
  // kent — zelfde weigering en dezelfde reden als bij de herleveringsknop.
  sentMail = [];
  const env = makeEnv();
  const order = ORDERS.find((o) => o.id === 91);
  const res = await adminReq('POST', '/admin/orders/91/fresh-link', { env });
  check('never announced → refused', res.status === 400, res.status);
  check('  and no token is issued', !has(env.DB.writes, /INSERT INTO order_tokens/));
  check('  and no mail goes out', sentMail.length === 0, `${sentMail.length} mails`);
}

globalThis.fetch = realFetch;
console.log(`\n${fails ? `${fails} FAILED` : 'all passed'}`);
process.exit(fails ? 1 : 0);
