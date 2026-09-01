/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE MAAND OP MAAT — ÉÉN REGEL, DRIE ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 31 augustus 2026: *"Ik wil dat klanten zelf kunnen beslissen hoe ze hun
 * maand ingevuld willen hebben."* Plus twee regels erbij: wie precies de vorm van
 * een bestaand plan bestelt, hoort dat plan aangeboden te krijgen, en een abonnee
 * kan losse diensten bijkopen voor de gewone prijs.
 *
 * Dit bestand controleert de drie dingen die daaraan fout kunnen gaan zonder dat
 * er iets omvalt:
 *
 *   1. de opslag drijft van de ladder af, en de maand op maat wordt een tweede
 *      prijslijst in plaats van een andere manier om dezelfde ladder te lezen;
 *   2. een plan verliest zijn eigen vorm — wie precies Starter wil, is goedkoper
 *      uit met iets anders, en dan is het plan een val;
 *   3. het formulier stuurt een klant naar de duurste van de drie routes.
 *
 * De bedragen hieronder staan met de hand ingetypt, en dat is met opzet. Ze komen
 * uit het voorstel dat Lucas heeft goedgekeurd; zou een tarief in LADDER
 * veranderen, dan hoort deze test om te vallen met het oude en het nieuwe getal
 * ernaast — niet mee te bewegen en te blijven zwijgen.
 */

import {
  AMOUNT,
  CUSTOM_MONTH_MIN_PRODUCTS,
  KIND_IMAGES,
  LADDER,
  PLAN_AMOUNT,
  PLAN_SLOTS,
  addOnRate,
  cheapestRoute,
  customMonthTotal,
  ladderRate,
  ladderTotal,
} from '../src/data/pricing.js';

let goed = 0;
let totaal = 0;

function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

/* ══ 1 · DE OPSLAG IS HET VERSCHIL EN NIETS ANDERS ════════════════════════ */
console.log('\nde opslag komt uit de ladder en niet ergens anders vandaan');
{
  check('de vier tredes', [1, 5, 10, 20].map((n) => addOnRate(n)), [60, 44, 34, 26]);
  check('en elke trede is complete min catalog',
    [1, 5, 10, 20].filter((n) => addOnRate(n) !== ladderRate('complete', n) - ladderRate('catalog', n)), []);

  /* DE CONTROLE DIE ALLES DRAAGT: alles-met-carrousel is per definitie compleet.
     Klopt dit niet, dan is de maand op maat een tweede prijslijst geworden. */
  for (const [lo] of LADDER.complete) {
    check(`${lo} producten met evenveel carrousels is ${lo} complete producten`,
      customMonthTotal({ products: lo, carousels: lo }).total, ladderTotal('complete', lo));
  }
  check('en zonder carrousels is het gewoon de catalogladder',
    customMonthTotal({ products: 20 }).total, ladderTotal('catalog', 20));
}

/* ══ 2 · DE NEGEN MAANDEN UIT HET VOORSTEL ═══════════════════════════════ */
console.log('\nde doorgerekende maanden kloppen nog');
{
  const maanden = [
    [{ products: 5 }, 325, 20],
    [{ products: 5, carousels: 5 }, 545, 35],
    [{ products: 10, carousels: 3 }, 612, 49],
    [{ products: 12, carousels: 12, clips: 2 }, 1158, 84],
    [{ products: 20, carousels: 5 }, 910, 95],
    [{ products: 20, carousels: 10 }, 1040, 110],
    [{ products: 20, carousels: 20 }, 1300, 140],
    [{ products: 30, carousels: 8, clips: 4 }, 1654, 144],
    [{ products: 30, carousels: 30 }, 1950, 210],
  ];
  for (const [maand, bedrag, beelden] of maanden) {
    const uit = customMonthTotal(maand);
    const naam = `${maand.products}·${maand.carousels || 0}·${maand.clips || 0}`;
    check(`${naam} kost € ${bedrag}`, uit.total, bedrag);
    check(`${naam} levert ${beelden} beelden`, uit.images, beelden);
  }

  /* Lucas' eigen voorbeeld, en waar de besparing vandaan komt: dezelfde inhoud in
     twee losse bestellingen, elk op zijn eigen trede. Geen bedachte korting. */
  const los = ladderTotal('catalog', 20) + ladderTotal('lifestyle', 5);
  check('twintig met vijf carrousels los besteld', los, 1190);
  check('en de maand op maat scheelt daar € 280 op', los - customMonthTotal({ products: 20, carousels: 5 }).total, 280);
}

