/**
 * VISUAILS — de letters van de site en de versie van de openingsbeelden (levering 77, 27 oktober 2026).
 *
 *   node tests/letter-77.test.mjs        (npm run test:letter77; draai eerst de build)
 *
 * Wat hier vastligt:
 *   1 · de bestanden: DM Sans (latin en latin-ext) en VISUAILS Display Bold staan zelf gehost met hun
 *       licentie, en de kopletter van de site is byte voor byte de letter uit docs/letter/ (het specimen);
 *   2 · de regels: elke @font-face noemt DM Sans of VISUAILS Display, nergens meer Instrument Sans
 *       (hal.css, studio-hal.css, /fonts/gedeeld.css voor /admin, de kaarten en de privélink);
 *   3 · de voorpagina: beide letters vooraf geladen, en achter elk beeld van de opening (still,
 *       schermen, de 117 beelden van de video in het script) ?v= met het teken uit
 *       src/data/openingStanden.js (openingVersie). Lucas, 27 oktober, 15:19: de video klopte niet
 *       meer met de still, omdat de browser de oude beelden onder dezelfde naam nog had;
 *   4 · in de browser (NL en EN, 1440 en 390): de koppen in VISUAILS Display Bold, beide tonen 700,
 *       de tekst in DM Sans; de kop van de opening op hoogstens twee regels en binnen zijn vak, en hij
 *       verspringt niet bij het laden; de beelden van de video komen met ?v= binnen.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { openingVersie } from '../src/data/openingStanden.js';
import { fontFaces } from '../scripts/fonts-voor-worker.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ── 1 · de bestanden ────────────────────────────────────────────────────── */
console.log('\n1 · de bestanden');
const FONTS = path.join(ROOT, 'public/fonts');
ok('DM Sans: latin en latin-ext als woff2, met OFL', ['dm-sans-latin.woff2', 'dm-sans-latin-ext.woff2', 'OFL.txt'].every((f) => fs.existsSync(path.join(FONTS, 'dm-sans', f))));
ok('VISUAILS Display Bold als woff2, met OFL', ['VISUAILSDisplay-Bold.woff2', 'OFL.txt'].every((f) => fs.existsSync(path.join(FONTS, 'visuails-display', f))));
const opSite = fs.readFileSync(path.join(FONTS, 'visuails-display/VISUAILSDisplay-Bold.woff2'));
const uitDocs = fs.readFileSync(path.join(ROOT, 'docs/letter/fonts/VISUAILSDisplay-Bold.woff2'));
ok('  de kopletter van de site is precies die uit docs/letter/ (het specimen)', opSite.equals(uitDocs), 'kopieer docs/letter/fonts/VISUAILSDisplay-Bold.woff2 naar public/fonts/visuails-display/');
const klein = (f) => fs.statSync(path.join(FONTS, f)).size;
ok(`  samen klein genoeg: DM Sans latin ${Math.round(klein('dm-sans/dm-sans-latin.woff2') / 1024)} kB, VISUAILS Display ${Math.round(klein('visuails-display/VISUAILSDisplay-Bold.woff2') / 1024)} kB (elk hooguit 60 kB)`,
  klein('dm-sans/dm-sans-latin.woff2') <= 60 * 1024 && klein('visuails-display/VISUAILSDisplay-Bold.woff2') <= 60 * 1024);

