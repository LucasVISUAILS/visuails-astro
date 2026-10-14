/* VISUAILS — voorwaarden §5: als een gezicht op een bestaand persoon lijkt (11 oktober 2026, o22).
 *   node tests/voorwaarden-portretrecht.test.mjs      (geen server; leest dist/ als die er is)
 *
 * Lucas' notitie bij t-j1-6: elk gezicht door de gezichtszoekmachines, gelijkenis
 * nooit uit te sluiten, bij een beroep op portretrecht vervangen wij de beelden
 * door een ander model op onze kosten en in overleg, meestal binnen twee weken.
 * Wat er NIET mag staan: een garantie, "zeker", een vrijwaring of een
 * schadevergoeding — die noemde hij niet.
 */
import { readFileSync, existsSync } from 'node:fs';
import { GEZICHTSZOEKERS } from '../src/data/modelChecks.js';
import { PORTRET_VERVANGEN_WEKEN, inWoorden } from '../src/data/termijnen.js';
import { LAATST_BIJGEWERKT } from '../src/data/juridischeDatums.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const alinea = (bron, kop) => {
  const i = bron.indexOf(`<strong>${kop}</strong>`);
  return i < 0 ? '' : bron.slice(bron.lastIndexOf('<p>', i), bron.indexOf('</p>', i) + 4);
};
const paragraaf5 = (bron, kop5, kop6) => bron.slice(bron.indexOf(kop5), bron.indexOf(kop6));

ok('drie gezichtszoekers in het logboek (de tekst noemt dit aantal)', GEZICHTSZOEKERS.length, 3);
ok('richttijd: twee weken', PORTRET_VERVANGEN_WEKEN, 2);

for (const [taal, pad, kop, merk, k5, k6] of [
  ['nl', 'src/pages/nl/terms.astro', 'Als een gezicht op een bestaand persoon lijkt.', 'Een merkmodel is een gezicht dat niet bestaat.', '<h2>5.', '<h2>6.'],
  ['en', 'src/pages/terms.astro', 'If a face resembles a real person.', 'A brand model is a face that does not exist.', '<h2>5.', '<h2>6.'],
]) {
  const bron = lees(pad);
  const p5 = paragraaf5(bron, k5, k6);
  const a = alinea(bron, kop);
  ok(`${taal}: de alinea staat in §5`, p5.includes(kop));
  ok(`${taal}: direct na de alinea over het merkmodel`, p5.indexOf(kop) > p5.indexOf(merk)
    && !/<p>/.test(p5.slice(p5.indexOf(merk), p5.lastIndexOf('<p>', p5.indexOf(kop))).replace(/^[\s\S]*?<\/p>/, '')));
  ok(`${taal}: aantal en weken uit de data, niet getypt`, a.includes('{portretZoekers}') && a.includes('{portretWeken}') && !/\b(3|2|drie|three|twee|two)\b/i.test(a.replace(/\{[^}]+\}/g, '')));
  ok(`${taal}: frontmatter leest GEZICHTSZOEKERS en PORTRET_VERVANGEN_WEKEN`,
    /import \{ GEZICHTSZOEKERS, rosterVolledigGecontroleerd \} from '[./]+data\/modelChecks\.js';/.test(bron) && /PORTRET_VERVANGEN_WEKEN \} from '[./]+data\/termijnen\.js';/.test(bron));
  const zonderMarkup = a.replace(/<[^>]+>/g, '');
  const geenBelofte = taal === 'nl'
    ? /garantie|garanderen|gegarandeerd|\bzeker\b|vrijwaren|vrijwaring|schadevergoeding|aansprakelijk/i
    : /guarantee|\bsure\b|certain|indemn|hold you harmless|damages|liab/i;
  ok(`${taal}: geen garantie, "zeker", vrijwaring of schadevergoeding`, geenBelofte.test(zonderMarkup), false);
  if (taal === 'nl') {
    ok('nl: de vaste modellen alleen als het logboek ze dekt', /\{vasteModellenGecontroleerd \? ', ook dat van onze vaste modellen,' : ''\}/.test(a) && /const vasteModellenGecontroleerd = rosterVolledigGecontroleerd\(\);/.test(bron));
    ok('nl: gezichtszoekmachines (zoals /ai-act), vóór gebruik', /vóór gebruik door \{portretZoekers\} verschillende gezichtszoekmachines/.test(a));
    ok('nl: gelijkenis valt nooit helemaal uit te sluiten', /valt nooit helemaal uit te sluiten/.test(a));
    ok('nl: portretrecht → andere beelden, op onze kosten', /portretrecht, dan vervangen wij alle beelden met dat gezicht door beelden met een ander model, op onze kosten/.test(a));
    ok('nl: in overleg welk model en hoe', /welk model en hoe we het aanpakken, overleggen we met jou/.test(a));
    ok('nl: meestal binnen …, bij veel beelden langer', /Meestal is dat binnen \{portretWeken\} klaar; bij veel beelden of video’s kan het langer duren/.test(a));
    ok('nl: melding meteen doorsturen', /stuur die dan meteen aan ons door/.test(a));
    ok('nl: apostrof ’ en geen rechte', /zo'n|video's/.test(a), false);
  } else {
    ok('en: standard models only when the log covers them', /\{vasteModellenGecontroleerd \? ', including those of our standard models,' : ''\}/.test(a) && /const vasteModellenGecontroleerd = rosterVolledigGecontroleerd\(\);/.test(bron));
    ok('en: face-search engines (as on /ai-act), before use', /\{portretZoekers\} different face-search engines before it is used/.test(a));
    ok('en: never ruled out completely', /can never be ruled out completely/.test(a));
    ok('en: portrait rights → other model, at our cost', /portrait rights[^.]*, we replace every image with that face with images of a different model, at our cost/.test(a));
    ok('en: agreed with you', /we agree with you which model to use and how we go about it/.test(a));
    ok('en: usually within …, longer with many', /usually done within \{portretWeken\}; with many images or videos it can take longer/.test(a));
    ok('en: forward a claim straight away', /forward it to us straight away/.test(a));
  }
}
ok('de woorden: drie / three, twee weken / two weeks', [inWoorden(3, 'nl'), inWoorden(3, 'en'), inWoorden(2, 'nl'), inWoorden(2, 'en')], ['drie', 'three', 'twee', 'two']);
ok('de voorwaarden staan op oktober 2026', LAATST_BIJGEWERKT.terms, '2026-10');

/* Gebouwd? Dan de zinnen zoals de klant ze leest. */
for (const [pad, zin] of [
  ['dist/nl/terms/index.html', 'halen we vóór gebruik door drie verschillende gezichtszoekmachines'],
  ['dist/nl/terms/index.html', 'Meestal is dat binnen twee weken klaar'],
  ['dist/terms/index.html', 'is put through three different face-search engines before it is used'],
  ['dist/terms/index.html', 'This is usually done within two weeks'],
]) {
  if (!existsSync(new URL(`../${pad}`, import.meta.url))) { console.log(`  --   ${pad} ontbreekt (niet gebouwd), overgeslagen`); continue; }
  ok(`${pad}: "${zin.slice(0, 50)}…"`, lees(pad).includes(zin));
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
