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
export const TAGLINE = {
  en: {
    // <em> markeert het woord dat gifgroen wordt. De kop rendert met set:html.
    lines: ['You upload.', 'We deliver the <em>campaign</em>.'],
    plain: 'You upload. We deliver the campaign.',
  },
  nl: {
    lines: ['Jij uploadt.', 'Wij leveren de <em>campagne</em>.'],
    plain: 'Jij uploadt. Wij leveren de campagne.',
  },
};

/** @param {'en'|'nl'} lang */
export function tagline(lang) {
  return TAGLINE[lang] || TAGLINE.en;
}
