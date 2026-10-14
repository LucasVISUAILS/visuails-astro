/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE MAAND OP MAAT — IN CREDITS, OP DE LIJN VAN DE DRIE PLANNEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 31 augustus 2026: *"Ik wil dat klanten zelf kunnen beslissen hoe ze hun
 * maand ingevuld willen hebben."* Dat werd eerst een maand in producten: een
 * aantal catalogsets met een opslag per carrousel (het verschil tussen de
 * complete- en de catalogtrede), en een vergelijker die het goedkoopste van drie
 * routes koos. Sinds 23 september 2026 is een maand op maat een aantal credits
 * (zie de kop bij CUSTOM_CREDITS_MIN in pricing.js), en sinds 14 oktober 2026 is
 * er ook geen complete-trede meer om een opslag uit af te leiden (afvinklijst 23:
 * "het is het één of het ander"). De oude functies zijn weg.
 *
 * Dit bestand bewaakte de oude regel en bewaakt nu de nieuwe, met dezelfde drie
 * vragen:
 *
 *   1. drijft de maand op maat af van de plannen, zodat hij een tweede prijslijst
 *      wordt in plaats van een punt op dezelfde lijn?
 *   2. verliest een plan zijn eigen vorm — wie precies Starter wil, is goedkoper
 *      uit met een maat?
 *   3. laat de regel iets toe wat het formulier niet aanbiedt?
 *
 * De bedragen staan met de hand ingetypt, met opzet: verandert er een plan, dan
 * hoort deze test om te vallen met het oude en het nieuwe getal ernaast.
 */

import * as P from '../src/data/pricing.js';

const {
  PLAN_AMOUNT, PLAN_CREDITS, CUSTOM_CREDITS_MIN, CUSTOM_CREDITS_MAX, CUSTOM_CREDITS_STEP,
  customCreditsTotal, isCustomCredits, creditRateCents,
} = P;

let goed = 0;
let totaal = 0;

function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

/* ══ 0 · DE OUDE MAAND IN PRODUCTEN IS WEG ═══════════════════════════════ */
console.log('\nde oude maand in producten is weg');
{
  for (const naam of ['addOnRate', 'customMonthTotal', 'customMonthSlots', 'cheapestRoute', 'assertCustomMonth']) {
    check(`pricing.js exporteert geen ${naam} meer`, naam in P, false);
  }
  check('en er is geen complete-trede om een opslag uit te halen', 'complete' in P.LADDER, false);
}

/* ══ 1 · EEN PLAN IS EEN PUNT OP DE LIJN ═════════════════════════════════ */
console.log('\neen maand die precies een plan is, is dat plan');
{
  for (const id of Object.keys(PLAN_CREDITS)) {
    const r = customCreditsTotal(PLAN_CREDITS[id]);
    check(`${PLAN_CREDITS[id]} credits is ${id}`, [r.preset, r.total], [id, PLAN_AMOUNT[id]]);
  }
  check('de drie plannen: 45 · 120 · 290 credits', Object.values(PLAN_CREDITS), [45, 120, 290]);
  check('voor € 390 · € 790 · € 1.690', Object.values(PLAN_AMOUNT), [390, 790, 1690]);
}

/* ══ 2 · MEER CREDITS KOST MEER, MAAR ELKE CREDIT WORDT GOEDKOPER ════════ */
console.log('\nde lijn loopt de goede kant op');
{
  const duurder = [];
  const perCreditOmhoog = [];
  for (let n = CUSTOM_CREDITS_MIN; n < CUSTOM_CREDITS_MAX; n += CUSTOM_CREDITS_STEP) {
    const a = customCreditsTotal(n);
    const b = customCreditsTotal(n + CUSTOM_CREDITS_STEP);
    if (!(b.total >= a.total)) duurder.push(n);
    if (creditRateCents(n + CUSTOM_CREDITS_STEP) > creditRateCents(n) + 1e-9) perCreditOmhoog.push(n);
  }
  check('meer credits kost nooit minder', duurder, []);
  check('en een credit wordt nooit duurder als je er meer neemt', perCreditOmhoog, []);

  /* Een plan is nooit een slechte keuze: een maat net onder een plan is per
     credit nooit goedkoper dan dat plan. */
  const planSlechter = [];
  for (const id of Object.keys(PLAN_CREDITS)) {
    const planPer = PLAN_AMOUNT[id] / PLAN_CREDITS[id];
    for (let n = CUSTOM_CREDITS_MIN; n < PLAN_CREDITS[id]; n += CUSTOM_CREDITS_STEP) {
      if (customCreditsTotal(n).total / n < planPer - 0.005) planSlechter.push(`${id}·${n}`);
    }
  }
  check('onder een plan is een maat per credit nooit goedkoper', planSlechter, []);
  check('de kleinste maand: 30 credits voor € 272', customCreditsTotal(30).total, 272);
  check('de grootste: 300 credits voor € 1.748', customCreditsTotal(300).total, 1748);
}

/* ══ 3 · DE REGEL LAAT NIET TOE WAT HET FORMULIER NIET AANBIEDT ══════════ */
console.log('\nde regel laat niet toe wat het formulier niet aanbiedt');
{
  check('onder het minimum niet', isCustomCredits(CUSTOM_CREDITS_MIN - 1), false);
  check('boven het maximum niet', isCustomCredits(CUSTOM_CREDITS_MAX + 1), false);
  check('een half credit niet', isCustomCredits(45.5), false);
  check('en tekst ook niet', isCustomCredits('veel'), false);
  check('een ongeldige maat gooit in plaats van een bedrag te verzinnen', (() => {
    try { customCreditsTotal(10); return 'geen fout'; } catch { return 'geweigerd'; }
  })(), 'geweigerd');
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
