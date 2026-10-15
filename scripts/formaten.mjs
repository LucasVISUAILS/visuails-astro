/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * PNG EN WEBP LEVEREN — FORMATEN.bat → dit script
 * 12 oktober 2026 (K6, afvinklijst 4: k-lever = a, k-png = a)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   FORMATEN.bat                                     dubbelklikken (vraagt alles)
 *   node scripts/formaten.mjs VIS-XXXX-XXX <map>     kijken (droogloop)
 *   node scripts/formaten.mjs VIS-XXXX-XXX <map> --go   en doen
 *     --max-edge=4000   PNG en WebP verkleinen (alleen als de zip anders te groot wordt)
 *     --vervang         ook beelden die al PNG en WebP hebben opnieuw doen
 *     --local           tegen de lokale D1/R2 · --no-tag  zonder herkomsttag (proef)
 *
 * Lucas: *"Ik kan in magnific gewoon de PNG bestanden downloaden als het goed is.
 * Webp werkt niet altijd even goed en kan beter via het rauwe jpg of png bestand
 * via claude of een .bat. Wanneer formaten.bat veel makkelijker en sneller en geen
 * kwaliteitsverlies geeft is dat ook goed."*
 *
 * ── WAT LUCAS DOET ──────────────────────────────────────────────────────────
 *
 * Een klant vroeg in Studio "Ook als PNG" of "Ook als WebP" (src/lib/formaten.js,
 * /admin/formaten). Lucas downloadt in Magnific de PNG-originelen van die
 * bestelling, zet ze in één map, dubbelklikt FORMATEN.bat, typt het bestelnummer
 * en sleept de map in het venster. Hij ziet een tabel (welke PNG bij welk beeld)
 * en typt J.
 *
 * ── WAT DIT SCRIPT DOET ─────────────────────────────────────────────────────
 *
 *   1 · leest de levende leveringsbeelden van de bestelling uit D1 (de jpg's die
 *       Lucas in /admin leverde) en de PNG's in de map;
 *   2 · koppelt elke PNG aan één beeld, in deze rangorde (dezelfde als /admin):
 *         a  het pad uit de werkmap ("p1 - Jas/1 voorkant/…png"),
 *         b  dezelfde naam als de jpg die in /admin geleverd is ("magnific_x.jpg"
 *            ↔ "magnific_x.png" — Magnific geeft beide downloads dezelfde naam),
 *         c  de gok uit de naam ("p3-achterkant.png"), guessProductShot();
 *   3 · maakt van elke PNG een WebP — UIT DE PNG, NOOIT uit de jpg (dat zou de
 *       jpg-compressie een tweede keer inpakken);
 *   4 · zet de herkomsttag in beide (scripts/lib/aitag.mjs, dezelfde LEVERTAG als
 *       de jpg uit /admin) en uploadt ze naar R2 onder delivery/<kenmerk>/;
 *   5 · schrijft per beeld drie rijen in `file_assets`: png en webp (nieuw) en
 *       jpg (de bestaande jpg uit /admin, zelfde object). Daarmee bouwt
 *       deliveryEntries() in src/lib/delivery.js de zip per product met de mappen
 *       JPG/, PNG/ en WEBP/, en de leesmij beschrijft dat vanzelf. Zonder die
 *       jpg-rij zou de zip alleen nog PNG en WebP bevatten: een beeld MET assets
 *       levert alleen zijn assets.
 *   6 · leest terug wat er nu in D1 staat, en zet het verzoek in /admin/formaten
 *       op Klaar — alleen als ELK beeld van de bestelling nu jpg, png en webp
 *       heeft. Mist er één, dan blijft het verzoek open en zegt het script welk
 *       beeld; dan klikt Lucas zelf op Klaar zodra het compleet is.
 *
 * Er gaat geen mail uit. In Studio staat na Klaar "PNG geleverd · <datum>", en
 * de zip die de klant downloadt, heeft de mappen meteen.
 *
 * ── WAAROM KLAAR DOOR HET SCRIPT, EN ALLEEN ALS ALLES ER IS ─────────────────
 *
 * "Klaar" is een bewering aan de klant (Studio zegt "geleverd"). Het script is de
 * enige die zeker weet of die klopt: het heeft net teruggelezen dat elk beeld de
 * drie formaten heeft. Een mens die daarna nog moet klikken, vergeet het of klikt
 * bij een halve levering. Dus: compleet en nagekeken → het script zet Klaar;
 * niet compleet → het script zet niets en zegt wat er mist.
 *
 * ── WEBP: KWALITEIT 90, NIET LOSSLESS — EN WAAROM ──────────────────────────
 *
 * Gemeten op drie beelden van de site als PNG van 2400 px: lossless WebP is
 * 55–60% van de PNG (1,5–2,5 MB), kwaliteit 90 is 10–12% (300–480 kB), vijf keer
 * kleiner. WebP is er voor één ding — "laadt snel op je eigen site" — en dan is
 * een bestand van 2 MB het verkeerde antwoord; wie geen enkel verlies wil, heeft
 * de PNG ernaast. smartSubsample: harde kleurranden (een logo op stof) lopen dan
 * minder uit, dezelfde reden als de 4:4:4-jpg in scripts/deliver.mjs.
 *
 * ── DE PNG ZELF ─────────────────────────────────────────────────────────────
 *
 * Zoals hij uit Magnific komt: niet opnieuw ingepakt, alleen de tag erin (op een
 * kopie; de map van Lucas blijft onaangeroerd). Alleen met --max-edge (of als het
 * script dat vraagt omdat de zip anders te groot wordt) wordt hij verkleind, en
 * dan nog steeds zonder compressieverlies.
 *
 * ── DE 2 GB-GRENS ───────────────────────────────────────────────────────────
 *
 * src/lib/zip.js schrijft geen ZIP64: hoogstens ZIP_MAX_BYTES (2 GB) en
 * ZIP_MAX_FILES per zip. PNG-originelen zijn groot. Dit script rekent vooraf uit
 * hoe groot de zip wordt en weigert als hij niet past (net als deliver.mjs), met
 * het voorstel om te verkleinen.
 *
 * Getest zonder Cloudflare: tests/formaten-script.test.mjs geeft een nep-D1
 * (SQLite met het echte schema) en een nep-R2 mee via `io`.
 */
