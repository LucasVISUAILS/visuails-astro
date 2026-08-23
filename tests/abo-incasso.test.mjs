/* VISUAILS — een incasso die niet doorgaat.  Draaien met:  npm run test:incasso
 *
 * ── WAAROM DIT BESTAND ER IS ─────────────────────────────────────────────────
 *
 * Tot 23 augustus 2026 deed de webhook met een mislukte abonnementsafschrijving
 * niets. Hij viel door de poort voor mislukte BESTELbetalingen, zocht daar naar
 * `metadata.order_ref` — een sleutel die een incasso niet heeft — vond niets, en
 * gaf Mollie een 200. Geen rij, geen mail, geen pauze.
 *
 * Het bewijs dat het gat er was, stond twee bestanden verderop: cron/index.js
 * meldt abonnementen met `pause_reason = 'payment_failed'` aan Lucas en
 * account.js heeft er een klanttekst voor, terwijl NIETS in de codebase die
 * waarde ooit schreef. Twee schermen die wachtten op een toestand die niet kon
 * ontstaan.
 *
 * ── WAT HIER BEWEZEN WORDT, EN WAT NIET ──────────────────────────────────────
 *
 * Het scharnier is niet "wordt er gepauzeerd" maar "wordt er op het JUISTE moment
 * gepauzeerd". Mollie int niet één keer: mislukt een termijn, dan probeert hij het
 * opnieuw, en pas als die pogingen op zijn zet hij het abonnement op `suspended`.
 * Meteen pauzeren zou een klant het saldo afnemen waarvoor hij vorige maand
 * betaald heeft — verbruikToestaan() laat een gepauzeerd abonnement niets
 * besteden — terwijl Mollie het bedrag de dag erna alsnog int.
 *
 * Vandaar dat elke toets hieronder over dat onderscheid gaat. Dat is ook de
 * enige reden dat de Mollie-status hier gestubd wordt: die kun je in een
 * testcheckout niet op commando op `suspended` zetten.
 *
 * fetch en D1 zijn gestubd; de handler zelf is het bestand dat gedeployd wordt,
 * rechtstreeks geïmporteerd. */
import { onRequestPost } from '../functions/api/webhook/mollie.js';

/* Een mislukte incasso zoals Mollie hem aflevert. Let op wat er NIET in staat:
   geen `metadata.order_ref`. Dat is precies wat de oude code liet struikelen. */
const MISLUKT = (over = {}) => ({
  resource: 'payment',
  id: 'tr_9KpQmXf2Ld',
  mode: 'test',
  createdAt: '2026-08-20T03:00:00+00:00',
  failedAt: '2026-08-20T03:00:41+00:00',
  amount: { value: '390.00', currency: 'EUR' },
  description: 'VISUAILS Studio — augustus',
  method: 'directdebit',
  sequenceType: 'recurring',
  status: 'failed',
  subscriptionId: 'sub_8JfGzs6v3K',
  customerId: 'cst_stTC2WHAuS',
  ...over,
});

function form(id) {
  return new Request('https://visuails.com/api/webhook/mollie', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `id=${encodeURIComponent(id)}`,
  });
}

const ABO = (over = {}) => ({
  id: 42,
  ref: 'VIS-ABO-7T2',
  plan: 'studio',
  status: 'active',
  mollie_customer_id: 'cst_stTC2WHAuS',
  mollie_subscription_id: 'sub_8JfGzs6v3K',
  email: 'klant@voorbeeld.nl',
  brand: 'Voorbeeldmerk',
  ...over,
});

/* D1-stub. Legt vast wát er geschreven is, want daar gaat elke toets over. */
function db({ abo = ABO(), geenTabel = false } = {}) {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      const st = {
        _sql: sql, _args: [],
        bind(...a) { st._args = a; return st; },
        async first() {
          if (sql.includes('FROM subscriptions')) {
            if (geenTabel) throw new Error('D1_ERROR: no such table: subscriptions');
            return abo;
          }
          if (sql.includes('UPDATE subscriptions')) {
            writes.push(['pauze', st._args]);
            return { id: abo?.id, status: 'paused' };
          }
          return null;
        },
        async run() {
          if (sql.includes('INSERT INTO subscription_payments')) writes.push(['betaalrij', st._args]);
          else if (sql.includes('UPDATE subscriptions')) writes.push(['pauze', st._args]);
          else if (sql.includes('INSERT INTO orders')) writes.push(['order', st._args]);
          return { success: true };
        },
        async all() { return { results: [] }; },
      };
      return st;
    },
  };
}

