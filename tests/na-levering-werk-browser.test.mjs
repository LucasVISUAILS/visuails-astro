/*
 * RONDE A3 · W3 IN EEN ECHTE BROWSER — 8 oktober 2026 (3.03, 7.05, 3.06, 5.03)
 *
 * Wat nieuw is, op 390 en 1280 px, licht en donker:
 *   · /admin: de bestelpagina met "Betaling staat open · dag N van 14" en
 *     Bel/App/Mail, de rode regel "mail kwam niet aan" met knoppen, de knop
 *     "Vraag om een review via WhatsApp" en de grijze stand met datum, de kleur
 *     met kleurvlakje in de brief, en de zijkolom "wacht op betaling";
 *   · de studiomails (betaling niet gelukt, incasso niet gelukt, nieuwe
 *     bestelling met foto's die ontbreken) en het nachtrapport;
 *   · het formulier: stap 2 (het kleurveld met vlakje) en stap 3 (de tekst
 *     onder het telefoonveld).
 * Contrast ≥ 4,5:1 en tekst ≥ 11,5 px op alles wat nieuw is; geen horizontale
 * schuifbalk op 390 px. Schermafdrukken in .render/a3-w3-*.png.
 *
 * Zwaar (browser): $S/zwaar.sh node tests/na-levering-werk-browser.test.mjs — na een build.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import http from 'node:http';
import { metVisIn } from './lib/vis-in.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { notifyPaymentFailed, notifySubscriptionFailed } from '../src/lib/notify.js';
import { tasks } from '../cron/index.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { VERVAL_DAG } from '../src/data/termijnen.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
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

/* ── DE DATA EN DE ADMINPAGINA'S, VOORAF GERENDERD ─────────────────────── */
const mailsGezien = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) mailsGezien.push(JSON.parse(String(opts.body || '{}')));
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const env = { DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
db.exec(`
  INSERT INTO customers (id, email, name, first_name, brand, phone, country) VALUES
    (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'Sanne', 'VOLT', '06 12345678', 'NL'),
    (2, 'lena@muster-mode.test', 'Lena Muster', 'Lena', 'MUSTER MODE', '0151 23456789', 'DE');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone, total_cents, vat_cents, lang, product_count, payment_status, country, created_at, delivered_at, delivery_mailed_at, closed_at, details_json)
    VALUES (11, 'VIS-TEST-0011', 1, 'catalog', 'received', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'unpaid', 'NL', datetime('now', '-4 days'), NULL, NULL, NULL, '{"product_p1":"Hoodie zwart","colour_p1":"bosgroen, #1B3A2F","material_p1":"zware fleece"}'),
           (12, 'VIS-TEST-0012', 2, 'catalog', 'received', 'Lena Muster', 'MUSTER MODE', 'lena@muster-mode.test', '0151 23456789', 10000, 0, 'en', 2, 'unpaid', 'DE', datetime('now', '-1 days'), NULL, NULL, NULL, '{}'),
           (13, 'VIS-TEST-0013', 1, 'catalog', 'delivered', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid', 'NL', datetime('now', '-12 days'), datetime('now', '-10 days'), datetime('now', '-10 days'), datetime('now', '-3 hours'), '{}'),
           (14, 'VIS-TEST-0014', 2, 'catalog', 'delivered', 'Lena Muster', 'MUSTER MODE', 'lena@muster-mode.test', '0151 23456789', 10000, 0, 'en', 1, 'paid', 'DE', datetime('now', '-12 days'), datetime('now', '-10 days'), datetime('now', '-10 days'), datetime('now', '-2 days'), '{}');
  INSERT INTO files (order_id, kind, r2_key, filename, product_key, shot) VALUES
    (11, 'upload', 'intake/x/p1-voor.jpg', 'p1-voor.jpg', 'p1', 'front'),
    (11, 'upload', 'intake/x/p1-detail.jpg', 'p1-detail.jpg', 'p1', 'detail');
  INSERT INTO order_events (order_id, status, note, actor) VALUES (14, 'delivered', 'Review gevraagd via WhatsApp', 'intern');
  INSERT INTO mail_bounces (event_id, email, kind, bounce_type, occurred_at) VALUES ('ev_1', 'lena@muster-mode.test', 'bounced', 'Permanent', datetime('now', '-2 hours'));
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const adminToken = await mintToken();
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const admin = async (pad, donker) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}${donker ? '; vis_thema=donker' : ''}` } }), env, waitUntil() {} });
  return res.text();
};
const PAGINAS = ['/admin', '/admin/orders/11/files', '/admin/orders/12/files', '/admin/orders/13/files', '/admin/orders/14/files'];
const vooraf = new Map();
for (const p of PAGINAS) for (const donker of [false, true]) vooraf.set(`${donker ? '/donker' : ''}${p}`, await admin(p, donker));

