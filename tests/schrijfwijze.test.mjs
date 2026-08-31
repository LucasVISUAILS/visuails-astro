/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE TEKENS UIT DE SCHRIJFWIJZER  ·  npm run test:schrijfwijze
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 24 augustus 2026, bij het aanleveren van de tekstronde van de homepage:
 *
 *   "Ik wil ook dat je alle zinnen die ik aanpas opsla in hoe ik zinnen
 *    gestructureerd wil hebben, dus sla deze op en wanneer ik bijvoorbeeld
 *    nieuwe secties aan de website toevoeg, verminderd dit wellicht de kans op
 *    foute zinnen en spellingsfouten."
 *
 * SCHRIJFWIJZER.md is dat document. Dit bestand is het deel ervan dat een
 * machine kan nakijken, en dat is met opzet een KLEIN deel: alleen de twee
 * tekenconventies. De rest van die wijzer gaat over stijl, en een toets die
 * stijl afdwingt keurt op een dag de betere zin af.
 *
 * ── WAAROM JUIST DEZE TWEE ─────────────────────────────────────────────────
 *
 * Omdat ze allebei stil misgaan. Niemand ziet bij het schrijven dat hij de ene
 * apostrof gebruikt en de vorige regel de andere; je ziet het pas als de twee
 * naast elkaar op het scherm staan, en dan staat het er al.
 *
 * 1 · HET KASTLIJNTJE KRIJGT SPATIES. Gemeten op de bron van 24 augustus 2026:
 *     3.666 keer ` — `, 5 keer `—` zonder. Die vijf kwamen uit twee handen en
 *     vielen op als een ander handschrift.
 *
 * 2 · DE APOSTROF IN EEN WOORD IS `’` EN NIET `'`. Dit is de zwaarste van de
 *     twee en hij is niet cosmetisch: een rechte apostrof in een zin die in een
 *     single-quoted JavaScript-string belandt, BEËINDIGT die string. Op
 *     23 augustus lag `src/i18n/ui.js` daarop plat, op het woord
 *     `Catalogusfoto's`. De bouw faalde toen luid, wat geluk was — bij een
 *     andere plaatsing was het een halve zin op het scherm geweest.
 *
 * ── ALLEEN IN ZICHTBARE TEKST ──────────────────────────────────────────────
 *
 * Commentaar telt niet mee, en dat is geen luiheid: dit bestand en de bestanden
 * die het leest, LEGGEN de fout uit en schrijven hem daarbij voluit. Een toets
 * die zijn eigen uitleg afkeurt, is een toets die wordt uitgezet.
 *
 * En code telt ook niet mee. `don't` in een Engelse noot is prima; het gaat om
 * wat een bezoeker leest.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
