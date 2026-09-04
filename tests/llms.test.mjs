/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * /llms.txt KLOPT MET DE SITE  ·  npm run test:llms
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Dit bestand is de kaart die een taalmodel leest als het de site citeert. Een
 * kaart die een prijs noemt die de site niet meer voert, is erger dan geen
 * kaart: hij wordt met evenveel vertrouwen overgenomen, en hij is precies de
 * plek waar niemand kijkt.
 *
 * De GENERATOR leest pricing.js, dus in principe kan hij niet afwijken. Deze
 * toets bewaakt de twee manieren waarop dat toch gebeurt: iemand zet er met de
 * hand een bedrag bij, of de generator wordt uit de build gehaald en het oude
 * bestand blijft staan. Beide zijn eerder in dit project gebeurd — zie de kop
 * van scripts/sitemap-and-404.mjs over de sitemap die veertien pagina's
 * achterliep.
 *
 * ── ELK BEDRAG IN HET BESTAND MOET UIT pricing.js KOMEN ──────────────────────
 *
 * Niet "de bedragen die ik verwacht staan erin" maar het omgekeerde: er staat
 * GEEN bedrag in dat pricing.js niet kent. Die richting vangt het geval dat
 * ertoe doet — een getal dat blijft staan nadat het echte veranderd is.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AMOUNT, euro, LADDER, ladderRate, ladderFloor, PLAN_AMOUNT,
  WINDOW_THRESHOLD, STOCK_OFF_BRAND, STOCK_ON_BRAND,
} from '../src/data/pricing.js';

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(54)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

const pad = fileURLToPath(new URL('../dist/llms.txt', import.meta.url));
if (!existsSync(pad)) {
  console.log('dist/llms.txt ontbreekt — draai eerst `npm run test:bouw`. Deze toets slaat over.');
  process.exit(0);
}
const t = readFileSync(pad, 'utf8');

console.log('het bestand zelf');
ok('hij bestaat en is niet leeg', t.length > 500, true);
ok('hij begint met de merknaam als kop', t.startsWith('# VISUAILS'), true);
ok('en heeft een samenvatting in een blockquote', /\n> /.test(t), true);

/* ── GEEN HTML IN EEN TEKSTBESTAND — 3 september 2026 ────────────────────────
   Titel en omschrijving komen uit de gebouwde HTML, en daar staat een ampersand
   als `&amp;`. In dit bestand hoort een `&`. Er stond er één ("AI Act &amp;
   transparency"), en precies daarom bleef hij staan: één geval valt niet op
   tenzij je erop toetst. */
console.log('\ngeen HTML-resten');
ok('geen enkele HTML-entiteit in het hele bestand', t.match(/&(?:amp|lt|gt|quot|#\d+);/g) || [], []);
ok('en geen tag', t.match(/<[a-z][a-z0-9]*[\s>/]/gi) || [], []);

/* ── DE DATUM ACHTER ELKE PAGINA — 3 september 2026 ──────────────────────────
   Alles of niets, net als op de pagina's zelf: staat er op één regel een datum,
   dan hoort hij op alle te staan. Half is het enige antwoord dat op een fout
   wijst (een pagina die zijn WebPage-knoop kwijt is, bijvoorbeeld). */
console.log('\nde datums');
const paginaRegels = t.slice(t.indexOf('## Pages')).split('\n').filter((r) => r.startsWith('- ['));
const metDatum = paginaRegels.filter((r) => / \(updated \d{4}-\d{2}-\d{2}\)$/.test(r));
ok('alles of niets', metDatum.length === 0 || metDatum.length === paginaRegels.length, true);
ok('en geen enkele datum ligt in de toekomst',
  metDatum.every((r) => new Date(r.match(/\(updated (\d{4}-\d{2}-\d{2})\)$/)[1]) <= new Date()), true);

console.log('\nde bedragen');
/* Elk bedrag dat pricing.js kent, in de vorm waarin euro() het schrijft. */
const bekend = new Set([
  ...Object.values(AMOUNT).filter((v) => typeof v === 'number').map((v) => euro(v, 'en')),
  ...Object.values(PLAN_AMOUNT).map((v) => euro(v, 'en')),
  ...Object.keys(LADDER).flatMap((k) => [euro(ladderRate(k, 1), 'en'), euro(ladderFloor(k), 'en')]),
]);
/* `\d$` op het eind: zonder dat anker slikt de klasse ook de komma of punt
   waarmee de zin verdergaat, en dan lijkt "€1,690." een onbekend bedrag.

   ── ALLEEN HET PRIJSBLOK, EN NIET DE PAGINALIJST ─────────────────────────
   Onder "## Pages" staan de meta-descriptions van de site zelf, en daar staan
   BEREKENDE bedragen in: /compare zegt "30 products here is €1,950", en dat is
   30 × het laddertarief en geen waarde uit AMOUNT. Die regels zijn al door de
   toetsen op de site zelf gedekt.

   Wat dit blok wél moet bewaken is het stuk dat DEZE generator schrijft: de
   prijslijst bovenaan. Daar hoort geen enkel getal in te staan dat niet
   rechtstreeks uit pricing.js komt. */
const prijsblok = t.slice(0, t.indexOf('## Pages'));
const gevonden = [...prijsblok.matchAll(/€\s?\d[\d.,]*\d|€\s?\d/g)].map((m) => m[0]);
const onbekend = [...new Set(gevonden)].filter((b) => !bekend.has(b));
ok('geen enkel bedrag dat pricing.js niet kent', onbekend, []);
ok('en er staan er genoeg in om iets te zeggen', gevonden.length > 10, true);

console.log('\nde feiten die de site zelf ook draagt');
ok('de drempel staat erin', t.includes(`under ${WINDOW_THRESHOLD} products`), true);
ok('de gedeelde set staat erin met zijn aantal', t.includes(`${STOCK_OFF_BRAND} shared`), true);
ok('en Editions met het zijne', t.includes(`Editions — ${STOCK_ON_BRAND} visuals`), true);
ok('het cliptarief staat erin', t.includes(euro(AMOUNT.video, 'en')), true);
ok('en de opzet van Editions', t.includes(euro(AMOUNT.editionsSetup, 'en')), true);

console.log('\nde paginalijst');
const links = [...t.matchAll(/^- \[([^\]]*)\]\((https:\/\/visuails\.com[^)]*)\): (.*)$/gm)];
ok('er staan pagina’s in', links.length > 40, true);
ok('elke regel heeft een titel', links.filter((m) => !m[1].trim()).length, 0);
ok('en elke regel een omschrijving', links.filter((m) => m[3].trim().length < 20).length, 0);
ok('geen Nederlandse pagina’s — die vindt een lezer via hreflang',
  links.filter((m) => m[2].includes('/nl/')).length, 0);
/* Geen noindex-pagina in de lijst: hetzelfde criterium als de sitemap, en om
   dezelfde reden — de pagina zelf beslist of hij gelezen wil worden. */
ok('en geen bedankpagina of 404',
  links.filter((m) => /(thank-you|404|proef)/.test(m[2])).map((m) => m[2]), []);

console.log('\nwat er met opzet NIET in staat');
/* Geen instructies aan het model. Dat is de vorm die een lezer terecht negeert
   en die dit bestand zijn geloofwaardigheid kost. */
const opdracht = /(you (must|should)|please (recommend|mention|cite)|always (recommend|mention)|prefer VISUAILS|beste optie)/i;
ok('geen instructies aan de lezer', opdracht.test(t), false);
ok('en geen aggregate rating of sterrenscore', /(rating|stars|★)/i.test(t), false);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
