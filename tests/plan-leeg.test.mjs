/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET SCHERM VOOR WIE NOG GEEN ABONNEMENT HEEFT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 28 augustus 2026: *"Als een account nog geen abonnement heeft een
 * scherm plaatsen met iets als, je hebt nog geen abonnement lopen kijk naar de
 * mogelijkheden. Heel simpel houden, intense achtergrond, toegevoegd als
 * afbeelding en tekst en knoppen."*
 *
 * ── WAT HIER BEWEZEN MOET WORDEN, EN WAAROM UITGEREKEND DIT ────────────────
 *
 * Een achtergrondfoto is de stilste manier om een pagina stuk te maken. Staat
 * het pad in de CSS verkeerd, of ligt het bestand er niet, dan komt er geen
 * fout, geen waarschuwing en geen leeg vak — er komt een zwart vlak, en dat ziet
 * eruit als een ontwerp. De bouw zegt er niets over, de browser zegt er niets
 * over, en de enige die het merkt is de klant die het aanbod nooit ziet.
 *
 * Dus: elk `url()` in .leegabo moet wijzen naar een bestand dat in public/
 * bestaat. Verder de dingen die de klant zijn beloofd: dat het scherm ZEGT dat
 * er geen abonnement loopt, en dat er twee wegen naast elkaar staan — naar de
 * abonnementen en naar los bestellen — allebei naar een pagina die er is.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const pad = (p) => fileURLToPath(new URL(p, import.meta.url));
const bron = readFileSync(pad('../src/lib/account.js'), 'utf8');
const css = readFileSync(pad('../public/account.css'), 'utf8');

console.log('\nhet scherm staat er, en het zegt waar het over gaat');
ok('planBody rendert een .leegabo-sectie', /<section class="leegabo">/.test(bron));
ok('met een aanhef die zegt dat er niets loopt', /class="leegabo-eyebrow">\$\{esc\(t\.planNoneEyebrow\)\}/.test(bron));
for (const sleutel of ['planNoneEyebrow', 'planNoneH', 'planNoneBody', 'planNoneCta', 'planNoneAlt']) {
  ok(`${sleutel} staat er in twee talen`,
    (bron.match(new RegExp(`^ {4}${sleutel}:`, 'gm')) || []).length, 2);
}
ok('de Nederlandse aanhef zegt het met zoveel woorden',
  /planNoneEyebrow: 'Je hebt nog geen abonnement lopen'/.test(bron));

console.log('\ntwee knoppen, twee bestaande pagina’s');
ok('de eerste gaat naar de abonnementen',
  /class="btn btn-primary" href="\$\{lang === 'nl' \? '\/nl\/plans' : '\/plans'\}"/.test(bron));
ok('de tweede gaat naar los bestellen',
  /class="btn btn-tweede" href="\$\{lang === 'nl' \? '\/nl\/start' : '\/start'\}"/.test(bron));
for (const p of ['src/pages/plans.astro', 'src/pages/start.astro', 'src/pages/nl/plans.astro', 'src/pages/nl/start.astro']) {
  ok(`${p} bestaat`, existsSync(pad('../' + p)));
}

console.log('\nde achtergrond wijst naar een bestand dat er is');
const blok = css.slice(css.indexOf('.leegabo {'));
const urls = [...blok.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
ok('er staat minstens één achtergrondbeeld in', urls.length > 0);
for (const u of urls) {
  ok(`public${u} ligt er`, existsSync(pad('../public' + u)));
}

console.log('\nde tekst staat niet op de foto zonder iets eronder');
ok('er ligt een verloop over het beeld', /\.leegabo::before/.test(css));
ok('en een eigen verloop voor smalle schermen',
  /@media \(max-width: 700px\) \{[\s\S]{0,400}?\.leegabo::before/.test(css));
/* De globale h2 draagt een onderlijn; op een foto is dat een streep door het
   beeld. Die reset is onderdeel van het ontwerp en niet van de smaak. */
ok('de kop draagt de blokonderlijn niet mee', /\.leegabo h2 \{[\s\S]*?box-shadow: none;/.test(css));

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
