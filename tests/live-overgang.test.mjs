/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * KLAAR VOOR LIVE — 8 oktober 2026 (punt 8.01)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Het blok op /admin/diagnose zet de overstap naar de live-sleutel in vier vaste
 * stappen en leest zelf hoe ver het is. Deze test houdt vast, tegen het echte
 * schema.sql:
 *
 *   1 · de stand: proefabonnementen, open proefbestellingen, de volgende echte
 *       factuur, met welke sleutel de cron draaide, en de rookproef (een
 *       live-betaling met factuur en creditnota uit de echte reeks);
 *   2 · de stappen: wat wacht, wat te doen is, en dat het blok krimpt tot één
 *       regel als alles klaar is;
 *   3 · de knop "annuleer de open proefbestellingen" raakt alleen open
 *       proefbestellingen, zet cancelled_at en een tijdlijnregel, en staat achter
 *       sessie én origin;
 *   4 · de cron stuurt met een live-sleutel geen herinnering voor een
 *       proefbestelling (met de testsleutel wel, zodat het te testen blijft).
 *
 * Geen sleutel verschijnt ooit op het scherm. Alle namen en adressen verzonnen.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost, klaarVoorLiveStand, klaarVoorLiveStappen, klaarVoorLiveBlok } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { tasks } from '../cron/index.js';
import { AMOUNT, euro, withVat } from '../src/data/pricing.js';

let goed = 0, fout = 0;
function ok(naam, kreeg, verwacht = true, toon) {
  const p = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(toon ?? kreeg)}`}`);
}

const JAAR = new Date().getUTCFullYear();
const TEST = 'test_abcdefghijklmnopqrstuvwxyz0123';
const LIVE = 'live_abcdefghijklmnopqrstuvwxyz0123';

function vers() {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.join(' | '));
  db.exec("INSERT INTO customers (id, email, brand) VALUES (117, 'proef@voorbeeld.test', 'Studio Proefmerk'), (2, 'echt@voorbeeld.test', 'Echt BV')");
  return db;
}
function bestelling(db, ref, kol = {}) {
  const rij = { ref, email: 'proef@voorbeeld.test', service: 'catalog', status: 'received', total_cents: 26700, vat_cents: 5607, payment_status: 'unpaid', testmodus: 1, lang: 'nl', customer_id: 117, ...kol };
  const k = Object.keys(rij);
  db.prepare(`INSERT INTO orders (${k.join(', ')}) VALUES (${k.map(() => '?').join(', ')})`).run(...k.map((x) => rij[x]));
  return db.prepare('SELECT id FROM orders WHERE ref = ?').get(ref).id;
}

console.log('\nVISUAILS — klaar voor live\n');

