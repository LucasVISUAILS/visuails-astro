/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * SLOTS PER SOORT: DOORSCHUIVEN, OUDSTE EERST, EN TERUGGEVEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas' model, en de drie regels die het overeind houden. Deze toets bestaat
 * omdat twee ervan onzichtbaar falen:
 *
 *   · Wordt de NIEUWSTE maand eerst afgeschreven, dan lijkt alles te werken —
 *     tot er een maand voorbij is en er slots vervallen die de klant net had
 *     kunnen gebruiken. Dat merk je pas als hij belt.
 *   · Vervalt een toekenning niet, dan groeit het saldo eindeloos door en klopt
 *     het dak van twee maanden niet meer. Ook dat zie je pas maanden later.
 *
 * Vandaar een echte SQLite met het echte schema, en een klok die we zelf
 * vooruitzetten in plaats van te wachten.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import {
  grantSlots, loadSlots, slotBalans, verbruikSlot, geefSlotTerug,
  slotsFor, kindsFor, vervaltOp, monthMinus, monthKey, vensterVoor,
} from '../src/lib/slots.js';
import {
  createSubscriptionRow, activateSubscription, cancelSubscription, pauseSubscription,
  queueAdd, queueLock, queueUnlock, queueRemove, loadQueue,
} from '../src/lib/subscription.js';
import { PLAN_PRODUCTS, PLAN_CLIPS } from '../src/data/pricing.js';

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

db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'mara@volt.test', 'VOLT')");
const { row: sub } = await createSubscriptionRow(env, { customerId: 1, planId: 'studio', termId: 'monthly', windowDay: 8 });
await activateSubscription(env, sub.id);

/* Drie vaste maanden, zodat de toets niet van de kalender afhangt. */
const JUL = '2026-07', AUG = '2026-08', SEP = '2026-09';
const inAug = new Date('2026-08-15T12:00:00Z');
const inSep = new Date('2026-09-15T12:00:00Z');
const inOkt = new Date('2026-10-15T12:00:00Z');

console.log('\nde bundel komt uit het plan en niet uit een los getal');
{
  ok('studio geeft completes', slotsFor('studio').complete, PLAN_PRODUCTS.studio);
  ok('en motion-clips', slotsFor('studio')['video-motion'], PLAN_CLIPS.studio);
  ok('starter kent maar één soort', kindsFor('starter'), ['complete']);
  /* Een soort met nul hoort geen rij te krijgen — anders staat er "0 van 0" op
     het scherm voor iets wat dit plan niet verkoopt. */
  ok('starter kent geen video', 'video-motion' in slotsFor('starter'), false);
}

console.log('\nde vervaldatum volgt uit de maand, niet uit een kolom');
{
  ok('augustus met venster 1 vervalt 30 september', vervaltOp(AUG, 1), '2026-09-30');
  ok('december loopt over de jaargrens', vervaltOp('2026-12', 1), '2027-01-31');
  ok('februari 2028 is een schrikkelmaand', vervaltOp('2028-01', 1), '2028-02-29');
  ok('een venster van 0 vervalt aan het eind van de maand zelf', vervaltOp(AUG, 0), '2026-08-31');
  ok('een maand terug rekent terug over het jaar', monthMinus('2026-01', 1), '2025-12');
}

console.log('\ntoekennen is idempotent');
{
  ok('augustus toekennen zet twee soorten', await grantSlots(env, sub.id, AUG, 'studio'), 2);
  ok('nog een keer verandert niets', await grantSlots(env, sub.id, AUG, 'studio'), 0);
  const r = await loadSlots(env, sub.id, 1, inAug);
  ok('er staan twee rijen', r.length, 2);
  ok('en samen geven ze wat het plan belooft',
    r.reduce((n, x) => n + x.granted, 0), PLAN_PRODUCTS.studio + PLAN_CLIPS.studio);
}

console.log('\nin september telt augustus nog mee, in oktober niet meer');
{
  await grantSlots(env, sub.id, SEP, 'studio');
  const bSep = await slotBalans(env, sub.id, 1, inSep);
  const compleet = bSep.find((b) => b.kind === 'complete');
  ok('twee maanden completes bij elkaar', compleet.saldo, PLAN_PRODUCTS.studio * 2);
  ok('waarvan de helft van vorige maand', compleet.ouder, PLAN_PRODUCTS.studio);
  ok('met de vervaldatum erbij', compleet.vervalt[0].op, '2026-09-30');
  /* Het dak van Lucas: nooit meer dan twee maanden tegelijk. */
  await grantSlots(env, sub.id, JUL, 'studio');
  const bNog = await slotBalans(env, sub.id, 1, inSep);
  ok('juli telt in september niet mee', bNog.find((b) => b.kind === 'complete').saldo, PLAN_PRODUCTS.studio * 2);
  const bOkt = await slotBalans(env, sub.id, 1, inOkt);
  ok('en in oktober is augustus ook vervallen',
    (bOkt.find((b) => b.kind === 'complete') || { saldo: 0 }).saldo, PLAN_PRODUCTS.studio);
}

