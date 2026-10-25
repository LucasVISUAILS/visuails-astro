/*
 * DE TELEFOONVERSIE VAN DE GROTE FOTO'S  ·  npm run test:telefoonbeelden
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Levering 66 (20 oktober 2026, afvinklijst 44 vraag 2 = b). De foto's in
 * src/data/telefoonbeelden.js krijgen een kleinere versie (scripts/make-telefoon.mjs)
 * en in de bouw een srcset met sizes="100vw" (scripts/avif-naast-webp.mjs). Deze
 * toets houdt drie dingen vast:
 *
 *   1. de bestanden: elke telefoonversie ligt er, in webp en AVIF, op zijn breedte,
 *      en de kleine AVIF is lichter dan de volle;
 *   2. de bouw: elke <img> van zo'n foto heeft die srcset, en de AVIF-bron ook;
 *   3. de opmaak, in een browser: op elk scherm waar de browser de kleine versie
 *      kiest, laat de foto er niet meer pixels van zien dan die versie heeft. Bij
 *      object-fit: cover in een hoog vak kan dat wel (lifestyle-phone-made-11 op home
 *      heeft 1306 nodig en krijgt daarom 1400). Verandert de opmaak zo, dan zegt deze
 *      toets welke foto, op welke pagina en welk scherm.
 *
 * En dat make-avif.mjs de telefoonversies en de laptopstanden met rust laat.
 *
 * Plus de lookpagina's (LookDetailHal.astro, srcset -w760 en de volle foto): ook daar
 * kiest de browser de -w760 alleen waar die genoeg pixels heeft. Bij een oneven aantal
 * staat de laatste foto over beide kolommen; met sizes 50vw koos een laptop daar de
 * -w760 voor een vak van 1360 px. Dat vond deze toets in levering 66.
 * Leest dist/: draai eerst `npm run build` (de keten doet dat).
 */
