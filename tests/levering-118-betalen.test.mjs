/*
 * LEVERING 118 · BETALEN, PROEF EN ABONNEMENT AAN DE ACHTERKANT (bouwer BA)
 * 17 november 2026
 *
 *   node tests/levering-118-betalen.test.mjs        (geen build nodig)
 *
 * Echte SQLite (schema.sql), nep-Mollie, nep-Resend, nep-R2; de echte /api/order, /api/order-pay,
 * /api/plan, webhook en hervatIncasso().
 *   B1-11  elke mislukte, afgebroken of verlopen betaling: één regel in admin_log en op de tijdlijn (intern);
 *   P1-10  een proef van een bedrijf dat intussen al een betaalde heeft: geen betaalmail, geen betaalknop,
 *          en bij een geannuleerde tweede proef een mail aan de klant over de terugbetaling;
 *   L-07   een bestaand adres op het abonnementsformulier krijgt meteen een inlogmail;
 *   P9-12  hervatten: Mollie begint op de gewone termijndag, zoals Studio zegt;
 *   P9-09  de daggrens bij uploads zegt welke grens vol is.
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { uitgesteldSleutel } from '../src/lib/uitgesteld.js';
import { volgendeTermijn, eersteTermijn, hervatIncasso } from '../src/lib/subscribe.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 118 (BA): betalen, proef en abonnement\n');

const betalingen = new Map();
const mails = [];
const mollieAbo = [];
let volg = 0;
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const methode = String(opts.method || 'GET').toUpperCase();
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && methode === 'POST') {
    const p = JSON.parse(String(opts.body));
    const id = `tr_${String(++volg).padStart(10, '0')}`;
    const rec = { id, mode: 'test', status: 'open', amount: p.amount, metadata: p.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
    betalingen.set(id, rec);
    return json(rec, 201);
  }
  if (/\/v2\/payments\/tr_[0-9a-zA-Z]+\/refunds$/.test(u)) return json({ id: 're_test', status: 'pending' }, 201);
  const m = u.match(/\/v2\/payments\/(tr_[0-9a-zA-Z]+)$/);
  if (m) return betalingen.has(m[1]) ? json(betalingen.get(m[1])) : json({ status: 404 }, 404);
  if (/\/v2\/customers\/[^/]+\/subscriptions/.test(u)) {
    if (methode === 'POST') { const b = JSON.parse(String(opts.body)); mollieAbo.push(b); return json({ id: `sub_${mollieAbo.length}`, status: 'active', ...b }, 201); }
    return json({ _embedded: { subscriptions: [] } });
  }
  if (u.includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return json({ id: 'msg_test' });
};
const stil = () => { const l = console.log, e = console.error, w = console.warn; console.log = console.error = console.warn = () => {}; return () => { console.log = l; console.error = e; console.warn = w; }; };

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
const emmer = new Map();
const env = {
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test',
  FROM_EMAIL: 'VISUAILS <orders@voorbeeld.test>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db),
  UPLOADS: {
    async put(k, b) { emmer.set(k, b); },
    async get(k) { return emmer.has(k) ? { body: emmer.get(k), text: async () => String(emmer.get(k)) } : null; },
    async delete(k) { emmer.delete(k); }, async head() { return null; }, async list() { return { objects: [] }; },
  },
};
const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
const { onRequestPost: webhookPost } = await import('../functions/api/webhook/mollie.js');
const { onRequestGet: betaalGet } = await import('../functions/api/order-pay.js');
const { onRequestPost: planPost } = await import('../functions/api/plan.js');
const { mailKlantProefDubbel } = await import('../src/lib/notify.js');

let ip = 1;
async function bestel(velden) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) if (v !== undefined) fd.append(k, v);
  const terug = stil();
  try {
    const res = await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.118.1.${ip++}` } }), env, waitUntil: () => {} });
    return await res.json().catch(() => ({}));
  } finally { terug(); }
}
const basis = (email, extra = {}) => ({
  service: 'catalog', products: '2', first_name: 'Testa', last_name: 'Proef', brand: 'PROEFMERK', email, phone: '+31 6 12345678',
  country: 'NL', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes',
  business_version: 'v1', no_vat_number: '1', reg_number: '12345678', product_p1: 'Product 1', product_p2: 'Product 2', mode: 'json', ...extra,
});
const proefVelden = (email, extra = {}) => basis(email, { service: 'test-sample', products: '1', sample_type: 'catalog', product_p2: undefined, ...extra });
async function webhook(id, status, details = null) {
  const b = betalingen.get(id);
  b.status = status;
  if (details) b.details = details;
  if (status === 'paid') { b.method = 'ideal'; b.paidAt = new Date().toISOString(); }
  const fd = new FormData(); fd.append('id', id);
  const terug = stil();
  try { return await webhookPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: fd }), env, waitUntil: () => {} }); } finally { terug(); }
}
const betalingVan = (ref) => [...betalingen.values()].filter((b) => b.metadata?.order_ref === ref).map((b) => b.id).pop();
async function opnieuwBetalen(ref) {
  const terug = stil();
  try { return await betaalGet({ request: new Request(`https://visuails.com/api/order-pay?ref=${encodeURIComponent(ref)}&lang=nl`, { headers: { 'cf-connecting-ip': `10.118.2.${ip++}` } }), env, waitUntil: () => {} }); } finally { terug(); }
}

console.log('B1-11 · elke mislukte betaling vastgelegd');
{
  const b = await bestel(basis('verlopen@voorbeeldmerk.test'));
  const order = db.prepare('SELECT id FROM orders WHERE ref = ?').get(b.ref);
  const eerste = betalingVan(b.ref);
  ok('een bestelling met een betaling', !!order && !!eerste, JSON.stringify(b).slice(0, 120));
  const voor = mails.length;
  await webhook(eerste, 'expired');
  const log1 = db.prepare("SELECT detail FROM admin_log WHERE action = 'payment.expired' AND order_id = ?").all(order.id);
  const tijd1 = db.prepare("SELECT note, actor FROM order_events WHERE order_id = ? AND note LIKE 'Betaling verlopen%'").all(order.id);
  ok('verlopen: één regel in admin_log (payment.expired)', log1.length === 1, JSON.stringify(log1));
  ok('  en één interne regel op de tijdlijn', tijd1.length === 1 && tijd1[0].actor === 'intern', JSON.stringify(tijd1));
  ok('  die zegt dat de klant de mail "Nog niet betaald" kreeg', /kreeg om \d{2}:\d{2} de mail "Nog niet betaald"/.test(log1[0]?.detail || ''), log1[0]?.detail);
  ok('  en de klant kreeg die mail ook echt (W2-15)', mails.slice(voor).some((m) => String(m.to) === 'verlopen@voorbeeldmerk.test' && /^Nog niet betaald — je bestelling/.test(m.subject || '')),
    mails.slice(voor).map((m) => m.subject).join(' | '));
  await webhook(eerste, 'expired');
  ok('dezelfde webhook nog eens: geen tweede regel', db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE action LIKE 'payment.%' AND order_id = ?").get(order.id).n === 1);
  const r = await opnieuwBetalen(b.ref);
  const tweede = betalingVan(b.ref);
  ok('opnieuw betalen maakt een tweede betaling', r.status === 302 && tweede !== eerste, `${r.status} ${tweede}`);
  await webhook(tweede, 'failed');
  const log2 = db.prepare("SELECT detail FROM admin_log WHERE action = 'payment.failed' AND order_id = ?").all(order.id);
  ok('de tweede (mislukt) krijgt ook een regel (payment.failed)', log2.length === 1, JSON.stringify(log2));
  ok('  "Geen nieuwe mail aan de klant", want die had de knop al', /Geen nieuwe mail aan de klant/.test(log2[0]?.detail || ''), log2[0]?.detail);
  ok('in totaal twee regels op de tijdlijn', db.prepare("SELECT COUNT(*) AS n FROM order_events WHERE order_id = ? AND actor = 'intern' AND note LIKE 'Betaling %'").get(order.id).n === 2);
}

console.log('\nP1-10 · een tweede proef: geen betaalmail en geen betaalknop');
{
  const b = await bestel(proefVelden('proef-a@voorbeeldmerk.test', { phone: '+31 6 55555501', reg_number: '55550001' }));
  const order = db.prepare('SELECT id FROM orders WHERE ref = ?').get(b.ref);
  ok('de proef staat erin, met een betaling', !!order && !!betalingVan(b.ref), JSON.stringify(b).slice(0, 120));
  ok('  en de bevestiging wacht in R2', emmer.has(uitgesteldSleutel(b.ref)));
  /* Intussen (een ander tabblad) is er voor dit bedrijf een proef betaald. */
  db.prepare(`INSERT INTO orders (ref, service, status, email, phone, details_json, payment_status)
              VALUES ('VIS-PROEF-AL', 'test-sample', 'received', 'proef-a@voorbeeldmerk.test', '+31 6 55555501', '{}', 'paid')`).run();
  const voor = mails.length;
  await webhook(betalingVan(b.ref), 'expired');
  ok('verlopen: geen mail met een betaalknop naar de klant', !mails.slice(voor).some((m) => String(m.to) === 'proef-a@voorbeeldmerk.test'),
    mails.slice(voor).map((m) => `${m.to}: ${m.subject}`).join(' | '));
  ok('  de bewaarde mail is weg', !emmer.has(uitgesteldSleutel(b.ref)));
  ok('  het logboek zegt waarom', /al een betaalde proef/.test(db.prepare("SELECT detail FROM admin_log WHERE action = 'payment.expired' AND order_id = ?").get(order.id)?.detail || ''));
  const aantal = betalingen.size;
  const r = await opnieuwBetalen(b.ref);
  ok('/api/order-pay maakt geen betaling', betalingen.size === aantal, `${betalingen.size} na ${aantal}`);
  ok('  en stuurt naar de bedankpagina met proef=al', /\/nl\/thank-you\?ref=.*&proef=al$/.test(r.headers.get('location') || ''), r.headers.get('location'));
  const gewoon = await bestel(basis('gewoon-opnieuw@voorbeeldmerk.test'));
  const r2 = await opnieuwBetalen(gewoon.ref);
  ok('een gewone bestelling betaalt gewoon opnieuw', /mollie\.com\/checkout/.test(r2.headers.get('location') || ''), r2.headers.get('location'));
}

