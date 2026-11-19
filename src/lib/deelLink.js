/*
 * VISUAILS — de ene zin over het delen van de privélink.
 *
 * ── levering 119 (18 november 2026, proefronde P9-05) ──────────────────────────────────────────────────────────
 * De bevestiging zei "de sleutel tot je bestelling … deel hem alleen met wie mee moet kijken", de levermail "stuur
 * hem gerust door aan een collega", en de bestelpagina "behandel hem als een sleutel". Noor wist niet of ze de link
 * mocht delen. Nu één zin, die zegt wat de link kan (zien én goedkeuren) en wat je ermee doet. Elke plek die over
 * doorsturen gaat, leest hem hier.
 *
 * Geen DOM; de Worker, de cron en de toetsen laden dit.
 */

export const DEEL_ZIN = Object.freeze({
  nl: 'Iedereen met deze link kan je bestelling zien en goedkeuren; stuur hem alleen naar wie mee moet kijken.',
  en: 'Anyone with this link can see and approve your order; only send it to people who need to look.',
});

/* Bij een aanvraag (video, eigen look) valt er nog niets goed te keuren. */
export const DEEL_ZIN_AANVRAAG = Object.freeze({
  nl: 'Iedereen met deze link kan je aanvraag zien; stuur hem alleen naar wie mee moet kijken.',
  en: 'Anyone with this link can see your request; only send it to people who need to look.',
});

/** De zin in de taal van de klant ('nl' of anders Engels). */
export function deelZin(lang = 'nl', { aanvraag = false } = {}) {
  const t = aanvraag ? DEEL_ZIN_AANVRAAG : DEEL_ZIN;
  return lang === 'nl' ? t.nl : t.en;
}
