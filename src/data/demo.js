// VISUAILS — de walkthrough, in één bestand: welke wegen er zijn, welke keuzes
// elke weg stelt, en welk beeld bij welke keuze hoort. Augustus 2026.
//
// ── WAT HIER STOND EN WAAROM HET WEG IS ──────────────────────────────────────
// Dit bestand voedde het demospel: slepen, twee keuzes, een vergelijker. Lucas,
// na het zien van een sticky pipeline-visual bij een betaalproduct: *"Ik wil
// eigenlijk dat het een sticky page is en dat je dan 1 categorie selecteert
// (Catalog, Lifestyle (1 van de lifestyle stylen kiezen) en Video (1 van de
// stylen kiezen…)) en dat je dan door het proces word geleidt, dus dat er dan
// een model word toegevoegd tussendoor etc. en je op het einde bij catalog dus
// 4 foto’s te zien krijgt, lifestyle 3 foto’s en video 1 video op het einde
// ziet. Ieder apart van elkaar."*
//
// Dat is bijna hetzelfde verhaal als het spel — kiezen, stijl, model, resultaat
// — en twee bijna gelijke dingen naast elkaar betekent twee fotoseries schieten
// en twee machines onderhouden. Gevraagd, en het antwoord was één ding. Dus het
// spel is weg en de walkthrough staat op zijn plek, op /demo én in /how-it-works.
// (/demo is er sinds 24 augustus 2026 niet meer; /how-it-works is de enige plek
// waar deze doorloop nog staat.)
// Wat overleeft is precies dit bestand: dezelfde beeldtabel, dezelfde
// placeholders, dus dezelfde schietlijst.
//
// ── DE BEELDEN ZIJN NOG GELEEND ──────────────────────────────────────────────
// Elke `src` hieronder wijst naar een bestand dat al op de site staat. Ze staan
// er zodat de walkthrough NU werkt en te beoordelen is in plaats van als grijze
// vlakken. Ze zijn niet goed genoeg om te blijven, om één reden die ertoe doet:
// de "voor" moet eruitzien als een telefoonfoto in een kamer. Leen je daar een
// studiofoto voor, dan laat het zien hoe een goede foto in een goede foto
// verandert, en dat is geen argument. Elke regel met `placeholder: true` moet
// vervangen worden; de lijst staat onderaan PLAN-DEMO-SPEL.md.
//
// ── WAT HIER NIET IN STAAT ───────────────────────────────────────────────────
// Geen prijzen (src/data/pricing.js), geen stijlnamen die ook in
// src/data/styles.js of src/data/videoStyles.js staan, geen shotnamen die ook
// in src/data/shots.js staan. Dit bestand wijst naar de waarheid en kopieert
// hem niet — de walkthrough leest de namen uit die bronnen en gebruikt de ids
// hieronder alleen om er beelden bij te zoeken.

import { WINDOW_THRESHOLD, turnaround } from './pricing.js';

// DE GETALLEN KOMEN UIT pricing.js EN NERGENS ANDERS. De drempel en de twee
// doorlooptijden staan in vier zinnen hieronder, in twee talen — acht plekken
// waar iemand "10" of "2–4 dagen" met de hand had kunnen typen. pricing.js
// noemt turnaround() de enige toegestane bron voor die strings; dit bestand
// houdt zich daaraan door ze op te halen in plaats van over te schrijven.
const WINDOW_THRESHOLD_ = WINDOW_THRESHOLD;
const TURN_ATT_ = turnaround('attended', 'en');
const TURN_UNATT_ = turnaround('unattended', 'en');
const TURN_ATT_NL_ = turnaround('attended', 'nl');
const TURN_UNATT_NL_ = turnaround('unattended', 'nl');

