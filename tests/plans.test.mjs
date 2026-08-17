/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET ABONNEMENT — VAN DE PRIJS TOT DE AFSCHRIJVING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 16 augustus 2026: *"bouw het systeem erin"*, met daarbij de eis die de
 * hele vorm bepaalt: *"ik werk alleen dus ik kan uiteindelijk overzicht verliezen
 * dus zoveel mogelijk moet geautomatiseerd zijn."*
 *
 * Automatisering betekent dat er niemand meekijkt. Dat verhoogt de eis aan deze
 * toetsen: bij een losse bestelling ziet Lucas elke studiomail langskomen en valt
 * een rare uitkomst op. Bij een abonnement schrijft Mollie af, kent de webhook
 * saldo toe, en pakt een nachtelijke taak de wachtrij — en de eerste keer dat een
 * mens ernaar kijkt is als er iets misgaat.
 *
 * Wat hier daarom bewaakt wordt, op volgorde van wat het kost als het fout gaat:
 *
 *   1 · GEEN PLAN ONDER DE BODEM VAN DE LADDER. Dat is het enige getal waar
 *       direct geld op staat, en het is de reden dat de jaarkorting alleen op
 *       Starter zit.
 *   2 · DE WEBHOOK IS IDEMPOTENT. Mollie levert dezelfde melding desnoods drie
 *       keer af. Twee keer saldo toekennen is twaalf producten weggeven.
 *   3 · DE PLEKKEN VOLGEN DE CAPACITEIT. Een limiet die niet meebeweegt met
 *       capacity.js is een limiet die na de eerste wijziging oververkoopt.
 *   4 · HET SALDO IS EEN SOM EN GEEN TELLER, dus een half mislukte handeling kan
 *       hem niet uit de pas laten lopen.
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  PLAN_IDS, TERM_IDS, TERMS, PLAN_SERVICE, ADVISORY,
  monthlyCents, termTotalCents, perProductCents, ladderFloorCents,
  productsFor, clipsFor, hasBrandModel, rolloverMonths, available,
  planProductBudget, attendedProductsPerMonth, fitsBudget, seatsLeft,
  advisoryAvailable, planShape, PLAN_CAPACITY_SHARE, rolloverDetail, addMonths,
} from '../src/data/plans.js';
import { PLAN_AMOUNT, PLAN_MIN_MONTHS } from '../src/data/pricing.js';
import { ATTENDED_PER_DAY } from '../src/data/capacity.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

console.log('VISUAILS — het abonnement\n');

console.log('geen plan zakt onder de bodem van de ladder');
{
  const bodem = ladderFloorCents();
  ok('de ladder heeft een bodem om tegen te meten', bodem > 0, true, bodem);
  for (const id of PLAN_IDS) {
    for (const t of TERM_IDS) {
      const pp = perProductCents(id, t);
      /* `brand` mag er BEWUST onder: daar zit het merkmodel bij, dat op de ladder
         € 1.250 kost. Zie plans() in pricing.js. Elke andere is een prijsfout. */
      if (id === 'brand') {
        ok(`${id}/${t}: zit onder de bodem, en dat mag hier`, pp < bodem, true, `€${(pp/100).toFixed(2)}`);
      } else {
        ok(`${id}/${t}: € ${(pp / 100).toFixed(2)} per product, boven de bodem`, pp >= bodem, true, `€${(pp/100).toFixed(2)} vs €${(bodem/100).toFixed(2)}`);
      }
    }
  }
  /* DE KORTINGSREKENING DIE DE JAARVORM BEPAALT. Twee maanden korting op Studio
     zou € 54,80 per product opleveren en op Brand € 46,90 — allebei onder de
     bodem. Dat is de meting waarop TERMS.yearly.discountMonths alleen Starter
     bevat, en deze toets is wat die meting vasthoudt. */
  ok('alleen Starter krijgt jaarkorting',
    Object.keys(TERMS.yearly.discountMonths).join(','), 'starter');
  ok('en die brengt hem op precies de bodem',
    perProductCents('starter', 'yearly'), ladderFloorCents());
}

