/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE GEDEELDE AGENDA — ZEVEN DAGEN, GEWOGEN IN BEELDEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Op 31 augustus 2026 zei Lucas twee dingen die samen de hele poort raken:
 *
 *   "alle services moeten passen in de capaciteit niet alleen productfoto's.
 *    Dit is een gedeelde agenda voor me."
 *   "ik ben namelijk ook in het weekend gewoon in te plannen."
 *
 * Daar hingen drie stille fouten aan vast. Een catalogmaand werd geteld alsof
 * hij compleet was en kreeg dus te weinig ruimte. Video werd helemaal niet
 * geteld. En de aanloop was één dag korter dan de docstring van LEAD_DAYS zelf
 * beweerde. Dit bestand houdt alle drie tegen, en het benadert de poort van
 * meerdere kanten: de rekenkunde, de figuur, de gebouwde pagina's en de woorden.
 *
 * ── WAAROM DE WOORDEN ERBIJ HOREN ──────────────────────────────────────────
 *
 * Het weekend openzetten is geen instelling maar een belofte. Zolang ergens nog
 * "2–4 werkdagen" staat, zegt de ene helft van de site iets anders over dezelfde
 * agenda dan de andere — en dat is precies het soort verschil waar een klant je
 * op vastpint. §4 leest daarom de GEBOUWDE pagina's en niet de bron, want de
 * fout ontstaat pas bij het samenstellen.
 */

import { readFileSync, globSync } from 'node:fs';
import {
  ATTENDED_PUNTEN_PER_DAG,
  ATTENDED_PUNTEN_PER_VENSTER,
  ATTENDED_PER_DAY,
  ATTENDED_PER_WINDOW,
  PUNTEN_PER_DAG,
  PUNTEN_PER_PRODUCT,
  LEAD_DAYS,
  PRODUCTS_PER_DAY,
  QUEUE_DAYS_MAX,
  QUEUE_DAYS_MIN,
  WINDOW_DAYS,
  WINDOW_MAX_SPAN_DAYS,
  addOpenDays,
  clearedWindows,
  bookedFromRows,
  rowPunten,
  firstOfferableDay,
  isOpenDay,
  queueSpan,
  windowFits,
  windowFor,
} from '../src/data/capacity.js';
import {
  KIND_PUNTEN,
  LADDER,
  tierFor,
  SLOT_KINDS,
  UNWEIGHED_KINDS,
  TIERS,
  puntenVoor,
  agendaKind,
} from '../src/data/pricing.js';
import { buildStaat } from './lib/build.mjs';

let goed = 0;
let totaal = 0;

function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

/* Maandag 31 augustus 2026 — dezelfde vaste dag waarmee het voorstel is
   doorgerekend, zodat een falende regel hier tegen een geschreven getal ligt en
   niet tegen de klok van vandaag. */
const MAANDAG = '2026-08-31';

/* ══ 1 · HET WEEKEND IS EEN GEWONE DAG, EN SLUITEN IS EEN BESLUIT ══════════ */
console.log('\nhet weekend is open tenzij de studio hem dichtzet');
{
  check('zaterdag is open', isOpenDay('2026-09-05'), true);
  check('zondag is open', isOpenDay('2026-09-06'), true);
  check('een dichtgezette dag is dicht', isOpenDay('2026-09-05', new Set(['2026-09-05'])), false);

  // De aanloop loopt nu dóór het weekend heen. Vrijdag plus twee volle dagen is
  // maandag als het weekend dicht is, en zondag als het open is — en dat verschil
  // is precies wat er verandert.
  check('vrijdag + 3 open dagen is maandag', addOpenDays('2026-09-04', 3), '2026-09-07');
  check('en met het weekend dicht is dat woensdag',
    addOpenDays('2026-09-04', 3, new Set(['2026-09-05', '2026-09-06'])), '2026-09-09');
}

