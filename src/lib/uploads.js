// VISUAILS — the staging area for client reference material. Section 10.
//
// Two Functions need the same handful of facts about an upload batch —
// /api/upload writes into it, /api/order reads it out and turns it into rows —
// and a batch is only coherent if both agree on the prefix, the ceiling and what
// a filename is allowed to be. So they live here, once, and neither endpoint
// carries its own copy.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY A STAGING PREFIX EXISTS AT ALL
// files.order_id is NOT NULL and REFERENCES orders(id). That is the right
// constraint — a file row with no order is a file nobody can ever find again —
// and it means an upload cannot become a files row until /api/order has written
// the order. Step 2 of the /start pipeline runs three steps before that submit.
//
// So the object lands in R2 under intake/<batch>/ now, and /api/order turns the
// prefix into rows later. Nothing about the file moves when the order arrives;
// the prefix IS the record until the order catches up, and afterwards the key is
// simply what files.r2_key points at.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE BATCH ID IS PROTECTING
// It is tempting to treat the batch id as a scratch name and not think about its
// entropy. That is wrong, and the reason is /api/order: whoever presents a batch
// id at submit gets those objects attached to THEIR order, and the portal then
// shows an order’s files to whoever holds its token. A guessable batch id is
// therefore a read primitive against another brand's unreleased product photos.
//
// So it is minted by exactly the same function as a portal token — 256 bits of
// crypto.getRandomValues, base64url — and validated with exactly the same shape
// check. Not because a batch id IS a portal token (it grants nothing, is never
// emailed, and dies with the batch) but because it protects the same thing, and
// the audited generator is the one already in the codebase.
//
// The shape check does a second job here that it does not do in the portal: the
// batch id is interpolated into an R2 key. isWellFormedToken admits exactly
// [A-Za-z0-9_-]{43}, so `/` and `..` cannot survive it, and there is no path
// from a client-supplied string to a key outside intake/.
// ─────────────────────────────────────────────────────────────────────────────

import { isWellFormedToken, mintToken } from './token.js';
import { SHOTS_PER_PRODUCT, MAX_REF_PER_PRODUCT, isShotId } from '../data/shots.js';
import { MAX_PRODUCTS_ANY_SERVICE } from '../data/capacity.js';
/* De extra foto’s hebben sinds 8 augustus 2026 een eigen upload-vakje, dus tellen
   ze mee in het plafond hieronder. Uit pricing.js en niet overgetypt: dat is ook
   wat de teller in het formulier begrenst en wat er geprijsd wordt. pricing.js
   importeert zelf niets, dus dit maakt geen cyclus — shots.js leest hem al zo. */
import { MAX_EXTRA_PER_PRODUCT } from '../data/pricing.js';

/** Everything staged lives under here. Nothing else may. */
export const UPLOAD_PREFIX = 'intake';

