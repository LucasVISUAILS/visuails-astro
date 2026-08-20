// VISUAILS — portal tokens. Section 10.
//
// The brief, verbatim:
//
//   "portal_token must be ≥128 bits from crypto.getRandomValues, base64url,
//    single-use on issue, expiring 90 days after order close. Rate-limit
//    lookups. This URL is the only thing protecting client data — do not ship a
//    short or sequential token."
//
// Everything in this file exists to make that sentence true, and to make the
// alternatives hard to write by accident. There is no function here that returns
// a guessable string, and there is no path that writes a raw token to storage.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY 256 BITS AND NOT 128
// 128 is the floor, so the question is what the next 128 cost. Eleven URL
// characters. That is the entire price, and in exchange the token stays absurd
// even if some later change lowercases it, truncates it for a log line, or
// prints only its first half in an admin view. A floor you sit exactly on is a
// floor you fall through the first time somebody shaves a byte off it.
//
// WHY THE DATABASE NEVER SEES THE TOKEN
// The token exists in exactly two places: the moment it is minted, and the link
// in the client’s inbox. What is stored is SHA-256 of it. If order_tokens leaks
// in full, the attacker holds digests of 256-bit random strings — there is no
// dictionary, no structure, and nothing to grind. A plain-text token column
// would turn one database read into every client’s private gallery.
//
// A plain SHA-256 is the right primitive here, and a password hash (bcrypt,
// scrypt, argon2) would be the wrong one. Those are slow on purpose because
// passwords are low-entropy and guessable. This input is 256 bits of CSPRNG
// output; there is nothing to slow an attacker down FROM. Slow hashing would
// only tax the client on every page view.
// ─────────────────────────────────────────────────────────────────────────────

/** 32 bytes → 256 bits → 43 base64url characters. See the note above. */
export const TOKEN_BYTES = 32;

/** Length of the base64url encoding of TOKEN_BYTES, unpadded. */
export const TOKEN_CHARS = 43;

/** The brief's floor, kept here so a change to TOKEN_BYTES is checked against it. */
const MIN_BITS = 128;

/** "expiring 90 days after order close." */
export const PORTAL_TTL_DAYS = 90;

if (TOKEN_BYTES * 8 < MIN_BITS) {
  throw new Error(`token.js: TOKEN_BYTES gives ${TOKEN_BYTES * 8} bits, below the ${MIN_BITS}-bit floor`);
}

/**
 * A fresh portal token. The only function in the codebase allowed to produce one.
 *
 * crypto.getRandomValues, as the brief specifies — never Math.random, never a
 * timestamp, never anything derived from the order. A token that encodes the
 * order is a sequential token wearing a disguise: get one, and the shape of the
 * next is visible.
 */
export function mintToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/**
 * The value that goes in order_tokens.token_hash. Hex, lowercase, 64 chars.
 * Async because WebCrypto's digest is — that is the only reason.
 */
export async function hashToken(token) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Does this even look like one of our tokens?
 *
 * This runs BEFORE the rate limiter and before any database read, and that
 * ordering is the point. A flood of /o/wp-admin, /o/../../etc/passwd and
 * /o/<sql injection> costs exactly one regex each and never reaches D1 — so the
 * cheapest attack against the portal is also the one that does the least.
 *
 * It is a shape check, not a security check. Passing it proves nothing except
 * that a lookup is worth doing.
 */
export function isWellFormedToken(token) {
  return typeof token === 'string' && token.length === TOKEN_CHARS && /^[A-Za-z0-9_-]+$/.test(token);
}

/**
 * Compare two secrets without letting the clock describe them.
 *
 * Not needed for the token lookup itself — that compares HASHES, by index, and
 * an attacker timing it learns only about a digest of their own guess. It is
 * here for anything that ever compares secret material directly, so that the
 * safe version is the one already in reach.
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * When a token dies: 90 days after the order closed.
 *
 * Takes closed_at, which is null while the order is live — and a live order’s
 * token does not expire, because the client is still working in it. Returns null
 * for null, and the caller must read that as "no expiry yet", never as "expired".
 *
 * Accepts both SQLite's datetime('now') format ('YYYY-MM-DD HH:MM:SS', UTC) and
 * ISO-8601. Returns ISO-8601 with a Z, so string comparison against another
 * ISO-8601 UTC stamp is a valid ordering.
 */
export function expiryFrom(closedAt) {
  const t = parseStamp(closedAt);
  if (t === null) return null;
  return new Date(t + PORTAL_TTL_DAYS * 86400000).toISOString();
}

/**
 * Has this token's window closed?
 *
 * Deliberately takes BOTH stored columns and recomputes rather than trusting
 * order_tokens.expires_at alone. expires_at is written by the order-close path;
 * if that path ever fails to run, or runs before closed_at is set, a stale null
 * would mean a token that never expires. Deriving from closed_at as well makes
 * the 90 days a property of the order, not of one code path having worked.
 *
 * The stricter of the two wins. Neither set → live, which is correct: an order
 * that has not closed has no expiry.
 */
export function isExpired(expiresAt, closedAt, nowIso = new Date().toISOString()) {
  const stored = parseStamp(expiresAt);
  const derived = parseStamp(expiryFrom(closedAt));
  const now = parseStamp(nowIso);
  if (now === null) return true; // an unreadable clock is not a reason to open the door
  const ends = [stored, derived].filter((v) => v !== null);
  if (!ends.length) return false;
  return Math.min(...ends) <= now;
}

/** The link that goes in the email. Absolute, because it is read outside a browser. */
export function portalUrl(token, origin = 'https://visuails.com') {
  return `${origin.replace(/\/+$/, '')}/o/${token}`;
}

/**
 * Milliseconds since epoch, or null.
 *
 * SQLite's datetime('now') has no timezone marker and IS UTC, so the ' ' → 'T'
 * plus 'Z' rewrite is a correction, not an assumption. Without it the runtime
 * reads the stamp as local time and every expiry moves by the server's offset.
 */
function parseStamp(value) {
  if (!value || typeof value !== 'string') return null;
  const iso = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/** RFC 4648 §5, unpadded — the alphabet that survives a URL path untouched. */
function base64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
