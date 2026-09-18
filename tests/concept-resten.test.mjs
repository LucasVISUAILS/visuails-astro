/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAT ER UIT /concept/bestelrij NIET WAS OVERGEZET
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 17 september 2026: *"Kijk of je nog meer details mist zoals deze want
 * dit is slordig."* Dat was terecht. De conceptpagina van 16 september is met de
 * hand overgezet naar het echte formulier, en bij zo'n overzetting valt er stil
 * van alles uit: het tippaneel (zie tips-paneel.test.mjs), de eigen hoek, de
 * streepjes in de balk (rij-balk.test.mjs) — en de drie dingen hieronder.
 *
 * Ze staan in één bestand omdat ze één herkomst delen en op dezelfde manier
 * opnieuw kunnen verdwijnen: niemand mist een zin die er nooit was.
 *
 *   1  HET RASTER BIJ "NOG NIET AF". Dit was een opsomming die na zes regels
 *      ophield met "en nog 19" — op het enige scherm waar je juist wilt weten
 *      wélke negentien. Het concept: *"een raster waarin je de gaten ZIET staan
 *      en er met één klik heen springt."*
 *
 *   2  WAAR JE WÉL MEER BEELDEN BESTELT. Stap 2 zei wel dat extra foto's geen
 *      extra beelden opleveren, en niet waar dat dan wél kan. Die vraag stelt
 *      zich precies daar.
 *
 *   3  WAT ER GEBEURT ALS WIJ HET NIET ZEKER WETEN. Zijn eigen zin, en hij hoort
 *      bij de hoeken: dat is het scherm waarop iemand iets bestelt dat niet in
 *      een lijstje past.
 *
 * ── EN WAT HET NIET BEWAAKT ────────────────────────────────────────────────
 *
 * Of het raster ook echt springt. Dat is in een echte browser gemeten met
 * kladblok/eindraster.mjs — 17 september 2026, op dist/, negen producten
 * waarvan het eerste af:
 *
 *     tegels          9, waarvan 8 met een gat
 *     tegel 01        4 vakjes, 4 vol, "Klaar"
 *     tegel 02        0 vol, "Mist voorkant, achterkant en detail"
 *     klik op tegel 4 het paneel sluit, de rij staat op "Product 4 van 9"
 *     op 430 px       één kolom, tegel 327 px breed
 */
import { readFileSync } from 'node:fs';
import { COPY as SHOT_COPY } from '../src/data/shots.js';
import { ANGLE_COPY } from '../src/data/angles.js';

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
const flow = read('src/components/order/OrderFlow.astro');
const hoeken = read('src/components/order/AnglePicker.astro');
const ask = pl.slice(pl.indexOf('function askMissing()'), pl.indexOf('function naarProduct('));

