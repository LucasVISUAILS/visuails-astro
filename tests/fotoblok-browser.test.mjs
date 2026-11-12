/**
 * VISUAILS — de fotoblokken (lijst 86, 9 november 2026).
 * Lucas koos glas a, kleur a, beweging a en B1 – B4 "goed": een vaste, bewogen foto in Blauw uur achter het €1-blok,
 * het slot onderaan, de Studiobrief en de 404, met een glazen plaat achter de tekst (src/styles/fotoblok.css,
 * src/data/fotoblok.js, scripts/fotoblok.mjs). Wat hier vastligt:
 *   1 · de bron: elk blok heeft zijn eigen foto, geen enkele met een merknaam (E10 – E13); de beelden bestaan in twee
 *       maten en twee soorten, zijn licht (≤ 40 kB) en alleen blauw (nergens warm: elk punt blauw ≥ rood);
 *   2 · de opmaak: fotoblok.css zit in de Layout, met een webp-terugval, glas met een terugval zonder backdrop-filter en
 *       hoog contrast; het slot omsluit zijn tekst met .fb-glas in alle acht componenten; geen posterkleur meer op die
 *       blokken;
 *   3 · in de browser (1440 en 390): elk blok heeft zijn foto (met het teken uit de inhoud in de naam), de tekst haalt
 *       op het slechtste beeldpunt minstens 4,5 : 1, alle tekst van het slot ligt op de plaat, de witte V op de 404
 *       minstens 3 : 1.
 *   node tests/fotoblok-browser.test.mjs        (eerst de build)
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { FOTOBLOKKEN, FOTOBLOK_MATEN, FOTOBLOK_NIET } from '../src/data/fotoblok.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

console.log('\nVISUAILS — de fotoblokken (lijst 86)\n\n1 · de bron');
const blokken = Object.keys(FOTOBLOKKEN);
ok('vier blokken, elk een eigen foto', blokken.join() === 'proef,slot,brief,nf' && new Set(Object.values(FOTOBLOKKEN).map((b) => b.bron)).size === 4);
ok('elke bronfoto staat in public/img/', blokken.every((b) => fs.existsSync(path.join(ROOT, 'public', 'img', FOTOBLOKKEN[b].bron))));
ok('geen bronfoto met een merknaam of herkenbaar figuur (E10 – E13)', blokken.every((b) => !FOTOBLOK_NIET.some((re) => re.test(FOTOBLOKKEN[b].bron))), blokken.map((b) => FOTOBLOKKEN[b].bron).join(', '));
for (const b of blokken) {
  let alle = true, groot = 0, warm = 0;
  for (const m of FOTOBLOK_MATEN) for (const s of ['avif', 'webp']) {
    const f = path.join(ROOT, 'src', 'assets', 'fotoblok', `${b}-${m}.${s}`);
    if (!fs.existsSync(f)) { alle = false; continue; }
    groot = Math.max(groot, fs.statSync(f).size);
    if (s === 'webp') { const { data } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); for (let i = 0; i < data.length; i += 3) if (data[i] > data[i + 2] + 6) warm++; }
  }
  ok(`${b}: 800 en 1600, avif en webp, hoogstens 40 kB (grootste ${(groot / 1024).toFixed(1)} kB), en nergens warm (${warm} punten rood > blauw)`, alle && groot <= 40 * 1024 && warm === 0);
}

console.log('\n2 · de opmaak');
const css = lees('src/styles/fotoblok.css');
ok('Layout.astro laadt fotoblok.css', /import '\.\.\/styles\/fotoblok\.css';/.test(lees('src/layouts/Layout.astro')));
ok('elk blok: eerst webp (elke browser), dan avif via image-set in een eigen regel', blokken.every((b) => css.includes(`url("../assets/fotoblok/${b}-1600.webp") 50% 50% / cover no-repeat !important`) && css.includes(`image-set(url("../assets/fotoblok/${b}-1600.avif") type("image/avif")`) && css.includes(`url("../assets/fotoblok/${b}-800.webp")`)));
ok('het glas: 58 % inkt, backdrop-filter, en zonder backdrop-filter 80 % inkt', css.includes('rgba(11, 15, 23, .58)') && css.includes('backdrop-filter: blur(22px) saturate(150%) brightness(.82)') && /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\) \{[^}]*background: rgba\(11, 15, 23, \.8\)/.test(css));
ok('hoog contrast: de foto weg, het vlak in de systeemkleur', /@media \(forced-colors: active\) \{[\s\S]*background: Canvas !important/.test(css));
const comps = ['OverHal', 'ModelsHal', 'HooksHal', 'LookDetailHal', 'BrandModelHal', 'EditionsHal', 'VideoHal', 'VideoStyleHal'];
ok('het slot omsluit zijn tekst met .fb-glas, in alle acht componenten', comps.every((c) => { const s = lees(`src/components/${c}.astro`); const i = s.indexOf('class="h-lk-slot'); return i > 0 && s.indexOf('<div class="fb-glas">', i) > i && s.indexOf('<div class="fb-glas">', i) < s.indexOf('</section>', i); }), comps.join(', '));
ok('geen posterkleur meer op het €1-blok, het slot en de 404', !/inktblok\(\)/.test(lees('src/scripts/posterkleur.js')) && !/pkKlasse/.test(lees('src/components/NotFoundHal.astro')) && !/\.h-lk-slot\.pk \{|\.h-proef-woord\.pk \{/.test(lees('src/styles/posterkleur.css')));

const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
console.log('\n3 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const FOTO_MS = 120000;
const browser = await chromium.launch({ executablePath: browserPad(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function open(opties = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', ...opties });
  const page = await ctx.newPage();
  page.setDefaultTimeout(FOTO_MS); page.setDefaultNavigationTimeout(FOTO_MS);
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#cc-bar, .wa-dock { display: none !important; } .site-header { visibility: hidden !important; }';  /* de balk ligt anders over een hoog blok heen (de telefoon) */ document.head.append(s); }); });
  return { ctx, page };
}
const STIL = '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; } #cc-bar, .wa-dock { display: none !important; }';
const pixels = async (buf) => { const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };

