/*
 * TEGOED AUTOMATISCH VERREKENEN — 29 september 2026
 *
 * Lucas: *"Ik wil namelijk wel dat credits automatisch bij een bevestigde order
 * worden afgeschreven."* Zie de kop van src/lib/tegoedVerrekening.js. Tegen het
 * echte schema.sql, met D1 op node:sqlite.
 *
 * Wat hier vast moet staan:
 *   · het tegoed dekt het TOTAAL incl. btw, nooit meer dan dat;
 *   · een onbetaalde, niet geannuleerde bestelling houdt haar tegoed vast (ook na een etmaal —
 *     ronde 8: anders was hetzelfde tegoed twee keer uit te geven),
 *     een oudere niet;
 *   · afboeken en terugboeken zijn idempotent (de webhook levert dubbel af);
 *   · de factuur is gedekt als betaling + tegoed het totaal halen;
 *   · een bestelling die helemaal met tegoed betaald is, staat op betaald en
 *     heeft een factuur;
 *   · /api/order verrekent ALLEEN voor de ingelogde klant met hetzelfde adres.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import {
  tegoedOpBestelling, teBetalenCents, tegoedSaldo, tegoedBeschikbaar, teVerrekenen,
  boekTegoedAf, boekTegoedTerug, tegoedAfgeboekt, tegoedTeruggeboekt,
} from '../src/lib/tegoedVerrekening.js';
import { betalingGedekt } from '../src/lib/invoice.js';
import { betaalVolledigMetTegoed } from '../src/lib/tegoedBetaling.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(64)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema laadt zonder fouten', mislukt.length, 0);
const env = { DB: d1(db) };

db.prepare("INSERT INTO customers (id, email, name) VALUES (1, 'a@merk.test', 'A')").run();
db.prepare("INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (1, 12100, 'Tegoed na annulering van VIS-OUD')").run();

const order = (id, ref, net, vat, tegoed, extra = '') => {
  db.prepare(`INSERT INTO orders (id, ref, customer_id, service, email, total_cents, vat_cents, details_json, lang ${extra ? ', created_at' : ''})
              VALUES (?, ?, 1, 'catalog', 'a@merk.test', ?, ?, ?, 'nl' ${extra ? ', ?' : ''})`)
    .run(...[id, ref, net, vat, JSON.stringify(tegoed ? { tegoed_cents: tegoed } : {}), ...(extra ? [extra] : [])]);
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
};

console.log('\nrekenen');
{
  ok('teVerrekenen: nooit meer dan het totaal', teVerrekenen(50000, 12100), 12100);
  ok('teVerrekenen: nooit meer dan het saldo', teVerrekenen(5000, 12100), 5000);
  ok('teVerrekenen: niets bij nul', teVerrekenen(0, 12100), 0);
  const o = { total_cents: 10000, vat_cents: 2100, details_json: JSON.stringify({ tegoed_cents: 6000 }) };
  ok('tegoedOpBestelling leest details_json', tegoedOpBestelling(o), 6000);
  ok('teBetalenCents = bruto min tegoed', teBetalenCents(o), 6100);
  ok('zonder tegoed: het hele bedrag', teBetalenCents({ total_cents: 10000, vat_cents: 2100 }), 12100);
  ok('een kapotte details_json is nul tegoed', tegoedOpBestelling({ details_json: '{kapot' }), 0);
}

console.log('\nreserveren');
{
  ok('saldo 121,00', await tegoedSaldo(env, 1), 12100);
  order(10, 'VIS-A', 10000, 2100, 6000);
  ok('een onbetaalde bestelling van nu houdt haar tegoed vast', await tegoedBeschikbaar(env, 1), 6100);
  ok('  maar niet voor zichzelf', await tegoedBeschikbaar(env, 1, { behalveOrderId: 10 }), 12100);
  order(11, 'VIS-OUD2', 10000, 2100, 6000, '2026-01-01 10:00:00');
  ok('een oude onbetaalde bestelling houdt het ook vast (geen dubbel gebruik)', await tegoedBeschikbaar(env, 1), 100);
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 11").run();
  ok('  tot ze geannuleerd is', await tegoedBeschikbaar(env, 1), 6100);
}

console.log('\nbetalen en afboeken');
{
  const o = db.prepare('SELECT * FROM orders WHERE id = 10').get();
  db.prepare("INSERT INTO payments (order_id, provider, external_id, status, amount_cents, currency) VALUES (10, 'mollie', 'tr_1', 'paid', 6100, 'EUR')").run();
  const dekking = await betalingGedekt(env, o);
  ok('betaling + tegoed dekt de factuur', dekking.gedekt, true);
  ok('  en telt het tegoed als binnen', dekking.binnen, 12100);
  ok('afboeken: 60,00', await boekTegoedAf(env, o), 6000);
  ok('afboeken nog een keer: niets (webhook dubbel)', await boekTegoedAf(env, o), 0);
  ok('saldo 61,00', await tegoedSaldo(env, 1), 6100);
  ok('tegoedAfgeboekt 60,00', await tegoedAfgeboekt(env, 10), 6000);
  ok('terugboeken na annulering: 60,00', await boekTegoedTerug(env, o), 6000);
  ok('terugboeken nog een keer: niets', await boekTegoedTerug(env, o), 0);
  ok('tegoedTeruggeboekt 60,00', await tegoedTeruggeboekt(env, 10), 6000);
  ok('saldo weer 121,00', await tegoedSaldo(env, 1), 12100);
}

console.log('\nhelemaal met tegoed');
{
  db.prepare("DELETE FROM orders WHERE id = 11").run();
  order(12, 'VIS-HEEL', 5000, 1050, 6050);
  const emmer = new Map();
  const env2 = { DB: d1(db), UPLOADS: { put: async (k, v) => { emmer.set(k, v); }, get: async (k) => (emmer.has(k) ? { arrayBuffer: async () => emmer.get(k) } : null) } };
  const gelukt = await betaalVolledigMetTegoed(env2, 12);
  ok('staat op betaald', gelukt, true);
  const rij = db.prepare('SELECT payment_status, payment_provider FROM orders WHERE id = 12').get();
  ok('  payment_status paid', rij.payment_status, 'paid');
  ok('  via tegoed', rij.payment_provider, 'tegoed');
  ok('  tegoed afgeboekt', await tegoedAfgeboekt(env2, 12), 6050);
  const factuur = db.prepare('SELECT status, snapshot_json FROM invoices WHERE order_id = 12').get();
  ok('  en er is een factuur', !!factuur, true);
  ok('  met het tegoed erop', JSON.parse(factuur?.snapshot_json || '{}').tegoedCents, 6050);
  ok('  en de pdf is gemaakt', factuur?.status, 'issued');
  ok('  tweede keer: niets', await betaalVolledigMetTegoed(env2, 12), false);
  const deel = order(13, 'VIS-DEEL', 50000, 10500, 1000);
  ok('een deel met tegoed wordt hier niet betaald', await betaalVolledigMetTegoed(env2, 13), false);
  void deel;
}

console.log('\n/api/order: alleen de ingelogde klant met hetzelfde adres');
{
  const bron = readFileSync(new URL('../functions/api/order.js', import.meta.url), 'utf8');
  ok('vergelijkt de sessieklant met de klant van de bestelling', /Number\(sessieKlant\.customer_id\) === Number\(customerId\)/.test(bron), true);
  ok('  en het e-mailadres', /normalizeEmail\(sessieKlant\.email\) === normalizeEmail\(email\)/.test(bron), true);
  ok('Mollie krijgt bruto min tegoed', /centsToMollieValue\(quote\.grossCents - tegoedCents\)/.test(bron), true);
  const acc = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');
  ok('/account/order geeft de sessieklant door', /path === '\/account\/order'[\s\S]{0,300}sessieKlant: \{ customer_id: customer\.customer_id, email: customer\.email \}/.test(acc), true);
  const pipe = readFileSync(new URL('../src/scripts/pipeline.js', import.meta.url), 'utf8');
  ok('het formulier kiest /account/order voor een ingelogde klant', /ingelogdBestellen \? '\/account\/order' : '\/api\/order'/.test(pipe), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
