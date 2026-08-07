// VISUAILS — het demospel, in één bestand: wat de speler kiest en welk beeld
// daarbij hoort. Augustus 2026. Het denkwerk staat in PLAN-DEMO-SPEL.md.
//
// WAAROM ALLES HIER STAAT EN NIET IN DE COMPONENT. Het spel is één machine met
// een tabel ernaast. De machine (src/scripts/demo-game.js) weet hoe je van stap
// naar stap gaat en wat een keuze doet; hij weet niets van hoodies, van Dunes of
// van de prijs van een testsample. Dat betekent dat het vervangen van de
// voorlopige beelden door de echte fotoserie een wijziging is in DIT bestand en
// nergens anders — en dat is precies wat er gaat gebeuren zodra de fotodag
// geweest is.
//
// ── DE BEELDEN ZIJN NU NOG GELEEND ───────────────────────────────────────────
// Elke `src` hieronder wijst naar een bestand dat al op de site staat: de
// stijlfoto's van /lifestyle, de before/after van de catalogpagina, de
// portretten uit de roster. Ze staan er zodat het spel NU al echt werkt en te
// beoordelen is in plaats van als grijze vlakken.
//
// Ze zijn niet goed genoeg om te blijven, en om één reden die er echt toe doet:
// de "voor" moet eruitzien als een telefoonfoto in een kamer. Leen je daar een
// studiofoto voor, dan laat de vergelijker zien hoe een goede foto in een goede
// foto verandert, en dat is geen argument. De echte lijst met wat er gemaakt
// moet worden staat onderaan PLAN-DEMO-SPEL.md; elke regel hier met
// `placeholder: true` moet daardoor vervangen worden.
//
// ── WAT ER NIET IN STAAT ─────────────────────────────────────────────────────
// Geen prijzen (die komen uit src/data/pricing.js, één bron), geen stijlnamen
// die ook in src/data/styles.js staan (idem), en geen zin die op een andere
// pagina ook voorkomt. Dit bestand wijst naar de waarheid, het kopieert hem
// niet.

/** Het gezicht dat door de hele demo loopt. Zie PLAN-DEMO-SPEL.md over waarom
 *  één model voor alle drie de diensten beter is dan één per dienst: het maakt
 *  van drie voorbeelden één campagne, en het scheelt twee derde van de
 *  fotoproductie. */
export const DEMO_MODEL = {
  id: 'lisa',
  name: 'Lisa',
  photo: '/img/model-lisa-w800.webp',
};

/** De twee gezichten die zichtbaar maar vergrendeld naast hem staan, plus de
 *  merkmodel-kaart. Kosten geen enkele nieuwe foto — dit zijn de portretten die
 *  al in de roster zitten. */
export const DEMO_LOCKED_MODELS = [
  { id: 'ava', name: 'Ava', photo: '/img/model-ava-w800.webp' },
  { id: 'elias', name: 'Elias', photo: '/img/model-elias-w800.webp' },
];

/**
 * De drie producten, één per dienst.
 *
 * `source` is de foto die de speler het vak in sleept — in het echt zijn
 * telefoonfoto's, hier voorlopig geleend.
 */
export const DEMO_PRODUCTS = [
  {
    id: 'catalog',
    service: 'catalog',
    /** Wat er op de kaart bij stap 1 staat. */
    en: { name: 'A hoodie', line: 'Catalog set · four images per product' },
    nl: { name: 'Een hoodie', line: 'Catalogset · vier beelden per product' },
    source: { src: '/img/catalog-before.webp', placeholder: true },
    /** De vragen die deze weg stelt, in deze volgorde. */
    steps: ['background', 'shots', 'model'],
  },
  {
    id: 'lifestyle',
    service: 'lifestyle',
    en: { name: 'A jacket', line: 'Lifestyle · your product in a world' },
    nl: { name: 'Een jas', line: 'Lifestyle · je product in een wereld' },
    source: { src: '/img/lifestyle-phone-made-07.webp', placeholder: true },
    steps: ['style', 'crop', 'model'],
  },
  {
    id: 'video',
    service: 'video',
    en: { name: 'A sneaker', line: 'Video · a clip that loops' },
    nl: { name: 'Een sneaker', line: 'Video · een clip die doorloopt' },
    source: { src: '/img/lifestyle-flash-05.webp', placeholder: true },
    steps: ['videoStyle', 'ratio'],
  },
];

