/*
 * RONDE 91 · D04 — EEN ONBETAALDE DUBBELE VERWIJDEREN KOST DE BETAALDE BESTELLING HAAR FOTO'S NIET MEER
 * 9 november 2026
 *
 * Twee bestellingen met dezelfde upload_batch delen hun r2_key's. Dat gebeurt als het antwoord op
 * /api/order verloren gaat en er nog een keer verstuurd wordt (de browser doet dat zelfs uit zichzelf op
 * een weggevallen verbinding: 91/werk/d/d04-netwerk.mjs, S7 — één klik, twee bestellingen). De knop
 * "verwijderen" in /admin (alleen voor onbetaalde) gooide daarna de objecten in R2 weg waar de betaalde
 * bestelling ook naar wees: rijen bleven, bestanden weg. Nu blijft een sleutel staan zolang een andere
 * bestelling (of de lijst van een abonnee) ernaar wijst — dezelfde regel als EXPIRED_FILES_SQL.
 *
 *   node tests/blind91-d-verwijder-gedeeld.test.mjs
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — ronde 91 D04: verwijderen van een onbetaalde dubbele bestelling\n');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0);
const B = 'B'.repeat(43);
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (92, 'dubbel@voorbeeldmerk.test', 'Testa Proef', 'Proefmerk', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, details_json, payment_status, country) VALUES
    (9201, 'VIS-TEST-9201', 92, 'catalog', 'received', 'Testa Proef', 'Proefmerk', 'dubbel@voorbeeldmerk.test', 5000, 'nl', 1, '{"upload_batch":"${B}"}', 'open', 'NL'),
    (9202, 'VIS-TEST-9202', 92, 'catalog', 'received', 'Testa Proef', 'Proefmerk', 'dubbel@voorbeeldmerk.test', 5000, 'nl', 1, '{"upload_batch":"${B}"}', 'paid', 'NL'),
    (9203, 'VIS-TEST-9203', 92, 'catalog', 'received', 'Testa Proef', 'Proefmerk', 'dubbel@voorbeeldmerk.test', 5000, 'nl', 1, '{}', 'open', 'NL');
  INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot) VALUES
    (9201, 'upload', 'intake/${B}/001-aaaa-voorkant.jpg', 'voorkant.jpg', 9, 'p1', 'front'),
    (9201, 'upload', 'intake/${B}/002-bbbb-achterkant.jpg', 'achterkant.jpg', 9, 'p1', 'back'),
    (9202, 'upload', 'intake/${B}/001-aaaa-voorkant.jpg', 'voorkant.jpg', 9, 'p1', 'front'),
    (9202, 'upload', 'intake/${B}/002-bbbb-achterkant.jpg', 'achterkant.jpg', 9, 'p1', 'back'),
    (9203, 'upload', 'intake/eigen/001-cccc-los.jpg', 'los.jpg', 9, 'p1', 'front');
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
const r2 = new Set([`intake/${B}/001-aaaa-voorkant.jpg`, `intake/${B}/002-bbbb-achterkant.jpg`, 'intake/eigen/001-cccc-los.jpg']);
const env = { DB: d1(db), UPLOADS: { async delete(k) { r2.delete(k); }, async get() { return null; }, async list() { return { objects: [] }; } } };
const verwijder = async (id, ref) => {
  const fd = new FormData();
  fd.set('confirm', ref);
  return adminPost({ request: new Request(`https://visuails.com/admin/orders/${id}/delete`, { method: 'POST', body: fd, headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' } }), env, waitUntil() {} });
};

const r1 = await verwijder(9201, 'VIS-TEST-9201');
ok('de onbetaalde dubbele is weg (303 naar /admin)', r1.status === 303 && !db.prepare('SELECT 1 FROM orders WHERE id = 9201').get(), String(r1.status));
ok('de betaalde heeft haar twee rijen nog', db.prepare('SELECT COUNT(*) n FROM files WHERE order_id = 9202').get().n === 2);
ok('en haar twee foto\'s staan nog in R2', r2.has(`intake/${B}/001-aaaa-voorkant.jpg`) && r2.has(`intake/${B}/002-bbbb-achterkant.jpg`), [...r2].join(', '));
const log = db.prepare("SELECT detail FROM admin_log WHERE action = 'order.delete' ORDER BY id DESC LIMIT 1").get();
ok('het logboek zegt dat er twee bewaard zijn', !!log && /0 bestand\(en\) uit R2, 2 bewaard/.test(log.detail), log && log.detail);

/* Een bestelling met eigen foto's: die gaan wél weg, zoals altijd. */
const r3 = await verwijder(9203, 'VIS-TEST-9203');
ok('een gewone onbetaalde bestelling: weg', r3.status === 303 && !db.prepare('SELECT 1 FROM orders WHERE id = 9203').get());
ok('en haar eigen foto is uit R2', !r2.has('intake/eigen/001-cccc-los.jpg'));
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