import { readFileSync, existsSync, readFile, globSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { TELEFOONBEELDEN, telefoonPad } from '../src/data/telefoonbeelden.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PUB = join(ROOT, 'public');
let goed = 0, totaal = 0;
const check = (naam, kreeg, wil) => {
  totaal++;
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) goed++;
  console.log(`${g ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(66)} ${g ? '' : `verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};
const FOTOS = Object.keys(TELEFOONBEELDEN);

/* ── 1 · de bestanden ─────────────────────────────────────────────────────── */
console.log('\nde bestanden');
const fout1 = [];
for (const src of FOTOS) {
  const vol = join(PUB, src), klein = join(PUB, telefoonPad(src)), kleinAvif = klein.replace(/\.webp$/, '.avif');
  if (!existsSync(vol)) { fout1.push(`${src}: ontbreekt`); continue; }
  const m = await sharp(vol).metadata();
  const { vol: VOL, klein: KLEIN } = TELEFOONBEELDEN[src];
  if (m.width !== VOL) fout1.push(`${src}: ${m.width} px, lijst zegt ${VOL}`);
  if (!existsSync(klein)) { fout1.push(`${telefoonPad(src)}: ontbreekt (node scripts/make-telefoon.mjs)`); continue; }
  const k = await sharp(klein).metadata();
  if (k.width !== KLEIN || k.height !== Math.round(KLEIN * m.height / m.width)) fout1.push(`${telefoonPad(src)}: ${k.width} × ${k.height}`);
  if (!existsSync(kleinAvif)) { fout1.push(`${telefoonPad(src).replace(/\.webp$/, '.avif')}: ontbreekt`); continue; }
  /* de kleine versie moet een telefoon ook echt lichter maken dan de volle foto */
  const volAvif = vol.replace(/\.webp$/, '.avif');
  if (existsSync(volAvif) && statSync(kleinAvif).size >= statSync(volAvif).size) fout1.push(`${telefoonPad(src).replace(/\.webp$/, '.avif')}: ${statSync(kleinAvif).size} B, niet lichter dan de volle (${statSync(volAvif).size} B)`);
}
check(`${FOTOS.length} foto's, elk met een kleinere versie in webp en AVIF`, fout1, []);
const avifBron = readFileSync(join(ROOT, 'scripts', 'make-avif.mjs'), 'utf8');
check('make-avif.mjs laat de laptopstanden en de telefoonversies met rust', /rel\.startsWith\('hal\/stand\/'\)/.test(avifBron) && /rel\.startsWith\('hal\/laptop-'\)/.test(avifBron) && /TELEFOON\.has\(rel\)/.test(avifBron) && /telefoonVersies\(\)/.test(avifBron), true);
check('make-avif.mjs: kwaliteit 64 vanaf 1000 px', /const GROOT = 1000;/.test(avifBron) && /const KWALITEIT_GROOT = 64;/.test(avifBron), true);

/* ── 2 · de bouw ──────────────────────────────────────────────────────────── */
console.log('\nde bouw');
const tag = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/g;
const attr = (t, n) => (t.match(new RegExp(`\\s${n}="([^"]*)"`)) || [])[1];
const paginas = new Map(); // pad → [src]
const fout2 = [];
let keer = 0;
for (const f of globSync('**/*.html', { cwd: DIST }).map((x) => x.replace(/\\/g, '/'))) {
  const h = readFileSync(join(DIST, f), 'utf8');
  for (const m of h.matchAll(tag)) {
    const t = m[0], src = attr(t, 'src');
    if (!src || !TELEFOONBEELDEN[src]) continue;
    const pad = '/' + f.replace(/index\.html$/, '');
    const set = attr(t, 'srcset');
    /* op een lookpagina (LookDetailHal) staat de -w760 ervoor */
    const k760 = src.replace(/\.webp$/, '-w760.webp');
    const wil = `${set && set.startsWith(k760 + ' 760w') ? `${k760} 760w, ` : ''}${telefoonPad(src)} ${TELEFOONBEELDEN[src].klein}w, ${src} ${TELEFOONBEELDEN[src].vol}w`;
    /* een <img> met een eigen srcset (de galerij, de lookpagina's: -w380, -w760, -w1560)
       laat de bouwstap met rust; die telt hier niet mee */
    if (set && !set.includes(telefoonPad(src))) continue;
    if (!paginas.has(pad)) paginas.set(pad, new Set());
    paginas.get(pad).add(src);
    keer++;
    if (set !== wil) fout2.push(`${pad} ${src}: srcset ${set}`);
    if (!attr(t, 'sizes')) fout2.push(`${pad} ${src}: geen sizes`);
    const voor = h.slice(Math.max(0, m.index - 600), m.index);
    const bron = voor.slice(voor.lastIndexOf('<source'));
    if (!bron.includes(`${telefoonPad(src).replace(/\.webp$/, '.avif')} ${TELEFOONBEELDEN[src].klein}w`)) fout2.push(`${pad} ${src}: de AVIF-bron mist de telefoonversie`);
  }
}
check(`elke <img> van die foto's heeft de srcset, sizes en een AVIF-bron (${keer} keer, ${paginas.size} pagina's)`, fout2, []);

/* de lookpagina's: srcset met de -w760, soms de telefoonversie, en de volle foto */
const STAP = /^\/img\/[^ ]+-w760\.webp 760w, (\/img\/[^ ]+-w1[24]00\.webp 1[24]00w, )?\/img\/[^ ]+\.webp \d+w$/;
const looks = new Map(); // pad → aantal
const fout2b = [];
for (const f of globSync('**/*.html', { cwd: DIST }).map((x) => x.replace(/\\/g, '/'))) {
  const h = readFileSync(join(DIST, f), 'utf8');
  for (const m of h.matchAll(tag)) {
    const set = attr(m[0], 'srcset') || '';
    if (!STAP.test(set)) continue;
    const pad = '/' + f.replace(/index\.html$/, '');
    looks.set(pad, (looks.get(pad) || 0) + 1);
    const voor = h.slice(Math.max(0, m.index - 600), m.index);
    const bron = voor.slice(voor.lastIndexOf('<source'));
    const telAvif = /-w1[24]00\.webp 1[24]00w/.test(set) ? /-w1[24]00\.avif 1[24]00w/.test(bron) : true;
    if (!/type="image\/avif"/.test(bron) || !/-w760\.avif 760w/.test(bron) || !telAvif) fout2b.push(`${pad} ${attr(m[0], 'src')}: geen volledige AVIF-bron`);
  }
}
const lookKeer = [...looks.values()].reduce((a, b) => a + b, 0);
check(`lookpagina's: srcset met de -w760 (en de telefoonversie) en een AVIF-bron (${lookKeer} keer, ${looks.size} pagina's)`, lookKeer > 0 && fout2b.length === 0 ? [] : fout2b.length ? fout2b : ['geen enkele'], []);
check('elke foto in de lijst staat ook echt op een pagina', FOTOS.filter((s) => ![...paginas.values()].some((v) => v.has(s))), []);

/* ── 3 · in een browser ───────────────────────────────────────────────────── */
console.log('\nin een browser');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(DIST, p);
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const MATEN = {};
for (const src of FOTOS) { const m = await sharp(join(PUB, src)).metadata(); MATEN[src] = [m.width, m.height]; }
/* De echte keuze van de browser tegen wat de foto laat zien, op telefoons, tablets en
   laptops. De kleine versie mag alleen gekozen worden waar zijn breedte genoeg is. */
const SCHERMEN = [[360, 780, 3], [375, 667, 3], [390, 844, 3], [412, 915, 2.625], [800, 1280, 1.5], [1024, 768, 1], [1180, 820, 1], [1366, 768, 1], [1440, 900, 1]];
const teWeinig = [], opTelefoon = [], lookTeWeinig = [];
let lookGekozen = 0;
for (const [w, h, dpr] of SCHERMEN) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 900, hasTouch: w < 900, reducedMotion: 'reduce' });
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-12T00:00:00Z' })), url: BASIS }]);
  const page = await ctx.newPage();
  for (const [pad, srcs] of paginas) {
    await page.goto(BASIS + pad, { waitUntil: 'load' });
    const r = await page.evaluate(async (srcs) => {
      const imgs = [...document.images].filter((i) => srcs.includes(i.getAttribute('src')) && /-w1[24]00\.webp \d+w/.test(i.getAttribute('srcset') || ''));
      for (const i of imgs) i.loading = 'eager';
      await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; setTimeout(r, 4000); }))));
      return imgs.map((i) => {
        const q = i.getBoundingClientRect(), cs = getComputedStyle(i);
        return { src: i.getAttribute('src'), gekozen: i.currentSrc.split('/').pop(), w: q.width, h: q.height, fit: cs.objectFit, zichtbaar: q.width > 0 && q.height > 0 && cs.visibility !== 'hidden' };
      });
    }, [...srcs]);
    for (const x of r) {
      const klein = TELEFOONBEELDEN[x.src].klein;
      if (!x.zichtbaar || !x.gekozen.includes(`-w${klein}.`)) continue;
      const [nw, nh] = MATEN[x.src];
      let breed = x.w;
      if (x.fit === 'cover') breed = nw * Math.max(x.w / nw, x.h / nh);
      else if (x.fit === 'contain' || x.fit === 'scale-down') breed = nw * Math.min(x.w / nw, x.h / nh);
      if (breed * dpr > klein * 1.0001) teWeinig.push(`${pad} ${x.src} op ${w}×${h}@${dpr}: ${Math.round(breed * dpr)} px nodig`);
      if (w === 390) opTelefoon.push(x.gekozen);
    }
  }
  for (const pad of looks.keys()) {
    await page.goto(BASIS + pad, { waitUntil: 'load' });
    const r = await page.evaluate(async () => {
      const imgs = [...document.images].filter((i) => /^\/img\/[^ ]+-w760\.webp 760w, (\/img\/[^ ]+-w1[24]00\.webp 1[24]00w, )?\/img\/[^ ]+\.webp \d+w$/.test(i.getAttribute('srcset') || ''));
      for (const i of imgs) i.loading = 'eager';
      await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; setTimeout(r, 4000); }))));
      return imgs.map((i) => {
        const q = i.getBoundingClientRect(), cs = getComputedStyle(i);
        return { src: i.getAttribute('src'), gekozen: i.currentSrc.split('/').pop(), nw: +i.getAttribute('width'), nh: +i.getAttribute('height'), w: q.width, h: q.height, fit: cs.objectFit, zichtbaar: q.width > 0 && q.height > 0 && cs.visibility !== 'hidden' };
      });
    });
    for (const x of r) {
      const m = x.gekozen.match(/-w(760)\.(webp|avif)$/);
      if (!x.zichtbaar || !m) continue;
      lookGekozen++;
      let breed = x.w;
      if (x.fit === 'cover') breed = x.nw * Math.max(x.w / x.nw, x.h / x.nh);
      else if (x.fit === 'contain' || x.fit === 'scale-down') breed = x.nw * Math.min(x.w / x.nw, x.h / x.nh);
      if (breed * dpr > +m[1] * 1.0001) lookTeWeinig.push(`${pad} ${x.gekozen} op ${w}×${h}@${dpr}: ${Math.round(breed * dpr)} px nodig`);
    }
  }
  await ctx.close();
}
check('de kleine versie wordt alleen gekozen waar hij genoeg pixels heeft (9 schermen)', teWeinig, []);
check(`lookpagina's: de -w760 alleen waar hij genoeg pixels heeft (${lookGekozen} keer gekozen)`, lookTeWeinig, []);
check('op een telefoon van 390 × 3 laadt hij de kleine versie, als AVIF', opTelefoon.length > 0 && opTelefoon.every((k) => /-w1[24]00\.avif$/.test(k)), true);
await browser.close();
server.close();
console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