/* fetch-stub: eerst de betaling, daarna het abonnement. De handler haalt de
   betaling op met /payments/<id> en de status met /customers/../subscriptions/.. */
let calls = [];
function stubFetch({ betaling = MISLUKT(), aboStatus = 'active', aboFaalt = false } = {}) {
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('/subscriptions/')) {
      if (aboFaalt) return new Response('nope', { status: 503 });
      return new Response(JSON.stringify({ resource: 'subscription', id: 'sub_8JfGzs6v3K', status: aboStatus }),
        { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify(betaling),
      { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

const stil = { log: console.log, warn: console.warn, error: console.error };
const mute = () => { console.log = console.warn = console.error = () => {}; };
const unmute = () => Object.assign(console, stil);

const R = [];
const toets = (naam, verwacht, gekregen) => R.push({
  naam, verwacht: String(verwacht), gekregen: String(gekregen),
  pass: JSON.stringify(verwacht) === JSON.stringify(gekregen),
});

/* Geen RESEND_API_KEY: dan verstuurt notify.js niets en gaat er ook niets stuk.
   Dat is met opzet — deze toetsen gaan over de database en de pauze, niet over
   de mail, en een echte mailaanroep in een test is een test die post verstuurt. */
const ENV = { MOLLIE_API_KEY: 'test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM' };

// ── 1 · Mollie probeert het nog. Vastleggen en melden, NIET pauzeren. ─────────
{
  calls = []; mute();
  stubFetch({ aboStatus: 'active' });
  const d = db();
  const r = await onRequestPost({ request: form('tr_9KpQmXf2Ld'), env: { ...ENV, DB: d } });
  unmute();
  const soorten = d.writes.map((w) => w[0]);
  toets('mislukte incasso → 200 (Mollie hoeft niet terug te komen)', 200, r.status);
  toets('de mislukking wordt vastgelegd in subscription_payments', true, soorten.includes('betaalrij'));
  toets('en het abonnement wordt NIET gepauzeerd zolang Mollie doorgaat', false, soorten.includes('pauze'));
  toets('de status is bij Mollie opgevraagd', true, calls.some((u) => u.includes('/subscriptions/')));

  const rij = d.writes.find((w) => w[0] === 'betaalrij');
  toets('de rij hangt aan het juiste abonnement', 42, rij?.[1]?.[0]);
  toets('met het betaal-id van Mollie', 'tr_9KpQmXf2Ld', rij?.[1]?.[1]);
  toets('en de status zoals Mollie hem gaf', 'failed', rij?.[1]?.[2]);
  toets('€ 390,00 → 39000 centen', 39000, rij?.[1]?.[3]);
  toets('de maand komt uit failedAt en niet uit vandaag', '2026-08', rij?.[1]?.[5]);
}

// ── 2 · Mollie is ermee gestopt. Nu wél pauzeren, met de juiste reden. ────────
for (const status of ['suspended', 'canceled', 'completed']) {
  calls = []; mute();
  stubFetch({ aboStatus: status });
  const d = db();
  const r = await onRequestPost({ request: form('tr_9KpQmXf2Ld'), env: { ...ENV, DB: d } });
  unmute();
  const pauze = d.writes.find((w) => w[0] === 'pauze');
  toets(`Mollie zegt "${status}" → 200`, 200, r.status);
  toets(`Mollie zegt "${status}" → abonnement gepauzeerd`, true, Boolean(pauze));
  /* DIT IS DE REGEL WAAR ALLES OM DRAAIT. 'payment_failed' en niet 'customer':
     de eerste wordt door de volgende geslaagde afschrijving vanzelf opgeheven
     (zie de UPDATE in recordSubscriptionPaid), de tweede nooit. Ze verwisselen
     betekent dat een klant die zelf pauzeerde ongevraagd weer gaat lopen, of dat
     een betalende klant handmatig hervat moet worden. */
  toets(`Mollie zegt "${status}" → pause_reason is payment_failed`, 'payment_failed', pauze?.[1]?.[1]);
}

// ── 3 · Mollie antwoordt niet. Dan liever niet pauzeren. ─────────────────────
{
  calls = []; mute();
  stubFetch({ aboFaalt: true });
  const d = db();
  const r = await onRequestPost({ request: form('tr_9KpQmXf2Ld'), env: { ...ENV, DB: d } });
  unmute();
  const soorten = d.writes.map((w) => w[0]);
  toets('Mollie onbereikbaar → nog steeds 200', 200, r.status);
  toets('Mollie onbereikbaar → de mislukking is wél vastgelegd', true, soorten.includes('betaalrij'));
  /* Van de twee fouten die hier te maken zijn, is een betalende klant
     buitensluiten de dure. Een dag te laat pauzeren is de goedkope: de volgende
     mislukte incasso komt hier toch weer langs. */
  toets('Mollie onbereikbaar → NIET pauzeren op een gok', false, soorten.includes('pauze'));
}

// ── 4 · Zonder mollie_customer_id valt er niets op te vragen. ────────────────
{
  calls = []; mute();
  stubFetch({ aboStatus: 'suspended' });
  const d = db({ abo: ABO({ mollie_customer_id: null }) });
  const r = await onRequestPost({ request: form('tr_9KpQmXf2Ld'), env: { ...ENV, DB: d } });
  unmute();
  toets('geen klant-id bij Mollie → 200', 200, r.status);
  toets('geen klant-id bij Mollie → geen navraag gedaan', false, calls.some((u) => u.includes('/subscriptions/')));
  toets('geen klant-id bij Mollie → niet gepauzeerd', false, d.writes.map((w) => w[0]).includes('pauze'));
}

// ── 5 · Een onbekend abonnement is luidruchtig, maar geen 500. ───────────────
{
  calls = []; mute();
  stubFetch();
  const d = db({ abo: null });
  const r = await onRequestPost({ request: form('tr_9KpQmXf2Ld'), env: { ...ENV, DB: d } });
  unmute();
  toets('onbekend abonnement → 200 (opnieuw aanbieden helpt niet)', 200, r.status);
  toets('onbekend abonnement → niets geschreven', 0, d.writes.length);
}

// ── 6 · Zonder migratie 0030 valt er niets te doen, en niets om te vallen. ───
{
  calls = []; mute();
  stubFetch();
  const d = db({ geenTabel: true });
  const r = await onRequestPost({ request: form('tr_9KpQmXf2Ld'), env: { ...ENV, DB: d } });
  unmute();
  toets('geen subscriptions-tabel → 200 en geen crash', 200, r.status);
}

// ── 7 · De poort zelf: een mislukte BESTELbetaling gaat nog de oude weg. ─────
//
// Dit is de regressietoets op de wijziging. De nieuwe tak staat vóór de
// bestelroute, en als hij te breed was zou hij bestellingen opslokken.
{
  calls = []; mute();
  const bestelling = { ...MISLUKT(), subscriptionId: undefined, metadata: { order_ref: 'VIS-ABCD-EF1' } };
  delete bestelling.subscriptionId;
  stubFetch({ betaling: bestelling });
  const d = db();
  const r = await onRequestPost({ request: form('tr_9KpQmXf2Ld'), env: { ...ENV, DB: d } });
  unmute();
  toets('mislukte bestelbetaling → 200', 200, r.status);
  toets('mislukte bestelbetaling → geen abonnementsrij geschreven', false, d.writes.map((w) => w[0]).includes('betaalrij'));
  toets('mislukte bestelbetaling → geen abonnement gepauzeerd', false, d.writes.map((w) => w[0]).includes('pauze'));
}

// ── 8 · De toestand die tot vandaag niet kon ontstaan, kan nu ontstaan. ──────
//
// Geen stub en geen webhook: dit leest de twee plekken die op 'payment_failed'
// wachten, plus de plek die hem nu schrijft. Zonder deze toets zou de hele
// wijziging groen kunnen zijn terwijl de waarde nergens vandaan komt.
{
  const fs = await import('node:fs');
  const bron = fs.readFileSync(new URL('../functions/api/webhook/mollie.js', import.meta.url), 'utf8');
  const cron = fs.readFileSync(new URL('../cron/index.js', import.meta.url), 'utf8');
  const acc = fs.readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');
  toets('de webhook schrijft payment_failed', true, /['"]payment_failed['"]/.test(bron));
  toets('de cron leest payment_failed', true, /payment_failed/.test(cron));
  toets('de klanttekst leest payment_failed', true, /payment_failed/.test(acc));
}

const w = Math.max(...R.map((r) => r.naam.length));
for (const r of R) console.log(`${r.pass ? ' ok ' : 'FOUT'}  ${r.naam.padEnd(w)}  verwacht ${r.verwacht.padEnd(16)} kreeg ${r.gekregen}`);
const stuk = R.filter((r) => !r.pass).length;
console.log(`\n${R.length - stuk}/${R.length} geslaagd`);
process.exit(stuk ? 1 : 0);
