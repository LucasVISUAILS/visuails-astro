// VISUAILS — catalog style data, ported verbatim from the SvelteKit rebuild
// ($lib/data/catalogStyles.js). Drives both the /catalog hub cards
// (src/pages/catalog/index.astro) and the /catalog/[slug] template
// (src/pages/catalog/[slug].astro) so every style page is one shared data
// source, same pattern as src/data/styles.js (lifestyle).
//
// Neither source page used a real background-image on its `.vis` elements
// (both media band and grid render the SVG placeholder icon only), so —
// unlike the lifestyle styles — there is no `heroPhoto` / `cardPhoto` here.
// Icon fields drive ProductScene's placeholder rendering directly.

import { perProduct, ladderFloor, euro, vatLabel, RESOLUTIE } from './pricing.js';
import { siteStijlen, inLaunch } from './launchset.js';

// No euro figure and no delivery time may be typed into this file.
// Both used to live here as literals, which is how the hub cards and the
// [slug] pages ended up quoting a turnaround the capacity gate had never
// cleared — and how a video price that exists nowhere in pricing.js
// survived a repricing nobody caught. Derive, never type.
const CAT = perProduct('catalog', 'en');
// The rate is a LADDER now, not a flat fee, so a bare figure on a style card
// would read as the price at any count when it is only the price at one to
// four. Every card prints the bottom rung with "from" and a VAT label — the
// same shape /catalog's own rung table uses, so the card and the table cannot
// disagree.
/* Sinds 12 oktober 2026 (afvinklijst 9, v9-vanaf a) ook hier de onderste trede:
   "vanaf" is op de hele site het laagste tarief, zoals CAT_KAART hieronder. Hier stond
   ladderRate('catalog', 1), het tarief van één product. */
const CAT_FROM = `from ${euro(ladderFloor('catalog'), 'en')}`;
const CAT_VAT = vatLabel('excl', 'en');
/* De kaart op /catalog (naloop A2, 8 okt 2026): "vanaf" is overal de onderste
   trede, net als op /start, /lifestyle en de voorpagina; de uitlegregel bij de
   prijsband zegt wat één product kost (eenProductRegel() in pricing.js). */
const CAT_KAART = `From ${euro(ladderFloor('catalog'), 'en')} / product · ${CAT_VAT}`;
/* Levertijd en controle staan in de feitenrij van de detailpagina, niet
   meer ook in "Wat je krijgt" (29 september 2026: twee keer dezelfde zin). */

// grid: the 3x3 product-scene grid on each style page. Mirrors the helper in
// src/data/styles.js — `photos` stays empty for catalog since the source
// pages never wired real images into the grid.
function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

/* De volledige lijst en wat er op de site staat (levering 70, 5 november 2026):
   zie de noot bij `alleStyles` in styles.js. */
