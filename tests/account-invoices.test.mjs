/* VISUAILS — de sectie Facturen in VISUAILS Studio, en de downloadroute.
 *
 *   npm run test:invoices
 *
 * ── WAT HIER HET RISICO IS ──────────────────────────────────────────────────
 *
 * Een factuur is het eerste document in dit dashboard dat NIET bij een
 * bestelling in de map hoort maar bij een boekhouding, en er is precies één
 * manier waarop een factuurroute echt fout kan gaan: de factuur van iemand
 * anders leveren. Dat is niet te herstellen — een naam, een adres en een bedrag
 * van een ander merk zijn weg zodra ze verstuurd zijn. Vandaar dat de helft
 * hieronder over eigendom gaat en niet over opmaak.
 *
 * Daarnaast twee dingen die op een bug lijken en er geen zijn, en dus vastgezet
 * moeten worden voordat iemand ze "oplost":
 *   · een factuur met status 'pending' heeft een nummer en géén document, dus
 *     geen downloadknop en een 404 op de route;
 *   · de pdf gaat altijd als bijlage naar buiten en nooit inline.
 *
 * D1 en R2 zijn gestubd. Het uitgeven van het nummer staat onder test in
 * tests/invoice-issue.test.mjs, tegen een echte SQLite.
 */

import { DatabaseSync } from 'node:sqlite';
import { accountGet } from '../src/lib/account.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let fails = 0;
const check = (name, cond, got = '') => {
  console.log(`${cond ? ' ok  ' : 'FAIL '} ${String(name).padEnd(62)} ${got}`);
  if (!cond) fails++;
};

const CUSTOMER_ID = 7;
const OTHER_ID = 99;
const token = await mintToken();
const hash = await hashToken(token);
const inAnHour = new Date(Date.now() + 3600_000).toISOString();

const ORDER = {
  id: 12, ref: 'VIS-2608-4471', service: 'catalog', status: 'delivered', tier: 'classic',
  product_count: 4, lang: 'nl', created_at: '2026-08-01 09:00:00', closed_at: null,
  payment_status: 'paid', payment_provider: 'mollie', paid_at: '2026-08-02 10:01:00',
  total_cents: 35600, currency: 'EUR', refunded_cents: 0,
  vat_cents: 7476, vat_rate: 0.21, vat_treatment: 'nl_standard',
};

const SNAP = {
  number: 'VIS-2026-0007', date: '2026-08-02', lang: 'nl',
  netCents: 35600, vatCents: 7476, grossCents: 43076, vatRate: 0.21,
  treatment: 'nl_standard', customer: { name: 'Jan Jansen' }, lines: [],
};

const INVOICE = {
  id: 3, number: 'VIS-2026-0007', status: 'issued', pdf_key: 'invoices/2026/VIS-2026-0007.pdf',
  pdf_bytes: 2310, snapshot_json: JSON.stringify(SNAP), lang: 'nl',
  issued_at: '2026-08-02 10:01:05', created_at: '2026-08-02 10:01:03', ref: ORDER.ref,
  service: 'catalog', paid_at: ORDER.paid_at,
};

/**
 * Een D1 die genoeg antwoordt om sectionGet() te laten renderen.
 *
 * ── DE FACTUURQUERIES GAAN NAAR EEN ECHTE SQLITE ────────────────────────────
 *
 * De sessie, de klantgegevens en de vier andere loaders zijn plat gestubd: die
 * geven vaste rijen of niets, en meer hebben ze hier niet te zeggen. De twee
 * queries die over facturen gaan worden wél echt uitgevoerd, op een in-memory
 * database met `orders` en `invoices` erin.
 *
 * Dat is geen netheid maar noodzaak, en het is met sabotage vastgesteld: een stub
 * die het eigendom zelf nabouwt (`customerId === ownerId`) blijft groen als je de
 * echte query verzwakt tot `WHERE i.id = ?1 AND (o.customer_id = ?2 OR 1=1)`. Hij
 * kijkt naar de meegegeven waarden en niet naar de WHERE. Precies de fout die
 * hier het meest kost — de factuur van iemand anders leveren — is er dus de fout
 * die een stub niet kan zien. Met een echte database leidt dezelfde sabotage
 * meteen tot een geleverde pdf en een rode regel.
 *
 * Elke tak kijkt naar de query en niet naar de aanroeporde: dit bestand mag niet
 * omvallen als er ooit een zevende loader bij de Promise.all komt.
 */
