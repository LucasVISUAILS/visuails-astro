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
  /* `orderId &&` staat sinds 11 augustus 2026 vóór `quote` in deze poort — zie de
   * noot daar en de sectie onderaan dit bestand. De uitdrukking hieronder laat dat
   * toe zonder het los te laten: de bewaker zelf wordt verderop apart vastgelegd,
   * zodat het wegvallen ervan een eigen rode regel oplevert en niet stilletjes in
   * deze ene ontleding verdwijnt. */
  const gate = /if \((?:orderId && )?quote && ([A-Za-z_.]+)\([^)]*\) && env\.MOLLIE_API_KEY/.exec(src);
  ok('de betaalpoort roept een functie aan', Boolean(gate), true, gate);
  ok('en dat is isPayableService', gate?.[1], 'isPayableService');
  /* Zonder commentaar, anders vindt deze check de uitleg die er twee regels boven de
   * poort staat en die het patroon juist bij naam noemt. */
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok('PAYABLE_SERVICES.has(svc) staat nergens meer in de code', /PAYABLE_SERVICES\.has\(svc\)/.test(codeOnly), false);
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BETAALLINK, TEGEN DE ECHTE onRequestPost — 11 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Alles hierboven leest de broncode of losse functies. Dat is precies waardoor de
 * twee fouten hieronder maandenlang groen konden staan: het duurste pad van de
 * site — het pad dat geld aanmaakt — werd nooit uitgevoerd.
 *
 * Deze sectie roept `onRequestPost` wél aan, met een nagebootste D1 en een
 * onderschepte `fetch`, en stelt precies één ding vast: WANNEER er een Mollie-
 * betaling wordt aangemaakt. Niet hoe de mail eruitziet, niet welke SQL er langs
 * komt — alleen of er geld in beweging komt, want dat is het enige wat achteraf
 * niet meer terug te draaien is zonder iemand terug te betalen.
 *
 * Twee toestanden waarin dat tot vandaag verkeerd ging:
 *
 * 1 · DE BESTELLING IS NIET WEGGESCHREVEN. De INSERT zit in safe(), dus een
 *     overbelaste D1 of een timeout wordt weggelogd en `orderId` blijft null. De
 *     poort keek daar niet naar en maakte gewoon een betaling. De klant betaalde,
 *     de webhook vond de `ref` niet, gaf 200 terug (dus Mollie stopte met opnieuw
 *     aanbieden) en logde naar een console zonder logbewaring. Geld binnen, geen
 *     bestelling, geen factuur, geen melding.
 *
 * 2 · HET PRODUCTAANTAL IS ONBEKEND. /start biedt "Meer dan 30 producten" aan als
 *     laatste optie; de tekst zelf is de waarde. countOf() maakt daar null van, en
 *     clamp() in quote.js tilde null naar de ondergrens — één product. Een klant
 *     die om 35 producten vroeg kreeg een knop om € 180,29 te betalen.
 *
 * BEIDE GEVALLEN ZIJN GECONTROLEERD OP HUN EIGEN MUTATIE: met `orderId &&` weer
 * uit de poort, en met de oude clamp weer in quote.js, gaat de teller van 0 naar 1
 * en wordt deze sectie rood. Een test die alleen "0 betalingen" ziet zou ook groen
 * staan als onRequestPost stilletjes stopte vóór de poort — vandaar de eerste
 * regel: het gezonde geval MOET er één aanmaken.
 */
console.log('\nwanneer er een betaling wordt aangemaakt (echte onRequestPost)');
{
  const { onRequestPost } = await import('../functions/api/order.js');

  const realFetch = globalThis.fetch;
  let seen = [];
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), body: init?.body ? String(init.body) : '' });
    if (String(url).includes('mollie')) {
      return new Response(
        JSON.stringify({ id: 'tr_TEST', _links: { checkout: { href: 'https://pay.mollie.test/tr_TEST' } } }),
        { status: 201, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ id: 'msg_test' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  /* Genoeg D1 om deze route te laten lopen. `insertThrows` bootst na wat safe()
   * in het echt opvangt: een INSERT die faalt om een reden die niets met een
   * ontbrekende kolom te maken heeft. De SELECT erna geeft dan geen rij, precies
   * zoals in productie. */
  const db = ({ insertThrows = false } = {}) => {
    let stored = false;
    return {
      prepare(sql) {
        const st = {
          _a: [],
          bind(...a) { st._a = a; return st; },
          async first() { return sql.includes('SELECT id FROM orders WHERE ref') && stored ? { id: 42 } : null; },
          async run() {
            if (sql.includes('INSERT INTO orders')) {
              if (insertThrows) throw new Error('D1_ERROR: database is locked');
              stored = true;
            }
            return { success: true };
          },
          async all() { return { results: [] }; },
        };
        return st;
      },
    };
  };

  const post = async (fields, opts) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    seen = [];
    await onRequestPost({
      request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }),
      env: {
        DB: db(opts),
        // Vorm-gecontroleerd door src/lib/mollie.js: een korte sleutel wordt daar
        // geweigerd vóór er ooit een verzoek uitgaat, en dan meet deze test niets.
        MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123',
        RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@visuails.com',
        FROM_EMAIL: 'VISUAILS <orders@visuails.com>',
      },
      waitUntil: () => {},
    });
    return {
      payments: seen.filter((c) => c.url.includes('mollie')).length,
      subjects: seen.filter((c) => c.url.includes('resend'))
        .map((c) => { try { return JSON.parse(c.body).subject; } catch { return ''; } }),
    };
  };

  const base = {
    service: 'drop', email: 'klant@merk.nl', name: 'Jan Jansen',
    brand: 'Merk', products: '12', country: 'NL', back: '/thank-you',
  };

  const healthy = await post(base);
  ok('een gezonde bestelling krijgt één betaling', healthy.payments, 1);

  const lost = await post(base, { insertThrows: true });
  ok('een bestelling die niet is weggeschreven krijgt er geen', lost.payments, 0);
  ok('en de studio krijgt daar een alarm over',
    lost.subjects.some((s) => s.startsWith('!! Bestelling niet weggeschreven')), true, lost.subjects);

  const vague = await post({ ...base, products: 'Meer dan 30 producten' });
  ok('een onbekend productaantal krijgt er geen', vague.payments, 0);
  /* De klant hoort nog steeds iets — de bestelling is niet stukgegaan, hij is
   * alleen niet zelf af te rekenen. Zonder deze regel zou "0 betalingen" ook waar
   * zijn als de hele route halverwege was afgebroken. */
  ok('maar krijgt wel gewoon een bevestiging',
    vague.subjects.some((s) => s.includes("We've got your request")), true, vague.subjects);

  globalThis.fetch = realFetch;
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
