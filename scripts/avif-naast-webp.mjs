/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * ELKE <img> WORDT EEN <picture> — MITS DE AVIF ER ÉCHT LIGT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── HET PROBLEEM DAT HIER OPGELOST WORDT — 20 augustus 2026 ────────────────
 *
 * `npm run avif` zet naast elke webp een AVIF: 173 bestanden, 19.4 MB webp wordt
 * 9.3 MB AVIF. Dat levert precies NUL op zolang de markup alleen naar de webp
 * wijst. Een `<img>` kan geen twee formaten aanbieden — `srcset` kiest op
 * BREEDTE, alleen een `<source type=...>` binnen een `<picture>` kiest op
 * FORMAAT. Dus moet er om elke `<img>` een `<picture>` heen.
 *
 * ── WAAROM DIT EEN BOUWSTAP IS EN GEEN COMPONENT ───────────────────────────
 *
 * De eerste versie was `src/components/Beeld.astro`, een omhulsel om `<img>`.
 * Die is weggehaald, en dat is een correctie waard om op te schrijven, want de
 * componentversie klinkt netter en is het niet:
 *
 *   1. Er staan 73 `<img>`-tags in 38 bestanden. Elke omzetting is een kans om
 *      een attribuut te laten vallen. Dit script raakt ze alle 73 met dezelfde
 *      regel, en de 74e die er volgende maand bij komt ook.
 *   2. `transition:name={i === 0 ? 'hero-photo' : undefined}` op de eerste
 *      heldieafbeelding is een Astro-DIRECTIVE, geen prop. Die kan niet door een
 *      component heen. Er zou dus alsnog een handgeschreven `<picture>` naast de
 *      component moeten staan — twee mechanismen voor één taak, en dat is
 *      precies hoe de sitemap veertien pagina's achter ging lopen.
 *   3. De vangrail (`npm run visueel`) kijkt naar de BUILD. Wat hier gebeurt,
 *      gebeurt dus binnen het bereik van de test die het moet bewaken.
 *
 * ── HET GAT WAAR DIT OMHEEN LOOPT ──────────────────────────────────────────
 *
 * make-avif.mjs schrijft GEEN AVIF als die groter zou worden dan de webp — bij
 * kleine beelden en bij vlakken met weinig detail wint webp. Een
 * `<source type="image/avif">` die naar een bestand wijst dat er niet is, is
 * geen terugval maar een gat: de browser kiest die bron omdat hij het formaat
 * kent, komt met lege handen terug en toont NIETS. Geen kapot-beeldicoon, geen
 * fout in de console, gewoon een leeg vlak.
 *
 * Dus wordt er per pad op schijf gekeken, in dist/ na de build. En bij een
 * `srcset` geldt alles-of-niets: ontbreekt één breedte, dan gaat de hele
 * `<source>` niet mee. Een srcset met een gat laat de browser precies díe
 * breedte kiezen waar niets staat.
 *
 * ── EN DE CSS DAN ──────────────────────────────────────────────────────────
 *
 * Een `<picture>` schuift een element tussen de ouder en de `<img>`, en dat
 * breekt twee dingen. Allebei zijn ze op één plek afgevangen, niet hier:
 *
 *   · LAYOUT — `picture { display: contents }` in global.css. Zonder dat wordt
 *     de `<picture>` het rasteritem in `.photo-grid` in plaats van de `<img>`,
 *     en dan doet `.photo-grid .wide { grid-column: span 2 }` niets meer, en
 *     laat het filter op /gallery (dat `img.style.display = 'none'` zet) een
 *     lege cel achter.
 *   · SELECTORS — `display: contents` haalt het KADER weg, niet de KNOOP. Dus
 *     `.plate > img` matcht nog steeds niet. Die zes selectors in global.css
 *     hebben er een tweelingselector bij gekregen; ze staan met naam in het
 *     commentaar daar.
 *
 * ── GEEN webp-<source> ─────────────────────────────────────────────────────
 *
 * Er staat alleen een AVIF-bron in. De `<img>` zelf HOUDT zijn src en srcset en
 * is daarmee de terugval — een extra `<source type="image/webp">` zou hetzelfde
 * bestand een tweede keer noemen en op 91 pagina's alleen bytes kosten.
 */

import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* fileURLToPath en niet .pathname — zie tests/paths.test.mjs voor waarom dat
   op een pad met een spatie erin ("E:\Claude (VISUAILS)\...") stukloopt. */

async function alleHtml(map, uit = []) {
  for (const naam of await readdir(map, { withFileTypes: true })) {
    const vol = join(map, naam.name);
    if (naam.isDirectory()) await alleHtml(vol, uit);
    else if (naam.name.endsWith('.html')) uit.push(vol);
  }
  return uit;
}

/*
 * ── DE TAG UIT DE HTML HALEN ───────────────────────────────────────────────
 *
 * Met de hand en niet met één regex. `/<img[^>]*>/` breekt op de eerste
 * attribuutwaarde met een `>` erin, en dat is geen theoretisch geval: een alt
 * met "meer dan 3 foto's" erin is één redactieronde weg. Deze lus telt
 * aanhalingstekens mee en stopt bij de `>` die ECHT het einde van de tag is.
 */
function eindeVanTag(html, start) {
  let quote = null;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '>') return i;
  }
  return -1;
}

