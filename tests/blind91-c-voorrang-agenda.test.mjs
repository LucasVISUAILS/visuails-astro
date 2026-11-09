/*
 * GEEN VOORRANG ALS DE AGENDA DICHT STAAT — 9 november 2026 (ronde 91, C06)
 *
 * VOORRANG (src/data/pricing.js) zegt dat voorrang "niet wordt aangeboden als de
 * agenda vol zit", maar niets keek naar de agenda: tijdens een dichtgezette week
 * kon een klant voorrang kopen die de studio niet kon waarmaken, en dan gaat de
 * toeslag terug. Lucas (optie a): niet aanbieden als een van de twee werkdagen van
 * de belofte dicht staat. Deze toets houdt vast:
 *   1 · voorrangWerkdagen() geeft dezelfde leverdag als voorrangDeadline();
 *   2 · voorrangAgendaOpen() kijkt naar precies die twee dagen;
 *   3 · quoteOrder() rekent geen voorrang met agendaDicht;
 *   4 · /api/order: met een dichte werkdag geen voorrang en geen toeslag, zonder wel.
 * Echte SQLite, nep-Mollie, de echte /api/order. Adressen verzonnen.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { voorrangWerkdagen, voorrangDeadline, voorrangAgendaOpen } from '../src/data/pricing.js';
import { quoteOrder } from '../src/lib/quote.js';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};

console.log('\nVISUAILS — geen voorrang als de agenda dicht staat (ronde 91, C06)\n');

console.log('1 · de twee werkdagen');
{
  const gevallen = [
    ['2026-11-09 09:00:00', '2026-11-09', '2026-11-10'],   // ma 10:00 NL
    ['2026-11-09 14:00:00', '2026-11-10', '2026-11-11'],   // ma 15:00 NL
    ['2026-11-13 14:00:00', '2026-11-16', '2026-11-17'],   // vr 15:00 NL
    ['2026-11-14 10:00:00', '2026-11-16', '2026-11-17'],   // za
    ['2026-12-24 14:00:00', '2026-12-28', '2026-12-29'],   // kerst ertussen
    ['2027-04-26 13:00:00', '2027-04-28', '2027-04-29'],   // Koningsdag di 27 april
  ];
  for (const [paid, start, klaar] of gevallen) {
    ok(`${paid} UTC → start ${start}, klaar ${klaar}, en voorrangDeadline() zegt dezelfde dag`, [voorrangWerkdagen(paid), voorrangDeadline(paid)], [{ start, klaar }, { datum: klaar, uur: 17 }]);
  }
}

console.log('2 · voorrangAgendaOpen()');
{
  const ma = '2026-11-09 09:00:00';
  ok('niets dicht: open', voorrangAgendaOpen([], ma), true);
  ok('de leverdag (di 10) dicht: niet open', voorrangAgendaOpen(['2026-11-10'], ma), false);
  ok('vandaag (ma 9) dicht: niet open', voorrangAgendaOpen(new Set(['2026-11-09']), ma), false);
  ok('woensdag dicht: open (valt buiten de belofte)', voorrangAgendaOpen(['2026-11-11'], ma), true);
  ok('vrijdag na 15:00, de maandag dicht: niet open', voorrangAgendaOpen(['2026-11-16'], '2026-11-13 14:00:00'), false);
}

console.log('3 · quoteOrder()');
{
  const met = quoteOrder({ service: 'catalog', products: 5, voorrang: true, vatRate: 0.21 });
  const dicht = quoteOrder({ service: 'catalog', products: 5, voorrang: true, agendaDicht: true, vatRate: 0.21 });
  const zonder = quoteOrder({ service: 'catalog', products: 5, voorrang: false, vatRate: 0.21 });
  ok('open: voorrang met toeslag', [met.voorrang, met.voorrangCents > 0], [true, true]);
  ok('dicht: geen voorrang, geen toeslag, zelfde bedrag als zonder', [dicht.voorrang, dicht.voorrangCents, dicht.grossCents === zonder.grossCents], [false, 0, true]);
}

console.log('4 · /api/order');
{
  const betalingen = new Map(); let volg = 0;
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
    if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') {
      const p = JSON.parse(String(opts.body)); const id = `tr_${String(++volg).padStart(10, '0')}`;
      const rec = { id, mode: 'test', status: 'open', amount: p.amount, metadata: p.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
      betalingen.set(id, rec); return json(rec, 201);
    }
    return json({ id: 'msg_test' });
  };
  const EchteDate = Date;
  const vast = EchteDate.parse('2026-11-09T09:00:00Z');   /* maandag 10:00 NL */
  globalThis.Date = class extends EchteDate { constructor(...a) { super(...(a.length ? a : [vast])); } static now() { return vast; } };
  const { onRequestPost } = await import('../functions/api/order.js');
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const env = { MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@voorbeeld.test>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db),
    UPLOADS: { async put() {}, async get() { return null; }, async delete() {}, async head() { return null; } } };
  let ip = 1;
  const bestel = async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ service: 'catalog', products: '5', name: 'Test Klant', brand: 'TESTMERK', email: `v${ip}@voorbeeld.test`, phone: '+31 6 12345678', country: 'NL', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes', business_version: 'v1', no_vat: '1', reg_number: '12345678', voorrang: '1' })) fd.append(k, v);
    const l = console.log, e = console.error, w = console.warn; console.log = console.error = console.warn = () => {};
    try { await onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.7.0.${ip++}` } }), env, waitUntil: () => {} }); } finally { console.log = l; console.error = e; console.warn = w; }
    return db.prepare('SELECT details_json, total_cents FROM orders ORDER BY id DESC LIMIT 1').get();
  };
  const open = await bestel();
  ok('agenda open: de bestelling heeft voorrang', /"voorrang":"1"/.test(open.details_json || ''), true);
  db.prepare("INSERT INTO blackout_days (day, reason) VALUES ('2026-11-10', 'vakantie')").run();
  const dicht = await bestel();
  ok('dinsdag dicht: geen voorrang in de bestelling', /"voorrang"/.test(dicht.details_json || ''), false);
  ok('… en geen toeslag: het bedrag is lager', Number(dicht.total_cents) < Number(open.total_cents), true);
  db.prepare("DELETE FROM blackout_days").run();
  db.prepare("INSERT INTO blackout_days (day, reason) VALUES ('2026-11-11', 'shoot')").run();
  const woensdag = await bestel();
  ok('alleen woensdag dicht: weer voorrang, zelfde bedrag als open', [/"voorrang":"1"/.test(woensdag.details_json || ''), woensdag.total_cents], [true, open.total_cents]);
  globalThis.Date = EchteDate;
  globalThis.fetch = echteFetch;
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
