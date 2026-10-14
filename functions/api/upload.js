// VISUAILS — POST /api/upload. Section 10, step 2 of the /start pipeline.
//
// Reference material goes into R2 before the order exists, because at step 2 the
// order does not exist yet. The reasoning behind the staging prefix, the batch
// id's entropy and the content-type allowlist is in src/lib/uploads.js, which
// this endpoint and /api/order both read from so they cannot disagree about what
// a batch is. What is here is the request handling.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY ONE FILE PER REQUEST
// The alternative is to hold every file in the browser until submit and post one
// enormous multipart body. That fails on the exact case it matters for — a phone
// on 4G with twelve product photographs — where a single 200 MB request that
// dies at 95% takes the whole order with it. Twelve small requests lose one
// photo, and the client can see which one.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT A FILE NOW ARRIVES WITH — AND WHY NONE OF IT TOUCHES THE KEY
// August 2026: an upload may name the product it belongs to and which of the
// four angles it is (src/data/shots.js). Both ride in customMetadata, and the
// key is byte-for-byte the key it was before — `<batch>/nnn-rand-<safeName>`.
//
// That is a decision, not an omission. A key with the product in it would read
// better in an R2 listing and would put a client-supplied string on the path of
// an object store, where a `/` is a directory, a `..` is a traversal and a
// duplicate is an overwrite that loses a photograph in silence. The mapping's
// home is customMetadata (read back by listBatch) and the files table (written
// by /api/order); it has no business being load-bearing in a filename as well.
//
// So: `shot` must be an id isShotId() recognises or the request is refused, and
// `product` is flattened by safeProduct() — NOT by safeName(), which keeps `.`
// because a filename has an extension. The two sanitisers are separate on
// purpose; see the note above safeProduct() in src/lib/uploads.js.
//
// Bindings: env.UPLOADS (R2), env.DB (D1, for the rate limiter only).
// ─────────────────────────────────────────────────────────────────────────────

import {
  MAX_BATCH_FILES,
  MAX_FILE_BYTES,
  UPLOAD_TYPES,
  batchPrefix,
  isWellFormedBatch,
  keyBelongsTo,
  listBatch,
  mintBatch,
  safeName,
  safeProduct,
  typeFor,
} from '../../src/lib/uploads.js';
import { isShotId } from '../../src/data/shots.js';
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from '../../src/lib/ratelimit.js';
import { controleerBotcheck, botcheckBesluit, TOKEN_VELD } from '../../src/lib/turnstile.js';

/** Generous for a person filling in a form, tight for anything automating it. */
const RATE = { action: 'upload', limit: 40, windowSeconds: 60 };

/* ── EEN DAGGRENS PER INTERNETAANSLUITING — 8 oktober 2026 (o05) ──────────────
 *
 * Hierboven staat 40 per minuut, en dat was het. Wie geen bestelling had, kon
 * dus elke minuut 40 × 25 MB in R2 zetten, de hele dag door — en omdat een
 * upload zonder batch een nieuwe batch begint, hielp het plafond per batch niet.
 * Opslag kost geld per maand, en de nachtelijke opruiming ruimt alleen op als
 * PURGE_ENABLED aan staat.
 *
 * Nu ook drie grenzen per DAG (UTC), per IP-adres, en bij IPv6 per /64-blok
 * (rateIp() in ratelimit.js): het aantal bestanden, het aantal bytes, en het
 * aantal nieuwe batches.
 *
 * ── DE GETALLEN, EN WAAROM ZE ZO RUIM ZIJN ────────────────────────────────
 *
 * Lucas: *"Onthoud wel dat klanten met grote orders sowieso veel moeten
 * invullen/uploaden."* De grootste bestelling die het formulier kan tekenen is
 * 20 producten (FORM_MAX_PRODUCTS) × 12 vakjes (4 vaste foto's, 4 extra, 4
 * gratis referenties) = 240 bestanden, en dan elk op het maximum van 25 MB =
 * 6 GB. Een echte grote bestelling (20 × 4 à 6 foto's van een telefoon, 3 à 8 MB)
 * is 80 tot 120 bestanden en minder dan 1 GB. De grenzen liggen boven het
 * theoretische maximum, met ruimte voor opnieuw proberen en een tweede
 * bestelling op dezelfde dag vanaf hetzelfde kantoor:
 *
 *   400 bestanden · 8 GB · 30 nieuwe batches per dag
 *
 * Een nieuwe batch ontstaat bij elke nieuwe bestelpagina (de eerste foto van
 * een sessie); dertig keer per dag een formulier opnieuw beginnen doet een mens
 * niet. Wie een grens raakt, krijgt `dag-limiet` terug en in het formulier een
 * uitleg met WhatsApp en mail om de bestelling zo te plaatsen (ProductUploader
 * en pipeline.js). De teller loopt alleen op bestanden die verder in orde zijn:
 * een geweigerd type of een te groot bestand telt niet mee.
 *
 * `batchesZonderBotcheck` (o03, zelfde dag): staat de botcheck van Cloudflare
 * aan en komt een nieuwe batch zonder geldig token (adblocker, storing), dan
 * gaat hij door maar zijn er daarvan hooguit vijf per dag. Zie src/lib/turnstile.js. */
