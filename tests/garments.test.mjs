/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET PRODUCTTYPE, EN WAT DAARUIT VOLGT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * src/data/garments.js legt één ding per producttype vast — de uitsnede — en leidt
 * daar drie dingen uit af: of er een gezicht in beeld staat, welke stukken de klant
 * als context mag kiezen, en dus welke vragen het formulier overslaat.
 *
 * Wat hier bewaakt wordt, op volgorde van wat het kost als het misgaat:
 *
 *   1 · DE GRENS MET DE OUTFITTOESLAG. € 50 per shot bestaat sinds 30 juli, en het
 *       voorbeeld in die noot ("trousers and a t-shirt worn together") is bijna
 *       precies wat hier gratis wordt. De grens is de uitsnede, en die moet in de
 *       tekst staan die de klant leest — anders is het een toeslag die niemand meer
 *       betaalt.
 *   2 · EEN PRODUCT KAN ZICHZELF NIET ALS CONTEXT KIEZEN. Twee fouten in de eerste
 *       versie: bij een jurk stond "top" als keuze (een jurk IS de top) en bij
 *       sokken ontbraken de schoenen. Beide kwamen doordat de keuzes rechtstreeks
 *       uit de uitsnede kwamen in plaats van uit "uitsnede minus wat het product
 *       zelf bezet".
 *   3 · GEEN VRAAG WAARVAN HET ANTWOORD ONZICHTBAAR IS. Staat er geen gezicht in
 *       beeld, dan mag er geen keuze uit tien gezichten worden aangeboden.
 *   4 · EEN ONBEKEND TYPE VALT NAAR DE RUIMSTE KANT. Te veel vragen kost een
 *       minuut, te weinig vragen kost een beeld dat niet klopt.
 */
import { readFileSync } from 'node:fs';
import {
  GARMENTS, GARMENT_IDS, CROPS, CONTEXT_SLOTS, CONTEXT_SLOT_IDS,
  garment, cropFor, faceInFrame, modelQuestion,
  contextSlots, contextAllowed, maxContext,
  contextDefault, CONTEXT_OURS, CONTEXT_UPLOAD_PREFIX, copy,
} from '../src/data/garments.js';

