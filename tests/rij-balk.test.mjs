/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BALK BOVEN DE RIJ — EEN STREEPJE PER FOTO
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * De rij toont één product tegelijk. De balk erboven was tot 17 september 2026
 * één vierkantje per product: vol of leeg, af of niet af. Je zag dus wél "dit
 * product is nog niet af", maar niet wat eraan ontbrak — daarvoor moest je elk
 * product openklikken. Dat is precies de klik die de rij wilde besparen.
 *
 * Nu draagt elk vierkantje een streepje per gevraagde foto. Vol is binnen,
 * flauw mist nog.
 *
 * ── WAT DIT BESTAND BEWAAKT ────────────────────────────────────────────────
 *
 *   1  DE BALK EN DE KAART MOETEN HETZELFDE TELLEN. Als de streepjes alleen de
 *      vaste hoeken tellen, staat een kaart met alle streepjes vol tóch niet
 *      afgevinkt — want de bijbestelde hoeken en de draagfoto houden hem ook
 *      tegen. Een balk die naar een gat wijst dat er niet is, is erger dan geen
 *      balk. De reeks hier is dus dezelfde als in cardReady().
 *
 *   2  DE STREEPJES ONTSTAAN IN JAVASCRIPT. Hoeveel het er zijn hangt van de
 *      bijbestelde hoeken af, dus ze kunnen niet in de markup staan. Astro
 *      plakt bij de bouw `data-astro-cid-…` achter elk deel van een selector;
 *      een element dat pipeline.js maakt draagt dat niet. Zonder `:global()`
 *      krijgen de streepjes geen énkele regel en staan ze als vier zwarte
 *      blokjes in de knop. Vijf keer misgegaan in dit project.
 *
 *   3  DE GRENS. Twintig producten maal vijf foto's is honderd streepjes van
 *      drie pixels. Dan telt niemand meer mee. Boven de grens hoort het
 *      vierkantje zijn oude werk alleen te doen.
 *
 * ── EN WAT HET NIET BEWAAKT ────────────────────────────────────────────────
 *
 * Of ze echt meevullen. Dat is in een echte browser gemeten met
 * kladblok/rail-vakjes.mjs — 17 september 2026, op dist/, op 1280 en 430 px,
 * zes producten, met een echte foto van 1200 × 1200 per vak:
 *
 *     leeg          4 streepjes, 0 vol, knop 31 × 25 px
 *     na voorkant   1 vol
 *     na achterkant 2 vol
 *     na detail     3 vol
 *     na overslaan  4 vol — en pas op dát moment kleurt het vierkantje af
 *     12 producten  0 streepjes, strook op display:none, knop weer 25 px
 *
 * Die laatste twee regels zijn het bewijs dat punt 1 en punt 3 kloppen; een
 * broncontrole kan alleen bewijzen dat de regel bestaat.
 */
import { readFileSync } from 'node:fs';
import { REQUIRED_SHOT_IDS, MUST_DECIDE_SHOT_IDS } from '../src/data/shots.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const pl = read('src/scripts/pipeline.js');
const uploader = read('src/components/order/ProductUploader.astro');
const paint = pl.slice(pl.indexOf('function paintRail()'), pl.indexOf('function bindRij()'));

