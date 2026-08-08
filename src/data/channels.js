// VISUAILS — where the customer is going to sell the product, and what each of
// those places demands of the image.
//
// WHY THIS FILE EXISTS
// Lucas, August 2026: "misschien handig om een optie toe te voegen waar wordt
// dit product op verkocht in de orderflow (dus als iemand Amazon kiest alleen
// #ffffff beschikbaar is als achtergrondkleur)."
//
// That is the right instinct and it inverts a problem the site had. /catalog
// answered "are the visuals marketplace-compliant?" with "Yes — tell us your
// platform and we'll match its specs", which put the burden on a conversation
// that mostly never happened, and made a promise nothing enforced. Asking the
// question inside the order turns the promise into a constraint: pick Amazon
// and the background stops being a free choice, because Amazon's main image is
// pure white and that is checked algorithmically on their side.
//
// WHAT IS AND IS NOT VERIFIED HERE
// Every `requiresWhite` and every figure below was read off the platform's own
// partner documentation in August 2026, not off a summary. What we CANNOT do is
// promise acceptance: a listing is rejected for category rules, brand-registry
// state and content policy long before anyone looks at the background, and
// these guidelines change without telling us. So this file drives a constraint
// and a warning; it does not drive a compliance claim, and /catalog's FAQ is
// worded to match.
//
// THE ONE THAT IS NOT SAFE TO PROMISE: ZALANDO. Their apparel guidelines ask
// for model views "photographed with a real person". An on-model frame built by
// an image pipeline is the thing that sentence is about, so Zalando is carried
// here with `modelShotRisk: true` and the picker says so out loud rather than
// taking the order and letting the customer find out at upload. Their packshot
// requirement (#FFFFFF) is not in doubt and is honoured the same way Amazon's
// is — it is specifically the AI-generated model view that is unsettled.
//
// FORMAT IS THE QUIET ONE. Zalando accepts JPG only and Amazon does not take
// webp either. Since we convert to webp routinely — and that conversion is
// what strips the provenance tag, see scripts/tag-delivery.mjs — a customer
// selling on a marketplace should be delivered jpg. `formats` carries that so
// the studio reads it off the order instead of remembering it.

/**
 * Ordered as a Dutch brand meets them: the two big NL marketplaces, the big
 * fashion platform, then the customer's own surfaces.
 *
 *   requiresWhite   the MAIN image must be pure #FFFFFF. Drives the background
 *                   lock in the order form.
 *   modelsOnMain    may a person appear on the main/first image at all.
 *   modelShotRisk   the platform's model-view rules may not accept an
 *                   AI-generated person. Drives a warning, never a block.
 *   formats         file types the platform accepts for listing images.
 */
export const CHANNELS = [
  {
    id: 'amazon',
    name: 'Amazon',
    requiresWhite: true,
    modelsOnMain: 'apparel-only',
    modelShotRisk: false,
    formats: ['jpg', 'png'],
    minPx: 1000,
    zoomPx: 1600,
    note: {
      en: 'The main image must be pure white (RGB 255,255,255) and Amazon checks it automatically. Apparel may show the product on a model; most other categories may not. 1,000px on the longest side, 1,600px to switch zoom on.',
      nl: 'De hoofdafbeelding moet zuiver wit zijn (RGB 255,255,255) en Amazon controleert dat automatisch. Kleding mag het product op een model tonen; de meeste andere categorieën niet. 1.000px op de langste zijde, 1.600px om zoom aan te zetten.',
    },
  },
  {
    id: 'bol',
    name: 'bol',
    requiresWhite: true,
    modelsOnMain: false,
    modelShotRisk: false,
    formats: ['jpg', 'png'],
    minPx: 500,
    zoomPx: 1200,
    note: {
      en: 'White, neutral background with no visible shadow, and no model on the main image at all — the on-model shot goes in the additional images. 500px minimum, 1,200px for zoom.',
      nl: 'Witte, neutrale achtergrond zonder zichtbare schaduw, en op de hoofdafbeelding geen model — de on-model shot gaat bij de extra afbeeldingen. Minimaal 500px, 1.200px voor zoom.',
    },
  },
  {
    id: 'zalando',
    name: 'Zalando',
    requiresWhite: true,
    modelsOnMain: true,
    modelShotRisk: true,
    formats: ['jpg'],
    minPx: 762,
    zoomPx: 1801,
    note: {
      en: 'Packshots on #FFFFFF, model views on light grey (#F1F1F1), JPG only, 1:1.44, three compliant images per apparel article. Read the warning below before you pick this one.',
      nl: 'Packshots op #FFFFFF, modelbeelden op lichtgrijs (#F1F1F1), alleen JPG, 1:1.44, drie geldige beelden per kledingartikel. Lees de waarschuwing hieronder voor je dit kiest.',
    },
  },
  {
    id: 'own',
    name: { en: 'Our own webshop', nl: 'Onze eigen webshop' },
    requiresWhite: false,
    modelsOnMain: true,
    modelShotRisk: false,
    formats: ['jpg', 'png', 'webp'],
    note: {
      en: 'Your shop, your rules. Any background colour, any crop, and webp is fine here — it is the one place it is.',
      nl: 'Jouw shop, jouw regels. Elke achtergrondkleur, elke uitsnede, en webp mag hier — het is de enige plek waar dat kan.',
    },
  },
  {
    id: 'social',
    name: { en: 'Social and ads', nl: 'Social en advertenties' },
    requiresWhite: false,
    modelsOnMain: true,
    modelShotRisk: false,
    formats: ['jpg', 'png', 'webp'],
    note: {
      en: 'No background rule. Instagram and TikTok have their own AI switch on a post, and Meta asks for a visible label on ads where the synthetic image is on screen for more than a few seconds.',
      nl: 'Geen achtergrondregel. Instagram en TikTok hebben een eigen AI-schakelaar op een post, en Meta vraagt een zichtbaar label op advertenties waar het gemaakte beeld langer dan een paar seconden in beeld is.',
    },
  },
  {
    id: 'google',
    name: 'Google Shopping',
    requiresWhite: false,
    modelsOnMain: true,
    modelShotRisk: false,
    formats: ['jpg', 'png', 'webp'],
    note: {
      en: 'No background rule, but the AI disclosure has to be in the file: Google requires the IPTC DigitalSourceType property and says not to strip it. Our jpg and png deliveries carry it; a webp does not, because the conversion drops it — so take the jpg for this channel.',
      nl: 'Geen achtergrondregel, maar de AI-vermelding moet ín het bestand zitten: Google vereist de IPTC-eigenschap DigitalSourceType en zegt die niet te verwijderen. Onze jpg- en png-bestanden dragen hem; een webp niet, omdat de conversie hem weggooit — neem voor dit kanaal dus de jpg.',
    },
  },
];

