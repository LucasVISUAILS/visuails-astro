/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE FOTOGIDS — het bestand dat met een vraag om een foto meegaat
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 7 september 2026: *"Stel een klant mist nog een foto van een specifieke
 * kant van het product contacteer ik hem via mail of whatsapp (voorkeur), en
 * vraag ik om die specifieke foto en stuur ik hem gelijk de handleiding erbij
 * zodat hij zijn weg kan vinden en volgende keer weer dat bestand erbij kan
 * pakken om het goed te doen. Ik wil niet dat klanten denken dat ze niet goed
 * genoeg hun best hebben gedaan met foto's maken dus frame het als een soort
 * handleiding met tips."*
 *
 * ── DE TOON, EN WAAROM DIE HIER IN DE CODE STAAT ──────────────────────────────
 *
 * Dit bestand gaat mee op het moment dat er iets ONTBREEKT. Dat is precies het
 * moment waarop een lijst met "vermijd dit" en "niet doen" leest als een cijfer
 * voor werk dat iemand al gedaan heeft. Vandaar drie regels die niet zomaar
 * mogen sneuvelen bij een tekstronde:
 *
 *   1 · Geen enkele regel begint met "niet" of "vermijd". Waar de site een
 *       "Vermijden"-kaart heeft, staat hier "Wat het ons makkelijker maakt".
 *   2 · Elke opname zegt WAT HET OPLEVERT, niet wat er misgaat zonder. Dat is
 *       ook waarom `buys` uit shots.js hier de hoofdtekst is en `how` de
 *       bijzin — op de site is dat andersom, want daar staat het formulier
 *       ernaast en hier niet.
 *   3 · Er staat nergens dat een foto "goed" of "slecht" is. Een telefoonfoto
 *       bij het raam is genoeg, en dat staat er met zoveel woorden in.
 *
 * ── WAAROM DIT EEN SCRIPT IS EN GEEN LOSSE PDF IN EEN MAP ─────────────────────
 *
 * De vier opnamen staan al in src/data/shots.js en de ondergrens voor de lange
 * zijde in datzelfde bestand — het zijn dezelfde teksten die het bestelformulier
 * en /upload-guidelines tonen. Een PDF die met de hand is overgetypt, is een
 * tweede plek waar diezelfde zinnen wonen, en dan zegt het bestand dat de klant
 * bewaart op een dag iets anders dan het scherm waar hij naar kijkt. Hier komt
 * alles uit dezelfde bron; `npm run handleiding` maakt hem opnieuw.
 *
 * ── HOE ──────────────────────────────────────────────────────────────────────
 *
 * HTML → Chromium → print naar PDF. Geen reportlab: de gids moet er hetzelfde
 * uitzien als de site, en de site is CSS. De letters worden als base64 in het
 * document gezet (uit @fontsource in node_modules, dezelfde bron als
 * scripts/fonts-voor-worker.mjs), zodat de PDF ook op een telefoon zonder
 * netwerk klopt — en een PDF die via WhatsApp aankomt, wordt vaak op een
 * telefoon geopend.
 *
 * Het logo is het bestaande pad uit de <symbol id="markglyph"> in Layout.astro,
 * één op één overgenomen. Alleen de kleur verschilt; de vorm niet.
 *
 * Uitvoer: public/downloads/visuails-fotogids-nl.pdf en -en.pdf. In public/ en
 * niet in een kladmap, want dan heeft hij én een bestand om aan te hangen én een
 * vaste link om in een gesprek te plakken.
 */
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

/* Dezelfde browserzoeker als make-og.mjs en de keuring: PW_CHROME wint, anders
   een van de bekende paden, anders laat Playwright het zelf uitzoeken. Eén plek,
   zodat een machine zonder `npx playwright install` niet per script anders faalt. */
import { browserPad } from './lib/browserpad.mjs';

import { SHOTS, MIN_LANGE_ZIJDE } from '../src/data/shots.js';
import { WHATSAPP_DISPLAY } from '../src/data/whatsapp.js';

const require = createRequire(import.meta.url);
const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const UIT = join(wortel, 'public', 'downloads');

