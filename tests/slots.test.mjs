/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CREDITS: DOORSCHUIVEN, OUDSTE EERST, EN TERUGGEVEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas' model, en de drie regels die het overeind houden. Deze toets bestaat
 * omdat twee ervan onzichtbaar falen:
 *
 *   · Wordt de NIEUWSTE maand eerst afgeschreven, dan lijkt alles te werken —
 *     tot er een maand voorbij is en er credits vervallen die de klant net had
 *     kunnen gebruiken. Dat merk je pas als hij belt.
 *
 * SINDS 19 SEPTEMBER 2026 IS DE EENHEID EEN CREDIT en niet meer een slot per
 * soort — zie de kop bij CREDIT_KIND in slots.js. De drie regels die deze toets
 * bewaakt zijn woordelijk dezelfde gebleven; alleen wat er afgeschreven wordt
 * heeft een andere naam en een fijnere korrel.
 *   · Vervalt een toekenning niet, dan groeit het saldo eindeloos door en klopt
 *     het dak van twee maanden niet meer. Ook dat zie je pas maanden later.
 *
 * Vandaar een echte SQLite met het echte schema, en een klok die we zelf
 * vooruitzetten in plaats van te wachten.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import {
  grantSlots, loadSlots, slotBalans, verbruikSlot, geefSlotTerug, creditsPerSoort, creditsVoor,
  slotsFor, kindsFor, vervaltOp, monthMinus, monthKey, vensterVoor,
  verbruikCredits, geefCreditsTerug, slotToegestaan,
} from '../src/lib/slots.js';
import {
  createSubscriptionRow, activateSubscription, cancelSubscription, pauseSubscription,
  loadSubscription,
} from '../src/lib/subscription.js';
import { PLAN_PRODUCTS, PLAN_CLIPS, PLAN_CREDITS } from '../src/data/pricing.js';

/* De prijs van een catalogset, uit de tabel zelf — een 4 in deze toets zou de
   dag dat pricing.js verandert stil verkeerd worden. */
const CAT = creditsPerSoort('catalog');

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
/* Hier en bij klant 2 en 3 stond zetLook(): queueLock() weigerde zonder vaste
   look. Die is weg (levering 69, 5 november 2026), en niets hieronder leest de look. */
const { row: sub } = await createSubscriptionRow(env, { customerId: 1, planId: 'studio', termId: 'monthly', windowDay: 8 });
await activateSubscription(env, sub.id);

/* Drie vaste maanden, zodat de toets niet van de kalender afhangt. */
const JUL = '2026-07', AUG = '2026-08', SEP = '2026-09';
const inAug = new Date('2026-08-15T12:00:00Z');
const inSep = new Date('2026-09-15T12:00:00Z');
const inOkt = new Date('2026-10-15T12:00:00Z');

console.log('\nde bundel komt uit het plan en niet uit een los getal');
{
  /* slotsFor() blijft de OUDE bundel teruggeven — die staat nog in PLAN_SLOTS en
     wordt gelezen door /admin voor rijen van vóór de credits. Wat een abonnee
     vandaag krijgt, is creditsVoor(). */
  /* 'catalog' sinds 14 oktober 2026: compleet bestaat niet meer (afvinklijst 23). */
  ok('studio geeft catalogproducten', slotsFor('studio').catalog, PLAN_PRODUCTS.studio);
  ok('en geen completes meer', 'complete' in slotsFor('studio'), false);
  ok('en in credits is dat het plan', creditsVoor({ plan: 'studio' }), PLAN_CREDITS.studio);
  ok('en motion-clips', slotsFor('studio')['video-motion'], PLAN_CLIPS.studio);
  ok('starter kent maar één soort', kindsFor('starter'), ['catalog']);
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
  ok('augustus toekennen zet één creditrij', await grantSlots(env, sub.id, AUG, 'studio'), 1);
  ok('nog een keer verandert niets', await grantSlots(env, sub.id, AUG, 'studio'), 0);
  const r = await loadSlots(env, sub.id, 1, inAug);
  ok('er staat één creditrij', r.length, 1);
  ok('en samen geven ze wat het plan belooft',
    r.reduce((n, x) => n + x.granted, 0), PLAN_CREDITS.studio);
}

