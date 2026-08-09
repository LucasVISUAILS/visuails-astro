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
 * Lucas koos: eerst per product, dan per formaat.
 *
 *   product-1/PNG/voorkant.png
 *   product-1/JPG/voorkant.jpg
 *   product-1/WEBP/voorkant.webp
 *   product-2/PNG/achterkant.png
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
 */

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
export function deliveryEntries(files, lang = 'nl') {
  const shotName = SHOT_NAME[lang === 'en' ? 'en' : 'nl'];

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
      entries.push({ name: f.filename || `${f.id}.jpg`, key: f.r2_key, bytes: f.bytes || 0 });
      continue;
    }

    const product = productNumber(f.product_key);
    const dir = Number.isFinite(product) ? `product-${product}` : 'overig';
    const base = f.shot && shotName[f.shot] ? shotName[f.shot] : `beeld-${f.id}`;

    const order = Object.keys(FORMAT_DIR);
    const assets = [...f.assets].sort(
      (a, b) => order.indexOf(a.format) - order.indexOf(b.format)
    );
    for (const a of assets) {
      const folder = FORMAT_DIR[a.format];
      if (!folder) continue;   // een formaat dat wij niet kennen, komt er niet in
      entries.push({
        name: `${dir}/${folder}/${base}.${a.format}`,
        key: a.r2_key,
        bytes: a.bytes || 0,
      });
    }
  }
  return entries;
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

export { FORMAT_DIR, SHOT_ORDER, SHOT_NAME };
