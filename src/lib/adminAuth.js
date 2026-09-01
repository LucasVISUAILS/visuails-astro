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

/* ═══════════════════════════════════════════════════════════════════════════
 * DE TWEEDE FACTOR — 1 september 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas' keuze na de beveiligingsronde: *"Tweede factor met herstelcodes."*
 *
 * WAAROM DIT HET ZWAARST WOOG. Het beheerderswachtwoord is één wachtwoord dat
 * elke klant, elk bestand en elke betaling opent, en het had geen lockout en geen
 * tweede factor. Alle andere maatregelen in dit project beschermen tegen iemand
 * die er nog niet is; dit is de enige die nog iets doet als het wachtwoord
 * ergens anders gelekt is.
 *
 * ── TOTP MET DE HAND, EN WAAROM DAT VERANTWOORD IS ─────────────────────────
 *
 * RFC 6238 is HMAC over een tellertje en dat is precies wat WebCrypto aanbiedt.
 * Er is dus geen bibliotheek nodig, en dat is maar goed ook: Workers heeft geen
 * native modules, en een pure-JS implementatie van iets groters zou hier
 * ongelezen meegaan. Dit is dertig regels rekenen waarvan elke stap in de RFC
 * staat, met een toets ernaast op de officiële testvectoren.
 *
 * SHA-1 EN NIET IETS NIEUWERS, en dat is geen slordigheid: elke
 * authenticator-app leest SHA-1 en de meeste kunnen niets anders. De aanval waar
 * SHA-1 zwak tegen is (botsingen) is hier niet van toepassing — HMAC-SHA1 is nog
 * altijd sterk, en het geheim is 160 bits.
 *
 * ── DE STAP DIE JE NIET KUNT OVERSLAAN ─────────────────────────────────────
 *
 * Er wordt niets aangezet door een migratie. `totp_secret` staat leeg tot Lucas
 * zich inschrijft, en `totp_confirmed_at` blijft leeg tot hij één keer een
 * kloppende code heeft ingetypt. Pas dán vraagt het inloggen erom. Een tweede
 * factor die aan gaat voordat iemand hem heeft kunnen instellen, is geen
 * beveiliging maar een gesloten deur.
 */

/** Hoeveel seconden één code geldig is. RFC 6238 noemt dertig als de gangbare stap. */
export const TOTP_STAP = 30;
/**
 * Hoeveel stappen ernaast nog worden geaccepteerd.
 *
 * Eén stap terug en één vooruit, dus een venster van negentig seconden. Dat dekt
 * een telefoonklok die een halve minuut afwijkt en iemand die de code net te laat
 * intypt. Ruimer maken vergroot het radenvenster evenredig: bij drie stappen
 * ernaast is de kans per poging zeven op een miljoen in plaats van drie.
 */
export const TOTP_DRIFT = 1;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Een nieuw TOTP-geheim: 160 bits, in de base32 die authenticator-apps lezen. */
export function mintTotpSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let uit = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) uit += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return uit;
}

/**
 * Base32 terug naar bytes. Spaties en kleine letters mogen: dit is een waarde die
 * een mens overtypt, en een geheim afkeuren omdat er een spatie in staat, leert
 * mensen alleen maar om het uit een tekstbestand te plakken.
 */
function base32Bytes(secret) {
  const schoon = String(secret || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const teken of schoon) {
    const i = BASE32.indexOf(teken);
    if (i === -1) return null;
    bits += i.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return bytes.length ? bytes : null;
}

/** De code voor één tijdstap. Dit is RFC 6238 §5.3, stap voor stap. */
async function totpVoorTeller(secretBytes, teller) {
  // De teller als acht bytes, hoogste byte eerst.
  const bericht = new Uint8Array(8);
  let rest = teller;
  for (let i = 7; i >= 0; i -= 1) { bericht[i] = rest & 0xff; rest = Math.floor(rest / 256); }

  const sleutel = await crypto.subtle.importKey(
    'raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', sleutel, bericht));

  // Dynamic truncation: de laatste vier bits wijzen de vier bytes aan.
  const offset = mac[mac.length - 1] & 0x0f;
  const getal = ((mac[offset] & 0x7f) << 24)
    | ((mac[offset + 1] & 0xff) << 16)
    | ((mac[offset + 2] & 0xff) << 8)
    | (mac[offset + 3] & 0xff);
  return String(getal % 1000000).padStart(6, '0');
}

