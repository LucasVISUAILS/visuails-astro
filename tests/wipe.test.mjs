/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET AVG-VERZOEK, TEGEN EEN ECHTE DATABASE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT BESTAND BESTAAT, EN NIET IN admin.test.mjs PAST ───────────────
 *
 * Op 12 augustus 2026 bleek handleCustomerWipe() halverwege te falen voor elke
 * klant met een factuur. De laatste batch deed `DELETE FROM orders WHERE
 * customer_id = ?`, terwijl `invoices.order_id` naar `orders` verwijst met
 * ON DELETE RESTRICT — en schema.sql zegt bij die regel zelf waarom: een
 * uitgereikt document verdwijnt niet omdat de bestelling verdwijnt.
 *
 * Het gemene eraan is de VOLGORDE. De R2-objecten worden gewist vóór de rijen.
 * De klant hield dus zijn account en zijn bestellingen, maar al zijn beelden waren
 * onherroepelijk weg, en de logregel werd nooit geschreven. Dat is de slechtst
 * mogelijke uitkomst van de enige knop op dit paneel die niet half mag falen.
 *
 * EN WAAROM NIEMAND HET ZAG. tests/admin.test.mjs gebruikt een nepdatabase die
 * SQL-strings in een lijst opslaat. Die dwingt geen foreign keys af, dus daar zag
 * de wipe eruit als een geslaagde wipe. Een fout die alleen bestaat omdat de
 * DATABASE iets weigert, kun je niet vinden met een database die nooit iets
 * weigert — hoeveel assertions je er ook op zet.
 *
 * Vandaar dit bestand: `node:sqlite` (in Node 22 aanwezig), schema.sql ingelezen
 * zoals hij is, `PRAGMA foreign_keys = ON`, en een dun D1-jasje eromheen. Wat hier
 * slaagt, slaagt om dezelfde reden als in productie.
 *
 * ── WAT ER INHOUDELIJK WORDT VASTGEHOUDEN ───────────────────────────────────
 *
 * De reparatie is niet "de foreign key omzeilen" maar de beslissing volgen die al
 * in het schema stond. Art. 17 lid 3 sub b AVG laat het recht op vergetelheid
 * wijken voor een wettelijke verplichting, en de fiscale bewaarplicht (art. 52 lid
 * 4 AWR) is er een. Dus:
 *
 *   bestelling ZONDER factuur  → helemaal weg
 *   bestelling MÉT factuur     → blijft, maar uitgekleed; de factuur blijft heel
 *
 * En alles wat op ON DELETE CASCADE leunde wordt nu expliciet gewist, want deze
 * codebase vertrouwt elders bewust niet op cascade in D1 — en bij een AVG-verzoek
 * is "het gaat vermoedelijk automatisch" geen antwoord dat je aan een
 * toezichthouder geeft.
 */
import { readFileSync } from 'node:fs';
import { adminPost } from '../src/lib/admin.js';
/* Het D1-jasje en het inlezen van schema.sql staan in tests/lib/d1sqlite.mjs, sinds er
   een tweede test is die dezelfde echte database nodig heeft (admin-beheer). De
   redenering waarom dit harnas bestaat staat daar. */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(58)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));

console.log('\nVISUAILS — het AVG-verzoek tegen een echte database\n');

console.log('het echte schema laadt, met foreign keys aan');
{
  /* Als schema.sql hier niet laadt, meet de rest van dit bestand niets. Dus is dit
     de eerste check en niet een aanname. */
  ok('geen enkel statement uit schema.sql faalt', mislukt.length, 0, mislukt.slice(0, 3).join(' | '));
  const fk = db.prepare('PRAGMA foreign_keys').get();
  ok('foreign keys staan aan', Object.values(fk)[0], 1);

  /* En de controle die deze hele test mogelijk maakt: weigert deze database
     werkelijk een DELETE die een RESTRICT-verwijzing zou verbreken? Zonder dit
     bewijs zou een groene test hieronder net zo weinig zeggen als de nepdatabase. */
  db.exec(`INSERT INTO customers (id, email) VALUES (900, 'fk@test.nl')`);
  db.exec(`INSERT INTO orders (id, ref, customer_id, service, email) VALUES (900, 'FK-1', 900, 'catalog', 'fk@test.nl')`);
  /* `pdf_key` moet erbij: schema.sql heeft `CHECK (status <> 'issued' OR pdf_key IS
     NOT NULL)`. De eerste versie van deze fixture liet hem weg en werd door de
     database geweigerd -- wat meteen het nut van deze test aantoont: de nepdatabase
     in admin.test.mjs had die rij gewoon geslikt. */
  db.exec(`INSERT INTO invoices (id, number, year, seq, order_id, status, pdf_key, snapshot_json, lang)
           VALUES (900, 'VIS-2026-0900', 2026, 900, 900, 'issued', 'invoices/2026/x.pdf', '{}', 'nl')`);
  let geweigerd = false;
  try { db.exec('DELETE FROM orders WHERE id = 900'); } catch { geweigerd = true; }
  ok('een DELETE tegen een RESTRICT-factuur wordt geweigerd', geweigerd, true);
  db.exec('DELETE FROM invoices WHERE id = 900');
  db.exec('DELETE FROM orders WHERE id = 900');
  db.exec('DELETE FROM customers WHERE id = 900');
}

