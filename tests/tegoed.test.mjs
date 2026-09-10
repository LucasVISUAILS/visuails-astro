/*
 * VISUAILS — HET TEGOED
 * 9 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Ik kan sowieso credits toevoegen ookal heeft iemand geen abonnement.
 * Wanneer de klant bijvoorbeeld een refund krijgt dan kan hij bijvoorbeeld ook
 * kiezen om het in credits uit te laten betalen, en kan hij op die manier een
 * nieuwe order plaatsen."*
 *
 * ── WAT HIER GETOETST WORDT ────────────────────────────────────────────────
 *
 * De vijf regels uit de kop van src/data/tegoed.js, en dan de vier die geld
 * kosten als ze wegzakken:
 *
 *   · tegoed staat EXCLUSIEF BTW — anders betaalt een klant met 0% verlegd
 *     stilletjes 21% te veel, of draagt de studio btw af over niet-verdiend geld;
 *   · tegoed is NOOIT in geld op te nemen — anders is dit een rekening en geen
 *     tegoed, met een ander toezicht erop;
 *   · budget en tegoed zijn TWEE POTTEN met twee vervaltermijnen — één pot zou
 *     betaald geld laten verlopen met de regels van een toekenning;
 *   · het saldo wordt nooit negatief en telt in hele centen.
 */
