/**
 * VISUAILS — levering 118 (17 november 2026), integratie IA: de achterkant na de zeven bouwers.
 *   later   P12-04, P4-05, P5-02 en P5-13 hebben advies "later" (lijst 127) en zijn weer uit de code
 *   schema  migraties 0074 en 0075 in schema.sql
 *   P4-09   MERKMODEL_RICHTINGEN_WERKDAGEN; /admin plant een merkmodel op die termijn in werkdagen, niet "af morgen"
 *   P4-10   nuZin() zegt bij een afgerond merkmodel "staat vast", zonder knoppen
 *   P4-07   het onderwerp "Hooks" in /api/order (contact)
 *   B1-05   /api/order zet details.zonder_inlog; P5-11 het VIES-nummer van een abonnement wordt bewaard
 *   W1-09   de opmerking van de klant (met belknop) bovenaan de studiomail
 *   L-07    setTerugCookie() is geëxporteerd
 *   W2-10   de betaallinkmail zegt "Je vulde geen btw-nummer in" bij een EU-klant zonder nummer
 *   B1-11   /admin heeft labels voor de mislukte, afgebroken en verlopen betalingen
 *   P3-08   /api/capacity rekent de extra beelden mee; P3-11 `vol` en per venster `days`
 *   P2-06   /api/upload leest de afmeting en markeert een te kleine foto; /admin en de studiomail noemen hem
 *   L-16    voorrang telt vanaf betaald én foto's compleet; bij voorrang geen overboeking
 *   P6-03   portfolio opt-in in de licentie; P6-07 "Je mag deze beelden overal gebruiken"; B1-01 btw-nummer in proef-check
 * Zonder build: de functies zelf op een echte database (node:sqlite, schema.sql), en de bron waar dat genoeg zegt.
 *   node tests/levering-118-integratie-ia.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { d1, verseDb } from './lib/d1sqlite.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

const gezien = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  gezien.push({ url: String(url), body: opts.body ? String(opts.body) : '' });
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));

/* ── de later-punten ─────────────────────────────────────────────────────── */
console.log('\nadvies "later": P12-04, P4-05, P5-02, P5-13 zijn eruit');
const opMaat = await import('../src/lib/opMaat.js');
const opMaatMail = await import('../src/lib/opMaatMail.js');
const portal = await import('../src/lib/portal.js');
const account = await import('../src/lib/account.js');
const { invoiceEmail } = await import('../src/lib/invoiceMail.js');
ok('P5-02: geen openbareAanvragenVan/conceptUitOpenbareAanvraag meer', !('openbareAanvragenVan' in opMaat) && !('conceptUitOpenbareAanvraag' in opMaat));
ok('P5-02: Studio en /admin tonen geen tweede lijst "via het formulier"', !/Via het formulier op de site/.test(lees('src/pages/account/op-maat.astro')) && !/Eigen look via het formulier op de site/.test(lees('src/lib/adminOpMaat.js')));
ok('P5-13: geen "Je offerte staat nog"-mail en geen offerteTerug() in de nachttaak', !('offerteStaatNogMail' in opMaatMail) && !/offerteTerug/.test(lees('cron/index.js')));
ok('P5-09 blijft: de afrondmail bestaat nog', typeof opMaatMail.aanvraagAfgerondMail === 'function');
ok('P4-05: geen uploadvak voor productfoto’s bij een offerte op /o/', !('offerteFotosOpen' in portal) && !('bewaarOfferteFotos' in portal) && !/offerteFotos/.test(lees('src/lib/portal.js')));
ok('P4-06 blijft: de factuurstap op /o/', typeof portal.factuurNodig === 'function');
ok('P12-04: geen kolom "Factuur aan" in Facturen', !('invBilledTo' in account.COPY.nl) && !/invBilledTo|r\.aan/.test(lees('src/pages/account/invoices.astro')));
ok('P12-04: geen merk in het overzicht', !/meerMerken/.test(lees('src/pages/account/index.astro')));
const betaalMail = invoiceEmail({ lang: 'nl', order: { ref: 'VIS-MRKB-AAA', name: 'Test' }, invoice: { number: 'PROEF-2026-0101' }, snap: { netCents: 1000, vatCents: 210, customer: { company: 'TEST Merk B BV' } }, accountMerk: 'TEST Bureau' });
ok('P12-04: het onderwerp van de betaalmail zoals in levering 117', betaalMail.subject === 'Betaling ontvangen — VIS-MRKB-AAA' && !/Factuur aan/.test(betaalMail.html), betaalMail.subject);