/* ─────────────────────────────────────────────────────────────────────────────
   DE KLANT DIE GEWIST GAAT WORDEN
   ─────────────────────────────────────────────────────────────────────────────
   Twee bestellingen, en dat is de hele opzet van deze test: één met een factuur en
   één zonder. Alles eromheen — bestanden, betalingen, feedback, een bericht uit het
   contactformulier, een nieuwsbriefaanmelding, een merkmodel — hangt eraan zoals in
   productie, want de vraag is niet of de code loopt maar of er iets achterblijft. */
function zaai() {
  db.exec(`
    INSERT INTO customers (id, email, brand, name, vat_number, created_at)
      VALUES (7, 'sanne@ateliernoord.nl', 'VOLT', 'Sanne de Vries', 'NL123456789B01', '2026-07-01T10:00:00Z');

    INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone,
                        vat_number, details_json, total_cents, lang, created_at,
                        payment_status, paid_at, billing_address, first_name, last_name,
                        address_line1, postal_code, city, vat_cents, payer_hash)
      VALUES (10, 'VIS-2608-0010', 7, 'catalog', 'delivered', 'Sanne de Vries', 'VOLT',
              'sanne@ateliernoord.nl', '+31612345678', 'NL123456789B01', '{"message":"mat"}',
              8900, 'nl', '2026-07-02T10:00:00Z', 'paid', '2026-07-03', 'Voorbeeldstraat 12',
              'Sanne', 'de Vries', 'Voorbeeldstraat 12', '1234 AB', 'Rotterdam', 1869, 'hash-a'),
             (11, 'VIS-2608-0011', 7, 'lifestyle', 'received', 'Sanne de Vries', 'VOLT',
              'sanne@ateliernoord.nl', '+31612345678', NULL, '{"message":"tweede"}',
              4900, 'nl', '2026-07-09T10:00:00Z', 'paid', '2026-07-10', 'Voorbeeldstraat 12',
              'Sanne', 'de Vries', 'Voorbeeldstraat 12', '1234 AB', 'Rotterdam', 1029, 'hash-b');

    -- Alleen bestelling 10 is gefactureerd. Dat is het scheidingsvlak.
    INSERT INTO invoices (id, number, year, seq, order_id, customer_id, status, pdf_key, snapshot_json, lang)
      VALUES (1, 'VIS-2026-0001', 2026, 1, 10, 7, 'issued', 'invoices/2026/VIS-2026-0001.pdf',
              '{"customer":{"name":"Sanne de Vries"}}', 'nl');

    INSERT INTO files (id, order_id, kind, r2_key, filename)
      VALUES (1, 10, 'intake', 'intake/VIS-2608-0010/aangeleverd.jpg', 'aangeleverd.jpg'),
             (2, 10, 'delivery', 'delivery/VIS-2608-0010/p1-voorkant.png', 'p1-voorkant.png'),
             (3, 11, 'intake', 'intake/VIS-2608-0011/tweede.jpg', 'tweede.jpg');

    INSERT INTO file_assets (id, file_id, format, r2_key)
      VALUES (1, 2, 'webp', 'delivery/VIS-2608-0010/p1-voorkant.webp');

    INSERT INTO payments (id, order_id, provider, external_id, status, amount_cents, raw_payload)
      VALUES (1, 10, 'mollie', 'tr_a', 'paid', 10769, '{"details":{"consumerName":"Sanne de Vries"}}'),
             (2, 11, 'mollie', 'tr_b', 'paid', 5929, '{"details":{"consumerName":"Sanne de Vries"}}');

    INSERT INTO order_feedback (id, order_id, customer_id, score, private_note, testimonial_name)
      VALUES (1, 10, 7, 5, 'ze was blij', 'Sanne');

    INSERT INTO order_events (id, order_id, status, note) VALUES (1, 10, 'delivered', 'geleverd');
    INSERT INTO order_notes (id, order_id, body) VALUES (1, 10, 'interne noot');
    INSERT INTO order_tokens (id, order_id, token_hash) VALUES (1, 10, 'th');
    INSERT INTO revision_requests (id, order_id, customer_id, file_id, note)
      VALUES (1, 10, 7, 2, 'iets lichter');

    INSERT INTO custom_models (id, customer_id, label, preview_key, status)
      VALUES (1, 7, 'Merkmodel A', 'models/7/1-portret.jpg', 'ready');
    INSERT INTO customer_style_locks (customer_id, style, custom_model_id)
      VALUES (7, 'glow', 1);
    INSERT INTO account_sessions (id, customer_id, token_hash, expires_at)
      VALUES (1, 7, 'sess', '2026-09-01T00:00:00Z');
    INSERT INTO account_tokens (id, customer_id, token_hash, expires_at)
      VALUES (1, 7, 'tok', '2026-08-13T00:00:00Z');

    -- Twee tabellen die aan de KLANT hangen en niet aan een bestelling.
    INSERT INTO messages (id, customer_id, name, email, body)
      VALUES (1, 7, 'Sanne de Vries', 'sanne@ateliernoord.nl', 'vraag over levering');
    INSERT INTO subscribers (id, email) VALUES (1, 'sanne@ateliernoord.nl');
  `);
}
zaai();

