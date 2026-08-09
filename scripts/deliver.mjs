/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * ÉÉN COMMANDO PER BESTELLING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run deliver -- VIS-2608-4471 ./klaar            eerst kijken (droogloop)
 *   npm run deliver -- VIS-2608-4471 ./klaar --go       en dan doen
 *
 * ── WAT DIT VERVANGT ────────────────────────────────────────────────────────
 *
 * Lucas, 9 augustus 2026: *"Ik ben benieuwd of er een manier is om dit sneller te
 * maken voor mijzelf vooral."*
 *
 * Tot vandaag ging een levering zo: per product en per shot een slot openen in het
 * adminportaal, één bestand kiezen, uploaden, wachten, volgende. Bij dertig
 * producten met vier beelden is dat honderdtwintig keer dat rondje. En daarna moest
 * er nog per bestand een png, een jpg en een webp gemaakt worden, en op elk van die
 * driehonderdzestig bestanden de herkomsttag.
 *
 * Dit script doet dat rondje één keer, voor de hele map:
 *
 *   1 · leest je afgewerkte map en leidt uit elke bestandsnaam af bij welk product
 *       en welke shot het beeld hoort (dezelfde gokfunctie als admin gebruikt, dus
 *       dezelfde uitkomst als wanneer je het met de hand had gedaan)
 *   2 · maakt per beeld een png, een jpg en een webp — en een BEOORDEELBEELD van
 *       1400px voor het scherm
 *   3 · zet de IPTC-herkomsttag in de drie leverbestanden, ná de omzetting (zie
 *       scripts/lib/aitag.mjs)
 *   4 · uploadt alles naar R2
 *   5 · schrijft de rijen in D1: één rij per beeld in `files`, drie in `file_assets`
 *   6 · markeert wat vervangen is, precies zoals admin dat doet na een revisie
 *
 * ── DROOGLOOP IS DE STANDAARD, EN DAT IS EEN BESLUIT ────────────────────────
 *
 * Zonder `--go` gebeurt er niets: je krijgt alleen de tabel met wat het denkt.
 * Want de enige echt gevaarlijke stap in dit hele script is stap 1. Een verkeerd
 * geraden product betekent dat de klant de rug van artikel 4 als de voorkant van
 * artikel 7 in zijn map krijgt, en dat is niet iets wat je terugdraait met een
 * vinkje — het is een levering die opnieuw moet.
 *
 * Twintig seconden naar een tabel kijken is het goedkoopste dat er is, en het is
 * ook het enige moment waarop JIJ die fout nog kunt zien. Vandaar deze kant op en
 * niet `--dry-run` als optie: wie haast heeft, typt drie letters extra.
 *
 * ── DE 2 GB-GRENS IS ECHT, EN HIJ WORDT HIER GEHANDHAAFD ───────────────────
 *
 * src/lib/zip.js schrijft geen ZIP64, dus is 2 GB de bovengrens van een archief
 * (ZIP_MAX_BYTES). Met png's erin is dat sneller bereikt dan je denkt: dertig
 * producten × vier beelden × (png 30 MB + jpg 5 MB + webp 4 MB) is bijna 5 GB.
 *
 * Dan geeft /account/orders/<id>/zip een 413 en heeft de klant geen levering. Dus
 * rekent dit script het vooruit en WEIGERT te leveren als het er niet in past. Dat
 * is de goede plek om te falen: in mijn terminal, met een lange zijde die ik kan
 * bijstellen (`--max-edge`), in plaats van in de browser van de klant.
 *
 * ── WAT DIT SCRIPT NIET DOET ───────────────────────────────────────────────
 *
 * Niets aankondigen. Er gaat geen mail uit, geen status verandert. Uploaden en
 * "de klant laten weten" zijn twee besluiten, en dat tweede hoort in admin te
 * blijven waar je de bestelling erbij ziet.
 */
