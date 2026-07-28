// VISUAILS — password hashing for /admin. Lucas, 2026-07-27.
//
// WHY THIS IS A DIFFERENT PRIMITIVE FROM token.js
// token.js is explicit that a plain SHA-256 is the right hash for a portal
// token and a slow password hash (bcrypt / scrypt / argon2) would be the WRONG
// primitive there: a portal token is 256 bits of CSPRNG output and there is
// nothing to slow an attacker down FROM. A password is the opposite case —
// chosen by a human, low entropy, guessable — and a fast hash is exactly what
// lets someone who steals admin_users grind through it in bulk. This file
// exists because the login this project just gained needs the primitive the
// other one correctly avoided.
//
// WHY PBKDF2 AND NOT ARGON2ID
// Argon2id is the better-regarded choice off a Workers runtime. Cloudflare
// Workers expose WebCrypto (crypto.subtle) and nothing else — no native
// bindings, no npm package with a compiled Argon2 implementation — so the
// realistic choice is PBKDF2 via crypto.subtle.deriveBits, which is the same
// platform constraint that shaped mintToken()/hashToken() in token.js, or a
// pure-JS Argon2 implementation that nobody here can audit as carefully as the
// platform's own primitive. 100,000 iterations of PBKDF2-SHA256 is OWASP's
// current floor for this hash function; it is what is used below.
//
// WHAT IS STORED
// One column, admin_users.password_hash, holding
// "iterations:saltHex:hashHex" — the iteration count travels WITH the hash so
// a future increase does not invalidate rows written under the old count; a
// verify reads whatever count a row was written with rather than assuming
// today's constant applies to yesterday's row.
//
// SESSION TOKENS ARE NOT HERE. mintToken()/hashToken() from token.js are reused
// unchanged for the admin session cookie — that half of the problem is already
// solved correctly, by the same 256-bit-CSPRNG-in / SHA-256-hash-stored
// primitive the portal already relies on. Wrapper functions below just name
// the admin use of that primitive so a reader of functions/admin/ does not
// have to go find token.js to know where the session value comes from.

import { hashToken, mintToken, timingSafeEqual } from './token.js';

/** OWASP's 2023+ floor for PBKDF2-SHA256. Travels with each hash; see header. */
const PBKDF2_ITERATIONS = 100000;

/** How long an admin session cookie is good for without a fresh login. */
export const ADMIN_SESSION_TTL_DAYS = 14;

/** A fresh password hash, in the "iterations:saltHex:hashHex" format above. */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_ITERATIONS}:${toHex(salt)}:${toHex(bits)}`;
}

/**
 * Does this password match the stored hash?
 *
 * Malformed storage (wrong field count, an iteration count that is not a
 * number) returns false rather than throwing — a corrupt row must read as "no
 * password matches this", never as a 500 that tells an attacker the row exists
 * and is broken.
 */
export async function verifyPassword(password, stored) {
  const parts = String(stored ?? '').split(':');
  if (parts.length !== 3) return false;
  const [iterStr, saltHex, hashHex] = parts;
  const iterations = Number.parseInt(iterStr, 10);
  if (!Number.isInteger(iterations) || iterations < 1) return false;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;
  const bits = await deriveBits(password, fromHex(saltHex), iterations);
  // Compared as hex strings through token.js's existing constant-time
  // comparator rather than a second byte-level one written just for this.
  return timingSafeEqual(toHex(bits), hashHex.toLowerCase());
}

/** A fresh admin session: { token, tokenHash }. token goes in the cookie, only tokenHash in D1. */
export async function mintAdminSession() {
  const token = mintToken();
  return { token, tokenHash: await hashToken(token) };
}

/** ISO timestamp ADMIN_SESSION_TTL_DAYS from now. */
export function adminSessionExpiry(fromDate = new Date()) {
  return new Date(fromDate.getTime() + ADMIN_SESSION_TTL_DAYS * 86400000).toISOString();
}

async function deriveBits(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  return new Uint8Array(bits);
}

function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
