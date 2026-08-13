/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE MAP IS HET EINDRESULTAAT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 9 augustus 2026: *"Ik wil dat klanten de foto's apart kunnen zien en een
 * revisie per foto kunnen aanvragen maar het echte wat ze krijgen is een map met
 * alle bestanden erin, de zichtbare foto's zijn dus niet downloadbaar in het
 * portaal en puur voor revisies aanvragen. Alleen de map (het eindresultaat) kan
 * gedownload worden."*
 *
 * Dat is één zin met twee ingrepen erin, en de tweede is de moeilijke.
 *
 *   1 · DE LOSSE DOWNLOADKNOP GAAT WEG. Simpel, twee plekken.
 *   2 · WAT ER OP HET SCHERM STAAT, MOET OOK ECHT NIET DE LEVERING ZIJN. En dat
 *       was het wel: files.preview_key is sinds migratie 0001 door geen enkele
 *       regel code ooit geschreven, dus viel elke `preview_key || r2_key` terug
 *       op het volledige bestand. De knop weghalen zonder dat op te lossen is
 *       een gordijn voor een deur die openstaat.
 *
 * ── WAAROM DIT BESTAND BESTAAT ──────────────────────────────────────────────
 *
 * Het portaal (/o/<token>) en VISUAILS Studio (/account) tekenen dezelfde
 * levering. Tot vandaag deden ze dat met twee eigen query's, en die waren al uit
 * elkaar gelopen: account.js filterde op `superseded_at IS NULL`, portal.js niet
 * — dus toonde het portaal na een revisie nog de foto waar de revisie op was
 * aangevraagd. Dat is niet cosmetisch: het is de klant het beeld laten zien dat
 * hij afgekeurd heeft, op het scherm waar hij komt kijken of het gemaakt is.
 *
 * Zelfde soort bug als close.js beschrijft (afronden zat in account.js en het
 * portaal riep het nooit aan) en als de convbar-close (twee implementaties, één
 * werkte). Vandaar: één query, één naamgeving, twee aanroepers.
 *
 * ── DE MAPPENSTRUCTUUR, EN WAAROM DEZE ─────────────────────────────────────
 *
 * Lucas koos: eerst per product, dan per formaat. Sinds 13 augustus 2026 met een
 * wortelmap, genummerde mappen en de productnaam erbij — zie het blok onderaan deze
 * kop voor waarom elk van die drie er staat.
 *
 *   VISUAILS-VIS-2608-4471/LEESMIJ.txt
 *   VISUAILS-VIS-2608-4471/LICENTIE.txt
 *   VISUAILS-VIS-2608-4471/01 - Zwarte hoodie/JPG/1-voorkant.jpg
 *   VISUAILS-VIS-2608-4471/01 - Zwarte hoodie/PNG/1-voorkant.png
 *   VISUAILS-VIS-2608-4471/01 - Zwarte hoodie/WEBP/1-voorkant.webp
 *   VISUAILS-VIS-2608-4471/02 - Linnen broek/JPG/2-achterkant.jpg
 *
 * De andere kant op (PNG/product-1-voorkant.png) is handiger voor wie álle jpg's
 * in één keer naar een webshop sleept. Deze kant is handiger voor wie per artikel
 * werkt, en dat is wat een merk met dertig producten doet: het artikel is de
 * eenheid waarin hij denkt, niet het bestandsformaat.
 *
 * De formaatmap staat in HOOFDLETTERS en de bestandsnaam in kleine letters. Niet
 * uit esthetiek: zo is in één oogopslag te zien wat een map is en wat een bestand,
 * ook in een uitpakvenster dat geen iconen toont.
 *
 * ── OUDE LEVERINGEN, EN WAAROM ZE NIET WORDEN OMGEBOUWD ────────────────────
 *
 * Elke levering van vóór vandaag heeft geen rij in file_assets. Die krijgt de
 * PLATTE naam die het archief altijd al gaf: `filename` of `<id>.jpg`. Geen
 * verzonnen productmap ("overig/PNG/...") voor een bestand waarvan we het formaat
 * niet weten en dat nooit is omgezet — dat zou een map beloven met drie formaten
 * erin die er twee niet heeft.
 *
 * Concreet betekent dat: VIS-2608-4471 blijft precies dezelfde zip geven als
 * gisteren, en de eerste bestelling die via scripts/deliver.mjs gaat, geeft de
 * nieuwe. Geen migratiemoment, geen bestelling die er tussenin valt.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAT ER OP 13 AUGUSTUS 2026 AAN IS VERANDERD, EN WAAROM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"De read me in de map [...] is in het nederlands en bedoeld voor mij
 * terwijl dit een readme voor de customer [moet zijn]. Ook moeten de foto's
 * gesorteerd kunnen worden want de klant ontvangt jpg, png en webp bestanden. In
 * de read me moet bijvoorbeeld uitgelegd worden waarvoor elk bestand is en de
 * klant oprecht helpen [...] zodat de klant echt een premium service ontvangt."*
 *
 * ── EERST DE VERWARRING WEGNEMEN, WANT DIE ZAT ER ECHT ──────────────────────
 *
 * Er zijn TWEE mappen en ze leken op elkaar. De WERKMAP komt uit /admin, gaat
 * over jouw schijf en heeft een LEESMIJ.txt in het Nederlands die uitlegt in welk
 * vakje een beeld hoort — die is voor de studio en die hoort Nederlands te zijn.
 * De LEVERING is deze zip. isScaffoldDoc() in scaffold.js houdt de werkmapdocumenten
 * bij het uploaden tegen, dus die LEESMIJ is nooit bij een klant terechtgekomen.
 *
 * Maar de conclusie was wél juist, alleen één stap verder: de klant kreeg NIETS.
 * Een map met honderdtwintig bestanden in drie formaten, zonder één regel uitleg,
 * en dan is "waar is de jpg die ik op bol.com moet zetten" een mail aan jou.
 *
 * ── DRIE DINGEN DIE DE MAP ONBRUIKBAAR MAAKTEN BIJ TIEN PRODUCTEN ───────────
 *
 *   1 · `product-10` SORTEERT VÓÓR `product-2`. Elke bestandsverkenner sorteert
 *       alfabetisch, dus las de map: product-1, product-10, product-11, product-2.
 *       Bij negen producten valt dat niet op en bij tien is de map door de war.
 *       Nu tweecijferig: 01, 02, ... 10 — en driecijferig boven de negenennegentig.
 *
 *   2 · DE VOORKANT STOND ONDERAAN. `achterkant, detail, op-model, voorkant` is
 *       alfabetisch precies de verkeerde volgorde: de eerste foto van een product
 *       is de laatste in de map. Nu genummerd (`1-voorkant.jpg`), dezelfde
 *       nummering als de vakjes in de werkmap.
 *
 *   3 · GEEN PRODUCTNAAM. `product-3` is ons nummer. `03 - Zwarte hoodie` is zijn
 *       artikel. De naam die de klant zelf bij het bestellen heeft ingetypt staat
 *       in details_json en werd hier niet gebruikt.
 *
 * En er zit nu één map om alles heen (`VISUAILS-<ref>/`), zodat uitpakken niet
 * dertig mappen in iemands Downloads gooit.
 *
 * ── EN TWEE TEKSTBESTANDEN ─────────────────────────────────────────────────
 *
 * LEESMIJ.txt (of README.txt) in de taal van de klant: wat er in de map zit, wat
 * elk formaat is en wanneer je welk pakt, hoe je alle jpg's in één keer selecteert,
 * tot wanneer de map te downloaden is, en waar de revisieknop zit.
 *
 * LICENTIE.txt komt uit scaffold.js, waar hij al stond. De noot bij isScaffoldDoc()
 * schreef letterlijk: *"Het is het enige van de drie dat de klant wél zou willen
 * hebben -- maar dan hoort het als levering te worden bedacht [...] Wil je het
 * meeleveren, dan is dat een eigen beslissing."* Dit is die beslissing.
 */

