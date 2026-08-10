/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAT ER OVER EEN COMMANDOREGEL MAG
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT BESTAAT — 10 AUGUSTUS 2026 ───────────────────────────────────
 *
 * `npm run backup -- --files` liep drie minuten, meldde "inventaris van de
 * bestanden… leeg of mislukt", en haalde geen enkel object uit R2 op. De oorzaak was
 * één regeleinde: de inventarisquery stond over twee regels en ging zo naar
 * `--command`. Op Windows gaat die aanroep via cmd.exe, en daar is een regeleinde het
 * einde van het commando.
 *
 * Dat het middel al bestond is het eigenlijke probleem. lib/wrangler.mjs weigert in
 * assertSafeArg() met zoveel woorden `\r` en `\n`, en migrate.mjs kortte zijn SQL al
 * in om precies deze reden — met een commentaarblok erboven dat het incident van
 * 7 augustus beschrijft. Beide zaten één bestand verderop en het derde aanroeppunt
 * kende ze niet. Dat is de vierde keer in dit project dat iets opnieuw bedacht werd
 * dat al opgelost was.
 *
 * Een test die alleen dít ene bestand controleert, laat het vijfde aanroeppunt weer
 * vrij. Daarom controleert deze twee dingen:
 *
 *   1 · oneLine()/asCommandArg() doen wat ze beloven, ook op de gevallen waar het
 *       fout kan gaan (een tekstwaarde met witruimte erin, een niet-gesloten
 *       aanhalingsteken, elke echte migratie in migrations/)
 *   2 · GEEN ENKEL script in scripts/ geeft nog iets aan `--command` mee zonder het
 *       er eerst door te halen — een statische controle op de aanroeppunten zelf
 *
 * Punt 2 is de eigenlijke bewaker. Punt 1 zorgt dat de bewaker klopt.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { oneLine, asCommandArg, CMD_MAX, assertSafeArg, __flattenCommand } from '../scripts/lib/wrangler.mjs';
