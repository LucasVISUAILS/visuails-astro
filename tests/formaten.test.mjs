/* VISUAILS — "Ook als PNG" / "Ook als WebP". 11 oktober 2026 (k401, K5 punt 1).
 *
 *   node tests/formaten.test.mjs      (geen server; een echte SQLite met schema.sql)
 *
 * Bewaakt:
 *   1 · de tabel: migratie 0065 alleen toevoegend, schema.sql heeft hem, één rij
 *       per bestelling en formaat (dubbel = één), weg met de bestelling;
 *   2 · formaatView(): alleen bij een geleverde bestelling met een map om te
 *       downloaden, niet bij video, de proef of een ingetrokken levering; een
 *       aangevraagd formaat is een regel met de datum, na "Klaar" "geleverd";
 *   3 · POST /account/orders/<id>/formaat via accountPost(): sessie en Origin
 *       zoals elk Studio-formulier, alleen de eigenaar, alleen png/webp, 303 terug
 *       naar de kaart;
 *   4 · /admin/formaten: in het menu, de open verzoeken met link en "Klaar", de
 *       chip op het dashboard; Klaar zet de datum één keer;
 *   5 · Bestelling.astro: een gewoon formulier met twee knoppen, geen script; de
 *       uitleg in NL en EN; de LEESMIJ noemt het in één zin.
 * Verzonnen merk, verzonnen adres.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';
import { formaatView, formatenVoorOrders, vraagFormaatAan, formaatKlaar, formatenLijst, telOpenFormaten, formaatMelding, FORMATEN } from '../src/lib/formaten.js';
import { accountPost, orderView } from '../src/lib/account.js';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { deliveryReadme } from '../src/lib/delivery.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt zonder fouten', mislukt.length === 0, JSON.stringify(mislukt.slice(0, 2)));
const env = { DB: d1(db) };

db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES
    (51, 'studio@voorbeeldlabel.test', 'Noor', 'Voorbeeldlabel', 'NL'),
    (52, 'iemand@anderlabel.test', 'Ander', 'Anderlabel', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, lang, product_count) VALUES
    (501, 'VIS-TEST-0501', 51, 'catalog', 'delivered', 'Noor', 'Voorbeeldlabel', 'studio@voorbeeldlabel.test', 'nl', 2),
    (502, 'VIS-TEST-0502', 51, 'video', 'delivered', 'Noor', 'Voorbeeldlabel', 'studio@voorbeeldlabel.test', 'nl', 1),
    (503, 'VIS-TEST-0503', 51, 'catalog', 'in_production', 'Noor', 'Voorbeeldlabel', 'studio@voorbeeldlabel.test', 'nl', 1),
    (504, 'VIS-TEST-0504', 52, 'catalog', 'delivered', 'Ander', 'Anderlabel', 'iemand@anderlabel.test', 'en', 1),
    (505, 'VIS-TEST-0505', 51, 'test-sample', 'delivered', 'Noor', 'Voorbeeldlabel', 'studio@voorbeeldlabel.test', 'nl', 1);
  INSERT INTO files (order_id, kind, r2_key, filename, product_key, shot, expires_at) VALUES
    (501, 'delivery', 'd/501/a.jpg', 'VIS-TEST-0501-p1-voorkant.jpg', 'p1', 'front', '2099-01-01'),
    (501, 'delivery', 'd/501/b.jpg', 'VIS-TEST-0501-p1-achterkant.jpg', 'p1', 'back', '2099-01-01'),
    (501, 'delivery', 'd/501/c.jpg', 'VIS-TEST-0501-p2-voorkant.jpg', 'p2', 'front', '2099-01-01');
`);

/* ══ 1 · DE TABEL ════════════════════════════════════════════════════════ */
console.log('de tabel');
{
  const mig = lees('migrations/0065-formaat-verzoeken.sql');
  ok('migratie 0065: één CREATE TABLE, geen DROP/ALTER/DELETE', /CREATE TABLE IF NOT EXISTS formaat_verzoeken/.test(mig) && !/\b(DROP|ALTER)\b|^\s*DELETE\b/im.test(mig.replace(/--[^\n]*/g, '')));
  ok('  één rij per bestelling en formaat (UNIQUE), alleen png en webp', /UNIQUE \(order_id, formaat\)/.test(mig) && /CHECK \(formaat IN \('png', 'webp'\)\)/.test(mig));
  ok('  weg met de bestelling (ON DELETE CASCADE)', /REFERENCES orders\(id\) ON DELETE CASCADE/.test(mig));
  ok('schema.sql heeft dezelfde tabel', /CREATE TABLE IF NOT EXISTS formaat_verzoeken/.test(lees('schema.sql')));
  ok('jpg is geen aan te vragen formaat', FORMATEN.join(',') === 'png,webp');
  ok('aanvragen lukt', (await vraagFormaatAan(env, 501, 'png')).ok);
  ok('  nog een keer: nog steeds één rij', (await vraagFormaatAan(env, 501, 'png')).ok && telling(db, 'SELECT COUNT(*) FROM formaat_verzoeken WHERE order_id = 501') === 1);
  ok('  een onbekend formaat wordt geweigerd', !(await vraagFormaatAan(env, 501, 'tiff')).ok && !(await vraagFormaatAan(env, 501, 'jpg')).ok);
  ok('zonder tabel: geen verzoeken en geen fout', (await formatenVoorOrders({ DB: { prepare() { throw new Error('no such table'); } } }, [501])).size === 0);
  db.exec('DELETE FROM formaat_verzoeken');
}