/**
 * Het slechtste beeldpunt onder de tekst: drie keer dezelfde plek. `kaal` zonder de tekst (de grond met korrel), `masker` de
 * tekst zwart op wit (alles wat geen tekst is weg). Onder het masker, 2 px verbreed, de laagste verhouding tussen de kleur
 * van de tekst en de grond eronder.
 */
async function slechtsteTekst(page, wortel, tekst, tekstKleur = [255, 255, 255]) {
  const el = await page.$(wortel);
  if (!el) return { r: 0, n: 0, fout: `${wortel} niet gevonden` };
  /* in het midden van het scherm, weg van de balk bovenin (die er anders overheen kan liggen) */
  /* (niet in de opening: een sprong daar start de rit) */
  /* (levering 90: met het effect op de rustplek van de laptop, het podium onder de balk; verder in de baan start de video) */
  if (await page.evaluate((w) => !!document.querySelector(w).closest('.o8') && document.documentElement.classList.contains('o8-aan'), wortel)) {
    await page.evaluate(() => scrollTo({ top: document.querySelector('.o8-baan').getBoundingClientRect().top + scrollY - 56, behavior: 'instant' }));
    await page.waitForFunction(() => window.__o8Stand?.().fase === 'rust' && document.querySelector('[data-o8-beeld]').complete, null, { timeout: 30000 }).catch(() => {});
  } else if (await page.evaluate((w) => !!document.querySelector(w).closest('.o8'), wortel)) await el.scrollIntoViewIfNeeded();
  else await page.evaluate((w) => { const e = document.querySelector(w); if (!e.closest('.site-header')) e.scrollIntoView({ block: 'center' }); }, wortel);
  await page.waitForTimeout(350);
  const vak = await el.boundingBox();
  const vp = page.viewportSize();
  const clip = { x: Math.max(0, vak.x), y: Math.max(0, vak.y), width: Math.min(vak.width, vp.width - Math.max(0, vak.x)), height: Math.min(vak.height, vp.height - Math.max(0, vak.y)) };
  if (tekstKleur === 'auto') tekstKleur = await page.$eval(`${wortel} ${tekst[0]}`.trim(), (e) => getComputedStyle(e).color.match(/\d+/g).slice(0, 3).map(Number));
  /* De site staat in @layer basis, en daar wint een !important van elke !important buiten een laag. Een style-attribuut
     met !important gaat er wel boven (de cascade kijkt eerst naar het element, dan naar de lagen): dus zetten we het zo. */
  const zet = (stap) => page.evaluate(([wortel, tekst, stap, stil]) => {
    let st = document.getElementById('meet-stil'); if (!st) { st = document.createElement('style'); st.id = 'meet-stil'; st.textContent = stil; document.head.append(st); }
    const root = document.querySelector(wortel);
    const alle = [root, ...root.querySelectorAll('*')];
    for (const e of [document.documentElement, document.body]) if (e.hasAttribute('data-m-oud')) { const o = e.getAttribute('data-m-oud'); if (o === '\u0001') e.removeAttribute('style'); else e.setAttribute('style', o); if (stap === 'terug') e.removeAttribute('data-m-oud'); }
    for (const e of alle) { if (!e.hasAttribute('data-m-oud')) e.setAttribute('data-m-oud', e.getAttribute('style') ?? '\u0001'); const o = e.getAttribute('data-m-oud'); if (o === '\u0001') e.removeAttribute('style'); else e.setAttribute('style', o); }
    root.classList.remove('fb-meet');
    if (stap === 'terug') { for (const e of alle) e.removeAttribute('data-m-oud'); st.remove(); return; }
    const tk = new Set(tekst.flatMap((t) => (t ? [...root.querySelectorAll(t)] : [root])).flatMap((e) => [e, ...e.querySelectorAll('*')]));
    const z = (e, k, v) => e.style.setProperty(k, v, 'important');
    if (stap === 'kaal') {
      /* ook de achtergrond van de letters zelf (een kop in de kopletter kan zijn kleur als background-clip: text dragen) */
      for (const e of tk) { z(e, 'color', 'transparent'); z(e, '-webkit-text-fill-color', 'transparent'); z(e, 'text-decoration-color', 'transparent'); z(e, 'fill', 'transparent'); z(e, 'stroke', 'transparent'); if (e !== root) z(e, 'background', 'transparent'); }
    } else {
      for (const e of alle) {
        if (tk.has(e)) { z(e, 'visibility', 'visible'); z(e, 'color', '#000'); z(e, '-webkit-text-fill-color', '#000'); z(e, 'fill', '#000'); z(e, 'stroke', 'none'); z(e, 'text-shadow', 'none'); if (e !== root) { z(e, 'background', 'transparent'); z(e, 'box-shadow', 'none'); } }
        else z(e, 'visibility', 'hidden');
      }
      z(root, 'visibility', 'visible'); z(root, 'background', '#fff'); z(root, 'box-shadow', 'none');
      /* fotoblok: de plaat is een ::before van het blok; in het masker hoort hij weg (anders telt hij als tekst) */
      root.classList.add('fb-meet'); if (!document.getElementById('fb-meet')) { const m = document.createElement('style'); m.id = 'fb-meet'; m.textContent = '.fb-meet::before, .fb-meet .fb-glas { background: none !important; box-shadow: none !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }'; document.head.append(m); }
      /* de rest van de pagina weg (wat over de plek heen valt, telt niet als tekst op het stukje) */
      for (const e of [document.documentElement, document.body]) { if (!e.hasAttribute('data-m-oud')) e.setAttribute('data-m-oud', e.getAttribute('style') ?? '\u0001'); }
      z(document.body, 'visibility', 'hidden'); z(document.documentElement, 'background', '#fff'); z(document.body, 'background', '#fff');
    }
  }, [wortel, tekst, stap, STIL]);
  await zet('kaal'); await page.waitForTimeout(60);
  const kaal = await pixels(await page.screenshot({ clip, timeout: FOTO_MS }));
  await zet('masker'); await page.waitForTimeout(60);
  const mBuf = await page.screenshot({ clip, timeout: FOTO_MS }); const masker = await pixels(mBuf);
  if (process.env.MEET_UIT) { fs.mkdirSync(process.env.MEET_UIT, { recursive: true }); const k = wortel.replace(/[^a-z0-9]+/gi, '_'); fs.writeFileSync(path.join(process.env.MEET_UIT, `${k}-masker.png`), mBuf); fs.writeFileSync(path.join(process.env.MEET_UIT, `${k}-kaal.png`), await sharp(kaal.data, { raw: { width: kaal.w, height: kaal.h, channels: 3 } }).png().toBuffer()); }
  await zet('terug');
  const { w, h } = kaal, aan = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (masker.data[i * 3] < 140 && masker.data[i * 3 + 2] < 140) aan[i] = 1;
  const breed = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!aan[y * w + x]) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) breed[Y * w + X] = 1; } }
  const Lt = L(...tekstKleur);
  let r = 99, n = 0;
  for (let i = 0; i < w * h; i++) { if (!breed[i]) continue; n++; r = Math.min(r, ratio(Lt, L(kaal.data[i * 3], kaal.data[i * 3 + 1], kaal.data[i * 3 + 2]))); }
  return { r, n };
}


