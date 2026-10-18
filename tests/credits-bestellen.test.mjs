/*
 * BESTELLEN MET CREDITS, VAN FORMULIER TOT CREDITBOEK — ronde B, 8 oktober 2026
 *
 * §28.2: een ingelogde abonnee bestelt via het gewone formulier (/account/order)
 * en betaalt met credits. De echte route functions/api/order.js, tegen het echte
 * schema.sql; alleen Mollie en Resend zijn nagebootst.
 *
 * Wat hier vast moet staan:
 *   · genoeg credits → 'credits', paid_at meteen, credits_used, geen Mollie,
 *     geen factuur, bedankpagina met paid=, de mails zeggen "credits" en geen bedrag;
 *   · te weinig → gewoon via Mollie, niets afgeboekt (nooit mengen);
 *   · voorrang → de hele bestelling via Mollie (6.06, V46 = a); een complete look
 *     kan met credits, 4 per look (levering 60, v38-credits a);
 *   · tegoed én credits → credits eerst, het tegoed blijft staan (V40 = a);
 *   · niet ingelogd → nooit credits, ook niet met hetzelfde adres;
 *   · twee bestellingen tegelijk → samen nooit meer dan het saldo;
 *   · de server rekent zelf: een gesleuteld formulier verandert niets.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { onRequestPost as orderPost } from '../functions/api/order.js';
import { BUSINESS_VERSION } from '../src/data/business.js';
import { SERVICE_CREDITS, PLAN_CREDITS } from '../src/data/pricing.js';
import { boekBij, creditsBeschikbaar, creditboek, CREDIT_REDEN } from '../src/lib/creditboek.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(74)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

let mollie = 0;
const gezien = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  gezien.push({ url: u, body: opts.body ? String(opts.body) : '' });
  if (u.includes('mollie')) {
    mollie += 1;
    return new Response(JSON.stringify({ id: `tr_${mollie}`, _links: { checkout: { href: `https://pay.mollie.test/tr_${mollie}` } } }),
      { status: 201, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ id: 'em_1' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));
const tekst = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/\s+/g, ' ');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema laadt', mislukt, []);
/* D1 voert batches na elkaar uit; zie de noot in tests/creditboek.test.mjs. */
const echt = d1(db);
let rij = Promise.resolve();
const DB = { prepare: echt.prepare, batch(l) { const p = rij.then(() => echt.batch(l)); rij = p.catch(() => {}); return p; } };
const env = {
  DB, MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123',
  RESEND_API_KEY: 're_x', NOTIFY_EMAIL: 'studio@visuails.test', FROM_EMAIL: 'x@y.z',
};

const KLANT = 'inkoop@proefmerk.test';
db.prepare(`INSERT INTO customers (id, email, name, brand, country) VALUES (1, ?, 'Testa Proef', 'Proefmerk', 'NL')`).run(KLANT);
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at)
            VALUES (5, 1, 'SUB-PROEF', 'studio', 'monthly', 'active', '2026-09-20 10:00:00')`).run();
const nu = new Date();
const vandaag = nu.toISOString().slice(0, 10);
await boekBij(env, { customerId: 1, subscriptionId: 5, aantal: PLAN_CREDITS.studio, reden: CREDIT_REDEN.termijn, sleutel: 'termijn:5:x', maand: vandaag.slice(0, 7) });

let teller = 0;
async function bestel(velden = {}, { ingelogd = true } = {}) {
  teller += 1;
  const fd = new FormData();
  const alles = {
    service: 'catalog', products: '12', lang: 'nl', mode: 'json', redirect: '/nl/thank-you',
    first_name: 'Testa', last_name: 'Proef', name: 'Testa Proef', brand: 'Proefmerk',
    email: KLANT, phone: '+31 6 00000000',
    address_line1: 'Verzonnenstraat 1', postal_code: '1000 AA', city: 'Nergenshuizen', country: 'NL',
    vat: 'NL000099998B57', reg_number: '00000000',
    business_declaration: 'yes', business_version: BUSINESS_VERSION,
    ...velden,
  };
  for (const [k, v] of Object.entries(alles)) if (v !== null) fd.append(k, v);
  const request = new Request(`https://visuails.com/${ingelogd ? 'account/order' : 'api/order'}`, {
    method: 'POST', body: fd, headers: { Origin: 'https://visuails.com', 'CF-Connecting-IP': `203.0.113.${teller}` },
  });
  const voorMollie = mollie;
  const voorMails = mails().length;
  const res = await orderPost({
    request, env, waitUntil: () => {},
    sessieKlant: ingelogd ? { customer_id: 1, email: KLANT } : null,
  });
  const body = await res.json().catch(() => ({}));
  const o = db.prepare('SELECT * FROM orders WHERE ref = ?').get(body.ref || '');
  return { body, o, details: o ? JSON.parse(o.details_json || '{}') : {}, mollie: mollie > voorMollie, nieuweMails: mails().slice(voorMails) };
}

