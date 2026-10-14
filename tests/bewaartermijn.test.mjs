/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BEWAARTERMIJN VAN EEN KLANTACCOUNT, EN DIE VAN DE BACK-UPS — 8 oktober 2026 (o11)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos: een klantaccount gaat ACCOUNT_YEARS jaar na de laatste bestelling
 * weg (zonder bestelling: na het aanmaken). Facturen blijven zeven jaar
 * (wettelijk), en de back-ups houden wat scripts/backup-weekly.bat werkelijk doet.
 *
 * "UITGEVOERD, NIET ALLEEN BELOOFD", maar zonder automatisch wissen — dat bestaat
 * bewust niet (overzicht §21). Deze toets houdt dus vast dat de HERINNERING werkt:
 *
 *   1 · de query die de accounts over de termijn vindt, tegen een echte sqlite met
 *       het echte schema (geen nepdatabase: zie de kop van tests/wipe.test.mjs);
 *   2 · het nachtrapport noemt ze, hoogstens één keer per week;
 *   3 · /admin toont de chip en de lijst, met de weg naar de AVG-knop;
 *   4 · het privacybeleid leest de getallen uit retention.js, en het back-upgetal
 *       is hetzelfde als het --keep in het .bat-bestand.
 */
import { readFileSync } from 'node:fs';
import {
  ACCOUNT_YEARS, BACKUP_KEEP, BACKUP_WEKEN, STALE_ACCOUNTS_COUNT_SQL, STALE_ACCOUNTS_SQL, bewaartermijnRegel,
} from '../src/lib/retention.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { tasks } from '../cron/index.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

console.log('\nVISUAILS — bewaartermijn van het klantaccount en de back-ups (o11)\n');

console.log('de constanten');
{
  ok('ACCOUNT_YEARS is een positief geheel getal', Number.isInteger(ACCOUNT_YEARS) && ACCOUNT_YEARS > 0, true, ACCOUNT_YEARS);
  ok('de regel voor Lucas noemt het getal', bewaartermijnRegel(3), `3 klantaccounts langer dan ${ACCOUNT_YEARS} jaar zonder bestelling`);
  ok('en enkelvoud bij één', bewaartermijnRegel(1).startsWith('1 klantaccount langer'), true, bewaartermijnRegel(1));
  /* Het getal in de privacytekst en het getal dat de Taakplanner gebruikt, zijn één. */
  const bat = read('scripts/backup-weekly.bat');
  const keeps = [...bat.matchAll(/--keep (\d+)/g)].map((m) => Number(m[1]));
  ok('backup-weekly.bat gebruikt --keep', keeps.length > 0, true);
  ok(`en overal hetzelfde getal als BACKUP_KEEP (${BACKUP_KEEP})`, keeps.every((k) => k === BACKUP_KEEP), true, keeps.join(','));
  ok('BACKUP_WEKEN volgt uit de wekelijkse taak', BACKUP_WEKEN, BACKUP_KEEP);
}