/* elk blok op een paar pagina's, op de computer en de telefoon */
const PLEKKEN = [
  ['/nl/', '.h-proef > .h-proef-woord', 'proef', ['.h-kop', '.h-pil', 'p:not(.h-acties)']],
  ['/nl/pricing/', '.h-proef > .h-proef-woord', 'proef', ['.h-kop', '.h-pil', 'p:not(.h-acties)']],
  ['/test-sample/', '.h-proef > .h-proef-woord', 'proef', ['.h-kop', '.h-pil', 'p:not(.h-acties)']],
  ['/nl/about/', '.h-lk-slot', 'slot', ['.fb-glas > .h-kop', '.fb-glas > .h-pil', '.fb-glas > p:not(.h-acties)']],
  ['/nl/editions/', '.h-lk-slot', 'slot', ['.fb-glas > .h-kop', '.fb-glas > .h-pil', '.fb-glas > p:not(.h-acties)']],
  ['/catalog/custom/', '.h-lk-slot', 'slot', ['.fb-glas > .h-kop', '.fb-glas > .h-pil', '.fb-glas > p:not(.h-acties)']],
  ['/nl/hooks/', '.h-lk-slot', 'slot', ['.fb-glas > .h-kop', '.fb-glas > .h-pil', '.fb-glas > p:not(.h-acties)']],
  ['/nl/about/', '.site-footer .sb', 'brief', ['.sb-kop', '.sb-zin', '.sb-noot']],
  ['/nl/guides/', '.h-gd-brief', 'brief', ['.sb-kop', '.sb-zin', '.sb-noot']],
  ['/nl/editions/', '.h-ed-brief', 'brief', ['.sb-kop', '.sb-zin', '.sb-noot']],
];
for (const [breed, hoog] of [[1440, 900], [390, 844]]) {
  const telefoon = breed < 600;
  for (const [pad, wortel, blok, tekst] of PLEKKEN) {
    const { ctx, page } = await open({ viewport: { width: breed, height: hoog }, deviceScaleFactor: 2, ...(telefoon ? { isMobile: true, hasTouch: true } : {}) });
    /* levering 94: op de voorpagina laadt de bannervideo (14 MB, zonder bereikverzoeken bij deze testserver) door; dan 'load' */
    await page.goto(`${BASIS}${pad}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => page.waitForTimeout(500));
    const bg = await page.$eval(wortel, (e) => getComputedStyle(e).backgroundImage);
    const naam = new RegExp(`/_astro/${blok}-${telefoon ? 800 : 1600}\\.[\\w-]+\\.(avif|webp)`);
    const t = await slechtsteTekst(page, wortel, tekst.map((s) => `${wortel} ${s}`.replace(wortel + ' ', '')), [255, 255, 255]);
    /* op het slot: elk stuk tekst binnen de plaat */
    let buiten = [];
    if (blok === 'slot') buiten = await page.$eval(wortel, (s) => { const p = s.querySelector('.fb-glas').getBoundingClientRect(); const uit = []; const w = document.createTreeWalker(s.querySelector('.fb-glas'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.trim() || !n.parentElement.offsetParent) continue; const g = document.createRange(); g.selectNodeContents(n); for (const r of g.getClientRects()) if (r.width && (r.left < p.left - .5 || r.right > p.right + .5 || r.top < p.top - .5 || r.bottom > p.bottom + .5)) uit.push(n.textContent.trim().slice(0, 30)); } return uit; });
    ok(`${breed} ${pad} ${blok}: de foto (${(bg.match(/\/_astro\/[^"')]+/) || ['geen'])[0]}), wit op het slechtste punt ${t.r.toFixed(2)} : 1${blok === 'slot' ? ', alle tekst op de plaat' : ''}`, naam.test(bg) && t.n > 200 && t.r >= 4.5 && buiten.length === 0, `${bg.slice(0, 90)} ${t.fout || ''} ${buiten.join(' | ')}`);
    await ctx.close();
  }
  const { ctx, page } = await open({ viewport: { width: breed, height: hoog }, deviceScaleFactor: 2, ...(telefoon ? { isMobile: true, hasTouch: true } : {}) });
  await page.goto(`${BASIS}/nl/404.html`, { waitUntil: 'networkidle' });
  const v = await slechtsteTekst(page, '.h-nf-getal', ['.h-nf-v']);
  const kl = await page.$eval('.h-nf-getal', (e) => e.className);
  ok(`${breed} de 404: de witte V op de foto minstens 3 : 1 (slechtste ${v.r.toFixed(2)}), zonder posterkleur`, v.r >= 3 && v.n > 200 && !/\bpk\b/.test(kl), kl);
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
