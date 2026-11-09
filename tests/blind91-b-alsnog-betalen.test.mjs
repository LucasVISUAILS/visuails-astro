/* ═══════════════════════════════════════════════════════════════════════════════
 * ALSNOG BETALEN — TEGOED EN PROEFBESTELLINGEN — 9 november 2026 (ronde 91, B01/B08)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node tests/blind91-b-alsnog-betalen.test.mjs
 *
 * Twee fouten op de twee paden waarlangs een klant een openstaande bestelling
 * alsnog betaalt: de knop "Nu betalen" in Studio (POST /account/orders/<id>/pay)
 * en de betaallink uit de mail (GET /api/order-pay?ref=…).
 *
 * 1 · TEGOED. Een bestelling die deels met tegoed betaald wordt, draagt
 *     `tegoed_cents` in details_json. /api/order en /api/order-pay vragen Mollie om
 *     bruto − tegoed; de Studio-knop vroeg het volle bruto. Na betalen boekt de
 *     webhook het tegoed tóch af, dus de klant betaalde het tegoed twee keer.
 *
 * 2 · PROEF NA DE OVERSTAP. Een bestelling die met een test_-sleutel is
 *     aangenomen (testmodus = 1), kreeg na de overstap naar live_ op beide paden een
 *     ECHTE betaling, en de factuur kwam uit de PROEF-reeks (die niet naar
 *     e-Boekhouden gaat). Nu: geen betaling op een proefbestelling met een
 *     live-sleutel.
 *
 * Echte SQLite (tests/lib/d1sqlite.mjs), nep-Mollie, de echte handlers.
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
function ok(naam, waarde, verwacht = true) {
  const ja = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ja) goed++; else fout++;
  console.log(`${ja ? '  ok  ' : '  FAIL'} ${naam}${ja ? '' : `    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

const TEST = 'test_abcdefghijklmnopqrstuvwxyz0123';
const LIVE = 'live_abcdefghijklmnopqrstuvwxyz0123';

/* Nep-Mollie: aanmaken en ophalen; mail slikken. */
const betalingen = new Map();
let volg = 0;
const aangemaakt = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') {
    const p = JSON.parse(String(opts.body));
    const id = `tr_${String(++volg).padStart(10, '0')}`;
    const rec = { id, mode: 'test', status: 'open', amount: p.amount, metadata: p.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
    betalingen.set(id, rec);
    aangemaakt.push(p);
    return json(rec, 201);
  }
  const m = u.match(/\/v2\/payments\/(tr_[0-9a-zA-Z]+)$/);
  if (m) return betalingen.has(m[1]) ? json(betalingen.get(m[1])) : json({ status: 404 }, 404);
  return json({ id: 'msg_test' });
};

const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
const { onRequestPost: webhookPost } = await import('../functions/api/webhook/mollie.js');
const { onRequestGet: orderPay } = await import('../functions/api/order-pay.js');
const { accountPost } = await import('../src/lib/account.js');
const { mintToken, hashToken } = await import('../src/lib/token.js');

