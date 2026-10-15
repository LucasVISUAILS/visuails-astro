/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET ABONNEMENT ZONDER WEEK — ronde 10 (B), bouwer B2, 8 oktober 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node tests/abonnement-zonder-week.test.mjs      (geen server, geen build)
 *
 * Lucas, 6 oktober: het weeksysteem gaat weg (§28 van het overzicht). Deze toets
 * houdt vast wat daarvoor in de plaats kwam:
 *
 *   1 · geen weekroutes meer in Studio, en oude links sturen door naar
 *       /account/plan (GET én POST, en ?tab=planning|bestellen);
 *   2 · geen "Start deze week" en geen planStart.js in /admin;
 *   3 · de nachtelijke taak zonder weekstappen, mét de incasso-signalen;
 *   4 · de agenda leest plan_queue niet meer, en niets schrijft window_day;
 *   5 · twee termijnen in het aanbod (6.04);
 *   6 · de rem op abonnementen in credits (6.05);
 *   7 · één creditkaart (6.01).
 */
import { readFileSync, existsSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(66)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/* Alleen de code: een noot die uitlegt wat er weg is, noemt het per definitie. */
const code = (t) => t.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema laadt niet:', mislukt.slice(0, 3)); process.exit(1); }
const env = { DB: d1(db), FROM_EMAIL: 'VISUAILS <orders@visuails.com>' };

db.prepare("INSERT INTO customers (id, email, brand, name, country) VALUES (1, 'studio@voorbeeld-volt.test', 'VOLT', 'Mara Visser', 'NL')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status) VALUES (1, 1, 'SUB-VOLT', 'studio', 'monthly', 'active')`).run();
const klantToken = 'volt-token';
db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(klantToken));
const adminToken = 'b2-admin-token';
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));

const { accountGet, accountPost, studioScreen } = await import('../src/lib/account.js');
const { adminGet, adminPost } = await import('../src/lib/admin.js');
const klantGet = (path) => accountGet({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_account=${klantToken}; vis_lang=nl` } }), env, waitUntil() {} });
const klantPost = (path, velden = {}) => accountPost({ request: new Request(`https://visuails.com${path}`, {
  method: 'POST', headers: { cookie: `vis_account=${klantToken}; vis_lang=nl`, origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(velden).toString(),
}), env, waitUntil() {} });
const scherm = (path) => studioScreen({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_account=${klantToken}; vis_lang=nl` } }), env, waitUntil() {} }, 'plan');
const adminPagina = async (path) => (await adminGet({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} })).text();
const adminPostNaar = (path, velden = {}) => adminPost({ request: new Request(`https://visuails.com${path}`, {
  method: 'POST', headers: { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(velden).toString(),
}), env, waitUntil() {} });