function makeDb({ invoices = [INVOICE], orders = [ORDER], ownerId = CUSTOMER_ID } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE orders (id INTEGER PRIMARY KEY, ref TEXT, customer_id INTEGER, service TEXT, paid_at TEXT);`);
  db.exec(`CREATE TABLE invoices (
    id INTEGER PRIMARY KEY, number TEXT, year INTEGER, seq INTEGER, order_id INTEGER,
    customer_id INTEGER, status TEXT, pdf_key TEXT, pdf_bytes INTEGER,
    snapshot_json TEXT, lang TEXT, issued_at TEXT, created_at TEXT);`);

  for (const o of orders) {
    db.prepare('INSERT INTO orders (id, ref, customer_id, service, paid_at) VALUES (?,?,?,?,?)')
      .run(o.id, o.ref, ownerId, o.service, o.paid_at);
  }
  invoices.forEach((v, i) => {
    const o = orders[0] || { id: 0 };
    db.prepare(`INSERT INTO invoices (id, number, year, seq, order_id, customer_id, status, pdf_key, pdf_bytes, snapshot_json, lang, issued_at, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(v.id, v.number, 2026, i + 1, o.id, ownerId, v.status, v.pdf_key, v.pdf_bytes,
        v.snapshot_json, v.lang, v.issued_at, v.created_at);
  });

  const real = (sql, args) => db.prepare(sql).all(...args);
  const seen = [];
  return {
    seen,
    prepare(sql) {
      const st = {
        sql, _b: [],
        bind(...a) { st._b = a; return st; },
        async first() {
          seen.push(sql);
          if (sql.includes('FROM account_sessions')) {
            return st._b[0] === hash
              ? { session_id: 1, expires_at: inAnHour, customer_id: CUSTOMER_ID, email: 'studio@voltbrand.nl', name: 'Mara', brand: 'VOLT' }
              : null;
          }
          // De downloadroute — echt uitgevoerd, zodat de WHERE het werk doet.
          if (sql.includes('FROM invoices i')) return real(sql, st._b)[0] ?? null;
          if (sql.includes('FROM customers')) return { email: 'studio@voltbrand.nl', name: 'Mara', brand: 'VOLT' };
          return null;
        },
        async all() {
          seen.push(sql);
          if (sql.includes('FROM invoices i')) return { results: real(sql, st._b) };
          if (sql.includes('FROM orders') && sql.includes('LIMIT 200')) return { results: orders };
          return { results: [] };
        },
        async run() { return {}; },
      };
      return st;
    },
    async batch() { return []; },
  };
}

const PDF = new TextEncoder().encode('%PDF-1.7\nfake\n%%EOF\n');

function makeBucket({ present = true } = {}) {
  return {
    async get(key) {
      if (!present) return null;
      return { body: PDF, size: PDF.length, httpEtag: '"x"', writeHttpMetadata() {} };
    },
    async put() { return {}; },
  };
}

/*
 * `accept` is er om één reden en die reden is een valkuil: de taal van dit
 * dashboard komt uit de LAATSTE BESTELLING, niet uit de sessie. Een klant zonder
 * bestellingen heeft dus geen taal en valt terug op Accept-Language — dus een
 * test die de lege staat in het Nederlands verwacht en géén taal meestuurt,
 * krijgt Engels terug en faalt om een reden die niets met facturen te maken
 * heeft. Zie de noot over die volgorde in sectionGet().
 */
const get = (path, { db, bucket = makeBucket(), cookie = `vis_account=${token}`, accept = 'nl' } = {}) =>
  accountGet({
    request: new Request(`https://visuails.com${path}`, {
      headers: { ...(cookie ? { cookie } : {}), ...(accept ? { 'accept-language': accept } : {}) },
    }),
    env: { DB: db, UPLOADS: bucket },
  });

console.log('\nVISUAILS Studio — Facturen\n');

