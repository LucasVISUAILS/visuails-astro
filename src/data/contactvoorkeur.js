/*
 * ═══════════════════════════════════════════════════════════════════════════
 * HOE DE KLANT BEREIKT WIL WORDEN
 * 11 september 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Ik wil daarnaast over de gehele website telefoonnummer voor whatsapp
 * ook verplicht maken behalve bij contact, daar is alleen mail echt verplicht.
 * De klant mag wel een contact voorkeur hebben (mail of whatsapp)."*
 *
 * ── WAAROM DIT EEN EIGEN BESTAND IS EN GEEN TWEE STRINGS PER FORMULIER ──────
 *
 * De vraag komt op vijf plekken te staan — het bestelformulier, het
 * abonnementsformulier, de merkmodelbrief, de wachtpagina en /contact — en het
 * ANTWOORD landt in één kolom op `customers`. Vijf keer twee woordjes typen is
 * vijf kansen om er "Whatsapp", "WhatsApp" of "whatsapp" van te maken, en
 * daarna een adminscherm dat op de verkeerde vergelijkt.
 *
 * Dus: de twee waarden staan hier, de woorden staan hier, en normaliseren
 * gebeurt hier. Wat er uit een formulier komt is niet te vertrouwen — een oude
 * pagina, een bot, een script dat niet draaide — dus alles wat niet één van de
 * twee is, valt terug op e-mail.
 *
 * ── WAAROM E-MAIL DE TERUGVAL IS ────────────────────────────────────────────
 *
 * Omdat het adres het enige is dat we ZEKER hebben. Op /contact is het
 * telefoonnummer optioneel (dat is Lucas' uitzondering), dus daar kan iemand
 * "WhatsApp" kiezen en geen nummer achterlaten. Dan is de voorkeur een wens
 * zonder adres, en de studio hoort de klant gewoon te mailen in plaats van te
 * zoeken. `voorkeurMet()` hieronder doet precies dat: een voorkeur voor
 * WhatsApp zonder nummer IS geen voorkeur voor WhatsApp.
 */

/** De twee waarden zoals ze in de database en in de POST staan. */
export const VOORKEUREN = ['email', 'whatsapp'];

/** De standaard, en de terugval voor alles wat we niet herkennen. */
export const VOORKEUR_STANDAARD = 'email';

/**
 * Maak van wat er binnenkomt één van de twee waarden.
 * Alles wat niet letterlijk 'whatsapp' is, wordt e-mail — zie de kop.
 */
export function normaliseerVoorkeur(raw) {
  const v = String(raw || '').trim().toLowerCase();
  return VOORKEUREN.includes(v) ? v : VOORKEUR_STANDAARD;
}

/**
 * De voorkeur zoals hij ECHT geldt, gegeven wat we van de klant hebben.
 *
 * Zonder telefoonnummer is "WhatsApp" een voorkeur waar niemand iets mee kan.
 * Deze functie is de enige plek die dat weet, zodat het adminscherm, de
 * bevestigingsmail en het portaal niet elk hun eigen versie van die regel
 * verzinnen.
 */
export function voorkeurMet(raw, telefoon) {
  const v = normaliseerVoorkeur(raw);
  if (v === 'whatsapp' && !String(telefoon || '').trim()) return VOORKEUR_STANDAARD;
  return v;
}

/*
 * DE WOORDEN. `vraag` is het label boven de twee knoppen, `email` en `whatsapp`
 * zijn de knoppen zelf, en `noot` staat eronder.
 *
 * De noot zegt met opzet wat er GEBEURT en niet wat je moet doen: een klant die
 * WhatsApp kiest, wil weten of hij dan nog mail krijgt. Ja — de factuur en de
 * link naar zijn beelden gaan altijd per mail, want die moet je terug kunnen
 * vinden. De voorkeur gaat over de VRAGEN die wij stellen tijdens het werk.
 */
export const VOORKEUR_COPY = {
  en: {
    vraag: 'How should we reach you?',
    email: 'Email',
    whatsapp: 'WhatsApp',
    noot: 'For questions while we work. Your invoice and the link to your images always come by email.',
    /* Alleen op /contact, waar een nummer optioneel is. */
    nootZonderNummer: 'Pick WhatsApp and leave a number, and we answer there.',
  },
  nl: {
    vraag: 'Hoe kunnen we je het beste bereiken?',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    noot: 'Voor vragen tijdens het werk. Je factuur en de link naar je beelden gaan altijd per mail.',
    nootZonderNummer: 'Kies WhatsApp en laat een nummer achter, dan antwoorden we daar.',
  },
};

/** Het woord voor één voorkeur, in de taal van de pagina. */
export function voorkeurLabel(waarde, lang = 'nl') {
  const c = VOORKEUR_COPY[lang === 'en' ? 'en' : 'nl'];
  return c[normaliseerVoorkeur(waarde)];
}
