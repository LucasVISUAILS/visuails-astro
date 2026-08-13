// VISUAILS — alleen zakelijk, en het bewijs dat daarbij hoort.
//
// ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
//
// Lucas, 12 augustus 2026, gevraagd of consumenten uitgesloten moeten worden:
// *"Uitsluiten maar wat als iemand geen KVK heeft omdat diegene uit het
// buitenland komt. Hier moet wel echt iets op bedacht worden."* En op de vraag
// hoe hard: *"Hard in de EU, verklaring wereldwijd."*
//
// Dat is precies de juiste tweedeling, en de reden ervoor is dat een KVK-nummer
// géén juridisch criterium is. De toets staat in art. 6:230g lid 1 sub a BW: een
// consument is *een natuurlijk persoon die niet handelt in de uitoefening van
// zijn beroep of bedrijf*. Een KVK-nummer is BEWIJS voor die toets, geen
// vervanging ervan — en het bestaat alleen in Nederland. Een Duits bedrijf heeft
// een Handelsregisternummer, een Amerikaans bedrijf een EIN, een Braziliaans
// bedrijf een CNPJ, en een Britse freelancer soms helemaal niets.
//
// Een formulier dat een KVK-nummer eist, sluit dus niet consumenten uit maar
// buitenlanders. Dat is de fout die deze module voorkomt.
//
// ── DE OPBOUW: ÉÉN VERKLARING, DRIE SOORTEN BEWIJS ──────────────────────────
//
// DE VERKLARING is het dragende element en geldt overal, zonder uitzondering.
// Die verklaring is wat de uitzondering van art. 6:230g in werking zet: de klant
// zegt zelf dat hij handelt voor zijn bedrijf. Blijkt dat onwaar, dan is dat
// een onjuiste verklaring van de klant en niet een verzuim van VISUAILS — en dat
// is het enige verschil dat bij een geschil telt. Ze is versioneerd, om dezelfde
// reden als de herroepingsverklaring in src/data/consent.js: het bewijs is niet
// "er is een vinkje gezet", het is "er is een vinkje gezet bij DEZE tekst".
//
// HET BEWIJS is corroboratie en verschilt per land:
//
//   NL      een KVK-nummer. Acht cijfers, en iedere Nederlandse onderneming
//           heeft er een — ook een eenmanszaak die geen btw-nummer opgeeft. Dat
//           laatste is precies waarom het btw-veld hier niet volstaat: een
//           Nederlandse eenmanszaak laat dat routineus leeg (zie de noot in
//           src/data/consent.js) en is toch een onderneming.
//
//   EU      het btw-nummer, en dat bewijs bestaat al: functions/api/order.js
//           legt het bij VIES voor en bewaart het antwoord. Een bij VIES
//           bevestigd nummer is het hardste bewijs op deze hele lijst, want het
//           komt van een overheid en niet van de klant.
//
//   BUITEN  een registratienummer in vrije vorm. Wij kunnen het niet
//           controleren en doen dus ook niet alsof: het wordt vastgelegd zoals
//           het is aangeleverd. De verklaring doet hier het werk.
//
// ── WAT DIT NIET DOET: DE BESTELLING WEIGEREN ───────────────────────────────
//
// functions/api/order.js heeft één staande regel die belangrijker is dan deze
// module: nooit een bestelling verliezen om een secundaire stap te beschermen.
// Ontbreekt het bewijs, dan komt de bestelling dus op de beoordelingslijst — bij
// dezelfde poort die een onbevestigd btw-nummer tegenhoudt — en niet in de
// prullenbak. "Hard in de EU" betekent dat er niet zonder bewijs geproduceerd en
// gefactureerd wordt; het betekent niet dat een klant die één veld vergeet zijn
// briefing kwijt is.
//
// GEEN JURIDISCH ADVIES. De teksten hieronder zijn geschreven vanaf de wettelijke
// toets, en ze verdienen één blik van iemand die daarvoor is opgeleid voordat ze
// in een geschil gewicht moeten dragen. Dezelfde noot staat in consent.js, en om
// dezelfde reden: wie deze woorden hierna aanpast, hoort dit te lezen.

import { isEu, HOME_COUNTRY } from './vat.js';

/** De versie die op de bestelling wordt vastgelegd. Voeg toe; wijzig nooit. */
export const BUSINESS_VERSION = 'business-v1-2026-08';

export const BUSINESS_TEXT = {
  'business-v1-2026-08': {
    en: 'I am ordering on behalf of a business or profession, and not as a consumer. '
      + 'VISUAILS supplies businesses only.',
    nl: 'Ik bestel voor mijn bedrijf of beroep en niet als particulier. VISUAILS '
      + 'levert uitsluitend zakelijk.',
  },
};

/** De tekst bij een vastgelegde versie, of null als we die niet meer kennen. */
export function businessText(version, lang = 'en') {
  const entry = BUSINESS_TEXT[version];
  return entry ? entry[lang === 'nl' ? 'nl' : 'en'] : null;
}

/** Wat het formulier vandaag laat zien. */
export function currentBusiness(lang = 'en') {
  return businessText(BUSINESS_VERSION, lang);
}

