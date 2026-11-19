/*
 * LEVERING 117 · B1-06 en B1-12 — ALLE FOTO'S BIJ DE BESTELLING, EN EEN OPRUIMING DIE WEER DRAAIT
 * 17 november 2026
 *
 *   node tests/levering-117-opruimen.test.mjs        (geen build nodig)
 *
 * B1-06 · listBatch() las alleen de eerste bladzijde van R2. Met include: ['customMetadata']
 *         geeft R2 hoogstens 100 objecten per keer; bij 60 foto's + 60 duimpjes kwamen er 50
 *         bij de bestelling. De nep-bucket hieronder doet precies wat R2 doet: 100 per keer,
 *         `truncated` en een `cursor`.
 * B1-12 · De nachtelijke opruiming (EXPIRED_FILES_SQL) en "Voorgoed verwijderen" in /admin
 *         gebruikten LIKE 'intake/' || batch || '/%': 52 tekens, D1 staat er 50 toe. De
 *         sqlite hieronder krijgt een eigen like() die dezelfde grens bewaakt als D1.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { listBatch, batchPrefix } from '../src/lib/uploads.js';
import { EXPIRED_FILES_SQL } from '../src/lib/retention.js';
import { adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117: B1-06 (60 foto\'s) en B1-12 (opruiming zonder LIKE)\n');

/* ── B1-06 ─────────────────────────────────────────────────────────────── */
console.log('B1-06 · een batch van 60 foto\'s met duimpjes');
{
  const batch = await mintToken();
  const pre = batchPrefix(batch);
  const sleutels = [];
  for (let i = 1; i <= 60; i++) {
    const k = `${pre}${String(i).padStart(3, '0')}-abcd-foto${i}.jpg`;
    sleutels.push(k, `${k}.duim.webp`);
  }
  sleutels.sort();
  let aanroepen = 0;
  const env = {
    UPLOADS: {
      /* Zoals R2: met include hoogstens 100 per keer, met truncated en cursor. */
      async list({ prefix, limit, include, cursor }) {
        aanroepen++;
        const max = include ? Math.min(100, limit) : limit;
        const van = cursor ? Number(cursor) : 0;
        const alle = sleutels.filter((k) => k.startsWith(prefix));
        const stuk = alle.slice(van, van + max);
        const truncated = van + max < alle.length;
        return {
          objects: stuk.map((key) => ({ key, size: 10, customMetadata: { product: 'p1', shot: 'front', original: key.split('/').pop() } })),
          truncated,
          ...(truncated ? { cursor: String(van + max) } : {}),
        };
      },
    },
  };
  const lijst = await listBatch(env, batch);
  ok('alle 60 foto\'s komen terug (niet 50)', lijst.length === 60, String(lijst.length));
  ok('geen duimpje telt als foto', lijst.every((f) => !f.key.endsWith('.duim.webp')));
  ok('elke foto heeft zijn duimpje als preview', lijst.every((f) => f.preview === `${f.key}.duim.webp`));
  ok('er is doorgebladerd (meer dan één aanroep)', aanroepen > 1, String(aanroepen));

  /* Een cursor die niet verder komt, loopt niet eindeloos door. */
  let rondjes = 0;
  const vast = { UPLOADS: { async list() { rondjes++; return { objects: [], truncated: true, cursor: 'zelfde' }; } } };
  const leeg = await listBatch(vast, batch);
  ok('een vastgelopen cursor stopt (lege lijst, geen eindeloze lus)', leeg.length === 0 && rondjes <= 2, String(rondjes));
}

/* ── B1-12 ─────────────────────────────────────────────────────────────── */
/* Een like() met dezelfde grens als D1 (SQLITE_LIMIT_LIKE_PATTERN_LENGTH = 50). */
const metD1Grens = (db) => {
  const zoals = (patroon, waarde) => {
    const p = String(patroon ?? '');
    if (p.length > 50) throw new Error('LIKE or GLOB pattern too complex');
    const re = new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'is');
    return re.test(String(waarde ?? '')) ? 1 : 0;
  };
  db.function('like', { deterministic: true }, zoals);
  return db;
};

