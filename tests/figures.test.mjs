/* VISUAILS — de mock-ups mogen niet liegen.
 *
 *   npm run test:figures
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Er staan vijf getekende schermen op de site — FigDash, FigStudio, FigGallery,
 * FigGate en FigBoard — en tot vandaag was er niets dat ze aan de werkelijkheid
 * hield. Dat is niet theoretisch gebleven: FigStudio tekende de agenda als
 * "96 van 100 producten per week", terwijl src/data/capacity.js per DAG telt en
 * weken van honderd nergens bestaan. Vier figuren droegen ieder hun eigen kopie
 * van "10 – 14 aug", een hele werkweek, terwijl een vastgelegd venster twee
 * werkdagen is.
 *
 * Zoiets is niet met een tweede paar ogen op te lossen. Een mock-up ziet er
 * precies zo overtuigend uit als hij fout is, en /studio is de pagina die belooft
 * dat de datum een mechanisme HEEFT — dus is een getekend mechanisme dat het echte
 * niet is, daar erger dan een grijs vlak.
 *
 * ── WAT DEZE TEST DOET, EN WAT HIJ MET OPZET NIET DOET ─────────────────────
 *
 * Hij draait de ECHTE poort — dezelfde `offerableWindows()` die /start gebruikt om
 * een klant een datum te geven — op de verzonnen agenda in src/data/figdemo.js, en
 * eist dat het venster dat de figuur "aangeboden" noemt hetzelfde venster is.
 *
 * Hij controleert NIET of de figuur mooi is en niet of de opmaak klopt; dat is
 * werk voor een screenshot. Wat hij vasthoudt is de enige eigenschap van een
 * mock-up die een bezoeker kan schaden: dat wat erin staat, waar is.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import {
  ATTENDED_IMAGES_PER_DAY,
  ATTENDED_PER_DAY,
  ATTENDED_PER_WINDOW,
  IMAGES_PER_PRODUCT,
  LEAD_DAYS,
  PRODUCTS_PER_DAY,
  QUEUE_FLOOR_PER_DAY,
  WINDOW_DAYS,
  offerableWindows,
  windowFits,
  windowFor,
} from '../src/data/capacity.js';
import {
  DEMO_BLACKOUTS,
  DEMO_BOOKED,
  DEMO_DAYS,
  DEMO_FIRST_OFFERABLE,
  DEMO_ORDER,
  DEMO_OTHERS,
  DEMO_SMALL_PRODUCTS,
  DEMO_TODAY,
  demoRows,
  demoWindow,
  otherWindow,
  windowLabel,
} from '../src/data/figdemo.js';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(60)} ${ok ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
// Alleen voor sectie 8. Aparte namen, zodat het vangnet niet per ongeluk door
// read() loopt — dat is precies de functie die het moet bewaken.
const fsReaddir = (u) => readdirSync(u);
const fsExists = (u) => existsSync(u);

/* Alleen de code, zonder commentaar. Zelfde valkuil en dezelfde oplossing als in
   tests/nav.test.mjs: elke broncontrole die een verwijderde regel opspoort, vindt
   óók de noot die uitlegt dat die regel verwijderd is — en straft daarmee het
   opschrijven van de reden. In dit bestand is dat acuut, want de kopnoten van
   FigStudio en FigDash citeren letterlijk de foute tekst die eruit moest. */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

/* ══ 1 · HET VENSTER IN DE FIGUUR IS HET VENSTER VAN DE POORT ════════════════
 *
 * Dit is de kern. Niet "staat er een datum" maar: is het DEZE datum, uitgerekend
 * door de code die een echte klant een echte datum geeft.
 */
