/*
 * LIJST 87 · R90-S2, R90-I1, E13 — PAGINA'S EN BEELDEN (9 november 2026)
 *
 *   R90-S2 · de 404 had als canonical en als Engelse taallink https://visuails.com/404/, en die bestaat
 *            niet; /nl/404/ was een gewone pagina (200) naast de echte 404. Nu: geen canonical, geen
 *            taallinks en geen og:url op de 404 (Layout-prop `foutpagina`), de taalknop naar / en /nl/,
 *            en scripts/sitemap-and-404.mjs haalt de map nl/404/ weg nadat hij nl/404.html heeft gezet.
 *   R90-I1 · /voorbeeld/uitleg/ en /voorbeeld/voorpagina/ (en NL) droegen werknotities op een publiek
 *            adres. De vier bestanden zijn weg, met een 301 naar / en /nl/.
 *   E13    · "STUDIO 95" (banners-05) en de vier beelden uit de map "Room 84" (het shirt met "ABANDON")
 *            zijn vervangen door eigen beelden zonder merk, logo of leesbare tekst: banners-12 en de roze
 *            jeans van het voorbeeld (ba2-na-*). De oude bestanden staan niet meer in public/img.
 *
 *   node tests/lijst87-u-paginas.test.mjs
 */
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const bestaat = (p) => existsSync(path.join(ROOT, p));

/* ── R90-S2 ── */
console.log('\nR90-S2 · de 404');
{
  const L = lees('src/layouts/Layout.astro');
  ok('Layout kent de prop `foutpagina`', /foutpagina\?: boolean;/.test(L) && /noindex = false, foutpagina = false,/.test(L));
  ok('  zonder canonical en zonder taallinks', L.includes('{!foutpagina && <link rel="canonical" href={canonical} />}') && L.includes('{!foutpagina && alternates.map('));
  ok('  en zonder og:url', L.includes('{!foutpagina && <meta property="og:url" content={canonical} />}'));
  ok('  de drie taalknoppen naar de voorpagina (taalBase)', (L.match(/localizedPath\(l, taalBase\)/g) || []).length === 3 && !/localizedPath\(l, base\)/.test(L) && /const taalBase = foutpagina \? '\/' : base;/.test(L));
  for (const p of ['src/pages/404.astro', 'src/pages/nl/404.astro', 'src/pages/nl/[...pad].astro']) {
    ok(`${p}: noindex foutpagina`, /<Layout [^>]*\bnoindex foutpagina>/.test(lees(p)));
  }
  /* de bouwstap, op een nagemaakte dist */
  const tmp = mkdtempSync(path.join(tmpdir(), 'l87-404-'));
  mkdirSync(path.join(tmp, 'nl', '404'), { recursive: true });
  writeFileSync(path.join(tmp, 'nl', '404', 'index.html'), '<html lang="nl"><head><meta name="robots" content="noindex, follow"></head><body>Pagina niet gevonden</body></html>');
  writeFileSync(path.join(tmp, '404.html'), '<html lang="en"><head><meta name="robots" content="noindex, follow"></head><body>Page not found</body></html>');
  writeFileSync(path.join(tmp, 'index.html'), '<html lang="en"><head><meta name="robots" content="index, follow"></head><body>Home</body></html>');
  const { default: sitemapAnd404 } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'sitemap-and-404.mjs')).href);
  const log = [];
  await sitemapAnd404().hooks['astro:build:done']({ dir: pathToFileURL(tmp + path.sep), logger: { info: (m) => log.push(m), warn: (m) => log.push(m) } });
  ok('de bouwstap zet nl/404.html neer', existsSync(path.join(tmp, 'nl', '404.html')) && /Pagina niet gevonden/.test(readFileSync(path.join(tmp, 'nl', '404.html'), 'utf8')));
  ok('  en haalt de map nl/404/ weg (geen 200 meer op /nl/404/)', !existsSync(path.join(tmp, 'nl', '404')), readdirSync(path.join(tmp, 'nl')).join(','));
  ok('  de sitemap noemt geen 404', !/<loc>[^<]*404/.test(readFileSync(path.join(tmp, 'sitemap.xml'), 'utf8')));
  rmSync(tmp, { recursive: true, force: true });
  /* de route die de Nederlandse 404 ophaalt, vraagt nog steeds /nl/404 (= nl/404.html) */
  ok('src/lib/vaste404.js haalt /nl/404 op (het platte bestand)', /new URL\('\/nl\/404', url\)/.test(lees('src/lib/vaste404.js')));
}

/* ── R90-I1 ── */
console.log('\nR90-I1 · de twee voorbeeldpagina\'s');
{
  for (const p of ['src/pages/voorbeeld/uitleg.astro', 'src/pages/voorbeeld/voorpagina.astro', 'src/pages/nl/voorbeeld/uitleg.astro', 'src/pages/nl/voorbeeld/voorpagina.astro']) ok(`${p} is weg`, !bestaat(p));
  const r = lees('public/_redirects').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.trim().split(/\s+/));
  const doel = (b) => (r.find(([x]) => x === b) || []).slice(1).join(' ');
  for (const p of ['uitleg', 'voorpagina']) {
    for (const s of ['', '/']) {
      ok(`/voorbeeld/${p}${s} → / 301`, doel(`/voorbeeld/${p}${s}`) === '/ 301');
      ok(`/nl/voorbeeld/${p}${s} → /nl/ 301`, doel(`/nl/voorbeeld/${p}${s}`) === '/nl/ 301');
    }
  }
}

/* ── E13 ── teruggedraaid op 9 november 2026: Room 84 en STUDIO 95 zijn verzonnen merken (Lucas: alle beelden in
   'Catalog Custom styles' zijn bruikbaar). Ze staan er weer zoals vóór lijst 87. */
console.log('\nE13 · Room 84 en STUDIO 95 terug');
{
  const G = JSON.parse(lees('src/data/galerij80.json'));
  const alle = G.rijen.flat();
  ok('de galerij op de voorpagina heeft weer de vier Room 84-beelden', alle.filter((x) => /room84/.test(x.src)).length === 4);
  ok('  nog steeds 21 beelden (12 lifestyle, 9 catalog)', G.rijen[0].length === 12 && G.rijen[1].length === 9);
  ok('  elk bestand ligt er (webp en avif, en de veeg)', alle.every((x) => x.bronnen.every(([, p]) => bestaat(`public${p}.webp`) && bestaat(`public${p}.avif`)) && bestaat(`public${x.veeg}`)),
    alle.filter((x) => !bestaat(`public${x.veeg}`)).map((x) => x.veeg).join(' '));
  ok('banners-05 staat weer in public/img', ['banners-05.webp', 'banners-05.avif', 'banners-05-w380.webp', 'banners-05-w380.avif'].every((f) => bestaat(`public/img/${f}`)));
  ok('/gallery: banners-05 op plek 5', /\[1, 2, 3, 4, 5, 6, 7, 8\]\.map\(\(n\) => \(\{ src: `\/img\/banners-0\$\{n\}\.webp`/.test(lees('src/components/GalleryHal.astro')));
  ok('/video/motion: banners-05 in de strook', /\{ src: '\/img\/banners-05\.webp', w: 928, h: 1152 \}/.test(lees('src/components/VideoStyleHal.astro')));
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
