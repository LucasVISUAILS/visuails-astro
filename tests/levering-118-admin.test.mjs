/*
 * LEVERING 118 · /admin — W1-01 W1-04 W1-06 W1-09 P8-02 N3-03
 * 17 november 2026
 *
 *   node tests/levering-118-admin.test.mjs        (geen build nodig)
 *
 * Echte SQLite (schema.sql), nep-Mollie en nep-Resend, de echte adminGet/adminPost.
 *   W1-01  een onbetaalde voorrang heet "aangevraagd" (met de toeslag), een onbetaalde reservering "gereserveerd tot …"
 *          op de bestelpagina, het dashboard en de planning; betaald blijft "toeslag betaald" en "vastgelegd".
 *   W1-04  /admin/vat toont het registratienummer met het register van het land en een link.
 *   N3-03  /admin/vat: bij een afgekeurd btw-nummer een eigen zin over de drie knoppen; de algemene zin alleen zonder nummer.
 *   W1-06  het logboek: referentie, klant en bedrag bij een nieuwe bestelling, in het Nederlands; aanvraag, btw-controle
 *          en contactbericht als eigen regels.
 *   W1-09  "Wat de klant koos": zijn bericht bovenaan, de contactvoorkeur met een belknop, en foto's later in Studio.
 *   P8-02  voorrang gemist: één knop met het bedrag incl. btw, bevestigen met een vinkje, Mollie-terugstorting, mail,
 *          één keer (de claim), en bij een fout weer zichtbaar.
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 118: /admin (W1-01 W1-04 W1-06 W1-09 P8-02 N3-03)\n');

const mails = [];
const refunds = [];
let mollieFout = false;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (/\/v2\/payments\/tr_[A-Za-z0-9]+\/refunds$/.test(u)) {
    if (mollieFout) return json({ status: 422, title: 'Unprocessable Entity', detail: 'nep-fout' }, 422);
    refunds.push({ url: u, body: JSON.parse(String(opts.body)) });
    return json({ id: 're_test', status: 'pending' }, 201);
  }
  if (u.includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return json({ id: 'msg_test' });
};
const stil = () => { const e = console.error, w = console.warn; console.error = console.warn = () => {}; return () => { console.error = e; console.warn = w; }; };

const { adminGet, adminPost, logBinnenRegel, logNoteNl } = await import('../src/lib/admin.js');
const { nuDoen, knopVoor } = await import('../src/lib/nudoen.js');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));

const opbouw = (voorrang) => [{ soort: 'producten', qty: 2, unitCents: 26000, totalCents: 52000 }, { soort: 'voorrang', qty: 1, unitCents: voorrang, totalCents: voorrang }];
db.exec(`
  INSERT INTO customers (id, email, name, brand, country, phone, contact_preference, reg_number)
    VALUES (1, 'kees@proefmerk.test', 'Kees Test', 'PROEFMERK', 'NL', '0612345678', 'whatsapp', NULL),
           (2, 'inkoop@testbe.test', 'Testa Proef', 'TESTBE', 'BE', NULL, 'email', NULL),
           (3, 'nl@testnl.test', 'Nora Test', 'TESTNL', 'NL', NULL, 'email', '12345678');
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const order = (velden) => {
  const k = Object.keys(velden);
  db.prepare(`INSERT INTO orders (${k.join(', ')}) VALUES (${k.map(() => '?').join(', ')})`).run(...k.map((x) => velden[x]));
};
const basis = { status: 'received', lang: 'nl', service: 'catalog', product_count: 2, tier: 'unattended' };
/* W1-01: onbetaalde voorrang (toeslag € 104), betaalde voorrang, onbetaalde reservering. */
order({ ...basis, id: 101, ref: 'VIS-TEST-101', customer_id: 1, email: 'kees@proefmerk.test', name: 'Kees Test', brand: 'PROEFMERK',
  total_cents: 62400, vat_cents: 13104, vat_rate: 0.21, payment_status: 'unpaid',
  details_json: JSON.stringify({ voorrang: '1', opbouw: opbouw(10400), message: 'Kunnen jullie mij bellen?' }) });
order({ ...basis, id: 102, ref: 'VIS-TEST-102', customer_id: 1, email: 'kees@proefmerk.test', name: 'Kees Test', brand: 'PROEFMERK',
  total_cents: 62400, vat_cents: 13104, vat_rate: 0.21, payment_status: 'paid', paid_at: '2026-11-16 09:00:00',
  details_json: JSON.stringify({ voorrang: '1', opbouw: opbouw(10400) }) });
