/* VISUAILS — de eigen look, van aanvraag tot bestelling.  npm run test:eigenstijl
 *
 * Lucas, 4 september 2026: *"custom stylen: op aanvraag, korte intake voor
 * belangrijke informatie waarna ik kijk wat de klant precies wilt, of het
 * mogelijk is wat de klant wilt en offerte maak. De custom stylen worden dan in
 * het account van de klant geplaatst waarna hij deze kan gaan gebruiken via
 * hetzelfde bestelformulier met de custom style ertussen."*
 *
 * Dat is één keten met vier schakels, en elke schakel heeft hier een blok:
 *
 *   1 · DE INTAKE  — /start/custom-look post zes velden; ze landen in
 *       details_json en staan in de studiomail.
 *   2 · DE OFFERTE — /admin/orders/<id>/quote zet het bedrag op de aanvraag,
 *       maakt de Mollie-betaling en mailt de link als "offerte".
 *   3 · DE PLAATSING — /admin/customers/<id>/styles maakt de look; pas op
 *       'active' staat hij in /account/me, en dan met de juiste dienst.
 *   4 · DE BESTELLING — style=cs-<id> wordt alleen aangenomen als de look van
 *       DEZE klant is en actief; de toeslag telt per product mee; een look van
 *       een ander of nog in ontwerp wordt stil losgelaten (leeg, niet de
 *       standaard — dezelfde regel als bij `ratio`).
 *
 * Tegen het echte schema in node:sqlite, met een nep-Mollie en een nep-Resend.
 * Het laatste blok kijkt naar dist/ — draai `npm run build` eerst.
 */
import { readFileSync, existsSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { accountGet } from '../src/lib/account.js';
import { hashToken } from '../src/lib/token.js';
import { quoteOrder, VAT_RATE } from '../src/lib/quote.js';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true) {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) { geslaagd++; console.log(`  ok   ${naam}`); }
  else { gezakt++; console.log(`FAIL  ${naam}    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`); }
}

