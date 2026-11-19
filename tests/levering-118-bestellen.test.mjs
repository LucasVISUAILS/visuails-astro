/*
 * LEVERING 118 · BESTELLEN AAN DE ACHTERKANT (bouwer BA)
 * 17 november 2026
 *
 *   node tests/levering-118-bestellen.test.mjs        (geen build nodig)
 *
 * Echte SQLite (schema.sql), nep-Mollie, nep-Resend, nep-R2 en de echte /api/order.
 *   P4-08  te vaak verstuurd zonder script: terug naar het formulier met ?error=rate, geen witte pagina;
 *   P10-03 dezelfde uploadbatch in een tweede tabblad: geen tweede bestelling, maar die eerste;
 *   W2-08  de studiomail zegt "nog niet betaald" of "NAKIJKEN", met de look en de extra hoeken;
 *   W2-10  geen btw-nummer ingevuld: een eigen zin, niet "je btw-nummer konden we niet bevestigen";
 *   W2-15  de bewaarde mail na een mislukte betaling heet "Nog niet betaald — …";
 *   B1-01  één proef per bedrijf: btw-nummer hard, bedrijfsnaam + postcode op de nakijklijst;
 *   P3-08  extra hoeken wegen mee in de agenda (rowPunten en de poort).
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { rowPunten, clearedWindows, extraBeeldPunten, extraHoekenVan, ATTENDED_PUNTEN_PER_VENSTER } from '../src/data/capacity.js';
import { KIND_PUNTEN, CATALOG_IMAGES } from '../src/data/pricing.js';
import { TELBARE_ANGLE_IDS } from '../src/data/angles.js';
import { proefGebruikt, merkKey, btwKey } from '../src/lib/proefGebruikt.js';
import { uitgesteldSleutel } from '../src/lib/uitgesteld.js';
import { batchPrefix } from '../src/lib/uploads.js';
import { vandaagNL } from '../src/lib/nlDag.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 118 (BA): bestellen aan de achterkant\n');

const betalingen = new Map();
const mails = [];
let volg = 0;
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') {
    const p = JSON.parse(String(opts.body));
    const id = `tr_${String(++volg).padStart(10, '0')}`;
    const rec = { id, mode: 'test', status: 'open', amount: p.amount, metadata: p.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
    betalingen.set(id, rec);
    return json(rec, 201);
  }
  if (u.includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  /* VIES en de rest: geen antwoord dat iets bevestigt. */
  return json({ id: 'msg_test' });
};
const stil = () => { const l = console.log, e = console.error, w = console.warn; console.log = console.error = console.warn = () => {}; return () => { console.log = l; console.error = e; console.warn = w; }; };

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));

/* Nep-R2 met list(): de foto's van een batch, zoals /api/upload ze zet. */
const emmer = new Map();
const meta = new Map();
const env = {
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test',
  FROM_EMAIL: 'VISUAILS <orders@voorbeeld.test>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db),
  UPLOADS: {
    async put(k, b, o = {}) { emmer.set(k, b); if (o.customMetadata) meta.set(k, o.customMetadata); },
    async get(k) { return emmer.has(k) ? { body: emmer.get(k), text: async () => String(emmer.get(k)) } : null; },
    async delete(k) { emmer.delete(k); },
    async head() { return null; },
    async list({ prefix = '' } = {}) {
      return { objects: [...emmer.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: 1000, customMetadata: meta.get(k) || {} })), truncated: false };
    },
  },
};
const { onRequestPost } = await import('../functions/api/order.js');

let ip = 1;
function formulier(velden) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  return fd;
}
const basis = (email, extra = {}) => ({
  service: 'catalog', products: '2', first_name: 'Testa', last_name: 'Proef', brand: 'PROEFMERK', email, phone: '+31 6 12345678',
  country: 'NL', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl',
  style: 'classic', background: 'studio-white', business_declaration: 'yes', business_version: 'v1', no_vat_number: '1',
  reg_number: '12345678', product_p1: 'Product 1', product_p2: 'Product 2', mode: 'json', ...extra,
});
async function post(velden, { headers = {}, eigenIp = null } = {}) {
  const terug = stil();
  try {
    return await onRequestPost({
      request: new Request('https://visuails.com/api/order', { method: 'POST', body: formulier(velden), headers: { 'cf-connecting-ip': eigenIp || `10.118.0.${ip++}`, ...headers } }),
      env, waitUntil: () => {},
    });
  } finally { terug(); }
}
const laatsteOrder = (email) => db.prepare('SELECT * FROM orders WHERE email = ? ORDER BY id DESC').all(email);
const studioMail = (ref) => mails.filter((m) => String(m.to) === 'studio@voorbeeld.test' && String(m.subject || '').includes(ref)).pop();

