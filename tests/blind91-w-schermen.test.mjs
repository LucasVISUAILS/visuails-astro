/* VISUAILS — ronde 91, bouwer W, nawerk na het kijken naar de schermen (licht en donker, 1440 en 390).
 *   node tests/blind91-w-schermen.test.mjs        (geen server, geen browser)
 *
 *   · de dashboardrij noemt bij voorrang de echte termijn ("voorrang · uiterlijk 10 nov 17:00", uit
 *     voorrangDeadline, zoals Nu doen en de planning), en die tekst mag afbreken in plaats van over de statuspil heen
 *     te lopen;
 *   · in Nu doen staat "ook: foto’s vragen · 2 foto’s ontbreken (…)" zonder haakjes in haakjes;
 *   · het vakje met een revisie beslaat de rij met het beeld links (hoogstens 200 px) en de reden ernaast, en niet
 *     een beeld over de volle breedte.
 * De schermbeelden zelf: S/91/werk/w/shots/ (kijk.mjs). Verzonnen merken en adressen.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { voorrangDeadline } from '../src/data/pricing.js';
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
  INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, tier, name, brand, email, total_cents, lang, product_count, payment_status, country, created_at, paid_at, details_json) VALUES
    (1, 'VIS-WS-0001', 1, 'catalog', 'received',      'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 'nl', 1, 'paid',   'NL', '2026-11-25 15:55:00', '2026-11-25 16:00:00', '{"voorrang":1}'),
    (2, 'VIS-WS-0002', 1, 'catalog', 'received',      'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 'nl', 1, 'unpaid', 'NL', datetime('now'), NULL, '{"voorrang":1}'),
    (3, 'VIS-WS-0003', 1, 'catalog', 'in_production', 'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 'nl', 1, 'paid',   'NL', datetime('now','-3 days'), datetime('now','-3 days'), '{}');
  INSERT INTO files (id, order_id, kind, r2_key, product_key, shot, created_at) VALUES (31, 3, 'upload', 'intake/3/f.jpg', 'p1', 'front', datetime('now','-3 days'));
`);
const { html } = await (async () => {
  const res = await adminGet({ request: new Request('https://visuails.com/admin', { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
  return { html: await res.text() };
})();
const rij = (id) => (new RegExp(`<details class="or" id="order-${id}">[\\s\\S]*?</summary>`).exec(html) || [''])[0];
const d = voorrangDeadline('2026-11-25 16:00:00');
ok('voorrang, betaald: de echte termijn in de rij', /<strong class="or-voorrang">voorrang · uiterlijk 27 nov 17:00<\/strong>/.test(rij(1)) && d.datum === '2026-11-27', true);
ok('voorrang, nog niet betaald: "na betaling"', /voorrang · na betaling/.test(rij(2)), true);
ok('nergens meer "volgende werkdag" in de rijen', /volgende werkdag/.test(rij(1) + rij(2)), false);
ok('"ook" zonder haakjes in haakjes', /class="nd-ook">ook: <a href="\/admin\/orders\/3\/files#ontbreekt">foto’s vragen<\/a> <span class="meta">&middot; \d foto’s ontbreken/.test(html), true);
const css = readFileSync(new URL('../public/admin.css', import.meta.url), 'utf8');
ok('admin.css: de voorrangstekst mag afbreken in de kolom Wanneer', /\.or-wanneer \.or-voorrang \{ white-space: normal;/.test(css), true);
ok('admin.css: het vakje met een revisie is beeld (≤ 200 px) plus tekst', /\.slots > \.slot\.is-revising \{\s*grid-column: 1 \/ -1; display: grid; grid-template-columns: minmax\(120px, 200px\) minmax\(0, 1fr\);/.test(css), true);

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