import { readdir, stat, mkdir, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { parseScaffoldPath, isSourcePath, isRawPath } from '../src/lib/scaffold.js';
import { vakNaam } from '../src/data/levervakken.js';
import { ZIP_MAX_BYTES, ZIP_MAX_FILES } from '../src/lib/zip.js';

export const DB = 'visuails';
export const BUCKET = 'visuails-uploads';

/** WebP-instellingen; zie de kop. */
export const WEBP_OPTIES = Object.freeze({ quality: 90, effort: 6, smartSubsample: true });

/** Dezelfde vorm als REF_SHAPE (functions/api/order-status.js) en deliver.mjs. */
export const REF_VORM = /^VIS-[0-9A-Z-]{3,20}$/i;

/** Een schatting vóór het omzetten: een WebP op 90 is ±12% van de PNG; ruim. */
const WEBP_SCHATTING = 0.25;

const BEELD = /\.(jpe?g|png|webp)$/i;
const IS_JPG = /\.jpe?g$/i;

const mb = (n) => `${(n / (1024 * 1024)).toFixed(1)} MB`;

/** SQL-tekst veilig maken (enkele aanhalingstekens verdubbelen), zoals deliver.mjs. */
export function q(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Een gesleept pad schoonmaken: aanhalingstekens en spaties eromheen weg. */
export function schoonPad(raw) {
  return String(raw || '').trim().replace(/^["']+|["']+$/g, '').trim();
}

/** De naam zonder extensie, klein, voor het vergelijken. */
const stam = (naam) => String(naam || '').split(/[\\/]/).pop().replace(/\.[a-z0-9]+$/i, '').toLowerCase();

/**
 * De naam waaronder Lucas het beeld in /admin uploadde. De sleutel is
 * delivery/<ref>/<product>-<shot>-<uuid8>-<naam> (admin.js); deliver.mjs-sleutels
 * hebben geen losse naam meer en geven ''.
 */
export function origineleNaam(r2Key) {
  const m = /^delivery\/[^/]+\/(?:p\d{1,3}-[a-z0-9]+-)?[0-9a-f]{8}-(.+)$/i.exec(String(r2Key || ''));
  return m ? m[1] : '';
}

/** Een stukje voor in een R2-sleutel: alleen letters, cijfers en streepjes. */
const sleutelDeel = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'beeld';

/** Alle bestanden onder een map, met hun pad ten opzichte van die map. */
export async function leesMap(root) {
  const uit = [];
  async function loop(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === '__MACOSX') continue;
      const vol = path.join(dir, e.name);
      if (e.isDirectory()) { await loop(vol); continue; }
      if (!e.isFile()) continue;
      uit.push({ pad: vol, rel: path.relative(root, vol), naam: e.name, bytes: (await stat(vol)).size });
    }
  }
  await loop(root);
  return uit.sort((a, b) => a.rel.localeCompare(b.rel));
}

/**
 * Het plan, zonder iets te veranderen. Puur: geen database, geen R2.
 *
 * @param {object} a
 * @param {object} a.order      { id, ref, service, status, details_json, lang }
 * @param {object[]} a.levering levende leveringsbeelden { id, r2_key, filename, bytes, product_key, shot }
 * @param {object[]} a.assets   bestaande file_assets { file_id, format, r2_key, bytes }
 * @param {object[]} a.bronnen  uit leesMap()
 * @param {Function} a.gok      guessProductShot(naam) → { product, shot }
 * @param {Map}     [a.maten]   pad → { breed, hoog } (voor --max-edge)
 * @param {number}  [a.maxEdge] lange zijde, 0 = niet verkleinen
 * @param {boolean} [a.vervang] ook beelden die al PNG en WebP hebben opnieuw doen
 */
export function maakPlan({ order, levering, assets = [], bronnen, gok, maten = new Map(), maxEdge = 0, vervang = false }) {
  const fouten = [];
  const meldingen = [];
  if (['video', 'test-sample'].includes(String(order.service || ''))) {
    fouten.push(`Bij deze dienst (${order.service}) bestaan geen andere formaten.`);
  }
  if (order.status !== 'delivered') {
    meldingen.push('De bestelling staat nog niet op geleverd. De mappen komen in de zip, maar de klant ziet ze pas als je de levering in /admin meldt.');
  }
  const beelden = levering.filter((f) => BEELD.test(f.r2_key || f.filename || '') && f.product_key && f.shot);
  const assetsVan = new Map();
  for (const a of assets) {
    if (!assetsVan.has(a.file_id)) assetsVan.set(a.file_id, new Map());
    assetsVan.get(a.file_id).set(a.format, a);
  }
  const label = (f) => `${f.product_key} ${(vakNaam(order.service, order.details_json, f.shot, 'nl') || f.shot).toLowerCase()}`;
  const opNaam = new Map();
  for (const f of beelden) {
    for (const n of [origineleNaam(f.r2_key), f.filename]) {
      const s = stam(n);
      if (s && !opNaam.has(s)) opNaam.set(s, f);
    }
  }

  const overgeslagen = [];
  const koppel = new Map(); // file id → [{ bron, hoe }]
  const los = [];
  for (const b of bronnen) {
    if (isSourcePath(b.rel) || isRawPath(b.rel)) { overgeslagen.push(`${b.rel} (bronmateriaal of ruw beeld)`); continue; }
    if (!/\.png$/i.test(b.naam)) {
      if (BEELD.test(b.naam)) overgeslagen.push(`${b.rel} (geen PNG — een WebP maken we alleen uit de PNG, nooit uit de jpg)`);
      continue;
    }
    let doel = null; let hoe = '';
    const pad = parseScaffoldPath(b.rel);
    if (pad.product && pad.shot) {
      doel = beelden.find((f) => f.product_key === pad.product && f.shot === pad.shot) || null;
      if (doel) hoe = 'werkmap';
    }
    if (!doel && opNaam.has(stam(b.naam))) { doel = opNaam.get(stam(b.naam)); hoe = 'naam als de jpg'; }
    if (!doel && typeof gok === 'function') {
      const g = gok(b.naam) || {};
      if (g.product && g.shot) {
        doel = beelden.find((f) => f.product_key === g.product && f.shot === g.shot) || null;
        if (doel) hoe = 'gok uit de naam';
      }
    }
    if (!doel) { los.push(b); continue; }
    if (!koppel.has(doel.id)) koppel.set(doel.id, []);
    koppel.get(doel.id).push({ bron: b, hoe });
  }

  const stappen = [];
  const alKlaar = [];
  for (const f of beelden) {
    const k = koppel.get(f.id);
    if (!k) continue;
    /* Een tweede ronde (de ontbrekende PNG's erbij) doet niet alles opnieuw:
       een beeld dat al PNG en WebP heeft, slaat hij over, tenzij `vervang`. */
    const al = assetsVan.get(f.id);
    if (!vervang && al && al.has('png') && al.has('webp')) { alKlaar.push(f); continue; }
    if (k.length > 1) {
      fouten.push(`Twee PNG's voor ${label(f)}: ${k.map((x) => x.bron.rel).join(' en ')}. Haal er één uit de map.`);
      continue;
    }
    const heeft = assetsVan.get(f.id) || new Map();
    const jpg = heeft.get('jpg') || null;
    if (!jpg && !IS_JPG.test(f.r2_key || '')) {
      meldingen.push(`${label(f)} is in /admin niet als jpg geleverd (${origineleNaam(f.r2_key) || f.filename}). Lever eerst de jpg; dit beeld slaan we over.`);
      continue;
    }
    const { bron, hoe } = k[0];
    const maat = maten.get(bron.pad);
    const schaal = maxEdge && maat && Math.max(maat.breed, maat.hoog) > maxEdge ? maxEdge / Math.max(maat.breed, maat.hoog) : 1;
    stappen.push({
      file: f,
      label: label(f),
      bron,
      hoe,
      jpg: jpg ? null : { r2_key: f.r2_key, bytes: Number(f.bytes) || 0 },
      jpgBytes: jpg ? Number(jpg.bytes) || 0 : Number(f.bytes) || 0,
      vervangt: ['png', 'webp'].map((fm) => heeft.get(fm)).filter(Boolean).map((a) => a.r2_key).filter((key) => key !== f.r2_key),
      pngSchatting: Math.round(bron.bytes * schaal * schaal),
      webpSchatting: Math.round(bron.bytes * schaal * schaal * WEBP_SCHATTING),
    });
  }
  const zonderPng = beelden.filter((f) => !stappen.some((s) => s.file.id === f.id)
    && !['png', 'webp'].every((fm) => (assetsVan.get(f.id) || new Map()).has(fm)));
  for (const b of los) meldingen.push(`${b.rel}: bij geen enkel beeld van deze bestelling te plaatsen. Zet hem in de werkmap (p1 - …/1 voorkant/) of geef hem dezelfde naam als de jpg.`);

  /* Hoe groot de zip straks is: per beeld wat het na deze ronde heeft. */
  let zipBytes = 0;
  let zipBestanden = 0;
  for (const f of levering) {
    const s = stappen.find((x) => x.file.id === f.id);
    const heeft = assetsVan.get(f.id);
    if (s) { zipBytes += s.jpgBytes + s.pngSchatting + s.webpSchatting; zipBestanden += 3; }
    else if (heeft && heeft.size) { for (const a of heeft.values()) { zipBytes += Number(a.bytes) || 0; zipBestanden += 1; } }
    else { zipBytes += Number(f.bytes) || 0; zipBestanden += 1; }
  }
  const pastNiet = zipBytes > ZIP_MAX_BYTES || zipBestanden > ZIP_MAX_FILES;
  return { stappen, alKlaar, zonderPng, overgeslagen, meldingen, fouten, zipBytes, zipBestanden, pastNiet, beelden };
}

/** De tabel en de meldingen, zoals Lucas ze leest. */
export function planTekst(order, plan) {
  const r = [];
  r.push(`${order.ref} · ${plan.beelden.length} ${plan.beelden.length === 1 ? 'beeld' : 'beelden'} geleverd · status ${order.status}`);
  r.push('');
  if (plan.stappen.length) {
    r.push(`  ${'beeld'.padEnd(24)}${'PNG uit je map'.padEnd(44)}hoe gevonden`);
    r.push(`  ${'-'.repeat(24)}${'-'.repeat(44)}${'-'.repeat(16)}`);
    for (const s of plan.stappen) r.push(`  ${s.label.slice(0, 23).padEnd(24)}${s.bron.rel.slice(0, 43).padEnd(44)}${s.hoe}${s.vervangt.length ? ' (vervangt de vorige)' : ''}`);
  } else if (!plan.alKlaar.length) {
    r.push('  Geen enkele PNG te koppelen aan een beeld van deze bestelling.');
  }
  if (plan.alKlaar.length) {
    r.push('');
    r.push(`  Al klaar (PNG en WebP staan er al, de PNG in je map wordt overgeslagen): ${plan.alKlaar.map((f) => `${f.product_key} ${(vakNaam(order.service, order.details_json, f.shot, 'nl') || f.shot).toLowerCase()}`).join(', ')}`);
  }
  if (plan.zonderPng.length) {
    r.push('');
    r.push('  Nog zonder PNG (dan blijft het verzoek in /admin/formaten open):');
    for (const f of plan.zonderPng) r.push(`    ${f.product_key} ${(vakNaam(order.service, order.details_json, f.shot, 'nl') || f.shot).toLowerCase()}`);
  }
  if (plan.overgeslagen.length) {
    r.push('');
    r.push('  Overgeslagen:');
    for (const o of plan.overgeslagen) r.push(`    ${o}`);
  }
  for (const m of plan.meldingen) { r.push(''); r.push(`  LET OP: ${m}`); }
  for (const f of plan.fouten) { r.push(''); r.push(`  FOUT: ${f}`); }
  r.push('');
  r.push(`  De zip wordt ongeveer ${mb(plan.zipBytes)} in ${plan.zipBestanden} bestanden (grens ${mb(ZIP_MAX_BYTES)}, ${ZIP_MAX_FILES} bestanden).`);
  if (plan.pastNiet) r.push('  DAT PAST NIET IN ÉÉN ZIP: zip.js schrijft geen ZIP64. Verklein de beelden (FORMATEN.bat stelt dat voor) of lever in twee bestellingen.');
  return r.join('\n');
}

/** Eén WebP uit één PNG; met maxEdge ook een verkleinde PNG. */
export async function zetOm(bron, uitStam, { maxEdge = 0 } = {}) {
  const png = `${uitStam}.png`;
  const webp = `${uitStam}.webp`;
  const basis = sharp(bron, { failOn: 'error' });
  const meta = await basis.metadata();
  if (meta.format !== 'png') throw new Error(`${path.basename(bron)} is geen echte PNG (${meta.format || 'onbekend'})`);
  const groot = maxEdge && Math.max(meta.width || 0, meta.height || 0) > maxEdge;
  const verklein = (p) => (groot ? p.resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true }) : p);
  if (groot) await verklein(basis.clone()).png({ compressionLevel: 9, effort: 10 }).toFile(png);
  else await copyFile(bron, png);   // zoals hij uit Magnific kwam
  await verklein(basis.clone()).webp(WEBP_OPTIES).toFile(webp);
  return { png, webp };
}

