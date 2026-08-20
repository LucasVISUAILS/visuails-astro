// VISUAILS — lifestyle style data, ported verbatim from the SvelteKit
// rebuild ($lib/data/styles.js). Drives both the /lifestyle hub cards and
// the /lifestyle/[slug] template (src/pages/lifestyle/[slug].astro) so
// every style page is one shared data source.

import { reviewClaim, turnaround } from './pricing.js';

// No euro figure and no delivery time may be typed into this file.
// Both used to live here as literals, which is how the hub cards and the
// [slug] pages ended up quoting a turnaround the capacity gate had never
// cleared — and how a video price that exists nowhere in pricing.js
// survived a repricing nobody caught. Derive, never type.
const TIMING = turnaround('unattended', 'en');
const REVIEW = reviewClaim('unattended', 'en');

// grid: the 3x3 product-scene grid on each style page. `photo` is a real
// asset path when the source page used one, otherwise null (renders the
// SVG placeholder icon instead — same behavior as the static site).
function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const styles = [
  {
    slug: 'dunes',
    name: 'Dunes',
    tagline: 'Sun, sand and quiet luxury.',
    heroPhoto: '/img/lifestyle-dunes-01.webp',
    cardPhoto: '/img/lifestyle-dunes-01.webp',
    beforeAfter: { before: '/img/lifestyle-dunes-02.webp', after: '/img/lifestyle-dunes-01.webp' },
    cardIcon: 'bag',
    cardDesc: 'Warm, sun-washed editorial scenes with soft natural light and earthy, sand-toned surroundings — an elevated, aspirational feel that flatters premium products.',
    moodTitle: 'What Dunes feels like.',
    moodParagraphs: [
      'Sun-washed minimalism, earthy tones, long soft shadows. The look of quiet luxury.',
      'Wide frames, sand and stone surfaces, and long low shadows. Plenty of empty space around the product, and nothing in the scene competing with it.',
    ],
    steps: [
      { title: 'Find the horizon', body: 'Wide, quiet compositions with room to breathe around the product.' },
      { title: 'Let shadows stretch', body: 'Long, low-angle light for a premium, unhurried mood.' },
      { title: 'Leave space for words', body: 'Framing that keeps room for your own messaging and layout.' },
    ],
    grid: grid(
      ['/img/lifestyle-dunes-02.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'A restrained palette, enforced', body: 'Sand, bone, terracotta and shadow. Anything louder is removed before it reaches the frame.' },
      { title: 'Long-light geometry', body: 'Shadows are cast low and long, giving flat products dimension and premium products gravity.' },
      { title: 'Surfaces you can read', body: 'Stone, plaster and woven backgrounds keep their grain at full resolution, so a plain scene still has something to look at.' },
      { title: 'Space left on purpose', body: 'Compositions hold generous negative space — ready-made for type, or for silence.' },
    ],
    why: [
      { title: 'Quiet luxury, without the studio cost', body: 'The restraint of a premium shoot, at ordinary visual pricing.' },
      { title: 'Built for stillness', body: 'A mood that supports the product instead of competing with it.' },
      { title: 'Campaign-flexible', body: 'Negative space that works for ads, banners and packaging alike.' },
    ],
    bestFor: ['Premium skincare, jewellery and leather goods', 'Brands selling calm, not noise', 'Campaigns with an understated voice', 'Products that deserve gallery treatment'],
    whatYouGet: ['Sun-washed, earthy minimalist scenes', 'Long-shadow premium lighting', 'Compositions with space for messaging', TIMING, REVIEW],
  },
  {
    slug: 'flash',
    name: 'Flash',
    tagline: 'Direct flash. No apologies.',
    heroPhoto: '/img/lifestyle-flash-01.webp',
    cardPhoto: '/img/lifestyle-flash-02.webp',
    beforeAfter: { before: '/img/lifestyle-flash-07.webp', after: '/img/lifestyle-flash-01.webp' },
    cardIcon: 'sneaker',
    cardDesc: 'High-energy flash-lit visuals with a nightlife / editorial feel — punchy, contrasty, trend-driven.',
    moodTitle: 'What Flash feels like.',
    moodParagraphs: [
      'Hard on-camera light, deep shadows, colour that punches. The nightlife look, confrontational by design.',
      "Done wrong it’s just harsh. Done right it’s electric. We've made it a discipline.",
    ],
    steps: [
      { title: 'Place hard light', body: 'Flash positioned to carve the product out of the dark, cleanly.' },
      { title: 'Draw with shadow', body: 'Negative space shaped on purpose — never left empty by accident.' },
      { title: 'Protect the product', body: 'Contrast pushed hard without blowing out colour or texture.' },
    ],
    grid: grid(
      ['/img/lifestyle-flash-01.webp', '/img/lifestyle-flash-02.webp', '/img/lifestyle-flash-03.webp', '/img/lifestyle-flash-04.webp', '/img/lifestyle-flash-05.webp', '/img/lifestyle-flash-06.webp', '/img/lifestyle-flash-07.webp', '/img/lifestyle-flash-08.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Hard light, placed hard', body: 'Flash falloff is controlled so the product stays crisp while the world drops away behind it.' },
      { title: 'Shadow as composition', body: "The black behind the subject isn’t empty — it’s drawn, shaping where the eye lands." },
      { title: 'Hard light, no blown-out product', body: 'The scene gets deep shadows and bright highlights, but the product itself keeps its real colour and its fabric detail.' },
      { title: 'Energy that repeats', body: 'The chaos is systematised: your tenth Flash visual hits like your first, and matches it.' },
    ],
    why: [
      { title: 'Stands out in a feed', body: 'Hard light and deep shadow read at thumbnail size, where soft even light goes unnoticed.' },
      { title: 'An edge that repeats', body: 'The same intensity on visual one and visual one hundred.' },
      { title: 'Made for a launch', body: 'The look suits a release, a restock or a limited run.' },
    ],
    bestFor: ['Streetwear, sneakers and accessories', 'Drops, launches and hype moments', 'Brands with an edge to keep', 'Social ads that need to stop thumbs'],
    whatYouGet: ['High-energy flash-lit scenes', 'Deep, deliberate shadow work', 'Consistent models, locked to your brand', TIMING, REVIEW],
  },
  {
    slug: 'glow',
    name: 'Glow',
    tagline: 'Golden hour, on demand.',
    heroPhoto: '/img/lifestyle-glow-01.webp',
    cardPhoto: '/img/lifestyle-glow-01.webp',
    beforeAfter: { before: '/img/lifestyle-glow-03.webp', after: '/img/lifestyle-glow-01.webp' },
    cardIcon: 'jar',
    cardDesc: 'Bold visuals inspired by fashion editorial — direct on-camera flash, sharp contrast, strong shadows, modern campaign aesthetic.',
    moodTitle: 'What Glow feels like.',
    moodParagraphs: [
      'Low sun, soft bloom, skin and product wrapped in the same amber light. The look of an evening that went well.',
      'Editorial brands use this light because it flatters everything it touches. Now it\'s a setting, not a two-week location shoot.',
    ],
    steps: [
      { title: 'Chase golden hour', body: 'Warm, low-angle light on every single frame, no exceptions.' },
      { title: 'Style the scene', body: 'Wardrobe, props and setting tuned to feel aspirational, not staged.' },
      { title: 'Grade for warmth', body: 'A consistent, editorial colour finish carried across the whole set.' },
    ],
    grid: grid(
      ['/img/lifestyle-glow-01.webp', '/img/lifestyle-glow-02.webp', '/img/lifestyle-glow-03.webp', '/img/lifestyle-glow-04.webp', '/img/lifestyle-glow-05.webp', '/img/lifestyle-glow-06.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'A tuned warmth curve', body: "Our golden tone isn’t a filter — it’s a calibrated grade that keeps product colour honest while everything around it warms up." },
      { title: 'Bloom under control', body: 'Highlight softness is dosed per material: glass blooms, fabric doesn\'t smear, metal keeps its edge.' },
      { title: 'Scenes built for dusk', body: 'Sets, surfaces and props are chosen to make low light plausible — balconies, linen, late interiors.' },
      { title: 'Model-light harmony', body: 'When a model carries the product, skin tone and product tone are balanced in the same grade, never fighting.' },
    ],
    why: [
      { title: 'Sells a feeling, not just a product', body: 'The atmosphere that beauty and fashion buyers actually respond to.' },
      { title: 'Campaign-grade, every order', body: "There is no upgrade to buy for a hero shot — this finishing is the standard." },
      { title: 'One consistent glow', body: 'The same warmth across your whole feed, launch after launch.' },
    ],
    bestFor: ['Beauty, skincare and fragrance', 'Fashion that sells a feeling', 'Campaigns and launches that need atmosphere', 'Brands building an aspirational feed'],
    whatYouGet: ['Warm, editorial golden-hour scenes', 'Consistent models, locked to your brand', 'Campaign-grade finishing on every image', TIMING, REVIEW],
  },
  {
    slug: 'phone-made',
    name: 'Phone-made',
    tagline: "Looks effortless. Isn’t.",
    heroPhoto: '/img/lifestyle-phone-made-01.webp',
    cardPhoto: '/img/lifestyle-phone-made-11.webp',
    beforeAfter: { before: '/img/lifestyle-phone-made-05.webp', after: '/img/lifestyle-phone-made-01.webp' },
    cardIcon: 'bottle',
    cardDesc: 'Minimal visuals that look like an everyday photo — natural and unpolished, like something someone just took.',
    moodTitle: 'What Phone-made feels like.',
    moodParagraphs: [
      'Daylight through a window, a product on a kitchen counter, a slightly imperfect frame. It reads as real.',
      "It's the style that makes feeds trust you. No studio gloss, no hard sell. Just your product living a believable life.",
    ],
    steps: [
      { title: 'Cast the light', body: 'One window or lamp, nothing staged — light the way it actually falls at home.' },
      { title: 'Keep it handheld', body: 'Natural angles and a touch of imperfection, without tripod stiffness.' },
      { title: 'Crop for feed', body: "Framed for the platform it’s landing on, from the very first draft." },
    ],
    grid: grid(
      ['/img/lifestyle-phone-made-02.webp', '/img/lifestyle-phone-made-03.webp', '/img/lifestyle-phone-made-04.webp', '/img/lifestyle-phone-made-05.webp', '/img/lifestyle-phone-made-06.webp', '/img/lifestyle-phone-made-07.webp', '/img/lifestyle-phone-made-08.webp', '/img/lifestyle-phone-made-09.webp', '/img/lifestyle-phone-made-10.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Looks like a phone shot, on purpose', body: 'A slight tilt, uneven light and a real shadow. Every one of those is placed deliberately, so the photo reads as taken rather than produced.' },
      { title: 'Daylight logic', body: "Every scene obeys one light source and one time of day. That’s what separates believable from uncanny." },
      { title: 'Props that stay in the background', body: 'Nothing in the scene dates the photo to a season, and nothing pulls your eye off the product.' },
      { title: 'Feed-first framing', body: 'Composed for 4:5 and 9:16 up front, so nothing important dies in the crop.' },
    ],
    why: [
      { title: 'Reads as real', body: 'No studio tell — built to sit next to UGC without ever standing out.' },
      { title: 'Trust before polish', body: 'The look that performs when audiences are wary of anything too styled.' },
      { title: 'Already the right shape for a feed', body: 'Delivered in the aspect ratio Instagram uses, so you do not have to crop it yourself.' },
    ],
    bestFor: ['Social-first brands and UGC-style ads', 'Products that sell on relatability', 'Founders building trust before polish', "Organic content that shouldn’t look like ads"],
    whatYouGet: ['Authentic, phone-real lifestyle scenes', 'Natural, single-source lighting', 'Feed-ready crops from day one', TIMING, REVIEW],
  },
  {
    slug: 'custom',
    name: 'Custom',
    tagline: 'Your own world, built around your product.',
    priceTrust: 'On request',
    priceUnit: '',
    heroPhoto: '/img/banners-13.webp',
    cardPhoto: '/img/banners-13.webp',
    cardIcon: 'bag',
    cardDesc: 'Not one of our four moods — a bespoke lifestyle scene designed from your references.',
    /* ── NIET MEER NAAR HET BESTELFORMULIER, 18 augustus 2026 ──────────────
       Lucas: een stijl op maat heeft geen standaardtarief; die prijs volgt pas
       als de klant heeft gezegd wat hij wil. Deze knop wees naar het formulier
       dat een prijs uitrekent, terwijl de regel erboven op deze zelfde pagina
       "On request" zegt. Nu naar de aanvraagpagina — zie
       StylePicker.astro en het 'custom-look'-blok in HoldingPage.astro. */
    orderHref: '/start/custom-look',
    orderLabel: 'Ask for a custom look',
    moodParagraphs: [
      'Not one of our four moods — a scene designed from your references: the setting, styling and light that only your brand would use.',
      'We build the world once, with you, then keep every future visual true to it.',
    ],
    steps: [
      { title: 'Brief', body: 'Share references and the world you want your product to live in.' },
      { title: 'Design', body: 'We shape a bespoke scene and styling direction, checked with you.' },
      { title: 'Produce', body: 'Your custom lifestyle visuals, consistent from order to order.' },
    ],
    grid: grid(
      ['/img/banners-14.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    bestFor: [
      'Brands with a specific world in mind',
      "Concepts our four moods don’t cover",
      'Campaigns that need their own signature',
      'Ranges where the scene is the story',
    ],
    whatYouGet: [
      'A bespoke lifestyle concept, designed with you',
      'Scene, styling and light matched to your brand',
      'Consistent across every future order',
      'A clear price, agreed before we start',
    ],
  },
];

export function getStyle(slug) {
  return styles.find((s) => s.slug === slug);
}
