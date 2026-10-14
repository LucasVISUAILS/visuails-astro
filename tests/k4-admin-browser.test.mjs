/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * A4 · K4 — DE BESTELPAGINA IN /admin IN EEN ECHTE BROWSER (licht en donker)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wat 4.02 en 4.01 op het bord zetten, op 1280 en 390 px, licht en donker:
 *   · stap 1 van "Het werk erin zetten": "De werkmap — met N foto's van de klant
 *     (X MB)" en de link "zonder foto's";
 *   · per beeld de chip "AI-tag" of "geen AI-tag", en het formaat als het geen jpg is;
 *   · de regel na een upload in een vak: "Dit beeld is png. …".
 * Contrast minstens 4,5:1 en tekst minstens 11,5 px; geen horizontale schuif.
 * Schermafdrukken in .render/ (k4-*.png).
 *
 * Start een server op een vaste poort en een browser: draaien via zwaar.sh.
 * Verzonnen merk, verzonnen adres.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0);
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (81, 'bord@voorbeeldmerk.test', 'Iris Smit', 'Voorbeeldmerk', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, details_json, payment_status, country)
    VALUES (801, 'VIS-TEST-0801', 81, 'catalog', 'in_production', 'Iris Smit', 'Voorbeeldmerk', 'bord@voorbeeldmerk.test', 12000, 'nl', 1,
            '{"product_p1":"Hoodie","garment_p1":"top"}', 'paid', 'NL');
  INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot, ai_tag) VALUES
    (801, 'upload', 'intake/k4/1.jpg', 'IMG_1.JPG', 4200000, 'p1', 'front', NULL),
    (801, 'upload', 'intake/k4/2.jpg', 'IMG_2.JPG', 3900000, 'p1', 'back', NULL),
    (801, 'delivery', 'delivery/VIS-TEST-0801/p1-front-a.jpg', 'VIS-TEST-0801-p1-voorkant.jpg', 900000, 'p1', 'front', 1),
    (801, 'delivery', 'delivery/VIS-TEST-0801/p1-back-b.png', 'VIS-TEST-0801-p1-achterkant.png', 2900000, 'p1', 'back', 1),
    (801, 'delivery', 'delivery/VIS-TEST-0801/p1-detail-c.webp', 'VIS-TEST-0801-p1-detail.webp', 400000, 'p1', 'detail', 0);
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const token = await mintToken();
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(token));
const env = { DB: d1(db), UPLOADS: { async get() { return null; }, async put() {}, async list() { return { objects: [] }; } } };
const admin = async (pad, donker) => (await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}${donker ? '; vis_thema=donker' : ''}` } }), env, waitUntil() {} })).text();

const PAD = '/admin/orders/801/files?geupload=1&formaat=png';
const vooraf = new Map();
for (const donker of [false, true]) vooraf.set(`${donker ? '/donker' : ''}${PAD.split('?')[0]}`, await admin(PAD, donker));
ok('de pagina heeft de chips en de werkmapregel', /AI-tag/.test(vooraf.get(PAD.split('?')[0])) && /met 2 foto&rsquo;s van de klant \(8 MB\)/.test(vooraf.get(PAD.split('?')[0])));

const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const PORT = 4352;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]).replace(/\/+$/, '') || '/';
  if (vooraf.has(p)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(vooraf.get(p)); }
  const f = path.join(PUB, p);
  if (f.startsWith(PUB) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    return res.end(fs.readFileSync(f));
  }
  res.writeHead(404); return res.end('niet gevonden');
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });

const leesbaar = (page, sel) => page.evaluate((s) => {
  const lijst = [...document.querySelectorAll(s)].filter((el) => !el.hidden && el.getClientRects().length);
  if (!lijst.length) return null;
  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  let slechtst = { ratio: 99, px: 99 };
  for (const el of lijst) {
    let bg = [255, 255, 255, 1];
    for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { bg = b; break; } }
    const fg = rgba(getComputedStyle(el).color);
    const mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [lum(mix), lum(bg.slice(0, 3))];
    const ratio = Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
    const px = parseFloat(getComputedStyle(el).fontSize);
    slechtst = { ratio: Math.min(slechtst.ratio, ratio), px: Math.min(slechtst.px, px) };
  }
  return slechtst;
}, sel);

try {
  for (const breed of [1280, 390]) {
    for (const donker of [false, true]) {
      const tag = `${breed}px ${donker ? 'donker' : 'licht'}`;
      const page = await browser.newPage({ viewport: { width: breed, height: 1000 } });
      await page.goto(`http://localhost:${PORT}${donker ? '/donker' : ''}${PAD.split('?')[0]}`);
      for (const sel of ['.slot-tags .or-let.is-stil', '.slot-tags .or-let:not(.is-stil)', '.werk .werk-label', '.werk .werk-alt', '.okline + .warnline, .warnline']) {
        const l = await leesbaar(page, sel);
        ok(`${tag}: ${sel} contrast ≥ 4,5 (${l && l.ratio}) en tekst ≥ 11,5 px (${l && l.px})`, !!l && l.ratio >= 4.5 && l.px >= 11.5);
      }
      ok(`${tag}: geen horizontale schuif`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      const chips = await page.$$eval('.slot-tags', (els) => els.map((e) => e.textContent.trim()));
      ok(`${tag}: chips per beeld (AI-tag · AI-tag png · geen AI-tag webp)`, chips.join(' | ') === 'AI-tag | AI-tagpng | geen AI-tagwebp', chips.join(' | '));
      const werk = await page.$('.werk');
      if (werk) await werk.screenshot({ path: path.join(OUT, `k4-werk-${breed}-${donker ? 'donker' : 'licht'}.png`) });
      const bord = await page.$('#p1');
      if (bord) await bord.screenshot({ path: path.join(OUT, `k4-bord-${breed}-${donker ? 'donker' : 'licht'}.png`) });
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
