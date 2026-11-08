/* De deelplaatjes. `npm run og`
 *
 * WAAROM ER EEN DEELPLAATJE IS. og:image wees ooit naar een foto zonder één woord erbij: wie visuails.com deelde
 * in WhatsApp, Slack of LinkedIn, stuurde een model in de duinen. Dit plaatje is de eerste keer dat iemand de site
 * ziet zonder er zelf naartoe te zijn gegaan. DE ZIN KOMT UIT src/data/brand.js en wordt hier niet overgetypt
 * (Lucas: *"anders staat de oude er over drie maanden nog ergens."*). Verandert de zin, draai dit opnieuw.
 *
 * LEVERING 89 (5 november 2026; lijst 82 en 83). Lucas vond de vorige "heel matig": de kop op drie regels in twee
 * kleuren, het veld alleen een vage gloed, maten die niets met elkaar te maken hadden, en nergens wat VISUAILS maakt.
 * Hij koos: de voorpagina C2b ("Venster"), de andere pagina's C1 ("Het veld"), pagina's zonder kop C3 ("Alleen het
 * merk"). Alles staat op het RASTER VOOR BEELDEN (docs/KLEURENSCHEMA.md, "Het raster voor beelden"):
 *   u = de korte zijde ÷ 12 (hier 630 ÷ 12 = 52,5 px), dezelfde 1/12 als de marge van de site;
 *   marge 1 u; de lockup naast (L2) 1 u hoog; alleen het merk (L3) 6 u hoog;
 *   de kop: kaphoogte 1 u, of de grootste stap (¾, ⅔, ½ u) waarbij NL én EN in twee regels passen;
 *   regelafstand 1,5 × de kaphoogte; de onderste basislijn op 11 u (precies: uitgerekend uit de maten van de letter);
 *   het licht en het roze nooit onder tekst: dit script meet het slechtste beeldpunt en stopt als tekst onder
 *   4,5 : 1 of een logo onder 3 : 1 komt.
 *
 *   C1  het veld o1 (blauw uur, het licht langs de snede en het roze rechtsboven, onderin een diep blauw dat het
 *       licht afdekt voor het bij de kop komt); de lockup L2 linksboven; de kop in de onderste rijen.
 *   C2b het veld c4 (de nacht); het V-merk 10 u hoog rechts als venster op Lucas' eigen beeld (Phone-made, de
 *       witte jas; hetzelfde beeld als de logoposter op de voorpagina); het tekstlogo los linksboven (geen lockup,
 *       want de grote V staat er al), kaphoogte ½ u; de kop ⅔ u. Geen fade.
 *   C3  het veld c4; de lockup L3, 6 u hoog, in het midden.
 *
 * Het V-merk en het tekstlogo zijn de paden uit het merk (V_D en K5 uit src/data/woordmerk.js), niet nagetekend en
 * alleen herkleurd. De velden komen uit src/scripts/veld.js, dezelfde tekening als op de site, met korrel. ECHTE
 * FONTS: de woff2-bestanden uit public/fonts. 1200 × 630, het formaat van Facebook, LinkedIn, X, Slack en WhatsApp.
 *
 * Uit: public/img/og-nl.jpg, og-en.jpg (C1), og-voorpagina-nl.jpg, og-voorpagina-en.jpg (C2b), og-logo.jpg (C3), als jpeg
 * (hoogstens 300 kB: WhatsApp toont het voorbeeld anders niet). De oude og-nl.png en og-en.png mogen weg.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { TAGLINE } from '../src/data/brand.js';
import { browserPad } from './lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/img');
const { WOORDMERK, LOCKUP } = await import('../src/data/woordmerk.js');

const W = 1200, H = 630, U = H / 12;
/* VISUAILS Display Bold: kaphoogte 700, stokken 992 boven en 310 onder de basislijn, op 1000 (gemeten in de woff2).
   Met line-height gelijk aan de lettergrootte ligt de basislijn 0,841 em onder de bovenkant van de regel. */
