/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE CREDITHERINNERING: OP TIJD, ÉÉN KEER, EN MET EEN BRUIKBARE TIP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 19 september 2026, over het vangnet onder het zelf inplannen: *"Ik denk
 * dat mails van dat de klant nog slots/credits over heeft en we tips daarin geven
 * hoe ze deze het beste uit kan besteden zodat ze ze niet verspilt."*
 *
 * Twee dingen kunnen hier stil misgaan en ze zijn allebei duur:
 *
 *   1 · DE MAIL KOMT ELKE NACHT. Dan klikt de klant hem weg en leest hij ook de
 *       laatste niet. De taak mag dus alleen op de twee afgesproken dagen vóór
 *       de vervaldatum iets doen, en op alle andere dagen niets.
 *   2 · DE TIP LAAT CREDITS VERDAMPEN. "Eén lifestylecarrousel" voor negen
 *       credits is waar en verspilt er vier. De volgorde hoort dus op de minste
 *       rest te staan en niet op de duurste dienst — anders geeft een mail die
 *       over verspilling gaat, zelf het verkwistende advies.
 */
import { SERVICE_CREDITS } from '../src/data/pricing.js';
import { kindLabel } from '../src/lib/slots.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const g = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (g) goed += 1;
  console.log(` ${g ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${g ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

/* De twee functies uit cron/index.js. Ze staan daar niet als export — het is een
   Worker met één ingang — dus worden ze hier uit de bron gelezen en uitgevoerd.
   Dat is minder mooi dan een import en het is wél de echte code: een kopie in
   deze toets zou precies de afwijking verbergen die hij moet vinden. */
import { readFileSync } from 'node:fs';
const bron = readFileSync(new URL('../cron/index.js', import.meta.url), 'utf8');

const knip = (naam) => {
  const start = bron.indexOf(`function ${naam}(`);
  if (start < 0) throw new Error(`cron/index.js kent geen ${naam}()`);
  let diep = 0; let i = bron.indexOf('{', start);
  const van = i;
  for (; i < bron.length; i += 1) {
    if (bron[i] === '{') diep += 1;
    else if (bron[i] === '}') { diep -= 1; if (!diep) break; }
  }
  return bron.slice(start, i + 1);
};

const maak = new Function('SERVICE_CREDITS', 'kindLabel',
  `${knip('creditTips')}\n${knip('dagenTot')}\nreturn { creditTips, dagenTot };`);
const { creditTips, dagenTot } = maak(SERVICE_CREDITS, kindLabel);

console.log('de dagen tellen klopt');
{
  ok('zeven dagen vooruit', dagenTot('2026-09-20', '2026-09-27'), 7);
  ok('over een maandgrens heen', dagenTot('2026-09-28', '2026-10-02'), 4);
  ok('over een jaargrens heen', dagenTot('2026-12-30', '2027-01-02'), 3);
  ok('dezelfde dag is nul', dagenTot('2026-09-20', '2026-09-20'), 0);
  ok('en onzin is geen getal', Number.isNaN(dagenTot('x', '2026-09-20')), true);
}

console.log('\nde tip verspilt zo min mogelijk');
{
  /* Negen credits: twee catalogsets (8, rest 1) hoort vóór één carrousel
     (5, rest 4) te staan. Dat is de hele reden dat deze toets bestaat. */
  const negen = creditTips(9, 'nl');
  ok('bij negen credits staat de zuinigste optie vooraan',
    negen[0].includes('catalogset'), true);
  ok('en het aantal klopt', negen[0].startsWith('2 ×'), true);

  /* Precies genoeg voor één catalogset: één regel, geen rest. */
  ok('vier credits geeft precies één catalogset', creditTips(4, 'nl'), [`1 × ${kindLabel('catalog', 'nl').toLowerCase()}`]);

  /* Te weinig voor wat dan ook: geen tips, en de taak mailt dan ook niet. */
  ok('minder dan de goedkoopste dienst geeft geen enkele tip', creditTips(3, 'nl'), []);
  ok('nul ook niet', creditTips(0, 'nl'), []);

  /* Hooguit drie regels: een mail met zes opties is een mail die je niet leest. */
  ok('nooit meer dan drie opties', creditTips(240, 'nl').length <= 3, true);

  /* Elke regel noemt een dienst die bestaat, en nooit de complete bundel. */
  const alles = creditTips(240, 'nl').join(' ');
  ok('en geen enkele noemt de complete bundel', /complete bundel/i.test(alles), false);
}

console.log('\nde taak staat in de nachtelijke lijst');
{
  ok('herinnerCredits() draait mee', /checkPlanQueues, herinnerCredits,/.test(bron), true);
  ok('op zeven en twee dagen vóór de vervaldatum',
    /CREDIT_WAARSCHUWING_DAGEN = \[7, 2\]/.test(bron), true);
  ok('en hij leest de vervaldatum die het dashboard ook toont',
    /loadSlots\(env, abo\.id, venster, nu\)/.test(bron), true);
  ok('alleen bij een lopend abonnement', /WHERE s\.status = 'active'/.test(bron), true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
