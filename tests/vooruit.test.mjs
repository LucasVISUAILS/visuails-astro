/*
 * VISUAILS — HET VOORUITBETAALDE JAAR
 * 10 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Vooruitbetaling vorm toepassen en misschien een label toevoegen om
 * een jaar duidelijk voordeliger te maken, als iemand halverwege stopt krijgt
 * hij uiteraard geen geld terug, daarom betaal je ook een jaar vooruit, hij
 * blijft de service en credits gewoon van dat jaar houden per maand. Het restant
 * wordt dan tegoed dat wel per maand blijft omdat de klant wanneer hij stopt
 * opeens op 1 dag 100 fotos kan bestellen en word het te druk."*
 *
 * ── WAT HIER GETOETST WORDT ────────────────────────────────────────────────
 *
 * Vijf dingen, op volgorde van wat het kost als ze wegzakken:
 *
 *   1 · HET BEDRAG DAT DE KLANT AFREKENT IS EXACT. Niet twaalf afgeronde
 *       maanden maar tien hele — daar zit vier euro tussen en dat is een
 *       boekhouding die niet sluit.
 *   2 · GEEN GELD TERUG. De tegenprestatie voor de korting.
 *   3 · HET RESTANT KOMT NOOIT IN ÉÉN KEER VRIJ. De agenda is de schaarse kant.
 *   4 · DE TREDE GAAT MEE. Anders is € 1.950 restant opeens dertien producten
 *       waard in plaats van dertig.
 *   5 · VOORUITBETALEN IS ALTIJD GOEDKOPER dan dezelfde twaalf maanden per maand.
 */
