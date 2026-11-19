/**
 * VISUAILS — levering 118 (17 november 2026), bouwer BG: de bestelpagina /o/ en de offertemail.
 *   P5-01  een aanvraag krijgt "Je aanvraag": de brief en de stappen Aanvraag → Voorstel → Offerte → Bestelling
 *   N3-02  "Dit is een aanvraag…" alleen zolang er nog geen offerte is
 *   P12-06 na de bewaartermijn één staat: de downloadperiode is voorbij, met Studio, WhatsApp en mail
 *   P4-06  eerst factuurgegevens en de zakelijke verklaring, dan betalen; de mail wijst daarheen
 *   N3-01  de offertemail zegt niet meer "zoals besproken"
 * Op een echte database (node:sqlite, schema.sql), met Resend nagebootst. Zonder build.
 *   node tests/levering-118-bestelpagina.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { portalGet, portalPost, downloadVerlopenOp, isAanvraagWeergave, factuurNodig } from '../src/lib/portal.js';
import { stuurBetaallink } from '../src/lib/betaallink.js';
import { mintToken, hashToken } from '../src/lib/token.js';
/* levering 118 (integratie IA): de blokken voor P4-05 zijn eruit gehaald; die punten hebben advies "later" (lijst 127). */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const tekst = (x) => String(x || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, '’').replace(/\s+/g, ' ');

const gezien = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  gezien.push({ url: String(url), body: opts.body ? String(opts.body) : '' });
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt', !mislukt?.length, JSON.stringify(mislukt));
const r2 = new Map();
const env = {
  DB: d1(db), RESEND_API_KEY: 're_test_nep', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', NOTIFY_EMAIL: 'studio@example.test',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
  UPLOADS: { async put(k, b) { r2.set(k, b); }, async get() { return null; }, async head() { return null; }, async delete() {}, async list() { return { objects: [] }; } },
};
db.exec("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'look@example.test', 'Test Fatima', 'TEST Fatima BV', 'NL')");
const LOOK = JSON.stringify({ request: 'custom-look', look_concept: 'own', look_service: 'lifestyle', look_world: 'Een hete betonnen dakrand om twaalf uur, harde schaduwen', look_references: 'https://voorbeeld.test/a\nhttps://voorbeeld.test/b', look_when: 'month', business_declaration: 'MISSING' });
db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, lang, country, payment_status, details_json, created_at)
  VALUES (10, 'VIS-LOOK-AAA', 1, 'custom', 'received', 'Test Fatima', 'TEST Fatima BV', 'look@example.test', 'nl', 'NL', 'unpaid', '${LOOK.replace(/'/g, "''")}', datetime('now'))`);
const link = async (orderId) => {
  const t = await mintToken();
  db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?, ?)').run(orderId, await hashToken(t));
  return t;
};
const open = async (t, q = '') => (await portalGet({ request: new Request(`https://visuails.com/o/${t}${q}`), env, waitUntil() {} }));

console.log('\nP5-01 · een aanvraag als aanvraag');
const t10 = await link(10);
let r = await open(t10);
let html = await r.text();
let tx = tekst(html);
ok('de pagina opent', r.status === 200, String(r.status));
ok('kop "Je aanvraag", niet "Je bestanden"', /<h1>Je aanvraag<\/h1>/.test(html) && !/<h1>Je bestanden<\/h1>/.test(html));
ok('de brief staat erop: de wereld, de referenties, wanneer', tx.includes('Een hete betonnen dakrand om twaalf uur') && tx.includes('https://voorbeeld.test/b') && tx.includes('Binnen een maand'));
ok('een keuze staat in woorden, niet als code', tx.includes('Ik heb het concept') && tx.includes('Lifestylescènes'));
ok('de stappen Aanvraag → Voorstel → Offerte → Bestelling, met Aanvraag als nu', /aria-current="step"><span class="pad-stip" aria-hidden="true"><\/span>Aanvraag/.test(html) && /Voorstel/.test(tx) && /Offerte/.test(tx) && /Bestelling/.test(tx));
ok('geen download-, goedkeur- of revisietekst', !/Download wat je nodig hebt/.test(tx) && !/keur goed/i.test(tx) && !/revisieronde/i.test(tx) && !/In productie/.test(tx));
ok('wel "Dit is een aanvraag…" zolang er geen offerte is', /Dit is een aanvraag\. We antwoorden schriftelijk/.test(tx));
ok('isAanvraagWeergave: na betalen niet meer', !isAanvraagWeergave({ service: 'custom', status: 'received', payment_status: 'paid', details_json: LOOK }));