console.log('P4-08 · te vaak verstuurd zonder script');
{
  let laatste = null;
  for (let i = 0; i < 11; i++) {
    /* Geen geldig e-mailadres: elke poging stopt vroeg, maar telt wel mee voor de grens. */
    laatste = await post({ service: 'catalog', email: 'geen-adres', lang: 'nl' }, { eigenIp: '10.118.9.9', headers: { Referer: 'https://visuails.com/nl/start/catalog/?style=classic' } });
  }
  const plek = laatste.headers.get('location') || '';
  ok('de elfde poging is een 303 en geen lege 429', laatste.status === 303, String(laatste.status));
  ok('terug naar het formulier, met ?error=rate', plek.startsWith('/nl/start/catalog/?style=classic') && /[?&]error=rate$/.test(plek), plek);
  ok('retry-after blijft staan', Number(laatste.headers.get('retry-after')) > 0, String(laatste.headers.get('retry-after')));
  const zonderRef = await post({ service: 'catalog', email: 'geen-adres', lang: 'nl' }, { eigenIp: '10.118.9.9' });
  ok('zonder Referer: de startpagina in de taal van het formulier', (zonderRef.headers.get('location') || '') === '/nl/start/?error=rate', zonderRef.headers.get('location'));
  const vreemd = await post({ service: 'catalog', email: 'geen-adres', lang: 'en' }, { eigenIp: '10.118.9.9', headers: { Referer: 'https://elders.test/x' } });
  ok('een Referer van een andere site telt niet', (vreemd.headers.get('location') || '') === '/start/?error=rate', vreemd.headers.get('location'));
  const met = await post({ service: 'catalog', email: 'geen-adres', lang: 'nl', mode: 'json' }, { eigenIp: '10.118.9.9' });
  ok('met mode=json blijft het de 429 met { error: "rate" }', met.status === 429 && (await met.json()).error === 'rate');
}

console.log('\nP10-03 · dezelfde foto\'s in twee tabbladen');
{
  const batch = 'A'.repeat(43);
  const prefix = batchPrefix(batch);
  await env.UPLOADS.put(`${prefix}001-aaaa-voor.jpg`, 'x', { customMetadata: { product: 'p1', shot: 'front' } });
  await env.UPLOADS.put(`${prefix}002-bbbb-achter.jpg`, 'x', { customMetadata: { product: 'p2', shot: 'front' } });
  const r1 = await post(basis('tabblad@voorbeeldmerk.test', { upload_batch: batch }));
  const b1 = await r1.json();
  ok('tabblad A: een bestelling', r1.status === 200 && b1.ok && !!b1.ref, JSON.stringify(b1).slice(0, 200));
  const f1 = db.prepare('SELECT COUNT(*) AS n FROM files f JOIN orders o ON o.id = f.order_id WHERE o.ref = ?').get(b1.ref).n;
  ok('  met de twee foto\'s eraan', f1 === 2, String(f1));
  const r2 = await post(basis('tabblad@voorbeeldmerk.test', { upload_batch: batch, verstuursleutel: 'tabbladB-0123456789abcdef' }));
  const b2 = await r2.json();
  const rijen = laatsteOrder('tabblad@voorbeeldmerk.test');
  ok('tabblad B: geen tweede bestelling', rijen.length === 1, String(rijen.length));
  ok('  maar het antwoord van de eerste (zelfde kenmerk)', b2.ok && b2.ref === b1.ref, JSON.stringify(b2));
  ok('  en "deze bestelling betalen" via /api/order-pay', String(b2.redirect || '').startsWith(`/api/order-pay?ref=${encodeURIComponent(b1.ref)}`), b2.redirect);
  db.prepare("UPDATE orders SET payment_status = 'paid' WHERE ref = ?").run(b1.ref);
  const r3 = await post(basis('tabblad@voorbeeldmerk.test', { upload_batch: batch }));
  const b3 = await r3.json();
  ok('al betaald: de bedankpagina met paid=, geen tweede betaling', String(b3.redirect || '').includes(`paid=${encodeURIComponent(b1.ref)}`) && laatsteOrder('tabblad@voorbeeldmerk.test').length === 1, b3.redirect);
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE ref = ?").run(b1.ref);
  const r4 = await post(basis('tabblad@voorbeeldmerk.test', { upload_batch: batch }));
  const b4 = await r4.json();
  ok('is de eerste geannuleerd, dan mag er een nieuwe', b4.ok && b4.ref && b4.ref !== b1.ref, JSON.stringify(b4).slice(0, 160));
  const zonder = await post(basis('zonderfotos@voorbeeldmerk.test'));
  ok('een bestelling zonder batch merkt hier niets van', (await zonder.json()).ok === true);
}

