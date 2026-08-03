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
