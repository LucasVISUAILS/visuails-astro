/* Migraties draaien zonder op "duplicate column name" te stranden.
 *
 *   npm run migrate            → alles wat nog niet gedraaid is, tegen --remote
 *   npm run migrate 0011       → alleen die migratie
 *   npm run migrate -- --local → tegen de lokale D1 in plaats van de echte
 *   npm run migrate -- --dry   → zeggen wat er zou gebeuren, niets uitvoeren
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WAAROM DIT BESTAAT. Drie keer dezelfde avond, 6 augustus 2026:
 *
 *   Error: duplicate column name: revisions_revoked_at
 *   Error: duplicate column name: redelivery_mailed_at
 *
 * SQLite kent `CREATE TABLE IF NOT EXISTS` en `CREATE INDEX IF NOT EXISTS`,
 * maar `ALTER TABLE ... ADD COLUMN` heeft geen IF NOT EXISTS. Eén migratie die
 * halverwege strandt — een verlopen token, een verbroken verbinding — laat de
 * database achter met de helft toegepast, en de tweede poging stopt bij de
 * eerste kolom die er al is. Wat er dan nog moet gebeuren, moet je met de hand
 * uitzoeken, en dat is precies het moment waarop je iets overslaat.
 *
 * WAT DIT DOET. Elke opdracht wordt apart bekeken vóór hij draait:
 *
 *   ALTER TABLE x ADD COLUMN y  → overslaan als kolom y al in x zit
 *   CREATE TABLE/INDEX          → hebben zelf al IF NOT EXISTS, draaien altijd
 *   UPDATE (backfill)           → draait altijd; de backfills in migrations/
 *                                 raken alleen rijen aan die nog leeg zijn
 *
 * De toestand wordt UIT DE DATABASE gelezen, niet uit een tabel die bijhoudt
 * welke migratie gedraaid is. Zo'n tabel is een tweede waarheid die kan gaan
 * afwijken van de echte — en de echte is hier goedkoop op te vragen met
 * pragma_table_info.
 *
 * WAT DIT NIET DOET. Niets terugdraaien, en niets in een transactie. D1 voert
 * een --file uit als losse opdrachten; dit script doet hetzelfde, alleen met
 * een controle ervoor. Bij een fout stopt het en zegt het waar het stond, zodat
 * een tweede run verdergaat in plaats van opnieuw te beginnen.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrangler } from './lib/wrangler.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'migrations');

/*
 * ALLES NA EEN # WEG — 7 augustus 2026.
 *
 * Ik zette een voorbeeldregel met `# uitleg` erachter in een bericht, Lucas
 * plakte hem in cmd.exe, en Windows kent geen #-commentaar. Dus kwamen "zegt",
 * "per", "opdracht" binnen als filters op de bestandsnaam, matchte "per" op
 * 0005-per-product-uploads.sql, en draaide dit script iets heel anders dan
 * bedoeld. Een script dat je op je database loslaat, hoort een geplakt commentaar
 * niet stilzwijgend als opdracht te lezen.
 */
const raw = process.argv.slice(2);
const hash = raw.findIndex((a) => a.startsWith('#'));
const argv = hash === -1 ? raw : raw.slice(0, hash);
if (hash !== -1) console.log(`(alles vanaf "${raw[hash]}" genegeerd — dat leest als commentaar)\n`);

const DRY = argv.includes('--dry');
const LOCAL = argv.includes('--local');
const only = argv.filter((a) => !a.startsWith('--'));

/** De database uit wrangler.toml, niet overgetypt — zelfde bron als check-wrangler.mjs. */
const DB = (() => {
  const toml = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8');
  const m = /database_name\s*=\s*"([^"]+)"/.exec(toml);
  if (!m) throw new Error('migrate: geen database_name in wrangler.toml');
  return m[1];
})();

const scope = LOCAL ? '--local' : '--remote';

