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
 *   2 leveren  nieuwe beelden / een afgehandelde revisie nog niet
 *              gestuurd                                        → N nieuwe beelden sturen
 *              (tot 9 november 2026 ook "klaar om te leveren" (In controle) → Leverkeuring; die stand is weg, w4)
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
 *
 * ── ÉÉN WERKLIJST — 9 november 2026 (ronde 91, lijst 85 w1 en w11 = goed) ──────────────────────────────────
 * Lucas koos "goed" bij A1: Nu doen wordt de enige "wat nu"-lijst. "Eerst af" in de zijkolom van het
 * dashboard en de lijst Aflopend op de planning zijn weg. Erbij:
 *   productie  opgepakt werk (In productie), met de dag waarop het af moet (agendaUiterlijk, src/lib/agenda.js);
 *              alleen vanaf "morgen af" of te laat, anders wordt de lijst een agenda. Op de bestelpagina altijd.
 *   formaten   open PNG/WebP-verzoeken van klanten (formaat_verzoeken)            → Formaten
 *   maandset   de set van deze maand nog niet gepubliceerd, of vanaf de 25e die van volgende maand (w11), zolang
 *              er lopende abonnementen zijn                                         → Maandset maken
 * Oppakken en In productie staan samen op de dag waarop het af moet, en VOORRANG staat bovenaan de hele lijst,
 * met de echte voorrangstijd (voorrangDeadline: betaaldatum, werkdagen, 17:00): dat is een betaalde belofte met
 * de toeslag terug als hij gemist wordt.
 * ÉÉN REGEL PER BESTELLING: staat een bestelling er om twee redenen in (oppakken én foto's ontbreken), dan is de
 * eerste de regel met de knop, en de rest staat erachter als "ook: …" (een link), in de mail ook.
 * Foto's ontbreken blijft staan tot er geleverd is, ook na Oppakken (w2): de klant kan tot Geleverd nasturen.
 */
import { ontbrekendeFotos, aantalOntbrekend, ontbrekendRegels } from './ontbreekt.js';
import { korteDatum, VRAAG_DAGEN } from './nuzin.js';
import { waLink, REVIEW_GEVRAAGD } from './waLink.js';
import { serviceLabel } from '../data/services.js';
import { knopInhoud } from '../data/iconen.js';
import { agendaUiterlijk } from './agenda.js';
import { heeftVoorrang, voorrangDeadline } from '../data/pricing.js';

/** De vaste volgorde. */
/* 'abonnement' (15 oktober 2026, v31-abonnees = a): een terugboeking, een mislukte
   incasso, of een abonnement dat loopt zonder incasso bij Mollie. Na de btw: het is
   geld dat niet binnenkomt. Zie AboSql hieronder; staat alleen op het dashboard en
   in het nachtrapport, niet bij een bestelling. */
/* 'toeslag' (9 november 2026, lijst 87, B16): voorrang betaald, maar later geleverd dan beloofd. De voorwaarden
   zeggen "dan betalen we de toeslag terug"; dat moet je niet hoeven onthouden. Geld, dus vooraan. De regel gaat weg
   zodra er op de bestelling iets is terugbetaald (refunded_cents, gemeld door Mollie). Het terugbetalen zelf blijft
   jouw klik. */
export const NU_DOEN_SOORTEN = Object.freeze(['btw', 'abonnement', 'toeslag', 'leveren', 'revisie', 'oppakken', 'productie', 'fotos', 'formaten', 'offerte', 'maandset', 'review']);

/* De soorten die bij één bestelling horen (één regel per bestelling); 'abonnement' en 'maandset' niet. */
const PER_BESTELLING = new Set(['btw', 'toeslag', 'leveren', 'revisie', 'oppakken', 'productie', 'fotos', 'formaten', 'offerte', 'review']);
/* Oppakken en In productie zijn hetzelfde werk in twee standen: één plek in de volgorde, op de dag waarop het af
   moet. */
const WERK = new Set(['oppakken', 'productie']);
/* Vanaf welke dag van de maand de set van volgende maand in de lijst komt (w11). */
export const MAANDSET_VANAF_DAG = 25;

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

/* Welke standen "opgepakt" zijn, en tot wanneer een ontbrekende foto werk is: tot Geleverd, ook na Oppakken
   (9 november 2026, ronde 91, w2-deel van Lucas' keuze; de klant kan tot Geleverd nasturen). */
/* human_check sinds w4 (9 november 2026) erbij: "In controle" is geen stand meer, een oude rij is In productie. */
export const PRODUCTIE_STANDEN = Object.freeze(['in_production', 'human_check']);
export const FOTO_STANDEN = Object.freeze(['received', 'in_production', 'human_check']);

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
/* Sinds w1 (9 november 2026) met de velden die agendaUiterlijk() nodig heeft (tier, venster, binnen, betaald,
   details voor de voorrangsvlag); details_json staat daardoor bij elke soort. */
function kol(soort, { sleutel, datum = sleutel, n = '0', n2 = '0', extra = 'NULL', details = 'o.details_json' }) {
  return `'${soort}' AS soort, o.id AS id, o.ref AS ref, o.brand AS brand, o.name AS name, o.email AS email,
          o.lang AS lang, o.status AS status, o.service AS service, o.product_count AS product_count,
          o.payment_status AS betaling, o.closed_at AS closed_at,
          ${sleutel} AS sleutel, ${datum} AS datum, ${n} AS n, ${n2} AS n2, ${extra} AS extra,
          ${details} AS details_json,
          o.phone AS phone, c.phone AS c_phone, COALESCE(o.country, c.country) AS land,
          o.tier AS tier, o.window_start AS window_start, o.window_end AS window_end,
          o.created_at AS created_at, o.paid_at AS paid_at`;
}
const VAN = 'FROM orders o LEFT JOIN customers c ON c.id = o.customer_id';
const EEN = '(?4 IS NULL OR o.id = ?4)';

const NIEUW_BEELD = `f.order_id = o.id AND f.kind = 'delivery' AND f.announced_at IS NULL AND f.superseded_at IS NULL`;
const OPEN_REVISIE = `f.order_id = o.id AND f.review_state = 'revision_requested' AND f.superseded_at IS NULL`;
/* "Geen nieuw beeld nodig" met een reden, na de laatste mail: sinds w5 (9 november 2026) gaat die reden pas mee als
   Lucas de ronde verstuurt. Zolang dat niet gebeurde, staat de bestelling hier, ook zonder nieuw beeld. */
const ANTWOORD_ONVERSTUURD = `r.order_id = o.id AND r.resolved_at IS NOT NULL AND COALESCE(r.resolution_note, '') <> ''
            AND r.resolved_at > COALESCE(o.redelivery_mailed_at, o.delivery_mailed_at, '0000')`;

/* ?1 = foto's ontbreken vóór dit moment, ?2 = afgerond na dit moment,
   ?3 = REVIEW_GEVRAAGD, ?4 = één bestelling (of NULL voor alles). */
/* D1 STAAT HOOGSTENS VIJF DELEN IN ÉÉN UNION TOE ("too many terms in compound
   SELECT" vanaf zes; gemeten op 8 okt met de lokale D1 van wrangler). De acht
   soorten gaan daarom in twee query's van vier, die tegelijk lopen. De tests
   met node:sqlite zagen dit niet: die staat er vijfhonderd toe. */
export const NU_DOEN_SQL_DELEN = Object.freeze([`SELECT * FROM (
  SELECT ${kol('btw', { sleutel: 'COALESCE(o.review_requested_at, o.created_at)' })}
    ${VAN}
   WHERE o.review_state = 'pending' AND COALESCE(o.status, '') <> 'cancelled' AND o.hidden_at IS NULL AND ${EEN}
  UNION ALL
  SELECT ${kol('leveren', {
    sleutel: `COALESCE((SELECT MIN(f.created_at) FROM files f WHERE ${NIEUW_BEELD}), (SELECT MIN(r.resolved_at) FROM revision_requests r WHERE ${ANTWOORD_ONVERSTUURD}))`,
    n: `(SELECT COUNT(*) FROM files f WHERE ${NIEUW_BEELD})`,
    n2: `(SELECT COUNT(*) FROM revision_requests r WHERE r.order_id = o.id
            AND (r.resolved_at IS NULL OR r.resolved_at > COALESCE(o.redelivery_mailed_at, o.delivery_mailed_at, '0000')))`,
    extra: "'nieuw'",
  })}
    ${VAN}
   WHERE o.delivery_mailed_at IS NOT NULL AND o.hidden_at IS NULL AND COALESCE(o.status, '') <> 'cancelled'
     AND (EXISTS (SELECT 1 FROM files f WHERE ${NIEUW_BEELD})
          OR EXISTS (SELECT 1 FROM revision_requests r WHERE ${ANTWOORD_ONVERSTUURD}))
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
  SELECT ${kol('fotos', { sleutel: 'COALESCE(o.paid_at, o.created_at)' })}
    ${VAN}
   WHERE o.status IN (${lijstSql(FOTO_STANDEN)}) AND o.payment_status IN ('paid', 'plan', 'credits') AND o.hidden_at IS NULL
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
) LIMIT 400`, `SELECT * FROM (
  SELECT ${kol('productie', {
    sleutel: 'COALESCE(o.paid_at, o.created_at)',
    n: `(SELECT COUNT(*) FROM files f WHERE f.order_id = o.id AND f.kind = 'delivery' AND f.superseded_at IS NULL)`,
  })}
    ${VAN}
   WHERE o.status IN (${lijstSql(PRODUCTIE_STANDEN)}) AND o.hidden_at IS NULL AND ${EEN}
  UNION ALL
  SELECT ${kol('formaten', { sleutel: 'MIN(v.aangevraagd_at)', n: 'COUNT(*)', extra: 'GROUP_CONCAT(v.formaat)' })}
    FROM formaat_verzoeken v JOIN orders o ON o.id = v.order_id LEFT JOIN customers c ON c.id = o.customer_id
   WHERE v.klaar_at IS NULL AND o.hidden_at IS NULL AND COALESCE(o.status, '') <> 'cancelled' AND ${EEN}
   GROUP BY o.id
  UNION ALL
  SELECT ${kol('toeslag', { sleutel: 'o.delivered_at', extra: 'o.delivered_at' })}
    ${VAN}
   WHERE o.delivered_at IS NOT NULL AND o.paid_at IS NOT NULL AND o.payment_status = 'paid'
     AND COALESCE(o.refunded_cents, 0) = 0 AND COALESCE(o.status, '') <> 'cancelled' AND o.hidden_at IS NULL
     AND json_extract(o.details_json, '$.voorrang') IN ('1', 1, 'on', 'true') AND ${EEN}
) LIMIT 400`]);


/* De maandset (w11): het aantal lopende abonnementen en of de set van deze en van volgende maand live staat.
   ?1 = deze maand, ?2 = volgende maand ('YYYY-MM', Nederlandse tijd). Ook een testabonnement telt: dan zie je de
   herinnering tijdens het testen, en vóór live zet Diagnose ze stop. */
export const MAANDSET_SQL = `SELECT (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') AS abonnees,
          (SELECT COUNT(*) FROM shared_sets WHERE month = ?1 AND published_at IS NOT NULL) AS deze,
          (SELECT COUNT(*) FROM shared_sets WHERE month = ?2 AND published_at IS NOT NULL) AS volgende`;
/* De dichtgezette dagen, voor de streefdag van "zo snel mogelijk" (agendaUiterlijk). ?1 = vanaf. */
const DICHT_SQL = 'SELECT day FROM blackout_days WHERE day >= ?1 LIMIT 500';
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
  const vandaag = amsterdamDag(t);
  const morgen = plusDagen(vandaag, 1);
  let rijen;
  let blackouts = new Set();
  let maandset = null;
  try {
    const waarden = [
      sqlStempel(t - FOTO_MIST_NA_DAGEN * 864e5),
      sqlStempel(t - REVIEW_VRAGEN_DAGEN * 864e5),
      REVIEW_GEVRAAGD,
      id,
    ];
    /* Eén verzoek via batch (D1); een nepdatabase zonder batch krijgt ze los.
       De abonnementen en de maandset alleen voor het dashboard, niet bij één bestelling. */
    const stmts = NU_DOEN_SQL_DELEN.map((sql) => db.prepare(sql).bind(...waarden));
    stmts.push(db.prepare(DICHT_SQL).bind(plusDagen(vandaag, -90)));
    if (id === null) {
      stmts.push(db.prepare(ABO_SQL).bind(sqlStempel(t - ZONDER_INCASSO_NA_DAGEN * 864e5)));
      stmts.push(db.prepare(MAANDSET_SQL).bind(vandaag.slice(0, 7), plusMaand(vandaag.slice(0, 7))));
    }
    const delen = typeof db.batch === 'function' ? await db.batch(stmts) : await Promise.all(stmts.map((s) => s.all()));
    const n = NU_DOEN_SQL_DELEN.length;
    blackouts = new Set((delen[n]?.results || []).map((r) => r && r.day).filter(Boolean));
    if (id === null) maandset = (delen[n + 2]?.results || [])[0] || null;
    const results = [...delen.slice(0, n), ...(id === null ? [delen[n + 1]] : [])]
      .flatMap((d) => d?.results || []).slice(0, 400);
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
          WHERE f.kind = 'upload' AND o.status IN (${lijstSql(FOTO_STANDEN)}) AND (?1 IS NULL OR o.id = ?1)`
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

  /* Voorrang gemist (B16): alleen als de levering echt na de beloofde tijd lag. De termijn uit dezelfde som als
     overal (voorrangDeadline(): betaaldatum, werkdagen, 17:00 Nederlandse tijd). De toeslag uit de opbouw (B07),
     als die er is. */
  rijen = rijen.filter((r) => {
    if (r.soort !== 'toeslag') return true;
    if (!heeftVoorrang(r)) return false;
    const d = voorrangDeadline(r.paid_at);
    const grens = d ? amsterdamMs(d.datum, d.uur) : NaN;
    const geleverd = stempelMs(r.extra);
    if (!Number.isFinite(grens) || !Number.isFinite(geleverd) || geleverd <= grens) return false;
    r.uiterlijk = d.datum;
    r.uur = d.uur;
    r.n = toeslagCents(r.details_json);
    return true;
  });

  /* Het werk (oppakken, In productie): de dag waarop het af moet, uit dezelfde regel als de planning. */
  for (const r of rijen) {
    if (!WERK.has(r.soort)) continue;
    let u = null;
    try { u = agendaUiterlijk(r, blackouts, vandaag); } catch { u = null; }
    r.uiterlijk = u?.dag || null;
    r.uur = u?.uur || null;
    r.manier = u?.manier || null;
    r.voorrang = u?.manier === 'voorrang';
  }

  /* De maandset (w11): deze maand niet live, of vanaf de 25e volgende maand niet live, met lopende abonnementen. */
  if (maandset && Number(maandset.abonnees) > 0) {
    const n = Number(maandset.abonnees);
    const deze = vandaag.slice(0, 7);
    const maandRij = (maand) => ({
      soort: 'maandset', id: Number(maand.replace('-', '')), ref: maandNaam(maand), brand: null, name: null, email: null,
      sleutel: maand, datum: null, n, n2: 0, extra: maand,
    });
    if (!Number(maandset.deze)) rijen.push(maandRij(deze));
    if (Number(vandaag.slice(8, 10)) >= MAANDSET_VANAF_DAG && !Number(maandset.volgende)) rijen.push(maandRij(plusMaand(deze)));
  }

  /* De volgorde: voorrang bovenaan de hele lijst, dan de vaste soortvolgorde; oppakken en In productie op één
     plek, op de dag waarop het af moet (en het uur, bij voorrang); verder de oudste eerst. */
  const rang = (r) => (WERK.has(r.soort) && r.voorrang ? -1 : WERK.has(r.soort) ? NU_DOEN_SOORTEN.indexOf('oppakken') : NU_DOEN_SOORTEN.indexOf(r.soort));
  const sorteer = (r) => (WERK.has(r.soort) ? `${r.uiterlijk || '9999'} ${String(r.uur || 24).padStart(2, '0')} ${String(r.sleutel || '')}` : String(r.sleutel || ''));
  const gezien = new Set();
  const alle = rijen
    .filter((r) => r.soort !== 'fotos' || r.ontbreekt)
    /* In productie alleen vanaf "morgen af" of te laat (Lucas' keuze bij w1); op de bestelpagina altijd. */
    .filter((r) => r.soort !== 'productie' || id !== null || (r.uiterlijk && r.uiterlijk <= morgen))
    .map((r) => ({ ...r, details_json: undefined, n: Number(r.n) || 0, n2: Number(r.n2) || 0, extra: r.extra == null ? null : String(r.extra) }))
    .sort((a, b) => {
      const s = rang(a) - rang(b);
      if (s) return s;
      const ka = sorteer(a), kb = sorteer(b);
      if (ka !== kb) return ka < kb ? -1 : 1;
      return a.id - b.id;
    })
    .filter((r) => {
      const k = `${r.soort}|${r.id}`;
      if (gezien.has(k)) return false;
      gezien.add(k);
      return true;
    });
  /* Eén regel per bestelling: de eerste (hoogste) is de regel, de rest gaat er als "ook" achter. */
  const perBestelling = new Map();
  const regels = [];
  for (const r of alle) {
    if (!PER_BESTELLING.has(r.soort)) { regels.push(r); continue; }
    const eerste = perBestelling.get(r.id);
    if (eerste) { eerste.daarna.push(r); continue; }
    const regel = { ...r, daarna: [] };
    perBestelling.set(r.id, regel);
    regels.push(regel);
  }
  return { regels, fout: null };
}

/* ── DATUMS IN NEDERLANDSE TIJD ───────────────────────────────────────────── */

/** 'YYYY-MM-DD' en een uur in Nederlandse tijd → ms (UTC). Voor de voorrangsgrens (B16). */
export function amsterdamMs(dag, uur) {
  const gok = Date.parse(`${dag}T${String(uur).padStart(2, '0')}:00:00Z`);
  if (!Number.isFinite(gok)) return NaN;
  const d = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(gok)).map((x) => [x.type, x.value]));
  const alsUtc = Date.parse(`${d.year}-${d.month}-${d.day}T${d.hour}:${d.minute}:00Z`);
  return gok - (alsUtc - gok);
}

/** De voorrangstoeslag in centen (excl. btw) uit de opbouw van de bestelling, of 0 als die er niet is. */
function toeslagCents(detailsJson) {
  try {
    const d = typeof detailsJson === 'string' ? JSON.parse(detailsJson || '{}') : (detailsJson || {});
    const regel = Array.isArray(d?.opbouw) ? d.opbouw.find((x) => x && x.soort === 'voorrang') : null;
    return Number(regel?.totalCents) || 0;
  } catch { return 0; }
}
const euroNl = (c) => `€ ${(c / 100).toFixed(2).replace('.', ',')}`;

/** 'YYYY-MM-DD' in Amsterdam, voor "vandaag", "morgen" en de maand van de maandset. */
export function amsterdamDag(ms = Date.now()) {
  const d = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${d.year}-${d.month}-${d.day}`;
}
function plusDagen(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function plusMaand(maand) {
  const [y, m] = maand.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
function maandNaam(maand) {
  const [y, m] = String(maand || '').split('-').map(Number);
  return y && m ? `${MAANDEN[m - 1]} ${y}` : String(maand || '');
}
const WEEKDAG = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
/** "vandaag", "morgen", "gisteren, te laat", "3 dagen te laat", of "do 12 nov". */
export function afDag(dag, nu = Date.now()) {
  if (!dag) return '';
  const vandaag = amsterdamDag(nu);
  const n = Math.round((Date.parse(`${dag}T12:00:00Z`) - Date.parse(`${vandaag}T12:00:00Z`)) / 864e5);
  if (n < -1) return `${-n} dagen te laat`;
  if (n === -1) return 'gisteren, te laat';
  if (n === 0) return 'vandaag';
  if (n === 1) return 'morgen';
  return `${WEEKDAG[new Date(`${dag}T12:00:00Z`).getUTCDay()]} ${korteDatum(dag, 'nl')}`;
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
    case 'toeslag': return 'Voorrang gemist';
    case 'leveren': return r.n2 > 0 ? 'Revisie afgehandeld' : 'Nieuwe beelden';
    case 'revisie': return 'Revisie';
    case 'oppakken': return r.voorrang ? 'Voorrang, niet opgepakt' : 'Betaald, niet opgepakt';
    case 'productie': return r.voorrang ? 'Voorrang, in productie' : 'In productie';
    case 'fotos': return 'Foto’s ontbreken';
    case 'formaten': return 'PNG/WebP gevraagd';
    case 'offerte': return 'Aanvraag zonder offerte';
    case 'maandset': return 'Maandset';
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
    case 'toeslag': return `beloofd ${r.uiterlijk ? `${WEEKDAG[new Date(`${r.uiterlijk}T12:00:00Z`).getUTCDay()]} ${korteDatum(r.uiterlijk, 'nl')} om ${r.uur}:00` : 'eerder'}, geleverd ${geleden(r.extra, nu) || 'later'}; toeslag ${r.n > 0 ? `${euroNl(r.n)} excl. btw ` : ''}terugbetalen`;
    case 'leveren': return r.n > 0 ? `${beelden(r.n)}, nog niet gestuurd` : 'geen nieuw beeld nodig, het antwoord is nog niet gestuurd';
    case 'revisie': return `${r.n} beeld${r.n === 1 ? '' : 'en'}${g ? `, gevraagd ${g}` : ''}`;
    case 'oppakken': {
      const hoe = ['plan', 'credits'].includes(r.betaling) ? 'met credits' : 'betaald';
      const af = afTekst(r, nu);
      if (r.extra && r.manier === 'datum') return `vaste dag ${korteDatum(r.extra, 'nl')}, ${hoe}${af ? `; ${af}` : ''}`;
      return `${g ? `${hoe} ${g}` : hoe}${af ? `; ${af}` : ''}`;
    }
    case 'productie': return afTekst(r, nu) || 'opgepakt';
    case 'formaten': {
      const welke = String(r.extra || '').split(',').filter(Boolean).sort().map((f) => (f === 'png' ? 'PNG' : f === 'webp' ? 'WebP' : f));
      return `${welke.join(' en ') || 'een ander formaat'}${g ? `, gevraagd ${g}` : ''}`;
    }
    case 'maandset': return `ontbreekt nog (${r.n} ${r.n === 1 ? 'abonnee' : 'abonnees'})`;
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

/* Tot wanneer het werk af moet: "af morgen", "uiterlijk di 10 nov om 17:00" (voorrang), "2 dagen te laat". */
function afTekst(r, nu) {
  if (!r.uiterlijk) return '';
  const dag = afDag(r.uiterlijk, nu);
  if (r.voorrang && r.uur) return /te laat/.test(dag) ? `voorrang, ${dag} (${r.uur}:00)` : `voorrang: uiterlijk ${dag} om ${r.uur}:00`;
  return /te laat/.test(dag) ? dag : `af ${dag}`;
}

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
    /* De terugbetaling zelf doe je in Mollie (of bij de bestelling); de regel verdwijnt als Mollie hem meldt. */
    case 'toeslag': return { label: 'Toeslag terugbetalen', href: best };
    case 'leveren': {
      /* "sturen" en niet "melden" (9 november 2026, ronde 91, w7): één woord per ding. Leveren heet de
         eerste keer "Leveren en klant mailen", daarna "Nieuwe beelden sturen". "Leverkeuring" (In controle)
         bestaat niet meer (w4). */
      /* Niets vervangen, alleen redenen (w5): de ene mail "Antwoord op je revisieronde". */
      const label = r.n > 0 ? `${beelden(r.n)} sturen` : 'Antwoord sturen';
      if (plek === 'dashboard') return { label, href: `/admin/orders/${r.id}/announce`, post: true, velden: { terug: 'dashboard' } };
      return { label, href: pad('melden') };
    }
    case 'revisie': {
      /* Op de bestelpagina naar het vakje zelf (B10, doorloop 27): daar vervang
         je het beeld. Tot 14 oktober 2026 ging de knop terug naar het dashboard,
         weg van het werkbord waar je al stond. Het vakje draagt dezelfde id als
         de kaart op het dashboard (rev-<file_id>, zie slotHtml in admin.js). */
      /* Sinds w5 (9 november 2026) staat de revisie alleen nog in het vakje op de bestelpagina, niet op het dashboard. */
      const anker = `rev-${r.extra}`;
      return { label: 'Revisie openen', href: hier ? `#${anker}` : `${best}#${anker}` };
    }
    case 'oppakken':
      /* ── OPPAKKEN IS ÉÉN KLIK — 14 oktober 2026 (doorloop 27, B03) ─────────
         De knop opende de bestelling bij het statuslijstje, en daar moest Lucas
         nog "In productie" kiezen en op Status bijwerken drukken. Nu zet hij de
         status zelf en landt op de bestelpagina (back=files). Een statuswissel
         naar In productie stuurt de klant geen mail; hij ziet het op zijn
         tijdlijn. Het nachtrapport is een mail en kan niet posten: daar blijft
         het een link naar het lijstje. */
      /* Het statuslijstje (#status) is weg (w4): de link opent de bestelpagina, waar Oppakken bovenaan staat. */
      if (plek === 'rapport') return { label: 'Oppakken', href: best };
      return { label: 'Oppakken', href: `/admin/orders/${r.id}/status`, post: true, velden: { status: 'in_production', back: 'files' } };
    /* In productie (w1): staan er al beelden in het bord, dan is de volgende stap leveren; anders het bord. */
    case 'productie': return r.n > 0 ? { label: 'Leveren', href: pad('melden') } : { label: 'Naar het bord', href: pad('bord') };
    case 'fotos': return { label: 'Foto’s vragen', href: pad('ontbreekt') };
    case 'formaten': return { label: 'Formaten', href: `${origin}/admin/formaten` };
    case 'maandset': return { label: 'Maandset maken', href: `${origin}/admin/maandset` };
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

/* Knoppensysteem (lijst 88): ergens heen gaan is Navigeren (een lijn met de schuine pijl, nooit inkt); de rest is
   de stap zelf (Doorgaan, vol, de pijl erachter). */
const NAAR_ELDERS = new Set(['Naar het bord', 'Revisie openen', 'Formaten', 'Bekijken', 'Openen']);
function knopHtml(k, klasse = 'btn btn-primary btn-sm') {
  const rol = NAAR_ELDERS.has(k.label) ? 'navigeren' : 'doorgaan';
  const kl = rol === 'navigeren' ? klasse.replace('btn-primary', 'btn-ghost') : klasse;
  const binnen = knopInhoud(rol, k.label);
  if (k.post) {
    const velden = Object.entries(k.velden || {}).map(([n, v]) => `<input type="hidden" name="${esc(n)}" value="${esc(v)}">`).join('');
    return `<form class="nd-knop" method="post" action="${esc(k.href)}"${k.nieuwTab ? ' target="_blank"' : ''}>${velden}<button class="${kl}" data-rol="${rol}" type="submit">${binnen}</button></form>`;
  }
  return `<a class="${kl} nd-knop" data-rol="${rol}" href="${esc(k.href)}">${binnen}</a>`;
}

/* Eén regel per bestelling (w1): wat er bij dezelfde bestelling óók nog wacht, als stille link achter de regel.
   Een link en geen knop: de knop van de regel is de volgende stap; dit is wat daarna komt. */
function ookHtml(r, nu) {
  const ook = r.daarna || [];
  if (!ook.length) return '';
  return ` <span class="nd-ook">ook: ${ook.map((d) => `<a href="${esc(knopVoor(d, 'rapport').href)}">${esc(knopVoor(d, 'rapport').label.toLowerCase())}</a> <span class="meta">&middot; ${esc(watTekst(d, nu))}</span>`).join('; ')}</span>`;
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
      <span class="nd-wat"><span class="ref">${esc(r.ref)}</span> <span class="nd-wie">${esc(wieVan(r))}</span> <span class="meta">${esc(watTekst(r, nu))}</span>${ookHtml(r, nu)}</span>
      ${knopHtml(knopVoor(r, 'dashboard'))}
    </li>`).join('')}
  </ol>
</section>`;
}

/* Waarom dit de volgende stap is, voor de bestelpagina: de wat-tekst, met de
   soort erbij waar die tekst hem zelf niet al zegt. */
function waaromTekst(r, nu) {
  if (r.soort === 'btw') return `btw-controle, ${watTekst(r, nu)}`;
  if (r.soort === 'leveren') {
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
  if (o.status === 'in_production') return 'de beelden maken en in het bord zetten; daarna "Leveren en klant mailen" (dan gaat de levermail).';
  return 'niets wacht op jou bij deze bestelling.';
}

/** De regel bovenaan de bestelpagina: "Volgende stap: …". */
export function volgendeStapHtml(order, { regels = [], fout = null } = {}, nu = Date.now()) {
  if (fout) return `<p class="volgende-stap"><strong>Volgende stap:</strong> <span class="meta">onbekend, de lijst kon niet gelezen worden (${esc(fout)}).</span></p>`;
  const [eerste, ...anderen] = regels;
  /* Sinds w1 staat wat er bij deze bestelling nog meer wacht in eerste.daarna (één regel per bestelling). */
  const rest = [...(eerste?.daarna || []), ...anderen];
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
    for (const d of r.daarna || []) {
      const kd = knopVoor(d, 'rapport', origin);
      uit.push(`     ook ${kd.label.toLowerCase()} · ${watTekst(d, nu)}: ${kd.href}`);
    }
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
