/*
 * VISUAILS — HET MAANDBUDGET VAN EEN ABONNEMENT
 * 9 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Zie het meer als credits die je zelf kan uitgeven op wat je nodig
 * hebt. (…) Bedenk het creditsysteem en hoe je het abonnement simpeler en meer
 * gebruiksvriendelijker kan maken. (…) Denk dit idee uitgebreid uit en zoek goed
 * waar fouten of andere problemen kunnen ontstaan."*
 *
 * Dat laatste is wat dit bestand doet. src/data/budget.js draait zijn eigen
 * bouwcontroles bij elke build; hier staan de vragen die een BOUWCONTROLE NIET
 * KAN STELLEN, omdat ze over gedrag gaan in plaats van over vorm:
 *
 *   1. Kan een klant met hetzelfde budget méér werk kopen dan het plan aankan?
 *      Dat is de fout die geld kost en die niemand meldt: de factuur klopt, de
 *      week loopt vol. Getoetst met de echte verdelingen, niet met de aanname.
 *   2. Strandt er restbudget? De klassieke klacht over elk creditsysteem.
 *   3. Verandert de prijs van hetzelfde ding tussen plannen op een manier die
 *      een klant niet kan uitleggen? Dit is de reden dat de eenheid de euro is
 *      en geen credit — de proef hieronder rekent voor wat een vaste creditwaarde
 *      met een clip zou doen.
 *   4. Blijft de belofte op de prijskaart ("twaalf producten per maand") waar?
 */
