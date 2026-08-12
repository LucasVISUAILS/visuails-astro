/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE CREDITNOTA — HET ENIGE DOCUMENT DAT GELD TERUGNEEMT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tot 12 augustus 2026 kende src/lib/invoice.js het woord "refund" niet. De webhook
 * boekte een terugbetaling wel — `orders.refunded_cents` ging omhoog, er kwam een regel
 * op de tijdlijn — maar de uitgereikte factuur bleef op het volle bedrag staan. Vanaf de
 * eerste terugbetaling stond er dus een factuur van bijvoorbeeld € 1.101,10 tegenover
 * geld dat terug was.
 *
 * Deze test draait issueCreditNote() tegen het ECHTE schema.sql, met D1 op node:sqlite,
 * een emmer in het geheugen en de ECHTE pdf-renderer. Niet een nagebootste nummergever,
 * want de nummerreeks is het enige in dit bestand dat je niet kunt repareren nadat het
 * fout is gegaan.
 *
 * DE ZES VRAGEN, en de eerste twee zijn de reden dat dit bestand bestaat:
 *
 *   1 · ÉÉN DOORLOPENDE REEKS. Een creditnota trekt haar nummer uit dezelfde
 *       `invoice_series` als een factuur. Twee reeksen, of een gat, of een dubbel
 *       nummer is bij een controle het probleem — niet het bedrag.
 *   2 · NOOIT DUBBEL CREDITEREN. Mollie's `amountRefunded` is een doorlopend totaal en
 *       dezelfde webhookmelding komt meer dan één keer aan. Twee keer aanroepen met
 *       hetzelfde totaal moet één nota opleveren; een verhoging van dat totaal een
 *       tweede nota voor alleen de verhoging.
 *   3 · DE BEDRAGEN TELLEN OP. netto + btw = bruto, tot op de cent, ook bij een
 *       gedeeltelijke terugbetaling. Een nota waarvan de regels niet optellen tot het
 *       totaal is een nota die je opnieuw moet maken.
 *   4 · DE BEHANDELING KOMT VAN DE FACTUUR. Was de factuur 0% verlegd, dan is de nota
 *       0% verlegd. Dat is geen nieuw fiscaal standpunt maar wat er op de factuur stond.
 *   5 · NOOIT MEER DAN DE FACTUUR. Een creditnota die het factuurbedrag overschrijdt is
 *       een negatief resultaat uit het niets.
 *   6 · GEEN FACTUUR, GEEN NOTA. Bij een proefvisual van € 1 wordt niet gefactureerd, en
 *       een nota op een factuur die niet bestaat verwijst naar niets.
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { issueCreditNote, creditSnapshotFrom, issueInvoice, formatNumber } from '../src/lib/invoice.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  const label = good ? ' ok  ' : ' FAIL';
  console.log(`${label} ${name.padEnd(62)}${good ? '' : `expected ${JSON.stringify(want)} got ${JSON.stringify(shown ?? got)}`}`);
}

function d1(db) {
  return {
    prepare(sql) {
      const st = {
        _a: [],
        bind(...a) { st._a = a; return st; },
        async all() { return { results: db.prepare(sql).all(...st._a) }; },
        async run() { return { success: true, meta: db.prepare(sql).run(...st._a) }; },
        async first() { return db.prepare(sql).get(...st._a) ?? null; },
      };
      return st;
    },
  };
}

/* Een emmer in het geheugen. Wat erin gaat wordt bewaard, want een van de checks is dat
 * de pdf ergens ANDERS terechtkomt dan een factuur — één sleutelruimte voor twee
 * documentsoorten is hoe je later de verkeerde pdf naar een klant mailt. */
function bucket() {
  const puts = [];
  return {
    puts,
    async put(key, body, opts) { puts.push({ key, bytes: body?.length ?? 0, meta: opts?.customMetadata || {} }); return { key }; },
  };
}

const SELLER = {
  SELLER_NAME: 'Visuails',
  SELLER_ADDRESS: 'Voorbeeldstraat 12|1234 AB Rotterdam|Nederland',
  SELLER_VAT: 'NL001234567B01',
  SELLER_KVK: '99999999',
  SELLER_EMAIL: 'hello@visuails.com',
};