/* De bewaartermijn en de licentietekst komen uit de bestanden die er al over gaan.
   DELIVERY_MONTHS staat in retention.js en wordt door de opruimtaak gebruikt, dus de
   leesmij noemt hetzelfde getal dat de database aanhoudt in plaats van een tweede
   belofte. licenceText() stond in scaffold.js en is bilinguaal; hij verhuist niet,
   want de werkmap gebruikt hem ook. */
import { DELIVERY_MONTHS } from './retention.js';
import { licenceText } from './scaffold.js';

/** De mapnaam per formaat. Hoofdletters, zodat een map als map leest. */
const FORMAT_DIR = { png: 'PNG', jpg: 'JPG', webp: 'WEBP' };

/**
 * De shots in de orde waarin een mens ze wil zien, niet alfabetisch.
 *
 * `front|back|detail|worn` is de lijst uit admin.js (SHOTS). Alfabetisch zou
 * achterkant vóór voorkant zetten, en dat is de verkeerde eerste foto van een
 * product.
 */
const SHOT_ORDER = ['front', 'back', 'detail', 'worn'];

/** Hoe een shot in de bestandsnaam terechtkomt, per taal. */
const SHOT_NAME = {
  nl: { front: 'voorkant', back: 'achterkant', detail: 'detail', worn: 'op-model' },
  en: { front: 'front', back: 'back', detail: 'detail', worn: 'on-model' },
};

/**
 * De levende leveringsbeelden van één bestelling, met hun assets erbij.
 *
 * ÉÉN QUERY MET EEN LEFT JOIN en niet twee rondjes: een bestelling met dertig
 * producten heeft honderdtwintig beelden en dus driehonderdzestig assets, en dat
 * per beeld opvragen is driehonderdzestig keer wachten op D1.
 *
 * DE REVIEW-KOLOMMEN ZITTEN ERIN omdat het portaal met dezelfde rijen zowel de
 * tegels als het archief tekent. Ze twee keer ophalen — één query voor het scherm,
 * één voor de zip — is twee query's over dezelfde levering, en dat is precies de
 * constructie die hier al één keer uit elkaar is gelopen.
 *
 * `expires_at` doet mee zoals het altijd al deed. `superseded_at` ook — en dat is
 * de kolom waar portal.js op achterliep.
 *
 * DE TERUGVAL OP EEN QUERY ZONDER superseded_at staat hier met opzet nog een keer
 * (account.js deed het al zo): een database waar migratie 0012 niet op gedraaid
 * is, hoort een archief te geven met te veel beelden erin — niet een 500.
 */
