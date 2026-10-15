/*
 * HET SPAARPLAFOND — 12 oktober 2026 (afvinklijst 4: ab-v1 = c, ab-v2 = a)
 *
 * Lucas koos: zolang het abonnement loopt vervalt er niets; je hebt hoogstens
 * 3 maanden aan credits (Pro 360) en wat een termijn erboven brengt, vervalt op
 * de dag van die termijn; na pauze of stop blijft alles geldig tot 3 maanden na
 * de laatste termijn (één datum). Tegen het echte schema.sql met D1 op
 * node:sqlite, met de Pro-klant uit ABONNEMENT-KWARTAAL.md §2:
 *
 *   8 okt termijn +120 · 15 okt −48 · 11 nov termijn +120 · 20 nov −76 en −24
 *   · 25 nov de 24 geannuleerd: +24 · 9 dec termijn +120 · 8 jan termijn +120
 *   → op 10 januari 356 credits, zonder datums; op 8 februari vervalt 116.
 *
 * Daarna dezelfde klant met een pauze, een stop, hervatten, een jaar vooruit,
 * een teruggave die het plafond niet mag omzeilen, en een dubbele webhook.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import {
  boekTermijnBij, betaalBestellingMetCredits, creditsTerugVoorBestelling, creditSaldo, creditboek,
  creditsBeschikbaar, creditsDieVervallen, plafondInZicht, termijnGebruik, boekBij, vervaldatum, CREDIT_REDEN,
} from '../src/lib/creditboek.js';
import { saldoWeergave, terugZin, boekWeergave } from '../src/lib/creditWeergave.js';
import { PLAN_CREDITS, spaarPlafond, CREDITS_GELDIG_MAANDEN } from '../src/data/pricing.js';

let goed = 0; let fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  g ? goed++ : fout++;
  console.log(` ${g ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(76)}${g ? '' : ` verwacht ${JSON.stringify(wil)}, kreeg ${JSON.stringify(kreeg)}`}`);
};
const dag = (s, uur = '12:00:00') => new Date(`${s}T${uur}Z`);

const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('api.resend.com')) { mails.push(JSON.parse(String(opts.body || '{}'))); return new Response(JSON.stringify({ id: 'm' }), { status: 200 }); }
  return new Response('{}', { status: 200 });
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema laadt', mislukt, []);
const env = { DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@visuails.test' };
const { tasks } = await import('../cron/index.js');

const PRO = PLAN_CREDITS.studio;
const PLAFOND = spaarPlafond(PRO);
ok('het plafond van Pro: 3 maanden × 120 = 360', [CREDITS_GELDIG_MAANDEN, PLAFOND], [3, 360]);
ok('Starter 135, Merk 870 (uit de data)', [spaarPlafond(PLAN_CREDITS.starter), spaarPlafond(PLAN_CREDITS.brand)], [135, 870]);

let volg = 500;
const bestelling = (klant) => {
  volg += 1;
  db.prepare(`INSERT INTO orders (id, ref, customer_id, service, email, total_cents, vat_cents, product_count, lang)
              VALUES (?, ?, ?, 'catalog', 'k@merk.test', 0, 0, 1, 'nl')`).run(volg, `VIS-P${volg}`, klant);
  return volg;
};
const betaal = async (klant, n, op) => {
  const id = bestelling(klant);
  const r = await betaalBestellingMetCredits(env, { orderId: id, customerId: klant, aantal: n, nu: dag(op) });
  if (!r.ok) throw new Error(`bestelling van ${n} op ${op} mislukt: ${r.reden}`);
  return id;
};
const subRij = (id) => db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);

/* ── DE PRO-KLANT VAN §2 ─────────────────────────────────────────────────── */
console.log('\n1 · de Pro-klant van §2');
db.prepare("INSERT INTO customers (id, email, name) VALUES (1, 'pro@merk.test', 'Pro')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at)
            VALUES (1, 1, 'SUB-PRO', 'studio', 'monthly', 'active', '2026-10-08 09:00:00')`).run();
const sub = subRij(1);
await boekTermijnBij(env, sub, '2026-10', 'tr_okt', dag('2026-10-08'));
await betaal(1, 48, '2026-10-15');
await boekTermijnBij(env, sub, '2026-11', 'tr_nov', dag('2026-11-11'));
await betaal(1, 76, '2026-11-20');
const vier24 = await betaal(1, 24, '2026-11-20');
const terug = await creditsTerugVoorBestelling(env, { orderId: vier24, reden: CREDIT_REDEN.annulering, nu: dag('2026-11-25') });
ok('25 nov: de 24 terug, het abonnement loopt', [terug.ok, terug.aantal, terug.loopt], [true, 24, true]);
ok('  de teruggave: minstens 3 maanden geldig (25 feb)', terug.vervaltOp, '2027-02-25');
ok('  en de zin aan de klant noemt geen datum', terugZin(terug, 'nl', dag('2026-11-25')), '24 credits staan weer op je saldo.');
await boekTermijnBij(env, sub, '2026-12', 'tr_dec', dag('2026-12-09'));
const jan = await boekTermijnBij(env, sub, '2027-01', 'tr_jan', dag('2027-01-08'));
ok('8 jan: termijn geboekt, niets boven het plafond', [jan.ok, jan.boven], [true, 0]);

const s10 = await creditSaldo(env, { customerId: 1 }, { nu: dag('2027-01-10') });
ok('10 januari: 356 credits', s10.saldo, 356);
ok('  zonder datums die gelden (vier datums nu: één, en die schuift mee)', [s10.echteDatums, s10.vervalt.map((v) => v.op)], [[], ['2027-04-08']]);
ok('  het plafond 360', s10.plafond, PLAFOND);
ok('  op 8 februari komen er 120 bij en vervalt 116', s10.boven, { op: '2027-02-08', nieuw: 120, aantal: 116, plafond: 360, overstap: false });
const w = saldoWeergave(s10, 'nl', dag('2027-01-10'));
ok('  Studio: "Je hebt 356 credits (je kunt er 360 sparen). Op 8 februari … 116 …"', `${w.zin} ${w.nieuw}`,
  'Je hebt 356 credits (je kunt er 360 sparen). Op 8 februari komen er 120 bij: gebruik er vóór die dag 116, anders vallen ze weg.');
ok('  en geen vervalzin', [w.eerst, w.rest], ['', '']);
const boek10 = boekWeergave(await creditboek(env, { customerId: 1 }, { nu: dag('2027-01-10') }), { lang: 'nl', nu: dag('2027-01-10'), loopt: s10.nieuw.op });
ok('  het boek zet bij een lopend abonnement geen "vervalt op" bij de termijnen', boek10.regels.filter((r) => r.geldig).length, 0);
ok('  niets vervalt er tussendoor (geen herinnering per partij)',
  (await Promise.all(['2027-01-11', '2027-01-20', '2027-02-01', '2027-02-04'].map((d) => creditsDieVervallen(env, { dagen: 7, nu: dag(d) })))).every((l) => !l.length), true);

console.log('\n2 · de herinnering vóór de termijn');
ok('op 1 februari (7 dagen vooraf): één herinnering met 116', await plafondInZicht(env, { dagen: 7, nu: dag('2027-02-01') }),
  [{ customerId: 1, subscriptionId: 1, op: '2027-02-08', nieuw: 120, boven: 116, saldo: 356, plafond: PLAFOND, overstap: '' }]);
ok('op 31 januari en 2 februari niet', [(await plafondInZicht(env, { dagen: 7, nu: dag('2027-01-31') })).length, (await plafondInZicht(env, { dagen: 7, nu: dag('2027-02-02') })).length], [0, 0]);
mails.length = 0;
const nacht = await tasks.herinnerCredits(env, dag('2027-02-01', '03:00:00'));
const pm = mails.find((m) => m.to === 'pro@merk.test' || (Array.isArray(m.to) && m.to.includes('pro@merk.test')));
ok('de nachttaak mailt de klant op 1 februari', !!pm && /^Op 8 februari( 2027)? komen er 120 credits bij — gebruik er vóór die dag 116$/.test(pm.subject), true);
ok('  met "Je hebt 356 credits (je kunt er 360 sparen)" en de plafondzin', !!pm && /Je hebt <strong>356 credits<\/strong> \(je kunt er 360 sparen\)\. Op <strong>8 februari( 2027)?<\/strong> komen er 120 bij: gebruik er vóór die dag <strong>116<\/strong>, anders vallen ze weg\./.test(pm.html), true);
ok('  en het nachtrapport noemt het', /Spaarplafond in zicht: 1 klant gemaild/.test(nacht), true);
mails.length = 0;
ok('de nacht erna: niets', [await tasks.herinnerCredits(env, dag('2027-02-02', '03:00:00')), mails.length], ['', 0]);

console.log('\n3 · 8 februari: de termijn brengt hem boven het plafond');
const feb = await boekTermijnBij(env, sub, '2027-02', 'tr_feb', dag('2027-02-08'));
ok('termijn geboekt, 116 boven het plafond', [feb.ok, feb.boven], [true, 116]);
ok('saldo daarna precies het plafond', await creditsBeschikbaar(env, 1, dag('2027-02-08')), PLAFOND);
const plafRegel = db.prepare("SELECT aantal, datum, reden FROM credit_boek WHERE customer_id = 1 AND reden = 'plafond'").all();
ok('één regel "plafond" −116 op de dag van de termijn', plafRegel.map((r) => [r.aantal, String(r.datum).slice(0, 10)]), [[-116, '2027-02-08']]);
ok('de nieuwe termijn blijft heel (de oudste gaan eraf)', db.prepare("SELECT rest FROM credit_boek WHERE sleutel = 'termijn:1:2027-02'").get().rest, 120);
ok('  dus een terugbetaling van februari ziet 120 ongebruikt (V49)', (await termijnGebruik(env, { paymentId: 'tr_feb', nu: dag('2027-02-09') })).ongebruikt, 120);
ok('alles vervalt nu op één dag: 3 maanden na deze termijn', (await creditSaldo(env, { customerId: 1 }, { nu: dag('2027-02-09') })).vervalt.map((v) => v.op), ['2027-05-08']);
const regelWeer = boekWeergave(await creditboek(env, { customerId: 1 }, { nu: dag('2027-02-09') }), { lang: 'nl', nu: dag('2027-02-09') });
ok('in het boek: "Vervallen: boven je spaarplafond"', regelWeer.regels.some((r) => r.reden === 'plafond' && r.wat === 'Vervallen: boven je spaarplafond' && r.aantal === '−116'), true);
ok('dezelfde termijn nog een keer (webhook dubbel): niets, ook geen tweede plafond',
  [(await boekTermijnBij(env, sub, '2027-02', 'tr_feb', dag('2027-02-08'))).dubbel, db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE reden = 'plafond'").get().n], [true, 1]);

console.log('\n4 · een teruggave telt mee en omzeilt het plafond niet');
const honderd = await betaal(1, 100, '2027-02-20');
const mrt = await boekTermijnBij(env, sub, '2027-03', 'tr_mrt', dag('2027-03-08'));
ok('8 maart: 260 + 120 = 380, dus 20 boven het plafond', mrt.boven, 20);
const t2 = await creditsTerugVoorBestelling(env, { orderId: honderd, reden: CREDIT_REDEN.annulering, nu: dag('2027-03-10') });
ok('10 maart: de 100 komen helemaal terug (wie op tijd bestelde, raakt niets kwijt)', [t2.aantal, await creditsBeschikbaar(env, 1, dag('2027-03-10'))], [100, 460]);
ok('  maar bij de volgende termijn tellen ze mee: 460 + 120 − 360 = 220', t2.boven, { op: '2027-04-08', nieuw: 120, aantal: 220, plafond: 360, overstap: false });
ok('  en de annuleringsmail zegt dat', terugZin(t2, 'nl', dag('2027-03-10')),
  '100 credits staan weer op je saldo. Op 8 april komen er 120 bij: gebruik er vóór die dag 220, anders vallen ze weg.');
const apr = await boekTermijnBij(env, sub, '2027-04', 'tr_apr', dag('2027-04-08'));
ok('8 april: weer precies op het plafond', [apr.boven, await creditsBeschikbaar(env, 1, dag('2027-04-08'))], [220, PLAFOND]);

console.log('\n5 · pauze: alles geldig tot 3 maanden na de laatste termijn (ab-v2 = a)');
db.prepare("UPDATE subscriptions SET status = 'paused', paused_at = '2027-05-08 00:00:00', pause_reason = 'customer' WHERE id = 1").run();
const p = await creditSaldo(env, { customerId: 1 }, { nu: dag('2027-04-20') });
ok('geen nieuwe credits en geen plafondzin', [p.nieuw, p.boven], [null, null]);
ok('één datum: 8 juli (3 maanden na 8 april)', p.echteDatums, [{ op: '2027-07-08', aantal: PLAFOND }]);
ok('Studio: "Je credits blijven geldig tot en met 7 juli."', saldoWeergave(p, 'nl', dag('2027-04-20')).eerst, 'Je credits blijven geldig tot en met 7 juli.');
ok('EN: "… up to and including 7 July."', saldoWeergave(p, 'en', dag('2027-04-20')).eerst, 'Your credits stay valid up to and including 7 July.');
ok('één herinnering, 7 dagen vóór die datum', [(await creditsDieVervallen(env, { dagen: 7, nu: dag('2027-07-01') })).map((x) => [x.customerId, x.op, x.aantal]),
  (await creditsDieVervallen(env, { dagen: 7, nu: dag('2027-07-02') })).length], [[[1, '2027-07-08', PLAFOND]], 0]);
ok('geen plafondherinnering tijdens een pauze', (await plafondInZicht(env, { dagen: 7, nu: dag('2027-05-01') })).length, 0);
ok('op 7 juli nog bruikbaar, op 8 juli vervallen', [await creditsBeschikbaar(env, 1, dag('2027-07-07')), await creditsBeschikbaar(env, 1, dag('2027-07-08'))], [PLAFOND, 0]);

console.log('\n6 · hervatten: de datum schuift weer mee');
db.prepare("UPDATE subscriptions SET status = 'active', paused_at = NULL, pause_reason = NULL WHERE id = 1").run();
const jun = await boekTermijnBij(env, subRij(1), '2027-06', 'tr_jun', dag('2027-06-08'));
ok('8 juni (vóór 8 juli) hervat: alles schuift naar 8 september, 120 boven het plafond', [jun.boven, (await creditSaldo(env, { customerId: 1 }, { nu: dag('2027-06-09') })).vervalt.map((v) => v.op)], [120, ['2027-09-08']]);

console.log('\n7 · stoppen: dezelfde ene datum');
db.prepare("INSERT INTO customers (id, email, name) VALUES (2, 'stop@merk.test', 'Stop')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at)
            VALUES (2, 2, 'SUB-STOP', 'starter', 'monthly', 'active', '2026-10-05 09:00:00')`).run();