/** De drie achtergronden uit src/data/backgrounds.js, hier alleen met de
 *  beelden erbij die erbij horen. Namen en hexcodes komen uit dat bestand. */
export const DEMO_BACKGROUNDS = [
  { id: 'white', hex: '#FFFFFF' },
  { id: 'off-white', hex: '#F7F5F1' },
  { id: 'beige', hex: '#EDE4D8' },
];

/** De vier shots van een catalogset. Ids gelijk aan src/data/shots.js. */
export const DEMO_SHOTS = ['front', 'back', 'detail', 'worn'];

/**
 * Welk beeld hoort bij welke combinatie.
 *
 * EEN FUNCTIE EN GEEN TABEL, want de bestandsnaam IS de combinatie:
 * `demo/cat-<shot>-<achtergrond>.webp`. Zodra de echte serie er staat, is dit
 * de enige plek die verandert — en een ontbrekend beeld valt meteen op, want
 * dan bestaat de naam niet.
 *
 * Zolang de serie er niet is, wordt er geleend. `placeholder` zegt dat.
 */
const PLACEHOLDER_CATALOG = {
  front: '/img/catalog-after.webp',
  back: '/img/banners-03.webp',
  detail: '/img/banners-07.webp',
  worn: '/img/lifestyle-glow-02.webp',
};

export function catalogImage(shot, background) {
  if (PLACEHOLDER_CATALOG[shot]) {
    return { src: PLACEHOLDER_CATALOG[shot], placeholder: true };
  }
  return { src: `/img/demo/cat-${shot}-${background}.webp`, placeholder: false };
}

const PLACEHOLDER_LIFESTYLE = {
  dunes: ['/img/lifestyle-dunes-01.webp', '/img/lifestyle-dunes-02.webp'],
  flash: ['/img/lifestyle-flash-01.webp', '/img/lifestyle-flash-03.webp'],
  glow: ['/img/lifestyle-glow-01.webp', '/img/lifestyle-glow-03.webp'],
  'phone-made': ['/img/lifestyle-phone-made-01.webp', '/img/lifestyle-phone-made-04.webp'],
};

export function lifestyleImage(style, frame = 'wide') {
  const pair = PLACEHOLDER_LIFESTYLE[style];
  if (pair) return { src: frame === 'close' ? pair[1] : pair[0], placeholder: true };
  return { src: `/img/demo/lif-${style}-${frame}.webp`, placeholder: false };
}

/**
 * Video. Zolang er geen clips zijn, staat hier een stilstaand beeld — en dat
 * wordt ook als stilstaand beeld getoond in plaats van als een <video> die
 * niets doet. Een speler die op play drukt en niets ziet gebeuren, leert iets
 * verkeerds over de dienst.
 */
const PLACEHOLDER_VIDEO = {
  motion: '/img/banners-11.webp',
  lifestyle: '/img/lifestyle-glow-05.webp',
  campaign: '/img/lifestyle-flash-06.webp',
};

export function videoClip(style) {
  if (PLACEHOLDER_VIDEO[style]) {
    return { poster: PLACEHOLDER_VIDEO[style], clip: null, placeholder: true };
  }
  return { poster: `/img/demo/vid-${style}.webp`, clip: `/img/demo/vid-${style}.mp4`, placeholder: false };
}

/**
 * De teksten.
 *
 * Twee talen, en de sleutels zijn per stap genoemd zodat de machine ze kan
 * opzoeken met de naam van de stap die hij toont.
 */
