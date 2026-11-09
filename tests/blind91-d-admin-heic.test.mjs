/*
 * RONDE 91 · D03 — /admin TOONT "HEIC" IN PLAATS VAN EEN GEBROKEN BEELD
 * 9 november 2026
 *
 * Een HEIC (iPhone) of TIFF komt via het bestelformulier gewoon binnen, maar Chrome en Edge kunnen hem
 * niet tekenen: op de bestelpagina (de brief per product) en op de bestandenpagina stond een gebroken-
 * beeldje zonder uitleg. Nagespeeld met een echte HEIC in 91/werk/d/d03-admin.mjs. Nu staat het formaat
 * in het vakje en blijft de link (download van het origineel) dezelfde. Jpg, png, webp, avif en gif
 * houden hun <img>.
 *
 *   node tests/blind91-d-admin-heic.test.mjs
 */
import fs from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — ronde 91 D03: HEIC en TIFF in /admin\n');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0);
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (91, 'heic@voorbeeldmerk.test', 'Testa Proef', 'Proefmerk', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, details_json, payment_status, country)
    VALUES (9101, 'VIS-TEST-9101', 91, 'catalog', 'received', 'Testa Proef', 'Proefmerk', 'heic@voorbeeldmerk.test', 5000, 'nl', 1,
            '{"product_p1":"Hoodie","garment_p1":"top"}', 'paid', 'NL');
  INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, product_key, shot) VALUES
    (1, 9101, 'upload', 'intake/x/001-a-IMG_4821.HEIC', 'IMG_4821.HEIC', 591936, 'p1', 'front'),
    (2, 9101, 'upload', 'intake/x/002-b-exif6.jpg', 'exif6.jpg', 740378, 'p1', 'back'),
    (3, 9101, 'upload', 'intake/x/003-c-foto.tif', 'foto.tif', 532996, 'p1', 'detail'),
    (4, 9101, 'upload', 'intake/x/004-d-foto.heif', 'foto.heif', 591936, 'p1', 'worn'),
    (5, 9101, 'delivery', 'delivery/VIS-TEST-9101/p1-front.tif', 'VIS-TEST-9101-p1-voorkant.tif', 900000, 'p1', 'front');
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
const env = { DB: d1(db), UPLOADS: { async get() { return null; }, async put() {}, async list() { return { objects: [] }; } } };
const pagina = async (pad) => (await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} })).text();

/* /admin/orders/<id> stuurt door naar /files: daar staan de brief per product (.brief-duim, de foto's van de
   klant) en de indeeltabel (de geleverde bestanden). */
{
  const label = 'bestandenpagina';
  const h = await pagina('/admin/orders/9101/files');
  const tegels = (id) => (h.match(new RegExp(`href="/admin/files/${id}"[^>]*>\\s*<span class="duim-formaat`, 'g')) || []).length;
  ok(`${label}: de HEIC van de klant staat als tegel in de brief`, tegels(1) === 1 && /class="brief-duim"[^>]*href="\/admin\/files\/1"[^>]*>\s*<span class="duim-formaat"/.test(h), String(tegels(1)));
  ok(`${label}: een geleverde TIFF staat als tegel in de indeeltabel`, /href="\/admin\/files\/5"[^>]*>\s*<span class="duim-formaat thumb"[^>]*>TIFF</.test(h));
  /* Sinds lijst 87 (D13) het duimpje: /admin/files/<id>/duim (preview_key, anders het origineel). */
  const imgVan = (id) => new RegExp(`<img[^>]*src="/admin/files/${id}(?:/duim)?"`).test(h);
  const tegel = (id, ext) => new RegExp(`href="/admin/files/${id}"[^>]*>\\s*<span class="duim-formaat[^"]*"[^>]*>${ext}</span>`).test(h);
  ok(`${label}: HEIC krijgt geen <img>`, !imgVan(1));
  ok(`${label}: HEIC staat er als "HEIC", met de link naar het origineel`, tegel(1, 'HEIC'));
  ok(`${label}: TIFF staat er als "TIFF"`, !imgVan(3) && tegel(3, 'TIFF'));
  ok(`${label}: HEIF staat er als "HEIF"`, !imgVan(4) && tegel(4, 'HEIF'));
  ok(`${label}: de jpg houdt zijn <img>`, imgVan(2));
}

/* De stijl: tekst ≥ 11,5 px, en inkt op papier (dezelfde tokens als de rest van /admin). */
const css = fs.readFileSync(new URL('../public/admin.css', import.meta.url), 'utf8');
const regel = /\.duim-formaat \{([^}]*)\}/.exec(css);
ok('admin.css heeft .duim-formaat', !!regel);
const px = regel && /font-size:\s*([\d.]+)px/.exec(regel[1]);
ok('de letter is minstens 11,5 px', !!px && Number(px[1]) >= 11.5, px && px[1]);
ok('inkt op papier (kantelt mee met donker)', !!regel && /color:\s*var\(--ink\)/.test(regel[1]) && /background:\s*var\(--paper-2\)/.test(regel[1]));
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
