/**
 * Overstappen naar een ander abonnement — 15 oktober 2026 (afvinklijst 29,
 * v29-overstap = a: "een echte overstap per volgende termijn: Mollie bijwerken,
 * en de credits van het nieuwe plan vanaf die termijn").
 *
 *   node tests/overstap.test.mjs        (geen server, geen browser)
 *
 * Wat hier vastligt:
 *   · de keuzes en de poorten (src/lib/overstap.js);
 *   · Studio: het formulier onder Je plan, de PATCH bij Mollie met het nieuwe
 *     brutobedrag, de rij die tot de volgende termijn hetzelfde plan blijft, de
 *     bevestiging, de mails, terugdraaien, een abonnement op maat;
 *   · de webhook: een termijn die Mollie vóór de overstap aanmaakte, telt nog voor
 *     het oude plan; de eerste termijn erna zet de overstap om en boekt de credits
 *     van het nieuwe plan;
 *   · pauzeren laat hem staan, hervatten zet hem om, opzeggen haalt hem weg;
 *   · /plans en de bijkoop-hint wijzen naar het formulier.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb, zetLook } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import { overstapDoel, magOverstappen, OVERSTAP_PLANNEN } from '../src/lib/overstap.js';
import { subMaandBruto } from '../src/lib/slots.js';
import { PLAN_CREDITS, customCreditsTotal } from '../src/data/pricing.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(72)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const euro = (cents) => (cents / 100).toFixed(2);

console.log('\nVISUAILS — overstappen naar een ander abonnement\n');

/* ── 1 · DE KEUZES EN DE POORTEN ───────────────────────────────────────── */
console.log('1 · de keuzes en de poorten');
ok('vier keuzes: de drie plannen en op maat', OVERSTAP_PLANNEN, ['starter', 'studio', 'brand', 'maat']);
ok('een vast plan: geen eigen bedrag of bundel op de rij', overstapDoel('brand'), { plan: 'brand', amount_cents: null, slots_json: null, credits: PLAN_CREDITS.brand });
const maat200 = overstapDoel('maat', 200);
ok('op maat: bedrag en {"credits":N}, zoals bij afsluiten', [maat200.amount_cents, maat200.slots_json], [Math.round(customCreditsTotal(200).total * 100), '{"credits":200}']);
ok('op maat buiten 30–300, geen heel getal of een onbekend plan: ongeldig', [overstapDoel('maat', 20), overstapDoel('maat', 'abc'), overstapDoel('maat', 30.5), overstapDoel('goud')], [null, null, null, null]);
ok('alleen een lopend maandabonnement bij Mollie', [
  magOverstappen({ status: 'active', term: 'monthly', mollie_subscription_id: 's', mollie_customer_id: 'c' }).mag,
  magOverstappen({ status: 'paused', term: 'monthly', mollie_subscription_id: 's', mollie_customer_id: 'c' }).reden,
  magOverstappen({ status: 'active', term: 'prepaid' }).reden,
  magOverstappen({ status: 'active', term: 'monthly' }).reden,
], [true, 'status', 'jaar', 'mollie']);

