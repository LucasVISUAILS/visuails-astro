/*
 * RONDE 91 · D09 — ALLEEN DE FOTO'S DIE DE KLANT NOG HEEFT, GAAN MEE MET DE BESTELLING
 * 9 november 2026
 *
 * Weghalen en vervangen sturen een DELETE naar /api/upload die mag mislukken (offline, 429). /api/order las
 * alleen R2, dus een weggehaalde of vervangen foto ging dan alsnog mee. Nu stuurt het formulier de sleutels
 * van zijn eigen lijst (`staged`) mee in `upload_keys`, en hangt /api/order alleen die aan. Zonder het veld
 * (oud tabblad): het oude gedrag, alles uit de batch.
 *
 * Deel 1: de handlers rechtstreeks (SQLite-D1, nep-R2). Deel 2: het gebouwde formulier met pipeline.js UIT
 * DE BRON (esbuild), een foto vervangen terwijl elke DELETE mislukt, en dan bestellen. Deel 2 heeft dist/
 * nodig (bouw eerst).
 *
 *   node tests/blind91-d-lijst-fotos.test.mjs
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
console.log('\nVISUAILS — ronde 91 D09: de lijst van de browser beslist welke foto\'s meegaan\n');

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
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);

/* ── 1 · de handlers ─────────────────────────────────────────────────────── */
async function batchMetDrie(env) {
  let batch = '';
  const sleutels = [];
  for (const [naam, shot] of [['voorkant.jpg', 'front'], ['achterkant.jpg', 'back'], ['detail.jpg', 'detail']]) {
    const fd = new FormData();
    fd.append('file', new File([JPG], naam));
    if (batch) fd.append('batch', batch);
    fd.append('product', 'p1');
    fd.append('shot', shot);
    const r = await upload.onRequestPost({ request: new Request('https://visuails.com/api/upload', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': '203.0.113.93' } }), env });
    const b = await r.json();
    batch = b.batch;
    sleutels.push(b.file.key);
  }
  return { batch, sleutels };
}
let nr = 0;
async function bestel(env, velden) {
  nr += 1;
  const fd = new FormData();
  for (const [k, v] of Object.entries({
    service: 'catalog', mode: 'json', lang: 'nl', email: `lijst${nr}@voorbeeldmerk.test`, first_name: 'Testa', last_name: 'Proef',
    phone: '+31 6 00000000', brand: 'Proefmerk BV', products: '1', country: 'NL', business_declaration: 'yes',
    business_version: 'business-v2-2026-09', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', reg_number: '12345678', ...velden,
  })) fd.append(k, v);
  const r = await order.onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `198.51.100.${80 + nr}` } }), env, waitUntil() {} });
  const b = await r.json();
  const o = env.DB.__db.prepare('SELECT id, details_json FROM orders WHERE ref = ?').get(b.ref);
  return { body: b, keys: env.DB.__db.prepare('SELECT r2_key FROM files WHERE order_id = ? ORDER BY id').all(o.id).map((x) => x.r2_key), details: JSON.parse(o.details_json) };
}
const { db } = verseDb(new URL('../schema.sql', import.meta.url));
const env = { DB: Object.assign(d1(db), { __db: db }), UPLOADS: nepR2() };
{
  const { batch, sleutels } = await batchMetDrie(env);
  const zonder = await bestel(env, { upload_batch: batch });
  ok('zonder lijst (oud tabblad): alle drie, zoals vroeger', zonder.keys.length === 3, String(zonder.keys.length));
}
{
  const { batch, sleutels } = await batchMetDrie(env);
  const met = await bestel(env, { upload_batch: batch, upload_keys: [sleutels[0], sleutels[2]].join('\n') });
  ok('met lijst: alleen de twee die de klant nog heeft', met.keys.length === 2 && met.keys[0] === sleutels[0] && met.keys[1] === sleutels[2], met.keys.join(', '));
  ok('  en het aantal in de bestelling klopt', met.details.uploads === '2', met.details.uploads);
  ok('  de lijst staat niet als regel in de bestelling', !('upload_keys' in met.details));
}
{
  const { batch } = await batchMetDrie(env);
  const leeg = await bestel(env, { upload_batch: batch, upload_keys: '' });
  ok('lege lijst (alles weggehaald): geen foto\'s', leeg.keys.length === 0, String(leeg.keys.length));
}
{
  const { batch, sleutels } = await batchMetDrie(env);
  const vreemd = await bestel(env, { upload_batch: batch, upload_keys: [sleutels[1], 'intake/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB/001-aaaa-ander.jpg'].join('\r\n') });
  ok('een sleutel buiten de batch komt er nooit bij (de lijst kan alleen inperken)', vreemd.keys.length === 1 && vreemd.keys[0] === sleutels[1], vreemd.keys.join(', '));
}

