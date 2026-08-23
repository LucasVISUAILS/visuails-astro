// VISUAILS — hoe lang een cookie leeft, op één plek. 23 augustus 2026.
//
// WAAROM DIT BESTAAT
// Het cookiebeleid is een pagina die zegt hoe lang wij iets bewaren, en die
// belofte stond nergens naast de code die het bewaart. Vier cookies, vier
// levensduren, en ze zaten in vier verschillende bestanden:
//
//   vis_account   ACCOUNT_SESSION_TTL_DAYS in src/lib/account.js  (niet ge-export)
//   vis_consent   MAX_AGE_DAYS in src/scripts/consent.js          (niet ge-export)
//   vis_lang      `365 * 86400`, ingetypt in src/lib/account.js
//   vis_nav       `365 * 86400`, ingetypt in src/lib/account.js
//
// en de pagina zelf typte "30 dagen" en drie keer "12 maanden" als tekst. Zes
// getallen voor vier feiten, waarvan er twee alleen bestonden als een
// vermenigvuldiging midden in een Set-Cookie-regel.
//
// DAT IS EEN ANDER SOORT FOUT DAN EEN PRIJS DIE UIT DE PAS LOOPT. Een verkeerde
// prijs merkt iemand. Een cookiebeleid dat 12 maanden belooft terwijl de cookie
// 24 maanden leeft, merkt niemand — tot een toezichthouder het naast elkaar legt,
// en dan is de tekst het bewijsstuk.
//
// WAAROM IN src/data/ EN NIET IN src/lib/
// Dit bestand wordt gelezen door drie kanten tegelijk: een browserscript
// (consent.js), een Cloudflare Worker (account.js) en twee Astro-pagina's die bij
// het bouwen draaien. src/data/ is de laag die dat mag — platte waarden, geen
// afhankelijkheden, geen bijwerkingen. account.js of consent.js importeren vanuit
// een pagina zou de halve backend of het halve browserscript de bouw in trekken.
//
// LET OP: DIT ZIJN GEEN BEWAARTERMIJNEN VAN KLANTGEGEVENS. Die staan in
// src/lib/retention.js (bronmateriaal, opgeleverd werk) en src/lib/token.js
// (de privélink). Een cookie op deze computer en een bestand op onze opslag zijn
// twee verschillende beloftes in twee verschillende paragrafen van twee
// verschillende documenten, en ze horen niet in één constante te vallen omdat ze
// toevallig allebei in dagen worden geteld.

/** vis_account — de ingelogde sessie in VISUAILS Studio. */
export const SESSION_COOKIE_DAYS = 30;

/**
 * vis_consent, vis_lang, vis_nav — de drie voorkeuren die een jaar meegaan.
 *
 * EEN JAAR EN NIET LANGER, en voor vis_consent is dat geen smaakkwestie: de
 * toestemming die dit cookie bewaart, is een uitspraak die iemand een keer heeft
 * gedaan. Toestemming die nooit verloopt, is toestemming die niemand zich nog
 * herinnert te hebben gegeven — zie de noot bovenaan src/scripts/consent.js.
 * De andere twee volgen dezelfde termijn omdat ze in hetzelfde rijtje op het
 * cookiebeleid staan en één afwijkende regel daar alleen maar vragen oproept.
 */
export const PREFERENCE_COOKIE_DAYS = 365;

/** Voor een Set-Cookie-regel: `Max-Age=${maxAge(PREFERENCE_COOKIE_DAYS)}`. */
export const maxAge = (dagen) => dagen * 86400;

/**
 * Dezelfde termijn als tekst, in de taal van de lezer.
 *
 * MAANDEN ALS HET NETJES DEELT, ANDERS DAGEN. 365 dagen leest als "12 maanden"
 * op een cookiebeleid en als "365 dagen" nergens; 30 dagen leest als "30 dagen"
 * en niet als "1 maand", want een maand is geen vaste lengte en een cookie wel.
 * De grens ligt op een jaar omdat dat de enige termijn is waarvoor de omrekening
 * exact genoeg is om op te schrijven.
 */
export function cookieDuur(dagen, lang = 'en') {
  const nl = lang === 'nl';
  if (dagen % 365 === 0) {
    const maanden = (dagen / 365) * 12;
    return nl ? `${maanden} maanden` : `${maanden} months`;
  }
  return nl ? `${dagen} dagen` : `${dagen} days`;
}
