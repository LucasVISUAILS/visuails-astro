/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE DATUM OP ELKE PAGINA KLOPT, OF STAAT ER NIET  ·  npm run test:gewijzigd
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * scripts/gewijzigd-op.mjs zet een `dateModified` op elke indexeerbare pagina, uit de
 * git-geschiedenis. Er zijn twee manieren waarop dat stil fout gaat, en ze zijn
 * allebei erger dan geen datum:
 *
 *   1 · DE SCANNER LEEST EEN NOOT ALS EEN IMPORT. Deze codebase citeert oude code
 *       letterlijk in reparatienoten, dus er staan regels als
 *       `// Hier stond: import { PACKAGES } from '../data/pricing.js';` in bestanden
 *       die pricing.js niet meer inlezen. Wie daar met een regex overheen gaat, laat
 *       de datum van een pagina verschuiven door een bestand dat hij niet gebruikt.
 *       Dat is precies de val waar dit project al twee keer in is gelopen — een
 *       bewaker die zijn eigen reparatienoot vindt.
 *   2 · GIT KAN DE VRAAG NIET BEANTWOORDEN EN HET SCRIPT DOET ALSOF VAN WEL. Een
 *       ondiepe kloon geeft élk bestand de datum van de laatste commit; dan zegt de
 *       hele site "vandaag bijgewerkt", elke dag opnieuw, en het ziet eruit als een
 *       meting.
 *
 * Vandaar dat het grootste deel hieronder MUTATIETOETSEN zijn: er wordt kapotte
 * invoer aangeboden en er wordt gecontroleerd dat de scanner hem afwijst. Een
 * bewaker die alleen op goede invoer is uitgeprobeerd, bewaakt niets.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { specifiers, ontdaanVanCommentaar, keten, naarBestand } from '../scripts/lib/importketen.mjs';
import { datumInHtml, datumsPerRoute } from '../scripts/gewijzigd-op.mjs';

const WORTEL = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(WORTEL, 'dist');

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

// ─────────────────────────────────────────────────────────────────────────────
console.log('1 · de scanner ziet alleen wat er ECHT geïmporteerd wordt');
// ─────────────────────────────────────────────────────────────────────────────

/* MOETEN GEVONDEN WORDEN. Elke vorm waarin dit project echt importeert. */
const MOET = [
  ["import Layout from '../layouts/Layout.astro';", '../layouts/Layout.astro'],
  ["import { euro } from '../data/pricing.js';", '../data/pricing.js'],
  ["export { x } from './y.js';", './y.js'],
  ["import '../styles/global.css';", '../styles/global.css'],
  ["const m = await import('./laat.js');", './laat.js'],
  ['import {\n  a, b,\n} from "../data/lang.js";', '../data/lang.js'],
];
for (const [bron, verwacht] of MOET) {
  ok(`vindt ${JSON.stringify(bron.slice(0, 34))}…`, specifiers(bron).includes(verwacht), true);
}

/* MOGEN NIET GEVONDEN WORDEN. Dit zijn de mutaties: allemaal look-alikes die een
   regex wél zou pakken. Ze staan stuk voor stuk in deze codebase. */
const MAGNIET = [
  ["// Hier stond: import { PACKAGES } from '../data/oud.js';", 'regelnoot met een oude import'],
  ["/* en `import x from './blok.js'` stond hier ook */", 'bloknoot met een oude import'],
  ["<!-- import y from './html.js' -->", 'HTML-noot met een oude import'],
  ["const u = 'https://visuails.com//data/niet.js';", 'twee schuine strepen in een URL'],
  ["const s = `een sjabloon met import x from './nep.js' erin`;", 'tekst in een sjabloonstring'],
];
for (const [bron, wat] of MAGNIET) {
  const gevonden = specifiers(bron).filter((s) => s.startsWith('.'));
  ok(`negeert ${wat}`, gevonden, []);
}

/* En de omgekeerde controle op de scanner zelf: hij mag geen regels wegwerken. */
ok('behoudt het aantal regels', ontdaanVanCommentaar('a\n// weg\nb\n/* ook\nweg */\nc').split('\n').length, 6);

