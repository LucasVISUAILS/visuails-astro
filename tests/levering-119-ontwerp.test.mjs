/* VISUAILS — levering 119 (18 november 2026), proefronde: ontwerp en de gedeelde onderdelen (bouwer C4).
 *
 *   node tests/levering-119-ontwerp.test.mjs      (geen build nodig: leest de bron, rekent de bedragen na uit pricing.js en
 *                                                  plans.js, en zet knoppen.css in een browser op een testpagina)
 *
 *   D1-07 · koppen hoogstens twee regels: de maten in hal.css (blok LEVERING 119), nagerekend tegen de gemeten grenzen;
 *           de Engelse slotkop van /per-product korter; de controlekaart (.h-bm-check) op de telefoon onder elkaar;
 *   D1-08 · Verder en Versturen van het merkmodel zijn mint (knoppen.css) en Verder staat rechts;
 *   D1-10 · de plaatshouder in het abonnementsformulier in het grijs van de andere formulieren (5,9 : 1);
 *   D1-11 · op de telefoon in het midden: .h-bm-bieb, .h-pl-maat, .h-st-groep-kop, .h-st-ook(-rij), de zin onder de video;
 *   D1-12 · de paginakop van catalog, lifestyle en video: een spatie tussen de twee regels;
 *   P1-02 · de beeldhouder van een look neemt op de telefoon de breedte van de kaart (geen 0 px zolang de foto laadt);
 *   T1-04 · Wat we maken staat vóór het script al in zijn eindmaat (de getallen gelijk aan zet() in HalMaken80);
 *   L-09  · merk 12 maanden: los − gemiddeld = besparing (gerekend met het getoonde gemiddelde);
 *   L-12  · "Met een geldig EU-btw-nummer …: € 450" niet bij land Nederland;
 *   P7-09 · de KVK-regel in de voet zegt in het Engels wat het is.
 *   (P1-13, de WhatsApp-knop, staat in tests/levering-119-whatsapp.test.mjs.)
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

const hal = lees('src/styles/hal.css');
const blok = hal.slice(hal.indexOf('LEVERING 119 · KOPPEN'));
const tel = lees('src/styles/telefoon-115.css');

/* ── D1-07 ───────────────────────────────────────────────────────────────── */
console.log('\nD1-07 · koppen hoogstens twee regels');
ok('hal.css heeft het blok LEVERING 119 · KOPPEN', hal.includes('LEVERING 119 · KOPPEN'));
ok('  zonder :is() (tests/live-qa-51)', !/:is\(/.test(blok.replace(/\/\*[\s\S]*?\*\//g, '')));
/* het slot: de kop is 88vw − 75,25 px breed (gemeten 320 – 600 px); gemeten grenzen (grootste maat op twee regels, de krapste
   van de twaalf slotkoppen NL/EN) */
const slot = blok.match(/\.h-lk-slot \.h-kop\.h-h2 \{ font-size: max\(18px, min\(6\.3vw, 32px, calc\(\(88vw - 75\.25px\) \/ ([\d.]+)\)\)\); \}/);
ok('het slot: max(18px, min(6.3vw, 32px, (88vw − 75,25px) / k))', !!slot);
const GRENS_SLOT = { 320: 19.4, 330: 20.2, 340: 21.1, 341: 21.2, 360: 22.7 };
if (slot) for (const [w, grens] of Object.entries(GRENS_SLOT)) {
  const maat = Math.max(18, Math.min(6.3 * w / 100, 32, (0.88 * w - 75.25) / Number(slot[1])));
  ok(`  op ${w} px ${maat.toFixed(2)} px ≤ ${grens} (gemeten grens) en ≥ 18`, maat <= grens && maat >= 18);
}
/* de koppen in een kolom: de maat volgt de kolom (container), k = gemeten breedte / maat + marge */
const K = [
  ['/how-it-works "Gemaakt met AI. Tot in detail nagekeken."', /\.h-hw-hand-tekst \.h-kop\.h-h2 \{ font-size: min\(2\.963vw, 42\.67px, calc\(100cqw \/ ([\d.]+)\)\); \}/, 12.04],
  ['/nl/models "Inbegrepen, niet iets wat je erbij moet kopen."', /\.h-md-inc-tekst \.h-kop\.h-h2 \{ font-size: min\(2\.963vw, 42\.67px, calc\(100cqw \/ ([\d.]+)\)\); \}/, 12.24],
  ['/studio het logboek (320 – 340)', /\.h-sd-log-tekst \.h-kop\.h-h3 \{ font-size: max\(17px, min\(18px, calc\(100cqw \/ ([\d.]+)\)\)\); \}/, 14.5],
  ['/guides de kaarten', /\.h-gd-kaart \.h-gd-titel \{ font-size: min\(26px, calc\(100cqw \/ ([\d.]+)\)\); \}/, 10.02],
  ['/test-sample de kop (vanaf 641 px)', /\.h-ts-open \.h-proef-kop \.d \{ font-size: min\(1em, calc\(100cqw \/ ([\d.]+)\)\); \}/, 11.42],
  ['/editions "Two sets, and only one of them costs anything." (901 +)', /#ed-vgl\.h-kop\.h-h2 \{ font-size: min\(2\.963vw, 42\.67px, calc\(100cqw \/ ([\d.]+)\)\); \}/, 12.54],
  ['/upload-guidelines "Which photo becomes which image." (901 +)', /#ug-paren\.h-kop\.h-h2 \{ font-size: min\(2\.963vw, 42\.67px, calc\(100cqw \/ ([\d.]+)\)\); \}/, 11.31],
];
for (const [naam, re, gemeten] of K) {
  const m = blok.match(re);
  ok(`${naam}: kolom / ${m ? m[1] : '?'} (gemeten ${gemeten}, dus kleiner dan wat past)`, !!m && Number(m[1]) > gemeten);
}
for (const kol of ['.h-hw-hand-tekst', '.h-md-inc-tekst', '.h-sd-log-tekst', '.h-gd-kaart', '.h-ts-open > .h-proef-woord']) {
  ok(`  ${kol} is de kolom (container-type: inline-size)`, blok.includes(`${kol} { container-type: inline-size; }`));
}
ok('  de kolom van /editions en /upload-guidelines (:has, zonder komma tussen haakjes)', /\.h-sec-kop > div:has\(> #ed-vgl\) \{ container-type: inline-size; \}/.test(blok) && /\.h-sec-kop > div:has\(> #ug-paren\) \{ container-type: inline-size; \}/.test(blok));
ok('  de /test-sample-regel alleen vanaf 641 px (daaronder de regels van 25 oktober en levering 118)', /@media \(min-width: 641px\) \{[^@]*\.h-ts-open > \.h-proef-woord \{ container-type: inline-size; \}/.test(blok));
const pp = lees('src/components/PerProductHal.astro');
ok('/per-product EN: "Every product gets this. Now choose your look." (paste op 320 pas op 15,7 px, nu 18,9)', /slotKop: \['Every product gets this\.', 'Now choose your look\.'\]/.test(pp) && !/This is what every product gets/.test(pp));
ok('  NL ongewijzigd', /slotKop: \['Dit krijgt elk product\.', 'Kies nu je look\.'\]/.test(pp));
ok('de controlekaart (.h-bm-check) op de telefoon: het rondje boven de tekst', /:is\(\.h-st-kort-rij > li, \.h-st-regel, \.h-pr-tarief-zin, \.h-bm-check\):not\(#k\):not\(#k\) \{ flex-direction: column; align-items: center; text-align: center;/.test(tel));

/* ── D1-08 ───────────────────────────────────────────────────────────────── */
console.log('\nD1-08 · de knoppen van het merkmodel');
const knoppen = lees('src/styles/knoppen.css');
const bm = lees('src/components/BrandModelBrief.astro');
ok('knoppen.css: [data-bm-next] en .bm-submit in alle vier de regels van de actiekleur', (knoppen.match(/\[data-wk-verder\], \[data-bm-next\], \.bm-submit, \.ps-verzend/g) || []).length === 4);
ok('BrandModelBrief: Verder heeft data-bm-next, Versturen .bm-submit', /class="knop knop-inkt k-groot" data-rol="doorgaan" data-bm-next/.test(bm) && /class="knop knop-inkt k-groot bm-submit"/.test(bm));
ok('  Verder staat rechts (margin-left: auto op de knop zelf)', /\.bm-nav \[data-bm-next\] \{ margin-left: auto; \}/.test(bm));

/* ── D1-10 ───────────────────────────────────────────────────────────────── */
console.log('\nD1-10 · de plaatshouder in /start/plan');
const plan = lees('src/components/order/PlanPicker.astro');
ok('PlanPicker: .ps-veld input::placeholder in --ink-3', /\.ps-veld input:not\(\[type=checkbox\]\)::placeholder \{ color: var\(--ink-3\); opacity: 1; \}/.test(plan));
ok('  --ink-3 is in de hal --h-inkt-3', /--ink-3: var\(--h-inkt-3\)/.test(hal));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const cr = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const inkt3 = (hal.match(/--h-inkt-3:\s*(#[0-9A-Fa-f]{6})/) || [])[1];
ok(`  ${inkt3} op wit: ${inkt3 ? cr(inkt3, '#FFFFFF').toFixed(2) : '?'} : 1 ≥ 4,5 (was browsergrijs, 2,8 – 3,4 gemeten)`, !!inkt3 && cr(inkt3, '#FFFFFF') >= 4.5);

/* ── D1-11 en P1-02 ──────────────────────────────────────────────────────── */
console.log('\nD1-11 · op de telefoon in het midden; P1-02 · de beeldhouder');
ok('telefoon-115: de vier afbrekende rijen naar het midden', /:is\(\.h-bm-bieb, \.h-pl-maat, \.h-st-groep-kop, \.h-st-ook, \.h-st-ook-rij\):not\(#k\):not\(#k\) \{ justify-content: center; \}/.test(tel));
ok('  binnen @media (max-width: 700px)', tel.indexOf('.h-bm-bieb, .h-pl-maat') > tel.indexOf('@media (max-width: 700px)') && tel.indexOf('.h-bm-bieb, .h-pl-maat') < tel.indexOf('/* 6 · de voet'));
const ov = lees('src/styles/onder-video-110.css');
ok('de zin onder de video: zwaarder dan ".h-pagina p { margin: 0 }"', /@media \(max-width: 700px\) \{[\s\S]*html body\.hal \.ov110 \.ov110-zin \{ margin-inline: auto; \}/.test(ov));
ok('P1-02: .h-st-look > .h-st-beeld rekt mee (align-self: stretch)', /\.h-st-look > \.h-st-beeld:not\(#k\):not\(#k\) \{ align-self: stretch; \}/.test(tel));
ok('  en de houder heeft nog zijn 4 : 5 (hal.css)', /\.hal \.h-st-beeld \{[^}]*aspect-ratio: 4 \/ 5;/.test(hal));

/* ── D1-12 ───────────────────────────────────────────────────────────────── */
console.log('\nD1-12 · een spatie tussen de regels van de paginakop');
for (const f of ['CatalogHal', 'LifestyleHal', 'VideoHal']) {
  const b = lees(`src/components/${f}.astro`);
  ok(`${f}: elke regel na de eerste begint met een spatie`, /\.map\(\(r, i\) => <>\{i > 0 && ' '\}<span class="h-regel"/.test(b));
  ok(`  en geen kale map naar h-regel meer`, !/\.map\(\(r, i\) => <span class="h-regel"/.test(b));
}
/* wat de tekst dan is: de spans worden zonder witruimte aan elkaar gezet, nu met één spatie ertussen */
const tekst = (regels) => regels.map((r, i) => `${i > 0 ? ' ' : ''}${r}`).join('');
ok('  "Product videos" + "that move." → "Product videos that move."', tekst(['Product videos', 'that move.']) === 'Product videos that move.');

/* ── T1-04 ───────────────────────────────────────────────────────────────── */
console.log('\nT1-04 · Wat we maken in zijn eindmaat vóór het script');
const m8 = lees('src/styles/maken-80.css');
const m8js = lees('src/components/HalMaken80.astro');
const pre = (m8.match(/@media \(scripting: enabled\) and \(max-width: 839px\) \{([\s\S]*?)\n\}/) || [])[1] || '';
ok('maken-80.css: een blok @media (scripting: enabled) and (max-width: 839px)', !!pre);
ok('zet(): op de telefoon (baan < 700) w = 0,76 × baan, minstens 220, gat 14, schaal 0,82, x0 in het midden',
  /const tel = bw < 700, s = \.82, g = tel \? 14/.test(m8js) && /let w = tel \? Math\.round\(bw \* \.76\)/.test(m8js) && /w = Math\.max\(220, w\)/.test(m8js) && /const x0 = tel \? Math\.max\(0, Math\.round\(\(bw - w\) \/ 2\)\)/.test(m8js));
ok('  de css: kaart 76 %, links 12 % ((1 − 0,76) / 2), de volgende op 88 % + 14 px en 0,82', /\.m8-dienst \{ position: absolute; top: 0; left: 12%; width: 76%; transform-origin: 0 50%; \}/.test(pre) && /:nth-child\(2\) \{ left: calc\(88% \+ 14px\); transform: scale\(\.82\); \}/.test(pre));
ok('  de derde op 88 % + 14 + 0,82 × 76 % + 14 = 150,32 % + 28 px', Math.abs(88 + 0.82 * 76 - 150.32) < 0.001 && /:nth-child\(n \+ 3\) \{ left: calc\(150\.32% \+ 28px\); transform: scale\(\.82\); \}/.test(pre));
ok('  de hoogte 1,25 × 0,76 = 0,95 × de baan, minstens 1,25 × 220 = 275 px', Math.abs(1.25 * 0.76 - 0.95) < 1e-9 && /height: max\(275px, calc\(\(100vw - 2 \* var\(--m8-m\)\) \* \.95\)\);/.test(pre));
ok('  tot 839 px: daar is de baan (venster − 2 × de marge) smaller dan 700', (() => { const m = (w) => Math.max(20, Math.min(w * 0.08333, 160), (w - 1280) / 2); return 839 - 2 * m(839) < 700 && 840 - 2 * m(840) >= 699.9; })());
ok('  alleen zolang .m8-aan er niet is (daarna de regels van het script)', !/\.m8-aan/.test(pre.replace(/:not\(\.m8-aan\)/g, '')));

/* ── L-09 ────────────────────────────────────────────────────────────────── */
console.log('\nL-09 · gemiddelde en besparing tellen op');
const getoond = plan.match(/const getoondCents = ([^;]+);/);
ok('PlanPicker: één getoond maandbedrag (getoondCents)', !!getoond);
ok('  het bedrag op de kaart en de besparing rekenen ermee', /bedrag: euro\(getoondCents \/ 100, lang\)/.test(plan) && /const verschil = Math\.round\(besp\.onLadder \* 100\) - getoondCents;/.test(plan));
if (getoond) {
  /* levering 123 (19 november 2026): op Windows wil import() een file://-adres, geen kaal pad als E:\… (faalde bij Lucas' uitrol) */
  const P = await import(pathToFileURL(path.join(ROOT, 'src/data/pricing.js')).href);
  const L = await import(pathToFileURL(path.join(ROOT, 'src/data/plans.js')).href);
  const reken = new Function('cents', 'tt', `return ${getoond[1]};`);
  for (const id of L.PLAN_IDS) for (const t of L.OFFERED_TERM_IDS) {
    const cents = L.monthlyCents(id, t); const tt = L.term(t); const besp = P.planSaving(id);
    if (!besp) continue;
    const g = reken(cents, tt); const bespaar = Math.round(besp.onLadder * 100) - g;
    ok(`  ${id} ${t}: los ${P.euro(besp.onLadder, 'nl')} − ${P.euro(g / 100, 'nl')} = ${P.euro(bespaar / 100, 'nl')}`, Math.round(besp.onLadder * 100) - g === bespaar && (!tt.prepaid || g % 500 === 0));
  }
  const merk = reken(L.monthlyCents('brand', 'prepaid'), L.term('prepaid'));
  ok('  merk 12 maanden: € 1.410 en je bespaart € 1.470 (was € 1.472)', P.euro(merk / 100, 'nl') === '€1.410' && P.euro((Math.round(P.planSaving('brand').onLadder * 100) - merk) / 100, 'nl') === '€1.470');
}

/* ── L-12 ────────────────────────────────────────────────────────────────── */
console.log('\nL-12 · de zin over € 450 niet bij Nederland');
ok('BrandModelBrief: de zin apart (prijsBuitenNl), in een eigen span', /const prijsBuitenNl = lang === 'nl'/.test(bm) && /\{prijsBijMollie\} <span data-bm-buiten-nl>\{prijsBuitenNl\}<\/span>/.test(bm));
ok('  prijsBijMollie zegt alleen nog wat je bij Mollie betaalt', !/const prijsBijMollie[^;]*buiten de EU/.test(bm));
ok('  syncBtw() verbergt hem bij land NL', /form\.querySelectorAll\('\[data-bm-buiten-nl\]'\)\.forEach\(\(el\) => \{ el\.hidden = soort === 'nl'; \}\);/.test(bm));
ok('  en de zin staat in NL én EN', /Met een geldig EU-btw-nummer of buiten de EU: \$\{prijs\}\./.test(bm) && /With a valid EU VAT number or outside the EU: \$\{prijs\}\./.test(bm));

/* ── P7-09 ───────────────────────────────────────────────────────────────── */
console.log('\nP7-09 · de KVK-regel in de voet');
const lay = lees('src/layouts/Layout.astro');
ok('Layout: EN "Chamber of Commerce (KVK) 99742993", NL "KVK 99742993"', /\{lang === 'nl' \? 'KVK' : 'Chamber of Commerce \(KVK\)'\} 99742993/.test(lay));

/* ── D1-08 in een browser: wordt de knop echt mint? ─────────────────────── */
console.log('\nD1-08 · knoppen.css in een browser');
let browser = null;
try {
  const { chromium } = await import('playwright');
  const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
} catch (e) { console.log(`  --   geen browser (${String(e.message).split('\n')[0]}); dit deel overgeslagen`); }
if (browser) {
  const p = await browser.newPage();
  await p.setContent(`<!doctype html><style>${knoppen}</style>
    <button class="knop knop-inkt k-groot" data-bm-next id="a">Verder</button>
    <button type="submit" class="knop knop-inkt k-groot bm-submit" id="b">Versturen</button>
    <button class="knop knop-inkt k-groot" data-pl-next id="c">Verder</button>
    <button class="knop knop-inkt k-groot" id="d">Iets anders</button>`);
  const kl = await p.evaluate(() => ['a', 'b', 'c', 'd'].map((id) => getComputedStyle(document.getElementById(id)).backgroundColor));
  ok(`Verder van het merkmodel mint (${kl[0]})`, kl[0] === 'rgb(61, 255, 176)');
  ok(`Versturen van het merkmodel mint (${kl[1]})`, kl[1] === 'rgb(61, 255, 176)');
  ok(`Verder van het bestelformulier blijft mint (${kl[2]})`, kl[2] === 'rgb(61, 255, 176)');
  ok(`een gewone inktknop blijft niet-mint (${kl[3]})`, kl[3] !== 'rgb(61, 255, 176)');
  await browser.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