/**
 * Doen. `io` is wat er met de buitenwereld praat:
 *   query(sql) → rijen · exec(statements[]) · put(key, bestand, type) · del(key) · tag(bestand)
 * @returns {Promise<{ klaar: boolean, gezet: number, mist: string[], tekst: string }>}
 */
export async function voerUit(order, plan, io, { maxEdge = 0, werkmap = null, log = () => {} } = {}) {
  if (plan.fouten.length) throw new Error(plan.fouten.join(' '));
  if (plan.pastNiet) throw new Error('De zip past niet onder de 2 GB.');
  if (!plan.stappen.length) throw new Error('Niets te doen: geen enkele PNG gekoppeld.');
  const werk = werkmap || path.join(tmpdir(), `visuails-formaten-${order.ref}-${randomUUID().slice(0, 8)}`);
  await mkdir(werk, { recursive: true });
  const statements = [];
  const opruimen = [];
  try {
    let n = 0;
    for (const s of plan.stappen) {
      const kort = randomUUID().slice(0, 8);
      const deel = `${s.file.product_key}-${s.file.shot}-${kort}-${sleutelDeel(stam(s.bron.naam))}`;
      const uit = await zetOm(s.bron.pad, path.join(werk, deel), { maxEdge });
      await io.tag(uit.png);
      await io.tag(uit.webp);
      const keys = { png: `delivery/${order.ref}/${deel}.png`, webp: `delivery/${order.ref}/${deel}.webp` };
      const bytes = { png: (await stat(uit.png)).size, webp: (await stat(uit.webp)).size };
      await io.put(keys.png, uit.png, 'image/png');
      await io.put(keys.webp, uit.webp, 'image/webp');
      for (const fm of ['png', 'webp']) {
        statements.push(`INSERT OR REPLACE INTO file_assets (file_id, format, r2_key, bytes) VALUES (${Number(s.file.id)}, ${q(fm)}, ${q(keys[fm])}, ${bytes[fm]});`);
      }
      if (s.jpg) {
        statements.push(`INSERT OR IGNORE INTO file_assets (file_id, format, r2_key, bytes) VALUES (${Number(s.file.id)}, 'jpg', ${q(s.jpg.r2_key)}, ${Number(s.jpg.bytes) || 0});`);
      }
      opruimen.push(...s.vervangt);
      n += 1;
      log(`  ${n}/${plan.stappen.length} ${s.label}: PNG ${mb(bytes.png)}, WebP ${mb(bytes.webp)}`);
    }
    await io.exec(statements);
  } finally {
    if (!werkmap) await rm(werk, { recursive: true, force: true });
  }
  /* De vorige PNG/WebP van een beeld dat nu een nieuwe kreeg: de rij is
     vervangen, dus ruimt niets het object meer op als wij het niet doen. */
  for (const key of opruimen) { try { await io.del(key); } catch { /* blijft liggen; geen ramp */ } }

  /* NAKIJKEN, niet aannemen: wat staat er nu per levend beeld? */
  const rijen = await io.query(
    `SELECT f.id, f.product_key, f.shot,
            (SELECT COUNT(*) FROM file_assets a WHERE a.file_id = f.id AND a.format = 'jpg') AS jpg,
            (SELECT COUNT(*) FROM file_assets a WHERE a.file_id = f.id AND a.format = 'png') AS png,
            (SELECT COUNT(*) FROM file_assets a WHERE a.file_id = f.id AND a.format = 'webp') AS webp
       FROM files f
      WHERE f.order_id = ${Number(order.id)} AND f.kind = 'delivery' AND f.superseded_at IS NULL
        AND f.product_key IS NOT NULL AND f.shot IS NOT NULL`
  );
  const beeldIds = new Set(plan.beelden.map((f) => f.id));
  const mist = rijen
    .filter((r) => beeldIds.has(r.id) && !(Number(r.jpg) && Number(r.png) && Number(r.webp)))
    .map((r) => `${r.product_key} ${(vakNaam(order.service, order.details_json, r.shot, 'nl') || r.shot).toLowerCase()}`);
  let klaar = false;
  let gezet = 0;
  if (!mist.length && rijen.length) {
    try {
      const open = await io.query(`SELECT COUNT(*) AS n FROM formaat_verzoeken WHERE order_id = ${Number(order.id)} AND klaar_at IS NULL`);
      gezet = Number(open[0]?.n) || 0;
      if (gezet) await io.exec([`UPDATE formaat_verzoeken SET klaar_at = datetime('now') WHERE order_id = ${Number(order.id)} AND klaar_at IS NULL;`]);
      klaar = true;
    } catch {
      klaar = true; gezet = 0; // migratie 0065 nog niet: de zip is wel compleet
    }
  }
  const tekst = klaar
    ? `${order.ref} is klaar: elk beeld heeft nu JPG, PNG en WebP in de zip.${gezet ? ` Het verzoek in /admin/formaten staat op Klaar (${gezet === 1 ? 'één formaat' : `${gezet} formaten`}); in Studio staat nu "geleverd". Mail de klant met één klik in /admin/formaten ("Klant mailen").` : ' Er stond geen open verzoek in /admin/formaten.'}`
    : `${order.ref} is nog NIET compleet. Zonder PNG/WebP: ${mist.join(', ')}. Het verzoek in /admin/formaten blijft open; draai FORMATEN.bat nog eens met de ontbrekende PNG's, of klik daar zelf op Klaar als dit zo goed is.`;
  return { klaar, gezet, mist, tekst };
}

