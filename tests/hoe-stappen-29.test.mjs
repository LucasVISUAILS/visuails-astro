/**
 * "Hoe het werkt" op de voorpagina, stap 1 en stap 3 — 15 oktober 2026
 * (afvinklijst 29: v29-stap1 = a, v29-stap3 = a).
 *
 *   node tests/hoe-stappen-29.test.mjs        (leest dist/, dus eerst bouwen)
 *
 *   · stap 1: een lijstje met per verplichte foto een vinkje (de namen uit
 *     shots.js) en daarna "Compleet";
 *   · stap 3: de draagfoto gaat terug voor een revisie ("Revisie: kleur"), komt
 *     opnieuw binnen ("Opnieuw geleverd") en krijgt dan zijn vinkje;
 *   · de tijden: stap 1 3,0 s, stap 3 3,6 s; alles onder .hal, zonder :is();
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

console.log('\nHoe het werkt: stap 1 compleet, stap 3 een revisie\n');
for (const [taal, file] of [['nl', 'dist/nl/index.html'], ['en', 'dist/index.html']]) {
  const h = lees(file);
  const namen = REQUIRED_SHOT_IDS.map((id) => SHOTS.find((x) => x.id === id).name[taal]);
  const lijst = (/<span class="h-stuur-lijst h-glas"[^>]*>([\s\S]*?)<\/span>\s*<figcaption/.exec(h) || [])[1] || '';
  const items = [...lijst.matchAll(/<span class="h-stuur-v[^"]*"[^>]*><i[^>]*>[\s\S]*?<\/i>([^<]+)<\/span>/g)].map((m) => m[1].trim());
  ok(`${taal}: stap 1, het lijstje met de verplichte foto's (${namen.join(', ')})`, items, namen);
  ok(`${taal}:   en "Compleet"`, /<b class="h-stuur-compleet"[^>]*>(Compleet|Complete)<\/b>/.test(lijst), true);
  ok(`${taal}:   aria-hidden (de uitlegzin zegt het al)`, /<span class="h-stuur-lijst h-glas" aria-hidden="true"/.test(h), true);
  ok(`${taal}: stap 3, de revisie op de draagfoto`, /<li class="h-keur-rev[^"]*"[^>]*>[\s\S]*?h-keur-glans[\s\S]*?h-keur-rev-a[^>]*>(Revisie: kleur|Revision: colour)<\/span><span class="h-keur-rev-b"[^>]*>(Opnieuw geleverd|Delivered again)<\/span>/.test(h), true);
  ok(`${taal}: de tijden (3,0 / 12,1 / 3,6 s)`, h.includes('data-uitleg-maat="3000 12100 3600"'), true);
  ok(`${taal}: de uitlegzinnen noemen het`, taal === 'nl'
    ? /We kijken meteen of ze compleet zijn\./.test(h) && /vraagt zo nodig een revisie/.test(h)
    : /We check right away that they are complete\./.test(h) && /ask for a revision if needed/.test(h), true);
}
const css = lees('src/styles/hal.css');
const blok = css.slice(css.indexOf('STAP 1 · COMPLEET, STAP 3 · EEN REVISIE'), css.indexOf('@keyframes h-keur-tekst-b'));
ok('hal.css: alles onder .hal / body.hal, geen :is()', blok.split('\n').filter((r) => /^[^ @/*%].*\{/.test(r) && !/^\s*(from|to|\d)/.test(r)).every((r) => /(^|, )(html\.h-js body\.hal|\.hal) /.test(r)) && !/:is\(/.test(blok), true);
ok('  de vinkjes in stap 1 na de foto\'s (1,3 s), Compleet op 2,2 s', /u-s1 \.h-stuur-v i \{ transition-delay: calc\(var\(--d, 0\) \* 240ms \+ 1\.3s\); \}/.test(css) && /u-s1 \.h-stuur-compleet \{ transition-delay: 2\.2s; \}/.test(css), true);
ok('  het vierde vinkje pas na de revisie (2,55 s), "4 van 4" op 3 s', /u-s3 \.h-keur-rev \.h-vink \{ transition-delay: 2\.55s; \}/.test(css) && /u-s3 \.h-keur figcaption \{ transition-delay: 3s; \}/.test(css), true);
ok('  de revisie alleen terwijl de stap speelt (niet als hij klaar is)', /\.h-hoe\.u-s3:not\(\[data-uitleg-staat="klaar"\]\) \.h-keur-revchip \{ animation:/.test(css), true);
const rustig = css.slice(css.indexOf('html.h-js body.hal .h-keur .h-vink, html.h-js body.hal .h-keur figcaption { opacity: 1 !important'));
ok('  minder beweging: het lijstje staat er af', /\.h-stuur-v i \{ scale: 1 !important;/.test(rustig.slice(0, 600)) && /\.h-stuur-compleet \{ opacity: 1 !important; \}/.test(rustig.slice(0, 600)), true);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
