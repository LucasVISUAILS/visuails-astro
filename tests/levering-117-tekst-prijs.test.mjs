/* VISUAILS — levering 117 (17 november 2026), proefronde P3-01: het rekenvoorbeeld op /compare en /pricing.
 *
 *   node tests/levering-117-tekst-prijs.test.mjs      (geen build nodig: leest de bron en rekent met pricing.js)
 *
 * /compare en /pricing toonden "30 producten €1.200" als één bestelling. Het formulier stopt bij FORM_MAX_PRODUCTS
 * (20); daarboven alleen WhatsApp. Sanne ontdekte dat pas in het formulier. Lucas koos (a): het voorbeeld op 20
 * producten = €800, uit pricing.js en niet getypt. Wat hier bewaakt wordt:
 *   1 · 20 catalogsets kosten €800 (quote), en dat is het grootste aantal dat het formulier aanneemt;
 *   2 · /compare, /nl/compare en CompareHal rekenen met FORM_MAX_PRODUCTS, niet met een getypt getal;
 *   3 · PricingHal: het grootste uitgerekende voorbeeld is FORM_MAX_PRODUCTS en geen enkel voorbeeld ligt erboven;
 *   4 · "één product of dertig" / "one product or thirty" staat er niet meer.
 */
import { readFileSync } from 'node:fs';
import { quote, euro, FORM_MAX_PRODUCTS, tierFor, WINDOW_THRESHOLD } from '../src/data/pricing.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/* zonder commentaar: de uitleg noemt de oude 30 met opzet */
const code = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\n1 · het voorbeeld zelf');
const q = quote('catalog', FORM_MAX_PRODUCTS);
ok('het formulier stopt bij 20', FORM_MAX_PRODUCTS === 20, String(FORM_MAX_PRODUCTS));
ok('20 catalogsets kosten €800 (quote, excl. btw)', q.net === 800, String(q.net));
ok('  zo afgedrukt: "€800" (NL en EN)', euro(q.net, 'nl') === '€800' && euro(q.net, 'en') === '€800', `${euro(q.net, 'nl')} / ${euro(q.net, 'en')}`);
ok('  en 20 ligt nog boven WINDOW_THRESHOLD, dus de servicebeloften op /compare blijven gelijk', FORM_MAX_PRODUCTS >= WINDOW_THRESHOLD && tierFor(FORM_MAX_PRODUCTS) === tierFor(30));

console.log('\n2 · /compare rekent met het plafond van het formulier');
for (const p of ['src/pages/compare.astro', 'src/pages/nl/compare.astro', 'src/components/CompareHal.astro']) {
  const c = code(lees(p));
  ok(`${p}: ANCHOR_PRODUCTS = FORM_MAX_PRODUCTS`, /const ANCHOR_PRODUCTS = FORM_MAX_PRODUCTS;/.test(c));
  ok(`${p}:   en FORM_MAX_PRODUCTS komt uit pricing.js`, /import \{[^}]*FORM_MAX_PRODUCTS[^}]*\} from '[./]+\/data\/pricing\.js'/.test(c));
  ok(`${p}:   geen getypt ankeraantal meer`, !/ANCHOR_PRODUCTS = \d+/.test(c));
}

console.log('\n3 · /pricing: de uitgerekende voorbeelden');
{
  const c = code(lees('src/components/PricingHal.astro'));
  const m = c.match(/const WORKED = \[([^\]]*)\];/);
  ok('PricingHal heeft WORKED', !!m);
  const delen = m ? m[1].split(',').map((x) => x.trim()) : [];
  ok('  het laatste voorbeeld is FORM_MAX_PRODUCTS', delen[delen.length - 1] === 'FORM_MAX_PRODUCTS', m && m[1]);
  const getallen = delen.filter((x) => /^\d+$/.test(x)).map(Number);
  ok('  en geen getypt voorbeeld ligt boven het formulier', getallen.every((n) => n <= FORM_MAX_PRODUCTS), getallen.join(','));
  ok('  FORM_MAX_PRODUCTS is geïmporteerd', /import \{[\s\S]*?FORM_MAX_PRODUCTS[\s\S]*?\} from '\.\.\/data\/pricing\.js'/.test(c));
}

console.log('\n4 · geen "dertig" naast een formulier dat bij twintig stopt');
{
  const c = code(lees('src/components/CompareHal.astro'));
  ok('CompareHal: niet meer "one product or thirty"', !/one product or thirty/.test(c));
  ok('CompareHal: niet meer "één product of dertig"', !/één product of dertig/.test(c));
  ok('  wel "or twenty" / "of twintig"', /one product or twenty/.test(c) && /één product of twintig/.test(c));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
