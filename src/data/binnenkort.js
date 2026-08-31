// VISUAILS — Hooks en Editions: de twee diensten die er wel zijn, maar nog niet
// te bestellen.
//
// ═══════════════════════════════════════════════════════════════════════════
// WAAROM DIT EEN EIGEN BESTAND IS GEWORDEN — 30 AUGUSTUS 2026
// ═══════════════════════════════════════════════════════════════════════════
//
// Deze tekst stond in de copytabel van HomeV2.astro, en NERGENS anders. Bij het
// meten van de homepage bleek hij ruim 450 woorden groot te zijn: bijna een
// vijfde van alle tekst op de pagina, over twee dingen die er zelf bij zeggen
// dat je ze nog niet kunt bestellen. Op een homepage die te druk was, was dat
// het grootste enkele blok dat weg kon.
//
// "Weg" mocht alleen niet betekenen: van de site af. In het menu staan Hooks en
// Editions al bij de diensten, met een `soon`-label en zonder href — zie
// src/i18n/ui.js. De uitleg hoort dus ergens te STAAN, en de homepage hoort er
// alleen naar te wijzen.
//
// ── WAAROM /plans EN NIET TWEE EIGEN PAGINA'S ──────────────────────────────
//
// Overwogen, en niet gedaan. Deze site heeft er al een vorm voor: /start/video
// en /start/custom-look zijn HoldingPage's — "dit bestaat, dit is waar het
// heen gaat, zo kom je in de rij". Dat is precies wat deze twee nodig hebben,
// en op een dag krijgen ze dat ook.
//
// Vandaag zou het twee pagina's × twee talen kosten, plus een nieuwe `service`
// in ORDER_SERVICES, plus een bestelroute voor iets waar nog geen prijs voor
// is. Dat is een bestelflow bouwen voor een dienst die nog niet besteld kan
// worden. /plans is de pagina waar de maandelijkse afspraak woont, Editions ís
// een maandelijkse set, en Hooks staat in dezelfde planning — dus komen ze daar
// bij elkaar te staan, met een anker (#binnenkort) waar het menu naartoe kan
// wijzen.
//
// Wordt een van de twee bestelbaar, dan verhuist het blok naar een eigen
// /start-pagina zoals video dat heeft, en leest die pagina dit bestand.
//
// ── WAT ER NIET IS VERANDERD ───────────────────────────────────────────────
//
// Geen woord. De tekst is verplaatst en niet herschreven: hij is in augustus
// tweemaal nagelopen op de toonregels (zie de noot bij Hooks hieronder over
// HOOKS-COPY-CONCEPT.md, en die bij de naam Editions), en een verhuizing is de
// verkeerde gelegenheid om daar stil iets aan te veranderen.

import { turnaroundShort } from './pricing.js';

/**
 * Per taal de twee concepten, in de volgorde waarin ze getoond horen te worden.
 *
 * `id` is stabiel en wordt gebruikt als anker op /plans; `qBody` is een lijst
 * van [kop, tekst]-paren, precies de vorm die de uitklapper op de homepage
 * gebruikte.
 */
