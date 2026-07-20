// VISUAILS — video style data, ported verbatim from the SvelteKit rebuild
// ($lib/data/videoStyles.js). Drives both the /video hub cards and the
// /video/[slug] template (src/pages/video/[slug].astro), same data-driven
// pattern as src/data/styles.js (lifestyle) and src/data/catalogStyles.js
// (catalog). None of the three source pages used a real background-image,
// so — like catalog — this uses icon fields instead of photo fields for the
// grid; the hero/strip photography for each style is real and is wired up
// directly in the [slug] page template.

// grid: the 3x3 product-scene grid on each style page.
function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const videoStyles = [
  {
    slug: 'motion',
    name: 'Motion',
    tagline: 'Eight seconds of undivided attention.',
    priceTrust: '€49',
    priceUnit: ' / video',
    ctaLabel: 'Order Motion',
    ctaHref: '/order-video',
    ctaExternal: false,
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: 'From €49 / video',
    cardDesc: 'An 8-second clip, subtle motion, clean presentation. Fixed price. ~24h.',
    moodTitle: 'What Motion feels like.',
    moodParagraphs: [
      'Eight seconds, one product, one clean move — enough to hold the eye, never enough to distract.',
    ],
    steps: [
      { title: 'Lock the frame', body: 'One clean composition, camera perfectly still.' },
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
      { title: 'Life without noise', body: "Finishes what a static photo can't quite say." },
      { title: 'Every format, one shoot', body: 'Cut for square, portrait and wide from one file.' },
      { title: 'Ready for the scroll', body: '8 seconds, built to hold attention.' },
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
      'Format cut for your channel',
      '~24h delivery, checked by hand',
    ],
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle Video',
    tagline: 'The scene, set in motion.',
    priceTrust: '€59',
    priceUnit: ' / video',
    ctaLabel: 'Order Lifestyle Video',
    ctaHref: '/order-video',
    ctaExternal: false,
    heroIcon: 'jar',
    heroWidth: '26%',
    cardIcon: 'jar',
    cardWidth: '46%',
    cardPrice: 'From €59 / video',
    cardDesc: 'A styled scene, in motion — for social and ads. Fixed price. ~24h.',
    moodTitle: 'What Lifestyle Video feels like.',
    moodParagraphs: [
      'A styled scene, let loose: steam rising, light shifting, a model turning toward the lens.',
    ],
    steps: [
      { title: 'Build the scene', body: 'Your lifestyle-stills world, brought into motion.' },
      { title: 'Direct light movement', body: 'Natural gesture and light that feels observed.' },
      { title: 'Cut for the channel', body: "Formatted for wherever it's going to run." },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Story in a breath', body: 'One beat — reveal, use, or mood — in a few seconds.' },
      { title: 'Scene continuity', body: 'Sets, light and models match your lifestyle stills.' },
      { title: 'Vertical-first direction', body: 'Paced for 9:16 first, 1:1 and 16:9 cuts available.' },
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
      '~24h delivery, checked by hand',
    ],
  },
  {
    slug: 'campaign',
    name: 'Campaign',
    tagline: 'Your biggest moment, produced properly.',
    priceTrust: 'Quoted per project',
    priceUnit: '',
    ctaLabel: 'Get a campaign quote',
    ctaHref: 'https://wa.me/31625436130?text=Hi%20VISUAILS%2C%20I%27d%20like%20a%20quote%20for%20a%20campaign%20video.',
    ctaExternal: true,
    heroIcon: 'sneaker',
    heroWidth: '26%',
    cardIcon: 'sneaker',
    cardWidth: '56%',
    cardPrice: 'Custom quote',
    cardDesc: 'Multi-shot campaign pieces, built around your brief. Priced per project.',
    moodTitle: 'What Campaign feels like.',
    moodParagraphs: [
      'The full production: multiple shots, a narrative arc, edits cut to land a launch.',
    ],
    steps: [
      { title: 'Scope the campaign', body: 'Shots and deliverables agreed on WhatsApp.' },
      { title: 'Shoot the sequence', body: 'A multi-shot film, graded as one story.' },
      { title: 'Deliver every cut', body: "Every channel's format, from one campaign." },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'A brief, taken seriously', body: 'Shot list and story built to your launch, not a template.' },
      { title: 'Multi-shot construction', body: 'Openers, details, hero moments, end cards — sequenced.' },
      { title: 'Edit, grade, deliver', body: 'Cuts for feed, stories and site, one shared grade.' },
      { title: 'A fixed price, up front', body: 'Scoped on WhatsApp. You approve before we start.' },
    ],
    why: [
      { title: 'One partner for the whole campaign', body: 'Stills, motion and every cut, one brief.' },
      { title: 'One grade, every channel', body: 'Consistent colour and mood across every format.' },
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
      "Cuts for every channel you're on",
      'One grade across your whole campaign',
      'A clear, agreed price before work starts',
    ],
  },
];

export function getVideoStyle(slug) {
  return videoStyles.find((s) => s.slug === slug);
}
