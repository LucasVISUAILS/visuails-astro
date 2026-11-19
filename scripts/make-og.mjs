/* De deelplaatjes. `npm run og`   (en voor het logopakket: `node scripts/make-og.mjs --pakket <map>`)
 *
 * WAAROM ER EEN DEELPLAATJE IS. og:image wees ooit naar een foto zonder één woord erbij: wie visuails.com deelde
 * in WhatsApp, Slack of LinkedIn, stuurde een model in de duinen. Dit plaatje is de eerste keer dat iemand de site
 * ziet zonder er zelf naartoe te zijn gegaan. DE KOP KOMT UIT DE CODE en wordt hier niet overgetypt (Lucas: *"anders
 * staat de oude er over drie maanden nog ergens."*). Verandert de kop, draai dit opnieuw.
 *
 * LEVERING 112 (16 november 2026, fase 5 van kladblok/PLAN-KAARTVELD-100.md). C1 en C3 zijn de vormen van levering 89
 * (lijst 82 en 83); de voorpagina kreeg vorm b uit lijst 103. Alles in de nieuwe kleuren en met de nieuwe kop:
 *   - de grond is het KAARTVELD van de site (src/scripts/kaartveld.js, met kaart-100.css en kaart-108.css): het plaatje is
 *     één kaart, groter dan het beeld, zodat de ronde hoeken en de aderen erbuiten vallen. Elk plaatje staat op een andere
 *     plek op de pagina en heeft dus een eigen stuk veld. Onder de tekst en het logo wijkt het licht ([data-tekstvlak]),
 *     zoals op elke kaart van de site. Het veld staat stil (minder beweging: één beeld);
 *   - de kop is de titel van de voorpagina (src/data/banner94.js, BANNER[lang].kop): de aanloop klein, de grote regel
 *     groot, in VISUAILS Display Blok, wit, zonder leesteken (lijst 122). De aanloop is 42 % van de grote regel, net als op
 *     de site. De oude kop (TAGLINE, "All your product imagery. Without a shoot.") staat er niet meer op;
 *   - het logo is wit, het V-merk en het tekstlogo uit het merk (V_D en K5 uit src/data/woordmerk.js), alleen herkleurd.
 * LEVERING 120 (19 november 2026, lijst 130 – 133): de titel van de voorpagina is één titel in één maat (BANNER[lang].titel,
 * "Your brand’s visual content partner" / "De beeldmakers achter jouw merk") in VISUAILS Display 2 Light (300), in gewone
 * schrijfwijze, zonder aanloop. Hier dus ook: de titel zo breed als zijn kolom (kaphoogte hoogstens 1,5 u, kaphoogte 700 op
 * 1000 zoals de blokletter), wit, de onderste basislijn op 11 u; op de voorpagina (b) op twee regels.
 * Het RASTER VOOR BEELDEN (docs/KLEURENSCHEMA.md) blijft: u = de korte zijde ÷ 12 (52,5 px), marge 1 u, de lockup naast
 * (L2) 1 u hoog, alleen het merk (L3) 6 u hoog, de onderste basislijn op 11 u. De grote regel is zo breed als zijn kolom,
 * met een kaphoogte van hoogstens 1,5 u.
 *   C1  (elke pagina)    het veld; de lockup L2 linksboven; de kop in de onderste rijen, over de hele breedte.
 *   b   (de voorpagina)  "Van jouw foto tot het beeld" (lijst 103, b; gekozen 16 november 2026): het veld; rechts drie
 *                        beelden van de NON/STD-hoodie op een rij, 01 jouw foto, 02 productfoto, 03 op model, met hun
 *                        stap eronder in IBM Plex Mono; het tekstlogo los linksboven (kaphoogte ½ u); de kop links ervan.
 *                        Stap 2 is een set: drie productfoto's onder elkaar (voor, achter, detail).
 *                        De kolom is daar smal, dus de grote regel staat op twee regels (de breuk met de kortste
 *                        langste regel); zo blijft hij groot genoeg om op een telefoon te lezen. Dit verving C2 b (de V
 *                        als venster op de witte jas).
 *   C3  (zonder kop)     het veld; de lockup L3, 6 u hoog, in het midden.
 * Dit script meet het slechtste beeldpunt onder elke letter en elk logo en stopt als tekst onder 4,5 : 1 of een logo
 * onder 3 : 1 komt. 1200 × 630, het formaat van Facebook, LinkedIn, X, Slack en WhatsApp.
 *
 * Uit: public/img/og-nl.jpg, og-en.jpg (C1), og-voorpagina-nl.jpg, og-voorpagina-en.jpg (b), og-logo.jpg (C3), als jpeg
 * (hoogstens 300 kB: WhatsApp toont het voorbeeld anders niet). Met --pakket <map> komen dezelfde vijf daar ook als png,
 * als png op dubbele maat (@2x) en als jpg (het logopakket, images/Logo/visuails-logo-100/deelplaatjes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { BANNER } from '../src/data/banner94.js';
import { browserPad } from './lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/img');
const i = process.argv.indexOf('--pakket');
const PAKKET = i > 0 ? path.resolve(process.argv[i + 1]) : null;
const { WOORDMERK, LOCKUP } = await import('../src/data/woordmerk.js');

const W = 1200, H = 630, U = H / 12;
const WIT = '#FFFFFF';
const V_D = ['M 0.0 16.0 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 L 515.5 546.25 L 264.5 119.0 A 201.21 201.21 0 0 0 101.0 15.75 L 0.0 16.0 Z',
  'M 701.75 0.0 L 543.25 366.25 L 507.25 453.75 L 652.0 259.25 L 702.0 338.25 L 701.75 0.0 Z'];
/* VISUAILS Display 2 Light (levering 120): kaphoogte 700 op 1000 (OS/2 sCapHeight, docs/letter/bron/familie2.py) */
const KAP = 0.700;