/* Dezelfde drie families als de site. Uit node_modules en niet uit public/, om
   dezelfde reden die scripts/fonts-voor-worker.mjs noemt: @fontsource is de bron
   en een kopie in de repo veroudert stil bij een npm update. */
const LETTERS = [
  ['Anybody Variable', '@fontsource-variable/anybody/files/anybody-latin-standard-normal.woff2'],
  ['Instrument Sans Variable', '@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-normal.woff2'],
  ['Martian Mono Variable', '@fontsource-variable/martian-mono/files/martian-mono-latin-standard-normal.woff2'],
];

/* Het merk, letterlijk het pad uit de <symbol id="markglyph"> in Layout.astro.
   Nooit natekenen — alleen de kleur mag anders zijn. */
const MERK = `<svg class="merk" viewBox="0 0 702.00 813.25" aria-hidden="true">
  <path d="M 0.0 16.0 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 L 515.5 546.25 L 264.5 119.0 A 201.21 201.21 0 0 0 101.0 15.75 L 0.0 16.0 Z" />
  <path d="M 701.75 0.0 L 543.25 366.25 L 507.25 453.75 L 652.0 259.25 L 702.0 338.25 L 701.75 0.0 Z" />
</svg>`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── DE TEKENINGEN ───────────────────────────────────────────────────────────
 *
 * Lucas, 7 september 2026: *"Ik wil dat de pdf meer visueel uitlegt."*
 *
 * Zes lijntekeningen, allemaal met dezelfde onderdelen: één kledingstuk, één
 * kader, en precies één geel element dat aanwijst waar het in die tekening om
 * gaat. Geen foto's — een foto van een kledingstuk dat niet van de klant is,
 * legt niets uit over zíjn product, en een foto die "zo moet het" heet, maakt
 * van deze gids alsnog een beoordeling.
 *
 * HET GEEL IS DE AANWIJZER EN NIET DE DECORATIE. In elke tekening staat het
 * gele deel op het ding dat de bijbehorende regel noemt: de kaderhoeken bij de
 * voorkant, de omdraaipijl bij de achterkant, de vergrootcirkel bij het detail,
 * de lichaamslijn bij de draagfoto, de lichtbundel bij het daglicht en de
 * pijlen naar binnen bij het kader. Wie alleen de plaatjes bekijkt, leest de
 * gids nog steeds — en dat is de hele reden dat ze er zijn.
 *
 * Het kledingstuk is één pad dat overal terugkomt, zodat de vier opnamen
 * herkenbaar hetzelfde product tonen en het verschil in de tekening zit en niet
 * in het onderwerp. Bewust een t-shirt: het is de vorm die iedereen leest.
 */
const TEE = 'M48 16 L33 23 L24 36 L35 43 L42 33 L42 78 L78 78 L78 33 L85 43 L96 36 L87 23 L72 16 C68 24 52 24 48 16 Z';

const tekening = (inhoud, klasse = '') => `<svg class="tek ${klasse}" viewBox="0 0 120 92" aria-hidden="true">${inhoud}</svg>`;

/* Kaderhoeken: vier haakjes die het kledingstuk net raken. Het geel zit hier,
   want de regel bij deze opname is "vul het beeld". */
const HOEKEN = `
  <g class="aanwijs">
    <path d="M14 20 L14 10 L24 10" /><path d="M96 10 L106 10 L106 20" />
    <path d="M106 72 L106 82 L96 82" /><path d="M24 82 L14 82 L14 72" />
  </g>`;

