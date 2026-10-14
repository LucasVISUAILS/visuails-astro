/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAAROM IEMAND PAUZEERT OF OPZEGT — 8 oktober 2026 (punt 2.07, ronde B)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas bij 2.07, letterlijk: "Ook bij het opzeggen of pauzeren een reden laten
 * opgeven zodat ik weet wat het probleem is (stel ze geven aan dat ze niet weten
 * wat ze met hun overige credits moeten doen dat ze contact kunnen opnemen of ons
 * via een knop contact met hun opnemen om te bespreken wat allemaal mogelijk is
 * om te doen met de overige credits en waar ze het het beste aan kunnen
 * uitgeven."
 *
 * Een paar vaste redenen en "anders" met eigen woorden. De keuze is verplicht
 * (het formulier zegt `required`, de server controleert het nog een keer). De
 * code komt in subscriptions.stop_reden (migratie 0063), de eigen woorden in
 * stop_toelichting; /admin en de studiomail lezen ze terug met redenLabel().
 *
 * DE REDEN `credits` is de reden waar Lucas iets mee kan: na pauzeren of
 * opzeggen met die reden staat de knop "Bespreek met ons wat je met je credits
 * kunt doen" groot in beeld (account.js, planView()).
 *
 * Geen DOM en geen database buiten slaReden(): Studio, /admin, de mail en de
 * tests laden dit.
 */

/** De codes, in de volgorde van het formulier. `anders` staat altijd onderaan. */
export const STOP_REDENEN = Object.freeze(['credits', 'rustig', 'prijs', 'beelden', 'anders']);

/** De reden waarbij de knop "bespreek je credits" extra in beeld komt. */
export const REDEN_CREDITS = 'credits';

/* De woorden. Klanttekst (NL en EN, G5 in kladblok/teksten); /admin leest de
   Nederlandse. Geen ik-vorm: de zinnen beschrijven de situatie. */
const LABEL = {
  nl: {
    credits: 'Niet duidelijk wat te doen met de overige credits',
    rustig: 'Even een rustige periode: geen nieuwe producten',
    prijs: 'Te duur voor wat er nu nodig is',
    beelden: 'De beelden passen niet goed bij het merk',
    anders: 'Anders, namelijk:',
    andersKort: 'Anders',
  },
  en: {
    credits: 'Not sure what to do with the remaining credits',
    rustig: 'A quiet period: no new products for now',
    prijs: 'Too expensive for what is needed right now',
    beelden: 'The images do not suit the brand well',
    anders: 'Something else:',
    andersKort: 'Something else',
  },
};

/** Maximaal aantal tekens voor de eigen woorden bij "anders". */
export const TOELICHTING_MAX = 300;

const taal = (lang) => (lang === 'en' ? 'en' : 'nl');

/** De keuzes voor het formulier: [{ id, label }]. */
export function redenKeuzes(lang = 'nl') {
  const t = LABEL[taal(lang)];
  return STOP_REDENEN.map((id) => ({ id, label: t[id] }));
}

/**
 * Wat er gepost is, gecontroleerd. Geeft { ok, reden, toelichting } of
 * { ok: false } bij geen of een onbekende keuze, of "anders" zonder woorden.
 * Eigen woorden mogen ook bij een vaste reden (ingekort, zonder regeleinden).
 */
export function leesReden(form) {
  const reden = String(form?.get?.('reden') || '').trim();
  const toelichting = String(form?.get?.('toelichting') || '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TOELICHTING_MAX);
  if (!STOP_REDENEN.includes(reden)) return { ok: false };
  if (reden === 'anders' && !toelichting) return { ok: false };
  return { ok: true, reden, toelichting };
}

/** De reden als leesbare tekst ("Anders: …" met de eigen woorden). */
export function redenLabel(reden, toelichting = '', lang = 'nl') {
  const t = LABEL[taal(lang)];
  if (!reden || !t[reden]) return toelichting ? String(toelichting) : '';
  if (reden === 'anders') return `${t.andersKort}: ${toelichting || '—'}`;
  return toelichting ? `${t[reden]} (${toelichting})` : t[reden];
}

/** De reden opslaan bij het abonnement. Nooit werpen: de pauze of opzegging zelf gaat voor. */
export async function slaRedenOp(env, subId, { reden, toelichting = '' }) {
  if (!env?.DB || !subId || !STOP_REDENEN.includes(reden)) return false;
  try {
    await env.DB.prepare(
      `UPDATE subscriptions SET stop_reden = ?2, stop_toelichting = ?3, updated_at = datetime('now') WHERE id = ?1`
    ).bind(subId, reden, toelichting || null).run();
    return true;
  } catch (err) {
    /* Zonder migratie 0063 bestaat de kolom niet; de pauze of opzegging gaat gewoon door. */
    console.error('[abonnement] reden niet opgeslagen —', err?.message || err);
    return false;
  }
}
