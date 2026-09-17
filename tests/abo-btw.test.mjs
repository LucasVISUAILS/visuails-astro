/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAT ER WORDT AFGESCHREVEN IS WAT DE FACTUUR ZEGT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gevonden op 17 september 2026, bij een gerichte doorlichting van de backend.
 *
 * De abonnementsketen had twee uiteinden die het niet met elkaar eens waren:
 *
 *   subscribe.js  gaf `subMaandCents()` door aan Mollie. Dat is NETTO — de prijs
 *                 zoals /plans hem toont, met `vatLabel('excl')` ernaast.
 *   invoice.js    behandelt `payment.amount_cents` als BRUTO en rekent terug met
 *                 `net = round(gross / (1 + rate))`.
 *
 * Er werd dus netto geïncasseerd en over dat bedrag btw afgedragen alsof het
 * inclusief was. Op Studio was dat € 137,10 per abonnee per maand uit eigen zak,
 * en niemand zou het gezien hebben: beide kanten zijn op zichzelf logisch, de
 * fout zit ertussen.
 *
 * ── WAAROM DIT EEN EIGEN TOETS IS EN GEEN REGEL IN slots.test.mjs ──────────
 *
 * Omdat het punt niet de rekensom is maar de AANSLUITING. Een toets die alleen
 * `subMaandBruto()` narekent, blijft groen op de dag dat iemand invoice.js van
 * bruto naar netto zet — en dan is het gat er weer, alleen de andere kant op.
 * Dus loopt deze toets de keten door: netto → wat Mollie krijgt → wat de factuur
 * eruit terugrekent, en eist dat het eerste en het laatste gelijk zijn.
 *
 * De derde sectie kijkt in de BRON van subscribe.js. Dat is lelijk en het is het
 * waard: de aansluiting hierboven is te bewijzen met getallen, maar dat de
 * betaalaanroep het brutobedrag meekrijgt is een regel code die iemand in één
 * beweging kan terugzetten naar `subMaandCents`. Die regel is de fout zelf.
 */
import { readFileSync } from 'node:fs';
import { subMaandCents, subMaandBruto, subEersteBetalingCents, subEersteBetalingBruto, subBrutoCents } from '../src/lib/slots.js';
import { snapshotFromSubscription } from '../src/lib/invoice.js';
import { VAT_TREATMENT } from '../src/data/vat.js';
import { VAT_RATE } from '../src/data/pricing.js';
import { PLAN_IDS } from '../src/data/plans.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const gelijk = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : ' FAIL'} ${naam}${gelijk ? '' : `   verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/* Commentaar eruit voordat er iets wordt gezocht: de noten in subscribe.js en
   slots.js noemen de oude, foute aanroep woordelijk. */
const zonderNoten = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const rij = (over = {}) => ({
  plan: 'studio', term: 'monthly',
  vat_treatment: VAT_TREATMENT.standard, vat_rate: VAT_RATE,
  ...over,
});

console.log('\nbtw gaat EROVERHEEN en zit er niet al in');
{
  const nl = rij();
  ok('het maandbedrag is netto', subMaandCents(nl), 79000);
  ok('en er wordt bruto afgeschreven', subMaandBruto(nl), Math.round(79000 * (1 + VAT_RATE)));
  ok('de eerste betaling volgt dezelfde regel',
    subEersteBetalingBruto(nl), subBrutoCents(nl, subEersteBetalingCents(nl)));
}

console.log('\nen alleen waar er btw te heffen valt');
{
  /* Verlegd (art. 196) en buiten de EU-heffing zijn allebei 0%: daar is bruto
     gelijk aan netto, en de klant betaalt precies de prijs van de pagina. */
  for (const behandeling of [VAT_TREATMENT.reverseCharge, VAT_TREATMENT.outsideScope]) {
    const r = rij({ vat_treatment: behandeling, vat_rate: 0 });
    ok(`${behandeling} betaalt netto`, subMaandBruto(r), subMaandCents(r));
  }
  /* Een lege kolom is geen fiscaal standpunt — dezelfde keuze als in invoice.js:
     zonder behandeling geldt het hoge tarief. Te veel rekenen is een correctie,
     te weinig is een naheffing. */
  const oud = rij({ vat_treatment: null, vat_rate: null });
  ok('een rij zonder behandeling valt terug op 21%', subMaandBruto(oud), Math.round(79000 * (1 + VAT_RATE)));
  /* En een tarief van 0 op een STANDAARD behandeling is een lege kolom en geen
     vrijstelling. Dit is de val waar invoice.js een eigen noot over heeft. */
  const leeg = rij({ vat_rate: 0 });
  ok('en een leeg tarief op nl_standard ook', subMaandBruto(leeg), Math.round(79000 * (1 + VAT_RATE)));
}

console.log('\nde keten sluit rond: netto → afschrijving → factuur → netto');
{
  const klant = { billing_address: 'Voorbeeldweg 1\n1234 AB Voorbeeldstad' };
  for (const plan of PLAN_IDS) {
    for (const term of ['monthly', 'yearly']) {
      for (const behandeling of [VAT_TREATMENT.standard, VAT_TREATMENT.reverseCharge]) {
        const sub = rij({ plan, term, vat_treatment: behandeling, vat_rate: behandeling === VAT_TREATMENT.standard ? VAT_RATE : 0 });
        const netto = subMaandCents(sub);
        const bruto = subMaandBruto(sub);
        const snap = snapshotFromSubscription(
          { sub, customer: klant, payment: { amount_cents: bruto }, month: '2026-09', lang: 'nl' },
          {}, { number: 'VIS-2026-0001', date: '2026-09-17' }
        );
        ok(`${plan}/${term}/${behandeling}: de factuur komt op hetzelfde netto uit`, snap.netCents, netto);
        ok(`${plan}/${term}/${behandeling}: en bruto is wat er is afgeschreven`, snap.netCents + snap.vatCents, bruto);
      }
    }
  }
}

console.log('\nen de betaalaanroepen dragen het brutobedrag');
{
  const bron = zonderNoten(lees('src/lib/subscribe.js'));
  /* De eerste betaling (mandaat + eerste termijn) en de doorlopende
     subscription. Allebei moeten ze de bruto-vorm gebruiken. */
  ok('createFirstPayment krijgt subEersteBetalingBruto', /valueEuros:\s*subEersteBetalingBruto\(/.test(bron), true);
  ok('en de maandelijkse afschrijving subMaandBruto', /subMaandBruto\(vol\)\s*\/\s*100/.test(bron), true);
  /* De netto-vorm mag nog wél bestaan in dit bestand — hij wordt gebruikt om te
     tonen wat een plan kost — maar niet als bedrag dat naar Mollie gaat. */
  ok('en geen van beide gaat nog netto naar Mollie',
    /valueEuros:\s*(subEersteBetalingCents|subMaandCents)\(/.test(bron), false);

  /* En de rij moet de twee kolommen bij zich dragen, anders valt élke abonnee
     terug op 21% — ook wie verlegde btw heeft. */
  const abo = zonderNoten(lees('src/lib/subscription.js'));
  ok('createSubscriptionRow geeft de btw-kolommen terug',
    /RETURNING[\s\S]{0,200}?vat_treatment,\s*vat_rate/.test(abo), true);
  ok('en loadSubscription haalt ze op',
    /SELECT[\s\S]{0,400}?vat_treatment,\s*vat_rate[\s\S]{0,400}?FROM subscriptions/.test(abo), true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
