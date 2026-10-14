/* VISUAILS — geen "lifestyle erbij?" meer in het catalogformulier.
 *   npm run test:combi      (vereist een build: npm run build)
 * ══════════════════════════════════════════════════════════════════════════════
 * RONDE 8 — 1 OKTOBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Deze toets bewaakte tot vandaag dat de combi-vraag in /start/catalog het
 * bedrag noemde vóór de klik. Lucas verkoopt catalog + lifestyle niet meer als
 * één dienst ("Allebei? Dan zijn het twee bestellingen, elk tegen zijn eigen
 * prijs."), dus de vraag is weg. Wat nu bewaakt wordt:
 *
 *   1 · /start/catalog (beide talen) draagt geen combi-blok meer en geen link
 *       naar /start/complete;
 *   2 · /start/complete wordt niet meer gebouwd en stuurt met een 301 door naar
 *       /start (8 oktober 2026, punt 9.01: Lucas koos V12 = a), en niets in src/
 *       laadt CombiKeuze nog;
 *   3 · de sitemap noemt /start/complete niet.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (naam, waar, verwacht = true, kreeg = '') => {
  if (waar) { pass += 1; console.log(` ok   ${naam}`); }
  else { fail += 1; console.log(`FAIL   ${naam}`.padEnd(62) + `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`); }
};
const dist = (p) => { const f = new URL(`../dist/${p}`, import.meta.url); return existsSync(f) ? readFileSync(f, 'utf8') : null; };

for (const pad of ['start/catalog/index.html', 'nl/start/catalog/index.html']) {
  const html = dist(pad);
  ok(`${pad} is gebouwd`, !!html, 'bestand', 'ontbreekt');
  if (!html) continue;
  ok(`  geen combi-blok`, !/data-ck-doel|class="ck-/.test(html), true);
  ok(`  geen link naar /start/complete`, !/href="[^"]*\/start\/complete/.test(html), true);
}

/* ── /start/complete IS WEG — 8 oktober 2026 (punt 9.01) ────────────────────
   Tot vandaag eiste deze toets dat de pagina bleef bestaan, op noindex, voor
   oude links. De verkoop is nu dicht: oude links krijgen een 301 naar het
   keuzescherm, en de pagina zelf mag er niet meer staan (een regel in
   _redirects wint het van een echte pagina — zie de kop van dat bestand). */
for (const pad of ['start/complete/index.html', 'nl/start/complete/index.html']) {
  ok(`${pad} wordt niet meer gebouwd`, dist(pad) === null, 'geen bestand', 'gebouwd');
}
{
  const regels = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8')
    .split('\n').map((r) => r.trim()).filter((r) => r && !r.startsWith('#')).map((r) => r.split(/\s+/));
  for (const [bron, doel] of [['/start/complete', '/start/'], ['/start/complete/', '/start/'], ['/nl/start/complete', '/nl/start/'], ['/nl/start/complete/', '/nl/start/']]) {
    const r = regels.find((x) => x[0] === bron);
    ok(`_redirects: ${bron} → ${doel} 301`, !!r && r[1] === doel && r[2] === '301', `${doel} 301`, r ? `${r[1]} ${r[2]}` : '(geen regel)');
  }
}
{
  const loop = (d) => readdirSync(new URL(`../${d}`, import.meta.url), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? loop(`${d}/${e.name}`) : /\.(astro|js|mjs|ts)$/.test(e.name) ? [`${d}/${e.name}`] : []));
  const laders = loop('src').filter((f) => /import\s+CombiKeuze\b|<CombiKeuze\b/.test(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')));
  ok('niets in src/ laadt CombiKeuze nog', laders.length === 0, [], laders);
}

const kaarten = existsSync(new URL('../dist', import.meta.url))
  ? readdirSync(new URL('../dist', import.meta.url)).filter((f) => /^sitemap.*\.xml$/.test(f))
  : [];
const sitemap = kaarten.map((f) => dist(f) || '').join('\n');
ok('er is een sitemap', kaarten.length > 0, '>0', kaarten.length);
ok('  zonder /start/complete', !/\/start\/complete/.test(sitemap), true);

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
