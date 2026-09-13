/* VISUAILS — een telefoonnummer, overal behalve op /contact. 11 september 2026.
 *
 *   npm run test:telefoon
 *
 * Lucas: *"Ik wil daarnaast over de gehele website telefoonnummer voor whatsapp
 * ook verplicht maken behalve bij contact, daar is alleen mail echt verplicht.
 * De klant mag wel een contact voorkeur hebben (mail of whatsapp)."*
 *
 * ── WAT HIER MIS KAN GAAN, EN DAAROM BEWAAKT WORDT ──────────────────────────
 *
 * Een verplicht veld op de site is niet hetzelfde als een verplicht veld op de
 * server, en dat verschil is precies waar dit soort eisen sneuvelt:
 *
 *   · Een formulier dat `required` kwijtraakt bij een herschrijving vraagt er
 *     niet meer om, maar de server weigert nog — de klant krijgt dan een
 *     foutpagina zonder te weten welk veld hij mist.
 *   · Een server die de controle kwijtraakt neemt bestellingen aan zonder
 *     nummer, en niemand merkt het tot de studio iemand wil bereiken.
 *   · En de UITZONDERING is het makkelijkst te verliezen van allemaal: het
 *     contactformulier post naar hetzelfde /api/order. Eén regel die de
 *     dienst niet meer uitzondert, en een vraag stellen kost ineens een
 *     telefoonnummer — de drempel die Lucas er expliciet níet wilde.
 *
 * Vandaar dat dit bestand alle drie meet, en de laatste met een echte POST.
 */
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
function ok(naam, voorwaarde, verwacht = 'true', kreeg = 'false') {
  if (voorwaarde) { pass++; console.log(` ok   ${naam}`); }
  else { fail++; console.log(` FAIL ${naam}   verwacht ${verwacht}  kreeg ${kreeg}`); }
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — telefoonnummer verplicht\n');

/* ══ 1 · ELK BESTELFORMULIER VRAAGT EROM ══════════════════════════════════ */
console.log('elk formulier dat een klant maakt, vraagt om een nummer');
{
  /* Vier formulieren, en ze staan hier met naam omdat een vijfde die er
     bijkomt hier hoort op te vallen. Het patroon is per bestand net anders
     (`data-pl-req` in de bestelstroom, `data-melding` elders), dus er wordt
     gemeten of het VELD verplicht is en niet of er een bepaald attribuut staat. */
  const formulieren = [
    ['src/components/order/OrderFlow.astro', 'het bestelformulier'],
    ['src/components/order/PlanPicker.astro', 'het abonnementsformulier'],
    ['src/components/order/HoldingPage.astro', 'de wachtpagina'],
    ['src/components/BrandModelBrief.astro', 'de merkmodelbrief'],
  ];
  for (const [pad, naam] of formulieren) {
    const bron = lees(pad);
    const veld = bron.match(/<input[^>]*name="phone"[^>]*>/);
    ok(`${naam}: heeft een telefoonveld`, !!veld, 'een <input name="phone">', 'geen');
    if (!veld) continue;
    ok(`  ${naam}: en dat veld is verplicht`, /\brequired\b/.test(veld[0]), 'required', veld[0].slice(0, 90));
    /* Een verplicht veld zonder eigen melding stuurt de klant naar de generieke
       "vul dit veld in" van de browser, en die zegt niet waaróm het er staat.
       tests/verplichte-velden.test.mjs bewaakt dit voor de hele site; hier staat
       het nog eens, omdat dit de velden zijn die vandaag verplicht werden. */
    ok(`  ${naam}: met een eigen foutmelding`,
      /data-melding=|data-pl-err-msg=/.test(veld[0]), 'een melding', 'alleen required');
  }
}

/* ══ 2 · EN /contact IS DE UITZONDERING ═══════════════════════════════════ */
console.log('\nen op /contact is alleen het mailadres verplicht');
{
  const bron = lees('src/components/ContactPage.astro');
  const mail = bron.match(/<input[^>]*name="email"[^>]*>/);
  const tel = bron.match(/<input[^>]*name="phone"[^>]*>/);
  ok('het mailadres is verplicht', !!mail && /\brequired\b/.test(mail[0]));
  /* Het veld MOET er staan: zonder nummerveld kan iemand wel "WhatsApp" als
     voorkeur aanwijzen, maar nergens zeggen wáár we hem dan bereiken. Dat was
     de stand tot vandaag. */
  ok('er is een telefoonveld', !!tel, 'een <input name="phone">', 'geen');
  ok('  maar het is niet verplicht', !!tel && !/\brequired\b/.test(tel[0]), 'optioneel', 'required');
}

/* ══ 3 · DE SERVER WEIGERT ZONDER, EN LAAT /contact DOOR ══════════════════
   Met echte POSTs, want dit is de enige laag die telt: een formulier kan zijn
   `required` verliezen zonder dat er iets stukgaat, maar deze controle is wat
   er daadwerkelijk gebeurt met wat er binnenkomt. */
console.log('\nde server weigert een bestelling zonder bruikbaar nummer');
{
  const { onRequestPost } = await import('../functions/api/order.js');

  const post = async (velden) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(velden)) fd.append(k, String(v));
    let geschreven = 0;
    const env = {
      DB: {
        prepare(sql) {
          const st = {
            bind() { if (/INSERT INTO orders/i.test(sql)) geschreven += 1; return st; },
            async first() { return null; },
            async run() { return { success: true }; },
            async all() { return { results: [] }; },
          };
          return st;
        },
      },
    };
    const res = await onRequestPost({
      request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }),
      env,
      waitUntil: () => {},
    });
    return { status: res.status, naar: res.headers.get('location') || '', geschreven };
  };

  const basis = {
    service: 'catalog', email: 'klant@merk.nl', first_name: 'Jan', last_name: 'Jansen',
    brand: 'Merk', products: '3', country: 'NL', back: '/thank-you',
    address_line1: 'Straat 1', postal_code: '1234 AB', city: 'Rotterdam',
    business_declaration: 'yes', business_version: 'v1', no_vat: '1', reg_number: '99742993',
  };

  const zonder = await post(basis);
  ok('zonder nummer gaat de bestelling niet door', /error=phone/.test(zonder.naar), 'error=phone', zonder.naar);
  ok('  en er wordt niets weggeschreven', zonder.geschreven === 0, 0, zonder.geschreven);

  /* Op inhoud en niet op aanwezigheid. Een verplicht veld waarvan de enige
     controle "niet leeg" is, levert "06" en "-" op. */
  const half = await post({ ...basis, phone: '06' });
  ok('een half nummer telt niet als nummer', /error=phone/.test(half.naar), 'error=phone', half.naar);
  const onzin = await post({ ...basis, phone: 'ja hoor' });
  ok('en tekst zonder cijfers ook niet', /error=phone/.test(onzin.naar), 'error=phone', onzin.naar);

  const met = await post({ ...basis, phone: '+31 6 12345678' });
  ok('mét een nummer komt hij er wel door', !/error=phone/.test(met.naar), 'geen phone-fout', met.naar);

  /* DE UITZONDERING, en de reden dat dit bestand bestaat. */
  const contact = await post({
    service: 'contact', email: 'iemand@ergens.nl', name: 'Iemand',
    message: 'Een vraag over jullie werk.', back: '/thank-you',
  });
  ok('en een contactbericht mag zonder nummer', !/error=phone/.test(contact.naar), 'geen phone-fout', contact.naar);
}

