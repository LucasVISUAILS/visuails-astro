/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE ZEVEN FOUTEN VAN DE NACHT VAN 20 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run test:nazicht
 *
 * ── WAAROM DIT BESTAND BESTAAT ──────────────────────────────────────────────
 *
 * Op 20 augustus 2026 ging er een tegenlezing over de abonnements- en beheercode
 * die diezelfde dag geschreven was. Alle bestaande suites stonden op groen —
 * 3096 assertions — en de tegenlezing vond er zeven die stuk voor stuk geld of
 * gegevens kostten. Dat is geen toeval en geen pech, en het is de moeite waard
 * om op te schrijven WAAROM de bestaande tests ze niet zagen:
 *
 *   · tests/geldroute.test.mjs zet `vat_treatment` met de hand in het fixture
 *     ('nl_standard', want dat is wat er hoort te staan) in plaats van de rij
 *     door createSubscriptionRow() te laten schrijven. De test controleerde dus
 *     de rekensom en niet wie de invoer levert — en de fout zat in de invoer.
 *   · tests/wipe.test.mjs heeft een klant zonder abonnementsfactuur, dus de
 *     vreemde sleutel die de wisknop deed omvallen kwam er nooit aan te pas.
 *   · Het merkmodel-tegoed, stuurBetaallink() en cancelStaleApprovals() hadden
 *     samen nul assertions.
 *
 * Eén regel loopt door alle drie: een test die zijn eigen invoer verzint, toetst
 * de helft die hij zelf al goed heeft ingevuld. Elke controle hieronder loopt
 * daarom door de ECHTE functie heen, op een ECHTE database uit schema.sql, met
 * `PRAGMA foreign_keys = ON` — want vier van de zeven bestaan alleen omdat een
 * database iets weigert, en een database die nooit iets weigert vindt ze niet.
 */

import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { VAT_TREATMENT } from '../src/data/vat.js';
import { VAT_RATE } from '../src/lib/quote.js';
import { AMOUNT, BRAND_MODEL_CREDIT_DROPS } from '../src/data/pricing.js';
import { vatVoorAbonnement, createSubscriptionRow } from '../src/lib/subscription.js';
import { snapshotFromSubscription } from '../src/lib/invoice.js';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true) {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) { geslaagd++; console.log(`  ok   ${naam}`); }
  else { gezakt++; console.log(`FAIL  ${naam}    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`); }
}

function verseOmgeving() {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) {
    console.error('schema.sql laadt niet:\n' + mislukt.join('\n'));
    process.exit(1);
  }
  return { db, env: { DB: d1(db) } };
}

const klant = (db, { email = 'mara@voorbeeld.nl', adres = 'Voorbeeldstraat 12\n1234 AB Rotterdam' } = {}) => {
  db.prepare('INSERT INTO customers (email, name, brand, billing_address, country) VALUES (?, ?, ?, ?, ?)')
    .run(email, 'Mara de Groot', 'VOLT', adres, 'NL');
  return Number(telling(db, 'SELECT id FROM customers WHERE email = ?', email));
};

/* ═══ 1 · DE BTW OP EEN ABONNEMENT VAN EEN NEDERLANDSE KLANT ══════════════════
 *
 * vatVoorAbonnement() gaf `treatment: 'standard'` terug als terugval. De constante
 * heet VAT_TREATMENT.standard maar dráágt de waarde 'nl_standard', en de
 * momentopname vergelijkt met de constante. 'standard' === 'nl_standard' is false,
 * dus rate 0, dus € 0,00 btw op elke abonnementsfactuur van elke Nederlandse
 * abonnee — de enige groep die 21% verschuldigd is.
 *
 * De terugval is precies het Nederlandse geval: een NL-klant heeft nooit een
 * `vat_consultation`, want die vult alleen VIES in bij een buitenlands EU-nummer.
 */
