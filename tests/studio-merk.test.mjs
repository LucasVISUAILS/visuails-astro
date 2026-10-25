/**
 * Levering 57 — Studio, /admin en de privélink in de ontwerptaal (17 oktober 2026).
 *
 * Lucas (afvinklijst 35, v35-studio a): "ook daar het logo-effect en de nieuwe iconen",
 * en (09:30) "Zorg dat alles consistent is". Wat hier vastligt:
 *   · het woordmerk met de elektrische lijn komt uit één bron (woordmerkSvg) en staat in
 *     Studio, op de losse kaarten van Studio, in /admin en op de privélink;
 *   · de pagina's die global.css niet laden, hebben de beweging zelf (account.css,
 *     admin.css, portal.css), met "minder beweging" en zonder data-URL's;
 *   · Studio heeft geen lijniconen meer (alleen zon en maan, die nergens staan);
 *   · het vinkje dat goedkeurt zet zich alleen op het beeld dat je net goedkeurde (:target).
 *
 * Levering 68 (24 oktober 2026, lijst 55 logo a): de elektrische lijn is weg. Het woordmerk
 * staat stil en zijn kleur schommelt van inkt naar blauw uur en terug: een tweede pad
 * (.mk-kleur) op de vulling, en alleen de dekking beweegt (vs-schommel, 3,6 s).
 */
import fs from 'node:fs';
import { woordmerkSvg } from '../src/data/wordmarkPath.js';
import { WOORDMERK, WOORDMERK_LIJNEN } from '../src/data/woordmerk.js';
import { IKOON, ikoon } from '../src/data/iconen.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('het woordmerk met de schommel');
{
  const s = woordmerkSvg('st-woordmerk');
  ok('klasse mk erbij, eerst de vulling en de blauwe laag erop', /^<svg class="st-woordmerk mk"/.test(s) && s.indexOf('mk-fill') < s.indexOf('mk-kleur'));
  ok('  geen elektrische lijn meer', !s.includes('mk-line') && !/pathLength/.test(s));
  ok('  de vulling is het ene even-oneven pad', s.includes(`<path class="mk-fill" fill-rule="evenodd" d="${WOORDMERK.d}"/>`));
  ok('  de blauwe laag is hetzelfde pad', s.includes(`<path class="mk-kleur" fill-rule="evenodd" d="${WOORDMERK.d}"/>`));
  ok('  geen inline stijl (de CSP van Studio en het portaal)', !/style=/.test(s));
  ok('Studio (de zijbalk en het inlogscherm) gebruikt woordmerkSvg', /woordmerkSvg\('st-woordmerk'\)/.test(lees('src/layouts/StudioLayout.astro')) && (lees('src/layouts/StudioLayout.astro').match(/set:html=\{MERK_SVG\}/g) || []).length === 2);
  ok('  de losse kaarten van Studio, /admin en de privélink ook', /MERKBALK = `[^`]*\$\{woordmerkSvg\('woordmerk'\)\}/.test(lees('src/lib/account.js')) && /const MERK = woordmerkSvg\('woordmerk'\);/.test(lees('src/lib/admin.js')) && /\$\{woordmerkSvg\('woordmerk'\)\}<\/span>/.test(lees('src/lib/portal.js')));
  for (const f of ['public/account.css', 'public/admin.css', 'public/portal.css']) {
    const css = lees(f);
    ok(`${f}: de schommel (vs-schommel, 3,6 s) onder de muis en bij focus`, /@keyframes vs-schommel/.test(css) && /\.mk \{ --vs-amp: 0; animation: vs-schommel 3\.6s linear infinite paused;/.test(css) && /a:hover > \.mk, a:focus-visible > \.mk/.test(css));
    ok(`  ${f}: de kleur beweegt als een slinger, (1 − cos t) / 2`, /opacity: calc\(var\(--vs-amp\) \* \(1 - cos\(var\(--vs-fase\) \* 360deg\)\) \/ 2\)/.test(css));
    ok(`  ${f}: bij minder beweging geen schommel, meteen blauw`, /prefers-reduced-motion: reduce\) \{\s*\.mk \{ animation: none; transition: none; \}\s*\.mk \.mk-kleur \{ opacity: var\(--vs-amp\); \}/.test(css));
    ok(`  ${f}: geen data-URL`, !/url\(\s*["']?data:/.test(css));
  }
  const sh = lees('src/styles/studio-hal.css');
  ok('Studio: rechts knipt het vak (dichtgeklapt alleen de V)', /body\.studio \.st-merk \{ overflow: visible; clip-path: inset\(-10px 0 -10px -10px\);/.test(sh));
  ok('  de schommel naar blauw uur, in het donkere thema naar blauw licht', /body\.studio \.st-merk \{[^}]*--mk-kleur: #25508B;/.test(sh) && /body\.studio\.on-ink \.st-merk \{[^}]*--mk-kleur: #80A7DD;/.test(sh));
}

console.log('\nde iconen');
{
  ok('drie nieuwe in het kit: raster, persoon, oog', ['raster', 'persoon', 'oog'].every((n) => typeof IKOON[n] === 'string' && /^M[\d .LMZ-]+Z$/.test(IKOON[n])));
  ok('  gevuld, met de klasse i erbij', /^<svg class="ik ik-oog i"/.test(ikoon('oog', 'i')));
  const acc = lees('src/lib/account.js');
  const lijn = (acc.match(/^const ICON_\w+ = '<svg[^\n]*';$/gm) || []).map((r) => r.slice(6, r.indexOf(' =')));
  ok('Studio: geen lijniconen meer behalve zon en maan (die nergens staan)', lijn.sort().join(',') === 'ICON_MAAN,ICON_ZON', lijn.join(','));
  ok('  de navigatie uit het kit', /const ICON_OVERVIEW = ikoon\('raster', 'i'\);/.test(acc) && /const ICON_DETAILS = ikoon\('persoon', 'i'\);/.test(acc) && /const ICON_CHECK = ikoon\('oog', 'i'\);/.test(acc));
  ok('  ook uitloggen', /ikoon\('pijl', 'st-uit-ik'\)/.test(lees('src/layouts/StudioLayout.astro')) && !/stroke-width="1\.7"/.test(lees('src/layouts/StudioLayout.astro')));
}

console.log('\nhet vinkje dat goedkeurt');
{
  const b = lees('src/components/studio/Beeld.astro');
  ok('in drie delen (kort, lang, vlag), alleen bij een goedgekeurd beeld', /class="kort"/.test(b) && /class="lang"/.test(b) && /class="vlag"/.test(b) && /v\.badge\.kind === 'approved' && <Fragment set:html=\{VINK3\} \/>/.test(b));
  const sh = lees('src/styles/studio-hal.css');
  ok('  het beweegt alleen op het beeld van zojuist (:target), in stappen', /\.st-beeld:target \.st-vink3 \.vlag \{ animation: st-vlag \.5s steps\(1, end\)/.test(sh));
  ok('  en niet bij minder beweging', /prefers-reduced-motion: reduce\)\s*\{\s*body\.studio \.st-vink3 path \{ animation: none !important; \}/.test(sh));
  ok('de privélink: hetzelfde vinkje, stil', /state approved">\$\{VINK3\}/.test(lees('src/lib/portal.js')));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