/* ══ 4 · DE CONTACTVOORKEUR HEEFT ÉÉN NAAM ════════════════════════════════ */
console.log('\nde contactvoorkeur heet overal hetzelfde');
{
  const { VOORKEUREN, normaliseerVoorkeur, voorkeurMet } = await import('../src/data/contactvoorkeur.js');
  ok('er zijn twee waarden', VOORKEUREN.length === 2, 2, VOORKEUREN.length);
  ok('  en dat zijn email en whatsapp',
    VOORKEUREN.join(',') === 'email,whatsapp', 'email,whatsapp', VOORKEUREN.join(','));
  ok('onzin valt terug op e-mail', normaliseerVoorkeur('Telegram') === 'email');
  ok('leeg ook', normaliseerVoorkeur('') === 'email');
  /* De regel die het verschil maakt tussen een voorkeur en een wens: WhatsApp
     zonder nummer is geen WhatsApp. */
  ok('whatsapp zonder nummer is e-mail', voorkeurMet('whatsapp', '') === 'email');
  ok('  en mét nummer blijft whatsapp', voorkeurMet('whatsapp', '+31 6 12345678') === 'whatsapp');

  /* Eén veldnaam over de hele site. Twee namen voor hetzelfde antwoord is één
     plek waar de studio op de verkeerde vergelijkt — en /contact had er tot
     vandaag een eigen (`preferred`). */
  for (const pad of ['src/components/ContactPage.astro', 'src/components/order/OrderFlow.astro',
                     'src/components/order/PlanPicker.astro']) {
    const bron = lees(pad);
    ok(`${pad.split('/').pop()}: post contact_preference`,
      /name="contact_preference"/.test(bron), 'contact_preference', 'niet gevonden');
    ok(`  en niet meer de oude naam`, !/name="preferred"/.test(bron), 'weg', 'staat er nog');
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