console.log('\nN3-02 en P4-06 · de offerte staat er: eerst de factuurgegevens');
db.exec(`UPDATE orders SET total_cents = 50000, vat_cents = 10500, vat_rate = 0.21, vat_treatment = 'nl_standard', review_state = 'approved', reviewed_at = datetime('now') WHERE id = 10`);
r = await open(t10);
html = await r.text();
tx = tekst(html);
ok('"Dit is een aanvraag…" staat er niet meer', !/Dit is een aanvraag\. We antwoorden/.test(tx));
ok('de stap Offerte is nu', /aria-current="step"><span class="pad-stip" aria-hidden="true"><\/span>Offerte/.test(html));
ok('zonder adres: het blok "Je factuurgegevens", geen betaalknop', /id="factuur"/.test(html) && !/\/api\/order-pay\?ref=VIS-LOOK-AAA/.test(html) && factuurNodig({ service: 'custom', status: 'received', payment_status: 'unpaid', total_cents: 50000, details_json: LOOK }));
ok('met de zakelijke verklaring als verplicht vinkje', /name="zakelijk" value="ja" required data-melding=/.test(html) && /Ik bestel voor mijn bedrijf of beroep/.test(tx));
ok('het land staat erbij, niet te wijzigen', /De btw op je offerte volgt dit land/.test(tx) && !/name="land"/.test(html));
const post = async (t, velden) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  return portalPost({ request: new Request(`https://visuails.com/o/${t}`, { method: 'POST', body: fd, headers: { origin: 'https://visuails.com' } }), env, waitUntil() {} });
};
r = await post(t10, { action: 'factuur', bedrijf: 'TEST Fatima BV', straat: 'Teststraat 1', postcode: '1234 AB', plaats: '' });
ok('onvolledig: terug met een melding, niets opgeslagen', r.status === 303 && /factuur=fout/.test(r.headers.get('location') || '') && !db.prepare('SELECT address_line1 FROM orders WHERE id = 10').get().address_line1);
r = await post(t10, { action: 'factuur', bedrijf: 'TEST Fatima BV', straat: 'Teststraat 1', postcode: '1234 AB', plaats: 'Teststad' });
ok('zonder vinkje: ook niet', r.status === 303 && /factuur=fout/.test(r.headers.get('location') || ''));
r = await post(t10, { action: 'factuur', bedrijf: 'TEST Fatima BV', straat: 'Teststraat 1', postcode: '1234 AB', plaats: 'Teststad', zakelijk: 'ja' });
const o10 = db.prepare('SELECT * FROM orders WHERE id = 10').get();
ok('volledig: het adres staat op de bestelling', o10.address_line1 === 'Teststraat 1' && o10.postal_code === '1234 AB' && o10.city === 'Teststad');
ok('en de zakelijke verklaring met versie', /^business-v/.test(JSON.parse(o10.details_json).business_declaration));
ok('terug naar de pagina (geen POST-doorverwijzing naar Mollie, CSP form-action)', r.status === 303 && /^\/o\/[^?]+#nu$/.test(r.headers.get('location') || ''), r.headers.get('location'));
r = await open(t10);
html = await r.text();
ok('daarna: geen factuurblok meer, wel de knop Betalen', !/id="factuur"/.test(html) && /\/api\/order-pay\?ref=VIS-LOOK-AAA/.test(html));
ok('het account is niet veranderd (het token is geen inlog)', db.prepare('SELECT address_line1 FROM customers WHERE id = 1').get().address_line1 == null);

console.log('\nP4-06 en N3-01 · de offertemail');
db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, lang, country, payment_status, total_cents, vat_cents, vat_rate, vat_treatment, review_state, reviewed_at, details_json)
  VALUES (11, 'VIS-VID2-AAA', 1, 'video', 'received', 'Test Fatima', 'TEST Fatima BV', 'look@example.test', 'nl', 'NL', 'unpaid', 36000, 7560, 0.21, 'nl_standard', 'approved', datetime('now'), '{"request":"video","quote_inhoud":"Twee clips","quote_klaar_op":"2026-12-01","business_declaration":"MISSING"}')`);
let voor = mails().length;
const url = await stuurBetaallink(env, 11, { origin: 'https://visuails.com', offerte: true });
const om = mails().slice(voor).find((x) => /Je offerte/.test(x.subject));
ok('zonder adres wijst de knop naar de bestelpagina (#factuur)', /^https:\/\/visuails\.com\/o\/[A-Za-z0-9_-]+#factuur$/.test(url) && om && om.html.includes('#factuur'), url);
ok('de mail zegt dat je eerst je adres invult', om && /vul je eerst je factuuradres in/.test(om.html));
ok('geen "zoals besproken"', om && !/zoals besproken/.test(om.html));
ok('wel: met wat je krijgt en wanneer het klaar is', om && /met wat je krijgt en wanneer het klaar is/.test(om.html));
db.exec("UPDATE orders SET address_line1 = 'Teststraat 1', postal_code = '1234 AB', city = 'Teststad' WHERE id = 11");
voor = mails().length;
const url2 = await stuurBetaallink(env, 11, { origin: 'https://visuails.com', offerte: true });
ok('met adres gewoon /api/order-pay', /\/api\/order-pay\?ref=VIS-VID2-AAA/.test(url2), url2);
ok('ook in het Engels zonder "as discussed"', !/as discussed/.test(lees('src/lib/betaallink.js').replace(/\/\*[\s\S]*?\*\//g, '')));

console.log('\nP12-06 · na de bewaartermijn');
db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, lang, country, payment_status, total_cents, product_count, tier, delivered_at, delivery_mailed_at, closed_at, details_json)
  VALUES (12, 'VIS-OUD1-AAA', 1, 'catalog', 'delivered', 'Test Fatima', 'TEST Fatima BV', 'look@example.test', 'en', 'NL', 'paid', 9900, 1, 'unattended', datetime('now', '-96 days'), datetime('now', '-96 days'), datetime('now', '-75 days'), '{}')`);
