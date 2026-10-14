/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN BACK-UP DIE JE KUNT TERUGZETTEN — 8 oktober 2026 (punt 9.04)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos (V6 = c): de back-up gaat naar Google Drive. De vier eisen van 9.04,
 * en wat deze test van elk vasthoudt (zonder wrangler en zonder netwerk):
 *
 *   1 · ZONDER INLOGGEHEIMEN — de zes tabellen gaan leeg mee; een dump waar er
 *       toch één in staat, is "niet gecontroleerd";
 *   2 · GECONTROLEERD — een dump wordt ingelezen; een kapotte dump valt op;
 *   3 · MÉT DE PROMPTS — de map gaat mee, ook met submappen;
 *   4 · TERUG TE ZETTEN — de proef vergelijkt tellingen, en de uitleg ligt
 *       naast elke back-up;
 *   en: de bestemming (Drive, of luid lokaal), het opruimen dat alleen echte sets
 *   raakt, de 8 weken uit retention.js, en de .bat-bestanden voor Windows.
 *
 * De volledige weg met wrangler (export, terugzetten in een lege lokale D1) is op
 * 8 oktober 2026 met de hand doorlopen: zie het verslag van die dag.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  GEHEIME_TABELLEN, tabellenVoorDump, kiesBestemming, leesBestemmingBestand, kopieerMap,
  controleerDump, controleRegel, setsOmWegTeDoen, hoortBijSet, nieuwsteDump,
} from '../scripts/lib/backupdelen.mjs';
import { vergelijk } from '../scripts/terugzetten.mjs';
import { schoonPad, driveKandidaten, zetBestemming } from '../scripts/backup-instellen.mjs';
import { BACKUP_KEEP } from '../src/lib/retention.js';

let goed = 0, fout = 0;
function ok(naam, kreeg, verwacht = true, toon) {
  const p = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(toon ?? kreeg)}`}`);
}
const ROOT = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visuails-backuptest-'));

/* Een dump zoals scripts/backup.mjs hem maakt: de opbouw van het echte schema en
   een paar INSERTs, in de vorm die `wrangler d1 export` schrijft. */
function maakDump({ geheim = false, kapot = false } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(lees('schema.sql'));
  const opbouw = db.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name").all().map((r) => `${r.sql};`).join('\n');
  const inhoud = [
    `INSERT INTO "customers" ("id","email","name") VALUES(1,'klant@voorbeeld.test',replace('Regel een\\nregel twee; met ''quote''','\\n',char(10)));`,
    `INSERT INTO "orders" ("id","ref","customer_id","service","email") VALUES(1,'VIS-AAA-111',1,'catalog','klant@voorbeeld.test');`,
    `INSERT INTO "order_events" ("order_id","status","note") VALUES(1,'received','x');`,
    geheim ? `INSERT INTO "admin_users" ("email","password_hash","totp_secret") VALUES('admin@voorbeeld.test','HASH','TOTP');` : '',
    kapot ? 'INSERT INTO "orders" VALUES(' : '',
  ].filter(Boolean).join('\n');
  return `PRAGMA defer_foreign_keys=TRUE;\n${opbouw}\n${inhoud}\n`;
}

console.log('\nVISUAILS — de back-up die je kunt terugzetten\n');

