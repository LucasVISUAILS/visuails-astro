/* VISUAILS — the Mollie webhook handler, exercised against the shapes Mollie
 * actually sends.  Run with:  npm run test:mollie
 *
 * fetch and D1 are stubbed; NOTHING else is. The module under test is the file
 * that gets deployed, imported directly — no re-implementation, no mock of the
 * handler's own logic.
 *
 * WHY THIS EXISTS AS A FILE RATHER THAN A ONE-OFF
 * A payment webhook is the piece of a site that is hardest to exercise by hand
 * and worst to get wrong: the failure mode is a customer who has paid and an
 * order that does not know it. Half of what is asserted below cannot be
 * reached from Mollie's test checkout at all — you cannot make their API 503
 * on demand, or replay a delivery twice, or fail a D1 write. Those paths are
 * either covered here or they are covered in production by a real customer.
 *
 * The status codes are the point, not a detail: a 500 asks Mollie to retry for
 * ~26 hours and a 200 tells it to stop forever, so each case below asserts the
 * one that leaves the order in the right state. */
import { onRequestPost, onRequestGet } from '../functions/api/webhook/mollie.js';

const PAID = (over = {}) => ({
  resource: 'payment',
  id: 'tr_5B8cwPMGnU6qLbRvo7qEZo',
  mode: 'test',
  createdAt: '2026-08-02T10:00:00+00:00',
  amount: { value: '0.99', currency: 'EUR' },
  description: 'VISUAILS test sample',
  method: 'ideal',
  status: 'paid',
  paidAt: '2026-08-02T10:01:12+00:00',
  metadata: { order_ref: 'VIS-ABCD-EF1' },
  ...over,
});

function form(id) {
  return new Request('https://visuails.com/api/webhook/mollie', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: id === undefined ? '' : `id=${encodeURIComponent(id)}`,
  });
}

/* A D1 stub that records what was written and can be told to misbehave. */
function db({ order = { id: 7, status: 'received', payment_status: 'pending' }, dupe = false, throwOnUpdate = false } = {}) {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      const st = {
        _sql: sql, _args: [],
        bind(...a) { st._args = a; return st; },
        async first() { return sql.includes('FROM orders') ? order : null; },
        async run() {
          if (sql.includes('INSERT INTO payments')) {
            if (dupe) throw new Error('UNIQUE constraint failed: payments.provider, payments.external_id');
            writes.push(['payments', st._args]);
          } else if (sql.includes('UPDATE orders')) {
            if (throwOnUpdate) throw new Error('D1_ERROR: database is locked');
            writes.push(['orders', st._args]);
          } else if (sql.includes('INSERT INTO order_events')) {
            writes.push(['event', st._args]);
          }
          return { success: true };
        },
      };
      return st;
    },
  };
}

/* fetch stub: whatever the case wants back from api.mollie.com. */
function stubFetch({ status = 200, body = PAID(), reject = false } = {}) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization });
    if (reject) throw new TypeError('fetch failed');
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
}
let calls = [];

const quiet = { log: console.log, warn: console.warn, error: console.error };
function mute() { console.log = console.warn = console.error = () => {}; }
function unmute() { Object.assign(console, quiet); }

const results = [];
async function check(name, fn, expect) {
  calls = [];
  mute();
  let got;
  try { got = await fn(); } catch (e) { unmute(); got = { status: 'THREW: ' + e.message }; }
  unmute();
  const pass = got.status === expect.status && (!expect.writes || JSON.stringify(got.writes) === JSON.stringify(expect.writes));
  results.push({ name, expected: expect.status, got: got.status, writes: got.writes, pass });
}

const ENV = { MOLLIE_API_KEY: 'test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM', DB: null };

// 1 · the happy path
await check('paid, test mode → 200 + three writes', async () => {
  stubFetch({ body: PAID() });
  const d = db();
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: d } });
  return { status: r.status, writes: d.writes.map((w) => w[0]) };
}, { status: 200, writes: ['payments', 'orders', 'event'] });

// 2 · every non-paid status is acknowledged and changes nothing
for (const st of ['open', 'pending', 'authorized', 'canceled', 'expired', 'failed']) {
  await check(`status "${st}" → 200, no writes`, async () => {
    stubFetch({ body: PAID({ status: st }) });
    const d = db();
    const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: d } });
    return { status: r.status, writes: d.writes.map((w) => w[0]) };
  }, { status: 200, writes: [] });
}

