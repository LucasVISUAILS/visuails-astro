// VISUAILS — de voor/na-paren op de homepage.
//
// ═══════════════════════════════════════════════════════════════════════════
// WAAROM DIT EEN LIJST IS, EN VANDAAG ÉÉN LANG
// ═══════════════════════════════════════════════════════════════════════════
//
// Lucas, 30 augustus 2026, over de ingekorte homepage: *"kijken welke sectie
// meerdere voorbeelden moet krijgen want 1 foto als bewijs in de tweede is
// natuurlijk niet genoeg."*
//
// Dat klopt, en het is de scherpste opmerking over deze pagina tot nu toe. De
// hele homepage vraagt de bezoeker één ding te geloven — dat een telefoonfoto
// van zijn eigen product genoeg is — en het enige beeld dat dat BEWIJST is dit
// paar. Eén paar is een voorbeeld; drie paren zijn een werkwijze.
//
// ── EN WAAROM ER TOCH ÉÉN STAAT ────────────────────────────────────────────
//
// Omdat er op schijf precies één echt paar is. Dat staat al sinds augustus in
// de code opgeschreven, in de kop van FigFanOut.astro:
//
//   "De twee foto's hier zijn het ENE paar op schijf dat een echte afleiding is:
//    catalog-before.webp is een echte telefoonfoto — een gewassen shirt plat op
//    een kantoortafel, raamlicht, bureaustoelen in beeld — en catalog-after.webp
//    is datzelfde kledingstuk, uitgesneden en belicht op wit."
//
// Alle andere beelden in public/img zijn OUTPUT. Mooi, echt, en bruikbaar als
// werk — maar er is geen bronfoto bij, en twee losse beelden onder een pijl
// zetten zou zeggen "dit werd dat" terwijl dat niet waar is. Dat is precies wat
// de opdracht van deze site verbiedt: geen bewijs verzinnen.
//
// ── DUS IS DE SECTIE GEBOUWD OM TE GROEIEN ─────────────────────────────────
//
// De opmaak leest deze lijst en past zich aan het aantal aan: één paar staat
// naast de tekst, twee of meer staan in een raster eronder. Komt er een tweede
// echt paar, dan is dat vier regels in dit bestand en verder niets — geen
// component, geen stijl, geen tweede plek waar het aantal getypt staat.
//
// WAT LUCAS DAARVOOR MOET AANLEVEREN, per paar:
//   · de originele telefoonfoto zoals de klant hem instuurde, ongeretoucheerd;
//   · het beeld dat daaruit geleverd is;
//   · en toestemming van die klant om beide te tonen.
//
// Die derde is geen formaliteit. De bronfoto is van de klant, hij laat zijn
// werkplek of zijn tafel zien, en hij komt op de voorpagina te staan.
//
// ── DE MATEN STAAN ERBIJ, EN DAT IS EEN EIS ────────────────────────────────
//
// Compare.astro werpt bij de bouw op een beeld zonder bekende afmeting, omdat
// een <img> zonder width/height de pagina laat verspringen zodra hij binnenkomt.
// Ze staan hier dus per bestand, gelezen uit het bestand zelf en niet geschat.
// tests/voorbeelden.test.mjs kijkt na of elk pad ook echt bestaat.

/**
 * Elk paar: wat er is ingestuurd, wat eruit kwam, en per taal een korte regel
 * die zegt wat je ziet.
 *
 * `alt` is bewust beschrijvend en niet wervend: het is de tekst die een
 * schermlezer voorleest, en "prachtig eindresultaat" vertelt die lezer niets.
 */
export const VOORBEELDEN = [
  {
    id: 'shirt',
    voor: { src: '/img/catalog-before-1x1.webp', w: 1350, h: 1350 },
    na: { src: '/img/catalog-after.webp', w: 1800, h: 1800 },
    /* De beeldverhoudingen verschillen (3:4 bron, 1:1 geleverd), dus het
       vierkante uitsnede van de bron staat hier apart in public/img. Zonder dat
       zou het product aan een rand worden afgeknipt — zie objectPosition in
       Compare.astro voor de andere helft van diezelfde oplossing. */
    en: {
      alt: ['The raw phone photo a client sent in', 'The finished VISUAILS catalog image made from it'],
      cap: 'A washed tee, flat on an office table, window light.',
    },
    nl: {
      alt: ['De ruwe telefoonfoto die een klant instuurde', 'De afgewerkte VISUAILS-catalogfoto die daaruit is gemaakt'],
      cap: 'Een gewassen shirt, plat op een kantoortafel, raamlicht.',
    },
  },
];

/** De paren met de teksten van één taal er al in. */
export function voorbeelden(lang = 'en') {
  const l = lang === 'nl' ? 'nl' : 'en';
  return VOORBEELDEN.map((v) => ({ id: v.id, voor: v.voor, na: v.na, ...v[l] }));
}

/**
 * Elk bestand dat deze lijst noemt, één keer, zonder dubbele.
 *
 * Voor de toets die nagaat of ze op schijf staan. Als lijst hier en niet als
 * glob in de toets, want dan zou die toets het antwoord uit dezelfde bron
 * halen als de vraag.
 */
export function voorbeeldBestanden() {
  return [...new Set(VOORBEELDEN.flatMap((v) => [v.voor.src, v.na.src]))];
}
