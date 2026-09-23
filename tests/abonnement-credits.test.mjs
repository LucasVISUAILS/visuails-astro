/*
 * VISUAILS — het abonnement in credits, 23 september 2026.
 *
 * Lucas: *"Bedenk en redesign het abonnement pagina volledig van de grond op
 * inclusief de back-end foutloos."* Wat deze ronde neerzette en wat niet stil
 * mag teruglopen:
 *
 *   1. De prijslijn: de drie plannen liggen erop, een plan op maat ook, meer
 *      credits kost meer en elke credit wordt goedkoper.
 *   2. Een plan op maat in credits wordt afgesloten, betaald (echte webhook) en
 *      krijgt zijn credits — hier gooide de webhook tot vandaag een fout op
 *      productsFor('maat'), bij elke herhaling van Mollie opnieuw.
 *   3. De nachtelijke taak draait: herinnerCredits() stond binnen een lus en
 *      was daarbuiten onbekend, waardoor de hele lijst taken omviel.
 *   4. Hervatten op de jaartermijn geeft de RESTERENDE termijnen, niet twaalf.
 *   5. De pagina's: geen "producten per maand" meer op /plans en /start/plan,
 *      wel credits, en het plan op maat is een formulier met één veld.
 */
import { readFileSync, existsSync } from 'node:fs';
import { d1, verseDb, zetLook } from './lib/d1sqlite.mjs';
import { onRequestPost } from '../functions/api/webhook/mollie.js';
import { createSubscriptionRow, activateSubscription, monthKey } from '../src/lib/subscription.js';
import { creditBalans, vensterVoor, subMaandBruto, subEersteBetalingBruto, creditsVoor, subProducten } from '../src/lib/slots.js';
import { hervatIncasso } from '../src/lib/subscribe.js';
import { lookGezet, lookDetails } from '../src/lib/vasteLook.js';
import { __testLockUpdate } from '../src/lib/account.js';
import {
  PLAN_AMOUNT, PLAN_CREDITS, SERVICE_CREDITS, ladderFloor,
  CUSTOM_CREDITS_MIN, CUSTOM_CREDITS_MAX, customCreditsTotal, creditRateCents, isCustomCredits,
  planSaving, plans,
} from '../src/data/pricing.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(64)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const zonderCommentaar = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

console.log('\n1 · de prijslijn');
{
  for (const [id, c] of Object.entries(PLAN_CREDITS)) {
    ok(`${id}: ${c} credits kost precies het plan`, customCreditsTotal(c).total, PLAN_AMOUNT[id]);
  }
  let stijgt = true; let daalt = true; let vorige = null;
  for (let n = CUSTOM_CREDITS_MIN; n <= CUSTOM_CREDITS_MAX; n += 1) {
    const r = customCreditsTotal(n);
    if (vorige && r.total < vorige.total) stijgt = false;
    if (vorige && r.perCredit > vorige.perCredit + 0.02) daalt = false;
    vorige = r;
  }
  ok('meer credits kost nooit minder', stijgt);
  ok('en een credit wordt nooit duurder', daalt);
  const losGoedkoopst = Math.min(ladderFloor('catalog') / SERVICE_CREDITS.catalog, ladderFloor('lifestyle') / SERVICE_CREDITS.lifestyle);
  ok('de duurste credit op maat is goedkoper dan de goedkoopste los', creditRateCents(CUSTOM_CREDITS_MIN) / 100 < losGoedkoopst);
  ok('grenzen: onder het minimum is geen plan op maat', isCustomCredits(CUSTOM_CREDITS_MIN - 1), false);
  ok('  boven het maximum ook niet', isCustomCredits(CUSTOM_CREDITS_MAX + 1), false);
  ok('  en een kommagetal niet', isCustomCredits(60.5), false);
  for (const id of Object.keys(PLAN_AMOUNT)) {
    const s = planSaving(id);
    ok(`${id}: de besparing is echt en in credits gerekend`, Boolean(s && s.saving > 0 && s.sets === Math.floor(PLAN_CREDITS[id] / SERVICE_CREDITS.catalog)), true);
  }
  const kaart = plans('nl')[0];
  ok('de plankaart noemt credits', kaart.includes.some((r) => /credits/.test(r)), true);
  ok('  en geen "producten per maand"', kaart.includes.some((r) => /producten per maand/.test(r)), false);
}

