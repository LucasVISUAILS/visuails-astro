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

console.log('1 · het overzicht is één lijst uit ontbreekt.js (F3, 11 oktober 2026)');
{
  /* ── VAN RASTER NAAR ÉÉN LIJST ────────────────────────────────────────────
     Hier stond sinds 17 september een raster van tegels per product. Bij de
     ombouw van stap 2 (F3) koos Lucas voor punt 2.05: wie verder wil met lege
     verplichte vakken, ziet ÉÉN lijst — en die lijst komt uit de gedeelde bron
     src/lib/ontbreekt.js, dezelfde als Studio, de mails en /admin. Wat het raster
     bewaakte, blijft bewaakt: alle producten (geen afkapping), en één klik naar
     het product. */
  ok('de lijst staat in de markup', /class="pu-missing-lijst" data-pl-missing-list/.test(uploader), true);
  ok('de regels komen uit ontbrekendeFotos() en ontbrekendRegels()',
    /ontbrekendeFotos\(\{ productCount: cards\.length, details, files \}\)/.test(ask)
    && /ontbrekendRegels\(lijst,/.test(ask), true);
  ok('  en pipeline.js haalt ze uit src/lib/ontbreekt.js',
    /import \{ ontbrekendeFotos, ontbrekendRegels \} from '\.\.\/lib\/ontbreekt\.js';/.test(pl), true);
  /* Bij null (onbekend: nog geen enkele foto) geen lijst en nooit "alles compleet". */
  ok('bij null staat er geen lijst', /\(lijst \|\| \[\]\)\.forEach/.test(ask), true);
  ok('  maar wel een kop die zegt dat er nog niets is', /c\('pu\.missingNone'\)/.test(ask), true);
  ok('geen afkapping op zes', /slice\(0, 6\)/.test(ask), false);
  ok('en het loopt over alle kaarten', /cards\.forEach\(/.test(ask), true);
  /* Een regel is een knop: een lijst die je wilt aanklikken, moet je ook kunnen
     aanklikken — met een muis, een duim en het toetsenbord. */
  ok('een regel is een knop die naar dat product springt',
    /knop\.className = 'pu-mis-regel'/.test(ask) && /naarProduct\(card\)/.test(ask), true);
  ok('  en zijn opmaak staat onder :global()', uploader.includes(':global(.pu-mis-regel)'), true);
  ok('de sprong is die van de balk', /function naarProduct\(card\)[\s\S]{0,300}naarKaart\(i\)/.test(pl), true);
  ok('de knop "nu toevoegen" gebruikt dezelfde deur',
    /missing-fix[\s\S]{0,300}naarProduct\(first\)/.test(pl), true);
  /* De tweede keuze: later, in VISUAILS Studio — en de zin die zegt hoe dat gaat. */
  ok('de keuze "later in Studio" staat erbij, met laterLead', /data-pl-missing-go/.test(uploader) && /\{k\.laterLead\}/.test(uploader.slice(uploader.indexOf('data-pl-missing'))), true);
  ['nl', 'en'].forEach((t) => {
    ok(`  in het ${t}: ${SHOT_COPY[t].missingFix} / ${SHOT_COPY[t].missingGo}`,
      /VISUAILS Studio/.test(SHOT_COPY[t].missingGo) && SHOT_COPY[t].missingFix.length > 3, true);
  });
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
  /* Ronde 9 (F2): ook weg als er op dit formulier geen hoeken bij te bestellen
     zijn (lifestyle, de €1-proef) — anders wijst hij naar een keuze die niet bestaat. */
  ok('en hij blijft weg als er niets bij te bestellen is',
    /if \(extraMax( && hoekKan)?\) strip\.append\(terug\);/.test(pl), true);
  ok('hij noemt stap 1', /stap 1/.test(flow) && /step 1/.test(flow), true);
  /* De richting is de hele zin: die stuur je ons, deze krijg je van ons. */
  ok('en het verschil tussen sturen en krijgen',
    /stuur jij ons/.test(flow) && /you send us/.test(flow), true);
  ok('de opmaak staat onder :global()', uploader.includes(':global(.pu-ref-terug)'), true);
  /* Tot 11 oktober 2026 was hij op kaart twee en verder stil (weggeknipt). Sinds
     F3 staat deze strook in de ingeklapte lade "Meer over dit product": wie die
     opent, vraagt erom, dus hij is daar op elke kaart te lezen. */
  ok('in de lade is hij op elke kaart te lezen', /terug\.classList\.add\('is-stil'\)/.test(pl), false);
  ok('  en de strook staat in de lade', /buildMeer\(card, \[gezicht, about, ratios, refs, erbij\]\)/.test(pl), true);
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