console.log('\nde poort en de tekening geven hetzelfde antwoord');
{
  const gate = offerableWindows({
    today: DEMO_TODAY,
    products: DEMO_ORDER.products,
    service: 'complete',
    booked: DEMO_BOOKED,
    blackouts: DEMO_BLACKOUTS,
    limit: 1,
  })[0];

  check('de poort geeft een venster vrij', Boolean(gate), true);
  check('en de figuur tekent datzelfde venster', demoWindow(DEMO_ORDER.products), gate);
  check('het venster duurt WINDOW_DAYS dagen', gate.days.length, WINDOW_DAYS);

  // De dagen die de figuur als "aangeboden" markeert, zijn precies de dagen van
  // dat venster. Niet meer (dan zou de figuur een breder venster suggereren dan
  // er verkocht wordt) en niet minder.
  const offered = demoRows(DEMO_ORDER.products).filter((r) => r.offered).map((r) => r.iso);
  check('en markeert precies die dagen', offered, gate.days);

  // Het label dat de bezoeker leest.
  check('het label leest als één venster', windowLabel(gate, 'nl'), '10 – 11 aug');
  check('en in het Engels', windowLabel(gate, 'en'), '10 – 11 Aug');
}

/* ══ 2 · DE GEWEIGERDE DAG IS ECHT GEWEIGERD ═════════════════════════════════
 *
 * De figuur wint zijn geloofwaardigheid met de dag die NIET kan. Als die dag in
 * werkelijkheid wel zou kunnen, is het beeld een verkooptruc met een grafiekje.
 */
console.log('\nwat geweigerd wordt, wordt echt geweigerd');
{
  const rows = demoRows(DEMO_ORDER.products);
  const full = rows.filter((r) => r.state === 'full');
  check('er staat minstens één volle dag in beeld', full.length >= 1, true);
  for (const r of full) {
    check(`${r.iso} zit werkelijk aan het plafond`, r.usedImages >= ATTENDED_IMAGES_PER_DAY, true);
    check(`en er past geen venster dat daar begint`,
      windowFits(r.iso, DEMO_ORDER.products * IMAGES_PER_PRODUCT, DEMO_BOOKED, DEMO_BLACKOUTS), false);
  }

  // De dagen met "ruimte" die tóch niet worden aangeboden — donderdag en vrijdag.
  // Dit is het subtielste deel van de figuur en dus het makkelijkste om per
  // ongeluk te laten liegen: de tekst zegt dat dertig producten twee HELEMAAL
  // vrije dagen vragen, en dat moet de poort ook echt zo zien.
  const roomButNotOffered = rows.filter((r) => r.state === 'open' && !r.offered && r.used > 0);
  check('er staan dagen met ruimte die niet worden aangeboden', roomButNotOffered.length >= 1, true);
  for (const r of roomButNotOffered) {
    check(`${r.iso} heeft ruimte`, r.usedImages < ATTENDED_IMAGES_PER_DAY, true);
    check(`en past tóch niet`,
      windowFits(r.iso, DEMO_ORDER.products * IMAGES_PER_PRODUCT, DEMO_BOOKED, DEMO_BLACKOUTS), false);
  }

  // De lead-tijd. De rijen die "te vroeg" heten, mogen niet aanbiedbaar zijn.
  for (const r of rows.filter((r) => r.state === 'early')) {
    check(`${r.iso} valt binnen de lead-tijd`, r.iso < DEMO_FIRST_OFFERABLE, true);
  }
  /* LEAD_DAYS zijn VOLLE dagen tussen vandaag en de eerste aanwijsbare dag, en
     dat is er één meer dan de oude regel `addWorkingDays(today, LEAD_DAYS)` gaf —
     zie de noot bij LEAD_DAYS in capacity.js. Maandag 3 augustus plus twee hele
     dagen is donderdag 6 augustus. Dit getal stond hier met de hand ingetypt en
     dat is met opzet: het is de enige plek waar de aanloop niet uit dezelfde
     som komt die hem produceert. */
  check(`de eerste aanwijsbare dag ligt ${LEAD_DAYS} volle dagen verder`,
    DEMO_FIRST_OFFERABLE, '2026-08-06');
}

/* ══ 3 · TWEE UITKOMSTEN UIT DEZELFDE AGENDA ═════════════════════════════════
 *
 * FigGate zet naast de uitkomst een tweede: twaalf producten krijgen een eerder
 * venster dan dertig. Dat is de hele bewering "geteld in producten, niet in
 * bestellingen", en het is een bewering die de test kan nalezen.
 */