/* ── 2 · de regels ───────────────────────────────────────────────────────── */
console.log('\n2 · de regels');
const faces = (css) => (css.match(/@font-face\s*\{[^}]*\}/g) || []);
const fam = (f) => (/font-family:\s*['"]([^'"]+)['"]/.exec(f) || [])[1];
const hal = lees('src/styles/hal.css'), studio = lees('src/styles/studio-hal.css'), gedeeld = fontFaces();
const halFam = faces(hal).map(fam);
ok('hal.css: DM Sans twee keer (latin, latin-ext), VISUAILS Display één keer, IBM Plex Mono', halFam.filter((f) => f === 'DM Sans').length === 2 && halFam.filter((f) => f === 'VISUAILS Display').length === 1 && halFam.includes('IBM Plex Mono'), halFam.join(', '));
ok('  VISUAILS Display alleen in 700, DM Sans 400 – 700', faces(hal).filter((f) => fam(f) === 'VISUAILS Display').every((f) => /font-weight:\s*700;/.test(f)) && faces(hal).filter((f) => fam(f) === 'DM Sans').every((f) => /font-weight:\s*400 700;/.test(f)));
ok('studio-hal.css en gedeeld.css: DM Sans', faces(studio).map(fam).filter((f) => f === 'DM Sans').length === 2 && faces(gedeeld).map(fam).filter((f) => f === 'DM Sans').length === 2);
ok('  nergens nog een @font-face voor Instrument Sans', ![hal, studio, gedeeld].some((c) => faces(c).some((f) => fam(f) === 'Instrument Sans')));
ok('de tekstletter van de site, Studio, /admin, de kaarten en de privélink is DM Sans',
  /--h-letter:\s*'DM Sans'/.test(hal) && /--h-letter:\s*'DM Sans'/.test(studio) && ['public/admin.css', 'public/account.css', 'public/portal.css'].every((p) => /--h-letter:\s*"DM Sans"/.test(lees(p))));