console.log('\nB1-12 · de nachtelijke opruiming (EXPIRED_FILES_SQL)');
{
  ok('EXPIRED_FILES_SQL heeft geen LIKE meer', !/\bLIKE\b/i.test(EXPIRED_FILES_SQL));
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  metD1Grens(db);
  ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
  /* De nep-like zelf: een patroon van 52 tekens faalt, zoals op D1. */
  let grensWerkt = false;
  try { db.prepare(`SELECT 1 WHERE 'x' LIKE '${'a'.repeat(52)}%'`).get(); } catch (e) { grensWerkt = /too complex/.test(e.message); }
  ok('(de toets bootst de D1-grens na)', grensWerkt);

  const OP = 'Q'.repeat(43);   // staat nog op de lijst van een abonnee
  const WEG = 'W'.repeat(43);  // staat nergens meer
  db.exec(`
    INSERT INTO customers (id, email, name, brand, country) VALUES (117, 'opruim@voorbeeldmerk.test', 'Testa Proef', 'Proefmerk', 'NL');
    INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, payment_status, country, created_at, cancelled_at) VALUES
      (11701, 'VIS-TEST-11701', 117, 'catalog', 'cancelled', 'Testa Proef', 'Proefmerk', 'opruim@voorbeeldmerk.test', 0, 'nl', 1, 'open', 'NL', datetime('now','-200 days'), datetime('now','-200 days')),
      (11702, 'VIS-TEST-11702', 117, 'catalog', 'cancelled', 'Testa Proef', 'Proefmerk', 'opruim@voorbeeldmerk.test', 0, 'nl', 1, 'open', 'NL', datetime('now','-200 days'), datetime('now','-200 days'));
    INSERT INTO files (order_id, kind, r2_key, filename, bytes) VALUES
      (11701, 'upload', 'intake/${OP}/001-aaaa-a.jpg', 'a.jpg', 9),
      (11702, 'upload', 'intake/${WEG}/001-bbbb-b.jpg', 'b.jpg', 9);
    INSERT INTO plan_queue (customer_id, name, upload_batch) VALUES (117, 'Jas', '${OP}');
  `);
  let rijen = null;
  let fout = '';
  try { rijen = (await d1(db).prepare(EXPIRED_FILES_SQL).bind(500).all()).results; } catch (e) { fout = e.message; }
  ok('de zoekvraag faalt niet meer op de D1-grens', Array.isArray(rijen), fout);
  const sl = (rijen || []).map((r) => r.r2_key);
  ok('het verlaten bestand wordt gevonden', sl.includes(`intake/${WEG}/001-bbbb-b.jpg`), sl.join(', '));
  ok('het bestand op de lijst van een abonnee blijft staan', !sl.includes(`intake/${OP}/001-aaaa-a.jpg`), sl.join(', '));
}

console.log('\nB1-12 · "Voorgoed verwijderen" in /admin');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  metD1Grens(db);
  const OP = 'R'.repeat(43);
  db.exec(`
    INSERT INTO customers (id, email, name, brand, country) VALUES (118, 'abo@voorbeeldmerk.test', 'Testa Proef', 'Proefmerk', 'NL');
    INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, payment_status, country) VALUES
      (11801, 'VIS-TEST-11801', 118, 'catalog', 'received', 'Testa Proef', 'Proefmerk', 'abo@voorbeeldmerk.test', 5000, 'nl', 1, 'open', 'NL');
    INSERT INTO files (order_id, kind, r2_key, filename, bytes) VALUES (11801, 'upload', 'intake/${OP}/001-aaaa-jas.jpg', 'jas.jpg', 9);
    INSERT INTO plan_queue (customer_id, name, upload_batch) VALUES (118, 'Jas', '${OP}');
    INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
  `);
  const token = await mintToken();
  db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
  const r2 = new Set([`intake/${OP}/001-aaaa-jas.jpg`]);
  const env = { DB: d1(db), UPLOADS: { async delete(k) { r2.delete(k); }, async get() { return null; }, async list() { return { objects: [] }; } } };
  const fd = new FormData();
  fd.set('confirm', 'VIS-TEST-11801');
  const r = await adminPost({ request: new Request('https://visuails.com/admin/orders/11801/delete', { method: 'POST', body: fd, headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' } }), env, waitUntil() {} });
  ok('de onbetaalde bestelling is weg', r.status === 303 && !db.prepare('SELECT 1 FROM orders WHERE id = 11801').get(), String(r.status));
  ok('de foto op de lijst van de abonnee staat nog in R2', r2.has(`intake/${OP}/001-aaaa-jas.jpg`));
  const log = db.prepare("SELECT detail FROM admin_log WHERE action = 'order.delete' ORDER BY id DESC LIMIT 1").get();
  ok('het logboek zegt dat er één bewaard is', !!log && /1 bewaard/.test(log.detail), log && log.detail);
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