console.log('\nkleiner is eerder, en dat is geen toeval');
{
  const big = demoWindow(DEMO_ORDER.products);
  const small = demoWindow(DEMO_SMALL_PRODUCTS);
  check('de kleinere bestelling krijgt ook een venster', Boolean(small), true);
  check('en dat venster ligt eerder', small.start < big.start, true);
  check('het kleine label', windowLabel(small, 'nl'), '6 – 7 aug');

  // En de vergelijking is alleen eerlijk als het écht dezelfde agenda is: zelfde
  // dag, zelfde boeking, alleen een ander aantal producten.
  check('zelfde agenda, alleen een ander aantal',
    JSON.stringify(small),
    JSON.stringify(offerableWindows({ today: DEMO_TODAY, products: DEMO_SMALL_PRODUCTS, service: 'complete', booked: DEMO_BOOKED, blackouts: DEMO_BLACKOUTS, limit: 1 })[0]));
}

/* ══ 4 · DE FIXTURE ZELF IS GELDIG ══════════════════════════════════════════ */
console.log('\nde verzonnen agenda kan bestaan');
{
  check('geen dag boven het dagplafond',
    DEMO_DAYS.filter((d) => (DEMO_BOOKED[d] || 0) > ATTENDED_IMAGES_PER_DAY), []);
  check('de demobestelling past binnen één venster',
    DEMO_ORDER.products <= ATTENDED_PER_WINDOW, true);
  check('en de kleine ook', DEMO_SMALL_PRODUCTS <= ATTENDED_PER_WINDOW, true);
  /* HET WEEKEND IS EEN BESLUIT GEWORDEN, GEEN REGEL. Hier stond "alleen
     werkdagen" met een lege verwachting, omdat capacity.js zaterdag en zondag zelf
     oversloeg. Sinds isOpenDay() alleen nog naar dichtgezette dagen kijkt, moet de
     figuur die twee dagen tonen én als gesloten tekenen — anders laat hij een
     regel zien die niet meer bestaat. De assertie is daarom omgedraaid: precies de
     dagen die de studio heeft dichtgezet, staan als gesloten in beeld. */
  check('de gesloten dagen in beeld zijn precies de dichtgezette dagen',
    demoRows().filter((r) => r.closed).map((r) => r.iso), [...DEMO_BLACKOUTS]);
  check('geen enkele gesloten dag wordt aangeboden',
    demoRows(DEMO_ORDER.products).filter((r) => r.closed && r.offered), []);
  check('twaalf dagen in beeld', DEMO_DAYS.length, 12);
  // Boven het vensterplafond geeft de poort niets terug, en de figuur mag daar
  // dus ook geen datum van maken.
  check('boven het plafond is er geen venster', demoWindow(ATTENDED_PER_WINDOW + 1), null);
  check('en het label wordt een streepje', windowLabel(null, 'nl'), '—');
}

/* ══ 4b · DE ANDERE BESTELLINGEN VEROORZAKEN DE BEZETTING ═══════════════════
 *
 * Dit is de assertie die tijdens het schrijven meteen rood werd en daarmee een
 * echte fout in mijn eigen figuur vond: Nord Label stond in de tabel op het
 * venster dat de poort in FigGate juist als VRIJ aanbood.
 *
 * De regel: staat een bestelling in een venster, dan moet elke dag van dat venster
 * haar aandeel al gebóekt hebben. Anders staat er een bestelling in de tabel die
 * niet in de agenda staat, en dan kan diezelfde dag een tweede keer verkocht
 * worden — precies wat gate[3] op /studio belooft dat niet gebeurt.
 */
