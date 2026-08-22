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
 * colours are VARIANTS below, and re-running this is the whole update procedure.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SIX COLOURWAYS, ONE OF THEM LIVE. August 2026.
 *
 * The palette moved to the green (--accent #C6F100) and the mark had to follow.
 * Rather than settling that in a conversation and baking the winner in, all six
 * candidates are cut every run: the live one into public/, the rest into
 * brand/logo/<id>/, which is NOT inside public/ and therefore never deployed —
 * it is a drawer, not a page. Switching the site's identity is then one line
 * (ACTIVE below) plus a re-run, and comparing two of them is opening two PNGs
 * rather than reasoning about hex codes.
 *
 * The contrast figure printed per variant is the glyph against its own tile,
 * and it is the number that decides whether an icon survives being 16px in a
 * tab strip. WCAG does not govern a logo (1.4.11 exempts them), so a low number
 * here is a legibility judgement rather than a compliance failure — but it is
 * printed so the judgement is made with the number in view, and printing it is
 * what caught the following.
 *
 * ACTIVE IS c — THE GREEN MARK ON A NEAR-BLACK TILE. Lucas: *"ik wil eigenlijk
 * het toxic groene logo met transparante achtergrond."* This is that request
 * with the one part changed that could not survive: the mark IS the green now
 * rather than white, and it keeps a ground.
 *
 * WHY NOT ACTUALLY TRANSPARENT, which is what was asked. A favicon lands on
 * three surfaces and two of them are light. Measured against the real values:
 *
 *              transparent green   green on this tile
 *   light tab        1.18:1              15.16:1
 *   Google result    1.31:1              15.16:1
 *   dark tab        10.92:1              15.16:1
 *
 * A transparent green mark is beautiful on a dark tab strip and a pale ghost
 * everywhere else — including Google's results page, which is white, and which
 * is the exact surface Lucas was trying to clean up when he asked why the old
 * Wix icon was still showing there. Mocked up as three browser rows and looked
 * at before this was decided; the ghost is visible in the picture, not just in
 * the arithmetic.
 *
 * A theme-aware SVG (green under prefers-color-scheme: dark, near-black under
 * light) solves the tab strip properly and was the runner-up. It loses on the
 * fallbacks: the .ico and the PNGs cannot switch, so Android, bookmarks and
 * Google all get the near-black version, and the icon is then only green on
 * roughly half the surfaces it appears on. One colour everywhere won.
 *
 * WHITE ON TRANSPARENT IS NEVER AN OPTION, whichever variant is live
 * A transparent white mark disappears on Chrome's and Safari's light tab strip,
 * which is the default most people are looking at. Every variant is a glyph on
 * an opaque tile for that reason.
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
import { readGlyph, opticalOffset, BLEND } from './lib/glyph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DRAWER = path.join(ROOT, 'brand', 'logo');

const GREEN = '#C6F100';   // --accent
const GREEN_DIM = '#ABD200';   // --accent-dim
const DARK = '#08090B';   // --bg-0
const WHITE = '#FFFFFF';   // --ink-1

/** id → { ground, ink, note }. `ACTIVE` picks the one that ships. */
const VARIANTS = {
  c:  { ground: DARK,      ink: GREEN,     note: 'gifgroen op bijna-zwart — LIVE' },
  b:  { ground: GREEN,     ink: WHITE,     note: 'wit op gifgroen — 1.31:1' },
  b2: { ground: GREEN,     ink: DARK,      note: 'bijna-zwart op gifgroen — 15.16:1' },
  a:  { ground: WHITE,     ink: GREEN,     note: 'gifgroen op wit' },
  a2: { ground: WHITE,     ink: GREEN_DIM, note: 'dieper groen op wit' },
  mono: { ground: DARK,    ink: WHITE,     note: 'wit op bijna-zwart — het vorige stel' },
};
const ACTIVE = 'c';

/* Relative luminance and contrast, WCAG 2.x. Twenty lines rather than a
 * dependency, and the same maths the palette in global.css was solved with. */
const luminance = (hex) => {
  const ch = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* Pull the glyph out of the layout rather than keeping a second copy of it.
 * Reading it, and knowing where its optical centre is, both live in
 * scripts/lib/glyph.mjs — shared with make-logo-pack.mjs so the two cannot
 * disagree about what the mark is or where it sits. */
const glyph = readGlyph();
const { viewBox, inner, VW, VH } = glyph;

/**
 * @param {{ground: string, ink: string}} v
 * @param {number} size   px
 * @param {number} radius corner radius in px (0 = full-bleed square)
 * @param {number} inset  glyph height as a fraction of the icon
 */
function svg(v, size, radius, inset) {
  const gh = size * inset;
  const gw = gh * (VW / VH);              // keep the traced aspect exactly
  // OPTICALLY CENTRED, NOT GEOMETRICALLY. This used to read "geometric centre
  // is also the optical one here", which was true of the old near-square V and
  // stopped being true the day the mark grew a spike: the bounding box now
  // reaches toward a sliver of ink carrying almost none of the weight, so
  // centring it drops the letter low and left. `nudge` is measured off the
  // rendered glyph on every run — see scripts/lib/glyph.mjs for the argument
  // and for why it is measured rather than stored as a constant.
  const s = gh / VH;
  const x = (size - gw) / 2 + nudge.dx * s;
  const y = (size - gh) / 2 + nudge.dy * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${v.ground}"/>
  <svg x="${x}" y="${y}" width="${gw}" height="${gh}" viewBox="${viewBox}" fill="${v.ink}">${inner}</svg>
</svg>`;
}

/* The .ico, built from real renders at each size so the 16px entry is a
 * downscale of a 16px render rather than of a 512px one. pngjs + a hand-written
 * ICO header, because the format is 22 bytes of directory per image and pulling
 * in an encoder for that is not worth a dependency. */
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

/* CHROMIUM_PATH is an escape hatch for environments where Playwright's own
 * download is absent but a Chromium binary exists — a CI image, or the cloud
 * container this project is also built in, which ships /opt/pw-browsers/chromium
 * and no headless shell. Unset on a normal machine, where Playwright finds its
 * own browser and this resolves to undefined (which launch() ignores). */
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const nudge = await opticalOffset(browser, glyph);

async function shoot(v, out, file, size, radius, inset) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;padding:0;background:transparent}</style>${svg(v, size, radius, inset)}`);
  await p.screenshot({ path: path.join(out, file), omitBackground: true });
  await p.close();
}

/** One complete set — the same seven files, wherever it lands. */
async function buildSet(v, out) {
  fs.mkdirSync(out, { recursive: true });
  // Corner radius is 20% of the edge — at 32px that is 6px, small enough to
  // still read as a square with soft corners and large enough not to vanish
  // into the antialiasing. It is NOT --r-lg: 16px on a 32px icon is a circle.
  //
  // ── 0.60 -> 0.76 -> WEER 0.60, 22 augustus 2026 ──────────────────────────
  //
  // Lucas zag in een zoekresultaat een kleine V in een donker rondje en vroeg om
  // "degene die hem volledig opvult". Die stond op 0.76 gezet, en dat was te
  // groot. Terug naar 0.60, met de reden erbij zodat niemand deze rondgang nog
  // eens maakt.
  //
  // WAT DE METING LIET ZIEN. Het logo dat Lucas als doel aanleverde is 2048 px
  // en de inkt daarin is 1183 px hoog: inset 0.578. De bestanden die op dat
  // moment in public/ stonden, gemeten op dezelfde manier:
  //
  //     doelbeeld van Lucas       0.578
  //     public/favicon-512.png    0.592
  //     public/favicon-192.png    0.589
  //     public/apple-touch-icon   0.550
  //
  // Die zijn dus al gelijk aan het doel; het verschil van 2% is onzichtbaar. De
  // maat was nooit het probleem. Wat een zoekresultaat klein maakt is dat Google
  // het icoon rond uitsnijdt en op ~28 px toont — de hoeken van de tegel gaan
  // eraf, en daardoor oogt dezelfde V kleiner dan op een vierkant.
  //
  // ALS HET IN DIE KLEINE WEERGAVE ALSNOG LEEG OOGT, is de knop niet deze ene
  // waarde maar optisch schalen: 16/32/48 een grotere inset geven dan 192/512,
  // omdat een klein icoon minder ruimte heeft om gelezen te worden. Elke maat
  // wordt hier los gerenderd, dus dat kan zonder dat het grote icoon verandert.
  // Niet gedaan zonder dat Lucas het gezien heeft.
  await shoot(v, out, 'favicon-32.png', 32, 6, 0.60);
  await shoot(v, out, 'favicon-48.png', 48, 10, 0.60);
  await shoot(v, out, 'favicon-192.png', 192, 38, 0.60);
  await shoot(v, out, 'favicon-512.png', 512, 102, 0.60);
  // iOS masks this one itself and ignores transparency, so it is full-bleed. A
  // pre-rounded tile gets rounded twice and shows dark slivers in the corners.
  // The glyph is a touch smaller because iOS's mask cuts closer than a 20% rx.
  await shoot(v, out, 'apple-touch-icon.png', 180, 0, 0.56);

  const tmp = [];
  for (const [size, radius] of [[16, 3], [32, 6], [48, 10]]) {
    const f = path.join(out, `.ico-${size}.png`);
    await shoot(v, out, `.ico-${size}.png`, size, radius, 0.60);
    tmp.push(f);
  }
  fs.writeFileSync(path.join(out, 'favicon.ico'), icoFromPngs(tmp));
  tmp.forEach((f) => fs.unlinkSync(f));

  // The SVG favicon: what a modern browser prefers, and the only version that
  // stays crisp at 16px on a scaled desktop or a 4x display.
  fs.writeFileSync(path.join(out, 'favicon.svg'), svg(v, 64, 12, 0.60) + '\n');
}

console.log(`favicons:  optical nudge ${nudge.dx.toFixed(2)}, ${nudge.dy.toFixed(2)} of ${VW.toFixed(0)}x${VH.toFixed(0)} (blend ${BLEND})`);
for (const [id, v] of Object.entries(VARIANTS)) {
  const live = id === ACTIVE;
  const out = live ? PUBLIC : path.join(DRAWER, id);
  await buildSet(v, out);
  console.log(
    `  ${live ? '▶' : ' '} ${id.padEnd(5)} ${v.ink} on ${v.ground}  ` +
    `${contrast(v.ink, v.ground).toFixed(2).padStart(5)}:1  ` +
    `${live ? 'public/' : `brand/logo/${id}/`}   ${v.note}`,
  );
}

await browser.close();

/* A contact sheet, so "which one was b2 again" is a file to open rather than a
 * hex code to picture. Lives in the drawer with the alternates. */
fs.writeFileSync(path.join(DRAWER, 'index.html'), `<!doctype html><meta charset="utf-8">
<title>VISUAILS — logo colourways</title>
<style>body{margin:0;background:#0E1013;color:#E8EAEC;font:15px/1.5 system-ui,sans-serif;padding:2rem}
figure{display:inline-block;margin:0 1.6rem 1.6rem 0;text-align:center}
figcaption{font-size:.78rem;color:#9BA1A8;margin-top:.5rem}
img{display:block;width:96px;height:96px;image-rendering:auto}</style>
<h1>Logo colourways</h1>
<p>Gegenereerd door <code>npm run favicons</code>. De live set staat in <code>public/</code>; deze map wordt niet gedeployed.</p>
${Object.entries(VARIANTS).map(([id, v]) => `<figure>
  <img src="${id === ACTIVE ? '../../public' : id}/favicon-192.png" alt="${id}">
  <figcaption><b>${id}</b>${id === ACTIVE ? ' — LIVE' : ''}<br>${v.note}<br>${contrast(v.ink, v.ground).toFixed(2)}:1</figcaption>
</figure>`).join('\n')}
`);
console.log(`\n  contact sheet: brand/logo/index.html`);
