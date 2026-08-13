/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BEELDVERHOUDING VAN WAT WE LEVEREN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 13 augustus 2026: *"wat ik verder nog mis bij bijvoorbeeld catalog
 * orderflow is dat de klant per product het afbeelding formaat kan aangeven.
 * Hoewel ik denk dat bij catalog het beter is om 1 te kiezen [...] over de gehele
 * batch. Bij lifestyle moeten deze wel per foto ingesteld kunnen worden omdat je
 * soms een simpele post en soms een banner lifestyle foto wil."*
 *
 * Dat is één vraag met twee antwoorden, en het verschil zit in wat de dienst IS.
 *
 * ── CATALOG: ÉÉN VERHOUDING VOOR DE HELE BESTELLING ────────────────────────
 *
 * Catalogbeelden gaan naast elkaar op een productpagina en in een grid. Verschilt
 * de verhouding per product, dan staat dat grid scheef — en dat is precies het
 * probleem dat een merk bij ons komt oplossen. Zie de kop van backgrounds.js voor
 * dezelfde redenering bij de achtergrond: *"de nieuwe moeten eruitzien alsof ze
 * naast de oude horen."* Een keuze per product zou de klant de mogelijkheid geven
 * zijn eigen grid te breken, en dat is geen vrijheid maar een valkuil.
 *
 * ── LIFESTYLE: EEN STANDAARD, EN AFWIJKEN PER BEELD ────────────────────────
 *
 * Een lifestylebeeld heeft geen grid om in te passen; het heeft een PLEK. Een post
 * is vierkant of staand, een banner is breed, een story is verticaal. Lucas'
 * voorbeeld is precies dat: *"soms een simpele post en soms een banner"*.
 *
 * Maar drie beelden per product × dertig producten is negentig keuzes, en een
 * formulier dat negentig keer hetzelfde vraagt, wordt negentig keer hetzelfde
 * beantwoord. Vandaar de vorm die Lucas koos: één standaard voor de bestelling, en
 * per beeld mag je ervan afwijken. Wie niets doet krijgt overal dezelfde; wie één
 * banner wil, zet dat ene beeld om.
 *
 * ── WAAROM DIT EEN EIGEN BESTAND IS ────────────────────────────────────────
 *
 * Dezelfde reden als src/data/backgrounds.js: deze waardes zijn het CONTRACT. De
 * studio rendert hiertegen, het bestelformulier toont ze, de bevestigingsmail
 * herhaalt ze en de werkmap in /admin moet ze kunnen lezen. Vier plekken die
 * hetzelfde getal nodig hebben, is precies het aantal waarop een overgetypte
 * waarde uit elkaar gaat lopen.
 *
 * WAT HIER NIET STAAT: pixelmaten. Welke verhouding een beeld heeft is een keuze
 * van de klant; hoe groot het bestand is, is een eigenschap van onze productie en
 * die staat nog niet vast. Zelfde afweging als bij VIDEO_FORMAT in
 * videoExamples.js — een getal dat hier vandaag verzonnen wordt, staat morgen als
 * belofte op een pagina.
 */

/**
 * De verhoudingen die een catalogbestelling kan krijgen.
 *
 * DRIE, EN ELK MET EEN EIGEN TAAK. Vier zou de vraag traag maken en twee zou de
 * klassieke webshop-portret missen. De volgorde is de volgorde waarin ze op het
 * formulier staan, en die begint bij het vierkant omdat dat de enige is die
 * ALTIJD werkt: Amazon, bol en Zalando nemen hem op een hoofdafbeelding zonder
 * discussie, en een merk dat het niet weet, zit daar goed.
 */
export const CATALOG_RATIOS = [
  {
    id: 'square',
    ratio: '1x1',
    label: '1:1',
    css: '1 / 1',
    name: { en: 'Square', nl: 'Vierkant' },
    what: {
      en: 'Works everywhere. Amazon, bol and Zalando all accept it on a main image, and it is the safest choice if you are not sure.',
      nl: 'Werkt overal. Amazon, bol en Zalando accepteren hem op een hoofdafbeelding, en het is de veiligste keuze als je twijfelt.',
    },
  },
  {
    id: 'portrait45',
    ratio: '4x5',
    label: '4:5',
    css: '4 / 5',
    name: { en: 'Portrait 4:5', nl: 'Staand 4:5' },
    what: {
      en: 'The Shopify default and the tallest crop a feed will show without cutting. More of the product on the same screen width.',
      nl: 'De standaard van Shopify en de hoogste uitsnede die een feed toont zonder af te snijden. Meer product op dezelfde schermbreedte.',
    },
  },
  {
    id: 'portrait34',
    ratio: '3x4',
    label: '3:4',
    css: '3 / 4',
    name: { en: 'Portrait 3:4', nl: 'Staand 3:4' },
    what: {
      en: 'The classic webshop portrait. A little squarer than 4:5, and what most older shop themes are built around.',
      nl: 'Het klassieke webshop-portret. Iets vierkanter dan 4:5, en waar de meeste oudere shopthema\'s op gebouwd zijn.',
    },
  },
];

