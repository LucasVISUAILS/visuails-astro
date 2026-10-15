/**
 * Abonnementen na de controle van 15 oktober 2026 (levering 51).
 *
 *   node tests/abo-qa-51.test.mjs        (geen server, geen browser)
 *
 * Wat hier vastligt (zie kladblok/LEVERING-51.md):
 *   A01 · de eerste betaling zet started_at, en de nachtcontrole op een
 *         uitgebleven incasso valt voor oude rijen terug op created_at;
 *   A02 · een overstap die klaarstaat telt mee in het saldo: de credits van het
 *         nieuwe plan, het plafond van het nieuwe plan, de waarschuwing bij de
 *         keuze, de plafondmail en stap 5;
 *   A03 · de termijnmail zegt wat er boven het plafond verviel;
 *   A04 · het voorgestelde aantal bij Op maat is niet het aantal van nu;
 *   A06 · pauzeren en hervatten noemen een klaarstaande overstap;
 *   A07 · hervatten vóór de pauze is ingegaan laat de overstap klaarstaan;
 *   A08, A18 · de teksten over een mislukte afschrijving en een vooruitbetaald jaar.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb, zetLook } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import { subMaandBruto } from '../src/lib/slots.js';
import { PLAN_CREDITS, spaarPlafond } from '../src/data/pricing.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(74)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const euro = (cents) => (cents / 100).toFixed(2);

console.log('\nVISUAILS — abonnementen na de controle van 15 oktober 2026\n');

/* ── DE WERELD ──────────────────────────────────────────────────────────── */
const mails = [];
const mollie = [];
let betaling = null;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com')) { mails.push(JSON.parse(String(opts.body || '{}'))); return new Response(JSON.stringify({ id: 'm' }), { status: 200 }); }
  if (u.includes('api.mollie.com')) {
    const methode = opts.method || 'GET';
    mollie.push({ url: u, method: methode, body: opts.body ? JSON.parse(String(opts.body)) : null });
    const j = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } });
    if (methode === 'GET' && /\/payments\//.test(u)) return j(betaling);
    if (methode === 'GET' && /\/mandates/.test(u)) return j({ count: 1, _embedded: { mandates: [{ id: 'mdt_merk', status: 'valid', method: 'directdebit' }] } });
    return j({ id: 'sub_nieuw', status: 'active' });
  }
  return new Response('{}', { status: 200 });
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema laadt niet:', mislukt.slice(0, 3)); process.exit(1); }
const env = { UPLOADS: { put: async () => {} }, DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@visuails.com', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz1234' };

const nu = new Date();
const dezeMaand = nu.toISOString().slice(0, 7);
const plus = (m) => new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() + m, 1)).toISOString().slice(0, 7);
db.prepare("INSERT INTO customers (id, email, brand, name, first_name, country) VALUES (1, 'merk@voorbeeld-merk.test', 'MERK', 'Ria Merk', 'Ria', 'NL')").run();
zetLook(db, 1);
/* Merk, op de eerste van de maand begonnen; drie termijnen = 870 credits, precies het plafond. */
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, created_at, mollie_customer_id, mollie_mandate_id, mollie_subscription_id, vat_treatment, vat_rate)
            VALUES (1, 1, 'SUB-MERK', 'brand', 'monthly', 'active', ?, ?, 'cst_merk', 'mdt_merk', 'sub_merk', 'standard', 0.21)`).run(`${dezeMaand}-01 09:00:00`, `${dezeMaand}-01 09:00:00`);
const { boekTermijnBij, creditSaldo, creditsVoorFormulier, plafondInZicht } = await import('../src/lib/creditboek.js');
const subRij = () => db.prepare('SELECT * FROM subscriptions WHERE id = 1').get();
for (const m of [plus(-2), plus(-1), dezeMaand]) {
  await boekTermijnBij(env, subRij(), m, null);
  db.prepare("INSERT INTO subscription_months (subscription_id, month, granted) VALUES (1, ?, 290)").run(m);
}
const klantToken = 'merk-token';
db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(klantToken));
const { accountPost, studioScreen } = await import('../src/lib/account.js');
const { onRequestPost: webhook } = await import('../functions/api/webhook/mollie.js');
const { saldoWeergave } = await import('../src/lib/creditWeergave.js');
const kop = { cookie: `vis_account=${klantToken}; vis_lang=nl` };
const scherm = async (path) => studioScreen({ request: new Request(`https://visuails.com${path}`, { headers: kop }), env, waitUntil() {} }, 'plan');
const post = (path, velden = {}) => accountPost({ request: new Request(`https://visuails.com${path}`, {
  method: 'POST', headers: { ...kop, origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(velden).toString(),
}), env, waitUntil() {} });
const bruto = (plan, extra = {}) => subMaandBruto({ plan, term: 'monthly', vat_treatment: 'standard', vat_rate: 0.21, ...extra });
async function termijn(id, { createdAt, cents, subscriptionId = 'sub_merk', customerId = 'cst_merk', sequenceType = 'recurring', metadata } = {}) {
  betaling = {
    resource: 'payment', id, mode: 'test', createdAt, paidAt: createdAt, status: 'paid',
    amount: { value: euro(cents), currency: 'EUR' }, description: 'VISUAILS', method: 'directdebit',
    sequenceType, customerId, mandateId: 'mdt_merk', ...(subscriptionId ? { subscriptionId } : {}), ...(metadata ? { metadata } : {}),
  };
  return webhook({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `id=${id}` }), env, waitUntil() {} });
}

