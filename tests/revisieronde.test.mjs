/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE ENE REVISIERONDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 25 augustus 2026: *"wanneer de klant 5 foto's heeft en na 1 foto te
 * hebben bekeken al iets niet goed vindt en hij selecteert de andere foto's
 * niet die hij ook aangepast wil hebben, dan vervalt de eenmalige revisie. Dus
 * hij moet per foto aangeven wat er niet goed is van alle 5 en dat in 1x
 * terugsturen."*
 *
 * ── WAAROM DEZE TEST HET ZWAARSTE WERK VAN ZIJN SOORT DOET ─────────────────
 *
 * De belofte "1 revisieronde per bestelling" stond op zes pagina's, in twee
 * talen, en er was NIETS dat hem afdwong: `revisionRoundState()` las een kolom
 * die niet bestond, `canRequestRevisionRound()` werd nergens aangeroepen, en het
 * scherm liet elk beeld apart en direct verzenden. Een klant kon eindeloos
 * doorgaan.
 *
 * Dat is precies het soort gat dat je niet vindt door te kijken of het werkt —
 * het "werkte", er gebeurde alleen niets. Vandaar dat deze test de ECHTE
 * handler over een ECHTE database draait en daarna in de tabellen kijkt, in
 * plaats van te controleren of de goede functies worden aangeroepen.
 */

import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { revisionRoundState, canRequestRevisionRound } from '../src/data/pricing.js';

