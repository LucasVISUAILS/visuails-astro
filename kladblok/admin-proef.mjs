/* Het adminportaal in beeld, met een ECHTE database eronder — 3 september 2026.
   scripts/admin-render.mjs gebruikt een nepdatabase met één bestelling; dat laat
   niet zien hoe druk het scherm wordt met vijftien. Dit harnas zet het echte
   schema.sql in node:sqlite, vult het met een geloofwaardige werkweek en rendert
   elke leesroute met de echte renderfunctie en de echte admin.css.

     node kladblok/admin-proef.mjs            → schermafdrukken in kladblok/admin/
     node kladblok/admin-proef.mjs /admin/agenda   → alleen die route

   Nepdata: geen echte merken, geen echt adres. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { d1, verseDb } from '../tests/lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { hashToken } from '../src/lib/token.js';
import { addDays } from '../src/data/capacity.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'kladblok', 'admin');
fs.mkdirSync(OUT, { recursive: true });

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) console.log('schema:', mislukt.slice(0, 3).join(' | '));

const token = 'proef-admin-token';
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`)
  .run(await hashToken(token));

const vandaag = new Date().toISOString().slice(0, 10);
const d = (n) => addDays(vandaag, n);
const stamp = (n, h = 10) => `${d(n)} ${String(h).padStart(2, '0')}:00:00`;

const KLANTEN = [
  [1, 'studio@voorbeeld-volt.nl', 'VOLT', 'Mara Visser'],
  [2, 'inkoop@voorbeeld-noord.nl', 'NOORD', 'Joris Bakker'],
  [3, 'hi@voorbeeld-lumen.com', 'LUMEN', 'Ayla Kaya'],
  [4, 'team@voorbeeld-ruis.nl', 'RUIS', 'Sem de Groot'],
  [5, 'hello@voorbeeld-arc.eu', 'ARC', 'Nina Petersen'],
  [6, 'orders@voorbeeld-koel.nl', 'KOEL', 'Daan Smit'],
];
for (const [id, email, brand, name] of KLANTEN) {
  db.prepare(`INSERT INTO customers (id, email, brand, name, country, created_at) VALUES (?, ?, ?, ?, 'NL', ?)`)
    .run(id, email, brand, name, stamp(-40));
}

/* Een werkweek: vastgelegde paren rond vandaag, wachtrij-orders van gisteren en
   eergisteren, iets dat te laat is, iets onbetaald, iets geleverd. */
const ORDERS = [
  // id, ref, klant, service, status, tier, n, window_start, window_end, created, payment, paid_at
  [101, 'VIS-2609-0101', 1, 'catalog', 'in_production', 'attended', 12, d(0), d(1), stamp(-4), 'paid', stamp(-4, 15)],
  [102, 'VIS-2609-0102', 2, 'lifestyle', 'received', 'attended', 10, d(1), d(2), stamp(-3), 'paid', stamp(-3, 11)],
  [103, 'VIS-2609-0103', 3, 'catalog', 'received', 'unattended', 4, null, null, stamp(-1, 9), 'paid', stamp(-1, 9)],
  [104, 'VIS-2609-0104', 4, 'catalog', 'received', 'unattended', 2, null, null, stamp(-2, 16), 'unpaid', null],
  [105, 'VIS-2609-0105', 5, 'lifestyle', 'in_production', 'unattended', 6, null, null, stamp(-3, 12), 'paid', stamp(-3, 13)],
  [106, 'VIS-2609-0106', 6, 'catalog', 'human_check', 'attended', 15, d(-1), d(0), stamp(-6), 'paid', stamp(-6, 10)],
  [107, 'VIS-2609-0107', 1, 'catalog', 'received', 'attended', 11, d(4), d(5), stamp(0, 8), 'paid', stamp(0, 8)],
  [108, 'VIS-2609-0108', 2, 'catalog', 'received', 'attended', 20, d(6), d(7), stamp(0, 9), 'unpaid', null],
  [109, 'VIS-2609-0109', 3, 'lifestyle', 'delivered', 'unattended', 3, null, null, stamp(-9), 'paid', stamp(-9, 12)],
  [110, 'VIS-2609-0110', 4, 'catalog', 'delivered', 'attended', 10, d(-8), d(-7), stamp(-12), 'paid', stamp(-12, 12)],
  [111, 'VIS-2609-0111', 5, 'catalog', 'received', 'unattended', 1, null, null, stamp(0, 7), 'paid', stamp(0, 7)],
  [112, 'VIS-2609-0112', 6, 'lifestyle', 'in_production', 'attended', 13, d(2), d(3), stamp(-2), 'paid', stamp(-2, 14)],
  [113, 'VIS-2609-0113', 1, 'catalog', 'received', 'unattended', 7, null, null, stamp(-5, 18), 'paid', stamp(-5, 18)],
  [114, 'VIS-2609-0114', 2, 'catalog', 'cancelled', 'unattended', 2, null, null, stamp(-7), 'unpaid', null],
];
const ins = db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, window_start, window_end,
  created_at, payment_status, paid_at, name, brand, email, total_cents, lang, country, details_json, delivered_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nl', 'NL', ?, ?)`);
