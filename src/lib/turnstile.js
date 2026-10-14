// VISUAILS — Cloudflare Turnstile op de server: het token nakijken. 8 oktober 2026.
//
// ── WAAROM, EN LUCAS' VOORWAARDE ──────────────────────────────────────────────
//
// Afvinklijst o03: een onzichtbare botcheck op het bestelformulier (ook de
// €1-proef), het contactformulier, de Studiobrief-aanmelding en het starten van
// een uploadbatch. Die formulieren mailen, maken bestellingen en vullen opslag;
// een script kon dat tot nu toe doen tot de snelheidsgrens het stopte.
//
// Lucas, letterlijk: *"Alleen doen wanneer dit echte klanten niet mogelijk gaat
// hinderen."* Daaruit volgen vier regels, en die staan allemaal in dit bestand:
//
//   1  ONZICHTBAAR. De browser vraagt het token pas bij het versturen
//      (src/scripts/botcheck.js); een gewone bezoeker ziet niets.
//   2  GEEN SLEUTELS, GEEN BOTCHECK. Ontbreekt TURNSTILE_SITE_KEY of
//      TURNSTILE_SECRET_KEY, dan is alles uit en werkt elk formulier precies
//      zoals voorheen (`uit`).
//   3  GEEN TOKEN IS GEEN BLOKKADE. Een adblocker, een storing, een script dat
//      niet laadt: dan komt het formulier zonder token. Dat wordt NIET
//      geweigerd, maar strenger begrensd en in /admin gemarkeerd (`streng`).
//      Alleen als Cloudflare uitdrukkelijk zegt dat het token ongeldig is
//      (`invalid-input-response`) wordt het verzoek geweigerd, met een
//      vriendelijke melding en WhatsApp of mail als uitweg.
//   4  STORING BIJ CLOUDFLARE = DOORLATEN. Geeft het controleadres geen
//      antwoord, een fout, of is onze eigen sleutel verkeerd ingevuld, dan
//      gaat het verzoek door (fail-open), strenger begrensd en gemarkeerd.
//
// Een token dat al gebruikt of verlopen is (`timeout-or-duplicate`) telt ook
// als `streng` en niet als blokkade: dat gebeurt een echte klant die twee keer
// op versturen drukt, of wiens verbinding even haperde.

export const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Het veld waarin de browser het token meestuurt. */
export const TOKEN_VELD = 'turnstile';

/** Staan beide sleutels erin? Zo niet, dan is de botcheck uit. */
export function botcheckAan(env) {
  return Boolean(String(env?.TURNSTILE_SITE_KEY || '').trim() && String(env?.TURNSTILE_SECRET_KEY || '').trim());
}

/**
 * Kijk het token na bij Cloudflare.
 *
 * Geeft `{ stand, codes }`, met als stand:
 *   'uit'        geen sleutels: niets gecontroleerd
 *   'goed'       Cloudflare zegt: een mens
 *   'geen-token' het formulier stuurde niets mee
 *   'verlopen'   al gebruikt of te oud (timeout-or-duplicate)
 *   'ongeldig'   Cloudflare zegt uitdrukkelijk: ongeldig (invalid-input-response)
 *   'storing'    geen of een onbruikbaar antwoord, of onze sleutel klopt niet
 */
export async function controleerBotcheck(env, { token, ip = '', wachtMs = 3000 } = {}) {
  if (!botcheckAan(env)) return { stand: 'uit', codes: [] };
  const t = typeof token === 'string' ? token.trim() : '';
  /* Cloudflare-tokens zijn hoogstens 2048 tekens. Iets veel langers is geen
     token; dat wordt niet doorgestuurd maar telt als "geen token" (streng, niet
     geweigerd: regel 3 hierboven zegt dat alleen Cloudflare mag weigeren). */
  if (!t || t.length > 4096) return { stand: 'geen-token', codes: [] };

  const klok = new AbortController();
  const wekker = setTimeout(() => klok.abort(), wachtMs);
  try {
    const body = new FormData();
    body.append('secret', String(env.TURNSTILE_SECRET_KEY).trim());
    body.append('response', t);
    if (ip && ip !== 'unknown') body.append('remoteip', ip);
    const res = await fetch(TURNSTILE_VERIFY, { method: 'POST', body, signal: klok.signal });
    if (!res.ok) return { stand: 'storing', codes: [`http-${res.status}`] };
    const uit = await res.json().catch(() => null);
    if (uit && uit.success === true) return { stand: 'goed', codes: [] };
    const codes = Array.isArray(uit?.['error-codes']) ? uit['error-codes'].map(String) : [];
    if (codes.includes('invalid-input-response')) return { stand: 'ongeldig', codes };
    if (codes.includes('timeout-or-duplicate')) return { stand: 'verlopen', codes };
    /* invalid-input-secret, missing-input-secret, internal-error, bad-request:
       aan onze kant of bij Cloudflare. Doorlaten (regel 4). */
    console.error('[turnstile] geen bruikbaar antwoord —', codes.join(', ') || 'zonder foutcode');
    return { stand: 'storing', codes };
  } catch (err) {
    console.error('[turnstile] controleadres niet bereikt —', err?.name === 'AbortError' ? 'te traag' : (err?.message || err));
    return { stand: 'storing', codes: [err?.name === 'AbortError' ? 'timeout' : 'netwerk'] };
  } finally {
    clearTimeout(wekker);
  }
}

/** Wat te doen met een stand: 'door', 'streng' of 'weiger'. */
export function botcheckBesluit(stand) {
  if (stand === 'ongeldig') return 'weiger';
  if (stand === 'uit' || stand === 'goed') return 'door';
  return 'streng';
}

/** De zin voor /admin en de studiomail bij een gemarkeerde inzending. */
export function botcheckUitleg(stand) {
  return ({
    'geen-token': 'geen botcheck meegestuurd (script geblokkeerd of niet geladen) — doorgelaten, strenger begrensd',
    verlopen: 'botcheck al gebruikt of verlopen (twee keer verstuurd?) — doorgelaten, strenger begrensd',
    storing: 'botcheck niet te controleren (storing bij Cloudflare of een verkeerde sleutel) — doorgelaten, strenger begrensd',
  })[stand] || '';
}
