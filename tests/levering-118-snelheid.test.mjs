/* VISUAILS — levering 118 (17 november 2026), proefronde: snelheid en de stille banner (bouwer BF).
 *
 *   node tests/levering-118-snelheid.test.mjs      (geen build nodig: leest de bron en de bestanden in public/)
 *
 *   T1-02 · de telefoon haalt bij binnenkomst geen 16 MB video meer op:
 *           - de clip in de opening (6,2 MB) heeft preload "none" en krijgt zijn bron pas als hij speelt;
 *           - de banner: een telefoonversie (banner-540.mp4, hoogstens 3,5 MB, staand 3 : 4, het midden van de video),
 *             preload "metadata", en de bron pas bij het spelen;
 *   P11-06 · met minder beweging staat er een stil eindbeeld (eind-1280/1920.webp, niet wit) in plaats van het witte
 *            eerste beeld, en laadt er geen video tot je zelf op afspelen drukt;
 *   T1-03 · op de proefpagina staan de twee beelden van de groene kaart als preload in de kop (en alleen daar).
 */
import { readFileSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

const opening = lees('src/components/HalOpening80.astro');
const banner = lees('src/components/HalBanner94.astro');
const layout = lees('src/layouts/Layout.astro');
const B = (f) => path.join(ROOT, 'public/img/hal/banner', f);

console.log('\nT1-02 · de clip in de opening');
ok('preload "none" en de bron in data-src (niet meteen src)', /v\.className = 'o8-clip';[^\n]*v\.preload = 'none'/.test(opening) && /v\.dataset\.src = `\$\{s\.mp4\}\?v=\$\{ver\}`/.test(opening) && !/v\.src = `\$\{s\.mp4\}/.test(opening));
ok('de bron komt pas in clipZet: als de stand staat, in beeld is en loopt', /if \(j === nu && loopt && zicht && !vast\) \{\s*if \(!v\.getAttribute\('src'\) && v\.dataset\.src\) \{ v\.preload = 'auto'; v\.src = v\.dataset\.src; \}/.test(opening));
ok('de stand wacht niet meer op het laden van de video (alleen op de poster)', /return \{ el: d as HTMLElement, img: m\.img, p: klaar\(m\.img\) \};/.test(opening));

console.log('\nT1-02 · de banner');
ok('banner-540.mp4 staat in public/img/hal/banner', existsSync(B('banner-540.mp4')));
const mb = existsSync(B('banner-540.mp4')) ? statSync(B('banner-540.mp4')).size / 1e6 : 99;
ok(`  ${mb.toFixed(2)} MB, hoogstens 3,5 MB (de 1280 is ${(statSync(B('banner-1280.mp4')).size / 1e6).toFixed(1)} MB)`, mb <= 3.5);
let probe = null;
try { probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,duration', '-of', 'csv=p=0', B('banner-540.mp4')]).toString().trim().split(','); } catch { /* geen ffprobe */ }
if (probe) {
  ok(`  staand 3 : 4 (${probe[0]} × ${probe[1]}), even lang als de banner (${(+probe[2]).toFixed(2)} s)`, +probe[0] * 4 === +probe[1] * 3 && Math.abs(+probe[2] - 26.75) < 0.1);
} else console.log('  --   geen ffprobe: maat en lengte niet nagemeten');
ok('de video kent de telefoonversie en het stille beeld', /data-telefoon=\{pad\('banner-540\.mp4'\)\}/.test(banner) && /data-stil-klein=\{pad\('eind-1280\.webp'\)\} data-stil-groot=\{pad\('eind-1920\.webp'\)\}/.test(banner));
ok('  en ze tellen mee in het teken achter de bestanden (?v=)', /'banner-540\.mp4'[^\n]*'eind-1280\.webp', 'eind-1920\.webp'/.test(banner));
ok('staand en smal: de telefoonversie', /const bron = \(staand && beeld\.clientWidth \* dpr <= 1100 && vid\.dataset\.telefoon\) \? vid\.dataset\.telefoon/.test(banner));
ok('preload "metadata", niet meer "auto" bij binnenkomst', /vid\.preload = 'metadata'; vid\.src = bron;/.test(banner) && !/vid\.preload = 'auto';\n\s*opV\('error'/.test(banner));
ok('de bron pas bij het spelen (speel → zetBron)', /const speel = \(\) => \{ if \(!handPauze && zicht\) \{ zetBron\(\); vid\.play\(\)/.test(banner));

console.log('\nP11-06 · minder beweging: een stil eindbeeld');
/* levering 120 (19 november 2026, lijst 132): de WebGL-kop is weg; het eindbeeld is alleen nog de poster van de video (er is
   geen tekening meer die het als bron nodig heeft), en de kop krijgt de kleur van 18 s (tests/levering-120-videokop*.test.mjs) */
ok('bij minder beweging (of databesparing) geen video, het eindbeeld als poster', /let stilVast = minder \|\| zuinig;/.test(banner) && /if \(stilVast\) \{[\s\S]*?vid\.poster = s;\s*\}\n/.test(banner) && !/else zetBron\(\)/.test(banner));
ok('de kop hoort dan bij het eindbeeld (de kleur van 18 s)', /const t = stilVast \? STIL_T : \(mediaTijd >= 0 \? mediaTijd : vid\.currentTime\);/.test(banner));
ok('op het eindbeeld staat stap 5 open (STIL_T = 18 s, na hoofdstuk 5 op 14,42 s)', /const STIL_T = 18;/.test(banner) && /const t = stilVast \? STIL_T : vid\.currentTime/.test(banner));
ok('een stap kiezen laadt dan alsnog de video', /if \(!vid\.getAttribute\('src'\)\) \{ zetBron\(\); vid\.preload = 'auto'; \}/.test(banner));
for (const [f, w, h] of [['eind-1280.webp', 1280, 720], ['eind-1920.webp', 1920, 1080]]) {
  if (!existsSync(B(f))) { ok(`${f} staat er`, false); continue; }
  const { data, info } = await sharp(B(f)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let som = 0, wit = 0; for (let i = 0; i < data.length; i += 3) { const g = (data[i] + data[i + 1] + data[i + 2]) / 3; som += g; if (g > 245) wit++; }
  const gem = som / (data.length / 3), witDeel = wit / (data.length / 3);
  ok(`${f}: ${info.width} × ${info.height}, niet wit (gemiddeld ${gem.toFixed(0)} van 255, ${(witDeel * 100).toFixed(0)} % wit)`, info.width === w && info.height === h && gem < 200 && witDeel < 0.5);
}

console.log('\nT1-03 · de kaartbeelden op de proefpagina vooraf');
ok('alleen op /test-sample en /nl/test-sample', /const proefKaartBoven = \/\^\\\/\(nl\\\/\)\?test-sample\\\/\?\$\/\.test\(path\);/.test(layout));
ok('stuk-0.webp en korrel.webp als preload met voorrang', /proefKaartBoven && <link rel="preload" as="image" type="image\/webp" href="\/img\/doek\/stuk-0\.webp" fetchpriority="high" \/>/.test(layout) && /proefKaartBoven && <link rel="preload" as="image" type="image\/webp" href="\/img\/doek\/korrel\.webp" fetchpriority="high" \/>/.test(layout));
ok('  dezelfde paden als in kaart-115.css', /url\('\/img\/doek\/korrel\.webp'\)/.test(lees('src/styles/kaart-115.css')) && /url\('\/img\/doek\/stuk-0\.webp'\)/.test(lees('src/styles/kaart-115.css')));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