/** Channels whose main image has to be pure white. */
export const WHITE_CHANNELS = CHANNELS.filter((c) => c.requiresWhite).map((c) => c.id);

/** Channels whose model-view rules may not accept an AI-generated person. */
export const RISK_CHANNELS = CHANNELS.filter((c) => c.modelShotRisk).map((c) => c.id);

export const CHANNEL_IDS = CHANNELS.map((c) => c.id);

/** A channel's display name in one language — some are brands, some are words. */
export function channelName(channel, lang = 'en') {
  return typeof channel.name === 'string' ? channel.name : channel.name[lang];
}

export const COPY = {
  en: {
    label: 'Where will you sell these?',
    lead: 'Pick every place these images are going. It changes what we can deliver, and we would rather find that out now than after you upload.',
    hint: 'Not sure yet? Leave it — we deliver on pure white, which is the safest answer everywhere.',
    whiteWarnH: 'The background is fixed to pure white',
    whiteWarn: 'Amazon, bol and Zalando all require a pure white main image, and Amazon checks it automatically. The background choice below is locked to #FFFFFF for this order.',
    splitH: 'Want your own background as well?',
    split: 'Order the same product twice: one marketplace version on white, and one for your own shop and socials in the colour you want. The second one counts as a normal product, so it is charged at the rate your total lands on — not as a surcharge.',
    riskH: 'About Zalando and the on-model shot',
    risk: 'Zalando asks for model views photographed with a real person. Our on-model shot is generated, so we cannot promise it will be accepted as a compliant model view — the packshots are a different matter and meet their spec. If Zalando is where this range lives, use our images for the pack views and talk to us before you count on the model one.',
    formatH: 'You will get jpg',
    format: 'Zalando takes JPG only and Amazon does not accept webp, so a marketplace order is delivered as jpg rather than webp. That also keeps the AI disclosure inside the file, which webp conversion strips.',
    orderH: 'Which image goes first',
    order: 'bol allows no model on the main image, and Amazon only allows one there for apparel. This costs you nothing: the on-model shot stays in your set, it simply belongs among the additional images. Lead with the front packshot, then the back, the close-up and the on-model shot behind it.',
  },
  nl: {
    label: 'Waar ga je deze verkopen?',
    lead: 'Kies elke plek waar deze beelden heen gaan. Het bepaalt wat we kunnen leveren, en dat weten we liever nu dan nadat je hebt geüpload.',
    hint: 'Nog niet zeker? Laat het staan — we leveren op zuiver wit, en dat is overal het veiligste antwoord.',
    whiteWarnH: 'De achtergrond staat vast op zuiver wit',
    whiteWarn: 'Amazon, bol en Zalando eisen allemaal een zuiver witte hoofdafbeelding, en Amazon controleert dat automatisch. De achtergrondkeuze hieronder staat voor deze bestelling vast op #FFFFFF.',
    splitH: 'Wil je ook je eigen achtergrond?',
    split: 'Bestel hetzelfde product twee keer: één marktplaatsversie op wit, en één voor je eigen shop en socials in de kleur die je wilt. Die tweede telt gewoon als een extra product, dus je betaalt het tarief waar je totaal op uitkomt — geen toeslag.',
    riskH: 'Over Zalando en de on-model shot',
    risk: 'Zalando vraagt om modelbeelden die met een echte persoon zijn gefotografeerd. Onze on-model shot is gegenereerd, dus we kunnen niet beloven dat die als geldig modelbeeld wordt geaccepteerd — de packshots zijn een ander verhaal en voldoen wél aan hun eisen. Zit je lijn op Zalando, gebruik onze beelden dan voor de packviews en overleg met ons voordat je op de modelfoto rekent.',
    formatH: 'Je krijgt jpg',
    format: 'Zalando accepteert alleen JPG en Amazon neemt geen webp, dus een marktplaatsbestelling wordt als jpg geleverd in plaats van webp. Daarmee blijft de AI-vermelding ook in het bestand zitten, die webp-omzetting eruit haalt.',
    orderH: 'Welk beeld vooraan hoort',
    order: 'bol staat geen model op de hoofdafbeelding toe, en Amazon alleen bij kleding. Dat kost je niets: de on-model shot blijft gewoon in je set, hij hoort alleen bij de extra afbeeldingen. Zet de voorkant-packshot vooraan, en daarachter de achterkant, de close-up en de on-model shot.',
  },
};

export function copy(lang = 'en') {
  return COPY[lang === 'nl' ? 'nl' : 'en'];
}
