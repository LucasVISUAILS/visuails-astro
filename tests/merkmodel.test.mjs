/* VISUAILS — het merkmodel als product.  npm run test:merkmodel
 *
 * ── WAT HIER GETOETST WORDT, EN WAAROM UITGEREKEND DIT ──────────────────────
 *
 * Op 23 augustus 2026 is het merkmodel van een briefing een BESTELLING geworden:
 * één bedrag, één keer, met een afrekenstap eronder. Daarmee raakt het drie
 * dingen tegelijk die elders in dit project al een keer geld hebben gekost:
 *
 *   1 · EEN DIENSTNAAM DIE TWEE VERZAMELINGEN MOET HALEN. quote.js kent
 *       PAYABLE_SERVICES (uit de ladder te prijzen) en isPayableService (mag een
 *       betaallink krijgen). Die twee zijn hier NIET hetzelfde, en dat is precies
 *       de vorm van val die 'drop' drie keer heeft laten dichtklappen — zie de
 *       noten in src/lib/quote.js. Dus wordt hier getoetst dat een merkmodel
 *       betaalbaar is ZONDER dat quoteOrder() erop struikelt.
 *
 *   2 · EEN OMSCHRIJVING DIE OP EEN BANKAFSCHRIFT KOMT. paymentDescription()
 *       zette voor 'drop' letterlijk "30 producten, undefined" op de
 *       checkoutpagina van Mollie. Eén regel voorkomt dat hier; deze toets
 *       bewaakt hem.
 *
 *   3 · EEN GARANTIE MET EEN LOGBOEK ERONDER. /custom-models belooft dat we bij
 *       een treffer alle bestelde content omwisselen. merkmodelControleCompleet()
 *       is de enige plek die zegt wanneer een vastlegging die belofte kan dragen.
 *
 * ── EN DE PAGINA ZELF, TEGEN DE GEBOUWDE HTML ───────────────────────────────
 *
 * Niet tegen de bron: wat een bezoeker krijgt is wat er in dist staat. Een
 * formulier dat in de .astro klopt en door een fout in de build zonder
 * verplichte velden uitkomt, is precies het geval dat een toets op de bron niet
 * ziet. Draai `npm run build` voordat dit draait.
 */
import { readFileSync } from 'node:fs';
import {
  quoteBrandModel, quoteOrder, isPayableService, paymentDescription,
  PAYABLE_SERVICES, FIXED_PRICE_SERVICES,
} from '../src/lib/quote.js';
import { AMOUNT, VAT_RATE } from '../src/data/pricing.js';
import { serviceLabel } from '../src/data/services.js';
import { merkmodelControleCompleet, GEZICHTSZOEKERS, UITKOMSTEN } from '../src/data/modelChecks.js';
import { TRACKS } from '../src/data/brandModelBrief.js';
import { CONSENT_VERSION, CONSENT_VERSION_BRAND_MODEL, consentText } from '../src/data/consent.js';

const R = [];
const ok = (naam, gekregen, verwacht = true) => R.push({
  naam,
  verwacht: JSON.stringify(verwacht),
  gekregen: JSON.stringify(gekregen),
  pass: JSON.stringify(gekregen) === JSON.stringify(verwacht),
});
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nde prijs, en aan welke kant de btw zit');
{
  const nl = quoteBrandModel({ vatRate: VAT_RATE });
  ok('het nettobedrag is AMOUNT.brandModel', nl.netCents, Math.round(AMOUNT.brandModel * 100));
  ok('  en de btw gaat eróver, niet eruit', nl.grossCents, nl.netCents + nl.vatCents);
  ok('  wat bij het Nederlandse tarief neerkomt op meer dan de prijs',
    nl.grossCents > nl.netCents, true);

  /* DE BELANGRIJKSTE VAN DIT BLOK. Elk bedrag op de site is exclusief btw
     (vatLead() staat op elke pagina met een prijs). Zou dit van bruto naar netto
     rekenen zoals de proefvisual doet, dan betaalt een Duits bedrijf met een
     geldig btw-nummer € 371,90 in plaats van € 450 — en niets zou dat melden,
     want het bedrag ziet er in beide gevallen plausibel uit. */
  const verlegd = quoteBrandModel({ vatRate: 0 });
  ok('bij 0% is het brutobedrag exact de prijs', verlegd.grossCents, Math.round(AMOUNT.brandModel * 100));
  ok('  en er staat geen btw op', verlegd.vatCents, 0);

  ok('een merkmodel telt als één stuk, voor de factuurregel', nl.products, 1);
  ok('een onzinnig tarief valt terug op het Nederlandse',
    quoteBrandModel({ vatRate: NaN }).vatCents, nl.vatCents);
}

