/* VISUAILS — ronde 91 (K-C3), 9 november 2026: het merkmodelformulier vraagt in Nederland
 * het KVK-nummer (verplicht) en het btw-nummer optioneel, zoals de andere formulieren.
 * Lucas koos dat in lijst 85 (C3 = a). Tot vandaag vroeg het merkmodel overal een
 * btw-nummer (verplicht, of "ik heb er geen") en nooit een KVK-nummer.
 *
 * 1 · de bron (BrandModelBrief.astro, billing.js);
 * 2 · de server: een Nederlandse merkmodelbestelling met alleen een KVK-nummer is zakelijk
 *     in orde (businessCheck), het nummer staat op de klant en in details.business_reg
 *     (waar "één proef per bedrijf" naar kijkt);
 * 3 · de gebouwde pagina in Chromium, per land — alleen als dist/ er is.
 *   node tests/blind91-k-kvk-merkmodel.test.mjs
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('1 · de bron');
{
  const bm = lees('src/components/BrandModelBrief.astro');
  ok('het btw-blok wisselt per land (data-bm-vatveld, verplicht/optioneel)', /data-bm-vatveld/.test(bm) && /data-bm-vat-req/.test(bm) && /data-bm-vat-opt hidden/.test(bm));
  ok('het vinkje "ik heb er geen" kan weg (data-bm-novat-rij)', /data-bm-novat-rij/.test(bm));
  ok('het registratienummer heet in NL "KVK-nummer" (data-kvk) met eigen melding en hint', /data-kvk=\{b\.regKvk\}/.test(bm) && /data-err-kvk=\{b\.regKvkErr\}/.test(bm) && /data-nl=\{b\.regHintNl\}/.test(bm));
  ok('syncBtw rekent per land met dezelfde vier standen als pipeline.js', /const soort = !up \? '' : up === HOME_COUNTRY \? 'nl' : isEu\(up\) \? 'eu' : 'other';/.test(bm));
  ok('acht cijfers in NL, zelfde patroon als het bestelformulier',
    bm.includes("regVeld.setAttribute('pattern', '[\\\\s.]*(\\\\d[\\\\s.]*){8}')") && lees('src/scripts/pipeline.js').includes("veld.setAttribute('pattern', '[\\\\s.]*(\\\\d[\\\\s.]*){8}')"));
  const { BILLING } = await import('../src/data/billing.js');
  for (const l of ['nl', 'en']) {
    ok(`billing.js ${l}: regKvk, regKvkErr, regHintNl, regHintOther`, ['regKvk', 'regKvkErr', 'regHintNl', 'regHintOther'].every((k) => String(BILLING[l][k] || '').length > 5));
  }
}

/* ── 2 · de server ───────────────────────────────────────────────────────── */
console.log('\n2 · een Nederlandse merkmodelbestelling met alleen een KVK-nummer');
{
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
    if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') {
      const p = JSON.parse(String(opts.body));
      return json({ id: 'tr_0000000009', status: 'open', amount: p.amount, metadata: p.metadata || {}, _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_0000000009' } } }, 201);
    }
    return json({ id: 'msg_test' });
  };
  const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
  const { BUSINESS_VERSION } = await import('../src/data/business.js');
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
  const env = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@visuails.com', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
  const fd = new FormData();
  /* Precies wat het formulier in NL nu post: geen btw-nummer, geen vinkje, wel een KVK-nummer. */
  for (const [k, v] of Object.entries({
    service: 'brand-model', lang: 'nl', bm_track: 'ours', bm_audience: 'x', first_name: 'Test', last_name: 'Klant', brand: 'TESTMERK',
    phone: '+31 6 12345678', email: 'kvk@example.com', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad',
    country: 'NL', vat: '', reg_number: '12345678', business_declaration: 'yes', business_version: BUSINESS_VERSION,
  })) fd.append(k, v);
  const res = await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': '10.91.3.1' } }), env, waitUntil: () => {} });
  const o = db.prepare("SELECT service, review_state, details_json, customer_id FROM orders WHERE email = 'kvk@example.com'").get();
  ok('aangenomen als merkmodel', res.status < 400 && o?.service === 'brand-model', `status ${res.status}`);
  let d = {};
  try { d = JSON.parse(o?.details_json || '{}'); } catch { d = {}; }
  ok('zakelijk in orde: KVK-nummer is het bewijs (business_kind kvk, business_ok)', d.business_kind === 'kvk' && d.business_ok === true, JSON.stringify({ k: d.business_kind, ok: d.business_ok, n: d.business_notes }));
  ok('het KVK-nummer staat in details.business_reg (de sleutel van "één proef per bedrijf")', d.business_reg === '12345678');
  ok('en geen btw-controle', o?.review_state !== 'pending', String(o?.review_state));
  const k = db.prepare('SELECT reg_number FROM customers WHERE id = ?').get(o?.customer_id);
  ok('en op de klant (customers.reg_number), zoals bij een gewone bestelling', k?.reg_number === '12345678', String(k?.reg_number));
}

