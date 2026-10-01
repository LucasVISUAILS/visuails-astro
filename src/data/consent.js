// VISUAILS — the withdrawal waiver, versioned.
//
// WHY THIS EXISTS
// A customer with no KvK and no VAT number is, in law, a consumer — and a
// consumer buying at a distance has fourteen days to withdraw. VISUAILS
// delivers inside 48 hours. Without something at the moment of ordering, a
// private buyer could take twenty catalog images and ask for the money back a
// fortnight later. Until August 2026 that was theoretical, because refunds did
// not actually work (see the webhook). They work now.
//
// Dutch law leaves two doors and this business happens to fit both:
//
//   1. MADE TO THE CUSTOMER'S SPECIFICATIONS. Work produced to a consumer's
//      own specification or clearly personalised falls outside the right of
//      withdrawal, and every visual here is built from that customer's own
//      product photographs and their own brief. Strong, but it is an argument
//      rather than a record.
//
//   2. A SERVICE FULLY PERFORMED, which is the one you can PROVE, and only if
//      two conditions are met together: the consumer expressly asked for
//      performance to begin, AND declared that they lose the right of
//      withdrawal once it has been performed. Both. One without the other does
//      not work.
//
// So the checkbox says both things in one sentence, and this file keeps the
// exact wording that was shown.
//
// WHY IT IS VERSIONED, AND WHY THE VERSION IS WHAT GETS STORED.
// The proof is not "they ticked a box" — it is "they ticked a box that said
// THIS". Storing a boolean records the click and loses the sentence, and the
// sentence is the whole evidentiary value. So the order stores an id, this file
// maps the id to the words, and editing the words means adding a version rather
// than overwriting one. An order from May must still be able to show what its
// customer actually agreed to, not what the current form says.
//
// WHY IT IS SHOWN TO EVERYONE, not only to customers with an empty VAT field.
// Lucas's call, and it is the right one: a VAT number is an indication, not
// proof, and a Dutch sole trader routinely leaves it blank. Branching on it
// would show a consumer notice to a business and hide it from a consumer, which
// is the wrong way round on both counts. For a business customer the sentence
// changes nothing, because the right of withdrawal never applied to them.
//
// NOT LEGAL ADVICE, and the reason this comment says so is that it is going to
// be read by whoever changes the wording next: the text below is a draft
// written from the statutory conditions, and it is worth one pass by somebody
// qualified before it carries any weight in a dispute.

/** The version stored on the order. Add a new one; never edit an old one. */
/* ── v2, 30 september 2026: de herroepingsverklaring is samengevoegd met de
   zakelijke verklaring tot één vinkje (zie BUSINESS_VERSION in business.js).
   Er is geen apart vinkje meer: de server legt deze versie vast als de
   zakelijke verklaring van versie business-v2 is aangevinkt. De tekst is
   dezelfde zin, zodat het bewijs zegt waar de klant ja tegen zei. */
export const CONSENT_VERSION = 'withdrawal-v2-2026-09';
/** De zakelijke versie die deze verklaring in zich draagt. */
export const MERGED_BUSINESS_VERSION = 'business-v2-2026-09';

/*
 * ── EEN TWEEDE VERSIE, VOOR HET MERKMODEL — 23 AUGUSTUS 2026 ────────────────
 *
 * Niet omdat de wet anders is, maar omdat de ZIN anders is. v1 eindigt met "De
 * visuals worden op mijn eigen specificatie gemaakt uit foto's die ik aanlever",
 * en dat is bij een merkmodel niet waar: de klant levert geen foto's aan, hij
 * beschrijft een gezicht of laat dat aan ons over. Een verklaring ondertekenen
 * die iets zegt wat feitelijk niet gebeurd is, is precies het soort bewijsstuk
 * dat in een geschil tegen je werkt in plaats van vóór je.
 *
 * De twee dragende elementen blijven woord voor woord staan — uitdrukkelijk
 * vragen om te beginnen, en begrijpen dat het herroepingsrecht daarmee vervalt —
 * want dát is wat art. 6:230p sub f verlangt en niet de zin erachter.
 *
 * EN HET IS EEN NIEUWE VERSIE EN GEEN AANPASSING. De kop van dit bestand zegt
 * waarom: een bestelling van vorige maand moet kunnen laten zien waar de klant
 * toen ja tegen zei. Beide ids blijven bestaan, consentText() kent ze allebei,
 * en welke er getoond wordt hangt af van het formulier waar de klant op stond.
 *
 * ── DE TEKST HIERONDER IS OP 24 AUGUSTUS NOG ÉÉN KEER BIJGESTELD ───────────
 *
 * Er stond "op mijn eigen briefing ontworpen" / "designed to my own brief", en
 * "briefing" staat in STIJL.md §3 op de lijst met woorden die nooit op de
 * klantzijde horen. Uitgerekend in een verklaring die de klant moet BEGRIJPEN
 * voordat hij hem aanvinkt, is dat het verkeerde woord.
 *
 * Dat is IN PLAATS bijgesteld en niet als v2, en dat is geen uitzondering op de
 * regel hierboven maar de regel zelf: die beschermt tekst waar al een
 * bestelling naar verwijst. Deze versie is dezelfde dag gemaakt, is nooit
 * gedeployed en staat op geen enkele bestelling. Een v2 aanmaken zou een dood id
 * achterlaten dat niemand ooit heeft gezien. Vanaf de eerste deploy geldt de
 * gewone regel weer: toevoegen, nooit wijzigen.
 */
