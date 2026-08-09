/* VISUAILS — het uitgeven van een factuur, tegen een echte SQLite.
 *
 *   npm run test:invoicing
 *
 * ── WAAROM DIT GEEN STUB-DATABASE IS ────────────────────────────────────────
 *
 * De andere tests in deze map stubben D1 met een object dat op `sql.includes()`
 * antwoordt, en voor die tests klopt dat: ze toetsen welke statements er worden
 * uitgevoerd. Hier is het statement zelf het onderwerp. De hele
 * nummergarantie hangt aan wat SQLite doet met
 *
 *     UPDATE invoice_series SET last_number = last_number + 1 RETURNING last_number
 *
 * en aan wat het schema WEIGERT: twee facturen met hetzelfde nummer, twee
 * facturen op dezelfde bestelling, een 'issued' zonder pdf. Een stub die
 * `includes('UPDATE invoice_series')` herkent bewijst daar niets over — hij
 * bewijst dat ik hetzelfde denk als toen ik hem schreef. Dus: node:sqlite, met
 * het echte migratiebestand ingelezen, en een dunne laag eromheen die zich als
 * D1 gedraagt.
 *
 * R2 en de mail zijn wél gestubd. Die hebben geen gedrag dat we hier toetsen —
 * een put is een put — en wat er in de pdf staat is het onderwerp van
 * tests/invoice-pdf.test.mjs, met 141 assertions.
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { issueInvoice, formatNumber, snapshotFromOrder } from '../src/lib/invoice.js';
import { renderInvoicePdf } from '../src/lib/invoicePdf.js';

let pass = 0, fail = 0;
function ok(name, cond, expected = '', got = '') {
  if (cond) { pass++; console.log(` ok   ${name.padEnd(66)} ${String(expected).padEnd(14).slice(0, 14)} ${got}`); }
  else { fail++; console.log(` FAIL ${name.padEnd(66)} expected ${expected}  got ${got}`); }
}
async function throws(name, fn, match) {
  try { await fn(); ok(name, false, 'throw', 'no throw'); }
  catch (e) {
    const m = !match || String(e.message).includes(match);
    ok(name, m, 'throw', m ? 'threw' : e.message);
  }
}

/* ── D1 op node:sqlite ───────────────────────────────────────────────────────
 * Alleen wat src/lib/invoice.js gebruikt: prepare().bind().first() / .run() /
 * .all(). first() gaat via .get(), wat ook de RETURNING-rij teruggeeft — precies
 * de reden dat de teller in één statement kan. */
function d1(db) {
  return {
    prepare(sql) {
      const st = {
        _a: [],
        bind(...a) { st._a = a; return st; },
        async first() { return db.prepare(sql).get(...st._a) ?? null; },
        async run() { return { success: true, meta: db.prepare(sql).run(...st._a) }; },
        async all() { return { results: db.prepare(sql).all(...st._a) }; },
      };
      return st;
    },
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
  };
}

/* Een R2-emmer in het geheugen, met een schakelaar om hem te laten falen. */
function bucket({ failPut = false } = {}) {
  const objects = new Map();
  return {
    objects,
    async put(key, body, opts) {
      if (failPut) throw new Error('R2: bucket unavailable');
      objects.set(key, { body: Buffer.from(body), opts });
      return { key };
    },
    async get(key) {
      const o = objects.get(key);
      if (!o) return null;
      return { body: o.body, size: o.body.length, async arrayBuffer() { return o.body.buffer.slice(o.body.byteOffset, o.body.byteOffset + o.body.length); } };
    },
  };
}

