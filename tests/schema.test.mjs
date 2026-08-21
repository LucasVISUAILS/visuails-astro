/* VISUAILS — schema.sql en de migraties beschrijven dezelfde database.
 *
 *   npm run test:schema
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De kop van schema.sql zegt het zelf, en heeft het jarenlang zelf niet gehaald:
 *
 *   "THIS FILE IS FOR A FRESH DATABASE. (…) Anything added here must also be added
 *    there, or a fresh install and a live install stop agreeing."
 *
 * Op 9 augustus 2026 stopte het bestand bij migratie 0017. Zes migraties waren niet
 * meegegroeid: alle twaalf orderkolommen van de btw-poort, `channels`, en vier hele
 * tabellen — `order_feedback`, `invoice_series`, `invoices` en `file_assets`. Zonder
 * die laatste twee valt `issueInvoice()` meteen om, dus zou de factuurstap bij ELKE
 * betaling mislukken op een database die met dit bestand was opgezet.
 *
 * Dat is geen dringend probleem zolang de live database bestaat. Het is een tijdbom
 * die afgaat op de dag dat je hem het hardst nodig hebt: bij herstel na een storing.
 *
 * ── EN DE TEST VOND METEEN MEER DAN IK HAD TOEGEVOEGD ──────────────────────
 *
 * Bij de eerste run bleek er ook iets uit migratie 0010 te missen: drie indexen op
 * `revision_requests`. De tabel stond er wel, de indexen niet. Een verse database zou
 * dus werken en bij elke revisielijst in het adminportaal een volledige tabelscan
 * doen — het soort verschil dat pas opvalt als "het dashboard is traag geworden".
 *
 * Dat is precies waarom dit een test moet zijn en geen zorgvuldigheid: ik had de zes
 * migraties waarvan ik WIST dat ze misten netjes toegevoegd, en de zevende gemist.
 *
 * ── HOE HET WERKT ──────────────────────────────────────────────────────────
 *
 * Twee databases in het geheugen, allebei opgezet met schema.sql. Over de tweede gaan
 * daarna ALLE migraties heen. Wat de migraties dan nog toevoegen, is precies wat
 * schema.sql mist — en "duplicate column" of "already exists" is juist het bewijs dat
 * het er al stond.
 *
 * node:sqlite en niet D1: D1 IS SQLite, en dit gaat over de vorm van het schema en
 * niet over het gedrag van een binding.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(60)} ${ok ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/*
 * Deze ene tabel hoort NIET in schema.sql, en dat is geen omissie.
 *
 * `customer_style_locks_pre0007` is de reservekopie die migratie 0007 maakt bij het
 * herbouwen van die tabel (`ALTER TABLE … RENAME TO …_pre0007`). Die migratie zegt er
 * zelf bij: controleer de oude telling en laat de tabel daarna vallen. Een verse
 * database heeft dus nooit iets om van te herstellen en hoort hem niet te hebben.
 */
const MIGRATION_ONLY = ['customer_style_locks_pre0007'];

const fresh = () => {
  const db = new DatabaseSync(':memory:');
  db.exec(read('schema.sql'));
  return db;
};

const shape = (db) => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
  const columns = {};
  for (const t of tables) columns[t] = db.prepare(`PRAGMA table_info(${t})`).all().map((r) => r.name).sort();
  return { tables, indexes, columns };
};

/* ══ 1 · schema.sql DRAAIT ══════════════════════════════════════════════════
 * Klinkt triviaal en is het niet: dit bestand wordt bijna nooit uitgevoerd, want de
 * live database bestaat al. Een typefout erin blijft daardoor jaren onopgemerkt.
 */
console.log('\nschema.sql draait op een verse database');
let base;
{
  let error = null;
  try { base = fresh(); } catch (err) { error = err?.message || String(err); }
  check('geen fout bij uitvoeren', error, null);
  if (!base) { console.log('\nafgebroken'); process.exit(1); }
  const { tables } = shape(base);
  check('er staan tabellen in', tables.length > 20, true);
  check('en de vier die het laatst misten', ['file_assets', 'invoices', 'invoice_series', 'order_feedback'].every((t) => tables.includes(t)), true);
}