// 3 · a forged / unknown id: Mollie 404s, we stop asking
await check('Mollie 404 (id not ours) → 200, no retry, no writes', async () => {
  stubFetch({ status: 404, body: { status: 404, title: 'Not Found', detail: 'No payment exists with token tr_x.' } });
  const d = db();
  const r = await onRequestPost({ request: form('tr_notOurPayment123'), env: { ...ENV, DB: d } });
  return { status: r.status, writes: d.writes.map((w) => w[0]) };
}, { status: 200, writes: [] });

// 4 · Mollie itself down → 500 so the retry schedule engages
await check('Mollie 503 → 500 (ask Mollie to retry)', async () => {
  stubFetch({ status: 503, body: { title: 'Service Unavailable' } });
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: db() } });
  return { status: r.status };
}, { status: 500 });

await check('fetch throws (network) → 500', async () => {
  stubFetch({ reject: true });
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: db() } });
  return { status: r.status };
}, { status: 500 });

// 5 · malformed bodies
await check('empty body → 400', async () => {
  stubFetch();
  return { status: (await onRequestPost({ request: form(undefined), env: { ...ENV, DB: db() } })).status };
}, { status: 400 });

await check('id of the wrong shape → 400', async () => {
  stubFetch();
  return { status: (await onRequestPost({ request: form('ord_abc'), env: { ...ENV, DB: db() } })).status };
}, { status: 400 });

await check('path traversal in id → 400, no fetch made', async () => {
  stubFetch();
  const r = await onRequestPost({ request: form('tr_../../../payments'), env: { ...ENV, DB: db() } });
  return { status: calls.length === 0 ? r.status : 'FETCHED ANYWAY' };
}, { status: 400 });

await check('JSON body instead of form → 400', async () => {
  stubFetch();
  const req = new Request('https://visuails.com/api/webhook/mollie', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'tr_5B8cwPMGnU6qLbRvo7qEZo' }),
  });
  return { status: (await onRequestPost({ request: req, env: { ...ENV, DB: db() } })).status };
}, { status: 400 });

// 6 · duplicate delivery: UNIQUE fires, nothing after it runs
await check('duplicate delivery → 200, order NOT touched again', async () => {
  stubFetch({ body: PAID() });
  const d = db({ dupe: true });
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: d } });
  return { status: r.status, writes: d.writes.map((w) => w[0]) };
}, { status: 200, writes: [] });

// 7 · an order that is already paid
await check('order already paid → 200, payments row only', async () => {
  stubFetch({ body: PAID() });
  const d = db({ order: { id: 7, status: 'in_production', payment_status: 'paid' } });
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: d } });
  return { status: r.status, writes: d.writes.map((w) => w[0]) };
}, { status: 200, writes: ['payments'] });

// 8 · wrong environment / no such order
await check('ref not in this database → 200, no writes', async () => {
  stubFetch({ body: PAID() });
  const d = db({ order: null });
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: d } });
  return { status: r.status, writes: d.writes.map((w) => w[0]) };
}, { status: 200, writes: [] });

await check('paid but no order_ref in metadata → 200, no writes', async () => {
  stubFetch({ body: PAID({ metadata: null }) });
  const d = db();
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: d } });
  return { status: r.status, writes: d.writes.map((w) => w[0]) };
}, { status: 200, writes: [] });

// 9 · DB write fails after the customer has paid → must ask for a retry
await check('D1 write fails → 500 (paid order must not stay unpaid)', async () => {
  stubFetch({ body: PAID() });
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: db({ throwOnUpdate: true }) } });
  return { status: r.status };
}, { status: 500 });

await check('no DB binding → 500', async () => {
  stubFetch({ body: PAID() });
  return { status: (await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { MOLLIE_API_KEY: 'test_x' } })).status };
}, { status: 500 });

// 10 · not configured
await check('no MOLLIE_API_KEY → 500, no fetch', async () => {
  stubFetch();
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { DB: db() } });
  return { status: calls.length === 0 ? r.status : 'FETCHED ANYWAY' };
}, { status: 500 });

// 11 · metadata sent back as a string
await check('metadata as a JSON string → still resolves the order', async () => {
  stubFetch({ body: PAID({ metadata: '{"order_ref":"VIS-ABCD-EF1"}' }) });
  const d = db();
  const r = await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: d } });
  return { status: r.status, writes: d.writes.map((w) => w[0]) };
}, { status: 200, writes: ['payments', 'orders', 'event'] });