console.log('\n1 · genoeg credits: betaald met credits');
{
  const r = await bestel();
  const kost = 12 * SERVICE_CREDITS.catalog;
  ok('de bestelling bestaat', !!r.o, true);
  ok('payment_status credits', r.o && r.o.payment_status, 'credits');
  ok('paid_at meteen', !!(r.o && r.o.paid_at), true);
  ok('credits_used = 48', r.o && r.o.credits_used, kost);
  ok('geen bedrag op de bestelling (termijnfactuur is de factuur)', r.o && [r.o.total_cents, r.o.vat_cents], [0, 0]);
  ok('geen Mollie', r.mollie, false);
  ok('geen factuur', db.prepare('SELECT COUNT(*) AS n FROM invoices WHERE order_id = ?').get(r.o.id).n, 0);
  ok('bedankpagina met paid=', /[?&]paid=/.test(r.body.redirect || ''), true);
  ok('saldo 120 → 72', await creditsBeschikbaar(env, 1), PLAN_CREDITS.studio - kost);
  const boek = await creditboek(env, { customerId: 1 });
  ok('het creditboek heeft de regel met het kenmerk', boek.at(-1) && [boek.at(-1).aantal, boek.at(-1).reden, boek.at(-1).orderRef], [-kost, 'bestelling', r.o.ref]);
  const klant = r.nieuweMails.find((m) => m.to === KLANT || (Array.isArray(m.to) && m.to.includes(KLANT)));
  ok('de klant krijgt een bevestiging', !!klant, true);
  ok('  "Betaald met 48 credits. Je hebt er nog 72."', tekst(klant && klant.html).includes(`Betaald met ${kost} credits. Je hebt er nog ${PLAN_CREDITS.studio - kost}.`), true);
  ok('  zonder eurobedrag', /€/.test(tekst(klant && klant.html)), false);
  ok('  zonder betaalknop', /Betaal je bestelling/.test(klant && klant.html), false);
  ok('  "geen aparte factuur"', tekst(klant && klant.html).includes('Er komt geen aparte factuur'), true);
  const studio = r.nieuweMails.find((m) => m.to === 'studio@visuails.test' || (Array.isArray(m.to) && m.to.includes('studio@visuails.test')));
  ok('de studiomail zegt BETAALD MET CREDITS', /BETAALD MET CREDITS/.test(studio && studio.html), true);
  ok('tijdlijn: "Betaald met 48 credits van je abonnement"',
    db.prepare("SELECT note FROM order_events WHERE order_id = ? AND note LIKE 'Betaald met%'").get(r.o.id)?.note, `Betaald met ${kost} credits van je abonnement`);
}

console.log('\n2 · te weinig credits: gewoon via Mollie, niets afgeboekt');
{
  const voor = await creditsBeschikbaar(env, 1);
  /* 20 catalogsets = 80 credits, en er staan er 72. */
  const r = await bestel({ products: '20' });
  ok('onbetaald', r.o && r.o.payment_status, 'unpaid');
  ok('met een Mollie-betaling', r.mollie, true);
  ok('saldo onveranderd', await creditsBeschikbaar(env, 1), voor);
  ok('in details staat waarom niet', /te weinig/.test(r.details.credits_niet || ''), true);
}