/* ── schema ──────────────────────────────────────────────────────────────── */
console.log('\nschema.sql met 0074 en 0075');
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt', !mislukt?.length, JSON.stringify(mislukt));
ok('maat_aanvragen.merk_json (0074)', db.prepare('PRAGMA table_info(maat_aanvragen)').all().some((c) => c.name === 'merk_json'));
ok('subscriptions.vat_consultation (0075)', db.prepare('PRAGMA table_info(subscriptions)').all().some((c) => c.name === 'vat_consultation'));
const env = { DB: d1(db), RESEND_API_KEY: 're_test_nep', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', NOTIFY_EMAIL: 'studio@example.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };

/* ── P4-09 en P4-10 ──────────────────────────────────────────────────────── */
console.log('\nP4-09 · de termijn van een merkmodel; P4-10 · een afgerond merkmodel');
const { MERKMODEL_RICHTINGEN_WERKDAGEN } = await import('../src/data/termijnen.js');
const agenda = await import('../src/lib/agenda.js');
ok('MERKMODEL_RICHTINGEN_WERKDAGEN staat in termijnen.js (3, het voorbeeld uit het voorstel)', MERKMODEL_RICHTINGEN_WERKDAGEN === 3);
ok('werkdagenNa() slaat het weekend over: vrijdag 20 november + 3 = woensdag 25 november', agenda.werkdagenNa('2026-11-20', 3) === '2026-11-25');
ok('… en een dichtgezette dag', agenda.werkdagenNa('2026-11-20', 3, new Set(['2026-11-23'])) === '2026-11-26');
const mm = agenda.agendaUiterlijk({ service: 'brand-model', created_at: '2026-11-19 10:00:00', paid_at: '2026-11-20 09:00:00', details_json: '{}' });
ok('/admin plant een merkmodel op betaald + termijn, niet op "af morgen"', mm.dag === agenda.werkdagenNa('2026-11-20', MERKMODEL_RICHTINGEN_WERKDAGEN) && mm.manier === 'asap', JSON.stringify(mm));
const cat = agenda.agendaUiterlijk({ service: 'catalog', created_at: '2026-11-20 10:00:00', details_json: '{}' });
ok('een catalogbestelling plant zoals voorheen', cat.dag === '2026-11-21', JSON.stringify(cat));
ok('Studio en de betaalmail lezen het getal (de zin staat er nu)', JSON.stringify(account.orderView(account.COPY.nl, 'nl', { id: 9, ref: 'VIS-MM01-AAA', service: 'brand-model', status: 'received', payment_status: 'paid', total_cents: 45000, lang: 'nl', details_json: '{}' }, [], [])).includes(`binnen ${MERKMODEL_RICHTINGEN_WERKDAGEN} werkdagen`));
const { nuZin } = await import('../src/lib/nuzin.js');
const vast = nuZin({ service: 'brand-model', status: 'delivered', closed_at: '2026-11-17 10:00:00', payment_status: 'paid', total_cents: 45000 }, { files: [] }, 'nl');
ok('nuZin(): een afgerond merkmodel "staat vast", zonder knoppen', vast.soort === 'merkmodelVast' && /Je merkmodel staat vast/.test(vast.zin) && vast.knoppen.length === 0, JSON.stringify(vast));
ok('… ook in het Engels', /Your brand model is locked/.test(nuZin({ service: 'brand-model', status: 'delivered', closed_at: '2026-11-17 10:00:00', payment_status: 'paid', total_cents: 1 }, { files: [] }, 'en').zin));

