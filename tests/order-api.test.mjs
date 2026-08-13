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

  /*
   * ── HET ZAKELIJKE BEWIJS HOORT IN DE FIXTURE — 12 AUGUSTUS 2026 ────────────
   *
   * VISUAILS levert uitsluitend zakelijk (zie src/data/business.js), en sinds die
   * datum krijgt een bestelling zonder dat bewijs geen betaallink: de poort
   * hieronder in order.js leest `!review.needsReview` naast vatReview.payableNow.
   *
   * Deze fixture heette "healthy" en had geen van beide velden -- dat was tot
   * vandaag een complete bestelling en is het nu niet meer. De velden staan er dus
   * bij, want een fixture die niet lijkt op wat het formulier post, toetst de code
   * tegen een wereld die niet bestaat. Dezelfde les als bij vatRate in
   * tests/invoice-pdf.test.mjs en bij total_cents in tests/account-invoices.test.mjs.
   *
   * `reg_number` en niet `vat`: dit is een Nederlandse klant, en een Nederlandse
   * eenmanszaak laat het btw-veld routineus leeg terwijl hij altijd een KVK-nummer
   * heeft. Dat is precies het geval waarvoor het veld bestaat.
   */
  const base = {
    service: 'drop', email: 'klant@merk.nl', name: 'Jan Jansen',
    brand: 'Merk', products: '12', country: 'NL', back: '/thank-you',
    business_declaration: 'yes', business_version: 'business-v1-2026-08',
    no_vat: '1', reg_number: '99742993',
  };

  const healthy = await post(base);
  ok('een gezonde bestelling krijgt één betaling', healthy.payments, 1);

  /* En de andere kant, want dat is wat de nieuwe poort eigenlijk doet: zonder de
     verklaring gaat er geen geld lopen. De bestelling zelf gaat NIET verloren --
     die staat er, met de reden op de beoordelingslijst. */
  const geenVerklaring = await post({ ...base, business_declaration: '' });
  ok('zonder de zakelijke verklaring geen betaallink', geenVerklaring.payments, 0);
  ok('maar de bestelling is wel weggeschreven', geenVerklaring.ordersWritten > 0, true);

  const geenBewijs = await post({ ...base, reg_number: '' });
  ok('en zonder enig bewijs ook geen betaallink', geenBewijs.payments, 0);
  ok('ook dan staat de bestelling er', geenBewijs.ordersWritten > 0, true);

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

  /*
   * ── OOK EEN PROEFVISUAL VAN € 1 MAG NIET ZONDER RIJ BETAALD WORDEN ─────────
   *
   * De grote betaalpoort kreeg `orderId &&` op 11 augustus; dit pad op 12 augustus, en
   * het is dezelfde fout: de webhook zoekt óók een proefbetaling op `ref`, vindt niets,
   * en geeft 200 terug — dus stopt Mollie met opnieuw aanbieden en is de euro binnen
   * zonder bestelling. Erger nog: de klep tegen een tweede proef hangt aan de
   * betaler-hash die de webhook op die rij schrijft, dus zonder rij ontbreekt de poging
   * in de telling en is de volgende poging weer de eerste.
   */
  const lostSample = await post(sample, { insertThrows: true });
  ok('een proefvisual zonder rij krijgt geen betaling', lostSample.payments, 0);
  ok('en de studio hoort er wel van',
    lostSample.subjects.some((s) => s.startsWith('!! Bestelling niet weggeschreven')), true, lostSample.subjects);

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

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE RATELIMIET OP /api/order — 12 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * functions/api/upload.js heeft er sinds dag één een; deze route niet, en dit is de
 * duurdere van de twee: elke POST hier maakt een bestelling, twee Resend-mails en soms
 * een Mollie-betaling. Eén script vervuilt daarmee de capaciteitstelling waarop de agenda
 * draait en verbrandt het Resend-quotum, en dan krijgt een echte klant geen bevestiging.
 *
 * Twee dingen worden hier vastgehouden, en de tweede is de belangrijkste:
 *
 * 1 · BOVEN DE LIMIET WORDT ER NIETS GESCHREVEN. Niet "geweigerd maar wel opgeslagen",
 *     niet "geweigerd na de mail" — een 429 en verder niets. Zou de limiet ná de INSERT
 *     staan, dan is hij een sierstuk: de kosten zijn dan al gemaakt.
 *
 * 2 · EEN KAPOTTE LIMIETER WEIGERT NIEMAND. checkRate() valt met opzet OPEN (zie de noot
 *     bij de catch daar): een stuk tabel `rate_limits` mag geen echte klant buitensluiten.
 *     Zonder deze regel kan iemand dat later "dichtzetten omdat dat veiliger klinkt", en
 *     dan sluit een lege database de hele bestelroute af.
 *
 * De 429 draagt een retry-after. Zonder die kop is het een weigering zonder afspraak, en
 * dan probeert een cliënt het meteen opnieuw — precies het verkeer dat de limiet dempt.
 */
