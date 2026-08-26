/* Het adminscherm als plaatje. `npm run admin:render`
 *
 * Tweelingbroer van scripts/account-render.mjs, en om dezelfde reden: het
 * werkbord op /admin/orders/<id>/files is niet te zien zonder sessie, database
 * en deploy, en een scherm dat je pas na een deploy kunt beoordelen, beoordeel
 * je niet. Nepdata, echte CSS, echte renderfunctie.
 *
 *   node scripts/admin-render.mjs                     → de bestandenpagina
 *   node scripts/admin-render.mjs /admin              → het dashboard
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { adminGet } from '../src/lib/admin.js';
import { mintToken } from '../src/lib/token.js';
import { browserPad } from './lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

const SECTION = process.argv[2] || '/admin/orders/90/files';

const ORDER = {
  id: 90, customer_id: 8, ref: 'VIS-2607-9920', service: 'catalog', status: 'delivered',
  tier: 'attended', brand: 'VOLT', name: 'Mara', email: 'studio@voltbrand.nl',
  lang: 'nl', product_count: 3, payment_status: 'paid', created_at: '2026-07-28',
  delivered_at: '2026-08-02', delivery_mailed_at: '2026-08-02 09:30',
  redelivery_mailed_at: null, redelivery_count: 0, file_count: 9,
};

/* Product 1 compleet en gemeld, product 2 half af met één revisie, product 3
 * nog leeg — de drie toestanden die het bord moet kunnen laten zien. */
const SHOTS = ['front', 'back', 'detail', 'worn'];
const FILES = [];
let fid = 500;
for (const shot of SHOTS) {
  FILES.push({ id: fid++, kind: 'delivery', filename: `VOLT-p1-${shot}.webp`, bytes: 1_200_000, product_key: 'p1', shot, created_at: '2026-08-01', review_state: 'approved', announced_at: '2026-08-02 09:30', superseded_at: null });
}
FILES.push({ id: fid++, kind: 'delivery', filename: 'VOLT-p2-front.webp', bytes: 1_100_000, product_key: 'p2', shot: 'front', created_at: '2026-08-01', review_state: 'revision_requested', announced_at: '2026-08-02 09:30', superseded_at: null });
FILES.push({ id: fid++, kind: 'delivery', filename: 'VOLT-p2-back.webp', bytes: 1_150_000, product_key: 'p2', shot: 'back', created_at: '2026-08-06', review_state: 'pending', announced_at: null, superseded_at: null });
FILES.push({ id: fid++, kind: 'upload', filename: 'IMG_1001.jpg', bytes: 2_400_000, product_key: 'p1', shot: null, created_at: '2026-07-28', review_state: null, announced_at: null, superseded_at: null });
FILES.push({ id: fid++, kind: 'upload', filename: 'IMG_1002.jpg', bytes: 2_500_000, product_key: 'p2', shot: null, created_at: '2026-07-28', review_state: null, announced_at: null, superseded_at: null });

/* Verzonnen, en met opzet niet zoals een echte klant schrijft: één korte en één
   die over drie alinea's gaat, zodat de opmaak van allebei te beoordelen is. Geen
   echte bedrijfsnaam en geen echt adres — zie de regel daarover in FigDash.astro. */
const TESTIMONIALS = [
  {
    order_id: 90, ref: 'VIS-2607-9920', brand: 'VOLT', service: 'catalog', lang: 'nl',
    testimonial_text: 'Binnen vier dagen stonden er twaalf producten online die er eindelijk bij elkaar uitzien.',
    testimonial_name: 'Mara', testimonial_approved: 0,
    updated_at: '2026-08-09 11:12', asked_at: '2026-08-08', email: 'studio@voorbeeldmerk.nl',
    closed_at: '2026-08-08',
  },
  {
    order_id: 89, ref: 'VIS-2607-3312', brand: 'NOORD', service: 'lifestyle', lang: 'nl',
    testimonial_text: 'We hadden al een fotograaf en die blijven we houden voor de campagnes.\n\nWaar dit het verschil maakte is de lange staart: dertig artikelen die het budget van een shoot nooit gaan halen, en die er nu wel netjes bij staan.\n\nDe achtergrond klopte meteen met wat er al stond, dat scheelde het meeste werk.',
    testimonial_name: 'Joris', testimonial_approved: 1,
    updated_at: '2026-08-04 16:40', asked_at: '2026-08-03', email: 'inkoop@voorbeeldmerk.nl',
    closed_at: '2026-08-03',
  },
];

