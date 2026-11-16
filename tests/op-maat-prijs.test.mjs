/**
 * DE SCHATTING OP MAAT — 15 november 2026, lijst 109 en 110.
 *
 *   npm run test:opmaatprijs
 *
 * Rekent de voorbeelden uit de lijsten na met src/data/opMaatPrijs.js, controleert dat elk bedrag op € 5 staat
 * (lijst 111) en dat docs/HOE-VISUAILS-WERKT.md dezelfde bedragen noemt als de code.
 */
import { readFileSync } from 'node:fs';
import { schatting, EDITS, VIDEO_PER_SECONDE, CAMERA_PRIJS, AANBETALING_DEEL } from '../src/data/opMaatPrijs.js';
import { normaliseerInhoud } from '../src/lib/opMaat.js';
import { AMOUNT, LADDER, EXTRA_PHOTO_LADDER } from '../src/data/pricing.js';

let goed = 0, fout = 0;
function ok(naam, kreeg, wil) {
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) goed++; else fout++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${naam}${g ? '' : `\n        verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const s = (d, inh, o) => schatting(d, normaliseerInhoud(d, inh), o);

console.log('\nde bedragen zelf');
{
  const alle = Object.values(EDITS).flatMap((e) => Object.values(e).flatMap((x) => Object.values(x).filter((v) => typeof v === 'number')));
  ok('elk bedrag op maat staat op € 5 (lijst 111)', alle.filter((v) => v % 5), []);
  ok('en de ronde prijzen in pricing.js ook', [...LADDER.catalog, ...LADDER.lifestyle, ...EXTRA_PHOTO_LADDER].map((r) => r[2]).concat([AMOUNT.video, AMOUNT.hooks, AMOUNT.hooksVariant, AMOUNT.editions, AMOUNT.editionsSetup]).filter((v) => v % 5), []);
  ok('video € 20 per seconde, camera 0 / 15 / 40 per shot, de helft vooraf', [VIDEO_PER_SECONDE, CAMERA_PRIJS, AANBETALING_DEEL], [20, { inbegrepen: 0, gemiddeld: 15, lastig: 40 }, 0.5]);
}

console.log('\ncatalog, de schaal uit lijst 109 (met de ronde staffel)');
{
  const licht = s('catalog', { soorten: [{ soort: 'hoodie', aantal: 3 }], standen: { top: { hoek: 'driekwart' } } });
  ok('licht: witte grond, een andere stand voor de groep, 3 producten = 3 × 90 + 70 + 3 × 10', licht.totaal, 270 + 70 + 30);
  const room84 = s('catalog', {
    soorten: [{ soort: 'tas', aantal: 1, voorkant: { yaw: -35, pitch: 0 } }, { soort: 'tshirt', aantal: 1 }, { soort: 'schoen', aantal: 1, voorkant: { yaw: -40, pitch: 10 } }],
    standen: { top: { hoek: 'driekwart' } },
    licht: { eigen: true }, camera: 'laag', omgeving: { soort: 'echte-plek' }, vasteMaten: true, grading: { eigen: true }, model: { pose: 'niemand kijkt in de camera' },
  });
  /* Een stand per productsoort (drie soorten), en de rest één keer: 3 × 70 + 45 + 20 + 450 + 30 + 115 = 870; per product
     10 + 10 + 40 + 25 + 5 + 25 = 115, × 3 = 345; basis 270. */
  ok('Room 84, drie producten van drie soorten', room84.totaal, 270 + 870 + 345);
  ok('  met een regel per keuze, de basis voorop', room84.regels.map((r) => r.id), ['basis', 'c-pose', 'c-licht', 'c-camera', 'c-wereld', 'c-maat', 'c-grading', 'c-modelpose']);
  /* Lijst 113, stand3d b: "Alleen de standaard pose is kosteloos." Daarna € 70 per stand, één keer, en € 10 per product in die stand. */
  const pose = (inh) => (s('catalog', inh).regels.find((r) => r.id === 'c-pose') || { bedrag: 0 }).bedrag;
  ok('de standaard kost niets', pose({ soorten: [{ soort: 'tshirt', aantal: 2 }, { soort: 'schoen' }] }), 0);
  ok('"Wij kiezen" ook niet', pose({ soorten: [{ soort: 'tshirt', aantal: 2 }], standen: { top: { hoek: 'wij' } } }), 0);
  ok('een eigen stand die gelijk is aan de standaard ook niet', pose({ soorten: [{ soort: 'jas', voorkant: { yaw: 360, pitch: 1 } }] }), 0);
  ok('één andere stand voor de hele groep telt één keer: 70 + 3 producten × 10', pose({ soorten: [{ soort: 'tshirt' }, { soort: 'hoodie' }, { soort: 'jas' }], standen: { top: { hoek: 'zijkant' } } }), 70 + 30);
  ok('een product dat anders staat dan de groep: een tweede stand', pose({ soorten: [{ soort: 'tshirt' }, { soort: 'hoodie', voorkant: { yaw: 90, pitch: 0 } }], standen: { top: { hoek: 'zijkant' } } }), 140 + 20);
  ok('twee producten in dezelfde eigen stand: één stand', pose({ soorten: [{ soort: 'tshirt', voorkant: { yaw: 90, pitch: 0 } }, { soort: 'hoodie', voorkant: { yaw: 90, pitch: 0 } }] }), 70 + 20);
  ok('in elke groep apart: top en shoes elk een stand', pose({ soorten: [{ soort: 'tshirt' }, { soort: 'schoen', aantal: 2 }], standen: { top: { hoek: 'driekwart' }, shoes: { hoek: 'voorkant' } } }), 140 + 30);
  ok('flat lay: recht van boven is de standaard en kost niets', pose({ soorten: [{ soort: 'tshirt' }], standLook: 'flatlay' }), 0);
  ok('flat lay: diagonaal is een stand', pose({ soorten: [{ soort: 'tshirt' }], standLook: 'flatlay', standen: { top: { hoek: 'diagonaal' } } }), 80);
  ok('met de uitleg erbij', s('catalog', { soorten: [{ soort: 'tshirt' }, { soort: 'hoodie' }], standen: { top: { hoek: 'zijkant' } } }).regels.find((r) => r.id === 'c-pose').uitleg, '€70 eenmalig + €10 × 2');
  const tien = s('catalog', { soorten: [{ soort: 'jas', aantal: 10, voorkant: { legwijze: 'hanger' } }] });
  ok('de staffel geldt voor de basis: 10 producten × € 50', tien.regels[0].bedrag, 500);
  const extra = s('catalog', { soorten: [{ soort: 'jas', aantal: 2, voorkant: { legwijze: 'hanger' } }], extraFotos: 2 });
  ok('twee extra foto’s per product: 2 × € 25 × 2 producten', extra.regels.find((r) => r.id === 'c-extra').bedrag, 100);
  const mm = s('catalog', { soorten: [{ soort: 'jas', voorkant: { legwijze: 'hanger' } }], model: { merkmodel: 'nieuw' } });
  ok('een nieuw merkmodel kost € 450, één keer', mm.regels.find((r) => r.id === 'merkmodel').bedrag, 450);
  ok('  en niets als hij er al een heeft', s('catalog', { soorten: [{ soort: 'jas', voorkant: { legwijze: 'hanger' } }], model: { merkmodel: 'nieuw' } }, { merkmodelBetaald: true }).regels.some((r) => r.id === 'merkmodel'), false);
}

console.log('\nlifestyle');
{
  const l = s('lifestyle', { aantal: 3, moment: { zin: 'een bruiloft' }, mensen: { aantal: 2 }, licht: 'nacht', formaten: ['4:5'] });
  ok('3 producten, moment, tweede persoon, nachtlicht = 3 × 110 + 135 + 3 × 40 + 45', l.totaal, 330 + 135 + 120 + 45);
  ok('het formaat hoort niet bij de stijl (lijst 112): geen regel en geen veld', [s('lifestyle', { aantal: 2, formaten: ['4:5', '9:16'] }).regels.some((r) => r.id === 'l-formaat'), 'formaten' in normaliseerInhoud('lifestyle', { formaten: ['4:5'] })], [false, false]);
  ok('hoogstens twee personen', s('lifestyle', { aantal: 1, mensen: { aantal: 5 } }).regels.find((r) => r.id === 'l-mensen').bedrag, 40);
}

console.log('\nhooks (lijst 110)');
{
  ok('de eerste hook, eigen idee, met tekst: 150 + 120 + 25', s('hooks', { idee: 'eigen', tekstOpBeeld: { tekst: 'Nu binnen' } }).totaal, 295);
  ok('dezelfde stijl, een ander product, met tekst: 120 + 25', s('hooks', { idee: 'eigen', tekstOpBeeld: { tekst: 'Nu binnen' } }, { bestaandeStijl: true }).totaal, 145);
  ok('de eerste hook, ons idee, een persoon en een effect: 300 + 120 + 40 + 40', s('hooks', { idee: 'ons', personen: 1, effecten: 1 }).totaal, 500);
  ok('de aanbetaling is de helft', s('hooks', { idee: 'ons', personen: 1, effecten: 1 }).aanbetaling, 250);
}

console.log('\nvideo (lijst 110)');
{
  ok('8 seconden, eigen idee, één stilstaand shot, effen grond: 160 + 45', s('video', { idee: 'eigen', seconden: 8, shots: [{ soort: 'materiaal', beweging: 'stil' }] }).totaal, 205);
  const v = s('video', {
    idee: 'ons', seconden: 12, omgeving: { soort: 'materiaal' }, eindbeeld: true,
    shots: [{ soort: 'materiaal', beweging: 'orbit' }, { soort: 'materiaal', beweging: 'push-in' }, { soort: 'logo', beweging: 'crane' }],
  });
  /* 240 + 150 + 2 × 50 + (15 + 40) + (45 + 3 × 10) + 15 = 635: het voorbeeld uit lijst 110. */
  ok('12 seconden, ons idee, drie shots (orbit, push-in, crane), materiaal, logo', v.totaal, 635);
  ok('minder dan 8 seconden rekent als 8', s('video', { idee: 'eigen', seconden: 3 }).regels[0].bedrag, 160);
  ok('opnieuw met een ander product: zonder idee-kosten (lijst 110, videoherhaal = a)', s('video', { idee: 'ons', seconden: 8 }, { bestaandIdee: true }).totaal, 160);
}

console.log('\nhet naslagbestand noemt dezelfde bedragen');
{
  const doc = readFileSync(new URL('../docs/HOE-VISUAILS-WERKT.md', import.meta.url), 'utf8');
  const mist = [];
  for (const [dienst, e] of Object.entries(EDITS)) {
    for (const [id, d] of Object.entries(e)) {
      const regel = doc.split('\n').find((r) => r.includes(`\`${id}\``));
      if (!regel) { mist.push(`${id}: geen regel`); continue; }
      for (const v of Object.values(d).filter((x) => typeof x === 'number' && x > 0)) if (!regel.includes(`€ ${v}`)) mist.push(`${id}: € ${v}`);
    }
  }
  ok('elke edit staat in docs/HOE-VISUAILS-WERKT.md met zijn bedragen', mist, []);
  const basis = [`€ ${LADDER.catalog.map((r) => r[2]).join(' / ')}`, `€ ${LADDER.lifestyle.map((r) => r[2]).join(' / ')}`, `€ ${AMOUNT.hooks}`, `€ ${AMOUNT.video}`, `€ ${VIDEO_PER_SECONDE} per seconde`, `€ ${AMOUNT.brandModel}`];
  ok('en de basisbedragen uit pricing.js', basis.filter((b) => !doc.includes(b)), []);
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
