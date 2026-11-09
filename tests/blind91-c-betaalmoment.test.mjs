/*
 * PAID_AT IS HET MOMENT VAN BETALEN — 9 november 2026 (ronde 91, C05)
 *
 * De webhook schreef paid_at = datetime('now'): het moment van de melding. De
 * voorrangsregel ("betaal je op een werkdag vóór 15:00") en de factuurdatum lezen
 * paid_at. Wie om 14:59:50 betaalde en wiens melding om 15:00:05 binnenkwam, kreeg
 * een werkdag later dan beloofd. Nu payment.paidAt van Mollie, met datetime('now')
 * als terugval. Echte SQLite, nep-Mollie, de echte /api/order en de echte webhook.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};

const betalingen = new Map();
let volg = 0;
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') {
    const p = JSON.parse(String(opts.body));
    const id = `tr_${String(++volg).padStart(10, '0')}`;
    const rec = { id, mode: 'test', status: 'open', amount: p.amount, metadata: p.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
    betalingen.set(id, rec);
    return json(rec, 201);
  }
  const m = u.match(/\/v2\/payments\/(tr_[0-9a-zA-Z]+)$/);
  if (m) return betalingen.has(m[1]) ? json(betalingen.get(m[1])) : json({ status: 404 }, 404);
  return json({ id: 'msg_test' });
};
const EchteDate = Date;
const zetKlok = (iso) => {
  const vast = new EchteDate(iso).getTime();
  globalThis.Date = class extends EchteDate { constructor(...a) { super(...(a.length ? a : [vast])); } static now() { return vast; } };
};
const klokTerug = () => { globalThis.Date = EchteDate; };

const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
const { onRequestPost: webhookPost, betaalMoment } = await import('../functions/api/webhook/mollie.js');
const { voorrangDeadline } = await import('../src/data/pricing.js');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema laadt', mislukt, []);
const emmer = new Map();
const env = { MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@voorbeeld.test>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db),
  UPLOADS: { async put(k, b) { emmer.set(k, b); }, async get(k) { return emmer.has(k) ? { body: emmer.get(k) } : null; }, async delete(k) { emmer.delete(k); }, async head() { return null; } } };
const stil = () => { const l = console.log, e = console.error, w = console.warn; console.log = console.error = console.warn = () => {}; return () => { console.log = l; console.error = e; console.warn = w; }; };

let ip = 1;
async function bestel() {
  const fd = new FormData();
  const velden = { service: 'catalog', products: '5', name: 'Test Klant', brand: 'TESTMERK', email: `klant${ip}@voorbeeld.test`, phone: '+31 6 12345678', country: 'NL',
    address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes', business_version: 'v1', no_vat: '1', reg_number: '12345678', voorrang: '1' };
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  const terug = stil();
  try { await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.9.0.${ip++}` } }), env, waitUntil: () => {} }); } finally { terug(); }
  return { order: db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get(), id: [...betalingen.keys()].pop() };
}
async function webhook(id) {
  const fd = new FormData(); fd.append('id', id);
  const terug = stil();
  try { return await webhookPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: fd }), env, waitUntil: () => {} }); } finally { terug(); }
}

console.log('\nVISUAILS — paid_at is het moment van betalen (ronde 91, C05)\n');

console.log('1 · betaalMoment()');
ok('Mollie-tijd met offset naar SQLite-UTC', betaalMoment({ paidAt: '2026-11-09T14:59:50+01:00' }, Date.parse('2026-11-09T14:10:00Z')), '2026-11-09 13:59:50');
ok('met Z en milliseconden', betaalMoment({ paidAt: '2026-11-09T13:59:50.123Z' }, Date.parse('2026-11-09T14:10:00Z')), '2026-11-09 13:59:50');
ok('geen paidAt → null (dan datetime(\'now\'))', betaalMoment({}), null);
ok('onleesbaar → null', betaalMoment({ paidAt: 'gisteren' }), null);
ok('meer dan vijf minuten in de toekomst → null', betaalMoment({ paidAt: '2026-11-09T15:10:00Z' }, Date.parse('2026-11-09T15:00:00Z')), null);

console.log('2 · de webhook: betaald 14:59:50, melding 15:00:05 (maandag 9 november)');
{
  zetKlok('2026-11-09T13:00:00Z');
  const { order, id } = await bestel();
  ok('de bestelling heeft voorrang', /"voorrang":"1"/.test(order.details_json || ''), true);
  Object.assign(betalingen.get(id), { status: 'paid', paidAt: '2026-11-09T14:59:50+01:00', method: 'ideal' });
  zetKlok('2026-11-09T14:00:05Z');                     /* 15:00:05 Nederlandse tijd */
  await webhook(id);
  klokTerug();
  const rij = db.prepare('SELECT paid_at, payment_status FROM orders WHERE id = ?').get(order.id);
  ok('paid_at = het moment van Mollie', [rij.payment_status, rij.paid_at], ['paid', '2026-11-09 13:59:50']);
  ok('voorrang: uiterlijk dinsdag 10 november 17:00 (vóór 15:00 betaald)', voorrangDeadline(rij.paid_at)?.datum, '2026-11-10');
}

console.log('3 · een herhaalde melding de volgende dag verandert de betaaltijd niet');
{
  zetKlok('2026-11-09T13:00:00Z');
  const { order, id } = await bestel();
  Object.assign(betalingen.get(id), { status: 'paid', paidAt: '2026-11-09T13:30:00+00:00', method: 'ideal' });
  zetKlok('2026-11-10T09:00:00Z');                     /* Mollie herhaalde de melding pas een dag later */
  await webhook(id);
  klokTerug();
  ok('paid_at is maandag, niet dinsdag', db.prepare('SELECT paid_at FROM orders WHERE id = ?').get(order.id).paid_at, '2026-11-09 13:30:00');
}

console.log('4 · zonder paidAt: de tijd van de melding');
{
  zetKlok('2026-11-09T13:00:00Z');
  const { order, id } = await bestel();
  Object.assign(betalingen.get(id), { status: 'paid', method: 'ideal' });
  delete betalingen.get(id).paidAt;
  await webhook(id);
  klokTerug();
  const pa = db.prepare('SELECT paid_at FROM orders WHERE id = ?').get(order.id).paid_at;
  ok('paid_at gezet met datetime(\'now\') (van de database)', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(pa || ''), true);
}

globalThis.fetch = echteFetch;
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
