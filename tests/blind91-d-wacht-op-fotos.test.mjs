/*
 * RONDE 91 · D04 — VERSTUREN WACHT OP DE FOTO'S, EN EEN HANGENDE UPLOAD HOUDT DE REST NIET TEGEN
 * 9 november 2026
 *
 * Twee gaten op een trage of haperende verbinding, allebei met de echte /api/upload en /api/order
 * (nep-R2 in het geheugen, SQLite-D1) achter het gebouwde bestelformulier:
 *
 *  1. Foto's kiezen, meteen doorklikken naar stap 5 en versturen: /api/order hing alleen de foto's aan die
 *     op dat moment al in de opslag stonden. De rest werd afgebroken door de bedankpagina. Bestelling
 *     zonder foto's, zonder melding. Nu wacht het versturen tot er niets meer onderweg is.
 *  2. Een upload die hangt (geen fout, geen antwoord) had geen tijdgrens, en omdat de wachtrij één voor één
 *     gaat, stonden alle foto's erachter ook stil. Nu is lang stil zonder voortgang een weggevallen
 *     verbinding (UPLOAD_STIL_MS; hier op 1,5 s gezet via window.__visUploadStil).
 *
 * pipeline.js wordt UIT DE BRON gebundeld (esbuild) en in plaats van de bundel in dist/ geserveerd, zodat
 * de toets de bron toetst en niet een oude build. De HTML komt uit dist/ (bouw eerst).
 *
 *   node tests/blind91-d-wacht-op-fotos.test.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { d1, verseDb } from './lib/d1sqlite.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — ronde 91 D04: versturen wacht op de foto\'s; een hangende upload houdt de rest niet tegen\n');

const BRON = fs.readFileSync(path.join(ROOT, 'src/scripts/pipeline.js'), 'utf8');
ok('onSubmit wacht als er nog iets onderweg is', /if \(pendingCount\(\) > 0\) \{ wachtOpFotos\(\); return; \}/.test(BRON));
ok('het uploadverzoek heeft een stilte-grens', /const UPLOAD_STIL_MS = \d+;/.test(BRON) && /vastgelopen = true; xhr\.abort\(\);/.test(BRON));

const html = path.join(DIST, 'nl/start/catalog/index.html');
if (!fs.existsSync(html)) { console.log('      (browserdeel overgeslagen — geen dist/; bouw eerst)'); console.log(`\n${pass} goed, ${fail} fout`); process.exit(fail ? 1 : 0); }
const chunk = (/src="\/_astro\/(OrderFlow\.astro_astro_type_script[^"]+\.js)"/.exec(fs.readFileSync(html, 'utf8')) || [])[1];
ok('de bestelpagina laadt pipeline.js als eigen bundel', !!chunk);
const esbuild = await import('esbuild');
const bundel = (await esbuild.build({ entryPoints: [path.join(ROOT, 'src/scripts/pipeline.js')], bundle: true, format: 'esm', write: false, logLevel: 'silent' })).outputFiles[0].text;

/* Nep-R2 en de echte handlers. Niets naar buiten: fetch naar elders geeft 503. */
const echteFetch = globalThis.fetch;
globalThis.fetch = async () => new Response('{}', { status: 503 });
const upload = await import('../functions/api/upload.js');
const order = await import('../functions/api/order.js');
function nepR2() {
  const m = new Map();
  return {
    map: m,
    async put(key, v, o = {}) { m.set(key, { buf: Buffer.from(await new Response(v).arrayBuffer()), customMetadata: o.customMetadata || {} }); },
    async list({ prefix = '', limit = 1000 } = {}) { return { objects: [...m.keys()].filter((k) => k.startsWith(prefix)).sort().slice(0, limit).map((key) => ({ key, size: m.get(key).buf.length, customMetadata: m.get(key).customMetadata })) }; },
    async delete(k) { m.delete(k); },
    async get() { return null; },
  };
}
let env;
let gedrag = () => null;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2' };
let posts = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  if (p.startsWith('/api/') || p.startsWith('/account/me')) {
    const delen = [];
    for await (const c of req) delen.push(c);
    const body = Buffer.concat(delen);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    headers.set('cf-connecting-ip', '203.0.113.91');
    const request = new Request(`http://localhost${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
    const ctx = { request, env, waitUntil() {} };
    let r;
    if (p === '/api/upload' && req.method === 'POST') {
      posts += 1;
      const g = gedrag(posts);
      if (g && g.wacht) await new Promise((w) => setTimeout(w, g.wacht));
      if (g && g.hang) return; // nooit antwoord
      r = await upload.onRequestPost(ctx);
    } else if (p === '/api/upload' && req.method === 'DELETE') r = await upload.onRequestDelete(ctx);
    else if (p === '/api/order') r = await order.onRequestPost(ctx);
    else if (p === '/api/land') r = Response.json({ land: 'NL' });
    else if (p === '/api/botcheck') r = Response.json({ sleutel: null });
    else if (p === '/api/step') r = new Response(null, { status: 204 });
    else if (p === '/api/capacity') r = Response.json({ ok: true, reason: 'ok', windows: [{ start: '2026-11-20', end: '2026-11-21' }], from: '2026-11-18', earlier: false, more: false });
    else r = new Response('null', { status: 401, headers: { 'content-type': 'application/json' } });
    const h = {};
    r.headers.forEach((v, k) => { h[k] = v; });
    res.writeHead(r.status, h);
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  if (p === `/_astro/${chunk}`) { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(bundel); }
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const foto = async (naam, kleur) => ({ name: naam, mimeType: 'image/jpeg', buffer: await sharp({ create: { width: 1200, height: 1500, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } }).composite([{ input: { create: { width: 1200, height: 300, channels: 3, background: kleur } }, top: 0, left: 0 }]).jpeg({ quality: 85 }).toBuffer() });
const FOTO = [await foto('IMG_0001.jpg', '#c86464'), await foto('IMG_0002.jpg', '#64c864'), await foto('IMG_0003.jpg', '#6464c8')];
const VAK = ['front', 'back', 'detail'];

const { chromium } = await import('playwright');
const { browserPad } = await import('../scripts/lib/browserpad.mjs');
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });

async function nieuw({ stil = 0 } = {}) {
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  env = { DB: d1(db), UPLOADS: nepR2() };
  posts = 0;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (stil) await ctx.addInitScript((ms) => { window.__visUploadStil = ms; }, stil);
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 160)));
  await page.goto(`http://localhost:${PORT}/nl/start/catalog`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 20000 });
  await page.fill('[data-pl-qty-input]', '1').catch(() => {});
  await page.evaluate(() => { for (const n of ['style', 'model']) { const r = document.querySelector(`.pl-step.is-current input[name="${n}"]`); if (r && !document.querySelector(`input[name="${n}"]:checked`)) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } } });
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(300);
  return { db, ctx, page, fouten };
}
const zet = (page, id, f) => page.setInputFiles(`.pu-card:not([hidden]) .pu-slot[data-pu-slot="${id}"] input.pu-slot-input`, f);
async function naarStap5(page) {
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(300);
  if (await page.$('[data-pl-missing]:not([hidden]) [data-pl-missing-go]')) await page.click('[data-pl-missing-go]');
  for (const [n, w] of [['first_name', 'Testa'], ['last_name', 'Proef'], ['brand', 'Proefmerk BV'], ['email', 'inkoop@proefmerk.test'], ['phone', '+31 6 00000000'], ['address_line1', 'Teststraat 1'], ['postal_code', '1234 AB'], ['city', 'Teststad'], ['reg_number', '12345678']]) {
    if (await page.$(`[name="${n}"]:visible`)) await page.fill(`[name="${n}"]`, w);
  }
  await page.click('.pl-step.is-current [data-pl-next]');
  await page.waitForTimeout(400);
  const box = await page.$('input[name="business_declaration"]');
  if (box && !(await box.isChecked())) await box.check();
  return page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));
}

