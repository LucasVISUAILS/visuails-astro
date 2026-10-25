/**
 * "Hoe het werkt" op de voorpagina, stap 1 en stap 3 — 15 oktober 2026
 * (afvinklijst 29: v29-stap1 = a, v29-stap3 = a).
 *
 *   node tests/hoe-stappen-29.test.mjs        (leest dist/, dus eerst bouwen)
 *
 *   · stap 1: een lijstje met per verplichte foto een vinkje (de namen uit
 *     shots.js) en daarna "Compleet";
 *   · stap 3: alleen goedkeuren (Lucas, 15 oktober 20:42: "Het revisie gedeelte
 *     hoeft daar niet"). Vier tikken in een ongelijk tempo, elk met zijn vinkje,
 *     dan "4 van 4 goedgekeurd"; geen revisiechip meer;
 *   · de tijden: stap 1 3,0 s, stap 3 3,0 s; alles onder .hal, zonder :is();
 *     en bij minder beweging staat alles er af.
 */
import { readFileSync, existsSync } from 'node:fs';
import { REQUIRED_SHOT_IDS, SHOTS } from '../src/data/shots.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(70)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
if (!existsSync(new URL('../dist/nl/index.html', import.meta.url))) { console.log(' FAIL er is geen dist/ — bouw eerst'); process.exit(1); }

console.log('\nHoe het werkt: stap 1 compleet, stap 3 goedkeuren\n');
for (const [taal, file] of [['nl', 'dist/nl/index.html'], ['en', 'dist/index.html']]) {
  const h = lees(file);
  const namen = REQUIRED_SHOT_IDS.map((id) => SHOTS.find((x) => x.id === id).name[taal]);
  const lijst = (/<span class="h-stuur-lijst h-glas"[^>]*>([\s\S]*?)<\/span>\s*<figcaption/.exec(h) || [])[1] || '';
  const items = [...lijst.matchAll(/<span class="h-stuur-v[^"]*"[^>]*><i[^>]*>[\s\S]*?<\/i>([^<]+)<\/span>/g)].map((m) => m[1].trim());
  ok(`${taal}: stap 1, het lijstje met de verplichte foto's (${namen.join(', ')})`, items, namen);
  ok(`${taal}:   en "Compleet"`, /<b class="h-stuur-compleet"[^>]*>(Compleet|Complete)<\/b>/.test(lijst), true);
  ok(`${taal}:   aria-hidden (de uitlegzin zegt het al)`, /<span class="h-stuur-lijst h-glas" aria-hidden="true"/.test(h), true);
  const keur = (/<ul class="h-keur-rij"[^>]*>([\s\S]*?)<\/ul>/.exec(h) || [])[1] || '';
  ok(`${taal}: stap 3, vier beelden met elk een vinkje`, (keur.match(/<li\b/g) || []).length === 4 && (keur.match(/class="h-vink"/g) || []).length === 4, true);
  ok(`${taal}:   geen revisie meer (geen chip, geen glans)`, /h-keur-rev|h-keur-glans|Revisie: kleur|Revision: colour|Opnieuw geleverd|Delivered again/.test(h), false);
  ok(`${taal}:   "4 van 4 goedgekeurd"`, /<figcaption class="h-chip h-glas"[^>]*>(4 van 4 goedgekeurd|4 of 4 approved)<\/figcaption>/.test(h), true);
  /* Levering 61 (afvinklijst 39, e-stappen: "iets sneller"): alles op driekwart. Levering 74 (25 okt,
     16:40): stap 2 krijgt na het handwerk de lagen in 3D, en duurt daarom 12,9 s. */
  ok(`${taal}: de tijden (2,25 / 12,9 / 2,25 s)`, h.includes('data-uitleg-maat="2250 12900 2250"'), true);
  ok(`${taal}: de uitlegzinnen noemen het`, taal === 'nl'
    ? /We kijken meteen of ze compleet zijn\./.test(h) && /vraagt zo nodig een revisie/.test(h)
    : /We check right away that they are complete\./.test(h) && /ask for a revision if needed/.test(h), true);
}
const css = lees('src/styles/hal.css');
const blok = css.slice(css.indexOf('STAP 1 · COMPLEET, STAP 3 · GOEDKEUREN'), css.indexOf('@keyframes h-keur-tik'));
ok('hal.css: alles onder .hal / body.hal, geen :is()', blok.split('\n').filter((r) => /^[^ @/*%].*\{/.test(r) && !/^\s*(from|to|\d)/.test(r)).every((r) => /(^|, )(html\.h-js body\.hal|\.hal) /.test(r)) && !/:is\(/.test(blok), true);
ok('  de vinkjes in stap 1 na de foto\'s (0,975 s), Compleet op 1,65 s', /u-s1 \.h-stuur-v i \{ transition-delay: calc\(var\(--d, 0\) \* 180ms \+ \.975s\); \}/.test(css) && /u-s1 \.h-stuur-compleet \{ transition-delay: 1\.65s; \}/.test(css), true);
const tik = (/const KEUR_TIK = \[([^\]]+)\]/.exec(lees('src/components/VoorpaginaHal.astro')) || [])[1]?.split(',').map(Number) || [];
const tussen = tik.slice(1).map((t, i) => Math.round((t - tik[i]) * 100) / 100);
ok('  stap 3: vier tikken, oplopend, en niet gelijk verdeeld', [tik.length, tik.every((t, i) => !i || t > tik[i - 1]), new Set(tussen).size > 1], [4, true, true]);
ok('  het vinkje op de tik (--kt), "4 van 4" na de laatste (1,725 s, binnen de 2,25 s)', /u-s3 \.h-keur \.h-vink \{ transition-delay: var\(--kt, / .test(css) && /u-s3 \.h-keur figcaption \{ transition-delay: 1\.725s; \}/.test(css) && tik[3] + .55 * .75 <= 1.725 + .05, true);
ok('  de tik alleen terwijl de stap speelt (niet als hij klaar is)', /\.h-hoe\.u-s3:not\(\[data-uitleg-staat="klaar"\]\) \.h-keur-rij li \{ animation: h-keur-tik /.test(css), true);
ok('  geen revisieregels meer in hal.css', /h-keur-revchip|h-keur-glans|h-keur-kleur/.test(css), false);
const rustig = css.slice(css.indexOf('html.h-js body.hal .h-keur .h-vink, html.h-js body.hal .h-keur figcaption { opacity: 1 !important'));
ok('  minder beweging: het lijstje staat er af', /\.h-stuur-v i \{ scale: 1 !important;/.test(rustig.slice(0, 600)) && /\.h-stuur-compleet \{ opacity: 1 !important; \}/.test(rustig.slice(0, 600)), true);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
