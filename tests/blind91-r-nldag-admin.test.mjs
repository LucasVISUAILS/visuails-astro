/*
 * RONDE 91 · C01/C03 (restjes) — /admin EN DE NU-ZIN REKENEN MET DE NEDERLANDSE DAG
 * 9 november 2026 (ronde 91, R)
 *
 * C-04 gaf src/lib/nlDag.js (vandaagNL) en zette de leverkalender, de leverdatums en Studio op de Nederlandse
 * dag. Drie plekken in admin.js en één in nuzin.js rekenden nog met `new Date().toISOString().slice(0, 10)`,
 * de UTC-dag; tussen 00:00 en 01:00/02:00 Nederlandse tijd is dat nog gisteren:
 *
 *   · /admin/agenda/dagen (een dag dichtzetten): "gisteren" kon nog dicht;
 *   · een venster neerzetten (handleWindowMove) en /admin/planning: firstOfferableDay() vanaf gisteren;
 *   · weerOpenenBlok(): "de klant kan tot en met <gisteren> een revisieronde aanvragen";
 *   · nuzin.js (de Nu-zin in Studio en de bestelpagina): vandaagIso() was de UTC-dag.
 *
 * De klok wordt vastgezet op 9 november 2026 23:30 UTC = 10 november 00:30 in Nederland.
 *
 *   node tests/blind91-r-nldag-admin.test.mjs
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminPost, weerOpenenBlok } from '../src/lib/admin.js';
import { levendeBeelden } from '../src/lib/nuzin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { vandaagNL } from '../src/lib/nlDag.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name}${good ? '' : ` — verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
console.log('\nVISUAILS — ronde 91 C01/C03: /admin en de Nu-zin op de Nederlandse dag\n');

const NACHT = Date.parse('2026-11-09T23:30:00Z');
const echtNu = Date.now;
ok('het moment: in UTC nog 9 november, in Nederland al 10 november', [new Date(NACHT).toISOString().slice(0, 10), vandaagNL(NACHT)], ['2026-11-09', '2026-11-10']);

console.log('\nde bron');
const adm = readFileSync(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
const stuk = (naam) => { const i = adm.indexOf(naam); return adm.slice(i, adm.indexOf('\n}\n', i)); };
ok('admin.js laadt vandaagNL uit nlDag.js', /import \{ vandaagNL \} from '\.\/nlDag\.js';/.test(adm));
for (const f of ['async function handleBlackoutDay(', 'async function handleWindowMove(', 'async function renderPlanning(']) {
  const s = stuk(f);
  ok(`${f.replace('async function ', '').replace('(', '')}: vandaag = vandaagNL(), geen UTC-dag`, /const vandaag = vandaagNL\(\);/.test(s) && !/new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(s));
}
ok('weerOpenenBlok: revisieTot tegen vandaagNL(nu)', /d\.revisieTot >= vandaagNL\(nu\)/.test(stuk('export function weerOpenenBlok(')));
const nz = readFileSync(new URL('../src/lib/nuzin.js', import.meta.url), 'utf8');
ok('nuzin.js: vandaagIso() = vandaagNL()', /const vandaagIso = \(\) => vandaagNL\(\);/.test(nz));

console.log('\nweerOpenenBlok() om 00:30');
{
  /* Weer geopend op 2 november: revisie tot en met 9 november. Om 00:30 op 10 november is dat voorbij. */
  const order = { status: 'delivered', closed_at: null, reopened_at: '2026-11-02 11:00:00', delivered_at: '2026-10-20 11:00:00', announced_at: '2026-10-20 11:00:00' };
  const html = weerOpenenBlok(order, { nu: new Date(NACHT) });
  ok('geen "tot en met 9 november" meer na middernacht', /tot en met 9 november/.test(html), false);
  const overdag = weerOpenenBlok(order, { nu: new Date('2026-11-09T12:00:00Z') });
  ok('overdag op 9 november staat hij er nog wel', /tot en met 9 november/.test(overdag), true);
}

console.log('\nnuzin levendeBeelden() om 00:30');
Date.now = () => NACHT;
try {
  /* expires_at is een UTC-moment. Verloopt om 10 november 00:59 NL: om 00:30 NL nog niet weg. */
  ok('een beeld dat om 23:59:59 UTC verloopt, telt om 00:30 NL nog mee', levendeBeelden([{ kind: 'delivery', expires_at: '2026-11-09 23:59:59' }]).length, 1);
  ok('een beeld dat op 8 november verliep, niet meer', levendeBeelden([{ kind: 'delivery', expires_at: '2026-11-08 12:00:00' }]).length, 0);
  ok('zonder expires_at: telt mee', levendeBeelden([{ kind: 'delivery' }]).length, 1);
} finally { Date.now = echtNu; }

console.log('\n/admin/agenda/dagen om 00:30');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const env = { DB: d1(db), UPLOADS: { async put() {}, async get() { return null; }, async head() { return null; }, async delete() {} } };
  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
  const token = await mintToken();
  /* issued_at en last_used_at op het vastgezette moment: anders is de sessie "12 uur niets gedaan" (o18). */
  db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at, issued_at, last_used_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z', '2026-11-09 23:00:00', '2026-11-09 23:00:00')").run(await hashToken(token));
  const dicht = async (dag) => {
    const fd = new FormData();
    fd.append('do', 'dicht'); fd.append('dag', dag); fd.append('reason', 'Testsluiting');
    const res = await adminPost({ request: new Request('https://visuails.com/admin/agenda/dagen', { method: 'POST', headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' }, body: fd }), env, waitUntil() {} });
    return { status: res.status, html: await res.text() };
  };
  Date.now = () => NACHT;
  try {
    const gisteren = await dicht('2026-11-09');
    ok('9 november (in Nederland gisteren) dichtzetten: geweigerd, "al voorbij"', [gisteren.status, /al voorbij/.test(gisteren.html)], [400, true]);
    const vandaag = await dicht('2026-11-10');
    ok('10 november (vandaag in Nederland) kan wel', vandaag.status < 400, true);
  } finally { Date.now = echtNu; }
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