export const UPLOAD_DAG = { bestanden: 400, bytes: 8 * 1024 * 1024 * 1024, batches: 30, batchesZonderBotcheck: 5 };
const DAG = 86400;

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;

  // No bucket, no upload — and the pipeline must survive this rather than trap
  // the client in step 2. Uploads are optional on every path through /start; the
  // client sees "we could not take files just now, send them over afterwards"
  // and keeps going. That is why this is a clean 503 with a machine-readable
  // error rather than a thrown exception.
  if (!env?.UPLOADS) return json({ ok: false, error: 'unavailable' }, 503);

  const limit = await checkRate(env, { ip: clientIp(request), ...RATE });
  if (shouldSweep() && typeof waitUntil === 'function') waitUntil(sweepRateLimits(env));
  if (!limit.allowed) {
    return json({ ok: false, error: 'rate', retryAfter: limit.retryAfter }, 429, {
      'retry-after': String(limit.retryAfter || 60),
    });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400);
  }

  const file = form.get('file');
  if (!file || typeof file === 'string' || typeof file.stream !== 'function') {
    return json({ ok: false, error: 'no-file' }, 400);
  }

  // The first upload of a session mints the batch; every later one presents it.
  // A presented value that is not token-shaped is refused outright rather than
  // quietly replaced, because silently minting a second batch would scatter one
  // client's photographs across two prefixes and attach only half of them.
  const presented = (form.get('batch') || '').toString();
  if (presented && !isWellFormedBatch(presented)) return json({ ok: false, error: 'bad-batch' }, 400);
  const batch = presented || mintBatch();

  // Het TYPE wordt op de ORIGINELE naam bepaald, de SLEUTEL op de veilige naam.
  // Andersom was de bug van 8 augustus 2026: de server keurde een naam af die de
  // client al had goedgekeurd, omdat alleen de server naar een afgeknipte versie
  // keek. De client (pipeline.js preflight) leest file.name, dus dat is de bron
  // waarover ze het eens moeten zijn. safeName() houdt de extensie nu heel, dus
  // beide zouden hetzelfde antwoord geven — maar dan nog is één bron beter dan
  // twee die toevallig gelijk lopen.
  const name = safeName(file.name);
  const type = typeFor(file.name);
  if (!type) return json({ ok: false, error: 'bad-type', accepted: Object.keys(UPLOAD_TYPES) }, 400);

  // WHERE THIS PHOTOGRAPH GOES, IF THE CLIENT SAID.
  //
  // The two are validated differently because they are different kinds of
  // value. `shot` is a CLOSED SET — one of four ids that mean something to the
  // studio and to pricing — so an unrecognised one is a bug in the caller and
  // is refused rather than dropped, which is the only way the client ever finds
  // out. `product` is a free label the customer minted, so there is nothing to
  // check it against: it is flattened and capped, and a value that flattens to
  // nothing is simply no product.
  //
  // Both are optional. An upload with neither is exactly the upload this
  // endpoint took before today, and it still works — a customer whose files
  // land in the tray and who presses Continue anyway has sent us usable
  // material, not a broken request.
  const shot = (form.get('shot') || '').toString();
  if (shot && !isShotId(shot)) return json({ ok: false, error: 'bad-shot' }, 400);
  const product = safeProduct(form.get('product'));

  const bytes = Number(file.size) || 0;
  if (bytes <= 0) return json({ ok: false, error: 'empty' }, 400);
  if (bytes > MAX_FILE_BYTES) return json({ ok: false, error: 'too-large', max: MAX_FILE_BYTES }, 400);

  // ── IS HET ÉCHT EEN BEELD? — 24 september 2026 ──────────────────────────────
  // Tot vandaag keek dit eindpunt alleen naar de extensie. Een tekstbestand dat
  // op .jpg eindigde (of een download die halverwege afbrak) kwam als "Verstuurd"
  // in het vak te staan, en de studio vond het pas bij het maken. De eerste
  // bytes zeggen het: elk formaat in UPLOAD_TYPES heeft een vaste handtekening.
  // Een .jpg die eigenlijk een png is, is gewoon een beeld en gaat door — de
  // vraag is alleen of het een beeld IS, niet of de extensie klopt.
  /* ── EN WAT NIET TE LEZEN IS, GAAT NIET DOOR — 8 oktober 2026 (o05) ────────
     Hier stond: niet te lezen, laat de rest van de keten beslissen. Maar er is
     geen rest van de keten die naar de inhoud kijkt; het bestand ging zo R2 in.
     Een bestand waarvan wij de eerste zestien bytes niet kunnen lezen, is geen
     beeld waar de studio iets mee kan. De klant krijgt dezelfde melding als bij
     een verkeerd type, en kan het opnieuw kiezen. */
  try {
    const kop = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!isBeeldHandtekening(kop)) return json({ ok: false, error: 'bad-type', accepted: Object.keys(UPLOAD_TYPES) }, 400);
  } catch {
    return json({ ok: false, error: 'bad-type', accepted: Object.keys(UPLOAD_TYPES) }, 400);
  }

  /* De daggrenzen (zie UPLOAD_DAG bovenaan). Pas hier, na alle controles op het
     bestand zelf: wat geweigerd wordt, telt niet mee. Eerst de nieuwe batch,
     dan bestanden, dan bytes; de eerste die vol is, stopt het. */
  const ip = clientIp(request);
  if (!presented) {
    /* ── EEN NIEUWE BATCH VRAAGT DE BOTCHECK — 8 oktober 2026 (o03) ──────────
       Alleen hier: het eerste bestand van een bestelling. Zie src/lib/turnstile.js:
       zonder sleutels uit; geen token of een storing is door, maar dan hooguit
       5 nieuwe batches per dag in plaats van 30; alleen een token dat
       Cloudflare uitdrukkelijk ongeldig noemt, wordt geweigerd. */
    const token = form.get(TOKEN_VELD);
    const botcheck = botcheckBesluit((await controleerBotcheck(env, { token: typeof token === 'string' ? token : '', ip })).stand);
    if (botcheck === 'weiger') return json({ ok: false, error: 'botcheck' }, 403);
    const nieuw = await checkRate(env, { ip, action: 'upload-batch-dag', limit: UPLOAD_DAG.batches, windowSeconds: DAG });
    if (!nieuw.allowed) return dagLimiet(nieuw);
    if (botcheck === 'streng') {
      const streng = await checkRate(env, { ip, action: 'upload-batch-zonder-botcheck', limit: UPLOAD_DAG.batchesZonderBotcheck, windowSeconds: DAG });
      if (!streng.allowed) return dagLimiet(streng);
    }
  }
  const stuks = await checkRate(env, { ip, action: 'upload-bestanden-dag', limit: UPLOAD_DAG.bestanden, windowSeconds: DAG });
  if (!stuks.allowed) return dagLimiet(stuks);
  const zwaar = await checkRate(env, { ip, action: 'upload-bytes-dag', limit: UPLOAD_DAG.bytes, windowSeconds: DAG, gewicht: bytes });
  if (!zwaar.allowed) return dagLimiet(zwaar);

  // The count comes from R2 rather than from the client, and it also supplies
  // the ordering number below.
  //
  // This read is a soft cap and is not exact: two uploads in flight at the same
  // instant both see the same count, so a batch can land a file or two over the
  // ceiling. That is stated here rather than papered over — the cap exists to
  // stop a script filling a bucket, and a script does not get to n+2 and stop.
  // Making it exact needs a lock this endpoint has no reason to own.
  let existing = 0;
  try {
    const listed = await env.UPLOADS.list({ prefix: batchPrefix(batch), limit: MAX_BATCH_FILES + 1 });
    existing = (listed?.objects || []).length;
  } catch {
    return json({ ok: false, error: 'unavailable' }, 503);
  }
  if (existing >= MAX_BATCH_FILES) return json({ ok: false, error: 'batch-full', max: MAX_BATCH_FILES }, 400);

  // nnn keeps the client's own order readable in a listing; the random tail makes
  // a collision impossible rather than unlikely. Two files picked out of the same
  // folder are frequently called the same thing, and an overwrite here loses a
  // photograph silently — the one failure mode this must not have.
  const key = `${batchPrefix(batch)}${String(existing + 1).padStart(3, '0')}-${rand(4)}-${name}`;

  try {
    await env.UPLOADS.put(key, file.stream(), {
      httpMetadata: { contentType: type },
      customMetadata: {
        // Enough to sweep an abandoned batch, and nothing that identifies a
        // person. At step 2 the client genuinely has not told us who they are,
        // so there is nothing here to leak — and a product key is `p3`, not a
        // brand's unreleased SKU, for the same reason.
        staged: new Date().toISOString(),
        original: name,
        // Spread rather than set-to-'': an absent key and a key holding the
        // empty string read the same to listBatch(), and the absent one costs
        // no header on every object in a 140-file batch.
        ...(product ? { product } : {}),
        ...(shot ? { shot } : {}),
      },
    });
  } catch {
    return json({ ok: false, error: 'unavailable' }, 503);
  }

  // product and shot are echoed as STORED, not as sent. The client renders the
  // slot it thinks a file is in from its own state; this is how it can tell
  // that what the server kept is the same thing.
  return json({
    ok: true,
    batch,
    file: { key, name, bytes, type, product, shot },
    count: existing + 1,
    max: MAX_BATCH_FILES,
  });
}

