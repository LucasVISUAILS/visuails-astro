/*
 * ═══════════════════════════════════════════════════════════════════════════
 * MOET DE KLANT ZIJN EIGEN PRODUCT OPSTUREN?
 * 10 september 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Wellicht bij sommige services ook een label toevoegen met 'Photo's
 * made using your own real product' of iets in die richting om bij sommige
 * services te laten zien dat het product van de klant daarvoor word gebruikt.
 * Bij Editions is dat bijvoorbeeld niet het geval en is het puur foto's voor
 * sfeer en branding."*
 *
 * ── WAAROM DIT MEER IS DAN EEN ETIKET ───────────────────────────────────────
 *
 * Dit is de eerste vraag die iemand op /start heeft, ook al staat hij nergens:
 * moet ik mijn spullen opsturen, ja of nee? Zolang dat antwoord per deur ergens
 * in een zin verstopt zit, leest een bezoeker negen deuren om erachter te komen
 * dat er eigenlijk twee soorten zijn. Vandaar dat dit bestand niet alleen het
 * WOORD levert maar ook de SORTEERVOLGORDE: /start groepeert de deuren hierop.
 *
 * ── WAAROM HET EEN EIGEN BESTAND IS ─────────────────────────────────────────
 *
 * services.js is een namenkaart op WIRE-WAARDEN (`drop`, `custom`) — de
 * waarden die in orders.service staan. De negen deuren op /start hebben hun
 * eigen ids (`video-scene`, `custom-photo`) omdat één wire-waarde meerdere
 * deuren kan bedienen. Twee sleutelruimtes in één bestand is precies waar de
 * kop van services.js voor waarschuwt, dus dit staat ernaast in plaats van
 * erin. Wie een deur toevoegt, komt hier langs — en de toets hieronder zegt het
 * als hij dat niet doet.
 *
 * ── DE FORMULERING ──────────────────────────────────────────────────────────
 *
 * Lucas, 10 september: *"Verander het naar 'Gemaakt met de foto's van jouw eigen
 * product' of iets in die richting, het liefst kort houden."*
 *
 * Er stond "Met jouw product", en dat las als: stuur je spullen op. Dat doet
 * niemand hier — je stuurt FOTO'S van je product, met een telefoon bij een raam
 * gemaakt, en dat is het hele verschil met een fotoshoot. Een etiket dat het
 * pakket suggereert, verkoopt precies de drempel die deze studio niet heeft.
 * Vandaar "Van jouw eigen productfoto's": vier woorden, en het zegt zowel wat
 * je levert als hoe weinig dat is.
 *
 * Het woord "real" uit Lucas' eerste voorstel is eruit gebleven: het roept een
 * vraag op die niemand had — als er "echt product" staat, gaat iemand zich
 * afvragen wanneer het dan níet echt is.
 *
 * De tegenhanger is met opzet GEEN ontkenning van de eerste, maar een eigen
 * belofte: "Geen productfoto nodig". Voor Editions is dat niet een gemis maar
 * juist de reden dat het bestaat — je kunt bestellen in de maanden dat je niets
 * nieuws hebt om te fotograferen.
 *
 * En de derde, "Met of zonder jouw product", is een ANTWOORD en geen slag om de
 * arm. Bij werk op maat zeg je wat je wilt; of je product erin komt is een van
 * de dingen die je zegt. Een etiket dat daar één van de twee zou kiezen, zou
 * een beperking verzinnen die er niet is.
 */

/*
 * ── DRIE STANDEN EN NIET TWEE — 10 september 2026 ──────────────────────────
 *
 * Lucas: *"Hooks en Video altijd met product foto's van klant. Custom videos of
 * foto's kunnen zowel met als zonder product van klant."*
 *
 * Daarmee vervalt de tweedeling waar dit bestand mee begon. `hooks` en
 * `video-custom` stonden hier op een LEZING — de tekst van die deuren noemt het
 * product niet met zoveel woorden — en die lezing is nu beantwoord: hooks en de
 * twee vaste video's zijn altijd met, en juist het werk op maat kan allebei.
 *
 * Dat is geen detail voor het etiket maar voor de belofte eronder. "Met of
 * zonder jouw product" is bij werk op maat namelijk het ANTWOORD en geen
 * onzekerheid: dat is precies wat op maat betekent — je zegt wat je wilt, en of
 * je product erin komt is een van de dingen die je zegt.
 */

/* Deze deuren gebruiken altijd de productfoto's van de klant.
 *
 * `complete` stond hier ook. Die dienst bestaat nog — de route /start/complete
 * en de sleutel in de ladder zijn ongemoeid — maar hij is sinds 10 september
 * geen DEUR meer op /start (zie de noot daar), en deze lijst gaat over de
 * deuren die daar staan. De combinatie erft haar etiket van catalog, want het
 * is dezelfde bestelling met lifestyle erbij. */
export const MET_EIGEN_PRODUCT = [
  'catalog',
  'lifestyle',
  'video-product',
  'video-scene',
  'hooks',
];

/** En bij deze kan het allebei — dat is wat "op maat" betekent. */
export const BEIDE_KAN = [
  'custom-photo',
  'video-custom',
];

/** Alle deuren die /start kent, zodat de toets kan zien of er één ontbreekt. */
export const ALLE_DEUREN = [...MET_EIGEN_PRODUCT, ...BEIDE_KAN, 'editions'];

/**
 * In welke van de drie standen valt deze deur?
 * 'met' — de klant stuurt zijn productfoto's op
 * 'beide' — kan met en kan zonder
 * 'zonder' — er is geen product nodig
 */
export function productStand(id) {
  const k = String(id || '');
  if (MET_EIGEN_PRODUCT.includes(k)) return 'met';
  if (BEIDE_KAN.includes(k)) return 'beide';
  return 'zonder';
}

/** Gebruikt deze dienst altijd het product van de klant? Blijft bestaan voor
 *  wie alleen die vraag heeft; wie het etiket zet, gebruikt productStand(). */
export function metEigenProduct(id) {
  return MET_EIGEN_PRODUCT.includes(String(id || ''));
}

export const PRODUCT_COPY = {
  en: {
    met: 'From your own product photos',
    zonder: 'No product photo needed',
    beide: 'With or without your product',
    metGroep: 'We photograph your product',
    zonderGroep: 'Nothing to send in',
    /* Eén zin onder elke groepskop. Hij zegt wat de groep IS en niet wat er
       mooi aan is — dat staat al op de deuren zelf. */
    metUitleg: 'You send the product, we make the images. Front, back, detail, worn — the real thing.',
    zonderUitleg: 'Atmosphere and branding, made without your product ever leaving the shelf.',
  },
  nl: {
    met: 'Van jouw eigen productfoto’s',
    zonder: 'Geen productfoto nodig',
    beide: 'Met of zonder jouw product',
    metGroep: 'Wij fotograferen jouw product',
    zonderGroep: 'Niets op te sturen',
    metUitleg: 'Jij stuurt het product, wij maken de beelden. Voor, achter, detail, gedragen — het echte ding.',
    zonderUitleg: 'Sfeer en branding, gemaakt zonder dat jouw product de plank af hoeft.',
  },
};

/** Het etiket dat bij deze deur hoort, in de taal van de pagina. */
export function productLabel(id, lang = 'en') {
  const c = PRODUCT_COPY[lang === 'nl' ? 'nl' : 'en'];
  return c[productStand(id)];
}
