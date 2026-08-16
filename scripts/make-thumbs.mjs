// VISUAILS — generate the small derivatives that the order flow and /models
// draw, from the full-size photographs in public/img.
//
// WHY THIS EXISTS
// public/img holds one file per photograph, at the size the largest use of it
// needs: 2400px campaign frames, 1195px roster portraits. Two places draw
// those same files into boxes a fraction of that size — the look picker on
// /start/lifestyle (a ~410px card on a desktop, ~330px on a phone) and the
// roster grid on /models (~211px desktop, ~350px phone). Before this script
// existed, /start/lifestyle shipped 1.3 MB and /models 1.4 MB of photographs
// so the browser could throw 90% of every one of them away. StylePicker's own
// header comment says as much: it had already widened the tiles to shrink the
// ratio because "there are no smaller derivatives in public/img". Now there
// are.
//
// THE SIZING RULE, AND WHY THE NUMBERS ARE WHAT THEY ARE
// Each width below is ~2x the LARGEST CSS box the image is ever drawn in,
// measured in a real browser across viewport widths from 360 to 2560, not
// guessed from the CSS. 2x is the retina target. The largest box is not always
// the desktop one: both grids collapse to a single column on a phone, which
// makes the box BIGGER, and the look grid's widest box of all is at a 640px
// viewport, the last width before it goes one-up.
//
//   look cards   largest box 567.6 x 425.7 CSS px  ->  960w
//   roster       largest box 389.6 x 487.0 CSS px  ->  800w
//
// Quality is 80. The originals are q92. Measured against the original resized
// to the actual display box, the derivatives score 37-41 dB PSNR (portraits)
// and 32 dB (the grainiest golden-hour frame) — the difference is under the
// floor of what the eye resolves at 2x density, and it was checked by
// screenshotting both pages before and after at 1440x900 and 390x844.
//
// WHAT IT WILL NOT DO
// It will not touch an original. Every output carries a -w<width> suffix that
// no source file uses, and the script refuses to write over a path that is not
// one of its own declared outputs. Re-running is safe and idempotent; pass
// --force to re-encode outputs that already exist (after changing a width or
// the quality, say).
//
// AFTER CHANGING ANYTHING HERE
// The width and height a derivative is declared with at its call site
// (StylePicker.astro, and `tw`/`th` in src/data/models.js) are the real
// intrinsic size of the file — a declared size that disagrees with the file is
// the layout-shift bug this repo has already fixed once. This script prints
// the true size of everything it writes, so those numbers can be copied rather
// than derived by hand. Run it with `node scripts/make-thumbs.mjs`.

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const IMG = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img');
const QUALITY = 80;

