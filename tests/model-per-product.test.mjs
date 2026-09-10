/*
 * VISUAILS — HET GEZICHT PER PRODUCT — 9 september 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Klant kan bij catalog en lifestyle per product kiezen welk model
 * ervoor gebruikt word. De klant kan in het dashboard nog wel een vast model
 * kiezen en deze word dan automatisch bij elk product geplaatst, hij kan dan per
 * product dit nog aanpassen."*
 *
 * Drie lagen, en ze hangen in die volgorde onder elkaar:
 *
 *   DASHBOARD      customer_style_locks.roster_model / custom_model_id
 *                  → paintLock() vinkt het gezicht van de BESTELLING aan
 *   BESTELLING     de radiogroep `model` in ModelPicker
 *                  → de standaard van ELK product
 *   PRODUCT        `model_pX` op de kaart, leeg = volg de bestelling
 *
 * ── WAT HIER STIL KAN BREKEN ───────────────────────────────────────────────
 *
 *   1. DE KEUZELIJST WORDT UIT EEN EIGEN LIJST GEVULD. Dan missen de eigen
 *      merkmodellen van een ingelogde klant — die worden pas ná het laden
 *      ingevoegd (addBrandModels) — en dat is precies het gezicht dat een merk
 *      het liefst per product kiest.
 *   2. EEN AFWIJKING WORDT GEWIST als je bovenaan een ander gezicht kiest. Dan
 *      doet de hele functie het tegenovergestelde van waar hij voor is.
 *   3. HET LANDT NERGENS. Een keuze die de studio niet leest, is geen keuze.
 */
import { readFileSync } from 'node:fs';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const gelijk = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : ' FAIL'} ${naam}${gelijk ? '' : `   verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const pipe = lees('src/scripts/pipeline.js');
const flow = lees('src/components/order/OrderFlow.astro');

console.log('\nde vraag staat op de kaart, en alleen waar hij hoort');
{
  ok('er is een bouwer voor de keuze per product', /function buildModelKeuze\(card\)/.test(pipe));
  ok('  en hij wordt op elke kaart aangeroepen', /const gezicht = buildModelKeuze\(card\);/.test(pipe));
  ok('  het veld heet model_<kaart>', /sel\.name = `model_\$\{card\.key\}`/.test(pipe));
  ok('  en niets is verplicht', /required/.test(pipe.slice(pipe.indexOf('function buildModelKeuze'), pipe.indexOf('function modelNaam'))), false);

  ok('de stroom zegt zelf of hij het vraagt', /perProduct: !isSample && MODEL_DIENSTEN\.has\(service\)/.test(flow));
  ok('  en de proef vraagt het niet', /!isSample/.test(flow));
  ok('  drie diensten, dezelfde als de gezichtsvraag zelf',
    /const MODEL_DIENSTEN = new Set\(\['catalog', 'lifestyle', 'complete'\]\);/.test(flow));
}

console.log('\nde opties komen van de radio’s en niet uit een tweede lijst');
{
  ok('vulModelOpties leest de radiogroep', /const radios = qa\('input\[name="model"\]'\);/.test(pipe));
  /* Dit is de regel die de eigen merkmodellen redt: ze zitten in dezelfde
     radiogroep zodra addBrandModels ze heeft ingevoegd. */
  ok('en addBrandModels werkt de kaarten daarna bij',
    /bindModel\(\);\s*\n\s*syncSummaries\(\);[\s\S]{0,400}?paintModelDefaults\(\);/.test(pipe));
  ok('een uitgezette radio komt niet in de lijst', /if \(r\.disabled\) return;/.test(pipe));
}

console.log('\neen afwijking overleeft een wissel bovenaan');
{
  ok('de gekozen waarde wordt teruggezet na het opnieuw vullen',
    /if \(had && qa\('option', sel\)\.some\(\(o\) => o\.value === had\)\) sel\.value = had;/.test(pipe));
  ok('en een wissel bovenaan werkt de eerste optie bij',
    /if \(t && t\.name === 'model'\) \{[\s\S]{0,400}?paintModelDefaults\(\);/.test(pipe));
  ok('de eerste optie is LEEG en betekent "volg de bestelling"',
    /zelfde\.value = '';/.test(pipe));
}

console.log('\nen de studio leest het');
{
  const admin = lees('src/lib/admin.js');
  const scaffold = lees('src/lib/scaffold.js');
  ok('admin lost per product het gezicht op',
    /model: modelLabel\(tekst\(details\[`model_\$\{key\}`\]\) \|\| tekst\(details\.model\)\)/.test(admin));
  ok('  met de naam en niet de id', /const hit = ROSTER\.filter\(\(m\) => modelId\(m\.name\) === v\)\[0\];/.test(admin));
  ok('  en een eigen merkmodel wordt als zodanig benoemd', /eigen merkmodel #/.test(admin));
  ok('  "wij kiezen er een" levert geen regel op', /if \(!v \|\| v === MODEL_ANY\) return null;/.test(admin));
  ok('de briefing drukt het af', /Gezicht     \$\{product\.model\}/.test(scaffold));
}

console.log('\nde tekst staat in beide talen klaar');
{
  for (const sleutel of ['modelH', 'modelLabel', 'modelSame', 'modelSamePlain', 'modelHint']) {
    ok(`  ${sleutel} bestaat`, new RegExp(`${sleutel}: l === 'nl'`).test(flow));
  }
  ok('en ze staan in de verplichte-kopielijst',
    /'pu\.modelH', 'pu\.modelLabel', 'pu\.modelSame', 'pu\.modelSamePlain', 'pu\.modelHint',/.test(flow));
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
