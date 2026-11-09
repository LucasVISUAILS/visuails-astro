/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE STUDIOBRIEF VANUIT /admin — 9 november 2026 (ronde 92)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"als een klant zich aanmeldt voor de nieuwsbrief heb ik dan een systeem
 * waardoor hij automatisch aan een lijst wordt toegevoegd waar ik een nieuwsbrief
 * naartoe kan sturen vanuit VISUAILS en deze mails in kan plannen in een schema en
 * als een klant onderaan de mail op afmelden klikt hij hier automatisch uitgehaald
 * wordt."* Zijn keuze: een scherm in /admin. Dit bestand is alles behalve het scherm
 * zelf (dat staat in admin.js, renderStudiobrief()).
 *
 * ── DE LIJST BESTOND AL ───────────────────────────────────────────────────────
 *
 * functions/api/studiobrief.js schrijft bij elke aanmelding een rij in `subscribers`
 * (het toestemmingsbewijs, de taal zit in `source`: "studiobrief-voet-nl") en maakt
 * een contact in Resend, in het segment van zijn taal als RESEND_SEGMENT_NL/_EN
 * gezet zijn. Resend is dus de verzendlijst; `subscribers` is wat wij ervan weten.
 *
 * ── VERSTUREN IS EEN BROADCAST BIJ RESEND ─────────────────────────────────────
 *
 * Niet zelf een lus over de adressen met sendMail(): een broadcast gaat naar het
 * segment zoals Resend het kent, Resend slaat afgemelde contacten zelf over en zet
 * de afmeldlink ({{{RESEND_UNSUBSCRIBE_URL}}}) per ontvanger in. Twee stappen
 * (bronnen in kladblok en 92/bevindingen/B5.md):
 *
 *   POST /broadcasts            { segment_id, from, reply_to, subject, html, text, name }
 *                               → { id }  — een concept bij Resend
 *   POST /broadcasts/{id}/send  { scheduled_at? }  — zonder: meteen; met een ISO-tijd: gepland
 *   DELETE /broadcasts/{id}     — alleen zolang hij concept of gepland is; een geplande
 *                                 broadcast verwijderen annuleert hem
 *
 * Mislukt de tweede stap, dan halen we het concept bij Resend weer weg: anders
 * staat daar een halve brief die iemand later per ongeluk verstuurt.
 *
 * ── AFMELDEN KOMT TERUG VIA DE WEBHOOK ────────────────────────────────────────
 *
 * Resend meldt een afmelding als `contact.updated` met `unsubscribed: true` (er is
 * geen apart afmeld-event; zie de lijst met event types). We vangen hem op in de
 * webhook die er al was voor bounces (functions/api/webhook/resend.js), met
 * hetzelfde secret en dezelfde Svix-handtekening, en zetten
 * `subscribers.unsubscribed_at`. `contact.deleted` telt ook als afgemeld: wie niet
 * meer in Resend staat, krijgt geen brief meer. De rij blijft staan, met de datum:
 * zo staat het in de privacyverklaring.
 */

import { shell, h1, p, button, esc, C as MC, FONT } from './mailTemplate.js';
import { htmlToText, stripComments } from './mail.js';
import { amsterdamNaarUtc } from './melding.js';

export const AFMELD_PLAATSHOUDER = '{{{RESEND_UNSUBSCRIBE_URL}}}';
export const RESEND_API = 'https://api.resend.com';
export const STATUSSEN = ['concept', 'gepland', 'verstuurd', 'fout'];
export const STATUS_LABEL = { concept: 'Concept', gepland: 'Gepland', verstuurd: 'Verstuurd', fout: 'Fout' };
export const MAX = { onderwerp: 150, voorvertoning: 200, kop: 120, tekst: 20000, knop_tekst: 40, knop_link: 500 };
/* De sleutel in app_settings waar de webhook het moment van het laatste contactbericht zet. */
export const WEBHOOK_LAATST = 'studiobrief.webhook.laatst';
/* De twee events van Resend waar een afmelding in zit (bijwerken, verwijderen). */
export const CONTACT_EVENTS = ['contact.updated', 'contact.deleted'];

/* ── DE AANMELDINGEN ────────────────────────────────────────────────────────── */

