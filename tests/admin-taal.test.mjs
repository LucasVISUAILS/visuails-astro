/* VISUAILS — het adminportaal spreekt één taal.
 *   npm run test:admintaal
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 12 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas: *"Ook voelt het dashboard en admin nog wat inconsistent en kan het ook
 * wat rustiger ogen."*
 *
 * Er is lang naar de verkeerde oorzaak gezocht. De RUIMTE is nagemeten — negen
 * gerenderde adminschermen, op 1280 en op 390 pixels, elk paar naburige
 * elementen — en er staat nergens iets op elkaar. Het RITME is nagemeten: /admin
 * gebruikt negen verschillende afstanden, de voorpagina elf. Op allebei die
 * maten is het adminportaal niet slechter dan de rest van de site.
 *
 * Wat er wél was, bleek pas bij het kijken: het scherm was HALF VERTAALD.
 * Geteld op de gerenderde schermen — 42 zichtbare stukken Engels tegenover 38
 * Nederlands, in één interface, met een Nederlandse navigatiebalk erboven. "Het
 * bord" heette "The board", de fotovakjes heetten Front/Back/Detail/On model, en
 * de knop onder een Nederlandse kop zei "Push 1 to the customer".
 *
 * Dát is wat "inconsistent" betekent als je het niet in pixels kunt vinden. Na
 * het vertalen: 4 stukken Engels, en dat zijn de verzonnen bestandsnamen in de
 * testgegevens.
 *
 * ── WAAROM STATISCH EN NIET GERENDERD ──────────────────────────────────────
 * De gerenderde meting is de eerlijkste, maar kost tien browserstarts. Deze
 * toets leest de BRON, en dat is precies genoeg: een nieuwe Engelse zin komt
 * daar binnen, niet in de render. Wie de gerenderde telling wil, draait
 * scripts/admin-render.mjs met VISUAILS_DUMP_HTML.
 */
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (naam, voorwaarde, uitleg = '') => {
  if (voorwaarde) { pass++; console.log(` ok   ${naam}`); }
  else { fail++; console.log(` FAIL ${naam}${uitleg ? '\n' + uitleg : ''}`); }
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — het adminportaal spreekt Nederlands\n');

/* Woorden die een zin onmiskenbaar in één taal zetten. Klein gehouden en met
   opzet gewoon: een lange lijst vangt niet meer, hij vangt alleen vaker het
   verkeerde. Een zin telt alleen als Engels wanneer er een Engels woord in staat
   én geen enkel Nederlands — "Slots bijstellen" was zo'n gemengd geval, en die
   hoort gevonden te worden, niet weggefilterd. */
const NL = /\b(de|het|een|en|van|voor|met|niet|wordt|zijn|naar|bij|aan|op|je|jij|wij|dit|deze|die|dat|als|nog|geen|wel|maar|uit|om|per|kan|klant|bestelling|beeld|foto|bestand|grootte|gemeld|vakjes|wat|hier)\b/i;
const EN = /\b(the|and|for|with|not|are|this|that|from|your|you|will|has|have|been|we|it|when|then|each|only|still|slots|board|uploads|customer|files|saved|press|push|run|again|never|everything|every|asks|scratch|announced|replace|upload|size|shot|front|back|delete|erase|refund|cancel|set|no)\b/i;

/* Strings die met opzet Engels zijn en dat mogen blijven. Elk met een reden —
   een uitzondering zonder reden wordt een uitzondering die groeit. */
const MAG_ENGELS = [
  /^npm run /,                    // een commando dat je overtypt
  /^[A-Z_]{3,}$/,                 // een omgevingsvariabele of constante
  /^https?:\/\//,                 // een adres
  /MOLLIE|STRIPE|RESEND|R2|D1|KV/, // namen van diensten
  /\.(webp|jpg|png|sql|mjs|js)\b/, // bestandsnamen
  /* SQL. `>` en `<` zijn daar vergelijkingen en geen tags, dus het patroon
     hieronder vist er hele WHERE-clausules uit. Die staan niet op het scherm
     en hoeven dus niet vertaald — maar ze wél uitzonderen is beter dan het
     patroon oprekken, want dan glipt er echte schermtekst mee weg. */
  /* Let op de woordgrenzen: `\b` vóór `\?` werkt niet, want een vraagteken is
     geen woordteken. Die eerste versie liet "= ?1 AND day" er dus gewoon
     doorheen — gevonden door de toets te draaien, niet door hem te lezen. */
  /(\bSELECT\b|\bFROM\b|\bWHERE\b|\bJOIN\b|\bINSERT\b|\bUPDATE\b|\bCOALESCE\b|IS NOT NULL|\?\d|\bAND\b\s+\w+\s*[<>=])/,
];

{
  const bron = lees('src/lib/admin.js');
  /* Alles wat tussen > en < in een template-literal staat: dat is wat op het
     scherm terechtkomt. Placeholders (${…}) en backticks eruit, want die zijn
     code en geen tekst. */
  const stukken = [...bron.matchAll(/>([^<>`${}]{6,90})</g)]
    .map((m) => m[1].replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim())
    .filter((t) => /[A-Za-z]{3}/.test(t));

  const engels = [...new Set(stukken)]
    .filter((t) => EN.test(t) && !NL.test(t))
    .filter((t) => !MAG_ENGELS.some((r) => r.test(t)));

  ok(`er zijn zinnen om te controleren (${stukken.length})`, stukken.length > 100);
  ok('geen Engelse zinnen meer in het adminportaal', engels.length === 0,
    engels.map((t) => `       · ${t.slice(0, 76)}`).join('\n')
    + (engels.length ? '\n       → vertaal ze, of zet ze met een reden in MAG_ENGELS hierboven.' : ''));

  /* ── EN DE FOTOLABELS KOMEN UIT ÉÉN LIJST ──────────────────────────────
     Er stond een eigen `{ front: 'Front', … }` in admin.js naast de lijst in
     src/data/shots.js die er allang twee talen voor heeft. Dat was niet alleen
     de bron van het Engels: een tweede lijst met fotosoorten loopt uit de pas
     zodra er een vijfde bij komt, en dan mist het bord het vakje waar de foto
     in moet. */
  ok('de fotolabels komen uit shots.js',
    /SHOTS as SHOTS_DATA.*from '\.\.\/data\/shots\.js'/.test(bron), '       de import is weg');
  /* Zonder commentaar, want de noot bij SHOT_LABEL citeert juist het lijstje
     dat is weggehaald — en een toets die op zijn eigen uitleg afgaat, is groen
     of rood om de verkeerde reden. */
  const zonderNoten = bron.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok('  en niet uit een eigen Engels lijstje',
    !/front:\s*'Front'/.test(zonderNoten), '       er staat weer een tweede lijst in admin.js');
}

/* ── DE NAVIGATIE EN HET SCHERM ERONDER HOREN BIJ ELKAAR ═══════════════════
   De balk was al Nederlands toen de rest het niet was, en dat is precies wat
   het half-vertaalde gevoel gaf. Deze regel bewaakt dat die balk blijft zoals
   hij is, zodat "één taal" niet per ongeluk de andere kant op wordt opgelost. */
{
  const bron = lees('src/lib/admin.js');
  for (const woord of ['Dashboard', 'Planning', 'Agenda', 'Klanten', 'Uitloggen']) {
    ok(`de balk noemt ${woord}`, new RegExp(`>${woord}<|'${woord}'`).test(bron));
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
