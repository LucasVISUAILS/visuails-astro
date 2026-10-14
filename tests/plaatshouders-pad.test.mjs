/* VISUAILS — geen grijs vlak buiten het pad naar betalen. 8 oktober 2026 (1.02, V13 = a).
 *
 *   node tests/plaatshouders-pad.test.mjs        (leest dist/, dus eerst bouwen)
 *
 * Lucas koos: alles buiten het pad naar betalen blijft verborgen tot er een beeld
 * is. Bewaakt:
 *   1 · in de build staat buiten het pad naar betalen geen enkele plaatshouder
 *       (geen /img/plaatshouder/…svg, geen <Placeholder> met data-placeholder);
 *   2 · elke plaatshouder die er wél staat, staat in src/data/beeldenNodig.js
 *       met `betaalpad: true` — anders mist hij in /admin/diagnose;
 *   3 · isPlaatshouder() volgt dezelfde regel als scripts/plaatshouders.mjs;
 *   4 · het diagnoseblok noemt per ontbrekend beeld de plek en de bestandsnaam,
 *       laat weg wat er is, en zegt "niet te controleren" zonder ASSETS.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEELDEN_NODIG } from '../src/data/beeldenNodig.js';
import { isPlaatshouder, basisnaam, bestaat } from '../src/lib/beeldAanwezig.js';
import { beeldenStand, beeldenBlok } from '../src/lib/beeldenDiagnose.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');
process.chdir(ROOT);

/* ══ 3 · DE REGEL ══════════════════════════════════════════════════════════ */
console.log('isPlaatshouder volgt de regel van de build');
ok('een bestaand beeld is echt', isPlaatshouder('/img/catalog-after.webp') === false);
ok('ook via een -w-variant', isPlaatshouder('/img/lifestyle-flash-02-w760.webp') === false);
ok('basisnaam haalt -wNNN eraf', basisnaam('/img/lifestyle-flash-02-w760.webp') === 'lifestyle-flash-02');
ok('een naam zonder bestand is een plaatshouder', isPlaatshouder('/img/bestaat-echt-niet-123.webp') === true);
ok('een svg-icoon telt niet mee', isPlaatshouder('/img/i-pijl.svg') === false);
for (const b of BEELDEN_NODIG) {
  ok(`  ${b.naam}: bestand en plek ingevuld`, b.bestand.startsWith('/img/') && b.plek && b.wat && b.maat);
}

/* ══ 1 en 2 · DE BUILD ═════════════════════════════════════════════════════ */
console.log('\nde gebouwde site');
if (!existsSync(path.join(DIST, 'index.html'))) { console.log('dist/ ontbreekt — eerst bouwen'); process.exit(1); }
function* html(dir) {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'server' && n !== '_astro') yield* html(p); }
    else if (n.endsWith('.html')) yield p;
  }
}
/* Het pad naar betalen: /start en het formulier, de lookpagina's /catalog en
   /lifestyle (#looks), de proef. Daar mag een plaatshouder blijven staan. */