/* ── DE REGEX-TOESTAND — 4 september 2026 ──────────────────────────────────────
 *
 * Deze zes toetsen zijn er omdat de scanner het vijf maanden lang zonder deed en
 * daar stil op omviel. In src/scripts/pipeline.js staat `/[&<>"']/g`. De scanner
 * kende geen patronen, zag de `"` binnen de tekenklasse, opende daar een string, en
 * las vanaf dat punt de rest van het bestand omgekeerd: commentaar als code en code
 * als commentaar. Elf regels verderop kwam er een REGELCOMMENTAAR uit een zoektocht
 * naar hardgecodeerde tekst — de bewaker vond zijn eigen noot, precies de val die
 * hij bestaat om te vermijden.
 *
 * De eerste vier zijn de fout zelf. De laatste twee zijn de rekening ervoor: een
 * `/` is niet altijd een patroon, en een scanner die te gretig is sleept juist code
 * mee in plaats van commentaar. `</div>` is in dit project veel gewoner dan een
 * deling, dus dat is de mutatie die hier moet staan. */
const teken = (bron, i) => ontdaanVanCommentaar(bron)[i];

ok('een `"` in een tekenklasse opent geen string',
  ontdaanVanCommentaar(`x.replace(/[&<>"']/g, f); // weg`).trimEnd(), 'x.replace(          , f);');
ok('een patroon wordt weggestreept, niet bewaard',
  ontdaanVanCommentaar("const r = /from '.\\/nep.js'/;").includes('nep.js'), false);
ok('en levert dus geen import op', specifiers("const r = /from '.\\/nep.js'/;"), []);
ok('een `/` binnen een tekenklasse sluit het patroon niet',
  ontdaanVanCommentaar('const r = /[/]a/; const na = 1;').includes('const na = 1;'), true);

/* DE ANDERE KANT OP. Zonder deze twee zou "alles na een `/` wegstrepen tot de
   volgende `/`" ook slagen op de vier hierboven, en dat is geen scanner maar een
   schaar. */
ok('deling is geen patroon', ontdaanVanCommentaar('const helft = totaal / 2 / 1;').trim(),
  'const helft = totaal / 2 / 1;');
ok('een sluitende tag is geen patroon',
  ontdaanVanCommentaar('<a href="/x">t</a> <b>/</b>').includes('</a>'), true);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2 · de keten van een echte pagina');
// ─────────────────────────────────────────────────────────────────────────────
const LAYOUT = join(WORTEL, 'src/layouts/Layout.astro');
const stop = new Set([LAYOUT]);
const k = await keten(join(WORTEL, 'src/pages/pricing.astro'), WORTEL, { stop });
ok('/pricing bevat zichzelf', k.includes('src/pages/pricing.astro'), true);
ok('/pricing bevat pricing.js', k.includes('src/data/pricing.js'), true);
ok('/pricing bevat de layout', k.includes('src/layouts/Layout.astro'), true);
/* DE GRENS. Zonder deze regel is de hele constructie zinloos: dan zit alles wat de
   layout inleest in élke keten, en krijgen 97 pagina's dezelfde datum. Zie de kop van
   scripts/gewijzigd-op.mjs voor de telling die dat aantoonde. */
ok('maar NIET wat de layout zelf inleest (interactions.js)',
  k.includes('src/scripts/interactions.js'), false);

const kAbout = await keten(join(WORTEL, 'src/pages/about.astro'), WORTEL, { stop });
/* /about toont geen vragen, dus faq.js hoort niet in zijn keten. Dit is de toets die
   omvalt als de grens wegvalt: dan zit faq.js overal in. */
ok('/about bevat faq.js NIET', kAbout.includes('src/data/faq.js'), false);
ok('maar /faq wél',
  (await keten(join(WORTEL, 'src/pages/faq.astro'), WORTEL, { stop })).includes('src/data/faq.js'), true);

ok('een npm-pakket levert geen bestand op', naarBestand('astro/config', LAYOUT), null);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3 · de datum in de HTML zetten');
// ─────────────────────────────────────────────────────────────────────────────
const HTML = '<html><head><script type="application/ld+json">'
  + '{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":"https://x/#webpage"}]}'
  + '</script></head><body>x</body></html>';
const uit = datumInHtml(HTML, '2026-09-03T10:00:00+02:00');
ok('zet de datum op de knoop met #webpage, ook als het type CollectionPage is',
  /"dateModified":"2026-09-03T10:00:00\+02:00"/.test(uit), true);
