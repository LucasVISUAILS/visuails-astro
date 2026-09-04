/* DE HELE KETEN, ECHT GEBRUIKT — 3 september 2026.
   Lucas: "controleer waar er nog code in de back-end mist door de website
   handmatig te gebruiken en alle back-end mogelijkheden te proberen, en te
   kijken of alles goed overkomt van VISUAILS Studio naar /admin."

   Dit harnas gebruikt geen enkele stub van de eigen code: de echte routes
   (functions/api/*, account.js, portal.js, admin.js, cron/index.js), het echte
   schema.sql in node:sqlite, een R2-emmer die onthoudt, en een fetch die Mollie
   en Resend nabootst en ELKE mail bewaart. Elke stap schrijft naar het logboek
   (kladblok/keten/LOGBOEK.md) en maakt een schermafdruk van wat de klant en wat
   de studio op dat moment zien.

     node kladblok/keten-doorloop.mjs

   Nepdata, geen echte namen of adressen. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { d1, verseDb } from '../tests/lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import { addDays, firstOfferableDay } from '../src/data/capacity.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'kladblok', 'keten');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/* ── LOGBOEK ─────────────────────────────────────────────────────────────── */
const log = [];
const H = (t) => { log.push(`\n## ${t}\n`); console.log(`\n== ${t}`); };
const L = (t) => { log.push(`- ${t}`); console.log(`   ${t}`); };
const BAD = (t) => { log.push(`- ⚠️ **${t}**`); console.log(`   !! ${t}`); };
const schrijfLog = () => fs.writeFileSync(path.join(OUT, 'LOGBOEK.md'), `# Ketendoorloop — ${new Date().toISOString().slice(0, 16)}\n${log.join('\n')}\n`);

