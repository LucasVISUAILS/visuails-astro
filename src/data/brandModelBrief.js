// VISUAILS — the Brand Model briefing. What we need before the conversation.
//
// WHY THIS EXISTS
// Lucas, August 2026: "ik wil dit een aparte order maken waarbij de klant kort
// een form invult met belangrijke info … en dan samen met VISUAILS gaat kijken
// wat voor model past bij het merk (bijvoorbeeld gezichtstattoos, 40-50 oud
// model etc)."
//
// So this is deliberately NOT a configurator. A Brand Model is a commissioned
// face; nobody picks one out of a dropdown. What the form has to do is get the
// conversation to a useful starting point in one screen, so the first reply is
// "here are three directions" rather than "tell us more".
//
// THE FIELD LIST IS A JUDGEMENT AND HERE IS THE JUDGEMENT.
// Everything below either changes who gets cast or is the fastest way to rule
// something out. Anything that failed that test was left off, and the ones that
// were considered and dropped are named at the bottom so the argument is not
// had twice — the same discipline src/data/attributes.js keeps.
//
//   presentation  — you cannot cast without it, and it is one tap.
//   age           — Lucas named it himself ("40-50 oud model"). It is also the
//                   single most common reason a stock-looking face is wrong for
//                   a brand: everybody defaults to 25.
//   build         — this is a CLOTHING business. How a garment falls is the
//                   product, and a face chosen without a body is half a brief.
//   features      — Lucas's own example, and the field that decides whether the
//                   result is a face or A face. Freckles, grey hair, a gap in
//                   the teeth, a tattoo. Free text on purpose: a checklist here
//                   would cap the answer at whatever we thought of.
//   register      — reuses the trait vocabulary already in src/data/models.js,
//                   so the words on this form are the words under the ten
//                   standard faces. A brand that says "editorial" here means
//                   the same thing it meant when they looked at Ava.
//   avoid         — the negative brief, and usually the most informative
//                   sentence on the whole form. "Nothing that looks like an
//                   influencer" rules out more than three positive adjectives
//                   rule in.
//   reference     — one link. Cheapest high-signal field there is.
//   usage         — a face for packshots and a face for campaign imagery are
//                   not always the same casting, and this is the one question
//                   that changes how hard the styling has to work.
//
// CONSIDERED AND LEFT OFF:
//   · Who the customer is. Already asked once per order (attributes.js
//     ORDER_QUESTIONS) and asking it twice is the friction that file warns of.
//   · Ethnicity, and anything adjacent to it. Not a form field. If a brand
//     wants to talk about who represents them, that is the conversation this
//     form exists to start, with a person, not a dropdown on a website.
//   · How many faces. That is a scope-and-price question and belongs in the
//     reply, not in the brief.
//   · Hair and eye colour as separate fields. They live inside `features` when
//     they matter and are noise when they do not.

export const PRESENTATION = [
  { id: 'female', label: { en: 'Female', nl: 'Vrouw' } },
  { id: 'male', label: { en: 'Male', nl: 'Man' } },
  { id: 'nonbinary', label: { en: 'Non-binary', nl: 'Non-binair' } },
  { id: 'open', label: { en: 'Open — advise us', nl: 'Open — adviseer ons' } },
];

export const AGE_BANDS = [
  { id: '18-25', label: '18–25' },
  { id: '25-35', label: '25–35' },
  { id: '35-50', label: '35–50' },
  { id: '50plus', label: { en: '50+', nl: '50+' } },
  { id: 'open', label: { en: 'Open', nl: 'Open' } },
];

export const BUILDS = [
  { id: 'slim', label: { en: 'Slim', nl: 'Slank' } },
  { id: 'average', label: { en: 'Average', nl: 'Gemiddeld' } },
  { id: 'athletic', label: { en: 'Athletic', nl: 'Atletisch' } },
  { id: 'curve', label: { en: 'Curve', nl: 'Curve' } },
  { id: 'open', label: { en: 'Open', nl: 'Open' } },
];

export const USAGE = [
  { id: 'catalog', label: { en: 'Mostly product pages', nl: 'Vooral productpagina’s' } },
  { id: 'lifestyle', label: { en: 'Mostly campaign and social', nl: 'Vooral campagne en social' } },
  { id: 'both', label: { en: 'Both, evenly', nl: 'Allebei, ongeveer gelijk' } },
];

/** Register words — the SAME vocabulary as the standard roster's traits. */
export const REGISTER = [
  'warm', 'editorial', 'refined', 'sporty', 'confident',
  'natural', 'bold', 'soft', 'clean', 'sharp',
];

