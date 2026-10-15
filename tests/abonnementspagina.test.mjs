/*
 * DE ABONNEMENTSPAGINA ZONDER TABBLADEN — punt 2.07 (ronde B, 8 oktober 2026)
 *   node tests/abonnementspagina.test.mjs        (geen server, geen browser)
 *
 *   1 · het saldo uit het creditboek: "Je hebt 128 credits", genoeg voor …,
 *       wat het eerst vervalt (bijna), wanneer er nieuwe bijkomen;
 *   2 · twee bestelknoppen met de vaste look erin, en de creditkaart;
 *   3 · het creditboek: nieuwste eerst, met kenmerk, link en status;
 *   4 · "Je plan": plan, termijn, bedrag, volgende afschrijving, facturen;
 *   5 · pauzeren: reden verplicht, gaat in bij de volgende afschrijving,
 *       hervatten vóór die dag start de incasso op die dag;
 *   6 · opzeggen: reden verplicht, eerst pauzeren aangeboden; de knop "bespreek
 *       je credits" groot in beeld na de reden "credits";
 *   7 · de knop "bespreek": een studiomail met saldo, vervaldatum en Bel/App,
 *       één per dag;
 *   8 · standen: gestopt (geen abonnement, wel credits), teruggeboekt, weinig;
 *   9 · /admin: dezelfde weergave op de klantpagina, met de reden;
 *  10 · de nachttaak: na 3 maanden pauze één mail "hervatten of opzeggen?".
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import { SERVICE_CREDITS, CREDITS_GELDIG_MAANDEN, PLAN_CREDITS } from '../src/data/pricing.js';
import { PAUZE_MAX_MAANDEN } from '../src/data/termijnen.js';
import { creditVertaling } from '../src/data/creditKaart.js';
import { termijnEinde } from '../src/lib/subscription.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(70)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── Mails en Mollie onderscheppen ─────────────────────────────────────── */
const mails = [];
const mollie = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com')) { mails.push(JSON.parse(String(opts.body || '{}'))); return new Response(JSON.stringify({ id: 'm' }), { status: 200 }); }
  if (u.includes('api.mollie.com')) {
    mollie.push({ url: u, method: opts.method || 'GET', body: opts.body ? JSON.parse(String(opts.body)) : null });
    return new Response(JSON.stringify({ id: 'sub_nieuw', status: 'active' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('{}', { status: 200 });
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema laadt niet:', mislukt.slice(0, 3)); process.exit(1); }
const env = { DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@visuails.com', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz1234' };

const nu = new Date();
const dag = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const moment = (d) => `${dag(d)} 10:00:00`;
const dezeMaand = nu.toISOString().slice(0, 7);
const begin = `${dezeMaand}-01 09:00:00`;

db.prepare("INSERT INTO customers (id, email, brand, name, first_name, phone, country) VALUES (1, 'mara@voorbeeld-volt.test', 'VOLT', 'Mara Visser', 'Mara', '06 12345678', 'NL')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, mollie_customer_id, mollie_mandate_id, mollie_subscription_id)
            VALUES (1, 1, 'SUB-VOLT', 'studio', 'monthly', 'active', ?, 'cst_volt', 'mdt_volt', 'sub_volt')`).run(begin);
db.prepare("INSERT INTO subscription_months (subscription_id, month, granted) VALUES (1, ?, 12)").run(dezeMaand);
/* Twee partijen: een oude die morgen vervalt (8 over), en die van deze maand.
   Morgen en niet over 10 dagen (12 oktober 2026, spaarplafond): alleen een
   datum vóór de volgende termijn (de 1e van volgende maand) geldt echt bij een
   lopend abonnement, en morgen ligt daar altijd vóór of op. */
db.prepare(`INSERT INTO credit_boek (id, customer_id, subscription_id, datum, aantal, reden, maand, vervalt_op, rest, sleutel, door)
            VALUES (1, 1, 1, ?, 20, 'termijn', ?, ?, 8, 'termijn:1:oud', 'test')`).run(moment(-80), dag(-80).slice(0, 7), dag(1));
db.prepare(`INSERT INTO credit_boek (id, customer_id, subscription_id, datum, aantal, reden, maand, vervalt_op, rest, sleutel, door)
            VALUES (2, 1, 1, ?, 120, 'termijn', ?, ?, 120, 'termijn:1:nu', 'test')`).run(moment(-2), dezeMaand, dag(88));
db.prepare(`INSERT INTO orders (id, ref, customer_id, email, name, brand, service, status, payment_status, credits_used, product_count, total_cents, lang)
            VALUES (7, 'VIS-AB12-C3D', 1, 'mara@voorbeeld-volt.test', 'Mara Visser', 'VOLT', 'catalog', 'delivered', 'credits', 12, 3, 0, 'nl')`).run();
db.prepare(`INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, order_id, order_ref, partijen, sleutel, door)
            VALUES (1, 1, ?, -12, 'bestelling', 7, 'VIS-AB12-C3D', '[{"id":1,"n":12}]', 'bestelling:7', 'klant')`).run(moment(-1));
/* De vaste look: catalog op gebroken wit 4:5, lifestyle Glow. */
db.prepare("INSERT INTO customer_style_locks (customer_id, style, background_hex, ratio) VALUES (1, 'catalog', '#F7F5F1', 'portrait45')").run();
db.prepare("INSERT INTO customer_style_locks (customer_id, style, look, ratio, roster_model) VALUES (1, 'lifestyle', 'glow', 'portrait45', 'ava')").run();

const klantToken = 'volt-token';
db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(klantToken));
const adminToken = 'b3-admin-token';
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));

const { accountPost, studioScreen } = await import('../src/lib/account.js');
const { adminGet } = await import('../src/lib/admin.js');
const { tasks } = await import('../cron/index.js');
const kop = (taal) => ({ cookie: `vis_account=${klantToken}; vis_lang=${taal}` });
const scherm = async (path, taal = 'nl') => studioScreen({ request: new Request(`https://visuails.com${path}`, { headers: kop(taal) }), env, waitUntil() {} }, 'plan');
const post = (path, velden = {}) => accountPost({ request: new Request(`https://visuails.com${path}`, {
  method: 'POST', headers: { ...kop('nl'), origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(velden).toString(),
}), env, waitUntil() {} });
const admin = async (path) => (await adminGet({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} })).text();
const sub = () => db.prepare('SELECT status, paused_at, pause_reason, stop_reden, stop_toelichting, pauze_vraag_at FROM subscriptions WHERE id = 1').get();

/* ── 1 · HET SALDO ─────────────────────────────────────────────────────── */
console.log('\n1 · het saldo uit het creditboek');
let s = await scherm('/account/plan');
ok('vier tabs in de staat (15 oktober 2026), Overzicht staat aan', [s.v.tabs.map((x) => x.id).join(','), s.v.tab, s.v.tabs.find((x) => x.id === 'credits').n], ['overzicht,credits,facturen,plan', 'overzicht', '128']);
ok('"Je hebt 128 credits"', s.v.saldo.kop, 'Je hebt 128 credits');
ok('genoeg voor … (uit creditKaart.js)', s.v.saldo.vertaling, `Genoeg voor ${creditVertaling(128, 'nl')}.`);
ok('wat het eerst vervalt, en dat het als eerste opgaat', /^8 hiervan blijven geldig tot en met .+ — die gaan als eerste op\.$/.test(s.v.saldo.eerst), true);
/* Spaarplafond (12 oktober 2026): de rest heeft geen datum, die schuift bij
   de volgende termijn mee; wel het plafond naast het saldo. */
ok('de rest zonder datum (lopend abonnement)', s.v.saldo.rest, '');
ok('"(je kunt er 360 sparen)" naast het saldo', s.v.saldo.spaar, `(je kunt er ${3 * PLAN_CREDITS.studio} sparen)`);
ok('binnen 14 dagen: "bijna"', s.v.saldo.bijna, true);
ok('wanneer er nieuwe bijkomen', /^Op .+ komen er \d+ bij\.$/.test(s.v.saldo.nieuw), true);
ok('de regel: zolang het loopt vervalt er niets', s.v.saldo.geldig.startsWith(`Zolang je abonnement loopt, vervallen je credits niet; je kunt tot ${CREDITS_GELDIG_MAANDEN} maanden aan credits sparen.`), true);
const en = await scherm('/account/plan', 'en');
ok('EN: "You have 128 credits" en "Enough for …"', [en.v.saldo.kop, en.v.saldo.vertaling.startsWith('Enough for ')], ['You have 128 credits', true]);

/* ── 2 · BESTELLEN ─────────────────────────────────────────────────────── */
console.log('\n2 · twee bestelknoppen met de vaste look');
ok('catalog en lifestyle', s.v.bestel.map((k) => k.dienst), ['catalog', 'lifestyle']);
ok('catalog: de look in de link (bg, ratio)', s.v.bestel[0].href, '/nl/start/catalog/?bg=F7F5F1&ratio=portrait45');
ok('catalog: de look in de knoptekst', /^Catalog bestellen — Classic · .+ · 4:5$/.test(s.v.bestel[0].label), true);
ok('lifestyle: Glow, 4:5 en het gezicht', s.v.bestel[1].href, '/nl/start/lifestyle/?style=glow&ratio=portrait45&face=ava');
ok('credits per product uit SERVICE_CREDITS', s.v.bestel.map((k) => k.per), [`${SERVICE_CREDITS.catalog} credits per product`, `${SERVICE_CREDITS.lifestyle} credits per product`]);
const pagina = lees('src/pages/account/plan.astro');
ok('de creditkaart staat op de pagina (6.01)', /<CreditKaart lang=\{lang\} plannen=\{false\}/.test(pagina), true);
ok('geen script en geen inline stijl op de pagina', /<script|style=/.test(pagina.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), false);

/* ── 3 · HET CREDITBOEK ────────────────────────────────────────────────── */
console.log('\n3 · het creditboek');
const regels = s.v.boek.regels;
ok('nieuwste eerst: de bestelling bovenaan', regels[0].reden, 'bestelling');
ok('met kenmerk, link naar de bestelling en status Geleverd', [regels[0].ref, regels[0].href, regels[0].status?.tekst], ['VIS-AB12-C3D', '/account/orders?order=7#order-7', 'Geleverd']);
ok('aantal met teken, saldo erna', [regels[0].aantal, regels[0].saldoNa], ['−12', 128]);
ok('de termijn als "Credits voor <maand>" met "geldig tot en met …"', regels.some((r) => r.reden === 'termijn' && /^Credits voor [a-z]+$/.test(r.wat) && /^geldig tot en met /.test(r.geldig)), true);

/* ── 4 · JE PLAN ───────────────────────────────────────────────────────── */
console.log('\n4 · je plan');
ok('plan, termijn, bedrag met btw', [s.v.plan.naam.length > 0, s.v.plan.termijn, /per maand incl\. btw$/.test(s.v.plan.bedrag)], [true, 'maandelijks', true]);
ok('volgende afschrijving met datum en bedrag', /^\d+ [a-z]+( \d{4})? · /.test(s.v.plan.volgende), true);
ok('facturen: een eigen tab, met een link naar alle facturen', /href="\/account\/invoices"/.test(pagina) && /href="\/account\/plan\?tab=facturen"/.test(pagina), true);
ok('pauzeren en opzeggen mogen', [s.v.beheer.magPauzeren, s.v.beheer.magOpzeggen, s.v.beheer.magHervatten], [true, true, false]);
ok('oude ?tab=facturering gaat naar de tab Je plan', await scherm('/account/plan?tab=facturering').then((r) => r instanceof Response ? r.headers.get('location') : ''), '/account/plan?tab=plan');
/* De vier tabs (15 oktober 2026): zonder ?tab= de tab bij wat er net gebeurde. */
{
  const { planTabVan } = await import('../src/lib/account.js');
  const q = (x) => new URLSearchParams(x);
  ok('tab: zonder iets Overzicht', planTabVan(q('')), 'overzicht');
  ok('tab: terug van een bijkoop op Credits', [planTabVan(q('bijkoop=4')), planTabVan(q('fout=bijkoop-vaak')), planTabVan(q('pakket=25&verder=%2Fstart%2F')), planTabVan(q('ok=bespreek'))], ['credits', 'credits', 'credits', 'credits']);
  ok('tab: na pauzeren of opzeggen op Je plan', [planTabVan(q('ok=pauze&r=rustig')), planTabVan(q('fout=reden')), planTabVan(q('ok=opgezegd')), planTabVan(q('fout=bevestig'))], ['plan', 'plan', 'plan', 'plan']);
  ok('tab: Je plan zonder plan wordt Overzicht', planTabVan(q('tab=plan'), { heeftPlan: false }), 'overzicht');
  ok('tab: een onbekende tab wordt Overzicht', planTabVan(q('tab=hack')), 'overzicht');
  ok('tab: de pagina zelf kiest zo ook', [s.v.tab, (await scherm('/account/plan?ok=hervat')).v.tab, (await scherm('/account/plan?tab=facturen')).v.tab], ['overzicht', 'plan', 'facturen']);
  ok('tab: Facturen haalt alleen de facturen van het abonnement op', Array.isArray((await scherm('/account/plan?tab=facturen')).v.facturen?.rows), true);
}

/* ── 5 · PAUZEREN ──────────────────────────────────────────────────────── */
console.log('\n5 · pauzeren: reden verplicht, in bij de volgende afschrijving');
let r = await post('/account/plan/pause', { do: 'pause' });
ok('zonder reden: terug met fout=reden', r.headers.get('location'), '/account/plan?fout=reden');
ok('  en er is niets veranderd', sub().status, 'active');
r = await post('/account/plan/pause', { do: 'pause', reden: 'anders' });
ok('"anders" zonder woorden telt niet als reden', r.headers.get('location'), '/account/plan?fout=reden');
mails.length = 0; mollie.length = 0;
r = await post('/account/plan/pause', { do: 'pause', reden: 'rustig' });
const volgende = termijnEinde({ started_at: begin }, dezeMaand);
ok('met reden: ok=pauze', r.headers.get('location'), '/account/plan?ok=pauze&r=rustig');
ok('de incasso bij Mollie is gestopt', mollie.some((m) => m.method === 'DELETE' && m.url.includes('sub_volt')), true);
ok('de pauze gaat in bij de volgende afschrijving', [sub().status, String(sub().paused_at).slice(0, 10), sub().pause_reason], ['paused', volgende, 'customer']);
ok('de reden staat bij het abonnement', sub().stop_reden, 'rustig');
ok('de klantmail noemt de dag en tot wanneer de credits gelden', mails.some((m) => m.to === 'mara@voorbeeld-volt.test' && /gaat op pauze op/.test(m.html) && new RegExp(`Je credits blijven geldig tot en met .+: ${CREDITS_GELDIG_MAANDEN} maanden na je laatste termijn`).test(m.html)), true);
ok('de studiomail noemt de reden', mails.some((m) => /Abonnement gepauzeerd/.test(m.subject) && /Even een rustige periode/.test(m.html)), true);
s = await scherm('/account/plan?ok=pauze&r=rustig');
ok('stand "pauze-straks": de maand loopt door', [s.v.stand, /^Je pauze gaat in op /.test(s.v.standZin)], ['pauze-straks', true]);
ok('  één bevestiging, in het standblok (B28)', [s.v.bevestiging, /Je krijgt een bevestiging per mail\.$/.test(s.v.standZin)], ['', true]);
ok('chip "Pauze vanaf …"', /^Pauze vanaf /.test(s.v.chip?.tekst || ''), true);
ok('credits blijven bruikbaar: het saldo staat er nog', s.v.saldo.getal, 128);
ok('geen nieuwe credits meer genoemd', s.v.saldo.nieuw, '');
ok('"Toch doorgaan" in plaats van "Hervatten"', [s.v.beheer.magHervatten, s.v.beheer.hervatLabel], [true, 'Toch doorgaan']);
ok('de maandset blijft bereikbaar tijdens de lopende maand', s.v.maandset !== null, true);
mollie.length = 0;
r = await post('/account/plan/pause', { do: 'resume' });
ok('hervatten vóór de pauze ingaat: ok=hervat', r.headers.get('location'), '/account/plan?ok=hervat');
ok('  de nieuwe incasso start op de dag van de pauze', mollie.find((m) => m.method === 'POST' && /subscriptions/.test(m.url))?.body?.startDate, volgende);
ok('  en het abonnement loopt weer', [sub().status, sub().paused_at], ['active', null]);

/* ── 6 · OPZEGGEN ──────────────────────────────────────────────────────── */
console.log('\n6 · opzeggen: reden verplicht, eerst pauzeren aangeboden');
ok('het opzegformulier biedt eerst pauzeren aan', /T\.opzegAanbod/.test(pagina) && /formaction="\/account\/plan\/pause"/.test(pagina), true);
ok('Opzeggen staat als eerste knop in het formulier (Enter zegt op)', pagina.indexOf('{t.planCancel}</button>') < pagina.indexOf('formaction="/account/plan/pause"'), true);
r = await post('/account/plan/cancel', { confirm: 'OPZEGGEN' });
ok('zonder reden: fout=reden', r.headers.get('location'), '/account/plan?fout=reden');
r = await post('/account/plan/cancel', { reden: 'credits' });
ok('zonder het woord: fout=bevestig', r.headers.get('location'), '/account/plan?fout=bevestig');
mails.length = 0;
r = await post('/account/plan/cancel', { confirm: 'opzeggen', reden: 'credits', toelichting: 'teveel over' });
ok('met reden en woord: ok=opgezegd', r.headers.get('location'), '/account/plan?ok=opgezegd&r=credits');
ok('opgezegd, met de reden en de eigen woorden', [sub().status, sub().stop_reden, sub().stop_toelichting], ['cancelled', 'credits', 'teveel over']);
ok('de studiomail: reden plus Bel/App om de credits te bespreken', mails.some((m) => /Abonnement opgezegd/.test(m.subject) && /Niet duidelijk wat te doen met de overige credits/.test(m.html) && /tel:\+31612345678/.test(m.html) && /wa\.me\/31612345678/.test(m.html)), true);
s = await scherm('/account/plan?ok=opgezegd&r=credits');
/* Doorloop 27 (B28): direct na het opzeggen staat de bevestiging IN het
   standblok ("… Je krijgt een bevestiging per mail."), niet nog eens erboven. */
ok('stand "opgezegd", credits blijven bruikbaar', [s.v.stand, new RegExp(`^Je abonnement stopt op .+ Je credits blijven geldig tot ${CREDITS_GELDIG_MAANDEN} maanden na je laatste termijn\\. Je krijgt een bevestiging per mail\\.$`).test(s.v.standZin), s.v.saldo.getal], ['opgezegd', true, 128]);
ok('  één bevestiging: geen aparte melding erboven', [s.v.bevestiging, s.v.standNet], ['', true]);
ok('  en het saldo noemt tot en met wanneer (geen plafond meer)', [/credits blijven geldig tot en met /.test(s.v.saldo.eerst), s.v.saldo.spaar], [true, '']);
ok('de knop "bespreek je credits" staat groot in beeld', s.v.bespreek?.nadruk, true);

/* ── 7 · BESPREEK JE CREDITS ───────────────────────────────────────────── */
console.log('\n7 · de knop "Bespreek met ons wat je met je credits kunt doen"');
mails.length = 0;
r = await post('/account/plan/bespreek');
ok('de klant ziet "We nemen contact met je op"', r.headers.get('location'), '/account/plan?ok=bespreek');
s = await scherm('/account/plan?ok=bespreek');
ok('  in die woorden', /^Bedankt\. We nemen contact met je op/.test(s.v.bevestiging), true);
const bm = mails.find((m) => /^Credits bespreken/.test(m.subject));
ok('studiomail met klant, saldo en vervaldata', !!bm && /VOLT/.test(bm.html) && /128/.test(bm.html) && /8 op /.test(bm.html), true);
ok('met Bel (voorop, NL) en App', !!bm && bm.html.indexOf('tel:+31612345678') > -1 && bm.html.indexOf('tel:+31612345678') < bm.html.indexOf('wa.me/31612345678'), true);
ok('en de laatste reden', !!bm && /Niet duidelijk wat te doen met de overige credits/.test(bm.html), true);
mails.length = 0;
r = await post('/account/plan/bespreek');
ok('een tweede klik dezelfde dag: geen tweede mail', [r.headers.get('location'), mails.length], ['/account/plan?ok=bespreekal', 0]);

/* ── 8 · STANDEN ───────────────────────────────────────────────────────── */
console.log('\n8 · standen: gestopt, teruggeboekt, weinig');
/* Gestopt: de opgezegde termijn is voorbij (geen maandrij meer), de credits niet. */
db.prepare('DELETE FROM subscription_months WHERE subscription_id = 1').run();
s = await scherm('/account/plan');
ok('geen lopend abonnement, wel credits: geen lege pagina', [s.v.geen, s.v.stand, s.v.saldo.getal], [false, 'gestopt', 128]);
/* Teruggeboekt: een tweede abonnement op pauze wegens chargeback, met bevroren credits. */
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, pause_reason, paused_at)
            VALUES (2, 1, 'SUB-VOLT-2', 'studio', 'monthly', 'paused', ?, 'chargeback', datetime('now'))`).run(begin);
db.prepare(`INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, maand, payment_id, partijen, sleutel, door)
            VALUES (1, 2, ?, -40, 'bevroren', ?, 'tr_x', '[{"id":2,"n":40}]', 'bevroren:2:1', 'systeem')`).run(moment(0), dezeMaand);
db.prepare('UPDATE credit_boek SET rest = rest - 40 WHERE id = 2').run();
s = await scherm('/account/plan');
ok('stand "teruggeboekt" met de zin', [s.v.stand, /teruggeboekt/.test(s.v.standZin)], ['teruggeboekt', true]);
ok('40 credits vast, niet in het saldo', [s.v.saldo.getal, /^40 credits staan vast/.test(s.v.saldo.bevroren)], [88, true]);
ok('geen hervatknop: Lucas beslist', s.v.beheer.magHervatten, false);
ok('de bevroren regel staat in het boek', s.v.boek.regels[0].wat, 'Vast: betaling teruggeboekt');
db.prepare('UPDATE credit_boek SET rest = 2 WHERE id = 2').run();
db.prepare('UPDATE credit_boek SET rest = 0 WHERE id = 1').run();
s = await scherm('/account/plan');
ok('weinig credits: "Niet genoeg voor een catalogset"', [s.v.saldo.weinig, /^Niet genoeg voor een catalogset/.test(s.v.saldo.vertaling)], [true, true]);
db.prepare('UPDATE credit_boek SET rest = 8 WHERE id = 1').run();
db.prepare('UPDATE credit_boek SET rest = 80 WHERE id = 2').run();

/* ── 9 · /ADMIN ────────────────────────────────────────────────────────── */
console.log('\n9 · /admin: dezelfde weergave op de klantpagina');
const ah = await admin('/admin/customers/1');
ok('saldo in dezelfde woorden', /<strong>Je hebt 88 credits<\/strong>/.test(ah), true);
ok('het creditboek met de bestelling, link en status', /<a href="\/admin\/orders\/7\/files">VIS-AB12-C3D<\/a>/.test(ah) && /Geleverd/.test(ah), true);
ok('de bevroren credits genoemd', /40 credits bevroren/.test(ah), true);
ok('Credits bijstellen staat er nog', /Credits bijstellen/.test(ah), true);
ok('geen "Abonnementsweek" of "Start deze week"', /Abonnementsweek|Start deze week/.test(ah), false);
db.prepare("UPDATE subscriptions SET stop_reden = 'prijs', stop_toelichting = NULL WHERE id = 2").run();
ok('de reden van stoppen', /Te duur voor wat er nu nodig is/.test(await admin('/admin/customers/1')), true);

/* ── 10 · DE NACHTTAAK ─────────────────────────────────────────────────── */
console.log(`\n10 · na ${PAUZE_MAX_MAANDEN} maanden pauze één mail "hervatten of opzeggen?"`);
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, pause_reason, paused_at)
            VALUES (3, 1, 'SUB-OUD', 'studio', 'monthly', 'paused', 'customer', ?)`).run(moment(-(PAUZE_MAX_MAANDEN * 31 + 2)));
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, pause_reason, paused_at)
            VALUES (4, 1, 'SUB-KORT', 'studio', 'monthly', 'paused', 'customer', ?)`).run(moment(-20));
mails.length = 0;
const regel = await tasks.pauzeVraag(env);
ok('de nachttaak meldt het in het rapport', /SUB-OUD/.test(regel) && !/SUB-KORT/.test(regel), true);
ok('de klant krijgt "hervatten of opzeggen?"', mails.filter((m) => /hervatten of opzeggen\?/.test(m.subject)).length, 1);
ok('  met een link naar de abonnementspagina', mails.some((m) => /\/nl\/account\/plan/.test(m.html)), true);
ok('pauze_vraag_at is gezet', !!db.prepare('SELECT pauze_vraag_at FROM subscriptions WHERE id = 3').get().pauze_vraag_at, true);
mails.length = 0;
ok('de volgende nacht: niets', [await tasks.pauzeVraag(env), mails.length], ['', 0]);

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