let refN = 0;
/** Een betaalde bestelling met een uitgereikte factuur erop, via de ECHTE issueInvoice(). */
async function paidOrderWithInvoice(env, db, { net = 61200, vatRate = 0.21, treatment = 'standard', country = 'NL', vat = null, service = 'catalog' } = {}) {
  const ref = `VIS-CN-${String(++refN).padStart(3, '0')}`;
  const vatCents = Math.round(net * vatRate);
  db.prepare(
    `INSERT INTO orders (ref, email, service, status, payment_status, total_cents, vat_cents,
                         vat_rate, vat_treatment, country, vat_number, product_count, lang, paid_at,
                         first_name, last_name, brand, address_line1, postal_code, city)
     VALUES (?, 'klant@merk.nl', ?, 'received', 'paid', ?, ?, ?, ?, ?, ?, 12, 'nl', '2026-08-01',
             'Jan', 'Jansen', 'Merk', 'Teststraat 1', '9999 ZZ', 'Teststad')`
  ).run(ref, service, net, vatCents, vatRate, treatment, country, vat);
  const id = db.prepare('SELECT id FROM orders WHERE ref = ?').get(ref).id;
  const invoice = await issueInvoice(env, id, { today: '2026-08-01' });
  return { orderId: id, ref, invoice, net, vatCents, gross: net + vatCents };
}

function fresh({ noCreditTable = false } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  if (noCreditTable) db.exec('DROP TABLE credit_notes');
  const UPLOADS = bucket();
  return { db, UPLOADS, env: { DB: d1(db), UPLOADS, ...SELLER } };
}

const notes = (db, orderId) => db.prepare(
  'SELECT * FROM credit_notes WHERE order_id = ? ORDER BY id'
).all(orderId);

console.log('\nVISUAILS — de creditnota\n');

console.log('één doorlopende nummerreeks');
{
  const { db, env, UPLOADS } = fresh();
  const a = await paidOrderWithInvoice(env, db);
  const note = await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross, reason: 'Bestelling geannuleerd' });
  ok('er komt een nota', Boolean(note), true, note);
  ok('de factuur is 0001', a.invoice.number, formatNumber(2026, 1));
  /* HET GETAL DAT ALLES DRAAGT: de nota pakt het VOLGENDE nummer uit dezelfde reeks, en
     niet een eigen 0001. Twee reeksen naast elkaar is precies wat de vraag "waar is
     factuur 8" onbeantwoordbaar maakt. */
  ok('en de nota is 0002 uit dezelfde reeks', note.number, formatNumber(2026, 2));
  ok('het jaar staat er los bij', note.year, 2026);
  ok('en het volgnummer ook', note.seq, 2);

  /* En de volgende FACTUUR gaat verder waar de nota ophield — geen gat en geen botsing. */
  const b = await paidOrderWithInvoice(env, db);
  ok('de volgende factuur is 0003', b.invoice.number, formatNumber(2026, 3));

  ok('de nota staat op issued', note.status, 'issued');
  ok('en heeft een pdf', typeof note.pdf_key, 'string');
  /* Een eigen sleutelruimte in R2. Eén map voor facturen en nota's is hoe je later de
     verkeerde pdf naar een klant stuurt. */
  ok('de pdf staat onder credit-notes/', note.pdf_key.startsWith('credit-notes/2026/'), true, note.pdf_key);
  ok('en de factuur onder invoices/', a.invoice.pdf_key.startsWith('invoices/'), true, a.invoice.pdf_key);
  /* Drie en niet twee: twee facturen en één nota, want dit blok maakt hierboven ook de
     volgende factuur om te bewijzen dat de reeks doorloopt. Op de SOORT tellen en niet op
     het totaal, dan zegt de check wat hij bedoelt. */
  const notaPuts = UPLOADS.puts.filter((x) => x.key.startsWith('credit-notes/'));
  const factuurPuts = UPLOADS.puts.filter((x) => x.key.startsWith('invoices/'));
  ok('er is één nota-pdf', notaPuts.length, 1);
  ok('en twee factuur-pdf\'s', factuurPuts.length, 2);
  ok('de nota-pdf is echt een pdf', notaPuts[0].bytes > 1000, true, notaPuts[0].bytes);
  /* De metadata wijst terug naar de factuur en de bestelling, zodat een los bestand in R2
     ook zonder database te plaatsen is. */
  ok('en draagt haar eigen nummer als metadata', notaPuts[0].meta.credit, note.number);
}

