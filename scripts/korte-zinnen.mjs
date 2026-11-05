/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * KORTE ZINNEN OP ÉÉN REGEL — levering 87 (4 november 2026, lijst 74, D1)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 03:23: *"Zinnen als deze kunnen gewoon als 1 zin om ruimte te besparen. Controleer de gehele website
 * om te kijken waar dit voorkomt en zorg ervoor dat dit word aangepast."* Zijn voorbeeld: "Unsubscribe at the
 * bottom of every letter. Privacy" in de voet, op twee regels.
 *
 * WAAROM HET BRAK. Elke tekst heeft een maat (--h-maat in hal.css): kleine tekst ongeveer 9 woorden per regel,
 * lopende tekst 5 tot 7. Een korte zin met één lang woord paste daar net niet in en brak, terwijl er naast hem
 * ruimte genoeg was. Gemeten op alle 45 pagina's in twee talen, op 1440 en op een telefoon: 190 plekken (NL) en
 * 326 (EN, de voet telt op elke pagina mee).
 *
 * DE REGEL. Na de build telt deze stap de woorden van elk tekstblok (p, li, small, figcaption, dd, dt, td,
 * label, legend, blockquote) zonder blokken erin (een svg-icoon mag erin staan; een rij die alleen uit links bestaat,
 * zoals de knoppen in p.h-acties, is geen zin en blijft zoals hij is):
 *   hoogstens 9 woorden   klasse h-1r: geen maat, hij loopt door tot de rand van zijn vak
 *   10 tot 12 woorden     klasse h-1k: geen maat als de letter klein is (15,5 px en kleiner), anders de gewone
 * In hal.css ("LEVERING 87 · KORTE ZINNEN OP ÉÉN REGEL") zetten die twee klassen --h-maat. Past de zin niet in
 * zijn vak (een telefoon), dan breekt hij gewoon; langere teksten houden hun maat. Omdat het na de build
 * gebeurt, geldt het ook voor elke nieuwe zin zonder dat iemand eraan hoeft te denken.
 *
 * VOLGORDE: vóór stijlUitDePagina() en cspScripts() (die kijken niet naar klassen op tekst, maar zo blijft de
 * rij: eerst de pagina, dan de stijl, dan de hashes). Scripts, stijlen, svg en commentaar raakt hij niet aan.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KORT = 9, KLEIN_KORT = 12;
const TAGS = ['p', 'li', 'small', 'figcaption', 'dd', 'dt', 'td', 'label', 'legend', 'blockquote'];
/* een blok erin: dan is het geen losse zin maar een rij of een kaart, en blijft het zoals het is */
const BLOK = /<(?:p|div|ul|ol|li|h[1-6]|table|figure|form|fieldset|dl|dt|dd|pre|br|section|article|header|footer|nav|aside|blockquote|picture|img|video|button|select|textarea|input)\b/i;
const ENTITEIT = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };

/** Het aantal woorden in een stukje HTML (de tekst zonder tags; een getal of €39 telt als woord, een · niet). */
export function woorden(inhoud) {
  const tekst = inhoud.replace(/\u0001\d+\u0001/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, (e) => ENTITEIT[e.toLowerCase()] ?? ' ');
  return (tekst.match(/[\p{L}\p{N}€][\p{L}\p{N}€'’.,:;!?%+\-–—/@]*/gu) || []).length;
}

/** Eén pagina: de klassen erbij. */
export function korteZinnen(html) {
  const stukken = [];
  /* scripts, stijlen, svg en commentaar eruit (met een plaatshouder), zodat er niets binnen code geteld wordt. Een svg
     (een icoon, zoals het vinkje voor een regel) mag in een zin staan: die krijgt een eigen plaatshouder (\u0001). */
  let werk = html.replace(/<(script|style|svg|textarea)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi, (heel, tag) => { stukken.push(heel); const t = /^svg$/i.test(tag || '') ? '\u0001' : '\u0000'; return `${t}${stukken.length - 1}${t}`; });
  let n1 = 0, n2 = 0;
  for (const tag of TAGS) {
    /* de attributen: alles tot de eerste > die niet tussen aanhalingstekens staat */
    const re = new RegExp(`<${tag}(\\s(?:[^>"']|"[^"]*"|'[^']*')*)?>([\\s\\S]*?)</${tag}>`, 'gi');
    werk = werk.replace(re, (heel, attrs = '', inhoud) => {
      if (new RegExp(`<${tag}\\b`, 'i').test(inhoud) || BLOK.test(inhoud) || /\u0000/.test(inhoud)) return heel;
      /* alleen links (een rij knoppen, zoals p.h-acties): geen zin, dus niets aan doen */
      if (/<a\b/i.test(inhoud) && !/[\p{L}\p{N}]/u.test(inhoud.replace(/<a\b[\s\S]*?<\/a>/gi, '').replace(/<[^>]+>|&[a-z#0-9]+;/gi, ''))) return heel;
      const n = woorden(inhoud);
      if (n === 0 || n > KLEIN_KORT) return heel;
      const klasse = n <= KORT ? 'h-1r' : 'h-1k';
      if (/\bh-1[rk]\b/.test(attrs)) return heel;
      /* een melding die het script vult (aria-live, role="status" of "alert"): die houdt zijn maat */
      if (/\saria-live(\s|=|$)|\srole\s*=\s*["']?(alert|status)/i.test(attrs)) return heel;
      /* een klasse zonder aanhalingstekens: niet aanraken */
      if (/\sclass\s*=\s*[^"'\s]/i.test(attrs)) return heel;
      n <= KORT ? n1++ : n2++;
      let nieuw;
      if (/\sclass\s*=\s*["']/i.test(attrs)) nieuw = attrs.replace(/(\sclass\s*=\s*)(["'])(.*?)\2/i, (_, a, q, k) => `${a}${q}${k ? `${k} ` : ''}${klasse}${q}`);
      else nieuw = `${attrs} class="${klasse}"`;
      return `<${tag}${nieuw}>${inhoud}</${tag}>`;
    });
  }
  return { html: werk.replace(/[\u0000\u0001](\d+)[\u0000\u0001]/g, (_, i) => stukken[Number(i)]), kort: n1, klein: n2 };
}

async function htmlBestanden(dir) {
  const uit = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) uit.push(...(await htmlBestanden(p)));
    else if (e.name.endsWith('.html')) uit.push(p);
  }
  return uit;
}

export async function korteZinnenInDeBouw(distDir) {
  let paginas = 0, kort = 0, klein = 0;
  for (const p of await htmlBestanden(distDir)) {
    const voor = await readFile(p, 'utf8');
    const uit = korteZinnen(voor);
    if (uit.html !== voor) { await writeFile(p, uit.html, 'utf8'); paginas += 1; kort += uit.kort; klein += uit.klein; }
  }
  return { paginas, kort, klein };
}

export default function korteZinnenIntegratie() {
  return {
    name: 'visuails:korte-zinnen',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const uit = await korteZinnenInDeBouw(fileURLToPath(dir));
        logger.info(`korte zinnen: ${uit.kort} tot ${KORT} woorden en ${uit.klein} tot ${KLEIN_KORT} (klein) op één regel, in ${uit.paginas} pagina's`);
      },
    },
  };
}
