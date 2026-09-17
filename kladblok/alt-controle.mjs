/* VISUAILS — hebben alle beelden op de gebouwde site een zinnige alt-tekst?
 *
 * Meet over dist/ en niet over de bron: wat een bezoeker en een schermlezer
 * krijgen is de HTML die er uit komt, en de bouw voegt zelf <picture>/<img>
 * toe. Drie soorten treffers, en het verschil telt:
 *
 *   ONTBREEKT   geen alt-attribuut. Een schermlezer leest dan de BESTANDSNAAM
 *               voor. Altijd fout.
 *   LEEG        alt="". Correct voor een beeld dat niets toevoegt naast de
 *               tekst ernaast (decoratie, of een tweede beeld in een set waar
 *               het eerste de betekenis draagt). Alleen verdacht in aantallen.
 *   ZWAK        een alt die de bestandsnaam is, of "foto"/"image"/"afbeelding"
 *               en verder niets.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const paginas = [];
(function loop(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) loop(p);
    else if (n.endsWith('.html')) paginas.push(p);
  }
})('dist');

const ZWAK = /^(foto|image|photo|afbeelding|picture|img|beeld|logo)?[\s.:-]*$/i;
let totaal = 0, ontbreekt = 0, leeg = 0, zwak = 0;
const raak = { ontbreekt: [], zwak: [], leegVeel: [], naamloos: [] };

for (const p of paginas.sort()) {
  const html = readFileSync(p, 'utf8');
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  let leegHier = 0;
  for (const tag of imgs) {
    totaal += 1;
    /* `alt` zonder waarde is geldig HTML en betekent alt="" — de bouw schrijft
       het zo weg als de waarde een lege string is. Wie daar op `alt=` zoekt,
       telt correcte lege alts als ONTBREKEND en jaagt op een fout die er niet
       is. Eerst de vorm met waarde, dan de kale. */
    const m = /\balt\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag)
      || (/\balt(?=[\s>])/i.test(tag) ? ['', '""', ''] : null);
    const src = (/\bsrc\s*=\s*"([^"]*)"/i.exec(tag) || [])[1] || '?';
    if (!m) { ontbreekt += 1; raak.ontbreekt.push(`${p} — ${src}`); continue; }
    const v = (m[2] ?? m[3] ?? '').trim();
    if (!v) { leeg += 1; leegHier += 1; continue; }
    const bestand = src.split('/').pop()?.replace(/\.[a-z0-9]+$/i, '') || '';
    if (ZWAK.test(v) || v.toLowerCase() === bestand.toLowerCase()) {
      zwak += 1; raak.zwak.push(`${p} — "${v}" (${src})`);
    }
  }
  if (leegHier >= 5) raak.leegVeel.push(`${p} — ${leegHier} van ${imgs.length}`);
  /* Een LINK met alleen een beeld met lege alt erin heeft geen naam: een
     schermlezer kondigt hem aan als "link" en verder niets. Tenzij de link
     zelf een aria-label draagt of uit de boom is gehaald. */
  for (const a of html.match(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi) || []) {
    if (/aria-label|aria-hidden|title=/i.test(a)) continue;
    if (/<img[^>]*\balt\s*=\s*("[^"]+"|'[^']+')/i.test(a)) continue;
    raak.naamloos.push(`${p} — ${(/(href="[^"]*")/i.exec(a) || [])[1] || a.slice(0, 60)}`);
  }
}

console.log(`pagina's: ${paginas.length}`);
console.log(`<img>:    ${totaal}`);
console.log(`  zonder alt : ${ontbreekt}`);
console.log(`  alt=""     : ${leeg}`);
console.log(`  zwakke alt : ${zwak}`);
for (const [kop, lijst] of [['ZONDER ALT', raak.ontbreekt], ['ZWAK', raak.zwak], ['LINK ZONDER NAAM (alleen een beeld met lege alt erin)', raak.naamloos], ['VEEL LEGE ALTS OP ÉÉN PAGINA', raak.leegVeel]]) {
  if (!lijst.length) continue;
  console.log(`\n${kop} (${lijst.length}):`);
  for (const r of lijst.slice(0, 25)) console.log('  ' + r);
  if (lijst.length > 25) console.log(`  … en nog ${lijst.length - 25}`);
}
