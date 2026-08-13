// VISUAILS — de mappenroute: een lege bestelling als zip, en dezelfde zip terug.
//
// ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
//
// Lucas, 12 augustus 2026: *"wanneer iemand een bestelling heeft geplaatst onder
// een specifieke service dat ik het verzenden sneller wil maken door een soort
// mappenroute te kunnen downloaden vanuit /admin zodat ik alleen de foto's in de
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
import { SHOT_IDS } from '../data/shots.js';

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

/** De map voor beeld dat niet in een vakje hoort: extra foto's, losse varianten. */
export const LOOSE_FOLDER = '_los';

/** De map met wat de klant heeft aangeleverd. Wordt niet gevuld door de scaffold. */
export const SOURCE_FOLDER = '_aangeleverd';

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
export function deliveryFilename(ref, product, shot, originalName, lang = 'nl') {
  const ext = (String(originalName || '').match(/\.([a-z0-9]{1,8})$/i) || [, ''])[1].toLowerCase();
  const SHOT_WORD = lang === 'en'
    ? { front: 'front', back: 'back', detail: 'detail', worn: 'on-model' }
    : { front: 'voorkant', back: 'achterkant', detail: 'detail', worn: 'op-model' };
  const parts = [ref, product, SHOT_WORD[shot] || shot].filter(Boolean);
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
    '1. Zet elk afgewerkt beeld in de map van het juiste product en de',
    '   juiste shot. De bestandsnaam maakt NIET uit - noem hem zoals je',
    '   export hem noemt. De MAP bepaalt waar het beeld terechtkomt.',
    '',
    '2. Klaar? Ga naar:',
    `   ${url}`,
    '   Kies daar bij "de hele map in een keer" deze map en upload.',
    '',
    '3. De server leest product en shot uit het pad, hernoemt het bestand',
    `   naar ${order.ref}-p1-voorkant.jpg en zet het in het juiste vakje`,
    '   van het werkbord. Je hoeft niets te hernoemen en niets in te delen.',
    '',
    'WAT JE NIET MOET DOEN',
    '-'.repeat(60),
    '',
    `- de mapnamen wijzigen. Het deel voor het streepje (p1, p2, ...) is`,
    '  wat de server leest. De productnaam erachter mag je wel aanpassen.',
    `- beeld in ${SOURCE_FOLDER}/ zetten: die map is van de klant en wordt bij`,
    '  het uploaden overgeslagen.',
    '',
    `Weet je niet waar iets hoort, zet het in ${LOOSE_FOLDER}/. Dat komt binnen`,
    'zonder product en shot, en dan deel je het in de tabel in.',
    '',
    'Uploaden is niet melden. De klant hoort er pas van als je de status op',
    'geleverd zet, of op de knop "melden" drukt bij een herlevering.',
    '',
  ]);
}