console.log('\nde termijnen kloppen met elkaar');
{
  ok('de maandtermijn geeft geen korting', Object.keys(TERMS.monthly.discountMonths).length, 0);
  ok('de jaartermijn is langer dan de minimumtermijn', TERMS.yearly.months > PLAN_MIN_MONTHS, true);
  ok('en schuift langer door', rolloverMonths('yearly') > rolloverMonths('monthly'), true);
  /* Een onbekende termijn valt op maandelijks terug en niet om. Dit getal komt
     uit een database die ooit een waarde bevat die de code niet meer kent. */
  ok('een onbekende termijn valt terug op maandelijks', rolloverMonths('kwartaal'), rolloverMonths('monthly'));
  ok('en rekent dan ook het maandbedrag', monthlyCents('studio', 'kwartaal'), monthlyCents('studio', 'monthly'));

  for (const id of PLAN_IDS) {
    ok(`${id}: het jaartotaal is twaalf maandtermijnen`,
      termTotalCents(id, 'yearly'), monthlyCents(id, 'yearly') * 12);
    /* Het jaar mag nooit duurder zijn dan hetzelfde aantal maanden los. */
    ok(`  en nooit duurder dan twaalf losse maanden`,
      termTotalCents(id, 'yearly') <= PLAN_AMOUNT[id] * 100 * 12, true);
  }

  /* Het merkmodel is een van de vier dingen die een jaarverbintenis koopt in
     plaats van een korting. Brand heeft hem altijd; Studio krijgt hem op jaar. */
  ok('Brand heeft het merkmodel altijd', hasBrandModel('brand', 'monthly'), true);
  ok('Studio niet op de maandtermijn', hasBrandModel('studio', 'monthly'), false);
  ok('maar wel op de jaartermijn', hasBrandModel('studio', 'yearly'), true);
  ok('Starter op geen van beide', hasBrandModel('starter', 'yearly'), false);
}

console.log('\nde plekken volgen capacity.js en niet een ingetypt getal');
{
  ok('de maandcapaciteit komt uit ATTENDED_PER_DAY',
    attendedProductsPerMonth(), ATTENDED_PER_DAY * 21);
  ok('het budget is het afgesproken deel daarvan',
    planProductBudget(), Math.floor(ATTENDED_PER_DAY * 21 * PLAN_CAPACITY_SHARE));
  /* Het deel moet onder de helft blijven: losse bestellingen zijn er vandaag en
     abonnees nog niet, en een abonnement dat meer dan de helft van de agenda
     vastlegt, sluit de deur waar de omzet nu vandaan komt. */
  ok('en dat deel is niet meer dan de helft', PLAN_CAPACITY_SHARE <= 0.5, true, PLAN_CAPACITY_SHARE);

  /* IN PRODUCTEN EN NIET IN ABONNEES. Acht Starters en één Brand leggen niet
     hetzelfde vast; een teller op aantallen zou zeggen dat er nog plek is
     terwijl de agenda vol staat. */
  const budget = planProductBudget();
  ok('een leeg budget heeft plek voor elk plan',
    PLAN_IDS.every((id) => fitsBudget(id, 0)), true);
  ok('een vol budget voor geen enkel',
    PLAN_IDS.some((id) => fitsBudget(id, budget)), false);
  ok('precies passend mag nog', fitsBudget('starter', budget - productsFor('starter')), true);
  ok('één product te veel niet', fitsBudget('starter', budget - productsFor('starter') + 1), false);
  ok('en onzin telt als nul', fitsBudget('starter', NaN), true);

  ok('de teller rekent in het kleinste plan',
    seatsLeft(0), Math.floor(budget / productsFor('starter')));
  ok('en gaat nooit onder nul', seatsLeft(budget * 10), 0);
}

console.log('\nhet saldo is een som, en schuift door zolang het mag');
{
  ok('een verse maand geeft precies het plan', available('studio', 'monthly', []), productsFor('studio'));
  /* Zeven van twaalf gebruikt: vijf schuiven door, en die komen bij de twaalf
     van deze maand. */
  ok('wat overblijft schuift door',
    available('studio', 'monthly', [{ granted: 12, used: 7 }]), 17);
  /* Op de maandtermijn schuift één maand door, dus de oudste van twee vervalt. */
  ok('en op de maandtermijn vervalt de maand ervoor',
    available('studio', 'monthly', [{ granted: 12, used: 0 }, { granted: 12, used: 7 }]), 17);
  /* Op de jaartermijn schuiven er drie mee, dus dezelfde geschiedenis geeft meer. */
  ok('op de jaartermijn schuiven er drie mee',
    available('studio', 'yearly', [{ granted: 12, used: 0 }, { granted: 12, used: 7 }]), 29);
  /* NOOIT NEGATIEF. Een correctie waarbij meer verbruikt is dan toegekend, mag
     geen schuld worden: het meerdere is bij de bestelling al op de ladder
     afgerekend, en hier nog eens aftrekken laat de klant twee keer betalen. */
  ok('meer verbruikt dan toegekend levert geen schuld op',
    available('starter', 'monthly', [{ granted: 5, used: 9 }]), productsFor('starter'));
  ok('en onzin in de geschiedenis telt als nul',
    available('starter', 'monthly', [{ granted: null, used: 'x' }]), productsFor('starter'));
}

