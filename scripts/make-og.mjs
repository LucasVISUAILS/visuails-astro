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
/* Uit KLEURENSCHEMA.md, 20 september 2026. Het OG-beeld is een donker vlak
   met een lichte kop; het accentwoord staat er als LETTER op, dus het is het
   lichte violet uit de donkere modus (#A694FF, 8,30:1 op zwart) en niet het
   violet van de vulling — dat haalt op zwart 2,93:1. */
const GREEN = '#C5C8CF';
const INK = '#0B0F17';

/** Een bestand als data-URL — Chromium mag geen file:// laden bij setContent. */
const dataUrl = (abs, mime) =>
  `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;

/*
 * DE FONTS KOMEN UIT node_modules, niet uit public/.
 *
 * De site laadt ze via @fontsource-variable en Astro hasht ze bij het bouwen
 * naar dist/_astro/. Uit dist lezen zou dit script afhankelijk maken van een
 * build die er misschien niet is, én van een bestandsnaam met een hash erin die
 * bij elke wijziging verandert. Het pakket zelf is de stabiele bron — dezelfde
 * die Layout.astro importeert, dus letterlijk hetzelfde font als op de pagina.
 */
function fontFile(pkg, file, what) {
  const abs = path.join(ROOT, 'node_modules', pkg, 'files', file);
  if (!fs.existsSync(abs)) throw new Error(`make-og: ${what} niet gevonden op ${abs}`);
  return abs;
}
/* ── DE HAL, 14 OKTOBER 2026 ────────────────────────────────────────────────
   Lucas: het nieuwe kleurenschema "volledig toevoegen". Dit plaatje was nog het
   donkere vlak van 20 september, in Archivo, met het V-merk en het woord
   VISUAILS naast elkaar. Nu de opening van de voorpagina: wit, de kop in
   Urbanist in drie tonen (kop-licht, violet, inkt — zoals de h1; sinds schema A,
   19 oktober 2026, is het violette woord zwart, zoals in de h1), de laptopfoto
   rechts, en het woordmerk van de hal linksboven (uit src/data/woordmerk.js,
   niet het V-merk ernaast: die twee staan nooit samen). */
const urbanist = fontFile('@fontsource-variable/urbanist', 'urbanist-latin-wght-normal.woff2', 'Urbanist');
const { WOORDMERK } = await import('../src/data/woordmerk.js');
const KOP_LICHT = '#636974', INKT = '#0B0F17', INKT_3 = '#636974', VIOLET = '#0B0F17';

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
    @font-face { font-family: 'Urbanist'; src: url('${dataUrl(urbanist, 'font/woff2')}') format('woff2'); font-weight: 100 900; font-display: block; }
    * { margin: 0; box-sizing: border-box; }
    body { width: ${W}px; height: ${H}px; background: #FFFFFF; overflow: hidden; position: relative; font-family: 'Urbanist', sans-serif; }
    /* De foto rechts, vervloeid in het wit zoals in de opening (hal.css, .hl-doos). Sinds
       20 oktober 2026 de POV-foto (16:9); zijn plek en maat zet het script hieronder,
       net als op de site: de duim (0,235 van de breedte) 16 px rechts van de kop, de
       klep (0,868) 24 px voor de rand. */
    .photo { position: absolute; background: url('${dataUrl(photo, 'image/webp')}') center / 100% 100% no-repeat; aspect-ratio: 2304 / 1296;
      -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 26%), linear-gradient(180deg, transparent 0, #000 12%, #000 72%, transparent 97%); -webkit-mask-composite: source-in;
      mask-image: linear-gradient(90deg, transparent 0, #000 26%), linear-gradient(180deg, transparent 0, #000 12%, #000 72%, transparent 97%); mask-composite: intersect; }
    .wrap { position: absolute; inset: 0; padding: 60px 64px; display: flex; flex-direction: column; justify-content: space-between; }
    .wm { width: 150px; height: auto; display: block; }
    h1 { font-size: 70px; line-height: 1.02; font-weight: 500; letter-spacing: -.025em; color: ${INKT}; max-width: 9.5em; }
    h1 .l { color: ${INKT_3}; font-weight: 400; }  /* op de schets van de foto grijs 3, zoals in de opening */
    h1 em { font-style: normal; color: ${VIOLET}; }
    h1 span { display: block; }
    .foot { color: ${INKT_3}; font-size: 22px; font-weight: 500; }
  </style>
  <div class="photo"></div>
  <div class="wrap">
    <svg class="wm" viewBox="${WOORDMERK.symbool}" aria-hidden="true"><path fill="${INKT}" fill-rule="evenodd" d="${WOORDMERK.d}"/></svg>
    <h1><span class="l">${l1}</span><span>${l2}</span><span>${l3}</span></h1>
    <div class="foot">visuails.com</div>
  </div>`);

  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ W, H }) => {
    const kop = document.querySelector('h1'); const r = Math.max(...[...kop.querySelectorAll('span')].map((s) => { const g = document.createRange(); g.selectNodeContents(s); return Math.max(...[...g.getClientRects()].map((q) => q.right)); }));
    const b = (W - 24 - (r + 16)) / 0.633, h = b * 1296 / 2304, f = document.querySelector('.photo');
    Object.assign(f.style, { width: `${b}px`, height: `${h}px`, left: `${W - 24 - 0.868 * b}px`, top: `${(H - h) / 2}px` });
  }, { W, H });
  const file = path.join(OUT, `og-${lang}.png`);
  await page.screenshot({ path: file });
  await page.close();
  console.log(`  public/img/og-${lang}.png  ${(fs.statSync(file).size / 1024).toFixed(0)} kB  “${t.plain}”`);
}

await browser.close();
console.log('\n▶ zin gelezen uit src/data/brand.js — verandert die, draai dit opnieuw');
