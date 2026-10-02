import sharp from 'sharp';
import fs from 'node:fs';
const src = fs.readFileSync('src/data/models.js', 'utf8');
for (const m of src.matchAll(/photo: '([^']+)'/g)) {
  const p = 'public' + m[1];
  for (const w of [160, 380]) {
    const out = p.replace(/\.webp$/, `-w${w}.webp`);
    if (fs.existsSync(out)) continue;
    await sharp(p).resize({ width: w }).webp({ quality: 72 }).toFile(out);
    console.log('nieuw', out, fs.statSync(out).size);
  }
}