const TEKENINGEN = {
  /* 01 · VOORKANT — het hele product, recht van voren, tot in de hoeken. */
  front: tekening(`
    <path class="stuk" d="${TEE}" />
    <path class="fijn" d="M60 26 L60 78" />
    ${HOEKEN}`),

  /* 02 · ACHTERKANT — hetzelfde stuk, omgedraaid: de naad over het midden, een
     print die alleen aan deze kant zit, en de draaipijl in het geel. */
  back: tekening(`
    <path class="stuk" d="${TEE}" />
    <path class="fijn streep" d="M60 24 L60 78" />
    <rect class="fijn" x="50" y="40" width="20" height="14" rx="2" />
    <g class="aanwijs">
      <path d="M40 8 A 26 14 0 0 1 80 8" />
      <path d="M80 8 L74 3 M80 8 L73 12" />
    </g>`),

  /* 03 · DETAIL — dichtbij op de stof. De vergrootcirkel is het gele deel en
     staat op de stof, niet op het silhouet: dat is precies het verschil tussen
     een close-up en een tweede totaalfoto. */
  detail: tekening(`
    <defs><clipPath id="lens"><circle cx="66" cy="52" r="23" /></clipPath></defs>
    <path class="stuk flauw" d="${TEE}" />
    <!-- De weefselstructuur staat BINNEN de cirkel en niet eromheen: buiten de
         lens is het gewoon stof, en dat is precies wat een close-up doet. -->
    <g class="fijn" clip-path="url(#lens)">
      <path d="M44 38 L88 38 M44 46 L88 46 M44 54 L88 54 M44 62 L88 62 M44 70 L88 70" />
      <path d="M50 30 L50 76 M58 30 L58 76 M66 30 L66 76 M74 30 L74 76 M82 30 L82 76" />
    </g>
    <g class="aanwijs">
      <circle cx="66" cy="52" r="24" />
      <path d="M84 70 L94 80" />
    </g>`),

  /* 04 · GEDRAGEN — het gaat om de pasvorm, dus het lichaam is het gele deel
     en het kledingstuk de gewone lijn. */
  worn: tekening(`
    <g class="aanwijs">
      <circle cx="60" cy="16" r="9" />
      <path d="M52 78 L52 90 M68 78 L68 90" />
    </g>
    <path class="stuk" d="M50 26 L36 32 L28 44 L38 50 L44 41 L44 76 L76 76 L76 41 L82 50 L92 44 L84 32 L70 26 C66 33 54 33 50 26 Z" />
    <path class="fijn" d="M44 62 L76 62" />`),

  /* Daglicht van opzij: het raam links, de bundel in het geel, en de zachte
     schaduw rechts die laat zien dat het licht van één kant komt. */
  licht: tekening(`
    <g class="fijn">
      <rect x="6" y="14" width="26" height="42" rx="2" />
      <path d="M19 14 L19 56 M6 35 L32 35" />
    </g>
    <g class="aanwijs">
      <path d="M36 26 L58 34 M36 36 L58 42 M36 46 L58 50" />
      <path d="M58 34 L51 33 M58 34 L53 39" />
      <path d="M58 42 L51 42 M58 42 L52 46" />
      <path d="M58 50 L51 50 M58 50 L53 54" />
    </g>
    <path class="stuk klein" d="M78 34 L70 38 L65 45 L71 49 L75 44 L75 68 L93 68 L93 44 L97 49 L103 45 L98 38 L90 34 C88 38 80 38 78 34 Z" />
    <path class="fijn" d="M62 72 L114 72" />
    <path class="schaduw" d="M95 70 L112 70 L108 74 L93 74 Z" />`, 'tek-breed'),

  /* Vul het kader: het kledingstuk raakt de randen en de pijlen wijzen naar
     binnen. Er staat met opzet geen tweede kader naast met een klein product
     erin — dat zou een "zo niet" zijn, en die staat nergens in deze gids. */
  kader: tekening(`
    <rect class="fijn streep" x="10" y="6" width="100" height="80" rx="3" />
    <path class="stuk" d="M50 12 L36 19 L27 32 L38 39 L45 29 L45 80 L75 80 L75 29 L82 39 L93 32 L84 19 L70 12 C66 20 54 20 50 12 Z" />
    <g class="aanwijs">
      <path d="M18 14 L27 21 M27 21 L20 21 M27 21 L27 14" />
      <path d="M102 14 L93 21 M93 21 L100 21 M93 21 L93 14" />
      <path d="M18 78 L27 71 M27 71 L20 71 M27 71 L27 78" />
      <path d="M102 78 L93 71 M93 71 L100 71 M93 71 L93 78" />
    </g>`, 'tek-breed'),
};


/* ── DE TEKST DIE ALLEEN IN DIT BESTAND STAAT ─────────────────────────────────
   De vier opnamen komen uit shots.js. Dit is de gids eromheen, en die bestaat
   nergens anders — een gids is iets anders dan een formulierlabel. */