/** Het gezicht dat door alle drie de wegen loopt. Eén model voor drie diensten
 *  in plaats van één per dienst: het maakt van drie voorbeelden één campagne,
 *  en het scheelt twee derde van de fotoproductie — Lucas' eigen argument
 *  ("als ik de klant laat kiezen tussen 10 modellen moet ik 10x zoveel foto’s
 *  gaan maken voor dit concept"). */
export const DEMO_MODEL = {
  id: 'lisa',
  name: 'Lisa',
  photo: '/img/model-lisa-w800.webp',
};

/** De twee gezichten die zichtbaar maar vergrendeld naast hem staan. Kosten
 *  geen enkele nieuwe foto — dit zijn portretten die al in de roster zitten. */
export const DEMO_LOCKED_MODELS = [
  { id: 'ava', name: 'Ava', photo: '/img/model-ava-w800.webp' },
  { id: 'elias', name: 'Elias', photo: '/img/model-elias-w800.webp' },
];

/**
 * DE DRIE WEGEN.
 *
 * `look` is de tussenstap die deze weg stelt en `lookIds` zijn de keuzes erin.
 * De NAMEN bij die ids komen niet hier vandaan: catalog leest ze uit
 * src/data/backgrounds.js, lifestyle uit src/data/styles.js en video uit
 * src/data/videoStyles.js. Zo kan een stijl niet hier "Dunes" heten en daar
 * iets anders.
 *
 * `out` is hoeveel er aan het eind staat, en dat getal is geen keuze van deze
 * demo: vier voor een catalogset, drie voor een lifestyle-carousel, één clip.
 * Het is dezelfde rekensom als in PER_PRODUCT's copy in pricing.js.
 *
 * Catalog kiest een ACHTERGROND en geen stijl. Dat is niet symmetrie om de
 * symmetrie: het bestelformulier vraagt het ook, het is de enige keuze die een
 * catalogset heeft, en zonder tussenstap zou die ene weg twee stappen tellen
 * waar de andere twee er drie hebben — dan leest hij als de minder serieuze.
 */
export const WALK_SERVICES = [
  {
    id: 'catalog',
    look: 'background',
    lookIds: ['white', 'off-white', 'beige'],
    out: 4,
    /** De vier shots van een catalogset. Ids gelijk aan src/data/shots.js. */
    shots: ['front', 'back', 'detail', 'worn'],
    source: { src: '/img/catalog-before.webp', placeholder: true },
  },
  {
    id: 'lifestyle',
    look: 'style',
    // 'custom' zit hier bewust NIET bij. Een eigen stijl gaat via een notitie
    // bij de bestelling, niet via een knop in een demo — en een keuze tonen die
    // je niet kunt maken is erger dan hem weglaten. De walkthrough noemt hem in
    // een regel onder de keuzes.
    lookIds: ['dunes', 'flash', 'glow', 'phone-made'],
    out: 3,
    source: { src: '/img/lifestyle-phone-made-07.webp', placeholder: true },
  },
  {
    id: 'video',
    look: 'videoStyle',
    lookIds: ['motion', 'lifestyle', 'campaign'],
    out: 1,
    source: { src: '/img/lifestyle-flash-05.webp', placeholder: true },
  },
];

/**
 * DE NEGEN STAPPEN, in de volgorde waarin ze echt gebeuren.
 *
 * Lucas: *"duidelijk en gedetailleerd vertellen wat er precies gebeurt wanneer
 * een klant besteld."* De vorige versie had er vijf en die begonnen pas bij de
 * foto — het formulier, de agenda, de betaling, het portaal en de revisie
 * ontbraken allemaal, terwijl dat juist de dingen zijn waar iemand die op het
 * punt staat te bestellen zich zorgen over maakt.
 *
 * `look` is de plek waar de dienstspecifieke keuze in valt; die staat per weg
 * in WALK_SERVICES hierboven, omdat catalog een achtergrond kiest en de andere
 * twee een stijl.
 *
 * DE VOLGORDE IS NIET WILLEKEURIG EN MAG NIET VERSCHUIVEN. Het venster wordt
 * bevestigd VOOR de betaling, niet erna — dat is de belofte waar de rest van de
 * site op leunt, en een doorloop die het andersom tekent maakt er een gewone
 * webshop van.
 */
