/*
 * RONDE 91 · D10 — EEN HERHAALDE POGING MAAKT GEEN TWEEDE BESTELLING
 * 9 november 2026
 *
 * Viel de verbinding weg nadat /api/order de bestelling al had gemaakt, dan herhaalde de browser de POST
 * soms zelf, of drukte de klant na "het verzoek is niet afgerond" nog eens: twee bestellingen, dezelfde
 * foto's (91/werk/d/d04-netwerk.mjs, S7). Nu stuurt het formulier één verstuursleutel per formulier mee
 * en geeft /api/order bij een sleutel die hij al kent het antwoord van die bestelling terug.
 *
 * Deel 1 roept de handler rechtstreeks aan (SQLite-D1, nep-R2). Deel 2 laat het gebouwde formulier met
 * pipeline.js UIT DE BRON (esbuild) versturen tegen een server die na de eerste bestelling de verbinding
 * verbreekt zonder antwoord. Deel 2 heeft dist/ nodig (bouw eerst); zonder dist/ wordt het overgeslagen.
 *
 *   node tests/blind91-d-verstuursleutel.test.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { d1, verseDb } from './lib/d1sqlite.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — ronde 91 D10: de verstuursleutel\n');

const echteFetch = globalThis.fetch;
globalThis.fetch = async () => new Response('{}', { status: 503 });
const order = await import('../functions/api/order.js');

/* ── 1 · de handler ─────────────────────────────────────────────────────── */
const { db } = verseDb(new URL('../schema.sql', import.meta.url));
let env = { DB: d1(db) };
let nr = 0;
/* Elke poging een eigen ip: zonder Turnstile-sleutels geldt sinds lijst 87 (A06) de strenge
   grens van 3 bestellingen per 10 minuten per ip, en deze toets gaat over de sleutel, niet over die grens. */