/* ── 1 · STUDIO ─────────────────────────────────────────────────────────── */
console.log('\n1 · Studio: geen weekroutes meer, oude links sturen door');
{
  for (const pad of ['/account/plan/queue', '/account/plan/week', '/account/plan/foto?b=abcd&n=1']) {
    const r = await klantGet(pad);
    ok(`GET ${pad.split('?')[0]} → 303 naar /account/plan`, [r.status, r.headers.get('location')], [303, '/account/plan']);
  }
  for (const [pad, velden] of [['/account/plan/queue', { do: 'add', name: 'Winterjas' }], ['/account/plan/week', { dag: '12' }]]) {
    const r = await klantPost(pad, velden);
    ok(`POST ${pad} → 303 naar /account/plan`, [r.status, r.headers.get('location')], [303, '/account/plan']);
  }
  ok('  en er is niets op de oude lijst gezet', db.prepare('SELECT COUNT(*) AS n FROM plan_queue').get().n, 0);
  ok('  en geen vaste week geschreven', db.prepare('SELECT window_day FROM subscriptions WHERE id = 1').get().window_day, null);

  for (const tab of ['planning', 'bestellen']) {
    const r = await scherm(`/account/plan?tab=${tab}&kies=3&verzet=4`);
    ok(`?tab=${tab} stuurt door naar /account/plan`, r instanceof Response ? [r.status, r.headers.get('location')] : 'geen doorverwijzing', [303, '/account/plan']);
  }
  const s = await scherm('/account/plan');
  /* 2.07 (8 oktober 2026): één pagina zonder tabbladen; sinds 15 oktober vier
     nieuwe (tests/abonnementspagina.test.mjs), geen van de oude. */
  ok('de abonnementspagina heeft alleen de vier nieuwe tabs', s.v.tabs.map((x) => x.id), ['overzicht', 'credits', 'facturen', 'plan']);
  ok('geen week, geen lijst en geen kalender in de staat',
    ['week', 'weekZin', 'weekstrip', 'wachtrij', 'planning', 'kalender', 'weekVerzetbaar'].filter((k) => k in s.v), []);
  ok('de knop bovenaan gaat naar het gewone bestelformulier', s.v.actie?.href, '/nl/start');
  ok('de bestelknoppen ook', s.v.bestel.every((d) => /^\/nl\/start\/(catalog|lifestyle)\/(\?.*)?$/.test(d.href)), true);

  const acc = code(lees('src/lib/account.js'));
  for (const naam of ['handlePlanQueue', 'handlePlanWeek', 'handlePlanFoto', 'planningKalender', 'planKalender', 'planWanneer', 'notifyPlanMoved', 'notifyPlanWeekMoved']) {
    ok(`account.js kent ${naam} niet meer`, new RegExp(`\\b${naam}\\b`).test(acc), false);
  }
  for (const sleutel of ['planQueueH', 'planWeekVerzet', 'planWeekZin', 'planTabPlanning', 'planTabBestellen', 'planVisWeekH', 'planWindowH', 'planWhenWeek', 'planVerzetBevestig']) {
    ok(`COPY-sleutel ${sleutel} is weg`, new RegExp(`\\b${sleutel}\\s*:`).test(acc), false);
  }
  const pagina = code(lees('src/pages/account/plan.astro'));
  ok('plan.astro post nergens meer naar de lijst of de week', /\/account\/plan\/(queue|week)|tab=(bestellen|planning)/.test(pagina), false);
}

/* ── 2 · /ADMIN ─────────────────────────────────────────────────────────── */
console.log('\n2 · /admin: geen "Start deze week" en geen planStart.js');
{
  ok('src/lib/planStart.js bestaat niet meer', existsSync(new URL('../src/lib/planStart.js', import.meta.url)), false);
  const adm = code(lees('src/lib/admin.js'));
  ok('admin.js kent handleStartWeek niet meer', /\bhandleStartWeek\b|\bstartPlanWindow\b|\bklaarOmTeStarten\b/.test(adm), false);
  const klant = await adminPagina('/admin/customers/1');
  ok('de klantpagina heeft een paneel "Abonnement"', /<h2>Abonnement<\/h2>/.test(klant), true);
  ok('  zonder "Start deze week" of "Abonnementsweek"', /Start deze week|Abonnementsweek|week vanaf de/.test(klant), false);
  const r = await adminPostNaar('/admin/customers/1/week');
  ok('een oud formulier "Start deze week" doet niets en gaat terug', [r.status, r.headers.get('location')], [303, '/admin/customers/1#abonnement']);
  ok('  en maakt geen bestelling', db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 0);
  const dash = await adminPagina('/admin');
  ok('het dashboard heeft geen "Abonnementen klaar" meer', /Abonnementen klaar/.test(dash), false);
}