console.log('\ndoorschuiven heeft een zichtbare afloopmaand');
{
  /* DE KEUZE VAN 17 AUGUSTUS. Lucas koos doorschuiven MÉT een zichtbare
     afloopmaand boven een harde reset op de 1e, en dat is de goede kant van beide:
     druk zonder de piek. Een reset schuift het verbruik naar de laatste dagen van
     de maand, en het budget van 94 producten in drie dagen is 31 per dag terwijl
     er 15 begeleid kunnen — voor iemand die alleen werkt niet een drukke week
     maar een onmogelijke. */
  const h = [
    { month: '2026-06', granted: 12, used: 12 },
    { month: '2026-07', granted: 12, used: 9 },
    { month: '2026-08', granted: 12, used: 7 },
  ];
  const maand = rolloverDetail('monthly', h);
  ok('op de maandtermijn doet één maand mee', maand.length, 1);
  ok('en dat is de laatste', maand[0].from, '2026-08');
  ok('met wat er overbleef', maand[0].left, 5);
  ok('te gebruiken tot en met de maand erna', maand[0].until, '2026-09');

  const jaar = rolloverDetail('yearly', h);
  /* Juni is helemaal opgemaakt, dus die staat er niet bij: een regel van nul
     producten is een regel die de klant laat zoeken naar wat hij betekent. */
  ok('op de jaartermijn doen er meer mee, maar niet de lege', jaar.length, 2);
  ok('en de oudste schuift drie maanden door', jaar[0].until, '2026-10');

  ok('een maand zonder venster levert niets op', rolloverDetail('monthly', []).length, 0);

  /* addMonths rekent zelf en gebruikt geen Date: `new Date('2026-12')` plus een
     maand is in JavaScript een uitnodiging voor een tijdzonefout, en dit is een
     periode en geen moment. */
  ok('de jaargrens klopt', addMonths('2026-12', 1), '2027-01');
  ok('en een sprong van meer maanden ook', addMonths('2026-11', 3), '2027-02');
  ok('onzin geeft leeg en niet NaN-NaN', addMonths('later', 1), '');
}

console.log('\nmeedenken is de enige plek waar tijd wordt verkocht');
{
  ok('alleen op het grootste plan', advisoryAvailable('studio', 0), false);
  ok('en daar wel', advisoryAvailable('brand', 0), true);
  ok('tot de limiet', advisoryAvailable('brand', ADVISORY.maxCustomers - 1), true);
  ok('en niet erna', advisoryAvailable('brand', ADVISORY.maxCustomers), false);
  /* De limiet is wat één persoon naast het werk kan doen. Wordt hij groot, dan
     is dat een besluit en geen groei die er ongemerkt in sluipt. */
  ok('de limiet is klein genoeg om alleen te doen', ADVISORY.maxCustomers <= 6, true, ADVISORY.maxCustomers);
}