for (const [m, d] of [['2026-10', '2026-10-05'], ['2026-11', '2026-11-05'], ['2026-12', '2026-12-07']]) await boekTermijnBij(env, subRij(2), m, `tr_s${m}`, dag(d));
await betaal(2, 20, '2026-12-10');
db.prepare("UPDATE subscriptions SET status = 'cancelled', cancelled_at = '2026-12-20 10:00:00' WHERE id = 2").run();
const st = await creditSaldo(env, { customerId: 2 }, { nu: dag('2026-12-21') });
ok('Starter: 135 − 20 = 115, het plafond werd niet geraakt', st.saldo, 3 * PLAN_CREDITS.starter - 20);
ok('opgezegd: één datum, 3 maanden na de laatste termijn (7 maart)', st.echteDatums, [{ op: '2027-03-07', aantal: 115 }]);
ok('  geen plafond meer (opgezegd)', [st.plafond, saldoWeergave(st, 'nl', dag('2026-12-21')).spaar], [null, '']);
const terugNaStop = await creditsTerugVoorBestelling(env, { orderId: volg, reden: CREDIT_REDEN.nietGemaakt, aantal: 4, nu: dag('2027-03-01') });
ok('een teruggave vlak voor het einde: minstens 3 maanden geldig', [terugNaStop.vervaltOp, terugNaStop.loopt], ['2027-06-01', false]);
ok('  en de zin noemt zijn datum', terugZin(terugNaStop, 'nl', dag('2027-03-01')), '4 credits staan weer op je saldo, geldig tot en met 31 mei.');