const KOPIJ = {
  nl: {
    taal: 'nl',
    bestand: 'visuails-fotogids-nl.pdf',
    titelMeta: 'VISUAILS — Fotogids',
    etiket: 'Fotogids',
    h1: ['Zo halen we het ', 'meeste', ' uit jouw foto’s'],
    intro: 'Je hoeft geen fotograaf te zijn en geen studio te hebben — een telefoon bij het raam is genoeg. Deze gids laat zien welke opnamen ons het meest helpen en wat elke opname aan je resultaat toevoegt. Bewaar hem; bij een volgende bestelling weet je dan meteen wat je klaarzet.',
    setKop: 'De vier opnamen',
    setLead: 'De eerste twee hebben we altijd nodig. De andere twee maken het resultaat nauwkeuriger — stuur ze als je ze hebt, en anders gaan we er gewoon zonder verder.',
    altijd: 'Altijd meesturen',
    helpt: 'Maakt het nauwkeuriger',
    hoeKop: 'Zo maak je hem',
    watKop: 'Wat het toevoegt',

    figLichtKop: 'Licht van opzij',
    figLichtP: 'Een raam links of rechts van het product geeft de stof diepte en laat de kleur zien zoals hij is. Een lamp recht boven het product maakt hem vlak.',
    figKaderKop: 'Laat het product het kader vullen',
    figKaderP: 'Ga dichterbij tot het stuk de randen bijna raakt. Dan gebruiken we elke pixel die je telefoon maakt, in plaats van een uitsnede daarvan.',

    tipsKop: 'Zes dingen die het verschil maken',
    tipsLead: 'Allemaal haalbaar met een telefoon. Geen ervan vraagt om apparatuur.',
    tips: [
      ['Daglicht', 'Ga bij een raam staan en zet de lamp uit. Daglicht van opzij geeft de stof diepte; een plafondlamp maakt hem plat.'],
      ['Een rustige ondergrond', 'Een egale muur, een tafel, een laken. Alles wat er verder in beeld staat, moeten wij eruit lezen.'],
      ['Scherp op het product', 'Tik op je scherm op het kledingstuk voordat je afdrukt, en houd even stil. Dat is het hele verschil.'],
      ['Het product vult het kader', 'Ga dichterbij in plaats van later bijsnijden — dan houd je alle pixels die er zijn.'],
      ['De kleur zoals hij echt is', 'Geen filter en geen automatische verfraaiing. Wij matchen de kleur op wat we zien, dus wat jij verstuurt is wat je terugkrijgt.'],
      ['Zo groot als je telefoon hem maakt', `Verstuur als bestand of op ‘originele grootte’ in plaats van als chatfoto. Onder ${MIN_LANGE_ZIJDE} pixels op de lange zijde zegt het formulier het meteen, zodat je het weet terwijl je er nog achter zit.`],
    ],

    meerKop: 'Meer hoeken, preciezer resultaat',
    meerP: 'Er zit geen maximum op. Heb je vier foto’s van hetzelfde product vanuit verschillende hoeken, stuur ze alle vier — het kost niets extra en elke hoek is één ding minder dat wij moeten afleiden.',

    vraagKop: 'Vragen we je om één specifieke foto?',
    vraagP: 'Dan is er niets mis met wat je stuurde. Het betekent alleen dat er één kant van dit product is die we niet uit de rest kunnen aflezen — vaak de achterkant of een detail. Eén foto erbij en we gaan verder.',

    contactKop: 'Even overleggen?',
    contactP: 'Stuur gerust een foto vooruit als je twijfelt of hij bruikbaar is. Liever één berichtje vooraf dan een dag wachten.',
    wa: `WhatsApp ${WHATSAPP_DISPLAY}`,
    mail: 'hello@visuails.com',
    web: 'visuails.com/nl/upload-guidelines',
    voet: 'VISUAILS · Enschede, Nederland',
  },
  en: {
    taal: 'en',
    bestand: 'visuails-fotogids-en.pdf',
    titelMeta: 'VISUAILS — Photo guide',
    etiket: 'Photo guide',
    h1: ['Getting the ', 'most', ' out of your photos'],
    intro: 'You do not need to be a photographer and you do not need a studio — a phone by a window is enough. This guide shows which shots help us most and what each one adds to your result. Keep it; next time you order you will know what to have ready.',
    setKop: 'The four shots',
    setLead: 'We always need the first two. The other two make the result more accurate — send them if you have them, and if not we carry on without.',
    altijd: 'Always send',
    helpt: 'Makes it more accurate',
    hoeKop: 'How to take it',
    watKop: 'What it adds',

    figLichtKop: 'Light from the side',
    figLichtP: 'A window to the left or right of the product gives fabric depth and shows colour as it is. A lamp straight overhead flattens it.',
    figKaderKop: 'Let the product fill the frame',
    figKaderP: 'Step closer until the piece almost touches the edges. Then we use every pixel your phone makes, rather than a crop of it.',

    tipsKop: 'Six things that make the difference',
    tipsLead: 'All of it works with a phone. None of it asks for equipment.',
    tips: [
      ['Daylight', 'Stand by a window and switch the lamp off. Daylight from the side gives fabric depth; a ceiling light flattens it.'],
      ['A calm surface', 'A plain wall, a table, a sheet. Anything else in the frame is something we have to read around.'],
      ['Focus on the product', 'Tap the garment on your screen before you shoot, and hold still for a moment. That is the whole difference.'],
      ['Let the product fill the frame', 'Step closer rather than cropping later — that way you keep every pixel there is.'],
      ['The colour as it really is', 'No filter, no auto-enhance. We match colour to what we see, so what you send is what you get back.'],
      ['As large as your phone makes it', `Send as a file or at ‘actual size’ rather than as a chat photo. Below ${MIN_LANGE_ZIJDE} pixels on the long side the form says so on the spot, while you are still at your desk.`],
    ],

    meerKop: 'More angles, a closer match',
    meerP: 'There is no maximum. If you have four photos of the same product from different angles, send all four — it costs nothing extra, and every angle is one thing less for us to work out.',

    vraagKop: 'Did we ask you for one specific photo?',
    vraagP: 'Then there is nothing wrong with what you sent. It only means there is one side of this product we cannot read from the rest — usually the back, or a detail. One more photo and we are on our way.',

    contactKop: 'Want to check first?',
    contactP: 'Send a photo ahead if you are unsure whether it works. One quick message beats waiting a day.',
    wa: `WhatsApp ${WHATSAPP_DISPLAY}`,
    mail: 'hello@visuails.com',
    web: 'visuails.com/upload-guidelines',
    voet: 'VISUAILS · Enschede, the Netherlands',
  },
};

