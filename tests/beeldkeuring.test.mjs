/* VISUAILS — de beeldkeuring op aangeleverde foto's.  npm run test:keuring
 *
 * ── WAT HIER GETOETST WORDT ──────────────────────────────────────────────────
 *
 * keurBeeld() uit src/data/shots.js: de functie die van drie gemeten getallen —
 * breedte, hoogte, gemiddelde helderheid — plus de extensie en de bestands-
 * grootte beslist of er iets te melden valt.
 *
 * Het MÉTEN gebeurt in de browser (meetBeeld() in pipeline.js) en staat hier
 * bewust niet in: dat vraagt een echte decoder en een echt canvas, en de fout
 * die je daar kunt maken is een andere fout dan de fout die je in de drempels
 * maakt. Dit bestand gaat over de drempels.
 *
 * ── DE REGEL DIE NIET MAG SNEUVELEN ──────────────────────────────────────────
 *
 * Eén weigering en twee meldingen. `hard: true` betekent dat de foto niet
 * doorgaat, en dat mag alleen bij te klein — dat is objectief. Te donker en te
 * ver gecomprimeerd zijn vermoedens, en een vermoeden dat een deur dichtdoet, is
 * een deur die op een dinsdag een echte klant tegenhoudt.
 *
 * Elke toets hieronder die `hard` noemt, staat er om die regel te bewaken.
 *
 * ── EN DE DREMPELS WORDEN GEÏMPORTEERD, NIET OVERGETYPT ──────────────────────
 *
 * Een toets die 1000 intypt, bewijst dat 1000 nog steeds 1000 is. De grenzen
 * komen uit dezelfde export als de functie, en de gevallen worden ERUIT
 * afgeleid — net onder en net boven. Verandert de drempel, dan verhuizen de
 * gevallen mee en blijft de toets zeggen wat hij zegt.
 */
import {
  keurBeeld, MIN_LANGE_ZIJDE, DONKER_ONDER, DUN_ONDER_BPP, BPP_FORMATEN,
} from '../src/data/shots.js';

const R = [];
const ok = (naam, gekregen, verwacht) => R.push({
  naam,
  verwacht: JSON.stringify(verwacht),
  gekregen: JSON.stringify(gekregen),
  pass: JSON.stringify(gekregen) === JSON.stringify(verwacht),
});

/* Een bestand van een gezonde grootte voor zijn aantal pixels: ruim boven de
   bits-per-pixel-drempel, zodat een geval over helderheid niet per ongeluk op
   compressie afketst. */
const dik = (w, h) => Math.ceil((w * h * DUN_ONDER_BPP * 4) / 8);

console.log('\nte klein — de enige die weigert');
{
  const onder = MIN_LANGE_ZIJDE - 1;
  const boven = MIN_LANGE_ZIJDE;
  const a = keurBeeld({ w: onder, h: Math.round(onder * 0.75), mean: 0.5 }, 'jpg', dik(onder, onder));
  ok('net onder de grens wordt geweigerd', a && a.code, 'te-klein');
  ok('  en dat is een harde weigering', a && a.hard, true);
  ok('  met de grens erbij, zodat de melding een getal kan noemen', a && a.min, MIN_LANGE_ZIJDE);
  ok('  en met wat er gemeten is', a && a.lang, onder);

  const b = keurBeeld({ w: boven, h: Math.round(boven * 0.75), mean: 0.5 }, 'jpg', dik(boven, boven));
  ok('precies op de grens gaat door', b, null);

  /* De LANGE zijde telt, niet de breedte. Een staande foto van 800 × 1400 is
     ruim genoeg; hem afwijzen omdat hij smal is, zou elke portretfoto van een
     kledingstuk buitensluiten — en dat is precies de vorm die het meest wordt
     aangeleverd. */
  const staand = keurBeeld({ w: 800, h: MIN_LANGE_ZIJDE + 400, mean: 0.5 }, 'jpg', dik(800, MIN_LANGE_ZIJDE + 400));
  ok('een smalle staande foto is niet te klein', staand, null);
}

console.log('\nte donker — meldt, en houdt niets tegen');
{
  const g = { w: 3000, h: 4000 };
  const donker = keurBeeld({ ...g, mean: DONKER_ONDER - 0.01 }, 'jpg', dik(g.w, g.h));
  ok('onder de drempel wordt gemeld', donker && donker.code, 'te-donker');
  ok('  en dat is NIET hard — de foto gaat gewoon mee', donker && donker.hard, false);

  ok('op de drempel is er niets aan de hand',
    keurBeeld({ ...g, mean: DONKER_ONDER }, 'jpg', dik(g.w, g.h)), null);
  ok('en een normaal belichte foto ook niet',
    keurBeeld({ ...g, mean: 0.55 }, 'jpg', dik(g.w, g.h)), null);
}