export async function loadDeliveryFiles(env, orderId) {
  const withSuperseded = `
    SELECT f.id, f.r2_key, f.preview_key, f.filename, f.bytes, f.expires_at,
           f.product_key, f.shot,
           f.review_state, f.review_note, f.reviewed_at,
           a.format AS a_format, a.r2_key AS a_key, a.bytes AS a_bytes
      FROM files f
      LEFT JOIN file_assets a ON a.file_id = f.id
     WHERE f.order_id = ?1
       AND f.kind = 'delivery'
       AND (f.expires_at IS NULL OR f.expires_at > datetime('now'))
       AND f.superseded_at IS NULL
     ORDER BY f.id, a.format`;
  const withoutSuperseded = withSuperseded.replace('AND f.superseded_at IS NULL', '');

  let rows;
  try {
    rows = (await env.DB.prepare(withSuperseded).bind(orderId).all())?.results || [];
  } catch (err) {
    /*
     * Twee dingen kunnen hier ontbreken en ze vragen een verschillende terugval,
     * dus wordt er op de melding gekeken en niet blind opnieuw geprobeerd:
     * ontbreekt file_assets (migratie 0022 niet gedraaid), dan moet de JOIN eruit;
     * ontbreekt superseded_at (0012), dan die voorwaarde.
     */
    const message = String(err?.message || err);
    if (/no such table/i.test(message)) {
      const noAssets = `
        SELECT f.id, f.r2_key, f.preview_key, f.filename, f.bytes, f.expires_at,
               f.product_key, f.shot,
               f.review_state, f.review_note, f.reviewed_at,
               NULL AS a_format, NULL AS a_key, NULL AS a_bytes
          FROM files f
         WHERE f.order_id = ?1
           AND f.kind = 'delivery'
           AND (f.expires_at IS NULL OR f.expires_at > datetime('now'))
           AND f.superseded_at IS NULL
         ORDER BY f.id`;
      rows = (await env.DB.prepare(noAssets).bind(orderId).all())?.results || [];
    } else if (/no such column/i.test(message)) {
      rows = (await env.DB.prepare(withoutSuperseded).bind(orderId).all())?.results || [];
    } else {
      throw err;
    }
  }

  // De LEFT JOIN geeft één rij per asset, dus per beeld meerdere. Terugvouwen naar
  // één beeld met een lijst assets — in de volgorde waarin de query ze gaf.
  const byId = new Map();
  for (const r of rows) {
    let file = byId.get(r.id);
    if (!file) {
      file = {
        id: r.id,
        r2_key: r.r2_key,
        preview_key: r.preview_key,
        filename: r.filename,
        bytes: r.bytes,
        expires_at: r.expires_at,
        product_key: r.product_key,
        shot: r.shot,
        review_state: r.review_state,
        review_note: r.review_note,
        reviewed_at: r.reviewed_at,
        assets: [],
      };
      byId.set(r.id, file);
    }
    if (r.a_format && r.a_key) {
      file.assets.push({ format: r.a_format, r2_key: r.a_key, bytes: r.a_bytes });
    }
  }
  return [...byId.values()];
}

/** 'p3' → 3. Geen product → Infinity, zodat het ongeplaatste achteraan komt. */
function productNumber(key) {
  const n = Number(String(key || '').replace(/^p/i, ''));
  return Number.isFinite(n) && n > 0 ? n : Infinity;
}

/**
 * Van beelden naar zip-ingangen: `{ name, key, bytes }` per bestand.
 *
 * `key` is de R2-sleutel; de aanroeper maakt er zelf een `get()` van, want het
 * portaal en de Studio hebben dezelfde bucket maar niet dezelfde binding-naam in
 * hun hoofd — en een functie die zelf uit R2 gaat lezen is een functie die je niet
 * kunt testen zonder R2.
 *
 * De volgorde is de volgorde in de zip, en die is bewust menselijk: product 1 tot
 * 30, binnen een product voorkant → achterkant → detail → op-model, en binnen een
 * beeld png → jpg → webp. Een archief dat op id gesorteerd is, is gesorteerd op de
 * volgorde waarin wij toevallig geüpload hebben.
 */