console.log('\nW2-08 · de studiomail zegt betaald of nakijken');
{
  /* Zoals het formulier ze stuurt: angle_<id> voor de prijs en extra_slots voor de namen (pipeline.js). */
  const r = await post(basis('studiomail@voorbeeldmerk.test', { 'angle_three-quarter': '1', angle_inside: '1', extra_slots: 'extra1:three-quarter,extra2:inside' }));
  const b = await r.json();
  const m = studioMail(b.ref);
  ok('er is een studiomail', !!m, mails.map((x) => x.subject).join(' | ').slice(0, 300));
  ok('onderwerp: "nog niet betaald"', /nog niet betaald/.test(m?.subject || ''), m?.subject);
  ok('bovenaan het vlak "Nog niet betaald"', /<strong>Nog niet betaald<\/strong>/.test(m?.html || ''));
  ok('de extra hoeken in de samenvatting', /<td[^>]*>Extra hoeken<\/td>/.test(m?.html || ''));
  ok('geen "NAKIJKEN" bij een gewone bestelling', !/NAKIJKEN/.test(m?.subject || '') && !/NAKIJKEN/.test(m?.html || ''));
  const l = await post(basis('look@voorbeeldmerk.test', { service: 'lifestyle', style: 'dunes' }));
  const bl = await l.json();
  const ml = studioMail(bl.ref);
  ok('de look in de samenvatting (lifestyle, Dunes)', /<td[^>]*>Look<\/td>/.test(ml?.html || '') && /Dunes/.test(ml?.html || ''), ml?.subject);

  const n = await post(basis('nakijken@voorbeeldmerk.test', { country: 'XX', reg_number: '', no_vat_number: '1' }));
  const bn = await n.json();
  const mn = studioMail(bn.ref);
  ok('"Ergens anders": onderwerp begint met NAKIJKEN', /^NAKIJKEN · /.test(mn?.subject || ''), mn?.subject);
  ok('  met het vlak "klant wacht op betaallink" en de reden', /NAKIJKEN · klant wacht op betaallink/.test(mn?.html || '') && /Ergens anders/.test(mn?.html || ''));
  ok('  en niet "nog niet betaald"', !/nog niet betaald/.test(mn?.subject || ''));
}

console.log('\nW2-10 · geen btw-nummer is iets anders dan een nummer dat VIES niet bevestigt');
{
  const r = await post(basis('belgie@voorbeeldmerk.test', { country: 'BE', postal_code: '1000', city: 'Teststad', reg_number: '', no_vat_number: '1', vat: '' }));
  const b = await r.json();
  const klant = mails.filter((m) => String(m.to) === 'belgie@voorbeeldmerk.test').pop();
  const rij = db.prepare('SELECT vat_treatment, review_state FROM orders WHERE ref = ?').get(b.ref);
  ok('de Belgische bestelling zonder nummer staat op nakijken', rij?.review_state === 'pending', JSON.stringify(rij));
  ok('klantmail: "Je vulde geen btw-nummer in"', /Je vulde geen btw-nummer in/.test(klant?.html || ''), (klant?.subject || 'geen mail'));
  ok('klantmail: niet "konden we … niet bevestigen"', !/niet bevestigen/.test(klant?.html || ''));
  const s = studioMail(b.ref);
  ok('studiomail: "die geen btw-nummer invulde"', /die geen btw-nummer invulde/.test(s?.html || ''));
  const bron = readFileSync(`${ROOT}functions/api/order.js`, 'utf8');
  ok('de oude zin staat er nog voor wie wél een nummer invulde', /!\(vat && vat\.zonderNummer\) && !payBlock[^\n]*vat\.reason === 'eu-unconfirmed'\)/.test(bron)
    && /Je btw-nummer konden we bij de Europese controle \(VIES\) niet bevestigen\./.test(bron));
}

