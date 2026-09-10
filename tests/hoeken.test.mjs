/*
 * VISUAILS — DE HOEKEN, ÉÉN KEER GEKOZEN VOOR DE HELE BESTELLING
 * 9 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Wellicht is het handig om de klant vooraf te laten kiezen (…) dat hij
 * eerst een scherm heeft waar hij kan kiezen hoeveel product angles er moeten
 * komen (…) Een extra foto word dan 39 euro en loopt af naar mate de hoeveelheid
 * producten die hij kiest. Dus bij 10 producten word het 29 per extra foto en bij
 * 20 producten 19. Maximaal 4 extra foto's per product. Wanneer hij in het eerste
 * scherm de angles heeft gekozen krijgt elk product die angles, dus dit is niet
 * per product aan te passen."*
 *
 * ── WAT DIT BEWAAKT, EN WAAROM JUIST DAT ───────────────────────────────────
 *
 * Er zijn drie dingen die stil kunnen breken en die je met het oog niet ziet:
 *
 *   1. DE VERMENIGVULDIGING. Een hoek geldt voor élk product, dus vier hoeken op
 *      twaalf producten zijn achtenveertig foto's en niet vier. Dat getal wordt
 *      op twee plekken gemaakt — in de browser als voorbeeld, op de server als
 *      factuur — en dat is precies de vorm waarin een prijsfout ontstaat die
 *      niemand ziet: de klant leest het ene bedrag en betaalt het andere.
 *   2. DE TREDEN. 39 / 34 / 29 / 19, met dezelfde grenzen als LADDER.catalog.
 *      Lucas gaf drie van de vier op; de tweede volgt uit de eis dat de ladder
 *      strikt daalt.
 *   3. DE BOVENGRENS. Vier per product, en die moet BIJTEN op een gesleuteld
 *      formulier: negen aangevinkte hoeken mogen nooit negen keer betaald worden.
 *
 * Dat het SCHERM er staat, toetst request-flow; dit bestand gaat over de som.
 */
