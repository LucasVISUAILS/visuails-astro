/* VISUAILS — levering 117 (17 november 2026), proefronde P6-05: Phone-made belooft geen "echte" scènes meer.
 *
 *   node tests/levering-117-tekst-stijl.test.mjs      (geen build nodig: leest de data en meet in de letter zelf)
 *
 * Op /lifestyle/phone-made stond "Echte, met-de-telefoon-gemaakte lifestylescènes", op de voorpagina (stap 05 van de
 * banner) "video op locatie". De AI Act-pagina zegt dat niets een echte plek of shoot is. Wat hier bewaakt wordt:
 *   1 · Phone-made, "Wat je krijgt": "Lifestylescènes die eruitzien alsof ze met de telefoon gemaakt zijn" (NL) en
 *       "Lifestyle scenes that look as if they were shot on a phone" (EN); geen "Echte" / "Authentic, phone-real";
 *   2 · stap 05 van de banner: "in een gebouwde scène" / "in a built scene", niet meer "op locatie" / "on location";
 *   3 · de balk wordt niet breder: de nieuwe zin van stap 05 is in DM Sans niet breder dan de oude (gemeten met de
 *       breedte van elke letter uit public/fonts/dm-sans; zonder lettermeter: niet meer tekens).
 */
import { readFileSync } from 'node:fs';
import { styles as lsEn } from '../src/data/styles.js';
import { styles as lsNl } from '../src/data/styles.nl.js';
import { BANNER } from '../src/data/banner94.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

console.log('\n1 · Phone-made, "Wat je krijgt"');
const pm = (ls) => ls.find((s) => s.slug === 'phone-made');
ok('NL: "Lifestylescènes die eruitzien alsof ze met de telefoon gemaakt zijn"', pm(lsNl).whatYouGet.includes('Lifestylescènes die eruitzien alsof ze met de telefoon gemaakt zijn'), JSON.stringify(pm(lsNl).whatYouGet));
ok('EN: "Lifestyle scenes that look as if they were shot on a phone"', pm(lsEn).whatYouGet.includes('Lifestyle scenes that look as if they were shot on a phone'), JSON.stringify(pm(lsEn).whatYouGet));
ok('  geen "Echte, met-de-telefoon-gemaakte" en geen "Authentic, phone-real"', !JSON.stringify(pm(lsNl).whatYouGet).includes('Echte') && !JSON.stringify(pm(lsEn).whatYouGet).includes('phone-real'));

console.log('\n2 · stap 05 van de banner');
const OUD = {
  nl: 'En lifestyle en video op locatie, voor je feed en je advertenties.',
  en: 'Then lifestyle and video on location, for your feed and your ads.',
};
const stap5 = (l) => BANNER[l].stappen[4];
ok('NL: "in een gebouwde scène"', /in een gebouwde scène/.test(stap5('nl')[1]) && !/op locatie/.test(stap5('nl')[1]), stap5('nl')[1]);
ok('EN: "in a built scene"', /in a built scene/.test(stap5('en')[1]) && !/on location/.test(stap5('en')[1]), stap5('en')[1]);
ok('  de naam van de stap bleef (Campagne / Campaign)', stap5('nl')[0] === 'Campagne' && stap5('en')[0] === 'Campaign');

console.log('\n3 · de balk wordt niet breder');
let breedte = null;
try {
  const { create } = await import('fontkitten');
  const f = create(readFileSync(new URL('../public/fonts/dm-sans/dm-sans-latin.woff2', import.meta.url)));
  /* .b94-uitleg: DM Sans 400 op 13,5 px, met de naam van de stap en " · " ervoor */
  breedte = (s) => [...s].reduce((t, ch) => t + (f.glyphForCodePoint(ch.codePointAt(0))?.advanceWidth || 0), 0) / f.unitsPerEm * 13.5;
} catch { /* geen lettermeter: dan tellen we tekens */ }
for (const l of ['nl', 'en']) {
  const oud = `${stap5(l)[0]} · ${OUD[l]}`, nieuw = `${stap5(l)[0]} · ${stap5(l)[1]}`;
  if (breedte) ok(`${l}: ${breedte(nieuw).toFixed(1)} px ≤ ${breedte(oud).toFixed(1)} px (DM Sans 13,5 px)`, breedte(nieuw) <= breedte(oud) + 0.01);
  else ok(`${l}: ${nieuw.length} ≤ ${oud.length} tekens`, nieuw.length <= oud.length);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
