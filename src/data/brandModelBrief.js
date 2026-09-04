// VISUAILS — het merkmodelformulier. Wat we vragen, en wat we met opzet niet vragen.
//
// ── VAN BRIEFING NAAR BESTELLING — 23 AUGUSTUS 2026 ─────────────────────────
//
// Dit heette een briefing en dat klopte: er stond geen bedrag op, er viel niets
// af te rekenen, en het formulier opende een gesprek. Sinds het merkmodel één
// prijs heeft (AMOUNT.brandModel, één keer) is het een bestelling, en dan hoort
// er een afrekenstap bij — anders is het geen product maar nog steeds een
// aanvraag. MERKMODEL-ONTWERP.md §5 beschrijft de vorm; dit bestand draagt de
// woorden.
//
// ── TWEE ROUTES, EN ZE STELLEN ANDERE VRAGEN ────────────────────────────────
//
// Lucas: de klant kan zelf een gezicht voor ogen hebben, of het aan ons
// overlaten. Dat is geen korting en geen upgrade — het is een keuze over hoeveel
// je zelf wilt bepalen, en beide kosten hetzelfde. Dat staat er ook letterlijk
// bij, want anders gaat de helft van de bezoekers op zoek naar de goedkope.
//
// Het verschil zit niet in het AANTAL vragen maar in WELKE. Wie het gezicht
// beschrijft, krijgt de vragen over het gezicht. Wie het overlaat, krijgt er één
// — waar hij nee tegen zou zeggen — want dat is de goedkoopste vraag met de
// hoogste opbrengst, en de enige die een verkeerde eerste ronde voorkomt. Wie de
// controle uit handen geeft, houdt een veto. Dat is geen tegenspraak; het is
// precies wat het vertrouwen mogelijk maakt.
//
// ── DE VELDENLIJST IS EEN OORDEEL, EN HIER IS HET OORDEEL ───────────────────
//
// Alles hieronder verandert wie er gecast wordt, of is de snelste manier om iets
// uit te sluiten. Wat daar niet doorheen kwam, staat onderaan bij naam, zodat
// het argument niet twee keer gevoerd wordt — dezelfde discipline die
// src/data/attributes.js aanhoudt.
//
//   BEIDE ROUTES
//   audience    — "wie koopt dit, en wat voor iemand is dat?" Vrij tekstveld en
//                 geen hokjes: hokjes leveren "25-45, vrouw" op en daar cast je
//                 niets mee. Dit is de vraag die van een doelgroep een casting
//                 maakt, en de klant vindt hem makkelijker dan hij lijkt.
//   link        — één link naar het merk zelf. Het goedkoopste veld met het
//                 meeste signaal dat er bestaat: het merk waar het gezicht bij
//                 moet passen, in plaats van een beschrijving daarvan.
//   usage       — een gezicht voor packshots en een gezicht voor campagne zijn
//                 niet altijd dezelfde casting, en dit is de ene vraag die
//                 verandert hoe hard de styling moet werken.
//
//   ALLEEN "IK WEET WIE IK VOOR ME ZIE"
//   presentation — je kunt niet casten zonder, en het is één tik.
//   age          — Lucas noemde het zelf ("40-50 oud model"). Het is ook de
//                  vaakste reden dat een gezicht als stockwerk oogt: iedereen die
//                  niets invult, krijgt vijfentwintig.
//   build        — dit is een KLEDINGbedrijf. Hoe een kledingstuk valt ís het
//                  product, en een gezicht zonder lichaam is een halve briefing.
//   features     — Lucas' eigen voorbeeld, en het veld dat beslist of het
//                  resultaat een gezicht is of hét gezicht. Sproeten, grijs haar,
//                  een spleetje, een tattoo. Vrij tekstveld met opzet: een
//                  keuzelijst zou het antwoord aftoppen op wat wij bedachten.
//
//   ALLEEN "BEDENK HET VOOR MIJ"
//   avoid        — de negatieve briefing, en meestal de nuttigste zin op het hele
//                  formulier. "Niets wat op een influencer lijkt" sluit meer uit
//                  dan drie bijvoeglijke naamwoorden insluiten. Bij deze route is
//                  het de enige vraag, en dat is genoeg.
//
// ── WAT ERAF IS GEGAAN, EN WAAROM DAT GEEN VERLIES IS ───────────────────────
//
//   register    — de tien stemmingswoorden uit models.js. Aantrekkelijk omdat ze
//                 het vocabulaire van de vaste roster hergebruiken, maar naast
//                 `features` en `avoid` voegen ze niets toe: "editorial" is een
//                 gevoel, "grijs bij de slapen" is een gezicht.
//   reference   — de link naar een merk waarvan je de casting mooi vindt. Stap 2
//                 vraagt nu om een link naar JOUW merk: dezelfde moeite voor de
//                 klant, veel meer signaal.
//
// Wat overblijft telt uit op precies acht vragen voor de ene route en vier voor
// de andere, en dat zijn de getallen die op de twee kaarten van stap 1 staan.
// Verandert er hier iets, dan verandert daar een getal mee — en tests/merkmodel
// .test.mjs telt na of dat gebeurd is.
//
// ── EN WAT ER NOG STEEDS NIET GEVRAAGD WORDT ────────────────────────────────
//   · Etniciteit, en alles wat eraan raakt. Geen formulierveld. Wil een merk
//     praten over wie hen vertegenwoordigt, dan is dat het gesprek dat na dit
//     formulier komt — met een mens, niet met een keuzelijst op een website.
//   · Hoeveel gezichten. Eén merkmodel is één gezicht; dat is wat er verkocht
//     wordt en niet iets om uit te vragen.
//   · Haar- en oogkleur als losse velden. Die zitten in `features` als ze ertoe
//     doen en zijn ruis als ze dat niet doen.

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