export const alleCatalogStyles = [
  {
    slug: 'classic',
    /* Bij de launch (launchschema 22 oktober, vraag 7 = ja): ghost mannequin, en
       on-model stil en in de lens. Tot de schakelaar aan gaat, blijft de tekst
       hieronder. Na de launch: deze velden in de stijl zelf zetten. */
    bijLaunch: {
      tagline: 'Ghost mannequin, and one shot on a model looking into the lens.',
      kort: {
        kleding: 'Your whole range in one go, from T-shirts to jackets, bags and caps.',
        gevoel: 'Clean and consistent: a ghost mannequin, the same light and angle for every product.',
        kanalen: 'Your webshop, and marketplaces such as Amazon and bol.com.',
      },
      fotos: ['/img/catalog-classic-01.webp', '/img/catalog-classic-02.webp'],
      cardDesc: 'A full set per product: front, back and detail on a ghost mannequin, and one shot on a model who stands still and looks into the lens.',
      moodParagraphs: [
        'The product on an invisible mannequin, so you see its shape without a body. Then once on a model who stands still and looks straight into the lens.',
      ],
      whatYouGet: [
        'From four photos per product: front, back and detail on a ghost mannequin & on-model',
        'Consistent lighting, angle and background',
        `${RESOLUTIE.standaard} px, marketplace-ready files`,
      ],
    },
    name: 'Classic',
    tagline: 'Every product in the same clean style.',
    /* De lookpagina, kort (k101, 11 oktober 2026): drie korte regels onder
       vaste koppen — voor welke kleding, welk gevoel, welke kanalen. */
    kort: {
      kleding: 'Your whole range in one go, from T-shirts to jackets, bags and caps.',
      gevoel: 'Clean and consistent: the same light and angle for every product.',
      kanalen: 'Your webshop, and marketplaces such as Amazon and bol.com.',
    },
    /* De echte beelden van deze look, het eerste groot bovenaan (k101). Leeg =
       geen beeldblokken; nooit een grijs vlak. */
    fotos: ['/img/catalog-raster.webp', '/img/catalog-after.webp'],
    priceTrust: CAT_FROM,
    priceUnit: ' / product',
    metaPrice: `${CAT_FROM} / product ${CAT_VAT} — from 4 photos`,
    /* ── WAAR DEZE KNOP HEEN GAAT — 21 augustus 2026 ──────────────────────
       Hier stond `/start`, de keuzepagina. Een knop die "Order Classic" zegt en
       je vervolgens vraagt WAT we gaan maken, heeft de vraag gesteld die je net
       beantwoord hebt. Classic IS de standaard catalogset, dus gaat hij naar het
       formulier zelf. Zie src/data/orderDoors.js voor de hele redenering. */
    orderHref: '/start/catalog/',
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: CAT_KAART,
    cardDesc: 'A full set per product — front, back, detail and one on-model shot.',
    moodTitle: 'What Classic feels like.',
    moodParagraphs: [
      'Pure, even light and a frame that never moves — every product shot as if in the same studio, on the same morning.',
    ],
    steps: [
      { title: 'Frame', body: 'The same angle and crop, locked per product type.' },
      { title: 'Light', body: 'One soft, even studio setup, repeated exactly.' },
      { title: 'Match', body: 'Every new product measured against the last.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'A locked lighting recipe', body: 'One softbox setup, codified — not a call made shot by shot.' },
      { title: 'An angle system, not an angle', body: 'Fixed camera geometry, so new products sit flush beside old ones.' },
      { title: 'Colour held to the product', body: 'Whites stay white, your brand colour stays true.' },
      { title: 'One ratio per order', body: 'You pick one aspect ratio per order. Every image comes as JPG; need PNG or WebP as well, request it on the order in VISUAILS Studio.' },
    ],
    why: [
      { title: 'Marketplace-proof', body: 'Packshots meet the image rules of Amazon, bol.com and Zalando. Zalando also asks for real model photos, so we cannot promise it will accept our on-model shot.' },
      { title: 'Restock-ready', body: 'New products slot into the set without a visible seam.' },
      { title: 'Zero art direction needed', body: 'Send a photo, get back the same considered frame.' },
    ],
    bestFor: [
      'Webshops that live or die by a clean grid',
      'Marketplace sellers with strict image rules',
      'Brands photographing a whole range in one go',
      'Restocks — new products matching old sets, perfectly',
    ],
    whatYouGet: [
      'From four photos per product: front, back, detail & on-model',
      'Consistent lighting, angle and background',
      `${RESOLUTIE.standaard} px, marketplace-ready files`,
    ],
  },
  /* ── CASUAL — levering 70, 5 november 2026 ─────────────────────────────────
     Uit het launchschema (overzicht §30.2) en vraag 6 = a: voorkant, achterkant en
     detail als flat lay, plus één stilstaand beeld op model met een losse houding.
     Zelfde prijs als Classic (de ladder van catalog). Staat pas op de site met de
     launchset; de beelden komen van Lucas (kladblok/PLAN-70-LAUNCHSET.md). */
  {
    slug: 'casual',
    opSite: 'launch',   // pas op de site met de launchset; na de launch mag deze regel weg
    name: 'Casual',
    tagline: 'Flat lay, and one relaxed shot on a model.',
    kort: {
      kleding: 'T-shirts, hoodies, denim and everything worn every day.',
      gevoel: 'Laid flat from above, then once on a model in a relaxed pose.',
      kanalen: 'Your webshop, Instagram and marketplaces such as bol.com.',
    },
    fotos: ['/img/catalog-casual-01.webp', '/img/catalog-casual-02.webp'],
    priceTrust: CAT_FROM,
    priceUnit: ' / product',
    metaPrice: `${CAT_FROM} / product ${CAT_VAT} — from 4 photos`,
    orderHref: '/start/catalog/',
    heroIcon: 'jar',
    heroWidth: '26%',
    cardIcon: 'jar',
    cardWidth: '42%',
    cardPrice: CAT_KAART,
    cardDesc: 'A full set per product: front, back and detail as a flat lay, and one relaxed shot on a model.',
    moodTitle: 'What Casual feels like.',
    moodParagraphs: [
      'The product laid flat and seen from above, the way you would lay it out yourself. Then once on a model who stands at ease.',
    ],
    steps: [
      { title: 'Lay it out', body: 'Front, back and detail laid flat, seen from straight above.' },
      { title: 'Keep it real', body: 'Folds and fabric stay as they are, without a stiff, ironed look.' },
      { title: 'Wear it once', body: 'One shot on a model in a relaxed pose, standing still.' },
    ],
    grid: grid(
      [],
      ['jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar']
    ),
    craft: [
      { title: 'Straight from above', body: 'One fixed camera height and angle, so every flat lay lines up in your grid.' },
      { title: 'Soft, even light', body: 'No hard shadows under the product, only a faint one that gives it depth.' },
      { title: 'A relaxed pose', body: 'Hands in pockets, weight on one leg: the model stands still, but not stiff.' },
      { title: 'One ratio per order', body: 'You pick one aspect ratio per order. Every image comes as JPG; need PNG or WebP as well, request it on the order in VISUAILS Studio.' },
    ],
    why: [
      { title: 'Made for everyday clothing', body: 'A flat lay shows the cut and the print of a T-shirt or a hoodie at a glance.' },
      { title: 'Restock-ready', body: 'New products slot into the set in the same light and from the same height.' },
      { title: 'The same price as Classic', body: 'You pick the style that suits your product; the price per product is the same.' },
    ],
    bestFor: [
      'Streetwear and basics',
      'Webshops with a lot of everyday pieces',
      'Brands that sell on Instagram',
      'Restocks of the same range',
    ],
    whatYouGet: [
      'From four photos per product: front, back and detail as a flat lay & on-model',
      'Consistent light, height and background',
      `${RESOLUTIE.standaard} px, marketplace-ready files`,
    ],
  },
  {
    slug: 'custom',
    name: 'Custom Brand',
    tagline: 'A catalog look that is unmistakably yours.',
    /* De lookpagina, kort (k101, 11 oktober 2026): drie korte regels onder
       vaste koppen — voor welke kleding, welk gevoel, welke kanalen. */
    kort: {
      kleding: 'Ranges where recognition matters more than neutrality.',
      gevoel: 'A backdrop, shadow and props that say this is us, before the logo does.',
      kanalen: 'Your own shop, where your look is your storefront.',
    },
    /* De echte beelden van deze look, het eerste groot bovenaan (k101). Leeg =
       geen beeldblokken; nooit een grijs vlak. */
    fotos: [],
    /* Op aanvraag, zoals de eigen look op /catalog en /lifestyle (v9-vanaf a). */
    priceTrust: 'On request',
    priceUnit: '',
    metaPrice: 'Designed once, on request',
    /* Custom Brand heeft geen tarief per product tot de look ontworpen is —
       zie `cardPrice: 'Custom pricing'` hierboven. Een knop naar het gewone
       bestelformulier zou een prijs beloven die er nog niet is, dus gaat hij
       naar dezelfde aanvraag als een look op maat bij Lifestyle. */
    /* ?voor=catalog: het aanvraagformulier zet "Waar moet de look te gebruiken
       zijn?" dan op Catalogsets (doorloop 27, B16; interactions.js). */
    orderHref: '/start/custom-look/?voor=catalog',
    orderLabel: 'Ask for a Custom Brand look',
    heroIcon: 'bag',
    heroWidth: '26%',
    cardIcon: 'bag',
    cardWidth: '46%',
    cardPrice: 'Custom pricing',
    cardDesc: 'A catalog look designed around your brand — then every product as a four-photo set, from the regular rate.',
    moodTitle: 'What Custom Brand feels like.',
    moodParagraphs: [
      'A signature backdrop, shadow and prop language that says this is us — before the logo does.',
    ],
    steps: [
      { title: 'Define', body: 'Your palette, props and framing, set as one documented style.' },
      { title: 'Prove', body: 'First products shot against that style, checked with you.' },
      { title: 'Repeat', body: 'Every new product follows the same rules automatically.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'A design session, not a template', body: 'Your brand, references and competitors to avoid — one correction round on the design, then it is locked.' },
      { title: 'A written style system', body: 'Backdrop, shadow and prop rules, documented so product 100 matches product 1.' },
      { title: 'Owned, not rented', body: "The style we build is yours — we don’t resell it." },
      { title: 'Fast forever after', body: 'New products flow through it at normal catalog speed and price.' },
    ],
    why: [
      { title: 'Unmistakably yours', body: "Props, colour and framing competitors can’t copy." },
      { title: 'Documented, not remembered', body: 'Written down, so it never drifts between orders.' },
      { title: 'Fast after the first order', body: 'Design happens once; every order after runs at normal speed.' },
    ],
    bestFor: [
      'Brands whose shop is their storefront and their stage',
      'Founders tired of looking like every other seller',
      'Ranges where recognition matters more than neutrality',
      'Teams planning years of product drops',
    ],
    whatYouGet: [
      'A custom catalog style, designed with you',
      'Documented rules for perfect repeatability',
      'Exclusivity — your look stays yours',
      'One design fee, then from the normal per-product rate',
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