import {
  TEGOED_SOORTEN, TEGOED_SOORT_IDS, tegoedSoort, tegoedSaldo, refundToCredit,
  refundOf, spendOrder, openstaandTegoed, vervaltIn,
  TEGOED_BONUS, TEGOED_GELDIG_MAANDEN, TEGOED_COPY,
} from '../src/data/tegoed.js';
import { PLAN_ROLLOVER_MONTHS } from '../src/data/pricing.js';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const gelijk = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : ' FAIL'} ${naam}${gelijk ? '' : `   verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

console.log('\nVISUAILS — het tegoed\n');

console.log('het grootboek telt op wat het kent en negeert wat het niet kent');
{
  ok('een terugbetaling telt erbij', tegoedSaldo([{ soort: 'refund', cents: 50000 }]), 50000);
  ok('een besteding telt eraf',
    tegoedSaldo([{ soort: 'refund', cents: 50000 }, { soort: 'spend', cents: 12000 }]), 38000);
  ok('een teruggedraaide bestelling komt terug',
    tegoedSaldo([{ soort: 'spend', cents: 12000 }, { soort: 'reverse', cents: 12000 }]), 0);
  /* Een regel waarvan de bedoeling niet vaststaat, mag niet stilzwijgend
     meetellen — dat is precies hoe een saldo van de werkelijkheid afwijkt. */
  ok('een onbekende soort telt niet mee',
    tegoedSaldo([{ soort: 'refund', cents: 1000 }, { soort: 'kado', cents: 9999 }]), 1000);
  ok('en een lege lijst is nul', tegoedSaldo([]), 0);
  ok('rommel in plaats van een lijst is ook nul', tegoedSaldo(null), 0);
  /* Nooit negatief: een schuld die de klant niet kent, hoort niet te bestaan. */
  ok('meer besteed dan er was, geeft nul en geen schuld',
    tegoedSaldo([{ soort: 'refund', cents: 1000 }, { soort: 'spend', cents: 5000 }]), 0);
  ok('het saldo is in hele centen', tegoedSaldo([{ soort: 'refund', cents: 1234.6 }]), 1235);
}

console.log('\nelke soort telt één kant op, en geen enkele is uit te betalen');
{
  ok('alle soorten hebben +1 of -1',
    TEGOED_SOORTEN.every((s) => s.teken === 1 || s.teken === -1), true);
  /* REGEL 2. Zodra hier ooit `true` staat, is dit product geen tegoed meer maar
     een rekening waar je geld op zet en weer afhaalt. */
  ok('en geen enkele is in geld op te nemen',
    TEGOED_SOORTEN.filter((s) => s.uitbetaalbaar), []);
  ok('de ids zijn uniek', new Set(TEGOED_SOORT_IDS).size, TEGOED_SOORTEN.length);
  ok('een bestaande soort is opzoekbaar', tegoedSoort('refund')?.teken, 1);
  ok('een verzonnen soort niet', tegoedSoort('bonuskaart'), null);
}

console.log('\neen terugbetaling wordt tegoed, netto en met de bonus die is ingesteld');
{
  const zonder = refundToCredit(50000, 0);
  ok('zonder bonus is tegoed precies de terugbetaling', zonder.totaal, 50000);
  ok('en de bonus is nul', zonder.bonusCents, 0);
  const met = refundToCredit(50000, 0.10);
  ok('met 10% bonus wordt € 500 een tegoed van € 550', met.totaal, 55000);
  ok('en de bonus staat er apart bij', met.bonusCents, 5000);
  ok('nul terug is nul tegoed', refundToCredit(0).totaal, 0);
  ok('een negatief bedrag ook', refundToCredit(-100).totaal, 0);
  /* De bonus staat op nul tot Lucas hem aanzet — dat is een keuze over marge en
     niet over code. Deze regel legt vast dat de knop uit staat. */
  ok('de bonus staat vandaag uit', TEGOED_BONUS, 0);
  ok('en de standaard volgt die instelling', refundToCredit(10000).totaal, 10000);
}

console.log('\nwat met tegoed betaald is, komt als tegoed terug');
{
  /* REGEL 2, als gedrag. Zou dit geld teruggeven, dan is tegoed een manier om
     geld te stallen en weer op te nemen. */
  const r = refundOf({ metTegoedCents: 30000, metGeldCents: 20000 });
  ok('het tegoeddeel komt als tegoed', r.alsTegoed, 30000);
  ok('het gelddeel komt als geld', r.alsGeld, 20000);
  ok('een bestelling die volledig uit tegoed kwam, geeft geen geld terug',
    refundOf({ metTegoedCents: 50000 }).alsGeld, 0);
}

console.log('\nde volgorde van betalen: budget, dan tegoed, dan geld');
{
  /* Het maandbudget VERLOOPT en het tegoed niet. Wie het vergankelijke eerst
     opmaakt, verliest niets; andersom wel. */
  const a = spendOrder({ bedragCents: 10000, budgetCents: 3000, tegoedCents: 4000 });
  ok('het budget gaat eerst op', a.uitBudget, 3000);
  ok('dan het tegoed', a.uitTegoed, 4000);
  ok('en de rest wordt betaald', a.teBetalen, 3000);
  ok('samen is dat het hele bedrag', a.uitBudget + a.uitTegoed + a.teBetalen, 10000);
  ok('er is een betaling nodig', a.betalingNodig, true);

  const b = spendOrder({ bedragCents: 5000, budgetCents: 9000 });
  ok('een bestelling die in het budget past, kost geen geld', b.teBetalen, 0);
  ok('en heeft geen betaallink nodig', b.betalingNodig, false);
  ok('het restbudget klopt', b.budgetRest, 4000);

  const c = spendOrder({ bedragCents: 8000, tegoedCents: 8000 });
  ok('tegoed alleen kan een hele bestelling dekken', c.teBetalen, 0);
  ok('en het tegoed is dan op', c.tegoedRest, 0);

  const d = spendOrder({ bedragCents: 7000 });
  ok('zonder budget en tegoed betaal je alles', d.teBetalen, 7000);
  ok('rommel levert geen gratis bestelling op', spendOrder({}).teBetalen, 0);
  ok('en een negatief bedrag ook niet',
    spendOrder({ bedragCents: -500, tegoedCents: 1000 }).uitTegoed, 0);
}

console.log('\nbudget en tegoed zijn twee potten met twee termijnen');
{
  /* DE BELANGRIJKSTE REGEL VAN DIT BESTAND. Het maandbudget schuift één maand
     door omdat het een toekenning is; tegoed is geld dat de klant al betaald
     heeft. Worden die termijnen ooit gelijkgetrokken "voor de eenvoud", dan
     verloopt er betaald geld met de regels van een toekenning. */
  ok('tegoed leeft veel langer dan een maandbudget',
    TEGOED_GELDIG_MAANDEN > PLAN_ROLLOVER_MONTHS, true);
  ok('en minstens twee jaar', TEGOED_GELDIG_MAANDEN >= 24, true);
  ok('de vervalmaand telt vooruit', vervaltIn('2026-09'), '2028-09');
  ok('over een jaargrens heen ook', vervaltIn('2026-12'), '2028-12');
  ok('een onzinnige maand geeft niets terug', vervaltIn('later'), '');
}

console.log('\nhet openstaande tegoed is een verplichting en geen omzet');
{
  ok('de saldi tellen op', openstaandTegoed([50000, 12000, 0]), 62000);
  ok('negatieve saldi tellen als nul', openstaandTegoed([50000, -9000]), 50000);
  ok('een lege lijst is nul', openstaandTegoed([]), 0);
}

console.log('\nde teksten zeggen de drie dingen die ze moeten zeggen');
{
  for (const l of ['en', 'nl']) {
    const c = TEGOED_COPY[l];
    ok(`${l}: er is een keuze en niet één knop`, !!(c.keuzeGeld && c.keuzeTegoed), true);
    /* REGEL 3: de klant moet zijn geld kunnen krijgen, en dat moet er staan. */
    ok(`${l}: de zin noemt de terugbetaling als alternatief`,
      /rekening|bank/i.test(c.keuzeLine), true);
    /* REGEL 1: exclusief btw, en dat hoort de klant te lezen vóór hij kiest. */
    ok(`${l}: en de btw-regel staat er`, /btw|VAT/i.test(c.btw), true);
    ok(`${l}: de bonuszin heeft een plek voor het bedrag`, c.keuzeBonus.includes('{bonus}'), true);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