console.log('\nnooit dubbel crediteren');
{
  const { db, env } = fresh();
  const a = await paidOrderWithInvoice(env, db);
  /* Dezelfde melding twee keer. Dit is niet hypothetisch: Mollie levert elke melding
     meer dan één keer af, en amountRefunded is een lopend totaal. */
  const first = await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross });
  const second = await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross });
  ok('de eerste levert een nota', Boolean(first), true);
  ok('de tweede levert niets', second, null);
  ok('en er staat één nota', notes(db, a.orderId).length, 1);
}
{
  const { db, env } = fresh();
  const a = await paidOrderWithInvoice(env, db);
  /* Eerst een deel terug, later meer. Dat moet twee nota's geven, en de tweede alleen
     voor het VERSCHIL — anders crediteer je de eerste € 200 twee keer. */
  const one = await issueCreditNote(env, a.orderId, { refundedGrossCents: 20000 });
  const two = await issueCreditNote(env, a.orderId, { refundedGrossCents: 50000 });
  ok('een deel terug geeft een nota van dat deel', one.gross_cents, 20000);
  ok('een hoger totaal geeft een tweede nota', Boolean(two), true);
  ok('en die staat op het verschil', two.gross_cents, 30000);
  ok('samen is dat het nieuwe totaal', one.gross_cents + two.gross_cents, 50000);
  ok('en het zijn twee nota\'s op één factuur', notes(db, a.orderId).length, 2);
  /* Twee nota's, twee opeenvolgende nummers, geen van beide gelijk aan de factuur. */
  const ns = notes(db, a.orderId).map((n) => n.number);
  ok('met twee verschillende nummers', new Set(ns).size, 2, ns.join(','));
}
{
  const { db, env } = fresh();
  const a = await paidOrderWithInvoice(env, db);
  await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross });
  /* Meer terugbetalen dan er op de factuur stond kan niet leiden tot meer crediteren. */
  const over = await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross + 100000 });
  ok('boven het factuurbedrag komt er niets bij', over, null);
  const totaal = notes(db, a.orderId).reduce((n, r) => n + r.gross_cents, 0);
  ok('en het gecrediteerde totaal blijft het factuurbedrag', totaal, a.gross);
}
{
  const { db, env } = fresh();
  const a = await paidOrderWithInvoice(env, db);
  ok('nul terugbetaald geeft geen nota',
    await issueCreditNote(env, a.orderId, { refundedGrossCents: 0 }), null);
  ok('en er is geen nummer verbruikt na de factuur',
    db.prepare('SELECT last_number FROM invoice_series WHERE year = 2026').get().last_number, 1);
}

console.log('\nde bedragen tellen op');
{
  const { db, env } = fresh();
  const a = await paidOrderWithInvoice(env, db); // 612,00 + 21% = 740,52
  const vol = await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross });
  ok('volledig: netto is het factuurnetto', vol.net_cents, a.net);
  ok('volledig: btw is de factuurbtw', vol.vat_cents, a.vatCents);
  ok('volledig: bruto klopt met de factuur', vol.gross_cents, a.gross);
  /* DE CHECK DIE HET ECHT DOET: netto + btw = bruto. Zonder deze regel kan een
     afrondingsfout een nota opleveren waarvan de regels niet optellen tot het totaal. */
  ok('volledig: netto + btw = bruto', vol.net_cents + vol.vat_cents, vol.gross_cents);
}
{
  const { db, env } = fresh();
  const a = await paidOrderWithInvoice(env, db);
  for (const bedrag of [1, 99, 100, 12345, 20000, 37026]) {
    const { db: d2, env: e2 } = fresh();
    const b = await paidOrderWithInvoice(e2, d2);
    const n = await issueCreditNote(e2, b.orderId, { refundedGrossCents: bedrag });
    ok(`gedeeltelijk ${bedrag}: netto + btw = bruto`, n.net_cents + n.vat_cents, n.gross_cents);
    ok(`gedeeltelijk ${bedrag}: bruto is wat er terug is`, n.gross_cents, bedrag);
  }
  ok('en de factuur zelf is niet aangeraakt',
    db.prepare('SELECT status FROM invoices WHERE order_id = ?').get(a.orderId).status, 'issued');
}

