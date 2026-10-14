/*
 * RONDE A4 · D4 IN EEN ECHTE BROWSER — 8 oktober 2026 (4.05, 4.08)
 *
 * Op 390 en 1280 px, licht en donker:
 *   · het dashboard vol (de Nu-doen-lijst bovenaan, één knop per regel) en leeg
 *     ("Niets wacht op jou");
 *   · een bestelpagina met "Volgende stap: …";
 *   · een open revisiekaart (taalregel, drie vaste redenen, het tekstvak, ook
 *     met een gekozen reden) en een afgehandelde kaart met "N nieuwe beelden
 *     melden".
 * Contrast ≥ 4,5:1 en tekst ≥ 11,5 px op alles wat nieuw is; geen horizontale
 * schuifbalk op 390 px. Schermafdrukken in .render/a4-d4-*.png.
 *
 * Zwaar (browser): $S/zwaar.sh node tests/nu-doen-browser.test.mjs — geen build nodig.
 * Verzonnen merken en adressen; niets hiervan bestaat.
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
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(80)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

globalThis.fetch = async () => new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });

async function maakEnv(vul) {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  ok('het schema laadt', mislukt.length, 0);
  const env = { DB: d1(db), PUBLIC_ORIGIN: 'https://visuails.com' };
  db.exec(`
    INSERT INTO customers (id, email, name, brand, phone, country) VALUES
      (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL'),
      (2, 'lena@muster-mode.test', 'Lena Muster', 'MUSTER MODE', '+49 151 23456789', 'DE');
    INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');`);
  if (vul) {
    db.exec(`
    INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone, total_cents, vat_cents, lang, product_count, payment_status, country, review_state, created_at, paid_at, window_start, delivered_at, delivery_mailed_at, closed_at) VALUES
      (31, 'VIS-ND-0031', 1, 'catalog', 'received', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'unpaid', 'NL', 'pending', datetime('now','-5 hours'), NULL, NULL, NULL, NULL, NULL),
      (32, 'VIS-ND-0032', 1, 'catalog', 'human_check', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-6 days'), datetime('now','-6 days'), NULL, NULL, NULL, NULL),
      (33, 'VIS-ND-0033', 2, 'catalog', 'delivered', 'Lena Muster', 'MUSTER MODE', 'lena@muster-mode.test', '+49 151 23456789', 10000, 0, 'en', 2, 'paid', 'DE', 'approved', datetime('now','-9 days'), datetime('now','-9 days'), NULL, datetime('now','-4 days'), datetime('now','-4 days'), NULL),
      (35, 'VIS-ND-0035', 2, 'catalog', 'delivered', 'Lena Muster', 'MUSTER MODE', 'lena@muster-mode.test', '+49 151 23456789', 10000, 0, 'en', 1, 'paid', 'DE', 'approved', datetime('now','-8 days'), datetime('now','-8 days'), NULL, datetime('now','-4 days'), datetime('now','-4 days'), NULL),
      (36, 'VIS-ND-0036', 1, 'catalog', 'received', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-50 hours'), datetime('now','-50 hours'), NULL, NULL, NULL, NULL),
      (37, 'VIS-ND-0037', 1, 'catalog', 'received', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-1 hours'), datetime('now','-1 hours'), '2026-10-20', NULL, NULL, NULL),
      (40, 'VIS-ND-0040', 1, 'custom', 'received', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 0, 0, 'nl', 0, 'unpaid', 'NL', NULL, datetime('now','-2 days'), NULL, NULL, NULL, NULL, NULL),
      (41, 'VIS-ND-0041', 1, 'catalog', 'delivered', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-20 days'), datetime('now','-20 days'), NULL, datetime('now','-10 days'), datetime('now','-10 days'), datetime('now','-2 hours'));
    INSERT INTO files (id, order_id, kind, r2_key, product_key, shot, review_state, reviewed_at, announced_at, superseded_at, created_at) VALUES
      (330, 33, 'delivery', 'lever/33/oud.jpg', 'p1', 'front', 'revision_requested', datetime('now','-2 days'), datetime('now','-4 days'), datetime('now','-1 days'), datetime('now','-4 days')),
      (331, 33, 'delivery', 'lever/33/a.jpg', 'p1', 'front', 'pending', NULL, NULL, NULL, datetime('now','-20 hours')),
      (332, 33, 'delivery', 'lever/33/b.jpg', 'p2', 'back', 'pending', NULL, datetime('now','-4 days'), NULL, datetime('now','-4 days')),
      (333, 33, 'delivery', 'lever/33/c.jpg', 'p2', 'front', 'pending', NULL, NULL, NULL, datetime('now','-19 hours')),
      (350, 35, 'delivery', 'lever/35/a.jpg', 'p1', 'front', 'revision_requested', datetime('now','-3 days'), datetime('now','-4 days'), NULL, datetime('now','-4 days')),
      (360, 36, 'upload', 'intake/36/front.jpg', 'p1', 'front', 'pending', NULL, NULL, NULL, datetime('now','-50 hours'));
    INSERT INTO revision_requests (file_id, order_id, customer_id, note, created_at, resolved_at, resolution_note) VALUES
      (330, 33, 2, 'The colour is off', datetime('now','-2 days'), NULL, NULL),
      (332, 33, 2, 'Label visible', datetime('now','-2 days'), datetime('now','-1 hours'), 'The label is part of the product and stays visible.'),
      (350, 35, 2, 'The sleeve looks too short on this one', datetime('now','-3 days'), NULL, NULL);
    UPDATE files SET review_note = 'The sleeve looks too short on this one' WHERE id = 350;`);
  }
  const token = await mintToken();
  db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(token));
  return async (pad, donker) => {
    const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}${donker ? '; vis_thema=donker' : ''}` } }), env, waitUntil() {} });
    return res.text();
  };
}

const vol = await maakEnv(true);
const leeg = await maakEnv(false);
const vooraf = new Map();
for (const donker of [false, true]) {
  const pre = donker ? '/donker' : '';
  vooraf.set(`${pre}/admin`, await vol('/admin', donker));
  vooraf.set(`${pre}/admin/reden`, await vol('/admin?reden=350.keuze', donker));
  vooraf.set(`${pre}/admin/leeg`, await leeg('/admin', donker));
  vooraf.set(`${pre}/admin/orders/36/files`, await vol('/admin/orders/36/files', donker));
}

const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const PORT = 4298;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]).replace(/\/+$/, '') || '/';
  if (vooraf.has(p)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(vooraf.get(p)); }
  const f = path.join(PUB, p);
  if (f.startsWith(PUB) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    return res.end(fs.readFileSync(f));
  }
  /* Beelden uit R2 bestaan hier niet; een 404 is genoeg. */
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
async function leesbaarOk(page, sel, label) {
  const l = await leesbaar(page, sel);
  if (!l) { ok(`${label}: ${sel} is te zien`, false); return; }
  ok(`${label}: contrast ≥ 4,5 (${l.ratio}) en tekst ≥ 11,5 px (${l.px})`, l.ratio >= 4.5 && l.px >= 11.5);
}
const geenSchuif = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const foto = async (page, sel, naam) => {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: path.join(OUT, `a4-d4-${naam}.png`) });
};