const KAP = 0.700, BASIS = (1 - (0.992 + 0.310)) / 2 + 0.992;
const WIT = '#FBFCFF';
const V_D = ['M 0.0 16.0 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 L 515.5 546.25 L 264.5 119.0 A 201.21 201.21 0 0 0 101.0 15.75 L 0.0 16.0 Z',
  'M 701.75 0.0 L 543.25 366.25 L 507.25 453.75 L 652.0 259.25 L 702.0 338.25 L 701.75 0.0 Z'];
const VB = 702, VH = 813.25;

const dataUrl = (abs, mime) => `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
const letter = (f) => { const p = path.join(ROOT, 'public/fonts', f); if (!fs.existsSync(p)) throw new Error(`make-og: ${p} niet gevonden`); return p; };
const kopletter = letter('visuails-display/VISUAILSDisplay-Bold.woff2');
const FOTO = path.join(ROOT, 'public/img/lifestyle-phone-made-04.webp');   /* 2400 × 1792 */
if (!fs.existsSync(FOTO)) throw new Error(`make-og: ${FOTO} niet gevonden`);
/* veld.js als gewone module in de pagina: dezelfde tekening als op de site */
const VELD = fs.readFileSync(path.join(ROOT, 'src/scripts/veld.js'), 'utf8');

/* de kop: de zin uit brand.js in twee regels, op de zin-grens ("Al je productbeelden." · "Zonder shoot.") */
const regels = (lang) => TAGLINE[lang].plain.split(/(?<=\.)\s+/).map((r) => r.toUpperCase());

/* ── de onderdelen, in px op het beeld ─────────────────────────────────────────────────────────────────────── */
function lockup(naam, x, y, hoogte) {
  const L = LOCKUP[naam], [x0, y0, x1, y1] = L.kader, k = hoogte / (y1 - y0), w = (x1 - x0) * k;
  return `<svg class="merk" style="left:${x.toFixed(2)}px;top:${y.toFixed(2)}px;width:${w.toFixed(2)}px;height:${hoogte.toFixed(2)}px" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">`
    + `<g fill="${WIT}"><g transform="translate(${L.vx} ${L.vy}) scale(${L.s})">${V_D.map((d) => `<path d="${d}"/>`).join('')}</g>`
    + `<path transform="translate(${L.tx} ${L.ty})" fill-rule="evenodd" d="${WOORDMERK.d}"/></g></svg>`;
}
/* het tekstlogo los, met zijn kaplijn op y (de bovenkant van het symbool ligt 12/700 van de kaphoogte hoger) */
function tekstlogo(x, kaplijn, cap) {
  const k = cap / 700, top = kaplijn - 12 * k;
  return `<svg class="merk" style="left:${x.toFixed(2)}px;top:${top.toFixed(2)}px;width:${(WOORDMERK.breed * k).toFixed(2)}px;height:${(WOORDMERK.hoog * k).toFixed(2)}px" viewBox="${WOORDMERK.symbool}">`
    + `<path fill="${WIT}" fill-rule="evenodd" d="${WOORDMERK.d}"/></svg>`;
}
function kop(rgl, cap, laatsteBasis, x = U) {
  const fs_ = cap / KAP, lh = 1.5 * cap;
  return rgl.map((r, i) => {
    const b = laatsteBasis - (rgl.length - 1 - i) * lh;
    return `<div class="kop" style="left:${x.toFixed(2)}px;top:${(b - BASIS * fs_).toFixed(2)}px;font-size:${fs_.toFixed(2)}px">${r}</div>`;
  }).join('');
}
/* C2b: het V-merk als venster op de foto; het gezicht (0,5 · 0,29 van de foto) in de top van de linkerarm */
function venster() {
  const vh = 10 * U, vw = vh * VB / VH, vx = W - U - vw, vy = U;
  const ih = 640, iw = ih * 2400 / 1792, ix = vx + 0.17 * vw - 0.5 * iw, iy = vy + 0.14 * vh - 0.29 * ih;
  return `<svg class="venster" viewBox="0 0 ${W} ${H}"><defs><clipPath id="vk">`
    + V_D.map((d) => `<path transform="translate(${vx.toFixed(2)} ${vy.toFixed(2)}) scale(${(vh / VH).toFixed(5)})" d="${d}"/>`).join('')
    + `</clipPath></defs><image href="${dataUrl(FOTO, 'image/webp')}" x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" clip-path="url(#vk)"/></svg>`;
}