/* ── de pagina ───────────────────────────────────────────────────────────── */
{
  const res = await get('/account/invoices', { db: makeDb() });
  const body = await res.text();
  check('de pagina rendert', res.status === 200, res.status);
  check('het factuurnummer staat erop', body.includes('VIS-2026-0007'));
  check('het brutobedrag staat erop, niet het netto', body.includes('430,76') && !body.includes('356,00'));
  check('de bestelling staat erbij', body.includes('VIS-2608-4471'));
  check('er is een downloadlink', body.includes('/account/invoices/3/pdf'));
  check('Facturen staat in de zijbalk', body.includes('href="/account/invoices"'));
  check('en is de actieve sectie', /href="\/account\/invoices"[^>]*aria-current="page"/.test(body) || /aria-current="page"[^>]*href="\/account\/invoices"/.test(body));
  check('de bewaartermijn wordt uitgelegd', body.includes('zeven jaar'));
  check('geen "wordt gemaakt" bij een afgeronde factuur', !body.includes('Wordt gemaakt'));
}

/* ── de lege staat zegt twee verschillende dingen ─────────────────────────── */
{
  const none = await (await get('/account/invoices', { db: makeDb({ invoices: [], orders: [] }) })).text();
  check('zonder bestellingen: "zodra een bestelling betaald is"', none.includes('Zodra een bestelling betaald is'));

  // Wél betaald en tóch geen factuur: dan is de inhaalslag net gelopen en heeft
  // hij niets opgeleverd. De klant verwacht iets, dus de tekst is een andere.
  const waiting = await (await get('/account/invoices', { db: makeDb({ invoices: [] }) })).text();
  check('mét een betaalde bestelling: "krijgt er een zodra"', waiting.includes('zodra de betaling binnen is'));
}

/* ── pending: nummer wel, document nog niet ───────────────────────────────── */
{
  const pending = { ...INVOICE, status: 'pending', pdf_key: null, pdf_bytes: null, issued_at: null };
  const body = await (await get('/account/invoices', { db: makeDb({ invoices: [pending] }) })).text();
  check('het nummer staat er wel', body.includes('VIS-2026-0007'));
  check('maar er is GEEN downloadlink', !body.includes('/account/invoices/3/pdf'));
  check('het zegt dat hij gemaakt wordt', body.includes('Wordt gemaakt'));
  check('met uitleg wat de klant kan doen', body.includes('Vernieuw de pagina'));

  const res = await get('/account/invoices/3/pdf', { db: makeDb({ invoices: [pending] }) });
  check('de route geeft 404 en niet 500', res.status === 404, res.status);
}

/* ── ingetrokken: het document bestaat nog en mag er niet uit ─────────────────
 *
 * Dit is de enige toestand waarin `pdf_key` gevuld is en de factuur tóch niet
 * geleverd mag worden, en daarom staat hij hier: zonder deze twee regels blijft
 * de route groen als je de controle terugbrengt tot `if (!inv.pdf_key)`. Ook met
 * sabotage vastgesteld. Een ingetrokken factuur houdt zijn nummer en zijn bestand
 * — zie migratie 0021 — dus alleen naar het bestand kijken is niet genoeg. */
{
  const voided = { ...INVOICE, status: 'void' };
  const res = await get('/account/invoices/3/pdf', { db: makeDb({ invoices: [voided] }) });
  check('een ingetrokken factuur is niet te downloaden', res.status === 404, res.status);
  const body = await (await get('/account/invoices', { db: makeDb({ invoices: [voided] }) })).text();
  check('en staat in de lijst als ingetrokken', body.includes('Ingetrokken'));
  check('zonder downloadlink', !body.includes('/account/invoices/3/pdf'));
}

/* ── de download ─────────────────────────────────────────────────────────── */
{
  const res = await get('/account/invoices/3/pdf', { db: makeDb() });
  check('200', res.status === 200, res.status);
  check('content-type is application/pdf', res.headers.get('content-type') === 'application/pdf', res.headers.get('content-type'));
  check('altijd als bijlage, nooit inline', /^attachment;/.test(res.headers.get('content-disposition') || ''), res.headers.get('content-disposition'));
  check('de bestandsnaam is het factuurnummer', (res.headers.get('content-disposition') || '').includes('VIS-2026-0007.pdf'));
  check('niet indexeerbaar', (res.headers.get('x-robots-tag') || '').includes('noindex'));
  check('privé in de cache', (res.headers.get('cache-control') || '').startsWith('private'));
  check('nosniff', res.headers.get('x-content-type-options') === 'nosniff');
  const bytes = new Uint8Array(await res.arrayBuffer());
  check('de bytes komen door', bytes.length === PDF.length, `${bytes.length}`);
}