console.log('\n1 · een Nederlandse abonnee betaalt 21% en niet 0%');
{
  const { db, env } = verseOmgeving();
  const id = klant(db);

  const btw = await vatVoorAbonnement(env, id);
  ok('zonder VIES-bestelling is de behandeling nl_standard', btw.treatment, VAT_TREATMENT.standard);
  ok('en niet de letterlijke tekst "standard"', btw.treatment === 'standard', false);
  ok('met het volle tarief', btw.rate, VAT_RATE);

  const { row } = await createSubscriptionRow(env, { customerId: id, planId: 'starter', termId: 'monthly' });
  ok('en dat is ook wat er in de abonnementsrij belandt',
    telling(db, 'SELECT vat_treatment FROM subscriptions WHERE id = ?', row.id), VAT_TREATMENT.standard);

  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(row.id);
  const snap = snapshotFromSubscription(
    { sub, customer: db.prepare('SELECT * FROM customers WHERE id = ?').get(id),
      payment: { amount_cents: 47190, currency: 'EUR' }, month: '2026-08', lang: 'nl' },
    env, { number: 'VIS-2026-0001', date: '2026-08-20' }
  );
  ok('de factuur draagt 21%', snap.vatRate, VAT_RATE);
  ok('en een btw-bedrag dat niet nul is', snap.vatCents > 0, true);
  ok('netto plus btw is precies het bedrag dat geïncasseerd is', snap.netCents + snap.vatCents, 47190);

  /* En de andere kant blijft heel: een EU-bedrijf met een geldig nummer houdt
     verlegde btw, want dat is wat er in de bestelling stond. */
  const id2 = klant(db, { email: 'kunde@beispiel.de' });
  db.prepare(
    `INSERT INTO orders (ref, service, email, lang, customer_id, payment_status, paid_at,
                         vat_treatment, vat_rate, country, vat_number, vat_consultation)
     VALUES ('VIS-1', 'catalog', 'kunde@beispiel.de', 'en', ?, 'paid', '2026-08-01',
             'eu_reverse_charge', 0, 'DE', 'DE123456789', '{"valid":true}')`
  ).run(id2);
  const btw2 = await vatVoorAbonnement(env, id2);
  ok('een EU-bedrijf met VIES-bewijs houdt verlegde btw', btw2.treatment, 'eu_reverse_charge');
  ok('tegen 0%', btw2.rate, 0);
}

/* ═══ 2 · HET ADRES OP DE ABONNEMENTSFACTUUR ══════════════════════════════════
 *
 * Er stond `composeAddress(addressFrom(customer.billing_address))`. addressFrom()
 * geeft een ARRAY terug en composeAddress() verwacht een OBJECT met line1, line2,
 * postal, city en region — dus werden alle velden undefined, gaf composeAddress()
 * null terug, en ging elke abonnementsfactuur zonder adresregel de deur uit.
 * Stil, want een leeg adres ziet er in de code uit als "deze klant heeft er geen".
 */
console.log('\n2 · het adres van de klant staat op de abonnementsfactuur');
{
  const { db, env } = verseOmgeving();
  const id = klant(db);
  const { row } = await createSubscriptionRow(env, { customerId: id, planId: 'starter', termId: 'monthly' });
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(row.id);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);

  const snap = snapshotFromSubscription(
    { sub, customer, payment: { amount_cents: 47190, currency: 'EUR' }, month: '2026-08', lang: 'nl' },
    env, { number: 'VIS-2026-0001', date: '2026-08-20' }
  );
  ok('twee adresregels, geen lege lijst', snap.customer.address, ['Voorbeeldstraat 12', '1234 AB Rotterdam']);
  ok('en de naam staat er ook op', snap.customer.name, 'Mara de Groot');

  /* Een klant zonder adres geeft een lege lijst en geen exceptie — dat is het
     verschil tussen "geen adres bekend" en "de code kijkt op de verkeerde plek". */
  const id2 = klant(db, { email: 'leeg@voorbeeld.nl', adres: null });
  const snap2 = snapshotFromSubscription(
    { sub, customer: db.prepare('SELECT * FROM customers WHERE id = ?').get(id2),
      payment: { amount_cents: 100, currency: 'EUR' }, month: '2026-08', lang: 'nl' },
    env, { number: 'VIS-2026-0002', date: '2026-08-20' }
  );
  ok('een klant zonder adres geeft een lege lijst', snap2.customer.address, []);
}

/* ═══ 3 · DE TAAL VAN DE ABONNEMENTSFACTUUR ═══════════════════════════════════
 *
 * De taal werd uit `customer.lang` gelezen. Die kolom bestaat niet in `customers`
 * — de vergelijking was dus altijd `undefined === 'en'` en elke abonnementsfactuur
 * stond in het Nederlands, ook voor een klant van wie de bestelfacturen uit
 * dezelfde nummerreeks in het Engels zijn.
 */
