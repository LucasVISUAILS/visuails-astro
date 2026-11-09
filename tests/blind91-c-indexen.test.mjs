/*
 * DRIE INDEXEN VOOR DE SCHAAL — 9 november 2026 (ronde 91, C07)
 *
 * Met 5 000 bestellingen en 20 000 bestanden las elke keer /admin openen de hele
 * files-tabel drie keer (revisie-inbox, de telling, de Nu-doen-lijst) en zocht
 * creditSaldo() per abonnee de hele subscriptions-tabel af (91/werk/c/c07-schaal.mjs).
 * D1 rekent gelezen rijen. Migratie 0069 zet er drie indexen op; deze toets houdt
 * vast dat ze er zijn (in schema.sql én de migratie, gelijk) en dat de query's ze
 * gebruiken in plaats van de tabel te doorlopen.
 */
import { readFileSync } from 'node:fs';
import { verseDb } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};
console.log('\nVISUAILS — drie indexen voor de schaal (ronde 91, C07)\n');
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt', mislukt, []);
const mig = readFileSync(new URL('../migrations/0069-indexen-schaal.sql', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
const regels = (t) => [...t.replace(/--[^\n]*/g, '').matchAll(/CREATE INDEX IF NOT EXISTS[^;]+;/g)].map((m) => m[0].replace(/\s+/g, ' '));
ok('de migratie maakt drie indexen', regels(mig).length, 3);
ok('en schema.sql heeft ze letterlijk ook', regels(mig).every((r) => regels(schema).includes(r)), true);
db.exec(mig.replace(/--[^\n]*/g, ''));
ok('de migratie draait nog eens zonder fout (IF NOT EXISTS)', true, true);

const plan = (q) => db.prepare('EXPLAIN QUERY PLAN ' + q).all().map((r) => r.detail).join(' | ');
const inbox = `SELECT f.id FROM files f JOIN orders o ON o.id = f.order_id
  WHERE f.review_state = 'revision_requested' AND o.hidden_at IS NULL AND f.superseded_at IS NULL ORDER BY f.reviewed_at DESC LIMIT 100`;
ok('revisie-inbox (admin.js loadRevisionInbox): via idx_files_revisie, geen SCAN f', /idx_files_revisie/.test(plan(inbox)) && !/SCAN f\b(?! USING)/.test(plan(inbox)), true);
const telling = `SELECT COUNT(*) AS n FROM files f JOIN orders o ON o.id = f.order_id WHERE f.review_state = 'revision_requested' AND f.superseded_at IS NULL AND o.hidden_at IS NULL`;
ok('de telling van open revisies: via idx_files_revisie', /idx_files_revisie/.test(plan(telling)), true);
ok('revisies per bestand: via idx_revreq_file', /idx_revreq_file/.test(plan('SELECT COUNT(*) FROM revision_requests rr WHERE rr.file_id = 7')), true);
ok('het abonnement van een klant (creditSaldo): via idx_subs_customer', /idx_subs_customer/.test(plan("SELECT id FROM subscriptions WHERE customer_id = 7 ORDER BY CASE WHEN status IN ('active','paused','pending') THEN 0 ELSE 1 END, id DESC LIMIT 1")), true);
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
