/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE STRIPE-WEBHOOK MAG EEN SCHRIJFFOUT NIET ALS "DUBBELE LEVERING" LEZEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 23 augustus 2026. Er stond een kale `catch` rond de idempotentie-INSERT die
 * ELKE fout opving, `return` gaf, en de handler antwoordde daarna 200 — waarmee
 * Stripe te horen kreeg dat het gelukt was en niet meer terugkwam. Eén hapering
 * van D1 en een betaalde bestelling werd permanent niet vastgelegd.
 *
 * Wat deze test bewaakt is de SCHEIDING, niet de tekst van een logregel:
 *
 *   dubbele levering  →  200, geen tweede rij, geen tweede gebeurtenis
 *   schrijffout       →  500, zodat Stripe opnieuw levert
 *   eerste levering   →  200, bestelling op betaald
 *
 * En één ding erboven: dat de idempotentie ECHT op de database staat en niet op
 * een vlag in de code — UNIQUE(provider, external_id), met provider='stripe'.
 * Dat is de aanname waar de hele catch op rust, dus die wordt hier gemeten en
 * niet geloofd.
 *
 * De handtekening wordt echt berekend met WebCrypto, met dezelfde HMAC als
 * verifyStripeSignature() verwacht. Een test die de verificatie omzeilt, toetst
 * een handler die in productie nooit zo wordt aangeroepen.
 */
import { DatabaseSync } from 'node:sqlite';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { onRequestPost } from '../functions/api/webhook/stripe.js';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true, extra = '') {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) geslaagd++; else gezakt++;
  console.log(`${goed ? ' ok ' : 'FAIL'}   ${naam.padEnd(58)} ${goed ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`} ${extra}`);
}

const SECRET = 'whsec_testtesttesttesttesttesttest';

/** Een echt ondertekend verzoek, zoals Stripe het aflevert. */
async function tekenen(body) {
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
  const v1 = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return new Request('https://visuails.com/api/webhook/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${t},v1=${v1}`, 'content-type': 'application/json' },
    body,
  });
}

const sessie = (id, ref) => ({
  id, client_reference_id: ref, payment_status: 'paid',
  amount_total: 100, currency: 'eur',
});
const gebeurtenis = (s) => JSON.stringify({ type: 'checkout.session.completed', data: { object: s } });

function db_met_bestelling() {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema.sql laadt niet:\n' + mislukt.join('\n'));
  /* Verzonnen gegevens, nooit een bestaand adres — zelfde afspraak als in de
     andere tests en in FigDash. */
  db.exec(`INSERT INTO orders (id, ref, service, status, email, payment_status, lang)
           VALUES (1, 'VIS-2608-0001', 'test-sample', 'received', 'klant@voorbeeld.nl', 'unpaid', 'nl')`);
  return db;
}

/* ══ 1 · DE CONSTRAINT WAAR DE HELE CATCH OP RUST ═══════════════════════════ */
console.log('\nde idempotentie staat op de database, en geldt ook voor stripe');
{
  const db = db_met_bestelling();

  const index = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_payments_external'"
  ).get();
  ok('idx_payments_external bestaat', !!index?.sql);
  ok('en hij is UNIEK', /unique/i.test(index?.sql || ''));
  ok('op (provider, external_id)', /\(\s*provider\s*,\s*external_id\s*\)/i.test(index?.sql || ''));

  const insert = (provider, ext) => db.prepare(
    `INSERT INTO payments (order_id, provider, external_id, status, amount_cents, currency)
     VALUES (1, ?, ?, 'paid', 100, 'EUR')`
  ).run(provider, ext);

  insert('stripe', 'cs_test_A');
  let fout = null;
  try { insert('stripe', 'cs_test_A'); } catch (e) { fout = String(e.message || e); }
  ok('een tweede stripe-rij met hetzelfde id wordt geweigerd', fout !== null);
  /* Dit is de match die de handler gebruikt. Wijzigt SQLite of D1 ooit zijn
     bewoording, dan valt deze regel om vóór de productie het merkt. */
  ok('en de fouttekst bevat "unique" en "constraint"',
    /unique/i.test(fout || '') && /constraint/i.test(fout || ''), true, fout || '');

  /* En de constraint is niet per ongeluk mollie-specifiek: hetzelfde externe id
     onder een andere provider hoort gewoon te mogen. */
  let mollieOk = true;
  try { insert('mollie', 'cs_test_A'); } catch { mollieOk = false; }
  ok('hetzelfde id onder een andere provider mag wel', mollieOk);
  db.close();
}