/** Per file. A phone photo is 3–8 MB; a 25 MB ceiling covers a big one twice over. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Per batch, and DERIVED rather than picked, because the number it has to clear
 * changed underneath it. The old value of 80 assumed "25–30 products, maybe two
 * references each". The order form now asks for FOUR shots per product — front,
 * back, detail, worn — so a full order at the largest size one reserved window
 * holds is 30 × 4 = 120 files, and a customer following the instructions to the
 * letter would have hit the ceiling forty files early.
 *
 * The multiplier is the real one from src/data/shots.js and the product cap is
 * the real one from src/data/capacity.js, so the ceiling moves on its own if
 * either does.
 *
 * ── EN OP 13 AUGUSTUS 2026 WAS HET ALSNOG TE LAAG ───────────────────────────
 *
 * Hier stond `+ 20`, met de uitleg: *"slack for the odd extra reference — a
 * sizing chart, a mood image, a second detail — not a second full set."* Dat was
 * waar op de dag dat het geschreven werd. Diezelfde week kregen de EXTRA FOTO'S
 * hun eigen upload-vakje (zie isExtraShotId in shots.js, 8 augustus: *"een extra
 * foto toevoegen zou een extra upload vak moeten openen"*), en daarmee werd die
 * losse slack een geteld, geprijsd en door het formulier getekend vakje.
 *
 * Wat het formulier maximaal kan tékenen is sindsdien:
 *
 *     30 producten × (4 vaste shots + 4 extra's) = 240 vakjes
 *
 * en het plafond stond op 140. Honderd vakjes die de klant kan openen, kan
 * vullen en betaald heeft, en waarvan de 141e upload terugkomt met `batch-full`.
 * Niet bij een uitzonderlijke bestelling: bij de duurste die we verkopen. En de
 * melding zegt "je batch is vol", wat leest als een fout van de klant.
 *
 * Dus nu ook de extra's erin, uit dezelfde bron die ze prijst en die het
 * formulier begrenst. Geen losse slack meer: elk vakje dat getekend kan worden is
 * geteld, en er is geen vakje dat niet getekend kan worden.
 *
 * Het blijft een script-stop: 240 bestanden van 25 MB is veel geduld voor een
 * aanvaller die toch op veertig uploads per minuut wordt afgeknepen.
 *
 * LET OP BIJ HET VERHOGEN. maxCards() in pipeline.js leidde het aantal
 * productkaarten HIERUIT af (`maxBatchFiles / 4`), dus dit getal verhogen
 * verdubbelde stil het aantal producten dat het formulier aanbood. Die
 * afhankelijkheid staat op de kop en is dezelfde dag omgedraaid: het aantal
 * producten komt uit `cfg.maxProducts`, en het aantal bestanden volgt daaruit.
 * Zie de noot bij maxCards().
 *
 * ── EN DE GRATIS REFERENTIEFOTO'S KOMEN ER NOG BIJ ─────────────────────────
 *
 * Diezelfde dag, later: een klant kan met een plusje extra foto’s van zijn product
 * meesturen zodat wij het beter zien — gratis, en zonder dat hij er een beeld bij
 * krijgt. Zie MAX_REF_PER_PRODUCT in shots.js voor het verschil met de BETAALDE
 * extra's.
 *
 * Ze zijn gratis voor de klant en niet voor de opslag: elk vakje is een bestand
 * dat naar R2 gaat, en het plafond hier is precies de plek waar dat geteld wordt.
 * Dus telt hij mee, in dezelfde som en uit dezelfde bronnen:
 *
 *     30 producten × (4 vaste + 4 betaalde extra's + 4 gratis referenties) = 360
 *
 * Dat is een script-stop en geen verwachting: geen enkele echte bestelling zit in
 * de buurt. Wat het moet dekken is de bestelling die het formulier maximaal kan
 * TEKENEN, want elk vakje dat een klant kan openen en vullen, moet ook aankomen —
 * dat was de fout die vanmorgen op 140 tegen 240 stond.
 */
/* ── EN HET IS NIET MEER DERTIG — 31 augustus 2026 ─────────────────────────
 *
 * Hier stond ATTENDED_PER_WINDOW, en dat was juist zolang elke bestelling in
 * COMPLETE producten geteld werd. Sinds de agenda in beelden rekent, hangt het
 * plafond van een venster af van de dienst: dertig complete producten, of
 * zeventig lifestylecarrousels. Het formulier biedt die zeventig ook echt aan, en
 * elk vakje dat een klant kan openen moet aankomen — precies de fout die op 140
 * tegen 240 stond, nu op 360 tegen 840. */
export const MAX_BATCH_FILES =
  MAX_PRODUCTS_ANY_SERVICE * (SHOTS_PER_PRODUCT + MAX_EXTRA_PER_PRODUCT + MAX_REF_PER_PRODUCT);

/**
 * Extension → the content type we store.
 *
 * The browser's Content-Type is never stored. It is client-controlled, R2 hands
 * stored types straight back on read, and an object typed text/html on
 * visuails.com would be stored XSS on our own origin. Matching on our own table
 * rather than on the upload's own claim is the entire point of this map; a file
 * whose extension is not in here is refused, whatever the browser called it.
 *
 * The order forms all say accept="image/*" and this is what that means.
 */
export const UPLOAD_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
};

/** A fresh batch id. See the header for why this is the portal-token generator. */
export function mintBatch() {
  return mintToken();
}

/** Is this something we are willing to interpolate into a key? Shape only. */
export function isWellFormedBatch(batch) {
  return isWellFormedToken(batch);
}

