// Ronde 9, stap 9 — klikbare schetsen voor B3 (keuzehulp), B4 (prijscalculator)
// en C1 (startlijstje in Studio). Niets hiervan is gebouwd in de site.
//
// Alle bedragen komen uit src/data/pricing.js: dit script leest ze en zet ze als
// JSON in de schets. Verandert een prijs, draai dit dan opnieuw:
//   node kladblok/_r9-schetsen.mjs
import fs from 'node:fs';
import * as P from '../src/data/pricing.js';
import { planName } from '../src/data/planNames.js';

const data = {
  ladder: { catalog: P.LADDER.catalog, lifestyle: P.LADDER.lifestyle },
  extra: P.EXTRA_PHOTO_LADDER,
  maxExtra: P.MAX_EXTRA_PER_PRODUCT,
  hoog: P.HOOG_PER_PRODUCT,
  voorrang: { deel: P.VOORRANG.deel, bodem: P.VOORRANG.bodem, plafond: P.VOORRANG.plafond, max: P.VOORRANG.maxProducten },
  btw: P.VAT_RATE,
  plannen: Object.fromEntries(Object.keys(P.PLAN_AMOUNT).map((k) => [k, { naam: planName(k, 'nl'), bedrag: P.PLAN_AMOUNT[k], credits: P.PLAN_CREDITS[k] }])),
  credits: { catalog: P.SERVICE_CREDITS.catalog, lifestyle: P.SERVICE_CREDITS.lifestyle },
  fotos: { catalog: 4, lifestyle: 3 },
};
const sjabloon = fs.readFileSync(new URL('./_r9-schetsen.sjabloon.html', import.meta.url), 'utf8');
const uit = sjabloon.replace('/*PRIJZEN*/null', JSON.stringify(data));
fs.mkdirSync(new URL('./ronde-9/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./ronde-9/concept-schetsen.html', import.meta.url), uit);
console.log('kladblok/ronde-9/concept-schetsen.html', JSON.stringify(data).length, 'tekens prijsdata');
