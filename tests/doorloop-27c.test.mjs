/**
 * Doorloop 27, tweede deel — 15 oktober 2026, Lucas' berichten van 05:15 tot 05:34.
 *
 * Wat hier vastligt:
 *   1 · de opening: telefoon en laptop allebei in beeld, de laptop van de tekst
 *       af (05:15, "Laptop mag wel iets meer naar links");
 *   2 · de nieuwe schetsen: zestien bestanden uit scripts/schetsen-zijpaneel.py,
 *       de hoekenkiezer en het zijpaneel tekenen dezelfde hoek uit hetzelfde
 *       bestand (05:26 en 05:34);
 *   3 · wie al klant is ziet de €1-proef nergens meer als knop of prijs; wie
 *       niet is ingelogd wel (05:22). De FAQ en de voorwaarden leggen de proef
 *       uit en blijven buiten deze telling;
 *   4 · een abonnee die bestelt ziet in stap 1 credits en geen euro's; een
 *       aangevinkte hoek komt als tegel in "Wat je krijgt"; voorrang zet de
 *       prijzen terug in euro (05:26);
 *   5 · geen scriptfouten.
 * Draai `npx astro build` eerst; alles hieronder leest dist/.
 */
import http from 'node:http';
import { metVisIn } from './lib/vis-in.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTRA_CREDITS } from '../src/data/pricing.js';
import { ANGLE_IDS } from '../src/data/angles.js';
import { SCHERMEN, FOTO } from '../src/data/halLaptop.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

console.log('\nVISUAILS — doorloop 27, tweede deel\n');
if (!fs.existsSync(path.join(DIST, 'nl/start/catalog/index.html'))) {
  ok('dist/ bestaat (bouw eerst)', false);
  process.exit(1);
}

