/* Het deelplaatje, met de kop erop. `npm run og`
 *
 * WAT ER MIS WAS. og:image wees naar /img/hero-dunes.webp — een mooie foto, en
 * verder niets. Elke keer dat iemand visuails.com deelde in WhatsApp, Slack of
 * LinkedIn, kreeg de ontvanger een model in de duinen zonder één woord erbij.
 * Dat is de grootste plek waar de hoofdboodschap ontbrak, en het is precies de
 * plek waar iemand de site voor het eerst ziet zonder er zelf naartoe te zijn
 * gegaan.
 *
 * DE ZIN KOMT UIT src/data/brand.js en wordt hier niet overgetypt. Dat is het
 * hele punt van Lucas' opmerking: *"anders staat de oude er over drie maanden
 * nog ergens."* Verandert de kop, dan verandert dit plaatje mee zodra dit script
 * draait — en als het niet draait, valt dat op, want dan staat er nog de oude
 * zin die je net vervangen hebt.
 *
 * ECHTE FONTS, GEEN BENADERING. De pagina wordt in Chromium gerenderd met
 * dezelfde woff2-bestanden uit public/fonts als de site zelf, zodat de kop op
 * het deelplaatje dezelfde is als de kop op de pagina. Een og-plaatje in Arial
 * naast een site in Archivo leest als een goedkope kopie van jezelf.
 *
 * 1200×630 is het formaat dat Facebook, LinkedIn, X, Slack en WhatsApp allemaal
 * aanhouden. Twee bestanden, één per taal, want de zin verschilt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { TAGLINE } from '../src/data/brand.js';
import { browserPad } from './lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/img');

const W = 1200, H = 630;
/** Een bestand als data-URL — Chromium mag geen file:// laden bij setContent. */
const dataUrl = (abs, mime) =>
  `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;

/* ── DE HAL, 14 OKTOBER 2026 ────────────────────────────────────────────────
   Lucas: het nieuwe kleurenschema "volledig toevoegen". Dit plaatje was nog het
   donkere vlak van 20 september, in Archivo, met het V-merk en het woord
   VISUAILS naast elkaar. Nu de opening van de voorpagina: wit, de kop in
   Urbanist in drie tonen (kop-licht, violet, inkt — zoals de h1; sinds schema A,
   19 oktober 2026, is het violette woord zwart, zoals in de h1), de laptopfoto
   rechts, en het woordmerk van de hal linksboven (uit src/data/woordmerk.js,
   niet het V-merk ernaast: die twee staan nooit samen). */
/* ── LEVERING 86 · DE LETTER EN DE REGELS VAN DE SITE (4 november 2026) ─────────────
   Lucas, 01:22: "Posters moeten ook gebruik maken van de nieuwe lettertypes en ontwerp rules." Dus zoals de
   kop van de site: VISUAILS Display Bold in hoofdletters (-0,01 em en regelhoogte 0,92, zoals elke kop in hoofdletters op de site), de eerste regel in de grijze toon en de
   rest in inkt; het woordmerk in de snede; onderaan het sectielabel (de schuine streep in de snede en
   IBM Plex Mono in hoofdletters). De grond is de grond van de site (#FBFCFF). De kop wordt zo groot dat zijn
   langste regel in 560 px past (hoogstens 64 px), en de foto staat 40 px rechts van de kop en is links
   al helemaal vervloeid voordat hij de kop bereikt (de hand onder de laptop loopt niet meer onder de letters):
   niets staat tegen elkaar aan. De letters komen uit public/fonts, dezelfde bestanden als de site. */
const kopletter = path.join(ROOT, 'public/fonts/visuails-display/VISUAILSDisplay-Bold.woff2');
const tekstletter = path.join(ROOT, 'public/fonts/dm-sans/dm-sans-latin.woff2');
const monoletter = path.join(ROOT, 'public/fonts/ibm-plex-mono/IBMPlexMono-600.woff2');
for (const f of [kopletter, tekstletter, monoletter]) if (!fs.existsSync(f)) throw new Error(`make-og: ${f} niet gevonden`);
const { WOORDMERK } = await import('../src/data/woordmerk.js');
/* Levering 86 (3 november 2026, lijst 72, logo a): het woordmerk in de snede, de fade van blauw diep via blauw
   uur naar #2D61A8 langs de snede van het vlagje (126,87°), zoals #vs-w-snede op de site. */
const GRIJS = '#636974', INKT = '#0F1217', GROND = '#FBFCFF';
const KOP_MAX = 560, KOP_PX = 64, NAAST = 40;
const STREEP = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="st" gradientUnits="userSpaceOnUse" x1="5.98" y1="11.5" x2="14.17" y2="17.64"><stop offset="0" stop-color="#1A4279"/><stop offset=".55" stop-color="#25508B"/><stop offset="1" stop-color="#2D61A8"/></linearGradient></defs><path fill="url(#st)" d="M19.75 10.2L17.05 13.8L4.25 13.8L6.95 10.2Z"/></svg>`;