/* ── order.js, subscribe.js, account.js ──────────────────────────────────── */
console.log('\n/api/order, abonnement, inlog');
const orderSrc = lees('functions/api/order.js');
ok('P4-07: "Hooks" bij de onderwerpen (NL en EN)', /hooks: 'Hooks', other: 'Anders'/.test(orderSrc) && /hooks: 'Hooks', other: 'Other'/.test(orderSrc));
ok('B1-05: zonder sessie op een bestaand adres zet /api/order details.zonder_inlog', /if \(customerId && !klantNieuw && !metSessie\) details\.zonder_inlog = 1;/.test(orderSrc));
ok('B1-05: account.js leest dat vinkje', account.vreemdeOnbetaald({ payment_status: 'unpaid', details_json: '{"zonder_inlog":1}' }) === true);
ok('W1-09: de opmerking bovenaan de studiomail, met belknop bij telefoon/WhatsApp', /\$\{opmerkingVlak\}/.test(orderSrc) && /contactVoorkeur: contactPreference,/.test(orderSrc) && /mailButton\(`tel:\$\{belNr\}`/.test(orderSrc));
ok('P5-02 bleef uit /api/order (geen conceptUitOpenbareAanvraag)', !/conceptUitOpenbareAanvraag/.test(orderSrc));
ok('P5-11: het VIES-nummer van een verlegd abonnement wordt bewaard', /UPDATE subscriptions SET vat_consultation = \?2 WHERE id = \?1/.test(lees('src/lib/subscribe.js')));
ok('L-07: setTerugCookie() is geëxporteerd', typeof account.setTerugCookie === 'function' && /^vs_terug=|=%2Fnl%2Fstart%2Fplan/.test(account.setTerugCookie('/nl/start/plan?plan=brand')));
ok('B1-01: proef-check geeft het btw-nummer door', /proefGebruikt\(env, \{ email, phone, reg, vat \}\)/.test(lees('functions/api/proef-check.js')));

/* ── W2-10: betaallinkmail ───────────────────────────────────────────────── */
console.log('\nW2-10 · de betaallinkmail bij een EU-klant zonder btw-nummer');
const { stuurBetaallink } = await import('../src/lib/betaallink.js');
db.exec("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'be@example.test', 'Test Jan', 'TEST BE BV', 'BE')");
db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, lang, country, payment_status, total_cents, vat_cents, vat_rate, vat_treatment, review_state, reviewed_at, product_count, details_json)
  VALUES (21, 'VIS-BEZN-AAA', 1, 'catalog', 'received', 'Test Jan', 'TEST BE BV', 'be@example.test', 'nl', 'BE', 'unpaid', 18000, 3780, 0.21, 'nl_standard', 'approved', datetime('now'), 2, '{}'),
         (22, 'VIS-BEMN-AAA', 1, 'catalog', 'received', 'Test Jan', 'TEST BE BV', 'be@example.test', 'nl', 'BE', 'unpaid', 18000, 3780, 0.21, 'nl_standard', 'approved', datetime('now'), 2, '{}')`);
db.exec("UPDATE orders SET vat_number = 'BE0123456789' WHERE id = 22");
let voor = mails().length;
await stuurBetaallink(env, 21, { origin: 'https://visuails.com' });
const zonder = mails().slice(voor).map((m) => m.html).join(' ');
ok('zonder nummer: "Je vulde geen btw-nummer in", niet "Alles klopt"', /Je vulde geen btw-nummer in, dus rekenen we 21% Nederlandse btw/.test(zonder) && !/Alles klopt/.test(zonder));
voor = mails().length;
await stuurBetaallink(env, 22, { origin: 'https://visuails.com' });
ok('met een niet bevestigd nummer: de oude VIES-zin blijft', /niet bevestigen/.test(mails().slice(voor).map((m) => m.html).join(' ')));

/* ── B1-11: /admin ───────────────────────────────────────────────────────── */
console.log('\nB1-11 · /admin');
const adminSrc = lees('src/lib/admin.js');
ok('labels voor payment.failed/canceled/expired en proef.twijfel', /'payment\.failed': 'Betaling mislukt', 'payment\.canceled': 'Betaling afgebroken', 'payment\.expired': 'Betaling verlopen'/.test(adminSrc) && /'proef\.twijfel': /.test(adminSrc));
ok('de bestelpagina noemt de laatste mislukte poging', /laatste poging \$\{MISLUKTE_POGING\[laatstePoging\.status\]\}/.test(adminSrc));

/* ── P3-08 en P3-11: capaciteit ──────────────────────────────────────────── */
console.log('\nP3-08 en P3-11 · /api/capacity');
const cap = await import('../src/data/capacity.js');
const today = '2026-11-23';
const leeg = cap.clearedWindows({ today, products: 2, service: 'catalog' });
const eerste = leeg.windows[0].start;
const booked = { [cap.addDays(eerste, 1)]: cap.ATTENDED_PUNTEN_PER_DAG, [cap.addDays(eerste, 2)]: cap.ATTENDED_PUNTEN_PER_DAG };
const vol = cap.clearedWindows({ today, products: 2, service: 'catalog', booked });
ok('`vol` noemt de volle dagen', JSON.stringify(vol.vol) === JSON.stringify([cap.addDays(eerste, 1), cap.addDays(eerste, 2)]), JSON.stringify(vol.vol));
ok('het venster eroverheen draagt zijn dagen', JSON.stringify(vol.windows[0].days) === JSON.stringify([eerste, cap.addDays(eerste, 3)]), JSON.stringify(vol.windows[0]));
ok('een lege agenda heeft geen volle dagen', Array.isArray(leeg.vol) && leeg.vol.length === 0);
const capSrc = lees('functions/api/capacity.js');
ok('/api/capacity geeft extras door aan de poort en zet ze in de cachesleutel', /clearedWindows\(\{ today, products, service, booked, blackouts, from, extras \}\)/.test(capSrc) && /extras: extrasVan\(url\), dag: todayUTC\(\)/.test(capSrc));
ok('… en `days` per venster en `vol`', /days: w\.days/.test(capSrc) && /vol: gate\.vol \|\| \[\]/.test(capSrc));

/* ── P2-06: afmeting ─────────────────────────────────────────────────────── */
console.log('\nP2-06 · de afmeting uit de kop');
const up = await import('../src/lib/uploads.js');
const png = new Uint8Array(32); png.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x02, 0x58, 0, 0, 0x01, 0xC2]);
ok('PNG 600 × 450', JSON.stringify(up.beeldAfmeting(png)) === '{"breed":600,"hoog":450}', JSON.stringify(up.beeldAfmeting(png)));
const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xFF, 0xC0, 0, 17, 8, 0x0F, 0xA0, 0x0B, 0xB8, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
ok('JPEG (SOF0 na APP0) 3000 × 4000', JSON.stringify(up.beeldAfmeting(jpeg)) === '{"breed":3000,"hoog":4000}', JSON.stringify(up.beeldAfmeting(jpeg)));
const webp = new Uint8Array(30); webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, 0, 0, 0, 0, 0x57, 0x02, 0, 0xC1, 0x01, 0]);
ok('WebP (VP8X) 600 × 450', JSON.stringify(up.beeldAfmeting(webp)) === '{"breed":600,"hoog":450}', JSON.stringify(up.beeldAfmeting(webp)));
ok('te klein onder MIN_LANGE_ZIJDE, groot genoeg erboven, onleesbaar telt niet', up.teKleinVoorStudio({ breed: 600, hoog: 450 }) && !up.teKleinVoorStudio({ breed: 3000, hoog: 4000 }) && !up.teKleinVoorStudio(null));
const r2lijst = { async list() { return { objects: [
  { key: 'intake/CklGoyiDkAx0R8WBYYMM_Xq0eZyJ27utwznN7LXWWPc/001-aaaa-jas.jpg', size: 10, customMetadata: { original: 'jas.jpg', product: 'p1', shot: 'front', klein: '1', px: '600x450' } },
  { key: 'intake/CklGoyiDkAx0R8WBYYMM_Xq0eZyJ27utwznN7LXWWPc/002-bbbb-jas2.jpg', size: 10, customMetadata: { original: 'jas2.jpg', product: 'p1', shot: 'back' } },
] }; } };
const lijst = await up.listBatch({ UPLOADS: r2lijst }, 'CklGoyiDkAx0R8WBYYMM_Xq0eZyJ27utwznN7LXWWPc');
ok('listBatch() geeft `klein` en de maat door, en laat de andere foto zoals hij was', lijst.length === 2 && lijst[0].klein === true && lijst[0].px === '600x450' && !('klein' in lijst[1]), JSON.stringify(lijst));
ok('/api/upload zet klein/px in de customMetadata', /\.\.\.\(teKlein \? \{ klein: '1', px: `\$\{afmeting\.breed\}x\$\{afmeting\.hoog\}` \} : \{\}\)/.test(lees('functions/api/upload.js')));
ok('/api/order zet ze in details.te_klein; studiomail en /admin noemen ze', /details\.te_klein = klein/.test(orderSrc) && /\$\{teKleinVlak\}/.test(orderSrc) && /rij\('Te klein', d\.te_klein/.test(adminSrc));

/* ── L-16: voorrang vanaf betaald én foto's compleet ─────────────────────── */
console.log('\nL-16 · voorrang vanaf betaald én foto’s compleet');
const fc = await import('../src/lib/fotosCompleet.js');
const V = (extra) => JSON.stringify({ voorrang: '1', ...extra });
ok('zonder vlag: vanaf de betaling, zoals altijd', fc.voorrangVanaf({ paid_at: '2026-11-17 10:00:00', details_json: V({}) }) === '2026-11-17 10:00:00');
ok('foto’s wachten nog: de termijn loopt nog niet', fc.voorrangVanaf({ paid_at: '2026-11-17 10:00:00', details_json: V({ fotos_wacht: 1 }) }) === null);
ok('foto’s later compleet: vanaf dat moment', fc.voorrangVanaf({ paid_at: '2026-11-17 10:00:00', details_json: V({ fotos_wacht: 1, fotos_compleet_at: '2026-11-18 16:00:00' }) }) === '2026-11-18 16:00:00');
ok('niet betaald: geen termijn', fc.voorrangVanaf({ paid_at: null, details_json: V({}) }) === null);
db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, email, lang, payment_status, paid_at, product_count, details_json)
  VALUES (31, 'VIS-VRNG-AAA', 1, 'catalog', 'received', 'be@example.test', 'nl', 'paid', '2026-11-17 10:00:00', 1, '${V({ fotos_wacht: 1 })}'),
         (32, 'VIS-VRNG-BBB', 1, 'catalog', 'received', 'be@example.test', 'nl', 'paid', '2026-11-17 10:00:00', 1, '${V({})}')`);
