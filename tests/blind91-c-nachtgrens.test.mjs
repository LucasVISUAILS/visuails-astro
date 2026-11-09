/*
 * DE NACHT ONDER DE 50, OOK MET EEN VOLLE DATABASE — 9 november 2026 (ronde 91, C05)
 *
 * /admin/diagnose meldde live "database 54 van 50". Gemeten met een gevulde
 * database (91/werk/c/c05-nacht.mjs): met twee rijen per stand deed de nacht 73
 * databaseverzoeken, met vijf 141. De grootste posten waren elke nacht, ook
 * zonder werk: plafondInZicht() (creditSaldo voor ELKE abonnee: 5 à 6 per
 * abonnee), grantPrepaidMonths() en incassoSignalen() (een SELECT per
 * abonnement), releaseExpiredWindows() (een batch per bestelling), en zonder rem
 * de betaalherinneringen, het vervallen, de pauzevraag en het toekennen van
 * vooruitbetaalde maanden. Stuit een run op de grens zoals Cloudflare hem
 * beschrijft ("Too many API requests by single Worker invocation"), dan vallen
 * de bewakers, de Nu-doen-lijst en de hartslag om, en gaat een mail zonder
 * stempel de nacht erna opnieuw.
 *
 * Deze toets houdt vast:
 *   1 · een nacht met tien rijen per stand blijft onder de 50, zonder één fout,
 *       met de hartslag geschreven, ook als de database na 50 echt weigert;
 *   2 · de nacht erna doet de rest (niets blijft voor altijd liggen);
 *   3 · plafondInZicht() geeft hetzelfde antwoord als de oude lus (creditSaldo
 *       voor elke abonnee), over 70 dagen, met minder verzoeken;
 *   4 · grantPrepaidMonths() en incassoSignalen() lezen de maanden uit hun eigen
 *       rij: hetzelfde antwoord, één verzoek;
 *   5 · releaseExpiredWindows() doet alles in één batch.
 *
 * Tegen het echte schema.sql. Alle adressen verzonnen (voorbeeld.test).
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import cron, { tasks } from '../cron/index.js';
import { creditSaldo, plafondInZicht, boekTermijnBij } from '../src/lib/creditboek.js';

let goed = 0, fout = 0;
function ok(naam, kreeg, verwacht = true) {
  const p = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

/* D1 zoals Cloudflare hem beschrijft: per aanroep geteld, een batch telt als één,
   en na `grens` weigert hij. */
function telD1(echt, grens = Infinity) {
  const t = { n: 0 };
  const tel = () => { t.n++; if (t.n > grens) throw new Error('Too many API requests by single Worker invocation.'); };
  const st = (s) => ({ __echt: s, bind: (...a) => st(s.bind(...a)), first: async (...a) => { tel(); return s.first(...a); }, all: async (...a) => { tel(); return s.all(...a); }, run: async (...a) => { tel(); return s.run(...a); }, raw: async (...a) => { tel(); return s.raw(...a); } });
  return { t, db: { prepare: (q) => st(echt.prepare(q)), batch: async (l) => { tel(); return echt.batch(l.map((x) => x.__echt || x)); }, exec: async (q) => { tel(); return echt.exec(q); } } };
}

function vers() {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.join(' | '));
  return db;
}