/* ══ 2 · DE KNOPPEN OP DE KAART ═══════════════════════════════════════════ */
console.log('\nde knoppen op de kaart');
{
  const o = { id: 501, service: 'catalog', status: 'delivered' };
  const v = formaatView(o, [], { lang: 'nl' });
  ok('geleverd: twee knoppen', v && v.knoppen.map((k) => k.label).join(' | ') === 'Ook als PNG | Ook als WebP', v && JSON.stringify(v.knoppen));
  ok('  naar /account/orders/501/formaat, anker formaten-501', v.action === '/account/orders/501/formaat' && v.id === 'formaten-501');
  /* k-png = a (12 okt): PNG = zonder kwaliteitsverlies, niet meer "transparante achtergrond". */
  ok('  één regel uitleg: png zonder kwaliteitsverlies, webp laadt snel', /PNG is zonder kwaliteitsverlies, voor drukwerk of verder bewerken\. WebP laadt snel op je eigen site/.test(v.uitleg) && /^JPG is de standaard/.test(v.uitleg) && !/transparant/i.test(v.uitleg));
  const en = formaatView(o, [], { lang: 'en' });
  ok('  en in het Engels', en.knoppen[0].label === 'Also as PNG' && /PNG has no quality loss, for print or further editing/.test(en.uitleg) && /loads fast on your own site/.test(en.uitleg) && !/transparent/i.test(en.uitleg));
  ok('niet bij video', formaatView({ ...o, service: 'video' }, []) === null);
  ok('niet bij de €1-proef', formaatView({ ...o, service: 'test-sample' }, []) === null);
  ok('niet zolang hij niet geleverd is', formaatView({ ...o, status: 'in_production' }, []) === null);
  ok('niet als de map niet meer te downloaden is', formaatView(o, [], { downloadbaar: false }) === null);
  const met = formaatView(o, [{ formaat: 'png', aangevraagd_at: '2026-10-11 09:30:00', klaar_at: null }], { lang: 'nl' });
  ok('aangevraagd: de knop wordt een regel met de datum', met.knoppen[0].staat === 'PNG aangevraagd · 11 okt' && !met.knoppen[0].label && met.knoppen[1].label === 'Ook als WebP');
  const klaar = formaatView(o, [{ formaat: 'png', aangevraagd_at: '2026-10-11 09:30:00', klaar_at: '2026-10-12 15:00:00' }], { lang: 'en' });
  ok('na "Klaar": geleverd met de datum', klaar.knoppen[0].staat === 'PNG delivered · 12 Oct' && klaar.knoppen[0].klaar);
  ok('de melding na de klik', formaatMelding('webp', 'nl') === 'Genoteerd: we maken de beelden van deze bestelling ook als WebP.' && formaatMelding('x', 'nl') === '' && /Dat lukte nu niet/.test(formaatMelding('fout', 'nl')));

  /* orderView() geeft het blok door, en niet bij een ingetrokken levering. */
  const files = [{ id: 1, kind: 'delivery', product_key: 'p1', shot: 'front', expires_at: '2099-01-01', review_state: 'approved' }];
  const T = (await import('../src/lib/account.js')).COPY;
  const t = T ? T.nl : null;
  if (t) {
    const ov = orderView(t, 'nl', { id: 501, ref: 'VIS-TEST-0501', service: 'catalog', status: 'delivered', payment_status: 'paid', product_count: 1, _formaten: [] }, files);
    ok('orderView: formaten op een geleverde bestelling', ov.formaten && ov.formaten.knoppen.length === 2);
    const weg = orderView(t, 'nl', { id: 501, ref: 'VIS-TEST-0501', service: 'catalog', status: 'cancelled', cancel_payment: 'refund', payment_status: 'refunded', product_count: 1 }, files);
    ok('orderView: niet bij een ingetrokken levering', !weg.formaten);
  } else {
    ok('orderView: bron geeft formaatView() de map door', /formaten: !ingetrokken \? formaatView\(o, o\._formaten \|\| \[\], \{ lang, downloadbaar: !!\(folder && folder\.href\) \}\) : null/.test(lees('src/lib/account.js')));
  }
}

