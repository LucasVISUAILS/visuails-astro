/*
 * VISUAILS — de vingerafdruk van wat er op de laptopschermen staat (15 oktober 2026).
 *
 * scripts/laptop-standen.mjs schrijft hem na het fotograferen naar
 * src/data/halStanden.bron.json; tests/laptop-standen.test.mjs rekent hem opnieuw
 * uit. Verschillen ze, dan is er iets aan de schermen veranderd sinds de foto's
 * gemaakt zijn, en zou de site oude standen tonen.
 *
 * Wat meetelt: de bron van de schermen (HalLaptopSchermen.astro), de reeks
 * (laptopSlides.js), de maten (halLaptop.js), de regels voor de schermen in hal.css
 * (alleen die: de rest van hal.css verandert vaak en staat niet op de foto) en de
 * PIXELS van elk beeld dat op een scherm staat. Tekst zonder \r, zodat Windows
 * (CRLF) en Linux dezelfde afdruk geven.
 *
 * DE PIXELS EN NIET DE BYTES (15 oktober 2026): in Lucas' map dragen de beelden een
 * C2PA-handtekening die er bij mij niet in zit. Zelfde beeld, 5,8 kB meer bytes,
 * dus een andere afdruk, en de toets zou bij hem altijd "veranderd" zeggen.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const tekst = (p) => fs.readFileSync(p, 'utf8').replace(/\r/g, '');

/** De regels uit hal.css die de schermen opmaken (.sc…, .hl-scherm, .hl-laag). */
export function schermRegels(css) {
  return css.replace(/\r/g, '').split('\n').filter((r) => /\.(sc|sc-[a-z-]+|hl-scherm[a-z-]*|hl-laag)\b/.test(r) && !/^\s*(\/\*|\*)/.test(r)).join('\n');
}

/** Alle beelden die op een scherm staan, als pad onder public/. */
export function schermBeelden(wortel) {
  const bron = tekst(path.join(wortel, 'src', 'data', 'laptopSlides.js')) + tekst(path.join(wortel, 'src', 'components', 'HalLaptopSchermen.astro'));
  const paden = new Set([...bron.matchAll(/['"`](\/img\/[a-z0-9/_.-]+\.(?:webp|png|jpe?g|avif))['"`]/gi)].map((m) => m[1]));
  for (const vast of ['/img/hal/laptop-2304.webp', '/img/hal/masker-laptop.png', '/img/hal/masker-fon.png']) paden.add(vast);
  return [...paden].sort();
}

export async function vingerafdruk(wortel) {
  const h = crypto.createHash('sha256');
  for (const p of ['src/components/HalLaptopSchermen.astro', 'src/data/laptopSlides.js', 'src/data/halLaptop.js']) h.update(`${p}\n${tekst(path.join(wortel, p))}\n`);
  h.update(schermRegels(fs.readFileSync(path.join(wortel, 'src', 'styles', 'hal.css'), 'utf8')));
  for (const p of schermBeelden(wortel)) {
    const vol = path.join(wortel, 'public', p.slice(1));
    h.update(p);
    if (!fs.existsSync(vol)) { h.update('ontbreekt'); continue; }
    const { data, info } = await sharp(vol).raw().toBuffer({ resolveWithObject: true });
    h.update(`${info.width}x${info.height}x${info.channels}`); h.update(data);
  }
  return h.digest('hex').slice(0, 16);
}

export const BRON_JSON = path.join('src', 'data', 'halStanden.bron.json');
