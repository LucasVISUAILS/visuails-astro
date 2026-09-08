/* Builds the shareable logo pack: every colourway of the V mark, as SVG, as
 * transparent PNG at three sizes, and as JPG on a ground.
 *
 * Run with: npm run logo:pack   →   brand/visuails-logo/
 *
 * WHY THIS IS A SCRIPT AND NOT AN EXPORT SOMEBODY DID ONCE. Same argument as
 * make-favicons.mjs, which it deliberately mirrors: the glyph is read out of
 * Layout.astro at build time, so the pack cannot drift from the mark the site
 * is actually rendering. Re-running it after any change to the symbol is the
 * whole update procedure, and a file in this folder that contradicts the site
 * is not possible by construction.
 *
 * TRANSPARENT PNG **AND** JPG, on purpose. A JPEG has no alpha channel — every
 * "transparent" JPG anyone has ever been sent is a white box. So the JPGs here
 * are each baked onto a real ground and named for it, and anything that needs
 * to sit on an unknown background is a PNG. Sending someone a logo without
 * saying which is which is how a white mark ends up as a white square in a
 * partner's deck.
 *
 * The renders go through Chromium for the same reason the favicons do: it is
 * the engine that draws this path everywhere else.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { readGlyph, opticalOffset } from './lib/glyph.mjs';
import { browserPad } from './lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'brand', 'visuails-logo');

const GREEN = '#D2E04A';
const DARK = '#111111';
const WHITE = '#FFFFFF';

/* Shared with make-favicons.mjs, so the pack and the tab icon cannot disagree
 * about what the mark is or where inside a square it sits. */
const glyph = readGlyph();
const { viewBox, inner, VW, VH } = glyph;

/** The bare mark, no ground. `pad` is a fraction of the LONGEST side. */
function markSvg(ink, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}" fill="${ink}">${inner}</svg>`;
}

/** The mark on a square ground — the shape a profile picture or an app tile wants. */
function tileSvg(ink, ground, size, radius, inset) {
  const box = size * inset;
  const s = Math.min(box / VW, box / VH);
  const gw = VW * s, gh = VH * s;
  // Optically centred, not geometrically — the same nudge the favicons use.
  // See scripts/lib/glyph.mjs. A profile picture is the one place this is most
  // visible: it is a small square with nothing else in it.
  const x = (size - gw) / 2 + nudge.dx * s;
  const y = (size - gh) / 2 + nudge.dy * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${ground}"/>
  <svg x="${x}" y="${y}" width="${gw}" height="${gh}" viewBox="${viewBox}" fill="${ink}">${inner}</svg>
</svg>`;
}

/* WELKE CHROME. 7 september 2026: hier stond `process.env.CHROMIUM_PATH ||
 * undefined`, een omweg die je zelf moest zetten. Zonder die variabele zoekt
 * Playwright naar de bouwnummer-map die bij ZIJN versie hoort, en die verandert
 * bij elke `npm install` die playwright een minor omhoog tikt:
 *
 *     browserType.launch: Executable doesn't exist at
 *     /opt/pw-browsers/chromium_headless_shell-1234/...
 *
 * Precies waarvoor scripts/lib/browserpad.mjs bestaat, en wat elf andere
 * scripts in deze map al gebruiken. CHROMIUM_PATH blijft vóór staan zodat een
 * omgeving die hem zet niets merkt; browserPad() geeft undefined terug op een
 * gewone laptop, en dan zoekt Playwright zelf — wat daar juist goed is. */
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || browserPad() });
const nudge = await opticalOffset(browser, glyph);

async function png(svg, w, h, file, transparent) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;padding:0;background:transparent}</style>${svg}`);
  await p.screenshot({ path: path.join(OUT, file), omitBackground: !!transparent });
  await p.close();
}