/*
 * DE TWEE ROUTES.
 *
 * `questions` is het getal dat op de kaart komt te staan, en het is geen
 * versiering: het is de belofte waarop iemand kiest. Het telt de vragen die die
 * route werkelijk stelt — stap 2 (drie) plus stap 3 (vijf of één). De
 * factuurgegevens tellen niet mee en dat is eerlijk: die vult iedereen bij elke
 * bestelling in, bij elke webshop, en niemand ervaart ze als vragen over zijn
 * merk.
 *
 * `id` reist mee naar de server in `bm_track` en komt zo in details_json en in
 * de studiomail terecht — het eerste wat je wilt weten als je de aanvraag
 * opent, want het bepaalt of er een gezicht beschreven is of niet.
 */
export const TRACKS = [
  { id: 'own', questions: 8 },
  { id: 'ours', questions: 4 },
];

/** Het aantal vragen van een route, of null bij een onbekende route. */
export function trackQuestions(id) {
  const t = TRACKS.find((x) => x.id === id);
  return t ? t.questions : null;
}

export const COPY = {
  en: {
    eyebrow: 'Brand Model',
    h1: 'One face, made only for you.',
    lead: 'A Brand Model is designed once, for your brand, and used nowhere else. Not picked off a list, not licensed from a library, not shared with the shop that sells beside you.',

    stepsLabel: 'Steps',
    next: 'Continue',
    back: 'Back',

    s1H: 'How would you like to work?',
    s1Lead: 'This is the only choice that changes the rest of the form.',
    trackOwnH: 'I know who I see',
    trackOwnB: 'You describe the face and we build it. Eight short questions.',
    trackOursH: 'Design it for me',
    trackOursB: 'You tell us who you sell to, we come back with directions. Four short questions.',
    trackSame: 'Both cost the same. This is a choice about how much you want to decide, not about what you spend.',
    trackErr: 'Pick one of the two, and the rest of the form follows.',

    s2H: 'Your brand',
    s2Lead: 'Three questions, and they matter whichever route you picked.',
    audience: 'Who buys this, and what sort of person is that?',
    audienceHint: 'One line, in your own words. “Women who just landed their first real job and are done shopping at H&M” is a casting. “25–45, female” is not.',
    audiencePh: 'Who your customer actually is',
    audienceErr: 'Tell us who buys this — it is the line the whole casting comes from.',
    link: 'Where can we see your brand?',
    linkHint: 'A website, a shop, an Instagram. One link is enough.',
    linkPh: 'https://',
    linkErr: 'Add one link, so we can look at the brand this face has to fit.',
    usage: 'Where will this face mostly appear?',

    s3aH: 'The face',
    s3aLead: 'Everything here is a starting point, not a specification. You will see directions before anything is built.',
    presentation: 'How should the model present?',
    age: 'Roughly what age?',
    build: 'Build',
    features: 'Anything distinctive?',
    featuresHint: 'This is the field that makes a face yours rather than generic. Freckles, grey hair, a face tattoo, a gap in the teeth, glasses, natural texture — whatever you would notice.',
    featuresPh: 'e.g. face tattoo, shaved head, grey at the temples',

    s3bH: 'One question',
    s3bLead: 'You are handing us the creative call, so you keep a veto. That is the point of asking this and nothing else.',
    avoid: 'Anything to avoid?',
    avoidHint: 'Often the most useful line on this form. What would make you say no straight away?',
    avoidPh: 'e.g. nothing that looks like an influencer',

    notes: 'Anything else we should know?',

    s5H: 'Check it over, and pay',
    s5Lead: 'One payment. Nothing monthly, nothing per image.',
    summaryH: 'What you are sending us',
    summaryEmpty: 'Not filled in',
    afterH: 'What happens after you pay',
    after: [
      'As soon as they are ready you get directions — not one face, a few, so you have something to react to.',
      'You say what is close and what is wrong. That round is the point of doing it this way; a face nobody argued about is a face nobody chose.',
      'Then we build it, put it through the uniqueness check, and lock it to your brand. It stays yours, and it gets kept current as your line changes.',
    ],
    legal: ['By paying you agree to our ', ' and ', '.'],
    legalTerms: 'terms',
    legalPrivacy: 'privacy policy',
    submit: 'Pay and start',
    payNote: 'You will be taken to Mollie to pay. Nothing is built before the payment comes through.',
    businessErr: 'Please tick this to confirm you are ordering for a business.',
    consentErr: 'Please tick this to confirm we may start before the withdrawal period ends.',
  },

  nl: {
    eyebrow: 'Merkmodel',
    h1: 'Eén gezicht, alleen voor jou gemaakt.',
    lead: 'Een merkmodel wordt één keer ontworpen, voor jouw merk, en nergens anders gebruikt. Niet uit een lijst gekozen, niet uit een bibliotheek gelicentieerd, niet gedeeld met de winkel die naast je verkoopt.',

    stepsLabel: 'Stappen',
    next: 'Verder',
    back: 'Terug',

    s1H: 'Hoe wil je werken?',
    s1Lead: 'Dit is de enige keuze die de rest van het formulier verandert.',
    trackOwnH: 'Ik weet wie ik voor me zie',
    trackOwnB: 'Jij beschrijft het gezicht en wij bouwen het. Acht korte vragen.',
    trackOursH: 'Bedenk het voor mij',
    trackOursB: 'Jij vertelt ons voor wie je verkoopt, wij komen met richtingen. Vier korte vragen.',
    trackSame: 'Beide kosten hetzelfde. Dit is een keuze over hoeveel je zelf wilt bepalen, niet over wat je uitgeeft.',
    trackErr: 'Kies er een van de twee, dan volgt de rest van het formulier.',

    s2H: 'Je merk',
    s2Lead: 'Drie vragen, en ze doen ertoe welke route je ook koos.',
    audience: 'Wie koopt dit, en wat voor iemand is dat?',
    audienceHint: 'Eén regel, in je eigen woorden. “Vrouwen die net hun eerste echte baan hebben en niet meer bij H&M willen kopen” is een casting. “25-45, vrouw” niet.',
    audiencePh: 'Wie je klant werkelijk is',
    audienceErr: 'Vertel wie dit koopt — dat is de regel waar de hele casting uit komt.',
    link: 'Waar kunnen we je merk zien?',
    linkHint: 'Een website, een winkel, een Instagram. Eén link is genoeg.',
    linkPh: 'https://',
    linkErr: 'Zet er één link bij, dan kunnen we kijken naar het merk waar dit gezicht bij moet passen.',
    usage: 'Waar komt dit gezicht vooral te staan?',

    s3aH: 'Het gezicht',
    s3aLead: 'Alles hier is een startpunt en geen specificatie. Je krijgt richtingen te zien voordat er iets gebouwd wordt.',
    presentation: 'Hoe moet het model overkomen?',
    age: 'Ongeveer welke leeftijd?',
    build: 'Postuur',
    features: 'Iets kenmerkends?',
    featuresHint: 'Dit is het veld dat van een gezicht jóuw gezicht maakt. Sproeten, grijs haar, een gezichtstattoo, een spleetje tussen de tanden, een bril, natuurlijke textuur — wat jou zou opvallen.',
    featuresPh: 'bijv. gezichtstattoo, kaalgeschoren, grijs bij de slapen',

    s3bH: 'Eén vraag',
    s3bLead: 'Je legt de creatieve keuze bij ons, dus je houdt een veto. Daarom vragen we dit en verder niets.',
    avoid: 'Iets wat je juist niet wilt?',
    avoidHint: 'Vaak de nuttigste regel op dit formulier. Waarbij zou je meteen nee zeggen?',
    avoidPh: 'bijv. niets wat op een influencer lijkt',

    notes: 'Nog iets wat we moeten weten?',

    s5H: 'Nakijken en betalen',
    s5Lead: 'Eén betaling. Niets maandelijks, niets per beeld.',
    summaryH: 'Wat je ons stuurt',
    summaryEmpty: 'Niet ingevuld',
    afterH: 'Wat er na het betalen gebeurt',
    after: [
      'Zodra ze klaar zijn krijg je richtingen — niet één gezicht maar een paar, zodat je iets hebt om op te reageren.',
      'Jij zegt wat in de buurt komt en wat niet klopt. Die ronde is precies waarom we het zo doen; een gezicht waar niemand over gediscussieerd heeft, is een gezicht dat niemand gekozen heeft.',
      'Daarna bouwen we het, halen het door de uniciteitscontrole en leggen het vast op jouw merk. Het blijft van jou, en het gaat mee als je collectie verandert.',
    ],
    legal: ['Door te betalen ga je akkoord met onze ', ' en ', '.'],
    legalTerms: 'algemene voorwaarden',
    legalPrivacy: 'privacyverklaring',
    submit: 'Betalen en starten',
    payNote: 'Je gaat naar Mollie om te betalen. Er wordt niets gebouwd voordat de betaling binnen is.',
    businessErr: 'Vink dit aan om te bevestigen dat je zakelijk bestelt.',
    consentErr: 'Vink dit aan om te bevestigen dat we mogen beginnen voordat je bedenktijd voorbij is.',
  },
};

export function copy(lang = 'en') {
  return COPY[lang === 'nl' ? 'nl' : 'en'];
}

/** A label that may be a plain string or a per-language object. */
export function label(item, lang = 'en') {
  return typeof item.label === 'string' ? item.label : item.label[lang];
}
