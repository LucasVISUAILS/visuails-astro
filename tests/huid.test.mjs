/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE PROEFHUID RAAKT DE HOMEPAGE NIET  ·  npm run test:huid
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 27 augustus 2026:
 *
 *   "Waar ik nu mee zit is, ik vind dit ergens wel goed, maar ik ben bang dat
 *    ik veel van de website ga slopen zet ik dit over naar de homepage. Ik heb
 *    bijvoorbeeld hover animaties voor het logo etc. op dit moment dus er
 *    zitten veel dingen in waar ik niet vanaf wil."
 *
 * Die angst is de reden dat de kantige stijl een HUID is en geen verbouwing:
 * alles staat achter één klasse op <body>, en die klasse zet Layout.astro
 * alleen wanneer een pagina er om vraagt. Op dit moment vragen alleen /proef en
 * /nl/proef erom.
 *
 * ── WAAROM DIT EEN TOETS IS EN GEEN AFSPRAAK ───────────────────────────────
 *
 * Omdat "gescoped" een eigenschap is die stil verdwijnt. Eén regel in dat
 * stijlblad die per ongeluk zonder `.huid-kantig` ervoor wordt geschreven, en
 * de hoeken van de hele site staan op nul zonder dat iemand een homepage-
 * bestand heeft aangeraakt. Dat is exact het lek dat DESIGN.md al een keer
 * beschrijft — "a second `--radius: 0` sitting below the alias in the same
 * `:root` silently squared the entire site while the scale above it looked
 * correct in the file". Deze toets leest daarom niet wat de bedoeling was maar
 * wat er staat.
 *
 * ── DE DRIE UITZONDERINGEN OP DESIGN.md STAAN HIER MET NAAM ────────────────
 *
 * De huid gaat bewust in tegen drie regels uit DESIGN.md: de hoeken (sectie 18
 * zette ze juist rond, op Lucas' eigen instructie), de monospace als "eyebrow",
 * en het getrackte hoofdletterlabel boven een sectie. Dat mag, want hij vroeg bij
 * deze opdracht om precies die stijl — maar het moet BEWUST blijven. Vandaar de
 * laatste groep: hij faalt zodra de verantwoording uit het bestand verdwijnt,
 * zodat niemand de uitzondering later voor de regel aanziet.
 */

import { readFileSync, existsSync, globSync } from 'node:fs';
import { buildStaat } from './lib/build.mjs';

let goed = 0;
let totaal = 0;
function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(64)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

const huid   = readFileSync('src/components/HuidKantig.astro', 'utf8');
const layout = readFileSync('src/layouts/Layout.astro', 'utf8');
const proefEN = readFileSync('src/pages/proef.astro', 'utf8');
const proefNL = readFileSync('src/pages/nl/proef.astro', 'utf8');
const indexEN = readFileSync('src/pages/index.astro', 'utf8');
const indexNL = readFileSync('src/pages/nl/index.astro', 'utf8');

/* ─────────────────────────────────────────────────────────────────────────────
   1 · GEEN ENKELE REGEL LEKT BUITEN DE HUID
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\nelke regel in het stijlblad is gescoped');
{
  const blok = huid.match(/<style is:global>([\s\S]*?)<\/style>/);
  check('er is precies één globaal stijlblok', blok ? 1 : 0, 1);

  /* Commentaar eruit, dan de selectors: alles vóór een `{` dat zelf niet in een
     declaratieblok staat. Simpel maar toereikend — het stijlblad is met de hand
     geschreven en heeft geen genest CSS. */
  const css = blok[1].replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [];
  let diepte = 0, buffer = '';
  for (const teken of css) {
    if (teken === '{') {
      if (diepte === 0) selectors.push(buffer.trim());
      diepte += 1; buffer = '';
    } else if (teken === '}') { diepte -= 1; buffer = ''; }
    else if (diepte === 0) buffer += teken;
  }

  /* Een selector is in orde als hij de body-klasse noemt, of als hij alleen de
     aanwijzer zelf raakt — die bestaat nergens anders, want Layout.astro plaatst
     hem uitsluitend binnen de huid. `@media` en `@supports` zijn geen selectors.

     EERST DE HAAKJESGROEPEN ERUIT. Een selectorlijst splitst op komma's, maar
     `:is(input, textarea, select)` bevat er zelf drie — splits je naïef, dan
     blijft er ` textarea` over als losse selector en meldt deze toets een lek
     dat er niet is. Dat gebeurde ook meteen bij de eerste keer draaien. De
     inhoud van :is/:where/:not doet er voor de vraag "is dit gescoped" niet
     toe, want de scope staat er altijd vóór, dus hij mag weg. */
  /* WEGHALEN EN NIET VERVANGEN DOOR `()`. Die eerste versie stond hier tot
     28 augustus en had een stil vast punt: `\([^()]*\)` vervangen door `()`
     laat de haakjes staan, dus zodra er NESTING in het spel is — bijvoorbeeld
     `:is(.btn-ghost, .nav-cta:not(.btn-primary), .lang-switch)` — matcht de
     regex meteen dat lege binnenste paar, verandert er niets, en stopt de lus
     met de buitenste haakjes en hun komma's nog intact. De toets meldde toen
     een lek in een selector die keurig gescoped was. Nu blijft er niets van de
     groep over en loopt hij door tot alle niveaus weg zijn. */
  const kaal = (sel) => {
    let vorig;
    do { vorig = sel; sel = sel.replace(/\([^()]*\)/g, ''); } while (sel !== vorig);
    return sel;
  };
  const vrij = selectors.filter((s) => {
    if (!s || s.startsWith('@')) return false;
    return !kaal(s).split(',').every((deel) => {
      const d = deel.trim();
      return d.includes('.huid-kantig') || d.startsWith('.aw') || d.includes(' .aw');
    });
  });
  check('geen selector zonder .huid-kantig of .aanwijzer', vrij, []);
  check('geen kale :root in de huid', /(^|[^-\w.])\:root/.test(css), false);
  check('geen sterretjesreset', /\*\s*,|\*\s*\{/.test(css), false);
}

/* ─────────────────────────────────────────────────────────────────────────────
   2 · DE PILLEN BLIJVEN ROND
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\nde hoeken gaan op nul, behalve de pillen');
{
  check('--r-lg wordt 0', /--r-lg:\s*0px/.test(huid), true);
  check('--r-md wordt 0', /--r-md:\s*0px/.test(huid), true);
  check('--r-sm wordt 0', /--r-sm:\s*0px/.test(huid), true);
  /* Dit is de kern van wat Lucas vroeg — "De knoppen op de site zijn pilvormig
     terwijl de rest van de website erg hoekig is". Zodra iemand --r-pill hier
     ook op 0 zet is de stijl weg en is het gewoon een hoekige site. */
  check('--r-pill wordt NIET aangeraakt', /--r-pill\s*:/.test(huid), false);
}

