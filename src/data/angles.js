/**
 * VISUAILS — DE HOEKEN DIE JE BIJ EEN CATALOGSET KUNT BIJBESTELLEN
 * 9 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"De klant krijgt nu 4 beelden per product maar kan dus ook 4 extra
 * foto's per product toevoegen alleen vind ik hoe dat nu gaat niet handig en
 * niet duidelijk voor mij en voor de klant. Wellicht is het handig om de klant
 * vooraf te laten kiezen (…) dat hij eerst een scherm heeft waar hij kan kiezen
 * hoeveel product angles er moeten komen (…) Ik wil dan dat hij onder dat blok
 * angles kan kiezen met een foto van die angle erbij zodat hij weet wat hij
 * erbij kiest en per foto ook nog een note kan achterlaten."*
 *
 * ── WAT ER VERANDERT, EN WAAROM HET EEN VEREENVOUDIGING IS ──────────────────
 *
 * Tot vandaag was een extra foto iets wat je PER PRODUCT bijbestelde en dan zelf
 * moest BESCHRIJVEN: een teller op elke productkaart, en per bijbestelde foto
 * een verplicht tekstveld. Bij twintig producten met vier extra's zijn dat
 * tachtig tekstvelden, en de klant typt er tachtig keer ongeveer hetzelfde in.
 *
 * Nu is het één keuze vooraf, voor de hele bestelling, uit een lijst met een
 * FOTO per hoek. Je ziet wat je koopt in plaats van het te moeten omschrijven,
 * en elk product krijgt dezelfde hoeken — wat ook precies de reden is dat een
 * catalogset überhaupt bestaat: hetzelfde kader bij elk product.
 *
 * Lucas' eigen woorden daarover: *"Wanneer hij in het eerste scherm de angles
 * heeft gekozen krijgt elk product die angles, dus dit is niet per product aan
 * te passen."*
 *
 * ── DE FOTO'S BESTAAN NOG NIET ─────────────────────────────────────────────
 *
 * Elke hoek wijst naar /img/hoek-<id>.webp. Die bestanden liggen er nog niet, en
 * dat hoeft ook niet: scripts/plaatshouders.mjs tekent bij de build een
 * plaatshouder met de naam en de maat erin voor elk beeld dat niet op schijf
 * staat (zie src/data/beeld.js). Leg de foto onder die naam in public/img en hij
 * staat er bij de volgende build — er hoeft hier niets te veranderen.
 *
 * DE MAAT: 4:3 liggend, want dat is de vorm van de tegel in de kiezer. Wie de
 * foto's schiet, kan die verhouding aanhouden.
 *
 * ── TWEE GROEPEN, EN DAT IS GEEN INDELING MAAR EEN VERSCHIL ────────────────
 *
 * Lucas: *"dit kan voor on-model maar ook voor flat lay extra catalog foto's."*
 * Een hoek op een model kost een model, een hoek op de ondergrond niet — het is
 * hetzelfde tarief, maar het is niet hetzelfde soort beeld, en een klant die
 * vier hoeken kiest hoort te zien of hij vier keer een model bestelt of niet.
 */

/** De vier hoeken die altijd in een catalogset zitten, staan in shots.js. Dit
 *  is wat je daarNAAST kunt kiezen. */
export const ANGLE_GROUPS = ['model', 'ground'];

