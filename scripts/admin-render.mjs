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

function makeEnv() {
  const pick = (sql) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM admin_sessions') || s.includes('FROM admin_users')) {
      return { admin_id: 1, id: 1, email: 'hello@visuails.com', expires_at: '2099-01-01' };
    }
    if (s.includes('FROM rate_limits')) return null;
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

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
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
