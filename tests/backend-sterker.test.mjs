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
 *   2 · Studio: "Gegevens opslaan" met een leeg KvK-veld, en `?ok=`, `?fout=` en `?ronde=`
 *       met een woord als `constructor` (Je plan liep daarop vast).
 *  14 · de betaalwebhook: een aflevering die halverwege stopt (D1 hapert tussen de
 *       betaalrij en de UPDATE naar betaald) mag een bestelling niet onbetaald laten.
 *  15 · een mislukte incasso die twee keer wordt afgeleverd, geeft één mail.
 *       (Stap 16, de 429 en 401 van Mollie, staat in tests/mollie-webhook.test.mjs.)
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

/* ══ 2 · STUDIO: EEN LEEG KVK-VELD, EN WOORDEN UIT DE ADRESBALK ══════════════ */
console.log('\n2 · Studio: een leeg KvK-veld, en woorden uit de adresbalk');
{
  const { studioScreen, accountPost } = await import('../src/lib/account.js');
  const { db } = verseDb(schema);
  db.prepare("INSERT INTO customers (id, email, brand, country, reg_number) VALUES (7, 'mara@voltbrand.test', 'VOLT', 'NL', '12345678')").run();
  db.prepare("INSERT INTO subscriptions (id, customer_id, ref, plan, status, term, started_at) VALUES (1, 7, 'VIS-ABO-1', 'studio', 'active', 'monthly', datetime('now', '-40 days'))").run();
  const sessie = 'sessie-van-mara-backend-sterker-stap-2-abcdefgh';
  db.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (7, ?, datetime('now', '+30 days'))").run(await hashToken(sessie));
  const env = { DB: d1(db) };
  const ck = `vis_account=${sessie}; vis_lang=nl`;
  const stilErr = console.error; console.error = () => {};
  try {
    const r = await accountPost({ request: new Request('https://visuails.com/account/details', { method: 'POST', headers: { cookie: ck, origin: 'https://visuails.com', 'sec-fetch-site': 'same-origin', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ brand: 'VOLT', reg_number: '' }).toString() }), env, waitUntil() {} });
    const kvk = db.prepare('SELECT reg_number FROM customers WHERE id = 7').get().reg_number;
    ok('Gegevens opslaan met een leeg KvK-veld: opgeslagen, het veld leeg', r.status === 303 && kvk === null, `status ${r.status}, reg_number ${JSON.stringify(kvk)}`);
  } catch (e) { ok('Gegevens opslaan met een leeg KvK-veld zonder fout', false, e.message); }
  const scherm = async (sectie, q) => {
    try {
      const r = await studioScreen({ request: new Request(`https://visuails.com/account/${sectie}?${q}`, { headers: { cookie: ck } }), env, waitUntil() {} }, sectie);
      return r instanceof Response ? { fout: `Response ${r.status}` } : r.v;
    } catch (e) { return { fout: e.message }; }
  };
  for (const q of ['ok=constructor', 'ok=hasOwnProperty', 'fout=__proto__', 'fout=overstap-constructor', 'fout=bijkoop-constructor']) {
    const v = await scherm('plan', q);
    ok(`Je plan met ?${q}: opent, met tekst en niets van JavaScript zelf`, !v.fout && typeof v.melding === 'string' && typeof v.bevestiging === 'string', v.fout || `melding ${typeof v.melding}, bevestiging ${typeof v.bevestiging}`);
  }
  const goed = await scherm('plan', 'ok=opgezegd');
  ok('  en een echt woord (?ok=opgezegd) werkt nog', !goed.fout, goed.fout || '');
  const ronde = await scherm('orders', 'ronde=valueOf');
  ok('Bestellingen met ?ronde=valueOf: geen functie als melding', !ronde.fout && ronde.rondeTekst === '', ronde.fout || typeof ronde.rondeTekst);
  const verstuurd = await scherm('orders', 'ronde=verstuurd');
  ok('  en ?ronde=verstuurd geeft nog de bevestiging', !verstuurd.fout && typeof verstuurd.rondeTekst === 'string' && verstuurd.rondeTekst.length > 0, verstuurd.fout || JSON.stringify(verstuurd.rondeTekst));
  console.error = stilErr;
}