console.log('1 · het overzicht is een raster en geen opsomming');
{
  ok('het raster staat in de markup', /class="pu-missing-raster"/.test(uploader), true);
  ok('en de tegels worden gemaakt', /pu-mis-tegel/.test(ask), true);
  /* Astro scopet zijn CSS; een tegel die tijdens het gebruik ontstaat draagt
     dat kenmerk niet. Vijf keer misgegaan in dit project. */
  ['.pu-mis-tegel', '.pu-mis-vakjes', '.pu-mis-vakjes i'].forEach((sel) => {
    ok(`  ${sel} staat onder :global()`, uploader.includes(`:global(${sel})`), true);
  });

  /* ── ALLE PRODUCTEN, EN GEEN AFKAPPING MEER ─────────────────────────────
     De afkapping was het hele probleem. Deze regel is dus geen smaak maar de
     reden dat dit bestand bestaat. */
  ok('geen afkapping op zes meer', /slice\(0, 6\)/.test(ask), false);
  ok('en het loopt over alle kaarten', /cards\.forEach\(/.test(ask), true);

  /* Een tegel draagt drie dingen: waar het product staat, wélke vakjes leeg
     zijn, en wat er moet. Het laatste in woorden, want een leeg vakje vertelt
     niet of er een foto of een keuze ontbreekt — zie undecided(). */
  ['pu-mis-nr', 'pu-mis-naam', 'pu-mis-vakjes', 'pu-mis-wat'].forEach((k) => {
    ok(`  de tegel draagt ${k}`, ask.includes(k), true);
  });
  ok('de vakjes zijn verborgen voor een schermlezer',
    /strook\.setAttribute\('aria-hidden', 'true'\)/.test(ask), true);
  ok('en de zin in woorden komt uit cardStateText()', /cardStateText\(card, klaar\)/.test(ask), true);

  /* Springen. Beide knoppen — de tegel en "Foto's toevoegen" — gaan door
     dezelfde deur, want in de rij is een kaart onzichtbaar tot hij aan de beurt
     is en dan moet de RIJ verschuiven in plaats van de kaart openklappen. */
  ok('een tegel springt naar dat product', /naarProduct\(card\)/.test(ask), true);
  ok('en die sprong kent de rij', /function naarProduct\(card\)[\s\S]{0,400}rijAan\(\)/.test(pl), true);
  ok('de knop "foto’s toevoegen" gebruikt dezelfde deur',
    /missing-fix[\s\S]{0,300}naarProduct\(first\)/.test(pl), true);

  /* De uitnodiging hoort erbij: een raster van tegels dat je kunt aanklikken,
     zonder dat er staat dat het kan, is een raster dat niemand aanklikt. */
  ok('er staat bij dat je erop kunt klikken', /data-pl-missing-list/.test(uploader) && /missingTap/.test(uploader), true);
  ['nl', 'en'].forEach((t) => {
    ok(`  in het ${t}`, typeof SHOT_COPY[t].missingTap === 'string' && SHOT_COPY[t].missingTap.length > 10, true);
  });
  ok('en de sleutel staat in de kopijlijst', /'pu\.missingTap'/.test(flow), true);
}

console.log('\n2 · waar je wél meer beelden bestelt');
{
  /* De zin ernaast zegt dat extra foto's GEEN extra beelden opleveren. Zonder
     deze zin blijft de vraag staan waar dat dan wél kan, op precies het scherm
     waar iemand foto's staat bij te leggen. */
  ok('de zin bestaat', /refTerug:/.test(flow), true);
  ok('en wordt in de strook gezet', /c\('pu\.refTerug', \{ max: extraMax \}\)/.test(pl), true);
  ok('het getal komt uit de config en niet uit een cijfer hier',
    /cfg\.maxExtraPerProduct/.test(pl), true);
  /* Staat de bovengrens op nul, dan wijst de zin naar een keuze die niet
     bestaat. */
  ok('en hij blijft weg als er niets bij te bestellen is',
    /if \(extraMax\) strip\.append\(terug\);/.test(pl), true);
  ok('hij noemt stap 1', /stap 1/.test(flow) && /step 1/.test(flow), true);
  /* De richting is de hele zin: die stuur je ons, deze krijg je van ons. */
  ok('en het verschil tussen sturen en krijgen',
    /stuur jij ons/.test(flow) && /you send us/.test(flow), true);
  ok('de opmaak staat onder :global()', uploader.includes(':global(.pu-ref-terug)'), true);
  /* Op kaart twee en verder stil, net als de uitleg erboven — en `clip` en geen
     `display: none`, zodat een schermlezer hem nog bereikt. */
  ok('en op kaart twee is hij stil', /terug\.classList\.add\('is-stil'\)/.test(pl), true);
  ok('stil is geweggeknipt en niet weggehaald',
    /:global\(\.pu-ref-terug\.is-stil\)[\s\S]{0,200}clip-path: inset\(50%\)/.test(uploader), true);
}

console.log('\n3 · wat er gebeurt als wij het niet zeker weten');
{
  ['nl', 'en'].forEach((t) => {
    const zin = ANGLE_COPY[t].twijfelNoot;
    ok(`  de ${t}-zin bestaat`, typeof zin === 'string' && zin.length > 40, true);
    /* Twee helften: wat wij doen, en waarom dat beter is dan doorgaan. De
       tweede helft is waarom Lucas hem zo opschreef. */
    ok(`  en hij belooft contact vóóraf`,
      /vóórdat we beginnen|before we start/.test(zin), true);
  });
  ok('hij staat bij de hoeken', /class="pl-hoeken-noot hint"/.test(hoeken), true);
  ok('en onder de groepen, boven de som',
    hoeken.indexOf('pl-hoeken-noot') < hoeken.indexOf('data-pl-angle-som'), true);
  ok('met een eigen maatregel', /\.pl-hoeken-noot \{/.test(hoeken), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
