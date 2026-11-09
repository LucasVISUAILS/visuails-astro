/*
 * WAT BETAALD IS EERST, EN GEEN VALSE TIJDLIJNREGEL — 9 november 2026 (ronde 91, C09/C10)
 *
 * C09: de maand van een vooruitbetaald jaar (credits die de klant al betaalde) stond
 * in de nacht achter de betaalherinneringen en het vervallen. Met een rem op elke lus
 * kon hij op een drukke nacht een paar nachten wachten. Nu staan facturen,
 * boekhouding en die maand vooraan.
 * C10: releaseExpiredWindows() schreef "reservering vrijgegeven: de betaaltermijn is
 * verstreken" ook op een bestelling die tussen de SELECT en de batch betaald werd
 * (de UPDATE sloeg haar terecht over, de INSERT niet).
 * Tegen het echte schema.sql. Adressen verzonnen.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import cron, { tasks } from '../cron/index.js';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};
const vers = () => { const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url)); if (mislukt.length) throw new Error(mislukt[0]); return db; };
/* D1 zoals Cloudflare hem beschrijft: na 50 verzoeken weigert hij (batch = 1). */
function hard(echt, grens = 50) {
  let n = 0;
  const tel = () => { if (++n > grens) throw new Error('Too many API requests by single Worker invocation.'); };
  const st = (s) => ({ __echt: s, bind: (...a) => st(s.bind(...a)), first: async (...a) => { tel(); return s.first(...a); }, all: async (...a) => { tel(); return s.all(...a); }, run: async (...a) => { tel(); return s.run(...a); }, raw: async (...a) => { tel(); return s.raw(...a); } });
  return { prepare: (q) => st(echt.prepare(q)), batch: async (l) => { tel(); return echt.batch(l.map((x) => x.__echt || x)); } };
}
const echtFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ id: 'x' }), { status: 200, headers: { 'content-type': 'application/json' } });
const stil = () => { const l = console.log, e = console.error, w = console.warn; console.log = console.error = console.warn = () => {}; return () => { console.log = l; console.error = e; console.warn = w; }; };

console.log('\nVISUAILS — wat betaald is eerst, en geen valse tijdlijnregel (ronde 91, C09/C10)\n');

console.log('1 · de volgorde in cron/index.js');
{
  const bron = readFileSync(new URL('../cron/index.js', import.meta.url), 'utf8');
  const rij = (/for \(const task of \[([^\]]+)\]\)/.exec(bron) || [])[1].split(',').map((x) => x.trim());
  const voor = (a, b) => rij.indexOf(a) >= 0 && rij.indexOf(a) < rij.indexOf(b);
  ok('facturen, boekhouding en de vooruitbetaalde maand staan vooraan', rij.slice(0, 3), ['issuePendingInvoices', 'boekhoudingNacht', 'grantPrepaidMonths']);
  ok('… vóór de herinneringen en het vervallen', voor('grantPrepaidMonths', 'remindUnpaid') && voor('grantPrepaidMonths', 'cancelStaleApprovals'), true);
  ok('vrijgeven blijft vóór opruimen, toekennen vóór de creditherinnering', voor('releaseExpiredWindows', 'purgeExpiredFiles') && voor('grantPrepaidMonths', 'herinnerCredits'), true);
  ok('de bewakers achteraan', rij.slice(-2), ['bewaartermijnAccounts', 'checkBackupAge']);
  ok('alle zestien taken staan er nog', rij.length, 16);
}

