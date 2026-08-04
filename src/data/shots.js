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
// ONLY THE FRONT IS REQUIRED, and that is a real rule, not a soft one.
// Everything is generated from the front shot; the other three each make one
// specific thing more accurate, and a customer who has only a front shot must
// still be able to order. What each optional shot buys is written into `buys`
// below, because "recommended" with no reason attached is just nagging — a
// customer who knows what skipping costs can make the trade themselves.
//
// WHAT WE DO NOT DO: refuse an order, block a step, or mark a product invalid
// for a missing optional shot. The only hard gate is a front shot per product,
// and even that only applies once a customer has started uploading at all —
// uploads are optional on every path through /start, and a client who would
// rather send files over WhatsApp afterwards is a client, not an error state.

/**
 * The four, in the order they are asked for. `id` is what travels in the R2
 * object's customMetadata, so it is a stable key: renaming one is a migration,
 * not a copy edit.
 */
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
    required: false,
    name: { en: 'Back', nl: 'Achterkant' },
    how: {
      en: 'Same distance and angle as the front, turned over.',
      nl: 'Zelfde afstand en hoek als de voorkant, omgedraaid.',
    },
    buys: {
      en: 'Without it we infer the back from the front, and anything only on the back — a print, a yoke seam, a logo — is a guess.',
      nl: 'Zonder deze leiden we de achterkant af uit de voorkant, en alles wat alléén achterop zit — een print, een pasnaad, een logo — is gokwerk.',
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
      en: 'This is what keeps the material honest — the weave, the wash, the sheen. It is the difference between your garment and a garment.',
      nl: 'Dit houdt het materiaal eerlijk — de weving, de wassing, de glans. Het verschil tussen jouw kledingstuk en een kledingstuk.',
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
export const REQUIRED_SHOT = SHOTS.find((s) => s.required).id;
export const SHOTS_PER_PRODUCT = SHOTS.length;

/** Is this a shot id we are willing to store? Anything else is refused. */
export function isShotId(id) {
  return typeof id === 'string' && SHOT_IDS.includes(id);
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
    lead: 'One product at a time. Only the front is required — the other three each make one specific thing more accurate, and you can skip any of them.',
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
    needsFront: 'Needs a front photo',
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
    lead: 'Eén product tegelijk. Alleen de voorkant is verplicht — de andere drie maken elk één ding nauwkeuriger, en je mag ze overslaan.',
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
    needsFront: 'Mist een voorkantfoto',
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
