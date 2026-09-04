/* VISUAILS — de map is het eindresultaat.
 *
 *   npm run test:delivery
 *
 * ── WAT HIER ONDER TEST KOMT, EN WAAROM DAT NODIG WAS ───────────────────────
 *
 * Vóór vandaag was er GEEN ENKELE test die src/lib/zip.js uitvoerde. Geen test die
 * een bestandsroute aanriep, geen test die keek wat er in een archief zit. Het
 * bestand dat de klant als enige meeneemt, was het enige bestand zonder net eronder
 * — en zip.js is met de hand geschreven binaire opmaak, dus precies het soort code
 * waar een typefout geen foutmelding geeft maar een archief dat niet opengaat.
 *
 * Dat viel op toen Lucas op 9 augustus 2026 om de mappenstructuur vroeg: de functie
 * die de namen maakt, zette elke schuine streep om in een koppelteken. Mappen waren
 * dus onmogelijk, stil, en niemand kon het weten.
 *
 * Deze tests pakken het archief daarom ECHT UIT met een eigen lezer (§4) in plaats
 * van te controleren welke bytes erin geschreven zijn. Een test die de schrijver
 * naspreekt, gaat mee als de schrijver fout is.
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { zipStream, zipDisposition, ZIP_MAX_BYTES, ZIP_MAX_FILES } from '../src/lib/zip.js';
import { DELIVERY_DAYS } from '../src/lib/retention.js';
import { readmeText as studioReadme } from '../src/lib/scaffold.js';
import {
  loadDeliveryFiles, deliveryEntries, deliveryDocs, deliveryZipFiles,
  deliveryReadme, productFolderName, orderProductNames, deliverySummary, humanBytes,
  FORMAT_DIR, SHOT_ORDER,
} from '../src/lib/delivery.js';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(60)} ${ok ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

/* ── D1 op node:sqlite, met de echte migraties ───────────────────────────── */
function d1(db) {
  return {
    prepare(sql) {
      const st = {
        _a: [],
        bind(...a) { st._a = a; return st; },
        async first() { return db.prepare(sql).get(...st._a) ?? null; },
        async run() { return { success: true, meta: db.prepare(sql).run(...st._a) }; },
        async all() { return { results: db.prepare(sql).all(...st._a) }; },
      };
      return st;
    },
  };
}

/**
 * Een database met het echte schema van `files` plus de echte migratie 0022.
 *
 * Het migratiebestand wordt INGELEZEN en niet nagebouwd: wijkt de CHECK op
 * `format` of de UNIQUE op (file_id, format) af van wat deze test aanneemt, dan
 * valt dat hier om en niet in productie.
 */
function fresh() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE orders (id INTEGER PRIMARY KEY, ref TEXT, lang TEXT);`);
  db.exec(`CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'delivery',
    r2_key TEXT NOT NULL,
    preview_key TEXT,
    filename TEXT,
    bytes INTEGER,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    review_state TEXT NOT NULL DEFAULT 'pending',
    review_note TEXT,
    reviewed_at TEXT,
    product_key TEXT,
    shot TEXT,
    announced_at TEXT,
    superseded_at TEXT
  );`);
  db.exec(readFileSync(new URL('../migrations/0022-delivery-assets.sql', import.meta.url), 'utf8'));
  db.prepare("INSERT INTO orders (id, ref, lang) VALUES (1, 'VIS-2608-4471', 'nl')").run();
  return db;
}

function addFile(db, { id, product, shot, bytes = 1000, superseded = null, expires = null, assets = [] }) {
  db.prepare(
    `INSERT INTO files (id, order_id, kind, r2_key, preview_key, filename, bytes, product_key, shot, superseded_at, expires_at)
     VALUES (?, 1, 'delivery', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, `delivery/master-${id}.png`, `delivery/review/${id}.webp`, `beeld-${id}.png`, bytes, product, shot, superseded, expires);
  for (const [format, b] of assets) {
    db.prepare('INSERT INTO file_assets (file_id, format, r2_key, bytes) VALUES (?, ?, ?, ?)')
      .run(id, format, `delivery/${id}.${format}`, b);
  }
}