console.log('\n3 · de taal komt van buiten en niet uit een kolom die niet bestaat');
{
  const { db } = verseOmgeving();
  const kolommen = db.prepare("SELECT name FROM pragma_table_info('customers')").all().map((r) => r.name);
  ok('customers heeft inderdaad geen lang-kolom', kolommen.includes('lang'), false);

  const sub = { plan: 'starter', vat_treatment: VAT_TREATMENT.standard, vat_rate: VAT_RATE };
  const payment = { amount_cents: 47190, currency: 'EUR' };
  const en = snapshotFromSubscription({ sub, customer: {}, payment, month: '2026-08', lang: 'en' },
    {}, { number: 'VIS-2026-0001', date: '2026-08-20' });
  const nl = snapshotFromSubscription({ sub, customer: {}, payment, month: '2026-08', lang: 'nl' },
    {}, { number: 'VIS-2026-0002', date: '2026-08-20' });
  ok('en geeft Engels als de aanroeper Engels zegt', en.lang, 'en');
  ok('en Nederlands als hij niets zegt',
    snapshotFromSubscription({ sub, customer: {}, payment, month: '2026-08' }, {}, { number: 'x', date: '2026-08-20' }).lang, 'nl');
  ok('de maand staat in de taal van de factuur', en.lines[0].description.includes('August'), true);
  ok('en in het Nederlands ook', nl.lines[0].description.includes('augustus'), true);
}

/* ═══ 4 · HET MERKMODEL-TEGOED, IN CENTEN EN ÉÉN KEER ═════════════════════════
 *
 * `AMOUNT.brandModelCredit * BRAND_MODEL_CREDIT_DROPS` ging rechtstreeks in
 * `delta_cents`. AMOUNT is in EURO'S: 250 × 5 = 1250, en 1250 cent is € 12,50 —
 * een honderdste van het tegoed, met een reden ernaast die € 1.250 belooft.
 *
 * Deze controle rekent de eenheid uit de kolom zelf terug in plaats van 125000
 * over te typen: zou AMOUNT.brandModel ooit veranderen, dan verandert de
 * verwachting mee en blijft de bewering "het tegoed is het hele setupbedrag".
 */
console.log('\n4 · het merkmodel-tegoed staat in centen');
{
  ok('AMOUNT is in euro\'s en niet in centen', AMOUNT.brandModelCredit, 250);
  const verwacht = Math.round(AMOUNT.brandModelCredit * BRAND_MODEL_CREDIT_DROPS * 100);
  ok('het tegoed is het hele setupbedrag, in centen', verwacht, Math.round(AMOUNT.brandModel * 100));
  ok('en dus niet 1250', verwacht === 1250, false);

  /* De poort zit op het grootboek en niet op het aantal modellen — want modellen
     worden echt verwijderd (handleModelManage doet een DELETE) en dan staat de
     teller weer op nul. Deze controle bootst dat na op de echte tabellen. */
  const { db } = verseOmgeving();
  const id = klant(db);
  const boek = () => {
    const al = db.prepare("SELECT id FROM customer_credits WHERE customer_id = ? AND reason LIKE 'Merkmodel-setup%' LIMIT 1").get(id);
    if (al) return false;
    db.prepare('INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (?, ?, ?)')
      .run(id, verwacht, 'Merkmodel-setup — € 250 verrekenbaar op elk van je eerste 5 bestellingen');
    return true;
  };
  db.prepare("INSERT INTO custom_models (customer_id, label, status) VALUES (?, 'Nova', 'in_design')").run(id);
  ok('het eerste model boekt het tegoed', boek(), true);
  db.prepare('DELETE FROM custom_models WHERE customer_id = ?').run(id);
  db.prepare("INSERT INTO custom_models (customer_id, label, status) VALUES (?, 'Nova', 'in_design')").run(id);
  ok('opnieuw toevoegen na een verwijderde tikfout boekt niets extra', boek(), false);
  ok('één regel in het grootboek', telling(db, 'SELECT COUNT(*) FROM customer_credits WHERE customer_id = ?', id), 1);
  ok('en het saldo is het hele setupbedrag',
    telling(db, 'SELECT SUM(delta_cents) FROM customer_credits WHERE customer_id = ?', id), Math.round(AMOUNT.brandModel * 100));
}

/* ═══ 5 · DE NACHTTAAK LAAT AANVRAGEN MET RUST ════════════════════════════════
 *
 * cancelStaleApprovals() selecteerde op `review_state='approved'` plus onbetaald.
 * Een aanvraag voor een merkmodel, een video of een look op maat gaat via
 * hetzelfde formulier de orders-tabel in, heeft geen prijs per product (dus
 * `total_cents IS NULL`) en gaat altijd door de btw-beoordeling. Zeven dagen na
 * de goedkeuring kreeg zo'n lead dus een mail dat zijn bestelling was vervallen
 * omdat hij niet betaald had. Er was nooit iets te betalen.
 */
