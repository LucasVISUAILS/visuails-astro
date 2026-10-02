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
 *   2 · /start/complete bestaat nog (oude links, lopende bestellingen) maar
 *       staat op noindex, zodat hij niet opnieuw als dienst gevonden wordt;
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

for (const pad of ['start/complete/index.html', 'nl/start/complete/index.html']) {
  const html = dist(pad);
  ok(`${pad} bestaat nog voor oude links`, !!html, 'bestand', 'ontbreekt');
  if (html) ok('  en staat op noindex', /<meta name="robots" content="noindex/.test(html), true);
}

const kaarten = existsSync(new URL('../dist', import.meta.url))
  ? readdirSync(new URL('../dist', import.meta.url)).filter((f) => /^sitemap.*\.xml$/.test(f))
  : [];
const sitemap = kaarten.map((f) => dist(f) || '').join('\n');
ok('er is een sitemap', kaarten.length > 0, '>0', kaarten.length);
ok('  zonder /start/complete', !/\/start\/complete/.test(sitemap), true);

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
