/**
 * VISUAILS — klant tegen klant (19 oktober 2026).
 *
 *   node tests/klant-scheiding.test.mjs        (npm run test:scheiding)
 *
 * Lucas vroeg of zijn RLS (Row-Level Security) aan stond. Die bestaat hier niet: de site
 * draait op Cloudflare D1, en de browser praat nooit met de database. Alleen de Worker
 * doet dat, en elke vraag hoort te filteren op de klant van de sessie (of op het geheime
 * kenmerk van de privélink). RLS is het vangnet "de database weigert, ook als de code een
 * WHERE vergeet". Dat vangnet is deze toets: op elke route die één klant zijn gegevens
 * leest of wijzigt, probeert klant B met zijn eigen sessie bij de gegevens van klant A.
 * Dat moet overal falen, en er mag niets veranderen.
 *
 * Elke route wordt drie keer aangeroepen:
 *   · als A zelf (de controle: zonder die controle bewijst een 404 niets, want dan kan
 *     de route ook gewoon kapot zijn of de toets het verkeerde kenmerk gebruiken);
 *   · als B, met A's kenmerk in de URL of het formulier: geen 200, niets van A in het
 *     antwoord, geen R2-bestand van A gelezen;
 *   · zonder sessie: geen 200.
 * Bij een POST van B daarbij: de database is daarna precies gelijk (alle tabellen die
 * zo'n route raakt), er is niets in R2 gezet of gewist en er ging geen verzoek naar Mollie.
 *
 * Een echte SQLite (tests/lib/d1sqlite.mjs) met het echte schema, geen stub: een stub die
 * het eigendom zelf nabouwt, blijft groen als je de WHERE in de code verzwakt (zie de noot
 * in tests/account-invoices.test.mjs). Elke aanroep komt van een eigen IP, zodat de
 * snelheidsgrens (rate_limits) nooit het antwoord is in plaats van de eigendomscontrole.
 *
 * Blok 5 doet hetzelfde op de open routes zonder inlog (/api/order en /api/plan), waar een
 * klant zijn e-mailadres is: sinds 19 oktober 2026 kan een buitenstaander daar met het
 * adres van A niets meer aan A veranderen, en niets van A gebruiken.
 *
 * Bewust niet hier: /admin (één beheerder, wachtwoord en TOTP, eigen toetsen), en de
 * routes op bestelkenmerk die geen geheim nodig hebben (zie
 * kladblok/levering-62/klant-scheiding.md).
 */
import { verseDb, d1 } from './lib/d1sqlite.mjs';
import { accountGet, accountPost, studioScreen } from '../src/lib/account.js';
import { portalGet, portalPost } from '../src/lib/portal.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0, fail = 0;
/* `goed` moet een echte boolean zijn: een array of tekst als tweede argument zou altijd
   "waar" zijn en niets toetsen. Voor kreeg-tegen-verwacht is er gelijk() hieronder. */
const ok = (naam, goed, uitleg = '') => {
  if (typeof goed !== 'boolean') throw new Error(`ok("${naam}") kreeg geen boolean maar ${typeof goed} — gebruik gelijk()`);
  if (goed) pass++; else fail++;
  console.log(`${goed ? ' ok  ' : ' FAIL'} ${String(naam).padEnd(74)} ${goed ? '' : uitleg}`);
};
const gelijk = (naam, kreeg, verwacht) => ok(naam, JSON.stringify(kreeg) === JSON.stringify(verwacht), `verwacht ${JSON.stringify(verwacht)}, kreeg ${JSON.stringify(kreeg)}`);

/* ── de twee klanten en wat van A is ─────────────────────────────────────── */
const A = { id: 1, email: 'studio@voorbeeld-volt.test', merk: 'VOLTPROEF' };
const B = { id: 2, email: 'iemand@anders-label.test', merk: 'ANDERSLABEL' };
const ID = { orderA: 101, orderB: 201, uploadA: 1001, leverA: 1002, leverA2: 1003, leverB: 2002,
  factuurA: 301, factuurB: 302, creditA: 401, aboA: 501, aboFactuurA: 601, modelA: 701, stijlA: 801 };
