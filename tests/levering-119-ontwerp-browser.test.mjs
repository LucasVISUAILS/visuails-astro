/* VISUAILS — levering 119 (18 november 2026), proefronde: ontwerp en de gedeelde onderdelen, in de GEBOUWDE site (bouwer C4).
 *
 *   node tests/levering-119-ontwerp-browser.test.mjs     (vraagt een build: serveert dist/ zelf op een vrije poort en stopt hem)
 *
 *   D1-07 koppen hoogstens twee regels op de pagina's en breedtes waar het misging · D1-12 de tekst van de paginakop ·
 *   D1-08 Verder in het merkmodel mint en rechts · D1-10 de plaatshouder in /start/plan · D1-11 in het midden op 390 px ·
 *   P1-02 de beeldhouders zonder foto's · T1-04 de verschuiving met een traag script · P7-09 de voet · L-12 · L-09.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
if (!existsSync(path.join(DIST, 'index.html'))) { console.log('dist/ heeft geen voorpagina — draai eerst de build.'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json' };
const srv = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${srv.address().port}`;
const { chromium } = await import('playwright');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const CONSENT = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: new Date().toISOString() })), url: SITE };
const nieuw = async (w, h = 844, extra = {}) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'nl-NL', reducedMotion: 'reduce', ...extra });
  await ctx.addCookies([CONSENT]); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  return ctx;
};
const naar = async (p, pad, wacht = 300) => { await p.goto(SITE + pad, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(wacht); };

try {
  /* ── D1-07 ── */
  console.log('\nD1-07 · koppen hoogstens twee regels');
  const PAGINAS = ['/catalog/custom/', '/nl/catalog/custom/', '/lifestyle/phone-made/', '/editions/', '/nl/editions/', '/nl/models/', '/nl/custom-models/', '/upload-guidelines/',
    '/how-it-works/', '/nl/how-it-works/', '/studio/', '/per-product/', '/guides/', '/nl/guides/', '/test-sample/', '/nl/test-sample/'];
  for (const w of (process.env.KOP_BREED || "320,340,360,390,641,768,901,1138,1180,1280,1440").split(",").map(Number)) {
    const ctx = await nieuw(w, 800); const p = await ctx.newPage(); const drie = [];
    for (const pad of PAGINAS) {
      await naar(p, pad, 150);
      drie.push(...(await p.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3')].filter((h) => {
        if (!h.getClientRects().length || h.closest('.sr-only, [hidden], [aria-hidden="true"], details:not([open])')) return false;
        let e = h; while (e) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden') return false; e = e.parentElement; }
        return h.getBoundingClientRect().width > 2;
      }).map((h) => {
        const tops = []; const rg = document.createRange();
        for (const el of (h.querySelector('.h-een') ? [...h.childNodes].filter((n) => !(n.classList && n.classList.contains('h-een'))) : [h])) {
          rg.selectNodeContents(el);
          for (const q of rg.getClientRects()) { if (q.width < 1 || q.height < 1) continue; const m = q.top + q.height / 2; if (!tops.some((t) => Math.abs(t - m) < Math.max(4, q.height * 0.45))) tops.push(m); }
        }
        return tops.length >= 3 ? `${h.innerText.replace(/\s+/g, ' ').slice(0, 50)} (${tops.length})` : null;
      }).filter(Boolean))).map((x) => `${pad} ${x}`));
    }
    ok(`${w} px: geen kop op drie regels op ${PAGINAS.length} pagina's`, drie.length === 0, drie.join(' | '));
    await ctx.close();
  }

  const ctx = await nieuw(390); const p = await ctx.newPage();
  /* ── D1-12 ── */
  console.log('\nD1-12 · de tekst van de paginakop');
  for (const [pad, tekst] of [['/video/', 'Product videos that move.'], ['/nl/catalog/', 'Catalogfoto’s. Elke keer gelijk.'], ['/lifestyle/', 'Your product, set in a scene.']]) {
    await naar(p, pad, 50);
    const t = await p.evaluate(() => document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim());
    ok(`${pad}: "${t}"`, t === tekst);
  }
  /* ── D1-08 en L-12 ── */
  console.log('\nD1-08 · Verder in het merkmodel; L-12 · de zin over € 450');
  await naar(p, '/nl/start/brand-model/');
  const v = await p.evaluate(() => { const k = document.querySelector('[data-bm-next]'); const n = k.closest('.bm-nav'); return { kleur: getComputedStyle(k).backgroundColor, rechts: Math.round(n.getBoundingClientRect().right - k.getBoundingClientRect().right) }; });
  ok(`Verder is mint (${v.kleur})`, v.kleur === 'rgb(61, 255, 176)');
  ok(`  en staat rechts (${v.rechts} px van de rand van de rij)`, v.rechts <= 1);
  const zin = async (land) => p.evaluate((land) => { const s = document.querySelector('[data-bm-country]'); s.value = land; s.dispatchEvent(new Event('change', { bubbles: true })); s.dispatchEvent(new Event('input', { bubbles: true })); const z = document.querySelector('[data-bm-buiten-nl]'); return z ? z.hidden : null; }, land);
  ok('land NL: "Met een geldig EU-btw-nummer …" verborgen', (await zin('NL')) === true);
  ok('land BE: hij staat er', (await zin('BE')) === false);
  /* ── D1-10 en L-09 ── */
  console.log('\nD1-10 · de plaatshouder; L-09 · de bedragen');
  await naar(p, '/nl/start/plan/');
  const ph = await p.evaluate(() => getComputedStyle(document.querySelector('input[name="phone"]'), '::placeholder').color);
  ok(`de plaatshouder van het telefoonveld is grijs #5E6461 (${ph})`, ph === 'rgb(94, 100, 97)');
  await naar(p, '/start/plan/');
  /* integrator I9: de samenvatting van merk + 12 maanden staat pas in beeld als je die kiest; innerText van de hele pagina
     zag hem dus niet. Nu de tekst van precies dat blok (.ps-sumv[data-plan=brand][data-term=prepaid]). */
  const tekst = await p.evaluate(() => document.querySelector('.ps-sumv[data-plan="brand"][data-term="prepaid"]')?.textContent.replace(/\s+/g, ' ') || '');
  ok('EN merk 12 maanden: €1,410 en "save €1,470", niet €1,472', tekst.includes('€1,410') && /save €1,470/i.test(tekst) && !tekst.includes('€1,472'), tekst.slice(0, 160));
  /* ── D1-11 ── */
  console.log('\nD1-11 · in het midden op 390 px');
  for (const [pad, kiezer, naam] of [['/custom-models/', '.h-bm-bieb a.h-knop', 'See all ten'], ['/nl/plans/', '.h-pl-maat a.h-knop', 'Bespreek met ons'], ['/nl/', '.ov110-zin', 'Wat VISUAILS doet'], ['/nl/start/#lifestyle', '#lifestyle .h-st-eigen', 'Van jouw eigen productfoto’s']]) {
    await naar(p, pad, 600);
    const d = await p.evaluate((k) => { const e = document.querySelector(k); if (!e) return null; const r = e.getBoundingClientRect(); return Math.round((r.left + r.right) / 2 - innerWidth / 2); }, kiezer);
    ok(`${pad} "${naam}": ${d} px van het midden (≤ 8)`, d !== null && Math.abs(d) <= 8);
  }
  /* ── P7-09 ── */
  console.log('\nP7-09 · de voet');
  await naar(p, '/about/', 50);
  ok('EN: "Chamber of Commerce (KVK) 99742993"', (await p.evaluate(() => document.querySelector('.footer-bottom').innerText)).includes('Chamber of Commerce (KVK) 99742993'));
  await naar(p, '/nl/about/', 50);
  const nlVoet = await p.evaluate(() => document.querySelector('.footer-bottom').innerText);
  ok('NL: "KVK 99742993", zonder Chamber of Commerce', nlVoet.includes('KVK 99742993') && !nlVoet.includes('Chamber'));
  await ctx.close();

  /* ── P1-02 ── */
  console.log('\nP1-02 · de beeldhouders zolang de foto\'s laden');
  for (const w of [360, 390]) {
    const c2 = await nieuw(w); await c2.route(/\.(webp|avif|jpg|png)(\?|$)/, (r) => r.abort());
    const p2 = await c2.newPage(); await naar(p2, '/nl/start/#lifestyle', 600);
    const h = await p2.evaluate(() => [...document.querySelectorAll('#lifestyle .h-st-beeld')].map((a) => Math.round(a.getBoundingClientRect().height)));
    ok(`${w} px: elke houder heeft zijn hoogte zonder foto (${h.join(', ')})`, h.length > 1 && h.every((x) => x > 200));
    await c2.close();
  }
  /* ── T1-04 ── */
  console.log('\nT1-04 · Wat we maken met een traag script');
  for (const w of [320, 390]) {
    const c3 = await browser.newContext({ viewport: { width: w, height: 844 }, locale: 'en-US' });
    await c3.addCookies([CONSENT]); await c3.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    await c3.route(/HalMaken80\.astro_astro_type_script/, async (r) => { await new Promise((x) => setTimeout(x, 2500)); r.continue(); });
    const p3 = await c3.newPage();
    await p3.addInitScript(() => { window.__m8 = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput && (e.sources || []).some((s) => s.node && s.node.closest && s.node.closest('.m8'))) window.__m8 += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    await p3.goto(SITE + '/', { waitUntil: 'load' }); await p3.waitForTimeout(4000);
    const r = await p3.evaluate(() => ({ cls: window.__m8, aan: !!document.querySelector('.m8-aan') }));
    ok(`${w} px: verschuiving door Wat we maken ${r.cls.toFixed(4)} (< 0,01; was 0,40)`, r.aan && r.cls < 0.01);
    await c3.close();
  }
} finally {
  await browser.close(); srv.close();
}
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
