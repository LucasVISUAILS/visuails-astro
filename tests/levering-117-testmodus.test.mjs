/*
 * LEVERING 117 · P5-08 — ELKE NIEUWE BESTELLING KRIJGT DE PROEFSTAND, NIET ALLEEN DIE UIT /api/order
 * 17 november 2026
 *
 *   node tests/levering-117-testmodus.test.mjs        (geen build nodig)
 *
 * Een bestelling uit een op-maatofferte en een restant (-R…) uit /admin kregen geen testmodus. Een
 * testbetaling gaf dan factuur VIS-2026-0001, de eerste van de echte reeks. Nu staat de regel in
 * één functie (markeerProefbestelling in src/lib/betaallink.js) en deze toets:
 *   1 · zoekt elke plek in de code die een bestelling INSERT en eist dat die de functie aanroept;
 *   2 · speelt de op-maatofferte na met een test_-sleutel: testmodus = 1 en een PROEF-factuur;
 *   3 · speelt een restant na op een proef-aanbetaling, met een live-sleutel: ook een proef;
 *   4 · en met een live-sleutel zonder proef-ouder blijft alles echt.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { nieuweAanvraag, bewaarConcept, verstuur, bewaarMerk } from '../src/lib/opMaat.js';
import { voegVoorbeeldToe, voorbeeldSleutel, zetVoorbeeldKlaar, reactieOpRonde, leesRegels } from '../src/lib/opMaatRondes.js';
import { stuurOfferte, akkoordEnBetaallink } from '../src/lib/opMaatOfferte.js';
import { issueInvoice } from '../src/lib/invoice.js';
import { markeerProefbestelling } from '../src/lib/betaallink.js';
import { adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117 P5-08: proefstand op elke nieuwe bestelling\n');

console.log('1 · elke plek die een bestelling maakt, roept markeerProefbestelling aan');
{
  const root = fileURLToPath(new URL('../', import.meta.url));
  const bestanden = [];
  const loop = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) loop(p);
      else if (/\.(js|mjs)$/.test(n)) bestanden.push(p);
    }
  };
  for (const d of ['src/lib', 'functions', 'cron']) loop(join(root, d));
  const zonderCommentaar = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const makers = bestanden.filter((p) => /INSERT\s+INTO\s+orders\s*\(/i.test(zonderCommentaar(readFileSync(p, 'utf8'))));
  ok('er zijn plekken gevonden (order.js, opMaatOfferte.js, admin.js)', makers.length >= 3, makers.map((p) => p.slice(root.length)).join(', '));
  for (const p of makers) {
    ok(`  ${p.slice(root.length)} zet de proefstand`, /markeerProefbestelling\(/.test(zonderCommentaar(readFileSync(p, 'utf8'))));
  }
}

const echteFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.endsWith('/v2/payments')) return new Response(JSON.stringify({ id: 'tr_1', status: 'open', _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_1' } } }), { status: 201, headers: { 'content-type': 'application/json' } });
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
db.exec("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'proef@voorbeeldmerk.test', 'Testa Proef', 'Proefmerk', 'NL')");
const bak = { async put() {}, async get() { return null; }, async head() { return null; }, async delete() {}, async list() { return { objects: [] }; } };
const basis = { RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', UPLOADS: bak };
const envTest = { DB: d1(db), ...basis, MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123' };
const envLive = { DB: d1(db), ...basis, MOLLIE_API_KEY: 'live_abcdefghijklmnopqrstuvwxyz0123' };
const origin = 'https://visuails.com';

async function offerteBestelling(env) {
  await bewaarMerk(env, 1, { naam: 'Proefmerk' });
  const a = await nieuweAanvraag(env, 1, 'catalog', 'nl');
  await bewaarConcept(env, 1, a.id, { soorten: [{ soort: 'jas', voorkant: { legwijze: 'hanger' } }], toelichting: { 'c-pose': 'aan een hanger' }, praktisch: { contact: 'mail' } }, 1);
  await verstuur(env, 1, a.id);
  await voegVoorbeeldToe(env, a.id, { r2Key: voorbeeldSleutel(1, a.id, 1, 'v.jpg') });
  await zetVoorbeeldKlaar(env, a.id);
  await reactieOpRonde(env, 1, a.id, { goed: true });
  await stuurOfferte(env, a.id, { regels: leesRegels('Basis;270\nWereld;570'), email: 'proef@voorbeeldmerk.test', land: 'NL' }, { origin });
  const ak = await akkoordEnBetaallink(env, 1, a.id, { zakelijk: true, origin });
  return ak.ok ? db.prepare('SELECT * FROM orders WHERE ref = ?').get(ak.ref) : null;
}

console.log('\n2 · op-maatofferte met een test_-sleutel');
const proefOrder = await offerteBestelling(envTest);
ok('de bestelling is er', !!proefOrder);
ok('testmodus = 1', Number(proefOrder?.testmodus) === 1, String(proefOrder?.testmodus));
if (proefOrder) {
  db.prepare("UPDATE orders SET payment_status = 'paid', paid_at = datetime('now') WHERE id = ?").run(proefOrder.id);
  db.prepare("INSERT INTO payments (order_id, provider, external_id, status, amount_cents) VALUES (?, 'mollie', 'tr_proef1', 'paid', ?)")
    .run(proefOrder.id, Number(proefOrder.total_cents) + Number(proefOrder.vat_cents));
  let nummer = '';
  try { nummer = (await issueInvoice(envTest, proefOrder.id))?.number || ''; } catch (e) { nummer = `fout: ${e.message}`; }
  if (!nummer) nummer = db.prepare('SELECT number FROM invoices WHERE order_id = ?').get(proefOrder.id)?.number || '';
  ok('de factuur komt uit de PROEF-reeks, niet VIS-…', /^PROEF-/.test(nummer), nummer);
  ok('de echte reeks heeft geen nummer gekregen', !db.prepare("SELECT 1 FROM invoices WHERE number LIKE 'VIS-%'").get());
}

console.log('\n3 · restant op een proef-aanbetaling, terwijl de live-sleutel er al in staat');
{
  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
  const token = await mintToken();
  db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
  const restant = async (env, id) => {
    const fd = new FormData();
    fd.set('amount', '420');
    return adminPost({ request: new Request(`https://visuails.com/admin/orders/${id}/restant`, { method: 'POST', body: fd, headers: { cookie: `vis_admin=${token}`, origin } }), env, waitUntil() {} });
  };
  const r = await restant(envLive, proefOrder.id);
  const rij = db.prepare('SELECT * FROM orders WHERE ref = ?').get(`${proefOrder.ref}-R1`);
  ok('het restant is aangemaakt', r.status === 303 && !!rij, String(r.status));
  ok('en is ook een proef (testmodus = 1)', Number(rij?.testmodus) === 1, String(rij?.testmodus));

  console.log('\n4 · met een live-sleutel en een echte aanbetaling blijft alles echt');
  db.prepare('UPDATE orders SET testmodus = 0 WHERE id = ?').run(proefOrder.id);
  const r2 = await restant(envLive, proefOrder.id);
  const rij2 = db.prepare('SELECT * FROM orders WHERE ref = ?').get(`${proefOrder.ref}-R2`);
  ok('het tweede restant is aangemaakt', r2.status === 303 && !!rij2, String(r2.status));
  ok('en is echt (testmodus = 0)', Number(rij2?.testmodus) === 0, String(rij2?.testmodus));
  ok('markeerProefbestelling met live-sleutel en zonder ouder doet niets', (await markeerProefbestelling(envLive, rij2.id)) === false && Number(db.prepare('SELECT testmodus FROM orders WHERE id = ?').get(rij2.id).testmodus) === 0);
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