const check = (naam, gekregen, verwacht = []) => {
  const ok = JSON.stringify(gekregen) === JSON.stringify(verwacht);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)}${ok ? '' : `\n        ${JSON.stringify(gekregen).slice(0, 400)}`}`);
};

/* Commentaar eruit, want dat legt de fouten uit. Vierde keer dat dit patroon in
   dit project nodig is; zie de kop van tests/promises.test.mjs. */
const zonderCommentaar = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '));

const MAPPEN = ['src/components', 'src/pages', 'src/data', 'src/i18n', 'src/layouts'];
/* src/data/whatsapp.js bestaat volledig uit berichten die in WhatsApp worden
   getypt en niet op deze site verschijnen — zie de uitzondering hieronder. Het
   hele bestand valt daarom buiten de apostrofregel; per regel uitzonderen wérkte
   niet, want daar staat het woord "whatsapp" niet noodzakelijk op de regel zelf. */
const WA_BESTAND = 'src/data/whatsapp.js';
/* Met schuine strepen, ook op Windows: `join()` plakt met de scheiding van het
   besturingssysteem, en deze namen worden verderop met `src/data/whatsapp.js`
   vergeleken en in meldingen afgedrukt. Zie tests/paths.test.mjs §2b voor de
   keer dat een ongenormaliseerd globresultaat een suite op één platform liet
   omvallen. */
const bestanden = MAPPEN.flatMap((m) =>
  globSync('**/*.{astro,js}', { cwd: join(ROOT, m) }).map((f) => join(m, f).replace(/\\/g, '/'))
);

console.log(`\nde tekenconventies, over ${bestanden.length} bronbestanden`);

/* ── 1 · HET KASTLIJNTJE ─────────────────────────────────────────────────── */
{
  const gevonden = [];
  for (const f of bestanden) {
    const src = zonderCommentaar(readFileSync(join(ROOT, f), 'utf8'));
    /* LETTERS AAN WEERSZIJDEN, en niet "geen spatie". Eerste versie zocht
       `\S—\S` en vond daarmee `onRequest: '—'` — een kastlijntje dat in zijn
       eentje "geen waarde" betekent, met de aanhalingstekens ernaast als
       niet-spatie. Dat is geen gedachtestreepje tussen woorden en hoort er
       gewoon te staan. */
    for (const m of src.matchAll(/[\p{L}\d]—[\p{L}\d]/gu)) {
      /* Een kastlijntje tussen cijfers is een BEREIK ("2–4") en geen
         gedachtestreepje. Dat hoort juist zonder spaties. */
      if (/\d/.test(m[0])) continue;
      gevonden.push(`${f}: …${src.slice(Math.max(0, m.index - 32), m.index + 32).replace(/\s+/g, ' ')}…`);
    }
  }
  check('elk kastlijntje in zichtbare tekst heeft spaties', gevonden);
}

/* ── 2 · DE APOSTROF ─────────────────────────────────────────────────────── */
{
  /* Alleen binnen een string, want daar is het tekst. Een rechte apostrof
     BUITEN een string is een stringgrens en hoort daar te staan.

     Gezocht wordt naar `letter'letter` binnen dubbele quotes, backticks of een
     JSX-tekstknoop. Binnen enkele quotes kán het niet voorkomen — daar zou het
     de string beëindigen en de bouw stukmaken, wat precies de reden is dat dit
     bestand bestaat. */
  const gevonden = [];
  for (const f of bestanden) {
    /* ── EN NIET IN EEN INTERPOLATIE ────────────────────────────────────
       Binnen `${…}` staat CODE en geen tekst, en die code zit vol enkele
       quotes: `${turnaround('unattended')}` levert `n'u` op en dat las deze
       wacht als een apostrof in een woord. Blanco maken en niet weghalen, zodat
       elke positie in het bestand blijft kloppen. */
    const src = zonderCommentaar(readFileSync(join(ROOT, f), 'utf8'))
      .replace(/\$\{[^}]*\}/g, (m) => ' '.repeat(m.length));
    /* NIET OVER REGELS HEEN. De backtick-tak zocht eerst `[^`]*?`, en een
       template-literal in dit project loopt makkelijk over dertig regels: hij
       slokte dan hele blokken code op en vond daar een apostrof in een stuk
       Engels commentaar. Een tekstregel past op één regel. */
    const regels = src.split('\n');
    for (const m of src.matchAll(/"[^"\n]*?\p{L}'\p{L}[^"\n]*?"|`[^`\n]*?\p{L}'\p{L}[^`\n]*?`/gu)) {
      /* ── DE WHATSAPP-BERICHTEN ZIJN DE UITZONDERING ─────────────────────
         `waHref('Hi VISUAILS, I'd like to order…')` is geen tekst op de site.
         Hij wordt url-gecodeerd en verschijnt in het invoerveld van WhatsApp,
         in een andere app, op het toetsenbord van de klant. Daar is de rechte
         apostrof de gewone en de typografische de vreemde.

         Deze regel gaat over wat een bezoeker op DEZE site leest. */
      const regel = regels[src.slice(0, m.index).split('\n').length - 1] || '';
      if (f.replace(/\\/g, '/') === WA_BESTAND) continue;
      if (/waHref|wa\.me|waText|whatsapp/i.test(regel)) continue;
      gevonden.push(`${f}: …${m[0].slice(0, 70)}…`);
    }
  }
  check('geen rechte apostrof binnen een tekststring', gevonden);
}

/* ── 3 · EN DE TOETS VINDT DE FOUT ALS HIJ ER ECHT STAAT ─────────────────────
   Zonder deze helft bewijst groen hierboven niets: een filter die te veel
   wegstreept, meldt ook nooit iets. Beide fouten worden hier in hun echte vorm
   opgevoerd en moeten gevonden worden. */
{
  const nep = `const a = "een zin—zonder spaties"; const b = \`het is foto's van jou\`;`;
  const g1 = [...zonderCommentaar(nep).matchAll(/[\p{L}\d]—[\p{L}\d]/gu)].filter((m) => !/\d/.test(m[0]));
  const g2 = [...zonderCommentaar(nep).matchAll(/"[^"\n]*?\p{L}'\p{L}[^"\n]*?"|`[^`\n]*?\p{L}'\p{L}[^`\n]*?`/gu)];
  check('de kastlijntjeswacht vindt een echte fout', g1.length, 1);
  check('de apostrofwacht vindt een echte fout', g2.length, 1);
  /* En een bereik met cijfers wordt met rust gelaten. */
  const bereik = [...'"2–4 werkdagen" en "24—48"'.matchAll(/[\p{L}\d]—[\p{L}\d]/gu)].filter((m) => !/\d/.test(m[0]));
  /* En een losse '—' als leegteken hoort met rust gelaten te worden. */
  const leeg = [...`const x = { onRequest: '—' };`.matchAll(/[\p{L}\d]—[\p{L}\d]/gu)];
  check('een losse — als leegteken is geen fout', leeg.length, 0);
  check('een bereik tussen cijfers is geen fout', bereik.length, 0);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
