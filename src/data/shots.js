// VISUAILS — the four shots we ask a customer to send, per product.
//
// WHY THIS EXISTS
// Lucas's ask, August 2026: "het uploaden van producten moet logischer worden.
// Nu is het 1 knop, ookal besteld iemand 25 producten." The order form staged
// files into a flat batch with no idea which product any of them belonged to,
// which pushed the entire sorting problem onto the studio AFTER the order —
// and gave the customer no way to know whether what they sent was enough.
//
// THE SYMMETRY THAT MAKES THIS EXPLAINABLE. A catalog set delivers exactly
// four images: front, back, a fabric-or-logo close-up, and one on-model shot
// (PER_PRODUCT in pricing.js says so, and it is what the studio ships). So the
// four things we ask for are the same four things that come back. That is not
// a coincidence to hide — it is the clearest possible instruction, because the
// customer can see what each photo is FOR.
//
// FRONT AND BACK ARE BOTH REQUIRED, and that is a real rule, not a soft one.
// Lucas, August 2026: "voor catalog is voorkant en achterkant verplicht omdat
// deze beide worden geleverd anders is het gokken."
//
// The reasoning is the symmetry above, read the other way round. A catalog set
// SHIPS a back image. Producing one from a front photograph is not inference,
// it is invention — a print, a yoke seam or a logo that exists only on the back
// cannot be read off the front, so what the customer receives is a picture of a
// garment they do not sell. The two shots that come back as literal deliverables
// are therefore the two we will not proceed without. This file used to require
// the front alone and describe the back as merely making things "more accurate",
// which under-sold a shot the studio cannot honestly fake.
//
// THE OTHER TWO STAY OPTIONAL, for two different reasons, and the difference is
// worth keeping straight:
//   detail — the product may simply not have one. Lucas: "bijvoorbeeld als deze
//     er niet op staat." Where there is no logo, print or hardware to close in
//     on, the delivered close-up becomes a fabric shot instead, so the set is
//     still four images either way. Sending your own only makes that one truer.
//   worn — it is about fit, and fit can be READ from a flat photo. A worse
//     reading than a real one, but a reading rather than a fabrication.
// What each optional shot buys is written into `buys` below, because
// "recommended" with no reason attached is just nagging — a customer who knows
// what skipping costs can make the trade themselves.
//
// WHAT WE DO NOT DO: refuse an order, block a step, or mark a product invalid
// for a missing optional shot. The only hard gate is a front and a back per
// product, and even that only applies once a customer has started uploading at
// all — uploads are optional on every path through /start, and a client who
// would rather send files over WhatsApp afterwards is a client, not an error
// state.

/**
 * The four, in the order they are asked for. `id` is what travels in the R2
 * object's customMetadata, so it is a stable key: renaming one is a migration,
 * not a copy edit.
 */
// De bovengrens van het aantal extra foto's staat in pricing.js, samen met wat
// ze kosten. Zie isExtraShotId() onderaan voor waarom hij hier nodig is.
// pricing.js importeert niets uit dit bestand, dus dit maakt geen cyclus.
import { MAX_EXTRA_PER_PRODUCT as MAX_EXTRA } from './pricing.js';

