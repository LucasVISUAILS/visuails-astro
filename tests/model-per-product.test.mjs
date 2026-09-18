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
const uploader = lees('src/components/order/ProductUploader.astro');

console.log('\nde vraag staat op de kaart, en alleen waar hij hoort');
{
  ok('er is een bouwer voor de keuze per product', /function buildModelKeuze\(card\)/.test(pipe));
  ok('  en hij wordt op elke kaart aangeroepen', /const gezicht = buildModelKeuze\(card\);/.test(pipe));
  ok('  het veld heet model_<kaart>', /card\.modelNaam = `model_\$\{card\.key\}`/.test(pipe));
  ok('  en niets is verplicht', /required/.test(pipe.slice(pipe.indexOf('function buildModelKeuze'), pipe.indexOf('function modelVan'))), false);

  /* ── 18 september 2026: TEGELS EN GEEN KEUZELIJST ────────────────────────
     Lucas: *"Het is ook belangrijk dat klanten per product visueel een ander
     model kunnen kiezen per product, dit hoeft niet groot en is puur
     optioneel."* Een <select> met elf namen vraagt dat je wéét wie "Ava" is. */
  ok('  het is een rij duimnagels', /class="pu-mk-tegel"/.test(uploader));
  ok('  en die staat op de kaart zelf, niet in de lade',
    /if \(gezicht\) li\.append\(gezicht\);/.test(pipe));
  /* De Astro-val: een element dat pipeline.js maakt draagt geen scope-attribuut.
     Vandaar een <template> in de bron en :global() in de opmaak. */
  ok('  de tegel komt uit een <template> in de bron', /<template data-pu-model-tegel>/.test(uploader));
  ok('  en zijn opmaak staat onder :global()', uploader.includes(':global(.pu-mk-tegel)'));
  /* Het korte woord op de tegel, de hele zin als toegankelijke naam. */
  ok('  de volledige zin blijft de toegankelijke naam',
    /inp\.setAttribute\('aria-label', volledig\);/.test(pipe));

  ok('de stroom zegt zelf of hij het vraagt', /perProduct: !isSample && MODEL_DIENSTEN\.has\(service\)/.test(flow));
  ok('  en de proef vraagt het niet', /!isSample/.test(flow));
  ok('  drie diensten, dezelfde als de gezichtsvraag zelf',
    /const MODEL_DIENSTEN = new Set\(\['catalog', 'lifestyle', 'complete'\]\);/.test(flow));
}

console.log('\nde opties komen van de radio’s en niet uit een tweede lijst');
{
  ok('vulModelTegels leest de radiogroep', /const radios = qa\('input\[name="model"\]'\);/.test(pipe));
  /* Dit is de regel die de eigen merkmodellen redt: ze zitten in dezelfde
     radiogroep zodra addBrandModels ze heeft ingevoegd. */
  ok('en addBrandModels werkt de kaarten daarna bij',
    /bindModel\(\);\s*\n\s*syncSummaries\(\);[\s\S]{0,400}?paintModelDefaults\(\);/.test(pipe));
  ok('een uitgezette radio komt niet in de rij', /if \(r\.disabled \|\| r\.value === 'any'\) return;/.test(pipe));
}

