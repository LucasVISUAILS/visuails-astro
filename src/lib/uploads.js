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
import { SHOTS_PER_PRODUCT, MAX_REF_PER_PRODUCT, isShotId, MIN_LANGE_ZIJDE } from '../data/shots.js';
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
 * COMPLETE producten geteld werd. Sinds de agenda in punten rekent, hangt het
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

/*
 * ── HET DUIMPJE NAAST DE FOTO — lijst 87 (D13), 9 november 2026 ──────────────
 *
 * /admin laadde voor elk duimpje van 58 px het volle origineel van de klant, tot 25 MB per
 * foto: een bestelling van twintig producten was honderden MB bij het openen, op een
 * telefoon niet te doen. Nu stuurt het bestelformulier bij elke foto een kleine webp mee
 * (veld `duim`, gemaakt in de browser, zoals public/admin-voorvertoning.js al doet bij
 * leveringen). Hij staat naast het origineel in dezelfde batch, met DUIM_ACHTER erachter,
 * zodat de nachtelijke opruiming van een verlaten batch hem meeneemt. listBatch() telt hem
 * niet als foto en geeft hem mee als `preview`; /api/order zet hem in files.preview_key, en
 * /admin toont hem via /admin/files/<id>/duim. Het origineel blijft voor de download.
 */
