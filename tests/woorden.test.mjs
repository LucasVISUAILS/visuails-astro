/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE WOORDAFSPRAAK, ALS TEST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 25 augustus 2026: één woord per soort beeld, en overal hetzelfde.
 * `src/data/lexicon.js` legt de afspraak vast; dit bestand controleert dat hij
 * geldt op de plekken waar hij is toegepast.
 *
 * WAAROM DIT EEN EIGEN TESTBESTAND IS. `promises.test.mjs` gaat over beloftes
 * die de code moet waarmaken — een levertermijn, een revisieronde, een prijs.
 * Dit gaat over WOORDKEUZE, en dat is een andere soort fout: er breekt niets,
 * er staat alleen twee keer iets anders. Ze bij elkaar zetten zou betekenen dat
 * een gefaalde woordkeuze en een gebroken belofte in dezelfde regel eindigen.
 *
 * ── WAT DEZE TEST NIET DOET ────────────────────────────────────────────────
 *
 * Hij leest geen lopende zinnen na. Honderden zinnen bevatten een van deze
 * woorden midden in een verhaal, en of daar "beelden" of "foto's" hoort is per
 * zin een redactionele keuze die een reguliere expressie niet kan maken. Wat hij
 * wél afdwingt is de tabel zelf, plus de plekken waar het woord naast een getal
 * of een dienstnaam staat — daar is de categorie eenduidig.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  NOUN, KIND_OF_SERVICE, GLUED, noun, serviceNoun, serviceNounShort, counted, countedShort,
} from '../src/data/lexicon.js';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = join(hier, '..');
const lees = (p) => readFileSync(join(wortel, p), 'utf8');

/*
 * COMMENTAAR ERUIT VOORDAT ER IETS WORDT GEZOCHT.
 *
 * Dit bestand is er tijdens het schrijven zelf ingelopen: de noot bij `kinds` in
 * PricingPage CITEERT de oude regels ("seven images", "From four images") om uit
 * te leggen wat er weg is, en de controle daaronder vond die aanhaling en meldde
 * dat de oude tekst er nog stond. Een test die zijn eigen documentatie leest,
 * meet het verkeerde. Dezelfde reden dat promises.test.mjs een codeOnly() heeft.
 */
const codeOnly = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let goed = 0;
let totaal = 0;
function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(60)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

console.log('\nde categorieën zeggen wat Lucas heeft afgesproken');
{
  check('paraplu, Engels', noun('visual', 'en'), 'visuals');
  check('paraplu, Nederlands', noun('visual', 'nl'), 'beelden');
  check('catalog draagt zijn categorie, Engels', noun('catalog', 'en'), 'catalog images');
  check('catalog draagt zijn categorie, Nederlands', noun('catalog', 'nl'), 'catalogfoto’s');
  check('lifestyle draagt zijn categorie, Engels', noun('lifestyle', 'en'), 'lifestyle images');
  check('lifestyle draagt zijn categorie, Nederlands', noun('lifestyle', 'nl'), 'lifestylefoto’s');
  check('het kale woord, Engels', noun('photo', 'en'), 'images');
  check('het kale woord, Nederlands', noun('photo', 'nl'), 'foto’s');
  check('voorraadbeeld, Engels', noun('stock', 'en'), 'stock photos');
  check('voorraadbeeld, Nederlands', noun('stock', 'nl'), 'stockfoto’s');
  check('video en hooks, Engels', noun('video', 'en'), 'videos');
  check('video en hooks, Nederlands', noun('video', 'nl'), 'video’s');
}

/*
 * ── LUCAS' CORRECTIE, ALS CONTROLE — 25 augustus 2026 ──────────────────────
 *
 *   *"EN 'visuals', NL 'beelden', is het woord wanneer je praat over catalog,
 *   lifestyle en video content samen. Het hoeft niet achter elke categorie te
 *   staan."*
 *
 * De paraplu achter een categorienaam plakken is dus de fout. Deze controle
 * legt vast dat de tabel die vorm nergens zelf produceert. Dat de site hem nog
 * op ±20 plekken in lopende zinnen heeft staan, is een aparte lijst — zie het
 * rapport van 25 augustus.
 */
console.log('\nde paraplu staat nooit achter een categorienaam');
{
  const uit = [];
  for (const kind of Object.keys(NOUN)) {
    for (const lang of ['en', 'nl']) {
      for (const count of [1, 2]) {
        const w = noun(kind, lang, count);
        if (GLUED.some((re) => re.test(w))) uit.push(`${kind}.${lang}[${count}] = ${w}`);
      }
    }
  }
  check('geen enkele tabelwaarde is een verboden vorm', uit, []);
  check('en het patroon herkent de vorm wél', [
    GLUED.some((re) => re.test('catalog visuals')),
    GLUED.some((re) => re.test('lifestyle-visuals')),
    GLUED.some((re) => re.test('stockbeelden')),
    GLUED.some((re) => re.test('catalogusbeelden')),
    GLUED.some((re) => re.test('catalog images')),
    /* "productvisuals" hoort er NIET in: "product" is geen categorie, dus daar
       doet de paraplu precies zijn werk — foto's én video. Op /catalog stond
       het wel fout en is het weg; op /privacy, /about en /terms blijft het. */
    GLUED.some((re) => re.test('productvisuals')),
  ], [true, true, true, true, false, false]);
}

