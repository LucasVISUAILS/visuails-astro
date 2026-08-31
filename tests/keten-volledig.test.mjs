/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DRAAIT `npm test` ALLES WAT ER IN tests/ LIGT?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT ER IS ────────────────────────────────────────────────────────
 *
 * Een toets die nergens wordt aangeroepen, faalt nergens. Dat is in deze map al
 * drie keer gebeurd:
 *
 *   · tests/model-checks.test.mjs stond drie weken buiten de keten met een
 *     kapotte import. Zie de kop van dat bestand.
 *   · tests/cookie-consent.test.mjs — 28 controles op een juridische kant van de
 *     site — had geen script en draaide daarom nooit mee.
 *   · tests/debug-mollie-reading.test.mjs, idem.
 *
 * Alle drie zijn los gevonden, door er toevallig naar te kijken. Dat is geen
 * methode. Deze toets stelt de vraag één keer per run, voor alle bestanden
 * tegelijk.
 *
 * ── EN OOK DE ANDERE KANT OP ────────────────────────────────────────────────
 *
 * Een script dat naar een bestand wijst dat niet bestaat, breekt de hele keten
 * af bij de eerste run na een hernoeming — met een ERR_MODULE_NOT_FOUND in
 * plaats van een testuitslag. Dus: elk bestand in een script bestaat, en elk
 * bestand in de map zit in een script dat in de keten staat.
 *
 * ── EN DAT DE KETEN MET BOUWEN BEGINT ───────────────────────────────────────
 *
 * 30 augustus 2026, 20:12. `npm test` gaf bij Lucas zes rode regels over een
 * ankerblok dat op /plans zou ontbreken. Het stond er gewoon; zijn dist/ was van
 * zeven uur eerder. Zeventien suites in deze map lezen uit dist/, en dat is dus
 * zeventien keer dezelfde kans op een rood kruis over een bestand dat niemand
 * meer publiceert. Sindsdien is `test:bouw` de eerste schakel. Die eis staat
 * hier vast, want een schakel die je per ongeluk weghaalt merk je pas op de dag
 * dat je een echte fout niet gelooft.
 */

import { readFileSync, readdirSync } from 'node:fs';

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

const wortel = new URL('../', import.meta.url);
const pakket = JSON.parse(readFileSync(new URL('package.json', wortel), 'utf8'));
const scripts = pakket.scripts || {};

/* De schakels van `npm test`, in volgorde. */
const keten = [...(scripts.test || '').matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1]);

console.log(`de keten telt ${keten.length} schakels`);
ok('er staan er meer dan tachtig in', keten.length > 80, true);
ok('en de eerste bouwt', keten[0], 'test:bouw');
ok('en die bouwt echt', /astro build/.test(scripts['test:bouw'] || ''), true);
ok('elke schakel bestaat als script', keten.filter((k) => !scripts[k]), []);

/* Welke testbestanden roept de keten aan? Uit de scripts zelf gelezen, want dat
   is waar `npm test` ze ook vandaan haalt. */
const aangeroepen = new Set();
for (const schakel of keten) {
  for (const m of (scripts[schakel] || '').matchAll(/tests\/([\w.-]+\.mjs)/g)) aangeroepen.add(m[1]);
}

console.log('\nelk bestand dat een script noemt, bestaat ook');
const opSchijf = new Set(readdirSync(new URL('tests/', wortel)).filter((f) => f.endsWith('.mjs')));
ok('geen script wijst naar een verdwenen bestand', [...aangeroepen].filter((f) => !opSchijf.has(f)).sort(), []);

console.log('\nen elk testbestand staat in de keten');
/* `*.test.mjs` en niet alles: lib-static-server.mjs en drive-start.mjs zijn
   hulpstukken die door een toets worden geïmporteerd en niet zelf een toets. */
const toetsen = [...opSchijf].filter((f) => f.endsWith('.test.mjs')).sort();
console.log(`     ${toetsen.length} toetsbestanden in tests/`);
ok('geen enkele staat er buiten', toetsen.filter((f) => !aangeroepen.has(f)), []);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