function pick(candidates, what) {
  for (const c of candidates) {
    const abs = path.join(ROOT, 'public', c);
    if (fs.existsSync(abs)) return abs;
  }
  throw new Error(`make-og: geen ${what} gevonden — gezocht naar ${candidates.join(', ')}`);
}
const photo = pick(['img/hal/laptop-1600.webp', 'img/hal/laptop-1000.webp'], 'laptopfoto');

/* ── WELKE CHROME — 26 augustus 2026 ─────────────────────────────────────────
   scripts/lib/browserpad.mjs: op Lucas' machine bestaat /opt niet. */
const browser = await chromium.launch({ executablePath: browserPad() });

for (const [lang, t] of Object.entries(TAGLINE)) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const [l1, l2, l3] = t.lines;
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: 'VISUAILS Display'; src: url('${dataUrl(kopletter, 'font/woff2')}') format('woff2'); font-weight: 700; font-display: block; }
    @font-face { font-family: 'DM Sans'; src: url('${dataUrl(tekstletter, 'font/woff2')}') format('woff2'); font-weight: 300 700; font-display: block; }
    @font-face { font-family: 'IBM Plex Mono'; src: url('${dataUrl(monoletter, 'font/woff2')}') format('woff2'); font-weight: 600; font-display: block; }
    * { margin: 0; box-sizing: border-box; }
    body { width: ${W}px; height: ${H}px; background: ${GROND}; overflow: hidden; position: relative; font-family: 'DM Sans', sans-serif; }
    /* De foto rechts, vervloeid in de grond zoals in de opening; zijn plek en maat zet het script hieronder:
       de duim (0,235 van de breedte) ${NAAST} px rechts van de kop, de klep (0,868) 24 px voor de rand. */
    .photo { position: absolute; background: url('${dataUrl(photo, 'image/webp')}') center / 100% 100% no-repeat; aspect-ratio: 2304 / 1296;
      -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 26%), linear-gradient(180deg, transparent 0, #000 12%, #000 72%, transparent 97%); -webkit-mask-composite: source-in;
      mask-image: linear-gradient(90deg, transparent 0, #000 26%), linear-gradient(180deg, transparent 0, #000 12%, #000 72%, transparent 97%); mask-composite: intersect; }
    .wrap { position: absolute; inset: 0; padding: 60px 64px; display: flex; flex-direction: column; justify-content: space-between; }
    .wm { width: 156px; height: auto; display: block; }
    h1 { font: 700 ${KOP_PX}px/.92 'VISUAILS Display', 'DM Sans', sans-serif; text-transform: uppercase; letter-spacing: -.01em; color: ${INKT}; width: max-content; }
    h1 .l { color: ${GRIJS}; }
    h1 em { font-style: normal; color: ${INKT}; }
    h1 span { display: block; }
    .foot { display: inline-flex; align-items: center; gap: 10px; color: ${INKT}; font: 600 15px/1.3 'IBM Plex Mono', monospace; letter-spacing: .1em; text-transform: uppercase; }
  </style>
  <div class="photo"></div>
  <div class="wrap">
    <svg class="wm" viewBox="${WOORDMERK.symbool}" aria-hidden="true"><defs><linearGradient id="s" gradientUnits="userSpaceOnUse" x1="0" y1="-797.25" x2="3367.43" y2="1728.32"><stop offset="0" stop-color="#1A4279"/><stop offset=".55" stop-color="#25508B"/><stop offset="1" stop-color="#2D61A8"/></linearGradient></defs><path fill="url(#s)" fill-rule="evenodd" d="${WOORDMERK.d}"/></svg>
    <h1><span class="l">${l1}</span><span>${l2}</span><span>${l3}</span></h1>
    <div class="foot">${STREEP}visuails.com</div>
  </div>`);

  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ W, H, KOP_MAX, KOP_PX, NAAST }) => {
    const kop = document.querySelector('h1');
    const breedste = () => Math.max(...[...kop.querySelectorAll('span')].map((s) => { const g = document.createRange(); g.selectNodeContents(s); return Math.max(...[...g.getClientRects()].map((q) => q.width)); }));
    let px = KOP_PX; while (breedste() > KOP_MAX && px > 40) { px -= 1; kop.style.fontSize = `${px}px`; }
    const r = kop.getBoundingClientRect().left + breedste();
    const b = (W - 24 - (r + NAAST)) / 0.633, h = b * 1296 / 2304, f = document.querySelector('.photo');
    const links = W - 24 - 0.868 * b, vrij = Math.max(0, r + NAAST - links);
    const masker = `linear-gradient(90deg, transparent 0, transparent ${vrij}px, #000 ${vrij + 150}px), linear-gradient(180deg, transparent 0, #000 12%, #000 72%, transparent 97%)`;
    Object.assign(f.style, { width: `${b}px`, height: `${h}px`, left: `${links}px`, top: `${(H - h) / 2}px`, webkitMaskImage: masker, maskImage: masker });
  }, { W, H, KOP_MAX, KOP_PX, NAAST });
  const file = path.join(OUT, `og-${lang}.png`);
  await page.screenshot({ path: file });
  await page.close();
  console.log(`  public/img/og-${lang}.png  ${(fs.statSync(file).size / 1024).toFixed(0)} kB  “${t.plain}”`);
}

await browser.close();
console.log('\n▶ zin gelezen uit src/data/brand.js — verandert die, draai dit opnieuw');
