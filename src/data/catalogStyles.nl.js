// VISUAILS — catalog style data (Dutch / NL). Localized copy of
// src/data/catalogStyles.js — same shape and exports, only the
// human-readable strings are translated. Order paths are prefixed with /nl.

import { perProduct, reviewClaim, turnaround, ladderRate, euro, vatLabel } from './pricing.js';

// No euro figure and no delivery time may be typed into this file.
// Both used to live here as literals, which is how the hub cards and the
// [slug] pages ended up quoting a turnaround the capacity gate had never
// cleared — and how a video price that exists nowhere in pricing.js
// survived a repricing nobody caught. Derive, never type.
const CAT = perProduct('catalog', 'nl');
// The rate is a LADDER now, not a flat fee, so a bare figure on a style card
// would read as the price at any count when it is only the price at one to
// four. Every card prints the entry rung with "from" and a VAT label — the
// same shape /catalog's own rung table uses, so the card and the table cannot
// disagree.
const CAT_FROM = `vanaf ${euro(ladderRate('catalog', 1), 'nl')}`;
const CAT_VAT = vatLabel('excl', 'nl');
const TIMING = turnaround('unattended', 'nl');
const REVIEW = reviewClaim('unattended', 'nl');

function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const catalogStyles = [
  {
    slug: 'classic',
    name: 'Classic',
    tagline: 'Strak. Consistent. Zonder concessies.',
    priceTrust: CAT_FROM,
    priceUnit: ' / product',
    metaPrice: `${CAT_FROM} / product — 4 foto's`,
    orderHref: '/nl/start',
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: `${CAT_FROM} / product ${CAT_VAT}`,
    cardDesc: 'Een complete set per product — voorkant, achterkant, detail en één on-model shot.',
    moodTitle: 'Hoe Classic voelt.',
    moodParagraphs: [
      'Puur, gelijkmatig licht en een kader dat nooit verschuift — elk product gefotografeerd alsof het in dezelfde studio was, op dezelfde ochtend.',
    ],
    steps: [
      { title: 'Kader', body: 'Dezelfde hoek en uitsnede, vastgezet per producttype.' },
      { title: 'Licht', body: 'Eén zachte, gelijkmatige studio-opstelling, exact herhaald.' },
      { title: 'Match', body: 'Elk nieuw product afgestemd op het vorige.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Een vastgezet lichtrecept', body: 'Eén softbox-opstelling, vastgelegd — geen keuze die per shot opnieuw wordt gemaakt.' },
      { title: 'Een hoeksysteem, geen losse hoek', body: 'Vaste camerageometrie, zodat nieuwe producten naadloos naast oude passen.' },
      { title: 'Kleur trouw aan het product', body: 'Wit blijft wit, je merkkleur blijft kloppen.' },
      { title: 'Uitsnedes voor elk kanaal', body: 'Eén set uitsnedes werkt voor je shop, Amazon, Bol en advertenties.' },
    ],
    why: [
      { title: 'Marktplaats-proof', body: 'Voldoet aan de strikte beeldregels van Amazon, Bol, Zalando en meer.' },
      { title: 'Klaar voor bijbestellen', body: 'Nieuwe producten passen naadloos in de set, zonder zichtbare naad.' },
      { title: 'Geen art direction nodig', body: 'Stuur een foto, ontvang hetzelfde doordachte kader terug.' },
    ],
    bestFor: [
      'Webshops die staan of vallen met een strak grid',
      'Marktplaatsverkopers met strikte beeldregels',
      'Merken die een hele reeks in één keer fotograferen',
      'Bijbestellingen — nieuwe producten die perfect bij oude sets passen',
    ],
    whatYouGet: [
      'Vier foto\'s per product: voorkant, achterkant, detail & on-model',
      'Consistente belichting, hoek en achtergrond',
      'Hoge-resolutie, marktplaats-klare bestanden',
      TIMING,
      REVIEW,
    ],
  },
  {
    slug: 'custom',
    name: 'Eigen merk',
    tagline: 'Een catalogus-look die onmiskenbaar van jou is.',
    priceTrust: `Eén keer ontworpen — daarna ${CAT_FROM} / product`,
    priceUnit: '',
    metaPrice: `Eén keer ontworpen — daarna ${CAT_FROM} / product`,
    orderHref: '/nl/start',
    heroIcon: 'bag',
    heroWidth: '26%',
    cardIcon: 'bag',
    cardWidth: '46%',
    cardPrice: 'Prijs op maat',
    cardDesc: `Een catalogus-look ontworpen rond jouw merk — daarna elk product voor ${CAT_FROM} per set van vier foto's.`,
    moodTitle: 'Hoe Eigen merk voelt.',
    moodParagraphs: [
      'Een kenmerkende achtergrond, schaduw en propstijl die zeggen: dit zijn wij — nog voordat het logo dat doet.',
    ],
    steps: [
      { title: 'Bepaal', body: 'Je palet, props en kadering, vastgelegd als één gedocumenteerde stijl.' },
      { title: 'Bewijs', body: 'Eerste producten gefotografeerd volgens die stijl, samen met jou gecontroleerd.' },
      { title: 'Herhaal', body: 'Elk nieuw product volgt automatisch dezelfde regels.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Een ontwerpsessie, geen template', body: 'Je merk, referenties en concurrenten om te vermijden — één ronde, daarna vastgezet.' },
      { title: 'Een uitgeschreven stijlsysteem', body: 'Regels voor achtergrond, schaduw en props, gedocumenteerd zodat product 100 bij product 1 past.' },
      { title: 'In eigendom, niet gehuurd', body: 'De stijl die we bouwen is van jou — we verkopen hem niet door.' },
      { title: 'Daarna voor altijd snel', body: 'Nieuwe producten lopen er doorheen tegen normale catalogus-snelheid en -prijs.' },
    ],
    why: [
      { title: 'Onmiskenbaar van jou', body: 'Props, kleur en kadering die concurrenten niet kunnen kopiëren.' },
      { title: 'Gedocumenteerd, niet onthouden', body: 'Vastgelegd, zodat het nooit afwijkt tussen bestellingen.' },
      { title: 'Snel na de eerste bestelling', body: 'Ontwerpen gebeurt één keer; elke bestelling daarna loopt op normale snelheid.' },
    ],
    bestFor: [
      'Merken voor wie de shop zowel etalage als podium is',
      'Ondernemers die het beu zijn om op elke andere verkoper te lijken',
      'Assortimenten waar herkenning belangrijker is dan neutraliteit',
      'Teams die jaren aan productdrops plannen',
    ],
    whatYouGet: [
      'Een catalogusstijl op maat, samen met jou ontworpen',
      'Gedocumenteerde regels voor perfecte herhaalbaarheid',
      'Exclusiviteit — jouw look blijft van jou',
      'Normale prijs per product na de eerste bestelling',
    ],
  },
];

export function getCatalogStyle(slug) {
  return catalogStyles.find((s) => s.slug === slug);
}
