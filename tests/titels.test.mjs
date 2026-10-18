/**
 * De paginatitels in één vorm — levering 58, 17 oktober 2026 (afvinklijst 37, b-titels).
 * "Overal Onderwerp | VISUAILS, ook in het Nederlands." Leest elke gebouwde pagina in dist/
 * (dus na npm run build). Layout.astro zet "X — VISUAILS" en "VISUAILS — X" om.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(WORTEL, 'dist');
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) pass++; else fail++; console.log(`${c ? ' ok  ' : ' FAIL'} ${n}${c || !x ? '' : ` — ${x}`}`); };

function paginas(map) {
  const uit = [];
  for (const e of fs.readdirSync(map, { withFileTypes: true })) {
    const vol = path.join(map, e.name);
    if (e.isDirectory()) { if (!['_astro', 'img', 'fonts', 'server'].includes(e.name)) uit.push(...paginas(vol)); }
    else if (e.name === 'index.html') uit.push(vol);
  }
  return uit;
}
if (!fs.existsSync(DIST)) { console.log('dist/ ontbreekt: eerst npm run build'); process.exit(1); }
const lijst = paginas(DIST);
const fout = [];
for (const f of lijst) {
  const html = fs.readFileSync(f, 'utf8');
  const m = /<title>([\s\S]*?)<\/title>/.exec(html);
  if (!m) continue;
  const t = m[1].trim();
  if (!/ \| VISUAILS$/.test(t) || / — VISUAILS/.test(t) || /^VISUAILS — /.test(t)) fout.push(`${path.relative(DIST, f)}: ${t}`);
  const og = /<meta property="og:title" content="([^"]*)"/.exec(html);
  if (og && og[1].trim() !== t) fout.push(`${path.relative(DIST, f)}: og:title wijkt af`);
}
ok(`alle ${lijst.length} pagina's: "Onderwerp | VISUAILS", ook og:title`, fout.length === 0, fout.slice(0, 6).join(' · '));
const contact = fs.readFileSync(path.join(DIST, 'contact', 'index.html'), 'utf8');
ok('"VISUAILS — Contact us" wordt "Contact us | VISUAILS"', /<title>Contact us \| VISUAILS<\/title>/.test(contact));
const start = fs.readFileSync(path.join(DIST, 'nl', 'start', 'index.html'), 'utf8');
ok('een Nederlandse pagina doet mee', / \| VISUAILS<\/title>/.test(start) && !/— VISUAILS<\/title>/.test(start));
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