const REF_A = 'VIS-PRF1-A7Q';
const SPOOR = [REF_A, A.email, A.merk, 'VIS-2026-9001', 'VIS-C-2026-9001', 'VIS-A-2026-9001', 'Gezicht van Volt', 'Look van Volt', 'leveringen/a/'];

const sessieA = 'sessie-klant-a-0001';
const sessieB = 'sessie-klant-b-0002';
const portaalA = await mintToken();
const portaalB = await mintToken();

async function zaai({ status = 'delivered', dicht = true, leverStand = 'pending', uploadShot = 'front' } = {}) {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt?.length) throw new Error('schema: ' + mislukt.join(' · '));
  const sql = (s, ...b) => db.prepare(s).run(...b);
  sql('INSERT INTO customers (id, email, name, brand, country) VALUES (?, ?, ?, ?, ?)', A.id, A.email, 'Mara', A.merk, 'NL');
  sql('INSERT INTO customers (id, email, name, brand, country) VALUES (?, ?, ?, ?, ?)', B.id, B.email, 'Joris', B.merk, 'NL');
  for (const [k, t] of [[A.id, sessieA], [B.id, sessieB]]) {
    sql("INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (?, ?, datetime('now'), datetime('now', '+30 days'))", k, await hashToken(t));
  }
  const geleverd = status === 'delivered';
  const order = (id, ref, k, email, merk) => sql(
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count,
       payment_status, vat_cents, vat_rate, vat_treatment, delivered_at, delivery_mailed_at, closed_at)
     VALUES (?, ?, ?, 'catalog', ?, 'Naam', ?, ?, 35600, 'nl', '2026-10-01 10:00', 'attended', 4,
       'unpaid', 7476, 0.21, 'nl_standard', ?, ?, ?)`, id, ref, k, status, merk, email,
    geleverd ? '2026-10-05' : null, geleverd ? '2026-10-05 09:00' : null, dicht ? '2026-10-12 09:00' : null);
  order(ID.orderA, REF_A, A.id, A.email, A.merk);
  order(ID.orderB, 'VIS-PRF2-B8R', B.id, B.email, B.merk);
  const bestand = (id, o, kind, key, naam, shot = 'front', stand = 'pending') => sql(
    'INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot) VALUES (?, ?, ?, ?, ?, 1200, ?, ?, ?)',
    id, o, kind, key, naam, stand, 'p1', shot);
  bestand(ID.uploadA, ID.orderA, 'upload', `intake/batch-a/voorkant-a.jpg`, 'voorkant-a.jpg', uploadShot);
  bestand(ID.leverA, ID.orderA, 'delivery', 'leveringen/a/p1-front.jpg', 'volt-p1-front.jpg', 'front', leverStand);
  bestand(ID.leverA2, ID.orderA, 'delivery', 'leveringen/a/p1-back.jpg', 'volt-p1-back.jpg', 'back');
  bestand(ID.leverB, ID.orderB, 'delivery', 'leveringen/b/p1-front.jpg', 'anders-p1-front.jpg');
  const snap = (nr) => JSON.stringify({ number: nr, date: '2026-10-02', lang: 'nl', netCents: 35600, vatCents: 7476, grossCents: 43076, vatRate: 0.21, treatment: 'nl_standard', customer: { name: 'Mara' }, lines: [] });
  sql("INSERT INTO invoices (id, number, year, seq, order_id, customer_id, status, pdf_key, pdf_bytes, snapshot_json, issued_at) VALUES (?, ?, 2026, 9001, ?, ?, 'issued', ?, 2310, ?, '2026-10-02 10:00')",
    ID.factuurA, 'VIS-2026-9001', ID.orderA, A.id, 'facturen/2026/VIS-2026-9001.pdf', snap('VIS-2026-9001'));
  sql("INSERT INTO invoices (id, number, year, seq, order_id, customer_id, status, pdf_key, pdf_bytes, snapshot_json, issued_at) VALUES (?, ?, 2026, 9002, ?, ?, 'issued', ?, 2310, ?, '2026-10-02 10:00')",
    ID.factuurB, 'VIS-2026-9002', ID.orderB, B.id, 'facturen/2026/VIS-2026-9002.pdf', snap('VIS-2026-9002'));
  sql("INSERT INTO credit_notes (id, number, year, seq, invoice_id, order_id, customer_id, net_cents, vat_cents, gross_cents, status, pdf_key, pdf_bytes, snapshot_json, issued_at) VALUES (?, 'VIS-C-2026-9001', 2026, 9001, ?, ?, ?, 1000, 210, 1210, 'issued', 'creditnotas/2026/VIS-C-2026-9001.pdf', 2000, ?, '2026-10-03 10:00')",
    ID.creditA, ID.factuurA, ID.orderA, A.id, snap('VIS-C-2026-9001'));
  sql("INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at, amount_cents) VALUES (?, ?, 'SUB-PRF-A501', 'studio', 'monthly', 'active', 8, '2026-09-01', 79000)", ID.aboA, A.id);
  sql("INSERT INTO subscription_invoices (id, number, year, seq, subscription_id, customer_id, month, status, pdf_key, pdf_bytes, snapshot_json, issued_at) VALUES (?, 'VIS-A-2026-9001', 2026, 9001, ?, ?, '2026-10', 'issued', 'abonnement/2026/VIS-A-2026-9001.pdf', 2000, ?, '2026-10-01 10:00')",
    ID.aboFactuurA, ID.aboA, A.id, snap('VIS-A-2026-9001'));
  sql("INSERT INTO custom_models (id, customer_id, label, preview_key, status) VALUES (?, ?, 'Gezicht van Volt', 'modellen/a/voorbeeld.webp', 'approved')", ID.modelA, A.id);
  sql("INSERT INTO customer_styles (id, customer_id, name, service, status, preview_key) VALUES (?, ?, 'Look van Volt', 'both', 'active', 'stijlen/a/voorbeeld.webp')", ID.stijlA, A.id);
  sql('INSERT INTO order_tokens (order_id, token_hash) VALUES (?, ?)', ID.orderA, await hashToken(portaalA));
  sql('INSERT INTO order_tokens (order_id, token_hash) VALUES (?, ?)', ID.orderB, await hashToken(portaalB));
  return db;
}

/* ── R2 en Mollie: alles wat er gebeurt, wordt opgeschreven ─────────────── */
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
function emmer() {
  const log = { gelezen: [], gezet: [], gewist: [] };
  const obj = (key) => ({ key, body: new Blob([JPG]).stream(), size: JPG.length, httpEtag: '"x"', etag: 'x', uploaded: new Date(), httpMetadata: { contentType: key.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' }, customMetadata: {}, writeHttpMetadata(h) { h.set('content-type', this.httpMetadata.contentType); }, async arrayBuffer() { return JPG.buffer.slice(0); } });
  return {
    log,
    async get(key) { log.gelezen.push(key); return obj(key); },
    async head(key) { return obj(key); },
    async put(key) { log.gezet.push(key); return {}; },
    async delete(key) { log.gewist.push(...[].concat(key)); },
    async list() { return { objects: [], truncated: false }; },
  };
}
const echteFetch = globalThis.fetch;
let mollie = [];
globalThis.fetch = async (url, init) => { mollie.push(String(url)); return new Response(JSON.stringify({ id: 'tr_proef', _links: { checkout: { href: 'https://www.mollie.com/checkout/proef' } }, status: 'open' }), { status: 201, headers: { 'content-type': 'application/json' } }); };

let ip = 0;
const omgeving = (db, bucket) => ({ DB: d1(db), UPLOADS: bucket, MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', FROM_EMAIL: 'studio@visuails.test', NOTIFY_EMAIL: 'lucas@visuails.test', PORTAL_SALT: 'proef-zout', SITE_URL: 'https://visuails.com' });
const kop = (sessie, extra = {}) => ({ 'cf-connecting-ip': `10.0.${Math.floor(++ip / 250)}.${ip % 250}`, 'accept-language': 'nl', ...(sessie ? { cookie: `vis_account=${sessie}` } : {}), ...extra });
const ctx = (request, env) => ({ request, env, waitUntil() {} });
const tekst = async (res) => { try { return await res.clone().text(); } catch { return ''; } };
const spoorIn = (s) => SPOOR.filter((x) => s.includes(x));

/* Elke tabel van de database, behalve de tellers van de snelheidsgrens (die tellen elk
   verzoek, ook een geweigerd: dat is hun werk). */
const NIET = new Set(['rate_limits', 'sqlite_sequence']);
function foto(db) {
  const uit = {};
  for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()) {
    if (NIET.has(name)) continue;
    /* de sessie van B mag zijn eigen rij bijwerken (laatst gezien); die van A niet */
    const waar = name === 'account_sessions' ? ` WHERE customer_id <> ${B.id}` : '';
    uit[name] = JSON.stringify(db.prepare(`SELECT * FROM "${name}"${waar} ORDER BY rowid`).all());
  }
  return uit;
}
const verschil = (a, b) => Object.keys(a).filter((t) => a[t] !== b[t]);

console.log('\nVISUAILS — klant tegen klant: B probeert bij A\n');

/* ── 1. GET-routes met een kenmerk van A ─────────────────────────────────── */
const GET = [
  ['/account/orders/%d/instellingen', ID.orderA],
  ['/account/orders/%d/zip', ID.orderA],
  ['/account/files/%d/f', ID.leverA],
  ['/account/files/%d/f', ID.uploadA],
  ['/account/invoices/%d/pdf', ID.factuurA],
  ['/account/plan-invoices/%d/pdf', ID.aboFactuurA],
  ['/account/credit-notes/%d/pdf', ID.creditA],
  ['/account/models/%d/preview', ID.modelA],
  ['/account/styles/%d/preview', ID.stijlA],
];
console.log('1 · lezen onder /account');
for (const [patroon, id] of GET) {
  const pad = patroon.replace('%d', id);
  const db = await zaai(); const bucket = emmer(); const env = omgeving(db, bucket);
  const vraag = (s) => accountGet(ctx(new Request(`https://visuails.com${pad}`, { headers: kop(s) }), env));
  const eigen = await vraag(sessieA);
  ok(`${pad}: A zelf krijgt het (controle)`, eigen.status === 200, `status ${eigen.status}`);
  const r2Na = bucket.log.gelezen.length;
  const ander = await vraag(sessieB);
  const body = await tekst(ander);
  ok(`${pad}: B krijgt het niet`, ander.status !== 200 && ander.status < 500, `status ${ander.status}`);
  ok(`${pad}: niets van A in het antwoord aan B`, spoorIn(body).length === 0, spoorIn(body).join(', '));
  ok(`${pad}: voor B geen bestand uit R2 gelezen`, bucket.log.gelezen.length === r2Na, bucket.log.gelezen.slice(r2Na).join(', '));
  const niemand = await vraag(null);
  ok(`${pad}: zonder sessie niets`, niemand.status !== 200, `status ${niemand.status}`);
}

