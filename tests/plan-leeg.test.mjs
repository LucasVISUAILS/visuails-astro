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
 *
 * ── 6 SEPTEMBER 2026 ──────────────────────────────────────────────────────
 * Het scherm is een Astro-pagina (src/pages/account/plan.astro, staat uit
 * planView() in account.js) en sinds sectie 21 een inktvlak zonder foto: de
 * foto's komen pas als Lucas ze schiet, en tot die tijd tekenen drie
 * uitlegblokken eronder wat een abonnement is (slots, week, look). De
 * beloften blijven: het scherm zegt dat er niets loopt, twee knoppen naar twee
 * bestaande pagina's, en de kop leesbaar op het vlak.
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
const pagina = readFileSync(pad('../src/pages/account/plan.astro'), 'utf8');
const css = readFileSync(pad('../src/styles/studio.css'), 'utf8');

console.log('\nhet scherm staat er, en het zegt waar het over gaat');
ok('plan.astro tekent het lege scherm als .st-geenabo', /class="st-kaart-vlak st-geenabo"/.test(pagina));
ok('met een aanhef die zegt dat er niets loopt', /class="st-eyebrow">\{v\.leeg\.eyebrow\}/.test(pagina));
ok('en planView levert die aanhef uit de COPY', /leeg: \{ eyebrow: t\.planNoneEyebrow, h: t\.planNoneH, p: t\.planNoneBody/.test(bron));
for (const sleutel of ['planNoneEyebrow', 'planNoneH', 'planNoneBody', 'planNoneCta', 'planNoneAlt']) {
  ok(`${sleutel} staat er in twee talen`,
    (bron.match(new RegExp(`^ {4}${sleutel}:`, 'gm')) || []).length, 2);
}
ok('de Nederlandse aanhef zegt het met zoveel woorden',
  /planNoneEyebrow: 'Je hebt nog geen abonnement lopen'/.test(bron));

console.log('\ntwee knoppen, twee bestaande pagina’s');
ok('de eerste gaat naar de abonnementen',
  /ctaHref: lang === 'nl' \? '\/nl\/plans' : '\/plans'/.test(bron) && /class="btn btn-primary" href=\{v\.leeg\.ctaHref\}/.test(pagina));
ok('de tweede gaat naar los bestellen',
  /altHref: lang === 'nl' \? '\/nl\/start' : '\/start'/.test(bron) && /class="btn btn-2nd" href=\{v\.leeg\.altHref\}/.test(pagina));
for (const p of ['src/pages/plans.astro', 'src/pages/start.astro', 'src/pages/nl/plans.astro', 'src/pages/nl/start.astro']) {
  ok(`${p} bestaat`, existsSync(pad('../' + p)));
}

console.log('\nhet vlak is leesbaar, en er staat uitleg onder');
ok('het vlak is inkt', /\.st-geenabo \{[^}]*background: var\(--ink-900\)/.test(css));
ok('en de kop erop is wit', /\.st-geenabo h2 \{[^}]*color: #FFFFFF/.test(css));
ok('de drie uitlegblokken staan onder het vlak', (pagina.match(/class="st-kaart-vlak st-vlak st-uitleg-blok"/g) || []).length, 3);
for (const sleutel of ['planVisSlotsH', 'planVisWeekH', 'planVisLookH']) {
  ok(`${sleutel} staat er in twee talen`, (bron.match(new RegExp(`^ {4}${sleutel}:`, 'gm')) || []).length, 2);
}
ok('en de voorbeeldweek komt uit planView, ook zonder abonnement', /weekstrip: Array\.from\(\{ length: 28 \}/.test(bron));

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
