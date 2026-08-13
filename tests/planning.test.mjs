/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE PLANNING — WIE EEN VENSTER KRIJGT, EN OF DE ONDERSTE TREDE ERIN PAST
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Twee dingen die niets met elkaar te maken lijken te hebben en beide over dezelfde
 * agenda gaan. Ze staan samen in één bestand omdat ze op dezelfde manier stukgaan:
 * er valt niets om, er komt geen foutmelding, en de fout staat in een e-mail aan een
 * klant of in een prijs op de homepage.
 *
 * ── 1 · WIE EEN GERESERVEERD VENSTER KRIJGT ─────────────────────────────────
 *
 * Gevonden op 12 augustus 2026. `tierForProducts()` keek alleen naar het AANTAL, en
 * het video-aanvraagformulier post zijn aantal clips in datzelfde veld `products` —
 * met 10 en 12 in de keuzelijst. Tien clips gaven dus `tier='attended'`, en dan zegt
 * de bevestigingsmail *"levering binnen 48 uur vanaf je leverdatum, vastgezet
 * voordat je betaalt"*. Voor een dienst die met de hand wordt ingepland, waarvoor
 * geen bestelstroom bestaat en waar de capaciteitspoort nooit langs is geweest.
 *
 * De agenda zelf bleef schoon: `window_start` blijft NULL en elke bezettingsquery
 * filtert op `tier='attended' AND window_start IS NOT NULL`. Het was dus geen dubbele
 * boeking maar iets vervelenders — een belofte die niemand had ingepland, plus een
 * oranje alarm in de studiomail bij elke grotere video-aanvraag.
 *
 * ── 2 · OF DE ONDERSTE TREDE BESTELBAAR IS ──────────────────────────────────
 *
 * Op 12 augustus is de trede "€55 vanaf 35 producten" uit de staffel gehaald omdat de
 * capaciteitscheck alles boven 30 producten per venster weigert: dat bedrag stond in
 * de hero en in de meta description en was niet te bestellen.
 *
 * De noot in pricing.js vraagt letterlijk dat er, als die trede ooit terugkomt,
 * *"dezelfde dag een wijziging in capacity.js bij hoort"*. Maar niets hield dat
 * tegen — er was geen enkele test die de twee getallen naast elkaar legde. Een noot
 * is geen mechanisme; dit bestand is dat wel.
 */
import { readFileSync } from 'node:fs';
import { buildStaat } from './lib/build.mjs';
import { tierFor, isLadderService, LADDER, WINDOW_THRESHOLD, EXTRA_PHOTO_LADDER, MAX_EXTRA_PER_PRODUCT } from '../src/data/pricing.js';
import { ATTENDED_PER_WINDOW } from '../src/data/capacity.js';
import { SHOTS_PER_PRODUCT } from '../src/data/shots.js';
import { MAX_BATCH_FILES } from '../src/lib/uploads.js';
import { PAYABLE_SERVICES, ladderKey } from '../src/lib/quote.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(60)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

console.log('\nVISUAILS — de planning\n');

