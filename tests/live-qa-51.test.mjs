/**
 * Wat de controle op visuails.com van 15 oktober 2026 vond (levering 51b).
 *
 *   node tests/live-qa-51.test.mjs        (geen server, geen browser)
 *
 * Wat hier vastligt (zie kladblok/LEVERING-51.md, deel 5):
 *   L01 · een mandaat in 'pending' is genoeg om het Mollie-abonnement aan te
 *         maken (Mollie: "pending or valid"); zonder dat liep een abonnement in
 *         Studio als "Loopt" zonder dat er ooit nog werd afgeschreven;
 *   L02 · Studio, hervatten en de nachtcontrole proberen het koppelen opnieuw,
 *         op de termijndag van het abonnement en niet op die van vandaag;
 *   L01b · en nooit dubbel: één tegelijk (een slot), eerst kijken of Mollie hem
 *         al heeft, 'pending' alleen na een betaalde eerste maand, Studio
 *         hoogstens één poging per minuut;
 *   L03 · een pauze die nog moet ingaan: de rij "Status" en de zin onder
 *         Overstappen zeggen wat er gebeurt en hoe overstappen wél kan;
 *   L04 · opgezegd: de credits gelden "tot en met <datum>", zoals in de mail;
 *   L05 · /start/plan: het veld credits van Op maat houdt het formulier niet
 *         meer stil tegen als er een ander plan gekozen is;
 *   L06 · afbreken alleen bij lange woorden, velden niet achter de balk, en de
 *         bedankpagina met de tekstmaat voor de zin en niet voor zin + nummer;
 *   L07 · een geannuleerde creditsbestelling: "Teruggezet", geen factuurlink en
 *         geen zin over een betaling;
 *   L08 · de melding onderin de site niet voor een geannuleerde bestelling;
 *   L09 · /admin/log: elke actie een Nederlandse naam, "Wie" op één regel.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import { termijnEinde, termijnMaand, termijnDag } from '../src/lib/subscription.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(74)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — wat de controle op de live site vond (15 oktober 2026)\n');

/* ── DE WERELD ──────────────────────────────────────────────────────────── */
const mails = [];
const mollie = [];
/* Per Mollie-klant de mandaten die Mollie teruggeeft. */
const mandaten = {
  cst_pend: [{ id: 'mdt_pend', status: 'pending', method: 'directdebit', createdAt: '2026-10-15T10:00:00+00:00' }],
  cst_hrv: [{ id: 'mdt_hrv', status: 'valid', method: 'directdebit', createdAt: '2026-09-01T10:00:00+00:00' }],
  cst_nacht: [{ id: 'mdt_nacht', status: 'pending', method: 'directdebit', createdAt: '2026-10-14T10:00:00+00:00' }],
  cst_leeg: [],
};
let subNr = 0;
/* Per Mollie-klant de abonnementen die Mollie al heeft (voor de dubbel-toets). */
const bijMollie = {};
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com')) { mails.push(JSON.parse(String(opts.body || '{}'))); return new Response(JSON.stringify({ id: 'm' }), { status: 200 }); }
  if (u.includes('api.mollie.com')) {
    const methode = opts.method || 'GET';
    mollie.push({ url: u, method: methode, body: opts.body ? JSON.parse(String(opts.body)) : null });
    const j = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } });
    const m = u.match(/\/customers\/([^/]+)\/mandates/);
    if (methode === 'GET' && m) { const l = mandaten[decodeURIComponent(m[1])] || []; return j({ count: l.length, _embedded: { mandates: l } }); }
    const ms = u.match(/\/customers\/([^/]+)\/subscriptions\?/);
    if (methode === 'GET' && ms) { const l = bijMollie[decodeURIComponent(ms[1])] || []; return j({ count: l.length, _embedded: { subscriptions: l } }); }
    subNr += 1;
    return j({ id: `sub_l51_${subNr}`, status: 'active' });
  }
  return new Response('{}', { status: 200 });
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema laadt niet:', mislukt.slice(0, 3)); process.exit(1); }
const env = { DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@visuails.com', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz1234' };