/* ── 3 · de pagina in Chromium ───────────────────────────────────────────── */
console.log('\n3 · het formulier per land (Chromium)');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
if (!existsSync(path.join(DIST, 'nl/start/brand-model/index.html'))) {
  console.log(' --   dist/ ontbreekt: bouw eerst (npx astro build); dit deel overgeslagen');
} else {
  const { chromium } = await import('playwright');
  const { browserPad } = await import('../scripts/lib/browserpad.mjs');
  const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    let f = path.join(DIST, decodeURIComponent(String(req.url).split('?')[0]));
    if (existsSync(f) && statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(DIST) || !existsSync(f)) { res.writeHead(404); return res.end(''); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    return res.end(readFileSync(f));
  });
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
  try {
    for (const taal of ['nl', 'en']) {
      const page = await browser.newPage();
      await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
      await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
      await page.goto(`http://localhost:${server.address().port}${taal === 'nl' ? '/nl' : ''}/start/brand-model/`, { waitUntil: 'load' });
      await page.waitForSelector('form[data-bm-form].is-live', { timeout: 15000 });
      const stand = (land) => page.evaluate((l) => {
        const sel = document.querySelector('[data-bm-country]');
        sel.value = l; sel.dispatchEvent(new Event('change', { bubbles: true }));
        const vat = document.querySelector('[data-bm-vat]');
        const reg = document.querySelector('[data-bm-regfield]');
        return {
          vatZichtbaar: !document.querySelector('[data-bm-vatveld]').hidden, vatVerplicht: vat.required,
          vinkje: !document.querySelector('[data-bm-novat-rij]').hidden,
          regZichtbaar: !document.querySelector('[data-bm-reg]').hidden, regVerplicht: reg.required,
          regLabel: document.querySelector('[data-bm-reg-label]').textContent.trim(), patroon: reg.getAttribute('pattern') || '',
        };
      }, land);
      const nl = await stand('NL');
      ok(`${taal}: NL — btw-nummer zichtbaar maar optioneel, geen vinkje`, nl.vatZichtbaar && !nl.vatVerplicht && !nl.vinkje, JSON.stringify(nl));
      ok(`${taal}: NL — KVK-nummer zichtbaar, verplicht, acht cijfers`, nl.regZichtbaar && nl.regVerplicht && /KVK/.test(nl.regLabel) && /\{8\}/.test(nl.patroon), JSON.stringify(nl));
      const de = await stand('DE');
      ok(`${taal}: DE — btw-nummer verplicht met vinkje, geen registratienummer`, de.vatZichtbaar && de.vatVerplicht && de.vinkje && !de.regZichtbaar && !de.regVerplicht, JSON.stringify(de));
      /* Het vinkje staat in stap 4, die nu niet in beeld is: zet hem zoals een klik doet. */
      await page.evaluate(() => { const b = document.querySelector('[data-bm-novat]'); b.checked = true; b.dispatchEvent(new Event('change', { bubbles: true })); });
      const deGeen = await page.evaluate(() => ({ reg: !document.querySelector('[data-bm-reg]').hidden && document.querySelector('[data-bm-regfield]').required, vat: document.querySelector('[data-bm-vat]').required, label: document.querySelector('[data-bm-reg-label]').textContent.trim() }));
      ok(`${taal}: DE + "ik heb er geen" — registratienummer verplicht, btw niet`, deGeen.reg && !deGeen.vat && !/KVK/.test(deGeen.label), JSON.stringify(deGeen));
      const us = await stand('US');
      ok(`${taal}: US — geen btw-veld, registratienummer optioneel`, !us.vatZichtbaar && !us.vatVerplicht && us.regZichtbaar && !us.regVerplicht, JSON.stringify(us));
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
