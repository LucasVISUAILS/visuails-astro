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
// De bovengrens van het aantal extra foto’s staat in pricing.js, samen met wat
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
    /* NIET "één van de vier die je krijgt". Deze lijst staat op ELKE
       bestelpagina, en een lifestyle-carousel levert er drie, geen vier. Het
       argument voor deze foto heeft dat getal ook niet nodig: de achterkant is
       de enige kant die we niet kunnen afleiden uit de voorkant, en dat geldt
       bij elk aantal. */
    buys: {
      en: 'The back is the one side we cannot work out from the front. Anything that exists only there — a print, a yoke seam, a logo — would otherwise be a guess we shipped to you.',
      nl: 'De achterkant is de enige kant die we niet uit de voorkant kunnen afleiden. Alles wat alléén daar zit — een print, een pasnaad, een logo — zou anders gokwerk zijn dat we je toesturen.',
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
      nl: 'Dit houdt het materiaal eerlijk — de weefselstructuur, de wassing, de glans. Het verschil tussen jouw kledingstuk en een kledingstuk. Heeft het product geen logo of fournituren om op in te zoomen, dan wordt de close-up die je terugkrijgt een stoffoto, en dit is de foto waar die van gelezen wordt.',
    },
  },
  {
    id: 'worn',
    required: false,
    name: { en: 'Worn', nl: 'Gedragen' },
    how: {
      en: 'Anyone wearing it, any phone, any room. It is for the fit, not for the picture.',
      nl: 'Wie het ook draagt, elke telefoon, elke kamer. Het gaat om de pasvorm, niet om de foto.',
    },
    buys: {
      en: 'How it actually hangs on a body — the drop of the shoulder, where the hem lands, how oversized oversized really is. Without it the on-model shot is our best reading of a flat photo.',
      nl: 'Hoe het echt op een lichaam valt — de val van de schouder, waar de zoom eindigt, hoe oversized oversized werkelijk is. Zonder deze is de on-model foto onze beste inschatting van een platte foto.',
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

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EN DE GRATIS REFERENTIEFOTO'S — 13 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Ook wil ik dat het mogelijk word voor een bezoeker om meer foto’s toe
 * te voegen van zijn product kosteloos door op een plusje naast de 4 aanbevolen
 * foto’s te klikken. Dit zorgt ervoor dat ze meer details kunnen laten zien maar
 * wel gewoon 4 foto’s in totaal krijgen, wel moet de optie voor een extra foto
 * behouden worden als apart vak die gewoon de huidige extra prijs behouden."*
 *
 * ── TWEE DINGEN DIE ALLEBEI "EXTRA" HEETTEN, EN DAT MOCHT NIET ─────────────
 *
 * Er zijn nu twee soorten vakjes die er bij kunnen komen, en ze zijn elkaars
 * tegenpool:
 *
 *   REFERENTIE (`ref1`, `ref2`, …)  Gratis. INVOER. Nog een foto van hetzelfde
 *     product zodat wij het beter zien — een tweede detail, de binnenkant, het
 *     label. Levert GEEN extra beeld op: de klant krijgt nog steeds zijn vier.
 *     Geen notitie verplicht, want er valt niets te beschrijven; het is materiaal.
 *
 *   EXTRA (`extra1`, `extra2`, …)   Betaald. UITVOER. Een beeld dat de klant
 *     erbij BESTELT, met een verplichte notitie omdat wij moeten weten wat het
 *     moet worden, en met een prijs uit EXTRA_PHOTO_LADDER.
 *
 * Als die twee één woord zouden delen, dan is er een dag waarop een gratis vakje
 * wordt geprijsd of een betaald vakje gratis wordt geleverd. Vandaar een eigen
 * voorvoegsel, een eigen bovengrens, en een eigen plek voor die grens: de betaalde
 * staat in pricing.js want hij kost geld, deze staat hier want hij is alleen een
 * vakje dat het formulier tekent.
 *
 * ── VIER, HETZELFDE GETAL ALS DE BETAALDE ──────────────────────────────────
 *
 * Niet omdat het moet, maar omdat één getal om te onthouden beter is dan twee. Het
 * plafond bestaat wél echt: elk vakje is een bestand dat naar R2 gaat, en
 * MAX_BATCH_FILES in uploads.js rekent hiermee. Onbegrensd zou betekenen dat één
 * bestelling het plafond van de hele batch kan opeten.
 */
export const REF_SHOT_PREFIX = 'ref';

/** Hoeveel gratis referentiefoto's een product erbij mag hebben. */
export const MAX_REF_PER_PRODUCT = 4;

/** 'ref1', 'ref2', … — het nummer zoals de klant het ziet, dus vanaf 1. */
export function refShotId(n) {
  return `${REF_SHOT_PREFIX}${n}`;
}

export function isRefShotId(id, max) {
  if (typeof id !== 'string') return false;
  const m = new RegExp(`^${REF_SHOT_PREFIX}([1-9][0-9]?)$`).exec(id);
  if (!m) return false;
  const n = Number.parseInt(m[1], 10);
  const cap = Number.isFinite(max) && max > 0 ? max : MAX_REF_PER_PRODUCT;
  return n >= 1 && n <= cap;
}

/** Het nummer uit 'ref2', of 0 als dit geen referentievakje is. */
export function refShotNumber(id) {
  const m = new RegExp(`^${REF_SHOT_PREFIX}([1-9][0-9]?)$`).exec(String(id || ''));
  return m ? Number.parseInt(m[1], 10) : 0;
}

/**
 * Kent /api/upload dit vakje?
 *
 * Een gesloten verzameling, en dat hoort zo: alles wat hier niet in staat, komt
 * terug met 400 bad-shot. Een referentievakje dat hier zou ontbreken, zou dus
 * precies zo stil mislukken als de extra's dat voor 8 augustus deden.
 */
export function isShotId(id) {
  if (typeof id !== 'string') return false;
  return SHOT_IDS.includes(id) || isExtraShotId(id) || isRefShotId(id);
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
    /* De korte vorm boven de kaarten; de lange staat in de uitklapper eronder. */
    leadShort: 'Front and back are required; a detail and a worn shot make the result more accurate.',
    lead: 'One product at a time. The front and the back are both required — both come back to you as delivered images, so neither is ours to guess. The other two are optional and each makes one specific thing more accurate.',
    bulkH: 'Have them all ready?',
    bulkLead: 'Drop the whole lot in and we will sort them. A folder per product works best — we read the folder name as the product.',
    bulkCta: 'Drop files or folders',
    manualH: 'Fill them in per product',
    /* DE KNOP STOND LEEG IN DE MARKUP. pipeline.js zette er tekst in, maar tot
       dat script gedraaid had — en als het nooit draait — rendert er een lege
       spookknop die een schermlezer als "knop" aankondigt, zonder te zeggen
       wat hij doet. De tekst staat nu in de pagina; het script schrijft er
       daarna dezelfde tekst overheen. */
    addProduct: 'Add another product',
    // ── DE TWEE MANIEREN ZIJN NIET GELIJKWAARDIG MEER ────────────────────────
    // Lucas, 8 augustus 2026: *"Laat de klant kiezen om een hele map op te sturen
    // of via het invoerscherm in te vullen met invulscherm als voorkeur omdat map
    // onoverzichtelijk is en ik waarschijnlijk contact op moet gaan nemen met de
    // klant over wat hij precies wilt."*
    //
    // Dus zegt de tekst dat ook. De maproute is niet verboden en niet weggestopt
    // — hij is sneller en voor een klant met een exportmap de enige redelijke weg
    // — maar hij kost een gesprek achteraf, en dat hoort iemand te weten vóórdat
    // hij hem kiest en niet erna.
    toFolder: 'Rather send one whole folder?',
    toFolderWhy: 'Faster, less precise: we read the folder name as the product, and we usually have to come back to you to ask what is what.',
    toCards: 'Fill them in per product instead',
    toCardsWhy: 'Takes longer and needs nothing from us afterwards — every photo is already against the right product and the right angle.',
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
    ownLook: 'Your look',
    ownLookH: 'Your own look',
    ownLookHint: 'Made for your brand and held to on every order. Pick it here, or keep the standard look for this order.',
    ownLookNone: 'Standard look for this order',
    trayH: 'Not placed yet',
    trayLead: 'We could not tell which product these belong to. Drag one onto a slot, or use the menu on it.',
    trayAssign: 'Place this',
    progress: '{done} of {total} products ready',
    progressOne: '{done} of 1 product ready',
    /* De tussenstap bij ontbrekende verplichte foto's — 3 september 2026. Geen
       poort: de tweede knop stuurt gewoon door. Wél het gevolg erbij. */
    missingH: '{n} products are still missing a required photo',
    missingHOne: '1 product is still missing a required photo',
    missingBody: 'You can send the order anyway. Production then starts once the missing photos are in, and we will contact you to ask for them — which usually costs a day.',
    missingMore: 'and {n} more',
    missingFix: 'Add the photos',
    missingGo: 'Send without them',
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
    leadShort: 'Voor- en achterkant zijn verplicht; een detail en een gedragen foto maken het resultaat nauwkeuriger.',
    lead: 'Eén product tegelijk. De voorkant en de achterkant zijn allebei verplicht — je krijgt ze allebei terug als geleverde foto, dus geen van beide is aan ons om te raden. De andere twee zijn optioneel en maken elk één ding nauwkeuriger.',
    bulkH: 'Heb je ze allemaal klaar?',
    bulkLead: 'Sleep de hele hoop erin, dan sorteren wij. Een map per product werkt het best — we lezen de mapnaam als het product.',
    bulkCta: 'Sleep bestanden of mappen',
    manualH: 'Vul ze per product in',
    addProduct: 'Nog een product toevoegen',
    // Zie de EN-tabel voor waarom deze twee wegen niet meer gelijkwaardig zijn.
    toFolder: 'Liever één hele map sturen?',
    toFolderWhy: 'Sneller, minder precies: we lezen de mapnaam als het product, en meestal moeten we daarna bij je terugkomen om te vragen welke foto bij welk product hoort.',
    toCards: 'Toch per product invullen',
    toCardsWhy: 'Kost meer tijd en daarna niets meer van ons — elke foto staat dan al bij het juiste product en de juiste hoek.',
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
    ownLook: 'Jouw look',
    ownLookH: 'Je eigen look',
    ownLookHint: 'Voor jouw merk gemaakt en in elke bestelling vastgehouden. Kies hem hier, of houd voor deze bestelling de standaardlook.',
    ownLookNone: 'Standaardlook voor deze bestelling',
    trayH: 'Nog niet geplaatst',
    trayLead: 'We konden niet zien bij welk product deze horen. Sleep er een op een vakje, of gebruik het menu erop.',
    trayAssign: 'Plaats deze',
    progress: '{done} van {total} producten klaar',
    progressOne: '{done} van 1 product klaar',
    missingH: 'Bij {n} producten mist nog een verplichte foto',
    missingHOne: 'Bij 1 product mist nog een verplichte foto',
    missingBody: 'Je kunt de bestelling toch versturen. De productie start dan pas als de ontbrekende foto’s binnen zijn, en we nemen contact met je op om ze te vragen — dat kost meestal een dag.',
    missingMore: 'en nog {n}',
    missingFix: 'Foto’s toevoegen',
    missingGo: 'Toch versturen',
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

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * WANNEER EEN AANGELEVERDE FOTO HET NIET HAALT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAT ER TOT 23 AUGUSTUS 2026 GECONTROLEERD WERD ──────────────────────────
 *
 * Het type, of het bestand leeg was, of het boven de 25 MB uitkwam, en of het
 * vakje bestond. Alle vier gaan over het BESTAND. Geen ervan gaat over de FOTO,
 * en dat is precies het verschil dat de klant merkt: een screenshot van 40 kB
 * van een productpagina komt er zonder klacht doorheen en wordt pas een
 * probleem als het werk terugkomt en niet goed is.
 *
 * De werklijst noemt er drie — te klein, te donker, te veel compressie — met de
 * toevoeging *"meteen zeggen in plaats van na levering"*. Dat laatste is de hele
 * opdracht: het gaat er niet om dat we het weten, het gaat erom dat de klant het
 * hoort op het moment dat hij nog een andere foto kan kiezen.
 *
 * ── ÉÉN WEIGERING EN TWEE WAARSCHUWINGEN, EN DAT ONDERSCHEID IS HET ONTWERP ──
 *
 * TE KLEIN IS OBJECTIEF. Onder een bepaald aantal pixels is er domweg te weinig
 * beeld om een catalogset uit te halen — dat is geen smaak en geen inschatting,
 * dus dat mag weigeren.
 *
 * TE DONKER EN TE VEEL COMPRESSIE ZIJN VERMOEDENS. Een bewust donkere productfoto
 * bestaat, en een strakke flatlay op wit comprimeert nu eenmaal ver zonder dat
 * er iets mis is. Een vermoeden mag geen deur dichtdoen: die twee melden we, en
 * de foto gaat gewoon mee. Een klep op een heuristiek is een klep die op een
 * dinsdag een echte klant tegenhoudt, en die klant belt niet — die gaat weg.
 *
 * ── DE GETALLEN, EN WAAR ZE VANDAAN KOMEN ───────────────────────────────────
 */

/**
 * De lange zijde in pixels, en de enige harde ondergrens.
 *
 * 1000 is gekozen als de grens waar niets échts onder zit. Een telefoon van tien
 * jaar oud schiet 3000 pixels; wat hieronder binnenkomt is in de praktijk een
 * screenshot, een e-mailbijlage die onderweg is verkleind, of een plaatje dat van
 * een webshop is geplukt. Een échte foto die per ongeluk onder de 1000 valt,
 * bestaat bijna niet — en de zeldzame keer dat het toch gebeurt, is het antwoord
 * "stuur het origineel" hoe dan ook het goede antwoord.
 *
 * NIET HOGER, en dat is een bewuste rem. Elke pixel die we hier extra eisen, is
 * een klant die zijn bestelling niet af krijgt op een foto waar wij wél iets mee
 * kunnen. De ondergrens hoort te vangen wat onbruikbaar is, niet te bepalen wat
 * ideaal is — dat laatste staat als advies op /upload-guidelines.
 */
export const MIN_LANGE_ZIJDE = 1000;

/**
 * Gemiddelde helderheid (0–1) waaronder we het donker noemen.
 *
 * Gemeten als de gemiddelde relatieve luminantie over een verkleinde versie van
 * het beeld. 0,12 ligt onder wat een normaal belichte foto op een normale
 * achtergrond ooit haalt, ook een foto op een donkere ondergrond: die heeft nog
 * altijd een verlicht product in het midden. Wat hieronder zakt, is onderbelicht
 * of in het donker geschoten.
 *
 * Het is en blijft een vermoeden — zie hierboven. Een product op een zwarte
 * achtergrond, van dichtbij, in een studio, kan hier terecht onder komen en is
 * dan gewoon een goede foto. Vandaar dat dit meldt en niet weigert.
 */
export const DONKER_ONDER = 0.12;

/**
 * Bits per pixel waaronder we het te ver gecomprimeerd noemen.
 *
 * bestandsgrootte in bits gedeeld door het aantal pixels. Een JPEG die er goed
 * uitziet zit ruwweg tussen 0,5 en 2; onder de 0,15 zie je blokken in de
 * vlakken en randen om het product heen. Dat is het soort schade die niet te
 * repareren is: wat weg is, is weg, en het wordt zichtbaar juist op de gladde
 * vlakken waar een productfoto uit bestaat.
 *
 * PNG EN AVIF TELLEN NIET MEE. Een PNG van een flatlay op wit is verliesloos en
 * kan alsnog een lage bits-per-pixel halen; AVIF haalt bij gelijke kwaliteit
 * routineus een derde van JPEG. Deze maat zegt alleen iets binnen één
 * compressiefamilie, en de enige waar hij betrouwbaar iets zegt is JPEG — zie
 * de lijst hieronder.
 */
export const DUN_ONDER_BPP = 0.15;

/** De formaten waarvoor de bits-per-pixel-maat betekenis heeft. */
export const BPP_FORMATEN = ['jpg', 'jpeg'];

/**
 * Wat een meting betekent: één code, of niets.
 *
 * ── WAAROM DIT HIER STAAT EN NIET IN pipeline.js ────────────────────────────
 *
 * Het meten zelf hoort in de browser — daar zijn de pixels, zie meetBeeld() in
 * src/scripts/pipeline.js. Het OORDEEL hoort naast de drempels, en wel om een
 * praktische reden: pipeline.js draait alleen in een browser en is dus alleen te
 * toetsen met een echte browser eromheen. Deze functie is pure rekenkunde op
 * drie getallen, en die hoort toetsbaar te zijn zonder er een Chromium bij op te
 * starten. Zie tests/beeldkeuring.test.mjs.
 *
 * Het is ook de plek waar het antwoord hoort: wie DONKER_ONDER hierboven
 * verandert, ziet in dezelfde blik wat dat doet.
 *
 * @param maat  {{ w, h, mean }} of null als er niet gemeten kon worden
 * @param ext   de extensie in kleine letters, zonder punt
 * @param bytes de bestandsgrootte
 * @returns {{ code, hard, ... }} of null als er niets te melden is
 */
export function keurBeeld(maat, ext, bytes) {
  if (!maat) return null;

  const lang = Math.max(Number(maat.w) || 0, Number(maat.h) || 0);
  if (lang > 0 && lang < MIN_LANGE_ZIJDE) {
    return { code: 'te-klein', hard: true, min: MIN_LANGE_ZIJDE, lang };
  }

  /* VOLGORDE IS BETEKENIS. Te klein wint van de andere twee: een screenshot van
     300 pixels is meestal óók donker en óók dun, en drie meldingen over hetzelfde
     bestand zeggen minder dan één. De klant moet weten wat hij moet doen, en dat
     is hier "stuur het origineel" — de rest volgt daaruit vanzelf. */
  /* `maat.mean == null` EERST, en dat is geen stijl. `Number(null)` is 0 en
     `Number.isFinite(0)` is waar, dus een meting waarin de helderheid ONTBREEKT
     leest als pikzwart en zou elke foto als te donker melden. Dat is geen
     verzonnen geval: meetBeeld() geeft precies die vorm terug — afmetingen wél,
     `mean: null` — als de browser het canvas weigert. De melding zou dan afgaan
     op álles, wat erger is dan hem niet hebben. */
  const gem = maat.mean == null ? NaN : Number(maat.mean);
  if (Number.isFinite(gem) && gem < DONKER_ONDER) {
    return { code: 'te-donker', hard: false, mean: gem };
  }

  /* Alleen op de formaten waar bits-per-pixel iets zegt. Een verliesloze PNG
     haalt op een flatlay op wit routineus een lagere waarde dan een matige JPEG,
     en die als "te ver gecomprimeerd" melden zou de melding waardeloos maken. */
  const px = (Number(maat.w) || 0) * (Number(maat.h) || 0);
  if (px > 0 && Number(bytes) > 0 && BPP_FORMATEN.includes(String(ext || '').toLowerCase())) {
    const bpp = (Number(bytes) * 8) / px;
    if (bpp < DUN_ONDER_BPP) return { code: 'te-dun', hard: false, bpp };
  }
  return null;
}
