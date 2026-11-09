/* ═══════════════════════════════════════════════════════════════════════════════
 * DE BETAALMIDDELEN BIJ 0% BTW BESTAAN BIJ MOLLIE — 9 november 2026 (ronde 91, B02)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node tests/blind91-b-mollie-methodes.test.mjs
 *
 * Bij een bestelling op 0% (verlegd binnen de EU, of buiten de EU) zet
 * createOrderMolliePayment() een witte lijst in `method`, zonder iDEAL. Daarin
 * stonden `giropay` en `sofort`. Mollie heeft die allebei uitgefaseerd (Giropay in
 * 2024, SOFORT per 30 september 2024) en ze staan niet meer in de waarden van
 * `method` bij Create Payment (docs.mollie.com/reference/create-payment, gelezen
 * 9 november 2026). Elke waarde die we sturen moet in die lijst staan.
 */
let goed = 0, fout = 0;
function ok(naam, waarde, verwacht = true) {
  const ja = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ja) goed++; else fout++;
  console.log(`${ja ? '  ok  ' : '  FAIL'} ${naam}${ja ? '' : `    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

/* De waarden die Mollie's Create Payment nu kent (9 november 2026). */
const MOLLIE_METHODES = new Set(['alma', 'applepay', 'bacs', 'bancomatpay', 'bancontact', 'banktransfer', 'belfius', 'billie',
  'billink', 'bizum', 'blik', 'creditcard', 'directdebit', 'eps', 'giftcard', 'ideal', 'in3', 'kbc', 'klarna', 'mbway',
  'mobilepay', 'multibanco', 'mybank', 'paybybank', 'paypal', 'paysafecard', 'pointofsale', 'przelewy24', 'riverty',
  'satispay', 'swish', 'trustly', 'twint', 'vipps', 'voucher', 'wero']);

const gevraagd = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  gevraagd.push(JSON.parse(String(opts.body || '{}')));
  return new Response(JSON.stringify({ id: 'tr_test', _links: { checkout: { href: 'https://pay.mollie.test' } } }), { status: 201, headers: { 'content-type': 'application/json' } });
};
try {
  const m = await import('../src/lib/mollie.js');
  const env = { MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123' };
  const basis = { ref: 'VIS-TEST-1', lang: 'nl', successUrl: 'https://visuails.com/thank-you', webhookUrl: 'https://visuails.com/api/webhook/mollie', valueEuros: '325.00', grossCents: 32500, description: 'test' };

  console.log('\nVISUAILS — betaalmiddelen bij 0% btw\n');
  await m.createOrderMolliePayment(env, { ...basis, excludeIdeal: true });
  const lijst = gevraagd.at(-1).method || [];
  ok('bij 0% staat er een witte lijst', Array.isArray(lijst) && lijst.length > 0, true);
  ok('zonder iDEAL', lijst.includes('ideal'), false);
  ok('zonder giropay (uitgefaseerd)', lijst.includes('giropay'), false);
  ok('zonder sofort (uitgefaseerd)', lijst.includes('sofort'), false);
  ok('elke waarde bestaat bij Mollie', lijst.filter((x) => !MOLLIE_METHODES.has(x)), []);
  ok('kaart en overboeking blijven', lijst.includes('creditcard') && lijst.includes('banktransfer'), true);

  await m.createOrderMolliePayment(env, { ...basis, excludeIdeal: false });
  ok('bij 21% geen witte lijst (alles wat aan staat)', 'method' in gevraagd.at(-1), false);

  for (const [naam, lijst2] of [['SAMPLE_METHODS', m.SAMPLE_METHODS], ['SAMPLE_METHODS_ZONDER_IDEAL', m.SAMPLE_METHODS_ZONDER_IDEAL], ['BIJKOOP_METHODS', m.BIJKOOP_METHODS], ['BIJKOOP_METHODS_ZONDER_IDEAL', m.BIJKOOP_METHODS_ZONDER_IDEAL]]) {
    ok(`${naam}: elke waarde bestaat bij Mollie`, (lijst2 || []).filter((x) => !MOLLIE_METHODES.has(x)), []);
  }
} finally {
  globalThis.fetch = echteFetch;
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
