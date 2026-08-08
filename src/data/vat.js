// VISUAILS — welke btw er op een bestelling hoort, en waarom. Augustus 2026.
//
// WAAROM DIT BESTAAT. Lucas: *"Ik zit nu ook te denken want als ik afreken bij
// een bedrijf en ik vul mijn btwnummer in dan word mijn btw automatisch
// verlegd en betaal ik daar 0% over. Is het niet handig om dat te doen?"*
//
// Ja — maar niet zoals de vraag hem stelt, en het verschil kost geld. Wat
// hieronder staat is nagezocht bij de Belastingdienst en de Europese Commissie,
// niet uit het hoofd opgeschreven; de bronnen staan per regel erbij.
//
// ── DE DRIE GEVALLEN ─────────────────────────────────────────────────────────
//
//   1 · NEDERLANDSE KLANT → 21%, ALTIJD, ook mét een geldig btw-nummer.
//       De binnenlandse verleggingsregeling is een GESLOTEN LIJST — onderaanneming
//       in de bouw, schoonmaak, oud metaal, mobiele telefoons, onroerend goed,
//       goud, emissierechten — en creatieve of digitale diensten staan er niet
//       op. Dit is de dure valkuil: een checkout die verlegt zodra er een
//       btw-nummer staat, verliest 21% op élke Nederlandse zakelijke bestelling,
//       en de Belastingdienst haalt dat bij VISUAILS op, niet bij de klant.
//       ↳ belastingdienst.nl — "Wanneer btw verleggen", gewijzigd 29-09-2025.
//
//   2 · ZAKELIJKE KLANT IN EEN ANDER EU-LAND, met een btw-nummer dat VIES
//       geldig noemt → 0%, met "btw verlegd" op de factuur, beide btw-nummers
//       erop, en het bedrag per tarief alsof er niet verlegd was.
//       Plaats van dienst: artikel 44 btw-richtlijn. Wie de btw verschuldigd
//       is: artikel 196. En elke zo verlegde dienst moet op de opgaaf ICP en
//       aansluiten op rubriek 3b van de aangifte.
//
//   3 · KLANT BUITEN DE EU → 0%, maar dit is NIET "btw verlegd". De dienst is
//       eenvoudig niet belastbaar in Nederland. Andere factuurtekst, géén
//       rubriek 3b, géén ICP-regel. Zet je daar toch "verlegd" neer, dan maak
//       je ICP-regels zonder tegenpartij, en dat is precies het soort mismatch
//       waar een controle mee begint.
//
// ── EN EEN NUMMER INVULLEN IS NIET GENOEG ────────────────────────────────────
// De Belastingdienst is expliciet: controleer je het niet en blijkt het
// ongeldig, dan krijg jij de naheffingsaanslag plus boete. De bescherming zit
// in artikel 18(1)(a) van Uitvoeringsverordening 282/2011, en die geldt alleen
// als het nummer via VIES is bevestigd. Zie src/lib/vies.js.
//
// ── WAT HIER NIET STAAT ──────────────────────────────────────────────────────
// Geen tarieven van andere landen. VISUAILS levert B2B-diensten, dus er is maar
// één tarief dat ooit wordt gerekend — het Nederlandse — en verder nul. Een
// tabel met 27 tarieven zou 27 dingen zijn die kunnen verouderen zonder dat
// iemand het merkt.

/** Het land waar VISUAILS gevestigd is. Alles draait om "is de klant hier of
 *  niet", dus dat staat als constante en niet als losse vergelijking. */
export const HOME_COUNTRY = 'NL';

/**
 * De 27 EU-lidstaten, met de naam in beide talen.
 *
 * GRIEKENLAND HEEFT TWEE CODES en dat is geen typefout: het land is `GR` in
 * ISO 3166 en `EL` in het btw-systeem. VIES verwacht `EL`. De lijst hieronder
 * gebruikt de ISO-code als id, en `vies` zegt welke code naar VIES gaat.
 *
 * NOORD-IERLAND (`XI`) staat er BEWUST NIET BIJ. Dat nummer bestaat wel in
 * VIES, maar het Noord-Ierlandprotocol dekt goederen en geen diensten — voor
 * wat VISUAILS levert is een XI-klant dus een klant buiten de EU. Dit is het
 * ene punt in dit bestand dat ik niet hard bevestigd heb gekregen bij de
 * Belastingdienst; laat het door de boekhouder bevestigen voordat er een
 * factuur van die soort uitgaat.
 */
