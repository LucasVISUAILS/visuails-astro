/**
 * ── DE AANHEF — 17 oktober 2026 (afvinklijst 33) ──────────────────────────────
 *
 * Lucas: *"Hoi vind ik wat cliché en kan wel iets netter. Wanneer het kan
 * Goedemorgen/Goedemiddag/Goedeavond "Naam" wanneer je de tijd van de klant kan
 * weten."* En: *"Kijk waar nog meer hoi gebruikt word, zoals op whatsapp."*
 *
 * WANNEER WE DE TIJD VAN DE KLANT KENNEN. Niet als we een mail versturen: een
 * mail die om zes uur 's avonds klaarstaat, leest hij misschien de volgende
 * ochtend, en "Goedenavond" bij het ontbijt leest als een sjabloon. Daarom raden
 * taaladviseurs een dagdeel in een mail af, en houden ze het voor chat, waar je
 * meteen leest. Wél als de klant nu bezig is:
 *   · een mail die hij zelf in gang zet (bestellen, betalen, aanmelden, iets
 *     wijzigen in Studio) — die opent hij binnen een paar minuten;
 *   · een WhatsApp die Lucas nu vanuit /admin stuurt.
 * Dan het dagdeel in de tijdzone van zijn land. Kennen we het land niet, of is
 * het daar nacht (00:00–04:59), dan de gewone aanhef.
 *
 * DE GEWONE AANHEF is "Hallo" / "Hello": een stap netter dan "Hoi" / "Hi", en
 * minder stijf dan "Beste" (dat bij een modemerk als een brief van de bank leest).
 * Dezelfde woorden staan in de berichten die een klant ons via WhatsApp stuurt
 * ("Hallo VISUAILS, …"). Eén plek, zodat een ander woord één regel is.
 *
 * Geen afhankelijkheden: dit draait in de Worker, in de cron en in de tests.
 */

export const AANHEF = { nl: 'Hallo', en: 'Hello' };
const DAGDELEN = {
  nl: ['Goedemorgen', 'Goedemiddag', 'Goedenavond'],
  en: ['Good morning', 'Good afternoon', 'Good evening'],
};

/* Landen met één tijdzone (de EU, het VK, Noorwegen, Zwitserland, IJsland).
   Landen met meer zones (de VS, Canada, Australië) staan er bewust niet in: daar
   weten we de tijd niet, dus geen dagdeel. */
const TIJDZONE = {
  NL: 'Europe/Amsterdam', BE: 'Europe/Brussels', LU: 'Europe/Luxembourg', DE: 'Europe/Berlin', FR: 'Europe/Paris',
  AT: 'Europe/Vienna', CH: 'Europe/Zurich', IT: 'Europe/Rome', ES: 'Europe/Madrid', PT: 'Europe/Lisbon',
  IE: 'Europe/Dublin', GB: 'Europe/London', UK: 'Europe/London', DK: 'Europe/Copenhagen', SE: 'Europe/Stockholm',
  NO: 'Europe/Oslo', FI: 'Europe/Helsinki', IS: 'Atlantic/Reykjavik', PL: 'Europe/Warsaw', CZ: 'Europe/Prague',
  SK: 'Europe/Bratislava', HU: 'Europe/Budapest', SI: 'Europe/Ljubljana', HR: 'Europe/Zagreb', RO: 'Europe/Bucharest',
  BG: 'Europe/Sofia', GR: 'Europe/Athens', CY: 'Asia/Nicosia', MT: 'Europe/Malta', EE: 'Europe/Tallinn',
  LV: 'Europe/Riga', LT: 'Europe/Vilnius', MC: 'Europe/Monaco', LI: 'Europe/Vaduz',
};

/** Het uur (0–23) in het land, of null als we de tijdzone niet kennen. */
export function uurIn(land, nu = new Date()) {
  const tz = TIJDZONE[String(land || '').trim().toUpperCase()];
  if (!tz) return null;
  try {
    const uur = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(nu);
    const n = Number(uur);
    return Number.isInteger(n) ? n : null;
  } catch {
    return null;
  }
}

/** 0 ochtend (05–11), 1 middag (12–17), 2 avond (18–23), of null (nacht, of onbekend). */
export function dagdeel(land, nu = new Date()) {
  const u = uurIn(land, nu);
  if (u === null || u < 5) return null;
  return u < 12 ? 0 : u < 18 ? 1 : 2;
}

/**
 * Het groetwoord: "Goedemiddag" als de klant nu leest en we zijn tijd kennen,
 * anders "Hallo". `nu` is het moment waarop hij leest (meestal new Date()), of
 * null als we dat niet weten.
 */
export function groetwoord(lang = 'nl', { nu = null, land = '' } = {}) {
  const taal = lang === 'en' ? 'en' : 'nl';
  /* Zonder land (een aanmelding voor de checklist vraagt er niet om) maar in het
     Nederlands: dan Nederland of België, en die hebben dezelfde tijd. */
  const waar = land || (taal === 'nl' ? 'NL' : '');
  const deel = nu ? dagdeel(waar, nu) : null;
  return deel === null ? AANHEF[taal] : DAGDELEN[taal][deel];
}

/** De aanhef als platte tekst, voor WhatsApp: "Goedemiddag Sanne," of "Hallo,". */
export function aanhefTekst(naam, lang = 'nl', opties = {}) {
  const woord = groetwoord(lang, opties);
  const n = String(naam || '').trim();
  return n ? `${woord} ${n},` : `${woord},`;
}