console.log('\nde oudste maand gaat er als eerste af');
{
  ok('drie completes afschrijven lukt', await verbruikSlot(env, sub.id, 1, 'complete', 3, inSep), 3);
  const r = await loadSlots(env, sub.id, 1, inSep);
  const aug = r.find((x) => x.month === AUG && x.kind === 'complete');
  const sep = r.find((x) => x.month === SEP && x.kind === 'complete');
  ok('ze komen van augustus', aug.used, 3);
  ok('en september is onaangeroerd', sep.used, 0);
}

console.log('\nover de maandgrens heen loopt hij door naar de volgende');
{
  const rest = PLAN_PRODUCTS.studio - 3;              // wat er van augustus over is
  ok(`de rest van augustus plus twee uit september`,
    await verbruikSlot(env, sub.id, 1, 'complete', rest + 2, inSep), rest + 2);
  const r = await loadSlots(env, sub.id, 1, inSep);
  ok('augustus is helemaal op', r.find((x) => x.month === AUG && x.kind === 'complete').used, PLAN_PRODUCTS.studio);
  ok('en september draagt de rest', r.find((x) => x.month === SEP && x.kind === 'complete').used, 2);
}

console.log('\nmeer willen dan er is, boekt alleen wat er is');
{
  const b = await slotBalans(env, sub.id, 1, inSep);
  const over = b.find((x) => x.kind === 'complete').saldo;
  ok('er staat nog wat', over, PLAN_PRODUCTS.studio - 2);
  ok('honderd vragen levert alleen de rest op',
    await verbruikSlot(env, sub.id, 1, 'complete', 100, inSep), over);
  ok('en daarna is het saldo nul',
    (await slotBalans(env, sub.id, 1, inSep)).find((x) => x.kind === 'complete').saldo, 0);
}

console.log('\nteruggeven gaat naar de nieuwste maand');
{
  ok('twee teruggeven lukt', await geefSlotTerug(env, sub.id, 1, 'complete', 2, inSep), 2);
  const r = await loadSlots(env, sub.id, 1, inSep);
  ok('september kreeg ze terug', r.find((x) => x.month === SEP && x.kind === 'complete').used, PLAN_PRODUCTS.studio - 2);
  ok('augustus staat nog vol', r.find((x) => x.month === AUG && x.kind === 'complete').used, PLAN_PRODUCTS.studio);
  ok('en het saldo klopt weer',
    (await slotBalans(env, sub.id, 1, inSep)).find((x) => x.kind === 'complete').saldo, 2);
}

console.log('\nde soorten raken elkaar niet');
{
  const b = await slotBalans(env, sub.id, 1, inSep);
  ok('motion is onaangeroerd door al het bovenstaande',
    b.find((x) => x.kind === 'video-motion').verbruikt, 0);
  ok('en heeft zijn eigen saldo', b.find((x) => x.kind === 'video-motion').saldo, PLAN_CLIPS.studio * 2);
  ok('een soort die het plan niet kent, kan niets afschrijven',
    await verbruikSlot(env, sub.id, 1, 'hooks', 1, inSep), 0);
}