/* ── DE ECHTE BUITENWERELD: wrangler ───────────────────────────────────────── */

async function wranglerIo({ local = false, noTag = false } = {}) {
  const { wrangler, warmLogin } = await import('./lib/wrangler.mjs');
  const scope = local ? '--local' : '--remote';
  await warmLogin();
  const query = async (sql) => {
    const r = await wrangler(['d1', 'execute', DB, scope, '--json', '--command', sql]);
    if (!r.ok) throw new Error(`D1 gaf een fout op:\n${r.out.trim()}`);
    const start = r.stdout.indexOf('[');
    if (start < 0) return [];
    return JSON.parse(r.stdout.slice(start))?.[0]?.results || [];
  };
  const exec = async (statements) => {
    const { writeFile } = await import('node:fs/promises');
    const file = path.join(tmpdir(), `visuails-formaten-${randomUUID().slice(0, 8)}.sql`);
    await writeFile(file, `${statements.join('\n')}\n`, 'utf8');
    try {
      const r = await wrangler(['d1', 'execute', DB, scope, '--file', file, '-y']);
      if (!r.ok) throw new Error(`D1 weigerde het schrijfbestand:\n${r.out.trim()}`);
    } finally { await rm(file, { force: true }); }
  };
  const put = async (key, file, type) => {
    const r = await wrangler(['r2', 'object', 'put', `${BUCKET}/${key}`, '--file', file, '--content-type', type, scope]);
    if (!r.ok) throw new Error(`upload van ${key} mislukte:\n${r.out.trim()}`);
  };
  const del = async (key) => { await wrangler(['r2', 'object', 'delete', `${BUCKET}/${key}`, scope]); };
  let tag = async () => {};
  let sluit = async () => {};
  if (!noTag) {
    const { writeSourceType, closeExif, LEVERTAG } = await import('./lib/aitag.mjs');
    tag = (file) => writeSourceType(file, LEVERTAG);
    sluit = closeExif;
  }
  return { query, exec, put, del, tag, sluit };
}