ok('markeerFotosCompleet(): niet zolang er iets open is', await fc.markeerFotosCompleet(env, 31, [{ key: 'p1', mist: ['back'] }]) === false);
ok('… wel als alles binnen is, één keer', await fc.markeerFotosCompleet(env, 31, []) === true && await fc.markeerFotosCompleet(env, 31, []) === false);
const na = JSON.parse(db.prepare('SELECT details_json FROM orders WHERE id = 31').get().details_json);
ok('… het moment staat in details_json, de rest bleef', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(na.fotos_compleet_at) && na.voorrang === '1' && na.fotos_wacht === 1, JSON.stringify(na));
ok('… en een bestelling die niet wachtte, krijgt niets', await fc.markeerFotosCompleet(env, 32, []) === false);
const wacht = agenda.agendaUiterlijk({ service: 'catalog', created_at: '2026-11-17 09:00:00', paid_at: '2026-11-17 10:00:00', details_json: V({ fotos_wacht: 1 }) });
ok('/admin en Nu doen: zonder foto’s geen voorrangsdag, maar de streefdag', wacht.manier === 'voorrang' && !wacht.uur, JSON.stringify(wacht));
const { toeslagGemist } = await import('../src/lib/nudoen.js');
ok('Nu doen: geen "voorrang gemist" (en geen toeslag terug) zolang de foto’s ontbraken', toeslagGemist({ paid_at: '2026-11-17 10:00:00', delivered_at: '2026-11-30 10:00:00', details_json: V({ fotos_wacht: 1 }) }) === null
  && !!toeslagGemist({ paid_at: '2026-11-17 10:00:00', delivered_at: '2026-11-30 10:00:00', details_json: V({}) }));