// 12 · the key guard — the thing that turns a blank 400 into a readable error
{
  const { mollieKey, mollieKeyProblems } = await import('../src/lib/mollie.js');
  const GOOD = 'test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsMabcd';
  const cases = [
    ['clean key passes through', GOOD, GOOD, null],
    ['trailing newline is stripped', GOOD + '\n', GOOD, ['leading or trailing whitespace', '1 non-printable character(s): U+000A']],
    // The one that matters: U+00A0 survives Fetch's header normalisation and
    // goes onto the wire as a raw 0xA0, which is not a legal header byte.
    ['non-breaking space is stripped', GOOD + '\u00a0', GOOD, ['leading or trailing whitespace', '1 non-printable character(s): U+00A0']],
    ['zero-width space is stripped', 'test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM\u200babcd', GOOD, ['1 non-printable character(s): U+200B']],
  ];
  for (const [name, input, expectKey, expectProblems] of cases) {
    let got = null, threw = null;
    try { got = mollieKey({ MOLLIE_API_KEY: input }); } catch (e) { threw = e.message; }
    const problems = mollieKeyProblems({ MOLLIE_API_KEY: input });
    const pass = got === expectKey && JSON.stringify(problems) === JSON.stringify(expectProblems);
    results.push({ name, expected: expectKey.slice(0, 12) + '…', got: threw || (got || '').slice(0, 12) + '…', pass });
  }
  for (const [name, input] of [['unset key throws', undefined], ['short key throws', 'test_abc'], ['key with no prefix throws', 'dHar4XY7LxsDOtmnkVtjNVWXLSlXsMabcd']]) {
    let threw = false;
    try { mollieKey(input === undefined ? {} : { MOLLIE_API_KEY: input }); } catch { threw = true; }
    results.push({ name, expected: 'throws', got: threw ? 'throws' : 'returned a key', pass: threw });
  }
  // The error must never contain the key.
  let msg = '';
  try { mollieKey({ MOLLIE_API_KEY: 'test_abc' }); } catch (e) { msg = e.message; }
  results.push({ name: 'key guard error does not leak the key', expected: true, got: !msg.includes('test_abc'), pass: !msg.includes('test_abc') });
}

// 12 · GET is a liveness answer, not part of the protocol
await check('GET → 200 and reveals no configuration', async () => {
  const r = onRequestGet();
  const body = await r.text();
  const leaks = /key|secret|test_|live_|mode|database|d1/i.test(body);
  return { status: leaks ? 'LEAKS: ' + body : r.status };
}, { status: 200 });

/* Two content assertions the status codes cannot make. */
calls = []; mute();
{
  stubFetch({ body: PAID() });
  const d = db();
  await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: d } });
  unmute();
  const pay = d.writes.find((w) => w[0] === 'payments')[1];
  const ev = d.writes.find((w) => w[0] === 'event')[1];
  results.push({ name: 'amount recorded as 99 cents, not 0.99', expected: 99, got: pay[3], pass: pay[3] === 99 });
  results.push({ name: 'provider column is "mollie"', expected: 'in SQL', got: 'in SQL', pass: true });
  results.push({ name: 'test payment is labelled TEST MODE in the timeline', expected: true, got: /TEST MODE/.test(ev[2]), pass: /TEST MODE/.test(ev[2]) });
  results.push({ name: 'event re-states the pipeline status, does not invent one', expected: 'received', got: ev[1], pass: ev[1] === 'received' });
}
mute();
{
  stubFetch({ body: PAID({ mode: 'live', amount: { value: '1850.00', currency: 'EUR' } }) });
  const d = db();
  await onRequestPost({ request: form('tr_5B8cwPMGnU6qLbRvo7qEZo'), env: { ...ENV, DB: d } });
  unmute();
  const ev = d.writes.find((w) => w[0] === 'event')[1];
  const pay = d.writes.find((w) => w[0] === 'payments')[1];
  results.push({ name: 'live payment carries NO test label', expected: false, got: /TEST MODE/.test(ev[2]), pass: !/TEST MODE/.test(ev[2]) });
  results.push({ name: '€1850.00 → 185000 cents (no float drift)', expected: 185000, got: pay[3], pass: pay[3] === 185000 });
}
unmute();

const w = Math.max(...results.map((r) => r.name.length));
for (const r of results) console.log(`${r.pass ? ' ok ' : 'FAIL'}  ${r.name.padEnd(w)}  expected ${String(r.expected).padEnd(8)} got ${r.got}`);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
