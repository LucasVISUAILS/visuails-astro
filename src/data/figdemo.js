// VISUAILS — de verzonnen bestelling en de verzonnen agenda, op één plek.
//
// ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
//
// Er staan nu vier mock-ups op de site die over dezelfde bestelling gaan:
// FigDash (VISUAILS Studio), FigGallery
// (/portal) en sinds vandaag FigGate en FigBoard (/studio). Elk daarvan had zijn
// eigen kopie van "VIS-2608-4471 · VOLT · 30 producten · 10 – 14 aug".
//
// Dat is precies de constructie die deze repo elders al één keer stil heeft laten
// verschuiven (zie de kop van tests/nav.test.mjs over de drie parallelle lijsten
// in het menu). Vier kopieën van hetzelfde feit blijven alleen gelijk zolang
// niemand er één aanraakt, en de dag dat iemand het aantal producten in één
// figuur verandert, vertelt de site twee verhalen over dezelfde bestelling.
//
// ── EN ER STOND ÉÉN VERHAAL DAT NIET KLOPTE ────────────────────────────────
//
// FigStudio — verwijderd op 18 augustus 2026 — tekende de agenda als
// "96 van 100 producten" per WEEK. De poort in
// src/data/capacity.js telt niet zo:
//
//   · PRODUCTS_PER_DAY = 18 — de doorvoer van één studiodag.
//   · QUEUE_FLOOR_PER_DAY = 3 — daarvan gereserveerd voor kleine bestellingen,
//     zodat "2 tot 4 dagen" waar blijft terwijl de agenda volloopt.
//   · ATTENDED_PER_DAY = 15 — wat er als vastgelegd venster verkocht mag worden.
//   · WINDOW_DAYS = 2 — een venster is twee open dagen, die niet naast elkaar
//     hoeven te liggen: volle en dichtgezette dagen worden overgeslagen.
//
// Weken van honderd bestaan dus nergens in de code. Dat is geen detail: /studio
// is de pagina die belooft dat de datum een mechanisme heeft, en dan is een
// getekend mechanisme dat het echte niet is, het tegendeel van bewijs.
//
// ── DE FIGUREN REKENEN MET DE ECHTE POORT ──────────────────────────────────
//
// `demoWindow()` hieronder roept `offerableWindows()` aan — dezelfde functie die
// /start gebruikt om een klant een datum te geven. Het venster dat de figuur
// "aangeboden" noemt, is daarmee niet ingetypt maar uitgerekend, en
// tests/figures.test.mjs valt om zodra die twee uit elkaar lopen.
//
// GEEN ECHTE GEGEVENS. Verzonnen merken, een verzonnen referentie, en nergens een
// adres — zie de langere noot daarover in FigDash.astro. Een adres dat echt kan
// zijn, wordt gelezen als echt.

import {
  ATTENDED_PER_DAY,
  ATTENDED_IMAGES_PER_DAY,
  IMAGES_PER_PRODUCT,
  firstOfferableDay,
  isOpenDay,
  offerableWindows,
  windowFor,
} from './capacity.js';

/**
 * De dag die de figuren als "vandaag" behandelen.
 *
 * EEN VASTE DATUM EN NIET `new Date()`, en dat is dezelfde regel die capacity.js
 * zelf aanhoudt: een figuur die met de echte klok rekent, tekent in november een
 * agenda vol dagen die al voorbij zijn, en er is niemand die dat merkt tot een
 * bezoeker het ziet. Augustus 2026 omdat de andere mock-ups daar al in staan.
 *
 * 3 augustus 2026 is een maandag, zodat het beeld op een maandag begint. Dat is
 * geen opmaak: de aanloop van twee volle dagen is alleen te zien als de week
 * vooraan begint.
 */
export const DEMO_TODAY = '2026-08-03';

/** De bestelling die in alle vijf de figuren dezelfde is. */
export const DEMO_ORDER = { ref: 'VIS-2608-4471', brand: 'VOLT', products: 30 };

/**
 * Een tweede, kleinere bestelling — alleen als vergelijking in FigGate.
 *
 * Dit is het hele punt van "geteld in producten, niet in bestellingen", en het is
 * met geen enkele zin zo goed te maken als met twee antwoorden uit dezelfde
 * agenda op dezelfde dag: 30 producten krijgt 10 – 11 augustus, 12 producten
 * krijgt 6 – 7 augustus. Zelfde poort, zelfde moment, andere uitkomst.
 */
export const DEMO_SMALL_PRODUCTS = 12;