console.log('\nwelke accounts over de termijn zijn — tegen het echte schema');
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0, mislukt.slice(0, 2).join(' | '));
{
  const oud = `datetime('now', '-${ACCOUNT_YEARS} years', '-30 days')`;
  const recent = `datetime('now', '-${Math.max(1, ACCOUNT_YEARS * 12 - 6)} months')`;
  /* Alles onmiskenbaar verzonnen: .test-domeinen, geen echte namen. */
  db.exec(`
    INSERT INTO customers (id, email, brand, created_at) VALUES
      (1, 'oud@voorbeeld.test',      'Merk Oud',      ${oud}),
      (2, 'recent@voorbeeld.test',   'Merk Recent',   ${oud}),
      (3, 'nooit-oud@voorbeeld.test','Merk Nooit',    ${oud}),
      (4, 'nooit-nieuw@voorbeeld.test','Merk Nieuw',  ${recent}),
      (5, 'abonnee@voorbeeld.test',  'Merk Abonnee',  ${oud}),
      (6, 'iso@voorbeeld.test',      'Merk Iso',      ${oud});
    INSERT INTO orders (id, ref, customer_id, service, email, created_at) VALUES
      (1, 'VIS-TEST-001', 1, 'catalog', 'oud@voorbeeld.test',    ${oud}),
      (2, 'VIS-TEST-002', 2, 'catalog', 'recent@voorbeeld.test', ${oud}),
      (3, 'VIS-TEST-003', 2, 'catalog', 'recent@voorbeeld.test', ${recent}),
      (4, 'VIS-TEST-004', 5, 'catalog', 'abonnee@voorbeeld.test', ${oud});
  `);
  /* Een tijdstip in de ISO-vorm met een T erin, zoals JavaScript hem schrijft. */
  const isoOud = new Date(Date.now() - (ACCOUNT_YEARS * 365 + 40) * 864e5).toISOString();
  db.prepare(`INSERT INTO orders (id, ref, customer_id, service, email, created_at) VALUES (5, 'VIS-TEST-005', 6, 'catalog', 'iso@voorbeeld.test', ?)`).run(isoOud);
  db.exec(`INSERT INTO subscriptions (customer_id, ref, plan, status) VALUES (5, 'ABO-TEST-1', 'starter', 'active')`);

  const env = { DB: d1(db) };
  const n = Number((await env.DB.prepare(STALE_ACCOUNTS_COUNT_SQL).first())?.n);
  ok('drie accounts over de termijn', n, 3);
  const rijen = (await env.DB.prepare(STALE_ACCOUNTS_SQL).bind(50).all()).results || [];
  ok('het juiste drietal: oud, nooit besteld en ISO-datum', rijen.map((r) => r.id).sort().join(','), '1,3,6');
  ok('een recente bestelling houdt het account vast', rijen.some((r) => r.id === 2), false);
  ok('een lopend abonnement ook', rijen.some((r) => r.id === 5), false);
  ok('een nieuw account zonder bestelling ook', rijen.some((r) => r.id === 4), false);

  console.log('\nhet nachtrapport noemt ze, hoogstens één keer per week');
  const regel = await tasks.bewaartermijnAccounts(env);
  ok('de eerste nacht staat er een regel', typeof regel === 'string' && regel.includes(bewaartermijnRegel(3)), true, regel);
  ok('met de weg naar de lijst in /admin', /\/admin\/customers\?f=bewaartermijn/.test(regel || ''), true);
  ok('en zonder te wissen: alle zes klanten staan er nog', Number(db.prepare('SELECT COUNT(*) AS n FROM customers').get().n), 6);
  ok('de volgende nacht niet nog eens', await tasks.bewaartermijnAccounts(env), null);
  db.exec(`UPDATE app_settings SET value = '2020-01-01 00:00' WHERE key = 'accounts_warned_at'`);
  ok('een week later wel weer', typeof (await tasks.bewaartermijnAccounts(env)), 'string');

  console.log('\n/admin toont de chip en de lijst');
  const adminToken = await mintToken();
  db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'beheer@voorbeeld.test', 'x')`);
  db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
  const get = async (pad) => (await adminGet({
    request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}` } }),
    env, waitUntil() {},
  })).text();

  const lijst = await get('/admin/customers?f=bewaartermijn');
  ok('de lijst opent', /Klanten over de bewaartermijn/.test(lijst), true);
  ok('met de drie klanten', ['Merk Oud', 'Merk Nooit', 'Merk Iso'].every((m) => lijst.includes(m)), true);
  ok('en niet de klant met een abonnement', lijst.includes('Merk Abonnee'), false);
  ok('met de weg naar de AVG-knop', /Deze klant wissen \(AVG-verzoek\)/.test(lijst), true);
  const klanten = await get('/admin/customers');
  ok('de gewone klantenlijst wijst ernaar', klanten.includes(bewaartermijnRegel(3)), true);
  const dashboard = await get('/admin');
  ok('het dashboard heeft de chip bij de bewakers', dashboard.includes('/admin/customers?f=bewaartermijn'), true);
}

console.log('\nhet privacybeleid leest de getallen');
{
  for (const [lang, pad] of [['en', 'src/pages/privacy.astro'], ['nl', 'src/pages/nl/privacy.astro']]) {
    const src = read(pad);
    ok(`${lang}: ACCOUNT_YEARS uit retention.js`, /ACCOUNT_YEARS[^}]*\} from '\.\.\/(\.\.\/)?lib\/retention\.js'/.test(src) && src.includes('{ACCOUNT_YEARS}'), true);
    /* 11 oktober 2026 (kback = a): "uiterlijk na N weken", N inclusief de prullenbak van Drive. */
    ok(`${lang}: de back-uptermijn ook`, src.includes('{BACKUP_KEEP}') && src.includes('{BACKUP_UITERLIJK_WEKEN}') && src.includes('{DRIVE_PRULLENBAK_DAGEN}'), true);
    ok(`${lang}: geen ingetypte ${ACCOUNT_YEARS} jaar na de laatste bestelling`,
      new RegExp(`\\b${ACCOUNT_YEARS} (years after your last order|jaar na je laatste bestelling)`).test(src), false);
    ok(`${lang}: facturen blijven zeven jaar, ook na het wissen`,
      /seven years[^<]*also after your account has been deleted|zeven jaar[^<]*ook nadat je account is verwijderd/.test(src), true);
  }
  const reg = read('docs/AVG-VERWERKINGSREGISTER.md');
  ok('het register noemt ACCOUNT_YEARS', /`ACCOUNT_YEARS` jaar na de laatste bestelling/.test(reg), true);
  ok('en BACKUP_KEEP', /`BACKUP_KEEP`/.test(reg), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
