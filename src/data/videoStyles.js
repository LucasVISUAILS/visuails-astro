import { waHref } from './whatsapp.js';
// VISUAILS — video style data, ported verbatim from the SvelteKit rebuild
// ($lib/data/videoStyles.js). Drives both the /video hub cards and the
// /video/[slug] template (src/pages/video/[slug].astro), same data-driven
// pattern as src/data/styles.js (lifestyle) and src/data/catalogStyles.js
// (catalog). None of the three source pages used a real background-image,
// so — like catalog — this uses icon fields instead of photo fields for the
// grid; the hero/strip photography for each style is real and is wired up
// directly in the [slug] page template.

import { perProduct, vatLabel } from './pricing.js';

// No euro figure and no delivery time may be typed into this file.
// Both used to live here as literals, which is how the hub cards and the
// [slug] pages ended up quoting a turnaround the capacity gate had never
// cleared — and how a video price that exists nowhere in pricing.js
// survived a repricing nobody caught. Derive, never type.
const VID = perProduct('video', 'en');
// A clip is NOT on the ladder — it is the same rate at one clip and at fifty,
// which is what makes it quotable inside or outside an order. So this one keeps
// a flat figure; it just no longer prints it without saying which side of VAT
// it sits on.
const VID_VAT = vatLabel('excl', 'en');
/* Levertijd en controle staan in de feitenrij van de detailpagina, niet
   meer ook in "Wat je krijgt" (29 september 2026: twee keer dezelfde zin). */