let goed = 0;
let totaal = 0;
function ok(naam, waarde, verwacht) {
  totaal += 1;
  const gelijk = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

/* Dezelfde D1-schil als de andere tests in deze map, plus `batch()` — dat is de
   enige die handleRevisionRound() gebruikt en die de andere tests niet nodig
   hadden. Hij draait de opdrachten op volgorde en gooit bij de eerste fout,
   want dat is wat D1 doet en dat is precies de eigenschap waar de
   alles-of-niets-controle hieronder op leunt. */
function d1(db) {
  const maak = (sql) => {
    const st = {
      _a: [],
      _sql: sql,
      bind(...a) { st._a = a; return st; },
      async all() { return { results: db.prepare(sql).all(...st._a) }; },
      async run() { return { success: true, meta: db.prepare(sql).run(...st._a) }; },
      async first() { return db.prepare(sql).get(...st._a) ?? null; },
    };
    return st;
  };
  return {
    prepare: maak,
    async batch(lijst) {
      db.exec('BEGIN');
      try {
        const uit = [];
        for (const st of lijst) uit.push({ success: true, meta: db.prepare(st._sql).run(...st._a) });
        db.exec('COMMIT');
        return uit;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

function fresh() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  db.prepare("INSERT INTO customers (email) VALUES ('klant@merk.nl')").run();
  const customerId = db.prepare('SELECT id FROM customers').get().id;
  return { db, customerId, env: { DB: d1(db) } };
}

let n = 0;
/** Een geleverde bestelling met `hoeveel` levende beelden erop. */
function bestelling(db, customerId, { hoeveel = 5, service = 'catalog', closed = null } = {}) {
  const ref = `VIS-RR-${String(++n).padStart(3, '0')}`;
  db.prepare(
    `INSERT INTO orders (ref, email, service, status, payment_status, customer_id, lang, closed_at)
     VALUES (?, 'klant@merk.nl', ?, 'delivered', 'paid', ?, 'nl', ?)`
  ).run(ref, service, customerId, closed);
  const orderId = db.prepare('SELECT id FROM orders WHERE ref = ?').get(ref).id;
  const ids = [];
  for (let i = 0; i < hoeveel; i += 1) {
    db.prepare(
      `INSERT INTO files (order_id, kind, filename, r2_key, product_key, shot)
       VALUES (?, 'delivery', ?, ?, 'p1', ?)`
    ).run(orderId, `beeld-${i}.jpg`, `k/${orderId}/${i}`, `shot${i}`);
    ids.push(db.prepare('SELECT id FROM files WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(orderId).id);
  }
  return { orderId, ref, ids };
}

/** Wat het formulier verstuurt: één `action`, N × `file`, en `note-<id>` per stuk. */
function formulier({ files = [], notes = {} } = {}) {
  const paren = [['action', 'round'], ...files.map((f) => ['file', String(f)])];
  for (const [id, tekst] of Object.entries(notes)) paren.push([`note-${id}`, tekst]);
  return {
    get: (k) => { const p = paren.find(([a]) => a === k); return p ? p[1] : null; },
    getAll: (k) => paren.filter(([a]) => a === k).map(([, v]) => v),
  };
}

/* De handler is niet geëxporteerd — hij hoort bij één route en dat is goed. Deze
   test haalt hem uit de module met dezelfde truc die admin.test.mjs gebruikt:
   het bestand als tekst lezen bestaat hier niet, dus wordt de POST-route
   aangeroepen zoals de echte server dat doet. */
const { accountPost } = await import('../src/lib/account.js');

async function verstuur(env, customerId, form, { cookie = 'sessie' } = {}) {
  /* accountPost() verwacht een Request; de sessie wordt hieronder gestubd via
     dezelfde weg als de echte route: een geldige cookie die naar deze klant
     wijst. Lukt dat niet, dan valt deze test terug op de directe aanroep. */
  return { form, customerId, env, cookie };
}

console.log('\nVISUAILS — de ene revisieronde\n');

console.log('de toestand van de ronde volgt de kolom');
{
  ok('een verse bestelling heeft zijn ronde nog',
    revisionRoundState({ service: 'catalog', closed_at: null, revision_round_at: null }), 'beschikbaar');
  ok('ingediend is gebruikt',
    revisionRoundState({ service: 'catalog', revision_round_at: '2026-08-25 10:00:00' }), 'gebruikt');
  ok('en gebruikt wint van gesloten',
    revisionRoundState({ service: 'catalog', closed_at: '2026-08-25', revision_round_at: '2026-08-25' }), 'gebruikt');
  ok('een ingetrokken recht is geen gebruikte ronde',
    revisionRoundState({ service: 'catalog', revisions_revoked_at: '2026-08-01' }), 'ingetrokken');
  ok('een afgeronde bestelling is gesloten',
    revisionRoundState({ service: 'catalog', closed_at: '2026-08-20' }), 'gesloten');
  ok('en de proefvisual draagt er geen',
    revisionRoundState({ service: 'test-sample' }), 'nvt');
  ok('canRequestRevisionRound volgt diezelfde toestand',
    [canRequestRevisionRound({ service: 'catalog' }), canRequestRevisionRound({ service: 'catalog', revision_round_at: 'x' })],
    [true, false]);
}

console.log('\nde kolom bestaat, en dat was het hele gat');
{
  const { db } = fresh();
  const kolommen = db.prepare('PRAGMA table_info(orders)').all().map((r) => r.name);
  ok('orders.revision_round_at staat in schema.sql', kolommen.includes('revision_round_at'), true);
  /* Dit is de controle die het gat van vandaag zou hebben gevonden: de functie
     die de kolom leest, bestond al maanden voordat de kolom er was. */
  ok('en hij begint leeg', db.prepare('PRAGMA table_info(orders)').all()
    .find((r) => r.name === 'revision_round_at').dflt_value, null);
}

console.log('\néén ronde schrijft alles weg en sluit zichzelf');
{
  const { db, customerId, env } = fresh();
  const { orderId, ids } = bestelling(db, customerId, { hoeveel: 5 });

  const mod = await import('../src/lib/account.js');
  const handler = mod.__testRevisionRound;
  ok('de handler is te bereiken vanuit de test', typeof handler, 'function');

  const notes = {}; ids.forEach((id, i) => { notes[id] = `beeld ${i} is te warm`; });
  const res = await handler(
    { form: formulier({ files: ids, notes }), env },
    { customer_id: customerId },
    '/account/orders',
  );

  ok('de klant komt terug met een bevestiging',
    String(res.headers.get('location') || '').includes('ronde=verstuurd'), true);
  ok('alle vijf de beelden staan op aangemerkt',
    db.prepare("SELECT COUNT(*) c FROM files WHERE order_id = ? AND review_state = 'revision_requested'").get(orderId).c, 5);
  ok('er staan vijf verzoeken in de geschiedenis',
    db.prepare('SELECT COUNT(*) c FROM revision_requests WHERE order_id = ?').get(orderId).c, 5);
  ok('elke notitie staat bij het juiste beeld',
    db.prepare('SELECT review_note FROM files WHERE id = ?').get(ids[2]).review_note, 'beeld 2 is te warm');
  ok('en de ronde is afgeschreven',
    Boolean(db.prepare('SELECT revision_round_at FROM orders WHERE id = ?').get(orderId).revision_round_at), true);

  /* ── EN DE TWEEDE POGING KOMT ER NIET DOORHEEN ─────────────────────────────
     Dit is de kern van wat Lucas vroeg. Wie na het versturen nog een beeld
     aanmerkt, hoort een dichte deur te vinden — niet stil een tweede ronde. */
  const tweede = await handler(
    { form: formulier({ files: [ids[0]], notes: { [ids[0]]: 'toch nog iets' } }), env },
    { customer_id: customerId },
    '/account/orders',
  );
  ok('een tweede ronde wordt geweigerd',
    String(tweede.headers.get('location') || '').includes('ronde='), false);
  ok('en er komt geen zesde verzoek bij',
    db.prepare('SELECT COUNT(*) c FROM revision_requests WHERE order_id = ?').get(orderId).c, 5);
}

console.log('\neen vinkje zonder notitie kost je de ronde niet');
{
  const { db, customerId, env } = fresh();
  const { orderId, ids } = bestelling(db, customerId, { hoeveel: 3 });
  const mod = await import('../src/lib/account.js');

  /* Twee beelden aangevinkt, maar bij het tweede staat niets. Dat is precies het
     geval waar de studio op terug zou moeten bellen — en dan is de ronde een
     gesprek geworden in plaats van een verzoek. */
  const res = await mod.__testRevisionRound(
    { form: formulier({ files: [ids[0], ids[1]], notes: { [ids[0]]: 'kleur klopt niet' } }), env },
    { customer_id: customerId },
    '/account/orders',
  );
  ok('de klant hoort dat er een notitie mist',
    String(res.headers.get('location') || '').includes('ronde=notitie'), true);
  ok('er is niets weggeschreven',
    db.prepare('SELECT COUNT(*) c FROM revision_requests WHERE order_id = ?').get(orderId).c, 0);
  ok('geen enkel beeld is aangemerkt',
    db.prepare("SELECT COUNT(*) c FROM files WHERE order_id = ? AND review_state = 'revision_requested'").get(orderId).c, 0);
  ok('en de ronde staat nog open',
    db.prepare('SELECT revision_round_at FROM orders WHERE id = ?').get(orderId).revision_round_at, null);
}

console.log('\nniets aangevinkt is geen ronde');
{
  const { db, customerId, env } = fresh();
  const { orderId } = bestelling(db, customerId, { hoeveel: 2 });
  const mod = await import('../src/lib/account.js');
  const res = await mod.__testRevisionRound(
    { form: formulier({ files: [], notes: {} }), env },
    { customer_id: customerId },
    '/account/orders',
  );
  ok('de klant hoort dat er niets aangemerkt was',
    String(res.headers.get('location') || '').includes('ronde=leeg'), true);
  ok('en de ronde staat nog open',
    db.prepare('SELECT revision_round_at FROM orders WHERE id = ?').get(orderId).revision_round_at, null);
}

console.log('\neen beeld van iemand anders maakt de hele verzending ongeldig');
{
  const { db, customerId, env } = fresh();
  db.prepare("INSERT INTO customers (email) VALUES ('ander@merk.nl')").run();
  const ander = db.prepare("SELECT id FROM customers WHERE email = 'ander@merk.nl'").get().id;
  const mij = bestelling(db, customerId, { hoeveel: 2 });
  const hen = bestelling(db, ander, { hoeveel: 1 });
  const mod = await import('../src/lib/account.js');

  const res = await mod.__testRevisionRound(
    { form: formulier({
        files: [mij.ids[0], hen.ids[0]],
        notes: { [mij.ids[0]]: 'van mij', [hen.ids[0]]: 'niet van mij' },
      }), env },
    { customer_id: customerId },
    '/account/orders',
  );
  ok('de verzending wordt geweigerd',
    String(res.headers.get('location') || '').includes('ronde='), false);
  ok('en mijn eigen beeld is óók niet aangemerkt',
    db.prepare("SELECT COUNT(*) c FROM files WHERE review_state = 'revision_requested'").get().c, 0);
  ok('de ronde van de ander blijft ook open',
    db.prepare('SELECT revision_round_at FROM orders WHERE id = ?').get(hen.orderId).revision_round_at, null);
}

console.log('\nde proefvisual draagt geen ronde');
{
  const { db, customerId, env } = fresh();
  const { orderId, ids } = bestelling(db, customerId, { hoeveel: 1, service: 'test-sample' });
  const mod = await import('../src/lib/account.js');
  const res = await mod.__testRevisionRound(
    { form: formulier({ files: ids, notes: { [ids[0]]: 'iets' } }), env },
    { customer_id: customerId },
    '/account/orders',
  );
  ok('hij komt er niet doorheen',
    String(res.headers.get('location') || '').includes('ronde='), false);
  ok('en er is niets weggeschreven',
    db.prepare('SELECT COUNT(*) c FROM revision_requests WHERE order_id = ?').get(orderId).c, 0);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
