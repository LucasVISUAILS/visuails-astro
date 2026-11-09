/* ═══════════════════════════════════════════════════════════════════════════════
 * "ERGENS ANDERS" EN ONBEKENDE LANDCODES — 9 november 2026 (ronde 91, B11)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node tests/blind91-b-landcode.test.mjs
 *
 * XX ("Ergens anders") en elke code buiten de EU die het formulier niet kent (ZZ, LI,
 * MC … via een zelfgebouwde POST) werden 0% "buiten de EU" en waren meteen te
 * betalen; de factuur drukte "XX" als land. Nu: de btw-lijst (/admin/vat, waar Lucas
 * "0% blijft staan" of "btw alsnog rekenen" kiest), geen betaling vooraf, en op de
 * factuur alleen een land dat we kennen. Een abonnement (geen btw-lijst) gaat de
 * o16-weg: eerst nakijken. De landen uit het formulier blijven zoals ze waren.
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
const { landVraagtNakijken, landOpFactuur, vatGate } = await import('../src/data/vat.js');
const { snapshotFromOrder } = await import('../src/lib/invoice.js');
const { bepaalBedrijfEnBtw } = await import('../src/lib/subscribe.js');
const { onRequestGet: orderPay } = await import('../functions/api/order-pay.js');

try {
  console.log('\nVISUAILS — "Ergens anders" en onbekende landcodes (ronde 91)\n');

  console.log('de regel');
  ok('XX vraagt nakijken', landVraagtNakijken('XX'), true);
  ok('een onbekende code ook (ZZ)', landVraagtNakijken('zz'), true);
  ok('een echt land dat het formulier niet kent ook (LI)', landVraagtNakijken('LI'), true);
  for (const land of ['US', 'GB', 'CH', 'NO', 'CA', 'AU', 'NL', 'DE', '']) ok(`${land || '(leeg)'} niet`, landVraagtNakijken(land), false);
  ok('vatGate: XX is niet meteen te betalen', vatGate({ country: 'XX', treatment: 'outside_scope' }).payableNow, false);
  ok('vatGate: US blijft meteen te betalen', vatGate({ country: 'US', treatment: 'outside_scope' }), { needsReview: false, payableNow: true, reasons: [] });

  console.log('\nde bestelling');
  for (const land of ['XX', 'ZZ', 'LI']) {
    const { db, env } = omgeving();
    const voor = aangemaakt.length;
    const res = await bestel(env, { country: land });
    const o = laatste(db);
    ok(`${land}: geen betaling vooraf`, aangemaakt.length - voor, 0);
    ok(`${land}: op de btw-lijst`, o.review_state, 'pending');
    ok(`${land}: met de reden erbij`, /Ergens anders|Onbekende landcode/.test(o.review_reason || ''), true);
    ok(`${land}: de klant landt op "eerst nakijken"`, /nakijk=1/.test(res.headers.get('location') || ''), true);
  }
  {
    const { db, env } = omgeving();
    const voor = aangemaakt.length;
    await bestel(env, { country: 'US' });
    ok('US: nog steeds meteen een betaling', aangemaakt.length - voor, 1);
    ok('US: niet op de btw-lijst', laatste(db).review_state, null);
  }

  console.log('\nde factuur');
  ok('landOpFactuur("XX") is leeg', landOpFactuur('XX'), null);
  ok('landOpFactuur("ZZ") is leeg', landOpFactuur('ZZ'), null);
  ok('landOpFactuur("de") is DE', landOpFactuur('de'), 'DE');
  ok('landOpFactuur("US") is US', landOpFactuur('US'), 'US');
  ok('snapshot van een XX-bestelling draagt geen land', snapshotFromOrder({ country: 'XX', lang: 'en', total_cents: 100, vat_cents: 0 }, {}, { number: 'X', date: '2026-11-09' }).customer.country, null);
  {
    /* De hele weg: nakijken, goedkeuren (zoals /admin/vat), betalen, factuur. */
    const { db, env } = omgeving();
    await bestel(env, { country: 'XX', lang: 'en' });
    const o = laatste(db);
    db.prepare("UPDATE orders SET review_state = 'approved', reviewed_at = datetime('now') WHERE id = ?").run(o.id);
    await orderPay({ request: new Request(`https://visuails.com/api/order-pay?ref=${o.ref}&lang=en`), env, waitUntil: () => {} });
    const id = [...betalingen.keys()].pop();
    Object.assign(betalingen.get(id), { status: 'paid', paidAt: '2026-11-09T10:00:00+00:00', method: 'creditcard' });
    await webhook(env, id);
    const f = db.prepare('SELECT snapshot_json FROM invoices WHERE order_id = ?').get(o.id);
    ok('na goedkeuren en betalen is er een factuur', !!f, true);
    ok('zonder "XX" als land', JSON.parse(f?.snapshot_json || '{}').customer?.country ?? null, null);
    ok('met het adres', (JSON.parse(f?.snapshot_json || '{}').customer?.address || []).length > 0, true);
  }

  console.log('\nhet abonnement');
  const form = (land) => { const fd = new FormData(); for (const [k, v] of Object.entries({ country: land, brand: 'TESTMERK', reg_number: 'REG-1', no_vat: '1', business_declaration: 'yes' })) fd.append(k, v); return fd; };
  const xx = await bepaalBedrijfEnBtw({}, form('XX'), null, '');
  ok('XX: eerst nakijken', xx.nakijken?.land, 'XX');
  const us = await bepaalBedrijfEnBtw({}, form('US'), null, 'US');
  ok('US vanaf een US-ip: gewoon door', us.nakijken ?? null, null);
  ok('US: 0% buiten de EU', us.btw?.treatment, 'outside_scope');
} finally {
  globalThis.fetch = echteFetch;
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