const lees = (f) => { const p = path.join(ROOT, f); if (!fs.existsSync(p)) throw new Error(`make-og: ${p} niet gevonden`); return p; };
const dataUrl = (abs, mime) => `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
const KOPLETTER = lees('public/fonts/visuails-display/VISUAILSDisplay2-Light.woff2');
const MONO = lees('public/fonts/ibm-plex-mono/IBMPlexMono-600.woff2');
/* de drie stappen van de voorpagina: dezelfde hoodie, van de telefoonfoto tot het beeld op model (src/data en de galerij) */
/* stap 2 is een set van drie productfoto's onder elkaar (Lucas, 17:31: "alle 3 de productfoto's onder elkaar"): voor, achter en
   een detail, uit de galerij van de voorpagina */
const G = 'public/img/hal/opening/galerij/';
const STAP = [[lees('public/img/hoodie-voor.webp')], [lees(G + 'hoodie-0.webp'), lees(G + 'hoodie-1.webp'), lees(G + 'hoodie-3.webp')], [lees('public/img/hal/maken/lifestyle99/hoodie.webp')]];
const STAP_LABEL = { en: ['01 · Your photo', '02 · Product photos', '03 · On model'], nl: ['01 · Jouw foto', '02 · Productfoto’s', '03 · Op model'] };
const KAARTVELD = fs.readFileSync(lees('src/scripts/kaartveld.js'), 'utf8');
const KAART_CSS = fs.readFileSync(lees('src/styles/kaart-100.css'), 'utf8') + fs.readFileSync(lees('src/styles/kaart-108.css'), 'utf8');

/* ── de onderdelen, in px op het beeld ─────────────────────────────────────────────────────────────────────── */
function lockup(naam, x, y, hoogte) {
  const L = LOCKUP[naam], [x0, y0, x1, y1] = L.kader, k = hoogte / (y1 - y0), w = (x1 - x0) * k;
  return `<svg class="merk" data-tekstvlak style="left:${x.toFixed(2)}px;top:${y.toFixed(2)}px;width:${w.toFixed(2)}px;height:${hoogte.toFixed(2)}px" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">`
    + `<g fill="${WIT}"><g transform="translate(${L.vx} ${L.vy}) scale(${L.s})">${V_D.map((d) => `<path d="${d}"/>`).join('')}</g>`
    + `<path transform="translate(${L.tx} ${L.ty})" fill-rule="evenodd" d="${WOORDMERK.d}"/></g></svg>`;
}
/* het tekstlogo los, met zijn kaplijn op y (de bovenkant van het symbool ligt 12/700 van de kaphoogte hoger) */
function tekstlogo(x, kaplijn, cap) {
  const k = cap / 700, top = kaplijn - 12 * k;
  return `<svg class="merk" data-tekstvlak style="left:${x.toFixed(2)}px;top:${top.toFixed(2)}px;width:${(WOORDMERK.breed * k).toFixed(2)}px;height:${(WOORDMERK.hoog * k).toFixed(2)}px" viewBox="${WOORDMERK.symbool}">`
    + `<path fill="${WIT}" fill-rule="evenodd" d="${WOORDMERK.d}"/></svg>`;
}
/* de kop: de titel (levering 120: één titel, geen aanloop meer). De pagina zet hem zelf op maat (zie de pagina): de langste
   regel zo breed als de kolom (x tot x + breed), kaphoogte hoogstens 1,5 u, de basislijn van de laatste regel op 11 u */
