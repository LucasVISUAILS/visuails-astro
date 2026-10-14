/**
 * UITROLLEN.bat → scripts/uitrol.mjs (punt 9.02, 8 oktober 2026).
 *
 * Claude draait de uitrol nooit echt. Deze test speelt hem na in een tijdelijke
 * map: een echte git-map met een echte "GitHub" ernaast (een kale repository op
 * schijf), en een nep-npm, nep-wrangler en nep-internet. Zo is elke stap te
 * zien — en vooral: dat een fout in stap n stopt vóór er iets live gaat.
 *
 *   npm run test:uitrol
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {
  uitrollen, terugdraaien, echteRun, leesStatus, koppelVerplaatsingen, geheimenControle, nepSleutel,
  voetafdruk, vergelijkMigraties, leesSchema, SCHEMA_SQL, commitBericht, eindscherm, logRegel, toonBestanden,
  versieVan, kijkNa, ADRESSEN,
} from '../scripts/uitrol.mjs';

let goed = 0, totaal = 0;
function ok(naam, kreeg, wil = true) {
  totaal++;
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) goed++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${naam}${g ? '' : `  verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const ECHT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uitrol-'));
const stil = () => {};
const NU = () => new Date(2026, 9, 8, 14, 32);
const lees = (p) => fs.readFileSync(p, 'utf8');

/* ── 1 · losse onderdelen ─────────────────────────────────────────────────── */
console.log('\nde onderdelen');

ok('git status -z wordt gelezen', leesStatus(' M src/a.js\0?? docs/b.md\0 D oud.md\0R  nieuw.md\0van.md\0'), [
  { pad: 'src/a.js', soort: 'gewijzigd' }, { pad: 'docs/b.md', soort: 'nieuw' }, { pad: 'oud.md', soort: 'weg' },
  { pad: 'nieuw.md', van: 'van.md', soort: 'verplaatst' },
]);
ok('weg + nieuw met dezelfde naam heet "verplaatst"',
  koppelVerplaatsingen([{ pad: 'DESIGN.md', soort: 'weg' }, { pad: 'docs/DESIGN.md', soort: 'nieuw' }, { pad: 'x.js', soort: 'gewijzigd' }]),
  [{ pad: 'x.js', soort: 'gewijzigd' }, { pad: 'docs/DESIGN.md', van: 'DESIGN.md', soort: 'verplaatst' }]);
ok('de lijst op het scherm zegt het in gewone woorden',
  toonBestanden([{ pad: 'DESIGN.md', soort: 'weg' }, { pad: 'docs/DESIGN.md', soort: 'nieuw' }, { pad: 'src/a.js', soort: 'gewijzigd' }]).split('\n'),
  ['Dit gaat mee: 2 bestand(en) (1 gewijzigd, 1 verplaatst)', '   gewijzigd  src/a.js', '   verplaatst DESIGN.md  ->  docs/DESIGN.md']);

/* Sleutels worden hier in stukjes gemaakt, zodat dit testbestand zelf er geen bevat. */
const echteMollie = ['li', 've_', 'Qx7mP2vR9tLk4WbZ8nYc3HdF6sJg1Ae'].join('');
const echteResend = ['r', 'e_', 'Kf83jsQp_', 'Zx9VbN2mLq7WcT4hRy6u'].join('');
ok('een echte sleutel is geen nepsleutel', [nepSleutel(echteMollie), nepSleutel(echteResend)], [false, false]);
ok('het alfabet, nullen en het voorbeeld van Mollie zijn nep', [
  nepSleutel(['test', '_abcdefghijklmnopqrstuvwxyz0123'].join('')), nepSleutel(['test', '_0000000000000000000000000000000000'].join('')),
  nepSleutel(['test', '_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM'].join('')),
], [true, true, true]);

const g = path.join(tmp, 'geheim');
const zet = (w, p, t) => { fs.mkdirSync(path.dirname(path.join(w, p)), { recursive: true }); fs.writeFileSync(path.join(w, p), t); };
zet(g, '.dev.vars', 'MOLLIE_API_KEY=x');
zet(g, 'src/sleutel.js', `const k = '${echteMollie}';`);
zet(g, 'tests/nep.test.mjs', `const k = '${['test', '_abcdefghijklmnopqrstuvwxyz0123'].join('')}';`);
zet(g, 'kladblok/export.sql', 'x');
zet(g, 'kladblok/losse.sql', Array.from({ length: 60 }, (_, i) => `INSERT INTO t VALUES (${i});`).join('\n'));
zet(g, 'migrations/0099-veel.sql', Array.from({ length: 60 }, (_, i) => `INSERT INTO t VALUES (${i});`).join('\n'));
zet(g, 'public/groot.bin', '');
fs.truncateSync(path.join(g, 'public/groot.bin'), 26 * 1024 * 1024);
const pr = geheimenControle(g, ['.dev.vars', 'src/sleutel.js', 'tests/nep.test.mjs', 'kladblok/export.sql', 'kladblok/losse.sql', 'migrations/0099-veel.sql', 'public/groot.bin']
  .map((pad) => ({ pad, soort: 'nieuw' })).concat([{ pad: 'backups/oud.sql', soort: 'weg' }]));
