// VISUAILS — hoe een naam en een adres uit losse velden weer één ding worden.
// 7 augustus 2026.
//
// WAAROM DIT EEN EIGEN BESTAND IS. Sinds migratie 0016 staan de voornaam, de
// achternaam en de vier adresregels apart in de database, en blijven `name` en
// `billing_address` bestaan als de samengestelde weergave — het adres zoals het
// op een factuur, in een mail of in het adminscherm terechtkomt. Dat samenstellen
// gebeurt op drie plekken: bij het bestellen (functions/api/order.js), bij het
// opslaan van je gegevens (src/lib/account.js) en waar admin een adres toont.
//
// Drie kopieën van "zet de postcode vóór de plaats" is drie kansen om ze anders
// te doen, en het verschil zie je pas op een factuur die de deur al uit is. Dus
// één bestand, en het doet verder niets: geen validatie, geen opmaak per land,
// geen HTML. Alleen samenvoegen.

/** Alles wat leeg is eruit, de rest met één scheidingsteken ertussen. */
function join(parts, sep) {
  return parts
    .map(function trim(v) { return String(v == null ? '' : v).trim(); })
    .filter(Boolean)
    .join(sep);
}

/**
 * Voornaam + achternaam → één naam.
 *
 * Geeft null terug als er niets is, en niet een lege string: `name` is nullable
 * en "" zou een ingevulde naam zijn die uit niets bestaat. Eén van de twee
 * ingevuld is ook een antwoord — mensen met één naam bestaan, en een formulier
 * dat daarop vastloopt is een formulier dat het mis heeft.
 */
export function composeName(first, last) {
  return join([first, last], ' ') || null;
}

/**
 * De adresregels → één blok, met regeleindes ertussen.
 *
 * DRIE REGELS, IN DE VOLGORDE DIE EEN ENVELOP AANHOUDT:
 *
 *   Vaarwerkhorst 17
 *   Unit B
 *   7531 HK Enschede
 *
 * Postcode en plaats staan op één regel omdat ze bij elkaar horen — dat is hoe
 * ze in heel Europa geschreven worden, en het is wat een klant terugleest als
 * "klopt". De provincie hangt aan diezelfde regel als hij er is; voor de VS en
 * Canada is dat "Austin, TX 78701" en dat is een vorm die dit met opzet NIET
 * nabootst, want zodra je per land gaat opmaken heb je een tabel met
 * uitzonderingen die niemand bijhoudt. Eén leesbare vorm voor iedereen.
 *
 * HET LAND STAAT ER NIET BIJ. Dat is een aparte kolom en een aparte beslissing
 * — de btw hangt eraan (zie src/data/vat.js) — en het hoort op een factuur op
 * zijn eigen regel, in de taal van de ontvanger. Wie het adres mét land wil,
 * plakt het er zelf onder; die keuze hoort bij de weergave en niet hier.
 *
 * @returns {string|null} null als er niets ingevuld is.
 */
export function composeAddress({ line1, line2, postal, city, region } = {}) {
  const place = join([join([postal, city], ' '), region], ', ');
  return join([line1, line2, place], '\n') || null;
}

/** De vijf adresvelden zoals ze in een formulier en in de database heten. */
export const ADDRESS_FIELDS = ['address_line1', 'address_line2', 'postal_code', 'city', 'region'];

/**
 * De formuliernamen → de vorm die composeAddress() wil.
 *
 * Het formulier gebruikt dezelfde namen als de kolommen, zodat er nergens een
 * vertaaltabel tussen zit die kan gaan afwijken. Deze functie is er alleen
 * omdat composeAddress() korte namen leest en dat prettiger schrijft dan
 * `postal_code` vijf keer.
 */
export function addressFromFields(get) {
  return {
    line1: get('address_line1'),
    line2: get('address_line2'),
    postal: get('postal_code'),
    city: get('city'),
    region: get('region'),
  };
}
