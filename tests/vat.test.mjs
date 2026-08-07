// VISUAILS — de btw-beslissing, getest.
//
// WAAROM DIT BESTAAT EN WAAROM HET DE EERSTE PRIJSTEST IS. src/data/pricing.js
// en src/lib/quote.js hadden tot vandaag geen enkele unittest; hun enige
// bescherming waren de twee assertions die bij het importeren draaien. Dat was
// verdedigbaar zolang het antwoord "21% voor iedereen" was — daar valt weinig
// aan te testen. Nu er drie uitkomsten zijn en één ervan geld weggeeft, niet
// meer.
//
// WAT HIER WORDT GECONTROLEERD, in volgorde van wat het kost als het fout gaat:
//
//   1 · Een Nederlandse klant mag NOOIT verlegd worden, ook niet met een geldig
//       Nederlands btw-nummer. Dat is de dure: de binnenlandse verleggingslijst
//       is gesloten en creatieve diensten staan er niet op, dus elke
//       Nederlandse zakelijke bestelling zou 21% weglekken.
//   2 · Een EU-klant zonder BEVESTIGD nummer krijgt 21%. "Iets ingevuld" is
//       geen bewijs; alleen VIES telt.
//   3 · Een storing bij VIES is geen goedkeuring. Time-out, netwerk, lidstaat
//       eruit — allemaal 21%.
//   4 · Buiten de EU is 0% maar géén "btw verlegd", en geen ICP-regel.
//
// De VIES-adapter wordt getest met een gestubde fetch. Er gaat geen enkel
// verzoek naar de Commissie vanuit een test: een suite die van een externe
// dienst afhangt is een suite die rood wordt als Roemenië eruit ligt.

