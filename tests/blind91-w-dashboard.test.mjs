/* VISUAILS — ronde 91, w6 (lijst 85, B2 = goed): het dashboard, alles één keer.
 *   node tests/blind91-w-dashboard.test.mjs        (geen server, geen browser)
 *
 *   · de rij tegels is weg (ze linkten naar dezelfde filters als de chips);
 *   · geen formulieren in de rijen van de bestellijst: geen statuslijstje, geen klapje annuleren/verbergen/
 *     verwijderen — dat staat op de bestelpagina, onder Onomkeerbaar;
 *   · de lijst over de volle breedte (geen zijkolom), in de volgorde Nu doen → de lijst met zoeken en filters →
 *     de bewakers met wat op betaling wacht.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? 'ok  ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const env = { DB: d1(db) };
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, tier, name, brand, email, phone, total_cents, vat_cents, lang, product_count, payment_status, country, created_at, paid_at, delivered_at, delivery_mailed_at) VALUES
    (81, 'VIS-WD-0081', 1, 'catalog', 'received',      'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'unpaid', 'NL', datetime('now','-2 days'), NULL, NULL, NULL),
    (82, 'VIS-WD-0082', 1, 'catalog', 'in_production', 'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid',   'NL', datetime('now','-1 days'), datetime('now','-1 days'), NULL, NULL),
    (83, 'VIS-WD-0083', 1, 'catalog', 'delivered',     'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid',   'NL', datetime('now','-6 days'), datetime('now','-6 days'), datetime('now','-3 days'), datetime('now','-3 days'));
`);
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};

const { status, html } = await get('/admin');
ok('het dashboard laadt', status, 200);
ok('geen rij tegels meer', [/class="stats"/.test(html), /class="stat-n"/.test(html)], [false, false]);
ok('geen zijkolom meer, de lijst over de volle breedte', [/class="db-zij"/.test(html), /class="db-vlakken"/.test(html), /<section class="db-hoofd is-vol">/.test(html)], [false, false, true]);
const rijen = [...html.matchAll(/<details class="or" id="order-\d+">[\s\S]*?<\/details>/g)].map((m) => m[0]);
ok('drie rijen in de lijst', rijen.length, 3);
ok('geen enkel formulier in de rijen (geen lijstje, geen annuleren, verbergen of verwijderen)', rijen.map((r) => (r.match(/<form\b/g) || []).length), [0, 0, 0]);
ok('  en geen route naar cancel, hide of delete op het dashboard', /\/admin\/orders\/\d+\/(cancel|hide|delete)/.test(html), false);
ok('  wel een link naar de bestelling in het klapje', rijen.every((r) => /Naar de bestelling(?: &rarr;|<svg)/.test(r)), true);  /* knoppensysteem lijst 88/89: de getypte pijl is het icoon pijl-schuin */ 
const b = await get('/admin/orders/81/files');
ok('op de bestelpagina staan annuleren, verbergen en verwijderen onder Onomkeerbaar', /<h2 id="annuleren">Onomkeerbaar<\/h2>[\s\S]*action="\/admin\/orders\/81\/cancel"[\s\S]*action="\/admin\/orders\/81\/hide"[\s\S]*action="\/admin\/orders\/81\/delete"/.test(b.html), true);
ok('de filters blijven als links (chips)', ['f=unpaid', 'f=revisions', 'status=in_production', 'status=delivered'].every((q) => html.includes(`href="/admin?${q}"`)), true);
const plek = (s) => html.indexOf(s);
ok('de volgorde: Nu doen → de bestellingen → de bewakers en wat op betaling wacht',
  plek('id="nu-doen"') > -1 && plek('id="nu-doen"') < plek('<h2>Bestellingen') && plek('<h2>Bestellingen') < plek('class="db-rand"'), true);
ok('  wat op betaling wacht, met de contactknoppen, staat in die rand', /class="db-rand"[\s\S]*class="db-wacht"[\s\S]*VIS-WD-0081[\s\S]*wa\.me\/31612345678/.test(html), true);

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
