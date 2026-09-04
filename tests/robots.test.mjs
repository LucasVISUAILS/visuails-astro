/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * robots.txt ZEGT WAT WE BEDOELEN  ·  npm run test:robots
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Sinds 3 september 2026 staan de AI-crawlers met naam in public/robots.txt. Ze mogen
 * alles, net als daarvoor — het verschil is dat het nu een KEUZE is en geen gevolg van
 * de sterregel. Zie de kop van dat bestand.
 *
 * Een eigen blok per bot heeft één bijwerking die je moet weten om hem niet per
 * ongeluk te maken: een crawler leest PRECIES ÉÉN groep, namelijk die van zijn eigen
 * naam als die er staat. De `Disallow: /thank-you` onder `User-agent: *` geldt dus
 * niet meer voor GPTBot. Dat is hier bewust — de bedankpagina beschermt zichzelf met
 * een noindex in de pagina — en deze toets legt die redenering vast, zodat hij niet
 * per ongeluk wordt weggenomen door de meta-tag ergens weg te halen.
 *
 * Er staat hier met opzet GEEN lijst van "de bots die erin horen te staan". Zo'n lijst
 * zou de tweede lijst zijn die achterloopt; deze toets leest de namen uit het bestand
 * en controleert of elke groep die er staat ook doet wat hij lijkt te doen.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const WORTEL = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BRON = join(WORTEL, 'public', 'robots.txt');
const DIST = join(WORTEL, 'dist');

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

const tekst = readFileSync(BRON, 'utf8');

/**
 * robots.txt ontleden zoals een crawler het doet: opeenvolgende User-agent-regels
 * horen bij dezelfde groep, en een regel zonder groep telt niet mee.
 */
function ontleed(t) {
  const groepen = [];
  let huidig = null;
  let netNaam = false;
  const los = [];
  for (const ruw of t.split('\n')) {
    const regel = ruw.replace(/#.*$/, '').trim();
    if (!regel) continue;
    const [sleutelRuw, ...rest] = regel.split(':');
    const sleutel = sleutelRuw.trim().toLowerCase();
    const waarde = rest.join(':').trim();
    if (sleutel === 'user-agent') {
      if (!huidig || !netNaam) { huidig = { namen: [], regels: [] }; groepen.push(huidig); }
      huidig.namen.push(waarde.toLowerCase());
      netNaam = true;
      continue;
    }
    if (sleutel === 'allow' || sleutel === 'disallow') {
      if (!huidig) { los.push(regel); continue; }
      huidig.regels.push([sleutel, waarde]);
      netNaam = false;
      continue;
    }
    // sitemap, host en de rest zijn groepsloze velden en horen nergens bij
    netNaam = false;
  }
  return { groepen, los };
}

/** Mag `bot` dit pad ophalen? Langste passende regel wint; bij gelijk spel Allow. */
function magHalen(t, bot, pad) {
  const { groepen } = ontleed(t);
  const naam = bot.toLowerCase();
  const eigen = groepen.find((g) => g.namen.includes(naam));
  const groep = eigen || groepen.find((g) => g.namen.includes('*'));
  if (!groep) return true;
  let beste = null;
  for (const [soort, waarde] of groep.regels) {
    if (waarde === '' && soort === 'disallow') continue;   // "Disallow:" leeg = alles mag
    if (!pad.startsWith(waarde)) continue;
    if (!beste || waarde.length > beste[1].length || (waarde.length === beste[1].length && soort === 'allow')) {
      beste = [soort, waarde];
    }
  }
  return beste ? beste[0] === 'allow' : true;
}

const { groepen, los } = ontleed(tekst);

console.log('1 · het bestand is geldig');
ok('geen Allow of Disallow buiten een groep', los, []);
ok('er is een groep voor iedereen', groepen.some((g) => g.namen.includes('*')), true);
ok('elke groep heeft ten minste één regel', groepen.filter((g) => !g.regels.length).map((g) => g.namen), []);
ok('geen enkele naam staat in twee groepen',
  (() => {
    const gezien = new Set(); const dubbel = [];
    for (const g of groepen) for (const n of g.namen) { if (gezien.has(n)) dubbel.push(n); gezien.add(n); }
    return dubbel;
  })(), []);
ok('er staat één Sitemap-regel', (tekst.match(/^Sitemap:/gm) || []).length, 1);
ok('en die wijst naar de sitemap die de build maakt',
  /^Sitemap: https:\/\/visuails\.com\/sitemap\.xml$/m.test(tekst), true);

console.log('\n2 · de AI-crawlers staan met naam in het bestand');
/* Uit het bestand gelezen, niet uit een lijst hier: elke groep die niet `*` is. */
const metNaam = groepen.flatMap((g) => g.namen).filter((n) => n !== '*');
ok(`er staan er ${metNaam.length}`, metNaam.length >= 10, true);
/* De vier waar het om ging in de doorlichting. Deze VIER staan hier wél uitgeschreven,
   want de vraag was letterlijk "wordt GPTBot toegelaten of niet" — en een toets die
   dat niet bij naam noemt, beantwoordt de vraag niet. */
for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
  ok(`${bot} heeft een eigen regel`, metNaam.includes(bot.toLowerCase()), true);
}

console.log('\n3 · en ze mogen daadwerkelijk lezen');
for (const bot of metNaam) {
  ok(`${bot} mag de homepage`, magHalen(tekst, bot, '/'), true);
  ok(`${bot} mag /pricing`, magHalen(tekst, bot, '/pricing/'), true);
}
/* De mutatiecontrole op de ontleder: als hij Allow en Disallow niet uit elkaar houdt,
   is alles hierboven waardeloos. */
ok('de ontleder ziet een Disallow wél',
  magHalen('User-agent: GPTBot\nDisallow: /\n', 'GPTBot', '/pricing/'), false);
ok('en de langste regel wint',
  magHalen('User-agent: *\nDisallow: /\nAllow: /pricing\n', 'Onbekend', '/pricing/'), true);
ok('een onbekende bot valt terug op de sterregel',
  magHalen(tekst, 'EenNieuweBotDieNietBestaat', '/'), true);

console.log('\n4 · /thank-you');
ok('staat op Disallow voor de sterregel', magHalen(tekst, 'EenOnbekendeBot', '/thank-you/'), false);
/* De bijwerking van eigen blokken, met zoveel woorden: voor de bots met een eigen
   groep geldt die Disallow NIET meer. */
ok('en NIET voor GPTBot — die leest alleen zijn eigen groep',
  magHalen(tekst, 'GPTBot', '/thank-you/'), true);
if (existsSync(join(DIST, 'thank-you', 'index.html'))) {
  /* …en dát is alleen ongevaarlijk zolang de pagina zichzelf beschermt. Dit is de
     assertie die de redenering in robots.txt waarmaakt in plaats van beweert. */
  for (const p of ['thank-you/index.html', 'nl/thank-you/index.html']) {
    ok(`  ${p} staat zelf op noindex`,
      /<meta name="robots" content="[^"]*noindex/i.test(readFileSync(join(DIST, p), 'utf8')), true);
  }
} else {
  console.log('dist/ ontbreekt — de noindex-controle slaat over. Draai `npm run test:bouw`.');
}

console.log('\n5 · het bestand komt ongewijzigd in de build');
if (existsSync(join(DIST, 'robots.txt'))) {
  ok('dist/robots.txt is gelijk aan public/robots.txt',
    readFileSync(join(DIST, 'robots.txt'), 'utf8'), tekst);
} else {
  ok('dist/robots.txt bestaat', false, true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
