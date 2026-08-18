/*
 * `npm run placeholders` — wat er nog aan beeld ontbreekt.
 *
 * Leest de GEBOUWDE site en niet de bron: een placeholder die in een component
 * staat maar op geen enkele pagina rendert, is geen ontbrekend beeld. Dezelfde
 * redenering als bij de sitemap — wat in dist/ staat, is wat er is.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
if (!fs.existsSync(DIST)) {
  console.error('dist/ ontbreekt — draai eerst `npx astro build`.');
  process.exit(1);
}

const gevonden = [];
const loop = (dir) => {
  for (const naam of fs.readdirSync(dir)) {
    const p = path.join(dir, naam);
    if (fs.statSync(p).isDirectory()) { loop(p); continue; }
    if (!naam.endsWith('.html')) continue;
    const html = fs.readFileSync(p, 'utf8');
    for (const m of html.matchAll(/data-placeholder="(photo|video)"[^>]*data-subject="([^"]*)"/g)) {
      gevonden.push({ pagina: p.slice(DIST.length), soort: m[1], onderwerp: m[2] });
    }
  }
};
loop(DIST);

if (!gevonden.length) {
  console.log('Geen open plekken — al het beeld staat er.');
  process.exit(0);
}

/* Per ONDERWERP en niet per pagina: hetzelfde beeld op de Engelse en de
   Nederlandse pagina is één foto die gemaakt moet worden, geen twee. */
const perOnderwerp = new Map();
for (const g of gevonden) {
  const sleutel = `${g.soort} · ${g.onderwerp}`;
  if (!perOnderwerp.has(sleutel)) perOnderwerp.set(sleutel, []);
  perOnderwerp.get(sleutel).push(g.pagina);
}

console.log(`\n${perOnderwerp.size} beeld(en) te maken, op ${gevonden.length} plek(ken):\n`);
for (const [sleutel, paginas] of [...perOnderwerp].sort()) {
  console.log(`  ${sleutel}`);
  console.log(`    ${paginas.join(', ')}`);
}
console.log('');
