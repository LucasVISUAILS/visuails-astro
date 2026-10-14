/* ── WAT ER ONTBREEKT, PER PRODUCT — 8 oktober 2026 (punt 2.05) ──
   Eén functie voor vijf plekken; deze toets legt de drie antwoorden vast:
   onbekend (null), niets ([]) en een lijst. */
import { ontbrekendeFotos, ontbrekendRegels, aantalOntbrekend } from '../src/lib/ontbreekt.js';

let fout = 0, ok = 0;
function is(naam, kreeg, wil) {
  const a = JSON.stringify(kreeg), b = JSON.stringify(wil);
  if (a === b) { ok++; } else { fout++; console.error(`✗ ${naam}\n  kreeg ${a}\n  wilde ${b}`); }
}
const f = (product_key, shot) => ({ kind: 'upload', product_key, shot });

is('geen uploads = onbekend', ontbrekendeFotos({ productCount: 2, details: {}, files: [] }), null);
is('upload zonder product = onbekend', ontbrekendeFotos({ productCount: 1, details: {}, files: [f(null, null)] }), null);
is('leveringen tellen niet', ontbrekendeFotos({ productCount: 1, details: {}, files: [{ kind: 'delivery', product_key: null }] }), null);
is('alles binnen = lege lijst', ontbrekendeFotos({ productCount: 1, details: {}, files: [f('p1', 'front'), f('p1', 'back'), f('p1', 'detail')] }), []);
is('draagfoto is nooit ontbrekend', ontbrekendeFotos({ productCount: 1, details: {}, files: [f('p1', 'front'), f('p1', 'back'), f('p1', 'detail')] }).length, 0);
const lijst = ontbrekendeFotos({
  productCount: 3,
  details: { product_p2: '  Hoodie zwart ' },
  files: [f('p1', 'front'), f('p1', 'back'), f('p1', 'detail'), f('p2', 'front'), f('p3', 'front'), f('p3', 'back'), f('p3', 'worn')],
});
is('lijst', lijst, [
  { key: 'p2', index: 2, naam: 'Hoodie zwart', mist: ['back', 'detail'] },
  { key: 'p3', index: 3, naam: '', mist: ['detail'] },
]);
is('regels nl', ontbrekendRegels(lijst, 'nl'), ['p2 Hoodie zwart: geen achterkant, geen detail', 'p3: geen detail']);
is('regels en', ontbrekendRegels(lijst, 'en'), ['p2 Hoodie zwart: no back, no detail', 'p3: no detail']);
is('aantal', aantalOntbrekend(lijst), 3);
is('regels bij onbekend', ontbrekendRegels(null), []);

console.log(`ontbreekt: ${ok}/${ok + fout} geslaagd`);
if (fout) process.exit(1);
