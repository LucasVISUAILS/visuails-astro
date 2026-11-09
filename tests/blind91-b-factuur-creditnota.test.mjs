/* ═══════════════════════════════════════════════════════════════════════════════
 * FACTUURDATUM IN NEDERLAND, EN ÉÉN CREDITNOTA PER TERUGBETALING
 * 9 november 2026 (ronde 91, B06/B07)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node tests/blind91-b-factuur-creditnota.test.mjs
 *
 * 1 · DE DATUM. issueInvoice() en issueCreditNote() namen de datum in UTC. Een
 *     betaling om 00:30 Nederlandse tijd op 1 januari (23:30 UTC op 31 december)
 *     kreeg factuurdatum 31 december en een nummer uit de reeks van het oude jaar;
 *     elke nacht tussen 00:00 en 01:00 (zomer: 02:00) kreeg een factuur de datum van
 *     gisteren. De klok staat hieronder vast.
 *
 * 2 · TWEE MELDINGEN TEGELIJK. Mollie die dezelfde terugbetaling twee keer tegelijk
 *     meldt, gaf twee creditnota's voor één terugbetaling (€ 100 terug, € 200
 *     gecrediteerd).
 *
 * 3 · DE LAATSTE NOTA SLUIT OP DE CENT. Drie deelnota's en dan de rest telden op tot
 *     € 324,99 netto en € 68,26 btw tegenover een factuur van € 325,00 en € 68,25.
 *
 * Echte SQLite, nep-Mollie, de echte webhook en issueInvoice()/issueCreditNote().
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
function ok(naam, waarde, verwacht = true) {
  const ja = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ja) goed++; else fout++;
  console.log(`${ja ? '  ok  ' : '  FAIL'} ${naam}${ja ? '' : `    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

const betalingen = new Map();
let volg = 0;
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') {
    const p = JSON.parse(String(opts.body));
    const id = `tr_${String(++volg).padStart(10, '0')}`;
    const rec = { id, mode: 'live', status: 'open', amount: p.amount, metadata: p.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
    betalingen.set(id, rec);
    return json(rec, 201);
  }
  const m = u.match(/\/v2\/payments\/(tr_[0-9a-zA-Z]+)$/);
  if (m) return betalingen.has(m[1]) ? json(betalingen.get(m[1])) : json({ status: 404 }, 404);
  return json({ id: 'msg_test' });
};

const RealDate = Date;
function zetKlok(iso) {
  const vast = new RealDate(iso).getTime();
  globalThis.Date = class extends RealDate {
    constructor(...a) { super(...(a.length ? a : [vast])); }
    static now() { return vast; }
  };
}
const klokTerug = () => { globalThis.Date = RealDate; };

const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
const { onRequestPost: webhookPost } = await import('../functions/api/webhook/mollie.js');
const { amsterdamDatum, snapshotFromOrder } = await import('../src/lib/invoice.js');

function omgeving() {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
  const emmer = new Map();
  const UPLOADS = { async put(k, b) { emmer.set(k, b); }, async get(k) { return emmer.has(k) ? { body: emmer.get(k) } : null; }, async delete(k) { emmer.delete(k); }, async head() { return null; } };
  return { db, env: { MOLLIE_API_KEY: 'live_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@visuails.com', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db), UPLOADS } };
}
let ip = 1;
async function betaaldeBestelling(env, db) {
  const fd = new FormData();
  const velden = { service: 'catalog', products: '5', name: 'Test Klant', brand: 'TESTMERK', email: `klant${ip}@test.example`, phone: '+31 6 12345678', country: 'NL',
    address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes', business_version: 'v1', no_vat: '1', reg_number: '12345678' };
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.8.0.${ip++}` } }), env, waitUntil: () => {} });
  const order = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
  const id = [...betalingen.keys()].pop();
  Object.assign(betalingen.get(id), { status: 'paid', paidAt: '2026-11-09T10:00:00+00:00', method: 'creditcard' });
  return { order, id };
}
async function webhook(env, id) {
  const fd = new FormData(); fd.append('id', id);
  return webhookPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: fd }), env, waitUntil: () => {} });
}
const terug = (id, euro) => { betalingen.get(id).amountRefunded = { currency: 'EUR', value: euro }; };

try {
  console.log('\nVISUAILS — factuurdatum en creditnota (ronde 91)\n');

  console.log('amsterdamDatum()');
  ok('23:30 UTC op 31 december is 1 januari', amsterdamDatum(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
  ok('22:30 UTC op 31 december is nog 31 december', amsterdamDatum(new Date('2026-12-31T22:30:00Z')), '2026-12-31');
  ok('zomertijd: 22:30 UTC op 31 juli is 1 augustus', amsterdamDatum('2027-07-31T22:30:00Z'), '2027-08-01');
  ok('SQLite-tijd (UTC zonder Z) wordt als UTC gelezen', amsterdamDatum('2026-12-31 23:30:00'), '2027-01-01');
  ok('een kale datum blijft staan', amsterdamDatum('2026-12-31'), '2026-12-31');
  ok('"Betaald op" volgt de Nederlandse dag', snapshotFromOrder({ paid_at: '2026-12-31 23:30:00', lang: 'nl', total_cents: 1, vat_cents: 0 }, {}, { number: 'X', date: '2027-01-01' }).paidAt, '2027-01-01');

  console.log('\n1 · de jaarwisseling met een vastgezette klok');
  for (const [iso, datum, reeks] of [
    ['2026-12-31T22:30:00Z', '2026-12-31', 'VIS-2026-'],
    ['2026-12-31T23:30:00Z', '2027-01-01', 'VIS-2027-'],
    ['2027-07-31T23:30:00Z', '2027-08-01', 'VIS-2027-'],
  ]) {
    const { db, env } = omgeving();
    const { order, id } = await betaaldeBestelling(env, db);
    zetKlok(iso);
    try { await webhook(env, id); } finally { klokTerug(); }
    const f = db.prepare('SELECT number, snapshot_json FROM invoices WHERE order_id = ?').get(order.id);
    ok(`${iso}: factuurdatum ${datum}`, JSON.parse(f?.snapshot_json || '{}').date, datum);
    ok(`${iso}: nummer uit ${reeks}`, String(f?.number || '').startsWith(reeks), true);
    /* En een creditnota in dezelfde nacht krijgt ook de Nederlandse dag. */
    terug(id, '10.00');
    zetKlok(iso);
    try { await webhook(env, id); } finally { klokTerug(); }
    const n = db.prepare('SELECT number, snapshot_json FROM credit_notes WHERE order_id = ?').get(order.id);
    ok(`${iso}: creditnotadatum ${datum}`, JSON.parse(n?.snapshot_json || '{}').date, datum);
  }

  console.log('\n2 · dezelfde terugbetaling twee keer tegelijk gemeld');
  {
    const { db, env } = omgeving();
    const { order, id } = await betaaldeBestelling(env, db);
    await webhook(env, id);
    terug(id, '100.00');
    await Promise.all([webhook(env, id), webhook(env, id)]);
    ok('één creditnota', telling(db, 'SELECT COUNT(*) FROM credit_notes WHERE order_id = ?', order.id), 1);
    ok('voor precies € 100', telling(db, 'SELECT SUM(gross_cents) FROM credit_notes WHERE order_id = ?', order.id), 10000);
    ok('één regel op de tijdlijn', telling(db, "SELECT COUNT(*) FROM order_events WHERE order_id = ? AND note LIKE 'Mollie heeft de terugbetaling%'", order.id), 1);
    ok('refunded_cents = 10000', db.prepare('SELECT refunded_cents FROM orders WHERE id = ?').get(order.id).refunded_cents, 10000);
    /* En daarna een gewone volgende melding: de rest. */
    terug(id, '393.25');
    await webhook(env, id);
    ok('volledig: samen precies het factuurbedrag', telling(db, 'SELECT SUM(gross_cents) FROM credit_notes WHERE order_id = ?', order.id), 39325);
    ok('en de bestelling staat op refunded', db.prepare('SELECT payment_status FROM orders WHERE id = ?').get(order.id).payment_status, 'refunded');
  }

  console.log('\n3 · drie deelnota\'s en de rest sluiten op de cent');
  {
    const { db, env } = omgeving();
    const { order, id } = await betaaldeBestelling(env, db);
    await webhook(env, id);
    const f = db.prepare('SELECT snapshot_json FROM invoices WHERE order_id = ?').get(order.id);
    const fs = JSON.parse(f.snapshot_json);
    for (const euro of ['100.00', '200.00', '300.00', '393.25']) { terug(id, euro); await webhook(env, id); }
    const notas = db.prepare('SELECT net_cents, vat_cents, gross_cents FROM credit_notes WHERE order_id = ? ORDER BY id').all(order.id);
    ok('vier nota\'s', notas.length, 4);
    ok('bruto samen = factuur', notas.reduce((s, n) => s + n.gross_cents, 0), fs.grossCents);
    ok('netto samen = factuur', notas.reduce((s, n) => s + n.net_cents, 0), fs.netCents);
    ok('btw samen = factuur', notas.reduce((s, n) => s + n.vat_cents, 0), fs.vatCents);
  }
} finally {
  klokTerug();
  globalThis.fetch = echteFetch;
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
