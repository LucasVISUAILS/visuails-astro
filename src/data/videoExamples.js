/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE VIDEOVOORBEELDEN, EN WAT ER GELEVERD WORDT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Blok 7 van Lucas' lijst: *"poster met klik-om-te-spelen"*, twee voorbeelden per
 * videotype, lege staten, en een lijst met de exacte bestandsnamen en formaten die
 * de klant krijgt.
 *
 * ── HET MATERIAAL BESTAAT NOG NIET, EN DAT IS HIER EEN GEGEVEN ──────────────
 *
 * Lucas, 13 augustus 2026: *"handig om te weten dat de video content nog gemaakt
 * moet worden en dat je voor nu placeholders kan gebruiken."*
 *
 * Dus staat elke `file` hieronder op `null`, en dat is geen ontbrekende invulling
 * maar de toestand die het component moet kunnen tekenen. Er is precies één ding
 * dat hier NIET gebeurt: een bestaande lifestyle-still als poster gebruiken. Een
 * poster is de eerste seconde van de clip; een foto die er alleen maar op lijkt is
 * een voorbeeld van werk dat niet bestaat, en dat is dezelfde soort belofte die we
 * vandaag op /video juist hebben weggehaald.
 *
 * De lege staat is dus zichtbaar leeg, met de juiste beeldverhouding eromheen zodat
 * de bladspiegel al klopt. Wat er te zien valt als het materiaal er is, is precies
 * wat er nu te lezen valt.
 *
 * ── WAAROM `preload: 'none'` EN GEEN AUTOPLAY ───────────────────────────────
 *
 * Vier videotypes × twee voorbeelden is acht clips op één pagina. Automatisch
 * spelen betekent acht bestanden downloaden voor een bezoeker die er misschien één
 * bekijkt — op een telefoon met een databundel is dat de duurste pagina van de
 * site. Met een poster en `preload="none"` haalt de browser nul bytes video tot er
 * geklikt wordt.
 *
 * En het is de reden dat hier geen JavaScript bij hoort: `<video controls poster>`
 * IS poster-met-klik-om-te-spelen, native, in elke browser. Een eigen speler
 * eromheen bouwen zou een script toevoegen aan pagina's die het nergens anders
 * voor nodig hebben.
 */

/**
 * De beeldverhoudingen die we leveren, en waar ze voor zijn.
 *
 * DEZE DRIE ZIJN GEEN NIEUWE BELOFTE. /video zegt al *"Cut for square, portrait and
 * wide from one file"* en *"delivered in the aspect ratio Instagram and TikTok
 * use"*. Dit bestand maakt die zin concreet in plaats van er iets bij te bedenken —
 * en zodra het één bron is, kan de pagina er niet meer iets anders over zeggen dan
 * de levering doet.
 */
export const VIDEO_RATIOS = [
  {
    id: 'vertical',
    ratio: '9x16',
    css: '9 / 16',
    name: { en: 'Vertical', nl: 'Verticaal' },
    what: {
      en: 'Reels, TikTok, Stories and Shorts — the full screen of a phone held upright.',
      nl: 'Reels, TikTok, Stories en Shorts — het volle scherm van een telefoon rechtop.',
    },
  },
  {
    id: 'square',
    ratio: '1x1',
    css: '1 / 1',
    name: { en: 'Square', nl: 'Vierkant' },
    what: {
      en: 'The feed, and the safest crop for a product page or a marketplace tile.',
      nl: 'De feed, en de veiligste uitsnede voor een productpagina of een marktplaatstegel.',
    },
  },
  {
    id: 'wide',
    ratio: '16x9',
    css: '16 / 9',
    name: { en: 'Wide', nl: 'Breed' },
    what: {
      en: 'A page header, an email banner, YouTube, or a screen in a shop.',
      nl: 'Een paginakop, een e-mailbanner, YouTube, of een scherm in een winkel.',
    },
  },
];

/**
 * Het bestandsformaat, en waarom er één is en niet drie.
 *
 * MP4 met H.264 is de enige keuze waar geen "behalve op" achter hoort. Elke
 * browser, elk platform, elk montageprogramma en elke marktplaats leest het. WebM
 * is kleiner en AV1 nog kleiner, maar een klant die zijn clip in een
 * presentatieprogramma of een oudere editor opent, wil geen bestand dat "eigenlijk
 * beter" is.
 *
 * WAT HIER NIET STAAT, EN DAT IS MET OPZET: resolutie en bitrate. Dat zijn keuzes
 * over materiaal dat nog niet gemaakt is, en een getal dat hier vandaag verzonnen
 * wordt, staat morgen als belofte op een pagina. Zodra de eerste clip er is, hoort
 * dat getal hier — op één plek, zoals de hexwaarden in backgrounds.js.
 */
export const VIDEO_FORMAT = {
  ext: 'mp4',
  codec: 'H.264',
  name: 'MP4',
  why: {
    en: 'MP4/H.264 — the one format with no "except on" after it. Every browser, every platform, every editor.',
    nl: 'MP4/H.264 — het enige formaat zonder "behalve op" erachter. Elke browser, elk platform, elke editor.',
  },
};

/**
 * Hoe een geleverd clipbestand heet.
 *
 * Dezelfde opbouw als de foto's in src/lib/delivery.js: een nummer vooraan zodat een
 * verkenner de drie verhoudingen in ONZE volgorde zet en niet alfabetisch (waar
 * `square` vóór `vertical` komt, terwijl verticaal het formaat is waar de klant
 * meestal naar zoekt). De verhouding staat er met een `x` en niet met een `:` in,
 * want een dubbele punt mag niet in een bestandsnaam op Windows.
 */
