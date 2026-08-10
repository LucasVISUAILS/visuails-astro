/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE OPRUIMTAAK, TEGEN HET ECHTE SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Dit is de enige van de drie nachtelijke taken die iets doet wat je niet terug kunt
 * draaien: hij verwijdert objecten uit R2 en gooit daarna de rij in `files` weg. Er is
 * geen prullenbak en er is geen versiegeschiedenis op de bucket. Wat hier fout gaat,
 * gaat definitief fout, en pas maanden later — op het moment dat een klant vraagt waar
 * zijn materiaal is.
 *
 * Daarom draait deze test de ECHTE functie uit cron/index.js tegen de ECHTE schema.sql,
 * met een D1 op node:sqlite (D1 is SQLite, dus dezelfde datetime-rekenkunde) en een
 * emmer in het geheugen. Niet een kopie van de query in de test, want dan test je je
 * kopie. Wijkt het schema af van wat de taak aanneemt, dan valt dat hier om.
 *
 * De vier vragen die dit stelt:
 *
 *   1 · verdwijnt precies wat verlopen is, en blijft precies wat dat niet is
 *   2 · gaan preview en varianten mee met hun bron
 *   3 · staat er achteraf op de tijdlijn van de bestelling WAT er weg is en WAAROM
 *   4 · blijft de opruiming een geslaagde opruiming als het schrijven van die
 *       tijdlijnregel mislukt — de bestanden zijn dan immers al weg
 *
 * Vraag 3 en 4 zijn er op 10 augustus 2026 bij gekomen. `DELETE FROM files` wist ook
 * het spoor dat het bestand ooit bestond; zonder regel op de tijdlijn is er na een
 * maand niets meer waaruit je kunt vaststellen wat er verdween en wanneer.
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tasks } from '../cron/index.js';
import { UPLOAD_DAYS, DELIVERY_MONTHS } from '../src/lib/retention.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  const label = good ? ' ok  ' : ' FAIL';
  console.log(`${label} ${name.padEnd(62)}${good ? '' : `expected ${JSON.stringify(want)} got ${JSON.stringify(shown ?? got)}`}`);
}

/* ── D1 op node:sqlite ──────────────────────────────────────────────────────
 * Alleen wat de taak gebruikt: prepare().bind().all() / .run(), en batch(). De
 * schakelaar `failBatch` bestaat voor vraag 4 hierboven. */
function d1(db, { failBatch = false } = {}) {
  return {
    prepare(sql) {
      const st = {
        _a: [],
        bind(...a) { st._a = a; return st; },
        async all() { return { results: db.prepare(sql).all(...st._a) }; },
        async run() { return { success: true, meta: db.prepare(sql).run(...st._a) }; },
        async first() { return db.prepare(sql).get(...st._a) ?? null; },
      };
      return st;
    },
    async batch(list) {
      if (failBatch) throw new Error('D1_ERROR: batch geweigerd (test)');
      const out = [];
      for (const s of list) out.push(await s.run());
      return out;
    },
  };
}

/* Een R2-emmer die onthoudt wat er verwijderd is, want "is de delete aangeroepen"
 * is hier de eigenlijke vraag. */
function bucket() {
  const objects = new Map();
  const deleted = [];
  return {
    objects,
    deleted,
    seed(key) { objects.set(key, Buffer.from('x')); return key; },
    async delete(key) { deleted.push(key); objects.delete(key); },
  };
}

function fresh() {
  const db = new DatabaseSync(':memory:');
  // Het echte schema, niet een uittreksel ervan.
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  return db;
}

let refs = 0;
function addOrder(db, { status = 'delivered' } = {}) {
  const closed_at = null;
  const ref = `VIS-TEST-${String(++refs).padStart(3, '0')}`;
  db.prepare(
    `INSERT INTO orders (ref, email, service, status, closed_at) VALUES (?, ?, 'catalog', ?, ?)`
  ).run(ref, 'klant@example.com', status, closed_at);
  return db.prepare('SELECT id FROM orders WHERE ref = ?').get(ref).id;
}

