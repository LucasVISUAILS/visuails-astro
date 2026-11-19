/* VISUAILS — levering 118 (17 november 2026), herstel na het naspelen (N4 → hersteller H2), in een echte browser.
 *
 *   node tests/levering-118-herstel-browser.test.mjs     (vraagt een verse build: npx astro build)
 *
 *   P1-06   de vaste Verder onderin op 390 px zegt eerst "Nog n keuzes" en blijft in stap 1 (de kiezer vond in de gebouwde
 *           pagina eerst de leverzin; de nep-DOM van levering-118-bestelformulier zag dat niet);
 *   P11-04  /nl/start: na een klik of Enter op een soort staat de focus op de kop van de nieuwe stap (de ClientRouter doet
 *           pushState zonder hashchange);
 *   koppen  op 320, 360 en 390 px hoogstens twee regels tekst (de €1 van /test-sample is een eigen figuur en telt niet), ook
 *           voor elke kop die de bedankpagina kan tonen;
 *   P11-07  forced-colors: de V in de werkplaatsbalk CanvasText, en de bannerkop zonder witte rand.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
if (!existsSync(path.join(DIST, 'nl/start/catalog/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}

const { chromium } = await import('playwright');
const { browserPad } = await import('../scripts/lib/browserpad.mjs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const SITE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: browserPad() });
const KEUZE = encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-11-17T00:00:00.000Z' }));
async function open(pad, breed, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: 844 }, locale: 'nl-NL', ...extra });
  await ctx.addCookies([{ name: 'vis_consent', value: KEUZE, url: SITE }]);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await ctx.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(e.message));
  await page.goto(SITE + pad, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, fouten };
}

/* ── P1-06 ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP1-06 · de vaste Verder onderin op 390 px');
for (const [pad, woord] of [['/nl/start/catalog/', /^Nog \d+ keuzes?$/], ['/start/lifestyle/', /^\d+ more choices?$/]]) {
  const { ctx, page, fouten } = await open(pad, 390);
  await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
  await page.waitForTimeout(400);
  const knop = page.locator('div.wk-onder [data-pl-next]');
  const t0 = (await knop.innerText()).trim();
  ok(`${pad}: bij het laden "${t0}"`, woord.test(t0) && await knop.evaluate((k) => k.classList.contains('is-omlaag')));
  const y0 = await page.evaluate(() => scrollY);
  await knop.click();
  await page.waitForTimeout(400);
  const na = await page.evaluate(() => ({ y: scrollY, hash: location.hash, stap1: !document.querySelector('[data-pl-step="1"]').hidden }));
  ok('  een tik scrolt naar het volgende blok en blijft in stap 1', na.y > y0 + 200 && na.stap1 && !/stap-2/.test(na.hash), JSON.stringify(na));
  for (let i = 0; i < 6 && (await knop.evaluate((k) => k.classList.contains('is-omlaag'))); i++) { await knop.click(); await page.waitForTimeout(300); }
  const t1 = (await knop.innerText()).trim();
  ok(`  daarna gewoon "${t1}"`, /^(Verder|Continue)$/.test(t1));
  ok('  geen scriptfouten', !fouten.length, fouten.join(' | '));
  await ctx.close();
}

/* ── P11-04 ────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP11-04 · de focus op de kop van de nieuwe stap (/nl/start, 390)');
for (const [hoe, doel] of [['klik', 'catalog'], ['Enter', 'lifestyle']]) {
  const { ctx, page } = await open('/nl/start/', 390);
  await page.waitForTimeout(300);
  const a = page.locator(`.st2 a[href$="#${doel}"]:visible`).first();
  if (hoe === 'klik') await a.click(); else { await a.focus(); await page.keyboard.press('Enter'); }
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => ({ focus: document.activeElement.id || document.activeElement.tagName, stap: document.querySelector('.st2').dataset.stap, y: Math.round(scrollY) }));
  ok(`${hoe} op ${doel}: focus op #st-g-${doel}, stap ${doel}, bovenaan`, s.focus === `st-g-${doel}` && s.stap === doel && s.y < 5, JSON.stringify(s));
  await ctx.close();
}

/* ── KOPPEN ────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nKoppen · hoogstens twee regels op 320, 360 en 390 px');
const PAGINAS = ['/nl/test-sample/', '/test-sample/', '/nl/thank-you/', '/thank-you/', '/nl/start/brand-model/', '/start/brand-model/', '/nl/start/', '/start/', '/ai-act/', '/nl/ai-act/', '/data-processing-agreement/', '/nl/data-processing-agreement/'];
for (const w of [320, 360, 390]) {
  const { ctx, page } = await open('/', w);
  const te = [];
  for (const pad of PAGINAS) {
    await page.goto(SITE + pad, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    te.push(...await page.evaluate((p) => {
      const tel = (h) => {
        const delen = h.querySelector('.h-een') ? [...h.childNodes].filter((n) => !(n.classList && n.classList.contains('h-een'))) : [h];
        const tops = [];
        for (const d of delen) { const rg = document.createRange(); rg.selectNodeContents(d); for (const q of rg.getClientRects()) { if (q.width < 1 || q.height < 1) continue; const m = q.top + q.height / 2; if (!tops.some((t) => Math.abs(t - m) < Math.max(4, q.height * 0.45))) tops.push(m); } }
        return tops.length;
      };
      const uit = [];
      for (const h of document.querySelectorAll('h1, h2, h3')) {
        if (h.closest('.sr-only, [hidden], dialog:not([open]), [aria-hidden="true"]') || !h.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
        const r = h.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (tel(h) > 2) uit.push(`${p} ${h.tagName} "${h.innerText.replace(/\s+/g, ' ').slice(0, 60)}"`);
        /* de bedankpagina wisselt de tekst van haar kop per stand: elke stand meten */
        if (h.matches('[data-ty-title]')) {
          const oud = h.textContent;
          for (const a of h.getAttributeNames().filter((n) => n.startsWith('data-ty-title-'))) { h.textContent = h.getAttribute(a); if (tel(h) > 2) uit.push(`${p} ${a} "${h.textContent}"`); }
          h.textContent = oud;
        }
      }
      return uit;
    }, pad));
  }
  ok(`${w} px: ${PAGINAS.length} pagina's, geen kop over drie regels`, !te.length, te.join(' | '));
  await ctx.close();
}