const { voorrangMethods } = await import('../src/lib/mollie.js');
ok('Mollie bij voorrang: geen overboeking, iDEAL wel', !voorrangMethods().includes('banktransfer') && voorrangMethods().includes('ideal'));
ok('… op 0% geen iDEAL, buiten de EU ook geen Bancontact', !voorrangMethods({ excludeIdeal: true }).includes('ideal') && !voorrangMethods({ excludeIdeal: true, buitenEu: true }).includes('bancontact'));
ok('de drie betaalpaden geven voorrang mee', /voorrang: !!quote\.voorrang,/.test(orderSrc) && /voorrang: heeftVoorrang\(o\),/.test(lees('functions/api/order-pay.js')) && /voorrang: heeftVoorrang\(order\),/.test(lees('src/lib/account.js')));
ok('/api/order zet fotos_wacht bij voorrang zonder alle foto’s', /details\.fotos_wacht = 1/.test(orderSrc));
ok('Studio en de bestelpagina leggen het moment vast na een upload', /markeerFotosCompleet\(env, orderId, nogOpen\)/.test(lees('src/lib/account.js')) && /markeerFotosCompleet\(env, orderId, nogOpen\)/.test(lees('src/lib/nasturen.js')));

/* ── P6-03, P6-07 ────────────────────────────────────────────────────────── */
console.log('\nP6-03 en P6-07 · de levermap');
const scaffold = lees('src/lib/scaffold.js');
ok('P6-03: de licentie zegt opt-in, niet "tenzij je bezwaar maakt"', /alleen in zijn portfolio zien als je daar/.test(scaffold) && /only shows these images in its portfolio if you say yes/.test(scaffold) && !/bezwaar tegen maakt/.test(scaffold) && !/unless you object/.test(scaffold));
const lever = lees('src/lib/delivery.js');
ok('P6-07: "Je mag deze beelden overal gebruiken" in plaats van "zijn van jou"', /Je mag deze beelden overal gebruiken\./.test(lever) && /You may use these images anywhere\./.test(lever) && !/De beelden zijn van jou\./.test(lever) && !/The images are yours\./.test(lever));

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
