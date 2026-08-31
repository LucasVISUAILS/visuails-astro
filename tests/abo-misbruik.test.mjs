/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * KAN EEN KLANT GRATIS SLOTS KRIJGEN?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 30 augustus 2026: *"controleer de gehele betrouwbaarheid van het systeem
 * en dat klanten niet via code of een andere weg credits gratis erbij kunnen
 * krijgen. Uiteindelijk merk ik dat zelf natuurlijk op omdat het handwerk is,
 * maar het gaat me wel veel tijd en gedoe kosten."*
 *
 * Dat laatste is waarom dit bestand bestaat. Het gaat hier niet om een systeem
 * dat leeggeroofd wordt — het gaat om de uren die het kost om uit te zoeken
 * waarom de administratie niet klopt, en om het feit dat je een fout die één keer
 * per kwartaal gebeurt achteraf niet meer kunt reconstrueren.
 *
 * ── DE VIER WEGEN OMHOOG, EN WIE ZE MAG BELOPEN ────────────────────────────
 *
 *   grantSlots()               alleen de Mollie-webhook, op een betaling die
 *                              wij bij Mollie zelf ophalen
 *   geefSlotTerug()            losmaken, weghalen, en het annuleren van een
 *                              bestelling door de studio
 *   handleSlotCorrectie()      alleen /admin, achter sessie én Origin
 *   verbruikSlot() met -n      bestaat niet; het aantal wordt afgekapt op 0
 *
 * Wat hieronder wordt beproefd is niet of die functies kloppen — dat doet
 * tests/slots.test.mjs — maar of ze langs een omweg te bereiken zijn, en of de
 * RACE tussen klant en studio ergens een gat laat.
 *
 * ── HET GAT DAT DEZE RONDE OPLEVERDE ────────────────────────────────────────
 *
 * Ja, er was er een, en hij zat precies op de naad tussen die twee:
 *
 *   1 · de klant zet vijf items vast;
 *   2 · Lucas drukt op "start deze week" — de lijst is gelezen, taken_at staat
 *       nog niet;
 *   3 · de klant drukt in datzelfde ogenblik op "losmaken".
 *
 * De oude queueUnlock() peilde taken_at met een SELECT en gaf daarna het slot
 * terug. Een tel later stond het item in een bestelling die gemaakt ging worden:
 * product gemaakt, slot terug, en niets dat het meldt. Dezelfde weg lag open via
 * "weghalen", dat eerst losmaakte en pas daarna probeerde te verwijderen.
 *
 * Beide voorwaarden staan sinds vandaag IN de UPDATE, en queueTakeIds() pakt
 * alleen nog op wat op dát moment nog vastgezet is. De database beslist, niet
 * de peiling ervoor.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import {
  createSubscriptionRow, activateSubscription,
  queueAdd, queueLock, queueUnlock, queueRemove, queueTakeIds, queueUntakeIds, loadQueue,
} from '../src/lib/subscription.js';
import { grantSlots, slotBalans, verbruikSlot, geefSlotTerug } from '../src/lib/slots.js';
import { startPlanWindow } from '../src/lib/planStart.js';
import { PLAN_PRODUCTS } from '../src/data/pricing.js';
import { onRequestPost } from '../functions/api/webhook/mollie.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(62)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }
const env = { DB: d1(db) };

db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'mara@volt.test', 'VOLT')");
db.exec("INSERT INTO customers (id, email, brand) VALUES (2, 'dief@ander.test', 'ANDER')");
const { row: sub } = await createSubscriptionRow(env, { customerId: 1, planId: 'starter', termId: 'monthly', windowDay: 8 });
await activateSubscription(env, sub.id);
const maand = new Date().toISOString().slice(0, 7);
await grantSlots(env, sub.id, maand, 'starter');

const saldo = async () => (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'complete');