/** De briefing van de klant, per product, in de map waar je hem nodig hebt. */
export function briefingText({ order, product }) {
  const regels = [
    `${product.folder}`,
    '='.repeat(Math.min(60, product.folder.length)),
    '',
    `Bestelling  ${order.ref}`,
    `Product     ${product.name || '(de klant heeft geen naam opgegeven)'}`,
    '',
  ];
  if (product.material) regels.push(`Materiaal   ${product.material}`);
  if (product.colour) regels.push(`Kleur       ${product.colour}`);
  if (product.background) regels.push(`Achtergrond ${product.background}`);
  /* ── DE BEELDVERHOUDING — 13 AUGUSTUS 2026 ────────────────────────────────
   *
   * BOVEN DE REGEL "de klant heeft niets opgegeven" en niet eronder, want een
   * verhouding is altijd gekozen: het formulier begint op het vierkant en er is
   * geen stroom die de vraag overslaat. Hij hoort dus in het rijtje feiten en
   * niet in het rijtje ontbrekende antwoorden.
   *
   * PER BEELD ALS DE KLANT DAT ZO HEEFT GEZET. Bij lifestyle mag beeld 2 een
   * banner zijn tussen twee vierkante; dan staat de afwijking hier per nummer,
   * en de rest volgt de bestelling. Zonder deze regels zou de studio drie keer
   * dezelfde vorm maken en zou de banner pas bij de revisie boven water komen. */
  if (product.ratio) regels.push(`Verhouding  ${product.ratio}`);
  if (Array.isArray(product.imageRatios)) {
    for (const [i, r] of product.imageRatios.entries()) {
      if (r) regels.push(`  beeld ${i + 1}    ${r}`);
    }
  }
  if (!product.material && !product.colour && !product.background) {
    regels.push('De klant heeft bij dit product geen materiaal, kleur of');
    regels.push('achtergrond opgegeven.');
  }
  regels.push('');
  if (product.extras && product.extras.length) {
    regels.push(`EXTRA FOTO'S (${product.extras.length})`);
    regels.push('-'.repeat(60));
    for (const [i, note] of product.extras.entries()) {
      regels.push(`${i + 1}. ${note || '(geen notitie)'}`);
    }
    regels.push('');
    regels.push(`Zet die in ${LOOSE_FOLDER}/ - ze horen niet in een vast vakje.`);
    regels.push('');
  }
  if (order.notes) {
    regels.push('NOTITIE BIJ DE HELE BESTELLING');
    regels.push('-'.repeat(60));
    regels.push(order.notes);
    regels.push('');
  }
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
export function licenceText({ order, lang }) {
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
    'Wie ze publiceert, hoort dat erbij te zeggen (EU AI Act, art. 50).',
    'Die plicht ligt bij de publiceerder - in de praktijk bij jou. Op',
    'visuails.com/nl/ai-act staat de zin die je kunt gebruiken.',
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
    'Whoever publishes them should say so (EU AI Act, art. 50). That duty',
    'sits on the publisher - in practice, on you. visuails.com/ai-act has',
    'the sentence you can use.',
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

/* ─────────────────────────────────────────────────────────────────────────────
   HET ARCHIEF
   ───────────────────────────────────────────────────────────────────────────── */

/** De bestandsnaam van de zip. Kort, met de referentie erin, zonder spaties. */
export function scaffoldFilename(ref) {
  return `${String(ref || 'bestelling').replace(/[^A-Za-z0-9._-]+/g, '-')}-werkmap.zip`;
}

/**
 * De lijst voor zipStream(), inclusief de mappen.
 *
 * @param {object} order    de rij uit `orders`
 * @param {Array}  products [{ index, name, material, colour, background, ratio, imageRatios, extras }]
 * @param {object} opts     { origin, shots }  shots = welke vakjes deze dienst heeft
 */
export function scaffoldFiles(order, products, opts = {}) {
  const enc = new TextEncoder();
  const txt = (s) => ({ get: async () => enc.encode(s).buffer });
  const root = String(order.ref || 'bestelling');
  const shots = Array.isArray(opts.shots) && opts.shots.length ? opts.shots : SHOT_IDS;
  const files = [];

  files.push({ name: `${root}/LEESMIJ.txt`, ...txt(readmeText({ order, products, origin: opts.origin })) });
  files.push({ name: `${root}/LICENTIE.txt`, ...txt(licenceText({ order, lang: order.lang })) });

  for (const p of products) {
    const folder = productFolder(p.index, p.name);
    files.push({
      name: `${root}/${folder}/_briefing.txt`,
      ...txt(briefingText({ order, product: { ...p, folder } })),
    });
    for (const shot of shots) {
      files.push({ name: `${root}/${folder}/${SLOT_FOLDER[shot] || shot}/`, dir: true });
    }
  }

  // Eén losse map voor de hele bestelling en niet één per product: extra foto's
  // en varianten zijn er per bestelling een handvol, en dertig lege _los-mappen
  // is dertig mappen waar niemand in kijkt.
  files.push({ name: `${root}/${LOOSE_FOLDER}/`, dir: true });
  return files;
}
