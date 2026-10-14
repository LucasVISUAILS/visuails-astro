/*
 * EXTRA CREDITS BIJKOPEN — 12 oktober 2026 (afvinklijst 4: ab-v3 = c, ab-v4 = b)
 *
 * Tegen het echte schema.sql met D1 op node:sqlite, de echte webhook en de echte
 * Studio-routes, met een nagemaakte Mollie en Resend:
 *   1 · de prijs: het eigen tarief, 5% bij 25 en 10% bij 50, naar boven op hele euro's;
 *   2 · nooit goedkoper dan een abonnement met evenveel credits (alle plannen en
 *       elke stand op maat, plus een jaar vooruit);
 *   3 · de aankoop: een losse Mollie-betaling (iDEAL/kaart, geen incasso), de
 *       btw van het abonnement, alleen bij een lopend abonnement;
 *   4 · hoogstens 100 per kalendermaand, open betalingen tellen mee;
 *   5 · de webhook: betaald → credits, factuur ("Extra credits · 25 · Pro") en
 *       mail, één keer; mislukt, afgebroken of verlopen → niets;
 *   6 · eerst op, buiten het plafond, eigen datum, terug als bijgekocht;
 *   7 · terugbetaald en teruggeboekt, zoals bij een termijn;
 *   8 · de hint "Overstappen is voordeliger" alleen als die waar is;
 *   9 · Studio zonder script: het formulier, de POST en de terugkeer;
 *  10 · stap 5 (de gegevens) en /admin.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import {
  PLAN_AMOUNT, PLAN_CREDITS, BIJKOOP_PAKKETTEN, BIJKOOP_KORTING_PCT, BIJKOOP_MAX_PER_MAAND, OVERSTAP_HINT_MARGE,
  bijkoopPrijs, planMaandBedrag, customCreditsTotal, CUSTOM_CREDITS_MIN, CUSTOM_CREDITS_MAX, VAT_RATE, spaarPlafond,
} from '../src/data/pricing.js';
import { PLAN_IDS, prepayTotalCents } from '../src/data/plans.js';
import { VAT_TREATMENT } from '../src/data/vat.js';
import {
  pakkettenVoor, bijkoopRuimte, overstapHint, maakAankoop, verwerkBijkoop, bijkoopVoorFormulier, planTarief,
} from '../src/lib/bijkopen.js';
import {
  boekTermijnBij, betaalBestellingMetCredits, creditsTerugVoorBestelling, creditSaldo, creditsBeschikbaar, CREDIT_REDEN,
  vervaldatum,
} from '../src/lib/creditboek.js';

let goed = 0; let fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  g ? goed++ : fout++;
  console.log(` ${g ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(78)}${g ? '' : ` verwacht ${JSON.stringify(wil)}, kreeg ${JSON.stringify(kreeg)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── Mollie en Resend, nagemaakt ─────────────────────────────────────────── */
const mollieBetalingen = new Map();
const mollieVerzoeken = [];
const mails = [];
let volgId = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com')) { mails.push(JSON.parse(String(opts.body || '{}'))); return new Response(JSON.stringify({ id: 'm' }), { status: 200 }); }
  if (u.includes('api.mollie.com')) {
    const m = /\/payments\/([^/?]+)/.exec(u);
    if ((opts.method || 'GET') === 'POST' && /\/payments$/.test(u)) {
      const body = JSON.parse(String(opts.body || '{}'));
      volgId += 1;
      const id = `tr_Bijkoop${String(volgId).padStart(5, "0")}`;
      mollieVerzoeken.push(body);
      mollieBetalingen.set(id, { resource: 'payment', id, mode: 'test', status: 'open', amount: body.amount, metadata: body.metadata, locale: body.locale, createdAt: new Date().toISOString() });
      return new Response(JSON.stringify({ id, status: 'open', _links: { checkout: { href: `https://www.mollie.com/checkout/select-method/${id}` } } }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (m && mollieBetalingen.has(m[1])) return new Response(JSON.stringify(mollieBetalingen.get(m[1])), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ title: 'Not Found' }), { status: 404 });
  }
  return new Response('{}', { status: 200 });
};
const zetBetaald = (id, extra = {}) => {
  const p = mollieBetalingen.get(id);
  mollieBetalingen.set(id, { ...p, status: 'paid', paidAt: new Date().toISOString(), method: 'ideal', ...extra });
};