/* ── 2. wie ben ik, en de schermen van Studio ────────────────────────────── */
console.log('\n2 · /account/me en de schermen van Studio');
{
  const db = await zaai(); const env = omgeving(db, emmer());
  const me = async (s) => { const r = await accountGet(ctx(new Request('https://visuails.com/account/me?stand=1', { headers: kop(s) }), env)); return { status: r.status, body: await tekst(r) }; };
  const eigen = await me(sessieA); const ander = await me(sessieB);
  ok('/account/me: A ziet zijn eigen merk (controle)', eigen.status === 200 && eigen.body.includes(A.merk), `status ${eigen.status}`);
  ok('/account/me: B ziet niets van A', spoorIn(ander.body).length === 0, spoorIn(ander.body).join(', '));
  const veilig = (x) => { const gezien = new WeakSet(); try { return JSON.stringify(x, (k, v) => { if (typeof v === 'object' && v !== null) { if (gezien.has(v)) return undefined; gezien.add(v); } if (typeof v === 'function') return undefined; return v; }); } catch { return ''; } };
  for (const scherm of ['overview', 'orders', 'invoices', 'brand', 'details', 'plan']) {
    const st = async (s) => { const r = await studioScreen(ctx(new Request(`https://visuails.com/account/${scherm === 'overview' ? '' : scherm}`, { headers: kop(s) }), env), scherm); return r instanceof Response ? { res: r, s: await tekst(r) } : { s: veilig(r) }; };
    const a = await st(sessieA); const b = await st(sessieB);
    ok(`Studio, ${scherm}: A ziet zijn eigen gegevens (controle)`, spoorIn(a.s).length > 0, 'geen spoor van A in A\'s eigen scherm');
    ok(`Studio, ${scherm}: B ziet niets van A`, spoorIn(b.s).length === 0, spoorIn(b.s).join(', '));
  }
  /* terug van Mollie met het abonnement van A in de URL */
  const terug = await studioScreen(ctx(new Request(`https://visuails.com/account/plan/return?sub=${ID.aboA}`, { headers: kop(sessieB) }), env), 'plan-return');
  const terugS = terug instanceof Response ? await tekst(terug) : veilig(terug);
  ok('Studio, terug van Mollie met A\'s abonnement: B leert niets', spoorIn(terugS).length === 0 && !terugS.includes('SUB-PRF-A501'), spoorIn(terugS).join(', '));
}

