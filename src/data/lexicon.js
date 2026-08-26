/*
 * ═══════════════════════════════════════════════════════════════════════════
 * HOE DEZE STUDIO HAAR EIGEN PRODUCT NOEMT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 25 augustus 2026, met een schermafdruk van de prijstabel erbij:
 *
 *   *"Op de website worden meerdere woorden gebruikt voor alle beelden. Ik wil
 *   dat wanneer er algemeen wordt gepraat over beelden die visuails maakt de
 *   term EN 'visuals', NL 'beelden' wordt gebruikt, wanneer het gaat om catalog
 *   of lifestyle EN 'images', NL 'foto's'. Wanneer het gaat om Editions of
 *   andere stockafbeeldingpakketten EN 'stock photos', NL 'stockfoto's'.
 *   Wanneer het gaat om video content, ook hooks, EN 'videos', NL 'video's'."*
 *
 * ── DE CORRECTIE VAN DEZELFDE AVOND ────────────────────────────────────────
 *
 * De eerste versie van dit bestand las die afspraak als vier losse woorden en
 * gaf voor catalog en lifestyle allebei het kale "images" / "foto's" terug.
 * Lucas wees aan wat daar misging:
 *
 *   *"EN 'visuals', NL 'beelden', is het woord wanneer je praat over catalog,
 *   lifestyle en video content samen. Het hoeft niet achter elke categorie te
 *   staan. Voor catalog moeten het EN 'catalog images', NL 'catalog foto's',
 *   lifestyle EN 'lifestyle images', NL 'lifestyle foto's' zijn, en video
 *   content en hooks zijn EN 'videos', NL 'video's'."*
 *
 * Twee dingen tegelijk, en ze horen bij elkaar:
 *
 *   1. "visuals" / "beelden" is de PARAPLU. Het staat er wanneer catalog,
 *      lifestyle en video samen worden bedoeld, en verder niet.
 *   2. Noem je één categorie, dan draagt het woord die categorie: "catalog
 *      images", "lifestyle images", "videos". NOOIT de paraplu erachter
 *      geplakt — "catalog visuals", "lifestyle visuals", "stock visuals",
 *      "productvisuals" zijn precies de vorm die weg moet.
 *
 * Dat tweede punt is de reden dat catalog en lifestyle hieronder een EIGEN
 * ingang hebben in plaats van dat ze allebei naar 'photo' wijzen. Het juiste
 * woord voor catalog is niet "images" met een label erboven; het is "catalog
 * images". Een tabel die dat niet kan uitdrukken, kan de afspraak niet
 * afdwingen.
 *
 * ── WAAROM DIT EEN BESTAND IS EN GEEN ZOEK-EN-VERVANG ──────────────────────
 *
 * Omdat het anders binnen een maand weer scheef staat. Precies dat is er met
 * elk ander woord op deze site gebeurd: `turnaround()`, `reviewClaim()` en
 * `aftercare()` in pricing.js bestaan alledrie omdat een belofte die op elf
 * plekken is overgetypt, op elf plekken uit elkaar loopt. De noot bij
 * aftercare() zegt het letterlijk: *"eleven surfaces used to type a revision
 * count, every one of them had to be found and rewritten by hand."*
 *
 * Een woordkeuze is precies zo'n belofte. Vandaar: één tabel, één functie, en
 * een test die controleert dat de regel geldt in plaats van dat iemand hem
 * onthoudt.
 *
 * ── WAT DIT BESTAND NIET DOET ──────────────────────────────────────────────
 *
 * Het raakt geen lopende zinnen aan. Honderden zinnen op deze site bevatten een
 * van deze woorden midden in een verhaal, en die zijn per stuk een redactionele
 * keuze — sommige gaan over het aanbod als geheel ("beelden"), sommige over één
 * dienst ("catalogfoto's"), en dat verschil kan een functie niet zien. Dit
 * bestand dient de plekken waar het woord NAAST EEN GETAL of NAAST EEN
 * DIENSTNAAM staat, want daar is de categorie eenduidig en daar zat ook Lucas'
 * oorspronkelijke voorbeeld.
 *
 * De rest staat als inventarisatie in het rapport van 25 augustus 2026: 108
 * regels, 121 zinnen, per stuk met een voorstel.
 */

