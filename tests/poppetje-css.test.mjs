/* Het poppetje heeft één CSS (POP_CSS in src/lib/poppetje.js) die letterlijk in
   global.css en admin.css staat — twee kopieën, omdat een inline <style> onder de
   CSP een hash zou vragen. Twee kopieën lopen uit de pas zodra iemand er één
   bewerkt; dit houdt ze gelijk. */
import { readFileSync } from 'node:fs';
import { POP_CSS } from '../src/lib/poppetje.js';
let pass = 0, fail = 0;
const ok = (n, got, want = true) => { const g = got === want; console.log(` ${g ? 'ok  ' : 'FOUT'} ${n}`); g ? pass++ : fail++; };
const norm = (s) => s.replace(/\s+/g, ' ').trim();
for (const f of ['src/styles/global.css', 'public/admin.css']) {
  ok(`${f} draagt POP_CSS letterlijk`, norm(readFileSync(f, 'utf8')).includes(norm(POP_CSS)));
}
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