console.log('\nde tabel en de agenda gaan over dezelfde bezetting');
{
  const perDayOf = (n) => Math.ceil((n * IMAGES_PER_PRODUCT) / WINDOW_DAYS);
  const load = {};
  for (const o of DEMO_OTHERS) {
    if (!o.start) {
      check(`${o.brand} heeft geen venster en dus geen datum`, otherWindow(o, 'nl'), '—');
      continue;
    }
    const days = windowFor(o.start, o.products * IMAGES_PER_PRODUCT, {}, DEMO_BLACKOUTS);
    check(`${o.brand} heeft een venster van ${WINDOW_DAYS} dagen`, days.length, WINDOW_DAYS);
    for (const d of days) {
      check(`${o.brand}: ${d} heeft haar aandeel geboekt`,
        (DEMO_BOOKED[d] || 0) >= perDayOf(o.products), true);
      load[d] = (load[d] || 0) + perDayOf(o.products);
    }
  }
  // En bij elkaar passen ze onder wat de agenda voor die dagen zegt: twee
  // bestellingen in één venster is normaal, drie keer hetzelfde etmaal verkopen
  // niet.
  for (const [d, n] of Object.entries(load)) {
    check(`${d}: de bestellingen samen passen in de bezetting`, n <= (DEMO_BOOKED[d] || 0), true);
  }
  // De bestelling waar de poort in FigGate een datum voor zoekt, mag NIET al in de
  // bezetting staan — anders tekent die figuur een agenda waarin de aanvraag zelf
  // al verwerkt is, en dan is de uitkomst geen antwoord meer.
  const gate = demoWindow(DEMO_ORDER.products);
  for (const d of gate.days) {
    check(`${d} is nog vrij op het moment dat de kiezer kijkt`, DEMO_BOOKED[d], 0);
  }
}

/* ══ 5 · GEEN FIGUUR REKENT NOG ZELF ════════════════════════════════════════
 *
 * De reden dat dit fout kon gaan, was niet dat iemand slecht rekende — het was dat
 * vier bestanden ieder hun eigen kopie van hetzelfde feit droegen. Deze sectie
 * houdt vast dat die kopieën weg zijn, want zolang ze weg zijn, kan sectie 1 t/m 4
 * over alle figuren gaan in plaats van over de fixture alleen.
 */
console.log('\nvier figuren, één bron');
{
  /* DRIE, NIET VIER. FigStudio.astro is in augustus 2026 van de homepage
     gehaald en daarna verwijderd: hij tekende dezelfde capaciteitsbalken die
     FigGate op /studio al tekent — 944 regels voor één figuur, zie
     HERONTWERP.md §2.6. Zijn naam stond hier en in de adreslijst hieronder, en
     read() gooit op een bestand dat er niet is, dus dit hele testbestand viel
     om zodra het bestand weg was. Dat is de reden dat sectie 8 hieronder er nu
     staat. */
  const figs = ['FigGate', 'FigBoard', 'FigDash'];
  for (const f of figs) {
    const src = read(`src/components/${f}.astro`);
    check(`${f} leest de fixture`, /from '\.\.\/data\/figdemo\.js'/.test(src), true);
    // Geen ingetypt venster meer, in geen enkele taal. Dit patroon zoekt een
    // dagbereik met een streepje ertussen in een string — precies de vorm die
    // hier vier keer stond.
    const code = codeOnly(src);
    check(`${f} heeft geen ingetypte leverdatum`,
      /['"`][^'"`]*\d{1,2}\s*[–—-]\s*\d{1,2}\s*(aug|Aug)[^'"`]*['"`]/.test(code), false);
  }

  // En de weken van honderd zijn nergens terug.
  for (const f of figs) {
    const code = codeOnly(read(`src/components/${f}.astro`));
    check(`${f} noemt geen capaciteit per week`, /(per week|per_week|calWeeks)/i.test(code), false);
  }

  /* /studio noemt de cijfers, en leest ze uit capacity.js in plaats van ze te
     herhalen. Hier stond "a week has room for a number of products". */
  const page = codeOnly(read('src/components/StudioPage.astro'));
  check('StudioPage leest de constanten', /from '\.\.\/data\/capacity\.js'/.test(page), true);
  check('en tekent de figuren', /<FigGate lang=\{lang\} \/>/.test(page) && /<FigBoard lang=\{lang\} \/>/.test(page), true);
  check('de grijze vlakken zijn weg', /class="ph"/.test(page), false);
  // Geen hardgecodeerd 18 / 15 / 3 in de tekst: dat is precies hoe /pricing en
  // /studio ooit twee verschillende plafonds gingen noemen.
  check('geen hardgecodeerd dagplafond in de copy',
    new RegExp(`['\`][^'\`]*\\b${PRODUCTS_PER_DAY} (products|producten) per`).test(page), false);
}

