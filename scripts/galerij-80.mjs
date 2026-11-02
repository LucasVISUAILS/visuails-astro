/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE GALERIJ VAN DE VOORPAGINA (levering 80, 1 november 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/galerij-80.mjs
 *
 * Lucas (lijst 64): "In plaats van kies een look is een gallery slide beter … 2 rijen met foto's die
 * in de tegengestelde richting schuiven … Klanten kunnen op een specifieke foto klikken die ze mooi
 * vinden en worden dan naar de juiste plek geleid waar ze die style kunnen bestellen."
 *
 * 1. Zet de catalogbeelden van een eigen look (zijn map images/Before & After/Catalog Custom styles,
 *    naast de projectmap; of BRON=<map>) in site-maten: public/img/hal/rust/galerij-<naam>-<b>.
 * 2. Schrijft src/data/galerij80.json: per beeld de bronnen (breedte en pad), de maat, de stijl en de
 *    soort. Rij 1 is lifestyle (de looks uit styles.js), rij 2 catalog (een eigen look en Classic).
 * 3. Maakt per beeld de veeg: dezelfde foto horizontaal onscherp (public/img/hal/rust/veeg-<naam>.webp).
 * ═══════════════════════════════════════════════════════════════════════════════ */
import sharp from 'sharp';
import path from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { styles } from '../src/data/styles.js';

const uit = path.join('public', 'img', 'hal', 'rust');
mkdirSync(uit, { recursive: true });
const BRON = process.env.BRON || path.join('..', 'images', 'Before & After', 'Catalog Custom styles');
const EIGEN = [
  ['nonstd-hoodie-model', 'NONSTD/Hoodie/On-model.jpg', 'Model in een blauwe zip-hoodie', 'Model in a blue zip hoodie'],
  ['room84-tas-model', 'Room 84/Bag/on-model.jpg', 'Model met een blauwgroene leren tas', 'Model with a teal leather bag'],
  ['nonstd-hoodie-voor', 'NONSTD/Hoodie/Front.jpg', 'Blauwe zip-hoodie, voorkant', 'Blue zip hoodie, front'],
  ['room84-shirt-model', 'Room 84/T-shirt/On-model.jpg', 'Model in een wit T-shirt met print', 'Model in a white printed T-shirt'],
  ['nonstd-jeans-model', 'NONSTD/Pants/On-model.jpg', 'Model in een zwarte jeans met opdruk', 'Model in black printed jeans'],
  ['room84-laarzen-model', 'Room 84/Shoes/On-model.jpg', 'Zwarte leren laarzen, gedragen', 'Black leather boots, worn'],
  ['room84-tas-voor', 'Room 84/Bag/Front.jpg', 'Blauwgroene leren tas, voorkant', 'Teal leather bag, front'],
  ['nonstd-sokken-model', 'NONSTD/Socks/on-model.jpg', 'Witte sokken met logo, gedragen', 'White logo socks, worn'],
];
/* de breedtes die er van een beeld in public/ staan (webp én avif), oplopend: [[breedte, pad zonder extensie]] */
async function bronnen(p) {
  const uit = [];
  for (const s of ['-w380', '-w420', '-w760', '-w960', '-w1200', '-w1560', '']) {
    const q = `${p}${s}`;
    if (!existsSync(path.join('public', `${q}.webp`)) || !existsSync(path.join('public', `${q}.avif`))) continue;
    const { width } = await sharp(path.join('public', `${q}.webp`)).metadata();
    if (!uit.some(([w]) => w === width)) uit.push([width, q]);
  }
  return uit.sort((a, b) => a[0] - b[0]);
}

const rij2 = [];
for (const [naam, pad, nl, en] of EIGEN) {
  const bron = path.join(BRON, pad);
  const doel = (b) => path.join(uit, `galerij-${naam}-${b}`);
  let b0, h0;
  if (existsSync(bron)) {
    const meta = await sharp(bron).metadata(); b0 = meta.width; h0 = meta.height;
    for (const b of [480, 760]) {
      const h = Math.round((b * h0) / b0);
      const basis = sharp(bron).resize(b, h, { kernel: 'lanczos3' });
      await basis.clone().webp({ quality: 80, effort: 6 }).toFile(`${doel(b)}.webp`);
      await basis.clone().avif({ quality: 55, effort: 5 }).toFile(`${doel(b)}.avif`);
    }
  } else if (existsSync(`${doel(760)}.webp`)) {
    /* de bron staat niet naast deze map (een werkkopie): de beelden zijn er al, alleen de maat lezen */
    const meta = await sharp(`${doel(760)}.webp`).metadata(); b0 = meta.width; h0 = meta.height;
  } else throw new Error(`niet gevonden: ${bron}`);
  rij2.push({ src: `/img/hal/rust/galerij-${naam}`, bronnen: [[480, `/img/hal/rust/galerij-${naam}-480`], [760, `/img/hal/rust/galerij-${naam}-760`]], b: b0, h: h0, alt: { nl, en }, stijl: 'custom', soort: 'catalog' });
}
/* één catalogbeeld van Classic (het zwarte T-shirt op wit) als derde, tussen de eigen looks. Het raster
   met twaalf producten past niet in een rij van losse beelden en staat er niet in. */
{
  const src = '/img/catalog-after';
  const meta = await sharp(`public${src}.webp`).metadata();
  rij2.splice(2, 0, { src, bronnen: await bronnen(src), b: meta.width, h: meta.height, alt: { nl: 'Zwart T-shirt, catalogbeeld in de stijl Classic', en: 'Black T-shirt, catalog image in the Classic style' }, stijl: 'classic', soort: 'catalog' });
}
/* rij 1: lifestyle, de foto's uit de looks (styles.js), om en om per look */
const per = {};
for (const s of styles.filter((x) => x.slug !== 'custom')) {
  per[s.slug] = (s.grid || []).map((g) => g.photo).filter(Boolean).map((p) => p.replace(/\.webp$/, ''));
}
const rij1 = [];
for (let i = 0; rij1.length < 12 && i < 20; i++) {
  for (const [slug, lijst] of Object.entries(per)) {
    const p = lijst[i]; if (!p) continue;
    const meta = await sharp(`public${p}.webp`).metadata();
    const naam = styles.find((x) => x.slug === slug).name;
    rij1.push({ src: p, bronnen: await bronnen(p), b: meta.width, h: meta.height, alt: { nl: `Lifestylebeeld in de look ${naam}`, en: `Lifestyle image in the ${naam} look` }, stijl: slug, soort: 'lifestyle' });
    if (rij1.length >= 12) break;
  }
}

/* 3. De veeg: elk beeld horizontaal onscherp, zoals een foto van iets dat snel voorbijgaat (een rechte
   vervaging over 15 % van de breedte, alleen links-rechts). Op de site komt hij over het scherpe beeld
   naarmate de rij sneller gaat (scripts/galerij80.js). 360 px hoog: in de vaart ziet niemand het detail. */
for (const it of [...rij1, ...rij2]) {
  const naam = path.basename(it.src);
  const best = it.bronnen.filter(([w]) => w <= 1200).pop() || it.bronnen[0];
  const h = 360, b = Math.round((h * it.b) / it.h);
  const k = Math.max(9, Math.round(b * 0.15) | 1);
  const buf = await sharp(path.join('public', `${best[1]}.webp`)).resize(b, h).toBuffer();
  /* sharp wil een kern van minstens 3 rijen: alleen de middelste telt */
  const veeg = sharp(buf).convolve({ width: k, height: 3, kernel: [...new Array(k).fill(0), ...new Array(k).fill(1), ...new Array(k).fill(0)] });
  await veeg.clone().webp({ quality: 62, effort: 6 }).toFile(path.join(uit, `veeg-${naam}.webp`));
  await veeg.clone().avif({ quality: 45, effort: 5 }).toFile(path.join(uit, `veeg-${naam}.avif`));
  it.veeg = `/img/hal/rust/veeg-${naam}.webp`;
}

writeFileSync(path.join('src', 'data', 'galerij80.json'), JSON.stringify({ bron: 'scripts/galerij-80.mjs (levering 80)', rijen: [rij1, rij2] }, null, 1));
console.log('rij 1:', rij1.length, 'lifestyle · rij 2:', rij2.length, 'catalog');
