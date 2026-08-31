/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE HELE ABONNEMENTSKETEN, IN ÉÉN DOORLOOP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 30 augustus 2026: *"controleren of alles werkend is omdat dit nogal
 * veel back end vereist en het misschien zo om kan vallen."*
 *
 * De losse toetsen bestaan al en zijn groen: slots.test.mjs kent de rekensom,
 * plan-start.test.mjs kent de knop in /admin, plan-queue-cron.test.mjs kent de
 * nachtelijke taak. Wat geen van drieën doet is de keten ACHTER ELKAAR aflopen —
 * en dat is precies waar dit soort systemen omvalt. Elke schakel klopt, en tussen
 * twee schakels zit een aanname die niemand heeft opgeschreven.
 *
 * Dus: één klant, één echte database, en de hele reis in de volgorde waarin hij
 * gebeurt.
 *
 *    1 · Mollie schrijft af      → maand toegekend, slots per soort toegekend
 *    2 · Mollie levert nog eens  → geen tweede toekenning, geen dubbele slots
 *    3 · De klant zet vast       → er gaat een slot af
 *    4 · Lucas start de week     → bestelling, en er gaat NIETS extra af
 *    5 · Lucas annuleert         → slots terug, producten terug als concept
 *    6 · Een maand later         → nieuwe toekenning naast de oude
 *    7 · De incasso mislukt      → gepauzeerd, en vastzetten kan niet meer
 *    8 · De incasso lukt alsnog  → weer actief, en vastzetten kan weer
 *    9 · De klant zegt op        → betaalde maand nog opmaken, niets doorschuiven
 *
 * ── WAT DEZE TOETS SPECIFIEK VINDT ──────────────────────────────────────────
 *
 * De naden. Stap 2 is er omdat een webhook per definitie twee keer aankomt.
 * Stap 4 is er omdat het slot bij het VASTZETTEN afgaat en niet bij het maken —
 * die twee stonden ooit allebei aan en dan betaalt de klant dubbel. Stap 8 is er
 * omdat "de pauze wordt opgeheven" en "de slots worden toegekend" twee losse
 * regels zijn in dezelfde functie, en de eerste die omvalt maakt de tweede
 * onbereikbaar.
 *
 * ── DE ECHTE WEBHOOK EN NIET EEN NABOOTSING ─────────────────────────────────
 *
 * functions/api/webhook/mollie.js wordt hier geïmporteerd zoals hij gedeployed
 * wordt. Alleen `fetch` naar Mollie is gestubd — dat is de buitenwereld, en de
 * rest is van ons.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { onRequestPost } from '../functions/api/webhook/mollie.js';
import {
  createSubscriptionRow, activateSubscription, pauseSubscription, cancelSubscription,
  queueAdd, queueLock, monthKey,
} from '../src/lib/subscription.js';
import { slotBalans, vensterVoor, monthMinus } from '../src/lib/slots.js';
import { startPlanWindow } from '../src/lib/planStart.js';
import { PLAN_SLOTS } from '../src/data/pricing.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(60)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }

db.exec("INSERT INTO customers (id, email, name, brand) VALUES (1, 'mara@volt.test', 'Mara', 'VOLT')");
const { row: sub } = await createSubscriptionRow(env0(), { customerId: 1, planId: 'studio', termId: 'monthly', windowDay: 8 });
function env0() { return { DB: d1(db) }; }
await activateSubscription(env0(), sub.id);
db.prepare("UPDATE subscriptions SET mollie_subscription_id = 'sub_TEST01' WHERE id = ?").run(sub.id);

const DEZE = monthKey();
const VORIGE = monthMinus(DEZE, 1);
const BUNDEL = PLAN_SLOTS.studio;
const SOORTEN = Object.keys(BUNDEL);

/* ── DE WEBHOOK, MET ALLEEN DE BUITENWERELD GESTUBD ───────────────────────────
   Mollie's API geeft de betaling terug; alles daarna is onze eigen code op onze
   eigen database. De `paidAt` bepaalt bij welke MAAND de termijn hoort — uit de
   betaaldatum en niet uit datetime('now'), zodat een aflevering die een dag
   later binnenkomt niet in de verkeerde maand landt. */
const echteFetch = globalThis.fetch;
let betaling = null;
globalThis.fetch = async (url) => {
  if (String(url).includes('api.mollie.com')) {
    return new Response(JSON.stringify(betaling), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('{}', { status: 200 });
};

const env = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: '', FROM_EMAIL: 'x@y.z', NOTIFY_EMAIL: 'a@b.c' };

async function incasso(id, maand, status = 'paid') {
  betaling = {
    resource: 'payment', id, mode: 'test',
    createdAt: `${maand}-01T10:00:00+00:00`,
    paidAt: status === 'paid' ? `${maand}-01T10:01:00+00:00` : undefined,
    amount: { value: '790.00', currency: 'EUR' },
    description: 'VISUAILS Studio', method: 'directdebit',
    sequenceType: 'recurring', status,
    customerId: 'cst_1', mandateId: 'mdt_1', subscriptionId: 'sub_TEST01',
  };
  return onRequestPost({
    request: new Request('https://visuails.com/api/webhook/mollie', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `id=${encodeURIComponent(id)}`,
    }),
    env, waitUntil() {},
  });
}