/* ── DE WERELD: één abonnee op Pro, Mollie en Resend onderschept ─────────── */
const mails = [];
const mollie = [];
let betaling = null;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com')) { mails.push(JSON.parse(String(opts.body || '{}'))); return new Response(JSON.stringify({ id: 'm' }), { status: 200 }); }
  if (u.includes('api.mollie.com')) {
    const methode = opts.method || 'GET';
    mollie.push({ url: u, method: methode, body: opts.body ? JSON.parse(String(opts.body)) : null });
    if (methode === 'GET' && /\/payments\//.test(u)) return new Response(JSON.stringify(betaling), { status: 200, headers: { 'content-type': 'application/json' } });
    if (methode === 'GET' && /\/mandates/.test(u)) return new Response(JSON.stringify({ count: 1, _embedded: { mandates: [{ id: 'mdt_volt', status: 'valid', method: 'directdebit' }] } }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ id: 'sub_nieuw', status: 'active' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('{}', { status: 200 });
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema laadt niet:', mislukt.slice(0, 3)); process.exit(1); }
const pdfs = [];
const env = { UPLOADS: { put: async (k) => { pdfs.push(k); } }, DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@visuails.com', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz1234' };
const nu = new Date();
const dezeMaand = nu.toISOString().slice(0, 7);
const volgende = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() + 1, 2)).toISOString().slice(0, 7);
db.prepare("INSERT INTO customers (id, email, brand, name, first_name, country) VALUES (1, 'mara@voorbeeld-volt.test', 'VOLT', 'Mara Visser', 'Mara', 'NL')").run();
zetLook(db, 1);
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, mollie_customer_id, mollie_mandate_id, mollie_subscription_id, vat_treatment, vat_rate)
            VALUES (1, 1, 'SUB-VOLT', 'studio', 'monthly', 'active', ?, 'cst_volt', 'mdt_volt', 'sub_volt', 'standard', 0.21)`).run(`${dezeMaand}-01 09:00:00`);
db.prepare("INSERT INTO subscription_months (subscription_id, month, granted) VALUES (1, ?, 120)").run(dezeMaand);
const klantToken = 'volt-token';
db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(klantToken));

const { accountPost, studioScreen } = await import('../src/lib/account.js');
const { onRequestPost: webhook } = await import('../functions/api/webhook/mollie.js');
const kop = { cookie: `vis_account=${klantToken}; vis_lang=nl` };
const scherm = async (path) => studioScreen({ request: new Request(`https://visuails.com${path}`, { headers: kop }), env, waitUntil() {} }, 'plan');
const post = (path, velden = {}) => accountPost({ request: new Request(`https://visuails.com${path}`, {
  method: 'POST', headers: { ...kop, origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(velden).toString(),
}), env, waitUntil() {} });
const rij = () => db.prepare('SELECT plan, amount_cents, slots_json, status, overstap_plan, overstap_cents, overstap_slots_json, overstap_at, overstap_van FROM subscriptions WHERE id = 1').get();
const patches = () => mollie.filter((m) => m.method === 'PATCH');
const bruto = (plan, extra = {}) => subMaandBruto({ plan, term: 'monthly', vat_treatment: 'standard', vat_rate: 0.21, ...extra });

/* ── 2 · STUDIO: HET FORMULIER ─────────────────────────────────────────── */
console.log('\n2 · Studio: het formulier onder Je plan');
let s = await scherm('/account/plan?tab=plan');
ok('het blok staat er, met de andere plannen en op maat', s.v.overstap && s.v.overstap.opties.map((o) => o.id), ['starter', 'brand', 'maat']);
ok('  per plan de credits en het bedrag per maand', s.v.overstap.opties.find((o) => o.id === 'brand').credits, `${PLAN_CREDITS.brand} credits per maand`);
ok('  "170 meer dan nu"', s.v.overstap.opties.find((o) => o.id === 'brand').verschil, `${PLAN_CREDITS.brand - PLAN_CREDITS.studio} meer dan nu`);
ok('  op maat begint bij het aantal van nu', s.v.overstap.maat.waarde, PLAN_CREDITS.studio);
ok('  ?naar=brand kiest Merk alvast (de bijkoop-hint)', (await scherm('/account/plan?tab=plan&naar=brand')).v.overstap.opties.find((o) => o.id === 'brand').gekozen, true);

console.log('\n3 · overstappen naar Merk');
let r = await post('/account/plan/overstap', { plan: 'brand' });
ok('303 terug naar Je plan, met de bevestiging', [r.status, r.headers.get('location')], [303, '/account/plan?ok=overstap#overstappen']);
ok('Mollie: PATCH met het nieuwe brutobedrag en de omschrijving', patches().map((m) => [m.url.replace(/^.*\/v2/, ''), m.body.amount.value, m.body.description]),
  [['/customers/cst_volt/subscriptions/sub_volt', euro(bruto('brand')), 'VISUAILS brand — SUB-VOLT']]);
let x = rij();
ok('de rij blijft deze termijn Pro; de overstap staat klaar', [x.plan, x.overstap_plan, x.overstap_van, !!x.overstap_at], ['studio', 'brand', 'studio', true]);
ok('mail aan de klant: "Je overstap staat klaar"', mails.some((m) => /^Je overstap staat klaar — SUB-VOLT$/.test(m.subject) && /290 credits per maand/.test(m.html)), true);
ok('bericht aan de studio', mails.some((m) => /overstap naar Merk/.test(m.subject)), true);
s = await scherm('/account/plan?ok=overstap#overstappen');
ok('Studio: de bevestiging en het klaarstaande blok', [/^Je overstap naar Merk staat klaar\./.test(s.v.bevestiging), /^Je stapt over naar Merk: 290 credits per maand/.test(s.v.overstap.klaar.zin)], [true, true]);
ok('  de volgende afschrijving toont het nieuwe bedrag', /\(Merk, nieuw\)$/.test(s.v.plan.volgende), true);

console.log('\n4 · terugdraaien, en opnieuw: op maat');
mollie.length = 0;
r = await post('/account/plan/overstap', { do: 'terug' });
ok('terugdraaien: 303 met ok=overstap-terug', r.headers.get('location'), '/account/plan?ok=overstap-terug#overstappen');
ok('  Mollie terug naar het bedrag van nu', patches().map((m) => m.body.amount.value), [euro(bruto('studio'))]);
ok('  niets meer klaar', rij().overstap_plan, null);
r = await post('/account/plan/overstap', { plan: 'maat', credits: '20' });
ok('op maat met 20 (onder de 30): melding, niets veranderd', [r.headers.get('location'), rij().overstap_plan], ['/account/plan?fout=overstap-keuze&naar=maat#overstappen', null]);
ok('  de melding in Studio', (await scherm('/account/plan?fout=overstap-keuze')).v.melding, 'Kies een abonnement, en bij een abonnement op maat 30 tot 300 credits (per 5). Er is niets veranderd.');
r = await post('/account/plan/overstap', { plan: 'studio' });
ok('het plan van nu kiezen zonder overstap: "zelfde"', r.headers.get('location'), '/account/plan?fout=overstap-zelfde&naar=studio#overstappen');
mollie.length = 0;
r = await post('/account/plan/overstap', { plan: 'maat', credits: '200' });
x = rij();
ok('op maat met 200: klaar, met bedrag en bundel', [x.overstap_plan, x.overstap_cents, x.overstap_slots_json], ['maat', maat200.amount_cents, '{"credits":200}']);
ok('  Mollie krijgt het bruto van 200 credits', patches().map((m) => m.body.amount.value), [euro(bruto('maat', { amount_cents: maat200.amount_cents }))]);

/* ── 5 · DE WEBHOOK ────────────────────────────────────────────────────── */
console.log('\n5 · de webhook');
async function termijn(id, { createdAt, paidAt, cents }) {
  betaling = {
    resource: 'payment', id, mode: 'test', createdAt, paidAt, status: 'paid',
    amount: { value: euro(cents), currency: 'EUR' }, description: 'VISUAILS', method: 'directdebit',
    sequenceType: 'recurring', customerId: 'cst_volt', mandateId: 'mdt_volt', subscriptionId: 'sub_volt',
  };
  return webhook({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `id=${id}` }), env, waitUntil() {} });
}
const termijnCredits = (maand) => db.prepare("SELECT COALESCE(SUM(aantal), 0) AS n FROM credit_boek WHERE subscription_id = 1 AND reden = 'termijn' AND maand = ?").get(maand).n;
/* Een betaling die Mollie al had aangemaakt vóór de overstap (oud bedrag). */
const gisteren = new Date(Date.now() - 864e5).toISOString();
await termijn('tr_OUD12345', { createdAt: gisteren, paidAt: gisteren, cents: bruto('studio') });
x = rij();
ok('al onderweg (aangemaakt vóór de overstap): nog Pro, de overstap blijft staan', [x.plan, x.overstap_plan], ['studio', 'maat']);
ok('  en die termijn krijgt de credits van Pro', termijnCredits(gisteren.slice(0, 7)), PLAN_CREDITS.studio);
/* De eerste termijn erna: nieuw bedrag. */
const straks = `${volgende}-02T06:00:00+00:00`;
await termijn('tr_NIEUW1234', { createdAt: straks, paidAt: straks, cents: bruto('maat', { amount_cents: maat200.amount_cents }) });
x = rij();
ok('de eerste termijn erna: de overstap is het abonnement', [x.plan, x.amount_cents, x.slots_json, x.overstap_plan], ['maat', maat200.amount_cents, '{"credits":200}', null]);
ok('  met de credits van het nieuwe plan', termijnCredits(volgende), 200);
ok('  de betaling is vastgelegd en de maand toegekend', db.prepare("SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = 1 AND month = ?").get(volgende).n, 1);
const factuur = db.prepare("SELECT si.snapshot_json FROM subscription_invoices si JOIN subscription_payments sp ON sp.id = si.subscription_payment_id WHERE sp.external_id = 'tr_NIEUW1234'").get();
ok('  de factuur noemt het nieuwe plan', !!factuur && /op maat/i.test(factuur.snapshot_json || ''), true);

