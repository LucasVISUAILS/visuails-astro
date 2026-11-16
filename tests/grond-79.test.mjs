/**
 * VISUAILS — de grond (levering 79, 1 november 2026; sinds levering 80 Wit #FFFFFF, lijst 64 grond b).
 *
 *   node tests/grond-79.test.mjs        (npm run test:grond79; draai eerst de build)
 *
 * Lucas, 02:42: "Website achtergrond wil ik heel uniek licht grijs hebben die bij het kleurenschema
 * past en ik wil dat de achtergrond van de laptop dit dus ook heeft, exact die kleur." Gekozen: B,
 * #F4F7FD, en wit voor het vlak op de grond. Wat hier vastligt:
 *   1 · het schema: --h-grond in hal.css, de grond van body, balk, voet en adresbalk, het hoofdstuk
 *       "De grond" in docs/KLEURENSCHEMA.md;
 *   2 · de beelden: de laptop van de opening en de standen van de laptop op de dienstpagina's zijn
 *       doorzichtig waar de grond is (geen ingebakken wit);
 *   3 · in de browser, op 1440 en 390 breed: de grond is #F4F7FD; geen vlak (#F4F5F4) direct op de
 *       grond; geen brede witte band zonder rand die de grond zou overschilderen; en op het scherm
 *       zelf is de grond rond en tussen de foto's precies #F4F7FD (geen wit blok achter een foto).
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { buildStaat } from './lib/build.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
/* levering 80: de grond is Wit #FFFFFF (was #F4F7FD in 79) */
const GROND = [252, 252, 252];   /* levering 107: de grond is #FCFCFC (Lucas, 15 november 20:23); levering 100 – 106 puur wit */
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) { console.log(`geen bruikbare build — ${staat.uitleg}`); process.exit(1); }

