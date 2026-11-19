/* VISUAILS — levering 117 (17 november 2026), proefronde P9-01: de voorwaarden volgen de vlag ABO_EXTRA_ZICHTBAAR.
 *
 *   node tests/levering-117-tekst-voorwaarden.test.mjs     (geen build nodig: leest de bron)
 *
 * De voorwaarden beloofden bijkopen (pakketten met korting) en overstappen naar een abonnement op maat, terwijl
 * Studio, /plans, de FAQ en de plankeuze sinds 9 november alleen "Bespreek met ons" tonen (src/data/aboZichtbaar.js).
 * Lucas koos (a): bijkopen blijft dicht en de voorwaarden zeggen zolang "in overleg, via Bespreek met ons".
 * Wat hier bewaakt wordt, in /terms en /nl/terms:
 *   1 · de vlag wordt gelezen uit aboZichtbaar.js (één vlag voor alle plekken), en staat vandaag uit;
 *   2 · de bijkoopalinea met bijkoopRegel() (pakketten en korting) staat alleen in de tak waar de vlag aan staat;
 *       de andere tak zegt "in overleg, via {BESPREEK}" / "in consultation, via {BESPREEK}";
 *   3 · het abonnement op maat in §4 en in "Overstappen" staat ook alleen in de tak waar de vlag aan staat;
 *   4 · BESPREEK is de knoptekst uit aboZichtbaar.js ("Bespreek met ons" / "Talk to us").
 */
import { readFileSync } from 'node:fs';
import { ABO_EXTRA_ZICHTBAAR, bespreekAbo } from '../src/data/aboZichtbaar.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const code = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

ok('de vlag staat vandaag uit (bijkopen blijft dicht)', ABO_EXTRA_ZICHTBAAR === false);
ok('de knop heet "Bespreek met ons" / "Talk to us"', bespreekAbo('nl').knop === 'Bespreek met ons' && bespreekAbo('en').knop === 'Talk to us');

for (const [p, l] of [['src/pages/nl/terms.astro', 'nl'], ['src/pages/terms.astro', 'en']]) {
  console.log(`\n${p}`);
  const c = code(lees(p));
  ok('leest ABO_EXTRA_ZICHTBAAR en bespreekAbo uit aboZichtbaar.js', /import \{ ABO_EXTRA_ZICHTBAAR, bespreekAbo \} from '[./]+\/data\/aboZichtbaar\.js';/.test(c));
  ok(`  BESPREEK = bespreekAbo('${l}').knop`, new RegExp(`const BESPREEK = bespreekAbo\\('${l}'\\)\\.knop;`).test(c));
  /* de bijkoopalinea: alleen in de tak "vlag aan" */
  const tak = c.match(/\{ABO_EXTRA_ZICHTBAAR\s*\?\s*(<p><strong>(?:Extra credits bijkopen|Buying extra credits)[\s\S]*?<\/p>)\s*:\s*(<p>[\s\S]*?<\/p>)\}/);
  ok('de bijkoopalinea staat achter de vlag', !!tak);
  ok('  bijkoopRegel() (pakketten en korting) alleen in de tak "aan"', !!tak && /bijkoopRegel\(/.test(tak[1]) && !/bijkoopRegel\(/.test(tak[2]));
  ok('  bijkoopRegel() komt verder nergens voor', (c.match(/bijkoopRegel\(/g) || []).length === 1);
  ok(`  de tak "uit" zegt ${l === 'nl' ? '"in overleg, via {BESPREEK}"' : '"in consultation, via {BESPREEK}"'}`, !!tak && (l === 'nl' ? /in overleg af, via \{BESPREEK\}/ : /in consultation, via \{BESPREEK\}/).test(tak[2]));
  /* het abonnement op maat: in §4 en in Overstappen alleen met de vlag aan */
  const maatPrijs = c.match(/\{ABO_EXTRA_ZICHTBAAR \? <>, plus (?:het|the) \{planName\('maat'/);
  ok('§4: het abonnement op maat met zijn prijs alleen als de vlag aan staat', !!maatPrijs && (c.match(/maatVanaf, '(nl|en)'\)/g) || []).length === 1);
  ok('§4: anders "in overleg, via {BESPREEK}"', (l === 'nl' ? /\{!ABO_EXTRA_ZICHTBAAR && <> Een ander aantal credits per maand spreken we in overleg af, via \{BESPREEK\}\.<\/>\}/ : /\{!ABO_EXTRA_ZICHTBAAR && <> A different number of credits per month is agreed in consultation, via \{BESPREEK\}\.<\/>\}/).test(c));
  ok('Overstappen: "op maat" alleen als de vlag aan staat', (l === 'nl' ? /\{ABO_EXTRA_ZICHTBAAR \? ', ook naar een abonnement op maat' : ''\}/ : /\{ABO_EXTRA_ZICHTBAAR \? ', including a plan made to measure' : ''\}/).test(c)
    && !(l === 'nl' ? /ander abonnement, ook naar een abonnement op maat\./ : /another plan in VISUAILS Studio, including a plan made to measure\./).test(c));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