ok('geheimen: .dev.vars, sleutel, export, dump en een te groot bestand', pr.map((p) => p.pad),
  ['.dev.vars', 'src/sleutel.js', 'kladblok/export.sql', 'kladblok/losse.sql', 'public/groot.bin']);
ok('… een nepsleutel in een test en een migratie met veel INSERTs niet', pr.some((p) => /nep\.test|0099/.test(p.pad)), false);
ok('… en wat weg gaat telt niet', pr.some((p) => p.pad.startsWith('backups')), false);

/* De voetafdruk van een migratie, tegen het echte schema.sql. */
const schemaDb = new DatabaseSync(':memory:');
schemaDb.exec(lees(path.join(ECHT, 'schema.sql')));
const schemaRijen = schemaDb.prepare(SCHEMA_SQL).all().map((r) => ({ ...r }));
const echteMigraties = fs.readdirSync(path.join(ECHT, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
  .map((naam) => ({ naam, sql: lees(path.join(ECHT, 'migrations', naam)), opGithub: true }));
const tegenSchema = vergelijkMigraties(echteMigraties, leesSchema(schemaRijen));
ok('elke migratie in migrations/ staat al in schema.sql (de vraag aan D1 werkt)', tegenSchema.filter((m) => m.status !== 'staat-er').map((m) => `${m.naam}: ${m.mist.join(', ')}`), []);
/* 14 oktober 2026: live gaf deze vraag "not authorized: SQLITE_AUTH" (code 7500),
   omdat D1 elke blik in zijn eigen tabel _cf_KV weigert. SQLite hier kent die
   weigering niet, dus de toets kijkt of de vraag die tabellen overslaat; dat
   D1 hem dan wél beantwoordt, is nagekeken met wrangler d1 execute --local. */
const metD1 = new DatabaseSync(':memory:');
metD1.exec('CREATE TABLE _cf_KV (key TEXT PRIMARY KEY, value BLOB); CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT); INSERT INTO orders (ref) VALUES (\'x\'); CREATE INDEX idx_ref ON orders (ref);');
const metD1Rijen = metD1.prepare(SCHEMA_SQL).all().map((r) => ({ ...r }));
ok('de vraag laat de tabellen van D1 en SQLite zelf weg (_cf_KV, sqlite_sequence)', [...new Set(metD1Rijen.map((r) => r.n))].sort(), ['idx_ref', 'orders']);
const zonder0053 = leesSchema(schemaRijen.filter((r) => !(r.n === 'customers' && r.c === 'btw_land_akkoord')));
ok('zonder customers.btw_land_akkoord is alleen 0053 nieuw', vergelijkMigraties(echteMigraties, zonder0053).filter((m) => m.status !== 'staat-er').map((m) => m.naam), ['0053-btw-land-akkoord.sql']);
ok('… met de naam van wat er mist', vergelijkMigraties(echteMigraties, zonder0053).find((m) => m.naam.startsWith('0053')).mist, ['kolom customers.btw_land_akkoord']);
const v7 = voetafdruk(lees(path.join(ECHT, 'migrations/0007-brand-kit-and-delivery.sql')));
ok('0007 is een ombouw; de nieuwe tabel telt onder zijn eindnaam', [v7.ombouw, v7.tabellen], [true, ['customer_style_locks']]);
const zonderDelivered = leesSchema(schemaRijen.filter((r) => !(r.n === 'orders' && r.c === 'delivered_at')));
ok('een ombouw die nog moet, wordt "ombouw" (de knop draait hem niet)', vergelijkMigraties(echteMigraties, zonderDelivered).find((m) => m.naam.startsWith('0007')).status, 'ombouw');
ok('alleen gegevens bijwerken: nieuw als hij nog niet op GitHub staat', vergelijkMigraties([{ naam: '0060-x.sql', sql: 'UPDATE t SET a = 1;', opGithub: false }], leesSchema([]))[0].status, 'nieuw');
ok('… en niet meer zodra hij er staat', vergelijkMigraties([{ naam: '0060-x.sql', sql: 'UPDATE t SET a = 1;', opGithub: true }], leesSchema([]))[0].status, 'staat-er');
ok('DROP INDEX is nieuw zolang de index er nog is', vergelijkMigraties([{ naam: '0044.sql', sql: 'DROP INDEX IF EXISTS idx_x;', opGithub: true }],
  leesSchema([{ k: 'index', n: 'idx_x', c: null }]))[0].status, 'nieuw');

/* Commitbericht. */
const cb = path.join(tmp, 'cb');
zet(cb, 'kladblok/COMMIT-BERICHT.txt', 'a1: uitrolknop\r\n\r\nmet uitleg\r\n');
ok('commitbericht uit kladblok/COMMIT-BERICHT.txt', commitBericht(cb, [], NU()).tekst, 'a1: uitrolknop\n\nmet uitleg');
ok('… maar niet een tweede keer hetzelfde', commitBericht(cb, ['a1: uitrolknop\n\nmet uitleg\n'], NU()).tekst, 'Uitrol 2026-10-08 14:32');

/* Eindschermen. */
const kopVan = (r) => eindscherm(r, NU()).split('\n')[1].trim();
ok('eindscherm live', kopVan({ uitkomst: 'live' }), 'LIVE EN NAGEKEKEN · 8 okt 14:32');
ok('eindscherm gestopt', kopVan({ uitkomst: 'gestopt', stap: 4 }), 'GESTOPT BIJ STAP 4 — er is niets live gezet');
ok('eindscherm cron', kopVan({ uitkomst: 'cron-niet' }), 'SITE LIVE, NACHTWERK NIET — klik nog een keer');
ok('logregel', logRegel({ uitkomst: 'live', commit: 'abc1234', bestanden: [1, 2], nieuweMigraties: [{ naam: '0054-x.sql' }], adressen: [{ goed: true }] }, NU()),
  '2026-10-08 14:32  ·  LIVE EN NAGEKEKEN  ·  commit abc1234  ·  2 bestand(en)  ·  migraties: 0054-x.sql  ·  adressen 1/1');
ok('de versie van een pagina = de gebouwde bestanden die hij laadt',
  versieVan('<link href="/_astro/b.2.css"><script src="/_astro/a.1.js"></script><link href="/_astro/b.2.css">'), '/_astro/a.1.js /_astro/b.2.css');
ok('zes adressen, waaronder /admin/login en /api/capacity', ADRESSEN.map((a) => a.pad),
  ['/', '/nl/', '/start/catalog/', '/account/login', '/admin/login', '/api/capacity?tier=unattended&products=3']);

/* ── 2 · de hele rit in een nagemaakte projectmap ─────────────────────────── */
console.log('\nde hele rit, nagespeeld');

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
let nr = 0;
function maakProject() {
  const w = path.join(tmp, `p${++nr}`);
  const origin = path.join(tmp, `origin${nr}.git`);
  zet(w, 'astro.config.mjs', 'export default {}');
  zet(w, 'package.json', JSON.stringify({ name: 'x', scripts: { test: 'npm run test:bouw && npm run test:a' } }));
  zet(w, 'wrangler.toml', 'name = "visuails-site"\n[[d1_databases]]\ndatabase_name = "visuails"\n');
  zet(w, 'migrations/0001-a.sql', 'ALTER TABLE t ADD COLUMN x TEXT;');
  zet(w, 'migrations/0002-data.sql', 'UPDATE t SET x = 1;');
  zet(w, 'dist/index.html', '<html lang="en"><link href="/_astro/site.NIEUW.css">VISUAILS</html>');
  zet(w, '.gitignore', 'dist/\nkladblok/uitrol-tests.txt\nkladblok/uitrol-log.txt\n_opruimen/*/\n');
  zet(w, '_opruimen/LIJST.txt', '# lijst\r\n');
  git(tmp, 'init', '-q', '--bare', '-b', 'main', origin);
  git(w, 'init', '-q', '-b', 'main');
  git(w, 'config', 'user.email', 'proef@voorbeeld.test');
  git(w, 'config', 'user.name', 'Proef');
  git(w, 'add', '-A');
  git(w, 'commit', '-q', '-m', 'begin');
  git(w, 'remote', 'add', 'origin', origin);
  git(w, 'push', '-q', '-u', 'origin', 'main');
  return { w, origin };
}

/** Nep-npm, nep-wrangler; git is echt. */
function nep({ test = 0, deploy = 0, cron = 0, migrate = 0, schema = [{ k: 'table', n: 't', c: 'x' }], schemaNa } = {}) {
  const log = [];
  let gemigreerd = false;
  const run = async (cmd, args, o = {}) => {
    log.push([cmd, ...args].join(' '));
    if (cmd === 'git') return echteRun('git', args, { ...o, zichtbaar: false });
    if (cmd === 'node' && /testreeks\.mjs$/.test(args[0])) {
      o.opRegel?.('   1/2  goed  test:bouw  (1,0 s)');
      o.opRegel?.(`   2/2  ${test ? 'FOUT' : 'goed'}  test:a  (0,5 s)`);
      if (test) { o.opRegel?.(' FAIL de bedragen kloppen niet'); o.opRegel?.('FOUT: test:a'); }
      return { code: test, out: test ? ' FAIL de bedragen kloppen niet\nFOUT: test:a\n' : 'alles goed\n' };
    }
    if (cmd === 'npm' && args.join(' ') === 'run deploy') return { code: deploy, out: '' };
    if (cmd === 'npm' && args.join(' ') === 'run cron:deploy') return { code: cron, out: '' };
    if (cmd === 'wrangler' && args[0] === 'whoami') return { code: 0, out: 'ingelogd' };
    if (cmd === 'wrangler' && args[0] === 'd1') {
      const rijen = gemigreerd && schemaNa ? schemaNa : schema;
      return { code: 0, out: `▲ [WARNING] Proxy environment variables detected. [ook met haken]\n${JSON.stringify([{ results: rijen, success: true }], null, 2)}` };
    }
    if (cmd === 'node' && /migrate\.mjs$/.test(args[0])) { gemigreerd = true; return { code: migrate, out: '' }; }
    if (cmd === 'wrangler' && args[0] === 'rollback') return { code: 0, out: '' };
    throw new Error(`onverwacht: ${cmd} ${args.join(' ')}`);
  };
  return { run, log };
}

function nepInternet({ kapot = null, oudeVersie = false } = {}) {
  const pagina = {
    '/': `<!DOCTYPE html><html lang="en"><link href="/_astro/site.${oudeVersie ? 'OUD' : 'NIEUW'}.css">VISUAILS</html>`,
    '/nl/': '<html lang="nl">VISUAILS</html>',
    '/start/catalog/': '<html lang="en"><form method="post"></form></html>',
    '/account/login': '<form><input name="email" type="email"></form>',
    '/admin/login': '<form><input type="password" name="password"></form>',
    '/api/capacity': '{"ok":true,"tier":"unattended"}',
  };
  const gevraagd = [];
  const haal = async (url) => {
    const u = new URL(url);
    gevraagd.push(u.pathname);
    const body = pagina[u.pathname];
    const status = kapot === u.pathname ? 500 : body ? 200 : 404;
    return { status, text: async () => body || '' };
  };
  return { haal, gevraagd };
}

const antwoorden = (...a) => async () => a.shift() ?? 'n';
const rit = (w, n, extra = {}) => uitrollen({ wortel: w, run: n.run, haal: (extra.internet || nepInternet()).haal, vraag: extra.vraag || antwoorden('j'), zeg: stil, nu: NU, wacht: async () => {}, browserAanwezig: async () => true, ...extra });
const opGithub = (origin) => git(origin, 'log', '--format=%s', 'main');

{ // a · een geheim stopt bij stap 1
  const { w, origin } = maakProject();
  zet(w, '.dev.vars', 'RESEND_API_KEY=iets');
  const n = nep();
  const r = await rit(w, n);
  ok('geheim: gestopt bij stap 1', [r.uitkomst, r.stap], ['gestopt', 1]);
  ok('… en de reden noemt het bestand', r.regels.some((x) => x.includes('.dev.vars')), true);
  ok('… geen test, geen commit, niets live', [n.log.some((x) => /^npm|testreeks/.test(x)), opGithub(origin)], [false, 'begin']);
  ok('… met een regel in kladblok/uitrol-log.txt', lees(path.join(w, 'kladblok/uitrol-log.txt')).includes('GESTOPT BIJ STAP 1'), true);
}

{ // b · een rode test stopt bij stap 2
  const { w, origin } = maakProject();
  zet(w, 'src/nieuw.js', 'export const x = 1;');
  const n = nep({ test: 1 });
  const r = await rit(w, n);
  ok('rode test: gestopt bij stap 2', [r.uitkomst, r.stap], ['gestopt', 2]);
  ok('… met de naam van de laatste test', r.regels[0].startsWith('Een test faalt: test:a'), true);
  ok('… de hele uitvoer staat in kladblok/uitrol-tests.txt', lees(path.join(w, 'kladblok/uitrol-tests.txt')).includes('FAIL de bedragen'), true);
  ok('… en er is niets gecommit of gedeployed', [opGithub(origin), n.log.some((x) => /deploy/.test(x))], ['begin', false]);
}

{ // c · nee bij "Doorgaan?"
  const { w, origin } = maakProject();
  zet(w, 'src/nieuw.js', 'export const x = 1;');
  const n = nep();
  const vragen = [];
  const r = await rit(w, n, { vraag: async (t) => { vragen.push(t); return 'n'; } });
  ok('nee: gestopt bij stap 3, na de tests', [r.uitkomst, r.stap, n.log.some((x) => /testreeks/.test(x))], ['gestopt', 3, true]);
  ok('… de vraag was "Doorgaan? J/N"', vragen, ['Doorgaan? J/N']);
  ok('… en GitHub is niet veranderd', opGithub(origin), 'begin');
}

{ // d · de hele weg, met een nieuwe en een al met de hand gedraaide migratie
  const { w, origin } = maakProject();
  zet(w, 'src/nieuw.js', 'export const x = 1;');
  zet(w, 'migrations/0003-nieuw.sql', 'ALTER TABLE t ADD COLUMN y TEXT;');
  zet(w, 'migrations/0004-met-de-hand.sql', 'ALTER TABLE t ADD COLUMN z TEXT;'); // al in de console gedraaid
  zet(w, 'kladblok/COMMIT-BERICHT.txt', 'a1: de uitrolknop\n');
  const voor = [{ k: 'table', n: 't', c: 'x' }, { k: 'table', n: 't', c: 'z' }];
  const n = nep({ schema: voor, schemaNa: [...voor, { k: 'table', n: 't', c: 'y' }] });
  const internet = nepInternet();
  const r = await rit(w, n, { internet });
  ok('helemaal: LIVE EN NAGEKEKEN', [r.uitkomst, r.scherm.split('\n')[1].trim()], ['live', 'LIVE EN NAGEKEKEN · 8 okt 14:32']);
  ok('… alleen 0003 is nieuw; 0004 stond er al (met de hand gedraaid)', r.nieuweMigraties.map((m) => m.naam), ['0003-nieuw.sql']);
  ok('… migrate.mjs kreeg alleen 0003', n.log.filter((x) => x.includes('migrate.mjs')).map((x) => x.split(' ').slice(2).join(' ')), ['0003']);
  ok('… in de goede volgorde: test, migratie, site, nachtwerk',
    n.log.filter((x) => /^npm|migrate\.mjs|testreeks/.test(x)).map((x) => (x.includes('migrate') ? 'migrate' : x.includes('testreeks') ? 'tests' : x)), ['tests', 'migrate', 'npm run deploy', 'npm run cron:deploy']);
  ok('… de commit staat op "GitHub" met het bericht uit kladblok', opGithub(origin).split('\n')[0], 'a1: de uitrolknop');
  ok('… met alle nieuwe bestanden erin', git(origin, 'show', '--name-only', '--format=', 'main').split('\n').sort(),
    ['kladblok/COMMIT-BERICHT.txt', 'migrations/0003-nieuw.sql', 'migrations/0004-met-de-hand.sql', 'src/nieuw.js']);
  ok('… zes adressen nagekeken', internet.gevraagd, ['/', '/nl/', '/start/catalog/', '/account/login', '/admin/login', '/api/capacity']);
  ok('… en een regel in het log', lees(path.join(w, 'kladblok/uitrol-log.txt')).trim().split('\n').pop(),
    `2026-10-08 14:32  ·  LIVE EN NAGEKEKEN  ·  commit ${git(w, 'rev-parse', '--short', 'HEAD')}  ·  4 bestand(en)  ·  migraties: 0003-nieuw.sql  ·  adressen 6/6`);
}

{ // e · nachtwerk faalt, dan nog een keer klikken
  const { w, origin } = maakProject();
  zet(w, 'src/nieuw.js', 'export const x = 1;');
  const r = await rit(w, nep({ cron: 1 }));
  ok('nachtwerk faalt: SITE LIVE, NACHTWERK NIET', [r.uitkomst, r.scherm.split('\n')[1].trim()], ['cron-niet', 'SITE LIVE, NACHTWERK NIET — klik nog een keer']);
  const vragen = [];
  const n2 = nep();
  const r2 = await rit(w, n2, { vraag: async (t) => { vragen.push(t); return 'j'; } });
  ok('… nog een keer: niets nieuws, toch live zetten?', vragen, ['Er is niets nieuws. Toch opnieuw live zetten en nakijken? J/N']);
  ok('… en dan wel helemaal live, zonder nieuwe commit', [r2.uitkomst, r2.commit, opGithub(origin).split('\n').length], ['live', null, 2]);
}

{ // f · de site-deploy faalt
  const { w } = maakProject();
  zet(w, 'migrations/0003-nieuw.sql', 'ALTER TABLE t ADD COLUMN y TEXT;');
  const n = nep({ deploy: 1, schemaNa: [{ k: 'table', n: 't', c: 'x' }, { k: 'table', n: 't', c: 'y' }] });
  const r = await rit(w, n);
  ok('site faalt: GESTOPT BIJ STAP 6 — er is niets live gezet', r.scherm.split('\n')[1].trim(), 'GESTOPT BIJ STAP 6 — er is niets live gezet');
  ok('… zegt dat de migratie geen kwaad kan', r.regels.some((x) => x.includes('kan geen kwaad')), true);
  ok('… en het nachtwerk is niet aangeraakt', n.log.includes('npm run cron:deploy'), false);
}

{ // g · de migratie faalt
  const { w } = maakProject();
  zet(w, 'migrations/0003-nieuw.sql', 'ALTER TABLE t ADD COLUMN y TEXT;');
  const n = nep({ migrate: 1 });
  const r = await rit(w, n);
  ok('migratie faalt: gestopt bij stap 5, site niet gedeployed', [r.uitkomst, r.stap, n.log.includes('npm run deploy')], ['gestopt', 5, false]);
}

{ // h · migratie gedraaid maar de kolom staat er daarna niet
  const { w } = maakProject();
  zet(w, 'migrations/0003-nieuw.sql', 'ALTER TABLE t ADD COLUMN y TEXT;');
  const n = nep();
  const r = await rit(w, n);
  ok('nagekeken na het migreren: kolom ontbreekt nog → gestopt bij stap 5', [r.stap, r.regels[0].includes('kolom t.y')], [5, true]);
}

{ // i · een ombouw-migratie draait de knop nooit
  const { w, origin } = maakProject();
  zet(w, 'migrations/0003-ombouw.sql', 'ALTER TABLE t RENAME TO t_oud;\nALTER TABLE t_oud ADD COLUMN q TEXT;');
  const r = await rit(w, nep());
  ok('ombouw: gestopt bij stap 3, niets gecommit', [r.stap, r.regels[0].includes('0003-ombouw.sql'), opGithub(origin)], [3, true, 'begin']);
}

{ // j · nakijken: een adres geeft 500, of de voorpagina is nog de oude
  const { w } = maakProject();
  const r = await rit(w, nep(), { internet: nepInternet({ kapot: '/admin/login' }) });
  ok('nakijken rood: LIVE, MAAR NIET ALLES GOED', [r.uitkomst, r.scherm.split('\n')[1].trim()], ['nakijk-rood', 'LIVE, MAAR NIET ALLES GOED · 8 okt 14:32']);
  ok('… noemt het adres en zegt TERUGDRAAIEN.bat', [r.scherm.includes('inloggen /admin: status 500'), r.scherm.includes('TERUGDRAAIEN.bat')], [true, true]);
  const oud = await kijkNa({ haal: nepInternet({ oudeVersie: true }).haal, wortel: w, wacht: async () => {} });
  ok('… een voorpagina met de oude bestanden is "nog de vorige versie"', oud[0].uitleg, 'toont nog de vorige versie');
}

{ // k · droog: alles tonen, niets doen
  const { w, origin } = maakProject();
  zet(w, 'src/nieuw.js', 'export const x = 1;');
  const n = nep();
  const r = await rit(w, n, { droog: true, zonderTests: true });
  ok('droog: proefrit, geen test/commit/deploy', [r.uitkomst, n.log.some((x) => /^npm|migrate|testreeks/.test(x)), opGithub(origin)], ['droog', false, 'begin']);
  ok('… en geen regel in het log', fs.existsSync(path.join(w, 'kladblok/uitrol-log.txt')), false);
  const n2 = nep();
  await rit(w, n2, { zonderTests: true, vraag: antwoorden('n') });
  ok('zonder --droog worden de tests nooit overgeslagen', n2.log.some((x) => /testreeks/.test(x)), true);
}

{ // l · opruimwerk dat "moet": eerst OPRUIMEN
  const { w } = maakProject();
  zet(w, 'src/pages/portal.astro', 'oud');
  zet(w, '_opruimen/LIJST.txt', '# ── 8 oktober 2026 · moet weg voor de volgende build ──\r\nsrc/pages/portal.astro # vervangen\r\n');
  const r = await rit(w, nep(), { vraag: antwoorden('n') });
  ok('moet-weg en nee: gestopt bij stap 0', [r.uitkomst, r.stap], ['gestopt', 0]);
  const r2 = await rit(w, nep(), { vraag: antwoorden('j', 'n') });
  ok('… met ja: eerst verplaatst naar _opruimen/<datum>/, dan verder tot de vraag', [fs.existsSync(path.join(w, '_opruimen/2026-10-08/src/pages/portal.astro')), r2.stap], [true, 3]);
}

{ // m · GitHub is verder dan deze pc
  const { w, origin } = maakProject();
  const ander = path.join(tmp, 'ander');
  git(tmp, 'clone', '-q', origin, ander);
  git(ander, 'config', 'user.email', 'a@voorbeeld.test');
  git(ander, 'config', 'user.name', 'A');
  zet(ander, 'x.txt', 'x');
  git(ander, 'add', '-A');
  git(ander, 'commit', '-q', '-m', 'van elders');
  git(ander, 'push', '-q');
  zet(w, 'src/nieuw.js', 'x');
  const r = await rit(w, nep());
  ok('GitHub voor: gestopt bij stap 3, vóór de commit', [r.stap, r.regels[0].includes('1 commit'), git(w, 'log', '--format=%s', '-1')], [3, true, 'begin']);
}

{ // m2 · niet ingelogd bij Cloudflare: de knop biedt inloggen aan
  const { w } = maakProject();
  const n = nep();
  let eerste = true;
  const run = async (cmd, args, o = {}) => {
    if (cmd === 'wrangler' && args[0] === 'd1' && eerste) { eerste = false; n.log.push('d1 (niet ingelogd)'); return { code: 1, out: 'In a non-interactive environment, it is necessary to set a CLOUDFLARE_API_TOKEN' }; }
    if (cmd === 'wrangler' && args[0] === 'login') { n.log.push('wrangler login'); return { code: 0, out: '' }; }
    return n.run(cmd, args, o);
  };
  const vragen = [];
  const r = await uitrollen({ wortel: w, run, haal: nepInternet().haal, vraag: async (t) => { vragen.push(t); return vragen.length === 1 ? 'j' : 'n'; }, zeg: stil, nu: NU, wacht: async () => {}, browserAanwezig: async () => true });
  ok('niet ingelogd: eerst "Nu inloggen?", dan inloggen en opnieuw lezen', [vragen[0].startsWith('Wrangler is niet (meer) ingelogd'), n.log.includes('wrangler login'), r.stap, vragen[1]], [true, true, 3, 'Er is niets nieuws. Toch opnieuw live zetten en nakijken? J/N']);
}

{ // m3 · de testbrowser ontbreekt
  const { w } = maakProject();
  const n = nep();
  const run = async (cmd, args, o = {}) => (cmd === 'npx' ? (n.log.push(`npx ${args.join(' ')}`), { code: 0, out: '' }) : n.run(cmd, args, o));
  await uitrollen({ wortel: w, run, haal: nepInternet().haal, vraag: antwoorden('j', 'n'), zeg: stil, nu: NU, wacht: async () => {}, browserAanwezig: async () => false });
  ok('geen testbrowser: na J eerst npx playwright install chromium, dan de tests', [n.log.includes('npx playwright install chromium'), n.log.some((x) => /testreeks/.test(x))], [true, true]);
  const r2 = await uitrollen({ wortel: w, run: nep().run, haal: nepInternet().haal, vraag: antwoorden('n'), zeg: stil, nu: NU, wacht: async () => {}, browserAanwezig: async () => false });
  ok('… met N: gestopt bij stap 2', [r2.uitkomst, r2.stap], ['gestopt', 2]);
}

{ // n · terugdraaien
  const { w } = maakProject();
  const n = nep();
  const r = await terugdraaien({ wortel: w, run: n.run, vraag: antwoorden('j'), zeg: stil, nu: NU });
  ok('terugdraaien: wrangler rollback voor visuails-site', [r.uitkomst, n.log.find((x) => x.startsWith('wrangler rollback'))?.split(' ').slice(0, 4).join(' ')], ['terug', 'wrangler rollback --name visuails-site']);
  ok('… met een regel in het log', lees(path.join(w, 'kladblok/uitrol-log.txt')).includes('TERUGGEDRAAID'), true);
  const n2 = nep();
  await terugdraaien({ wortel: w, run: n2.run, vraag: antwoorden('n'), zeg: stil, nu: NU });
  ok('… met nee gebeurt er niets', n2.log, []);
  const tekst = [];
  await terugdraaien({ wortel: w, run: nep().run, vraag: antwoorden('n'), zeg: (s) => tekst.push(s), nu: NU });
  ok('… en het zegt vooraf dat de database niet teruggaat', tekst.join('\n').includes('de database: migraties blijven staan'), true);
}

/* ── 3 · de .bat-bestanden en de rest van de projectmap ───────────────────── */
console.log('\nde .bat-bestanden');
for (const [bat, regel] of [['UITROLLEN.bat', 'node scripts\\uitrol.mjs'], ['TERUGDRAAIEN.bat', 'node scripts\\uitrol.mjs terugdraaien'], ['OPRUIMEN.bat', 'node scripts\\opruimen.mjs']]) {
  const t = lees(path.join(ECHT, bat));
  ok(`${bat}: CRLF, cd /d "%~dp0", roept ${regel} aan`, [!/[^\r]\n/.test(t), t.includes('cd /d "%~dp0"'), t.split('\r\n').includes(regel)], [true, true, true]);
  ok(`${bat}: geen ( … )-blokken (het pad heeft haakjes)`, /\(\s*\r?\n/.test(t), false);
  ok(`${bat}: elke goto heeft zijn label`, [...t.matchAll(/goto (\w+)/g)].every(([, l]) => t.includes(`\r\n:${l}\r\n`)), true);
}
const pkg = JSON.parse(lees(path.join(ECHT, 'package.json')));
ok('npm run uitrollen en terugdraaien gaan dezelfde route', [pkg.scripts.uitrollen, pkg.scripts.terugdraaien], ['node scripts/uitrol.mjs', 'node scripts/uitrol.mjs terugdraaien']);
ok('de uitvoer van de tests gaat niet mee naar GitHub', /^kladblok\/uitrol-tests\.txt$/m.test(lees(path.join(ECHT, '.gitignore'))), true);
/* Na OPRUIMEN.bat staan ze niet meer op de lijst, maar ook niet meer in de map: dat telt ook. */
ok('de oude knoppen staan op de opruimlijst (of zijn al opgeruimd)', ['push-to-github.bat', 'fix-secret-and-push.bat', 'cleanup-stale-files.bat', 'opruimen-concepten.bat']
  .every((b) => lees(path.join(ECHT, '_opruimen/LIJST.txt')).split(/\r?\n/).some((r) => r.startsWith(`${b} #`)) || !fs.existsSync(path.join(ECHT, b))), true);

fs.rmSync(tmp, { recursive: true, force: true });
/* ── o17: geïnstalleerde onderdelen tegen de lock ─────────────────────────── */
{
  console.log('\nnode_modules past bij package-lock.json');
  const { afhankelijkhedenGelijk } = await import('../scripts/uitrol.mjs');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-'));
  fs.writeFileSync(path.join(d, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/astro': { version: '7.3.7' } } }));
  ok('ontbreekt astro in node_modules: gemeld', afhankelijkhedenGelijk(d).map((x) => [x.naam, x.heeft, x.wil]), [['astro', null, '7.3.7']]);
  fs.mkdirSync(path.join(d, 'node_modules', 'astro'), { recursive: true });
  fs.writeFileSync(path.join(d, 'node_modules', 'astro', 'package.json'), JSON.stringify({ version: '6.4.8' }));
  ok('oude versie: gemeld', afhankelijkhedenGelijk(d).map((x) => x.heeft), ['6.4.8']);
  fs.writeFileSync(path.join(d, 'node_modules', 'astro', 'package.json'), JSON.stringify({ version: '7.3.7' }));
  ok('zelfde versie: niets', afhankelijkhedenGelijk(d), []);
  ok('de melding verwijst naar NA-UPDATE-INSTALLEREN.bat', /NA-UPDATE-INSTALLEREN\.bat/.test(fs.readFileSync(new URL('../scripts/uitrol.mjs', import.meta.url), 'utf8')), true);
  fs.rmSync(d, { recursive: true, force: true });
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
