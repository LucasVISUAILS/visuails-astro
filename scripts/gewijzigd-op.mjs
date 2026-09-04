/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WANNEER IS DEZE PAGINA VOOR HET LAATST VERANDERD — UIT GIT, NIET UIT DE KLOK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Er stond nergens op deze site een datum. Geen `dateModified`, geen WebPage-knoop,
 * geen zichtbare "bijgewerkt op". Voor een zoekmachine is dat een gemis; voor een
 * taalmodel dat tussen twee bronnen moet kiezen is het de belangrijkste ontbrekende
 * post, want dat neemt de bron die zegt wanneer hij voor het laatst klopte.
 *
 * ── WAAROM DIT NIET `new Date()` IS ────────────────────────────────────────
 *
 * De verleiding is één regel: zet de bouwdatum op elke pagina. Dat is precies de
 * leugen die dit bestand niet vertelt. Een build draait bij elke deploy, dus elke
 * pagina zou beweren dat hij vandaag is veranderd — 97 keer, elke keer opnieuw, ook
 * de pagina waar sinds juni geen letter aan is veranderd. Een datum die altijd
 * vandaag is, is geen datum maar ruis, en een lezer die dat doorheeft gelooft de
 * volgende claim ook niet meer.
 *
 * Git weet het wél, per bestand, en git kan niet vleien. Dus komt de datum daar
 * vandaan, en als git het antwoord niet kan geven komt er GEEN datum. Zie
 * "als git niets weet" onderaan.
 *
 * ── WAT TELT ALS "DEZE PAGINA IS VERANDERD" ────────────────────────────────
 *
 * Niet alleen het paginabestand. /pricing staat vol getallen die in
 * src/data/pricing.js wonen; verandert daar een bedrag, dan verandert de pagina,
 * ook al is pricing.astro niet aangeraakt. Dus: de nieuwste wijzigingsdatum in de
 * hele importketen van de pagina (scripts/lib/importketen.mjs).
 *
 * MET ÉÉN GRENS, EN DIE IS GEMETEN. De keten loopt niet dóór de layout heen:
 * src/layouts/Layout.astro telt mee, maar wat de layout zelf importeert niet. Zonder
 * die grens is het onbruikbaar, en dat is geen inschatting maar een telling
 * (kladblok/ketenmeting.mjs, 3 september 2026):
 *
 *   · ZONDER grens zitten TWINTIG bestanden in de keten van alle 80 paginabestanden
 *     — global.css, interactions.js, schema.js, faq.js, pricing.js, de cookiebalk.
 *     Eén komma in een daarvan zet 97 pagina's op dezelfde dag. Dat is de bouwdatum
 *     met extra stappen.
 *   · MÉT grens is de gemiddelde keten 12,8 bestanden en is alleen Layout.astro nog
 *     universeel. faq.js komt dan uit bij /faq en /pricing en nergens anders —
 *     precies de twee pagina's waar die vragen op staan. /about krijgt hem niet, en
 *     /about toont ook geen vragen.
 *
 * De grens kost iets en dat hoort erbij: verandert de voettekst, dan verschuift elke
 * pagina. Dat is niet erg, want dan is elke pagina ook echt veranderd.
 *
 * ── WAAR DE DATUM TERECHTKOMT ──────────────────────────────────────────────
 *
 * In de WebPage-knoop die src/data/schema.js op elke pagina zet. Die knoop wordt
 * daar gebouwd zonder datum — schema.js draait tijdens het renderen en heeft geen
 * git — en hier wordt het ene veld ingevuld dat alleen deze stap weet. Vorm en feit
 * blijven zo gescheiden.
 *
 * En scripts/sitemap-and-404.mjs leest de datum weer UIT de gebouwde HTML voor zijn
 * <lastmod>. Niet uit een variabele die deze stap doorgeeft: dan zijn er twee bronnen
 * die uit elkaar kunnen lopen. De HTML is de bron, en wat er niet in staat, staat ook
 * niet in de sitemap.
 *
 * VOLGORDE. Deze stap moet vóór sitemap-and-404 draaien (die leest wat hier wordt
 * geschreven) en vóór csp-scripts (die de HTML hasht). Zie de integrations-rij in
 * astro.config.mjs.
 *
 * ── ALS GIT NIETS WEET ─────────────────────────────────────────────────────
 *
 * Drie gevallen, één uitkomst: geen enkele datum, en een luide regel in het
 * bouwlogboek.
 *
 *   1 · Geen git-map (een tarball, een gekopieerde map).
 *   2 · Een ondiepe kloon — `git clone --depth 1`, wat bouwomgevingen vaak doen.
 *       Daar heeft ELK bestand de datum van de laatste commit, dus git geeft dan
 *       braaf 97 keer dezelfde dag terug: dezelfde leugen als `new Date()`, maar
 *       vermomd als een meting. Er wordt eerst geprobeerd hem te verdiepen
 *       (`git fetch --unshallow`); lukt dat niet, dan geen datums.
 *   3 · De geschiedenis is afgekapt zonder dat git dat toegeeft. De oudste
 *       bereikbare commit wordt opgevraagd en zijn RUWE object gelezen: heeft dat
 *       nog een `parent`-regel naar iets wat er niet is, dan is dit een afgekapte
 *       geschiedenis en geen begin.
 *
 *       Hier stond eerst iets anders, en het was fout op een manier die pas bij het
 *       uitproberen bleek: "minder dan drie verschillende datums over alle pagina's,
 *       dus verdacht". Dat gaat VALS af op precies het geval dat hierboven wordt
 *       uitgelegd — verandert de layout, dan verschuift elke pagina naar dezelfde
 *       dag, en dat is dan de waarheid. Die controle zou alle datums weggooien op de
 *       dag dat je de voettekst aanpast. Gemeten in /tmp met een `--depth 1`-kloon:
 *       de ouderregel-controle scheidt de twee gevallen wél, want in een volle kloon
 *       heeft de wortelcommit geen ouder en in een afgekapte wél.
 *
 * Geen datum is een leesbaar gemis. Een verkeerde datum is niet te zien.
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, sep, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keten } from './lib/importketen.mjs';