/* ── VAN NEGEN NAAR ZES — 30 AUGUSTUS 2026 ──────────────────────────────────
 *
 * Lucas vroeg /how-it-works in te korten. Gemeten stond de doorloop op 5346px
 * van de 11.232 die de pagina lang was: negen blokken van 594px. Zijn keuze was
 * "kortere blokken én zes stappen".
 *
 * DRIE PAREN ZIJN ÉÉN GEWORDEN, en telkens omdat de twee helften dezelfde
 * handeling zijn, uitgevoerd door dezelfde partij, op hetzelfde moment:
 *
 *   order + upload  → `upload`  · allebei "jij, op de site, voor je betaalt"
 *   model + make    → `model`   · allebei "wij, in productie"
 *   portal + result → `result`  · allebei "jij, in je account, na de productie"
 *
 * WAT ER NIET IS SAMENGEVOEGD is `window` en `pay`, en dat is de enige plek waar
 * ik het niet heb gedaan terwijl het kon. Die twee staan los omdat de volgorde
 * ertussen de belofte IS: het venster wordt bevestigd vóór de betaling. Twee
 * stappen zeggen dat door hun bestaan; één stap zou het alleen nog beweren.
 *
 * DE VOLGORDE IS VERDER ONVERANDERD en mag dat blijven. Zie de noot hieronder.
 */
export const WALK_STEPS = ['upload', 'look', 'window', 'pay', 'model', 'result'];

/** De drie achtergronden uit src/data/backgrounds.js, hier alleen met hun kleur
 *  erbij zodat de walkthrough een staal kan tekenen. */
export const DEMO_BACKGROUNDS = [
  { id: 'white', hex: '#FFFFFF' },
  { id: 'off-white', hex: '#F7F5F1' },
  { id: 'beige', hex: '#EDE4D8' },
];

// ── DE BEELDTABEL ────────────────────────────────────────────────────────────
// Eén functie per weg, en de bestandsnaam IS de combinatie. Zodra de echte
// serie er staat is dit de enige plek die verandert, en een ontbrekend beeld
// valt meteen op omdat de naam dan niet bestaat.

const PLACEHOLDER_CATALOG = {
  front: '/img/catalog-after.webp',
  back: '/img/banners-03.webp',
  detail: '/img/banners-07.webp',
  worn: '/img/lifestyle-glow-02.webp',
};

/** Eén catalogbeeld: één shot op één achtergrond. */
export function catalogImage(shot, background) {
  if (PLACEHOLDER_CATALOG[shot]) {
    return { src: PLACEHOLDER_CATALOG[shot], placeholder: true };
  }
  return { src: `/img/demo/cat-${shot}-${background}.webp`, placeholder: false };
}

// Drie per stijl, want een lifestyle-carousel is er drie. Dunes heeft er maar
// twee op de site staan, dus de derde is geleend van een banner — nog een reden
// waarom deze hele tabel tijdelijk is.
const PLACEHOLDER_LIFESTYLE = {
  dunes: ['/img/lifestyle-dunes-01.webp', '/img/lifestyle-dunes-02.webp', '/img/banners-05.webp'],
  flash: ['/img/lifestyle-flash-01.webp', '/img/lifestyle-flash-03.webp', '/img/lifestyle-flash-04.webp'],
  glow: ['/img/lifestyle-glow-01.webp', '/img/lifestyle-glow-03.webp', '/img/lifestyle-glow-04.webp'],
  'phone-made': ['/img/lifestyle-phone-made-01.webp', '/img/lifestyle-phone-made-04.webp', '/img/lifestyle-phone-made-07.webp'],
};