/* ── 3 · DE NACHTELIJKE TAAK ───────────────────────────────────────────── */
console.log('\n3 · cron zonder weekstappen, met de incasso-signalen');
{
  const { tasks } = await import('../cron/index.js');
  ok('geen checkPlanQueues en geen weekTeStarten meer', ['checkPlanQueues', 'weekTeStarten'].filter((t) => t in tasks), []);
  ok('wel incassoSignalen en grantPrepaidMonths', typeof tasks.incassoSignalen === 'function' && typeof tasks.grantPrepaidMonths === 'function', true);
  const bron = code(lees('cron/index.js'));
  const rij = (bron.match(/for \(const task of \[([^\]]*)\]\)/) || [])[1] || '';
  ok('de scheduler draait incassoSignalen, herinnerCredits en grantPrepaidMonths', ['incassoSignalen', 'herinnerCredits', 'grantPrepaidMonths'].every((n) => new RegExp(`\\b${n}\\b`).test(rij)), true);
  ok('  en geen weektaak', /checkPlanQueues|weekTeStarten/.test(rij), false);
  ok('de lege-lijstmail is weg', /mailLegeWachtrij|plan_queue WHERE customer_id|QUEUE_WARN_DAYS/.test(bron), false);

  /* De twee signalen, tegen een echte SQLite (zie de kop van de oude
     plan-queue-cron-toets: een stub op SQL-tekst bewijst niets). */
  const { db: c, mislukt: m } = verseDb(new URL('../schema.sql', import.meta.url));
  if (m.length) throw new Error('schema');
  const { termijnMaand } = await import('../src/lib/subscription.js');
  const nu = new Date();
  const vijfTerug = new Date(nu.getTime() - 5 * 86400000);
  const start = new Date(Date.UTC(vijfTerug.getUTCFullYear(), vijfTerug.getUTCMonth() - 2, Math.min(28, vijfTerug.getUTCDate()))).toISOString().slice(0, 10);
  for (const [id, ref, status, reden] of [[1, 'SUB-STUK', 'paused', 'payment_failed'], [2, 'SUB-ZELF', 'paused', 'customer'], [3, 'SUB-STIL', 'active', null], [4, 'SUB-BETAALD', 'active', null]]) {
    c.prepare('INSERT INTO customers (id, email, brand) VALUES (?, ?, ?)').run(id, `k${id}@voorbeeld.test`, `MERK${id}`);
    c.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, pause_reason, started_at, mollie_subscription_id)
               VALUES (?, ?, ?, 'studio', 'monthly', ?, ?, ?, ?)`).run(id, id, ref, status, reden, start, `sub_${id}`);
  }
  c.prepare('INSERT INTO subscription_months (subscription_id, month, granted) VALUES (4, ?, 120)').run(termijnMaand({ started_at: start }, nu));
  const regel = await tasks.incassoSignalen({ DB: d1(c) });
  ok('een pauze op een mislukte incasso staat in het rapport', /SUB-STUK/.test(regel), true);
  ok('  een pauze van de klant zelf niet', /SUB-ZELF/.test(regel), false);
  ok('een termijn zonder incasso staat erin (E6)', /SUB-STIL/.test(regel) && /machtiging verlopen of ingetrokken/.test(regel), true);
  ok('  de betaalde termijn niet', /SUB-BETAALD/.test(regel), false);
  ok('zonder database geen regel en geen fout', await tasks.incassoSignalen({}), '');

  const notify = await import('../src/lib/notify.js');
  ok('notify.js heeft geen week- of dagmelding meer', ['notifyPlanMoved', 'notifyPlanWeekMoved'].filter((n) => n in notify), []);
}

/* ── 4 · DE AGENDA EN window_day ───────────────────────────────────────── */
console.log('\n4 · de agenda leest plan_queue niet meer; niets schrijft window_day');
{
  const gelezen = [];
  const nep = { DB: { prepare(sql) { gelezen.push(sql); return { bind() { return this; }, all: async () => ({ results: [] }) }; } } };
  const { readCalendar } = await import('../src/lib/agenda.js');
  await readCalendar(nep, '2026-10-08');
  ok('readCalendar() vraagt plan_queue niet op', gelezen.some((q) => /plan_queue/.test(q)), false);
  const { createSubscriptionRow } = await import('../src/lib/subscription.js');
  db.prepare("INSERT INTO customers (id, email, brand) VALUES (9, 'nieuw@voorbeeld.test', 'NIEUW')").run();
  const { row } = await createSubscriptionRow(env, { customerId: 9, planId: 'starter', termId: 'monthly', windowDay: 8 });
  ok('een nieuw abonnement krijgt geen vaste week, ook niet als hij wordt meegegeven', row.window_day, null);
}

/* ── 5 · TWEE TERMIJNEN (6.04) ─────────────────────────────────────────── */
console.log('\n5 · twee termijnen in het aanbod');
{
  const { OFFERED_TERM_IDS, TERM_IDS, hasBrandModel } = await import('../src/data/plans.js');
  ok('maandelijks en jaar vooruit', OFFERED_TERM_IDS, ['monthly', 'prepaid']);
  ok('de tussentermijn bestaat nog voor lopende abonnementen', TERM_IDS.includes('yearly'), true);
  ok('Pro houdt het merkmodel bij vooruit', hasBrandModel('studio', 'prepaid'), true);
  const picker = code(lees('src/components/order/PlanPicker.astro'));
  ok('/start/plan biedt de tussentermijn niet aan', /value="yearly"|termJaar\b/.test(picker), false);
  ok('/start/plan heeft geen stap "vaste week" meer', /name="window_day"|weekNote|stap3/.test(picker), false);
  const plans = code(lees('src/components/PlansHal.astro'));
  ok('/plans noemt de tussentermijn niet', /'12 maanden', |'12 months', |jaartermijn|12-month term/.test(plans), false);
  ok('/plans noemt geen vaste week', /vaste week|fixed week/i.test(plans), false);
  ok('op maat is één regel met een link naar /start/plan', /id="op-maat"/.test(plans) && /\?plan=\$\{CUSTOM_MONTH_ID\}#maat-credits/.test(plans) && !/data-pm-credits/.test(plans), true);
  ok('het veld waar die link heen wijst bestaat', /id="maat-credits"/.test(picker), true);
  const sub = code(lees('src/lib/subscribe.js'));
  ok('de poort laat alleen termijnen uit het aanbod toe', /OFFERED_TERM_IDS\.includes\(termId\)/.test(sub), true);
}

/* ── 6 · seatsLeft IN CREDITS (6.05) ───────────────────────────────────── */
console.log('\n6 · de rem op abonnementen meet credits');
{
  const { seatsLeft, planPast, ABO_CREDITS_PLAFOND, PLEKKEN_TONEN_TOT } = await import('../src/data/plans.js');
  const { PLAN_CREDITS } = await import('../src/data/pricing.js');
  ok('seatsLeft telt per plan in credits', seatsLeft(0, 'brand'), Math.floor(ABO_CREDITS_PLAFOND / PLAN_CREDITS.brand));
  ok('een Merk past niet meer als er minder dan zijn credits over zijn', planPast('brand', ABO_CREDITS_PLAFOND - PLAN_CREDITS.brand + 1), false);

  const { leesAboPlafond, zetAboPlafond, aboStand } = await import('../src/lib/aboPlafond.js');
  const { db: b } = verseDb(new URL('../schema.sql', import.meta.url));
  const e = { DB: d1(b) };
  ok('zonder stand geldt de standaard', (await leesAboPlafond(e)).plafond, ABO_CREDITS_PLAFOND);
  ok('een stand uit /admin gaat voor', [(await zetAboPlafond(e, '600')).ok, (await leesAboPlafond(e)).plafond], [true, 600]);
  ok('onzin wordt geweigerd', (await zetAboPlafond(e, 'veel')).ok, false);
  b.prepare("INSERT INTO customers (id, email) VALUES (1, 'a@voorbeeld.test'), (2, 'b@voorbeeld.test')").run();
  b.prepare("INSERT INTO subscriptions (customer_id, ref, plan, term, status) VALUES (1, 'SUB-A', 'brand', 'monthly', 'active'), (2, 'SUB-B', 'studio', 'prepaid', 'active')").run();
  ok('de stand telt de maandcredits van alle abonnees', (await aboStand(e)).credits, PLAN_CREDITS.brand + PLAN_CREDITS.studio);

  const { planPlek } = await import('../functions/api/plan-plek.js');
  const p = await planPlek(e);
  /* 600 − 410 = 190: Starter (45) 4 plekken → niet tonen; Pro (120) 1 → tonen; Merk (290) vol. */
  ok('/api/plan-plek: Merk is vol', p.plannen.brand, false);
  ok('  "nog N plekken" alleen bij drie of minder', p.plekken, { studio: 1 });
  ok('  en drie is de grens', PLEKKEN_TONEN_TOT, 3);
  await zetAboPlafond(e, '');
  b.prepare('DELETE FROM subscriptions').run();
  const ruim = await planPlek(e);
  ok('zonder abonnees zegt hij bij de standaard nergens "nog N plekken"', [ruim.plekken, Object.values(ruim.plannen).every(Boolean)], [{}, true]);

  const klanten = await adminPagina('/admin/customers');
  ok('/admin › Klanten toont één regel met de credits tegen het plafond', /Abonnees samen: <strong>[\d.]+ credits per maand<\/strong> van het plafond [\d.]+/.test(klanten), true);
  const r = await adminPostNaar('/admin/abo-plafond', { plafond: '750' });
  ok('het plafond is te zetten in /admin', [r.status, (await leesAboPlafond(env)).plafond], [303, 750]);
}

/* ── 7 · DE CREDITKAART (6.01) ─────────────────────────────────────────── */
console.log('\n7 · één creditkaart');
{
  const k = await import('../src/data/creditKaart.js');
  const { SERVICE_CREDITS, EXTRA_CREDITS } = await import('../src/data/pricing.js');
  ok('catalogset, carrousel, extra foto, 4K, video op aanvraag', k.creditKaartRegels('nl').map((r) => [r.id, r.credits]),
    [['catalog', SERVICE_CREDITS.catalog], ['lifestyle', SERVICE_CREDITS.lifestyle], ['photo', EXTRA_CREDITS.photo], ['hires', EXTRA_CREDITS.hires], ['video', null]]);
  ok('de vertaling per plan (NL)', k.planVertaling('studio', 'nl'), 'Pro: 120 credits, 30 catalogsets of 24 carrousels');
  ok('en (EN)', k.planVertaling('studio', 'en'), 'Pro: 120 credits, 30 catalog sets or 24 carousels');
  ok('achter een saldo', k.saldoVertaling(72, 'nl'), 'Je hebt 72 credits: genoeg voor 18 catalogsets of 14 carrousels');
  ok('de kernzin', k.creditKern('nl'), `Met een abonnement kost een catalogset altijd ${SERVICE_CREDITS.catalog} credits, ook als je er maar twee bestelt.`);
  ok('één component, op /plans en /start/plan',
    /* /plans (PlansHal, 12 oktober 2026) zet de kernzin groot naast de kaart in
       plaats van erin; het is dezelfde zin uit creditKern(). */
    /<CreditKaart\b/.test(lees('src/components/PlansHal.astro')) && /creditKern\(lang\)/.test(lees('src/components/PlansHal.astro'))
    && /<CreditKaart\b[^>]*\bkern\b/.test(lees('src/components/order/PlanPicker.astro')), true);
  const comp = lees('src/components/CreditKaart.astro');
  ok('de kaart heeft geen script en geen inline stijl (Studio-CSP)', /<script|style=/.test(comp), false);
  ok('/plans toont geen videocredits of "≈ producten" meer', /SERVICE_CREDITS\.hooks|≈/.test(code(lees('src/components/PlansHal.astro'))), false);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