/* Het merkmodel gebruikt sinds v2 dezelfde samengevoegde verklaring. */
export const CONSENT_VERSION_BRAND_MODEL = 'withdrawal-v2-2026-09';

export const CONSENT_TEXT = {
  'withdrawal-v2-2026-09': {
    en: 'I am ordering for a business or profession and not as a consumer; VISUAILS supplies businesses only. Should consumer law apply to me after all, I expressly ask VISUAILS to begin work on this order now and understand that I lose my right of withdrawal once it has been delivered.',
    nl: 'Ik bestel voor mijn bedrijf of beroep en niet als particulier; VISUAILS levert uitsluitend zakelijk. Mocht het consumentenrecht toch op mij van toepassing zijn, dan vraag ik VISUAILS uitdrukkelijk om nu met deze bestelling te beginnen en begrijp ik dat ik mijn herroepingsrecht verlies zodra ze geleverd is.',
  },
  'withdrawal-v1-2026-08': {
    en: 'I expressly ask VISUAILS to begin work on this order now, and I understand '
      + 'that once it has been delivered I lose my right of withdrawal. Visuals are '
      + 'produced to my own specification from photographs I supply.',
    nl: 'Ik vraag VISUAILS uitdrukkelijk om nu met deze bestelling te beginnen, en ik '
      + 'begrijp dat ik mijn herroepingsrecht verlies zodra de bestelling geleverd is. '
      + 'De visuals worden op mijn eigen specificatie gemaakt uit foto’s die ik aanlever.',
  },
  'withdrawal-brandmodel-v1-2026-08': {
    en: 'I expressly ask VISUAILS to begin work on this Brand Model now, and I '
      + 'understand that once it has been delivered I lose my right of withdrawal. '
      + 'The model is designed from what I described myself and used for no other brand.',
    nl: 'Ik vraag VISUAILS uitdrukkelijk om nu met dit merkmodel te beginnen, en ik '
      + 'begrijp dat ik mijn herroepingsrecht verlies zodra het geleverd is. Het '
      + 'model wordt ontworpen op wat ik zelf heb opgegeven en bij geen ander merk gebruikt.',
  },
};

/** The wording for a stored version id, or null if we no longer know it. */
export function consentText(version, lang = 'en') {
  const entry = CONSENT_TEXT[version];
  return entry ? entry[lang === 'nl' ? 'nl' : 'en'] : null;
}

/** What the order form shows today. */
export function currentConsent(lang = 'en') {
  return consentText(CONSENT_VERSION, lang);
}

/** What the Brand Model form shows today. */
export function currentBrandModelConsent(lang = 'en') {
  return consentText(CONSENT_VERSION_BRAND_MODEL, lang);
}

/**
 * Wat er op de bestelling als herroepingsverklaring wordt vastgelegd.
 *
 * Een los vinkje `withdrawal_consent` (oude formulieren, of een formulier dat
 * nog in een open tabblad staat) telt zoals altijd. Sinds v2 is er geen los
 * vinkje meer: dan telt de zakelijke verklaring van versie business-v2, want
 * die zin draagt de herroepingsverklaring in zich. Anders 'MISSING' — nooit
 * een stille toestemming.
 */
export function withdrawalRecord({ withdrawal, consentVersion, business, businessVersion }) {
  if (withdrawal === 'yes') return consentVersion || 'unversioned';
  if (business === 'yes' && businessVersion === MERGED_BUSINESS_VERSION) return CONSENT_VERSION;
  return 'MISSING';
}
