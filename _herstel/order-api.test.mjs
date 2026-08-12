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
  const db = ({ insertThrows = false, samplesPaid = 0, samplesUnpaid = 0, readThrows = false, samplePeople = [], posterEmail = '', posterPhone = null } = {}) => {
    let stored = false;
    const inserted = [];
    return {
      _inserted: inserted,
      prepare(sql) {
        const st = {
          _a: [],
          bind(...a) { st._a = a; return st; },
          async first() {
            return sql.includes('SELECT id FROM orders WHERE ref') && stored ? { id: 42 } : null;
          },
          async run() {
            if (sql.includes('INSERT INTO orders')) {
              inserted.push('orders');
              if (insertThrows) throw new Error('D1_ERROR: database is locked');
              stored = true;
            }
            return { success: true };
          },
          /* De rijen voor "één proefvisual per bedrijf".
           *
           * Deze nep-database LEEST de query in plaats van hem te negeren, en dat is
           * met opzet: zou hij altijd dezelfde rijen teruggeven, dan zou het weghalen
           * van `payment_status = 'paid'` uit de echte query geen enkele test rood
           * maken. Nu komt een onbetaalde proef alleen terug als dat filter ontbreekt
           * — precies de mutatie die we willen zien.
           *
           * Sinds 11 augustus 2026 komen er ADRESSEN en NUMMERS terug in plaats van
           * een telling: de controle normaliseert nu zelf en vergelijkt in JS, dus
           * een stub die alleen een getal teruggeeft zou de hele normalisatie
           * ongetest laten. `samplePeople` zet wie er al een proef gehad heeft.
           *
           * `readThrows` bootst een onleesbare D1 na: die moet OPEN vallen. */
          async all() {
            if (sql.includes("service = 'test-sample'")) {
              if (readThrows) throw new Error('D1_ERROR: no such table');
              const onlyPaid = sql.includes("payment_status = 'paid'");
              const rows = [];
              const fill = (n, who) => { for (let i = 0; i < n; i++) rows.push(who(i)); };
              if (samplePeople.length) rows.push(...samplePeople);
              else {
                fill(samplesPaid, () => ({ email: posterEmail, phone: posterPhone || null }));
                if (!onlyPaid) fill(samplesUnpaid, () => ({ email: posterEmail, phone: posterPhone || null }));
              }
              /* Een onbetaalde proef mag alleen meetellen als het filter weg is; met
                 samplePeople staat de betaalstatus in de rij zelf. */
              const keep = onlyPaid ? rows.filter((r) => r.paid !== false) : rows;
              return { results: keep };
            }
            return { results: [] };
          },
        };
        return st;
      },
    };
  };

  let lastDb = null;
  const post = async (fields, opts) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    seen = [];
    /* Het geposte adres gaat mee naar de nep-database: `samplesPaid: 1` betekent
       "deze persoon heeft er al een gehad", en dat kan de stub alleen weten als
       hij weet wie er post. Vóór 11 aug 2026 gaf hij een telling terug en deed de
       identiteit er niet toe; nu vergelijkt de controle echte adressen. */
    lastDb = db({ ...(opts || {}), posterEmail: fields.email, posterPhone: fields.phone });
    const res = await onRequestPost({
      request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }),
      env: {
        DB: lastDb,
        // Vorm-gecontroleerd door src/lib/mollie.js: een korte sleutel wordt daar
        // geweigerd vóór er ooit een verzoek uitgaat, en dan meet deze test niets.
        MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123',
        RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@visuails.com',
        FROM_EMAIL: 'VISUAILS <orders@visuails.com>',
      },
      waitUntil: () => {},
    });
    return {
      status: res?.status ?? 0,
      location: res?.headers?.get?.('Location') || '',
      ordersWritten: lastDb._inserted.length,
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

  /*
   * ── ÉÉN PROEFVISUAL PER BEDRIJF ─────────────────────────────────────────────
   *
   * De belofte staat in de voorwaarden, op /pricing, op de homepage en in
   * TEST_SAMPLE.unit. Tot 11 augustus 2026 dwong niets hem af.
   *
   * Drie toestanden, en ze moeten uit elkaar blijven: nog geen proef gehad (door),
   * al een BETAALDE proef gehad (weigeren, en géén rij in orders achterlaten), en
   * een database die niet te lezen is (door — zie de noot bij de controle over
   * waarom dit open faalt en niet dicht).
   */
  console.log('\néén proefvisual per bedrijf');
  const sample = { service: 'test-sample', email: 'klant@merk.nl', name: 'Jan', brand: 'Merk', back: '/thank-you' };

  const first = await post(sample, { samplesPaid: 0 });
  ok('de eerste proef gaat door', first.payments, 1);
  ok('en wordt weggeschreven', first.ordersWritten, 1);

  const second = await post(sample, { samplesPaid: 1 });
  ok('de tweede wordt geweigerd', second.payments, 0);
  /* Zonder deze regel zou de weigering ook groen zijn als hij ná het wegschrijven
   * kwam — dan staat er een halve bestelling in de database die niemand opruimt. */
  ok('en laat geen bestelling achter', second.ordersWritten, 0);
  ok('de klant gaat terug met een leesbare reden',
    second.location.includes('error=sample-used'), true, second.location);

  /* Wie het formulier invulde en bij Mollie de tab sloot heeft niets gekregen.
   * Zonder deze regel zou het weghalen van het paid-filter onopgemerkt blijven, en
   * dan raakt iedereen die één keer afhaakt zijn proef kwijt — een fout die vaker
   * voorkomt dan het misbruik dat de controle afvangt. */
  const abandoned = await post(sample, { samplesPaid: 0, samplesUnpaid: 2 });
  ok('een afgebroken proef telt niet mee', abandoned.payments, 1);

  const unreadable = await post(sample, { readThrows: true });
  ok('een onleesbare database weigert niemand', unreadable.payments, 1);

  /*
   * ── HET GAT VAN VIJF SECONDEN ──────────────────────────────────────────────
   *
   * `lower(email)` was de hele controle, en `lucas+2@merk.nl` komt aan in dezelfde
   * inbox als `lucas@merk.nl`. Dat is geen fraudetruc maar een standaardfunctie,
   * en het maakte de klep zo lek als een mandje zonder dat iemand een tweede
   * account hoefde aan te maken. Zonder deze regel kan de normalisatie er zo weer
   * uit zonder dat er iets rood wordt.
   */
  const plussed = await post(
    { ...sample, email: 'klant+2@merk.nl' },
    { samplePeople: [{ email: 'klant@merk.nl', phone: null }] });
  ok('plus-adressering is dezelfde inbox', plussed.payments, 0);

  const dotted = await post(
    { ...sample, email: 'k.l.a.n.t@gmail.com' },
    { samplePeople: [{ email: 'klant@gmail.com', phone: null }] });
  ok('gmail negeert puntjes, dus wij ook', dotted.payments, 0);

  /* En de andere kant op, die minstens zo belangrijk is: buiten Gmail zijn puntjes
   * WEL betekenisvol. `jan.smit@` en `jansmit@` bij een bedrijfsdomein zijn twee
   * collega's, en de tweede onterecht weigeren kost een klant op het eerste scherm
   * dat hij ziet. Bij twijfel doorlaten. */
  const colleague = await post(
    { ...sample, email: 'jansmit@merk.nl' },
    { samplePeople: [{ email: 'jan.smit@merk.nl', phone: null }] });
  ok('buiten gmail blijven puntjes betekenisvol', colleague.payments, 1);

  /*
   * ── HET TELEFOONNUMMER ALS TWEEDE HERKENNINGSPUNT ──────────────────────────
   *
   * Een tweede mailadres is gratis; een tweede telefoonnummer niet. Wie een nieuw
   * adres pakt maar zijn eigen nummer invult, wordt hier alsnog herkend — en de
   * drie schrijfwijzen van hetzelfde Nederlandse nummer moeten daarbij op één
   * hoop vallen.
   */
  const samePhone = await post(
    { ...sample, email: 'heelanders@ander.nl', phone: '+31 6 12 34 56 78' },
    { samplePeople: [{ email: 'klant@merk.nl', phone: '06-12345678' }] });
  ok('zelfde nummer, ander adres: herkend', samePhone.payments, 0);

  /*
   * En de fout die deze controle KAN maken als hij slordig is, want die is erger
   * dan de misgelopen proef: twee bestellingen zonder telefoonnummer hebben allebei
   * een leeg genormaliseerd nummer, en leeg is gelijk aan leeg. Zonder de
   * uitdrukkelijke `!!wantPhone` in de controle weigert de tweede klant die zijn
   * nummer niet invult ALLE volgende klanten die dat ook niet doen.
   */
  const noPhones = await post(
    { ...sample, email: 'nieuw@ander.nl' },
    { samplePeople: [{ email: 'klant@merk.nl', phone: null }] });
  ok('twee lege nummers zijn niet dezelfde persoon', noPhones.payments, 1);

  const shortPhone = await post(
    { ...sample, email: 'nieuw2@ander.nl', phone: '06' },
    { samplePeople: [{ email: 'klant@merk.nl', phone: '06' }] });
  ok('een half nummer matcht op niemand', shortPhone.payments, 1);

  /* En de weigering geldt ALLEEN voor de proefvisual: een gewone bestelling van
   * dezelfde klant mag altijd, hoeveel proeven hij ook gehad heeft. */
  const paidOrder = await post({ ...base, email: sample.email }, { samplesPaid: 3 });
  ok('een gewone bestelling raakt hem niet', paidOrder.payments, 1);

  globalThis.fetch = realFetch;
}