function maakBucket() {
  const inhoud = new Map();
  return {
    async put(key, body) { inhoud.set(key, body); return { key }; },
    async get(key) { const v = inhoud.get(key); return v ? { arrayBuffer: async () => (v.buffer ? v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) : v) } : null; },
  };
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema laadt (met migratie 0067)', mislukt, []);
const env = {
  DB: d1(db), UPLOADS: maakBucket(), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@visuails.test',
  SELLER_ADDRESS: 'VISUAILS\nVerzonnenweg 1\n9999 ZZ Nergenshuizen\nKVK 00000000\nBTW NL000000000B00', PUBLIC_ORIGIN: 'https://visuails.com',
};
const vandaag = new Date().toISOString().slice(0, 10);
const begin = `${vandaag.slice(0, 7)}-01 09:00:00`;
db.prepare(`INSERT INTO customers (id, email, name, brand, country) VALUES
  (1, 'pro@voorbeeld-bijkoop.test', 'Pro', 'PROMERK', 'NL'),
  (2, 'eu@voorbeeld-bijkoop.test', 'EU', 'EUMERK', 'DE'),
  (3, 'pauze@voorbeeld-bijkoop.test', 'Pauze', 'PAUZE', 'NL'),
  (4, 'plafond@voorbeeld-bijkoop.test', 'Plafond', 'PLAF', 'NL'),
  (5, 'starter@voorbeeld-bijkoop.test', 'Starter', 'START', 'NL')`).run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, vat_treatment, vat_rate, vat_country, vat_number) VALUES
  (1, 1, 'SUB-PRO', 'studio', 'monthly', 'active', ?1, 'nl_standard', ?2, 'NL', NULL),
  (2, 2, 'SUB-EU', 'starter', 'monthly', 'active', ?1, 'eu_reverse_charge', 0, 'DE', 'DE123456789'),
  (3, 3, 'SUB-PAUZE', 'studio', 'monthly', 'paused', ?1, 'nl_standard', ?2, 'NL', NULL),
  (4, 4, 'SUB-PLAF', 'studio', 'monthly', 'active', ?1, 'nl_standard', ?2, 'NL', NULL),
  (5, 5, 'SUB-START', 'starter', 'monthly', 'active', ?1, 'nl_standard', ?2, 'NL', NULL)`).run(begin, VAT_RATE);
const sub = (id) => ({ ...db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) });
const aankoop = (id) => db.prepare('SELECT * FROM credit_aankopen WHERE id = ?').get(id);
const webhook = async (id) => {
  const { onRequestPost } = await import('../functions/api/webhook/mollie.js');
  return onRequestPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `id=${id}` }), env, waitUntil() {} });
};

/* ── 1 · DE PRIJS ─────────────────────────────────────────────────────────── */
console.log('\n1 · de prijs');
ok('de pakketten en de korting', [BIJKOOP_PAKKETTEN, BIJKOOP_KORTING_PCT], [[10, 25, 50], { 10: 0, 25: 5, 50: 10 }]);
ok('de tabel van ABONNEMENT-KWARTAAL.md §4 (excl. btw)', PLAN_IDS.map((id) => BIJKOOP_PAKKETTEN.map((x) => bijkoopPrijs(PLAN_AMOUNT[id], PLAN_CREDITS[id], x))),
  [[87, 206, 390], [66, 157, 297], [59, 139, 263]]);
ok('naar boven op hele euro\'s, exact: Starter 50 is precies 390 en geen 391', bijkoopPrijs(390, 45, 50), 390);
ok('op maat: het eigen tarief van die stand (60 credits)', BIJKOOP_PAKKETTEN.map((x) => bijkoopPrijs(customCreditsTotal(60).total, 60, x)),
  BIJKOOP_PAKKETTEN.map((x) => Math.ceil((x * customCreditsTotal(60).total / 60) * (100 - BIJKOOP_KORTING_PCT[x]) / 100 - 1e-9)));
ok('een onbekend pakket heeft geen prijs', bijkoopPrijs(790, 120, 30), null);
ok('pakkettenVoor(Pro)', pakkettenVoor(sub(1)).map((p) => [p.credits, p.euros]), [[10, 66], [25, 157], [50, 297]]);
ok('planTarief(op maat 60) leest het maandbedrag van de lijn', planTarief({ plan: 'maat', slots_json: JSON.stringify({ credits: 60 }), status: 'active' })?.bedrag, planMaandBedrag('maat', 60));

/* ── 2 · NOOIT GOEDKOPER ──────────────────────────────────────────────────── */
console.log('\n2 · plan + bijkopen is nooit goedkoper dan een abonnement met evenveel credits');
{
  const abos = PLAN_IDS.map((id) => ({ id, c: PLAN_CREDITS[id], b: PLAN_AMOUNT[id] }));
  for (let n = CUSTOM_CREDITS_MIN; n <= CUSTOM_CREDITS_MAX; n += 1) if (!Object.values(PLAN_CREDITS).includes(n)) abos.push({ id: `maat${n}`, c: n, b: customCreditsTotal(n).total });
  /* Alle combinaties van hoogstens vier pakketten, en alle combinaties die
     binnen het maximum per maand passen. */
  const combis = new Map();
  const rec = (start, cur) => {
    const som = cur.reduce((s, x) => s + x, 0);
    if (cur.length && (cur.length <= 4 || som <= BIJKOOP_MAX_PER_MAAND)) combis.set(cur.join('+'), cur);
    if (cur.length >= 10) return;
    for (let i = start; i < BIJKOOP_PAKKETTEN.length; i += 1) rec(i, [...cur, BIJKOOP_PAKKETTEN[i]]);
  };
  rec(0, []);
  let n = 0; let mis = 0; let krap = null;
  for (const a of abos) {
    for (const c of combis.values()) {
      const N = a.c + c.reduce((s, x) => s + x, 0);
      const prijs = a.b + c.reduce((s, x) => s + bijkoopPrijs(a.b, a.c, x), 0);
      const abonnement = customCreditsTotal(Math.min(N, CUSTOM_CREDITS_MAX)).total;
      n += 1;
      if (prijs < abonnement) mis += 1;
      if (!krap || prijs - abonnement < krap.marge) krap = { marge: prijs - abonnement, a: a.id, c: c.join('+') };
    }
  }
  ok(`${n} combinaties (3 plannen + elke stand op maat ${CUSTOM_CREDITS_MIN}–${CUSTOM_CREDITS_MAX}): 0 goedkoper`, mis, 0);
  ok('  het krapste geval: Merk + 10 is 1 euro duurder dan 300 op maat', [krap.a, krap.c, krap.marge], ['brand', '10', 1]);
  /* Een jaar vooruit + pakketten (op het maandtarief) tegen het grotere jaar vooruit. */
  let jaarMis = 0;
  for (const van of PLAN_IDS) {
    const perMaand = prepayTotalCents(van) / 100 / 12;
    for (const c of combis.values()) {
      const N = PLAN_CREDITS[van] + c.reduce((s, x) => s + x, 0);
      const prijs = perMaand + c.reduce((s, x) => s + bijkoopPrijs(PLAN_AMOUNT[van], PLAN_CREDITS[van], x), 0);
      for (const naar of PLAN_IDS) {
        if (PLAN_CREDITS[naar] > PLAN_CREDITS[van] && PLAN_CREDITS[naar] <= N && prijs < prepayTotalCents(naar) / 100 / 12) jaarMis += 1;
      }
    }
  }
  ok('jaar vooruit + bijkopen: nooit goedkoper dan het grotere jaar vooruit', jaarMis, 0);
  ok('de bouwcontrole staat in pricing.js en draait bij het laden', /\nassertBijkoop\(\);/.test(lees('src/data/pricing.js')), true);
}

/* ── 3 · DE AANKOOP ───────────────────────────────────────────────────────── */
console.log('\n3 · de aankoop: een losse Mollie-betaling met de btw van het abonnement');
const a1 = await maakAankoop(env, { customerId: 1, sub: sub(1), pakket: 25, lang: 'nl', origin: 'https://visuails.com', verder: '/nl/start/catalog/' });
ok('Pro, 25 credits: een betaallink van Mollie', [a1.ok, /^https:\/\/www\.mollie\.com\/checkout\//.test(a1.url)], [true, true]);
const r1 = aankoop(a1.id);
ok('  de rij: open, 157 excl., 21% btw, bruto 189,97', [r1.status, r1.net_cents, r1.vat_cents, r1.gross_cents, r1.maand], ['open', 15700, Math.round(15700 * VAT_RATE), Math.round(15700 * (1 + VAT_RATE)), vandaag.slice(0, 7)]);
const v1 = mollieVerzoeken[0];
ok('  Mollie: het bruto, eenmalig, iDEAL of kaart, en het nummer van de aankoop', [v1.amount.value, v1.sequenceType, v1.method, v1.metadata.bijkoop, 'customerId' in v1],
  [(r1.gross_cents / 100).toFixed(2), 'oneoff', ['ideal', 'creditcard'], String(a1.id), false]);
ok('  terug naar Studio, met de weg terug naar de bestelling', v1.redirectUrl, `https://visuails.com/account/plan/?bijkoop=${a1.id}&verder=%2Fnl%2Fstart%2Fcatalog%2F#bijkopen`);
ok('  en de webhook', v1.webhookUrl, 'https://visuails.com/api/webhook/mollie');
const a2 = await maakAankoop(env, { customerId: 2, sub: sub(2), pakket: 10, lang: 'en', origin: 'https://visuails.com' });
const r2 = aankoop(a2.id);
ok('EU zakelijk (verlegd): bruto is netto, en geen iDEAL', [r2.net_cents, r2.gross_cents, r2.vat_treatment, mollieVerzoeken[1].method], [8700, 8700, VAT_TREATMENT.reverseCharge, ['creditcard', 'bancontact']]);
ok('een gepauzeerd abonnement kan niet bijkopen', (await maakAankoop(env, { customerId: 3, sub: sub(3), pakket: 10, origin: 'https://visuails.com' })).reden, 'geen-abonnement');
ok('een pakket van 30 bestaat niet', (await maakAankoop(env, { customerId: 1, sub: sub(1), pakket: 30, origin: 'https://visuails.com' })).reden, 'pakket');
ok('een verder-adres buiten het bestelformulier valt weg', /verder=/.test((await maakAankoop(env, { customerId: 5, sub: sub(5), pakket: 10, origin: 'https://visuails.com', verder: 'https://kwaad.test/' })).ok && mollieVerzoeken.at(-1).redirectUrl), false);

