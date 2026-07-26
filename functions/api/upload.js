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
  typeFor,
} from '../../src/lib/uploads.js';
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
        // so there is nothing here to leak.
        staged: new Date().toISOString(),
        original: name,
      },
    });
  } catch {
    return json({ ok: false, error: 'unavailable' }, 503);
  }

  return json({
    ok: true,
    batch,
    file: { key, name, bytes, type },
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
