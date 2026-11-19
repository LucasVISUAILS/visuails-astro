/*
 * LEVERING 117 · P3-10 — TE LAAT BETAALD: DE DAG WORDT NIET DUBBEL GEBOEKT
 * 17 november 2026
 *
 *   node tests/levering-117-te-laat-betaald.test.mjs        (geen build nodig)
 *
 * Een reservering vervalt na de betaaltermijn en een ander boekt de dag. Betaalde de eerste klant
 * daarna via zijn herinneringslink, dan hield hij de datum toch: de planning stond op 120 van 80
 * punten, zonder melding. Nu toetst de webhook de agenda opnieuw. Echte SQLite, nep-Mollie, de
 * echte /api/order en de echte webhook.
 *   1 · verlopen en de dagen zijn weg: datum leeg, tijdlijnregel, admin_log, mail aan jou en aan de klant;
 *   2 · verlopen maar de dagen zijn nog vrij: hij houdt de datum;
 *   3 · op tijd betaald: niets anders dan vroeger.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { clearedWindows, ATTENDED_PUNTEN_PER_DAG } from '../src/data/capacity.js';
import { vandaagNL } from '../src/lib/nlDag.js';
import { WINDOW_THRESHOLD } from '../src/data/pricing.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117 P3-10: betalen na een verlopen reservering\n');

const betalingen = new Map();
const mails = [];
let volg = 0;
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') {
    const p = JSON.parse(String(opts.body));
    const id = `tr_${String(++volg).padStart(10, '0')}`;
    const rec = { id, mode: 'test', status: 'open', amount: p.amount, metadata: p.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
    betalingen.set(id, rec);
    return json(rec, 201);
  }
  const m = u.match(/\/v2\/payments\/(tr_[0-9a-zA-Z]+)$/);
  if (m) return betalingen.has(m[1]) ? json(betalingen.get(m[1])) : json({ status: 404 }, 404);
  if (u.includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return json({ id: 'msg_test' });
};
const stil = () => { const l = console.log, e = console.error, w = console.warn; console.log = console.error = console.warn = () => {}; return () => { console.log = l; console.error = e; console.warn = w; }; };

const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
const { onRequestPost: webhookPost } = await import('../functions/api/webhook/mollie.js');
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
const emmer = new Map();
const env = {
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@voorbeeld.test>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db),
  UPLOADS: { async put(k, b) { emmer.set(k, b); }, async get(k) { return emmer.has(k) ? { body: emmer.get(k), text: async () => String(emmer.get(k)) } : null; }, async delete(k) { emmer.delete(k); }, async head() { return null; }, async list() { return { objects: [] }; } },
};

const producten = WINDOW_THRESHOLD + 2;
const vandaag = vandaagNL();
const vensters = clearedWindows({ today: vandaag, products: producten, service: 'catalog', limit: 10 }).windows;
let ip = 1;
async function bestel(email, w) {
  const fd = new FormData();
  const velden = { service: 'catalog', products: String(producten), name: 'Testa Proef', brand: 'PROEFMERK', email, phone: '+31 6 12345678', country: 'NL',
    address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes', business_version: 'v1', no_vat_number: '1',
    reg_number: '12345678', style: 'classic', background: 'studio-white', window_start: w.start, window_end: w.end, mode: 'json' };
  for (let i = 1; i <= producten; i++) velden[`product_p${i}`] = `Product ${i}`;
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  const terug = stil();
  try { await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.17.0.${ip++}` } }), env, waitUntil: () => {} }); } finally { terug(); }
  const order = db.prepare('SELECT * FROM orders WHERE email = ? ORDER BY id DESC LIMIT 1').get(email);
  const id = [...betalingen.values()].filter((b) => b.metadata?.order_ref === order?.ref).map((b) => b.id).pop();
  return { order, id };
}
async function webhook(id) {
  betalingen.get(id).status = 'paid';
  betalingen.get(id).method = 'ideal';
  const fd = new FormData(); fd.append('id', id);
  const terug = stil();
  try { return await webhookPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: fd }), env, waitUntil: () => {} }); } finally { terug(); }
}
const verloopt = (orderId) => db.prepare("UPDATE orders SET window_expires_at = datetime('now', '-1 hour') WHERE id = ?").run(orderId);
const vulDagen = (w) => {
  /* Een ander boekt de dagen helemaal vol (rechtstreeks, betaald). */
  db.prepare(`INSERT INTO orders (ref, service, status, email, tier, window_start, window_end, product_count, payment_status)
              VALUES (?, 'catalog', 'received', 'ander@voorbeeldmerk.test', 'attended', ?, ?, ?, 'paid')`)
    .run(`VIS-TEST-ANDER-${w.start}`, w.start, w.end, Math.floor((ATTENDED_PUNTEN_PER_DAG * 2) / 4));
};