/* ─────────────────────────────────────────────────────────────────────────────
   3 · DE AANWIJZER FAALT NAAR EEN GEWONE MUISPIJL
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\nde aanwijzer degradeert veilig');
{
  /* Dit is de belangrijkste regel van het hele bestand. `cursor: none` in
     statische CSS betekent: gaat het script stuk of staat JavaScript uit, dan
     heeft de bezoeker géén muisaanwijzer meer. Niet lelijk — onbedienbaar.
     Daarom zet het script de klasse, en hangt elke `cursor: none` eraan. */
  const cursorRegels = [...huid.matchAll(/([^{}]*)\{[^{}]*cursor:\s*none[^{}]*\}/g)].map((m) => m[1].trim());
  check('er is minstens één cursor:none-regel', cursorRegels.length > 0, true);
  check('elke cursor:none hangt aan html.aw-aan',
    cursorRegels.filter((s) => !s.includes('html.aw-aan')), []);
  check('de klasse wordt door het script gezet',
    /classList\.add\('aw-aan'\)/.test(huid), true);
  check('en alleen bij een fijne aanwijzer',
    /\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/.test(huid), true);

  /* Een tekstveld houdt zijn eigen cursor: die vertelt wáár je kunt typen, en
     dat is informatie die een pijl niet kan overbrengen. */
  check('formuliervelden houden cursor:auto',
    /input, textarea, select[^}]*cursor:\s*auto/.test(huid.replace(/\s+/g, ' ')), true);

  check('er is een reduced-motion-tak', /prefers-reduced-motion:\s*reduce/.test(huid), true);
  check('en het script leest diezelfde voorkeur',
    /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/.test(huid), true);
  check('op een aanraakscherm verdwijnt hij', /\(pointer:\s*coarse\)[^}]*display:\s*none/.test(huid.replace(/\s+/g, ' ')), true);

  /* ClientRouter maakt van elke navigatie een zachte navigatie. Zonder opruimen
     stapelen de luisteraars zich op bij elke pagina die iemand aandoet. */
  check('luisteraars worden opgeruimd bij een zachte navigatie',
    /astro:before-swap/.test(huid) && /removeEventListener\('mousemove'/.test(huid), true);
  check('en opnieuw gestart na een zachte navigatie',
    /astro:page-load/.test(huid), true);

  /* TWEE LAGEN sinds 27 augustus 2026 — de omgekeerde en de vlakke — en ze
     moeten allebei voor een schermlezer onzichtbaar zijn. Deze toets ging af
     toen de klasse van `aw` naar `aw aw-om` ging: precies waar hij voor is. */
  check('beide aanwijzerlagen zijn aria-hidden',
    (huid.match(/class="aw [a-z-]+" id="aw2?" aria-hidden="true"/g) || []).length, 2);
}