console.log('\nde behandeling komt van de factuur');
{
  /* 0% verlegd. Als de nota hier 21% zou rekenen, staat er btw op een document dat naar
     een factuur zonder btw verwijst — en dan is de aangifte van beide partijen fout. */
  const { db, env } = fresh();
  const a = await paidOrderWithInvoice(env, db, { vatRate: 0, treatment: 'reverse', country: 'DE', vat: 'DE123456789' });
  const n = await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross });
  ok('verlegd: geen btw op de nota', n.vat_cents, 0);
  ok('verlegd: netto is bruto', n.net_cents, n.gross_cents);
  const snap = JSON.parse(n.snapshot_json);
  ok('verlegd: de behandeling staat in de momentopname', snap.treatment, 'reverse');
  ok('en het btw-tarief ook', snap.vatRate, 0);
}
{
  const { db, env } = fresh();
  const a = await paidOrderWithInvoice(env, db);
  const n = await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross, reason: 'sample-duplicate' });
  const snap = JSON.parse(n.snapshot_json);
  ok('de nota verwijst naar het factuurnummer', snap.creditsNumber, a.invoice.number);
  ok('en naar de factuurdatum', snap.creditsDate, '2026-08-01');
  ok('de reden staat op de nota', snap.reason, 'sample-duplicate');
  ok('en in de kolom', n.reason, 'sample-duplicate');
  /* GEEN VERVALDATUM EN GEEN BETAALDATUM. Een creditnota is geen betalingsverzoek, en de
     betaaldatum van de FACTUUR erop zetten leest als de datum waarop het geld terugkwam. */
  ok('er staat geen vervaldatum op', snap.dueDate, null);
  ok('en geen betaaldatum', snap.paidAt, null);
  ok('het adres komt van de factuur', JSON.stringify(snap.customer), JSON.stringify(JSON.parse(a.invoice.snapshot_json).customer));
}

console.log('\ngeen factuur, geen nota');
{
  const { db, env } = fresh();
  /* Een proefvisual van € 1: betaald, terugbetaald, en met opzet niet gefactureerd zolang
     het fiscale standpunt over die euro niet genomen is. Een nota op een factuur die niet
     bestaat zou een document met een nummer zijn dat naar niets verwijst. */
  db.prepare(
    `INSERT INTO orders (ref, email, service, status, payment_status, total_cents, vat_cents, lang)
     VALUES ('VIS-SAMPLE-1', 'klant@merk.nl', 'test-sample', 'cancelled', 'refunded', 100, 0, 'nl')`
  ).run();
  const id = db.prepare("SELECT id FROM orders WHERE ref = 'VIS-SAMPLE-1'").get().id;
  ok('een proefvisual zonder factuur krijgt geen nota',
    await issueCreditNote(env, id, { refundedGrossCents: 100 }), null);
  ok('en er is geen nummer verbruikt',
    db.prepare('SELECT last_number FROM invoice_series WHERE year = 2026').get()?.last_number ?? 0, 0);
}
{
  const { db, env } = fresh();
  const a = await paidOrderWithInvoice(env, db);
  /* Een factuur die nog op 'pending' staat (de pdf is nog niet gelukt) is nog niet
     uitgereikt. Crediteren wat nog niet uitgereikt is, kan niet. */
  db.prepare("UPDATE invoices SET status = 'pending' WHERE order_id = ?").run(a.orderId);
  ok('een factuur die nog niet uitgereikt is, wordt niet gecrediteerd',
    await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross }), null);
}

