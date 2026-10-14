/* VISUAILS — is het vel op alle drie de dienstpagina's hetzelfde vel?
 *   npm run test:stijlvel        (vereist een build: npm run build)
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 20 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas koos uit drie ontwerpen (kladblok/stijlkaart/) ontwerp B, "het vel", en
 * zei er twee dingen bij die allebei een manier hebben om stil te sneuvelen:
 *
 *   *"B mag daarnaast bij alle style categorieën worden toegepast en maak het
 *   enorm consistent om rust te bewaren."*
 *
 *   *"het moet niet zo zijn dat de klant denkt dat hij alleen die beelden
 *   krijgt omdat er meer beelden per order per product toegevoegd kunnen
 *   worden. De beelden die er staan zijn wat de klant altijd voor het bedrag
 *   mag verwachten."*
 *
 * ── WAT ER ZONDER DEZE TOETS MISGAAT ──────────────────────────────────────
 *
 *   1 · HET VEL DRIFT UIT ELKAAR. /catalog, /lifestyle en /video delen één
 *       component, maar ze hebben elk een eigen pagina die hem voedt. Eén
 *       pagina die morgen een `photos`-lijst korter maakt dan LEVERVLAKKEN,
 *       en het vel toont drie tegels waar de prijs er vier belooft. Vandaar:
 *       het AANTAL tegels wordt hier tegen pricing.js gelegd en niet tegen
 *       zichzelf.
 *
 *   2 · DE ONDERGRENS WORDT EEN PLAFOND. Een contactvel leest als een
 *       volledige opsomming; dat is zijn kracht en zijn risico. De zin die
 *       zegt dat er meer bij kan staat één keer per pagina in de kop. Valt hij
 *       weg, dan belooft het vel stilletjes een maximum dat er niet is — en
 *       dat is precies de zin die Lucas erbij vroeg.
 *
 *   3 · DE INGESTUURDE FOTO WORDT WEER EEN POSTZEGEL. Het hele ontwerp komt
 *       voort uit *"vooral de input/klant foto is ontzettend klein en het ziet
 *       er gewoon niet logisch uit"*. Hij hoort de EERSTE tegel te zijn, met
 *       de klasse die hem zijn stippellijn geeft. Staat hij er niet of staat
 *       hij achteraan, dan is de klacht terug.
 */
import { readFileSync, existsSync } from 'node:fs';
import { levervlakken } from '../src/data/pricing.js';

let pass = 0, fail = 0;
function ok(naam, waar, verwacht = true, kreeg = '') {
  if (waar) { pass += 1; console.log(` ok   ${naam}`); }
  else { fail += 1; console.log(`FAIL   ${naam}`.padEnd(70) + `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`); }
}

/* Dienst, pad en taal. Beide talen, want de bijschriften en de zin over de
   ondergrens bestaan twee keer en een vertaling is een plek om er één te
   vergeten. */
const PAGINAS = [
  ['catalog', '/catalog/', 'en'],
  ['catalog', '/nl/catalog/', 'nl'],
  ['lifestyle', '/lifestyle/', 'en'],
  ['lifestyle', '/nl/lifestyle/', 'nl'],
  ['video', '/video/', 'en'],
  ['video', '/nl/video/', 'nl'],
];

const lees = (p) => {
  const f = `dist/${p.replace(/^\/|\/$/g, '')}/index.html`;
  return existsSync(f) ? readFileSync(f, 'utf8') : null;
};

/* Eén <ol class="sr-k-vel …"> uit de HTML halen, inclusief zijn <li>'s. Geen
   DOM-parser in dit project; een regexp die op de sluittag stopt is genoeg
   omdat een vel geen geneste <ol> bevat — en als dat ooit wel zo is, breekt
   deze toets luid in plaats van stil goed te keuren. */
