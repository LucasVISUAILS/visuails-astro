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
 *   3 · Studio: het e-mailadres wijzigen. Wie een sessie stal, mag het terugzetten door de
 *       eigenaar niet kunnen omzeilen (een tweede wijziging die klaarstaat, of de
 *       terugzetlink van die tweede wijziging in zijn eigen postvak).
 *   4 · Studio: de inlogcode. Naast de grens per kwartier een grens per dag op hetzelfde
 *       account, zodat raden niet de hele dag door kan.
 *   5 · de privélink: terugdraaien heropent een afgeronde bestelling alleen binnen het
 *       venster, zoals in Studio (ook met een link die /admin opnieuw uitgaf).
 *   6 · een oud bestand met een onbekende extensie gaat niet met een willekeurig
 *       opgeslagen type (text/html) de deur uit, in de privélink en in Studio.
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

/* ══ 3 · STUDIO: HET E-MAILADRES WIJZIGEN EN TERUGZETTEN ════════════════════ */
console.log('\n3 · Studio: het e-mailadres wijzigen, en het terugzetten dat niet te omzeilen is');
{
  const { accountGet, accountPost } = await import('../src/lib/account.js');
  const O = 'https://visuails.com';
  const opzet = async () => {
    const { db } = verseDb(schema);
    db.prepare("INSERT INTO customers (id, email, brand, country) VALUES (7, 'eigenaar@merk.test', 'MERK', 'NL')").run();
    db.prepare("INSERT INTO orders (id, ref, customer_id, email, service, status, lang) VALUES (1, 'VIS-LOOP-1', 7, 'eigenaar@merk.test', 'catalog', 'received', 'nl')").run();
    const sessie = 'een-gestolen-sessie-van-klant-7-backend-sterker-0003';
    db.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (7, ?, datetime('now', '+30 days'))").run(await hashToken(sessie));
    return { db, env: { DB: d1(db) }, ck: `vis_account=${sessie}; vis_lang=nl` };
  };
  const kop = (extra = {}) => ({ origin: O, 'sec-fetch-site': 'same-origin', 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': nieuwIp(), ...extra });
  const vraag = ({ env, ck }, nieuw) => accountPost({ request: new Request(`${O}/account/email`, { method: 'POST', headers: kop({ cookie: ck }), body: new URLSearchParams({ new_email: nieuw }).toString() }), env, waitUntil() {} });
  /* Het kenmerk uit de mail: de database bewaart alleen de hash, dus de toets zet een bekend kenmerk in de rij. */
  const kenmerk = async (db, nieuw, kolom) => {
    const k = await mintToken();
    const rij = db.prepare('SELECT id FROM email_changes WHERE new_email = ? ORDER BY id DESC LIMIT 1').get(nieuw);
    if (kolom === 'confirm') db.prepare("UPDATE email_changes SET confirm_hash = ?, confirm_expires = ? WHERE id = ?").run(await hashToken(k), new Date(Date.now() + 3600e3).toISOString(), rij.id);
    else db.prepare("UPDATE email_changes SET undo_hash = ?, undo_expires = ? WHERE id = ?").run(await hashToken(k), new Date(Date.now() + 14 * 864e5).toISOString(), rij.id);
    return k;
  };
  const klik = ({ env }, k) => accountGet({ request: new Request(`${O}/account/email/${k}`, { headers: { cookie: 'vis_lang=nl' } }), env, waitUntil() {} });
  const terug = ({ env }, k) => accountPost({ request: new Request(`${O}/account/email/undo/${k}`, { method: 'POST', headers: kop({ cookie: 'vis_lang=nl' }), body: '' }), env, waitUntil() {} });
  const adres = ({ db }) => db.prepare('SELECT email FROM customers WHERE id = 7').get().email;
  const stilErr = console.error; console.error = () => {};
  try {
    /* A · de aanvaller zet een tweede wijziging klaar, en bevestigt die pas nadat de eigenaar heeft teruggezet. */
    let w = await opzet();
    await vraag(w, 'x@aanvaller.test'); await klik(w, await kenmerk(w.db, 'x@aanvaller.test', 'confirm'));
    const u1 = await kenmerk(w.db, 'x@aanvaller.test', 'undo');
    await vraag(w, 'y@aanvaller.test'); const c2 = await kenmerk(w.db, 'y@aanvaller.test', 'confirm');
    ok('A · de eerste wijziging gaat door (x@aanvaller)', adres(w) === 'x@aanvaller.test', adres(w));
    await terug(w, u1);
    ok('  de eigenaar zet terug', adres(w) === 'eigenaar@merk.test', adres(w));
    await klik(w, c2);
    ok('  de klaargezette tweede wijziging werkt daarna niet meer', adres(w) === 'eigenaar@merk.test', `het adres is nu ${adres(w)}`);

    /* B · de aanvaller bevestigt de tweede wijziging eerst; de terugzetlink daarvan gaat naar zijn eigen x@. */
    w = await opzet();
    await vraag(w, 'x@aanvaller.test'); await klik(w, await kenmerk(w.db, 'x@aanvaller.test', 'confirm'));
    const b1 = await kenmerk(w.db, 'x@aanvaller.test', 'undo');
    await vraag(w, 'y@aanvaller.test'); await klik(w, await kenmerk(w.db, 'y@aanvaller.test', 'confirm'));
    const b2 = await kenmerk(w.db, 'y@aanvaller.test', 'undo');
    ok('B · twee wijzigingen achter elkaar (nu y@aanvaller)', adres(w) === 'y@aanvaller.test', adres(w));
    await terug(w, b1);
    const orderNa = w.db.prepare('SELECT email FROM orders WHERE id = 1').get().email;
    ok('  de eigenaar zet terug met de link uit zijn eigen postvak', adres(w) === 'eigenaar@merk.test', adres(w));
    ok('  en de lopende bestelling gaat ook terug naar zijn adres', orderNa === 'eigenaar@merk.test', `de bestelling staat op ${orderNa}`);
    await terug(w, b2);
    ok('  de terugzetlink in het postvak van de aanvaller zet het daarna niet meer om', adres(w) === 'eigenaar@merk.test', `het adres is nu ${adres(w)}`);

    /* C · een grens per klant op het aantal wijzigingsmails, ook vanaf steeds een ander IP. */
    w = await opzet();
    for (let i = 1; i <= 7; i++) await vraag(w, `adres${i}@ergens.test`);
    const n = w.db.prepare('SELECT COUNT(*) AS n FROM email_changes WHERE customer_id = 7').get().n;
    ok('C · zeven verzoeken in een uur vanaf zeven IP-adressen: hoogstens vijf mails', n <= 5, `${n} verzoeken vastgelegd`);
    const ipHash = w.db.prepare('SELECT request_ip_hash FROM email_changes ORDER BY id LIMIT 1').get()?.request_ip_hash;
    /* Kaal (zonder zout) is een hash van een IPv4-adres in minuten terug te rekenen: hier
       gewoon alle adressen die deze toets gebruikte. Gezouten mag hij daar niet tussen staan. */
    const kaal = await Promise.all(Array.from({ length: ip + 1 }, (_, i) => hashToken(`ip:10.7.${Math.floor(i / 250)}.${i % 250}`)));
    ok('  en het IP-adres is gezouten opgeslagen, niet als kale hash', !!ipHash && !kaal.includes(ipHash), String(ipHash));
  } catch (e) { ok('het e-mailadres wijzigen zonder fout', false, e.stack || e.message); }
  console.error = stilErr;
}

/* ══ 4 · STUDIO: RADEN NAAR DE INLOGCODE, DE HELE DAG ═══════════════════════ */
console.log('\n4 · Studio: raden naar de inlogcode, de hele dag door');
{
  const { accountPost } = await import('../src/lib/account.js');
  const { db } = verseDb(schema);
  db.prepare("INSERT INTO customers (id, email, brand, country) VALUES (5, 'doel@merk.test', 'DOEL', 'NL')").run();
  const env = { DB: d1(db) };
  /* Een klok die we kunnen verzetten, vanaf 01:00 UTC zodat de toets nooit over middernacht loopt. */
  const EchteDate = Date;
  let verschuiving = EchteDate.UTC(2026, 10, 5, 1, 0, 0) - EchteDate.now();
  globalThis.Date = class extends EchteDate {
    constructor(...a) { super(...(a.length ? a : [EchteDate.now() + verschuiving])); }
    static now() { return EchteDate.now() + verschuiving; }
  };
  /* Een nieuwe code, zoals de aanvaller er een opvraagt (de mail gaat naar het slachtoffer). */
  const nieuweCode = async () => {
    db.prepare('DELETE FROM account_tokens WHERE customer_id = 5').run();
    db.prepare('INSERT INTO account_tokens (customer_id, token_hash, expires_at, code_hash, code_expires_at, code_attempts) VALUES (5, ?, ?, ?, ?, 0)')
      .run(await hashToken(await mintToken()), new Date(Date.now() + 15 * 60e3).toISOString(), await hashToken('5:482913'), new Date(Date.now() + 10 * 60e3).toISOString());
  };
  const gok = (code) => accountPost({ request: new Request('https://visuails.com/account/code', { method: 'POST', headers: { origin: 'https://visuails.com', 'sec-fetch-site': 'same-origin', 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': nieuwIp() }, body: new URLSearchParams({ lang: 'nl', email: 'doel@merk.test', code }).toString() }), env, waitUntil() {} });
  try {
    let geweigerd = 0; let geprobeerd = 0;
    for (let kwartier = 0; kwartier < 4; kwartier++) {
      for (let blok = 0; blok < 3; blok++) {
        await nieuweCode();
        for (let i = 0; i < 5; i++) { geprobeerd++; const r = await gok(String(100000 + geprobeerd)); if (r.status === 429) geweigerd++; }
      }
      verschuiving += 16 * 60e3;
    }
    /* Nu een vers kwartier: de grens per kwartier is leeg. */
    await nieuweCode();
    const daarna = await gok('111111');
    ok(`na ${geprobeerd} foute codes in vier kwartier: een vers kwartier geeft geen nieuwe pogingen`, daarna.status === 429, `status ${daarna.status} (eerder ${geweigerd} geweigerd)`);
    const goed = await gok('482913');
    ok('  ook de goede code niet, zolang de daggrens vol is', goed.status === 429 && !/vis_account=[^;]+;/.test(goed.headers.get('set-cookie') || ''), `status ${goed.status}`);
    verschuiving += 24 * 3600e3;
    await nieuweCode();
    const morgen = await gok('482913');
    ok('  de volgende dag werkt de goede code weer', morgen.status === 303 && /vis_account=/.test(morgen.headers.get('set-cookie') || ''), `status ${morgen.status}`);
  } catch (e) { ok('raden naar de inlogcode zonder fout', false, e.stack || e.message); }
  globalThis.Date = EchteDate;
}

/* ══ 5 · DE PRIVÉLINK: TERUGDRAAIEN NA HET VENSTER ═══════════════════════════ */
console.log('\n5 · de privélink: een afgeronde bestelling na het venster');
{
  const opzet = async (dagenGeleden) => {
    const { db } = verseDb(schema);
    db.prepare("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'oud@merk.test', 'Oud', 'OUD', 'NL')").run();
    db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, delivered_at, closed_at)
      VALUES (1, 'VIS-OUD-5', 1, 'catalog', 'delivered', 'Oud', 'OUD', 'oud@merk.test', 100, 'nl', '2026-01-01', 'attended', 1, 'paid', '2026-01-10', datetime('now', ?))`).run(`-${dagenGeleden} days`);
    db.prepare("INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot, reviewed_at) VALUES (1, 1, 'delivery', 'leveringen/oud/1.jpg', 'oud-1.jpg', 1200, 'approved', 'p1', 'front', '2026-01-11')").run();
    /* Een link die /admin met de hand opnieuw uitgaf: met een eigen einddatum, nog een maand geldig. */
    const kenmerk = await mintToken();
    db.prepare("INSERT INTO order_tokens (order_id, token_hash, expires_at) VALUES (1, ?, datetime('now', '+30 days'))").run(await hashToken(kenmerk));
    return { db, kenmerk };
  };
  const terugdraaien = ({ db, kenmerk }) => portalPost({ request: new Request(`https://visuails.com/o/${kenmerk}`, { method: 'POST', headers: { 'sec-fetch-site': 'same-origin', origin: 'https://visuails.com', 'cf-connecting-ip': nieuwIp(), 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action: 'undo', file: '1' }) }), env: { DB: d1(db) }, waitUntil() {} });
  try {
    const oud = await opzet(200);
    await terugdraaien(oud);
    const na = oud.db.prepare('SELECT closed_at FROM orders WHERE id = 1').get().closed_at;
    ok('na het venster (200 dagen dicht) heropent terugdraaien de bestelling niet', !!na, `closed_at ${na}`);
    const jong = await opzet(5);
    await terugdraaien(jong);
    const na2 = jong.db.prepare('SELECT closed_at FROM orders WHERE id = 1').get().closed_at;
    ok('  binnen het venster (5 dagen dicht) kan het nog, zoals in Studio', na2 === null, `closed_at ${na2}`);
  } catch (e) { ok('de privélink zonder fout', false, e.stack || e.message); }
}

/* ══ 6 · EEN OUD BESTAND MET EEN ONBEKEND TYPE ══════════════════════════════ */
console.log('\n6 · een oud bestand met een onbekende extensie en een opgeslagen type');
{
  const { portalGet } = await import('../src/lib/portal.js');
  const { accountGet } = await import('../src/lib/account.js');
  const { db } = verseDb(schema);
  db.prepare("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'type@merk.test', 'Type', 'TYPE', 'NL')").run();
  db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, delivered_at, delivery_mailed_at)
    VALUES (1, 'VIS-TYPE-6', 1, 'catalog', 'delivered', 'Type', 'TYPE', 'type@merk.test', 100, 'nl', '2026-08-01', 'attended', 1, 'paid', '2026-08-10', '2026-08-10 09:00')`).run();
  /* Van vóór de typecontrole: een bestandsnaam zonder bekende extensie, en een type uit de upload. */
  db.prepare("INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot, announced_at) VALUES (1, 1, 'delivery', 'leveringen/type/1.htm', 'oud.htm', 40, 'pending', 'p1', 'front', '2026-08-10')").run();
  db.prepare("INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot, announced_at) VALUES (2, 1, 'delivery', 'leveringen/type/2.heic', 'oud.heic', 40, 'pending', 'p1', 'side', '2026-08-10')").run();
  const kenmerk = await mintToken();
  db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (1, ?)').run(await hashToken(kenmerk));
  const sessie = 'sessie-voor-de-typetoets-backend-sterker-stap-6-abc';
  db.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, datetime('now', '+30 days'))").run(await hashToken(sessie));
  const opgeslagen = { 'leveringen/type/1.htm': 'text/html; charset=utf-8', 'leveringen/type/2.heic': 'image/jpeg' };
  const UPLOADS = {
    async get(key) {
      if (!opgeslagen[key]) return null;
      return { body: new TextEncoder().encode('<script>1</script>'), size: 18, httpEtag: '"e"', writeHttpMetadata(h) { h.set('content-type', opgeslagen[key]); } };
    },
  };
  const env = { DB: d1(db), UPLOADS };
  try {
    const p1 = await portalGet({ request: new Request(`https://visuails.com/o/${kenmerk}/f/1`), env, waitUntil() {} });
    ok('de privélink: een opgeslagen text/html gaat niet als pagina de deur uit', p1.status === 200 && p1.headers.get('content-type') === 'application/octet-stream', `${p1.status} ${p1.headers.get('content-type')}`);
    const p2 = await portalGet({ request: new Request(`https://visuails.com/o/${kenmerk}/f/2`), env, waitUntil() {} });
    ok('  een opgeslagen beeldtype uit de lijst blijft gewoon werken', p2.headers.get('content-type') === 'image/jpeg', `${p2.status} ${p2.headers.get('content-type')}`);
    const s1 = await accountGet({ request: new Request('https://visuails.com/account/files/1/f', { headers: { cookie: `vis_account=${sessie}` } }), env, waitUntil() {} });
    ok('Studio: hetzelfde bestand ook daar niet als pagina', s1.status === 200 && s1.headers.get('content-type') === 'application/octet-stream', `${s1.status} ${s1.headers.get('content-type')}`);
  } catch (e) { ok('bestanden serveren zonder fout', false, e.stack || e.message); }
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
