/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE LAPTOPFOTO VAN DE OPENING IN SITE-MATEN (levering 79, 1 november 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/laptop-breed.mjs [bron.png]
 *
 * Lucas (1 november, 02:30): de laptop 21 : 9 over de hele breedte, de achtergrond exact de grond
 * van de site. De bron (kladblok/levering-79/laptop-21x9-gaten.png, 6336 × 2688) is zijn foto met een
 * doorzichtige achtergrond én doorzichtige schermen: de grond van de pagina schijnt erdoor, dus
 * die is altijd precies #F4F7FD (een gecomprimeerd grijs vlak zou 1 à 2 tinten verschuiven), en de
 * inhoud van de schermen ligt op de site onder de foto, zodat de rand van het toestel (ook de
 * inkeping van de telefoon) hem afsnijdt. Gemaakt met de ontmenging in kladblok/levering-79/LEESMIJ.md.
 * De metagegevens "Made with Google AI" (IPTC trainedAlgorithmicMedia) staan in de bron.
 *
 * Uit: public/img/hal/breed/laptop-<b>.avif en .webp, b = 960 · 1440 · 1920 · 2560 · 3200 · 3840 · 4608.
 *
 * 4608 sinds levering 87 (4 november 2026): de foto staat op 120,5 % (de arm van de telefoon valt aan de zijkant), dus
 * een scherm van 1920 met retina vraagt 1920 × 2 × 1,205 = 4627 beeldpunten. Alleen één maat maken:
 * ALLEEN=4608 node scripts/laptop-breed.mjs
 * ═══════════════════════════════════════════════════════════════════════════════ */
import sharp from 'sharp';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

export const BREED_MATEN = [960, 1440, 1920, 2560, 3200, 3840, 4608];
const bron = process.argv[2] || path.join('kladblok', 'levering-79', 'laptop-21x9-gaten.png');
const uit = path.join('public', 'img', 'hal', 'breed');
mkdirSync(uit, { recursive: true });
const meta = await sharp(bron).metadata();
for (const b of BREED_MATEN.filter((m) => !process.env.ALLEEN || String(m) === process.env.ALLEEN)) {
  const h = Math.round((b * meta.height) / meta.width);
  const basis = sharp(bron).resize(b, h, { kernel: 'lanczos3' });
  await basis.clone().webp({ quality: 82, alphaQuality: 100, effort: 6, smartSubsample: true }).toFile(path.join(uit, `laptop-${b}.webp`));
  await basis.clone().avif({ quality: 58, effort: 5, chromaSubsampling: '4:4:4' }).toFile(path.join(uit, `laptop-${b}.avif`));
  console.log(`laptop-${b} (${b} × ${h})`);
}