function kop(lang, x, breed, { gebroken = false } = {}) {
  const g = BANNER[lang].titel;
  const groot = gebroken ? breek(g).map((r, n, l) => `<span>${r}${n === l.length - 1 ? '<i class="basis"></i>' : ''}</span>`).join('') : `<span>${g}<i class="basis"></i></span>`;
  return `<div class="kop" data-tekstvlak data-x="${x}" data-breed="${breed}"><span class="groot">${groot}</span></div>`;
}
/* b: drie beelden op een rij, rechts uitgelijnd op de marge, van 1 u tot de stap eronder; de basislijn van de stap op 11 u */
const TEGEL = { b: 196, tussen: 12, onder: 6, top: U, label: 13 };
TEGEL.links = W - U - (3 * TEGEL.b + 2 * TEGEL.tussen);
TEGEL.h = 11 * U - TEGEL.top - TEGEL.label - 12;
/* een beeld op maat, als jpeg op dubbele maat (scherp op @2x, de pagina blijft klein). Een packshot op een witte grond wordt
   eerst op zijn inhoud gesneden (alles donkerder dan 235, plus 6 % rand) en past dan in zijn geheel in het vak, op de kleur
   van zijn eigen hoek; een detail of een foto met een eigen grond vult het vak vanuit het midden */
