/*
 * LEVERING 117 · P5-12 — HET MERKMODEL IS INBEGREPEN BIJ EEN MERK-ABONNEMENT
 * 17 november 2026
 *
 *   node tests/levering-117-merkmodel-abo.test.mjs        (geen build nodig)
 *
 * /plans en /custom-models zeggen dat het merkmodel bij Merk inbegrepen is (hasBrandModel() in
 * plans.js). Een Merk-abonnee kreeg bij /start/brand-model toch €450 bij Mollie. Nu:
 *   1 · quoteBrandModel({ inbegrepen: true }) is €0, gewoon is hij AMOUNT.brandModel;
 *   2 · een ingelogde Merk-abonnee: bestelling van €0, meteen voldaan, geen Mollie, mail zegt "inbegrepen";
 *   3 · een tweede merkmodel betaalt wel (één per abonnement);
 *   4 · zonder sessie (alleen het e-mailadres) betaalt hij ook;
 *   5 · Starter (geen merkmodel) betaalt.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { quoteBrandModel } from '../src/lib/quote.js';
import { merkmodelInAbonnement } from '../src/lib/slots.js';
import { AMOUNT } from '../src/data/pricing.js';
import { BUSINESS_VERSION } from '../src/data/business.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117 P5-12: merkmodel inbegrepen bij Merk\n');

console.log('1 · de prijs');
ok('gewoon: AMOUNT.brandModel netto', quoteBrandModel({ vatRate: 0.21 }).netCents === AMOUNT.brandModel * 100);
const nul = quoteBrandModel({ vatRate: 0.21, inbegrepen: true });
ok('inbegrepen: €0 netto, €0 btw, €0 bruto, met inbegrepen: true', nul.netCents === 0 && nul.vatCents === 0 && nul.grossCents === 0 && nul.inbegrepen === true, JSON.stringify(nul));

const mollie = [];
const mails = [];
let volg = 0;
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.endsWith('/v2/payments')) {
    mollie.push(JSON.parse(String(opts.body || '{}')));
    const id = `tr_${String(++volg).padStart(10, '0')}`;
    return new Response(JSON.stringify({ id, status: 'open', _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } }), { status: 201, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
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
const MERK = 'abonnee@merkproef.test';
const START = 'starter@merkproef.test';
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (1, '${MERK}', 'Testa Proef', 'MERKPROEF', 'NL'), (2, '${START}', 'Testa Starter', 'STARTPROEF', 'NL');
  INSERT INTO subscriptions (customer_id, ref, plan, term, status) VALUES (1, 'ABO-TEST-1', 'brand', 'monthly', 'active'), (2, 'ABO-TEST-2', 'starter', 'monthly', 'active');
`);
let ip = 1;
const bestel = async (email, cid, { sessie = true } = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({
    service: 'brand-model', lang: 'nl', bm_track: 'ours', bm_audience: 'x', first_name: 'Testa', last_name: 'Proef', brand: 'MERKPROEF',
    phone: '+31 6 12345678', email, address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad',
    country: 'NL', vat: '', reg_number: '12345678', business_declaration: 'yes', business_version: BUSINESS_VERSION,
  })) fd.append(k, v);
  const terug = stil();
  let res;
  try {
    res = await onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.51.2.${ip++}` } }), env, waitUntil: () => {},
      ...(sessie ? { sessieKlant: { email, customer_id: cid } } : {}) });
  } finally { terug(); }
  return { res, o: db.prepare('SELECT * FROM orders WHERE email = ? ORDER BY id DESC LIMIT 1').get(email) };
};

console.log('\n2 · ingelogde Merk-abonnee bestelt een merkmodel');
{
  ok('merkmodelInAbonnement: ja (brand/monthly)', JSON.stringify(await merkmodelInAbonnement(env, 1)) === JSON.stringify({ plan: 'brand', term: 'monthly' }));
  const voorM = mollie.length;
  const voorMail = mails.length;
  const { res, o } = await bestel(MERK, 1);
  ok('bestelling van €0', o?.service === 'brand-model' && Number(o.total_cents) === 0 && Number(o.vat_cents) === 0, JSON.stringify({ t: o?.total_cents, v: o?.vat_cents }));
  ok('meteen voldaan, via het abonnement', o?.payment_status === 'paid' && o?.payment_provider === 'abonnement', `${o?.payment_status} ${o?.payment_provider}`);
  ok('geen betaling bij Mollie', mollie.length === voorM, String(mollie.length - voorM));
  ok('de terugweg zegt "betaald" (paid=)', /paid=/.test(res.headers.get('location') || ''), res.headers.get('location') || String(res.status));
  const klant = mails.slice(voorMail).find((m) => /We hebben je bestelling/.test(m.subject || ''));
  ok('de bevestiging zegt "inbegrepen in je abonnement"', /inbegrepen in je abonnement/.test(klant?.html || ''), mails.slice(voorMail).map((m) => m.subject).join(' | '));
  ok('de studio hoort het (Betaald-mail)', mails.slice(voorMail).some((m) => /^Betaald/.test(m.subject || '')));
}

console.log('\n3 · een tweede merkmodel betaalt wel');
{
  ok('merkmodelInAbonnement: nee, er is er al één', (await merkmodelInAbonnement(env, 1)) === null);
  const { o } = await bestel(MERK, 1);
  ok('€450 netto, onbetaald', Number(o?.total_cents) === AMOUNT.brandModel * 100 && o?.payment_status !== 'paid', JSON.stringify({ t: o?.total_cents, p: o?.payment_status }));
}

console.log('\n4 · zonder sessie (alleen het e-mailadres) geen gratis merkmodel');
{
  db.exec("UPDATE orders SET status = 'cancelled' WHERE customer_id = 1");
  const { o } = await bestel(MERK, 1, { sessie: false });
  ok('betaalt gewoon', Number(o?.total_cents) === AMOUNT.brandModel * 100, String(o?.total_cents));
}

console.log('\n5 · Starter heeft geen merkmodel');
{
  ok('merkmodelInAbonnement: nee', (await merkmodelInAbonnement(env, 2)) === null);
  const { o } = await bestel(START, 2);
  ok('betaalt gewoon', Number(o?.total_cents) === AMOUNT.brandModel * 100, String(o?.total_cents));
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
