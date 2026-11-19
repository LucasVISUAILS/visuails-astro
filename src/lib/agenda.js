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

import { HORIZON_DAYS, addDays, addOpenDays, QUEUE_AIM_DAYS, bookedFromRows, rowPunten, isOpenDay, WINDOW_DAYS, ATTENDED_PUNTEN_PER_DAG } from '../data/capacity.js';
/* levering 119 (18 november 2026, proefronde P3-07): feestdagen standaard dicht, met een uitzondering in /admin. */
import { feestdagenTussen } from '../data/capacity.js';
import { vandaagNL } from './nlDag.js';
import { heeftVoorrang, voorrangDeadline } from '../data/pricing.js';
/* levering 118 (17 november 2026, proefronde P4-09): een merkmodel plant met de termijn voor de eerste richtingen. */
import { MERKMODEL_RICHTINGEN_WERKDAGEN } from '../data/termijnen.js';
/* levering 118 (17 november 2026, proefronde L-16): voorrang loopt vanaf betaald én foto's compleet. */
import { voorrangVanaf } from './fotosCompleet.js';

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
  /* levering 119 (P3-07): de Nederlandse feestdagen erbij, behalve de dagen die Lucas in /admin openzette. */
  for (const dag of feestdagenTussen(today, horizonEnd, await leesFeestdagOpen(env))) blackouts.add(dag);
  const rijen = (orderRows.results || []).map(videoVelden);
  return { blackouts, booked: bookedFromRows(rijen, blackouts) };
}

/*
 * ── DE UITZONDERING OP EEN FEESTDAG — levering 119 (18 november 2026, proefronde P3-07) ──────────────────────
 * Werkt de studio op een feestdag toch, dan zet Lucas die dag in /admin open. De dagen staan als JSON-lijst
 * ('YYYY-MM-DD') in app_settings onder FEESTDAG_OPEN_KEY, zodat er geen migratie nodig is. Niet te lezen (geen
 * tabel, kapotte waarde): dan geen uitzonderingen, dus de feestdagen blijven dicht. Dat is de veilige kant: een
 * dag te weinig aanbieden kost niets, een leverdag op eerste kerstdag beloven wel.
 */
export const FEESTDAG_OPEN_KEY = 'agenda.feestdag_open';

/** De feestdagen die toch open zijn, als Set van 'YYYY-MM-DD'. Nooit een fout. */
export async function leesFeestdagOpen(env) {
  try {
    const rij = await env?.DB?.prepare('SELECT value FROM app_settings WHERE key = ?1').bind(FEESTDAG_OPEN_KEY).first();
    const lijst = JSON.parse(rij?.value || '[]');
    return new Set((Array.isArray(lijst) ? lijst : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))));
  } catch {
    return new Set();
  }
}

/**
 * Zet een feestdag open (`open` = true) of weer dicht. Alleen echte feestdagen (feestdagenTussen); oude dagen
 * (vóór `vandaag`) vallen uit de lijst. Geeft { ok, fout?, open: [...] }. Voor /admin (src/lib/admin.js).
 */
export async function zetFeestdagOpen(env, dag, open, vandaag = vandaagNL()) {
  const d = String(dag || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !feestdagenTussen(d, d).size) return { ok: false, fout: 'Dat is geen Nederlandse feestdag.', open: [] };
  const nu = await leesFeestdagOpen(env);
  if (open) nu.add(d); else nu.delete(d);
  const lijst = [...nu].filter((x) => x >= vandaag).sort();
  await env.DB.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).bind(FEESTDAG_OPEN_KEY, JSON.stringify(lijst)).run();
  return { ok: true, open: lijst };
}

/**
 * De laatste dag waarop deze bestelling af moet zijn.
 *
 * Eén functie voor alle soorten, zodat er geen tweede regel kan ontstaan die er stilletjes van afwijkt. Geeft
 * ook terug WAAROM die dag het is, want een lijst die alleen datums toont, laat je raden waar ze vandaan komen.
 *
 * ── VERHUISD UIT ADMIN.JS — 9 november 2026 (ronde 91, lijst 85 w1 = goed) ───────────────────────────────────
 * De planning, de agenda en het oude "Eerst af" rekenden hiermee in admin.js; nu staat hij hier, zodat Nu doen
 * (src/lib/nudoen.js) en dus ook het nachtrapport dezelfde dag noemen. Twee dingen zijn daarbij rechtgezet:
 *   · VOORRANG rekent met voorrangDeadline() uit pricing.js: de betaaldatum, werkdagen, vóór 15:00 de volgende
 *     werkdag om 17:00 — wat de voorwaarden beloven. Hiervoor was het de dag van binnenkomst plus één open dag
 *     (kalenderdagen, het weekend erbij), en dan zei /admin "morgen" terwijl de belofte "dinsdag 17:00" was.
 *     `uur` staat er dan bij (17). Nog niet betaald: de termijn loopt nog niet, dus de gewone streefdag.
 *   · `vandaag` kan worden meegegeven (een test, of het nachtrapport om 05:10), zonder dat er iets op de klok leunt.
 *
 * @param {{ tier?: string, window_start?: string, window_end?: string, created_at?: string, paid_at?: string,
 *           details_json?: string }} o
 * @param {Set<string>} [blackouts]  dichtgezette dagen ('YYYY-MM-DD')
 * @returns {{ dag: string, manier: 'datum'|'voorrang'|'asap', uur?: number }}
 */
