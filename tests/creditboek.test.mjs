/*
 * HET CREDITBOEK — ronde B, 8 oktober 2026 (§28, 6.03, 6.06, 6.08, V41, V43, V49)
 *
 * De motor achter "bestellen met credits", tegen het echte schema.sql met D1 op
 * node:sqlite. Wat hier vast moet staan:
 *   · een termijn wordt één keer een partij, 3 maanden geldig vanaf binnenkomst,
 *     en schuift de rest mee naar die datum (spaarplafond, 12 oktober 2026 —
 *     het plafond zelf staat in tests/spaarplafond.test.mjs);
 *   · een bestelling maakt de OUDSTE credits eerst op, atomair;
 *   · te weinig = er verandert niets; twee keer dezelfde bestelling = één keer af;
 *   · twee bestellingen tegelijk boeken samen nooit meer af dan er is;
 *   · wat vervalt staat als regel in het boek, en telt niet meer mee;
 *   · annuleren / niet gemaakt geeft credits terug, 3 maanden vanaf vandaag,
 *     nooit meer dan er afging;
 *   · een terugbetaalde termijn laat zijn ongebruikte credits vervallen (V49);
 *   · de rekensom in credits (creditKosten) voor stap 5 en de server.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import {
  boekBij, boekTermijnBij, boekAf, betaalBestellingMetCredits, creditsTerugVoorBestelling,
  creditboek, creditSaldo, creditsBeschikbaar, vervalTermijn, termijnGebruik, vervaldatum,
  creditsDieVervallen, creditsVanBestelling, CREDIT_REDEN,
} from '../src/lib/creditboek.js';
import { creditKosten, watPast, oudsteEerst, NIET_MET_CREDITS } from '../src/data/creditKosten.js';
import { CREDITS_GELDIG_MAANDEN, SERVICE_CREDITS, EXTRA_CREDITS, PLAN_CREDITS } from '../src/data/pricing.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(72)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema laadt zonder fouten', mislukt, []);
/* D1 voert batches na elkaar uit, elk als één transactie. Het harnas doet
   BEGIN … COMMIT met een await ertussen, dus twee batches tegelijk zouden daar
   in elkaar schuiven; hier staan ze netjes in de rij, zoals in D1. Het lezen
   ervoor loopt wél door elkaar — dat is precies de race die getest wordt. */
const echt = d1(db);
let rij = Promise.resolve();
let botsingen = 0;
const env = {
  DB: {
    prepare: echt.prepare,
    batch(lijst) {
      const p = rij.then(() => echt.batch(lijst)).catch((e) => {
        if (/CHECK constraint/.test(String(e?.message))) botsingen += 1;
        throw e;
      });
      rij = p.catch(() => {});
      return p;
    },
  },
};

