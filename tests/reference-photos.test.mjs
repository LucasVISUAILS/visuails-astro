/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET PLUSJE: NOG EEN FOTO VAN HETZELFDE PRODUCT, GRATIS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 13 augustus 2026: *"Ook wil ik dat het mogelijk word voor een bezoeker om
 * meer foto's toe te voegen van zijn product kosteloos door op een plusje naast de
 * 4 aanbevolen foto's te klikken. Dit zorgt ervoor dat ze meer details kunnen laten
 * zien maar wel gewoon 4 foto's in totaal krijgen, wel moet de optie voor een extra
 * foto behouden worden als apart vak die gewoon de huidige extra prijs behouden."*
 *
 * ── WAT DIT BESTAND BEWAAKT, EN WAAROM HET ÉÉN ZIN IS ──────────────────────
 *
 * Twee dingen die op elkaar lijken en niet hetzelfde zijn:
 *
 *   REFERENTIE (`ref1`…)  GRATIS · INVOER · levert geen beeld op
 *   EXTRA      (`extra1`…) BETAALD · UITVOER · prijs uit EXTRA_PHOTO_LADDER
 *
 * De dag dat die twee één woord delen, is de dag dat een gratis vakje wordt
 * geprijsd of een betaald vakje gratis wordt geleverd. Beide fouten kosten geld en
 * beide zijn stil. Vandaar dat hier niet zozeer getoetst wordt DAT het plusje
 * bestaat, maar dat de twee begrippen nergens in elkaar overlopen: niet in de
 * prijs, niet in het aantal geleverde beelden, niet in de bovengrens van de batch.
 *
 * ── GEMETEN IN EEN ECHTE BROWSER, EN DAT STAAT HIER NIET ───────────────────
 *
 * Op 13 augustus 2026 met Chromium tegen dist/: vier keer klikken geeft ref1..ref4
 * en dan verdwijnt de knop; de tweede productkaart blijft onaangeroerd; het
 * betaalde vak staat er nog; de weghaalknop staat op precies één vakje. Die laatste
 * kwam uit de meting en niet uit het nadenken — hij stond eerst op alle vier, en
 * dan verlaagt een klik op ref2 de teller terwijl ref3 blijft bestaan, waarna het
 * volgende plusje een id maakt dat er al is. Dat is de reden dat paintAll() bestaat.
 */
import { readFileSync } from 'node:fs';
import {
  REF_SHOT_PREFIX, MAX_REF_PER_PRODUCT, refShotId, isRefShotId, refShotNumber,
  isShotId, isExtraShotId, extraShotId, SHOT_IDS, isRequiredShot,
} from '../src/data/shots.js';
import { MAX_EXTRA_PER_PRODUCT } from '../src/data/pricing.js';
import { MAX_BATCH_FILES } from '../src/lib/uploads.js';
import { ATTENDED_PER_WINDOW } from '../src/data/capacity.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

console.log('de twee soorten vakjes lopen nergens in elkaar over');
{
  ok('een referentievak is geen extra', isExtraShotId(refShotId(1)), false);
  ok('en een extra is geen referentievak', isRefShotId(extraShotId(1)), false);
  ok('geen enkele vaste hoek heet ref-iets', SHOT_IDS.some((id) => isRefShotId(id)), false);
  /* De prefix is het hele mechanisme. Staat hij hier als losse letters, dan is dit
     de plek waar hij ooit stil uit elkaar loopt met shots.js. */
  ok('de prefix komt uit de bron', refShotId(2), `${REF_SHOT_PREFIX}2`);
  ok('en het nummer komt er weer uit', refShotNumber(refShotId(3)), 3);
  ok('uit een extra komt geen referentienummer', refShotNumber(extraShotId(3)), 0);

  /* GESLOTEN VERZAMELING. Alles wat isShotId() niet kent, komt bij /api/upload
     terug als 400 bad-shot — dus een referentievak dat hier zou ontbreken, zou
     precies zo stil mislukken als de extra's dat voor 8 augustus 2026 deden. */
  for (let i = 1; i <= MAX_REF_PER_PRODUCT; i++) {
    ok(`/api/upload kent ${refShotId(i)}`, isShotId(refShotId(i)), true);
  }
  ok('en het vakje één boven de grens niet', isShotId(refShotId(MAX_REF_PER_PRODUCT + 1)), false);
  ok('ref0 bestaat niet', isRefShotId('ref0'), false);
  ok('en ref01 ook niet', isRefShotId('ref01'), false);
}