/* ══ 1 · DE STAND ══════════════════════════════════════════════════════════ */
console.log('1 · de stand wordt uit de database gelezen');
{
  const db = vers();
  db.exec("INSERT INTO subscriptions (customer_id, ref, plan, status, testmodus) VALUES (117, 'SUB-PRF-0001', 'studio', 'active', 1), (117, 'SUB-PRF-0002', 'studio', 'cancelled', 1), (2, 'SUB-ECHT-001', 'studio', 'active', 0)");
  bestelling(db, 'VIS-PRF-0001');
  bestelling(db, 'VIS-PRF-0002');
  bestelling(db, 'VIS-PRF-BET1', { payment_status: 'paid' });
  bestelling(db, 'VIS-PRF-GEAN', { status: 'cancelled' });
  bestelling(db, 'VIS-ECHT-001', { testmodus: 0, customer_id: 2, email: 'echt@voorbeeld.test' });
  db.prepare('INSERT INTO invoice_series (year, last_number) VALUES (?, 23)').run(-JAAR);
  db.exec(`INSERT INTO app_settings (key, value) VALUES ('cron_modus', '{"op":"2026-10-08 03:10","mollie":"test","wissen":false,"mail":true,"plan":"gratis"}')`);

  const s = await klaarVoorLiveStand({ DB: d1(db), MOLLIE_API_KEY: TEST });
  ok('de site draait op de testsleutel', s.site, 'test');
  ok('de cron meldde: test', s.cron?.mollie, 'test');
  ok('één lopend proefabonnement (opgezegd en echt tellen niet)', s.proefAbos.map((a) => a.ref), ['SUB-PRF-0001']);
  ok('twee open proefbestellingen (betaald, geannuleerd en echt tellen niet)', s.proefOpen, 2);
  ok('de volgende echte factuur is de eerste van dit jaar', s.volgende, `VIS-${JAAR}-0001`);
  ok('de PROEF-reeks staat apart', s.proefUitgegeven, 23);
  ok('nog geen rookproef', s.rookproef, null);
  ok('zonder sleutel: geen', (await klaarVoorLiveStand({ DB: d1(db) })).site, 'geen');
  ok('met een live-sleutel: live', (await klaarVoorLiveStand({ DB: d1(db), MOLLIE_API_KEY: LIVE })).site, 'live');
  const stuk = await klaarVoorLiveStand({ DB: { prepare() { throw new Error('D1 weg'); } }, MOLLIE_API_KEY: TEST });
  ok('een database die faalt geeft "onbekend", geen omgevallen pagina', [stuk.proefAbos, stuk.proefOpen], [null, null]);
}
{
  /* De rookproef: een betaling met mode "live", een echte factuur, een creditnota. */
  const db = vers();
  const id = bestelling(db, 'VIS-ROOK-0001', { testmodus: 0, service: 'test-sample', customer_id: 2, email: 'echt@voorbeeld.test', payment_status: 'paid' });
  db.prepare("INSERT INTO payments (order_id, provider, external_id, status, amount_cents, raw_payload) VALUES (?, 'mollie', 'tr_proef1', 'paid', 121, ?)")
    .run(id, JSON.stringify({ id: 'tr_proef1', mode: 'live', status: 'paid' }));
  db.prepare("INSERT INTO invoices (number, year, seq, order_id, customer_id, status, snapshot_json, testmodus) VALUES (?, ?, 1, ?, 2, 'pending', '{}', 0)")
    .run(`VIS-${JAAR}-0001`, JAAR, id);
  db.prepare('INSERT INTO invoice_series (year, last_number) VALUES (?, 1)').run(JAAR);
  let s = await klaarVoorLiveStand({ DB: d1(db), MOLLIE_API_KEY: LIVE });
  ok('de live-betaling wordt gevonden', s.rookproef?.ref, 'VIS-ROOK-0001');
  ok('met haar factuur', s.rookproef?.factuur, `VIS-${JAAR}-0001`);
  ok('nog zonder creditnota', s.rookproef?.creditnota, null);
  ok('de volgende factuur schuift door', s.volgende, `VIS-${JAAR}-0002`);
  const invId = db.prepare('SELECT id FROM invoices').get().id;
  db.prepare("INSERT INTO credit_notes (number, year, seq, invoice_id, order_id, customer_id, net_cents, vat_cents, gross_cents, status, snapshot_json, testmodus) VALUES (?, ?, 2, ?, ?, 2, 100, 21, 121, 'pending', '{}', 0)")
    .run(`VIS-${JAAR}-0002`, JAAR, invId, id);
  s = await klaarVoorLiveStand({ DB: d1(db), MOLLIE_API_KEY: LIVE });
  ok('en na de terugbetaling met haar creditnota', s.rookproef?.creditnota, `VIS-${JAAR}-0002`);

  /* Een betaling in testmodus telt niet als rookproef. */
  const db2 = vers();
  const id2 = bestelling(db2, 'VIS-TEST-0001', { payment_status: 'paid' });
  db2.prepare("INSERT INTO payments (order_id, provider, external_id, status, amount_cents, raw_payload) VALUES (?, 'mollie', 'tr_t', 'paid', 121, ?)")
    .run(id2, JSON.stringify({ id: 'tr_t', mode: 'test', status: 'paid' }));
  ok('een testbetaling is geen rookproef', (await klaarVoorLiveStand({ DB: d1(db2), MOLLIE_API_KEY: LIVE })).rookproef, null);
}

