/*
 * RONDE 91 · D06 — EEN JPEG ZONDER (BEKENDE) EXTENSIE WORDT HERKEND AAN ZIJN EERSTE BYTES
 * 9 november 2026 (ronde 91, R)
 *
 * Een echte JPEG zonder extensie (sommige Android-galerijen, gedeeld uit een chat-app) of met een vreemde
 * ("IMG_1234.jpg_large") kreeg in het bestelformulier "Geen beeld dat we kunnen lezen", terwijl er een
 * miniatuur van stond: pipeline.js preflight en /api/upload keken alleen naar de extensie. Ook bij levering
 * via /admin kreeg zo'n bestand octet-stream en geen AI-tag. Nu:
 *
 *   1 · extUitKop() (src/lib/uploads.js) zegt uit de eerste 16 bytes wat het is;
 *   2 · /api/upload neemt hem aan, met het type uit UPLOAD_TYPES en de extensie aan de naam; geen beeld blijft 400;
 *   3 · /admin (levering): de extensie erbij, dus het juiste type in R2 en de nette naam;
 *   4 · pipeline.js laat zo'n bestand door als de browser er een beeldtype of geen type aan geeft;
 *   5 · in de browser (gebouwde HTML, pipeline.js uit de bron, de echte /api/upload): het vakje komt op
 *       "Verstuurd"; een pdf zonder extensie blijft meteen geweigerd. Bouw eerst (npx astro build).
 * Verzonnen merken en adressen; niets hiervan bestaat.
 *
 *   node tests/blind91-r-jpg-zonder-extensie.test.mjs
 */
import fs, { readFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extUitKop, typeFor, UPLOAD_TYPES } from '../src/lib/uploads.js';
import { onRequestPost } from '../functions/api/upload.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, got, want) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name}${good ? '' : ` — verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
console.log('\nVISUAILS — ronde 91 D06: een JPEG zonder extensie\n');

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
const ftyp = (merk) => new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, ...[...merk].map((c) => c.charCodeAt(0)), 0, 0, 0, 0]);
const TEKST = new TextEncoder().encode('dit is geen beeld, alleen tekst');

console.log('1 · extUitKop()');
ok('jpeg', extUitKop(JPG), 'jpg');
ok('png', extUitKop(PNG), 'png');
ok('webp', extUitKop(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0])), 'webp');
ok('heic (ftyp heic)', extUitKop(ftyp('heic')), 'heic');
ok('heif (ftyp mif1)', extUitKop(ftyp('mif1')), 'heif');
ok('avif', extUitKop(ftyp('avif')), 'avif');
ok('mp4 (ftyp isom)', extUitKop(ftyp('isom')), 'mp4');
ok('tekst: niets', extUitKop(TEKST), null);
ok('te kort: niets', extUitKop(new Uint8Array([0xff, 0xd8])), null);
ok('mp4 staat niet in UPLOAD_TYPES (intake neemt geen film aan)', 'mp4' in UPLOAD_TYPES, false);

console.log('\n2 · /api/upload');
const opgeslagen = new Map();
const env = {
  UPLOADS: {
    async list() { return { objects: [] }; },
    async put(key, _v, o) { opgeslagen.set(key, o); },
  },
};
async function stuur(bytes, naam, type = '') {
  const fd = new FormData();
  fd.append('file', new File([bytes], naam, type ? { type } : {}));
  const res = await onRequestPost({ request: new Request('https://visuails.com/api/upload', { method: 'POST', body: fd }), env });
  return { status: res.status, body: await res.json() };
}
for (const [naam, bytes, ext] of [['IMG_20261109_0001', JPG, 'jpg'], ['IMG_1234.jpg_large', JPG, 'jpg'], ['scan', PNG, 'png'], ['foto.', JPG, 'jpg']]) {
  const r = await stuur(bytes, naam);
  ok(`"${naam}": aangenomen`, r.status, 200);
  ok(`"${naam}": naam met .${ext}`, String(r.body.file && r.body.file.name).endsWith(`.${ext}`), true);
  ok(`"${naam}": type uit onze tabel`, r.body.file && r.body.file.type, UPLOAD_TYPES[ext]);
  const o = opgeslagen.get(r.body.file && r.body.file.key);
  ok(`"${naam}": zo ook in R2`, o && o.httpMetadata && o.httpMetadata.contentType, UPLOAD_TYPES[ext]);
}
{
  const r = await stuur(TEKST, 'notitie');
  ok('tekst zonder extensie: nog steeds 400 bad-type', [r.status, r.body.error], [400, 'bad-type']);
  const r2 = await stuur(TEKST, 'notitie.jpg');
  ok('tekst met .jpg: nog steeds 400 bad-type (de handtekening)', [r2.status, r2.body.error], [400, 'bad-type']);
  const r3 = await stuur(JPG, 'gewoon.jpeg');
  ok('een gewone .jpeg: ongewijzigd (naam en type)', [r3.status, r3.body.file && r3.body.file.name, r3.body.file && r3.body.file.type], [200, 'gewoon.jpeg', 'image/jpeg']);
  ok('typeFor() zelf blijft alleen op de extensie', typeFor('IMG_20261109_0001'), null);
}

