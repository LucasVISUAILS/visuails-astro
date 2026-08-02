/* Builds the whole favicon set from the SAME traced path the site's sprite
 * uses, so the tab icon and the mark in the header cannot drift apart.
 *
 * Run with: npm run favicons
 *
 * WHY THIS IS A SCRIPT AND NOT SIX FILES SOMEBODY MADE ONCE
 * The previous set was a black V on transparent — correct against the paper
 * palette it was cut for, invisible in a dark browser tab, and impossible to
 * update without redoing the export by hand. Every value it depends on now
 * lives in one place: the glyph comes out of Layout.astro at build time, the
 * ground is GROUND below, and re-running this is the whole update procedure.
 *
 * WHITE ON A DARK SQUARE, NOT WHITE ON TRANSPARENT
 * A transparent white mark disappears on Chrome's and Safari's light tab strip,
 * which is the default most people are looking at. The square is --bg-0, so the
 * icon is the site's own ground rather than a decision taken separately.
 *
 * Rendered through Chromium because that is the engine that draws this same
 * path everywhere else on the site. ImageMagick in this environment has no
 * librsvg delegate and silently fails on SVG input.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public');

const GROUND = '#08090B';   // --bg-0
const INK = '#FFFFFF';      // --ink-1

/* Pull the glyph out of the layout rather than keeping a second copy of it. */
const layout = fs.readFileSync(path.join(ROOT, 'src/layouts/Layout.astro'), 'utf8');
const m = layout.match(/<symbol id="markglyph" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/);
if (!m) throw new Error('make-favicons: no <symbol id="markglyph"> in Layout.astro');
const viewBox = m[1];
const inner = m[2].trim();
const [, , VW, VH] = viewBox.split(/\s+/).map(Number);

/**
 * @param {number} size   px
 * @param {number} radius corner radius in px (0 = full-bleed square)
 * @param {number} inset  glyph height as a fraction of the icon
 */
function svg(size, radius, inset) {
  const gh = size * inset;
  const gw = gh * (VW / VH);              // keep the traced aspect exactly
  const x = (size - gw) / 2;
  // Geometric centre is also the optical one here: the viewBox is cropped to
  // the ink, so there is no invisible padding pulling the mark off-centre.
  const y = (size - gh) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${GROUND}"/>
  <svg x="${x}" y="${y}" width="${gw}" height="${gh}" viewBox="${viewBox}" fill="${INK}">${inner}</svg>
</svg>`;
}

const browser = await chromium.launch();

async function png(file, size, radius, inset) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;padding:0;background:transparent}</style>${svg(size, radius, inset)}`);
  await p.screenshot({ path: path.join(OUT, file), omitBackground: true });
  await p.close();
  console.log(`  ${file}  ${size}px  r=${radius}`);
}

console.log('favicons:');
// Corner radius is 20% of the edge — at 32px that is 6px, small enough to still
// read as a square with soft corners and large enough not to vanish into the
// antialiasing. It is NOT --r-lg: 16px on a 32px icon is a circle.
await png('favicon-32.png', 32, 6, 0.60);
await png('favicon-48.png', 48, 10, 0.60);
await png('favicon-192.png', 192, 38, 0.60);
await png('favicon-512.png', 512, 102, 0.60);

// iOS masks this one itself and ignores transparency, so it is full-bleed. A
// pre-rounded tile gets rounded twice and shows dark slivers in the corners.
// The glyph is a touch smaller because iOS's mask cuts closer than a 20% rx.
await png('apple-touch-icon.png', 180, 0, 0.56);

await browser.close();

/* The .ico, built from the 48px render so the 16px entry is a downscale of a
 * real render rather than of a 512px one. pngjs + a hand-written ICO header,
 * because the format is 22 bytes of directory per image and pulling in an
 * encoder for that is not worth a dependency. */
function icoFromPngs(files) {
  const bufs = files.map((f) => fs.readFileSync(f));
  const n = bufs.length;
  const header = Buffer.alloc(6 + 16 * n);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(n, 4);
  let offset = header.length;
  bufs.forEach((buf, i) => {
    const png = PNG.sync.read(buf);
    const at = 6 + 16 * i;
    header.writeUInt8(png.width >= 256 ? 0 : png.width, at);
    header.writeUInt8(png.height >= 256 ? 0 : png.height, at + 1);
    header.writeUInt8(0, at + 2); header.writeUInt8(0, at + 3);
    header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(buf.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...bufs]);
}

/* Three real renders rather than one image resized three times. */
const b2 = await chromium.launch();
const tmp = [];
for (const [size, radius] of [[16, 3], [32, 6], [48, 10]]) {
  const f = path.join(OUT, `.ico-${size}.png`);
  const p = await b2.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;padding:0;background:transparent}</style>${svg(size, radius, 0.60)}`);
  await p.screenshot({ path: f, omitBackground: true });
  await p.close();
  tmp.push(f);
}
await b2.close();
fs.writeFileSync(path.join(OUT, 'favicon.ico'), icoFromPngs(tmp));
tmp.forEach((f) => fs.unlinkSync(f));
console.log('  favicon.ico  16 + 32 + 48px');

/* The SVG favicon: what a modern browser prefers, and the only version that
 * stays crisp at 16px on a scaled desktop or a 4x display. */
fs.writeFileSync(path.join(OUT, 'favicon.svg'), svg(64, 12, 0.60) + '\n');
console.log('  favicon.svg');