console.log('\nte ver gecomprimeerd — meldt, en alleen waar de maat iets zegt');
{
  const g = { w: 3000, h: 4000, mean: 0.5 };
  const px = g.w * g.h;
  const dun = Math.floor((px * (DUN_ONDER_BPP - 0.05)) / 8);
  const gezond = Math.ceil((px * (DUN_ONDER_BPP + 0.2)) / 8);

  const a = keurBeeld(g, 'jpg', dun);
  ok('een uitgeknepen JPEG wordt gemeld', a && a.code, 'te-dun');
  ok('  en dat is NIET hard', a && a.hard, false);
  ok('een gezonde JPEG niet', keurBeeld(g, 'jpg', gezond), null);
  ok('  ook niet met de andere schrijfwijze van de extensie', keurBeeld(g, 'jpeg', gezond), null);
  ok('en jpeg wordt wél gemeten', (keurBeeld(g, 'jpeg', dun) || {}).code, 'te-dun');

  /* DE BELANGRIJKSTE VAN DIT BLOK. Bits per pixel zegt alleen iets binnen één
     compressiefamilie. Een verliesloze PNG van een flatlay op wit haalt
     routineus een lagere waarde dan een matige JPEG, en AVIF haalt bij gelijke
     kwaliteit een derde. Ze meenemen zou de melding waardeloos maken: hij zou
     dan het vaakst afgaan op de bestanden waar niets mee aan de hand is. */
  for (const ext of ['png', 'webp', 'avif', 'heic', 'tif']) {
    ok(`${ext} wordt niet op compressie beoordeeld`, keurBeeld(g, ext, dun), null);
  }
  ok('de lijst met formaten die het wél zijn, is precies jpg en jpeg',
    [...BPP_FORMATEN].sort(), ['jpeg', 'jpg']);
}

console.log('\nvolgorde en randgevallen');
{
  /* Een screenshot is meestal én te klein, én donker, én dun. Dan hoort er één
     melding te komen, en de melding die zegt wat de klant moet doen. */
  const drie = keurBeeld({ w: 400, h: 300, mean: 0.02 }, 'jpg', 4000);
  ok('te klein wint van de andere twee', drie && drie.code, 'te-klein');

  ok('niet kunnen meten is geen oordeel', keurBeeld(null, 'jpg', 4000000), null);
  ok('een meting zonder helderheid valt terug op de rest',
    keurBeeld({ w: 3000, h: 4000, mean: null }, 'jpg', dik(3000, 4000)), null);
  ok('nul pixels levert geen deling door nul op',
    keurBeeld({ w: 0, h: 0, mean: 0.5 }, 'jpg', 4000), null);
  ok('een bestand van nul bytes wordt hier niet beoordeeld — dat doet preflight',
    keurBeeld({ w: 3000, h: 4000, mean: 0.5 }, 'jpg', 0), null);
}

console.log('\nde drempels zelf');
{
  /* Geen vastgepinde waarden: dat zou alleen bewijzen dat het getal nog steeds
     hetzelfde getal is. Wat hier wordt vastgehouden is dat ze in een bereik
     liggen waarin ze betekenen wat de kop erboven zegt — een ondergrens die
     screenshots vangt en geen echte foto's, en twee vermoedens die zeldzaam
     genoeg afgaan om serieus genomen te worden. */
  ok('de ondergrens vangt screenshots en geen telefoonfoto\'s',
    MIN_LANGE_ZIJDE >= 600 && MIN_LANGE_ZIJDE <= 1600, true);
  ok('donker is echt donker en niet "een beetje schemerig"',
    DONKER_ONDER > 0 && DONKER_ONDER <= 0.2, true);
  ok('de compressiegrens ligt onder wat een bruikbare JPEG haalt',
    DUN_ONDER_BPP > 0 && DUN_ONDER_BPP < 0.5, true);
}

const w = Math.max(...R.map((r) => r.naam.length));
for (const r of R) console.log(`${r.pass ? ' ok ' : 'FOUT'}  ${r.naam.padEnd(w)}  verwacht ${r.verwacht.padEnd(14)} kreeg ${r.gekregen}`);
const stuk = R.filter((r) => !r.pass).length;
console.log(`\n${R.length - stuk}/${R.length} geslaagd`);
process.exit(stuk ? 1 : 0);