let pass = 0; let fail = 0;
function ok(naam, kreeg, verwacht = true) {
  const goed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (goed) pass += 1; else fail += 1;
  console.log(` ${goed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(62)}${goed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const namen = (id) => contextSlots(id).map((s) => s.id);

console.log('VISUAILS — het producttype\n');

console.log('de uitsnede bepaalt of er een gezicht in beeld staat');
{
  /* De vijf zonder gezicht. Dit is de lijst waar Lucas om vroeg: *"wanneer je een
     broek on-model foto krijgt krijg je geen model gezicht erbij, wellicht alleen
     female/male optie."* */
  for (const id of ['trousers', 'shorts', 'skirt', 'shoes', 'socks', 'belt']) {
    ok(`${id}: geen gezicht in beeld`, faceInFrame(id), false);
    ok(`  dus geen keuze uit de roster`, modelQuestion(id), 'presenting');
  }
  for (const id of ['top', 'outerwear', 'dress', 'headwear', 'bag']) {
    ok(`${id}: gezicht in beeld`, faceInFrame(id), true);
    ok(`  dus wel een keuze uit de roster`, modelQuestion(id), 'roster');
  }
  /* Zalando: "body cropping allowed as long as the article remains recognizable" —
     een gezichtsloze on-model shot is dus toegestaan en geen afwijking. */
  ok('er zijn typen van beide soorten', new Set(GARMENT_IDS.map(faceInFrame)).size, 2);
}

console.log('\nde keuzes zijn de uitsnede MINUS wat het product zelf bezet');
{
  /* DE TWEE FOUTEN DIE HET UITPROBEREN VOND, en ze staan hier zodat ze niet
     terugkomen. */
  ok('een jurk laat alleen schoenen over — hij IS de top en de broek', namen('dress'), ['shoes']);
  ok('sokken laten de schoenen open — die worden eróver gedragen', namen('socks'), ['shoes', 'bottom']);

  ok('een broek: schoenen en de zoom van de top', namen('trousers'), ['shoes', 'top']);
  ok('een top: de tailleband eronder', namen('top'), ['bottom']);
  ok('een schoen: de broekzoom, en niet nog een schoen', namen('shoes'), ['bottom']);
  ok('een riem: beide helften, want die raakt ze beide', namen('belt'), ['bottom', 'top']);
  ok('een jas: alle drie, want een jas bezet geen plek maar ligt erover', namen('outerwear'), ['shoes', 'bottom', 'top']);
  ok('ondergoed: niets, er is geen ander kledingstuk', namen('underwear'), []);

  ok('een product kan zichzelf nooit als context kiezen',
    GARMENT_IDS.every((id) => (garment(id).occupies || []).every((bezet) => !namen(id).includes(bezet))), true);

  ok('een broek mag geen broek', contextAllowed('trousers', 'bottom'), false);
  ok('een jurk mag geen top', contextAllowed('dress', 'top'), false);
  ok('een schoen mag geen schoen', contextAllowed('shoes', 'shoes'), false);
  ok('een broek mag wel schoenen', contextAllowed('trousers', 'shoes'), true);
  ok('en onzin mag nooit', contextAllowed('trousers', 'hoed'), false);
  ok('maxContext volgt uit de lijst en is geen apart getal',
    GARMENT_IDS.every((id) => maxContext(id) === contextSlots(id).length), true);
}

console.log('\neen onbekend type valt naar de ruimste kant');
{
  ok('een type dat niet bestaat, wordt other', garment('yogamat').id, 'other');
  ok('en krijgt dus alle vragen', faceInFrame('yogamat'), true);
  ok('en alle plekken', namen('yogamat').length, 3);
  ok('een leeg type ook', garment('').id, 'other');
  ok('en null ook', garment(null).id, 'other');
  /* cropFor mag nooit undefined teruggeven: elke aanroeper leest er `.face` uit. */
  ok('cropFor geeft altijd een uitsnede', typeof cropFor('onzin').face, 'boolean');
}

console.log('\nals de klant niets kiest, kiezen wij — en dat is een echt antwoord');
{
  /* Lucas: *"Als de klant geen producten bijvoegt gaat VISUAILS ervan uit dat het
     puur om het hoofdproduct gaat en dat de mogelijk licht zichtbare andere kleding
     gekozen worden door ons en wij ervoor zorgen dat het aansluit op de style waar
     de klant voor gaat."* Dus niet "leeg" maar "wij kiezen" — dezelfde reden dat
     MODEL_ANY in models.js een echte waarde is en geen afwezig veld: "hij koos
     niets" en "hij koos dat wij kiezen" geven hetzelfde beeld maar een ander
     gesprek als er iets misgaat. */
  ok('de standaard is een waarde en geen leegte', contextDefault(), CONTEXT_OURS);
  ok('en die waarde is niet leeg', Boolean(CONTEXT_OURS), true);
  ok('de tekst zegt dat wij dan kiezen op de stijl',
    /stijl/i.test(copy('nl').ours) && /style/i.test(copy('en').ours), true);
}

console.log('\nde grens met de outfittoeslag staat in de tekst die de klant leest');
{
  for (const lang of ['nl', 'en']) {
    const c = copy(lang);
    ok(`${lang}: er staat dat het gratis is`, /gratis|free/i.test(c.free), true);
    /* DE GRENS. Zonder deze zin is een contextstuk niet te onderscheiden van een
       outfitshot, en dan is er een toeslag van € 50 die niemand meer betaalt. */
    ok(`${lang}: en dat ze niet als product worden gefotografeerd`,
      /niet als product|not photographed as products/i.test(c.free), true);
    ok(`${lang}: en wat een volledige outfit dan is`, /outfit/i.test(c.full), true);
    ok(`${lang}: en dat het om één beeld per product gaat`,
      /één foto|one photo/i.test(c.lead), true);
  }
  /* Elk slot zegt wat er van dat stuk in beeld staat. Dat is de grens per plek, en
     zonder die tekst is "gratis toevoegen" een belofte zonder maat. */
  ok('elk slot zegt wat er in beeld staat',
    CONTEXT_SLOT_IDS.every((id) => CONTEXT_SLOTS[id].seen?.nl && CONTEXT_SLOTS[id].seen?.en), true);
}

console.log('\nde werkmap kan context van onderwerp onderscheiden');
{
  /* De klant levert foto\'s van een contextstuk aan (Lucas\'s keuze, 17 augustus).
     Zonder merkteken staat er in de werkmap een top waarvan niet te zien is of hij
     het onderwerp is of de context — het verschil tussen een beeld van € 89 en een
     beeld van € 139. */
  ok('er is een voorvoegsel voor contextbestanden', typeof CONTEXT_UPLOAD_PREFIX, 'string');
  ok('en het is niet leeg', CONTEXT_UPLOAD_PREFIX.length > 0, true);
  ok('en het is veilig in een bestandsnaam', /^[a-z0-9-]+$/.test(CONTEXT_UPLOAD_PREFIX), true);
}

console.log('\nde bouwcontrole houdt tegen wat stil fout zou gaan');
{
  const src = readFileSync(new URL('../src/data/garments.js', import.meta.url), 'utf8');
  ok('assertGarments draait bij het laden', /^assertGarments\(\);$/m.test(src), true);
  /* Een uitsnede die naar een plek verwijst die niet bestaat, levert een lijst op
     waar één keuze stil uit weggefilterd is. */
  ok('elke plek in een uitsnede bestaat',
    Object.values(CROPS).every((c) => c.inFrame.every((s) => CONTEXT_SLOTS[s])), true);
  ok('elke plek wordt ergens gebruikt',
    CONTEXT_SLOT_IDS.every((s) => Object.values(CROPS).some((c) => c.inFrame.includes(s))), true);
  ok('elk type bezet alleen plekken uit zijn eigen uitsnede',
    GARMENTS.every((g) => (g.occupies || []).every((s) => CROPS[g.crop].inFrame.includes(s))), true);
  ok('elk type heeft een naam in beide talen',
    GARMENTS.every((g) => g.name?.en && g.name?.nl), true);
  ok("en 'other' bestaat als terugval", GARMENT_IDS.includes('other'), true);

  /* De afwijzing van "garment category" in attributes.js staat nog, en dit bestand
     is er niet mee in tegenspraak — maar dat moet ergens staan, anders voegt iemand
     het over een half jaar samen en haalt hij die afwijzing terug binnen. */
  ok('de noot verwijst naar de afgewezen categorievraag',
    /attributes\.js wees "garment category" in augustus expliciet af/.test(src), true);
  const attr = readFileSync(new URL('../src/data/attributes.js', import.meta.url), 'utf8');
  ok('en die afwijzing staat er nog', /GARMENT CATEGORY\. Try-on pipelines detect/.test(attr), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