/* ── 2 · in de browser: vervangen terwijl elke DELETE mislukt ─────────────── */
const html = path.join(DIST, 'nl/start/catalog/index.html');
if (!fs.existsSync(html)) {
  console.log('      (browserdeel overgeslagen — geen dist/; bouw eerst)');
} else {
  const chunk = (/src="\/_astro\/(OrderFlow\.astro_astro_type_script[^"]+\.js)"/.exec(fs.readFileSync(html, 'utf8')) || [])[1];
  const esbuild = await import('esbuild');
  const bundel = (await esbuild.build({ entryPoints: [path.join(ROOT, 'src/scripts/pipeline.js')], bundle: true, format: 'esm', write: false, logLevel: 'silent' })).outputFiles[0].text;
  const { db: db2 } = verseDb(new URL('../schema.sql', import.meta.url));
  const env2 = { DB: d1(db2), UPLOADS: nepR2() };
  let deletes = 0;
  const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = http.createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (p.startsWith('/api/') || p.startsWith('/account/me')) {
      const delen = [];
      for await (const c of req) delen.push(c);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
      headers.set('cf-connecting-ip', '203.0.113.94');
      const request = new Request(`http://localhost${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(delen) });
      const ctx = { request, env: env2, waitUntil() {} };
      let r;
      if (p === '/api/upload' && req.method === 'DELETE') { deletes += 1; r = Response.json({ ok: false, error: 'unavailable' }, { status: 503 }); }
      else if (p === '/api/upload') r = await upload.onRequestPost(ctx);
      else if (p === '/api/order') r = await order.onRequestPost(ctx);
      else if (p === '/api/land') r = Response.json({ land: 'NL' });
      else if (p === '/api/botcheck') r = Response.json({ sleutel: null });
      else if (p === '/api/step') r = new Response(null, { status: 204 });
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
  const foto = async (naam, kleur) => ({ name: naam, mimeType: 'image/jpeg', buffer: await sharp({ create: { width: 1200, height: 1500, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } }).composite([{ input: { create: { width: 1200, height: 300, channels: 3, background: kleur } }, top: 0, left: 0 }]).jpeg({ quality: 85 }).toBuffer() });
  const { chromium } = await import('playwright');
  const { browserPad } = await import('../scripts/lib/browserpad.mjs');
  const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${server.address().port}/nl/start/catalog`, { waitUntil: 'load' });
    await page.waitForSelector('#pl-form.is-live', { timeout: 20000 });
    await page.fill('[data-pl-qty-input]', '1').catch(() => {});
    await page.evaluate(() => { for (const n of ['style', 'model']) { const r = document.querySelector(`.pl-step.is-current input[name="${n}"]`); if (r && !document.querySelector(`input[name="${n}"]:checked`)) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } } });
    await page.click('.pl-step.is-current [data-pl-next]');
    await page.waitForTimeout(300);
    const vak = (id) => `.pu-card:not([hidden]) .pu-slot[data-pu-slot="${id}"] input.pu-slot-input`;
    const klaar = () => page.waitForFunction(() => ![...document.querySelectorAll('.pu-slot')].some((s) => s.dataset.state === 'sending'), null, { timeout: 15000 });
    await page.setInputFiles(vak('front'), await foto('oude-voorkant.jpg', '#c86464'));
    await klaar();
    await page.setInputFiles(vak('back'), await foto('achterkant.jpg', '#64c864'));
    await klaar();
    /* Vervangen: de voorkant opnieuw kiezen (de DELETE van de oude mislukt). */
    await page.setInputFiles(vak('front'), await foto('nieuwe-voorkant.jpg', '#6464c8'));
    await klaar();
    /* En de achterkant weghalen (ook die DELETE mislukt). */
    await page.locator('.pu-card:not([hidden]) .pu-slot[data-pu-slot="back"] .pu-act:not([hidden])').last().click();
    await page.waitForTimeout(400);
    /* Lijst 87 (D13): naast elke foto staat sinds 9 november zijn duimpje voor /admin (<sleutel>.duim.webp). */
    const fotosInR2 = [...env2.UPLOADS.map.keys()].filter((k) => !k.endsWith('.duim.webp'));
    ok('browser: drie foto\'s in R2 (de DELETE\'s mislukten)', fotosInR2.length === 3 && deletes >= 2, `R2=${fotosInR2.length} deletes=${deletes}`);
    ok('browser (lijst 87, D13): met een duimpje naast elke foto', fotosInR2.every((k) => env2.UPLOADS.map.has(`${k}.duim.webp`)), [...env2.UPLOADS.map.keys()].join(' '));
    for (let i = 0; i < 2; i++) {
      await page.click('.pl-step.is-current [data-pl-next]');
      await page.waitForTimeout(300);
      if (await page.$('[data-pl-missing]:not([hidden]) [data-pl-missing-go]')) await page.click('[data-pl-missing-go]');
      for (const [n, w] of [['first_name', 'Testa'], ['last_name', 'Proef'], ['brand', 'Proefmerk BV'], ['email', 'inkoop@proefmerk.test'], ['phone', '+31 6 00000000'], ['address_line1', 'Teststraat 1'], ['postal_code', '1234 AB'], ['city', 'Teststad'], ['reg_number', '12345678']]) {
        if (await page.$(`[name="${n}"]:visible`)) await page.fill(`[name="${n}"]`, w);
      }
    }
    const box = await page.$('input[name="business_declaration"]');
    if (box && !(await box.isChecked())) await box.check();
    await Promise.all([page.waitForURL(/thank-you/, { timeout: 15000 }).catch(() => {}), page.click('[data-pl-submit]')]);
    const rijen = db2.prepare('SELECT filename, shot FROM files ORDER BY id').all();
    ok('browser: de bestelling heeft alleen de nieuwe voorkant', rijen.length === 1 && rijen[0].filename === 'nieuwe-voorkant.jpg' && rijen[0].shot === 'front', JSON.stringify(rijen));
    const duim = db2.prepare('SELECT r2_key, preview_key FROM files ORDER BY id').get();
    ok('browser (lijst 87, D13): files.preview_key is het duimpje', !!duim && duim.preview_key === `${duim.r2_key}.duim.webp`, JSON.stringify(duim));
    await ctx.close();
  } finally {
    await browser.close();
    server.close();
  }
}
globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
