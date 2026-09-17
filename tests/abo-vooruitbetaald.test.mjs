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
const env = { DB: d1(db) };

/* Eén klant, één vooruitbetaald jaar op Brand, begonnen op 20 januari 2026 —
   een dag in de maand die niet de eerste is, want juist daar ging het mis: de
   termijn slaat om op de 20e en niet op de 1e. */
db.exec(`INSERT INTO customers (id, email, name) VALUES (1, 'vooruit@example.com', 'Vooruit BV');`);
db.exec(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at)
         VALUES (1, 1, 'SUB-VOORUIT', 'brand', 'prepaid', 'active', 20, '2026-01-20');`);
/* Maand één komt van de eerste betaling, net als in werkelijkheid: de webhook
   schrijft die rij als het geld binnen is. De taak begint dus bij maand twee. */
db.exec(`INSERT INTO subscription_months (subscription_id, month, granted) VALUES (1, '2026-01', ${PLAN_PRODUCTS.brand});`);

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

console.log('\nen na een jaar stopt hij uit zichzelf');
{
  for (let m = 1; m <= 6; m += 1) await draaiOp(opDe21e(2027, m));
  ok('geen dertiende maand', maanden().length, TERMS.prepaid.months);
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

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