// source basename -> target width. The suffix is derived from the width, so a
// file's name always states what it is: model-ava-w800.webp is 800px wide.
const JOBS = [
  // The five look-picker cards on /start/lifestyle are `cardPhoto` in
  // src/data/styles.js (identical in styles.nl.js). lifestyle-dunes-01 is
  // deliberately absent: it is 928px wide already, under the 960 target, so a
  // derivative would be a same-size re-encode — generation loss for 20 kB.
  { file: 'lifestyle-flash-02', width: 960 },
  { file: 'lifestyle-glow-01', width: 960 },
  { file: 'lifestyle-phone-made-11', width: 960 },
  { file: 'banners-13', width: 960 },

  // The /models roster. Rae is absent for the same reason as dunes: her
  // original is 800x1071, which is the target size exactly.
  ...['aaron', 'ava', 'elias', 'ryan', 'dana', 'lisa', 'maegan', 'fabi', 'seme']
    .map((n) => ({ file: `model-${n}`, width: 800 })),

  /* ── DE GALERIJ — 14 AUGUSTUS 2026 ────────────────────────────────────────
   *
   * GEMETEN EN NIET GESCHAT, zoals de kop hierboven eist. Chromium, /gallery,
   * elf vensterbreedtes van 360 tot 2560:
   *
   *   gewone cel   grootste box 375 CSS px breed   ->  760w
   *   .wide-cel    grootste box 766 CSS px breed   -> 1560w
   *
   * Boven 1280px groeit geen van beide meer: het raster zit dan tegen de
   * max-width van de container aan. 2x is hetzelfde retina-doel als hierboven.
   *
   * ── WAT DIT KOST ZONDER DEZE REGELS ──────────────────────────────────────
   *
   * Ook gemeten, met de netwerklaag en niet met een optelsom: /gallery op een
   * telefoon van 390px haalt 3,12 MB aan beeld binnen VOORDAT er gescrold is —
   * twintig foto's van 2400px in vakjes van 375. Op een desktop van 1440 is dat
   * 0,79 MB, en dat verschil is precies verkeerd om: de trager verbonden bezoeker
   * betaalt het meest. Doorgescrold is de hele pagina 9,03 MB.
   *
   * ── WELKE FOTO'S HIER STAAN, EN WELKE NIET ───────────────────────────────
   *
   * Alleen wat écht breder is dan zijn doel. De 928px-familie (banners-01..08,
   * dunes) zit met 928 tegen de 760 aan — geen 1,35x, dus geen derivaat, want
   * dan lever je generatieverlies voor een paar kilobyte. Hetzelfde geldt voor
   * glow-03 (768) en glow-04 (1200 in een brede cel van 1560).
   *
   * De 2400px-familie levert het meeste op, en de drie van 1340 doen mee omdat
   * 1340 tegen 760 nog altijd bijna drie keer zoveel pixels is.
   */
  ...['lifestyle-flash-04', 'lifestyle-flash-05', 'lifestyle-flash-06', 'lifestyle-flash-07',
    'lifestyle-flash-08', 'lifestyle-glow-02', 'lifestyle-glow-05', 'lifestyle-glow-06',
    'lifestyle-phone-made-01', 'lifestyle-phone-made-02', 'lifestyle-phone-made-03',
    'lifestyle-phone-made-04', 'lifestyle-phone-made-05', 'lifestyle-phone-made-06',
    'lifestyle-phone-made-07', 'lifestyle-phone-made-08', 'lifestyle-phone-made-09',
    'lifestyle-phone-made-10', 'lifestyle-phone-made-11', 'lifestyle-phone-made-12',
    'lifestyle-phone-made-13', 'lifestyle-phone-made-14',
    'lifestyle-flash-02', 'lifestyle-flash-03', 'lifestyle-glow-01']
    .map((n) => ({ file: n, width: 760 })),

  /* ── EN DE KLEINSTE MAAT, WAAR HET MEESTE TE HALEN VALT ──────────────────
   *
   * De meting hierboven was op één vensterbreedte de grootste, en dat is precies
   * de val die srcset bestaat om te vermijden. Op een telefoon van 390px is het
   * raster meerkoloms en is een gewone cel 171 CSS px — maal twee is 342, dus 380.
   * De 928px-familie zat daar met een factor 2,7 overheen, en dat zijn er twintig
   * in de eerste weergave: precies de foto's die een mobiele bezoeker als eerste
   * binnenhaalt.
   *
   * DRIE MATEN EN NIET TWEE, dus, en dat is geen luxe: 380 voor de telefoon, 760
   * voor de gewone cel op een groot scherm, 1560 voor een brede cel. `sizes` in
   * gallery.astro geeft de browser de gemeten CSS-breedte, en die kiest verder
   * zelf — dat is het hele mechanisme, en met één kandidaat werkt het niet.
   *
   * HIER DOET DE 928-FAMILIE WEL MEE. Voor 760 was hij te dichtbij (zie boven);
   * voor 380 is hij dat niet. */
  ...['banners-01', 'banners-02', 'banners-03', 'banners-04', 'banners-05', 'banners-06',
    'banners-07', 'banners-08', 'lifestyle-dunes-01', 'lifestyle-dunes-02', 'lifestyle-flash-01',
    'lifestyle-glow-03', 'lifestyle-glow-04',
    'lifestyle-flash-02', 'lifestyle-flash-03', 'lifestyle-glow-01',
    'lifestyle-flash-04', 'lifestyle-flash-05', 'lifestyle-flash-06', 'lifestyle-flash-07',
    'lifestyle-flash-08', 'lifestyle-glow-02', 'lifestyle-glow-05', 'lifestyle-glow-06',
    'lifestyle-phone-made-01', 'lifestyle-phone-made-02', 'lifestyle-phone-made-03',
    'lifestyle-phone-made-04', 'lifestyle-phone-made-05', 'lifestyle-phone-made-06',
    'lifestyle-phone-made-07', 'lifestyle-phone-made-08', 'lifestyle-phone-made-09',
    'lifestyle-phone-made-10', 'lifestyle-phone-made-11', 'lifestyle-phone-made-12',
    'lifestyle-phone-made-13', 'lifestyle-phone-made-14']
    .map((n) => ({ file: n, width: 380 })),

  /* De brede cellen. Welke foto breed valt, bepaalt `i % 7 === 0` in
     gallery.astro, en die index verschuift zodra er een foto bij komt — dus
     krijgt ELKE 2400px-foto ook zijn brede maat. Vijfentwintig extra bestanden
     van gemiddeld 90 kB is de prijs van een galerij waarin je een foto kunt
     bijzetten zonder dit bestand te hoeven natellen. */
  ...['lifestyle-flash-04', 'lifestyle-flash-05', 'lifestyle-flash-06', 'lifestyle-flash-07',
    'lifestyle-flash-08', 'lifestyle-glow-02', 'lifestyle-glow-05', 'lifestyle-glow-06',
    'lifestyle-phone-made-01', 'lifestyle-phone-made-02', 'lifestyle-phone-made-03',
    'lifestyle-phone-made-04', 'lifestyle-phone-made-05', 'lifestyle-phone-made-06',
    'lifestyle-phone-made-07', 'lifestyle-phone-made-08', 'lifestyle-phone-made-09',
    'lifestyle-phone-made-10', 'lifestyle-phone-made-11', 'lifestyle-phone-made-12',
    'lifestyle-phone-made-13', 'lifestyle-phone-made-14']
    .map((n) => ({ file: n, width: 1560 })),
];

