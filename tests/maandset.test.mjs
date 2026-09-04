/* VISUAILS — de gedeelde maandset bij het abonnement.  npm run test:maandset
 *
 * Lucas, 4 september 2026: "waar komen de stockafbeeldingen terecht?" Tot die
 * dag: nergens — de site beloofde STOCK_OFF_BRAND beelden per maand bij elk
 * abonnement, gelabeld "nog niet actief", zonder tabel, R2-pad of scherm.
 * STOCK-IDEE.md §6 legt de kleinste vorm vast; dit is de toets erop:
 *
 *   1 · /admin/maandset: maand aanmaken, beelden uploaden (alleen beeldtypes),
 *       één beeld weghalen, publiceren en terugtrekken.
 *   2 · Studio: een abonnee met een lopend abonnement ziet de gepubliceerde
 *       set op de maand-tab, kan elk beeld en de zip ophalen; de zip draagt de
 *       licentie voor GEDEELD beeld en niet de exclusieve.
 *   3 · Wie geen lopend abonnement heeft (geen abonnement, of 'pending') ziet
 *       niets en krijgt op de routes een 404; een concept-set is voor iedereen
 *       onzichtbaar.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { accountGet } from '../src/lib/account.js';
import { hashToken } from '../src/lib/token.js';
import { STOCK_OFF_BRAND } from '../src/data/pricing.js';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true) {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) { geslaagd++; console.log(`  ok   ${naam}`); }
  else { gezakt++; console.log(`FAIL  ${naam}    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`); }
}

const inhoud = new Map();
const bucket = {
  async put(key, body, opts) { const bytes = typeof body?.getReader === 'function' ? new Uint8Array(await new Response(body).arrayBuffer()) : body; inhoud.set(key, { bytes, opts }); return { key }; },
  async get(key) { const v = inhoud.get(key); return v ? { body: v.bytes, httpMetadata: v.opts?.httpMetadata, arrayBuffer: async () => v.bytes.buffer } : null; },
  async delete(key) { inhoud.delete(key); },
  async head(key) { return inhoud.has(key) ? {} : null; },
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.slice(0, 3).join(' | '));
const env = { DB: d1(db), UPLOADS: bucket, FROM_EMAIL: 'VISUAILS <orders@visuails.com>' };

const adminToken = 'proef-admin-token';
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const post = (path, velden, multipart = false) => {
  let body;
  if (multipart) { body = new FormData(); for (const [k, v] of Object.entries(velden)) (Array.isArray(v) ? v : [v]).forEach((x) => body.append(k, x)); }
  else body = new URLSearchParams(velden);
  return adminPost({ request: new Request(`https://visuails.com${path}`, { method: 'POST', headers: { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' }, body }), env, waitUntil() {} });
};
const get = (path) => adminGet({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });

/* Drie klanten: een lopend abonnement, een wachtend abonnement, geen abonnement. */
db.prepare("INSERT INTO customers (id, email, brand, name, country) VALUES (1, 'studio@voorbeeld-volt.nl', 'VOLT', 'Mara Visser', 'NL')").run();
db.prepare("INSERT INTO customers (id, email, brand, name, country) VALUES (2, 'inkoop@voorbeeld-noord.nl', 'NOORD', 'Joris Bakker', 'NL')").run();
db.prepare("INSERT INTO customers (id, email, brand, name, country) VALUES (3, 'hi@voorbeeld-lumen.com', 'LUMEN', 'Ayla Kaya', 'NL')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day) VALUES (1, 1, 'SUB-VOLT', 'studio', 'monthly', 'active', 3)`).run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day) VALUES (2, 2, 'SUB-NOORD', 'studio', 'monthly', 'pending', 3)`).run();
for (const [id, token] of [[1, 'volt-token'], [2, 'noord-token'], [3, 'lumen-token']]) {
  db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (?, ?, '2099-01-01T00:00:00Z')`).run(id, await hashToken(token));
}
const klant = (token, path) => accountGet({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_account=${token}; vis_lang=nl` } }), env, waitUntil() {} });

