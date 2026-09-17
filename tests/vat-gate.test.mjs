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

/* ── EN GEEN NEDERLANDSE BANK OP EEN BESTELLING ZONDER BTW ─────────────────
 *
 * 17 september 2026. `excludeIdeal` haalt iDEAL uit de betaalmethoden zodra een
 * bestelling op 0% is afgerekend — verlegd, of buiten de EU. Dat is de
 * voorkoming die hoort bij paymentMismatch() hierboven: die MELDT achteraf dat
 * er met een Nederlandse bank is betaald op een buitenlandse claim, deze zorgt
 * dat het niet kan.
 *
 * Er zijn DRIE plekken waar een betaling ontstaat, en tot vandaag deden er twee
 * dit wel: de bestelroute en de betaallink. Het derde — "nu betalen" in het
 * dashboard van de klant, en juist het pad waar de klant zélf op drukt — deed
 * het niet, en haalde `vat_rate` niet eens op.
 *
 * Op de bron en niet op gedrag: de drie aanroepen zijn drie regels, en wat deze
 * toets moet vangen is dat er een vierde bijkomt zonder die regel. */
console.log('\nelk betaalpad sluit iDEAL uit op een bestelling zonder btw');
{
  const { readFileSync: lezen } = await import('node:fs');
  const zonderNoten = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const [bestand, patroon] of [
    ['functions/api/order.js', /excludeIdeal:\s*vatCall\.rate === 0/],
    ['src/lib/betaallink.js', /excludeIdeal:\s*Number\(o\.vat_rate\) === 0/],
    ['src/lib/account.js', /excludeIdeal:\s*Number\(order\.vat_rate\) === 0/],
  ]) {
    const bron = zonderNoten(lezen(new URL(`../${bestand}`, import.meta.url), 'utf8'));
    check(`${bestand} sluit iDEAL uit op 0%`, patroon.test(bron), true);
  }
  /* En het dashboardpad moet het tarief ook echt ophalen — zonder die kolom is
     de regel hierboven altijd onwaar en doet hij niets. */
  const acc = zonderNoten(lezen(new URL('../src/lib/account.js', import.meta.url), 'utf8'));
  check('en haalt vat_rate op', /vat_cents,\s*vat_rate,\s*review_state/.test(acc), true);
}

/* ── EEN BESTELLING IN BEOORDELING VERLIEST ZIJN WEEK NIET ─────────────────
 *
 * 17 september 2026. De btw-poort houdt een bestelling tegen: geen betaallink,
 * netjes op de lijst. Maar `window_expires_at` werd bij het bestellen gezet
 * zodra er een week én een bedrag was — zonder te kijken of er ook betaald KON
 * worden. Zeven dagen later ruimde de nachtelijke taak de reservering op en
 * kreeg de klant een mail dat "de betaaltermijn is verstreken", over een link
 * die nooit is verstuurd.
 *
 * Drie reparaties, en ze horen bij elkaar: de klok start niet meer bij een
 * gesloten poort, hij start alsnog bij goedkeuring, en de opruimtaak slaat over
 * wat nog in beoordeling staat. Deze toets bewaakt alle drie op de bron — het
 * gedrag zit verdeeld over drie processen die je niet in één doorloop hebt. */
console.log('\neen bestelling in btw-beoordeling houdt zijn reservering');
{
  const { readFileSync: lezen } = await import('node:fs');
  const zonderNoten = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const order = zonderNoten(lezen(new URL('../functions/api/order.js', import.meta.url), 'utf8'));
  check('de betaaltermijn start alleen als er betaald kan worden',
    /if \(finalWindow && quote && vatReview\.payableNow && !review\.needsReview\)/.test(order), true);
  /* Woordelijk dezelfde voorwaarde als bij de betaallink zelf: twee plekken die
     hetzelfde moeten beslissen, horen dat met dezelfde woorden te doen. */
  check('en met dezelfde voorwaarde als de betaallink',
    (order.match(/vatReview\.payableNow && !review\.needsReview/g) || []).length >= 2, true);

  const cron = lezen(new URL('../cron/index.js', import.meta.url), 'utf8');
  check('de opruimtaak slaat een bestelling in beoordeling over',
    /COALESCE\(review_state, ''\) <> 'pending'/.test(cron), true);

  const adm = lezen(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  check('en de klok start alsnog bij goedkeuring',
    /window_expires_at = CASE[\s\S]{0,200}?window_start IS NOT NULL AND window_expires_at IS NULL/.test(adm), true);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) { console.log(`${fail} FAILED`); process.exit(1); }
console.log('all passed');