/* ── EN DE WACHTRIJ: CONCEPT, VASTZETTEN, LOSMAKEN ────────────────────────── */
console.log('\ntoevoegen kost niets, vastzetten wel');
{
  /* VANAF HIER DE ECHTE KLOK, en dat is geen slordigheid.
     queueLock() kijkt naar `new Date()` — hij hoort te weten wat er VANDAAG nog
     geldig is en niet wat een toets hem influistert. De vaste maanden hierboven
     zaten in de toekomst ten opzichte van vandaag, en toekomstige toekenningen
     tellen terecht niet mee. Dus: het saldo leegmaken en deze maand toekennen. */
  const NU = monthKey();
  db.exec("DELETE FROM subscription_slots");
  await grantSlots(env, sub.id, NU, 'studio');

  const a = await queueAdd(env, 1, { name: 'Winterjas', uploadBatch: 'b-1', kind: 'complete' });
  ok('het item staat erop', Boolean(a), true);
  ok('als concept', a.locked_at, null);
  ok('met een soort', a.kind, 'complete');
  ok('en het saldo is niet geraakt',
    (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'complete').saldo,
    PLAN_PRODUCTS.studio);

  const v = await queueLock(env, 1, a.id);
  ok('vastzetten lukt', v.ok, true);
  ok('nu is er één slot af',
    (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'complete').saldo,
    PLAN_PRODUCTS.studio - 1);
  const na = (await loadQueue(env, 1)).find((q) => q.id === a.id);
  ok('en het item draagt een tijdstip', Boolean(na.locked_at), true);

  ok('nog een keer vastzetten kost geen tweede slot', (await queueLock(env, 1, a.id)).reden, 'stond-al-vast');
  ok('het saldo staat er nog steeds hetzelfde voor',
    (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'complete').saldo,
    PLAN_PRODUCTS.studio - 1);
}

console.log('\nzonder foto\u2019s kan er niets vastgezet worden');
{
  const b = await queueAdd(env, 1, { name: 'Cargobroek', uploadBatch: '', kind: 'complete' });
  const v = await queueLock(env, 1, b.id);
  ok('vastzetten weigert', v.ok, false);
  ok('en zegt waarom', v.reden, 'geen-fotos');
  ok('er is geen slot af',
    (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'complete').saldo,
    PLAN_PRODUCTS.studio - 1);
}

console.log('\nlosmaken geeft het slot terug, weghalen ook');
{
  const c = await queueAdd(env, 1, { name: 'Trui', uploadBatch: 'b-2', kind: 'complete' });
  await queueLock(env, 1, c.id);
  ok('twee slots weg', (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'complete').saldo, PLAN_PRODUCTS.studio - 2);
  ok('losmaken lukt', (await queueUnlock(env, 1, c.id)).ok, true);
  ok('en het slot is terug', (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'complete').saldo, PLAN_PRODUCTS.studio - 1);

  /* En weghalen van een VASTGEZET item moet hetzelfde doen — anders betaalt de
     klant voor iets wat hij zelf heeft ingetrokken. */
  await queueLock(env, 1, c.id);
  ok('weer vastgezet', (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'complete').saldo, PLAN_PRODUCTS.studio - 2);
  await queueRemove(env, 1, c.id);
  ok('weghalen geeft het slot ook terug', (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'complete').saldo, PLAN_PRODUCTS.studio - 1);
  ok('en het item is weg', (await loadQueue(env, 1)).some((q) => q.id === c.id), false);
}

console.log('\neen soort die het plan niet geeft, kan niet vastgezet worden');
{
  const d = await queueAdd(env, 1, { name: 'Hook-idee', uploadBatch: 'b-3', kind: 'hooks' });
  const v = await queueLock(env, 1, d.id);
  ok('vastzetten weigert', v.ok, false);
  ok('en noemt de reden', v.reden, 'geen-slot');
  ok('het item blijft een concept', (await loadQueue(env, 1)).find((q) => q.id === d.id).locked_at, null);
}

console.log('\nhet doorschuifvenster hangt aan de termijn EN aan de status');
/* ── DE RAND DIE LUCAS AANWEES — 29 augustus 2026 ───────────────────────────
 *
 * *"Wanneer de klant het abonnement opzegt kan hij denk ik niet de laatste
 * betaalde maand een maand nog doorschuiven omdat hij dan geen abonnement
 * heeft."*
 *
 * Precies. Doorschuiven is een belofte over volgende maand, en die is er niet
 * meer. Dit is de enige plek waar die twee dingen bij elkaar komen, dus staat de
 * toets erop: de termijn bepaalt HOEVEEL maanden, de status of er überhaupt een
 * maand is om naar door te schuiven.
 *
 * Het gaat stil mis als het fout is: een opgezegde klant ziet dan volgende maand
 * nog slots staan die hij niet kan gebruiken, of erger, hij kan ze gebruiken en
 * er is geen abonnement dat het betaalt. */
{
  ok('maandelijks schuift één maand door', vensterVoor({ term: 'monthly', status: 'active' }), 1);
  ok('jaarlijks drie', vensterVoor({ term: 'yearly', status: 'active' }), 3);
  ok('gepauzeerd houdt zijn venster — hij komt terug',
    vensterVoor({ term: 'monthly', status: 'paused' }), 1);
  ok('opgezegd schuift niets door', vensterVoor({ term: 'monthly', status: 'cancelled' }), 0);
  ok('en dat geldt ook voor een jaarcontract', vensterVoor({ term: 'yearly', status: 'cancelled' }), 0);
  ok('geen abonnement is ook geen venster', vensterVoor(null), 0);
}

