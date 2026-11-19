/* VISUAILS — levering 121 (19 november 2026, lijst 134): alle koppen in VISUAILS Display 2 Medium 500, zonder hoofdletters.
 *
 *   node tests/levering-121-koppen.test.mjs      (geen build nodig: leest de bronregels)
 *
 * Lucas koos versie c: elke kop op de site in VISUAILS Display 2 Medium (500), gewone schrijfwijze; de videokop (h1 in de
 * homebanner) blijft Light 300. Groot (sectiekoppen): regelafstand 1,0, spatiëring −0,025 em; klein (20 – 28 px): 1,2 en
 * −0,005 em. Mono-labels, knoppen, formulieren en lopende tekst veranderen niet.
 *   1 · de letter: het bestand staat er, is precies de gebouwde Medium, en de @font-face's in hal.css, studio-hal.css en
 *       /fonts/gedeeld.css (de privélink);
 *   2 · --h-kopletter is VISUAILS Display 2; het blok "levering 121" in hal.css zet letter, gewicht, schrijfwijze, spatiëring
 *       en regelafstand voor elke kop, behalve de videokop, de mono-labels en .sr-only;
 *   3 · de videokop is nog Light 300; Studio (st-h1) en de privélink (h1) in Medium, gewone schrijfwijze;
 *   4 · laden: Medium vooraf op elke pagina van de site, in Studio en op de privélink; de Bold alleen nog in de werkplaats;
 *       het laadscherm en de opening wachten op Medium; de bestanden Bold en Blok blijven staan.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, v, extra = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam} ${extra}`); } };
const FONT = 'public/fonts/visuails-display/';

console.log('\n1 · de letter');
const medium = path.join(ROOT, FONT, 'VISUAILSDisplay2-Medium.woff2');
ok('VISUAILSDisplay2-Medium.woff2 staat in public/fonts/visuails-display/', fs.existsSync(medium));
const buf = fs.readFileSync(medium);
ok(`  een woff2 van ${Math.round(buf.length / 1024)} kB (hoogstens 60 kB)`, buf.subarray(0, 4).toString('latin1') === 'wOF2' && buf.length <= 60 * 1024);
ok('  de bestanden Bold, Blok en Light blijven staan', ['VISUAILSDisplay-Bold.woff2', 'VISUAILSDisplayBlok-Bold.woff2', 'VISUAILSDisplay2-Light.woff2', 'OFL.txt'].every((f) => fs.existsSync(path.join(ROOT, FONT, f))));
ok('  LEES-MIJ.txt noemt Medium en waar de Bold nog dient', /levering 121[\s\S]*VISUAILSDisplay2-Medium\.woff2[\s\S]*VISUAILSDisplay-Bold\.woff2 blijft staan/.test(lees(FONT + 'LEES-MIJ.txt')));
const face = /@font-face \{ font-family: ['"]VISUAILS Display 2['"]; font-style: normal; font-weight: 500; font-display: swap; src: url\(\/fonts\/visuails-display\/VISUAILSDisplay2-Medium\.woff2\) format\(['"]woff2['"]\); \}/;
const hal = lees('src/styles/hal.css');
ok('hal.css: VISUAILS Display 2 Medium als @font-face (500)', face.test(hal));
ok('studio-hal.css: idem', face.test(lees('src/styles/studio-hal.css')));
ok('/fonts/gedeeld.css (de privélink, scripts/fonts-voor-worker.mjs): idem', face.test(lees('scripts/fonts-voor-worker.mjs')));

console.log('\n2 · de regels in hal.css');
ok('--h-kopletter begint met VISUAILS Display 2', /--h-kopletter: 'VISUAILS Display 2', 'DM Sans'/.test(hal));
const blok = hal.slice(hal.indexOf('levering 121 (19 november 2026, lijst 134): alle koppen in VISUAILS Display 2 Medium 500'));
ok('het blok "levering 121" staat onderaan hal.css', blok.length > 500 && hal.lastIndexOf('LEVERING') < hal.indexOf(blok));
const regel = (sel) => { const i = blok.indexOf(sel); return i < 0 ? '' : blok.slice(i, blok.indexOf('}', i)); };
const zonderUitleg = hal.slice(hal.lastIndexOf('/*', hal.indexOf(blok))).replace(/\/\*[\s\S]*?\*\//g, '');
ok('  zonder :is() (tests/live-qa-51)', !/:is\(/.test(zonderUitleg));
const alle = regel('html body.hal h1:not(.b94-kop)');
ok('  elke kop (h1 – h6, .h-kop en de kaartkoppen): Display 2, 500, geen hoofdletters, −0,005 em, regelafstand 1,2',
  /font-family: var\(--h-kopletter\) !important; font-weight: 500 !important; text-transform: none !important;\s*letter-spacing: -\.005em !important; line-height: 1\.2 !important;/.test(alle), alle.slice(0, 200));
ok('  elke kiezer van een kop: behalve de videokop (.b94-kop), de mono-labels (.h-pil) en .sr-only',
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '.h-kop'].every((k) => alle.includes(`html body.hal ${k}:not(.b94-kop):not(.h-pil):not(.sr-only)`)));
ok('  de kaartkoppen die geen h-element zijn doen mee (.sb-kop, .h-pk-naam, .h-st-stap-naam, .h-hw-dienst-naam, .st2-naam, .h-gl-naam …)',
  ['.sb-kop', '.h-pk-naam', '.h-st-stap-naam', '.h-hw-dienst-naam', '.h-md-deur-kop', '.h-dienst-extra-kop', '.h-ed-vgl-kop', '.st2-naam', '.h-gl-naam', '.w8-woord'].every((k) => alle.includes(`html body.hal ${k}:not(`)));
ok('  de tonen in een kop (.l, .d) erven niet vanzelf: die staan er ook in', ['.h-kop .l', '.h-kop .d', '.pl-h .l', '.pl-h .d'].every((k) => alle.includes(`html body.hal ${k}`)));
const groot = regel('html body.hal .h-kop:not(.b94-kop), html body.hal .pl-h');
ok('  de grote koppen: −0,025 em, regelafstand 1,0', /letter-spacing: -\.025em !important; line-height: 1 !important;/.test(groot) && /\.ov110-kop/.test(groot) && /:not\(\.b94-kop\)/.test(groot), groot.slice(0, 200));
ok('  de grote €1 in de proefkop: Medium', /html body\.hal \.h-kop \.h-een \{ font-weight: 500; \}/.test(blok));
/* levering 122: Lucas koos ook het aantal-veld in Display 2 Medium */
ok('het cijfer in het aantal-veld staat in VISUAILS Display 2 Medium (levering 122)', /font: 500 36px\/1\.1 'VISUAILS Display 2', var\(--h-letter\)/.test(lees('src/styles/werkplaats.css')));

