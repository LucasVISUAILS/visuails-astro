/*
 * "VANAF" IS OVERAL DE ONDERSTE TREDE — naloop A2, 8 oktober 2026
 *
 * De voorpagina zei "vanaf €89" en "vanaf €109", /start en /lifestyle "Vanaf €39"
 * en "Vanaf €49", en de Classic-kaart op /catalog weer "vanaf €89". Dat spreekt
 * elkaar tegen. Nu: elk "vanaf €…"/"from €…" op deze vier pagina's is de onderste
 * trede uit pricing.js (ladderFloor), en elke pagina draagt dezelfde ene
 * uitlegregel die zegt wat één product kost (eenProductRegel()).
 *
 * Leest de GEBOUWDE pagina's (dist/), dus eerst bouwen:
 *   $S/zwaar.sh npx astro build && node tests/vanaf-bedragen.test.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { ladderFloor, ladderRate, euro, eenProductRegel, aboVanafPerProduct } from '../src/data/pricing.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(76)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
const pad = (p) => new URL(`../${p}`, import.meta.url);
const lees = (p) => readFileSync(pad(p), 'utf8');

/* Zichtbare tekst: zonder <script>/<style>/<head>, zonder tags, entiteiten terug. */
function tekst(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"')
    .replace(/&euro;/g, '€')
    .replace(/[  ]/g, ' ')
    .replace(/\s+/g, ' ');
}

console.log('\nde regel zelf (pricing.js)');
ok('NL, beide diensten: precies de regel die /start had',
  eenProductRegel('nl'),
  `Eén product kost ${euro(ladderRate('catalog', 1), 'nl')} bij catalog of ${euro(ladderRate('lifestyle', 1), 'nl')} bij lifestyle; het tarief zakt naarmate je meer bestelt, tot het bedrag hierboven vanaf 20 producten.`);
ok('EN, één dienst noemt alleen dat bedrag', eenProductRegel('en', ['lifestyle']).startsWith(`One product costs ${euro(ladderRate('lifestyle', 1), 'en')};`));

const PAGINAS = [
  /* De voorpagina is sinds 12 oktober 2026 de hal. Daar staat de korte vorm van
     dezelfde regel, die Lucas in afvinklijst 5 akkoord gaf ("Eén product: €89
     (catalog) of €109 (lifestyle). Meer producten, lager tarief."): dezelfde twee
     bedragen uit dezelfde ladder, alleen zonder de bijzin. Zie `kort()` hieronder. */
  { url: '/', file: 'dist/index.html', taal: 'en', diensten: ['catalog', 'lifestyle'], kort: true },
  { url: '/nl/', file: 'dist/nl/index.html', taal: 'nl', diensten: ['catalog', 'lifestyle'], kort: true },
  { url: '/start', file: 'dist/start/index.html', taal: 'en', diensten: ['catalog', 'lifestyle'] },
  { url: '/nl/start', file: 'dist/nl/start/index.html', taal: 'nl', diensten: ['catalog', 'lifestyle'] },
  { url: '/catalog', file: 'dist/catalog/index.html', taal: 'en', diensten: ['catalog'] },
  { url: '/nl/catalog', file: 'dist/nl/catalog/index.html', taal: 'nl', diensten: ['catalog'] },
  { url: '/lifestyle', file: 'dist/lifestyle/index.html', taal: 'en', diensten: ['lifestyle'] },
  { url: '/nl/lifestyle', file: 'dist/nl/lifestyle/index.html', taal: 'nl', diensten: ['lifestyle'] },
];