/* De studiomails en het nachtrapport. */
await notifyPaymentFailed(env, 11, 'expired');
await notifySubscriptionFailed(env, { subRef: 'ABO-TEST-1', plan: 'Studio', brand: 'MUSTER MODE', email: 'lena@muster-mode.test', reason: 'failed' });
const nacht = [await tasks.mailNietAan(env), await tasks.afgerondGisteren(env)].filter(Boolean);
fs.writeFileSync(path.join(OUT, 'a3-w3-nachtrapport.txt'), `Wat er gebeurd is:\n${nacht.map((r) => `  · ${r}`).join('\n')}\n`);
ok('nachtrapport: "Mail kwam niet aan" en "Afgerond gisteren"', nacht.length, 2);
globalThis.fetch = echteFetch;

/* ── DE SERVER ──────────────────────────────────────────────────────────── */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const heeftDist = fs.existsSync(path.join(DIST, 'nl/start/catalog/index.html'));
const PORT = 4297;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]).replace(/\/+$/, '') || '/';
  if (vooraf.has(p)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(vooraf.get(p)); }
  for (const basis of [DIST, PUB]) {
    let f = path.join(basis, p);
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (f.startsWith(basis) && fs.existsSync(f)) {
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      return res.end(fs.readFileSync(f));
    }
  }
  res.writeHead(404); return res.end('niet gevonden');
});
await new Promise((r) => server.listen(PORT, r));
const browser = metVisIn(await chromium.launch({ executablePath: process.env.CHROME || browserPad() }));

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
  ok(`${label}: ${sel} contrast ≥ 4,5 (${l.ratio}) en tekst ≥ 11,5 px (${l.px})`, l.ratio >= 4.5 && l.px >= 11.5);
}
const geenSchuif = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/* ── 1 · /admin ─────────────────────────────────────────────────────────── */
console.log('\n1 · /admin, licht en donker, 390 en 1280 px');
for (const breed of [390, 1280]) {
  for (const donker of [false, true]) {
    const tag = `${breed}px ${donker ? 'donker' : 'licht'}`;
    const page = await browser.newPage({ viewport: { width: breed, height: 900 } });
    const pre = donker ? '/donker' : '';

    await page.goto(`http://localhost:${PORT}${pre}/admin/orders/11/files`, { waitUntil: 'load' });
    ok(`${tag} bestelpagina 11: "dag 5 van ${VERVAL_DAG}" te zien`, await page.locator('#betaling .wa-dag').innerText(), `dag 5 van ${VERVAL_DAG}`);
    await leesbaarOk(page, '#betaling .wa-dag, #betaling .meta', `${tag} betaling open`);
    await leesbaarOk(page, '#betaling .btn', `${tag} betaling open (knoppen)`);
    await leesbaarOk(page, '.board .kleurstaal + b, .brief b', `${tag} kleur in de brief`);
    ok(`${tag} kleurvlakje in de brief`, await page.locator('svg.kleurstaal rect[fill="#1B3A2F"]').count() > 0);
    ok(`${tag} bestelpagina 11: geen schuifbalk opzij`, await geenSchuif(page));
    await page.locator('#betaling').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `a3-w3-betaling-${breed}-${donker ? 'donker' : 'licht'}.png`) });
    if (await page.locator('svg.kleurstaal rect[fill="#1B3A2F"]').count()) {
      await page.locator('svg.kleurstaal rect[fill="#1B3A2F"]').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUT, `a3-w3-kleur-${breed}-${donker ? 'donker' : 'licht'}.png`) });
    }

    await page.goto(`http://localhost:${PORT}${pre}/admin/orders/12/files`, { waitUntil: 'load' });
    await leesbaarOk(page, '.warnline.is-rood p:first-child', `${tag} mail kwam niet aan`);
    await leesbaarOk(page, '.warnline.is-rood .btn', `${tag} mail kwam niet aan (knoppen)`);
    ok(`${tag} bestelpagina 12: geen schuifbalk opzij`, await geenSchuif(page));
    await page.screenshot({ path: path.join(OUT, `a3-w3-bounce-${breed}-${donker ? 'donker' : 'licht'}.png`) });

    await page.goto(`http://localhost:${PORT}${pre}/admin/orders/13/files`, { waitUntil: 'load' });
    await leesbaarOk(page, '#review .meta', `${tag} review vragen (regel)`);
    await leesbaarOk(page, '#review .btn', `${tag} review vragen (knoppen)`);
    ok(`${tag} de reviewknop staat er`, await page.locator('#review button:has-text("Vraag om een review via WhatsApp")').count(), 1);
    await page.locator('#review').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `a3-w3-review-${breed}-${donker ? 'donker' : 'licht'}.png`) });

    await page.goto(`http://localhost:${PORT}${pre}/admin/orders/14/files`, { waitUntil: 'load' });
    await leesbaarOk(page, '#review .is-gevraagd', `${tag} review gevraagd (grijs)`);
    await page.locator('#review').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `a3-w3-review-gevraagd-${breed}-${donker ? 'donker' : 'licht'}.png`) });

    await page.goto(`http://localhost:${PORT}${pre}/admin`, { waitUntil: 'load' });
    ok(`${tag} dashboard: de zijkolom "wacht op betaling" met twee regels`, await page.locator('.db-wacht li').count(), 2);
    await leesbaarOk(page, '.db-wacht li > a, .db-wacht li > .meta, .db-wacht .wa-dag', `${tag} wacht op betaling`);
    await leesbaarOk(page, '.db-wacht .btn', `${tag} wacht op betaling (knoppen)`);
    ok(`${tag} dashboard: geen schuifbalk opzij`, await geenSchuif(page));
    await page.locator('.db-wacht').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `a3-w3-wacht-${breed}-${donker ? 'donker' : 'licht'}.png`) });
    await page.close();
  }
}