/* ── P11-07 ────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP11-07 · hoog contrast (forced-colors), 1280');
for (const scheme of ['dark', 'light']) {
  const { ctx, page } = await open('/nl/start/catalog/', 1280, { forcedColors: 'active', colorScheme: scheme });
  const v = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    return { vul: [...new Set([...document.querySelectorAll('.wk-merk .hal-vm use, .wk-merk .hal-vm path')].map((u) => getComputedStyle(u).fill))], bg };
  });
  const verwacht = scheme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
  ok(`${scheme}: de V in de werkplaatsbalk is CanvasText (${v.vul.join(', ')} op ${v.bg})`, v.vul.length > 0 && v.vul.every((f) => f === verwacht), JSON.stringify(v));
  await ctx.close();
  const voor = await open('/nl/', 1280, { forcedColors: 'active', colorScheme: scheme });
  /* zonder WebGL (deze browser heeft geen GPU) stond de kop effen, met de klasse b94-effen en een witte rand. Levering 120
     (19 november 2026, lijst 132): de kop is altijd gewone tekst zonder rand; hier dus: geen rand op de titel */
  await voor.page.waitForTimeout(800);
  const k = await voor.page.evaluate(() => { const t = document.getElementById('b94-h1'); return { rand: t && getComputedStyle(t).webkitTextStrokeWidth }; });
  ok(`${scheme}: de bannerkop zonder witte rand`, k.rand === '0px', JSON.stringify(k));
  await voor.ctx.close();
}

await browser.close();
server.close();
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