/**
 * En die van lifestyle.
 *
 * De drie van catalog blijven staan — een lifestylebeeld op een productpagina is
 * een gewone staande foto — met de breedbeeldvariant erbij, want dat is het geval
 * dat Lucas noemt: de banner. Die staat achteraan omdat hij de uitzondering is:
 * één van de drie beelden, niet alle drie.
 */
export const LIFESTYLE_RATIOS = [
  ...CATALOG_RATIOS,
  {
    id: 'wide',
    ratio: '16x9',
    label: '16:9',
    css: '16 / 9',
    name: { en: 'Wide 16:9', nl: 'Breed 16:9' },
    what: {
      en: 'A banner. A page header, an email header, a hero on a category page — anything that has to be wider than it is tall.',
      nl: 'Een banner. Een paginakop, een e-mailkop, een hero op een categoriepagina — alles wat breder moet zijn dan hoog.',
    },
  },
];

/** Waar een bestelling op staat als de klant niets kiest. Zie CATALOG_RATIOS[0]. */
export const DEFAULT_RATIO_ID = 'square';

/**
 * Mag deze dienst per beeld afwijken van de standaard?
 *
 * EEN FUNCTIE EN NIET EEN LIJSTJE OP DRIE PLEKKEN. Het formulier, de server en de
 * werkmap moeten alle drie hetzelfde antwoord geven; een `service === 'lifestyle'`
 * die op één van die drie ontbreekt, is een klant die per beeld kiest en een
 * studio die het nooit ziet.
 *
 * `complete` doet mee, en dat is met opzet: die bestelling is catalog ÉN lifestyle,
 * dus hij heeft de lifestyle-helft waar dit over gaat. Zie /start/complete.
 */
export function ratiosPerImage(service) {
  const s = ladderish(service);
  return s === 'lifestyle' || s === 'complete';
}

/** De verhoudingen die bij deze dienst horen. */
export function ratiosFor(service) {
  return ratiosPerImage(service) ? LIFESTYLE_RATIOS : CATALOG_RATIOS;
}

/** Eén verhouding opzoeken, of undefined. Altijd binnen de lijst van de dienst. */
export function ratioById(id, service) {
  return ratiosFor(service).find((r) => r.id === id);
}

/**
 * De verhouding die geldt, met de standaard eronder.
 *
 * `keuze` is wat de klant bij dit beeld heeft gezet ('' = niets, dus volg de
 * standaard). `standaard` is de keuze voor de hele bestelling. Onbekende waardes
 * vallen terug op DEFAULT_RATIO_ID in plaats van door te lekken: dit getal komt
 * uit een formulier en gaat naar de productie.
 */
export function effectiveRatio(keuze, standaard, service) {
  return ratioById(keuze, service)
    || ratioById(standaard, service)
    || ratioById(DEFAULT_RATIO_ID, service)
    || CATALOG_RATIOS[0];
}

/**
 * `ratio_p3_2` — de afwijking voor beeld 2 van product 3.
 *
 * Eén functie voor de veldnaam, zodat het formulier, /api/order en het adminpaneel
 * dezelfde sleutel gebruiken. Het patroon volgt `product_p3` en `extra_p3`, die er
 * al zijn — één woordenlijst voor de hele bestelling.
 */
export function ratioField(productKey, imageIndex) {
  return `ratio_${productKey}_${imageIndex}`;
}

/** Het omgekeerde: uit een sleutel het product en het beeldnummer halen, of null. */
export function parseRatioField(key) {
  const m = /^ratio_(p[1-9][0-9]?)_([1-9][0-9]?)$/.exec(String(key || ''));
  return m ? { product: m[1], image: Number.parseInt(m[2], 10) } : null;
}

/**
 * De laddernaam van een dienst, met de wire-waarde erbij.
 *
 * `drop` is wat /start/complete post; zonder deze vertaling zou ratiosPerImage()
 * daar false geven en zou de duurste bestelling op de site zijn lifestyle-helft
 * niet kunnen instellen. Dezelfde val als bij tierFor() en PAYABLE_SERVICES —
 * daar kostte hij een bestelling van € 2.359,50, dus hij staat hier expliciet.
 */
function ladderish(service) {
  const s = String(service || '').toLowerCase();
  return s === 'drop' ? 'complete' : s;
}
