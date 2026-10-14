/* ── NEPBEELDEN OP ECHTE GROOTTE VOOR DE DRUKTEPROEF — 8 oktober 2026 (punt 9.05) ──
 *
 * De drukteproef (stap 8 in kladblok/LIVE-STAPPEN.md) zet één zware bestelling
 * door de live-site: 20 producten, per product drie telefoonfoto's van 3 tot 10 MB,
 * en daarna in /admin een levering van 60 beelden in 4K. Echte klantfoto's
 * gebruiken we daar niet voor, dus maakt dit script ze: effen vlakken met ruis
 * erover, zodat JPEG ze niet kleiner kan maken dan een echte foto. Op het beeld
 * staat geen persoon en geen merk; het is grijsbruine ruis.
 *
 *   klant\     p01-voorkant.jpg … p20-detail.jpg   60 stuks, 4032 x 3024 (zoals een
 *                                                  telefoon), ongeveer 7 tot 9 MB
 *   levering\  p01-1.jpg … p20-3.jpg               60 stuks, 4096 x 5120 (4K, 4:5)
 *
 * Er worden er maar vier echt gemaakt (ruis maken is traag); de rest zijn kopieën
 * onder een andere naam. Voor de site maakt dat niets uit: hij ontvangt elk
 * bestand apart.
 *
 * Dubbelklik kladblok\drukteproef-beelden.bat. De beelden komen in
 * kladblok\drukteproef\ en gaan niet mee naar GitHub (.gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const UIT = path.join(HIER, 'drukteproef');
const PRODUCTEN = 20;
const HOEKEN = ['voorkant', 'achterkant', 'detail'];

async function ruis(breed, hoog, tint, sigma) {
  return sharp({ create: { width: breed, height: hoog, channels: 3, background: tint, noise: { type: 'gaussian', mean: 128, sigma } } })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function maakSet(map, breed, hoog, namen) {
  fs.mkdirSync(map, { recursive: true });
  const basis = [];
  for (let i = 0; i < 4; i++) {
    process.stdout.write(`  beeld ${i + 1} van 4 maken (${breed} x ${hoog})… `);
    const b = await ruis(breed, hoog, { r: 120 + i * 8, g: 112, b: 104 - i * 6 }, 34 + i * 4);
    basis.push(b);
    console.log(`${(b.length / 1048576).toFixed(1)} MB`);
  }
  let totaal = 0;
  namen.forEach((naam, i) => {
    const b = basis[i % basis.length];
    fs.writeFileSync(path.join(map, naam), b);
    totaal += b.length;
  });
  console.log(`  ${namen.length} bestanden in ${map}, samen ${(totaal / 1048576).toFixed(0)} MB\n`);
}

console.log('VISUAILS · nepbeelden voor de drukteproef\n');
const nr = (p) => `p${String(p).padStart(2, '0')}`;
const klant = [];
const levering = [];
for (let p = 1; p <= PRODUCTEN; p++) {
  for (const h of HOEKEN) klant.push(`${nr(p)}-${h}.jpg`);
  for (let k = 1; k <= 3; k++) levering.push(`${nr(p)}-${k}.jpg`);
}
console.log('Telefoonfoto\'s voor het bestelformulier:');
await maakSet(path.join(UIT, 'klant'), 4032, 3024, klant);
console.log('Beelden voor de levering in /admin:');
await maakSet(path.join(UIT, 'levering'), 4096, 5120, levering);
console.log('Klaar. Ga verder met stap 8 in kladblok\\LIVE-STAPPEN.md.');
