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
  const kaal = (sel) => {
    let vorig;
    do { vorig = sel; sel = sel.replace(/\([^()]*\)/g, '()'); } while (sel !== vorig);
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

  check('de aanwijzer is aria-hidden', /class="aw"[^>]*aria-hidden="true"/.test(huid), true);
}

/* ─────────────────────────────────────────────────────────────────────────────
   4 · DE SCHAKELAAR IN LAYOUT.ASTRO
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\nde huid komt alleen op pagina’s die erom vragen');
{
  check('Layout kent de prop', /huid\?:\s*'geen'\s*\|\s*'kantig'/.test(layout), true);
  check('en heeft "geen" als standaard', /huid\s*=\s*'geen'/.test(layout), true);
  check('de body-klasse hangt aan de prop', /huid === "kantig" && "huid-kantig"/.test(layout), true);
  check('het component wordt voorwaardelijk gerenderd',
    /\{huid === 'kantig' && <HuidKantig \/>\}/.test(layout), true);
  /* De grond en de huid zijn twee onafhankelijke keuzes. Ging dit terug naar
     één ternair, dan zou /proef zijn espresso-grond verliezen. */
  check('de grond staat er los van', /ground === "espresso" && "ground-espresso"/.test(layout), true);
}

/* ─────────────────────────────────────────────────────────────────────────────
   5 · DE HOMEPAGE VRAAGT ER NIET OM
   ───────────────────────────────────────────────────────────────────────────── */
console.log('\nde huid staat op de homepage en nergens anders');
{
  /* DIT STOND ANDERSOM. Tot 27 augustus 2026 droeg /proef de stijl en was de
     homepage onaangeroerd; die volgorde is omgedraaid op Lucas' verzoek. Wat
     hetzelfde blijft is wat deze toets bewaakt: de huid staat op precies twee
     pagina's en op geen enkele andere. */
  check('/ vraagt de huid', /huid="kantig"/.test(indexEN), true);
  check('/nl vraagt de huid', /huid="kantig"/.test(indexNL), true);

  /* De proefroutes zijn nu juist de versie ZONDER. Ze bestaan om te kunnen
     vergelijken zonder een bestand weg te hoeven halen. */
  check('/proef vraagt hem NIET', /huid\s*=/.test(proefEN), false);
  check('/nl/proef vraagt hem NIET', /huid\s*=/.test(proefNL), false);

  /* De toets die afgaat op de dag dat iemand de stijl ergens anders "even"
     probeert en het laat staan. Dit is de hele afspraak met Lucas: eerst de
     homepage goed, daarna pas de rest — en dan pas met zijn akkoord. */
  const anders = globSync('src/pages/**/*.astro')
    .filter((f) => !/[\\/](index|proef)\.astro$/.test(f))
    .filter((f) => /huid\s*=\s*["']kantig["']/.test(readFileSync(f, 'utf8')));
  check('geen andere pagina gebruikt de huid', anders, []);
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
if (!existsSync('dist/index.html')) {
  console.log(' --   dist/ ontbreekt — draai npm run build om deze groep te meten');
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