/** The prefix a batch's objects live under. Trailing slash included, deliberately. */
export function batchPrefix(batch) {
  if (!isWellFormedBatch(batch)) throw new Error('uploads.js: refusing to build a prefix from a malformed batch id');
  return `${UPLOAD_PREFIX}/${batch}/`;
}

/** Is this key inside that batch, and only that batch? */
export function keyBelongsTo(key, batch) {
  if (typeof key !== 'string' || !isWellFormedBatch(batch)) return false;
  return key.startsWith(batchPrefix(batch)) && !key.includes('..');
}

/**
 * How long a product key may be.
 *
 * The key is a label, not an identifier the studio types: the /start uploader
 * mints `p1`…`p30` and the customer's own name for the product travels
 * separately as an ordinary form field. 48 is therefore enormous, and it is
 * enormous on purpose — a cap that has to be raised is a cap that gets removed.
 */
export const MAX_PRODUCT_KEY = 48;

/**
 * A product key we are willing to store in customMetadata.
 *
 * WHY THIS IS NOT safeName(). safeName() flattens a FILENAME, and it keeps `.`
 * because an extension is the part typeFor() reads. A product key has no
 * extension, is never a path segment, and a leading dot in it means nothing —
 * so the two want different alphabets, and one function serving both would be a
 * function whose rules nobody can state. They are also enforced at different
 * points: safeName()'s output is interpolated into an R2 key, and this one's
 * output is NOT — see the note in /api/upload. Nothing here may ever be
 * concatenated into a key without re-reading that note.
 *
 * Everything outside [A-Za-z0-9._-] becomes a hyphen, so no separator, no null
 * byte and no non-ASCII survives — R2 puts customMetadata on the wire as HTTP
 * header values, where a raw newline is a header injection and a raw é is a
 * 400 from the API. Returns '' for anything that flattens to nothing, and ''
 * means "no product", not "a product called nothing".
 */
export function safeProduct(raw) {
  return (raw || '')
    .toString()
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, MAX_PRODUCT_KEY)
    .replace(/[-.]+$/, '');
}

/**
 * Everything staged under a batch, oldest first.
 *
 * `product` and `shot` are the placement /api/upload recorded — which product
 * the customer put this photograph against and which of the four angles it is.
 * Both come back '' when the object predates the per-product uploader or when
 * the file was sent by something that did not say, and every consumer treats ''
 * as "unplaced" rather than as an error: a batch of loose files is still a
 * perfectly good batch, it is just one the studio sorts by hand.
 *
 * `shot` is re-validated on the way out even though it was validated on the way
 * in. The write and the read are years apart in the life of an object and only
 * one of them is in this deploy.
 *
 * Returns [] for a missing binding, a malformed id or an R2 failure — never
 * throws. /api/order calls this while creating an order, and an unreachable
 * bucket must cost the client their reference photos, not their order.
 */
export async function listBatch(env, batch, limit = MAX_BATCH_FILES + 1) {
  if (!env?.UPLOADS || !isWellFormedBatch(batch)) return [];
  try {
    const listed = await env.UPLOADS.list({ prefix: batchPrefix(batch), limit, include: ['customMetadata'] });
    return (listed?.objects || []).map((o) => ({
      key: o.key,
      bytes: Number(o.size) || 0,
      name: o.customMetadata?.original || o.key.split('/').pop(),
      product: safeProduct(o.customMetadata?.product),
      shot: isShotId(o.customMetadata?.shot) ? o.customMetadata.shot : '',
    }));
  } catch {
    return [];
  }
}

/**
 * A filename we are willing to put in a key.
 *
 * Everything outside [A-Za-z0-9._-] becomes a hyphen, so no separator, no null
 * byte, no unicode-normalisation surprise and no leading dot survives. The
 * result is only ever a label — the batch id is what makes a key unguessable and
 * the random tail is what makes it unique — so flattening it costs nothing.
 */