/**
 * De categorieën, enkelvoud en meervoud.
 *
 * MEERVOUD IS DE TWEEDE, en niet andersom, omdat vrijwel elke aanroep hier een
 * telling is en tellingen bijna altijd boven de één liggen. `noun()` hieronder
 * kiest zelf.
 */
export const NOUN = {
  /**
   * DE PARAPLU. Catalog, lifestyle en video samen — het hele aanbod.
   *
   * Dit woord hoort NIET achter een categorienaam. Wie "catalog visuals" of
   * "lifestyle-visuals" schrijft, gebruikt de paraplu als bijvoeglijk woord en
   * dat is de fout die deze tabel moet uitsluiten. Zie GLUED hieronder.
   */
  visual: { en: ['visual', 'visuals'], nl: ['beeld', 'beelden'] },

  /**
   * Stilstaand beeld zonder dat de categorie erbij hoeft.
   *
   * Twee gevallen, en allebei zijn ze echt:
   *   · Catalog én lifestyle samen (`complete`) — dat is geen van beide, dus de
   *     categorie kan er niet voor. Zeven foto's, niet zeven catalog foto's.
   *   · De categorie staat al in het label ernaast. Op /pricing heet de kolom
   *     "Catalogset"; daar "4 catalog foto's" onder zetten is dubbelop. Daar is
   *     `serviceNounShort()` en `countedShort()` voor.
   */
  photo: { en: ['image', 'images'], nl: ['foto', 'foto’s'] },

  /** Catalog, met de categorie in het woord. */
  catalog: { en: ['catalog image', 'catalog images'], nl: ['catalogfoto', 'catalogfoto’s'] },

  /** Lifestyle, met de categorie in het woord. */
  lifestyle: { en: ['lifestyle image', 'lifestyle images'], nl: ['lifestylefoto', 'lifestylefoto’s'] },

  /**
   * Voorraadbeeld: merk-neutraal, gedeeld, bruikbaar door elk merk.
   *
   * ⚠ NIET VOOR DE ON-BRAND SET VAN EDITIONS — 25 augustus 2026.
   *
   * Lucas' afspraak zei "Editions en andere stockafbeeldingpakketten". Toegepast
   * op het hele Editions-paneel leverde dat een pagina op die zichzelf tegensprak:
   * "Monthly stock photo drops" bovenaan en drie regels lager "why this is
   * anything but stock". Dat stond live, en het was mijn fout.
   *
   * De splitsing is geen compromis maar het verschil dat er echt is:
   *
   *   · DE GEDEELDE SET (STOCK_OFF_BRAND) is merk-neutraal en gaat naar
   *     iedereen. De site zegt het zelf: "usable by any brand". Dat ís stock,
   *     en daar staat het woord.
   *   · DE SET OP MAAT (STOCK_ON_BRAND, bij Editions) is gebouwd op één merk,
   *     één kleurenpalet, één stel locaties. De noot bij `id: 'editions'` in
   *     HomeV2.astro legt uit waarom het woord "stock" daar niet mag vallen:
   *     STOCK-IDEE.md wijst aan dat je op het terrein van een stockbank —
   *     vijftienduizend beelden voor $20 — niet wint, en dat jezelf zo noemen
   *     de vergelijking opzoekt die je verliest.
   *
   * Zolang er geen eigen woord is voor die tweede, draagt de paraplu hem:
   * "visuals" / "beelden". Dat klopt (het zijn geen catalog- of lifestylefoto's
   * en geen video) en het spreekt niets tegen. WIL JE ER EEN EIGEN WOORD VOOR —
   * "merkbeelden", "brand images", iets anders — dan hoort dat hier als vijfde
   * ingang, en niet als los woord op één pagina.
   *
   * tests/woorden.test.mjs houdt de twee uit elkaar en faalt zodra "stock"
   * terugkomt in het Editions-paneel.
   */
  stock: { en: ['stock photo', 'stock photos'], nl: ['stockfoto', 'stockfoto’s'] },

  /** Videoclips en hooks. De categorie zit al in het woord. */
  video: { en: ['video', 'videos'], nl: ['video', 'video’s'] },
};

