/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET PLAFOND VOOR ABONNEMENTEN, IN CREDITS — 8 oktober 2026 (punt 6.05, V45 = a)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos: "een plafond in credits dat jij kiest vanuit die uren". De rem op
 * nieuwe abonnementen telt de maandcredits van alle abonnementen die meetellen
 * (bezetting() in subscription.js) en vergelijkt die met één getal. Dat getal
 * zet hij in /admin › Klanten; staat er nog niets, dan geldt ABO_CREDITS_PLAFOND
 * uit src/data/plans.js.
 *
 * In app_settings onder `abo_credits_plafond`, zoals de proefstand (proefStand.js)
 * en de melding in Studio. Een kapotte of lege waarde is de constante: de stand
 * mag nooit de reden zijn dat er ineens niets meer past zonder dat iemand hem zette.
 *
 * Eén telling voor drie plekken: de poort in handleSubscribeStart(), de
 * beschikbaarheid op /start/plan (functions/api/plan-plek.js) en de regel in
 * /admin lezen allemaal stand() hieronder.
 */
import { aboPlafond, ABO_CREDITS_PLAFOND } from '../data/plans.js';
import { bezetting } from './subscription.js';

export const ABO_PLAFOND_KEY = 'abo_credits_plafond';

/** Hoog genoeg voor elke echte keuze, laag genoeg dat een typefout opvalt. */
export const ABO_PLAFOND_MAX = 100000;

/** De stand uit /admin, of de constante. Nooit een fout. */
export async function leesAboPlafond(env) {
  try {
    const rij = await env?.DB?.prepare('SELECT value FROM app_settings WHERE key = ?1').bind(ABO_PLAFOND_KEY).first();
    const n = Math.floor(Number(rij?.value));
    return { plafond: aboPlafond(rij?.value), gezet: rij?.value != null && Number.isFinite(n) && n > 0 };
  } catch {
    return { plafond: ABO_CREDITS_PLAFOND, gezet: false };
  }
}

/** Zet het plafond. Geeft { ok, fout }. Leeg = terug naar de constante. */
export async function zetAboPlafond(env, ruw) {
  const tekst = String(ruw ?? '').trim();
  if (!tekst) {
    await env.DB.prepare('DELETE FROM app_settings WHERE key = ?1').bind(ABO_PLAFOND_KEY).run();
    return { ok: true };
  }
  if (!/^\d{1,6}$/.test(tekst)) return { ok: false, fout: 'Vul een heel aantal credits in, of laat het veld leeg voor de standaard.' };
  const n = Number(tekst);
  if (n < 1 || n > ABO_PLAFOND_MAX) return { ok: false, fout: `Kies een plafond tussen 1 en ${ABO_PLAFOND_MAX} credits per maand.` };
  await env.DB.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).bind(ABO_PLAFOND_KEY, String(n)).run();
  return { ok: true };
}

/**
 * De stand van de rem in één antwoord: wat de abonnees samen per maand aan
 * credits hebben, en het plafond. Voor de poort, /api/plan-plek en /admin.
 */
export async function aboStand(env) {
  const [{ credits }, { plafond, gezet }] = await Promise.all([bezetting(env), leesAboPlafond(env)]);
  return { credits: Math.max(0, Math.floor(Number(credits) || 0)), plafond, gezet };
}