export const SHOTS = [
  {
    id: 'front',
    required: true,
    name: { en: 'Front', nl: 'Voorkant' },
    how: {
      en: 'The whole product, flat or hanging, straight on. Fill the frame.',
      nl: 'Het hele product, plat of hangend, recht van voren. Vul het beeld.',
    },
    buys: {
      en: 'Everything is built from this one. It is the only shot we cannot work without.',
      nl: 'Alles wordt hieruit opgebouwd. Dit is de enige foto waar we niet zonder kunnen.',
    },
  },
  {
    id: 'back',
    required: true,
    name: { en: 'Back', nl: 'Achterkant' },
    how: {
      en: 'Same distance and angle as the front, turned over.',
      nl: 'Zelfde afstand en hoek als de voorkant, omgedraaid.',
    },
    buys: {
      en: 'A back image is one of the four you get, so this is the one we cannot invent. Anything that exists only on the back — a print, a yoke seam, a logo — would otherwise be a guess we shipped to you.',
      nl: 'Een achterkantbeeld is één van de vier die je krijgt, dus dit is de foto die we niet kunnen verzinnen. Alles wat alléén achterop zit — een print, een pasnaad, een logo — zou anders gokwerk zijn dat we je toesturen.',
    },
  },
  {
    id: 'detail',
    required: false,
    name: { en: 'Detail', nl: 'Detail' },
    how: {
      en: 'Close in on the fabric, a seam, the label or the hardware. One is enough.',
      nl: 'Ga dichtbij op de stof, een naad, het label of de fournituren. Eén is genoeg.',
    },
    buys: {
      en: 'This is what keeps the material honest — the weave, the wash, the sheen. It is the difference between your garment and a garment. If the product has no logo or hardware to close in on, the close-up you get back is a fabric shot instead, and this is the photo it is read from.',
      nl: 'Dit houdt het materiaal eerlijk — de weving, de wassing, de glans. Het verschil tussen jouw kledingstuk en een kledingstuk. Heeft het product geen logo of fournituren om op in te zoomen, dan wordt de close-up die je terugkrijgt een stoffoto, en dit is de foto waar die van gelezen wordt.',
    },
  },
  {
    id: 'worn',
    required: false,
    name: { en: 'Worn', nl: 'Gedragen' },
    how: {
      en: 'Anyone wearing it, any phone, any room. It is for the fit, not for the picture.',
      nl: 'Wie dan ook die het draagt, elke telefoon, elke kamer. Het gaat om de pasvorm, niet om de foto.',
    },
    buys: {
      en: 'How it actually hangs on a body — the drop of the shoulder, where the hem lands, how oversized oversized really is. Without it the on-model shot is our best reading of a flat photo.',
      nl: 'Hoe het echt op een lichaam valt — de val van de schouder, waar de zoom eindigt, hoe oversized oversized werkelijk is. Zonder deze is het on-model beeld onze beste inschatting van een platte foto.',
    },
  },
];

export const SHOT_IDS = SHOTS.map((s) => s.id);
export const SHOTS_PER_PRODUCT = SHOTS.length;

/**
 * The shots a product cannot be counted as ready without, in asking order.
 *
 * Plural since August 2026. This used to be `REQUIRED_SHOT`, a single id found
 * with `SHOTS.find(s => s.required).id`, and every caller compared against it
 * with `===`. That singular is deliberately GONE rather than kept pointing at
 * the front: a stale export that still answers to its old name is how a second
 * required shot gets silently ignored at one of the five call sites that used
 * it. Anything that needs the test now has to ask isRequiredShot().
 */
export const REQUIRED_SHOT_IDS = SHOTS.filter((s) => s.required).map((s) => s.id);

/** Is this one of the shots we will not proceed without? */
export function isRequiredShot(id) {
  return REQUIRED_SHOT_IDS.includes(id);
}

/** Is this a shot id we are willing to store? Anything else is refused. */
/*
 * ── DE EXTRA FOTO'S HEBBEN OOK EEN SLOT NODIG ────────────────────────────────
 *
 * Lucas, 8 augustus 2026: *"een extra foto toevoegen zou een extra upload vak
 * moeten openen maar opent nu een tekstblok. Wanneer je 1 extra foto kiest krijg
 * je 1 upload mogelijkheid erbij met daaronder een verplichte notitie van wat de
 * klant wilt, foto is niet verplicht notitie wel."*
 *
 * Een bijbestelde foto is een BESCHRIJVING, niet een hoek. De klant zegt wat het
 * moet worden en mag er een voorbeeld bij leggen — daarom is de notitie verplicht
 * en de foto niet. Dat is de omgekeerde verhouding van de vier vaste sloten
 * hierboven, en precies daarom horen ze niet in SHOTS: die lijst drijft de vaste
 * hoeken, hun tekeningen, hun labels en hun verplichting.
 *
 * WAAROM ZE TOCH DOOR isShotId() MOETEN. /api/upload weigert elke `shot` die
 * deze functie niet kent — een gesloten verzameling, en dat hoort zo. Zonder deze
 * uitbreiding zou elke extra foto met 400 bad-shot terugkomen. De id draagt zijn
 * nummer ('extra2'), zodat de studio in R2 leest waar het beeld bij hoort zonder
 * een tabel nodig te hebben.
 *
 * De bovengrens komt uit pricing.js — MAX_EXTRA_PER_PRODUCT is ook wat de teller
 * in het formulier begrenst en wat er geprijsd wordt. Hem hier overtypen zou
 * betekenen dat de server een vijfde foto aanneemt die niemand kan bestellen.
 */
export const EXTRA_SHOT_PREFIX = 'extra';