/* ── 3. POST-routes met een kenmerk van A ────────────────────────────────── */
console.log('\n3 · wijzigen onder /account (de database blijft precies gelijk)');
const STIJL = 'catalog';
const OPEN = { status: 'delivered', dicht: false };
const POST = [
  // [route, velden, zaad]
  ['/account/lock', { style: STIJL, face: `c${ID.modelA}` }, {}],
  ['/account/lock', { style: STIJL, look: `cs-${ID.stijlA}` }, {}],
  ['/account/review', { action: 'approve', file: String(ID.leverA) }, OPEN],
  ['/account/review', { action: 'undo', file: String(ID.leverA) }, { ...OPEN, leverStand: 'approved' }],
  ['/account/review', { action: 'approve-order', order: String(ID.orderA) }, OPEN],
  ['/account/review', { action: 'approve-product', order: String(ID.orderA), product: 'p1' }, OPEN],
  ['/account/review', { action: 'round', file: String(ID.leverA), [`note-${ID.leverA}`]: 'de knoop klopt niet' }, OPEN],
  ['/account/feedback', { order: String(ID.orderA), fb: 'score', score: '5' }, {}],
  [`/account/orders/${ID.orderA}/ronde`, { file: String(ID.leverA), [`note-${ID.leverA}`]: 'de knoop klopt niet' }, OPEN],
  [`/account/orders/${ID.orderA}/pay`, {}, { status: 'received', dicht: false }],
  [`/account/orders/${ID.orderA}/fotos`, { weg: String(ID.uploadA) }, { status: 'received', dicht: false, uploadShot: 'ref1' }],
  [`/account/orders/${ID.orderA}/formaat`, { formaat: 'png' }, {}],
];
const post = (env, pad, velden, sessie) => accountPost(ctx(new Request(`https://visuails.com${pad}`, {
  method: 'POST', body: new URLSearchParams(velden),
  headers: kop(sessie, { origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' }),
}), env));
for (const [pad, velden, zaad] of POST) {
  const naam = `${pad} ${Object.entries(velden).map(([k, v]) => `${k}=${v}`).join('&')}`.slice(0, 58);
  /* de controle: A zelf, op een eigen verse database. Doet de route voor A niets, dan
     bewijst "voor B veranderde niets" niets. */
  {
    const db = await zaai(zaad); const bucket = emmer(); const env = omgeving(db, bucket);
    const voor = foto(db); mollie = [];
    const res = await post(env, pad, velden, sessieA);
    const body = await tekst(res);
    const effect = verschil(voor, foto(db)).length > 0 || bucket.log.gezet.length || bucket.log.gewist.length || mollie.length || (res.status === 200 && spoorIn(body).length > 0);
    ok(`${naam}: voor A werkt het (controle)`, !!effect, `status ${res.status}, ${res.headers.get('location') || ''}`);
  }
  const db = await zaai(zaad); const bucket = emmer(); const env = omgeving(db, bucket);
  const voor = foto(db); mollie = [];
  const res = await post(env, pad, velden, sessieB);
  const body = await tekst(res);
  const anders = verschil(voor, foto(db));
  ok(`${naam}: B verandert niets`, anders.length === 0, `veranderd: ${anders.join(', ')}`);
  ok(`${naam}: B zet niets in R2 of Mollie`, !bucket.log.gezet.length && !bucket.log.gewist.length && !mollie.length, `R2 ${bucket.log.gezet.concat(bucket.log.gewist).join(',')} · Mollie ${mollie.length}`);
  ok(`${naam}: niets van A in het antwoord aan B`, spoorIn(body).length === 0, spoorIn(body).join(', '));
}

/* ── 4. de privélink: het kenmerk van B, een bestand van A ───────────────── */
console.log('\n4 · de privélink (/o/<kenmerk>)');
{
  const db = await zaai(); const bucket = emmer(); const env = omgeving(db, bucket);
  const haal = (tok, rest = '') => portalGet(ctx(new Request(`https://visuails.com/o/${tok}${rest}`, { headers: kop(null) }), env));
  const eigen = await haal(portaalA, `/f/${ID.leverA}`);
  ok('/o/<A>/f/<beeld van A>: A krijgt het (controle)', eigen.status === 200, `status ${eigen.status}`);
  const r2Na = bucket.log.gelezen.length;
  const ander = await haal(portaalB, `/f/${ID.leverA}`);
  ok('/o/<B>/f/<beeld van A>: geweigerd', ander.status !== 200 && ander.status < 500, `status ${ander.status}`);
  ok('/o/<B>/f/<beeld van A>: geen bestand uit R2 gelezen', bucket.log.gelezen.length === r2Na, bucket.log.gelezen.slice(r2Na).join(', '));
  const paginaB = await tekst(await haal(portaalB));
  ok('/o/<B>: niets van A op de pagina', spoorIn(paginaB).length === 0, spoorIn(paginaB).join(', '));
  const voorZip = bucket.log.gelezen.length;
  const zipB = await haal(portaalB, '/zip');
  if (zipB.body) await zipB.arrayBuffer().catch(() => null);
  const naZip = bucket.log.gelezen.slice(voorZip);
  ok('/o/<B>/zip: geen bestand van A', !naZip.some((k) => k.startsWith('leveringen/a/')), naZip.join(', '));
  const fout = await haal('x'.repeat(43), `/f/${ID.leverA}`);
  ok('/o/<verzonnen kenmerk>/f/<beeld van A>: geweigerd', fout.status !== 200, `status ${fout.status}`);
}
for (const [velden, zaad] of [[{ action: 'approve', file: String(ID.leverA) }, OPEN], [{ action: 'undo', file: String(ID.leverA) }, { ...OPEN, leverStand: 'approved' }], [{ action: 'approve-all' }, OPEN], [{ action: 'round', bad: String(ID.leverA), note: 'de knoop klopt niet' }, OPEN]]) {
  {
    const db = await zaai(zaad); const env = omgeving(db, emmer());
    const voorA = JSON.stringify(db.prepare('SELECT * FROM files WHERE order_id = ?').all(ID.orderA));
    await portalPost(ctx(new Request(`https://visuails.com/o/${portaalA}`, { method: 'POST', body: new URLSearchParams(velden), headers: kop(null, { 'content-type': 'application/x-www-form-urlencoded' }) }), env));
    const naA = JSON.stringify(db.prepare('SELECT * FROM files WHERE order_id = ?').all(ID.orderA));
    ok(`/o/<A> POST ${velden.action}: voor A werkt het (controle)`, voorA !== naA, 'ook voor de eigenaar veranderde niets');
  }
  const db = await zaai(zaad); const bucket = emmer(); const env = omgeving(db, bucket);
  const voorA = JSON.stringify(db.prepare('SELECT * FROM files WHERE order_id = ?').all(ID.orderA));
  const res = await portalPost(ctx(new Request(`https://visuails.com/o/${portaalB}`, { method: 'POST', body: new URLSearchParams(velden), headers: kop(null, { 'content-type': 'application/x-www-form-urlencoded' }) }), env));
  const naA = JSON.stringify(db.prepare('SELECT * FROM files WHERE order_id = ?').all(ID.orderA));
  ok(`/o/<B> POST ${Object.entries(velden).map(([k, v]) => `${k}=${v}`).join('&').slice(0, 40)}: de beelden van A onveranderd`, voorA === naA, 'een beeld van A is veranderd');
  ok(`/o/<B> POST ${velden.action}: niets van A in het antwoord`, spoorIn(await tekst(res)).length === 0, '');
}

/* ── 5. de open routes: zonder inlog, met het e-mailadres van A ─────────── */
/* Zonder account bestellen en een abonnement afsluiten kan iedereen; de klant is dan het
   e-mailadres dat iemand intypt. Sinds 19 oktober 2026 (Lucas: "dicht de gaten") kan dat
   alleen nog een NIEUWE klant maken. Bij een bestaande klant verandert er niets, gelden
   zijn opgeslagen adres, eigen look en eigen gezicht niet, en zegt /api/plan altijd
   hetzelfde ("log eerst in"), of hij nu een abonnement heeft of niet. */
console.log('\n5 · zonder inlog, met het e-mailadres van A');
const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
const { onRequestPost: abonnementPost } = await import('../functions/api/plan.js');
async function zaaiProfiel(db) {
  db.prepare(`UPDATE customers SET country = 'DE', billing_address = 'Musterweg 7\n10115 Berlin', address_line1 = 'Musterweg 7',
    postal_code = '10115', city = 'Berlin', phone = NULL, website = NULL, reg_number = NULL, vat_number = NULL WHERE id = ?`).run(A.id);
}
const BESTELLING = {
  service: 'catalog', mode: 'json', lang: 'nl', email: A.email, first_name: 'Vreemde', last_name: 'Ander',
  phone: '+31 6 99999999', website: 'https://vreemd.test', brand: 'VREEMD', products: '3',
  business_declaration: 'yes', business_version: 'business-v2-2026-09', no_vat: '1', reg_number: '12345678',
  style: `cs-${ID.stijlA}`, model: `c${ID.modelA}`,
};
const bestel = (env, velden, sessieKlant = null) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  return bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: kop(null) }), env, waitUntil() {}, sessieKlant });
};
const klantRij = (db, id) => JSON.stringify(db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
const laatste = (db) => db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
{
  /* zonder sessie */
  const db = await zaai(); await zaaiProfiel(db); const env = omgeving(db, emmer());
  const voorKlant = klantRij(db, A.id); const voorAantal = db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
  const res = await bestel(env, BESTELLING);
  const o = laatste(db); const nieuw = db.prepare('SELECT COUNT(*) AS n FROM orders').get().n > voorAantal;
  ok('/api/order met A\'s adres, zonder sessie: de bestelling komt binnen (controle)', nieuw, `status ${res.status} ${await tekst(res)}`.slice(0, 120));
  ok('  het profiel van A is precies gelijk (ook zijn lege velden)', klantRij(db, A.id) === voorKlant, klantRij(db, A.id));
  const d = nieuw ? JSON.parse(o.details_json || '{}') : {};
  gelijk('  zonder de eigen look van A', [d.style || '', d.own_style_id ?? null], ['', null]);
  ok('  zonder het eigen gezicht van A', !/^c\d+$/.test(String(d.model || '')), `model=${d.model}`);
  ok('  zonder het opgeslagen adres van A', nieuw && !/Musterweg|Berlin|10115/.test(JSON.stringify(o)), JSON.stringify(o).match(/Musterweg|Berlin|10115/)?.[0] || '');
  ok('  het antwoord noemt niets van A', spoorIn(await tekst(res)).filter((x) => x !== A.email).length === 0, '');
}
{
  /* de controle: dezelfde bestelling met de sessie van A (zo bestelt Studio, via /account/order) */
  const db = await zaai(); await zaaiProfiel(db); const env = omgeving(db, emmer());
  const res = await bestel(env, { ...BESTELLING, first_name: 'Mara', last_name: 'Visser' }, { customer_id: A.id, email: A.email });
  const o = laatste(db); const d = JSON.parse(o?.details_json || '{}');
  gelijk('controle: met de sessie van A geldt zijn eigen look', [d.style, d.own_style_id], [`cs-${ID.stijlA}`, ID.stijlA]);
  gelijk('  en zijn eigen gezicht', d.model, `c${ID.modelA}`);
  gelijk('  en vult zijn lege velden (de regel voor wie ingelogd is)', db.prepare('SELECT reg_number FROM customers WHERE id = ?').get(A.id).reg_number, '12345678');
  gelijk('  en gebruikt zijn opgeslagen land', o?.country ?? JSON.parse(o?.details_json || '{}').country ?? null, 'DE');
  void res;
}
{
  /* /api/plan: drie standen van A, één antwoord */
  const PLAN = {
    lang: 'nl', email: A.email, first_name: 'Vreemde', last_name: 'Ander', phone: '+31 6 99999999', brand: 'VREEMD',
    country: 'NL', address_line1: 'Verzonnenweg 1', postal_code: '0000 AA', city: 'Nergenshuizen', reg_number: '12345678',
    plan: 'studio', term: 'monthly', business_declaration: 'yes', business_version: 'business-v2-2026-09',
  };
  const abonneer = (env, velden) => {
    const fd = new FormData(); for (const [k, v] of Object.entries(velden)) fd.append(k, v);
    return abonnementPost({ request: new Request('https://visuails.com/api/plan', { method: 'POST', body: fd, headers: kop(null) }), env, waitUntil() {} });
  };
  const antwoorden = [];
  for (const [stand, sql] of [
    ['met een lopend abonnement', null],
    ['zonder abonnement', `DELETE FROM subscription_invoices; DELETE FROM subscriptions;`],
    ['met een onbetaald abonnement van een uur oud', `DELETE FROM subscription_invoices; UPDATE subscriptions SET status = 'pending', started_at = NULL, created_at = datetime('now', '-1 hour')`],
  ]) {
    const db = await zaai(); if (sql) db.exec(sql); const env = omgeving(db, emmer());
    const voor = foto(db); mollie = [];
    const res = await abonneer(env, PLAN);
    antwoorden.push(`${res.status} ${res.headers.get('location')}`);
    ok(`/api/plan met A's adres, ${stand}: niets veranderd`, verschil(voor, foto(db)).length === 0, verschil(voor, foto(db)).join(', '));
    ok(`  en niets naar Mollie`, mollie.length === 0, `${mollie.length} verzoeken`);
  }
  ok('/api/plan geeft in alle drie de standen hetzelfde antwoord: log eerst in', new Set(antwoorden).size === 1 && /fout=account/.test(antwoorden[0]), antwoorden.join(' | '));
  /* de controle: een nieuw adres gaat gewoon door */
  const db = await zaai(); const env = omgeving(db, emmer()); mollie = [];
  const res = await abonneer(env, { ...PLAN, email: 'nieuw@nog-geen-klant.test' });
  const nieuweKlant = db.prepare("SELECT id FROM customers WHERE email = 'nieuw@nog-geen-klant.test'").get();
  ok('controle: een nieuw adres wordt een klant en gaat door naar de betaling', !!nieuweKlant && (mollie.length > 0 || res.status === 200), `status ${res.status} ${res.headers.get('location') || ''} · Mollie ${mollie.length}`);
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
