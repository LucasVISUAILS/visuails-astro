// VISUAILS — de hoofdboodschap, op één plek. Augustus 2026.
//
// WAAROM DIT BESTAAT. Lucas, bij het kiezen van de nieuwe kop: *"nieuwe kop
// doortrekken naar <title>, og:image-tekst en de mailonderwerpen, anders staat
// de oude er over drie maanden nog ergens."* Dat is precies wat er met de
// vorige gebeurde: "The brand you envisioned, visualized" stond in HomeV2.astro
// en verder nergens, dus vervangen was makkelijk — maar dat was geluk, niet
// ontwerp. Zodra dezelfde zin op drie schermen staat, is het een kwestie van
// tijd tot er twee versies van rondlopen.
//
// Dus: hier staat hij, en de kop op de homepage, de voettekst van elke mail en
// het deelplaatje lezen hem uit dit bestand. Wie hem wil veranderen, verandert
// hem hier en overal tegelijk.
//
// WAAROM `lines` EN `plain` ALLEBEI. De <h1> breekt de zin zelf af — dat is
// geen opmaakdetail maar een ontwerpbeslissing (zie de noot bij COPY.en.h1 in
// HomeV2.astro: het accent zit in de copy en de regelval is gekozen, niet
// toevallig). Een mailvoettekst en een og-plaatje willen dezelfde zin zonder
// die regels. Twee vormen van één zin, uit één bron, in plaats van twee zinnen
// die vandaag toevallig overeenkomen.
//
// DE <title> STAAT HIER NIET, EN DAT IS EXPRES. Een paginatitel is een
// zoekresultaat: die moet beginnen met waar iemand op zoekt ("productbeelden
// voor kledingmerken"), niet met een slogan. Een titel die de kop herhaalt in
// plaats van de dienst benoemt, kost posities. De titels staan daarom in
// src/pages/index.astro en src/pages/nl/index.astro, en het enige wat ze met
// dit bestand delen is de belofte, niet de bewoording.

/** @type {Record<'en'|'nl', { lines: string[], plain: string }>} */
/* ── DE KOP ZEGT DE CATEGORIE, NIET HET PROJECT — 20 september 2026 ─────────
   Hier stond "Jij uploadt. Wij leveren de campagne." Lucas: *"visuails is meer
   dan dat … we maken niet alleen campagnes maar we zijn een managed full
   content service voor fashion merken."*

   Wat er misging met de oude kop is precies dat woord: "campagne" is één
   project met een begin en een eind, en de dienst is een doorlopende
   beeldvoorziening voor een hele catalogus. Een merk met tweehonderd producten
   herkende zich er niet in.

   DE NIEUWE NOEMT DE CATEGORIE EN DE BELOFTE IN ÉÉN ADEM. "Al je
   productbeelden" zegt dat het om de hele collectie gaat en niet om één setje;
   "Zonder shoot" zegt wat het vervangt. Vier woorden, en je weet wat je koopt.

   `<em>` markeert het zinsdeel dat het accent draagt. Sinds vandaag is dat een
   violette LETTER en geen violet vlak meer — zie `.hero-h1 em` in
   src/styles/stijl22.css voor waarom. */
export const TAGLINE = {
  en: {
    lines: ['All your <em>product imagery</em>.', 'Without a shoot.'],
    plain: 'All your product imagery. Without a shoot.',
  },
  nl: {
    lines: ['Al je <em>productbeelden</em>.', 'Zonder shoot.'],
    plain: 'Al je productbeelden. Zonder shoot.',
  },
};

/** @param {'en'|'nl'} lang */
export function tagline(lang) {
  return TAGLINE[lang] || TAGLINE.en;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HET MERKTEKEN — 8 september 2026
   ═══════════════════════════════════════════════════════════════════════════

   Lucas: *"Ook ® overal verwijderen omdat je dit volgens mij niet zomaar mag
   gebruiken. Als dat wel kan, houden."*

   WAT DE BRONNEN ZEGGEN, EN DAT ZIJN ER TWEE DIE HET NIET EENS ZIJN.

   BOIP — het Benelux-merkenbureau zelf — schrijft: "Er is echter geen wet die
   verbiedt dat niet-geregistreerde merken ook het ®teken gebruiken." Naar de
   letter van het merkenrecht mag het in de Benelux dus.

   Maar het merkenrecht is niet de enige wet die erover gaat. Een ® bij een
   naam die niet is ingeschreven is een mededeling over je eigen positie die
   niet klopt, en dat valt onder misleidende handelspraktijken (art. 6:193c BW,
   uit de Europese richtlijn). Specialisten schrijven het scherper op dan BOIP:
   "Zonder deze formele registratie is gebruik van het ®-symbool misleidend en
   mogelijk strafbaar."

   WAAROM HET DAN TOCH WEGGAAT. Niet omdat het zeker verboden is — dat is het
   in de Benelux blijkbaar niet. Maar omdat de afweging scheef staat: het ®
   levert niets op (het staat in een labelregel, als typografisch detail) en
   het kost in het slechtste geval een klacht over misleiding, van een
   concurrent of van iemand die het merk wél heeft. Bovendien is de VS
   strenger — daar is onterecht ®-gebruik "false marking" — en de site verkoopt
   in het Engels.

   ™ MAG WÉL, ALTIJD. Dat teken zegt "wij voeren dit als merk", en daar hoort
   geen inschrijving bij. Het houdt het detail dat het label mooi maakte, en
   het beweert niets wat niet waar is.

   ÉÉN CONSTANTE EN GEEN ZEVEN. Het teken stond letterlijk overgetypt op zeven
   plekken in vijf bestanden. Dat is precies de vorm waarin dit soort dingen
   half blijft staan bij de volgende ronde. Schrijft Lucas VISUAILS ooit in bij
   BOIP of EUIPO, dan is dit één regel — en dan klopt hij ook meteen overal.

   DE CSS HEEFT ZIJN EIGEN KOPIE, EN DIE IS VASTGEZET. `.eyebrow-page::before`
   kan geen JavaScript lezen, dus daar staat `--merkteken` in :root. Dat is een
   tweede waarheid, en die wordt door tests/merkteken.test.mjs aan deze
   vastgeknoopt: lopen ze uit elkaar, dan wordt er iets rood. */
export const MERKTEKEN = '™';

/** De merknaam met zijn teken: "VISUAILS™". Gebruik dit, niet de losse letters. */
export const MERK = `VISUAILS${MERKTEKEN}`;