/* ══ 14 · DE BETAALWEBHOOK: EEN BETAALDE BESTELLING MAG NIET ONBETAALD BLIJVEN ══ */
console.log('\n14 · de betaalwebhook: een aflevering die halverwege stopt');
{
  const { onRequestPost: mollieWebhook } = await import('../functions/api/webhook/mollie.js');
  /* Een D1 die één keer hapert op het statement dat op `patroon` past. */
  const metStoring = (D, patroon, keer = 1) => {
    let over = keer;
    const wrap = (st) => ({
      ...st,
      bind: (...a) => wrap(st.bind(...a)),
      async run() { if (over > 0) { over--; throw new Error('D1_ERROR: storing (toets)'); } return st.run(); },
    });
    return { ...D, prepare: (sql) => (patroon.test(sql) ? wrap(D.prepare(sql)) : D.prepare(sql)) };
  };
  const BETAALID = 'tr_StapVeertienProef01';
  const mollieMails = [];
  const echteFetch2 = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes(`/v2/payments/${BETAALID}`) && !/refunds/.test(u)) {
      return new Response(JSON.stringify({
        resource: 'payment', id: BETAALID, mode: 'live', status: 'paid', paidAt: '2026-11-05T10:00:00+00:00',
        amount: { value: '121.00', currency: 'EUR' }, method: 'ideal', metadata: { order_ref: 'VIS-BETAAL-14' },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (u.includes('api.resend.com')) { mollieMails.push(JSON.parse(String(init.body || '{}'))); return new Response('{"id":"m"}', { status: 200 }); }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const stil = [console.log, console.warn, console.error];
  const aflevering = (env) => mollieWebhook({
    request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `id=${BETAALID}` }),
    env, waitUntil() {},
  });
  const nieuweBestelling = () => {
    const { db } = verseDb(schema);
    db.prepare("INSERT INTO customers (id, email, name, country) VALUES (3, 'betaal@merk.test', 'Betaal', 'NL')").run();
    db.prepare("INSERT INTO orders (id, ref, customer_id, email, service, status, payment_status, total_cents, vat_cents, lang) VALUES (3, 'VIS-BETAAL-14', 3, 'betaal@merk.test', 'catalog', 'received', 'unpaid', 10000, 2100, 'nl')").run();
    return db;
  };
  const basis = { MOLLIE_API_KEY: 'live_proefsleutelvoordetoetsabcdef', RESEND_API_KEY: 're_proef', NOTIFY_EMAIL: 'studio@visuails.test', FROM_EMAIL: 'VISUAILS <orders@visuails.test>', PUBLIC_ORIGIN: 'https://visuails.com' };
  const studioBetaald = () => mollieMails.filter((m) => /^Betaald · VIS-BETAAL-14/.test(m.subject || '')).length;
  const betaalRegels = (db) => db.prepare("SELECT COUNT(*) AS n FROM order_events WHERE order_id = 3 AND note LIKE 'Betaling ontvangen%'").get().n;
  try {
    console.log = console.warn = console.error = () => {};
    /* a · D1 hapert op de UPDATE die de bestelling op betaald zet. */
    let db = nieuweBestelling();
    const eerste = await aflevering({ ...basis, DB: metStoring(d1(db), /UPDATE orders SET payment_status = 'paid'/) });
    const tweede = await aflevering({ ...basis, DB: d1(db) });
    const na = db.prepare('SELECT payment_status, paid_at FROM orders WHERE id = 3').get();
    const mailsNaTweede = studioBetaald();
    const derde = await aflevering({ ...basis, DB: d1(db) });
    Object.assign(console, { log: stil[0], warn: stil[1], error: stil[2] });
    ok('a · de eerste aflevering vraagt om een herhaling (500)', eerste.status === 500, `status ${eerste.status}`);
    ok('  de herhaling zet de bestelling alsnog op betaald', tweede.status === 200 && na.payment_status === 'paid' && !!na.paid_at, `status ${tweede.status}, ${JSON.stringify(na)}`);
    ok('  met de regel op de tijdlijn en het bericht aan de studio', betaalRegels(db) === 1 && mailsNaTweede === 1, `${betaalRegels(db)} regels, ${mailsNaTweede} berichten`);
    ok('  een echte dubbele aflevering daarna doet niets twee keer', derde.status === 200 && betaalRegels(db) === 1 && studioBetaald() === 1, `${betaalRegels(db)} regels, ${studioBetaald()} berichten`);

    /* b · D1 hapert op de tijdlijnregel "Betaling ontvangen", ná de UPDATE. */
    console.log = console.warn = console.error = () => {};
    mollieMails.length = 0;
    db = nieuweBestelling();
    const b1 = await aflevering({ ...basis, DB: metStoring(d1(db), /INSERT INTO order_events/) });
    const b2 = await aflevering({ ...basis, DB: d1(db) });
    Object.assign(console, { log: stil[0], warn: stil[1], error: stil[2] });
    const nb = db.prepare('SELECT payment_status FROM orders WHERE id = 3').get();
    ok('b · een mislukte tijdlijnregel houdt het bericht aan de studio niet tegen', nb.payment_status === 'paid' && studioBetaald() === 1, `eerste ${b1.status}, tweede ${b2.status}, ${nb.payment_status}, ${studioBetaald()} berichten`);
  } catch (e) {
    Object.assign(console, { log: stil[0], warn: stil[1], error: stil[2] });
    ok('de betaalwebhook zonder fout', false, e.stack || e.message);
  }
  globalThis.fetch = echteFetch2;
}

/* ══ 15 · EEN MISLUKTE INCASSO, TWEE KEER AFGELEVERD ══════════════════════ */
console.log('\n15 · een mislukte incasso die Mollie twee keer aflevert');
{
  const { onRequestPost: mollieWebhook } = await import('../functions/api/webhook/mollie.js');
  const mails = [];
  const echteFetch3 = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('api.resend.com')) { mails.push(JSON.parse(String(init.body || '{}'))); return new Response('{"id":"m"}', { status: 200 }); }
    if (u.includes('/subscriptions/')) return new Response(JSON.stringify({ resource: 'subscription', id: 'sub_ProefVijftien', status: 'active' }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({
      resource: 'payment', id: 'tr_ProefVijftien01', mode: 'test', status: 'failed', failedAt: '2026-11-05T03:00:41+00:00',
      amount: { value: '390.00', currency: 'EUR' }, method: 'directdebit', sequenceType: 'recurring',
      subscriptionId: 'sub_ProefVijftien', customerId: 'cst_ProefVijftien',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  /* De rij bestaat na de eerste aflevering: de tweede INSERT zet niets, zoals D1 met ON CONFLICT DO NOTHING. */
  let rijen = 0;
  const DB = {
    prepare(sql) {
      const st = {
        bind() { return st; },
        async first() { return /FROM subscriptions/.test(sql) ? { id: 42, ref: 'VIS-ABO-15', plan: 'studio', status: 'active', mollie_customer_id: 'cst_ProefVijftien', mollie_subscription_id: 'sub_ProefVijftien', email: 'abo@merk.test', brand: 'Abo', name: 'Abo' } : null; },
        async all() { return { results: [] }; },
        async run() { if (/INSERT INTO subscription_payments/.test(sql)) return { success: true, meta: { changes: rijen++ === 0 ? 1 : 0 } }; return { success: true, meta: { changes: 1 } }; },
      };
      return st;
    },
    async batch(l) { return l.map(() => ({ success: true, meta: { changes: 1 } })); },
  };
  const env = { MOLLIE_API_KEY: 'test_proefsleutelvoordetoetsabcdef', RESEND_API_KEY: 're_proef', NOTIFY_EMAIL: 'studio@visuails.test', FROM_EMAIL: 'VISUAILS <orders@visuails.test>', DB };
  const aflevering = () => mollieWebhook({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'id=tr_ProefVijftien01' }), env, waitUntil() {} });
  const stil = [console.log, console.warn, console.error];
  console.log = console.warn = console.error = () => {};
  const r1 = await aflevering(); const na1 = mails.length;
  const r2 = await aflevering(); const na2 = mails.length;
  Object.assign(console, { log: stil[0], warn: stil[1], error: stil[2] });
  ok('de eerste aflevering meldt de mislukte incasso', r1.status === 200 && na1 >= 1, `status ${r1.status}, ${na1} mails`);
  ok('  de tweede aflevering van dezelfde melding stuurt geen tweede mail', r2.status === 200 && na2 === na1, `status ${r2.status}, ${na2 - na1} extra mails`);
  globalThis.fetch = echteFetch3;
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