/* Een volle database: K rijen in elke stand waar de nacht iets mee doet. */
function zaai(db, K) {
  const sql = (s, ...b) => db.prepare(s).run(...b);
  const d = (n) => `datetime('now', '${n >= 0 ? '+' : ''}${n} days')`;
  let oid = 1000, cid = 500;
  const klant = (email, created = "datetime('now','-30 days')") => { cid++; sql(`INSERT INTO customers (id, email, name, brand, country, created_at) VALUES (?, ?, 'Test', 'Testmerk', 'NL', ${created})`, cid, email); return cid; };
  const order = (o) => {
    oid++;
    const c = klant(`k${oid}@voorbeeld.test`);
    sql(`INSERT INTO orders (id, ref, customer_id, service, status, name, email, total_cents, vat_cents, lang, tier, product_count, payment_status, created_at,
          window_start, window_end, window_expires_at, payment_reminder_at, delivered_at, delivery_mailed_at, paid_at, closed_at)
         VALUES (?, ?, ?, 'catalog', ?, 'Test', ?, 12000, 0, 'nl', ?, 3, ?, ${o.created || d(-1)}, ?, ?, ${o.expires || 'NULL'}, ${o.reminded || 'NULL'}, ${o.delivered || 'NULL'}, ${o.delivered || 'NULL'}, ${o.paid || 'NULL'}, ${o.closed || 'NULL'})`,
      oid, `VIS-T-${oid}`, c, o.status || 'received', `k${oid}@voorbeeld.test`, o.tier || 'unattended', o.pay || 'unpaid', o.ws || null, o.ws || null);
    return oid;
  };
  for (let i = 0; i < K; i++) {
    order({ created: d(-4) });
    order({ created: d(-8), tier: 'attended', ws: '2026-11-20', expires: d(-1), reminded: d(-5) });
    order({ created: d(-15), reminded: d(-12) });
    const g = order({ status: 'delivered', pay: 'paid', paid: d(-12), delivered: d(-9) });
    sql(`INSERT INTO files (order_id, kind, r2_key, filename, created_at, announced_at) VALUES (?, 'delivery', ?, 'a.jpg', ${d(-9)}, ${d(-9)})`, g, `orders/${g}/a.jpg`);
    sql(`INSERT INTO subscriptions (customer_id, ref, plan, term, status, window_day, started_at, created_at, amount_cents) VALUES (?, ?, 'studio', 'prepaid', 'active', 1, ${d(-40)}, ${d(-40)}, 79000)`, klant(`pre${i}@voorbeeld.test`), `SUB-PRE-${i}`);
    sql(`INSERT INTO subscriptions (customer_id, ref, plan, term, status, window_day, started_at, created_at, amount_cents, mollie_customer_id, mollie_subscription_id) VALUES (?, ?, 'studio', 'monthly', 'active', 1, ${d(-70)}, ${d(-70)}, 79000, 'cst_x', ?)`, klant(`mnd${i}@voorbeeld.test`), `SUB-MND-${i}`, `sub_x${i}`);
    sql(`INSERT INTO subscriptions (customer_id, ref, plan, term, status, window_day, started_at, created_at, amount_cents, paused_at, pause_reason) VALUES (?, ?, 'studio', 'monthly', 'paused', 1, ${d(-200)}, ${d(-200)}, 79000, ${d(-100)}, 'customer')`, klant(`pau${i}@voorbeeld.test`), `SUB-PAU-${i}`);
    klant(`oud${i}@voorbeeld.test`, "datetime('now','-3 years')");
  }
  sql("INSERT INTO app_settings (key, value) VALUES ('backup_last_run', ?)", new Date().toISOString().slice(0, 16).replace('T', ' '));
}

const R2 = () => ({ async list() { return { objects: [], truncated: false }; }, async delete() {}, async put() {}, async get() { return null; }, async head() { return null; } });

const echtFetch = globalThis.fetch;
const echtLog = console.log, echtErr = console.error, echtWarn = console.warn;
globalThis.fetch = async () => new Response(JSON.stringify({ id: 'x' }), { status: 200, headers: { 'content-type': 'application/json' } });