import { readdir, stat, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { wrangler, warmLogin, assertSafeArg } from './lib/wrangler.mjs';
import { COMPOSITE, FULLY, writeSourceType, closeExif } from './lib/aitag.mjs';

const DB = 'visuails';
const BUCKET = 'visuails-uploads';

/* ── de gok op product en shot ─────────────────────────────────────────────────
   NIET NAGEBOUWD MAAR GEÏMPORTEERD uit src/lib/admin.js. Dat is de functie die het
   adminportaal gebruikt bij een handmatige upload, en als dit script anders zou
   gokken dan dat scherm, dan hangt de indeling van een levering af van hoe je hem
   deed. Precies wat een levering niet mag zijn. */
const { guessProductShot } = await import('../src/lib/admin.js');

/* De volgorde en de namen komen uit src/lib/delivery.js, want dat bestand bepaalt
   hoe de map straks heet. Twee lijsten met shotnamen is een map waarin 'voorkant'
   en 'front' door elkaar staan. */
const { SHOT_ORDER, SHOT_NAME, FORMAT_DIR } = await import('../src/lib/delivery.js');

const ZIP_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const ZIP_MAX_FILES = 4096;

/** De lange zijde van het beoordeelbeeld. Zie migratie 0022 voor het waarom. */
const REVIEW_EDGE = 1400;

const SOURCE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.avif']);

// ─────────────────────────────────────────────────────────────────────────────
// ARGUMENTEN
// ─────────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith('--'));
const positional = argv.filter((a) => !a.startsWith('--'));

const GO = flags.includes('--go');
const LOCAL = flags.includes('--local');
const FULLY_AI = flags.includes('--fully');
const NO_TAG = flags.includes('--no-tag');
const KEEP = flags.includes('--keep');
const maxEdgeFlag = flags.find((f) => f.startsWith('--max-edge='));
const MAX_EDGE = maxEdgeFlag ? Number(maxEdgeFlag.split('=')[1]) : 0;

const [ref, folder] = positional;

if (!ref || !folder) {
  console.error(`
Gebruik:  npm run deliver -- <referentie> <map> [opties]

  npm run deliver -- VIS-2608-4471 ./klaar          kijken wat het denkt
  npm run deliver -- VIS-2608-4471 ./klaar --go     en dan echt leveren

Opties:
  --go              daadwerkelijk omzetten, uploaden en wegschrijven
  --max-edge=3000   de lange zijde van de LEVERBESTANDEN begrenzen. Zonder dit
                    blijft de volle resolutie staan, en dan kan het archief over
                    de 2 GB gaan die zip.js aankan.
  --fully           herkomsttag "volledig door een model gemaakt" in plaats van
                    "deels" — alleen als er geen echte foto in zit
  --no-tag          de herkomsttag overslaan (voor een testronde)
  --local           tegen de lokale D1 in plaats van --remote
  --keep            de omgezette bestanden laten staan, zodat je ze kunt bekijken

Bestandsnamen: het product en de shot worden uit de naam gelezen. Werkt op
"VOLT_p3_achterkant.png", "volt 03 front.jpg", "12-detail.webp". Wat niet te
lezen is, wordt gemeld en niet geraden.
`);
  process.exit(1);
}

assertSafeArg(ref, 'referentie');
if (!/^VIS-\d{4}-\d{4}$/.test(ref)) {
  console.error(`"${ref}" ziet niet uit als een referentie (VIS-2608-4471).`);
  process.exit(1);
}

const scope = LOCAL ? '--local' : '--remote';
const AI_VALUE = FULLY_AI ? FULLY : COMPOSITE;

// ─────────────────────────────────────────────────────────────────────────────
// KLEINE HULPJES
// ─────────────────────────────────────────────────────────────────────────────

const mb = (n) => `${(n / (1024 * 1024)).toFixed(1)} MB`;

/** SQL-tekst veilig maken. Enkele aanhalingstekens verdubbelen, en niets anders. */
function q(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Een query met een antwoord.
 *
 * `--json` en dan de laatste JSON in de uitvoer pakken: wrangler zet er soms een
 * regel voor (een update-melding, een waarschuwing), en JSON.parse over de hele
 * uitvoer valt daar dan over. Zelfde truc als fetch-order.mjs.
 */
async function query(sql) {
  const r = await wrangler(['d1', 'execute', DB, scope, '--json', '--command', sql]);
  if (!r.ok) throw new Error(`D1 gaf een fout op:\n  ${sql}\n${r.out.trim()}`);
  const start = r.stdout.indexOf('[');
  if (start < 0) return [];
  try {
    const parsed = JSON.parse(r.stdout.slice(start));
    return parsed?.[0]?.results || [];
  } catch {
    throw new Error(`D1 gaf iets terug dat geen JSON is:\n${r.stdout.slice(0, 400)}`);
  }
}

/** Meerdere statements: via een bestand, want --command wil er één. */
async function execFileSql(statements) {
  const file = path.join(tmpdir(), `visuails-deliver-${randomUUID().slice(0, 8)}.sql`);
  await writeFile(file, `${statements.join('\n')}\n`, 'utf8');
  try {
    const r = await wrangler(['d1', 'execute', DB, scope, '--file', file, '-y']);
    if (!r.ok) throw new Error(`D1 weigerde het schrijfbestand:\n${r.out.trim()}`);
  } finally {
    if (!KEEP) await rm(file, { force: true });
    else console.log(`  sql bewaard: ${file}`);
  }
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    // Verborgen mappen en __MACOSX overslaan: daar zitten geen leverbestanden in,
    // wel resource-forks die eruitzien als een foto van 4 KB.
    if (entry.name.startsWith('.') || entry.name === '__MACOSX') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (SOURCE_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out.sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · DE BESTELLING
// ─────────────────────────────────────────────────────────────────────────────

await warmLogin();   // zie de noot in scripts/lib/wrangler.mjs over 7403

const orders = await query(
  `SELECT id, ref, lang, product_count, status FROM orders WHERE ref = ${q(ref)}`
);
if (!orders.length) {
  console.error(`Geen bestelling met referentie ${ref}${LOCAL ? ' in de LOKALE database' : ''}.`);
  process.exit(1);
}
const order = orders[0];
const lang = order.lang === 'en' ? 'en' : 'nl';
const shotNames = SHOT_NAME[lang];

// ─────────────────────────────────────────────────────────────────────────────
// 2 · DE MAP LEZEN EN DE GOK DOEN
// ─────────────────────────────────────────────────────────────────────────────

const root = path.resolve(folder);
let sources;
try {
  sources = await walk(root);
} catch (err) {
  console.error(`Kan ${root} niet lezen — ${err.message}`);
  process.exit(1);
}
if (!sources.length) {
  console.error(`Geen png/jpg/webp/tiff gevonden onder ${root}.`);
  process.exit(1);
}

const plan = [];
for (const file of sources) {
  const base = path.basename(file);
  const guess = guessProductShot(base);
  const size = (await stat(file)).size;
  plan.push({
    file,
    base,
    product: guess.product,
    shot: guess.shot,
    sourceBytes: size,
  });
}

// Sorteren zoals de map er straks uitziet, zodat de tabel hieronder in dezelfde
// orde staat als wat de klant ziet.
const productNo = (p) => {
  const n = Number(String(p || '').replace(/^p/i, ''));
  return Number.isFinite(n) && n > 0 ? n : Infinity;
};
plan.sort((a, b) => {
  const d = productNo(a.product) - productNo(b.product);
  if (d) return d;
  const sa = SHOT_ORDER.indexOf(a.shot);
  const sb = SHOT_ORDER.indexOf(b.shot);
  return (sa < 0 ? 9 : sa) - (sb < 0 ? 9 : sb);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 · DE TABEL, EN WAT ERAAN MANKEERT
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${order.ref} · ${order.product_count || '?'} producten · status ${order.status}`);
console.log(`${plan.length} bestanden onder ${root}\n`);

const pad = (s, n) => String(s).padEnd(n);
console.log(`  ${pad('bestand', 38)}${pad('product', 10)}${pad('shot', 12)}wordt in de map`);
console.log(`  ${'-'.repeat(38)}${'-'.repeat(10)}${'-'.repeat(12)}${'-'.repeat(34)}`);

const unresolved = [];
for (const p of plan) {
  const ok = p.product && p.shot;
  if (!ok) unresolved.push(p);
  const dir = p.product ? `product-${productNo(p.product)}` : '?';
  const name = p.shot ? shotNames[p.shot] : '?';
  const target = ok ? `${dir}/PNG/${name}.png  (+jpg, +webp)` : '— niet te plaatsen —';
  console.log(`  ${pad(p.base.slice(0, 37), 38)}${pad(p.product || '—', 10)}${pad(p.shot || '—', 12)}${target}`);
}

/* ── WAT ER MIST, PER PRODUCT ────────────────────────────────────────────────
   Dit is het overzicht dat een halve levering tegenhoudt. Zonder deze regels merk
   je pas dat product 7 geen achterkant heeft op het moment dat de klant het meldt,
   en dan is de map al bij hem. */
const byProduct = new Map();
for (const p of plan) {
  if (!p.product || !p.shot) continue;
  const n = productNo(p.product);
  if (!byProduct.has(n)) byProduct.set(n, new Set());
  byProduct.get(n).add(p.shot);
}
const expectedCount = Number(order.product_count) || byProduct.size;
const gaps = [];
for (let n = 1; n <= expectedCount; n++) {
  const have = byProduct.get(n);
  if (!have) { gaps.push([n, 'niets']); continue; }
  const missing = SHOT_ORDER.filter((s) => !have.has(s));
  if (missing.length) gaps.push([n, missing.map((s) => shotNames[s]).join(', ')]);
}

if (unresolved.length) {
  console.log(`\n  ${unresolved.length} bestand(en) zonder product of shot. Die gaan NIET mee.`);
  console.log('  Zet het productnummer en het shotwoord in de naam — bijvoorbeeld');
  console.log('  "p3-achterkant.png" — of upload ze los via het adminportaal.');
}
if (gaps.length) {
  console.log('\n  Nog niet compleet:');
  for (const [n, what] of gaps) console.log(`    product ${n}: ${what} ontbreekt`);
} else {
  console.log('\n  Alle producten hebben alle vier de shots.');
}

const usable = plan.filter((p) => p.product && p.shot);
if (!usable.length) {
  console.error('\nNiets te leveren: geen enkel bestand is te plaatsen.');
  process.exit(1);
}

/* ── DE MAAT VOORUITREKENEN ──────────────────────────────────────────────────
   Een ruwe schatting op basis van de bronbestanden, want de echte maat is pas na
   het omzetten bekend en dan is het te laat om te stoppen. De factoren komen uit
   een meting op een echte levering: een png is ongeveer twee keer de bron, een jpg
   een derde, een webp een kwart. Ruim naar boven, want de kant waar dit fout mag
   gaan is "hij waarschuwt terwijl het net was gelukt". */
const sourceTotal = usable.reduce((n, p) => n + p.sourceBytes, 0);
const estimate = Math.round(sourceTotal * (2 + 0.35 + 0.25));
const entryCount = usable.length * Object.keys(FORMAT_DIR).length;

console.log(`\n  De map wordt ongeveer ${mb(estimate)} in ${entryCount} bestanden.`);
if (entryCount > ZIP_MAX_FILES) {
  console.error(`\n  TE VEEL BESTANDEN. zip.js gaat tot ${ZIP_MAX_FILES}; dit worden er ${entryCount}.`);
  process.exit(1);
}
if (estimate > ZIP_MAX_BYTES && !MAX_EDGE) {
  console.error(`
  DIT PAST NIET IN EEN ARCHIEF. zip.js schrijft geen ZIP64, dus de bovengrens is
  2,0 GB — daarboven geeft de downloadroute een 413 en heeft de klant geen
  levering. Dat wil je hier zien en niet in zijn browser.

  Begrens de lange zijde van de leverbestanden:

    npm run deliver -- ${ref} ${folder} --max-edge=3000 --go

  3000px is 25 cm bij 300 dpi, dus ruim genoeg voor een lookbook en een
  webshop. Moet het écht groter, dan hoort de levering in twee bestellingen of
  moet zip.js ZIP64 gaan schrijven.
`);
  process.exit(1);
}

if (!GO) {
  console.log(`
  Droogloop — er is niets omgezet, geüpload of opgeslagen.
  Klopt de tabel hierboven? Dan:

    npm run deliver -- ${ref} ${folder}${MAX_EDGE ? ` --max-edge=${MAX_EDGE}` : ''} --go
`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · OMZETTEN
// ─────────────────────────────────────────────────────────────────────────────

const work = path.join(tmpdir(), `visuails-${ref}-${randomUUID().slice(0, 8)}`);
await mkdir(work, { recursive: true });

/*
 * ── DE INSTELLINGEN, EN WAAROM DEZE ────────────────────────────────────────
 *
 * png  compressionLevel 9, effort 10 — een levering wordt één keer gemaakt en
 *      honderd keer gedownload, dus mag het omzetten even duren.
 * jpg  quality 92, chroma subsampling UIT (4:4:4). Op standaard 4:2:0 lopen harde
 *      randen tussen twee verzadigde kleuren uit, en dat is precies wat een logo
 *      op een kledingstuk is.
 * webp quality 86, effort 6 — dezelfde afweging als make-thumbs.mjs maakt.
 * beoordeelbeeld  webp 72 op 1400px. Groot genoeg om een krom naadje te zien,
 *      te klein om te plaatsen, en klein genoeg om op een telefoon te openen.
 *
 * `withoutEnlargement` op alle vier: een bronbestand dat kleiner is dan de grens
 * wordt niet opgeblazen. Opblazen maakt een bestand groter en het beeld niet beter.
 */
async function convert(src, outBase) {
  const base = sharp(src, { failOn: 'error' }).rotate();   // rotate() = EXIF-oriëntatie toepassen
  const resize = MAX_EDGE
    ? { width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true }
    : null;

  const jobs = [
    ['png', `${outBase}.png`, (p) => p.png({ compressionLevel: 9, effort: 10 })],
    ['jpg', `${outBase}.jpg`, (p) => p.jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })],
    ['webp', `${outBase}.webp`, (p) => p.webp({ quality: 86, effort: 6 })],
  ];

  const made = {};
  for (const [format, out, apply] of jobs) {
    let pipe = base.clone();
    if (resize) pipe = pipe.resize(resize);
    await apply(pipe).toFile(out);
    made[format] = { file: out, bytes: (await stat(out)).size };
  }

  const preview = `${outBase}-review.webp`;
  await base.clone()
    .resize({ width: REVIEW_EDGE, height: REVIEW_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toFile(preview);
  made.review = { file: preview, bytes: (await stat(preview)).size };

  return made;
}

const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

async function put(key, file, type) {
  const r = await wrangler([
    'r2', 'object', 'put', `${BUCKET}/${key}`,
    '--file', file, '--content-type', type, scope,
  ]);
  if (!r.ok) throw new Error(`upload van ${key} mislukte:\n${r.out.trim()}`);
}

console.log('\nOmzetten en uploaden…');

const statements = [];
let uploadedBytes = 0;
let done = 0;

try {
  for (const p of usable) {
    const n = productNo(p.product);
    const shotName = shotNames[p.shot];
    const stem = `p${n}-${p.shot}-${randomUUID().slice(0, 8)}`;
    const made = await convert(p.file, path.join(work, stem));

    if (!NO_TAG) {
      for (const format of ['png', 'jpg', 'webp']) {
        await writeSourceType(made[format].file, AI_VALUE);
        // De tag verandert de bestandsgrootte, dus opnieuw meten — anders staat er
        // straks een maat in de database die niet die van het object is.
        made[format].bytes = (await stat(made[format].file)).size;
      }
    }

    /* De sleutels houden de vorm die admin.js gebruikt: delivery/<ref>/<slot>-<uuid>-<naam>.
       Zo staat een levering uit dit script in dezelfde boom als een handmatige, en
       is een bucketlijst nog te lezen. */
    const dir = `delivery/${ref}`;
    const keys = {
      png: `${dir}/p${n}-${p.shot}-${stem}.png`,
      jpg: `${dir}/p${n}-${p.shot}-${stem}.jpg`,
      webp: `${dir}/p${n}-${p.shot}-${stem}.webp`,
      review: `${dir}/review/p${n}-${p.shot}-${stem}.webp`,
    };

    for (const format of ['png', 'jpg', 'webp']) {
      await put(keys[format], made[format].file, MIME[format]);
      uploadedBytes += made[format].bytes;
    }
    await put(keys.review, made.review.file, MIME.webp);
    uploadedBytes += made.review.bytes;

    /*
     * ── DE PNG IS DE MASTER ────────────────────────────────────────────────
     *
     * files.r2_key wijst naar de png. Dat is geen willekeurige keuze: png is
     * lossless, dus is dat het bestand waar de andere twee uit gemaakt zijn, en
     * het is wat een oude leveringsrij ook is — één bestand per beeld. Daarmee
     * blijft de terugval in deliveryEntries() (geen assets → platte naam,
     * r2_key) een geldige levering opleveren en niet een half archief.
     *
     * files.preview_key wijst naar het beoordeelbeeld. Dat is de kolom die sinds
     * migratie 0001 bestond en nooit door iets is gevuld — zie de kop van
     * src/lib/delivery.js. Dit is de regel die dat verandert.
     */
    const naam = `${shotName}.png`;
    statements.push(
      `INSERT INTO files (order_id, kind, r2_key, preview_key, filename, bytes, product_key, shot)
         VALUES (${order.id}, 'delivery', ${q(keys.png)}, ${q(keys.review)}, ${q(naam)}, ${made.png.bytes}, ${q(`p${n}`)}, ${q(p.shot)});`
    );
    /*
     * De assets hangen aan het id van de rij hierboven. `last_insert_rowid()` kan
     * hier NIET: na de eerste asset-insert is dat het id van die asset. Dus wordt
     * het beeld opgezocht op zijn r2_key, en die is uniek omdat er een uuid in zit.
     */
    for (const format of ['png', 'jpg', 'webp']) {
      statements.push(
        `INSERT OR REPLACE INTO file_assets (file_id, format, r2_key, bytes)
           SELECT id, ${q(format)}, ${q(keys[format])}, ${made[format].bytes}
             FROM files WHERE r2_key = ${q(keys.png)};`
      );
    }

    done++;
    process.stdout.write(`\r  ${done}/${usable.length} beelden · ${mb(uploadedBytes)} geüpload   `);
  }
  process.stdout.write('\n');

  /*
   * ── VERVANGEN MARKEREN, PRECIES ZOALS ADMIN HET DOET ──────────────────────
   *
   * Letterlijk de twee statements uit resupersede() in src/lib/admin.js. Zonder
   * deze stap staat er na een revisieronde twee keer hetzelfde beeld in het
   * portaal én in de map: de afgekeurde en de nieuwe. Migratie 0012 legt uit
   * waarom dat erger is dan het klinkt.
   *
   * Eerst alles vrijgeven en dan opnieuw markeren, en niet alleen de nieuwe
   * markeren: zo is de uitkomst onafhankelijk van wat er eerder stond, ook als er
   * ooit met de hand iets is verschoven.
   */
  statements.push(
    `UPDATE files SET superseded_at = NULL WHERE order_id = ${order.id} AND kind = 'delivery';`,
    `UPDATE files SET superseded_at = datetime('now')
       WHERE order_id = ${order.id} AND kind = 'delivery'
         AND product_key IS NOT NULL AND shot IS NOT NULL
         AND id < (SELECT MAX(f2.id) FROM files f2
                    WHERE f2.order_id = files.order_id AND f2.kind = 'delivery'
                      AND f2.product_key = files.product_key AND f2.shot = files.shot);`
  );

  console.log('  De rijen wegschrijven…');
  await execFileSql(statements);
} finally {
  await closeExif();
  if (!KEEP) await rm(work, { recursive: true, force: true });
  else console.log(`  omgezette bestanden bewaard: ${work}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · NAKIJKEN
// ─────────────────────────────────────────────────────────────────────────────

/*
 * NIET AANNEMEN DAT HET GELUKT IS. De inserts gingen via een bestand en wrangler
 * meldt alleen dát hij het bestand heeft uitgevoerd. Wat er nu in de database
 * staat, is de enige vraag die telt, dus wordt die gesteld.
 */
const live = await query(
  `SELECT COUNT(*) AS beelden,
          (SELECT COUNT(*) FROM file_assets a JOIN files f2 ON f2.id = a.file_id
            WHERE f2.order_id = ${order.id} AND f2.superseded_at IS NULL) AS assets,
          SUM(CASE WHEN preview_key IS NULL THEN 1 ELSE 0 END) AS zonder_preview
     FROM files
    WHERE order_id = ${order.id} AND kind = 'delivery' AND superseded_at IS NULL`
);
const row = live[0] || {};

console.log(`
Klaar.

  ${done} beelden omgezet en geüpload · ${mb(uploadedBytes)}
  in de database: ${row.beelden || 0} levende beelden, ${row.assets || 0} bestanden
  zonder beoordeelbeeld: ${row.zonder_preview || 0}${Number(row.zonder_preview) ? '  (leveringen van vóór dit script)' : ''}
  herkomsttag: ${NO_TAG ? 'OVERGESLAGEN (--no-tag)' : AI_VALUE.split('/').pop()}

De klant ziet dit meteen in zijn portaal en in VISUAILS Studio. Er is GEEN mail
uitgegaan en de status is niet veranderd — dat doe je in het adminportaal, zodat
je de bestelling erbij ziet op het moment dat je het aankondigt.
`);
