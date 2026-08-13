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
import { accountGet, catchupOrder, issuedRefs } from '../src/lib/account.js';
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
function makeDb({ invoices = [INVOICE], orders = [ORDER], ownerId = CUSTOMER_ID, credits = [], noCreditTable = false } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE orders (id INTEGER PRIMARY KEY, ref TEXT, customer_id INTEGER, service TEXT, paid_at TEXT);`);
  db.exec(`CREATE TABLE invoices (
    id INTEGER PRIMARY KEY, number TEXT, year INTEGER, seq INTEGER, order_id INTEGER,
    customer_id INTEGER, status TEXT, pdf_key TEXT, pdf_bytes INTEGER,
    snapshot_json TEXT, lang TEXT, issued_at TEXT, created_at TEXT);`);
  /* De creditnota's uit migratie 0026, om precies dezelfde reden ECHT en niet gestubd:
     de eigendomscontrole hangt aan de WHERE en niet aan de meegegeven waarden. Zie de
     noot hierboven over waarom een stub die het eigendom nabouwt de gevaarlijkste fout
     in dit bestand niet kan zien.

     `noCreditTable` bootst een database na waar 0026 nog niet op gedraaid is: dat mag
     het overzicht niet slopen, want 0021 kan wél gedraaid zijn. */
  if (!noCreditTable) {
    db.exec(`CREATE TABLE credit_notes (
      id INTEGER PRIMARY KEY, number TEXT, year INTEGER, seq INTEGER, invoice_id INTEGER,
      order_id INTEGER, customer_id INTEGER, net_cents INTEGER, vat_cents INTEGER,
      gross_cents INTEGER, reason TEXT, status TEXT, void_reason TEXT, pdf_key TEXT,
      pdf_bytes INTEGER, snapshot_json TEXT, lang TEXT, issued_at TEXT, created_at TEXT);`);
  }

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

  if (!noCreditTable) {
    credits.forEach((c, i) => {
      const o = orders[0] || { id: 0 };
      db.prepare(`INSERT INTO credit_notes (id, number, year, seq, invoice_id, order_id, customer_id, net_cents, vat_cents, gross_cents, reason, status, pdf_key, pdf_bytes, snapshot_json, lang, issued_at, created_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(c.id, c.number, 2026, 90 + i, invoices[0]?.id ?? 1, o.id, ownerId,
          c.net_cents ?? 10000, c.vat_cents ?? 2100, c.gross_cents ?? 12100, c.reason ?? null,
          c.status, c.pdf_key ?? null, c.pdf_bytes ?? null, c.snapshot_json, c.lang ?? 'nl',
          c.issued_at ?? null, c.created_at ?? '2026-08-12 10:00:00');
    });
  }

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
          if (sql.includes('FROM credit_notes c')) return real(sql, st._b)[0] ?? null;
          if (sql.includes('FROM customers')) return { email: 'studio@voltbrand.nl', name: 'Mara', brand: 'VOLT' };
          return null;
        },
        async all() {
          seen.push(sql);
          if (sql.includes('FROM invoices i')) return { results: real(sql, st._b) };
          if (sql.includes('FROM credit_notes c')) return { results: real(sql, st._b) };
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
/* ── DE VOLGORDE WAARIN DE INHAALSLAG NUMMERS UITDEELT ─────────────────────
 *
 * Op 10 augustus 2026 stond in het overzicht van Lucas:
 *
 *   VIS-2026-0001   9 aug        VIS-2026-0003   7 aug
 *   VIS-2026-0002   9 aug        VIS-2026-0004   7 aug
 *
 * Het nummer liep tegen de datum in, want de lijst kwam binnen op `created_at DESC`
 * (goed voor het dashboard van de klant) en die volgorde bepaalde wie het eerste
 * nummer kreeg. De nummers waren opeenvolgend en zonder gaten, dus formeel in orde —
 * maar een reeks waarin 0003 twee dagen vóór 0001 gedateerd is, is het eerste wat een
 * boekhouder eruit haalt.
 */
/* ── EEN HALVE FACTUUR MOET OPNIEUW GEPROBEERD WORDEN ──────────────────────
 *
 * VIS-2026-0004 bleef op 10 augustus 2026 op "Wordt gemaakt" staan: nummer wel, pdf
 * niet. De pagina zei "Vernieuw de pagina over een minuut", maar de inhaalslag sloeg
 * die bestelling over omdat er al een factuurRIJ stond. De belofte onder de tabel was
 * dus niet waar. issueInvoice() hergebruikt bij een tweede poging hetzelfde nummer, dus
 * opnieuw proberen kost geen gat in de reeks.
 */
console.log('\nwelke facturen als "klaar" gelden');
{
  const L = (ref, status) => ({ ref, status });
  const set = issuedRefs([L('A', 'issued'), L('B', 'pending'), L('C', 'issued'), L('D', 'void')]);
  check('een uitgegeven factuur geldt als klaar', set.has('A'));
  check('een halve factuur NIET', set.has('B') === false, set.has('B'));
  check('een vernietigde factuur ook niet', set.has('D') === false, set.has('D'));
  check('en er blijven er twee over', set.size === 2, set.size);
  check('een lege lijst valt niet om', issuedRefs(null).size === 0, issuedRefs(null).size);

  // Het gevolg samen met de sortering: de halve wordt opnieuw aangeboden.
  /* MET total_cents, en dat is sinds 12 augustus 2026 een eis en geen sier:
     catchupOrder() slaat een bestelling zonder bedrag over, want een factuur van nul
     euro is nooit een geldig document. Een betaalde rij in D1 heeft altijd een bedrag
     — ook de proefvisual, sinds die als brutobedrag inclusief btw wordt weggeschreven
     — dus een fixture zonder bedrag toetste de code tegen een rij die niet bestaat. */
  const orders = [
    { ref: 'A', id: 1, paid_at: '2026-08-07 08:00:00', payment_status: 'paid', total_cents: 8900 },
    { ref: 'B', id: 2, paid_at: '2026-08-09 08:00:00', payment_status: 'paid', total_cents: 8900 },
  ];
  const again = catchupOrder(orders, set).map((o) => o.ref);
  check('de bestelling met de halve factuur komt terug', again.join('') === 'B', again.join(''));
}

console.log('\nde volgorde van de inhaalslag');
{
  /* total_cents hoort bij de standaardvorm van een betaalde rij; zie de noot bij
     `orders` hierboven. Wie hem expliciet op null zet, toetst de ondergrens. */
  const O = (ref, id, paid_at, payment_status = 'paid', total_cents = 8900) =>
    ({ ref, id, paid_at, payment_status, total_cents });

  // Zoals loadOrders() ze aanlevert: nieuwste eerst.
  const dashboardOrder = [
    O('VIS-EN6T-CG1', 4, '2026-08-09 11:00:00'),
    O('VIS-4MZF-WVP', 3, '2026-08-09 09:30:00'),
    O('VIS-5ASQ-ZZQ', 2, '2026-08-07 16:00:00'),
    O('VIS-ME5F-UJW', 1, '2026-08-07 08:15:00'),
  ];
  const out = catchupOrder(dashboardOrder, new Set()).map((o) => o.ref);
  check('de oudste betaling krijgt het eerste nummer', out[0] === 'VIS-ME5F-UJW', out[0]);
  check('en de nieuwste het laatste', out[3] === 'VIS-EN6T-CG1', out[3]);
  check('de datums lopen dus mee met de nummers',
    out.join(',') === 'VIS-ME5F-UJW,VIS-5ASQ-ZZQ,VIS-4MZF-WVP,VIS-EN6T-CG1', out.join(','));

  // Twee betalingen op dezelfde seconde: dan beslist de bestelling die er het eerst
  // was, en niet wat de database die dag teruggeeft.
  const tie = catchupOrder([O('B', 9, '2026-08-07 08:15:00'), O('A', 2, '2026-08-07 08:15:00')], new Set());
  check('gelijke betaaltijd: laagste id eerst', tie.map((o) => o.ref).join('') === 'AB', tie.map((o) => o.ref).join(''));

  // Wat er niet in mag.
  const mixed = catchupOrder([
    O('betaald', 1, '2026-08-07 08:00:00'),
    O('onbetaald', 2, null, 'unpaid'),
    O('betaald-zonder-datum', 3, null),
    O('heeft-al-een-factuur', 4, '2026-08-06 08:00:00'),
    /* En de ondergrens van 12 augustus 2026: geen bedrag, geen factuur. Dit zijn de
       proefvisuals van voor die datum — betaald, maar met total_cents NULL omdat
       quoteOrder() null gaf en niemand er iets schreef. Zonder deze regel maakt de
       inhaalslag daar een genummerde factuur van EUR 0,00 van, en die is niet terug te
       draaien: het nummer is verbruikt in een reeks die geen gaten mag hebben. */
    O('betaald-zonder-bedrag', 5, '2026-08-07 09:00:00', 'paid', null),
    O('betaald-met-nul', 6, '2026-08-07 09:30:00', 'paid', 0),
  ], new Set(['heeft-al-een-factuur']));
  check('alleen betaalde bestellingen', mixed.map((o) => o.ref).join(',') === 'betaald', mixed.map((o) => o.ref).join(','));
  check('een lege lijst valt niet om', catchupOrder(undefined, new Set()).length === 0, catchupOrder(undefined, new Set()).length);

  // En de lijst die binnenkwam blijft zoals hij was — het dashboard erna gebruikt hem.
  check('de aangeleverde lijst wordt niet omgesorteerd', dashboardOrder[0].ref === 'VIS-EN6T-CG1', dashboardOrder[0].ref);
}


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

/* ══ DE CREDITNOTA IN HET OVERZICHT VAN DE KLANT — 12 augustus 2026 ═════════
 *
 * Een klant die geld terug heeft gekregen, heeft een document dat dat zegt. Dat document
 * hoort in hetzelfde overzicht als de factuur die het intrekt, want op twee plekken
 * kijken is precies wat een klant niet doet — dan mailt hij Lucas.
 *
 * DRIE DINGEN, en het derde is het enige dat echt geld kost als het misgaat:
 *
 *   1 · hij staat in de lijst, met een eigen merkteken zodat hij niet als een tweede
 *       rekening leest;
 *   2 · de downloadknop wijst naar het pad van een creditnota en niet naar dat van een
 *       factuur — twee tabellen, twee routes, en hetzelfde id bestaat in beide;
 *   3 · en de nota van iemand anders komt er NIET uit. Die controle draait hier tegen een
 *       echte SQLite, om precies de reden die bovenaan dit bestand staat: een stub die het
 *       eigendom zelf nabouwt blijft groen als de WHERE wordt verzwakt.
 */
const CREDIT_SNAP = {
  number: 'VIS-2026-0008', date: '2026-08-12', lang: 'nl', kind: 'credit',
  netCents: 35600, vatCents: 7476, grossCents: 43076, vatRate: 0.21,
  treatment: 'nl_standard', creditsNumber: 'VIS-2026-0007', customer: { name: 'Jan Jansen' }, lines: [],
};
const CREDIT = {
  id: 5, number: 'VIS-2026-0008', status: 'issued',
  pdf_key: 'credit-notes/2026/VIS-2026-0008.pdf', pdf_bytes: 2100,
  net_cents: 35600, vat_cents: 7476, gross_cents: 43076, reason: 'Bestelling geannuleerd',
  snapshot_json: JSON.stringify(CREDIT_SNAP), lang: 'nl',
  issued_at: '2026-08-12 10:00:05', created_at: '2026-08-12 10:00:03',
};

{
  const res = await get('/account/invoices', { db: makeDb({ credits: [CREDIT] }) });
  const body = await res.text();
  check('de creditnota staat in het overzicht', body.includes('VIS-2026-0008'), '');
  check('en is gemerkt als creditnota', body.includes('Creditnota'), '');
  /* Het PAD is het punt: /account/credit-notes/5/pdf en niet /account/invoices/5/pdf.
     Factuur 3 en nota 5 bestaan naast elkaar, en id 5 zou in de factuurtabel niets zijn —
     of, erger, ooit iets van een andere klant. */
  check('met de knop naar het creditnotapad', body.includes('/account/credit-notes/5/pdf'), '');
  check('en niet naar het factuurpad', !body.includes('/account/invoices/5/pdf'));
  /* De factuur die hij intrekt staat er nog gewoon: een creditnota vervángt geen factuur. */
  check('de factuur staat er nog', body.includes('VIS-2026-0007'), '');
}
{
  /* De taal van dit dashboard komt uit de LAATSTE BESTELLING en niet uit de nota of uit
     Accept-Language — zie de noot bij get() hierboven. Een Engelse creditnota bij een
     Nederlandse bestelling levert dus een Nederlands overzicht op, en dat is goed: de
     klant leest één taal, niet één per document. */
  const en = await get('/account/invoices', {
    db: makeDb({ orders: [{ ...ORDER, lang: 'en' }], credits: [CREDIT] }),
    accept: 'en',
  });
  const body = await en.text();
  check('en in het Engels heet het Credit note', body.includes('Credit note'), '');
}
{
  const res = await get('/account/credit-notes/5/pdf', { db: makeDb({ credits: [CREDIT] }) });
  check('de eigen creditnota komt eruit', res.status === 200, res.status);
  check('als pdf', res.headers.get('content-type') === 'application/pdf', res.headers.get('content-type'));
  check('en als download met het nummer als naam',
    (res.headers.get('content-disposition') || '').includes('VIS-2026-0008.pdf'),
    res.headers.get('content-disposition'));
}

/* ── EIGENDOM, DE CREDITNOTA-KANT. Dit is waar het echt om gaat. ───────────── */
{
  const other = await get('/account/credit-notes/5/pdf', { db: makeDb({ credits: [CREDIT], ownerId: OTHER_ID }) });
  check('de creditnota van iemand anders: 404', other.status === 404, other.status);

  const missing = await get('/account/credit-notes/4444/pdf', { db: makeDb({ credits: [CREDIT] }) });
  check('een creditnota die niet bestaat: 404', missing.status === 404, missing.status);

  const anon = await get('/account/credit-notes/5/pdf', { db: makeDb({ credits: [CREDIT] }), cookie: '' });
  check('zonder sessie: naar het inloggen', anon.status === 303, anon.status);

  /* Een nota met een nummer maar zonder pdf. Die hoort geen knop te krijgen en geen 500
     te geven — dezelfde afspraak als bij een factuur op 'pending'. */
  const pending = await get('/account/credit-notes/5/pdf', {
    db: makeDb({ credits: [{ ...CREDIT, status: 'pending', pdf_key: null }] }),
  });
  check('een nota zonder pdf: 404 en geen 500', pending.status === 404, pending.status);

  const lijst = await get('/account/invoices', {
    db: makeDb({ credits: [{ ...CREDIT, status: 'pending', pdf_key: null }] }),
  });
  const body = await lijst.text();
  check('en dan staat er geen downloadknop', !body.includes('/account/credit-notes/5/pdf'));
}
{
  /* Migratie 0026 nog niet gedraaid terwijl 0021 dat wel is. Dan zijn er geen nota's, en
     dat mag het overzicht niet slopen — dezelfde afspraak als bij een ontbrekende
     invoices-tabel, maar zonder de waarschuwing in de log, want dit is een normale
     tussentoestand en geen storing. */
  const res = await get('/account/invoices', { db: makeDb({ noCreditTable: true }) });
  check('zonder credit_notes-tabel rendert het overzicht gewoon', res.status === 200, res.status);
  const body = await res.text();
  check('en de facturen staan er nog', body.includes('VIS-2026-0007'), '');
}

console.log(fails ? `\n${fails} failed\n` : '\nall passed\n');
if (fails) process.exit(1);
