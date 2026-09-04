/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DESIGN.md MAG GEEN SYSTEEM BESCHRIJVEN DAT NIET BESTAAT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Op 31 augustus 2026 stonden er zestien tokens in DESIGN.md die nergens in
 * src/styles/global.css zijn gezet: een `--gutter`, een ruimteschaal `--s-1` tot
 * `--s-10`, een `--font-data` met IBM Plex Mono, en twee tekengroottes. Geen
 * daarvan heeft ooit bestaan.
 *
 * ── WAAROM DAT ERGER IS DAN EEN VEROUDERD DOCUMENT ─────────────────────────
 *
 * Omdat het het enige document is dat zegt hoe deze site eruit hoort te zien, en
 * omdat het geloofwaardig is: het staat vol met metingen en redeneringen die wél
 * kloppen. Wie het leest en `padding: var(--s-6)` schrijft, krijgt geen foutmelding
 * — een onbekend token valt stil terug op niets, en de opmaak schuift een beetje.
 * Dat is precies de fout die niemand vindt.
 *
 * ── WAT DEZE TOETS WEL EN NIET DOET ────────────────────────────────────────
 *
 * Hij leest alleen de tokens die in een ```css-blok STAAN ALSOF ZE BESTAAN, en
 * kijkt of global.css ze zet. Wat het document over een VERWIJDERD token schrijft,
 * hoort er juist te staan — de noot over `--success` legt uit waarom er geen groen
 * vinkje meer is, en dat is waardevolle geschiedenis en geen drift. Zulke tokens
 * staan in VERDWENEN hieronder, met de reden erbij.
 *
 * De omgekeerde richting bewaakt hij niet. global.css heeft tientallen tokens die
 * DESIGN.md niet noemt, en dat mag: niet elk token is een ontwerpbeslissing.
 */

import { readFileSync, globSync } from 'node:fs';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const doc = readFileSync(new URL('../DESIGN.md', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

/* Tokens die het document met opzet noemt als WEG. Elke regel hier hoort een
   reden te hebben; staat er een naam zonder reden, dan is dat een gat in de
   wacht en geen uitzondering. */
const VERDWENEN = {
  '--success': 'het groene vinkje is bewust geschrapt — DESIGN.md legt uit waarom',
};

console.log('\nelk token dat DESIGN.md als bestaand opschrijft, staat ook in global.css');
{
  const blokken = [...doc.matchAll(/```css\n([\s\S]*?)```/g)].map((m) => m[1]);
  ok('er staan css-blokken in het document', blokken.length > 0, true);

  const genoemd = new Set();
  for (const blok of blokken) {
    for (const m of blok.matchAll(/(--[a-z0-9-]+)\s*:/g)) genoemd.add(m[1]);
  }
  ok('en die noemen tokens', genoemd.size > 10, true);

  const gezet = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const mist = [...genoemd].filter((n) => !gezet.has(n) && !(n in VERDWENEN)).sort();
  ok('geen enkel genoemd token ontbreekt in de code', mist, []);

  /* En de uitzonderingen moeten uitzondering blijven: staat een verdwenen token
     tóch weer in global.css, dan is het document het dat achterloopt. */
  const teruggekomen = Object.keys(VERDWENEN).filter((n) => gezet.has(n));
  ok('en de verdwenen tokens zijn nog steeds verdwenen', teruggekomen, []);
}

console.log('\nde drie getallen die het document als feit opschrijft, kloppen');
{
  /* Niet elk getal, maar de drie die het vaakst worden nageschreven omdat ze in
     een codeblok staan en er dus uitzien als iets om over te nemen. */
  const paren = [
    ['--container-cap', /--container-cap:\s*1640px/],
    ['--container', /--container:\s*min\(var\(--container-cap\), 100%\)/],
    ['--pad-x', /--pad-x:\s*clamp\(20px, 3\.5vw, 64px\)/],
    ['--t-body', /--t-body:\s*1\.0625rem/],
  ];
  for (const [naam, re] of paren) {
    ok(`${naam} staat in global.css zoals het document zegt`, re.test(css), true);
    ok(`  en het document schrijft hetzelfde op`, re.test(doc), true);
  }
}

/* ══ DE PAGINABREEDTE STAAT OP ÉÉN PLEK ═══════════════════════════════════
 *
 * Lucas, 1 september 2026: *"pas dit overal correct en consistent toe."*
 *
 * De aanleiding is precies wat deze sectie tegenhoudt. `body.huid-kantig` zette
 * `--container: 100%` en `--pad-x: 20px`, en die huid staat op elke pagina op
 * twee na. De ladder in global.css — met een noot van veertig regels erboven over
 * waarom hij van 1240 naar 1720 ging — gold daarmee voor /proef en verder niets.
 * Er ging niets kapot; de site was gewoon zo breed als het scherm, en niemand kon
 * aan één bestand zien waarom.
 *
 * DAT IS EEN KLASSE FOUT EN GEEN GEVAL. Een tweede plek die dezelfde maat zet,
 * wint stil zodra hij specifieker is, en het bestand dat je erop naslaat is het
 * bestand dat verliest. Deze toets zegt: wie de paginabreedte wil veranderen,
 * verandert global.css — en nergens anders.
 *
 * DE VORM VAN DE ZOEKOPDRACHT DOET ERTOE. Dit huis citeert de oude code woordelijk
 * in de reparatienoot ernaast, dus een zoektocht naar "--container:" vindt zijn
 * eigen uitleg terug. Vandaar de anker op regelbegin: een DECLARATIE begint met
 * het token, een noot heeft er altijd iets voor staan.
 */
console.log('\nde paginabreedte wordt maar op één plek gezet');
{
  const MAATTOKENS = ['container', 'container-cap', 'container-wide', 'container-narrow', 'pad-x'];
  const declaratie = new RegExp(`^\\s*--(${MAATTOKENS.join('|')})\\s*:`);

  const bestanden = globSync('src/**/*.{css,astro}').map((f) => f.replace(/\\/g, '/'))
    .concat(globSync('public/**/*.css').map((f) => f.replace(/\\/g, '/')));
  ok('er zijn genoeg bestanden doorzocht', bestanden.length > 20, true);

  const zetters = bestanden.filter((f) => readFileSync(f, 'utf8').split('\n').some((r) => declaratie.test(r)));
  ok('alleen global.css zet ze', zetters, ['src/styles/global.css']);

  /* En de ladder moet een ladder blijven: smal < standaard < breed. Zou `wide`
     onder de standaard zakken, dan betekent de klasse het tegenovergestelde van
     zijn naam — precies de reden dat --container-wide in augustus meemoest. */
  const getal = (naam) => {
    const m = new RegExp(`^\\s*--${naam}:\\s*(?:min\\()?([0-9]+)px`, 'm').exec(css);
    return m ? Number(m[1]) : null;
  };
  const smal = getal('container-narrow');
  const cap = getal('container-cap');
  const breed = getal('container-wide');
  ok('de drie maten zijn te lezen', [smal, cap, breed].every(Boolean), true);
  ok('en ze lopen op', smal < cap && cap < breed, true);

  /* De bodem van --pad-x blijft staan waar hij stond. De site is smaller geworden
     voor grote schermen; op een telefoon was er nooit iets mis en elke pixel telt
     daar. Zou de bodem meestijgen, dan betaalt de kleinste lezer voor een probleem
     dat hij niet heeft. */
  ok('de ondermarge op een telefoon blijft 20px', /--pad-x:\s*clamp\(20px,/.test(css), true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
