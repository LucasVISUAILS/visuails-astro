/* ── DE NU-DOEN-LIJST — 8 oktober 2026 (punt 4.05, V36 = a) ─────────────────
 *
 * Eén lijst in vaste volgorde, met één knop per regel, op drie plekken:
 *   · bovenaan het dashboard in /admin;
 *   · bovenaan het nachtrapport (cron/index.js), dat sinds V36 elke nacht komt,
 *     ook als er niets open staat (onderwerp "… — niets open");
 *   · als "Volgende stap: …" bovenaan elke bestelpagina (dezelfde query, op één
 *     bestelling).
 * Eén functie voedt alle drie, zodat mail en scherm nooit iets anders zeggen.
 *
 * DE VOLGORDE (eerst afmaken, dan beginnen):
 *   1 btw      btw-controle (belofte: binnen 24 uur)          → Beoordelen
 *   2 leveren  klaar om te leveren (In controle), of nieuwe
 *              beelden / een afgehandelde revisie nog niet
 *              gemeld                                          → Leverkeuring / N nieuwe beelden melden
 *   3 revisie  open revisierondes, oudste eerst                → Revisie openen
 *   4 oppakken betaald en nog niet opgepakt, vaste dag eerst  → Oppakken
 *   5 fotos    foto's ontbreken, sinds een dag of langer       → Foto's vragen
 *   6 offerte  aanvraag zonder offerte                         → Offerte maken
 *   7 review   afgerond, review nog niet gevraagd (3.06)       → Review vragen
 * Onbetaalde bestellingen staan er niet in (behalve de aanvraag die nog een
 * offerte nodig heeft): wachten op een klant is geen werk.
 *
 * EEN EINDPUNT. Elke regel verdwijnt door Lucas' eigen handeling: de btw
 * beoordelen, de status verzetten, melden, de revisie afhandelen, de offerte
 * vastleggen, de review vragen. Een lege lijst zegt "Niets wacht op jou".
 * Een lijst die niet gelezen kon worden, zegt dat — nooit "niets".
 *
 * TWEE QUERY'S (zie NU_DOEN_SQL_DELEN). Alle zeven soorten in UNION ALL (twee verzoeken tegelijk, want de
 * nacht heeft er op het gratis plan vijftig), plus alleen als er kandidaten
 * voor "foto's ontbreken" zijn één query voor hun uploads; wat er ontbreekt
 * rekent src/lib/ontbreekt.js uit, zoals overal.
 *
 * Geen DOM en geen admin.js: de cron-Worker laadt dit bestand ook.
 */
import { ontbrekendeFotos, aantalOntbrekend, ontbrekendRegels } from './ontbreekt.js';
import { korteDatum, VRAAG_DAGEN } from './nuzin.js';
import { waLink, REVIEW_GEVRAAGD } from './waLink.js';
import { serviceLabel } from '../data/services.js';

/** De vaste volgorde. */
/* 'abonnement' (15 oktober 2026, v31-abonnees = a): een terugboeking, een mislukte
   incasso, of een abonnement dat loopt zonder incasso bij Mollie. Na de btw: het is
   geld dat niet binnenkomt. Zie AboSql hieronder; staat alleen op het dashboard en
   in het nachtrapport, niet bij een bestelling. */
export const NU_DOEN_SOORTEN = Object.freeze(['btw', 'abonnement', 'leveren', 'revisie', 'oppakken', 'fotos', 'offerte', 'review']);

/* Hoe lang een lopend abonnement zonder Mollie-abonnement mag duren voor het hier
   staat: het koppelen wordt in Studio, bij de webhook en elke nacht geprobeerd. */
export const ZONDER_INCASSO_NA_DAGEN = 1;