export function deliveryEntries(files, lang = 'nl', opts = {}) {
  const shotName = SHOT_NAME[lang === 'en' ? 'en' : 'nl'];
  const root = opts.ref ? `${ZIP_ROOT_PREFIX}${opts.ref}/` : '';
  const namen = opts.productNames || {};

  /* Hoeveel cijfers de mapnummers krijgen. Twee is genoeg tot en met 99, en dat is
     ruim boven de dertig producten van de grootste bestelling — maar het getal
     wordt geméten en niet aangenomen, want de dag dat er honderd in gaan hoort de
     map niet stil weer door de war te lopen. */
  const hoogste = files.reduce((n, f) => {
    const p = productNumber(f.product_key);
    return Number.isFinite(p) && p > n ? p : n;
  }, 0);
  const breedte = Math.max(2, String(hoogste).length);

  const sorted = [...files].sort((a, b) => {
    const pa = productNumber(a.product_key);
    const pb = productNumber(b.product_key);
    if (pa !== pb) return pa - pb;
    const sa = SHOT_ORDER.indexOf(a.shot);
    const sb = SHOT_ORDER.indexOf(b.shot);
    if (sa !== sb) return (sa < 0 ? 99 : sa) - (sb < 0 ? 99 : sb);
    return a.id - b.id;
  });

  const entries = [];
  for (const f of sorted) {
    /*
     * GEEN ASSETS = EEN OUDE LEVERING. Platte naam, precies zoals het archief er
     * altijd uitzag. Zie de noot bovenaan: hier geen verzonnen mapstructuur om
     * een bestand heen dat nooit is omgezet.
     */
    if (!f.assets.length) {
      /* PLAT, maar wel binnen de map van de bestelling. Het pad erbuiten laten zou
         betekenen dat één oude levering ertussen de hele zip weer over iemands
         Downloads uitstrooit; de mapstructuur die dit bestand niet kent, wordt er
         nog steeds niet omheen verzonnen. */
      entries.push({ name: `${root}${f.filename || `${f.id}.jpg`}`, key: f.r2_key, bytes: f.bytes || 0 });
      continue;
    }

    const product = productNumber(f.product_key);
    const dir = Number.isFinite(product)
      ? productFolderName(product, namen[`p${product}`], breedte)
      : (lang === 'en' ? 'other' : 'overig');
    const base = shotFilebase(f.shot, shotName, f.id);

    const order = Object.keys(FORMAT_DIR);
    const assets = [...f.assets].sort(
      (a, b) => order.indexOf(a.format) - order.indexOf(b.format)
    );
    for (const a of assets) {
      const folder = FORMAT_DIR[a.format];
      if (!folder) continue;   // een formaat dat wij niet kennen, komt er niet in
      entries.push({
        name: `${root}${dir}/${folder}/${base}.${a.format}`,
        key: a.r2_key,
        bytes: a.bytes || 0,
      });
    }
  }
  return entries;
}

/** De map om de hele levering heen, zodat uitpakken één map oplevert. */
export const ZIP_ROOT_PREFIX = 'VISUAILS-';

/**
 * De productnamen die de klant zelf heeft ingetypt, uit details_json.
 *
 * `product_p1` is de sleutel die het bestelformulier post en die serveScaffold() in
 * admin.js al leest voor de werkmap. Hier staat hij een tweede keer, en dat is het
 * soort duplicatie dat dit bestand elders juist bestrijdt — maar admin.js draait op
 * de studiokant met zijn eigen `tekst()`-schoonmaak en een import van admin.js in
 * delivery.js zou het portaal aan het adminpaneel knopen. Één regexp op één sleutel
 * is de goedkopere van de twee.
 *
 * ONLEESBARE JSON IS GEEN FOUT. Dan zijn er geen namen en heten de mappen `01`,
 * `02` — nog steeds gesorteerd, alleen zonder het artikel erbij. Een archief mag
 * niet omvallen op een veld dat alleen de mapnaam mooier maakt.
 */
export function orderProductNames(detailsJson) {
  let d = {};
  try { d = JSON.parse(detailsJson || '{}') || {}; } catch { return {}; }
  const uit = {};
  for (const [k, v] of Object.entries(d)) {
    const m = /^product_(p\d+)$/.exec(k);
    if (m && typeof v === 'string' && v.trim()) uit[m[1]] = v.trim();
  }
  return uit;
}

/**
 * `03 - Zwarte hoodie`, of `03` als de klant geen naam heeft ingevuld.
 *
 * NUL ERVOOR, en dat is de hele reden dat deze functie bestaat: een verkenner
 * sorteert `product-10` vóór `product-2`, dus las een bestelling van tien producten
 * als 1, 10, 2, 3. Bij negen valt dat niet op.
 *
 * DE NAAM WORDT GESCHOOND en niet vertrouwd. Hij komt uit een tekstveld dat de klant
 * heeft ingevuld, en die tekst wordt hier een PAD in een zip: `../` erin, een
 * dubbele punt op Windows, of een naam van tweehonderd tekens is het verschil tussen
 * een map en een bestand dat ergens anders belandt. Wat overblijft mag geen leeg
 * staartje zijn, want `03 - ` leest als een fout.
 */