console.log('\nde nachtelijke taak raapt een vastgelopen nota op');
{
  /* Het nummer komt vóór de pdf, precies zoals bij een factuur. Blijft de nota op
   * 'pending' staan omdat R2 niet meewerkte, dan mag dat nummer niet verloren gaan — een
   * gat in de reeks leest bij een controle als een verdwenen document. */
  const { db } = fresh();
  const kapot = { async put() { throw new Error('R2 weigert'); } };
  const env = { DB: d1(db), UPLOADS: kapot, ...SELLER };
  const goedeEmmer = bucket();
  const envGoed = { DB: d1(db), UPLOADS: goedeEmmer, ...SELLER };

  const a = await paidOrderWithInvoice(envGoed, db);
  let boem = null;
  try {
    await issueCreditNote(env, a.orderId, { refundedGrossCents: a.gross });
  } catch (err) { boem = String(err?.message || err); }
  ok('een kapotte emmer laat issueCreditNote omvallen', Boolean(boem), true, boem);
  const row = notes(db, a.orderId)[0];
  ok('maar de rij staat er, met haar nummer', Boolean(row), true);
  ok('op pending', row.status, 'pending');
  ok('en zonder pdf', row.pdf_key, null);

  const { renderCreditPdf } = await import('../src/lib/invoice.js');
  const na = await renderCreditPdf(envGoed, row);
  ok('de nachtelijke taak maakt hem af', na.status, 'issued');
  ok('met HETZELFDE nummer', na.number, row.number);
  ok('en nu wel een pdf', typeof na.pdf_key, 'string');
}

console.log('\nen de afspraken tussen bestanden');
{
  const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const webhook = src('../functions/api/webhook/mollie.js');
  const cron = src('../cron/index.js');

  /* De webhook is de enige plek waar een terugbetaling binnenkomt. Staat de aanroep er
     niet, dan is dit hele bestand dode code en blijft de factuur op het volle bedrag. */
  ok('de webhook geeft een creditnota uit', webhook.includes('issueCreditNote('));
  /* En met het TOTAAL, niet met het verschil: `refunded` is Mollie's amountRefunded. Zou
     hier het verschil staan, dan crediteert een tweede aflevering van dezelfde melding
     dubbel — en dat is precies de bug die deze hele sectie moet uitsluiten. */
  ok('en geeft het doorlopende totaal mee', /refundedGrossCents: refunded/.test(webhook), true);
  /* cancel_reason moet in de SELECT staan, anders is de reden op de nota altijd leeg. */
  ok('en leest cancel_reason uit de bestelling', /SELECT id, service.*cancel_reason FROM orders/.test(webhook), true);

  ok('de nachtelijke taak raapt vastgelopen nota\'s op', cron.includes('renderCreditPdf'));
  ok('en leest daarvoor credit_notes', cron.includes('FROM credit_notes'));

  ok('credit_notes staat in schema.sql', src('../schema.sql').includes('credit_notes'));
  ok('en in migrations/0026-credit-notes.sql', src('../migrations/0026-credit-notes.sql').includes('credit_notes'));

  /* De pdf zegt CREDITNOTA en niet FACTUUR, in beide talen. Eén tekst vergeten is een
     document dat zich als een factuur voordoet. */
  const pdf = src('../src/lib/invoicePdf.js');
  ok('de renderer kent CREDITNOTA', pdf.includes("title: 'CREDITNOTA'"));
  ok('en CREDIT NOTE', pdf.includes("title: 'CREDIT NOTE'"));
  ok('en zet geen iban-instructie op een nota', /isCredit\(d\.inv\)/.test(pdf), true);
}

/*
 * DE TEKST IN DE PDF WORDT HIER NIET GELEZEN, EN DAT IS OPZET.
 *
 * pdf-lib comprimeert zijn content streams, dus "staat dit woord in de bytes" is geen
 * bruikbare vraag — de eerste versie van deze test zocht in de rauwe bytes en stond
 * daarom rood op een pdf die perfect klopte. tests/invoice-pdf.test.mjs heeft daar al een
 * echte lezer voor: hij pakt elke stream uit, leest de tekst-operatoren MET hun
 * coördinaten en controleert dat alles binnen het blad valt.
 *
 * Die lezer een tweede keer bouwen zou zeventig regels kopie zijn van precies het soort
 * code dat in dit project al twee keer uit elkaar is gelopen. De creditnota is een
 * variant van hetzelfde document, dus de opmaakchecks staan daar — zoek op CREDITNOTA in
 * tests/invoice-pdf.test.mjs. Wat hier blijft, is of de renderer wordt aangeroepen en of
 * de bedragen en verwijzingen kloppen; dat is de administratie, en dat is wat dit bestand
 * over gaat.
 */

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