/*
 * ── WELKE DIENSTEN HIERDOOR OPEN KOMEN TE STAAN — 10 september 2026 ─────────
 *
 * Lucas: *"Catalog wordt nu vanaf 4 foto's omdat klanten nu extra foto's erbij
 * kunnen kiezen."*
 *
 * Dat klopt, en het raakt de tekst op meer plekken dan je zou denken: de
 * voorpagina, /start, /pricing, /catalog, de veelgestelde vragen en de
 * metabeschrijvingen zeiden allemaal "4 foto's" als een vast getal. Sinds de
 * hoekenkiezer bestaat is vier de ONDERGRENS en niet de uitkomst.
 *
 * Maar niet overal. Deze lijst is precies de verzameling pagina's waar
 * AnglePicker.astro gerenderd wordt — /start/catalog en /start/complete, in
 * beide talen — en dat is geen toeval maar de definitie: waar je hoeken kunt
 * bijbestellen, is het aantal open; waar dat niet kan, is het exact.
 *
 * Wat er dus BUITEN valt, en waarom:
 *   · lifestyle — een carousel is een gestylede scène en geen set hoeken; de
 *     kiezer staat niet op /start/lifestyle;
 *   · de proef van € 1 — tidyTestSampleDetails() in functions/api/order.js
 *     GOOIT elk `angle_*`-veld weg, met opzet: een proef is één set en verder
 *     niets. "Vanaf 4" zou daar een belofte zijn die het formulier weigert;
 *   · een abonnementsmaand — de maandset ligt vast in het plan, en het
 *     bestelscherm daarvan draagt de hoekenkiezer niet.
 *
 * Zou een van die drie ooit wél hoeken krijgen, dan hoort hij hier bij te komen
 * en verandert de tekst sitebreed mee. Dat is het hele punt van deze regel:
 * tests/hoeken.test.mjs vergelijkt hem met de pagina's die de kiezer echt
 * renderen, dus de lijst kan niet stil achterlopen op de werkelijkheid.
 */
export const UITBREIDBARE_DIENSTEN = ['catalog', 'complete'];

/** Kan de klant bij deze dienst foto's bijbestellen? Zo ja, dan is het aantal in
 *  de set een ondergrens ("vanaf 4") en geen uitkomst ("4"). */
export function isUitbreidbaar(service) {
  return UITBREIDBARE_DIENSTEN.includes(String(service || ''));
}

/* ── DRIE PER GROEP, EN DE VIERDE PLEK IS VAN DE KLANT — 17 SEPTEMBER 2026 ──
 *
 * Er stonden er acht: vier op een model en vier op de ondergrond. Lucas haalde
 * *In de hand* en *Zijkant* eruit en zette op de vrijgekomen vierde plek in
 * beide groepen de hoek die de klant ZELF bedenkt: een naam die hij typt, plus
 * een foto die verplicht is, want bij een zelfbedachte hoek is die foto de
 * opdracht.
 *
 * Die vierde staat daarom NIET in deze lijst — hij bestaat alleen zodra iemand
 * hem intypt, en hij heeft geen vaste id, geen vaste naam en geen tekening.
 * `tests/hoeken.test.mjs` telt er dus zes en drie per groep; de vierde plek is
 * een plek in de OPMAAK, geen regel in deze data.
 *
 * Wat dit raakt: /api/order leest per id een veld `angle_<id>`, dus die twee
 * velden worden niet meer gelezen. Bestellingen die er al zijn, staan los van
 * dit bestand. */
export const ANGLES = [
  // ── OP MODEL ─────────────────────────────────────────────────────────────
  {
    id: 'three-quarter',
    group: 'model',
    shot: '/img/hoek-three-quarter.webp',
    name: { en: 'Three-quarter', nl: 'Driekwart' },
    line: {
      en: 'The model turned about forty degrees, whole product in frame.',
      nl: 'Het model een graad of veertig gedraaid, het hele product in beeld.',
    },
  },
  {
    id: 'back-on-model',
    group: 'model',
    shot: '/img/hoek-back-on-model.webp',
    name: { en: 'From behind', nl: 'Van achter' },
    line: {
      en: 'The back, worn — how it sits and where it falls.',
      nl: 'De achterkant, gedragen — hoe hij zit en waar hij valt.',
    },
  },
  {
    id: 'detail-on-model',
    group: 'model',
    shot: '/img/hoek-detail-on-model.webp',
    name: { en: 'Detail on model', nl: 'Detail op model' },
    line: {
      en: 'Close in while it is worn: the fabric under tension, the fit at a seam.',
      nl: 'Dichtbij terwijl het gedragen wordt: de stof op spanning, de pasvorm bij een naad.',
    },
  },

  // ── OP DE ONDERGROND ─────────────────────────────────────────────────────
  {
    id: 'flat-lay',
    group: 'ground',
    shot: '/img/hoek-flat-lay.webp',
    name: { en: 'Flat-lay', nl: 'Flat-lay' },
    line: {
      en: 'Straight down from above, laid out and squared up.',
      nl: 'Recht van boven, uitgelegd en rechtgelegd.',
    },
  },
  {
    id: 'inside',
    group: 'ground',
    shot: '/img/hoek-inside.webp',
    name: { en: 'Inside', nl: 'Binnenkant' },
    line: {
      en: 'The lining, the label, the finish on the inside.',
      nl: 'De voering, het label, de afwerking aan de binnenkant.',
    },
  },
  {
    id: 'hardware',
    group: 'ground',
    shot: '/img/hoek-hardware.webp',
    name: { en: 'One detail, off the body', nl: 'Los detail' },
    line: {
      en: 'A logo, a zip, a sole, a button — one thing, filling the frame.',
      nl: 'Een logo, een rits, een zool, een knoop — één ding, beeldvullend.',
    },
  },
];

