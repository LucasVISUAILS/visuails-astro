/*
 * VISUAILS — de back-end sterker (beveiligingsronde van 5 november 2026)
 *   npm run test:backend
 *
 * Elk blok hoort bij een stap in kladblok/PLAN-BEVEILIGING.md §4 en was op de code
 * van vóór die stap rood. Het vangnet voor wat niet kapot mag, staat apart in
 * tests/vangnet-beveiliging.test.mjs.
 *
 *   1 · de grens van D1: hoogstens 100 gebonden waarden per query. De nep-D1 dwingt
 *       hem hier af (`d1(db, { maxWaarden: 100 })`), zoals D1 live doet.
 */
import { verseDb, d1 } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { ordersExtra } from '../src/lib/account.js';
import { portalPost } from '../src/lib/portal.js';
import { formatenVoorOrders } from '../src/lib/formaten.js';
import { mintToken } from '../src/lib/token.js';
import { hashToken } from '../src/lib/token.js';
import { hashPassword } from '../src/lib/adminAuth.js';
import { rijenPerGroep, inGroepen, plaatsen, GROEP, D1_MAX_WAARDEN } from '../src/lib/d1Lijst.js';

let pass = 0; let fail = 0;
const ok = (naam, goed, uitleg = '') => {
  if (typeof goed !== 'boolean') throw new Error(`ok("${naam}") kreeg geen boolean`);
  if (goed) pass++; else fail++;
  console.log(`${goed ? ' ok  ' : ' FAIL'} ${String(naam).padEnd(86)} ${goed ? '' : uitleg}`);
};
let ip = 0;
const nieuwIp = () => `10.7.${Math.floor(++ip / 250)}.${ip % 250}`;
const schema = new URL('../schema.sql', import.meta.url);

async function adminSessie(db) {
  db.prepare('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)').run('lucas@visuails.com', await hashPassword('een-wachtwoord-voor-de-toets'));
  const token = 'admin-sessie-backend-sterker-0001-abcdefghijklmnop';
  db.prepare("INSERT INTO admin_sessions (admin_id, token_hash, expires_at, totp_pending) VALUES (1, ?, datetime('now', '+1 day'), 0)").run(await hashToken(token));
  return token;
}