/* ?1 = vóór dit moment begonnen (zonder incasso). Dezelfde kolommen als kol(). */
export const ABO_SQL = `SELECT 'abonnement' AS soort, s.customer_id AS id, s.ref AS ref, c.brand AS brand, c.name AS name, c.email AS email,
          NULL AS lang, s.status AS status, NULL AS service, 0 AS product_count, NULL AS betaling, NULL AS closed_at,
          COALESCE(s.paused_at, s.started_at, s.created_at) AS sleutel, COALESCE(s.paused_at, s.started_at, s.created_at) AS datum,
          0 AS n, 0 AS n2,
          CASE WHEN s.status = 'paused' AND s.pause_reason = 'chargeback' THEN 'terugboeking'
               WHEN s.status = 'paused' AND s.pause_reason = 'payment_failed' THEN 'mislukt'
               ELSE 'geen-incasso' END AS extra,
          NULL AS details_json, NULL AS phone, c.phone AS c_phone, c.country AS land
     FROM subscriptions s JOIN customers c ON c.id = s.customer_id
    WHERE (s.status = 'paused' AND s.pause_reason IN ('chargeback', 'payment_failed'))
       OR (s.status = 'active' AND COALESCE(s.term, '') <> 'prepaid' AND s.mollie_customer_id IS NOT NULL
           AND s.mollie_subscription_id IS NULL AND datetime(COALESCE(s.started_at, s.created_at)) <= datetime(?1))
    LIMIT 100`;

/* Na hoeveel dagen een ontbrekende foto in de lijst komt. Intern (geen belofte
   aan de klant): de eerste dag kan de klant zelf nog nasturen in Studio. */
export const FOTO_MIST_NA_DAGEN = 1;

/* Hoe lang "review vragen" blijft staan na het afronden: dezelfde veertien
   dagen als "Hoe vond je het?" vooraan in Studio (VRAAG_DAGEN, nuzin.js).
   Daarna is vragen te laat, en de regel valt vanzelf weg. */
export const REVIEW_VRAGEN_DAGEN = VRAAG_DAGEN;

/* Dezelfde fotodiensten als NASTUUR_DIENSTEN in admin.js (ontbreektVoorAdmin):
   alleen daar is een ontbrekende foto werk. tests/nu-doen.test.mjs houdt de
   twee gelijk. */
export const FOTO_DIENSTEN = Object.freeze(['catalog', 'lifestyle', 'drop']);

/* Aanvragen zonder tarief: de offerte maakt het bedrag (handleQuote in admin.js). */
export const OFFERTE_DIENSTEN = Object.freeze(['custom', 'video']);

const lijstSql = (xs) => xs.map((x) => `'${x}'`).join(', ');