async function jpg(svg, w, h, file) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;padding:0}</style>${svg}`);
  const dataUrl = await p.evaluate(async () => {
    const svgEl = document.querySelector('svg');
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = svgEl.getAttribute('width');
    c.height = svgEl.getAttribute('height');
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.96);
  });
  fs.writeFileSync(path.join(OUT, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
  await p.close();
}

fs.rmSync(OUT, { recursive: true, force: true });
for (const d of ['svg', 'png-transparant', 'png-tegel', 'jpg']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const INKS = [['groen', GREEN], ['wit', WHITE], ['zwart', DARK]];
/* Heights, not widths. The glyph is taller than it is wide (261×313), so a
 * height is the dimension that stays predictable across every colourway. */
const SIZES = [512, 1024, 2048];

console.log('logo pack:');
for (const [name, ink] of INKS) {
  fs.writeFileSync(path.join(OUT, 'svg', `visuails-mark-${name}.svg`), markSvg(ink, VW, VH) + '\n');
  for (const h of SIZES) {
    const w = Math.round(h * (VW / VH));
    await png(markSvg(ink, w, h), w, h, `png-transparant/visuails-mark-${name}-${h}.png`, true);
  }
  console.log(`  mark ${name.padEnd(6)} svg + png ${SIZES.join('/')}`);
}

/* The two tiles that are actually used: the live favicon colourway, and its
 * inverse for anywhere the green would be too loud. 20% radius matches the
 * favicon set; the square versions are for platforms that mask their own. */
const TILES = [
  ['wit-op-groen', WHITE, GREEN],
  ['groen-op-zwart', GREEN, DARK],
];
for (const [name, ink, ground] of TILES) {
  for (const size of SIZES) {
    await png(tileSvg(ink, ground, size, Math.round(size * 0.2), 0.62), size, size, `png-tegel/visuails-tegel-${name}-${size}.png`);
    await png(tileSvg(ink, ground, size, 0, 0.58), size, size, `png-tegel/visuails-tegel-${name}-${size}-vierkant.png`);
    await jpg(tileSvg(ink, ground, size, 0, 0.58), size, size, `jpg/visuails-tegel-${name}-${size}.jpg`);
  }
  console.log(`  tile ${name.padEnd(15)} png rond + vierkant + jpg, ${SIZES.join('/')}`);
}
/* One JPG of the mark on white, because that is what a printer or a partner's
 * template asks for and it is the one combination no other file here covers. */
for (const size of SIZES) {
  await jpg(tileSvg(DARK, WHITE, size, 0, 0.58), size, size, `jpg/visuails-tegel-zwart-op-wit-${size}.jpg`);
}
console.log('  tile zwart-op-wit    jpg, ' + SIZES.join('/'));

await browser.close();

fs.writeFileSync(path.join(OUT, 'LEES-MIJ.txt'), `VISUAILS — logobestanden
Gegenereerd uit het merk dat de site zelf rendert (scripts/make-logo-pack.mjs).
Draai "npm run logo:pack" opnieuw na elke wijziging aan het merk.

KLEUREN
  gifgroen   ${GREEN}
  bijna-zwart ${DARK}
  wit        ${WHITE}

WELK BESTAND WANNEER

  svg/                Het origineel. Oneindig schaalbaar, gebruik dit waar het
                      kan — drukwerk, borduurwerk, groot formaat, een website.
                      Eén pad, één kleur, geen ingebedde tekst.

  png-transparant/    Het merk zonder achtergrond, in drie kleuren. Voor als je
                      het merk op iets anders zet: een foto, een gekleurd vlak,
                      een slide. Kies de kleur die contrasteert met wat eronder
                      ligt — groen op wit is zwak (2,15:1), groen op zwart is
                      sterk (9,27:1).

  png-tegel/          Het merk in een vierkant vlak. Dit is wat je uploadt als
                      profielfoto: Instagram, Facebook, WhatsApp Business,
                      Google Bedrijfsprofiel, LinkedIn. "-vierkant" is
                      full-bleed voor platforms die zelf ronde hoeken maken
                      (dat zijn ze bijna allemaal); de andere heeft de hoeken
                      al, voor als een platform dat niet doet.

  jpg/                Alleen als iets echt geen PNG accepteert. LET OP: een JPG
                      KAN GEEN TRANSPARANTIE. Elk bestand hier heeft een echte
                      achtergrond die in de naam staat. Zet een JPG dus nooit
                      op een andere kleur dan die van zichzelf — dan zie je het
                      vierkant.

