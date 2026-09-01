/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE STIJL UIT DE PAGINA HALEN, ZODAT style-src ERBIJ KAN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── HET PROBLEEM, IN ÉÉN ALINEA ─────────────────────────────────────────────
 *
 * Sinds 1 september 2026 heeft de publieke site `script-src`. `style-src` kon er
 * niet bij, en public/_headers legt sinds 9 augustus uit waarom: `style-src-attr`
 * valt terug op `style-src` als hij niet apart genoemd is, en er staan 1735 inline
 * style-ATTRIBUTEN in de build. Een CSP toevoegen zou de opmaak van de hele site
 * slopen. Daarnaast staan er 133 inline <style>-elementen, en die vallen onder
 * dezelfde richtlijn.
 *
 * ── WAAROM DIT IN DE BUILD GEBEURT EN NIET IN DE BRON ───────────────────────
 *
 * De eerste gedachte was: 529 plekken in de bron met de hand omzetten naar
 * klassen. Dat is een middag werk, een enorme diff, en het lost de helft niet op —
 * een deel van die attributen is DATA. `--swatch:#EDE4D8` komt uit een gegevens-
 * bestand, `background-image:url('/img/banners-04.webp')` uit een lijst met
 * beelden. Voor die twee is er geen klasse te schrijven die niet meteen een val
 * wordt: wie er een kleur of een foto bij zet, moet dan ook aan de stylesheet
 * denken, en dat vergeet je precies één keer.
 *
 * Gemeten in de build: 1735 attributen, maar SLECHTS 149 UNIEKE WAARDEN. Geen
 * enkele komt één keer voor. Dat getal is het hele argument voor deze aanpak: één
 * klasse per unieke waarde is 149 regels CSS die niemand hoeft te schrijven, en de
 * bron blijft zeggen wat hij bedoelt.
 *
 * ── ÉÉN KLASSE PER HELE WAARDE, EN NIET PER PROPERTY ────────────────────────
 *
 * `margin-top:.6rem;font-size:.92rem;color:var(--ink-3)` had ook drie klassen
 * kunnen worden. Dat leest prettiger en het is fout: zodra twee klassen op één
 * element dezelfde property zetten, bepaalt de VOLGORDE IN DE STYLESHEET wie wint,
 * en die volgorde is dan iets wat uit het toeval van de eerste vondst rolt. Eén
 * klasse per hele waarde houdt de declaraties in precies de volgorde waarin ze in
 * het attribuut stonden — dezelfde cascade als voorheen, per definitie.
 *
 * ── DE SPECIFICITEIT, WANT DAAR ZIT HET ADDERTJE ────────────────────────────
 *
 * Een style-attribuut wint van ELKE selector, hoe diep ook (behalve van
 * !important). Een klasse doet dat niet. De eerste opzet gaf elke regel daarom
 * `.vs-x.vs-x.vs-x` — (0,3,0) — en dat was meteen te weinig: de schermvergelijking
 * zette /guides en /compare op rood, want
 *
 *     .page-hero .container:has(> .lead) > .lead { max-width: 46ch }
 *
 * haalt (0,4,0) en won van de klasse waar het attribuut `max-width:60ch` zei. De
 * diepste selector in de gebouwde CSS telt er ELF. Elke klasse twaalf keer
 * herhalen zou werken en is precies het soort getal dat over een half jaar stil
 * te laag is geworden.
 *
 * ── DUS: EEN LAAG, EN GEEN WEDLOOP ─────────────────────────────────────────
 *
 * Alle bestaande stylesheets worden bij de build in `@layer basis` gezet; deze ene
 * blijft eruit. Een niet-gelaagde declaratie wint van ELKE gelaagde, ongeacht
 * specificiteit — dat is precies wat een style-attribuut deed. En `!important`
 * blijft zich net zo gedragen als eerst: een gelaagde !important-regel wint nog
 * steeds van deze klassen, zoals hij eerder van het attribuut won. Geen getal om
 * bij te houden, en geen regel die per ongeluk sterker wordt dan hij was.
 *
 * Dat dit klopt is niet beredeneerd maar gemeten: kladblok/schermen.mjs legt alle
 * 93 pagina's op twee breedtes vast en vergelijkt ze pixel voor pixel, en die
 * meting is eerst deterministisch gemaakt (tijd, toeval, animaties, lazy-loading
 * en video vastgezet) zodat een verschil ook echt een verschil is.
 *
 * ── EN DE <style>-ELEMENTEN GAAN MEE ────────────────────────────────────────
 *
 * `inlineStylesheets: 'never'` in astro.config.mjs haalt de componentstylesheets
 * eruit; wat overblijft zijn 16 unieke blokjes, waarvan vijftien door Astro zelf
 * worden gemaakt voor `transition:name`. Die zouden als hash in de header moeten.
 * Ze worden hier in dezelfde stylesheet gehesen, in de vololgorde waarin ze in de
 * pagina stonden, zodat de cascade blijft kloppen en de header geen enkele
 * stijlhash nodig heeft.
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Alleen echte elementen, en geen doorzoeking van tekst: dit patroon pakt een
   openingstag met zijn attributen, waarbij een > binnen aanhalingstekens niet
   voor het einde van de tag wordt aangezien. */
