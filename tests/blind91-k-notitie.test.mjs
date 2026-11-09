/* VISUAILS — ronde 91 (K-C2), 9 november 2026: Catalog krijgt het optionele notitieveld
 * "Wat we moeten weten", zoals Lifestyle en de €1-proef. Lucas koos dat in lijst 85
 * (C2 = a). Zelfde veld (`message`), zelfde grens (maxlength 2000), zelfde opslag
 * (details_json), en zichtbaar in /admin ("Bericht van de klant") en in de studiomail.
 *
 * Bron + een echte bestelling tegen SQLite (tests/lib/d1sqlite.mjs) met nep-Mollie/Resend.
 *   node tests/blind91-k-notitie.test.mjs
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('de bron');
{
  const flow = lees('src/components/order/OrderFlow.astro');
  const i = flow.indexOf('id="pl-msg" name="message"');
  ok('het notitieveld staat er, met maxlength 2000', /<textarea class="textarea" id="pl-msg" name="message" maxlength="2000"><\/textarea>/.test(flow));
  /* Het veld stond in `{!isCatalog && ( … )}`; dat blok is weg. */
  const ervoor = flow.slice(Math.max(0, i - 1400), i);
  ok('en niet meer achter !isCatalog', !/\{!isCatalog && \(\s*<div class="field">\s*<label for="pl-msg">/.test(ervoor));
  ok('de vier ORDER_QUESTIONS blijven weg bij Catalog', /\(isCatalog \? \[\] : ORDER_QUESTIONS\)/.test(flow));
  ok('zelfde label als Lifestyle (NL "Wat we moeten weten", EN "Anything we should know")',
    flow.includes("message: 'Wat we moeten weten'") && flow.includes("message: 'Anything we should know'"));
}

/* ── Een echte catalogbestelling met een notitie ─────────────────────────── */
const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') {
    const p = JSON.parse(String(opts.body));
    return json({ id: 'tr_0000000001', status: 'open', amount: p.amount, metadata: p.metadata || {}, _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_0000000001' } } }, 201);
  }
  if (u.includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return json({ id: 'msg_test' });
};
const { onRequestPost: bestelPost } = await import('../functions/api/order.js');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
const emmer = new Map();
const env = {
  DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test',
  NOTIFY_EMAIL: 'hello@visuails.com', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
  UPLOADS: { async put(k, b) { emmer.set(k, b); }, async get(k) { return emmer.has(k) ? { body: emmer.get(k) } : null; }, async delete(k) { emmer.delete(k); }, async head() { return null; }, async list() { return { objects: [] }; } },
};
const NOTITIE = 'Product 2 is de zwarte jas; let op het logo op de mouw.';
const fd = new FormData();
for (const [k, v] of Object.entries({
  service: 'catalog', products: '2', name: 'Test Klant', brand: 'TESTMERK', email: 'notitie@example.com', phone: '+31 6 12345678',
  country: 'NL', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl',
  business_declaration: 'yes', business_version: 'v1', reg_number: '12345678', message: NOTITIE,
})) fd.append(k, v);
const res = await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': '10.91.0.1' } }), env, waitUntil: () => {} });

console.log('\neen catalogbestelling met een notitie');
{
  const o = db.prepare("SELECT id, service, details_json FROM orders WHERE email = 'notitie@example.com'").get();
  ok('de bestelling is aangenomen, als catalog', res.status < 400 && o?.service === 'catalog', `status ${res.status}, ${o?.service}`);
  let d = {};
  try { d = JSON.parse(o?.details_json || '{}'); } catch { d = {}; }
  ok('de notitie staat in details_json.message', d.message === NOTITIE, JSON.stringify(d.message));
  const studio = mails.find((m) => JSON.stringify(m.to || '').includes('hello@visuails.com') && /Nieuwe bestelling/.test(m.subject || ''));
  ok('de studiomail aan hello@ noemt de notitie', !!studio && (studio.html || '').includes('let op het logo op de mouw'), studio ? studio.subject : 'geen studiomail');
}

console.log('\n/admin toont hem (zelfde regel als bij Lifestyle)');
{
  const admin = lees('src/lib/admin.js');
  ok('de bestelpagina leest d.message in "Bericht van de klant", zonder voorwaarde op de dienst',
    /const berichtRegel = String\(d\.message \|\| ''\)\.trim\(\)/.test(admin) && /'Bericht van de klant', berichtRegel\)/.test(admin));
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