const ALL = [['png', 3000], ['jpg', 800], ['webp', 500]];

/* ══ 1 · DE MAPPENSTRUCTUUR ══════════════════════════════════════════════════ */
console.log('\nde mappenstructuur');
{
  const db = fresh();
  addFile(db, { id: 1, product: 'p1', shot: 'front', assets: ALL });
  addFile(db, { id: 2, product: 'p1', shot: 'back', assets: ALL });
  addFile(db, { id: 3, product: 'p2', shot: 'front', assets: ALL });
  const files = await loadDeliveryFiles({ DB: d1(db) }, 1);

  /*
   * ── DE NAMEN ZIJN OP 13 AUGUSTUS 2026 VERANDERD ────────────────────────────
   *
   * Deze vijf regels stonden op `product-1/PNG/voorkant.png` en zijn niet
   * "aangepast omdat de test rood werd" -- ze toetsten een structuur die bij tien
   * producten door de war liep. `product-10` sorteert in elke bestandsverkenner
   * VOOR `product-2`, en `achterkant` staat alfabetisch voor `voorkant`, dus las een
   * bestelling van tien producten als 1, 10, 11, 2 met de voorkant onderaan.
   *
   * Wat hier nu staat is dus een strengere eis dan wat er stond, niet een lossere:
   * de nummers moeten er zijn EN ze moeten sorteren.
   */
  const opts = { ref: 'VIS-TEST-001', productNames: { p1: 'Zwarte hoodie' } };
  const names = deliveryEntries(files, 'nl', opts).map((e) => e.name);
  const R = 'VISUAILS-VIS-TEST-001';

  check('drie beelden worden negen bestanden', names.length, 9);
  check('alles zit in een map met de referentie', names.every((n) => n.startsWith(`${R}/`)), true);
  check('product eerst, dan formaat', names[0], `${R}/01 - Zwarte hoodie/PNG/1-voorkant.png`);
  check('de drie formaten van hetzelfde beeld', names.slice(0, 3), [
    `${R}/01 - Zwarte hoodie/PNG/1-voorkant.png`,
    `${R}/01 - Zwarte hoodie/JPG/1-voorkant.jpg`,
    `${R}/01 - Zwarte hoodie/WEBP/1-voorkant.webp`,
  ]);
  // De shotvolgorde is menselijk en niet alfabetisch: achterkant komt ná voorkant.
  check('voorkant vóór achterkant', names[3], `${R}/01 - Zwarte hoodie/PNG/2-achterkant.png`);
  // Zonder naam in details_json blijft het nummer over -- nog steeds gesorteerd.
  check('en dan product 2, zonder naam', names[6], `${R}/02/PNG/1-voorkant.png`);

  const en = deliveryEntries(files, 'en', opts).map((e) => e.name);
  check('engels', en[0], `${R}/01 - Zwarte hoodie/PNG/1-front.png`);

  /* ── DE EIGENLIJKE EIS: HET SORTEERT ────────────────────────────────────────
     Niet "de naam is zo", maar "een verkenner zet ze in deze volgorde". Dat is de
     bug die dit moest verhelpen, en alleen deze vergelijking meet hem. */
  const veel = fresh();
  for (let i = 1; i <= 12; i++) addFile(veel, { id: i, product: `p${i}`, shot: 'front', assets: [['jpg', 10]] });
  const veelFiles = await loadDeliveryFiles({ DB: d1(veel) }, 1);
  const mappen = [...new Set(deliveryEntries(veelFiles, 'nl', { ref: 'X' }).map((n) => n.name.split('/')[1]))];
  check('twaalf producten staan in onze volgorde', mappen.slice(0, 3), ['01', '02', '03']);
  check('en alfabetisch sorteren geeft dezelfde volgorde',
    [...mappen].sort().join(','), mappen.join(','));
  /* De controle op de oude situatie, zodat niemand de nullen weer weghaalt: zonder
     padding zou dit juist NIET gelijk zijn. */
  const zonderNul = mappen.map((m) => String(Number(m)));
  check('zonder de nullen zou het wél door de war lopen',
    [...zonderNul].sort().join(',') === zonderNul.join(','), false);
}