console.log('alleen een dienst van de prijsladder kan een venster krijgen');
{
  /* De ladderdiensten: bij tien of meer producten hoort daar een gereserveerd venster,
     want daar bestaat een capaciteitspoort voor. */
  for (const svc of ['catalog', 'lifestyle', 'complete']) {
    ok(`${svc} met ${WINDOW_THRESHOLD} producten is attended`, tierFor(WINDOW_THRESHOLD, svc), 'attended');
    ok(`${svc} met ${WINDOW_THRESHOLD - 1} nog niet`, tierFor(WINDOW_THRESHOLD - 1, svc), 'unattended');
  }
  /* En de wire-waarde, want /start/complete post `service=drop` en niet `complete`.
     Diezelfde val kostte eerder een bestelling van € 2.359,50 die gratis de deur uit
     ging (zie LADDER_KEY in src/lib/quote.js) — dus wordt hij hier expliciet getoetst
     in plaats van dat de laddernaam wordt aangenomen. */
  ok('de wire-waarde drop telt als complete', tierFor(12, 'drop'), 'attended');
  ok('en isLadderService kent hem ook', isLadderService('drop'), true);

  /* DE KERN. Video is een aanvraag en geen bestelling: geen prijs op de ladder, geen
     capaciteitspoort, geen betaallink. Dus nooit attended, hoeveel clips er ook staan. */
  for (const n of [10, 12, 30, 999]) {
    ok(`video met ${n} clips blijft unattended`, tierFor(n, 'video'), 'unattended');
  }
  ok('en een merkmodel-aanvraag ook', tierFor(12, 'custom'), 'unattended');
  ok('en de proefvisual', tierFor(12, 'test-sample'), 'unattended');
  ok('een onbekende dienst valt naar unattended', tierFor(12, 'iets-nieuws'), 'unattended');

  /* ZONDER DIENST BLIJFT HET OUDE GEDRAG. Elke bestaande aanroeper gaf alleen een
     aantal mee, en die mogen niet stil van gedrag veranderen — dat zou een tweede,
     stillere fout zijn dan degene die dit verhelpt. */
  ok('zonder dienst blijft het bij het aantal', tierFor(12), 'attended');
  ok('en met null ook', tierFor(12, null), 'attended');

  /* De rommelgevallen: een aantal dat geen getal is hoort naar unattended te vallen,
     want dat is de tier die niets reserveert. */
  for (const raar of ['Meer dan 30 producten', '', null, undefined, NaN]) {
    ok(`aantal ${JSON.stringify(raar)} valt naar unattended`, tierFor(raar, 'catalog'), 'unattended');
  }
}

console.log('\nde server denkt hetzelfde als de browser');
{
  /*
   * functions/api/order.js heeft een EIGEN copie van deze beslissing, met een eigen
   * WINDOW_THRESHOLD — en dat is met opzet: die functie draait in een Worker en het
   * hele prijsmodule inladen voor één vergelijking is veel module voor één getal. De
   * prijs daarvan is dat de twee helften uit elkaar kunnen lopen, en dat is precies
   * wat er hier gebeurde: de browserhelft is niet de helft die de bestelling in de
   * database zet.
   */
  const ORDER = read('functions/api/order.js');
  const code = ORDER.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  ok('de servercopie neemt de dienst mee', /function tierForProducts\(products, service\)/.test(code), true);
  ok('en wordt met de dienst aangeroepen', /tierForProducts\(products, svc\)/.test(code), true);
  ok('hij toetst tegen PAYABLE_SERVICES', /PAYABLE_SERVICES\.has\(ladderKey\(service\)\)/.test(code), true);
  /* ladderKey() eromheen, niet de ruwe waarde: anders valt 'drop' erbuiten en verliest
     de duurste deur op de site zijn venster. */
  ok('met ladderKey eromheen en niet de ruwe waarde',
    /PAYABLE_SERVICES\.has\(service\)/.test(code), false);
  ok('de drempel staat er nog als constante', /const WINDOW_THRESHOLD = 10;/.test(code), true);
  ok('en die is dezelfde als in pricing.js', WINDOW_THRESHOLD, 10);

  /* En de verzameling waar de servercopie op toetst moet dezelfde diensten dekken als
     de ladder. Lopen die uit elkaar, dan krijgt een ladderdienst geen venster of een
     aanvraag er juist wel. */
  const ladderNamen = Object.keys(LADDER);
  for (const naam of ladderNamen) {
    ok(`${naam} staat in PAYABLE_SERVICES`, PAYABLE_SERVICES.has(ladderKey(naam)), true);
  }
  ok('en er zijn niet meer betaalbare diensten dan ladders',
    PAYABLE_SERVICES.size, ladderNamen.length, `${[...PAYABLE_SERVICES].join(', ')} vs ${ladderNamen.join(', ')}`);
}