import { quoteOrder } from '../src/lib/quote.js';
import {
  EXTRA_PHOTO_LADDER, MAX_EXTRA_PER_PRODUCT, extraPhotoRate, ladderRate, LADDER,
} from '../src/data/pricing.js';
import { ANGLES, ANGLE_IDS, ANGLE_GROUPS, ANGLE_COPY, angleById } from '../src/data/angles.js';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const gelijk = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : ' FAIL'} ${naam}${gelijk ? '' : `   verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const net = (o) => { const r = quoteOrder(o); return r ? r.netCents / 100 : null; };

console.log('\nde acht hoeken zijn een lijst en geen vrije tekst');
{
  ok('er zijn er acht', ANGLES.length, 8);
  ok('en de ids zijn uniek', new Set(ANGLE_IDS).size, 8);
  ok('twee groepen', ANGLE_GROUPS, ['model', 'ground']);
  for (const g of ANGLE_GROUPS) {
    ok(`groep ${g} heeft er vier`, ANGLES.filter((a) => a.group === g).length, 4);
  }
  /* Elke hoek draagt zijn eigen foto, want dat is de hele reden dat deze kiezer
     bestaat: je ziet wat je koopt in plaats van het te moeten omschrijven. */
  ok('elke hoek heeft een eigen beeld', new Set(ANGLES.map((a) => a.shot)).size, 8);
  ok('en dat beeld heet naar zijn hoek',
    ANGLES.every((a) => a.shot === `/img/hoek-${a.id}.webp`), true);
  ok('elke hoek heeft een naam en een regel in beide talen',
    ANGLES.every((a) => a.name.en && a.name.nl && a.line.en && a.line.nl), true);
  /* Een onbekende id is een gesleuteld formulier en hoort niets op te leveren. */
  ok('angleById kent zijn eigen lijst', angleById('flat-lay').group, 'ground');
  ok('en geeft niets terug voor iets verzonnens', angleById('van-onderen'), null);
  ok('en niets voor leeg', angleById(''), null);
}

console.log('\nde copy is compleet in beide talen');
{
  for (const l of ['en', 'nl']) {
    const c = ANGLE_COPY[l];
    const sleutels = ['groups', 'fixedH', 'fixedLine', 'extraH', 'extraLine', 'note', 'notePh',
      'per', 'full', 'total', 'totalOne', 'totalOneP', 'totalOneBoth'];
    ok(`${l}: alle sleutels staan er`, sleutels.filter((k) => !c[k]), []);
    ok(`${l}: elke groep heeft een naam`, ANGLE_GROUPS.filter((g) => !c.groups[g]), []);
    /* De sjablonen worden door pipeline.js gevuld. Een gat erin is een regel met
       een accolade erin op het scherm van een klant. */
    ok(`${l}: de som noemt aantal, producten, tarief en bedrag`,
      ['{n}', '{p}', '{price}', '{sum}'].filter((t) => !c.total.includes(t)), []);
    ok(`${l}: het tarief noemt een prijs`, c.per.includes('{price}'), true);
    ok(`${l}: het maximum noemt een getal`, c.full.includes('{max}'), true);
  }
}

console.log('\nde ladder is de ladder die Lucas opgaf');
{
  ok('bij 1 product', extraPhotoRate(1), 39);
  ok('bij 4', extraPhotoRate(4), 39);
  ok('bij 10', extraPhotoRate(10), 29);
  ok('bij 20', extraPhotoRate(20), 19);
  ok('en boven de twintig blijft hij daar', extraPhotoRate(200), 19);
  /* Dezelfde treden als de catalogladder: de korting op een extra foto hoort te
     schuiven op hetzelfde moment als de korting op de set zelf. */
  ok('evenveel treden als de catalogladder', EXTRA_PHOTO_LADDER.length, LADDER.catalog.length);
  ok('met dezelfde grenzen',
    EXTRA_PHOTO_LADDER.map(([lo, hi]) => [lo, hi]), LADDER.catalog.map((r) => [r[0], r[1]]));
  /* Een extra foto is losse handeling en hoort dus altijd duurder te zijn dan een
     foto uit de set — anders is de set kopen duurder dan hem bij te bestellen. */
  ok('en altijd duurder dan een setfoto',
    EXTRA_PHOTO_LADDER.every(([lo, , tarief]) => tarief > ladderRate('catalog', lo) / 4), true);
}

console.log('\néén hoek is één foto per product, en dat is de hele rekensom');
{
  const basis = (n) => ladderRate('catalog', n) * n;
  ok('twee hoeken op één product', net({ service: 'catalog', products: 1, extras: 2 * 1 }),
    basis(1) + 2 * extraPhotoRate(1));
  ok('twee hoeken op tien producten', net({ service: 'catalog', products: 10, extras: 2 * 10 }),
    basis(10) + 20 * extraPhotoRate(10));
  /* Het getal uit Lucas' eigen voorbeeld: twintig producten, vier hoeken. */
  ok('vier hoeken op twintig producten kost 20 × 4 × €19',
    net({ service: 'catalog', products: 20, extras: 4 * 20 }), basis(20) + 1520);
  ok('geen hoeken kost niets erbij', net({ service: 'catalog', products: 10, extras: 0 }), basis(10));
}

console.log('\nvier per product is een grens en geen wens');
{
  ok('het maximum is vier', MAX_EXTRA_PER_PRODUCT, 4);
  const basis = ladderRate('catalog', 5) * 5;
  /* Acht aangevinkte hoeken op vijf producten zou 40 foto's zijn; de kiezer laat
     er vier aanvinken en de server klemt op vier per product. Beide kanten. */
  ok('acht hoeken op vijf producten wordt geklemd op vier',
    net({ service: 'catalog', products: 5, extras: 8 * 5 }), basis + 5 * 4 * extraPhotoRate(5));
  ok('en een absurd getal ook',
    net({ service: 'catalog', products: 5, extras: 9999 }), basis + 5 * 4 * extraPhotoRate(5));
  ok('negatief telt als nul', net({ service: 'catalog', products: 5, extras: -3 }), basis);
}

console.log('\nde hoeken gelden waar een catalogset is, en nergens anders');
{
  /* Op `complete` zit een catalogset, dus daar kan er een hoek bij. Het tarief is
     dat van de extra-ladder en niet dat van de dienst — een extra foto is een
     extra foto, ongeacht wat er verder in de bestelling zit. */
  ok('complete rekent met dezelfde extra-ladder',
    net({ service: 'complete', products: 10, extras: 2 * 10 }),
    ladderRate('complete', 10) * 10 + 20 * extraPhotoRate(10));
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
