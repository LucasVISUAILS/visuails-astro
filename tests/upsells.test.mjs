/*
 * VISUAILS — DE TWEE BETAALDE OPTIES VAN 9 SEPTEMBER 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"lifestyle heeft echter wel de mogelijkheid op een 4k upsell (…) Ook
 * kan de klant kiezen voor priority delivery, waarbij de klant bovenaan de
 * lijst komt te staan als upsell."*
 *
 * ── WAAROM DIT EEN EIGEN BESTAND KRIJGT ────────────────────────────────────
 *
 * Allebei veranderen ze een BEDRAG, en allebei worden ze op twee plekken
 * uitgerekend: één keer in de browser (pipeline.js, als voorbeeld) en één keer
 * op de server (quote.js, als factuur). Dat is precies de vorm waarin een
 * prijsfout ontstaat en niemand hem ziet — de klant leest het ene getal en
 * betaalt het andere.
 *
 * Dus toetst dit bestand niet of de knoppen er staan (dat doet request-flow),
 * maar of de SOM klopt, of de grenzen bijten, en of een gesleuteld formulier
 * niets kan afdwingen wat het formulier zelf niet aanbiedt.
 */
import { quoteOrder } from '../src/lib/quote.js';
import {
  HOOG_PER_PRODUCT, VOORRANG, RESOLUTIE, voorrangBedrag, voorrangKan, ladderRate,
} from '../src/data/pricing.js';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const gelijk = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : ' FAIL'} ${naam}${gelijk ? '' : `   verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const net = (o) => { const r = quoteOrder(o); return r ? r.netCents / 100 : null; };

console.log('\nde resolutie is één getal en staat op één plek');
{
  ok('standaard is kleiner dan hoog', RESOLUTIE.standaard < RESOLUTIE.hoog, true);
  ok('en allebei zijn het hele pixels', Number.isInteger(RESOLUTIE.standaard) && Number.isInteger(RESOLUTIE.hoog), true);
}

console.log('\n4K telt alleen waar er lifestylebeelden zijn');
{
  const basis5 = ladderRate('lifestyle', 5) * 5;
  ok('lifestyle: vijf producten op 4K', net({ service: 'lifestyle', products: 5, hoogRes: 5 }), basis5 + 5 * HOOG_PER_PRODUCT);
  ok('complete telt mee, want die heeft een lifestylehelft',
    net({ service: 'drop', products: 5, hoogRes: 5 }), ladderRate('complete', 5) * 5 + 5 * HOOG_PER_PRODUCT);
  /* Catalogbeelden zijn altijd de standaardmaat; 4K is daar een aanvraag via
     WhatsApp en geen vinkje. Een POST die het tóch meestuurt, hoort niets te
     kosten — anders betaalt iemand voor iets wat niet geleverd wordt. */
  ok('catalog niet, ook niet als het veld meekomt',
    net({ service: 'catalog', products: 5, hoogRes: 5 }), ladderRate('catalog', 5) * 5);
  /* Meer vinkjes dan producten is een gesleuteld formulier. */
  ok('en het aantal is geklemd op het aantal producten',
    net({ service: 'lifestyle', products: 5, hoogRes: 999 }), basis5 + 5 * HOOG_PER_PRODUCT);
  ok('nul vinkjes kost nul', net({ service: 'lifestyle', products: 5, hoogRes: 0 }), basis5);
}

console.log('\nvoorrang is een deel van het orderbedrag, met een bodem en een plafond');
{
  ok('de bodem bijt bij één product', voorrangBedrag(ladderRate('catalog', 1)), VOORRANG.bodem);
  ok('het plafond bijt bij de grootste bestelling', voorrangBedrag(ladderRate('complete', 20) * 20), VOORRANG.plafond);
  ok('en daartussen is het het percentage', voorrangBedrag(500), Math.ceil(500 * VOORRANG.deel));
  ok('het bedrag is altijd een heel getal',
    [1, 89, 325, 780, 1300].every((n) => Number.isInteger(voorrangBedrag(n))), true);
}

console.log('\nen hij wordt geweigerd waar hij niet waargemaakt kan worden');
{
  ok(`tot en met ${VOORRANG.maxProducten} producten kan het`, voorrangKan({ kind: 'catalog', products: VOORRANG.maxProducten }), true);
  ok('daarboven niet', voorrangKan({ kind: 'catalog', products: VOORRANG.maxProducten + 1 }), false);
  ok(`en tot en met ${VOORRANG.maxClips} clips`, voorrangKan({ kind: 'hooks', clips: VOORRANG.maxClips }), true);
  ok('daarboven niet', voorrangKan({ kind: 'hooks', clips: VOORRANG.maxClips + 1 }), false);
  ok('een merkmodel kent geen voorrang', voorrangKan({ kind: 'custom', products: 1 }), false);
  /* En de weigering moet ook in het BEDRAG zitten en niet alleen in de knop:
     het formulier biedt hem daar niet aan, dus een POST die hem meestuurt is
     omzeild en hoort niet in rekening gebracht te worden. */
  const grens = VOORRANG.maxProducten;
  ok('boven de grens kost voorrang niets',
    net({ service: 'catalog', products: grens + 1, voorrang: true }), ladderRate('catalog', grens + 1) * (grens + 1));
}

console.log('\nde twee samen, en in de goede volgorde');
{
  /* Voorrang rekent over het HELE bedrag tot dan toe, inclusief de 4K-toeslag:
     wat opzij moet, is de bestelling zoals hij is. En nooit over zichzelf. */
  const basis = ladderRate('lifestyle', 5) * 5 + 2 * HOOG_PER_PRODUCT;
  ok('4K eerst, voorrang daarna over het totaal',
    net({ service: 'lifestyle', products: 5, hoogRes: 2, voorrang: true }), basis + voorrangBedrag(basis));
  const r = quoteOrder({ service: 'lifestyle', products: 5, hoogRes: 2, voorrang: true });
  ok('en de btw wordt over het totaal MET voorrang gerekend',
    r.vatCents, Math.round(r.netCents * r.vatRate));
  ok('bruto is netto plus btw', r.grossCents, r.netCents + r.vatCents);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
