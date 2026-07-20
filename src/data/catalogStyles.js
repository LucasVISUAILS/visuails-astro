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
    priceTrust: '€19',
    metaPrice: 'From €19 / visual',
    orderHref: '/order-catalog',
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: 'From €19 / visual',
    cardDesc: 'Clean, grid-ready visuals. Same lighting, angle, background — every time. From €19/visual.',
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
      'Consistent lighting, angle and background',
      'Pure white or neutral studio backdrop',
      'High-resolution, marketplace-ready files',
      'Delivery in ~24 hours, checked by hand',
    ],
  },
  {
    slug: 'custom',
    name: 'Custom Brand',
    tagline: 'A catalog look that is unmistakably yours.',
    priceTrust: 'Designed once — then from €19',
    metaPrice: 'Designed once — then from €19 / visual',
    orderHref: '/order-custom',
    heroIcon: 'bag',
    heroWidth: '26%',
    cardIcon: 'bag',
    cardWidth: '46%',
    cardPrice: 'Custom pricing',
    cardDesc: 'A catalog look designed around your brand — then fast, from €19/visual.',
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
      'Normal per-visual pricing after the first order',
    ],
  },
];

export function getCatalogStyle(slug) {
  return catalogStyles.find((s) => s.slug === slug);
}