function css(fonts) {
  return `
${fonts}
:root {
  --inkt: #111111; --inkt-2: #454545; --vel: #F5F5F5; --wit: #FFFFFF;
  --geel: #D2E04A; --geel-letter: #E4F474; --gloed: #9EB42F;
  --lijn: #DFDFDF; --lijn-sterk: #BDBDBD;
  --kop: "Anybody Variable", system-ui, sans-serif;
  --tekst: "Instrument Sans Variable", system-ui, sans-serif;
  --mono: "Martian Mono Variable", ui-monospace, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--tekst); color: var(--inkt); background: var(--wit);
  font-size: 10pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.blad { width: 210mm; min-height: 297mm; padding: 0 0 16mm; page-break-after: always; position: relative; }
.blad:last-child { page-break-after: auto; }
.binnen { padding: 0 16mm; }

/* ── DE KOPBALK ──────────────────────────────────────────────────────────── */
.balk { background: var(--inkt); color: var(--vel); padding: 7mm 16mm; display: flex; align-items: center; justify-content: space-between; }
.balk-merk { display: flex; align-items: center; gap: 3mm; }
.merk { width: 6.5mm; height: 7.5mm; fill: var(--geel); }
.woord { font-family: var(--kop); font-weight: 500; font-stretch: 125%; font-size: 13pt; letter-spacing: .02em; text-transform: uppercase; }
.balk .etiket { color: rgba(245,245,245,.72); }
.etiket { font-family: var(--mono); font-size: 7pt; font-stretch: 82%; letter-spacing: .09em; text-transform: uppercase; }

h1 { font-family: var(--kop); font-weight: 500; font-stretch: 125%; font-size: 23pt; line-height: 1.02; letter-spacing: -.02em; text-transform: uppercase; margin: 8mm 0 0; }
h1 em { font-style: normal; color: var(--inkt); background: linear-gradient(var(--geel), var(--geel)) no-repeat 0 .06em / 100% .84em; padding-inline: .04em; }
h2 { font-family: var(--kop); font-weight: 500; font-stretch: 125%; font-size: 14pt; line-height: 1.1; letter-spacing: -.01em; text-transform: uppercase; margin: 0; }
h3 { font-family: var(--kop); font-weight: 500; font-stretch: 125%; font-size: 10.5pt; line-height: 1.15; letter-spacing: -.01em; text-transform: uppercase; margin: 0; }
p { margin: 0; }
.lead { color: var(--inkt-2); max-width: 150mm; margin-top: 3mm; font-size: 9pt; }
.kopgroep { margin: 7mm 0 4mm; display: grid; gap: 1.5mm; }
.kopgroep .etiket { color: var(--inkt-2); }
.kopgroep p { color: var(--inkt-2); max-width: 150mm; }

/* ── DE TEKENINGEN ───────────────────────────────────────────────────────
   Eén stijl voor alle zes, zodat ze als één set lezen. De klasse .stuk is het
   kledingstuk, .fijn is alles wat eraan vastzit (naden, stof, een raam), en
   .aanwijs is het gele deel dat aanwijst waar het in die tekening om gaat —
   er is er precies één per tekening. */
.tek { display: block; width: 100%; height: auto; }
.tek path, .tek circle, .tek rect { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.tek .stuk { stroke: var(--inkt); stroke-width: 2.2; }
.tek .stuk.flauw { stroke: var(--lijn-sterk); stroke-width: 1.8; }
.tek .fijn, .tek .fijn path, .tek .fijn rect { stroke: var(--lijn-sterk); stroke-width: 1.3; }
.tek .streep { stroke-dasharray: 4 3; }
.tek .aanwijs, .tek .aanwijs path, .tek .aanwijs circle { stroke: var(--gloed); stroke-width: 2.2; }
.tek .schaduw { fill: var(--lijn); stroke: none; }

/* ── DE VIER OPNAMEN ─────────────────────────────────────────────────────
   Vier rijen over de volle breedte in plaats van een raster van twee bij twee:
   een tekening van 38mm naast zijn eigen tekst leest als één uitleg, terwijl
   dezelfde tekening boven een smalle kolom een plaatje wordt dat je overslaat. */
.opnamen { display: grid; gap: 3mm; }
.opname {
  border: .35mm solid var(--lijn); border-radius: 3mm; padding: 3.5mm 5mm;
  display: grid; grid-template-columns: 31mm 1fr; gap: 5mm; align-items: center;
}
.opname-beeld { position: relative; }
.opname-nr {
  position: absolute; left: 0; top: 0;
  font-family: var(--kop); font-weight: 500; font-stretch: 125%;
  font-size: 15pt; line-height: .8; color: var(--lijn-sterk);
}
.opname-tekst { display: grid; gap: 1.5mm; }
.opname-kop { display: flex; align-items: baseline; gap: 3mm; }
.merkje { font-family: var(--mono); font-size: 6.5pt; font-stretch: 82%; letter-spacing: .07em; text-transform: uppercase; padding: 1mm 2.5mm; border-radius: 99mm; white-space: nowrap; }
.merkje-vast { background: var(--geel); color: var(--inkt); }
.merkje-los { border: .3mm solid var(--lijn-sterk); color: var(--inkt-2); }
.opname-tekst .wat { font-size: 9pt; line-height: 1.45; }
.opname-tekst .hoe { color: var(--inkt-2); font-size: 8.5pt; line-height: 1.4; }
.opname-tekst .hoe b { font-family: var(--mono); font-size: 6.5pt; font-stretch: 82%; letter-spacing: .07em; text-transform: uppercase; color: var(--gloed); font-weight: 400; margin-right: 1.5mm; }

/* ── DE TWEE GROTE TEKENINGEN OP BLAD TWEE ──────────────────────────────── */
.figuren { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-bottom: 7mm; }
.figuur { border: .35mm solid var(--lijn); border-radius: 3mm; padding: 4.5mm 5mm 5mm; display: grid; gap: 2.5mm; }
.figuur .tek-breed { max-width: 48mm; margin: 0 auto; }
.figuur p { color: var(--inkt-2); font-size: 8.5pt; line-height: 1.4; }

/* ── DE TIPS ─────────────────────────────────────────────────────────────── */
.tips { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; margin: 0; padding: 0; list-style: none; }
.tips li { display: grid; grid-template-columns: 5mm 1fr; gap: 3mm; align-items: start; }
.vink { width: 4mm; height: 4mm; margin-top: 1mm; fill: none; stroke: var(--gloed); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.tips b { font-family: var(--kop); font-weight: 500; font-stretch: 125%; font-size: 10pt; text-transform: uppercase; letter-spacing: -.01em; display: block; }
.tips p { color: var(--inkt-2); font-size: 8.5pt; line-height: 1.4; margin-top: .8mm; }

/* ── DE BLOKKEN ──────────────────────────────────────────────────────────── */
.blok { border-radius: 3mm; padding: 4.5mm 5.5mm; display: grid; gap: 1.8mm; margin-top: 5mm; }
.blok-geel { background: var(--geel); color: var(--inkt); }
.blok-geel p { color: var(--inkt); max-width: 150mm; }
.blok-lijn { border: .35mm solid var(--lijn); }
.blok-lijn p { color: var(--inkt-2); max-width: 150mm; }
.blok-inkt { background: var(--inkt); color: var(--vel); }
.blok-inkt p { color: rgba(245,245,245,.78); max-width: 150mm; }
.blok-inkt .etiket { color: rgba(245,245,245,.66); }

.regels { display: flex; flex-wrap: wrap; gap: 2mm 6mm; margin-top: 2mm; }
.regels span { font-family: var(--mono); font-size: 8pt; font-stretch: 82%; letter-spacing: .04em; }

/* ── DE VOET ─────────────────────────────────────────────────────────────── */
.voet { position: absolute; left: 16mm; right: 16mm; bottom: 8mm; display: flex; justify-content: space-between; align-items: baseline; padding-top: 3mm; border-top: .3mm solid var(--lijn); }
.voet span { font-family: var(--mono); font-size: 6.5pt; font-stretch: 82%; letter-spacing: .07em; text-transform: uppercase; color: var(--inkt-2); }
`;
}

