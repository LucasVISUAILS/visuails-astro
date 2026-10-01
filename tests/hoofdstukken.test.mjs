/*
 * VISUAILS — HOOFDSTUKKEN, GEEN LOSSE KAARTEN. 1 oktober 2026.
 *
 * Lucas: *"ik vind de blokken/kaarten achtergrond wel overzichtelijk maar het is
 * wellicht te vaak toegepast waardoor het de rust misschien blokkeert."* Hij koos
 * richting A: de kaarten blijven, maar zwart staat alleen nog tussen
 * HOOFDSTUKKEN. Een paneel met `.vervolg` hoort bij het hoofdstuk erboven. Zie de
 * noot bij `.paneel.vervolg` in src/styles/stijl22.css.
 *
 * Deze toets leest de gebouwde pagina's en telt de zwarte naden: een naad is
 * elke grens tussen twee secties (paneel of kamer) waar de tweede GEEN vervolg
 * is. Hij bewaakt drie dingen:
 *
 *   1 · geen pagina heeft meer dan vijf naden (de voorpagina had er negen);
 *   2 · een vervolg volgt altijd op een licht paneel — niet op een donkere
 *       kamer en niet op de donkere slotkaart, want dan is er niets om aan vast
 *       te zitten;
 *   3 · een kamer of slotkaart is zelf nooit een vervolg: donker IS de wissel.
 *
 * En op de voorpagina: hoofdstuk 2 is de dienstwissel (één paneel), en de oude
 * band van vier stations staat er niet meer naast.
 */
import { readFileSync, globSync } from 'node:fs';
import { buildStaat } from './lib/build.mjs';

let goed = 0, totaal = 0;
const ok = (naam, kreeg, verwacht) => {
  totaal++;
  const g = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (g) goed++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${naam.padEnd(64)} verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`);
};

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`geen bruikbare build — ${staat.uitleg}`);
  process.exit(staat.er ? 1 : 0);
}

/* De secties in volgorde, met hun klassen. Alleen paneel en kamer tellen: dat
   zijn de vlakken die op de zwarte grond liggen. */
const secties = (html) => [...html.matchAll(/<(?:section|div)\b[^>]*\bclass="([^"]*)"/g)]
  .map((m) => m[1].split(/\s+/))
  .filter((k) => k.includes('paneel') || k.includes('kamer'));

const paginas = globSync('dist/**/index.html')
  .map((p) => p.replace(/\\/g, '/'))
  .filter((p) => !/\/(account|admin|o|start|thank-you)\//.test(p));
ok('er zijn genoeg pagina’s gebouwd', paginas.length > 40, true);

const teVeel = [], losVervolg = [], donkerVervolg = [];
for (const p of paginas) {
  const s = secties(readFileSync(p, 'utf8'));
  let naden = 0;
  s.forEach((k, i) => {
    if (i === 0) return;
    const vorige = s[i - 1];
    const donker = (x) => x.includes('kamer') || x.includes('paneel-slot');
    if (k.includes('vervolg')) {
      if (donker(k)) donkerVervolg.push(p);
      if (donker(vorige)) losVervolg.push(p);
    } else naden++;
  });
  if (naden > 5) teVeel.push(`${p} (${naden})`);
}
ok('geen pagina heeft meer dan vijf zwarte naden', teVeel, []);
ok('een vervolg volgt altijd op een licht paneel', [...new Set(losVervolg)], []);
ok('donker is zelf nooit een vervolg', [...new Set(donkerVervolg)], []);

for (const pad of ['dist/index.html', 'dist/nl/index.html']) {
  const html = readFileSync(pad, 'utf8');
  const s = secties(html);
  const naden = s.filter((k, i) => i > 0 && !k.includes('vervolg')).length;
  ok(`${pad}: hoogstens vijf naden (waren er negen)`, naden <= 5, true);
  ok(`${pad}: hoofdstuk 2 is de dienstwissel`, /<section\b[^>]*class="paneel dd"/.test(html), true);
  ok(`${pad}: met drie dia’s`, (html.match(/<article\b[^>]*data-dd-dia/g) || []).length, 3);
  ok(`${pad}: en de oude band staat er niet meer`, /class="lb paneel"/.test(html), false);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