console.log('\n5 · de nachttaak vervalt alleen wat te betalen viel');
{
  const { db } = verseOmgeving();
  const zet = (ref, service, total) => db.prepare(
    `INSERT INTO orders (ref, service, email, lang, status, payment_status, review_state, reviewed_at, total_cents, vat_cents)
     VALUES (?, ?, 'mara@voorbeeld.nl', 'nl', 'received', 'unpaid', 'approved', datetime('now','-9 days'), ?, 0)`
  ).run(ref, service, total);
  zet('VIS-BETAALBAAR', 'catalog', 195000);
  zet('VIS-AANVRAAG', 'custom', null);
  zet('VIS-VIDEO', 'video', null);

  const SQL = `SELECT ref FROM orders
                WHERE review_state = 'approved'
                  AND COALESCE(payment_status, 'unpaid') = 'unpaid'
                  AND COALESCE(total_cents, 0) > 0
                  AND reviewed_at IS NOT NULL
                  AND reviewed_at <= datetime('now', '-7 days')
                  AND status NOT IN ('cancelled', 'delivered')
                ORDER BY id`;
  ok('alleen de bestelling met een bedrag', db.prepare(SQL).all().map((r) => r.ref), ['VIS-BETAALBAAR']);

  /* En de leeftijdsgrens doet nog steeds wat hij zegt. */
  db.prepare("UPDATE orders SET reviewed_at = datetime('now','-3 days') WHERE ref = 'VIS-BETAALBAAR'").run();
  ok('drie dagen oud is nog niet vervallen', db.prepare(SQL).all().length, 0);

  /* De hercontrole in de UPDATE: wie tussen de SELECT en de UPDATE betaalt, houdt
     zijn bestelling — en hoort dus ook geen tijdlijnregel en geen mail te krijgen. */
  db.prepare("UPDATE orders SET reviewed_at = datetime('now','-9 days'), payment_status = 'paid' WHERE ref = 'VIS-BETAALBAAR'").run();
  const uit = db.prepare(
    `UPDATE orders SET status = 'cancelled'
      WHERE ref = 'VIS-BETAALBAAR' AND COALESCE(payment_status, 'unpaid') = 'unpaid'`
  ).run();
  ok('de hercontrole raakt de betaalde bestelling niet', Number(uit.changes), 0);
  ok('en die staat dus niet op geannuleerd',
    telling(db, "SELECT status FROM orders WHERE ref = 'VIS-BETAALBAAR'"), 'received');
}

/* ═══ 6 · EEN RESTITUTIE VRAAGT WAT ER NOG OPENSTAAT ══════════════════════════
 *
 * De annuleerknop vroeg Mollie om het hele brutobedrag van de bestelling, zonder
 * naar `orders.refunded_cents` te kijken. Bij een gedeeltelijke restitutie blijft
 * `payment_status` bewust op 'paid' staan, dus is dat een bestaand geval — en dan
 * weigert Mollie het verzoek en blijft er niets terugbetaald, terwijl de tijdlijn
 * de klant al beloofd heeft dat het geld komt.
 */
console.log('\n6 · een tweede restitutie vraagt alleen het restant');
{
  const { db } = verseOmgeving();
  db.prepare(
    `INSERT INTO orders (ref, service, email, lang, status, payment_status, total_cents, vat_cents, refunded_cents)
     VALUES ('VIS-DEEL', 'catalog', 'mara@voorbeeld.nl', 'nl', 'received', 'paid', 100000, 21000, 20000)`
  ).run();
  const o = db.prepare("SELECT * FROM orders WHERE ref = 'VIS-DEEL'").get();
  const betaald = (Number(o.total_cents) || 0) + (Number(o.vat_cents) || 0);
  const bruto = Math.max(0, betaald - Math.max(0, Number(o.refunded_cents) || 0));
  ok('betaald was € 1.210', betaald, 121000);
  ok('en er staat nog € 1.010 open', bruto, 101000);
  ok('en niet het hele bedrag', bruto === betaald, false);

  db.prepare("UPDATE orders SET refunded_cents = 121000 WHERE ref = 'VIS-DEEL'").run();
  const o2 = db.prepare("SELECT * FROM orders WHERE ref = 'VIS-DEEL'").get();
  const rest = Math.max(0, betaald - Number(o2.refunded_cents));
  ok('volledig terugbetaald geeft nul', rest, 0);
  ok('en nul valt in de tak "hier niets te starten"', rest > 0, false);
}

