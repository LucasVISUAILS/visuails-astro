/*
 * LEVERING 117 · P12-01 — INGELOGD BESTELLEN VOOR MERK B ZET B'S GEGEVENS NIET OP ACCOUNT A
 * 17 november 2026
 *
 *   node tests/levering-117-account-gegevens.test.mjs        (geen build nodig)
 *
 * Ingelogd bestellen vulde lege accountvelden met de gegevens van die bestelling, ook zonder het
 * vinkje "Bewaar deze gegevens". Zo stond het btw-nummer (en KVK-nummer) van merk B bij naam en
 * adres van merk A, "op je volgende factuur". Nu alleen met het vinkje, of als de bestelling voor
 * hetzelfde merk is als het account (dan is er niets te mengen; tests/eigen-stijl.test.mjs blok 4b).
 * De bestelling zelf houdt altijd haar eigen gegevens.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117 P12-01: accountgegevens alleen met "Bewaar"\n');

const echteFetch = globalThis.fetch;
let volg = 0;
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.endsWith('/v2/payments')) {
    const id = `tr_${String(++volg).padStart(10, '0')}`;
    return new Response(JSON.stringify({ id, status: 'open', _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } }), { status: 201, headers: { 'content-type': 'application/json' } });
  }
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const stil = () => { const l = console.log, e = console.error, w = console.warn; console.log = console.error = console.warn = () => {}; return () => { console.log = l; console.error = e; console.warn = w; }; };

const { onRequestPost } = await import('../functions/api/order.js');
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
const env = {
  DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
  UPLOADS: { async put() {}, async get() { return null; }, async head() { return null; }, async delete() {}, async list() { return { objects: [] }; } },
};
const A = 'inkoop@merk-a.test';
db.prepare("INSERT INTO customers (id, email, name, brand, country) VALUES (1, ?, 'Testa Proef', 'MERK A', 'NL')").run(A);
let ip = 1;
const bestelVoorB = async (bewaar, { mail = A, cid = 1, merk = 'MERK B' } = {}) => {
  const fd = new FormData();
  const velden = {
    service: 'catalog', products: '2', name: 'Testa Proef', brand: merk, email: mail, phone: '+31 6 12345678',
    country: 'BE', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl',
    style: 'classic', background: 'studio-white', business_declaration: 'yes', business_version: 'v1',
    vat: 'BE0123456789', reg_number: '12345678', product_p1: 'Jas', product_p2: 'Broek', mode: 'json',
    ...(bewaar ? { save_details: '1' } : {}),
  };
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  const terug = stil();
  try {
    return await onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.12.0.${ip++}` } }), env, waitUntil: () => {}, sessieKlant: { email: mail, customer_id: cid } });
  } finally { terug(); }
};
const klant = () => db.prepare('SELECT vat_number, reg_number, billing_address, address_line1 FROM customers WHERE id = 1').get();

console.log('1 · ingelogd als A, bestellen voor merk B, zonder "Bewaar"');
{
  await bestelVoorB(false);
  const o = db.prepare('SELECT brand, vat_number, customer_id FROM orders ORDER BY id DESC LIMIT 1').get();
  ok('de bestelling is er, met de gegevens van B', o?.brand === 'MERK B' && /BE0123456789/.test(String(o?.vat_number || '').replace(/\s/g, '')), JSON.stringify(o));
  const k = klant();
  ok('het account van A krijgt geen btw-nummer van B', !k.vat_number, JSON.stringify(k));
  ok('geen KVK-nummer van B', !k.reg_number, JSON.stringify(k));
  ok('en geen adres van B', !k.billing_address && !k.address_line1, JSON.stringify(k));
}

console.log('\n2 · dezelfde bestelling met "Bewaar deze gegevens" aan');
{
  await bestelVoorB(true);
  const k = klant();
  ok('nu worden de lege velden wel gevuld (btw-nummer)', !!k.vat_number, JSON.stringify(k));
  ok('en het KVK-nummer', k.reg_number === '12345678', JSON.stringify(k));
}

console.log('\n3 · ingelogd voor het EIGEN merk, zonder "Bewaar": lege velden mogen gevuld worden');
{
  const C = 'inkoop@merk-c.test';
  db.prepare("INSERT INTO customers (id, email, name, brand, country) VALUES (3, ?, 'Testa Proef', 'Merk C', 'NL')").run(C);
  await bestelVoorB(false, { mail: C, cid: 3, merk: '  merk   C ' });
  const k = db.prepare('SELECT vat_number, reg_number FROM customers WHERE id = 3').get();
  ok('hetzelfde merk (hoofdletters en spaties maken niet uit): btw- en KVK-nummer gevuld', !!k.vat_number && k.reg_number === '12345678', JSON.stringify(k));
}

console.log('\n4 · een account zonder merk telt niet als hetzelfde merk');
{
  const D = 'inkoop@merk-d.test';
  db.prepare("INSERT INTO customers (id, email, name, country) VALUES (4, ?, 'Testa Proef', 'NL')").run(D);
  await bestelVoorB(false, { mail: D, cid: 4, merk: 'MERK D' });
  const k = db.prepare('SELECT vat_number, reg_number, brand FROM customers WHERE id = 4').get();
  ok('niets gevuld', !k.vat_number && !k.reg_number && !k.brand, JSON.stringify(k));
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