const png = (naam) => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])], naam, { type: 'image/png' });
const maand = new Date().toISOString().slice(0, 7);

console.log('\nVISUAILS — de gedeelde maandset\n');

console.log('1 · de studiokant');
let setId;
{
  const leeg = await (await get('/admin/maandset')).text();
  ok('het scherm rendert zonder sets', /De maandset/.test(leeg) && /Nog geen enkele maand/.test(leeg));
  ok(`  en noemt het doel van ${STOCK_OFF_BRAND}`, new RegExp(`De ${STOCK_OFF_BRAND} gedeelde beelden`).test(leeg));

  const res = await post('/admin/maandset', { month: maand, files: [png('a.png'), png('b.png'), new File(['<svg/>'], 'kwaad.svg', { type: 'image/svg+xml' }), png('c.png')] }, true);
  ok('uploaden antwoordt met een omleiding', res.status, 303);
  ok('  met de melding dat er iets is overgeslagen', /m=type/.test(res.headers.get('location') || ''));
  const set = db.prepare('SELECT id, month, published_at FROM shared_sets WHERE month = ?').get(maand);
  setId = set?.id;
  ok('  de set bestaat voor deze maand, als concept', [!!set, set?.published_at], [true, null]);
  const files = db.prepare('SELECT id, r2_key, filename, content_type FROM shared_files WHERE set_id = ? ORDER BY id').all(setId);
  ok('  drie beelden erin, de svg niet', files.map((f) => f.filename), ['a.png', 'b.png', 'c.png']);
  ok('  onder shared/<maand>/<id>-<naam>', files.every((f) => new RegExp(`^shared/${maand}/${f.id}-[abc]\\.png$`).test(f.r2_key)));
  ok('  en de bytes staan in R2', files.every((f) => inhoud.has(f.r2_key)));

  const h = await (await get('/admin/maandset')).text();
  ok('het scherm toont de set met de telling', new RegExp(`3 van ${STOCK_OFF_BRAND} beelden`).test(h) && /concept/.test(h));
  const img = await get(`/admin/shared/${files[0].id}`);
  ok('  en serveert een beeld, niet gecachet', [img.status, img.headers.get('content-type'), img.headers.get('cache-control')], [200, 'image/png', 'private, no-store']);

  await post(`/admin/maandset/${setId}`, { action: 'remove', file: String(files[1].id) });
  ok('één beeld weghalen haalt rij én object weg', [db.prepare('SELECT COUNT(*) AS n FROM shared_files WHERE set_id = ?').get(setId).n, inhoud.has(files[1].r2_key)], [2, false]);

  await post(`/admin/maandset/${setId}`, { action: 'save', title: 'Nazomer' });
  ok('een titel opslaan', db.prepare('SELECT title FROM shared_sets WHERE id = ?').get(setId).title, 'Nazomer');
}

console.log('\n2 · onzichtbaar zolang het concept is');
{
  const plan = await (await klant('volt-token', '/account/plan')).text();
  ok('de abonnee ziet de kaart, maar nog geen set', /De gedeelde set van deze maand/.test(plan) && /wordt gemaakt/.test(plan) && !/Nazomer/.test(plan));
  const f = db.prepare('SELECT id FROM shared_files WHERE set_id = ? ORDER BY id').get(setId);
  ok('  en het beeld van een concept-set is 404', (await klant('volt-token', `/account/set/${f.id}/f`)).status, 404);
  ok('  net als de zip', (await klant('volt-token', `/account/set/${setId}/zip`)).status, 404);
}