console.log('\nhet is gratis, en niets in de prijs weet ervan');
{
  /* DE KERN VAN DE HELE FEATURE, in twee regels. Een referentievak mag nergens in
     een bedrag opduiken; als het ooit in EXTRA_PHOTO_LADDER of in de teller
     terechtkomt, betaalt een klant voor materiaal dat hij ONS stuurt. */
  const pricing = read('src/data/pricing.js');
  ok('pricing.js kent het woord referentievak niet als prijsregel',
    /EXTRA_PHOTO_LADDER[\s\S]{0,400}ref[0-9]/.test(pricing), false);
  const pl = read('src/scripts/pipeline.js');
  /* extrasCount() voedt het totaal. Hij telt card.extra — de keuzelijst van het
     BETAALDE vak — en mag nooit over card.refs of over card.slots lopen. */
  const teller = pl.slice(pl.indexOf('function extrasCount()'), pl.indexOf('function extrasCount()') + 300);
  ok('de teller voor het totaal raakt de referentievakken niet',
    /refs|ref[0-9]|refShot/.test(teller), false);
  ok('en telt het betaalde vak', /card\.extra/.test(teller), true);
}

console.log('\nen de klant krijgt er geen beeld bij');
{
  /* Wat een bestelling OPLEVERT hangt aan SHOT_IDS en aan de extra's, en niet aan
     wat er binnenkomt. cardReady() en de voortgangsregel lopen daarom over
     SHOT_IDS en niet over card.slots — dat is ook wat een referentievak ongevaarlijk
     maakt: het kan een kaart nooit onvolledig maken. */
  const pl = read('src/scripts/pipeline.js');
  const ready = pl.slice(pl.indexOf('function cardReady('), pl.indexOf('function cardReady(') + 700);
  ok('cardReady loopt over de vaste hoeken', /SHOT_IDS/.test(ready), true);
  ok('en niet over de referentievakken', /refs|refShot/.test(ready), false);
  /* Geen enkel referentievak is verplicht. Zou dat wel zo zijn, dan blokkeert
     gratis materiaal een betaalde bestelling. */
  ok('geen referentievak is verplicht',
    Array.from({ length: MAX_REF_PER_PRODUCT }, (_, i) => isRequiredShot(refShotId(i + 1))).some(Boolean), false);
}

console.log('\nde batchgrens rekent er wél mee');
{
  /* HET PLAFOND BESTAAT ECHT: elk vakje is een bestand dat naar R2 gaat. Op 12
     augustus 2026 stond MAX_BATCH_FILES onder het aantal vakjes dat het formulier
     kan tekenen, en dan kan een betalende klant zijn bestelling fysiek niet
     uploaden. Deze som is de enige plek waar die twee elkaar raken. */
  const perProduct = SHOT_IDS.length + MAX_EXTRA_PER_PRODUCT + MAX_REF_PER_PRODUCT;
  ok('het plafond dekt elk vakje dat het formulier kan tekenen',
    MAX_BATCH_FILES >= ATTENDED_PER_WINDOW * perProduct, true,
    `${MAX_BATCH_FILES} < ${ATTENDED_PER_WINDOW} × ${perProduct}`);
  ok('en het is niet onbegrensd', Number.isFinite(MAX_BATCH_FILES) && MAX_BATCH_FILES > 0, true);
}