/* ── 2 · DE SCHETSEN (statisch) ─────────────────────────────────────────────── */
console.log('2 · de schetsen');
const SCHETS = path.join(ROOT, 'public/img/schets');
const verwacht = [
  'catalog-voorkant', 'catalog-achterkant', 'catalog-detail', 'catalog-model',
  'lifestyle-voorkant', 'lifestyle-achterkant', 'lifestyle-product', 'lifestyle-detail',
  ...ANGLE_IDS.map((id) => `hoek-${id}`), 'hoek-eigen-model', 'hoek-eigen-ground',
];
const mist = verwacht.filter((n) => !fs.existsSync(path.join(SCHETS, `${n}.svg`)));
ok(`alle ${verwacht.length} schetsen staan in public/img/schets`, mist.length === 0, mist.join(', '));
const kapot = verwacht.filter((n) => fs.existsSync(path.join(SCHETS, `${n}.svg`))).filter((n) => {
  const s = fs.readFileSync(path.join(SCHETS, `${n}.svg`), 'utf8');
  return !/^<svg[^>]+viewBox="/.test(s.trim()) || /<script|href="http/i.test(s);
});
ok('  elk bestand is een svg met viewBox, zonder script of externe link', kapot.length === 0, kapot.join(', '));
const formNl = fs.readFileSync(path.join(DIST, 'nl/start/catalog/index.html'), 'utf8');
const kiezer = new Set([...formNl.matchAll(/class="hs"[^>]*src="\/img\/schets\/(hoek-[a-z-]+)\.svg"|src="\/img\/schets\/(hoek-[a-z-]+)\.svg"[^>]*class="hs"/g)].map((m) => m[1] || m[2]));
ok('de hoekenkiezer tekent elke hoek met de nieuwe schets', ANGLE_IDS.every((id) => kiezer.has(`hoek-${id}`)) && kiezer.has('hoek-eigen-model') && kiezer.has('hoek-eigen-ground'), [...kiezer].join(' '));
ok('  en de oude, getekende SVG staat er niet meer (geen clipPath in de kiezer)', !/<svg[^>]*class="hs/.test(formNl));
const tegels = [...formNl.matchAll(/data-bo-hoek="([a-z-]+)"[^]*?src="\/img\/schets\/(hoek-[a-z-]+)\.svg"/g)].map((m) => [m[1], m[2]]);
ok('het zijpaneel heeft een tegel per hoek, met hetzelfde bestand als de kiezer', tegels.length >= ANGLE_IDS.length && tegels.every(([id, f]) => f === `hoek-${id}`), JSON.stringify(tegels));
ok('  de tegels staan verborgen tot er een hoek is aangevinkt', [...formNl.matchAll(/<li[^>]*data-bo-hoek="[^"]+"[^>]*>/g)].every((m) => /\shidden/.test(m[0])));
const hal = lees('src/styles/hal.css');
/* Sinds levering 51 (de kolom, bericht 16:10) volgt het beeld de ruimte naast de tekst. Sinds
   levering 63 (de POV-foto, 20 oktober 2026): de duim 16 px rechts van de tekst, de klep 36 px
   voor de rand. Sinds de handenfoto (23 oktober 2026): de laptop 16 px rechts van de tekst, de
   hand om de telefoon 36 px voor de rand, hooguit 1400 px breed; de rechterrand van de foto
   ligt altijd buiten beeld. */
ok('de opening: de beeldbreedte volgt de ruimte naast de tekst', /\.hal \.h-open-beeld \{ --hb: min\(1400px, calc\(\(100% - 116px - var\(--h-open-zij\) - min\(540px, 40%\)\) \/ 0\.6048\)\);/.test(hal) && /left: calc\(100% - 36px - 0\.85 \* var\(--hb\)\);/.test(hal));

/* ── 6 · DE SET OP LICHTGRIJS, GEMETEN (05:58) ──────────────────────────────── */
console.log('\n6 · de roze-jeans-set op lichtgrijs, gemeten');
{
  const { default: sharp } = await import('sharp');
  const { GROND, MODEL_EERST, geleverd } = await import('../src/data/voorbeeldset.js');
  const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
  /* De mediaan van een vak van 40 × 40 px, 8 px van de rand. */
  const vak = async (bestand, hoek) => {
    const { data, info } = await sharp(path.join(ROOT, 'public', bestand)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const [x0, y0] = { lb: [8, 8], rb: [w - 48, 8], lo: [8, h - 48], ro: [w - 48, h - 48] }[hoek];
    const kan = [[], [], []];
    for (let y = y0; y < y0 + 40; y += 1) for (let x = x0; x < x0 + 40; x += 1) { const i = (y * w + x) * 3; for (let c = 0; c < 3; c += 1) kan[c].push(data[i + c]); }
    const med = kan.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
    return hex(...med);
  };
  const set = geleverd('nl');
  ok('de set is de grijze set', set.every((b) => /-grijs\.webp$/.test(b.src)), set.map((b) => b.src).join(' '));
  for (const b of [set[0], set[1], set[3]]) {
    for (const ext of ['webp', 'avif']) {
      const f = b.src.replace(/\.webp$/, `.${ext}`);
      const m = await Promise.all(['lb', 'rb', 'lo', 'ro'].map((h) => vak(f, h)));
      /* De modelfoto heeft rechtsonder de schaduw van de schoen in zijn hoek: één stap marge. */
      const goed = m.filter((x) => x === GROND).length;
      ok(`${f.split('/').pop()}: de grond is ${GROND} (${m.join(' ')})`, goed >= (b === set[3] ? 3 : 4));
    }
  }
  ok(`het detail: de grond linksboven is ${GROND}`, await vak(set[2].src, 'lb') === GROND && await vak(set[2].src.replace('.webp', '.avif'), 'lb') === GROND);
  ok('de modelfoto eerst (vóór de revisie) is de witte', MODEL_EERST === '/img/ba2-na-model-wit.webp' && await vak(MODEL_EERST, 'lb') === '#FFFFFF');
  const halCss = lees('src/styles/hal.css');
  ok(`de achtergrondlaag van "Wij maken", het vak op de laptop en het staaltje: ${GROND}`,
    halCss.includes(`.hal .h-maak-wit { background: ${GROND};`) && halCss.includes(`border-radius: 22px; background: ${GROND}; overflow: hidden; }`) && halCss.includes(`border-radius: 3px; background: ${GROND};`));
  ok('  en geen multiply meer op de laptopbeelden', !/\.sc-(hoofd|rij) img[^}]*mix-blend-mode: multiply/.test(halCss));
  const voor = fs.readFileSync(path.join(DIST, 'nl/index.html'), 'utf8');
  ok(`de laag "Achtergrond" noemt ${GROND} op de voorpagina`, voor.includes(`h-lagen-hex">${GROND}<`) && !voor.includes('</s>#FFFFFF</b>'));
  const studio = fs.readFileSync(path.join(DIST, 'nl/studio/index.html'), 'utf8');
  ok('Studio: de revisie vraagt om grijs', studio.includes('Toch liever op grijs dan wit, zoals de rest.') && !studio.includes('Toch liever op wit dan grijs'));
  ok('  eerst het witte modelbeeld, daarna het grijze', /class="fd-voor"[^>]*src="\/img\/ba2-na-model-wit\.webp"|src="\/img\/ba2-na-model-wit\.webp"[^>]*class="fd-voor"/.test(studio) && /fg-foto-na[^>]*ba2-na-model-grijs|ba2-na-model-grijs[^>]*fg-foto-na/.test(studio));
  ok('  je vaste look staat op lichtgrijs', studio.includes(`fill="${GROND}"`) && /Lichtgrijs/.test(studio));
  ok('  "Eén map" toont het T-shirt van 1800 px, en de map heet zo', /h-sd-map[^]*?catalog-after\.(webp|avif)/.test(studio) && studio.includes('01 - Gewassen T-shirt/'));
  /* Sinds levering 74 (25 oktober 2026) staat de laptop niet meer op de voorpagina (daar is
     de opening nu een scrollvideo, HalOpening.astro), wel op /catalog, /lifestyle en /video. */
  const lap = fs.readFileSync(path.join(DIST, 'catalog/index.html'), 'utf8');
  /* 15 okt 08:14: de laptop toont kant-en-klare standen (src/data/halStanden.js), met de
     catalogbeelden op 1:1 in het vak; de `vul` van 05:59 is opgegaan in dat vierkant.
     Wat er in de foto's staat, kijkt tests/laptop-standen.test.mjs na. */
  ok('de laptop: de standen staan erin als foto, de eerste meteen', /data-hl-stand="0"/.test(lap) && /\/img\/hal\/stand\/en-catalog-0-/.test(lap));
}

/* ── 8 · DE MODELPORTRETTEN: ÉÉN GROND (06:06) ─────────────────────────────── */
console.log('\n8 · de modelportretten op één grond');
{
  const { default: sharp } = await import('sharp');
  const { ROSTER } = await import('../src/data/models.js');
  /* De grond, gemeten in scripts/modellen-gelijk.py: de mediaan van de tien. Lossy
     opslaan (webp, avif) mag één stap per kanaal schelen, meer niet. */
  const DOEL = [0xF8, 0xFC, 0xFE];
  const namen = ROSTER.map((m) => String(m.photo || '').match(/model-([a-z]+)\.webp$/)?.[1]).filter(Boolean);
  ok(`de tien portretten uit models.js (${namen.length})`, namen.length === 10, namen.join(' '));
  const afwijking = [];
  for (const n of namen) {
    for (const f of [`model-${n}.webp`, `model-${n}-w380.webp`, `model-${n}-w800.avif`]) {
      const { data, info } = await sharp(path.join(ROOT, 'public/img', f)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      for (const [x0, y0] of [[Math.round(info.width * 0.02), Math.round(info.height * 0.02)], [Math.round(info.width * 0.94), Math.round(info.height * 0.02)]]) {
        const k = Math.max(4, Math.round(info.width * 0.03));
        const kan = [[], [], []];
        for (let y = y0; y < y0 + k; y += 1) for (let x = x0; x < x0 + k; x += 1) { const i = (y * info.width + x) * 3; for (let c = 0; c < 3; c += 1) kan[c].push(data[i + c]); }
        const med = kan.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
        if (med.some((v, c) => Math.abs(v - DOEL[c]) > 2)) afwijking.push(`${f}: ${med.join(',')}`);
      }
    }
  }
  ok('elke grond is #F8FCFE (±2 door het opslaan), in elke maat', afwijking.length === 0, afwijking.join(' | '));
  const maten = await Promise.all(namen.map((n) => sharp(path.join(ROOT, 'public/img', `model-${n}.webp`)).metadata()));
  ok('  en de maat is gebleven: 1195 × 1600', maten.every((m) => m.width === 1195 && m.height === 1600));
}

/* ── 9 · STAP 2 "WIJ MAKEN" MET DE HAND (06:21) ─────────────────────────────── */
console.log('\n9 · stap 2 met de hand');
{
  const { default: sharp } = await import('sharp');
  const { PAD, ANKERS, LIJNEN, MAAT } = await import('../src/data/maakPad.js');
  /* De hulplijnen zijn gemeten, niet getekend: de rand van de uitsnede (voorkant)… */
  const { data, info } = await sharp(path.join(ROOT, 'public/img/ba2-na-front-uitgeknipt.webp')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let boven = MAAT, onder = 0, links = MAAT, rechts = 0;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] > 128) { boven = Math.min(boven, y); onder = Math.max(onder, y); links = Math.min(links, x); rechts = Math.max(rechts, x); }
  }
  ok(`de hulplijnen zijn de rand van de uitsnede (boven ${boven}, onder ${onder}, midden ${Math.round((links + rechts) / 2)})`, LIJNEN.boven === boven && LIJNEN.onder === onder && LIJNEN.midden === Math.round((links + rechts) / 2));
  /* …en de achterkant valt erin: zijn roze (R − G > 13) begint en eindigt op dezelfde lijnen. */
  const a = await sharp(path.join(ROOT, 'public/img/ba2-na-achter-grijs.webp')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let ab = MAAT, ao = 0;
  for (let y = 0; y < a.info.height; y += 1) {
    let n = 0;
    for (let x = 0; x < a.info.width; x += 1) { const i = (y * a.info.width + x) * 3; if (a.data[i] - a.data[i + 1] > 13) n += 1; }
    if (n > 6) { ab = Math.min(ab, y); ao = Math.max(ao, y); }
  }
  ok(`  de achterkant staat op dezelfde lijnen (±3 px: boven ${ab}, onder ${ao})`, Math.abs(ab - LIJNEN.boven) <= 3 && Math.abs(ao - LIJNEN.onder) <= 3);
  ok('het pad van de pen is gesloten en de ankers zijn zijn hoekpunten', /^M\d+ \d+( L\d+ \d+)+ Z$/.test(PAD) && ANKERS.length === (PAD.match(/L/g) || []).length + 1 && ANKERS.every(([, , t], i) => i === 0 || t >= ANKERS[i - 1][2]));
  for (const [bestand, taal] of [['nl/index.html', 'nl'], ['index.html', 'en']]) {
    const h = fs.readFileSync(path.join(DIST, bestand), 'utf8');
    const maak = h.slice(h.indexOf('h-well h-maak'), h.indexOf('h-well h-keur'));
    ok(`${taal}: de pen, de ankers, het penseel en de hulplijnen staan in stap 2`, maak.includes(`d="${PAD}"`) && (maak.slice(maak.indexOf('h-maak-ankers'), maak.indexOf('</g>', maak.indexOf('h-maak-ankers'))).match(/<rect /g) || []).length === ANKERS.length && maak.includes('h-maak-kwast') && (maak.slice(maak.indexOf('h-maak-lijnen'), maak.indexOf('</g>', maak.indexOf('h-maak-lijnen'))).match(/<line /g) || []).length === 3);
    const lijst = maak.slice(maak.indexOf('h-lagen'), maak.indexOf('</ol>'));
    /* Vijf sinds 15 oktober (werklijst 40): eerst "Nagekeken" (knoop, stiksel, kleur). */
    ok(`${taal}:   vijf lagen: nagekeken, dan uitgeknipt, ${GROND_HEX()}, de dekking`, (lijst.match(/<li[ >]/g) || []).length === 5 && lijst.includes('h-lagen-punten') && lijst.includes('h-dek') && lijst.includes('#EFEFEF'), String((lijst.match(/<li[ >]/g) || []).length));
    /* 15 oktober 11:59: rechtzetten (kader, acht grepen, de muis), opbouwen (het penseel
       met een zachte rand), nakijken (een loep die vergroot, met je rechtgezette foto). */
    ok(`${taal}:   eerst je telefoonfoto in het vierkante vak, het kader met acht grepen en de muis`, /h-maak-laag">(<picture>[\s\S]{0,400}?)?<img src="\/img\/ba2-voor-front\./.test(maak) && maak.includes('h-maak-doos') && (maak.match(/class="h-maak-kader/g) || []).length === 2 && (maak.match(/class="h-maak-greep"/g) || []).length === 8 && maak.includes('h-maak-muis'));
    ok(`${taal}:   het penseel bouwt het beeld op (zachte rand), de loep vergroot je foto en ons beeld`, maak.includes('h-maak-bouwkwast') && maak.includes('mask="url(#h-maak-bouw)"') && maak.includes('filter="url(#h-maak-zacht)"') && maak.includes('href="/img/ba2-voor-front-recht.webp"') && (maak.match(/class="h-maak-lp-in"/g) || []).length === 2 && maak.includes('h-maak-lp-vink') && !maak.includes('h-maak-ref'));
    ok(`${taal}:   het label noemt de drie handelingen`, (maak.match(/<span class="h-maak-doe[^>]*>((?:<span>[^<]+<\/span>){3})<\/span>/) || [])[1]?.split('</span>').filter(Boolean).length === 3);
    ok(`${taal}:   het beeld vóór de afwerking (op wit) en de achterkant voor de vergelijking`, /h-maak-begin[^>]*ba2-na-front\.(webp|avif)|ba2-na-front\.(webp|avif)[^>]*h-maak-begin/.test(maak) || (maak.includes('h-maak-begin') && maak.includes('ba2-na-front.')));
    /* Levering 61 (afvinklijst 39, e-stappen: "Animatie mag wel iets sneller"): alles op driekwart.
       Levering 74 (25 oktober 2026, 16:40): na het handwerk komen de lagen in 3D (uit elkaar, de gloed
       met "Gemaakt met AI", weer vlak); de stap duurt sindsdien 12,9 s, het handwerk zelf niet langer. */
    ok(`${taal}:   de stap duurt 12,9 s (het handwerk en daarna de lagen)`, h.includes('data-uitleg-maat="2250 12900 2250"'));
  }
  const css = lees('src/styles/hal.css');
  ok('de pauzeknop zet ook deze animaties stil', css.includes('.hal .h-hoe[data-uitleg-staat="pauze"] .h-maak *,') && css.includes('animation-play-state: paused !important;'));
  ok('zonder uitleg (en bij minder beweging) staat het gereedschap er niet', /\.hal \.h-maak-pad \{[^}]*opacity: 0;/.test(css) && /\.hal \.h-maak-pen, \.hal \.h-maak-kwast \{ opacity: 0;/.test(css) && /\.hal \.h-maak-lijnen line \{[^}]*opacity: 0;/.test(css));
  ok('  en een browser zonder offset-path laat de cursors weg', css.includes("@supports not (offset-path: path('M0 0')) { .hal .h-maak-pen, .hal .h-maak-kwast, .hal .h-maak-bouwkwast { display: none; } }"));
  ok('  ook de foto, het kader, de grepen, de muis, het opgebouwde beeld, de loep en het label niet', /\.hal \.h-maak-laag \{[^}]*opacity: 0;/.test(css) && /\.hal \.h-maak-kader \{[^}]*opacity: 0;/.test(css) && /\.hal \.h-maak-greep rect \{[^}]*opacity: 0;/.test(css) && /\.hal \.h-maak-muis \{ opacity: 0; \}/.test(css) && /\.hal \.h-maak-bouwbeeld \{ opacity: 0; \}/.test(css) && /\.hal \.h-maak-lp \{ opacity: 0; \}/.test(css) && /\.hal \.h-maak-doe \{[^}]*opacity: 0;/.test(css));
  /* De gegenereerde tijden: alles onder .hal, en de transform in % en cqw (geen px, dus op elke breedte gelijk). */
  const mr = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'maak-recht.css'), 'utf8');
  const sel = mr.split('\n').filter((r) => r.includes('{') && !r.startsWith('@') && !/^\s+[0-9.]+%/.test(r) && !r.startsWith('/*'));
  ok('maak-recht.css: elke regel onder .hal, geen :is()', sel.length > 20 && sel.every((r) => r.startsWith('.hal ')) && !mr.includes(':is('), sel.find((r) => !r.startsWith('.hal ')) || '');
  const naar = (mr.match(/@keyframes h-maak-recht \{[\s\S]*?100% \{ transform: ([^;]+);/) || [])[1] || '';
  ok('  het rechtzetten rekent in % en cqw, functie voor functie', /^translate\([-0-9.]+%, [-0-9.]+%\) rotate\([-0-9.]+deg\) skewX\([-0-9.]+deg\) scale\([0-9.]+, [0-9.]+\) perspective\([0-9.]+cqw\) rotateX\([-0-9.]+deg\) rotateY\([-0-9.]+deg\)$/.test(naar), naar);
  ok('  Safari (zonder d) laat de lijn van het kader weg, de grepen blijven', css.includes("@supports not (d: path('M0 0')) { .hal .h-maak-kader { display: none; } }"));
}
function GROND_HEX() { return '#EFEFEF'; }

/* ── 7 · GEEN ANIMATIE TUSSEN TWEE TABS IN STUDIO (06:11) ───────────────────── */
console.log('\n7 · Studio: tussen tabs beweegt niets');
{
  const { klapZet, klapWis, heeftKlap, KLAP_COOKIE } = await import('../src/lib/studioKoppen.js');
  const { wisKlap } = await import('../src/middleware.js');
  const vraag = (koek) => new Request('https://visuails.com/account/plan', { headers: koek ? { cookie: koek } : {} });
  ok('de vlag is kort en alleen voor /account', /Max-Age=30; Path=\/account; HttpOnly; Secure/.test(klapZet()) && /Max-Age=0/.test(klapWis()) && KLAP_COOKIE === 'vis_klap');
  ok('  heeftKlap leest hem, en niets anders', heeftKlap(vraag('vis_klap=1')) && heeftKlap(vraag('a=1; vis_klap=1; b=2')) && !heeftKlap(vraag('vis_klap=0')) && !heeftKlap(vraag('x_vis_klap=1')) && !heeftKlap(vraag()));
  const html = new Response('<p>x</p>', { status: 200, headers: { 'content-type': 'text/html' } });
  ok('de middleware wist hem op de pagina na de klap', wisKlap('/account/plan', vraag('vis_klap=1'), html) && !wisKlap('/account/plan', vraag(), html) && !wisKlap('/nl/', vraag('vis_klap=1'), html));
  ok('  niet op een doorverwijzing (dan zou hij weg zijn voor de pagina hem ziet)', !wisKlap('/account/plan', vraag('vis_klap=1'), new Response(null, { status: 303, headers: { location: '/account/plan' } })));
  ok('?nav= zet de vlag naast vis_nav', /vis_nav=\$\{balk\}[^\n]*klapZet\(\)/.test(lees('src/lib/account.js')));
  ok('StudioLayout zet data-klap op <html>', /<html [^>]*data-klap=\{heeftKlap\(Astro\.request\)/.test(lees('src/layouts/StudioLayout.astro')));
  const st = lees('src/styles/studio.css');
  ok('studio.css: zonder data-klap staan alle overgangslagen stil', st.includes(':root:not([data-klap])::view-transition-group(*), :root:not([data-klap])::view-transition-old(*), :root:not([data-klap])::view-transition-new(*) { animation: none; }'));
  ok('  en de klap zelf beweegt nog', /:root\[data-klap\]::view-transition-group\(st-kolom\)/.test(st));
}

/* ── DE BROWSER ────────────────────────────────────────────────────────────── */
const { chromium } = await import('playwright');
const { browserPad } = await import('../scripts/lib/browserpad.mjs');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
let PORT = 0;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, () => { PORT = server.address().port; r(); }));
const browser = metVisIn(await chromium.launch({ executablePath: process.env.CHROME || browserPad() }));
const KEUZE = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-15T00:00:00.000Z' })), domain: 'localhost', path: '/' };
const dag = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

/* Verzonnen klant; geen echt adres. Eén antwoord voor /account/me met en zonder
   ?stand=1: het formulier leest de credits, de site leest de stand. */
const STAND = { naam: 'Testa', laatste: null, herbestel: null, lopend: null, abonnee: true, saldo: 120, nieuw: false };
const ME = {
  email: 'inkoop@proefmerk.test', name: 'Testa Proef', first_name: 'Testa', last_name: 'Proef', brand: 'Proefmerk BV',
  phone: '+31 6 00000000', country: 'NL', address_line1: 'Verzonnenstraat 1', postal_code: '1234 AB', city: 'Nergenshuizen',
  regNumber: '12345678', vat: '', noVat: false, locks: {}, models: [], styles: [], saved: true, label: 'Proefmerk BV', tegoedCents: 0,
  credits: { saldo: 120, vervalt: [{ op: dag(80), aantal: 120 }], nieuw: { op: dag(21), aantal: 60 } },
  stand: STAND,
};

async function open(url, { me = null, breed = 1440, hoog = 900, wachtOp = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog } });
  await ctx.addCookies([KEUZE]);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.route('**/account/me**', (r) => (me
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(me) })
    : r.fulfill({ status: 401, contentType: 'application/json', body: 'null' })));
  await page.route('**/api/land', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"NL"}' }));
  await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
  await page.route('**/api/capacity**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reason: 'ok', windows: [{ start: dag(6), end: dag(7) }], from: dag(5), earlier: false, more: false }) }));
  await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
  if (me) await page.waitForFunction(() => document.documentElement.dataset.klantstand === 'gezet', null, { timeout: 8000 }).catch(() => {});
  if (wachtOp) await page.waitForSelector(wachtOp, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  return { ctx, page, fouten };
}

/* ── 1 · DE OPENING ────────────────────────────────────────────────────────── */
console.log('\n1 · de opening');
/* Levering 74 (25 oktober 2026): de opening met de laptopfoto naast de tekst is vervangen
   door de scrollvideo (HalOpening.astro); die wordt nagekeken in tests/opening-74.test.mjs.
   Deze metingen horen bij de oude opening en staan stil. */
for (const breed of []) {
  const { ctx, page, fouten } = await open('/', { breed, hoog: 940 });
  await page.waitForTimeout(1100);
  const r = await page.evaluate(({ S, F }) => {
    const R = (e) => (e ? e.getBoundingClientRect() : null);
    const tekstR = Math.max(...[...document.querySelectorAll('.h-open-tekst > *')].map((e) => e.getBoundingClientRect().right));
    /* De schermen zitten in de foto zelf; hun plek volgt uit de doos en de gemeten hoeken
       van src/data/halLaptop.js. Sinds 23 oktober 2026 de handenfoto (2304 × 1296): de
       laptop links, de telefoon rechts ervoor (20 oktober: de POV-foto, telefoon links). */
    const d = R(document.querySelector('[data-hl-doos]'));
    const k = d ? d.width / F.w : 0;
    const fonL = d && d.left + Math.min(S.fon.tl[0], S.fon.bl[0]) * k;
    const lapL = d && d.left + Math.min(S.laptop.tl[0], S.laptop.bl[0]) * k;
    const lapR = d && d.left + Math.max(S.laptop.tr[0], S.laptop.br[0]) * k;
    const bed = R(document.querySelector('.hl-bediening'));
    const uitleg = R(document.querySelector('.hl-uitleg'));
    const opening = R(document.querySelector('.h-opening'));
    return { vw: document.documentElement.clientWidth, tekstR, fonL, lapL, lapR, doosO: d && d.bottom, bedT: bed && bed.top, bedM: bed && (bed.left + bed.right) / 2, uitlegO: uitleg && uitleg.bottom, openingO: opening && opening.bottom };
  }, { S: SCHERMEN, F: FOTO });
  ok(`${breed}px: de laptop staat helemaal in beeld (rechts ${Math.round(r.vw - r.lapR)} px over)`, r.lapR != null && r.lapR <= r.vw - 20, JSON.stringify(r));
  ok(`${breed}px: het laptopscherm begint ${Math.round(r.lapL - r.tekstR)} px na de tekst`, r.lapL != null && r.lapL >= r.tekstR + 24, JSON.stringify(r));
  ok(`${breed}px: de telefoon staat rechts van de tekst (${Math.round(r.fonL - r.tekstR)} px)`, r.fonL != null && r.fonL >= r.tekstR + 24, JSON.stringify(r));
  /* 07:28 (15 oktober) · de balk hoort bij de laptop en de zin eronder valt niet weg. Sinds
     de POV-foto (20 oktober) hangt hij net onder de foto, onder de laptop; zo ook in de
     handenfoto (23 oktober). */
  ok(`${breed}px: de balk hangt onder de laptop (${Math.round(r.bedT - r.doosO)} px onder de foto) en de zin eronder staat helemaal in beeld`, r.bedT != null && r.bedT - r.doosO >= 0 && r.bedT - r.doosO < 40 && r.bedM >= r.lapL && r.bedM <= r.lapR && r.uitlegO <= r.openingO, JSON.stringify(r));
  ok(`${breed}px: geen scriptfout`, fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

/* ── 9b · STAP 2 IN DE BROWSER ─────────────────────────────────────────────── */
console.log('\n9b · stap 2 in de browser');
{
  const { ctx, page, fouten } = await open('/nl/', { breed: 1440 });
  const stand = () => page.evaluate(() => {
    const st = (s) => { const e = document.querySelector(`#hoe ${s}`); return e ? getComputedStyle(e) : null; };
    const dek = document.querySelector('#hoe .h-dek');
    return {
      pad: Number(st('.h-maak-pad')?.opacity), pen: Number(st('.h-maak-pen')?.opacity), echt: Number(st('.h-maak-echt')?.opacity),
      begin: Number(st('.h-maak-begin')?.opacity), vink4: st('.h-lagen li:nth-child(5) i')?.transform,
      dek: dek ? getComputedStyle(dek).getPropertyValue('--dek').trim() : null, klassen: document.querySelector('#hoe').className,
    };
  });
  await page.evaluate(() => document.querySelector('#hoe')?._u?.opnieuw());
  await page.waitForFunction(() => document.querySelector('#hoe').classList.contains('u-s2'), null, { timeout: 12000 }).catch(() => {});
  /* Sinds 15 oktober 11:59 begint stap 2 met rechtzetten, opbouwen en nakijken, en
     komt de pen pas daarna. Sinds levering 61 (lijst 39, e-stappen: "Animatie mag wel
     iets sneller") loopt alles op 0,75 keer de tijd: 3,19 s rechtzetten, opbouwen en
     nakijken, de pen na 3,375 s. De meetmomenten schuiven mee: 0,675 s, 1,425 s,
     2,25 s en 3,825 s (was 0,9, 1,9, 3,0 en 5,1). */
  const o = () => page.evaluate(() => { const g = (s) => Number(getComputedStyle(document.querySelector(`#hoe ${s}`)).opacity); return { foto: g('.h-maak-laag'), kader: g('.h-maak-greep rect'), muis: g('.h-maak-muis'), kwast: g('.h-maak-bouwkwast'), loep: g('.h-maak-lp'), pen: g('.h-maak-pen'), echt: g('.h-maak-echt'), schuin: getComputedStyle(document.querySelector('#hoe .h-maak-laag')).transform !== 'none' }; });
  await page.waitForTimeout(675);
  const recht = await o();
  ok('tijdens stap 2, eerst: je foto in het kader, de muis zet hem recht; nog geen pen en geen eindbeeld', recht.foto > 0.9 && recht.kader > 0.9 && recht.muis > 0.9 && recht.schuin && recht.pen < 0.05 && recht.echt < 0.05, JSON.stringify(recht));
  await page.waitForTimeout(750);
  const bouw = await o();
  ok('  dan het penseel dat het beeld opbouwt', bouw.kwast > 0.9 && bouw.kader < 0.05, JSON.stringify(bouw));
  await page.waitForTimeout(825);
  const loep = await o();
  ok('  dan de loep langs knoop, stiksel en kleur', loep.loep > 0.9 && loep.kwast < 0.05, JSON.stringify(loep));
  await page.waitForTimeout(1575);
  const tijdens = await stand();
  ok('tijdens stap 2: de pen trekt de omtrek, het geleverde beeld staat er nog niet', tijdens.pad > 0.9 && tijdens.pen > 0.9 && tijdens.echt < 0.05, JSON.stringify(tijdens));
  await page.evaluate(() => document.querySelector('#hoe')?._u?.stop());
  await page.waitForTimeout(300);
  const klaar = await stand();
  ok('na afloop: het geleverde beeld, geen gereedschap, vijf vinkjes, dekking 20%', klaar.pad === 0 && klaar.pen === 0 && klaar.echt === 1 && klaar.begin === 0 && klaar.vink4 === 'none' && klaar.dek === '20', JSON.stringify(klaar));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

/* ── 3 · DE PROEF VOOR WIE AL KLANT IS ─────────────────────────────────────── */
console.log('\n3 · de €1-proef voor wie al klant is');
const ALLE = [];
(function zoek(dir, rel) {
  for (const n of fs.readdirSync(dir)) {
    const f = path.join(dir, n);
    if (fs.statSync(f).isDirectory()) { if (n !== 'server' && n !== '_astro' && n !== 'img') zoek(f, `${rel}${n}/`); }
    else if (n === 'index.html') ALLE.push(rel);
  }
}(DIST, '/'));
/* De pagina's die de proef UITLEGGEN (FAQ, voorwaarden) en de proef zelf tellen
   niet mee; de bedankpagina en de 404 ook niet. */
const PAGINAS = ALLE.filter((p) => !/faq|terms|test-sample|thank-you|404|voorbeeld|\/o\//.test(p)).sort();
const proefOp = (page) => page.evaluate(() => {
  const zicht = (e) => { for (let x = e; x; x = x.parentElement) { const s = getComputedStyle(x); if (x.hidden || s.display === 'none' || s.visibility === 'hidden') return false; } const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const res = new Set();
  for (const a of document.querySelectorAll('a[href*="test-sample"]')) if (zicht(a)) res.add(`link "${a.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)}"`);
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  /* "€1" als prijs, niet "€1.170" of "€1,170". */
  while (w.nextNode()) { const t = w.currentNode.textContent; if (/€\s?1(?![\d]|[.,]\d)/.test(t) && zicht(w.currentNode.parentElement)) res.add(`tekst "${t.replace(/\s+/g, ' ').trim().slice(0, 60)}"`); }
  return [...res];
});
{
  const { ctx, page } = await open('/nl/', {});
  const uit = await proefOp(page);
  ok('uitgelogd: de proef staat op de voorpagina', uit.length > 0, JSON.stringify(uit));
  await ctx.close();
}
const gevonden = [];
let fouten3 = [];
for (const url of PAGINAS) {
  const { ctx, page, fouten } = await open(url, { me: ME });
  for (const x of await proefOp(page)) gevonden.push(`${url}: ${x}`);
  fouten3 = fouten3.concat(fouten.map((f) => `${url}: ${f}`));
  await ctx.close();
}
ok(`ingelogd: op ${PAGINAS.length} pagina's nergens een proefknop of "€1"`, gevonden.length === 0, gevonden.join(' | '));
ok('  geen scriptfout op die pagina\'s', fouten3.length === 0, fouten3.slice(0, 4).join(' | '));
{
  const { ctx, page } = await open('/nl/', { me: ME });
  const looks = await page.evaluate(() => {
    const zicht = (e) => !!e && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none';
    return [...document.querySelectorAll('[data-vis-klant-in]')].filter(zicht).map((a) => `${a.textContent.trim()} → ${a.getAttribute('href')}`);
  });
  ok('ingelogd: bij de looks "Bestel deze look" naar het formulier', looks.length > 0 && looks.every((x) => /^Bestel deze look → \/nl\/start\//.test(x)), JSON.stringify(looks));
  await ctx.close();
}
{
  const { ctx, page } = await open('/nl/', {});
  const looks = await page.evaluate(() => [...document.querySelectorAll('[data-vis-klant-in]')].filter((e) => !e.closest('[hidden]') && getComputedStyle(e).display !== 'none').length);
  ok('  uitgelogd staat "Bestel deze look" er niet', looks === 0, String(looks));
  await ctx.close();
}

/* ── 4 · STAP 1 IN CREDITS ─────────────────────────────────────────────────── */
console.log('\n4 · stap 1 voor een abonnee');
const stap1 = (page) => page.evaluate(() => {
  const zicht = (e) => { for (let x = e; x; x = x.parentElement) { if (x.hidden || getComputedStyle(x).display === 'none') return false; } return true; };
  const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
  return {
    tarief: t('[data-pl-angle-rate]'),
    euroZicht: [...document.querySelectorAll('[data-pl-alleen-euro]')].filter(zicht).length,
    creditsZicht: [...document.querySelectorAll('[data-pl-alleen-credits]')].filter(zicht).map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
    tegels: [...document.querySelectorAll('[data-bo-hoek]')].filter((e) => !e.hidden && zicht(e)).map((e) => e.getAttribute('data-bo-hoek')),
    per: t('[data-bo-per]'),
  };
});
const vinkAan = (page, id) => page.evaluate((i) => {
  const b = document.querySelector(`input[name="angle_${i}"]`);
  if (b && !b.checked) { b.checked = true; b.dispatchEvent(new Event('change', { bubbles: true })); }
}, id);
for (const [url, taal] of [['/nl/start/catalog/', 'nl'], ['/start/catalog/', 'en']]) {
  const { ctx, page, fouten } = await open(url, { me: ME, wachtOp: '#pl-form.is-live' });
  await page.waitForTimeout(600);
  let s = await stap1(page);
  ok(`${taal}: de extra hoek kost "${EXTRA_CREDITS.photo} credits", zonder euro`, !!s.tarief && s.tarief.includes(`${EXTRA_CREDITS.photo} credits`) && !/€/.test(s.tarief), s.tarief);
  ok(`${taal}:   de euro-zinnen zijn weg, de creditzinnen staan er`, s.euroZicht === 0 && s.creditsZicht.length > 0, JSON.stringify(s));
  await vinkAan(page, 'three-quarter');
  await page.waitForTimeout(250);
  s = await stap1(page);
  ok(`${taal}: een aangevinkte hoek staat als tegel bij "Wat je krijgt"`, JSON.stringify(s.tegels) === '["three-quarter"]', JSON.stringify(s.tegels));
  ok(`${taal}:   en het paneel telt 5 beelden per product`, /5/.test(s.per || ''), s.per);
  /* Voorrang kan pas met een aantal (syncVoorrang); 2 producten passen ruim in 120 credits. */
  await page.fill('[data-pl-qty-input]', '2');
  await page.locator('[data-pl-qty-input]').blur();
  await page.waitForTimeout(400);
  s = await stap1(page);
  ok(`${taal}: met een aantal blijven de prijzen in credits`, !!s.tarief && s.tarief.includes(`${EXTRA_CREDITS.photo} credits`) && !/€/.test(s.tarief) && s.euroZicht === 0, JSON.stringify(s));
  const voorrang = await page.evaluate(() => {
    const v = document.querySelector('input[name="voorrang"]');
    if (!v || v.disabled) return false;
    v.checked = true; v.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  await page.waitForTimeout(400);
  s = await stap1(page);
  ok(`${taal}: met voorrang (gaat niet met credits) staan de prijzen weer in euro`, voorrang && !!s.tarief && /€/.test(s.tarief), `${voorrang} ${s.tarief}`);
  ok(`${taal}: geen scriptfout`, fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}
{
  const { ctx, page, fouten } = await open('/nl/start/catalog/', { wachtOp: '#pl-form.is-live' });
  await page.waitForTimeout(400);
  let s = await stap1(page);
  ok('uitgelogd: de extra hoek kost euro\'s', !!s.tarief && /€/.test(s.tarief) && !/credits/.test(s.tarief), s.tarief);
  ok('  geen creditzinnen', s.creditsZicht.length === 0, JSON.stringify(s.creditsZicht));
  await vinkAan(page, 'inside');
  await page.waitForTimeout(250);
  s = await stap1(page);
  ok('  ook dan komt de hoek als tegel in het paneel', JSON.stringify(s.tegels) === '["inside"]', JSON.stringify(s.tegels));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd\n`);
process.exit(fail ? 1 : 0);