/* ══ 2 · WAT ER NIET IN MOET ═════════════════════════════════════════════════ */
console.log('\nwat er niet in het archief hoort');
{
  const db = fresh();
  addFile(db, { id: 1, product: 'p1', shot: 'front', assets: ALL });
  // Vervangen na een revisie. Dit is de rij die het PORTAAL tot vandaag wél liet
  // zien, omdat de query daar de filter miste.
  addFile(db, { id: 2, product: 'p1', shot: 'front', superseded: '2026-08-01 10:00:00', assets: ALL });
  addFile(db, { id: 3, product: 'p2', shot: 'front', expires: '2020-01-01 00:00:00', assets: ALL });
  const files = await loadDeliveryFiles({ DB: d1(db) }, 1);
  check('een vervangen beeld valt weg', files.map((f) => f.id), [1]);

  const db2 = fresh();
  addFile(db2, { id: 1, product: 'p1', shot: 'front', assets: [['png', 10]] });
  db2.prepare("INSERT INTO files (id, order_id, kind, r2_key) VALUES (9, 1, 'upload', 'intake/x.jpg')").run();
  const f2 = await loadDeliveryFiles({ DB: d1(db2) }, 1);
  check('een upload van de klant zit er niet in', f2.map((f) => f.id), [1]);
}

/* ══ 3 · EEN LEVERING VAN VÓÓR VANDAAG ══════════════════════════════════════
   Geen rij in file_assets. Die bestellingen moeten exact het archief blijven geven
   dat ze gisteren gaven — plat, met de naam uit `filename`. Een verzonnen
   productmap met één formaat erin zou een map beloven die er niet is. */
console.log('\neen levering zonder formaten');
{
  const db = fresh();
  addFile(db, { id: 1, product: null, shot: null, assets: [] });
  addFile(db, { id: 2, product: 'p1', shot: 'front', assets: [] });
  const files = await loadDeliveryFiles({ DB: d1(db) }, 1);
  const names = deliveryEntries(files, 'nl').map((e) => e.name);
  check('plat, met de eigen bestandsnaam', names, ['beeld-2.png', 'beeld-1.png']);
  check('geen mappen', deliverySummary(deliveryEntries(files, 'nl')).foldered, false);
  /* MET een referentie komen ze wél in de wortelmap, en dat is geen tegenspraak met
     de noot hierboven: er wordt nog steeds geen productmap met drie formaten
     verzonnen om een bestand heen dat nooit is omgezet -- het bestand ligt alleen in
     de map van zijn eigen bestelling, zodat één oude levering ertussen de zip niet
     over iemands Downloads uitstrooit. */
  const inMap = deliveryEntries(files, 'nl', { ref: 'OUD-1' }).map((e) => e.name);
  check('maar wel binnen de map van de bestelling', inMap, ['VISUAILS-OUD-1/beeld-2.png', 'VISUAILS-OUD-1/beeld-1.png']);
}

/* ══ 4 · HET ARCHIEF ECHT UITPAKKEN ═════════════════════════════════════════
 *
 * Een eigen lezer, want dit is de enige manier om te weten of er MAPPEN in het
 * archief zitten. Een test die controleert welke bytes zipStream schrijft, spreekt
 * de schrijver na; deze leest de centrale directory zoals een unzipper dat doet.
 */
console.log('\nhet archief uitpakken');

/** De namen uit de centrale directory van een zip, zoals een unzipper ze leest. */
function readZipNames(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // De End Of Central Directory achteraan zoeken.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('geen EOCD — dit is geen zip');
  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const names = [];
  const flags = [];
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) throw new Error(`geen directory-ingang op ${off}`);
    flags.push(dv.getUint16(off + 8, true));
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    names.push(new TextDecoder().decode(buf.subarray(off + 46, off + 46 + nameLen)));
    off += 46 + nameLen + extraLen + commentLen;
  }
  return { names, flags, count };
}

