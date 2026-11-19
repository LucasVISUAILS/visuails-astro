/*
 * LEVERING 117 · P3-09 — EEN LEVERDATUM VERDER DAN TWEE WEKEN WORDT NIET MEER GEWEIGERD
 * 17 november 2026
 *
 *   node tests/levering-117-leverdatum.test.mjs        (geen build nodig)
 *
 * De poort in /api/order zocht de gevraagde start alleen in de eerste twaalf vrije vensters. De
 * kalender biedt 60 dagen aan; elke datum daarna gaf "Die leverdatum is weg", ook in een lege
 * agenda. En loseRaceIfOversold() deed hetzelfde direct na het opslaan. Deze toets bestelt met een
 * datum ruim een maand vooruit in een lege agenda, en met een datum die echt vol is.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { clearedWindows } from '../src/data/capacity.js';
import { vandaagNL } from '../src/lib/nlDag.js';
import { WINDOW_THRESHOLD } from '../src/data/pricing.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117 P3-09: leverdatum na het twaalfde venster\n');

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

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
const r2 = new Map();
const env = {
  DB: d1(db),
  UPLOADS: { async put(k, b) { r2.set(k, b); }, async get() { return null; }, async head() { return null }, async delete() {}, async list() { return { objects: [] }; } },
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
};
const { onRequestPost } = await import('../functions/api/order.js');
const producten = WINDOW_THRESHOLD + 2;
const bestel = async (email, start, end) => {
  const fd = new FormData();
  const velden = {
    service: 'catalog', products: String(producten), name: 'Testa Proef', brand: 'PROEFMERK', email, phone: '+31 6 12345678',
    country: 'NL', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl',
    style: 'classic', background: 'studio-white', business_declaration: 'yes', business_version: 'v1', no_vat_number: '1',
    reg_number: '12345678', window_start: start, window_end: end, mode: 'json', back: '/nl/thank-you',
  };
  for (let i = 1; i <= producten; i++) velden[`product_p${i}`] = `Product ${i}`;
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  return onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }), env, waitUntil: () => {} });
};

const vandaag = vandaagNL();
const alle = clearedWindows({ today: vandaag, products: producten, service: 'catalog', limit: 60 }).windows;
ok('de lege agenda heeft meer dan twaalf vensters', alle.length > 12, String(alle.length));
const ver = alle[Math.min(alle.length - 1, 30)];
ok(`een venster ruim na het twaalfde gekozen (${ver?.start})`, !!ver && ver.start > alle[11].start);

{
  const res = await bestel('ver@voorbeeldmerk.test', ver.start, ver.end);
  const body = await res.clone().json().catch(() => ({}));
  ok('geen 409 "window-gone" bij een vrije datum ver vooruit', res.status !== 409 && body.error !== 'window-gone', `${res.status} ${body.error || ''}`);
  const rij = db.prepare("SELECT window_start, window_end FROM orders WHERE email = 'ver@voorbeeldmerk.test'").get();
  ok('de bestelling houdt die datum (ook na de controle op een dubbele boeking)', rij?.window_start === ver.start && rij?.window_end === ver.end, JSON.stringify(rij));
}

{
  /* Een datum die écht niet meer vrij is: zet de agenda op die dagen vol met reserveringen, rechtstreeks
     in de database (via het formulier zou de botrem na een paar bestellingen ingrijpen). */
  db.exec(`INSERT INTO customers (id, email, brand) VALUES (1170, 'vol@voorbeeldmerk.test', 'Vol')`);
  for (let i = 0; i < 12; i++) {
    db.prepare(`INSERT INTO orders (ref, customer_id, service, status, email, tier, window_start, window_end, product_count, payment_status)
                VALUES (?, 1170, 'catalog', 'received', 'vol@voorbeeldmerk.test', 'attended', ?, ?, ?, 'paid')`)
      .run(`VIS-TEST-VOL${i}`, ver.start, ver.end, producten);
  }
  const voor = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE window_start = ?').get(ver.start).n;
  const res = await bestel('te-laat@voorbeeldmerk.test', ver.start, ver.end);
  const body = await res.clone().json().catch(() => ({}));
  ok('een volle datum geeft nog steeds "window-gone" (409)', res.status === 409 && body.error === 'window-gone', `${res.status}`);
  ok('  met de vroegste vrije data vanaf vandaag als alternatief', Array.isArray(body.windows) && body.windows[0]?.start === alle[0].start, JSON.stringify(body.windows?.[0]));
  const na = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE window_start = ?').get(ver.start).n;
  ok('  en er komt niemand meer bij op die dag', na === voor, `${na} vs ${voor}`);
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