console.log('de strook staat in de markup, de streepjes komen uit het script');
{
  ok('de knop draagt een strook', /data-pl-rail-vakjes/.test(uploader), true);
  /* De strook is versiering naast een aria-label dat in woorden zegt wat er
     mist. "Streepje 3 van 5" is voor een schermlezer geen zin. */
  ok('en die strook is verborgen voor een schermlezer',
    /class="pu-rail-vakjes"[^>]*aria-hidden/.test(uploader), true);
  ok('het aria-label blijft de toestand in woorden dragen',
    /setAttribute\('aria-label'/.test(paint), true);

  /* ── DE ASTRO-VAL ─────────────────────────────────────────────────────── */
  ok('de opmaak van de streepjes staat onder :global()',
    /:global\(\.pu-rail-vakjes i\)/.test(uploader), true);
  ok('en die van de strook zelf ook',
    /:global\(\.pu-rail-vakjes\)/.test(uploader), true);
  ok('de gevulde stand ook', /:global\(\.pu-rail-vakjes i\.is-vol\)/.test(uploader), true);
  /* Op een afgevinkte knop ligt het accent als vulling; zonder deze regel is
     het geel op geel en zie je de streepjes daar juist niet meer. */
  ok('en de afgevinkte knop zet ze op inkt',
    /is-af :global\(\.pu-rail-vakjes i\)/.test(uploader), true);
}

console.log('\nde balk telt hetzelfde als cardReady()');
{
  const gereed = pl.slice(pl.indexOf('function cardReady(card)'), pl.indexOf('function cardReady(card)') + 400);
  ['REQUIRED_SHOT_IDS', 'hoekVakIds()', 'MUST_DECIDE_SHOT_IDS'].forEach((bron) => {
    ok(`  de streepjes tellen ${bron}`, paint.includes(bron), true);
  });
  ok('cardReady kijkt naar dezelfde drie bronnen',
    /REQUIRED_SHOT_IDS/.test(gereed) && /hoekVakIds\(\)/.test(gereed) && /undecided\(card\)/.test(gereed), true);

  /* De draagfoto mág leeg blijven; overgeslagen is een antwoord. Zonder deze
     regel blijft dat streepje flauw op een kaart die wel degelijk af is. */
  ok('overgeslagen telt als beantwoord', /status === 'skipped'/.test(paint), true);
  ok('en een dubbel id wordt er één streepje',
    /rij\.indexOf\(id\) === i/.test(paint), true);

  /* Geen overlap vandaag; als shots.js dat ooit verandert, vangt de regel
     hierboven het op — deze regel maakt zichtbaar dát het veranderd is. */
  ok('vandaag overlappen de twee reeksen niet',
    REQUIRED_SHOT_IDS.filter((id) => MUST_DECIDE_SHOT_IDS.includes(id)).length, 0);
}

console.log('\nen boven een overzichtelijk aantal producten houdt hij op');
{
  ok('er is een grens', /const RAIL_VAKJES_MAX = \d+;/.test(pl), true);
  const n = Number((/const RAIL_VAKJES_MAX = (\d+);/.exec(pl) || [])[1]);
  ok('  en die staat op een aantal dat je nog kunt overzien', n >= 4 && n <= 10, true, n);
  ok('de grens wordt ook echt gebruikt', /cards\.length <= RAIL_VAKJES_MAX/.test(paint), true);
  /* Boven de grens hoort de strook leeg te zijn en niet alleen verborgen:
     honderd elementen die niemand ziet, blijven honderd elementen die bij elke
     foto opnieuw langsgelopen worden. */
  ok('boven de grens wordt de strook geleegd', /strip\.textContent = '';/.test(paint), true);
  ok('en de knop verliest zijn klasse',
    /classList\.toggle\('heeft-vakjes', toonVakjes\)/.test(paint), true);
}

console.log('\nen de pijltjestoetsen lopen door de rij');
{
  const toetsen = pl.slice(pl.indexOf('function bindRailToetsen()'), pl.indexOf('function bindRij()'));
  ok('er luistert iets op de balk', /rail\.addEventListener\('keydown'/.test(toetsen), true);
  ['ArrowRight', 'ArrowLeft', 'Home', 'End'].forEach((t) => {
    ok(`  ${t} doet iets`, toetsen.includes(t), true);
  });

  /* ── EN NERGENS ANDERS ────────────────────────────────────────────────────
     Op /concept/bestelrij luisterde dit op de hele stap. Hier niet: het echte
     formulier staat vol met keuzelijsten, radiogroepen en getalvelden die de
     pijltjes zélf gebruiken, en een formulier dat je keuze verspringt terwijl
     je een achtergrond aanwijst is erger kapot dan een formulier zonder
     sneltoetsen. Deze regel bewaakt dat het daar niet alsnog heen kruipt. */
  ok('en niet op de hele stap of het document',
    /(document|form)\.addEventListener\('keydown'[\s\S]{0,200}ArrowRight/.test(pl), false);

  /* De blik blijft in de balk. naarKaart() zet hem anders in het naamveld van
     het product, en dan doet het vólgende pijltje niets meer. */
  ok('de blik blijft op de balk', /naarKaart\(doel, false\)/.test(toetsen), true);
  ok('en de kaart komt wel in beeld', /scrollIntoView/.test(toetsen), true);
  ok('één tabstop in de balk en niet twintig',
    /knop\.tabIndex = i === rijNu \? 0 : -1;/.test(pl), true);

  /* De poort van Lucas: de knop "volgende" staat uit tot de kaart af is. Een
     pijltje op die knop zou hem met één toets van tafel vegen. */
  ok('de poortknop luistert niet mee',
    /\[data-pl-volgende\][\s\S]{0,400}keydown/.test(pl), false);
}

console.log('\nde knop blijft een aanraakdoel');
{
  /* 22 px plus de tussenruimte was de ondergrens die de toegankelijkheids-
     keuring van dit project aanhoudt. De streepjes maken hem breder, nooit
     smaller — vandaar min-width en niet width. */
  ok('de brede stand heeft een ondergrens en geen vaste maat',
    /\.pu-rail-knop\.heeft-vakjes \{[^}]*min-width: 22px/.test(uploader), true);
  ok('en de hoogte blijft staan', /\.pu-rail-knop \{[^}]*height: 22px/s.test(uploader), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
