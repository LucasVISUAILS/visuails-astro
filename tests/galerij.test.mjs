/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE GALERIJ: TWEE TALEN, ÉÉN BIBLIOTHEEK, EN GEEN FOTO OP VOLLE GROOTTE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * In augustus 2026 leverde deze pagina elke foto op zijn volle grootte uit:
 * 2400 px in een vakje van 375. Gemeten met de netwerklaag, niet met een
 * optelsom — 3,12 MB aan beeld op een telefoon vóórdat er gescrold was, en 9,03
 * MB doorgescrold. Dat is opgelost met derivaten en een `srcset`.
 *
 * Maar de oplossing is stil te breken, en dat is de reden voor dit bestand: de
 * srcset-functie noemt een maat alleen als het BESTAND bestaat. Dat is met opzet
 * — een srcset die naar een 404 wijst is erger dan geen srcset — maar het
 * betekent ook dat een nieuwe foto zonder derivaten gewoon meegaat, op volle
 * grootte, zonder één waarschuwing. Precies zoals het de eerste keer ging.
 *
 * ── EN DE TWEEDE TAAL LOOPT ACHTER, ALTIJD ──────────────────────────────────
 *
 * /gallery en /nl/gallery zijn twee bestanden met twee kopieën van dezelfde
 * lijst. Wie er één foto bij zet, zet hem in één van de twee. Dan mist de
 * Nederlandse bezoeker beeld dat de Engelse wel ziet, en niemand merkt het —
 * want beide pagina's zien er op zichzelf compleet uit.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'public', 'img');

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const EN = lees('src/pages/gallery.astro');
const NL = lees('src/pages/nl/gallery.astro');

/* De lijsten uit de frontmatter halen. Bewust met een regex op de LITERALEN en
   niet door het bestand uit te voeren: een .astro-bestand is geen module die je
   zomaar importeert, en wat hier getoetst wordt is juist wat er letterlijk
   staat. */
/* Twee vormen, en ze worden apart gelezen. De REEKSEN staan als template met een
   ${i} erin en zijn hier alleen te tellen; de LOSSE staan voluit tussen enkele
   aanhalingstekens en zijn wél een bestandsnaam. Ze door één regex halen levert
   afgekapte stammen als 'banners-0' op — die bestaan niet en zeggen niets. */
