/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE JURIDISCHE PAGINA'S: DATUM, OPMAAK EN OPBOUW  ·  npm run test:juridischedatums
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Begonnen als een toets op één ding — de datumregel — en uitgegroeid tot de plek
 * waar de vijf juridische documenten als GROEP worden bewaakt. Dat is geen
 * scope-creep maar hetzelfde probleem drie keer: vijf pagina's die er hetzelfde uit
 * horen te zien, en waar niets afgaat als er eentje uit de pas loopt. Dat is
 * inmiddels drie keer gebeurd (de datum, de opmaak, de opbouw) en drie keer heeft
 * een mens het op het scherm moeten zien.
 *
 * Vijf documenten, twee talen, en tot 3 september 2026 stond de datum tien keer met de
 * hand uitgetypt. Dat is geen netheidskwestie: /terms kreeg op 2 september een nieuwe
 * paragraaf 8 en bleef "augustus 2026" zeggen. Bij voorwaarden is die regel de enige
 * manier waarop een klant kan zien wélke versie hij heeft geaccepteerd.
 *
 * Deze toets bewaakt twee dingen die allebei stil misgaan:
 *
 *   1 · DAT ER GEEN ELFDE KOPIE BIJKOMT. Er mag nergens in src/ nog een uitgetypte
 *       "Last updated: <maand> <jaar>" staan. Dat is de assertie in de richting die
 *       telt: niet "de goede datums staan erin" maar "er staat er geen die niet uit
 *       src/data/juridischeDatums.js komt".
 *   2 · DAT DE DATUM NIET STIL VEROUDERT. De datum blijft een besluit van een mens —
 *       zie de kop van dat databestand voor waarom hij níét uit git komt — maar git
 *       weet wél wanneer het bestand voor het laatst is aangeraakt. Is die maand
 *       NIEUWER dan wat er staat, dan valt deze toets om met de naam van het document
 *       erbij. Zo blijft het een keuze en kan hij toch niet verlopen.
 *
 * Wat deze toets NIET doet: eisen dat de datum gelijk is aan git. Een commit die een
 * klassenaam wijzigt, verandert de tekst niet, en de datum hoort dan te blijven staan.
 * Alleen "ouder dan git" is fout.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { join, resolve, relative, sep } from 'node:path';
import { LAATST_BIJGEWERKT, bijgewerktOp } from '../src/data/juridischeDatums.js';
import { ontdaanVanCommentaar } from '../scripts/lib/importketen.mjs';

const WORTEL = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = join(WORTEL, 'src');
const DIST = join(WORTEL, 'dist');

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

/* Het bronbestand per document, in beide talen. Dit is de lijst die de git-controle
   hieronder afgaat; staat er een document in LAATST_BIJGEWERKT dat hier niet in staat,
   dan valt de eerste toets om — anders zou een nieuw document ongemerkt buiten de
   bewaking vallen. */
const BRONNEN = {
  terms: ['src/pages/terms.astro', 'src/pages/nl/terms.astro'],
  privacy: ['src/pages/privacy.astro', 'src/pages/nl/privacy.astro'],
  'cookie-policy': ['src/pages/cookie-policy.astro', 'src/pages/nl/cookie-policy.astro'],
  'data-processing-agreement': [
    'src/pages/data-processing-agreement.astro', 'src/pages/nl/data-processing-agreement.astro'],
  'ai-act': ['src/components/AiActPage.astro'],
};

console.log('1 · één bron, geen elfde kopie');
ok('elk document in de tabel heeft een bronbestand',
  Object.keys(LAATST_BIJGEWERKT).filter((d) => !BRONNEN[d]), []);
ok('en andersom', Object.keys(BRONNEN).filter((d) => !LAATST_BIJGEWERKT[d]), []);

const MAANDEN = 'January|February|March|April|May|June|July|August|September|October|November|December'
  + '|januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december';
const UITGETYPT = new RegExp(`(?:Last updated|Laatst bijgewerkt):\\s*(?:${MAANDEN})\\s+\\d{4}`);

function alleBestanden(dir, out = []) {
  for (const naam of readdirSync(dir)) {
    const vol = join(dir, naam);
    if (statSync(vol).isDirectory()) alleBestanden(vol, out);
    else if (/\.(astro|js|ts|mjs)$/.test(naam)) out.push(vol);
  }
  return out;
}
const zondaars = alleBestanden(SRC)
  .filter((f) => f !== join(SRC, 'data', 'juridischeDatums.js'))
  .filter((f) => UITGETYPT.test(readFileSync(f, 'utf8')))
  .map((f) => relative(WORTEL, f).split(sep).join('/'));
