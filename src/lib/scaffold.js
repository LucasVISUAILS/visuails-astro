// VISUAILS — de mappenroute: een lege bestelling als zip, en dezelfde zip terug.
//
// ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
//
// Lucas, 12 augustus 2026: *"wanneer iemand een bestelling heeft geplaatst onder
// een specifieke service dat ik het verzenden sneller wil maken door een soort
// mappenroute te kunnen downloaden vanuit /admin zodat ik alleen de foto’s in de
// juiste folders moet zetten en een andere naam moet geven"* — en op de vraag hoe
// ver dit moest gaan: *"Heen en terug, hernoemen helemaal weg, het moet zoveel
// mogelijk tijd schelen."*
//
// Dus is het hernoemen eruit. Dat is de hele truc van dit bestand en hij past in
// één zin: **de map waarin een bestand staat, zegt al welk product en welke shot
// het is.** Als de structuur dat draagt, hoeft de bestandsnaam niets te dragen —
// en dan mag een export uit Magnific of Photoshop heten zoals hij heet.
//
//   HEEN   /admin/orders/:id/scaffold levert een zip met alleen de STRUCTUUR:
//          een map per product, daarin een map per shot, plus een leesmij, een
//          licentiebestand en per product de briefing van de klant.
//
//   TERUG  Hij vult de mappen, kiest de hele map in het uploadveld op
//          /admin/orders/:id/files, en de server leest product en shot uit het
//          pad in plaats van uit de naam.
//
// ── WAAROM EEN MAP KIEZEN EN GEEN ZIP UPLOADEN ──────────────────────────────
//
// De eerste opzet was: hij zipt de gevulde map en de server pakt hem uit. Dat is
// een uitpakker in een Worker (deflate via DecompressionStream, plus het
// koppen-formaat) én een heel archief in het geheugen van een omgeving met 128 MB
// — voor een bestelling van dertig producten is dat de manier waarop het omvalt.
//
// Het kan simpeler, en simpeler is hier ook sneller voor hem: `webkitdirectory`
// op een <input type="file"> laat de browser een hele map posten, en elk bestand
// draagt dan zijn RELATIEVE PAD als bestandsnaam in de multipart-body. Geen
// JavaScript nodig — het is een attribuut — en dat is hier een eis en geen gemak:
// /admin draait onder `default-src 'none'` en laadt geen script.
//
// Voor Lucas scheelt het ook de zipstap: map kiezen, uploaden, klaar.
//
// ── DE GRENS DIE DIT WEL HEEFT ──────────────────────────────────────────────
//
// `webkitdirectory` is een niet-gestandaardiseerd attribuut. Chrome, Edge, Firefox
// en Safari sturen het relatieve pad; een browser die het niet kent, negeert het
// attribuut en levert een gewone bestandskiezer op. Dat is precies de goede
// terugval: dan komen de bestanden zonder pad binnen en valt admin.js terug op de
// gok uit de bestandsnaam die er al was. Niets kapot, alleen minder gemak.

/* SHOT_IDS en niet een eigen lijst: src/data/shots.js is de bron voor welke vier
   shots er per product zijn en in welke volgorde. Een tweede kopie hier zou de
   mapstructuur laten afwijken van het werkbord op /admin, en dan komt een beeld in
   een map te staan waar geen vakje voor is. */
import { RESOLUTIE, VOORRANG } from '../data/pricing.js';
import { SHOT_IDS, shot as shotInfo, contextShotSlot } from '../data/shots.js';
/* De kleur van een product: naam, hex, Pantone (5.03). */
import { kleurInfo, rgbVan } from './kleurcode.js';
/* Het kledingstuk voor de plakregel (4.02): het TYPE, nooit de productnaam. */
import { garment as garmentVan } from '../data/garments.js';

/**
 * De mapnaam per shot, met een cijfer ervoor.
 *
 * HET CIJFER IS GEEN SIER. Verkenner sorteert alfabetisch, en zonder cijfer staat
 * "achterkant" boven "voorkant" — precies omgekeerd aan de volgorde waarin je ze
 * maakt en aflevert. Eén teken scheelt bij elke bestelling een moment zoeken.
 *
 * De NEDERLANDSE woorden, ook op een Engelse bestelling: dit archief is voor de
 * studio en niet voor de klant. De klant ziet de bestandsnamen die de server
 * eraan geeft, en die volgen wel de taal van de bestelling.
 */
export const SLOT_FOLDER = {
  front: '1 voorkant',
  back: '2 achterkant',
  detail: '3 detail',
  worn: '4 op-model',
};

/** De map voor beeld dat niet in een vakje hoort: extra foto’s, losse varianten. */
export const LOOSE_FOLDER = '_los';

/** De map met wat de klant heeft aangeleverd. Sinds 8 oktober 2026 (4.02) per
 *  product gevuld met de foto's van de klant; zie klantFotoBestanden(). */
export const SOURCE_FOLDER = '_aangeleverd';

/** De map waarin het Photoshop-script (4.07) het ruwe beeld zet, per vak. Komt
 *  bij "Map uploaden" nooit als levering terug; zie isRawPath(). */
export const RAW_FOLDER = '_ruw';

/**
 * Een mapnaam waar geen uitpakker en geen Verkenner over valt.
 *
 * Productnamen komen van de klant. Die typt schuine strepen, dubbele punten,
 * emoji en een keer een naam van tweehonderd tekens — en dit wordt een pad op
 * een Windows-machine. zip.js schoont zelf ook op (zie uniqueNames), maar daar is
 * het een laatste vangnet; hier is het de plek waar de naam LEESBAAR moet blijven.
 */