/**
 * De code die een authenticator-app op dit moment zou tonen.
 *
 * Geëxporteerd omdat de toets hem nodig heeft. De eerste versie van die toets
 * ZOCHT de code — een lus van een miljoen pogingen langs verifyTotp() — en dat
 * duurde zo lang dat de tijdstap ondertussen omsloeg: de gevonden code was bij het
 * invullen al verlopen, en de toets viel willekeurig om in een volle run. Een toets
 * die zijn eigen antwoord moet raden, meet zijn eigen snelheid.
 *
 * Dit geeft niets weg: wie het geheim heeft, heeft de codes al.
 */
export async function totpCode(secret, { nu = Date.now() } = {}) {
  const bytes = base32Bytes(secret);
  if (!bytes) return null;
  return totpVoorTeller(bytes, Math.floor(nu / 1000 / TOTP_STAP));
}

/**
 * Klopt deze code bij dit geheim?
 *
 * Vergelijkt met de constante-tijdvergelijker uit token.js, en niet met `===`.
 * Bij zes cijfers is het tijdverschil te klein om over een netwerk te meten, maar
 * "te klein om te meten" is een aanname over de aanvaller en niet over de code —
 * en er staat hier al een vergelijker die het goed doet.
 */
export async function verifyTotp(code, secret, { nu = Date.now(), drift = TOTP_DRIFT } = {}) {
  const cijfers = String(code || '').replace(/\D/g, '');
  if (cijfers.length !== 6) return false;
  const bytes = base32Bytes(secret);
  if (!bytes) return false;

  const teller = Math.floor(nu / 1000 / TOTP_STAP);
  for (let d = -drift; d <= drift; d += 1) {
    const verwacht = await totpVoorTeller(bytes, teller + d);
    if (timingSafeEqual(cijfers, verwacht)) return true;
  }
  return false;
}

/** De otpauth-regel die een authenticator-app inleest. */
export function totpUri(secret, email, uitgever = 'VISUAILS') {
  const label = encodeURIComponent(`${uitgever}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(uitgever)}`
    + `&algorithm=SHA1&digits=6&period=${TOTP_STAP}`;
}

/* ── DE HERSTELCODES ────────────────────────────────────────────────────────
 *
 * Tien stuks, één keer te gebruiken, en ze worden GEHASHT opgeslagen — met
 * hashToken() en niet met PBKDF2, om precies de reden die de kop van dit bestand
 * uitlegt: dit zijn geen door mensen gekozen wachtwoorden maar 50 bits uit de
 * generator, en daar valt niets van af te raden.
 *
 * De vorm is vier groepjes van vijf tekens uit een alfabet zonder 0, O, 1, I en L,
 * want deze codes worden overgetypt van papier op het slechtste moment van de
 * maand.
 */
const HERSTEL_ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const HERSTEL_AANTAL = 10;

export function mintRecoveryCodes(aantal = HERSTEL_AANTAL) {
  const codes = [];
  for (let i = 0; i < aantal; i += 1) {
    const ruw = crypto.getRandomValues(new Uint8Array(20));
    let code = '';
    for (let j = 0; j < 20; j += 1) {
      if (j && j % 5 === 0) code += '-';
      code += HERSTEL_ALFABET[ruw[j] % HERSTEL_ALFABET.length];
    }
    codes.push(code);
  }
  return codes;
}

/** Streepjes en kleine letters mogen weg: dit wordt met de hand overgetypt. */
export function normaliseRecoveryCode(ruw) {
  return String(ruw || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
}

/** De hash die in de database komt te staan. Nooit de code zelf. */
export function hashRecoveryCode(code) {
  return hashToken(normaliseRecoveryCode(code));
}