/** Eén beeld uit de carousel van een stijl. `i` is 0-based. */
export function lifestyleImage(style, i = 0) {
  const set = PLACEHOLDER_LIFESTYLE[style];
  if (set) return { src: set[i % set.length], placeholder: true };
  return { src: `/img/demo/lif-${style}-${i + 1}.webp`, placeholder: false };
}

/**
 * Video. Zolang er geen clips zijn staat hier een stilstaand beeld, en dat
 * wordt ook ALS stilstaand beeld getoond in plaats van als een <video> die
 * niets doet. Iemand die op play drukt en niets ziet gebeuren leert iets
 * verkeerds over de dienst.
 */
const PLACEHOLDER_VIDEO = {
  motion: '/img/banners-11.webp',
  lifestyle: '/img/lifestyle-glow-05.webp',
  campaign: '/img/lifestyle-flash-06.webp',
};

export function videoClip(style) {
  if (PLACEHOLDER_VIDEO[style]) {
    return { poster: PLACEHOLDER_VIDEO[style], clip: null, placeholder: true };
  }
  return { poster: `/img/demo/vid-${style}.webp`, clip: `/img/demo/vid-${style}.mp4`, placeholder: false };
}

/**
 * WAT ER AAN HET EIND STAAT, per weg en per keuze.
 *
 * Eén functie voor alle drie zodat de component niet hoeft te weten welke weg
 * hij toont — hij vraagt om een set en krijgt er een van de juiste lengte,
 * inclusief het label dat eronder hoort. Catalog levert shotnamen (die de
 * pagina uit shots.js haalt), de andere twee tellen.
 */
export function walkResult(service, look) {
  if (service === 'catalog') {
    const svc = WALK_SERVICES[0];
    return svc.shots.map(function frame(shot) {
      const img = catalogImage(shot, look);
      return { src: img.src, placeholder: img.placeholder, shot: shot, video: false };
    });
  }
  if (service === 'lifestyle') {
    return [0, 1, 2].map(function frame(i) {
      const img = lifestyleImage(look, i);
      return { src: img.src, placeholder: img.placeholder, shot: null, video: false };
    });
  }
  const clip = videoClip(look);
  return [{ src: clip.poster, clip: clip.clip, placeholder: clip.placeholder, shot: null, video: true }];
}

/**
 * DE TEKSTEN.
 *
 * Ze staan hier en niet in de aanroepende pagina's, anders dan bij de figuren
 * op /how-it-works — en dat is een bewuste uitzondering op die regel. TWEE
 * pagina's toonden deze walkthrough (/demo en /how-it-works), en copy die op twee
 * plekken staat is copy die uit elkaar gaat lopen. Eén tabel, twee talen, één
 * plek om te controleren.
 *
 * SINDS 24 AUGUSTUS 2026 IS HET ER ÉÉN — /demo is opgeheven — EN DE TEKST BLIJFT
 * HIER STAAN. Niet uit gemakzucht: de reden dat copy bij het onderdeel hoort en
 * niet bij de pagina, is dat het onderdeel hem gebruikt. Terugverhuizen naar
 * HowItWorksPage.astro zou de tekst weghalen bij de markup die hem toont, en de
 * volgende pagina die deze doorloop plaatst begint dan weer met een kopie.
 */
