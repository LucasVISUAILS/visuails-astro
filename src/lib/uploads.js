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
// shows an order's files to whoever holds its token. A guessable batch id is
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

/** Everything staged lives under here. Nothing else may. */
export const UPLOAD_PREFIX = 'intake';

/** Per file. A phone photo is 3–8 MB; a 25 MB ceiling covers a big one twice over. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Per batch. A full drop is 25–30 products and a client may send two references
 * each, so this has to clear that with room, and still stop a script.
 */
export const MAX_BATCH_FILES = 80;

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
 * Everything staged under a batch, oldest first.
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
  const base = (raw || 'file')
    .toString()
    .split(/[\\/]/)
    .pop()
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.\-]+/, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60);
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
