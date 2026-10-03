/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * GEEN WERKNOTITIES IN DE BRON VAN DE PUBLIEKE PAGINA'S — ronde 9 (3 oktober 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Astro laat HTML-commentaar (<!-- … -->) en het commentaar in inline <script>-
 * en <style>-blokken gewoon in de gebouwde pagina staan. Daarmee stond in de
 * "bron bekijken" van elke pagina wat voor ons bedoeld was: interne afwegingen,
 * datums, en letterlijke citaten uit werkoverleg ("… zien er afschuwlijk lelijk
 * uit", op /video). Niet gevaarlijk, wel onprofessioneel, en het noemde de
 * oprichter op plekken waar dat niet de bedoeling is.
 *
 * Deze stap haalt na de build uit elke dist/**\/*.html:
 *   · HTML-commentaar (niet: voorwaardelijk commentaar <!--[if …]>);
 *   · commentaar in inline scripts — via esbuild (minifyWhitespace), dus met een
 *     echte parser: een "/*" of "//" in een tekst of URL blijft staan;
 *   · commentaar in inline <style>-blokken.
 * JSON-LD en andere niet-JS-scripts worden niet aangeraakt.
 *
 * VOLGORDE: vóór stijlUitDePagina() en cspScripts(). csp-scripts hasht de inline
 * scripts zoals ze er uiteindelijk staan; als deze stap erna liep, klopte geen
 * enkele hash meer en deed geen enkel inline script het nog.
 *
 * Het commentaar in de BRON blijft gewoon staan — dat is waar het hoort.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

async function htmlBestanden(dir) {
  const uit = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) uit.push(...(await htmlBestanden(p)));
    else if (e.name.endsWith('.html')) uit.push(p);
  }
  return uit;
}

const JS_TYPES = /^(|text\/javascript|application\/javascript|module)$/i;

/** Eén inline script zonder commentaar. Lukt het parsen niet, dan blijft hij precies zoals hij was. */
export function scriptZonderCommentaar(code, isModule = false) {
  if (!/\/\*|\/\//.test(code)) return code;
  try {
    const uit = transformSync(code, { loader: 'js', format: isModule ? 'esm' : undefined, legalComments: 'none', minifyWhitespace: true, target: 'es2020' }).code;
    return uit.replace(/\n$/, '');
  } catch {
    return code;
  }
}

/** Een hele pagina. */
export function paginaZonderCommentaar(html) {
  const stukken = [];
  /* Scripts en stijlen eerst eruit (met een plaatshouder), zodat het HTML-commentaar-
     filter niet binnen code gaat zoeken en andersom. */
  let werk = html.replace(/<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (heel, tag, attrs, inhoud) => {
    let nieuw = heel;
    if (tag.toLowerCase() === 'script' && !/\bsrc=/i.test(attrs)) {
      const type = (attrs.match(/\btype=["']?([^"'\s>]+)/i) || [])[1] || '';
      if (JS_TYPES.test(type)) nieuw = `<script${attrs}>${scriptZonderCommentaar(inhoud, /module/i.test(type))}</script>`;
    } else if (tag.toLowerCase() === 'style') {
      nieuw = `<style${attrs}>${inhoud.replace(/\/\*[\s\S]*?\*\//g, '')}</style>`;
    }
    stukken.push(nieuw);
    return `\u0000${stukken.length - 1}\u0000`;
  });
  werk = werk.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
  return werk.replace(/\u0000(\d+)\u0000/g, (_, i) => stukken[Number(i)]);
}

export async function commentaarUitDeBouw(distDir) {
  let paginas = 0, bytes = 0;
  for (const p of await htmlBestanden(distDir)) {
    const voor = await readFile(p, 'utf8');
    const na = paginaZonderCommentaar(voor);
    if (na !== voor) { await writeFile(p, na, 'utf8'); paginas += 1; bytes += voor.length - na.length; }
  }
  return { paginas, bytes };
}

export default function commentaarUitDePagina() {
  return {
    name: 'visuails:commentaar-uit-de-pagina',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const uit = await commentaarUitDeBouw(fileURLToPath(dir));
        logger.info(`commentaar: ${uit.paginas} pagina's, ${Math.round(uit.bytes / 1024)} kB werknotities eruit`);
      },
    },
  };
}