/* ── A04 · OP MAAT ──────────────────────────────────────────────────────── */
console.log('A04 · het voorgestelde aantal bij Op maat');
let s = await scherm('/account/plan?tab=plan');
ok('Merk (290): het midden met Pro (120), afgerond op 5 = 205', s.v.overstap.maat.waarde, 205);
ok('  en dat staat ook op de kaart', /^Bij 205 credits:/.test(s.v.overstap.opties.find((o) => o.id === 'maat').bedrag), true);

/* ── A02 · DE WAARSCHUWING BIJ DE KEUZE ─────────────────────────────────── */
console.log('\nA02 · minder credits is ook een lager spaarplafond');
const saldoVoor = await creditSaldo(env, { customerId: 1 });
ok('het saldo is 870, het plafond van Merk 870', [saldoVoor.aboSaldo, saldoVoor.plafond], [870, spaarPlafond(PLAN_CREDITS.brand)]);
const starter = s.v.overstap.opties.find((o) => o.id === 'starter');
ok('Starter: "Je kunt er dan 135 sparen: gebruik er vóór … 780, anders vallen ze bij de overstap weg."', /^Je kunt er dan 135 sparen: gebruik er vóór .+ 780, anders vallen ze bij de overstap weg\.$/.test(starter.verlies), true);
ok('Pro: 870 + 120 − 360 = 630', /gebruik er vóór .+ 630, anders/.test(s.v.overstap.opties.find((o) => o.id === 'studio').verlies), true);
ok('in de waarschuwingskleur van Studio', /\.st-overstap-verlies \{ color: var\(--st-clay-tekst\)/.test(lees('src/styles/studio.css')) && /o\.verlies && <span class="st-meta st-overstap-verlies">/.test(lees('src/pages/account/plan.astro')), true);

let r = await post('/account/plan/overstap', { plan: 'starter' });
ok('overstappen naar Starter', r.headers.get('location'), '/account/plan?ok=overstap#overstappen');
const saldo = await creditSaldo(env, { customerId: 1 });
ok('het saldo kent de overstap: 45 erbij, plafond 135', [saldo.nieuw?.aantal, saldo.nieuw?.overstap?.plan, saldo.nieuw?.overstap?.plafond], [45, 'starter', 135]);
ok('  bij die termijn valt 780 weg (was: 290 bij het oude plan)', [saldo.boven?.aantal, saldo.boven?.plafond, saldo.boven?.overstap], [780, 135, true]);
ok('  het plafond van nu blijft dat van Merk', saldo.plafond, 870);
const zin = saldoWeergave(saldo, 'nl').nieuw;
ok('de zin in Studio: "… gaat je overstap in en komen er 45 bij; je kunt er dan 135 sparen. Gebruik er vóór die dag 780, anders vallen ze weg."',
  /gaat je overstap in en komen er 45 bij; je kunt er dan 135 sparen\. Gebruik er vóór die dag 780, anders vallen ze weg\.$/.test(zin), true);
ok('  en in het Engels', /your switch starts and 45 more come in; you can then save up to 135\. Use 780 before that day, or they lapse\.$/.test(saldoWeergave(saldo, 'en').nieuw), true);
s = await scherm('/account/plan?tab=plan');
ok('het klaar-blok herhaalt de waarschuwing', /^Je kunt er dan 135 sparen: gebruik er vóór .+ 780/.test(s.v.overstap.klaar.verlies || ''), true);
const vorm = await creditsVoorFormulier(env, 1);
ok('stap 5 rekent met het plafond van de overstap (135) en 45 erbij', [vorm.plafond, vorm.nieuw.aantal], [135, 45]);
/* De plafondmail, zeven dagen voor de termijn. */
const zevenVoor = new Date(`${saldo.nieuw.op}T08:00:00Z`); zevenVoor.setUTCDate(zevenVoor.getUTCDate() - 7);
const inZicht = await plafondInZicht(env, { dagen: 7, nu: zevenVoor });
ok('plafondInZicht: 780 boven 135, met de overstap erbij', inZicht.map((x) => [x.boven, x.plafond, x.overstap, x.nieuw]), [[780, 135, 'starter', 45]]);
const { tasks } = await import('../cron/index.js');
mails.length = 0;
await tasks.herinnerCredits(env, zevenVoor);
const pm = mails.find((m) => /gebruik er vóór die dag 780/.test(m.subject || ''));
ok('de plafondmail: onderwerp met 45 en 780', !!pm && /komen er 45 credits bij/.test(pm.subject), true);
ok('  en de tekst noemt de overstap en het nieuwe plafond', !!pm && /gaat je overstap naar Starter in: dan komen er 45 bij en kun je er 135 sparen/.test(pm.html), true);

/* ── A03 · DE TERMIJN VAN DE OVERSTAP ───────────────────────────────────── */
console.log('\nA03 · de termijnmail zegt wat er verviel');
mails.length = 0;
await termijn('tr_OVERSTAP1', { createdAt: `${plus(1)}-01T06:00:00+00:00`, cents: bruto('starter') });
const na = subRij();
ok('de overstap is ingegaan: Starter', [na.plan, na.overstap_plan], ['starter', null]);
const plafondRegel = db.prepare("SELECT aantal, toelichting FROM credit_boek WHERE reden = 'plafond' AND customer_id = 1").get();
ok('in het creditboek: −780, plafond 135', [plafondRegel?.aantal, plafondRegel?.toelichting], [-780, 'plafond 135']);
const tm = mails.find((m) => /Je credits voor .+ staan klaar — SUB-MERK/.test(m.subject || ''));
ok('de termijnmail: "Je saldo kwam daarmee boven je spaarplafond van 135: 780 credits zijn vandaag vervallen."', !!tm && /boven je spaarplafond van 135: 780 credits zijn vandaag vervallen\./.test(tm.html), true);
ok('  een gewone termijn zonder verval zegt het niet', /!eerste && vervallen > 0 && plafond > 0 \? p\(esc\(t\.ledeBoven/.test(lees('src/lib/invoiceMail.js')), true);

/* ── A07 + A06 · PAUZEREN EN HERVATTEN MET EEN OVERSTAP ─────────────────── */
console.log('\nA06 · A07 · pauzeren en hervatten met een overstap die klaarstaat');
db.prepare("UPDATE subscriptions SET mollie_subscription_id = 'sub_merk2' WHERE id = 1").run();
r = await post('/account/plan/overstap', { plan: 'studio' });
ok('van Starter naar Pro: klaar', subRij().overstap_plan, 'studio');
mails.length = 0;
await post('/account/plan/pause', { do: 'pause', reden: 'rustig' });
const pauzeMail = mails.find((m) => /^Je pauze staat klaar|^Je abonnement staat op pauze/.test(m.subject || ''));
ok('de pauzemail: "Je overstap naar Pro blijft klaarstaan en gaat in zodra je hervat."', !!pauzeMail && /Je overstap naar Pro blijft klaarstaan en gaat in zodra je hervat\./.test(pauzeMail.html), true);
const pauzeDag = String(subRij().paused_at || '').slice(0, 10);
ok('de pauze gaat pas in bij de volgende termijn (paused_at in de toekomst)', pauzeDag > nu.toISOString().slice(0, 10), true);
mollie.length = 0; mails.length = 0;
r = await post('/account/plan/pause', { do: 'resume' });
let x = subRij();
ok('hervatten vóór de pauze: de overstap blijft klaarstaan, deze maand blijft Starter', [r.headers.get('location'), x.status, x.plan, x.overstap_plan], ['/account/plan?ok=hervat', 'active', 'starter', 'studio']);
ok('  het nieuwe Mollie-abonnement krijgt al het Pro-bedrag, op de dag van de pauze', mollie.filter((m) => m.method === 'POST' && /\/subscriptions$/.test(m.url)).map((m) => [m.body.amount.value, m.body.description, m.body.startDate]),
  [[euro(bruto('studio')), 'VISUAILS studio — SUB-MERK', pauzeDag]]);
const hervatMail = mails.find((m) => /^Je abonnement loopt weer/.test(m.subject || ''));
ok('  de mail: "Je overstap naar Pro gaat in op …, zoals gepland."', !!hervatMail && /Je Starter-abonnement loopt weer\..*Je overstap naar Pro gaat in op .+, zoals gepland\./s.test(hervatMail.html), true);
/* Een pauze die al was ingegaan: de overstap gaat bij hervatten in (zoals in overstap.test). */
db.prepare("UPDATE subscriptions SET mollie_subscription_id = 'sub_nieuw' WHERE id = 1").run();
await post('/account/plan/pause', { do: 'pause', reden: 'rustig' });
db.prepare("UPDATE subscriptions SET paused_at = datetime('now', '-1 day') WHERE id = 1").run();
mails.length = 0;
await post('/account/plan/pause', { do: 'resume' });
x = subRij();
ok('hervatten na een pauze die al liep: de overstap gaat in', [x.plan, x.overstap_plan], ['studio', null]);
const hervatMail2 = mails.find((m) => /^Je abonnement loopt weer/.test(m.subject || ''));
ok('  de mail: "Je overstap naar Pro is daarmee ingegaan: vanaf je volgende afschrijving krijg je 120 credits per maand."', !!hervatMail2 && /Je overstap naar Pro is daarmee ingegaan: vanaf je volgende afschrijving krijg je 120 credits per maand\./.test(hervatMail2.html), true);

/* ── A01 · started_at BIJ DE EERSTE BETALING ────────────────────────────── */
console.log('\nA01 · de eerste betaling zet started_at');
db.prepare("INSERT INTO customers (id, email, brand, name, first_name, country) VALUES (2, 'nieuw@voorbeeld-nieuw.test', 'NIEUW', 'Tom Nieuw', 'Tom', 'NL')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, mollie_customer_id, vat_treatment, vat_rate)
            VALUES (2, 2, 'SUB-NIEUW', 'starter', 'monthly', 'pending', 'cst_nieuw', 'standard', 0.21)`).run();
await termijn('tr_EERSTE123', { createdAt: nu.toISOString(), cents: bruto('starter'), subscriptionId: null, customerId: 'cst_nieuw', sequenceType: 'first', metadata: { sub_ref: 'SUB-NIEUW' } });
const nieuw = db.prepare('SELECT status, started_at FROM subscriptions WHERE id = 2').get();
ok('na de eerste betaling: actief, mét started_at (was leeg)', [nieuw.status, !!nieuw.started_at], ['active', true]);
ok('de webhook zet started_at als het abonnement aangaat', /SET status = 'active', started_at = COALESCE\(started_at, datetime\('now'\)\)/.test(lees('functions/api/webhook/mollie.js')), true);
ok('de nachtcontrole valt terug op created_at', /const begonOp = abo\.started_at \|\| abo\.created_at;/.test(lees('cron/index.js')) && /String\(begonOp\)\.slice\(0, 7\)/.test(lees('cron/index.js')), true);

/* ── A08 · A18 · DE TEKSTEN ─────────────────────────────────────────────── */
console.log('\nA08 · A18 · voorwaarden en Studio');
ok('voorwaarden NL: Mollie probeert het nog een paar keer, pas daarna een pauze', /<strong>Als een afschrijving mislukt\.<\/strong> Dan laten we het je weten, en probeert Mollie het de dagen erna nog een paar keer\./.test(lees('src/pages/nl/terms.astro')), true);
ok('voorwaarden EN: idem', /<strong>If a collection fails\.<\/strong> We let you know, and Mollie tries again a few times over the following days\./.test(lees('src/pages/terms.astro')), true);
ok('voorwaarden: de alinea Overstappen (NL en EN)', /<strong>Overstappen\.<\/strong> Op de maandelijkse termijn/.test(lees('src/pages/nl/terms.astro')) && /<strong>Switching plans\.<\/strong> On the monthly term/.test(lees('src/pages/terms.astro')), true);
ok('vooruitbetaald jaar: "verlengt niet vanzelf", niet meer "bij de verlenging"', /verlengt niet vanzelf: een ander abonnement kies je als het jaar om is/.test(lees('src/lib/account.js')) && !/Overstappen kan bij de verlenging/.test(lees('src/lib/account.js')), true);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