/* de kop zo groot als het raster toelaat: de grootste stap waarbij de langste regel van NL én EN binnen de marges past */
async function kopStap(page, beschikbaar) {
  for (const stap of [1, 3 / 4, 2 / 3, 1 / 2]) {
    const fs_ = (U * stap) / KAP;
    const breed = await page.evaluate(async ({ fs_, rgl }) => {
      await document.fonts.load(`700 ${fs_}px "VISUAILS Display"`);   /* zonder tekst op de pagina laadt de letter anders niet */
      const d = document.createElement('div'); d.className = 'kop'; d.style.fontSize = `${fs_}px`; document.body.append(d);
      const w = Math.max(...rgl.map((r) => { d.textContent = r; return d.getBoundingClientRect().width; })); d.remove(); return w;
    }, { fs_, rgl: [...regels('nl'), ...regels('en')] });
    if (breed <= beschikbaar) return stap;
  }
  throw new Error('make-og: de kop past ook op ½ u niet in twee regels');
}

const STIJL = `<style>
@font-face { font-family: 'VISUAILS Display'; src: url('${dataUrl(kopletter, 'font/woff2')}') format('woff2'); font-weight: 700; font-display: block; }
* { margin: 0; box-sizing: border-box; }
body { width: ${W}px; height: ${H}px; overflow: hidden; position: relative; background: #0F1217; }
canvas, .venster { position: absolute; inset: 0; width: ${W}px; height: ${H}px; display: block; }
.merk { position: absolute; display: block; overflow: visible; }
.kop { position: absolute; white-space: nowrap; font-family: 'VISUAILS Display', sans-serif; font-weight: 700; line-height: 1; letter-spacing: -.01em; color: ${WIT}; }
/* de meetstanden: kaal = alleen de grond (veld en foto); masker = alleen de letters en logo's, zwart op wit */
.kaal .merk, .kaal .kop { visibility: hidden; }
.masker canvas, .masker .venster { visibility: hidden; } .masker { background: #fff; } .masker .merk g, .masker .merk path { fill: #000; } .masker .kop { color: #000; }
</style>`;
const VELDEN_EXTRA = `
/* o1: het deelplaatje (C1). Blauw uur; het licht langs de snede (53,13°) en het roze rechtsboven, en een diep blauw
   onderin dat de baan afdekt voor hij bij de kop komt (de kop staat in de onderste rijen van het raster). */
VELDEN.o1 = { naam: 'Snede, deelplaatje', grond: '#25508B', korrel: 0.065, lagen: [
  { k: '#1A4279', vorm: 0, x: 0.25, y: 0.85, r: 0.75, sterk: 0.95, drift: 0.03 },
  { k: '#6283AF', vorm: 1, x: 0.86, y: 0.12, hoek: 53.13, r: 0.2, zij: 0.25, sterk: 0.85, drift: 0.03 },
  { k: '#E6EAF4', vorm: 1, x: 0.86, y: 0.12, hoek: 53.13, r: 0.05, zij: 0.2, sterk: 0.85, drift: 0.03 },
  { k: '#ROZE', vorm: 0, x: 1.02, y: -0.04, r: 0.3, sterk: 0.9, drift: 0.03 },
  { k: '#1A4279', vorm: 4, x: 0.5, y: 0.55, hoek: 180, r: 0.11, sterk: 1.0, drift: 0.0 },
] };`;
function pagina(veld, inhoud, modus = '') {
  return `<!doctype html><meta charset="utf-8">${STIJL}<body class="${modus}"><canvas></canvas>${inhoud}
<script type="module">
${VELD}
${VELDEN_EXTRA}
maakVeld(document.querySelector('canvas'), ${JSON.stringify(veld)}, { roze: '#F1B7AC', bewaar: true, zaad: 0.37, korrelMaat: 1.25, b: ${W}, h: ${H} }).teken(12000);
await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
await document.fonts.load('700 50px "VISUAILS Display"'); await document.fonts.ready; window.klaar = true;
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
  const lw = lum(0xFB, 0xFC, 0xFF); let min = Infinity;
  for (let i = 0; i < W * H; i++) if (aan[i]) { const lb = lum(k[i * 3], k[i * 3 + 1], k[i * 3 + 2]); min = Math.min(min, (lw + 0.05) / (lb + 0.05)); }
  return min;
}

/* ── draaien ───────────────────────────────────────────────────────────────────────────────────────────────── */
const browser = await chromium.launch({ executablePath: browserPad(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
async function maak(naam, veld, inhoud, eis) {
  const shots = {};
  for (const modus of ['', 'kaal', 'masker']) {
    await page.setContent(pagina(veld, inhoud, modus));
    await page.waitForFunction(() => window.klaar === true, null, { timeout: 60000 });
    shots[modus || 'vol'] = await page.screenshot();
  }
  const c = await slechtste(shots.kaal, shots.masker);
  if (c < eis) throw new Error(`make-og: ${naam} haalt op het slechtste punt ${c.toFixed(2)} : 1 (eis ${eis} : 1)`);
  /* als jpeg: een veld met korrel is als png 700 kB of meer, en WhatsApp toont een voorbeeld alleen onder ± 300 kB */
  const file = path.join(OUT, `${naam}.jpg`);
  await sharp(shots.vol).jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(file);
  const kb = fs.statSync(file).size / 1024;
  if (kb > 300) throw new Error(`make-og: ${naam}.jpg is ${kb.toFixed(0)} kB (hoogstens 300)`);
  console.log(`  public/img/${naam}.jpg  ${kb.toFixed(0)} kB  slechtste punt ${c.toFixed(2)} : 1`);
}
await page.setContent(pagina('o1', ''));
await page.waitForFunction(() => window.klaar === true, null, { timeout: 60000 });
const stapC1 = await kopStap(page, W - 2 * U);                 /* C1: de kop over de hele breedte */
const stapC2 = 2 / 3;                                            /* C2b: ⅔ u (lijst 83); dat de kop vrij van de V blijft, bewaakt de meting */
for (const lang of Object.keys(TAGLINE)) {
  const rgl = regels(lang);
  await maak(`og-${lang}`, 'o1', lockup('L2', U, U, U) + kop(rgl, U * stapC1, 11 * U), 4.5);
  /* HAAK VOOR DE VOORPAGINA (C2b, lijst 83: "Venster") */
  await maak(`og-voorpagina-${lang}`, 'c4', venster() + tekstlogo(U, U, U / 2) + kop(rgl, U * stapC2, 11 * U), 4.5);
}
{
  const L = LOCKUP.L3, [x0, y0, x1, y1] = L.kader, h = 6 * U, w = (x1 - x0) * h / (y1 - y0);
  await maak('og-logo', 'c4', lockup('L3', (W - w) / 2, (H - h) / 2, h), 3);
}
await browser.close();
console.log(`\n▶ u = ${U} px; de kop van C1 op ${stapC1} u, van C2b op ⅔ u; zin uit src/data/brand.js — verandert die, draai dit opnieuw`);