console.log('\nde migratie draait, en houdt tegen wat hij moet tegenhouden');
{
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE customers (id INTEGER PRIMARY KEY); CREATE TABLE orders (id INTEGER PRIMARY KEY);');
  db.exec(read('migrations/0030-abonnementen.sql'));
  db.exec("INSERT INTO customers (id) VALUES (7), (8)");
  ok('de drie tabellen staan er',
    db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('subscriptions','subscription_months','plan_queue')").get().n, 3);

  db.exec("INSERT INTO subscriptions (customer_id, ref, plan, term, status) VALUES (7,'SUB-AAAA-001','studio','yearly','active')");
  /* ÉÉN LOPEND ABONNEMENT PER KLANT. Een tweede is bijna altijd een dubbel
     verstuurd formulier, en twee actieve abonnementen maken elk saldo
     dubbelzinnig. */
  let dubbel = false;
  try { db.exec("INSERT INTO subscriptions (customer_id, ref, plan, term, status) VALUES (7,'SUB-AAAA-002','brand','monthly','active')"); }
  catch { dubbel = true; }
  ok('een tweede lopend abonnement wordt geweigerd', dubbel, true);
  /* Maar een opgezegd abonnement blokkeert geen nieuw: de index dekt alleen
     'active' en 'pending'. Anders zou een klant die ooit opzegde nooit meer
     terug kunnen komen. */
  let opnieuw = true;
  try { db.exec("INSERT INTO subscriptions (customer_id, ref, plan, term, status) VALUES (7,'SUB-AAAA-003','brand','monthly','cancelled')"); }
  catch { opnieuw = false; }
  ok('maar een opgezegd abonnement blokkeert niets', opnieuw, true);

  /* DE INDEX DIE DE WEBHOOK IDEMPOTENT MAAKT. Dit is de belangrijkste regel van
     migratie 0030: Mollie levert dezelfde melding desnoods drie keer af, en de
     tweede keer moet hier omvallen in plaats van twaalf producten weg te geven. */
  db.exec("INSERT INTO subscription_months (subscription_id, month, granted) VALUES (1,'2026-09',12)");
  let tweedeMaand = false;
  try { db.exec("INSERT INTO subscription_months (subscription_id, month, granted) VALUES (1,'2026-09',12)"); }
  catch { tweedeMaand = true; }
  ok('dezelfde maand twee keer toekennen wordt geweigerd', tweedeMaand, true);
  ok('en een andere maand mag wel',
    (() => { db.exec("INSERT INTO subscription_months (subscription_id, month, granted) VALUES (1,'2026-10',12)"); return true; })(), true);

  /* De wachtrij hangt aan de KLANT en niet aan het abonnement: wie opzegt en
     terugkomt, hoort zijn lijst nog te hebben. */
  db.exec("INSERT INTO plan_queue (customer_id, position, name) VALUES (7,1,'Wolvest'), (7,2,'Oversized hemd')");
  ok('de wachtrij hangt aan de klant',
    db.prepare('SELECT COUNT(*) AS n FROM plan_queue WHERE customer_id = 7').get().n, 2);
  db.close();
}

console.log('\nde webhook kent een abonnementsbetaling en gooit hem niet weg');
{
  const wh = read('functions/api/webhook/mollie.js');
  /* DE REGEL DIE VÓÓR 16 AUGUSTUS ELKE AFSCHRIJVING WEGGOOIDE. Een
     abonnementsbetaling draagt een subscriptionId en geen order_ref; de oude
     code logde dat als een verdwaalde betaling en gaf return. */
  ok('er is een tak op subscriptionId', /if \(payment\.subscriptionId\)/.test(wh), true);
  /* VÓÓR de !ref-tak, want een abonnementsbetaling MAG geen ref hebben. Stond hij
     erna, dan liet elke geslaagde afschrijving een foutregel achter — en een
     logboek dat bij normaal gedrag alarm slaat, leest niemand meer. */
  ok('  en die staat vóór de order_ref-controle',
    wh.indexOf('if (payment.subscriptionId)') < wh.indexOf("carries no order_ref"), true);
  /* ── DE AFSCHRIJVING LANDT IN EEN TABEL DIE HAAR AANKAN ──────────────────
     17 augustus 2026. Hier stond een INSERT in `payments`, en die tabel heeft
     `order_id NOT NULL`. Elke abonnementsbetaling werd dus door de database
     geweigerd — en de catch eromheen liet alles door met "constraint" erin, dus
     de fout verdween: saldo toegekend, betaling weg, geen spoor van geld dat wel
     was ontvangen. Deze drie regels zijn wat dat tegenhoudt. */
  ok('de afschrijving gaat naar subscription_payments en niet naar payments',
    /INSERT INTO subscription_payments/.test(wh), true);
  ok('  en er wordt geen betaling met order_id NULL meer geschreven',
    /INSERT INTO payments[\s\S]{0,120}VALUES \(NULL/.test(wh), false);
  /* En de catch mag alleen een dubbele aflevering inslikken. /constraint/ maakte
     er een doofpot van voor elke databasefout. */
  ok('  en alleen een dubbele aflevering loopt stil af',
    /if \(!\/UNIQUE\/i\.test/.test(wh), true);

  /* ── GEEN IBAN IN DE DATABASE ────────────────────────────────────────────
     Het paymentobject van Mollie bevat bij iDEAL en bij een SEPA-incasso
     `details.consumerName` en `details.consumerAccount`. Dat ging hier de
     database in via JSON.stringify(payment), en werd nergens gelezen. Een
     toelatingslijst blijft kloppen als Mollie een veld toevoegt; een verbodslijst
     niet. */
  ok('de ruwe payload gaat door een filter',
    /payloadZonderPersoon\(payment\)/.test(wh), true);
  /* ALLEEN DE CODE, NIET DE UITLEG — zesde keer dit jaar. De kop van
     payloadZonderPersoon() legt uit dat hier JSON.stringify(payment) STOND, en zet
     die string dus letterlijk in het bestand. Een toets die daarop rood gaat, duwt
     de uitleg eruit, en de uitleg is de helft van de code. Dezelfde helper als in
     tests/ratio.test.mjs. */
  const whCode = wh.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  ok('  en de hele payload wordt niet meer weggeschreven',
    /JSON\.stringify\(payment\)/.test(whCode), false);
  ok('  het filter is een toelatingslijst', /const PAYLOAD_VELDEN = \[/.test(wh), true);
  ok('  en details gaat er in zijn geheel uit',
    /if \(payment\?\.details\) uit\._details/.test(wh), true);

  ok('de handler kent saldo toe', /INSERT INTO subscription_months/.test(wh), true);
  /* ON CONFLICT DO NOTHING en geen `if (al verwerkt)`: die vraag heeft een venster
     tussen lezen en schrijven waar de derde aflevering precies in past. */
  ok('  idempotent via de database en niet via een vlag',
    /ON CONFLICT \(subscription_id, month\) DO NOTHING/.test(wh), true);
  ok('  en het aantal komt uit plans.js', /productsFor\(sub\.plan\)/.test(wh), true);
  /* Een geslaagde afschrijving heft een pauze wegens betaalfout op — zelfherstel,
     zodat Lucas er niet op hoeft te klikken. Maar niet een pauze die de klant
     zelf heeft gezet. */
  ok('een betaling heft een betaalpauze op', /pause_reason = 'payment_failed'/.test(wh), true);
  /* De maand komt uit de BETAALDATUM en niet uit datetime('now'): een melding die
     een dag later wordt afgeleverd, hoort bij de maand waarin betaald is. */
  ok('de maand komt uit de betaaldatum', /payment\.paidAt \|\| payment\.createdAt/.test(wh), true);
}

console.log('\nmollie.js kan herhalen');
{
  const m = read('src/lib/mollie.js');
  for (const fn of ['createMollieCustomer', 'createFirstPayment', 'firstPaymentMandate',
    'createMollieSubscription', 'cancelMollieSubscription']) {
    ok(`${fn} bestaat`, m.includes(`export async function ${fn}(`), true);
  }
  ok("de eerste betaling draagt sequenceType 'first'", /sequenceType: 'first'/.test(m), true);
  /* startDate is hoe een gratis periode werkt: één kleine betaling voor het
     mandaat, en de subscription begint later. Nagekeken in Mollie's
     Create-subscription-documentatie. */
  ok('de subscription kan een startDate meekrijgen', /if \(startDate\) body\.startDate = startDate;/.test(m), true);
  /* times maakt de jaarverbintenis zelfstoppend — netter dan onthouden dat hij
     opgezegd moet worden. */
  ok('en een times om zichzelf te stoppen', /body\.times = times/.test(m), true);
  /* Een mandaat komt alleen uit een echte betaling. Nul euro moet luidruchtig
     falen en niet stilletjes een abonnement zonder mandaat opleveren. */
  ok('een eerste betaling van nul wordt geweigerd',
    /het mandaat vraagt een echte transactie/.test(m), true);
  /* Een 404 bij opzeggen is geen fout: al opgezegd is precies wat we wilden. */
  ok('opzeggen verdraagt een al opgezegd abonnement', /alreadyGone: true/.test(m), true);
}

console.log('\nen de vorm die een pagina leest, klopt');
{
  const s = planShape('studio', 'yearly');
  ok('planShape geeft het maandbedrag', s.monthlyCents, monthlyCents('studio', 'yearly'));
  ok('en het aantal producten', s.products, productsFor('studio'));
  ok('en de clips', s.clips, clipsFor('studio'));
  ok('en de vergelijking met de ladder', s.ladderCents > s.monthlyCents, true);
  ok('en de dienst is complete', PLAN_SERVICE, 'complete');
  ok('een onbekend plan gooit',
    (() => { try { planShape('goud'); return false; } catch { return true; } })(), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