/* ══ 6 · HET BLIJFT EEN MOCK-UP, EN DAT MOET ERBIJ STAAN ════════════════════
 *
 * Een schermafdruk wordt gedeeld zonder zijn pagina. Het woord "voorbeeld" hoort
 * daarom IN het beeld te staan en niet in de tekst ernaast — en dat geldt sterker
 * voor deze twee figuren dan voor de andere, want een adminscherm met echte
 * merknamen erin leest als een klantenlijst.
 */
console.log('\nhet is een voorbeeld, en dat staat erin');
{
  for (const f of ['FigGate', 'FigBoard']) {
    const src = read(`src/components/${f}.astro`);
    check(`${f} zegt in beeld dat het een voorbeeld is`,
      /Voorbeeld met verzonnen gegevens/.test(src) && /Example with made-up data/.test(src), true);
    check(`${f} linkt niet naar het adminportaal`, /href=/.test(src), false);
  }

  /*
   * ADRESACHTIGE GEGEVENS MOGEN ALLEEN DE AFGESPROKEN NEPGEGEVENS ZIJN.
   *
   * De regel komt van Lucas en staat voluit in FigDash.astro: *"NOOIT EEN BESTAAND
   * ADRES IN EEN MOCKUP, ook niet dat van jezelf, ook niet als het 'maar een
   * voorbeeld' is. Een adres dat echt kan zijn, wordt gelezen als echt."* Op de
   * homepage stond eerder zijn eigen huisadres, om precies die reden.
   *
   * TWEE KEER MOEST DEZE ASSERTIE WORDEN OMGEGOOID, en beide keren wees de
   * sabotage het aan:
   *
   *   · Eerst stond hij alleen op FigGate en FigBoard. Een postcode achter een
   *     merknaam plakken hield hem groen — want die merknamen wonen sinds een uur
   *     eerder in src/data/figdemo.js. De fixture is nu juist DE plek waar iemand
   *     per ongeluk een echt adres intypt, dus die hoort erbij.
   *   · Daarna was hij "geen postcode, nergens", en toen werd hij rood op FigDash —
   *     die een tabblad met klantgegevens tekent en dus een adres MOET tonen. Een
   *     regel die het correcte geval afkeurt, wordt weggehaald in plaats van
   *     gevolgd.
   *
   * Wat er nu staat is daarom sterker dan een verbod: elk adresachtig ding moet
   * exact het afgesproken nepadres zijn. Zo blijft het veld bestaan en kan de
   * inhoud niet stilletjes iets worden dat echt kán zijn.
   */
  const FAKE_POSTCODE = '1234 AB';
  const dataFiles = [
    'src/data/figdemo.js',
    'src/components/FigGate.astro',
    'src/components/FigBoard.astro',
    'src/components/FigDash.astro',
    'src/components/FigGallery.astro',
  ];
  for (const f of dataFiles) {
    const found = [...new Set(read(f).match(/\b\d{4}\s?[A-Z]{2}\b/g) || [])];
    check(`${f.split('/').pop()}: alleen het afgesproken nepadres`,
      found.filter((x) => x !== FAKE_POSTCODE), []);
  }
  // En het nepadres zelf blijft compleet, zodat niemand het per veld vervangt door
  // iets dat plausibeler leest.
  const dash = read('src/components/FigDash.astro');
  for (const bit of ['Voorbeeldstraat 12', FAKE_POSTCODE, 'NL001234567B01']) {
    check(`FigDash houdt "${bit}"`, dash.includes(bit), true);
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);


/* ══ 8 · ELK BESTAND DAT EEN TEST OPENT, BESTAAT ═══════════════════════════
 *
 * WAAROM DEZE SECTIE ER IS. Op 18 augustus 2026 zouden twee componenten van de
 * schijf gaan die door niets meer geïmporteerd werden: FigStudio.astro en
 * HooksPage.astro. Geen enkele pagina rendert ze, `astro build` merkt er niets
 * van — maar twee TESTBESTANDEN lazen ze nog met readFileSync, en die gooit een
 * ENOENT. Dode code weghalen zou dus de testsuite hebben omgelegd, en pas ná
 * het verwijderen. De verwijzing zat in het gereedschap en niet in het product,
 * en dat is precies het soort fout dat je niet ziet aankomen.
 *
 * WAT HIJ CONTROLEERT. Elk LETTERLIJK pad dat een test aan zijn eigen read()
 * geeft. Meer niet, en dat is met opzet:
 *
 *   · `new URL(...)` wordt hier NIET meegenomen. Drie tests gebruiken die vorm
 *     juist met existsSync() om te bewijzen dat een bestand er NIET is —
 *     tests/nav.test.mjs eist dat /hooks geen pagina is, tests/register.test.mjs
 *     dat het verwerkingsregister geen pagina is. Die paden horen te ontbreken;
 *     ze hier afkeuren zou het correcte geval rood maken, en een regel die het
 *     correcte geval afkeurt wordt weggehaald in plaats van gevolgd.
 *
 *   · Een pad telt als gevonden zodra het vanaf de PROJECTWORTEL óf vanaf
 *     tests/ bestaat. De testbestanden zijn het namelijk niet eens over hun
 *     basis: de meeste schrijven read('src/...'), maar tests/order-api.test.mjs
 *     heeft een eigen read() die '../functions/...' verwacht. Beide vormen zijn
 *     goed; alleen een pad dat langs geen van beide wegen bestaat, is fout.
 *
 * WAT HIJ NIET VINDT: paden die uit een variabele zijn samengesteld, zoals de
 * lus in sectie 5 hierboven. Die faalt vanzelf en met een leesbare fout. Dit
 * vangnet is voor de letterlijke paden, en dat waren beide gevallen die dit
 * hebben veroorzaakt.
 */
console.log('\nelk pad dat een test opent, bestaat');
{
  const testDir = new URL('./', import.meta.url);
  const bestanden = readdirSync(testDir).filter((n) => n.endsWith('.test.mjs'));
  let gecontroleerd = 0;
  const ontbrekend = [];
  for (const naam of bestanden) {
    /* codeOnly() EERST, en dat is geen netheid maar een reparatie. Zonder
       hem vond dit patroon zijn eigen uitleg hierboven — de noot citeert
       read('src/...') met opzet, want die vorm uitleggen zonder hem te tonen
       kan niet. Dezelfde valstrik heeft dit project al eens eerder een halve
       middag gekost: een regex die zijn eigen commentaar leest, meldt een
       fout die alleen in de uitleg bestaat. */
    const src = codeOnly(readFileSync(new URL(naam, testDir), 'utf8'));
    const paden = new Set();
    // read('...') met een letterlijke string. Backticks en ${} vallen af: die
    // zijn samengesteld en horen bij de uitzondering hierboven.
    for (const m of src.matchAll(/\bread\(\s*'([^'\n]+)'\s*\)/g)) paden.add(m[1]);
    for (const pad of paden) {
      gecontroleerd += 1;
      const vanafWortel = existsSync(new URL(`../${pad}`, import.meta.url));
      const vanafTests = existsSync(new URL(pad, testDir));
      if (!vanafWortel && !vanafTests) ontbrekend.push(`${naam} → ${pad}`);
    }
  }
  // Als de regex ooit stukgaat, zegt dit dat er niets meer gecontroleerd wordt
  // in plaats van dat alles goed is. Een vangnet dat nul dingen vangt en groen
  // blijft, is erger dan geen vangnet.
  check('er zijn paden gevonden om te controleren', gecontroleerd > 40, true);
  check('geen enkele test opent een bestand dat niet bestaat', ontbrekend, []);
}
