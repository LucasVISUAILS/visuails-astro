/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE BUNDELKORTING, ALS TEST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 25 augustus 2026: *"Bezoekers vinden het complete pakket verwarrend.
 * Bepaal of we het schrappen of verbeteren."*
 *
 * Het werd verbeteren, want de korting is echt: ongeveer een kwart op elke
 * trede. Wat ontbrak was dat het ergens STOND. Nu staat het op twee plekken —
 * onder elk Compleet-tarief in de tarieftabel op de homepage en op /pricing —
 * en dat maakt het een belofte. Dit bestand is de code die hem waarmaakt.
 *
 * ── WAAROM DIT NIET IN promises.test.mjs STAAT ─────────────────────────────
 *
 * Dat bestand bouwt de site en leest de gerenderde pagina's; het is traag en
 * het draait alleen als `dist/` compleet is. Deze controle heeft niets van de
 * site nodig — hij vergelijkt LADDER met zichzelf. Een rekenfout in de bundel
 * hoort binnen een seconde te vallen en niet na een bouw van twee minuten.
 *
 * Wat promises.test.mjs wél doet en dit bestand niet, is nakijken dat het
 * getal ook echt op de pagina staat. Die twee horen bij elkaar: hier de
 * rekensom, daar de weergave.
 */

import {
  LADDER, ladderRate, completeSaving, assertBundleSaving, BUNDLE_CLAIM,
} from '../src/data/pricing.js';

let goed = 0;
let totaal = 0;
function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

console.log('\nde bundel is op elke trede goedkoper dan de twee delen');
{
  /* NIET ÉÉN STEEKPROEF MAAR ALLE TREDEN. Een bundel die bij vier producten
     wint en bij dertig verliest, is precies het soort fout dat niemand ziet:
     de homepage toont het eerste tarief en de klant die het verschil merkt,
     zit al in het bestelformulier. */
  const stuk = [];
  for (const [lo, hi] of LADDER.complete) {
    const { apart, together, saved } = completeSaving(lo);
    if (saved <= 0) stuk.push(`${lo}–${hi ?? '∞'}: samen ${together}, los ${apart}`);
  }
  check('geen enkele trede waar los goedkoper is', stuk, []);
}

console.log('\nde korting blijft binnen wat de pagina’s beloven');
{
  /* De pagina's zeggen "ongeveer een kwart" / "about a quarter". Dat is geen
     precies getal en met opzet niet: het loopt van 24,7% op de eerste trede
     naar 26,1% op de laatste. Eén afgerond percentage zou op drie van de vier
     treden nét niet kloppen, en naar boven afronden is een hardere belofte dan
     de code waarmaakt. Deze controle bewaakt de marge waarbinnen het woord
     "kwart" nog eerlijk is. */
  const buiten = [];
  for (const [lo, hi] of LADDER.complete) {
    const { pct } = completeSaving(lo);
    if (pct < BUNDLE_CLAIM.min || pct > BUNDLE_CLAIM.max) {
      buiten.push(`${lo}–${hi ?? '∞'}: ${pct.toFixed(1)}%`);
    }
  }
  check('elke trede binnen de marge', buiten, []);
  check(`de marge is ${BUNDLE_CLAIM.min}–${BUNDLE_CLAIM.max}%`,
    [BUNDLE_CLAIM.min < 25, BUNDLE_CLAIM.max > 25], [true, true]);
}

console.log('\ncompleteSaving() rekent met de trede en niet met het aantal');
{
  /* Binnen één trede is het bedrag hetzelfde: 5 en 9 producten zitten allebei
     op [5, 9]. Dat lijkt triviaal tot iemand het per product gaat uitrekenen
     met het aantal in plaats van het tarief. */
  check('5 en 9 geven hetzelfde', completeSaving(5).saved, completeSaving(9).saved);
  check('en 4 en 5 niet', completeSaving(4).saved === completeSaving(5).saved, false);
  check('het bedrag daalt met de trede', [
    completeSaving(1).saved > completeSaving(5).saved,
    completeSaving(5).saved > completeSaving(10).saved,
    completeSaving(10).saved > completeSaving(20).saved,
  ], [true, true, true]);
}

console.log('\nhet bedrag klopt met de drie tarieven zoals ze op de pagina staan');
{
  /* Dezelfde som die een lezer maakt als hij de rij naleest. Staat hier iets
     anders dan wat de tabel afdrukt, dan liegt de groene regel. */
  for (const n of [1, 5, 10, 20]) {
    const c = ladderRate('catalog', n);
    const l = ladderRate('lifestyle', n);
    const k = ladderRate('complete', n);
    check(`bij ${n}: ${c} + ${l} − ${k}`, completeSaving(n).saved, c + l - k);
  }
}

console.log('\nde bouwcontrole valt om als de bundel zijn reden verliest');
{
  /* Zonder deze helft bewijst groen hierboven niets: een controle die niets
     afkeurt, keurt ook een kapotte ladder goed. Vierde keer dat dit patroon in
     dit project nodig is; zie tests/schrijfwijze.test.mjs. */
  check('assertBundleSaving() gooit nu niet', (() => {
    try { assertBundleSaving(); return 'stil'; } catch (e) { return e.message; }
  })(), 'stil');

  const bewaard = LADDER.complete.map((r) => [...r]);
  try {
    /* Complete duurder dan de delen — de bundel heeft dan geen bestaansrecht. */
    LADDER.complete[0][2] = ladderRate('catalog', 1) + ladderRate('lifestyle', 1) + 1;
    let gooide = false;
    try { assertBundleSaving(); } catch { gooide = true; }
    check('een duurdere bundel wordt gevonden', gooide, true);

    /* En een korting die zó klein is dat "een kwart" een leugen wordt. */
    LADDER.complete[0][2] = Math.round((ladderRate('catalog', 1) + ladderRate('lifestyle', 1)) * 0.95);
    let gooide2 = false;
    try { assertBundleSaving(); } catch { gooide2 = true; }
    check('een te kleine korting ook', gooide2, true);
  } finally {
    bewaard.forEach((r, i) => { LADDER.complete[i][2] = r[2]; });
  }
  check('en de ladder staat daarna weer zoals hij was', LADDER.complete.map((r) => r[2]), bewaard.map((r) => r[2]));
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
