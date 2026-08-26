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
const GREEN = '#C6F100';
const INK = '#08090B';

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
const heading = fontFile('@fontsource-variable/archivo', 'archivo-latin-wght-normal.woff2', 'kopfont (Archivo)');
const editorial = fontFile('@fontsource-variable/anybody', 'anybody-latin-wght-italic.woff2', 'accentfont (Anybody italic)');

function pick(candidates, what) {
  for (const c of candidates) {
    const abs = path.join(ROOT, 'public', c);
    if (fs.existsSync(abs)) return abs;
  }
  throw new Error(`make-og: geen ${what} gevonden — gezocht naar ${candidates.join(', ')}`);
}
const photo = pick(['img/hero-dunes.webp', 'img/banners-05.webp'], 'achtergrondfoto');
const mark = pick(['img/mail/mark-groen.png'], 'merkteken');

/* ── WELKE CHROME — 26 augustus 2026 ─────────────────────────────────────────
   Hier stond een hard pad naar /opt/pw-browsers. Dat is de map van de
   Linux-container waarin dit project ook wordt gebouwd, en op Lucas' machine
   bestaat /opt niet eens: dit script viel daar dus om nog voordat het iets deed.
   scripts/lib/browserpad.mjs bestaat precies hiervoor en waarschuwt er in zijn
   eigen noot voor — hij werd alleen door één script gebruikt. */
const browser = await chromium.launch({ executablePath: browserPad() });

for (const [lang, t] of Object.entries(TAGLINE)) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: 'Archivo'; src: url('${dataUrl(heading, 'font/woff2')}') format('woff2'); font-weight: 100 900; font-display: block; }
    @font-face { font-family: 'Anybody'; src: url('${dataUrl(editorial, 'font/woff2')}') format('woff2'); font-weight: 100 900; font-style: italic; font-display: block; }
    * { margin: 0; box-sizing: border-box; }
    body { width: ${W}px; height: ${H}px; background: ${INK}; overflow: hidden; position: relative; font-family: 'Archivo', sans-serif; }
    .photo { position: absolute; inset: 0; background: url('${dataUrl(photo, 'image/webp')}') center / cover no-repeat; }
    /* De foto blijft zichtbaar en de tekst blijft leesbaar: een verloop van
       bijna-zwart links naar niets rechts, zodat de kop op zijn eigen grond
       staat in plaats van op wisselende beeldinhoud. */
    .veil { position: absolute; inset: 0; background:
      linear-gradient(100deg, ${INK} 0%, rgb(8 9 11 / .92) 38%, rgb(8 9 11 / .35) 72%, rgb(8 9 11 / .15) 100%); }
    .wrap { position: absolute; inset: 0; padding: 64px 72px; display: flex; flex-direction: column; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand img { height: 34px; display: block; }
    .brand span { color: #fff; font-size: 19px; font-weight: 700; letter-spacing: .22em; }
    h1 { color: #fff; font-size: 86px; line-height: .98; font-weight: 900; letter-spacing: -.015em; max-width: 15ch; }
    h1 em { font-family: 'Anybody', serif; font-style: italic; font-weight: 900; color: ${GREEN}; letter-spacing: -.03em; }
    .foot { color: #8A8F98; font-size: 21px; letter-spacing: .02em; }
  </style>
  <div class="photo"></div><div class="veil"></div>
  <div class="wrap">
    <div class="brand"><img src="${dataUrl(mark, 'image/png')}" alt=""><span>VISUAILS</span></div>
    <h1>${t.lines.join(' ')}</h1>
    <div class="foot">visuails.com</div>
  </div>`);

  await page.evaluate(() => document.fonts.ready);
  const file = path.join(OUT, `og-${lang}.png`);
  await page.screenshot({ path: file });
  await page.close();
  console.log(`  public/img/og-${lang}.png  ${(fs.statSync(file).size / 1024).toFixed(0)} kB  “${t.plain}”`);
}

await browser.close();
console.log('\n▶ zin gelezen uit src/data/brand.js — verandert die, draai dit opnieuw');