async function nacht(db, grens) {
  const { t, db: D } = telD1(d1(db), grens);
  let klaar = '';
  console.log = (...a) => { const s = a.join(' '); if (s.startsWith('[cron] klaar')) klaar = s; };
  console.error = () => {}; console.warn = () => {};
  try {
    await cron.scheduled({}, { DB: D, UPLOADS: R2(), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test_onecht', PURGE_ENABLED: 'false', WORKERS_PLAN: 'gratis', FROM_EMAIL: 'X <x@voorbeeld.test>' }, { waitUntil() {} });
  } finally { console.log = echtLog; console.error = echtErr; console.warn = echtWarn; }
  const problemen = Number((/(\d+) problemen/.exec(klaar) || [])[1]);
  return { n: t.n, problemen, klaar };
}

console.log('\nVISUAILS — de nacht onder de 50, ook met een volle database (ronde 91, C05)\n');

/* ══ 1 en 2 · tien rijen per stand, de database weigert na 50 ══════════════ */
console.log('1 · een volle nacht tegen een harde grens van 50');
{
  const db = vers();
  zaai(db, 10);
  const n1 = await nacht(db, 50);
  ok('nacht 1: hoogstens 50 databaseverzoeken', n1.n <= 50, true);
  ok('nacht 1: geen enkele taak viel om', n1.problemen, 0);
  const hart = db.prepare("SELECT value FROM app_settings WHERE key = 'cron_last_run'").get();
  ok('nacht 1: de hartslag is geschreven', Boolean(hart?.value), true);
  const meting = JSON.parse(db.prepare("SELECT value FROM app_settings WHERE key = 'cron_meting'").get()?.value || '{}');
  ok('nacht 1: de meetlat noemt wat vroeg stopte', Array.isArray(meting.gestopt) && meting.gestopt.includes('de betaalherinneringen'), true);
  const herinnerd1 = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE payment_reminder_at IS NOT NULL').get().n;

  console.log('2 · de nachten erna doen de rest');
  const open = (q) => db.prepare(q).get().n;
  const klaar = () => open('SELECT COUNT(*) AS n FROM subscriptions WHERE pauze_vraag_at IS NOT NULL') === 10
    && open("SELECT COUNT(*) AS n FROM orders WHERE status = 'delivered' AND closed_at IS NOT NULL AND paid_at >= datetime('now', '-13 days')") === 10;
  /* 14 en niet 10 (9 november 2026, na K-10): het stille afronden stuurt sindsdien de
     afrondmail en reserveert 7 verzoeken per bestelling in plaats van 3, dus met tien
     rijen in elke stand duurt het een paar nachten langer. Wat telt: elke nacht onder
     de 50, nergens een fout, en uiteindelijk is alles gedaan. */
  let nachten = 1, max = n1.n, problemen = n1.problemen;
  while (!klaar() && nachten < 14) {
    const n = await nacht(db, 50);
    nachten++; max = Math.max(max, n.n); problemen += n.problemen;
  }
  ok(`na ${nachten} nachten is alles gedaan (hoogstens 14)`, klaar(), true);
  ok('elke nacht hoogstens 50 verzoeken en nergens een fout', [max <= 50, problemen], [true, 0]);
  ok('alle tien herinneringen zijn verstuurd (elk één keer gestempeld)', open('SELECT COUNT(*) AS n FROM orders WHERE created_at >= datetime(\'now\', \'-5 days\') AND payment_reminder_at IS NOT NULL'), 10);
  ok('… en meer dan in nacht 1 alleen', herinnerd1 < 10 + 20, true);
  ok('alle tien te oude bestellingen zijn vervallen', open("SELECT COUNT(*) AS n FROM orders WHERE status = 'cancelled' AND cancelled_at IS NOT NULL"), 10);
  ok('alle tien vooruitbetaalde abonnementen hebben hun maand', open('SELECT COUNT(DISTINCT subscription_id) AS n FROM subscription_months'), 10);
  ok('alle tien pauzes hebben hun vraag gehad', open('SELECT COUNT(*) AS n FROM subscriptions WHERE pauze_vraag_at IS NOT NULL'), 10);
  ok('alle tien geleverde bestellingen zijn stil afgerond', open("SELECT COUNT(*) AS n FROM orders WHERE status = 'delivered' AND closed_at IS NOT NULL AND paid_at >= datetime('now', '-13 days')"), 10);
  ok('geen reservering meer die vervallen is', open('SELECT COUNT(*) AS n FROM orders WHERE window_expires_at IS NOT NULL AND window_expires_at <= datetime(\'now\')'), 0);
}

/* ══ 3 · plafondInZicht: hetzelfde antwoord, minder verzoeken ══════════════ */
console.log('3 · plafondInZicht() tegen de oude lus');
{
  const db = vers();
  const env = { DB: d1(db) };
  /* Twaalf abonnees met elk een andere afschrijfdag en een saldo dat bij de
     volgende termijn over het plafond gaat (vier termijnen geboekt). */
  for (let i = 1; i <= 12; i++) {
    db.prepare("INSERT INTO customers (id, email, name, country) VALUES (?, ?, 'Test', 'NL')").run(900 + i, `p${i}@voorbeeld.test`);
    const dagNr = String(((i * 5) % 28) + 1).padStart(2, '0');
    db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at, created_at, amount_cents)
                VALUES (?, ?, ?, 'studio', 'monthly', ?, 1, ?, ?, 79000)`).run(800 + i, 900 + i, `SUB-P-${i}`, i === 12 ? 'paused' : 'active', `2026-08-${dagNr} 10:00:00`, `2026-08-${dagNr} 10:00:00`);
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(800 + i);
    for (const m of ['2026-08', '2026-09', '2026-10', '2026-11']) await boekTermijnBij(env, sub, m, null, new Date(`${m}-${dagNr}T12:00:00Z`)).catch(() => {});
  }
  const oud = async (nu) => {
    const op = (() => { const d = new Date(`${nu.toISOString().slice(0, 10)}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 7); return d.toISOString().slice(0, 10); })();
    const uit = [];
    for (const { customer_id: customerId } of db.prepare("SELECT DISTINCT customer_id FROM subscriptions WHERE status = 'active' AND customer_id IS NOT NULL ORDER BY customer_id").all()) {
      const s = await creditSaldo(env.DB, { customerId }, { nu });
      if (!s.boven || s.boven.op !== op || !s.boven.aantal) continue;
      uit.push({ customerId, subscriptionId: s.abonnement?.id ?? null, op, nieuw: s.boven.nieuw, boven: s.boven.aantal, saldo: s.aboSaldo, plafond: s.boven.plafond ?? s.plafond, overstap: s.boven.overstap ? s.nieuw?.overstap?.plan || '' : '' });
    }
    return uit;
  };
  let gelijk = 0, verschil = [], treffers = 0, nieuwVerzoeken = 0, oudVerzoeken = 0;
  for (let k = 0; k < 70; k++) {
    const nu = new Date(Date.UTC(2026, 10, 9 + k, 3, 10));
    const { t: tn, db: Dn } = telD1(d1(db));
    const { t: to, db: Do } = telD1(d1(db));
    const a = await plafondInZicht(Dn, { dagen: 7, nu });
    const wasEnv = env.DB; env.DB = Do; const b = await oud(nu); env.DB = wasEnv;
    nieuwVerzoeken += tn.n; oudVerzoeken += to.n;
    treffers += a.length;
    if (JSON.stringify(a) === JSON.stringify(b)) gelijk++; else verschil.push(nu.toISOString().slice(0, 10));
  }
  ok('70 nachten: elke nacht hetzelfde antwoord als de oude lus', verschil, []);
  ok('… en er waren echte herinneringen bij (geen lege vergelijking)', treffers > 0, true);
  ok(`… met minder databaseverzoeken (${nieuwVerzoeken} tegen ${oudVerzoeken})`, nieuwVerzoeken * 5 < oudVerzoeken, true);
  const { t, db: D } = telD1(d1(db));
  await plafondInZicht(D, { dagen: 7, nu: new Date(Date.UTC(2026, 10, 30, 3, 10)) });
  ok('een nacht zonder termijn over 7 dagen: één verzoek, niet één per abonnee', t.n <= 1 + 6, true);
}