const nu = new Date();
const dag = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const vandaag = dag(0);
/* Afgesloten acht dagen geleden: de termijndag is dan niet die van vandaag. */
const begonnen = `${dag(-8)} 09:00:00`;

const klant = (id, naam) => db.prepare(`INSERT INTO customers (id, email, brand, name, first_name, country) VALUES (?, ?, ?, ?, ?, 'NL')`)
  .run(id, `${naam.toLowerCase()}@voorbeeld-merk.test`, naam.toUpperCase(), `${naam} Proef`, naam);
klant(1, 'Pend'); klant(2, 'Hervat'); klant(3, 'Nacht'); klant(4, 'Leeg'); klant(5, 'Straks'); klant(6, 'Weg');
const abo = db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, created_at, paused_at, pause_reason,
                         mollie_customer_id, mollie_mandate_id, mollie_subscription_id) VALUES (?, ?, ?, 'studio', 'monthly', ?, ?, ?, ?, ?, ?, ?, ?)`);
abo.run(1, 1, 'SUB-PEND', 'active', begonnen, begonnen, null, null, 'cst_pend', null, null);
abo.run(2, 2, 'SUB-HRVT', 'paused', begonnen, begonnen, `${dag(-2)} 09:00:00`, 'customer', 'cst_hrv', null, null);
abo.run(3, 3, 'SUB-NACHT', 'active', begonnen, begonnen, null, null, 'cst_nacht', null, null);
abo.run(4, 4, 'SUB-LEEG', 'active', begonnen, begonnen, null, null, 'cst_leeg', null, null);
abo.run(5, 5, 'SUB-STRAKS', 'paused', begonnen, begonnen, `${dag(6)} 00:00:00`, 'customer', 'cst_straks', 'mdt_straks', null);
abo.run(6, 6, 'SUB-WEG', 'cancelled', begonnen, begonnen, null, null, 'cst_weg', 'mdt_weg', null);
for (const id of [1, 2, 3, 4, 5, 6]) db.prepare("INSERT INTO subscription_months (subscription_id, month, granted) VALUES (?, ?, 120)").run(id, termijnMaand({ started_at: begonnen }, nu));
db.prepare(`INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, maand, vervalt_op, rest, sleutel, door)
            VALUES (6, 6, ?, 120, 'termijn', ?, ?, 120, 'termijn:6:nu', 'test')`).run(begonnen, begonnen.slice(0, 7), dag(80));

const tokens = {};
for (const id of [1, 5, 6]) {
  tokens[id] = `l51-token-${id}`;
  db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (?, ?, '2099-01-01T00:00:00Z')`).run(id, await hashToken(tokens[id]));
}
const { studioScreen } = await import('../src/lib/account.js');
const { firstPaymentMandate } = await import('../src/lib/mollie.js');
const { hervatIncasso, volgendeTermijn, eersteTermijn } = await import('../src/lib/subscribe.js');
const { tasks } = await import('../cron/index.js');
const scherm = async (id, taal = 'nl') => studioScreen({ request: new Request('https://visuails.com/account/plan', { headers: { cookie: `vis_account=${tokens[id]}; vis_lang=${taal}` } }), env, waitUntil() {} }, 'plan');
const rij = (id) => db.prepare('SELECT status, mollie_mandate_id, mollie_subscription_id FROM subscriptions WHERE id = ?').get(id);
const termijnVan = termijnEinde({ started_at: begonnen }, termijnMaand({ started_at: begonnen }, nu));