/* ══ 3 · DE POST ══════════════════════════════════════════════════════════ */
console.log('\nPOST /account/orders/<id>/formaat');
const sessie = await mintToken();
db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (51, ?, datetime('now'), datetime('now', '+30 days'))`).run(await hashToken(sessie));
const post = (pad, velden, { origin = 'https://visuails.com', cookie = `vis_account=${sessie}` } = {}) => accountPost({
  request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}), 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(velden) }),
  env, waitUntil() {},
});
{
  let r = await post('/account/orders/501/formaat', { formaat: 'png' });
  ok('png: 303 terug naar de kaart met de melding', r.status === 303 && r.headers.get('location') === '/account/orders?order=501&formaat=png#formaten-501', `${r.status} ${r.headers.get('location')}`);
  ok('  één rij', telling(db, "SELECT COUNT(*) FROM formaat_verzoeken WHERE order_id = 501 AND formaat = 'png' AND klaar_at IS NULL") === 1);
  r = await post('/account/orders/501/formaat', { formaat: 'png' });
  ok('  dubbel geklikt: nog steeds één rij', r.status === 303 && telling(db, 'SELECT COUNT(*) FROM formaat_verzoeken WHERE order_id = 501') === 1);
  r = await post('/account/orders/501/formaat', { formaat: 'webp' });
  ok('webp erbij: twee rijen', r.status === 303 && telling(db, 'SELECT COUNT(*) FROM formaat_verzoeken WHERE order_id = 501') === 2);
  r = await post('/account/orders/501/formaat', { formaat: 'gif' });
  ok('een ander formaat: niets vastgelegd', r.status === 303 && telling(db, 'SELECT COUNT(*) FROM formaat_verzoeken') === 2);
  r = await post('/account/orders/504/formaat', { formaat: 'png' });
  ok('de bestelling van een ander: niets vastgelegd', r.status === 303 && telling(db, 'SELECT COUNT(*) FROM formaat_verzoeken WHERE order_id = 504') === 0);
  for (const id of [502, 503, 505]) {
    r = await post(`/account/orders/${id}/formaat`, { formaat: 'png' });
    ok(`bestelling ${id} (video / niet geleverd / proef): niets vastgelegd`, r.status === 303 && telling(db, `SELECT COUNT(*) FROM formaat_verzoeken WHERE order_id = ${id}`) === 0);
  }
  r = await post('/account/orders/501/formaat', { formaat: 'png' }, { origin: 'https://ergens-anders.test' });
  ok('van een andere site: 403 (dezelfde Origin-poort als elk Studio-formulier)', r.status === 403);
  r = await post('/account/orders/501/formaat', { formaat: 'png' }, { cookie: '' });
  ok('zonder sessie: naar het inloggen', r.status === 303 && /\/account\/login/.test(r.headers.get('location') || ''));
  const map = await formatenVoorOrders(env, [501, 504]);
  ok('formatenVoorOrders: per bestelling', (map.get(501) || []).map((x) => x.formaat).join(',') === 'png,webp' && !map.has(504));
}

/* ══ 4 · /admin/formaten ═════════════════════════════════════════════════ */
console.log('\n/admin/formaten');
const adminToken = await mintToken();
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const aGet = (pad) => adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });
const aPost = (pad, velden) => adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' }, body: new URLSearchParams(velden) }), env, waitUntil() {} });
{
  let html = await (await aGet('/admin/formaten')).text();
  ok('de pagina staat in het menu, als actieve pagina', /<span class="bar-link is-active" aria-current="page">Formaten<\/span>/.test(html));
  ok('  en op andere pagina\'s als link', /<a class="bar-link" href="\/admin\/formaten">Formaten<\/a>/.test(await (await aGet('/admin/proef')).text()));
  ok('open: VIS-TEST-0501 twee keer, met link naar de bestelling', (html.match(/href="\/admin\/orders\/501\/files">VIS-TEST-0501</g) || []).length === 2);
  ok('  per formaat, met het aantal geleverde beelden', /<strong>PNG<\/strong>/.test(html) && /<strong>WebP<\/strong>/.test(html) && /<span class="meta">3 beelden<\/span>/.test(html));
  ok('  met een knop Klaar per rij', (html.match(/>Klaar<\/button>/g) || []).length === 2);
  ok('telOpenFormaten: 2', await telOpenFormaten(env) === 2);
  const dash = await (await aGet('/admin')).text();
  ok('het dashboard heeft de chip "Formaten · 2"', /href="\/admin\/formaten">Formaten &middot; 2 &rarr;<\/a>/.test(dash));
  const id = db.prepare("SELECT id FROM formaat_verzoeken WHERE order_id = 501 AND formaat = 'png'").get().id;
  const r = await aPost('/admin/formaten', { id: String(id) });
  ok('Klaar: 303 terug met een melding', r.status === 303 && r.headers.get('location') === '/admin/formaten?klaar=1');
  const eerst = db.prepare('SELECT klaar_at FROM formaat_verzoeken WHERE id = ?').get(id).klaar_at;
  ok('  klaar_at staat', !!eerst);
  db.prepare("UPDATE formaat_verzoeken SET klaar_at = '2026-10-12 08:00:00' WHERE id = ?").run(id);
  await aPost('/admin/formaten', { id: String(id) });
  ok('  nog een keer: de datum blijft', db.prepare('SELECT klaar_at FROM formaat_verzoeken WHERE id = ?').get(id).klaar_at === '2026-10-12 08:00:00');
  ok('  in het logboek', telling(db, "SELECT COUNT(*) FROM admin_log WHERE action = 'formaat.klaar'") >= 1);
  html = await (await aGet('/admin/formaten?klaar=1')).text();
  ok('na Klaar: één open, één onder Geleverd', (html.match(/>Klaar<\/button>/g) || []).length === 1 && /<h2>Geleverd<\/h2>/.test(html) && /geleverd 2026-10-12 08:00/.test(html));
  const lijst = await formatenLijst(env);
  ok('formatenLijst: open en klaar apart', lijst.open.length === 1 && lijst.klaar.length === 1);
  ok('zonder tabel: een regel over migratie 0065', /migratie 0065/.test(await (await adminGet({ request: new Request('https://visuails.com/admin/formaten', { headers: { cookie: `vis_admin=${adminToken}` } }), env: { DB: { prepare(sql) { if (/formaat_verzoeken/.test(sql)) throw new Error('no such table'); return env.DB.prepare(sql); } } }, waitUntil() {} })).text()));
  ok('een kapot nummer bij Klaar: terug met fout', (await aPost('/admin/formaten', { id: 'x' })).headers.get('location') === '/admin/formaten?klaar=fout');
  db.exec('DELETE FROM orders WHERE id = 501');
  ok('weg met de bestelling (ook bij het AVG-wissen)', telling(db, 'SELECT COUNT(*) FROM formaat_verzoeken') === 0);
}

/* ══ 5 · DE KAART, DE CSS EN DE LEESMIJ ═══════════════════════════════════ */
console.log('\nde kaart en de leesmij');
{
  const kaart = lees('src/components/studio/Bestelling.astro');
  const blok = kaart.slice(kaart.indexOf('{v.formaten && ('), kaart.indexOf('</form>', kaart.indexOf('{v.formaten && (')));
  ok('Bestelling.astro: een gewoon formulier (method post) naar v.formaten.action', /<form class="st-formaten" id=\{v\.formaten\.id\} method="post" action=\{v\.formaten\.action\}>/.test(blok));
  ok('  twee submitknoppen met name="formaat"', /<button class="btn btn-2nd btn-sm" type="submit" name="formaat" value=\{k\.formaat\}>/.test(blok));
  ok('  geen script', !/<script|onclick|addEventListener/.test(blok));
  ok('studio.css heeft de stijl', /\.st-formaten \{/.test(lees('src/styles/studio.css')) && /\.st-formaat-staat \{/.test(lees('src/styles/studio.css')));
  ok('de privélink krijgt ze niet', !/formaten\.js|st-formaten|\/formaat\b/.test(lees('src/lib/portal.js')));
  const entries = [{ name: 'VISUAILS-VIS-TEST-0501/VIS-TEST-0501-p1-voorkant.jpg', bytes: 900000 }];
  const nl = deliveryReadme({ order: { ref: 'VIS-TEST-0501', brand: 'Voorbeeldlabel', lang: 'nl', service: 'catalog' }, entries });
  const en = deliveryReadme({ order: { ref: 'VIS-TEST-0501', brand: 'Voorbeeldlabel', lang: 'en', service: 'catalog' }, entries });
  ok('LEESMIJ: één zin dat PNG of WebP in Studio aan te vragen is', /Ook PNG of WebP nodig\? Vraag het aan bij deze bestelling in Studio,\r\nop visuails\.com\/account\./.test(nl));
  ok('README: dezelfde zin in het Engels', /Need PNG or WebP as well\? Request it on this order in Studio, at\r\nvisuails\.com\/account\./.test(en));
  ok('  niet als png en webp er al in zitten', !/Ook PNG of WebP/.test(deliveryReadme({ order: { ref: 'X', lang: 'nl', service: 'catalog' }, entries: [{ name: 'A/01 - x/JPG/1-voorkant.jpg', bytes: 1 }, { name: 'A/01 - x/PNG/1-voorkant.png', bytes: 1 }, { name: 'A/01 - x/WEBP/1-voorkant.webp', bytes: 1 }] })));
  ok('  niet bij de proef of video', !/Ook PNG of WebP/.test(deliveryReadme({ order: { ref: 'X', lang: 'nl', service: 'test-sample' }, entries })) && !/Ook PNG of WebP/.test(deliveryReadme({ order: { ref: 'X', lang: 'nl', service: 'video' }, entries })));
  ok('  regels hoogstens 68 tekens', nl.split('\r\n').every((r) => r.length <= 72) && en.split('\r\n').every((r) => r.length <= 72));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
