/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET TIPPANEEL NAAST STAP 2
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 16 september 2026: *"rechts tips die de klant elke 10 seconden kort
 * vertellen wat waarvoor is en waarom het handig is."*
 *
 * En op 17 september, toen de look van de conceptpagina naar het echte formulier
 * ging: *"het tip menu zie ik namelijk ook niet verschijnen die we hadden
 * gemaakt."* Het was gebouwd in /concept/bestelrij en nooit overgezet.
 *
 * ── WAT DIT BESTAND BEWAAKT ────────────────────────────────────────────────
 *
 * Precies de drie manieren waarop dit paneel opnieuw stil kan verdwijnen:
 *
 *   1  DE TEKST LOOPT UIT ELKAAR. De conceptpagina en het formulier tonen
 *      dezelfde reeks. Zodra één van de twee zijn eigen kopie krijgt, belooft
 *      het prototype iets anders dan het formulier — en dat merk je pas als een
 *      klant iets anders leest dan jij verwacht.
 *
 *   2  EEN TAAL BLIJFT ACHTER. Het formulier is tweetalig en de conceptpagina
 *      niet. Een tip die alleen in het Nederlands bestaat, wordt op de Engelse
 *      pagina een lege regel — geen foutmelding, geen test, gewoon wit.
 *
 *   3  HET PANEEL ONTSTAAT IN JAVASCRIPT. Astro scopet zijn CSS met een
 *      attribuut dat een element dat in pipeline.js gemaakt wordt niet draagt.
 *      Dat is in dit project al vier keer misgegaan. Het paneel hoort dus in de
 *      markup te staan en het script hoort alleen teksten om te wisselen.
 *
 * ── EN WAT HET NIET BEWAAKT ────────────────────────────────────────────────
 *
 * Of de tips echt doordraaien, of ze stil gaan staan op het vak waar je met je
 * muis staat, en of het paneel op een telefoon dichtgeklapt begint. Dat is in
 * een echte browser gemeten met kladblok/tips-shot.mjs — 17 september 2026, op
 * dist/, op 1280 en 430 pixels:
 *
 *     bij het openen   tip 1, streepje 1 van 5, ba2-na-front + ba2-voor-front
 *     na 10 seconden   tip 2, beelden mee omgewisseld
 *     muis op een vak  de belofte van DAT vak, streepjes uit
 *     en 11s later     nog steeds datzelfde vak — hij draait niet weg onder je
 *                      ogen terwijl je leest
 *     muis eraf        de reeks loopt weer
 *     op 430px         dichtgeklapt bij het openen
 *
 * Een broncontrole bewijst dat een regel BESTAAT, niet dat hij DRAAIT. Die les
 * staat in tests/plan-zonder-account.test.mjs en geldt hier net zo goed.
 */
import { readFileSync } from 'node:fs';
import { TIPS, TIP_VOOR, TIP_NA, BELOFTE, TIP_COPY, TIP_INTERVAL_MS, tipsVoor, belofteVoor } from '../src/data/uploadTips.js';
import { SHOT_IDS, SHOTS } from '../src/data/shots.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

console.log('de tips staan op één plek en zijn compleet');
{
  ok('er zijn tips', TIPS.length > 0, true, TIPS.length);
  ok('en het interval is de tien seconden die gevraagd is', TIP_INTERVAL_MS, 10000);

  /* ELKE TIP HOORT BIJ EEN BESTAAND VAK. Een tip over een vak dat niet meer
     bestaat toont een leeg laptopscherm en een label zonder naam — en dat
     gebeurt vanzelf zodra shots.js ooit een hoek hernoemt. */
  TIPS.forEach((t, i) => {
    ok(`  tip ${i + 1} wijst naar een bestaand vak (${t.vak})`, SHOT_IDS.includes(t.vak), true);
    ok(`  en heeft beeldmateriaal`, !!(TIP_VOOR[t.vak] && TIP_NA[t.vak]), true);
  });

  /* BEIDE TALEN, ELKE TIP. Zonder deze lus wordt een vergeten vertaling een
     lege regel op de Engelse pagina in plaats van een fout hier. */
  ['nl', 'en'].forEach((taal) => {
    TIPS.forEach((t, i) => {
      const w = t[taal] || {};
      ok(`  tip ${i + 1} heeft ${taal}: kop`, typeof w.kop === 'string' && w.kop.length > 3, true);
      ok(`  tip ${i + 1} heeft ${taal}: tekst`, typeof w.tekst === 'string' && w.tekst.length > 20, true);
    });
  });

  /* Kort houden is de hele opgave — zie de kop van uploadTips.js. Dit staat
     naast een taak en niet in plaats ervan. */
  ['nl', 'en'].forEach((taal) => {
    const langste = Math.max(...TIPS.map((t) => t[taal].tekst.length));
    ok(`  geen enkele ${taal}-tip is een alinea`, langste <= 200, true, langste);
  });
}

