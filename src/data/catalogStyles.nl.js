// VISUAILS — catalog style data (Dutch / NL). Localized copy of
// src/data/catalogStyles.js — same shape and exports, only the
// human-readable strings are translated. Order paths are prefixed with /nl.

import { perProduct, ladderFloor, euro, vatLabel, RESOLUTIE } from './pricing.js';
import { siteStijlen, inLaunch } from './launchset.js';

// No euro figure and no delivery time may be typed into this file.
// Both used to live here as literals, which is how the hub cards and the
// [slug] pages ended up quoting a turnaround the capacity gate had never
// cleared — and how a video price that exists nowhere in pricing.js
// survived a repricing nobody caught. Derive, never type.
const CAT = perProduct('catalog', 'nl');
// The rate is a LADDER now, not a flat fee, so a bare figure on a style card
// would read as the price at any count when it is only the price at one to
// four. Every card prints the entry rung with "from" and a VAT label — the
// same shape /catalog’s own rung table uses, so the card and the table cannot
// disagree.
/* Zie catalogStyles.js: sinds 12 oktober 2026 de onderste trede (v9-vanaf a). */
const CAT_FROM = `vanaf ${euro(ladderFloor('catalog'), 'nl')}`;
const CAT_VAT = vatLabel('excl', 'nl');
/* De kaart op /catalog (naloop A2, 8 okt 2026): "vanaf" is overal de onderste
   trede, net als op /start, /lifestyle en de voorpagina; de uitlegregel bij de
   prijsband zegt wat één product kost (eenProductRegel() in pricing.js). */
const CAT_KAART = `Vanaf ${euro(ladderFloor('catalog'), 'nl')} / product · ${CAT_VAT}`;
/* Levertijd en controle staan in de feitenrij van de detailpagina, niet
   meer ook in "Wat je krijgt" (29 september 2026: twee keer dezelfde zin). */

function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

/* De volledige lijst en wat er op de site staat (levering 70, 5 november 2026):
   zie de noot bij `alleStyles` in styles.js. */
