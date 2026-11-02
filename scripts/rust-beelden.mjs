/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE UITGEKNIPTE MODELLEN EN PRODUCTEN IN SITE-MATEN (levering 80, 1 november 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/rust-beelden.mjs
 *
 * Lucas (1 november, 17:05): "sommige beelden uit te knippen (schaduw wanneer aanwezig altijd
 * behouden), de objecten/personen uit te knippen en clean in de website te verwerken." Uit zijn map
 * images/Before & After/Catalog Custom styles (NON/STD), uitgeknipt met scripts/uitknippen.py; de
 * bronnen (png met dekking en schaduw) staan in kladblok/levering-80/uitgeknipt/.
 *
 * Uit: public/img/hal/rust/<naam>-<b>.avif en .webp. De dekking blijft volledig (alphaQuality 100),
 * zodat de grond van de pagina er overal precies door schijnt.
 * ═══════════════════════════════════════════════════════════════════════════════ */
import sharp from 'sharp';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

export const RUST_BEELDEN = {
  'hoodie-model': [560, 840, 1120],
  'jeans-model': [480, 720, 960],
  hoodie: [480, 720, 960],
  jeans: [480, 720, 960],
  sokken: [480, 720, 960],
};
const bron = path.join('kladblok', 'levering-80', 'uitgeknipt');
const uit = path.join('public', 'img', 'hal', 'rust');
mkdirSync(uit, { recursive: true });
for (const [naam, maten] of Object.entries(RUST_BEELDEN)) {
  const p = path.join(bron, `${naam}.png`);
  const meta = await sharp(p).metadata();
  for (const b of maten) {
    const h = Math.round((b * meta.height) / meta.width);
    const basis = sharp(p).resize(b, h, { kernel: 'lanczos3' });
    await basis.clone().webp({ quality: 82, alphaQuality: 100, effort: 6, smartSubsample: true }).toFile(path.join(uit, `${naam}-${b}.webp`));
    await basis.clone().avif({ quality: 58, effort: 5, chromaSubsampling: '4:4:4' }).toFile(path.join(uit, `${naam}-${b}.avif`));
  }
  console.log(naam, meta.width, '×', meta.height, '→', maten.join(' · '));
}