/* ══ 4 · grantPrepaidMonths en incassoSignalen: de maanden uit de rij ═══════ */
console.log('4 · grantPrepaidMonths() en incassoSignalen() met de maanden in hun eigen rij');
{
  const db = vers();
  const sql = (s, ...b) => db.prepare(s).run(...b);
  for (let i = 1; i <= 6; i++) {
    sql("INSERT INTO customers (id, email, name, country) VALUES (?, ?, 'Test', 'NL')", 700 + i, `g${i}@voorbeeld.test`);
    sql(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at, created_at, amount_cents, mollie_customer_id, mollie_subscription_id)
         VALUES (?, ?, ?, 'studio', ?, 'active', 1, '2026-09-05 10:00:00', '2026-09-05 10:00:00', 79000, ?, ?)`,
      600 + i, 700 + i, `SUB-G-${i}`, i <= 3 ? 'prepaid' : 'monthly', i <= 3 ? null : 'cst_g', i <= 3 ? null : `sub_g${i}`);
  }
  /* 1 en 4 hebben november al, de rest niet */
  sql("INSERT INTO subscription_months (subscription_id, month, granted) VALUES (601, '2026-09', 10), (601, '2026-10', 10), (601, '2026-11', 10), (604, '2026-10', 10), (604, '2026-11', 10), (605, '2026-10', 10)");
  const nu = new Date(Date.UTC(2026, 10, 9, 3, 10));
  const { t, db: D } = telD1(d1(db));
  console.log = () => {};
  const uit = await tasks.grantPrepaidMonths({ DB: D }, nu);
  console.log = echtLog;
  ok('de twee vooruitbetaalde zonder november krijgen hem, de derde niet opnieuw', uit.includes('2 maanden') && uit.includes('SUB-G-2') && uit.includes('SUB-G-3') && !uit.includes('SUB-G-1'), true);
  const na1 = db.prepare('SELECT COUNT(*) AS n FROM subscription_months').get().n;
  const { t: t2, db: D2 } = telD1(d1(db));
  console.log = () => {};
  const uit2 = await tasks.grantPrepaidMonths({ DB: D2 }, nu);
  console.log = echtLog;
  ok('tweede run dezelfde nacht: niets erbij, en één verzoek', [uit2, db.prepare('SELECT COUNT(*) AS n FROM subscription_months').get().n === na1, t2.n], ['', true, 1]);
  const { t: t3, db: D3 } = telD1(d1(db));
  const sig = await tasks.incassoSignalen({ DB: D3, PUBLIC_ORIGIN: 'https://voorbeeld.test' });
  ok('incassoSignalen: alleen SUB-G-5 en SUB-G-6 zonder november, SUB-G-4 niet', sig.includes('SUB-G-5') && sig.includes('SUB-G-6') && !sig.includes('SUB-G-4') && sig.startsWith('2 abonnementen zonder incasso'), true);
  ok('… met één databaseverzoek voor alle abonnementen', t3.n, 1);
  void t;
}

/* ══ 5 · releaseExpiredWindows in één batch ═════════════════════════════════ */
console.log('5 · releaseExpiredWindows() in één batch');
{
  const db = vers();
  for (let i = 1; i <= 7; i++) {
    db.prepare("INSERT INTO orders (id, ref, service, status, email, lang, tier, window_start, window_end, window_expires_at, payment_status, created_at) VALUES (?, ?, 'catalog', 'received', ?, ?, 'attended', '2026-11-20', '2026-11-21', datetime('now', '-1 day'), ?, datetime('now', '-8 days'))")
      .run(i, `VIS-W-${i}`, `w${i}@voorbeeld.test`, i % 2 ? 'nl' : 'en', 'unpaid');
  }
  const { t, db: D } = telD1(d1(db));
  const uit = await tasks.releaseExpiredWindows({ DB: D });
  ok('zeven reserveringen vrijgegeven', /^7 vervallen reserveringen vrijgegeven/.test(uit || ''), true);
  ok('met twee verzoeken: de SELECT en één batch', t.n, 2);
  ok('alle zeven vensters leeg, zeven tijdlijnregels in de taal van de klant', [
    db.prepare('SELECT COUNT(*) AS n FROM orders WHERE window_start IS NULL').get().n,
    db.prepare("SELECT COUNT(*) AS n FROM order_events WHERE note LIKE 'Reservering %vrijgegeven%'").get().n,
    db.prepare("SELECT COUNT(*) AS n FROM order_events WHERE note LIKE 'Reservation %released%'").get().n,
  ], [7, 4, 3]);
}

/* ══ 6 · de wachtruimte: één query per honderd batches ══════════════════════ */
console.log('6 · sweepAbandonedIntake(): wie er nog naar wijst, in één query per 100');
{
  const db = vers();
  const kenmerk = (i) => `b${String(i).padStart(42, '0')}`;
  const obj = new Map();
  for (let i = 0; i < 150; i++) obj.set(`intake/${kenmerk(i)}/voor.jpg`, { size: 1048576, uploaded: new Date(Date.now() - 10 * 864e5) });
  /* 3 genoemd in een bestelling, 2 op de lijst van een abonnee */
  for (const i of [5, 77, 140]) db.prepare("INSERT INTO orders (ref, service, status, email, details_json) VALUES (?, 'catalog', 'received', 'w@voorbeeld.test', ?)").run(`VIS-I-${i}`, JSON.stringify({ upload_batch: kenmerk(i) }));
  db.prepare("INSERT INTO customers (id, email) VALUES (1, 'q@voorbeeld.test')").run();
  for (const i of [12, 120]) db.prepare("INSERT INTO plan_queue (customer_id, name, upload_batch) VALUES (1, 'x', ?)").run(kenmerk(i));
  const r2 = { async list({ limit = 1000, cursor } = {}) { const k = [...obj.keys()].sort(); const s = cursor ? Number(cursor) : 0; const st = k.slice(s, s + limit); return { objects: st.map((key) => ({ key, ...obj.get(key) })), truncated: s + st.length < k.length, cursor: String(s + st.length) }; }, async delete(k) { obj.delete(k); } };
  const { t, db: D } = telD1(d1(db));
  console.log = () => {};
  const uit = await tasks.sweepAbandonedIntake({ DB: D, UPLOADS: r2, PURGE_ENABLED: 'false' });
  console.log = echtLog;
  ok('145 verlaten batches gemeld, de 5 genoemde niet', /^VERSLAGMODUS: 145 verlaten uploads/.test(uit || ''), true);
  ok('met twee databaseverzoeken (150 kenmerken, 100 per query)', t.n, 2);
  const { db: D2 } = telD1(d1(db));
  console.log = () => {};
  const weg = await tasks.sweepAbandonedIntake({ DB: D2, UPLOADS: r2, PURGE_ENABLED: 'true' });
  console.log = echtLog;
  ok('met de rem eraf: precies de 145 weg, de 5 genoemde blijven', [/^145 achtergelaten/.test(weg || ''), obj.size, [5, 12, 77, 120, 140].every((i) => obj.has(`intake/${kenmerk(i)}/voor.jpg`))], [true, 5, true]);
}

globalThis.fetch = echtFetch;
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