/* ══ 3 · DE VORM ZELF ═════════════════════════════════════════════════════ */
console.log('\nde regel laat niet toe wat de dienst niet is');
{
  check('meer carrousels dan producten kan niet', (() => {
    try { customMonthTotal({ products: 4, carousels: 5 }); return 'geen fout'; } catch { return 'geweigerd'; }
  })(), 'geweigerd');
  check('nul producten ook niet', (() => {
    try { customMonthTotal({ products: 0 }); return 'geen fout'; } catch { return 'geweigerd'; }
  })(), 'geweigerd');
  check('de ondergrens is vijf', CUSTOM_MONTH_MIN_PRODUCTS, 5);
  check('en dat is hetzelfde aantal als Starter', CUSTOM_MONTH_MIN_PRODUCTS, PLAN_SLOTS.starter.complete);
  check('een clip kost het gewone videotarief',
    customMonthTotal({ products: 5, clips: 3 }).total - customMonthTotal({ products: 5 }).total, 3 * AMOUNT.video);
}

/* ══ 4 · DRIE ROUTES, EN DE KLANT KRIJGT DE GOEDKOOPSTE ══════════════════ */
console.log('\nhet formulier wijst nooit naar de duurste route');
{
  // Precies de vorm van een plan: het plan wint, zonder bijkopen.
  for (const id of Object.keys(PLAN_AMOUNT)) {
    const n = PLAN_SLOTS[id].complete;
    const k = PLAN_SLOTS[id]['video-motion'] || 0;
    const w = cheapestRoute({ products: n, carousels: n, clips: k }).winner;
    check(`wie precies ${id} bestelt, krijgt ${id}`, [w.kind, w.plan], ['plan', id]);
    check(`en betaalt de planprijs`, w.total, PLAN_AMOUNT[id]);
  }

  /* NET BOVEN EEN PLAN IS BIJKOPEN GOEDKOPER DAN OPNIEUW BEGINNEN. Dit was de
     scherpe rand in het voorstel: zonder bijkopen kostte het dertiende product
     € 453, met bijkopen € 149 — het gewone tarief van één los product. */
  const dertien = cheapestRoute({ products: 13, carousels: 13, clips: 2 }).winner;
  check('dertien complete producten gaan via Studio plus bijkopen',
    [dertien.kind, dertien.plan, dertien.total], ['plan+extra', 'studio', 939]);
  check('en dat ene extra product kost het gewone laddertarief',
    dertien.total - PLAN_AMOUNT.studio, ladderRate('complete', 1));

  // De vorm waar geen plan voor bestaat: daar wint de maand op maat.
  const eigen = cheapestRoute({ products: 20, carousels: 5 }).winner;
  check('twintig producten met vijf carrousels gaat op maat', [eigen.kind, eigen.total], ['custom', 910]);

  /* EN DE WINNAAR IS ECHT DE GOEDKOOPSTE — over het hele bereik, niet alleen op de
     plekken die ik heb uitgekozen. Dit is de assertie die een fout in de
     vergelijking vangt zonder dat ik hem hoef te voorspellen. */
  const fout = [];
  for (let n = CUSTOM_MONTH_MIN_PRODUCTS; n <= 40; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      const r = cheapestRoute({ products: n, carousels: m });
      const laagste = Math.min(...r.options.map((o) => o.total));
      if (r.winner.total !== laagste) fout.push(`${n}·${m}`);
    }
  }
  check('over 700 samenstellingen wint altijd het laagste bedrag', fout, []);

  /* EN GEEN ENKELE ROUTE IS DUURDER DAN DE INHOUD LOS BESTELLEN. Zou dat wel zo
     zijn, dan is een abonnement op die plek een straf op vooruit plannen. */
  const straf = [];
  for (let n = CUSTOM_MONTH_MIN_PRODUCTS; n <= 40; n += 1) {
    for (const m of [0, Math.ceil(n / 2), n]) {
      const los = ladderTotal('catalog', n) + (m ? ladderTotal('lifestyle', m) : 0);
      if (cheapestRoute({ products: n, carousels: m }).winner.total > los) straf.push(`${n}·${m}`);
    }
  }
  check('en nergens duurder dan dezelfde inhoud los bestellen', straf, []);
}

/* ══ 5 · WAT DE MAAND IN DE AGENDA WEEGT ═════════════════════════════════ */
console.log('\nde maand weegt in dezelfde eenheid als de agenda');
{
  check('een catalogproduct weegt vier beelden',
    customMonthTotal({ products: 1 }).images, KIND_IMAGES.catalog);
  check('en met carrousel zeven', customMonthTotal({ products: 1, carousels: 1 }).images, KIND_IMAGES.complete);
  check('twintig met vijf carrousels weegt 95 beelden',
    customMonthTotal({ products: 20, carousels: 5 }).images, 20 * KIND_IMAGES.catalog + 5 * KIND_IMAGES.lifestyle);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