const TAG = /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const STYLE_ATTR = /\sstyle="([^"]*)"/;
const STYLE_EL = /<style([^>]*)>([\s\S]*?)<\/style>/g;

/** Een korte, stabiele naam voor een waarde. Nooit met de hand getypt, dus leesbaarheid telt hier niet. */
export function klasseVoor(waarde) {
  return `vs-${createHash('sha256').update(waarde, 'utf8').digest('hex').slice(0, 8)}`;
}

/**
 * Elk style-attribuut uit één pagina halen.
 *
 * Geeft de nieuwe HTML terug plus de waarden die zijn tegengekomen. Een leeg
 * attribuut (`style=""`) wordt gewoon weggehaald: het zette niets en zou een lege
 * regel opleveren.
 */
export function haalAttributenEruit(html, gevonden = new Map()) {
  return {
    html: html.replace(TAG, (heel, naam, attrs) => {
      const m = STYLE_ATTR.exec(attrs);
      if (!m) return heel;
      const waarde = m[1].trim();
      let rest = attrs.replace(STYLE_ATTR, '');
      if (!waarde) return `<${naam}${rest}>`;
      const klasse = klasseVoor(waarde);
      gevonden.set(waarde, klasse);
      /* De klasse gaat ACHTER de bestaande klassen aan. Dat maakt voor de cascade
         niets uit — volgorde in het class-attribuut telt niet — maar het houdt de
         gebouwde HTML leesbaar voor wie hem naast de bron legt. */
      const bestaand = /\sclass="([^"]*)"/.exec(rest);
      rest = bestaand
        ? rest.replace(/\sclass="([^"]*)"/, ` class="${bestaand[1]} ${klasse}"`)
        : `${rest} class="${klasse}"`;
      return `<${naam}${rest}>`;
    }),
    gevonden,
  };
}

/** De <style>-blokken eruit halen, in de volgorde waarin ze stonden. */
export function haalStijlblokkenEruit(html, blokken = new Map()) {
  return {
    html: html.replace(STYLE_EL, (heel, attrs, inhoud) => {
      /* Een <style> met een media- of type-attribuut doet iets anders dan gewoon
         opmaken; die laat ik staan in plaats van hem stil van betekenis te
         veranderen. Er staat er vandaag geen enkele, en dat is precies waarom deze
         regel goedkoop is. */
      if (attrs.trim()) return heel;
      const sleutel = inhoud;
      if (!blokken.has(sleutel)) blokken.set(sleutel, blokken.size);
      return '';
    }),
    blokken,
  };
}

/** De regel voor één waarde. Eén klasse — de laag doet het werk, zie de kop. */
export function regelVoor(waarde, klasse) {
  return `.${klasse}{${waarde.replace(/;\s*$/, '')}}`;
}