const BETAALPAD = /^\/(nl\/)?(start(\/|$)|catalog\/$|lifestyle\/$|test-sample\/$)/;
const lijst = new Map(BEELDEN_NODIG.map((b) => [b.naam, b]));
const buiten = [];
const onbekend = [];
for (const f of html(DIST)) {
  /* split(path.sep): op Windows geeft path.relative backslashes, en dan paste
     "/nl\start\lifestyle\" niet op BETAALPAD (UITROLLEN.bat, 14 oktober 2026). */
  const url = '/' + path.relative(DIST, f).split(path.sep).join('/').replace(/index\.html$/, '').replace(/\.html$/, '/');
  const h = readFileSync(f, 'utf8');
  const namen = [...new Set([...h.matchAll(/\/img\/plaatshouder\/([a-z0-9-]+?)(?:-donker)?\.svg/g)].map((m) => m[1]))];
  const comps = (h.match(/data-placeholder="/g) || []).length;
  const opPad = BETAALPAD.test(url);
  for (const n of namen) {
    if (!lijst.has(n)) onbekend.push(`${url} ${n}`);
    else if (!opPad || !lijst.get(n).betaalpad) buiten.push(`${url} ${n}`);
  }
  if (comps && !opPad) buiten.push(`${url} <Placeholder> ×${comps}`);
}
ok('geen plaatshouder buiten het pad naar betalen', buiten.length === 0, JSON.stringify(buiten));
ok('elke plaatshouder in de build staat in beeldenNodig.js', onbekend.length === 0, JSON.stringify(onbekend));

/* Wat in de lijst staat zonder betaalpad en nog niet bestaat, mag nergens als
   <img> in de build staan — ook niet onder zijn eigen naam (dan zou het een
   kapotte afbeelding zijn als de plaatshouders ooit uit gaan). */
const nergens = [];
for (const b of BEELDEN_NODIG.filter((x) => !x.betaalpad && !bestaat(x.naam))) {
  for (const f of html(DIST)) {
    const h = readFileSync(f, 'utf8');
    if (new RegExp(`/img/${b.naam}(-w\\d+)?\\.(webp|avif|png|jpe?g)|/img/plaatshouder/${b.naam}(-donker)?\\.svg`).test(h)) { nergens.push(`${b.naam} op ${path.relative(DIST, f)}`); break; }
  }
}
ok('een ontbrekend beeld buiten het pad staat nergens op een pagina', nergens.length === 0, JSON.stringify(nergens));

/* De secties die het betreft, bestaan nog wel in de bron (ze zijn verborgen,
   niet weggehaald): zodra het beeld er is, staan ze er. */
const bron = (p) => readFileSync(path.join(ROOT, p), 'utf8');
/* Hier stonden twee regels over de oude voorpagina (het blok Editions hing aan
   editions-breed, de videodia aan zijn still). Sinds 12 oktober 2026 is de hal de
   voorpagina en heeft hij geen van beide; die twee beelden staan daarom ook niet
   meer in BEELDEN_NODIG. Wat de hal wel aan een beeld hangt: de laptop laat een
   beeld dat er nog niet is weg (isEcht), in plaats van het grijs te tonen. */
ok('voorpagina (de hal): de laptop laat een ontbrekend beeld weg', /const echt = \(b: \{ src: string \}\) => isEcht\(b\.src\)/.test(bron('src/components/HalLaptop.astro')));
ok('en de oude Editions-beelden staan niet meer op de lijst', !BEELDEN_NODIG.some((b) => /^editions-(breed|staand)$/.test(b.naam)));
ok('/about: portret hangt aan lucas.webp', /toonPortret = isEcht\(PORTRET\)/.test(bron('src/components/OverHal.astro')));
ok('/hooks: geen <Placeholder> meer naast de kop', !/<Placeholder\s+lang=/.test(bron('src/components/HooksHal.astro')));
ok('/editions: geen <Placeholder> meer naast de kop', !/<Placeholder\s+lang=/.test(bron('src/components/EditionsHal.astro')));

/* De lookkaarten op het pad naar betalen blijven, ook als het beeld nog niet af is. */
const home = readFileSync(path.join(DIST, 'index.html'), 'utf8');
ok('voorpagina: de lookkaarten staan er (Classic tot Phone-made)', ['Classic', 'Dunes', 'Flash', 'Glow', 'Phone-made'].every((n) => home.includes(`>${n}<`)));

/* ══ 4 · HET DIAGNOSEBLOK ══════════════════════════════════════════════════ */
console.log('\n/admin/diagnose');
{
  const zonder = await beeldenStand({});
  const blok = beeldenBlok(zonder);
  ok('zonder ASSETS: "niet te controleren"', /Niet te controleren/.test(blok));
  ok('  en de hele lijst, met bestandsnaam en plek', BEELDEN_NODIG.every((b) => blok.includes(b.bestand.replace('/img/', '')) && blok.includes(b.plek.replace(/"/g, '&quot;'))));

  const aanwezig = new Set(['/img/lucas.webp']);
  const ASSETS = { fetch: async (req) => new Response(null, { status: aanwezig.has(new URL(req.url).pathname) ? 200 : 404, headers: { 'content-type': 'image/webp' } }) };
  const stand = await beeldenStand({ ASSETS });
  const b2 = beeldenBlok(stand);
  ok('met ASSETS: gelezen', stand.staat === 'gelezen');
  ok('  wat er is, staat er niet in', !b2.includes('lucas.webp'));
  ok('  wat ontbreekt wel', b2.includes('editions-maandgrid.webp') && b2.includes('hooks-kop.webp'));
  ok(`  met de telling "1 van ${BEELDEN_NODIG.length} aanwezig"`, b2.includes(`1 van ${BEELDEN_NODIG.length} aanwezig`));
  ok('  het pad naar betalen is gemarkeerd', /lifestyle-band-04\.webp<\/code><\/strong> <span class="pill">pad naar betalen/.test(b2));

  const alles = await beeldenStand({ ASSETS: { fetch: async () => new Response(null, { status: 200, headers: { 'content-type': 'image/webp' } }) } });
  ok('alles aanwezig: één regel', /Alle \d+ beelden uit de lijst staan op de site/.test(beeldenBlok(alles)));
  const html404 = await beeldenStand({ ASSETS: { fetch: async () => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }) } });
  ok('een html-antwoord telt niet als beeld', html404.rijen.every((r) => r.aanwezig === false));

  const admin = readFileSync(path.join(ROOT, 'src/lib/admin.js'), 'utf8');
  const diag = admin.slice(admin.indexOf('async function renderDiagnose'), admin.indexOf('async function handleDiagnoseProbe'));
  ok('renderDiagnose toont het blok', /\$\{beeldenBlok\(beelden\)\}/.test(diag) && /beeldenStand\(env/.test(diag));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