/* ── 1 · het schema ─────────────────────────────────────────────────────── */
console.log('\n1 · het schema');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const hal = lees('src/styles/hal.css');
ok('hal.css: --h-grond is #FCFCFC (levering 107), en --bg en de achtergrond van body.hal lezen hem', /--h-grond: #FCFCFC;/.test(hal) && /--bg-0: var\(--h-grond\); --bg: var\(--h-grond\);/.test(hal) && /background: var\(--h-grond\);\s+\/\* levering 79: de grond \(was wit\) \*\//.test(hal));
/* levering 100 (lijst 104): de balk en de voet zijn zwart (balk-99.css, kleur-100.css); de lade blijft op de grond.
   VERVALLEN: de balk van glas op de grond (sinds 80) en de voet op de grond. */
ok('levering 100: de balk zwart, de voet zwart (kleur-100.css), de lade op de grond', /body\.hal \.mobile-nav \{ font-family: var\(--h-letter\); background: var\(--h-grond\); \}/.test(hal) && /\.site-footer \{[^}]*background: #090D0B/.test(lees('src/styles/kleur-100.css')));
ok('Layout.astro: de adresbalk van een hal-pagina is de grond', /content=\{huid === 'hal' \? '#FCFCFC'/.test(lees('src/layouts/Layout.astro')));
const schema = lees('docs/KLEURENSCHEMA.md');
/* levering 100: de grond staat als Wit in de tabel van "Levering 100"; het hoofdstuk over de grijze grond (79) blijft als geschiedenis */
ok('docs/KLEURENSCHEMA.md: de grond is #FCFCFC in de tabel (levering 107), en het hoofdstuk van 79 staat er nog', /\| Grond \| `#FCFCFC` \| de achtergrond van elke pagina/.test(schema) && /### De grond \(levering 79/.test(schema));

/* ── 2 · de beelden ─────────────────────────────────────────────────────── */
console.log('\n2 · de beelden');
async function hoeken(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = (x, y) => data[(y * info.width + x) * 4 + 3];
  return { w: info.width, h: info.height, kanalen: info.channels, a: [a(1, 1), a(info.width - 2, 1), a(Math.floor(info.width / 2), 1)] };
}
for (const b of [960, 1920, 3840]) {
  for (const x of ['webp', 'avif']) {
    const h = await hoeken(path.join(ROOT, 'public/img/hal/breed', `laptop-${b}.${x}`));
    ok(`de laptop van de opening, ${b} ${x}: doorzichtig waar de grond is (de hoeken bovenaan)`, h.a.every((v) => v === 0) && h.w === b, JSON.stringify(h));
  }
}
const standen = fs.readdirSync(path.join(ROOT, 'public/img/hal/stand')).filter((f) => /-1600\.(webp|avif)$/.test(f));
const dicht = [];
for (const f of standen) { const h = await hoeken(path.join(ROOT, 'public/img/hal/stand', f)); if (!h.a.every((v) => v === 0)) dicht.push(f); }
ok(`de standen van de laptop op de dienstpagina's (${standen.length} op 1600): doorzichtig waar de grond is`, standen.length >= 18 && dicht.length === 0, dicht.join(' '));
ok('de foto onder de standen (pov-2304-doorzichtig.webp) staat er en de bronpagina gebruikt hem', fs.existsSync(path.join(ROOT, 'public/img/hal/pov-2304-doorzichtig.webp')) && /pov-2304-doorzichtig\.webp/.test(lees('src/pages/laptop-bron/[lang].astro')) && /omitBackground: true/.test(lees('scripts/laptop-standen.mjs')));

/* ── 3 · in de browser ──────────────────────────────────────────────────── */
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
const KEUZE = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-11-01T00:00:00.000Z' })), url: BASIS };
const PAGINAS = ['/', '/nl/', '/catalog/', '/lifestyle/', '/video/', '/pricing/', '/plans/', '/faq/', '/how-it-works/', '/about/', '/contact/', '/gallery/', '/start/', '/start/catalog/', '/studio/', '/privacy/', '/cookie-policy/', '/test-sample/', '/thank-you/', '/compare/'];

for (const [breed, hoog] of [[1440, 900], [390, 844]]) {
  console.log(`\n3 · in de browser, ${breed} × ${hoog}`);
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog }, reducedMotion: 'reduce' });
  await ctx.addCookies([KEUZE]);
  const page = await ctx.newPage();
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  const fouten = [];
  for (const pad of PAGINAS) {
    await page.goto(BASIS + pad, { waitUntil: 'load' });
    /* levering 95 (lijst 94, A1 b): op de voorpagina is de balk helemaal bovenaan doorzichtig (alleen vervaging, op de
       video); zodra je scrolt is hij weer glas. Daarom een paar pixels scrollen. */
    await page.evaluate(() => scrollTo(0, 12));
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const rgb = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map((x) => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
      const isWit = (c) => c && c.a > 0.9 && c.r >= 254 && c.g >= 254 && c.b >= 254;
      const isVlak = (c) => c && c.a > 0.9 && Math.abs(c.r - 244) <= 1 && Math.abs(c.g - 245) <= 1 && Math.abs(c.b - 244) <= 1;
      const eigen = (el) => { const c = rgb(getComputedStyle(el).backgroundColor); return c && c.a > 0.05 ? c : null; };
      const vorm = (el) => { const cs = getComputedStyle(el); return cs.boxShadow !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some((z) => parseFloat(cs[`border${z}Width`]) > 0 && (rgb(cs[`border${z}Color`]) || { a: 0 }).a > 0.1); };
      /* op de grond: geen voorouder met een eigen kleur, of alleen witte zonder vorm (die schilderden "grond") */
      const opGrond = (el) => { let e = el.parentElement; while (e && e !== document.body) { const c = eigen(e); if (c && !(isWit(c) && !vorm(e))) return false; if (getComputedStyle(e).backgroundImage !== 'none') return false; e = e.parentElement; } return true; };
      const vlak = [], band = [];
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.tagName === 'IMG') continue;
        const q = el.getBoundingClientRect(); if (q.width < 6 || q.height < 6) continue;
        const c = eigen(el); if (!c) continue;
        if (isVlak(c) && opGrond(el)) vlak.push(el.className.toString().slice(0, 40) || el.tagName);
        /* een band die de grond overschildert: wit, zonder rand of schaduw, zonder ronding, bijna zo breed als het venster
           (een wit vlak mét ronding is een kaart of het lichte vlakje op de grond, zoals "Op maat" op /plans) */
        if (isWit(c) && !vorm(el) && parseFloat(cs.borderTopLeftRadius) === 0 && q.width >= innerWidth * 0.85 && opGrond(el)) band.push(el.className.toString().slice(0, 40) || el.tagName);
      }
      /* levering 109: met licht onder het doek (lichtnet.js) ligt de grond op html en is body doorzichtig, zodat het doek ertussen past */
      const bodyEigen = getComputedStyle(document.body).backgroundColor;
      const body = document.documentElement.classList.contains('ln-aan') && /rgba\(0, 0, 0, 0\)|transparent/.test(bodyEigen) ? getComputedStyle(document.documentElement).backgroundColor : bodyEigen;
      /* levering 99 (lijst 100, D2 a): de balk is een zwevende balk in inkt; wat telt is de balk zelf, niet de strook eromheen */
      const balk = getComputedStyle(document.querySelector('.site-header .container.nav, .wk-balk') || document.body).backgroundColor;
      const voet = document.querySelector('.site-footer') ? getComputedStyle(document.querySelector('.site-footer')).backgroundColor : body;
      return { body, balk, voet, vlak: [...new Set(vlak)], band: [...new Set(band)] };
    });
    const g = 'rgb(252, 252, 252)', wit = 'rgb(255, 255, 255)';   /* levering 107: de grond #FCFCFC */
    /* de balk is sinds 80 van glas: de grond op 72 % (de css-regel staat hierboven) */
    /* het bestelformulier (/start/…) heeft zijn eigen witte balk en geen voet (de werkplaats; fase 4 van levering 100) */
    const z = 'rgb(9, 13, 11)', wk = pad.includes('/start/');
    const goedStel = (r.balk === z && r.voet === z) || (wk && [g, wit].includes(r.balk) && [g, wit].includes(r.voet));
    if (r.body !== g || !goedStel) fouten.push(`${pad} ${JSON.stringify(r)}`);
  }
  ok(`${PAGINAS.length} pagina's: grond #FCFCFC (levering 107), de balk en de voet zwart (levering 100)`, fouten.length === 0, fouten.slice(0, 4).join(' | '));

  /* het scherm zelf: de grond rond en tussen de foto's is exact de grond */
  const meet = async (pad, punten) => {
    await page.goto(BASIS + pad, { waitUntil: 'load' });
    await page.addStyleTag({ content: '#cc-bar, .wa-launcher, .wa-dock { display: none !important; }' });
    await page.evaluate(() => document.fonts.ready);
    /* (levering 94) staat het eerste vak onder het scherm, dan eerst daarheen */
    await page.evaluate((sel) => { const e = document.querySelector(sel); if (e && e.getBoundingClientRect().top > innerHeight) scrollTo(0, e.getBoundingClientRect().top + scrollY - 56); }, punten[0][0]);
    await page.waitForTimeout(500);
    const vakken = await page.evaluate((punten) => punten.map(([s, fx, fy]) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return [Math.round(q.left + fx * q.width), Math.round(q.top + fy * q.height)]; }), punten);
    const png = await page.screenshot();
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    return vakken.map((p) => { if (!p) return null; const [x, y] = p; if (x < 0 || y < 0 || x >= info.width || y >= info.height) return null; const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]]; });
  };
  const exact = (px) => px.every((p) => p && p[0] === GROND[0] && p[1] === GROND[1] && p[2] === GROND[2]);
  /* de opening (levering 80): de laptop staat op de Nevel-fade; daarboven, naast de titel, is het de grond */
  /* levering 87 (fade f2): de fade loopt van wit naar blauw uur over het hele scherm en begint halverwege de titel
     al een tikje; naast de titel meten we daarom op 40 %. De titel staat lager, dus het vak begint achter de balk:
     boven de titel meten we onder de balk (12 %) */
  /* levering 94: de opening is de bannervideo; de laptop staat onder Wat we maken, op de grond (het veld is weg). Gemeten
     links en rechts naast de laptop, halverwege de hoogte van het podium */
  const op = await meet('/nl/', [['.o8-podium', 0.01, 0.5], ['.o8-podium', 0.99, 0.5], ['.o8-podium', 0.01, 0.15]]);
  ok('  de laptop: naast hem is het exact de grond (#FCFCFC)', exact(op), JSON.stringify(op));
  /* de laptop op /catalog: linksboven in de foto en onder de hand links (niet onder een ballon: op de
     telefoon staat "Wat jij stuurt" onderaan in het midden) */
  const dienst = await meet('/nl/catalog/', [['.hl-doos', 0.27, 0.08], ['.hl-doos', 0.45, 0.97]]);
  ok('  /catalog: de grond rond de laptop is exact de grond (geen wit blok)', exact(dienst), JSON.stringify(dienst));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