/**
 * Wat er in de verzonnen agenda al staat: bezette BEELDEN per dag.
 *
 * De eenheid is het beeld sinds de agenda gedeeld is — zie de noot bij
 * IMAGES_PER_DAY in capacity.js. De getallen staan hier als "producten maal
 * IMAGES_PER_PRODUCT" en niet uitgerekend, zodat de bedoeling leesbaar blijft:
 * elf complete producten op maandag, en niet zevenenzeventig losse beelden.
 *
 * Deze cijfers zijn met opzet zo gekozen dat de poort er iets INTERESSANTS mee
 * doet, en niet zo dat alles kan:
 *
 *   · woensdag 12 augustus staat op 15 van 15 producten — vol, en wordt als vol
 *     getoond. Dat was 5 augustus, maar sinds de aanloop drie dagen beslaat in
 *     plaats van twee (zie LEAD_DAYS) valt de 5e binnen de brieftijd, en dan
 *     toont de figuur "te vroeg" en niet "vol". Een figuur die zijn eigen
 *     interessantste toestand kwijtraakt, laat dat niet zien — de test wel.
 *   · donderdag 6 en vrijdag 7 hebben ruimte, maar niet genoeg voor dertig:
 *     die vraagt vijftien op ELKE dag van het venster, dus twee dagen die
 *     helemaal vrij zijn. Dat is de pessimistische lezing die windowFits()
 *     aanhoudt, en het is de reden dat een grote bestelling verder vooruit valt
 *     dan een kleine terwijl de agenda "toch ruimte heeft".
 *
 * De dagen binnen de lead-tijd staan er ook in. Ze zijn niet aanbiedbaar, maar ze
 * hebben wel werk — een agenda waarin vandaag leeg is, is geen agenda.
 */
export const DEMO_BOOKED = {
  '2026-08-03': 11 * IMAGES_PER_PRODUCT,
  '2026-08-04': 14 * IMAGES_PER_PRODUCT,
  '2026-08-05': 15 * IMAGES_PER_PRODUCT,
  '2026-08-06': 8 * IMAGES_PER_PRODUCT,
  '2026-08-07': 2 * IMAGES_PER_PRODUCT,
  '2026-08-08': 0,
  '2026-08-09': 0,
  '2026-08-10': 0,
  '2026-08-11': 0,
  '2026-08-12': 15 * IMAGES_PER_PRODUCT,
  '2026-08-13': 0,
  '2026-08-14': 0,
};

/* ── HET WEEKEND IS EEN KEUZE GEWORDEN — 31 augustus 2026 ───────────────────
 *
 * Zaterdag 8 en zondag 9 augustus stonden hier niet in: de figuur toonde tien
 * WERKdagen en capacity.js sloeg het weekend zelf over. Sinds isOpenDay() alleen
 * nog naar dichtgezette dagen kijkt, is dat geen regel meer maar een besluit, en
 * een figuur die het besluit verzwijgt laat de bezoeker een regel zien die niet
 * bestaat. De twee dagen staan er nu in, dichtgezet, en de poort krijgt diezelfde
 * verzameling mee — anders biedt de poort een dag aan die de tabel als gesloten
 * tekent, en dat is precies het soort verschil waar deze figuur tegen bedoeld is.
 */
export const DEMO_BLACKOUTS = new Set(['2026-08-08', '2026-08-09']);

/** De twaalf dagen die de figuur toont: maandag 3 t/m vrijdag 14 augustus. */
export const DEMO_DAYS = Object.keys(DEMO_BOOKED);

/**
 * De andere bestellingen in de tabel — en dat is niet decor.
 *
 * DEZE DRIE ZIJN WAT DE BEZETTING HIERBOVEN VEROORZAAKT. Bij het schrijven van de
 * test bleek dat ik dat eerst niet had volgehouden: Nord Label stond op 6 – 7
 * augustus met twaalf producten, terwijl de poort 6 – 7 augustus juist als VRIJ
 * aanbood aan een bestelling van twaalf. Twee dingen die niet samen waar kunnen
 * zijn, in twee figuren op dezelfde pagina — precies de fout die deze fixture moet
 * uitsluiten.
 *
 * De regel die het nu vasthoudt, en die tests/figures.test.mjs naleest: staat een
 * bestelling in een venster, dan moet elke dag van dat venster minstens haar
 * aandeel al gebóekt hebben staan in DEMO_BOOKED. Een bestelling die in de tabel
 * loopt maar niet in de agenda staat, is een bestelling die twee keer verkocht kan
 * worden.
 *
 * `start` is de eerste dag van het venster; de tweede volgt uit WINDOW_DAYS, zodat
 * er ook hier geen datumbereik met de hand wordt ingetypt. `null` betekent: nog
 * geen venster, want er is nog niet betaald — en dat is de enige eerlijke waarde
 * voor een bestelling die nog geen plek heeft.
 */