import { statements as splitStatements } from '../scripts/lib/sql.mjs';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `expected ${JSON.stringify(want)} got ${JSON.stringify(shown ?? got)}`}`);
}

console.log('\nVISUAILS — argumenten voor wrangler\n');

/* ══ 1 · inkorten ═════════════════════════════════════════════════════════ */
console.log('SQL op één regel');
ok('twee regels worden één', oneLine('SELECT a\n  FROM t'), 'SELECT a FROM t');
ok('overtollige witruimte gaat weg', oneLine('SELECT   a,\n\t b  FROM t'), 'SELECT a, b FROM t');
ok('een tabulator net zo goed', /[\n\r\t]/.test(oneLine('SELECT a\n\tFROM t') || 'x'), false);
ok('witruimte BINNEN een tekstwaarde blijft staan', oneLine("SELECT 'twee  spaties'"), "SELECT 'twee  spaties'");
ok('een ontsnapte apostrof breekt de string niet', oneLine("SELECT 'het''s zo'\n  FROM t"), "SELECT 'het''s zo' FROM t");
ok('een regeleinde binnen een tekstwaarde geeft null', oneLine("SELECT 'a\nb'"), null);
ok('een niet-gesloten aanhalingsteken geeft null', oneLine("SELECT 'a FROM t"), null);

console.log('\nwanneer --command niet meer kan');
ok('te lang gaat via een bestand', asCommandArg(`SELECT ${'a'.repeat(CMD_MAX)}`), null);
ok('een dubbel aanhalingsteken ook', asCommandArg('SELECT "kolom" FROM t'), null);
ok('en gewone SQL komt er wel door', asCommandArg('SELECT a\n FROM t'), 'SELECT a FROM t');

/* Wat asCommandArg() teruggeeft moet ook door de veiligheidscontrole van dit
 * project komen — anders is het één van de twee regels wél en de andere niet. */
console.log('\nen wat eruit komt is een veilig argument');
{
  const line = asCommandArg('SELECT a\n  FROM t WHERE b = 1');
  let threw = false;
  try { assertSafeArg(line, 'sql'); } catch { threw = true; }
  ok('assertSafeArg accepteert het resultaat', threw, false);
}

/* ══ 2 · elke echte migratie ══════════════════════════════════════════════ */
console.log('\nde echte migraties');
{
  const dir = new URL('../migrations/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  ok('er zijn migraties om te controleren', files.length > 20, true, files.length);

  let statements = 0;
  const problems = [];
  for (const f of files) {
    const sql = readFileSync(new URL(f, dir), 'utf8');
    /*
     * MET DEZELFDE SPLITSING ALS MIGRATE.MJS, en dat is het hele punt van lib/sql.mjs.
     *
     * Mijn eerste versie hakte hier ruwweg op puntkomma, zonder eerst het commentaar
     * weg te halen. Drie migraties hebben een apostrof in een commentaarregel — een
     * Nederlandse bezitsvorm — en daardoor dacht oneLine() dat het middenin een
     * tekstwaarde stond en gaf `null`. De test wees dus drie migraties aan die
     * kerngezond zijn, omdat de test iets anders inlas dan wat er draait.
     */
    for (const stmt of splitStatements(sql)) {
      statements++;
      const line = oneLine(stmt);
      if (line === null) { problems.push(`${f}: niet in te korten`); continue; }
      if (/[\n\r]/.test(line)) problems.push(`${f}: nog een regeleinde na inkorten`);
      if (line.length > CMD_MAX) problems.push(`${f}: ${line.length} tekens, boven ${CMD_MAX}`);
    }
  }
  ok(`${statements} opdrachten nagekeken`, statements > 100, true, statements);
  ok('geen enkele met een regeleinde erin', problems.length, 0, problems.slice(0, 3));
}

/* ══ 3 · HET VANGNET IN wrangler() ════════════════════════════════════════ */
console.log('\nhet vangnet in de aanroeplaag');
{
  const raw = ['d1', 'execute', 'visuails', '--remote', '--json', '--command', 'SELECT a\n  FROM t'];
  const out = __flattenCommand(raw);
  ok('meerregelige SQL wordt ingekort', out[6], 'SELECT a FROM t');
  ok('en de rest van de argumenten blijft staan', out.slice(0, 6).join(' '), raw.slice(0, 6).join(' '));
  ok('de oorspronkelijke lijst wordt niet aangepast', raw[6].includes('\n'));

  const noCmd = ['d1', 'export', 'visuails', '--remote', '--output', 'x.sql'];
  ok('zonder --command verandert er niets', __flattenCommand(noCmd), noCmd);
  ok('--command als laatste argument crasht niet', __flattenCommand(['d1', '--command']).length, 2);

  /* Niet in te korten gaat ONGEWIJZIGD door — de aanroeper (migrate.mjs) heeft dan
   * zijn eigen terugval naar een bestand, en die mag dit niet in de weg zitten. */
  const unsafe = ['--command', "INSERT INTO t VALUES ('regel\neinde')"];
  ok('wat niet veilig kan, blijft zoals het was', __flattenCommand(unsafe)[1], unsafe[1]);
}

/* ══ 4 · DE BEWAKER · geen ruwe SQL meer aan --command ════════════════════ */
console.log('\ngeen aanroeppunt geeft nog ruwe SQL mee');
{
  const dir = new URL('../scripts/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs'));
  const offenders = [];
  for (const f of files) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    /*
     * Elk `'--command', <iets>` opzoeken en kijken wat dat <iets> is. Toegestaan is
     * een naam (een variabele die er al door heen is, zoals `sql` of
     * INVENTORY_SQL) of een aanroep van oneLine/asCommandArg. Verboden is een
     * letterlijke template-string, want dan staat de SQL ter plekke — en dan staat
     * er vroeg of laat een regeleinde in.
     */
    for (const m of src.matchAll(/'--command',\s*([^\n]{0,40})/g)) {
      const arg = m[1].trim();
      if (arg.startsWith('`') || arg.startsWith("'") || arg.startsWith('"')) {
        offenders.push(`${f}: ${arg.slice(0, 30)}…`);
      }
    }
  }
  ok('geen letterlijke SQL bij --command', offenders.length, 0, offenders);

  /* Dat __flattenCommand geëxporteerd is, bewijst niet dat wrangler() hem gebruikt.
   * Zonder deze regel kan het vangnet losgekoppeld raken terwijl elke test hierboven
   * groen blijft — een vangnet dat alleen in de test hangt. */
  const lib = readFileSync(new URL('lib/wrangler.mjs', dir), 'utf8');
  ok('wrangler() haalt zijn argumenten door het vangnet', /const argv = flattenCommand\(rawArgv\)/.test(lib));

  /* En de omgekeerde controle: de plek die het fout deed, doet het nu goed. Zonder
   * dit zou de bewaker hierboven ook groen staan als backup.mjs de inventaris
   * helemaal niet meer opvraagt. */
  const backup = readFileSync(new URL('backup.mjs', dir), 'utf8');
  ok('backup.mjs haalt zijn inventaris door asCommandArg', /asCommandArg\(/.test(backup));
  ok('en vraagt de inventaris nog steeds op', /FROM files f LEFT JOIN orders/.test(backup));
  ok('een mislukte inventaris is geen geslaagde back-up', /process\.exitCode = 1/.test(backup));
  ok('en "leeg" en "mislukt" zijn twee berichten', /geen bestanden in de database/.test(backup));

  /* migrate.mjs heeft zijn eigen kopie niet meer. Zou die terugkomen, dan gaan de
   * twee weer uit elkaar lopen zodra er één wordt aangepast. */
  const migrate = readFileSync(new URL('migrate.mjs', dir), 'utf8');
  ok('migrate.mjs importeert oneLine in plaats van het te herhalen', /import \{[^}]*oneLine[^}]*\} from '\.\/lib\/wrangler\.mjs'/.test(migrate));
  ok('en heeft er geen eigen definitie meer van', /function oneLine\(/.test(migrate), false);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
