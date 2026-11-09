/* ═══════════════════════════════════════════════════════════════════════════════
 * HET AANTAL PRODUCTEN STRIKT LEZEN — 9 november 2026 (ronde 91, B17)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node tests/blind91-b-aantal-strikt.test.mjs
 *
 * countOf() las met parseInt: "12abc" werd 12, "1e3" 1, "1.5" 1 — een aantal dat
 * het formulier nooit post, stil omgezet in een ander aantal (met een betaling
 * erbij). Nu is alleen een getal van cijfers een aantal; de rest is "aantal
 * onbekend" (geen betaling, de tekst blijft in products_gevraagd), zoals
 * "Meer dan 20 producten" al was.
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
  console.log('\nVISUAILS — het aantal producten (ronde 91)\n');
  for (const [invoer, aantal] of [
    ['5', 5], [' 12 ', 12], ['05', 5], ['20', 20],
    ['12abc', null], ['1e3', null], ['1.5', null], ['0x10', null], ['+5', null], ['-1', null], ['0', null], ['21', null], ['1000', null],
  ]) {
    const { db, env } = omgeving();
    const voor = aangemaakt.length;
    await bestel(env, { products: invoer });
    const o = laatste(db);
    ok(`"${invoer}" → ${aantal === null ? 'onbekend' : aantal}`, o.product_count, aantal);
    if (aantal === null) {
      ok(`"${invoer}": geen betaling`, aangemaakt.length - voor, 0);
      ok(`"${invoer}": wat de klant schreef blijft bewaard`, JSON.parse(o.details_json).products_gevraagd, invoer.trim());
    }
  }
} finally {
  globalThis.fetch = echteFetch;
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