/* ── 6 · PAUZEREN, HERVATTEN, OPZEGGEN ─────────────────────────────────── */
console.log('\n6 · pauzeren, hervatten, opzeggen');
r = await post('/account/plan/overstap', { plan: 'starter' });
ok('van op maat naar Starter: klaar', rij().overstap_plan, 'starter');
await post('/account/plan/pause', { do: 'pause', reden: 'rustig' });
ok('pauzeren laat de overstap staan', [rij().status, rij().overstap_plan], ['paused', 'starter']);
s = await scherm('/account/plan?tab=plan');
ok('  Studio: "gaat in zodra je hervat", geen formulier', [/zodra je je abonnement hervat/.test(s.v.overstap.klaar.zin), s.v.overstap.mag], [true, false]);
db.prepare("UPDATE subscriptions SET paused_at = datetime('now', '-1 day') WHERE id = 1").run();
mollie.length = 0;
r = await post('/account/plan/pause', { do: 'resume' });
x = rij();
ok('hervatten: de overstap gaat in', [r.headers.get('location'), x.plan, x.amount_cents, x.slots_json, x.overstap_plan], ['/account/plan?ok=hervat', 'starter', null, null, null]);
ok('  het nieuwe Mollie-abonnement krijgt het Starter-bedrag', mollie.filter((m) => m.method === 'POST' && /\/subscriptions$/.test(m.url)).map((m) => m.body.amount.value), [euro(bruto('starter'))]);
db.prepare("UPDATE subscriptions SET mollie_subscription_id = 'sub_volt2' WHERE id = 1").run();
await post('/account/plan/overstap', { plan: 'brand' });
ok('opnieuw klaar (Merk)', rij().overstap_plan, 'brand');
const adminToken = 'overstap-admin';
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')");
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(adminToken));
const { adminGet } = await import('../src/lib/admin.js');
const klantPagina = await (await adminGet({ request: new Request('https://visuails.com/admin/customers/1', { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} })).text();
ok('/admin: "Overstap klaar: naar Merk" bij de klant', /Overstap klaar:<\/strong> naar Merk \(290 credits per maand\)/.test(klantPagina), true);
await post('/account/plan/cancel', { confirm: 'OPZEGGEN', reden: 'rustig' });
ok('opzeggen haalt de klaarstaande overstap weg', [rij().status, rij().overstap_plan], ['cancelled', null]);
db.prepare("UPDATE subscriptions SET status = 'active', term = 'prepaid', cancelled_at = NULL WHERE id = 1").run();
s = await scherm('/account/plan?tab=plan');
ok('vooruitbetaald jaar: het blok staat er, met waarom het nu niet kan', [!!s.v.overstap, s.v.overstap && s.v.overstap.mag, s.v.overstap && /vooruitbetaald jaar/.test(s.v.overstap.niet)], [true, false, true]);

/* ── 7 · WAAR HET NAARTOE WIJST ────────────────────────────────────────── */
console.log('\n7 · /plans, de bijkoop-hint en het bestelformulier wijzen naar het formulier');
ok('/plans: "Overstappen in VISUAILS Studio" naar #overstappen', /data-vis-abo="\/account\/plan\?tab=plan#overstappen"/.test(lees('src/components/PlansHal.astro')), true);
ok('de bijkoop-hint (Studio) naar #overstappen, met het plan erbij', /#overstappen`, label: A\.bijHintLink/.test(lees('src/lib/account.js')) && /hintHref: h && h\.naar/.test(lees('src/lib/account.js')), true);
ok('het bestelformulier (credits te kort) naar #overstappen', /\/account\/plan\/\?tab=plan#overstappen|\/account\/plan\?tab=plan#overstappen/.test(lees('src/components/order/OrderFlow.astro')), true);
ok('migratie 0068 en schema.sql', /overstap_plan/.test(lees('migrations/0068-overstap.sql')) && /ADD COLUMN overstap_at/.test(lees('schema.sql')), true);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
