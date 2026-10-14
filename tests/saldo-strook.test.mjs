/*
 * TEGOED EN CREDITS: ÉÉN SALDO-STROOK, TWEE WOORDEN — punt 2.02 (ronde B, 8 oktober 2026)
 *   node tests/saldo-strook.test.mjs        (geen server, geen browser)
 *
 *   1 · het Overzicht: de strook "Je saldo" met tegoed (€ + "tegoed") en credits
 *       (getal zonder €, genoeg voor …), elk vak alleen als het bestaat;
 *   2 · het betaalblok van een creditsbestelling: "Betaald met 12 credits",
 *       "Uit je termijn van <maand>." en een link naar de termijnfactuur;
 *   3 · Facturen: het tegoed met zijn boekingen, de termijnfactuur gemarkeerd;
 *   4 · de woorden: EN "account balance" voor tegoed, nooit "credit";
 *       credits nooit met €.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import { creditVertaling } from '../src/data/creditKaart.js';
import { spaarPlafond, PLAN_CREDITS } from '../src/data/pricing.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(70)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema laadt niet:', mislukt.slice(0, 3)); process.exit(1); }
const env = { DB: d1(db) };
const dag = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const maand = new Date().toISOString().slice(0, 7);

db.prepare("INSERT INTO customers (id, email, brand, name) VALUES (1, 'mara@voorbeeld-volt.test', 'VOLT', 'Mara Visser')").run();
db.prepare("INSERT INTO customers (id, email, brand, name) VALUES (2, 'joris@voorbeeld-noord.test', 'NOORD', 'Joris Kade')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at) VALUES (1, 1, 'SUB-VOLT', 'studio', 'monthly', 'active', ?)`).run(`${maand}-01 09:00:00`);
/* Een termijn met betaling en uitgegeven factuur, en de partij die eruit kwam. */
db.prepare(`INSERT INTO subscription_payments (id, subscription_id, external_id, status, amount_cents, currency, month) VALUES (5, 1, 'tr_volt', 'paid', 95590, 'EUR', ?)`).run(maand);
db.prepare(`INSERT INTO subscription_invoices (id, number, year, seq, subscription_id, subscription_payment_id, customer_id, month, status, snapshot_json, pdf_key)
            VALUES (9, 'VIS-2026-0042', 2026, 42, 1, 5, 1, ?, 'issued', '{"netCents":79000,"vatCents":16590}', 'facturen/VIS-2026-0042.pdf')`).run(maand);
db.prepare(`INSERT INTO credit_boek (id, customer_id, subscription_id, datum, aantal, reden, maand, payment_id, vervalt_op, rest, sleutel, door)
            VALUES (1, 1, 1, ?, 120, 'termijn', ?, 'tr_volt', ?, 108, 'termijn:1:x', 'test')`).run(`${dag(-2)} 10:00:00`, maand, dag(88));
db.prepare(`INSERT INTO orders (id, ref, customer_id, email, name, brand, service, status, payment_status, credits_used, product_count, total_cents, lang, paid_at)
            VALUES (7, 'VIS-AB12-C3D', 1, 'mara@voorbeeld-volt.test', 'Mara Visser', 'VOLT', 'catalog', 'in_production', 'credits', 12, 3, 0, 'nl', datetime('now'))`).run();
db.prepare(`INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, order_id, order_ref, partijen, sleutel, door)
            VALUES (1, 1, ?, -12, 'bestelling', 7, 'VIS-AB12-C3D', '[{"id":1,"n":12}]', 'bestelling:7', 'klant')`).run(`${dag(-1)} 10:00:00`);
/* Tegoed: €50 van een geannuleerde bestelling. */
db.prepare(`INSERT INTO orders (id, ref, customer_id, email, name, brand, service, status, payment_status, total_cents, lang)
            VALUES (6, 'VIS-ZZ99-Q1W', 1, 'mara@voorbeeld-volt.test', 'Mara Visser', 'VOLT', 'catalog', 'cancelled', 'paid', 4132, 'nl')`).run();
db.prepare(`INSERT INTO customer_credits (customer_id, delta_cents, reason, order_id) VALUES (1, 5000, 'annulering', 6)`).run();

const tokens = { 1: 'volt-token', 2: 'noord-token' };
for (const [id, tok] of Object.entries(tokens)) {
  db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (?, ?, '2099-01-01T00:00:00Z')`).run(Number(id), await hashToken(tok));
}
const { studioScreen, paymentView, COPY } = await import('../src/lib/account.js');
const scherm = async (sectie, path, klant = 1, taal = 'nl') => studioScreen({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_account=${tokens[klant]}; vis_lang=${taal}` } }), env, waitUntil() {} }, sectie);