/* ══ 2 · DE STAPPEN EN HET BLOK ════════════════════════════════════════════ */
console.log('\n2 · de stappen in hun vaste volgorde');
const basis = {
  site: 'test', cron: { mollie: 'test', op: '2026-10-08 03:10' }, cronLaatst: '2026-10-08 03:10 · 0 meldingen · 0 problemen',
  proefAbos: [{ id: 1, ref: 'SUB-PRF-0001', customer_id: 117, brand: 'Studio Proefmerk' }], proefOpen: 2,
  volgende: `VIS-${JAAR}-0001`, echteUitgegeven: 0, proefUitgegeven: 23, rookproef: null, methoden: { staat: 'gelezen', methoden: ['ideal'] },
};
{
  const st = klaarVoorLiveStappen(basis);
  ok('vier stappen, in de volgorde 1-2-3-4', st.map((x) => x.nr), [1, 2, 3, 4]);
  ok('stap 1: beide regels te doen', st[0].rijen.map((r) => r.staat), ['te-doen', 'te-doen']);
  ok('stap 1 linkt naar de klant van het proefabonnement', /href="\/admin\/customers\/117"/.test(st[0].rijen[0].uitleg), true);
  ok('stap 1 heeft de knop om ze in één keer te annuleren', /action="\/admin\/diagnose\/proef-annuleren"/.test(st[0].rijen[1].uitleg), true);
  ok('stap 2 wacht zolang de testsleutel erop staat', st[1].rijen.map((r) => r.staat), ['wacht']);
  ok('en noemt de vijf methoden', ['iDEAL', 'Kaart', 'Bancontact', 'PayPal', 'SEPA-incasso'].every((m) => st[1].rijen[0].uitleg.includes(m)), true);
  ok('stap 3: site en cron te doen', st[2].rijen.map((r) => r.staat), ['te-doen', 'te-doen']);
  ok('stap 3 zegt dat Lucas de sleutel zelf zet', /Claude zet nooit een sleutel/.test(st[2].rijen[0].uitleg), true);
  ok('stap 4 wacht op stap 3', st[3].rijen.map((r) => r.staat), ['wacht', 'wacht']);
  const proef = euro(withVat(AMOUNT.testSample), 'nl');
  ok(`de rookproef noemt het bedrag uit de prijslijst (${proef})`, st[3].titel.includes(proef), true, st[3].titel);
  ok('en "een bevriend bedrijf" (V4 = a)', /bevriend bedrijf/.test(st[3].rijen[0].uitleg), true);
}
{
  const live = { ...basis, site: 'live', cron: { mollie: 'live', op: '2026-10-09 03:10' }, proefAbos: [], proefOpen: 0,
    methoden: { staat: 'gelezen', methoden: ['ideal', 'creditcard', 'bancontact', 'paypal'] } };
  const st = klaarVoorLiveStappen(live);
  ok('live: stap 2 per methode, SEPA-incasso nog uit', st[1].rijen.map((r) => `${r.wat}:${r.staat}`),
    ['iDEAL:klaar', 'Kaart:klaar', 'Bancontact:klaar', 'PayPal:klaar', 'SEPA-incasso:te-doen']);
  ok('live: stap 3 klaar', st[2].rijen.map((r) => r.staat), ['klaar', 'klaar']);
  ok('live zonder betaling: de rookproef is te doen', st[3].rijen.map((r) => r.staat), ['te-doen', 'wacht']);
  const half = klaarVoorLiveStappen({ ...live, rookproef: { id: 9, ref: 'VIS-ROOK-0001', factuur: `VIS-${JAAR}-0001`, creditnota: null } });
  ok('betaald maar nog niet terug: terugbetalen is te doen', half[3].rijen.map((r) => r.staat), ['klaar', 'te-doen']);
  ok('met een link naar de bestelling', /href="\/admin\/orders\/9\/files"/.test(half[3].rijen[1].uitleg), true);

  const klaar = { ...live, methoden: { staat: 'gelezen', methoden: ['ideal', 'creditcard', 'bancontact', 'paypal', 'directdebit'] },
    rookproef: { id: 9, ref: 'VIS-ROOK-0001', factuur: `VIS-${JAAR}-0001`, creditnota: `VIS-${JAAR}-0002` } };
  const blok = klaarVoorLiveBlok(klaar);
  ok('alles klaar: het blok krimpt tot één regel', /Dit blok heeft zijn werk gedaan/.test(blok) && !/te doen/.test(blok) && !/<table/.test(blok), true);
}
{
  const blok = klaarVoorLiveBlok(basis);
  ok('de kop zegt site en cron', /site: test &middot; cron: test/.test(blok), true);
  ok('en de volgende factuur', blok.includes(`Volgende factuur: <strong>VIS-${JAAR}-0001</strong>`), true);
  ok('en dat PROEF-facturen niet meetellen', /PROEF-facturen tellen niet mee \(23 uitgegeven\)/.test(blok), true);
  ok('het blok verwijst naar de stappenkaart', /kladblok\/LIVE-STAPPEN\.md/.test(blok), true);
  ok('geen inline style (CSP style-src self)', /style="/.test(blok), false);
  const vreemd = klaarVoorLiveBlok({ ...basis, echteUitgegeven: 4 });
  ok('oude nummers in de echte reeks zonder live-betaling: een waarschuwing', /al 4 nummers uitgegeven/.test(vreemd), true);
}

/* ══ 3 · DE KNOP, DOOR DE ECHTE ADMINROUTES HEEN ═══════════════════════════ */
console.log('\n3 · de knop annuleert alleen open proefbestellingen');
{
  const db = vers();
  const token = await mintToken();
  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'admin@voorbeeld.test', 'x')");
  db.prepare("INSERT INTO admin_sessions (admin_id, token_hash, expires_at, issued_at, last_used_at) VALUES (1, ?, '2099-01-01 00:00:00', datetime('now'), datetime('now'))").run(await hashToken(token));
  const open1 = bestelling(db, 'VIS-PRF-0001', { window_start: '2026-10-20', window_end: '2026-10-21' });
  const open2 = bestelling(db, 'VIS-PRF-0002', { lang: 'en' });
  const betaald = bestelling(db, 'VIS-PRF-BET1', { payment_status: 'paid' });
  const echt = bestelling(db, 'VIS-ECHT-001', { testmodus: 0, customer_id: 2, email: 'echt@voorbeeld.test' });
  const env = { DB: d1(db), MOLLIE_API_KEY: TEST };
  const verzoek = (origin) => {
    const headers = { cookie: `vis_admin=${token}` };
    if (origin) headers.origin = origin;
    return adminPost({ request: new Request('https://visuails.com/admin/diagnose/proef-annuleren', { method: 'POST', headers }), env, waitUntil() {} });
  };

  const vreemd = await verzoek('https://kwaadaardig.example');
  ok('van een vreemde origin: 403', vreemd.status, 403);
  ok('en er is niets geannuleerd', db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'cancelled'").get().n, 0);

  const res = await verzoek('https://visuails.com');
  ok('met sessie en origin: terug naar de diagnose', [res.status, res.headers.get('location')], [303, '/admin/diagnose#klaar-voor-live']);
  const st = (id) => db.prepare('SELECT status, cancelled_at, window_start FROM orders WHERE id = ?').get(id);
  ok('de twee open proefbestellingen zijn geannuleerd', [st(open1).status, st(open2).status], ['cancelled', 'cancelled']);
  ok('met cancelled_at', /^\d{4}-/.test(st(open1).cancelled_at || ''), true);
  ok('en hun gereserveerde dagen vrij', st(open1).window_start, null);
  ok('de betaalde proefbestelling blijft', st(betaald).status, 'received');
  ok('de echte bestelling blijft', st(echt).status, 'received');
  const ev = db.prepare("SELECT order_id, note, actor FROM order_events WHERE status = 'cancelled' ORDER BY order_id").all();
  ok('twee tijdlijnregels', ev.map((e) => e.order_id), [open1, open2]);
  ok('in de taal van de bestelling', [/Geannuleerd: proefbestelling/.test(ev[0].note), /Cancelled: test order/.test(ev[1].note)], [true, true]);
  ok('in het logboek', db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE action = 'order.proef.annuleer'").get().n, 1);
  await verzoek('https://visuails.com');
  ok('een tweede klik doet niets meer', db.prepare("SELECT COUNT(*) AS n FROM order_events WHERE status = 'cancelled'").get().n, 2);

  /* En de pagina zelf, met sessie: het blok staat erop en geen sleutel. */
  const echteFetch = globalThis.fetch;
  /* Resend geeft het mailgebruik terug (9.05); Mollie weigert de nepsleutel. */
  globalThis.fetch = async (url) => (String(url) === 'https://api.resend.com/usage'
    ? new Response(JSON.stringify({ emails: { daily: { used: 12, limit: 100 }, monthly: { used: 140, limit: 3000 } } }), { status: 200 })
    : new Response('{}', { status: 401 }));
  db.exec(`INSERT INTO app_settings (key, value) VALUES ('cron_meting', '{"op":"2026-10-08 03:10","d1":23,"r2":4,"extern":2,"gestopt":[]}')`);
  const pagina = await adminGet({ request: new Request('https://visuails.com/admin/diagnose', { headers: { cookie: `vis_admin=${token}` } }), env: { ...env, RESEND_API_KEY: 're_nepsleutel' }, waitUntil() {} });
  globalThis.fetch = echteFetch;
  const html = await pagina.text();
  ok('de diagnose toont "Klaar voor live"', /<h2>Klaar voor live<\/h2>/.test(html), true);
  ok('en het nachtwerk en de gratis grenzen', /Nachtwerk, wissen en mail/.test(html) && /De gratis grenzen/.test(html), true);
  ok('zonder de sleutel', html.includes(TEST) || html.includes('re_nepsleutel'), false);
  ok('de gratis grenzen tonen het mailgebruik van vandaag', /vandaag 12 van 100/.test(html), true);
  ok('en wat de nacht van de 50 databaseverzoeken gebruikte', /database 23 van 50/.test(html), true);
  ok('PURGE_ENABLED staat niet meer als "niet gezet" bij de site', /<code>PURGE_ENABLED<\/code>/.test(html), false);
}

/* ══ 4 · GEEN HERINNERING VOOR EEN PROEFBESTELLING MET DE LIVE-SLEUTEL ═══════ */
console.log('\n4 · de cron en de proefbestellingen');
{
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"id":"x"}', { status: 200, headers: { 'content-type': 'application/json' } });
  const maak = () => {
    const db = vers();
    bestelling(db, 'VIS-PRF-HER1', { created_at: '2000-01-01' });
    db.exec("UPDATE orders SET created_at = datetime('now', '-4 days')");
    return db;
  };
  const dbLive = maak();
  const regelLive = await tasks.remindUnpaid({ DB: d1(dbLive), MOLLIE_API_KEY: LIVE, RESEND_API_KEY: 're_nep', FROM_EMAIL: 'VISUAILS <orders@visuails.com>' });
  ok('met de live-sleutel: geen herinnering voor de proefbestelling', regelLive, null);
  ok('en geen stempel', dbLive.prepare('SELECT payment_reminder_at FROM orders').get().payment_reminder_at, null);
  const dbTest = maak();
  const regelTest = await tasks.remindUnpaid({ DB: d1(dbTest), MOLLIE_API_KEY: TEST, RESEND_API_KEY: 're_nep', FROM_EMAIL: 'VISUAILS <orders@visuails.com>' });
  globalThis.fetch = echteFetch;
  ok('met de testsleutel wel (zodat het te testen blijft)', /VIS-PRF-HER1/.test(regelTest || ''), true, regelTest);
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