console.log('\nenkelvoud bestaat, zodat "1 foto’s" nooit kan ontstaan');
{
  check('één beeld', noun('visual', 'nl', 1), 'beeld');
  check('één foto', noun('photo', 'nl', 1), 'foto');
  check('één catalog foto', noun('catalog', 'nl', 1), 'catalogfoto');
  check('één stockfoto', noun('stock', 'nl', 1), 'stockfoto');
  check('counted() telt mee', counted('catalog', 1, 'nl'), '1 catalogfoto');
  check('en boven de één ook', counted('catalog', 4, 'nl'), '4 catalogfoto’s');
  check('countedShort() laat de categorie weg', countedShort('catalog', 4, 'nl'), '4 foto’s');
  check('en houdt het enkelvoud', countedShort('catalog', 1, 'nl'), '1 foto');
}

console.log('\nelke dienst hangt aan de goede categorie');
{
  check('catalog draagt zijn eigen naam', serviceNoun('catalog', 'nl'), 'catalogfoto’s');
  check('lifestyle ook', serviceNoun('lifestyle', 'nl'), 'lifestylefoto’s');
  /* Compleet is catalog ÉN lifestyle. Geen van beide categorieën kan er dus
     voor, en de paraplu hoort er niet achter — blijft het kale woord over. */
  check('compleet is geen van beide, dus kaal', serviceNoun('complete', 'nl'), 'foto’s');
  check('video is video', serviceNoun('video', 'nl'), 'video’s');
  check('hooks is ook video', serviceNoun('hooks', 'nl'), 'video’s');
  check('editions is voorraadbeeld', serviceNoun('editions', 'nl'), 'stockfoto’s');
  check('en de Engelse kant', [
    serviceNoun('catalog', 'en'), serviceNoun('lifestyle', 'en'),
    serviceNoun('complete', 'en'), serviceNoun('hooks', 'en'), serviceNoun('editions', 'en'),
  ], ['catalog images', 'lifestyle images', 'images', 'videos', 'stock photos']);

  /* De korte vorm bestaat alleen voor catalog en lifestyle. Video en stock
     dragen hun categorie in één woord en worden er niet korter op. */
  check('kort: catalog valt terug op het kale woord', serviceNounShort('catalog', 'en'), 'images');
  check('kort: lifestyle ook', serviceNounShort('lifestyle', 'nl'), 'foto’s');
  check('kort: video verandert niet', serviceNounShort('video', 'nl'), 'video’s');
  check('kort: editions verandert niet', serviceNounShort('editions', 'nl'), 'stockfoto’s');
}

console.log('\neen onbekende naam gaat stuk in plaats van stil iets te verzinnen');
{
  let gooide = false;
  try { noun('plaatje', 'nl'); } catch { gooide = true; }
  check('onbekende categorie gooit', gooide, true);
  let gooide2 = false;
  try { serviceNoun('drone', 'nl'); } catch { gooide2 = true; }
  check('onbekende dienst gooit', gooide2, true);
}