async function vak(bestand, b, h) {
  const { data, info } = await sharp(bestand).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  const hoekGrijs = data[0];
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  if (hoekGrijs >= 245) for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] < 235) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const packshot = x1 > 0 && (x1 - x0) < info.width * 0.95 && (y1 - y0) < info.height * 0.95;
  let beeld = sharp(bestand).flatten({ background: '#FFFFFF' });
  if (packshot) {
    const r = Math.round(0.06 * Math.max(x1 - x0, y1 - y0));
    const left = Math.max(0, x0 - r), top = Math.max(0, y0 - r);
    beeld = beeld.extract({ left, top, width: Math.min(info.width, x1 + r) - left, height: Math.min(info.height, y1 + r) - top });
  }
  const { data: hk } = await sharp(bestand).extract({ left: 0, top: 0, width: 4, height: 4 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const grond = [0, 1, 2].map((c) => Math.round([...Array(16).keys()].reduce((t, i) => t + hk[i * 3 + c], 0) / 16));
  const buf = await sharp(await beeld.toBuffer()).resize({ width: Math.round(b * 2), height: Math.round(h * 2), fit: packshot ? 'contain' : 'cover', position: 'centre', background: { r: grond[0], g: grond[1], b: grond[2] } }).jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}
async function stappen(lang) {
  const tegels = [];
  for (let n = 0; n < 3; n++) {
    const x = TEGEL.links + n * (TEGEL.b + TEGEL.tussen), k = STAP[n].length;
    const h = (TEGEL.h - (k - 1) * TEGEL.onder) / k;   /* bij drie beelden: drie vakken onder elkaar, 6 px ertussen */
    for (let m = 0; m < k; m++) {
      tegels.push(`<img class="tegel" data-tekstvlak src="${await vak(STAP[n][m], TEGEL.b, h)}" style="left:${x}px;top:${(TEGEL.top + m * (h + TEGEL.onder)).toFixed(2)}px;width:${TEGEL.b}px;height:${h.toFixed(2)}px">`);
    }
    tegels.push(`<span class="stap" data-tekstvlak style="left:${x}px;top:${(11 * U - TEGEL.label).toFixed(2)}px">${STAP_LABEL[lang][n]}</span>`);
  }
  return tegels.join('');
}
/* de grote regel op twee regels: de breuk tussen twee woorden waarbij de langste regel het kortst is */
function breek(tekst) {
  const w = tekst.split(' ');
  let best = [tekst];
  for (let k = 1; k < w.length; k++) { const r = [w.slice(0, k).join(' '), w.slice(k).join(' ')]; if (best.length === 1 || Math.max(...r.map((x) => x.length)) < Math.max(...best.map((x) => x.length))) best = r; }
  return best;
}

/* het plaatje is één kaart op de pagina, 60 px groter dan het beeld aan elke kant; plek = waar op de pagina (welk stuk veld) */
const RANDJE = 60;
function pagina(inhoud, plek, modus = '') {
  return `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: 'VISUAILS Display 2'; src: url('${dataUrl(KOPLETTER, 'font/woff2')}') format('woff2'); font-weight: 300; font-display: block; }
@font-face { font-family: 'IBM Plex Mono'; src: url('${dataUrl(MONO, 'font/woff2')}') format('woff2'); font-weight: 600; font-display: block; }
${KAART_CSS}
* { margin: 0; box-sizing: border-box; }
html, body { background: #FFFFFF; }
body { width: ${W}px; height: ${plek + H + 2000}px; position: relative; overflow: hidden; }
.og { position: absolute; left: ${-RANDJE}px; top: ${plek - RANDJE}px; width: ${W + 2 * RANDJE}px; height: ${H + 2 * RANDJE}px; }
.vlak { position: absolute; left: ${RANDJE}px; top: ${RANDJE}px; width: ${W}px; height: ${H}px; }
.merk { position: absolute; display: block; overflow: visible; }
.tegel { position: absolute; display: block; object-fit: cover; border-radius: 8px; }
.stap { position: absolute; font: 600 ${TEGEL.label}px/1 'IBM Plex Mono', monospace; letter-spacing: .08em; text-transform: uppercase; color: ${WIT}; white-space: nowrap; }
.kop { position: absolute; font-family: 'VISUAILS Display 2', sans-serif; font-weight: 300; line-height: 1.06; letter-spacing: -.01em; text-transform: none; color: ${WIT}; }
.kop span { display: block; white-space: nowrap; width: max-content; }
.kop .basis { display: inline-block; width: 0; height: 0; vertical-align: baseline; }
/* de meetstanden: kaal = alleen de grond (veld en foto); masker = alleen de letters en logo's, zwart op wit */
.kaal .merk, .kaal .kop, .kaal .stap { visibility: hidden; }
.masker canvas, .masker .tegel { visibility: hidden; } .masker .og { background: #FFFFFF !important; } .masker .merk g, .masker .merk path { fill: #000; } .masker .kop, .masker .stap { color: #000; }
</style><body class="hal ${modus}"><div class="og" data-kaart><div class="vlak">${inhoud}</div></div>
<script type="module">
scrollTo(0, ${plek});
await document.fonts.load('300 50px "VISUAILS Display 2"'); await document.fonts.load('600 13px "IBM Plex Mono"'); await document.fonts.ready;
/* de kop op maat: eerst op 100 px meten, dan zo groot dat de langste regel de kolom vult (kaphoogte hoogstens 1,5 u) */
for (const k of document.querySelectorAll('.kop')) {
  k.style.fontSize = '100px';
  const g = k.querySelector('.groot'), b = Number(k.dataset.breed);
  const lang = Math.max(...[...g.querySelectorAll('span')].map((s) => s.getBoundingClientRect().width));
  const fs = Math.min(100 * b / lang, 1.5 * ${U} / ${KAP});
  k.style.fontSize = fs.toFixed(2) + 'px'; k.style.left = k.dataset.x + 'px'; k.style.top = '0px';
  const basis = k.querySelector('.basis').getBoundingClientRect().top - k.getBoundingClientRect().top;
  k.style.top = (11 * ${U} - basis).toFixed(2) + 'px';
}
await Promise.all([...document.querySelectorAll('img')].map((im) => im.decode().catch(() => {})));
${KAARTVELD}
const kaart = document.querySelector('.og');
/* het veld op een vaste tijd (4 s, de stand bij minder beweging) en meteen tekenen */
window.__kaartveld?.zet(4);
const t0 = performance.now();
while (!kaart.classList.contains('kv-aan') && performance.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 100));
await new Promise((r) => setTimeout(r, 300));
window.kopMaat = [...document.querySelectorAll('.kop')].map((k) => ({ px: parseFloat(getComputedStyle(k).fontSize), breed: k.querySelector('.groot').getBoundingClientRect().width, rechts: Math.max(...[...k.querySelectorAll('span')].map((c) => c.getBoundingClientRect().right)) }));
window.klaar = kaart.classList.contains('kv-aan') ? true : 'geen veld (webgl: ' + (document.documentElement.classList.contains('kv-geen') ? 'nee' : 'ja') + ', kaartveld: ' + !!window.__kaartveld + ')';
</script>`;
}

/* ── het slechtste beeldpunt: de grond (kaal) onder elk punt van een element (masker, 2 px verbreed) ─────────── */
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
async function slechtste(kaalPng, maskerPng) {
  const k = await sharp(kaalPng).removeAlpha().raw().toBuffer(), m = await sharp(maskerPng).greyscale().raw().toBuffer();
  const aan = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] < 128) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W) aan[yy * W + xx] = 1; }
  }
  const lw = lum(255, 255, 255); let min = Infinity;
  for (let j = 0; j < W * H; j++) if (aan[j]) { const lb = lum(k[j * 3], k[j * 3 + 1], k[j * 3 + 2]); min = Math.min(min, (lw + 0.05) / (lb + 0.05)); }
  return min;
}