/* ── 4 · HOOGSTENS 100 PER MAAND ──────────────────────────────────────────── */
console.log(`\n4 · hoogstens ${BIJKOOP_MAX_PER_MAAND} per kalendermaand`);
ok('25 open telt mee: nog 75', (await bijkoopRuimte(env.DB, 1)).ruimte, BIJKOOP_MAX_PER_MAAND - 25);
const a3 = await maakAankoop(env, { customerId: 1, sub: sub(1), pakket: 50, origin: 'https://visuails.com' });
ok('50 erbij: kan (75)', a3.ok, true);
ok('nog eens 50: te veel (125)', (await maakAankoop(env, { customerId: 1, sub: sub(1), pakket: 50, origin: 'https://visuails.com' })).reden, 'te-veel');
const a4 = await maakAankoop(env, { customerId: 1, sub: sub(1), pakket: 25, origin: 'https://visuails.com' });
ok('25: precies 100, kan', a4.ok, true);
ok('daarna niets meer, ook geen 10', (await maakAankoop(env, { customerId: 1, sub: sub(1), pakket: 10, origin: 'https://visuails.com' })).reden, 'te-veel');
ok('een open betaling van uren oud telt niet meer mee', await (async () => {
  db.prepare("UPDATE credit_aankopen SET created_at = datetime('now', '-5 hours') WHERE id = ?").run(a4.id);
  const r = (await bijkoopRuimte(env.DB, 1)).ruimte;
  db.prepare("UPDATE credit_aankopen SET created_at = datetime('now') WHERE id = ?").run(a4.id);
  return r;
})(), 25);
ok('een andere maand begint opnieuw', (await bijkoopRuimte(env.DB, 1, new Date(Date.now() + 40 * 864e5))).ruimte, BIJKOOP_MAX_PER_MAAND);