export const EU_COUNTRIES = [
  { id: 'AT', vies: 'AT', en: 'Austria', nl: 'Oostenrijk' },
  { id: 'BE', vies: 'BE', en: 'Belgium', nl: 'België' },
  { id: 'BG', vies: 'BG', en: 'Bulgaria', nl: 'Bulgarije' },
  { id: 'HR', vies: 'HR', en: 'Croatia', nl: 'Kroatië' },
  { id: 'CY', vies: 'CY', en: 'Cyprus', nl: 'Cyprus' },
  { id: 'CZ', vies: 'CZ', en: 'Czechia', nl: 'Tsjechië' },
  { id: 'DK', vies: 'DK', en: 'Denmark', nl: 'Denemarken' },
  { id: 'EE', vies: 'EE', en: 'Estonia', nl: 'Estland' },
  { id: 'FI', vies: 'FI', en: 'Finland', nl: 'Finland' },
  { id: 'FR', vies: 'FR', en: 'France', nl: 'Frankrijk' },
  { id: 'DE', vies: 'DE', en: 'Germany', nl: 'Duitsland' },
  { id: 'GR', vies: 'EL', en: 'Greece', nl: 'Griekenland' },
  { id: 'HU', vies: 'HU', en: 'Hungary', nl: 'Hongarije' },
  { id: 'IE', vies: 'IE', en: 'Ireland', nl: 'Ierland' },
  { id: 'IT', vies: 'IT', en: 'Italy', nl: 'Italië' },
  { id: 'LV', vies: 'LV', en: 'Latvia', nl: 'Letland' },
  { id: 'LT', vies: 'LT', en: 'Lithuania', nl: 'Litouwen' },
  { id: 'LU', vies: 'LU', en: 'Luxembourg', nl: 'Luxemburg' },
  { id: 'MT', vies: 'MT', en: 'Malta', nl: 'Malta' },
  { id: 'NL', vies: 'NL', en: 'Netherlands', nl: 'Nederland' },
  { id: 'PL', vies: 'PL', en: 'Poland', nl: 'Polen' },
  { id: 'PT', vies: 'PT', en: 'Portugal', nl: 'Portugal' },
  { id: 'RO', vies: 'RO', en: 'Romania', nl: 'Roemenië' },
  { id: 'SK', vies: 'SK', en: 'Slovakia', nl: 'Slowakije' },
  { id: 'SI', vies: 'SI', en: 'Slovenia', nl: 'Slovenië' },
  { id: 'ES', vies: 'ES', en: 'Spain', nl: 'Spanje' },
  { id: 'SE', vies: 'SE', en: 'Sweden', nl: 'Zweden' },
];

/**
 * The countries the form offers outside the EU.
 *
 * NOT a complete world list, and deliberately so. A select with 200 entries is
 * a select nobody scrolls, and every one of them would be a country whose
 * business-status evidence rules nobody here has read. These are the ones a
 * clothing brand buying from a Dutch studio plausibly sits in; anything else
 * picks "Elsewhere", which routes to the same outside-the-EU treatment and
 * flags the order for a human to look at.
 */
export const OTHER_COUNTRIES = [
  { id: 'GB', en: 'United Kingdom', nl: 'Verenigd Koninkrijk' },
  { id: 'CH', en: 'Switzerland', nl: 'Zwitserland' },
  { id: 'NO', en: 'Norway', nl: 'Noorwegen' },
  { id: 'US', en: 'United States', nl: 'Verenigde Staten' },
  { id: 'CA', en: 'Canada', nl: 'Canada' },
  { id: 'AU', en: 'Australia', nl: 'Australië' },
  { id: 'XX', en: 'Elsewhere', nl: 'Ergens anders' },
];

const EU_IDS = new Set(EU_COUNTRIES.map(function id(c) { return c.id; }));

/** Is this ISO country code an EU member state? */
export function isEu(code) {
  return EU_IDS.has(String(code || '').trim().toUpperCase());
}

/** The code VIES wants for this country — `EL` for Greece, the ISO code
 *  otherwise. Returns null for anything that is not an EU member state, which
 *  is also the answer to "should I call VIES at all". */
