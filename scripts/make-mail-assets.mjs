/* The V mark as a PNG an email client will actually render.
 *
 * WHY THIS EXISTS AND WHY IT IS A PNG. Email has no SVG. Gmail, Outlook and
 * Apple Mail all strip or refuse <svg>, and the one place the site's mark lives
 * — the <symbol id="markglyph"> in Layout.astro — is SVG. So the mark has to be
 * rasterised, hosted at a stable https URL, and referenced with <img src>.
 *
 * WHY IT IS GENERATED, NOT EXPORTED BY HAND. Same reason make-favicons.mjs and
 * make-logo-pack.mjs are: the drawing changed four times in one afternoon, and
 * every hand-exported copy of it is a copy that silently keeps the old shape.
 * This reads the same symbol the site renders, so a fifth change reaches the
 * mail header by running `npm run mail:assets` and nothing else.
 *
 * WHY GREEN ON TRANSPARENT AND NOT THE TILE. The mail header is a dark band,
 * and a tile PNG would need its own background to match that band exactly — a
 * second place for #08090B to be written down, and the seam shows the moment
 * one of them moves. Transparent means the band's own bgcolor shows through,
 * so there is one source of truth for the header colour and it lives in the
 * HTML next to everything else.
 *
 * WHY 3x. The header draws the mark 32px tall. Retina mail clients ask for 2x,
 * and Gmail's image proxy re-encodes anything it serves, which costs a little
 * more edge quality than a browser would. 96px costs about 4 kB and removes the
 * question.
 *
 * NO OPTICAL CENTRING HERE. opticalOffset() exists because a favicon and a logo
 * tile place the mark inside a SQUARE and the leftover space has to look even.
 * This asset is trimmed to its own ink, so there is no leftover space to
 * balance — it is positioned by the HTML beside it, not by a canvas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readGlyph } from './lib/glyph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/img/mail');

/** Height in CSS px the header draws the mark at, times three. */
const H = 96;

const COLOURS = {
  groen: '#C6F100',   // on the dark header band
  wit: '#FFFFFF',     // spare, for a light-on-dark variant of any future template
};

const { viewBox, inner, VW, VH } = readGlyph();
const W = Math.round(H * (VW / VH));

fs.mkdirSync(OUT, { recursive: true });

for (const [name, fill] of Object.entries(COLOURS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${viewBox}" fill="${fill}">${inner}</svg>`;
  const file = path.join(OUT, `mark-${name}.png`);
  // trim() removes the transparent margin the viewBox carries around the ink,
  // so the HTML's width/height attributes describe the mark and not its padding.
  await sharp(Buffer.from(svg), { density: 384 })
    .resize({ width: W, height: H, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9 })
    .toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`  ${path.relative(ROOT, file)}  ${meta.width}×${meta.height}  ${(fs.statSync(file).size / 1024).toFixed(1)} kB`);
}

console.log(`\n▶ mark drawn from <symbol id="markglyph"> (${VW}×${VH}) at ${H}px = 3× of the 32px header`);
