/* VISUAILS — levering 117 (17 november 2026), proefronde T1-01: het laadscherm wacht niet meer op de hele pagina.
 *
 *   node tests/levering-117-tekst-laadscherm.test.mjs     (geen build nodig: leest de bron van Voorlader80.astro)
 *
 * Op Slow 4G zag een bezoeker van de voorpagina 11,5 s alleen de grijze V: het scherm wachtte op window 'load' (alle
 * beelden), en de noodrem telde 8 s vanaf het script (dat zelf pas op ± 2,5 s draait). Nu wacht het alleen op de
 * letters en het eerste beeld, met een noodrem op 2,5 s vanaf het begin van het laden. Dit is een toets op de bron;
 * meten gebeurt na de build (zie notities-BC.md, levering 117). Wat hier bewaakt wordt:
 *   1 · geen stap op window 'load' meer; TOTAAL = 2 (de letters en het eerste beeld);
 *   2 · de noodrem: NOODREM = 2500 en de wachttijd is NOODREM − performance.now() (vanaf de navigatie, niet vanaf het
 *       script); er staat geen 8000 meer;
 *   3 · na de noodrem geen golf van 900 ms meer: dan vervagen (200 ms);
 *   4 · het eerste beeld is de poster van de bannervideo, met het beeld van de opening als terugval;
 *   5 · de letters: ook de bannerkop (VISUAILS Display Blok; sinds levering 120 VISUAILS Display 2 Light);
 *   6 · de css-noodrem staat op 3,4 s (2,5 s + de golf van 0,9 s), niet meer op 8,5 s;
 *   7 · wat tests/voorpagina-80.test.mjs in de gebouwde pagina zoekt, staat er nog ("getoond ? open() : ruim()").
 */
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const bron = readFileSync(new URL('../src/components/Voorlader80.astro', import.meta.url), 'utf8');
const script = (bron.match(/<script is:inline>([\s\S]*?)<\/script>/) || ['', ''])[1].replace(/\/\*[\s\S]*?\*\//g, '');
const css = (bron.match(/<style is:global>([\s\S]*?)<\/style>/) || ['', ''])[1].replace(/\/\*[\s\S]*?\*\//g, '');

ok('het script staat er', script.length > 500);
console.log('\n1 · geen wachten op de hele pagina');
/* window 'load' (kaal of via window./self.) — de 'load' van het ene beeld (img.addEventListener) mag wel */
ok("geen window-'load' meer", !/(^|[^.\w]|window\.|self\.)addEventListener\(\s*'load'/.test(script) && !/onload\s*=/.test(script));
ok("geen readyState === 'complete' als stap", !/readyState === 'complete'/.test(script));
ok('TOTAAL = 2', /TOTAAL = 2\b/.test(script));
ok('  en er zijn precies twee bronnen van een stap: de letters en het beeld', /\.then\(stap, stap\)/.test(script) && /stap\(\); return; \}/.test(script));

console.log('\n2 · de noodrem op 2,5 s vanaf het begin van het laden');
ok('NOODREM = 2500', /var NOODREM = 2500;/.test(script));
ok('de wachttijd is NOODREM − performance.now()', /Math\.max\(0, NOODREM - performance\.now\(\)\)\)/.test(script));
ok('geen 8000 meer', !/8000/.test(script));
ok('het merk verschijnt niet meer na de noodrem', /performance\.now\(\) < NOODREM\) \{ getoond = performance\.now\(\)/.test(script));

console.log('\n3 · na de noodrem vervagen, geen golf');
ok('open() vervaagt na de noodrem (de vlag nood, of de klok)', /if \(nood \|\| performance\.now\(\) >= NOODREM\) \{[^}]*vervaag\(\); return; \}/.test(script) && /setTimeout\(function \(\) \{ nood = true;/.test(script));
ok('  vervaag() is 200 ms', /function vervaag\(\) \{ el\.style\.transition = 'opacity \.2s linear'/.test(script));
ok('  open() loopt maar één keer (opent)', /if \(weg \|\| opent\) return;\s*opent = true;/.test(script));

console.log('\n4 · het eerste beeld');
ok('de poster van de bannervideo ([data-b94-video])', /querySelector\('\[data-b94-video\]'\)/.test(script) && /getAttribute\('poster'\)/.test(script) && /new Image\(\)/.test(script));
ok('  met het beeld van de opening als terugval', /querySelector\('\[data-o8-beeld\]'\)/.test(script));

console.log('\n5 · de letters');
/* levering 120 (19 november 2026, lijst 132): de bannerkop staat in VISUAILS Display 2 Light (was VISUAILS Display Blok) */
/* levering 121 (19 november 2026, lijst 134): de andere koppen in VISUAILS Display 2 Medium (was VISUAILS Display Bold) */
ok('VISUAILS Display 2 Light (de bannerkop), VISUAILS Display 2 Medium (de koppen) en DM Sans', /fonts\.load\('300 1em "VISUAILS Display 2"'\)/.test(script) && /fonts\.load\('500 1em "VISUAILS Display 2"'\)/.test(script) && /fonts\.load\('400 1em "DM Sans"'\)/.test(script));

console.log('\n6 · de css-noodrem');
ok('animation: vl8-nood 0s 3.4s forwards', /animation: vl8-nood 0s 3\.4s forwards/.test(css));
ok('  niet meer 8.5s', !/8\.5s/.test(css));

console.log('\n7 · wat de bestaande toets zoekt');
ok('"getoond ? open() : ruim()" staat er nog', /getoond \? open\(\) : ruim\(\)/.test(script));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
