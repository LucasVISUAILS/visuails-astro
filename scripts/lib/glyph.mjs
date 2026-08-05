/* The V mark, read out of Layout.astro — and where its optical centre is.
 *
 * Two scripts draw this glyph into a square: make-favicons.mjs (the tab icon,
 * the app tile) and make-logo-pack.mjs (the shareable files). Both used to
 * carry their own copy of the regex that pulls the symbol out of the layout,
 * and both centred it by its bounding box. This module is the one place either
 * of those facts lives now.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A BOUNDING BOX IS THE WRONG THING TO CENTRE ON. Lucas, August 2026: *"het
 * logo voelt niet helemaal gecentreerd."*
 *
 * The old mark was a near-square V and its box centre and its visual centre were
 * within a pixel of each other — the comment in make-favicons.mjs said exactly
 * that, and it was true of that drawing. The new mark is not that shape. It has
 * a thin spike that reaches further right and higher than the V does, so the
 * bounding box is stretched toward a sliver of ink that carries almost none of
 * the visual weight. Centre that box and the V — the thing the eye actually
 * reads — sits low and left, with a band of dead tile under it.
 *
 * Measured on this drawing: the ink centroid is 5.45 units right of the box
 * centre and 15.54 units above it, on a glyph 260 × 313. Vertically that is 5%
 * of the height, which is well past the threshold where "something is off" but
 * short of where you can name it — which is exactly the complaint.
 *
 * BLEND = 0.5, and the number was chosen by looking. Pure box centring leaves
 * the V low; pure centroid centring over-corrects, because a centroid weights a
 * long thin spike as heavily per pixel as the body of the letter, and it pushes
 * the mark down and right until the spike crowds the tile edge. Halfway looked
 * right at 180px, 64px and 32px, which are the three sizes it has to hold at.
 *
 * IT IS MEASURED, NOT STORED. The alternative was a constant beside the symbol
 * with a comment saying "re-measure this if the mark changes". This codebase has
 * already been bitten twice by exactly that shape of instruction — the footer
 * glow that kept its old accent for a whole palette change, and two selectors
 * that kept a class name through a rename. An instruction to a future reader is
 * not a mechanism. This rasterises the actual glyph on every run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** How far to move from the bounding-box centre toward the ink centroid. */
export const BLEND = 0.5;

export function readGlyph() {
  const layout = fs.readFileSync(path.join(ROOT, 'src/layouts/Layout.astro'), 'utf8');
  const m = layout.match(/<symbol id="markglyph" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/);
  if (!m) throw new Error('glyph.mjs: no <symbol id="markglyph"> in Layout.astro');
  const viewBox = m[1];
  const [, , VW, VH] = viewBox.split(/\s+/).map(Number);
  return { viewBox, inner: m[2].trim(), VW, VH };
}

/**
 * The offset, in viewBox units, to add when placing the glyph in a square so it
 * looks centred rather than measures centred.
 *
 * @param {import('playwright').Browser} browser
 * @param {{viewBox: string, inner: string, VW: number, VH: number}} glyph
 * @returns {Promise<{dx: number, dy: number, cx: number, cy: number}>}
 */
export async function opticalOffset(browser, glyph) {
  const { viewBox, inner, VW, VH } = glyph;
  // 600px on the long side: fine enough that the centroid is stable to well
  // under a viewBox unit, cheap enough to run on every build.
  const H = 600;
  const W = Math.round(H * (VW / VH));
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;padding:0}</style>
    <svg id="g" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${viewBox}" fill="#000">${inner}</svg>`);
  const c = await page.evaluate(async ({ W, H }) => {
    const svg = document.getElementById('g');
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    // Weight by alpha, so the anti-aliased edge contributes its real coverage
    // rather than being rounded in or out.
    let sx = 0, sy = 0, s = 0;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const a = d[(y * W + x) * 4 + 3];
        if (!a) continue;
        sx += x * a; sy += y * a; s += a;
      }
    }
    return { cx: sx / s, cy: sy / s };
  }, { W, H });
  await page.close();
  // canvas px -> viewBox units
  const cx = (c.cx / W) * VW;
  const cy = (c.cy / H) * VH;
  return { cx, cy, dx: (VW / 2 - cx) * BLEND, dy: (VH / 2 - cy) * BLEND };
}