console.log('\n3 · de videokop, Studio en de privélink');
const banner = lees('src/styles/banner-94.css');
ok('de videokop blijft VISUAILS Display 2 Light 300, zonder hoofdletters', /font-weight: 300;[^}]*VISUAILSDisplay2-Light\.woff2/.test(banner) && /font: 300 var\(--b94-titel, 40px\)\/1\.06 'VISUAILS Display 2'/.test(banner));
const st = lees('src/styles/studio-hal.css');
ok('Studio: st-h1 in Display 2 Medium, gewone schrijfwijze, −0,025 em, regelafstand 1', /\.st-h1 \{ font-family: 'VISUAILS Display 2', var\(--h-letter\); font-weight: 500; text-transform: none; letter-spacing: -\.025em; line-height: 1;/.test(st) && /\.st-h1 \.l \{ font-weight: 500; \}/.test(st));
ok('  en nergens meer Display Bold of hoofdletters op st-h1', !/st-h1[^{]*\{[^}]*(uppercase|font-weight: 700)/.test(st));
const portaal = lees('public/portal.css');
ok('de privélink: h1 in Display 2 Medium, gewone schrijfwijze', /html body h1 \{ font-family: 'VISUAILS Display 2', var\(--font\); font-weight: 500; text-transform: none; letter-spacing: -\.025em; line-height: 1;/.test(portaal));

console.log('\n4 · laden');
const lay = lees('src/layouts/Layout.astro');
ok('Layout: Medium vooraf op elke pagina van de hal', /const KOPLETTER_HAL = '\/fonts\/visuails-display\/VISUAILSDisplay2-Medium\.woff2';/.test(lay) && /huid === 'hal' && <link rel="preload"[^>]*href=\{KOPLETTER_HAL\}/.test(lay));
ok('  de Bold wordt nergens meer vooraf geladen (levering 122)', !/VISUAILSDisplay-Bold\.woff2/.test(lay) && !/KOPLETTER_BOLD/.test(lay));
ok('  de Light van de videokop blijft alleen op de voorpagina (KOPBLOK)', /const KOPBLOK = '\/fonts\/visuails-display\/VISUAILSDisplay2-Light\.woff2';/.test(lay));
ok('StudioLayout en de privélink laden Medium vooraf (niet meer Bold)', /preload[^>]*VISUAILSDisplay2-Medium\.woff2/.test(lees('src/layouts/StudioLayout.astro')) && !/VISUAILSDisplay-Bold/.test(lees('src/layouts/StudioLayout.astro')) && /preload[^>]*VISUAILSDisplay2-Medium\.woff2/.test(lees('src/lib/portal.js')) && !/VISUAILSDisplay-Bold/.test(lees('src/lib/portal.js')));
const vl = lees('src/components/Voorlader80.astro');
ok('het laadscherm wacht op Light (videokop), Medium (de koppen) en DM Sans', /fonts\.load\('300 1em "VISUAILS Display 2"'\)/.test(vl) && /fonts\.load\('500 1em "VISUAILS Display 2"'\)/.test(vl) && !/"VISUAILS Display"'\)/.test(vl));
ok('de opening meet opnieuw als Medium er is', /fonts\?\.load\?\.\('500 40px "VISUAILS Display 2"'\)/.test(lees('src/components/HalOpening.astro')));
ok('geen regel van de site vraagt nog Display Bold (levering 122: ook het aantal-veld niet meer)', (() => {
  const css = ['hal.css', 'studio-hal.css', 'banner-94.css', 'voorpagina-80.css', 'sectiekop-96.css', 'onder-video-110.css', 'hoe-80.css', 'maken-80.css', 'galerij-80.css', 'werkplaats.css'].map((f) => lees('src/styles/' + f)).join('\n');
  return (css.match(/'VISUAILS Display'(?! 2)/g) || []).length === 1; /* alleen de @font-face in hal.css */
})());

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
