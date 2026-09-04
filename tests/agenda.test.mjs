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
  ATTENDED_IMAGES_PER_DAY,
  ATTENDED_IMAGES_PER_WINDOW,
  ATTENDED_PER_DAY,
  ATTENDED_PER_WINDOW,
  IMAGES_PER_DAY,
  IMAGES_PER_PRODUCT,
  LEAD_DAYS,
  PRODUCTS_PER_DAY,
  QUEUE_DAYS_MAX,
  QUEUE_DAYS_MIN,
  WINDOW_DAYS,
  WINDOW_MAX_SPAN_DAYS,
  addOpenDays,
  clearedWindows,
  bookedFromRows,
  firstOfferableDay,
  isOpenDay,
  queueSpan,
  windowFits,
  windowFor,
} from '../src/data/capacity.js';
import {
  KIND_IMAGES,
  LADDER,
  tierFor,
  SLOT_KINDS,
  UNWEIGHED_KINDS,
  TIERS,
  kindImages,
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
  const vol = { '2026-09-05': ATTENDED_IMAGES_PER_DAY, '2026-09-06': ATTENDED_IMAGES_PER_DAY };

  // Lucas' eigen voorbeeld, letterlijk: kies 4 september, 5 en 6 zijn vol, krijg 4 en 7.
  check('4 september met 5 en 6 vol geeft 4 en 7',
    windowFor('2026-09-04', KIND_IMAGES.catalog, vol), ['2026-09-04', '2026-09-07']);
  check('en op een lege agenda gewoon 4 en 5',
    windowFor('2026-09-04', KIND_IMAGES.catalog, {}), ['2026-09-04', '2026-09-05']);
  check('een dichtgezette dag wordt net zo goed overgeslagen',
    windowFor('2026-09-04', KIND_IMAGES.catalog, {}, new Set(['2026-09-05'])),
    ['2026-09-04', '2026-09-06']);

  check('een venster telt altijd WINDOW_DAYS dagen',
    windowFor('2026-09-04', KIND_IMAGES.catalog, vol).length, WINDOW_DAYS);

  // Een dag die zelf vol zit, kan geen eerste dag zijn — anders zou het paar
  // beginnen op een dag waarop er niets bij kan.
  check('een volle dag is geen begindag',
    windowFor('2026-09-05', KIND_IMAGES.catalog, vol), []);

  /* DE GRENS AAN HET UITREKKEN. Zonder grens kan het paar over weken heen liggen
     en is "je krijgt ze op 4 of op 26 september" geen belofte meer. */
  const langVol = {};
  for (let d = 5; d <= 20; d += 1) langVol[`2026-09-${String(d).padStart(2, '0')}`] = ATTENDED_IMAGES_PER_DAY;
  check(`voorbij ${WINDOW_MAX_SPAN_DAYS} dagen geeft de poort op`,
    windowFor('2026-09-04', KIND_IMAGES.catalog, langVol), []);
  check('en dat is precies waar de grens staat',
    windowFor('2026-09-04', KIND_IMAGES.catalog, langVol, new Set()).length < WINDOW_DAYS, true);
}

/* ══ 4 · DE AGENDA WEEGT IN BEELDEN, EN ELKE DIENST WEEGT MEE ═════════════ */
console.log('\nelke dienst weegt in dezelfde eenheid');
{
  check('een compleet product is een catalogset plus een carrousel',
    KIND_IMAGES.complete, KIND_IMAGES.catalog + KIND_IMAGES.lifestyle);
  check('en dat is IMAGES_PER_PRODUCT', IMAGES_PER_PRODUCT, KIND_IMAGES.complete);
  check('het dagplafond in beelden klopt met dat in producten',
    IMAGES_PER_DAY, PRODUCTS_PER_DAY * IMAGES_PER_PRODUCT);
  check('en het vensterplafond ook',
    ATTENDED_IMAGES_PER_WINDOW, ATTENDED_PER_WINDOW * IMAGES_PER_PRODUCT);
  check('elke soort in SLOT_KINDS heeft een gewicht of uitdrukkelijk null',
    Object.keys(SLOT_KINDS).filter((k) => !(k in KIND_IMAGES)), []);

  /* DE FOUT DIE DIT MOEST OPLOSSEN. Dertig catalogsets zijn 120 beelden en pasten
     in een venster, maar werden geteld als dertig complete producten (210). */
  check('dertig catalogsets passen in één venster',
    kindImages('catalog', 30) <= ATTENDED_IMAGES_PER_WINDOW, true);
  check('en dertig complete producten passen er precies in',
    kindImages('complete', 30), ATTENDED_IMAGES_PER_WINDOW);
  check('eenendertig complete producten niet meer',
    kindImages('complete', 31) > ATTENDED_IMAGES_PER_WINDOW, true);
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
  const gewogen = Object.keys(KIND_IMAGES).filter((k) => KIND_IMAGES[k] !== null).sort();
  check('elke ladderdienst is gewogen',
    Object.keys(LADDER).filter((k) => !gewogen.includes(k)), []);
  check('en elke ladderdienst krijgt dus een echt venster',
    Object.keys(LADDER).map((k) => clearedWindows({ today: MAANDAG, products: 1, service: k }).reason),
    Object.keys(LADDER).map(() => 'ok'));
  check('een clip weegt mee in de agenda', kindImages('video-motion', 2), 10);
  check('maar krijgt nooit een gereserveerd venster',
    tierFor(30, 'video-motion') === 'attended' || tierFor(30, 'video') === 'attended', false);

  /* DE OVERGEBLEVEN NULLEN ZIJN EEN GAT EN GEEN NUL. Komt er een soort bij zonder
     gewicht, dan verandert deze regel en valt de test om met de naam erin. */
  check('twee soorten wachten nog op een gewicht',
    UNWEIGHED_KINDS, ['video-lifestyle', 'hooks']);
  check('een ongewogen soort krijgt geen venster',
    clearedWindows({ today: MAANDAG, products: 2, service: 'video-lifestyle' }).reason, 'unweighed');
  check('en telt niet stilzwijgend als nul', kindImages('hooks', 2), null);
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

  // Een order die de dag vol zet, sluit hem ook echt af voor de volgende.
  const propvol = bookedFromRows([
    { window_start: '2026-09-03', window_end: '2026-09-04', product_count: 30, service: 'drop' },
  ]);
  check('dertig complete producten vullen beide dagen tot het plafond',
    [propvol['2026-09-03'], propvol['2026-09-04']], [ATTENDED_IMAGES_PER_DAY, ATTENDED_IMAGES_PER_DAY]);
  check('en er past niets meer bij', windowFits('2026-09-03', KIND_IMAGES.catalog, propvol), false);
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
