/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE LOPENDE TERMIJN — 4 SEPTEMBER 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Wanneer ik het abonnement opzeg verdwijnt het abonnements-dashboard
 * ook per direct terwijl ik de maand nog niet had afgemaakt."*
 *
 * De oorzaak was de KALENDERmaand als maat voor een termijn die op de dag van de
 * eerste betaling begint. Zie de kop bij termijnMaand() in subscription.js voor
 * het hele verhaal; wat hieronder staat, is wat er sindsdien waar moet blijven.
 *
 * WAAROM DEZE TOETS ER NAAST subscription.test.mjs IS. Die toets werkt met
 * `monthKey()`: hij maakt een maandrij voor de huidige kalendermaand en vraagt
 * het saldo op de dag van vandaag. Daarmee kán hij dit verschil niet zien — de
 * fout zit precies in de dagen waarop kalender en termijn NIET samenvallen, en
 * daar komt die toets nooit. Hier wordt de klok dus meegegeven.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import {
  termijnDag, termijnMaand, termijnEinde,
  createSubscriptionRow, activateSubscription, cancelSubscription,
  loadSubscription, planSaldo, verbruikToestaan,
} from '../src/lib/subscription.js';
import { productsFor } from '../src/data/plans.js';

let ok_ = 0; let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const goed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (goed) ok_ += 1;
  console.log(` ${goed ? 'ok  ' : 'FAIL'} ${naam.padEnd(62)}${goed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql draait zonder mislukte statements', mislukt, []);
const env = { DB: d1(db) };
db.exec("INSERT INTO customers (id, email) VALUES (1, 'een@voorbeeld.test')");

/* ── 1 · de dag en de maand, zonder database ─────────────────────────────── */
console.log('\nwelke maand is de lopende termijn');
const opDe20e = { started_at: '2026-08-20 09:15:00' };
ok('de afschrijfdag komt uit started_at', termijnDag(opDe20e), 20);
ok('op de 4e loopt de termijn van vorige maand nog',
  termijnMaand(opDe20e, new Date('2026-09-04T12:00:00Z')), '2026-08');
ok('op de 19e ook nog',
  termijnMaand(opDe20e, new Date('2026-09-19T23:00:00Z')), '2026-08');
ok('op de 20e slaat hij om',
  termijnMaand(opDe20e, new Date('2026-09-20T00:30:00Z')), '2026-09');
ok('en die termijn loopt tot de 20e van de maand erna',
  termijnEinde(opDe20e, '2026-08'), '2026-09-20');

/* Een abonnement dat op de 1e begint, houdt precies het oude gedrag. Dat is de
   helft van waarom deze verandering veilig is: voor die abonnee verandert er
   niets, en de toetsen die met monthKey() werken blijven daarom kloppen. */
const opDe1e = { started_at: '2026-08-01 08:00:00' };
ok('wie op de 1e begint volgt de kalender',
  [termijnMaand(opDe1e, new Date('2026-09-01T06:00:00Z')), termijnMaand(opDe1e, new Date('2026-09-28T06:00:00Z'))],
  ['2026-09', '2026-09']);
/* De 29e, 30e en 31e bestaan niet in februari; eersteTermijn() knipt daarom op
   28 en dit doet hetzelfde, of de twee zouden op verschillende dagen omslaan. */
ok('boven de 28e wordt het de 28e', termijnDag({ started_at: '2026-08-31 08:00:00' }), 28);
ok('zonder datum is het de 1e (en dus de kalendermaand)', termijnDag({}), 1);

/* ── 2 · het dashboard van een LOPEND abonnement, vóór de afschrijfdag ───── */
console.log('\neen lopend abonnement tussen de 1e en de afschrijfdag');
const { row } = await createSubscriptionRow(env, { customerId: 1, planId: 'starter', termId: 'monthly', windowDay: 8 });
db.prepare("UPDATE subscriptions SET started_at = '2026-08-20 09:15:00' WHERE id = ?").run(row.id);
await activateSubscription(env, row.id);
/* De afschrijving van 20 augustus: de webhook maakt deze rij met de
   kalendermaand van de betaaldatum als naam. Dat blijft zo — het is de naam van
   de betaling, niet van de termijn. */
db.prepare('INSERT INTO subscription_months (subscription_id, month, granted, used) VALUES (?, ?, ?, 0)')
  .run(row.id, '2026-08', productsFor('starter'));

const vier = new Date('2026-09-04T12:00:00Z');
const staat = await planSaldo(env, 1, vier);
ok('de lopende maand is die van de laatste afschrijving', staat.maand, '2026-08');
ok('en die is betaald', staat.betaald, true);
ok('het saldo is het hele pakket', staat.saldo, productsFor('starter'));
ok('en het mag besteed worden', verbruikToestaan(staat, 1).uitSaldo, 1);
ok('er staat bij tot wanneer er betaald is', staat.termijnTot, '2026-09-20');

/* ── 3 · opzeggen halverwege de betaalde termijn ─────────────────────────── */
console.log('\nopzeggen, en dan de maand uitzitten');
await cancelSubscription(env, row.id, 'customer');
ok('het abonnement staat op opgezegd',
  db.prepare('SELECT status FROM subscriptions WHERE id = ?').get(row.id).status, 'cancelled');

const naOpzegging = await planSaldo(env, 1, vier);
ok('het dashboard blijft staan', Boolean(naOpzegging.sub), true);
ok('het zegt dat het opgezegd is', naOpzegging.sub.status, 'cancelled');
ok('het is niet meer "actief"', naOpzegging.actief, false);
ok('maar het saldo blijft besteedbaar', verbruikToestaan(naOpzegging, 1).uitSaldo, 1);
ok('en er staat tot wanneer', naOpzegging.termijnTot, '2026-09-20');

/* En op de dag dat de termijn afloopt is het over: er komt geen nieuwe maandrij
   meer bij, dus er is niets meer om te tonen. */
const twintigste = new Date('2026-09-20T09:00:00Z');
ok('op de afschrijfdag is het weg', await loadSubscription(env, 1, twintigste), null);
const daarna = await planSaldo(env, 1, twintigste);
ok('en het dashboard staat leeg', [Boolean(daarna.sub), daarna.saldo], [false, 0]);

/* ── 4 · en de dag ervoor nog niet ───────────────────────────────────────── */
const negentiende = new Date('2026-09-19T23:59:00Z');
ok('de dag ervóór staat hij er nog', Boolean(await loadSubscription(env, 1, negentiende)), true);

console.log(`\n${ok_}/${totaal} geslaagd`);
if (ok_ !== totaal) process.exit(1);
