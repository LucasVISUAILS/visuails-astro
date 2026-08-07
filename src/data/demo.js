// VISUAILS — de walkthrough, in één bestand: welke wegen er zijn, welke keuzes
// elke weg stelt, en welk beeld bij welke keuze hoort. Augustus 2026.
//
// ── WAT HIER STOND EN WAAROM HET WEG IS ──────────────────────────────────────
// Dit bestand voedde het demospel: slepen, twee keuzes, een vergelijker. Lucas,
// na het zien van een sticky pipeline-visual bij een betaalproduct: *"Ik wil
// eigenlijk dat het een sticky page is en dat je dan 1 categorie selecteert
// (Catalog, Lifestyle (1 van de lifestyle stylen kiezen) en Video (1 van de
// stylen kiezen…)) en dat je dan door het proces word geleidt, dus dat er dan
// een model word toegevoegd tussendoor etc. en je op het einde bij catalog dus
// 4 foto's te zien krijgt, lifestyle 3 foto's en video 1 video op het einde
// ziet. Ieder apart van elkaar."*
//
// Dat is bijna hetzelfde verhaal als het spel — kiezen, stijl, model, resultaat
// — en twee bijna gelijke dingen naast elkaar betekent twee fotoseries schieten
// en twee machines onderhouden. Gevraagd, en het antwoord was één ding. Dus het
// spel is weg en de walkthrough staat op zijn plek, op /demo én in /how-it-works.
// Wat overleeft is precies dit bestand: dezelfde beeldtabel, dezelfde
// placeholders, dus dezelfde schietlijst.
//
// ── DE BEELDEN ZIJN NOG GELEEND ──────────────────────────────────────────────
// Elke `src` hieronder wijst naar een bestand dat al op de site staat. Ze staan
// er zodat de walkthrough NU werkt en te beoordelen is in plaats van als grijze
// vlakken. Ze zijn niet goed genoeg om te blijven, om één reden die ertoe doet:
// de "voor" moet eruitzien als een telefoonfoto in een kamer. Leen je daar een
// studiofoto voor, dan laat het zien hoe een goede foto in een goede foto
// verandert, en dat is geen argument. Elke regel met `placeholder: true` moet
// vervangen worden; de lijst staat onderaan PLAN-DEMO-SPEL.md.
//
// ── WAT HIER NIET IN STAAT ───────────────────────────────────────────────────
// Geen prijzen (src/data/pricing.js), geen stijlnamen die ook in
// src/data/styles.js of src/data/videoStyles.js staan, geen shotnamen die ook
// in src/data/shots.js staan. Dit bestand wijst naar de waarheid en kopieert
// hem niet — de walkthrough leest de namen uit die bronnen en gebruikt de ids
// hieronder alleen om er beelden bij te zoeken.

/** Het gezicht dat door alle drie de wegen loopt. Eén model voor drie diensten
 *  in plaats van één per dienst: het maakt van drie voorbeelden één campagne,
 *  en het scheelt twee derde van de fotoproductie — Lucas' eigen argument
 *  ("als ik de klant laat kiezen tussen 10 modellen moet ik 10x zoveel foto's
 *  gaan maken voor dit concept"). */
export const DEMO_MODEL = {
  id: 'lisa',
  name: 'Lisa',
  photo: '/img/model-lisa-w800.webp',
};

/** De twee gezichten die zichtbaar maar vergrendeld naast hem staan. Kosten
 *  geen enkele nieuwe foto — dit zijn portretten die al in de roster zitten. */
export const DEMO_LOCKED_MODELS = [
  { id: 'ava', name: 'Ava', photo: '/img/model-ava-w800.webp' },
  { id: 'elias', name: 'Elias', photo: '/img/model-elias-w800.webp' },
];

