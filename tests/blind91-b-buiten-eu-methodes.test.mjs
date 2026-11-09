/* ═══════════════════════════════════════════════════════════════════════════════
 * BUITEN DE EU GEEN BANCONTACT EN EPS — 9 november 2026 (ronde 91, B13)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node tests/blind91-b-buiten-eu-methodes.test.mjs
 *
 * Op een bestelling "buiten de EU" bood Mollie Bancontact en EPS aan, en
 * paymentMismatch() noemde precies die betaling daarna verdacht ("betaald met
 * bancontact (een Europese bank) terwijl het land US is"). Nu krijgt buiten de EU
 * alleen middelen die die controle niet raakt — op alle vier de betaalpaden:
 * bestellen, de €1-proef, de betaallink en "Nu betalen" in Studio. Binnen de EU
 * (verlegd) blijft het zoals het was.
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
const { paymentMismatch } = await import('../src/data/vat.js');
const { onRequestGet: orderPay } = await import('../functions/api/order-pay.js');
const { accountPost } = await import('../src/lib/account.js');
const { mintToken, hashToken } = await import('../src/lib/token.js');

const nietVerdacht = (lijst, land) => (lijst || []).filter((m) => paymentMismatch({ method: m, country: land, treatment: 'outside_scope' }) !== null);

try {
  console.log('\nVISUAILS — betaalmiddelen buiten de EU (ronde 91)\n');

  console.log('bestellen');
  {
    const { env } = omgeving();
    await bestel(env, { country: 'US', lang: 'en' });
    const m = aangemaakt.at(-1).method;
    ok('US: een witte lijst', Array.isArray(m) && m.length > 0, true);
    ok('US: geen Bancontact of EPS', (m || []).filter((x) => x === 'bancontact' || x === 'eps'), []);
    ok('US: niets wat paymentMismatch() verdacht noemt', nietVerdacht(m, 'US'), []);
    ok('US: kaart, PayPal en overboeking', ['creditcard', 'paypal', 'banktransfer'].every((x) => (m || []).includes(x)), true);
  }
  {
    const { env } = omgeving();
    await bestel(env, { country: 'DE', vat: 'DE123456789', vat_confirmed: 'yes', no_vat: '', reg_number: '' });
    const m = aangemaakt.at(-1).method || [];
    ok('DE verlegd: Bancontact en EPS blijven (binnen de EU)', m.includes('bancontact') && m.includes('eps'), true);
    ok('DE verlegd: geen iDEAL', m.includes('ideal'), false);
  }
  {
    const { env } = omgeving();
    await bestel(env, {});
    ok('NL: geen witte lijst', 'method' in aangemaakt.at(-1), false);
  }

  console.log('\nde €1-proef');
  {
    const { env } = omgeving();
    await bestel(env, { service: 'test-sample', products: '1', sample_type: 'catalog', country: 'US', lang: 'en' });
    ok('US-proef: alleen de kaart', aangemaakt.at(-1).method, ['creditcard']);
  }

  console.log('\nde betaallink en Studio');
  for (const pad of ['link', 'studio']) {
    const { db, env } = omgeving();
    await bestel(env, { country: 'US', lang: 'en' });
    const o = laatste(db);
    const voor = aangemaakt.length;
    if (pad === 'link') {
      await orderPay({ request: new Request(`https://visuails.com/api/order-pay?ref=${o.ref}&lang=en`), env, waitUntil: () => {} });
    } else {
      const token = await mintToken();
      db.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 day'))").run(o.customer_id, await hashToken(token));
      await accountPost({ request: new Request(`https://visuails.com/account/orders/${o.id}/pay`, { method: 'POST', body: new FormData(), headers: { cookie: `vis_account=${token}`, origin: 'https://visuails.com' } }), env, params: { path: `orders/${o.id}/pay` }, waitUntil: () => {} });
    }
    const m = aangemaakt.slice(voor)[0]?.method;
    ok(`${pad}: een tweede betaling`, aangemaakt.length - voor, 1);
    ok(`${pad}: niets wat paymentMismatch() verdacht noemt`, nietVerdacht(m, 'US'), []);
    ok(`${pad}: geen Bancontact`, (m || []).includes('bancontact'), false);
  }
} finally {
  globalThis.fetch = echteFetch;
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