const WORTEL = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PAGINAMAP = join(WORTEL, 'src', 'pages');
const LAYOUT = join(WORTEL, 'src', 'layouts', 'Layout.astro');

/** git draaien en de uitvoer teruggeven, of null als het niet lukt. */
function git(args, { stil = true } = {}) {
  try {
    return execFileSync('git', args, {
      cwd: WORTEL,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', stil ? 'ignore' : 'inherit'],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Elk bestand in de geschiedenis met de datum waarop het voor het laatst veranderde.
 *
 * Eén git-aanroep voor de hele geschiedenis in plaats van één per bestand: dat is
 * ~1500 processen tegen één, en het verschil is een halve minuut bouwtijd. `git log`
 * geeft nieuw naar oud, dus de EERSTE keer dat een pad langskomt is de laatste keer
 * dat het veranderde.
 */
function datumsUitGit() {
  const uit = git(['log', '--no-merges', '--format=@@%cI', '--name-only', '--diff-filter=d']);
  if (uit == null) return null;
  const datums = new Map();
  let nu = null;
  for (const regel of uit.split('\n')) {
    if (regel.startsWith('@@')) { nu = regel.slice(2); continue; }
    const p = regel.trim();
    if (!p || !nu || datums.has(p)) continue;
    datums.set(p, nu);
  }
  return datums;
}

/** Kan git deze vraag eerlijk beantwoorden? Zie "als git niets weet" in de kop. */
function gitBruikbaar(logger) {
  if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') {
    logger?.warn('gewijzigd-op: geen git-werkmap — GEEN datums op de pagina\'s.');
    return false;
  }
  if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
    logger?.info('gewijzigd-op: ondiepe kloon, ik probeer hem te verdiepen…');
    git(['fetch', '--unshallow', '--quiet']);
    if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
      logger?.warn('gewijzigd-op: kloon blijft ondiep — GEEN datums. Zet de kloondiepte '
        + 'van de bouwomgeving op vol (Cloudflare Pages: de variabele GIT_DEPTH) of laat '
        + 'de datums weg; één datum voor alle pagina\'s is erger dan geen.');
      return false;
    }
  }
  if (afgekapt()) {
    logger?.warn('gewijzigd-op: de oudste bereikbare commit noemt een ouder die er niet is — '
      + 'deze geschiedenis is afgekapt, niet compleet. GEEN datums.');
    return false;
  }
  return true;
}

/**
 * Reikt deze geschiedenis tot het begin?
 *
 * `--is-shallow-repository` is het eerlijke antwoord en meestal genoeg, maar het leest
 * één bestand (.git/shallow) en er zijn manieren om een afgekapte geschiedenis te
 * maken die dat bestand niet achterlaten. Dit kijkt naar het object: de oudste commit
 * die bereikbaar is, moet ZELF geen ouder meer noemen. Doet hij dat wel, dan is hij
 * geen wortel maar een afgekapt uiteinde, en dan geeft `git log` voor elk bestand dat
 * daarvóór voor het laatst veranderde een veel te jonge datum.
 */
function afgekapt() {
  const wortels = git(['rev-list', '--max-parents=0', 'HEAD']);
  if (!wortels) return true;
  for (const sha of wortels.split('\n').filter(Boolean)) {
    const ruw = git(['cat-file', '-p', sha]);
    if (ruw && /^parent /m.test(ruw)) return true;
  }
  return false;
}

/** Elk .astro-bestand onder src/pages. */
async function paginaBestanden(dir = PAGINAMAP, out = []) {
  for (const naam of await readdir(dir)) {
    const f = join(dir, naam);
    if ((await stat(f)).isDirectory()) await paginaBestanden(f, out);
    else if (naam.endsWith('.astro')) out.push(f);
  }
  return out;
}

/**
 * Het bronbestand achter een gebouwde route.
 *
 * 'nl/catalog/classic' komt uit nl/catalog/classic.astro, uit nl/catalog/classic/
 * index.astro, of — en dat is het geval dat je vergeet — uit een dynamische route
 * nl/catalog/[slug].astro. Vandaar de klim omhoog: de diepste dynamische route die
 * boven dit pad hangt, wint.
 */
function bronVoorRoute(route) {
  const delen = route ? route.split('/') : [];
  const kandidaten = [
    join(PAGINAMAP, `${delen.join(sep)}.astro`),
    join(PAGINAMAP, ...delen, 'index.astro'),
  ];
  for (const k of kandidaten) if (delen.length && existsSync(k)) return k;
  if (!delen.length && existsSync(join(PAGINAMAP, 'index.astro'))) return join(PAGINAMAP, 'index.astro');

  for (let i = delen.length - 1; i >= 0; i -= 1) {
    const map = join(PAGINAMAP, ...delen.slice(0, i));
    if (!existsSync(map)) continue;
    for (const vorm of ['[slug].astro', '[...slug].astro', '[id].astro']) {
      const p = join(map, vorm);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/** 'nl/start/catalog/index.html' → 'nl/start/catalog' ; 'index.html' → '' */
const routeVan = (bestand) => bestand
  .replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');

async function loopHtml(dir, basis = dir, out = []) {
  for (const naam of await readdir(dir)) {
    const f = join(dir, naam);
    const s = await stat(f);
    if (s.isDirectory()) await loopHtml(f, basis, out);
    else if (naam.endsWith('.html')) out.push(relative(basis, f).split(sep).join('/'));
  }
  return out;
}

/**
 * De datum per route, uit git. `null` als git de vraag niet eerlijk kan beantwoorden.
 * Los van de bouwstap zodat de toets hem ook kan draaien.
 */
export async function datumsPerRoute({ logger, routes } = {}) {
  if (!gitBruikbaar(logger)) return null;
  const perBestand = datumsUitGit();
  if (!perBestand) return null;

  const stop = new Set([LAYOUT]);
  const perBron = new Map();
  for (const bestand of await paginaBestanden()) {
    const lijst = await keten(bestand, WORTEL, { stop });
    let nieuwste = null;
    for (const pad of lijst) {
      const d = perBestand.get(pad);
      if (d && (!nieuwste || d > nieuwste)) nieuwste = d;
    }
    perBron.set(bestand, nieuwste);
  }

  const uit = new Map();
  for (const route of routes || []) {
    const bron = bronVoorRoute(route);
    const d = bron ? perBron.get(bron) : null;
    if (d) uit.set(route, d);
  }

  return uit;
}

const RE_LD = /(<script type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/;

/** De datum in de WebPage-knoop van deze HTML zetten. Geeft terug of het gelukt is. */
export function datumInHtml(html, iso) {
  const m = html.match(RE_LD);
  if (!m) return null;
  let graph;
  try { graph = JSON.parse(m[2]); } catch { return null; }
  const knopen = graph['@graph'];
  if (!Array.isArray(knopen)) return null;
  /* Op @id en niet op @type. De paginaknoop heet op /guides CollectionPage en op
     /gallery ImageGallery (zie PAGINA_TYPE in src/data/schema.js) — dat zijn allebei
     ondersoorten van WebPage, en op het type zoeken zou die twee pagina's stilletjes
     overslaan. Het achtervoegsel #webpage is er wél op alle drie. */
  const pagina = knopen.find((k) => k && typeof k['@id'] === 'string' && k['@id'].endsWith('#webpage'));
  if (!pagina) return null;
  pagina.dateModified = iso;
  const json = JSON.stringify(graph).replace(/</g, '\\u003c');
  return html.slice(0, m.index) + m[1] + json + m[3] + html.slice(m.index + m[0].length);
}

export default function gewijzigdOp() {
  return {
    name: 'visuails:gewijzigd-op',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const bestanden = await loopHtml(distDir);
        const routes = bestanden.map(routeVan);
        const datums = await datumsPerRoute({ logger, routes });
        if (!datums) {
          logger.info('gewijzigd-op: geen dateModified geschreven (zie de waarschuwing hierboven).');
          return;
        }

        let gezet = 0;
        let overgeslagen = 0;      // geen WebPage-knoop: een noindex-pagina, zoals bedoeld
        const mislukt = [];        // wél een knoop, tóch geen datum: een fout
        for (const bestand of bestanden) {
          const route = routeVan(bestand);
          const pad = join(distDir, ...bestand.split('/'));
          const html = await readFile(pad, 'utf8');
          /* Geen WebPage-knoop betekent een noindex-pagina (zie webPageNode() in
             src/data/schema.js) en dat is de bedoeling, geen fout. Gezocht op #webpage
             en niet op het type, om dezelfde reden als in datumInHtml(). Die twee uit
             elkaar houden in het logboek is het verschil tussen een regel die je
             leest en een regel die je went. */
          if (!html.includes('#webpage"')) { overgeslagen += 1; continue; }
          const iso = datums.get(route);
          const nieuw = iso && datumInHtml(html, iso);
          if (!nieuw) { mislukt.push(route || '/'); continue; }
          await writeFile(pad, nieuw, 'utf8');
          gezet += 1;
        }
        const spreiding = new Set([...datums.values()].map((d) => d.slice(0, 10))).size;
        logger.info(`gewijzigd-op: dateModified op ${gezet} pagina's over ${spreiding} verschillende `
          + `dagen, ${overgeslagen} zonder WebPage-knoop (noindex)`);
        if (mislukt.length) {
          logger.warn(`gewijzigd-op: ${mislukt.length} pagina('s) MET een WebPage-knoop kregen geen `
            + `datum — dat hoort niet te kunnen: ${mislukt.join(', ')}`);
        }
      },
    },
  };
}