export const ANGLE_IDS = ANGLES.map((a) => a.id);

/*
 * ── DE VELDNAMEN VAN DE ZELFBEDACHTE HOEK ───────────────────────────────────
 *
 * De vierde plek in elke groep is van de klant: hij typt zelf wat hij wil, en
 * stuurt er bij elk product een foto van mee. Die hoek staat met opzet NIET in
 * ANGLES — hij heeft geen vaste naam en geen tekening, en de noot boven die
 * lijst legt uit waarom dat een plek in de opmaak is en geen regel in de data.
 *
 * Maar een formulierveld heeft een naam nodig, en die naam moet op TWEE plekken
 * bekend zijn: in het formulier dat hem post, en op de server die hem telt.
 * /api/order rekent de extra foto's uit met `ANGLE_IDS.filter(...)` — een lijst
 * die deze twee niet bevat. Zonder de regel hieronder is een zelfbedachte hoek
 * dus GRATIS: de klant kiest hem, krijgt er een verplicht uploadvak per product
 * bij, en de rekening weet er niets van.
 *
 * Vandaar deze constante. Het is geen hoek met een naam en een beeld; het zijn
 * de twee veldnamen waaronder de klant er zelf een kan beschrijven.
 */
export const EIGEN_ANGLE_PREFIX = 'eigen-';
export const EIGEN_ANGLE_IDS = ANGLE_GROUPS.map((g) => `${EIGEN_ANGLE_PREFIX}${g}`);

/** Is dit de zelfbedachte hoek van een groep? */
export function isEigenAngleId(id) {
  return EIGEN_ANGLE_IDS.includes(String(id || ''));
}

/** Alles wat als bijbestelde hoek mag meetellen: de vaste plus de zelfbedachte. */
export const TELBARE_ANGLE_IDS = [...ANGLE_IDS, ...EIGEN_ANGLE_IDS];

/** Eén hoek op id, of null. Nooit een gok: een onbekende id is een gesleuteld
 *  formulier en die hoort niets op te leveren. */
export function angleById(id) {
  const v = String(id || '');
  return ANGLES.filter((a) => a.id === v)[0] || null;
}

