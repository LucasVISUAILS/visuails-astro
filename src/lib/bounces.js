/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * MAIL DIE NIET AANKWAM — 4 september 2026 (doorlichting §3.7)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── HET GAT ──────────────────────────────────────────────────────────────────
 *
 * Alles wat de site naar een klant stuurt — bevestiging, betaallink, inloglink,
 * levering, factuur — gaat via Resend, en Resend zegt 200 zodra het bericht is
 * AANGENOMEN. Of het daarna bij de klant terechtkwam, wist /admin niet. Een
 * typefout in een e-mailadres bij het bestellen betekende: bestelling geplaatst,
 * betaallink nooit gezien, bestelling stil verlopen, en niemand die het merkte
 * behalve de klant die dacht dat wij niets deden.
 *
 * Resend meldt zo'n mislukking wel: als webhook, `email.bounced` (het adres
 * bestaat niet of weigert) en `email.complained` (de ontvanger markeerde ons als
 * spam). Deze module vangt die twee op en zet er een rode regel bij op elke plek
 * in /admin waar dat adres voorkomt — de bestelling, de klant, de lijst.
 *
 * ── DE HANDTEKENING ──────────────────────────────────────────────────────────
 *
 * Resend tekent met Svix: drie headers (`svix-id`, `svix-timestamp`,
 * `svix-signature`) en een secret dat begint met `whsec_` gevolgd door base64.
 * De handtekening is HMAC-SHA256 over `${id}.${timestamp}.${body}` met de
 * gedecodeerde bytes van dat secret, base64 in de header, mogelijk meerdere
 * (`v1,xxx v1,yyy`) tijdens een sleutelwissel. Zonder geldige handtekening
 * wordt er NIETS opgeslagen: een webhook die iedereen mag aanroepen is een
 * manier om elke klant een rode vlag te geven.
 *
 * Dezelfde regels als bij de andere twee webhooks: de RUWE tekst controleren en
 * niet een opnieuw geserialiseerde JSON, en een dubbele aflevering (hetzelfde
 * `svix-id`) is geen fout — de UNIQUE op event_id vangt hem.
 */

const MAX_AGE_SECONDS = 300;
const EVENTS = Object.freeze({
  'email.bounced': 'bounced',
  'email.complained': 'complained',
});

/** Gelijke lengte en constante tijd — een vroege `return false` lekt anders hoeveel bytes klopten. */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function base64ToBytes(b64) {
  const bin = atob(String(b64 || '').replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(buf) {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * Klopt deze Svix-handtekening bij deze body?
 *
 * @param {string} rawBody   request.text(), onaangeroerd
 * @param {{id?: string, timestamp?: string, signature?: string}} headers
 * @param {string} secret    `whsec_…` zoals Resend hem toont
 * @param {number} [nowSeconds]
 */
export async function verifySvix(rawBody, { id, timestamp, signature } = {}, secret, nowSeconds = Date.now() / 1000) {
  if (!id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > MAX_AGE_SECONDS) return false;

  let keyBytes;
  try {
    keyBytes = base64ToBytes(String(secret).replace(/^whsec_/, ''));
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`));
  const expected = bytesToBase64(mac);

  return String(signature).split(/\s+/)
    .map((part) => part.split(',')) // "v1,base64"
    .filter(([v]) => v === 'v1')
    .some(([, sig]) => timingSafeEqual(sig || '', expected));
}

/**
 * Haal uit een Resend-webhook wat wij bewaren. Null als het geen bounce of
 * klacht is — de rest van Resends gebeurtenissen (sent, delivered, opened) is
 * hier niet aan de orde en wordt met 200 beantwoord zonder iets te schrijven.
 */
export function parseBounce(payload) {
  const kind = EVENTS[String(payload?.type || '')];
  if (!kind) return null;
  const d = payload.data || {};
  const to = Array.isArray(d.to) ? d.to : (d.to ? [d.to] : []);
  const email = String(to[0] || '').trim().toLowerCase();
  if (!email) return null;
  const b = d.bounce || {};
  return {
    kind,
    email,
    emailId: String(d.email_id || '').slice(0, 80) || null,
    subject: String(d.subject || '').slice(0, 200) || null,
    bounceType: [b.type, b.subType].filter(Boolean).join('/').slice(0, 60) || null,
    message: String(b.message || '').slice(0, 500) || null,
    occurredAt: String(payload.created_at || d.created_at || '').slice(0, 19).replace('T', ' ') || null,
  };
}

/**
 * Schrijf één gebeurtenis weg. Dubbel (zelfde event_id) → false, zonder fout.
 * Andere fouten gooien, zodat de webhook met 500 antwoordt en Svix het opnieuw
 * probeert — zie de kop van functions/api/webhook/mollie.js voor die regel.
 */
export async function recordBounce(env, eventId, b) {
  try {
    await env.DB.prepare(
      `INSERT INTO mail_bounces (event_id, email, kind, email_id, subject, bounce_type, message, occurred_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, COALESCE(?8, datetime('now')))`
    ).bind(eventId, b.email, b.kind, b.emailId, b.subject, b.bounceType, b.message, b.occurredAt).run();
    return true;
  } catch (err) {
    if (/UNIQUE/i.test(String(err?.message || err))) return false;
    throw err;
  }
}

/**
 * De laatste bounce per adres, voor een lijst adressen — één query voor een
 * hele bestellijst. Geeft een Map(email → rij). Adressen worden kleingemaakt,
 * want zo staan ze in mail_bounces; orders.email kan hoofdletters dragen.
 *
 * Een ontbrekende tabel (migratie 0045 nog niet gedraaid) geeft een lege Map:
 * een vlag die er niet is, is een leeg scherm en geen omgevallen scherm.
 */
export async function bouncesFor(env, emails) {
  const uniek = [...new Set((emails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))];
  const out = new Map();
  if (!uniek.length || !env?.DB) return out;
  const marks = uniek.map((_, i) => `?${i + 1}`).join(', ');
  try {
    const res = await env.DB.prepare(
      `SELECT email, kind, bounce_type, message, subject, MAX(occurred_at) AS occurred_at
         FROM mail_bounces
        WHERE email IN (${marks}) AND resolved_at IS NULL
        GROUP BY email`
    ).bind(...uniek).all();
    for (const r of res?.results || []) out.set(r.email, r);
  } catch (err) {
    if (!/no such table|no such column/i.test(String(err?.message || err))) {
      console.error('[bounces] lezen mislukt —', err?.message || err);
    }
  }
  return out;
}

/** Eén korte regel voor /admin. */
export function bounceLine(r) {
  if (!r) return '';
  const wat = r.kind === 'complained' ? 'marked our mail as spam' : 'bounced';
  const wanneer = String(r.occurred_at || '').slice(0, 10);
  const reden = r.bounce_type ? ` (${r.bounce_type})` : '';
  return `Mail to ${r.email} ${wat}${wanneer ? ` on ${wanneer}` : ''}${reden}. Check the address before relying on email — the customer may have seen nothing.`;
}
