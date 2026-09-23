/* VISUAILS — bestellen via WhatsApp, van begin tot eind.  npm run test:whatsapp
 *
 * 23 september 2026. Lucas: *"een optie voor klanten om bij mij persoonlijk via
 * whatsapp te bestellen en ik in /admin voor het desbetreffende bedrijf
 * handmatig een order in zijn account kan zetten en een mail met betaling kan
 * sturen (…) focus op wat oudere klanten."*
 *
 * tests/ronde2.test.mjs kijkt naar de BRON (staat de route er, is het formulier
 * multipart). Deze toets DRAAIT het: een klant aanmaken zonder account, en
 * daarna een bestelling namens hem met de foto's die hij in de app stuurde —
 * tegen een echte SQLite met schema.sql, een nep-Mollie, een nep-Resend en R2
 * in een Map. Zelfde opzet als tests/eigen-stijl.test.mjs.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { hashToken } from '../src/lib/token.js';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true) {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) { geslaagd++; console.log(`  ok   ${naam}`); }
  else { gezakt++; console.log(`FAIL  ${naam}    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`); }
}

/* ── De omgeving ────────────────────────────────────────────────────────── */
const gezien = [];
let volgnummer = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const body = opts.body ? String(opts.body) : '';
  gezien.push({ url: u, method: opts.method || 'GET', body });
  if (u.endsWith('/v2/payments') && (opts.method || '').toUpperCase() === 'POST') {
    const payload = JSON.parse(body);
    const id = `tr_${String(++volgnummer).padStart(10, '0')}`;
    return new Response(JSON.stringify({ id, status: 'open', amount: payload.amount, metadata: payload.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } }),
      { status: 201, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('/vies') || u.includes('ec.europa.eu')) return new Response('{}', { status: 500 });
  return new Response(JSON.stringify({ id: 'msg_test' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => { try { return JSON.parse(g.body); } catch { return {}; } });

/* R2 als Map, met list() — de bestelling leest de klaarzetmap via listBatch(). */
const inhoud = new Map();
const bucket = {
  async put(key, body, opts) {
    let bytes = 0;
    if (body && typeof body.getReader === 'function') {
      const r = body.getReader();
      for (;;) { const { done, value } = await r.read(); if (done) break; bytes += value.byteLength; }
    }
    inhoud.set(key, { bytes, opts });
    return { key };
  },
  async get(key) { return inhoud.has(key) ? { body: null } : null; },
  async head(key) { return inhoud.has(key) ? {} : null; },
  async delete(key) { inhoud.delete(key); },
  async list({ prefix = '' } = {}) {
    return { objects: [...inhoud.entries()].filter(([k]) => k.startsWith(prefix))
      .map(([key, v]) => ({ key, size: v.bytes, customMetadata: v.opts?.customMetadata || {} })) };
  },
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.slice(0, 3).join(' | '));
const env = {
  DB: d1(db), UPLOADS: bucket,
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123',
  RESEND_API_KEY: 're_test',
  NOTIFY_EMAIL: 'hello@visuails.com',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>',
  SELLER_ADDRESS: 'VISUAILS\nVoorbeeldstraat 12\n1234 AB Voorbeeldstad\nKVK 00000000',
  PUBLIC_ORIGIN: 'https://visuails.com',
};
const adminToken = 'proef-admin-token';
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const post = (path, velden, multipart = false) => {
  let body;
  if (multipart) { body = new FormData(); for (const [k, v] of velden) body.append(k, v); }
  else body = new URLSearchParams(velden);
  return adminPost({ request: new Request(`https://visuails.com${path}`, { method: 'POST', headers: { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' }, body }), env, waitUntil() {} });
};
const get = (path) => adminGet({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });

/* Een verzonnen klant — geen echt adres, geen echt bedrijf. */
const KLANT = {
  first_name: 'Henk', last_name: 'de Voorbeeld', email: 'henk@voorbeeld-kleding.nl', phone: '+31 6 00000000',
  brand: 'Voorbeeld Kleding', vat_or_reg: '12345678',
  address_line1: 'Voorbeeldstraat 1', postal_code: '1234 AB', city: 'Voorbeeldstad', country: 'NL',
};

console.log('\nVISUAILS — bestellen via WhatsApp\n');

/* ── 1 · De klantenlijst biedt het aan ──────────────────────────────────── */
console.log('1 · de klantenlijst heeft een formulier "Nieuwe klant"');
{
  const res = await get('/admin/customers');
  const html = await res.text();
  ok('de pagina laadt', res.status, 200);
  ok('  met het formulier', /action="\/admin\/customers\/new"/.test(html), true);
  ok('  en de velden die een factuur nodig heeft',
    ['first_name', 'last_name', 'email', 'phone', 'address_line1', 'postal_code', 'city', 'country'].every((n) => html.includes(`name="${n}"`)), true);
}

/* ── 2 · Een klant aanmaken zonder account ─────────────────────────────── */
console.log('\n2 · een klant aanmaken zonder account');
let klantId;
{
  const fout = await post('/admin/customers/new', { ...KLANT, email: 'geen-adres' });
  ok('een ongeldig e-mailadres wordt geweigerd', fout.status, 400);
  ok('  en er is niemand aangemaakt', db.prepare('SELECT COUNT(*) n FROM customers').get().n, 0);

  const res = await post('/admin/customers/new', KLANT);
  const rij = db.prepare('SELECT * FROM customers WHERE email = ?').get(KLANT.email);
  klantId = rij?.id;
  ok('de klant staat erin', !!rij, true);
  ok('  en je gaat door naar zijn pagina, bij "Bestelling namens"', res.headers.get('location'), `/admin/customers/${klantId}#namens`);
  ok('  met voor- en achternaam apart', [rij.first_name, rij.last_name], ['Henk', 'de Voorbeeld']);
  ok('  WhatsApp als contactvoorkeur', rij.contact_preference, 'whatsapp');
  ok('  acht cijfers is een KVK-nummer, geen btw-nummer', [rij.reg_number, rij.vat_number, rij.no_vat_number], ['12345678', null, 1]);
  ok('  en het adres staat erin', [rij.address_line1, rij.postal_code, rij.city, rij.country], ['Voorbeeldstraat 1', '1234 AB', 'Voorbeeldstad', 'NL']);
  ok('er is nog geen mail naar de klant gegaan', mails().filter((m) => JSON.stringify(m.to || '').includes(KLANT.email)).length, 0);

  const nogEens = await post('/admin/customers/new', { ...KLANT, first_name: 'Anders' });
  ok('twee keer hetzelfde adres geeft geen tweede klant', db.prepare('SELECT COUNT(*) n FROM customers WHERE email = ?').get(KLANT.email).n, 1);
  ok('  en brengt je naar dezelfde klant', nogEens.headers.get('location'), `/admin/customers/${klantId}#namens`);

  const log = db.prepare(`SELECT action FROM admin_log ORDER BY id DESC LIMIT 1`).get();
  ok('het aanmaken staat in het logboek', log?.action, 'customer.nieuw');
}

/* ── 3 · De klantpagina toont het formulier met foto's ─────────────────── */
console.log('\n3 · de klantpagina neemt foto\'s aan');
{
  const html = await (await get(`/admin/customers/${klantId}`)).text();
  ok('het formulier post multipart', new RegExp(`action="/admin/customers/${klantId}/order" enctype="multipart/form-data"`).test(html), true);
  ok('  met een veld voor meerdere foto\'s', /name="fotos" multiple/.test(html), true);
}

/* ── 4 · De bestelling namens de klant, met de foto's uit de app ────────── */
console.log('\n4 · de bestelling namens de klant, met de foto\'s uit WhatsApp');
{
  const jpg = new File([new Uint8Array(2048).fill(7)], 'IMG-20260923-WA0001.jpg', { type: 'image/jpeg' });
  const png = new File([new Uint8Array(1024).fill(9)], 'IMG-20260923-WA0002.png', { type: 'image/png' });
  const raar = new File([new Uint8Array(10)], 'virus.exe', { type: 'application/octet-stream' });
  const res = await post(`/admin/customers/${klantId}/order`, [
    ['service', 'catalog'], ['products', '2'], ['message', 'Zoals besproken via WhatsApp: twee jassen.'],
    ['fotos', jpg], ['fotos', png], ['fotos', raar],
  ], true);
  ok('de route stuurt door naar de nieuwe bestelling', res.status === 303 && /\/admin\/orders\/\d+\/files\?namens=1/.test(res.headers.get('location') || ''), true);

  const o = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 1').get(klantId);
  ok('de bestelling hangt aan deze klant', !!o, true);
  ok('  als catalog, twee producten', [o?.service, o?.product_count], ['catalog', 2]);
  const bestanden = db.prepare(`SELECT filename, kind FROM files WHERE order_id = ? ORDER BY id`).all(o.id);
  ok('de twee foto\'s staan bij de bestelling', bestanden.map((b) => b.filename), ['IMG-20260923-WA0001.jpg', 'IMG-20260923-WA0002.png']);
  ok('  als materiaal van de klant (kind upload), niet als levering', bestanden.every((b) => b.kind === 'upload'), true);
  ok('  en het .exe-bestand is overgeslagen', [...inhoud.keys()].some((k) => /virus/.test(k)), false);
  ok('  de bytes zijn echt in R2 gezet', [...inhoud.values()].map((v) => v.bytes).sort((a, b) => a - b), [1024, 2048]);
  const log = db.prepare(`SELECT detail FROM admin_log WHERE action = 'order.namens' ORDER BY id DESC LIMIT 1`).get();
  ok('het logboek noemt de foto\'s en wat er is overgeslagen', /met foto's/.test(log?.detail || '') && /virus\.exe/.test(log?.detail || ''), true);
  /* Zonder btw-nummer maar met een KVK-nummer: de bestelling gaat door de poort
     zoals bij de klant zelf. Staat hij op de btw-lijst, dan komt de link na het
     akkoord; anders gaat de bevestiging met betaallink meteen. Beide zijn goed —
     wat hier telt is dat er in het tweede geval echt een link in de mail zit. */
  const naarKlant = mails().filter((m) => JSON.stringify(m.to || '').includes(KLANT.email));
  if (o.review_state === 'pending') {
    ok('zonder btw-nummer staat hij eerst op de btw-lijst (geen link vóór akkoord)', naarKlant.some((m) => /mollie\.com\/checkout/.test(m.html || '')), false);
  } else {
    ok('de klant krijgt de bevestiging met een betaallink', naarKlant.some((m) => /mollie\.com\/checkout/.test(m.html || '')), true);
  }
}

/* ── 5 · De taal kies je zelf ──────────────────────────────────────────── */
console.log('\n5 · de taal van de bevestiging kies je in het formulier');
{
  const html = await (await get(`/admin/customers/${klantId}`)).text();
  ok('het formulier heeft een taalkeuze', /<select name="lang">/.test(html), true);
  await post(`/admin/customers/${klantId}/order`, [['service', 'catalog'], ['products', '1'], ['lang', 'en']], true);
  const o = db.prepare('SELECT lang FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 1').get(klantId);
  ok('  en "Engels" geeft een Engelse bestelling', o?.lang, 'en');
  await post(`/admin/customers/${klantId}/order`, [['service', 'catalog'], ['products', '1']], true);
  const o2 = db.prepare('SELECT lang FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 1').get(klantId);
  ok('  leeg volgt de laatste bestelling', o2?.lang, 'en');
}

console.log(`\n${geslaagd}/${geslaagd + gezakt} geslaagd`);
process.exit(gezakt ? 1 : 0);