const ORDER_COLS = `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT UNIQUE, customer_id INTEGER, email TEXT, lang TEXT DEFAULT 'nl',
  service TEXT, product_count INTEGER, status TEXT DEFAULT 'received',
  payment_status TEXT DEFAULT 'unpaid', paid_at TEXT,
  total_cents INTEGER, vat_cents INTEGER, vat_rate REAL, vat_treatment TEXT,
  vat_number TEXT, vat_consultation TEXT,
  first_name TEXT, last_name TEXT, name TEXT, brand TEXT, country TEXT,
  address_line1 TEXT, address_line2 TEXT, postal_code TEXT, city TEXT, region TEXT`;

function fresh() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`CREATE TABLE customers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT);`);
  db.exec(`CREATE TABLE orders (${ORDER_COLS});`);
  // Het echte migratiebestand, niet een kopie ervan. Wijkt het schema af van wat
  // deze test aanneemt, dan valt dat hier om en niet in productie.
  db.exec(readFileSync(new URL('../migrations/0021-invoices.sql', import.meta.url), 'utf8'));
  db.prepare('INSERT INTO customers (id, email) VALUES (1, ?)').run('klant@example.com');
  return db;
}

function addOrder(db, over = {}) {
  const o = {
    ref: 'VIS-TEST-001', customer_id: 1, email: 'klant@example.com', lang: 'nl',
    service: 'catalog', product_count: 4, payment_status: 'paid', paid_at: '2026-08-09 10:15:00',
    total_cents: 35600, vat_cents: 7476, vat_rate: 0.21, vat_treatment: 'nl_standard',
    vat_number: null, vat_consultation: null,
    first_name: 'Jan', last_name: 'Jansen', name: null, brand: 'Testmerk BV', country: 'NL',
    address_line1: 'Teststraat 1', address_line2: null, postal_code: '1234 AB', city: 'Amsterdam', region: null,
    ...over,
  };
  const keys = Object.keys(o);
  db.prepare(`INSERT INTO orders (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map((k) => o[k]));
  return db.prepare('SELECT id FROM orders WHERE ref = ?').get(o.ref).id;
}

const env = (db, b = bucket()) => ({ DB: d1(db), UPLOADS: b, VISUAILS_IBAN: 'NL00 TEST 0000 0000 00' });

console.log('\nVISUAILS — facturen uitgeven\n');

/* ── 1 · de vorm van het nummer ─────────────────────────────────────────── */
console.log('het nummer');
ok('eerste van het jaar is 0001', formatNumber(2026, 1) === 'VIS-2026-0001', 'VIS-2026-0001', formatNumber(2026, 1));
ok('vier cijfers, ook bij 42', formatNumber(2026, 42) === 'VIS-2026-0042', 'VIS-2026-0042', formatNumber(2026, 42));
ok('loopt door boven 9999', formatNumber(2026, 12345) === 'VIS-2026-12345', 'VIS-2026-12345', formatNumber(2026, 12345));

/* ── 2 · de gelukkige weg ───────────────────────────────────────────────── */
console.log('\néén bestelling, één factuur');
{
  const db = fresh(); const b = bucket(); const e = env(db, b);
  const id = addOrder(db);
  const inv = await issueInvoice(e, id);
  ok('status wordt issued', inv.status === 'issued', 'issued', inv.status);
  ok('nummer is het eerste van 2026', inv.number === 'VIS-2026-0001', 'VIS-2026-0001', inv.number);
  ok('jaar komt uit de betaaldatum', inv.year === 2026, 2026, inv.year);
  ok('pdf ligt in R2', b.objects.has('invoices/2026/VIS-2026-0001.pdf'), true, b.objects.has('invoices/2026/VIS-2026-0001.pdf'));
  ok('pdf is een echte pdf', String(b.objects.get(inv.pdf_key).body.subarray(0, 5)) === '%PDF-', '%PDF-', String(b.objects.get(inv.pdf_key).body.subarray(0, 5)));
  ok('pdf_bytes klopt met wat er ligt', inv.pdf_bytes === b.objects.get(inv.pdf_key).body.length, inv.pdf_bytes, b.objects.get(inv.pdf_key).body.length);
  ok('content-type is application/pdf', b.objects.get(inv.pdf_key).opts.httpMetadata.contentType === 'application/pdf', 'application/pdf', b.objects.get(inv.pdf_key).opts.httpMetadata.contentType);
  ok('factuurdatum is de betaaldatum', JSON.parse(inv.snapshot_json).date === '2026-08-09', '2026-08-09', JSON.parse(inv.snapshot_json).date);
  ok('issued_at is gezet', !!inv.issued_at, true, !!inv.issued_at);
}

/* ── 3 · idempotentie: Mollie levert twee keer af ────────────────────────── */
console.log('\ntwee keer aanroepen');
{
  const db = fresh(); const b = bucket(); const e = env(db, b);
  const id = addOrder(db);
  const first = await issueInvoice(e, id);
  const second = await issueInvoice(e, id);
  ok('zelfde nummer terug', first.number === second.number, first.number, second.number);
  ok('geen tweede rij', db.prepare('SELECT COUNT(*) c FROM invoices').get().c === 1, 1, db.prepare('SELECT COUNT(*) c FROM invoices').get().c);
  ok('de teller is NIET doorgelopen', db.prepare('SELECT last_number n FROM invoice_series WHERE year = 2026').get().n === 1, 1, db.prepare('SELECT last_number n FROM invoice_series WHERE year = 2026').get().n);
  ok('geen tweede pdf in R2', b.objects.size === 1, 1, b.objects.size);
}

/* ── 4 · DE KERNGARANTIE: geen gaten, geen dubbelingen ──────────────────── */
console.log('\nde reeks');
{
  const db = fresh(); const e = env(db);
  const ids = [];
  for (let i = 1; i <= 12; i++) ids.push(addOrder(db, { ref: `VIS-SEQ-${String(i).padStart(3, '0')}` }));
  for (const id of ids) await issueInvoice(e, id);
  const seqs = db.prepare('SELECT seq FROM invoices ORDER BY seq').all().map((r) => r.seq);
  ok('twaalf facturen, seq 1..12 zonder gat', JSON.stringify(seqs) === JSON.stringify([...Array(12)].map((_, i) => i + 1)), '1..12', seqs.join(','));
  ok('twaalf verschillende nummers', new Set(db.prepare('SELECT number FROM invoices').all().map((r) => r.number)).size === 12, 12, new Set(db.prepare('SELECT number FROM invoices').all().map((r) => r.number)).size);

  // Parallel, want dat is de situatie waarin lezen-dan-schrijven fout gaat.
  const more = [];
  for (let i = 20; i < 28; i++) more.push(addOrder(db, { ref: `VIS-PAR-${i}` }));
  await Promise.all(more.map((id) => issueInvoice(e, id)));
  const all = db.prepare('SELECT seq FROM invoices ORDER BY seq').all().map((r) => r.seq);
  ok('ook parallel geen gat en geen dubbele', JSON.stringify(all) === JSON.stringify([...Array(20)].map((_, i) => i + 1)), '1..20', all.join(','));
}

/* ── 5 · een jaargrens ──────────────────────────────────────────────────── */
console.log('\nper jaar opnieuw');
{
  const db = fresh(); const e = env(db);
  const a = addOrder(db, { ref: 'VIS-2026-X', paid_at: '2026-12-31 23:50:00' });
  const c = addOrder(db, { ref: 'VIS-2027-X', paid_at: '2027-01-01 00:10:00' });
  ok('laatste van 2026', (await issueInvoice(e, a)).number === 'VIS-2026-0001', 'VIS-2026-0001', (await issueInvoice(e, a)).number);
  ok('eerste van 2027 begint weer bij 1', (await issueInvoice(e, c)).number === 'VIS-2027-0001', 'VIS-2027-0001', (await issueInvoice(e, c)).number);
  ok('twee tellers', db.prepare('SELECT COUNT(*) c FROM invoice_series').get().c === 2, 2, db.prepare('SELECT COUNT(*) c FROM invoice_series').get().c);
}

/* ── 6 · een mislukte pdf houdt het nummer vast ─────────────────────────── */
console.log('\nals de pdf niet in R2 komt');
{
  const db = fresh();
  const broken = bucket({ failPut: true });
  const id = addOrder(db);
  await throws('eerste poging gooit', () => issueInvoice(env(db, broken), id), 'R2');
  const row = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(id);
  ok('de rij blijft staan als pending', row && row.status === 'pending', 'pending', row && row.status);
  ok('met het nummer al toegekend', row.number === 'VIS-2026-0001', 'VIS-2026-0001', row.number);
  ok('en zonder pdf_key', row.pdf_key === null, null, row.pdf_key);

  // Nieuwe bestelling er tussendoor: die mag NIET het nummer van de mislukte krijgen.
  const other = addOrder(db, { ref: 'VIS-TEST-002' });
  const good = bucket();
  const second = await issueInvoice(env(db, good), other);
  ok('de volgende bestelling krijgt 0002, niet 0001', second.number === 'VIS-2026-0002', 'VIS-2026-0002', second.number);

  /* DE BESTELLING VERANDERT TUSSEN DE MISLUKTE POGING EN HET HERSTEL.
   *
   * Dit is de reden dat de tweede poging de pdf uit `snapshot_json` maakt en niet
   * opnieuw uit de bestelling. Zonder deze regels slaagt de test ook als je die
   * ene regel vervangt door snapshotFromOrder(order, ...) — geverifieerd door hem
   * te saboteren — en dan zou een factuur stilzwijgend meebewegen met een
   * bijgewerkte order. Precies wat een factuur niet mag doen. */
  db.prepare('UPDATE orders SET total_cents = 999999, brand = ? WHERE id = ?').run('Ander Merk', id);

  // En nu de eerste opnieuw: hetzelfde nummer, geen nieuw.
  const repaired = await issueInvoice(env(db, good), id);
  ok('herstel gebruikt HETZELFDE nummer', repaired.number === 'VIS-2026-0001', 'VIS-2026-0001', repaired.number);
  ok('en staat daarna op issued', repaired.status === 'issued', 'issued', repaired.status);
  ok('bedrag op de factuur is niet meegelopen', JSON.parse(repaired.snapshot_json).netCents === 35600, 35600, JSON.parse(repaired.snapshot_json).netCents);

  // De pdf is byte-identiek aan wat de BEWAARDE momentopname oplevert. Bewust een
  // byte-vergelijking en geen pdftotext: invoicePdf.js is deterministisch (zie de
  // header daar — geen klok, geen toeval), dus gelijke invoer moet gelijke bytes
  // geven, en een verschil kan hier alleen van andere invoer komen.
  const fromSnapshot = Buffer.from(await renderInvoicePdf(JSON.parse(repaired.snapshot_json)));
  const inR2 = good.objects.get(repaired.pdf_key).body;
  ok('de pdf komt uit de momentopname, niet uit de order', inR2.equals(fromSnapshot), 'identiek', inR2.equals(fromSnapshot) ? 'identiek' : `${inR2.length} vs ${fromSnapshot.length} bytes`);
  ok('drie nummers uitgegeven, twee facturen', db.prepare('SELECT COUNT(*) c FROM invoices').get().c === 2, 2, db.prepare('SELECT COUNT(*) c FROM invoices').get().c);
  ok('teller staat op 2, niet op 3', db.prepare('SELECT last_number n FROM invoice_series WHERE year = 2026').get().n === 2, 2, db.prepare('SELECT last_number n FROM invoice_series WHERE year = 2026').get().n);
}

/* ── 7 · wat het schema moet weigeren ───────────────────────────────────── */
console.log('\nwat de database weigert');
{
  const db = fresh(); const e = env(db);
  const id = addOrder(db);
  await issueInvoice(e, id);

  let threw = false;
  try {
    db.prepare(`INSERT INTO invoices (number, year, seq, order_id, status, snapshot_json) VALUES ('VIS-2026-0001', 2026, 9, NULL, 'pending', '{}')`).run();
  } catch { threw = true; }
  ok('een tweede factuur met hetzelfde nummer', threw, 'refused', threw ? 'refused' : 'accepted');

  threw = false;
  try {
    db.prepare(`INSERT INTO invoices (number, year, seq, order_id, status, snapshot_json) VALUES ('VIS-2026-9999', 2026, 9999, ?, 'pending', '{}')`).run(id);
  } catch { threw = true; }
  ok('een tweede factuur op dezelfde bestelling', threw, 'refused', threw ? 'refused' : 'accepted');

  threw = false;
  try {
    db.prepare(`INSERT INTO invoices (number, year, seq, order_id, status, snapshot_json) VALUES ('VIS-2026-8888', 2026, 8888, NULL, 'issued', '{}')`).run();
  } catch { threw = true; }
  ok('issued zonder pdf_key', threw, 'refused', threw ? 'refused' : 'accepted');

  threw = false;
  try { db.prepare('DELETE FROM orders WHERE id = ?').run(id); } catch { threw = true; }
  ok('een bestelling met een factuur verwijderen', threw, 'refused', threw ? 'refused' : 'accepted');

  threw = false;
  try {
    db.prepare(`INSERT INTO invoices (number, year, seq, order_id, status, snapshot_json) VALUES ('VIS-2026-7777', 2026, 7777, NULL, 'draft', '{}')`).run();
  } catch { threw = true; }
  ok('een status die niet bestaat', threw, 'refused', threw ? 'refused' : 'accepted');
}

/* ── 8 · de momentopname ────────────────────────────────────────────────── */
console.log('\nde momentopname');
{
  const db = fresh();
  const id = addOrder(db, {
    ref: 'VIS-EU-001', lang: 'en', country: 'DE', vat_number: 'DE811907980',
    vat_treatment: 'eu_reverse_charge', vat_cents: 0, vat_rate: 0,
    total_cents: 89000, vat_consultation: 'WAPIAAAAX1234567',
  });
  const inv = await issueInvoice(env(db), id);
  const snap = JSON.parse(inv.snapshot_json);
  ok('taal volgt de bestelling', snap.lang === 'en', 'en', snap.lang);
  ok('verlegging staat erin', snap.treatment === 'eu_reverse_charge', 'eu_reverse_charge', snap.treatment);
  ok('btw-nummer van de afnemer', snap.customer.vat === 'DE811907980', 'DE811907980', snap.customer.vat);
  ok('VIES-nummer bewaard', snap.viesConsultation === 'WAPIAAAAX1234567', 'WAPIAAAAX1234567', snap.viesConsultation);
  ok('bruto = netto bij 0%', snap.grossCents === 89000, 89000, snap.grossCents);
  ok('adres is losse regels', Array.isArray(snap.customer.address) && snap.customer.address.length >= 2, '>=2 regels', snap.customer.address.length);
  ok('bedrijfsnaam meegenomen', snap.customer.company === 'Testmerk BV', 'Testmerk BV', snap.customer.company);
  ok('één regel voor de bestelling', snap.lines.length === 1, 1, snap.lines.length);
  ok('regeltotaal is het nettobedrag', snap.lines[0].totalCents === 89000, 89000, snap.lines[0].totalCents);
  ok('IBAN uit env', snap.seller.iban === 'NL00 TEST 0000 0000 00', 'uit env', snap.seller.iban);

  // DE HELE REDEN DAT DE MOMENTOPNAME BESTAAT: de prijs verandert, de factuur niet.
  db.prepare('UPDATE orders SET total_cents = 999999, brand = ? WHERE id = ?').run('Ander Merk', id);
  const again = await issueInvoice(env(db), id);
  ok('herlezen na een prijswijziging geeft het oude bedrag', JSON.parse(again.snapshot_json).netCents === 89000, 89000, JSON.parse(again.snapshot_json).netCents);
  ok('en de oude bedrijfsnaam', JSON.parse(again.snapshot_json).customer.company === 'Testmerk BV', 'Testmerk BV', JSON.parse(again.snapshot_json).customer.company);
}

/* ── 9 · wat er niet mag gebeuren ───────────────────────────────────────── */
console.log('\nweigeringen in de code zelf');
{
  const db = fresh();
  await throws('een bestelling die niet bestaat', () => issueInvoice(env(db), 9999), 'bestaat niet');
  const unpaid = addOrder(db, { ref: 'VIS-NOPAY', payment_status: 'unpaid', paid_at: null });
  await throws('een bestelling zonder betaaldatum', () => issueInvoice(env(db), unpaid), 'geen datum');
  ok('en dan is er geen nummer verspild', db.prepare('SELECT COUNT(*) c FROM invoice_series').get().c === 0, 0, db.prepare('SELECT COUNT(*) c FROM invoice_series').get().c);

  // Met een expliciete datum kan hij wel — dat is de inhaalslag in VISUAILS Studio.
  const inv = await issueInvoice(env(db), unpaid, { today: '2026-08-09 10:00:00' });
  ok('met een meegegeven datum lukt het wel', inv.status === 'issued', 'issued', inv.status);
  ok('en die datum staat op de factuur', JSON.parse(inv.snapshot_json).date === '2026-08-09', '2026-08-09', JSON.parse(inv.snapshot_json).date);
}

/* ── 10 · snapshotFromOrder los, zonder database ────────────────────────── */
console.log('\nsnapshotFromOrder');
{
  const base = { ref: 'X', service: 'catalog', product_count: 1, lang: 'nl', total_cents: 100, vat_cents: 21, vat_rate: 0.21 };
  const one = snapshotFromOrder(base, {}, { number: 'N', date: '2026-01-01' });
  ok('enkelvoud in het nl-label', one.lines[0].description.includes('1 product') && !one.lines[0].description.includes('producten'), '1 product', one.lines[0].description);
  const many = snapshotFromOrder({ ...base, product_count: 4 }, {}, { number: 'N', date: '2026-01-01' });
  ok('meervoud in het nl-label', many.lines[0].description.includes('4 producten'), '4 producten', many.lines[0].description);
  const en = snapshotFromOrder({ ...base, lang: 'en', product_count: 4 }, {}, { number: 'N', date: '2026-01-01' });
  ok('meervoud in het en-label', en.lines[0].description.includes('4 products'), '4 products', en.lines[0].description);
  ok('onbekende taal valt terug op nl', snapshotFromOrder({ ...base, lang: 'de' }, {}, { number: 'N', date: '2026-01-01' }).lang === 'nl', 'nl', snapshotFromOrder({ ...base, lang: 'de' }, {}, { number: 'N', date: '2026-01-01' }).lang);
  ok('geen behandeling → nl_standard', one.treatment === 'nl_standard', 'nl_standard', one.treatment);
  ok('bruto is netto plus btw', one.grossCents === 121, 121, one.grossCents);
  ok('naam uit voor- en achternaam', snapshotFromOrder({ ...base, first_name: 'A', last_name: 'B' }, {}, { number: 'N', date: 'x' }).customer.name === 'A B', 'A B', snapshotFromOrder({ ...base, first_name: 'A', last_name: 'B' }, {}, { number: 'N', date: 'x' }).customer.name);
  ok('valt terug op het losse naamveld', snapshotFromOrder({ ...base, name: 'C' }, {}, { number: 'N', date: 'x' }).customer.name === 'C', 'C', snapshotFromOrder({ ...base, name: 'C' }, {}, { number: 'N', date: 'x' }).customer.name);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
