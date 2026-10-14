// admin-kiek.mjs <uitmap> <breedte> [pad…] — /admin met voorbeelddata (zelfde zaad als tests/nu-doen-browser), licht en donker, uit dist/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { d1, verseDb } from '../tests/lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const [UIT, W = '1440', ...PADEN] = process.argv.slice(2);
globalThis.fetch = async () => new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
const { db } = verseDb(new URL('../schema.sql', import.meta.url));
const env = { DB: d1(db), PUBLIC_ORIGIN: 'https://visuails.com' };
db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES
    (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL'),
    (2, 'lena@muster-mode.test', 'Lena Muster', 'MUSTER MODE', '+49 151 23456789', 'DE');
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone, total_cents, vat_cents, lang, product_count, payment_status, country, review_state, created_at, paid_at, window_start, delivered_at, delivery_mailed_at, closed_at) VALUES
    (31, 'VIS-ND-0031', 1, 'catalog', 'received', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'unpaid', 'NL', 'pending', datetime('now','-5 hours'), NULL, NULL, NULL, NULL, NULL),
    (32, 'VIS-ND-0032', 1, 'catalog', 'human_check', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-6 days'), datetime('now','-6 days'), NULL, NULL, NULL, NULL),
    (33, 'VIS-ND-0033', 2, 'catalog', 'delivered', 'Lena Muster', 'MUSTER MODE', 'lena@muster-mode.test', '+49 151 23456789', 10000, 0, 'en', 2, 'paid', 'DE', 'approved', datetime('now','-9 days'), datetime('now','-9 days'), NULL, datetime('now','-4 days'), datetime('now','-4 days'), NULL),
    (35, 'VIS-ND-0035', 2, 'catalog', 'delivered', 'Lena Muster', 'MUSTER MODE', 'lena@muster-mode.test', '+49 151 23456789', 10000, 0, 'en', 1, 'paid', 'DE', 'approved', datetime('now','-8 days'), datetime('now','-8 days'), NULL, datetime('now','-4 days'), datetime('now','-4 days'), NULL),
    (36, 'VIS-ND-0036', 1, 'catalog', 'received', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-50 hours'), datetime('now','-50 hours'), NULL, NULL, NULL, NULL),
    (37, 'VIS-ND-0037', 1, 'catalog', 'received', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-1 hours'), datetime('now','-1 hours'), '2026-10-20', NULL, NULL, NULL);
  INSERT INTO files (id, order_id, kind, r2_key, product_key, shot, review_state, reviewed_at, announced_at, superseded_at, created_at) VALUES
    (350, 35, 'delivery', 'lever/35/a.jpg', 'p1', 'front', 'revision_requested', datetime('now','-3 days'), datetime('now','-4 days'), NULL, datetime('now','-4 days')),
    (360, 36, 'upload', 'intake/36/front.jpg', 'p1', 'front', 'pending', NULL, NULL, NULL, datetime('now','-50 hours'));
  INSERT INTO revision_requests (file_id, order_id, customer_id, note, created_at, resolved_at, resolution_note) VALUES
    (350, 35, 2, 'The sleeve looks too short on this one', datetime('now','-3 days'), NULL, NULL);`);
const token = await mintToken();
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(token));
const html = async (pad, donker) => (await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `${process.env.KIEK_UIT ? "x=1" : `vis_admin=${token}`}${donker ? '; vis_thema=donker' : ''}` } }), env, waitUntil() {} })).text();
const paden = PADEN.length ? PADEN : ['/admin', '/admin/customers', '/admin/planning', '/admin/orders/36/files', '/admin/vat', '/admin/diagnose'];
const vooraf = new Map();
for (const donker of [false, true]) for (const p of paden) vooraf.set(`${donker ? '/d' : '/l'}${p}`, await html(p, donker));
const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]);
  if (vooraf.has(p)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(vooraf.get(p)); }
  const f = path.join(DIST, p);
  if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); return res.end(fs.readFileSync(f)); }
  res.writeHead(404); return res.end('');
});
await new Promise((r) => server.listen(0, r));
fs.mkdirSync(UIT, { recursive: true });
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await br.newContext({ viewport: { width: Number(W), height: 900 } });
const page = await ctx.newPage();
for (const k of vooraf.keys()) {
  await page.goto(`http://127.0.0.1:${server.address().port}${k}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const naam = `${k.slice(1, 2)}-${k.slice(2).replace(/\//g, '_') || 'x'}-${W}`;
  await page.screenshot({ path: path.join(UIT, `${naam}.png`) });
  if (process.env.KIEK_OPEN) await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  if (process.env.KIEK_OPEN) { const el = await page.$('.pl-verleng'); if (el) { await page.waitForTimeout(300); await el.screenshot({ path: path.join(UIT, `${naam}-verleng.png`) }); } }
  const c = await page.evaluate(() => {
    const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const grond = (el) => { const lagen = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { lagen.push(c); if (c.a >= 1) break; } } let g = { r: 255, g: 255, b: 255, a: 1 }; if (document.documentElement.dataset.thema === 'donker' && !lagen.some((l) => l.a >= 1)) g = { r: 0, g: 0, b: 0, a: 1 }; for (const l of lagen.reverse()) g = over(l, g); return g; };
    const slecht = [];
    for (const el of document.querySelectorAll('body *')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const dicht = el.closest('details:not([open])'); if (dicht && !el.closest('summary')) continue; // een dichte <details> rendert zijn inhoud niet
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const t = rgba(cs.color); if (!t) continue;
      const g = grond(el); const k = ratio(over(t, g), g); const px = parseFloat(cs.fontSize); const norm = px >= 24 || (Number(cs.fontWeight) >= 700 && px >= 18.66) ? 3 : 4.5;
      if (k < norm || px < 11.5) slecht.push(`${k.toFixed(2)} ${px}px ${String(el.className).slice(0, 30)} "${el.textContent.trim().slice(0, 30)}"`);
    }
    return slecht;
  });
  console.log(naam, c.length ? c.slice(0, 6).join(' | ') : 'ok');
  if (process.env.KIEK_TEKST) console.log('  ', await page.evaluate((t) => [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.textContent.includes(t)).slice(0, 4).map((e) => { const cs = getComputedStyle(e); const keten = []; for (let x = e; x && x !== document.body; x = x.parentElement) keten.push(x.tagName.toLowerCase() + (x.className ? '.' + String(x.className).split(' ')[0] : '')); return `${e.tagName}.${e.className} color=${cs.color} bg=${cs.backgroundColor} accent=${cs.getPropertyValue('--accent')} ink=${cs.getPropertyValue('--ink')} keten=${keten.join('<')}`; }).join(' | '), process.env.KIEK_TEKST));
}
await br.close(); server.close();