/** 'extra1', 'extra2', … — het nummer zoals de klant het ziet, dus vanaf 1. */
export function extraShotId(n) {
  return `${EXTRA_SHOT_PREFIX}${n}`;
}

export function isExtraShotId(id, max) {
  if (typeof id !== 'string') return false;
  const m = new RegExp(`^${EXTRA_SHOT_PREFIX}([1-9][0-9]?)$`).exec(id);
  if (!m) return false;
  const n = Number.parseInt(m[1], 10);
  const cap = Number.isFinite(max) && max > 0 ? max : MAX_EXTRA;
  return n >= 1 && n <= cap;
}

export function isShotId(id) {
  if (typeof id !== 'string') return false;
  return SHOT_IDS.includes(id) || isExtraShotId(id);
}

/** One shot by id, or undefined. */
export function shot(id) {
  return SHOTS.find((s) => s.id === id);
}

/**
 * Guess which slot a filename is for.
 *
 * WHY GUESS AT ALL. A customer who exports from their own system usually has
 * the shot in the filename already — `TSHIRT-01-front.jpg`, `hoodie_back.png`,
 * `sku123 detail 2.heic`. Asking them to re-state in the UI what the filename
 * already says is the kind of small insult that makes a form feel long. When
 * the guess is wrong they move it; when there is no guess the file lands in the
 * first empty slot, which is right far more often than it is wrong because
 * people photograph in this order.
 *
 * Matches both languages and the obvious abbreviations. Deliberately does NOT
 * match bare numbers — `IMG_0234` says nothing, and pretending otherwise would
 * put a detail shot in the front slot with confidence.
 */
const HINTS = {
  front: ['front', 'voor', 'voorkant', 'f'],
  back: ['back', 'achter', 'achterkant', 'rug', 'b'],
  detail: ['detail', 'close', 'closeup', 'close-up', 'macro', 'label', 'stof', 'fabric', 'd'],
  worn: ['worn', 'gedragen', 'model', 'onmodel', 'on-model', 'fit', 'pasvorm', 'w'],
};

export function guessShot(filename) {
  const base = String(filename || '').toLowerCase().replace(/\.[a-z0-9]+$/, '');
  // Word-ish boundaries only: a token has to sit between separators, or be the
  // whole name. Without this, "brochure" matches 'b' → back, and "storefront"
  // matches 'front' for a photo of a shop.
  const tokens = base.split(/[^a-z]+/).filter(Boolean);
  for (const [id, hints] of Object.entries(HINTS)) {
    if (tokens.some((t) => hints.includes(t))) return id;
  }
  return null;
}

/**
 * Split a path into a product key and a filename.
 *
 * Browsers give a folder drop as `webkitRelativePath`: `SS26/TSHIRT-01/front.jpg`.
 * The LAST folder is the product — the ones above it are the customer's own
 * organisation and mean nothing to us. A loose file has no folder, so it has no
 * product key and lands in the tray for the customer to place.
 */
export function productKeyFromPath(relativePath) {
  const parts = String(relativePath || '').split('/').filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : null;
}