if (!existsSync(pad('dist/nl/start/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}

/* De korte vorm op de voorpagina (VoorpaginaHal.astro, `eenProduct`). */
const kort = (taal) => taal === 'nl'
  ? `Eén product: ${euro(ladderRate('catalog', 1), 'nl')} (catalog) of ${euro(ladderRate('lifestyle', 1), 'nl')} (lifestyle). Meer producten, lager tarief.`
  : `One product: ${euro(ladderRate('catalog', 1), 'en')} (catalog) or ${euro(ladderRate('lifestyle', 1), 'en')} (lifestyle). More products, a lower rate.`;

const vloeren = new Set(['catalog', 'lifestyle'].flatMap((k) => [euro(ladderFloor(k), 'nl'), euro(ladderFloor(k), 'en')]).map((s) => s.replace(/\s/g, '')));
const instap = new Set(['catalog', 'lifestyle'].flatMap((k) => [euro(ladderRate(k, 1), 'nl'), euro(ladderRate(k, 1), 'en')]).map((s) => s.replace(/\s/g, '')));

for (const p of PAGINAS) {
  console.log(`\n${p.url}`);
  const t = tekst(lees(p.file));
  /* Elk "vanaf €…" / "from €…" met een productprijs erachter. "per maand" en
     "per month" (abonnement) en "per hook" horen er niet bij. */
  /* Sinds 15 oktober 2026 (levering 49, k-klant) staat op /start onder elke prijs ook
     "Of vanaf €… per product met een abonnement" / "Or from €… per product with a
     plan". Dat is een ander bedrag (aboVanafPerProduct, het voordeligste tarief per
     credit) en hoort niet bij de ladder: apart nagelopen hieronder. */
  const ABO = /^\s*per\s+product\s+(?:met\s+een\s+abonnement|with\s+a\s+plan)/i;
  const alle = [...t.matchAll(/\b(?:vanaf|from)\s+(€\s?[\d.,]+)(?!\s*(?:per\s+(?:maand|month|hook)|\/\s*(?:maand|month)))/gi)];
  const isAbo = (m) => ABO.test(t.slice(m.index + m[0].length, m.index + m[0].length + 60));
  const vanaf = alle.filter((m) => !isAbo(m)).map((m) => m[1].replace(/\s/g, ''));
  const abo = alle.filter(isAbo).map((m) => m[1].replace(/\s/g, ''));
  if (abo.length) {
    const mag = new Set(p.diensten.map((k) => euro(aboVanafPerProduct(k), p.taal).replace(/\s/g, '')));
    ok(`${p.url}: de abonnementsregel is aboVanafPerProduct (${[...new Set(abo)].join(', ')})`, abo.every((b) => mag.has(b)));
  }
  ok(`${p.url}: er staat minstens één vanaf-bedrag`, vanaf.length > 0);
  ok(`${p.url}: elk vanaf-bedrag is de onderste trede (${[...new Set(vanaf)].join(', ')})`, vanaf.every((b) => vloeren.has(b)));
  ok(`${p.url}: nergens "vanaf" met het tarief van één product`, vanaf.filter((b) => instap.has(b)), []);
  ok(`${p.url}: de ene uitlegregel staat er${p.kort ? ' (de korte vorm)' : ''}`, t.includes(p.kort ? kort(p.taal) : eenProductRegel(p.taal, p.diensten)));
}

console.log('\nde bron');
/* Sinds 12 oktober 2026 is de voorpagina VoorpaginaHal.astro (de hal). */
const vp = lees('src/components/VoorpaginaHal.astro');
ok('voorpagina: geen AMOUNT.catalog/lifestyle meer achter "vanaf"/"from"', /(?:vanaf|from) \$\{e\(AMOUNT\.(?:catalog|lifestyle)\)\}/i.test(vp), false);
ok('Classic-kaart: cardPrice uit ladderFloor', /const CAT_KAART = `From \$\{euro\(ladderFloor\('catalog'\), 'en'\)\}/.test(lees('src/data/catalogStyles.js'))
  && /const CAT_KAART = `Vanaf \$\{euro\(ladderFloor\('catalog'\), 'nl'\)\}/.test(lees('src/data/catalogStyles.nl.js')));
ok('/start gebruikt eenProductRegel()', /ladder: eenProductRegel\('en'\)/.test(lees('src/components/StartHal.astro')) && /ladder: eenProductRegel\('nl'\)/.test(lees('src/components/StartHal.astro')));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