function makeEnv() {
  const pick = (sql) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM admin_sessions') || s.includes('FROM admin_users')) {
      return { admin_id: 1, id: 1, email: 'hello@visuails.com', expires_at: '2099-01-01' };
    }
    if (s.includes('FROM rate_limits')) return null;
    /* De aanbevelingen — 14 augustus 2026. Twee rijen en niet één: het scherm
       splitst op "wacht op je" en "goedgekeurd", en met alleen een wachtende rij
       is de helft van de opmaak op de schermafdruk niet te zien. Zie de kop van
       renderTestimonials() in src/lib/admin.js. */
    if (s.includes('FROM order_feedback f')) return TESTIMONIALS;
    if (s.includes('SELECT status, COUNT(*)')) return [{ status: 'delivered', n: 41 }];
    if (s.includes('COUNT(*) AS n')) return { n: 2 };
    if (s.includes('FROM files WHERE order_id')) return FILES;
    if (s.includes('FROM custom_models')) return [];
    if (s.includes('FROM customer_style_locks')) return [];
    if (s.includes('FROM orders WHERE id')) return ORDER;
    if (s.includes('FROM orders')) return [ORDER];
    if (s.includes("review_state = 'revision_requested'")) return [];
    return null;
  };
  const DB = {
    prepare(sql) {
      const st = {
        bind() { return st; },
        async first() { const r = pick(sql); return Array.isArray(r) ? r[0] : r; },
        async all() { const r = pick(sql); return { results: Array.isArray(r) ? r : (r ? [r] : []) }; },
        async run() { return { success: true }; },
      };
      return st;
    },
    async batch(list) { return list.map(() => ({ success: true })); },
  };
  return { DB };
}

const PHOTOS = fs.readdirSync(path.join(ROOT, 'public/img'))
  .filter((f) => /^(banners|lifestyle|custom-models|catalog)/.test(f) && /\.webp$/.test(f))
  .sort()
  .map((f) => path.join(ROOT, 'public/img', f));

const token = await mintToken();
const request = new Request(`https://visuails.com${SECTION}`, { headers: { cookie: `vis_admin=${token}` } });
const res = await adminGet({ request, env: makeEnv(), waitUntil() {} });
const body = await res.text();

/* ── WELKE CHROME — 26 augustus 2026 ─────────────────────────────────────────
   Hier stond een hard pad naar /opt/pw-browsers. Dat is de map van de
   Linux-container waarin dit project ook wordt gebouwd, en op Lucas' machine
   bestaat /opt niet eens: dit script viel daar dus om nog voordat het iets deed.
   scripts/lib/browserpad.mjs bestaat precies hiervoor en waarschuwt er in zijn
   eigen noot voor — hij werd alleen door één script gebruikt. */
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
const context = await browser.newContext();
await context.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  if (u.pathname.endsWith('.css')) {
    const file = path.join(ROOT, 'public', u.pathname.replace(/^\//, ''));
    if (fs.existsSync(file)) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(file) });
  }
  const m = /^\/admin\/files\/(\d+)$/.exec(u.pathname);
  if (m) return route.fulfill({ contentType: 'image/webp', body: fs.readFileSync(PHOTOS[Number(m[1]) % PHOTOS.length]) });
  if (u.pathname === '/__page') return route.fulfill({ contentType: 'text/html', body });
  return route.fulfill({ status: 204, body: '' });
});

const page = await context.newPage();
await page.setViewportSize({ width: 1280, height: 2000 });
await page.goto('https://visuails.com/__page', { waitUntil: 'networkidle' });
await page.setViewportSize({ width: 1280, height: 900 });
const slug = SECTION.replace(/\W+/g, '-').replace(/^-|-$/g, '');
const file = path.join(OUT, `${slug}.png`);
await page.screenshot({ path: file, fullPage: true });
await browser.close();
console.log(`  .render/${path.basename(file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} kB`);