export const BINNENKORT = {
  en: [
      {
        id: 'hooks',
        name: 'Hooks',
        desc: 'Short-form product video, designed around eye-catching, high-performing social formats.',
        cta: 'See Hooks',
        qLabel: 'What Hooks is',
        /* De tekst hieronder komt uit HOOKS-COPY-CONCEPT.md en niet uit de oude
           HooksPage.astro. Die tekst overtrad de toonregels op acht punten,
           waaronder de ene die Lucas expliciet had aangewezen ("één product en
           één idee is genoeg" — dat suggereert dat één foto genoeg is). Die fout
           mag niet via een uitklapper terug de site op komen; hier staat de
           gecorrigeerde versie, expliciet dat één foto NIET genoeg is. */
        qBody: [
          ['You send photos', 'We require a full visual set: at least a clear front and back view, along with detail or fit photos if you have them. One photo alone isn’t sufficient because our formats build scene depth around the entire product.'],
          ['We build the video', 'Scroll-stopping, short-form vertical video, built to give a post its best chance at more engagement and new followers.'],
          ['A specialist checks it', `Before final delivery, we verify product accuracy and ensure every image transition aligns seamlessly. Your assets land in VISUAILS Studio within ${turnaroundShort('unattended', 'en')} for your review, feedback, or instant approval.`],
          ['What we sell', 'We guarantee the format and the execution — not the reach. How far a post travels depends on timing and algorithms, and those aren’t ours to promise.'],
        ],
      },
      {
        id: 'editions',
        /* ── WAAROM DE NAAM "EDITIONS" IS ───────────────────────────────────
           Het idee staat in STOCK-IDEE.md: elke maand een set beelden, op het
           kleurenschema van één merk gemaakt, plus een goedkopere gedeelde set.

           HET WOORD "STOCK" KOMT ER NIET IN, en dat is de kern van de keuze.
           Het onderzoek in dat document wijst twee dingen aan: Death to Stock
           zet zich met zoveel woorden af tegen AI ("made by real creators, not
           AI"), en op hun eigen terrein — vijftienduizend beelden voor $20 —
           win je niet. Jezelf "stock" noemen is de vergelijking opzoeken die je
           verliest, terwijl de helft die zíj niet kunnen (per merk afgestemd)
           precies de helft is die jij wel kunt.

           EN EDITIE IS EEN DRUKWERKWOORD. Een editie is een oplage: een set die
           in één keer gemaakt is, gedateerd en genummerd. Dat is per definitie
           maandelijks, het zegt "gemaakt" in plaats van "geoogst", en het staat
           in dezelfde taal als de rest van deze site — zie de lane bovenaan dit
           bestand, de drukkerij en de kleurproef. Het blijft in beide talen
           onvertaald staan, net als Catalog, Lifestyle en Hooks.

           NIET GEKOZEN: "Drops" botst met de wire-waarde 'drop' in
           ORDER_SERVICES; "Library" is precies wat §6 van STOCK-IDEE.md verbiedt
           (geen tweede bibliotheek naast de bestelstroom); "Feed" is een
           platformwoord en zegt niets over wat je krijgt. */
        name: 'Editions',
        desc: 'Monthly visual drops tailored to your brand identity. Keep your channels active and consistent, even between collection releases.',
        cta: 'See Editions',
        qLabel: 'What Editions is',
        qBody: [
          ['What lands', 'A fresh set of finished visuals delivered to VISUAILS Studio at the start of every month — ready to post. They arrive whether you launched a new product or not, right when brands usually run out of content.'],
          ['Made for your brand', 'Built around your style, locations, and brand colors so they fit seamlessly into your feed. That’s what a stock library structurally cannot do — and why this is anything but stock.'],
          ['Or the shared set', 'A more accessible option that is not exclusive to your brand — the same set also goes to other brands. We state exclusivity clearly, just like shared rosters are explicitly labeled on our model picker.'],
          ['Where it arrives', 'Integrated right alongside your balance and order history. Downloading works exactly like a regular order — no second library, complex search tools, or extra folders to manage.'],
        ],
      },
    ],
  nl: [
      {
        id: 'hooks',
        name: 'Hooks',
        desc: 'Korte productvideo’s, vormgegeven in een opvallend format dat direct de aandacht trekt in de feed.',
        cta: 'Bekijk Hooks',
        qLabel: 'Wat Hooks is',
        qBody: [
          ['Je stuurt foto’s', 'We hebben een complete set nodig: sowieso voor- en achterkant, plus eventueel een detail- of pasfoto. Met één foto red je het niet, omdat de uiteindelijke weergave om het product heen beweegt.'],
          ['Wij bouwen de video', 'Korte, verticale video’s die opvallen — gebouwd om je post de beste kans te geven op meer betrokkenheid en nieuwe volgers.'],
          ['Een specialist kijkt hem na', `Vóór oplevering garanderen we dat het product waarheidsgetrouw is en alle aansluitingen naadloos overlopen. Binnen ${turnaroundShort('unattended', 'nl')} staat het resultaat klaar in VISUAILS Studio voor jouw goedkeuring of feedback.`],
          ['Wat wij verkopen', 'Wij garanderen het format en de uitvoering — niet het bereik. Of een post viraal gaat hangt af van het platform en de timing, en dat is iets wat we nooit valselijk zullen beloven.'],
        ],
      },
      {
        id: 'editions',
        name: 'Editions',
        desc: 'Maandelijkse contentdrops afgestemd op jouw merk. Zo blijven je kanalen altijd actief, juist in de periodes tussen nieuwe collecties door.',
        cta: 'Bekijk Editions',
        qLabel: 'Wat Editions is',
        qBody: [
          ['Wat je krijgt', 'Elke eerste van de maand een nieuwe set beelden in VISUAILS Studio, direct klaar om te posten. Ze arriveren ook als je die maand geen nieuw product hebt — precies op het moment dat de meeste merken door hun content heen zijn.'],
          ['Gemaakt voor jouw merk', 'Afgestemd op jouw stijl, locaties en merkkleuren, zodat ze naadloos aansluiten op je feed. Dat is precies wat een stockbibliotheek nooit kan bieden — en waarom dit absoluut geen stock is.'],
          ['Of de gedeelde set', 'Een toegankelijkere optie die niet exclusief voor jouw merk is — dezelfde set gaat ook naar andere merken. We zijn helder over wat gedeeld is, net zoals het gedeelde bestand expliciet vermeld staat bij de modelkiezer.'],
          ['Waar hij binnenkomt', 'Overzichtelijk geplaatst naast je saldo en besteloverzicht. Downloaden werkt exact zoals je gewend bent van een reguliere order — geen tweede mediabibliotheek met een eigen zoekfunctie of losse mappen.'],
        ],
      },
    ],
};

/** De twee, voor één taal. Onbekende taal valt terug op Engels. */
export function binnenkort(lang = 'en') {
  return BINNENKORT[lang] || BINNENKORT.en;
}

/**
 * De namen, voor de ene regel die er op de homepage van overblijft.
 *
 * Als functie en niet als losse constante, want dan staat de lijst één keer:
 * een tweede array met "Hooks, Editions" erin is precies de soort kopie die in
 * dit project al drie keer stil is uitgelopen op het origineel.
 */
export function binnenkortNamen(lang = 'en') {
  return binnenkort(lang).map((b) => b.name);
}
