/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * ELK VERPLICHT VELD ZEGT ZELF WAT ERAAN MANKEERT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Een `required` zonder eigen melding levert de tekst van de BROWSER op: "Vul dit
 * veld in", in de taal van de browser en niet van de pagina, zonder te zeggen
 * waaróm het veld er staat. Op een contactformulier is dat vervelend; op het
 * bestelformulier is het de laatste stap voor een betaling.
 *
 * Er zijn twee mechanismen op deze site, en dat is geen slordigheid maar
 * geschiedenis: `data-melding` wordt door src/scripts/interactions.js op elk
 * gewoon formulier gezet, en de bestelstroom draagt zijn eigen `data-pl-err-msg`
 * omdat die stap voor stap valideert in plaats van bij verzenden. Allebei tellen.
 *
 * DE DERDE UITZONDERING IS EEN KEUZE DIE AL GEMAAKT IS. Een radiogroep waarvan
 * één optie `checked` staat, kan niet leeg zijn — daar kan de melding nooit
 * verschijnen. Die eisen is een regel schrijven die niets bewaakt.
 *
 * Deze toets bestaat omdat de veeg die hem opleverde twee keer het verkeerde
 * antwoord gaf: eerst vijftien "gaten" die allemaal een eigen melding hadden
 * onder een andere naam, daarna twee die niet leeg kúnnen zijn. Wat overblijft is
 * hieronder vastgelegd, zodat de volgende die een veld toevoegt het antwoord
 * krijgt van een toets en niet van een klant.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORTEL = fileURLToPath(new URL('../src', import.meta.url));
const bestanden = [];
(function loop(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) loop(p);
    else if (extname(p) === '.astro') bestanden.push(p);
  }
})(WORTEL);

const TAG = /<(input|select|textarea)\b[^>]*>/gis;
const gaten = [];
let bekeken = 0;

for (const p of bestanden) {
  const s = readFileSync(p, 'utf8');
  for (const m of s.matchAll(TAG)) {
    const tag = m[0];
    if (!/\brequired\b/.test(tag)) continue;
    if (/type="(hidden|submit|button)"/i.test(tag)) continue;
    bekeken += 1;
    if (/data-melding|data-pl-err-msg/.test(tag)) continue;
    /* Een radio of checkbox die al aan staat, kan niet leeg blijven. */
    if (/type="(radio|checkbox)"/i.test(tag) && /\bchecked\b/.test(tag)) continue;
    const regel = s.slice(0, m.index).split('\n').length;
    const naam = (tag.match(/name="([^"]+)"/) || [])[1]
      || (tag.match(/id="([^"]+)"/) || [])[1] || '?';
    gaten.push(`${p.slice(WORTEL.length - 3)}:${regel}  ${naam}`);
  }
}

console.log(`\n${bekeken} verplichte velden nagelopen in ${bestanden.length} .astro-bestanden`);
if (gaten.length) {
  console.log(' FAIL deze verplichte velden hebben geen eigen foutmelding:');
  for (const g of gaten) console.log(`        ${g}`);
  console.log('\n       Zet er data-melding="…" op (of data-pl-err-msg in de bestelstroom),');
  console.log('       in de taal van de pagina, en zeg WAAROM het veld er staat.');
  console.log(`\n0/1 geslaagd`);
  process.exit(1);
}
console.log(' ok   elk verplicht veld draagt zijn eigen melding             ');
console.log('\n1/1 geslaagd');