order({ ...basis, id: 103, ref: 'VIS-TEST-103', customer_id: 1, email: 'kees@proefmerk.test', name: 'Kees Test', brand: 'PROEFMERK',
  product_count: 12, tier: 'attended', window_start: '2026-12-01', window_end: '2026-12-02', window_expires_at: '2026-11-24 10:00:00',
  total_cents: 120000, vat_cents: 25200, vat_rate: 0.21, payment_status: 'unpaid', testmodus: 1, details_json: '{}' });
/* P8-02: betaald vrijdag 13 november 15:30 (na 15:00) → beloofd dinsdag 17 november 17:00; geleverd woensdag. */
order({ ...basis, id: 104, ref: 'VIS-TEST-104', customer_id: 1, email: 'kees@proefmerk.test', name: 'Kees Test', brand: 'PROEFMERK',
  status: 'delivered', total_cents: 57000, vat_cents: 11970, vat_rate: 0.21, payment_status: 'paid', payment_ref: 'tr_TESTtoeslag104',
  paid_at: '2026-11-13 14:30:00', delivered_at: '2026-11-18 09:00:00', delivery_mailed_at: '2026-11-18 09:00:00',
  details_json: JSON.stringify({ voorrang: '1', opbouw: [{ soort: 'producten', qty: 2, unitCents: 26000, totalCents: 52000 }, { soort: 'voorrang', qty: 1, unitCents: 5000, totalCents: 5000 }] }) });
/* W1-04 / N3-03: BE met afgekeurd btw-nummer en registratienummer; NL zonder btw-nummer met KVK op de klant. */
order({ ...basis, id: 105, ref: 'VIS-TEST-105', customer_id: 2, email: 'inkoop@testbe.test', name: 'Testa Proef', brand: 'TESTBE',
  total_cents: 30000, vat_cents: 6300, vat_rate: 0.21, vat_treatment: 'nl_standard', country: 'BE', vat_number: 'BE0123456789',
  payment_status: 'unpaid', review_state: 'pending', review_reason: 'VIES keurde het nummer af',
  details_json: JSON.stringify({ business_declaration: 'v1', business_reg: '0123.456.789' }) });
order({ ...basis, id: 106, ref: 'VIS-TEST-106', customer_id: 3, email: 'nl@testnl.test', name: 'Nora Test', brand: 'TESTNL',
  total_cents: 30000, vat_cents: 6300, vat_rate: 0.21, vat_treatment: 'nl_standard', country: 'NL',
  payment_status: 'unpaid', review_state: 'pending', review_reason: 'geen btw-nummer', review_requested_at: '2026-11-17 08:00:00',
  details_json: JSON.stringify({ business_declaration: 'v1' }) });
/* W1-06: een aanvraag zonder prijs. */
order({ ...basis, id: 107, ref: 'VIS-TEST-107', customer_id: 3, email: 'nl@testnl.test', name: 'Nora Test', brand: 'TESTNL',
  service: 'video', product_count: 0, total_cents: 0, vat_cents: 0, payment_status: 'unpaid', details_json: '{}' });
db.exec(`
  INSERT INTO admin_log (action, order_id, customer_id, detail, created_at) VALUES
    ('order.created', 101, 1, 'Order submitted via website (unattended) · 6 files uploaded', '2026-11-17 09:00:00'),
    ('order.created', 106, 3, 'Order submitted via website (unattended)', '2026-11-17 09:05:00'),
    ('order.created', 107, 3, 'Order submitted via website (unattended)', '2026-11-17 09:06:00');
  INSERT INTO messages (customer_id, email, name, subject, body, created_at)
    VALUES (NULL, 'vraag@voorbeeld.test', 'Vera Vraag', 'Vraag over een bestelling', 'Hallo', '2026-11-17 09:03:00');
`);

const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
const env = {
  DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
  UPLOADS: { async put() {}, async get() { return null; }, async head() { return null; }, async delete() {}, async list() { return { objects: [] }; } },
};
const headers = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };
const get = async (pad) => {
  const herstel = stil();
  try {
    const r = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers }), env, waitUntil() {} });
    return await r.text();
  } finally { herstel(); }
};
const post = async (pad, velden) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.set(k, v);
  const herstel = stil();
  try {
    return await adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', body: fd, headers }), env, waitUntil() {} });
  } finally { herstel(); }
};
const zonderTags = (h) => h.replace(/<[^>]+>/g, '').replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/\s+/g, ' ');

