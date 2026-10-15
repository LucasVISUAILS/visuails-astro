/**
 * Afvinklijst 31 (levering 52): wat Lucas koos, vastgelegd.
 *
 *   node tests/abo-qa-52.test.mjs        (geen server, geen browser)
 *
 *   T  · v31-terugboeking = a: bij een teruggeboekte termijn stopt de incasso bij
 *        Mollie; draait Mollie de terugboeking terug, dan start hij weer; in /admin
 *        zet "Weer laten lopen" hem weer aan (met de bevroren credits, als je dat
 *        aanvinkt). Een oude termijn van een gestopt Mollie-abonnement wordt nog
 *        herkend.
 *   A  · v31-abonnees = a: /admin/abonnees, de termijnen bij de klant, en de
 *        signalen in Nu doen.
 *   M  · v31-me = a: vis_in bij inloggen, weg bij uitloggen en bij een 401, en de
 *        site vraagt /account/me alleen als het er staat.
 *   K  · v31-terugkeer = a is weer weggehaald (veiligheid, zie LEVERING-52.md).
 *   D  · uit de tweede controle: een terugboeking op de eerste betaling zet het
 *        abonnement niet weer aan; hervatten maakt nooit een tweede incasso; een
 *        klaarstaande overstap gaat mee; een incasso die onderweg was, telt.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { hashToken, mintToken } from '../src/lib/token.js';
import { subMaandBruto, monthKey } from '../src/lib/slots.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(76)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — afvinklijst 31: terugboeking, abonnees, vis_in en de terugkeer\n');

/* ── DE WERELD ──────────────────────────────────────────────────────────── */
const mails = [];
const mollie = [];
let betaling = null;
let subNr = 0;
const bijMollieLijst = {};
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com')) { mails.push(JSON.parse(String(opts.body || '{}'))); return new Response('{"id":"m"}', { status: 200 }); }
  if (u.includes('api.mollie.com')) {
    const methode = opts.method || 'GET';
    mollie.push({ url: u, method: methode, body: opts.body ? JSON.parse(String(opts.body)) : null });
    const j = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
    if (methode === 'GET' && /\/payments\/tr_/.test(u)) return j(betaling);
    if (methode === 'GET' && /\/mandates/.test(u)) return j({ count: 1, _embedded: { mandates: [{ id: 'mdt_q52', status: 'valid', createdAt: '2026-10-01T10:00:00+00:00' }] } });
    if (methode === 'GET' && /\/subscriptions\?/.test(u)) { const c = (u.match(/\/customers\/([^/]+)\/subscriptions/) || [])[1]; const l = bijMollieLijst[c] || []; return j({ count: l.length, _embedded: { subscriptions: l } }); }
    if (methode === 'DELETE') return j({ id: 'gestopt', status: 'canceled' });
    if (methode === 'POST' && /\/subscriptions$/.test(u)) { subNr += 1; return j({ id: `sub_weer_${subNr}`, status: 'active' }); }
    return j({});
  }
  return new Response('{}', { status: 200 });
};
const echt = { log: console.log, warn: console.warn, error: console.error };
const stil = () => { console.warn = console.error = () => {}; };
const luid = () => Object.assign(console, echt);

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema laadt niet:', mislukt.slice(0, 3)); process.exit(1); }
const env = { DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@visuails.com', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz1234', PUBLIC_ORIGIN: 'https://visuails.com' };
const dag = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const begonnen = `${dag(-20)} 09:00:00`;
const MAAND = monthKey();
const TERMIJN = (subMaandBruto({ plan: 'studio', term: 'monthly' }) / 100).toFixed(2);

const klant = (id, merk) => db.prepare(`INSERT INTO customers (id, email, name, first_name, brand, phone, country) VALUES (?, ?, ?, ?, ?, '06 12345678', 'NL')`)
  .run(id, `${merk.toLowerCase()}@voorbeeld-merk.test`, `${merk} Proef`, merk, merk.toUpperCase());