console.log('\nW2-15 · de mail na een mislukte betaling');
{
  const r = await post(basis('herstel@voorbeeldmerk.test'));
  const b = await r.json();
  const bewaard = emmer.get(uitgesteldSleutel(b.ref));
  let mail = null;
  try { mail = JSON.parse(String(bewaard)); } catch { mail = null; }
  ok('de bevestiging wacht in R2 op de uitkomst', !!mail, String(bewaard).slice(0, 80));
  ok('onderwerp: "Nog niet betaald — je bestelling VIS-… staat klaar"', mail?.subject === `Nog niet betaald — je bestelling ${b.ref} staat klaar`, mail?.subject);
  ok('voorvertoning: "Er is niets afgeschreven"', /Er is niets afgeschreven/.test(mail?.html || ''));
  const en = await post(basis('herstel-en@voorbeeldmerk.test', { lang: 'en' }));
  const be = await en.json();
  let mailEn = null;
  try { mailEn = JSON.parse(String(emmer.get(uitgesteldSleutel(be.ref)))); } catch { mailEn = null; }
  ok('en in het Engels', mailEn?.subject === `Not paid yet — your order ${be.ref} is waiting` && /Nothing has been charged/.test(mailEn?.html || ''), mailEn?.subject);
}

console.log('\nB1-01 · één proef per bedrijf');
{
  db.prepare(`INSERT INTO orders (ref, service, status, email, phone, brand, postal_code, vat_number, details_json, payment_status)
              VALUES ('VIS-PROEF-EERST', 'test-sample', 'received', 'eerste@voorbeeldmerk.test', '+31 6 11111111', 'Proefmerk B.V.', '1234 AB', 'NL123456789B01', '{}', 'paid')`).run();
  ok('merkKey haalt de rechtsvorm eraf', merkKey('Proefmerk B.V.') === merkKey('proefmerk bv') && merkKey('PROEFMERK') === 'proefmerk');
  ok('btwKey met en zonder landcode is hetzelfde', btwKey('NL123456789B01') === btwKey('123456789B01'));
  const hard = await proefGebruikt(env, { email: 'ander@voorbeeldmerk.test', phone: '+31 6 22222222', reg: '87654321', vat: '123456789B01' });
  ok('zelfde btw-nummer: hard (used)', hard.checked && hard.used === 1, JSON.stringify(hard));
  const twijfel = await proefGebruikt(env, { email: 'ander@voorbeeldmerk.test', phone: '+31 6 22222222', reg: '87654321', brand: 'proefmerk', postcode: '1234ab' });
  ok('zelfde naam en postcode: een twijfelgeval, niet hard', twijfel.used === 0 && twijfel.twijfel === 1 && twijfel.twijfelRef === 'VIS-PROEF-EERST', JSON.stringify(twijfel));
  const anders = await proefGebruikt(env, { email: 'ander@voorbeeldmerk.test', phone: '+31 6 22222222', reg: '87654321', brand: 'proefmerk', postcode: '9999 ZZ' });
  ok('zelfde naam, andere postcode: niets', anders.used === 0 && anders.twijfel === 0, JSON.stringify(anders));
  const behalve = await proefGebruikt(env, { email: 'eerste@voorbeeldmerk.test', behalve: db.prepare("SELECT id FROM orders WHERE ref = 'VIS-PROEF-EERST'").get().id });
  ok('`behalve` slaat de eigen bestelling over', behalve.used === 0, JSON.stringify(behalve));

  const proef = (email, extra) => basis(email, { service: 'test-sample', products: '1', sample_type: 'catalog', product_p2: undefined, ...extra });
  const velden = proef('tweede@voorbeeldmerk.test', { phone: '+31 6 33333333', reg_number: '11223344', brand: 'Proefmerk', postal_code: '1234AB' });
  delete velden.product_p2;
  const r = await post(velden);
  const b = await r.json();
  const rij = db.prepare('SELECT id, details_json FROM orders WHERE ref = ?').get(b.ref || '');
  let det = {};
  try { det = JSON.parse(rij?.details_json || '{}'); } catch { det = {}; }
  ok('twijfelgeval: de proef wordt aangenomen', b.ok === true && !!rij, JSON.stringify(b).slice(0, 160));
  ok('  met de markering in details (proef_twijfel)', /VIS-PROEF-EERST/.test(det.proef_twijfel || ''), det.proef_twijfel);
  ok('  en een regel in admin_log (proef.twijfel)', !!db.prepare("SELECT 1 FROM admin_log WHERE action = 'proef.twijfel' AND order_id = ?").get(rij?.id));
  const s = studioMail(b.ref);
  ok('  de studiomail: NAKIJKEN in het onderwerp en het vlak', /^NAKIJKEN · /.test(s?.subject || '') && /mogelijk een tweede proef/.test(s?.html || ''), s?.subject);
  const v2 = proef('derde@voorbeeldmerk.test', { phone: '+31 6 44444444', reg_number: '55667788', brand: 'Iets Anders', vat: 'NL123456789B01', no_vat_number: '' });
  delete v2.product_p2;
  const r2 = await post(v2);
  const b2 = await r2.json();
  ok('zelfde btw-nummer: geweigerd zoals bij hetzelfde e-mailadres', r2.status === 409 && b2.error === 'sample-used', `${r2.status} ${JSON.stringify(b2)}`);
}