console.log('\n2 · een plan op maat, van rij tot credits');
{
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (1, 'lies@maat.test', 'Lies', 'MAAT')");
  zetLook(db, 1);
  const env0 = { DB: d1(db) };
  const N = 85;
  const { row: sub } = await createSubscriptionRow(env0, {
    customerId: 1, planId: 'maat', termId: 'monthly', windowDay: 8,
    slots: { credits: N }, amountCents: customCreditsTotal(N).total * 100,
  });
  await activateSubscription(env0, sub.id);
  db.prepare("UPDATE subscriptions SET mollie_subscription_id = 'sub_MAAT01' WHERE id = ?").run(sub.id);
  const vol = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(sub.id);
  ok('de rij geeft 85 credits per maand', creditsVoor(vol), N);
  ok('en telt in de capaciteitspoort mee', subProducten(vol) > 0, true);
  ok('de eerste betaling is het bedrag van de lijn, bruto', subEersteBetalingBruto(vol) > customCreditsTotal(N).total * 100, true);

  const echteFetch = globalThis.fetch;
  const DEZE = monthKey();
  globalThis.fetch = async (url) => {
    if (String(url).includes('api.mollie.com')) {
      return new Response(JSON.stringify({
        resource: 'payment', id: 'tr_MAAT01', mode: 'test',
        createdAt: `${DEZE}-01T10:00:00+00:00`, paidAt: `${DEZE}-01T10:01:00+00:00`,
        amount: { value: (subMaandBruto(vol) / 100).toFixed(2), currency: 'EUR' },
        description: 'VISUAILS Abonnement op maat', method: 'directdebit',
        sequenceType: 'recurring', status: 'paid',
        customerId: 'cst_1', mandateId: 'mdt_1', subscriptionId: 'sub_MAAT01',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 200 });
  };
  const env = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: '', FROM_EMAIL: 'x@y.z', NOTIFY_EMAIL: 'a@b.c' };
  const res = await onRequestPost({
    request: new Request('https://visuails.com/api/webhook/mollie', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'id=tr_MAAT01',
    }),
    env, waitUntil() {},
  });
  globalThis.fetch = echteFetch;
  ok('de webhook antwoordt 200 en niet 500', res.status, 200);
  const maand = db.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?').get(sub.id).n;
  ok('de maand is toegekend', maand, 1);
  const betaald = db.prepare('SELECT COUNT(*) AS n FROM subscription_payments WHERE subscription_id = ?').get(sub.id).n;
  ok('de betaling is vastgelegd', betaald, 1);
  const saldo = await creditBalans(env, sub.id, vensterVoor(vol), new Date(), DEZE);
  ok('en de klant heeft 85 credits', saldo.saldo, N);
}

