/**
 * DE BEDRAGENTEST — §22 VAN HET OVERZICHT, REGEL VOOR REGEL (punt 9.11, 8 oktober 2026)
 *
 *   npm run test:bedragen
 *
 * ── WAAROM ───────────────────────────────────────────────────────────────────
 *
 * §22 van kladblok/VISUAILS-OVERZICHT-6-OKT.md is de leeslijst van alle bedragen
 * en getallen: staffels, extra foto, 4K, voorrang, plannen, credits, jaar vooruit,
 * btw, termijnen, capaciteit. De bron is steeds een constante in de code. Deze
 * test legt die twee naast elkaar, één regel per rij van §22. Verandert er een
 * prijs, dan faalt precies één regel, met de vraag of §22 ook bij moet.
 *
 * De duurste fout is een bedrag dat op de site anders staat dan op de factuur;
 * dat vangt tests/geldroute.test.mjs. Deze test vangt de stillere: dat de code
 * iets anders is gaan rekenen dan wat Lucas denkt dat er staat.
 *
 * Rijen zonder eigen constante (venster vasthouden 7 dagen, herinnering dag 3/14,
 * inlogtijden, abonnementssignalen) staan niet hier maar in
 * tests/hardgetypt.test.mjs, als uitzondering met een reden.
 *
 * Ronde 10 (abonnement zonder week) verandert plannen en credits; dan falen de
 * regels hieronder die erbij horen, en dat is de bedoeling.
 */
import * as P from '../src/data/pricing.js';
import { prepayTotalCents, prepayFreeMonths, rolloverMonths } from '../src/data/plans.js';
import { REVIEW_HOURS, PAYMENT_DAYS, vatDecision } from '../src/data/vat.js';
import { UPLOAD_DAYS, DELIVERY_DAYS } from '../src/lib/retention.js';
import { PORTAL_TTL_DAYS, PORTAL_MAX_LIFE_DAYS } from '../src/lib/token.js';
import { TEGOED_GELDIG_MAANDEN } from '../src/data/tegoed.js';
import * as C from '../src/data/capacity.js';

let goed = 0, totaal = 0;
function rij(naam, kreeg, wil) {
  totaal++;
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) goed++;
  console.log(`${g ? ' ok  ' : ' FAIL'} §22 ${naam}${g ? '' : `\n        code: ${JSON.stringify(kreeg)}  ·  §22: ${JSON.stringify(wil)}\n        Klopt de nieuwe waarde? Zet hem dan ook in §22 van het overzicht en hier.`}`);
}
const prijzen = (ladder) => ladder.map(([, , p]) => p);
const treden = (ladder) => ladder.map(([van, tot]) => `${van}${tot ? `–${tot}` : '+'}`);
const PLANNEN = ['starter', 'studio', 'brand'];

console.log('\n§22 · alle bedragen en getallen, regel voor regel\n');

rij('Catalog per product: 1–4 €89 · 5–9 €65 · 10–19 €51 · 20+ €39', [treden(P.LADDER.catalog), prijzen(P.LADDER.catalog)], [['1–4', '5–9', '10–19', '20+'], [89, 65, 51, 39]]);
rij('Lifestyle per product (4 beelden): €109 · €82 · €64 · €49', [prijzen(P.LADDER.lifestyle), P.LIFESTYLE_IMAGES], [[109, 82, 64, 49], 4]);
rij('Compleet bestaat niet meer (sinds 14 okt 2026): geen trede', Object.keys(P.LADDER), ['catalog', 'lifestyle']);
rij('Formuliermaximum: 20 producten', P.FORM_MAX_PRODUCTS, 20);
rij('Vaste datum vanaf: 10 producten', P.WINDOW_THRESHOLD, 10);
rij('Extra hoek/foto per product: €39 · €34 · €29 · €19, max 4', [prijzen(P.EXTRA_PHOTO_LADDER), P.MAX_EXTRA_PER_PRODUCT], [[39, 34, 29, 19], 4]);
rij('4K (alleen lifestyle): €9 per product', P.HOOG_PER_PRODUCT, 9);
rij('Resolutie: 2048 px standaard, 4096 hoog', [P.RESOLUTIE.standaard, P.RESOLUTIE.hoog], [2048, 4096]);
/* Levering 60 (afvinklijst 38): de outfit is de complete look, € 50 en 4 credits per look. */
rij('Complete look: €50 per look, 4 credits', [P.LOOK_PRIJS, P.LOOK_CREDITS], [50, 4]);
rij('Voorrang: 20%, min €49, max €249, tot 20 producten/10 clips, vóór 15:00 → vóór 17:00',
  [P.VOORRANG.deel, P.VOORRANG.bodem, P.VOORRANG.plafond, P.VOORRANG.maxProducten, P.VOORRANG.maxClips, P.VOORRANG.bestelVoorUur, P.VOORRANG.klaarUur],
  [0.2, 49, 249, 20, 10, 15, 17]);