console.log('2 · een drukke nacht: de vooruitbetaalde maanden gaan in nacht 1');
{
  const db = vers();
  const sql = (s, ...b) => db.prepare(s).run(...b);
  let cid = 100, oid = 1000;
  const klant = () => { cid++; sql("INSERT INTO customers (id, email, name, country) VALUES (?, ?, 'Test', 'NL')", cid, `n${cid}@voorbeeld.test`); return cid; };
  for (let i = 0; i < 12; i++) {
    for (const [dagen, herinnerd] of [[4, false], [15, true]]) {
      oid++;
      sql(`INSERT INTO orders (id, ref, customer_id, service, status, email, total_cents, vat_cents, lang, payment_status, created_at, payment_reminder_at)
           VALUES (?, ?, ?, 'catalog', 'received', ?, 12000, 0, 'nl', 'unpaid', datetime('now', '-${dagen} days'), ${herinnerd ? "datetime('now','-10 days')" : 'NULL'})`, oid, `VIS-N-${oid}`, klant(), `n${oid}@voorbeeld.test`);
    }
  }
  for (let i = 0; i < 2; i++) sql("INSERT INTO subscriptions (customer_id, ref, plan, term, status, window_day, started_at, created_at, amount_cents) VALUES (?, ?, 'studio', 'prepaid', 'active', 1, datetime('now','-40 days'), datetime('now','-40 days'), 79000)", klant(), `SUB-V-${i}`);
  sql("INSERT INTO app_settings (key, value) VALUES ('backup_last_run', ?)", new Date().toISOString().slice(0, 16).replace('T', ' '));
  const terug = stil();
  try {
    await cron.scheduled({}, { DB: hard(d1(db)), UPLOADS: { async list() { return { objects: [] }; } }, MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', PURGE_ENABLED: 'false', WORKERS_PLAN: 'gratis', FROM_EMAIL: 'X <x@voorbeeld.test>' }, { waitUntil() {} });
  } finally { terug(); }
  ok('beide vooruitbetaalde abonnementen hebben hun maand na één nacht', db.prepare('SELECT COUNT(DISTINCT subscription_id) AS n FROM subscription_months').get().n, 2);
  ok('… en de herinneringen begonnen ook (de rem stopt ze op tijd)', db.prepare('SELECT COUNT(*) AS n FROM orders WHERE payment_reminder_at IS NOT NULL AND created_at >= datetime(\'now\', \'-5 days\')').get().n > 0, true);
  ok('de hartslag is geschreven', Boolean(db.prepare("SELECT value FROM app_settings WHERE key = 'cron_last_run'").get()), true);
}

console.log('3 · releaseExpiredWindows: betaald tussen de SELECT en de batch');
{
  const db = vers();
  for (const id of [1, 2]) {
    db.prepare(`INSERT INTO orders (id, ref, service, status, email, lang, tier, window_start, window_end, window_expires_at, payment_status, created_at)
                VALUES (?, ?, 'catalog', 'received', 'w@voorbeeld.test', 'nl', 'attended', '2026-11-20', '2026-11-21', datetime('now', '-1 day'), 'unpaid', datetime('now', '-8 days'))`).run(id, `VIS-W-${id}`);
  }
  const echt = d1(db);
  /* Na de SELECT, vóór de batch: bestelling 2 wordt betaald (de webhook). */
  const tussen = {
    prepare(q) {
      const st = echt.prepare(q);
      if (!/FROM orders\s+WHERE tier = 'attended'/.test(q)) return st;
      return { ...st, async all(...a) { const r = await st.all(...a); db.prepare("UPDATE orders SET payment_status = 'paid', paid_at = datetime('now') WHERE id = 2").run(); return r; } };
    },
    batch: (l) => echt.batch(l),
  };
  const uit = await tasks.releaseExpiredWindows({ DB: tussen });
  ok('de taak meldt wat hij vond', /^2 vervallen reserveringen/.test(uit || ''), true);
  const regels = (id) => db.prepare("SELECT COUNT(*) AS n FROM order_events WHERE order_id = ? AND note LIKE 'Reservering %vrijgegeven%'").get(id).n;
  ok('de onbetaalde: venster leeg en één tijdlijnregel', [db.prepare('SELECT window_start FROM orders WHERE id = 1').get().window_start, regels(1)], [null, 1]);
  ok('de net betaalde: venster blijft en GEEN regel "betaaltermijn verstreken"', [db.prepare('SELECT window_start FROM orders WHERE id = 2').get().window_start, regels(2)], ['2026-11-20', 0]);
}

globalThis.fetch = echtFetch;
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
