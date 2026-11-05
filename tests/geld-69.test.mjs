/*
 * VISUAILS — DE NALOOP VAN DE GELDSTROMEN, LEVERING 69 (5 november 2026)
 *   node tests/geld-69.test.mjs        (npm run test:geld69)
 *
 * De naloop volgde elke geldstroom van de knop tot de database, de mail, de
 * factuur en het creditboek (kladblok/LEVERING-69.md, §B). Wat hij vond en wat
 * gerepareerd is, staat in eigen toetsen waar het past (account-pay: "Nu
 * betalen" met tegoed; geldroute: de teruggestorte dubbele betaling). Deze toets
 * houdt de rest vast, door de echte webhook en een echte database:
 *
 *   F3 · DE MAAND VAN EEN VERVOLGTERMIJN. Bij een termijndag van 28 en een
 *        SEPA-incasso die pas op de 1e als betaald binnenkomt, kreeg de termijn
 *        van november de sleutel "december", en botste de termijn van december
 *        daar stil op: betaald, maar geen credits, factuur of mail. Nu
 *        termijnMaand() op de betaaldatum, zoals alles wat de maand leest.
 *   F4 · DE FACTUUR VAN EEN VOORUITBETAALD JAAR zei "Pro — abonnement oktober
 *        2026", alsof twaalf maanden één maand waren.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { subMaandBruto } from '../src/lib/slots.js';
import { termijnMaand } from '../src/lib/subscription.js';

let goed = 0; let fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  g ? goed++ : fout++;
  console.log(` ${g ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(84)}${g ? '' : ` verwacht ${JSON.stringify(wil)}, kreeg ${JSON.stringify(kreeg)}`}`);
};

const betalingen = new Map();
globalThis.fetch = async (url) => {
  const u = String(url);
  const m = /\/v2\/payments\/(tr_[A-Za-z0-9]+)/.exec(u);
  if (m && betalingen.has(m[1])) return new Response(JSON.stringify(betalingen.get(m[1])), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.includes('/subscriptions/')) return new Response(JSON.stringify({ resource: 'subscription', id: 'sub_F3termijn28', status: 'active' }), { status: 200, headers: { 'content-type': 'application/json' } });
  return new Response('{"id":"m"}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.join(' | '));
const bucket = { async put() { return {}; }, async get() { return null; }, async head() { return null; }, async delete() {} };
const env = {
  DB: d1(db), UPLOADS: bucket, MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'hello@visuails.com', PUBLIC_ORIGIN: 'https://visuails.com',
};
const { onRequestPost } = await import('../functions/api/webhook/mollie.js');
const webhook = (id) => onRequestPost({
  request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `id=${id}` }),
  env, waitUntil() {},
});

console.log('F3 · een vervolgtermijn hoort bij de termijn, ook als SEPA na de maandgrens betaalt');
{
  db.exec("INSERT INTO customers (id, email, brand, name, country) VALUES (1, 'hello+f3@visuails.com', 'Teststad Merk', 'Mara', 'NL')");
  db.exec(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, vat_treatment, vat_rate, vat_country, started_at, mollie_customer_id, mollie_subscription_id)
    VALUES (1, 1, 'SUB-F3AA-028', 'studio', 'monthly', 'active', 'nl_standard', 0.21, 'NL', '2026-10-28 10:00:00', 'cst_F3klant', 'sub_F3termijn28')`);
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = 1').get();
  const bruto = subMaandBruto(sub);
  const bedrag = { currency: 'EUR', value: (bruto / 100).toFixed(2) };
  const incasso = (id, createdAt, paidAt) => betalingen.set(id, {
    resource: 'payment', id, mode: 'test', status: 'paid', amount: bedrag, method: 'directdebit',
    sequenceType: 'recurring', subscriptionId: 'sub_F3termijn28', customerId: 'cst_F3klant',
    createdAt, paidAt, metadata: {},
  });
  /* De termijn van 28 november, door SEPA pas op 1 december als betaald gemeld;
     die van 28 december op de 29e. */
  incasso('tr_F3november', '2026-11-28T03:00:00+00:00', '2026-12-01T09:00:00+00:00');
  incasso('tr_F3december', '2026-12-28T03:00:00+00:00', '2026-12-29T09:00:00+00:00');
  await webhook('tr_F3november');
  await webhook('tr_F3december');
  const rijen = db.prepare('SELECT external_id, month FROM subscription_payments WHERE subscription_id = 1 ORDER BY month').all();
  ok('twee termijnen, twee betaalrijen', rijen.length, 2);
  ok('  de betaling van 1 december hoort bij de termijn van november', rijen.find((r) => r.external_id === 'tr_F3november')?.month, '2026-11');
  ok('  die van 29 december bij december', rijen.find((r) => r.external_id === 'tr_F3december')?.month, '2026-12');
  const maanden = db.prepare('SELECT month FROM subscription_months WHERE subscription_id = 1 ORDER BY month').all().map((r) => r.month);
  ok('  en beide maanden zijn toegekend (niets stil weggevallen)', maanden, ['2026-11', '2026-12']);
  ok('  op 15 december leest de rest van de code de termijn van november: die is er',
    maanden.includes(termijnMaand(sub, new Date('2026-12-15T12:00:00Z'))), true);
}

console.log('\nF4 · de factuur van een vooruitbetaald jaar noemt het jaar, niet één maand');
{
  const { snapshotFromSubscription } = await import('../src/lib/invoice.js');
  const { TERMS } = await import('../src/data/plans.js');
  const regel = (term, lang) => snapshotFromSubscription({
    sub: { plan: 'studio', term, vat_treatment: 'nl_standard', vat_rate: 0.21 },
    customer: { name: 'Mara', brand: 'Teststad Merk', billing_address: 'Teststraat 1\n1234 AB Teststad' },
    payment: { amount_cents: 955900 }, month: '2026-10', lang,
  }, { SELLER_ADDRESS: 'VISUAILS\nTeststraat 1\n1234 AB Teststad', VISUAILS_VAT: 'NL000000000B00', VISUAILS_KVK: '12345678' }, { number: 'VIS-2026-0001', date: '2026-10-28' }).lines[0].description;
  ok(`twaalf maanden vooruit (TERMS.prepaid.months = ${TERMS.prepaid.months}), NL`, regel('prepaid', 'nl'), 'Pro — abonnement, 12 maanden vooruit (oktober 2026 t/m september 2027)');
  ok('  EN', regel('prepaid', 'en'), 'Pro — subscription, 12 months in advance (October 2026 to September 2027)');
  ok('  een maandtermijn blijft één maand', regel('monthly', 'nl'), 'Pro — abonnement oktober 2026');
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