/*
 * AANEENGESCHREVEN, EN DAT IS BESLIST — 25 augustus 2026.
 *
 * Lucas schreef de regel eerst als "catalog foto's", met een spatie, en zo
 * stond het hier een uur lang. Toen kwam de vraag terug of dat klopte, want de
 * rest van de site schrijft zulke samenstellingen juist aan elkaar: VideoPage
 * zegt "Catalog- en lifestylefoto's" en op dertig plekken staat "catalogset".
 * Nederlandse spelling wil hetzelfde. Zijn antwoord was: omdraaien.
 *
 * Dat het één wijziging was in plaats van vijfenveertig, is precies waarom deze
 * tabel bestaat. De vorige keer dat een woord op vijfenveertig plekken stond,
 * duurde het een avond om ze te vinden.
 *
 * ENGELS BLIJFT LOS: "catalog images", "lifestyle images". Dat is daar de
 * juiste vorm en geen inconsequentie — Engels schrijft samenstellingen open
 * waar Nederlands ze sluit.
 */

/*
 * DE RECHTE APOSTROF STAAT ER NIET, EN DAT IS GEEN SLORDIGHEID.
 * "foto's" met een rechte ' botst met de typografie van de rest van de site,
 * die overal ’ gebruikt (zie de bestaande NL-teksten in pricing.js: "foto’s",
 * "vier foto’s"). Eén afwijkend teken in een kolomkop valt op in een font met
 * echte apostrofen. Wie hier een rechte apostrof typt, breekt de eenheid van de
 * pagina zonder dat een test het merkt — vandaar deze noot en niet alleen het
 * teken.
 */

/**
 * De vormen die NIET mogen: de paraplu achter een categorienaam geplakt.
 *
 * Dit is Lucas' correctie als patroon in plaats van als voorbeeld, zodat
 * tests/woorden.test.mjs erop kan zoeken. Elk van deze staat vandaag nog ergens
 * op de site; ze staan in het rapport van 25 augustus met regelnummer erbij.
 */
export const GLUED = [
  /\bcatalog[\s-]?visuals?\b/i,
  /\blifestyle[\s-]?visuals?\b/i,
  /\bstock[\s-]?visuals?\b/i,
  /* "productvisuals" staat hier BEWUST NIET bij. "product" is geen van de vier
     categorieën, dus dat woord gebruikt de paraplu zoals het hoort: het dekt
     foto's én video. Op /catalog stond het wél fout — daar gaat de hele pagina
     over catalog — en daar is het vervangen. Op /privacy, /about, /terms en in
     de voettekst is het het aanbod als geheel en blijft het staan. */
  /\bcatalog(us)?beeld(en)?\b/i,
  /\bstockbeeld(en)?\b/i,
];

/**
 * Welke categorie hoort bij welke dienst.
 *
 * `complete` is catalog én lifestyle, dus stilstaand beeld zonder categorie:
 * 'photo'. Dat is de regel waar Lucas' eerste voorbeeld op strandde — "7
 * beelden" waar "7 foto's" hoort.
 *
 * `hooks` staat er al in terwijl die dienst nog niet leverbaar is. Met opzet:
 * de dag dat hij aangaat, is het woord al goed. Een tabel die pas wordt
 * bijgewerkt als de dienst live gaat, is een tabel die op de dag van de
 * lancering fout staat.
 */
export const KIND_OF_SERVICE = {
  catalog: 'catalog',
  lifestyle: 'lifestyle',
  complete: 'photo',
  video: 'video',
  hooks: 'video',
  editions: 'stock',
  stock: 'stock',
  /* De proefvisual levert óf een catalogset óf een lifestyle-carousel — welke
     van de twee weet de aanroeper pas als de klant kiest, dus geen van beide
     categorieën kan er hard voor. Vandaar het kale woord. */
  'test-sample': 'photo',
};