/**
 * DE DRIE WEGEN.
 *
 * `look` is de tussenstap die deze weg stelt en `lookIds` zijn de keuzes erin.
 * De NAMEN bij die ids komen niet hier vandaan: catalog leest ze uit
 * src/data/backgrounds.js, lifestyle uit src/data/styles.js en video uit
 * src/data/videoStyles.js. Zo kan een stijl niet hier "Dunes" heten en daar
 * iets anders.
 *
 * `out` is hoeveel er aan het eind staat, en dat getal is geen keuze van deze
 * demo: vier voor een catalogset, drie voor een lifestyle-carousel, één clip.
 * Het is dezelfde rekensom als in PER_PRODUCT's copy in pricing.js.
 *
 * Catalog kiest een ACHTERGROND en geen stijl. Dat is niet symmetrie om de
 * symmetrie: het bestelformulier vraagt het ook, het is de enige keuze die een
 * catalogset heeft, en zonder tussenstap zou die ene weg twee stappen tellen
 * waar de andere twee er drie hebben — dan leest hij als de minder serieuze.
 */
export const WALK_SERVICES = [
  {
    id: 'catalog',
    look: 'background',
    lookIds: ['white', 'off-white', 'beige'],
    out: 4,
    /** De vier shots van een catalogset. Ids gelijk aan src/data/shots.js. */
    shots: ['front', 'back', 'detail', 'worn'],
    source: { src: '/img/catalog-before.webp', placeholder: true },
  },
  {
    id: 'lifestyle',
    look: 'style',
    // 'custom' zit hier bewust NIET bij. Een eigen stijl gaat via een notitie
    // bij de bestelling, niet via een knop in een demo — en een keuze tonen die
    // je niet kunt maken is erger dan hem weglaten. De walkthrough noemt hem in
    // een regel onder de keuzes.
    lookIds: ['dunes', 'flash', 'glow', 'phone-made'],
    out: 3,
    source: { src: '/img/lifestyle-phone-made-07.webp', placeholder: true },
  },
  {
    id: 'video',
    look: 'videoStyle',
    lookIds: ['motion', 'lifestyle', 'campaign'],
    out: 1,
    source: { src: '/img/lifestyle-flash-05.webp', placeholder: true },
  },
];

/** De drie achtergronden uit src/data/backgrounds.js, hier alleen met hun kleur
 *  erbij zodat de walkthrough een staal kan tekenen. */
export const DEMO_BACKGROUNDS = [
  { id: 'white', hex: '#FFFFFF' },
  { id: 'off-white', hex: '#F7F5F1' },
  { id: 'beige', hex: '#EDE4D8' },
];

// ── DE BEELDTABEL ────────────────────────────────────────────────────────────
// Eén functie per weg, en de bestandsnaam IS de combinatie. Zodra de echte
// serie er staat is dit de enige plek die verandert, en een ontbrekend beeld
// valt meteen op omdat de naam dan niet bestaat.

const PLACEHOLDER_CATALOG = {
  front: '/img/catalog-after.webp',
  back: '/img/banners-03.webp',
  detail: '/img/banners-07.webp',
  worn: '/img/lifestyle-glow-02.webp',
};

/** Eén catalogbeeld: één shot op één achtergrond. */
export function catalogImage(shot, background) {
  if (PLACEHOLDER_CATALOG[shot]) {
    return { src: PLACEHOLDER_CATALOG[shot], placeholder: true };
  }
  return { src: `/img/demo/cat-${shot}-${background}.webp`, placeholder: false };
}

// Drie per stijl, want een lifestyle-carousel is er drie. Dunes heeft er maar
// twee op de site staan, dus de derde is geleend van een banner — nog een reden
// waarom deze hele tabel tijdelijk is.
const PLACEHOLDER_LIFESTYLE = {
  dunes: ['/img/lifestyle-dunes-01.webp', '/img/lifestyle-dunes-02.webp', '/img/banners-05.webp'],
  flash: ['/img/lifestyle-flash-01.webp', '/img/lifestyle-flash-03.webp', '/img/lifestyle-flash-04.webp'],
  glow: ['/img/lifestyle-glow-01.webp', '/img/lifestyle-glow-03.webp', '/img/lifestyle-glow-04.webp'],
  'phone-made': ['/img/lifestyle-phone-made-01.webp', '/img/lifestyle-phone-made-04.webp', '/img/lifestyle-phone-made-07.webp'],
};

/** Eén beeld uit de carousel van een stijl. `i` is 0-based. */
export function lifestyleImage(style, i = 0) {
  const set = PLACEHOLDER_LIFESTYLE[style];
  if (set) return { src: set[i % set.length], placeholder: true };
  return { src: `/img/demo/lif-${style}-${i + 1}.webp`, placeholder: false };
}