const saldo = async (kind = 'complete', venster = 1) =>
  (await slotBalans(env, sub.id, venster)).find((b) => b.kind === kind) || { saldo: 0, verbruikt: 0, toegekend: 0, ouder: 0 };

console.log('1 · Mollie schrijft af');
{
  const res = await incasso('tr_MAAND1', DEZE);
  ok('de webhook geeft 200 terug', res.status, 200);
  ok('de betaling is vastgelegd',
    db.prepare('SELECT COUNT(*) AS n FROM subscription_payments WHERE subscription_id = ?').get(sub.id).n, 1);
  ok('de maand is toegekend',
    db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?').get(sub.id).n, 1);
  /* En dit is de schakel die er sinds migratie 0035 bij zit. Hij liep tot vandaag
     in geen enkele toets over de ECHTE webhook — alleen over grantSlots() los. */
  ok('er staat een slotrij per soort uit het plan',
    db.prepare('SELECT COUNT(*) AS n FROM subscription_slots WHERE subscription_id = ?').get(sub.id).n, SOORTEN.length);
  for (const k of SOORTEN) {
    ok(`  ${k}: ${BUNDEL[k]} toegekend`, (await saldo(k)).toegekend, BUNDEL[k]);
  }
}

console.log('\n2 · Mollie levert dezelfde betaling nog een keer');
{
  const res = await incasso('tr_MAAND1', DEZE);
  ok('nog steeds 200 — Mollie moet stoppen met proberen', res.status, 200);
  ok('en er is geen tweede maand bijgekomen',
    db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?').get(sub.id).n, 1);
  ok('en geen tweede slotrij', (await saldo()).toegekend, BUNDEL.complete);
  ok('en geen tweede betaalrij',
    db.prepare('SELECT COUNT(*) AS n FROM subscription_payments WHERE subscription_id = ?').get(sub.id).n, 1);
}

console.log('\n2b · en als de slots ontbraken, zet een herhaling ze alsnog neer');
{
  /* DE ZELFHERSTELREGEL VAN 30 AUGUSTUS. De maandrij schrijven en de slots
     schrijven zijn twee handelingen; valt de tweede om, dan keerde de webhook bij
     de volgende aflevering terug op de maandrij en kwamen de slots er nooit.
     Betaald, toegekend, en een scherm dat nul zegt.

     Hier wordt die toestand nagebootst door de slots weg te halen en Mollie
     opnieuw te laten afleveren. */
  db.prepare('DELETE FROM subscription_slots WHERE subscription_id = ?').run(sub.id);
  ok('de slots zijn weg', (await saldo()).toegekend, 0);
  await incasso('tr_MAAND1', DEZE);
  ok('de herhaling zet ze terug', (await saldo()).toegekend, BUNDEL.complete);
  ok('en nog steeds precies één maandrij',
    db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?').get(sub.id).n, 1);
}

console.log('\n3 · de klant zet twee producten vast');
let a1; let a2;
{
  a1 = await queueAdd(env, 1, { name: 'Winterjas, zwart', uploadBatch: 'b-1' });
  a2 = await queueAdd(env, 1, { name: 'Cargobroek, sand', uploadBatch: 'b-2' });
  const c = await queueAdd(env, 1, { name: 'Sjaal zonder beeld', uploadBatch: '' });

  ok('een concept kost nog niets', (await saldo()).verbruikt, 0);
  ok('vastzetten lukt', [(await queueLock(env, 1, a1.id)).ok, (await queueLock(env, 1, a2.id)).ok], [true, true]);
  ok('en kost twee slots', (await saldo()).verbruikt, 2);
  ok('zonder foto’s kan het niet', (await queueLock(env, 1, c.id)).reden, 'geen-fotos');
  ok('een soort die het plan niet geeft ook niet',
    (await queueLock(env, 1, (await queueAdd(env, 1, { name: 'Hook', uploadBatch: 'b-h', kind: 'hooks' })).id)).reden, 'geen-slot');
}

console.log('\n4 · Lucas start de week');
let week;
{
  week = await startPlanWindow(env, 1);
  ok('er ontstaat een bestelling', [week.ok, week.aantal], [true, 2]);
  ok('zonder bedrag en op payment_status plan',
    db.prepare('SELECT total_cents, payment_status FROM orders WHERE id = ?').get(week.orderId),
    { total_cents: 0, payment_status: 'plan' });
  /* DE NAAD DIE HET DUURST IS. Ging hier ook nog een slot af, dan betaalt de
     klant twee keer voor hetzelfde product en ziet niemand het. */
  ok('en er gaat NIETS extra af', (await saldo()).verbruikt, 2);
  ok('de concepten staan er nog',
    db.prepare('SELECT COUNT(*) AS n FROM plan_queue WHERE taken_at IS NULL').get().n, 2);
}

console.log('\n5 · Lucas annuleert die week weer');
{
  const { adminGet, adminPost } = await import('../src/lib/admin.js');
  const { mintToken, hashToken } = await import('../src/lib/token.js');
  const token = await mintToken();
  db.prepare("INSERT INTO admin_users (email, password_hash) VALUES ('lucas@visuails.com', 'x')").run();
  const adminId = db.prepare('SELECT id FROM admin_users ORDER BY id DESC LIMIT 1').get().id;
  db.prepare("INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 day'))")
    .run(adminId, await hashToken(token));
  const kop = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };

  const res = await adminPost({
    request: new Request(`https://visuails.com/admin/orders/${week.orderId}/cancel`, {
      method: 'POST', headers: { ...kop, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ reason: 'Merk stopt met de lijn.' }).toString(),
    }), env, waitUntil() {},
  });
  ok('de annulering gaat door', res.status, 303);
  ok('de slots zijn terug', (await saldo()).verbruikt, 0);
  ok('en de producten staan weer op de lijst, als concept',
    db.prepare('SELECT COUNT(*) AS n FROM plan_queue WHERE id IN (?, ?) AND locked_at IS NULL AND taken_at IS NULL')
      .get(a1.id, a2.id).n, 2);

  const paneel = await adminGet({
    request: new Request('https://visuails.com/admin/customers/1', { headers: kop }), env, waitUntil() {},
  }).then((r) => r.text());
  ok('het adminpaneel toont het saldo per soort', /Complete bundel/.test(paneel), true);
  globalThis.__kop = kop;
}

console.log('\n6 · een maand later komt er een nieuwe termijn bij');
{
  /* De vorige maand terugdateren in plaats van de klok vooruitzetten: dat is
     dezelfde toestand en het maakt de toets niet afhankelijk van wanneer hij
     draait. */
  db.prepare('UPDATE subscription_slots SET month = ? WHERE subscription_id = ?').run(VORIGE, sub.id);
  db.prepare('UPDATE subscription_months SET month = ? WHERE subscription_id = ?').run(VORIGE, sub.id);
  await incasso('tr_MAAND2', DEZE);

  const b = await saldo();
  ok('deze maand en vorige tellen samen', b.toegekend, BUNDEL.complete * 2);
  ok('en de helft daarvan is doorgeschoven', b.ouder, BUNDEL.complete);
  ok('twee maanden is ook het dak', b.saldo, BUNDEL.complete * 2);

  /* En het afschrijven begint bij de OUDSTE maand. Zou het bij de nieuwste
     beginnen, dan lijkt alles te werken tot er slots vervallen die de klant nog
     had kunnen gebruiken — en dat merk je pas als hij belt. */
  await queueLock(env, 1, a1.id);
  const vorigeMaand = db.prepare('SELECT used FROM subscription_slots WHERE subscription_id = ? AND month = ? AND kind = ?')
    .get(sub.id, VORIGE, 'complete').used;
  ok('en de oudste maand gaat er als eerste af', vorigeMaand, 1);
}

console.log('\n7 · de incasso mislukt');
{
  await pauseSubscription(env, sub.id, 'payment_failed');
  ok('het abonnement staat op pauze',
    db.prepare('SELECT status, pause_reason FROM subscriptions WHERE id = ?').get(sub.id),
    { status: 'paused', pause_reason: 'payment_failed' });
  ok('vastzetten kan niet meer', (await queueLock(env, 1, a2.id)).reden, 'abonnement-paused');
  ok('en de week starten ook niet', (await startPlanWindow(env, 1)).reden, 'abonnement-paused');
  ok('het saldo blijft ongemoeid staan voor als hij terugkomt', (await saldo()).verbruikt, 1);
}

console.log('\n8 · en lukt daarna alsnog');
{
  await incasso('tr_MAAND3', DEZE);
  ok('de pauze is opgeheven',
    db.prepare('SELECT status FROM subscriptions WHERE id = ?').get(sub.id).status, 'active');
  ok('en vastzetten kan weer', (await queueLock(env, 1, a2.id)).ok, true);
}

console.log('\n9 · de klant zegt op');
{
  await cancelSubscription(env, sub.id);
  const opgezegd = db.prepare('SELECT status, term FROM subscriptions WHERE id = ?').get(sub.id);
  ok('de status staat op opgezegd', opgezegd.status, 'cancelled');

  /* Lucas' eigen regel: de betaalde maand mag hij nog opmaken, maar er is geen
     volgende maand om iets naar door te schuiven. */
  ok('het doorschuifvenster is nul', vensterVoor(opgezegd), 0);
  const bAlleenDeze = await saldo('complete', 0);
  ok('alleen deze maand telt nog mee', bAlleenDeze.toegekend, BUNDEL.complete);
  ok('en er staat niets doorgeschovens meer bij', bAlleenDeze.ouder, 0);

  const q = await queueAdd(env, 1, { name: 'Laatste jas', uploadBatch: 'b-op' });
  ok('vastzetten mag nog, want hij heeft ervoor betaald', (await queueLock(env, 1, q.id)).ok, true);
}

globalThis.fetch = echteFetch;
console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
