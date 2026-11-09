/* ── DE TWEE DATUMS NA EEN LEVERING — 8 oktober 2026 (punt 2.03) ─────────────
 *
 * Na de levering tellen voor de klant twee datums: tot wanneer hij zijn ene
 * revisieronde kan aanvragen, en tot wanneer zijn beelden in Studio staan. Ze
 * stonden nergens als datum; de klant moest "binnen 7 dagen" en "90 dagen"
 * zelf uitrekenen. Sinds 7.07 noemt de levermail ze (deliveryEmail() in
 * admin.js), en nu de bestelkaart in Studio ook.
 *
 * DEZELFDE SOM ALS DE LEVERMAIL. De mail rekent vanaf het moment dat hij
 * verstuurd wordt: `nu + REVISIE_DAGEN dagen` en `nu + DELIVERY_DAYS dagen`
 * (sinds 9 november 2026 als Nederlandse dag; zie leverDatums()). Studio rekent met precies die
 * regel vanaf hetzelfde moment, `orders.delivery_mailed_at` (en zonder die
 * kolom `delivered_at`, dat in dezelfde klik wordt gezet). Zo kan Studio nooit
 * een andere dag noemen dan de mail die de klant in zijn inbox heeft.
 * tests/bestelkaart-studio.test.mjs legt dat vast door beide naast elkaar te
 * rekenen. Sinds de naloop van A2 (8 oktober 2026) rekent deliveryEmail() niet
 * meer zelf: hij haalt beide datums hier op, dus de som staat op één plek.
 *
 * Geen DOM, geen database: de Worker, een Astro-pagina en een test laden dit.
 */
import { REVISIE_DAGEN } from '../data/pricing.js';
import { DELIVERY_DAYS } from './retention.js';
import { nlDag, plusDagen as dagPlus } from './nlDag.js';

const DAG_MS = 86400000;

/**
 * Een moment uit de database ('2026-10-06 09:12:00', UTC zonder zone) of een
 * Date, als milliseconden. Onleesbaar → NaN.
 */
function moment(basis) {
  if (basis instanceof Date) return basis.getTime();
  const s = String(basis || '').trim();
  if (!s) return NaN;
  /* D1 schrijft datetime('now') als 'YYYY-MM-DD HH:MM:SS' zonder zone; dat is
     UTC. Een kale datum ('2026-08-22') ook. Een ISO-string met Z of offset
     blijft zoals hij is. */
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T00:00:00Z`);
  const iso = s.replace(' ', 'T');
  return Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
}

/**
 * @param {Date|string|null|undefined} basis  het moment van de levermail
 * @returns {null | { revisieTot: string, bewaarTot: string }}  ISO-datums (YYYY-MM-DD)
 */
/* ── DE NEDERLANDSE DAG, EN DE LAATSTE HELE DAG — 9 november 2026 (ronde 91, C02/C03) ──
   Hier stonden beide datums als UTC-datum van `moment + n dagen`. Twee fouten:
   · revisieTot: een levering tussen 00:00 en 01:00/02:00 Nederlandse tijd telde
     vanaf gisteren, dus "revisie tot en met" viel een dag te vroeg. Nu de
     Nederlandse dag van de levering plus REVISIE_DAGEN (het stille afronden in
     src/lib/close.js wacht tot die dag voorbij is).
   · bewaarTot: de beelden verdwijnen op het MOMENT moment + DELIVERY_DAYS
     (files.expires_at, stampDeliveryRetention in retention.js), en de zin zegt
     "tot en met <dag>". Die dag was de dag van dat moment zelf: geleverd om 15:00,
     dan waren ze op de laatste beloofde dag om 15:00 al weg. Nu de laatste HELE
     Nederlandse dag vóór dat moment. Aan het wissen verandert niets; alleen de zin
     wordt waar (Lucas, optie a). */
export function leverDatums(basis) {
  const ms = moment(basis);
  if (!Number.isFinite(ms)) return null;
  return {
    revisieTot: dagPlus(nlDag(ms), REVISIE_DAGEN),
    bewaarTot: dagPlus(nlDag(ms + DELIVERY_DAYS * DAG_MS), -1),
  };
}

/** Het moment waar de datums van een bestelling vanaf tellen: de levermail. */
export function leverMoment(order) {
  if (!order) return null;
  return order.delivery_mailed_at || order.delivered_at || null;
}

/* ── EN NA "WEER OPENEN" — 11 oktober 2026 (w2 = b) ──────────────────────────
 *
 * Opent Lucas een afgeronde bestelling in /admin weer (heropenBestelling() in
 * src/lib/close.js), dan heeft de klant vanaf dat moment weer REVISIE_DAGEN
 * dagen: orders.reopened_at (migratie 0066). Het stille afronden telt vanaf
 * hetzelfde moment, dus de revisiedatum is de láátste van de twee sommen.
 * De bewaardatum niet: de beelden verlopen op hun eigen datum, vanaf de levering.
 */

/**
 * De twee datums van één bestelling: leverDatums() vanaf de levermail, met de
 * revisiedatum vanaf het weer openen als dat later is.
 *
 * @param {object|null|undefined} order  met delivery_mailed_at / delivered_at en eventueel reopened_at
 * @returns {null | { revisieTot: string, bewaarTot: string }}
 */
export function leverDatumsVan(order) {
  const d = leverDatums(leverMoment(order));
  if (!d) return null;
  const weer = order?.reopened_at ? leverDatums(order.reopened_at) : null;
  if (weer && weer.revisieTot > d.revisieTot) return { ...d, revisieTot: weer.revisieTot };
  return d;
}
