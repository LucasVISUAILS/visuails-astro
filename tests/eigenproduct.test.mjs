/* VISUAILS — het etiket "met jouw product", 10 september 2026.
 *
 *   npm run test:eigenproduct
 *
 * Lucas: *"Wellicht bij sommige services ook een label toevoegen met 'Photo's
 * made using your own real product' (…) Bij Editions is dat bijvoorbeeld niet
 * het geval en is het puur foto's voor sfeer en branding."*
 *
 * ── WAT HIER MIS KAN GAAN, EN DAAROM BEWAAKT WORDT ──────────────────────────
 *
 * Eén ding: een deur die het etiket NIET krijgt. Dat gebeurt niet doordat
 * iemand het weghaalt, maar doordat er een tiende deur bijkomt en de lijst in
 * src/data/eigenproduct.js daar niets van weet. metEigenProduct() geeft dan
 * `false` terug — de deur zegt dus "geen product nodig" tegen een klant die zijn
 * spullen wél moet opsturen. Dat is geen ontbrekend etiket maar een onware
 * belofte, en het valt niemand op omdat er gewoon iets staat.
 *
 * Vandaar dat deze toets de lijst VERGELIJKT met de deuren die StartPage.astro
 * echt rendert, in plaats van te controleren of er ergens een etiket staat.
 */
import { readFileSync } from 'node:fs';
import { MET_EIGEN_PRODUCT, BEIDE_KAN, ALLE_DEUREN, metEigenProduct, productStand, PRODUCT_COPY, productLabel } from '../src/data/eigenproduct.js';