for (const breed of [390, 1280]) {
  for (const donker of [false, true]) {
    const stand = donker ? 'donker' : 'licht';
    const tag = `${breed}px ${stand}`;
    const pre = donker ? '/donker' : '';
    const page = await browser.newPage({ viewport: { width: breed, height: 900 } });

    /* ── het dashboard, vol ── */
    await page.goto(`http://localhost:${PORT}${pre}/admin`, { waitUntil: 'load' });
    ok(`${tag} dashboard: het thema klopt`, await page.evaluate(() => document.documentElement.dataset.thema || 'licht'), donker ? 'donker' : 'licht');
    const regels = await page.locator('.nd-regel').count();
    ok(`${tag} Nu doen: regels te zien`, regels >= 7, true);
    ok(`${tag} Nu doen: één knop per regel`, await page.evaluate(() => [...document.querySelectorAll('.nd-regel')].every((li) => li.querySelectorAll('a, button').length === 1)), true);
    ok(`${tag} Nu doen staat boven de tegels`, await page.evaluate(() => {
      const a = document.querySelector('#nu-doen'); const b = document.querySelector('.stats');
      return Boolean(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
    }), true);
    await leesbaarOk(page, '.nd-soort', `${tag} Nu doen: soort`);
    await leesbaarOk(page, '.nd-wat .ref, .nd-wie', `${tag} Nu doen: referentie en klant`);
    await leesbaarOk(page, '.nd-wat .meta', `${tag} Nu doen: wat`);
    await leesbaarOk(page, '.nd-regel .btn', `${tag} Nu doen: knoppen`);
    ok(`${tag} dashboard: geen schuifbalk opzij`, await geenSchuif(page));
    ok(`${tag} Nu doen: de knop valt binnen het scherm`, await page.evaluate(() => [...document.querySelectorAll('.nd-regel .btn')].every((b) => b.getBoundingClientRect().right <= window.innerWidth + 1)), true);
    await foto(page, '#nu-doen', `nudoen-${breed}-${stand}`);

    /* ── de revisiekaarten ── */
    await leesbaarOk(page, '#rev-350 .rev-taal', `${tag} revisiekaart: taalregel`);
    await leesbaarOk(page, '#rev-350 .rev-redenen .fl-chip, #rev-350 .rev-redenen .meta', `${tag} revisiekaart: vaste redenen`);
    await leesbaarOk(page, '#rev-350 .rev-label', `${tag} revisiekaart: uitleg bij het veld`);
    await leesbaarOk(page, '#rev-350 textarea', `${tag} revisiekaart: het tekstvak`);
    ok(`${tag} revisiekaart: de taalregel zegt Engels`, (await page.locator('#rev-350 .rev-taal').innerText()).trim(), 'Deze klant leest Engels — schrijf je reden in het Engels.');
    await foto(page, '#rev-350', `revisiekaart-${breed}-${stand}`);
    await leesbaarOk(page, '#rev-o33 .rev-af-lijst li', `${tag} afgehandelde kaart: per beeld`);
    await leesbaarOk(page, '#rev-o33 .btn', `${tag} afgehandelde kaart: meldknop`);
    await leesbaarOk(page, '#rev-o33 .rev-taal, #rev-o33 > .meta', `${tag} afgehandelde kaart: taal en uitleg`);
    ok(`${tag} afgehandelde kaart: "2 nieuwe beelden melden"`, (await page.locator('#rev-o33 button').innerText()).trim(), '2 nieuwe beelden melden');
    await foto(page, '#rev-o33', `afgehandeld-${breed}-${stand}`);

    /* ── een gekozen reden ── */
    await page.goto(`http://localhost:${PORT}${pre}/admin/reden`, { waitUntil: 'load' });
    ok(`${tag} gekozen reden staat in het veld (Engels)`, /^The image follows the choices/.test(await page.locator('#fixed-350').inputValue()), true);
    await leesbaarOk(page, '#rev-350 textarea', `${tag} gekozen reden: het tekstvak`);
    await foto(page, '#rev-350', `reden-gekozen-${breed}-${stand}`);

    /* ── het dashboard, leeg ── */
    await page.goto(`http://localhost:${PORT}${pre}/admin/leeg`, { waitUntil: 'load' });
    ok(`${tag} leeg: "Niets wacht op jou."`, /^Niets wacht op jou\. Nieuwe bestellingen komen hier vanzelf bij\.$/.test((await page.locator('.nd-leeg').innerText()).trim()), true);
    await leesbaarOk(page, '.nd-leeg, .nd-leeg strong', `${tag} leeg`);
    ok(`${tag} leeg: geen schuifbalk opzij`, await geenSchuif(page));
    await foto(page, '#nu-doen', `leeg-${breed}-${stand}`);

    /* ── de bestelpagina ── */
    await page.goto(`http://localhost:${PORT}${pre}/admin/orders/36/files`, { waitUntil: 'load' });
    ok(`${tag} bestelpagina: "Volgende stap:" direct onder de referentie`, await page.evaluate(() => document.querySelector('h1')?.nextElementSibling?.classList.contains('volgende-stap')), true);
    await leesbaarOk(page, '.volgende-stap p, .volgende-stap strong, .volgende-stap .meta', `${tag} Volgende stap: tekst`);
    await leesbaarOk(page, '.volgende-stap .btn', `${tag} Volgende stap: knop`);
    ok(`${tag} bestelpagina: geen schuifbalk opzij`, await geenSchuif(page));
    await foto(page, '.volgende-stap', `volgende-stap-${breed}-${stand}`);
    await page.close();
  }
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
