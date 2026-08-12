/* Een kopie van alles wat je kwijt kunt raken. `npm run backup`
 *
 *   npm run backup              → database + een inventaris van R2
 *   npm run backup -- --files   → ook de bestanden zelf ophalen (traag)
 *   npm run backup -- --keep 10 → oudere back-ups opruimen, tien bewaren
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WAAROM DIT HET BELANGRIJKSTE SCRIPT IN DEZE MAP IS.
 *
 * Er is geen back-up. Niet van D1, niet van R2. Alles wat deze week gebouwd is
 * — de bestellingen, de revisiegeschiedenis, de indeling per product, de
 * notities — staat op één plek, en één verkeerd `DELETE` of één account dat op
 * slot gaat is genoeg. Cloudflare doet aan point-in-time recovery voor D1
 * (dertig dagen op het betaalde plan), maar dat is hún kopie op hún account:
 * precies het ding dat je niet meer kunt gebruiken op de dag dat je het account
 * kwijt bent. Een bestand op je eigen schijf is dat wel.
 *
 * WAT ER IN DE KOPIE ZIT.
 *
 *   <datum>-d1.sql        de hele database als SQL, teruglaadbaar met
 *                         `wrangler d1 execute --file` op een lege database
 *   <datum>-r2.json       elke R2-sleutel die de database noemt, met bestandsnaam,
 *                         grootte en waar hij bij hoort
 *   <datum>-objects/      de bestanden zelf — alleen met --files
 *
 * WAAROM DE INVENTARIS APART, EN STANDAARD ZONDER DE BESTANDEN. De database is
 * een paar honderd kilobyte en in seconden binnen; de bucket is gigabytes en
 * duurt uren. Een dagelijkse kopie van het eerste is een gewoonte die je
 * volhoudt, een dagelijkse kopie van het tweede niet. De inventaris is het
 * verschil tussen "alles weg" en "ik weet precies welke 340 bestanden weg zijn
 * en bij welke klant ze hoorden" — en dat laatste is een gesprek dat je kunt
 * voeren.
 *
 * WAT DIT NIET IS: een herstelknop. Terugzetten is met opzet handwerk, want de
 * dag dat je het nodig hebt wil je kijken naar wat je terugzet voordat je het
 * over de echte database heen giet. Onderaan staat hoe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrangler, warmLogin, asCommandArg } from './lib/wrangler.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'backups');

const argv = process.argv.slice(2);
const hash = argv.findIndex((a) => a.startsWith('#'));
const args = hash === -1 ? argv : argv.slice(0, hash);
const WITH_FILES = args.includes('--files');
const KEEP = (() => {
  const i = args.indexOf('--keep');
  const n = i === -1 ? NaN : Number(args[i + 1]);
  return Number.isInteger(n) && n > 0 ? n : 0;
})();

const DB = (() => {
  const toml = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8');
  const m = /database_name\s*=\s*"([^"]+)"/.exec(toml);
  if (!m) throw new Error('backup: geen database_name in wrangler.toml');
  return m[1];
})();

const BUCKET = (() => {
  const toml = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8');
  const m = /bucket_name\s*=\s*"([^"]+)"/.exec(toml);
  return m ? m[1] : null;
})();

/* De datum in de bestandsnaam is lokale tijd en niet UTC, omdat je hem leest en
 * niet sorteert op een server: "de kopie van gisteravond" moet gisteravond
 * heten. Sorteren blijft werken, want het formaat is jaar-maand-dag. */
const stamp = (() => {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
})();

fs.mkdirSync(OUT, { recursive: true });

console.log(`VISUAILS · back-up ${stamp}\n`);

// Token vernieuwen vóór de eerste aanroep, anders valt een back-up om op een
// 7403 die geen rechtenprobleem is — zie warmLogin() in lib/wrangler.mjs.
// Juist hier vervelend: een back-up die niet draait, merk je pas als je hem
// nodig hebt.
await warmLogin();

// ── 1 · de database ───────────────────────────────────────────────────────────
const sqlFile = path.join(OUT, `${stamp}-d1.sql`);
process.stdout.write('  database exporteren… ');
/* `-y` beantwoordt de waarschuwing die wrangler geeft voordat hij de database
 * even op slot zet. Oudere versies kennen die vlag niet en weigeren hem, dus
 * bij "unknown argument" gaat hij er zonder — liever een script dat op twee
 * versies werkt dan een vlag die je moet onthouden. */