/**
 * Remove one staged file.
 *
 * A five-step form where a mis-picked photograph cannot be un-picked is a form
 * that gets abandoned at step 2. The batch id is the authorisation and the key
 * is checked to be inside that batch's own prefix, so holding a batch id lets
 * you empty your own staging area and nothing else.
 */
export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!env?.UPLOADS) return json({ ok: false, error: 'unavailable' }, 503);

  const limit = await checkRate(env, { ip: clientIp(request), ...RATE });
  if (!limit.allowed) return json({ ok: false, error: 'rate', retryAfter: limit.retryAfter }, 429);

  const url = new URL(request.url);
  const batch = (url.searchParams.get('batch') || '').toString();
  const key = (url.searchParams.get('key') || '').toString();
  if (!isWellFormedBatch(batch)) return json({ ok: false, error: 'bad-batch' }, 400);
  if (!keyBelongsTo(key, batch)) return json({ ok: false, error: 'bad-key' }, 400);

  try {
    await env.UPLOADS.delete(key);
  } catch {
    return json({ ok: false, error: 'unavailable' }, 503);
  }
  return json({ ok: true, key });
}

/* ── WAT STAAT ER NOG VAN MIJ? — 11 oktober 2026 (F3, punt 1.04) ──────────────
 *
 * Lucas koos (V51 = a): het bestelformulier onthoudt op het apparaat van de
 * klant de look, het aantal, de opties en de al geüploade foto's — van die
 * foto's alleen de sleutels, niet de bestanden. Komt de klant terug, dan moet
 * het formulier eerst weten of die foto's hier nog staan: de nachtelijke
 * opruiming haalt een batch weg die zeven dagen niet aan een bestelling hangt
 * (INTAKE_TTL_DAYS in cron/index.js).
 *
 * ALLEEN EIGEN UPLOADS. Dezelfde sleutel als bij DELETE hierboven: wie het
 * batchkenmerk heeft (drieënveertig willekeurige tekens, alleen bekend bij de
 * browser die de eerste foto stuurde), mag zien wat erin staat — en niets
 * anders. Er komt geen persoonsgegeven mee terug: alleen sleutel, bestandsnaam,
 * grootte, product (`p3`) en vak, precies wat de upload zelf al teruggaf.
 *
 * MET EEN EIGEN SNELHEIDSGRENS, los van die voor uploads: een formulier vraagt
 * dit één keer per bezoek, dus twintig per minuut per adres is ruim voor een
 * mens en krap voor wie batchkenmerken probeert te raden.
 *
 * Zonder `batch` blijft het antwoord wat het was: hier valt niets te halen. */