console.log('W1-01 · onbetaald lijkt niet betaald of vast');
{
  const h = zonderTags(await get('/admin/orders/101/files'));
  ok('onbetaalde voorrang: "Voorrang aangevraagd — toeslag € 104,00 excl. btw · onbetaald"', /Voorrang aangevraagd — toeslag € 104,00 excl\. btw · onbetaald/.test(h));
  ok('  nergens "toeslag betaald" of "de klant betaalde de toeslag"', !/toeslag betaald|de klant betaalde de toeslag/.test(h));
  const b = zonderTags(await get('/admin/orders/102/files'));
  ok('betaalde voorrang: "Voorrang — toeslag betaald"', /Voorrang — toeslag betaald/.test(b));
  const r = zonderTags(await get('/admin/orders/103/files'));
  ok('onbetaalde reservering: "Gereserveerd op 2026-12-01 of 2026-12-02 · onbetaald"', /Gereserveerd op 2026-12-01 of 2026-12-02 · onbetaald/.test(r));
  ok('  met de vervaldatum ("komen de dagen vrij op 24 november 2026")', /komen de dagen vrij op 24 november 2026/.test(r));
  ok('  en niet "Vastgelegd op"', !/Vastgelegd op/.test(r));
  const dash = zonderTags(await get('/admin?status=all'));
  ok('dashboard: "gereserveerd tot 24 nov · onbetaald" bij de reservering', /gereserveerd tot 24 nov · onbetaald/.test(dash), dash.slice(dash.indexOf('VIS-TEST-103'), dash.indexOf('VIS-TEST-103') + 300));
  ok('dashboard: "voorrang aangevraagd" bij de onbetaalde voorrang', /voorrang aangevraagd/.test(dash));
  const plan = await get('/admin/planning?van=2026-11-30');
  const chip = plan.slice(plan.indexOf('TEST-103'), plan.indexOf('TEST-103') + 900);
  ok('planning: de chip zegt "onbetaald" tot 24 nov', /or-let is-stil">onbetaald<\/span> tot 24 nov/.test(chip), chip.slice(0, 400));
  ok('  en "test"', /or-let is-proef">test</.test(chip));
  ok('  met de klasse is-voorlopig', /is-voorlopig/.test(plan));
}

console.log('\nW1-04 · N3-03 · /admin/vat');
{
  const html = await get('/admin/vat');
  const kaart = (ref) => { const i = html.indexOf(ref); const j = html.indexOf('<div class="card">', i + 10); return i < 0 ? '' : html.slice(i, j > 0 ? j : i + 8000); };
  const be = kaart('VIS-TEST-105');
  const nl = kaart('VIS-TEST-106');
  ok('BE: registratienummer met "(BE: KBO)"', /0123\.456\.789<\/strong> <span class="meta">\(BE: KBO\)/.test(be));
  ok('  met een link naar de KBO', /kbopub\.economie\.fgov\.be[^"]*nummer=0123456789/.test(be));
  ok('  en het btw-nummer op de kaart', /Btw-nummer<\/th><td><strong>BE0123456789/.test(be));
  ok('NL: het KVK-nummer van de klant, met "(NL: KVK)" en een link', /12345678<\/strong> <span class="meta">\(NL: KVK\)/.test(nl) && /kvk\.nl\/zoeken\/\?source=all&amp;q=12345678/.test(nl));
  ok('N3-03: bij het afgekeurde nummer een eigen zin over de drie knoppen', /VIES bevestigde btw-nummer BE0123456789 niet/.test(be) && /"Btw verleggen" zet de btw op 0%/.test(be) && /"Afwijzen" stuurt de klant een mail/.test(be));
  ok('  en daar niet de algemene zin', !/De vraag is alleen of de klant een bedrijf is/.test(be));
  ok('zonder btw-nummer de algemene zin, met "registratienummer hierboven"', /De vraag is alleen of de klant een bedrijf is: controleer het registratienummer hierboven/.test(nl));
  ok('"controleer het KVK-nummer" staat nergens meer zonder nummer erbij', !/controleer het KVK-nummer/.test(html));
}

console.log('\nW1-06 · het logboek');
{
  ok('logNoteNl vertaalt de regel van /api/order', logNoteNl('Order submitted via website (attended) · window 2026-12-01→2026-12-02 · 1 file uploaded') === 'via de site (met leverdatum) · dagen 2026-12-01 → 2026-12-02 · 1 bestand geüpload');
  const h = zonderTags(await get('/admin/log'));
  ok('een bestelling: referentie, klant, wat en bedrag incl. btw, in het Nederlands', /Bestelling binnen order\.created VIS-TEST-101 · PROEFMERK · 2 × Catalog[^·]*· € 755,04 incl\. btw · via de site \(wachtrij\) · 6 bestanden geüpload/.test(h), h.slice(h.indexOf('VIS-TEST-101') - 60, h.indexOf('VIS-TEST-101') + 160));
  ok('een bestelling op de btw-lijst: "Bestelling binnen, naar btw-controle"', /Bestelling binnen, naar btw-controle order\.created VIS-TEST-106/.test(h));
  ok('een aanvraag: "Aanvraag binnen … nog geen prijs"', /Aanvraag binnen order\.created VIS-TEST-107 · TESTNL · [^·]+· nog geen prijs/.test(h));
  ok('een contactbericht als eigen regel', /Contactbericht contact Vraag over een bestelling · Vera Vraag · vraag@voorbeeld\.test/.test(h));
  ok('  op zijn plek in de tijd (tussen 09:00 en 09:05)', h.indexOf('VIS-TEST-106') < h.indexOf('Vera Vraag') && h.indexOf('Vera Vraag') < h.indexOf('VIS-TEST-101'));
  ok('logBinnenRegel zonder bestelling valt terug op de logregel', logBinnenRegel({ detail: 'Order submitted via website (unattended)' }).detail === 'via de site (wachtrij)');
}

console.log('\nW1-09 · wat de klant koos');
{
  const html = await get('/admin/orders/101/files');
  const blok = html.slice(html.indexOf('Wat de klant koos'), html.indexOf('</dl>', html.indexOf('Wat de klant koos')));
  ok('het bericht van de klant staat bovenaan', blok.indexOf('Bericht van de klant') > 0 && blok.indexOf('Bericht van de klant') < blok.indexOf('Contact') && blok.indexOf('Contact') < (blok.indexOf('Stijl') > 0 ? blok.indexOf('Stijl') : Infinity));
  ok('  "Kunnen jullie mij bellen?"', /Kunnen jullie mij bellen\?/.test(blok));
  ok('contact: "Telefoon of WhatsApp" met het nummer', /<dt>Contact<\/dt><dd><strong>Telefoon of WhatsApp<\/strong> — 0612345678/.test(blok), blok.slice(blok.indexOf('Contact'), blok.indexOf('Contact') + 300));
  ok('  en een belknop (tel:+31…)', /href="tel:\+31612345678"[^>]*>Bel de klant/.test(blok));
  ok('foto\'s: niets aangeleverd → "Later in Studio — nog geen foto’s aangeleverd"', /<dt>Foto’s<\/dt><dd>Later in Studio <span class="meta">— nog geen foto’s aangeleverd/.test(blok), blok.slice(blok.indexOf('Foto'), blok.indexOf('Foto') + 200));
  const nl = await get('/admin/orders/107/files');
  ok('een klant met e-mail als voorkeur: "E-mail", zonder belknop', /<dt>Contact<\/dt><dd>E-mail<\/dd>/.test(nl));
}

console.log('\nP8-02 · voorrang gemist: de toeslag met één knop terug');
{
  const nu = Date.parse('2026-11-18T10:00:00Z');
  const lijst = await nuDoen(env.DB, { nu });
  const regel = lijst.regels.find((r) => r.soort === 'toeslag' && r.ref === 'VIS-TEST-104');
  ok('Nu doen: de regel staat er', !!regel);
  ok('  met € 50,00 excl. en € 60,50 incl. btw', regel && regel.n === 5000 && regel.n2 === 6050, JSON.stringify(regel && { n: regel.n, n2: regel.n2 }));
  ok('  de knop: "Toeslag terugstorten (€ 60,50 incl. btw)" naar het open blok', regel && knopVoor(regel, 'dashboard').label === 'Toeslag terugstorten (€ 60,50 incl. btw)' && /\/admin\/orders\/104\/files\?toeslag=open#toeslag$/.test(knopVoor(regel, 'dashboard').href));
  const pagina = await get('/admin/orders/104/files?toeslag=open');
  ok('de bestelpagina: het blok, open, met het bedrag', /<details class="ingeklapt toeslag-terug" open>/.test(pagina) && /Toeslag terugstorten \(€ 60,50 incl\. btw\)/.test(pagina));
  ok('  met een verplicht vinkje (geen confirm())', /name="ja" value="1" required> Ja, € 60,50 terugstorten/.test(pagina) && !/confirm\(/.test(pagina));

  let r = await post('/admin/orders/104/toeslag-terug', {});
  ok('zonder vinkje: niets gestort, terug naar het open blok', refunds.length === 0 && /toeslag=open/.test(r.headers.get('location') || ''));

  mollieFout = true;
  r = await post('/admin/orders/104/toeslag-terug', { ja: '1' });
  mollieFout = false;
  ok('Mollie weigert: terug met "mislukt"', /toeslag=mislukt/.test(r.headers.get('location') || ''), r.headers.get('location'));
  const naFout = db.prepare("SELECT action FROM admin_log WHERE order_id = 104 ORDER BY id").all().map((x) => x.action);
  ok('  de claim heet nu .mislukt (opnieuw proberen kan)', naFout.includes('order.toeslag-terug.mislukt') && !naFout.includes('order.toeslag-terug'), naFout.join(','));
  ok('  en de regel staat weer in Nu doen', (await nuDoen(env.DB, { nu })).regels.some((x) => x.soort === 'toeslag' && x.ref === 'VIS-TEST-104'));

  const voor = mails.length;
  r = await post('/admin/orders/104/toeslag-terug', { ja: '1' });
  ok('met vinkje: terug met "gestart"', /toeslag=gestart#toeslag$/.test(r.headers.get('location') || ''), r.headers.get('location'));
  ok('  Mollie kreeg één terugstorting van 60.50 op de betaling', refunds.length === 1 && refunds[0].body.amount.value === '60.50' && /tr_TESTtoeslag104\/refunds$/.test(refunds[0].url), JSON.stringify(refunds));
  const mail = mails.slice(voor).find((m) => /voorrangstoeslag komt terug/.test(m.subject || ''));
  ok('  de klant kreeg een eigen mail met het bedrag', !!mail && String(mail.to).includes('kees@proefmerk.test') && /€ 60,50/.test(mail.html || ''), mails.slice(voor).map((m) => m.subject).join(' | '));
  const ev = db.prepare("SELECT note FROM order_events WHERE order_id = 104 ORDER BY id DESC LIMIT 1").get();
  ok('  een regel op de tijdlijn', /De toeslag van € 60,50 komt terug/.test(ev?.note || ''), ev?.note);
  ok('  de claim staat in het logboek', db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE order_id = 104 AND action = 'order.toeslag-terug'").get().n === 1);
  ok('  en de regel is uit Nu doen', !(await nuDoen(env.DB, { nu })).regels.some((x) => x.soort === 'toeslag' && x.ref === 'VIS-TEST-104'));

  r = await post('/admin/orders/104/toeslag-terug', { ja: '1' });
  ok('een tweede klik: "al", geen tweede storting', /toeslag=al/.test(r.headers.get('location') || '') && refunds.length === 1, r.headers.get('location'));
  const na = await get('/admin/orders/104/files?toeslag=gestart');
  ok('de pagina zegt dat het gestart is, en de knop is weg', /Toeslag teruggestort via Mollie en de klant is gemaild/.test(na) && !/toeslag-terug" method|action="\/admin\/orders\/104\/toeslag-terug"/.test(na));

  r = await post('/admin/orders/102/toeslag-terug', { ja: '1' });
  ok('voorrang niet gemist (niet geleverd): "kan-niet", niets gestort', /toeslag=kan-niet/.test(r.headers.get('location') || '') && refunds.length === 1);
  const log = zonderTags(await get('/admin/log'));
  ok('het logboek noemt het in het Nederlands', /Voorrangstoeslag teruggestort order\.toeslag-terug VIS-TEST-104/.test(log));
}

console.log('\nBron');
{
  const admin = readFileSync(`${ROOT}src/lib/admin.js`, 'utf8');
  ok('geen hardgetypt toeslagbedrag in admin.js (alles uit de opbouw en pricing.js)', !/€ ?(50|60),(00|50)/.test(admin));
  ok('de bevestiging is een vinkje in de pagina, geen confirm()', !/confirm\(/.test(admin.slice(admin.indexOf('export function toeslagBlok'), admin.indexOf('async function handleWeerOpenen'))));
}

console.log(`\n${pass} goed, ${fail} fout`);
if (fail) process.exit(1);
