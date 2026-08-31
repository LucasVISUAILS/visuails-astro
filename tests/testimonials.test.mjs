/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE LAATSTE STAP VAN DE REVIEWLUS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `order_feedback.testimonial_approved` bestaat sinds migratie 0020. Het scherm
 * om het vinkje te zetten kwam er in augustus 2026. En daarna gebeurde er nog
 * steeds niets: geen enkele regel op de site las die kolom. Een klant kon dus een
 * aanbeveling typen, expliciet toestemming geven, door Lucas goedgekeurd worden —
 * en de tekst kwam nergens terecht.
 *
 * Dat is erger dan een ontbrekende functie: het is toestemming vragen voor iets
 * wat je vervolgens niet doet.
 *
 * Wat hier bewaakt wordt zijn de vier dingen die deze keten stil kunnen breken:
 *
 *   · het ANKER in src/data/testimonials.js waar het script op knipt — verdwijnt
 *     dat, dan schrijft `npm run testimonials` niets meer en zegt het dat ook;
 *   · de PRIVACYGRENS in de query: drie kolommen, geen e-mail, geen bestelnummer;
 *   · de TOESTEMMING in diezelfde query, als tweede sluiting op dezelfde deur;
 *   · en dat de homepage zijn eigen kop terugneemt zodra er wél iets staat. Een
 *     kop die zegt "nog geen muur vol reviews" boven drie reviews is precies de
 *     tegenstrijdigheid waar dit blok voor bedoeld is.
 */
import { readFileSync } from 'node:fs';
import { TESTIMONIALS, TESTIMONIALS_UPDATED, testimonialsToShow } from '../src/data/testimonials.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const lees = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('het gegenereerde bestand houdt zich aan zijn eigen vorm');
{
  const data = lees('../src/data/testimonials.js');
  ok('het anker waar het script op knipt staat erin', data.includes('/** @type {'), true);
  ok('de lijst is een array', Array.isArray(TESTIMONIALS), true);
  ok('de datum is leeg of een echte datum',
    TESTIMONIALS_UPDATED === '' || /^\d{4}-\d{2}-\d{2}$/.test(TESTIMONIALS_UPDATED), true);
  ok('testimonialsToShow kapt af', testimonialsToShow(0).length, 0);
  ok('en vraagt nooit meer dan er is', testimonialsToShow(99).length, TESTIMONIALS.length);

  /* Elke rij precies drie sleutels. Komt er ooit een e-mailadres of een
     bestelnummer bij, dan staat dat in een bestand dat in git zit en door de
     hele wereld gelezen wordt. */
  const sleutels = TESTIMONIALS.map((r) => Object.keys(r).sort().join(','));
  ok('elke rij draagt alleen tekst, naam en maand',
    sleutels.every((k) => k === 'month,name,text'), true);
  ok('en geen enkele rij bevat een apenstaartje',
    TESTIMONIALS.some((r) => JSON.stringify(r).includes('@')), false);
}

console.log('\nde query in het script is de privacygrens');
{
  const script = lees('../scripts/testimonials.mjs');
  ok('alleen goedgekeurde rijen', /testimonial_approved\s*=\s*1/.test(script), true);
  ok('en alleen met toestemming', /testimonial_consent\s*=\s*1/.test(script), true);
  ok('geen e-mailadres in de SELECT', /SELECT[\s\S]*?FROM/.exec(script)[0].includes('email'), false);
  ok('geen bestelnummer in de SELECT', /SELECT[\s\S]*?FROM/.exec(script)[0].includes('order_id'), false);
  /* De maand en niet de dag: een citaat dateren op de dag suggereert een
     precisie die niemand nodig heeft, en het is een gegeven minder waarmee een
     bestelling te herleiden is. */
  ok('de datum is een maand', /substr\(updated_at, 1, 7\)/.test(script), true);
  ok('het script schrijft niet als het ophalen mislukte',
    /res\.ok[\s\S]{0,400}process\.exit\(1\)/.test(script), true);
  ok('en kent een --dry om eerst te kijken', /--dry/.test(script), true);
}

console.log('\nde homepage neemt zijn eigen kop terug');
{
  const home = lees('../src/components/HomeV2.astro');
  ok('hij leest de goedgekeurde lijst', /testimonialsToShow\(/.test(home), true);
  ok('de kop hangt aan de data en niet aan een besluit',
    /zegt\.length[\s\S]{0,120}saidH/.test(home), true);
  ok('de eerlijke regel blijft bestaan voor als er niets is', /promiseH/.test(home), true);
  ok('beide koppen staan in twee talen',
    (home.match(/saidH:/g) || []).length, 2);
  ok('en de anonieme naam ook', (home.match(/saidAnon:/g) || []).length, 2);

  /* ARCHITECTURE.md §1: geen client-side ophalen van paginainhoud. Dit blok is
     precies het soort blok waarvoor iemand ooit een fetch wil schrijven. */
  const script = /<script[\s\S]*?<\/script>/g;
  const inline = (home.match(script) || []).join('\n');
  ok('er wordt nergens gefetcht voor dit blok', /fetch\(/.test(inline), false);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