function omgeving(sleutel = LIVE) {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
  const emmer = new Map();
  const UPLOADS = { async put(k, b) { emmer.set(k, b); }, async get(k) { return emmer.has(k) ? { body: emmer.get(k) } : null; }, async delete(k) { emmer.delete(k); }, async head() { return null; } };
  return { db, env: { MOLLIE_API_KEY: sleutel, RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@visuails.com', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db), UPLOADS } };
}
let ip = 1;
async function bestel(env, email, sessieKlant = null) {
  const fd = new FormData();
  const velden = { service: 'catalog', products: '5', name: 'Test Klant', brand: 'TESTMERK', email, phone: '+31 6 12345678', country: 'NL',
    address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes', business_version: 'v1', no_vat: '1', reg_number: '12345678' };
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  return bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.9.0.${ip++}` } }), env, waitUntil: () => {}, sessieKlant });
}
async function webhook(env, id) {
  const fd = new FormData(); fd.append('id', id);
  return webhookPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: fd }), env, waitUntil: () => {} });
}
async function sessie(db, cid) {
  const token = await mintToken();
  db.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 day'))").run(cid, await hashToken(token));
  return token;
}
const studioBetaal = (env, token, id) => accountPost({
  request: new Request(`https://visuails.com/account/orders/${id}/pay`, { method: 'POST', body: new FormData(), headers: { cookie: `vis_account=${token}`, origin: 'https://visuails.com' } }),
  env, params: { path: `orders/${id}/pay` }, waitUntil: () => {},
});
const linkBetaal = (env, ref) => orderPay({ request: new Request(`https://visuails.com/api/order-pay?ref=${ref}&lang=nl`), env, waitUntil: () => {} });
const bedragCent = (p) => Math.round(parseFloat(p.amount.value) * 100);

try {
  console.log('\nVISUAILS — alsnog betalen (ronde 91)\n');

  console.log('1 · tegoed: de tweede betaling is bruto − tegoed, op beide paden');
  for (const pad of ['studio', 'link']) {
    const { db, env } = omgeving();
    const cid = db.prepare("INSERT INTO customers (email, name, country) VALUES ('tegoed@test.example', 'Test Klant', 'NL') RETURNING id").get().id;
    db.prepare('INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (?, 10000, ?)').run(cid, 'Terug na annulering van VIS-TEST');
    await bestel(env, 'tegoed@test.example', { customer_id: cid, email: 'tegoed@test.example' });
    const o = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    const bruto = o.total_cents + o.vat_cents;
    ok(`${pad}: de eerste betaling was al bruto − tegoed`, bedragCent(aangemaakt.at(-1)), bruto - 10000);
    const eerste = [...betalingen.keys()].pop();
    betalingen.get(eerste).status = 'expired';
    await webhook(env, eerste);
    const voor = aangemaakt.length;
    if (pad === 'studio') await studioBetaal(env, await sessie(db, cid), o.id);
    else await linkBetaal(env, o.ref);
    ok(`${pad}: er is een tweede betaling`, aangemaakt.length - voor, 1);
    ok(`${pad}: Mollie vraagt bruto − tegoed`, aangemaakt.length > voor ? bedragCent(aangemaakt.at(-1)) : null, bruto - 10000);
    const tweede = [...betalingen.keys()].pop();
    Object.assign(betalingen.get(tweede), { status: 'paid', paidAt: '2026-11-09T10:00:00+00:00', method: 'creditcard' });
    await webhook(env, tweede);
    ok(`${pad}: betaald`, db.prepare('SELECT payment_status FROM orders WHERE id = ?').get(o.id).payment_status, 'paid');
    ok(`${pad}: betaald + tegoed = precies bruto (niets dubbel)`,
      telling(db, "SELECT SUM(amount_cents) FROM payments WHERE status = 'paid'") + 10000, bruto);
  }

  console.log('\n   en de knop in Studio noemt hetzelfde bedrag als Mollie vraagt');
  {
    const src = (await import('node:fs')).readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');
    ok('de betaalknop trekt het tegoed af', /bedrag: money\(Math\.max\(0, unpaidMoney\.gross - tegoedOpBestelling\(o\)\)/.test(src), true);
    ok('handleOrderPay leest details_json', /const COLS = '[^']*details_json'/.test(src), true);
  }

  console.log('\n2 · een proefbestelling krijgt na de overstap geen echte betaling');
  for (const pad of ['studio', 'link']) {
    const { db, env } = omgeving(TEST);
    await bestel(env, `proef-${pad}@test.example`);
    const o = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    ok(`${pad}: aangenomen als proef`, o.testmodus, 1);
    env.MOLLIE_API_KEY = LIVE;
    const voor = aangemaakt.length;
    if (pad === 'studio') await studioBetaal(env, await sessie(db, o.customer_id), o.id);
    else await linkBetaal(env, o.ref);
    ok(`${pad}: geen betaling met de live-sleutel`, aangemaakt.length - voor, 0);
    /* Met de test-sleutel blijft het gewoon werken. */
    env.MOLLIE_API_KEY = TEST;
    if (pad === 'studio') await studioBetaal(env, await sessie(db, o.customer_id), o.id);
    else await linkBetaal(env, o.ref);
    ok(`${pad}: met de test-sleutel wél (proef blijft te testen)`, aangemaakt.length - voor, 1);
  }
  {
    const { db, env } = omgeving(LIVE);
    await bestel(env, 'echt@test.example');
    const o = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    const voor = aangemaakt.length;
    await linkBetaal(env, o.ref);
    ok('een echte bestelling betaal je gewoon via de link', aangemaakt.length - voor, 1);
  }
} finally {
  globalThis.fetch = echteFetch;
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
