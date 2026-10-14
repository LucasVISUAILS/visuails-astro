/*
 * VISUAILS — GET /api/plan-plek. Is er nog plek voor een abonnement?
 * 24 september 2026.
 *
 * Lucas: *"de beschikbaarheid vóór het formulier tonen."*
 *
 * Tot vandaag hoorde een klant pas NA het invullen en versturen van /start/plan
 * dat een plan vol was (`?fout=vol`): naam, adres, btw-nummer, termijn, week —
 * alles ingevuld, en dan een nee. /start/plan is een statische pagina, dus het
 * antwoord moet live opgehaald worden, en dat is wat deze route doet.
 *
 * ── ÉÉN TELLING, TWEE PLEKKEN ─────────────────────────────────────────────
 *
 * Wat hier "past" is, komt uit precies dezelfde functies als de poort in
 * handleSubscribeStart(): aboStand() voor wat er vastligt en het plafond,
 * planPast() en creditsPassen() voor wat erbij kan (6.05: in credits). Zo kan de pagina niet "nog plek" zeggen
 * terwijl de poort daarna weigert — behalve in de minuut dat iemand anders de
 * laatste plek pakt, en dan vangt de poort het op zoals altijd.
 *
 * ── WAT ER NIET IN STAAT ──────────────────────────────────────────────────
 *
 * Een bezettingsgraad. Per plan een ja of nee, "nog N plekken" alleen bij
 * drie of minder (6.05, Lucas' keuze), en voor een maand op maat het grootste
 * aantal credits dat nog past.
 *
 * Cache 60 seconden, om dezelfde reden als /api/capacity: een publieke leesroute
 * zonder geheim verdedig je met een cache en niet met een teller.
 */
import { aboStand } from '../../src/lib/aboPlafond.js';
import { viaRandCache } from '../../src/lib/edgeCache.js';
import { PLAN_IDS, planPast, creditsPassen, seatsLeft, PLEKKEN_TONEN_TOT } from '../../src/data/plans.js';
import { CUSTOM_CREDITS_MIN, CUSTOM_CREDITS_MAX, CUSTOM_CREDITS_STEP } from '../../src/data/pricing.js';

/* ── SINDS 6.05 (8 OKTOBER 2026) IN CREDITS ─────────────────────────────────
   De telling is de som van de maandcredits van alle abonnementen (bezetting()),
   tegen het plafond uit /admin of ABO_CREDITS_PLAFOND — dezelfde aboStand() als
   de poort. Per plan een ja of nee, en `plekken` ALLEEN als het er
   PLEKKEN_TONEN_TOT of minder zijn: daarboven zegt de pagina niets, en dit
   antwoord dus ook niet (geen bezettingsgraad op een openbare route). */

/** Het grootste aantal credits voor een maand op maat dat nog past, of 0. */
export function maatRuimte(vastgelegd, plafond) {
  const stap = CUSTOM_CREDITS_STEP || 1;
  for (let n = CUSTOM_CREDITS_MAX; n >= CUSTOM_CREDITS_MIN; n -= stap) {
    if (creditsPassen(n, vastgelegd, plafond)) return n;
  }
  return 0;
}

/** Het antwoord zelf, los van het verzoek — zodat een toets hem kan aanroepen. */
export async function planPlek(env) {
  const { credits, plafond } = await aboStand(env);
  const plannen = Object.fromEntries(PLAN_IDS.map((id) => [id, planPast(id, credits, plafond)]));
  const plekken = {};
  for (const id of PLAN_IDS) {
    const n = seatsLeft(credits, id, plafond);
    if (n > 0 && n <= PLEKKEN_TONEN_TOT) plekken[id] = n;
  }
  const maatMax = maatRuimte(credits, plafond);
  return {
    plannen,
    plekken,
    maat: { past: maatMax > 0, maxCredits: maatMax },
    /* Is er nog iets te kiezen? Zo niet, dan zegt de pagina het bovenaan. */
    iets: Object.values(plannen).some(Boolean) || maatMax > 0,
  };
}

/* Eén keer per minuut uit D1, en niet bij elke aanvraag (8 oktober 2026); zie
   de kop van src/lib/edgeCache.js. Het antwoord hangt van geen enkele parameter
   af, dus de sleutel is alleen de naam. */
export async function onRequestGet(context) {
  return viaRandCache(context, 'plan-plek', {}, () => planPlekAntwoord(context));
}

async function planPlekAntwoord({ env }) {
  const antwoord = await planPlek(env);
  return new Response(JSON.stringify(antwoord), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
}