export const ANGLE_COPY = {
  en: {
    groups: { model: 'On a model', ground: 'On the ground' },
    fixedH: 'Always included',
    fixedLine: 'These four are the catalog set. Every product gets them, at the per-product rate.',
    extraH: 'Add an angle',
    extraLine: 'Chosen once for the whole order. Up to {max} on top of the four.',
    note: 'Anything specific? (optional)',
    notePh: 'e.g. show the chest logo',
    /* ── DE HOEK DIE ER NIET TUSSEN STAAT — 17 september 2026 ──────────────
       Lucas: *"Custom angle mist ook."* Het zat in /concept/bestelrij en niet
       in het echte formulier, terwijl het de enige uitweg is voor een product
       dat niet in twaalf vaste hoeken past — een tas van binnen, een schoen van
       onderen, een label dat alleen in een vouw zit.

       De omschrijving is hier VERPLICHT en niet optioneel, en dat is het hele
       verschil met de notitie hierboven. Bij een vaste hoek weten we wat we
       maken en is de notitie een aanvulling. Bij een eigen hoek is de
       omschrijving de opdracht: zonder die zin is er niets te maken. */
    eigenNaam: 'Your own angle',
    eigenPh: 'e.g. the inside of the bag, flat',
    eigenNote: 'Describe the angle',
    eigenHint: 'Same price. You send a photo of it with each product, so we know exactly what you mean.',
    /* ── EN WAT ER GEBEURT ALS DIE ZIN ONS TOCH NIET GENOEG IS ─────────────
       Dit stond in /concept/bestelrij en is er bij het overzetten uit gevallen.
       Het hoort precies hier: op het moment dat iemand iets bestelt dat niet in
       een lijstje past, is de eerste vraag "en als jullie het verkeerd
       begrijpen?". Het antwoord daarop hoort niet in een veelgestelde vraag
       drie pagina's verderop te staan. */
    twijfelNoot: 'If we are unsure what you mean, we get in touch before we start. Better one message up front than an image you did not ask for.',
    per: '{price} per photo, per product',
    /* De weg naar /per-product, vanuit het formulier. "alle twaalf" en niet "de
       hoeken": op die pagina staan de vier vaste opnames én de acht extra's, en
       dat is precies waarom hij bestaat. Het getal komt niet uit de lucht — het
       is SHOTS.length + ANGLES.length — maar het staat hier als woord omdat een
       linktekst met een berekening erin niet te lezen valt. Verandert een van de
       twee lijsten, dan zegt tests/hoeken.test.mjs het. */
    seeAll: 'See all twelve',
    chosen: '{n} chosen',
    full: 'That is the maximum of {max}.',
    /* De rekensom uitgeschreven en niet alleen de uitkomst. Dit bedrag is het
       enige getal in dit blok dat over de HELE bestelling gaat, en een klant die
       ziet waar het vandaan komt, hoeft niet te vertrouwen dat het klopt. */
    total: '{n} extra photos × {p} products × {price} = {sum} on top',
    totalOne: '1 extra photo × {p} products × {price} = {sum} on top',
    totalOneP: '{n} extra photos × 1 product × {price} = {sum} on top',
    totalOneBoth: '1 extra photo × 1 product = {sum} on top',
  },
  nl: {
    groups: { model: 'Op een model', ground: 'Op de ondergrond' },
    fixedH: 'Zit er altijd bij',
    fixedLine: 'Deze vier zijn de catalogset. Elk product krijgt ze, voor het tarief per product.',
    extraH: 'Een hoek erbij',
    extraLine: 'Eén keer gekozen voor de hele bestelling. Tot {max} bovenop de vier.',
    note: 'Iets specifieks erbij? (optioneel)',
    notePh: 'bijv. laat het logo op de borst zien',
    /* Zie de noot bij de Engelse tegenhanger: de omschrijving is hier verplicht,
       want bij een eigen hoek ís die omschrijving de opdracht. */
    eigenNaam: 'Zelf bedenken',
    eigenPh: 'bijv. de binnenkant van de tas, plat',
    eigenNote: 'Omschrijf de hoek',
    eigenHint: 'Zelfde prijs. Je stuurt er bij elk product een foto van mee, zodat we precies weten wat je bedoelt.',
    /* Zijn eigen woorden van /concept/bestelrij; zie de noot bij de Engelse
       tegenhanger voor waarom ze hier staan en niet in een FAQ. */
    twijfelNoot: 'Twijfelen wij over wat je bedoelt, dan nemen we contact met je op vóórdat we beginnen. Liever één berichtje vooraf dan een beeld dat je niet bedoelde.',
    per: '{price} per foto, per product',
    /* De weg naar /per-product, vanuit het formulier. "alle twaalf" en niet "de
       hoeken": op die pagina staan de vier vaste opnames én de acht extra's, en
       dat is precies waarom hij bestaat. Het getal komt niet uit de lucht — het
       is SHOTS.length + ANGLES.length — maar het staat hier als woord omdat een
       linktekst met een berekening erin niet te lezen valt. Verandert een van de
       twee lijsten, dan zegt tests/hoeken.test.mjs het. */
    seeAll: 'Bekijk alle twaalf',
    chosen: '{n} gekozen',
    full: 'Dat is het maximum van {max}.',
    /* Zie de Engelse tegenhanger. */
    total: '{n} extra foto’s × {p} producten × {price} = {sum} erbij',
    totalOne: '1 extra foto × {p} producten × {price} = {sum} erbij',
    totalOneP: '{n} extra foto’s × 1 product × {price} = {sum} erbij',
    totalOneBoth: '1 extra foto × 1 product = {sum} erbij',
  },
};