/* ── DE NEP-BUITENWERELD ─────────────────────────────────────────────────── */
const mails = [];
const betalingen = new Map();
const refunds = [];
let volg = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body ? String(opts.body) : '';
  if (u.includes('api.resend.com')) {
    let j = {}; try { j = JSON.parse(body); } catch { /* */ }
    mails.push({ to: [].concat(j.to || []).join(', '), subject: j.subject || '', html: j.html || '', text: j.text || '', at: mails.length + 1 });
    return new Response(JSON.stringify({ id: `msg_${mails.length}` }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('api.mollie.com')) {
    if (u.endsWith('/v2/payments') && method === 'POST') {
      const p = JSON.parse(body); const id = `tr_${String(++volg).padStart(8, '0')}`;
      const rec = { id, status: 'open', amount: p.amount, description: p.description, metadata: p.metadata || {}, redirectUrl: p.redirectUrl, method: null, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
      betalingen.set(id, rec);
      return new Response(JSON.stringify(rec), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    let m = u.match(/\/v2\/payments\/(tr_\w+)\/refunds$/);
    if (m && method === 'POST') {
      const p = JSON.parse(body); const id = `re_${String(++volg).padStart(8, '0')}`;
      refunds.push({ id, payment: m[1], amount: p.amount, status: 'pending' });
      return new Response(JSON.stringify({ id, status: 'pending', amount: p.amount, paymentId: m[1] }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    m = u.match(/\/v2\/payments\/(tr_\w+)$/);
    if (m) {
      const rec = betalingen.get(m[1]);
      return new Response(JSON.stringify(rec || { status: 404 }), { status: rec ? 200 : 404, headers: { 'content-type': 'application/json' } });
    }
    m = u.match(/\/v2\/refunds\/(re_\w+)$/) || u.match(/\/refunds\/(re_\w+)$/);
    if (m) { const r = refunds.find((x) => x.id === m[1]); return new Response(JSON.stringify(r ? { ...r, paymentId: r.payment } : {}), { status: r ? 200 : 404, headers: { 'content-type': 'application/json' } }); }
    return new Response(JSON.stringify({ status: 404, title: 'nep-mollie kent dit niet', url: u }), { status: 404, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('ec.europa.eu')) {
    L('VIES-aanroep nagebootst: geldig');
    return new Response(JSON.stringify({ isValid: true, name: 'NOORD GMBH', address: 'PROBESTRASSE 2, 10115 BERLIN', requestIdentifier: 'WAPIAAAAY_nep', userError: 'VALID' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  BAD(`onbekende netwerkaanroep: ${method} ${u}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const zetBetaald = (id) => { const r = betalingen.get(id); r.status = 'paid'; r.paidAt = new Date().toISOString(); r.method = 'ideal'; r.details = { consumerName: 'Nep' }; return r; };

const bucket = (() => {
  const inhoud = new Map();
  return {
    _inhoud: inhoud,
    async put(key, body, opts) { const bytes = typeof body === 'string' ? body.length : (body?.byteLength ?? body?.size ?? body?.length ?? 0); inhoud.set(key, { body, opts, bytes }); return { key, size: bytes }; },
    async get(key) { const v = inhoud.get(key); if (!v) return null; const b = v.body; return { body: b, size: v.bytes, httpMetadata: v.opts?.httpMetadata, customMetadata: v.opts?.customMetadata, async arrayBuffer() { return b instanceof ArrayBuffer ? b : (b?.arrayBuffer ? b.arrayBuffer() : new TextEncoder().encode(String(b)).buffer); }, async text() { return String(b); } }; },
    async delete(keys) { for (const k of [].concat(keys)) inhoud.delete(k); },
    async head(key) { const v = inhoud.get(key); return v ? { key, size: v.bytes, httpMetadata: v.opts?.httpMetadata } : null; },
    async list({ prefix = '' } = {}) { const objects = [...inhoud.entries()].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => ({ key: k, size: v.bytes, uploaded: new Date(), httpMetadata: v.opts?.httpMetadata, customMetadata: v.opts?.customMetadata })); return { objects, truncated: false }; },
  };
})();

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) BAD(`schema.sql: ${mislukt.slice(0, 3).join(' | ')}`);
const env = {
  DB: d1(db), UPLOADS: bucket,
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test',
  NOTIFY_EMAIL: 'hello@visuails.com', FROM_EMAIL: 'VISUAILS <hello@visuails.com>',
  SELLER_ADDRESS: 'VISUAILS\nVoorbeeldstraat 12\n1234 AB Voorbeeldstad\nKVK 00000000\nBTW NL000000000B00',
  PUBLIC_ORIGIN: 'https://visuails.com', PORTAL_SALT: 'zout', PAYER_SALT: 'zout2', ALLOWED_ORIGIN_HOSTS: 'visuails.com',
};
const waitUntil = (p) => { if (p && p.catch) p.catch((e) => BAD(`waitUntil faalde: ${e?.message || e}`)); };
const ctx = (request) => ({ request, env, waitUntil });

/* ── DE ROUTES ───────────────────────────────────────────────────────────── */
const orderApi = await import('../functions/api/order.js');
const uploadApi = await import('../functions/api/upload.js');
const statusApi = await import('../functions/api/order-status.js');
const capApi = await import('../functions/api/capacity.js');
const mollieHook = await import('../functions/api/webhook/mollie.js');
const account = await import('../src/lib/account.js');
const portal = await import('../src/lib/portal.js');
const admin = await import('../src/lib/admin.js');
const cron = await import('../cron/index.js');

const ORIGIN = 'https://visuails.com';
const fdOf = (velden) => { const fd = new FormData(); for (const [k, v] of Object.entries(velden)) { if (Array.isArray(v)) v.forEach((x) => fd.append(k, x)); else fd.append(k, v); } return fd; };
const req = (p, { method = 'GET', form = null, cookie = '', headers = {}, json = null } = {}) => new Request(`${ORIGIN}${p}`, {
  method, body: form ? fdOf(form) : json ? JSON.stringify(json) : undefined,
  headers: { origin: ORIGIN, ...(cookie ? { cookie } : {}), ...(json ? { 'content-type': 'application/json' } : {}), ...headers },
});
const cookieUit = (res) => (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');

/* ── ADMIN-SESSIE ────────────────────────────────────────────────────────── */
const adminToken = 'proef-admin';
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const A = { cookie: `vis_admin=${adminToken}` };
const adminGet = (p) => admin.adminGet(ctx(req(p, A)));
const adminPost = (p, form) => admin.adminPost(ctx(req(p, { ...A, method: 'POST', form })));

/* ── SCHERMAFDRUKKEN ─────────────────────────────────────────────────────── */
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const bctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const beeld = fs.readFileSync(path.join(ROOT, 'public/img/catalog-after-w420.webp'));
await bctx.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  const file = path.join(ROOT, 'public', u.pathname.replace(/^\//, ''));
  if (/\.(css|woff2?|ico|svg|png|webp|js)$/.test(u.pathname) && fs.existsSync(file)) {
    const type = u.pathname.endsWith('.css') ? 'text/css' : u.pathname.endsWith('.js') ? 'text/javascript' : u.pathname.endsWith('.woff2') ? 'font/woff2' : u.pathname.endsWith('.svg') ? 'image/svg+xml' : 'image/webp';
    return route.fulfill({ contentType: type, body: fs.readFileSync(file) });
  }
  if (/\/(files|models)\/\d+/.test(u.pathname) || /\/preview$/.test(u.pathname) || /\/f(\/\d+)?$/.test(u.pathname)) return route.fulfill({ contentType: 'image/webp', body: beeld });
  return route.fulfill({ status: 204, body: '' });
});
let nr = 0;
async function afdruk(naam, html, { width = 1440, open = '' } = {}) {
  const page = await bctx.newPage();
  await page.setViewportSize({ width, height: 900 });
  await page.route('**/__page*', (r) => r.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(`${ORIGIN}/__page`, { waitUntil: 'networkidle' }).catch(() => {});
  if (open) { await page.$$eval(open, (els) => els.slice(0, 1).forEach((e) => { e.open = true; })); await page.waitForTimeout(600); }
  const f = `${String(++nr).padStart(2, '0')}-${naam}.png`;
  await page.screenshot({ path: path.join(OUT, f), fullPage: true });
  if (process.env.DUMP) fs.writeFileSync(path.join(OUT, f.replace(/\.png$/, '.html')), html);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.close();
  L(`📷 \`${f}\` (${h}px)`);
  return f;
}
const tekst = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/* ── KLANT: STUDIO-SESSIE VIA DE INLOGMAIL ───────────────────────────────── */
async function studioLogin(email, lang = 'nl') {
  const before = mails.length;
  const res = await account.accountPost(ctx(req('/account/login', { method: 'POST', form: { email, lang } })));
  L(`POST /account/login → ${res.status}`);
  const mail = mails.slice(before).find((m) => m.to.includes(email));
  if (!mail) { BAD(`geen inlogmail voor ${email}`); return ''; }
  L(`inlogmail: "${mail.subject}"`);
  const link = (mail.html.match(/https:\/\/visuails\.com(\/account\/verify\/[^"'\s<]+)/) || [])[1];
  const code = ((mail.text + mail.html).match(/\b(\d{3}) ?(\d{3})\b/) || []).slice(1).join('');
  L(`link: ${link ? 'ja' : 'NEE'} · code: ${code || 'NEE'}`);
  const r2 = await account.accountGet(ctx(req(link)));
  L(`GET ${link.slice(0, 30)}… → ${r2.status} → ${r2.headers.get('location')}`);
  return cookieUit(r2);
}
const studioGet = async (p, cookie) => { const r = await account.accountGet(ctx(req(p, { cookie }))); return { res: r, html: await r.text() }; };
const studioPost = (p, cookie, form) => account.accountPost(ctx(req(p, { cookie, method: 'POST', form })));

/* ═════════════════════════════════════════════════════════════════════════ */
H('0 · Een lege winkel: hoe zien Studio en /admin eruit zonder klanten?');
{
  const r = await adminGet('/admin'); L(`/admin → ${r.status}`); await afdruk('admin-leeg', await r.text());
  const r2 = await account.accountGet(ctx(req('/account/login')));
  await afdruk('studio-login', await r2.text());
}

/* ═════════════════════════════════════════════════════════════════════════ */
H('1 · Klant A (Mara, VOLT) bestelt 3 catalogproducten met foto\'s');
let orderA; let cookieA = ''; let batchA = '';
{
  const foto = new File([beeld], 'hoodie-voorkant.webp', { type: 'image/webp' });
  const up1 = await uploadApi.onRequestPost(ctx(req('/api/upload', { method: 'POST', form: { file: foto, product: 'p1', shot: 'front' } })));
  const j1 = await up1.json(); L(`POST /api/upload (p1 front) → ${up1.status} ${JSON.stringify(j1).slice(0, 120)}`);
  batchA = j1.batch || '';
  for (const [p, s] of [['p1', 'back'], ['p2', 'front'], ['p2', 'back'], ['p3', 'front']]) {
    const r = await uploadApi.onRequestPost(ctx(req('/api/upload', { method: 'POST', form: { file: new File([beeld], `${p}-${s}.webp`, { type: 'image/webp' }), batch: batchA, product: p, shot: s } })));
    if (r.status !== 200) BAD(`upload ${p}/${s} → ${r.status} ${await r.text()}`);
  }
  L(`5 foto's in batch ${batchA}; R2 telt ${bucket._inhoud.size} objecten`);
  const res = await orderApi.onRequestPost(ctx(req('/api/order', { method: 'POST', form: {
    service: 'catalog', products: '3', tier: 'unattended', upload_batch: batchA,
    first_name: 'Mara', last_name: 'Visser', name: 'Mara Visser', brand: 'VOLT', email: 'mara@voorbeeld-volt.nl', phone: '06 12345678',
    country: 'NL', address_line1: 'Proefstraat 1', postal_code: '1234 AB', city: 'Proefstad', lang: 'nl',
    style: 'classic', background: 'studio-white', ratio: '1:1', channels: 'own', model: 'ava',
    product_p1: 'Hoodie zwart', product_p2: 'Cargobroek sand', product_p3: 'Tee wit', material_p1: '100% katoen',
    business_declaration: 'yes', business_version: 'v1', no_vat_number: '1', reg_number: '99999999',
  } })));
  L(`POST /api/order → ${res.status} → ${res.headers.get('location') || (await res.text()).slice(0, 200)}`);
  orderA = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
  if (!orderA) { BAD('geen bestelling in de database'); } else {
    L(`bestelling ${orderA.ref}: ${orderA.service}/${orderA.tier}, ${orderA.product_count} producten, €${orderA.total_cents / 100} netto, betaling ${orderA.payment_status}, review ${orderA.review_state}`);
    L(`bestanden aan de bestelling: ${db.prepare('SELECT COUNT(*) n FROM files WHERE order_id = ?').get(orderA.id).n} (kind upload)`);
    const d = JSON.parse(orderA.details_json || '{}');
    L(`details_json sleutels: ${Object.keys(d).join(', ')} · product_p1=${d.product_p1}`);
  }
  L(`mails tot nu: ${mails.map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ')}`);
  const mollie = [...betalingen.values()][0];
  L(`Mollie-betaling aangemaakt: ${mollie ? `${mollie.id} €${mollie.amount.value}` : 'NEE'}`);
  const st = await statusApi.onRequestGet(ctx(req(`/api/order-status?ref=${orderA.ref}`)));
  L(`GET /api/order-status?ref → ${st.status} ${(await st.text()).slice(0, 160)}`);
}

H('2 · Mara opent VISUAILS Studio (nog niet betaald)');
{
  cookieA = await studioLogin('mara@voorbeeld-volt.nl');
  for (const p of ['/account', '/account/orders', '/account/brand-kit', '/account/details', '/account/invoices', '/account/plan']) {
    const { res, html } = await studioGet(p, cookieA);
    L(`${p} → ${res.status}`);
    await afdruk(`studio-onbetaald${p.replace(/\//g, '-')}`, html);
  }
}

H('3 · Mara betaalt (Mollie → webhook)');
{
  const id = [...betalingen.keys()][0];
  zetBetaald(id);
  const r = await mollieHook.onRequestPost(ctx(req('/api/webhook/mollie', { method: 'POST', form: { id } })));
  L(`webhook → ${r.status}`);
  orderA = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderA.id);
  L(`bestelling: betaling ${orderA.payment_status}, status ${orderA.status}, paid_at ${orderA.paid_at}`);
  L(`facturen: ${db.prepare('SELECT number, status FROM invoices').all().map((i) => `${i.number} ${i.status}`).join(', ') || 'geen'}`);
  L(`mails: ${mails.slice(-3).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ')}`);
  const { html } = await studioGet('/account', cookieA); await afdruk('studio-betaald-overzicht', html);
  const { html: h2 } = await studioGet('/account/invoices', cookieA); await afdruk('studio-betaald-facturen', h2);
  const r2 = await adminGet('/admin'); await afdruk('admin-na-bestelling', await r2.text());
  const r3 = await adminGet(`/admin/orders/${orderA.id}/files`); await afdruk('admin-bestelling-A', await r3.text());
}

H('4 · Studio: de bestelling van A in productie zetten, beelden leveren, aankondigen');
{
  let r = await adminPost(`/admin/orders/${orderA.id}/status`, { status: 'in_production', note: 'We zijn begonnen.' });
  L(`status → in_production: ${r.status} → ${r.headers.get('location')}`);
  const { html } = await studioGet('/account', cookieA); await afdruk('studio-in-productie', html);
  // leveren: 4 beelden per product, per slot
  for (const p of ['p1', 'p2', 'p3']) for (const s of ['front', 'back', 'detail', 'worn']) {
    r = await adminPost(`/admin/orders/${orderA.id}/deliver`, { product: p, shot: s, files: [new File([beeld], `${orderA.ref}-${p}-${s}.webp`, { type: 'image/webp' })] });
    if (r.status >= 400) BAD(`deliver ${p}/${s} → ${r.status} ${tekst(await r.text()).slice(0, 200)}`);
  }
  L(`geleverde bestanden: ${db.prepare("SELECT COUNT(*) n FROM files WHERE order_id = ? AND kind = 'delivery'").get(orderA.id).n}`);
  r = await adminGet(`/admin/orders/${orderA.id}/files`); await afdruk('admin-bestelling-A-geleverd', await r.text());
  const before = mails.length;
  r = await adminPost(`/admin/orders/${orderA.id}/status`, { status: 'delivered', note: '' });
  L(`status → delivered: ${r.status}; mails erna: ${mails.slice(before).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ') || 'GEEN'}`);
  orderA = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderA.id);
  L(`delivered_at ${orderA.delivered_at} · delivery_mailed_at ${orderA.delivery_mailed_at}`);
  const m = mails.slice(before).find((x) => x.to.includes('mara'));
  const links = m ? [...m.html.matchAll(/https:\/\/visuails\.com(\/[^"'\s<]+)/g)].map((x) => x[1]) : [];
  L(`links in de leveringsmail: ${links.join(' , ')}`);
  const portalLink = links.find((l) => l.startsWith('/o/'));
  L(`portaallink in de mail: ${portalLink || 'GEEN'}`);
  for (const t of db.prepare('SELECT id, order_id, issued_at, expires_at, revoked_at, token_hash FROM order_tokens').all()) L(`order_tokens: ${JSON.stringify(t)} · hash van maillink = ${portalLink ? (await hashToken(portalLink.slice(3))) === t.token_hash : '-'}`);
  globalThis.__portalA = portalLink;
  const { html: h2 } = await studioGet('/account', cookieA); await afdruk('studio-geleverd-overzicht', h2);
  const { html: h3 } = await studioGet(`/account/orders?order=${orderA.id}`, cookieA); await afdruk('studio-geleverd-bestelling', h3); await afdruk('studio-geleverd-product-open', h3, { open: 'details.prod' });
  const zip = await account.accountGet(ctx(req(`/account/orders/${orderA.id}/zip`, { cookie: cookieA })));
  L(`zip-download → ${zip.status} ${zip.headers.get('content-type')} ${zip.headers.get('content-disposition') || ''}`);
}

H('5 · Mara keurt goed, vraagt één revisie aan, en rondt de ronde af');
{
  const files = db.prepare("SELECT id, product_key, shot FROM files WHERE order_id = ? AND kind = 'delivery' ORDER BY id").all(orderA.id);
  let r = await studioPost('/account/review', cookieA, { action: 'approve', file: String(files[0].id) });
  L(`approve ${files[0].product_key}/${files[0].shot} → ${r.status}`);
  const before0 = mails.length;
  r = await studioPost('/account/review', cookieA, { action: 'round', order: String(orderA.id), file: String(files[1].id), [`note-${files[1].id}`]: 'De rugprint staat te laag, graag iets hoger.' });
  L(`revisieronde met 1 beeld ${files[1].product_key}/${files[1].shot} → ${r.status} → ${r.headers.get('location')}; mails: ${mails.slice(before0).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ') || 'geen'}`);
  const st = db.prepare('SELECT review_state, review_note FROM files WHERE id = ?').get(files[1].id);
  L(`bestand staat op ${st.review_state} met notitie "${st.review_note}"`);
  const { html } = await studioGet(`/account/orders?order=${orderA.id}`, cookieA); await afdruk('studio-revisie-aangevraagd', html);
  r = await studioPost('/account/review', cookieA, { action: 'round', order: String(orderA.id) });
  L(`nog een ronde zonder beelden → ${r.status} → ${r.headers.get('location')} (verwacht: geweigerd)`);
  orderA = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderA.id);
  L(`revision_round_at ${orderA.revision_round_at} · count ${orderA.revision_round_count} · note ${orderA.revision_round_note}`);
  const a = await adminGet('/admin'); await afdruk('admin-revisie-binnen', await a.text());
  globalThis.__revFile = files[1];
}

H('6 · Studio vervangt het beeld en kondigt aan; Mara ziet het nieuwe beeld');
{
  const f = globalThis.__revFile;
  let r = await adminPost(`/admin/orders/${orderA.id}/deliver`, { product: f.product_key, shot: f.shot, files: [new File([beeld], `${orderA.ref}-${f.product_key}-${f.shot}-v2.webp`, { type: 'image/webp' })] });
  L(`vervangend beeld → ${r.status}`);
  const oud = db.prepare('SELECT superseded_at, review_state FROM files WHERE id = ?').get(f.id);
  L(`oude beeld: superseded_at ${oud.superseded_at}, review_state ${oud.review_state}`);
  const before = mails.length;
  r = await adminPost(`/admin/orders/${orderA.id}/announce`, { note: 'Rugprint staat nu hoger.' });
  L(`aankondigen → ${r.status} → ${r.headers.get('location')}; mails: ${mails.slice(before).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ') || 'GEEN'}`);
  const na = db.prepare('SELECT superseded_at, review_state FROM files WHERE id = ?').get(f.id);
  L(`oude beeld na aankondigen: review_state ${na.review_state}`);
  L(`open revisieverzoeken in admin-inbox: ${db.prepare("SELECT COUNT(*) n FROM files WHERE review_state = 'revision_requested' AND superseded_at IS NULL").get().n}`);
  const { html } = await studioGet(`/account/orders?order=${orderA.id}`, cookieA); await afdruk('studio-na-vervanging', html, { open: 'details.prod' });
  const a = await adminGet('/admin'); await afdruk('admin-na-vervanging', await a.text());
}

H('7 · Het portaal uit de mail (/o/<token>) — dezelfde bestelling zonder inloggen');
{
  const link = globalThis.__portalA;
  if (!link) BAD('geen portaallink om te testen');
  else {
    for (const t of db.prepare('SELECT id, issued_at, revoked_at FROM order_tokens WHERE order_id = ?').all(orderA.id)) L(`token ${t.id}: issued ${t.issued_at}, revoked ${t.revoked_at || '—'}`);
    const r = await portal.portalGet(ctx(req(link)));
    L(`GET ${link.slice(0, 20)}… → ${r.status} — ${tekst(await r.clone().text()).slice(0, 160)}`);
    const html = await r.text(); await afdruk('portaal-oude-link', html);
    const laatste = mails.filter((m) => m.to.includes('mara')).map((m) => (m.html.match(/https:\/\/visuails\.com(\/o\/[^"'\s<]+)/) || [])[1]).filter(Boolean).pop();
    if (laatste) { const r2 = await portal.portalGet(ctx(req(laatste))); L(`nieuwste link uit de laatste mail → ${r2.status}`); await afdruk('portaal-nieuwste-link', await r2.text()); }
    const ok = /goedkeur|approve|Goedkeuren/i.test(html);
    L(`portaal toont goedkeurknoppen: ${ok}`);
  }
}

H('8 · Mara geeft feedback en een aanbeveling; de studio keurt die goed');
{
  const before = mails.length;
  // eerst: alle beelden goedkeuren zodat de bestelling sluit (closed_at) — feedback kan pas daarna
  for (const f of db.prepare("SELECT id FROM files WHERE order_id = ? AND kind = 'delivery' AND superseded_at IS NULL AND review_state != 'approved'").all(orderA.id)) {
    await studioPost('/account/review', cookieA, { action: 'approve', file: String(f.id) });
  }
  orderA = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderA.id);
  L(`alles goedgekeurd → closed_at ${orderA.closed_at}; mails: ${mails.slice(before).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ') || 'geen'}`);
  const { html: h0 } = await studioGet('/account', cookieA); await afdruk('studio-A-afgerond', h0);
  let r = await studioPost('/account/feedback', cookieA, { order: String(orderA.id), fb: 'score', score: '5' });
  L(`feedback score → ${r.status} → ${r.headers.get('location')}`);
  r = await studioPost('/account/feedback', cookieA, { order: String(orderA.id), fb: 'quote', quote: 'Binnen een dag stonden er twaalf producten online die er eindelijk bij elkaar uitzien.', quote_name: 'Mara', quote_consent: '1' });
  L(`feedback aanbeveling → ${r.status} → ${r.headers.get('location')}`);
  r = await studioPost('/account/feedback', cookieA, { order: String(orderA.id), fb: 'click', platform: 'google' });
  L(`feedback klik google → ${r.status} → ${r.headers.get('location')}`);
  const fb = db.prepare('SELECT * FROM order_feedback WHERE order_id = ?').get(orderA.id);
  L(`order_feedback: ${fb ? `score ${fb.score}, testimonial ${fb.testimonial_text ? 'ja' : 'nee'}, consent ${fb.testimonial_consent}, approved ${fb.testimonial_approved}` : 'GEEN RIJ'}`);
  const a = await adminGet('/admin/testimonials'); await afdruk('admin-aanbevelingen', await a.text());
  r = await adminPost(`/admin/testimonials/${orderA.id}`, { action: 'approve' });
  L(`goedkeuren → ${r.status} → ${r.headers.get('location')}`);
  const fb2 = db.prepare('SELECT testimonial_approved FROM order_feedback WHERE order_id = ?').get(orderA.id);
  L(`approved nu: ${fb2?.testimonial_approved}`);
  const { html } = await studioGet('/account', cookieA); await afdruk('studio-na-feedback', html);
}

H('9 · Klant B (Joris, NOORD, Duitsland, btw-nummer) bestelt 12 producten met leverdatum');
let orderB; let cookieB = '';
{
  const cap = await capApi.onRequestGet(ctx(req('/api/capacity?service=catalog&products=12&tier=attended')));
  const cj = await cap.json(); L(`/api/capacity → ${cap.status} ${JSON.stringify(cj).slice(0, 200)}`);
  const w = (cj.windows || cj.offers || [])[0];
  const start = w?.start || w?.from || firstOfferableDay(new Date().toISOString().slice(0, 10));
  const res = await orderApi.onRequestPost(ctx(req('/api/order', { method: 'POST', form: {
    service: 'catalog', products: '12', tier: 'attended', window_start: start, window_end: w?.end || w?.to || addDays(start, 1),
    first_name: 'Joris', last_name: 'Bakker', name: 'Joris Bakker', brand: 'NOORD', email: 'joris@voorbeeld-noord.de', phone: '+49 151 12345678',
    country: 'DE', address_line1: 'Probestraße 2', postal_code: '10115', city: 'Berlin', lang: 'en',
    style: 'classic', background: 'studio-white', ratio: '4:5', channels: 'amazon', model: 'ava',
    business_declaration: 'yes', business_version: 'v1', vat: 'DE123456789', vat_confirmed: 'yes',
  } })));
  L(`POST /api/order → ${res.status} → ${res.headers.get('location') || (await res.text()).slice(0, 200)}`);
  orderB = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
  L(`bestelling ${orderB.ref}: tier ${orderB.tier}, venster ${orderB.window_start}–${orderB.window_end}, land ${orderB.country}, btw ${orderB.vat_treatment} ${orderB.vat_rate} valid=${orderB.vat_valid}/${orderB.vat_valid_state}, review ${orderB.review_state}, betaling ${orderB.payment_status}, expires ${orderB.window_expires_at}`);
  L(`Mollie-betalingen nu: ${betalingen.size}`);
  L(`mails: ${mails.slice(-2).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ')}`);
  const a = await adminGet('/admin/vat'); await afdruk('admin-btw-controle', await a.text());
  const p = await adminGet('/admin/planning'); await afdruk('admin-planning-met-B', await p.text());
  cookieB = await studioLogin('joris@voorbeeld-noord.de', 'en');
  const { html } = await studioGet('/account', cookieB); await afdruk('studio-B-overzicht-en', html);
}

H('10 · Btw-besluit in /admin, daarna betaalt B; planning; venster verzetten');
{
  let r = await adminPost(`/admin/orders/${orderB.id}/vat`, { action: 'approve', note: 'VIES handmatig nagekeken' });
  L(`btw-besluit → ${r.status} → ${r.headers.get('location')}`);
  orderB = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderB.id);
  L(`review_state ${orderB.review_state}, betaling ${orderB.payment_status}, payment_ref ${orderB.payment_ref}, Mollie-betalingen ${betalingen.size}, mails: ${mails.slice(-1).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join('')}`);
  const { html } = await studioGet('/account', cookieB); await afdruk('studio-B-na-btw', html);
  const ids = [...betalingen.keys()];
  const id = ids[ids.length - 1];
  if (id && betalingen.get(id).status !== 'paid') {
    zetBetaald(id);
    r = await mollieHook.onRequestPost(ctx(req('/api/webhook/mollie', { method: 'POST', form: { id } })));
    L(`webhook → ${r.status}`);
  } else L('geen open Mollie-betaling om te betalen');
  orderB = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderB.id);
  L(`B betaling ${orderB.payment_status}; facturen: ${db.prepare('SELECT number, status FROM invoices').all().map((i) => `${i.number} ${i.status}`).join(', ')}`);
  r = await adminPost(`/admin/orders/${orderB.id}/window`, { do: 'verzet', dag: addDays(orderB.window_start, 3), reason: 'materiaal te laat', back: 'planning' });
  L(`verzetten → ${r.status} → ${r.headers.get('location')}`);
  const p = await adminGet(`/admin/planning?verzet=${orderB.id}`); await afdruk('admin-planning-verzet', await p.text());
  const { html: h2 } = await studioGet('/account/orders', cookieB); await afdruk('studio-B-bestellingen-na-verzet', h2);
}

H('11 · Klant C bestelt met leverdatum en betaalt NIET → cron laat het venster los');
let orderC;
{
  const res = await orderApi.onRequestPost(ctx(req('/api/order', { method: 'POST', form: {
    service: 'lifestyle', products: '10', tier: 'attended', window_start: addDays(new Date().toISOString().slice(0, 10), 10), window_end: addDays(new Date().toISOString().slice(0, 10), 11),
    first_name: 'Ayla', last_name: 'Kaya', name: 'Ayla Kaya', brand: 'LUMEN', email: 'ayla@voorbeeld-lumen.nl', country: 'NL', address_line1: 'Proefweg 3', postal_code: '5678 CD', city: 'Proefdorp', lang: 'nl',
    style: 'glow', ratio: '4:5', model: 'noor', business_declaration: 'yes', business_version: 'v1', no_vat_number: '1', reg_number: '88888888',
  } })));
  L(`POST /api/order → ${res.status}`);
  orderC = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
  L(`${orderC.ref}: venster ${orderC.window_start}–${orderC.window_end}, expires ${orderC.window_expires_at}, deadline ${orderC.payment_deadline}`);
  db.prepare("UPDATE orders SET window_expires_at = datetime('now', '-1 day'), payment_deadline = datetime('now', '-1 day') WHERE id = ?").run(orderC.id);
  const before = mails.length;
  const uit = await cron.tasks.releaseExpiredWindows(env).catch((e) => ({ fout: String(e) }));
  L(`cron releaseExpiredWindows → ${JSON.stringify(uit).slice(0, 160)}`);
  orderC = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderC.id);
  L(`daarna: status ${orderC.status}, venster ${orderC.window_start || '—'}, betaling ${orderC.payment_status}; mails: ${mails.slice(before).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ') || 'geen'}`);
}

H('12 · Annuleren met terugbetaling (A) en de creditnota');
{
  const before = mails.length;
  const r = await adminPost(`/admin/orders/${orderA.id}/cancel`, { reason: 'Proef: klant wil toch niet.', payment: 'refund' });
  L(`annuleren → ${r.status} → ${r.headers.get('location') || tekst(await r.text()).slice(0, 200)}`);
  orderA = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderA.id);
  L(`status ${orderA.status}, cancel_payment ${orderA.cancel_payment}, refunded_cents ${orderA.refunded_cents}; refunds bij Mollie: ${refunds.length}`);
  L(`creditnota's vóór de refund-webhook: ${db.prepare('SELECT * FROM credit_notes').all().map((c) => `${c.number} ${c.status}`).join(', ') || 'geen'}; mails: ${mails.slice(before).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ') || 'geen'}`);
  // Mollie meldt de terugbetaling via de betaal-webhook: amountRefunded loopt op
  const rf = refunds[0]; const pay = betalingen.get(rf.payment); pay.amountRefunded = rf.amount; rf.status = 'refunded';
  const before2 = mails.length;
  const wr = await mollieHook.onRequestPost(ctx(req('/api/webhook/mollie', { method: 'POST', form: { id: rf.payment } })));
  L(`refund-webhook → ${wr.status}`);
  orderA = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderA.id);
  L(`refunded_cents ${orderA.refunded_cents}; creditnota's: ${db.prepare('SELECT * FROM credit_notes').all().map((c) => `${c.number} ${c.status}`).join(', ') || 'geen'}; mails: ${mails.slice(before2).map((m) => `[${m.to.split('@')[0]}] ${m.subject}`).join(' · ') || 'geen'}`);
  const { html } = await studioGet('/account/invoices', cookieA); await afdruk('studio-A-facturen-na-annulering', html);
  const { html: h2 } = await studioGet('/account', cookieA); await afdruk('studio-A-na-annulering', h2);
}

H('13 · Klantgegevens, e-mail wijzigen, vaste look, eigen model');
{
  let r = await studioPost('/account/details', cookieA, { first_name: 'Mara', last_name: 'Visser', brand: 'VOLT', phone: '06 12345678', country: 'NL', address_line1: 'Proefstraat 1', postal_code: '1234 AB', city: 'Proefstad', no_vat_number: '1', reg_number: '99999999' });
  L(`details opslaan → ${r.status} → ${r.headers.get('location')}`);
  r = await studioPost('/account/lock', cookieA, { style: 'catalog', face: 'rava', background_hex: '#FFFFFF', ratio: '1:1', channels: 'amazon' });
  L(`vaste look catalog → ${r.status} → ${r.headers.get('location')}`);
  r = await studioPost('/account/lock', cookieA, { style: 'lifestyle', face: '', look: 'glow', ratio: '4:5' });
  L(`vaste look lifestyle → ${r.status} → ${r.headers.get('location')}`);
  L(`locks: ${db.prepare('SELECT style, roster_model, background_hex, look, ratio, channels FROM customer_style_locks').all().map((l) => JSON.stringify(l)).join(' ')}`);
  const { html } = await studioGet('/account/brand-kit?saved=lifestyle', cookieA); await afdruk('studio-vaste-look', html);
  const before = mails.length;
  r = await account.accountPost(ctx(req('/account/email', { cookie: cookieA, method: 'POST', form: { new_email: 'mara.nieuw@voorbeeld-volt.nl' }, headers: { 'cf-connecting-ip': '10.1.2.3' } })));
  L(`e-mail wijzigen → ${r.status} → ${r.headers.get('location')}; mails: ${mails.slice(before).map((m) => `[${m.to}] ${m.subject}`).join(' · ') || 'geen'}`);
  r = await adminPost(`/admin/customers/${orderA.customer_id}/models`, { label: 'Nora' });
  L(`admin: eigen model toevoegen → ${r.status} → ${r.headers.get('location') || tekst(await r.text()).slice(0, 120)}`);
  const c = await adminGet(`/admin/customers/${orderA.customer_id}`); await afdruk('admin-klant-A', await c.text());
  const me = await account.accountGet(ctx(req('/account/me', { cookie: cookieA })));
  L(`/account/me → ${me.status} ${(await me.text()).slice(0, 200)}`);
}

H('14 · De cron-taken op deze database');
{
  for (const [naam, fn] of Object.entries(cron.tasks)) {
    const before = mails.length;
    const uit = await fn(env, { today: new Date().toISOString().slice(0, 10) }).catch((e) => ({ fout: String(e?.message || e) }));
    L(`${naam} → ${JSON.stringify(uit).slice(0, 140)}${mails.length > before ? ` · mails: ${mails.slice(before).map((m) => m.subject).join(' · ')}` : ''}`);
  }
}

H('15 · Het activiteitenlogboek, de klantenlijst en de trechter');
{
  for (const p of ['/admin/log', '/admin/customers', '/admin/funnel', '/admin/agenda', '/admin']) {
    const r = await adminGet(p); await afdruk(`admin-eind${p.replace(/\//g, '-')}`, await r.text());
  }
}

H('Alle mails die de keten stuurde');
for (const m of mails) L(`${String(m.at).padStart(2, '0')} → ${m.to} · **${m.subject}**`);

await browser.close();
schrijfLog();
console.log(`\nlogboek: kladblok/keten/LOGBOEK.md · ${nr} schermafdrukken`);