console.log('\n3 · gepubliceerd');
{
  const res = await post(`/admin/maandset/${setId}`, { action: 'publish' });
  ok('publiceren antwoordt met een omleiding', res.status === 303 && /m=pub/.test(res.headers.get('location') || ''), true);
  ok('  en zet de datum', !!db.prepare('SELECT published_at FROM shared_sets WHERE id = ?').get(setId).published_at);
  ok('  in het logboek', /gepubliceerd/.test(db.prepare("SELECT detail FROM admin_log WHERE action = 'maandset.publish'").get()?.detail || ''));

  const plan = await (await klant('volt-token', '/account/plan')).text();
  ok('de abonnee ziet de set op de maand-tab', /Nazomer/.test(plan) && /2 beelden/.test(plan));
  ok('  met de beelden via /account/set/<id>/f', /\/account\/set\/\d+\/f/.test(plan));
  ok('  en de zipknop', new RegExp(`/account/set/${setId}/zip`).test(plan));
  ok('  niet op de bestellen-tab', !/Nazomer/.test(await (await klant('volt-token', '/account/plan?tab=bestellen')).text()));

  const f = db.prepare('SELECT id FROM shared_files WHERE set_id = ? ORDER BY id').get(setId);
  const beeld = await klant('volt-token', `/account/set/${f.id}/f`);
  ok('een beeld komt binnen als png, privé gecachet', [beeld.status, beeld.headers.get('content-type'), /private/.test(beeld.headers.get('cache-control') || '')], [200, 'image/png', true]);

  const zip = await klant('volt-token', `/account/set/${setId}/zip`);
  ok('de zip komt binnen', [zip.status, zip.headers.get('content-type')], [200, 'application/zip']);
  ok(`  onder de naam VISUAILS-set-${maand}.zip`, new RegExp(`VISUAILS-set-${maand}\\.zip`).test(zip.headers.get('content-disposition') || ''));
  const bytes = Buffer.from(await zip.arrayBuffer());
  const tekst = bytes.toString('latin1');
  ok('  met de licentie voor GEDEELD beeld erin', /GEBRUIKSRECHTEN\.txt/.test(tekst) && /gedeelde set/i.test(tekst) && /niet-exclusieve/.test(tekst));
  ok('  en niet de exclusieve van een levering', !/exclusieve, eeuwigdurende/.test(tekst) || /niet-exclusieve/.test(tekst));
  ok('  met de twee beelden, genummerd', /VISUAILS-set-\d{4}-\d{2}-01-a\.png/.test(tekst) && /-02-c\.png/.test(tekst));
  ok('  en de merknaam van de klant', /VOLT/.test(tekst));
}

console.log('\n4 · wie er niet bij mag');
{
  const f = db.prepare('SELECT id FROM shared_files WHERE set_id = ? ORDER BY id').get(setId);
  const wacht = await (await klant('noord-token', '/account/plan')).text();
  ok("een abonnement dat nog op de eerste incasso wacht ('pending') ziet de kaart niet", !/De gedeelde set van deze maand/.test(wacht));
  ok('  en krijgt op het beeld een 404', (await klant('noord-token', `/account/set/${f.id}/f`)).status, 404);
  ok('  en op de zip', (await klant('noord-token', `/account/set/${setId}/zip`)).status, 404);
  const geen = await (await klant('lumen-token', '/account/plan')).text();
  ok('zonder abonnement ook niet', !/De gedeelde set van deze maand/.test(geen));
  ok('  404 op de zip', (await klant('lumen-token', `/account/set/${setId}/zip`)).status, 404);
  ok('uitgelogd: het beeld is 404', (await accountGet({ request: new Request(`https://visuails.com/account/set/${f.id}/f`), env, waitUntil() {} })).status, 404);

  await post(`/admin/maandset/${setId}`, { action: 'unpublish' });
  ok('teruggetrokken: de abonnee ziet hem niet meer', !/Nazomer/.test(await (await klant('volt-token', '/account/plan')).text()));
}

console.log(`\n${geslaagd} geslaagd, ${gezakt} gezakt\n`);
if (gezakt) process.exit(1);
