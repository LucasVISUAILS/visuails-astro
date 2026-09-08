/* Haalt hele functies uit src/lib/account.js: `node kladblok/snoei.mjs naam1 naam2 …`.
   Een functie loopt van `[async ]function naam(` op kolom 0 tot de eerstvolgende
   regel die precies `}` is; het commentaarblok dat er zonder witregel boven staat
   gaat mee. Daarna: welke van de weggehaalde namen komen nog voor. */
import fs from 'node:fs';
const P = 'src/lib/account.js';
let lines = fs.readFileSync(P, 'utf8').split('\n');
const namen = process.argv.slice(2);
let weg = 0;
for (const naam of namen) {
  const re = new RegExp(`^(async )?function ${naam}\\(`);
  const i = lines.findIndex((l) => re.test(l));
  if (i < 0) { console.log(`?? ${naam} niet gevonden`); continue; }
  let j = i; while (j < lines.length && lines[j] !== '}') j++;
  let k = i; while (k > 0 && lines[k - 1].trim() !== '' && /^(\/\*|\s\*|\*\/|\/\/)/.test(lines[k - 1])) k--;
  // een losse `/** … */` op één regel of blok — ook mee, mits aansluitend (zit in de regel hierboven)
  const n = j - k + 1;
  lines.splice(k, n);
  // dubbele witregels die overblijven
  if (k > 0 && lines[k - 1].trim() === '' && (lines[k] || '').trim() === '') lines.splice(k, 1);
  weg += n;
  console.log(`− ${naam}: ${n} regels`);
}
fs.writeFileSync(P, lines.join('\n'));
const rest = fs.readFileSync(P, 'utf8');
for (const naam of namen) {
  const m = [...rest.matchAll(new RegExp(`\\b${naam}\\(`, 'g'))];
  if (m.length) console.log(`  ! ${naam}( komt nog ${m.length}× voor`);
}
console.log(`totaal ${weg} regels weg; nu ${lines.length} regels`);
