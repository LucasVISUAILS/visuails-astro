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