ok('er zijn vensters om te kiezen', vensters.length >= 3, String(vensters.length));

console.log('\n1 · verlopen, en een ander heeft de dagen intussen geboekt');
{
  const w = vensters[2];
  const { order, id } = await bestel('laat@voorbeeldmerk.test', w);
  ok('de bestelling heeft de datum en een betaling', order?.window_start === w.start && !!id, JSON.stringify({ ws: order?.window_start, id }));
  verloopt(order.id);
  vulDagen(w);
  const voor = mails.length;
  await webhook(id);
  const rij = db.prepare('SELECT payment_status, window_start, window_end, window_expires_at FROM orders WHERE id = ?').get(order.id);
  ok('betaald', rij.payment_status === 'paid', rij.payment_status);
  ok('de datum is leeggemaakt (geen dubbele boeking)', rij.window_start === null && rij.window_end === null, JSON.stringify(rij));
  const regel = db.prepare("SELECT note FROM order_events WHERE order_id = ? AND note LIKE 'Leverdatum%vervallen%'").get(order.id);
  ok('de tijdlijn van de klant zegt het', !!regel, '');
  ok('admin_log: window.lapsed', !!db.prepare("SELECT 1 FROM admin_log WHERE action = 'window.lapsed' AND order_id = ?").get(order.id));
  const nieuw = mails.slice(voor);
  const studio = nieuw.find((m) => /de datum is weg/.test(m.subject || ''));
  const klant = nieuw.find((m) => /leverdatum is vervallen/.test(m.subject || ''));
  ok('jij krijgt een melding', !!studio, nieuw.map((m) => m.subject).join(' | '));
  ok('de klant krijgt een mail', !!klant && (klant.to === 'laat@voorbeeldmerk.test' || klant.to?.[0] === 'laat@voorbeeldmerk.test'), nieuw.map((m) => m.subject).join(' | '));
  ok('  die zegt dat we een nieuwe datum afspreken', /nieuwe datum/.test(klant?.html || ''));
}

console.log('\n2 · verlopen, maar de dagen zijn nog vrij');
{
  const w = vensters[4] || vensters[vensters.length - 1];
  const { order, id } = await bestel('laat-vrij@voorbeeldmerk.test', w);
  verloopt(order.id);
  const voor = mails.length;
  await webhook(id);
  const rij = db.prepare('SELECT payment_status, window_start, window_expires_at FROM orders WHERE id = ?').get(order.id);
  ok('betaald en hij houdt de datum', rij.payment_status === 'paid' && rij.window_start === w.start && rij.window_expires_at === null, JSON.stringify(rij));
  ok('geen "datum vervallen"-mail', !mails.slice(voor).some((m) => /vervallen|datum is weg/.test(m.subject || '')));
}

console.log('\n3 · op tijd betaald');
{
  const w = vensters[6] || vensters[vensters.length - 1];
  const { order, id } = await bestel('optijd@voorbeeldmerk.test', w);
  await webhook(id);
  const rij = db.prepare('SELECT payment_status, window_start, window_expires_at FROM orders WHERE id = ?').get(order.id);
  ok('betaald, datum blijft, klok gestopt', rij.payment_status === 'paid' && rij.window_start === w.start && rij.window_expires_at === null, JSON.stringify(rij));
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