/* ══ 2 · DE MIGRATIES VOEGEN NIETS MEER TOE ═════════════════════════════════ */
console.log('\nde migraties hebben niets meer toe te voegen');
{
  const after = fresh();
  const files = readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort();
  check('er zijn migraties gevonden', files.length > 20, true);

  const unexplained = [];
  for (const f of files) {
    const body = read(`migrations/${f}`).replace(/^\s*--.*$/gm, '');
    for (const raw of body.split(';')) {
      const stmt = raw.trim();
      if (!stmt) continue;
      try {
        after.exec(stmt);
      } catch (err) {
        const msg = String(err?.message || '');
        // Dít is het gewenste resultaat: schema.sql had het al.
        if (/duplicate column|already exists/i.test(msg)) continue;
        unexplained.push(`${f}: ${stmt.split('\n')[0].slice(0, 60)} → ${msg}`);
      }
    }
  }
  check('geen statement dat om een andere reden niet liep', unexplained, []);

  const a = shape(base);
  const b = shape(after);
  check('geen tabel die alleen de migraties maken',
    b.tables.filter((t) => !a.tables.includes(t) && !MIGRATION_ONLY.includes(t)), []);
  check('geen index die alleen de migraties maken',
    b.indexes.filter((i) => !a.indexes.includes(i)), []);

  const missingCols = [];
  for (const t of b.tables) {
    if (MIGRATION_ONLY.includes(t)) continue;
    for (const c of b.columns[t]) {
      if (!(a.columns[t] || []).includes(c)) missingCols.push(`${t}.${c}`);
    }
  }
  check('geen kolom die alleen de migraties toevoegen', missingCols, []);
}

/* ══ 3 · DE KOLOMMEN DIE DE CODE ECHT GEBRUIKT, BESTAAN ═════════════════════
 *
 * Sectie 2 vergelijkt schema.sql met de migraties. Deze sectie vergelijkt schema.sql
 * met de WERKELIJKHEID: de kolommen waar de code op rekent. Zonder deze sectie zou een
 * kolom die in geen van beide staat, in beide onopgemerkt blijven.
 */
console.log('\nde kolommen waar de code op rekent, staan erin');
{
  const { columns } = shape(base);
  const need = {
    orders: ['review_state', 'review_reason', 'origin_country', 'vat_cents', 'total_cents',
             'window_start', 'window_end', 'window_expires_at', 'payment_status', 'closed_at', 'tier'],
    files: ['expires_at', 'preview_key', 'announced_at', 'superseded_at', 'review_state', 'kind'],
    invoices: ['number', 'status', 'pdf_key', 'snapshot_json', 'issued_at'],
    file_assets: ['file_id', 'format', 'r2_key'],
    order_feedback: ['testimonial_approved', 'testimonial_consent', 'asked_at'],
    /* Migratie 0032 — de factuur op een abonnementstermijn. De tabel hangt aan
       `subscription_payments` met een UNIEKE sleutel; dat is de idempotentie waar
       de webhook op leunt als Mollie dezelfde melding twee keer aflevert. */
    subscription_invoices: ['number', 'year', 'seq', 'subscription_id',
                            'subscription_payment_id', 'month', 'status', 'snapshot_json'],
    subscriptions: ['vat_treatment', 'vat_rate', 'vat_country', 'vat_number', 'status', 'plan'],
  };
  for (const [table, cols] of Object.entries(need)) {
    const have = columns[table] || [];
    check(`${table}: alle verwachte kolommen`, cols.filter((c) => !have.includes(c)), []);
  }
}

/* ══ 4 · DE KOP VAN HET BESTAND KLOPT NOG ═══════════════════════════════════
 * Een bestand dat over zichzelf iets onwaars zegt, is erger dan een bestand zonder
 * uitleg — want dan vertrouwt de volgende lezer de uitleg.
 */
console.log('\nhet bestand zegt zelf wat het is');
{
  const head = read('schema.sql').slice(0, 1400);
  check('het zegt dat het voor een verse database is', /FRESH DATABASE/i.test(head), true);
  check('en dat wijzigingen ook in migrations/ horen', /migrations\//.test(head), true);
  // De hoogste migratie moet in schema.sql genoemd zijn, zodat "tot hoever loopt dit
  // bestand" te lezen is zonder de tabellen te vergelijken.
  const files = readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort();
  const highest = files[files.length - 1].slice(0, 4);
  check(`de hoogste migratie (${highest}) wordt genoemd`, read('schema.sql').includes(highest), true);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