export function videoFilename(index, ratioId) {
  const i = VIDEO_RATIOS.findIndex((r) => r.id === ratioId);
  const r = VIDEO_RATIOS[i];
  if (!r) throw new Error(`videoExamples: onbekende verhouding "${ratioId}"`);
  return `${i + 1}-${r.id}-${r.ratio}.${VIDEO_FORMAT.ext}`;
}

/**
 * De twee voorbeelden per videotype.
 *
 * TWEE EN NIET DRIE OF ZES, en dat is de vraag die Lucas al beantwoord had: twee
 * naast elkaar laat zien dat een stijl een BEREIK heeft en geen toeval is, en het is
 * nog steeds één blik. Bij drie gaat de bezoeker vergelijken in plaats van kijken.
 *
 * `file` is het pad onder public/ zodra het bestaat, `poster` de still die de browser
 * toont vóór de eerste klik. Beide null betekent: nog niet gemaakt, en dan tekent
 * VideoExamples.astro de lege staat.
 *
 * `alt` beschrijft wat er te ZIEN is en niet wat het is — een lezer met een
 * schermlezer heeft niets aan "voorbeeldvideo 1". Die tekst is er nu al, want hij
 * hangt aan de opzet van het voorbeeld en niet aan het bestand.
 */
const leeg = { file: null, poster: null };

export const videoExamples = {
  motion: [
    {
      id: 'motion-1',
      ...leeg,
      ratio: 'vertical',
      seconds: 8,
      title: { en: 'A bottle, one slow turn', nl: 'Een flacon, één langzame draai' },
      alt: {
        en: 'A bottle on a plain ground, turning slowly once from left to right.',
        nl: 'Een flacon op een egale ondergrond die één keer langzaam van links naar rechts draait.',
      },
    },
    {
      id: 'motion-2',
      ...leeg,
      ratio: 'square',
      seconds: 8,
      title: { en: 'A sneaker, light drifting across', nl: 'Een sneaker, licht dat overtrekt' },
      alt: {
        en: 'A sneaker standing still while a soft highlight drifts across the upper.',
        nl: 'Een sneaker die stilstaat terwijl een zachte lichtstreep over het bovenwerk trekt.',
      },
    },
  ],
  lifestyle: [
    {
      id: 'lifestyle-1',
      ...leeg,
      ratio: 'vertical',
      seconds: 8,
      title: { en: 'Held, then set down', nl: 'Vastgehouden, dan neergezet' },
      alt: {
        en: 'A pair of hands lifting the product into frame and setting it down on a table.',
        nl: 'Twee handen die het product in beeld tillen en op een tafel neerzetten.',
      },
    },
    {
      id: 'lifestyle-2',
      ...leeg,
      ratio: 'square',
      seconds: 8,
      title: { en: 'Worn, walking away', nl: 'Gedragen, weglopend' },
      alt: {
        en: 'A model wearing the garment, walking away from the camera in a lit room.',
        nl: 'Een model dat het kledingstuk draagt en van de camera af wegloopt in een lichte ruimte.',
      },
    },
  ],
  campaign: [
    {
      id: 'campaign-1',
      ...leeg,
      ratio: 'wide',
      seconds: 8,
      title: { en: 'Three cuts, one idea', nl: 'Drie shots, één idee' },
      alt: {
        en: 'Three short shots cut together: a detail, the whole product, the product in use.',
        nl: 'Drie korte shots achter elkaar: een detail, het hele product, het product in gebruik.',
      },
    },
    {
      id: 'campaign-2',
      ...leeg,
      ratio: 'vertical',
      seconds: 8,
      title: { en: 'The same idea, vertical', nl: 'Hetzelfde idee, verticaal' },
      alt: {
        en: 'The same three shots recut for a phone screen, framed tighter.',
        nl: 'Dezelfde drie shots opnieuw gemonteerd voor een telefoonscherm, strakker in beeld.',
      },
    },
  ],
  custom: [
    {
      id: 'custom-1',
      ...leeg,
      ratio: 'wide',
      seconds: 8,
      title: { en: 'A motion signature, built once', nl: 'Een eigen beweging, één keer gebouwd' },
      alt: {
        en: 'A move designed for one brand and repeated across its whole range.',
        nl: 'Een beweging die voor één merk is ontworpen en over het hele assortiment terugkomt.',
      },
    },
    {
      id: 'custom-2',
      ...leeg,
      ratio: 'square',
      seconds: 8,
      title: { en: 'The same signature, on another product', nl: 'Dezelfde beweging, ander product' },
      alt: {
        en: 'The same designed move applied to a different product from the same range.',
        nl: 'Dezelfde ontworpen beweging op een ander product uit hetzelfde assortiment.',
      },
    },
  ],
};

/** De twee voorbeelden van één stijl, of een lege lijst voor een stijl die er geen heeft. */
export function examplesFor(slug) {
  return videoExamples[slug] || [];
}

/**
 * Staat er al materiaal, of tekent het component nog de lege staat?
 *
 * Eén functie en niet `!!e.file` op vier plekken: een voorbeeld is pas te bekijken
 * als er een clip ÉN een poster is. Alleen een clip zou een zwart vlak geven tot de
 * eerste frame binnen is, en dan is de "klik om te spelen" een knop op niets.
 */
export function isReady(example) {
  return Boolean(example && example.file && example.poster);
}
