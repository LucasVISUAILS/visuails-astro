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
  PLAN_IDS, TERM_IDS, TERMS, PLAN_SERVICE,
  monthlyCents, termTotalCents, perProductCents, PLAN_BODEM_CENTS,
  productsFor, clipsFor, hasBrandModel, rolloverMonths, available,
  seatsLeft, planPast, creditsPassen, aboPlafond, ABO_CREDITS_PLAFOND, PLEKKEN_TONEN_TOT,
  OFFERED_TERM_IDS, planShape, rolloverDetail, addMonths,
} from '../src/data/plans.js';
import { PLAN_AMOUNT, PLAN_COMPARE_MONTHS, PLAN_CREDITS } from '../src/data/pricing.js';

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
  const bodem = PLAN_BODEM_CENTS;
  ok('de ladder heeft een bodem om tegen te meten', bodem > 0, true, bodem);
  for (const id of PLAN_IDS) {
    for (const t of TERM_IDS) {
      const pp = perProductCents(id, t);
      const tt = TERMS[t];
      /* ── EEN VOORUITBETAALD JAAR MEET TEGEN EEN ANDERE BODEM — 10 sept 2026 ──
         En dat is geen versoepeling maar een andere trede. De bodem van de ladder
         is het laagste tarief van een LOSSE bestelling en die ladder stopt bij
         twintig producten; een vooruitbetaald jaar op Studio is er
         honderdvierenveertig, twaalf maanden vooruit betaald. Zie
         PREPAY_FLOOR_SHARE in plans.js voor waarom driekwart de grens is.

         Let op wie hier WEL en niet vrijgesteld is: op de gewone termijnen mag
         `brand` er bewust onder (daar zit het merkmodel van € 1.250 bij), op de
         vooruitbetaalde termijn juist niet — dat is het plan waar deze meting
         voor bestaat, want het legt in zijn eentje 9,5% van de maand vast. */
      if (tt.floorShare) {
        const drempel = Math.round(bodem * tt.floorShare);
        ok(`${id}/${t}: € ${(pp / 100).toFixed(2)} per product, boven de vooruitbodem`,
          pp >= drempel, true, `€${(pp/100).toFixed(2)} vs €${(drempel/100).toFixed(2)}`);
        /* En hij hoort er ook echt op of ONDER de gewone bodem te liggen, anders
           is de vooruitbetaling geen korting maar een woord. Starter komt er
           sinds 10 september precies OP uit (€ 65,00) — twee gratis maanden
           brengen hem op de laagste losse trede en geen cent lager — dus `<=`
           en niet `<`. */
        ok(`  en op of onder de losse bodem, anders is er geen voordeel`, pp <= bodem, true, `€${(pp/100).toFixed(2)}`);
      } else if (id === 'brand') {
        /* `brand` mag er BEWUST onder: daar zit het merkmodel bij, dat op de ladder
           € 1.250 kost. Zie plans() in pricing.js. Elke andere is een prijsfout. */
        ok(`${id}/${t}: zit onder de bodem, en dat mag hier`, pp < bodem, true, `€${(pp/100).toFixed(2)}`);
      } else {
        ok(`${id}/${t}: € ${(pp / 100).toFixed(2)} per product, boven de bodem`, pp >= bodem, true, `€${(pp/100).toFixed(2)} vs €${(bodem/100).toFixed(2)}`);
      }
    }
  }
  /* ── DE KORTING ZIT OP ÉÉN TERMIJN, EN DAT IS DE VOORUITBETAALDE ──────────
   * 10 september 2026. Hier stond dat alleen Starter jaarkorting krijgt; dat was
   * waar tot Lucas koos voor *"2 gratis maanden"* op elk plan. Die regel kan niet
   * op allebei de jaartermijnen staan — dan kost een vooruitbetaald Starterjaar
   * precies evenveel als een jaar dat je per maand afbetaalt, en is er geen reden
   * om vooruit te betalen. Zie de noot bij `discountMonths` in plans.js.
   *
   * Deze twee regels bewaken nu dát onderscheid, en niet meer welk plan wat
   * krijgt: de ene termijn koopt voorwaarden, de andere koopt een prijs. */
  ok('de jaartermijn geeft zelf geen korting meer',
    Object.keys(TERMS.yearly.discountMonths).length, 0);
  ok('en de vooruitbetaalde termijn geeft hem aan elk plan',
    PLAN_IDS.every((id) => (TERMS.prepaid.discountMonths[id] || 0) > 0), true);
  /* Twee gratis maanden brengen Starter op precies de bodem van de ladder: op een
     vooruitbetaald jaar betaal je daar wat twintig producten los kosten. Dat is
     de zin die op de prijspagina uitlegbaar is, en dit is de meting eronder. */
  ok('en dat brengt Starter op precies de bodem',
    perProductCents('starter', 'prepaid'), PLAN_BODEM_CENTS);
}