/* ── 1 · HET OVERZICHT ─────────────────────────────────────────────────── */
console.log('\n1 · de strook "Je saldo" op het Overzicht');
let s = await scherm('overview', '/account');
ok('kop "Je saldo"', s.v.saldoStrook?.kop, 'Je saldo');
ok('tegoed: met € en het woord "tegoed"', /^€\s?50,00 tegoed$/.test(s.v.saldoStrook.tegoed.getal), true);
ok('  met "Waar komt dit vandaan?" naar Facturen', s.v.saldoStrook.tegoed.link.href, '/account/invoices#tegoed');
ok('credits: een getal zonder €', [s.v.saldoStrook.credits.getal, /€/.test(s.v.saldoStrook.credits.getal)], ['108 credits', false]);
/* Spaarplafond (12 oktober 2026): "(je kunt er 360 sparen)" erbij. */
ok('  met het spaarplafond en de vertaling in producten', s.v.saldoStrook.credits.uitleg, `Van je abonnement (je kunt er ${spaarPlafond(PLAN_CREDITS.studio)} sparen). Genoeg voor ${creditVertaling(108, 'nl')}.`);
ok('  en "Naar je abonnement"', s.v.saldoStrook.credits.link.href, '/account/plan');
const en = await scherm('overview', '/account', 1, 'en');
ok('EN: "account balance", nooit "credit" voor tegoed', [/account balance$/.test(en.v.saldoStrook.tegoed.getal), /\bcredit\b/i.test(en.v.saldoStrook.tegoed.getal)], [true, false]);
ok('EN: "Your balance" en "108 credits"', [en.v.saldoStrook.kop, en.v.saldoStrook.credits.getal], ['Your balance', '108 credits']);
const leeg = await scherm('overview', '/account', 2);
ok('geen tegoed en geen credits: geen strook', leeg.v.saldoStrook, null);
const pagina = lees('src/pages/account/index.astro');
ok('de strook staat onder het "wat nu"-blok en vóór de cijfers', pagina.indexOf('st-watnu-blok') < pagina.indexOf('v.saldoStrook') && pagina.indexOf('v.saldoStrook') < pagina.indexOf('v.stats.length'), true);
ok('de losse tegoedtegel is weg van het Overzicht', /st-saldo-tegel is-tegoed/.test(pagina), false);

/* ── 2 · HET BETAALBLOK ────────────────────────────────────────────────── */
console.log('\n2 · het betaalblok van een creditsbestelling');
s = await scherm('orders', '/account/orders');
const o = s.st.orders.find((x) => x.id === 7);
ok('de termijnfactuur is gevonden via het creditboek', o._termijnFacturen, [{ id: 9, number: 'VIS-2026-0042', month: maand }]);
const pv = paymentView(COPY.nl, 'nl', o);
ok('"Betaald met 12 credits"', pv.rows, [['Betaald met', '12 credits']]);
ok('"Uit je termijn van <maand>."', /^Uit je termijn van [a-z]+\.$/.test(pv.line), true);
ok('link naar de pdf van de termijnfactuur', pv.facturen, [{ href: '/account/plan-invoices/9/pdf', label: 'VIS-2026-0042' }]);
ok('geen betaalknop en geen bedrag in euro', [pv.payHref, /€/.test(JSON.stringify(pv.rows))], ['', false]);
const zonder = paymentView(COPY.en, 'en', { payment_status: 'credits', credits_used: 5, total_cents: 0 });
ok('zonder gevonden factuur: alleen de regel', [zonder.line, zonder.facturen], ['From the credits of your plan.', []]);
ok('Betaling.astro tekent de factuurlink', /v\.facturen\.map/.test(lees('src/components/studio/Betaling.astro')), true);

/* ── 3 · FACTUREN ──────────────────────────────────────────────────────── */
console.log('\n3 · Facturen: het tegoed en de termijnfactuur');
s = await scherm('invoices', '/account/invoices');
ok('het tegoed: "€ 50,00 tegoed"', /^€\s?50,00 tegoed$/.test(s.v.tegoed?.getal || ''), true);
ok('  met de boeking en het kenmerk', s.v.tegoed.regels.map((r) => [r.wat, r.ref, /^\+€/.test(r.bedrag)]), [['erbij', 'VIS-ZZ99-Q1W', true]]);
ok('de termijnfactuur draagt de vlag "Abonnement (credits)"', s.v.rows.some((r) => r.number === 'VIS-2026-0042' && r.flags.includes('Abonnement (credits)')), true);
ok('invoices.astro tekent het tegoedblok met anker #tegoed', /id="tegoed"/.test(lees('src/pages/account/invoices.astro')), true);

/* ── 4 · DE WOORDEN ────────────────────────────────────────────────────── */
console.log('\n4 · twee woorden die nooit wisselen');
ok('Studio EN: tegoed heet "Account balance"', COPY.en.saldoTegoedH, 'Account balance');
ok('Studio EN: een annulering met tegoed zegt "account balance"', /account balance/.test(COPY.en.flowNow.cancelledCredit) && !/\bcredit\b/.test(COPY.en.flowNow.cancelledCredit), true);
const flow = lees('src/components/order/OrderFlow.astro');
ok('stap 5 EN: "Your account balance", niet "Your credit"', /tegoed: 'Your account balance'/.test(flow) && !/tegoed: 'Your credit'/.test(flow), true);
ok('stap 5 NL: "Je tegoed"', /tegoed: 'Je tegoed'/.test(flow), true);

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
