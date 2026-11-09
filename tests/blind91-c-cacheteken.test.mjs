/*
 * HET CACHETEKEN TELT OOK DE STILSTAANDE FOTO — 9 november 2026 (ronde 91, C09)
 *
 * public/_headers laat /img/* zeven dagen in de browser staan. De opening van de
 * voorpagina (src/components/HalOpening80.astro) hangt daarom ?v=<teken> achter
 * zijn beelden: openingVersie() in src/data/openingStanden.js, een sha1 over de
 * inhoud. Dat teken staat ook achter de laptopfoto in public/img/hal/breed/
 * (tests/letter-77.test.mjs eist dat sinds levering 79), maar de som las alleen
 * public/img/hal/opening/. Kreeg de foto een andere inhoud, dan bleef zijn adres
 * gelijk: zeven dagen de oude foto onder de nieuwe video bij wie al eens kwam.
 *
 * Deze toets houdt vast:
 *   1 · elk beeld uit breed/ en opening/ in HalOpening80 gaat door mv() (het teken);
 *   2 · het teken verandert als een bestand in opening/ OF in breed/ een andere
 *       inhoud krijgt, en blijft gelijk als er niets verandert;
 *   3 · het echte teken telt breed/ mee.
 */
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openingVersie, OPENING_MAP } from '../src/data/openingStanden.js';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};

console.log('\nVISUAILS — het cacheteken telt ook de stilstaande foto (ronde 91, C09)\n');

console.log('1 · HalOpening80: beelden uit breed/ en opening/ gaan door mv()');
{
  const bron = readFileSync(new URL('../src/components/HalOpening80.astro', import.meta.url), 'utf8');
  ok('mv() hangt het teken van openingVersie() erachter', /const V = openingVersie\(\);/.test(bron) && /const mv = \(u: string\) => `\$\{u\}\?v=\$\{V\}`;/.test(bron), true);
  const breed = [...bron.matchAll(/(\w+)\(\s*[`'"]\/img\/hal\/breed\//g)].map((m) => m[1]);
  ok(`de laptopfoto uit breed/ staat er (${breed.length}×) en altijd via mv()`, breed.length >= 2 && breed.every((h) => h === 'mv'), true);
}

console.log('2 · het teken volgt de inhoud van beide mappen');
{
  const wortel = mkdtempSync(path.join(tmpdir(), 'cacheteken-'));
  const op = path.join(wortel, 'opening'); const br = path.join(wortel, 'breed');
  mkdirSync(path.join(op, 'f'), { recursive: true }); mkdirSync(br);
  writeFileSync(path.join(op, 'scherm.webp'), 'a'); writeFileSync(path.join(op, 'f', '017.avif'), 'b');
  writeFileSync(path.join(br, 'laptop-1920.webp'), 'c');
  const t1 = openingVersie(op, [br]);
  ok('tien tekens', /^[0-9a-f]{10}$/.test(t1), true);
  ok('zonder verandering hetzelfde teken', openingVersie(op, [br]), t1);
  writeFileSync(path.join(br, 'laptop-1920.webp'), 'c2');
  const t2 = openingVersie(op, [br]);
  ok('andere laptopfoto onder dezelfde naam (breed/): een ander teken', t2 !== t1, true);
  writeFileSync(path.join(op, 'f', '017.avif'), 'b2');
  ok('ander beeld in opening/ (submap): een ander teken', openingVersie(op, [br]) !== t2, true);
  /* een bestand dat naar de andere map verhuist, is een andere opening */
  rmSync(path.join(br, 'laptop-1920.webp')); writeFileSync(path.join(op, 'laptop-1920.webp'), 'c2');
  ok('hetzelfde bestand in een andere map: een ander teken', openingVersie(op, [br]) !== t2, true);
  rmSync(wortel, { recursive: true, force: true });
}

console.log('3 · het echte teken');
{
  const op = path.join(process.cwd(), OPENING_MAP);
  ok('openingVersie() telt breed/ mee (anders dan alleen opening/)', openingVersie() !== openingVersie(op, []), true);
  ok('en is stabiel binnen één build', openingVersie(), openingVersie());
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