function addFile(db, orderId, over = {}) {
  const f = {
    order_id: orderId, kind: 'upload', r2_key: null, preview_key: null,
    filename: 'foto.jpg', bytes: 1000, expires_at: null, announced_at: null, ...over,
  };
  f.r2_key ??= `intake/${orderId}/${f.filename}`;
  const keys = Object.keys(f);
  db.prepare(`INSERT INTO files (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
    .run(...keys.map((k) => f[k]));
  return db.prepare('SELECT id FROM files ORDER BY id DESC LIMIT 1').get().id;
}

const events = (db, orderId) =>
  db.prepare('SELECT status, note, actor FROM order_events WHERE order_id = ? ORDER BY id').all(orderId);

console.log('\nVISUAILS — de nachtelijke opruiming\n');

/* ══ 1 · wat weg mag en wat niet ═══════════════════════════════════════════ */
console.log('de termijn zelf');
{
  const db = fresh();
  const b = bucket();

  /* Verlopen: bronmateriaal van een bestelling die 100 dagen geleden dichtging.
   * De datum gaat er met een UPDATE in en niet via addOrder(), omdat hij door
   * SQLite's datetime() gerekend moet worden en niet als tekst. */
  const oud = addOrder(db);
  db.prepare("UPDATE orders SET closed_at = datetime('now','-100 days') WHERE id = ?").run(oud);
  const oudFile = addFile(db, oud, { r2_key: b.seed('intake/oud/a.jpg'), preview_key: b.seed('intake/oud/a-preview.jpg') });
  db.prepare("INSERT INTO file_assets (file_id, format, r2_key) VALUES (?, 'webp', ?)")
    .run(oudFile, b.seed('intake/oud/a.webp'));

  // Niet verlopen: tien dagen geleden dicht.
  const jong = addOrder(db);
  db.prepare("UPDATE orders SET closed_at = datetime('now','-10 days') WHERE id = ?").run(jong);
  addFile(db, jong, { r2_key: b.seed('intake/jong/b.jpg') });

  // Verlopen levering: dertien maanden geleden aangekondigd.
  const geleverd = addOrder(db, { status: 'delivered' });
  addFile(db, geleverd, { kind: 'delivery', r2_key: b.seed('delivery/oud/c.jpg') });
  db.prepare("UPDATE files SET announced_at = datetime('now','-13 months') WHERE r2_key = 'delivery/oud/c.jpg'").run();

  // Niet verlopen levering: een maand geleden.
  const recent = addOrder(db, { status: 'delivered' });
  addFile(db, recent, { kind: 'delivery', r2_key: b.seed('delivery/recent/d.jpg') });
  db.prepare("UPDATE files SET announced_at = datetime('now','-1 months') WHERE r2_key = 'delivery/recent/d.jpg'").run();

  const line = await tasks.purgeExpiredFiles({ DB: d1(db), UPLOADS: b });

  ok('de taak meldt twee bestanden', /^2 verlopen bestanden verwijderd/.test(line), true, line);
  ok('en drie objecten uit R2 voor het ene, één voor het andere', /\(4 objecten uit R2\)/.test(line), true, line);

  const over = db.prepare('SELECT r2_key FROM files ORDER BY id').all().map((r) => r.r2_key);
  ok('de twee verlopen rijen zijn weg', over.length, 2, over);
  ok('en juist die twee blijven staan', over.join('|'), 'intake/jong/b.jpg|delivery/recent/d.jpg', over.join('|'));

  ok('de bron is uit R2', b.deleted.includes('intake/oud/a.jpg'));
  ok('de preview ging mee', b.deleted.includes('intake/oud/a-preview.jpg'));
  ok('de webp-variant uit 0022 ging mee', b.deleted.includes('intake/oud/a.webp'));
  ok('de verlopen levering is uit R2', b.deleted.includes('delivery/oud/c.jpg'));
  ok('en de bestanden die blijven zijn niet aangeraakt', b.deleted.includes('intake/jong/b.jpg'), false);
  ok('ook de recente levering niet', b.deleted.includes('delivery/recent/d.jpg'), false);
  ok('file_assets ruimt met de rij mee op', db.prepare('SELECT COUNT(*) AS n FROM file_assets').get().n, 0);

  /* ── 2 · de tijdlijn ───────────────────────────────────────────────────── */
  console.log('\nwat er op de tijdlijn komt');
  const eOud = events(db, oud);
  ok('één regel bij de bestelling met bronmateriaal', eOud.length, 1, eOud.length);
  ok('geschreven door het systeem', eOud[0]?.actor, 'system');
  ok('de status wordt herhaald, niet verzonnen', eOud[0]?.status, 'delivered', eOud[0]?.status);
  ok('de regel noemt bronmateriaal', /Bronmateriaal verwijderd/.test(eOud[0]?.note || ''), true, eOud[0]?.note);
  ok(`en de termijn uit retention.js (${UPLOAD_DAYS} dagen)`, new RegExp(`${UPLOAD_DAYS} dagen`).test(eOud[0]?.note || ''), true, eOud[0]?.note);
  ok('met het aantal erin', /\(1 bestand\)/.test(eOud[0]?.note || ''), true, eOud[0]?.note);

  const eGeleverd = events(db, geleverd);
  ok('en één bij de verlopen levering', eGeleverd.length, 1, eGeleverd.length);
  ok('die over levering gaat, niet over bronmateriaal', /Geleverde beelden verwijderd/.test(eGeleverd[0]?.note || ''), true, eGeleverd[0]?.note);
  ok(`met de andere termijn (${DELIVERY_MONTHS} maanden)`, new RegExp(`${DELIVERY_MONTHS} maanden`).test(eGeleverd[0]?.note || ''), true, eGeleverd[0]?.note);

  ok('geen regel bij een bestelling die niets kwijtraakte', events(db, jong).length, 0);
  ok('ook niet bij de recente levering', events(db, recent).length, 0);
}

/* ══ 3 · één bestelling die dertig bestanden kwijtraakt ════════════════════ */
console.log('\ndertig bestanden zijn één opruiming');
{
  const db = fresh();
  const b = bucket();
  const id = addOrder(db, { status: 'delivered' });
  db.prepare("UPDATE orders SET closed_at = datetime('now','-200 days') WHERE id = ?").run(id);
  for (let i = 0; i < 30; i++) addFile(db, id, { r2_key: b.seed(`intake/veel/${i}.jpg`) });

  const line = await tasks.purgeExpiredFiles({ DB: d1(db), UPLOADS: b });
  const e = events(db, id);
  ok('dertig bestanden verwijderd', /^30 verlopen bestanden verwijderd/.test(line), true, line);
  ok('maar één regel op de tijdlijn', e.length, 1, e.length);
  ok('met het aantal in de tekst', /\(30 bestanden\)/.test(e[0]?.note || ''), true, e[0]?.note);
}

/* ══ 4 · de tijdlijn faalt, de opruiming niet ══════════════════════════════ */
console.log('\nals het schrijven van de tijdlijn mislukt');
{
  const db = fresh();
  const b = bucket();
  const id = addOrder(db);
  db.prepare("UPDATE orders SET closed_at = datetime('now','-100 days') WHERE id = ?").run(id);
  addFile(db, id, { r2_key: b.seed('intake/stuk/a.jpg') });

  let line;
  let threw = false;
  try {
    line = await tasks.purgeExpiredFiles({ DB: d1(db, { failBatch: true }), UPLOADS: b });
  } catch { threw = true; }

  ok('de taak valt niet om', threw, false);
  ok('het bestand is wél verwijderd', db.prepare('SELECT COUNT(*) AS n FROM files').get().n, 0);
  ok('en R2 is wél geleegd', b.deleted.includes('intake/stuk/a.jpg'));
  ok('het verslag meldt de opruiming', /^1 verlopen bestand verwijderd/.test(line || ''), true, line);
  ok('én dat de tijdlijn niet bijgewerkt is', /tijdlijn.*niet bijgewerkt/.test(line || ''), true, line);
}

/* ══ 5 · niets te doen is geen melding ════════════════════════════════════ */
console.log('\neen gewone nacht');
{
  const db = fresh();
  const b = bucket();
  const id = addOrder(db);
  db.prepare("UPDATE orders SET closed_at = datetime('now','-1 days') WHERE id = ?").run(id);
  addFile(db, id, { r2_key: b.seed('intake/vers/a.jpg') });

  const line = await tasks.purgeExpiredFiles({ DB: d1(db), UPLOADS: b });
  ok('geen regel in het verslag', line, null, line);
  ok('en niets aangeraakt in R2', b.deleted.length, 0);
  ok('de rij staat er nog', db.prepare('SELECT COUNT(*) AS n FROM files').get().n, 1);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
