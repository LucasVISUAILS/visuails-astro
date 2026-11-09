/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * "OP MAAT" EN "BIJKOPEN" ACHTER ÉÉN KNOP — 9 november 2026 (ronde 91, K-14)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas (lijst 85, B8 = goed, "Ja, achter Bespreek met ons"): tot de eerste
 * abonnees er zijn, ziet een klant op /plans, op /start/plan en in Studio drie
 * plannen en één knop "Bespreek met ons". Het abonnement op maat (30–300 credits)
 * en het bijkopen van extra credits zijn niet weg: de routes, de prijzen, de mails
 * en de nachttaken blijven staan en werken. Alleen de knoppen ernaartoe, de vierde
 * plankaart en de FAQ-regels die ze beloven, staan uit.
 *
 * TERUGZETTEN: deze ene waarde op `true`. Dan staat alles er weer zoals op
 * 8 november 2026 (tests/blind91-k-abonnement.test.mjs kijkt naar beide standen).
 *
 * De knop is een WhatsApp-link met een vaste openingszin, zoals elke andere
 * "Bespreek het op WhatsApp"-knop op de site (src/data/whatsapp.js): Lucas drukt
 * zelf op antwoorden, er gaat niets vanzelf. Geen DOM en geen database: de
 * pagina's, Studio en de toetsen laden dit.
 */
import { waHref } from './whatsapp.js';

/** Staan "op maat" en "bijkopen" in beeld? Zie de kop: één vlag voor alle plekken. */
export const ABO_EXTRA_ZICHTBAAR = false;

const TEKST = {
  nl: {
    knop: 'Bespreek met ons',
    /* /plans en /start/plan, onder de drie plannen. */
    zin: 'Meer of minder nodig dan deze drie? We kijken graag met je wat past.',
    /* Studio, waar het bijkopen stond (tab Credits). */
    kop: 'Meer credits nodig?',
    lede: 'Een eigen aantal per maand, of een keer extra: dat bespreken we graag met je.',
    /* Studio, onder de plannen bij Overstappen. */
    overstap: 'Een ander aantal dan deze plannen?',
    /* /plans, "Zo werkt het": de regel over bijkopen. */
    tekortKop: 'Een maand tekort?',
    tekort: 'Bespreek met ons wat er kan.',
    wa: (ref) => `Hallo VISUAILS, ik wil graag bespreken welk abonnement bij me past${ref ? ` (${ref})` : ''}.`,
  },
  en: {
    knop: 'Talk to us',
    zin: 'Need more or less than these three? We are happy to work out what fits.',
    kop: 'Need more credits?',
    lede: 'A number of your own each month, or extra credits once: we are happy to talk it through.',
    overstap: 'A different number than these plans?',
    tekortKop: 'Short one month?',
    tekort: 'Talk to us about what is possible.',
    wa: (ref) => `Hello VISUAILS, I would like to talk about which plan fits me${ref ? ` (${ref})` : ''}.`,
  },
};

/**
 * De woorden en de link van de knop, in de taal van de pagina.
 * @param {'nl'|'en'} lang
 * @param {{ ref?: string }} [o]  het kenmerk van het abonnement, als dat er is (Studio)
 */
export function bespreekAbo(lang = 'nl', { ref = '' } = {}) {
  const t = TEKST[lang === 'en' ? 'en' : 'nl'];
  return { ...t, href: waHref(t.wa(String(ref || '').trim())) };
}