for (const o of ORDERS) {
  const k = KLANTEN.find((c) => c[0] === o[2]);
  const details = JSON.stringify({ products: Array.from({ length: Math.min(o[6], 3) }, (_, i) => ({ key: `p${i + 1}`, name: ['Hoodie zwart', 'Cargobroek sand', 'Tee wit'][i] })) });
  ins.run(o[0], o[1], o[2], o[3], o[4], o[5], o[6], o[7], o[8], o[9], o[10], o[11], k[3], k[2], k[1], o[6] * 8900, details,
    o[4] === 'delivered' ? stamp(-1) : null);
  db.prepare(`INSERT INTO order_events (order_id, status, created_at) VALUES (?, 'received', ?)`).run(o[0], o[9]);
}
/* Bestanden: een paar leveringen met een revisieverzoek, en uploads. */
let fid = 900;
const addFile = (order, kind, name, key, shot, state, note) => db.prepare(
  `INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, created_at, review_state, review_note, product_key, shot)
   VALUES (?, ?, ?, ?, ?, 1200000, ?, ?, ?, ?, ?)`
).run(fid++, order, kind, `${kind}/${order}/${name}`, name, stamp(-1), state || 'pending', note, key, shot);
for (const o of [101, 102, 103, 106, 107, 112]) for (const s of ['front', 'back']) addFile(o, 'upload', `IMG_${o}_${s}.jpg`, 'p1', null, null, null);
for (const s of ['front', 'back', 'detail', 'worn']) addFile(110, 'delivery', `p1-${s}.webp`, 'p1', s, s === 'back' ? 'revision_requested' : 'approved', s === 'back' ? 'De rugprint staat te laag, graag iets hoger.' : null);
for (const s of ['front', 'back', 'detail']) addFile(109, 'delivery', `p1-${s}.webp`, 'p1', s, 'pending', null);
db.prepare(`INSERT INTO blackout_days (day, reason) VALUES (?, 'shoot in Antwerpen')`).run(d(9));
/* Een eigen look (4 september 2026): één actief met beeld, één in ontwerp uit
   een aanvraag, zodat de klantpagina en de aanvraagpagina beide te zien zijn. */