const losseUit = (bron) => [...bron.matchAll(/src: '\/img\/([a-z0-9-]+)\.webp'/g)].map((m) => m[1]);
const srcsUit = (bron) => [...bron.matchAll(/src: [`']\/img\//g)].map(() => 1);
const tagsUit = (bron) => [...bron.matchAll(/tag: '([a-z-]+)'/g)].map((m) => m[1]);
const filtersUit = (bron) => [...bron.matchAll(/\{ key: '([a-z-]+)', label: '([^']+)' \}/g)].map((m) => m[1]);

console.log('de twee talen tonen dezelfde bibliotheek');
{
  ok('evenveel foto-regels', srcsUit(EN).length, srcsUit(NL).length);
  ok('dezelfde soorten', [...new Set(tagsUit(EN))].sort(), [...new Set(tagsUit(NL))].sort());
  ok('dezelfde filters', filtersUit(EN), filtersUit(NL));
  /* Elk filter moet foto's hebben en elke foto een filter. Een knop die niets
     toont is een dood eind; een foto zonder knop is beeld dat alleen in "Alle"
     te vinden is. */
  const tags = new Set(tagsUit(EN));
  const keys = filtersUit(EN).filter((k) => k !== 'all');
  ok('elk filter heeft foto’s', keys.filter((k) => !tags.has(k)), []);
  ok('en elke foto valt onder een filter', [...tags].filter((t) => !keys.includes(t)), []);
}

console.log('\nelke foto bestaat, en geen enkele gaat op volle grootte mee');
{
  /* De namen met een ${i} erin zijn reeksen; die worden hier uitgeschreven zoals
     de pagina ze ook uitschrijft. Wat overblijft zijn losse bestandsnamen. */
  const reeksen = [
    ...Array.from({ length: 8 }, (_, i) => `banners-0${i + 1}`),
    ...Array.from({ length: 8 }, (_, i) => `lifestyle-flash-0${i + 1}`),
    ...Array.from({ length: 6 }, (_, i) => `lifestyle-glow-0${i + 1}`),
    ...Array.from({ length: 14 }, (_, i) => `lifestyle-phone-made-${String(i + 1).padStart(2, '0')}`),
  ];
  const alle = [...new Set([...reeksen, ...losseUit(EN)])];

  const ontbreekt = alle.filter((n) => !existsSync(path.join(IMG, `${n}.webp`)));
  ok('elk bestand ligt er', ontbreekt, []);

  /* ── DE REGEL DIE DE 3,12 MB TEGENHOUDT ──────────────────────────────────
     Een cel in dit raster wordt nooit breder dan 375 CSS px (766 voor een
     `.wide`), dus maal twee voor retina is 760 het maximum dat iemand ooit
     nodig heeft. Ligt een origineel daarboven en is er geen -w380, dan stuurt
     de pagina het origineel — en dat is precies de fout die hier is opgelost.

     Onder de 760 hoort er GEEN derivaat te zijn: make-thumbs.mjs maakt ze niet
     voor de 928px-familie, en een verkleining die groter uitvalt dan het
     origineel is verspilling met extra stappen. */
    const teGroot = [];
  for (const n of alle) {
    const bestand = path.join(IMG, `${n}.webp`);
    if (!existsSync(bestand)) continue;
    const buf = readFileSync(bestand);
    /* De breedte uit de webp-kop. VP8X (uitgebreid), VP8L (lossless) en VP8
       (lossy) coderen hem elk anders; alle drie komen in public/img voor. */
    const breedte = webpBreedte(buf);
    if (breedte > 760 && !existsSync(path.join(IMG, `${n}-w380.webp`))) teGroot.push(`${n} (${breedte}px)`);
  }
  ok('geen enkele grote foto zonder kleine versie', teGroot, []);
}

console.log('\nde Beam-reeks is de keuze die hij hoort te zijn');
{
  const beamEN = [...EN.matchAll(/src: '\/img\/(brand-[a-z-]+)\.webp', tag: 'beam'/g)].map((m) => m[1]);
  const beamNL = [...NL.matchAll(/src: '\/img\/(brand-[a-z-]+)\.webp', tag: 'beam'/g)].map((m) => m[1]);
  ok('zes foto’s', beamEN.length, 6);
  ok('en in beide talen dezelfde zes', beamEN, beamNL);

  /* DE VIER ACHTERGRONDEN HOREN ER NIET IN. beam, desk, glow en pool zijn
     abstracte lichtstudies die op /studio en achter het lege abonnementsscherm
     staan. In een raster dat "de stijlen die we maken" heet, verwateren ze de
     reeks in plaats van hem te dragen. */
  ok('geen abstracte achtergronden',
    beamEN.filter((n) => ['brand-beam', 'brand-desk', 'brand-glow', 'brand-pool'].includes(n)), []);
  /* brand-car.webp is byte voor byte hetzelfde bestand als brand-car-lens.webp.
     Twee keer dezelfde foto in één raster valt op. */
  ok('en niet de dubbele brand-car', beamEN.includes('brand-car'), false);

  /* HET LABEL IS EEN LOOK EN GEEN DIENST. 'Editions' zou een nog niet leverbare
     dienst als filter neerzetten; 'Mood' zou zeggen dat er geen producten op
     staan, en die staan er wel. De andere filters zijn ook looks. */
  ok('het filter heet Beam', /\{ key: 'beam', label: 'Beam' \}/.test(EN) && /\{ key: 'beam', label: 'Beam' \}/.test(NL), true);
  ok('en niet Editions of Mood',
    /key: 'beam', label: '(Editions|Mood|Sfeer)'/.test(EN + NL), false);

  /* Elke foto een eigen alt, en niet één zin zes keer. Zes identieke alts zijn
     voor een schermlezer hetzelfde als zes lege. */
  const altsEN = [...EN.matchAll(/tag: 'beam', alt: '([^']+)'/g)].map((m) => m[1]);
  ok('zes verschillende alt-teksten', new Set(altsEN).size, 6);
  const altsNL = [...NL.matchAll(/tag: 'beam', alt: '([^']+)'/g)].map((m) => m[1]);
  ok('ook in het Nederlands', new Set(altsNL).size, 6);
  ok('en die zijn vertaald en niet gekopieerd', altsEN.some((a) => altsNL.includes(a)), false);
}

/** De pixelbreedte uit een webp-kop, voor de drie varianten die hier voorkomen. */
function webpBreedte(buf) {
  if (buf.slice(0, 4).toString('ascii') !== 'RIFF' || buf.slice(8, 12).toString('ascii') !== 'WEBP') return 0;
  const soort = buf.slice(12, 16).toString('ascii');
  if (soort === 'VP8X') return ((buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1);
  if (soort === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return (b & 0x3FFF) + 1;
  }
  if (soort === 'VP8 ') return buf.readUInt16LE(26) & 0x3FFF;
  return 0;
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