import {
  BUDGET_MENU, MENU_IDS, menuItem, menuRate, menuPunten, planRung, planBudget,
  budgetFor, budgetBuys, spendTotal, budgetTable, SETUP_FEES, BUDGET_WEEK_SHARE,
} from '../src/data/budget.js';
import { PLAN_IDS, PLAN_SERVICE, productsFor, clipsFor, hasBrandModel } from '../src/data/plans.js';
import { PLAN_AMOUNT, AMOUNT, ladderRate, KIND_PUNTEN, puntenVoor } from '../src/data/pricing.js';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const gelijk = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : ' FAIL'} ${naam}${gelijk ? '' : `   verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

console.log('\nVISUAILS — het maandbudget\n');

console.log('het budget is de productiewaarde van wat het plan belooft');
{
  for (const id of PLAN_IDS) {
    const n = productsFor(id);
    const verwacht = n * ladderRate(PLAN_SERVICE, n) + (clipsFor(id) || 0) * AMOUNT.video;
    ok(`${id}: budget = ${n} × het tarief van zijn eigen trede`, planBudget(id), verwacht);
  }
  /* De belofte op de prijskaart. Als deze regel breekt, klopt "twaalf producten
     per maand" niet meer en is de pagina een leugen geworden. */
  for (const id of PLAN_IDS) {
    const rung = planRung(id);
    ok(`${id}: het budget koopt precies het beloofde aantal producten`,
      budgetBuys(planBudget(id) - (clipsFor(id) || 0) * AMOUNT.video, PLAN_SERVICE, rung), productsFor(id));
  }
  ok('een maand op maat rekent met dezelfde regel', budgetFor(12, 2), planBudget('studio'));
  ok('nul producten is nul budget', budgetFor(0), 0);
}

console.log('\nde trede hoort bij het contract en niet bij de bestelling');
{
  ok('starter rekent op de trede van 5', planRung('starter'), 5);
  ok('brand op die van 30', planRung('brand'), 30);
  /* Zou de trede meebewegen met wat er besteld wordt, dan zou een klant die zijn
     budget aan carrousels uitgeeft op een andere trede belanden en minder
     overhouden dan de pagina beloofde. */
  ok('en de trede verandert niet door wat er gekozen wordt',
    menuRate('catalog', planRung('brand')), ladderRate('catalog', 30));
  /* En een plan dat niet bestaat heeft geen trede. Zou hij hier terugvallen op de
     laagste, dan kreeg een gesleutelde plan-id stilletjes de DUURSTE tarieven en
     ging er nergens iets stuk — de vorm waarin een prijsfout zich verstopt. */
  let gooide = false;
  try { planRung('bestaat-niet'); } catch { gooide = true; }
  ok('een onbekend plan heeft geen trede en gooit', gooide, true);
}

console.log('\ngeen enkele verdeling koopt meer werk dan het plan aankan');
{
  /* DE CONTROLE DIE HET MODEL DRAAGT, en hier met de echte verdelingen in plaats
     van met de aanname. Voor elk plan wordt het HELE budget aan één menu-item
     uitgegeven; het resultaat mag nooit meer agendapunten opleveren dan waar het
     plan zelf op gerekend had. */
  for (const id of PLAN_IDS) {
    const rung = planRung(id);
    const budget = planBudget(id);
    const eigenPunten = puntenVoor(PLAN_SERVICE, productsFor(id))
      + (clipsFor(id) || 0) * (KIND_PUNTEN['video-motion'] || 0);
    for (const item of BUDGET_MENU.filter((i) => i.kind)) {
      const aantal = budgetBuys(budget, item.id, rung);
      const { punten } = spendTotal({ [item.id]: aantal }, rung);
      ok(`${id}: alles aan '${item.id}' blijft binnen ${eigenPunten} punten`, punten <= eigenPunten, true);
    }
  }
}

console.log('\neen restbedrag strandt niet');
{
  for (const id of PLAN_IDS) {
    const rung = planRung(id);
    const tarieven = MENU_IDS.map((m) => menuRate(m, rung));
    const kleinste = Math.min(...tarieven);
    /* Het ergste restje: één euro minder dan het goedkoopste hele product. Er moet
       dan nog steeds iets te koop zijn, anders is dat bedrag verloren. */
    const heleProducten = BUDGET_MENU.filter((i) => i.los).map((i) => menuRate(i.id, rung));
    const rest = Math.min(...heleProducten) - 1;
    const iets = MENU_IDS.some((m) => budgetBuys(rest, m, rung) > 0);
    ok(`${id}: met € ${rest} over is er nog iets te kiezen`, iets, true);
    ok(`${id}: en het kleinste item kost € ${kleinste}`, kleinste < Math.min(...heleProducten), true);
  }
}

console.log('\nwaarom de eenheid de euro is en geen credit');
{
  /* ── DE REKENSOM DIE HET BESLIST ────────────────────────────────────────
     Lucas' voorstel was 10 credits per product. Anker je de credit daarop, dan is
     één credit een tiende catalogset — en die is op elke trede een ander bedrag,
     terwijl een clip op elke trede € 69 kost. Deze proef rekent voor wat dat met
     de prijs van diezelfde clip doet, zodat de reden in de bank staat en niet
     alleen in een gesprek. */
  const creditsVoorClip = (rung) => Math.round(10 * AMOUNT.video / ladderRate('catalog', rung));
  const opStarter = creditsVoorClip(planRung('starter'));
  const opBrand = creditsVoorClip(planRung('brand'));
  ok('een clip zou op Starter 11 credits kosten', opStarter, 11);
  ok('en op Brand 18, terwijl hij in euro’s niets verandert', opBrand, 18);
  ok('dezelfde clip kost op elk plan hetzelfde bedrag',
    PLAN_IDS.map((id) => menuRate('video', planRung(id))), PLAN_IDS.map(() => AMOUNT.video));
  /* En de andere kant: een catalogset wordt in euro's WEL goedkoper op een groter
     plan, want die staat op de ladder. Dat hoort zo en moet zichtbaar blijven. */
  ok('een catalogset wordt op een groter plan wél goedkoper',
    menuRate('catalog', planRung('brand')) < menuRate('catalog', planRung('starter')), true);
}

console.log('\nhet menu klopt met de rest van de site');
{
  for (const item of BUDGET_MENU) {
    ok(`'${item.id}' is opzoekbaar`, menuItem(item.id)?.id, item.id);
    if (item.kind) {
      ok(`  en '${item.kind}' heeft een gewicht in de agenda`, typeof KIND_PUNTEN[item.kind], 'number');
    }
  }
  ok('een verzonnen item levert niets op', menuItem('gratis'), null);
  ok('en heeft geen tarief', menuRate('gratis', 5), null);
  ok('en telt niet mee in een verdeling', spendTotal({ gratis: 99 }, 5).euro, 0);
  /* Een verdeling met onzin erin mag niet stilletjes iets anders opleveren. */
  ok('negatieve aantallen tellen als nul', spendTotal({ catalog: -4 }, 5).euro, 0);
  ok('en een halve set wordt naar beneden afgerond', spendTotal({ catalog: 2.9 }, 5).euro, 2 * menuRate('catalog', 5));
}

console.log('\nde optelsom van een maand');
{
  const rung = planRung('studio');
  const maand = { catalog: 6, lifestyle: 4, video: 2 };
  const som = spendTotal(maand, rung);
  ok('het bedrag is de som van de regels',
    som.euro, 6 * menuRate('catalog', rung) + 4 * menuRate('lifestyle', rung) + 2 * AMOUNT.video);
  ok('en de beelden tellen mee', som.beelden, 6 * 4 + 4 * 3);
  ok('er staan drie regels in', som.regels.length, 3);
  ok('en die maand past in het budget van Studio', som.euro <= planBudget('studio'), true);
}

console.log('\nwat buiten het budget valt, valt er één keer buiten');
{
  ok('er zijn eenmalige opbouwkosten', SETUP_FEES.length > 0, true);
  ok('het merkmodel staat erbij tegen zijn eigen prijs',
    SETUP_FEES.filter((f) => f.id === 'brandModel')[0]?.bedrag, AMOUNT.brandModel);
  /* Lucas: *"Custom opties die een eenmalige setup vereisen hebben eerst een setup
     fee en vallen daarna ook onder hetzelfde systeem."* Het gebruik van een
     merkmodel mag dus GEEN menu-item zijn — dan zou het twee keer kosten. */
  ok('en het gebruik ervan staat niet op het menu', MENU_IDS.includes('brandModel'), false);
}

console.log('\nde plannen beloven alle drie ongeveer evenveel');
{
  const korting = (id) => {
    const waarde = planBudget(id) + (hasBrandModel(id, 'monthly') ? AMOUNT.brandModel : 0);
    return 1 - PLAN_AMOUNT[id] / waarde;
  };
  const alle = PLAN_IDS.map(korting);
  for (const [i, id] of PLAN_IDS.entries()) {
    ok(`${id} geeft korting op de losse prijs`, alle[i] > 0, true);
  }
  /* Deze regel is de reden dat ik Lucas eerst verkeerd heb geadviseerd: met de
     CATALOGprijs gerekend leek Brand er ver uit te lopen, en met de prijs van de
     dienst die een abonnement echt levert (complete) plus het merkmodel dat erbij
     zit, ligt hij binnen vier punten van de andere twee. De proef legt dat vast. */
  ok('en de drie liggen binnen vijftien punten van elkaar',
    Math.max(...alle) - Math.min(...alle) < 0.15, true);
}

console.log('\nhet weekdeel begrenst de planning en niet de prijs');
{
  ok('een week draagt hoogstens een deel van de maand', BUDGET_WEEK_SHARE > 0 && BUDGET_WEEK_SHARE <= 1, true);
  ok('en niet de hele maand', BUDGET_WEEK_SHARE < 1, true);
}

console.log('\nde tabel op het scherm rekent en typt niet');
{
  const rij = budgetTable('studio', 'nl');
  ok('er staat een regel per los item', rij.length, BUDGET_MENU.filter((i) => i.los).length);
  const cat = rij.filter((r) => r.id === 'catalog')[0];
  ok('en het maximum klopt met het budget',
    cat.maximaal, Math.floor(planBudget('studio') / menuRate('catalog', planRung('studio'))));
  ok('het tarief staat er als tekst bij', typeof cat.tariefTekst, 'string');
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
