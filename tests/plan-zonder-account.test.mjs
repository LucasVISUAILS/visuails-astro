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
/* Commentaar eruit voordat er naar code wordt gezocht. De noten in plan.js en
   account.js noemen de OUDE, dode aanroep woordelijk — zonder deze stripper
   gaat de controle rood op zijn eigen uitleg. */
const zonderNoten = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
/* En de body van één functie, zodat "raakt X niet aan" over díé functie gaat en
   niet over het hele bestand van tienduizend regels. */
const functieBody = (src, naam) => {
  const i = src.indexOf(`function ${naam}(`);
  if (i < 0) return '';
  const open = src.indexOf('{', i);
  let diep = 0;
  for (let k = open; k < src.length; k += 1) {
    if (src[k] === '{') diep += 1;
    else if (src[k] === '}') { diep -= 1; if (!diep) return src.slice(open, k + 1); }
  }
  return src.slice(open);
};

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

/* ── HET BLOK WORDT NIET MEER VERBORGEN — 11 september 2026 ─────────────────
 *
 * Lucas: *"Er staat onderaan ook 'You are signed in. We use the details from
 * your account.' en niks bij de gegevens. Plaats de gegevens van het ingelogde
 * account automatisch in de open velden staan en zorg ervoor dat de klant alsnog
 * zijn gegevens daar kan bewerken wanneer dat nodig is."*
 *
 * Dit blok mat de OPLOSSING van gisteren: stap 4 was een <fieldset> met
 * `data-acct="out"`, zodat Layout hem voor een ingelogde klant kon verbergen én
 * uitzetten — want een verborgen verplicht veld blokkeert het versturen zonder
 * dat iemand ziet waarom.
 *
 * Die oplossing is vervangen, niet gerepareerd: de velden worden nu INGEVULD in
 * plaats van verborgen (zie het script onderaan PlanPicker.astro). Daarmee is er
 * geen verborgen verplicht veld meer, en meet dit blok voortaan de nieuwe eis —
 * dat het blok er altijd staat, en dat een ingelogde klant zijn eigen gegevens
 * ziet in plaats van een zin erover.
 *
 * De regel in Layout blijft gemeten: hij geldt nog voor elk ander
 * `data-acct`-fieldset dat er ooit bij komt, en hij is precies het soort ding
 * dat stilletjes verdwijnt bij een opruimactie. */
console.log('\nde gegevens staan er, ingevuld en bewerkbaar');
{
  const form = lees('src/components/order/PlanPicker.astro');
  ok('stap 4 is een <fieldset>', /<fieldset class="ps-set ps-geg" data-ps-geg>/.test(form));
  ok('  en wordt niet meer verborgen voor wie is ingelogd',
    /<fieldset class="ps-set ps-geg"[^>]*data-acct=/.test(form), false);
  ok('  het script vult hem uit het account', /window\.visAccount\(\)\.then/.test(form));
  ok('  en overschrijft niet wat de bezoeker al typte', /if \(el\.value\) return;/.test(form));
  /* Het e-mailadres IS het account. Zichtbaar, ingevuld, en niet te wijzigen in
     een afrekenscherm — readOnly en niet disabled, want een disabled veld post
     niets en de server leest dit adres. */
  ok('  het e-mailadres gaat op readonly', /mail\.readOnly = true;/.test(form));
  ok('  en niet op disabled', /mail\.disabled = true/.test(form), false);
  /* ── EN DE SERVER MOET DIE BEWERKING AANNEMEN ─────────────────────────────
   *
   * ⚠ DEZE TOETS WAS GROEN OP EEN DODE TAK — gevonden 17 september 2026.
   *
   * Er stond: `functions/api/plan.js bevat await werkGegevensBij(env, klant,
   * form)`. Die regel stond er inderdaad, en hij liep nooit. De aanroep zat
   * achter `if (klant)`, en `klant` kwam uit currentCustomer() op een route die
   * de sessiecookie niet krijgt — die is Path=/account. De klant bewerkte zijn
   * adres, de toets was groen, en er veranderde niets.
   *
   * Dit is precies waar een broncontrole voor valt: hij bewijst dat een regel
   * ERGENS staat, niet dat hij wordt uitgevoerd. Wat er nu getoetst wordt is de
   * hele weg — het formulier moet naar de route gaan die de sessie wél ziet, en
   * die route moet het bijwerken doen. */
  ok('het formulier gaat naar de route die de sessie ziet zodra er een account is',
    /f\.setAttribute\('action', '\/account\/plan\/start'\)/.test(form));

  const acc = lees('src/lib/account.js');
  ok('en /account/plan/start werkt de gegevens bij',
    /await werkKlantgegevensBij\(env, customer, planForm\);/.test(acc));
  /* Het formulier wordt één keer gelezen en doorgegeven: een Request kan maar
     één keer worden uitgelezen, en handleSubscribeStart() neemt hem daarom aan
     als vierde argument. Zonder dat zou het bijwerken de betaling breken. */
  ok('  met hetzelfde, één keer gelezen formulier', /\}, planForm\);/.test(acc));
  const body = functieBody(zonderNoten(acc), 'werkKlantgegevensBij');
  ok('  de functie bestaat en heeft een body', body.length > 200);
  ok('  maar raakt het e-mailadres niet aan', /\bemail\s*=\s*\?\d/.test(body), false);
  ok('  en laat details_saved_at met rust', /details_saved_at/.test(body), false);
  /* En de dode tak is echt weg, niet alleen omzeild. */
  const api = zonderNoten(lees('functions/api/plan.js'));
  ok('  en de dode tak in /api/plan is verdwenen',
    /await werkGegevensBij\(/.test(api), false);

  const layout = lees('src/layouts/Layout.astro');
  ok('en Layout zet een verborgen fieldset nog steeds op disabled',
    /if \(nodes\[i\]\.tagName === 'FIELDSET'\) nodes\[i\]\.disabled = uit;/.test(layout));
}

console.log('\nde velden die de factuur nodig heeft, worden gevraagd');
{
  const form = lees('src/components/order/PlanPicker.astro');
  /* src/lib/invoice.js leest name, brand, billing_address, country en
     vat_number van `customers`. Alles behalve brand en btw is verplicht: een
     factuur zonder adresregel mag de deur niet uit — zie de noot bij
     composeAddress(). */
  /* `name` is sinds 11 september twee velden — voornaam en achternaam, net als
     op het bestelformulier en in het accountscherm. De server bouwt `name`
     ervan met composeName(); zie de noot in PlanPicker.astro voor waarom het
     andersom (splitsen) niet kan. */
  for (const veld of ['first_name', 'last_name', 'email', 'address_line1', 'postal_code', 'city', 'country']) {
    ok(`  ${veld} is verplicht`, new RegExp(`name="${veld}"[^>]*required|required[^>]*name="${veld}"`).test(form));
  }
  for (const veld of ['brand', 'vat']) {
    ok(`  ${veld} is optioneel`, new RegExp(`name="${veld}"[^>]*required`).test(form), false);
  }
  const api = lees('functions/api/plan.js');
  ok('en de server weigert zonder die velden', /return terug\('gegevens', lang\)/.test(api));
  ok('  en stelt `name` zelf samen uit de twee velden',
    /composeName\(voornaam, achternaam\)/.test(api));
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
