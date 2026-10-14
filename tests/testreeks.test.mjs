/**
 * scripts/testreeks.mjs (punt 9.11, 8 oktober 2026): dezelfde keten als `npm test`,
 * een paar tegelijk. Deze test houdt vast dat het DEZELFDE keten is — niets
 * overgeslagen, niets dubbel — en dat een fout een fout blijft.
 *
 *   npm run test:testreeks
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { keten, testreeks, hoeveelTegelijk } from '../scripts/testreeks.mjs';

let goed = 0, totaal = 0;
function ok(naam, kreeg, wil = true) {
  totaal++;
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) goed++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${naam}${g ? '' : `  verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const ECHT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ECHT, 'package.json'), 'utf8'));
const k = keten(pkg);

console.log('\nde keten van npm test, in de testreeks');
const bestandenIn = (lijst) => lijst.flatMap((s) => [...s.opdracht.matchAll(/tests\/[\w.-]+\.test\.mjs/g)].map((m) => m[0]));
const inNpmTest = new Set(String(pkg.scripts.test).split('&&').map((d) => d.trim().replace(/^npm run /, ''))
  .flatMap((n) => [...String(pkg.scripts[n] || '').matchAll(/tests\/[\w.-]+\.test\.mjs/g)].map((m) => m[0])));
ok('de build is de eerste stap', [k[0].naam, k[0].opdracht], ['test:bouw', 'astro build']);
ok('elk testbestand uit npm test zit erin', [...inNpmTest].filter((f) => !bestandenIn(k).includes(f)), []);
ok('… en geen enkel bestand twee keer', bestandenIn(k).length, new Set(bestandenIn(k)).size);
ok('elk testbestand in tests/ zit in de keten', fs.readdirSync(path.join(ECHT, 'tests')).filter((f) => f.endsWith('.test.mjs'))
  .map((f) => `tests/${f}`).filter((f) => !inNpmTest.has(f)), []);
ok('een schakel die alleen herhaalt wat er al was, valt weg', keten({ scripts: {
  test: 'npm run test:a && npm run test:b && npm run test:a', 'test:a': 'node a.mjs && node b.mjs', 'test:b': 'node b.mjs',
} }).map((s) => s.naam), ['test:a']);
let fout = '';
try { keten({ scripts: { test: 'npm run test:weg' } }); } catch (e) { fout = e.message; }
ok('een schakel die niet bestaat, is een fout', fout.includes('test:weg'), true);
ok('hoeveel tegelijk: hoogstens vier, of wat TESTREEKS_TEGELIJK zegt', [hoeveelTegelijk({}) <= 4, hoeveelTegelijk({ TESTREEKS_TEGELIJK: '1' })], [true, 1]);

console.log('\nde testreeks met nep-tests');
const w = fs.mkdtempSync(path.join(os.tmpdir(), 'testreeks-'));
fs.writeFileSync(path.join(w, 'package.json'), JSON.stringify({ scripts: {
  test: 'npm run test:bouw && npm run test:a && npm run test:wiebel && npm run test:rood && npm run test:b',
  'test:bouw': 'bouw', 'test:a': 'a', 'test:wiebel': 'wiebel', 'test:rood': 'rood', 'test:b': 'b',
} }));
const gedraaid = [];
let wiebelKeer = 0;
const nepRun = async (opdracht) => {
  gedraaid.push(opdracht);
  if (opdracht === 'rood') return { code: 1, uit: 'FAIL het bedrag klopt niet', ms: 5 };
  if (opdracht === 'wiebel') return { code: wiebelKeer++ === 0 ? 1 : 0, uit: '', ms: 5 };
  return { code: 0, uit: '', ms: 5 };
};
const regels = [];
const r = await testreeks({ wortel: w, tegelijk: 3, zeg: (s) => regels.push(s), run: nepRun });
ok('de build eerst', gedraaid[0], 'bouw');
ok('een echte fout blijft rood; een wiebelende test telt na een losse poging als groen', [r.goed, r.rood, r.wiebel], [false, ['test:rood'], ['test:wiebel']]);
ok('de rode test draait twee keer (de tweede keer alleen)', gedraaid.filter((x) => x === 'rood').length, 2);
ok('de laatste regel noemt de rode test (UITROLLEN.bat leest die)', regels.at(-1).trim(), 'FOUT: test:rood');
ok('elke stap één regel "n/totaal goed|FOUT naam"', regels.filter((x) => /^\s*\d+\/5\s+(goed|FOUT)\s+test:/.test(x)).length, 5);

gedraaid.length = 0;
const r2 = await testreeks({ wortel: w, tegelijk: 3, zeg: () => {}, run: async (o) => { gedraaid.push(o); return { code: o === 'bouw' ? 1 : 0, uit: 'build kapot', ms: 1 }; } });
ok('faalt de build, dan draait de rest niet', [r2.goed, r2.rood, gedraaid], [false, ['test:bouw'], ['bouw']]);
fs.rmSync(w, { recursive: true, force: true });

ok('UITROLLEN.bat draait deze reeks', fs.readFileSync(path.join(ECHT, 'scripts/uitrol.mjs'), 'utf8').includes("path.join('scripts', 'testreeks.mjs')"), true);
ok('npm run test:reeks bestaat', pkg.scripts['test:reeks'], 'node scripts/testreeks.mjs');

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