const bestel = async (velden = {}, { ip = `198.51.100.${70 + nr}`, envX = env } = {}) => {
  nr += 1;
  const fd = new FormData();
  for (const [k, v] of Object.entries({
    service: 'catalog', mode: 'json', lang: 'nl', email: 'dubbel@voorbeeldmerk.test', first_name: 'Testa', last_name: 'Proef',
    phone: '+31 6 00000000', brand: 'Proefmerk BV', products: '2', country: 'NL', business_declaration: 'yes',
    business_version: 'business-v2-2026-09', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', reg_number: '12345678', ...velden,
  })) fd.append(k, v);
  const res = await order.onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': ip } }), env: envX, waitUntil() {} });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const telOrders = () => db.prepare('SELECT COUNT(*) n FROM orders').get().n;
const S1 = 'a'.repeat(24) + 'b'.repeat(24);

const een = await bestel({ verstuursleutel: S1 });
ok('eerste poging: een bestelling', een.status === 200 && een.body && een.body.ok && telOrders() === 1, JSON.stringify(een.body));
const twee = await bestel({ verstuursleutel: S1 });
ok('dezelfde sleutel nog een keer: geen tweede bestelling', telOrders() === 1, String(telOrders()));
ok('  en hetzelfde kenmerk terug, gemarkeerd als herhaald', twee.status === 200 && twee.body.ref === een.body.ref && twee.body.herhaald === true, JSON.stringify(twee.body));
ok('  met een omleiding naar de bedankpagina van die bestelling', /\/nl\/thank-you\/?\?ref=VIS-/.test(twee.body.redirect || ''), twee.body.redirect);
ok('de sleutel staat niet als regel in de bestelling', !/verstuursleutel/.test(db.prepare('SELECT details_json FROM orders').get().details_json));

const zonder1 = await bestel({});
const zonder2 = await bestel({});
ok('zonder sleutel (oud tabblad, geen script): zoals vroeger, twee bestellingen', zonder1.body.ok && zonder2.body.ok && telOrders() === 3, String(telOrders()));

/* Een fout die de klant herstelt: dezelfde sleutel mag daarna gewoon door. */
const S2 = 'c'.repeat(40);
const fout = await bestel({ verstuursleutel: S2, email: 'geen-adres' });
ok('een fout (e-mail) maakt niets en houdt de sleutel niet vast', fout.status === 400 && telOrders() === 3, `${fout.status}`);
const hersteld = await bestel({ verstuursleutel: S2 });
ok('  na herstel met dezelfde sleutel: de bestelling komt er', hersteld.body.ok && !hersteld.body.herhaald && telOrders() === 4, JSON.stringify(hersteld.body));

/* Betaald: de herhaalde poging gaat naar "betaald". Met Mollie: via /api/order-pay. */
db.prepare("UPDATE orders SET payment_status = 'paid' WHERE ref = ?").run(hersteld.body.ref);
const betaald = await bestel({ verstuursleutel: S2 });
ok('herhaald na betalen: naar de bedankpagina met paid=', /paid=VIS-/.test(betaald.body.redirect || '') && telOrders() === 4, betaald.body.redirect);
const metMollie = await bestel({ verstuursleutel: S1 }, { envX: { ...env, MOLLIE_API_KEY: 'test_verzonnen' } });
ok('herhaald, onbetaald, met Mollie: via /api/order-pay (verse betaling of bedankpagina)', /^\/api\/order-pay\?ref=VIS-[^&]+&lang=nl$/.test(metMollie.body.redirect || '') && telOrders() === 4, metMollie.body.redirect);

/* Tegelijk: de eerste is nog bezig (claim staat op 0). De tweede wacht en geeft dan "bezig". */
const S3 = 'd'.repeat(32);
db.prepare('INSERT INTO rate_limits (bucket, hits, expires_at) VALUES (?, 0, ?)').run(`verstuur:${S3}`, new Date(Date.now() + 3600e3).toISOString());
const t0 = Date.now();
const bezig = await bestel({ verstuursleutel: S3 });
ok('een poging terwijl de eerste nog loopt: 409 bezig, geen bestelling', bezig.status === 409 && bezig.body.error === 'bezig' && telOrders() === 4, `${bezig.status} ${JSON.stringify(bezig.body)}`);
ok('  na even wachten op de eerste (± 4 s)', Date.now() - t0 >= 3500, `${Date.now() - t0} ms`);

/* De bestelling is weg (Lucas verwijderde haar): de sleutel valt vrij. */
const S4 = 'e'.repeat(30);
const weg = await bestel({ verstuursleutel: S4 });
db.prepare('DELETE FROM orders WHERE ref = ?').run(weg.body.ref);
const opnieuw = await bestel({ verstuursleutel: S4 }, { ip: '198.51.100.71' });
ok('bestelling verwijderd, zelfde sleutel: er komt weer een bestelling', opnieuw.body.ok && !opnieuw.body.herhaald && opnieuw.body.ref !== weg.body.ref, JSON.stringify(opnieuw.body));

/* ── 2 · in de browser: de verbinding valt weg na de eerste bestelling ──── */
const html = path.join(DIST, 'nl/start/catalog/index.html');
if (!fs.existsSync(html)) {
  console.log('      (browserdeel overgeslagen — geen dist/; bouw eerst)');
} else {
  const chunk = (/src="\/_astro\/(OrderFlow\.astro_astro_type_script[^"]+\.js)"/.exec(fs.readFileSync(html, 'utf8')) || [])[1];
  const esbuild = await import('esbuild');
  const bundel = (await esbuild.build({ entryPoints: [path.join(ROOT, 'src/scripts/pipeline.js')], bundle: true, format: 'esm', write: false, logLevel: 'silent' })).outputFiles[0].text;
  const { db: db2 } = verseDb(new URL('../schema.sql', import.meta.url));
  const env2 = { DB: d1(db2) };
  let orderPosts = 0;
  const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = http.createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (p.startsWith('/api/') || p.startsWith('/account/me')) {
      const delen = [];
      for await (const c of req) delen.push(c);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
      headers.set('cf-connecting-ip', '203.0.113.92');
      const request = new Request(`http://localhost${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(delen) });
      let r;
      if (p === '/api/order') {
        orderPosts += 1;
        r = await order.onRequestPost({ request, env: env2, waitUntil() {} });
        /* De eerste: verwerkt, maar het antwoord komt nooit aan. */
        if (orderPosts === 1) { req.socket.destroy(); return; }
      } else if (p === '/api/land') r = Response.json({ land: 'NL' });
      else if (p === '/api/botcheck') r = Response.json({ sleutel: null });
      else if (p === '/api/step') r = new Response(null, { status: 204 });
      else if (p === '/api/order-status') r = Response.json({ ok: true, paid: false, cancelled: false, payable: true });
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
    const stap = () => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));
    for (let i = 0; i < 5 && (await stap()) !== 5; i++) {
      await page.click('.pl-step.is-current [data-pl-next]');
      await page.waitForTimeout(300);
      if (await page.$('[data-pl-missing]:not([hidden]) [data-pl-missing-go]')) await page.click('[data-pl-missing-go]');
      for (const [n, w] of [['first_name', 'Testa'], ['last_name', 'Proef'], ['brand', 'Proefmerk BV'], ['email', 'inkoop@proefmerk.test'], ['phone', '+31 6 00000000'], ['address_line1', 'Teststraat 1'], ['postal_code', '1234 AB'], ['city', 'Teststad'], ['reg_number', '12345678']]) {
        if (await page.$(`[name="${n}"]:visible`)) await page.fill(`[name="${n}"]`, w);
      }
    }
    const box = await page.$('input[name="business_declaration"]');
    if (box && !(await box.isChecked())) await box.check();
    await page.click('[data-pl-submit]');
    await page.waitForTimeout(3000);
    /* Herhaalde de browser zelf, dan staan we al op de bedankpagina; anders drukt de klant nog eens. */
    if (!/thank-you/.test(page.url())) {
      const knop = await page.$('[data-pl-submit]:not([disabled])');
      if (knop) await Promise.all([page.waitForURL(/thank-you/, { timeout: 10000 }).catch(() => {}), knop.click()]);
    }
    const n = db2.prepare('SELECT COUNT(*) n FROM orders').get().n;
    ok(`browser: ${orderPosts} POST's naar /api/order, één bestelling`, orderPosts >= 2 && n === 1, `posts=${orderPosts} bestellingen=${n}`);
    ok('browser: de klant komt op de bedankpagina van die ene bestelling', /thank-you\/?\?ref=VIS-/.test(page.url()) && page.url().includes(db2.prepare('SELECT ref FROM orders').get()?.ref || '§'), page.url());
    await ctx.close();
  } finally {
    await browser.close();
    server.close();
  }
}
globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