let dump = await wrangler(['d1', 'export', DB, '--remote', '-y', '--output', sqlFile]);
if (!dump.ok && /unknown argument|unrecognized/i.test(dump.out)) {
  dump = await wrangler(['d1', 'export', DB, '--remote', '--output', sqlFile]);
}
if (!dump.ok || !fs.existsSync(sqlFile)) {
  console.log('mislukt');
  console.error(dump.out.trim().slice(0, 1200));
  process.exit(1);
}
const sqlKb = (fs.statSync(sqlFile).size / 1024).toFixed(0);
console.log(`${path.basename(sqlFile)}  ${sqlKb} kB`);

/* EEN EXPORT DIE GEEN TABELLEN BEVAT IS GEEN EXPORT. Dat klinkt onmogelijk,
 * maar een geslaagde aanroep met een leeg of half bestand is precies het soort
 * back-up dat je pas ontdekt op de dag dat je hem nodig hebt. Twee goedkope
 * controles: staat er een CREATE TABLE in, en staan de tabellen erin die er
 * horen te zijn. */
const sql = fs.readFileSync(sqlFile, 'utf8');
const tables = [...sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?["'`]?(\w+)/gi)].map((m) => m[1]);
const MUST_HAVE = ['orders', 'customers', 'files'];
const missing = MUST_HAVE.filter((t) => !tables.includes(t));
if (missing.length) {
  console.error(`\n  ✖ de export mist ${missing.join(', ')} — dit is geen bruikbare kopie.`);
  console.error('    Het bestand blijft staan zodat je kunt kijken wat er wél in zit.');
  process.exit(1);
}
console.log(`     ${tables.length} tabellen, waaronder ${MUST_HAVE.join(', ')}`);

/* ── 1b · DE DATUMSTEMPEL ─────────────────────────────────────────────────────
 *
 * Eén rij in `app_settings`, en die rij is het hele punt van deze toevoeging.
 *
 * DIT SCRIPT DRAAIT OP EEN PC EN DAT IS PRECIES HET PROBLEEM. Zolang de back-up
 * handwerk was, was het herstelpunt "de laatste keer dat ik eraan dacht". Met de
 * wekelijkse taak in de Taakplanner (scripts/backup-weekly.cmd, opzet in DEPLOY.md)
 * draait hij vanzelf — maar áls die taak stilvalt, en dat gebeurt (laptop uit,
 * wachtwoord verlopen, wrangler-login weg, schijf vol), dan gebeurt er niets. En
 * niets is onzichtbaar: geen mail, geen melding, geen bestand dat ontbreekt op een
 * plek waar je kijkt.
 *
 * Deze regel legt het bewijs neer op de enige plek die van buiten te lezen is: de
 * database. cron/index.js kijkt er elke nacht naar en mailt als hij ouder dan tien
 * dagen is — de alarmbel hangt dus in de cloud en de back-up op de schijf, want een
 * PC die het probleem is, kan het probleem niet melden.
 *
 * WAAROM HIER EN NIET ONDERAAN. Op dit punt staat vast dat de export echt is: er is
 * een bestand, er staan CREATE TABLEs in, en orders/customers/files zitten erbij. Wat
 * daarna komt — de R2-inventaris, de objecten, het opruimen — kan mislukken zonder
 * dat de kopie van de database minder waard wordt. Een stempel ná dat alles zou
 * uitblijven op een avond dat de database wél veilig staat, en dat is een vals alarm.
 *
 * WAAROM DIT NIET FATAAL IS. Lukt de stempel niet, dan is de back-up er nog steeds en
 * heeft hij zijn werk gedaan. Dan komt er over tien dagen een mail die zegt dat er
 * geen back-up is terwijl die er wel is — vervelend, maar de goede kant om fout te
 * gaan: een bewaking die liever te vaak waarschuwt dan te weinig.
 */
const stampSql = asCommandArg(
  `INSERT INTO app_settings (key, value) VALUES ('backup_last_run', '${stamp.replace(/-(\d{4})$/, ' $1').replace(/(\d{2})(\d{2})$/, '$1:$2')}')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
);
if (stampSql) {
  const st = await wrangler(['d1', 'execute', DB, '--remote', '--command', stampSql]);
  if (st.ok) {
    console.log('     datum weggeschreven in app_settings — cron/index.js kijkt hiernaar');
  } else {
    console.error('  ! de datum kon niet in app_settings — de back-up zelf is in orde.');
    console.error('    Gevolg: de nachtelijke taak denkt over tien dagen dat er geen back-up is.');
    console.error('    ' + st.out.trim().split('\n')[0].slice(0, 200));
  }
}

/* ── 2 · de inventaris van R2 ─────────────────────────────────────────────────
 *
 * DE QUERY GAAT DOOR asCommandArg() — 10 augustus 2026.
 *
 * Deze SQL stond hier over twee regels, zoals leesbare SQL hoort, en ging zo
 * rechtstreeks naar `--command`. Op Windows loopt die aanroep via cmd.exe (zie
 * lib/wrangler.mjs) en daar is een regeleinde geen witruimte maar het einde van het
 * commando. Uitkomst: `npm run backup -- --files` meldde "leeg of mislukt", schreef
 * geen inventaris, en sloeg stap 3 volledig over — want die is afhankelijk van deze
 * lijst. De back-up mét bestanden heeft dus nooit één object opgehaald.
 *
 * Het middel stond al in dit project: assertSafeArg() weigert `\n` met zoveel
 * woorden, en migrate.mjs korrtte zijn SQL al in om precies deze reden. Beide zaten
 * één bestand verderop en dit aanroeppunt kende ze niet, dus staan ze nu in
 * lib/wrangler.mjs.
 */
process.stdout.write('  inventaris van de bestanden… ');
const INVENTORY_SQL = asCommandArg(
  `SELECT f.id, f.order_id, o.ref, f.kind, f.filename, f.bytes, f.r2_key, f.preview_key
     FROM files f LEFT JOIN orders o ON o.id = f.order_id ORDER BY f.id`
);
const inv = INVENTORY_SQL
  ? await wrangler(['d1', 'execute', DB, '--remote', '--json', '--command', INVENTORY_SQL])
  : { ok: false, out: 'de inventarisquery past niet op een commandoregel', stdout: '' };

/* DRIE UITKOMSTEN, DRIE BERICHTEN. Hier stond één regel — "leeg of mislukt" — voor
 * twee dingen die niets met elkaar te maken hebben: een database zonder bestanden
 * (prima, er is niets te bewaren) en een aanroep die faalde (niet prima, je back-up
 * is onvolledig en je weet niet waarom). Dat onderscheid is het verschil tussen
 * doorgaan en uitzoeken, en dat hoort de melding voor je te maken. */
let files = [];
let invError = inv.ok ? null : inv.out.trim().split('\n').filter(Boolean).slice(-3).join(' ');
if (inv.ok) {
  try {
    files = JSON.parse(inv.stdout.slice(inv.stdout.indexOf('[')))?.[0]?.results || [];
  } catch (err) {
    invError = `het antwoord was geen JSON — ${err.message}`;
  }
}
/* ── DE VARIANTEN UIT MIGRATIE 0022 HOREN ER OOK BIJ ──────────────────────────
 *
 * GEMETEN OP 10 AUGUSTUS 2026. De eerste geslaagde back-up mét bestanden haalde 33
 * objecten op — precies het aantal rijen in `files`. Geen enkele variant, want deze
 * inventaris keek alleen naar `files`, en `file_assets` (png/jpg/webp per beeld, sinds
 * 0022) is een aparte tabel met aparte R2-sleutels.
 *
 * Vandaag kost dat niets: `file_assets` heeft nul rijen in productie, na te lezen in
 * de dump ernaast. Maar scripts/deliver.mjs vult die tabel wél, en cron/index.js
 * verwijdert die sleutels wél — de opruimtaak weet dus van objecten die de back-up
 * niet kent. Dat is de verkeerde kant om asymmetrisch te zijn, en het is nu goedkoop
 * recht te zetten in plaats van na de eerste levering via het script.
 *
 * Mislukt dit deel, dan is dat GEEN reden om de bestanden niet op te halen: de
 * hoofdinventaris is er dan wel. Vandaar een eigen melding en geen exitcode.
 */
const ASSETS_SQL = asCommandArg(
  `SELECT a.file_id, a.format, a.r2_key, a.bytes, f.order_id, o.ref
     FROM file_assets a JOIN files f ON f.id = a.file_id
     LEFT JOIN orders o ON o.id = f.order_id ORDER BY a.id`
);
let assets = [];
if (!invError && files.length) {
  const q = await wrangler(['d1', 'execute', DB, '--remote', '--json', '--command', ASSETS_SQL]);
  if (q.ok) {
    try { assets = JSON.parse(q.stdout.slice(q.stdout.indexOf('[')))?.[0]?.results || []; } catch { assets = []; }
  } else if (!/no such table/i.test(q.out)) {
    console.error('\n    (de varianten uit file_assets konden niet gelezen worden — de rest gaat door)');
  }
}

if (invError) {
  console.log('mislukt');
  console.error(`    ${invError}`);
  console.error('    De database-export is er wel, maar de inventaris niet, en de bestanden');
  console.error('    zijn dus ook niet opgehaald. Dit is geen volledige back-up.');
  process.exitCode = 1;
} else if (!files.length) {
  console.log('geen bestanden in de database');
  console.error('    Dat is een geldige uitkomst en geen fout: er staat niets in `files`,');
  console.error('    dus er is ook niets in R2 dat bij een bestelling hoort.');
} else {
  const manifest = path.join(OUT, `${stamp}-r2.json`);
  const total = files.reduce((n, f) => n + (Number(f.bytes) || 0), 0);
  fs.writeFileSync(manifest, JSON.stringify({
    taken_at: stamp, database: DB, bucket: BUCKET,
    count: files.length, bytes: total, files, assets,
  }, null, 2));
  console.log(`${files.length} bestanden, ${(total / 1024 / 1024).toFixed(0)} MB${assets.length ? `, plus ${assets.length} varianten` : ''}`);
}

// ── 3 · de bestanden zelf, alleen als erom gevraagd is ───────────────────────
if (WITH_FILES && files.length) {
  if (!BUCKET) {
    console.error('  ✖ geen bucket_name in wrangler.toml — kan de bestanden niet ophalen.');
  } else {
    const dir = path.join(OUT, `${stamp}-objects`);
    fs.mkdirSync(dir, { recursive: true });
    /* Elke sleutel die de database noemt: het beeld, zijn beoordeelbeeld, en de
     * varianten uit 0022. Set() omdat een preview_key in theorie gelijk kan zijn aan
     * een r2_key (een levering zonder verkleining), en dan hoeft hij niet twee keer. */
    const keys = [...new Set([
      ...files.flatMap((f) => [f.r2_key, f.preview_key]),
      ...assets.map((a) => a.r2_key),
    ].filter(Boolean))];
    console.log(`  ${keys.length} objecten ophalen uit ${BUCKET} — dit duurt even.`);
    let done = 0;
    let failed = 0;
    for (const key of keys) {
      // Het pad uit de sleutel nabouwen, zodat de map er straks uitziet zoals de
      // bucket: delivery/<ref>/… en intake/<ref>/…
      const dest = path.join(dir, key.replace(/[^\w./-]/g, '_'));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const r = await wrangler(['r2', 'object', 'get', `${BUCKET}/${key}`, '--remote', '--file', dest]);
      if (r.ok) { done++; } else { failed++; }
      if ((done + failed) % 25 === 0) process.stdout.write(`\r     ${done + failed}/${keys.length}`);
    }
    console.log(`\r     ${done} opgehaald${failed ? `, ${failed} mislukt` : ''}          `);
  }
} else if (files.length) {
  console.log('  (de bestanden zelf niet meegenomen — gebruik --files als je die ook wilt)');
}

// ── 4 · opruimen ─────────────────────────────────────────────────────────────
if (KEEP) {
  const sets = [...new Set(fs.readdirSync(OUT).map((f) => f.slice(0, 16)))].sort();
  const drop = sets.slice(0, Math.max(0, sets.length - KEEP));
  for (const old of drop) {
    for (const f of fs.readdirSync(OUT).filter((f) => f.startsWith(old))) {
      fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
    }
  }
  if (drop.length) console.log(`  ${drop.length} oudere back-up(s) opgeruimd, ${KEEP} bewaard`);
}

console.log(`\n▶ ${path.relative(ROOT, OUT)}/${stamp}-*`);
console.log('\nTerugzetten is met opzet handwerk. Op een LEGE database:');
console.log(`  npx wrangler d1 execute ${DB} --remote --file backups/${stamp}-d1.sql`);
console.log('Kijk eerst in het bestand. Over een database die nog data heeft, giet je dit niet.');