function bladEen(c) {
  const opname = (s, i) => `
    <div class="opname">
      <div class="opname-beeld">
        <span class="opname-nr">${String(i + 1).padStart(2, '0')}</span>
        ${TEKENINGEN[s.id] || ''}
      </div>
      <div class="opname-tekst">
        <div class="opname-kop">
          <h3>${esc(s.name[c.taal])}</h3>
          <span class="merkje ${s.required ? 'merkje-vast' : 'merkje-los'}">${esc(s.required ? c.altijd : c.helpt)}</span>
        </div>
        <p class="wat">${esc(s.buys[c.taal])}</p>
        <p class="hoe"><b>${esc(c.hoeKop)}</b>${esc(s.how[c.taal])}</p>
      </div>
    </div>`;

  return `
  <section class="blad">
    <header class="balk">
      <div class="balk-merk">${MERK}<span class="woord">VISUAILS</span></div>
      <span class="etiket">${esc(c.etiket)}</span>
    </header>
    <div class="binnen">
      <h1>${esc(c.h1[0])}<em>${esc(c.h1[1])}</em>${esc(c.h1[2])}</h1>
      <p class="lead">${esc(c.intro)}</p>

      <div class="kopgroep">
        <h2>${esc(c.setKop)}</h2>
        <p>${esc(c.setLead)}</p>
      </div>
      <div class="opnamen">${SHOTS.map(opname).join('')}</div>

      <div class="blok blok-lijn">
        <h3>${esc(c.meerKop)}</h3>
        <p>${esc(c.meerP)}</p>
      </div>
    </div>
    <div class="voet"><span>${esc(c.voet)}</span><span>${esc(c.web)}</span></div>
  </section>`;
}

