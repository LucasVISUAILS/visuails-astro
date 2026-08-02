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

import { perProduct, reviewClaim, turnaround, ladderRate, euro, vatLabel } from './pricing.js';

// No euro figure and no delivery time may be typed into this file.
// Both used to live here as literals, which is how the hub cards and the
// [slug] pages ended up quoting a turnaround the capacity gate had never
// cleared — and how a video price that exists nowhere in pricing.js
// survived a repricing nobody caught. Derive, never type.
const CAT = perProduct('catalog', 'en');
// The rate is a LADDER now, not a flat fee, so a bare figure on a style card
// would read as the price at any count when it is only the price at one to
// four. Every card prints the entry rung with "from" and a VAT label — the
// same shape /catalog's own rung table uses, so the card and the table cannot
// disagree.
const CAT_FROM = `from ${euro(ladderRate('catalog', 1), 'en')}`;
const CAT_VAT = vatLabel('excl', 'en');
const TIMING = turnaround('unattended', 'en');
const REVIEW = reviewClaim('unattended', 'en');

// grid: the 3x3 product-scene grid on each style page. Mirrors the helper in
// src/data/styles.js — `photos` stays empty for catalog since the source
// pages never wired real images into the grid.
function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const catalogStyles = [
  {
    slug: 'classic',
    name: 'Classic',
    tagline: 'Clean. Consistent. Relentlessly so.',
    priceTrust: CAT_FROM,
    priceUnit: ' / product',
    metaPrice: `${CAT_FROM} / product ${CAT_VAT} — 4 photos`,
    orderHref: '/start',
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: `${CAT_FROM} / product ${CAT_VAT}`,
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
      { title: 'Crops for every channel', body: 'One set of crops works for shop, Amazon, Bol and ads.' },
    ],
    why: [
      { title: 'Marketplace-proof', body: 'Meets the strict image rules of Amazon, Bol, Zalando and more.' },
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
      'Four photos per product: front, back, detail & on-model',
      'Consistent lighting, angle and background',
      'High-resolution, marketplace-ready files',
      TIMING,
      REVIEW,
    ],
  },
  {
    slug: 'custom',
    name: 'Custom Brand',
    tagline: 'A catalog look that is unmistakably yours.',
    priceTrust: `Designed once — then ${CAT_FROM} / product`,
    priceUnit: '',
    metaPrice: `Designed once — then ${CAT_FROM} / product`,
    orderHref: '/start',
    heroIcon: 'bag',
    heroWidth: '26%',
    cardIcon: 'bag',
    cardWidth: '46%',
    cardPrice: 'Custom pricing',
    cardDesc: `A catalog look designed around your brand — then every product at ${CAT_FROM} for a four-photo set.`,
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
      { title: 'A design session, not a template', body: 'Your brand, references and competitors to avoid — one round, then locked.' },
      { title: 'A written style system', body: 'Backdrop, shadow and prop rules, documented so product 100 matches product 1.' },
      { title: 'Owned, not rented', body: "The style we build is yours — we don't resell it." },
      { title: 'Fast forever after', body: 'New products flow through it at normal catalog speed and price.' },
    ],
    why: [
      { title: 'Unmistakably yours', body: "Props, colour and framing competitors can't copy." },
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
      'Normal per-product pricing after the first order',
    ],
  },
];

export function getCatalogStyle(slug) {
  return catalogStyles.find((s) => s.slug === slug);
}
