/**
 * Ronde 91, A16 (9 november 2026): de bestanden die /admin teruggeeft dragen
 * `X-Content-Type-Options: nosniff`. De model-, look- en maandsetbeelden hadden
 * hem al; een intakefoto (/admin/files/<id>), een pdf en de facturen-CSV niet.
 * Een intakefoto kan een JPEG-kop met HTML erachter zijn (/api/upload kijkt alleen
 * naar de eerste bytes), en die komt op hetzelfde origin als /admin.
 * Draai: node tests/blind91-a-nosniff.test.mjs
 */
import { adminGet } from '../src/lib/admin.js';
import { hashToken, mintToken } from '../src/lib/token.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
function ok(naam, waar, detail = '') {
  if (waar) goed++; else fout++;
  console.log(`${waar ? ' ok  ' : ' FAIL'} ${naam}${waar ? '' : `  ${detail}`}`);
}
const { db } = verseDb(new URL('../schema.sql', import.meta.url));
const token = mintToken();
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'lucas@voorbeeld.test', 'x')`);
db.prepare("INSERT INTO admin_sessions (admin_id, token_hash, expires_at, last_used_at) VALUES (1, ?, '2099-01-01T00:00:00Z', datetime('now'))").run(await hashToken(token));
db.exec(`INSERT INTO orders (id, ref, service, status, email, total_cents, lang) VALUES (1, 'VIS-TEST-001', 'catalog', 'received', 'k@voorbeeld.test', 100, 'nl')`);
db.exec(`INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state) VALUES (5, 1, 'upload', 'intake/x/001-foto.jpg', 'foto.jpg', 3, 'pending')`);
db.exec(`INSERT INTO invoices (id, number, year, seq, order_id, status, pdf_key, snapshot_json, issued_at) VALUES (3, 'VIS-2026-0001', 2026, 1, 1, 'issued', 'invoices/2026/VIS-2026-0001.pdf', '{"customer":{"name":"Kees"},"netCents":100,"vatCents":21}', datetime('now'))`);
const R2 = {
  async get(key) {
    const body = key.endsWith('.pdf') ? '%PDF-1.4' : '\xff\xd8\xff<html><script>alert(1)</script>';
    return { body: new Response(body).body, httpMetadata: { contentType: key.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' }, writeHttpMetadata(h) { h.set('content-type', this.httpMetadata.contentType); } };
  },
};
const env = { DB: d1(db), UPLOADS: R2 };
const haal = (pad) => adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil: () => {} });
const kw = `${new Date().getUTCFullYear()}-Q${Math.floor(new Date().getUTCMonth() / 3) + 1}`;
for (const [naam, pad, type] of [
  ['intakefoto /admin/files/5', '/admin/files/5', 'image/jpeg'],
  ['factuur-pdf /admin/invoices/3/pdf', '/admin/invoices/3/pdf', 'application/pdf'],
  ['facturen-CSV', `/admin/facturen?csv=1&kwartaal=${kw}`, 'text/csv'],
]) {
  const r = await haal(pad);
  ok(`${naam}: ${type} en nosniff`, r.status === 200 && (r.headers.get('content-type') || '').startsWith(type) && r.headers.get('x-content-type-options') === 'nosniff',
    `${r.status} ${r.headers.get('content-type')} nosniff=${r.headers.get('x-content-type-options')}`);
}
console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