console.log('de klant kan het aantal niet zelf opdrijven');
{
  const start = (await saldo()).toegekend;
  /* Nul en negatief. `verbruikSlot(-3)` zou, als het aantal niet werd afgekapt,
     `used = used + -3` doen en dus SLOTS TERUGGEVEN via de verbruikkant. */
  ok('nul verbruiken doet niets', await verbruikSlot(env, sub.id, 1, 'complete', 0), 0);
  ok('een negatief aantal ook niet', await verbruikSlot(env, sub.id, 1, 'complete', -3), 0);
  ok('en het saldo staat er ongewijzigd bij', (await saldo()).verbruikt, 0);

  /* En de andere kant: teruggeven wat nooit is uitgegeven. De UPDATE draagt
     `used >= ?4`, dus dit kan het verbruik niet onder nul duwen. */
  ok('teruggeven zonder verbruik geeft niets terug', await geefSlotTerug(env, sub.id, 1, 'complete', 5), 0);
  ok('het verbruik blijft nul', (await saldo()).verbruikt, 0);
  ok('en het toegekende is niet gegroeid', (await saldo()).toegekend, start);

  /* Meer vastzetten dan er is. De UPDATE draagt `used + ?4 <= granted`. */
  ok('meer verbruiken dan er is, boekt alleen wat er is',
    await verbruikSlot(env, sub.id, 1, 'complete', PLAN_PRODUCTS.starter + 5), PLAN_PRODUCTS.starter);
  ok('en daarna is er niets meer', (await saldo()).saldo, 0);
  await geefSlotTerug(env, sub.id, 1, 'complete', PLAN_PRODUCTS.starter);
}

console.log('\nlosmaken kan niet twee keer worden verzilverd');
{
  const q = await queueAdd(env, 1, { name: 'Jas', uploadBatch: 'b-1' });
  await queueLock(env, 1, q.id);
  ok('één slot verbruikt', (await saldo()).verbruikt, 1);

  ok('losmaken lukt', (await queueUnlock(env, 1, q.id)).ok, true);
  ok('en het slot is terug', (await saldo()).verbruikt, 0);
  /* Twee tabbladen die allebei op losmaken drukken. De UPDATE draagt
     `locked_at IS NOT NULL`, dus de tweede raakt niets en boekt niets terug. */
  ok('nog een keer losmaken meldt dat het al los stond', (await queueUnlock(env, 1, q.id)).reden, 'stond-al-los');
  ok('en geeft geen tweede slot terug', (await saldo()).verbruikt, 0);
  await queueRemove(env, 1, q.id);
}

console.log('\nweghalen geeft precies één slot terug, en alleen wat echt weg is');
{
  const q = await queueAdd(env, 1, { name: 'Broek', uploadBatch: 'b-2' });
  await queueLock(env, 1, q.id);
  ok('weghalen lukt', await queueRemove(env, 1, q.id), true);
  ok('en het slot is terug', (await saldo()).verbruikt, 0);
  ok('nog een keer weghalen lukt niet', await queueRemove(env, 1, q.id), false);
  ok('en geeft dus ook geen slot terug', (await saldo()).verbruikt, 0);

  /* Een concept weghalen mag nooit een slot opleveren: er is er nooit één voor
     afgeschreven. Dit is de kant waar de klant er ééntje BIJ zou krijgen. */
  const c = await queueAdd(env, 1, { name: 'Concept', uploadBatch: 'b-3' });
  await verbruikSlot(env, sub.id, 1, 'complete', 2);
  const voor = (await saldo()).verbruikt;
  await queueRemove(env, 1, c.id);
  ok('een concept weghalen levert niets op', (await saldo()).verbruikt, voor);
  await geefSlotTerug(env, sub.id, 1, 'complete', 2);
}

console.log('\nde race tussen losmaken en de week starten');
{
  /* ── HET GAT VAN 30 AUGUSTUS, NAGEBOOTST ─────────────────────────────────
     De race zelf is niet af te dwingen in één draad, maar de toestand die hem
     gevaarlijk maakte wél: een item dat is OPGEPAKT en dat de klant daarna
     probeert los te maken of weg te halen. Lukt een van beide, dan is het slot
     terug terwijl het product gemaakt wordt. */
  const a = await queueAdd(env, 1, { name: 'Trui', uploadBatch: 'b-4' });
  await queueLock(env, 1, a.id);
  const week = await startPlanWindow(env, 1);
  ok('de week is gestart', week.ok, true);
  const na = (await saldo()).verbruikt;
  ok('en het slot staat op verbruikt', na, 1);

  ok('losmaken van een opgepakt item lukt niet', (await queueUnlock(env, 1, a.id)).ok, false);
  ok('het slot blijft dus verbruikt', (await saldo()).verbruikt, na);
  ok('weghalen van een opgepakt item lukt ook niet', await queueRemove(env, 1, a.id), false);
  ok('en ook daarna staat het slot nog op verbruikt', (await saldo()).verbruikt, na);
  ok('het item hangt nog aan zijn bestelling',
    db.prepare('SELECT order_id FROM plan_queue WHERE id = ?').get(a.id).order_id, week.orderId);
}