console.log('\nde onderste trede van elke staffel is te bestellen');
{
  /*
   * DE KOPPELING DIE ALLEEN IN EEN NOOT STOND. Een trede die begint boven het
   * plafond van de capaciteitscheck is een prijs die op de site staat en die niemand
   * kan afrekenen — precies de 🔴 van 12 augustus.
   *
   * Deze lus vergelijkt het BEGIN van de laatste trede met ATTENDED_PER_WINDOW. Zet
   * iemand `[35, null, 55]` terug zonder capacity.js aan te raken, dan gaat dit rood
   * met het getal erbij, in plaats van dat het op de homepage terechtkomt.
   */
  ok(`het plafond per venster is ${ATTENDED_PER_WINDOW}`, ATTENDED_PER_WINDOW > 0, true, String(ATTENDED_PER_WINDOW));

  for (const [naam, tredes] of Object.entries(LADDER)) {
    const laatste = tredes[tredes.length - 1];
    const vanaf = laatste[0];
    ok(`${naam}: de onderste trede begint bij ${vanaf} en past in het venster`,
      vanaf <= ATTENDED_PER_WINDOW, true, `${vanaf} > ${ATTENDED_PER_WINDOW}`);
    /* En elke trede, niet alleen de laatste: een trede in het midden die boven het
       plafond begint is even onbestelbaar. */
    for (const [van] of tredes) {
      ok(`${naam}: trede vanaf ${van} is bestelbaar`, van <= ATTENDED_PER_WINDOW, true);
    }
  }

  const extraLaatste = EXTRA_PHOTO_LADDER[EXTRA_PHOTO_LADDER.length - 1];
  ok(`de extra-fotostaffel begint onderaan bij ${extraLaatste[0]}`,
    extraLaatste[0] <= ATTENDED_PER_WINDOW, true);

  /* En de omgekeerde kant: de drempel voor een gereserveerd venster moet ONDER het
     plafond liggen. Zou WINDOW_THRESHOLD boven ATTENDED_PER_WINDOW komen, dan is er
     geen enkel aantal dat zowel een venster verdient als erin past. */
  ok('de vensterdrempel ligt onder het plafond', WINDOW_THRESHOLD < ATTENDED_PER_WINDOW, true,
    `${WINDOW_THRESHOLD} vs ${ATTENDED_PER_WINDOW}`);
}

/* ══ ELK VAKJE DAT HET FORMULIER TEKENT, MOET GEÜPLOAD KUNNEN WORDEN ══════════
 *
 * Gevonden op 13 augustus 2026, en het is dezelfde soort fout als de trede van € 55
 * hierboven: een aanbod op de site waar het systeem niet achter staat.
 *
 * MAX_BATCH_FILES was `producten × 4 shots + 20`, met de +20 als *"slack for the odd
 * extra reference [...] not a second full set"*. Dat was waar op de dag dat het werd
 * geschreven. Diezelfde week kregen de EXTRA FOTO'S hun eigen upload-vakje, geprijsd
 * en begrensd door MAX_EXTRA_PER_PRODUCT -- en daarmee werd die losse slack een
 * geteld vakje. Wat het formulier maximaal kan tekenen werd 30 × (4 + 4) = 240; het
 * plafond bleef 140.
 *
 * Honderd vakjes die de klant kan openen, kan vullen en betaald heeft, waarvan de
 * 141e upload terugkomt met "batch-full" -- een melding die leest als zijn fout. En
 * niet bij een uitzonderlijke bestelling: bij de duurste die er te koop is.
 *
 * Deze sectie legt de twee getallen naast elkaar, zodat de volgende keer dat er een
 * vakje bij komt de test het zegt en niet de klant.
 */