rij('Probeer VISUAILS: €1 (+ btw)', P.AMOUNT.testSample, 1);
rij('Video motion / lifestyle-video: €69 / €149 intern, op aanvraag', [P.AMOUNT.video, P.AMOUNT.videoLifestyle, Boolean(P.VIDEO_OP_AANVRAAG)], [69, 149, true]);
rij('Hooks: vanaf €119, variant €49', [P.AMOUNT.hooks, P.AMOUNT.hooksVariant], [119, 49]);
rij('Editions: €149/maand + €295 opzet', [P.AMOUNT.editions, P.AMOUNT.editionsSetup], [149, 295]);
rij('Merkmodel: €450 eenmalig (€544,50 incl.)', [P.AMOUNT.brandModel, Math.round(P.AMOUNT.brandModel * (1 + P.VAT_RATE) * 100) / 100], [450, 544.5]);
rij('Fotoshoot elders: €2.500–8.000', [P.AMOUNT.shootDayLow, P.AMOUNT.shootDayHigh, P.SHOOT_DAY.nl.range], [2500, 8000, '€2.500–8.000']);
rij('Plannen per maand: Starter €390 · Pro €790 · Merk €1.690', PLANNEN.map((p) => P.PLAN_AMOUNT[p]), [390, 790, 1690]);
rij('Credits per maand: 45 · 120 · 290 (€8,67 · €6,58 · €5,83 per credit)',
  [PLANNEN.map((p) => P.PLAN_CREDITS[p]), PLANNEN.map((p) => Math.round((P.PLAN_AMOUNT[p] / P.PLAN_CREDITS[p]) * 100) / 100)], [[45, 120, 290], [8.67, 6.58, 5.83]]);
rij('Credits per dienst: catalog 4 · lifestyle 5 · motion 5 · lifestyle-clip 12 · hook 10 · extra foto 2 · 4K 1',
  [P.SERVICE_CREDITS.catalog, P.SERVICE_CREDITS.lifestyle, P.SERVICE_CREDITS['video-motion'], P.SERVICE_CREDITS['video-lifestyle'], P.SERVICE_CREDITS.hooks, P.EXTRA_CREDITS.photo, P.EXTRA_CREDITS.hires],
  [4, 5, 5, 12, 10, 2, 1]);
rij('Jaar vooruit: betaal 10, krijg 12: €3.900 · €7.900 · €16.900', [PLANNEN.map(prepayFreeMonths), PLANNEN.map((p) => prepayTotalCents(p) / 100)], [[2, 2, 2], [3900, 7900, 16900]]);
rij('Maand op maat: 30–300 credits, stap 5 (30 → €272, 300 → €1.748)',
  [P.CUSTOM_CREDITS_MIN, P.CUSTOM_CREDITS_MAX, P.CUSTOM_CREDITS_STEP, P.customCreditsTotal(30).total, P.customCreditsTotal(300).total], [30, 300, 5, 272, 1748]);
rij('Doorschuiven: maandelijks 1 maand; jaar/vooruit 3', ['monthly', 'yearly', 'prepaid'].map(rolloverMonths), [1, 3, 3]);
rij('Besparing plan t.o.v. los: Starter 30% · Pro 32% · Merk 40%', PLANNEN.map((p) => P.planSaving(p).pct), [30, 32, 40]);
rij('Btw: 21%; EU met geldig VIES 0% verlegd; buiten de EU 0%',
  [P.VAT_RATE, vatDecision({ country: 'NL' }).rate, vatDecision({ country: 'DE', vatValid: true }).rate, vatDecision({ country: 'US' }).rate], [0.21, 0.21, 0, 0]);
rij('Btw-beoordeling / betalen na akkoord: 24 uur / 7 dagen', [REVIEW_HOURS, PAYMENT_DAYS], [24, 7]);
rij('Revisieronde: 1 per bestelling, binnen 7 dagen', P.REVISIE_DAGEN, 7);
rij('Bewaren: bronfoto\'s 90 dagen na afronden; beelden 90 dagen na levering', [UPLOAD_DAYS, DELIVERY_DAYS], [90, 90]);
rij('Privélink: 90 dagen na afronden, max 365', [PORTAL_TTL_DAYS, PORTAL_MAX_LIFE_DAYS], [90, 365]);
rij('Tegoed: 24 maanden geldig', TEGOED_GELDIG_MAANDEN, 24);
rij('Capaciteit: 100 punten/dag = 25 producten, 5 vrij voor kleine bestellingen, 80 reserveerbaar, venster 2 dagen = 160, horizon 60',
  [C.PUNTEN_PER_DAG, C.PRODUCTS_PER_DAY, C.QUEUE_FLOOR_PER_DAY, C.ATTENDED_PUNTEN_PER_DAG, C.WINDOW_DAYS, C.ATTENDED_PUNTEN_PER_VENSTER, C.HORIZON_DAYS], [100, 25, 5, 80, 2, 160, 60]);
rij('Punten per soort: catalog 4 · lifestyle 4 · motion 4 · lifestyle-clip 10 (oude bundel 7, oude lifestyle 3)',
  ['catalog', 'lifestyle', 'video-motion', 'video-lifestyle'].map((k) => P.KIND_PUNTEN[k]), [4, 4, 4, 10]);

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