console.log('\n3 · voorrang: de hele bestelling via Mollie (6.06, V46 = a); een complete look kan met credits');
{
  const voor = await creditsBeschikbaar(env, 1);
  const a = await bestel({ products: '2', voorrang: '1' });
  ok('voorrang → onbetaald, via Mollie', [a.o && a.o.payment_status, a.mollie], ['unpaid', true]);
  ok('  saldo onveranderd', await creditsBeschikbaar(env, 1), voor);
  /* Levering 60 (afvinklijst 38): een oud formulier met `outfit_count` betaalt daar
     niets meer voor; het veld gaat niet in het dossier. */
  const b = await bestel({ service: 'lifestyle', products: '2', outfit_count: '1' });
  ok('een oude outfit_count: gewoon met credits, zonder toeslag', [b.o && b.o.payment_status, b.o && b.o.credits_used], ['credits', 2 * 5]);
  ok('  en outfit_count staat niet in het dossier', b.details.outfit_count === undefined, true);
  /* v38-credits a: een complete look kost 4 credits. */
  const c = await bestel({ service: 'lifestyle', products: '2', garment_p1: 'top', garment_p2: 'trousers', look_p1: 'A', look_p2: 'A', context_bottom_p1: 'look', context_top_p2: 'look' });
  ok('een complete look → met credits, 2 × 5 + 4', [c.o && c.o.payment_status, c.o && c.o.credits_used, c.mollie], ['credits', 14, false]);
  ok('  de look staat in het dossier', [c.details.look_p1, c.details.look_p2, c.details.context_bottom_p1], ['A', 'A', 'look']);
  ok('  saldo 24 lager', await creditsBeschikbaar(env, 1), voor - 24);
}

console.log('\n4 · tegoed én credits: credits eerst, het tegoed blijft (V40 = a)');
{
  db.prepare("INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (1, 5000, 'proef')").run();
  const r = await bestel({ products: '2' });
  ok('betaald met credits', r.o && r.o.payment_status, 'credits');
  ok('  er is geen tegoed verrekend', r.details.tegoed_cents === undefined, true);
  ok('  het tegoed staat er nog', db.prepare('SELECT SUM(delta_cents) AS n FROM customer_credits WHERE customer_id = 1').get().n, 5000);
  const m = await bestel({ products: '2', voorrang: '1' });
  ok('via Mollie (voorrang) telt het tegoed wél', m.details.tegoed_cents > 0, true);
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(m.o.id);
}

console.log('\n5 · niet ingelogd: nooit credits');
{
  const voor = await creditsBeschikbaar(env, 1);
  const r = await bestel({ products: '2' }, { ingelogd: false });
  ok('onbetaald, via Mollie', [r.o && r.o.payment_status, r.mollie], ['unpaid', true]);
  ok('  saldo onveranderd', await creditsBeschikbaar(env, 1), voor);
}

console.log('\n6 · de server rekent zelf');
{
  const voor = await creditsBeschikbaar(env, 1);
  const r = await bestel({ products: '1', credits: '1', credits_used: '1', payment_status: 'credits' });
  ok('een meegestuurd "credits=1" verandert niets: 1 catalogset = 4', r.o && r.o.credits_used, SERVICE_CREDITS.catalog);
  ok('  en er gaat precies 4 af', await creditsBeschikbaar(env, 1), voor - SERVICE_CREDITS.catalog);
}

console.log('\n7 · twee bestellingen tegelijk');
{
  const voor = await creditsBeschikbaar(env, 1);
  /* Twee keer net iets meer dan de helft van wat er is. */
  const n = Math.floor(voor / SERVICE_CREDITS.catalog / 2) + 1;
  const [a, b] = await Promise.all([bestel({ products: String(n) }), bestel({ products: String(n) })]);
  const met = [a, b].filter((x) => x.o && x.o.payment_status === 'credits');
  ok('precies één met credits', met.length, 1);
  ok('  de ander via Mollie', [a, b].filter((x) => x.o && x.o.payment_status === 'unpaid' && x.mollie).length, 1);
  ok('  samen niet meer afgeboekt dan er was', voor - await creditsBeschikbaar(env, 1), n * SERVICE_CREDITS.catalog);
  ok('  geen partij onder nul', db.prepare('SELECT COUNT(*) AS n FROM credit_boek WHERE rest < 0').get().n, 0);
}

console.log('\n8 · de bron');
{
  const bron = readFileSync(new URL('../functions/api/order.js', import.meta.url), 'utf8');
  ok('order.js rekent de credits uit quote (geklemd), niet uit het formulier',
    /creditKosten\(\{\s*service: svc, products: quote\.products, extras: quote\.extras, hoogRes: quote\.hoogRes/.test(bron), true);
  ok('met credits geen Mollie-betaling', /!volledigMetTegoed && !metCredits/.test(bron), true);
  const status = readFileSync(new URL('../functions/api/order-status.js', import.meta.url), 'utf8');
  ok('/api/order-status telt credits als betaald (bedankpagina)', /\['paid', 'credits', 'plan'\]/.test(status), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