async function collect(stream) {
  const chunks = [];
  const reader = stream.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

{
  const bytes = (s) => new TextEncoder().encode(s).buffer;
  const zip = await collect(zipStream([
    { name: 'product-1/PNG/voorkant.png', get: async () => bytes('een') },
    { name: 'product-1/JPG/voorkant.jpg', get: async () => bytes('twee') },
    { name: 'product-2/PNG/voorkant.png', get: async () => bytes('drie') },
  ]));
  const { names, flags, count } = readZipNames(zip);

  check('drie ingangen', count, 3);
  // DIT is de test die de bug zou hebben gevangen. Vóór vandaag stond hier
  // 'product-1-PNG-voorkant.png' en niemand kon dat weten.
  check('de mappen staan er echt in', names, [
    'product-1/PNG/voorkant.png',
    'product-1/JPG/voorkant.jpg',
    'product-2/PNG/voorkant.png',
  ]);
  // Bit 3 (0x0008) belooft een data descriptor die wij niet schrijven. Stond aan.
  check('geen valse belofte over een data descriptor', flags.map((f) => f & 0x0008), [0, 0, 0]);
  check('en de naam is als UTF-8 gemarkeerd', flags.map((f) => (f & 0x0800) !== 0), [true, true, true]);
}

/* ══ 5 · EEN NAAM MAG NIET UIT ZIJN MAP KUNNEN ══════════════════════════════
 * Zip Slip: een ingang die `../` in zijn naam heeft, laat een naïeve uitpakker
 * buiten de doelmap schrijven. Onze namen komen uit onze eigen code, maar dit is
 * de laatste plek waar dat te controleren is. */
console.log('\nde namen zijn niet te misbruiken');
{
  const bytes = () => new TextEncoder().encode('x').buffer;
  const zip = await collect(zipStream([
    { name: '../../.bashrc', get: bytes },
    { name: 'a/../../b/weg.png', get: bytes },
    { name: '/absoluut/pad.png', get: bytes },
    { name: 'map\\\\windows.png', get: bytes },
    { name: 'ding:met*rare?tekens.png', get: bytes },
    { name: '', get: bytes },
  ]));
  const { names } = readZipNames(zip);

  check('geen enkele naam loopt terug', names.some((n) => n.split('/').includes('..')), false);
  check('geen absolute paden', names.some((n) => n.startsWith('/')), false);
  check('de bashrc is een gewoon bestand geworden', names[0], '.bashrc');
  check('en de omweg is eruit', names[1], 'a/b/weg.png');
  check('het absolute pad is relatief', names[2], 'absoluut/pad.png');
  check('een backslash is geen map', names[3], 'map--windows.png');
  check('rare tekens worden koppeltekens', names[4], 'ding-met-rare-tekens.png');
  check('een lege naam krijgt er een', names[5], 'bestand-6');
}

/* ══ 6 · TWEE KEER DEZELFDE NAAM ═══════════════════════════════════════════ */
console.log('\ntwee bestanden met dezelfde naam');
{
  const bytes = () => new TextEncoder().encode('x').buffer;
  const zip = await collect(zipStream([
    { name: 'product-1/PNG/voorkant.png', get: bytes },
    { name: 'product-1/PNG/voorkant.png', get: bytes },
    // Dit is GEEN botsing: andere map, zelfde bestandsnaam. Vóór de wijziging zou
    // de deduplicatie op de bestandsnaam hier "voorkant (3).png" van maken.
    { name: 'product-2/PNG/voorkant.png', get: bytes },
  ]));
  const { names } = readZipNames(zip);
  check('de echte botsing krijgt een nummer', names[1], 'product-1/PNG/voorkant (2).png');
  check('een andere map is geen botsing', names[2], 'product-2/PNG/voorkant.png');
}

/* ══ 7 · EEN BESTAND DAT WEG IS, KOST HET ARCHIEF NIET ═════════════════════ */
console.log('\neen ontbrekend object');
{
  const bytes = (s) => new TextEncoder().encode(s).buffer;
  const zip = await collect(zipStream([
    { name: 'a.png', get: async () => bytes('een') },
    { name: 'weg.png', get: async () => null },
    { name: 'b.png', get: async () => bytes('twee') },
  ]));
  const { names, count } = readZipNames(zip);
  check('het ontbrekende bestand wordt overgeslagen', count, 2);
  check('en de rest zit er wel in', names, ['a.png', 'b.png']);
}

/* ══ 8 · DE SAMENVATTING NAAST DE KNOP ═════════════════════════════════════ */
console.log('\nde samenvatting');
{
  const db = fresh();
  addFile(db, { id: 1, product: 'p1', shot: 'front', assets: ALL });
  addFile(db, { id: 2, product: 'p1', shot: 'back', assets: ALL });
  const files = await loadDeliveryFiles({ DB: d1(db) }, 1);
  const s = deliverySummary(deliveryEntries(files, 'nl'));
  check('aantal bestanden', s.files, 6);
  check('totale maat', s.bytes, (3000 + 800 + 500) * 2);
  check('de formaten', s.formats, ['jpg', 'png', 'webp']);
  check('er zitten mappen in', s.foldered, true);

  check('megabytes', humanBytes(12.4 * 1024 * 1024), '12,4 MB');
  check('gigabytes', humanBytes(2 * 1024 * 1024 * 1024), '2,0 GB');
  check('klein', humanBytes(4096), '4 KB');
  check('niets', humanBytes(0), '1 KB');
}

/* ══ 9 · HET SCHEMA HANDHAAFT WAT DE MAPNAAM AANNEEMT ══════════════════════
   De formaatnaam wordt een MAPNAAM. Een typefout ('PNG ' met een spatie) zou
   niemand opvallen tot een klant het meldt, dus staat er een CHECK in migratie
   0022 — en dat is precies het soort regel dat je één keer test en dan vertrouwt. */
console.log('\nhet schema');
{
  const db = fresh();
  addFile(db, { id: 1, product: 'p1', shot: 'front', assets: [] });
  let refused = false;
  try {
    db.prepare("INSERT INTO file_assets (file_id, format, r2_key) VALUES (1, 'tiff', 'x')").run();
  } catch { refused = true; }
  check('een onbekend formaat wordt geweigerd', refused, true);

  db.prepare("INSERT INTO file_assets (file_id, format, r2_key) VALUES (1, 'png', 'a')").run();
  let dupe = false;
  try {
    db.prepare("INSERT INTO file_assets (file_id, format, r2_key) VALUES (1, 'png', 'b')").run();
  } catch { dupe = true; }
  check('hetzelfde formaat kan niet twee keer', dupe, true);

  // ON DELETE CASCADE: een asset is geen zelfstandig feit.
  db.exec('PRAGMA foreign_keys = ON');
  db.prepare('DELETE FROM files WHERE id = 1').run();
  const left = db.prepare('SELECT COUNT(*) AS n FROM file_assets').get();
  check('de assets gaan met het beeld mee', left.n, 0);

  const formats = Object.keys(FORMAT_DIR);
  check('de mapnamen dekken de formaten uit de CHECK', formats, ['png', 'jpg', 'webp']);
  check('en de shots die admin kent', SHOT_ORDER, ['front', 'back', 'detail', 'worn']);
}

/* ══ 10 · DE GRENZEN VAN HET ARCHIEF ═══════════════════════════════════════ */
console.log('\nde grenzen');
{
  check('2 GB, want geen ZIP64', ZIP_MAX_BYTES, 2 * 1024 * 1024 * 1024);
  check('en 4096 bestanden', ZIP_MAX_FILES, 4096);
  check('de bestandsnaam in de header', zipDisposition('VISUAILS-VIS-2608-4471.zip').includes('VISUAILS-VIS-2608-4471.zip'), true);
}

/* ══ 11 · DE BRONCONTROLE ══════════════════════════════════════════════════
 *
 * Dezelfde soort test als in tests/offsite.test.mjs, en om dezelfde reden: de
 * afspraak is "er is nergens meer een losse download van een geleverd beeld", en
 * dat is geen retourwaarde maar de afwezigheid van een link. Alleen de bron kan
 * dat zeggen.
 *
 * Sabotage gedaan: de knop in shotTile of in shot() terugzetten maakt hier iets
 * rood, en de /d-route terugzetten ook.
 */
console.log('\nde broncontrole: nergens nog een losse download');
{
  const account = codeOnly(read('src/lib/account.js'));
  const portal = codeOnly(read('src/lib/portal.js'));

  check('account.js tekent geen /d-link', /files\/\$\{[^}]+\}\/d/.test(account), false);
  check('portal.js tekent geen /d-link', /\/d\/\$\{[^}]+\}/.test(portal), false);
  check('account.js kent de /d-route niet meer', /\(f\|d\)/.test(account), false);
  check('portal.js kent kind download niet meer', /'download'/.test(portal), false);

  // En de map moet er juist WEL zijn, op beide schermen.
  check('account.js heeft de mapdownload', /orders\/\$\{o\.id\}\/zip/.test(account), true);
  check('portal.js heeft de mapdownload', /\/zip/.test(portal), true);
  check('portal.js kent de zip-route', /kind: 'zip'/.test(portal), true);

  // Beide lezen dezelfde bouwer. Dit is de regel die de twee schermen bij elkaar
  // houdt; ging die ooit uit elkaar, dan waren het twee leveringen.
  check('account.js gebruikt de gedeelde bouwer', account.includes('loadDeliveryFiles('), true);
  check('portal.js gebruikt de gedeelde bouwer', portal.includes('loadDeliveryFiles('), true);
  /* ── EEN CONTROLE IS GEEN LIJST — noot van 24 augustus 2026 ──────────────
     Deze regel bewaakt dat portal.js niet zijn eigen LIJST van de levering
     opbouwt; dat was de bug waardoor het portaal vervangen beelden liet zien.

     Sinds de revisieronde staat er in handleRevisionRound() wél een query op
     `files`, en die is iets anders: hij krijgt een rijtje bestandsnummers van de
     klant en vraagt welke daarvan bij déze bestelling horen en nog open staan.
     Hij toont niets. Daarom leidt daar `id IN (...)` en niet `order_id`, en
     daarom blijft deze wacht staan zoals hij is — wie hem laat matchen, heeft
     hoogstwaarschijnlijk alsnog een tweede lijst geschreven. */
  check('portal.js heeft geen eigen bestandsquery meer', /FROM files\s+WHERE order_id = \?1 AND kind = 'delivery'/.test(portal), false);

  // zip.js moet leesbare tekst blijven. Stonden de controletekens er letterlijk in,
  // dan sloeg ripgrep het bestand over en zag geen enkele statische controle het.
  const zipSrc = readFileSync(new URL('../src/lib/zip.js', import.meta.url));
  const control = [...zipSrc].filter((b) => b < 9 || (b >= 11 && b <= 12) || (b >= 14 && b <= 31));
  check('zip.js is gewone tekst', control.length, 0);
}