console.log('\nin september telt augustus nog mee, in oktober niet meer');
{
  await grantSlots(env, sub.id, SEP, 'studio');
  const bSep = await slotBalans(env, sub.id, 1, inSep);
  const compleet = bSep.find((b) => b.kind === 'credits');
  ok('twee maanden credits bij elkaar', compleet.saldo, PLAN_CREDITS.studio * 2);
  ok('waarvan de helft van vorige maand', compleet.ouder, PLAN_CREDITS.studio);
  ok('met de vervaldatum erbij', compleet.vervalt[0].op, '2026-09-30');
  /* Het dak van Lucas: nooit meer dan twee maanden tegelijk. */
  await grantSlots(env, sub.id, JUL, 'studio');
  const bNog = await slotBalans(env, sub.id, 1, inSep);
  ok('juli telt in september niet mee', bNog.find((b) => b.kind === 'credits').saldo, PLAN_CREDITS.studio * 2);
  const bOkt = await slotBalans(env, sub.id, 1, inOkt);
  ok('en in oktober is augustus ook vervallen',
    (bOkt.find((b) => b.kind === 'credits') || { saldo: 0 }).saldo, PLAN_CREDITS.studio);
}

console.log('\nde oudste maand gaat er als eerste af');
{
  ok('drie credits afschrijven lukt', await verbruikSlot(env, sub.id, 1, 'credits', 3, inSep), 3);
  const r = await loadSlots(env, sub.id, 1, inSep);
  const aug = r.find((x) => x.month === AUG && x.kind === 'credits');
  const sep = r.find((x) => x.month === SEP && x.kind === 'credits');
  ok('ze komen van augustus', aug.used, 3);
  ok('en september is onaangeroerd', sep.used, 0);
}

console.log('\nover de maandgrens heen loopt hij door naar de volgende');
{
  const rest = PLAN_CREDITS.studio - 3;              // wat er van augustus over is
  ok(`de rest van augustus plus twee uit september`,
    await verbruikSlot(env, sub.id, 1, 'credits', rest + 2, inSep), rest + 2);
  const r = await loadSlots(env, sub.id, 1, inSep);
  ok('augustus is helemaal op', r.find((x) => x.month === AUG && x.kind === 'credits').used, PLAN_CREDITS.studio);
  ok('en september draagt de rest', r.find((x) => x.month === SEP && x.kind === 'credits').used, 2);
}

console.log('\nmeer willen dan er is, boekt alleen wat er is');
{
  const b = await slotBalans(env, sub.id, 1, inSep);
  const over = b.find((x) => x.kind === 'credits').saldo;
  ok('er staat nog wat', over, PLAN_CREDITS.studio - 2);
  ok('duizend vragen levert alleen de rest op',
    await verbruikSlot(env, sub.id, 1, 'credits', 1000, inSep), over);
  ok('en daarna is het saldo nul',
    (await slotBalans(env, sub.id, 1, inSep)).find((x) => x.kind === 'credits').saldo, 0);
}

console.log('\nteruggeven gaat naar de nieuwste maand');
{
  ok('twee teruggeven lukt', await geefSlotTerug(env, sub.id, 1, 'credits', 2, inSep), 2);
  const r = await loadSlots(env, sub.id, 1, inSep);
  ok('september kreeg ze terug', r.find((x) => x.month === SEP && x.kind === 'credits').used, PLAN_CREDITS.studio - 2);
  ok('augustus staat nog vol', r.find((x) => x.month === AUG && x.kind === 'credits').used, PLAN_CREDITS.studio);
  ok('en het saldo klopt weer',
    (await slotBalans(env, sub.id, 1, inSep)).find((x) => x.kind === 'credits').saldo, 2);
}

/* ── ÉÉN POT, EN EEN PRIJS PER DIENST ───────────────────────────────────────
   Hier stond "de soorten raken elkaar niet": elke soort had zijn eigen saldo en
   dat moest gescheiden blijven. Sinds 19 september is dat juist omgekeerd — er
   IS maar één pot, en het verschil tussen de diensten zit in wat ze kosten.
   Deze toets bewaakt dus precies de tegenovergestelde eigenschap. */
