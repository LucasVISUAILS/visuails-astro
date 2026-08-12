/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BACK-UPWACHT — DE ENIGE BEWAKING DIE BUITEN DEZE CODEBASE KIJKT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `npm run backup` draait op Lucas' Windows-machine, met een taak in de Taakplanner
 * (scripts/backup-weekly.bat). Die taak kán stilvallen — laptop uit, wachtwoord
 * verlopen, wrangler-login weg, schijf vol — en dan gebeurt er niets. Niets is
 * onzichtbaar: geen mail, geen melding, geen ontbrekend bestand op een plek waar je
 * kijkt. Je merkt het op de dag dat je de back-up nodig hebt, en dat is de enige dag
 * waarop het niet meer op te lossen is.
 *
 * Dus: de back-up schrijft bij elke geslaagde ronde een datum in `app_settings`, en
 * `checkBackupAge()` in cron/index.js leest die elke nacht. De alarmbel hangt in de
 * cloud en de back-up op de schijf, want een PC die het probleem is kan het probleem
 * niet melden.
 *
 * WAT HIER WORDT VASTGEHOUDEN, EN WAAROM ELK PUNT EEN EIGEN MANIER VAN MISGAAN IS:
 *
 *   1 · HIJ WAARSCHUWT als er niets staat of als het te oud is. Zonder deze regels is
 *       de hele bewaking dood code die niemand mist.
 *   2 · HIJ ZWIJGT als het goed is. Een wacht die elke nacht mailt, is na een week een
 *       mail die je wegveegt — en dan mis je de nacht dat er wél iets staat. Dit is de
 *       reden dat de nachtelijke taak überhaupt zwijgt als er niets is.
 *   3 · HIJ ZWIJGT OOK als hij vorige week al gewaarschuwd heeft. Dit is de rem, en hij
 *       is met opzet niet "één keer en klaar": na zeven dagen komt het bericht terug,
 *       want een back-up die drie weken stilstaat is drie keer erger dan een die één
 *       week stilstaat.
 *   4 · "NOG NOOIT" EN "TE OUD" ZIJN TWEE BERICHTEN. Het eerste wijst naar de
 *       Taakplanner (bestaat de taak?), het tweede naar de laatste keer dat hij wél
 *       liep. Eén tekst voor beide zou je de verkeerde kant op sturen.
 *   5 · HIJ VALT NOOIT DE NACHT OM. Geen tabel, geen binding, rommel in de kolom: dan
 *       is het antwoord "niets te melden" of "ik weet het niet", nooit een fout die de
 *       drie taken die écht werk doen meesleurt.
 *
 * De datums gaan er als tekst in, precies zoals scripts/backup.mjs ze schrijft
 * ('YYYY-MM-DD HH:MM'), tegen het ECHTE schema.sql — niet tegen een tabel die deze
 * test zelf verzint. Wijkt `app_settings` ooit af, dan valt dat hier om.
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tasks, BACKUP_WATCH } from '../cron/index.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  const label = good ? ' ok  ' : ' FAIL';
  console.log(`${label} ${name.padEnd(62)}${good ? '' : `expected ${JSON.stringify(want)} got ${JSON.stringify(shown ?? got)}`}`);
}

/* ── D1 op node:sqlite ──────────────────────────────────────────────────────
 * Alleen wat de taak gebruikt: prepare().bind().all() / .run(). `noTable` bootst een
 * database na waar schema.sql nooit op gedraaid is — punt 5 hierboven. */
function d1(db, { noTable = false } = {}) {
  return {
    prepare(sql) {
      const st = {
        _a: [],
        bind(...a) { st._a = a; return st; },
        async all() {
          if (noTable) throw new Error('D1_ERROR: no such table: app_settings');
          return { results: db.prepare(sql).all(...st._a) };
        },
        async run() {
          if (noTable) throw new Error('D1_ERROR: no such table: app_settings');
          return { success: true, meta: db.prepare(sql).run(...st._a) };
        },
      };
      return st;
    },
  };
}

function fresh() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  return db;
}

