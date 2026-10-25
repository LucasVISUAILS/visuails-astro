/* VISUAILS — DE TELEFOONVERSIE VAN DE GROTE FOTO'S (levering 66, 20 oktober 2026)
 *
 *   node scripts/make-telefoon.mjs            maak wat ontbreekt of ouder is dan de foto
 *   node scripts/make-telefoon.mjs --opnieuw  maak alles opnieuw (nodig als je in
 *                                             telefoonbeelden.js een q of kleur wijzigt:
 *                                             het script kijkt alleen naar de datum)
 *
 * Voor elke foto in src/data/telefoonbeelden.js schrijft dit een kleinere versie
 * naast de foto: `<naam>-w<breedte>.webp` en `.avif` (1200 px, voor één foto 1400).
 * Waarom deze foto's, waarom die breedte en waarom per foto een andere kwaliteit
 * staat in dat bestand.
 *
 * HOE. De foto wordt één keer verliesloos verkleind (lanczos3), en de webp en de
 * AVIF komen elk uit die verkleinde foto, niet de een uit de ander:
 *   - AVIF op de kwaliteit uit telefoonbeelden.js (q, en `kleur` 444 of 420): per foto
     de laagste die op een telefoon minstens zo scherp is als vóór levering 66
     (afvinklijst 45, vraag 1 = b).
 *   - WebP kwaliteit 90, de terugval voor de paar browsers zonder AVIF. Eerst stond
 *     hier 80, zoals in scripts/make-thumbs.mjs, maar dan werd de AVIF bij vijf
 *     korrelige foto's groter dan de webp en dus niet geschreven. De bouwstap neemt
 *     een AVIF-bron alleen op als ELKE breedte er is, dus dan kreeg ook een laptop
 *     de volle webp in plaats van de AVIF: zwaarder in plaats van lichter.
 * Anders dan in make-avif.mjs wordt de AVIF hier OOK geschreven als hij groter is dan
 * zijn webp. De kwaliteit is per foto gekozen op scherpte, niet op bestandsgrootte,
 * en de bouwstap neemt een AVIF-bron alleen op als elke breedte er is: zonder deze
 * AVIF kreeg ook een laptop de volle webp. Bij de foto's op kwaliteit 84 is de AVIF
 * een paar kB tot 40 kB groter dan de webp van 90; het script meldt dat met een =.
 *
 * make-avif.mjs laat deze bestanden met rust (telefoonVersies()), zodat
 * `npm run avif -- --al` ze niet opnieuw uit de webp maakt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { TELEFOONBEELDEN, telefoonPad } from '../src/data/telefoonbeelden.js';

const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUB = path.join(WORTEL, 'public');
const OPNIEUW = process.argv.includes('--opnieuw');
const WEBP = { quality: 90, effort: 6 };
const AVIF = (q, kleur) => ({ quality: q, effort: 4, chromaSubsampling: kleur === '444' ? '4:4:4' : '4:2:0' });

console.log(`\nVISUAILS — telefoonversies van ${Object.keys(TELEFOONBEELDEN).length} foto's\n`);
let gemaakt = 0, overgeslagen = 0, vol = 0, klein = 0;
for (const [src, { vol: breedte, klein: KLEIN, q, kleur }] of Object.entries(TELEFOONBEELDEN)) {
  const bron = path.join(PUB, src);
  if (!fs.existsSync(bron)) throw new Error(`${src} staat in telefoonbeelden.js maar niet in public/`);
  const meta = await sharp(bron).metadata();
  if (meta.width !== breedte) throw new Error(`${src} is ${meta.width} px breed, telefoonbeelden.js zegt ${breedte}`);
  const webpDoel = path.join(PUB, telefoonPad(src));
  const avifDoel = webpDoel.replace(/\.webp$/, '.avif');
  const avifBron = bron.replace(/\.webp$/, '.avif');
  vol += fs.statSync(fs.existsSync(avifBron) ? avifBron : bron).size;
  if (!OPNIEUW && fs.existsSync(webpDoel) && fs.statSync(webpDoel).mtimeMs >= fs.statSync(bron).mtimeMs) {
    klein += fs.statSync(fs.existsSync(avifDoel) ? avifDoel : webpDoel).size;
    overgeslagen++;
    continue;
  }
  const h = Math.round((KLEIN * meta.height) / meta.width);
  const png = await sharp(bron).resize(KLEIN, h, { kernel: 'lanczos3' }).png().toBuffer();
  const webp = await sharp(png).webp(WEBP).toBuffer();
  fs.writeFileSync(webpDoel, webp);
  const avif = await sharp(png).avif(AVIF(q, kleur)).toBuffer();
  if (fs.existsSync(avifBron) && avif.length >= fs.statSync(avifBron).size) console.log(`  ! ${path.basename(avifDoel)}: niet lichter dan de volle AVIF (${(fs.statSync(avifBron).size / 1024) | 0} kB); haal deze foto uit telefoonbeelden.js, anders laadt een telefoon meer`);
  fs.writeFileSync(avifDoel, avif);
  if (avif.length >= webp.length) console.log(`  = ${path.basename(avifDoel)}: ${(avif.length / 1024) | 0} kB, groter dan de webp (${(webp.length / 1024) | 0} kB); bewust, zie de kop`);
  klein += avif.length;
  gemaakt++;
  console.log(`  ${path.basename(webpDoel).padEnd(40)} ${KLEIN} × ${h}  webp ${(webp.length / 1024) | 0} kB, avif q${q} ${kleur} ${(avif.length / 1024) | 0} kB`);
}
console.log(`\n${gemaakt} gemaakt, ${overgeslagen} overgeslagen. Op een telefoon: ${(vol / 1024) | 0} kB → ${(klein / 1024) | 0} kB (voor alle ${Object.keys(TELEFOONBEELDEN).length} samen).`);