console.log('\nhet plusje staat er, naast de vier');
{
  const pl = read('src/scripts/pipeline.js');
  ok('buildRefs bestaat', /function buildRefs\(card, slots\)/.test(pl), true);
  /* IN het raster van de vier en niet in een blok eronder — dat is letterlijk wat
     Lucas beschreef: *"een plusje naast de 4 aanbevolen foto's"*. */
  ok('en wordt in het slotraster gehangen',
    /SHOT_IDS\.forEach\(\(id\) => slots\.appendChild\(buildSlot\(card, id\)\)\);[\s\S]{0,400}buildRefs\(card, slots\);/.test(pl), true);
  ok('het maximum komt uit de config en niet uit een getal hier',
    /Number\(cfg\.maxRefPerProduct\)/.test(pl), true);
  ok('en de knop verdwijnt als het vol is', /add\.hidden = vol;/.test(pl), true);

  /* GEEN OVERSLAAN-KNOP. Bij een vakje dat je zelf hebt aangevraagd is "deze sla
     ik over" geen keuze maar een raadsel, en de kaart vraagt er nooit om. */
  ok('een referentievak krijgt geen overslaan-knop',
    /const skipBtn = \(isRequiredShot\(id\) \|\| extraSlotNumber\(id\) \|\| refShotNumber\(id\)\)/.test(pl), true);
  /* WEL een weghaalknop, en alleen op het laatste — anders loopt de nummering
     stuk. Zie de kop van dit bestand voor de meting die dat aan het licht bracht. */
  ok('maar wel een weghaalknop', /const dropBtn = !refShotNumber\(id\) \? null :/.test(pl), true);
  ok('  alleen op het laatste vakje',
    /el\.dropBtn\.hidden = filled \|\| refShotNumber\(id\) !== \(card\.refs \|\| 0\)/.test(pl), true);
  ok('  en elk vakje wordt opnieuw geschilderd als er een bij komt',
    /const paintAll = \(\) => \{/.test(pl), true);

  /* De bak met losse bestanden moet ze ook kunnen bereiken, anders werkt het
     plusje alleen voor wie één bestand tegelijk kiest. */
  ok('de verdeelbak kan een bestand in een referentievak leggen',
    /SHOT_IDS\.concat\(refIds\)/.test(pl), true);
  ok('  maar alleen in vakjes die op die kaart bestaan',
    /if \(card\.slots\[rid\]\) refIds\.push\(rid\);/.test(pl), true);
}

console.log('\nen het formulier zegt in beide talen wat het is');
{
  const flow = read('src/components/order/OrderFlow.astro');
  for (const key of ['refAdd', 'refHint', 'refSlot', 'refFull', 'refDrop']) {
    ok(`pu.${key} staat in de bouwcontrole`, new RegExp(`'pu\\.${key}'`).test(flow), true);
  }
  /* HET AANTAL GELEVERDE BEELDEN KOMT UIT DE BRON. "je krijgt nog steeds 4
     beelden" met een overgetypte 4 is de zin die onwaar wordt zodra CATALOG_IMAGES
     verandert — en het is precies de zin die de verwachting recht moet zetten. */
  ok('de hint rekent het aantal beelden uit pricing.js',
    /refHint:[\s\S]{0,260}\$\{CATALOG_IMAGES\}/.test(flow), true);
  ok('het maximum reist mee in de config', /maxRefPerProduct: MAX_REF_PER_PRODUCT/.test(flow), true);
  ok('  uit shots.js en niet uit pricing.js',
    /import \{ SHOTS, SHOT_IDS, MAX_REF_PER_PRODUCT, copy as shotCopy \} from '\.\.\/\.\.\/data\/shots\.js';/.test(flow), true);

  /* EN HET BETAALDE VAK BLIJFT. Lucas: *"wel moet de optie voor een extra foto
     behouden worden als apart vak die gewoon de huidige extra prijs behouden."* */
  const pl = read('src/scripts/pipeline.js');
  ok('het betaalde vak bestaat nog', /function buildExtras\(card\)/.test(pl), true);
  ok('  met zijn eigen teller', /select\.name = `extra_\$\{card\.key\}`/.test(pl), true);
  ok('  en zijn eigen tarief', /c\('pu\.extraRate', \{ rate: euro\(extraRateNow\(\)\), max \}\)/.test(pl), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
