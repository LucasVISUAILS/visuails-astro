/* VISUAILS — de donkere stand van /admin, door de echte Worker.
 * ═══════════════════════════════════════════════════════════════════════════
 *   npm run test:adminthema     (vereist een build; test:bouw draait als eerste)
 *
 * WAAROM DEZE TOETS BESTAAT — 20 september 2026
 *
 * Lucas, na de proef: *"Alleen /admin dark mode."* De stand hangt aan drie
 * dingen die elk los kunnen breken zonder dat er iets zichtbaar stuk gaat:
 *
 *   1 · `?thema=donker` moet de cookie zetten EN de parameter weer weghalen.
 *       Blijft hij in de URL staan, dan deelt iemand een link die het scherm
 *       van de ontvanger omzet.
 *   2 · Met de cookie moet `data-thema="donker"` op <html> staan — op ELKE
 *       pagina. Het attribuut wordt niet door page() gezet maar door
 *       metThema() bij de uitgang, juist omdat vijftig aanroepen van page()
 *       er eentje kunnen vergeten. Deze toets loopt daarom langs meerdere
 *       schermen, inclusief het inlogscherm.
 *   3 · Zonder cookie moet het attribuut er NIET zijn. Een donkere stand is
 *       een keuze; het uitgangspunt blijft licht.
 *
 * En één regel die niets met kleur te maken heeft: de schakelaar mag geen
 * JavaScript zijn. De CSP van dit paneel is `default-src 'none'`, dus een
 * <script> zou er niet eens uitgevoerd worden — maar hij zou er wel STAAN, en
 * dan werkt de knop in productie niet terwijl hij lokaal misschien wel leek te
 * werken. Vandaar de controle op het antwoord zelf.
 */
import { adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(62)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db } = verseDb(new URL('../schema.sql', import.meta.url));
const token = await mintToken();
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x')");
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')")
  .run(await hashToken(token));

const env = { DB: d1(db), UPLOADS: { async delete() {} } };
const haal = (pad, cookie = `vis_admin=${token}`) => adminGet({
  request: new Request(`https://visuails.com${pad}`, { headers: { cookie } }),
  env,
  waitUntil() {},
});

console.log('de schakelaar zet een cookie en haalt de parameter weg');
{
  const r = await haal('/admin?thema=donker');
  ok('?thema=donker leidt om', r.status, 303);
  ok('  en stuurt je terug naar dezelfde pagina', r.headers.get('location'), '/admin');
  const koek = r.headers.get('set-cookie') || '';
  ok('  en zet vis_thema=donker', /vis_thema=donker/.test(koek));
  ok('  op Path=/admin', /Path=\/admin/.test(koek));
  ok('  met SameSite=Lax, zodat hij een navigatie van buiten overleeft', /SameSite=Lax/.test(koek));
  ok('  en Secure', /Secure/.test(koek));

  /* Met een andere parameter erbij: die moet blijven staan. Zonder deze regel
     mag themaOmleiding() de hele query weggooien en niemand ziet het. */
  const met = await haal('/admin?status=delivered&thema=donker');
  ok('andere parameters blijven staan', met.headers.get('location'), '/admin?status=delivered');

  const terug = await haal('/admin?thema=licht');
  ok('en ?thema=licht doet hetzelfde de andere kant op', /vis_thema=licht/.test(terug.headers.get('set-cookie') || ''));

  const onzin = await haal('/admin?thema=paars');
  ok('een waarde die niet bestaat leidt niet om', onzin.status !== 303, true);
}

console.log('\nmet de cookie draagt elke pagina het attribuut');
{
  for (const pad of ['/admin', '/admin/planning', '/admin/customers', '/admin/vat', '/admin/onbekend']) {
    const donker = await haal(pad, `vis_admin=${token}; vis_thema=donker`);
    const h = await donker.text();
    ok(`${pad} draagt data-thema="donker"`, /<html lang="en" data-thema="donker">/.test(h));
  }
  /* En het inlogscherm, dat vóór de sessie komt en dus langs een heel ander
     stuk van adminGet() loopt. Als metThema() ooit naar binnen verhuist, is
     dit de pagina die als eerste omvalt. */
  const login = await haal('/admin/login', 'vis_thema=donker');
  ok('/admin/login draagt het ook', /<html lang="en" data-thema="donker">/.test(await login.text()));

  const licht = await haal('/admin');
  const h = await licht.text();
  ok('zonder cookie staat het attribuut er niet', /data-thema/.test(h), false);
  ok('  en de pagina is verder dezelfde', /<html lang="en">/.test(h));
}

console.log('\nde schakelaar staat in de balk, en is geen JavaScript');
{
  const r = await haal('/admin');
  const h = await r.text();
  ok('allebei de standen staan in de HTML', /bar-thema is-donker/.test(h) && /bar-thema is-licht/.test(h));
  ok('  en ze wijzen naar dezelfde pagina met ?thema=', (h.match(/href="\?thema=(donker|licht)"/g) || []).length, 2);
  ok('geen <script> in het antwoord', /<script/i.test(h), false);
  ok('de CSP staat nog steeds op default-src none',
    (r.headers.get('content-security-policy') || '').includes("default-src 'none'"));
  ok('de meta zegt dat beide standen bestaan', /content="light dark"/.test(h));
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
