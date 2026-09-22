/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE PLANNINGSTAB: ZELF INPLANNEN, EN ALLEEN NAAR VOREN VERZETTEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 19 september 2026: *"Ik wil ook dat de klant een soort visuele planning
 * tab krijgt waar ze handmatig een order in kunnen plaatsen door op de datum te
 * klikken (…) ze kunnen orders in de planning ook vooruit slepen naar een andere
 * datum waarna ze een melding krijgen van of ze het zeker weten omdat de datum
 * nooit naar achter gezet mag worden, alleen naar voren."*
 *
 * Er zitten twee beloftes in die zin die stil kunnen breken, en daarom staat deze
 * toets er:
 *
 *   1 · NOOIT NAAR ACHTEREN. Zou dat een keer lukken, dan is een leverdatum geen
 *       datum meer maar een voornemen — en /terms §6 zegt met zoveel woorden het
 *       tegenovergestelde. De regel staat daarom twee keer in de code (in
 *       queueVerzet() én in de UPDATE zelf) en wordt hier van beide kanten
 *       geprobeerd.
 *   2 · DE OUDE DAG KOMT VRIJ. De bezetting van een vastgezet item hangt aan
 *       `plan_queue.window_start`; verzetten mag die dag dus niet bezet laten
 *       staan, anders is de agenda voller dan de studio is.
 *
 * En de aanloop: sinds 20 september zijn dat DRIE volle dagen. Een dag binnen die
 * aanloop mag ook met een POST niet te pakken zijn — het scherm toont hem als te
 * vroeg, maar een POST komt niet altijd van dat scherm.
 */
import { d1, verseDb, zetLook } from './lib/d1sqlite.mjs';
import { grantSlots } from '../src/lib/slots.js';
import {
  createSubscriptionRow, activateSubscription,
  queueAdd, queueLock, queueWindow, queueVerzet, loadQueue,
} from '../src/lib/subscription.js';
import { LEAD_DAYS, addDays, firstOfferableDay } from '../src/data/capacity.js';
import { readCalendar } from '../src/lib/agenda.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const g = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (g) goed += 1;
  console.log(` ${g ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${g ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db } = verseDb(new URL('../schema.sql', import.meta.url));
const env = { DB: d1(db) };
db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'mara@volt.test', 'VOLT')");
zetLook(db, 1);
const { row: sub } = await createSubscriptionRow(env, { customerId: 1, planId: 'studio', termId: 'monthly', windowDay: 8 });
await activateSubscription(env, sub.id);
const maand = new Date().toISOString().slice(0, 10).slice(0, 7);
db.prepare('INSERT INTO subscription_months (subscription_id, month, granted, used) VALUES (?, ?, 12, 0)').run(sub.id, maand);
await grantSlots(env, sub.id, maand, 'studio');

const vandaag = new Date().toISOString().slice(0, 10);
const { blackouts } = await readCalendar(env, vandaag);
const eerste = firstOfferableDay(vandaag, blackouts);

console.log('de aanloop is drie volle dagen');
{
  ok('LEAD_DAYS staat op 3', LEAD_DAYS, 3);
  ok('en de eerste aanwijsbare dag ligt voorbij vandaag', eerste > vandaag);
  ok('met drie hele dagen ertussen',
    [1, 2, 3].every((n) => addDays(vandaag, n) <= eerste));
}

console.log('\neen product inplannen op een dag');
const a = await queueAdd(env, 1, { name: 'Winterjas', uploadBatch: 'b-1', kind: 'catalog' });
{
  ok('vastzetten lukt', (await queueLock(env, 1, a.id)).ok, true);
  const laat = addDays(eerste, 10);
  ok('en een dag vastleggen ook', await queueWindow(env, 1, a.id, laat, addDays(laat, 1)), true);
  const rij = (await loadQueue(env, 1)).find((q) => q.id === a.id);
  ok('de dag staat op de rij', rij.window_start, laat);
}

console.log('\nnaar voren mag');
{
  const rij = (await loadQueue(env, 1)).find((q) => q.id === a.id);
  const vroeger = addDays(rij.window_start, -4);
  const uit = await queueVerzet(env, 1, a.id, vroeger, addDays(vroeger, 1));
  ok('het verzetten lukt', uit.ok, true);
  ok('met de oude dag erbij, voor de melding', uit.van, rij.window_start);
  ok('en de nieuwe', uit.naar, vroeger);
  ok('de rij draagt de nieuwe dag', (await loadQueue(env, 1)).find((q) => q.id === a.id).window_start, vroeger);
}

console.log('\nnaar achteren nooit');
{
  const rij = (await loadQueue(env, 1)).find((q) => q.id === a.id);
  const later = addDays(rij.window_start, 3);
  const uit = await queueVerzet(env, 1, a.id, later, addDays(later, 1));
  ok('het verzetten weigert', uit.ok, false);
  ok('met de reden erbij', uit.reden, 'niet-eerder');
  ok('en de dag staat er onveranderd',
    (await loadQueue(env, 1)).find((q) => q.id === a.id).window_start, rij.window_start);
  /* Dezelfde dag is ook niet eerder — een verzetting die niets verzet, hoort
     geen melding naar de studio te sturen. */
  ok('dezelfde dag telt ook niet als eerder',
    (await queueVerzet(env, 1, a.id, rij.window_start, rij.window_end)).reden, 'niet-eerder');
}

console.log('\nwat er niet verzet kan worden');
{
  const b = await queueAdd(env, 1, { name: 'Concept zonder dag', uploadBatch: 'b-2', kind: 'catalog' });
  ok('een concept niet', (await queueVerzet(env, 1, b.id, eerste, addDays(eerste, 1))).reden, 'niet-vast');
  await queueLock(env, 1, b.id);
  ok('en een vastgezet item zonder dag ook niet',
    (await queueVerzet(env, 1, b.id, eerste, addDays(eerste, 1))).reden, 'geen-dag');
  ok('het item van een ander al helemaal niet',
    (await queueVerzet(env, 99, a.id, eerste, addDays(eerste, 1))).reden, 'onbekend');
  /* Opgepakt werk staat vast: de studio kan er al mee bezig zijn. */
  db.prepare("UPDATE plan_queue SET taken_at = datetime('now') WHERE id = ?").run(a.id);
  ok('en opgepakt werk evenmin',
    (await queueVerzet(env, 1, a.id, eerste, addDays(eerste, 1))).reden, 'opgepakt');
}

console.log('\nde oude dag komt vrij in de agenda');
{
  const c = await queueAdd(env, 1, { name: 'Trui', uploadBatch: 'b-3', kind: 'catalog' });
  await queueLock(env, 1, c.id);
  const laat = addDays(eerste, 12);
  await queueWindow(env, 1, c.id, laat, addDays(laat, 1));
  const voor = (await readCalendar(env, vandaag)).booked[laat] || 0;
  ok('de dag is bezet', voor > 0, true);
  const vroeger = addDays(laat, -3);
  await queueVerzet(env, 1, c.id, vroeger, addDays(vroeger, 1));
  const na = await readCalendar(env, vandaag);
  ok('en na het verzetten staat hij leeg', na.booked[laat] || 0, 0);
  ok('terwijl de nieuwe dag bezet is', (na.booked[vroeger] || 0) > 0, true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