/* Attributen uit een taglichaam. Waarden mogen tussen ", ' of niets staan. */
function attributen(lichaam) {
  const uit = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(lichaam))) {
    uit[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return uit;
}

export default function avifNaastWebp() {
  return {
    name: 'visuails-avif-naast-webp',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);

        /* Eén cache voor de hele build. Zonder dat doet /gallery 38 keer
           `access` op dezelfde paden, en twee keer (en + nl). */
        const opSchijf = new Map();
        const heeftAvif = async (webpPad) => {
          if (!webpPad.startsWith('/img/') || !webpPad.endsWith('.webp')) return false;
          if (opSchijf.has(webpPad)) return opSchijf.get(webpPad);
          const avif = join(distDir, webpPad.slice(1)).replace(/\.webp$/, '.avif');
          let bestaat = false;
          try { await access(avif); bestaat = true; } catch { bestaat = false; }
          opSchijf.set(webpPad, bestaat);
          return bestaat;
        };

        /* "/img/a.webp 1400w, /img/b.webp 2400w" → hetzelfde met .avif, of ''
           zodra er één ontbreekt. Werkt ook voor een kale src (geen komma's,
           geen descriptor). */
        const avifLijst = async (lijst) => {
          const stukken = lijst.split(',').map((s) => s.trim()).filter(Boolean);
          if (!stukken.length) return '';
          const om = [];
          for (const stuk of stukken) {
            const [pad, ...staart] = stuk.split(/\s+/);
            if (!(await heeftAvif(pad))) return '';
            om.push([pad.replace(/\.webp$/, '.avif'), ...staart].join(' '));
          }
          return om.join(', ');
        };

        const paginas = await alleHtml(distDir);
        let omgezet = 0, overgeslagen = 0, geraakt = 0;

        for (const pad of paginas) {
          const html = await readFile(pad, 'utf8');
          if (!html.includes('<img')) continue;

          let uit = '';
          let i = 0;
          let veranderd = false;
          /* Tot waar de laatste </picture> reikt. Er staat op dit moment geen
             enkele <picture> in de bron, maar een handgeschreven <picture> is
             precies het soort ding dat er ooit bij komt, en die twee keer
             inpakken zou de AVIF-bron van de tweede laten winnen van de
             eerste. */
          let inPictureTot = -1;

          while (true) {
            const p = html.indexOf('<picture', i);
            const a = html.indexOf('<img', i);
            if (a === -1) break;

            if (p !== -1 && p < a) {
              const sluit = html.indexOf('</picture>', p);
              inPictureTot = sluit === -1 ? html.length : sluit;
            }

            const eind = eindeVanTag(html, a + 4);
            if (eind === -1) break;
            const heel = html.slice(a, eind + 1);

            if (a < inPictureTot) { uit += html.slice(i, eind + 1); i = eind + 1; overgeslagen++; continue; }

            const at = attributen(html.slice(a + 4, eind));
            const bron = at.srcset || at.src || '';
            const avif = bron ? await avifLijst(bron) : '';

            if (!avif) {
              uit += html.slice(i, eind + 1);
              i = eind + 1;
              if (bron.includes('/img/')) overgeslagen++;
              continue;
            }

            /* `sizes` MOET mee. Een <source> zonder sizes rekent met 100vw, en
               dan pakt de browser voor een tegel van 380px de bron van 2400px —
               het formaat wordt kleiner en het beeld drie keer zo zwaar. */
            const maten = at.sizes ? ` sizes="${at.sizes}"` : '';
            uit += html.slice(i, a);
            uit += `<picture><source type="image/avif" srcset="${avif}"${maten}>${heel}</picture>`;
            i = eind + 1;
            veranderd = true;
            omgezet++;
          }

          if (!veranderd) continue;
          uit += html.slice(i);
          await writeFile(pad, uit, 'utf8');
          geraakt++;
        }

        /* ── ALS ER GEEN ENKELE AVIF IS, MOET DAT SCHREEUWEN ─────────────────
           De AVIF-bestanden worden NIET door de build gemaakt — dat doet
           `npm run avif`, met de hand, omdat het encoderen van 173 beelden
           minuten kost en er bij elke CI-build niets aan verandert. Het gevolg
           is een stille faalstand: op een schone kloon zonder die stap bouwt de
           site zonder één <picture>, deployt hij prima, en is hij twee keer zo
           zwaar als hij hoort te zijn. Niets kapot, geen fout, alleen traag —
           het soort ding dat maanden meegaat.

           Vandaar deze regel. Wel beelden op de pagina's, geen enkele AVIF op
           schijf: dat is geen keuze, dat is een vergeten stap. */
        if (!omgezet && overgeslagen) {
          logger.warn(
            `avif: GEEN ENKELE AVIF gevonden naast ${overgeslagen} beeld(en). ` +
            'De site wordt nu met alleen webp gebouwd — ruwweg twee keer zo zwaar. ' +
            'Draai `npm run avif` en bouw opnieuw.'
          );
        } else {
          logger.info(
            `avif: ${omgezet} <img> in een <picture> op ${geraakt} pagina's` +
            (overgeslagen ? ` (${overgeslagen} overgeslagen — geen AVIF op schijf)` : '')
          );
        }
      },
    },
  };
}
