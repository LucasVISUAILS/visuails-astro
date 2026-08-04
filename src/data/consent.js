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
export const CONSENT_VERSION = 'withdrawal-v1-2026-08';

export const CONSENT_TEXT = {
  'withdrawal-v1-2026-08': {
    en: 'I expressly ask VISUAILS to begin work on this order now, and I understand '
      + 'that once it has been delivered I lose my right of withdrawal. Visuals are '
      + 'produced to my own specification from photographs I supply.',
    nl: 'Ik vraag VISUAILS uitdrukkelijk om nu met deze bestelling te beginnen, en ik '
      + 'begrijp dat ik mijn herroepingsrecht verlies zodra de bestelling geleverd is. '
      + 'De visuals worden op mijn eigen specificatie gemaakt uit foto’s die ik aanlever.',
  },
};

/** The wording for a stored version id, or null if we no longer know it. */
export function consentText(version, lang = 'en') {
  const entry = CONSENT_TEXT[version];
  return entry ? entry[lang === 'nl' ? 'nl' : 'en'] : null;
}

/** What the form shows today. */
export function currentConsent(lang = 'en') {
  return consentText(CONSENT_VERSION, lang);
}
