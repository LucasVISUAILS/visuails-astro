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

/* ── GEEN COOKIE, WEL IN DE BROWSER — 8 oktober 2026 (o12) ────────────────────
 *
 * Het cookiebeleid zegt "dit is de complete lijst", en dat klopte voor cookies.
 * Wat er niet stond: de kleine notities die de site in de eigen opslag van de
 * browser legt in plaats van in een cookie. Die worden niet naar ons gestuurd,
 * maar staan wel op het apparaat van de bezoeker, en de Telecommunicatiewet
 * (art. 11.7a) kijkt naar opslaan op het apparaat, niet naar het woord "cookie".
 *
 * Hier stond PROEFKAART_DICHT_DAGEN (7): hoe lang de gesloten proefkaart
 * wegbleef (`vis_proef_dicht` in localStorage). De proefkaart is weg sinds
 * 8 oktober 2026 (1.06), en daarmee die notitie; het cookiebeleid noemt hem niet
 * meer. Alle overgebleven notities leven niet langer dan een tabblad — behalve,
 * sinds 11 oktober 2026, de bestelling waar je mee bezig was (hieronder). */

/* ── DE BESTELLING WAAR JE MEE BEZIG WAS — 11 oktober 2026 (F3, punt 1.04) ─────
 *
 * Lucas koos (V51 = a): het bestelformulier onthoudt op het apparaat van de
 * klant de look, het aantal, de opties en de al geüploade foto's — van die
 * foto's alleen de sleutels, niet de bestanden — en NIET naam, e-mail, telefoon
 * of adres. Dit is de enige notitie die langer blijft dan een tabblad, want het
 * geval waar hij voor is, is de klant die naar zijn camera of WhatsApp gaat en
 * in een nieuw tabblad terugkomt.
 *
 * localStorage, geen cookie: hij gaat nooit mee naar de server. Het cookiebeleid
 * noemt hem onder "In je browser bewaard, niet als cookie".
 *
 * ZES DAGEN, en dat is geen ronde gok: de nachtelijke opruiming in cron/index.js
 * haalt een batch weg die zeven dagen niet aan een bestelling hangt
 * (INTAKE_TTL_DAYS). Een concept dat langer bleef staan, zou foto's beloven die
 * er niet meer zijn. Het formulier controleert bij terugkomst toch nog of ze er
 * staan (GET /api/upload?batch=…). Na een geplaatste bestelling of "Opnieuw
 * beginnen" wordt hij gewist. */
export const CONCEPT_SLEUTEL = 'vis-bestelling';
export const CONCEPT_DAGEN = 6;

/* ── DE MELDING ONDERIN HET SCHERM — 14 oktober 2026 ──────────────────────────
 *
 * Lucas, 11:14: de welkomstregel liever "als pop up onderaan je scherm die daar
 * blijft tot je hem wegklikt", en voor nieuwe bedrijven een proef-pop-up. 11:15:
 * "Wanneer de bezoeker hem wegklikt blijft hij weg voor een tijdje (bedenk
 * hoelang dit moet zijn)."
 *
 * Eén notitie in localStorage (KlantMelding.astro, interactions.js), en alleen
 * als je op het kruisje klikt:
 *   s   de bestelling en haar stand die je wegklikte ("VIS-2041|Geleverd, …").
 *       De melding komt pas terug als er iets aan verandert: een andere
 *       bestelling bovenaan, of dezelfde in een volgende stap.
 *   p   tot wanneer de proef-pop-up wegblijft (een tijdstempel).
 *
 * DERTIG DAGEN voor de proef. Wie hem wegklikt, zegt "nu niet", en het aanbod
 * staat daarna nog steeds op de pagina zelf: het proefblok, en "Probeer
 * VISUAILS · €1" op elke lookkaart. De pop-up hoeft dus niet snel terug. Na
 * een maand is het een nieuw bezoek, en dan mag hij één keer opnieuw. De oude
 * proefkaart (tot 8 oktober) bleef zeven dagen weg: wie elke week even kijkt,
 * kreeg hem elke week opnieuw.
 *
 * localStorage en geen cookie: hij gaat nooit mee naar de server. Het
 * cookiebeleid noemt hem onder "In je browser bewaard, niet als cookie". */
export const MELDING_SLEUTEL = 'vis-melding';
export const PROEF_WEG_DAGEN = 30;
