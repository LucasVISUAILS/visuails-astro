/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WELKE BRONBESTANDEN BEPALEN WAT ER OP ÉÉN PAGINA KOMT TE STAAN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Eén vraag, en het antwoord wordt op twee plekken gebruikt: scripts/gewijzigd-op.mjs
 * (de `dateModified` van een pagina is de nieuwste wijzigingsdatum in deze keten) en
 * de toets die daarbij hoort.
 *
 * ── WAAROM DIT NIET MET EEN REGEX OVER HET HELE BESTAND KAN ─────────────────
 *
 * Deze codebase citeert oude, kapotte code letterlijk in reparatienoten. Er staan dus
 * regels als
 *
 *     // Hier stond: import { PACKAGES } from '../data/pricing.js';
 *
 * in bestanden die pricing.js allang niet meer importeren. Een zoektocht naar
 * `from '...'` over de ruwe tekst leest die noot als een import, en dan verschuift de
 * datum van een pagina omdat een bestand veranderde dat hij niet eens inleest. Dat is
 * precies de val waar dit project al twee keer in is gelopen: een bewaker die zijn
 * eigen reparatienoot vindt.
 *
 * Dus wordt de tekst eerst door een scanner gehaald die weet waar hij is — in een
 * string, in een sjabloon, in een regel-commentaar, in een blok-commentaar — en
 * alleen wat daarbuiten staat telt mee. Die scanner heeft een eigen mutatietoets in
 * tests/gewijzigd.test.mjs; hij is het enige stuk hiervan dat stil fout kan gaan.
 */

import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';

/* Waar een `/` een regex opent en waar hij deelt. Er is geen manier om dat te zien
   zonder te weten wat er vóór stond: `a / b` deelt, `(/a/)` is een patroon. De regel
   die elke JS-lexer hiervoor gebruikt: een `/` na een WAARDE deelt, een `/` na een
   OPERATOR of een openend haakje opent een regex. Deze twee lijsten zijn die regel. */
/* `<` staat er BEWUST NIET IN, en dat is het enige punt waar deze lijst afwijkt van
   wat een JS-lexer zou doen. In JS is `a < /re/.test(b)` denkbaar en nooit gezien; in
   een .astro-bestand is `</div>` de meest voorkomende tekencombinatie die er is. Met
   `<` erin leest de scanner elke sluitende tag als het begin van een patroon, en zoekt
   dan de rest van de regel af naar een tweede `/` om hem mee te sluiten. `>` moet er
   wél in blijven staan: dat is de staart van `=>`, en een pijlfunctie die meteen een
   regex teruggeeft is heel gewoon. In markup staat er na een `>` nooit direct een `/`. */
const NA_DIT_IS_HET_EEN_REGEX = new Set('(,=:[!&|?{};+-*%~^>'.split(''));
const SLEUTELWOORDEN_MET_REGEX_ERNA = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

/**
 * De tekst met alle commentaar eruit, en met elke string vervangen door een lege
 * string van dezelfde soort quotes.
 *
 * Geen regex maar een lopende scanner, want de toestanden waar het om gaat
 * (code, string, sjabloon, commentaar, regex) kunnen elkaar bevatten: `https://x` is
 * geen commentaar en `// "` opent geen string.
 *
 * ── DE REGEX-TOESTAND, EN WAAROM DIE ER PAS SINDS 4 SEPTEMBER 2026 IS ───────
 *
 * Hier stonden vier toestanden en niet vijf, en dat was fout op een manier die
 * precies past bij wat deze scanner moet voorkomen. In src/scripts/pipeline.js
 * staat:
 *
 *     .replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', ... })[ch]);
 *
 * De scanner kende geen regex, zag de `"` binnen de tekenklasse, en opende daar een
 * string. Die string liep door tot de volgende `"`, elf regels verderop, en vanaf
 * dat punt stond de scanner de rest van het bestand verkeerd te lezen: commentaar
 * werd voor code aangezien en code voor commentaar. Gevonden doordat een zoektocht
 * naar het woord "ten" een REGELCOMMENTAAR op regel 4718 als code terugkreeg — de
 * bewaker vond, opnieuw, iets wat hij juist had moeten wegstrepen.
 *
 * Voor het oorspronkelijke werk (de importketen) viel het nooit op: imports staan
 * bovenaan een bestand, ruim vóór de eerste regex. Maar deze functie wordt inmiddels
 * óók gebruikt om te controleren of tekst ergens hardgecodeerd staat, en dan telt
 * het hele bestand mee. Een scanner die halverwege omslaat is dan erger dan geen
 * scanner, want hij geeft antwoord alsof hij het weet.
 */
