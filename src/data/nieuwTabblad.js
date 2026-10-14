/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * "OPENT IN EEN NIEUW TABBLAD" — ÉÉN ZIN, ÉÉN PLEK — 8 oktober 2026 (o26)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Links naar WhatsApp, de sociale kanalen en een paar andere openen in een nieuw
 * tabblad (target="_blank"). Wie de site met een schermlezer gebruikt, hoorde dat
 * nergens: ineens is er een tweede tabblad en de terugknop doet niets. Dat is geen
 * WCAG-fout, wel een slordigheid (doorlichting §6), en de oplossing is klein: een
 * zin die alleen een schermlezer voorleest.
 *
 * Eén bron voor die zin, in drie vormen:
 *   · <NieuwTabblad lang={lang} /> in een Astro-component (src/components/);
 *   · nieuwTabbladHtml(lang) waar HTML als tekst wordt opgebouwd (de privélink,
 *     de feedbackknoppen);
 *   · metNieuwTabblad(label, lang) voor een aria-label die de zichtbare tekst
 *     vervangt (de iconen in de voettekst).
 *
 * De klasse `.sr-only` staat in src/styles/global.css (de site en Studio) en in
 * public/portal.css en public/account.css (privélink en het oude dashboard).
 * /admin doet niet mee: dat is Lucas' eigen werkscherm.
 */

export const NIEUW_TABBLAD = {
  en: 'opens in a new tab',
  nl: 'opent in een nieuw tabblad',
};

/** De kale zin in de taal van de lezer. */
export function nieuwTabblad(lang = 'en') {
  return NIEUW_TABBLAD[lang === 'nl' ? 'nl' : 'en'];
}

/** Voor een aria-label: "Instagram (opens in a new tab)". */
export function metNieuwTabblad(label, lang = 'en') {
  return `${label} (${nieuwTabblad(lang)})`;
}

/** Voor HTML die als tekst wordt opgebouwd: het verborgen stukje, met spatie ervoor. */
export function nieuwTabbladHtml(lang = 'en') {
  return `<span class="sr-only"> (${nieuwTabblad(lang)})</span>`;
}