export const alleCatalogStyles = [
  {
    slug: 'classic',
    /* Bij de launch (vraag 7 = ja): ghost mannequin, en on-model stil en in de
       lens. Zie de noot in catalogStyles.js. */
    bijLaunch: {
      tagline: 'Ghost mannequin, en één foto op een model dat in de lens kijkt.',
      kort: {
        kleding: 'Je hele assortiment in één keer, van T-shirts tot jassen, tassen en petten.',
        gevoel: 'Strak en gelijk: een ghost mannequin, hetzelfde licht en dezelfde hoek voor elk product.',
        kanalen: 'Je webshop, en marktplaatsen zoals Amazon en bol.com.',
      },
      fotos: ['/img/catalog-classic-01.webp', '/img/catalog-classic-02.webp'],
      cardDesc: 'Een complete set per product: voorkant, achterkant en detail op een ghost mannequin, en één foto op een model dat stilstaat en in de lens kijkt.',
      moodParagraphs: [
        'Het product op een onzichtbare paspop, zodat je de vorm ziet zonder lichaam. Daarna één keer op een model dat stilstaat en recht in de lens kijkt.',
      ],
      whatYouGet: [
        'Vanaf vier foto’s per product: voorkant, achterkant en detail op een ghost mannequin & on-model',
        'Consistente belichting, hoek en achtergrond',
        `Bestanden op ${RESOLUTIE.standaard} px, klaar voor de marktplaatsen`,
      ],
    },
    name: 'Classic',
    tagline: 'Elk product in dezelfde strakke stijl.',
    /* De lookpagina, kort (k101, 11 oktober 2026): drie korte regels onder
       vaste koppen — voor welke kleding, welk gevoel, welke kanalen. */
    kort: {
      kleding: 'Je hele assortiment in één keer, van T-shirts tot jassen, tassen en petten.',
      gevoel: 'Strak en gelijk: hetzelfde licht en dezelfde hoek voor elk product.',
      kanalen: 'Je webshop, en marktplaatsen zoals Amazon en bol.com.',
    },
    /* De echte beelden van deze look, het eerste groot bovenaan (k101). Leeg =
       geen beeldblokken; nooit een grijs vlak. */
    fotos: ['/img/catalog-raster.webp', '/img/catalog-after.webp'],
    priceTrust: CAT_FROM,
    priceUnit: ' / product',
    metaPrice: `${CAT_FROM} / product — vanaf 4 foto’s`,
    /* ── WAAR DEZE KNOP HEEN GAAT — 21 augustus 2026 ──────────────────────
       Hier stond `/start`, de keuzepagina. Een knop die "Order Classic" zegt en
       je vervolgens vraagt WAT we gaan maken, heeft de vraag gesteld die je net
       beantwoord hebt. Classic IS de standaard catalogset, dus gaat hij naar het
       formulier zelf. Zie src/data/orderDoors.js voor de hele redenering. */
    orderHref: '/nl/start/catalog/',
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: CAT_KAART,
    cardDesc: 'Een complete set per product — voorkant, achterkant, detail en één on-model shot.',
    moodTitle: 'Hoe Classic eruitziet.',
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
      { title: 'Een hoeksysteem, geen losse hoek', body: 'Vaste camerageometrie, zodat een nieuw product precies naast een oud past.' },
      { title: 'Kleur trouw aan het product', body: 'Wit blijft wit, je merkkleur blijft kloppen.' },
      { title: 'Eén verhouding per bestelling', body: 'Je kiest één beeldverhouding per bestelling. Je krijgt elk beeld als JPG; PNG of WebP erbij vraag je aan bij je bestelling in VISUAILS Studio.' },
    ],
    why: [
      { title: 'Marktplaats-proof', body: 'Packshots voldoen aan de beeldregels van Amazon, bol en Zalando. Zalando vraagt daarnaast echte modelfoto\u2019s, dus we kunnen niet beloven dat Zalando onze on-model shot accepteert.' },
      { title: 'Klaar voor bijbestellen', body: 'Een nieuw product schuift zo in de bestaande set, zonder zichtbare naad.' },
      { title: 'Geen art direction nodig', body: 'Stuur een foto, ontvang hetzelfde doordachte kader terug.' },
    ],
    bestFor: [
      'Webshops die staan of vallen met een strak grid',
      'Marktplaatsverkopers met strikte beeldregels',
      'Merken die een hele reeks in één keer fotograferen',
      'Bijbestellingen — nieuwe producten die perfect bij oude sets passen',
    ],
    whatYouGet: [
      'Vanaf vier foto’s per product: voorkant, achterkant, detail & on-model',
      'Consistente belichting, hoek en achtergrond',
      `Bestanden op ${RESOLUTIE.standaard} px, klaar voor de marktplaatsen`,
    ],
  },
  /* CASUAL — levering 70, 5 november 2026. Zie de noot in catalogStyles.js. */
  {
    slug: 'casual',
    opSite: 'launch',   // pas op de site met de launchset; na de launch mag deze regel weg
    name: 'Casual',
    tagline: 'Flat lay, en één losse foto op een model.',
    kort: {
      kleding: 'T-shirts, hoodies, denim en alles wat je elke dag draagt.',
      gevoel: 'Plat van bovenaf, en één keer op een model in een losse houding.',
      kanalen: 'Je webshop, Instagram en marktplaatsen zoals bol.com.',
    },
    fotos: ['/img/catalog-casual-01.webp', '/img/catalog-casual-02.webp'],
    priceTrust: CAT_FROM,
    priceUnit: ' / product',
    metaPrice: `${CAT_FROM} / product — vanaf 4 foto’s`,
    orderHref: '/nl/start/catalog/',
    heroIcon: 'jar',
    heroWidth: '26%',
    cardIcon: 'jar',
    cardWidth: '42%',
    cardPrice: CAT_KAART,
    cardDesc: 'Een complete set per product: voorkant, achterkant en detail als flat lay, en één losse foto op een model.',
    moodTitle: 'Hoe Casual eruitziet.',
    moodParagraphs: [
      'Het product plat neergelegd en van bovenaf gezien, zoals je het zelf zou uitleggen. Daarna één keer op een model dat ontspannen staat.',
    ],
    steps: [
      { title: 'Leg het neer', body: 'Voorkant, achterkant en detail plat neergelegd, recht van bovenaf.' },
      { title: 'Houd het echt', body: 'Plooien en stof blijven zoals ze zijn, zonder stijve, gestreken look.' },
      { title: 'Eén keer gedragen', body: 'Eén foto op een model in een losse houding, stilstaand.' },
    ],
    grid: grid(
      [],
      ['jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar']
    ),
    craft: [
      { title: 'Recht van bovenaf', body: 'Eén vaste camerahoogte en hoek, zodat elke flat lay in je grid op één lijn ligt.' },
      { title: 'Zacht, gelijkmatig licht', body: 'Geen harde schaduw onder het product, alleen een lichte die diepte geeft.' },
      { title: 'Een losse houding', body: 'Handen in de zakken, gewicht op één been: het model staat stil, maar niet stijf.' },
      { title: 'Eén verhouding per bestelling', body: 'Je kiest één beeldverhouding per bestelling. Je krijgt elk beeld als JPG; PNG of WebP erbij vraag je aan bij je bestelling in VISUAILS Studio.' },
    ],
    why: [
      { title: 'Gemaakt voor kleding van elke dag', body: 'Een flat lay laat de snit en de print van een T-shirt of hoodie in één blik zien.' },
      { title: 'Klaar voor bijbestellen', body: 'Nieuwe producten passen in de set, in hetzelfde licht en vanaf dezelfde hoogte.' },
      { title: 'Dezelfde prijs als Classic', body: 'Je kiest de stijl die bij je product past; de prijs per product is gelijk.' },
    ],
    bestFor: [
      'Streetwear en basics',
      'Webshops met veel kleding voor elke dag',
      'Merken die verkopen via Instagram',
      'Bijbestellingen van hetzelfde assortiment',
    ],
    whatYouGet: [
      'Vanaf vier foto’s per product: voorkant, achterkant en detail als flat lay & on-model',
      'Consistent licht, hoogte en achtergrond',
      `Bestanden op ${RESOLUTIE.standaard} px, klaar voor de marktplaatsen`,
    ],
  },
  {
    slug: 'custom',
    name: 'Eigen look',
    tagline: 'Een catalog-look die onmiskenbaar van jou is.',
    /* De lookpagina, kort (k101, 11 oktober 2026): drie korte regels onder
       vaste koppen — voor welke kleding, welk gevoel, welke kanalen. */
    kort: {
      kleding: 'Assortimenten waar herkenning belangrijker is dan neutraliteit.',
      gevoel: 'Een achtergrond, schaduw en props die zeggen: dit zijn wij, nog vóór het logo.',
      kanalen: 'Je eigen webshop, waar je look je etalage is.',
    },
    /* De echte beelden van deze look, het eerste groot bovenaan (k101). Leeg =
       geen beeldblokken; nooit een grijs vlak. */
    fotos: [],
    /* Op aanvraag, zoals de eigen look op /catalog en /lifestyle (v9-vanaf a). */
    priceTrust: 'Op aanvraag',
    priceUnit: '',
    metaPrice: 'Eén keer ontworpen, op aanvraag',
    /* ?voor=catalog — zie catalogStyles.js (doorloop 27, B16). */
    orderHref: '/nl/start/custom-look/?voor=catalog',
    orderLabel: 'Vraag een eigen look aan',
    heroIcon: 'bag',
    heroWidth: '26%',
    cardIcon: 'bag',
    cardWidth: '46%',
    cardPrice: 'Prijs op maat',
    cardDesc: 'Een catalog-look ontworpen rond jouw merk — daarna elk product als set van vier foto’s, vanaf het gewone tarief.',
    moodTitle: 'Hoe een eigen look eruitziet.',
    moodParagraphs: [
      'Een kenmerkende achtergrond, schaduw en propstijl die zeggen: dit zijn wij — nog voordat het logo dat doet.',
    ],
    steps: [
      { title: 'Bepaal', body: 'Je palet, props en kadrering, vastgelegd als één gedocumenteerde stijl.' },
      { title: 'Bewijs', body: 'Eerste producten gefotografeerd volgens die stijl, samen met jou gecontroleerd.' },
      { title: 'Herhaal', body: 'Elk nieuw product volgt automatisch dezelfde regels.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Een ontwerpsessie, geen template', body: 'Je merk, referenties en concurrenten om te vermijden — één correctieronde op het ontwerp, daarna ligt het vast.' },
      { title: 'Een uitgeschreven stijlsysteem', body: 'Regels voor achtergrond, schaduw en props, gedocumenteerd zodat product 100 bij product 1 past.' },
      { title: 'In eigendom, niet gehuurd', body: 'De stijl die we bouwen is van jou — we verkopen hem niet door.' },
      { title: 'Daarna voor altijd snel', body: 'Nieuwe producten lopen er doorheen tegen normale catalogus-snelheid en -prijs.' },
    ],
    why: [
      { title: 'Onmiskenbaar van jou', body: 'Props, kleur en kadrering die concurrenten niet kunnen kopiëren.' },
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
      'Een catalogstijl op maat, samen met jou ontworpen',
      'Gedocumenteerde regels voor perfecte herhaalbaarheid',
      'Exclusiviteit — jouw look blijft van jou',
      'Eén ontwerpbedrag, daarna vanaf het gewone tarief per product',
    ],
  },
];

/** Wat een bezoeker ziet: de lijst door de schakelaar (src/data/launchset.js). */
export const catalogStyles = siteStijlen(alleCatalogStyles);

/* Uit de volledige lijst: een herbestelling van een stijl die even van de site is. */
export function getCatalogStyle(slug) {
  const s = alleCatalogStyles.find((x) => x.slug === slug);
  return s ? inLaunch(s) : s;
}