console.log('\n3 · de nachtelijke taak draait');
{
  const cron = await import('../cron/index.js');
  const fouten = [];
  const echt = console.error;
  console.error = (...a) => { fouten.push(a.join(' ')); };
  try { await cron.default.scheduled({}, {}, { waitUntil() {} }); } catch (e) { fouten.push(String(e?.message || e)); }
  console.error = echt;
  ok('geen taak is onbekend (ReferenceError)', fouten.some((f) => /is not defined/.test(f)), false);
  ok('herinnerCredits staat op het hoogste niveau van het bestand',
    /^async function herinnerCredits\(/m.test(lees('cron/index.js')), true);
}

console.log('\n4 · hervatten geeft de resterende termijnen');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (2, 'jaar@merk.test', 'Jaar', 'JAAR')");
  const env0 = { DB: d1(db) };
  const { row: sub } = await createSubscriptionRow(env0, { customerId: 2, planId: 'studio', termId: 'yearly', windowDay: 8 });
  db.prepare("UPDATE subscriptions SET mollie_customer_id = 'cst_2', mollie_mandate_id = 'mdt_2' WHERE id = ?").run(sub.id);
  for (const m of ['2026-06', '2026-07', '2026-08']) {
    db.prepare('INSERT INTO subscription_months (subscription_id, month, granted) VALUES (?, ?, 12)').run(sub.id, m);
  }
  const echteFetch = globalThis.fetch;
  let lijf = null;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('/subscriptions')) {
      lijf = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({ id: 'sub_HERVAT', resource: 'subscription' }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 200 });
  };
  const vol = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(sub.id);
  const gelukt = await hervatIncasso({ DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123' }, vol, 'https://visuails.com');
  globalThis.fetch = echteFetch;
  ok('hervatten lukt', gelukt, true);
  ok('met negen termijnen na drie betaalde maanden', lijf?.times, 9);
}

console.log('\n5 · een eigen look in het abonnement: pas als hij gemaakt is');
{
  /* Lucas, 23 september 2026: *"custom stylen moeten eerst gemaakt worden voor
     ze via het abonnement met credits gekocht kunnen worden."* De vaste
     lifestyle-look mag een eigen look (cs-<id>) zijn — maar alleen een ACTIEVE
     van deze klant. Een voorgestelde look (offerte open) wordt niet opgeslagen. */
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (3, 'look@merk.test', 'Look', 'LOOK')");
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (4, 'ander@merk.test', 'Ander', 'ANDER')");
  db.exec("INSERT INTO customer_styles (id, customer_id, name, service, status) VALUES (11, 3, 'Rooftop', 'lifestyle', 'active')");
  db.exec("INSERT INTO customer_styles (id, customer_id, name, service, status) VALUES (12, 3, 'Nog in de maak', 'lifestyle', 'proposed')");
  db.exec("INSERT INTO customer_styles (id, customer_id, name, service, status) VALUES (13, 4, 'Van een ander', 'lifestyle', 'active')");
  const env = { DB: d1(db) };
  const klant = { customer_id: 3, email: 'look@merk.test' };
  const zet = async (look) => {
    const body = new URLSearchParams({ style: 'lifestyle', look });
    await __testLockUpdate({ env, request: new Request('https://visuails.com/account/lock', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body }) }, klant);
    return db.prepare("SELECT look FROM customer_style_locks WHERE customer_id = 3 AND style = 'lifestyle'").get()?.look ?? null;
  };
  ok('een actieve eigen look wordt de vaste look', await zet('cs-11'), 'cs-11');
  ok('  en telt als "look gezet" voor de poort', lookGezet({ look: 'cs-11' }, 'lifestyle'), true);
  ok('  en gaat als style mee in de bestelling', lookDetails({ lifestyle: { look: 'cs-11' } }, ['lifestyle']).style, 'cs-11');
  ok('een look die nog gemaakt wordt, wordt niet opgeslagen', await zet('cs-12'), null);
  ok('de eigen look van een ander merk ook niet', await zet('cs-13'), null);
  ok('een huisstijl werkt nog gewoon', await zet('dunes'), 'dunes');
  const bron = zonderCommentaar(lees('src/lib/account.js'));
  ok('de brand kit biedt eigen looks aan en zet een voorgestelde uit', /slug: `cs-\$\{st\.id\}`/.test(bron) && /uit: st\.status !== 'active'/.test(bron), true);
  ok('Merk staat op 290 credits', PLAN_CREDITS.brand, 290);
}

console.log('\n6 · de pagina\'s');
{
  const plansPage = zonderCommentaar(lees('src/components/PlansPage.astro'));
  ok('/plans noemt geen producten per maand', /products a month|producten per maand/.test(plansPage), false);
  ok('/plans heeft een plan op maat met een creditveld', /name="credits"/.test(plansPage) && /data-pm-credits/.test(plansPage), true);
  ok('  dat naar /start/plan post met plan=maat', /action=\{lp\('\/start\/plan'\)\}/.test(plansPage) && /name="plan" value=\{CUSTOM_MONTH_ID\}/.test(plansPage), true);
  ok('  en de prijzen komen uit customCreditsTotal()', /customCreditsTotal\(/.test(plansPage), true);
  const picker = zonderCommentaar(lees('src/components/order/PlanPicker.astro'));
  ok('/start/plan noemt geen producten per maand', /\$\{n\} producten|\$\{n\} products/.test(picker), false);
  ok('  en leest ?credits= alleen als cijfers', /\/\^\\d\{1,3\}\$\/\.test\(credits\)/.test(picker), true);
  const dist = (p) => { const f = new URL(`../dist/${p}`, import.meta.url); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
  const html = dist('nl/plans/index.html');
  if (html) {
    ok('dist: /nl/plans draagt het plan op maat', /id="op-maat"/.test(html), true);
    ok('dist: en de tabel voor het script', /data-pm-data/.test(html), true);
    ok('dist: en noemt de credits van Studio', html.includes(`${PLAN_CREDITS.studio}`), true);
  } else ok('dist/nl/plans is gebouwd', false, true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