console.log('\nP1-10 · een geannuleerde tweede proef: de klant hoort het');
{
  const a = await bestel(proefVelden('bank-a@voorbeeldmerk.test', { phone: '+31 6 66666601', reg_number: '66660001' }));
  const b = await bestel(proefVelden('bank-b@voorbeeldmerk.test', { phone: '+31 6 66666602', reg_number: '66660002' }));
  const rekening = { consumerAccount: 'NL91 ABNA 0417 1643 00', consumerName: 'Testa Proef' };
  await webhook(betalingVan(a.ref), 'paid', rekening);
  const voor = mails.length;
  await webhook(betalingVan(b.ref), 'paid', rekening);
  const rijB = db.prepare('SELECT status, cancel_reason FROM orders WHERE ref = ?').get(b.ref);
  ok('de tweede proef op dezelfde rekening is geannuleerd', rijB?.status === 'cancelled' && rijB?.cancel_reason === 'sample-duplicate', JSON.stringify(rijB));
  const klant = mails.slice(voor).find((m) => String(m.to) === 'bank-b@voorbeeldmerk.test');
  ok('de klant krijgt een mail', !!klant, mails.slice(voor).map((m) => `${m.to}: ${m.subject}`).join(' | '));
  ok('  "Je proef is geannuleerd — je geld komt terug"', /^Je proef is geannuleerd — je geld komt terug · /.test(klant?.subject || ''), klant?.subject);
  ok('  met de eerdere proef en het bedrag', klant && klant.html.includes(a.ref) && /teruggestort/.test(klant.html));
  const orderB = db.prepare('SELECT id FROM orders WHERE ref = ?').get(b.ref);
  mails.length = 0;
  await mailKlantProefDubbel(env, { orderId: orderB.id, earlierRef: a.ref, refunded: false });
  ok('lukte het terugstorten niet: "we storten je geld terug"', /we storten je geld terug/.test(mails[0]?.subject || '') && /met de hand terug/.test(mails[0]?.html || ''), mails[0]?.subject);
  db.prepare("UPDATE orders SET lang = 'en' WHERE id = ?").run(orderB.id);
  mails.length = 0;
  await mailKlantProefDubbel(env, { orderId: orderB.id, earlierRef: a.ref, refunded: true });
  ok('en in het Engels', /^Your test sample is cancelled/.test(mails[0]?.subject || ''), mails[0]?.subject);
}

