/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE PROEFVISUAL VAN €1 — EEN BEDRAG DAT AAN EEN BOEKHOUDING HANGT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tot 12 augustus 2026 was de proefvisual het enige betaalde product op deze site
 * zonder factuur. Dat was geen nalatigheid maar een uitgestelde beslissing, en de
 * noot in de Mollie-webhook zei dat ook: `quoteTestSample()` stond in de repo met
 * NUL AANROEPERS, gaf `vatCents: 0`, en noemde het bedrag in een commentaar
 * "treated as VAT-inclusive" zonder dat er ergens iets inclusief werd behandeld.
 * `orders.total_cents` bleef daarom NULL, en een factuur op die rij zou hebben
 * gezegd "Subtotaal € 0,00 · btw € 0,00 · Betaald € 0,00" terwijl er €1 was
 * afgeschreven — met een nummer uit een reeks die geen gaten mag hebben.
 *
 * De keuze is nu: **€1 is een brutobedrag, inclusief btw.** Dit bestand houdt de
 * drie dingen vast die daaraan hangen, en ze zitten op drie verschillende plekken
 * in de code — wat precies de reden is dat ze samen in één test staan.
 *
 *   1 · DE RICHTING VAN DE BEREKENING. De btw wordt uit het bedrag gehaald en niet
 *       erop gezet. Zou iemand dat omdraaien, dan schrijft Mollie €1,21 af voor een
 *       product dat op elke pagina €1 kost.
 *
 *   2 · DE BTW ALS VERSCHIL, NIET ALS PRODUCT. Bij 21% is netto 82,6446… cent. Rond
 *       je dat af op 83 en neem je dan `round(83 × 0,21) = 17`, dan telt het
 *       toevallig op tot 100. Bij een ander tarief of een ander bedrag hoeft dat
 *       niet. Neem je de btw als bruto − netto, dan telt het altíjd op. Dezelfde
 *       fout van één cent kostte eerder deze week een uur bij de creditnota's
 *       (€123,45 werd €123,44) en de oplossing is daar dezelfde.
 *
 *   3 · DE ONDERGRENS. Bestellingen van vóór vandaag hebben `total_cents` NULL.
 *       Zonder een expliciete controle maken de twee wegen naar issueInvoice() —
 *       de webhook en de inhaalslag in VISUAILS Studio — daar alsnog een factuur
 *       van nul euro van, en die is niet terug te draaien.
 *
 * ── EN ÉÉN DING DAT GEEN GELD IS MAAR WEL VERKEERD LEEST ────────────────────
 *
 * De strook op /admin telt "onbetaald" op `total_cents > 0`. Dat sloot de
 * proefvisual uit zolang die kolom NULL bleef — de uitsluiting stond in het
 * COMMENTAAR ("the test sample and anything with no total priced against it are not
 * debts, they are rows") en niet in de query. Nu er wél een bedrag staat, zou elke
 * afgebroken proefvisual-checkout in die teller belanden: de rij wordt geschreven
 * vóór de doorverwijzing naar Mollie, dus iedere bezoeker die daar wegklikt laat er
 * een achter. De uitsluiting staat nu in de query, op beide plekken, en de laatste
 * sectie hier houdt vast dat die twee plekken hetzelfde zeggen — want een chip die
 * zeven zegt boven een lijst van drie is erger dan beide keuzes.
 */
import { readFileSync } from 'node:fs';
import { quoteTestSample, VAT_RATE } from '../src/lib/quote.js';
import { catchupOrder } from '../src/lib/account.js';
import { AMOUNT } from '../src/data/pricing.js';
import { vatDecision } from '../src/data/vat.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

console.log('\nVISUAILS — de factuur van de proefvisual\n');

console.log('het brutobedrag is €1 en verschuift bij geen enkel tarief');
{
  /* AMOUNT.testSample is de bron van het bedrag; het staat hier niet ingetypt, want
     dan zou deze test blijven slagen nadat de prijs is veranderd. */
  const bruto = Math.round(AMOUNT.testSample * 100);
  ok('de constante staat op één euro', bruto, 100);

  for (const tarief of [0.21, 0, 0.19, 0.27, 0.055]) {
    const q = quoteTestSample({ vatRate: tarief });
    ok(`tarief ${tarief}: bruto blijft het afgeschreven bedrag`, q.grossCents, bruto);
    ok(`tarief ${tarief}: netto plus btw is het bruto`, q.netCents + q.vatCents, q.grossCents);
    ok(`tarief ${tarief}: netto is bruto gedeeld door 1+tarief`,
      q.netCents, Math.round(bruto / (1 + tarief)));
    ok(`tarief ${tarief}: de btw is nooit negatief`, q.vatCents >= 0, true);
  }

  /*
   * ── DE BTW ALS VERSCHIL, EN WAAROM DIT EEN SWEEP MOET ZIJN ─────────────────
   *
   * Hier stond eerst een regel per tarief met het commentaar "deze zou omvallen met
   * netto × tarief". Dat was NIET WAAR, en dat bleek pas toen ik de mutatie echt
   * uitvoerde: bij 21%, 19%, 27%, 5,5% en 0% geven `round(netto × tarief)` en
   * `bruto − netto` bij een bedrag van één euro exact hetzelfde antwoord. Vijf
   * groene regels die niets bewaakten, met een commentaar dat het tegendeel beweerde
   * — dat is erger dan geen test, want het leest als dekking.
   *
   * Ze lopen wél uiteen, maar niet op de tarieven die je toevallig opschrijft: bij
   * een brutobedrag van 100 cent doen 3068 van de 10.001 tarieven tussen 0% en 100%
   * het anders. Vandaar dat dit een uitputtende sweep is en geen steekproef —
   * dezelfde aanpak als bij de creditnota's, waar de fout van één cent ook pas
   * zichtbaar werd toen alle mogelijke bedragen langskwamen.
   *
   * Wat de sweep vasthoudt is de EIGENSCHAP en niet de formule: netto plus btw is
   * altijd precies wat er is afgeschreven. Dat is de enige belofte die de
   * boekhouding nodig heeft, en er is maar één manier om hem te houden.
   */
  {
    const scheef = [];
    const zouBreken = [];
    for (let i = 0; i <= 10000; i++) {
      const tarief = i / 10000;
      const q = quoteTestSample({ vatRate: tarief });
      if (q.netCents + q.vatCents !== bruto) scheef.push(tarief);
      if (q.grossCents !== bruto) scheef.push(`bruto@${tarief}`);
      if (q.netCents < 0 || q.vatCents < 0) scheef.push(`negatief@${tarief}`);
      // Hoeveel tarieven zouden onder de PRODUCTformule scheef gaan? Dit getal is het
      // bewijs dat de sweep de mutatie ook echt pakt, en niet alleen dekt.
      if (Math.round(q.netCents * tarief) !== bruto - q.netCents) zouBreken.push(tarief);
    }
    ok('over 10.001 tarieven telt netto + btw altijd op tot het afgeschreven bedrag',
      scheef.length, 0, scheef.slice(0, 5).join(', '));
    ok('en de productformule zou op duizenden tarieven scheef gaan',
      zouBreken.length > 1000, true, `${zouBreken.length} tarieven`);
  }

  /* Het Nederlandse geval uitgeschreven, omdat dit het bedrag is dat op de factuur
     komt te staan en iemand het moet kunnen herkennen zonder te rekenen. */
  const nl = quoteTestSample({ vatRate: 0.21 });
  ok('nederlands: netto 83 cent', nl.netCents, 83);
  ok('nederlands: btw 17 cent', nl.vatCents, 17);
  ok('nederlands: totaal 100 cent', nl.grossCents, 100);

  /* Verlegging en buiten de heffing: de klant betaalt hetzelfde, de verdeling niet. */
  const rc = quoteTestSample({ vatRate: 0 });
  ok('verlegd: netto is het hele bedrag', rc.netCents, 100);
  ok('verlegd: geen btw', rc.vatCents, 0);
  ok('verlegd: de klant betaalt nog steeds één euro', rc.grossCents, 100);

  /* Rommel valt terug op het Nederlandse tarief. Een NaN die hier langs komt zou
     grossCents NaN maken en centsToMollieValue() ergens veel verder laten omvallen. */
  for (const rommel of [NaN, undefined, null, -0.21, 2, '0.21', Infinity]) {
    const q = quoteTestSample({ vatRate: rommel });
    ok(`rommel ${JSON.stringify(rommel)} valt terug op ${VAT_RATE}`, q.vatRate, VAT_RATE);
    ok(`rommel ${JSON.stringify(rommel)} levert nog steeds een geldig bedrag`,
      q.netCents + q.vatCents, 100);
  }
  ok('geen argument doet hetzelfde', quoteTestSample().vatRate, VAT_RATE);
}

console.log('\nhet tarief komt uit dezelfde beslissing als bij elke andere bestelling');
{
  /* Niet apart geregeld: de btw-behandeling van een klant hangt niet af van hoe
     groot zijn bestelling is. Deze sectie toetst dat de combinatie klopt, want dat
     is waar order.js op vertrouwt. */
  const gevallen = [
    ['NL, geen nummer', { country: 'NL', vatValid: false }, 83, 17],
    ['NL, mét nummer (geen binnenlandse verlegging)', { country: 'NL', vatValid: true }, 83, 17],
    ['DE, bij VIES bevestigd', { country: 'DE', vatValid: true }, 100, 0],
    ['DE, niet bevestigd', { country: 'DE', vatValid: false }, 83, 17],
    ['US, buiten de heffing', { country: 'US', vatValid: false }, 100, 0],
    ['geen land opgegeven', { country: '', vatValid: false }, 83, 17],
  ];
  for (const [naam, invoer, netto, btw] of gevallen) {
    const q = quoteTestSample({ vatRate: vatDecision(invoer).rate });
    ok(`${naam}: netto ${netto}`, q.netCents, netto);
    ok(`${naam}: btw ${btw}`, q.vatCents, btw);
    ok(`${naam}: totaal één euro`, q.grossCents, 100);
  }
}

console.log('\nde bestelling krijgt het bedrag mee, en de webhook slaat niets meer over');
{
  /*
   * BRONCHECKS, en dat is hier de juiste omvang. order.js en de webhook zijn
   * Cloudflare-functies met een D1-binding en een Mollie-sleutel; ze uitvoeren in een
   * test zou een halve Worker nabouwen. Wat hier stukgaat is niet de rekenkunde maar
   * de BEDRADING — dat iemand de aanroep weghaalt of de uitzondering terugzet — en
   * dat is precies wat een broncheck wel kan zien.
   */
  const ORDER = read('functions/api/order.js');
  ok('order.js importeert quoteTestSample', /quoteTestSample/.test(ORDER), true);
  ok('en gebruikt het voor de proefvisual',
    /svc === 'test-sample'\s*\?\s*quoteTestSample\(\{ vatRate: vatCall\.rate \}\)/.test(ORDER), true);
  /* Met HET TARIEF UIT vatCall en niet met een eigen constante — anders is de
     btw-behandeling van de proefvisual een tweede waarheid. */
  ok('met het tarief uit de btw-beslissing', /quoteTestSample\(\{ vatRate: vatCall\.rate \}\)/.test(ORDER), true);

  const HOOK = read('functions/api/webhook/mollie.js');
  /*
   * ZONDER COMMENTAAR, want de noot in de webhook legt uit wat er WEG is en noemt
   * daarbij de oude voorwaarde letterlijk. Zoeken in de hele bron zou die noot vinden
   * en melden dat de uitzondering er nog staat — de zevende keer in dit project dat
   * een test zijn eigen uitleg leest. De eerste versie van deze regel ontweek dat met
   * een heel precieze regex op de oude vórm, en die bleek bij de mutatietest niet om
   * te vallen: precies zijn is niet hetzelfde als het juiste meten.
   */
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  /*
   * ── ALLEEN HET FACTUURDEEL, EN DAAROP BEN IK GESTRUIKELD ───────────────────
   *
   * De eerste versie hiervan verbood `order.service === 'test-sample'` in de HELE
   * webhook. Dat is te breed en het ging terecht rood: er staat verderop een
   * volkomen legitieme tak op diezelfde voorwaarde, namelijk de betalershash die
   * een tweede proefvisual op een nieuw e-mailadres herkent. Die moet blijven.
   *
   * Wat verboden is, is dat de FACTUURSTAP wordt overgeslagen op de dienst. Dus
   * wordt de bron afgekapt vanaf de kop "DE FACTUUR" — dat is een commentaarregel,
   * dus dat knippen gebeurt vóór het strippen — en pas dat stuk wordt getoetst.
   * Een test die te veel verbiedt kost net zo veel tijd als een test die te weinig
   * ziet: de eerste is een valse rode regel die je moet uitzoeken.
   */
  const kop = HOOK.indexOf('── DE FACTUUR');
  ok('de kop van het factuurdeel is te vinden', kop > 0, true, String(kop));
  const FACTUURCODE = code(HOOK.slice(kop));
  ok('de commentaarstripper doet iets', FACTUURCODE.length < HOOK.slice(kop).length * 0.7, true,
    `${FACTUURCODE.length} van ${HOOK.slice(kop).length}`);
  ok('de factuurstap wordt niet meer op de dienst overgeslagen',
    /test-sample/.test(FACTUURCODE), false);
  ok('en heeft in plaats daarvan een ondergrens op het bedrag',
    /if \(!\(Number\(order\.total_cents\) > 0\)\)/.test(FACTUURCODE), true);
  ok('de factuur wordt daarna wel uitgegeven', /await issueInvoice\(env, order\.id\)/.test(FACTUURCODE), true);
  /* En de betalerscontrole staat er nog wel — die tak mag door dit alles niet
     sneuvelen, want hij is de enige die een tweede gratis proef tegenhoudt. */
  ok('de betalerscontrole op de proefvisual staat er nog',
    /order\.service === 'test-sample'/.test(code(HOOK.slice(0, kop))), true);
}

console.log('\ngeen factuur van nul euro, langs geen van de twee wegen');
{
  /*
   * catchupOrder() is de tweede weg naar issueInvoice(): VISUAILS Studio geeft alsnog
   * een factuur uit voor elke betaalde bestelling die er nog geen heeft. Die weg moet
   * zelfstandig kloppen — de webhook kan gemist zijn, en dan is dit de enige controle
   * die er nog tussen zit.
   */
  const leeg = new Set();
  const rij = (over) => ({
    ref: 'VIS-2608-0001', payment_status: 'paid', paid_at: '2026-08-12 10:00', id: 1,
    total_cents: 83, ...over,
  });

  ok('een betaalde proefvisual mét bedrag komt in de inhaalslag',
    catchupOrder([rij()], leeg).length, 1);
  ok('een oude proefvisual met total_cents NULL niet',
    catchupOrder([rij({ total_cents: null })], leeg).length, 0);
  ok('en een bedrag van nul ook niet',
    catchupOrder([rij({ total_cents: 0 })], leeg).length, 0);
  /* Een bedrag als tekst uit D1 is geen reden om over te slaan — Number() doet hier
     het werk, en deze regel bestaat omdat `'83' > 0` in JavaScript waar is maar
     `'83' > 0` na een typefout in de vergelijking niet meer. */
  ok('een bedrag dat als tekst aankomt telt gewoon mee',
    catchupOrder([rij({ total_cents: '83' })], leeg).length, 1);
  ok('onbetaald blijft buiten de inhaalslag',
    catchupOrder([rij({ payment_status: 'unpaid' })], leeg).length, 0);
  ok('zonder betaaldatum ook',
    catchupOrder([rij({ paid_at: null })], leeg).length, 0);
  ok('en wie al een factuur heeft niet nog een keer',
    catchupOrder([rij()], new Set(['VIS-2608-0001'])).length, 0);
}

console.log('\nde afgebroken proefvisual is geen openstaande vordering');
{
  /*
   * DE CHIP EN DE LIJST MOETEN HETZELFDE ZEGGEN. Dat is de echte assertie hier: de
   * uitsluiting staat op twee plekken in admin.js — de teller in de strook en het
   * filter achter de link — en die kunnen uit elkaar lopen zonder dat iets omvalt.
   * Een chip die zeven zegt boven een lijst van drie is erger dan beide keuzes,
   * want dan vertrouw je geen van de twee meer.
   */
  /*
   * DE BRON WORDT EERST GENORMALISEERD, en dat is geen luxe. De teller in de strook
   * staat over twee tekststukken met een `+` ertussen omdat de regel anders te lang
   * werd; het filter staat in één stuk. De eerste versie van deze check zocht met een
   * tekenklasse die op het aanhalingsteken stopte, en meldde daardoor dat de strook
   * de uitsluiting niet had terwijl hij er twee regels verder wél stond. Dat is
   * dezelfde soort fout als een test die zijn eigen commentaar leest: niet de code
   * was mis, de meting was mis.
   *
   * Aanhalingstekens en de plus eruit, witruimte plat, en dan pas zoeken. Wat overblijft
   * is de SQL zoals D1 hem ziet.
   */
  const ADMIN = read('src/lib/admin.js');
  const plat = ADMIN.replace(/['"`]/g, '').replace(/\s*\+\s*/g, '').replace(/\s+/g, ' ');

  const ONBETAALD = 'payment_status = unpaid AND total_cents > 0';
  const UITSLUITING = 'service != test-sample';
  const na = (bron, naald, lengte = 60) => {
    const uit = [];
    let i = bron.indexOf(naald);
    while (i !== -1) {
      uit.push(bron.slice(i, i + naald.length + lengte));
      i = bron.indexOf(naald, i + 1);
    }
    return uit;
  };

  const tellers = na(plat, ONBETAALD);
  ok('er zijn precies twee plekken die onbetaald definiëren', tellers.length, 2, tellers.join(' || '));
  for (const [i, t] of tellers.entries()) {
    ok(`plek ${i + 1} sluit de proefvisual uit`, t.includes(UITSLUITING), true, t);
  }

  /* En de tegenhanger: geleverd-en-niet-betaald sluit hem NIET uit. Dat is met opzet
     — een proefvisual die geleverd is zonder betaling is geen euro die je gaat
     ophalen maar een gat in het proces, en dat wil je één keer zien. */
  const verlies = na(plat, 'status = delivered AND payment_status != paid AND total_cents > 0');
  ok('en geleverd-onbetaald staat er twee keer', verlies.length, 2, verlies.join(' || '));
  for (const [i, t] of verlies.entries()) {
    ok(`plek ${i + 1} sluit de proefvisual juist niet uit`, t.includes(UITSLUITING), false, t);
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
