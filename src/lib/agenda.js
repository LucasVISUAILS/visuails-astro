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
// Twee bronnen houden dagen bezet, en allebei om dezelfde reden: er is iemand aan
// wie een dag beloofd is.
//
//   · een bestelling met een gereserveerd venster (`orders.window_start`), zolang
//     zij niet geannuleerd is en haar betaaltermijn niet verlopen;
//   · een VASTGEZET item uit een abonnementswachtrij dat zelf dagen heeft gekozen.
//
// Een concept in de wachtrij telt NIET mee. Vastzetten is wat een slot kost en wat
// van een voornemen een afspraak maakt; zou een concept al dagen bezet houden, dan
// kan één klant de agenda dichtzetten met plannen die hij nooit uitvoert.
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
  return `SELECT window_start, window_end, product_count, service
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

/* Een vastgezet wachtrij-item is één stuk van zijn eigen soort. `1 AS product_count`
   en `kind AS service` zetten het in precies de vorm die bookedFromRows() al leest,
   zodat er geen tweede weegfunctie nodig is voor abonnementen. */
const QUEUE_SQL = `SELECT window_start, window_end, 1 AS product_count, kind AS service
                     FROM plan_queue
                    WHERE locked_at IS NOT NULL
                      AND taken_at IS NULL
                      AND window_start IS NOT NULL
                      AND COALESCE(window_end, window_start) >= ?1`;

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

  const [blackoutRows, orderRows, queueRows] = await Promise.all([
    env.DB.prepare('SELECT day FROM blackout_days WHERE day >= ?1 AND day <= ?2').bind(today, horizonEnd).all(),
    orders.all(),
    env.DB.prepare(QUEUE_SQL).bind(today).all(),
  ]);

  const blackouts = new Set((blackoutRows.results || []).map((r) => r.day));
  const rijen = [...(orderRows.results || []), ...(queueRows.results || [])];
  return { blackouts, booked: bookedFromRows(rijen, blackouts) };
}
