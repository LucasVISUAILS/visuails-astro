/* De maandset in Studio, in beeld — 4 september 2026.
   Echte schema + echte accountGet, een abonnee met een gepubliceerde set.
     node kladblok/maandset-proef.mjs → kladblok/eigen-look/studio-maandset-*.png */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { d1, verseDb } from '../tests/lib/d1sqlite.mjs';
import { accountGet } from '../src/lib/account.js';
import { hashToken } from '../src/lib/token.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'kladblok', 'eigen-look');
fs.mkdirSync(OUT, { recursive: true });
const { db } = verseDb(new URL('../schema.sql', import.meta.url));
db.prepare("INSERT INTO customers (id, email, brand, name, country) VALUES (1, 'studio@voorbeeld-volt.nl', 'VOLT', 'Mara Visser', 'NL')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day) VALUES (1, 1, 'SUB-VOLT', 'studio', 'monthly', 'active', 3)`).run();
db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken('t'));
const m = new Date().toISOString().slice(0, 7);
const vorige = new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 7);
db.prepare(`INSERT INTO shared_sets (id, month, title, published_at) VALUES (1, ?, 'Nazomer', datetime('now'))`).run(m);
db.prepare(`INSERT INTO shared_sets (id, month, title, published_at) VALUES (2, ?, NULL, datetime('now'))`).run(vorige);
for (let i = 1; i <= 20; i++) db.prepare(`INSERT INTO shared_files (set_id, r2_key, filename, bytes, content_type) VALUES (1, ?, ?, 900000, 'image/webp')`).run(`shared/${m}/${i}.webp`, `set-${i}.webp`);
for (let i = 1; i <= 20; i++) db.prepare(`INSERT INTO shared_files (set_id, r2_key, filename, bytes, content_type) VALUES (2, ?, ?, 900000, 'image/webp')`).run(`shared/${vorige}/${i}.webp`, `set-${i}.webp`);
const env = { DB: d1(db) };

const BEELDEN = ['brand-knit', 'brand-stair', 'brand-pool', 'brand-rest'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const w of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    const file = path.join(ROOT, 'public', u.pathname.replace(/^\//, ''));
    if (/\.(css|woff2?|svg|png|webp)$/.test(u.pathname) && fs.existsSync(file)) {
      return route.fulfill({ contentType: u.pathname.endsWith('.css') ? 'text/css' : u.pathname.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream', body: fs.readFileSync(file) });
    }
    const setImg = u.pathname.match(/^\/account\/set\/(\d+)\/f$/);
    if (setImg) return route.fulfill({ contentType: 'image/webp', body: fs.readFileSync(path.join(ROOT, `public/img/${BEELDEN[Number(setImg[1]) % 4]}-w380.webp`)) });
    return route.fulfill({ status: 204, body: '' });
  });
  const res = await accountGet({ request: new Request('https://visuails.com/account/plan', { headers: { cookie: 't=1; vis_account=t; vis_lang=nl' } }), env, waitUntil() {} });
  const body = await res.text();
  const page = await ctx.newPage();
  await page.route('**/__page*', (r) => r.fulfill({ contentType: 'text/html', body }));
  await page.goto('https://visuails.com/__page', { waitUntil: 'networkidle' });
  const el = await page.$('.ms-card');
  if (el) await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `studio-maandset-${w}.png`), fullPage: true });
  console.log(`${res.status} /account/plan @${w} → kladblok/eigen-look/studio-maandset-${w}.png  kaart: ${!!el}`);
  await ctx.close();
}
await browser.close();