export function safeName(raw) {
  const flat = (raw || 'file')
    .toString()
    .split(/[\\/]/)
    .pop()
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.\-]+/, '')
    .replace(/-{2,}/g, '-');

  // ── DE STAART AFKNIPPEN, NOOIT DE EXTENSIE ─────────────────────────────────
  //
  // 8 augustus 2026. Dit was een echte bug en hij zag eruit als een
  // formaatprobleem: "een .jpeg kan wel, een .png niet". Dat was toeval. Een
  // .slice(0, 60) op de héle naam knipte bij een lange naam de extensie eraf
  // ("...aa.png" werd "...aa.pn"), typeFor() gaf dan null en /api/upload
  // antwoordde 400 bad-type. Een cameranaam als IMG_4821.jpeg is dertien tekens
  // en overleeft dat; een export uit een ontwerpprogramma met een beschrijvende
  // naam niet. Vandaar de indruk dat het aan PNG lag.
  //
  // NFKD maakt het erger, want normaliseren LAAT DE NAAM GROEIEN: elke letter
  // met een accent wordt letter + los teken en dat losse teken wordt een
  // hyphen. Een naam van 59 tekens kan zo over de 60 komen en zijn extensie
  // alsnog verliezen.
  //
  // Dus knippen we de stam en plakken we de extensie terug. De extensie bepaalt
  // het contentType in R2, dus een sleutel die op .pn eindigt terwijl er
  // image/png in staat is precies de tegenstrijdigheid die je later niet meer
  // kunt uitleggen.
  const i = flat.lastIndexOf('.');
  const hasExt = i > 0 && i < flat.length - 1;
  const stem = hasExt ? flat.slice(0, i) : flat;
  const ext = hasExt ? flat.slice(i) : '';
  // De extensie zelf ook begrenzen: ".dit-is-geen-extensie" is geen extensie, en
  // een naam die volledig uit punten bestaat mag geen lange staart opleveren.
  const tail = ext.length <= 6 ? ext : '';
  const base = (stem.slice(0, Math.max(1, 60 - tail.length)) + tail).replace(/^[.\-]+/, '');
  return base || 'file';
}

/** Lowercase extension, or ''. Reads the LAST dot, so "shot.jpg.exe" is an exe. */
export function extensionOf(name) {
  const i = String(name || '').lastIndexOf('.');
  if (i <= 0 || i === String(name).length - 1) return '';
  return String(name).slice(i + 1).toLowerCase();
}

/** The type we will store for this filename, or null if we will not store it. */
export function typeFor(name) {
  return UPLOAD_TYPES[extensionOf(name)] || null;
}

/*
 * ── WAT WE ACCEPTEREN, GEZEGD IN PLAATS VAN OVERGESCHREVEN ────────────────────
 *
 * De hint onder een uploadveld zei jarenlang "jpg, png of webp" terwijl
 * UPLOAD_TYPES hierboven al veel meer aannam — heic er nota bene bij, en dat is
 * precies wat er uit een iPhone komt. Een klant met een heic las dus dat zijn
 * foto geweigerd zou worden, en liet hem weg; het formulier had hem gewoon
 * aangenomen. Twee lijsten die uit elkaar lopen, en de onjuiste stond in beeld.
 *
 * Daarom wordt de zin nu uít UPLOAD_TYPES afgeleid. Eén lijst per contenttype
 * (jpeg heeft twee extensies, tiff ook — die noemen we één keer), in de volgorde
 * waarin ze hierboven staan. Voeg je boven een formaat toe, dan staat het hier
 * vanzelf ook. tests/uploadformaten.test.mjs bewaakt dat.
 */

/** De extensies die we noemen: één per contenttype, in de volgorde van de tabel. */
export function uploadFormats() {
  const gezien = new Set();
  const uit = [];
  for (const [ext, type] of Object.entries(UPLOAD_TYPES)) {
    if (gezien.has(type)) continue;
    gezien.add(type);
    uit.push(ext);
  }
  return uit;
}

/** Diezelfde lijst als zin: "jpg, png … of tif" / "… or tif". */
export function uploadFormatsSentence(lang = 'en') {
  const lijst = uploadFormats();
  const laatste = lijst[lijst.length - 1];
  const rest = lijst.slice(0, -1).join(', ');
  return lang === 'nl' ? `${rest} of ${laatste}` : `${rest} or ${laatste}`;
}