console.log('\noppakken pakt alleen op wat op dat moment nog vastgezet is');
{
  const b = await queueAdd(env, 1, { name: 'Muts', uploadBatch: 'b-5' });
  /* NIET vastgezet. Zou queueTakeIds() hem toch oppakken, dan maken we een
     product waar geen slot voor is afgeschreven — de fout in de andere richting,
     en even duur. */
  ok('een concept wordt niet opgepakt', await queueTakeIds(env, 1, [b.id]), []);
  await queueLock(env, 1, b.id);
  ok('een vastgezet item wel', (await queueTakeIds(env, 1, [b.id])).length, 1);
  ok('en een tweede keer niet nog eens', await queueTakeIds(env, 1, [b.id]), []);
  /* Terugdraaien hoort te kunnen zolang er geen bestelling aan hangt — dat is
     wat startPlanWindow() doet als de INSERT mislukt. */
  ok('terugdraaien lukt zolang er geen bestelling aan hangt', await queueUntakeIds(env, [b.id]), 1);
  await queueRemove(env, 1, b.id);
}

console.log('\nde lijst van een ander is niet te bereiken');
{
  const mijn = await queueAdd(env, 1, { name: 'Van Mara', uploadBatch: 'b-6' });
  await queueLock(env, 1, mijn.id);
  const voor = (await saldo()).verbruikt;

  /* Klant 2 typt het id van klant 1 in het formulier. Elke query draagt
     `customer_id = ?`, dus er is niets te vinden en niets te veranderen. */
  ok('een ander kan het niet losmaken', (await queueUnlock(env, 2, mijn.id)).reden, 'niet-gevonden');
  ok('een ander kan het niet weghalen', await queueRemove(env, 2, mijn.id), false);
  ok('een ander kan het niet vastzetten', (await queueLock(env, 2, mijn.id)).reden, 'niet-gevonden');
  ok('een ander kan het niet laten oppakken', await queueTakeIds(env, 2, [mijn.id]), []);
  ok('en het saldo van de eigenaar is onaangeroerd', (await saldo()).verbruikt, voor);
  ok('zijn item staat er nog', (await loadQueue(env, 1)).some((q) => q.id === mijn.id), true);
  await queueRemove(env, 1, mijn.id);
}

console.log('\neen verzonnen betaling levert geen slots op');
{
  /* De webhook krijgt alleen een ID binnen en haalt de betaling daarna ZELF bij
     Mollie op met onze sleutel. Wie een POST verzint, verzint dus hooguit een id
     dat bij ons niets oplevert. Hier geeft de nep-Mollie een 404 terug. */
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"status":404}', { status: 404 });
  const webhookEnv = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123' };
  const voor = (await saldo()).toegekend;
  const res = await onRequestPost({
    request: new Request('https://visuails.com/api/webhook/mollie', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'id=tr_VERZONNEN0000000000000',
    }), env: webhookEnv, waitUntil() {},
  });
  ok('de webhook kent hem niet', res.status >= 400 || res.status === 200, true);
  ok('en er is niets toegekend', (await saldo()).toegekend, voor);

  /* En een POST zonder geldig id komt niet eens bij Mollie. */
  const res2 = await onRequestPost({
    request: new Request('https://visuails.com/api/webhook/mollie', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'id=<script>',
    }), env: webhookEnv, waitUntil() {},
  });
  ok('een onzin-id wordt geweigerd voordat er iets gebeurt', res2.status, 400);
  ok('en ook dan is er niets toegekend', (await saldo()).toegekend, voor);
  globalThis.fetch = echteFetch;
}