/* ══ 1 · ZONDER INLOGGEHEIMEN ══════════════════════════════════════════════ */
console.log('1 · zonder inloggeheimen');
{
  ok('de zes tabellen uit de naslag', GEHEIME_TABELLEN.slice().sort(),
    ['account_sessions', 'account_tokens', 'admin_recovery_codes', 'admin_sessions', 'admin_users', 'rate_limits']);
  const lijst = tabellenVoorDump(['orders', 'customers', 'admin_users', 'admin_sessions', 'account_tokens', 'rate_limits', '_cf_KV', 'sqlite_sequence', 'sqlite_stat1', 'order_tokens', 'app_settings']);
  ok('de inhoud van de geheime tabellen gaat niet mee', lijst.some((t) => GEHEIME_TABELLEN.includes(t)), false, lijst);
  ok('de interne tabellen van Cloudflare ook niet', lijst.includes('_cf_KV'), false);
  ok('sqlite_sequence wel (de hoogste id per tabel)', lijst.includes('sqlite_sequence'), true);
  ok('order_tokens en app_settings wel (privélinks en zouten werken na herstel)', lijst.includes('order_tokens') && lijst.includes('app_settings'), true);
  const src = lees('scripts/backup.mjs');
  ok('backup.mjs exporteert de opbouw apart (--no-data)', /'--no-data'/.test(src), true);
  ok('en de inhoud alleen per toegestane tabel (--no-schema --table)', /'--no-schema', \.\.\.metInhoud\.flatMap\(\(t\) => \['--table', t\]\)/.test(src), true);
  ok('er is geen volledige export meer zonder --table', /\['d1', 'export', DB, '--remote', '-y', '--output', sqlFile\]/.test(src), false);
}