/**
 * Video. Zolang er geen clips zijn staat hier een stilstaand beeld, en dat
 * wordt ook ALS stilstaand beeld getoond in plaats van als een <video> die
 * niets doet. Iemand die op play drukt en niets ziet gebeuren leert iets
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
 * WAT ER AAN HET EIND STAAT, per weg en per keuze.
 *
 * Eén functie voor alle drie zodat de component niet hoeft te weten welke weg
 * hij toont — hij vraagt om een set en krijgt er een van de juiste lengte,
 * inclusief het label dat eronder hoort. Catalog levert shotnamen (die de
 * pagina uit shots.js haalt), de andere twee tellen.
 */
export function walkResult(service, look) {
  if (service === 'catalog') {
    const svc = WALK_SERVICES[0];
    return svc.shots.map(function frame(shot) {
      const img = catalogImage(shot, look);
      return { src: img.src, placeholder: img.placeholder, shot: shot, video: false };
    });
  }
  if (service === 'lifestyle') {
    return [0, 1, 2].map(function frame(i) {
      const img = lifestyleImage(look, i);
      return { src: img.src, placeholder: img.placeholder, shot: null, video: false };
    });
  }
  const clip = videoClip(look);
  return [{ src: clip.poster, clip: clip.clip, placeholder: clip.placeholder, shot: null, video: true }];
}

/**
 * DE TEKSTEN.
 *
 * Ze staan hier en niet in de aanroepende pagina's, anders dan bij de figuren
 * op /how-it-works — en dat is een bewuste uitzondering op die regel. TWEE
 * pagina's tonen deze walkthrough (/demo en /how-it-works), en copy die op twee
 * plekken staat is copy die uit elkaar gaat lopen. Eén tabel, twee talen, één
 * plek om te controleren.
 */
