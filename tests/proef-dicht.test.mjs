/* VISUAILS — proef tijdelijk dicht, en de wachtlijst. 8 oktober 2026 (G2, V9 = a).
 *
 *   node tests/proef-dicht.test.mjs      (geen server; een echte SQLite met schema.sql)
 *
 * Bewaakt:
 *   1 · de stand: standaard open, dicht, alleen lifestyle; een kapotte database
 *       is "open" (de schakelaar mag nooit zelf een proef blokkeren);
 *   2 · /api/proef-stand en /api/proef-wachtlijst: opslaan, dubbel = één rij,
 *       een fout adres, de honingpot, de snelheidsgrens, 303 terug naar
 *       /test-sample met de uitkomst;
 *   3 · /api/order weigert een proef die dicht is (source: de rem staat na de
 *       soortcontrole en vóór de één-per-bedrijfcontrole);
 *   4 · /admin/proef: omzetten, het aantal (ook terwijl hij dicht is), de knop
 *       "Mail de wachtlijst (N)" pas als hij open is, één mail per adres en
 *       daarna gewist — en een mislukte mail laat het adres staan;
 *   5 · de wachtlijst staat in migratie 0054 en in schema.sql, en de
 *       privacyverklaring noemt doel en wissen.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';
import {
  leesProefStand, zetProefStand, proefOpenVoor, opWachtlijst, telWachtlijst,
  mailWachtlijst, naDeMail, weerOpenMail, NA_DE_MAIL,
} from '../src/lib/proefStand.js';
import { onRequestGet as onRequestGetStand } from '../functions/api/proef-stand.js';
import { onRequestPost as onRequestPostWachtlijst } from '../functions/api/proef-wachtlijst.js';
import { adminGet, adminPost } from '../src/lib/admin.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt zonder fouten', mislukt.length === 0, JSON.stringify(mislukt.slice(0, 2)));
const mails = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('resend')) {
    const m = JSON.parse(init?.body || '{}');
    if (String(m.to).includes('mislukt')) return new Response('nee', { status: 422 });
    mails.push(m);
    return new Response(JSON.stringify({ id: 'mail-1' }), { status: 200 });
  }
  return new Response('{}', { status: 200 });
};
const env = { DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>' };

/* ══ 1 · DE STAND ══════════════════════════════════════════════════════════ */
console.log('de stand');
ok('zonder iets gezet: open', await leesProefStand(env) === 'open');
ok('dicht zetten lukt', (await zetProefStand(env, 'dicht')).ok && await leesProefStand(env) === 'dicht');
ok('alleen lifestyle', (await zetProefStand(env, 'lifestyle')).ok && await leesProefStand(env) === 'lifestyle');
ok('een onbekende stand wordt geweigerd', !(await zetProefStand(env, 'half')).ok && await leesProefStand(env) === 'lifestyle');
ok('één rij in app_settings', telling(db, "SELECT COUNT(*) FROM app_settings WHERE key = 'proef_stand'") === 1);
ok('een kapotte database is open', await leesProefStand({ DB: { prepare() { throw new Error('weg'); } } }) === 'open');
ok('een rare waarde is open', (db.prepare("UPDATE app_settings SET value = 'x' WHERE key = 'proef_stand'").run(), await leesProefStand(env)) === 'open');
const matrix = [['open', 'catalog', true], ['open', 'lifestyle', true], ['dicht', 'catalog', false], ['dicht', 'lifestyle', false], ['lifestyle', 'catalog', false], ['lifestyle', 'lifestyle', true]];
for (const [stand, soort, verwacht] of matrix) ok(`proefOpenVoor(${stand}, ${soort}) = ${verwacht}`, proefOpenVoor(stand, soort) === verwacht);