db.exec(`INSERT INTO files (order_id, kind, r2_key, filename, bytes, expires_at, review_state) VALUES (12, 'delivery', 'lever/VIS-OUD1-AAA/1.jpg', '1.jpg', 10, datetime('now', '-6 days'), 'approved')`);
const t12 = await link(12);
r = await open(t12);
html = await r.text();
tx = tekst(html);
ok('de link opent nog (90 dagen na afronden)', r.status === 200, String(r.status));
ok('één staat: "The download period has ended"', /The download period has ended/.test(tx));
ok('met de laatste dag, in woorden met jaar', /could be downloaded until \d{1,2} [A-Z][a-z]+ \d{4}/.test(tx), tx.slice(0, 400));
ok('niet meer "ready to download" en niet "not ready yet"', !/ready to download/i.test(tx) && !/not ready yet/i.test(tx));
ok('knoppen naar Studio, WhatsApp en mail, met de referentie', /href="\/account\/orders\?lang=en"/.test(html) && /wa\.me\/[^"]*VIS-OUD1-AAA/.test(html) && /mailto:hello@visuails\.com\?subject=VIS-OUD1-AAA/.test(html));
ok('downloadVerlopenOp: met een levend bestand niet', downloadVerlopenOp({ status: 'delivered', delivery_mailed_at: '2026-01-01 10:00:00' }, [{ expires_at: '2099-01-01 00:00:00' }], '2026-11-17') === '');
ok('downloadVerlopenOp: vóór de bewaardag niet', downloadVerlopenOp({ status: 'delivered', delivery_mailed_at: '2026-11-01 10:00:00' }, [], '2026-11-17') === '');
ok('downloadVerlopenOp: daarna wel', /^\d{4}-\d{2}-\d{2}$/.test(downloadVerlopenOp({ status: 'delivered', delivery_mailed_at: '2026-01-01 10:00:00' }, [], '2026-11-17')));
ok('de teksten staan in NL en EN', /De downloadperiode is voorbij/.test(lees('src/lib/portal.js')) && /The download period has ended/.test(lees('src/lib/portal.js')));

console.log('\nP4-10 · een vastgelegd merkmodel op de bestelpagina');
db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, name, email, lang, payment_status, total_cents, closed_at, delivered_at, details_json)
  VALUES (13, 'VIS-MM02-AAA', 1, 'brand-model', 'delivered', 'Test Fatima', 'look@example.test', 'nl', 'paid', 45000, datetime('now'), datetime('now'), '{}')`);
r = await open(await link(13));
tx = tekst(await r.text());
ok('"Je merkmodel staat vast", niet "Je beelden staan klaar"', /Je merkmodel staat vast/.test(tx) && !/Je beelden staan klaar/.test(tx), tx.slice(0, 300));
ok('en niet "nog niet klaar … we mailen je"', !/nog niet klaar/.test(tx) && /geen bestanden om te downloaden/.test(tx));

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