export async function onRequestGet(context) {
  const { request, env } = context || {};
  const url = request ? new URL(request.url) : null;
  const batch = url ? (url.searchParams.get('batch') || '').toString() : '';
  if (!batch) return json({ ok: false, error: 'method' }, 405, { allow: 'POST, DELETE' });
  if (!env?.UPLOADS) return json({ ok: false, error: 'unavailable' }, 503);
  if (!isWellFormedBatch(batch)) return json({ ok: false, error: 'bad-batch' }, 400);

  const limit = await checkRate(env, { ip: clientIp(request), action: 'upload-lijst', limit: 20, windowSeconds: 60 });
  if (!limit.allowed) return json({ ok: false, error: 'rate', retryAfter: limit.retryAfter }, 429);

  /* listBatch() geeft bij een storing een lege lijst; het formulier leest dat als
     "niet meer hier" en begint dan een nieuwe batch — de veilige kant. */
  const files = await listBatch(env, batch);
  return json({
    ok: true,
    batch,
    files: files.map((f) => ({ key: f.key, name: f.name, bytes: f.bytes, product: f.product, shot: f.shot })),
  });
}

/* Een eigen code en GEEN `rate`: pipeline.js probeert `rate` vanzelf opnieuw,
   en dat heeft bij een daggrens geen zin. 429, want het is een grens en geen
   fout in het bestand. */