import {
  vatDecision, VAT_TREATMENT, isEu, viesCode, normaliseVat,
  vatStatement, vatShort, needsIcp, countryOptions, EU_COUNTRIES, HOME_COUNTRY,
} from '../src/data/vat.js';
import { checkVat, viesEvidence } from '../src/lib/vies.js';
import { quoteOrder } from '../src/lib/quote.js';

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${label.padEnd(62)} expected ${JSON.stringify(expected)}  got ${JSON.stringify(actual)}`);
}

// ── 1 · THE DECISION TABLE ───────────────────────────────────────────────────
console.log('\n── de beslissing ──');

check('NL + valid VAT number is STILL 21%', vatDecision({ country: 'NL', vatValid: true }).rate, 0.21);
check('NL + valid VAT number is not reverse charge',
  vatDecision({ country: 'NL', vatValid: true }).treatment, VAT_TREATMENT.standard);
check('NL, no number', vatDecision({ country: 'NL', vatValid: false }).rate, 0.21);
check('DE + confirmed number is 0%', vatDecision({ country: 'DE', vatValid: true }).rate, 0);
check('DE + confirmed number is reverse charge',
  vatDecision({ country: 'DE', vatValid: true }).treatment, VAT_TREATMENT.reverseCharge);
check('DE, number NOT confirmed, is 21%', vatDecision({ country: 'DE', vatValid: false }).rate, 0.21);
check('DE, number not confirmed, says why',
  vatDecision({ country: 'DE', vatValid: false }).reason, 'eu-unconfirmed');
check('US is 0% but outside scope',
  vatDecision({ country: 'US', vatValid: false }).treatment, VAT_TREATMENT.outsideScope);
check('GB is outside the EU (not a member state)', isEu('GB'), false);
check('GB with a "valid" flag is still outside scope, not reverse charge',
  vatDecision({ country: 'GB', vatValid: true }).treatment, VAT_TREATMENT.outsideScope);
check('no country at all falls back to 21%', vatDecision({ country: '', vatValid: true }).rate, 0.21);
check('a junk country is treated as outside the EU',
  vatDecision({ country: 'ZZ', vatValid: false }).treatment, VAT_TREATMENT.outsideScope);
check('lower-case country still resolves', vatDecision({ country: 'de', vatValid: true }).rate, 0);

// ── 2 · WHAT GOES ON THE INVOICE, AND ON THE ICP ─────────────────────────────
console.log('\n── factuur en ICP ──');

check('reverse charge names article 196 (nl)',
  /artikel 196/.test(vatStatement(VAT_TREATMENT.reverseCharge, 'nl')), true);
check('outside scope does NOT say "verlegd"',
  /verlegd/i.test(vatStatement(VAT_TREATMENT.outsideScope, 'nl')), false);
check('a normal Dutch invoice gets no extra sentence',
  vatStatement(VAT_TREATMENT.standard, 'nl'), null);
check('only the EU reverse charge goes on the ICP', needsIcp(VAT_TREATMENT.reverseCharge), true);
check('outside scope does NOT go on the ICP', needsIcp(VAT_TREATMENT.outsideScope), false);
check('domestic does NOT go on the ICP', needsIcp(VAT_TREATMENT.standard), false);
check('short label, nl', vatShort(VAT_TREATMENT.reverseCharge, 'nl'), 'Btw verlegd');

// ── 3 · COUNTRY DATA ─────────────────────────────────────────────────────────
console.log('\n── landen ──');

check('27 member states', EU_COUNTRIES.length, 27);
check('Greece goes to VIES as EL, not GR', viesCode('GR'), 'EL');
check('the Netherlands goes to VIES as NL', viesCode('NL'), 'NL');
check('a non-member has no VIES code (so no call is made)', viesCode('US'), null);
check('the home country leads the select', countryOptions('en').home[0].id, HOME_COUNTRY);
check('and is not repeated in the EU group',
  countryOptions('en').eu.some((c) => c.id === HOME_COUNTRY), false);
check('every EU option has a name in Dutch',
  countryOptions('nl').eu.every((c) => c.name && c.name !== c.id), true);

// ── 4 · NORMALISING WHAT PEOPLE ACTUALLY TYPE ────────────────────────────────
console.log('\n── invoer opschonen ──');

check('spaces, dots and case', normaliseVat('nl 0054.07575-b96'),
  { country: 'NL', number: '005407575B96' });
check('no prefix is not an error', normaliseVat('005407575B96'),
  { country: null, number: '005407575B96' });
check('empty in, empty out', normaliseVat(''), { country: null, number: '' });
check('null does not throw', normaliseVat(null), { country: null, number: '' });

// ── 5 · THE VIES ADAPTER, WITH A STUBBED FETCH ───────────────────────────────
console.log('\n── VIES ──');

const realFetch = globalThis.fetch;
function stub(handler) { globalThis.fetch = handler; }
function restore() { globalThis.fetch = realFetch; }

const okBody = {
  isValid: true, userError: 'VALID', name: 'VISUAILS',
  address: '\nVAARWERKHORST 00017\n7531HK ENSCHEDE\n',
  requestIdentifier: 'WAPIAAAAZ_TEST', requestDate: '2026-08-07T08:01:15.398Z',
};

stub(async () => ({ ok: true, json: async () => okBody }));
let r = await checkVat('NL', '005407575B96', { country: 'NL', number: '005407575B96' });
check('a VALID reply is ok+valid', [r.ok, r.valid], [true, true]);
check('the consultation number is kept', r.consultation, 'WAPIAAAAZ_TEST');
check('the evidence blob carries it', /WAPIAAAAZ_TEST/.test(viesEvidence(r)), true);

stub(async () => ({ ok: true, json: async () => ({ isValid: false, userError: 'INVALID' }) }));
r = await checkVat('DE', '123456789', { country: 'NL', number: '005407575B96' });
check('an INVALID reply is answered-but-not-valid', [r.ok, r.valid], [true, false]);
check('and that decides 21%', vatDecision({ country: 'DE', vatValid: r.valid }).rate, 0.21);

// The one that costs money if it is wrong.
stub(async () => ({ ok: true, json: async () => ({ userError: 'MS_UNAVAILABLE' }) }));
r = await checkVat('RO', '123456789', { country: 'NL', number: '005407575B96' });
check('a member state being down is NOT an answer', r.ok, false);
check('a member state being down is NOT valid', r.valid, false);
check('so the order is charged 21%', vatDecision({ country: 'RO', vatValid: r.valid }).rate, 0.21);
check('and the reason is recorded', r.error, 'MS_UNAVAILABLE');

stub(async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); });
r = await checkVat('FR', '123456789', { country: 'NL', number: '005407575B96' });
check('a timeout is not valid', [r.ok, r.valid, r.error], [false, false, 'timeout']);

stub(async () => { throw new Error('getaddrinfo ENOTFOUND'); });
r = await checkVat('FR', '123456789', { country: 'NL', number: '005407575B96' });
check('a network failure is not valid', [r.ok, r.valid, r.error], [false, false, 'network']);

stub(async () => ({ ok: false, status: 503, json: async () => ({}) }));
r = await checkVat('FR', '123456789', { country: 'NL', number: '005407575B96' });
check('a 503 is not valid', [r.ok, r.valid], [false, false]);

// Germany withholds name and address. Three hyphens is "not disclosed", and it
// must not be stored as a company literally called "---".
stub(async () => ({ ok: true, json: async () => ({ isValid: true, userError: 'VALID', name: '---', address: '---', requestIdentifier: 'X1' }) }));
r = await checkVat('DE', '123456789', { country: 'NL', number: '005407575B96' });
check('an undisclosed name is null, not "---"', r.name, null);
check('but the number is still valid', r.valid, true);

check('bad input never reaches the network', (await checkVat('', '', null)).error, 'bad-input');
restore();

// ── 6 · THE MONEY THAT COMES OUT ─────────────────────────────────────────────
console.log('\n── bedragen ──');

const dutch = quoteOrder({ service: 'drop', products: 12, vatRate: 0.21 });
const german = quoteOrder({ service: 'drop', products: 12, vatRate: 0 });
check('net is the same either way', dutch.netCents, german.netCents);
check('the Dutch order is charged net + 21%', dutch.grossCents, dutch.netCents + dutch.vatCents);
check('the reverse-charged order pays exactly net', german.grossCents, german.netCents);
check('and carries no VAT', german.vatCents, 0);
check('the rate is reported back', german.vatRate, 0);
check('a nonsense rate falls back to 21%, not to zero',
  quoteOrder({ service: 'drop', products: 12, vatRate: NaN }).vatRate, 0.21);
check('a negative rate falls back too',
  quoteOrder({ service: 'drop', products: 12, vatRate: -1 }).vatRate, 0.21);
check('an absent rate is the Dutch one',
  quoteOrder({ service: 'drop', products: 12 }).vatRate, 0.21);

// ── 7 · THE DISCOUNT IS GONE ─────────────────────────────────────────────────
// Lucas: "Verwijder hierna ook de 20% korting." A test rather than a comment,
// because a constant that comes back is a constant nobody notices coming back.
console.log('\n── de korting is weg ──');

const pricing = await import('../src/data/pricing.js');
check('FIRST_ORDER_DISCOUNT no longer exists', 'FIRST_ORDER_DISCOUNT' in pricing, false);
check('quote() no longer returns a discount field',
  'discount' in pricing.quote('complete', 12), false);
check('list price and net are the same number now',
  pricing.quote('complete', 12).listTotal === pricing.quote('complete', 12).net, true);

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) {
  console.log('\nall passed'.replace('all passed', `${fail} FAILED`));
  process.exit(1);
}
console.log('all passed');