const vellen = (html) => (html.match(/<ol class="sr-k-vel[^"]*"[\s\S]*?<\/ol>/g) || []);

console.log('\nhet vel op de drie dienstpagina\'s\n');

for (const [dienst, pad, taal] of PAGINAS) {
  const html = lees(pad);
  if (!html) { ok(`${pad} is gebouwd`, false, 'bestand', 'ontbreekt'); continue; }

  const namen = levervlakken(dienst, taal);
  const zin = dienst === 'video'
    ? (taal === 'nl' ? 'Meer clips vraag je aan via het aanvraagformulier' : 'More clips can be requested through the request form')
    : (taal === 'nl' ? 'Meer beelden kies je erbij in het bestelformulier' : 'More images can be added in the order form');

  /* ── IN DE HAL (12 oktober 2026, avond) ────────────────────────────────
     /catalog en /lifestyle staan in de hal (afvinklijst 8). Het vel is daar
     geen contactvel meer maar dezelfde vorm als op /start: bij catalog de
     vier beelden van één product met hun naam (.h-st-set), bij lifestyle de
     drie genummerde kaarten (.h-ls-drie). Jouw foto staat er als voor en na
     (Compare). De twee beloftes blijven getoetst: precies de beelden die de
     prijs belooft, in die volgorde, en één keer de zin dat er meer kan. */
  /* ── VIDEO IN DE HAL (13 oktober 2026, afvinklijst 16) ─────────────────
     /video toont zolang video op aanvraag is geen vel met een geleend beeld,
     maar per soort een vlak "Clip volgt". De belofte blijft dezelfde: de kop
     van de soorten zegt wat élke look levert (zoveel clips als pricing.js
     belooft), en één keer dat er meer kan via het aanvraagformulier. */
  if (dienst === 'video' && /<body[^>]*class="[^"]*\bhal\b/.test(html)) {
    const regel = (html.match(/<p class="h-pr-kopzin h-vd-levert[^"]*">([^<]*)<\/p>/) || ['', ''])[1];
    const telwoord = taal === 'nl' ? ['één', 'twee', 'drie'][namen.length - 1] : ['one', 'two', 'three'][namen.length - 1];
    ok(`${pad} — de kop van de soorten zegt wat elke look levert`, regel.includes(taal === 'nl' ? 'Elke look levert' : 'Every look delivers'), 'de zin', regel);
    ok(`${pad} — ${telwoord} clip, zoals pricing.js belooft (${namen.join(', ')})`, new RegExp(`(^|\\s)${telwoord} clip`).test(regel), telwoord, regel);
    const keer = html.split(zin).length - 1;
    ok(`${pad} — "meer clips kan" staat precies één keer`, keer === 1, 1, keer);
    ok(`${pad} — geen resten van de oude baan (pijl of vakkenraster)`,
       !html.includes('sr-k-pijl') && !html.includes('sr-k-vakken'), 'geen', 'wel');
    continue;
  }
  if (/<body[^>]*class="[^"]*\bhal\b/.test(html)) {
    const blok = dienst === 'catalog'
      ? (html.match(/<li class="h-st-set[\s"][\s\S]*?<\/li>/) || [''])[0]
      : (html.match(/<ol class="h-ls-drie"[\s\S]*?<\/ol>/) || [''])[0];
    ok(`${pad} — de set staat er (${dienst === 'catalog' ? '.h-st-set' : '.h-ls-drie'})`, blok.length > 0, 'blok', 'geen');
    const gevonden = dienst === 'catalog'
      ? [...blok.matchAll(/<span class="h-st-set-naam">([^<]*)<\/span>/g)].map((m) => m[1])
      : [...blok.matchAll(/<p class="h-pp-naam">([^<]*)<\/p>/g)].map((m) => m[1]);
    ok(`${pad} — de set noemt ${namen.join(', ')}, in die volgorde`, JSON.stringify(gevonden) === JSON.stringify(namen), namen, gevonden);
    if (dienst === 'catalog') {
      /* de build zet style="--d:N" om in een klasse, dus niet op de sluitquote matchen */
      const beelden = (blok.match(/class="h-st-set-beeld[\s"]/g) || []).length;
      ok(`${pad} — met ${namen.length} beelden`, beelden === namen.length, namen.length, beelden);
    } else {
      const nummers = [...blok.matchAll(/<b>(\d\d)<\/b>/g)].map((m) => m[1]);
      ok(`${pad} — genummerd 01 tot ${String(namen.length).padStart(2, '0')}`, JSON.stringify(nummers) === JSON.stringify(namen.map((_, i) => String(i + 1).padStart(2, '0'))), namen.length, nummers);
    }
    const keer = html.split(zin).length - 1;
    /* Lifestyle is sinds 14 oktober 2026 vast vier beelden (afvinklijst 23,
       v23-extra a): daar hoort de zin dat er meer kan juist NIET te staan. */
    const wilKeer = dienst === 'lifestyle' ? 0 : 1;
    ok(`${pad} — "meer beelden kan" staat ${wilKeer ? 'precies één keer' : 'er niet (vast vier)'}`, keer === wilKeer, wilKeer, keer);
    ok(`${pad} — geen resten van de oude baan (pijl of vakkenraster)`,
       !html.includes('sr-k-pijl') && !html.includes('sr-k-vakken'), 'geen', 'wel');
    continue;
  }

  const lijst = vellen(html);
  ok(`${pad} — er staat minstens één vel`, lijst.length > 0, '>0', lijst.length);
  if (!lijst.length) continue;

  const verwachtTegels = namen.length + 1;          // de geleverde beelden + jouw foto

  let goedAantal = 0, goedVoor = 0, goedNummers = 0;
  for (const vel of lijst) {
    const tegels = vel.match(/<li class="sr-k-tegel[^"]*"/g) || [];
    if (tegels.length === verwachtTegels) goedAantal += 1;
    /* De ingestuurde foto is de EERSTE tegel en draagt is-voor. */
    if (/^<ol class="sr-k-vel[^"]*heeft-voor[^"]*"[\s\S]*?<li class="sr-k-tegel is-voor"/.test(vel)) goedVoor += 1;
    /* Elk geleverd beeld draagt zijn nummer en zijn naam. */
    const alle = namen.every((naam, i) => vel.includes(`${String(i + 1).padStart(2, '0')} · ${naam}`));
    if (alle) goedNummers += 1;
  }

  ok(`${pad} — elk vel heeft ${verwachtTegels} tegels (${namen.length} geleverd + jouw foto)`,
     goedAantal === lijst.length, lijst.length, goedAantal);
  ok(`${pad} — jouw foto is in elk vel de eerste tegel`, goedVoor === lijst.length, lijst.length, goedVoor);
  ok(`${pad} — elk vel noemt ${namen.map((n, i) => `${String(i + 1).padStart(2, '0')} · ${n}`).join(', ')}`,
     goedNummers === lijst.length, lijst.length, goedNummers);

  /* ── DE ONDERGRENS, PRECIES ÉÉN KEER ────────────────────────────────────
     Nul keer is de belofte die stilletjes een plafond wordt; twee keer of
     vaker is de herhaling waar hij juist uit de kamers voor weggehaald is. */
  /* Korter sinds 23 september 2026 (minder tekst); de belofte is dezelfde:
     meer beelden kan, en dat kies je in het bestelformulier. */
  /* Video heeft geen bestelformulier en levert clips: daar staat dezelfde
     ondergrens met het aanvraagformulier (30 september 2026). */
  const keer = html.split(zin).length - 1;
  ok(`${pad} — "meer beelden kan" staat precies één keer`, keer === 1, 1, keer);

  /* En de oude opzet mag niet half blijven staan: een pijl of een vakkenraster
     dat ergens nog uit een cache of een vergeten pagina komt, is een tweede
     ontwerp op dezelfde site. */
  ok(`${pad} — geen resten van de oude baan (pijl of vakkenraster)`,
     !html.includes('sr-k-pijl') && !html.includes('sr-k-vakken'), 'geen', 'wel');
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
