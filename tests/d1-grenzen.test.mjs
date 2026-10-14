/*
 * VISUAILS — GRENZEN VAN D1 DIE node:sqlite NIET KENT. 8 oktober 2026.
 *
 * De tests draaien op node:sqlite; productie op Cloudflare D1. D1 staat
 * hoogstens VIJF delen in één UNION / INTERSECT / EXCEPT toe ("too many terms in
 * compound SELECT" vanaf zes — gemeten met de lokale D1 van wrangler). node:sqlite
 * staat er vijfhonderd toe, dus een test met een nepdatabase ziet het nooit.
 * De Nu-doen-lijst (4.05) had er acht en was in productie leeg met een foutmelding.
 *
 * Deze toets kijkt in de bron: elke query (alles vanaf een prepare( of een
 * `…_SQL =`-constante tot de volgende) heeft hoogstens vier UNION/INTERSECT/EXCEPT.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NU_DOEN_SQL_DELEN } from '../src/lib/nudoen.js';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil) => {
  const a = JSON.stringify(kreeg), b = JSON.stringify(wil);
  if (a === b) { goed++; console.log(`  ok   ${naam}`); } else { fout++; console.log(`FAIL  ${naam}\n        verwacht ${b}\n        kreeg    ${a}`); }
};
const delen = (s) => (s.match(/\b(UNION|INTERSECT|EXCEPT)\b/gi) || []).length + 1;

ok('Nu-doen: elk deel hoogstens vijf termen', NU_DOEN_SQL_DELEN.map(delen).every((n) => n <= 5), true);
ok('Nu-doen: samen nog steeds acht soorten-rijen', NU_DOEN_SQL_DELEN.map(delen).reduce((a, b) => a + b, 0), 8);

const WORTEL = fileURLToPath(new URL('..', import.meta.url));
const te = [];
const loop = (dir) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') loop(p); continue; }
    if (!/\.(js|mjs|ts)$/.test(n)) continue;
    const t = readFileSync(p, 'utf8');
    const stukken = t.split(/(?=\.prepare\(|\b[A-Z_]+_SQL\w*\s*=|`\s*SELECT\b)/);
    for (const s of stukken) {
      const zonderCommentaar = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      if (delen(zonderCommentaar) > 5) te.push(`${p.slice(WORTEL.length).replace(/\\/g, '/')}: ${delen(zonderCommentaar)} termen`);
    }
  }
};
for (const m of ['src', 'functions', 'cron']) loop(join(WORTEL, m));
ok('nergens een query met meer dan vijf termen', te, []);

console.log(`${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
