// VISUAILS — the catalog background palette.
//
// WHY THIS EXISTS
// Lucas's ask, August 2026: a customer ordering catalog images should be able
// to pick the background their product sits on — white, or a colour of their
// own — and the studio should recommend a light one. The reason is not taste.
// A brand that already has product photos has a background already, and the
// whole point of ordering more is that the new products look like they belong
// beside the old ones. If we pick a background for them, the range splits into
// "before us" and "after us" on their own product grid.
//
// So the choice is theirs, the recommendation is ours, and the recommendation
// is four light values rather than a free-for-all:
//
//   · Marketplaces are the hard constraint. Amazon requires pure white
//     (#FFFFFF) on the main image; Zalando and bol want white or near-white.
//     A brand that picks charcoal cannot use the same file on a marketplace,
//     and will find that out after delivery rather than before.
//   · Light backgrounds hold shadow detail. A dark ground swallows the
//     shadow a garment casts, which is the cue that tells a shopper the
//     product is a physical object rather than a cut-out.
//   · Light grounds stay consistent under compression. Shops re-encode
//     uploads, and a flat dark field bands visibly where a light one does not.
//
// None of that makes a dark background wrong — it makes it a decision worth
// making on purpose, which is why the custom option is a real option and not a
// discouraged one. `warn` below is what the UI says when a custom colour is
// dark, and it is phrased as a consequence, not a refusal.
//
// HEX VALUES ARE THE CONTRACT. These are what the studio actually renders
// against, so they are here and not in a component's copy table — a swatch
// that shows #F7F5F1 while production runs #F5F5F5 is a delivery a client can
// measure and reject.

/** The four we put forward, lightest-neutral first. */
export const RECOMMENDED = [
  {
    id: 'white',
    hex: '#FFFFFF',
    name: { en: 'White', nl: 'Wit' },
    note: {
      en: 'Pure white. The only value Amazon accepts on a main image, and the safe default everywhere else.',
      nl: 'Zuiver wit. De enige waarde die Amazon op een hoofdafbeelding accepteert, en overal elders de veilige keuze.',
    },
  },
  {
    id: 'off-white',
    hex: '#F7F5F1',
    name: { en: 'Off-white', nl: 'Gebroken wit' },
    note: {
      en: 'A hair warmer than white. Stops a white garment disappearing into its own background.',
      nl: 'Een tikje warmer dan wit. Voorkomt dat een wit kledingstuk in zijn eigen achtergrond verdwijnt.',
    },
  },
  {
    id: 'light-grey',
    hex: '#EDEDED',
    name: { en: 'Light grey', nl: 'Lichtgrijs' },
    note: {
      en: 'Neutral and quiet. The most forgiving ground for pale product and for white stitching.',
      nl: 'Neutraal en rustig. De meest vergevende ondergrond voor licht product en voor wit stikwerk.',
    },
  },
  {
    id: 'beige',
    hex: '#EDE4D8',
    name: { en: 'Beige', nl: 'Beige' },
    note: {
      en: 'Warm and editorial. Reads as a chosen background rather than an absent one.',
      nl: 'Warm en editorial. Leest als een gekozen achtergrond in plaats van een afwezige.',
    },
  },
];

/** The escape hatch: the brand's own value, matched to what they already run. */
export const CUSTOM_ID = 'custom';

export const DEFAULT_ID = 'white';

/** Look one up by id, or undefined for the custom option. */
export function background(id) {
  return RECOMMENDED.find((b) => b.id === id);
}

/**
 * Relative luminance, WCAG's formula, so the UI can tell a dark custom value
 * from a light one and say what that costs. Not a validator — nothing here
 * rejects a colour — just the input to the warning below.
 */
export function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Below this, the marketplace and shadow-detail caveats start to bite. */
export const LIGHT_THRESHOLD = 0.55;

export function isLight(hex) {
  const l = luminance(hex);
  return l === null ? null : l >= LIGHT_THRESHOLD;
}

export const COPY = {
  en: {
    label: 'Background',
    hint: 'Pick the ground your products sit on. If you already have product photos, match what they use — that is the whole point: the new ones have to look like they belong beside the old ones.',
    recommendedH: 'What we recommend',
    customH: 'Your own colour',
    customHint: 'Paste the hex your current photos use, or pick it. We render against exactly this value.',
    warn: 'Darker than we would recommend. It will look good, with two consequences worth knowing: Amazon will not take it as a main image, and a dark ground hides the shadow that tells a shopper the product is a real object. Say the word and we will run it anyway.',
    matchNote: 'Not sure what yours is? Send one existing product photo with your order and we will read the value off it.',
  },
  nl: {
    label: 'Achtergrond',
    hint: 'Kies de ondergrond waarop je producten staan. Heb je al productfoto’s, kies dan wat die gebruiken — dat is precies het punt: de nieuwe moeten eruitzien alsof ze naast de oude horen.',
    recommendedH: 'Wat wij aanraden',
    customH: 'Je eigen kleur',
    customHint: 'Plak de hexwaarde die je huidige foto’s gebruiken, of kies hem. We renderen tegen exact deze waarde.',
    warn: 'Donkerder dan we zouden aanraden. Het wordt mooi, met twee gevolgen die je moet weten: Amazon accepteert het niet als hoofdafbeelding, en een donkere ondergrond verbergt de schaduw die een koper vertelt dat het product een echt voorwerp is. Zeg het maar, dan draaien we het gewoon zo.',
    matchNote: 'Weet je niet welke die van jou is? Stuur één bestaande productfoto mee met je bestelling, dan lezen wij de waarde eraf.',
  },
};

export function copy(lang = 'en') {
  return COPY[lang === 'nl' ? 'nl' : 'en'];
}