import {
  PLAN_IDS, TERMS, TERM_IDS, isPrepaid, term,
  prepayFreeMonths, prepayPaidMonths, prepayTotalCents, prepaySaveCents,
  termTotalCents, monthlyCents, perProductCents, ladderFloorCents,
  PREPAY_FLOOR_SHARE, rolloverMonths, hasBrandModel,
} from '../src/data/plans.js';
import {
  PREPAY_REFUNDABLE, restantMaanden, restantTranches, restantTotaalCents,
  vrijgegeven, beschikbaarCents, prepayRefundCents, VOORUIT_COPY,
} from '../src/data/vooruit.js';
import { planBudget, planRung, budgetBuys } from '../src/data/budget.js';
import { PLAN_AMOUNT } from '../src/data/pricing.js';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const gelijk = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : ' FAIL'} ${String(naam).padEnd(60)}${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

console.log('\nVISUAILS — het vooruitbetaalde jaar\n');

console.log('de termijn bestaat naast de twee die er al waren');
{
  ok('er zijn drie termijnen', TERM_IDS.length, 3);
  ok('en de derde is vooruitbetaald', isPrepaid('prepaid'), true);
  ok('de maandtermijn niet', isPrepaid('monthly'), false);
  ok('en de jaartermijn ook niet', isPrepaid('yearly'), false);
  ok('een onbekende termijn valt terug en is niet vooruitbetaald', isPrepaid('kwartaal'), false);
  ok('hij duurt twaalf maanden', term('prepaid').months, 12);
  ok('en ligt vast', term('prepaid').fixed, true);
  /* De voorwaarden van de jaartermijn horen er alle vier bij: wie een jaar
     vooruitbetaalt, hoort niet minder te krijgen dan wie hem per maand vastlegt. */
  for (const perk of TERMS.yearly.perks) {
    ok(`  en houdt "${perk}" van de jaartermijn`, term('prepaid').perks.includes(perk), true);
  }
  ok('hij schuift minstens even lang door', rolloverMonths('prepaid') >= rolloverMonths('yearly'), true);
  ok('Studio krijgt het merkmodel er ook op', hasBrandModel('studio', 'prepaid'), true);
}

console.log('\nhet bedrag dat de klant afrekent is exact en niet afgerond');
{
  /* REGEL 1. monthlyCents() rondt op hele euro's af omdat € 658,33 op een
     prijspagina een prijs is die niemand heeft bedacht. Twaalf keer € 658 is
     € 7.896 en tien keer € 790 is € 7.900 — die vier euro mag niet op de factuur
     terechtkomen. */
  for (const id of PLAN_IDS) {
    const betaald = prepayPaidMonths(id);
    ok(`${id}: het jaartotaal is ${betaald} hele maanden`,
      prepayTotalCents(id), PLAN_AMOUNT[id] * betaald * 100);
    ok('  en termTotalCents geeft precies datzelfde bedrag',
      termTotalCents(id, 'prepaid'), prepayTotalCents(id));
    /* En het is NIET twaalf keer het afgeronde maandbedrag. Op alle drie de
       plannen scheelt dat een paar euro; precies daarvoor bestaat
       prepayTotalCents(). Zou deze regel ooit `true` worden, dan is de afronding
       op de factuur beland. */
    ok('  en niet twaalf afgeronde maandbedragen',
      termTotalCents(id, 'prepaid') === monthlyCents(id, 'prepaid') * 12, false);
  }
  ok('betaalde plus gratis maanden zijn samen twaalf',
    PLAN_IDS.every((id) => prepayPaidMonths(id) + prepayFreeMonths(id) === 12), true);
  ok('een onbekend plan gooit', (() => { try { prepayTotalCents('goud'); return false; } catch { return true; } })(), true);
}

console.log('\nvooruitbetalen is op elk plan goedkoper, en het voordeel loopt op');
{
  /* REGEL 5. Zonder dit vraagt de pagina om geld vooruit voor niets. */
  for (const id of PLAN_IDS) {
    ok(`${id}: goedkoper dan twaalf losse maanden`,
      prepayTotalCents(id) < PLAN_AMOUNT[id] * 12 * 100, true);
    ok('  en goedkoper dan dezelfde twaalf op de jaartermijn',
      prepayTotalCents(id) < termTotalCents(id, 'yearly'), true);
    ok('  het voordeel is precies de gratis maanden',
      prepaySaveCents(id), PLAN_AMOUNT[id] * prepayFreeMonths(id) * 100);
    ok('  en er is er minstens één', prepayFreeMonths(id) >= 1, true);
  }
  /* WAT DE KLANT LEEST, LOOPT OPLOPEND — hij vergelijkt euro's en geen maanden.
     Dit is de toets die de verdeling 3-2-1 mag laten bestaan. */
  const besparingen = PLAN_IDS.map((id) => prepaySaveCents(id));
  ok('een groter plan bespaart nooit minder dan een kleiner',
    besparingen.every((c, i) => i === 0 || c >= besparingen[i - 1]), true);
}

console.log('\nen geen enkel plan zakt door de vooruitbodem');
{
  const bodem = ladderFloorCents();
  const drempel = Math.round(bodem * PREPAY_FLOOR_SHARE);
  ok('de vooruitbodem is driekwart van de ladderbodem', drempel, Math.round(bodem * 0.75));
  for (const id of PLAN_IDS) {
    ok(`${id}: € ${(perProductCents(id, 'prepaid') / 100).toFixed(2)} per product, boven de vooruitbodem`,
      perProductCents(id, 'prepaid') >= drempel, true);
  }
  /* Zou iemand er drie keer twee van maken, dan hoort dit om te vallen. Deze
     toets rekent dat na zonder het bestand te veranderen. */
  const brandBij2 = Math.round((PLAN_AMOUNT.brand * 10 / 12) * 100 / 30);
  ok('drie keer twee gratis maanden zou Brand er wél doorheen duwen',
    brandBij2 < drempel, true);
}

console.log('\nen er komt geen geld terug — dat is waar de korting voor betaalt');
{
  /* REGEL 2. */
  ok('een vooruitbetaald jaar is niet terugbetaalbaar', PREPAY_REFUNDABLE, false);
  ok('en de teruggave is nul', prepayRefundCents(), 0);
  ok('de tekst zegt het, in het Nederlands', /geen geld terug/i.test(VOORUIT_COPY.nl.geenGeldTerug), true);
  ok('en in het Engels', /no refund/i.test(VOORUIT_COPY.en.geenGeldTerug), true);
}

console.log('\nwat er overblijft, komt per maand vrij en nooit in één keer');
{
  /* REGEL 3 — de reden dat dit bestand bestaat. */
  ok('stoppen na maand vier laat acht maanden open',
    restantMaanden('2026-01', '2026-04').length, 8);
  ok('en de eerste daarvan is de maand erná',
    restantMaanden('2026-01', '2026-04')[0], '2026-05');
  ok('over een jaargrens heen telt hij gewoon door',
    restantMaanden('2026-09', '2026-12').slice(0, 2), ['2027-01', '2027-02']);
  ok('wie in de laatste maand stopt, heeft niets open',
    restantMaanden('2026-01', '2026-12'), []);
  ok('en ná de termijn ook niet', restantMaanden('2026-01', '2027-06'), []);
  ok('stoppen vóór de start levert het hele jaar op',
    restantMaanden('2026-01', '2025-08').length, 12);
  ok('een onzinnige maand levert niets op', restantMaanden('ooit', '2026-04'), []);

  const t = restantTranches({ planId: 'brand', startMaand: '2026-01', gestoptNaMaand: '2026-04' });
  ok('er is één tranche per openstaande maand', t.length, 8);
  ok('elke tranche komt in een andere maand vrij',
    new Set(t.map((x) => x.vrijVanaf)).size, 8);
  ok('en draagt het maandbudget van het plan',
    t[0].cents, Math.round(planBudget('brand') * 100));
  ok('het totaal is acht maanden budget',
    restantTotaalCents({ planId: 'brand', startMaand: '2026-01', gestoptNaMaand: '2026-04' }),
    Math.round(planBudget('brand') * 100) * 8);

  /* DE POORT. In de maand direct na het stoppen is er precies één maand
     besteedbaar — niet acht. Dit is Lucas' *"100 fotos op 1 dag"*. */
  ok('in de eerste maand erna is er één maand besteedbaar',
    beschikbaarCents(t, '2026-05'), t[0].cents);
  ok('in de derde maand erna drie', beschikbaarCents(t, '2026-07'), t[0].cents * 3);
  ok('en aan het eind van het jaar alles', beschikbaarCents(t, '2026-12'), t[0].cents * 8);
  ok('vóór de eerste vrijgave is er niets', beschikbaarCents(t, '2026-04'), 0);
  ok('een onzinnige maand geeft niets vrij', vrijgegeven(t, 'straks'), []);
  ok('rommel in plaats van tranches ook niet', vrijgegeven(null, '2026-12'), []);

  ok('een onbekend plan levert geen tranches op',
    restantTranches({ planId: 'goud', startMaand: '2026-01', gestoptNaMaand: '2026-04' }), []);
  ok('en een lege aanroep ook niet', restantTranches(), []);
}

console.log('\nde trede van het plan gaat mee, anders is het restant minder waard');
{
  /* REGEL 4. Zonder de trede zou een Brand-klant zijn € 1.950 tegen het tarief
     van één product uitgeven: dertien producten in plaats van dertig. */
  const t = restantTranches({ planId: 'brand', startMaand: '2026-01', gestoptNaMaand: '2026-11' });
  ok('de tranche draagt de trede van het plan', t[0].rung, planRung('brand'));
  const opTrede = budgetBuys(t[0].cents / 100, 'complete', t[0].rung);
  const opTredeEen = budgetBuys(t[0].cents / 100, 'complete', 1);
  ok('daarmee koopt hij wat het plan beloofde', opTrede, 30);
  ok('en zonder die trede zou hij minder krijgen', opTredeEen < opTrede, true);
  ok('hij past als tegoedregel in het grootboek', t[0].soort, 'topup');
}

console.log('\nde teksten zeggen wat er vóór het betalen bekend moet zijn');
{
  for (const l of ['nl', 'en']) {
    const c = VOORUIT_COPY[l];
    ok(`${l}: er is een label dat het jaar aanwijst`, !!c.label, true);
    ok(`${l}: het bedrag heeft een plek in de zin`, c.ineens.includes('{bedrag}'), true);
    ok(`${l}: en het aantal gratis maanden ook`, c.voordeel.includes('{gratis}'), true);
    /* Eén maand is geen "1 maanden" — een aparte zin en geen sjabloon met een s. */
    ok(`${l}: er is een aparte zin voor één maand`, /1 (maand|month)\b/.test(c.voordeelEen), true);
    ok(`${l}: het restant wordt uitgelegd`, c.restant.length > 40, true);
    ok(`${l}: en de reden erachter staat erbij`, c.waarom.length > 20, true);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