export const DEMO_COPY = {
  en: {
    title: 'Try it on a product that is not yours.',
    lede: 'Drag the photo in, make two choices, and see what comes back. Everything you see here we made earlier — nothing is generated while you wait.',
    stepOf: (n, total) => `Step ${n} of ${total}`,
    pickProduct: 'Pick something to send in',
    drop: 'Drag the photo in here',
    dropHint: 'Or tap it. This is the same box the real order form uses.',
    dropped: 'Got it.',
    background: 'Which background?',
    backgroundNames: { white: 'White', 'off-white': 'Off-white', beige: 'Beige' },
    shots: 'Which shots do you want back?',
    shotNames: { front: 'Front', back: 'Back', detail: 'Detail', worn: 'On a model' },
    shotsHint: 'A catalog set is four images. Leave one off and see what happens.',
    style: 'Pick a house style',
    crop: 'Which crop?',
    videoStyle: 'Pick a video style',
    ratio: 'Which shape?',
    model: 'Who wears it?',
    modelLocked: 'In this demo it is one face. On a real order you pick from ten, or we build one that is only yours.',
    modelRoster: 'See the roster',
    modelOwn: 'Your own brand model',
    customCard: 'Something else in mind?',
    customBody: 'A style of your own goes in a note with your order and we look at it together.',
    checking: 'Checking it over',
    checks: ['Fit checked', 'Colour compared with your photo', 'Background clean'],
    resultH: 'This came back',
    resultLede: (n) => (n === 1 ? 'One image, from that photo.' : `${n} images, from that one photo.`),
    before: 'Your photo',
    after: 'What we made',
    missingBack: 'No back shot',
    restart: 'Try another product',
    ctaPrimary: 'Do this with your own product — €0.99',
    ctaGhost: 'Start a real order',
    counter: (clicks, seconds) => `${clicks} choices, ${seconds} seconds. A real order works the same way, with your own photos.`,
    honest: 'Made earlier by us, for real orders. Nothing here is generated while you wait.',
    placeholderNote: 'Stand-in images — the demo set is still being shot.',
  },
  nl: {
    title: 'Probeer het op een product dat niet van jou is.',
    lede: 'Sleep de foto erin, maak twee keuzes, en zie wat er terugkomt. Alles wat je hier ziet hebben we eerder gemaakt — er wordt niets gegenereerd terwijl je wacht.',
    stepOf: (n, total) => `Stap ${n} van ${total}`,
    pickProduct: 'Kies iets om in te sturen',
    drop: 'Sleep de foto hierin',
    dropHint: 'Of tik erop. Dit is hetzelfde vak als in het echte bestelformulier.',
    dropped: 'Binnen.',
    background: 'Welke achtergrond?',
    backgroundNames: { white: 'Wit', 'off-white': 'Gebroken wit', beige: 'Beige' },
    shots: 'Welke shots wil je terug?',
    shotNames: { front: 'Voorkant', back: 'Achterkant', detail: 'Detail', worn: 'Op een model' },
    shotsHint: 'Een catalogset is vier beelden. Laat er één uit en kijk wat er gebeurt.',
    style: 'Kies een huisstijl',
    crop: 'Welke uitsnede?',
    videoStyle: 'Kies een videostijl',
    ratio: 'Welke vorm?',
    model: 'Wie draagt hem?',
    modelLocked: 'In deze demo staat er één gezicht. Bij een echte bestelling kies je uit tien, of we maken er één die alleen van jou is.',
    modelRoster: 'Bekijk de modellen',
    modelOwn: 'Je eigen merkmodel',
    customCard: 'Iets anders voor ogen?',
    customBody: 'Een eigen stijl gaat in een notitie bij je bestelling, en dan kijken we er samen naar.',
    checking: 'We lopen het na',
    checks: ['Pasvorm gecontroleerd', 'Kleur vergeleken met je foto', 'Achtergrond schoon'],
    resultH: 'Dit kwam terug',
    resultLede: (n) => (n === 1 ? 'Eén beeld, uit die ene foto.' : `${n} beelden, uit die ene foto.`),
    before: 'Jouw foto',
    after: 'Wat wij maakten',
    missingBack: 'Geen achterkant',
    restart: 'Probeer een ander product',
    ctaPrimary: 'Doe dit met je eigen product — € 0,99',
    ctaGhost: 'Start een echte bestelling',
    counter: (clicks, seconds) => `${clicks} keuzes, ${seconds} seconden. Een echte bestelling gaat net zo, met je eigen foto's.`,
    honest: 'Eerder door ons gemaakt, voor echte bestellingen. Er wordt hier niets gegenereerd terwijl je wacht.',
    placeholderNote: 'Voorlopige beelden — de demoserie moet nog geschoten worden.',
  },
};