/** 'YYYY-MM-DD HH:MM:SS' in UTC, zoals datetime('now') in D1. */
export function sqlStempel(ms) {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

/* ── DE REVIEWREGEL, GEDEELD MET HET NACHTRAPPORT ─────────────────────────────
   Afgerond, geleverd, niet verborgen, en nog geen regel "review gevraagd" in
   order_events. ?2 = vanaf wanneer afgerond, ?3 = REVIEW_GEVRAAGD. De cron
   gebruikt dezelfde voorwaarde voor "Afgerond gisteren" (afgerondGisteren). */
export const REVIEW_VRAGEN_WAAR = `o.status = 'delivered' AND o.closed_at IS NOT NULL
          AND datetime(o.closed_at) >= datetime(?2)
          AND COALESCE(o.hidden_at, '') = ''
          AND NOT EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = o.id AND e.note = ?3)`;

/** De afgeronde bestellingen zonder reviewvraag, sinds `sinds` (sqlStempel). */
export async function reviewTeVragen(db, { sinds, limiet = 20 } = {}) {
  const { results } = await db.prepare(
    `SELECT o.id, o.ref, o.brand, o.name, o.email
       FROM orders o
      WHERE ${REVIEW_VRAGEN_WAAR}
      ORDER BY o.closed_at LIMIT ${Number(limiet) || 20}`
  ).bind(null, sinds, REVIEW_GEVRAAGD).all();
  return results || [];
}

/* Eén kolomrij per soort, zodat de UNION ALL klopt. */
function kol(soort, { sleutel, datum = sleutel, n = '0', n2 = '0', extra = 'NULL', details = 'NULL' }) {
  return `'${soort}' AS soort, o.id AS id, o.ref AS ref, o.brand AS brand, o.name AS name, o.email AS email,
          o.lang AS lang, o.status AS status, o.service AS service, o.product_count AS product_count,
          o.payment_status AS betaling, o.closed_at AS closed_at,
          ${sleutel} AS sleutel, ${datum} AS datum, ${n} AS n, ${n2} AS n2, ${extra} AS extra,
          ${details} AS details_json,
          o.phone AS phone, c.phone AS c_phone, COALESCE(o.country, c.country) AS land`;
}
const VAN = 'FROM orders o LEFT JOIN customers c ON c.id = o.customer_id';
const EEN = '(?4 IS NULL OR o.id = ?4)';

const NIEUW_BEELD = `f.order_id = o.id AND f.kind = 'delivery' AND f.announced_at IS NULL AND f.superseded_at IS NULL`;
const OPEN_REVISIE = `f.order_id = o.id AND f.review_state = 'revision_requested' AND f.superseded_at IS NULL`;

/* ?1 = foto's ontbreken vóór dit moment, ?2 = afgerond na dit moment,
   ?3 = REVIEW_GEVRAAGD, ?4 = één bestelling (of NULL voor alles). */
/* D1 STAAT HOOGSTENS VIJF DELEN IN ÉÉN UNION TOE ("too many terms in compound
   SELECT" vanaf zes; gemeten op 8 okt met de lokale D1 van wrangler). De acht
   soorten gaan daarom in twee query's van vier, die tegelijk lopen. De tests
   met node:sqlite zagen dit niet: die staat er vijfhonderd toe. */
export const NU_DOEN_SQL_DELEN = Object.freeze([`SELECT * FROM (
  SELECT ${kol('btw', { sleutel: 'COALESCE(o.review_requested_at, o.created_at)' })}
    ${VAN}
   WHERE o.review_state = 'pending' AND COALESCE(o.status, '') <> 'cancelled' AND ${EEN}
  UNION ALL
  SELECT ${kol('leveren', { sleutel: 'o.created_at', datum: 'NULL', extra: "'controle'" })}
    ${VAN}
   WHERE o.status = 'human_check' AND o.hidden_at IS NULL AND ${EEN}
  UNION ALL
  SELECT ${kol('leveren', {
    sleutel: `(SELECT MIN(f.created_at) FROM files f WHERE ${NIEUW_BEELD})`,
    n: `(SELECT COUNT(*) FROM files f WHERE ${NIEUW_BEELD})`,
    n2: `(SELECT COUNT(*) FROM revision_requests r WHERE r.order_id = o.id
            AND (r.resolved_at IS NULL OR r.resolved_at > COALESCE(o.redelivery_mailed_at, o.delivery_mailed_at, '0000')))`,
    extra: "'nieuw'",
  })}
    ${VAN}
   WHERE o.delivery_mailed_at IS NOT NULL AND o.hidden_at IS NULL AND COALESCE(o.status, '') <> 'cancelled'
     AND EXISTS (SELECT 1 FROM files f WHERE ${NIEUW_BEELD})
     AND NOT EXISTS (SELECT 1 FROM files f WHERE ${OPEN_REVISIE}) AND ${EEN}
  UNION ALL
  SELECT ${kol('revisie', { sleutel: 'MIN(f.reviewed_at)', n: 'COUNT(*)', extra: 'MIN(f.id)' })}
    FROM files f JOIN orders o ON o.id = f.order_id LEFT JOIN customers c ON c.id = o.customer_id
   WHERE f.review_state = 'revision_requested' AND f.superseded_at IS NULL AND o.hidden_at IS NULL AND ${EEN}
   GROUP BY o.id) LIMIT 400`, `SELECT * FROM (  SELECT ${kol('oppakken', {
    sleutel: "CASE WHEN o.window_start IS NOT NULL THEN '0 ' || o.window_start ELSE '1 ' || COALESCE(o.paid_at, o.created_at) END",
    datum: 'COALESCE(o.paid_at, o.created_at)',
    extra: 'o.window_start',
  })}
    ${VAN}
   WHERE o.status = 'received' AND o.payment_status IN ('paid', 'plan', 'credits') AND o.hidden_at IS NULL AND ${EEN}
  UNION ALL
  SELECT ${kol('fotos', { sleutel: 'COALESCE(o.paid_at, o.created_at)', details: 'o.details_json' })}
    ${VAN}
   WHERE o.status = 'received' AND o.payment_status IN ('paid', 'plan', 'credits') AND o.hidden_at IS NULL
     AND o.service IN (${lijstSql(FOTO_DIENSTEN)})
     AND datetime(COALESCE(o.paid_at, o.created_at)) <= datetime(?1) AND ${EEN}
  UNION ALL
  SELECT ${kol('offerte', { sleutel: 'o.created_at' })}
    ${VAN}
   WHERE o.service IN (${lijstSql(OFFERTE_DIENSTEN)}) AND COALESCE(o.total_cents, 0) = 0
     AND COALESCE(o.status, '') <> 'cancelled' AND COALESCE(o.payment_status, 'unpaid') <> 'paid'
     AND o.hidden_at IS NULL AND ${EEN}
  UNION ALL
  SELECT ${kol('review', { sleutel: 'o.closed_at' })}
    ${VAN}
   WHERE ${REVIEW_VRAGEN_WAAR} AND ${EEN}
) LIMIT 400`]);
/** @deprecated één string bestaat niet meer; zie NU_DOEN_SQL_DELEN. */
export const NU_DOEN_SQL = NU_DOEN_SQL_DELEN;

/**
 * De lijst, in vaste volgorde.
 * @param {D1Database} db
 * @param {{ nu?: Date|number, orderId?: number|null }} [opties]
 * @returns {Promise<{ regels: object[], fout: string|null }>}
 *   fout ≠ null: de lijst kon niet gelezen worden; toon dat, nooit "niets".
 */
export async function nuDoen(db, { nu = Date.now(), orderId = null } = {}) {
  if (!db) return { regels: [], fout: 'geen database' };
  const t = typeof nu === 'number' ? nu : new Date(nu).getTime();
  const id = Number.isInteger(Number(orderId)) && orderId !== null ? Number(orderId) : null;
  let rijen;
  try {
    const waarden = [
      sqlStempel(t - FOTO_MIST_NA_DAGEN * 864e5),
      sqlStempel(t - REVIEW_VRAGEN_DAGEN * 864e5),
      REVIEW_GEVRAAGD,
      id,
    ];
    /* Eén verzoek via batch (D1); een nepdatabase zonder batch krijgt ze los.
       De abonnementen alleen voor het dashboard, niet bij één bestelling. */
    const stmts = NU_DOEN_SQL_DELEN.map((sql) => db.prepare(sql).bind(...waarden));
    if (id === null) stmts.push(db.prepare(ABO_SQL).bind(sqlStempel(t - ZONDER_INCASSO_NA_DAGEN * 864e5)));
    const delen = typeof db.batch === 'function' ? await db.batch(stmts) : await Promise.all(stmts.map((s) => s.all()));
    const results = delen.flatMap((d) => d?.results || []).slice(0, 400);
    /* Alleen rijen die deze query zelf maakt: een nepdatabase in een test (of
       een kapotte rij) mag de bestelpagina niet laten omvallen. */
    rijen = (results || []).filter((r) => r && NU_DOEN_SOORTEN.includes(r.soort) && r.id != null);
  } catch (err) {
    return { regels: [], fout: String(err?.message || err) };
  }

  /* Foto's ontbreken: de uploads van de kandidaten, en ontbreekt.js beslist.
     Onbekend (null) of compleet ([]) is geen regel. */
  const kandidaten = rijen.filter((r) => r.soort === 'fotos');
  if (kandidaten.length) {
    let perOrder = new Map();
    try {
      const { results } = await db.prepare(
        `SELECT f.order_id AS order_id, f.kind AS kind, f.product_key AS product_key, f.shot AS shot
           FROM files f JOIN orders o ON o.id = f.order_id
          WHERE f.kind = 'upload' AND o.status = 'received' AND (?1 IS NULL OR o.id = ?1)`
      ).bind(id).all();
      for (const f of results || []) {
        if (!perOrder.has(f.order_id)) perOrder.set(f.order_id, []);
        perOrder.get(f.order_id).push(f);
      }
    } catch {
      perOrder = null;
    }
    for (const r of kandidaten) {
      let details = {};
      try { details = JSON.parse(r.details_json || '{}') || {}; } catch { details = {}; }
      const lijst = perOrder ? ontbrekendeFotos({ productCount: r.product_count, details, files: perOrder.get(r.id) || [] }) : null;
      r.ontbreekt = lijst && lijst.length ? lijst : null;
      r.n = aantalOntbrekend(r.ontbreekt);
    }
  }

  const gezien = new Set();
  const regels = rijen
    .filter((r) => r.soort !== 'fotos' || r.ontbreekt)
    .map((r) => ({ ...r, details_json: undefined, n: Number(r.n) || 0, n2: Number(r.n2) || 0, extra: r.extra == null ? null : String(r.extra) }))
    .sort((a, b) => {
      const s = NU_DOEN_SOORTEN.indexOf(a.soort) - NU_DOEN_SOORTEN.indexOf(b.soort);
      if (s) return s;
      const ka = String(a.sleutel || ''), kb = String(b.sleutel || '');
      if (ka !== kb) return ka < kb ? -1 : 1;
      return a.id - b.id;
    })
    .filter((r) => {
      const k = `${r.soort}|${r.id}`;
      if (gezien.has(k)) return false;
      gezien.add(k);
      return true;
    });
  return { regels, fout: null };
}

/* ── WOORDEN ──────────────────────────────────────────────────────────────── */

function stempelMs(stamp) {
  const s = String(stamp || '').trim();
  if (!s) return NaN;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? `${s.replace(' ', 'T')}${/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? '' : 'Z'}` : s;
  return Date.parse(iso);
}

/** "zojuist", "5 uur geleden", "gisteren", "3 dagen geleden". */
export function geleden(stamp, nu = Date.now()) {
  const t = stempelMs(stamp);
  if (!Number.isFinite(t)) return '';
  const uren = Math.max(0, Math.floor((nu - t) / 36e5));
  if (uren < 1) return 'zojuist';
  if (uren < 24) return `${uren} uur geleden`;
  const dagen = Math.floor(uren / 24);
  return dagen === 1 ? 'gisteren' : `${dagen} dagen geleden`;
}

const beelden = (n) => `${n} nieuw${n === 1 ? ' beeld' : 'e beelden'}`;

/** Het etiket links in de regel. */
export function soortLabel(r) {
  switch (r.soort) {
    case 'btw': return 'Btw-controle';
    case 'leveren': return r.extra === 'nieuw' ? (r.n2 > 0 ? 'Revisie afgehandeld' : 'Nieuwe beelden') : 'Klaar om te leveren';
    case 'revisie': return 'Revisie';
    case 'oppakken': return 'Betaald, niet opgepakt';
    case 'fotos': return 'Foto’s ontbreken';
    case 'offerte': return 'Aanvraag zonder offerte';
    case 'review': return 'Afgerond';
    case 'abonnement': return ({ terugboeking: 'Terugboeking', mislukt: 'Incasso mislukt' })[r.extra] || 'Geen incasso';
    default: return String(r.soort || 'Bestelling');
  }
}

/** Wat er bij de referentie staat. */
export function watTekst(r, nu = Date.now()) {
  const g = geleden(r.datum, nu);
  switch (r.soort) {
    case 'btw': return g ? `aangevraagd ${g}` : 'wacht op je oordeel';
    case 'leveren': return r.extra === 'nieuw'
      ? `${beelden(r.n)}, nog niet gemeld`
      : 'staat op In controle';
    case 'revisie': return `${r.n} beeld${r.n === 1 ? '' : 'en'}${g ? `, gevraagd ${g}` : ''}`;
    case 'oppakken': {
      const hoe = ['plan', 'credits'].includes(r.betaling) ? 'met credits' : 'betaald';
      if (r.extra) return `vaste dag ${korteDatum(r.extra, 'nl')}, ${hoe}`;
      return g ? `${hoe} ${g}` : hoe;
    }
    case 'fotos': {
      const eerste = ontbrekendRegels(r.ontbreekt, 'nl')[0] || '';
      const n = r.n;
      return `${n === 1 ? '1 foto ontbreekt' : `${n} foto’s ontbreken`}${eerste ? ` (${eerste}${(r.ontbreekt || []).length > 1 ? ', …' : ''})` : ''}`;
    }
    case 'offerte': return `${serviceLabel(r.service, 'nl') || r.service}${g ? `, aangevraagd ${g}` : ''}`;
    case 'review': return g ? `afgerond ${g}` : 'afgerond';
    case 'abonnement':
      if (r.extra === 'terugboeking') return `abonnement stilgezet${g ? ` ${g}` : ''}, de incasso is gestopt`;
      if (r.extra === 'mislukt') return `abonnement stilgezet${g ? ` ${g}` : ''}: Mollie kreeg de incasso niet rond`;
      return 'loopt, maar Mollie schrijft niet af';
    default: return '';
  }
}

const wieVan = (r) => r.brand || r.name || r.email || '';

/**
 * De knop van een regel, per plek:
 *   'dashboard'  bovenaan /admin (melden en review vragen zijn hier echte knoppen)
 *   'bestelling' de regel "Volgende stap" op de bestelpagina (springt naar het blok)
 *   'rapport'    het nachtrapport (een link; een mail kan niets posten)
 * @returns {{ label: string, href: string, post?: boolean, velden?: object, nieuwTab?: boolean }}
 */
export function knopVoor(r, plek = 'dashboard', origin = '') {
  const best = `${origin}/admin/orders/${r.id}/files`;
  const hier = plek === 'bestelling';
  const pad = (anker) => (hier ? `#${anker}` : `${best}#${anker}`);
  switch (r.soort) {
    case 'btw': return { label: 'Beoordelen', href: `${origin}/admin/vat` };
    case 'leveren':
      if (r.extra === 'nieuw') {
        const label = `${beelden(r.n)} melden`;
        if (plek === 'dashboard') return { label, href: `/admin/orders/${r.id}/announce`, post: true, velden: { terug: 'dashboard' } };
        return { label, href: pad('melden') };
      }
      return { label: 'Leverkeuring', href: pad('melden') };
    case 'revisie': {
      /* Op de bestelpagina naar het vakje zelf (B10, doorloop 27): daar vervang
         je het beeld. Tot 14 oktober 2026 ging de knop terug naar het dashboard,
         weg van het werkbord waar je al stond. Het vakje draagt dezelfde id als
         de kaart op het dashboard (rev-<file_id>, zie slotHtml in admin.js). */
      const anker = `rev-${r.extra}`;
      return { label: 'Revisie openen', href: plek === 'rapport' ? `${origin}/admin#${anker}` : `#${anker}` };
    }
    case 'oppakken':
      /* ── OPPAKKEN IS ÉÉN KLIK — 14 oktober 2026 (doorloop 27, B03) ─────────
         De knop opende de bestelling bij het statuslijstje, en daar moest Lucas
         nog "In productie" kiezen en op Status bijwerken drukken. Nu zet hij de
         status zelf en landt op de bestelpagina (back=files). Een statuswissel
         naar In productie stuurt de klant geen mail; hij ziet het op zijn
         tijdlijn. Het nachtrapport is een mail en kan niet posten: daar blijft
         het een link naar het lijstje. */
      if (plek === 'rapport') return { label: 'Oppakken', href: pad('status') };
      return { label: 'Oppakken', href: `/admin/orders/${r.id}/status`, post: true, velden: { status: 'in_production', back: 'files' } };
    case 'fotos': return { label: 'Foto’s vragen', href: pad('ontbreekt') };
    case 'offerte': return { label: 'Offerte maken', href: pad('offerte') };
    case 'abonnement': return { label: 'Bekijken', href: `${origin}/admin/customers/${r.id}#abonnement` };
    case 'review': {
      if (plek === 'dashboard' && waLink('review', r).wa) {
        return { label: 'Review vragen', href: `/admin/orders/${r.id}/review-wa`, post: true, nieuwTab: true };
      }
      return { label: 'Review vragen', href: pad('review') };
    }
    default: return { label: 'Openen', href: best };
  }
}

/* ── HTML ─────────────────────────────────────────────────────────────────── */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const NIETS_WACHT = 'Niets wacht op jou.';
export const NIETS_WACHT_UITLEG = 'Nieuwe bestellingen komen hier vanzelf bij.';

function knopHtml(k, klasse = 'btn btn-primary btn-sm') {
  if (k.post) {
    const velden = Object.entries(k.velden || {}).map(([n, v]) => `<input type="hidden" name="${esc(n)}" value="${esc(v)}">`).join('');
    return `<form class="nd-knop" method="post" action="${esc(k.href)}"${k.nieuwTab ? ' target="_blank"' : ''}>${velden}<button class="${klasse}" type="submit">${esc(k.label)}</button></form>`;
  }
  return `<a class="${klasse} nd-knop" href="${esc(k.href)}">${esc(k.label)}</a>`;
}

/** Het blok bovenaan het dashboard. */
export function nuDoenHtml({ regels = [], fout = null } = {}, nu = Date.now()) {
  if (fout) {
    return `<section class="nu-doen" id="nu-doen" aria-labelledby="nu-doen-kop">
  <h2 id="nu-doen-kop">Nu doen</h2>
  <p class="warnline">De lijst kon niet gelezen worden (${esc(fout)}). Kijk zolang in de bestellingen hieronder.</p>
</section>`;
  }
  if (!regels.length) {
    return `<section class="nu-doen is-leeg" id="nu-doen" aria-labelledby="nu-doen-kop">
  <h2 id="nu-doen-kop">Nu doen</h2>
  <p class="nd-leeg"><strong>${NIETS_WACHT}</strong> ${NIETS_WACHT_UITLEG}</p>
</section>`;
  }
  return `<section class="nu-doen" id="nu-doen" aria-labelledby="nu-doen-kop">
  <h2 id="nu-doen-kop">Nu doen <span class="fl-n">${regels.length}</span></h2>
  <ol class="nd-lijst">${regels.map((r) => `
    <li class="nd-regel" data-soort="${esc(r.soort)}">
      <span class="nd-soort">${esc(soortLabel(r))}</span>
      <span class="nd-wat"><span class="ref">${esc(r.ref)}</span> <span class="nd-wie">${esc(wieVan(r))}</span> <span class="meta">${esc(watTekst(r, nu))}</span></span>
      ${knopHtml(knopVoor(r, 'dashboard'))}
    </li>`).join('')}
  </ol>
</section>`;
}

/* Waarom dit de volgende stap is, voor de bestelpagina: de wat-tekst, met de
   soort erbij waar die tekst hem zelf niet al zegt. */
function waaromTekst(r, nu) {
  if (r.soort === 'btw') return `btw-controle, ${watTekst(r, nu)}`;
  if (r.soort === 'leveren' && r.extra === 'nieuw') {
    return r.n2 > 0 ? 'de revisieronde is afgehandeld, de klant weet het nog niet' : 'de klant weet nog niet dat ze er staan';
  }
  return watTekst(r, nu);
}

/* Wat er op de bestelpagina staat als er voor deze bestelling niets in de
   lijst staat: waarom niet, in één zin. */
function rustTekst(o) {
  if (!o) return 'niets wacht op jou bij deze bestelling.';
  if (o.status === 'cancelled') return 'niets, de bestelling is geannuleerd.';
  if (o.status === 'delivered' && o.closed_at) return 'niets, de bestelling is afgerond.';
  if (o.status === 'delivered') return 'niets, de klant beoordeelt de beelden.';
  if (o.review_state === 'rejected') return 'niets, de btw-controle is afgewezen.';
  if (String(o.payment_status || 'unpaid') === 'unpaid' && (Number(o.total_cents) || 0) > 0) return 'niets, de bestelling wacht op betaling.';
  /* Doorloop 27 (B43): hier stond "daarna de status op In controle", maar de
     knop onderaan ("Op geleverd zetten en klant mailen") slaat die stand over.
     De zin zegt nu wat Lucas echt doet. */
  if (o.status === 'in_production') return 'de beelden maken en in het bord zetten; daarna "Op geleverd zetten en klant mailen" (dan gaat de levermail).';
  return 'niets wacht op jou bij deze bestelling.';
}

/** De regel bovenaan de bestelpagina: "Volgende stap: …". */
export function volgendeStapHtml(order, { regels = [], fout = null } = {}, nu = Date.now()) {
  if (fout) return `<p class="volgende-stap"><strong>Volgende stap:</strong> <span class="meta">onbekend, de lijst kon niet gelezen worden (${esc(fout)}).</span></p>`;
  const [eerste, ...rest] = regels;
  if (!eerste) return `<p class="volgende-stap is-rust"><strong>Volgende stap:</strong> ${esc(rustTekst(order))}</p>`;
  const k = knopVoor(eerste, 'bestelling');
  const daarna = rest.length ? ` <span class="meta">Daarna: ${rest.map((r) => esc(knopVoor(r, 'bestelling').label.toLowerCase())).join(', ')}.</span>` : '';
  /* Doorloop 27 (B09): de knop bij "Volgende stap" is de aanbevolen handeling en
     dus paars; de knoppen per product op het werkbord zijn stil (admin.js). */
  return `<div class="volgende-stap"><p><strong>Volgende stap:</strong> ${esc(k.label)} &mdash; ${esc(waaromTekst(eerste, nu))}.${daarna}</p>${knopHtml(k, 'btn btn-primary btn-sm')}</div>`;
}

/* ── HET NACHTRAPPORT (platte tekst) ─────────────────────────────────────── */

/** De eerste regels van het nachtrapport. */
export function nuDoenTekst({ regels = [], fout = null } = {}, { origin = 'https://visuails.com', nu = Date.now() } = {}) {
  if (fout) return [`NU DOEN — de lijst kon niet gelezen worden (${fout}). Kijk op ${origin}/admin.`];
  if (!regels.length) return [`NU DOEN — ${NIETS_WACHT} ${NIETS_WACHT_UITLEG}`];
  const uit = [`NU DOEN — ${regels.length} ${regels.length === 1 ? 'ding' : 'dingen'}, in deze volgorde (dezelfde lijst staat bovenaan ${origin}/admin):`];
  regels.forEach((r, i) => {
    const k = knopVoor(r, 'rapport', origin);
    const wie = wieVan(r);
    uit.push(`  ${i + 1}. ${soortLabel(r)} · ${r.ref}${wie ? ` (${wie})` : ''}, ${watTekst(r, nu)}`);
    uit.push(`     ${k.label}: ${k.href}`);
  });
  return uit;
}

/** "Vandaag · vr 9 okt — niets open" / "— 3 wachten op jou", met "er ging iets mis" ervoor.
 *  Kon de lijst niet gelezen worden (`fout`), dan nooit "niets open". */
export function rapportOnderwerp({ aantal = 0, problemen = 0, fout = false, nu = Date.now() } = {}) {
  const dag = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Amsterdam' }).format(new Date(nu));
  const stand = fout ? 'lijst niet te lezen' : aantal ? `${aantal} ${aantal === 1 ? 'wacht' : 'wachten'} op jou` : 'niets open';
  return `Vandaag · ${dag} — ${problemen ? 'er ging iets mis · ' : ''}${stand}`;
}
