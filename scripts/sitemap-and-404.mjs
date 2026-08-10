/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE SITEMAP GENEREREN, EN DE NEDERLANDSE 404 OP ZIJN PLEK ZETTEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Twee dingen die niets met elkaar te maken hebben behalve dat ze beide pas kunnen
 * gebeuren als de build klaar is, en dat ze beide een klasse fout wegnemen in plaats
 * van één geval.
 *
 * ── 1 · DE SITEMAP WAS MET DE HAND BIJGEHOUDEN, EN LIEP 14 PAGINA'S ACHTER ──
 *
 * public/sitemap.xml was een statisch bestand met 68 handgeschreven <url>-blokken,
 * elk met drie hreflang-regels erin. De build maakte er 82 indexeerbaar. Ontbrekend:
 * de twaalf /start/*-pagina's (zes diensten × twee talen) en /demo in beide talen.
 *
 * Die /demo is het scherpste geval: "See how an order works", honderd kilobyte
 * interactieve uitleg, op `index, follow`, en geen enkele pagina op de hele site linkt
 * ernaartoe. Google kon hem alleen bij toeval vinden.
 *
 * ── WAAROM GENEREREN EN NIET AANVULLEN ─────────────────────────────────────
 *
 * Veertien regels bijtypen lost dit geval op en niets anders. De volgende pagina die
 * erbij komt, valt er om precies dezelfde reden weer uit — dit is dezelfde
 * constructie die in dit project al twee keer stil is verschoven (de drie parallelle
 * lijsten in het menu, en de vier kopieën van dezelfde leverdatum in de figuren).
 *
 * Dus leest deze stap de BUILD. Wat er in dist/ staat en op `index` mag, staat in de
 * sitemap. Er is geen tweede lijst meer om vergeten te worden.
 *
 * ── WAT ERUIT BLIJFT, EN OP WELKE GROND ────────────────────────────────────
 *
 * Alleen `<meta name="robots">` beslist. Staat er `noindex` in, dan hoort de pagina
 * niet in een sitemap — dat is geen keuze van dit script maar van de pagina zelf, en
 * dat is precies waar die keuze hoort. /404 en /nl/404 vallen daardoor automatisch af,
 * en /thank-you ook.
 *
 * ── 2 · DE NEDERLANDSE 404 WERD NOOIT GESERVEERD ───────────────────────────
 *
 * Astro bouwt met `format: 'directory'`, dus src/pages/nl/404.astro wordt
 * dist/nl/404/index.html. Cloudflare Pages zoekt bij een onbekende URL naar een PLAT
 * 404.html en pakt de dichtstbijzijnde; onder /nl/ stond er geen, dus kreeg elke
 * Nederlandse bezoeker met een verkeerde link de Engelse foutpagina. De vertaalde
 * pagina was dode code.
 *
 * Astro maakt hier zelf een uitzondering voor de pagina in de ROOT (dist/404.html
 * staat er wel als plat bestand), maar niet voor een genestelde. Vandaar deze kopie.
 * De map blijft bestaan: hij staat op `noindex` en kost niets, en hem weghalen zou een
 * werkende URL breken die misschien ergens gedeeld is.
 */

import { readFile, writeFile, readdir, stat, copyFile, access } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://visuails.com';

/*
 * Prioriteit en frequentie per soort pagina.
 *
 * Regels en geen tabel met paden erin, want een tabel met paden is weer een lijst die
 * achter kan lopen. De volgorde is van specifiek naar algemeen; de eerste die past,
 * wint.
 */