export function viesCode(code) {
  const up = String(code || '').trim().toUpperCase();
  const hit = EU_COUNTRIES.filter(function match(c) { return c.id === up; })[0];
  return hit ? hit.vies : null;
}

/** Every country the form offers, in the order it offers them, with the label
 *  for one language. Netherlands first because it is most of the orders and a
 *  select that opens on the common answer saves everyone a scroll. */
export function countryOptions(lang) {
  const key = lang === 'nl' ? 'nl' : 'en';
  const home = EU_COUNTRIES.filter(function isHome(c) { return c.id === HOME_COUNTRY; });
  const restEu = EU_COUNTRIES
    .filter(function notHome(c) { return c.id !== HOME_COUNTRY; })
    .sort(function byName(a, b) { return a[key].localeCompare(b[key], key); });
  const other = OTHER_COUNTRIES.slice();
  return {
    home: home.map(function label(c) { return { id: c.id, name: c[key] }; }),
    eu: restEu.map(function label(c) { return { id: c.id, name: c[key] }; }),
    other: other.map(function label(c) { return { id: c.id, name: c[key] }; }),
  };
}

/**
 * NORMALISE A VAT NUMBER before anything looks at it.
 *
 * Uppercase, and every space, dot and hyphen removed — people type
 * "NL 0054 07575 B96" and VIES will simply say no. The country prefix is
 * stripped here rather than kept, because the REST call takes the country and
 * the number as two separate path segments, and a caller that passes
 * "NL005407575B96" as the number half gets a false invalid.
 *
 * Returns `{ country, number }`. `country` is null when the string carried no
 * two-letter prefix, which is fine: the form's country field is what decides,
 * and the prefix is only a cross-check.
 */
export function normaliseVat(raw) {
  const clean = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return { country: null, number: '' };
  const m = clean.match(/^([A-Z]{2})(.+)$/);
  if (m) return { country: m[1], number: m[2] };
  return { country: null, number: clean };
}

/** The three treatments, as constants rather than strings typed at each site.
 *  These values go into `orders.vat_treatment` and must not change without a
 *  migration — the rows already written mean what they say. */
export const VAT_TREATMENT = {
  /** Dutch customer, or anyone we could not confirm as a foreign business. */
  standard: 'nl_standard',
  /** EU business outside NL with a VIES-valid number. Article 196. */
  reverseCharge: 'eu_reverse_charge',
  /** Customer outside the EU. Not taxable in the Netherlands at all. */
  outsideScope: 'outside_scope',
};

/**
 * THE DECISION. One function, and every surface calls it — the API, the tests,
 * and eventually the invoice. A second copy of this rule anywhere is how the
 * checkout and the invoice end up disagreeing about the same order.
 *
 * @param {object} o
 * @param {string} o.country  ISO code from the form's country field.
 * @param {boolean} o.vatValid  Did VIES confirm the number? Nothing else counts
 *   — not "the customer typed something", not "it looks like a VAT number".
 * @returns {{ treatment: string, rate: number, reason: string }}
 *
 * FAILS CLOSED, ON PURPOSE. Every path that is not provably 0% returns 21%.
 * VIES down, VIES slow, a number that came back invalid, a country we do not
 * recognise — all of them charge Dutch VAT. Charging 21% where 0% was due
 * costs the customer a correction; charging 0% where 21% was due costs
 * VISUAILS the 21%.
 */
export function vatDecision({ country, vatValid }) {
  const up = String(country || '').trim().toUpperCase();

  // 1 · Home. The closed-list rule: no domestic reverse charge for this trade,
  //     whatever the customer typed in the VAT box.
  if (!up || up === HOME_COUNTRY) {
    return { treatment: VAT_TREATMENT.standard, rate: 0.21, reason: up ? 'domestic' : 'no-country' };
  }

  // 2 · Outside the EU. No Dutch VAT, and no reverse charge either.
  if (!isEu(up)) {
    return { treatment: VAT_TREATMENT.outsideScope, rate: 0, reason: 'non-eu' };
  }

  // 3 · EU, but only with a confirmed number.
  if (vatValid === true) {
    return { treatment: VAT_TREATMENT.reverseCharge, rate: 0, reason: 'vies-valid' };
  }
  return { treatment: VAT_TREATMENT.standard, rate: 0.21, reason: 'eu-unconfirmed' };
}

