/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BESTELROUTE — TWEE FOUTEN DIE ZICHZELF NIET MELDEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Beide zijn op 10 augustus 2026 gevonden bij een doorzoeking van de hele site, en
 * beide waren onzichtbaar in gebruik: de een geeft geen foutmelding maar een
 * ontbrekende knop, de ander geeft geen foutmelding maar een verkeerde bestemming.
 *
 * 1 · DE BETAALLINK VOOR DE DUURSTE DEUR. `PAYABLE_SERVICES.has(svc)` met svc='drop'.
 *     ORDER_SERVICES kent 'drop' (de wire-waarde die de attended-deur post en die zo in
 *     orders.service staat), PAYABLE_SERVICES alleen de laddernaam 'complete'. Dus geen
 *     betaallink in de bevestigingsmail van een bestelling van € 2.359,50. Dit was de
 *     DERDE keer dat die val dichtklapte — quote.js:96-108 beschrijft de tweede en
 *     exporteert sindsdien isPayableService() juist hiervoor. Een test die alleen de
 *     functie controleert had de derde keer niet gezien; daarom kijkt de laatste check
 *     hieronder naar het aanroeppunt zelf.
 *
 * 2 · safeRedirect LIET EEN BACKSLASH DOOR. `/\evil.com/thank-you` begint met één
 *     schuine streep, niet met twee, en bevat 'thank-you' — dus kwam hij er door. Een
 *     browser leest die backslash bij een https-URL als een schuine streep en landt op
 *     evil.com. Dezelfde waarde gaat mee in de successUrl naar Mollie, dus ook de
 *     terugkeer ná betaling.
 */
import { readFileSync } from 'node:fs';
import { safeRedirect } from '../functions/api/order.js';
import { isPayableService, PAYABLE_SERVICES } from '../src/lib/quote.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(58)}${good ? '' : `expected ${JSON.stringify(want)} got ${JSON.stringify(shown ?? got)}`}`);
}

console.log('\nVISUAILS — de bestelroute\n');

console.log('welke diensten te betalen zijn');
ok("'drop' is te betalen — het is 'complete' onder een andere naam", isPayableService('drop'));
ok('de verzameling alléén weet dat niet', PAYABLE_SERVICES.has('drop'), false);
ok("'catalog' blijft gewoon te betalen", isPayableService('catalog'));
ok("'lifestyle' ook", isPayableService('lifestyle'));
ok("het testexemplaar niet — dat heeft zijn eigen pad", isPayableService('test-sample'), false);
ok("'video' niet", isPayableService('video'), false);
ok('onbekend niet', isPayableService('bestaat-niet'), false);
ok('leeg valt niet om', isPayableService(''), false);
ok('undefined ook niet', isPayableService(undefined), false);

console.log('\nwaar de klant na het bestellen heen gaat');
ok('een gewoon pad blijft', safeRedirect('/thank-you', 'nl'), '/thank-you');
ok('met queryreeks blijft', safeRedirect('/nl/thank-you?ref=VIS-A', 'nl'), '/nl/thank-you?ref=VIS-A');
ok('met anker blijft', safeRedirect('/start/thank-you#top', 'nl'), '/start/thank-you#top');
/* De vier die eerder door de deur kwamen of hadden kunnen komen. */
ok('een backslash gaat niet naar buiten', safeRedirect('/\\evil.com/thank-you', 'nl'), '/nl/thank-you');
ok('twee backslashes ook niet', safeRedirect('\\\\evil.com/thank-you', 'nl'), '/nl/thank-you');
ok('protocol-relatief niet', safeRedirect('//evil.com/thank-you', 'nl'), '/nl/thank-you');
ok('een volledige URL niet', safeRedirect('https://evil.com/thank-you', 'nl'), '/nl/thank-you');
ok('een andere host op onze eigen naam niet', safeRedirect('https://evil.com/nl/thank-you', 'en'), '/thank-you');
ok('javascript: niet', safeRedirect('javascript:alert(1)//thank-you', 'nl'), '/nl/thank-you');
ok('een pad zonder thank-you niet', safeRedirect('/admin', 'nl'), '/nl/thank-you');
ok('en ../ brengt je niet ergens anders', safeRedirect('/thank-you/../admin', 'nl'), '/nl/thank-you');
ok('leeg valt terug op de taal', safeRedirect('', 'en'), '/thank-you');
ok('null valt terug', safeRedirect(null, 'nl'), '/nl/thank-you');
ok('een getal valt terug', safeRedirect(42, 'nl'), '/nl/thank-you');

/*
 * DE BEWAKER OP HET AANROEPPUNT. De twee checks hierboven op isPayableService() stonden
 * er al vóór deze bug, en ze waren groen — want de functie was niet stuk, het
 * aanroeppunt gebruikte hem niet. Dit is de enige check die de derde herhaling ziet.
 */
console.log('\nen het aanroeppunt gebruikt de functie, niet de verzameling');
{
  const src = readFileSync(new URL('../functions/api/order.js', import.meta.url), 'utf8');
  const gate = /if \(quote && ([A-Za-z_.]+)\([^)]*\) && env\.MOLLIE_API_KEY/.exec(src);
  ok('de betaalpoort roept een functie aan', Boolean(gate), true, gate);
  ok('en dat is isPayableService', gate?.[1], 'isPayableService');
  /* Zonder commentaar, anders vindt deze check de uitleg die er twee regels boven de
   * poort staat en die het patroon juist bij naam noemt. */
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok('PAYABLE_SERVICES.has(svc) staat nergens meer in de code', /PAYABLE_SERVICES\.has\(svc\)/.test(codeOnly), false);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