DE CONTOURVARIANT (visuails-*-contour-*)
  Toegevoegd 19 augustus 2026. Dezelfde V, maar met een zwarte lijn die het merk
  op een afstandje volgt. Aangeleverd als afbeelding en hier alleen opgeschoond:
  de kleuren zijn vastgeklikt op het merkgroen en het bijna-zwart hierboven, en
  de witte achtergrond is eruit gehaald.

  VIER ONDERGRONDEN, EN ZE ZIJN NIET UITWISSELBAAR. Dit merk heeft twee kleuren
  in zich, en een ondergrond kan er altijd één van opslokken:

    op-wit    beide kleuren staan er. Dit is de variant zoals bedoeld, en de
              enige die je moet pakken als je er niet over na wilt denken.
    op-grijs  hetzelfde beeld, iets rustiger. #D8D8D8 — LET OP: dat is geen
              merkkleur, hij staat nergens in global.css. Wil je een andere
              grijstint, dan is dat één regel in scripts/gronden.py.
    op-zwart  de zwarte contour valt weg tegen de grond en wat overblijft is het
              gewone groene merk. Bruikbaar, maar dan heb je feitelijk
              png-transparant/visuails-mark-groen te pakken — met een extra stap.
    op-groen  nu valt het gróén weg en blijft alleen de zwarte lijn staan: de V
              als losse contour. Een heel ander beeld, en met opzet bewaard.

  De transparante versie in png-transparant/ hoort dus op iets lichts. Zet je
  hem op donker, gebruik dan visuails-mark-groen of -wit.

  GEEN SVG EN GEEN 2048, en dat is met opzet. De aangeleverde afbeelding bevat
  740 x 834 pixels inkt. 512 is daarmee een verkleining en dus scherp; 1024 is
  een lichte oprekking die op een scherm niet opvalt. 2048 staat hierboven
  beschreven als het formaat voor drukwerk en spandoeken, en dat kan deze bron
  niet waarmaken — een zachte opschaling onder die naam wegzetten is de belofte
  breken. Komt er ooit een vectorversie van deze variant, dan kan het hele
  pakket alsnog compleet.

  NIET GEGENEREERD DOOR "npm run logo:pack". Dat script rendert uit het merk in
  Layout.astro en kleurt het in zijn geheel één kleur — zo ontstaan groen, wit
  en zwart. Een merk met twee kleuren erin past niet in die vorm. Deze bestanden
  overleven dus een herbouw van het pakket, maar veranderen ook niet mee als het
  merk zelf ooit verandert. Dan moeten ze opnieuw worden aangeleverd.
  Op 5 september 2026 zijn ze per pixel herkleurd van het oude gifgroen en
  bijna-zwart naar de kleuren hierboven (sectie 20); de vorm is niet aangeraakt.

FORMATEN
  512   ruim genoeg voor elk sociaal profiel en elke website
  1024  presentaties, grote schermen
  2048  drukwerk, spandoeken, alles wat je later nog wil kunnen bijsnijden

Voor het tabblad-icoon van de site hoef je hier niets mee te doen: dat stel
staat in public/ en wordt door "npm run favicons" gemaakt.
`);
console.log(`\n  → brand/visuails-logo/  (${fs.readdirSync(path.join(OUT,'png-transparant')).length + fs.readdirSync(path.join(OUT,'png-tegel')).length + fs.readdirSync(path.join(OUT,'jpg')).length + 3} bestanden)`);