console.log('\nbetaalbaar, maar niet uit de ladder');
{
  ok("'brand-model' mag een betaallink krijgen", isPayableService('brand-model'), true);
  /* En dit is de andere helft, en de reden dat er twee verzamelingen zijn.
     Stond 'brand-model' in PAYABLE_SERVICES, dan ging quoteOrder() door naar
     ladderRate(), en die GOOIT bij een onbekende sleutel. Op het pad dat een
     betaling aanmaakt. */
  ok('  maar quoteOrder() geeft er null voor terug in plaats van te struikelen',
    quoteOrder({ service: 'brand-model', products: 1, vatRate: VAT_RATE }), null);
  ok('  en hij staat niet in PAYABLE_SERVICES', PAYABLE_SERVICES.has('brand-model'), false);
  ok('  maar wel in FIXED_PRICE_SERVICES', FIXED_PRICE_SERVICES.has('brand-model'), true);

  /* De proefvisual heeft zijn eigen pad — betalen gebeurt meteen of niet — en
     account.js zet er een aparte uitzondering voor naast isPayableService().
     Hem hier binnentrekken zou dat gedrag veranderen zonder reden. */
  ok('de proefvisual blijft buiten beide verzamelingen', isPayableService('test-sample'), false);
  ok('en de ladderdiensten blijven betaalbaar', isPayableService('drop') && isPayableService('catalog'), true);
}

console.log('\nwat er op het bankafschrift komt');
{
  for (const [taal, verwacht] of [['en', 'VISUAILS Brand Model'], ['nl', 'VISUAILS merkmodel']]) {
    const t = paymentDescription({ service: 'brand-model', products: 1 }, taal);
    ok(`${taal}: de omschrijving is de dienst en niet een telling`, t, verwacht);
    ok(`  en er staat geen undefined in`, /undefined/.test(t), false);
  }
  ok('en de dienst heeft een naam voor de factuurregel — en',
    typeof serviceLabel('brand-model', 'en'), 'string');
  ok('  en nl', typeof serviceLabel('brand-model', 'nl'), 'string');
}

console.log('\nde herroepingsverklaring is een eigen versie');
{
  /* v1 eindigt op "uit foto's die ik aanlever", en bij een merkmodel levert de
     klant niets aan. Een verklaring ondertekenen over iets wat niet gebeurd is,
     is een bewijsstuk dat in een geschil tégen je werkt. */
  ok('het merkmodel gebruikt een andere versie dan de bestelstroom',
    CONSENT_VERSION_BRAND_MODEL !== CONSENT_VERSION, true);
  const bm = consentText(CONSENT_VERSION_BRAND_MODEL, 'nl');
  ok('en die tekst noemt geen aangeleverde foto’s', /aanlever/.test(bm), false);
  /* De twee dragende elementen van art. 6:230p sub f moeten er wél in staan:
     uitdrukkelijk vragen te beginnen, én weten dat het recht daarmee vervalt. */
  ok('  maar vraagt wel uitdrukkelijk om te beginnen', /uitdrukkelijk/.test(bm), true);
  ok('  en noemt het herroepingsrecht', /herroepingsrecht/.test(bm), true);
  ok('de oude versie blijft opzoekbaar', typeof consentText(CONSENT_VERSION, 'nl'), 'string');
}

console.log('\nhet uniciteitslogboek draagt de garantie');
{
  const alle = GEZICHTSZOEKERS.map((e) => e.id);
  ok('een lege vastlegging draagt niets', merkmodelControleCompleet({}), false);
  ok('een datum zonder uitkomst ook niet',
    merkmodelControleCompleet({ datum: '2026-08-24', engines: alle }), false);
  ok('een uitkomst zonder datum ook niet',
    merkmodelControleCompleet({ engines: alle, uitkomst: 'geen-treffer' }), false);
  ok('één gezichtszoeker te weinig is niet compleet',
    merkmodelControleCompleet({ datum: '2026-08-24', engines: alle.slice(1), uitkomst: 'geen-treffer' }), false);
  ok('alles erop en eraan wel',
    merkmodelControleCompleet({ datum: '2026-08-24', engines: alle, uitkomst: 'geen-treffer' }), true);
  ok('  en dat mag ook als kommalijst uit de database komen',
    merkmodelControleCompleet({ datum: '2026-08-24', engines: alle.join(','), uitkomst: 'geen-treffer' }), true);

  /* EEN TREFFER IS COMPLEET EN NIET GOED, en dat verschil hoort niet in één
     boolean te verdwijnen: deze functie zegt of de vastlegging deugt, niet of de
     uitslag deugt. Zou een treffer hier false geven, dan zou het adminscherm
     precies het geval weigeren op te slaan waarvoor dit logboek bestaat. */
  ok('een treffer is óók een complete vastlegging',
    merkmodelControleCompleet({ datum: '2026-08-24', engines: alle, uitkomst: 'treffer' }), true);
  ok('een verzonnen uitkomst niet',
    merkmodelControleCompleet({ datum: '2026-08-24', engines: alle, uitkomst: 'misschien' }), false);
  ok('en de lijst met uitkomsten is precies twee', [...UITKOMSTEN].sort(), ['geen-treffer', 'treffer']);
}

console.log('\nde kolommen bestaan in het schema');
{
  const schema = read('schema.sql');
  for (const kolom of ['model_check_at', 'model_check_engines', 'model_check_result', 'model_check_by', 'model_check_note']) {
    ok(`schema.sql kent ${kolom}`, schema.includes(`ADD COLUMN ${kolom} `), true);
  }
  const migratie = read('migrations/0033-merkmodel-controle.sql');
  ok('en de migratie zet dezelfde vijf',
    ['at', 'engines', 'result', 'by', 'note'].every((k) => migratie.includes(`ADD COLUMN model_check_${k} `)), true);
}