export const COPY = {
  en: {
    h: 'Your product photos',
    lead: 'One product at a time. The front and the back are both required — both come back to you as delivered images, so neither is ours to guess. The other two are optional and each makes one specific thing more accurate.',
    bulkH: 'Have them all ready?',
    bulkLead: 'Drop the whole lot in and we will sort them. A folder per product works best — we read the folder name as the product.',
    bulkCta: 'Drop files or folders',
    manualH: 'Or fill them in one by one',
    required: 'Required',
    optional: 'Optional',
    skipShot: 'Skip this one',
    undoSkip: 'Add it after all',
    replace: 'Replace',
    remove: 'Remove',
    productName: 'Product name or SKU',
    productNameHint: 'Whatever you call it in your own shop. It comes back on the files with the same name.',
    ready: 'Ready',
    // Names what is missing rather than restating the rule. A card that says
    // "needs a front photo" to a customer who sent one and skipped the back is
    // telling them to look in the wrong place.
    needsShots: 'Needs {list}',
    listAnd: 'and',
    // Extra photos — priced in pricing.js (EXTRA_PHOTO_LADDER). The counter is
    // on every card because the choice is per product; the description field
    // only appears once the counter is above zero, so a 25-product order with
    // no extras shows 25 steppers and not one empty textarea.
    extraH: 'Extra photos',
    extraCount: 'How many?',
    extraNote: 'What should they be?',
    extraPlaceholder: 'e.g. close-up of the model cropped at the neck',
    // Eén rij per bijbestelde foto. Het nummer staat erin omdat de klant met
    // meerdere rijen tegelijk werkt en anders drie identieke labels ziet.
    extraSlot: 'Extra {n}',
    extraNoteLabel: 'What should Extra {n} be?',
    // De notitie is verplicht en de foto niet — zie de noot bij isExtraShotId().
    // Deze zin wordt de melding in het foutvak ÉN in de bubbel van de browser,
    // dus hij moet zeggen welk veld het is en niet "vul dit in".
    extraNoteErr: 'Describe what Extra {n} should be before you continue.',
    extraShotHint: 'A reference is optional — describe it and we will make it.',
    extraRate: '{rate} each at this order size, up to {max} per product.',
    ownModel: 'Yours only',
    trayH: 'Not placed yet',
    trayLead: 'We could not tell which product these belong to. Drag one onto a slot, or use the menu on it.',
    trayAssign: 'Place this',
    progress: '{done} of {total} products ready',
    progressOne: '{done} of 1 product ready',
    progressExtra: '{n} optional photos added',
    progressExtraOne: '1 optional photo added',
    allDone: 'All {total} products have what we need.',
    allDoneOne: 'That product has what we need.',
    laterH: 'Rather send them later?',
    laterLead: 'Order now and send the photos afterwards — you get a link the moment the order is in, and the studio does not start until they arrive.',
    quality: 'Any phone, any daylight, any plain surface. We are not judging the photograph — we are reading the product off it.',
  },
  nl: {
    h: 'Je productfoto’s',
    lead: 'Eén product tegelijk. De voorkant en de achterkant zijn allebei verplicht — je krijgt ze allebei terug als geleverd beeld, dus geen van beide is aan ons om te raden. De andere twee zijn optioneel en maken elk één ding nauwkeuriger.',
    bulkH: 'Heb je ze allemaal klaar?',
    bulkLead: 'Sleep de hele hoop erin, dan sorteren wij. Een map per product werkt het best — we lezen de mapnaam als het product.',
    bulkCta: 'Sleep bestanden of mappen',
    manualH: 'Of vul ze één voor één in',
    required: 'Verplicht',
    optional: 'Optioneel',
    skipShot: 'Sla deze over',
    undoSkip: 'Toch toevoegen',
    replace: 'Vervangen',
    remove: 'Verwijderen',
    productName: 'Productnaam of SKU',
    productNameHint: 'Hoe je het zelf in je shop noemt. Het komt met dezelfde naam terug op de bestanden.',
    ready: 'Klaar',
    needsShots: 'Mist {list}',
    listAnd: 'en',
    extraH: 'Extra foto’s',
    extraCount: 'Hoeveel?',
    extraNote: 'Wat moeten het worden?',
    extraPlaceholder: 'bijv. close-up van het model bijgesneden bij de hals',
    extraSlot: 'Extra {n}',
    extraNoteLabel: 'Wat moet Extra {n} worden?',
    extraNoteErr: 'Beschrijf wat Extra {n} moet worden voordat je verdergaat.',
    extraShotHint: 'Een voorbeeldfoto mag, hoeft niet — beschrijf het en wij maken het.',
    extraRate: '{rate} per stuk bij deze bestelgrootte, tot {max} per product.',
    ownModel: 'Alleen van jou',
    trayH: 'Nog niet geplaatst',
    trayLead: 'We konden niet zien bij welk product deze horen. Sleep er een op een vakje, of gebruik het menu erop.',
    trayAssign: 'Plaats deze',
    progress: '{done} van {total} producten klaar',
    progressOne: '{done} van 1 product klaar',
    progressExtra: '{n} optionele foto’s toegevoegd',
    progressExtraOne: '1 optionele foto toegevoegd',
    allDone: 'Alle {total} producten hebben wat we nodig hebben.',
    allDoneOne: 'Dat product heeft wat we nodig hebben.',
    laterH: 'Liever later opsturen?',
    laterLead: 'Bestel nu en stuur de foto’s daarna — je krijgt een link zodra de bestelling binnen is, en de studio begint pas als ze er zijn.',
    quality: 'Elke telefoon, elk daglicht, elke egale ondergrond. We beoordelen de foto niet — we lezen het product eraf.',
  },
};

export function copy(lang = 'en') {
  return COPY[lang === 'nl' ? 'nl' : 'en'];
}