/* ══ 2 · DE AANLOOP IS TWEE VOLLE DAGEN ═══════════════════════════════════ */
console.log('\nde eerste twee dagen zijn niet aan te wijzen');
{
  check(`LEAD_DAYS is ${LEAD_DAYS}`, LEAD_DAYS, 2);
  /* De docstring zei "days BETWEEN today and the earliest window" en de code
     rekende addWorkingDays(today, LEAD_DAYS) — de tweede dag ná vandaag, met maar
     één hele dag ertussen. Lucas' regel ("minimum 2 dagen wachten") is de lezing
     van de docstring. Vanaf maandag is dat donderdag. */
  check('vanaf maandag is de eerste aanwijsbare dag donderdag',
    firstOfferableDay(MAANDAG), '2026-09-03');
  check('en er liggen precies LEAD_DAYS hele dagen tussen',
    ['2026-09-01', '2026-09-02'].every((d) => d > MAANDAG && d < firstOfferableDay(MAANDAG)), true);

  /* DE WACHTRIJ MAG EERDER LANDEN DAN DE VROEGSTE AANWIJSBARE DAG, en dat is het
     hele argument voor "zo snel mogelijk". Zou de wachtrij later beginnen, dan is
     die keuze alleen maar vager en nergens sneller. */
  const rij = queueSpan(MAANDAG);
  check('de wachtrij begint vóór de eerste aanwijsbare dag',
    rij.from < firstOfferableDay(MAANDAG), true);
  check('en belooft nooit één dag', rij.committed, false);
  check(`de spanne is ${QUEUE_DAYS_MIN}–${QUEUE_DAYS_MAX} dagen`,
    [rij.from, rij.to], ['2026-09-02', '2026-09-04']);
}

/* ══ 3 · TWEE OPEN DAGEN, DIE OVER VOLLE DAGEN HEEN SPRINGEN ══════════════ */
console.log('\neen venster is twee open dagen achter elkaar in de agenda');
{
  const vol = { '2026-09-05': ATTENDED_PUNTEN_PER_DAG, '2026-09-06': ATTENDED_PUNTEN_PER_DAG };

  // Lucas' eigen voorbeeld, letterlijk: kies 4 september, 5 en 6 zijn vol, krijg 4 en 7.
  check('4 september met 5 en 6 vol geeft 4 en 7',
    windowFor('2026-09-04', KIND_PUNTEN.catalog, vol), ['2026-09-04', '2026-09-07']);
  check('en op een lege agenda gewoon 4 en 5',
    windowFor('2026-09-04', KIND_PUNTEN.catalog, {}), ['2026-09-04', '2026-09-05']);
  check('een dichtgezette dag wordt net zo goed overgeslagen',
    windowFor('2026-09-04', KIND_PUNTEN.catalog, {}, new Set(['2026-09-05'])),
    ['2026-09-04', '2026-09-06']);

  check('een venster telt altijd WINDOW_DAYS dagen',
    windowFor('2026-09-04', KIND_PUNTEN.catalog, vol).length, WINDOW_DAYS);

  // Een dag die zelf vol zit, kan geen eerste dag zijn — anders zou het paar
  // beginnen op een dag waarop er niets bij kan.
  check('een volle dag is geen begindag',
    windowFor('2026-09-05', KIND_PUNTEN.catalog, vol), []);

  /* DE GRENS AAN HET UITREKKEN. Zonder grens kan het paar over weken heen liggen
     en is "je krijgt ze op 4 of op 26 september" geen belofte meer. */
  const langVol = {};
  for (let d = 5; d <= 20; d += 1) langVol[`2026-09-${String(d).padStart(2, '0')}`] = ATTENDED_PUNTEN_PER_DAG;
  check(`voorbij ${WINDOW_MAX_SPAN_DAYS} dagen geeft de poort op`,
    windowFor('2026-09-04', KIND_PUNTEN.catalog, langVol), []);
  check('en dat is precies waar de grens staat',
    windowFor('2026-09-04', KIND_PUNTEN.catalog, langVol, new Set()).length < WINDOW_DAYS, true);
}

