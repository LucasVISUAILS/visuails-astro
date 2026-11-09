/* ═══════════════════════════════════════════════════════════════════════════════
 * VELDEN DIE OP GELD LIJKEN, KOMEN NIET UIT HET FORMULIER — 9 november 2026 (ronde 91, B12)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node tests/blind91-b-geldvelden.test.mjs
 *
 * Een zelfgebouwde POST met `korting=100%`, `vat_treatment=outside_scope`,
 * `total_cents=1` of `amount=0.01` kwam in details_json en stond zo in de
 * studiomail, naast de bedragen die de server uitrekende. Nu blijven ze erbuiten;
 * de velden die de formulieren echt posten (voorrang, kanalen, vat_confirmed …)
 * blijven staan, en het bedrag is dat van de server.
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
function ok(naam, waarde, verwacht = true) {
  const ja = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ja) goed++; else fout++;
  console.log(`${ja ? '  ok  ' : '  FAIL'} ${naam}${ja ? '' : `    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

/* Nep-Mollie (aanmaken, ophalen), nep-VIES (altijd geldig), mail onthouden. */
const betalingen = new Map();
const aangemaakt = [];
const mails = [];
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
    aangemaakt.push(p);
    return json(rec, 201);
  }
  const m = u.match(/\/v2\/payments\/(tr_[0-9a-zA-Z]+)$/);
  if (m) return betalingen.has(m[1]) ? json(betalingen.get(m[1])) : json({ status: 404 }, 404);
  if (u.includes('ec.europa.eu')) return json({ isValid: true, userError: 'VALID', requestDate: '2026-11-09T10:00:00Z', requestIdentifier: 'WAPITEST' });
  if (u.includes('resend.com')) { try { const b = JSON.parse(String(opts.body)); mails.push({ to: b.to, subject: b.subject, html: b.html || '' }); } catch {} }
  return json({ id: 'msg_test' });
};

const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
const { onRequestPost: webhookPost } = await import('../functions/api/webhook/mollie.js');

function omgeving() {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
  const emmer = new Map();
  const UPLOADS = { async put(k, b) { emmer.set(k, b); }, async get(k) { return emmer.has(k) ? { body: emmer.get(k) } : null; }, async delete(k) { emmer.delete(k); }, async head() { return null; } };
  return { db, env: { MOLLIE_API_KEY: 'live_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@visuails.com', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db), UPLOADS } };
}
const BASIS = { service: 'catalog', products: '5', name: 'Test Klant', brand: 'TESTMERK', phone: '+31 6 12345678', country: 'NL',
  address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes', business_version: 'v1', no_vat: '1', reg_number: '12345678' };
let ip = 1;
async function bestel(env, velden) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...BASIS, email: `klant${ip}@test.example`, ...velden })) fd.append(k, String(v));
  return bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.7.0.${ip++}` } }), env, waitUntil: () => {} });
}
async function webhook(env, id) {
  const fd = new FormData(); fd.append('id', id);
  return webhookPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: fd }), env, waitUntil: () => {} });
}
const laatste = (db) => db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
try {
  console.log('\nVISUAILS — geldvelden uit het formulier (ronde 91)\n');
  const { db, env } = omgeving();
  const NEP = { korting: '100%', discount: '50', vat_treatment: 'outside_scope', vat_rate: '0', total_cents: '1', net_cents: '1', gross_cents: '1',
    amount: '0.01', price: '1', prijs: '1', bedrag: '1', totaal: '1', currency: 'USD', rate: '0', fee: '0', payment_status: 'paid', testmodus: '1', review_state: 'approved' };
  mails.length = 0;
  const voor = aangemaakt.length;
  await bestel(env, { ...NEP, voorrang: '1', channels: 'amazon', vat_confirmed: '', product_p1: 'Hoodie', note: 'graag snel' });
  const o = laatste(db);
  const d = JSON.parse(o.details_json);
  for (const k of Object.keys(NEP)) ok(`${k} staat niet in details_json`, k in d, false);
  ok('voorrang (door de server gerekend) staat er wel', d.voorrang, '1');
  ok('kanalen staan er wel', d.channels, 'amazon');
  ok('productnaam staat er wel', d.product_p1, 'Hoodie');
  ok('een vrije notitie staat er wel', d.note, 'graag snel');
  const studio = mails.find((m) => JSON.stringify(m.to).includes('hello@visuails.com'));
  ok('er is een studiomail', !!studio, true);
  for (const k of ['korting', 'vat_treatment', 'total_cents', 'gross_cents', 'payment_status']) ok(`studiomail noemt geen ${k}`, (studio?.html || '').includes(k), false);
  const p = aangemaakt.slice(voor)[0];
  ok('Mollie vraagt het bedrag van de server (bruto van de rij)', Math.round(parseFloat(p?.amount?.value) * 100), o.total_cents + o.vat_cents);
  ok('in euro', p?.amount?.currency, 'EUR');
  ok('btw-soort van de server', o.vat_treatment, 'nl_standard');
} finally {
  globalThis.fetch = echteFetch;
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