/*
 * EEN ECHTE ADMINSESSIE, want tegen een echte database is een gemunt token niet
 * genoeg. currentAdmin() zoekt de HASH van het cookie op in `admin_sessions`, JOIN
 * `admin_users`, en kijkt naar `expires_at`. In admin.test.mjs geeft de nepdatabase
 * daar altijd een rij op terug; hier moet die rij bestaan.
 *
 * Dat is geen last maar winst: nu wordt óók getest dat de wipe achter de
 * adminpoort zit. De eerste versie hiervan miste de sessie en kreeg een 303 naar
 * /admin/login -- de test was groen op "het is een doorverwijzing" terwijl er niets
 * was gebeurd. Vandaar de assertie op de LOCATIE en niet alleen op de status.
 */
const adminToken = await mintToken();
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x')`);
db.prepare(
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`
).run(await hashToken(adminToken));

const gewist = [];
const env = {
  DB: d1(db),
  UPLOADS: { async delete(key) { gewist.push(key); } },
};

const telling = (sql, ...b) => Object.values(db.prepare(sql).get(...b))[0];

console.log('\nvoor het wissen staat alles er');
{
  ok('twee bestellingen', telling('SELECT COUNT(*) FROM orders WHERE customer_id = 7'), 2);
  ok('één factuur', telling('SELECT COUNT(*) FROM invoices WHERE order_id = 10'), 1);
  ok('drie bestanden', telling('SELECT COUNT(*) FROM files'), 3);
  ok('een bericht en een aanmelding', telling('SELECT COUNT(*) FROM messages') + telling('SELECT COUNT(*) FROM subscribers'), 2);
}

console.log('\nde wipe loopt helemaal af in plaats van halverwege te breken');
const res = await adminPost({
  request: new Request('https://visuails.com/admin/customers/7/wipe', {
    method: 'POST',
    headers: { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' },
    body: new URLSearchParams({ confirm: 'VOLT' }),
  }),
  env,
  waitUntil() {},
});
{
  /* 303 en niet 500: dit is de check die vóór 12 augustus rood was geweest. De
     bestelling met de factuur liet de batch omvallen, de functie gooide, en
     adminPost() gaf een foutpagina terug — nadat de bestanden al weg waren. */
  ok('hij eindigt in een doorverwijzing en niet in een fout', res.status, 303,
    `${res.status} ${res.status >= 400 ? await res.clone().text().then((t) => t.slice(0, 200)) : ''}`);
  ok('naar de klantenlijst', String(res.headers.get('location') || '').includes('/admin/customers'), true);
}

console.log('\nde klant is weg, en de bestelling zonder factuur ook');
{
  ok('de klantrij is verdwenen', telling('SELECT COUNT(*) FROM customers WHERE id = 7'), 0);
  ok('de bestelling zonder factuur is verdwenen', telling('SELECT COUNT(*) FROM orders WHERE id = 11'), 0);
  ok('het merkmodel is weg', telling('SELECT COUNT(*) FROM custom_models'), 0);
  ok('de style lock is weg', telling('SELECT COUNT(*) FROM customer_style_locks'), 0);
  ok('de sessies zijn weg', telling('SELECT COUNT(*) FROM account_sessions'), 0);
  ok('de inlogtokens zijn weg', telling('SELECT COUNT(*) FROM account_tokens'), 0);
  ok('de bestanden zijn weg', telling('SELECT COUNT(*) FROM files'), 0);
  ok('de tijdlijn is weg', telling('SELECT COUNT(*) FROM order_events'), 0);
  ok('de interne noten zijn weg', telling('SELECT COUNT(*) FROM order_notes'), 0);
  ok('de portaaltokens zijn weg', telling('SELECT COUNT(*) FROM order_tokens'), 0);
  ok('de revisieverzoeken zijn weg', telling('SELECT COUNT(*) FROM revision_requests'), 0);
}

console.log('\nde vier tabellen die op cascade leunden zijn nu expliciet leeg');
{
  /* Alle vier stonden niet in de batch. file_assets, payments en order_feedback
     zouden vermoedelijk door cascade meegaan; messages en subscribers per definitie
     niet, want die hangen aan de klant met SET NULL respectievelijk aan niets. */
  ok('file_assets is leeg', telling('SELECT COUNT(*) FROM file_assets'), 0);
  ok('order_feedback is leeg', telling('SELECT COUNT(*) FROM order_feedback'), 0);
  ok('het contactbericht is weg', telling('SELECT COUNT(*) FROM messages'), 0);
  ok('de nieuwsbriefaanmelding is weg', telling('SELECT COUNT(*) FROM subscribers'), 0);
  /* De betaling van de GEFACTUREERDE bestelling blijft staan — die verbindt de
     factuur met het ontvangen geld — maar zonder de ruwe webhookbody. */
  ok('de betaling van de gewiste bestelling is weg',
    telling('SELECT COUNT(*) FROM payments WHERE order_id = 11'), 0);
  ok('de betaling van de gefactureerde bestelling staat er nog',
    telling('SELECT COUNT(*) FROM payments WHERE order_id = 10'), 1);
  ok('maar zonder de gegevens van de betaler',
    db.prepare('SELECT raw_payload FROM payments WHERE order_id = 10').get().raw_payload, null);
}

console.log('\nde factuur blijft heel, en de bestelling eronder is uitgekleed');
{
  /* Dit is de inhoudelijke helft van de reparatie. De factuur blijft omdat art. 17
     lid 3 sub b AVG daar ruimte voor laat en de bewaarplicht hem vraagt; de
     bestelling eronder blijft alleen bestaan omdat de factuur eraan hangt, en houdt
     dus niets meer over wat naar een persoon wijst. */
  ok('de factuur staat er nog', telling('SELECT COUNT(*) FROM invoices WHERE order_id = 10'), 1);
  ok('met zijn pdf-sleutel',
    db.prepare('SELECT pdf_key FROM invoices WHERE order_id = 10').get().pdf_key,
    'invoices/2026/VIS-2026-0001.pdf');
  ok('en zijn momentopname', /Sanne/.test(db.prepare('SELECT snapshot_json FROM invoices WHERE order_id = 10').get().snapshot_json), true);
  ok('de klantverwijzing op de factuur is losgelaten',
    db.prepare('SELECT customer_id FROM invoices WHERE order_id = 10').get().customer_id, null);

  const o = db.prepare('SELECT * FROM orders WHERE id = 10').get();
  ok('de bestelling bestaat nog', !!o, true);
  ok('maar hangt niet meer aan een klant', o.customer_id, null);
  /* `email` staat er niet bij: die kolom is NOT NULL, dus hij wordt niet geleegd maar
     VERVANGEN door een adres in het bij RFC 2606 gereserveerde `.invalid`-domein --
     dat kan per definitie nooit bij een mens uitkomen. Zie de noot in admin.js. */
  ok('het e-mailadres is vervangen door een onbestelbaar adres', o.email, 'gewist@visuails.invalid');
  ok('en het oude adres staat er niet meer', /ateliernoord/.test(String(o.email)), false);
  for (const kolom of ['name', 'brand', 'phone', 'vat_number', 'details_json',
    'billing_address', 'first_name', 'last_name', 'address_line1', 'postal_code', 'city',
    'customer_note', 'vat_check_name', 'vat_check_json', 'payer_hash']) {
    ok(`orders.${kolom} is leeg`, o[kolom], null);
  }
  /* En wat er WEL moet blijven staan, want anders is de factuur niet meer te
     verantwoorden: de referentie, het bedrag, de btw en de datum. */
  ok('de referentie blijft', o.ref, 'VIS-2608-0010');
  ok('het bedrag blijft', o.total_cents, 8900);
  ok('de btw blijft', o.vat_cents, 1869);
  ok('en de betaaldatum', o.paid_at, '2026-07-03');
}

console.log('\nhet archief legt alleen geld vast waar geen factuur bij hoort');
{
  const arch = db.prepare('SELECT * FROM invoice_archive').all();
  /* Eén regel, voor bestelling 11. Bestelling 10 heeft een echte factuur en die IS
     het wettelijke bewijsstuk — een tweede geanonimiseerde regel over hetzelfde geld
     zou dubbele boekhouding zijn. */
  ok('één archiefregel', arch.length, 1, arch.map((a) => a.ref).join(', '));
  ok('en dat is de bestelling zonder factuur', arch[0]?.ref, 'VIS-2608-0011');
  ok('met het bedrag erin', arch[0]?.total_cents, 4900);
  /* invoice_archive heeft geen naamkolom, dus dit is een controle op het schema en
     niet op de code — en juist daarom hoort hij hier: verschijnt die kolom ooit, dan
     is het archief geen anonieme regel meer. */
  const kolommen = db.prepare('PRAGMA table_info(invoice_archive)').all().map((c) => c.name);
  ok('het archief heeft geen naam- of e-mailkolom',
    kolommen.some((c) => /name|email|brand/i.test(c)), false, kolommen.join(', '));
}

console.log('\nde bestanden in R2 zijn weg, de factuur-pdf niet');
{
  ok('het aangeleverde bestand is verwijderd', gewist.includes('intake/VIS-2608-0010/aangeleverd.jpg'), true);
  ok('het geleverde beeld ook', gewist.includes('delivery/VIS-2608-0010/p1-voorkant.png'), true);
  /* ── EN DE AFGELEIDE FORMATEN — 14 AUGUSTUS 2026 ──────────────────────────
   *
   * Deze regel ontbrak, en de wis daarmee ook. Sinds migratie 0022 is een
   * geleverd beeld vier objecten: de png-master, de reviewkopie, en een jpg en
   * webp die ALLEEN als rij in `file_assets` bestaan — precies de twee die de
   * klant publiceert en die in zijn zip zitten.
   *
   * De wisquery las twee kolommen uit `files` en kende die tabel niet. Een paar
   * regels verderop verdwenen de `file_assets`-rijen wél, dus na afloop wees er
   * niets in D1 meer naar die objecten: onvindbaar, permanent, terwijl het
   * logboek de wissing als voltooid boekte. Bij een verzoek onder art. 17 AVG is
   * dat de ergste soort fout — hij ziet er afgerond uit.
   *
   * Deze toets kon hem niet zien omdat hij naar de RIJEN keek (regel "file_assets
   * is leeg") en niet naar de OBJECTEN. Die twee vragen zijn niet hetzelfde, en
   * dat verschil is precies waar het bestand tussendoor viel. */
  ok('en de afgeleide webp die alleen in file_assets stond',
    gewist.includes('delivery/VIS-2608-0010/p1-voorkant.webp'), true,
    gewist.join(' '));
  ok('en het portret van het merkmodel', gewist.includes('models/7/1-portret.jpg'), true);
  /* DE FACTUUR-PDF BLIJFT. Hij hoort bij het document dat om dezelfde reden blijft
     staan als de rij eromheen; hem weggooien zou de bewaarplicht breken en de
     factuur onleesbaar achterlaten. */
  ok('de factuur-pdf is niet verwijderd', gewist.includes('invoices/2026/VIS-2026-0001.pdf'), false,
    gewist.join(' | '));
}

console.log('\nhet logboek zegt wat er is gebeurd, zonder de naam opnieuw op te schrijven');
{
  const log = db.prepare("SELECT * FROM admin_log WHERE action = 'customer.wipe'").all();
  ok('er staat een logregel', log.length, 1);
  const detail = log[0]?.detail || '';
  /* Zonder merknaam. Hier stond `VOLT: 2 bestellingen gewist`, en dat is de naam die
     de klant net had gevraagd te verwijderen -- die overleefde het verzoek dus in het
     logboek dat moet aantonen dat het verzoek is uitgevoerd. */
  ok('en die noemt de merknaam niet meer', /VOLT/.test(detail), false, detail);
  ok('wel het klantnummer', /#7/.test(detail), true, detail);
  ok('en de aantallen', /1 bestelling\(en\) gewist/.test(detail), true, detail);
  ok('inclusief wat er bewaard is', /1 met factuur bewaard/.test(detail), true, detail);
}

console.log('\nde blinde DELETE mag niet terugkomen, ook niet als hij toevallig werkt');
{
  /*
   * ── EEN GAT DAT DE MUTATIETEST BLOOTLEGDE ──────────────────────────────────
   *
   * De oude, kapotte regel `DELETE FROM orders WHERE customer_id = ?` teruggezet en
   * deze test bleef groen: 69 van 69. Dat is geen geluk maar een MASKERING. In de
   * batch staat `strip` vóór de deletes, en die zet `customer_id` op NULL. Daarna
   * matcht een blinde delete op klantnummer niets meer — dus valt de foreign key
   * nooit over de gefactureerde bestelling, en lijkt alles in orde.
   *
   * Het gedrag klopt dus per ongeluk, en dat is precies het soort afhankelijkheid dat
   * bij de volgende opschoning omvalt: verplaatst iemand `strip` naar achteren, of
   * haalt hij de `customer_id = NULL` eruit, dan is de bug van 12 augustus terug —
   * bestanden weg, rijen intact, geen logregel — en gaat geen enkele assertie
   * hierboven rood.
   *
   * Er valt niets te meten aan gedrag dat er niet is. Dus wordt hier de VORM
   * vastgehouden: bestellingen worden per id verwijderd, uit de lijst zonder factuur,
   * en nooit in één keer op klantnummer. Een broncheck is hier het juiste gereedschap
   * en niet een compromis -- de invariant gaat over hoe het statement is opgebouwd.
   */
  const SRC = readFileSync(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  const wipeFn = (() => {
    const start = SRC.indexOf('async function handleCustomerWipe');
    const einde = SRC.indexOf('\nasync function ', start + 10);
    return start === -1 ? '' : SRC.slice(start, einde === -1 ? undefined : einde);
  })();
  ok('de wipe-functie is gevonden', wipeFn.length > 500, true, `${wipeFn.length} tekens`);
  ok('bestellingen worden per id verwijderd',
    /wipeIds\.map\(\(id\) => env\.DB\.prepare\('DELETE FROM orders WHERE id = \?1'\)/.test(wipeFn), true);
  ok('en nooit in één keer op klantnummer',
    /DELETE FROM orders WHERE customer_id/.test(wipeFn), false);
  /* En de tegenhanger: de lijst waaruit die ids komen moet de bestellingen MET een
     uitgereikt document uitsluiten. Zonder die regel is de per-id-delete net zo
     kapot als de blinde. */
  ok('en de lijst sluit de gefactureerde bestellingen uit',
    /const wipeIds = ids\.filter\(\(id\) => !billed\.has\(id\)\)/.test(wipeFn), true);
}

console.log('\nen een tweede keer wissen doet niets kapot');
{
  /* Idempotentie is hier geen luxe: de knop staat op een pagina die iemand kan
     verversen, en na de eerste wipe bestaat de klant niet meer. Dan hoort er een
     nette 404 te komen en geen halve tweede ronde over de factuur die er nog staat. */
  const tweede = await adminPost({
    request: new Request('https://visuails.com/admin/customers/7/wipe', {
      method: 'POST',
      headers: { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' },
      body: new URLSearchParams({ confirm: 'VOLT' }),
    }),
    env,
    waitUntil() {},
  });
  ok('de tweede poging geeft 404', tweede.status, 404);
  ok('en de factuur staat er nog steeds', telling('SELECT COUNT(*) FROM invoices'), 1);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
