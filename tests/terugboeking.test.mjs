/*
 * TERUGBOEKING (CHARGEBACK OF STORNO) — punt 8.11 (ronde B, 8 oktober 2026)
 *   node tests/terugboeking.test.mjs        (geen server, geen browser)
 *
 *   1 · een termijn wordt teruggeboekt: abonnement op pauze ('chargeback'),
 *       de credits van die termijn bevroren (niet bruikbaar, niet weg), de
 *       factuur blijft, één studiomail met Bel/App; een tweede aflevering doet
 *       niets;
 *   2 · Mollie draait het terug: credits weer vrij met hun eigen datum, het
 *       abonnement loopt weer;
 *   3 · een bestelling wordt teruggeboekt: de rode pil in /admin, "Op geleverd
 *       zetten" vraagt een bevestiging, de studiomail heeft Bel/App; terug-
 *       gedraaid: de pil verdwijnt.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import { onRequestPost } from '../functions/api/webhook/mollie.js';
import { createSubscriptionRow, activateSubscription } from '../src/lib/subscription.js';
import { monthKey, subMaandBruto } from '../src/lib/slots.js';
import { creditSaldo, creditsBeschikbaar } from '../src/lib/creditboek.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(70)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const TERMIJN = (subMaandBruto({ plan: 'studio', term: 'monthly' }) / 100).toFixed(2);
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema laadt niet:', mislukt.slice(0, 3)); process.exit(1); }
const env = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', FROM_EMAIL: 'x@visuails.com', NOTIFY_EMAIL: 'studio@visuails.com' };

db.exec("INSERT INTO customers (id, email, name, first_name, brand, phone, country) VALUES (1, 'mara@voorbeeld-volt.test', 'Mara Visser', 'Mara', 'VOLT', '06 12345678', 'NL')");
const { row: sub } = await createSubscriptionRow(env, { customerId: 1, planId: 'studio', termId: 'monthly', windowDay: 8 });
await activateSubscription(env, sub.id);
db.prepare("UPDATE subscriptions SET mollie_subscription_id = 'sub_TB01' WHERE id = ?").run(sub.id);

const MAAND = monthKey();
let betaling = null;
const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.mollie.com')) return new Response(JSON.stringify(betaling), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.includes('api.resend.com')) { mails.push(JSON.parse(String(opts.body || '{}'))); return new Response('{"id":"m"}', { status: 200 }); }
  return new Response('{}', { status: 200 });
};
const echt = { log: console.log, warn: console.warn, error: console.error };
const stil = () => { console.warn = console.error = () => {}; };
const luid = () => Object.assign(console, echt);
const webhook = async (b) => {
  betaling = b;
  stil();
  const r = await onRequestPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `id=${b.id}` }), env, waitUntil() {} });
  luid();
  return r.status;
};
const termijn = (over = {}) => ({
  resource: 'payment', id: 'tr_termijn1', mode: 'test',
  createdAt: `${MAAND}-01T10:00:00+00:00`, paidAt: `${MAAND}-01T10:01:00+00:00`,
  amount: { value: TERMIJN, currency: 'EUR' }, description: 'VISUAILS Studio', method: 'directdebit',
  sequenceType: 'recurring', status: 'paid', customerId: 'cst_1', mandateId: 'mdt_1', subscriptionId: 'sub_TB01', ...over,
});
const abo = () => db.prepare('SELECT status, pause_reason FROM subscriptions WHERE id = ?').get(sub.id);

/* ── 1 · EEN TERMIJN WORDT TERUGGEBOEKT ────────────────────────────────── */
console.log('\n1 · een termijn wordt teruggeboekt');
ok('de termijn komt binnen', await webhook(termijn()), 200);
const voor = await creditSaldo(env, { customerId: 1 });
ok('  met credits in het boek', voor.saldo > 0, true);
const factuurVoor = db.prepare('SELECT COUNT(*) AS n FROM subscription_invoices').get().n;
mails.length = 0;
ok('de terugboeking komt binnen', await webhook(termijn({ amountChargedBack: { value: TERMIJN, currency: 'EUR' } })), 200);
ok('het abonnement staat op pauze wegens de terugboeking', { ...abo() }, { status: 'paused', pause_reason: 'chargeback' });
const na = await creditSaldo(env, { customerId: 1 });
ok('de credits van die termijn zijn bevroren (niet bruikbaar)', [na.saldo, await creditsBeschikbaar(env, 1)], [0, 0]);
ok('  maar niet weg: ze staan als bevroren', na.bevroren, voor.saldo);
ok('  met een regel "bevroren" in het creditboek', db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE reden = 'bevroren'").get().n, 1);
ok('de factuur blijft staan', db.prepare('SELECT COUNT(*) AS n FROM subscription_invoices').get().n, factuurVoor);
const sm = mails.find((m) => /^Termijn teruggeboekt/.test(m.subject || ''));
ok('studiomail "Termijn teruggeboekt" met Bel (voorop, NL) en App', !!sm && sm.html.indexOf('tel:+31612345678') > -1 && sm.html.indexOf('tel:+31612345678') < sm.html.indexOf('wa.me/31612345678'), true);
ok('  en het aantal bevroren credits', !!sm && new RegExp(`Credits bevroren[\\s\\S]{0,200}${voor.saldo}`).test(sm.html), true);
mails.length = 0;
await webhook(termijn({ amountChargedBack: { value: TERMIJN, currency: 'EUR' } }));
ok('een tweede aflevering: geen tweede mail, niets dubbel bevroren', [mails.length, db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE reden = 'bevroren'").get().n], [0, 1]);

/* ── 2 · MOLLIE DRAAIT HET TERUG ───────────────────────────────────────── */
console.log('\n2 · Mollie draait de terugboeking terug');
mails.length = 0;
await webhook(termijn());
const terug = await creditSaldo(env, { customerId: 1 });
ok('de credits zijn weer vrij', [terug.saldo, terug.bevroren], [voor.saldo, 0]);
ok('  met hun eigen vervaldatum (niet 3 maanden vanaf nu)', terug.vervalt.map((v) => v.op), voor.vervalt.map((v) => v.op));
ok('het abonnement loopt weer', { ...abo() }, { status: 'active', pause_reason: null });
ok('studiomail "Terugboeking ongedaan"', mails.some((m) => /^Terugboeking ongedaan/.test(m.subject || '')), true);
mails.length = 0;
await webhook(termijn());
ok('nog een aflevering: niets meer vrij te geven', [mails.length, db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE reden = 'vrijgegeven'").get().n], [0, 1]);
/* Een pauze van de klant zelf blijft van hem: een terugboeking maakt er geen chargeback-pauze van. */
db.prepare("UPDATE subscriptions SET status = 'paused', pause_reason = 'customer' WHERE id = ?").run(sub.id);
await webhook(termijn({ id: 'tr_termijn1', amountChargedBack: { value: '10.00', currency: 'EUR' } }));
ok('een pauze van de klant blijft "customer"', abo().pause_reason, 'customer');

/* ── 3 · EEN BESTELLING WORDT TERUGGEBOEKT ─────────────────────────────── */
console.log('\n3 · een bestelling wordt teruggeboekt');
db.exec(`INSERT INTO orders (id, ref, customer_id, email, name, brand, phone, country, service, status, payment_status, total_cents, vat_cents, lang, product_count, paid_at)
         VALUES (40, 'VIS-TB40-A1B', 1, 'mara@voorbeeld-volt.test', 'Mara Visser', 'VOLT', '06 12345678', 'NL', 'catalog', 'human_check', 'paid', 26400, 5544, 'nl', 3, datetime('now'))`);
db.exec("INSERT INTO payments (order_id, provider, external_id, status, amount_cents, currency) VALUES (40, 'mollie', 'tr_best40', 'paid', 31944, 'EUR')");
db.exec("INSERT INTO files (order_id, kind, filename, bytes, r2_key) VALUES (40, 'delivery', 'p1.jpg', 1000, 'orders/40/p1.jpg')");
const bestelling = (over = {}) => ({
  resource: 'payment', id: 'tr_best40', mode: 'test', createdAt: '2026-10-01T10:00:00+00:00', paidAt: '2026-10-01T10:01:00+00:00',
  amount: { value: '319.44', currency: 'EUR' }, description: 'VISUAILS', method: 'ideal', status: 'paid',
  metadata: { order_ref: 'VIS-TB40-A1B' }, ...over,
});
mails.length = 0;
await webhook(bestelling({ amountChargedBack: { value: '319.44', currency: 'EUR' } }));
ok('de bestelling is gemarkeerd als teruggeboekt', !!db.prepare('SELECT teruggeboekt_at FROM orders WHERE id = 40').get().teruggeboekt_at, true);
const cm = mails.find((m) => /^Terugboeking \(chargeback\)/.test(m.subject || ''));
ok('studiomail met de pil-tekst en Bel/App', !!cm && /Betaling teruggeboekt — niet leveren/.test(cm.html) && /tel:\+31612345678/.test(cm.html) && /wa\.me\/31612345678/.test(cm.html), true);

const adminToken = 'tb-admin';
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')");
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(adminToken));
const { adminGet, adminPost } = await import('../src/lib/admin.js');
const kop = { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' };
const admin = async (pad) => (await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: kop }), env, waitUntil() {} })).text();
const post = (pad, velden) => adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { ...kop, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(velden).toString() }), env, waitUntil() {} });
const pagina = await admin('/admin/orders/40/files');
ok('/admin bestelpagina: de rode pil naast het kenmerk', /<h1>VIS-TB40-A1B<span class="terugboek-pil"[^>]*>Betaling teruggeboekt — niet leveren<\/span><\/h1>/.test(pagina), true);
ok('  en een vinkje bij "Op geleverd zetten"', /name="teruggeboekt_ok" value="1" required/.test(pagina), true);
ok('/admin dashboard: de pil op de regel', /VIS-TB40-A1B<\/span><span class="terugboek-pil"/.test(await admin('/admin')), true);
stil();
let r = await post('/admin/orders/40/status', { status: 'delivered', back: 'files' });
luid();
ok('op geleverd zonder vinkje: geweigerd', [r.headers.get('location'), db.prepare('SELECT status FROM orders WHERE id = 40').get().status], ['/admin/orders/40/files?fout=teruggeboekt', 'human_check']);
ok('  met een rode regel die zegt waarom', /De betaling van deze bestelling is teruggeboekt/.test(await admin('/admin/orders/40/files?fout=teruggeboekt')), true);
stil();
r = await post('/admin/orders/40/status', { status: 'delivered', back: 'files', teruggeboekt_ok: '1' });
luid();
ok('met het vinkje: wel geleverd', db.prepare('SELECT status FROM orders WHERE id = 40').get().status, 'delivered');
await webhook(bestelling());
ok('Mollie draait het terug: de pil verdwijnt', db.prepare('SELECT teruggeboekt_at FROM orders WHERE id = 40').get().teruggeboekt_at, null);
ok('  met een regel in het logboek', db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE action = 'payment.chargeback-terug' AND order_id = 40").get().n, 1);

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