const abo = db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, created_at, paused_at, pause_reason,
                         mollie_customer_id, mollie_mandate_id, mollie_subscription_id) VALUES (?, ?, ?, 'studio', 'monthly', ?, ?, ?, ?, ?, ?, ?, ?)`);
klant(1, 'Storno'); klant(2, 'Hand'); klant(3, 'Mislukt'); klant(4, 'Zonder'); klant(5, 'Rustig'); klant(6, 'Terug'); klant(7, 'Ander');
abo.run(1, 1, 'SUB-STORNO', 'active', begonnen, begonnen, null, null, 'cst_storno', 'mdt_storno', 'sub_storno');
abo.run(2, 2, 'SUB-HAND', 'active', begonnen, begonnen, null, null, 'cst_hand', 'mdt_hand', 'sub_hand');
abo.run(3, 3, 'SUB-MISLUKT', 'paused', begonnen, begonnen, `${dag(-2)} 09:00:00`, 'payment_failed', 'cst_mis', 'mdt_mis', 'sub_mis');
abo.run(4, 4, 'SUB-ZONDER', 'active', begonnen, begonnen, null, null, 'cst_zonder', null, null);
abo.run(5, 5, 'SUB-RUSTIG', 'active', begonnen, begonnen, null, null, 'cst_rustig', 'mdt_rustig', 'sub_rustig');

const { onRequestPost } = await import('../functions/api/webhook/mollie.js');
const webhook = async (b) => {
  betaling = b;
  stil();
  const r = await onRequestPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `id=${b.id}` }), env, waitUntil() {} });
  luid();
  return r.status;
};
const termijn = (id, subId, over = {}) => ({
  resource: 'payment', id, mode: 'test', createdAt: `${MAAND}-01T10:00:00+00:00`, paidAt: `${MAAND}-01T10:01:00+00:00`,
  amount: { value: TERMIJN, currency: 'EUR' }, description: 'VISUAILS studio', method: 'directdebit',
  sequenceType: 'recurring', status: 'paid', customerId: 'cst', mandateId: 'mdt', subscriptionId: subId, ...over,
});
const rij = (id) => db.prepare('SELECT status, pause_reason, mollie_subscription_id FROM subscriptions WHERE id = ?').get(id);

/* ── T · DE TERUGBOEKING ───────────────────────────────────────────────── */
console.log('T · een teruggeboekte termijn stopt de incasso');
ok('de termijn komt binnen', await webhook(termijn('tr_storno1', 'sub_storno')), 200);
ok('de termijn van "Hand" ook', await webhook(termijn('tr_hand1', 'sub_hand')), 200);
mollie.length = 0; mails.length = 0;
ok('de terugboeking komt binnen', await webhook(termijn('tr_storno1', 'sub_storno', { amountChargedBack: { value: TERMIJN, currency: 'EUR' } })), 200);
ok('het abonnement staat stil wegens de terugboeking', { ...rij(1) }, { status: 'paused', pause_reason: 'chargeback', mollie_subscription_id: null });
ok('en het Mollie-abonnement is gestopt (DELETE)', mollie.some((m) => m.method === 'DELETE' && /\/customers\/cst_storno\/subscriptions\/sub_storno$/.test(m.url)), true);
const sm = mails.find((m) => /^Termijn teruggeboekt/.test(m.subject || ''));
ok('de studiomail zegt "Incasso bij Mollie: gestopt" en wijst naar de klant', !!sm && /Incasso bij Mollie[\s\S]{0,120}gestopt/.test(sm.html) && /admin\/customers\/1#abonnement/.test(sm.html), true);
const km = mails.find((m) => /^Je abonnement staat even stil/.test(m.subject || ''));
ok('de klant krijgt "er wordt niets afgeschreven", en dat klopt nu', !!km && /er wordt niets afgeschreven/.test(km.html), true);

mollie.length = 0; mails.length = 0;
ok('Mollie draait de terugboeking terug', await webhook(termijn('tr_storno1', 'sub_storno')), 200);
const weer = mollie.find((m) => m.method === 'POST' && /\/customers\/cst_storno\/subscriptions$/.test(m.url));
ok('  de melding draagt het oude Mollie-id, en wordt toch herkend (via de betaling)', rij(1).status, 'active');
ok('  een nieuw Mollie-abonnement op het mandaat', [!!weer, weer?.body?.mandateId], [true, 'mdt_storno']);
ok('  vanaf de volgende termijndag, niet vandaag', !!weer && weer.body.startDate > dag(0), true);
ok('  en de rij heeft het nieuwe id', /^sub_weer_/.test(rij(1).mollie_subscription_id || ''), true);
ok('  de studiomail zegt "weer aan"', mails.some((m) => /^Terugboeking ongedaan/.test(m.subject || '') && /Incasso bij Mollie[\s\S]{0,120}weer aan/.test(m.html)), true);

/* Een terugboeking die met de klant geregeld wordt: "Weer laten lopen" in /admin. */
await webhook(termijn('tr_hand1', 'sub_hand', { amountChargedBack: { value: TERMIJN, currency: 'EUR' } }));
ok('"Hand" staat stil na zijn terugboeking', { ...rij(2) }, { status: 'paused', pause_reason: 'chargeback', mollie_subscription_id: null });

const adminToken = 'q52-admin-token';
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')");
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(adminToken));
const { adminGet, adminPost } = await import('../src/lib/admin.js');
const kop = { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' };
const admin = async (pad) => (await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: kop }), env, waitUntil() {} })).text();
const post = async (pad, velden = {}) => {
  stil();
  const r = await adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { ...kop, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(velden).toString() }), env, waitUntil() {} });
  luid();
  return r;
};
let pagina = await admin('/admin/customers/2');
ok('/admin bij de klant: "Staat stil na een terugboeking" met de knop', /action="\/admin\/customers\/2\/abo-weer"[\s\S]*?Staat stil na een terugboeking[\s\S]*?Weer laten lopen<\/button>/.test(pagina), true);
ok('  met het vinkje voor de bevroren credits', /name="credits" value="vrij"/.test(pagina), true);
const bevrorenVoor = db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE customer_id = 2 AND reden = 'vrijgegeven'").get().n;
mollie.length = 0; mails.length = 0;
let r = await post('/admin/customers/2/abo-weer', { credits: 'vrij' });
ok('Weer laten lopen: terug naar de klant, "loopt"', r.headers.get('location'), '/admin/customers/2?abo=loopt#abonnement');
ok('  het abonnement loopt, met een nieuw Mollie-abonnement', [rij(2).status, /^sub_weer_/.test(rij(2).mollie_subscription_id || '')], ['active', true]);
ok('  de bevroren credits zijn vrij', db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE customer_id = 2 AND reden = 'vrijgegeven'").get().n, bevrorenVoor + 1);
ok('  de klant krijgt "Je abonnement loopt weer"', mails.some((m) => m.to === 'hand@voorbeeld-merk.test' && /^Je abonnement loopt weer/.test(m.subject || '')), true);
ok('  een regel in het logboek met een naam', /Abonnement weer laten lopen/.test(await admin('/admin/log')), true);
ok('  en de melding op de klantpagina', /Het abonnement loopt weer/.test(await admin('/admin/customers/2?abo=loopt')), true);
r = await post('/admin/customers/5/abo-weer');
ok('bij een abonnement dat gewoon loopt doet de knop niets', [r.headers.get('location'), rij(5).mollie_subscription_id], ['/admin/customers/5?abo=niet#abonnement', 'sub_rustig']);

/* ── A · ABONNEES ──────────────────────────────────────────────────────── */
console.log('\nA · Abonnees in /admin');
pagina = await admin('/admin/abonnees');
ok('/admin/abonnees staat in het menu', /<a class="bar-link" href="\/admin\/abonnees">Abonnees<\/a>/.test(await admin('/admin')), true);
ok('  de pagina laadt, met de telling', /<h1>Abonnees<\/h1>/.test(pagina) && /lopend<\/span>/.test(pagina) && /per maand, excl\. btw/.test(pagina), true);
const volgorde = [...pagina.matchAll(/admin\/customers\/(\d+)#abonnement/g)].map((m) => Number(m[1]));
ok('  wat geld kost staat bovenaan (de mislukte incasso, het abonnement zonder incasso)', volgorde.slice(0, 2).sort(), [3, 4]);
ok('  met de signalen erbij', /De incasso is mislukt/.test(pagina) && /Geen incasso bij Mollie/.test(pagina), true);
ok('  en de stand in woorden', /stil: incasso mislukt/.test(pagina) && /loopt, maar zonder incasso/.test(pagina), true);
pagina = await admin('/admin/customers/1');
ok('bij de klant: de termijnen, met de stand', /<h3>Termijnen<\/h3>/.test(pagina) && /tr_storno1/.test(pagina) && /betaald \(terugboeking teruggedraaid\)/.test(pagina), true);
pagina = await admin('/admin/customers/2');
ok('  en een termijn die nog teruggeboekt staat (vóór het knopje stond hij zo)', /tr_hand1/.test(pagina), true);
const { termijnStand } = await import('../src/lib/abonnees.js');
ok('termijnStand: mislukt, terugbetaald, deels, teruggeboekt, betaald', [
  termijnStand({ status: 'failed' }).tekst, termijnStand({ status: 'paid', amount_cents: 100, refunded_cents: 100 }).tekst,
  termijnStand({ status: 'paid', amount_cents: 100, refunded_cents: 40 }).tekst, termijnStand({ status: 'paid', amount_cents: 100 }, 'plan.chargeback').tekst,
  termijnStand({ status: 'paid', amount_cents: 100 }).tekst,
], ['mislukt', 'terugbetaald', 'deels terugbetaald (€ 0,40)', 'teruggeboekt', 'betaald']);

const { nuDoen, nuDoenHtml } = await import('../src/lib/nudoen.js');
const lijst = await nuDoen(env.DB);
const abos = lijst.regels.filter((x) => x.soort === 'abonnement');
ok('Nu doen: de mislukte incasso en het abonnement zonder incasso', abos.map((x) => [x.ref, x.extra]).sort(), [['SUB-MISLUKT', 'mislukt'], ['SUB-ZONDER', 'geen-incasso']]);
ok('  met een knop naar de klant', /Incasso mislukt[\s\S]*?SUB-MISLUKT[\s\S]*?href="\/admin\/customers\/3#abonnement"/.test(nuDoenHtml(lijst)), true);
ok('  en niet bij een bestelling ("Volgende stap")', (await nuDoen(env.DB, { orderId: 1 })).regels.some((x) => x.soort === 'abonnement'), false);
db.prepare("UPDATE subscriptions SET started_at = ? WHERE id = 4").run(`${dag(0)} 08:00:00`);
ok('  een abonnement dat vandaag begon en nog koppelt, staat er nog niet', (await nuDoen(env.DB)).regels.some((x) => x.ref === 'SUB-ZONDER'), false);

/* ── M · vis_in ────────────────────────────────────────────────────────── */
console.log('\nM · vis_in: /account/me alleen als er iemand is ingelogd');
const { accountGet, accountPost } = await import('../src/lib/account.js');
const linkToken = mintToken();
db.prepare("INSERT INTO account_tokens (customer_id, token_hash, expires_at) VALUES (5, ?, ?)").run(await hashToken(linkToken), new Date(Date.now() + 15 * 60000).toISOString());
stil();
const binnen = await accountGet({ request: new Request(`https://visuails.com/account/verify/${linkToken}`), env, waitUntil() {} });
luid();
const koekjes = binnen.headers.get('set-cookie') || '';
ok('inloggen met de link zet vis_account én vis_in=1 (Path=/, leesbaar, Secure)', /vis_account=/.test(koekjes) && /vis_in=1; Max-Age=\d+; Path=\/; Secure; SameSite=Lax/.test(koekjes), true);
ok('  vis_in is niet HttpOnly (de pagina moet hem lezen) en draagt niets dan "1"', /vis_in=1;[^,]*HttpOnly/.test(koekjes), false);
const sessie = /vis_account=([^;]+)/.exec(koekjes)?.[1];
stil();
const uit = await accountPost({ request: new Request('https://visuails.com/account/logout', { method: 'POST', headers: { cookie: `vis_account=${sessie}; vis_in=1`, origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' }, body: '' }), env, waitUntil() {} });
luid();
ok('uitloggen haalt vis_in weg', /vis_in=; Max-Age=0; Path=\//.test(uit.headers.get('set-cookie') || ''), true);
const me = await accountGet({ request: new Request('https://visuails.com/account/me', { headers: { cookie: 'vis_in=1', accept: 'application/json' } }), env, waitUntil() {} });
ok('/account/me zonder sessie maar met vis_in: 401, en vis_in gaat weg', [me.status, /vis_in=; Max-Age=0/.test(me.headers.get('set-cookie') || '')], [401, true]);
const lay = lees('src/layouts/Layout.astro');
ok('de kop van de site vraagt /account/me alleen met vis_in', /if \(!magVragen\(\)\) \{ remember\(null\); pending = Promise\.resolve\(null\); return pending; \}/.test(lay), true);
ok('  en haalt vis_in weg bij een 401', /r\.status === 401[\s\S]{0,80}vis_in=; Max-Age=0/.test(lay), true);
const inter = lees('src/scripts/interactions.js');
ok('interactions.js: de stand en de bedankpagina ook', (inter.match(/magAccountVragen\(\)/g) || []).length >= 2, true);
ok('pipeline.js: de terugval ook', /vis_in=1[\s\S]{0,60}Promise\.resolve\(null\)/.test(lees('src/scripts/pipeline.js')), true);
const studioLay = lees('src/layouts/StudioLayout.astro');
ok('Studio zet vis_in op elke pagina (hij leeft zo lang als de sessie), het inlogscherm haalt hem weg', /if \(vorm === 'schil' && customer\) Astro\.response\.headers\.append\('set-cookie', ingelogdCookie\(\)\);/.test(studioLay) && /vorm === 'kaart' && !customer && heeftIngelogdCookie\(Astro\.request\)/.test(studioLay), true);
ok('/account/me verlengt vis_in bij een 200', /\}, 200, \{ 'set-cookie': ingelogdCookie\(\) \}\);/.test(lees('src/lib/account.js')), true);
ok('interactions.js haalt vis_in weg bij een 401', /r\.status === 401\) \{ try \{ document\.cookie = 'vis_in=; Max-Age=0/.test(inter), true);
ok('het cookiebeleid noemt vis_in, NL en EN', /\{INGELOGD_COOKIE\}<\/code><\/strong> — zegt de website dat je bent ingelogd/.test(lees('src/pages/nl/cookie-policy.astro')) && /\{INGELOGD_COOKIE\}<\/code><\/strong> — tells the website that you are signed in/.test(lees('src/pages/cookie-policy.astro')), true);

/* ── K · DE TERUGKEER VAN MOLLIE: GEEN SLEUTEL ─────────────────────────── */
console.log('\nK · terug van Mollie: inloggen blijft nodig (veiligheid)');
/* v31-terugkeer = a is gebouwd en weer weggehaald: een tweede controle liet zien
   dat iemand zonder account een abonnement kon afsluiten op het e-mailadres van
   een bestaande klant, zelf betalen, en dan met de sleutel in diens account
   stond. Zie kladblok/LEVERING-52.md, deel 5. */
ok('de terugkeerlink draagt geen sleutel', /account\/plan\/return\?sub=\$\{encodeURIComponent\(rij\.ref\)\}`,/.test(lees('src/lib/subscribe.js')) && !/&k=/.test(lees('src/lib/subscribe.js')), true);
ok('en er is geen code die een sleutel inwisselt', /terugMetSleutel|maakTerugSleutel/.test(lees('src/lib/account.js') + lees('src/lib/subscribe.js')), false);

/* ── D · NA DE TWEEDE CONTROLE: NOOIT EEN TWEEDE INCASSO ───────────────── */
console.log('\nD · na de tweede controle: geen tweede incasso, en stil blijft stil');
{
  const { hervatIncasso, koppelSubscription } = await import('../src/lib/subscribe.js');
  const { loadSubscription } = await import('../src/lib/subscription.js');
  /* Een terugboeking op de EERSTE betaling: de webhook stopt de incasso, en mag
     daarna niet opnieuw koppelen en het abonnement weer aanzetten. */
  klant(8, 'Eerste');
  abo.run(8, 8, 'SUB-EERSTE', 'pending', null, begonnen, null, null, 'cst_eerste', null, null);
  const eerste = (over = {}) => ({
    resource: 'payment', id: 'tr_eerste1', mode: 'test', createdAt: `${MAAND}-02T10:00:00+00:00`, paidAt: `${MAAND}-02T10:01:00+00:00`,
    amount: { value: TERMIJN, currency: 'EUR' }, description: 'VISUAILS studio', method: 'creditcard', sequenceType: 'first',
    status: 'paid', customerId: 'cst_eerste', metadata: { sub_ref: 'SUB-EERSTE' }, ...over,
  });
  await webhook(eerste());
  ok('de eerste betaling: het abonnement loopt, met een Mollie-abonnement', [rij(8).status, /^sub_weer_/.test(rij(8).mollie_subscription_id || '')], ['active', true]);
  mollie.length = 0;
  await webhook(eerste({ amountChargedBack: { value: TERMIJN, currency: 'EUR' } }));
  ok('een terugboeking op die eerste betaling: stil, en de incasso gestopt', { ...rij(8) }, { status: 'paused', pause_reason: 'chargeback', mollie_subscription_id: null });
  ok('  en er is niet opnieuw gekoppeld (geen nieuw Mollie-abonnement)', mollie.filter((m) => m.method === 'POST' && /\/subscriptions$/.test(m.url)).length, 0);
  ok('koppelSubscription laat een stilstaand abonnement met rust', (await koppelSubscription(env, await loadSubscription(env, 8), 'https://visuails.com')).staat, 'wacht');
  ok('  ook een opgezegd vooruitbetaald jaar wordt niet weer aangezet', await (async () => {
    klant(9, 'Jaar');
    db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, created_at, mollie_customer_id) VALUES (9, 9, 'SUB-JAAR', 'studio', 'prepaid', 'paused', ?, ?, 'cst_jaar')`).run(begonnen, begonnen);
    await koppelSubscription(env, await loadSubscription(env, 9), 'https://visuails.com');
    return db.prepare('SELECT status FROM subscriptions WHERE id = 9').get().status;
  })(), 'paused');

  /* Hervatten: nooit een tweede. */
  mollie.length = 0;
  const s5 = await loadSubscription(env, 5);
  ok('hervatten terwijl de rij al een Mollie-abonnement heeft: niets nieuws', [await hervatIncasso(env, s5, 'https://visuails.com'), mollie.filter((m) => m.method === 'POST').length], [true, 0]);
  db.prepare('UPDATE subscriptions SET mollie_subscription_id = NULL WHERE id = 5').run();
  bijMollieLijst.cst_rustig = [{ id: 'sub_rustig_bij_mollie', status: 'active', description: 'VISUAILS studio — SUB-RUSTIG' }];
  ok('staat hij bij Mollie al (antwoord kwam niet aan): die', [await hervatIncasso(env, await loadSubscription(env, 5), 'https://visuails.com'), rij(5).mollie_subscription_id, mollie.filter((m) => m.method === 'POST').length], [true, 'sub_rustig_bij_mollie', 0]);

  /* Twee keer op "Weer laten lopen", met een klaarstaande overstap. */
  await webhook(termijn('tr_storno2', rij(1).mollie_subscription_id, { createdAt: `${MAAND}-03T10:00:00+00:00` }));
  await webhook(termijn('tr_storno2', rij(1).mollie_subscription_id, { amountChargedBack: { value: TERMIJN, currency: 'EUR' } }));
  ok('"Storno" staat opnieuw stil (een tweede terugboeking)', rij(1).status, 'paused');
  db.prepare("UPDATE subscriptions SET overstap_plan = 'brand', overstap_cents = 169000, overstap_slots_json = NULL WHERE id = 1").run();
  mollie.length = 0;
  const [p1, p2] = await Promise.all([post('/admin/customers/1/abo-weer'), post('/admin/customers/1/abo-weer')]);
  const nieuw = mollie.filter((m) => m.method === 'POST' && /\/customers\/cst_storno\/subscriptions$/.test(m.url));
  ok('twee keer tegelijk op "Weer laten lopen": één Mollie-abonnement', nieuw.length, 1);
  ok('  met het bedrag van de klaarstaande overstap (Merk), niet het oude', nieuw[0]?.body?.amount?.value, (subMaandBruto({ plan: 'brand', term: 'monthly', amount_cents: 169000 }) / 100).toFixed(2));
  ok('  en het abonnement loopt', rij(1).status, 'active');

  /* Een incasso die al onderweg was toen het Mollie-abonnement stopte. */
  const voorSp = db.prepare("SELECT COUNT(*) AS n FROM subscription_payments WHERE external_id = 'tr_onderweg'").get().n;
  await webhook(termijn('tr_onderweg', 'sub_lang_gestopt', { customerId: 'cst_hand' }));
  ok('een betaling van een gestopt Mollie-abonnement wordt toch geboekt (op het Mollie-klant-id)', [voorSp, db.prepare("SELECT subscription_id FROM subscription_payments WHERE external_id = 'tr_onderweg'").get()?.subscription_id], [0, 2]);
}

console.log(`\n${goed}/${totaal} goed\n`);
process.exit(goed === totaal ? 0 : 1);