function bladTwee(c) {
  const tip = ([kop, tekst]) => `
    <li>
      <svg class="vink" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
      <div><b>${esc(kop)}</b><p>${esc(tekst)}</p></div>
    </li>`;

  return `
  <section class="blad">
    <header class="balk">
      <div class="balk-merk">${MERK}<span class="woord">VISUAILS</span></div>
      <span class="etiket">${esc(c.etiket)}</span>
    </header>
    <div class="binnen">
      <div class="kopgroep" style="margin-top:7mm">
        <h2>${esc(c.tipsKop)}</h2>
        <p>${esc(c.tipsLead)}</p>
      </div>
      <div class="figuren">
        <figure class="figuur">
          ${TEKENINGEN.licht}
          <h3>${esc(c.figLichtKop)}</h3>
          <p>${esc(c.figLichtP)}</p>
        </figure>
        <figure class="figuur">
          ${TEKENINGEN.kader}
          <h3>${esc(c.figKaderKop)}</h3>
          <p>${esc(c.figKaderP)}</p>
        </figure>
      </div>

      <ul class="tips">${c.tips.map(tip).join('')}</ul>

      <div class="blok blok-geel">
        <h3>${esc(c.vraagKop)}</h3>
        <p>${esc(c.vraagP)}</p>
      </div>

      <div class="blok blok-inkt">
        <h3>${esc(c.contactKop)}</h3>
        <p>${esc(c.contactP)}</p>
        <div class="regels"><span>${esc(c.wa)}</span><span>${esc(c.mail)}</span></div>
      </div>
    </div>
    <div class="voet"><span>${esc(c.voet)}</span><span>${esc(c.web)}</span></div>
  </section>`;
}