/** De bestelling, de levering en de assets, via io.query. */
export async function laadBestelling(io, ref) {
  const orders = await io.query(`SELECT id, ref, service, status, lang, details_json FROM orders WHERE ref = ${q(ref)}`);
  if (!orders.length) return null;
  const order = orders[0];
  const levering = await io.query(
    `SELECT id, r2_key, filename, bytes, product_key, shot FROM files
      WHERE order_id = ${Number(order.id)} AND kind = 'delivery' AND superseded_at IS NULL ORDER BY id`
  );
  let assets = [];
  try {
    assets = await io.query(
      `SELECT a.file_id, a.format, a.r2_key, a.bytes FROM file_assets a JOIN files f ON f.id = a.file_id
        WHERE f.order_id = ${Number(order.id)} AND f.superseded_at IS NULL`
    );
  } catch { assets = []; }
  return { order, levering, assets };
}

/** Breedte en hoogte van elke PNG, voor de schatting bij --max-edge. */
export async function meetMaten(bronnen) {
  const m = new Map();
  for (const b of bronnen) {
    if (!/\.png$/i.test(b.naam)) continue;
    try { const x = await sharp(b.pad).metadata(); m.set(b.pad, { breed: x.width || 0, hoog: x.height || 0 }); } catch { /* telt niet mee */ }
  }
  return m;
}