/* ══ 2 · DE TWEE EINDPUNTEN ═══════════════════════════════════════════════ */
console.log('\n/api/proef-stand en /api/proef-wachtlijst');
await zetProefStand(env, 'dicht');
{
  const r = await onRequestGetStand({ env });
  const j = await r.json();
  ok('GET /api/proef-stand zegt dicht', j.stand === 'dicht');
  ok('  en wordt niet bewaard in een cache', r.headers.get('cache-control') === 'no-store');
}
let ip = 1;
const post = (velden, ipAdres) => onRequestPostWachtlijst({
  request: new Request('https://visuails.com/api/proef-wachtlijst', {
    method: 'POST', body: new URLSearchParams(velden), headers: { 'CF-Connecting-IP': ipAdres || `10.0.0.${ip++}` },
  }),
  env, waitUntil() {},
});
{
  const r = await post({ email: 'Merk@Voorbeeld.nl', lang: 'nl' });
  ok('aanmelden: 303 terug naar /nl/test-sample met ok', r.status === 303 && r.headers.get('location') === '/nl/test-sample/?wachtlijst=ok#even-dicht');
  ok('  het adres staat erin, klein geschreven, met de taal', telling(db, "SELECT COUNT(*) FROM proef_wachtlijst WHERE email = 'merk@voorbeeld.nl' AND taal = 'nl'") === 1);
  await post({ email: 'merk@voorbeeld.nl', lang: 'nl' });
  ok('  twee keer is één rij', telling(db, 'SELECT COUNT(*) FROM proef_wachtlijst') === 1);
  const en = await post({ email: 'brand@example.com', lang: 'en' });
  ok('Engels: terug naar /test-sample', en.headers.get('location') === '/test-sample/?wachtlijst=ok#even-dicht');
  const fout = await post({ email: 'geen-adres', lang: 'nl' });
  ok('een fout adres: ?wachtlijst=email, niets opgeslagen', fout.headers.get('location') === '/nl/test-sample/?wachtlijst=email#even-dicht' && telling(db, 'SELECT COUNT(*) FROM proef_wachtlijst') === 2);
  const hp = await post({ email: 'bot@spam.example', lang: 'nl', website_hp: 'x' });
  ok('de honingpot: doet alsof het lukt, slaat niets op', hp.headers.get('location').includes('wachtlijst=ok') && telling(db, "SELECT COUNT(*) FROM proef_wachtlijst WHERE email = 'bot@spam.example'") === 0);
  let laatste;
  for (let i = 0; i < 6; i++) laatste = await post({ email: `veel${i}@voorbeeld.nl`, lang: 'nl' }, '10.9.9.9');
  ok('de snelheidsgrens: de zesde binnen tien minuten wordt geweigerd', laatste.headers.get('location').includes('wachtlijst=rate'));
  ok('telWachtlijst telt, ook terwijl de proef dicht is', await telWachtlijst(env) === 7, String(await telWachtlijst(env)));
  ok('zonder tabel (migratie niet gedraaid): null en geen fout', await telWachtlijst({ DB: { prepare() { throw new Error('no such table'); } } }) === null);
}

