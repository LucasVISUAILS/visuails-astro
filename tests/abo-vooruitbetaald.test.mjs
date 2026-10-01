/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN VOORUITBETAALD JAAR LEVERT TWAALF MAANDEN OP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gevonden op 17 september 2026. Een vooruitbetaald jaar krijgt met opzet geen
 * Mollie-subscription; de maandelijkse toekenning hing dáár aan. De noot in
 * subscribe.js verwees naar "de maandtaak" en die bestond niet — dus stond er
 * één maand tegenover een jaar geld.
 *
 * Deze toets draait de ECHTE taak op een echte database, twaalf keer, met de
 * klok een maand verder per ronde. Wat hij bewaakt:
 *
 *   · elke termijn krijgt precies één maandrij, en de slots erbij
 *   · twee keer draaien in dezelfde maand levert niets extra's op (de taak
 *     draait elke nacht, de maand slaat één keer om)
 *   · na twaalf maanden stopt hij uit zichzelf, zonder einddatum ergens
 *   · een maandabonnement wordt NIET aangeraakt — dat loopt via de incasso, en
 *     een taak die daar ook maanden op zou toekennen, geeft gratis maanden weg
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { tasks } from '../cron/index.js';
import { TERMS } from '../src/data/plans.js';
import { PLAN_PRODUCTS } from '../src/data/pricing.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const gelijk = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(` ${gelijk ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(62)}${gelijk ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }
/* Een nep-Resend: de laatste-maandmail (24 september 2026) moet uitgaan. */
const mails = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) mails.push(JSON.parse(String(opts.body || '{}')));
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const env = { DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>' };

/* Eén klant, één vooruitbetaald jaar op Brand, begonnen op 20 januari 2026 —
   een dag in de maand die niet de eerste is, want juist daar ging het mis: de
   termijn slaat om op de 20e en niet op de 1e. */
db.exec(`INSERT INTO customers (id, email, name) VALUES (1, 'vooruit@example.com', 'Vooruit BV');`);
db.exec(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at)
         VALUES (1, 1, 'SUB-VOORUIT', 'brand', 'prepaid', 'active', 20, '2026-01-20');`);
/* Maand één komt van de eerste betaling, net als in werkelijkheid: de webhook
   schrijft die rij als het geld binnen is. De taak begint dus bij maand twee. */
db.exec(`INSERT INTO subscription_months (subscription_id, month, granted) VALUES (1, '2026-01', ${PLAN_PRODUCTS.brand});`);

/* ── EEN OPGEZEGD VOORUITBETAALD JAAR LOOPT DOOR — 24 september 2026 ──────
   Lucas: *"Het abonnement moet gewoon simpelweg doorlopen tot einde van het
   jaar."* Opzeggen zet alleen cancelled_at; de status blijft 'active' en de
   maanden komen gewoon binnen. */
db.exec(`INSERT INTO customers (id, email, name) VALUES (3, 'opgezegd@example.com', 'Opgezegd BV');`);
db.exec(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at, cancelled_at, cancel_reason)
         VALUES (3, 3, 'SUB-OPGEZEGD', 'studio', 'prepaid', 'active', 20, '2026-01-20', '2026-03-02', 'customer');`);
db.exec(`INSERT INTO subscription_months (subscription_id, month, granted) VALUES (3, '2026-01', ${PLAN_PRODUCTS.studio});`);

