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
  /* Op de donkere kopband van de mail. Uit KLEURENSCHEMA.md, 20 september
     2026: op zwart is het accent het LICHTE violet (8,30:1); het violet van de
     vulling haalt daar 2,93:1. */
  groen: '#8F66FF',
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

/* ── HET WOORDMERK VOOR DE KOP VAN DE MAIL — 14 oktober 2026 ─────────────────
   De mail kreeg de kop van de hal: wit, met het woordmerk (src/data/woordmerk.js)
   in inkt, 22 px hoog en dus 3× = 66 px in het bestand. Uit hetzelfde pad als de
   site, zodat een nieuwe letter ook de mail bereikt met `npm run mail:assets`. */
const { WOORDMERK } = await import('../src/data/woordmerk.js');
const WH = 66;
const WW = Math.round(WH * (WOORDMERK.breed / WOORDMERK.hoog));
const wsvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WW}" height="${WH}" viewBox="${WOORDMERK.symbool}"><path fill="#000000" fill-rule="evenodd" d="${WOORDMERK.d}"/></svg>`;
const wfile = path.join(OUT, 'woordmerk-inkt.png');
await sharp(Buffer.from(wsvg), { density: 384 })
  .resize({ width: WW, height: WH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(wfile);
const wmeta = await sharp(wfile).metadata();
console.log(`  ${path.relative(ROOT, wfile)}  ${wmeta.width}×${wmeta.height}  ${(fs.statSync(wfile).size / 1024).toFixed(1)} kB  (124 × 22 in de mail)`);

/* ── HET WOORDMERK OP EEN WIT PLAATJE — 17 oktober 2026 ──────────────────────
   De Gmail-app maakt een lichte mail zelf donker, maar laat beelden zoals ze
   zijn: inkt op doorzichtig stond daar donker op donker (zie de kop van
   src/lib/mailTemplate.js). Dit is hetzelfde woordmerk, even groot (124 × 22),
   in een witte pil met 16 px links en rechts en 12 px boven en onder: 156 × 46
   in de mail, 3× in het bestand. Op wit is de pil onzichtbaar. De hoeken zijn
   doorzichtig, zodat de pil in de donkere stand rond is.
   woordmerk-inkt.png blijft bestaan: mails die al verstuurd zijn, wijzen ernaar. */
const PX = 16, PY = 12;
const PW = (124 + 2 * PX) * 3, PH = (22 + 2 * PY) * 3;
const psvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}">`
  + `<rect width="${PW}" height="${PH}" rx="${PH / 2}" fill="#FFFFFF"/>`
  + `<svg x="${PX * 3}" y="${PY * 3}" width="${124 * 3}" height="${22 * 3}" viewBox="${WOORDMERK.symbool}" preserveAspectRatio="xMidYMid meet">`
  + `<path fill="#000000" fill-rule="evenodd" d="${WOORDMERK.d}"/></svg></svg>`;
const pfile = path.join(OUT, 'woordmerk-plaat.png');
await sharp(Buffer.from(psvg), { density: 72 }).png({ compressionLevel: 9 }).toFile(pfile);
const pmeta = await sharp(pfile).metadata();
console.log(`  ${path.relative(ROOT, pfile)}  ${pmeta.width}×${pmeta.height}  ${(fs.statSync(pfile).size / 1024).toFixed(1)} kB  (156 × 46 in de mail)`);

/* ── DE SNEDE EN HET WOORDMERK IN DE VOET — levering 55, 17 oktober 2026 ──────
   Afvinklijst 34, E (m-kop en m-stap, "doen"):
   - snede.png: het streepje waarmee de lijn onder de kop begint (zwart sinds schema A), 28 × 3
     in de mail, met een schuin eind op 53,13° (de snede van het merk: over 3 px
     hoogte 2,25 px opzij). 3× in het bestand.
   - voet-woordmerk.png: het woordmerk in lichtgrijs (#C7C7C7; tot schema A, 19 oktober 2026,
     lila #C9BFFF), 376 breed (de breedte
     van de tekstkolom: 440 min 2 × 32), en alleen de bovenste 58% (38 px): de rest
     valt weg onder de rand, zoals het grote woordmerk onder de site. 3×. */
{
  const SW = 28 * 3, SH = 3 * 3, schuin = SH * 0.75;
  const ssvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"><path fill="#000000" d="M0 0H${SW}L${SW - schuin} ${SH}H0Z"/></svg>`;
  const sfile = path.join(OUT, 'snede.png');
  await sharp(Buffer.from(ssvg), { density: 72 }).png({ compressionLevel: 9 }).toFile(sfile);
  const smeta = await sharp(sfile).metadata();
  console.log(`  ${path.relative(ROOT, sfile)}  ${smeta.width}×${smeta.height}  (28 × 3 in de mail)`);

  const VW = 376 * 3, VH = 38 * 3;
  const volle = Math.round(VW * (WOORDMERK.hoog / WOORDMERK.breed));
  const vsvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VW}" height="${volle}" viewBox="${WOORDMERK.symbool}"><path fill="#C7C7C7" fill-rule="evenodd" d="${WOORDMERK.d}"/></svg>`;
  const vfile = path.join(OUT, 'voet-woordmerk.png');
  await sharp(Buffer.from(vsvg), { density: 384 })
    .resize({ width: VW, height: volle, fit: 'fill' })
    .extract({ left: 0, top: 0, width: VW, height: VH })
    .png({ compressionLevel: 9 })
    .toFile(vfile);
  const vmeta = await sharp(vfile).metadata();
  console.log(`  ${path.relative(ROOT, vfile)}  ${vmeta.width}×${vmeta.height}  (376 × 38 in de mail)`);
}