/* ═══ 7 · DE AVG-WISKNOP OVERLEEFT EEN ABONNEMENTSFACTUUR ═════════════════════
 *
 * subscription_invoices verwees eerst met ON DELETE RESTRICT naar subscriptions
 * én naar subscription_payments. handleCustomerWipe() verwijdert allebei, in één
 * batch — dus één abonnee met één factuur liet de hele wisknop terugdraaien: geen
 * bestellingen gewist, geen logregel, en de R2-bestanden in stap 2 al weg.
 *
 * Deze controle draait de echte DELETE-volgorde met foreign keys AAN. Dat is het
 * hele punt: met een neptabel-database die niets weigert, is dit groen met of
 * zonder reparatie.
 */
console.log('\n7 · een klant met een abonnementsfactuur is te wissen');
{
  const { db, env } = verseOmgeving();
  const id = klant(db);
  const { row } = await createSubscriptionRow(env, { customerId: id, planId: 'starter', termId: 'monthly' });
  db.prepare(
    `INSERT INTO subscription_payments (subscription_id, external_id, status, amount_cents, month)
     VALUES (?, 'tr_test0001', 'paid', 47190, '2026-08')`
  ).run(row.id);
  const betalingId = Number(telling(db, "SELECT id FROM subscription_payments WHERE external_id = 'tr_test0001'"));
  db.prepare(
    `INSERT INTO subscription_invoices (number, year, seq, subscription_id, subscription_payment_id,
                                        customer_id, month, status, snapshot_json, lang, pdf_key, issued_at)
     VALUES ('VIS-2026-0001', 2026, 1, ?, ?, ?, '2026-08', 'issued', '{}', 'nl', 'invoices/2026/VIS-2026-0001.pdf', '2026-08-20')`
  ).run(row.id, betalingId, id);
  ok('er staat één abonnementsfactuur', telling(db, 'SELECT COUNT(*) FROM subscription_invoices'), 1);

  let fout = null;
  try {
    db.exec('BEGIN');
    db.prepare('DELETE FROM subscription_payments WHERE subscription_id IN (SELECT id FROM subscriptions WHERE customer_id = ?)').run(id);
    db.prepare('DELETE FROM subscription_months WHERE subscription_id IN (SELECT id FROM subscriptions WHERE customer_id = ?)').run(id);
    db.prepare('DELETE FROM plan_queue WHERE customer_id = ?').run(id);
    db.prepare('DELETE FROM subscriptions WHERE customer_id = ?').run(id);
    db.prepare('DELETE FROM customer_credits WHERE customer_id = ?').run(id);
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    db.exec('COMMIT');
  } catch (e) { fout = String(e.message); db.exec('ROLLBACK'); }

  ok('de wisvolgorde loopt zonder foreign-key-fout', fout, null);
  ok('de klant is weg', telling(db, 'SELECT COUNT(*) FROM customers WHERE id = ?', id), 0);
  ok('het abonnement is weg', telling(db, 'SELECT COUNT(*) FROM subscriptions'), 0);
  ok('de factuur staat er nog — die is het bewijsstuk', telling(db, 'SELECT COUNT(*) FROM subscription_invoices'), 1);
  ok('met haar pdf', telling(db, 'SELECT pdf_key FROM subscription_invoices'), 'invoices/2026/VIS-2026-0001.pdf');
  ok('zonder klant erachter', telling(db, 'SELECT customer_id FROM subscription_invoices'), null);
  ok('en zonder abonnement erachter', telling(db, 'SELECT subscription_id FROM subscription_invoices'), null);
}

/* ── WAT HIER NIET IN ZIT, EN WAAROM ────────────────────────────────────────
 *
 * De aanroepende functies zelf — handleOrderCancel(), boekMerkmodelTegoed() en
 * cancelStaleApprovals() — worden hierboven niet aangeroepen maar nagebouwd: hun
 * SQL en hun rekensom staan er letterlijk in. Dat is bewust en het is een
 * ZWAKKERE bewering dan een aanroep, dus het hoort erbij te staan. Alle drie
 * hangen aan een Request, een adminsessie of een cron-omgeving, en een stub
 * daarvan bouwen die klopt is meer werk dan deze zeven controles samen — met het
 * risico dat de stub gaat afwijken van de echte en de test groen blijft om de
 * verkeerde reden.
 *
 * Wat hier wél echt door de code loopt, loopt er ook echt doorheen:
 * vatVoorAbonnement(), createSubscriptionRow() en snapshotFromSubscription()
 * worden aangeroepen, op een database uit schema.sql met foreign keys aan. Dat
 * zijn de drie waar het geld doorheen gaat.
 */

console.log(`\n${geslaagd}/${geslaagd + gezakt} geslaagd`);
if (gezakt) process.exitCode = 1;
