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
 * handleSubscribeStart(): bezetting() voor wat er vastligt, fitsBudget() en
 * fitsProducts() voor wat erbij kan. Zo kan de pagina niet "nog plek" zeggen
 * terwijl de poort daarna weigert — behalve in de minuut dat iemand anders de
 * laatste plek pakt, en dan vangt de poort het op zoals altijd.
 *
 * ── WAT ER NIET IN STAAT ──────────────────────────────────────────────────
 *
 * Aantallen. Geen "nog 3 plekken" en geen bezettingsgraad: dat zegt iets over
 * het bedrijf dat niet op een openbare route hoort, en de klant heeft er niets
 * aan. Per plan een ja of nee, en voor een maand op maat het grootste aantal
 * credits dat nog past.
 *
 * Cache 60 seconden, om dezelfde reden als /api/capacity: een publieke leesroute
 * zonder geheim verdedig je met een cache en niet met een teller.
 */
import { bezetting } from '../../src/lib/subscription.js';
import { PLAN_IDS, fitsBudget, fitsProducts } from '../../src/data/plans.js';
import {
  CUSTOM_CREDITS_MIN, CUSTOM_CREDITS_MAX, CUSTOM_CREDITS_STEP, creditsProductEquivalent,
} from '../../src/data/pricing.js';

/** Het grootste aantal credits voor een maand op maat dat nog past, of 0. */
export function maatRuimte(vastgelegd) {
  const stap = CUSTOM_CREDITS_STEP || 1;
  for (let n = CUSTOM_CREDITS_MAX; n >= CUSTOM_CREDITS_MIN; n -= stap) {
    if (fitsProducts(creditsProductEquivalent(n), vastgelegd)) return n;
  }
  return 0;
}

/** Het antwoord zelf, los van het verzoek — zodat een toets hem kan aanroepen. */
export async function planPlek(env) {
  const { producten } = await bezetting(env);
  const plannen = Object.fromEntries(PLAN_IDS.map((id) => [id, fitsBudget(id, producten)]));
  const maatMax = maatRuimte(producten);
  return {
    plannen,
    maat: { past: maatMax > 0, maxCredits: maatMax },
    /* Is er nog iets te kiezen? Zo niet, dan zegt de pagina het bovenaan. */
    iets: Object.values(plannen).some(Boolean) || maatMax > 0,
  };
}

export async function onRequestGet({ env }) {
  const antwoord = await planPlek(env);
  return new Response(JSON.stringify(antwoord), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
}