/* ── L01 · WELK MANDAAT ────────────────────────────────────────────────── */
console.log('L01 · een mandaat in behandeling telt mee');
mandaten.cst_mix = [
  { id: 'mdt_oud', status: 'valid', createdAt: '2026-01-01T00:00:00+00:00' },
  { id: 'mdt_nieuw_pend', status: 'pending', createdAt: '2026-10-01T00:00:00+00:00' },
  { id: 'mdt_nieuw', status: 'valid', createdAt: '2026-06-01T00:00:00+00:00' },
  { id: 'mdt_weg', status: 'invalid', createdAt: '2026-10-10T00:00:00+00:00' },
];
mandaten.cst_alleen_pend = [
  { id: 'mdt_p1', status: 'pending', createdAt: '2026-10-01T00:00:00+00:00' },
  { id: 'mdt_p2', status: 'pending', createdAt: '2026-10-02T00:00:00+00:00' },
];
mandaten.cst_ongeldig = [{ id: 'mdt_x', status: 'invalid', createdAt: '2026-10-01T00:00:00+00:00' }];
ok('geldig gaat voor in behandeling, en dan het nieuwste geldige', (await firstPaymentMandate(env, 'cst_mix'))?.id, 'mdt_nieuw');
ok('alleen in behandeling: het nieuwste daarvan', (await firstPaymentMandate(env, 'cst_alleen_pend'))?.id, 'mdt_p2');
ok('alleen ongeldig: geen mandaat', await firstPaymentMandate(env, 'cst_ongeldig'), null);
ok('geen mandaten: geen mandaat', await firstPaymentMandate(env, 'cst_leeg'), null);
ok('de kop van firstPaymentMandate noemt de bron (Mollie)', /pending or valid/.test(lees('src/lib/mollie.js')), true);

/* ── L02 · OPNIEUW KOPPELEN ────────────────────────────────────────────── */
console.log('\nL02 · Studio, hervatten en de nacht koppelen alsnog');
ok('volgendeTermijn: de dag van het abonnement, na vandaag', [volgendeTermijn({ started_at: begonnen }, nu), volgendeTermijn({ started_at: begonnen }, nu) > vandaag], [termijnVan, true]);
ok('en de dag is de termijndag (uit started_at)', Number(termijnVan.slice(8, 10)), termijnDag({ started_at: begonnen }));
ok('zonder bruikbare datum: eersteTermijn()', volgendeTermijn({}, nu), eersteTermijn(nu));
ok('een lopend abonnement zonder started_at (van vóór 15 oktober): de dag van created_at', volgendeTermijn({ status: 'active', created_at: begonnen }, nu), termijnVan);
ok('voor een vers abonnement hetzelfde als eersteTermijn()', volgendeTermijn({ started_at: `${vandaag} 10:00:00` }, nu), eersteTermijn(nu));

mollie.length = 0;
let s = await scherm(1);
const aangemaakt = mollie.find((m) => m.method === 'POST' && /\/customers\/cst_pend\/subscriptions/.test(m.url));
ok('Studio opent Abonnement: het Mollie-abonnement wordt alsnog aangemaakt', !!aangemaakt, true);
ok('op het mandaat in behandeling', aangemaakt?.body?.mandateId, 'mdt_pend');
ok('vanaf de termijndag van het abonnement', aangemaakt?.body?.startDate, termijnVan);
ok('en de rij heeft nu het mandaat en het abonnement', [rij(1).mollie_mandate_id, /^sub_l51_/.test(rij(1).mollie_subscription_id || '')], ['mdt_pend', true]);
ok('Overstappen mag weer (er is een incasso)', s.v.overstap?.mag, true);
mollie.length = 0;
await scherm(1);
ok('een tweede keer openen maakt niets nieuws aan', mollie.filter((m) => m.method === 'POST').length, 0);

const sub2 = db.prepare('SELECT * FROM subscriptions WHERE id = 2').get();
mollie.length = 0;
const hervat = await hervatIncasso(env, sub2, 'https://visuails.com', { startDate: termijnVan });
ok('hervatten zonder mandaat op de rij: het wordt opgevraagd en het lukt', hervat, true);
ok('en opgeslagen', rij(2).mollie_mandate_id, 'mdt_hrv');
ok('de incasso hervat op dat mandaat', mollie.find((m) => m.method === 'POST')?.body?.mandateId, 'mdt_hrv');
const sub4 = db.prepare('SELECT * FROM subscriptions WHERE id = 4').get();
ok('zonder enig mandaat bij Mollie: hervatten lukt niet (geen fout)', await hervatIncasso(env, { ...sub4, status: 'paused' }, 'https://visuails.com'), false);