/** De naam van de laag waarin alles behalve deze stylesheet terechtkomt. */
export const LAAG = 'basis';

/**
 * Een bestaande stylesheet in de laag zetten.
 *
 * Idempotent op de enige manier die telt: een bestand dat al met `@layer ${LAAG}`
 * begint, wordt met rust gelaten. Deze stap draait één keer per build, maar een
 * dubbele wikkeling zou een laag IN een laag maken en dat verandert de volgorde.
 */
export function inDeLaag(css) {
  if (css.startsWith(`@layer ${LAAG}`)) return css;
  return `@layer ${LAAG}{\n${css}\n}\n`;
}

export async function stijlUitDeBouw(distDir) {
  const paginas = globSync(join(distDir, '**/*.html').replace(/\\/g, '/'));
  const waarden = new Map();
  const blokken = new Map();
  const perPagina = new Map();

  for (const p of paginas) {
    let html = await readFile(p, 'utf8');
    ({ html } = haalAttributenEruit(html, waarden));
    ({ html } = haalStijlblokkenEruit(html, blokken));
    perPagina.set(p, html);
  }

  /* De blokken eerst en de attribuutklassen daarna, want een attribuut won
     voorheen van alles wat in een <style> stond. */
  const css = [
    ...[...blokken.keys()],
    ...[...waarden].map(([waarde, klasse]) => regelVoor(waarde, klasse)),
  ].join('\n');

  if (!css.trim()) return { paginas: paginas.length, waarden: 0, blokken: 0, bestand: '' };

  /* ── EERST DE LAAG, DAN PAS DE EIGEN STYLESHEET ──────────────────────────
     Alles wat Astro heeft gebouwd, gaat in `@layer basis`. Deze ene niet, en dat
     ene verschil is wat de klassen laat winnen zoals het attribuut won. Alleen
     /_astro/: public/admin.css en public/portal.css horen bij schermen die deze
     stap niet aanraakt en die geen klassenblad krijgen — hen wikkelen zou een
     laag introduceren waar niets tegenover staat. */
  let gelaagd = 0;
  for (const blad of globSync(join(distDir, '_astro', '*.css').replace(/\\/g, '/'))) {
    const was = await readFile(blad, 'utf8');
    const wordt = inDeLaag(was);
    if (wordt !== was) { await writeFile(blad, wordt, 'utf8'); gelaagd += 1; }
  }

  const naam = `vis-uit-de-pagina.${createHash('sha256').update(css).digest('hex').slice(0, 8)}.css`;
  await writeFile(join(distDir, '_astro', naam), css, 'utf8');
  const link = `<link rel="stylesheet" href="/_astro/${naam}">`;

  for (const [p, html] of perPagina) {
    /* ALS LAATSTE IN DE <head>. Gelijke specificiteit wordt door volgorde beslist,
       en deze regels hoorden voorheen bij het element zelf — dus ze horen achteraan.
       Geen </head> betekent een pagina zonder kop, en die is er niet; dan liever
       niets invoegen dan de link ergens neerzetten waar hij niet hoort. */
    await writeFile(p, html.includes('</head>') ? html.replace('</head>', `${link}</head>`) : html, 'utf8');
  }

  return { paginas: paginas.length, waarden: waarden.size, blokken: blokken.size, gelaagd, bestand: naam };
}

export default function stijlUitDePagina() {
  return {
    name: 'visuails:stijl-uit-de-pagina',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        /* fileURLToPath — zie de noot in scripts/sitemap-and-404.mjs. */
        const uit = await stijlUitDeBouw(fileURLToPath(dir));
        logger.info(`stijl: ${uit.waarden} klassen en ${uit.blokken} blok(ken) uit ${uit.paginas} pagina's, ${uit.gelaagd} stylesheet(s) in @layer ${LAAG} → ${uit.bestand}`);
      },
    },
  };
}