/* ── DE OPDRACHTREGEL ──────────────────────────────────────────────────────── */

async function main() {
  const argv = process.argv.slice(2);
  const vlag = (n) => argv.includes(n);
  const maxVlag = argv.find((a) => a.startsWith('--max-edge='));
  let maxEdge = maxVlag ? Number(maxVlag.split('=')[1]) || 0 : 0;
  const vraag = vlag('--vraag');
  const local = vlag('--local');
  let go = vlag('--go');
  let vervang = vlag('--vervang');
  let [ref, map] = argv.filter((a) => !a.startsWith('--'));

  /* Een vraag in het venster. Eén regel per antwoord; is de invoer dicht (een
     gesloten venster, een pijp), dan is het antwoord leeg — nooit een vraag die
     blijft hangen of een stil einde met "gelukt". */
  let rl = null;
  const regels = [];
  const wachters = [];
  let dicht = false;
  const stel = async (tekst) => {
    if (!rl) {
      const { createInterface } = await import('node:readline');
      rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
      rl.on('line', (r) => { const w = wachters.shift(); if (w) w(r); else regels.push(r); });
      rl.on('close', () => { dicht = true; while (wachters.length) wachters.shift()(''); });
    }
    process.stdout.write(tekst);
    if (regels.length) return String(regels.shift()).trim();
    if (dicht) return '';
    return String(await new Promise((res) => wachters.push(res))).trim();
  };
  try {
    if (vraag) {
      console.log('Zet de PNG-originelen van één bestelling (uit Magnific) samen in een map.\n');
      ref = await stel('  Bestelnummer (VIS-...): ');
      map = schoonPad(await stel('  De map met de PNG\'s (sleep hem hierheen en druk op Enter): '));
      console.log('');
    }
    if (!vraag && !ref) {
      console.log('Gebruik: FORMATEN.bat (dubbelklikken), of\n  node scripts/formaten.mjs VIS-XXXX-XXX <map met PNG\'s> [--go] [--vervang] [--max-edge=4000] [--local] [--no-tag]');
      return 1;
    }
    ref = String(ref || '').trim().toUpperCase();
    if (!REF_VORM.test(ref)) { console.error(`"${ref}" ziet niet uit als een bestelnummer (VIS-XXXX-XXX).`); return 1; }
    map = schoonPad(map);
    if (!map) { console.error('Geef de map met de PNG\'s mee.'); return 1; }
    const root = path.resolve(map);
    let bronnen;
    try { bronnen = await leesMap(root); } catch (e) { console.error(`Kan de map niet lezen: ${root} — ${e.message}`); return 1; }

    const io = await wranglerIo({ local, noTag: vlag('--no-tag') });
    try {
      const geladen = await laadBestelling(io, ref);
      if (!geladen) { console.error(`Geen bestelling ${ref}${local ? ' in de LOKALE database' : ''}.`); return 1; }
      const { order, levering, assets } = geladen;
      const { guessProductShot } = await import('../src/lib/admin.js');
      const maten = await meetMaten(bronnen);
      let plan = maakPlan({ order, levering, assets, bronnen, gok: guessProductShot, maten, maxEdge, vervang });
      console.log(planTekst(order, plan));
      if (vraag && plan.alKlaar.length && !vervang) {
        vervang = /^j/i.test(await stel(`\n  ${plan.alKlaar.length === 1 ? 'Eén beeld heeft' : `${plan.alKlaar.length} beelden hebben`} al PNG en WebP. Toch opnieuw doen met de PNG uit je map? Typ J (alleen Enter = overslaan): `));
        if (vervang) {
          plan = maakPlan({ order, levering, assets, bronnen, gok: guessProductShot, maten, maxEdge, vervang });
          console.log(`\n${planTekst(order, plan)}`);
        }
      }
      if (plan.pastNiet && vraag && !maxEdge) {
        const ja = /^j/i.test(await stel('\n  Verkleinen tot 4000 px aan de lange zijde (nog steeds zonder compressieverlies)? Typ J en Enter: '));
        if (!ja) { console.log('\n  Niets gedaan.'); return 2; }
        maxEdge = 4000;
        plan = maakPlan({ order, levering, assets, bronnen, gok: guessProductShot, maten, maxEdge, vervang });
        console.log(`\n${planTekst(order, plan)}`);
      }
      if (plan.fouten.length || plan.pastNiet) { console.error('\n  Gestopt: zie hierboven. Er is niets veranderd.'); return 1; }
      if (!plan.stappen.length) { console.log(`\n  Niets te doen. Er is niets veranderd.${plan.alKlaar.length && !plan.zonderPng.length ? ' Elk beeld heeft al PNG en WebP.' : ''}`); return 2; }
      if (vraag) go = /^j/i.test(await stel('\n  Klopt dit? Typ J en Enter om te leveren (alleen Enter = stoppen): '));
      if (!go) {
        console.log(vraag ? '\n  Niets gedaan.' : `\n  Droogloop: er is niets omgezet, geüpload of opgeslagen. Klopt het, dan:\n    node scripts/formaten.mjs ${ref} "${map}"${maxEdge ? ` --max-edge=${maxEdge}` : ''}${vervang ? ' --vervang' : ''} --go`);
        return vraag ? 2 : 0;
      }
      console.log('\nOmzetten en uploaden…');
      const uit = await voerUit(order, plan, io, { maxEdge, log: (r) => console.log(r) });
      console.log(`\n${uit.tekst}`);
      return 0;
    } finally {
      await io.sluit();
    }
  } catch (e) {
    console.error(`\n  FOUT: ${e && e.message ? e.message : e}`);
    return 1;
  } finally {
    if (rl) rl.close();
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().then((code) => process.exit(code), (e) => { console.error(e); process.exit(1); });
}