mollie.length = 0;
const regel = await tasks.incassoSignalen(env);
ok('de nacht koppelt een lopend abonnement zonder Mollie-abonnement', /^sub_l51_/.test(rij(3).mollie_subscription_id || ''), true);
ok('en meldt dat in het rapport', /1 abonnement alsnog aan Mollie gekoppeld/.test(regel), true);
ok('zonder mandaat: in het rapport, met kenmerk', /1 lopend abonnement zonder incasso bij Mollie.*SUB-LEEG/.test(regel), true);
ok('SUB-LEEG blijft zonder Mollie-abonnement', rij(4).mollie_subscription_id, null);

/* ── L01b · NA DE CONTROLE VAN DE WIJZIGING: GEEN DUBBELE INCASSO ──────── */
console.log('\nL01b · één Mollie-abonnement, en alleen na een betaalde eerste maand');
{
  const { koppelSubscription, pakSlot } = await import('../src/lib/subscribe.js');
  const { loadSubscription } = await import('../src/lib/subscription.js');
  klant(9, 'Open'); klant(10, 'Slot'); klant(11, 'Dubbel'); klant(12, 'Traag');
  mandaten.cst_open = [{ id: 'mdt_open', status: 'pending', createdAt: '2026-10-15T10:00:00+00:00' }];
  mandaten.cst_slot = [{ id: 'mdt_slot', status: 'valid', createdAt: '2026-10-15T10:00:00+00:00' }];
  mandaten.cst_dubbel = [{ id: 'mdt_dubbel', status: 'valid', createdAt: '2026-10-15T10:00:00+00:00' }];
  bijMollie.cst_dubbel = [{ id: 'sub_al_bij_mollie', status: 'active', description: 'VISUAILS studio — SUB-DUBBEL' }, { id: 'sub_oud', status: 'canceled', description: 'VISUAILS studio — SUB-DUBBEL' }];
  abo.run(9, 9, 'SUB-OPEN', 'pending', null, begonnen, null, null, 'cst_open', null, null);
  abo.run(10, 10, 'SUB-SLOT', 'active', begonnen, begonnen, null, null, 'cst_slot', null, null);
  abo.run(11, 11, 'SUB-DUBBEL', 'active', begonnen, begonnen, null, null, 'cst_dubbel', null, null);
  abo.run(12, 12, 'SUB-TRAAG', 'active', begonnen, begonnen, null, null, 'cst_leeg', null, null);

  mollie.length = 0;
  let uit = await koppelSubscription(env, await loadSubscription(env, 9), 'https://visuails.com');
  ok('eerste betaling nog open (mandaat pending, rij pending): wacht, niets aangemaakt', [uit.staat, mollie.filter((m) => m.method === 'POST').length, rij(9).status], ['wacht', 0, 'pending']);
  ok('en het slot is weer vrij', !!db.prepare("SELECT 1 FROM rate_limits WHERE bucket = 'koppel:9'").get(), false);

  ok('een tweede aanroeper terwijl het slot bezet is: wacht, "bezig"', await pakSlot(env, 'koppel:10', 120), true);
  mollie.length = 0;
  uit = await koppelSubscription(env, await loadSubscription(env, 10), 'https://visuails.com');
  ok('  en hij roept Mollie niet aan', [uit.staat, uit.bezig, mollie.length], ['wacht', true, 0]);
  db.prepare("UPDATE rate_limits SET expires_at = '2000-01-01T00:00:00.000Z' WHERE bucket = 'koppel:10'").run();
  uit = await koppelSubscription(env, await loadSubscription(env, 10), 'https://visuails.com');
  ok('een verlopen slot (een poging die halverwege stopte) wordt overgenomen', uit.staat, 'gelukt');

  mollie.length = 0;
  uit = await koppelSubscription(env, await loadSubscription(env, 11), 'https://visuails.com');
  ok('staat hij bij Mollie al (antwoord kwam niet aan): die, en geen tweede', [uit.staat, rij(11).mollie_subscription_id, mollie.filter((m) => m.method === 'POST').length], ['gelukt', 'sub_al_bij_mollie', 0]);

  const { volgendeTermijn: vt, eersteTermijn: et } = await import('../src/lib/subscribe.js');
  ok('nog niet geactiveerd en geen started_at: de termijndag van vandaag, niet van created_at', vt({ status: 'pending', created_at: `${dag(-1)} 23:50:00` }, nu), et(nu));

  tokens[12] = 'l51-token-12';
  db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (12, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(tokens[12]));
  mollie.length = 0;
  await scherm(12);
  const eerste = mollie.length;
  await scherm(12);
  ok('Studio zonder mandaat bij Mollie: één poging, de tweede keer openen binnen een minuut niet', [eerste > 0, mollie.length], [true, eerste]);
  ok('de pagina wacht hoogstens 5 seconden op Mollie', /setTimeout\(\(\) => klaar\(\{ staat: 'traag' \}\), 5000\)/.test(lees('src/lib/account.js')), true);
  ok('de webhook probeert het na 3 seconden nog eens als een ander bezig was', /if \(uit\?\.bezig\) \{\s*await new Promise\(\(r\) => setTimeout\(r, 3000\)\)/.test(lees('functions/api/webhook/mollie.js')), true);
  ok('/start/plan: de plekkencheck kiest met een change-event (het veld credits luistert)', /eerste\.checked = true; eerste\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\);/.test(lees('src/components/order/PlanPicker.astro')), true);
}