db.prepare("INSERT INTO customers (id, email, name) VALUES (1, 'a@merk.test', 'A'), (2, 'b@merk.test', 'B')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at)
            VALUES (10, 1, 'SUB-A', 'studio', 'monthly', 'active', '2026-08-06 10:00:00'),
                   (20, 2, 'SUB-B', 'starter', 'monthly', 'paused', '2026-08-06 10:00:00')`).run();
let volg = 100;
const bestelling = (klant = 1, extra = {}) => {
  volg += 1;
  db.prepare(`INSERT INTO orders (id, ref, customer_id, service, email, total_cents, vat_cents, product_count, lang)
              VALUES (?, ?, ?, 'catalog', 'a@merk.test', 60000, 12600, 12, 'nl')`).run(volg, `VIS-T${volg}`, klant);
  if (extra.status) db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(extra.status, volg);
  return volg;
};
const dag = (s) => new Date(`${s}T12:00:00Z`);

console.log('\nde constante en de vervaldatum (6.03, V43 = a)');
{
  ok('credits zijn 3 maanden geldig', CREDITS_GELDIG_MAANDEN, 3);
  ok('6 oktober + 3 maanden = 6 januari', vervaldatum('2026-10-06 10:00:00'), '2027-01-06');
  ok('31 januari loopt over zoals in SQLite', vervaldatum('2026-11-30'), '2027-03-02');
  ok('SQLite rekent hetzelfde (migratie 0061)', db.prepare("SELECT date('2026-11-30', '+3 months') AS d").get().d, '2027-03-02');
}

console.log('\neen termijn wordt een partij');
{
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = 10').get();
  const a = await boekTermijnBij(env, sub, '2026-09', 'tr_sep', dag('2026-09-06'));
  ok('september: bijgeschreven', a.ok, true);
  ok('  vervalt 3 maanden later', a.vervaltOp, '2026-12-06');
  ok('dezelfde termijn nog een keer: niets (webhook dubbel)', (await boekTermijnBij(env, sub, '2026-09', 'tr_sep', dag('2026-09-06'))).ok, false);
  await boekTermijnBij(env, sub, '2026-10', 'tr_okt', dag('2026-10-06'));
  ok('saldo op 8 oktober: twee termijnen Studio', await creditsBeschikbaar(env, 1, dag('2026-10-08')), 2 * PLAN_CREDITS.studio);
}

console.log('\nbestellen met credits: oudste eerst, atomair');
{
  const id = bestelling();
  const kost = 12 * SERVICE_CREDITS.catalog;
  const r = await betaalBestellingMetCredits(env, { orderId: id, customerId: 1, aantal: kost, nu: dag('2026-10-08') });
  ok('gelukt', r.ok, true);
  ok('  saldo daarna', r.saldoNa, 2 * PLAN_CREDITS.studio - kost);
  const o = db.prepare('SELECT payment_status, payment_provider, paid_at, credits_used, total_cents, vat_cents FROM orders WHERE id = ?').get(id);
  ok('  bestelling op credits', o.payment_status, 'credits');
  ok('  paid_at meteen', !!o.paid_at, true);
  ok('  credits_used', o.credits_used, kost);
  ok('  geen bedrag (de termijnfactuur is de factuur)', [o.total_cents, o.vat_cents], [0, 0]);
  const partijen = db.prepare("SELECT maand, rest FROM credit_boek WHERE reden = 'termijn' AND customer_id = 1 ORDER BY id").all().map((p) => [p.maand, p.rest]);
  ok('  september (vervalt eerst) is aangesproken, oktober niet', partijen, [['2026-09', PLAN_CREDITS.studio - kost], ['2026-10', PLAN_CREDITS.studio]]);
  ok('  één regel −48 met de bestelling', db.prepare("SELECT aantal, order_ref FROM credit_boek WHERE order_id = ?").get(id), { aantal: -kost, order_ref: `VIS-T${id}` });
  const dubbel = await betaalBestellingMetCredits(env, { orderId: id, customerId: 1, aantal: kost, nu: dag('2026-10-08') });
  ok('dezelfde bestelling nog een keer: al betaald', dubbel.reden, 'al-betaald');
  ok('  en er is niets extra afgeboekt', await creditsBeschikbaar(env, 1, dag('2026-10-08')), 2 * PLAN_CREDITS.studio - kost);
  ok('creditsVanBestelling', await creditsVanBestelling(env, id), { afgeboekt: kost, terug: 0, regels: 0 });
}

console.log('\nte weinig credits');
{
  const id = bestelling();
  const saldo = await creditsBeschikbaar(env, 1, dag('2026-10-08'));
  const r = await betaalBestellingMetCredits(env, { orderId: id, customerId: 1, aantal: saldo + 1, nu: dag('2026-10-08') });
  ok('weigert', r.reden, 'te-weinig');
  ok('  noemt het saldo', r.saldo, saldo);
  ok('  bestelling blijft onbetaald (kan via Mollie)', db.prepare('SELECT payment_status FROM orders WHERE id = ?').get(id).payment_status, 'unpaid');
  ok('  saldo onveranderd', await creditsBeschikbaar(env, 1, dag('2026-10-08')), saldo);
  const ander = await betaalBestellingMetCredits(env, { orderId: id, customerId: 2, aantal: 4, nu: dag('2026-10-08') });
  ok('een bestelling van een ander kan niet met jouw credits (en B heeft er geen)', ander.ok, false);
}

console.log('\ntwee bestellingen tegelijk');
{
  db.prepare("INSERT INTO customers (id, email) VALUES (3, 'c@merk.test')").run();
  await boekBij(env, { customerId: 3, aantal: 50, reden: CREDIT_REDEN.bijstelling, toelichting: 'proef', nu: dag('2026-10-01') });
  const a = bestelling(3);
  const b = bestelling(3);
  const [ra, rb] = await Promise.all([
    betaalBestellingMetCredits(env, { orderId: a, customerId: 3, aantal: 30, nu: dag('2026-10-08') }),
    betaalBestellingMetCredits(env, { orderId: b, customerId: 3, aantal: 30, nu: dag('2026-10-08') }),
  ]);
  ok('precies één van de twee lukt (50 credits, 2 × 30)', [ra.ok, rb.ok].filter(Boolean).length, 1);
  ok('  saldo 20, nooit onder nul', await creditsBeschikbaar(env, 3, dag('2026-10-08')), 20);
  ok('  de ander staat nog op onbetaald', db.prepare("SELECT COUNT(*) AS n FROM orders WHERE customer_id = 3 AND payment_status = 'unpaid'").get().n, 1);
  await boekBij(env, { customerId: 3, aantal: 40, reden: CREDIT_REDEN.bijstelling, toelichting: 'proef 2', nu: dag('2026-10-02') });
  const c = bestelling(3);
  const d = bestelling(3);
  const [rc, rd] = await Promise.all([
    betaalBestellingMetCredits(env, { orderId: c, customerId: 3, aantal: 30, nu: dag('2026-10-08') }),
    betaalBestellingMetCredits(env, { orderId: d, customerId: 3, aantal: 30, nu: dag('2026-10-08') }),
  ]);
  ok('met 60 lukken twee × 30 allebei', [rc.ok, rd.ok], [true, true]);
  ok('  en de botsing op dezelfde partij is echt gebeurd (en opgevangen)', botsingen > 0, true);
  ok('  saldo 0', await creditsBeschikbaar(env, 3, dag('2026-10-08')), 0);
  ok('  rest nergens negatief', db.prepare('SELECT COUNT(*) AS n FROM credit_boek WHERE rest < 0').get().n, 0);
}

console.log('\nvervallen (oudste eerst, 3 maanden, V41)');
{
  /* Klant B: gepauzeerd. Zijn credits gelden tot hun datum (V41 = a). */
  await boekBij(env, { customerId: 2, subscriptionId: 20, aantal: 45, reden: CREDIT_REDEN.termijn, maand: '2026-07', sleutel: 'termijn:20:2026-07', nu: dag('2026-07-06') });
  await boekBij(env, { customerId: 2, subscriptionId: 20, aantal: 45, reden: CREDIT_REDEN.termijn, maand: '2026-08', sleutel: 'termijn:20:2026-08', nu: dag('2026-08-06') });
  ok('op 5 oktober: 90 (gepauzeerd telt mee)', await creditsBeschikbaar(env, 2, dag('2026-10-05')), 90);
  ok('op 6 oktober vervalt juli', await creditsBeschikbaar(env, 2, dag('2026-10-06')), 45);
  const s = await creditSaldo(env, { customerId: 2 }, { nu: dag('2026-10-06') });
  ok('creditSaldo: saldo', s.saldo, 45);
  ok('  eerstvolgende vervaldatum', s.vervaltEerst, { op: '2026-11-06', aantal: 45 });
  ok('  geen nieuwe credits tijdens een pauze', s.nieuw, null);
  ok('  het abonnement', s.abonnement && s.abonnement.status, 'paused');
  const boek = await creditboek(env, { subscriptionId: 20 }, { nu: dag('2026-10-06') });
  ok('creditboek: vervallen staat erin als regel op zijn datum', boek.map((r) => [r.dag, r.aantal, r.reden]),
    [['2026-07-06', 45, 'termijn'], ['2026-08-06', 45, 'termijn'], ['2026-10-06', -45, 'vervallen']]);
  ok('  met het saldo per regel', boek.map((r) => r.saldoNa), [45, 90, 45]);
  const id = bestelling(2);
  const r = await betaalBestellingMetCredits(env, { orderId: id, customerId: 2, aantal: 8, nu: dag('2026-10-06') });
  ok('een gepauzeerde abonnee kan nog met zijn credits bestellen', r.ok, true);
}

console.log('\nwat creditSaldo zegt over nieuwe credits');
{
  const s = await creditSaldo(env, 1, { nu: dag('2026-10-08') });
  ok('lopend maandabonnement: nieuwe credits op de afschrijfdag', s.nieuw, { op: '2026-11-06', aantal: PLAN_CREDITS.studio });
  /* Spaarplafond (12 oktober 2026): de termijn van oktober schoof september
     mee naar zijn eigen datum — één datum voor alles. */
  ok('  één vervaldatum voor beide termijnen (spaarplafond)', s.vervalt.map((v) => v.op), ['2027-01-06']);
  ok('  en geen datum die echt geldt: hij schuift bij de volgende termijn mee', s.echteDatums, []);
  ok('  het plafond: 3 × de credits van Pro', s.plafond, 3 * PLAN_CREDITS.studio);
  ok('  op abonnement gevraagd = dezelfde pot', (await creditSaldo(env, { subscriptionId: 10 }, { nu: dag('2026-10-08') })).saldo, s.saldo);
  ok('klant zonder iets: nul en geen fout', (await creditSaldo(env, { customerId: 999 })).saldo, 0);
}

console.log('\nannuleren en niet gemaakt (6.08)');
{
  const id = bestelling();
  await betaalBestellingMetCredits(env, { orderId: id, customerId: 1, aantal: 20, nu: dag('2026-10-08') });
  const voor = await creditsBeschikbaar(env, 1, dag('2026-10-09'));
  const deel = await creditsTerugVoorBestelling(env, { orderId: id, aantal: 4, reden: CREDIT_REDEN.nietGemaakt, toelichting: '1 product kon niet', nu: dag('2026-10-09') });
  ok('niet gemaakt: 4 terug', deel.aantal, 4);
  ok('  3 maanden geldig vanaf vandaag', deel.vervaltOp, '2027-01-09');
  const rest = await creditsTerugVoorBestelling(env, { orderId: id, reden: CREDIT_REDEN.annulering, nu: dag('2026-10-10') });
  ok('annuleren: de rest (16) terug', rest.aantal, 16);
  ok('  saldo +20', await creditsBeschikbaar(env, 1, dag('2026-10-10')), voor + 20);
  ok('nog een keer annuleren: niets', (await creditsTerugVoorBestelling(env, { orderId: id, reden: CREDIT_REDEN.annulering })).ok, false);
  ok('meer terug dan er afging: niets', (await creditsTerugVoorBestelling(env, { orderId: id, aantal: 1, reden: CREDIT_REDEN.nietGemaakt })).ok, false);
  const zonder = bestelling();
  ok('een bestelling zonder credits geeft niets terug', (await creditsTerugVoorBestelling(env, { orderId: zonder })).reden, 'geen-credits');
}

console.log('\nbijstellen door Lucas (6.08)');
{
  const voor = await creditsBeschikbaar(env, 1, dag('2026-10-10'));
  const af = await boekAf(env, { customerId: 1, aantal: 10, toelichting: 'dubbel toegekend', door: 'lucas@visuails.test', nu: dag('2026-10-10') });
  ok('afschrijven: gelukt', af.ok, true);
  ok('  saldo −10', await creditsBeschikbaar(env, 1, dag('2026-10-10')), voor - 10);
  ok('  met toelichting in het boek', db.prepare("SELECT toelichting FROM credit_boek WHERE reden = 'bijstelling' AND customer_id = 1 AND aantal < 0").get().toelichting, 'dubbel toegekend');
  ok('meer afschrijven dan er is: weigert', (await boekAf(env, { customerId: 1, aantal: 100000, toelichting: 'x', nu: dag('2026-10-10') })).reden, 'te-weinig');
}

console.log('\neen terugbetaalde termijn (V49 = a)');
{
  const voor = await termijnGebruik(env, { paymentId: 'tr_sep', bedragCents: 79000, nu: dag('2026-10-10') });
  ok('termijnGebruik: toegekend', voor.toegekend, PLAN_CREDITS.studio);
  ok('  gebruikt + ongebruikt = toegekend', voor.gebruikt + voor.ongebruikt, voor.toegekend);
  ok('  ongebruikt deel in centen, naar rato', voor.ongebruiktCents, Math.round(79000 * voor.ongebruikt / voor.toegekend));
  const saldoVoor = await creditsBeschikbaar(env, 1, dag('2026-10-10'));
  const v = await vervalTermijn(env, { paymentId: 'tr_sep', bedragCents: 79000, nu: dag('2026-10-10') });
  ok('de ongebruikte credits vervallen meteen', v.vervielNu, voor.ongebruikt);
  ok('  saldo daalt met precies dat', await creditsBeschikbaar(env, 1, dag('2026-10-10')), saldoVoor - voor.ongebruikt);
  ok('  als regel "terugbetaald" in het boek', db.prepare("SELECT aantal FROM credit_boek WHERE reden = 'terugbetaald'").get().aantal, -voor.ongebruikt);
  ok('  twee keer (webhook dubbel): niets meer', (await vervalTermijn(env, { paymentId: 'tr_sep', nu: dag('2026-10-10') })).vervielNu, 0);
  ok('onbekende termijn: null', await vervalTermijn(env, { paymentId: 'tr_bestaatniet' }), null);
}

console.log('\nde herinnering: één keer, 7 dagen vooraf');
{
  const lijst = await creditsDieVervallen(env, { dagen: 7, nu: dag('2026-10-30') });
  ok('op 30 oktober: klant B (vervalt 6 november)', lijst.map((x) => [x.customerId, x.op]), [[2, '2026-11-06']]);
  ok('  met het aantal dat er nog is', lijst[0].aantal, 45 - 8);
  ok('op 31 oktober niet meer (geen tweede mail)', (await creditsDieVervallen(env, { dagen: 7, nu: dag('2026-10-31') })).length, 0);
}

console.log('\nde rekensom in credits (creditKosten)');
{
  ok('12 catalogsets = 48', creditKosten({ service: 'catalog', products: 12 }).credits, 12 * SERVICE_CREDITS.catalog);
  const l = creditKosten({ service: 'lifestyle', products: 3, extras: 2, hoogRes: 5 });
  ok('lifestyle 3 + 2 extra foto’s + 4K (geklemd op 3)', l.credits,
    3 * SERVICE_CREDITS.lifestyle + 2 * EXTRA_CREDITS.photo + 3 * EXTRA_CREDITS.hires);
  ok('  kan met credits', l.kan, true);
  ok('4K bij catalog telt niet (geen keuze)', creditKosten({ service: 'catalog', products: 2, hoogRes: 2 }).credits, 2 * SERVICE_CREDITS.catalog);
  ok('voorrang: niet met credits (V46 = a)', creditKosten({ service: 'catalog', products: 2, voorrang: true }).nietMet, [NIET_MET_CREDITS.voorrang]);
  ok('  maar wel wat het zonder zou kosten', creditKosten({ service: 'catalog', products: 2, voorrang: true }).credits, 8);
  /* Levering 60 (afvinklijst 38, v38-credits a): een complete look kan met credits, 4 per look. */
  ok('complete look: wel met credits, 4 per look', [creditKosten({ service: 'lifestyle', products: 2, looks: 1 }).kan, creditKosten({ service: 'lifestyle', products: 2, looks: 1 }).credits], [true, 14]);
  ok('  maar niet bij catalog', creditKosten({ service: 'catalog', products: 2, looks: 1 }).credits, 8);
  ok('  en nooit meer looks dan er van twee passen', creditKosten({ service: 'lifestyle', products: 3, looks: 5 }).credits, 19);
  ok('eigen look met toeslag: niet met credits', creditKosten({ service: 'lifestyle', products: 2, toeslagCents: 500 }).nietMet, [NIET_MET_CREDITS.toeslag]);
  ok('video (op aanvraag): geen creditprijs', creditKosten({ service: 'video', products: 2 }).credits, null);
  ok('"meer dan 30": geen creditprijs', creditKosten({ service: 'catalog', products: null }).nietMet, [NIET_MET_CREDITS.aantal]);
  ok('watPast: 30 credits, 12 catalogsets → 7, dus 5 eraf', watPast({ service: 'catalog', products: 12, saldo: 30 }), { past: 7, eraf: 5 });
  ok('watPast met een extra hoek per product', watPast({ service: 'catalog', products: 5, extrasPerProduct: 1, saldo: 20 }), { past: 3, eraf: 2 });
  ok('oudsteEerst: 48 uit 20 (nov) en 120 (dec)', oudsteEerst([{ op: '2026-11-30', aantal: 20 }, { op: '2026-12-06', aantal: 120 }], 48),
    [{ op: '2026-11-30', aantal: 20, vanGroep: 20 }, { op: '2026-12-06', aantal: 28, vanGroep: 120 }]);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
