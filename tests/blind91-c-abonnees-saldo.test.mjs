/*
 * /admin/abonnees IN TWEE QUERY'S — 9 november 2026 (ronde 91, C11)
 *
 * abonneesOverzicht() (src/lib/abonnees.js) vroeg creditSaldo() per klant: gemeten
 * 763 databaseverzoeken bij 200 abonnees, op een plan met een grens van 50 per
 * verzoek. Het scherm leest alleen `saldo` en `bevroren`. saldiVoorKlanten() geeft
 * die twee voor een lijst klanten in één batch per 90. Deze toets houdt vast dat
 * het per klant precies hetzelfde is als creditSaldo() — met levende, verlopen,
 * opgebruikte, bijgekochte, bevroren en vrijgegeven partijen — en dat het aantal
 * verzoeken niet meer met het aantal abonnees meegroeit.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { creditSaldo, saldiVoorKlanten } from '../src/lib/creditboek.js';
import { abonneesOverzicht } from '../src/lib/abonnees.js';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};
function teller(echt) {
  const t = { n: 0 };
  const st = (s) => ({ __echt: s, bind: (...a) => st(s.bind(...a)), first: async (...a) => { t.n++; return s.first(...a); }, all: async (...a) => { t.n++; return s.all(...a); }, run: async (...a) => { t.n++; return s.run(...a); } });
  return { t, db: { prepare: (q) => st(echt.prepare(q)), batch: async (l) => { t.n++; return echt.batch(l.map((x) => x.__echt || x)); } } };
}

console.log('\nVISUAILS — /admin/abonnees in twee query\'s (ronde 91, C11)\n');
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema laadt', mislukt, []);
const sql = (s, ...b) => db.prepare(s).run(...b);
const N = 150;
for (let c = 1; c <= N; c++) {
  sql("INSERT INTO customers (id, email, name, brand, country) VALUES (?, ?, 'Test', ?, 'NL')", c, `s${c}@voorbeeld.test`, `Merk ${c}`);
  sql(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at, created_at, amount_cents)
       VALUES (?, ?, ?, 'studio', ?, ?, 1, '2026-08-05 10:00:00', '2026-08-05 10:00:00', 79000)`, c, c, `SUB-S-${c}`, c % 4 ? 'monthly' : 'prepaid', ['active', 'paused', 'cancelled'][c % 3]);
  if (c % 5 === 0) continue;                                    /* een op de vijf heeft geen partijen */
  const p = (aantal, rest, vervalt, reden = 'termijn', soort = null, sleutel = null) =>
    sql('INSERT INTO credit_boek (customer_id, subscription_id, aantal, rest, vervalt_op, reden, soort, sleutel) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', c, c, aantal, rest, vervalt, reden, soort, sleutel);
  p(120, (c * 7) % 121, '2027-02-05');                          /* levend */
  p(60, 30, '2026-10-01');                                      /* verlopen: telt niet */
  p(40, 0, '2027-03-01');                                       /* opgebruikt */
  if (c % 3 === 0) p(25, 25, '2027-05-09', 'bijgekocht', 'bijgekocht');
  if (c % 7 === 0) {                                            /* bevroren en deels vrijgegeven */
    sql("INSERT INTO credit_boek (customer_id, aantal, reden, sleutel) VALUES (?, -50, 'bevroren', ?)", c, `bevroren:${c}`);
    if (c % 14 === 0) sql("INSERT INTO credit_boek (customer_id, aantal, rest, vervalt_op, reden, sleutel) VALUES (?, 20, 20, '2027-02-05', 'vrijgegeven', ?)", c, `vrijgegeven:${c}`);
  }
  sql("INSERT INTO credit_boek (customer_id, aantal, reden, order_ref) VALUES (?, -8, 'bestelling', 'VIS-X')", c);
}
const nu = new Date('2026-11-09T12:00:00Z');
const ids = Array.from({ length: N }, (_, i) => i + 1);
const { t, db: D } = teller(d1(db));
const bulk = await saldiVoorKlanten(D, [...ids, 3, 'x', null, 9999], nu);
const verschil = [];
let metSaldo = 0, metBevroren = 0;
for (const c of ids) {
  const s = await creditSaldo(d1(db), { customerId: c }, { nu });
  const b = bulk.get(c);
  if (s.saldo > 0) metSaldo++;
  if (s.bevroren > 0) metBevroren++;
  if (!b || b.saldo !== s.saldo || b.bevroren !== s.bevroren) verschil.push({ c, bulk: b, creditSaldo: { saldo: s.saldo, bevroren: s.bevroren } });
}
ok(`${N} klanten: saldo en bevroren gelijk aan creditSaldo()`, verschil.slice(0, 3), []);
ok(`… en er zat echt iets in (${metSaldo} met saldo, ${metBevroren} met bevroren credits)`, metSaldo > 50 && metBevroren > 5, true);
ok(`twee query's per 90 klanten in één batch: ${t.n} verzoeken voor ${N}`, t.n, Math.ceil(N / 90));
ok('een onbekende klant krijgt nul, een onzinnige id valt weg', [bulk.get(9999), bulk.has('x'), bulk.size], [{ saldo: 0, bevroren: 0 }, false, N + 1]);
ok('lege lijst: niets gevraagd', (await saldiVoorKlanten(D, [], nu)).size, 0);

const { t: t2, db: D2 } = teller(d1(db));
const overzicht = await abonneesOverzicht({ DB: D2 });
ok(`abonneesOverzicht(): ${t2.n} databaseverzoeken voor ${N} abonnees (was ±4 per abonnee)`, t2.n <= 4, true);
const per = new Map(overzicht.rijen ? overzicht.rijen.map((r) => [r.klantId, r.saldo]) : []);
const zelfde = [];
for (const c of [1, 7, 14, 21, 33]) {
  const s = await creditSaldo(d1(db), { customerId: c });
  if (per.has(c) && per.get(c) !== Math.max(0, Math.floor(s.saldo))) zelfde.push(c);
}
ok('het scherm toont per abonnee hetzelfde saldo als creditSaldo()', [per.size > 0, zelfde], [true, []]);

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