/* ══ 3 · DE REM IN /api/order ═════════════════════════════════════════════ */
console.log('\n/api/order');
{
  const order = lees('functions/api/order.js');
  const iSoort = order.indexOf("'error=sample-soort'");
  const iRem = order.indexOf('proefOpenVoor(await leesProefStand(env), soort)');
  const iEen = order.indexOf("error: 'sample-used'");
  ok('de rem staat er', iRem > 0);
  ok('  na de soortcontrole en vóór één-per-bedrijf', iSoort < iRem && iRem < iEen);
  ok('  en stuurt terug naar /test-sample met ?error=proef-dicht', /test-sample\/\?error=proef-dicht#even-dicht/.test(order));
}

/* ══ 4 · /admin/proef ═════════════════════════════════════════════════════ */
console.log('\n/admin/proef');
const adminToken = await mintToken();
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const aGet = (pad) => adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });
const aPost = (pad, velden) => adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' }, body: new URLSearchParams(velden) }), env, waitUntil() {} });
{
  let html = await (await aGet('/admin/proef')).text();
  ok('de pagina toont de stand: dicht', /Nu: <span class="pill is-warn">Dicht/.test(html));
  ok('  en het aantal wachtenden', /<strong>7<\/strong> adressen wachten/.test(html));
  ok('  maar nog geen mailknop zolang hij dicht is', !/Mail de wachtlijst/.test(html) && /Zet de proef eerst weer open/.test(html));
  ok('  en hij staat in het menu', /href="\/admin\/proef"/.test(html) || /aria-current="page">Proef dicht of open/.test(html));
  const weiger = await mailWachtlijst(env);
  ok('mailen terwijl hij dicht is wordt geweigerd', !weiger.ok && mails.length === 0);

  const r = await aPost('/admin/proef', { do: 'stand', stand: 'open' });
  ok('omzetten: 303 terug', r.status === 303 && r.headers.get('location') === '/admin/proef?klaar=stand');
  ok('  de stand is open', await leesProefStand(env) === 'open');
  ok('  en het logboek weet het', telling(db, "SELECT COUNT(*) FROM admin_log WHERE action = 'proef.stand'") === 1);
  html = await (await aGet('/admin/proef')).text();
  ok('nu staat de knop er: "Mail de wachtlijst (7)"', /Mail de wachtlijst \(7\)/.test(html));

  db.prepare("INSERT INTO proef_wachtlijst (email, taal) VALUES ('mislukt@voorbeeld.nl', 'nl')").run();
  const m = await aPost('/admin/proef', { do: 'mail' });
  ok('mailen: 303 met de telling', m.status === 303 && m.headers.get('location') === '/admin/proef?klaar=gemaild&n=7&mis=1', m.headers.get('location'));
  ok('  één mail per adres', mails.length === 7 && new Set(mails.map((x) => x.to)).size === 7);
  ok('  in de taal van de aanmelding', mails.find((x) => x.to === 'brand@example.com')?.subject === 'A new VISUAILS test sample round is open' && mails.find((x) => x.to === 'merk@voorbeeld.nl')?.subject === 'De nieuwe proefronde van VISUAILS is open');
  ok('  met de knop naar /test-sample', mails.every((x) => /test-sample\//.test(x.html)));
  ok('  daarna gewist; alleen de mislukte blijft', telling(db, 'SELECT COUNT(*) FROM proef_wachtlijst') === 1 && telling(db, "SELECT COUNT(*) FROM proef_wachtlijst WHERE email = 'mislukt@voorbeeld.nl'") === 1);
  ok('  en het logboek weet het', telling(db, "SELECT COUNT(*) FROM admin_log WHERE action = 'proef.wachtlijst-gemaild'") === 1);
  ok('zonder RESEND_API_KEY: niets verstuurd, niets gewist', !(await mailWachtlijst({ ...env, RESEND_API_KEY: '' })).ok && telling(db, 'SELECT COUNT(*) FROM proef_wachtlijst') === 1);
}

/* Het wissen is één plek. */
{
  ok('het besluit staat in één constante: wissen', NA_DE_MAIL === 'wissen');
  const src = lees('src/lib/proefStand.js');
  ok('  en DELETE FROM proef_wachtlijst staat alleen in naDeMail()', (src.match(/DELETE FROM proef_wachtlijst/g) || []).length === 1 && /export async function naDeMail[\s\S]{0,400}DELETE FROM proef_wachtlijst/.test(src));
  ok('  naDeMail met een lege lijst wist niets', await naDeMail(env, []) === 0);
  const ls = weerOpenMail('nl', 'lifestyle');
  ok('de mail bij "alleen lifestyle" zegt dat het om een lifestylecarrousel gaat', /lifestylecarrousel/.test(ls.html));
  ok('de mail zegt dat hij de enige is en dat het adres weg is', /enige mail/.test(weerOpenMail('nl').html) && /only email/.test(weerOpenMail('en').html));
}

/* ══ 5 · MIGRATIE, SCHEMA, PRIVACY, PAGINA ════════════════════════════════ */
console.log('\nmigratie, schema, privacy en de pagina');
{
  const migs = readdirSync(new URL('../migrations/', import.meta.url));
  ok('migratie 0054 bestaat', migs.includes('0054-proef-wachtlijst.sql'));
  const mig = lees('migrations/0054-proef-wachtlijst.sql').replace(/--.*$/gm, '');
  ok('  alleen toevoegend: één CREATE TABLE, geen DROP of ALTER', /CREATE TABLE IF NOT EXISTS proef_wachtlijst/.test(mig) && !/DROP|ALTER|DELETE/i.test(mig));
  ok('  e-mail uniek, taal, aangemeld_op', /email\s+TEXT\s+NOT NULL UNIQUE/.test(mig) && /taal\s+TEXT/.test(mig) && /aangemeld_op\s+TEXT/.test(mig));
  ok('schema.sql heeft dezelfde tabel', /CREATE TABLE IF NOT EXISTS proef_wachtlijst/.test(lees('schema.sql')));
  for (const [p, doel, wis] of [['src/pages/privacy.astro', /test sample waiting list/, /delete it right after/], ['src/pages/nl/privacy.astro', /wachtlijst van de proef/, /wissen we het meteen daarna/]]) {
    const t = lees(p);
    ok(`${p}: doel in §2`, doel.test(t) && /one email only|één mail zodra de proef weer open is/.test(t));
    ok(`${p}: wissen na de mail in §6`, wis.test(t));
  }
  const pagina = lees('src/components/TestSampleHal.astro');
  ok('/test-sample: het formulier post naar /api/proef-wachtlijst met botcheck', /action="\/api\/proef-wachtlijst" method="post"[^>]*data-botcheck="proef-wachtlijst" data-botcheck-post/.test(pagina));
  ok('  met een honingpot', /name="website_hp"/.test(pagina));
  ok('  en vraagt de stand op bij /api/proef-stand', /fetch\('\/api\/proef-stand'/.test(pagina));
  ok('  geen opslag in de browser (dus geen regel in het cookiebeleid nodig)', !/localStorage|sessionStorage/.test(pagina.slice(pagina.indexOf('DE STAND VAN DE PROEF'))));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