/**
 * Commentaar eruit — óók het commentaar dat áchter een opdracht staat.
 *
 * DE BUG DIE DIT VEROORZAAKTE, 7 augustus 2026. De vorige versie gooide alleen
 * regels weg die MET `--` beginnen. In migrations/0006 staat:
 *
 *   ALTER TABLE orders ADD COLUMN window_expires_at TEXT;   -- ISO datetime, or NULL
 *   ALTER TABLE orders ADD COLUMN refunded_cents INTEGER NOT NULL DEFAULT 0;
 *
 * Dat commentaar staat ná de puntkomma, dus bij het splitsen plakte het aan het
 * BEGIN van de volgende opdracht. Die begon daarmee niet meer met "ALTER", de
 * herkenner zag er geen ADD COLUMN in, en dus draaide hij hem gewoon — met
 * "duplicate column name: refunded_cents" tot gevolg. De controle was er wel,
 * hij keek alleen naar de verkeerde tekst.
 *
 * Aanhalingstekens worden bijgehouden zodat een `--` binnen een string blijft
 * staan. Die komen in deze migraties niet voor, maar de dag dat er één in komt,
 * hoort dit niet stil het halve statement weg te knippen.
 */
function stripComments(sql) {
  return sql.split('\n').map((line) => {
    let inString = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "'") {
        // '' binnen een string is een ontsnapte apostrof, geen einde.
        if (inString && line[i + 1] === "'") { i++; continue; }
        inString = !inString;
      } else if (!inString && ch === '-' && line[i + 1] === '-') {
        return line.slice(0, i);
      }
    }
    return line;
  }).join('\n');
}

/** SQL in losse opdrachten hakken, zonder commentaar ertussen. */
function statements(sql) {
  return stripComments(sql)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Eén vraag aan de database, als JSON terug.
 *
 * Eén regel SQL, dus --command mag. Meerdere regels gaan via een bestand — zie
 * execute() hieronder over waarom.
 */
async function query(sql, attempt = 1) {
  const r = await wrangler(['d1', 'execute', DB, scope, '--json', '--command', sql]);
  // 7403 komt en gaat. Eén keer opnieuw proberen na een adempauze scheelt een
  // afgebroken run die je daarna met de hand moet uitzoeken; blijft hij komen,
  // dan is het geen hapering maar een autorisatieprobleem en hoort het script
  // te stoppen in plaats van te blijven kloppen.
  if (!r.ok && attempt === 1 && /7403|fetch failed|ECONNRESET|timed? ?out/i.test(r.out)) {
    console.log('  (hapering bij Cloudflare — één keer opnieuw over 3 seconden)');
    await new Promise((res) => setTimeout(res, 3000));
    return query(sql, 2);
  }
  if (!r.ok) throw new Error(`kon de database niet lezen:\n${r.out.trim()}`);
  try {
    const parsed = JSON.parse(r.stdout.slice(r.stdout.indexOf('[')));
    return parsed?.[0]?.results || [];
  } catch {
    throw new Error(`onverwacht antwoord van wrangler:\n${r.stdout.slice(0, 400)}`);
  }
}

/**
 * Eén opdracht uitvoeren, via een tijdelijk .sql-bestand.
 *
 * NIET via --command, en dat is de les van vanavond. Een CREATE TABLE loopt over
 * meerdere regels, en een argument met regeleindes erin overleeft de weg door
 * cmd.exe niet — ook niet met aanhalingstekens eromheen. Een bestand heeft dat
 * probleem niet: er gaat één pad over de commandoregel en de SQL raakt de shell
 * nooit aan.
 *
 * Het bestand komt in de tijdelijke map van het systeem en niet naast de
 * migraties: dit is werkgeheugen, geen bron, en het hoort niet in een map te
 * verschijnen waar `npm run migrate` de volgende keer opnieuw doorheen loopt.
 */
async function execute(stmt) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'visuails-migrate-')), 'stmt.sql');
  fs.writeFileSync(file, `${stmt};\n`);
  try {
    return await wrangler(['d1', 'execute', DB, scope, '--yes', '--file', file]);
  } finally {
    try { fs.rmSync(path.dirname(file), { recursive: true, force: true }); } catch { /* niet belangrijk */ }
  }
}

