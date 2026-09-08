/*
 * VISUAILS — een regelafbreking mag geen twee woorden aan elkaar plakken.
 *
 *   npm run test:regelafbreking
 *
 * ── WAT ER FOUT WAS ─────────────────────────────────────────────────────────
 *
 * 8 september 2026, gevonden bij het nameten van de paginahoogtes. De slotkop
 * van /nl/lifestyle stond in de bron als:
 *
 *     ctaH: 'Zet je product<br>in een scène die verkoopt.'
 *
 * Op het scherm klopt dat: <br> breekt de regel en je leest "Zet je product /
 * in een scène die verkoopt." Maar de TEKST van dat element is
 * "Zet je productin een scène die verkoopt" — zonder spatie, want een <br> is
 * geen witruimte. Alles wat de tekst LEEST in plaats van tekent, krijgt dat
 * woord: llms.txt, een zoekmachine, een deelkaart, iemand die de kop kopieert,
 * en elke voorleeshulp die de tekstinhoud pakt in plaats van de opmaak.
 *
 * Het stond op 24 plekken, in tien bestanden, in allebei de talen. Niet één
 * ervan is met het blote oog te zien — het is precies het soort fout dat je
 * alleen vindt door de tekst uit te lezen en niet naar de pagina te kijken.
 *
 * ── DE REGEL ────────────────────────────────────────────────────────────────
 *
 * Vóór elke <br> staat witruimte, of een tag-einde (`>`). In het eerste geval
 * levert de spatie het woordeinde; in het tweede geval eindigde er net een
 * element en is er niets om aan vast te plakken. HTML slikt een spatie aan het
 * einde van een regel, dus aan de weergave verandert er niets.
 *
 * TWEE KEER GECONTROLEERD, en dat is met opzet: in de BRON, want daar wordt het
 * geschreven en daar hoort de fout gemeld te worden — en in dist/, want een deel
 * van de koppen wordt tijdens de build samengesteld uit losse stukken, en dan
 * staat er in geen enkel bronbestand een <br> naast het woord dat eraan vastzit.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';

let pass = 0, fail = 0;
const check = (naam, echt, verwacht) => {
  const ok = JSON.stringify(echt) === JSON.stringify(verwacht);
  console.log(` ${ok ? 'ok  ' : 'FOUT'}   ${naam}`);
  if (!ok) { console.log(`        verwacht ${JSON.stringify(verwacht)}`); console.log(`        kreeg    ${JSON.stringify(echt)}`); }
  ok ? pass++ : fail++;
};

/* Een <br> die aan BEIDE kanten tegen een woord aan staat. Eén kant is genoeg
   om de fout te voorkomen, en dat is niet theoretisch — in de bron staan drie
   soorten die er alleen maar op lijken:

     "…the Netherlands<br> KVK 99742993"   ← de spatie staat erachter
     `${copy.alt}<br><a href=…`            ← erachter begint een element
     .replace(/\n/g, '<br>')               ← de <br> ís de string

   Alle drie zijn goed. Wat fout is, is precies: woord, breuk, woord. */
const PLAK = /[^\s>'"`](<br\s*\/?>)(?=[^\s<'"`])/g;

/* Wat er precies fout gaat, met genoeg tekst eromheen om het terug te vinden. */
const vondsten = (tekst) => {
  const uit = [];
  for (const m of tekst.matchAll(PLAK)) {
    const van = Math.max(0, m.index - 26);
    uit.push(tekst.slice(van, m.index + m[0].length + 20).replace(/\s+/g, ' '));
  }
  return uit;
};

console.log('geen regelafbreking die twee woorden aan elkaar plakt — in de bron');
{
  /* Normaliseren binnen drie regels — huisregel. */
  const bestanden = globSync('src/**/*.{astro,js,ts}')
    .map((p) => p.replace(/\\/g, '/'))
    .filter((p) => !p.includes('/node_modules/'));
  check('er zijn bronbestanden gevonden', bestanden.length > 0, true);
  for (const f of bestanden) {
    const gevonden = vondsten(readFileSync(f, 'utf8'));
    if (gevonden.length) check(f, gevonden, []);
  }
  console.log(` ${bestanden.length} bronbestand(en) nagelopen`);
}

console.log('\nen niet in de gebouwde pagina’s');
{
  const DIST = 'dist';
  if (!existsSync(DIST)) {
    console.log(' ov   dist/ ontbreekt — draai eerst `npx astro build`');
  } else {
    const paginas = [];
    const loop = (d) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) { loop(p); continue; }
        if (n.endsWith('.html')) paginas.push(p);
      }
    };
    loop(DIST);
    check('er zijn pagina’s gebouwd', paginas.length > 0, true);
    let stuk = 0;
    for (const p of paginas) {
      const gevonden = vondsten(readFileSync(p, 'utf8'));
      if (gevonden.length) { check(p, gevonden, []); stuk++; }
    }
    if (!stuk) console.log(` ok     ${paginas.length} pagina’s, geen enkele plakt`);
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