const force = process.argv.includes('--force');
const results = [];

for (const job of JOBS) {
  const src = path.join(IMG, `${job.file}.webp`);
  const outName = `${job.file}-w${job.width}.webp`;
  const out = path.join(IMG, outName);

  if (!existsSync(src)) throw new Error(`make-thumbs: missing source ${src}`);
  if (existsSync(out) && !force) {
    const meta = await sharp(out).metadata();
    results.push({ outName, w: meta.width, h: meta.height, bytes: (await readFile(out)).length, skipped: true });
    continue;
  }

  const input = sharp(src);
  const meta = await input.metadata();
  if (meta.width <= job.width) {
    // Refuse to "shrink" something already at or below the target: that is a
    // re-encode, not a derivative, and it only costs quality.
    throw new Error(`make-thumbs: ${job.file} is ${meta.width}px, not wider than the ${job.width}px target`);
  }

  const buf = await input
    .resize({ width: job.width, kernel: 'lanczos3' })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer();
  await writeFile(out, buf);
  const outMeta = await sharp(buf).metadata();
  results.push({ outName, w: outMeta.width, h: outMeta.height, bytes: buf.length, from: meta.width, fromBytes: (await readFile(src)).length });
}

let saved = 0;
for (const r of results) {
  if (r.skipped) {
    console.log(`  = ${r.outName.padEnd(34)} ${r.w}x${r.h}  ${(r.bytes / 1024).toFixed(0)} kB  (exists, --force to redo)`);
  } else {
    saved += r.fromBytes - r.bytes;
    console.log(`  + ${r.outName.padEnd(34)} ${r.w}x${r.h}  ${(r.bytes / 1024).toFixed(0)} kB  (from ${r.from}px, ${(r.fromBytes / 1024).toFixed(0)} kB)`);
  }
}
if (saved) console.log(`\n  ${(saved / 1024).toFixed(0)} kB less to download when every one of these is on screen.`);