export const DEMO_OTHERS = [
  { ref: 'VIS-2608-4468', brand: 'Nord Label', products: 12, start: '2026-08-03' },
  { ref: 'VIS-2608-4462', brand: 'Studio Halte', products: 8, start: '2026-08-04' },
  { ref: 'VIS-2607-9920', brand: 'Kade 4', products: 4, start: null },
];

/** Het venster van zo’n bestelling, als label. Leeg venster → '—'. */
export function otherWindow(order, lang = 'en') {
  if (!order.start) return '—';
  // Het venster van een bestaande bestelling, met de agenda erbij: sinds een paar
  // over volle dagen heen springt, kan de tweede dag niet meer uit de kalender
  // alleen worden afgeleid.
  const days = windowFor(order.start, order.products * IMAGES_PER_PRODUCT, {}, DEMO_BLACKOUTS);
  if (!days.length) return '—';
  return windowLabel({ start: days[0], end: days[days.length - 1] }, lang);
}

/** De eerste dag waarop een venster überhaupt mag beginnen. */
export const DEMO_FIRST_OFFERABLE = firstOfferableDay(DEMO_TODAY, DEMO_BLACKOUTS);

/**
 * Het eerste venster dat de poort vrijgeeft voor dit aantal producten.
 *
 * Dit is de echte `offerableWindows()`, niet een nagemaakte. Geeft `null` terug
 * als er niets past, want dat is wat de poort ook doet — er is met opzet geen
 * "dichtst mogelijke" uitkomst, en een figuur mag die dus ook niet suggereren.
 */
export function demoWindow(products) {
  const [first] = offerableWindows({
    today: DEMO_TODAY,
    products,
    service: 'complete',
    booked: DEMO_BOOKED,
    blackouts: DEMO_BLACKOUTS,
    limit: 1,
  });
  return first || null;
}

const MONTHS = {
  nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const WEEKDAYS = {
  nl: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/**
 * '2026-08-10' → '10 aug' / '10 Aug'.
 *
 * Met een eigen tabel en niet met `toLocaleDateString`: die leunt op de ICU-data
 * van de omgeving waar de build draait, en dan staat er op de ene machine "aug"
 * en op de andere "augustus". Twee talen, twaalf maanden, klaar.
 */
export function dayLabel(iso, lang = 'en') {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${(MONTHS[lang] || MONTHS.en)[Number(m) - 1]}`;
}

/** '2026-08-10' → 'ma' / 'Mon'. */
export function weekdayLabel(iso, lang = 'en') {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return (WEEKDAYS[lang] || WEEKDAYS.en)[dow];
}

/** Een venster als één label: '10 – 11 aug'. */
export function windowLabel(win, lang = 'en') {
  if (!win) return '—';
  const [, sm] = win.start.split('-');
  const [, em] = win.end.split('-');
  // Binnen dezelfde maand hoeft de maand er niet twee keer bij te staan.
  return sm === em
    ? `${Number(win.start.split('-')[2])} – ${dayLabel(win.end, lang)}`
    : `${dayLabel(win.start, lang)} – ${dayLabel(win.end, lang)}`;
}

/**
 * De rijen die FigGate tekent, met de staat er al bij uitgerekend.
 *
 * De figuur hoort geen regels te kennen; hij hoort ze te tonen. Alles wat hier
 * "vol", "te vroeg" of "ruimte" bepaalt, staat daarom hier en niet in de opmaak,
 * zodat de test dezelfde uitspraken kan nalezen die de bezoeker ziet.
 */
export function demoRows(products = DEMO_ORDER.products, lang = 'en') {
  const win = demoWindow(products);
  const inWindow = new Set(win ? win.days : []);
  return DEMO_DAYS.map((iso) => {
    // De figuur praat in producten omdat de bestelling erboven in producten staat,
    // en in deze demo is alles compleet — dus de deling gaat op. De poort rekent
    // in beelden; dat verschil hoort in de gegevens te zitten en niet in de opmaak.
    const usedImages = DEMO_BOOKED[iso] || 0;
    const used = usedImages / IMAGES_PER_PRODUCT;
    const closed = !isOpenDay(iso, DEMO_BLACKOUTS);
    const early = iso < DEMO_FIRST_OFFERABLE;
    const full = usedImages >= ATTENDED_IMAGES_PER_DAY;
    return {
      iso,
      day: weekdayLabel(iso, lang),
      label: dayLabel(iso, lang),
      used,
      usedImages,
      cap: ATTENDED_PER_DAY,
      capImages: ATTENDED_IMAGES_PER_DAY,
      offered: inWindow.has(iso),
      state: closed ? 'closed' : early ? 'early' : full ? 'full' : 'open',
      closed,
    };
  });
}
