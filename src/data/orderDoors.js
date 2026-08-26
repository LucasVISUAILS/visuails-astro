// VISUAILS — DE ZES DEUREN NAAR EEN BESTELLING. 21 augustus 2026.
//
// ── WAAROM DIT BESTAND ER IS ────────────────────────────────────────────────
//
// Lucas: *"als je op /catalog zit en je klikt op start an order kom je weer bij
// het keuzemenu van catalog, lifestyle en complete. Ik wil dat je alle services
// kan kiezen op die pagina en dat er niet start an order staat maar iets van
// Get Catalog visuals."*
//
// Dat was één symptoom van een fout die overal zat. Gemeten op 21 augustus, op
// de gebouwde site:
//
//   /catalog          4× "Start an order" → /start,  0× → /start/catalog
//   /lifestyle        4× "Start an order" → /start,  0× → /start/lifestyle
//   /custom-models    3× "Start an order" → /start,  0× → /start/brand-model
//   /video            3× → /start/video  én  1× → /start   (de enige die het
//                     halveerde, en zelfs daar lekte er één terug)
//
// En /start opent met de kop "What are we making?" — de vraag die de bezoeker
// net een pagina lang beantwoord had. Het gevolg was omgekeerd aan wat je wilt:
// wie de dienstpagina LAS deed er drie klikken over naar het formulier, wie hem
// oversloeg twee. De geïnformeerde bezoeker werd gestraft.
//
// ── WAT HIER STAAT, EN WAAROM HET ÉÉN LIJST IS ─────────────────────────────
//
// Zes deuren, elk met drie dingen: waar je erover LEEST, waar je hem BESTELT, en
// hoe de knop heet. Die drie hoorden bij elkaar en stonden verspreid over
// catalogStyles.js, styles.js, videoStyles.js, vier paginacomponenten en
// TierCompare.astro — met per plek een eigen mening over waar "Start an order"
// heen ging. Eén lijst betekent dat een nieuwe dienst één regel is, en dat een
// knop niet meer naar een keuzemenu kan wijzen zonder dat iemand het merkt.
//
// `lees` is null voor "Allebei": daar bestaat geen hubpagina voor, en dat is
// juist — het is geen aparte dienst maar de twee andere samen, dus de enige
// zinnige plek om erover te lezen is /catalog of /lifestyle.
//
// DE CTA-TEKST IS EEN BELOFTE OVER WAT ER GEBEURT ALS JE KLIKT. "Start an order"
// op een dienstpagina beloofde een bestelling en leverde een keuzemenu. De
// teksten hieronder noemen wat je krijgt, en ze gaan naar de plek waar je dat
// krijgt. Dat is dezelfde regel als bij elke andere knop op deze site.

export const DOORS = [
  {
    id: 'catalog',
    lees: '/catalog',
    bestel: '/start/catalog',
    naam: { en: 'Catalog', nl: 'Catalog' },
    cta: { en: 'Order catalog images', nl: 'Bestel catalogfoto’s' },
    kort: { en: 'Front, back, detail and on-model', nl: 'Voorkant, achterkant, detail en on-model' },
  },
  {
    id: 'lifestyle',
    lees: '/lifestyle',
    bestel: '/start/lifestyle',
    naam: { en: 'Lifestyle', nl: 'Lifestyle' },
    cta: { en: 'Order lifestyle images', nl: 'Bestel lifestylefoto’s' },
    kort: { en: 'Your product in a styled scene', nl: 'Je product in een gestylede scène' },
  },
  {
    id: 'complete',
    lees: null,
    bestel: '/start/complete',
    naam: { en: 'Both together', nl: 'Allebei' },
    cta: { en: 'Order both together', nl: 'Bestel allebei' },
    kort: { en: 'A catalog set and a carousel per product', nl: 'Een catalogset en een carousel per product' },
  },
  {
    id: 'video',
    lees: '/video',
    bestel: '/start/video',
    naam: { en: 'Video', nl: 'Video' },
    cta: { en: 'Ask about a video clip', nl: 'Vraag een videoclip aan' },
    kort: { en: 'A short clip on any product in the order', nl: 'Een korte clip op elk product uit de bestelling' },
  },
  {
    id: 'brand-model',
    lees: '/custom-models',
    bestel: '/start/brand-model',
    naam: { en: 'Brand Model', nl: 'Merkmodel' },
    cta: { en: 'Start your Brand Model', nl: 'Start je merkmodel' },
    kort: { en: 'One face, used by nobody else', nl: 'Eén gezicht, door niemand anders gebruikt' },
  },
  {
    id: 'plan',
    lees: '/plans',
    bestel: '/start/plan',
    naam: { en: 'Monthly plan', nl: 'Abonnement' },
    cta: { en: 'Start a plan', nl: 'Start een abonnement' },
    kort: { en: 'A fixed number of products each month', nl: 'Elke maand een vast aantal producten' },
  },
];

const OP_ID = Object.fromEntries(DOORS.map((d) => [d.id, d]));

/**
 * Eén deur, of null.
 *
 * NULL EN GEEN VERZINSEL, zelfde regel als serviceLabel() in services.js: een
 * onbekende id levert niets op, en de aanroeper valt terug op wat hij toch al
 * ging tonen. Een knop met een geraden bestemming is erger dan geen knop.
 */
export function door(id) {
  return OP_ID[id] || null;
}

/** De knoptekst van een deur, in de taal van de pagina. */
export function doorCta(id, lang) {
  const d = OP_ID[id];
  return d ? (d.cta[lang] || d.cta.en) : null;
}

/** Waar de knop van een deur heen gaat — zonder taalvoorvoegsel. */
export function doorHref(id) {
  const d = OP_ID[id];
  return d ? d.bestel : null;
}

/**
 * De andere deuren, voor de keuzerij onder een knop.
 *
 * `zonder` mag ook een lijst zijn: op /video hoort "Allebei" er niet bij te
 * staan, want dat gaat over catalog en lifestyle en niet over clips.
 */
export function andereDeuren(zonder) {
  const uit = new Set([].concat(zonder || []));
  return DOORS.filter((d) => !uit.has(d.id));
}