export function ontdaanVanCommentaar(tekst) {
  let uit = '';
  let i = 0;
  const n = tekst.length;
  /* Het laatste betekenisvolle teken dat de scanner buiten commentaar zag. Alleen
     hiervoor bijgehouden: het beslist of de volgende `/` deelt of een regex opent. */
  let vorige = '';
  let vorigWoord = '';
  while (i < n) {
    const c = tekst[i];
    const volgend = tekst[i + 1];

    // Blok- en regelcommentaar: overslaan, maar de nieuwe regels behouden zodat
    // regelnummers in een foutmelding blijven kloppen.
    if (c === '/' && volgend === '*') {
      const eind = tekst.indexOf('*/', i + 2);
      const stuk = tekst.slice(i, eind === -1 ? n : eind + 2);
      uit += stuk.replace(/[^\n]/g, ' ');
      i += stuk.length;
      continue;
    }
    if (c === '/' && volgend === '/') {
      const eind = tekst.indexOf('\n', i);
      const stuk = tekst.slice(i, eind === -1 ? n : eind);
      uit += stuk.replace(/[^\n]/g, ' ');
      i += stuk.length;
      continue;
    }
    // HTML-commentaar, want een .astro-bestand is voor de helft markup.
    if (c === '<' && tekst.startsWith('<!--', i)) {
      const eind = tekst.indexOf('-->', i + 4);
      const stuk = tekst.slice(i, eind === -1 ? n : eind + 3);
      uit += stuk.replace(/[^\n]/g, ' ');
      i += stuk.length;
      continue;
    }

    /* Gewone strings blijven staan MET hun inhoud, want de inhoud is precies wat we
       zoeken: het pad in `from './x.js'`. Ze worden alleen doorlopen zodat een `//`
       erbinnen geen commentaar opent.

       SJABLOONSTRINGS WORDEN WÉL LEEGGEMAAKT, en dat verschil kwam uit de toets en
       niet uit mijn hoofd: tests/gewijzigd.test.mjs bood
       `const s = \`… import x from './nep.js' …\`;` aan en de scanner vond './nep.js'.
       Dat is geen bedachte mutatie — de COPY-objecten in dit project staan vol
       sjabloonstrings met lopende tekst, en een uitleg over hoe iets geïmporteerd
       wordt is precies het soort zin dat daarin belandt. Een echte import gebruikt
       nooit een sjabloonstring (en als hij het deed, was hij dynamisch en dus toch
       niet op te lossen), dus er gaat niets verloren. */
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n) {
        if (tekst[j] === '\\') { j += 2; continue; }
        if (tekst[j] === c) { j += 1; break; }
        j += 1;
      }
      const stuk = tekst.slice(i, j);
      uit += c === '`' ? stuk.replace(/[^\n`]/g, ' ') : stuk;
      i = j;
      vorige = c === '`' ? '`' : 'x';
      vorigWoord = '';
      continue;
    }

    /* Een regex-literaal. Hij wordt WEGGESTREEPT en niet bewaard: een patroon is
       geen tekst die iemand leest, en `/from 'x'/` zou anders als import tellen.
       Een tekenklasse mag zelf een `/` bevatten, dus die telt apart mee. */
    if (c === '/' && (vorige === '' || NA_DIT_IS_HET_EEN_REGEX.has(vorige)
      || SLEUTELWOORDEN_MET_REGEX_ERNA.has(vorigWoord))) {
      let j = i + 1;
      let inKlasse = false;
      let gesloten = false;
      while (j < n) {
        const t = tekst[j];
        if (t === '\\') { j += 2; continue; }
        if (t === '\n') break;             // een regex loopt nooit over een regeleinde
        if (t === '[') inKlasse = true;
        else if (t === ']') inKlasse = false;
        else if (t === '/' && !inKlasse) { j += 1; gesloten = true; break; }
        j += 1;
      }
      /* Niet gesloten op dezelfde regel: dan was het toch een deling of een typefout.
         Val terug op één teken, zodat één misgelezen `/` niet de rest meesleept. */
      if (!gesloten) { uit += c; i += 1; vorige = '/'; vorigWoord = ''; continue; }
      while (j < n && /[dgimsuvy]/.test(tekst[j])) j += 1;   // de vlaggen
      uit += tekst.slice(i, j).replace(/[^\n]/g, ' ');
      i = j;
      vorige = 'x';
      vorigWoord = '';
      continue;
    }

    uit += c;
    i += 1;
    if (!/\s/.test(c)) {
      vorige = c;
      vorigWoord = /[A-Za-z_$0-9]/.test(c) ? vorigWoord + c : '';
    }
  }
  return uit;
}

/** Elke specifier die dit bestand echt inleest. Alleen uit code, nooit uit een noot. */
export function specifiers(tekst) {
  const schoon = ontdaanVanCommentaar(tekst);
  const uit = new Set();
  //  import x from 'y'   ·   export * from 'y'   ·   const x = await import('y')
  for (const m of schoon.matchAll(/\bfrom\s*['"]([^'"\n]+)['"]/g)) uit.add(m[1]);
  //  import 'y'  (een stylesheet, meestal)   ·   import('y')
  for (const m of schoon.matchAll(/\bimport\s*\(?\s*['"]([^'"\n]+)['"]/g)) uit.add(m[1]);
  //  @import 'y'  in een <style>-blok
  for (const m of schoon.matchAll(/@import\s+(?:url\()?\s*['"]([^'"\n]+)['"]/g)) uit.add(m[1]);
  return [...uit];
}

const EXTS = ['', '.astro', '.js', '.mjs', '.ts', '.css', '.json'];

/** Een specifier naar een bestand op schijf, of null als het er geen is (npm, url, alias). */
export function naarBestand(specifier, vanuit) {
  if (!specifier.startsWith('.')) return null;      // npm-pakket of alias
  const grond = resolve(dirname(vanuit), specifier);
  for (const ext of EXTS) {
    const p = grond + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  for (const ext of EXTS.slice(1)) {
    const p = join(grond, `index${ext}`);
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

/**
 * Elk bestand dat meebepaalt wat er op deze pagina komt te staan, inclusief de
 * pagina zelf, als paden met schuine strepen ten opzichte van `wortel`.
 *
 * `stop` is een verzameling absolute paden waar de wandeling ophoudt: het bestand
 * telt zelf nog mee, maar wat het importeert niet meer. Zie de kop van
 * scripts/gewijzigd-op.mjs voor waarom de layout daar in staat.
 */
export async function keten(paginaBestand, wortel, { stop = new Set() } = {}) {
  const gezien = new Set();
  const wachtrij = [paginaBestand];
  while (wachtrij.length) {
    const bestand = wachtrij.pop();
    if (gezien.has(bestand)) continue;
    gezien.add(bestand);
    if (stop.has(bestand)) continue;
    let tekst;
    try { tekst = await readFile(bestand, 'utf8'); } catch { continue; }
    for (const spec of specifiers(tekst)) {
      const doel = naarBestand(spec, bestand);
      if (doel && !gezien.has(doel)) wachtrij.push(doel);
    }
  }
  return [...gezien].map((p) => relative(wortel, p).split(sep).join('/'));
}