/* ─────────────────────────────────────────────────────────────────────────────
   4 · DE SCHAKELAAR IN LAYOUT.ASTRO
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\nde schakelaar staat er nog, met de huid als standaard');
{
  check('Layout kent de prop', /huid\?:\s*'geen'\s*\|\s*'kantig'/.test(layout), true);
  check('en heeft "kantig" als standaard', /huid\s*=\s*'kantig'/.test(layout), true);
  check('de body-klasse hangt aan de prop', /huid === "kantig" && "huid-kantig"/.test(layout), true);
  check('het component wordt voorwaardelijk gerenderd',
    /\{huid === 'kantig' && <HuidKantig \/>\}/.test(layout), true);
  /* De grond en de huid zijn twee onafhankelijke keuzes. Ging dit terug naar
     één ternair, dan zou /proef zijn espresso-grond verliezen. */
  check('de grond staat er los van', /ground === "espresso" && "ground-espresso"/.test(layout), true);
}

/* ─────────────────────────────────────────────────────────────────────────────
   5 · ELKE PAGINA DRAAGT DE HUID, BEHALVE DE TWEE VERGELIJKINGSPAGINA'S
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\nde huid staat op elke gebouwde pagina, op twee na');
{
  /* DEZE GROEP IS TWEE KEER OMGEDRAAID EN DAT IS HET VERHAAL VAN DE HUID.
   *
   * Eerst droeg /proef de stijl en was de homepage onaangeroerd. Op 27 augustus
   * werd dat omgekeerd: de stijl op / en /nl, en deze toets bewaakte dat hij
   * NERGENS anders stond. Op 28 augustus vroeg Lucas hem over te zetten naar de
   * hele site, en dus bewaakt hij nu het omgekeerde.
   *
   * ── OP DE GEBOUWDE PAGINA'S EN NIET OP DE BRON ──────────────────────────────
   *
   * De vorige versie las `huid="kantig"` uit de bestanden in src/pages. Dat kan
   * nu niet meer: de huid komt uit de STANDAARD van de prop, dus geen enkele
   * pagina noemt hem nog, en een broncontrole zou vrolijk melden dat niemand hem
   * gebruikt. Belangrijker: een bronregel bewijst hoe dan ook niet dat de klasse
   * ook echt op <body> belandt. Deze groep leest daarom dist/ — wat er staat in
   * plaats van wat de bedoeling was.
   */
  /* ── MET DE LEEFTIJDSCONTROLE ERVOOR, 30 AUGUSTUS 2026 ──────────────────
     Deze groep noemt de pagina's die de huid MISSEN bij naam, en die lijst komt
     uit dist/. Op een oude build is dat een uitspraak over een site die niet
     meer bestaat: een pagina die je vandaag toevoegt staat er nog niet in en
     wordt dus niet gecontroleerd, en een pagina die je gisteren hernoemde staat
     er nog wél in en geeft rood over een bestand dat niemand publiceert. Zie
     tests/lib/build.mjs voor het geval waarin dat voor het eerst misging. */
  const huidStaat = buildStaat(new URL('../dist/index.html', import.meta.url));
  if (!huidStaat.er || huidStaat.oud) {
    console.log(` --   niet gecontroleerd: ${huidStaat.uitleg}`);
  } else {
    /* ── EN MET SCHUINE STREPEN, WANT DIT DRAAIT OOK OP WINDOWS ──────────
       30 augustus 2026, 20:45, op Lucas' scherm:

         FAIL alleen /proef en /nl/proef missen de huid
              verwacht ["/nl/proef/","/proef/"] kreeg ["\\nl\\proef\\","\\proef\\"]

       globSync geeft de paden terug zoals het besturingssysteem ze schrijft, en
       op Windows is dat met backslashes. Bij mij op Linux niet, dus deze regel
       is nooit rood geweest in de sandbox waar hij is geschreven — hij kon alleen
       op zijn machine omvallen. Zelfde familie als de `.pathname`-fout die
       tests/paths.test.mjs bewaakt: een pad dat op één van de twee platforms
       klopt, en waar de bron er goed uitziet.

       Hier normaliseren en niet verderop bij de vergelijking, want dan geldt het
       voor alles wat er nog met deze lijst gebeurt. */
    const gebouwd = globSync('dist/**/index.html').map((f) => f.replace(/\\/g, '/'));
    check('er is een gebouwde site om te controleren', gebouwd.length > 50, true);

    const zonder = gebouwd
      .filter((f) => !/class="[^"]*huid-kantig/.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(/^dist/, '').replace(/index\.html$/, ''))
      .sort();
    /* Precies twee, en met naam. Een toets die alleen "hoogstens twee" zegt, laat
       de dag door waarop het de verkeerde twee zijn. */
    check('alleen /proef en /nl/proef missen de huid', zonder, ['/nl/proef/', '/proef/']);
  }

  /* De regels hieronder lezen de BRON en niet dist/, dus ze staan buiten de
     leeftijdscontrole hierboven: ze blijven ook zonder verse build gewoon gelden. */

  /* En die twee missen hem omdat ze er expliciet om vragen, niet omdat iemand
     vergat de prop mee te geven. Zonder deze twee regels is "de huid staat er
     niet op" niet te onderscheiden van "er is iets stukgegaan". */
  check('/proef vraagt expliciet om GEEN huid', /huid="geen"/.test(proefEN), true);
  check('/nl/proef vraagt expliciet om GEEN huid', /huid="geen"/.test(proefNL), true);

  /* De homepage noemt de prop juist NIET meer: hij komt uit de standaard. Stond
     hij er nog wel, dan waren er twee plekken die hetzelfde zeggen, en dan is de
     dag dat ze elkaar tegenspreken alleen een kwestie van tijd. */
  check('/ leunt op de standaard', /huid\s*=/.test(indexEN), false);
  check('/nl leunt op de standaard', /huid\s*=/.test(indexNL), false);
}