/* ══ 6 · WAT DE KLANT IN ZIJN MAP LEEST ══════════════════════════════════════
 *
 * Lucas, 13 augustus 2026: *"De read me in de map [...] is in het nederlands en
 * bedoeld voor mij terwijl dit een readme voor de customer [moet zijn]. [...] In de
 * read me moet [...] uitgelegd worden waarvoor elk bestand is en de klant oprecht
 * helpen [...] zodat de klant echt een premium service ontvangt."*
 *
 * De verwarring zat in twee mappen die op elkaar leken. De WERKMAP (scaffold.js)
 * heeft een Nederlandse LEESMIJ voor de studio en die hoort Nederlands te zijn; hij
 * kwam ook nooit bij een klant, want isScaffoldDoc() houdt hem tegen. Maar de
 * conclusie was juist, één stap verder: in de LEVERING zat helemaal niets.
 *
 * Deze sectie toetst drie dingen, en de derde is de belangrijkste:
 *   1 · de leesmij staat erin, in de taal van de klant
 *   2 · hij zegt wat er in de map zit, gemeten en niet aangenomen
 *   3 · het is NIET de studiotekst, en er zit geen toegangstoken in
 */
console.log('\nde leesmij van de klant');
{
  const db = fresh();
  addFile(db, { id: 1, product: 'p1', shot: 'front', assets: ALL });
  addFile(db, { id: 2, product: 'p1', shot: 'back', assets: ALL });
  addFile(db, { id: 3, product: 'p2', shot: 'front', assets: [['jpg', 800]] });
  const files = await loadDeliveryFiles({ DB: d1(db) }, 1);

  const details = JSON.stringify({ product_p1: 'Zwarte hoodie', product_p2: 'Linnen broek', notes: 'iets anders' });
  const namen = orderProductNames(details);
  check('de productnamen komen uit details_json', namen, { p1: 'Zwarte hoodie', p2: 'Linnen broek' });
  check('en niets anders uit dat blob', Object.keys(namen).length, 2);
  check('onleesbare json is geen fout', orderProductNames('{kapot'), {});
  check('een leeg veld levert geen naam', orderProductNames('{"product_p1":"   "}'), {});

  const order = { id: 1, ref: 'VIS-2608-4471', lang: 'nl', brand: 'ACME', details_json: details };
  const entries = deliveryEntries(files, 'nl', { ref: order.ref, productNames: namen });
  const docs = deliveryDocs({ order, entries, productNames: namen });

  check('er zijn twee documenten', docs.length, 2);
  check('de leesmij heet LEESMIJ.txt', docs[0].name, 'VISUAILS-VIS-2608-4471/LEESMIJ.txt');
  check('en de licentie LICENTIE.txt', docs[1].name, 'VISUAILS-VIS-2608-4471/LICENTIE.txt');
  check('beide in de wortel van de map', docs.every((d) => d.name.split('/').length === 2), true);

  const mij = docs[0].text;

  /* GEMETEN EN NIET AANGENOMEN. Product 2 heeft alleen een jpg, dus "bestanden /
     formaten" zou hier 7/3 = 2 beelden zeggen terwijl er 3 zijn. Een leesmij die
     begint met een getal dat niet klopt, wordt de rest niet meer geloofd. */
  check('het aantal beelden is geteld', /3 beelden/.test(mij), true);
  check('en het aantal bestanden ook', /7 bestanden/.test(mij), true);
  check('de productnaam staat in het voorbeeld', mij.includes('01 - Zwarte hoodie/'), true);
  check('de shotnamen staan erbij', /1-voorkant, 2-achterkant, 3-detail, 4-op-model/.test(mij), true);

  /* Alleen de formaten die er ECHT in zitten. Uitleg over een webp die niet in de
     map ligt, is een klant laten zoeken naar een bestand dat er niet is. */
  for (const f of ['JPG/', 'PNG/', 'WEBP/']) check(`uitleg over ${f}`, mij.includes(f), true);

  /* De bewaartermijn komt uit retention.js en staat hier niet los ingetypt: dat is
     dezelfde afspraak die de opruimtaak aanhoudt. */
  check('de bewaartermijn komt uit retention.js', mij.includes(`${DELIVERY_DAYS} dagen`), true);

  check('het zegt hoe je alle jpg\'s pakt', /\*\.jpg/.test(mij), true);
  check('en verwijst naar de licentie ernaast', mij.includes('LICENTIE.txt'), true);
  check('en naar een mens', mij.includes('hello@visuails.com'), true);
  check('de AI-vermelding staat erin', /AI Act/.test(mij), true);

  /* ── DIT IS DE KERN VAN DE KLACHT ────────────────────────────────────────
     De studiotekst uitlegt in welk vakje een beeld hoort en verwijst naar /admin.
     Als daar ook maar één zin van in de klantleesmij staat, is de reparatie niet
     gedaan -- dan leest de klant onze werkinstructie. */
  const studio = studioReadme({ order: { ...order, service: 'catalog' }, products: [{}], origin: 'https://visuails.com' });
  for (const zin of ['werkmap voor bestelling', 'WAT JE NIET MOET DOEN', 'Uploaden is niet melden', '/admin/']) {
    check(`geen studiotekst: "${zin.slice(0, 24)}"`, mij.includes(zin), false);
  }
  check('en de studiotekst zegt die dingen wél', studio.includes('WAT JE NIET MOET DOEN'), true);

  /* ── EN GEEN SLEUTEL IN EEN ARCHIEF ──────────────────────────────────────
     Een zip is precies het bestand dat iemand doorstuurt naar zijn bureau. Een
     portaaltoken erin is een toegangsbewijs dat meereist in een bestand dat
     niemand als geheim beschouwt. */
  const alles = `${docs[0].text}${docs[1].text}`;
  check('geen /o/-link met een token', /\/o\/[A-Za-z0-9_-]{8,}/.test(alles), false);
  check('wel de weg terug via /portal', /\/portal/.test(mij), true);

  /* Kladblok op Windows. Zelfde afweging als in scaffold.js, en hier zwaarder: daar
     was de lezer de studio, hier de klant. */
  check('CRLF, voor Kladblok', mij.includes('\r\n'), true);
  const telang = mij.split('\r\n').filter((r) => r.length > 78);
  check('geen regel loopt uit het venster', telang.length, 0, telang.slice(0, 2));

  /* Engels is een andere taal en niet dezelfde tekst met een ander bestandsnaam. */
  const en = deliveryDocs({ order: { ...order, lang: 'en' }, entries, productNames: namen });
  check('engels heet README.txt', en[0].name, 'VISUAILS-VIS-2608-4471/README.txt');
  check('en LICENCE.txt', en[1].name, 'VISUAILS-VIS-2608-4471/LICENCE.txt');
  check('en staat er geen Nederlands in', /Bestelling|bestanden|maanden te downloaden/.test(en[0].text), false);
  check('maar wel Engels', /In this folder/.test(en[0].text), true);
}