/*
 * ── DE WEIGERING MOET AAN DE ANDERE KANT OOK AANKOMEN ───────────────────────
 *
 * De controle hierboven bewijst dat de server weigert. Dat is de helft: hij stuurt
 * de bezoeker terug met `?error=sample-used`, en als niets die code opvangt landt
 * die op een formulier dat er onveranderd uitziet, zonder één woord uitleg. Zo
 * stond `?error=email` er trouwens al vanaf de bouw van dit formulier in — naar
 * een pagina die hem nergens las.
 *
 * Dit is een tekstcontrole en geen browsercontrole, met opzet: het gedrag zelf is
 * met Playwright tegen de echte opmaak nagelopen (beide talen, tonen, focus, en
 * het opschonen van het adres), maar dát vraagt een browser en hoort daarom niet
 * in `npm test`. Wat hier moet worden vastgehouden is goedkoper en breekt eerder:
 * de drie namen aan weerszijden moeten dezelfde blijven. Hernoemt iemand er één,
 * dan gaat deze sectie rood in plaats van de melding stilletjes te laten
 * verdwijnen.
 */
console.log('\nen de bezoeker krijgt te zien waarom');
{
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const api = read('../functions/api/order.js');
  const wiring = read('../src/scripts/interactions.js');
  const pages = { en: read('../src/pages/test-sample.astro'), nl: read('../src/pages/nl/test-sample.astro') };

  ok('de server stuurt error=sample-used mee', api.includes("'error=sample-used'"));
  ok('initFormRefusal leest data-form-refusal', /data-form-refusal="\$\{code\}"/.test(wiring));
  ok('en wordt vanuit init() aangeroepen', /^\s*initFormRefusal\(\);/m.test(wiring));

  for (const [lang, src] of Object.entries(pages)) {
    ok(`${lang}: er is een blok voor sample-used`, src.includes('data-form-refusal="sample-used"'));
    ok(`${lang}: en een voor email`, src.includes('data-form-refusal="email"'));
    /* Zonder `hidden` staat de melding er bij ieder bezoek — een bezoeker die
     * nooit geweigerd is leest dan dat hij zijn proef al gehad heeft. */
    ok(`${lang}: allebei verborgen tot ze nodig zijn`,
      (src.match(/data-form-refusal="[a-z-]+"[^>]*\shidden/g) || []).length, 2);
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