/**
 * The line that has to appear on the invoice and in the confirmation mail.
 *
 * "Btw verlegd" and "niet belastbaar in Nederland" are not two ways of saying
 * the same thing — see the header. Returning null for the standard case is
 * deliberate: a normal Dutch invoice needs no extra sentence, and printing one
 * anyway would invite the reader to look for a rule that is not being applied.
 */
export function vatStatement(treatment, lang) {
  const nl = lang === 'nl';
  if (treatment === VAT_TREATMENT.reverseCharge) {
    return nl
      ? 'Btw verlegd — artikel 196 richtlijn 2006/112/EG'
      : 'VAT reverse charged — Article 196 Directive 2006/112/EC';
  }
  if (treatment === VAT_TREATMENT.outsideScope) {
    return nl
      ? 'Niet belastbaar in Nederland — de dienst is belast in het land van de afnemer'
      : 'Outside the scope of Dutch VAT — the place of supply is the customer’s country';
  }
  return null;
}

/** A short version of the same thing for the checkout and the mail, where the
 *  article reference is noise. */
export function vatShort(treatment, lang) {
  const nl = lang === 'nl';
  if (treatment === VAT_TREATMENT.reverseCharge) return nl ? 'Btw verlegd' : 'Reverse charge';
  if (treatment === VAT_TREATMENT.outsideScope) return nl ? 'Geen Nederlandse btw' : 'No Dutch VAT';
  return nl ? '21% btw' : '21% VAT';
}

/**
 * Does this order have to go on the opgaaf ICP?
 *
 * Only the intra-EU reverse charge does. Non-EU is not an intra-community
 * supply and putting it on the ICP creates a line with no counterparty in the
 * other member state's system — which is the mismatch, not the fix.
 */
export function needsIcp(treatment) {
  return treatment === VAT_TREATMENT.reverseCharge;
}

// ─────────────────────────────────────────────────────────────────────────────
// DE POORT — mag deze bestelling betaald worden, en moet er iemand naar kijken?
//
// Augustus 2026, uit `btwverleggingspecificatie.md`. Dit is met opzet een TWEEDE
// functie naast vatDecision(), want ze beantwoorden verschillende vragen:
//
//   vatDecision()  — welk tarief geldt hier? Dat is belastingrecht. Het antwoord
//                    volgt uit het land en uit VIES, en is niet onderhandelbaar.
//   vatGate()      — is deze claim geloofwaardig? Dat is fraudebeheersing. Het
//                    antwoord hangt af van wat we kunnen verifiëren, en van wat
//                    de klant zelf heeft verklaard.
//
// Ze door elkaar halen is hoe je een tarief krijgt dat van een vinkje afhangt.
// Het tarief hangt nooit van een vinkje af. Wat van het vinkje afhangt is of we
// de bestelling meteen laten betalen of eerst zelf bekijken.
//
// ── WAAROM DE SPECIFICATIE HIER ÉÉN STAP TE VER GAAT ────────────────────────
//
// §3 zegt voor een niet-EU-land: `return GEEN_BTW_BEREKENING_NU`. Dat is niet
// nodig en niet wenselijk. Het tarief buiten de EU is 0% op grond van artikel 44
// — plaats van dienst is het land van de afnemer — en dat staat vast zodra het
// land bekend is. Er is niets te berekenen ná de beoordeling wat er nu niet al
// uit komt. Wat de beoordeling werkelijk tegenhoudt is iets anders: een
// Nederlandse klant die "Verenigde Staten" aanwijst om 21% te ontlopen. Daar
// bestaat geen API voor, dus daar kijkt een mens naar.
//
// Dus: het tarief wordt gewoon berekend en opgeslagen, de factuur kan meteen
// kloppen, en wat wacht is de betaling. Dat is één ding minder dat later nog
// moet gebeuren, en de order is compleet als hij wordt goedgekeurd.
// ─────────────────────────────────────────────────────────────────────────────

/** De toestanden van `orders.review_state`. Zie migratie 0018. */
export const REVIEW = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  expired: 'expired',
};

/** Hoelang de klant op een antwoord hoeft te wachten, en hoelang hij daarna
 *  heeft om te betalen. Uit §7 van de specificatie. */
export const REVIEW_HOURS = 24;
export const PAYMENT_DAYS = 7;

