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
 *   3 · OPZEGGEN LAAT HET JAAR DOORLOPEN (sinds 24 september 2026; eerder werd
 *       het restant tegoed). De teksten zeggen dat en niets anders.
 *   4 · VOORUITBETALEN IS ALTIJD GOEDKOPER dan dezelfde twaalf maanden per maand.
 */
import {
  PLAN_IDS, TERMS, TERM_IDS, isPrepaid, term,
  prepayFreeMonths, prepayPaidMonths, prepayTotalCents, prepaySaveCents,
  termTotalCents, monthlyCents, perProductCents, ladderFloorCents,
  PREPAY_FLOOR_SHARE, rolloverMonths, hasBrandModel,
} from '../src/data/plans.js';
import { PREPAY_REFUNDABLE, prepayRefundCents, VOORUIT_COPY } from '../src/data/vooruit.js';
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
    /* ── WAAROM HIER GEEN VASTE UITKOMST STAAT — 10 september 2026 ─────────
       Deze regel eiste eerst dat het jaartotaal NOOIT gelijk is aan twaalf keer
       het afgeronde maandbedrag, want daar zat op 3-2-1 bij alle drie de plannen
       een paar euro tussen. Op twee gratis maanden valt Starter precies goed uit
       (12 × € 325 = € 3.900 = 10 × € 390) en Studio en Brand niet.

       Dat de twee soms samenvallen is geen fout — het is afronding die toevallig
       nul is. Wat bewaakt moet worden is dat er ALTIJD uit prepayTotalCents()
       wordt gerekend en niet uit het maandbedrag, en dat staat twee regels
       hierboven. Deze regel meet dus nog maar één ding: dat het verschil tussen de
       twee manieren AFRONDING is en geen andere rekensom. Twaalf maanden die elk
       hooguit een halve euro afwijken, kunnen samen niet meer dan zes euro
       schelen — alles daarboven betekent dat er ergens een ander getal in staat.
       De richting doet er niet toe: € 658 × 12 is € 7.896 en de factuur € 7.900,
       dus hij kan ook naar beneden afwijken. */
    const viaMaand = monthlyCents(id, 'prepaid') * 12;
    ok('  het verschil met het maandbedrag is afronding en niet meer',
      Math.abs(viaMaand - termTotalCents(id, 'prepaid')) <= 600, true);
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
  /* Zeventig procent sinds 10 september; hij stond op 75 en ging mee omlaag toen
     Lucas voor twee gratis maanden op elk plan koos. Zie PREPAY_FLOOR_SHARE. */
  ok('de vooruitbodem is zeventig procent van de ladderbodem', drempel, Math.round(bodem * 0.70));
  for (const id of PLAN_IDS) {
    ok(`${id}: € ${(perProductCents(id, 'prepaid') / 100).toFixed(2)} per product, boven de vooruitbodem`,
      perProductCents(id, 'prepaid') >= drempel, true);
  }
  /* DE TEGENPROEF. De grens moet nog ergens bijten, anders is hij een getal
     zonder werk. Bij twee gratis maanden komt Brand op 72% en past hij; bij drie
     op 65% en valt de build om. Deze regel rekent dat na zonder het bestand te
     veranderen — en hij is de reden dat de grens verlaagd is en niet uitgezet. */
  const brandBij3 = Math.round((PLAN_AMOUNT.brand * 9 / 12) * 100 / 30);
  ok('drie gratis maanden zouden Brand er wél doorheen duwen',
    brandBij3 < drempel, true);
}

console.log('\nen er komt geen geld terug — dat is waar de korting voor betaalt');
{
  /* REGEL 2. */
  ok('een vooruitbetaald jaar is niet terugbetaalbaar', PREPAY_REFUNDABLE, false);
  ok('en de teruggave is nul', prepayRefundCents(), 0);
  ok('de tekst zegt het, in het Nederlands', /geen geld terug/i.test(VOORUIT_COPY.nl.geenGeldTerug), true);
  ok('en in het Engels', /no refund/i.test(VOORUIT_COPY.en.geenGeldTerug), true);
}

console.log('\nopzeggen: het jaar loopt door tot het einde (24 september 2026)');
{
  /* Lucas: "Het abonnement moet gewoon simpelweg doorlopen tot einde van het
     jaar." Het omzetten in tegoed is weg — de tekst mag het ook niet meer
     beloven. De werking zelf staat in tests/abo-vooruitbetaald.test.mjs. */
  ok('nl: de tekst zegt dat het jaar doorloopt', /loopt je jaar gewoon door tot het einde/.test(VOORUIT_COPY.nl.restant), true);
  ok('en: the text says the year runs on', /runs on to the end/.test(VOORUIT_COPY.en.restant), true);
  ok('nl: en belooft geen tegoed meer', /tegoed/i.test(VOORUIT_COPY.nl.restant), false);
  ok('en: and no longer promises credit', /\bcredit\b(?!s)/i.test(VOORUIT_COPY.en.restant), false);
  ok('nl: het verlengt niet vanzelf', /verlengt nooit vanzelf/.test(VOORUIT_COPY.nl.restant), true);
  ok('en: it never renews by itself', /never renews by itself/.test(VOORUIT_COPY.en.restant), true);
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
    ok(`${l}: wat er bij opzeggen gebeurt, wordt uitgelegd`, c.restant.length > 40, true);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