/* ── 5 · DE WEBHOOK ───────────────────────────────────────────────────────── */
console.log('\n5 · de webhook: betaald, mislukt, afgebroken, verlopen');
await boekTermijnBij(env, sub(1), vandaag.slice(0, 7), 'tr_termijn1', new Date(`${vandaag}T08:00:00Z`));
const r1pid = aankoop(a1.id).mollie_payment_id;
zetBetaald(r1pid);
mails.length = 0;
ok('betaald: de webhook antwoordt 200', (await webhook(r1pid)).status, 200);
ok('  de aankoop staat op betaald', aankoop(a1.id).status, 'paid');
const partij = db.prepare("SELECT * FROM credit_boek WHERE reden = 'bijgekocht' AND customer_id = 1").get();
ok('  een partij "bijgekocht" van 25, soort bijgekocht, 3 maanden vanaf de betaling', [partij.aantal, partij.rest, partij.soort, partij.vervalt_op, partij.payment_id],
  [25, 25, 'bijgekocht', vervaldatum(vandaag), r1pid]);
const sp = db.prepare('SELECT * FROM subscription_payments WHERE external_id = ?').get(r1pid);
ok('  de betaling in subscription_payments, zonder maand', [sp.status, sp.amount_cents, sp.month, sp.subscription_id], ['paid', aankoop(a1.id).gross_cents, null, 1]);
const factuur = db.prepare('SELECT * FROM subscription_invoices WHERE subscription_payment_id = ?').get(sp.id);
const snap = JSON.parse(factuur.snapshot_json);
ok('  een factuur uit dezelfde reeks, uitgereikt, met de pdf', [factuur.status, /^VIS-PROEF-\d{4}-\d{4}$|^VIS-\d{4}-\d{4}$/.test(factuur.number), !!factuur.pdf_key], ['issued', true, true]);
ok('  factuurregel "Extra credits · 25 · Pro"', snap.lines.map((l) => l.description), ['Extra credits · 25 · Pro']);
ok('  btw: 21% over 157, netto + btw = bruto', [snap.netCents, snap.vatRate, snap.vatCents + snap.netCents, snap.treatment, snap.kind], [15700, VAT_RATE, aankoop(a1.id).gross_cents, VAT_TREATMENT.standard, 'bijkoop']);
const m = mails.find((x) => x.to === 'pro@voorbeeld-bijkoop.test');
ok('  één mail aan de klant, met de factuur erbij', [!!m, /^Je 25 extra credits staan klaar — VIS-/.test(m?.subject || ''), (m?.attachments || []).length], [true, true, 1]);
ok('  die zegt: eerst op, niet in het plafond, tot en met …', /gaan als eerste op, tellen niet mee voor je spaarplafond en blijven 3 maanden geldig, tot en met/.test(m?.html || ''), true);
mails.length = 0;
await webhook(r1pid);
ok('dezelfde webhook nog een keer: geen tweede partij, factuur of mail',
  [db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE reden = 'bijgekocht' AND customer_id = 1").get().n, db.prepare('SELECT COUNT(*) AS n FROM subscription_invoices WHERE subscription_payment_id = ?').get(sp.id).n, mails.length], [1, 1, 0]);
for (const [aid, st] of [[a3.id, 'failed'], [a4.id, 'canceled'], [a2.id, 'expired']]) {
  const pid = aankoop(aid).mollie_payment_id;
  mollieBetalingen.set(pid, { ...mollieBetalingen.get(pid), status: st });
  await webhook(pid);
  ok(`${st}: alleen de status, geen credits`, [aankoop(aid).status, db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE reden = 'bijgekocht' AND sleutel = ?").get(`bijgekocht:${aid}`).n], [st, 0]);
}
ok('een mislukte aankoop geeft de ruimte terug', (await bijkoopRuimte(env.DB, 1)).ruimte, BIJKOOP_MAX_PER_MAAND - 25);
ok('de verlegde factuur (EU) heeft 0% en is netto', await (async () => {
  const b = await maakAankoop(env, { customerId: 2, sub: sub(2), pakket: 25, lang: 'en', origin: 'https://visuails.com' });
  const pid = aankoop(b.id).mollie_payment_id;
  zetBetaald(pid, { locale: 'en_GB' });
  await webhook(pid);
  const s2 = db.prepare('SELECT id FROM subscription_payments WHERE external_id = ?').get(pid);
  const f = JSON.parse(db.prepare('SELECT snapshot_json FROM subscription_invoices WHERE subscription_payment_id = ?').get(s2.id).snapshot_json);
  return [f.vatRate, f.vatCents, f.grossCents, f.treatment, f.lines[0].description];
})(), [0, 0, 20600, VAT_TREATMENT.reverseCharge, 'Extra credits · 25 · Starter']);

/* ── 6 · EERST OP, BUITEN HET PLAFOND, EIGEN DATUM ────────────────────────── */
console.log('\n6 · eerst op, buiten het plafond, eigen datum, terug als bijgekocht');
let volg = 900;
const bestelling = (klant) => { volg += 1; db.prepare(`INSERT INTO orders (id, ref, customer_id, service, email, total_cents, vat_cents, product_count, lang) VALUES (?, ?, ?, 'catalog', 'x@y.test', 0, 0, 1, 'nl')`).run(volg, `VIS-B${volg}`, klant); return volg; };
{
  const o = bestelling(1);
  const r = await betaalBestellingMetCredits(env, { orderId: o, customerId: 1, aantal: 20 });
  ok('een bestelling van 20 gaat eerst van de bijgekochte af', r.partijen, [{ id: partij.id, n: 20 }]);
  const o2 = bestelling(1);
  const r2 = await betaalBestellingMetCredits(env, { orderId: o2, customerId: 1, aantal: 15 });
  ok('  de volgende: de laatste 5 bijgekochte, dan het abonnement', r2.partijen.map((x) => x.n), [5, 10]);
  const t = await creditsTerugVoorBestelling(env, { orderId: o2, reden: CREDIT_REDEN.annulering });
  const terug = db.prepare("SELECT aantal, soort, vervalt_op FROM credit_boek WHERE order_id = ? AND reden = 'annulering' ORDER BY id").all(o2).map((x) => [x.aantal, x.soort || '']);
  ok('  geannuleerd: 10 terug als abonnementscredits, 5 als bijgekochte', terug, [[10, ''], [5, 'bijgekocht']]);
  ok('  samen 15, nooit meer dan er afging', [t.aantal, t.bijgekocht, (await creditsTerugVoorBestelling(env, { orderId: o2, reden: CREDIT_REDEN.annulering })).ok], [15, 5, false]);
}
{
  /* Klant 4: drie termijnen = precies het plafond, plus 25 bijgekocht. */
  const s4 = sub(4);
  const dagen = [-62, -32, -2].map((d) => new Date(Date.now() + d * 864e5));
  for (const d of dagen) await boekTermijnBij(env, s4, d.toISOString().slice(0, 7) + (d === dagen[0] ? '' : ''), `tr_p${d.getTime()}`, d);
  const voor = await creditSaldo(env, { customerId: 4 });
  ok('klant aan het plafond: 360 van het abonnement', [voor.aboSaldo, voor.plafond], [spaarPlafond(PLAN_CREDITS.studio), spaarPlafond(PLAN_CREDITS.studio)]);
  const b = await maakAankoop(env, { customerId: 4, sub: s4, pakket: 25, origin: 'https://visuails.com' });
  zetBetaald(aankoop(b.id).mollie_payment_id);
  await webhook(aankoop(b.id).mollie_payment_id);
  const na = await creditSaldo(env, { customerId: 4 });
  ok('  met 25 bijgekocht: saldo 385, het plafond telt alleen het abonnement', [na.saldo, na.aboSaldo, na.bijgekocht.saldo, na.boven?.aantal], [385, 360, 25, PLAN_CREDITS.studio]);
  const bp = db.prepare("SELECT id, vervalt_op FROM credit_boek WHERE reden = 'bijgekocht' AND customer_id = 4").get();
  const volgende = new Date(Date.now() + 28 * 864e5);
  const t4 = await boekTermijnBij(env, s4, volgende.toISOString().slice(0, 7), 'tr_p_volgende', volgende);
  const bpNa = db.prepare('SELECT rest, vervalt_op FROM credit_boek WHERE id = ?').get(bp.id);
  ok('  de volgende termijn: alleen 120 boven het plafond, de bijgekochte blijven heel', [t4.boven, bpNa.rest], [PLAN_CREDITS.studio, 25]);
  ok('  en houden hun eigen datum (schuiven niet mee)', bpNa.vervalt_op, bp.vervalt_op);
  const w = (await import('../src/lib/creditWeergave.js')).saldoWeergave(na, 'nl');
  ok('  Studio noemt ze apart', /^Waarvan 25 bijgekocht: die gaan als eerste op en tellen niet mee voor je spaarplafond; ze vervallen op /.test(w.bijgekocht), true);
  db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = 4").run();
  const st = await creditSaldo(env, { customerId: 4 });
  ok('  na opzeggen gelden ze tot hun eigen datum', st.bijgekocht.vervalt.map((v) => v.op), [bp.vervalt_op]);
  db.prepare("UPDATE subscriptions SET status = 'active' WHERE id = 4").run();
}

/* ── 7 · TERUGBETAALD EN TERUGGEBOEKT ─────────────────────────────────────── */
console.log('\n7 · terugbetaald en teruggeboekt, zoals bij een termijn');
{
  const b = await maakAankoop(env, { customerId: 5, sub: sub(5), pakket: 25, origin: 'https://visuails.com' });
  const pid = aankoop(b.id).mollie_payment_id;
  zetBetaald(pid);
  await webhook(pid);
  ok('Starter koopt 25', await creditsBeschikbaar(env, 5), 25);
  mollieBetalingen.set(pid, { ...mollieBetalingen.get(pid), amountChargedBack: { value: mollieBetalingen.get(pid).amount.value, currency: 'EUR' } });
  await webhook(pid);
  ok('teruggeboekt: bevroren (8.11)', [await creditsBeschikbaar(env, 5), (await creditSaldo(env, { customerId: 5 })).bevroren], [0, 25]);
  const { amountChargedBack, ...zonder } = mollieBetalingen.get(pid);
  mollieBetalingen.set(pid, zonder);
  await webhook(pid);
  const vrij = db.prepare("SELECT aantal, soort FROM credit_boek WHERE customer_id = 5 AND reden = 'vrijgegeven'").get();
  ok('Mollie draait het terug: weer vrij, en nog steeds bijgekocht', [await creditsBeschikbaar(env, 5), vrij?.soort, (await creditSaldo(env, { customerId: 5 })).bevroren], [25, 'bijgekocht', 0]);
  const b2 = await maakAankoop(env, { customerId: 5, sub: sub(5), pakket: 10, origin: 'https://visuails.com' });
  const pid2 = aankoop(b2.id).mollie_payment_id;
  zetBetaald(pid2);
  await webhook(pid2);
  mollieBetalingen.set(pid2, { ...mollieBetalingen.get(pid2), status: 'refunded', amountRefunded: mollieBetalingen.get(pid2).amount });
  await webhook(pid2);
  ok('terugbetaald: het ongebruikte deel vervalt (V49)', [db.prepare("SELECT -aantal AS n FROM credit_boek WHERE customer_id = 5 AND reden = 'terugbetaald'").get()?.n, await creditsBeschikbaar(env, 5)], [10, 25]);
}

/* ── 8 · DE HINT ──────────────────────────────────────────────────────────── */
console.log('\n8 · "Overstappen naar … is voordeliger", alleen als het waar is');
{
  const h = await overstapHint(env.DB, sub(5), { pakket: 50 });
  ok(`Starter + 50 (${PLAN_AMOUNT.starter} + ${bijkoopPrijs(PLAN_AMOUNT.starter, PLAN_CREDITS.starter, 50)}) tegen Pro ${PLAN_AMOUNT.studio}: wel`, [h?.naar, h?.reden], ['studio', 'pakket']);
  ok('  binnen de marge van de data', PLAN_AMOUNT.studio - (PLAN_AMOUNT.starter + bijkoopPrijs(PLAN_AMOUNT.starter, PLAN_CREDITS.starter, 50)) <= OVERSTAP_HINT_MARGE, true);
  ok('Starter + 25: niet', await overstapHint(env.DB, { ...sub(5), customer_id: 99 }, { pakket: 25 }), null);
  ok('Pro + 50 tegen Merk: niet', await overstapHint(env.DB, { ...sub(1), customer_id: 99 }, { pakket: 50 }), null);
  ok('Merk heeft geen volgend plan', await overstapHint(env.DB, { plan: 'brand', status: 'active', customer_id: 99 }, { pakket: 50 }), null);
  /* Twee maanden op rij: Starter die elke maand 50 bijkocht. */
  const nu = new Date();
  const vorig = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() - 1, 15)).toISOString().slice(0, 7);
  db.prepare(`INSERT INTO credit_aankopen (customer_id, subscription_id, pakket, net_cents, vat_cents, gross_cents, maand, status) VALUES (5, 5, 50, 39000, 0, 39000, ?, 'paid'), (5, 5, 50, 39000, 0, 39000, ?, 'paid')`).run(vorig, nu.toISOString().slice(0, 7));
  ok('twee maanden op rij 50 bij Starter: wel, zonder pakket', (await overstapHint(env.DB, sub(5)))?.reden, 'twee-maanden');
  ok('één maand: niet', (await overstapHint(env.DB, { ...sub(2), customer_id: 2 })), null);
}

/* ── 9 · STUDIO, ZONDER SCRIPT ────────────────────────────────────────────── */
console.log('\n9 · Studio: het formulier, de POST en de terugkeer, zonder script');
const klantToken = 'bijkoop-sessie-000000001';
db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(klantToken));
const { accountPost, studioScreen, accountGet } = await import('../src/lib/account.js');
const scherm = async (pad, taal = 'nl') => studioScreen({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_account=${klantToken}; vis_lang=${taal}` } }), env, waitUntil() {} }, 'plan');
{
  const pagina = lees('src/pages/account/plan.astro');
  ok('de pagina: een gewoon formulier naar /account/plan/bijkopen, met keuzerondjes', /<form method="post" action="\/account\/plan\/bijkopen"/.test(pagina) && /type="radio" name="pakket"/.test(pagina), true);
  ok('  zonder script en zonder inline stijl', /<script|style=/.test(pagina.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), false);
  const s = await scherm('/account/plan?pakket=10');
  const b = s.v.bijkoop;
  ok('het blok staat er bij een lopend abonnement', !!b, true);
  ok('  drie pakketten met prijs excl. btw, incl. btw en per credit', b.pakketten.map((p) => [p.credits, p.prijs, p.sub]),
    [[10, '€ 66,00 excl. btw', '€ 79,86 incl. btw · € 6,60 per credit'], [25, '€ 157,00 excl. btw', '€ 189,97 incl. btw · € 6,28 per credit'], [50, '€ 297,00 excl. btw', '€ 359,37 incl. btw · € 5,94 per credit']]);
  ok('  het gekozen pakket uit de link van stap 5', b.pakketten.find((p) => p.gekozen)?.credits, 10);
  ok('  wat er deze maand nog kan', b.ruimte, `Deze maand kun je nog ${BIJKOOP_MAX_PER_MAAND - 25} credits bijkopen (hoogstens ${BIJKOOP_MAX_PER_MAAND} per maand).`);
  ok('  de korting staat erbij', b.pakketten.map((p) => p.korting), ['', '5% korting', '10% korting']);
  ok('  het saldo noemt de bijgekochte', /^Waarvan 5 bijgekocht/.test(s.v.saldo.bijgekocht), true);
  const en = await scherm('/account/plan', 'en');
  ok('EN: "Buy extra credits", "excl. VAT"', [en.v.bijkoop.h, en.v.bijkoop.pakketten[1].prijs], ['Buy extra credits', '€157.00 excl. VAT']);
  const post = (velden, origin = 'https://visuails.com') => accountPost({ request: new Request('https://visuails.com/account/plan/bijkopen', {
    method: 'POST', headers: { cookie: `vis_account=${klantToken}`, 'content-type': 'application/x-www-form-urlencoded', ...(origin ? { origin } : {}) },
    body: new URLSearchParams(velden).toString(),
  }), env, waitUntil() {} });
  const zonder = await post({ pakket: '10' }, null);
  ok('een POST zonder Origin (van een andere site): geweigerd', zonder.status, 403);
  const voorAantal = db.prepare('SELECT COUNT(*) AS n FROM credit_aankopen WHERE customer_id = 1').get().n;
  const r = await post({ pakket: '10', verder: '/start/catalog/' });
  const html = await r.text();
  ok('met Origin: het tussenscherm naar Mollie', [r.status, /https:\/\/www\.mollie\.com\/checkout\//.test(html)], [200, true]);
  ok('  en één nieuwe aankoop', db.prepare('SELECT COUNT(*) AS n FROM credit_aankopen WHERE customer_id = 1').get().n, voorAantal + 1);
  const nieuw = db.prepare('SELECT * FROM credit_aankopen WHERE customer_id = 1 ORDER BY id DESC LIMIT 1').get();
  ok('te veel: terug met een melding, niets aangemaakt', await (async () => {
    /* 25 betaald + 10 open + 50 betaald = 85: een pakket van 50 past niet meer. */
    db.prepare(`INSERT INTO credit_aankopen (customer_id, subscription_id, pakket, net_cents, vat_cents, gross_cents, maand, status) VALUES (1, 1, 50, 29700, 0, 29700, ?, 'paid')`).run(vandaag.slice(0, 7));
    const t = await post({ pakket: '50' });
    return [t.status, t.headers.get('location'), db.prepare('SELECT COUNT(*) AS n FROM credit_aankopen WHERE customer_id = 1').get().n];
  })(), [303, '/account/plan?fout=bijkoop-te-veel#bijkopen', voorAantal + 2]);
  ok('  en die melding is een zin', (await scherm('/account/plan?fout=bijkoop-te-veel')).v.melding, `Dat past niet meer binnen de ${BIJKOOP_MAX_PER_MAAND} credits per maand. Er is niets veranderd.`);
  /* Terug van Mollie vóór de webhook: de pagina vraagt het zelf op. */
  zetBetaald(nieuw.mollie_payment_id);
  const terug = await scherm(`/account/plan?bijkoop=${nieuw.id}&verder=%2Fstart%2Fcatalog%2F`);
  ok('terug van Mollie (webhook nog niet geweest): verwerkt en bevestigd', [aankoop(nieuw.id).status, /^Je 10 extra credits staan erbij\. Ze gaan als eerste op en blijven geldig tot en met /.test(terug.v.bevestiging)], ['paid', true]);
  ok('  met de weg terug naar de bestelling', terug.v.bijkoop.verder, { href: '/start/catalog/', label: 'Verder met je bestelling' });
  const ander = await scherm(`/account/plan?bijkoop=${r2.id}`);
  ok('de aankoop van een ander zegt niets', [ander.v.bevestiging, ander.v.melding], ['', '']);
}

/* ── 10 · STAP 5 EN /admin ────────────────────────────────────────────────── */
console.log('\n10 · stap 5 (de gegevens) en /admin');
{
  const f = await bijkoopVoorFormulier(env, 5, { lang: 'nl' });
  ok('stap 5 krijgt de pakketten met prijs en de ruimte', [f.pakketten.map((p) => [p.credits, p.euros]), typeof f.ruimte], [[[10, 87], [25, 206], [50, 390]], 'number']);
  /* Klant 5 kocht twee maanden op rij bij (blok 8): dan geldt de hint bij elk
     pakket; bij 50 ook om het pakket zelf. */
  ok('  en de hint, met de reden waarom', f.pakketten.map((p) => [p.hint?.naam || null, p.hint?.reden || null]), [['Pro', 'twee-maanden'], ['Pro', 'twee-maanden'], ['Pro', 'pakket']]);
  ok('  niets voor een gepauzeerd abonnement', await bijkoopVoorFormulier(env, 3), null);
  const flow = lees('src/components/order/OrderFlow.astro');
  ok('OrderFlow: de zin "Je komt … tekort. Koop … bij" in NL en EN', /tekort: 'Je komt \{tekort\} credits tekort\. Koop \{pakket\} credits bij voor \{bedrag\} excl\. btw/.test(flow) && /tekort: 'You are \{tekort\} credits short\. Buy \{pakket\} credits/.test(flow), true);
  const pl = lees('src/scripts/pipeline.js');
  ok('pipeline.js kiest het kleinste pakket dat het tekort dekt en past', /x\.credits >= tekort && x\.credits <= ruimte/.test(pl), true);
  ok('  en linkt naar Studio met het pakket en de weg terug', /\/account\/plan\/\?pakket=\$\{p\.credits\}&verder=\$\{terug\}#bijkopen/.test(pl), true);
  const adminToken = 'bijkoop-admin-000000001';
  db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')`);
  db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
  const { adminGet } = await import('../src/lib/admin.js');
  const html = await (await adminGet({ request: new Request('https://visuails.com/admin/customers/1', { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} })).text();
  ok('/admin: "Extra credits gekocht" met pakket, bedrag, status en factuur', /Extra credits gekocht/.test(html) && /25 credits &middot; Pro/.test(html) && /betaald/.test(html) && /\/admin\/plan-invoices\/\d+\/pdf/.test(html), true);
  ok('  en in het creditboek "Extra credits bijgekocht"', /Extra credits bijgekocht/.test(html), true);
  ok('  /admin/facturen: soort "extra credits"', /extra credits/.test(await (await adminGet({ request: new Request(`https://visuails.com/admin/facturen?kwartaal=${vandaag.slice(0, 4)}-Q${Math.floor(Number(vandaag.slice(5, 7)) / 3.01) + 1}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} })).text()), true);
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