console.log('\nde documenten gaan mee in de zip, en niet in de telling');
{
  const db = fresh();
  addFile(db, { id: 1, product: 'p1', shot: 'front', assets: ALL });
  const files = await loadDeliveryFiles({ DB: d1(db) }, 1);
  const order = { id: 1, ref: 'R1', lang: 'nl', brand: 'ACME', details_json: '{}' };
  const entries = deliveryEntries(files, 'nl', { ref: order.ref });
  const docs = deliveryDocs({ order, entries });

  /* deliverySummary telt de FOTO'S. Zouden de documenten meedoen, dan zou het
     scherm naast de downloadknop "4 bestanden" zeggen bij drie beelden, en zou
     `formats` er 'txt' bij hebben. */
  const s = deliverySummary(entries);
  check('de samenvatting telt alleen beelden', s.files, 3);
  check('en kent geen txt als formaat', s.formats.includes('txt'), false);

  const gelezen = [];
  const zipFiles = deliveryZipFiles(entries, docs, async (key) => { gelezen.push(key); return new Uint8Array([1]).buffer; });
  check('de documenten staan vooraan', zipFiles.slice(0, 2).map((f) => f.name), docs.map((d) => d.name));
  check('en daarna de foto\'s', zipFiles.length, entries.length + 2);

  /* Het verschil dat deze functie bestaat om te bewaken: een document komt NIET uit
     R2 en een foto wél. Deed elke aanroeper dit zelf, dan was er een dag waarop de
     één de leesmij meestuurde en de ander niet. */
  const eerste = await zipFiles[0].get();
  check('een document komt niet uit R2', gelezen.length, 0);
  check('en het is echte tekst', new TextDecoder().decode(eerste).startsWith('VISUAILS'), true);
  await zipFiles[2].get();
  check('een foto wél', gelezen.length, 1);
}

console.log('\nde productnaam wordt geschoond en niet vertrouwd');
{
  /* Deze naam komt uit een tekstveld dat de klant heeft ingevuld en wordt hier een
     PAD in een zip. Wat er niet in mag, mag er echt niet in. */
  check('nul ervoor', productFolderName(3, 'Hoodie'), '03 - Hoodie');
  check('zonder naam blijft het nummer', productFolderName(7, ''), '07');
  check('een schuine streep gaat eruit', productFolderName(1, 'a/b'), '01 - a b');
  check('padverkenning ook', productFolderName(1, '../../etc'), '01 - .. .. etc'.replace(/\.\. \.\. /, '')  );
  check('windows-tekens ook', productFolderName(1, 'a:b*c?d"e<f>g|h'), '01 - a b c d e f g h');
  check('lange namen worden afgekapt', productFolderName(1, 'x'.repeat(200)).length <= 53, true);
  check('en een punt aan het eind blijft niet staan', /[.\s]$/.test(productFolderName(1, 'naam...')), false);
  check('drie cijfers boven de negenennegentig', productFolderName(100, 'x', 3), '100 - x');
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