/**
 * @param {object} o
 * @param {string}  o.country     ISO-code uit het formulier.
 * @param {string}  o.treatment   De uitkomst van vatDecision().
 * @param {boolean|null} o.vatValid  true/false van VIES, of null als de controle
 *   niet is gelukt. Let op het verschil: false is "VIES zei nee", null is "we
 *   weten het niet". Voor het tarief maakt dat niets uit, voor de vlag alles.
 * @param {string=} o.vatError    'timeout' | 'network' | 'unavailable' | ''
 * @param {boolean=} o.confirmed  Heeft de klant het vinkje aangezet?
 * @param {boolean=} o.hadNumber  Heeft de klant een btw-nummer ingevuld?
 * @returns {{ needsReview: boolean, payableNow: boolean, reasons: string[] }}
 *
 * `reasons` is voor een mens, niet voor code. Er wordt nooit op gematcht.
 */
export function vatGate({ country, treatment, vatValid, vatError, confirmed, hadNumber }) {
  const up = String(country || '').trim().toUpperCase();
  const reasons = [];
  let payableNow = true;

  // 1 · Buiten de EU. Er is geen register waarin we dit kunnen nakijken — VIES
  //     dekt alleen lidstaten — dus is dit de enige claim op de site die
  //     helemaal op het woord van de klant rust. En hij is 21% waard.
  if (up && up !== HOME_COUNTRY && !isEu(up)) {
    reasons.push('niet-EU: 0% rust alleen op wat de klant zelf opgeeft');
    payableNow = false;
  }

  // 2 · Een EU-nummer dat we niet hebben kúnnen controleren. Het tarief is al
  //     21% (fail-closed), dus hier gaat geen geld verloren — maar de klant
  //     krijgt een rekening met btw die hij misschien niet verwachtte, en dat
  //     wil je weten voordat hij mailt.
  if (vatValid === null && hadNumber && up && up !== HOME_COUNTRY && isEu(up)) {
    reasons.push(`VIES gaf geen antwoord (${vatError || 'onbekend'}) — 21% gerekend op een nummer dat misschien klopt`);
  }

  // 3 · Een EU-nummer dat VIES afkeurde. Zelfde bedrag, andere oorzaak: hier
  //     heeft de klant iets verkeerd ingevuld, en één mailtje lost het op.
  if (vatValid === false && hadNumber) {
    reasons.push('VIES keurde het btw-nummer af — 21% gerekend');
  }

  // 4 · Verlegging zonder verklaring van de klant. Dit hoort niet te kunnen: het
  //     formulier eist het vinkje voordat het 0% aanbiedt. Komt het toch voor,
  //     dan is er langs het formulier heen gepost, en dan is 0% niet te
  //     verdedigen tegenover de Belastingdienst.
  if (treatment === VAT_TREATMENT.reverseCharge && confirmed !== true) {
    reasons.push('0% verlegd zonder de bevestiging van de klant — niet via het formulier ingediend');
    payableNow = false;
  }

  return { needsReview: reasons.length > 0, payableNow, reasons };
}

/**
 * Klopt het betaalmiddel met de claim?
 *
 * iDEAL is een Nederlands systeem: je hebt er een rekening bij een Nederlandse
 * bank voor nodig. Betaalt iemand met iDEAL terwijl hij zegt een Duits bedrijf
 * te zijn, dan is dat geen bewijs van fraude — een Nederlander kan de directeur
 * van een Duitse GmbH zijn — maar het is wel het soort samenloop dat je één keer
 * zelf wil zien.
 *
 * DIT KAN ALLEEN ACHTERAF. Het betaalmiddel wordt gekozen op de betaalpagina van
 * Mollie, ná het aanmaken van de betaling, dus ná het vaststellen van het
 * tarief. De specificatie plaatst deze controle vóór het tarief; dat moment
 * bestaat niet. Zie ook src/lib/mollie.js, waar iDEAL niet wordt aangeboden bij
 * een order die op verlegging staat — voorkomen is beter dan achteraf zien.
 */
export function paymentMismatch({ method, country, treatment }) {
  const m = String(method || '').toLowerCase();
  const up = String(country || '').trim().toUpperCase();
  if (m !== 'ideal') return null;
  if (!up || up === HOME_COUNTRY) return null;
  if (treatment === VAT_TREATMENT.standard) return null;
  return `betaald met iDEAL terwijl het land ${up} is en er 0% is gerekend`;
}