console.log('\nde gebouwde pagina, in twee talen');
for (const [pad, taal] of [['dist/start/brand-model/index.html', 'en'], ['dist/nl/start/brand-model/index.html', 'nl']]) {
  const h = read(pad);
  const naam = pad.replace('dist/', '').replace('/index.html', '');

  ok(`${naam}: post als brand-model`, h.includes('name="service" value="brand-model"'), true);
  ok('  vijf stappen', [1, 2, 3, 4, 5].every((n) => h.includes(`data-bm-step="${n}"`)), true);
  ok('  en twee routes', h.includes('data-bm-track="own"') && h.includes('data-bm-track="ours"'), true);

  /* HET BEDRAG STAAT ER ÉCHT. Een afrekenstap zonder zichtbare prijs is precies
     wat er vóór vandaag mis was, alleen dan andersom. */
  ok('  het bedrag staat op de pagina', h.includes(`€${AMOUNT.brandModel}`), true);
  ok('  en het oude bedrag nergens', /1[.,]250/.test(h), false);

  /* De twee verklaringen. Zonder de zakelijke verklaring komt elke bestelling op
     de beoordelingslijst en krijgt níemand een betaallink; zonder de
     herroepingsverklaring is de uitzondering van 6:230p niet ingeroepen. */
  ok('  de zakelijke verklaring staat erin', h.includes('name="business_declaration"'), true);
  ok('  de herroepingsverklaring ook', h.includes('name="withdrawal_consent"'), true);
  ok('  en het is de merkmodelversie', h.includes(CONSENT_VERSION_BRAND_MODEL), true);
  ok('  niet die van de bestelstroom', h.includes(`value="${CONSENT_VERSION}"`), false);

  /* HET FACTUURBLOK. Een bestelling van € 450 levert een factuur op, en zonder
     land is er geen btw-beslissing en zonder adres geen factuur. Ontbreekt er
     één, dan valt de bestelling stil op de beoordelingslijst — betaald wordt er
     dan niet, en niets op het scherm zegt waarom. */
  for (const veld of ['first_name', 'last_name', 'email', 'address_line1', 'postal_code', 'city', 'country']) {
    ok(`  ${veld} wordt gevraagd`, h.includes(`name="${veld}"`), true);
  }
  ok('  en het btw-nummer met zijn ontsnapping', h.includes('name="vat"') && h.includes('name="no_vat"'), true);
  ok('  plus het registratienummer voor wie er geen heeft', h.includes('name="reg_number"'), true);

  /* De belofte op de twee kaarten van stap 1. Het getal komt uit TRACKS en de
     vragen staan in de markup; BrandModelBrief.astro laat de build vallen als
     die twee uiteenlopen. Dit is de andere kant van diezelfde controle: staat
     het getal er ook echt, in de taal van de pagina. */
  const woorden = taal === 'nl'
    ? { 8: 'Acht korte vragen', 4: 'Vier korte vragen' }
    : { 8: 'Eight short questions', 4: 'Four short questions' };
  for (const t of TRACKS) {
    ok(`  de kaart "${t.id}" belooft ${t.questions} vragen`, h.includes(woorden[t.questions]), true);
  }
  ok('  en er staat bij dat beide hetzelfde kosten',
    /kosten hetzelfde|cost the same/.test(h), true);
}

console.log('\nwat er nergens meer mag staan');
{
  /* De terugverdienconstructie is met de prijswijziging vervallen. Zolang die
     zin ergens op een gebouwde pagina staat, doet de site een belofte die de
     code niet meer kent — de fout die tests/promises.test.mjs op 9 augustus vijf
     keer tegelijk vond. */
  const paginas = [
    'dist/start/brand-model/index.html', 'dist/nl/start/brand-model/index.html',
    'dist/custom-models/index.html', 'dist/nl/custom-models/index.html',
    'dist/terms/index.html', 'dist/nl/terms/index.html',
    'dist/start/video/index.html', 'dist/nl/start/video/index.html',
    'dist/start/custom-look/index.html', 'dist/nl/start/custom-look/index.html',
  ];
  for (const p of paginas) {
    const h = read(p);
    ok(`${p.replace('dist/', '')}: geen terugverdienbelofte`,
      /[Cc]redited back|verrekend met je eerste/.test(h), false);
    ok('  en geen "hier niet af te rekenen"',
      /no checkout for this|niet afrekenen, en dat komt voorlopig/.test(h), false);
  }
}

const w = Math.max(...R.map((r) => r.naam.length));
for (const r of R) console.log(`${r.pass ? ' ok ' : 'FOUT'}  ${r.naam.padEnd(w)}  verwacht ${r.verwacht.padEnd(14)} kreeg ${r.gekregen}`);
const stuk = R.filter((r) => !r.pass).length;
console.log(`\n${R.length - stuk}/${R.length} geslaagd`);
process.exit(stuk ? 1 : 0);