export const WALK_COPY = {
  en: {
    // /demo renders these two as its own hero; /how-it-works has its own
    // heading and uses neither.
    title: 'Follow one order, start to finish.',
    lede: 'Pick a service and scroll. The window on the left shows what exists at that moment — the photo you sent, the look you chose, the face we added, and the files that come back. Everything in it we made earlier, for real orders.',
    label: 'A walkthrough of one VISUAILS order, from the photo you send to the files you get',
    pickH: 'Pick one to follow',
    pickHint: 'One path at a time — each service works differently, and showing all three at once is how nobody reads any of them.',
    services: {
      catalog: { name: 'Catalog', line: 'Four images per product' },
      lifestyle: { name: 'Lifestyle', line: 'Three images, one styled look' },
      video: { name: 'Video', line: 'One clip that loops' },
    },
    steps: {
      source: { n: 'You send', h: 'One photo, taken on a phone', b: 'On a table, in window light, however it comes out. This is the whole of what we need to start — the effort does not grow with the size of your order.' },
      background: { n: 'You choose', h: 'Which ground it stands on', b: 'Three grounds, and the one you pick is used for every product in the order so the set matches.' },
      style: { n: 'You choose', h: 'Which house style', b: 'The look is fixed before anything is made, which is what makes twenty products come back looking like one shoot.' },
      videoStyle: { n: 'You choose', h: 'Which kind of clip', b: 'Each style is a different piece of direction — how the camera moves, how long a beat lasts, where the product lands.' },
      model: { n: 'We add', h: 'A face, at no extra cost', b: 'The model is included in the price. In this walkthrough it is one face; on a real order you pick from ten, or we build one that is only yours.' },
      make: { n: 'We make it', h: 'Produced together, finished by hand', b: 'Every product in the order runs through as one batch — that is what makes the lighting, the angle and the grade match. Then a person looks at it before it leaves.' },
      result: { n: 'You get', h: 'This comes back', b: '' },
    },
    lookCustom: 'Something else in mind? A style of your own goes in a note with your order and we look at it together.',
    modelLocked: 'Locked in this walkthrough',
    modelRoster: 'See the ten',
    checks: ['Fit checked against your photo', 'Colour compared', 'Background clean'],
    outCount: function outCount(n) { return n === 1 ? 'One clip, from that one photo.' : `${n} images, from that one photo.`; },
    shotNames: { front: 'Front', back: 'Back', detail: 'Detail', worn: 'On a model' },
    backgroundNames: { white: 'White', 'off-white': 'Off-white', beige: 'Beige' },
    stageEmpty: 'Nothing yet',
    ctaPrimary: 'Do this with your own product',
    ctaGhost: 'Start an order',
    placeholderNote: 'Stand-in images — the walkthrough set is still being shot. Every frame here was made earlier for a real order; nothing is generated while you wait.',
    noClip: 'The clip for this style has not been shot yet — this is the still it will be cut from.',
  },
  nl: {
    title: 'Volg één bestelling, van begin tot eind.',
    lede: 'Kies een dienst en scroll. Het venster links laat zien wat er op dat moment bestaat — de foto die je stuurde, de look die je koos, het gezicht dat we toevoegden, en de bestanden die terugkomen. Alles erin hebben we eerder gemaakt, voor echte bestellingen.',
    label: 'Een doorloop van één VISUAILS-bestelling, van de foto die je stuurt tot de bestanden die je krijgt',
    pickH: 'Kies er één om te volgen',
    pickHint: 'Eén weg tegelijk — elke dienst werkt anders, en alle drie tegelijk tonen is hoe niemand er één leest.',
    services: {
      catalog: { name: 'Catalog', line: 'Vier beelden per product' },
      lifestyle: { name: 'Lifestyle', line: 'Drie beelden, één gestylede look' },
      video: { name: 'Video', line: 'Eén clip die doorloopt' },
    },
    steps: {
      source: { n: 'Jij stuurt', h: 'Eén foto, met een telefoon gemaakt', b: 'Op tafel, bij daglicht, hoe hij ook uitvalt. Dit is alles wat we nodig hebben om te beginnen — de moeite groeit niet mee met de omvang van je bestelling.' },
      background: { n: 'Jij kiest', h: 'Waar hij op staat', b: 'Drie ondergronden, en die ene wordt voor elk product in de bestelling gebruikt zodat de set klopt.' },
      style: { n: 'Jij kiest', h: 'Welke huisstijl', b: 'De look ligt vast voordat er iets gemaakt wordt, en juist dat maakt dat twintig producten terugkomen alsof het één shoot was.' },
      videoStyle: { n: 'Jij kiest', h: 'Wat voor clip', b: 'Elke stijl is een andere regie — hoe de camera beweegt, hoe lang een beat duurt, waar het product landt.' },
      model: { n: 'Wij voegen toe', h: 'Een gezicht, zonder meerprijs', b: 'Het model zit in de prijs. In deze doorloop is het één gezicht; bij een echte bestelling kies je uit tien, of we maken er één die alleen van jou is.' },
      make: { n: 'Wij maken het', h: 'Samen geproduceerd, met de hand afgewerkt', b: 'Elk product in de bestelling gaat als één batch door de pipeline — dat is wat de belichting, de hoek en de grade laat kloppen. Daarna kijkt er een mens naar voordat het weggaat.' },
      result: { n: 'Jij krijgt', h: 'Dit komt terug', b: '' },
    },
    lookCustom: 'Iets anders voor ogen? Een eigen stijl gaat in een notitie bij je bestelling, en dan kijken we er samen naar.',
    modelLocked: 'Vast in deze doorloop',
    modelRoster: 'Bekijk de tien',
    checks: ['Pasvorm vergeleken met je foto', 'Kleur gecontroleerd', 'Achtergrond schoon'],
    outCount: function outCount(n) { return n === 1 ? 'Eén clip, uit die ene foto.' : `${n} beelden, uit die ene foto.`; },
    shotNames: { front: 'Voorkant', back: 'Achterkant', detail: 'Detail', worn: 'Op een model' },
    backgroundNames: { white: 'Wit', 'off-white': 'Gebroken wit', beige: 'Beige' },
    stageEmpty: 'Nog niets',
    ctaPrimary: 'Doe dit met je eigen product',
    ctaGhost: 'Start een bestelling',
    placeholderNote: 'Voorlopige beelden — de serie voor deze doorloop moet nog geschoten worden. Elk kader hier is eerder gemaakt voor een echte bestelling; er wordt niets gegenereerd terwijl je kijkt.',
    noClip: 'De clip voor deze stijl is nog niet geschoten — dit is het stilstaande beeld waar hij uit gesneden wordt.',
  },
};