/* ══ 4 · DE AGENDA WEEGT IN PUNTEN, EN ELKE DIENST WEEGT MEE ══════════════ */
console.log('\nelke dienst weegt in dezelfde eenheid');
{
  check('een compleet product is een catalogset plus een carrousel',
    KIND_PUNTEN.complete, KIND_PUNTEN.catalog + KIND_PUNTEN.lifestyle);
  check('en dat is PUNTEN_PER_PRODUCT', PUNTEN_PER_PRODUCT, KIND_PUNTEN.complete);
  /* ── EEN ONGELIJKHEID EN GEEN GELIJKHEID — 7 september 2026 ──────────────
     Tot vandaag stond het plafond in PRODUCTEN en volgden de punten daaruit, dus
     vielen de twee exact samen. Nu staat het plafond in PUNTEN (Lucas zette hem
     op 100) en volgt het aantal producten eruit met een afronding naar beneden:
     veertien complete producten is 98 van de 100. Die twee punten die overblijven
     zijn de rest van de deling en geen fout.
     Wat wél een fout zou zijn, is de andere kant op — een productplafond dat méér
     punten opeet dan er zijn. Dan verkoopt de site een venster dat de poort
     daarna weigert, en dat is precies wat deze twee regels bewaken. */
  check('het productplafond past binnen het dagplafond in punten',
    PRODUCTS_PER_DAY * PUNTEN_PER_PRODUCT <= PUNTEN_PER_DAG, true);
  check('en het vensterplafond ook',
    ATTENDED_PER_WINDOW * PUNTEN_PER_PRODUCT <= ATTENDED_PUNTEN_PER_VENSTER, true);
  check('en er blijft minder dan één product over',
    PUNTEN_PER_DAG - PRODUCTS_PER_DAY * PUNTEN_PER_PRODUCT < PUNTEN_PER_PRODUCT, true);
  check('elke soort in SLOT_KINDS heeft een gewicht of uitdrukkelijk null',
    Object.keys(SLOT_KINDS).filter((k) => !(k in KIND_PUNTEN)), []);

  /* DE FOUT DIE DIT MOEST OPLOSSEN. Dertig catalogsets zijn 120 beelden en pasten
     in een venster, maar werden geteld als dertig complete producten (210). */
  check('dertig catalogsets passen in één venster',
    puntenVoor('catalog', 30) <= ATTENDED_PUNTEN_PER_VENSTER, true);
  /* Uit het plafond gerekend en niet ingetypt: het aantal dat er precies in past,
     verandert mee met PUNTEN_PER_DAG, en een test die dat getal overtypt valt bij
     elke plafondwijziging om zonder dat er iets stuk is. */
  const maxCompleet = Math.floor(ATTENDED_PUNTEN_PER_VENSTER / KIND_PUNTEN.complete);
  check('het grootste aantal complete producten past in één venster',
    puntenVoor('complete', maxCompleet) <= ATTENDED_PUNTEN_PER_VENSTER, true);
  check('en één meer niet',
    puntenVoor('complete', maxCompleet + 1) > ATTENDED_PUNTEN_PER_VENSTER, true);
  check('catalog haalt dus een hoger plafond dan complete',
    clearedWindows({ today: MAANDAG, products: 1, service: 'catalog' }).max
    > clearedWindows({ today: MAANDAG, products: 1, service: 'complete' }).max, true);

  /* ── ELKE LADDERDIENST MOET GEWOGEN ZIJN, MAAR NIET ANDERSOM ─────────────
   *
   * Hier stond dat de twee verzamelingen gelijk moesten zijn, en dat klopte
   * zolang alleen fotodiensten een gewicht hadden. Sinds de motion-clip er een
   * heeft (31 augustus 2026, vijf beelden) is de goede regel scheef:
   *
   *   · een LADDERDIENST zonder gewicht is een fout — de site belooft vanaf tien
   *     producten een gereserveerd venster, en de poort zou dat niet kunnen boeken;
   *   · een GEWOGEN dienst die niet op de ladder staat is juist goed — een clip
   *     kost een dag wel degelijk werk en hoort mee te tellen, maar er wordt nooit
   *     een venster voor verkocht.
   *
   * Dat tweede wordt niet hier bewaakt maar door tierFor() in pricing.js, dat al
   * de enige plek is waar staat wie een venster mag krijgen. Een tweede controle
   * in clearedWindows() zou een tweede waarheid maken die ervan af kan wijken. */
  const gewogen = Object.keys(KIND_PUNTEN).filter((k) => KIND_PUNTEN[k] !== null).sort();
  check('elke ladderdienst is gewogen',
    Object.keys(LADDER).filter((k) => !gewogen.includes(k)), []);
  check('en elke ladderdienst krijgt dus een echt venster',
    Object.keys(LADDER).map((k) => clearedWindows({ today: MAANDAG, products: 1, service: k }).reason),
    Object.keys(LADDER).map(() => 'ok'));
  check('een clip weegt mee in de agenda', puntenVoor('video-motion', 2), 2 * KIND_PUNTEN['video-motion']);
  check('maar krijgt nooit een gereserveerd venster',
    tierFor(30, 'video-motion') === 'attended' || tierFor(30, 'video') === 'attended', false);

  /* ── DE LIFESTYLE-CLIP IS GEWOGEN — 7 september 2026 ─────────────────────
     Deze twee regels stonden hier met `video-lifestyle` erin en zijn precies
     zoals bedoeld omgevallen, met de naam erbij, op de dag dat die soort een
     gewicht kreeg. Zie de noot bij KIND_PUNTEN in pricing.js: Lucas noemde
     8 tot 12 clips op een dag, 126 gedeeld door het midden is 12,6, afgerond
     dertien.

     WAT ER NIET VERANDERT: gewogen zijn is niet hetzelfde als een venster
     mogen verkopen. `video-lifestyle` staat niet op de ladder, dus tierFor()
     geeft er nooit 'attended' voor terug — precies zoals bij motion. Die regel
     staat er nu ook voor deze soort bij, want dat is het onderscheid dat bij
     het wegen van een clip het makkelijkst kwijtraakt. */
  check('nog één soort wacht op een gewicht', UNWEIGHED_KINDS, ['hooks']);
  check('een ongewogen soort krijgt geen venster',
    clearedWindows({ today: MAANDAG, products: 2, service: 'hooks' }).reason, 'unweighed');
  check('en telt niet stilzwijgend als nul', puntenVoor('hooks', 2), null);
  check('een lifestyle-clip weegt mee in de agenda', puntenVoor('video-lifestyle', 2), 2 * KIND_PUNTEN['video-lifestyle']);
  check('maar krijgt evenmin een gereserveerd venster',
    tierFor(30, 'video-lifestyle') === 'attended', false);
}