console.log('\nen er is een ratelimiet op de bestelroute');
{
  const { onRequestPost } = await import('../functions/api/order.js');
  const realFetch = globalThis.fetch;
  let calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    if (String(url).includes('mollie')) {
      return new Response(
        JSON.stringify({ id: 'tr_R', _links: { checkout: { href: 'https://pay.mollie.test/tr_R' } } }),
        { status: 201, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ id: 'msg' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  /* `hits` is wat de upsert in rate_limits teruggeeft; `bucketThrows` bootst een
     ontbrekende of onleesbare tabel na. Verder net genoeg D1 om de route te laten lopen. */
  const db = ({ hits = 1, bucketThrows = false } = {}) => {
    const inserted = [];
    let stored = false;
    return {
      _inserted: inserted,
      prepare(sql) {
        const st = {
          bind() { return st; },
          async first() {
            if (sql.includes('rate_limits')) {
              if (bucketThrows) throw new Error('D1_ERROR: no such table: rate_limits');
              return { hits };
            }
            return sql.includes('SELECT id FROM orders WHERE ref') && stored ? { id: 7 } : null;
          },
          async run() {
            if (sql.includes('INSERT INTO orders')) { inserted.push('orders'); stored = true; }
            return { success: true };
          },
          async all() { return { results: [] }; },
        };
        return st;
      },
    };
  };

  const post = async (opts, fields = {}) => {
    const fd = new FormData();
    /* Compleet, inclusief het zakelijke bewijs -- zie de noot bij `base` hierboven.
       Deze sectie gaat over de snelheidslimiet en niet over de uitsluiting, dus
       moet elke bestelling hier wél door de zakelijke poort komen; anders meet
       "geen betaling" straks het verkeerde ding. */
    const all = { service: 'drop', email: 'klant@merk.nl', name: 'Jan Jansen',
      brand: 'Merk', products: '12', country: 'NL', back: '/thank-you',
      business_declaration: 'yes', business_version: 'business-v1-2026-08',
      no_vat: '1', reg_number: '99742993', ...fields };
    for (const [k, v] of Object.entries(all)) fd.append(k, v);
    calls = [];
    const d = db(opts);
    const res = await onRequestPost({
      request: new Request('https://visuails.com/api/order', {
        method: 'POST', body: fd, headers: { 'CF-Connecting-IP': '203.0.113.9' },
      }),
      env: {
        DB: d,
        MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123',
        RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@visuails.com',
        FROM_EMAIL: 'VISUAILS <orders@visuails.com>',
      },
      waitUntil: () => {},
    });
    return {
      status: res?.status ?? 0,
      retryAfter: res?.headers?.get?.('retry-after') || '',
      body: res?.status === 429 && res.headers.get('content-type')?.includes('json')
        ? await res.clone().json() : null,
      ordersWritten: d._inserted.length,
      payments: calls.filter((u) => u.includes('mollie')).length,
      mails: calls.filter((u) => u.includes('resend')).length,
    };
  };

  const atLimit = await post({ hits: 10 });
  ok('de tiende bestelling binnen tien minuten mag nog', atLimit.payments, 1);
  ok('en wordt weggeschreven', atLimit.ordersWritten, 1);

  const over = await post({ hits: 11 });
  ok('de elfde krijgt 429', over.status, 429);
  ok('en er wordt niets weggeschreven', over.ordersWritten, 0);
  ok('en er gaat geen betaling uit', over.payments, 0);
  ok('en er gaat geen mail uit', over.mails, 0);
  ok('met een retry-after erop', Number(over.retryAfter) > 0, true, over.retryAfter);

  const overJson = await post({ hits: 40 }, { mode: 'json' });
  ok('de pijplijn krijgt dezelfde weigering als json', overJson.status, 429);
  ok('met een code die hij kan lezen', overJson.body?.error, 'rate');
  ok('en ook daar de retry-after', Number(overJson.retryAfter) > 0, true, overJson.retryAfter);

  /* De regel die het belangrijkst is om vast te houden. */
  const broken = await post({ bucketThrows: true });
  ok('een kapotte limieter weigert niemand', broken.payments, 1);
  ok('en de bestelling gaat gewoon door', broken.ordersWritten, 1);

  globalThis.fetch = realFetch;
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
