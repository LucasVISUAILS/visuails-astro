/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE TERMIJNEN VAN EEN ONBETAALDE BESTELLING — 8 oktober 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Punt 9.01, §17.16. De betaaltermijn van zeven dagen stond op vier plekken los
 * van `PAYMENT_DAYS` in vat.js: `'+7 days'` in functions/api/order.js, twee keer
 * `'-7 days'` in cron/index.js en "zeven dagen" in de mailtekst van die cron.
 * Daarnaast stonden de herinnering (dag 3) en het vervallen (dag 14) als losse
 * constanten in de cron. Veranderde iemand er één, dan liep de rest uit de pas:
 * een mail die "zeven dagen" zegt over een klok die er tien telt.
 *
 * ── TWEE ZEVENS, EN DAT IS MET OPZET ─────────────────────────────────────────
 *
 * De tegenspreker bij 8.02 had gelijk: dit zijn twee verschillende afspraken die
 * toevallig allebei zeven dagen duren.
 *
 *   VENSTER_VASTHOUDEN_DAGEN  hoe lang een gereserveerde leverdatum blijft
 *                             staan terwijl de betaling openstaat
 *                             (`orders.window_expires_at`). Daarna komt de datum
 *                             vrij, de bestelling blijft.
 *   BETALEN_NA_BTW_AKKOORD    hoe lang een bestelling die Lucas in de btw-lijst
 *                             heeft goedgekeurd, nog betaald kan worden. Daarna
 *                             vervalt de bestelling zelf.
 *
 * Eén constante voor allebei zou betekenen dat wie de datum korter wil
 * vasthouden, ongemerkt ook goedgekeurde bestellingen sneller laat vervallen.
 *
 * En de twee die er al waren, hier naast de andere twee zodat de volgorde in één
 * oogopslag te zien is (herinnering vóór het vrijgeven vóór het vervallen):
 *
 *   HERINNERING_DAG   op welke dag een onbetaalde bestelling één herinnering met
 *                     een verse betaallink krijgt (was REMINDER_DAYS in de cron)
 *   VERVAL_DAG        na hoeveel dagen een gewone onbetaalde bestelling vervalt
 *                     (was ONBETAALD_VERVAL_DAGEN in de cron)
 *
 * De volgorde wordt hieronder bij het laden gecontroleerd, zoals assertLadder()
 * in pricing.js dat met de prijzen doet.
 */

export const VENSTER_VASTHOUDEN_DAGEN = 7;
export const BETALEN_NA_BTW_AKKOORD = 7;
export const HERINNERING_DAG = 3;
export const VERVAL_DAG = 14;

/* ── EEN ONTBREKENDE FOTO: ÉÉN APPJE, DAN MAKEN WAT ER IS — 8 oktober 2026 ──
 * Punt 2.05, V31-2 = c. Ontbreekt er een verplichte foto (een achterkant, een
 * detail), dan stuurt Lucas de klant één bericht met een vaste tekst vanuit
 * /admin; komt er na deze termijn geen antwoord, dan maakt de studio de beelden
 * met wat er is. De tekst in /admin noemt dit getal, niet een getypte "dag". */
export const FOTO_WACHT_DAGEN = 1;

const WOORD = {
  nl: ['nul', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf', 'dertien', 'veertien'],
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen'],
};

/** Een aantal dagen zoals het in een mail staat: "zeven", "seven"; boven de veertien als cijfer. */
export function inWoorden(n, lang = 'nl') {
  const lijst = WOORD[lang === 'en' ? 'en' : 'nl'];
  return Number.isInteger(n) && n >= 0 && n < lijst.length ? lijst[n] : String(n);
}

(function assertTermijnen() {
  for (const [naam, n] of Object.entries({ VENSTER_VASTHOUDEN_DAGEN, BETALEN_NA_BTW_AKKOORD, HERINNERING_DAG, VERVAL_DAG })) {
    if (!Number.isInteger(n) || n < 1) throw new Error(`termijnen.js: ${naam} moet een heel aantal dagen zijn, kreeg ${n}`);
  }
  /* De herinnering hoort vóór het vrijgeven van de datum te komen, anders krijgt
     de klant "betaal hier" over een datum die al weg is. */
  if (HERINNERING_DAG >= VENSTER_VASTHOUDEN_DAGEN) {
    throw new Error('termijnen.js: de herinnering komt niet vóór het vrijgeven van de leverdatum');
  }
  /* En het vervallen ná het vrijgeven: eerst verliest de klant zijn datum, pas
     later zijn bestelling. */
  if (VERVAL_DAG <= VENSTER_VASTHOUDEN_DAGEN) {
    throw new Error('termijnen.js: een bestelling vervalt vóórdat haar leverdatum is vrijgegeven');
  }
})();

/* ── TOESTEMMING INGETROKKEN: BINNEN EEN WEEK VAN SITE EN SOCIAL — 8 oktober 2026 ──
 * Punt 10.05, V30-2 = a. Trekt een klant zijn toestemming in om zijn beelden te
 * laten zien, dan haalt Lucas ze binnen deze termijn van de site en social. Het
 * toestemmingsblok (feedback.js) en /privacy noemen dit getal via termijnInWoorden(). */
export const TOESTEMMING_WEG_DAGEN = 7;

/** "een week" / "a week" bij zeven dagen, anders "drie dagen" / "three days". */
export function termijnInWoorden(n, lang = 'nl') {
  const en = lang === 'en';
  if (n === 7) return en ? 'a week' : 'een week';
  if (n === 1) return en ? 'a day' : 'een dag';
  return `${inWoorden(n, lang)} ${en ? 'days' : 'dagen'}`;
}

/* ── EEN PAUZE DUURT HOOGSTENS DRIE MAANDEN — 8 oktober 2026 (2.07, V42 = b) ──
 * Daarna gaat er één mail "hervatten of opzeggen?" (de nachttaak in cron/index.js,
 * pauzeVraag()). De abonnementspagina en de pauzemail noemen dit getal. Drie,
 * omdat credits ook drie maanden geldig blijven (CREDITS_GELDIG_MAANDEN): na
 * een langere pauze is er niets meer om voor terug te komen. */
export const PAUZE_MAX_MAANDEN = 3;

/* ── PORTRETRECHT: ANDERE BEELDEN BINNEN ONGEVEER TWEE WEKEN — 11 oktober 2026 ──
 * o22, Lucas' notitie in afvinklijst 2: *"dan zullen wij zo snel mogelijk
 * (meestal binnen 2 weken, ligt aan de hoeveelheid foto's/videos) alle beelden
 * waarin die persoon voorkomt vervangen voor een nieuw model op onze kosten."*
 * Een richttijd ("meestal"), geen harde termijn. /terms §5 noemt hem in woorden. */
export const PORTRET_VERVANGEN_WEKEN = 2;