/* En een maandabonnement ernaast, dat met rust gelaten moet worden. */
db.exec(`INSERT INTO customers (id, email, name) VALUES (2, 'maand@example.com', 'Maand BV');`);
db.exec(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at)
         VALUES (2, 2, 'SUB-MAAND', 'brand', 'monthly', 'active', 20, '2026-01-20');`);

const maanden = () => db.prepare('SELECT month FROM subscription_months WHERE subscription_id = 1 ORDER BY month').all().map((r) => r.month);
const slotsVan = (m) => db.prepare('SELECT SUM(granted) AS n FROM subscription_slots WHERE subscription_id = 1 AND month = ?').get(m)?.n || 0;

/* De echte taak, met de klok in de hand. De 21e van elke maand: één dag na de
   dag waarop de termijn omslaat. */
const opDe21e = (jaar, maand) => new Date(Date.UTC(jaar, maand - 1, 21, 3, 0, 0));
/* De taak neemt de datum als parameter aan. Eerst stond hier een gestubde
   Date-subklasse, en die brak `toISOString()` in een functie drie lagen dieper:
   er belandde een maandsleutel "Wed Oct" in de database. Een parameter is
   eerlijker én het maakt de taak zelf toetsbaar zonder de wereld te verbouwen. */
const draaiOp = (d) => tasks.grantPrepaidMonths(env, d);

console.log('\nelke termijn krijgt zijn eigen maand');
{
  /* Februari tot en met december 2026: elf rondes, bovenop de maand die de
     eerste betaling al gaf. Samen twaalf. */
  for (let m = 2; m <= 12; m += 1) await draaiOp(opDe21e(2026, m));
  ok('er staan twaalf maanden', maanden().length, TERMS.prepaid.months);
  ok('en ze lopen van januari tot december',
    [maanden()[0], maanden()[maanden().length - 1]], ['2026-01', '2026-12']);
  ok('elke maand draagt de producten van het plan',
    maanden().every((m) => Number(db.prepare('SELECT granted FROM subscription_months WHERE subscription_id = 1 AND month = ?').get(m).granted) === PLAN_PRODUCTS.brand), true);
  /* De slots per soort horen erbij — zonder die rijen staat er een maand op het
     dashboard zonder iets erin. De eerste maand kwam van de webhook en heeft ze
     in deze opzet niet; alles wat de taak zette, wel. */
  ok('en de maanden van de taak hebben slots', slotsVan('2026-06') > 0, true);
}

console.log('\ntwee keer draaien op één dag verandert niets');
{
  const voor = maanden().length;
  await draaiOp(opDe21e(2026, 12));
  await draaiOp(opDe21e(2026, 12));
  ok('nog steeds twaalf', maanden().length, voor);
}

console.log('\nhet opgezegde jaar kreeg precies hetzelfde');
{
  const n = db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = 3').get().n;
  ok('ook twaalf maanden, ondanks de opzegging in maart', n, TERMS.prepaid.months);
}

console.log('\nde twaalfde maand kondigt zich aan');
{
  const laatste = mails.filter((m) => /laatste maand/i.test(m.subject || ''));
  ok('één mail per jaar, voor allebei de jaren', laatste.length, 2);
  const niet = laatste.find((m) => [].concat(m.to).includes('vooruit@example.com'));
  const wel = laatste.find((m) => [].concat(m.to).includes('opgezegd@example.com'));
  ok('met de einddatum erin', /20 januari 2027/.test(niet?.html || ''), true);
  ok('wie niet opzegde, hoort waar hij verder kan', /nieuw abonnement/.test(niet?.html || ''), true);
  ok('wie opzegde, hoort dat hij niets hoeft te doen', /niets te doen/.test(wel?.html || ''), true);
}

console.log('\nen na een jaar stopt hij uit zichzelf — en sluit hij af');
{
  for (let m = 1; m <= 6; m += 1) await draaiOp(opDe21e(2027, m));
  ok('geen dertiende maand', maanden().length, TERMS.prepaid.months);
  /* Tot 24 september 2026 bleef de rij voor altijd op 'active' staan: "Loopt"
     in Studio zonder nieuwe credits, en geen nieuw abonnement mogelijk. */
  const r1 = db.prepare('SELECT status, cancel_reason FROM subscriptions WHERE id = 1').get();
  ok('het afgelopen jaar is afgesloten', r1.status, 'cancelled');
  ok('  met "jaar afgelopen" als reden', r1.cancel_reason, 'jaar afgelopen');
  const r3 = db.prepare('SELECT status, cancel_reason FROM subscriptions WHERE id = 3').get();
  ok('het opgezegde jaar ook', r3.status, 'cancelled');
  ok('  en het houdt de reden van de klant', r3.cancel_reason, 'customer');
  ok('er ging geen tweede laatste-maandmail uit', mails.filter((m) => /laatste maand/i.test(m.subject || '')).length, 2);
}

console.log('\nop de laatste dag van het jaar is het nog niet dicht');
{
  db.exec(`INSERT INTO customers (id, email, name) VALUES (4, 'bijna@example.com', 'Bijna BV');`);
  db.exec(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at)
           VALUES (4, 4, 'SUB-BIJNA', 'starter', 'prepaid', 'active', 20, '2025-10-20');`);
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(Date.UTC(2025, 9 + i, 1));
    db.exec(`INSERT INTO subscription_months (subscription_id, month, granted) VALUES (4, '${d.toISOString().slice(0, 7)}', 1);`);
  }
  /* Laatste maand is 2026-09; die termijn loopt tot 20 oktober 2026. */
  await draaiOp(new Date(Date.UTC(2026, 9, 19, 3)));
  ok('op 19 oktober loopt hij nog', db.prepare('SELECT status FROM subscriptions WHERE id = 4').get().status, 'active');
  await draaiOp(new Date(Date.UTC(2026, 9, 20, 3)));
  ok('op 20 oktober is hij dicht', db.prepare('SELECT status FROM subscriptions WHERE id = 4').get().status, 'cancelled');
}

console.log('\neen maandabonnement wordt niet aangeraakt');
{
  const n = db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = 2').get().n;
  ok('nul maanden toegekend', n, 0);
}

console.log('\nen de taak staat in de nachtelijke lijst');
{
  ok('grantPrepaidMonths is uitgevoerd door de scheduler', typeof tasks.grantPrepaidMonths, 'function');
}

globalThis.fetch = echteFetch;
console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
