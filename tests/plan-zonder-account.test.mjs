/*
 * VISUAILS — EEN ABONNEMENT AFSLUITEN ZONDER ACCOUNT — 9 september 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Iemand kan geen abonnement afsluiten zonder een account te hebben."*
 *
 * ── WAT DIT BEWAAKT ────────────────────────────────────────────────────────
 *
 * De oude regel — alleen ingelogde klanten — stond in src/lib/subscribe.js en
 * werd afgedwongen door de sessiecontrole in account.js. Die is er nog voor
 * /account/plan/start; wat erbij kwam is /api/plan, een publieke ingang die de
 * klant AANMAAKT en daarna dezelfde motor start.
 *
 * Daar zitten drie manieren in om het stil kapot te maken, en dit bestand toetst
 * ze alle drie:
 *
 *   1. HET FORMULIER POST NAAR DE OUDE ROUTE. Dan komt een bezoeker zonder
 *      account weer op de inlogpagina, en niets in de build merkt dat op.
 *   2. DE SESSIE WORDT NIET EERST GELEZEN. Dan kan een ingelogde bezoeker een
 *      abonnement afsluiten op het e-mailadres van iemand anders.
 *   3. HET VERBORGEN BLOK BLIJFT VERPLICHT. Layout verbergt stap 4 zodra je
 *      bent ingelogd; blijft het veld dan `required`, dan blokkeert de browser
 *      het versturen zonder te zeggen waarom — een fout die alleen zichtbaar is
 *      voor wie ingelogd is, en dus precies voor niemand die hem test.
 */
import { readFileSync } from 'node:fs';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const gelijk = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : ' FAIL'} ${naam}${gelijk ? '' : `   verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nde ingang bestaat en het formulier wijst ernaar');
{
  const api = lees('functions/api/plan.js');
  ok('functions/api/plan.js heeft een POST-ingang', /export async function onRequestPost/.test(api));
  ok('  en een GET die terugstuurt in plaats van te falen', /export function onRequestGet/.test(api));

  const form = lees('src/components/order/PlanPicker.astro');
  ok('het formulier post naar /api/plan', /action="\/api\/plan"/.test(form));
  ok('  en niet meer naar de route achter de sessiecontrole',
    /action="\/account\/plan\/start"/.test(form), false);
}

console.log('\nde sessie gaat vóór wat er is ingetypt');
{
  const api = lees('functions/api/plan.js');
  /* De vololgorde in de bron is het bewijs: currentCustomer() moet vóór het
     lezen van `email` staan, anders bepaalt het formulier wie de klant is. */
  const sessie = api.indexOf('currentCustomer(env, request)');
  const getypt = api.indexOf("form.get('email')");
  ok('currentCustomer wordt aangeroepen', sessie > -1);
  ok('  en wel vóór het e-mailadres uit het formulier', sessie > -1 && getypt > sessie);
  ok('  en de getypte gegevens staan achter `if (!klant)`', /if \(!klant\) \{/.test(api));
  ok('de honeypot staat erin', /company_hp/.test(api));
  ok('en er is een ratelimiet', /checkRate\(env, \{ ip: clientIp\(request\)/.test(api));
}

console.log('\nde motor wordt gedeeld, niet nagebouwd');
{
  const api = lees('functions/api/plan.js');
  const sub = lees('src/lib/subscribe.js');
  ok('/api/plan roept handleSubscribeStart aan', /handleSubscribeStart\(context, klant/.test(api));
  ok('  en geeft het al gelezen formulier mee', /\}, form\);/.test(api));
  ok('handleSubscribeStart accepteert dat formulier', /vooraf = null\) \{/.test(sub));
  ok('  en leest het zelf als het er niet is', /const form = vooraf \|\| await request\.formData/.test(sub));
  /* Eén klantaanmaak op de hele site: die van de bestelroute. Twee eigen
     INSERTs is twee keer de regel "opgeslagen gegevens winnen" om te vergeten. */
  ok('de klant wordt met upsertCustomer uit de bestelroute gemaakt',
    /import \{ upsertCustomer \} from '\.\/order\.js'/.test(api));
  ok('  en die functie is daarvoor geëxporteerd',
    /export async function upsertCustomer/.test(lees('functions/api/order.js')));
}

console.log('\nhet verborgen blok doet niet mee aan de controle');
{
  const form = lees('src/components/order/PlanPicker.astro');
  ok('stap 4 is een <fieldset> en geen <div>', /<fieldset class="ps-set ps-geg" data-acct="out">/.test(form));
  const layout = lees('src/layouts/Layout.astro');
  ok('en Layout zet een verborgen fieldset ook op disabled',
    /if \(nodes\[i\]\.tagName === 'FIELDSET'\) nodes\[i\]\.disabled = uit;/.test(layout));
}

console.log('\nde velden die de factuur nodig heeft, worden gevraagd');
{
  const form = lees('src/components/order/PlanPicker.astro');
  /* src/lib/invoice.js leest name, brand, billing_address, country en
     vat_number van `customers`. Alles behalve brand en btw is verplicht: een
     factuur zonder adresregel mag de deur niet uit — zie de noot bij
     composeAddress(). */
  for (const veld of ['name', 'email', 'address_line1', 'postal_code', 'city', 'country']) {
    ok(`  ${veld} is verplicht`, new RegExp(`name="${veld}"[^>]*required|required[^>]*name="${veld}"`).test(form));
  }
  for (const veld of ['brand', 'vat']) {
    ok(`  ${veld} is optioneel`, new RegExp(`name="${veld}"[^>]*required`).test(form), false);
  }
  const api = lees('functions/api/plan.js');
  ok('en de server weigert zonder die velden', /return terug\('gegevens', lang\)/.test(api));
  ok('  het adres gaat als één veld met regeleindes naar billing_address',
    /\.join\('\\n'\)/.test(api));
}

console.log('\nde doodlopende weg is weg');
{
  const form = lees('src/components/order/PlanPicker.astro');
  /* In de MARKUP en niet in de noot: de noot vertelt wat er stond en waarom
     het weg is, en die hoort te blijven staan. */
  ok('"je moet ingelogd zijn" staat niet meer in de markup',
    /\{c\.signedOut\}/.test(form), false);
  ok('  en de tekst zelf is uit de copy verdwenen', /signedOut:/.test(form), false);
  ok('  en inloggen is een aanbod geworden', /plan-al-klant/.test(form));
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