console.log('\nde adminknoppen zitten achter de adminpoort');
{
  const { adminPost } = await import('../src/lib/admin.js');
  const voor = (await saldo()).toegekend;
  /* Geen sessiecookie: de router hoort af te slaan vóór de handler. */
  const res = await adminPost({
    request: new Request('https://visuails.com/admin/customers/1/slots', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://visuails.com' },
      body: new URLSearchParams({ kind: 'complete', delta: '50', reason: 'gratis' }).toString(),
    }), env, waitUntil() {},
  });
  /* 303 naar /admin/login en NIET naar de klantpagina. Het verschil telt: een
     303 terug naar #week zou betekenen dat de handler gelopen heeft. */
  ok('zonder admin-sessie gaat het naar de inlogpagina',
    [res.status, res.headers.get('location')], [303, '/admin/login']);
  ok('en het aantal is niet gegroeid', (await saldo()).toegekend, voor);
  ok('er staat ook geen regel in het adminlogboek',
    db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE action LIKE 'plan-slots-correctie%'").get().n, 0);
}

console.log('\nde voorwaarden staan in de UPDATE zelf, niet alleen in de peiling ervoor');
{
  /* ── WAAROM DIT EEN BRONCONTROLE IS EN GEEN GEDRAGSCONTROLE ───────────────
   *
   * Gevonden op 30 augustus 2026 met een mutatieronde: draai de drie
   * voorwaarden hieronder uit de SQL en ALLE 81 suites blijven groen. Dat is
   * geen tekort van die suites — het is de aard van wat hier beschermd wordt.
   * Boven elke UPDATE staat een SELECT die hetzelfde nagaat, dus in één draad
   * gedraagt de code zich identiek. Het verschil bestaat alleen in het ogenblik
   * tussen die twee stappen, en dat ogenblik is met een test niet na te bootsen
   * zonder de database te laten wachten.
   *
   * Dus wordt hier vastgelegd waar de voorwaarde STAAT. Haalt iemand hem later
   * weg omdat "de SELECT hierboven het al doet" — precies de redenering die het
   * gat de eerste keer maakte — dan valt dit om en staat in de naam waarom.
   *
   * Het commentaar gaat er eerst af: de reden dat deze regels er staan, staat
   * in dat commentaar beschreven, en een test die daarop matcht toetst of
   * iemand het heeft opgeschreven in plaats van of het er staat. Dat is in dit
   * project al acht keer misgegaan. */
  const zonderUitleg = (t) => t
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const { readFileSync } = await import('node:fs');
  const lees = (r) => zonderUitleg(readFileSync(new URL(r, import.meta.url), 'utf8'));
  const abo = lees('../src/lib/subscription.js');
  const slt = lees('../src/lib/slots.js');
  const adm = lees('../src/lib/admin.js');

  ok('losmaken toetst taken_at in de UPDATE',
    /UPDATE plan_queue SET locked_at = NULL[\s\S]{0,200}?taken_at IS NULL/.test(abo), true);
  ok('oppakken eist dat het item vastgezet is',
    /UPDATE plan_queue[\s\S]{0,300}?taken_at IS NULL AND locked_at IS NOT NULL/.test(abo), true);
  ok('weghalen is een DELETE die teruggeeft wat hij echt weghaalde',
    /DELETE FROM plan_queue[\s\S]{0,200}?taken_at IS NULL[\s\S]{0,80}?RETURNING/.test(abo), true);
  ok('verbruiken kan in de database niet over het toegekende heen',
    /UPDATE subscription_slots SET used = used \+ \?4[\s\S]{0,200}?used \+ \?4 <= granted/.test(slt), true);
  ok('teruggeven kan niet onder nul',
    /UPDATE subscription_slots SET used = used - \?4[\s\S]{0,200}?used >= \?4/.test(slt), true);
  ok('de adminbijstelling kan niet onder het verbruik zakken',
    /UPDATE subscription_slots SET granted = granted \+ \?4[\s\S]{0,240}?granted \+ \?4 >= used/.test(adm), true);
  ok('en niet onder nul',
    /UPDATE subscription_slots SET granted = granted \+ \?4[\s\S]{0,280}?granted \+ \?4 >= 0/.test(adm), true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
