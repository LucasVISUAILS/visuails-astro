/* VISUAILS — de betaalherinnering en het vrijgavebericht.  npm run test:herinnering
 *
 * Twee mails die de nachtelijke taak sinds 4 september 2026 stuurt en die tot
 * dan ontbraken (BACKEND-STUDIO-ADMIN-DOORLICHTING.md §3.1):
 *
 *   · remindUnpaid — een bestelling die drie dagen onbetaald staat krijgt één
 *     herinnering met een verse Mollie-link. Eén: gestempeld in
 *     payment_reminder_at (migratie 0042). Niet voor wat nog op de
 *     btw-beoordeling wacht (die heeft nog geen link), niet voor wat betaald is,
 *     niet voor een aanvraag zonder bedrag.
 *   · releaseExpiredWindows — de klant hoort het als zijn gereserveerde dagen
 *     na zeven dagen onbetaald weer vrijkomen. De bestelling blijft staan.
 *
 * Tegen het echte schema, met een nep-Mollie en een nep-Resend.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { tasks } from '../cron/index.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

const gezien = [];
let volg = 0;
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const body = opts.body ? String(opts.body) : '';
  gezien.push({ url: u, body });
  if (u.endsWith('/v2/payments')) {
    const id = `tr_${++volg}`;
    return new Response(JSON.stringify({ id, status: 'open', _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } }), { status: 201, headers: { 'content-type': 'application/json' } });
  }
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));
const betalingen = () => gezien.filter((g) => g.url.endsWith('/v2/payments'));

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.join(' | '));
const env = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };

db.exec("INSERT INTO customers (id, email, brand, name, country) VALUES (1, 'studio@voorbeeld-volt.nl', 'VOLT', 'Mara', 'NL')");
const order = (id, ref, extra = {}) => {
  const rij = {
    id, ref, customer_id: 1, service: 'catalog', status: 'received', tier: 'unattended', product_count: 3,
    email: 'studio@voorbeeld-volt.nl', lang: 'nl', name: 'Mara', brand: 'VOLT', total_cents: 26700, vat_cents: 5607, vat_rate: 0.21,
    payment_status: 'unpaid', created_at: "datetime('now', '-4 days')", review_state: null, reviewed_at: null,
    window_start: null, window_end: null, window_expires_at: null, ...extra,
  };
  const cols = Object.keys(rij);
  const vals = cols.map((c) => (typeof rij[c] === 'string' && /^datetime\(/.test(rij[c]) ? rij[c] : '?'));
  db.prepare(`INSERT INTO orders (${cols.join(', ')}) VALUES (${vals.join(', ')})`).run(...cols.filter((c) => !(typeof rij[c] === 'string' && /^datetime\(/.test(rij[c]))).map((c) => rij[c]));
};
order(1, 'VIS-HERIN-0001');                                                        // 4 dagen onbetaald → herinnering
order(2, 'VIS-VERS-0002', { created_at: "datetime('now', '-1 days')" });            // gisteren → nog niet
order(3, 'VIS-BETAALD-03', { payment_status: 'paid' });                             // betaald → niets
order(4, 'VIS-BEOORD-004', { review_state: 'pending' });                            // wacht op btw-controle → geen link
order(5, 'VIS-GOEDGE-005', { review_state: 'approved', reviewed_at: "datetime('now', '-4 days')", created_at: "datetime('now', '-9 days')" }); // goedgekeurd 4 dagen geleden → herinnering
order(6, 'VIS-AANVR-0006', { service: 'custom', total_cents: 0, vat_cents: 0 });    // aanvraag zonder bedrag → niets
order(7, 'VIS-VENSTER-07', { tier: 'attended', product_count: 12, window_start: '2026-09-20', window_end: '2026-09-21', window_expires_at: "datetime('now', '-1 hours')", created_at: "datetime('now', '-8 days')", payment_reminder_at: "datetime('now', '-4 days')" });

console.log('\nVISUAILS — betaalherinnering en vrijgavebericht\n');
console.log('1 · de herinnering');
{
  const regel = await tasks.remindUnpaid(env);
  ok('de taak meldt twee herinneringen', /2 betaalherinneringen/.test(regel || ''), true);
  ok('  voor precies de twee die eraan toe zijn', /VIS-HERIN-0001/.test(regel) && /VIS-GOEDGE-005/.test(regel) && !/VIS-VERS/.test(regel) && !/VIS-BEOORD/.test(regel) && !/VIS-BETAALD/.test(regel) && !/VIS-AANVR/.test(regel), true);
  ok('  er zijn twee Mollie-betalingen aangemaakt', betalingen().length, 2);
  const m = mails();
  ok('  en twee mails', m.length, 2);
  ok('  met "wacht nog op betaling" in het onderwerp', m.every((x) => /wacht nog op betaling/.test(x.subject)), true);
  ok('  en de betaallink erin', m.every((x) => /mollie\.com\/checkout/.test(x.html)), true);
  ok('  zonder "vervallen" of dreigende taal', m.every((x) => !/vervallen|verlopen/i.test(x.html)), true);
  ok('de stempel staat op beide', db.prepare('SELECT COUNT(*) AS n FROM orders WHERE payment_reminder_at IS NOT NULL AND id IN (1, 5)').get().n, 2);
  ok('  en niet op de anderen', db.prepare('SELECT COUNT(*) AS n FROM orders WHERE payment_reminder_at IS NOT NULL AND id IN (2, 3, 4, 6)').get().n, 0);
  ok('  de tijdlijn zegt het', /Betaalherinnering verstuurd/.test(db.prepare('SELECT note FROM order_events WHERE order_id = 1').get()?.note || ''), true);
  ok('  payment_status is niet aangeraakt', db.prepare('SELECT payment_status FROM orders WHERE id = 1').get().payment_status, 'unpaid');

  const tweede = await tasks.remindUnpaid(env);
  ok('de volgende nacht gebeurt er niets meer', tweede, null);
  ok('  en er gaat geen tweede mail uit', mails().length, 2);
}

console.log('\n2 · het vrijgavebericht');
{
  const voor = mails().length;
  const regel = await tasks.releaseExpiredWindows(env);
  ok('de reservering is vrijgegeven', /VIS-VENSTER-07/.test(regel || ''), true);
  ok('  en de dagen zijn van de bestelling af', db.prepare('SELECT window_start, window_expires_at FROM orders WHERE id = 7').get(), { window_start: null, window_expires_at: null });
  ok('  de bestelling staat nog', db.prepare('SELECT status FROM orders WHERE id = 7').get().status, 'received');
  const m = mails().slice(voor);
  ok('de klant krijgt één mail', m.length, 1);
  ok('  met de vrijgave in het onderwerp', /vrijgegeven/.test(m[0]?.subject || ''), true);
  ok('  en de dagen erin', /2026-09-20/.test(m[0]?.html || ''), true);
  ok('  en dat de bestelling blijft staan', /blijft gewoon staan/.test(m[0]?.html || ''), true);
  ok('  de taakregel telt de mail', /1 klant gemaild/.test(regel), true);
}

globalThis.fetch = echteFetch;
console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