console.log('\neen afwijking overleeft een wissel bovenaan');
{
  ok('de gekozen waarde wordt teruggezet na het opnieuw vullen',
    /const terug = qa\('input', rij\)\.filter\(\(i\) => i\.value === had\)\[0\];/.test(pipe));
  ok('en een wissel bovenaan werkt de eerste tegel bij',
    /if \(t && t\.name === 'model'\) \{[\s\S]{0,400}?paintModelDefaults\(\);/.test(pipe));
  ok('de eerste tegel is LEEG en betekent "volg de bestelling"',
    /rij\.appendChild\(tegel\('', beeldBoven/.test(pipe));
  /* Twee dezelfde portretten naast elkaar leest als een fout. */
  ok('het gezicht van de bestelling krijgt geen tweede tegel',
    /if \(gekozen && r === gekozen\) return;/.test(pipe));
  /* En de regel op de lade moet meelopen: volgt dit product ineens weer de
     bestelling, dan hoort daar geen naam meer te staan. */
  ok('de ladesamenvatting wordt bijgewerkt', /if \(card\.el\) paintMeer\(card\);/.test(pipe));
}

console.log('\nen "voor alle producten" neemt het gezicht mee');
{
  /* Lucas, 18 september 2026: *"De klant kiest bij het eerste product een model
     en kan dan kiezen om deze aan alle producten alvast toe te voegen maar kan
     wel per product afwijken wanneer dat nodig is."* */
  ok('de kopieerknop gaat aan van een afwijkend gezicht',
    /card\.copyBtn\.disabled = !heeftAntwoord && !modelVan\(card\);/.test(pipe));
  ok('en het kopiëren zet het gezicht op de andere kaarten',
    /const gezicht = modelVan\(from\);[\s\S]{0,300}?doel\.checked = true;/.test(pipe));
  /* Alleen naar een kaart die zelf nog niets afwijkends heeft — een product dat
     je al op een ander gezicht hebt gezet, is een keuze en geen leeg veld. */
  ok('  maar niet over een keuze heen', /&& !modelVan\(card\)\) \{/.test(pipe));
}

console.log('\nen het accent betekent één ding: gekozen');
{
  /* ── 18 september 2026 ────────────────────────────────────────────────────
     Lucas: *"Als iemand in visuails studio een vast model heeft gekozen kan hij
     deze niet deselecteren in het bestelformulier en er staan dan 2 modellen
     geselecteerd."*

     De eigen merktegel had de accentrand ÉN de zachte accentgrond — letterlijk
     dezelfde opmaak die `:has(input:checked)` geeft. Hij zag er dus altijd
     gekozen uit, ook als het vinkje ergens anders stond; koos je daarna een
     ander gezicht, dan lichtten er twee op.

     Gemeten in een browser met kladblok/vastmodel.mjs, met een merkkit die een
     vast gezicht draagt: vóór de reparatie twee tegels met rand rgb(210,224,74),
     erna één. */
  const picker = lees('src/components/order/ModelPicker.astro');
  /* Alleen het RUST-blok: alles tot de eerste sluitaccolade. Neem je meer, dan
     leest de toets de `:has(input:checked)`-regel eronder mee en is hij groen
     om precies de verkeerde reden. */
  const vanaf = picker.indexOf('.mp-opt.is-own {');
  const eigen = picker.slice(vanaf, picker.indexOf('}', vanaf));
  ok('de eigen tegel draagt in rust geen accentrand', /border-color: var\(--accent\)/.test(eigen), false);
  ok('  en geen accentgrond', /background: var\(--accent-soft/.test(eigen), false);
  ok('  hij springt eruit in inkt', /border-color: var\(--ink\)/.test(eigen));
  /* En aangevinkt moet wél winnen, anders is de eigen tegel de enige die niet
     laat zien dat hij aanstaat. */
  ok('aangevinkt wint van "van jou"',
    /\.mp-opt\.is-own:has\(input:checked\) \{[\s\S]{0,200}?border-color: var\(--accent\);/.test(picker));
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
  for (const sleutel of ['modelH', 'modelLabel', 'modelSame', 'modelSamePlain', 'modelZelfdeKort', 'modelHint']) {
    ok(`  ${sleutel} bestaat`, new RegExp(`${sleutel}: l === 'nl'`).test(flow));
  }
  ok('en ze staan in de verplichte-kopielijst',
    /'pu\.modelH', 'pu\.modelLabel', 'pu\.modelSame', 'pu\.modelSamePlain', 'pu\.modelZelfdeKort', 'pu\.modelHint',/.test(flow));
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
