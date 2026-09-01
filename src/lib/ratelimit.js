// VISUAILS — rate limiting for the client portal. Section 10.
//
// The brief asks for rate-limited lookups on /o/<token>. This is that, backed by
// D1 because the project has no KV binding.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS IS ACTUALLY DEFENDING, AND WHY THAT MATTERS
// It is tempting to say "so nobody can brute-force a token". That is not it. A
// portal token is 256 bits of CSPRNG output; at a million guesses a second the
// heat death of the universe arrives first. The limiter buys exactly nothing
// against guessing, and pretending otherwise leads to the wrong design.
//
// What it defends is the DATABASE. A URL shaped like a real token costs a D1
// read whether or not it matches, so an unlimited /o/ is a free query amplifier
// pointed at the same database the studio runs on. The limiter caps that, and
// isWellFormedToken() in token.js caps it harder by rejecting anything that
// isn’t token-shaped before this file is even reached.
//
// This is also why /api/capacity has no limiter and this does. That endpoint is
// public and identical for everyone, so a 60-second cache removes the load
// outright and a limiter would only add a write per read. The portal is private
// and per-order, so it can never be cached at the edge and must touch D1 on
// every legitimate request. Here the limiter's write is one more operation on a
// request that was always going to do several; there it would have been the
// only one.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE SALT GENERATES ITSELF
// The bucket key is a hash of the caller's IP, so this table must never become a
// visitor log. An unsalted SHA-256 of an IPv4 address is not anonymous — the
// whole space is 2^32 and sweeping it is minutes of work — so the hash needs a
// secret salt to mean anything.
//
// The obvious move is to require an env var. That was the first design here and
// it was wrong, because it forces a choice between two bad failures on a missing
// variable: fail closed and the portal is down for real clients, or fail open
// and the privacy property is silently gone. Both are worse than the problem.
//
// The salt is not information anyone needs to know, so nobody needs to supply
// it. It is generated once with crypto.getRandomValues, stored in app_settings,
// and read back — INSERT OR IGNORE means a race between two cold isolates
// converges on one value rather than fighting. env.PORTAL_SALT still overrides
// it if there is ever a reason to pin one. Zero configuration, and the failure
// mode of forgetting a variable does not exist.
// ─────────────────────────────────────────────────────────────────────────────

const SALT_KEY = 'portal_ip_salt';

/**
 * Per-isolate cache. A Worker isolate serves many requests, so this makes the
 * salt read amortise to roughly nothing. It is a cache of a value that never
 * changes, which is the only kind that is safe to hold like this.
 */
let saltCache = null;

/** Sensible default for portal lookups: generous for a person, tight for a script. */
export const PORTAL_LIMIT = 30;
export const PORTAL_WINDOW_SECONDS = 60;

/**
 * Count this request against its bucket.
 *
 * Returns { allowed, hits, limit, retryAfter }. Never throws for an ordinary D1
 * hiccup — see the note on the catch for why this one fails OPEN, which is the
 * opposite of what /api/capacity does and is deliberate.
 *
 * @param {object} env      Worker env (needs env.DB)
 * @param {object} opts
 * @param {string} opts.ip      caller address, from CF-Connecting-IP
 * @param {string} opts.action  namespace, so a GET flood cannot lock out POSTs
 * @param {string} opts.nowIso  the clock, injected so tests can freeze it
 */
/* ── `key` NAAST `ip` — 31 augustus 2026 ────────────────────────────────────
 *
 * De emmer werd altijd op het IP gehasht, en dat is voor een publieke stroom het
 * juiste. Voor het RADEN VAN EEN CODE is het de verkeerde as: de aanvaller kiest
 * zijn IP en het slachtoffer niet, dus een teller per IP telt de verkeerde kant.
 * Een tweede emmer op de klant zelf sluit dat gat zonder de eerste te vervangen —
 * de twee tellen langs elkaar en de strengste wint.
 *
 * Geen nieuwe functie en geen tweede tabel: `key` is precies wat er gehasht wordt,
 * en `ip` blijft de naam voor het gewone geval. */
export async function checkRate(env, { ip, key: sleutel, action = 'portal', limit = PORTAL_LIMIT, windowSeconds = PORTAL_WINDOW_SECONDS, nowIso = new Date().toISOString() } = {}) {
  const open = { allowed: true, hits: 0, limit, retryAfter: 0 };
  if (!env?.DB) return open;

  try {
    const salt = await getSalt(env);
    const key = `${action}:${await digest(`${salt}|${sleutel || ip || 'unknown'}`)}:${windowStamp(nowIso, windowSeconds)}`;
    const expiresAt = new Date(Date.parse(nowIso) + windowSeconds * 2000).toISOString();

    // One statement, one round trip, atomic. RETURNING hands back the value the
    // upsert settled on, so two concurrent requests cannot both read "1".
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (bucket, hits, expires_at) VALUES (?1, 1, ?2)
         ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1
       RETURNING hits`
    )
      .bind(key, expiresAt)
      .first();

    const hits = Number(row?.hits) || 1;
    return {
      allowed: hits <= limit,
      hits,
      limit,
      retryAfter: hits <= limit ? 0 : secondsLeftInWindow(nowIso, windowSeconds),
    };
  } catch {
    // FAILING OPEN IS THE RIGHT CHOICE HERE, AND IT IS NOT THE CHOICE
    // /api/capacity MAKES. There, a broken database means the answer would be a
    // delivery date invented out of ignorance, so it refuses to answer at all.
    // Here, a broken limiter means only that the flood control is off — and the
    // request behind it is a real client trying to reach their own photographs.
    // Locking them out to protect a counter inverts what is being protected.
    //
    // Nothing is silently lost either way: the lookup this guards is about to
    // hit the same database, and if D1 is genuinely down it will fail there,
    // loudly, on its own terms.
    return open;
  }
}

/** Drop dead buckets. Cheap, and called from waitUntil so it is never on the critical path. */
export async function sweepRateLimits(env, nowIso = new Date().toISOString()) {
  if (!env?.DB) return;
  try {
    await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?1').bind(nowIso).run();
  } catch {
    /* housekeeping — a failed sweep is not worth a failed request */
  }
}

/**
 * Should this request pay for a sweep?
 *
 * Roughly one request in fifty, so the table stays small without a cron and
 * without a delete on every hit. Math.random is fine for this and only this: it
 * chooses a maintenance moment, not a secret.
 */
export function shouldSweep() {
  return Math.random() < 0.02;
}

/**
 * The salt, generated on first use and stored. See the header for why this is
 * not an env var.
 */
async function getSalt(env) {
  if (env?.PORTAL_SALT) return env.PORTAL_SALT;
  if (saltCache) return saltCache;

  const fresh = randomHex(32);
  // Whoever gets there first wins; everyone else’s INSERT is ignored and the
  // SELECT below hands them the winner's value.
  await env.DB.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?1, ?2)')
    .bind(SALT_KEY, fresh)
    .run();
  const row = await env.DB.prepare('SELECT value FROM app_settings WHERE key = ?1').bind(SALT_KEY).first();

  saltCache = row?.value || fresh;
  return saltCache;
}

function randomHex(bytes) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function digest(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Which fixed window this instant falls in. Integer, so it is stable within the window. */
function windowStamp(nowIso, windowSeconds) {
  return Math.floor(Date.parse(nowIso) / (windowSeconds * 1000));
}

function secondsLeftInWindow(nowIso, windowSeconds) {
  const ms = windowSeconds * 1000;
  return Math.ceil((ms - (Date.parse(nowIso) % ms)) / 1000);
}

/** The caller's address, as Cloudflare reports it. */
export function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