db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, created_at, payment_status, name, brand, email, total_cents, lang, country, details_json)
  VALUES (115, 'VIS-2609-0115', 1, 'custom', 'received', 'unattended', 0, ?, 'unpaid', 'Mara Visser', 'VOLT', 'studio@voorbeeld-volt.nl', 0, 'nl', 'NL', ?)`)
  .run(stamp(-1, 14), JSON.stringify({ request: 'custom-look', look_service: 'both', look_world: 'Een heet betonnen dak om twaalf uur, harde schaduwen, één product per beeld.', look_references: 'https://voorbeeld.nl/a\nhttps://voorbeeld.nl/b', look_avoid: 'Geen pastel, geen planten.', look_products: '10-19', look_when: 'month', message: 'We lanceren in oktober.' }));
db.prepare(`INSERT INTO customer_styles (id, customer_id, name, description, service, status, surcharge_cents, preview_key, prompt_note) VALUES (1, 1, 'Rooftop', 'Heet betondak, hard middaglicht', 'both', 'active', 1500, 'styles/1/1-rooftop.webp', '35mm, f/8, 12:00, grade warm')`).run();
db.prepare(`INSERT INTO shared_sets (id, month, title, published_at) VALUES (1, ?, 'Nazomer', ?)`).run(vandaag.slice(0, 7), stamp(-2));
db.prepare(`INSERT INTO shared_sets (id, month, title) VALUES (2, ?, NULL)`).run(addDays(vandaag, 30).slice(0, 7));
for (let i = 1; i <= 20; i++) db.prepare(`INSERT INTO shared_files (set_id, r2_key, filename, bytes, content_type) VALUES (1, ?, ?, 900000, 'image/webp')`).run(`shared/x/${i}-set.webp`, `set-${String(i).padStart(2, '0')}.webp`);
for (let i = 1; i <= 6; i++) db.prepare(`INSERT INTO shared_files (set_id, r2_key, filename, bytes, content_type) VALUES (2, ?, ?, 900000, 'image/webp')`).run(`shared/y/${i}-set.webp`, `volgende-${i}.webp`);
db.prepare(`INSERT INTO customer_styles (id, customer_id, name, description, service, status, request_order_id) VALUES (2, 1, 'Nachtmarkt', 'Neon, nat asfalt', 'lifestyle', 'proposed', 115)`).run();

const env = { DB: d1(db), FROM_EMAIL: 'VISUAILS <hello@visuails.com>' };
const ROUTES = process.argv[2] ? [process.argv[2]] : [
  '/admin', '/admin/agenda', '/admin/planning', '/admin/customers', '/admin/customers/1',
  '/admin/orders/101/files', '/admin/orders/115/files', '/admin/maandset', '/admin/log', '/admin/testimonials', '/admin/funnel', '/admin/vat',
];

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: Number(process.env.W) || 1600, height: 1000 } });
await ctx.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  const file = path.join(ROOT, 'public', u.pathname.replace(/^\//, ''));
  if (/\.(css|woff2?|ico|svg|png|webp)$/.test(u.pathname) && fs.existsSync(file)) {
    const type = u.pathname.endsWith('.css') ? 'text/css' : u.pathname.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
    return route.fulfill({ contentType: type, body: fs.readFileSync(file) });
  }
  if (/^\/admin\/(files|styles|shared)\/\d+(\/image)?$/.test(u.pathname)) return route.fulfill({ contentType: 'image/webp', body: fs.readFileSync(path.join(ROOT, 'public/img/catalog-after-w420.webp')) });
  return route.fulfill({ status: 204, body: '' });
});

for (const r of ROUTES) {
  const res = await adminGet({ request: new Request(`https://visuails.com${r}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
  const body = await res.text();
  const page = await ctx.newPage();
  await page.route('**/__page*', (route) => route.fulfill({ contentType: 'text/html', body }));
  await page.goto('https://visuails.com/__page', { waitUntil: 'networkidle' });
  if (process.env.OPEN) await page.$$eval(process.env.OPEN, (els) => els.slice(0, 2).forEach((e) => { e.open = true; }));
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const slug = r.replace(/\W+/g, '-').replace(/^-|-$/g, '');
  await page.screenshot({ path: path.join(OUT, `${slug}.png`), fullPage: true });
  if (process.env.DUMP) fs.writeFileSync(path.join(OUT, `${slug}.html`), body);
  console.log(`${res.status}  ${r.padEnd(26)} ${h}px  → kladblok/admin/${slug}.png`);
  await page.close();
}
await browser.close();