export function productFolderName(n, naam, breedte = 2) {
  const nummer = String(n).padStart(breedte, '0');
  const schoon = String(naam || '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 48)
    .trim();
  return schoon ? `${nummer} - ${schoon}` : nummer;
}

/**
 * `1-voorkant`, `2-achterkant`, `3-detail`, `4-op-model`.
 *
 * Het nummer staat er om dezelfde reden als bij de productmap: alfabetisch is
 * `achterkant` de eerste en `voorkant` de laatste, en de voorkant is nu juist de
 * foto waar iemand naar zoekt. Dezelfde nummering als de vakjes in de werkmap
 * (SLOT_FOLDER in scaffold.js), zodat er één telling is in het hele traject.
 */
export function shotFilebase(shot, shotName, fileId) {
  const i = SHOT_ORDER.indexOf(shot);
  if (i < 0 || !shotName[shot]) return `beeld-${fileId}`;
  return `${i + 1}-${shotName[shot]}`;
}

/**
 * Wat de klant over de map te weten krijgt: hoeveel bestanden, hoe groot, en of
 * er formaten in zitten of dat het een oude platte levering is.
 *
 * Dit wordt op het scherm gezet naast de knop. Een downloadknop zonder maat is
 * een knop waarvan je niet weet of je hem op 4G moet aanraken.
 */
export function deliverySummary(entries) {
  const bytes = entries.reduce((sum, e) => sum + (e.bytes || 0), 0);
  const formats = new Set();
  for (const e of entries) {
    const m = /\.([a-z0-9]+)$/i.exec(e.name);
    if (m) formats.add(m[1].toLowerCase());
  }
  return {
    files: entries.length,
    bytes,
    formats: [...formats].sort(),
    // Mappen zitten erin zodra er ook maar één naam een / heeft.
    foldered: entries.some((e) => e.name.includes('/')),
  };
}

/** '12,4 MB' — één cijfer achter de komma, want twee suggereert precisie die niemand nodig heeft. */
export function humanBytes(n, lang = 'nl') {
  const b = Number(n) || 0;
  const mb = b / (1024 * 1024);
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb.toFixed(1).replace('.', lang === 'en' ? '.' : ',')} GB`;
  }
  if (mb >= 1) return `${mb.toFixed(1).replace('.', lang === 'en' ? '.' : ',')} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   DE TWEE TEKSTBESTANDEN IN DE LEVERING
   ───────────────────────────────────────────────────────────────────────────── */

/*
 * CRLF, om dezelfde reden als in scaffold.js: dit bestand wordt op een
 * Windows-machine in Kladblok geopend, en een leesmij die als één lange regel
 * opengaat is een leesmij die niet gelezen wordt. Hier weegt het zwaarder dan daar,
 * want daar was de lezer de studio en hier is het de klant.
 */
const CRLF = (lines) => `${lines.join('\r\n')}\r\n`;

/** Waar we onderaan naar verwijzen. Één plek, zodat de twee talen niet uiteenlopen. */
const CONTACT = 'hello@visuails.com';

/**
 * Wat elk formaat IS en wanneer je het pakt.
 *
 * Dit is het stuk waar Lucas om vroeg — *"waarvoor elk bestand is"* — en het is ook
 * het stuk waar de meeste onzin in kan sluipen. Wat hier staat zijn eigenschappen
 * van de FORMATEN, niet beloftes over onze pijplijn: geen resolutie, geen
 * kleurprofiel, geen bestandsgrootte. Dat zijn dingen die per levering verschillen,
 * en een leesmij die er een getal bij verzint is erger dan een leesmij zonder getal.
 */
const FORMAT_HELP = {
  nl: [
    ['JPG', 'Voor je webshop, marktplaatsen en advertenties. Het kleinste bestand en het formaat dat werkelijk alles opent — Shopify, WooCommerce, bol.com, Amazon, Zalando, Meta, Google Shopping. Als je twijfelt: pak de jpg.'],
    ['PNG', 'Het onbewerkte bestand, zonder compressieverlies. Dit is je archief en je werkbestand: hier zet je tekst over, hier snijd je uit, hier maak je een banner van. Groter, dus niet het bestand dat je op je productpagina zet.'],
    ['WEBP', 'Voor de website zelf, als je die in eigen hand hebt. Bij vergelijkbare kwaliteit een stuk kleiner dan jpg, dus een pagina die sneller laadt. Elke moderne browser opent het; oudere software soms niet, en dan is de jpg je terugval.'],
  ],
  en: [
    ['JPG', 'For your shop, marketplaces and ads. The smallest file and the format that opens absolutely everywhere — Shopify, WooCommerce, Amazon, Zalando, Meta, Google Shopping. When in doubt, take the jpg.'],
    ['PNG', 'The unprocessed file, with no compression loss. This is your archive and your working file: put text over it, crop it, build a banner from it. Larger, so not the one to put on a product page.'],
    ['WEBP', 'For the website itself, if you control it. Substantially smaller than jpg at comparable quality, so a page that loads faster. Every modern browser opens it; some older software does not, and then the jpg is your fallback.'],
  ],
};

/**
 * De leesmij die de klant in zijn map vindt.
 *
 * ── WAT DIT BESTAND MOET DOEN ───────────────────────────────────────────────
 *
 * Niet indruk maken. Antwoord geven op de vragen die iemand met honderdtwintig
 * bestanden in drie formaten écht heeft, in de volgorde waarin hij ze stelt:
 *
 *   Wat heb ik hier?  →  Welke pak ik waarvoor?  →  Hoe pak ik ze allemaal in één
 *   keer?  →  Hoe lang kan ik hierbij?  →  En als er iets niet goed is?
 *
 * Alles wat hier staat is óf gemeten aan deze levering (aantallen, formaten,
 * productnamen), óf een eigenschap van het bestandsformaat, óf een afspraak die
 * elders in deze repository al vastligt (de bewaartermijn uit retention.js, de
 * IPTC-tag uit iptc.js). Er wordt niets over de beelden zelf beweerd wat we niet
 * uit de levering kunnen aflezen.
 *
 * @param {object} a
 * @param {object} a.order        ref, brand/name, lang, window_end
 * @param {Array}  a.entries      de foto-ingangen, zoals deliveryEntries ze gaf
 * @param {object} a.productNames { p1: 'Zwarte hoodie', ... }
 * @param {string} [a.portalUrl]  de link waar de revisieknop zit, als die er is
 */
export function deliveryReadme({ order, entries, productNames = {}, portalUrl } = {}) {
  const nl = order?.lang !== 'en';
  const merk = order?.brand || order?.name || (nl ? 'je merk' : 'your brand');

  // Gemeten aan de levering, niet aangenomen: welke formaten er echt in zitten en
  // welke productmappen er echt zijn.
  const s = deliverySummary(entries);
  const mappen = [...new Set(
    entries.map((e) => (e.name.includes('/') ? e.name.split('/').slice(0, -2).pop() : null)).filter(Boolean)
  )];
  /* HET AANTAL BEELDEN WORDT GETELD EN NIET GEDEELD. De eerste versie hier deed
     `bestanden / formaten`, en dat is alleen juist als elk beeld in elk formaat
     bestaat. Bij één beeld dat om wat voor reden ook geen webp heeft, staat er dan
     een verkeerd getal in de eerste vier regels die de klant leest — en een leesmij
     die begint met een getal dat niet klopt, wordt de rest niet meer geloofd.
     Tellen wat er staat: map + naam zonder extensie is precies één beeld. */
  const beelden = new Set(
    entries.map((e) => e.name.replace(/\/[A-Z]+\/([^/]+)\.[a-z0-9]+$/, '/$1'))
  ).size;

  const help = FORMAT_HELP[nl ? 'nl' : 'en'].filter(([f]) => s.formats.includes(f.toLowerCase()));
  const formaatRegels = [];
  for (const [naam, uitleg] of help) {
    formaatRegels.push(`${naam}/`);
    for (const regel of wrap(uitleg, 68)) formaatRegels.push(`    ${regel}`);
    formaatRegels.push('');
  }

  const shotWoorden = SHOT_ORDER
    .map((k, i) => `${i + 1}-${SHOT_NAME[nl ? 'nl' : 'en'][k]}`)
    .join(', ');

  const kop = (t) => [t, '-'.repeat(Math.min(68, Math.max(20, t.length)))];

  if (nl) {
    return CRLF([
      `VISUAILS — je beelden`,
      '='.repeat(68),
      '',
      `Bestelling   ${order?.ref || '-'}`,
      `Voor         ${merk}`,
      `In deze map  ${mappen.length || 1} ${mappen.length === 1 ? 'product' : 'producten'}, ${beelden} ${beelden === 1 ? 'beeld' : 'beelden'}, ${entries.length} bestanden (${humanBytes(s.bytes, 'nl')})`,
      `Formaten     ${s.formats.map((f) => f.toUpperCase()).join(', ')}`,
      '',
      'Hieronder staat in vijf korte stukken alles wat je met deze map moet',
      'kunnen. Je hebt het niet nodig om te beginnen — open een productmap en',
      'pak de jpg, dan zit je goed.',
      '',
      ...kop('1 · HOE DE MAP IS INGEDEELD'),
      '',
      'Eerst per product, daarna per formaat:',
      '',
      `    ${mappen[0] || '01 - je product'}/`,
      '        JPG/',
      '            1-voorkant.jpg',
      '            2-achterkant.jpg',
      '        PNG/',
      '        WEBP/',
      '',
      'De mapnaam is jouw eigen productnaam, met een nummer ervoor zodat je',
      'verkenner ze in de goede volgorde zet. De nummers in de bestandsnamen',
      'doen hetzelfde binnen een product: zonder nummer zou de voorkant',
      'onderaan staan, want alfabetisch komt "achterkant" eerst.',
      '',
      `De namen die je tegenkomt: ${shotWoorden}.`,
      '',
      ...kop('2 · WELK FORMAAT PAK JE WAARVOOR'),
      '',
      ...formaatRegels,
      'Alle drie zijn hetzelfde beeld. Je verliest niets door de kleinste te',
      'nemen — dat is precies waarvoor hij er is.',
      '',
      ...kop("3 · ALLE JPG'S IN ÉÉN KEER"),
      '',
      'Je hoeft niet dertig mappen langs. Pak de hoofdmap en zoek erin:',
      '',
      '    Windows    open de map, typ  *.jpg  in het zoekvak rechtsboven',
      '    macOS      Cmd+F in de map, "Soort is Afbeelding" of typ  .jpg',
      '',
      'Selecteer alles wat hij vindt en sleep dat naar je webshop. De',
      'bestandsnamen blijven leesbaar, dus je ziet in je shop nog terug welk',
      'beeld bij welk product hoort.',
      '',
      ...kop('4 · TOT WANNEER JE HIERBIJ KAN'),
      '',
      `De map blijft ${DELIVERY_MONTHS} maanden te downloaden vanuit je dashboard op`,
      'visuails.com. Daarna wordt hij opgeruimd — dat is een afspraak uit onze',
      'voorwaarden en geen technische grens.',
      '',
      'Zet er dus één kopie van op je eigen schijf of in je eigen cloud. Niet',
      'omdat wij het niet bewaren, maar omdat dit de originelen zijn en een',
      'back-up van je eigen beeldmateriaal altijd bij jou hoort te liggen.',
      '',
      ...kop('5 · ALS ER IETS NIET GOED IS'),
      '',
      'Dan zetten we het recht. Niet als uitzondering: het staat zo in onze',
      'voorwaarden en het is de reden dat je de beelden per stuk kunt bekijken.',
      '',
      /* Twee losse regels en geen \n in één string: dit bestand wordt met CRLF
         geschreven en een losse \n er middenin geeft op Windows precies de kapotte
         regelafbreking die CRLF moest voorkomen. */
      ...(portalUrl
        ? ['Vraag een revisie aan bij het beeld zelf:', `    ${portalUrl}`]
        : ['Vraag een revisie aan bij het beeld zelf, in je dashboard op', 'visuails.com/nl/portal.']),
      '',
      'Zeg daarbij zo precies als je kunt wat er anders moet — "de kleur van de',
      'stof is te warm" helpt ons meer dan "hij klopt niet". Liever bellen of',
      `appen? Mail ${CONTACT} en we bellen je terug.`,
      '',
      '='.repeat(68),
      '',
      'NOG TWEE DINGEN DIE JE MOET WETEN',
      '',
      'De beelden zijn van jou. LICENTIE.txt in deze map zegt in gewone taal',
      'wat je ermee mag, en dat is: vrijwel alles, zonder limiet en zonder ons',
      'te vermelden.',
      '',
      'Ze zijn met AI gemaakt. In elk bestand staat dat ook als machineleesbaar',
      'gegeven (het IPTC-veld "Digital Source Type"), zodat het meereist als je',
      'ze doorstuurt. Publiceer je ze, dan hoort er een vermelding bij — de EU',
      'AI Act vraagt dat van wie publiceert, dus van jou. Op',
      'visuails.com/nl/ai-act staat een zin die je kunt overnemen.',
      '',
      `Vragen? ${CONTACT} — je krijgt antwoord van een mens.`,
      '',
    ]);
  }

  return CRLF([
    `VISUAILS — your images`,
    '='.repeat(68),
    '',
    `Order          ${order?.ref || '-'}`,
    `For            ${merk}`,
    `In this folder ${mappen.length || 1} ${mappen.length === 1 ? 'product' : 'products'}, ${beelden} ${beelden === 1 ? 'image' : 'images'}, ${entries.length} files (${humanBytes(s.bytes, 'en')})`,
    `Formats        ${s.formats.map((f) => f.toUpperCase()).join(', ')}`,
    '',
    'Below, in five short parts, is everything you should need. You do not',
    'need it to get started — open a product folder and take the jpg, and',
    'you are fine.',
    '',
    ...kop('1 · HOW THE FOLDER IS ARRANGED'),
    '',
    'By product first, then by format:',
    '',
    `    ${mappen[0] || '01 - your product'}/`,
    '        JPG/',
    '            1-front.jpg',
    '            2-back.jpg',
    '        PNG/',
    '        WEBP/',
    '',
    'The folder name is your own product name, with a number in front so',
    'your file browser puts them in the right order. The numbers in the',
    'filenames do the same inside a product: without them the front shot',
    'would sit at the bottom, because "back" comes first alphabetically.',
    '',
    `The names you will see: ${shotWoorden}.`,
    '',
    ...kop('2 · WHICH FORMAT FOR WHAT'),
    '',
    ...formaatRegels,
    'All three are the same image. You lose nothing by taking the smallest —',
    'that is exactly what it is there for.',
    '',
    ...kop('3 · ALL THE JPGS AT ONCE'),
    '',
    'You do not have to walk through thirty folders. Take the top folder and',
    'search inside it:',
    '',
    '    Windows    open the folder, type  *.jpg  in the search box',
    '    macOS      Cmd+F in the folder, "Kind is Image", or type  .jpg',
    '',
    'Select everything it finds and drag that into your shop. The filenames',
    'stay readable, so you can still tell which image belongs to which',
    'product once they are uploaded.',
    '',
    ...kop('4 · HOW LONG YOU CAN COME BACK'),
    '',
    `The folder stays downloadable from your dashboard on visuails.com for`,
    `${DELIVERY_MONTHS} months. After that it is cleaned up — that is a commitment in our`,
    'terms, not a technical limit.',
    '',
    'So put one copy on your own disk or in your own cloud. Not because we',
    'will not keep it, but because these are the originals, and a backup of',
    'your own image library belongs with you.',
    '',
    ...kop('5 · IF SOMETHING IS NOT RIGHT'),
    '',
    'Then we put it right. Not as an exception: it is written into our terms,',
    'and it is the reason you can look at the images one by one.',
    '',
    ...(portalUrl
      ? ['Ask for a revision on the image itself:', `    ${portalUrl}`]
      : ['Ask for a revision on the image itself, in your dashboard on', 'visuails.com/portal.']),
    '',
    'Say as precisely as you can what should change — "the fabric colour is',
    'too warm" helps us more than "it is off". Prefer a call or a message?',
    `Mail ${CONTACT} and we will call you back.`,
    '',
    '='.repeat(68),
    '',
    'TWO MORE THINGS WORTH KNOWING',
    '',
    'The images are yours. LICENCE.txt in this folder says in plain language',
    'what you may do with them, and that is: very nearly anything, with no',
    'limit and without crediting us.',
    '',
    'They were made with AI. Every file carries that as machine-readable',
    'data too (the IPTC "Digital Source Type" field), so it travels with the',
    'file when you pass it on. If you publish them, a disclosure belongs',
    'with them — the EU AI Act asks that of whoever publishes, so of you.',
    'visuails.com/ai-act has a sentence you can use.',
    '',
    `Questions? ${CONTACT} — a person answers.`,
    '',
  ]);
}

/**
 * De twee tekstbestanden, klaar om in de zip te gaan.
 *
 * Ze staan in de WORTEL van de map en niet ergens ertussen: dit zijn de eerste twee
 * dingen die iemand ziet als hij uitpakt, en dat is precies waar ze horen.
 *
 * `text` in plaats van `key`, want deze twee staan niet in R2 — ze worden per
 * download gemaakt uit de bestelling die voor je staat. Zie deliveryZipFiles()
 * hieronder voor waarom dat één plek is en niet twee.
 */
export function deliveryDocs({ order, entries, productNames = {}, portalUrl } = {}) {
  const nl = order?.lang !== 'en';
  const root = order?.ref ? `${ZIP_ROOT_PREFIX}${order.ref}/` : '';
  return [
    {
      name: `${root}${nl ? 'LEESMIJ.txt' : 'README.txt'}`,
      text: deliveryReadme({ order, entries, productNames, portalUrl }),
    },
    {
      name: `${root}${nl ? 'LICENTIE.txt' : 'LICENCE.txt'}`,
      text: licenceText({ order, lang: nl ? 'nl' : 'en' }),
    },
  ];
}

/**
 * Van ingangen naar wat zipStream() wil hebben.
 *
 * ── WAAROM DIT HIER STAAT EN NIET TWEE KEER BIJ DE AANROEPER ────────────────
 *
 * /account en /o/<token> bouwden beide hun eigen `entries.map(...)` met een `get()`
 * die uit R2 leest. Zodra er ingangen bij komen die NIET uit R2 komen — deze twee
 * tekstbestanden — moet elke aanroeper dat onderscheid kennen, en dan is er een dag
 * waarop de één de leesmij meestuurt en de ander niet. Dat is exact de fout die de
 * kop van dit bestand beschrijft: twee query's over dezelfde levering die uit elkaar
 * liepen. Dus één functie, twee aanroepers.
 *
 * @param {Array} entries  de foto's ({name, key})
 * @param {Array} docs     de tekstbestanden ({name, text})
 * @param {(key: string) => Promise<ArrayBuffer|null>} lees  hoe de aanroeper R2 leest
 */
export function deliveryZipFiles(entries, docs, lees) {
  const uit = docs.map((d) => ({
    name: d.name,
    get: async () => new TextEncoder().encode(d.text),
  }));
  for (const e of entries) {
    uit.push({ name: e.name, get: () => lees(e.key) });
  }
  return uit;
}

/**
 * Regels afbreken op woordgrens.
 *
 * Een leesmij in een tekstbestand heeft geen tekstterugloop van de lezer te
 * verwachten: Kladblok breekt standaard niet af, dus een alinea van tweehonderd
 * tekens is één regel die rechts uit het venster loopt. Zelf afbreken is hier dus
 * geen opmaak maar leesbaarheid.
 */
function wrap(text, breedte = 68) {
  const woorden = String(text).split(/\s+/).filter(Boolean);
  const regels = [];
  let regel = '';
  for (const w of woorden) {
    if (!regel) { regel = w; continue; }
    if (`${regel} ${w}`.length <= breedte) regel += ` ${w}`;
    else { regels.push(regel); regel = w; }
  }
  if (regel) regels.push(regel);
  return regels;
}

export { FORMAT_DIR, SHOT_ORDER, SHOT_NAME };