let pass = 0, fail = 0;
function ok(naam, voorwaarde, verwacht = '', kreeg = '') {
  if (voorwaarde) { pass++; console.log(` ok   ${naam.padEnd(60)}`); }
  else { fail++; console.log(` FAIL ${naam.padEnd(60)} verwacht ${verwacht}  kreeg ${kreeg}`); }
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — met jouw product\n');

/* ══ 1 · DE LIJST DEKT PRECIES DE DEUREN DIE ER ZIJN ══════════════════════ */
console.log('de lijst loopt niet achter op de pagina');
{
  const bron = lees('src/components/StartPage.astro');
  /* De ids staan twee keer in het bestand — één keer per taal — dus uniek maken.
     Zou een van de twee talen een deur missen, dan valt dat bij de telling
     hieronder om en niet hier. */
  const ids = [...new Set([...bron.matchAll(/^\s{8}id: '([a-z-]+)',$/gm)].map((m) => m[1]))];

  /* Acht sinds 10 september: "Catalog + Lifestyle" is geen deur meer maar een
     vraag in het catalogformulier — zie de noot in StartPage.astro. Het getal
     staat hier hard, en dat is met opzet: verandert het aantal deuren, dan hoort
     iemand daar één keer bewust naar te kijken in plaats van dat een lijst zich
     stil aanpast aan een pagina die per ongeluk iets verloor. */
  ok('StartPage rendert acht deuren', ids.length === 8, 8, ids.length);
  for (const id of ids) {
    ok(`  ${id} staat in eigenproduct.js`, ALLE_DEUREN.includes(id), 'bekend', 'ONBEKEND');
  }
  const teveel = ALLE_DEUREN.filter((id) => !ids.includes(id));
  ok('en eigenproduct.js kent geen deuren die niet bestaan', teveel.length === 0, '[]', JSON.stringify(teveel));
}

/* ══ 2 · DE ENIGE DIE ZEKER IS ════════════════════════════════════════════
   Editions is de enige waar het zwart op wit staat: zijn eigen regel op /start
   is "Brand imagery with no product in it". Als die ooit op JA komt te staan,
   spreekt de pagina zichzelf tegen. */
console.log('\nEditions is de dienst zonder product');
{
  ok('editions gebruikt jouw product niet', metEigenProduct('editions') === false);
  /* ── DRIE STANDEN SINDS 10 SEPTEMBER ──────────────────────────────────────
     Lucas: *"Hooks en Video altijd met product foto's van klant. Custom videos
     of foto's kunnen zowel met als zonder product van klant."* De acht deuren
     verdelen zich dus in vijf-twee-één, en die telling staat hier omdat een
     deur die stilletjes van stand wisselt een ANDERE BELOFTE doet — niet een
     ander etiket. */
  ok('vijf deuren zijn altijd met', MET_EIGEN_PRODUCT.length === 5, 5, MET_EIGEN_PRODUCT.length);
  ok('twee kunnen allebei', BEIDE_KAN.length === 2, 2, BEIDE_KAN.length);
  ok('  en dat zijn de twee op maat',
    BEIDE_KAN.every((id) => /custom/.test(id)), true, JSON.stringify(BEIDE_KAN));
  ok('samen zijn dat alle acht', MET_EIGEN_PRODUCT.length + BEIDE_KAN.length + 1 === ALLE_DEUREN.length,
    ALLE_DEUREN.length, MET_EIGEN_PRODUCT.length + BEIDE_KAN.length + 1);
  ok('hooks staat vast op met', productStand('hooks') === 'met', 'met', productStand('hooks'));
  ok('  en video op maat op allebei', productStand('video-custom') === 'beide', 'beide', productStand('video-custom'));
  const bron = lees('src/components/StartPage.astro');
  ok('  wat de tekst van editions ook zegt', /no product in it/.test(bron), true, 'de zin is weg');
}

/* ══ 3 · BEIDE TALEN, EN GEEN ONTKENNING ══════════════════════════════════ */
console.log('\nhet woord klopt in allebei de talen');
{
  for (const taal of ['en', 'nl']) {
    const c = PRODUCT_COPY[taal];
    ok(`${taal}: er is een woord voor mét`, Boolean(c.met && c.met.length > 3));
    ok(`${taal}: en een voor zonder`, Boolean(c.zonder && c.zonder.length > 3));
    /* De tegenhanger is met opzet een EIGEN belofte en geen ontkenning van de
       eerste: voor Editions is "geen product nodig" niet een gemis maar de
       reden dat het bestaat. Staat er straks "zonder jouw product", dan is dat
       een andere boodschap. */
    ok(`${taal}: de tegenhanger ontkent de eerste niet`,
      !new RegExp(`(zonder|without|no) ${c.met.split(' ').slice(-2).join(' ')}`, 'i').test(c.zonder), true, c.zonder);
  }
  ok('productLabel geeft het juiste woord', productLabel('catalog', 'nl') === PRODUCT_COPY.nl.met);
  ok('  en voor editions het andere', productLabel('editions', 'nl') === PRODUCT_COPY.nl.zonder);
  ok('  en voor werk op maat het derde', productLabel('custom-photo', 'nl') === PRODUCT_COPY.nl.beide);
  ok('  een onbekende deur telt als "geen product"',
    productLabel('bestaat-niet', 'en') === PRODUCT_COPY.en.zonder, true, productLabel('bestaat-niet', 'en'));
  /* Het etiket noemt FOTO'S en niet het product zelf: niemand stuurt hier
     spullen op, en een etiket dat dat suggereert verkoopt de drempel die deze
     studio juist niet heeft. Zie de formuleringsnoot in eigenproduct.js. */
  for (const taal of ['en', 'nl']) {
    ok(`${taal}: het etiket noemt foto's en geen pakket`,
      /foto|photo/i.test(PRODUCT_COPY[taal].met), true, PRODUCT_COPY[taal].met);
  }
}

/* ══ 4 · HET STAAT ER OOK ECHT ════════════════════════════════════════════ */
console.log('\nde deur draagt het etiket');
{
  const bron = lees('src/components/StartPage.astro');
  ok('StartPage leest de bron', /import \{ productStand, PRODUCT_COPY \}/.test(bron));
  ok('en zet het etiket op de deur', /class=\{`st-eigen is-\$\{productStand\(d\.id\)\}`\}/.test(bron));
  /* Twee VORMEN en niet twee kleuren, zodat het verschil ook leesbaar is voor
     wie het geel niet als "ja" leest. */
  /* Drie VORMEN en niet drie kleuren, zodat het verschil ook leesbaar is voor
     wie het geel niet als "ja" leest. */
  ok('  met drie verschillende vormen',
    /\.st-eigen\.is-met[\s\S]{0,600}\.st-eigen\.is-zonder[\s\S]{0,600}\.st-eigen\.is-beide/.test(bron));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