/* ══ 2 · GECONTROLEERD ════════════════════════════════════════════════════ */
console.log('\n2 · elke dump wordt ingelezen en gecontroleerd');
{
  const c = await controleerDump(maakDump());
  ok('een goede dump: in orde', c.ok, true, c.reden);
  ok('met het aantal tabellen uit het schema', c.tabellen >= 40, true, c.tabellen);
  ok('en de rijen geteld', [c.perTabel.customers, c.perTabel.orders, c.perTabel.order_events], [1, 1, 1]);
  ok('de geheime tabellen staan erin, leeg', GEHEIME_TABELLEN.every((t) => c.perTabel[t] === 0), true);
  const lek = await controleerDump(maakDump({ geheim: true }));
  ok('een dump MET een inloggeheim is niet in orde', lek.ok, false);
  ok('en zegt welke tabel', /inloggeheimen in de dump: admin_users/.test(lek.reden || ''), true, lek.reden);
  const kapot = await controleerDump(maakDump({ kapot: true }));
  ok('een afgebroken dump is niet in orde', kapot.ok, false);
  ok('en zegt dat hij niet laadt', /laadt niet/.test(kapot.reden || ''), true, kapot.reden);
  const regel = controleRegel(c, { waar: 'drive', map: 'G:\\Mijn Drive\\VISUAILS back-ups', prompts: { bestanden: 37 } });
  ok('de regel voor /admin', regel, `gecontroleerd, ${c.tabellen} tabellen, ${c.rijen} rijen | in Google Drive | prompts mee (37 bestanden)`);
  const lokaal = controleRegel(lek, { waar: 'lokaal', reden: 'de map G:\\Mijn Drive\\x bestaat niet', prompts: { bestanden: null, reden: 'map niet gevonden' } });
  ok('een slechte, lokale back-up zegt dat allebei', /^NIET gecontroleerd/.test(lokaal) && /LOKAAL op de pc/.test(lokaal) && /prompts NIET mee/.test(lokaal), true, lokaal);
  ok('zonder aanhalingstekens of tekens buiten ASCII (cmd.exe)', /["'\u0080-\uffff]/.test(controleRegel({ ok: false, reden: 'fout "één" \'x\'' }, { waar: 'drive' })), false);
  const src = lees('scripts/backup.mjs');
  ok('backup.mjs schrijft backup_check mee met de datum', /'backup_check'/.test(src) && /'backup_last_run'/.test(src), true);
  const admin = lees('src/lib/admin.js');
  ok('/admin leest backup_check voor de chip', /'backup_check'/.test(admin), true);
}

/* ══ 3 · MÉT DE PROMPTS ═══════════════════════════════════════════════════ */
console.log('\n3 · de map Prompts gaat mee');
{
  const bron = path.join(tmp, 'Prompts');
  fs.mkdirSync(path.join(bron, 'looks', 'glow'), { recursive: true });
  fs.writeFileSync(path.join(bron, 'catalog.txt'), 'een prompt');
  fs.writeFileSync(path.join(bron, 'looks', 'glow', 'boven.txt'), 'nog een');
  const k = kopieerMap(bron, path.join(tmp, 'set-prompts'));
  ok('twee bestanden, ook uit een submap', k.bestanden, 2);
  ok('met hun inhoud', fs.readFileSync(path.join(tmp, 'set-prompts', 'looks', 'glow', 'boven.txt'), 'utf8'), 'nog een');
  ok('de standaardmap is VISUAILS\\Prompts in de thuismap', /VISUAILS[\\/]Prompts$/.test((await import('../scripts/lib/backupdelen.mjs')).promptsMap({})), true);
}

/* ══ 4 · TERUG TE ZETTEN ══════════════════════════════════════════════════ */
console.log('\n4 · de proef op het terugzetten');
{
  ok('gelijke tellingen: geen verschil', vergelijk({ orders: 3, customers: 2 }, { orders: 3, customers: 2, admin_users: 0 }), []);
  ok('een tabel met minder rijen valt op', vergelijk({ orders: 3 }, { orders: 2 }), ['orders: 2 in plaats van 3']);
  ok('een ontbrekende tabel ook', vergelijk({ files: 0 }, {}), ['files: ontbreekt']);
  ok('en een geheime tabel met rijen', vergelijk({}, { admin_users: 1 }).length, 1);
  const uitleg = lees('scripts/TERUGZETTEN.txt');
  ok('de uitleg bestaat, met CRLF voor Kladblok', uitleg.includes('\r\n'), true);
  ok('en noemt de proef (BACKUP.bat, keuze 3)', /BACKUP\.bat[^.]*kies 3/.test(uitleg), true);
  ok('en Time Travel als eerste keus', /Time Travel/.test(uitleg), true);
  ok('en het opnieuw neerzetten van het adminaccount', /hash-admin-password\.mjs/.test(uitleg), true);
  ok('backup.mjs zet hem naast elke back-up', /LEESMIJ-TERUGZETTEN\.txt/.test(lees('scripts/backup.mjs')), true);
  ok('terugzetten.mjs gebruikt een LEGE lokale database', /'--local', '--persist-to', tijdelijk/.test(lees('scripts/terugzetten.mjs')), true);
  ok('en nooit --remote', /--remote/.test(lees('scripts/terugzetten.mjs').replace(/^\s*\*.*$/gm, '').replace(/\/\/.*$/gm, '')), false);
  const map = path.join(tmp, 'drive');
  fs.mkdirSync(map);
  for (const n of ['2026-10-04-1300-d1.sql', '2026-10-11-1300-d1.sql', 'LEESMIJ-TERUGZETTEN.txt']) fs.writeFileSync(path.join(map, n), '');
  ok('de nieuwste dump wordt gekozen', path.basename(nieuwsteDump(map)), '2026-10-11-1300-d1.sql');
}

/* ══ BESTEMMING, OPRUIMEN, TERMIJN ════════════════════════════════════════ */
console.log('\n5 · waar de kopie heen gaat');
{
  const root = path.join(tmp, 'project');
  fs.mkdirSync(path.join(root, 'backups'), { recursive: true });
  const leeg = kiesBestemming({ root, argv: [], env: {} });
  ok('zonder instelling: lokaal, met de reden', [leeg.waar, /nog geen Drive-map/.test(leeg.reden)], ['lokaal', true]);
  const drive = path.join(tmp, 'Mijn Drive', 'VISUAILS back-ups');
  zetBestemming(drive, path.join(root, 'backups', 'BESTEMMING.txt'));
  ok('instellen schrijft BESTEMMING.txt', leesBestemmingBestand(path.join(root, 'backups', 'BESTEMMING.txt')), drive);
  ok('en maakt de map aan', fs.existsSync(drive), true);
  ok('daarna: naar Drive', kiesBestemming({ root, argv: [], env: {} }), { map: drive, waar: 'drive', reden: null });
  const weg = kiesBestemming({ root, argv: [], env: {}, bestaat: () => false });
  ok('staat Drive niet aan: luid lokaal, niet stil ergens anders', [weg.map, weg.waar, /bestaat niet/.test(weg.reden)], [path.join(root, 'backups'), 'lokaal', true]);
  ok('--naar wint', kiesBestemming({ root, argv: ['--naar', tmp], env: {} }).map, tmp);
  ok('een geplakt pad wordt schoongemaakt', schoonPad('\u0016"G:\\Mijn Drive\\VISUAILS back-ups" '), 'G:\\Mijn Drive\\VISUAILS back-ups');
  ok('Drive wordt gezocht op G:\\Mijn Drive', driveKandidaten({ platform: 'win32', home: 'C:\\Users\\Proef', bestaat: (p) => p === 'G:\\Mijn Drive' }), ['G:\\Mijn Drive']);
}
console.log('\n6 · opruimen raakt alleen echte sets');
{
  const namen = ['2026-08-02-1300-d1.sql', '2026-08-02-1300-r2.json', '2026-08-09-1300-d1.sql', '2026-08-09-1300-prompts',
    '2026-08-16-1300-d1.sql', '_log', 'BESTEMMING.txt', 'LEESMIJ-TERUGZETTEN.txt'];
  ok('twee bewaren: de oudste set gaat', setsOmWegTeDoen(namen, 2), ['2026-08-02-1300']);
  ok('_log, BESTEMMING.txt en de uitleg tellen nooit als set', setsOmWegTeDoen(namen, 1).some((s) => !/^\d{4}-/.test(s)), false);
  ok('de prompts horen bij hun set', hoortBijSet('2026-08-09-1300-prompts', '2026-08-09-1300'), true);
  ok('zonder geldig aantal gaat er niets weg', setsOmWegTeDoen(namen, 0), []);
  ok(`de standaard is BACKUP_KEEP uit retention.js (${BACKUP_KEEP})`, /BACKUP_KEEP;/.test(lees('scripts/backup.mjs')) && /return Number\.isInteger\(n\) && n > 0 \? n : BACKUP_KEEP;/.test(lees('scripts/backup.mjs')), true);
}

/* ══ DE .BAT-BESTANDEN ════════════════════════════════════════════════════ */
console.log('\n7 · dubbelklikken, geen CMD');
{
  const bat = fs.readFileSync(new URL('BACKUP.bat', ROOT), 'latin1');
  ok('BACKUP.bat heeft CRLF-regeleinden', !/[^\r]\n/.test(bat), true);
  ok('springt naar zijn eigen map (spaties en haakjes in het pad)', /cd \/d "%~dp0"/.test(bat), true);
  ok('controleert dat hij in de projectmap staat', /if not exist "astro\.config\.mjs" goto nietindemap/.test(bat), true);
  ok('drie keuzes: instellen, nu, proef', /choice \/c 1234/.test(bat) && /backup-instellen\.mjs/.test(bat) && /backup-weekly\.bat/.test(bat) && /terugzetten\.mjs/.test(bat), true);
  ok('geen blokken tussen haakjes (daar breken paden met haakjes)', /\(\s*$/m.test(bat.replace(/^REM.*$/gim, '')), false);
  ok('alleen ASCII (cmd.exe en zijn codepagina)', /[^\x00-\x7F]/.test(bat), false);
  const week = fs.readFileSync(new URL('scripts/backup-weekly.bat', ROOT), 'latin1');
  ok('backup-weekly.bat blijft CRLF', !/[^\r]\n/.test(week), true);
  /* o11 (8 okt): vier wekelijkse sets; k-back (12 okt): drie, "uiterlijk na 8 weken". */
  ok('en geeft --keep 3 mee (gelijk aan BACKUP_KEEP)', /--keep 3\b/.test(week) && !/--keep [48]\b/.test(week) && BACKUP_KEEP === 3, true);
  ok('de Taakplanner haalt een gemiste start in (StartWhenAvailable)', /-StartWhenAvailable/.test(lees('scripts/install-backup-task.ps1')), true);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