/* ── EIGENDOM. Dit is waar het echt om gaat. ─────────────────────────────── */
{
  // Dezelfde factuur, maar hij hangt aan de bestelling van een ándere klant.
  const res = await get('/account/invoices/3/pdf', { db: makeDb({ ownerId: OTHER_ID }) });
  check('de factuur van iemand anders: 404', res.status === 404, res.status);

  const missing = await get('/account/invoices/4444/pdf', { db: makeDb() });
  check('een factuur die niet bestaat: 404', missing.status === 404, missing.status);

  const anon = await get('/account/invoices/3/pdf', { db: makeDb(), cookie: '' });
  check('zonder sessie: naar het inloggen', anon.status === 303, anon.status);
  check('en dus geen pdf in het antwoord', (anon.headers.get('content-type') || '') !== 'application/pdf');

  const anonPage = await get('/account/invoices', { db: makeDb(), cookie: '' });
  check('de pagina zelf is ook dicht', anonPage.status === 303, anonPage.status);
}

/* ── R2 kwijt, database gezond ────────────────────────────────────────────── */
{
  const gone = await get('/account/invoices/3/pdf', { db: makeDb(), bucket: makeBucket({ present: false }) });
  check('object weg uit R2: 404', gone.status === 404, gone.status);

  const noBucket = await accountGet({
    request: new Request('https://visuails.com/account/invoices/3/pdf', { headers: { cookie: `vis_account=${token}` } }),
    env: { DB: makeDb() },
  });
  check('geen R2-binding: 503, niet 404', noBucket.status === 503, noBucket.status);
}

/* ── de sectie mag niet omvallen zonder migratie 0021 ─────────────────────── */
{
  const broken = makeDb();
  const inner = broken.prepare;
  broken.prepare = (sql) => {
    const st = inner.call(broken, sql);
    if (sql.includes('FROM invoices i')) {
      st.all = async () => { throw new Error('D1_ERROR: no such table: invoices'); };
    }
    return st;
  };
  const res = await get('/account/invoices', { db: broken });
  const body = await res.text();
  check('zonder de tabel nog steeds 200', res.status === 200, res.status);
  check('en de lege staat in plaats van een foutpagina', body.includes('Facturen') && !body.includes('We kunnen je account nu niet bereiken'));
}

/* ── de btw-vlag ─────────────────────────────────────────────────────────── */
{
  const reverse = { ...INVOICE, snapshot_json: JSON.stringify({ ...SNAP, treatment: 'eu_reverse_charge', vatCents: 0, grossCents: 35600 }) };
  const body = await (await get('/account/invoices', { db: makeDb({ invoices: [reverse] }) })).text();
  check('verlegging staat bij het nummer', body.includes('Btw verlegd'));
  check('en het bedrag is dan zonder btw', body.includes('356,00'));

  const outside = { ...INVOICE, snapshot_json: JSON.stringify({ ...SNAP, treatment: 'outside_scope', vatCents: 0 }) };
  check('buiten de EU krijgt zijn eigen regel', (await (await get('/account/invoices', { db: makeDb({ invoices: [outside] }) })).text()).includes('Buiten de Europese btw'));

  const plain = await (await get('/account/invoices', { db: makeDb() })).text();
  check('een gewone nl-factuur krijgt geen vlag', !plain.includes('Btw verlegd') && !plain.includes('Buiten de Europese btw'));
}

/* ── Engels ──────────────────────────────────────────────────────────────── */
{
  const body = await (await get('/account/invoices', { db: makeDb({ orders: [{ ...ORDER, lang: 'en' }] }) })).text();
  check('een Engelse klant krijgt Invoices', body.includes('>Invoices<') || body.includes('Invoices</'), '');
  check('en geen Nederlandse kop', !body.includes('>Facturen<'));
}

console.log(fails ? `\n${fails} failed\n` : '\nall passed\n');
if (fails) process.exit(1);
