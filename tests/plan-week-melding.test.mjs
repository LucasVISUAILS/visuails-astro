/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE NACHTELIJKE HERINNERING: DEZE WEEK IS BEGONNEN EN NOG NIET GESTART
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * weekTeStarten() in cron/index.js is de tegenhanger van checkPlanQueues(). Die
 * waarschuwt de KLANT dat zijn lijst leeg is; deze vertelt LUCAS dat een lijst
 * juist vol staat en de week begonnen is, zodat de knop in /admin ingedrukt
 * wordt. Zie de kop van die functie voor waarom starten een menselijke handeling
 * blijft en dit dus een melding is en geen automaat.
 *
 * ── WAAROM DIT TEGEN EEN ECHTE SQLITE DRAAIT ────────────────────────────────
 *
 * De hele taak is één query met twee gecorreleerde subquery's erin. Precies daar
 * zit ook de enige manier waarop hij stil kan falen: `substr(o.created_at, 1, 7)`
 * moet de maand van een `datetime('now')`-kolom opleveren, en `payment_status =
 * 'plan'` moet de vorm zijn die startPlanWindow() écht schrijft. Een stub die op
 * SQL-tekst matcht bewijst geen van beide.
 *
 * ── WAT ER BEWEZEN MOET WORDEN ──────────────────────────────────────────────
 *
 *   · een begonnen week met werk klaar staat in het verslag;
 *   · een week die deze maand AL gestart is, staat er niet meer in;
 *   · een week die nog niet begonnen is (window_day later deze maand) ook niet;
 *   · een lijst met alleen CONCEPTEN staat er niet in — pas als de klant een
 *     product vastzet, is er een slot voor afgeschreven en is het werk;
 *   · en de melding blijft terugkomen zolang er niet gestart is — er zit
 *     bewust geen slot op, anders verdwijnt de herinnering na één nacht.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { tasks } from '../cron/index.js';
import { createSubscriptionRow, activateSubscription, queueAdd, queueLock, monthKey } from '../src/lib/subscription.js';
import { grantSlots } from '../src/lib/slots.js';
import { productsFor } from '../src/data/plans.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }
const env = { DB: d1(db) };

/* Een dag die vandaag of eerder is, en een die later deze maand valt. Uitgerekend
   en niet vastgezet: op de 1e van de maand bestaat "gisteren" niet, en op de 28e
   bestaat "later deze maand" bijna niet. Valt de dag buiten 1..28, dan wordt de
   toets overgeslagen in plaats van vals te falen — window_day mag per migratie
   0030 nooit boven de 28 komen. */
const vandaag = new Date().getUTCDate();
const BEGONNEN = Math.min(Math.max(1, vandaag), 28);
const NOGNIET = vandaag < 28 ? vandaag + 1 : null;

const maand = monthKey();
const toegekend = productsFor('studio');

async function abonnee(id, email, brand, dag) {
  db.prepare('INSERT INTO customers (id, email, brand) VALUES (?, ?, ?)').run(id, email, brand);
  const { row } = await createSubscriptionRow(env, { customerId: id, planId: 'studio', termId: 'monthly', windowDay: dag });
  await activateSubscription(env, row.id);
  db.prepare('INSERT INTO subscription_months (subscription_id, month, granted, used) VALUES (?, ?, ?, 0)')
    .run(row.id, maand, toegekend);
  await grantSlots(env, row.id, maand, 'studio');
  return row;
}

const a1 = await abonnee(1, 'mara@volt.test', 'VOLT', BEGONNEN);          // klaar om te starten
const a2 = await abonnee(2, 'sam@ander.test', 'ANDER', BEGONNEN);         // deze maand al gestart
const a3 = await abonnee(3, 'kim@derde.test', 'DERDE', BEGONNEN);         // alleen een concept
const a4 = NOGNIET ? await abonnee(4, 'jo@vier.test', 'VIER', NOGNIET) : null;  // week nog niet begonnen

/* VASTZETTEN HOORT ERBIJ — migratie 0035. Sinds het slotmodel is een item pas
   werk als de klant het heeft vastgezet; een concept telt niet mee en hoort dus
   ook niet in het nachtverslag te staan. */
for (const [klant, naam, batch] of [[1, 'Winterjas', 'b-1'], [1, 'Cargobroek', 'b-2'], [2, 'Trui', 'b-3']]) {
  const q = await queueAdd(env, klant, { name: naam, uploadBatch: batch });
  await queueLock(env, klant, q.id);
}
/* DERDE zet zijn product NIET vast. Sinds migratie 0035 is dat een concept: het
   staat op de lijst, er is geen slot voor afgeschreven, en het is dus geen werk.
   Hij hoort daarom niet in het verslag te staan — dat is de vervanger van de
   oude "geen saldo"-toets, die met het slotmodel onbereikbaar werd omdat
   vastzetten het slot al afschrijft. */
await queueAdd(env, 3, { name: 'Sjaal', uploadBatch: 'b-9' });
if (a4) {
  const q = await queueAdd(env, 4, { name: 'Muts', uploadBatch: 'b-4' });
  await queueLock(env, 4, q.id);
}

/* ANDER is deze maand al gestart: precies de vorm die startPlanWindow() maakt. */
db.prepare(
  "INSERT INTO orders (ref, customer_id, service, name, brand, email, total_cents, lang, tier, product_count, payment_status)"
  + " VALUES ('VIS-AL-001', 2, 'drop', NULL, 'ANDER', 'sam@ander.test', 0, 'nl', 'attended', 1, 'plan')"
).run();

console.log('\nwie er in het nachtverslag komt');
const regel = await tasks.weekTeStarten(env);
ok('VOLT staat erin, met het aantal', /VOLT \(2\)/.test(regel));
ok('ANDER niet — die week is deze maand al gestart', /ANDER/.test(regel), false);
ok('DERDE niet — dat is nog maar een concept', /DERDE/.test(regel), false);
if (a4) ok('VIER niet — die week begint pas later deze maand', /VIER/.test(regel), false);
else console.log(' --   VIER overgeslagen: vandaag is de 28e of later                ');

console.log('\nde herinnering blijft staan tot er gestart is');
const nogEens = await tasks.weekTeStarten(env);
ok('dezelfde regel komt de nacht erna terug', nogEens, regel);

console.log('\nen verdwijnt zodra de week gestart is');
db.prepare(
  "INSERT INTO orders (ref, customer_id, service, name, brand, email, total_cents, lang, tier, product_count, payment_status)"
  + " VALUES ('VIS-NU-001', 1, 'drop', NULL, 'VOLT', 'mara@volt.test', 0, 'nl', 'attended', 2, 'plan')"
).run();
const na = await tasks.weekTeStarten(env);
ok('VOLT staat er niet meer in', /VOLT/.test(na), false);
ok('en DERDE nog steeds niet', /DERDE/.test(na), false);

console.log('\nzonder abonnementen zegt de taak niets');
db.exec('DELETE FROM plan_queue');
ok('een lege uitkomst is een lege regel', await tasks.weekTeStarten(env), '');

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