/* ── De omgeving: nep-Mollie, nep-Resend, R2 in een Map ──────────────────── */
const gezien = [];
const betalingen = new Map();
let volgnummer = 0;
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const body = opts.body ? String(opts.body) : '';
  gezien.push({ url: u, method: opts.method || 'GET', body });
  if (u.endsWith('/v2/payments') && (opts.method || '').toUpperCase() === 'POST') {
    const payload = JSON.parse(body);
    const id = `tr_${String(++volgnummer).padStart(10, '0')}`;
    const rec = { id, status: 'open', amount: payload.amount, description: payload.description, metadata: payload.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
    betalingen.set(id, rec);
    return new Response(JSON.stringify(rec), { status: 201, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('/vies') || u.includes('ec.europa.eu')) return new Response('{}', { status: 500 });
  return new Response(JSON.stringify({ id: 'msg_test' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => { try { return JSON.parse(g.body); } catch { return {}; } });

const inhoud = new Map();
const bucket = {
  async put(key, body, opts) { inhoud.set(key, { body, opts }); return { key }; },
  async get(key) { const v = inhoud.get(key); return v ? { body: v.body, httpMetadata: v.opts?.httpMetadata } : null; },
  async delete(key) { inhoud.delete(key); },
  async head(key) { return inhoud.has(key) ? {} : null; },
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.slice(0, 3).join(' | '));
const env = {
  DB: d1(db), UPLOADS: bucket,
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123',
  RESEND_API_KEY: 're_test',
  NOTIFY_EMAIL: 'hello@visuails.com',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>',
  SELLER_ADDRESS: 'VISUAILS\nVoorbeeldstraat 12\n1234 AB Rotterdam\nKVK 00000000\nBTW NL001234567B01',
  PUBLIC_ORIGIN: 'https://visuails.com',
};

const adminToken = 'proef-admin-token';
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const post = (path, velden, multipart = false) => {
  let body;
  if (multipart) { body = new FormData(); for (const [k, v] of Object.entries(velden)) body.append(k, v); }
  else body = new URLSearchParams(velden);
  return adminPost({ request: new Request(`https://visuails.com${path}`, { method: 'POST', headers: { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' }, body }), env, waitUntil() {} });
};
const get = (path) => adminGet({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });

async function bestel(velden, ip = '10.0.0.1') {
  const { onRequestPost } = await import('../functions/api/order.js');
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.append(k, String(v));
  return onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: fd }), env, waitUntil: () => {} });
}
const KLANT = {
  name: 'Mara Visser', brand: 'VOLT', email: 'studio@voorbeeld-volt.nl', phone: '+31 6 12345678',
  country: 'NL', address_line1: 'Voorbeeldstraat 12', postal_code: '1234 AB', city: 'Rotterdam', lang: 'nl',
  business_declaration: 'yes', business_version: 'v1', no_vat_number: '1', reg_number: '99999999',
};

console.log('\nVISUAILS — de eigen look, van aanvraag tot bestelling\n');

/* ── 1 · De intake ──────────────────────────────────────────────────────── */
console.log('1 · de intake komt compleet binnen');
let aanvraag;
{
  const res = await bestel({
    service: 'custom', request: 'custom-look', source: 'start-custom-look',
    name: KLANT.name, brand: KLANT.brand, email: KLANT.email, lang: 'nl',
    look_concept: 'own',
    look_service: 'both',
    look_world: 'Een heet betonnen dak om twaalf uur, harde schaduwen, één product per beeld.',
    look_references: 'https://voorbeeld.nl/a\nhttps://voorbeeld.nl/b',
    look_avoid: 'Geen pastel, geen planten.',
    look_products: '10-19',
    look_when: 'month',
    message: 'We lanceren in oktober.',
  });
  ok('de aanvraagroute antwoordt met een omleiding', res.status >= 300 && res.status < 400);
  aanvraag = db.prepare(`SELECT id, ref, service, total_cents, customer_id, details_json FROM orders ORDER BY id DESC LIMIT 1`).get();
  ok('  de dienst is custom', aanvraag.service, 'custom');
  ok('  zonder bedrag — dat komt uit de offerte', Number(aanvraag.total_cents) || 0, 0);
  const d = JSON.parse(aanvraag.details_json || '{}');
  ok('  de wereld staat in het dossier', /betonnen dak/.test(d.look_world || ''));
  ok('  wie het concept bedenkt', d.look_concept, 'own');
  ok('  en de dienst, de referenties, wat vermeden wordt, aantal en wanneer', [d.look_service, d.look_products, d.look_when, /voorbeeld\.nl\/b/.test(d.look_references || ''), d.look_avoid], ['both', '10-19', 'month', true, 'Geen pastel, geen planten.']);
  const studio = mails().find((m) => /hello@visuails\.com/.test(JSON.stringify(m.to || '')));
  ok('  de studiomail noemt de wereld', /betonnen dak/.test(studio?.html || ''));
  ok('  de aanvraag hangt aan een klantaccount', Number.isInteger(aanvraag.customer_id) && aanvraag.customer_id > 0);
}

/* ── 2 · De bestelpagina en de offerte ──────────────────────────────────── */
console.log('\n2 · de bestelpagina toont de intake, de offerte gaat de deur uit');
{
  const res = await get(`/admin/orders/${aanvraag.id}/files`);
  const h = await res.text();
  ok('de bestelpagina rendert', res.status, 200);
  ok('  met het kopje Aanvraag eigen look', /Aanvraag eigen look/.test(h));
  ok('  en de wereld in de intake', /betonnen dak/.test(h));
  ok('  en de knop naar de klantpagina, met de aanvraag in de URL', new RegExp(`/admin/customers/${aanvraag.customer_id}\\?look=${aanvraag.id}#nieuwe-look`).test(h));
  ok('  en het offerteformulier', new RegExp(`/admin/orders/${aanvraag.id}/quote`).test(h));

  const voor = betalingen.size;
  const q = await post(`/admin/orders/${aanvraag.id}/quote`, { amount: '1250,00' });
  ok('de offerte antwoordt met een omleiding naar de bestelpagina', q.status === 303 && /quote=sent/.test(q.headers.get('location') || ''), true);
  const o = db.prepare(`SELECT total_cents, vat_cents, vat_rate, review_state FROM orders WHERE id = ?`).get(aanvraag.id);
  ok('  het nettobedrag staat op de bestelling', o.total_cents, 125000);
  ok('  met btw erover, niet eruit', o.vat_cents, Math.round(125000 * VAT_RATE));
  ok('  en de btw-controle is daarmee gedaan', o.review_state, 'approved');
  ok('  er is één Mollie-betaling aangemaakt', betalingen.size - voor, 1);
  const betaling = [...betalingen.values()].pop();
  ok('  voor het brutobedrag', betaling.amount.value, ((125000 + Math.round(125000 * VAT_RATE)) / 100).toFixed(2));
  const mail = mails().filter((m) => /voorbeeld-volt/.test(JSON.stringify(m.to || ''))).pop();
  ok('  de klant krijgt een mail met "offerte" in het onderwerp', /offerte/i.test(mail?.subject || ''));
  ok('  en de betaallink erin', /mollie\.com\/checkout/.test(mail?.html || ''));
  const ev = db.prepare(`SELECT note FROM order_events WHERE order_id = ? ORDER BY id DESC LIMIT 2`).all(aanvraag.id).map((r) => r.note).join(' ');
  ok('  en de tijdlijn zegt het', /Offerte vastgelegd/.test(ev));

  const nee = await post(`/admin/orders/${aanvraag.id}/quote`, { amount: '-5' });
  ok('een onzinnig bedrag doet niets', nee.status === 303 && db.prepare(`SELECT total_cents FROM orders WHERE id = ?`).get(aanvraag.id).total_cents, 125000);
}

/* ── 3 · De plaatsing ───────────────────────────────────────────────────── */
console.log('\n3 · de look wordt in het account geplaatst');
let stijl;
const klantId = aanvraag.customer_id;
{
  const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], 'rooftop.png', { type: 'image/png' });
  const res = await post(`/admin/customers/${klantId}/styles`, {
    name: 'Rooftop', service: 'both', description: 'Heet betondak, hard middaglicht', surcharge: '15',
    status: 'proposed', prompt_note: 'ALLEEN STUDIO: 35mm, f/8, 12:00, grade warm', request_order_id: String(aanvraag.id), preview: png,
  }, true);
  ok('toevoegen antwoordt met een omleiding', res.status, 303);
  stijl = db.prepare(`SELECT * FROM customer_styles WHERE customer_id = ? ORDER BY id DESC LIMIT 1`).get(klantId);
  ok('  de rij bestaat, in ontwerp, met de toeslag in centen', [stijl?.name, stijl?.status, stijl?.service, stijl?.surcharge_cents], ['Rooftop', 'proposed', 'both', 1500]);
  ok('  en hangt aan de aanvraag', stijl?.request_order_id, aanvraag.id);
  ok('  het beeld staat in R2 onder styles/<klant>/', /^styles\/\d+\/\d+-rooftop\.png$/.test(stijl?.preview_key || ''));

  const pagina = await (await get(`/admin/customers/${klantId}`)).text();
  ok('de klantpagina toont de look', /id="style-\d+"/.test(pagina) && /Rooftop/.test(pagina));
  ok('  met de studionotitie (alleen hier)', /ALLEEN STUDIO/.test(pagina));
  ok('  en het beeld via de adminroute', new RegExp(`/admin/styles/${stijl.id}/image`).test(pagina));
  const img = await get(`/admin/styles/${stijl.id}/image`);
  ok('  die het beeld ook echt serveert, als png, niet gecachet', [img.status, img.headers.get('content-type'), img.headers.get('cache-control')], [200, 'image/png', 'private, no-store']);

  /* Wat de klant ziet zolang hij in ontwerp is. */
  const token = 'klant-token';
  db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (?, ?, '2099-01-01T00:00:00Z')`).run(klantId, await hashToken(token));
  const me = async () => (await accountGet({ request: new Request('https://visuails.com/account/me', { headers: { cookie: `vis_account=${token}` } }), env, waitUntil() {} })).json();
  let mij = await me();
  ok('in ontwerp staat hij NIET in /account/me (niet bestelbaar)', (mij.styles || []).length, 0);
  const studio = await (await accountGet({ request: new Request('https://visuails.com/account/brand-kit', { headers: { cookie: `vis_account=${token}` } }), env, waitUntil() {} })).text();
  ok('  maar wel in Studio, als "in ontwerp"', /Rooftop/.test(studio) && /is-proposed/.test(studio));
  ok('  zonder de studionotitie', !/ALLEEN STUDIO/.test(studio));
  const preview = await accountGet({ request: new Request(`https://visuails.com/account/styles/${stijl.id}/preview`, { headers: { cookie: `vis_account=${token}` } }), env, waitUntil() {} });
  ok('  en het beeld is voor de klant te zien', preview.status, 200);

  const save = await post(`/admin/styles/${stijl.id}/manage`, { action: 'save', name: 'Rooftop', service: 'both', description: 'Heet betondak, hard middaglicht', surcharge: '15', status: 'active', prompt_note: 'ALLEEN STUDIO: 35mm, f/8, 12:00, grade warm' });
  ok('op actief zetten antwoordt met een omleiding', save.status, 303);
  mij = await me();
  ok('  en dán staat hij in /account/me', (mij.styles || []).map((s) => [s.id, s.name, s.service, s.surchargeCents]), [[stijl.id, 'Rooftop', 'both', 1500]]);
  ok('  met een voorbeeldroute van de klant zelf', mij.styles[0].preview, `/account/styles/${stijl.id}/preview`);

  /* Een tweede klant ziet er niets van. */
  db.prepare(`INSERT INTO customers (id, email, brand, name, country) VALUES (77, 'inkoop@voorbeeld-noord.nl', 'NOORD', 'Joris Bakker', 'NL')`).run();
  db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (77, ?, '2099-01-01T00:00:00Z')`).run(await hashToken('ander-token'));
  const ander = await (await accountGet({ request: new Request('https://visuails.com/account/me', { headers: { cookie: 'vis_account=ander-token' } }), env, waitUntil() {} })).json();
  ok('een andere klant ziet de look niet', (ander.styles || []).length, 0);
  const anderBeeld = await accountGet({ request: new Request(`https://visuails.com/account/styles/${stijl.id}/preview`, { headers: { cookie: 'vis_account=ander-token' } }), env, waitUntil() {} });
  ok('  en krijgt het beeld ook niet', anderBeeld.status !== 200);
}

/* ── 4 · De bestelling ──────────────────────────────────────────────────── */
console.log('\n4 · bestellen met de eigen look');
{
  const basis = { ...KLANT, service: 'lifestyle', products: 3, background: 'studio-white' };
  const res = await bestel({ ...basis, style: `cs-${stijl.id}` }, '10.0.0.2');
  ok('de bestelling gaat door', res.status >= 300 && res.status < 400);
  const o = db.prepare(`SELECT total_cents, details_json FROM orders ORDER BY id DESC LIMIT 1`).get();
  const d = JSON.parse(o.details_json || '{}');
  ok('  de look staat in het dossier, met naam', [d.style, d.style_name, d.own_style_id], [`cs-${stijl.id}`, 'Rooftop', stijl.id]);
  const zonder = quoteOrder({ service: 'lifestyle', products: 3, vatRate: VAT_RATE });
  const met = quoteOrder({ service: 'lifestyle', products: 3, vatRate: VAT_RATE, styleSurchargeCents: 1500 });
  ok('  de toeslag telt per product mee', o.total_cents, met.netCents);
  ok('  en dat is drie keer de toeslag boven het gewone tarief', met.netCents - zonder.netCents, 4500);

  const studio = mails().filter((m) => /hello@visuails\.com/.test(JSON.stringify(m.to || ''))).pop();
  ok('  de studiomail noemt de look bij naam', /Rooftop/.test(studio?.html || ''));

  /* Iemand anders zijn look. */
  const ander = await bestel({ ...basis, email: 'inkoop@voorbeeld-noord.nl', brand: 'NOORD', name: 'Joris Bakker', style: `cs-${stijl.id}` }, '10.0.0.3');
  ok('met de look van een ander gaat de bestelling door', ander.status >= 300 && ander.status < 400);
  const o2 = db.prepare(`SELECT total_cents, details_json FROM orders ORDER BY id DESC LIMIT 1`).get();
  const d2 = JSON.parse(o2.details_json || '{}');
  ok('  maar zonder die look en zonder toeslag', [d2.style || '', d2.own_style_id || null, o2.total_cents], ['', null, zonder.netCents]);

  /* Alleen catalog, dan niet bij lifestyle. */
  db.prepare(`UPDATE customer_styles SET service = 'catalog' WHERE id = ?`).run(stijl.id);
  const verkeerd = await bestel({ ...basis, style: `cs-${stijl.id}` }, '10.0.0.4');
  ok('een catalog-look op een lifestylebestelling gaat door', verkeerd.status >= 300 && verkeerd.status < 400);
  const d3 = JSON.parse(db.prepare(`SELECT details_json FROM orders ORDER BY id DESC LIMIT 1`).get().details_json || '{}');
  ok('  zonder de look', d3.style || '', '');

  /* Gearchiveerd: weg uit Studio en uit het formulier. */
  db.prepare(`UPDATE customer_styles SET service = 'both', status = 'archived' WHERE id = ?`).run(stijl.id);
  const token = 'klant-token';
  const mij = await (await accountGet({ request: new Request('https://visuails.com/account/me', { headers: { cookie: `vis_account=${token}` } }), env, waitUntil() {} })).json();
  ok('gearchiveerd staat niet in /account/me', (mij.styles || []).length, 0);

  /* Verwijderen vraagt de naam. */
  await post(`/admin/styles/${stijl.id}/manage`, { action: 'delete', confirm: 'verkeerd' });
  ok('verwijderen zonder de juiste naam doet niets', !!db.prepare(`SELECT id FROM customer_styles WHERE id = ?`).get(stijl.id));
  await post(`/admin/styles/${stijl.id}/manage`, { action: 'delete', confirm: 'Rooftop' });
  ok('  met de naam gaat de rij weg', !db.prepare(`SELECT id FROM customer_styles WHERE id = ?`).get(stijl.id));
  ok('  en het beeld uit R2', !inhoud.has(stijl.preview_key));
}

/* ── 4b · Een bestelling namens de klant — 4 september 2026 ─────────────── */
console.log('\n4b · een bestelling namens de klant vanuit /admin');
{
  const voorMails = mails().length;
  /* Het KVK-nummer staat sinds migratie 0043 op de klant: de bestelling in blok 4
     gaf het op, dus hier hoeft het niet opnieuw. */
  ok('het KVK-nummer uit de bestelling staat op de klant', db.prepare('SELECT reg_number FROM customers WHERE id = ?').get(klantId)?.reg_number, '99999999');
  const me2 = await (await accountGet({ request: new Request('https://visuails.com/account/me', { headers: { cookie: 'vis_account=klant-token' } }), env, waitUntil() {} })).json();
  ok('  en /account/me geeft het door voor stap 3', me2.regNumber, '99999999');
  const res = await post(`/admin/customers/${klantId}/order`, { service: 'lifestyle', products: '2', style: 'glow', message: 'Zoals besproken via WhatsApp.' });
  ok('de route antwoordt met een omleiding naar de bestelpagina', res.status === 303 && /\/admin\/orders\/\d+\/files\?namens=1/.test(res.headers.get('location') || ''), true);
  const o = db.prepare(`SELECT id, ref, service, product_count, email, payment_status, review_state, details_json, source FROM orders ORDER BY id DESC LIMIT 1`).get();
  const d = JSON.parse(o.details_json || '{}');
  ok('  de bestelling staat op de klant', [o.service, o.product_count, o.email], ['lifestyle', 2, KLANT.email]);
  ok('  met de look en de notitie', [d.style, d.message], ['glow', 'Zoals besproken via WhatsApp.']);
  ok('  en herkenbaar als namens de klant geplaatst (kolom source + placed_by in het dossier)', [o.source, d.placed_by], ['admin', 'hello@visuails.com']);
  ok('  met het bewaarde KVK-nummer gaat hij niet naar de btw-lijst', o.review_state === 'pending', false);
  const nieuw = mails().slice(voorMails);
  ok('  de klant krijgt de gewone bevestiging', nieuw.some((m) => /voorbeeld-volt/.test(JSON.stringify(m.to || '')) && new RegExp(o.ref).test(m.subject || m.html || '')), true);
  ok('  de tijdlijn zegt dat de studio hem plaatste', /namens de klant/.test(db.prepare('SELECT note FROM order_events WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(o.id)?.note || ''), true);
  ok('  en het logboek ook', /namens/.test(db.prepare("SELECT detail FROM admin_log WHERE action = 'order.namens'").get()?.detail || ''), true);
  const pagina = await (await get(`/admin/orders/${o.id}/files?namens=1`)).text();
  ok('de bestelpagina bevestigt het', /Bestelling namens de klant aangemaakt/.test(pagina), true);
}

/* ── 5 · De gebouwde site ───────────────────────────────────────────────── */
console.log('\n5 · de gebouwde site');
{
  const dist = new URL('../dist/nl/start/custom-look/index.html', import.meta.url);
  if (!existsSync(dist)) {
    console.log('  (dist/ ontbreekt — draai npm run build; dit blok is overgeslagen)');
  } else {
    const h = readFileSync(dist, 'utf8');
    for (const veld of ['look_concept', 'look_service', 'look_world', 'look_references', 'look_avoid', 'look_products', 'look_when']) {
      ok(`/nl/start/custom-look heeft het veld ${veld}`, new RegExp(`name="${veld}"`).test(h));
    }
    ok('  de wereld is verplicht, met een Nederlandse melding', /name="look_world"[^>]*required/.test(h) && /data-melding="Beschrijf de wereld/.test(h));
    ok('  en zegt wat er na goedkeuring gebeurt (tegel in Studio, gewoon formulier)', /eigen tegel in je VISUAILS Studio/.test(h));
    const en = readFileSync(new URL('../dist/start/custom-look/index.html', import.meta.url), 'utf8');
    ok('  de Engelse pagina ook', /name="look_world"/.test(en) && /tile of its own/.test(en));
    const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
    ok('global.css kent de tegels die pipeline.js pas na /account/me maakt', /\.look\.is-own/.test(css) && /\.own-look-opt/.test(css) && /\.look-own-badge/.test(css));
    const pipeline = readFileSync(new URL('../src/scripts/pipeline.js', import.meta.url), 'utf8');
    ok('pipeline.js zet de eigen looks neer ná de merkmodellen en vóór de vaste look', /addBrandModels\(me\);\s*addOwnStyles\(me\);\s*applyBrandKit\(me\);/.test(pipeline));
  }
}

globalThis.fetch = echteFetch;
console.log(`\n${geslaagd} geslaagd, ${gezakt} gezakt\n`);
if (gezakt) process.exit(1);