/**
 * Waar een categorie op terugvalt als de naam ervan al ergens anders staat.
 *
 * "catalog foto's" onder een kop die "Catalogset" heet, is het woord twee keer.
 * Deze tabel zegt welk woord er dan overblijft. Alleen catalog en lifestyle
 * hebben een kortere vorm: "videos" en "stock photos" dragen hun categorie in
 * één woord en worden er niet korter op.
 */
const SHORTER = {
  catalog: 'photo',
  lifestyle: 'photo',
};

/**
 * Het juiste woord voor een categorie, in een taal, in het juiste getal.
 *
 * @param {keyof NOUN} kind
 * @param {'en'|'nl'} lang
 * @param {number} count  1 geeft enkelvoud, al het andere meervoud.
 *
 * GOOIT BIJ EEN ONBEKENDE CATEGORIE, net als perProduct() en reviewClaim() in
 * pricing.js. Stil terugvallen op 'visual' zou betekenen dat een typefout in een
 * aanroep een verkeerd woord op de pagina zet dat niemand meer terugvindt.
 */
export function noun(kind, lang = 'en', count = 2) {
  const entry = NOUN[kind];
  if (!entry) {
    throw new Error(
      `lexicon.js: onbekende categorie "${kind}". Gebruik: ${Object.keys(NOUN).join(', ')}.`,
    );
  }
  const pair = entry[lang] || entry.en;
  return count === 1 ? pair[0] : pair[1];
}

/**
 * Het woord dat bij een DIENST hoort, zonder dat de aanroeper de categorie hoeft
 * te kennen. Dit is de vorm die een lopende zin wil: `serviceNoun('catalog',
 * 'nl')` → "catalog foto's".
 */
export function serviceNoun(service, lang = 'en', count = 2) {
  const kind = KIND_OF_SERVICE[service];
  if (!kind) {
    throw new Error(
      `lexicon.js: onbekende dienst "${service}". Gebruik: ${Object.keys(KIND_OF_SERVICE).join(', ')}.`,
    );
  }
  return noun(kind, lang, count);
}

/**
 * Hetzelfde, maar zonder de categorie ervoor — voor als het label ernaast de
 * categorie al noemt.
 *
 * WAAROM DIT EEN EIGEN FUNCTIE IS EN GEEN OPTIE-OBJECT. Een aanroep met
 * `{ short: true }` erin leest als een instelling; `serviceNounShort()` leest
 * als een uitzondering, en dat is het ook. Wie hem op /pricing tegenkomt, ziet
 * meteen dat daar iets afwijkends gebeurt en kan in deze noot lezen waarom.
 */
export function serviceNounShort(service, lang = 'en', count = 2) {
  const kind = KIND_OF_SERVICE[service];
  if (!kind) {
    throw new Error(
      `lexicon.js: onbekende dienst "${service}". Gebruik: ${Object.keys(KIND_OF_SERVICE).join(', ')}.`,
    );
  }
  return noun(SHORTER[kind] || kind, lang, count);
}

/**
 * Een aantal met het juiste woord erachter: `counted('catalog', 4, 'nl')` →
 * "4 catalog foto's".
 *
 * Het getal komt hier binnen in plaats van dat de aanroeper zelf een spatie
 * plakt, zodat enkelvoud nooit vergeten kan worden. Een dienst die ooit één
 * beeld levert, leest dan vanzelf "1 catalog foto" en niet "1 catalog foto's".
 */
export function counted(service, count, lang = 'en') {
  return `${count} ${serviceNoun(service, lang, count)}`;
}

/**
 * Hetzelfde zonder de categorie ervoor: `countedShort('catalog', 4, 'nl')` →
 * "4 foto's". Voor onder een kop die de categorie al noemt.
 */
export function countedShort(service, count, lang = 'en') {
  return `${count} ${serviceNounShort(service, lang, count)}`;
}