/* ══ 5 · DE BEZETTING WORDT GEWOGEN GELEZEN ═══════════════════════════════ */
console.log('\nde vastgelegde last wordt per soort gewogen');
{
  const rijen = [
    { window_start: '2026-09-03', window_end: '2026-09-04', product_count: 10, service: 'catalog' },
    { window_start: '2026-09-03', window_end: '2026-09-04', product_count: 2, service: 'drop' },
  ];
  const last = bookedFromRows(rijen);
  // 10 catalogsets = 40 beelden over twee dagen = 20/dag; 2 complete = 14 = 7/dag.
  check('tien catalogsets en twee complete wegen samen 27 beelden per dag',
    last['2026-09-03'], 27);
  check('en de tweede dag draagt hetzelfde', last['2026-09-04'], 27);

  /* EEN RIJ ZONDER SOORT TELT ALS COMPLETE — het zwaarste gewicht, en precies wat
     de poort vóór 31 augustus 2026 voor élke order aannam. Oude rijen krijgen
     daarmee geen ruimte met terugwerkende kracht. */
  check('een rij zonder soort telt als compleet',
    bookedFromRows([{ window_start: '2026-09-03', window_end: '2026-09-04', product_count: 2 }])['2026-09-03'],
    7);

  /* Een order die de dag vol zet, sluit hem ook echt af voor de volgende. Het
     aantal komt uit het plafond en staat niet ingetypt: hoeveel complete
     producten een dag vullen, verandert mee met PUNTEN_PER_DAG. */
  const vulProducten = Math.ceil(ATTENDED_PUNTEN_PER_VENSTER / KIND_PUNTEN.complete);
  const propvol = bookedFromRows([
    { window_start: '2026-09-03', window_end: '2026-09-04', product_count: vulProducten, service: 'drop' },
  ]);
  check('een order die het venster vult, zet beide dagen op het plafond',
    [propvol['2026-09-03'] >= ATTENDED_PUNTEN_PER_DAG, propvol['2026-09-04'] >= ATTENDED_PUNTEN_PER_DAG],
    [true, true]);
  check('en er past niets meer bij', windowFits('2026-09-03', KIND_PUNTEN.catalog, propvol), false);
}

