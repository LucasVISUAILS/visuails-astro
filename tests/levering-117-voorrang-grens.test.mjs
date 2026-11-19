/*
 * LEVERING 117 · P8-01 (keuze a) — VOORRANG ALLEEN ONDER DE DATUMGRENS
 * 17 november 2026
 *
 *   node tests/levering-117-voorrang-grens.test.mjs        (geen build nodig)
 *
 * Bij 10–20 producten kon je voorrang (+toeslag) én een leverdatum kiezen. Na betalen volgden
 * bedankpagina, mail en /admin alleen de datum: de klant betaalde voor "morgen 17:00". Lucas koos
 * (a): voorrang alleen onder WINDOW_THRESHOLD producten; vanaf daar is de vroegste datum de snelle
 * keuze. De server (quoteOrder) rekent hem niet meer, en het formulier (pipeline.js) toont hem niet.
 */
import { readFileSync } from 'node:fs';
import { quoteOrder } from '../src/lib/quote.js';
import { WINDOW_THRESHOLD, VOORRANG } from '../src/data/pricing.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117 P8-01: voorrang alleen onder de datumgrens\n');

const onder = WINDOW_THRESHOLD - 1;
for (const service of ['catalog', 'lifestyle']) {
  const a = quoteOrder({ service, products: onder, voorrang: true });
  ok(`${service}, ${onder} producten: voorrang wordt gerekend`, a?.voorrang === true && a.voorrangCents > 0, JSON.stringify({ v: a?.voorrang, c: a?.voorrangCents }));
  const zonder = quoteOrder({ service, products: WINDOW_THRESHOLD, voorrang: false });
  const met = quoteOrder({ service, products: WINDOW_THRESHOLD, voorrang: true });
  ok(`${service}, ${WINDOW_THRESHOLD} producten: geen voorrang`, met?.voorrang === false && met.voorrangCents === 0, JSON.stringify({ v: met?.voorrang, c: met?.voorrangCents }));
  ok(`${service}, ${WINDOW_THRESHOLD} producten: en dus geen toeslag`, met?.netCents === zonder?.netCents, `${met?.netCents} vs ${zonder?.netCents}`);
  const oud = quoteOrder({ service, products: 20, voorrang: true });
  ok(`${service}, 20 producten (de oude bovengrens): geen voorrang`, oud?.voorrang === false, JSON.stringify(oud?.voorrang));
}
/* De grens zelf staat in pricing.js, zodat /terms, /pricing en het formulier hetzelfde getal noemen. */
ok(`VOORRANG.maxProducten is WINDOW_THRESHOLD - 1 (${WINDOW_THRESHOLD - 1})`, VOORRANG.maxProducten === WINDOW_THRESHOLD - 1, String(VOORRANG.maxProducten));
for (const pad of ['src/pages/terms.astro', 'src/pages/nl/terms.astro', 'src/components/PricingHal.astro']) {
  const bron = readFileSync(new URL(`../${pad}`, import.meta.url), 'utf8');
  /* levering 119 (18 november 2026, proefronde P6-24, integrator I9): de grens komt nu via voorrangGrens() uit pricing.js
     (die leest VOORRANG.maxProducten en noemt geen clips zolang video op aanvraag is); dit pinde de directe verwijzing. */
  ok(`${pad} leest het getal uit pricing.js (VOORRANG.maxProducten of voorrangGrens())`, /VOORRANG\.maxProducten|voorrangGrens\(/.test(bron) && !/(tot|up to) 20 (producten|products)/i.test(bron));
}

const pipe = readFileSync(new URL('../src/scripts/pipeline.js', import.meta.url), 'utf8');
const sync = pipe.slice(pipe.indexOf('function syncVoorrang('), pipe.indexOf('function voorrangDagNaam('));
ok('het formulier verbergt voorrang vanaf cfg.windowThreshold', /n < drempel/.test(sync) && /cfg\.windowThreshold/.test(sync));
const flow = readFileSync(new URL('../src/components/order/OrderFlow.astro', import.meta.url), 'utf8');
ok('en OrderFlow geeft windowThreshold mee aan het formulier', /windowThreshold:\s*WINDOW_THRESHOLD/.test(flow));

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
