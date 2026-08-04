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
  mintBatch,
  safeName,
  safeProduct,
  typeFor,
} from '../../src/lib/uploads.js';
import { isShotId } from '../../src/data/shots.js';
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from '../../src/lib/ratelimit.js';

/** Generous for a person filling in a form, tight for anything automating it. */
const RATE = { action: 'upload', limit: 40, windowSeconds: 60 };

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

  const name = safeName(file.name);
  const type = typeFor(name);
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

/** There is nothing to GET here. Say so in the shape the client already parses. */
export async function onRequestGet() {
  return json({ ok: false, error: 'method' }, 405, { allow: 'POST, DELETE' });
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