/* ── 2 · DE STUDIOMAILS ─────────────────────────────────────────────────── */
console.log('\n2 · de studiomails');
for (const breed of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width: breed, height: 900 } });
  for (const [i, m] of mailsGezien.entries()) {
    await page.setContent(m.html, { waitUntil: 'load' });
    const naam = /Incasso/.test(m.subject) ? 'incasso' : 'betaling';
    await leesbaarOk(page, 'a[href^="tel:"], a[href^="https://wa.me/"]', `${breed}px studiomail ${naam}`);
    ok(`${breed}px studiomail ${naam}: geen schuifbalk opzij`, await geenSchuif(page));
    await page.screenshot({ path: path.join(OUT, `a3-w3-mail-${naam}-${breed}.png`), fullPage: true });
    if (i > 2) break;
  }
  await page.close();
}

/* ── 3 · HET FORMULIER: STAP 2 EN STAP 3 ─────────────────────────────────── */
console.log('\n3 · het formulier, stap 2 en 3');
if (!heeftDist) {
  ok('er is een dist/ — bouw eerst (npx astro build)', false);
} else {
  for (const [url, taal] of [['/nl/start/catalog', 'nl'], ['/start/catalog', 'en']]) {
    for (const breed of [390, 1280]) {
      const tag = `${taal} ${breed}px`;
      const page = await browser.newPage({ viewport: { width: breed, height: breed < 600 ? 844 : 900 } });
      await page.route('**/api/land', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"NL"}' }));
      await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
      await page.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
      await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
      await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
      await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
      await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
      /* De cookiebalk weg (alleen het noodzakelijke), anders ligt hij over het kleurveld. */
      if (await page.locator('[data-cc="reject"]').isVisible()) await page.click('[data-cc="reject"]');
      await page.fill('[data-pl-qty-input]', '1');
      await page.waitForTimeout(150);
      await page.evaluate(() => {
        const look = document.querySelector('[data-pl-look]');
        const eerste = look && !look.hidden ? look.querySelector('input[name="style"]') : null;
        if (eerste && !document.querySelector('input[name="style"]:checked')) { eerste.checked = true; eerste.dispatchEvent(new Event('change', { bubbles: true })); }
        /* Sinds 11 oktober 2026 (F3, 1.09) staat het gezicht in stap 1: eerst kiezen, anders gaat "Verder" niet. */
        const m = document.querySelector('[data-pl-step="1"] input[name="model"]');
        if (m && !document.querySelector('input[name="model"]:checked')) { m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await page.click('.pl-step.is-current [data-pl-next]');
      await page.waitForTimeout(300);
      const kleur = page.locator('input[name="colour_p1"]');
      if (await kleur.count()) {
        if (!(await kleur.isVisible())) {
          /* Het kleurveld zit in de lade "meer" van de kaart. */
          const meer = page.locator('.pu-meer-knop').first();
          if (await meer.count() && await meer.isVisible()) await meer.click();
          await page.waitForTimeout(200);
        }
        if (await kleur.isVisible()) {
          await kleur.fill(taal === 'nl' ? 'bosgroen, #1B3A2F' : 'forest green, #1B3A2F');
          await page.waitForTimeout(100);
          const label = await page.evaluate(() => { const i = document.querySelector('input[name="colour_p1"]'); const l = i && (i.labels?.[0] || i.closest('.pu-q')?.querySelector('label')); return l ? l.textContent.trim() : ''; });
          ok(`${tag} stap 2: het label van het kleurveld`, label.startsWith(taal === 'nl' ? 'Kleur, zoals in je webshop' : 'Colour, as in your webshop'));
          ok(`${tag} stap 2: het kleurvlakje leest de code in "naam, #code"`, await page.locator('.pu-q-swatch:not([hidden])').count() >= 1);
          await leesbaarOk(page, '.pu-q-has-swatch label', `${tag} stap 2 kleurlabel`);
          await kleur.scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(OUT, `a3-w3-stap2-kleur-${taal}-${breed}.png`) });
        } else {
          ok(`${tag} stap 2: het kleurveld is te openen`, false);
        }
      } else {
        ok(`${tag} stap 2: er is een kleurveld voor product 1`, false);
      }
      ok(`${tag} stap 2: de uitleg noemt Pantone of hex`, await page.locator(`.pu-q-uitleg:has-text("${taal === 'nl' ? 'Pantone of hex' : 'Pantone or hex'}")`).count() >= 1);
      ok(`${tag} stap 2: geen schuifbalk opzij`, await geenSchuif(page));

      /* Stap 3: de tekst onder het telefoonveld (de stap staat in de DOM; zichtbaar maken zonder foto's te uploaden). */
      await page.evaluate(() => {
        document.querySelectorAll('.pl-step').forEach((s) => s.classList.remove('is-current'));
        const s3 = document.querySelector('.pl-step[data-pl-step="3"]');
        if (s3) { s3.classList.add('is-current'); s3.hidden = false; }
      });
      await page.waitForTimeout(150);
      const hint = await page.evaluate(() => document.querySelector('#pl-phone')?.closest('.field')?.querySelector('.hint')?.textContent.trim() || '');
      ok(`${tag} stap 3: tekst bij het telefoonveld`, hint, taal === 'nl' ? 'We nemen contact met je op als er iets met je bestelling is.' : 'We get in touch if anything comes up with your order.');
      if (await page.locator('#pl-phone').isVisible()) {
        await leesbaarOk(page, '#pl-phone ~ .hint', `${tag} stap 3 telefoonhint`);
        await page.locator('#pl-phone').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(OUT, `a3-w3-stap3-telefoon-${taal}-${breed}.png`) });
      }
      ok(`${tag} stap 3: geen schuifbalk opzij`, await geenSchuif(page));
      await page.close();
    }
  }
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
