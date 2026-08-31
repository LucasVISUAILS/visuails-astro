/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE GOEDGEKEURDE AANBEVELINGEN — GEGENEREERD, NIET MET DE HAND GESCHREVEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Dit bestand wordt geschreven door `npm run testimonials`. Niet met de hand
 * bijwerken: de volgende keer dat dat script draait, is jouw wijziging weg.
 *
 * ── WAAROM EEN BESTAND EN GEEN QUERY ────────────────────────────────────────
 *
 * ARCHITECTURE.md §1 verbiedt met zoveel woorden dat paginainhoud client-side
 * wordt opgehaald: de site is statisch, er staan nul externe scripts op, en de
 * cookieverklaring belooft dat ook. Een blok aanbevelingen dat bij het laden een
 * fetch doet, breekt alle drie tegelijk.
 *
 * De vorm die wél past is deze: een bouwstap leest de goedgekeurde rijen uit D1,
 * schrijft ze hierheen, en jij commit het resultaat. Dezelfde vorm als
 * visual/referentie.json. Het kost één handeling per publicatie, en die handeling
 * is precies de redactionele keuze die het toch al was.
 *
 * ── DE KETEN, VOOR ALS HIJ OVER EEN JAAR STIL STAAT ─────────────────────────
 *
 *   1 · De klant vult na oplevering het tevredenheidsformulier in en zet het
 *       vinkje dat wij zijn tekst mogen gebruiken (feedback.js, saveTestimonial).
 *   2 · Jij keurt hem goed op /admin/testimonials. Dat zet `testimonial_approved`
 *       op 1 en is met één klik terug te draaien.
 *   3 · `npm run testimonials` haalt de goedgekeurde op en schrijft dit bestand.
 *   4 · Je commit en deployt. Pas dán staat hij op de site.
 *
 * Stap 3 en 4 ontbraken tot 30 augustus 2026. Stap 1 en 2 bestonden allebei al,
 * wat het erger maakte en niet minder: er werd toestemming gevraagd voor iets
 * wat vervolgens nergens terechtkwam.
 *
 * ── WAT ER NIET IN STAAT ────────────────────────────────────────────────────
 *
 * Geen e-mailadressen, geen bestelnummers, geen bedragen. Alleen de tekst, de
 * naam die de klant zelf opgaf, en de maand. Dit bestand staat in git en wordt
 * uitgeserveerd als onderdeel van de pagina; alles wat er niet in hoeft, hoort
 * er niet in. Zie de kop van het script voor de query die dat afdwingt.
 */

/** @type {{text: string, name: string, month: string}[]} */
export const TESTIMONIALS = [];

/** Wanneer dit bestand voor het laatst is bijgewerkt. Leeg = nog nooit gedraaid. */
export const TESTIMONIALS_UPDATED = '';

/**
 * De aanbevelingen die op een pagina getoond mogen worden, hooguit `max`.
 *
 * Een functie en geen kale export, zodat er precies één plek is waar de grens en
 * de volgorde staan. De nieuwste eerst: een aanbeveling van vorige maand zegt
 * meer over hoe het nu gaat dan een van vorig jaar.
 */
export function testimonialsToShow(max = 3) {
  return TESTIMONIALS.slice(0, Math.max(0, max));
}