// grid: the 3x3 product-scene grid on each style page.
function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const videoStyles = [
  {
    slug: 'motion',
    /* Naar het aanvraagformulier van Video en niet naar de keuzepagina.
       Video staat nog op 'in aanbouw' — er is dus geen bestelformulier maar
       een aanvraag, en dát is waar deze knop hoort te landen. Zie
       src/data/orderDoors.js. */
    name: 'Motion',
    tagline: 'Eight seconds of undivided attention.',
    priceTrust: VID.price,
    priceUnit: ' / clip',
    /* Naar het aanvraagformulier van Video en niet naar de keuzepagina.
       Video staat nog op 'in aanbouw' — er is geen bestelformulier maar een
       aanvraag, en dát is waar deze knop hoort te landen. "Order" beloofde
       bovendien iets wat deze dienst nog niet doet. Zie src/data/orderDoors.js. */
    ctaLabel: 'Ask about Motion',
    ctaHref: '/start/video',
    ctaExternal: false,
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: `${VID.price} / clip`,
    cardDesc: 'An 8-second clip, subtle motion, clean presentation. Fixed price.',
    moodTitle: 'What Motion feels like.',
    moodParagraphs: [
      'Eight seconds, one product, one clean move — enough to hold the eye, never enough to distract.',
    ],
    steps: [
      { title: 'Lock the frame', body: 'One clean composition, held steady from start to end.' },
      { title: 'Add subtle motion', body: 'Light drift, gentle rotation or reveal.' },
      { title: 'Loop it seamlessly', body: 'The last frame ties back to the first.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'One move per film', body: 'A single, deliberate camera or light movement. Restraint is the style.' },
      { title: 'Loop-clean endings', body: 'Start and end frames matched so it loops seamlessly.' },
      { title: 'Material-aware motion', body: 'Speed and light tuned to what the product is made of.' },
      { title: 'Stills-matched grading', body: 'Shares a grade with your catalog set.' },
    ],
    why: [
      { title: 'Movement, nothing more', body: 'A slow pan or a small turn. No music, no cuts, no text on screen.' },
      { title: 'Vertical as standard', body: '9:16 as standard. Another aspect ratio is on request, agreed in the quote.' },
      { title: 'The right length for a feed', body: '8 seconds, delivered in the aspect ratio Instagram and TikTok use.' },
    ],
    bestFor: [
      'Product pages that need life',
      'Social feeds and simple ads',
      'Email headers and launch teasers',
      'Marketplaces that support video',
    ],
    whatYouGet: [
      '8-second clean product film',
      'Seamless loop, subtle motion',
      'Vertical 9:16; other ratios on request',
    ],
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle Video',
    tagline: 'The scene, set in motion.',
    priceTrust: VID.price,
    priceUnit: ' / clip',
    ctaLabel: 'Ask about Lifestyle Video',
    ctaHref: '/start/video',
    ctaExternal: false,
    heroIcon: 'jar',
    heroWidth: '26%',
    cardIcon: 'jar',
    cardWidth: '46%',
    cardPrice: `${VID.price} / clip`,
    cardDesc: 'A styled scene, in motion — for social and ads. Fixed price.',
    moodTitle: 'What Lifestyle Video feels like.',
    moodParagraphs: [
      'A styled scene, let loose: steam rising, light shifting, a model turning towards the lens.',
    ],
    steps: [
      { title: 'Build the scene', body: 'Your lifestyle-stills world, brought into motion.' },
      { title: 'Direct light movement', body: 'Natural gesture and light that feels observed.' },
      { title: 'Vertical 9:16', body: 'The standard format. Another ratio on request, agreed in the quote.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Story in a breath', body: 'One beat — reveal, use, or mood — in a few seconds.' },
      { title: 'Scene continuity', body: 'Sets, light and models match your lifestyle stills.' },
      { title: 'Vertical-first direction', body: 'Paced for 9:16. 1:1, 16:9 or another ratio on request.' },
      { title: 'Motion with manners', body: 'Smooth and intentional — expensive, not busy.' },
    ],
    why: [
      { title: 'Continuity with your stills', body: 'The same model, light and mood — now moving.' },
      { title: 'Built for short-form', body: 'Paced for Reels, TikTok and Shorts.' },
      { title: 'One shoot, two assets', body: 'Stills and motion from the same styled scene.' },
    ],
    bestFor: [
      'Reels, TikTok and Shorts',
      'Ads that need warmth and context',
      'Launches carrying stills and film together',
      'Brands building a recognisable world',
    ],
    whatYouGet: [
      'Short-form styled scene in motion',
      'Continuity with your lifestyle stills',
      'Consistent models available',
    ],
  },
  {
    slug: 'campaign',
    name: 'Campaign',
    tagline: 'Your biggest moment, produced properly.',
    priceTrust: 'Quoted per project',
    priceUnit: '',
    ctaLabel: 'Get a campaign quote',
    ctaHref: waHref("Hi VISUAILS, I'd like a quote for a campaign video."),
    ctaExternal: true,
    heroIcon: 'sneaker',
    heroWidth: '26%',
    cardIcon: 'sneaker',
    cardWidth: '56%',
    cardPrice: 'Custom quote',
    cardDesc: 'Multi-shot campaign films, built around the story you want to tell. Priced per project.',
    moodTitle: 'What Campaign feels like.',
    moodParagraphs: [
      'The full production: multiple shots, a narrative arc, edits cut to land a launch.',
    ],
    steps: [
      { title: 'Agree what the campaign covers', body: 'Shots and files agreed on WhatsApp.' },
      { title: 'Shoot the sequence', body: 'A multi-shot film, graded as one story.' },
      { title: 'Deliver', body: 'Vertical 9:16 as standard. Other ratios and the delivery time are agreed in the quote.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Your idea, taken seriously', body: 'Shot list and story built to your launch, not a template.' },
      { title: 'Multi-shot construction', body: 'Openers, details, hero moments, end cards — sequenced.' },
      { title: 'Edit, grade, deliver', body: 'One shared grade, in the formats agreed in the quote.' },
      { title: 'A fixed price, up front', body: 'Agreed on WhatsApp. You approve before we start.' },
    ],
    why: [
      { title: 'One partner for the whole campaign', body: 'Stills, motion and every cut, from one conversation.' },
      { title: 'One grade', body: 'Consistent colour and mood across the whole campaign.' },
      { title: 'Priced before you commit', body: 'A clear quote, agreed before any work starts.' },
    ],
    bestFor: [
      'Product launches and seasonal drops',
      'Brand films and store takeovers',
      'Campaigns spanning stills and film',
      'Teams that need one partner for all of it',
    ],
    whatYouGet: [
      'A scoped, multi-shot campaign film',
      'Vertical 9:16; other ratios agreed in the quote',
      'One grade across your whole campaign',
      'A clear, agreed price before work starts',
    ],
  },
  {
    slug: 'custom',
    name: 'Custom',
    tagline: 'A video concept built entirely around your brand.',
    priceTrust: 'Quoted per project',
    priceUnit: '',
    ctaLabel: 'Discuss a custom video',
    ctaHref: waHref("Hi VISUAILS, I'd like to discuss a custom video."),
    ctaExternal: true,
    heroIcon: 'jar',
    heroWidth: '26%',
    cardIcon: 'jar',
    cardWidth: '46%',
    cardPrice: 'Custom quote',
    cardDesc: 'Your own concept, pace and look — a video built entirely around what you tell us.',
    moodTitle: 'What Custom feels like.',
    moodParagraphs: [
      'Beyond the three formats — a video concept built around your story, your pace, your look.',
    ],
    steps: [
      { title: 'You tell us', body: 'Tell us the idea and where it needs to run.' },
      { title: 'Concept', body: 'We design a custom motion concept and agree it with you.' },
      { title: 'Deliver', body: 'In the format and the time agreed in the quote, graded as one.' },
    ],
    craft: [
      { title: 'Built from your idea', body: 'No template — the concept starts from what you tell us and the references you send.' },
      { title: 'Agreed before we start', body: 'Shots, length and files agreed up front, priced clearly.' },
      { title: 'One grade', body: 'Vertical 9:16 as standard, other ratios on request — all sharing one look.' },
      { title: 'Consistent with your stills', body: 'Colour and mood matched to your catalog and lifestyle set.' },
    ],
    why: [
      { title: 'Exactly your idea', body: 'A concept shaped to your brand, not squeezed into a preset.' },
      { title: 'One partner, one look', body: 'Stills and motion that clearly belong together.' },
      { title: 'Priced before you commit', body: 'A clear quote, agreed before any work starts.' },
    ],
    bestFor: [
      'Ideas the three formats don’t cover',
      'Launches with a specific story to tell',
      'Brands that want a signature motion style',
      'Anything agreed and quoted per project',
    ],
    whatYouGet: [
      'A bespoke video concept, designed with you',
      'Format and delivery time agreed in the quote',
      'One grade across the whole piece',
      'A clear, agreed price before work starts',
    ],
  },
];

export function getVideoStyle(slug) {
  return videoStyles.find((s) => s.slug === slug);
}