/* ── draaien ───────────────────────────────────────────────────────────────────────────────────────────────── */
const browser = await chromium.launch({ executablePath: browserPad(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function schiet(html, schaal) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: schaal, reducedMotion: 'reduce' });
  const fouten = []; page.on('pageerror', (e) => fouten.push(e.message));
  await page.setContent(html);
  await page.waitForFunction(() => window.klaar !== undefined, null, { timeout: 90000 });
  const klaar = await page.evaluate(() => window.klaar), maat = await page.evaluate(() => window.kopMaat);
  if (klaar !== true || fouten.length) throw new Error(`make-og: het veld tekende niet (${klaar}; ${fouten.join(' · ')})`);
  const png = await page.screenshot();
  await page.close();
  return { png, maat };
}
const verslag = [];
async function maak(naam, inhoud, plek, eis) {
  const vol = await schiet(pagina(inhoud, plek), 1), kaal = await schiet(pagina(inhoud, plek, 'kaal'), 1), masker = await schiet(pagina(inhoud, plek, 'masker'), 1);
  const c = await slechtste(kaal.png, masker.png);
  if (c < eis) throw new Error(`make-og: ${naam} haalt op het slechtste punt ${c.toFixed(2)} : 1 (eis ${eis} : 1)`);
  for (const m of vol.maat) {
    if (m.px < 24) throw new Error(`make-og: ${naam}: de titel is ${m.px.toFixed(1)} px (minstens 24)`);
    if (m.rechts > W - U + 0.5) throw new Error(`make-og: ${naam}: de kop steekt in de marge (${m.rechts.toFixed(1)} px)`);
  }
  /* als jpeg: WhatsApp toont een voorbeeld alleen onder ± 300 kB */
  const jpg = await sharp(vol.png).jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
  if (jpg.length / 1024 > 300) throw new Error(`make-og: ${naam}.jpg is ${(jpg.length / 1024).toFixed(0)} kB (hoogstens 300)`);
  fs.writeFileSync(path.join(OUT, `${naam}.jpg`), jpg);
  if (PAKKET) {
    fs.mkdirSync(PAKKET, { recursive: true });
    fs.writeFileSync(path.join(PAKKET, `${naam}.jpg`), jpg);
    fs.writeFileSync(path.join(PAKKET, `${naam}.png`), vol.png);
    fs.writeFileSync(path.join(PAKKET, `${naam}@2x.png`), (await schiet(pagina(inhoud, plek), 2)).png);
  }
  const kop = vol.maat.map((m) => `titel ${m.px.toFixed(0)} px`).join('');
  verslag.push({ naam, kB: Math.round(jpg.length / 1024), slechtste: +c.toFixed(2), kop: vol.maat });
  console.log(`  public/img/${naam}.jpg  ${(jpg.length / 1024).toFixed(0)} kB  slechtste punt ${c.toFixed(2)} : 1  ${kop}`);
}
/* elk plaatje een eigen stuk veld: een andere plek op de pagina */
const PLEK = { 'og-en': 0, 'og-nl': 900, 'og-voorpagina-en': 1800, 'og-voorpagina-nl': 2700, 'og-logo': 3600 };
for (const lang of Object.keys(BANNER)) {
  await maak(`og-${lang}`, lockup('L2', U, U, U) + kop(lang, U, W - 2 * U), PLEK[`og-${lang}`], 4.5);
  /* de voorpagina (lijst 103, b): de kop links van de drie beelden, ½ u ervandaan, de titel op twee regels */
  await maak(`og-voorpagina-${lang}`, await stappen(lang) + tekstlogo(U, U, U / 2) + kop(lang, U, TEGEL.links - 1.5 * U, { gebroken: true }), PLEK[`og-voorpagina-${lang}`], 4.5);
}
{
  const L = LOCKUP.L3, [x0, y0, x1, y1] = L.kader, h = 6 * U, w = (x1 - x0) * h / (y1 - y0);
  await maak('og-logo', lockup('L3', (W - w) / 2, (H - h) / 2, h), PLEK['og-logo'], 3);
}
await browser.close();
if (PAKKET) fs.writeFileSync(path.join(PAKKET, 'meting.json'), JSON.stringify(verslag, null, 1));
console.log(`\n▶ u = ${U} px; de kop uit src/data/banner94.js — verandert die, draai dit opnieuw`);