export function agendaUiterlijk(o, blackouts = new Set(), vandaag = new Date().toISOString().slice(0, 10)) {
  if (o.tier === 'attended' && o.window_start && o.window_end) {
    return { dag: o.window_end, manier: 'datum' };
  }
  const voorrang = heeftVoorrang(o);
  /* levering 118 (L-16): vanaf het latere van betaald en foto's compleet; ontbreken er nog foto's, dan de streefdag. */
  const voorrangStart = voorrang ? voorrangVanaf(o) : null;
  if (voorrangStart) {
    const d = voorrangDeadline(voorrangStart);
    if (d) return { dag: d.datum, manier: 'voorrang', uur: d.uur };
  }
  const binnen = String(o.created_at || '').replace('T', ' ').slice(0, 10);
  const vanaf = /^\d{4}-\d{2}-\d{2}$/.test(binnen) ? binnen : vandaag;
  /* levering 118 (17 november 2026, proefronde P4-09): een merkmodel is niet "af morgen". De klant hoort de eerste
     richtingen binnen MERKMODEL_RICHTINGEN_WERKDAGEN werkdagen (Studio, de betaalmail, /custom-models), gerekend vanaf
     de betaling; zonder betaling vanaf binnenkomst. De manier blijft 'asap': geen vaste dag van de klant. */
  if (o.service === 'brand-model') {
    const betaald = String(o.paid_at || '').replace('T', ' ').slice(0, 10);
    const start = /^\d{4}-\d{2}-\d{2}$/.test(betaald) ? betaald : vanaf;
    return { dag: werkdagenNa(start, MERKMODEL_RICHTINGEN_WERKDAGEN, blackouts), manier: 'asap', termijn: 'merkmodel' };
  }
  /* QUEUE_AIM_DAYS (sinds 3 september 2026): de site belooft geen marge meer, en de lat van de studio zelf is
     binnen een dag. */
  return { dag: addOpenDays(vanaf, QUEUE_AIM_DAYS, blackouts), manier: voorrang ? 'voorrang' : 'asap' };
}

/* levering 118 (17 november 2026, proefronde P4-09): de `n`de werkdag (maandag tot en met vrijdag, niet dichtgezet)
   strikt na `iso`. De klant leest "werkdagen"; addOpenDays() telt het weekend mee (een open studiodag), en dan plande
   /admin een merkmodel op een zondag terwijl de belofte de dinsdag erna is. */
export function werkdagenNa(iso, n, blackouts = new Set()) {
  let d = iso;
  let over = Math.max(0, Number(n) || 0);
  for (let guard = 0; over > 0 && guard < 400; guard += 1) {
    d = addDays(d, 1);
    const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (wd !== 0 && wd !== 6 && isOpenDay(d, blackouts)) over -= 1;
  }
  return d;
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

/**
 * ── BETAALD NA EEN VERLOPEN RESERVERING: PAST DE DATUM NOG? ──────────────────
 * levering 117 (17 november 2026, proefronde P3-10). Een reservering vervalt na
 * de betaaltermijn; vanaf dat moment telt de agenda haar niet meer mee (zie
 * orderSql hierboven) en kan een ander die dag boeken. De nachtelijke taak maakt
 * de datum pas later leeg. Betaalde de eerste klant in dat gat alsnog (zijn
 * herinneringslink werkt nog), dan zette de webhook hem op betaald mét de datum:
 * de dag stond op 120 van 80 punten, zonder melding.
 *
 * Deze vraag stelt de webhook vlak voor hij "betaald" schrijft. Antwoord:
 *   { verlopen: false }               niets aan de hand (geen datum, of nog op tijd);
 *   { verlopen: true, past: true }    termijn voorbij, maar de dagen zijn nog vrij: hij houdt ze;
 *   { verlopen: true, past: false }   termijn voorbij en de dagen zijn weg (of voorbij): datum leegmaken.
 * Dezelfde rekenregel als de poort (het gewicht uit rowPunten, verdeeld over de
 * dagen zoals windowFor doet), tegen de agenda zonder deze bestelling. Werpt als de agenda niet te lezen is; de
 * aanroeper houdt dan de datum (zoals loseRaceIfOversold in /api/order).
 */
export async function verlopenVensterPastNog(env, orderId, vandaag = vandaagNL()) {
  const o = await env.DB.prepare(
    `SELECT id, tier, service, product_count, details_json, window_start, window_end,
            CASE WHEN window_expires_at IS NOT NULL AND window_expires_at <= datetime('now') THEN 1 ELSE 0 END AS verlopen
       FROM orders WHERE id = ?1`
  ).bind(orderId).first();
  if (!o || !o.window_start || Number(o.verlopen) !== 1) return { verlopen: false };
  const venster = { start: o.window_start, end: o.window_end || o.window_start };
  if (o.window_start < vandaag) return { verlopen: true, past: false, venster };
  const punten = rowPunten(videoVelden(o));
  if (punten === null) return { verlopen: true, past: true, venster };
  const { blackouts, booked } = await readCalendar(env, vandaag, { exceptId: o.id });
  /* De twee dagen die hem beloofd zijn (begin en eind; een venster kan over een volle dag heen springen),
     elk met de helft van zijn last erbij — dezelfde verdeling als windowFor() in capacity.js. */
  const perDag = Math.ceil(Math.max(0, Number(punten) || 0) / WINDOW_DAYS);
  const dagen = [...new Set([venster.start, venster.end])];
  const past = dagen.every((d) => isOpenDay(d, blackouts) && (booked[d] || 0) + perDag <= ATTENDED_PUNTEN_PER_DAG);
  return { verlopen: true, past, venster };
}