/** "studiobrief-voet-nl" → 'nl'. Een andere bron (de oude checklist) heeft geen taal. */
export function taalVanBron(source) {
  const m = /^studiobrief-[a-z]+-(nl|en)$/.exec(String(source || ''));
  return m ? m[1] : null;
}
/** "studiobrief-voet-nl" → 'voet'. */
export function plekVanBron(source) {
  const m = /^studiobrief-([a-z]+)-(?:nl|en)$/.exec(String(source || ''));
  return m ? m[1] : String(source || '—');
}
const PLEK_LABEL = { voet: 'Voet van de site', gidsen: 'Gidsen', editions: 'Editions' };
export function plekLabel(source) { const k = plekVanBron(source); return PLEK_LABEL[k] || k; }

/**
 * De aanmeldingen voor de Studiobrief, met zoeken. Alleen bronnen die met
 * "studiobrief-" beginnen: de checklist-inschrijvingen in dezelfde tabel gaven geen
 * toestemming voor een brief (die staan op /admin/berichten).
 *
 * `migratie: false` als unsubscribed_at nog niet bestaat (0070 niet gedraaid): de
 * lijst komt dan zonder afmeldstand, en het scherm zegt het.
 */
export async function leesAanmeldingen(env, { q = '', limiet = 300 } = {}) {
  const zoek = String(q || '').trim().toLowerCase().slice(0, 80);
  const like = `%${zoek.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const waar = `source LIKE 'studiobrief-%' AND (?1 = '' OR lower(email) LIKE ?2 ESCAPE '\\')`;
  try {
    const res = await env.DB.prepare(
      `SELECT id, email, source, created_at, unsubscribed_at FROM subscribers WHERE ${waar} ORDER BY id DESC LIMIT ?3`
    ).bind(zoek, like, limiet).all();
    return { rijen: res?.results || [], migratie: true, tabel: true };
  } catch (err) {
    const m = String(err?.message || err);
    if (/no such column/i.test(m)) {
      const res = await env.DB.prepare(
        `SELECT id, email, source, created_at, NULL AS unsubscribed_at FROM subscribers WHERE ${waar} ORDER BY id DESC LIMIT ?3`
      ).bind(zoek, like, limiet).all();
      return { rijen: res?.results || [], migratie: false, tabel: true };
    }
    if (/no such table/i.test(m)) return { rijen: [], migratie: false, tabel: false };
    throw err;
  }
}

/** Tellers per taal: actief en afgemeld. Over de hele tabel, niet over de zoekopdracht. */
export async function telAanmeldingen(env) {
  const leeg = { nl: { actief: 0, afgemeld: 0 }, en: { actief: 0, afgemeld: 0 }, anders: 0 };
  const lees = async (afmeldKolom) => (await env.DB.prepare(
    `SELECT source, ${afmeldKolom} AS af, COUNT(*) AS n FROM subscribers GROUP BY source, af`
  ).all())?.results || [];
  let rijen;
  try { rijen = await lees('unsubscribed_at IS NOT NULL'); } catch (err) {
    if (/no such column/i.test(String(err?.message || err))) {
      try { rijen = await lees('0'); } catch { return leeg; }
    } else return leeg;
  }
  for (const r of rijen) {
    const t = taalVanBron(r.source);
    if (!t) { leeg.anders += Number(r.n) || 0; continue; }
    leeg[t][r.af ? 'afgemeld' : 'actief'] += Number(r.n) || 0;
  }
  return leeg;
}

/* ── DE BRIEF ───────────────────────────────────────────────────────────────── */

const LINK_RE = /\[([^\]\n]{1,200})\]\(((?:https:\/\/|http:\/\/|mailto:)[^\s()<>"]{1,500})\)/g;

/** Een link in de lopende tekst: [tekst](https://…). Op tekst die al door esc() ging. */
function links(escaped) {
  return escaped.replace(LINK_RE, (_m, label, href) =>
    `<a href="${href}" style="color:${MC.ink};text-decoration:underline">${label}</a>`);
}

/** Een tussenkop in de brief: kleiner dan de kop, in dezelfde letter. */
export const h2 = (html) =>
  `<h2 style="margin:10px 0 10px;font-family:${FONT};font-size:18px;line-height:1.3;font-weight:700;color:${MC.head}">${html}</h2>`;

/**
 * De tekst van de brief naar blokken. Eenvoudige opmaak, met opzet:
 *   · een lege regel begint een nieuwe alinea;
 *   · een alinea die met "## " begint, is een tussenkop;
 *   · [tekst](https://…) is een link;
 *   · een enkele regelovergang blijft een regelovergang.
 * De knop staat los (twee velden), zodat er nooit meer dan één is.
 */
export function tekstNaarBlokken(tekst) {
  return String(tekst || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      /* Een tussenkop is de eerste regel; wat er direct onder staat, is gewoon tekst. */
      if (/^##\s+/.test(b)) {
        const [kop, ...rest] = b.split('\n');
        const onder = rest.join('\n').trim();
        return h2(links(esc(kop.replace(/^##\s+/, '').trim()))) + (onder ? p(links(esc(onder)).replace(/\n/g, '<br>')) : '');
      }
      return p(links(esc(b)).replace(/\n/g, '<br>'));
    });
}

/** De regel onderaan elke brief, met de afmeldlink die Resend per ontvanger invult. */
export function afmeldRegel(taal) {
  const nl = taal !== 'en';
  return p(`${esc(nl ? 'Afmelden kan onderaan elke brief.' : 'You can unsubscribe at the bottom of every letter.')} <a href="${AFMELD_PLAATSHOUDER}" style="color:${MC.muted};text-decoration:underline">${esc(nl ? 'Meld je hier af' : 'Unsubscribe here')}</a>.`, { muted: true, top: 8 });
}

/** De hele brief in de mailstijl van VISUAILS (mailTemplate.js), met de afmeldplaatshouder. */
export function briefHtml({ taal = 'nl', voorvertoning = '', kop = '', tekst = '', knop_tekst = '', knop_link = '' } = {}) {
  const lang = taal === 'en' ? 'en' : 'nl';
  const delen = [];
  if (String(kop).trim()) delen.push(h1(String(kop).trim()));
  delen.push(...tekstNaarBlokken(tekst));
  if (String(knop_tekst).trim() && /^https:\/\//.test(String(knop_link).trim())) delen.push(button(String(knop_link).trim(), String(knop_tekst).trim()));
  delen.push(p(esc('— VISUAILS')));
  delen.push(afmeldRegel(lang));
  return stripComments(shell({ lang, preheader: String(voorvertoning || ''), body: delen.join('') }));
}

/** Voor de proefmail: Resend vult de plaatshouder alleen in een broadcast in. Hier
    wordt het de mailto die de welkomstmail ook gebruikt, zodat de link iets doet. */
export function voorProef(html, taal = 'nl') {
  const onderwerp = taal === 'en' ? 'Unsubscribe Studio letter' : 'Afmelden Studiobrief';
  return String(html || '').split(AFMELD_PLAATSHOUDER).join(`mailto:hello@visuails.com?subject=${encodeURIComponent(onderwerp)}`);
}
/** Voor het voorbeeld in /admin: een link die nergens heen gaat. */
export function voorVoorbeeld(html) {
  return String(html || '').split(AFMELD_PLAATSHOUDER).join('#afmelden');
}

/* Het voorbeeld in /admin als eigen document: de CSP van /admin (style-src 'self')
   weigert de inline stijlen van een mail. Deze staat alleen inline stijl en beelden
   toe, geen script en geen formulier, en alleen in een frame van onze eigen site. */
export const VOORBEELD_CSP = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
export function voorbeeldAntwoord(html) {
  return new Response(voorVoorbeeld(html), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
      'content-security-policy': VOORBEELD_CSP,
    },
  });
}

/**
 * Wat er uit het formulier komt, gekortwiekt en gecontroleerd. `fouten` is leeg als
 * het een geldige brief is; een concept mag onvolledig zijn (`concept: true`).
 */
export function leesBriefForm(form, { concept = false } = {}) {
  const get = (k) => { const v = form?.get?.(k); return typeof v === 'string' ? v : ''; };
  const b = {
    taal: get('taal') === 'en' ? 'en' : 'nl',
    onderwerp: get('onderwerp').replace(/[\x00-\x1f\x7f]+/g, ' ').trim().slice(0, MAX.onderwerp),
    voorvertoning: get('voorvertoning').replace(/[\x00-\x1f\x7f]+/g, ' ').trim().slice(0, MAX.voorvertoning),
    kop: get('kop').replace(/[\x00-\x1f\x7f]+/g, ' ').trim().slice(0, MAX.kop),
    tekst: get('tekst').replace(/\r\n?/g, '\n').slice(0, MAX.tekst),
    knop_tekst: get('knop_tekst').replace(/[\x00-\x1f\x7f]+/g, ' ').trim().slice(0, MAX.knop_tekst),
    knop_link: get('knop_link').trim().slice(0, MAX.knop_link),
  };
  const fouten = [];
  if (b.knop_link && !/^https:\/\/[^\s<>"]+$/.test(b.knop_link)) fouten.push('De link van de knop moet met https:// beginnen.');
  if (b.knop_link && !b.knop_tekst) fouten.push('De knop heeft een link maar geen tekst.');
  if (b.knop_tekst && !b.knop_link) fouten.push('De knop heeft een tekst maar geen link.');
  if (!concept) {
    if (!b.onderwerp) fouten.push('Het onderwerp is leeg.');
    if (!b.kop) fouten.push('De kop is leeg.');
    if (!b.tekst.trim()) fouten.push('De tekst is leeg.');
  }
  return { brief: b, fouten };
}

/* ── DE TABEL studiobrieven ─────────────────────────────────────────────────── */

export async function leesBrieven(env, { limiet = 50 } = {}) {
  try {
    const res = await env.DB.prepare(
      `SELECT id, taal, onderwerp, status, resend_id, fout, gepland_op, verstuurd_op, gemaakt_op, bijgewerkt_op
         FROM studiobrieven ORDER BY COALESCE(gepland_op, verstuurd_op, bijgewerkt_op) DESC, id DESC LIMIT ?1`
    ).bind(limiet).all();
    return { rijen: res?.results || [], tabel: true };
  } catch (err) {
    if (/no such table/i.test(String(err?.message || err))) return { rijen: [], tabel: false };
    throw err;
  }
}

export async function leesBrief(env, id) {
  if (!Number.isInteger(id) || id < 1) return null;
  try { return await env.DB.prepare('SELECT * FROM studiobrieven WHERE id = ?1').bind(id).first(); }
  catch { return null; }
}

/** Een concept opslaan: nieuw (zonder id) of bijwerken. Alleen een concept of een
    mislukte brief is nog te bewerken; een geplande of verstuurde niet. */
export async function bewaarBrief(env, b, id = null) {
  const html = briefHtml(b);
  if (id) {
    const r = await env.DB.prepare(
      `UPDATE studiobrieven SET taal = ?2, onderwerp = ?3, voorvertoning = ?4, kop = ?5, tekst = ?6, knop_tekst = ?7, knop_link = ?8,
              html = ?9, status = 'concept', fout = NULL, bijgewerkt_op = datetime('now')
        WHERE id = ?1 AND status IN ('concept', 'fout')`
    ).bind(id, b.taal, b.onderwerp, b.voorvertoning, b.kop, b.tekst, b.knop_tekst, b.knop_link, html).run();
    return r?.meta?.changes ? id : null;
  }
  /* RETURNING id, zoals elders in /admin: dan hangt het id niet af van meta.last_row_id. */
  const r = await env.DB.prepare(
    `INSERT INTO studiobrieven (taal, onderwerp, voorvertoning, kop, tekst, knop_tekst, knop_link, html)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) RETURNING id`
  ).bind(b.taal, b.onderwerp, b.voorvertoning, b.kop, b.tekst, b.knop_tekst, b.knop_link, html).first();
  return Number(r?.id) || null;
}

/** Een geplande brief waarvan het moment voorbij is, staat als verstuurd. Resend
    verstuurt hem; wat er bij een ontvanger gebeurde, staat in Resend zelf. */
export async function bijwerkenGepland(env) {
  try {
    await env.DB.prepare(
      `UPDATE studiobrieven SET status = 'verstuurd', verstuurd_op = gepland_op, bijgewerkt_op = datetime('now')
        WHERE status = 'gepland' AND gepland_op IS NOT NULL AND gepland_op <= datetime('now')`
    ).run();
  } catch { /* geen tabel: niets bij te werken */ }
}

/* ── RESEND ─────────────────────────────────────────────────────────────────── */

/** Welke sleutels er staan. Alleen óf ze er zijn, nooit de waarde. */
export function stand(env = {}) {
  const gezet = (k) => env[k] !== undefined && env[k] !== null && String(env[k]).trim() !== '';
  return {
    sleutel: gezet('RESEND_API_KEY'),
    segmentNl: gezet('RESEND_SEGMENT_NL'),
    segmentEn: gezet('RESEND_SEGMENT_EN'),
    webhook: gezet('RESEND_WEBHOOK_SECRET'),
    afzender: afzender(env),
  };
}

/** De afzender van de brief: STUDIOBRIEF_FROM als die er is, anders die van elke mail. */
export function afzender(env = {}) {
  const eigen = String(env.STUDIOBRIEF_FROM || '').trim();
  return eigen || String(env.FROM_EMAIL || '').trim() || 'VISUAILS <orders@visuails.com>';
}

export function segmentVoor(env = {}, taal = 'nl') {
  const s = taal === 'en' ? env.RESEND_SEGMENT_EN : env.RESEND_SEGMENT_NL;
  return s ? String(s).trim() : '';
}

async function resend(env, method, pad, body) {
  const res = await fetch(`${RESEND_API}${pad}`, {
    method,
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let data = null;
  const tekst = await res.text().catch(() => '');
  try { data = tekst ? JSON.parse(tekst) : null; } catch { data = null; }
  return { ok: res.ok, status: res.status, data, tekst };
}

/** Een leesbare foutregel uit een Resend-antwoord. Nooit de sleutel. */
function resendFout(r, stap) {
  const msg = r?.data?.message || r?.data?.error || String(r?.tekst || '').slice(0, 200) || 'geen uitleg';
  const uitleg = r?.status === 401 || r?.status === 403
    ? ' — de sleutel wordt geweigerd of mag geen broadcasts maken (Resend: "Full access" nodig)'
    : '';
  return `Resend ${r?.status ?? '?'} bij ${stap}: ${msg}${uitleg}`;
}

/** Een moment uit het formulier (datetime-local, Amsterdamse tijd) → "YYYY-MM-DD HH:MM:SS" in UTC, of null. */
export function planMoment(lokaal, nu = new Date()) {
  const d = amsterdamNaarUtc(String(lokaal || ''));
  if (!d) return { fout: 'Kies een datum en tijd.' };
  if (d.getTime() < nu.getTime() + 5 * 60 * 1000) return { fout: 'Kies een moment minstens vijf minuten vanaf nu.' };
  return { iso: d.toISOString(), sql: d.toISOString().slice(0, 19).replace('T', ' ') };
}

/**
 * De brief naar Resend: eerst een broadcast als concept, dan versturen (meteen of op
 * `scheduledAt`, ISO). Geeft { ok, id } of { ok: false, fout }.
 */
export async function verstuurBroadcast(env, brief, { scheduledAt = null } = {}) {
  if (!env?.RESEND_API_KEY) return { ok: false, fout: 'RESEND_API_KEY is niet gezet: er kan niets naar Resend.' };
  const segment = segmentVoor(env, brief.taal);
  if (!segment) return { ok: false, fout: `RESEND_SEGMENT_${brief.taal === 'en' ? 'EN' : 'NL'} is niet gezet: Resend weet niet naar welke lijst.` };
  const html = brief.html || briefHtml(brief);
  const maak = await resend(env, 'POST', '/broadcasts', {
    segment_id: segment,
    from: afzender(env),
    reply_to: 'hello@visuails.com',
    subject: brief.onderwerp,
    html,
    text: htmlToText(html),
    name: `Studiobrief ${brief.taal.toUpperCase()} · ${brief.onderwerp}`.slice(0, 120),
  });
  const id = maak.data?.id ? String(maak.data.id) : '';
  if (!maak.ok || !id) return { ok: false, fout: resendFout(maak, 'het aanmaken van de broadcast') };
  const stuur = await resend(env, 'POST', `/broadcasts/${encodeURIComponent(id)}/send`, scheduledAt ? { scheduled_at: scheduledAt } : {});
  if (!stuur.ok) {
    /* Geen half concept bij Resend laten staan. Lukt ook dat niet, dan staat het id in de fout. */
    const weg = await resend(env, 'DELETE', `/broadcasts/${encodeURIComponent(id)}`).catch(() => ({ ok: false }));
    return { ok: false, fout: `${resendFout(stuur, 'het versturen')}${weg.ok ? '' : ` (het concept ${id} staat nog in Resend)`}` };
  }
  return { ok: true, id };
}

/** Een geplande broadcast annuleren: DELETE, wat Resend alleen toestaat zolang hij gepland of concept is. */
export async function annuleerBroadcast(env, resendId) {
  if (!env?.RESEND_API_KEY) return { ok: false, fout: 'RESEND_API_KEY is niet gezet.' };
  const r = await resend(env, 'DELETE', `/broadcasts/${encodeURIComponent(String(resendId))}`);
  return r.ok ? { ok: true } : { ok: false, fout: resendFout(r, 'het annuleren') };
}

/** Een contact in Resend afmelden (PATCH /contacts/{e-mail}). Voor wie per mail vroeg om afgemeld te worden. */
export async function meldContactAf(env, email) {
  if (!env?.RESEND_API_KEY) return { ok: false, fout: 'RESEND_API_KEY is niet gezet: alleen hier afgemeld, niet in Resend.' };
  const r = await resend(env, 'PATCH', `/contacts/${encodeURIComponent(email)}`, { unsubscribed: true });
  return r.ok ? { ok: true } : { ok: false, fout: resendFout(r, 'het afmelden in Resend') };
}

/* ── DE WEBHOOK: AFMELDINGEN ────────────────────────────────────────────────── */

/**
 * Een contactbericht van Resend. Null als het er geen is (dan gaat de webhook
 * verder met de bounces). `contact.updated` draagt `unsubscribed`; `contact.deleted`
 * telt als afgemeld.
 */
export function parseContactEvent(payload) {
  const type = String(payload?.type || '');
  if (!CONTACT_EVENTS.includes(type)) return null;
  const d = payload?.data || {};
  const email = String(d.email || '').trim().toLowerCase();
  if (!email || email.length > 254) return null;
  const moment = String(d.updated_at || payload.created_at || '').slice(0, 19).replace('T', ' ');
  const op = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(moment) ? moment : null;
  if (type === CONTACT_EVENTS[1]) return { type, email, afgemeld: true, op };
  if (typeof d.unsubscribed !== 'boolean') return null;
  return { type, email, afgemeld: d.unsubscribed, op };
}

/**
 * Schrijf de stand van Resend in `subscribers`. Afgemeld: de eerste datum blijft
 * (COALESCE), dus een tweede aflevering verandert niets. Weer aangemeld in Resend:
 * de datum gaat eraf, want dan stuurt Resend hem de brief weer. Een adres dat hier
 * niet staat (met de hand in Resend gezet) laat de tabel zoals hij is.
 * Fouten gooien: de webhook antwoordt dan 500 en Svix probeert het opnieuw.
 */
export async function verwerkContactEvent(env, ev) {
  const r = ev.afgemeld
    ? await env.DB.prepare(
      `UPDATE subscribers SET unsubscribed_at = COALESCE(unsubscribed_at, ?2, datetime('now')) WHERE lower(email) = ?1`
    ).bind(ev.email, ev.op).run()
    : await env.DB.prepare(
      'UPDATE subscribers SET unsubscribed_at = NULL WHERE lower(email) = ?1 AND unsubscribed_at IS NOT NULL'
    ).bind(ev.email).run();
  try {
    await env.DB.prepare(
      `INSERT INTO app_settings (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).bind(WEBHOOK_LAATST, new Date().toISOString()).run();
  } catch { /* alleen voor het scherm; geen reden om Svix opnieuw te laten proberen */ }
  return Number(r?.meta?.changes) || 0;
}

/** Wanneer de webhook het laatst iets over een contact binnenkreeg (ISO), of null. */
export async function webhookLaatst(env) {
  try {
    const r = await env.DB.prepare('SELECT value FROM app_settings WHERE key = ?1').bind(WEBHOOK_LAATST).first();
    return r?.value || null;
  } catch { return null; }
}

/** Met de hand afmelden in /admin (wie per mail vroeg). */
export async function meldAanmeldingAf(env, email) {
  const r = await env.DB.prepare(
    `UPDATE subscribers SET unsubscribed_at = COALESCE(unsubscribed_at, datetime('now'))
      WHERE lower(email) = ?1 AND source LIKE 'studiobrief-%'`
  ).bind(String(email || '').trim().toLowerCase()).run();
  return Number(r?.meta?.changes) || 0;
}