console.log('\n8 · een jaar vooruit: zelfde regel, met de laatste maandtermijn');
db.prepare("INSERT INTO customers (id, email, name) VALUES (3, 'jaar@merk.test', 'Jaar')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at)
            VALUES (3, 3, 'SUB-JAAR', 'studio', 'prepaid', 'active', '2026-01-10 09:00:00')`).run();
const maanden = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
for (const m of maanden) {
  db.prepare('INSERT INTO subscription_months (subscription_id, month, granted) VALUES (3, ?, 12)').run(m);
  await boekTermijnBij(env, subRij(3), m, null, dag(`${m}-10`));
}
const j = await creditSaldo(env, { customerId: 3 }, { nu: dag('2026-12-20') });
ok('na de twaalfde maand: geen nieuwe credits', j.nieuw, null);
ok('  het plafond hield het jaar op 360', j.saldo, PLAFOND);
ok('  één datum: 3 maanden na de laatste maand (10 maart)', j.echteDatums, [{ op: '2027-03-10', aantal: PLAFOND }]);
ok('  9 van de 12 maanden gaven iets boven het plafond (de eerste drie niet)',
  db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE customer_id = 3 AND reden = 'plafond'").get().n, 9);

console.log('\n9 · een bijstelling door Lucas');
const bij = await boekBij(env, { customerId: 2, subscriptionId: 2, aantal: 10, reden: CREDIT_REDEN.bijstelling, toelichting: 'proef', nu: dag('2027-01-02') });
ok('minstens 3 maanden vanaf vandaag, en de datum van de rest als die later valt', [bij.vervaltOp >= vervaldatum('2027-01-02'), bij.vervaltOp], [true, '2027-06-01']);
db.prepare("INSERT INTO customers (id, email, name) VALUES (4, 'los@merk.test', 'Los')").run();
const los = await boekBij(env, { customerId: 4, aantal: 10, reden: CREDIT_REDEN.bijstelling, toelichting: 'proef', nu: dag('2027-01-02') });
ok('zonder andere credits: precies 3 maanden vanaf vandaag', los.vervaltOp, vervaldatum('2027-01-02'));

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