console.log('\nde plaat in PlanPicker kent elke combinatie van plan en termijn');
{
  /* ── WAAROM DIT EEN TOETS IS EN GEEN LUS IN HET COMPONENT — 10 sept 2026 ────
   *
   * De samenvattingsplaat wordt met `:has()` gekozen: één regel per plan × termijn,
   * met de hand geschreven, omdat een <style>-blok in Astro geen selectors kan
   * interpoleren. Dat werkt, maar het is precies de vorm waarin drift begint —
   * er kwam vandaag een derde termijn bij en zonder deze toets zou de plaat bij
   * "12 maanden vooruit" gewoon LEEG blijven, zonder dat er iets omvalt.
   *
   * Deze regel leest de CSS en eist dat elke combinatie erin staat. */
  const bron = read('src/components/order/PlanPicker.astro');
  /* Sinds 6.04 alleen de termijnen uit het aanbod: de tussentermijn staat niet
     meer op /start/plan. */
  for (const p of PLAN_IDS) {
    for (const t of OFFERED_TERM_IDS) {
      const kies = `[name="plan"][value="${p}"]:checked`;
      const kiesT = `[name="term"][value="${t}"]:checked`;
      const doel = `.ps-sumv[data-plan="${p}"][data-term="${t}"]`;
      const regel = bron.split('\n').find((r) => r.includes(kies) && r.includes(kiesT) && r.includes(doel));
      ok(`${p}/${t}: heeft een regel op de plaat`, !!regel, true);
    }
  }
  // En elke termijn heeft een naam en een uitleg in het component.
  for (const t of OFFERED_TERM_IDS) {
    ok(`${t}: staat in de terugvalvrije teksttabel`, bron.includes(`  ${t}: { naam:`), true);
  }
  ok('de tussentermijn staat niet meer op de plaat', /data-term="yearly"|\[value="yearly"\]/.test(bron), false);
}

console.log('\nde termijnen kloppen met elkaar');
{
  ok('de maandtermijn geeft geen korting', Object.keys(TERMS.monthly.discountMonths).length, 0);
  ok('de jaartermijn is langer dan het rekenvenster', TERMS.yearly.months > PLAN_COMPARE_MONTHS, true);
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

console.log('\nde plekken: één plafond in credits (6.05, 8 oktober 2026)');
{
  /* Het "abonnementsbudget" in producten (30% van de begeleide capaciteit) is
     weg. De rem telt de maandcredits van alle abonnementen en vergelijkt die met
     één plafond: de stand uit /admin, of ABO_CREDITS_PLAFOND. */
  const P = ABO_CREDITS_PLAFOND;
  ok('het plafond is een positief aantal credits', Number.isInteger(P) && P > 0, true);
  ok('een leeg plafond heeft plek voor elk plan', PLAN_IDS.every((id) => planPast(id, 0)), true);
  ok('een vol plafond voor geen enkel', PLAN_IDS.some((id) => planPast(id, P)), false);
  ok('precies passend mag nog', planPast('starter', P - PLAN_CREDITS.starter), true);
  ok('één credit te veel niet', planPast('starter', P - PLAN_CREDITS.starter + 1), false);
  ok('en onzin telt als nul', planPast('starter', NaN), true);
  ok('een maand op maat rekent met zijn eigen credits', creditsPassen(300, P - 300), true);
  ok('  en niet één meer', creditsPassen(300, P - 299), false);
  /* IN CREDITS EN NIET IN ABONNEES: een Merk is zes keer een Starter. */
  ok('de plekken worden per plan geteld', seatsLeft(0, 'brand'), Math.floor(P / PLAN_CREDITS.brand));
  ok('  en voor Starter meer dan voor Merk', seatsLeft(0, 'starter') > seatsLeft(0, 'brand'), true);
  ok('en gaat nooit onder nul', seatsLeft(P * 10, 'starter'), 0);
  ok('een stand uit /admin gaat voor', seatsLeft(0, 'studio', 240), 2);
  ok('een lege of kapotte stand is de standaard', [aboPlafond(null), aboPlafond('x'), aboPlafond(0), aboPlafond(-5)].every((n) => n === P), true);
  ok('"nog N plekken" pas bij drie of minder', PLEKKEN_TONEN_TOT, 3);
  const src = read('src/data/plans.js');
  ok('het oude productbudget is weg', /planProductBudget|PLAN_CAPACITY_SHARE|fitsBudget/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), false);
}

console.log('\ntwee termijnen in het aanbod (6.04, 8 oktober 2026)');
{
  ok('maandelijks en jaar vooruit', OFFERED_TERM_IDS.join(','), 'monthly,prepaid');
  ok('de tussentermijn bestaat nog voor lopende abonnementen', TERM_IDS.includes('yearly') && !!TERMS.yearly, true);
  ok('Pro houdt het merkmodel bij vooruit', hasBrandModel('studio', 'prepaid'), true);
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

/* "Meedenken" (ADVISORY) stond hier tot 8 oktober 2026. Die dienst bestaat niet
   (punt 9.01, §17.6); de toets eist nu dat hij ook niet meer in plans.js staat. */
console.log('\nmeedenken bestaat niet als dienst');
{
  const P = await import('../src/data/plans.js');
  ok('plans.js exporteert geen ADVISORY meer', 'ADVISORY' in P, false);
  ok('en geen advisoryAvailable()', 'advisoryAvailable' in P, false);
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
  ok('en de dienst is catalog (compleet bestaat niet meer)', PLAN_SERVICE, 'catalog');
  ok('een onbekend plan gooit',
    (() => { try { planShape('goud'); return false; } catch { return true; } })(), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