export const COPY = {
  en: {
    eyebrow: 'Brand Model',
    h1: 'Tell us who should wear it.',
    lead: 'A Brand Model is designed once, for you, and used nowhere else. It is not something you pick off a list — so this is a handful of short questions, and then we go through your answers together and come back with directions before anything is built.',
    formH: 'What we need from you',
    formLead: 'Eight answers, most of them one tap. Everything here is a starting point, not a specification — the conversation is where it gets decided.',
    presentation: 'How should the model present?',
    age: 'Roughly what age?',
    build: 'Build',
    features: 'Anything distinctive?',
    featuresHint: 'This is the field that makes a face yours rather than generic. Freckles, grey hair, a face tattoo, a gap in the teeth, glasses, natural texture — whatever you would notice.',
    featuresPh: 'e.g. face tattoo, shaved head, grey at the temples',
    register: 'Pick up to two words that fit the brand',
    avoid: 'Anything to avoid?',
    avoidHint: 'Often the most useful line on this form. What would make you say no straight away?',
    avoidPh: 'e.g. nothing that looks like an influencer',
    reference: 'A reference, if you have one',
    referencePh: 'A link to a brand whose casting you like',
    usage: 'Where will this face mostly appear?',
    you: 'And you',
    name: 'Your name',
    brand: 'Brand',
    email: 'Email',
    notes: 'Anything else we should know?',
    submit: 'Send your answers',
    legal: ['By sending this you agree to our ', ' and ', '.'],
    legalTerms: 'terms',
    legalPrivacy: 'privacy policy',
    afterH: 'What happens next',
    after: [
      'We read what you sent and come back within two working days with directions — not one face, a few, so you have something to react to.',
      'You tell us what is close and what is wrong. That round is the point of doing it this way; a face nobody argued about is a face nobody chose.',
      'Once it is locked, the model is yours and used on no other brand. It gets kept current as your line changes.',
    ],
    priceNote: 'This form and the conversation after it cost you nothing. The setup fee and how it is paid are settled before anything is built, never after.',
  },
  nl: {
    eyebrow: 'Merkmodel',
    h1: 'Vertel ons wie het moet dragen.',
    lead: 'Een merkmodel wordt één keer ontworpen, voor jou, en nergens anders gebruikt. Het is niets wat je uit een lijst kiest — dus dit zijn een paar korte vragen, en daarna kijken we er samen naar en komen we met richtingen terug voordat er iets gebouwd wordt.',
    formH: 'Wat we van je nodig hebben',
    formLead: 'Acht antwoorden, de meeste met één tik. Alles hier is een startpunt en geen specificatie — in het gesprek wordt het beslist.',
    presentation: 'Hoe moet het model overkomen?',
    age: 'Ongeveer welke leeftijd?',
    build: 'Postuur',
    features: 'Iets kenmerkends?',
    featuresHint: 'Dit is het veld dat van een gezicht jóuw gezicht maakt. Sproeten, grijs haar, een gezichtstattoo, een spleetje tussen de tanden, een bril, natuurlijke textuur — wat jou zou opvallen.',
    featuresPh: 'bijv. gezichtstattoo, kaalgeschoren, grijs bij de slapen',
    register: 'Kies maximaal twee woorden die bij het merk passen',
    avoid: 'Iets wat je juist niet wilt?',
    avoidHint: 'Vaak de nuttigste regel op dit formulier. Waarbij zou je meteen nee zeggen?',
    avoidPh: 'bijv. niets wat op een influencer lijkt',
    reference: 'Een referentie, als je die hebt',
    referencePh: 'Een link naar een merk waarvan je de casting mooi vindt',
    usage: 'Waar komt dit gezicht vooral te staan?',
    you: 'En jij',
    name: 'Je naam',
    brand: 'Merk',
    email: 'E-mail',
    notes: 'Nog iets wat we moeten weten?',
    submit: 'Verstuur je antwoorden',
    legal: ['Door dit te versturen ga je akkoord met onze ', ' en ', '.'],
    legalTerms: 'algemene voorwaarden',
    legalPrivacy: 'privacyverklaring',
    afterH: 'Wat er daarna gebeurt',
    after: [
      'We lezen wat je invulde en komen binnen twee werkdagen terug met richtingen — niet één gezicht maar een paar, zodat je iets hebt om op te reageren.',
      'Jij zegt wat in de buurt komt en wat niet klopt. Die ronde is precies waarom we het zo doen; een gezicht waar niemand over gediscussieerd heeft, is een gezicht dat niemand gekozen heeft.',
      'Zodra het vaststaat is het model van jou en wordt het bij geen enkel ander merk gebruikt. Het wordt bijgehouden terwijl je lijn verandert.',
    ],
    priceNote: 'Voor dit formulier en het gesprek erna betaal je niets. Het setupbedrag en hoe je dat betaalt, spreken we af voordat er iets gebouwd wordt — nooit achteraf.',
  },
};

export function copy(lang = 'en') {
  return COPY[lang === 'nl' ? 'nl' : 'en'];
}

/** A label that may be a plain string or a per-language object. */
export function label(item, lang = 'en') {
  return typeof item.label === 'string' ? item.label : item.label[lang];
}