ok('geen enkel bronbestand typt de datum zelf uit', zondaars, []);

/* En de mutatiecontrole op die regex: hij moet wél afgaan op de vorm die hij zoekt.
   Een bewaker die niets vindt omdat hij niets kán vinden, is de gevaarlijkste soort. */
ok('de zoekterm herkent de oude vorm wél', UITGETYPT.test('Last updated: August 2026'), true);
ok('en de Nederlandse ook', UITGETYPT.test('Laatst bijgewerkt: augustus 2026'), true);

console.log('\n2 · de vorm van de regel');
ok('Engels', bijgewerktOp('terms', 'en'), 'Last updated: September 2026');
ok('Nederlands, met een kleine maand', bijgewerktOp('terms', 'nl'), 'Laatst bijgewerkt: september 2026');
ok('met een achtervoegsel', bijgewerktOp('data-processing-agreement', 'en', 'Article 28 GDPR'),
  'Last updated: September 2026 · Article 28 GDPR');
let wierp = false;
try { bijgewerktOp('bestaat-niet', 'en'); } catch { wierp = true; }
ok('een onbekend document werpt in plaats van iets leegs te tonen', wierp, true);

const nu = new Date();
const dezeMaand = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, '0')}`;
for (const [doc, maand] of Object.entries(LAATST_BIJGEWERKT)) {
  ok(`${doc} heeft de vorm JJJJ-MM`, /^\d{4}-(0[1-9]|1[0-2])$/.test(maand), true);
  ok(`${doc} ligt niet in de toekomst`, maand <= dezeMaand, true);
}

console.log('\n3 · en hij is niet stil verouderd (via git)');
const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: WORTEL, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
};
if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') {
  console.log('   (geen git-werkmap — deze drie controles hebben hier niets te vergelijken.)');
} else {
  for (const [doc, bestanden] of Object.entries(BRONNEN)) {
    let nieuwste = null;
    for (const b of bestanden) {
      const d = git(['log', '-1', '--format=%cI', '--', b]);
      if (d && (!nieuwste || d > nieuwste)) nieuwste = d;
    }
    if (!nieuwste) { console.log(`   (${doc}: git kent deze bestanden nog niet — overgeslagen)`); continue; }
    const gitMaand = nieuwste.slice(0, 7);
    const gesteld = LAATST_BIJGEWERKT[doc];
    const goedZo = gesteld >= gitMaand;
    totaal++;
    if (goedZo) { goed++; console.log(` ok   ${doc.padEnd(30)} staat op ${gesteld}, git zag ${gitMaand}`); } else {
      console.log(`FAIL  ${doc.padEnd(30)} staat op ${gesteld}, maar git zag een wijziging in ${gitMaand}.`);
      console.log(`      Zet LAATST_BIJGEWERKT['${doc}'] in src/data/juridischeDatums.js op '${gitMaand}'`);
      console.log('      als de TEKST is veranderd. Was het alleen opmaak, commit dan de datum');
      console.log('      opnieuw mee — of pas de tabel aan; dit is met opzet een besluit en geen automaat.');
    }
  }
}

console.log('\n4 · en de gebouwde pagina toont hem');
if (!existsSync(join(DIST, 'index.html'))) {
  console.log('dist/ ontbreekt — draai eerst `npm run test:bouw`. Deel 4 slaat over.');
} else {
  const PAGINAS = {
    terms: 'terms', privacy: 'privacy', 'cookie-policy': 'cookie-policy',
    'data-processing-agreement': 'data-processing-agreement', 'ai-act': 'ai-act',
  };
  for (const [doc, route] of Object.entries(PAGINAS)) {
    for (const [taal, pad] of [['en', `${route}/index.html`], ['nl', `nl/${route}/index.html`]]) {
      const vol = join(DIST, pad);
      if (!existsSync(vol)) { ok(`${pad} bestaat`, false, true); continue; }
      const html = readFileSync(vol, 'utf8');
      const verwacht = bijgewerktOp(doc, taal).split(' · ')[0];
      ok(`${pad} toont "${verwacht}"`, html.includes(verwacht), true);
    }
  }
}

console.log('\n5 · en de opmaak komt uit één bestand');
/*
 * ── WAAROM DIT HIER STAAT — 3 september 2026 ────────────────────────────────
 *
 * Zes juridische documenten deelden één opmaakblok, uitgetypt in zes bestanden.
 * Op 24 augustus is het uit drie ervan gehaald met een noot dat het naar
 * global.css verhuisde — en dat is nooit gebeurd. Astro scopeert een <style> in
 * een pagina aan díé pagina, dus /privacy, /cookie-policy en de
 * verwerkersovereenkomst stonden vanaf dat moment met koppen van 52,8px waar de
 * andere drie er 24 hadden. In beide talen, twee weken lang, en niemand die het
 * zag: elke pagina had haar eigen kopie om op terug te vallen, dus er ging niets
 * kapot dat je op één plek kon merken.
 *
 * Dat is dezelfde constructie als de datum hierboven, en dus dezelfde toets:
 * ÉÉN bron, en het bewijs dat er niet stiekem een tweede bij komt.
 */
const CSS_BRON = join(WORTEL, 'src', 'styles', 'global.css');
ok('global.css draagt de gedeelde .legal-opmaak',
  /\.legal h2\s*\{/.test(readFileSync(CSS_BRON, 'utf8')), true);
/* En geen enkel pagina- of componentbestand herhaalt hem. Dit is de assertie die
   de fout van 24 augustus zou hebben gevangen: toen stond hij nog in drie.

   DOOR ontdaanVanCommentaar() HEEN, en dat is niet netjesheid. De eerste versie
   las de ruwe tekst en meldde CatalogPage.astro — dat bestand noemt `.legal a` in
   een noot over linkkleuren en declareert de regel nergens. Dat is exact de val
   waar scripts/lib/importketen.mjs voor bestaat: deze codebase citeert code in
   commentaar, dus een bewaker die de ruwe tekst leest, vindt zijn eigen
   reparatienoot. Dezelfde scanner, dezelfde mutatietoetsen, één plek. */
const herhalers = alleBestanden(SRC)
  .filter((f) => /\.(astro)$/.test(f))
  .filter((f) => /^\s*\.legal[ -](h2|h3|p|ul|a|meta)[^\n]*\{/m
    .test(ontdaanVanCommentaar(readFileSync(f, 'utf8'))))
  .map((f) => relative(WORTEL, f).split(sep).join('/'));
ok('geen enkele pagina herhaalt hem', herhalers, []);

if (existsSync(join(DIST, 'index.html'))) {
  /* En in de BUILD staat hij precies één keer. Een broncontrole alleen zou een
     tweede kopie missen die via een ander bestand binnenkomt. */
  const cssDir = join(DIST, '_astro');
  const treffers = readdirSync(cssDir).filter((f) => f.endsWith('.css'))
    .filter((f) => /\.legal h2\s*\{/.test(readFileSync(join(cssDir, f), 'utf8')));
  ok('en in de gebouwde CSS precies één keer', treffers.length, 1);
  /* De vijf documenten die de klasse dragen, dragen hem alle vijf — in beide
     talen. Zonder deze regel zou een pagina de opmaak kunnen verliezen door de
     KLASSE te verliezen in plaats van de CSS, en dat ziet er in de bron net zo
     onschuldig uit. */
  const zonderKlasse = [];
  for (const route of ['terms', 'privacy', 'cookie-policy', 'data-processing-agreement', 'ai-act']) {
    for (const pad of [`${route}/index.html`, `nl/${route}/index.html`]) {
      const vol = join(DIST, pad);
      if (!existsSync(vol)) { zonderKlasse.push(`${pad} (bestaat niet)`); continue; }
      if (!/class="[^"]*\blegal\b/.test(readFileSync(vol, 'utf8'))) zonderKlasse.push(pad);
    }
  }
  ok('elke juridische pagina draagt de klasse `legal`', zonderKlasse, []);
}

console.log('\n6 · en de vijf documenten zijn hetzelfde opgebouwd');
/*
 * ── WAAROM DIT ERBIJ KWAM — 3 september 2026 ────────────────────────────────
 *
 * Lucas keek naar /nl/data-processing-agreement en zag wat de meting bevestigde:
 * de tekst plakte aan elkaar. Dat was de opmaakfout uit deel 5. Maar bij het
 * naast elkaar leggen van alle tien de pagina's bleek er nog iets:
 *
 *   · /cookie-policy had als enige GEEN `lead` onder de titel — de ene zin die
 *     zegt waar het document over gaat. De vier andere hebben hem alle vier.
 *   · en hij was anders GEBOUWD: elke alinea in een eigen <div>, `stack-lg` op de
 *     wikkel, en acht losse `style="margin-top:…"`. Gemeten gaf dat 9,6px waar de
 *     rest 14,4px heeft. Een tweede ritme naast het gedeelde ritme.
 *
 * Een handgezette marge is geen fout op de dag dat je hem zet — hij wordt er een
 * op de dag dat `.legal` verandert en hij niet meeverandert. Vandaar dat dit op de
 * VORM toetst en niet op de uitkomst: geen enkele marge met de hand in de body.
 */
const DOCUMENTEN = {
  terms: ['src/pages/terms.astro', 'src/pages/nl/terms.astro'],
  privacy: ['src/pages/privacy.astro', 'src/pages/nl/privacy.astro'],
  'cookie-policy': ['src/pages/cookie-policy.astro', 'src/pages/nl/cookie-policy.astro'],
  'data-processing-agreement': [
    'src/pages/data-processing-agreement.astro', 'src/pages/nl/data-processing-agreement.astro'],
  'ai-act': ['src/components/AiActPage.astro'],
};
for (const [doc, bestanden] of Object.entries(DOCUMENTEN)) {
  for (const rel of bestanden) {
    const bron = ontdaanVanCommentaar(readFileSync(join(WORTEL, rel), 'utf8'));
    const heeft = (re) => re.test(bron);
    /* ── ALLEEN IN DE KOP, EN IN DEZE VOLGORDE ────────────────────────────
       De eerste versie zocht deze vier in het HELE bestand, en die liet zich
       betrappen: ik haalde `class="lead"` uit de kop van /privacy weg en de toets
       bleef groen, omdat de afsluitende cta-band ook een `.lead` heeft. Een
       bewaker die het goede woord op de verkeerde plek accepteert, bewaakt de
       plek niet. Dus: binnen `.page-hero`, en op VOLGORDE — rubriek, titel, de
       ene zin die zegt waar het document over gaat, en dan de datum. */
    const heroStart = bron.indexOf('class="page-hero"');
    const hero = heroStart === -1 ? '' : bron.slice(heroStart, bron.indexOf('</section>', heroStart));
    const posities = ['eyebrow-page', 'h1 class="display"', 'class="lead"', 'class="legal-meta"']
      .map((deel) => [deel, hero.indexOf(deel)]);
    ok(`${rel} · kop draagt rubriek, titel, lead, datum`,
      posities.filter(([, i]) => i === -1).map(([d]) => d), []);
    ok(`${rel} · en in die volgorde`,
      posities.every(([, i], n) => n === 0 || i > posities[n - 1][1]), true);
    ok(`${rel} · body in .container.narrow.legal`,
      heeft(/class="container narrow legal"/), true);
    /* Geen tweede ritme naast `.legal`: geen `stack-lg` op de wikkel, en geen
       handgezette marge op iets in de body. De lead in de HERO mag er één hebben —
       die staat op alle vijf identiek en hoort bij de kop, niet bij het document. */
    ok(`${rel} · geen stack-lg op de wikkel`, heeft(/legal[^"]*stack-lg|stack-lg[^"]*legal/), false);
    /* ALLEEN DE BODY, en niet alles wat erna komt. De eerste versie van deze
       regel las tot het einde van het bestand en meldde vier keer de knoppenrij van
       de afsluitende cta-band — die staat buiten het document en heeft met het
       leesritme niets te maken. Een bewaker die ruis geeft, wordt weggeklikt. */
    const vanaf = bron.indexOf('container narrow legal');
    const tot = bron.indexOf('</section>', vanaf);
    const naBody = bron.slice(vanaf, tot === -1 ? undefined : tot);
    const handmarges = [...naBody.matchAll(/style="[^"]*margin-top[^"]*"/g)].map((m) => m[0]);
    ok(`${rel} · geen handgezette marge in de body`, handmarges, []);
    /* En geen eigen h1-maat. `.page-hero h1` in global.css zet hem; twintig
       pagina's hadden daar een inline kopie van staan die precies hetzelfde deed.
       Gemeten op 95 pagina's × 2 breedtes vóór en na het weghalen: geen verschil. */
    ok(`${rel} · geen eigen h1-maat`, heeft(/font-size:\s*var\(--t-page-h1\)/), false);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
