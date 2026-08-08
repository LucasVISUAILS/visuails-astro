// VISUAILS — de poort voor de handmatige beoordeling van een btw-claim.
//
// Uit `btwverleggingspecificatie.md`, 8 augustus 2026. De specificatie vraagt om
// bescherming tegen een foutieve of frauduleuze verlegging. Deze toetsen gaan
// niet over het tarief — dat staat in vat.test.mjs en is niet veranderd — maar
// over de vraag welke bestellingen een mens moet zien voordat er geld beweegt.
//
// DE VAL DIE HIER WORDT AFGEDEKT. Twee dingen die er allebei uitzien als
// "ongeldig btw-nummer" en die het niet zijn:
//
//   · VIES zei nee            → de klant heeft iets verkeerd ingevuld.
//   · VIES zei niets          → wij hebben niets kunnen controleren.
//
// In migratie 0015 werden die twee hetzelfde getal (`vat_valid` was NOT NULL
// DEFAULT 0), waardoor het onderscheid niet te maken viel. Migratie 0018 zet er
// een nullable kolom naast. Als iemand die ooit weer NOT NULL maakt, valt de
// derde toets hieronder om, en dat is de bedoeling.

import {
  vatDecision, vatGate, paymentMismatch, VAT_TREATMENT, REVIEW,
  REVIEW_HOURS, PAYMENT_DAYS,
} from '../src/data/vat.js';

let pass = 0;
let fail = 0;
function check(what, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else fail++;
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  console.log(` ${ok ? 'ok  ' : 'FAIL'} ${what.padEnd(58)} ${ok ? '' : `verwacht ${w}, kreeg ${g}`}`);
}
function truthy(what, got) { check(what, !!got, true); }
function falsy(what, got) { check(what, !!got, false); }

// Een bestelling zoals de poort hem ziet. Alleen de velden die meedoen.
function gate(over = {}) {
  const o = {
    country: 'NL', vatValid: null, vatError: '', confirmed: false, hadNumber: false, ...over,
  };
  const d = vatDecision({ country: o.country, vatValid: o.vatValid === true });
  return vatGate({ ...o, treatment: d.treatment });
}

console.log('\n── een gewone Nederlandse bestelling loopt door ──');
{
  const g = gate({ country: 'NL' });
  falsy('geen beoordeling nodig', g.needsReview);
  truthy('mag meteen betaald worden', g.payableNow);
  check('en er staat geen reden bij', g.reasons, []);
}

console.log('\n── een Nederlander die een btw-nummer invult, ook ──');
{
  // Dit is de dure valkuil uit vat.js: binnenlandse verlegging bestaat niet voor
  // deze dienst. Het tarief blijft 21% en er is niets bijzonders aan de hand.
  const g = gate({ country: 'NL', hadNumber: true, vatValid: true });
  falsy('geen beoordeling', g.needsReview);
  truthy('mag betalen', g.payableNow);
}

console.log('\n── VIES zei nee tegen een Duits nummer ──');
{
  const g = gate({ country: 'DE', hadNumber: true, vatValid: false });
  truthy('wordt gemarkeerd', g.needsReview);
  truthy('maar mag wél betalen: het tarief is 21% en dat klopt', g.payableNow);
  truthy('de reden noemt VIES', g.reasons.join(' ').includes('VIES keurde'));
}

console.log('\n── VIES gaf géén antwoord op een Duits nummer ──');
{
  const g = gate({ country: 'DE', hadNumber: true, vatValid: null, vatError: 'timeout' });
  truthy('wordt gemarkeerd', g.needsReview);
  truthy('mag betalen — 21% is de veilige kant', g.payableNow);
  truthy('de reden noemt de oorzaak', g.reasons.join(' ').includes('timeout'));
  // DIT IS DE TOETS DIE OM MOET VALLEN als iemand het onderscheid weggooit:
  const afgekeurd = gate({ country: 'DE', hadNumber: true, vatValid: false });
  check('een afgekeurd nummer en een mislukte controle geven een ándere reden',
    g.reasons[0] === afgekeurd.reasons[0], false);
}

