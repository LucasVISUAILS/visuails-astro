/* VISUAILS — wijst een CSS-variabele naar zichzelf?
 * ═══════════════════════════════════════════════════════════════════════════
 *   npm run test:tokenkring
 *
 * WAAROM DEZE TOETS BESTAAT — 20 september 2026
 *
 * Twee keer in één maand dezelfde val, en allebei de keren zag je het niet in
 * de code en wel op het scherm:
 *
 *   1 · global.css kreeg `--ink: var(--ink-1)` terwijl `--ink-1: var(--ink)`
 *       er al stond. De kop van de voorpagina was daarna onzichtbaar.
 *   2 · admin.css, portal.css en account.css kregen bij de kleurwissel
 *       `--accent: #4A1FFF` bovenin, terwijl verderop `--accent: var(--teal)`
 *       stond en `--teal: var(--accent)`. Elke primaire knop in het
 *       adminpaneel, het klantportaal en het dashboard verloor zijn VULLING —
 *       witte letters op de paginagrond, 1,24:1 — en niemand zag het, want een
 *       knop zonder vulling ziet er nog steeds uit als tekst die er hoort.
 *
 * EEN KRINGETJE IS GEEN FOUT DIE OPVALT. De CSS-specificatie zegt: een
 * variabele die (via een omweg) naar zichzelf wijst, is ONGELDIG OP
 * BEREKENINGSTIJD. Niet "valt terug op de vorige waarde" en niet "gebruikt de
 * fallback" — de declaratie bestaat gewoon niet meer en de eigenschap erft.
 * Daarom is het altijd iets dat wegvalt in plaats van iets dat verkleurt.
 *
 * WAT HIJ DOET. Per stylesheet: verzamel elke `--naam: waarde` die in een
 * `:root`-blok staat, volg de var()-verwijzingen, en meld elke naam die zichzelf
 * tegenkomt. Alleen `:root`, want de rest van de tokens staat in scopes
 * (.s22, .studio, .lime-plate) die per pagina verschillen; daar is "lost niet
 * op" geen fout maar het ontwerp.
 */
import { readFileSync } from 'node:fs';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(56)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const BLADEN = [
  'public/admin.css',
  'public/portal.css',
  'public/account.css',
  'src/styles/global.css',
];

/* Commentaar eruit: dit huis citeert oude declaraties woordelijk in de noot
   ernaast ("`--accent: var(--teal)` STOND HIER"), en zonder deze regel leest
   de toets zijn eigen verantwoording als code. Negende keer dit jaar. */
const zonderNoten = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

console.log('geen enkele token wijst naar zichzelf');
for (const blad of BLADEN) {
  const css = zonderNoten(readFileSync(new URL(`../${blad}`, import.meta.url), 'utf8'));
  /* Elk :root-blok, ook `:root[data-thema="donker"]`. De laatste declaratie van
     een naam wint, precies zoals in de browser. */
  const wortels = [...css.matchAll(/:root[^{]*\{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');
  const waarde = new Map();
  for (const m of wortels.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gmi)) waarde.set(m[1], m[2]);
  ok(`${blad} levert tokens op`, waarde.size > 20);

  const kringen = [];
  for (const naam of waarde.keys()) {
    const gezien = new Set();
    const wachtrij = [naam];
    let kring = false;
    while (wachtrij.length) {
      const nu = wachtrij.shift();
      for (const v of (waarde.get(nu) || '').matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
        const volgende = v[1];
        if (volgende === naam) { kring = true; break; }
        if (!gezien.has(volgende) && waarde.has(volgende)) { gezien.add(volgende); wachtrij.push(volgende); }
      }
      if (kring) break;
    }
    if (kring) kringen.push(naam);
  }
  ok(`  en geen van hen wijst naar zichzelf`, kringen, []);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
