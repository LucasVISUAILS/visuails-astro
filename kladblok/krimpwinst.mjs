/* Wat levert `npm run krimpen` ECHT op? Het plan zegt hoeveel webp er nu ligt;
   dat is niet de winst, want (1) een gekrompen bestand is niet nul en (2) wat de
   browser haalt is de AVIF ernaast. Dit script krimpt naar een TIJDELIJKE map —
   public/img blijft onaangeroerd — en legt de bytes naast elkaar. */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const IMG = '/tmp/vb/public/img';
const UIT = '/tmp/krimpproef';
fs.rmSync(UIT, { recursive: true, force: true });
fs.mkdirSync(UIT, { recursive: true });

const meting = JSON.parse(fs.readFileSync('/tmp/vb/visual/beeldmaten.json', 'utf8'));
const perWebp = new Map();
for (const b of meting.beeld) {
  const webp = b.src.replace(/\.avif$/, '.webp');
  if (!webp.startsWith('/img/') || !webp.endsWith('.webp')) continue;
  const nu = perWebp.get(webp);
  if (!nu || b.getoond > nu.getoond) perWebp.set(webp, { getoond: b.getoond, nat: b.nat });
}

let webpVoor = 0, webpNa = 0, avifVoor = 0, avifNa = 0, n = 0;
for (const [webp, m] of perWebp) {
  const bron = path.join(IMG, webp.replace('/img/', ''));
  if (!fs.existsSync(bron)) continue;
  const doel = Math.min(m.nat, Math.ceil((m.getoond * 2) / 100) * 100);
  if (doel >= m.nat || m.nat / doel < 1.4) continue;
  const avifBron = bron.replace(/\.webp$/, '.avif');
  const naam = path.basename(bron);
  const wUit = path.join(UIT, naam);
  const aUit = wUit.replace(/\.webp$/, '.avif');
  await sharp(bron).resize({ width: doel }).webp({ quality: 82 }).toFile(wUit);
  await sharp(wUit).avif({ quality: 55 }).toFile(aUit);
  webpVoor += fs.statSync(bron).size;  webpNa += fs.statSync(wUit).size;
  if (fs.existsSync(avifBron)) { avifVoor += fs.statSync(avifBron).size; avifNa += fs.statSync(aUit).size; }
  n++;
}
const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
console.log(`${n} beeld(en) gekrompen naar een tijdelijke map (public/img is niet aangeraakt)\n`);
console.log(`  webp  ${mb(webpVoor)} → ${mb(webpNa)}   (${mb(webpVoor - webpNa)} eraf)`);
console.log(`  avif  ${mb(avifVoor)} → ${mb(avifNa)}   (${mb(avifVoor - avifNa)} eraf)`);
console.log(`\n  wat de bezoeker haalt is de AVIF: ${mb(avifVoor - avifNa)} minder over de hele site.`);