console.log('\nelk vakje dat het formulier tekent, kan ook geüpload worden');
{
  const vakjes = ATTENDED_PER_WINDOW * (SHOTS_PER_PRODUCT + MAX_EXTRA_PER_PRODUCT);
  ok(`het formulier kan ${vakjes} vakjes tekenen`, vakjes > 0, true, String(vakjes));
  ok('en het batchplafond dekt ze allemaal', MAX_BATCH_FILES >= vakjes, true,
    `plafond ${MAX_BATCH_FILES} tegen ${vakjes} vakjes`);

  /* Niet ALLEEN "groot genoeg". Het plafond hoort de vakjes te VOLGEN en niet er
     ruim boven te liggen: een plafond dat los is gekozen, loopt bij de volgende
     wijziging weer achter -- precies wat hier gebeurde. */
  ok('en volgt ze exact, dus niet los gekozen', MAX_BATCH_FILES, vakjes);

  /* En de omgekeerde afhankelijkheid moet weg blijven. maxCards() in pipeline.js
     leidde het aantal productkaarten uit het BESTANDSplafond af, dus verhoogde dit
     getal stil het aantal producten dat te koop was: 240 / 4 gaf zestig kaarten
     tegen een poort die er dertig doorlaat. Het aantal producten is het gegeven. */
  const pl = read('src/scripts/pipeline.js');
  ok('maxCards() leest het aantal producten', /const cap = Math\.floor\(Number\(cfg && cfg\.maxProducts\)\);/.test(pl), true);
  ok('en niet meer het bestandsplafond', /maxBatchFiles\s*\)\s*\/\s*SHOT_IDS\.length/.test(pl), false);

  /* De config moet dat getal ook echt meesturen, anders valt maxCards() stil terug
     op de 30 uit zijn eigen terugval en is de koppeling schijn. */
  const of = read('src/components/order/OrderFlow.astro');
  ok('en OrderFlow stuurt maxProducts mee', /maxProducts: ATTENDED_PER_WINDOW,/.test(of), true);
}

console.log('\nen er staat geen prijs meer op de site die niemand kan bestellen');
{
  /*
   * De bedragen zelf, in de teksten die een klant leest. De trede is uit de code
   * gehaald maar het getal stond ook in de hero, in een meta description en in
   * verhalend commentaar — en juist dat laatste is hoe iemand hem terugzet ("hier
   * stond 55, dat hoort er blijkbaar").
   *
   * Alleen de GERENDERDE tekst wordt getoetst en niet de bron: een commentaar dat de
   * geschiedenis uitlegt mag het oude bedrag noemen, en moet dat zelfs. Vandaar dat
   * dit over dist/ gaat wanneer die er is, en anders stil overslaat -- een test die om
   * een build vraagt die er niet is, is een test die mensen uitzetten.
   *
   * ── EN EEN OUDE BUILD IS ERGER DAN GEEN BUILD — 13 augustus 2026 ────────────
   *
   * Deze twee regels gingen bij Lucas om 02:11 rood, met `€ 55` in dist/index.html
   * en in de meta description. In de bron stond het al lang niet meer: zijn
   * dist/ was van vóór de wijziging van 12 augustus, en deze sectie las die oude
   * pagina alsof het de huidige site was.
   *
   * Dat is de vervelendste vorm die een test kan hebben. Hij zei niet "je hebt
   * niet gebouwd" maar "er staat een prijs op je site die niemand kan bestellen"
   * — een echte, ernstige bewering, over een bestand dat niemand meer publiceert.
   * Een uur zoeken in de bron levert dan niets op, want daar is niets te vinden.
   *
   * Vandaar dat de leeftijd er nu bij hoort. Is dist/index.html ouder dan het
   * jongste bestand in src/, dan is deze sectie niet ROOD maar OVERGESLAGEN, met
   * het commando erbij. Precies dezelfde afweging als bij een ontbrekende build,
   * alleen was "ontbrekend" te smal opgevat: een build die er wel is maar niet
   * meer bij de bron hoort, is even weinig bewijs.
   */
  const distPad = new URL('../dist/index.html', import.meta.url);
  const staat = buildStaat(distPad);

  if (!staat.er || staat.oud) {
    console.log(`      (overgeslagen — ${staat.uitleg})`);
  } else {
    const dist = readFileSync(distPad, 'utf8');
    const bodems = Object.values(LADDER).map((t) => t[t.length - 1][2]);
    ok('de homepage noemt de echte bodem van de hoogste ladder',
      dist.includes(String(Math.max(...bodems))), true, `zoekt ${Math.max(...bodems)}`);
    /* €55 mag nergens meer als prijs staan. Een los "55" kan overal in een pagina
       zitten, dus wordt er gezocht op de vorm waarin een bedrag wordt gezet. */
    ok('en nergens meer € 55 als bedrag', /€\s*55\b/.test(dist), false);
    ok('ook niet in de meta description',
      /content="[^"]*€\s*55/.test(dist), false);
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
