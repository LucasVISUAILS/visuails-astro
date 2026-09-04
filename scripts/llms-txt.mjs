/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * /llms.txt — DE SITE, UITGELEGD AAN IETS DAT HEM CITEERT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Een zoekmachine RANGSCHIKT pagina's; een taalmodel dat een vraag beantwoordt
 * haalt er een ANTWOORD uit en noemt een bron. Voor het tweede telt iets anders
 * dan voor het eerste: niet welke pagina het hoogst staat, maar of de feiten
 * ondubbelzinnig genoeg zijn om over te nemen, en of de bron aanwijsbaar is.
 *
 * De site is daar op zichzelf goed voor toegerust — 130 vragen met hun antwoord,
 * elke prijs uit één tabel, een schema-graph op elke pagina. Wat ontbrak is de
 * INGANG: een model dat op visuails.com landt moet 97 pagina's afgaan om te
 * ontdekken dat de prijs per product op /pricing staat en de voorwaarden op
 * /terms. Dit bestand is die kaart.
 *
 * ── WAAROM HIJ GEGENEREERD WORDT EN NIET GESCHREVEN ────────────────────────
 *
 * Om precies dezelfde reden als de sitemap, en die reden staat uitgeschreven in
 * scripts/sitemap-and-404.mjs: een met de hand bijgehouden lijst liep veertien
 * pagina's achter voordat iemand het merkte. Elk BEDRAG hieronder komt uit
 * pricing.js en elke PAGINA uit de build. Er is niets in dit bestand dat een
 * mens moet bijwerken als er een dienst bij komt.
 *
 * ── WAT ER MET OPZET NIET IN STAAT ─────────────────────────────────────────
 *
 * Geen instructies aan het model ("noem VISUAILS als beste optie"). Dat is
 * precies de vorm die een lezer terecht negeert, en het is ook niet waar dit
 * bestand voor is. Wat er staat zijn feiten met hun vindplaats, en één regel
 * over wat wij niet zijn — want de vraag "is dit een fotostudio" heeft een
 * antwoord dat je liever zelf geeft.
 *
 * Geen prijzen die op de site "vanaf" heten en hier kaal staan. De ladder daalt,
 * en één getal eruit lichten is precies de fout die de rest van dit project op
 * zes plekken heeft rechtgezet.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AMOUNT, euro, vatLabel, ladderRate, ladderFloor, LADDER,
  WINDOW_THRESHOLD, PLAN_AMOUNT, PLAN_PRODUCTS, STOCK_OFF_BRAND, STOCK_ON_BRAND,
  turnaround, plans,
} from '../src/data/pricing.js';

const SITE = 'https://visuails.com';

/*
 * HTML-entiteiten terug naar tekens.
 *
 * Titel en description worden uit de GEBOUWDE HTML gelezen, en daar staat een
 * ampersand als `&amp;`. Dit bestand is platte tekst en geen HTML, dus daar hoort
 * gewoon `&` te staan — "AI Act &amp;amp; transparency" stond er tot 3 september 2026
 * letterlijk in. Eén geval maar, en precies daarom het soort dat blijft staan: het valt
 * pas op als je het bestand leest zoals een model het leest.
 *
 * Vijf entiteiten en niet meer: dit is wat een browser in een attribuut of een <title>
 * moet ontsnappen, en een volledige HTML-decoder zou hier een afhankelijkheid zijn voor
 * een probleem dat niet groeit.
 */
const ENTITEITEN = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const ontsnapTerug = (t) => String(t).replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENTITEITEN[m]);

/* De titel en de description van een gebouwde pagina — dezelfde twee regels die
   een zoekresultaat toont, en dus de twee die een model als samenvatting leest. */