console.log('\nP3-08 · extra hoeken in de agenda');
{
  const vier = TELBARE_ANGLE_IDS.slice(0, 4);
  const det = Object.fromEntries(vier.map((id) => [`angle_${id}`, '1']));
  ok('een extra hoek weegt één punt (KIND_PUNTEN.catalog / CATALOG_IMAGES)', extraBeeldPunten('catalog', 1) === KIND_PUNTEN.catalog / CATALOG_IMAGES);
  ok('extraHoekenVan telt zoals de prijs (angle_<id>)', extraHoekenVan(det) === 4);
  ok('20 producten zonder hoeken: 80 punten', rowPunten({ service: 'catalog', product_count: 20, details_json: '{}' }) === 80);
  ok('20 producten met 4 extra hoeken: 160 punten (160 beelden)', rowPunten({ service: 'catalog', product_count: 20, details_json: JSON.stringify(det) }) === 160,
    String(rowPunten({ service: 'catalog', product_count: 20, details_json: JSON.stringify(det) })));
  ok('lifestyle telt geen hoeken (vast vier beelden)', rowPunten({ service: 'lifestyle', product_count: 5, details_json: JSON.stringify({ ...det, lifestyle_beelden: '4' }) }) === 20);
  const vandaag = vandaagNL();
  const zonder = clearedWindows({ today: vandaag, products: 25, service: 'catalog', limit: 1 });
  const met = clearedWindows({ today: vandaag, products: 25, service: 'catalog', limit: 1, extras: 100 });
  ok('25 producten passen zonder hoeken in een venster', zonder.reason === 'ok' && zonder.windows.length === 1, zonder.reason);
  ok(`met 4 hoeken (200 punten > ${ATTENDED_PUNTEN_PER_VENSTER}) niet meer: too-large`, met.reason === 'too-large', met.reason);
  ok('  en het maximum in producten daalt mee', met.max < zonder.max, `${met.max} < ${zonder.max}`);
  /* De poort in /api/order: een dag die met hoeken te vol raakt, wordt niet aangeboden. */
  const twaalf = clearedWindows({ today: vandaag, products: 12, service: 'catalog', limit: 1 }).windows[0];
  db.prepare(`INSERT INTO orders (ref, service, status, email, tier, window_start, window_end, product_count, payment_status, details_json)
              VALUES ('VIS-HOEK-VOL', 'catalog', 'received', 'vol@voorbeeldmerk.test', 'attended', ?, ?, 20, 'paid', ?)`)
    .run(twaalf.start, twaalf.end, JSON.stringify(det));
  const velden = basis('hoeken@voorbeeldmerk.test', { products: '12', window_start: twaalf.start, window_end: twaalf.end, ...Object.fromEntries(vier.map((id) => [`angle_${id}`, '1'])) });
  for (let i = 1; i <= 12; i++) velden[`product_p${i}`] = `Product ${i}`;
  const r = await post(velden);
  const b = await r.clone().json().catch(() => ({}));
  ok('de poort ziet de hoeken van de geboekte bestelling: die dagen zijn vol', r.status === 409 && b.error === 'window-gone', `${r.status} ${JSON.stringify(b).slice(0, 120)}`);
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