console.log('\n3 · levering via /admin');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const r2 = new Map();
  const UPLOADS = {
    async put(k, body, opts = {}) { const b = body && typeof body.getReader === 'function' ? new Uint8Array(await new Response(body).arrayBuffer()) : body; r2.set(k, { b, opts }); return { key: k }; },
    async get(k) { const x = r2.get(k); return x ? { body: new Response(x.b).body, arrayBuffer: async () => x.b, size: x.b?.length || 0 } : null; },
    async head(k) { return r2.has(k) ? { key: k } : null; },
    async delete(k) { r2.delete(k); },
  };
  const aenv = { DB: d1(db), UPLOADS };
  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
  const token = await mintToken();
  db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
  db.exec(`
    INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'klant@voorbeeld-merk.test', 'Testklant', 'Testmerk', 'NL');
    INSERT INTO orders (id, ref, customer_id, service, status, tier, name, brand, email, total_cents, vat_cents, lang, product_count, payment_status, country, created_at, paid_at) VALUES
      (81, 'VIS-RD-0081', 1, 'catalog', 'in_production', 'unattended', 'Testklant', 'Testmerk', 'klant@voorbeeld-merk.test', 20000, 4200, 'nl', 1, 'paid', 'NL', datetime('now','-1 days'), datetime('now','-1 days'));
  `);
  const fd = new FormData();
  fd.append('product', 'p1');
  fd.append('shot', 'front');
  fd.append('files', new File([JPG], 'export_zonder_extensie'));
  const res = await adminPost({ request: new Request('https://visuails.com/admin/orders/81/deliver', { method: 'POST', headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' }, body: fd }), env: aenv, waitUntil() {} });
  ok('opgeslagen (303 terug naar het bord)', res.status, 303);
  const rij = db.prepare("SELECT r2_key, filename FROM files WHERE order_id = 81 AND kind = 'delivery'").get();
  ok('de klant ziet een naam met .jpg', /\.jpg$/.test(rij && rij.filename), true);
  ok('in R2 als image/jpeg (niet octet-stream)', rij && r2.get(rij.r2_key)?.opts?.httpMetadata?.contentType, 'image/jpeg');
  ok('de R2-sleutel eindigt ook op .jpg', /\.jpg$/.test(rij && rij.r2_key), true);
}

console.log('\n4 · het bestelformulier (bron)');
{
  const pl = readFileSync(new URL('../src/scripts/pipeline.js', import.meta.url), 'utf8');
  ok('preflight laat de bytes beslissen bij een beeldtype of geen type', /exts\.indexOf\(extOf\(file\.name\)\) === -1 && !bytesBeslissen\(file\)\) return \{ code: 'bad-type' \}/.test(pl), true);
  const m = /function bytesBeslissen\(file\) \{([\s\S]*?)\n\}/.exec(pl);
  const bytesBeslissen = m ? new Function('file', m[1]) : () => null;
  ok('  image/jpeg zonder extensie: door', bytesBeslissen({ type: 'image/jpeg' }), true);
  ok('  geen type (de browser weet het niet): door', bytesBeslissen({ type: '' }), true);
  ok('  application/octet-stream (een deel-app, of Playwright zonder type): door', bytesBeslissen({ type: 'application/octet-stream' }), true);
  ok('  application/pdf: meteen geweigerd', bytesBeslissen({ type: 'application/pdf' }), false);
  ok('  text/plain: meteen geweigerd', bytesBeslissen({ type: 'text/plain' }), false);
}

console.log('\n5 · in de browser');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const html = path.join(DIST, 'nl/start/catalog/index.html');
if (!fs.existsSync(html)) {
  console.log('      (browserdeel overgeslagen — geen dist/; bouw eerst)');
} else {
  const chunk = (/src="\/_astro\/(OrderFlow\.astro_astro_type_script[^"]+\.js)"/.exec(fs.readFileSync(html, 'utf8')) || [])[1];
  const esbuild = await import('esbuild');
  const bundel = (await esbuild.build({ entryPoints: [path.join(ROOT, 'src/scripts/pipeline.js')], bundle: true, format: 'esm', write: false, logLevel: 'silent' })).outputFiles[0].text;
  const sharp = (await import('sharp')).default;
  const echteJpg = await sharp({ create: { width: 1400, height: 1700, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } }).jpeg({ quality: 85 }).toBuffer();
  const r2b = new Map();
  const uenv = {
    UPLOADS: {
      async put(key, v, o = {}) { r2b.set(key, { buf: Buffer.from(await new Response(v).arrayBuffer()), o }); },
      async list({ prefix = '' } = {}) { return { objects: [...r2b.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, size: r2b.get(key).buf.length, customMetadata: r2b.get(key).o.customMetadata || {} })) }; },
      async delete(k) { r2b.delete(k); },
      async get() { return null; },
    },
  };
  const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2' };
  const upl = await import('../functions/api/upload.js');
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = decodeURIComponent(url.pathname);
    if (p.startsWith('/api/') || p.startsWith('/account/me')) {
      const delen = [];
      for await (const c of req) delen.push(c);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
      const request = new Request(`http://localhost${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(delen) });
      let r;
      if (p === '/api/upload' && req.method === 'POST') r = await upl.onRequestPost({ request, env: uenv, waitUntil() {} });
      else if (p === '/api/upload' && req.method === 'DELETE') r = await upl.onRequestDelete({ request, env: uenv, waitUntil() {} });
      else if (p === '/api/land') r = Response.json({ land: 'NL' });
      else if (p === '/api/botcheck') r = Response.json({ sleutel: null });
      else if (p === '/api/step') r = new Response(null, { status: 204 });
      else if (p === '/api/capacity') r = Response.json({ ok: true, voorrangOpen: true });
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
  const { chromium } = await import('playwright');
  const { browserPad } = await import('../scripts/lib/browserpad.mjs');
  const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
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
    const vak = (id) => `.pu-card:not([hidden]) .pu-slot[data-pu-slot="${id}"]`;
    const wacht = async (id) => { let st = ''; for (let t = 0; t < 40; t++) { await page.waitForTimeout(250); st = await page.evaluate((s) => document.querySelector(s)?.dataset.state || '', vak(id)); if (st && st !== 'sending') break; } return st; };
    await page.setInputFiles(`${vak('front')} input.pu-slot-input`, { name: 'IMG_20261109_0001', mimeType: 'application/octet-stream', buffer: echteJpg });
    const st = await wacht('front');
    ok('een echte JPEG zonder extensie (application/octet-stream): het vakje komt op "Verstuurd" (filled)', st, 'filled');
    const opg = [...r2b.entries()].find(([k]) => /IMG_20261109_0001\.jpg$/.test(k));
    ok('  en staat in R2 als IMG_20261109_0001.jpg, image/jpeg', !!opg && opg[1].o.httpMetadata.contentType, 'image/jpeg');
    await page.setInputFiles(`${vak('back')} input.pu-slot-input`, { name: 'factuur', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
    await page.waitForTimeout(400);
    const pdf = await page.evaluate((s) => ({ st: document.querySelector(s)?.dataset.state, msg: document.querySelector(s)?.textContent || '' }), vak('back'));
    ok('een pdf zonder extensie: meteen geweigerd (failed), met de bekende zin', [pdf.st, /Geen beeld dat we kunnen lezen/.test(pdf.msg)], ['failed', true]);
    ok('geen scriptfouten', fouten, []);
    await ctx.close();
  } finally {
    await browser.close();
    server.close();
  }
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