console.log('\néén pot, en een prijs per dienst');
{
  ok('er is precies één saldoregel',
    (await slotBalans(env, sub.id, 1, inSep)).length, 1);
  ok('een catalogset kost vier credits', creditsPerSoort('catalog'), 4);
  ok('een lifestylecarrousel vijf', creditsPerSoort('lifestyle'), 5);
  ok('een lifestyle-clip twaalf', creditsPerSoort('video-lifestyle'), 12);
  ok('en een compleet product is de som van zijn twee helften',
    creditsPerSoort('complete'), creditsPerSoort('catalog') + creditsPerSoort('lifestyle'));
  ok('een dienst die niet bestaat kost niets',
    creditsPerSoort('bestaat-niet'), 0);
  ok('en een soort die het saldo niet kent, schrijft niets af',
    await verbruikSlot(env, sub.id, 1, 'video-motion', 1, inSep), 0);
}

/* ── DE CREDITKANT, MET DE ECHTE KLOK ─────────────────────────────────────────
   Hier stond "EN DE WACHTRIJ: CONCEPT, VASTZETTEN, LOSMAKEN": queueAdd() zette
   een item als concept op de lijst, queueLock() schreef de prijs af, queueUnlock()
   en queueRemove() gaven hem terug, en queueLock() weigerde zonder foto's
   ('geen-fotos') en bij een tweede keer ('stond-al-vast'). De wachtrij is weg
   sinds 5 november 2026 (levering 69, §17 punt 14): het weeksysteem bestaat
   sinds 8 oktober niet meer en niets riep hem aan. Wat queueLock en queueUnlock
   op het saldo deden, staat hieronder rechtstreeks: verbruikCredits() en
   geefCreditsTerug(), met dezelfde prijzen en dus dezelfde saldi als eerst. */
console.log('\nafschrijven en teruggeven met de echte klok');
{
  /* VANAF HIER DE ECHTE KLOK, en dat is geen slordigheid.
     verbruikCredits() kijkt zonder `nu` naar `new Date()`, zoals queueLock() dat
     deed — hij hoort te weten wat er VANDAAG nog geldig is en niet wat een
     toets hem influistert. De vaste maanden hierboven zaten in de toekomst ten
     opzichte van vandaag, en toekomstige toekenningen tellen terecht niet mee.
     Dus: het saldo leegmaken en deze maand toekennen. */
  const NU = monthKey();
  db.exec("DELETE FROM subscription_slots");
  await grantSlots(env, sub.id, NU, 'studio');

  ok('na de toekenning staat het hele saldo er',
    (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'credits').saldo,
    PLAN_CREDITS.studio);

  ok('een catalogset afschrijven lukt', await verbruikCredits(env, sub.id, 1, CAT), CAT);
  ok('nu zijn er vier credits af — de prijs van een catalogset',
    (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'credits').saldo,
    PLAN_CREDITS.studio - CAT);

  await verbruikCredits(env, sub.id, 1, CAT);
  ok('twee catalogsets weg', (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'credits').saldo, PLAN_CREDITS.studio - CAT * 2);
  ok('teruggeven lukt', await geefCreditsTerug(env, sub.id, 1, CAT), CAT);
  ok('en de credits zijn terug', (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'credits').saldo, PLAN_CREDITS.studio - CAT);
}

/* ── TE WEINIG CREDITS ───────────────────────────────────────────────────────
   Hier stond "een soort die het plan niet geeft": hooks zat niet in de bundel
   van Studio en kon daarom niets afschrijven. Met één pot kan elke dienst uit
   dat saldo betaald worden, en is de enige grens of er GENOEG in zit. Dat is de
   toets geworden — het saldo eerst leegmaken, dan een hook proberen.

   Tot 5 november 2026 was dat queueLock() met 'geen-credits', de prijs in
   `kosten` en een item dat concept bleef. Die poort is weg met de wachtrij
   (levering 69, §17 punt 14). De vraag "past dit nog in het saldo" staat nog in
   slotToegestaan(), en die wordt hier gesteld. Niet verbruikCredits() zelf: die
   boekt bij te weinig af wat er is (zie "meer willen dan er is" hierboven). */