/** De drie soorten bewijs, als constanten in plaats van losse tekst per plek. */
export const REG_KIND = {
  kvk: 'kvk',
  euVat: 'eu-vat',
  other: 'other',
};

/**
 * Welk bewijs hoort bij dit land?
 *
 * Een onbekend of leeg land valt op `other` en niet op `kvk`. Dat is de veilige
 * kant: `kvk` is de strengste eis, en die op iemand leggen van wie we het land
 * niet kennen levert een klant op die niets kan invullen wat wij goedkeuren.
 */
export function regKindFor(country) {
  const up = String(country || '').trim().toUpperCase();
  if (up === HOME_COUNTRY) return REG_KIND.kvk;
  if (up && isEu(up)) return REG_KIND.euVat;
  return REG_KIND.other;
}

/** Acht cijfers, en niets anders. Punten en spaties mogen erin staan. */
export function normaliseKvk(raw) {
  return String(raw || '').replace(/[^\d]/g, '');
}

/** Is dit de vorm van een KVK-nummer? Bestaat-het is een andere vraag. */
export function looksLikeKvk(raw) {
  return /^\d{8}$/.test(normaliseKvk(raw));
}

/**
 * Handelt deze klant zakelijk, voor zover wij dat kunnen vaststellen?
 *
 * Geeft altijd een antwoord met redenen erbij, want de aanroeper schrijft die
 * redenen in `orders.review_reason` en dat is wat er straks op /admin staat. Een
 * boolean zou de studio laten raden waaróm iets ter beoordeling ligt.
 *
 * `declared` is apart van het bewijs en wordt ook apart geteld: een klant die het
 * vinkje niet zette maar een geldig KVK-nummer opgaf, is een ander geval dan een
 * klant die alleen het vinkje zette. Het eerste is een formulier dat niet is
 * afgemaakt, het tweede is de wereldwijde ondergrens.
 */
export function businessCheck({
  country, vat, viesValid, noVat, regNumber, kvk, declared,
} = {}) {
  const kind = regKindFor(country);
  const reasons = [];

  const heeftVat = String(vat || '').trim() !== '';
  const heeftReg = String(regNumber || '').trim() !== '';
  const kvkOk = looksLikeKvk(kvk || regNumber);

  let bewijs = false;
  if (kind === REG_KIND.kvk) {
    // Nederland. Een KVK-nummer, of een btw-nummer — dat laatste bevat het
    // KVK-nummer niet maar bewijst wel een onderneming. Beide leeg is de
    // situatie waar deze hele module over gaat.
    bewijs = kvkOk || heeftVat;
    if (!bewijs) reasons.push('geen KVK-nummer en geen btw-nummer bij een Nederlandse klant');
    else if (!kvkOk && heeftVat) reasons.push('Nederlandse klant zonder KVK-nummer, wel een btw-nummer');
  } else if (kind === REG_KIND.euVat) {
    // De rest van de EU. Bij VIES bevestigd is het hardste bewijs dat er is;
    // een nummer dat niet bevestigd kon worden is nog steeds bewijs van een
    // poging, maar niet genoeg om zonder beoordeling door te laten.
    if (viesValid === true) bewijs = true;
    else if (heeftVat) reasons.push('btw-nummer opgegeven maar niet bij VIES bevestigd');
    else if (heeftReg) reasons.push('EU-klant zonder btw-nummer, wel een registratienummer');
    else reasons.push('EU-klant zonder btw-nummer en zonder registratienummer');
    // EN HIER STOPT HET, ook als er een registratienummer staat. Dat is wat "hard
    // in de EU" betekent: binnen de EU is er één bewijs dat wij kunnen navragen en
    // dat is VIES. Een Duits Handelsregisternummer in een tekstveld is een bewering
    // en niet een controle, en die bewering staat al in de verklaring. De
    // bestelling gaat dus naar de beoordelingslijst en niet verloren.
  } else {
    // Buiten de EU. Wij kunnen niets controleren, dus is het registratienummer
    // vastlegging en geen verificatie. Zonder nummer draagt de verklaring alles.
    bewijs = heeftReg;
    if (!heeftReg) reasons.push('klant buiten de EU zonder registratienummer');
  }

  if (!declared) reasons.push('de zakelijke verklaring is niet aangevinkt');

  // `noVat` alleen is geen reden: het vinkje betekent "ik heb er geen", en dat
  // is een geldig antwoord voor een eenmanszaak en voor iedereen buiten de EU.
  // Het staat hier omdat het WEL uitmaakt of er dan iets anders is ingevuld.
  if (noVat && !heeftReg && !kvkOk) {
    reasons.push('geen btw-nummer en geen registratienummer');
  }

  return {
    kind,
    declared: !!declared,
    evidence: bewijs,
    // Zakelijk voor zover wij het kunnen vaststellen: verklaring EN bewijs. De
    // verklaring alleen is de wereldwijde ondergrens en genoeg om te leveren,
    // maar niet genoeg om ongezien door te laten.
    ok: !!declared && bewijs,
    reasons: [...new Set(reasons)],
  };
}
