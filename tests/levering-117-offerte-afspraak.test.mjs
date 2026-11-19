/*
 * LEVERING 117 · P4-04 — DE OFFERTE ZEGT WAT JE KRIJGT EN WANNEER
 * 17 november 2026
 *
 *   node tests/levering-117-offerte-afspraak.test.mjs        (geen build nodig)
 *
 * Het offerteformulier in /admin had alleen een bedrag. De mail zei "zoals besproken", zonder datum
 * of inhoud, en /o/ en Studio verwezen naar "de levertijd uit de offerte", die er niet was. Nu twee
 * velden, "Wat je krijgt" en "Klaar op", en beide staan in de mail, op /o/ en op de factuur.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { portalGet } from '../src/lib/portal.js';
import { snapshotFromOrder } from '../src/lib/invoice.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117 P4-04: wat je krijgt en klaar op, in de offerte\n');

const mails = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const tekst = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'video@proefmerk.test', 'Testa Proef', 'PROEFMERK', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, lang, total_cents, vat_cents, vat_rate, vat_treatment,
                      country, payment_status, details_json, address_line1, postal_code, city)
  VALUES (11706, 'VIS-TEST-11706', 1, 'video', 'received', 'Testa Proef', 'PROEFMERK', 'video@proefmerk.test', 'nl', 0, 0, 0.21, 'nl_standard',
          'NL', 'unpaid', '{"style":"motion","business_declaration":"v1"}', 'Teststraat 1', '1234 AB', 'Teststad');
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
const env = {
  DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
  UPLOADS: { async put() {}, async get() { return null; }, async head() { return null; }, async delete() {}, async list() { return { objects: [] }; } },
};
const headers = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };
const klaar = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const klaarNl = `${Number(klaar.slice(8))} ${MAANDEN[Number(klaar.slice(5, 7)) - 1]} ${klaar.slice(0, 4)}`;

console.log('1 · het offerteformulier in /admin');
{
  const r = await adminGet({ request: new Request('https://visuails.com/admin/orders/11706/files', { headers }), env, waitUntil() {} });
  const h = await r.text();
  const form = h.slice(h.indexOf('/admin/orders/11706/quote'), h.indexOf('</form>', h.indexOf('/admin/orders/11706/quote')));
  ok('heeft "Wat je krijgt" (verplicht)', /Wat je krijgt/.test(form) && /name="inhoud"[^>]*required/.test(form));
  ok('heeft "Klaar op" (datum, verplicht)', /Klaar op/.test(form) && /name="klaar_op" type="date" required/.test(form));
}

console.log('\n2 · de offerte vastleggen');
{
  const fd = new FormData();
  fd.set('amount', '360'); fd.set('soort', 'volledig'); fd.set('inhoud', 'Twee Motion-clips van 8 seconden, 9:16'); fd.set('klaar_op', klaar);
  const voor = mails.length;
  const r = await adminPost({ request: new Request('https://visuails.com/admin/orders/11706/quote', { method: 'POST', body: fd, headers }), env, waitUntil() {} });
  ok('303 met quote=sent', r.status === 303 && /quote=sent/.test(r.headers.get('location') || ''), `${r.status} ${r.headers.get('location')}`);
  const d = JSON.parse(db.prepare('SELECT details_json FROM orders WHERE id = 11706').get().details_json);
  ok('op de bestelling: quote_inhoud en quote_klaar_op', d.quote_inhoud === 'Twee Motion-clips van 8 seconden, 9:16' && d.quote_klaar_op === klaar, JSON.stringify(d));
  const m = mails.slice(voor).find((x) => /Je offerte/.test(x.subject || ''));
  const t = tekst(m?.html);
  ok('de offertemail noemt wat je krijgt', /Wat je krijgt Twee Motion-clips van 8 seconden, 9:16/.test(t), t.slice(0, 300));
  ok(`en "Klaar op ${klaarNl}"`, t.includes(`Klaar op ${klaarNl}`));
}

console.log('\n3 · na betalen: /o/ en de factuur');
{
  db.exec("UPDATE orders SET payment_status = 'paid', paid_at = datetime('now') WHERE id = 11706");
  const portaal = await mintToken();
  db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (11706, ?)').run(await hashToken(portaal));
  const r = await portalGet({ request: new Request(`https://visuails.com/o/${portaal}`), env, waitUntil() {} });
  const t = tekst(await r.text());
  ok('/o/ toont "Wat je krijgt" en "Klaar op"', /Wat je krijgt Twee Motion-clips/.test(t) && t.includes(`Klaar op ${klaarNl}`), `status ${r.status}`);
  ok('/o/ zegt niet meer "de levertijd uit de offerte"', !/levertijd uit de offerte/.test(t) && t.includes(`klaar op ${klaarNl}`));
  const o = db.prepare('SELECT * FROM orders WHERE id = 11706').get();
  const snap = snapshotFromOrder(o, env, { number: 'PROEF-2026-0001', date: '2026-11-17' });
  ok('de factuurregel noemt wat je krijgt en klaar op', /Wat je krijgt: Twee Motion-clips/.test(snap.lines[0].detail || '') && (snap.lines[0].detail || '').includes(`Klaar op: ${klaarNl}`), snap.lines[0].detail);
}

console.log('\n4 · een offerte zonder de velden (oude tab) gaat zoals vroeger');
{
  db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, email, lang, total_cents, vat_rate, payment_status, details_json)
           VALUES (11707, 'VIS-TEST-11707', 1, 'video', 'received', 'video@proefmerk.test', 'nl', 0, 0.21, 'unpaid', '{}')`);
  const fd = new FormData();
  fd.set('amount', '200');
  const r = await adminPost({ request: new Request('https://visuails.com/admin/orders/11707/quote', { method: 'POST', body: fd, headers }), env, waitUntil() {} });
  ok('bedrag gezet, geen fout', r.status === 303 && db.prepare('SELECT total_cents FROM orders WHERE id = 11707').get().total_cents === 20000);
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