export const DUIM_ACHTER = '.duim.webp';
/** Groter dan dit is geen duimpje (een webp van 480 px is zo'n 20 tot 60 kB). */
export const MAX_DUIM_BYTES = 256 * 1024;
export const isDuimKey = (key) => String(key || '').endsWith(DUIM_ACHTER);
export const duimKeyVoor = (key) => `${key}${DUIM_ACHTER}`;
/** RIFF....WEBP: de eerste twaalf bytes van een webp. */
export function isWebpKop(b) {
  if (!b || b.length < 12) return false;
  const is = (off, ...xs) => xs.every((x, i) => b[off + i] === x);
  return is(0, 0x52, 0x49, 0x46, 0x46) && is(8, 0x57, 0x45, 0x42, 0x50);
}
/** Een batch met elk origineel én zijn duimpje: zoveel objecten kan hij hoogstens tellen (+1). */
export const MAX_BATCH_OBJECTEN = MAX_BATCH_FILES * 2 + 1;

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
    /* Lijst 87 (D13): de duimpjes staan ernaast en tellen niet mee; de lijst haalt er dus ruim
       genoeg op voor elk origineel met zijn duimpje (R2 geeft er hoogstens 1000 per keer). */
    /* levering 117 (17 november 2026, proefronde B1-06): doorbladeren tot alles binnen is.
       Met include: ['customMetadata'] geeft R2 hoogstens 100 objecten per keer, ook als je om meer
       vraagt, en zet dan `truncated` met een `cursor`. Hier werd alleen de eerste bladzijde gelezen:
       bij 20 producten × 3 foto's (60 foto's + 60 duimpjes) kwamen er 50 bij de bestelling en viel
       de rest stil weg. Nu volgen we de cursor tot R2 zegt dat het klaar is, of tot er genoeg
       originelen zijn. Hoogstens 50 bladzijden, zodat een kapotte cursor nooit eindeloos doorloopt. */
    const objecten = [];
    let cursor;
    for (let blad = 0; blad < 50; blad++) {
      const listed = await env.UPLOADS.list({
        prefix: batchPrefix(batch),
        limit: Math.min(1000, limit * 2),
        include: ['customMetadata'],
        ...(cursor ? { cursor } : {}),
      });
      objecten.push(...(listed?.objects || []));
      if (objecten.filter((o) => !isDuimKey(o.key)).length >= limit) break;
      if (!listed?.truncated || !listed?.cursor || listed.cursor === cursor) break;
      cursor = listed.cursor;
    }
    const duimen = new Set(objecten.filter((o) => isDuimKey(o.key)).map((o) => o.key));
    return objecten.filter((o) => !isDuimKey(o.key)).slice(0, limit).map((o) => ({
      key: o.key,
      bytes: Number(o.size) || 0,
      name: o.customMetadata?.original || o.key.split('/').pop(),
      product: safeProduct(o.customMetadata?.product),
      shot: isShotId(o.customMetadata?.shot) ? o.customMetadata.shot : '',
      preview: duimen.has(duimKeyVoor(o.key)) ? duimKeyVoor(o.key) : '',
      /* levering 118 (17 november 2026, proefronde P2-06): /api/upload markeert een te kleine foto (zie
         beeldAfmeting()); alleen als dat zo is, zodat de rest van de lijst er hetzelfde uitziet. */
      ...(o.customMetadata?.klein === '1' ? { klein: true, px: /^\d{1,5}x\d{1,5}$/.test(o.customMetadata?.px || '') ? o.customMetadata.px : '' } : {}),
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
  const plat = (raw || 'file')
    .toString()
    .split(/[\\/]/)
    .pop()
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-');
  /* ── EEN STAM DIE HELEMAAL WEGVALT — 9 november 2026 (ronde 91, D02) ──────
     "😀.jpg", "照片.jpg" of "фото.heic" werden "-.jpg", en de regel hieronder
     die een voorloopstreep of -punt weghaalt, at dan ook de PUNT van de
     extensie op: de naam werd "jpg", zonder extensie. Het type klopte nog (dat
     komt uit de originele naam), maar /admin bood Lucas een download "jpg" aan
     die Windows niet kan openen, en de bestandenlijst toonde "jpg" bij elke
     foto van een klant die zijn bestanden in het Chinees of Russisch noemt.
     Nu krijgt zo'n stam de naam "foto" en blijft de extensie staan. */
  const flat = (/^[.\-]*\.[A-Za-z0-9]{1,5}$/.test(plat) ? `foto${plat.slice(plat.lastIndexOf('.'))}` : plat)
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

/* ── HET TYPE UIT DE EERSTE BYTES — 9 november 2026 (ronde 91, D06) ──────────────
 *
 * typeFor() kijkt alleen naar de extensie. Een echte JPEG zonder extensie (sommige
 * Android-galerijen en gedeelde bestanden uit chat-apps, of "IMG_1234.jpg_large")
 * kreeg daarom "Geen beeld dat we kunnen lezen", terwijl de browser er een
 * miniatuur van maakte. De eerste bytes zeggen wat het is: elk formaat heeft een
 * vaste handtekening. Dit geeft de extensie die bij die bytes hoort, of null.
 *
 * Alleen voor een naam waarvan de extensie niets zegt: een bekende extensie blijft
 * de bron (een .jpg die eigenlijk een png is, is gewoon een beeld). De aanroeper
 * kiest het type daarna uit zijn eigen tabel (UPLOAD_TYPES, of LEVERING_MIME in
 * /admin), dus wat er de R2 in gaat, komt nooit uit de browser.
 *
 * `b` zijn de eerste 16 bytes (Uint8Array).
 */
const FTYP_MERK = {
  heic: 'heic', heix: 'heic', hevc: 'heic', hevx: 'heic', heim: 'heic', heis: 'heic', hevm: 'heic', hevs: 'heic',
  mif1: 'heif', msf1: 'heif',
  avif: 'avif', avis: 'avif',
  isom: 'mp4', iso2: 'mp4', iso4: 'mp4', iso5: 'mp4', iso6: 'mp4', mp41: 'mp4', mp42: 'mp4', avc1: 'mp4', mmp4: 'mp4', dash: 'mp4',
  'qt  ': 'mov',
};

/** De extensie die bij de eerste bytes hoort ('jpg', 'png', 'heic', 'mp4' …), of null. */
export function extUitKop(b) {
  if (!b || b.length < 12) return null;
  const is = (off, ...xs) => xs.every((x, i) => b[off + i] === x);
  if (is(0, 0xff, 0xd8, 0xff)) return 'jpg';
  if (is(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png';
  if (is(0, 0x47, 0x49, 0x46, 0x38)) return 'gif';
  if (is(0, 0x52, 0x49, 0x46, 0x46) && is(8, 0x57, 0x45, 0x42, 0x50)) return 'webp';
  if (is(0, 0x49, 0x49, 0x2a, 0x00) || is(0, 0x4d, 0x4d, 0x00, 0x2a)) return 'tif';
  if (is(4, 0x66, 0x74, 0x79, 0x70)) {
    const merk = String.fromCharCode(b[8], b[9], b[10], b[11]).toLowerCase();
    return FTYP_MERK[merk] || null;
  }
  return null;
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

/*
 * ── DE AFMETING UIT DE KOP VAN HET BESTAND — levering 118 (17 november 2026, proefronde P2-06) ──
 * Het formulier weigert een foto onder MIN_LANGE_ZIJDE (keurBeeld() in shots.js), maar "Opnieuw" stuurde hem toch,
 * en de server keek niet naar de afmeting. Nu leest /api/upload de breedte en hoogte uit de eerste bytes: JPEG
 * (SOF0/1/2), PNG (IHDR) en WebP (VP8, VP8L, VP8X). HEIC en AVIF slaan we over: hun maat staat diep in de doos-
 * structuur, en een telefoonfoto in die vormen is vrijwel altijd groot genoeg. Niet weigeren, alleen markeren:
 * /admin en de studiomail zeggen "te klein", en de studio vraagt het origineel.
 * Geeft { breed, hoog } of null als het niet te lezen is.
 */
export function beeldAfmeting(b) {
  if (!b || b.length < 24) return null;
  const u16 = (i) => (b[i] << 8) | b[i + 1];
  const u16le = (i) => b[i] | (b[i + 1] << 8);
  const u24le = (i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  const u32 = (i) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
  /* PNG: de handtekening, dan IHDR met breedte en hoogte. */
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) {
    const breed = u32(16); const hoog = u32(20);
    return breed > 0 && hoog > 0 ? { breed, hoog } : null;
  }
  /* JPEG: door de segmenten tot een SOF-marker (C0..CF, behalve C4 DHT, C8 en CC DAC). */
  if (b[0] === 0xFF && b[1] === 0xD8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i += 1; continue; }
      const m = b[i + 1];
      if (m === 0xFF) { i += 1; continue; }
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      if (m === 0xD9 || m === 0xDA) return null;
      const lengte = u16(i + 2);
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        const hoog = u16(i + 5); const breed = u16(i + 7);
        return breed > 0 && hoog > 0 ? { breed, hoog } : null;
      }
      if (lengte < 2) return null;
      i += 2 + lengte;
    }
    return null;
  }
  /* WebP: RIFF....WEBP, dan VP8 (lossy), VP8L (lossless) of VP8X (uitgebreid). */
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const soort = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (soort === 'VP8 ' && b.length >= 30) return { breed: u16le(26) & 0x3FFF, hoog: u16le(28) & 0x3FFF };
    if (soort === 'VP8L' && b.length >= 25) {
      const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { breed: (v & 0x3FFF) + 1, hoog: ((v >>> 14) & 0x3FFF) + 1 };
    }
    if (soort === 'VP8X' && b.length >= 30) return { breed: u24le(24) + 1, hoog: u24le(27) + 1 };
  }
  return null;
}

/** levering 118 (P2-06): is deze afmeting te klein voor de studio? Dezelfde grens als keurBeeld() in shots.js. */
export function teKleinVoorStudio(afm) {
  return !!afm && Math.max(afm.breed, afm.hoog) > 0 && Math.max(afm.breed, afm.hoog) < MIN_LANGE_ZIJDE;
}