export function safeSegment(raw, fallback = 'zonder naam') {
  const clean = String(raw || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    // De tekens die Windows in een naam verbiedt, plus de schuine strepen: die
    // zouden een extra maplaag maken en het product ergens anders laten landen.
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    // Een punt aan het eind laat Windows stil weg; dan verschilt de mapnaam van
    // wat er in de zip staat en dat is het soort verschil dat je nooit vindt.
    .replace(/\.+$/, '')
    .slice(0, 48)
    .trim();
  return clean || fallback;
}

/**
 * De mapnaam van één product: `p3 - Zwarte hoodie`.
 *
 * DE SLEUTEL STAAT VOORAAN EN BLIJFT STAAN. Dat is wat de terugweg leest, dus is
 * het geen opsmuk maar de dragende helft van de naam. De productnaam erachter is
 * voor de mens; verandert de klant hem, dan verandert er niets aan de werking.
 *
 * Waarom `p3` en niet `03`: een los getal is dubbelzinnig. `03` in een pad kan een
 * volgnummer zijn, een maat, een datum. `p3` is een sleutel en botst met niets —
 * en het is dezelfde sleutel die `files.product_key` en details_json al gebruiken.
 */
export function productFolder(index, name) {
  return `p${index} - ${safeSegment(name, `product ${index}`)}`;
}

/**
 * Het pad terugleggen op product en shot.
 *
 * DIT IS DE TERUGWEG, en hij is met opzet strikter dan guessProductShot() in
 * admin.js. Die functie raadt uit een bestandsnaam en mag dat: een gok die je
 * daarna in een tabel corrigeert is beter dan dertig keuzelijstjes leeg. Deze
 * functie leest een structuur die wij zelf hebben uitgedeeld, dus hoort hij niet
 * te raden — hij hoort te herkennen of niets te zeggen.
 *
 * Vandaar dat er GEEN losse getallen worden gelezen. `1 voorkant` is een shotmap
 * en de 1 daarin is geen product; alleen een segment dat op `p<cijfer>` begint is
 * een productsleutel. Zou dit wel losse getallen lezen, dan zou elke shotmap het
 * product overschrijven — en dat is een fout die je pas ziet als er dertig beelden
 * op product 1 staan.
 *
 * @returns {{product: string|null, shot: string|null, loose: boolean}}
 */
export function parseScaffoldPath(relPath) {
  const segments = String(relPath || '').split(/[\\/]+/).filter(Boolean);
  // Het laatste segment is de bestandsnaam; die telt hier niet mee. Een bestand
  // dat los in de wortel van de zip staat heeft dus geen product en geen shot,
  // en dat is het juiste antwoord — niemand heeft gezegd waar het hoort.
  const folders = segments.slice(0, -1);

  let product = null;
  let shot = null;
  let loose = false;

  for (const seg of folders) {
    const m = seg.match(/^p(\d{1,3})\b/i);
    if (m) { product = `p${Number(m[1])}`; continue; }
    if (seg === LOOSE_FOLDER) { loose = true; continue; }
    // Het bronmateriaal van de klant hoort niet als levering terug te komen. Zou
    // iemand die map per ongeluk meesturen, dan is dat geen shot en geen los
    // beeld maar iets wat overgeslagen moet worden -- zie SOURCE_FOLDER.
    if (seg === SOURCE_FOLDER) { loose = true; continue; }
    /* Ronde 9, F17: een bijbestelde hoek heet `5 driekwart [extra1]` en een
       lifestylebeeld `1 beeld-1`. De sleutel tussen haken is wat telt; het woord
       ervoor is voor de mens. */
    /* Sinds 14 oktober 2026 draagt elk vak dat geen catalogvak is zijn sleutel
       tussen haken: `1 model-voorkant [front]`, `3 product [product]`. */
    const extra = seg.match(/\[(extra[1-9][0-9]?|front|back|detail|worn|product)\]\s*$/i);
    if (extra) { shot = extra[1].toLowerCase(); continue; }
    const ls = seg.match(/^(?:\d+\s*)?(?:beeld|image)-([123])$/i);
    if (ls) { shot = ['front', 'back', 'detail'][Number(ls[1]) - 1]; continue; }
    for (const [key, folder] of Object.entries(SLOT_FOLDER)) {
      if (seg === folder) { shot = key; break; }
      // Ook zonder het cijfer ervoor, want iemand hernoemt een map en dan hoort
      // het nog te werken: "voorkant" alleen is even duidelijk.
      if (seg.toLowerCase() === folder.replace(/^\d+\s*/, '')) { shot = key; break; }
    }
  }
  return { product, shot, loose };
}

/**
 * De drie tekstbestanden die de werkmap zelf uitdeelt.
 *
 * ── WAAROM DIT ER MOEST KOMEN ───────────────────────────────────────────────
 *
 * Gevonden bij het naspelen van de terugweg met echte bestandsnamen: kiest de studio
 * "de hele map", dan gaat ALLES mee wat erin staat -- en dat zijn dus ook LEESMIJ.txt
 * en elke _briefing.txt. Die zouden als `kind='delivery'` in de database landen en
 * daarmee in het portaal van de klant verschijnen: een werkinstructie voor de studio,
 * tussen zijn afgewerkte beelden, in een raster dat een miniatuur van een tekstbestand
 * probeert te maken.
 *
 * LICENTIE.txt hoort in dit lijstje en dat is een keuze. Het is het enige van de drie
 * dat de klant wél zou willen hebben -- maar dan hoort het als levering te worden
 * bedacht en niet als bijproduct van een mapselectie mee te liften: bij twee uploads
 * staat het er twee keer, en de voorwaarden staan al op de site en in de
 * bestelbevestiging. Wil je het meeleveren, dan is dat een eigen beslissing.
 */
export function isScaffoldDoc(relPath) {
  const naam = String(relPath || '').split(/[\\/]+/).pop() || '';
  return naam === 'LEESMIJ.txt' || naam === 'LICENTIE.txt' || naam === '_briefing.txt';
}

/** Hoort dit pad bij het bronmateriaal, en moet het dus NIET als levering terug? */
export function isSourcePath(relPath) {
  return String(relPath || '').split(/[\\/]+/).some((seg) => seg === SOURCE_FOLDER);
}

/** Staat dit bestand in een `_ruw/`-map (het beeld vóór Photoshop, 4.07)? Dan is
 *  het een werkbestand en geen levering. Alleen de MAPNAAM telt, niet de naam van
 *  het bestand: een export die toevallig "_ruw" heet, is gewoon een beeld. */
export function isRawPath(relPath) {
  return String(relPath || '').split(/[\\/]+/).slice(0, -1).some((seg) => seg === RAW_FOLDER);
}

/* ─────────────────────────────────────────────────────────────────────────────
   WELKE BESTELLING IS DIT? — 8 oktober 2026 (punt 4.02)
   ─────────────────────────────────────────────────────────────────────────────
   De zwaarste fout in de leverstroom: de map van klant A op de bestelling van
   klant B. Na de eerste levering is elk nieuw beeld meteen zichtbaar voor de
   klant (§20), dus moet de server dat weigeren vóórdat er iets wordt opgeslagen.

   Het kenmerk staat op drie plekken die we zelf uitdelen: de wortelmap
   (`VIS-2608-4471 - Merk`), de bestandsnaam die het Photoshop-script maakt
   (`VIS-2608-4471-p1-voorkant.jpg`) en de INSTELLINGEN-regel in elke
   _briefing.txt (`kenmerk=VIS-2608-4471`), die met de map meegaat als vingerafdruk.

   NIET in de productmappen kijken: daar staat de productnaam van de KLANT achter
   `p3 - `, en die is vrije tekst. Wel in de bestandsnaam, want die komt van ons
   of van een export. */
const KENMERK = /\bVIS-[A-Z0-9]{2,8}-[A-Z0-9]{2,8}(?:-R\d{1,3})?(?![A-Z0-9])/gi;

/** De kenmerken in een relatief pad, in hoofdletters, zonder dubbele. */
export function kenmerkenInPad(relPath) {
  const segs = String(relPath || '').split(/[\\/]+/).filter(Boolean);
  const gevonden = new Set();
  segs.forEach((seg, i) => {
    const isBestand = i === segs.length - 1;
    if (!isBestand && /^p\d{1,3}\b/i.test(seg)) return;   // productmap: naam van de klant
    for (const m of seg.match(KENMERK) || []) gevonden.add(m.toUpperCase());
  });
  return [...gevonden];
}

/** Het kenmerk uit de tekst van een _briefing.txt of LEESMIJ.txt uit onze werkmap,
 *  of '' als er geen staat. Alleen de vaste plekken: `kenmerk=` in de
 *  INSTELLINGEN-regel en de eerste regel van de leesmij. Nooit de notitie van de
 *  klant, want daar mag hij gerust een ander kenmerk noemen. */
export function kenmerkUitWerkbestand(tekst) {
  const t = String(tekst || '');
  const inst = t.match(/^INSTELLINGEN\b.*?\bkenmerk=(VIS-[A-Z0-9-]+)/im);
  if (inst) return inst[1].toUpperCase();
  const kop = t.match(/^VISUAILS - werkmap voor bestelling (VIS-[A-Z0-9-]+)/m);
  return kop ? kop[1].toUpperCase() : '';
}

/** Het eerste vreemde kenmerk in een lijst, of '' als alles bij `ref` hoort. */
export function vreemdKenmerk(ref, kenmerken) {
  const eigen = String(ref || '').toUpperCase();
  for (const k of kenmerken || []) {
    if (k && String(k).toUpperCase() !== eigen) return String(k).toUpperCase();
  }
  return '';
}

/**
 * De naam waaronder een bestand uit een vakje wordt opgeslagen.
 *
 * WAAROM DE SERVER HERNOEMT EN NIET DE STUDIO. Dit is het punt van de hele
 * opdracht. Wat er uit Magnific of Photoshop komt heet `upscaled_v3_final(2).png`,
 * en dat is de naam die de klant in zijn portaal zou zien. Nu de map al zegt welk
 * product en welke shot het is, kan de server er een naam van maken die de klant
 * kan lezen — zonder dat er iemand iets hernoemt.
 *
 * De extensie komt van het aangeleverde bestand: die zegt wat het IS en dat mogen
 * wij niet verzinnen. Ontbreekt hij, dan blijft de naam zonder extensie in plaats
 * van dat er een `.jpg` bij wordt gefantaseerd op een bestand dat een webp is.
 */
export function deliveryFilename(ref, product, shot, originalName, lang = 'nl', woord = null) {
  const ext = (String(originalName || '').match(/\.([a-z0-9]{1,8})$/i) || [, ''])[1].toLowerCase();
  const SHOT_WORD = lang === 'en'
    ? { front: 'front', back: 'back', detail: 'detail', worn: 'on-model' }
    : { front: 'voorkant', back: 'achterkant', detail: 'detail', worn: 'op-model' };
  /* `woord` komt uit src/data/levervakken.js en wint: bij lifestyle heet het
     eerste beeld `beeld-1` en geen `voorkant`, en een bijbestelde hoek heet
     naar die hoek in plaats van `extra1` (ronde 9, F17). */
  const parts = [ref, product, woord || SHOT_WORD[shot] || shot].filter(Boolean);
  const base = parts.join('-').replace(/[^A-Za-z0-9._-]+/g, '-');
  return ext ? `${base}.${ext}` : base;
}

/* ─────────────────────────────────────────────────────────────────────────────
   DE TEKSTBESTANDEN
   ───────────────────────────────────────────────────────────────────────────── */

const CRLF = (lines) => `${lines.join('\r\n')}\r\n`;

/**
 * CRLF EN NIET LF. Dit bestand wordt op Windows in Kladblok geopend. Sinds 2018
 * kan Kladblok LF lezen, maar de rest van de gereedschapskist op een
 * Windows-machine niet altijd — en een leesmij die als één lange regel opent is
 * een leesmij die niet gelezen wordt. Zelfde afweging als bij scripts/*.bat,
 * waar .gitattributes `*.bat text eol=crlf` afdwingt.
 */

/** Wat de studio moet doen. Dit is het bestand dat de tijd moet schelen. */
export function readmeText({ order, products, origin }) {
  const url = `${origin || 'https://visuails.com'}/admin/orders/${order.id}/files`;
  return CRLF([
    `VISUAILS - werkmap voor bestelling ${order.ref}`,
    '='.repeat(60),
    '',
    `Merk        ${order.brand || order.name || '-'}`,
    `Dienst      ${order.service || '-'}`,
    `Producten   ${products.length}`,
    `Taal klant  ${order.lang === 'en' ? 'Engels' : 'Nederlands'}`,
    order.window_end ? `Leverdatum  ${String(order.window_end).slice(0, 10)} (gereserveerd venster)` : 'Leverdatum  geen vast venster - normale doorlooptijd',
    '',
    'ZO WERKT DEZE MAP',
    '-'.repeat(60),
    '',
    `Per product: ${SOURCE_FOLDER}/ met de foto's van de klant, _briefing.txt`,
    '(INSTELLINGEN, PLAKREGEL, MAKEN, LET OP, NAKIJKEN) en een lege map per vak.',
    '',
    '1. Zet elk afgewerkt beeld in de map van het juiste product en de',
    '   juiste shot. De bestandsnaam maakt NIET uit - noem hem zoals je',
    '   export hem noemt. De MAP bepaalt waar het beeld terechtkomt.',
    '   Catalog: het Photoshop-script (tools/photoshop) leest de',
    '   INSTELLINGEN-regel, werkt elk vak af en zet het ruwe beeld in _ruw/.',
    '',
    '2. Klaar? Ga naar:',
    `   ${url}`,
    '   Kies daar bij "de hele map in een keer" deze map en upload.',
    '',
    '3. De server leest product en shot uit het pad, hernoemt het bestand',
    `   naar ${order.ref}-p1-voorkant.jpg en zet het in het juiste vakje`,
    '   van het werkbord. Je hoeft niets te hernoemen en niets in te delen.',
    '   Een beeld dat precies gelijk is aan wat er al staat, wordt',
    '   overgeslagen: goedgekeurde beelden blijven staan.',
    '',
    'WAT JE NIET MOET DOEN',
    '-'.repeat(60),
    '',
    `- de mapnamen wijzigen. Het deel voor het streepje (p1, p2, ...) is`,
    '  wat de server leest. De productnaam erachter mag je wel aanpassen.',
    `- beeld in ${SOURCE_FOLDER}/ of ${RAW_FOLDER}/ zetten: die mappen worden bij het`,
    '  uploaden overgeslagen.',
    `- deze map bij een andere bestelling uploaden. De server ziet aan het`,
    `  kenmerk ${order.ref} dat hij hier hoort, en weigert hem elders.`,
    '',
    `Weet je niet waar iets hoort, zet het in ${LOOSE_FOLDER}/. Dat komt binnen`,
    'zonder product en shot, en dan deel je het in de tabel in.',
    '',
    'Uploaden is niet melden. De klant hoort er pas van als je de status op',
    'geleverd zet, of op de knop "melden" drukt bij een herlevering.',
    '',
  ]);
}

/* ─────────────────────────────────────────────────────────────────────────────
   DE BRIEF PER PRODUCT IN VIJF VASTE BLOKKEN — 8 oktober 2026 (punt 4.02, met 5.02)
   ─────────────────────────────────────────────────────────────────────────────
   INSTELLINGEN · PLAKREGEL · MAKEN · LET OP · NAKIJKEN, altijd in deze volgorde,
   zodat elke generatie op dezelfde manier wordt opgebouwd en niemand heen en weer
   zoekt tussen /admin, de map en het promptbestand.

   INSTELLINGEN is één regel `sleutel=waarde · sleutel=waarde`, omdat het
   Photoshop-script (tools/photoshop/01-catalog-afwerken.jsx, 4.07) hem leest en
   ExtendScript geen JSON kent. Waarden bevatten nooit een spatie, een · of een =.
   `kenmerk=` is ook de vingerafdruk waarmee "Map uploaden" een map van een andere
   bestelling herkent (kenmerkUitWerkbestand hierboven).

   PLAKREGEL bevat het kledingstuk (het TYPE uit garments.js), de kleur met code en
   het materiaal zoals de klant ze opgaf — en NOOIT de productnaam: die kan als
   tekst op het kledingstuk belanden. */

/** Het woord voor het kledingstuk in de prompt: kort, Engels, uit het type.
 *  Een type dat hier niet staat valt terug op de Engelse naam uit garments.js. */
const PLAK_WOORD = {
  trousers: 'trousers', shorts: 'shorts', skirt: 'skirt', top: 'top',
  outerwear: 'jacket', dress: 'dress', shoes: 'shoes', socks: 'socks',
  belt: 'belt', bag: 'bag', headwear: 'headwear', jewellery: 'jewellery',
  scarf: 'scarf', underwear: 'underwear', other: 'product',
};

/** Wat er altijd nagekeken wordt, op elk beeld van elk product. */
export const NAKIJKEN = ['kleur', 'print/logo', 'pasvorm', 'details', 'handen', 'randen'];

/** Gaat dit product door Photoshop? Catalog wel; lifestyle niet (V35 = b: die
 *  komt rechtstreeks uit Spaces), tenzij de bestelling het expliciet zegt — een
 *  eigen look die specifieke bewerking vraagt (zie serveScaffold in admin.js). */
export function photoshopNodig(order) {
  if (typeof order?.photoshop === 'boolean') return order.photoshop;
  return String(order?.service || '') !== 'lifestyle';
}

/** Eén waarde zonder tekens die de regel breken. */
const instWaarde = (v) => String(v ?? '').trim().replace(/[\s·|;=]+/g, '');

/**
 * De INSTELLINGEN-regel, als lijst [sleutel, waarde] — de bron voor de regel in
 * _briefing.txt en voor de test die hem tegen het Photoshop-script houdt.
 */
export function instellingen(order, product) {
  const achtergrond = (String(product.background || '').match(/^#?([0-9a-f]{6})$/i) || [])[1];
  const verhouding = /^\d{1,2}:\d{1,2}$/.test(String(product.ratio || '')) ? product.ratio : '';
  const paren = [
    ['kenmerk', order.ref],
    ['product', product.index ? `p${product.index}` : ''],
    ['dienst', order.service],
    ['achtergrond', achtergrond ? `#${achtergrond.toUpperCase()}` : ''],
    ['verhouding', verhouding],
  ];
  /* Een afwijkende verhouding per beeld: `verhouding_2=16:9` is het tweede vak. */
  if (Array.isArray(product.imageRatios)) {
    product.imageRatios.forEach((r, i) => {
      if (/^\d{1,2}:\d{1,2}$/.test(String(r || ''))) paren.push([`verhouding_${i + 1}`, r]);
    });
  }
  paren.push(
    ['lange_zijde', product.hoogRes ? RESOLUTIE.hoog : RESOLUTIE.standaard],
    ['kanaal', order.kanaal],
    ['photoshop', photoshopNodig(order) ? 'ja' : 'nee'],
  );
  return paren.map(([k, v]) => [k, instWaarde(v)]).filter(([, v]) => v);
}

/** De regel zelf: `INSTELLINGEN  kenmerk=… · product=p1 · …`. */
export function instellingenRegel(order, product) {
  return `INSTELLINGEN  ${instellingen(order, product).map(([k, v]) => `${k}=${v}`).join(' · ')}`;
}

/** De plakregel voor de prompt: kledingstuk, kleur (code), materiaal. */
export function plakRegel(product) {
  const type = String(product.garment || '').trim();
  const g = type ? garmentVan(type) : null;
  const woord = g ? (PLAK_WOORD[g.id] || String(g.name.en).toLowerCase()) : 'product';
  const kleur = kleurInfo(product.colour);
  let kleurDeel = '';
  if (kleur) {
    const code = [kleur.hex, kleur.pantone].filter(Boolean).join(', ');
    kleurDeel = kleur.naam ? (code ? `${kleur.naam} (${code})` : kleur.naam) : code;
  }
  return [woord, kleurDeel, String(product.material || '').trim()]
    .filter(Boolean).join(', ').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
}

/** De briefing van de klant, per product, in de map waar je hem nodig hebt. */
export function briefingText({ order, product }) {
  const idx = product.index ?? (String(product.folder || '').match(/^p(\d{1,3})\b/) || [])[1];
  const sleutel = idx ? `p${idx}` : '';
  const kop = [order.ref, sleutel, product.name || '(geen naam opgegeven)'].filter(Boolean).join(' · ');
  const regels = [
    kop,
    '='.repeat(Math.min(60, kop.length)),
    '',
    instellingenRegel(order, { ...product, index: idx }),
    '',
    `PLAKREGEL     ${plakRegel(product)}`,
    '',
  ];

  /* ── MAKEN: wat er gegenereerd wordt ─────────────────────────────────────── */
  const maken = [];
  /* Het gezicht staat er ALLEEN als er een gekozen is; leeg betekent "wij kiezen". */
  if (product.model) maken.push(`  Gezicht     ${product.model}`);
  if (product.uitsnede) maken.push(`  Uitsnede    ${product.uitsnede}`);
  if (product.styling) maken.push(`  Styling     ${product.styling}`);
  if (order.look) maken.push(`  Look        ${order.look}`);
  /* De verhouding is altijd gekozen (het formulier begint op het vierkant); een
     afwijking per beeld staat eronder per nummer (13 augustus 2026). */
  if (product.ratio) maken.push(`  Verhouding  ${product.ratio}`);
  if (Array.isArray(product.imageRatios)) {
    for (const [i, r] of product.imageRatios.entries()) {
      if (r) maken.push(`    beeld ${i + 1}   ${r}`);
    }
  }
  /* Alleen als hij afwijkt van de standaard (RESOLUTIE in pricing.js). */
  if (product.hoogRes) maken.push(`  Resolutie   ${RESOLUTIE.hoog} px (besteld als hoge resolutie)`);
  /* De bijbestelde hoeken gelden voor de HELE bestelling, maar staan bij elk
     product: de studio werkt per productmap (9 september 2026). */
  if (product.extras && product.extras.length) {
    maken.push(`  Extra hoeken (${product.extras.length}, bij elk product gelijk):`);
    for (const [i, hoek] of product.extras.entries()) maken.push(`    ${i + 1}. ${hoek}`);
    maken.push('    Deze komen bovenop de vaste vier, in deze productmap.');
  }
  regels.push('MAKEN', ...(maken.length ? maken : ['  (niets bijzonders opgegeven)']), '');

  /* ── LET OP: wat leidend is en wat een revisie voorkomt ──────────────────── */
  const letOp = [];
  /* De kleur met code (5.03, V32 = a): naam, hex met RGB, Pantone, en de afspraak
     dat deze kleur leidend is als de foto afwijkt. Witbalans eerst op het papier
     (als de klant dat meefotografeerde), het papier wegsnijden vóór @img1. */
  const kleur = kleurInfo(product.colour);
  if (kleur) {
    letOp.push(`  Kleur       ${kleur.naam || kleur.hex || kleur.pantone || kleur.tekst}`);
    const rgb = rgbVan(kleur.hex);
    const codes = [kleur.hex ? `${kleur.hex}${rgb ? ` (RGB ${rgb.join(', ')})` : ''}` : '', kleur.pantone].filter(Boolean);
    if (codes.length) letOp.push(`  Kleurcode   ${codes.join(' / ')}`);
    letOp.push('              Leidend als de foto afwijkt (witbalans eerst op het papier).');
  }
  if (product.material) letOp.push(`  Materiaal   ${product.material}`);
  if (product.background) letOp.push(`  Achtergrond ${product.background}`);
  if (!product.material && !product.colour && !product.background) {
    letOp.push('  De klant heeft bij dit product geen materiaal, kleur of');
    letOp.push('  achtergrond opgegeven.');
  }
  /* Voorrang is een AFSPRAAK met een klok eraan (9 september 2026). */
  if (order.voorrang) {
    letOp.push('  VOORRANG BIJ LEVERING - BETAALD');
    letOp.push(`  Betaald op een werkdag voor ${VOORRANG.bestelVoorUur}:00: geleverd de volgende werkdag`);
    letOp.push(`  voor ${VOORRANG.klaarUur}:00. Later betaald: de werkdag daarna. Niet gehaald, dan gaat`);
    letOp.push('  de toeslag terug naar de klant en loopt de bestelling gewoon door.');
  }
  if (order.notes) {
    letOp.push('  Notitie bij de hele bestelling:');
    for (const r of String(order.notes).split(/\r?\n/)) letOp.push(`    ${r}`);
  }
  regels.push('LET OP', ...letOp, '');

  regels.push(`NAKIJKEN      ${NAKIJKEN.join(' · ')}`, '');
  return CRLF(regels);
}

/**
 * Het licentiebestand dat met de beelden meegaat naar de klant.
 *
 * KORT, EN MET DE VOORWAARDEN ALS BRON. Lucas' keuze, en het is ook de juiste:
 * dit bestand belandt bij het bureau of de marktplaats van de klant, en die wil
 * weten wat hij mag — niet een tweede versie van paragraaf 8 lezen die op een dag
 * gaat afwijken van de eerste. Vandaar dat hier de UITKOMST staat en de vindplaats
 * van de tekst, en niet de tekst zelf.
 *
 * De vijf bevoegdheden staan er wél uitgeschreven, want dat is precies waar de
 * ontvanger van dit bestand naar kijkt, en art. 2 lid 3 Auteurswet leest een
 * licentie beperkt: wat er niet staat, is niet gegeven.
 */
export function licenceText({ order, lang, gedeeld = false }) {
  if (gedeeld) return gedeeldeLicentie({ order, lang });
  const nl = lang !== 'en';
  const merk = order.brand || order.name || (nl ? 'de klant' : 'the client');
  return nl ? CRLF([
    'VISUAILS - gebruiksrechten',
    '='.repeat(60),
    '',
    `Bestelling  ${order.ref}`,
    `Voor        ${merk}`,
    '',
    `Na volledige betaling heeft ${merk} op de beelden in deze map een`,
    'exclusieve, eeuwigdurende, wereldwijde en royaltyvrije licentie. Dat',
    'betekent concreet dat je ze mag:',
    '',
    '  - verveelvoudigen en openbaar maken, in elk medium en elk formaat',
    '  - bewerken en aanpassen (uitsnijden, retoucheren, tekst erover)',
    '  - commercieel gebruiken: webshop, marktplaatsen, advertenties,',
    '    social media, print, verpakking, beurs, etalage',
    '  - sublicentieren aan wie voor je werkt: je bureau, je marktplaats,',
    '    een wederverkoper die jouw product verkoopt',
    '  - meenemen naar een koper als je merk of bedrijf wordt verkocht',
    '',
    'Er zit geen limiet op aantallen, geen beperking naar gebied en geen',
    'looptijd op. Je hoeft VISUAILS niet te vermelden.',
    '',
    'DE BEELDEN ZIJN MET AI GEMAAKT.',
    'Publiceer je ze, zet er dan zichtbaar bij dat ze met AI zijn gemaakt',
    '(EU AI Act, art. 50). Zo is het afgesproken in paragraaf 11 van de',
    'voorwaarden. Op visuails.com/nl/ai-act staat de zin die je kunt gebruiken.',
    '',
    'VISUAILS mag deze beelden in zijn eigen portfolio laten zien, tenzij',
    'je daar per e-mail bezwaar tegen maakt - dat mag altijd en ook later.',
    'Is het product nog niet uitgebracht, dan gebeurt dat niet voordat je',
    'het hebt gelanceerd of schriftelijk ja hebt gezegd.',
    '',
    'De volledige voorwaarden, en wat er geldt als je de rechten',
    'overgedragen wilt hebben in plaats van in licentie:',
    'visuails.com/nl/terms (paragraaf 8)',
    '',
  ]) : CRLF([
    'VISUAILS - usage rights',
    '='.repeat(60),
    '',
    `Order       ${order.ref}`,
    `For         ${merk}`,
    '',
    `On full payment ${merk} holds an exclusive, perpetual, worldwide and`,
    'royalty-free licence to the images in this folder. Concretely, you may:',
    '',
    '  - reproduce and publish them, in any medium and any format',
    '  - edit and adapt them (crop, retouch, add text)',
    '  - use them commercially: shop, marketplaces, ads, social, print,',
    '    packaging, trade fairs, a shop window',
    '  - sublicense them to whoever works for you: your agency, your',
    '    marketplace, a reseller who sells your product',
    '  - take them with you if your brand or business is sold',
    '',
    'There is no volume limit, no territory limit and no term. You do not',
    'have to credit VISUAILS.',
    '',
    'THESE IMAGES WERE MADE WITH AI.',
    'If you publish them, state visibly that they were made with AI',
    '(EU AI Act, art. 50). That is how section 11 of the terms arranges it.',
    'visuails.com/ai-act has the sentence you can use.',
    '',
    'VISUAILS may show these images in its own portfolio unless you object',
    'by email - which you may do at any time, including later. If the',
    'product is not yet released, nothing is published before you have',
    'launched it or said yes in writing.',
    '',
    'Full terms, including what applies if you need the rights transferred',
    'rather than licensed: visuails.com/terms (section 8)',
    '',
  ]);
}

/*
 * ── DE TWEEDE LICENTIE: GEDEELD BEELD — 2 SEPTEMBER 2026 ────────────────────
 *
 * De tekst hierboven is EXCLUSIEF, en dat woord doet daar al het werk:
 * voorwaarden §8 zegt met zoveel woorden dat exclusief ook betekent dat WIJ het
 * beeld aan niemand anders licentiëren. Dat klopt voor een bestelling, want die
 * gaat over het product van één merk.
 *
 * Het klopt NIET voor de maandelijkse merkneutrale set. Die gaat naar elke
 * abonnee; dezelfde twintig beelden bij twintig merken. Onder de tekst hierboven
 * zou elk van die twintig een exclusieve licentie op dezelfde beelden krijgen —
 * twintig beloftes die elkaar uitsluiten, en elk van de twintig zou ons erop
 * kunnen aanspreken. Dat is geen slordigheid in de copy maar een tegenstrijdig-
 * heid in de levering zelf, en hij zat er tot vandaag in.
 *
 * ── WAT ER WEL EN NIET VERANDERT ───────────────────────────────────────────
 *
 * Weg gaat één woord: exclusief. Alles wat de klant er zélf mee mag, blijft
 * staan — verveelvoudigen, bewerken, commercieel gebruiken, sublicentiëren aan
 * wie voor hem werkt, meenemen bij verkoop van het merk. Er komt één zin bij die
 * zegt wat gedeeld betekent, in dezelfde bewoording als de gedeelde modellen op
 * /custom-models al gebruiken: hetzelfde beeld kan bij een ander merk opduiken.
 *
 * En één zin over opzeggen, want dat is de vraag die bij een maandelijkse set
 * onvermijdelijk komt. Het antwoord is hetzelfde als in voorwaarden §13: wat je
 * tijdens je abonnement gedownload hebt, blijft van jou. Zonder die zin zou een
 * klant redelijkerwijs kunnen denken dat een gedeelde licentie ophoudt als de
 * termijn ophoudt — en dan gaat hij beelden offline halen die hij mocht houden.
 *
 * ── ER IS GEEN BESTELNUMMER ────────────────────────────────────────────────
 *
 * Een maandelijkse set hoort bij een abonnement en niet bij een bestelling, dus
 * staat er de MAAND waar bij een bestelling het kenmerk staat. `order.ref` mag
 * daarvoor gebruikt worden zolang er nog geen eigen levering bestaat; zodra die
 * er is, hoort hier `${jaar}-${maand}` te staan en niets anders.
 */
function gedeeldeLicentie({ order, lang }) {
  const nl = lang !== 'en';
  const merk = order.brand || order.name || (nl ? 'de klant' : 'the client');
  const periode = order.ref || (nl ? 'deze maand' : 'this month');
  return nl ? CRLF([
    'VISUAILS - gebruiksrechten, maandset',
    '='.repeat(60),
    '',
    `Set         ${periode}`,
    `Voor        ${merk}`,
    '',
    'DIT IS DE GEDEELDE MAANDSET. Hij is merkneutraal: er staat geen',
    'product van jou in, en dezelfde beelden gaan naar andere merken die',
    'ook een abonnement hebben. Precies zoals bij de gedeelde modellen',
    'kan een beeld dat jij vandaag plaatst, morgen bij een ander merk',
    'staan. Wil je beeld dat alleen van jou is, dan is dat Editions of',
    'een gewone bestelling - zie visuails.com/nl/editions.',
    '',
    `${merk} heeft op deze beelden een niet-exclusieve, eeuwigdurende,`,
    'wereldwijde en royaltyvrije licentie. Dat betekent concreet dat je',
    'ze mag:',
    '',
    '  - verveelvoudigen en openbaar maken, in elk medium en elk formaat',
    '  - bewerken en aanpassen (uitsnijden, retoucheren, tekst erover)',
    '  - commercieel gebruiken: webshop, marktplaatsen, advertenties,',
    '    social media, print, verpakking, beurs, etalage',
    '  - sublicentieren aan wie voor je werkt: je bureau, je marktplaats,',
    '    een wederverkoper die jouw product verkoopt',
    '  - meenemen naar een koper als je merk of bedrijf wordt verkocht',
    '',
    'Er zit geen limiet op aantallen, geen beperking naar gebied en geen',
    'looptijd op. Je hoeft VISUAILS niet te vermelden.',
    '',
    'ZEG JE HET ABONNEMENT OP, DAN BLIJFT DEZE LICENTIE STAAN op alles',
    'wat je tot dat moment hebt opgehaald. Wat je hebt, hou je - je hoeft',
    'niets offline te halen. Nieuwe sets komen er dan geen meer.',
    '',
    'DE BEELDEN ZIJN MET AI GEMAAKT.',
    'Publiceer je ze, zet er dan zichtbaar bij dat ze met AI zijn gemaakt',
    '(EU AI Act, art. 50). Zo is het afgesproken in paragraaf 11 van de',
    'voorwaarden. Op visuails.com/nl/ai-act staat de zin die je kunt gebruiken.',
    '',
    'De volledige voorwaarden: visuails.com/nl/terms (paragraaf 8)',
    '',
  ]) : CRLF([
    'VISUAILS - usage rights, monthly set',
    '='.repeat(60),
    '',
    `Set         ${periode}`,
    `For         ${merk}`,
    '',
    'THIS IS THE SHARED MONTHLY SET. It is brand-neutral: none of your',
    'products are in it, and the same images go to other brands on a',
    'plan. Exactly as with the shared model roster, an image you post',
    'today can appear on another brand tomorrow. If you want imagery',
    'that is yours alone, that is Editions or a regular order - see',
    'visuails.com/editions.',
    '',
    `${merk} holds a non-exclusive, perpetual, worldwide and royalty-free`,
    'licence to these images. Concretely, you may:',
    '',
    '  - reproduce and publish them, in any medium and any format',
    '  - edit and adapt them (crop, retouch, add text)',
    '  - use them commercially: shop, marketplaces, ads, social, print,',
    '    packaging, trade fairs, a shop window',
    '  - sublicense them to whoever works for you: your agency, your',
    '    marketplace, a reseller who sells your product',
    '  - take them with you if your brand or business is sold',
    '',
    'There is no volume limit, no territory limit and no term. You do not',
    'have to credit VISUAILS.',
    '',
    'IF YOU CANCEL, THIS LICENCE STAYS on everything you downloaded up to',
    'that point. What you have, you keep - nothing has to come down. You',
    'simply stop receiving new sets.',
    '',
    'THESE IMAGES WERE MADE WITH AI.',
    'If you publish them, state visibly that they were made with AI',
    '(EU AI Act, art. 50). That is how section 11 of the terms arranges it.',
    'visuails.com/ai-act has the sentence you can use.',
    '',
    'Full terms: visuails.com/terms (section 8)',
    '',
  ]);
}

/* ─────────────────────────────────────────────────────────────────────────────
   HET ARCHIEF
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * De naam van de werkmap: `VIS-2608-4471 - Atelier Noord` (4.02, 8 oktober 2026).
 *
 * Het merk erbij, zodat je in Verkenner en in het uploadvenster ziet WELKE klant
 * dit is voordat je een map terugzet. Het merk komt van de klant en wordt
 * hier veilig gemaakt voor een Windows-bestandsnaam (geen \ / : * ? " < > |,
 * geen punt aan het eind, hoogstens 40 tekens). Zonder merk: alleen het kenmerk.
 * Dezelfde naam is de wortelmap in de zip, zodat het kenmerk in elk pad staat.
 */
export function werkmapNaam(ref, merk) {
  const kenmerk = String(ref || 'bestelling').replace(/[^A-Za-z0-9._-]+/g, '-');
  /* 40 en niet 48 tekens: zip.js kapt een mapnaam af op 60, en dan zouden de
     zipnaam en de map erin verschillen. */
  const m = String(merk || '')
    .replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, ' ')   // wat Windows in een naam verbiedt
    .replace(/\s+/g, ' ').trim()
    .slice(0, 40)
    .replace(/[\s.]+$/, '');                              // een punt aan het eind valt weg
  return m ? `${kenmerk} - ${m}` : kenmerk;
}

/** De bestandsnaam van de zip: `VIS-2608-4471 - Atelier Noord.zip`. */
export function scaffoldFilename(ref, merk) {
  return `${werkmapNaam(ref, merk)}.zip`;
}

/*
 * ── DE FOTO'S VAN DE KLANT IN DE WERKMAP — 8 oktober 2026 (punt 4.02, V34 = b) ──
 *
 * Lucas haalde ze per foto uit /admin. Nu staan ze per product in `_aangeleverd/`
 * als `p1-klant-voorkant.jpg`, rechtstreeks uit R2.
 *
 * DE GRENS, EN WAAROM DEZE. zipStream() haalt één foto tegelijk op en laat hem weer
 * los, dus het geheugen van de Worker houdt nooit meer dan één foto vast (hoogstens
 * MAX_FILE_BYTES = 25 MB). Wat wel oploopt is de rekentijd: elk bestand krijgt een
 * CRC-controlegetal, ±270 MB per seconde in JavaScript (gemeten), dus 1 GB is ±4 s
 * CPU — ruim binnen de 30 s van een betaalde Worker. En elke foto is één verzoek aan
 * R2; 400 blijft ver onder de grens per verzoek. Boven een van beide grenzen gaan de
 * eerste foto's (in productvolgorde) mee en staat de rest in
 * `_aangeleverd/NIET-IN-DEZE-ZIP.txt`, met waar je ze dan vindt.
 */
export const KLANTFOTO_GRENS = { aantal: 400, bytes: 1024 * 1024 * 1024 };

/** Het woord voor een aangeleverde foto: `voorkant`, `referentie-2`, `erbij-shoes`. */
function klantFotoWoord(shot) {
  const s = String(shot || '');
  const vast = shotInfo(s);
  if (vast) return vast.name.nl.toLowerCase();
  const extra = s.match(/^extra(\d{1,2})$/);
  if (extra) return `extra-${extra[1]}`;
  const ref = s.match(/^ref(\d{1,2})$/);
  if (ref) return `referentie-${ref[1]}`;
  const ctx = contextShotSlot(s);
  if (ctx) return `erbij-${ctx.replace(/[^a-z0-9-]+/gi, '')}`;
  return 'los';
}

/**
 * De ingangen voor `_aangeleverd/` per product, plus een lijstje van wat er boven
 * de grens niet in past. `fotos` zijn rijen uit `files` (kind = 'upload', niet
 * vervangen); `haal(key)` levert de bytes uit R2 of null.
 *
 * @returns {{ ingangen: Array, weg: Array }}
 */
export function klantFotoBestanden(root, products, fotos, haal, grens = KLANTFOTO_GRENS) {
  const mapVan = new Map(products.map((p) => [`p${p.index}`, productFolder(p.index, p.name)]));
  const sorteer = (f) => {
    const n = Number(String(f.product_key || '').replace(/^p/, ''));
    return Number.isFinite(n) && n > 0 ? n : 9999;
  };
  const rijen = [...(fotos || [])].sort((a, b) => sorteer(a) - sorteer(b) || (a.id || 0) - (b.id || 0));
  const ingangen = [];
  const weg = [];
  const geteld = new Map();
  let bytes = 0;
  for (const f of rijen) {
    const map = mapVan.get(String(f.product_key || ''));
    const ext = (String(f.filename || f.r2_key || '').match(/\.([a-z0-9]{1,5})$/i) || [, 'jpg'])[1].toLowerCase();
    let naam;
    if (map) {
      const basis = `${f.product_key}-klant-${klantFotoWoord(f.shot)}`;
      const n = (geteld.get(basis) || 0) + 1;
      geteld.set(basis, n);
      naam = `${root}/${map}/${SOURCE_FOLDER}/${basis}${n > 1 ? `-${n}` : ''}.${ext}`;
    } else {
      /* Zonder product (een losse foto, of een product boven het aantal van de
         bestelling): in de `_aangeleverd/` van de hele bestelling, met zijn eigen naam. */
      naam = `${root}/${SOURCE_FOLDER}/${safeSegment(f.filename, `foto-${f.id}`)}`;
    }
    const grootte = Number(f.bytes) || 0;
    if (ingangen.length >= grens.aantal || bytes + grootte > grens.bytes) {
      weg.push({ naam: naam.slice(root.length + 1), bytes: grootte });
      continue;
    }
    bytes += grootte;
    ingangen.push({ name: naam, get: () => haal(f.r2_key) });
  }
  return { ingangen, weg };
}

/**
 * De lijst voor zipStream(), inclusief de mappen.
 *
 * @param {object} order    de rij uit `orders`
 * @param {Array}  products [{ index, name, material, colour, background, ratio, imageRatios, extras }]
 * @param {object} opts     { origin, shots, vakken, klantFotos, haalFoto }
 *                          klantFotos + haalFoto vullen `_aangeleverd/` (4.02)
 */
export function scaffoldFiles(order, products, opts = {}) {
  const enc = new TextEncoder();
  const txt = (s) => ({ get: async () => enc.encode(s).buffer });
  const root = werkmapNaam(order.ref, order.brand || order.name);
  const shots = Array.isArray(opts.shots) && opts.shots.length ? opts.shots : SHOT_IDS;
  const files = [];
  const fotos = Array.isArray(opts.klantFotos) && typeof opts.haalFoto === 'function'
    ? klantFotoBestanden(root, products, opts.klantFotos, opts.haalFoto, opts.fotoGrens || KLANTFOTO_GRENS)
    : null;

  files.push({ name: `${root}/LEESMIJ.txt`, ...txt(readmeText({ order, products, origin: opts.origin })) });
  files.push({ name: `${root}/LICENTIE.txt`, ...txt(licenceText({ order, lang: order.lang })) });

  for (const p of products) {
    const folder = productFolder(p.index, p.name);
    files.push({
      name: `${root}/${folder}/_briefing.txt`,
      ...txt(briefingText({ order, product: { ...p, folder } })),
    });
    /* `_aangeleverd/` staat bovenaan in de productmap (Verkenner sorteert de
       underscore vóór de cijfers), met de foto's van de klant erin. Zonder foto's
       blijft de map er, leeg: dan weet je dat er niets is en zoek je niet verder. */
    files.push({ name: `${root}/${folder}/${SOURCE_FOLDER}/`, dir: true });
    if (fotos) {
      const prefix = `${root}/${folder}/${SOURCE_FOLDER}/`;
      for (const f of fotos.ingangen) if (f.name.startsWith(prefix)) files.push(f);
    }
    if (Array.isArray(opts.vakken) && opts.vakken.length) {
      /* Per dienst (ronde 9, F17): lifestyle krijgt `1 beeld-1` … `3 beeld-3`,
         een bijbestelde hoek `5 driekwart [extra1]`. parseScaffoldPath() leest
         beide terug. */
      opts.vakken.forEach((v, i) => {
        /* Een catalogvak heet zoals altijd (`1 voorkant`); elk ander vak krijgt
           zijn nummer, zijn woord en zijn sleutel (`3 product [product]`), zodat
           "Map uploaden" hem terugleest ook als het woord op een catalogvak lijkt
           (`4 detail [detail]` bij lifestyle is het vierde beeld, niet het derde). */
        const catalogNaam = SLOT_FOLDER[v.id] && SLOT_FOLDER[v.id] === `${i + 1} ${v.woord.nl}`;
        const naam = catalogNaam ? SLOT_FOLDER[v.id] : `${i + 1} ${v.woord.nl} [${v.id}]`;
        files.push({ name: `${root}/${folder}/${naam}/`, dir: true });
      });
    } else {
      for (const shot of shots) {
        files.push({ name: `${root}/${folder}/${SLOT_FOLDER[shot] || shot}/`, dir: true });
      }
    }
  }

  // Eén losse map voor de hele bestelling en niet één per product: extra foto’s
  // en varianten zijn er per bestelling een handvol, en dertig lege _los-mappen
  // is dertig mappen waar niemand in kijkt.
  files.push({ name: `${root}/${LOOSE_FOLDER}/`, dir: true });

  if (fotos) {
    const los = `${root}/${SOURCE_FOLDER}/`;
    for (const f of fotos.ingangen) if (f.name.startsWith(los)) files.push(f);
    if (fotos.weg.length) {
      files.push({
        name: `${los}NIET-IN-DEZE-ZIP.txt`,
        ...txt(CRLF([
          `${fotos.weg.length} foto's van de klant passen niet in deze zip`,
          `(grens: ${KLANTFOTO_GRENS.aantal} foto's of ${Math.round(KLANTFOTO_GRENS.bytes / 1048576)} MB per werkmap).`,
          '',
          'Haal ze per foto op in /admin, op de bestelpagina onder',
          '"Aangeleverd door de klant":',
          '',
          ...fotos.weg.map((w) => `- ${w.naam}`),
          '',
        ])),
      });
    }
  }
  return files;
}
