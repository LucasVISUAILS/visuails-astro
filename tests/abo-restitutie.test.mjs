/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * GELD TERUG OP EEN ABONNEMENT IS GEEN BETALING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gevonden op 17 september 2026, bij een gerichte doorlichting van de backend.
 *
 * De poort bovenaan mollie.js laat `refunded` met opzet door — dat is nodig voor
 * bestellingen, waar de restitutie verderop wordt verrekend. Voor een ABONNEMENT
 * ging diezelfde betaling rechtstreeks naar recordSubscriptionPaid(), die
 * `amountRefunded` nooit las. Uitkomst bij een teruggeboekte termijn:
 *
 *   · de rij in subscription_payments stond op 'paid'
 *   · de maand werd toegekend, met alle slots erin
 *   · een pauze wegens een mislukte incasso werd OPGEHEVEN
 *   · en de factuur bleef staan voor het volle bedrag
 *
 * Geld terug, dienst blijft.
 *
 * ── WAT DEZE TOETS BEWAAKT ──────────────────────────────────────────────────
 *
 * Niet de rekensom maar de AFSLAG: dat een restitutie een andere weg neemt dan
 * een incasso, en dat die weg vóór de toekenning ligt en niet erna. De echte
 * webhook draait op een echte database; alleen Mollie zelf is gestubd.
 *
 * De laatste sectie is er omdat een restitutie die later binnenkomt de
 * gevaarlijkste is: de maand staat er dan al, en de verleiding is hem in te
 * trekken. Dat gebeurt met opzet niet — zie de kop van
 * notifySubscriptionRefunded() in src/lib/notify.js.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { onRequestPost } from '../functions/api/webhook/mollie.js';
import { createSubscriptionRow, activateSubscription } from '../src/lib/subscription.js';
import { monthKey, subMaandBruto } from '../src/lib/slots.js';

/* Het brutobedrag van een Studio-maand, afgeleid. De webhook toetst sinds
   17 september of een betaling een hele termijn dekt; een ingetypt bedrag zou
   deze toetsen laten slagen om de verkeerde reden. */
const TERMIJN = (subMaandBruto({ plan: 'studio', term: 'monthly' }) / 100).toFixed(2);

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(64)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }
const env = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: '', FROM_EMAIL: 'x@y.z', NOTIFY_EMAIL: 'a@b.c' };

db.exec("INSERT INTO customers (id, email, name, brand) VALUES (1, 'refund@volt.test', 'Mara', 'VOLT')");
const { row: sub } = await createSubscriptionRow(env, { customerId: 1, planId: 'studio', termId: 'monthly', windowDay: 8 });
await activateSubscription(env, sub.id);
db.prepare("UPDATE subscriptions SET mollie_subscription_id = 'sub_TEST01' WHERE id = ?").run(sub.id);

const MAAND = monthKey();
let betaling = null;
globalThis.fetch = async (url) => (String(url).includes('api.mollie.com')
  ? new Response(JSON.stringify(betaling), { status: 200, headers: { 'content-type': 'application/json' } })
  : new Response('{}', { status: 200 }));

/* Console stil: de webhook logt een luide foutregel bij een restitutie, en dat
   is precies de bedoeling — maar niet in de uitvoer van een toets. */
const echt = { log: console.log, warn: console.warn, error: console.error };
const mute = () => { console.warn = console.error = () => {}; };
const unmute = () => Object.assign(console, echt);

async function webhook(id, { status = 'paid', terug = null } = {}) {
  betaling = {
    resource: 'payment', id, mode: 'test',
    createdAt: `${MAAND}-01T10:00:00+00:00`,
    paidAt: `${MAAND}-01T10:01:00+00:00`,
    amount: { value: TERMIJN, currency: 'EUR' },
    ...(terug ? { amountRefunded: { value: terug, currency: 'EUR' } } : {}),
    description: 'VISUAILS Studio', method: 'directdebit',
    sequenceType: 'recurring', status,
    customerId: 'cst_1', mandateId: 'mdt_1', subscriptionId: 'sub_TEST01',
  };
  mute();
  try {
    return await onRequestPost({
      request: new Request('https://visuails.com/api/webhook/mollie', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: `id=${encodeURIComponent(id)}`,
      }),
      env, waitUntil() {},
    });
  } finally { unmute(); }
}

/* Eén Mollie-kenmerk, en het wijst steeds naar het abonnement dat aan de beurt
   is. De betaling in de stub draagt `subscriptionId: 'sub_TEST01'` en de webhook
   zoekt het abonnement op precies dat veld; twee rijen met hetzelfde kenmerk zou
   de verkeerde kunnen vinden. Vandaar: eerst overal weg, dan op één zetten. */
function richtMollieOp(id) {
  db.prepare("UPDATE subscriptions SET mollie_subscription_id = NULL WHERE mollie_subscription_id = 'sub_TEST01'").run();
  db.prepare("UPDATE subscriptions SET mollie_subscription_id = 'sub_TEST01' WHERE id = ?").run(id);
}