ok('de grote koppen (.h-kop en de kop van de opening) in de kopletter, 700',
  /--h-kopletter:\s*'VISUAILS Display'/.test(hal) && /\.hal \.h-kop \{ font-family: var\(--h-kopletter\); font-weight: 700;/.test(hal) && /\.o-kop \{[^}]*font: 700 [^;]*var\(--h-kopletter/.test(lees('src/styles/opening.css')));

/* ── 3 · de voorpagina ───────────────────────────────────────────────────── */
console.log('\n3 · de voorpagina');
const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) { console.log(`geen bruikbare build — ${staat.uitleg}`); process.exit(1); }
const V = openingVersie();
ok(`het teken is tien tekens hex (${V})`, /^[0-9a-f]{10}$/.test(V));
for (const [taal, pad] of [['en', 'index.html'], ['nl', 'nl/index.html']]) {
  const h = fs.readFileSync(path.join(DIST, pad), 'utf8');
  ok(`${taal}: DM Sans en VISUAILS Display vooraf geladen`, /<link rel="preload"[^>]+\/fonts\/dm-sans\/dm-sans-latin\.woff2/.test(h) && /<link rel="preload"[^>]+\/fonts\/visuails-display\/VISUAILSDisplay-Bold\.woff2/.test(h));
  ok(`${taal}: het podium draagt het teken (data-o-v; sinds 78 de tablet)`, new RegExp(`data-t-podium data-o-v="${V}"`).test(h));
  /* alleen echte adressen (met .avif of .webp); de standen in de JSON staan zonder extensie, het script
     zet die er zelf achter, met ?v= (zie hieronder) */
  const adressen = [...h.matchAll(/\/img\/hal\/opening\/[^\s"',)?]+\.(?:avif|webp)(?:\?v=[0-9a-z]+)?/g)].map((m) => m[0]);
  const zonder = adressen.filter((a) => !a.endsWith(`?v=${V}`));
  ok(`${taal}: elk beeld van de opening in de pagina met ?v=${V} (${adressen.length} adressen)`, adressen.length >= 8 && zonder.length === 0, zonder.slice(0, 3).join(' '));
}
/* levering 78: geen video meer; het script van de tablet haalt de volgende schermen met ?v= (het
   staat in de pagina zelf of in _astro/) */
const bronnen = [...fs.readdirSync(path.join(DIST, '_astro')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(DIST, '_astro', f), 'utf8')), fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')];
const js = bronnen.find((s) => s.includes('data-t-standen') || s.includes('[data-t-standen]'));
ok('het script vraagt de schermen met ?v=', !!js && /\.avif\?v=\$\{/.test(js) && /\.webp\?v=\$\{/.test(js));
const kop = fs.readFileSync(path.join(ROOT, 'public/_headers'), 'utf8');
ok('_headers: /img/* blijft zeven dagen (het teken maakt dat veilig)', /\/img\/\*\s+Cache-Control: public, max-age=604800/.test(kop));

/* ── 4 · in de browser ───────────────────────────────────────────────────── */
console.log('\n4 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: browserPad() });
const KEUZE = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-27T00:00:00.000Z' })), url: BASIS };
try {
  for (const [taal, pad] of [['en', '/'], ['nl', '/nl/']]) {
    for (const breed of [1440, 390]) {
      const ctx = await browser.newContext({ viewport: { width: breed, height: 900 } });
      await ctx.addCookies([KEUZE]);
      const page = await ctx.newPage();
      const fouten = [], beelden = [];
      page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
      page.on('request', (q) => { if (/\/img\/hal\/opening\//.test(q.url())) beelden.push(q.url()); });
      await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
      await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
      /* de maat van de kop vanaf het eerste beeld, tot alles geladen is */
      await page.addInitScript(() => {
        window.__maten = [];
        const kijk = () => { const k = document.querySelector('.t-kop, .o-kop'); if (k) window.__maten.push(Math.round(parseFloat(getComputedStyle(k).fontSize) * 10) / 10); };
        document.addEventListener('DOMContentLoaded', kijk);
        document.fonts.addEventListener('loadingdone', kijk);
        window.addEventListener('load', () => { kijk(); setTimeout(kijk, 600); });
      });
      await page.goto(BASIS + pad, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.load('700 40px "VISUAILS Display"'));
      await page.waitForTimeout(900);
      if (breed === 1440) { await page.mouse.wheel(0, 600); await page.waitForTimeout(900); }
      const m = await page.evaluate(() => {
        const cs = (e) => getComputedStyle(e);
        /* levering 78: de opening is de tablet (HalTablet.astro); de kop hangt een stap S links buiten
           de tablet (RUIMTE-EN-RUST R1), dus "binnen zijn vak" is: rechts binnen de tablet, links binnen het venster */
        const k = document.querySelector('.t-kop'), tekst = document.querySelector('[data-t-tekst]');
        const regels = (e) => { const tops = new Set(); for (const s of e.querySelectorAll('.t-kop-voor, .l')) { const rg = document.createRange(); rg.selectNodeContents(s); for (const q of rg.getClientRects()) if (q.width > 1) tops.add(Math.round(q.top)); } return tops.size; };
        const koppen = [...document.querySelectorAll('.h-kop')];
        return {
          body: cs(document.body).fontFamily.split(',')[0].replace(/"/g, ''),
          kop: cs(k).fontFamily.split(',')[0].replace(/"/g, ''), kopGewicht: cs(k).fontWeight,
          hKop: koppen.length > 0 && koppen.every((e) => /^"?VISUAILS Display/.test(cs(e).fontFamily) && cs(e).fontWeight === '700' && [...e.querySelectorAll('.l')].every((l) => cs(l).fontWeight === '700')),
          geladen: document.fonts.check('700 40px "VISUAILS Display"') && document.fonts.check('400 16px "DM Sans"'),
          regels: regels(k), past: k.getBoundingClientRect().right <= tekst.getBoundingClientRect().right + 1 && k.getBoundingClientRect().left >= 0,
          maten: window.__maten,
        };
      });
      const vast = new Set(m.maten).size === 1;
      ok(`${taal} ${breed}: tekst DM Sans, kop VISUAILS Display ${m.kopGewicht}, alle .h-kop in 700 (beide tonen), letters geladen`, m.body === 'DM Sans' && m.kop === 'VISUAILS Display' && m.kopGewicht === '700' && m.hKop && m.geladen, JSON.stringify(m));
      ok(`${taal} ${breed}:   de kop op ${m.regels} regel(s) en binnen zijn vak`, (breed > 900 ? m.regels === 1 : m.regels === 2) && m.past, JSON.stringify(m));
      ok(`${taal} ${breed}:   verspringt niet bij het laden (${[...new Set(m.maten)].join(' → ')} px)`, vast, m.maten.join(', '));
      const zonder = beelden.filter((u) => !u.endsWith(`?v=${V}`));
      const reeks = beelden.filter((u) => /\/f\/\d{3}\.avif/.test(u));
      /* levering 78: geen scrollvideo meer, alleen de still en de schermen */
      ok(`${taal} ${breed}: elk beeld van de opening met ?v= (${beelden.length} verzoeken), en geen beelden van de oude video`, beelden.length > 0 && zonder.length === 0 && reeks.length === 0, zonder.slice(0, 3).join(' '));
      ok(`${taal} ${breed}: geen scriptfouten`, fouten.length === 0, fouten.join(' | '));
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