console.log('\n── een Duits nummer dat VIES goedkeurt, mét het vinkje ──');
{
  const g = gate({ country: 'DE', hadNumber: true, vatValid: true, confirmed: true });
  falsy('geen beoordeling nodig', g.needsReview);
  truthy('mag betalen', g.payableNow);
  check('en het tarief is nul',
    vatDecision({ country: 'DE', vatValid: true }).rate, 0);
}

console.log('\n── hetzelfde nummer, zónder het vinkje ──');
{
  // Kan alleen als er langs het formulier heen is gepost. 0% zonder verklaring
  // van de klant is niet te verdedigen, dus gaat de betaling op de rem.
  const g = gate({ country: 'DE', hadNumber: true, vatValid: true, confirmed: false });
  truthy('wordt gemarkeerd', g.needsReview);
  falsy('en mag NIET betaald worden', g.payableNow);
  truthy('de reden zegt waarom', g.reasons.join(' ').includes('bevestiging'));
}

console.log('\n── de Verenigde Staten ──');
{
  const g = gate({ country: 'US' });
  truthy('wordt gemarkeerd', g.needsReview);
  falsy('en mag niet meteen betaald worden', g.payableNow);
  truthy('de reden zegt dat het op het woord van de klant rust',
    g.reasons.join(' ').includes('klant zelf opgeeft'));

  // En toch is het tarief al bekend. Dit is het punt waarop de specificatie
  // "GEEN_BTW_BEREKENING_NU" zegt en waarop wij dat niet doen: het tarief volgt
  // uit artikel 44 zodra het land bekend is, en de factuur kan meteen kloppen.
  const d = vatDecision({ country: 'US', vatValid: false });
  check('het tarief is nul', d.rate, 0);
  check('en het is géén verlegging maar buiten de heffing',
    d.treatment, VAT_TREATMENT.outsideScope);
}

console.log('\n── een niet-EU-klant die óók een nummer invult ──');
{
  // Er is geen register om het in na te kijken, dus het verandert niets.
  const g = gate({ country: 'CH', hadNumber: true, vatValid: null });
  truthy('nog steeds gemarkeerd', g.needsReview);
  falsy('nog steeds niet meteen betaalbaar', g.payableNow);
  check('en geen ICP-regel',
    (await import('../src/data/vat.js')).needsIcp(
      vatDecision({ country: 'CH', vatValid: true }).treatment), false);
}

console.log('\n── het betaalmiddel achteraf ──');
{
  check('iDEAL op een Duitse verlegging is een samenloop om te zien',
    typeof paymentMismatch({ method: 'ideal', country: 'DE', treatment: VAT_TREATMENT.reverseCharge }),
    'string');
  check('iDEAL op een Nederlandse order is niets',
    paymentMismatch({ method: 'ideal', country: 'NL', treatment: VAT_TREATMENT.standard }), null);
  check('een creditcard uit Duitsland is niets',
    paymentMismatch({ method: 'creditcard', country: 'DE', treatment: VAT_TREATMENT.reverseCharge }), null);
  check('iDEAL bij 21% is niets, ook uit Duitsland',
    paymentMismatch({ method: 'ideal', country: 'DE', treatment: VAT_TREATMENT.standard }), null);
  check('iDEAL bij een niet-EU-order ís een samenloop',
    typeof paymentMismatch({ method: 'ideal', country: 'US', treatment: VAT_TREATMENT.outsideScope }),
    'string');
  check('geen betaalmiddel is geen samenloop',
    paymentMismatch({ method: '', country: 'US', treatment: VAT_TREATMENT.outsideScope }), null);
}

console.log('\n── de termijnen staan in de code, niet in een pagina ──');
{
  check('vierentwintig uur voor de beoordeling', REVIEW_HOURS, 24);
  check('zeven dagen om te betalen', PAYMENT_DAYS, 7);
  check('de toestanden zijn de vier uit migratie 0018',
    Object.keys(REVIEW).sort(), ['approved', 'expired', 'pending', 'rejected']);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) { console.log(`${fail} FAILED`); process.exit(1); }
console.log('all passed');