console.log('\nmet te weinig credits past een hook niet meer');
{
  const balans = (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'credits');
  await verbruikSlot(env, sub.id, 1, 'credits', balans.saldo - 1);
  const nu = await slotBalans(env, sub.id, 1);
  ok('een hook kost tien credits — wat het scherm als tekort kan noemen', creditsPerSoort('hooks'), 10);
  ok('met één credit past hij niet', slotToegestaan(nu, 'credits', creditsPerSoort('hooks')), false);
  ok('één credit past wel', slotToegestaan(nu, 'credits', 1), true);
  ok('en de ene credit die er was, staat er nog',
    (await slotBalans(env, sub.id, 1)).find((x) => x.kind === 'credits').saldo, 1);
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
    lopend.find((b) => b.kind === 'credits').saldo, PLAN_CREDITS.starter * 2);

  await cancelSubscription(env, s2.id);
  const na = await slotBalans(env, s2.id, vensterVoor({ term: 'monthly', status: 'cancelled' }), inSep);
  ok('na opzeggen blijft alleen september staan',
    na.find((b) => b.kind === 'credits').saldo, PLAN_CREDITS.starter);
  ok('en er staat niets doorgeschovens meer bij', na.find((b) => b.kind === 'credits').ouder, 0);

  /* En het mag ook echt niet meer besteed worden: verbruikSlot leest hetzelfde
     venster, dus meer dan één maand vragen kan hij niet meer opmaken. */
  const kon = await verbruikSlot(env, s2.id, vensterVoor({ term: 'monthly', status: 'cancelled' }),
    'credits', PLAN_CREDITS.starter + 1, inSep);
  ok('en hij kan niet meer dan zijn laatste maand opmaken', kon, PLAN_CREDITS.starter);

  /* De klantkant: besteden mag nog zolang de opgezegde maand loopt. Dat is de
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
  /* Draait de toets in september 2026, dan is monthKey() SEP: de toekenning van
     deze maand is hierboven al opgemaakt, en grantSlots is idempotent — hij zet
     dan niets nieuws neer. In een latere maand zet hij een verse rij neer.
     Het saldo teruggeven is hier geen truc maar het herstellen van de toestand
     die de toets wil onderzoeken: een opgezegde klant met een betaalde maand die
     nog open staat. */
  await geefSlotTerug(env, s2.id, 0, 'credits', PLAN_CREDITS.starter, inSep);
  /* Hier zette de klant nog een product op de lijst en vast (queueAdd, queueLock;
     weg sinds 5 november 2026, levering 69, §17 punt 14). Wat queueLock daarvoor
     deed, staat hier los: het abonnement laden zoals het nu in de database staat,
     daar het venster van nemen en met de echte klok afschrijven. */
  const opgezegd = await loadSubscription(env, 2);
  ok('het opgezegde abonnement is nog te laden, met een venster van nul',
    [opgezegd?.status, vensterVoor(opgezegd)], ['cancelled', 0]);
  ok('en de betaalde maand mag nog op na opzeggen',
    await verbruikCredits(env, s2.id, vensterVoor(opgezegd), CAT), CAT);
}

console.log('\neen gepauzeerd abonnement houdt zijn credits');
{
  db.exec("INSERT INTO customers (id, email, brand) VALUES (3, 'ruth@pauze.test', 'PAUZE')");
  const { row: s3 } = await createSubscriptionRow(env, { customerId: 3, planId: 'starter', termId: 'monthly', windowDay: 8 });
  await activateSubscription(env, s3.id);
  await grantSlots(env, s3.id, monthKey(), 'starter');
  await pauseSubscription(env, s3.id, 'payment_failed');
  /* "Vastzetten weigert" met 'abonnement-paused' was queueLock(); weg met de
     wachtrij (levering 69, 5 november 2026, §17 punt 14). Dezelfde statusregel
     staat in verbruikToestaan(), en die toetsen subscription.test.mjs en de
     keten in abo-keten.test.mjs. Wat hier blijft: de pauze laat het saldo staan. */
  ok('de credits staan er nog',
    (await slotBalans(env, s3.id, 1)).find((b) => b.kind === 'credits').saldo, PLAN_CREDITS.starter);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