const maanden = () => db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?').get(sub.id).n;
const slots = () => db.prepare('SELECT COUNT(*) AS n FROM subscription_slots WHERE subscription_id = ?').get(sub.id).n;
const betaalrij = (id) => db.prepare('SELECT status, amount_cents, refunded_cents FROM subscription_payments WHERE external_id = ?').get(id);
const abo = () => db.prepare('SELECT status, pause_reason FROM subscriptions WHERE id = ?').get(sub.id);

console.log('\neen volledige restitutie kent geen maand toe');
{
  const res = await webhook('tr_TERUG1', { status: 'refunded', terug: TERMIJN });
  ok('de webhook geeft 200 terug', res.status, 200);
  ok('geen maand toegekend', maanden(), 0);
  ok('en geen enkele slotrij', slots(), 0);
  const r = betaalrij('tr_TERUG1');
  ok('de betaling staat er wél, als refunded', r?.status, 'refunded');
  ok('met het teruggeboekte bedrag erop', r?.refunded_cents, Math.round(Number(TERMIJN) * 100));
  ok('en het abonnement staat op pauze', abo().status, 'paused');
  ok('met een eigen reden, niet payment_failed', abo().pause_reason, 'refunded');
}

console.log('\neen gedeeltelijke restitutie laat het abonnement lopen');
let s2;
{
  /* Eerst een nieuw, schoon abonnement: het vorige staat nu gepauzeerd. Het
     Mollie-kenmerk verhuist ernaartoe, want de betaling in de stub draagt er
     één en de webhook zoekt het abonnement dáárop. */
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (2, 'deel@volt.test', 'Deel', 'DEEL')");
  ({ row: s2 } = await createSubscriptionRow(env, { customerId: 2, planId: 'studio', termId: 'monthly', windowDay: 8 }));
  await activateSubscription(env, s2.id);
  richtMollieOp(s2.id);

  const res = await webhook('tr_TERUG2', { status: 'paid', terug: '100.00' });
  ok('de webhook geeft 200 terug', res.status, 200);
  const n = db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?').get(s2.id).n;
  ok('ook hier geen maand toegekend', n, 0);
  const r = betaalrij('tr_TERUG2');
  ok('het deelbedrag staat erop', r?.refunded_cents, 10000);
  const a2 = db.prepare('SELECT status, pause_reason FROM subscriptions WHERE id = ?').get(s2.id);
  ok('en het abonnement loopt door', a2.status, 'active');
  ok('zonder pauzereden', a2.pause_reason, null);
}

console.log('\neen restitutie op een al toegekende maand trekt die niet in');
{
  /* Derde abonnement: eerst een gewone incasso, dan dezelfde betaling terug. */
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (3, 'later@volt.test', 'Later', 'LATER')");
  const { row: s3 } = await createSubscriptionRow(env, { customerId: 3, planId: 'studio', termId: 'monthly', windowDay: 8 });
  await activateSubscription(env, s3.id);
  richtMollieOp(s3.id);

  await webhook('tr_LATER', { status: 'paid' });
  const na1 = db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?').get(s3.id).n;
  ok('de incasso kent gewoon een maand toe', na1, 1);
  const slots1 = db.prepare('SELECT COUNT(*) AS n FROM subscription_slots WHERE subscription_id = ?').get(s3.id).n;
  ok('met slots erbij', slots1 > 0, true);

  /* En nu komt het geld terug op diezelfde betaling. */
  await webhook('tr_LATER', { status: 'refunded', terug: TERMIJN });
  ok('de maand blijft staan — die kan half besteed zijn',
    db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?').get(s3.id).n, na1);
  ok('en de slots ook',
    db.prepare('SELECT COUNT(*) AS n FROM subscription_slots WHERE subscription_id = ?').get(s3.id).n, slots1);
  ok('de restitutie is wél vastgelegd', betaalrij('tr_LATER')?.refunded_cents, Math.round(Number(TERMIJN) * 100));
  ok('en er komt geen volgende maand bij: gepauzeerd',
    db.prepare('SELECT status FROM subscriptions WHERE id = ?').get(s3.id).status, 'paused');
}

console.log('\nen een gewone incasso is niet geraakt');
{
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (4, 'gewoon@volt.test', 'Gewoon', 'GEWOON')");
  const { row: s4 } = await createSubscriptionRow(env, { customerId: 4, planId: 'studio', termId: 'monthly', windowDay: 8 });
  await activateSubscription(env, s4.id);
  richtMollieOp(s4.id);

  await webhook('tr_GEWOON', { status: 'paid' });
  ok('maand toegekend', db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?').get(s4.id).n, 1);
  ok('niets teruggeboekt', betaalrij('tr_GEWOON')?.refunded_cents, 0);
  ok('en het abonnement loopt', db.prepare('SELECT status FROM subscriptions WHERE id = ?').get(s4.id).status, 'active');
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
