/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WIE ONTVANGT JOUW GEGEVENS — ÉÉN LIJST, 8 oktober 2026 (o08, o09)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT BESTAND ER IS ────────────────────────────────────────────────
 *
 * De ontvangers stonden op drie plekken met de hand: §5 van het privacybeleid,
 * de SUBS-array in beide verwerkersovereenkomsten, en §5 van het
 * verwerkingsregister. Twee ontbraken overal:
 *
 *   · WhatsApp (Meta). Lucas neemt via WhatsApp Business klantcontact,
 *     bestellingen en foto's aan, en het privacybeleid noemde WhatsApp-
 *     correspondentie al in §2 — maar niet wie dat bericht vervoert (o09).
 *   · De makers van de modellen. Het platform (Magnific) stond erin; de partij
 *     wiens model het beeld verwerkt niet. Art. 28 lid 2 en 4 AVG gaan over de
 *     hele keten, en welk model er draait is VISUAILS' eigen keuze — dan valt
 *     een nieuwe maker ook onder de melding vooraf (o08).
 *
 * Lucas, 8 oktober 2026: *"Ik gebruik veel verschillende leveranciers
 * (…) en dit verandert wanneer er nieuwe betere modellen op de markt verschijnen
 * om altijd de beste service en kwaliteit te garanderen."* (De weggelaten
 * modelnaam staat met opzet niet in de broncode: zie de noot over modelnamen
 * in tests/legal.test.mjs.)
 *
 * ── HET COMPROMIS MET 12 AUGUSTUS ───────────────────────────────────────────
 *
 * Op 12 augustus besloot Lucas geen modellen te publiceren ("dit zou mensen
 * kunnen sturen op eigen productie"; overzicht §21 en §23). Dat blijft staan
 * voor zijn WERKWIJZE: welk model voor welke look, prompts, volgorde. Wat hier
 * staat zijn de PARTIJEN die persoonsgegevens ontvangen: het platform waar de
 * beelden heen gaan, en de MAKER van de modellen die daar voor ons draaien. Een
 * nieuwer model van een maker die al in de lijst staat, verandert de lijst dus
 * niet; een maker die erbij komt wel.
 *
 * ── BIJHOUDEN, IN DRIE STAPPEN ──────────────────────────────────────────────
 *
 *   1 · Nieuwe maker of dienst? Voeg een regel toe aan ONTVANGERS (naam, wat,
 *       waar, grondslag, in beide talen) en zet LIJST_GEWIJZIGD op vandaag.
 *   2 · Mail alle klanten minstens MELDTERMIJN_DAGEN dagen vóórdat je die partij
 *       echt gebruikt (§8 van de verwerkersovereenkomst). Pas daarna gebruiken.
 *   3 · Zet de partij ook in AVG-VERWERKINGSREGISTER.md §5;
 *       tests/subverwerkers.test.mjs gaat rood zolang dat niet zo is.
 *
 * Het privacybeleid (§5) en de verwerkersovereenkomst (§8) lezen allebei deze
 * lijst; ze hebben geen eigen kopie meer.
 *
 * ── DE TWEEDE MAKER — 11 oktober 2026 (ko08 = a) ─────────────────────────────
 *
 * De maker van het tweede model dat Lucas op 8 oktober noemde, stond er eerst
 * niet in: het platform was onbekend. Lucas: via Magnific. Magnific gebruikt die
 * modellen via BytePlus (de zakelijke tak van ByteDance, BytePlus Pte. Ltd. in
 * Singapore; zie de case study van BytePlus over Magnific). Dus staat hij erin
 * zoals Google: de MAKER, via Magnific, zonder modelnaam (12 augustus; zie de
 * noot over modelnamen in tests/legal.test.mjs).
 */

/** De dag waarop deze lijst voor het laatst inhoudelijk veranderde, 'JJJJ-MM-DD'. */
export const LIJST_GEWIJZIGD = '2026-10-11';

/**
 * Zo lang van tevoren melden wij een nieuwe of vervangen subverwerker, en zo lang
 * mag de klant bezwaar maken (art. 28 lid 2 AVG). Stond als "30" met de hand in
 * §6 en §8 van beide verwerkersovereenkomsten; nu één getal.
 *
 * 11 oktober 2026 (kmeld = b): 14 dagen, Lucas' keuze in afvinklijst 2. De wet
 * noemt geen termijn, alleen dat de klant vooraf bezwaar kan maken.
 */
export const MELDTERMIJN_DAGEN = 14;

/*
 * Per partij:
 *   naam   de rechtspersoon (of, bij een modelmaker, het bedrijf met de dienst)
 *   via    bij een modelmaker: het platform waarop het model voor ons draait
 *   beeld  ontvangt het beeldmateriaal van de klant → hoort in de lijst van de
 *          verwerkersovereenkomst. Alles in deze lijst staat in het privacybeleid.
 *   wat / waar / grond   in beide talen; grond = de grondslag van de doorgifte.
 */
export const ONTVANGERS = [
  {
    id: 'magnific',
    naam: 'Magnific AI, S.L.U.',
    beeld: true,
    waar: {
      nl: 'Málaga, Spanje (EU); voorheen Freepik Company, S.L.U.',
      en: 'Málaga, Spain (EU); formerly Freepik Company, S.L.U.',
    },
    wat: {
      nl: 'het platform waarop de visuals uit jouw materiaal worden gegenereerd. Het draait daarvoor de beeld- en videomodellen van andere makers; welke makers dat voor ons zijn, staat hieronder',
      en: 'the platform on which the visuals are generated from your material. It runs the image and video models of other makers for that; the makers it runs for us are listed below',
    },
    grond: {
      nl: 'binnen de EU; voor modelmakers buiten de EER sluit Magnific standaardcontractbepalingen',
      en: 'inside the EU; for model makers outside the EEA, Magnific concludes Standard Contractual Clauses',
    },
  },
  {
    id: 'google-gemini',
    naam: 'Google (Gemini)',
    via: 'magnific',
    beeld: true,
    waar: {
      nl: 'Verenigde Staten',
      en: 'United States',
    },
    wat: {
      nl: 'maker van de Gemini-modellen die wij via Magnific gebruiken. Verwerkt je beeld als subverwerker van Magnific en bewaart het volgens Magnific ten hoogste 30 dagen',
      en: 'maker of the Gemini models we use through Magnific. Processes your image as Magnific’s sub-processor and, according to Magnific, keeps it for no more than 30 days',
    },
    grond: {
      nl: 'via Magnific: standaardcontractbepalingen (art. 46 lid 2 sub c AVG)',
      en: 'through Magnific: Standard Contractual Clauses (Art. 46(2)(c) GDPR)',
    },
  },
  /* ko08 = a (11 oktober 2026): de videomodellen van ByteDance, via Magnific, dat
     ze afneemt bij BytePlus Pte. Ltd. (Singapore). Geen modelnaam (12 augustus).
     Over hoe lang deze maker het beeld bewaart, zegt Magnific niets wat wij
     kunnen aanhalen; dus staat er ook niets. */
  {
    id: 'bytedance',
    naam: 'ByteDance (BytePlus Pte. Ltd.)',
    via: 'magnific',
    beeld: true,
    waar: {
      nl: 'Singapore',
      en: 'Singapore',
    },
    wat: {
      nl: 'maker van de videomodellen die wij via Magnific gebruiken. Verwerkt je beeld als subverwerker van Magnific',
      en: 'maker of the video models we use through Magnific. Processes your image as Magnific’s sub-processor',
    },
    grond: {
      nl: 'via Magnific: standaardcontractbepalingen (art. 46 lid 2 sub c AVG)',
      en: 'through Magnific: Standard Contractual Clauses (Art. 46(2)(c) GDPR)',
    },
  },
  /* "Met opslag in de EU" stond hier ooit en is niet gegarandeerd: R2 en D1 staan
     niet in een EU-jurisdictie (wrangler.toml), en een locatiehint is volgens
     Cloudflare "best effort" (29 september 2026). */
  {
    id: 'cloudflare',
    naam: 'Cloudflare, Inc.',
    beeld: true,
    waar: {
      nl: 'Verenigde Staten (wereldwijd netwerk)',
      en: 'United States (global network)',
    },
    wat: {
      nl: 'het draaien van de site, de opslag van het materiaal dat je aanlevert, de beelden die wij leveren en de bestelgegevens, en, waar die aanstaat, de botcontrole op formulieren (Turnstile)',
      en: 'running the site, storing the material you supply, the visuals we deliver and the order data, and, where it is switched on, the bot check on forms (Turnstile)',
    },
    grond: {
      nl: 'EU-VS Data Privacy Framework (gecertificeerd); standaardcontractbepalingen als terugval',
      en: 'EU-U.S. Data Privacy Framework (certified); Standard Contractual Clauses as fallback',
    },
  },
  {
    id: 'resend',
    naam: 'Plus Five Five, Inc. (Resend)',
    beeld: true,
    waar: {
      nl: 'San Francisco, Verenigde Staten',
      en: 'San Francisco, United States',
    },
    wat: {
      nl: 'e-mail; de bestelmelding aan de studio draagt het aangeleverde materiaal als bijlage. Resend bewaart verzonden mail 30 dagen',
      en: 'email; the order notice to the studio carries the supplied material as an attachment. Resend keeps sent email for 30 days',
    },
    grond: {
      nl: 'EU-VS Data Privacy Framework (gecertificeerd); standaardcontractbepalingen als terugval',
      en: 'EU-U.S. Data Privacy Framework (certified); Standard Contractual Clauses as fallback',
    },
  },
  /* De mailbox waarin die bestelmelding binnenkomt, ontvangt het materiaal ook
     (29 september 2026). */
  {
    id: 'google-workspace',
    naam: 'Google Ireland Ltd. (Google Workspace)',
    beeld: true,
    waar: {
      nl: 'Dublin, Ierland (EU); Google LLC in de Verenigde Staten',
      en: 'Dublin, Ireland (EU); Google LLC in the United States',
    },
    wat: {
      /* Google Drive erbij op 8 oktober 2026 (9.04): daar staat sinds vandaag de
         wekelijkse kopie van de database. Geen nieuwe partij, wel een nieuw doel. */
      nl: 'de mailbox hello@visuails.com, waarin de bestelmelding met het aangeleverde materiaal binnenkomt, en Google Drive, waar de wekelijkse kopie van onze database staat (zonder inloggegevens)',
      en: 'the hello@visuails.com mailbox, where the order notice with the supplied material arrives, and Google Drive, which holds the weekly copy of our database (without sign-in data)',
    },
    grond: {
      nl: 'EU-VS Data Privacy Framework (gecertificeerd); standaardcontractbepalingen als terugval',
      en: 'EU-U.S. Data Privacy Framework (certified); Standard Contractual Clauses as fallback',
    },
  },
  /* ── WHATSAPP (o09) ──────────────────────────────────────────────────────
     Neutraal omschreven en niet mooier dan het is. De berichten zijn end-to-end
     versleuteld, dus WhatsApp leest de inhoud niet; het vervoert ze wel, en het
     verwerkt het telefoonnummer en de gebruiksgegevens onder zijn eigen
     voorwaarden. `beeld: true` omdat een klant er foto's mee kan sturen — alleen
     als hij dat kanaal zelf kiest. De doorgiftegrond is die van WhatsApp's eigen
     privacybeleid; daarom staat dat er ook zo bij. */
  {
    id: 'whatsapp',
    naam: 'WhatsApp Ireland Ltd. (Meta)',
    beeld: true,
    waar: {
      nl: 'Dublin, Ierland (EU); Meta Platforms, Inc. in de Verenigde Staten',
      en: 'Dublin, Ireland (EU); Meta Platforms, Inc. in the United States',
    },
    wat: {
      nl: 'WhatsApp Business, voor klantcontact en voor bestellingen en foto’s die je ons daar stuurt, als je dat kanaal zelf kiest. De berichten zijn end-to-end versleuteld; WhatsApp verwerkt je telefoonnummer en gegevens over het gebruik van de dienst volgens zijn eigen voorwaarden',
      en: 'WhatsApp Business, for customer contact and for orders and photos you send us there, if you choose that channel yourself. Messages are end-to-end encrypted; WhatsApp processes your phone number and data about your use of the service under its own terms',
    },
    grond: {
      nl: 'volgens het privacybeleid van WhatsApp: het EU-VS Data Privacy Framework en standaardcontractbepalingen',
      en: 'according to WhatsApp’s privacy policy: the EU-U.S. Data Privacy Framework and Standard Contractual Clauses',
    },
  },
];

const taal = (lang) => (lang === 'nl' ? 'nl' : 'en');

/** Eén partij in de taal van de lezer: { id, naam, via, viaNaam, wat, waar, grond, beeld }. */
function inTaal(o, lang) {
  const l = taal(lang);
  const via = o.via ? ONTVANGERS.find((x) => x.id === o.via) : null;
  return {
    id: o.id,
    naam: o.naam,
    beeld: !!o.beeld,
    via: o.via || null,
    viaNaam: via ? via.naam : null,
    wat: o.wat[l],
    waar: o.waar[l],
    grond: o.grond[l],
  };
}

/** Wie het beeldmateriaal ontvangt: de lijst van §8 van de verwerkersovereenkomst. */
export function subverwerkers(lang = 'en') {
  return ONTVANGERS.filter((o) => o.beeld).map((o) => inTaal(o, lang));
}

/** Iedereen in deze lijst: §5 van het privacybeleid. */
export function ontvangers(lang = 'en') {
  return ONTVANGERS.map((o) => inTaal(o, lang));
}

const MAANDEN = {
  en: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
};

/** "8 October 2026" / "8 oktober 2026" — de datum van LIJST_GEWIJZIGD als tekst. */
export function lijstGewijzigdOp(lang = 'en') {
  const [j, m, d] = LIJST_GEWIJZIGD.split('-').map(Number);
  return `${d} ${MAANDEN[taal(lang)][m - 1]} ${j}`;
}

/** De regel boven de lijst: "Last changed: 8 October 2026". */
export function lijstRegel(lang = 'en') {
  return taal(lang) === 'nl'
    ? `Deze lijst is voor het laatst gewijzigd op ${lijstGewijzigdOp('nl')}.`
    : `This list was last changed on ${lijstGewijzigdOp('en')}.`;
}