/* ── L03 · EEN PAUZE DIE NOG MOET INGAAN ───────────────────────────────── */
console.log('\nL03 · een pauze die nog moet ingaan');
s = await scherm(5);
ok('de stand is pauze-straks', s.v.stand, 'pauze-straks');
ok('"Status": loopt tot <datum>, daarna pauze', /^Loopt tot \d+ [a-z]+( \d{4})?, daarna pauze$/.test(s.v.plan?.status || ''), true);
ok('Overstappen zegt hoe het wél kan', /^Je pauze gaat in op \d+ [a-z]+( \d{4})?\. Wil je liever overstappen, kies dan eerst "Toch doorgaan"\.$/.test(s.v.overstap?.niet || ''), true);
const sEn = await scherm(5, 'en');
ok('EN: "Running until …, then paused"', /^Running until .+, then paused$/.test(sEn.v.plan?.status || ''), true);
ok('EN: "Keep going after all"', /choose "Keep going after all" first\.$/.test(sEn.v.overstap?.niet || ''), true);

/* ── L04 · OPGEZEGD: TOT EN MET ────────────────────────────────────────── */
console.log('\nL04 · opgezegd, met de datum');
s = await scherm(6);
ok('de stand is opgezegd', s.v.stand, 'opgezegd');
ok('"geldig tot en met <datum>: 3 maanden na je laatste termijn"', /Je credits blijven geldig tot en met \d+ [a-z]+( \d{4})?: \d+ maanden na je laatste termijn\.$/.test(s.v.standZin), true);
const s6en = await scherm(6, 'en');
ok('EN: "up to and including"', /up to and including .+: \d+ months after/.test(s6en.v.standZin), true);

/* ── L05 · HET VELD CREDITS OP /start/plan ─────────────────────────────── */
console.log('\nL05 · /start/plan: het veld credits van Op maat');
const picker = lees('src/components/order/PlanPicker.astro');
ok('het veld zet zichzelf terug binnen min en max (change, blur)', /function klem\(\)/.test(picker) && /veld\.addEventListener\('change', klem\)/.test(picker) && /veld\.addEventListener\('blur', klem\)/.test(picker), true);
ok('ook meteen bij het laden (?credits=500 uit de link)', /\n {4}klem\(\);\n {4}teken\(\);/.test(picker), true);
ok('uit als een ander plan gekozen is, aan bij Op maat', /veld\.disabled = !\(maat && maat\.checked\)/.test(picker), true);
ok('en bij het versturen nog één keer (vóór de velden verzameld worden)', /vorm\.addEventListener\('submit', function \(\) \{ zetAan\(\); klem\(\); \}, true\)/.test(picker), true);