/* ══ 5b · VIDEOWERK TELT MEE ══════════════════════════════════════════════ */
console.log('\nvideowerk weegt in de agenda, per stijl en in clips');
{
  /* Tot 7 september 2026 woog bookedFromRows() op `orders.service`, en dat is
     voor élke videobestelling het woord 'video'. Dat woord staat niet in
     KIND_PUNTEN, dus gaf puntenVoor() null en werd de rij overgeslagen: geen
     bezetting, en in het beheerscherm ook geen venster dat met de hand te zetten
     was. Deze blok bewaakt de drie stukken van die reparatie. */
  check('een Motion-clip weegt als video-motion', agendaKind('video', 'motion'), 'video-motion');
  check('een lifestyle-clip als video-lifestyle', agendaKind('video', 'lifestyle'), 'video-lifestyle');
  /* CAMPAGNE EN CUSTOM HEBBEN GEEN GEWICHT, en dat is geen omissie. Lucas heeft
     "hoeveel maak je er op een dag af" beantwoord voor Motion en voor de
     lifestyle-clip, en voor die twee alleen. Ze een getal geven omdat ze ook
     video heten, is precies het verzinnen dat de noot boven KIND_PUNTEN verbiedt. */
  check('een campagnevideo blijft ongewogen', agendaKind('video', 'campaign'), null);
  check('en een custom video ook', agendaKind('video', 'custom'), null);
  check('een videorij zonder stijl valt nergens op terug', agendaKind('video', ''), null);
  check('een foto-dienst gaat ongewijzigd door', agendaKind('catalog'), 'catalog');
  check('en de wire-waarde drop blijft compleet', agendaKind('drop'), 'complete');

  /* HET AANTAL KOMT UIT clip_count EN NIET UIT product_count. Zie de noot bij
     het clips-veld in functions/api/order.js: clips in product_count schrijven
     heeft eerder tierFor() een venster laten beloven en het portaal "12
     producten" laten zetten bij een aanvraag zonder één product erin. */
  check('zes Motion-clips wegen dertig beelden',
    rowPunten({ service: 'video', style: 'motion', clip_count: 6 }), 6 * KIND_PUNTEN['video-motion']);
  check('drie lifestyle-clips wegen negenendertig',
    rowPunten({ service: 'video', style: 'lifestyle', clip_count: 3 }), 3 * KIND_PUNTEN['video-lifestyle']);
  /* Nul en niet zestig: twaalf in product_count is voor een videorij geen aantal
     clips maar een veld dat over iets anders gaat, en nul beelden laat
     bookedFromRows() de rij overslaan. Zou dit 60 teruggeven, dan bezette een
     videobestelling dagen op grond van een teller die niemand heeft ingevuld. */
  check('een videorij leest product_count niet',
    rowPunten({ service: 'video', style: 'motion', product_count: 12 }), 0);
  check('een ongewogen videostijl bezet niets',
    rowPunten({ service: 'video', style: 'campaign', clip_count: 4 }), null);
  check('een fotorij weegt nog steeds op product_count',
    rowPunten({ service: 'catalog', product_count: 10 }), 10 * KIND_PUNTEN.catalog);
  check('en een rij zonder soort telt nog steeds als compleet',
    rowPunten({ product_count: 2 }), 2 * KIND_PUNTEN.complete);

  const last = bookedFromRows([
    { window_start: '2026-09-03', window_end: '2026-09-04', service: 'video', style: 'motion', clip_count: 6 },
  ]);
  const perDagVideo = Math.ceil((6 * KIND_PUNTEN['video-motion']) / 2);
  check('en een videobestelling met een venster bezet allebei zijn dagen',
    [last['2026-09-03'], last['2026-09-04']], [perDagVideo, perDagVideo]);

  /* WAT ER NIET VERANDERT: meewegen is niet hetzelfde als zelf een venster
     mogen pakken. Video staat niet op de ladder, dus tierFor() geeft er nooit
     'attended' voor terug en de bestelstroom legt geen dagen vast. Lucas zet ze
     met de hand in /admin/planning — en dát kan nu, want daar werd dezelfde
     weging gebruikt die de rij oversloeg. */
  check('video pakt nog steeds niet zelf een venster', tierFor(30, 'video'), 'unattended');
}