/*
 * ── ÉÉN VRAAG VOOR ALLE KOLOMMEN — 7 augustus 2026 ──────────────────────────
 *
 * Eerst vroeg dit script per tabel apart naar zijn kolommen. Bij dertien
 * migraties zijn dat een stuk of tien losse API-aanroepen vóór er ook maar iets
 * gedraaid is, en halverwege de proefrun kwam er een 7403 terug: "The given
 * account is not valid or is not authorized to access this service." Dezelfde
 * fout als in augustus bij `npm run fetch:order` — hij komt en gaat, en hoe
 * meer aanroepen je doet hoe groter de kans dat je erin loopt.
 *
 * SQLite kan pragma_table_info als tabel behandelen, dus de hele plattegrond
 * past in één vraag. Eén aanroep in plaats van tien is niet alleen sneller: het
 * is tien keer minder kans dat een proefrun op driekwart omvalt en je niet weet
 * wat er nu wel en niet staat.
 *
 * MET EEN TERUGVAL. Zou D1 die vorm ooit weigeren, dan vraagt hij het alsnog
 * per tabel — liever traag dan stuk.
 */
const columnCache = new Map();
let mapLoaded = false;

async function loadColumnMap() {
  if (mapLoaded) return;
  mapLoaded = true;
  try {
    const rows = await query(
      "SELECT m.name AS t, p.name AS c FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type = 'table'"
    );
    if (!rows.length) return;
    for (const { t, c } of rows) {
      if (!columnCache.has(t)) columnCache.set(t, new Set());
      columnCache.get(t).add(c);
    }
  } catch (err) {
    console.log(`  (kon de plattegrond niet in één keer ophalen — ${err.message.split('\n')[0]})`);
  }
}

async function columns(table) {
  await loadColumnMap();
  if (!columnCache.has(table)) {
    // Niet in de plattegrond: óf de tabel bestaat niet, óf de brede vraag is
    // niet doorgekomen. Beide gevallen zijn met één gerichte vraag op te lossen.
    const rows = await query(`SELECT name FROM pragma_table_info('${table}')`);
    columnCache.set(table, new Set(rows.map((r) => r.name)));
  }
  return columnCache.get(table);
}

/** Draait deze opdracht, of is hij al gebeurd? */
async function decide(stmt) {
  const add = /^ALTER\s+TABLE\s+([A-Za-z_][\w]*)\s+ADD\s+COLUMN\s+([A-Za-z_][\w]*)/i.exec(stmt);
  if (add) {
    const [, table, column] = add;
    const have = await columns(table);
    if (have.has(column)) return { run: false, why: `${table}.${column} bestaat al` };
    return { run: true, why: `${table}.${column} toevoegen` };
  }
  const create = /^CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)\s+(IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][\w]*)/i.exec(stmt);
  if (create) {
    const kind = create[2].toLowerCase();
    if (!create[3]) {
      // Zonder IF NOT EXISTS zou dit stuklopen op een tabel die er al is. De
      // plattegrond weet welke tabellen bestaan, dus dat hoeft niet met een
      // foutmelding ontdekt te worden.
      if (kind === 'table') {
        await loadColumnMap();
        if (columnCache.has(create[4])) return { run: false, why: `tabel ${create[4]} bestaat al` };
      }
      return { run: true, why: `${kind} ${create[4]} (LET OP: zonder IF NOT EXISTS)` };
    }
    return { run: true, why: `${kind} ${create[4]} (veilig herhaalbaar)` };
  }
  return { run: true, why: stmt.split('\n')[0].slice(0, 60).replace(/\s+/g, ' ') };
}

const files = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .filter((f) => !only.length || only.some((pick) => f.includes(pick)));