try {
  /* 1 · elke upload duurt 2,5 s; meteen naar stap 5 en versturen. */
  {
    gedrag = () => ({ wacht: 2500 });
    const { db, ctx, page, fouten } = await nieuw();
    for (let i = 0; i < 3; i++) await zet(page, VAK[i], FOTO[i]);
    ok('1 · stap 5 bereikt terwijl de foto\'s nog onderweg zijn', (await naarStap5(page)) === 5);
    ok('1 · er is nog iets onderweg op het moment van versturen', await page.evaluate(() => document.querySelectorAll('.pu-slot[data-state="sending"]').length > 0));
    await page.click('[data-pl-submit]');
    await page.waitForTimeout(400);
    ok('1 · de knop wacht ("Versturen…", uit)', await page.evaluate(() => { const b = document.querySelector('[data-pl-submit]'); return !!b && b.disabled; }));
    ok('1 · nog geen bestelling zolang er foto\'s onderweg zijn', db.prepare('SELECT COUNT(*) n FROM orders').get().n === 0);
    await page.waitForURL(/thank-you/, { timeout: 20000 }).catch(() => {});
    ok('1 · daarna vanzelf door naar de bedankpagina', /thank-you/.test(page.url()), page.url());
    const o = db.prepare('SELECT id, details_json FROM orders').all();
    ok('1 · precies één bestelling', o.length === 1, String(o.length));
    ok('1 · met alle drie de foto\'s eraan', o.length === 1 && db.prepare('SELECT COUNT(*) n FROM files WHERE order_id = ?').get(o[0].id).n === 3, String(o.length && db.prepare('SELECT COUNT(*) n FROM files').get().n));
    ok('1 · geen scriptfouten', fouten.length === 0, fouten.join(' ; '));
    await ctx.close();
  }
  /* 2 · de eerste upload hangt; stilte-grens 1,5 s. */
  {
    gedrag = (n) => (n === 1 ? { hang: true } : null);
    const { ctx, page, fouten } = await nieuw({ stil: 1500 });
    await zet(page, 'front', FOTO[0]);
    await page.waitForTimeout(300);
    await zet(page, 'back', FOTO[1]);
    let staat = '';
    for (let t = 0; t < 40; t++) {
      await page.waitForTimeout(250);
      staat = await page.evaluate(() => ['front', 'back'].map((id) => document.querySelector(`.pu-card:not([hidden]) .pu-slot[data-pu-slot="${id}"]`).dataset.state).join(','));
      if (staat === 'filled,filled') break;
    }
    ok('2 · na een hangend verzoek komen beide foto\'s toch binnen (opnieuw geprobeerd)', staat === 'filled,filled', staat);
    ok('2 · en de tweede stond niet eindeloos achter de eerste te wachten', posts >= 3, `posts=${posts}`);
    ok('2 · geen scriptfouten', fouten.length === 0, fouten.join(' ; '));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
  globalThis.fetch = echteFetch;
}
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