console.log('\nopzeggen: de betaalde maand mag nog op, de vorige maand niet meer');
{
  /* Een eigen klant met een eigen abonnement, want deze zeggen we op en dat is
     onomkeerbaar — hem op de klant hierboven doen zou alles erna vergiftigen. */
  db.exec("INSERT INTO customers (id, email, brand) VALUES (2, 'nina@stop.test', 'STOP')");
  const { row: s2 } = await createSubscriptionRow(env, { customerId: 2, planId: 'starter', termId: 'monthly', windowDay: 8 });
  await activateSubscription(env, s2.id);
  await grantSlots(env, s2.id, AUG, 'starter');
  await grantSlots(env, s2.id, SEP, 'starter');

  const lopend = await slotBalans(env, s2.id, vensterVoor({ term: 'monthly', status: 'active' }), inSep);
  ok('lopend telt augustus en september samen',
    lopend.find((b) => b.kind === 'complete').saldo, PLAN_PRODUCTS.starter * 2);

  await cancelSubscription(env, s2.id);
  const na = await slotBalans(env, s2.id, vensterVoor({ term: 'monthly', status: 'cancelled' }), inSep);
  ok('na opzeggen blijft alleen september staan',
    na.find((b) => b.kind === 'complete').saldo, PLAN_PRODUCTS.starter);
  ok('en er staat niets doorgeschovens meer bij', na.find((b) => b.kind === 'complete').ouder, 0);

  /* En het mag ook echt niet meer besteed worden: verbruikSlot leest hetzelfde
     venster, dus meer dan één maand vragen kan hij niet meer opmaken. */
  const kon = await verbruikSlot(env, s2.id, vensterVoor({ term: 'monthly', status: 'cancelled' }),
    'complete', PLAN_PRODUCTS.starter + 1, inSep);
  ok('en hij kan niet meer dan zijn laatste maand opmaken', kon, PLAN_PRODUCTS.starter);

  /* De klantkant: vastzetten mag nog zolang de opgezegde maand loopt. Dat is de
     andere helft van Lucas' zin — hij heeft ervoor betaald.

     DE MAANDRIJ HOORT ERBIJ EN IS GEEN OPVULLING. loadSubscription() geeft een
     opgezegd abonnement alleen terug als er een rij in subscription_months staat
     voor DEZE maand — dat is zijn bewijs dat er betaald is, zie de noot daar. In
     productie zet de Mollie-webhook die rij en de slots in dezelfde handeling
     neer; een toets die alleen de slots zet, toetst een toestand die niet
     bestaat. */
  db.prepare('INSERT INTO subscription_months (subscription_id, month, granted, used) VALUES (?, ?, ?, 0)')
    .run(s2.id, monthKey(), PLAN_PRODUCTS.starter);
  await grantSlots(env, s2.id, monthKey(), 'starter');
  await geefSlotTerug(env, s2.id, 0, 'complete', PLAN_PRODUCTS.starter, inSep);
  const q = await queueAdd(env, 2, { name: 'Laatste jas', uploadBatch: 'b-op' });
  const v = await queueLock(env, 2, q.id);
  ok('vastzetten mag nog na opzeggen', v.ok, true);
}

console.log('\neen gepauzeerd abonnement kan niets vastzetten');
{
  db.exec("INSERT INTO customers (id, email, brand) VALUES (3, 'ruth@pauze.test', 'PAUZE')");
  const { row: s3 } = await createSubscriptionRow(env, { customerId: 3, planId: 'starter', termId: 'monthly', windowDay: 8 });
  await activateSubscription(env, s3.id);
  await grantSlots(env, s3.id, monthKey(), 'starter');
  await pauseSubscription(env, s3.id, 'payment_failed');
  const q = await queueAdd(env, 3, { name: 'Jas in de wacht', uploadBatch: 'b-p' });
  const v = await queueLock(env, 3, q.id);
  ok('vastzetten weigert', v.ok, false);
  ok('met de status in de reden', v.reden, 'abonnement-paused');
  ok('en het slot staat er nog',
    (await slotBalans(env, s3.id, 1)).find((b) => b.kind === 'complete').saldo, PLAN_PRODUCTS.starter);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