export const WALK_COPY = {
  en: {
    title: 'Follow one order, start to finish.',
    lede: 'Pick a service and scroll. The frame at the top holds still and shows what exists at that moment; the steps tell you exactly what is happening, in the order it happens.',
    label: 'A walkthrough of one VISUAILS order, from the form you fill in to the files you download',
    pickH: 'Pick one to follow',
    pickHint: 'One path at a time. Catalog, lifestyle and video do not share a process, and a diagram that lays them over each other is wrong about all three.',
    services: {
      catalog: { name: 'Catalog', line: 'Four images per product' },
      lifestyle: { name: 'Lifestyle', line: 'Three images, one styled look' },
      video: { name: 'Video', line: 'One clip that loops' },
    },

    // ── THE NINE ─────────────────────────────────────────────────────────
    // Every number in here comes from pricing.js through the constants
    // imported at the top of this file. Nothing is typed twice.
    steps: {
      upload: {
        n: 'You, on the site',
        h: 'You fill in the form and send your photos',
        b: `Five screens: what you want made, your photos, a note on the look, when you need it, and a confirmation — one set of choices for the whole order rather than product by product. Drag a folder in and we read the folder name as the product. Two shots per product are required, the front and the back; a detail and a worn shot are welcome if you have them. Phone photos on a table in daylight are exactly right. Five minutes, however many products you have, and nothing is charged or booked yet.`,
      },
      look: {
        n: 'You, on the site',
        h: 'You choose the look',
        b: 'One choice, applied to the whole order. That is the point of choosing it up front rather than per image: it is what makes twenty products come back looking like one shoot instead of twenty separate jobs.',
      },
      window: {
        n: 'Us, before you pay',
        h: 'We check the calendar and confirm a delivery date',
        b: `From ${WINDOW_THRESHOLD_} products the order goes into the calendar and gets ${TURN_ATT_.toLowerCase()} — in writing, and before anything is charged. If the week you need cannot be held, you are told that, with the next delivery date that can. No date is invented to keep an order. Below ${WINDOW_THRESHOLD_} products there is no delivery date to reserve: the order runs in the normal turnaround at ${TURN_UNATT_.toLowerCase()}.`,
      },
      pay: {
        n: 'You, by email',
        h: 'You pay, and production starts',
        b: 'A confirmation email arrives with the payment link. The order does not enter production until that payment is completed. The invoice follows automatically, and from that moment the order is visible in your account with its own timeline.',
      },
      model: {
        n: 'Us, in production',
        h: 'A face is added, and every product runs as one batch',
        b: 'Every order includes a model from the shared roster: no per-model fee, no upgrade to unlock one. In this walkthrough it is one face; on a real order you pick from ten, or we design one that is only yours. Then every product in the order runs through together, which is what makes the lighting, the angle and the grade match across all of them — run separately they would not. Each image is finished by hand in professional editing tools, colour-graded to your brand, and a specialist checks fit, colour against your own photo, and framing before anything leaves.',
      },
      /* ── DE DREMPEL STOND HIER NOG, EN HIJ IS ER SINDS 7 AUGUSTUS AF ────────
         Deze twee zinnen zeiden dat per beeld goedkeuren pas vanaf
         WINDOW_THRESHOLD producten geldt en dat je er daaronder een downloadlink
         voor krijgt. canReviewOrder() in pricing.js kijkt niet naar een aantal:
         hij weigert alleen de proefvisual en een al afgesloten bestelling. Elke
         betaalde bestelling mag het, hoe klein ook.

         Het BELOOFDE dus minder dan het levert, en dat is een zeldzame richting
         voor een fout — maar het is er wel een: een merk dat drie producten wil
         proberen, leest hier dat het dan een zip krijgt in plaats van het scherm
         waar deze hele pagina over gaat, en dat is precies het merk dat je binnen
         wilt halen. De drempel blijft staan waar hij wél geldt: de leverdatum. */
      result: {
        n: 'You, in your account',
        h: 'It arrives image by image, you approve it, you download it',
        b: 'Every paid order lands in a portal grouped by product — three products or three hundred. Each image is approved on its own, and what is not right goes back in one go, as the single revision round the order carries, with a note saying what is wrong — while the rest of the order keeps moving; nothing waits on anything else, and nothing is final until you say so. What you approve downloads as high-resolution, e-commerce-ready files, sized for shop listings, marketplaces and ads, with full commercial usage rights — one at a time, or the whole approved set as a zip.',
      },
    },

    lookCustom: 'Something else in mind? A style of your own goes in a note with your order and we look at it together.',
    modelLocked: 'Locked in this walkthrough',
    modelRoster: 'See the ten models',
    outCount: function outCount(n) { return n === 1 ? 'One clip, from that one photo.' : `${n} images, from that one photo.`; },
    shotNames: { front: 'Front', back: 'Back', detail: 'Detail', worn: 'On a model' },
    backgroundNames: { white: 'White', 'off-white': 'Off-white', beige: 'Beige' },

    // The captions under the frame. Short — the frame is not the argument, the
    // step beside it is.
    capUpload: 'What you send',
    capWindow: 'The calendar check',
    capPay: 'Paid — production starts',
    windowPass: 'The calendar can hold it — reserved and confirmed before you pay',
    windowRefuse: 'Or it cannot, and you are told that with the next delivery date that can',
    payLine: 'Nothing is produced before this is completed.',

    ctaPrimary: 'Start an order with your own products',
    ctaGhost: 'Start an order',
    placeholderNote: 'Stand-in images — the walkthrough set is still being shot. Every frame here was made earlier for a real order; nothing is generated while you look at it.',
    noClip: 'The clip for this style has not been shot yet — this is the still it will be cut from.',
  },

  nl: {
    title: 'Volg één bestelling, van begin tot eind.',
    lede: 'Kies een dienst en scroll. Het kader bovenaan blijft staan en laat zien wat er op dat moment bestaat; de stappen vertellen precies wat er gebeurt, in de volgorde waarin het gebeurt.',
    label: 'Een doorloop van één VISUAILS-bestelling, van het formulier dat je invult tot de bestanden die je downloadt',
    pickH: 'Kies er één om te volgen',
    pickHint: 'Eén weg tegelijk. Catalog, lifestyle en video delen geen proces, en een tekening die ze over elkaar heen legt heeft het over alle drie mis.',
    services: {
      catalog: { name: 'Catalog', line: 'Vier beelden per product' },
      lifestyle: { name: 'Lifestyle', line: 'Drie beelden, één gestylede look' },
      video: { name: 'Video', line: 'Eén clip die doorloopt' },
    },

    steps: {
      upload: {
        n: 'Jij, op de site',
        h: 'Je vult het formulier in en stuurt je foto\u2019s',
        b: 'Vijf schermen: wat je wilt laten maken, je foto\u2019s, een notitie over de look, wanneer je het nodig hebt, en een bevestiging — één set keuzes voor de hele bestelling en niet per product. Sleep een map erin en we lezen de mapnaam als het product. Twee shots per product zijn verplicht, voorkant en achterkant; een detail en een gedragen shot zijn welkom als je ze hebt. Telefoonfoto\u2019s op tafel bij daglicht zijn precies goed. Vijf minuten, hoeveel producten het ook zijn, en er wordt nog niets in rekening gebracht en niets vastgelegd.',
      },
      look: {
        n: 'Jij, op de site',
        h: 'Je kiest de look',
        b: 'Eén keuze, voor de hele bestelling. Dat is precies waarom hij vooraf wordt gemaakt en niet per beeld: het is wat ervoor zorgt dat twintig producten terugkomen alsof het één shoot was in plaats van twintig losse opdrachten.',
      },
      window: {
        n: 'Wij, voordat je betaalt',
        h: 'Wij checken de agenda en bevestigen een leverdatum',
        b: `Vanaf ${WINDOW_THRESHOLD_} producten gaat de bestelling de agenda in en krijgt hij ${TURN_ATT_NL_.toLowerCase()} — schriftelijk, en voordat er iets in rekening wordt gebracht. Kan de week die je nodig hebt niet worden vastgehouden, dan hoor je dat, met de eerstvolgende leverdatum die het wél kan. Er wordt geen datum verzonnen om een bestelling binnen te houden. Onder ${WINDOW_THRESHOLD_} producten valt er geen leverdatum te reserveren: die bestelling loopt in de normale doorlooptijd, ${TURN_UNATT_NL_.toLowerCase()}.`,
      },
      pay: {
        n: 'Jij, per mail',
        h: 'Je betaalt, en dan start de productie',
        b: 'Je krijgt een bevestigingsmail met de betaallink. De bestelling gaat pas in productie zodra die betaling is voltooid — dat is de enige poort tussen een opdracht beschrijven en ons eraan laten beginnen. De factuur volgt automatisch, en vanaf dat moment staat de bestelling in je account met een eigen tijdlijn.',
      },
      model: {
        n: 'Wij, in productie',
        h: 'Er komt een gezicht bij, en alles gaat als één batch door',
        b: 'Elke bestelling bevat een model uit de gedeelde bibliotheek: geen kosten per model, geen upgrade om er een vrij te spelen. In deze doorloop is het één gezicht; bij een echte bestelling kies je uit tien, of we ontwerpen er één die alleen van jou is. Daarna gaat elk product in de bestelling samen door de productie, en daardoor kloppen de belichting, de hoek en de kleur over alle producten met elkaar — los gedraaid lukt dat niet. Elk beeld wordt met de hand afgewerkt in professionele editingtools, kleurgecorrigeerd naar je merk, en een specialist controleert de pasvorm, de kleur tegen je eigen foto en de kadrering voordat er iets weggaat.',
      },
      // Zie de noot bij de Engelse result-tekst hierboven.
      result: {
        n: 'Jij, in je account',
        h: 'Het komt beeld voor beeld binnen, jij keurt goed, jij downloadt',
        b: 'Elke betaalde bestelling komt in een portaal, gegroepeerd per product — of het er nu drie zijn of driehonderd. Elk beeld keur je apart goed. Wat niet goed is vink je aan en stuur je in één keer op als de ene revisieronde die bij de bestelling hoort, met een notitie erbij, terwijl de rest van de bestelling gewoon doorloopt; niets wacht op iets anders, en niets is definitief tot jij dat zegt. Wat je goedkeurt download je als hogeresolutiebestanden, klaar voor e-commerce, op maat voor shoplistings, marktplaatsen en advertenties, met volledige commerciële gebruiksrechten — los, of de hele goedgekeurde set als zip.',
      },
    },

    lookCustom: 'Iets anders voor ogen? Een eigen stijl gaat in een notitie bij je bestelling, en dan kijken we er samen naar.',
    modelLocked: 'Vast in deze doorloop',
    modelRoster: 'Bekijk de tien modellen',
    outCount: function outCount(n) { return n === 1 ? 'Eén clip, uit die ene foto.' : `${n} beelden, uit die ene foto.`; },
    shotNames: { front: 'Voorkant', back: 'Achterkant', detail: 'Detail', worn: 'Op een model' },
    backgroundNames: { white: 'Wit', 'off-white': 'Gebroken wit', beige: 'Beige' },

    capUpload: 'Wat jij stuurt',
    capWindow: 'De agendacheck',
    capPay: 'Betaald — de productie start',
    windowPass: 'De agenda kan het vasthouden — gereserveerd en bevestigd voordat je betaalt',
    windowRefuse: 'Of niet, en dan hoor je dat met de eerstvolgende leverdatum die het wél kan',
    payLine: 'Er wordt niets geproduceerd voordat dit is voltooid.',

    ctaPrimary: 'Start een bestelling met je eigen producten',
    ctaGhost: 'Start een bestelling',
    placeholderNote: 'Voorlopige beelden — de serie voor deze doorloop moet nog geschoten worden. Elk kader hier is eerder gemaakt voor een echte bestelling; er wordt niets gegenereerd terwijl je kijkt.',
    noClip: 'De clip voor deze stijl is nog niet geschoten — dit is het stilstaande beeld waar hij uit gesneden wordt.',
  },
};