console.log('\nde rechte apostrof staat nergens in de tabel');
{
  /* Zie de noot in lexicon.js: de site gebruikt overal ’ en niet '. Eén rechte
     apostrof in een kolomkop valt op in een font met echte apostrofen, en dat is
     precies het soort verschil dat niemand meldt en niemand terugvindt. */
  const alles = Object.values(NOUN).flatMap((v) => [...v.en, ...v.nl]).join(' ');
  check('geen rechte apostrof', /'/.test(alles), false);
}

console.log('\nde prijstabellen gebruiken de tabel en niet hun eigen woorden');
{
  const home = codeOnly(lees('src/components/HomeV2.astro'));
  const prijs = codeOnly(lees('src/components/PricingPage.astro'));

  check('HomeV2 leest counted()', /counted\('complete',/.test(home), true);
  check('en niet meer "beelden" in ladKinds', /ladKinds:[\s\S]{0,400}beelden/.test(home), false);
  check('PricingPage leest counted()', /counted\('complete',/.test(prijs), true);

  /* De kolomkoppen NOEMEN de categorie ("Catalog set", "Catalogset"), dus daar
     hoort de korte vorm. Stond hier counted(), dan las de kop "Catalog set —
     4 catalog images". Zie de noot bij SHORTER in lexicon.js. */
  check('HomeV2 gebruikt de korte vorm onder de kop',
    (home.match(/countedShort\('(catalog|lifestyle)'/g) || []).length, 4);
  check('PricingPage ook',
    (prijs.match(/countedShort\('(catalog|lifestyle)'/g) || []).length, 4);
  check('en nergens meer de lange vorm onder een kop',
    /counted\('(catalog|lifestyle)'/.test(home + prijs), false);

  /* De aantallen stonden op /pricing als WOORD ("seven images", "vier beelden").
     Die stonden buiten assertShotCounts() en konden dus los van de constanten
     verlopen. Deze controle houdt ze eruit. */
  check('geen uitgeschreven aantal meer in kinds (en)',
    /kinds:[\s\S]{0,700}(seven|four|three) images/.test(prijs), false);
  check('geen uitgeschreven aantal meer in kinds (nl)',
    /kinds:[\s\S]{0,900}(zeven|vier|drie) (beelden|foto)/.test(prijs), false);
}

console.log('\nde voorraadregels zeggen stockfoto’s en niet visuals');
{
  /* ── DIT GAT ZAT IN MIJN EIGEN WERK — 25 augustus 2026 ────────────────────
     De eerste ronde paste de woordenlijst toe op de twee prijstabellen en
     meldde daarna dat alleen nog "lopende zinnen" over waren. Dat klopte niet:
     acht regels over de beeldbank hebben een AANTAL naast een woord staan — de
     categorie is daar dus net zo eenduidig als in de prijstabel — en ze stonden
     alle acht nog op "visuals", "sfeer-visuals", "merk-visuals", "stockbeelden"
     of "beelden". Vier verschillende woorden voor hetzelfde ding, op twee
     pagina's, precies de kwaal waar deze lijst voor is.

     Vandaar deze controle: hij bewaakt de plek waar ik zelf overheen keek. */
  const home = codeOnly(lees('src/components/HomeV2.astro'));
  const plan = codeOnly(lees('src/components/PlansPage.astro'));

  const stockRegels = (t, welk) => (t.match(new RegExp(`STOCK_${welk}_BRAND\\}[^\`]*\``, 'g')) || []);

  for (const [naam, tekst] of [['HomeV2', home], ['PlansPage', plan]]) {
    const gedeeld = stockRegels(tekst, 'OFF');
    const opMerk = stockRegels(tekst, 'ON');
    check(`${naam}: twee gedeelde en twee on-brand regels`, [gedeeld.length, opMerk.length], [2, 2]);

    /* DE GEDEELDE SET IS ECHT VOORRAADBEELD. Merk-neutraal, bruikbaar door elk
       merk, niet exclusief — dat is de definitie van stock en de site zegt het
       zelf in dezelfde zin ("usable by any brand"). Hier hoort het woord. */
    check(`${naam}: de gedeelde set leest noun('stock')`,
      gedeeld.every((r) => /noun\('stock'/.test(r)), true);
    check(`${naam}: en zegt niet "visuals" of "beelden" los`,
      gedeeld.some((r) => /\bvisuals\b|\bstockbeelden\b|\bbeelden\b/.test(r)), false);

    /* ── EN DE ON-BRAND SET JUIST NIET — 25 augustus 2026 ────────────────────
       Dit is de plek waar Lucas' woordafspraak botst met een merkbeslissing die
       ouder is, en de botsing stond een half uur lang LIVE op de homepage. In
       hetzelfde paneel stond "Monthly stock photo drops" en drie regels lager
       "That's what a stock library structurally cannot do — and why this is
       anything but stock."

       De noot bij `id: 'editions'` in HomeV2 legt uit waarom het woord daar
       niet mag staan: STOCK-IDEE.md wijst aan dat Death to Stock zich met
       zoveel woorden afzet tegen AI en dat je op hun terrein — vijftienduizend
       beelden voor $20 — niet wint. Jezelf "stock" noemen is de vergelijking
       opzoeken die je verliest.

       De splitsing die daaruit volgt is geen compromis maar het verschil dat er
       echt is: de gedeelde set IS voorraadbeeld, de set op maat is dat niet.
       Zolang Lucas geen eigen woord kiest voor die tweede, staat de paraplu er.
       Deze controle houdt de twee uit elkaar. */
    check(`${naam}: de on-brand set zegt nergens "stock"`,
      opMerk.some((r) => /stock/i.test(r.replace(/STOCK_ON_BRAND/g, ''))), false);
    check(`${naam}: en leest noun('visual')`,
      opMerk.every((r) => /noun\('visual'/.test(r)), true);
  }

  /* En het Editions-paneel zelf, waar de tegenspraak stond.
     Sinds 30 augustus 2026 staat dat paneel in src/data/binnenkort.js en niet
     meer in de copytabel van de homepage — de uitleg van Hooks en Editions is
     naar /plans#binnenkort verhuisd toen de homepage werd ingekort. Zelfde
     tekst, zelfde sleutel, ander bestand. */
  const binnenkortBron = lees('src/data/binnenkort.js');
  const paneel = binnenkortBron.slice(binnenkortBron.indexOf("id: 'editions'"), binnenkortBron.indexOf("id: 'editions'") + 4000);
  check('het Editions-paneel noemt zichzelf nergens stock',
    /\bstock (photo|photos|visuals)\b/i.test(paneel), false);
  check('en zegt nog steeds dat het geen stock is',
    /anything but stock/i.test(paneel), true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