/* ══ 6 · DE WOORDEN OP DE GEBOUWDE SITE ═══════════════════════════════════ */
console.log('\nde site zegt "dagen" waar de agenda dagen bedoelt');
{
  const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
  if (!staat.er || staat.oud) {
    console.log(` --   overgeslagen: ${staat.uitleg}`);
  } else {
    check('de doorlooptijd noemt geen werkdagen meer (nl)',
      /werkdag/.test(TIERS.unattended.turnaround.nl), false);
    check('en niet in het Engels',
      /working day/.test(TIERS.unattended.turnaround.en), false);
    /* SINDS 3 SEPTEMBER 2026 NOEMT DE TEKST GEEN SPANNE MEER. Lucas: onder de
       tien producten is het "zo snel mogelijk, nooit beloofd". QUEUE_DAYS_MIN/MAX
       zijn alleen nog de vorm van de wachtrij voor de poort; de klanttekst mag
       ze niet meer herhalen. tests/promises.test.mjs bewaakt de rest. */
    check('en noemt de spanne uit capacity.js niet meer als belofte',
      TIERS.unattended.turnaround.nl.includes(`${QUEUE_DAYS_MIN}–${QUEUE_DAYS_MAX}`), false);

    /* DE UITZONDERINGEN ZIJN BENOEMD EN NIET VERGETEN. Op deze plekken betekent
       "werkdag" iets anders dan een studiodag: een wettelijke termijn, de
       doorlooptijd van een bank, of wanneer er een mens op WhatsApp zit. Die
       mogen blijven staan — maar alleen deze, en de lijst hoort hier zodat de
       volgende die het woord terugzet, moet uitleggen waarom. */
    const TOEGESTAAN = [
      /data-processing-agreement/,   // een wettelijke termijn, geen studiodag
      /thank-you/,                   // de doorlooptijd van een terugbetaling
      /faq/, /compare/, /test-sample/, // wanneer er iemand op WhatsApp zit
    ];
    const paginas = globSync('dist/**/*.html').map((p) => p.replace(/\\/g, '/'));
    check('er zijn genoeg pagina’s doorzocht', paginas.length > 50, true);

    const overtreders = paginas.filter((p) => {
      const tekst = readFileSync(p, 'utf8');
      if (!/werkdag|working day/i.test(tekst)) return false;
      return !TOEGESTAAN.some((re) => re.test(p));
    });
    check('geen enkele pagina belooft nog werkdagen buiten de uitzonderingen',
      overtreders, []);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