console.log('\nL-07 · een bestaand adres op het abonnementsformulier');
{
  db.prepare(`INSERT INTO customers (email, name, brand) VALUES ('fatima@voorbeeldmerk.test', 'Fatima Test', 'Voorbeeldmerk')`).run();
  const klantId = db.prepare("SELECT id FROM customers WHERE email = 'fatima@voorbeeldmerk.test'").get().id;
  const abonneer = async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({
      lang: 'nl', email: 'fatima@voorbeeldmerk.test', first_name: 'Fatima', last_name: 'Test', phone: '+32 470 12 34 56', brand: 'Voorbeeldmerk',
      country: 'BE', address_line1: 'Teststraat 1', postal_code: '1000', city: 'Teststad', plan: 'brand', term: 'monthly',
      business_declaration: 'yes', business_version: 'business-v2-2026-09',
    })) fd.append(k, v);
    const terug = stil();
    try { return await planPost({ request: new Request('https://visuails.com/api/plan', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.118.3.${ip++}` } }), env, waitUntil: () => {} }); } finally { terug(); }
  };
  const tokensVoor = db.prepare('SELECT COUNT(*) AS n FROM account_tokens WHERE customer_id = ?').get(klantId).n;
  mails.length = 0;
  const molliesVoor = betalingen.size;
  const res = await abonneer();
  const plek = res.headers.get('location') || '';
  ok('terug naar het formulier met fout=account, het land en het plan', res.status === 303 && /^\/nl\/start\/plan\?fout=account&land=BE&plan=brand&inlog=verstuurd$/.test(plek), plek);
  ok('er ging meteen een inlogmail naar dat adres', mails.some((m) => String(m.to) === 'fatima@voorbeeldmerk.test'), mails.map((m) => `${m.to}: ${m.subject}`).join(' | '));
  ok('  met een nieuwe inlogcode op het account', db.prepare('SELECT COUNT(*) AS n FROM account_tokens WHERE customer_id = ?').get(klantId).n === tokensVoor + 1);
  ok('  niets naar Mollie', betalingen.size === molliesVoor && mollieAbo.length === 0);
  const koekjes = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie().join(' | ') : String(res.headers.get('set-cookie') || '');
  ok('  het adres staat klaar voor de inlogkaart (vs_plan_mail)', /vs_plan_mail=fatima%40voorbeeldmerk\.test/.test(koekjes), koekjes);
  const acc = await import('../src/lib/account.js');
  if (typeof acc.setTerugCookie === 'function') ok('  en na het inloggen terug naar het formulier (vs_terug)', /vs_terug=%2Fnl%2Fstart%2Fplan%3Fplan%3Dbrand/.test(koekjes), koekjes);
  else console.log(' --   vs_terug: setTerugCookie() is nog niet geëxporteerd uit account.js (zie notities BA, voor BG)');
  for (let i = 0; i < 5; i++) await abonneer();
  const zesde = (await abonneer()).headers.get('location') || '';
  ok('na vijf mails per kwartier: de oude melding, zonder nieuwe mail', /fout=account&land=BE$/.test(zesde), zesde);
  const bron = readFileSync(`${ROOT}functions/api/plan.js`, 'utf8');
  ok('dezelfde emmer als het inlogformulier (account-login|<adres>, 5 per 900 s)', /key: `account-login\|\$\{email\}`, action: 'account-login-id', limit: 5, windowSeconds: 900/.test(bron));
}

console.log('\nP9-12 · hervatten op de gewone termijndag');
{
  const sub = {
    id: 9118, ref: 'SUB-TEST-118', plan: 'studio', term: 'monthly', status: 'paused', pause_reason: 'customer',
    started_at: '2026-10-09 10:00:00', created_at: '2026-10-09 10:00:00', mollie_customer_id: 'cst_test118', mollie_mandate_id: 'mdt_test118',
  };
  const verwacht = volgendeTermijn(sub);
  const terug = stil();
  let gelukt;
  try { gelukt = await hervatIncasso(env, sub, 'https://visuails.com'); } finally { terug(); }
  ok('hervatten lukt', gelukt === true);
  ok(`Mollie begint op de termijndag (${verwacht}), zoals Studio zegt`, mollieAbo[0]?.startDate === verwacht, JSON.stringify(mollieAbo[0]?.startDate));
  ok('  de dag van de maand is die van started_at (9)', verwacht.endsWith('-09'), verwacht);
  if (new Date().getUTCDate() !== 9) ok('  en niet "vandaag + een maand"', mollieAbo[0]?.startDate !== eersteTermijn(), eersteTermijn());
  const metDatum = { ...sub, id: 9119, ref: 'SUB-TEST-119' };
  const t2 = stil();
  try { await hervatIncasso(env, metDatum, 'https://visuails.com', { startDate: '2027-01-20' }); } finally { t2(); }
  ok('een meegegeven startDate blijft voorgaan', mollieAbo[1]?.startDate === '2027-01-20', mollieAbo[1]?.startDate);
}

console.log('\nP9-09 · de daggrens zegt welke grens vol is');
{
  const bron = readFileSync(`${ROOT}functions/api/upload.js`, 'utf8');
  ok('nieuwe batches: grens "bestellingen"', (bron.match(/dagLimiet\((nieuw|streng), 'bestellingen'\)/g) || []).length === 2);
  ok('bestanden en bytes elk hun eigen woord', /dagLimiet\(stuks, 'bestanden'\)/.test(bron) && /dagLimiet\(zwaar, 'bytes'\)/.test(bron));
  ok('de grens zelf is niet veranderd (5 zonder botcheck, 30 met)', /batches: 30, batchesZonderBotcheck: 5/.test(bron));
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