async function fontRegels() {
  const stukken = [];
  for (const [naam, pad] of LETTERS) {
    const bin = await readFile(require.resolve(pad));
    stukken.push(
      `@font-face { font-family: "${naam}"; font-style: normal; font-weight: 100 900; `
      + `font-stretch: 50% 150%; src: url(data:font/woff2;base64,${bin.toString('base64')}) format("woff2"); }`
    );
  }
  return stukken.join('\n');
}

async function maak(browser, c, fonts) {
  const html = `<!doctype html><html lang="${c.taal}"><head><meta charset="utf-8">
<title>${esc(c.titelMeta)}</title><style>${css(fonts)}</style></head>
<body>${bladEen(c)}${bladTwee(c)}</body></html>`;

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  /* ── MEET OF ELK BLAD OP ÉÉN PAGINA PAST ────────────────────────────────
     Een blad dat één millimeter te hoog is, loopt door naar een derde pagina
     met een halve regel erop — en dat merk je pas als de klant het bestand
     opent. Chromium zegt hier gewoon hoe hoog het geworden is; 297mm is
     1122,5px bij 96dpi. Meten en hard stoppen is goedkoper dan hopen. */
  const hoog = await page.evaluate(() => [...document.querySelectorAll('.blad')].map((n) => n.scrollHeight));
  const A4 = 297 / 25.4 * 96;
  if (process.env.METEN) console.log(`  ${c.taal}: ${hoog.map((h) => Math.round(h)).join(' · ')} (max ${Math.round(297 / 25.4 * 96)})`);
  hoog.forEach((h, i) => {
    if (h > A4 + 1) throw new Error(`handleiding: blad ${i + 1} van ${c.taal} is ${Math.round(h)}px en past niet op A4 (${Math.round(A4)}px). Kort de tekst in of verklein de marges.`);
  });

  const doel = join(UIT, c.bestand);
  await page.pdf({
    path: doel,
    width: '210mm',
    height: '297mm',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await page.close();
  return doel;
}

async function main() {
  await mkdir(UIT, { recursive: true });
  const fonts = await fontRegels();
  const browser = await chromium.launch({ executablePath: browserPad() });
  const gemaakt = [];
  try {
    for (const c of [KOPIJ.nl, KOPIJ.en]) gemaakt.push(await maak(browser, c, fonts));
  } finally {
    await browser.close();
  }
  for (const p of gemaakt) console.log(`fotogids: ${p.replace(wortel + '/', '')}`);
}

await main();
