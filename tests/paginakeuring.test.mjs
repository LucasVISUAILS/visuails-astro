/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE HELE GEBOUWDE SITE NAGELOPEN  ·  npm run test:paginakeuring
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Er staan toetsen op bijna elk onderdeel afzonderlijk — de navigatie, de paden,
 * de schema's, de leesbaarheid. Wat er niet was, is één toets die de 93 GEBOUWDE
 * pagina's naast elkaar legt en de vier dingen nakijkt die stuk gaan zonder dat
 * iemand het merkt, omdat ze pas opvallen bij een bezoeker of een crawler:
 *
 *   1 · een interne link die nergens heen gaat
 *   2 · een <img> zonder alt
 *   3 · een koppenvolgorde die een niveau overslaat
 *   4 · een pagina zonder title, description, og-tags, canonical of lang
 *
 * Alle vier stonden op nul toen deze toets geschreven werd. Dat is precies het
 * moment om hem te schrijven: een nul die je vastlegt blijft nul, een nul die je
 * alleen een keer gemeten hebt niet.
 *
 * ── WAAROM DE GEBOUWDE HTML EN NIET DE BRON ────────────────────────────────
 *
 * Een link in .astro is een uitdrukking, geen pad. `localizedPath(l, base)` weet
 * je pas als je hem uitrekent, en juist dáár ging het bij /404/ mis. Wat een
 * bezoeker krijgt staat in dist/, dus wordt dist/ gelezen.
 *
 * ── /404/ IS DE ENIGE UITZONDERING, EN MET REDEN ───────────────────────────
 *
 * De taalwissel op de 404-pagina wijst naar `/404/`, en dat is geen map in de
 * build: Astro zet de Engelse 404 als ENIGE pagina plat neer (dist/404.html),
 * omdat Cloudflare Pages bij een onbekende URL naar een plat 404.html zoekt. Zie
 * scripts/sitemap-and-404.mjs. `/404/` bestaat dus niet als map — en komt in
 * productie tóch goed uit, want Pages serveert er hetzelfde 404.html op, met de
 * 404-status die er hoort. Er een echte map van maken zou het juist SLECHTER
 * maken: dan geeft een foutpagina een 200.
 *
 * De uitzondering staat hier genoteerd in plaats van weggefilterd, zodat het een
 * besluit blijft en geen gat.
 *
 * ── WAT ER MET OPZET NIET IN ZIT ───────────────────────────────────────────
 *
 * Externe links worden niet gevolgd. Een toets die het netwerk op moet, is een
 * toets die rood wordt omdat iemand anders' server even plat lag — dat is de
 * dure soort, die je daarna uitzet.
 *
 * De ingelogde kant (/account, /admin, /portal) wordt niet gecontroleerd op
 * bestaan: die pagina's komen uit Pages Functions en staan niet in dist. Ze
 * hebben hun eigen toetsen.
 */
import { globSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(52)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

if (!existsSync(DIST)) {
  console.log('dist/ ontbreekt — draai eerst `npm run test:bouw`. Deze toets slaat over.');
  process.exit(0);
}

const paginas = globSync(join(DIST, '**/*.html').replace(/\\/g, '/'));

/* De ingelogde kant en de api komen niet uit dist. */
const BUITEN_DIST = /^\/(api|account|admin|portal)(\/|$)/;
/* Zie de kop: de Engelse 404 staat plat, dus /404/ is geen map. */
const UITZONDERING = new Set(['/404/']);

const bestaat = (pad) => {
  const p = pad.split('#')[0].split('?')[0];
  if (p === '' || p === '/') return existsSync(join(DIST, 'index.html'));
  const f = join(DIST, p);
  if (existsSync(f) && statSync(f).isFile()) return true;
  return existsSync(join(f, 'index.html'));
};

const redirects = existsSync(join(DIST, '_redirects'))
  ? readFileSync(join(DIST, '_redirects'), 'utf8')
    .split('\n').map((r) => r.trim()).filter((r) => r && !r.startsWith('#'))
    .map((r) => r.split(/\s+/)[0])
  : [];
const geredirect = (p) => redirects.some((r) => r === p || (r.endsWith('*') && p.startsWith(r.slice(0, -1))));

const dood = [], zonderAlt = [], koppen = [], meta = [];

for (const f of paginas) {
  const naam = f.slice(DIST.length).replace(/\\/g, '/');
  const html = readFileSync(f, 'utf8');

  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const h = m[1];
    if (!h.startsWith('/')) continue;                 // extern, mailto, tel, anker
    const kaal = h.split('#')[0].split('?')[0];
    if (BUITEN_DIST.test(kaal) || UITZONDERING.has(kaal)) continue;
    if (!bestaat(h) && !geredirect(kaal)) dood.push(`${naam} → ${h}`);
  }

  for (const m of html.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\salt\s*=/.test(m[1])) zonderAlt.push(`${naam} → ${m[1].trim().slice(0, 60)}`);
  }

  const rij = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  const h1 = rij.filter((n) => n === 1).length;
  if (h1 !== 1) koppen.push(`${naam} → h1 × ${h1}`);
  for (let i = 1; i < rij.length; i++) {
    if (rij[i] - rij[i - 1] > 1) { koppen.push(`${naam} → h${rij[i - 1]} gevolgd door h${rij[i]}`); break; }
  }

  const mist = [];
  if (!/<title>[^<]{5,}<\/title>/.test(html)) mist.push('title');
  if (!/name="description"\s+content="[^"]{20,}"/.test(html)) mist.push('description');
  if (!/property="og:title"/.test(html)) mist.push('og:title');
  if (!/property="og:image"/.test(html)) mist.push('og:image');
  if (!/rel="canonical"/.test(html)) mist.push('canonical');
  if (!/<html[^>]*\slang="/.test(html)) mist.push('lang');
  if (mist.length) meta.push(`${naam} → mist ${mist.join(', ')}`);
}

console.log(`${paginas.length} gebouwde pagina's gelezen\n`);
ok('er zijn pagina’s om te keuren', paginas.length > 50, true);
ok('geen dode interne link', dood, []);
ok('elke <img> heeft een alt', zonderAlt, []);
ok('koppen slaan geen niveau over, en elke pagina heeft één h1', koppen, []);
ok('elke pagina heeft title, description, og, canonical en lang', meta, []);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
