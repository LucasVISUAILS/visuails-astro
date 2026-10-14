// VISUAILS — één lezing van de agenda, voor iedereen die hem nodig heeft.
//
// ── WAAROM DIT BESTAAND ER SINDS 31 AUGUSTUS 2026 IS ────────────────────────
//
// `readCalendar()` stond twee keer, woord voor woord hetzelfde, in
// functions/api/capacity.js en functions/api/order.js — op één `AND id < ?2` na.
// Dat ging twee jaar goed omdat er niets veranderde. Toen de agenda gedeeld werd
// (beelden in plaats van producten, en het weekend erbij) moest dezelfde regel op
// twee plekken tegelijk mee, en de derde lezer die eraan kwam — het
// abonnementsdashboard, waar een klant zelf twee dagen aanwijst — zou de derde
// kopie zijn geweest.
//
// Drie kopieën van "wat is er al vastgelegd" is drie kansen om een dag twee keer
// te verkopen. Dit is er één.
//
// ── WAT ER MEETELT, EN WAT NIET ─────────────────────────────────────────────
//
// Eén bron houdt dagen bezet: een bestelling met een gereserveerd venster
// (`orders.window_start`), zolang zij niet geannuleerd is en haar betaaltermijn
// niet verlopen. Er is iemand aan wie die dag beloofd is.
//
// ── DE ABONNEMENTSWACHTRIJ TELT NIET MEER MEE — ronde 10, 8 oktober 2026 ──────
// Hier was een tweede bron: een vastgezet item uit `plan_queue` dat zelf dagen
// had gekozen. Het weeksysteem is weg (§28 van het overzicht): een abonnee
// bestelt via het gewone formulier, en zijn bestelling met een venster staat
// dus gewoon in `orders`. `plan_queue` blijft als geschiedenis staan, maar
// niets schrijft er meer in en de agenda leest hem niet meer.
//
// ── EN ALS DE AGENDA NIET TE LEZEN IS, WORDT ER NIETS GEGOKT ────────────────
//
// Deze functie vangt niets af. Een ontbrekende kolom of een database die er niet
// is, gooit — en de aanroepers hebben daar hun eigen antwoord op: /api/capacity
// geeft 503 met `reason: 'unavailable'`, en het bestel-endpoint schrijft geen
// venster. Dat is met opzet de enige plek in de keten die weigert in plaats van
// afzwakt: een datum die verzonnen is terwijl de agenda onleesbaar was, is precies
// de belofte waar de poort tegen bestaat.

import { HORIZON_DAYS, addDays, bookedFromRows } from '../data/capacity.js';

/**
 * Rijen van bestellingen die een venster vasthouden.
 *
 * TWEE MANIEREN OM IETS WEG TE LATEN, EN ZE ZIJN NIET HETZELFDE.
 *
 *   `beforeId`  — alles met een HOGERE id telt niet mee. Dat is de wedloopcontrole
 *                 bij het plaatsen van een bestelling: wie eerder was, wint, en
 *                 wie later binnenkwam bestaat op dat moment nog niet.
 *   `exceptId`  — precies één bestelling telt niet mee. Dat is het VERZETTEN van
 *                 een venster: de dagen die deze bestelling nu bezet houdt, houdt
 *                 zij straks niet meer bezet, dus zou zij tegen zichzelf tellen
 *                 als zij bleef meedoen. Bij een grote order is dat het verschil
 *                 tussen "past niet" en "past precies".
 *
 * Ze staan naast elkaar en niet als één parameter, omdat één parameter met twee
 * betekenissen betekent dat de aanroepende regel de enige uitleg is.
 */
function orderSql(beforeId, exceptId) {
  return `SELECT window_start, window_end, product_count, service, details_json
            FROM orders
           WHERE tier = 'attended'
             AND window_start IS NOT NULL
             AND status <> 'cancelled'
             AND COALESCE(window_end, window_start) >= ?1
             AND NOT (
                   COALESCE(payment_status, 'unpaid') = 'unpaid'
               AND window_expires_at IS NOT NULL
               AND window_expires_at <= datetime('now')
             )${beforeId ? ' AND id < ?2' : ''}${exceptId ? ` AND id <> ?${beforeId ? 3 : 2}` : ''}`;
}

/**
 * De dichtgezette dagen en de vastgelegde last, vanaf `today`.
 *
 * @param {*} env                Cloudflare-omgeving met `DB`
 * @param {string} today         'YYYY-MM-DD'
 * @param {{beforeId?: number, exceptId?: number}} [opties]  zie orderSql()
 * @returns {Promise<{blackouts: Set<string>, booked: Record<string, number>}>}
 */
export async function readCalendar(env, today, { beforeId = null, exceptId = null } = {}) {
  const horizonEnd = addDays(today, HORIZON_DAYS + 14);
  const binds = [today, beforeId, exceptId].filter((v) => v !== null && v !== undefined);
  const orders = env.DB.prepare(orderSql(beforeId, exceptId)).bind(...binds);

  const [blackoutRows, orderRows] = await Promise.all([
    env.DB.prepare('SELECT day FROM blackout_days WHERE day >= ?1 AND day <= ?2').bind(today, horizonEnd).all(),
    orders.all(),
  ]);

  const blackouts = new Set((blackoutRows.results || []).map((r) => r.day));
  const rijen = (orderRows.results || []).map(videoVelden);
  return { blackouts, booked: bookedFromRows(rijen, blackouts) };
}

/**
 * De twee velden die een videorij nodig heeft om gewogen te kunnen worden.
 *
 * Geëxporteerd omdat het beheerscherm dezelfde rijen leest en dezelfde vertaling
 * nodig heeft; twee kopieën hiervan zouden precies het soort verschil worden dat
 * je pas merkt als de planning en de poort iets anders zeggen.
 *
 * ── WAAROM DIT IN JAVASCRIPT GEBEURT EN NIET IN DE QUERY — 7 sep 2026 ──────
 *
 * De stijl en het aantal clips staan in `details_json`, en SQLite kan die er met
 * json_extract() zo uit halen. Dat is hier bewust niet gedaan. Deze query is de
 * enige lezer van de agenda, en als hij gooit, weigert de hele keten een venster
 * te schrijven — /api/capacity geeft 503, het bestel-endpoint legt niets vast.
 * json_extract() op een rij met kapotte JSON is een fout van de hele query, niet
 * van die ene rij, en dan valt de poort om voor elke klant vanwege één rommelige
 * bestelling uit het verleden. Hier valt alleen die ene rij weg, en die verschijnt
 * dan als een gat in het beheerscherm — precies wat bookedFromRows() met een
 * onweegbare rij hoort te doen.
 *
 * De rijenset is klein: alleen bestellingen met een venster binnen de horizon,
 * in de praktijk tientallen. `details_json` meelezen kost daar niets.
 */
export function videoVelden(r) {
  if (String(r.service || '') !== 'video') return r;
  let d = null;
  try { d = JSON.parse(r.details_json || '{}'); } catch { d = null; }
  return { ...r, style: d?.style, clip_count: d?.clips };
}