/* ─────────────────────────────────────────────────────────────────────────────
   6 · DE PROEFROUTE IS DE HOMEPAGE, NIET EEN KOPIE ERVAN
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\n/proef rendert dezelfde component als /');
{
  for (const [naam, bron, taal] of [['en', proefEN, 'en'], ['nl', proefNL, 'nl']]) {
    check(`/proef (${naam}) importeert HomeV2`, /import HomeV2 from '\.\.?\/[^']*components\/HomeV2\.astro'/.test(bron), true);
    check(`/proef (${naam}) rendert HomeV2 lang="${taal}"`, bron.includes(`<HomeV2 lang="${taal}" />`), true);
    /* noindex, want een pagina die de site half toont hoort niet in een
       zoekresultaat. scripts/sitemap-and-404.mjs leest de robots-tag en laat
       hem daardoor vanzelf weg. */
    check(`/proef (${naam}) staat op noindex`, /\bnoindex\b/.test(bron), true);
  }
  /* Dezelfde grond als de homepage, anders vergelijk je twee dingen tegelijk. */
  check('/proef staat op dezelfde grond als /',
    /ground="espresso"/.test(proefEN) && /ground="espresso"/.test(indexEN), true);
}

/* ─────────────────────────────────────────────────────────────────────────────
   7 · DE UITZONDERINGEN OP DESIGN.md BLIJVEN BENOEMD
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\nde afwijkingen van DESIGN.md staan opgeschreven');
{
  check('de hoeken worden verantwoord', /DESIGN\.md/.test(huid) && /Radius/.test(huid), true);
  check('de monospace-eyebrow wordt verantwoord', /eyebrow/.test(huid), true);
  check('en er wordt geen lettertype aan de bundel gehangen',
    /@font-face|fonts\.googleapis|@fontsource/.test(huid), false);
}

/* ─────────────────────────────────────────────────────────────────────────────
   8 · EN IN DE GEBOUWDE PAGINA'S OOK ECHT
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\nin dist/ staat het er ook zo');
/* Bestaan was hier de enige eis, en dat is te weinig: een build van vóór de
   laatste wijziging in src/ bestaat prima en zegt nog steeds iets over de site
   van gisteren. Dezelfde controle als hierboven, om dezelfde reden. */
const distStaat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!distStaat.er || distStaat.oud) {
  console.log(` --   niet gecontroleerd: ${distStaat.uitleg}`);
} else {
  const lees = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : null);
  const home = lees('dist/index.html');
  const proef = lees('dist/proef/index.html');
  check('dist/proef bestaat', proef !== null, true);
  if (proef) {
    check('/proef draagt de klasse NIET', /<body[^>]*huid-kantig/.test(proef), false);
    check('/proef draagt de aanwijzer NIET', /id="aw"/.test(proef), false);
    check('/proef staat op noindex', /name="robots"[^>]*noindex/.test(proef), true);
  }
  check('/ draagt de klasse', /<body[^>]*huid-kantig/.test(home), true);
  check('/ draagt de aanwijzer', /id="aw"/.test(home), true);
  /* Het merk met zijn hover-animatie staat er nog — de reden dat dit een huid
     werd en geen verbouwing. */
  check('/ heeft het merk met zijn twee lagen nog', /mk-line/.test(home) && /mk-fill/.test(home), true);

  const kaart = lees('dist/sitemap.xml');
  if (kaart) check('en /proef staat niet in de sitemap', /\/proef/.test(kaart), false);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