function dagLimiet(teller) {
  return json({ ok: false, error: 'dag-limiet', retryAfter: teller.retryAfter }, 429, {
    'retry-after': String(teller.retryAfter || DAG),
  });
}

function rand(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Never cached, anywhere. The response carries a batch id.
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

/** De handtekening van jpeg, png, gif, webp, tiff en de ISO-BMFF-familie (heic, heif, avif). */
export function isBeeldHandtekening(b) {
  if (!b || b.length < 12) return false;
  const is = (off, ...xs) => xs.every((x, i) => b[off + i] === x);
  if (is(0, 0xff, 0xd8, 0xff)) return true;                            // jpeg
  if (is(0, 0x89, 0x50, 0x4e, 0x47)) return true;                      // png
  if (is(0, 0x47, 0x49, 0x46, 0x38)) return true;                      // gif
  if (is(0, 0x52, 0x49, 0x46, 0x46) && is(8, 0x57, 0x45, 0x42, 0x50)) return true; // webp
  if (is(0, 0x49, 0x49, 0x2a, 0x00) || is(0, 0x4d, 0x4d, 0x00, 0x2a)) return true; // tiff
  if (is(4, 0x66, 0x74, 0x79, 0x70)) return true;                      // ftyp: heic, heif, avif
  return false;
}