if (!files.length) {
  console.error(`Geen migratie gevonden voor "${only.join(' ')}".\n`);
  console.error('Beschikbaar:');
  for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) console.error(`  ${f}`);
  process.exit(1);
}
// Een filter dat niets raakt, is een tikfout — en stil doorgaan met de rest zou
// betekenen dat je denkt 0011 te draaien terwijl er iets anders langskomt.
for (const pick of only) {
  if (!files.some((f) => f.includes(pick))) {
    console.error(`"${pick}" past op geen enkele migratie. Niets gedraaid.`);
    process.exit(1);
  }
}

console.log(`Database ${DB} ${scope}${DRY ? '  (proefdraaien — er wordt niets uitgevoerd)' : ''}\n`);

/*
 * ── EEN TABEL DIE HERBOUWD WORDT, RAAK JE NIET UIT GEWOONTE AAN ─────────────
 *
 * migrations/0007 doet wat SQLite van je vraagt als je een kolom wilt wijzigen:
 * een nieuwe tabel maken, de rijen erin kopiëren, en hem over de oude heen
 * hernoemen. Dat is precies goed één keer, en gevaarlijk een tweede keer — want
 * "kopieer de rijen" kopieert alleen de kolommen die het script kende, en alles
 * wat er sindsdien bij is gekomen valt eruit.
 *
 * Zo'n migratie is niet te controleren met "bestaat kolom x al", dus wordt hij
 * overgeslagen tenzij je hem bij naam noemt: `npm run migrate 0007`. Dan is het
 * een besluit in plaats van een bijwerking van "draai alles wat nog mist".
 */
const REBUILD = /\bRENAME\s+TO\b|\bPRAGMA\s+foreign_keys\b|\bDROP\s+TABLE\b/i;

let ran = 0;
let skipped = 0;
for (const file of files) {
  console.log(file);
  const source = fs.readFileSync(path.join(DIR, file), 'utf8');
  if (REBUILD.test(stripComments(source)) && !only.some((pick) => file.includes(pick))) {
    console.log('  · overgeslagen — bouwt een tabel om. Draai hem los als je hem echt nodig hebt:');
    console.log(`      npm run migrate ${file.slice(0, 4)}`);
    skipped++;
    continue;
  }
  const stmts = statements(source);
  for (const stmt of stmts) {
    let verdict;
    try {
      verdict = await decide(stmt);
    } catch (err) {
      console.error(`\n  ✖ ${err.message}`);
      process.exit(1);
    }
    if (!verdict.run) {
      skipped++;
      console.log(`  · overgeslagen — ${verdict.why}`);
      continue;
    }
    if (DRY) {
      console.log(`  → zou draaien — ${verdict.why}`);
      continue;
    }
    const r = await execute(stmt);
    if (!r.ok) {
      console.error(`\n  ✖ gestopt bij: ${verdict.why}\n${r.out.trim()}\n`);
      console.error('  De opdrachten hiervóór zijn wél gebeurd. Los dit op en draai');
      console.error('  hetzelfde commando opnieuw — wat al bestaat wordt overgeslagen.');
      process.exit(1);
    }
    ran++;
    // De kolom die er net bij is gekomen, meteen in de plattegrond bijschrijven.
    // De cache weggooien zou een extra API-aanroep per ALTER kosten, en juist
    // het aantal aanroepen is wat hier misgaat (zie loadColumnMap).
    const added = /^ALTER\s+TABLE\s+([A-Za-z_][\w]*)\s+ADD\s+COLUMN\s+([A-Za-z_][\w]*)/i.exec(stmt);
    if (added) {
      if (!columnCache.has(added[1])) columnCache.set(added[1], new Set());
      columnCache.get(added[1]).add(added[2]);
    }
    console.log(`  ✓ ${verdict.why}`);
  }
}

console.log(`\n${DRY ? 'Proef klaar.' : `Klaar. ${ran} uitgevoerd, ${skipped} overgeslagen omdat het er al stond.`}`);
