/**
 * Ronde 91, A05 (9 november 2026): geen werknotities in wat bezoekers krijgen.
 *
 * scripts/commentaar-uit-de-pagina.mjs haalde sinds ronde 9 het commentaar uit
 * elke gebouwde HTML-pagina, maar niet uit de vaste bestanden die rechtstreeks uit
 * public/ in dist/ komen: admin.css, account.css, portal.css, feedback.css,
 * admin-voorvertoning.css en admin-voorvertoning.js. Die waren voor de helft
 * werknotitie, met citaten van Lucas, voor iedereen te lezen. Nu loopt dezelfde
 * stap er ook overheen (esbuild, alleen witruimte en commentaar). De bron in
 * public/ blijft zoals hij is. Draai: node tests/blind91-a-css-notities.test.mjs
 */
import { readFileSync, existsSync, mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { VASTE_BESTANDEN, bestandZonderCommentaar, commentaarUitDeBouw } from '../scripts/commentaar-uit-de-pagina.mjs';

let goed = 0, fout = 0;
function ok(naam, waar, detail = '') {
  if (waar) goed++; else fout++;
  console.log(`${waar ? ' ok  ' : ' FAIL'} ${naam}${waar ? '' : `  ${detail}`}`);
}
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const lees = (p) => readFileSync(join(ROOT, p), 'utf8');
const loader = (n) => (n.endsWith('.css') ? 'css' : 'js');
/* 9 november 2026 (ronde 91, w9): zonder minifyIdentifiers. esbuild kiest de korte namen naar hoe vaak
   een letter in het bestand staat, commentaar meegeteld; met het sleepvakscript erbij in
   admin-voorvertoning.js gaf dat met en zonder commentaar andere namen (s tegen f) voor precies dezelfde
   code. Witruimte en syntaxis blijven samengeperst: een regel of waarde die verandert, valt nog steeds op. */
const minify = (n, code) => transformSync(code, { loader: loader(n), minifyWhitespace: true, minifySyntax: true, legalComments: 'none', logLevel: 'silent' }).code;
const commentaar = (t) => (t.match(/\/\*[\s\S]*?\*\//g) || []).length;

console.log('\nelk vast bestand: zonder notities, en verder precies hetzelfde');
for (const n of VASTE_BESTANDEN) {
  const bron = lees(`public/${n}`);
  const na = bestandZonderCommentaar(n, bron);
  ok(`${n}: had commentaar (${commentaar(bron)} blokken)`, commentaar(bron) > 0);
  ok(`  zonder commentaar en zonder "Lucas"`, commentaar(na) === 0 && !/Lucas/.test(na), `${commentaar(na)} blokken, Lucas ${(na.match(/Lucas/g) || []).length}×`);
  ok(`  kleiner (${bron.length} → ${na.length} bytes)`, na.length < bron.length);
  ok('  na minify gelijk aan de bron: geen regel of waarde veranderd', minify(n, na) === minify(n, bron));
}

console.log('\nwat geen commentaar is, blijft staan; wat niet te lezen is, blijft zoals het was');
ok('"/*" in een CSS-tekenreeks blijft', /content:"\/\* geen commentaar \*\/"/.test(bestandZonderCommentaar('x.css', 'a::before { content: "/* geen commentaar */"; } /* weg */')));
ok('"//" in een JS-tekenreeks blijft', /"https:\/\/visuails.com"/.test(bestandZonderCommentaar('x.js', 'const u = "https://visuails.com"; // weg')));
ok('kapotte JS: ongewijzigd', bestandZonderCommentaar('x.js', 'function ( /* x */') === 'function ( /* x */');

console.log('\nde bouwstap zelf, op een nep-dist; public/ blijft onaangeroerd');
{
  const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  const voorPublic = VASTE_BESTANDEN.map((n) => hash(join(ROOT, 'public', n)));
  const dist = mkdtempSync(join(tmpdir(), 'blind91a-'));
  try {
    for (const n of VASTE_BESTANDEN) copyFileSync(join(ROOT, 'public', n), join(dist, n));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><html><!-- notitie --><body>x</body></html>');
    const uit = await commentaarUitDeBouw(dist);
    ok(`alle ${VASTE_BESTANDEN.length} vaste bestanden bewerkt`, uit.bestanden === VASTE_BESTANDEN.length, JSON.stringify(uit));
    ok('en de HTML nog steeds', uit.paginas === 1 && !readFileSync(join(dist, 'index.html'), 'utf8').includes('notitie'));
    ok('in dist/ geen "Lucas" meer', VASTE_BESTANDEN.every((n) => !/Lucas/.test(readFileSync(join(dist, n), 'utf8'))));
    ok('public/ is niet veranderd', VASTE_BESTANDEN.every((n, i) => hash(join(ROOT, 'public', n)) === voorPublic[i]));
    const tweede = await commentaarUitDeBouw(dist);
    ok('een tweede keer verandert niets meer', tweede.bestanden === 0, JSON.stringify(tweede));
  } finally { rmSync(dist, { recursive: true, force: true }); }
}

console.log('\nde uitrol draait de stap');
ok('astro.config.mjs registreert commentaarUitDePagina()', /integrations:\s*\[[^\]]*commentaarUitDePagina\(\)/.test(lees('astro.config.mjs')));
{
  const pkg = JSON.parse(lees('package.json'));
  ok('npm run build is astro build', /^astro build\b/.test(pkg.scripts.build), pkg.scripts.build);
  ok('npm run deploy bouwt eerst', /^npm run build && /.test(pkg.scripts.deploy), pkg.scripts.deploy);
}
ok('scripts/uitrol.mjs (UITROLLEN.bat) zet de site met npm run deploy', /npm run deploy/.test(lees('scripts/uitrol.mjs')) && /node scripts\\uitrol\.mjs/.test(lees('UITROLLEN.bat')));

const gebouwd = join(ROOT, 'dist', 'account.css');
if (existsSync(gebouwd)) {
  console.log('\nde gebouwde site');
  for (const n of VASTE_BESTANDEN) {
    const t = readFileSync(join(ROOT, 'dist', n), 'utf8');
    ok(`dist/${n}: geen commentaar, geen "Lucas"`, commentaar(t) === 0 && !/Lucas/.test(t), `${commentaar(t)} blokken`);
  }
} else console.log('\n  (geen dist/: de controle op de gebouwde site slaat over)');

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