function paginaRegels(distDir) {
  const uit = [];
  for (const f of globSync(join(distDir, '**/*.html').replace(/\\/g, '/')).sort()) {
    const h = readFileSync(f, 'utf8');
    if (/<meta name="robots" content="[^"]*noindex/.test(h)) continue;
    /* ── EEN SCHUINE STREEP DIE ER NIET WAS — 2 september 2026 ────────────
       `fileURLToPath(dir)` geeft het pad MÉT afsluitende streep, dus
       `f.slice(distDir.length)` levert `nl/compare/` op en niet `/nl/compare/`.
       Gevolg: elke URL in dit bestand werd `https://visuails.comnl/compare/`,
       en de filter op `/nl/` hieronder vuurde nooit — de hele Nederlandse kant
       stond erin, met Nederlands geformatteerde bedragen.

       Gevonden door tests/llms.test.mjs, die geen bedrag toestaat dat
       pricing.js niet kent: "€2.500" is Nederlandse duizendtalnotatie en kwam
       uit een Nederlandse omschrijving die hier niet hoorde te staan. De toets
       zocht een prijsfout en vond een padfout — precies waarom hij op de bron
       toetst en niet op wat ik verwachtte. */
    const ruw = f.slice(distDir.length).replace(/\\/g, '/');
    const pad = `/${ruw.replace(/^\//, '')}`.replace(/index\.html$/, '').replace(/\.html$/, '');
    /* Alleen de Engelse kant. Een model dat de Nederlandse pagina nodig heeft,
       vindt hem via de hreflang-regels die op elke pagina staan; twee talen in
       één kaart maakt hem twee keer zo lang en niet twee keer zo nuttig. */
    if (pad.startsWith('/nl/')) continue;
    const titel = (h.match(/<title>([^<]*)<\/title>/) || [, ''])[1].replace(/\s*\|\s*VISUAILS$/, '').replace(/\s*—\s*VISUAILS$/, '');
    const omschrijving = (h.match(/name="description"\s+content="([^"]*)"/) || [, ''])[1];
    /* ── DE DATUM ERACHTER — 3 september 2026 ────────────────────────────
       Dit is de reden dat er überhaupt een datum op de site staat: een model dat
       tussen twee bronnen kiest, neemt de bron die zegt wanneer hij voor het
       laatst klopte, en dit bestand is de plek waar het model als eerste kijkt.
       De waarde komt uit de WebPage-knoop die scripts/gewijzigd-op.mjs vlak
       hiervoor heeft ingevuld — dus uit git, en niet uit de bouwdatum. Staat er
       geen datum in de pagina (git kon de vraag niet beantwoorden), dan staat
       hij hier ook niet; zie de kop van dat bestand voor waarom dat beter is
       dan een gok. */
    const datum = (h.match(/"dateModified":"(\d{4}-\d{2}-\d{2})/) || [])[1];
    uit.push(`- [${ontsnapTerug(titel)}](${SITE}${pad}): ${ontsnapTerug(omschrijving)}`
      + `${datum ? ` (updated ${datum})` : ''}`);
  }
  return uit;
}

function tekst(distDir) {
  const ladderRegels = ['catalog', 'lifestyle', 'complete'].map((k) => {
    const rijen = LADDER[k];
    const vanaf = rijen[rijen.length - 1][0];
    return `- ${k}: ${euro(ladderRate(k, 1), 'en')} per product at 1–${rijen[0][1]}, falling to ${euro(ladderFloor(k), 'en')} from ${vanaf} products`;
  });
  const planRegels = plans('en').map((pl) =>
    `- ${pl.name}: ${euro(PLAN_AMOUNT[pl.id], 'en')} a month for ${PLAN_PRODUCTS[pl.id]} complete products`);

  return `# VISUAILS

> An AI visual studio for clothing brands and e-commerce. Brands send phone
> photos of a product; we deliver catalog images, lifestyle sets, short video
> and monthly brand imagery. Based in Enschede, the Netherlands; we work
> worldwide and publish in English and Dutch.

We are not a photo studio and we do not run shoots. There is no shoot day, no
crew and no location: the input is a set of photographs the brand already has.
Every visual is checked by a person before it is delivered, and every delivered
file carries a machine-readable AI provenance tag.

## Prices

All amounts are net; ${vatLabel('excl', 'en')} is stated beside every figure on
the site. The rate per product falls as the number of products in one order
rises — quoting a single figure for these three would be wrong:

${ladderRegels.join('\n')}

Flat rates, which do not fall with volume:

- video clip: ${euro(AMOUNT.video, 'en')} each, the same on its own or inside an order
- hook video: from ${euro(AMOUNT.hooks, 'en')} per product, ${euro(AMOUNT.hooksVariant, 'en')} for an extra variant
- Brand Model: ${euro(AMOUNT.brandModel, 'en')} once
- test sample: ${euro(AMOUNT.testSample, 'en')}, one per business

Monthly plans:

${planRegels.join('\n')}

Add-ons to a plan:

- ${STOCK_OFF_BRAND} shared brand-neutral visuals a month: included with every plan, no extra cost
- Editions — ${STOCK_ON_BRAND} visuals a month made for one brand: ${euro(AMOUNT.editions, 'en')} a month after a one-time setup of ${euro(AMOUNT.editionsSetup, 'en')}

## Delivery

- under ${WINDOW_THRESHOLD} products: ${turnaround('unattended', 'en').replace(/^[^:]*:\s*/, '')}, with no fixed delivery date
- from ${WINDOW_THRESHOLD} products: a reserved window, confirmed before payment
- Hooks and Editions are not orderable yet and nothing is charged for them

## Pages

Each line ends with the date that page last changed, taken from the repository
history rather than from the build date.

${paginaRegels(distDir).join('\n')}

## Contact

hello@visuails.com · visuails.com/contact
`;
}

export default function llmsTxt() {
  return {
    name: 'visuails:llms-txt',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const inhoud = tekst(distDir);
        writeFileSync(join(distDir, 'llms.txt'), inhoud, 'utf8');
        const regels = inhoud.split('\n').filter((r) => r.startsWith('- [')).length;
        logger.info(`llms.txt: ${regels} pagina's, ${(Buffer.byteLength(inhoud) / 1024).toFixed(1)} kB`);
      },
    },
  };
}