/* ══ 1 · DE GRENS VAN 100 GEBONDEN WAARDEN ═════════════════════════════════ */
console.log('\n1 · de grens van D1: hoogstens 100 gebonden waarden per query');
{
  /* Het hulpje zelf. */
  ok('de groep laat ruimte onder de grens van D1', GROEP < D1_MAX_WAARDEN);
  ok('inGroepen: 200 waarden worden 80, 80 en 40', JSON.stringify(inGroepen(Array.from({ length: 200 }, (_, i) => i)).map((g) => g.length)) === '[80,80,40]');
  ok('plaatsen: vanaf een gegeven nummer', plaatsen(3, 4) === '?4, ?5, ?6');
  {
    const { db } = verseDb(schema);
    const D = d1(db, { maxWaarden: 100 });
    for (let i = 1; i <= 250; i++) db.prepare("INSERT INTO customers (id, email, name, country) VALUES (?, ?, 'x', 'NL')").run(i, `k${i}@x.test`);
    const ids = Array.from({ length: 250 }, (_, i) => i + 1);
    let mis = '';
    try { await D.prepare(`SELECT id FROM customers WHERE id IN (${plaatsen(ids.length)})`).bind(...ids).all(); } catch (e) { mis = e.message; }
    ok('de nep-D1 weigert, net als D1, een query met 250 waarden', /too many SQL variables/.test(mis), mis || 'geen fout');
    const rijen = await rijenPerGroep(ids, (deel) => D.prepare(`SELECT id FROM customers WHERE id IN (${plaatsen(deel.length)})`).bind(...deel).all());
    ok('rijenPerGroep haalt ze alle 250 op, in drie groepen', rijen.length === 250);
  }

  /* Het dashboard van /admin met 200 bestellingen van 150 verschillende klanten. */
  const { db } = verseDb(schema);
  const token = await adminSessie(db);
  for (let k = 1; k <= 150; k++) db.prepare("INSERT INTO customers (id, email, name, brand, country) VALUES (?, ?, ?, ?, 'NL')").run(k, `klant${k}@merk${k}.test`, `Klant ${k}`, `MERK${k}`);
  for (let i = 1; i <= 200; i++) {
    const k = ((i - 1) % 150) + 1;
    db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status)
      VALUES (?, ?, ?, 'catalog', 'received', ?, ?, ?, 35600, 'nl', datetime('now', ?), 'attended', 4, 'paid')`).run(i, `VIS-GRENS-${String(i).padStart(3, '0')}`, k, `Klant ${k}`, `MERK${k}`, `klant${k}@merk${k}.test`, `-${i} minutes`);
  }
  /* Een teruggeboekte betaling en een adres waar de mail niet aankwam, bij een klant ver na de honderdste. */
  db.prepare("UPDATE orders SET teruggeboekt_at = '2026-11-04 10:00' WHERE id = 140").run();
  db.prepare("INSERT INTO mail_bounces (event_id, email, kind, bounce_type, occurred_at) VALUES ('evt_grens_1', 'klant135@merk135.test', 'bounced', 'Permanent', '2026-11-04 09:00')").run();
  db.prepare("INSERT INTO custom_models (customer_id, label, status) VALUES (145, 'Gezicht van merk 145', 'approved')").run();
  const env = { DB: d1(db, { maxWaarden: 100 }) };
  let res; let fout = '';
  try {
    res = await adminGet({ request: new Request('https://visuails.com/admin', { headers: { cookie: `vis_admin=${token}`, 'cf-connecting-ip': nieuwIp() } }), env, waitUntil() {} });
  } catch (e) { fout = e.message; }
  ok('/admin met 200 bestellingen van 150 klanten opent (geen 500)', !fout && res?.status === 200, fout || `status ${res?.status}`);
  const html = res && !fout ? await res.text() : '';
  ok('  en de rode pil "teruggeboekt" staat bij de bestelling van klant 140', html.includes('Betaling teruggeboekt — niet leveren'));
  ok('  en de markering "mail kwam niet aan" bij klant 135', html.includes('klant135@merk135.test kwam niet aan'));
}

/* ── 1b · de andere plekken met een lange lijst ────────────────────────────── */
console.log('\n1b · de andere plekken met een lange lijst');
{
  /* Mail naar de studio: opvangen in plaats van versturen. */
  const mails = [];
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('api.resend.com')) { mails.push(JSON.parse(init.body)); return new Response(JSON.stringify({ id: 'proef' }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    return new Response('{}', { status: 404 });
  };
  try {
    /* Studio: de tevredenheid bij 120 afgeronde bestellingen. */
    const { db } = verseDb(schema);
    db.prepare("INSERT INTO customers (id, email, name, country) VALUES (1, 'groot@merk.test', 'Groot', 'NL')").run();
    const orders = [];
    for (let i = 1; i <= 120; i++) {
      db.prepare("INSERT INTO orders (id, ref, customer_id, service, status, email, total_cents, lang, closed_at) VALUES (?, ?, 1, 'catalog', 'delivered', 'groot@merk.test', 100, 'nl', '2026-10-01')").run(i, `VIS-FB-${i}`);
      db.prepare('INSERT INTO order_feedback (order_id, customer_id, score) VALUES (?, 1, 5)').run(i);
      orders.push({ id: i, closed_at: '2026-10-01' });
    }
    const fb = await ordersExtra({ DB: d1(db, { maxWaarden: 100 }) }, orders);
    ok('Studio: de tevredenheid van alle 120 afgeronde bestellingen komt terug', fb.size === 120, `${fb.size}`);
    /* Formaten: verzoeken bij 150 bestellingen. */
    for (let i = 1; i <= 120; i++) db.prepare("INSERT INTO formaat_verzoeken (order_id, formaat) VALUES (?, 'png')").run(i);
    const fm = await formatenVoorOrders({ DB: d1(db, { maxWaarden: 100 }) }, orders.map((o) => o.id));
    ok('Formaten: de verzoeken van alle 120 bestellingen komen terug', fm.size === 120, `${fm.size}`);
  } catch (e) { ok('Studio en Formaten zonder fout', false, e.message); }

  try {
    /* De privélink: een levering van 110 beelden, alle 110 aangevinkt als "niet goed". */
    const { db } = verseDb(schema);
    db.prepare("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'groot@merk.test', 'Groot', 'GROOT', 'NL')").run();
    db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, delivered_at, delivery_mailed_at)
      VALUES (1, 'VIS-GROOT-110', 1, 'catalog', 'delivered', 'Groot', 'GROOT', 'groot@merk.test', 100, 'nl', '2026-10-01', 'attended', 20, 'paid', '2026-11-01', '2026-11-01 09:00')`).run();
    for (let i = 1; i <= 110; i++) {
      db.prepare("INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot) VALUES (?, 1, 'delivery', ?, ?, 1200, 'pending', ?, 'front')").run(i, `leveringen/groot/${i}.jpg`, `groot-${i}.jpg`, `p${i}`);
    }
    const kenmerk = await mintToken();
    db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (1, ?)').run(await hashToken(kenmerk));
    const form = new URLSearchParams({ action: 'round', note: 'De kleur klopt niet, bij alle beelden.' });
    for (let i = 1; i <= 110; i++) form.append('bad', String(i));
    const env = { DB: d1(db, { maxWaarden: 100 }), RESEND_API_KEY: 're_proef', NOTIFY_EMAIL: 'studio@visuails.test', FROM_EMAIL: 'VISUAILS <orders@visuails.test>' };
    mails.length = 0;
    const res = await portalPost({ request: new Request(`https://visuails.com/o/${kenmerk}`, { method: 'POST', headers: { 'sec-fetch-site': 'same-origin', origin: 'https://visuails.com', 'cf-connecting-ip': nieuwIp() }, body: form }), env, waitUntil() {} });
    const rondes = db.prepare('SELECT COUNT(*) AS n FROM revision_requests').get().n;
    ok('de privélink: een ronde met 110 aangevinkte beelden komt aan (110 regels)', rondes === 110, `status ${res.status} ${res.headers.get('location') || ''}, ${rondes} regels`);
    const mail = mails.find((m) => /Revisieronde/.test(m.subject || ''));
    ok('  en de mail aan de studio noemt ook het 105e beeld bij naam', !!mail && /Product 105 · /.test(mail.html || '') && !/bestand 105\b/.test(mail.html || ''), mail ? mail.subject : 'geen mail');
  } catch (e) { ok('de privélink zonder fout', false, e.message); }
  globalThis.fetch = echteFetch;

  try {
    /* Een klant met 120 bestellingen wissen (de controle vooraf op facturen). */
    const { db } = verseDb(schema);
    const token = await adminSessie(db);
    db.prepare("INSERT INTO customers (id, email, name, brand, country) VALUES (9, 'weg@merk.test', 'Weg', 'WEGMERK', 'NL')").run();
    for (let i = 1; i <= 120; i++) db.prepare("INSERT INTO orders (id, ref, customer_id, service, status, email, total_cents, lang) VALUES (?, ?, 9, 'catalog', 'cancelled', 'weg@merk.test', 0, 'nl')").run(i, `VIS-WEG-${i}`);
    const env = { DB: d1(db, { maxWaarden: 100 }), UPLOADS: { async delete() {}, async list() { return { objects: [], truncated: false }; } } };
    const res = await adminPost({ request: new Request('https://visuails.com/admin/customers/9/wipe', { method: 'POST', headers: { cookie: `vis_admin=${token}`, 'sec-fetch-site': 'same-origin', origin: 'https://visuails.com', 'cf-connecting-ip': nieuwIp() }, body: new URLSearchParams({ confirm: 'WEGMERK' }) }), env, waitUntil() {} });
    const over = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE customer_id = 9').get().n;
    ok('/admin: een klant met 120 bestellingen is te wissen', res.status < 500 && over === 0, `status ${res.status}, nog ${over} bestellingen`);
  } catch (e) { ok('wissen zonder fout', false, e.message); }

  try {
    /* De nachtelijke opruiming met 150 verlopen bestanden (PURGE_LIMIT is 400). */
    const { tasks } = await import('../cron/index.js');
    const { db } = verseDb(schema);
    db.prepare("INSERT INTO orders (id, ref, email, service, status, lang, closed_at) VALUES (1, 'VIS-OUD-1', 'oud@merk.test', 'catalog', 'delivered', 'nl', datetime('now', '-100 days'))").run();
    for (let i = 1; i <= 150; i++) {
      db.prepare("INSERT INTO files (id, order_id, kind, r2_key, filename, bytes) VALUES (?, 1, 'upload', ?, 'foto.jpg', 10)").run(i, `intake/oud/${i}.jpg`);
      db.prepare("INSERT INTO file_assets (file_id, format, r2_key) VALUES (?, 'webp', ?)").run(i, `intake/oud/${i}.webp`);
    }
    const weg = [];
    const UPLOADS = { async delete(k) { for (const x of [].concat(k)) weg.push(x); } };
    const regel = await tasks.purgeExpiredFiles({ DB: d1(db, { maxWaarden: 100 }), UPLOADS, PURGE_ENABLED: 'true' });
    const over = db.prepare('SELECT COUNT(*) AS n FROM files').get().n;
    ok('de nachtelijke opruiming: 150 verlopen bestanden gaan weg', over === 0, `nog ${over} rijen; ${String(regel).slice(0, 120)}`);
    ok('  met hun webp-variant uit R2', weg.includes('intake/oud/150.webp') && weg.includes('intake/oud/1.webp'), `${weg.length} objecten weg`);
  } catch (e) { ok('de opruiming zonder fout', false, e.message); }
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