const RULES = [
  [/^$/,                          { priority: '1.0', changefreq: 'weekly' }],   // de homepage
  [/^(start|pricing|catalog|lifestyle|video|custom-models)$/, { priority: '0.9', changefreq: 'monthly' }],
  [/^start\//,                    { priority: '0.8', changefreq: 'monthly' }],  // de bestelpagina per dienst
  [/^(how-it-works|compare|portal|studio|demo|test-sample|models|gallery|guides|faq|about|contact)$/,
                                  { priority: '0.8', changefreq: 'monthly' }],
  [/^(terms|privacy|cookie-policy|ai-act|upload-guidelines)$/, { priority: '0.4', changefreq: 'yearly' }],
];
const DEFAULT_RULE = { priority: '0.7', changefreq: 'monthly' };

/** Elk .html-bestand onder dist/, als pad met slashes. */
async function walk(dir, base = dir, out = []) {
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) await walk(full, base, out);
    else if (name.endsWith('.html')) out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

/** 'nl/start/catalog/index.html' → 'nl/start/catalog' ; 'index.html' → '' */
const routeOf = (file) => file.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');

/** De URL zoals hij in de sitemap hoort: met sluitende slash, behalve de homepage. */
const urlOf = (route) => (route ? `${SITE}/${route}/` : `${SITE}/`);

export async function buildSitemap(distDir) {
  const files = await walk(distDir);
  const pages = [];

  for (const file of files) {
    const html = await readFile(join(distDir, file), 'utf8');
    const robots = (html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i) || [])[1] || '';
    // De pagina beslist zelf. Geen uitzonderingenlijst in dit script.
    if (/noindex/i.test(robots)) continue;
    pages.push(routeOf(file));
  }

  /*
   * De hreflang-paren. `nl/x` en `x` horen bij elkaar, en x-default wijst naar het
   * Engels — dat is de bestaande afspraak van dit project (Engels op de root, zie
   * astro.config.mjs) en die blijft.
   *
   * Een Nederlandse pagina zonder Engelse tegenhanger krijgt geen alternates in
   * plaats van een verzonnen link. Dat komt nu niet voor, en als het ooit gebeurt is
   * het een fout die je wil zien in plaats van een 404 in de sitemap.
   */
  const set = new Set(pages);
  const rows = [];
  for (const route of [...pages].sort()) {
    const isNl = route === 'nl' || route.startsWith('nl/');
    const en = isNl ? route.replace(/^nl\/?/, '') : route;
    const nl = isNl ? route : (route ? `nl/${route}` : 'nl');
    const rule = RULES.find(([re]) => re.test(route))?.[1] || DEFAULT_RULE;

    const alt = [];
    if (set.has(en) && set.has(nl)) {
      alt.push(`<xhtml:link rel="alternate" hreflang="en" href="${urlOf(en)}"/>`);
      alt.push(`<xhtml:link rel="alternate" hreflang="nl" href="${urlOf(nl)}"/>`);
      alt.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${urlOf(en)}"/>`);
    }
    rows.push(`  <url><loc>${urlOf(route)}</loc>${alt.join('')}`
      + `<changefreq>${rule.changefreq}</changefreq><priority>${rule.priority}</priority></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  GEGENEREERD DOOR scripts/sitemap-and-404.mjs — NIET MET DE HAND BIJWERKEN.

  Dit bestand stond hiervoor in public/ en werd met de hand bijgehouden, waardoor het
  veertien pagina's achterliep. Het wordt nu bij elke build uit dist/ gelezen: staat er
  een pagina in de build die niet op noindex staat, dan staat hij hierin.

  Hoort een pagina er niet in? Zet dan "noindex" op de pagina zelf. Dat is de enige
  knop, met opzet — een uitzonderingenlijst in het script zou de tweede lijst zijn die
  achter kan lopen.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join('\n')}
</urlset>
`;
  await writeFile(join(distDir, 'sitemap.xml'), xml, 'utf8');
  return { count: rows.length, routes: pages };
}

/** dist/nl/404/index.html → dist/nl/404.html, zodat Pages hem vindt. */
async function flattenDutch404(distDir) {
  const from = join(distDir, 'nl', '404', 'index.html');
  try {
    await access(from);
  } catch {
    return false;
  }
  await copyFile(from, join(distDir, 'nl', '404.html'));
  return true;
}

export default function sitemapAnd404() {
  return {
    name: 'visuails:sitemap-and-404',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        /*
         * ── fileURLToPath EN GEEN EIGEN OMBOUW, 10 AUGUSTUS 2026 ────────────────
         *
         * Hier stond `dir.pathname.replace(/^\/([A-Za-z]:)/, '$1')`: zelf de
         * schuine streep voor de schijfletter weghalen. Dat werkte op de Linux-
         * machine waar ik het schreef en viel op Lucas' Windows-pc meteen om:
         *
         *   ENOENT: scandir 'E:\Claude%20(VISUAILS)\visuails-astro\dist\'
         *
         * `dir.pathname` is de PAD-component van een file-URL, en die is
         * percent-gecodeerd. Zijn map heet "Claude (VISUAILS)" — met een spatie —
         * en die spatie komt terug als %20. Mijn ombouw haalde de schijfletter goed
         * op en liet de codering staan, dus zocht Node naar een map met letterlijk
         * "%20" in de naam.
         *
         * `fileURLToPath()` doet allebei: de schijfletter én de decodering, per
         * platform correct. En dat is niet iets wat ik had moeten opzoeken —
         * scripts/brand-lockup-guard.mjs in dezelfde map gebruikt het al, en dat is
         * precies de reden dat die stap in dezelfde build wél doorliep.
         */
        const distDir = fileURLToPath(dir);
        const { count } = await buildSitemap(distDir);
        const flat = await flattenDutch404(distDir);
        logger.info(`sitemap: ${count} pagina's${flat ? ', Nederlandse 404 platgezet' : ', GEEN Nederlandse 404 gevonden'}`);
      },
    },
  };
}
