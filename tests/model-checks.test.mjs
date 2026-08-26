/* VISUAILS — de modellencontrole: het logboek, en de belofte die eraan hangt.
 *
 *   node tests/model-checks.test.mjs
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Lucas wil op /ai-act zeggen dat elk model door gezichtszoekmachines is gehaald,
 * en dat in verkoopgesprekken gebruiken. Dat is een belofte, en promises.test.mjs
 * beschrijft wat er gebeurt met beloftes die niet door code worden nagekomen: op
 * 9 augustus 2026 bleken er vijf jarenlang onwaar te zijn geweest.
 *
 * Deze suite houdt drie dingen vast die samen voorkomen dat het een zesde wordt:
 * het logboek dekt precies de roster, de pagina kan de claim niet doen als het
 * logboek hem niet draagt, en de claim vertelt er zelf bij waar hij ophoudt.
 */
import { readFileSync } from 'node:fs';
/* ── DE PADEN WAREN FOUT EN DAAROM DRAAIDE DEZE SUITE NOOIT — 25 aug 2026 ────
   Er stond `./models.js` en `./modelChecks.js`, alsof die naast dit bestand in
   tests/ liggen. Ze liggen in src/data/. Node gaf ERR_MODULE_NOT_FOUND, de
   suite stond niet in de keten van `npm test`, en dus is dat drie weken lang
   niemand opgevallen: een test die nergens wordt aangeroepen, faalt nergens.

   Hij staat nu wél in de keten (package.json → test:modellen). Dat is de helft
   die telt — een gerepareerde import in een bestand dat niemand start, is nog
   steeds geen controle. */
import { ROSTER, modelId } from '../src/data/models.js';
import { CHECKS, ENGINES, GEZICHTSZOEKERS, checkFor, rosterVolledigGecontroleerd, oudsteControle } from '../src/data/modelChecks.js';

let pass = 0, fail = 0;
const check = (naam, actual, expected) => {
  const goed = JSON.stringify(actual) === JSON.stringify(expected);
  goed ? pass++ : fail++;
  console.log(` ${goed ? 'ok  ' : 'FAIL'} ${naam.padEnd(60)}${goed ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nhet logboek dekt de roster');
{
  const roster = ROSTER.map((m) => modelId(m.name)).sort();
  const log = Object.keys(CHECKS).sort();

  /* Een model zonder regel is een model waar niemand naar gekeken heeft, en dat
     is precies het geval dat een claim over "elk model" onwaar maakt. Andersom is
     een regel zonder model een controle die over niemand gaat — dat is geen fout
     in de belofte, maar wel een aanwijzing dat de roster is gewijzigd zonder dat
     het logboek meeging. */
  check('elk model uit ROSTER heeft een regel', roster.filter((k) => !log.includes(k)), []);
  check('en er staat geen regel voor een model dat niet bestaat', log.filter((k) => !roster.includes(k)), []);
}

console.log('\nwat een volledige controle is');
{
  /* De claim noemt een AANTAL zoekmachines. Dat getal komt uit deze lijst, dus wie
     er een weghaalt verandert wat de site belooft. Zonder deze regel zou dat
     stilletjes kunnen. */
  check('er zijn drie gezichtszoekers', GEZICHTSZOEKERS.length, 3);
  check('en twee bestandszoekers ernaast', ENGINES.filter((e) => e.soort === 'bestand').length, 2);

  /* De kern: één ontbrekende schakel en de hele claim vervalt. Getest door het
     logboek in het geheugen te vullen en er daarna gaten in te prikken. */
  const ids = GEZICHTSZOEKERS.map((e) => e.id);
  const bewaar = JSON.parse(JSON.stringify(CHECKS));
  const vulAlles = () => ROSTER.forEach((m, i) => Object.assign(CHECKS[modelId(m.name)],
    { datum: i === 0 ? '2026-08-14' : '2026-08-19', engines: [...ids], uitkomst: 'geen-treffer', door: 'Lucas' }));

  vulAlles();
  check('volledig ingevuld: de claim mag', rosterVolledigGecontroleerd(), true);
  /* De OUDSTE datum, want de belofte is zo oud als de zwakste schakel. De nieuwste
     tonen stelt de zaak mooier voor dan hij is. */
  check('en de getoonde datum is de oudste', oudsteControle(), '2026-08-14');

  vulAlles(); CHECKS[modelId(ROSTER[3].name)].engines = [ids[0]];
  check('één model met te weinig zoekmachines: claim vervalt', rosterVolledigGecontroleerd(), false);

  vulAlles(); CHECKS[modelId(ROSTER[5].name)].uitkomst = 'treffer';
  check('één treffer: claim vervalt voor de hele roster', rosterVolledigGecontroleerd(), false);

  vulAlles(); CHECKS[modelId(ROSTER[7].name)].datum = null;
  check('één model zonder datum: claim vervalt', rosterVolledigGecontroleerd(), false);
  check('en er is dan ook geen datum om te tonen', oudsteControle(), null);

  Object.keys(bewaar).forEach((k) => Object.assign(CHECKS[k], bewaar[k]));
}

console.log('\nde pagina kan de claim niet buiten het logboek om doen');
{
  const pagina = read('src/components/AiActPage.astro');

  check('AiActPage leest het logboek', /from '\.\.\/data\/modelChecks\.js'/.test(pagina), true);
  /* Zonder deze regel zou iemand de sectie kunnen laten staan en de schakelaar
     weghalen — en dan staat de claim er altijd, ook als er niets gecontroleerd is. */
  check('en toont de sectie alleen achter die schakelaar',
    /\{modellenGecontroleerd && \(/.test(pagina), true);
  check('de datum in de tekst komt uit oudsteControle()',
    /c\.mdlP\(controleDatum, zoekers\)/.test(pagina), true);

  /* De claim moet in beide talen zijn eigen grens noemen. Een controle die als
     garantie wordt gebracht is een belofte die niemand kan waarmaken; die zin
     eruit halen maakt van dit hele bestand een risico in plaats van een dekking. */
  check('EN noemt wat het niet bewijst', pagina.includes('What it does not prove.'), true);
  check('NL noemt wat het niet bewijst', pagina.includes('Wat het niet bewijst.'), true);
}

console.log('\nhet logboek staat niet vooraf ingevuld');
{
  /* Deze test hoort te VERDWIJNEN zodra Lucas de controles echt gedraaid heeft.
     Tot die tijd bewaakt hij het enige dat hier echt fout kan gaan: dat er ooit
     een uitslag in dit bestand komt te staan die niemand gemeten heeft. Wie de
     regels invult, haalt deze sectie weg — en dan valt de regel hierboven in
     "wat een volledige controle is" er vanzelf overheen. */
  const ingevuld = ROSTER.map((m) => modelId(m.name)).filter((k) => CHECKS[k].datum);
  if (ingevuld.length === 0) {
    check('nog niets gecontroleerd, dus de site zwijgt', rosterVolledigGecontroleerd(), false);
  } else {
    /* Deels ingevuld is de gevaarlijke tussentoestand: dan lijkt er werk gedaan,
       maar de claim mag nog niet. Dit maakt zichtbaar hoe ver je bent. */
    console.log(`      ${ingevuld.length}/${ROSTER.length} ingevuld — claim ${rosterVolledigGecontroleerd() ? 'staat aan' : 'staat nog uit'}`);
    check('elke ingevulde regel heeft een naam erbij',
      ingevuld.filter((k) => !CHECKS[k].door), []);
    check('en een geldige uitkomst',
      ingevuld.filter((k) => !['geen-treffer', 'treffer'].includes(CHECKS[k].uitkomst)), []);
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