console.log('\nen elk vak heeft een belofte, in beide talen');
{
  /* De belofte verschijnt als je een vakje aanraakt. Een vak zonder belofte
     laat het paneel gewoon staan waar het stond — geen fout, maar wel een vak
     dat niets uitlegt op het moment dat iemand ernaar kijkt. */
  SHOTS.forEach((sh) => {
    ok(`  ${sh.id} heeft een Nederlandse belofte`, belofteVoor(sh.id, 'nl').length > 20, true);
    ok(`  en een Engelse`, belofteVoor(sh.id, 'en').length > 20, true);
  });
  ok('een onbekend vak geeft geen brokken', belofteVoor('bestaatniet', 'nl'), '');
  ok('en BELOFTE dekt precies de vaste hoeken',
    Object.keys(BELOFTE).sort().join(','), [...SHOT_IDS].sort().join(','));
}

console.log('\ntipsVoor() levert wat het scherm nodig heeft');
{
  ['nl', 'en'].forEach((taal) => {
    const rij = tipsVoor(taal);
    ok(`  ${taal}: evenveel tips`, rij.length, TIPS.length);
    ok(`  ${taal}: elk item draagt zijn beeldpaar`,
      rij.every((t) => t.voor.startsWith('/img/') && t.na.startsWith('/img/')), true);
    ok(`  ${taal}: en zijn woorden`, rij.every((t) => t.kop && t.tekst), true);
  });
  /* Een onbekende taal valt terug op Engels en niet op leeg: een pagina in een
     taal die we nog niet hebben, hoort tekst te tonen. */
  ok('een onbekende taal valt terug op Engels', tipsVoor('de')[0].kop, TIPS[0].en.kop);

  ['nl', 'en'].forEach((taal) => {
    const c = TIP_COPY[taal];
    ok(`  ${taal}: de omliggende woorden staan er`,
      !!(c && c.kop && c.noot && c.merk), true);
  });
}

/* ── HET PANEEL IS UIT STAP 2 — 11 oktober 2026 (F3) ─────────────────────────
   Lucas vond stap 2 "moeizaam en chaotisch". Eén van de oorzaken: hulp die met
   elkaar concurreerde — dit wisselende tippaneel, de uitklapgids en de uitleg
   per vak. Hij koos (afvinklijst 2, form = a): het tipspaneel gaat weg, en een
   voorbeeldfoto van ±64 px plus één regel per vak doet zijn werk (shots.js
   `regel`, `voorbeeld`, `zonder`).

   Wat hieronder stond, bewaakte dat het paneel in de markup stond, draaide,
   stilstond op het vak waar je was en zichzelf niet aankondigde. Dat is nu
   omgekeerd: deze regels bewaken dat het niet stilletjes terugkomt in het
   formulier. De reeks zelf (src/data/uploadTips.js) blijft bestaan en wordt
   hierboven nog steeds nagekeken — hij kan op een andere plek terugkomen. */
console.log('\nhet paneel staat niet meer in stap 2 (F3)');
{
  const uploader = read('src/components/order/ProductUploader.astro');
  const pl = read('src/scripts/pipeline.js');
  ok('het formulier importeert de tips niet meer', /from '\.\.\/\.\.\/data\/uploadTips\.js'/.test(uploader), false);
  ok('  en de laptopplaat ook niet', /from '\.\.\/\.\.\/data\/laptopVlak\.js'/.test(uploader), false);
  ok('er staat geen tippaneel in de markup', /class="pu-tips/.test(uploader), false);
  ok('en pipeline.js bindt er niets meer aan', /function bindTips\(|bindTips\(\);|data-pu-tips/.test(pl), false);
  ok('en het formulier importeert niets uit een conceptpagina', /from '[^']*concept\//.test(uploader), false);
  /* Wat zijn werk doet: één regel per vak uit shots.js, op de eerste kaart. */
  ok('de regel per vak komt uit shots.js (vakRegel)',
    /regel: Object\.fromEntries\(SHOTS\.map\(\(x\) => \[x\.id, vakRegel\(x\.id, l\)\]\)\)/.test(read('src/components/order/OrderFlow.astro')), true);
  ok('  en het vak toont hem', /lookup\(`pu\.regel\.\$\{id\}`\)/.test(pl), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