ok('laat de rest van de pagina ongemoeid', uit.includes('<body>x</body>'), true);
ok('geen JSON-LD → geen wijziging', datumInHtml('<html></html>', '2026-01-01'), null);
ok('kapotte JSON → geen wijziging',
  datumInHtml('<script type="application/ld+json">{niet json</script>', '2026-01-01'), null);
ok('geen paginaknoop → geen wijziging',
  datumInHtml('<script type="application/ld+json">{"@graph":[{"@type":"Organization"}]}</script>', '2026-01-01'), null);
/* Een `<` in een antwoord mag de scripttag niet vroegtijdig sluiten. Zelfde reden als
   in graphJson(): één kleiner-dan-teken en de rest van het document wordt JavaScript. */
const metPunt = datumInHtml(
  '<script type="application/ld+json">{"@graph":[{"@id":"https://x/#webpage","n":"a \\u003c b"}]}</script>',
  '2026-09-03');
ok('een < in de graph blijft ontsnapt', metPunt.includes('\\u003c') && !/[^\\]<\s*b/.test(metPunt), true);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4 · git, en wat er gebeurt als git het niet weet');
// ─────────────────────────────────────────────────────────────────────────────
let heeftGit = false;
try {
  heeftGit = execFileSync('git', ['rev-parse', '--is-inside-work-tree'],
    { cwd: WORTEL, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() === 'true';
} catch { heeftGit = false; }

if (!heeftGit) {
  /* GEEN GIT IS GEEN FOUT, maar het mag ook geen stilte zijn: zonder git hoort er
     `null` uit te komen en geen enkele datum, en dát is hier de assertie. */
  console.log('   (deze map is geen git-werkmap — de datumtoetsen zouden niets te');
  console.log('    controleren hebben, dus wordt hier alleen gecontroleerd dat het');
  console.log('    script dan NIETS teruggeeft in plaats van iets te verzinnen.)');
  ok('zonder git komt er null uit', await datumsPerRoute({ routes: ['about'] }), null);
} else {
  const datums = await datumsPerRoute({ routes: ['about', 'pricing', 'guides', 'how-it-works'] });
  ok('git levert datums', datums !== null && datums.size > 0, true);
  if (datums) {
    for (const [route, d] of datums) {
      ok(`  ${route} is een geldige ISO-datum`, /^\d{4}-\d{2}-\d{2}T/.test(d), true);
      ok(`  ${route} ligt niet in de toekomst`, new Date(d) <= new Date(), true);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5 · de gebouwde site');
// ─────────────────────────────────────────────────────────────────────────────
if (!existsSync(join(DIST, 'index.html'))) {
  console.log('dist/ ontbreekt — draai eerst `npm run test:bouw`. Deel 5 slaat over.');
} else {
  const lees = (p) => readFileSync(join(DIST, p), 'utf8');
  const graph = (p) => {
    const m = lees(p).match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    return m ? JSON.parse(m[1]) : null;
  };
  const knoop = (p, test) => (graph(p)?.['@graph'] || []).find(test);

  const home = knoop('index.html', (n) => String(n['@id'] || '').endsWith('#webpage'));
  ok('de homepage heeft een paginaknoop', Boolean(home), true);
  ok('  met een naam', typeof home?.name === 'string' && home.name.length > 5, true);
  ok('  die bij de website hoort', home?.isPartOf?.['@id'], 'https://visuails.com/#website');

  /* GEEN PAGINAKNOOP OP EEN noindex-PAGINA. Anders krijgt een bedankpagina een datum
     die niemand ooit leest, en staat hij in de graph alsof hij ergens toe doet. */
  ok('een noindex-pagina heeft er GEEN',
    Boolean(knoop('thank-you/index.html', (n) => String(n['@id'] || '').endsWith('#webpage'))), false);

  /* /guides en /gallery dragen een preciezer type. Op het TYPE toetsen en niet op de
     aanwezigheid, want het is precies dat type waarop de bouwstap NIET zoekt. */
  ok('/guides is een CollectionPage',
    knoop('guides/index.html', (n) => String(n['@id'] || '').endsWith('#webpage'))?.['@type'], 'CollectionPage');
  ok('/gallery is een ImageGallery',
    knoop('gallery/index.html', (n) => String(n['@id'] || '').endsWith('#webpage'))?.['@type'], 'ImageGallery');

  const lijst = knoop('guides/index.html', (n) => n['@type'] === 'ItemList');
  ok('/guides draagt een ItemList', Boolean(lijst), true);
  ok('  met evenveel leden als numberOfItems', lijst?.itemListElement?.length, lijst?.numberOfItems);
  /* ELKE LINK IN DE LIJST MOET OOK OP DE PAGINA STAAN. Dit is de assertie die de hele
     reden voor src/data/guides.js bewaakt: een ItemList die naar iets anders wijst dan
     de kaarten, is een tweede lijst die stil uit elkaar loopt. */
  const guidesHtml = lees('guides/index.html');
  const gemist = (lijst?.itemListElement || [])
    .map((it) => String(it.url).replace('https://visuails.com', ''))
    .filter((href) => !guidesHtml.includes(`href="${href}"`));
  ok('  en elke link staat ook zichtbaar op de pagina', gemist, []);

  const nlLijst = knoop('nl/guides/index.html', (n) => n['@type'] === 'ItemList');
  ok('de Nederlandse lijst wijst naar /nl/-pagina\'s',
    (nlLijst?.itemListElement || []).every((it) => String(it.url).includes('/nl/')), true);

  const howto = knoop('how-it-works/index.html', (n) => n['@type'] === 'HowTo');
  ok('/how-it-works draagt een HowTo', Boolean(howto), true);
  ok('  met zes stappen', howto?.step?.length, 6);
  ok('  elke stap heeft een naam en tekst',
    (howto?.step || []).every((s) => s.name && s.text && s.text.length > 30), true);
  /* GEEN DOORLOOPTIJD. De regel uit de kop van src/data/schema.js: de agenda is het
     enige op deze site dat een dag mag noemen, en een belofte die in een zoekresultaat
     wordt teruggeciteerd is een belofte die nooit langs de agenda is geweest. */
  ok('  en NOOIT een totalTime', 'totalTime' in (howto || {}), false);
  ok('  en geen stap met een plaatje erin',
    (howto?.step || []).some((s) => 'image' in s), false);
  ok('  en er geen HTML in de tekst is achtergebleven',
    (howto?.step || []).some((s) => /<[a-z]/i.test(s.text)), false);

  /* De datums in de build. Ofwel ze staan er op ALLE indexeerbare pagina's, ofwel op
     geen enkele — half is het enige antwoord dat op een fout wijst. */
  const alle = [];
  const loop = (map) => {
    for (const naam of readdirSync(join(DIST, map || '.'))) {
      const rel = map ? `${map}/${naam}` : naam;
      const vol = join(DIST, rel);
      if (statSync(vol).isDirectory()) loop(rel);
      else if (naam.endsWith('.html')) alle.push(rel);
    }
  };
  loop('');
  const indexeerbaar = alle.filter((f) => !/noindex/i.test(lees(f)));
  const metDatum = indexeerbaar.filter((f) => /"dateModified":"/.test(lees(f)));
  ok(`alles of niets: ${metDatum.length} van ${indexeerbaar.length} indexeerbare pagina's`,
    metDatum.length === 0 || metDatum.length === indexeerbaar.length, true);

  if (metDatum.length) {
    const sitemap = lees('sitemap.xml');
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
    const mods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)];
    ok('elke url in de sitemap heeft een <lastmod>', mods.length, locs);
    ok('en geen enkele ligt in de toekomst',
      mods.every((m) => new Date(m[1]) <= new Date()), true);
    /* DE SITEMAP EN DE PAGINA MOETEN HETZELFDE ZEGGEN. De sitemapstap leest de datum
       uit de gebouwde HTML juist om dit te garanderen; deze toets bewijst dat de
       volgorde van de bouwstappen in astro.config.mjs nog klopt. Draait de datumstap
       ná de sitemap, dan is elke <lastmod> hier weg. */
    const homeDatum = (lees('index.html').match(/"dateModified":"([^"]+)"/) || [])[1];
    ok('de sitemap noemt voor de homepage dezelfde dag als de pagina',
      sitemap.includes(`<loc>https://visuails.com/</loc>`) && sitemap.includes(`<lastmod>${homeDatum}</lastmod>`), true);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