/* ── L06 · AFBREKEN, SCROLLEN EN DE BEDANKPAGINA ───────────────────────── */
console.log('\nL06 · afbreken, scrollen en de bedankpagina');
const glob = lees('src/styles/global.css');
ok('alleen woorden vanaf tien letters breken af', /hyphenate-limit-chars: 10 4 4;/.test(glob), true);
ok('een veld met een fout komt onder de balk uit', /input, select, textarea \{\s*scroll-margin-top: calc\(var\(--kop-h, 76px\) \+ 28px\);/.test(glob), true);
const hal = lees('src/styles/hal.css');
ok('hal.css: de tekstmaat slaat .ty-verder > li over', /:not\(\.ty-verder > li\)[^{]*\{ max-width: var\(--h-maat\) !important; \}/.test(hal), true);
const ty = lees('src/components/ThankYouPage.astro');
ok('de bedankpagina: de zin krijgt de maat, het nummer komt erbij', /\.ty-verder li \{[^}]*max-width: calc\(var\(--h-maat, 16\.5em\) \+ 1\.8em\);/.test(ty), true);
ok('geen :is() in een regel van hal.css', /:is\(/.test(hal.replace(/\/\*[\s\S]*?\*\//g, '')), false);

/* ── L07 · EEN GEANNULEERDE CREDITSBESTELLING ──────────────────────────── */
console.log('\nL07 · een geannuleerde creditsbestelling');
{
  const { paymentView, COPY } = await import('../src/lib/account.js');
  const basis = { payment_status: 'credits', credits_used: 4, status: 'cancelled', _termijnFacturen: [{ id: 9, number: 'VIS-2026-0099', month: '2026-10' }] };
  const alles = paymentView(COPY.nl, 'nl', { ...basis, _creditsTerug: 4 });
  ok('alles terug: "Betaald met 4 credits" en "Teruggezet 4 credits"', alles.rows, [['Betaald met', '4 credits'], ['Teruggezet', '4 credits']]);
  ok('met de zin dat ze weer op het saldo staan', alles.line, 'De credits staan weer op je saldo.');
  ok('en zonder factuurlink (die dekt deze bestelling niet meer)', alles.facturen, []);
  const deel = paymentView(COPY.nl, 'nl', { ...basis, status: 'delivered', credits_used: 8, _creditsTerug: 2 });
  ok('een deel terug (product niet gemaakt): beide regels, factuur blijft', [deel.rows.length, deel.rows[1][1], deel.facturen.length], [2, '2 credits', 1]);
  const niets = paymentView(COPY.nl, 'nl', { ...basis, status: 'delivered' });
  ok('niets terug: zoals voorheen', [niets.rows.length, niets.line], [1, 'Uit je termijn van oktober.']);
  ok('EN: "Returned" en "back on your balance"', [paymentView(COPY.en, 'en', { ...basis, _creditsTerug: 4 }).rows[1][0], paymentView(COPY.en, 'en', { ...basis, _creditsTerug: 4 }).line], ['Returned', 'The credits are back on your balance.']);

  /* En via Studio zelf: de lezer haalt de teruggeboekte credits uit het creditboek. */
  db.prepare("INSERT INTO customers (id, email, brand, name, first_name, country) VALUES (7, 'terug@voorbeeld-merk.test', 'TERUG', 'Terug Proef', 'Terug', 'NL')").run();
  db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, mollie_customer_id, mollie_mandate_id, mollie_subscription_id)
              VALUES (7, 7, 'SUB-TERUG', 'studio', 'monthly', 'active', ?, 'cst_terug', 'mdt_terug', 'sub_terug')`).run(begonnen);
  db.prepare(`INSERT INTO credit_boek (id, customer_id, subscription_id, datum, aantal, reden, maand, vervalt_op, rest, sleutel, door)
              VALUES (700, 7, 7, ?, 120, 'termijn', ?, ?, 120, 'termijn:7:nu', 'test')`).run(begonnen, begonnen.slice(0, 7), dag(80));
  db.prepare(`INSERT INTO orders (id, ref, customer_id, email, name, brand, service, status, payment_status, credits_used, product_count, total_cents, lang)
              VALUES (70, 'VIS-TERU-G70', 7, 'terug@voorbeeld-merk.test', 'Terug Proef', 'TERUG', 'catalog', 'cancelled', 'credits', 4, 1, 0, 'nl')`).run();
  db.prepare(`INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, order_id, order_ref, partijen, sleutel, door)
              VALUES (7, 7, ?, -4, 'bestelling', 70, 'VIS-TERU-G70', '[{"id":700,"n":4}]', 'bestelling:70', 'klant')`).run(`${dag(-1)} 10:00:00`);
  db.prepare(`INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, order_id, order_ref, vervalt_op, rest, sleutel, door)
              VALUES (7, 7, ?, 4, 'annulering', 70, 'VIS-TERU-G70', ?, 4, 'annulering:70', 'admin')`).run(`${dag(0)} 09:00:00`, dag(90));
  tokens[7] = 'l51-token-7';
  db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (7, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(tokens[7]));
  const r = await studioScreen({ request: new Request('https://visuails.com/account/orders?order=70', { headers: { cookie: `vis_account=${tokens[7]}; vis_lang=nl` } }), env, waitUntil() {} }, 'orders');
  const k = r.v.kaarten.find((x) => x.o.id === 70)?.view;
  ok('Studio, Bestellingen: "Teruggezet 4 credits" op de kaart', k?.payment?.rows?.[1], ['Teruggezet', '4 credits']);
  ok('en de zin eronder noemt geen betaling en geen creditnota', k?.closedNote, 'Deze bestelling is geannuleerd, dus er staan hier geen beelden. Wat er met je credits is gebeurd, staat in het creditboek onder Abonnement.');
}

/* ── L08 · DE MELDING OP DE SITE ───────────────────────────────────────── */
console.log('\nL08 · de melding onderin de site');
{
  const { klantStandVan } = await import('../src/lib/account.js');
  const rij = { id: 1, ref: 'VIS-TEST-5001', service: 'catalog', status: 'cancelled', tier: 'unattended', product_count: 1, lang: 'nl', created_at: '2026-10-15 10:00:00', payment_status: 'credits', credits_used: 4, total_cents: 0 };
  const s = klantStandVan({ lang: 'nl', row: { first_name: 'Ria' }, orders: [rij] });
  ok('alleen een geannuleerde bestelling: geen melding (laatste is leeg)', s.laatste, null);
  ok('en geen proefmelding (er ís een bestelling)', s.nieuw === true, false);
  const lopend = { ...rij, id: 2, ref: 'VIS-TEST-5002', status: 'in_production', created_at: '2026-10-14 10:00:00', payment_status: 'paid', total_cents: 9800 };
  const s2 = klantStandVan({ lang: 'nl', row: { first_name: 'Ria' }, orders: [rij, lopend] });
  ok('met een lopende ernaast: die lopende', s2.laatste?.ref, 'VIS-TEST-5002');
}

/* ── L09 · /admin/log ──────────────────────────────────────────────────── */
console.log('\nL09 · het logboek in /admin');
{
  const adm = lees('src/lib/admin.js');
  const i = adm.indexOf('const LOG_LABEL = {');
  const labels = new Set([...adm.slice(i, adm.indexOf('};', i)).matchAll(/'([^']+)':/g)].map((m) => m[1]));
  const acties = new Set();
  for (const pad of ['src/lib/admin.js', 'src/lib/account.js', 'src/lib/creditBetaling.js', 'functions/api/webhook/mollie.js']) {
    const s = lees(pad);
    for (const m of s.matchAll(/logAdmin\(\s*[^,]+,\s*[^,]+,\s*([^{]*?),\s*\{/gs)) for (const a of m[1].matchAll(/'([a-zA-Z0-9_.:-]+)'/g)) acties.add(a[1]);
    for (const m of s.matchAll(/INSERT INTO admin_log \([^)]*\)\s*VALUES\s*\(([^)]*)\)/g)) for (const a of m[1].matchAll(/'([a-z][a-zA-Z0-9_.-]+)'/g)) acties.add(a[1]);
  }
  const zonder = [...acties].filter((a) => !labels.has(a) && !labels.has(a.split(':')[0]) && a !== 'vat').sort();
  ok('elke actie in het logboek heeft een Nederlandse naam', zonder, []);
  ok('"Wie" breekt een e-mailadres niet af', /class="muted log-wie"/.test(adm) && /\.log-wie \{ white-space: nowrap; \}/.test(lees('public/admin.css')), true);
}

console.log(`\n${goed}/${totaal} goed\n`);
process.exit(goed === totaal ? 0 : 1);