/* Een stempel zoals scripts/backup.mjs hem schrijft, N dagen terug. */
function stampDaysAgo(days) {
  const d = new Date(Date.now() - days * 864e5);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function put(db, key, value) {
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

const read = (db, key) => db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key)?.value ?? null;

console.log('\nVISUAILS — de back-upwacht\n');

console.log(`de grenzen komen uit cron/index.js (${BACKUP_WATCH.BACKUP_STALE_DAYS} dagen oud, hoogstens elke ${BACKUP_WATCH.BACKUP_WARN_EVERY_DAYS} dagen)`);
ok('de vervalgrens is een heel aantal dagen', Number.isInteger(BACKUP_WATCH.BACKUP_STALE_DAYS));
/* De rem MOET korter zijn dan de grens. Was hij langer, dan zou een back-up die net
 * over de grens gaat en daarna weer gemaakt wordt, een waarschuwing kunnen krijgen
 * over een toestand die al voorbij was. */
ok('en de rem is korter dan de grens',
  BACKUP_WATCH.BACKUP_WARN_EVERY_DAYS < BACKUP_WATCH.BACKUP_STALE_DAYS);

console.log('\nwanneer hij zwijgt');
{
  const db = fresh();
  put(db, 'backup_last_run', stampDaysAgo(0));
  ok('een back-up van vandaag levert geen bericht', await tasks.checkBackupAge({ DB: d1(db) }), null);
}
{
  const db = fresh();
  put(db, 'backup_last_run', stampDaysAgo(BACKUP_WATCH.BACKUP_STALE_DAYS - 1));
  ok('één dag binnen de grens ook niet', await tasks.checkBackupAge({ DB: d1(db) }), null);
}
{
  /* Geen binding is een lokale run of een test, niet een storing. */
  ok('zonder database geen bericht', await tasks.checkBackupAge({}), null);
}
{
  const db = fresh();
  ok('en zonder app_settings-tabel ook niet — geen worp',
    await tasks.checkBackupAge({ DB: d1(db, { noTable: true }) }), null);
}

console.log('\nwanneer hij waarschuwt');
{
  const db = fresh();
  const line = await tasks.checkBackupAge({ DB: d1(db) });
  ok('een lege tabel geeft een bericht', typeof line === 'string' && line.length > 0, true, line);
  ok('en dat bericht zegt dat er er geen enkele is',
    /geen enkele geslaagde back-up/.test(line || ''), true, line);
  /* Punt 4: dit bericht mag GEEN aantal dagen noemen, want er is geen dag om te noemen. */
  ok('zonder een verzonnen aantal dagen', /\d+ dagen oud/.test(line || ''), false, line);
  ok('en de waarschuwingsdatum is weggeschreven', typeof read(db, 'backup_warned_at'), 'string');
}
{
  const db = fresh();
  put(db, 'backup_last_run', stampDaysAgo(15));
  const line = await tasks.checkBackupAge({ DB: d1(db) });
  ok('een back-up van vijftien dagen geeft een bericht', typeof line === 'string', true, line);
  ok('met het aantal dagen erin', /15 dagen oud/.test(line || ''), true, line);
  ok('en de datum zelf, zodat je weet waar je kijkt',
    (line || '').includes(stampDaysAgo(15)), true, line);
}
{
  /* Rommel in de kolom valt bij "nog nooit" en niet bij "in orde": er staat iets, we
   * kunnen het niet lezen, en dan is er iets met het schrijven — even dringend. */
  const db = fresh();
  put(db, 'backup_last_run', 'gisteren ergens');
  const line = await tasks.checkBackupAge({ DB: d1(db) });
  ok('een onleesbare datum wordt niet voor "in orde" aangezien',
    /geen enkele geslaagde back-up/.test(line || ''), true, line);
}

console.log('\nde rem op het herhalen');
{
  const db = fresh();
  put(db, 'backup_last_run', stampDaysAgo(20));
  put(db, 'backup_warned_at', stampDaysAgo(2));
  ok('twee dagen na een waarschuwing zwijgt hij',
    await tasks.checkBackupAge({ DB: d1(db) }), null);
}
{
  const db = fresh();
  put(db, 'backup_last_run', stampDaysAgo(20));
  put(db, 'backup_warned_at', stampDaysAgo(BACKUP_WATCH.BACKUP_WARN_EVERY_DAYS + 1));
  const line = await tasks.checkBackupAge({ DB: d1(db) });
  ok('maar acht dagen erna komt het bericht terug', typeof line === 'string', true, line);
  /* En de rem wordt opnieuw gezet, anders komt hij daarna elke nacht. */
  ok('en de rem wordt opnieuw gezet',
    (read(db, 'backup_warned_at') || '').slice(0, 10), new Date().toISOString().slice(0, 10));
}
{
  /* TWEE NACHTEN OP EEN RIJ, met dezelfde database. Dit is de check die het verschil
   * ziet tussen "de rem bestaat" en "de rem werkt": zonder het wegschrijven van
   * backup_warned_at zou de tweede aanroep opnieuw een bericht geven. */
  const db = fresh();
  put(db, 'backup_last_run', stampDaysAgo(30));
  const eerste = await tasks.checkBackupAge({ DB: d1(db) });
  const tweede = await tasks.checkBackupAge({ DB: d1(db) });
  ok('de eerste nacht meldt', typeof eerste, 'string');
  ok('de nacht erna niet meer', tweede, null);
}

console.log('\nen hij staat in de nachtelijke lus');
{
  const src = readFileSync(new URL('../cron/index.js', import.meta.url), 'utf8');
  /* Een taak die bestaat maar niet wordt aangeroepen, is een bewaking die je denkt te
   * hebben. Op de lus zelf en niet op de export, want de export is wat deze test
   * gebruikt — die kan groen staan terwijl `scheduled()` hem nooit aanraakt. */
  const loop = src.split('\n').find((l) => /for \(const task of \[/.test(l)) || '';
  ok('de takenlus bestaat nog', loop.length > 0, true, loop);
  ok('en checkBackupAge staat erin', /checkBackupAge/.test(loop), true, loop);

  /* En het schrijven van de datum staat in de back-up zelf. Op de sleutelnaam, want dat
   * is de enige afspraak tussen twee bestanden die elkaar nooit importeren: het script
   * op de PC en de Worker in de cloud. Hernoemt iemand er één, dan is de bewaking stil
   * en groen — de precieze fout die dit hele bestand moet uitsluiten. */
  const backup = readFileSync(new URL('../scripts/backup.mjs', import.meta.url), 'utf8');
  ok('scripts/backup.mjs schrijft backup_last_run', backup.includes("'backup_last_run'"), true);
  ok('en cron/index.js leest dezelfde sleutel', src.includes('backup_last_run'), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