/* ══ 2 · DE EERSTE LEVERING ════════════════════════════════════════════════ */
console.log('\neen eerste levering wordt gewoon vastgelegd');
{
  const db = db_met_bestelling();
  const env = { DB: d1(db), STRIPE_WEBHOOK_SECRET: SECRET };
  const res = await onRequestPost({ request: await tekenen(gebeurtenis(sessie('cs_1', 'VIS-2608-0001'))), env });

  ok('antwoordt 200', res.status, 200);
  ok('de bestelling staat op betaald',
    db.prepare('SELECT payment_status FROM orders WHERE id = 1').get().payment_status, 'paid');
  ok('er staat één betaalregel', db.prepare("SELECT COUNT(*) c FROM payments WHERE provider='stripe'").get().c, 1);
  ok('en één gebeurtenis', db.prepare('SELECT COUNT(*) c FROM order_events').get().c, 1);
  db.close();
}

/* ══ 3 · DE DUBBELE LEVERING ═══════════════════════════════════════════════ */
console.log('\neen tweede levering van hetzelfde event loopt stil af');
{
  const db = db_met_bestelling();
  const env = { DB: d1(db), STRIPE_WEBHOOK_SECRET: SECRET };
  const body = gebeurtenis(sessie('cs_2', 'VIS-2608-0001'));

  const eerste = await onRequestPost({ request: await tekenen(body), env });
  const tweede = await onRequestPost({ request: await tekenen(body), env });

  ok('de eerste antwoordt 200', eerste.status, 200);
  ok('de tweede óók 200 — dit is geen fout', tweede.status, 200);
  ok('er staat nog steeds één betaalregel',
    db.prepare("SELECT COUNT(*) c FROM payments WHERE provider='stripe'").get().c, 1);
  ok('en nog steeds één gebeurtenis', db.prepare('SELECT COUNT(*) c FROM order_events').get().c, 1);
  db.close();
}

/* ══ 4 · DE SCHRIJFFOUT — WAAR HET OM BEGONNEN IS ══════════════════════════ */
console.log('\neen echte schrijffout levert 500 op, zodat stripe terugkomt');
{
  const db = db_met_bestelling();
  const echt = d1(db);
  /* Een D1 die op de INSERT INTO payments struikelt met iets anders dan een
     unique-overtreding. Dat is precies het geval dat vóór deze reparatie als
     "dubbele levering" werd gelezen en met 200 werd afgedaan. */
  const env = {
    STRIPE_WEBHOOK_SECRET: SECRET,
    DB: {
      prepare(sql) {
        if (/INSERT INTO payments/i.test(sql)) {
          return { bind: () => ({ run: async () => { throw new Error('D1_ERROR: no such column: raw_payload'); } }) };
        }
        return echt.prepare(sql);
      },
      batch: echt.batch,
    },
  };

  const res = await onRequestPost({ request: await tekenen(gebeurtenis(sessie('cs_3', 'VIS-2608-0001'))), env });

  ok('antwoordt 500 en niet 200', res.status, 500);
  ok('de bestelling blijft onbetaald staan',
    db.prepare('SELECT payment_status FROM orders WHERE id = 1').get().payment_status, 'unpaid');
  ok('er is geen gebeurtenis geschreven', db.prepare('SELECT COUNT(*) c FROM order_events').get().c, 0);
  db.close();
}

/* ══ 5 · EN DE POORT ERVOOR BLIJFT DICHT ═══════════════════════════════════ */
console.log('\nde handtekening blijft de eerste poort');
{
  const db = db_met_bestelling();
  const env = { DB: d1(db), STRIPE_WEBHOOK_SECRET: SECRET };
  const body = gebeurtenis(sessie('cs_4', 'VIS-2608-0001'));
  const req = new Request('https://visuails.com/api/webhook/stripe', {
    method: 'POST', headers: { 'stripe-signature': 't=1,v1=deadbeef' }, body,
  });
  const res = await onRequestPost({ request: req, env });
  ok('een verkeerde handtekening geeft 400', res.status, 400);
  ok('en er is niets geschreven', db.prepare('SELECT COUNT(*) c FROM payments').get().c, 0);
  db.close();
}

/* ══ 6 · DE VORM VAN DE CATCH ══════════════════════════════════════════════ */
console.log('\nde catch onderscheidt, en safe() is weg');
{
  const bron = await (await import('node:fs/promises')).readFile(
    new URL('../functions/api/webhook/stripe.js', import.meta.url), 'utf8'
  );
  const code = bron.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  ok('de catch toetst op unique én constraint',
    /\/unique\/i\.test\([\s\S]{0,40}\)\s*&&\s*\/constraint\/i\.test\(/.test(code), true);
  ok('en gooit door als het dat niet is', /if \(!duplicate\)[\s\S]{0,200}throw e;/.test(code), true);
  ok('safe() bestaat niet meer', /function safe\(/.test(code), false);
  ok('en de handler antwoordt 500 op een schrijffout',
    /new Response\('write failed', \{ status: 500 \}\)/.test(code), true);
}

console.log(`\n${geslaagd}/${geslaagd + gezakt} geslaagd`);
if (gezakt) process.exitCode = 1;
