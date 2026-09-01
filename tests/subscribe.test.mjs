/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN ABONNEMENT AFSLUITEN — DE HELE WEG
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Van 16 tot 17 augustus 2026 bestond de motor zonder startknop: de tabellen, de
 * vijf Mollie-functies, de webhook en het dashboard waren er, en geen enkele regel
 * riep ze aan. Deze toets is er om dat niet nog eens te laten gebeuren — hij loopt
 * de weg af die een klant loopt, en faalt als er onderweg een schakel ontbreekt.
 *
 * Wat bewezen moet worden, op volgorde van wat het kost als het misgaat:
 *
 *   1 · ER WORDT NOOIT EEN MANDAAT GEVRAAGD ZONDER RIJ. De rij bestaat vóór de
 *       betaling, anders komt de webhook binnen met een kenmerk dat nergens bij
 *       hoort — en dan is er geld ontvangen zonder abonnement.
 *   2 · DE CAPACITEITSPOORT STAAT VÓÓR DE MACHTIGING. Een klant hoort te lezen dat
 *       het vol is voordat hij tekent, niet erna.
 *   3 · DE TERUGKOMST IS IDEMPOTENT. Verversen, terugknop, twee tabbladen: er mag
 *       maar één subscription bij Mollie ontstaan.
 *   4 · EEN ONTBREKEND MANDAAT IS GEEN FOUT. Bij iDEAL is de klant terug voordat
 *       zijn bank bevestigt. Een rode melding zou daar liegen over geld dat net is
 *       afgeschreven.
 *   5 · EEN KENMERK UIT DE URL IS VAN IEDEREEN. Het abonnement van een ander mag
 *       er niet mee te activeren zijn.
 *
 * MOLLIE WORDT NAGEBOOTST, want er mag geen echte machtiging ontstaan in een test.
 * Wat er nagebootst wordt is de VORM van de antwoorden zoals mollie.js ze leest —
 * `_links.checkout.href`, `_embedded.mandates` — zodat een wijziging daar hier
 * omvalt in plaats van in productie.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import { handleSubscribeStart, handleSubscribeReturn, eersteTermijn } from '../src/lib/subscribe.js';
import { productsFor, planProductBudget } from '../src/data/plans.js';
import { customMonthSlots, customMonthTotal } from '../src/data/pricing.js';
import { bundelVoor, subMaandCents, subProducten } from '../src/lib/slots.js';
import { subscriptionShape } from '../src/lib/subscription.js';

let ok_ = 0; let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const goed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (goed) ok_ += 1;
  console.log(` ${goed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(62)}${goed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
console.log('het schema draait');
ok('schema.sql draait zonder mislukte statements', mislukt, []);

db.exec(`
  INSERT INTO customers (id, email, brand) VALUES
    (7, 'mara@voltbrand.test', 'VOLT'),
    (8, 'iemand@anders.test', 'ANDERS');
`);

/* ── DE NEP-MOLLIE ─────────────────────────────────────────────────────────
   Eén functie die op het PAD reageert, zoals mollieRequest() hem aanroept. `staat`
   stuurt per test wat er terugkomt: geen mandaat, een geldig mandaat, of een
   storing. */
const staat = { mandaten: [], stuk: null, aanroepen: [] };
function nepFetch(url, init) {
  const pad = new URL(url).pathname;
  staat.aanroepen.push(`${init?.method || 'GET'} ${pad}`);
  if (staat.stuk && pad.includes(staat.stuk)) {
    return Promise.resolve(new Response(JSON.stringify({ detail: 'nep-storing' }), { status: 503 }));
  }
  const geef = (body) => Promise.resolve(new Response(JSON.stringify(body), {
    status: 201, headers: { 'content-type': 'application/json' },
  }));
  if (pad === '/v2/customers' && init?.method === 'POST') return geef({ id: 'cst_nep' });
  if (pad === '/v2/payments') {
    return geef({ id: 'tr_nep', _links: { checkout: { href: 'https://www.mollie.com/checkout/nep' } } });
  }
  if (/\/mandates$/.test(pad)) return geef({ _embedded: { mandates: staat.mandaten } });
  if (/\/subscriptions$/.test(pad)) return geef({ id: 'sub_nep' });
  return Promise.resolve(new Response('{}', { status: 200 }));
}
const echteFetch = globalThis.fetch;
globalThis.fetch = nepFetch;

/* DE SLEUTEL MOET DE ECHTE VORM HEBBEN. Eerste poging gebruikte 'test_nep' en
   mollie.js weigerde hem: die controleert de vorm vóór hij een verzoek doet,
   omdat een geplakte sleutel met onzichtbare tekens anders stil faalt. Die
   controle is precies goed, dus is niet de code aangepast maar de test. */
const env = { DB: d1(db), MOLLIE_API_KEY: 'test_neppesleutelvoordetest0123456789' };
const KLANT = { customer_id: 7, email: 'mara@voltbrand.test', brand: 'VOLT' };
const ANDER = { customer_id: 8, email: 'iemand@anders.test', brand: 'ANDERS' };

const start = (velden, klant = KLANT) => handleSubscribeStart({
  env,
  request: new Request('https://visuails.com/account/plan/start', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(velden).toString(),
  }),
}, klant);

const terug = (ref, klant = KLANT) => handleSubscribeReturn({
  env,
  request: new Request(`https://visuails.com/account/plan/return?sub=${encodeURIComponent(ref)}`),
}, klant);

const rij = () => db.prepare('SELECT * FROM subscriptions ORDER BY id DESC LIMIT 1').get();

console.log('\nwat er niet eens bij Mollie langs komt');
{
  const voor = staat.aanroepen.length;
  /* DE TAAL STAAT NU IN HET PAD. Deze vier verwachtingen noemden allemaal
     '/start/plan', wat de Engelse pagina is — ze legden vast wat er fout was
     in plaats van wat er hoorde te gebeuren. Zonder `lang` in het formulier
     valt de handler terug op Nederlands, zoals hij dat voor de omschrijving
     bij Mollie al deed. Zie de noot bij terug() in subscribe.js. */
  ok('een onbekend plan wordt geweigerd',
    (await start({ plan: 'goud', term: 'monthly', lang: 'nl' })).headers.get('location'), '/nl/start/plan?fout=plan');
  ok('en een Engelse klant komt op de Engelse pagina terug',
    (await start({ plan: 'goud', term: 'monthly', lang: 'en' })).headers.get('location'), '/start/plan?fout=plan');
  ok('een onbekende termijn ook',
    (await start({ plan: 'studio', term: 'kwartaal', lang: 'nl' })).headers.get('location'), '/nl/start/plan?fout=termijn');
  ok('zonder taal in het formulier is het Nederlands',
    (await start({ plan: 'goud', term: 'monthly' })).headers.get('location'), '/nl/start/plan?fout=plan');
  /* HET BELANGRIJKSTE VAN DEZE SECTIE: er is geen enkele aanroep naar Mollie
     geweest, en er staat geen rij. Een afgewezen keuze mag geen spoor achterlaten
     bij een betaaldienst. */
  ok('er is niets naar Mollie gegaan', staat.aanroepen.length, voor);
  ok('en er staat geen abonnement', telling(db, 'SELECT COUNT(*) FROM subscriptions'), 0);
}

console.log('\nde weg naar de machtiging');
{
  const res = await start({ plan: 'studio', term: 'yearly', window_day: '8', lang: 'nl' });
  ok('de klant wordt doorgestuurd', res.status, 303);
  ok('naar het betaalscherm van Mollie', res.headers.get('location'), 'https://www.mollie.com/checkout/nep');

  const r = rij();
  /* DE RIJ BESTAAT VÓÓR DE BETALING. Zonder deze volgorde komt de webhook binnen
     met een kenmerk dat nergens bij hoort. */
  ok('de rij staat er', Boolean(r), true);
  ok('op pending', r.status, 'pending');
  ok('met het gekozen plan en de termijn', [r.plan, r.term], ['studio', 'yearly']);
  ok('en de gekozen dag', r.window_day, 8);
  ok('de Mollie-klant is vastgelegd', r.mollie_customer_id, 'cst_nep');
  ok('maar er is nog geen mandaat', r.mollie_mandate_id, null);
  ok('en nog geen subscription', r.mollie_subscription_id, null);

  /* DE VOLGORDE VAN DE AANROEPEN. Eerst een klant, dan een betaling — andersom kan
     niet, want de betaling hangt aan de klant-id. */
  const mollie = staat.aanroepen.filter((a) => a.startsWith('POST'));
  ok('eerst een klant bij Mollie', mollie[0], 'POST /v2/customers');
  ok('en dan pas de eerste betaling', mollie[1], 'POST /v2/payments');
  ok('en nog geen subscription', mollie.some((a) => a.includes('subscriptions')), false);
}

console.log('\neen tweede poging levert geen tweede abonnement op');
{
  const res = await start({ plan: 'brand', term: 'monthly' });
  ok('hij gaat naar het dashboard', res.headers.get('location'), '/account/plan');
  ok('en er is er nog steeds één', telling(db, 'SELECT COUNT(*) FROM subscriptions'), 1);
  ok('met het oorspronkelijke plan', rij().plan, 'studio');
}

console.log('\nterug van Mollie zonder mandaat is geen fout');
{
  /* Bij iDEAL is dit het NORMALE geval: de klant is terug voordat zijn bank ons
     heeft bevestigd. Een foutmelding zou hier liegen over geld dat net is
     afgeschreven. */
  staat.mandaten = [];
  const uit = await terug(rij().ref);
  ok('de uitkomst is "wacht" en niet "mislukt"', uit.staat, 'wacht');
  ok('het abonnement staat nog op pending', rij().status, 'pending');
  ok('en er is geen subscription aangemaakt', rij().mollie_subscription_id, null);
}

console.log('\nmet een geldig mandaat gaat het abonnement lopen');
{
  staat.mandaten = [
    { id: 'mdt_oud', status: 'valid', createdAt: '2026-01-01T10:00:00Z' },
    { id: 'mdt_nieuw', status: 'valid', createdAt: '2026-08-17T10:00:00Z' },
    { id: 'mdt_pending', status: 'pending', createdAt: '2026-08-18T10:00:00Z' },
  ];
  const uit = await terug(rij().ref);
  ok('de uitkomst is gelukt', uit.staat, 'gelukt');
  const r = rij();
  ok('het abonnement is actief', r.status, 'active');
  /* Het NIEUWSTE GELDIGE mandaat, en niet het eerste uit de lijst en niet een dat
     nog niet geldig is. Een mandaat in 'pending' kan niet afschrijven. */
  ok('het nieuwste geldige mandaat is gekozen', r.mollie_mandate_id, 'mdt_nieuw');
  ok('en de subscription staat erbij', r.mollie_subscription_id, 'sub_nep');
  ok('started_at is gezet', Boolean(r.started_at), true);
}

console.log('\nterugkomen mag zo vaak als de klant wil');
{
  const voor = staat.aanroepen.filter((a) => a.includes('subscriptions')).length;
  const uit = await terug(rij().ref);
  ok('de tweede keer zegt hij gewoon dat het loopt', uit.staat, 'actief');
  /* IDEMPOTENT. Twee subscriptions bij Mollie betekent twee keer per maand
     afschrijven, en dat merkt de klant op zijn rekening en niet op ons scherm. */
  ok('en er is geen tweede subscription aangemaakt',
    staat.aanroepen.filter((a) => a.includes('subscriptions')).length, voor);
}

console.log('\neen kenmerk uit de url is van iedereen');
{
  /* Zonder de eigenaarscontrole zou iemand het abonnement van een ander kunnen
     activeren door zijn kenmerk te raden of af te kijken. */
  const uit = await terug(rij().ref, ANDER);
  ok('een ander account krijgt niets te zien', uit.staat, 'onbekend');
  const onzin = await terug('SUB-XXXX-XXX');
  ok('en een onbekend kenmerk ook niet', onzin.staat, 'onbekend');
}

console.log('\nde capaciteitspoort staat vóór de machtiging');
{
  /* Het budget is 30% van de begeleide maandcapaciteit, geteld over de database.
     Vol is geen storing maar een volle agenda — en dat hoort de klant te lezen
     voordat hij een machtiging afgeeft. */
  db.exec("DELETE FROM subscriptions");
  const budget = planProductBudget();
  let n = 0;
  /* ELK VULABONNEMENT KRIJGT EEN EIGEN KLANT, en dat is geen omweg maar het punt:
     de partiële UNIQUE index laat één lopend abonnement per klant toe, dus een
     volle agenda bestaat uit verschillende merken. Eerste versie hing ze allemaal
     aan klant 8 en liep op die index stuk — de index deed precies zijn werk. */
  for (let i = 0; i * productsFor('brand') < budget; i += 1) {
    const kid = 100 + i;
    db.prepare('INSERT INTO customers (id, email) VALUES (?, ?)').run(kid, `vol${i}@voorbeeld.test`);
    db.prepare(
      `INSERT INTO subscriptions (customer_id, ref, plan, term, status) VALUES (?, ?, 'brand', 'monthly', 'active')`
    ).run(kid, `SUB-VOL-${i}`);
    n += 1;
  }
  const vastgelegd = n * productsFor('brand');
  ok(`de agenda is vol (${vastgelegd} van ${budget})`, vastgelegd >= budget, true);

  const voor = staat.aanroepen.length;
  const res = await start({ plan: 'starter', term: 'monthly' });
  ok('een nieuwe aanvraag wordt geweigerd', res.headers.get('location'), '/nl/start/plan?fout=vol');
  ok('en er is niets naar Mollie gegaan', staat.aanroepen.length, voor);
  ok('en er staat geen nieuwe rij',
    telling(db, "SELECT COUNT(*) FROM subscriptions WHERE customer_id = 7"), 0);
}

console.log('\nals Mollie stuk is, gebeurt er niets stils');
{
  db.exec("DELETE FROM subscriptions");
  staat.stuk = '/v2/payments';
  const res = await start({ plan: 'starter', term: 'monthly' });
  ok('de klant gaat terug met een reden', res.headers.get('location'), '/nl/start/plan?fout=mollie');
  /* DE RIJ BLIJFT STAAN, en dat is met opzet: hij staat op 'pending' en blokkeert
     een tweede poging niet stil weg — de volgende poging ziet hem en stuurt de
     klant naar zijn dashboard in plaats van een tweede machtiging te vragen. Wat
     er NIET gebeurt is een half afgemaakt abonnement dat actief lijkt. */
  ok('het abonnement is niet actief geworden', rij()?.status, 'pending');
  ok('en er is geen mandaat', rij()?.mollie_mandate_id, null);
  staat.stuk = null;
}

console.log('\nde eerste termijn valt een maand later');
{
  /* De klant betaalt nu € 1 voor het mandaat. Viel de eerste termijn vandaag, dan
     betaalde hij twee keer in dezelfde week. */
  ok('van 17 augustus naar 17 september', eersteTermijn(new Date('2026-08-17T12:00:00Z')), '2026-09-17');
  /* De 28e als bovengrens, om dezelfde reden als window_day in migratie 0030:
     februari mag geen uitzondering worden. */
  ok('de 31e wordt de 28e', eersteTermijn(new Date('2026-12-31T12:00:00Z')), '2027-01-28');
  ok('en de jaargrens klopt', eersteTermijn(new Date('2026-12-05T12:00:00Z')), '2027-01-05');
}

console.log('\nen de weg bestaat echt — geen knop zonder draad');
{
  const src = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  /* DIT IS DE TOETS DIE ER OP 16 AUGUSTUS NIET WAS. Toen bestonden alle functies
     en riep niets ze aan; het viel pas op doordat Lucas ernaar vroeg. */
  ok('account.js roept het starten aan', /handleSubscribeStart\(context, customer/.test(src), true);
  ok('en de terugkomst', /handleSubscribeReturn\(context, customer\)/.test(src), true);
  ok('er is een route om te starten', /'\/account\/plan\/start'/.test(src), true);
  ok('en een om terug te komen', /'\/account\/plan\/return'/.test(src), true);

  const pagina = readFileSync(new URL('../src/components/order/PlanPicker.astro', import.meta.url), 'utf8');
  ok('de keuzepagina post naar die route', /action="\/account\/plan\/start"/.test(pagina), true);
  /* DE PLANKAARTEN STAAN SINDS 20 AUGUSTUS 2026 OP /plans EN NIET MEER OP
     /pricing — twee manieren om te kopen, twee pagina's. Deze test volgt de
     kaarten mee: wat hij bewaakt is dat de knop op de plankaart naar de
     keuzepagina wijst en niet naar het contactformulier, en dat blijft waar
     ongeacht op welke pagina de kaart staat. */
  const plan = readFileSync(new URL('../src/components/PlansPage.astro', import.meta.url), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  ok('en de knop op de abonnementenpagina wijst naar de keuzepagina',
    /lp\('\/start\/plan'\)/.test(plan), true);
  ok('en niet meer naar het contactformulier', /pack-cta[^>]*\/contact/.test(plan), false);
  /* En de prijspagina wijst nog wel naar de abonnementen, zodat de twee manieren
     om te kopen vindbaar blijven vanaf elkaar. */
  const prijs = readFileSync(new URL('../src/components/PricingPage.astro', import.meta.url), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  ok('en de prijspagina wijst naar de abonnementen', /lp\('\/plans'\)/.test(prijs), true);
}

/* ══ OPZEGGEN EN PAUZEREN STOPPEN DE INCASSO ══════════════════════════════
 *
 * DE FOUT DIE DIT VANGT, HEEFT BESTAAN EN KOSTTE KLANTEN GELD.
 * `cancelMollieSubscription()` stond sinds 16 augustus 2026 in mollie.js en
 * werd door niets aangeroepen. Een klant typte CANCEL, de rij ging op
 * 'cancelled', zijn dashboard zei dat het opgezegd was, en Mollie schreef de
 * volgende maand € 390 tot € 1.690 af. Gevonden op 18 augustus 2026 bij het
 * opzoeken van de feiten voor de abonnementsvoorwaarden.
 *
 * WAT HIER WORDT VASTGEHOUDEN, EN DE DERDE IS DE BELANGRIJKSTE:
 *
 *   1 · Opzeggen stuurt een DELETE naar Mollie.
 *   2 · Pauzeren doet dat ook — de Subscriptions API kent geen pauze.
 *   3 · Lukt dat DELETE niet, dan wordt er NIET opgezegd. De rij blijft
 *       'active'. Dat is de kern: een scherm dat "opgezegd" zegt terwijl er
 *       wordt afgeschreven, is de ene toestand die niet mag bestaan, en het is
 *       precies de toestand waar de code in terechtkwam.
 *   4 · Pauzeren wist het Mollie-id naar NULL en niet naar ''. Op deze tabel
 *       staat een partiële UNIQUE index met `WHERE mollie_subscription_id IS
 *       NOT NULL`; twee gepauzeerde abonnementen met '' zouden op elkaar
 *       botsen, stil, en er zou een dood id blijven staan waarop de webhook
 *       betalingen terugzoekt.
 */
console.log('\nopzeggen en pauzeren stoppen de incasso');
{
  const { stopIncasso, hervatIncasso } = await import('../src/lib/subscribe.js');
  const { clearMollieSubscriptionId } = await import('../src/lib/subscription.js');

  const lopend = {
    id: 1, ref: 'ABO-TEST', plan: 'starter', term: 'monthly',
    mollie_customer_id: 'cst_nep', mollie_subscription_id: 'sub_nep', mollie_mandate_id: 'mdt_nep',
  };

  // 1 · het DELETE gaat er echt heen, met beide ids in het pad
  staat.aanroepen.length = 0; staat.stuk = null;
  ok('stoppen lukt', await stopIncasso(env, lopend), true);
  ok('en stuurt een DELETE naar Mollie',
    staat.aanroepen.some((a) => a === 'DELETE /v2/customers/cst_nep/subscriptions/sub_nep'), true);

  // 2 · een abonnement dat bij Mollie nooit bestond, is al stil
  staat.aanroepen.length = 0;
  ok('zonder Mollie-id valt er niets te stoppen',
    await stopIncasso(env, { ...lopend, mollie_subscription_id: null }), true);
  ok('en dan gaat er ook geen verzoek heen', staat.aanroepen.length, 0);

  // 3 · een storing bij Mollie is GEEN geslaagde opzegging
  staat.stuk = '/subscriptions/';
  ok('een storing bij Mollie telt niet als gestopt', await stopIncasso(env, lopend), false);
  staat.stuk = null;

  // en zonder sleutel al helemaal niet — dat is een configuratiefout, geen succes
  ok('zonder Mollie-sleutel telt het niet als gestopt',
    await stopIncasso({ ...env, MOLLIE_API_KEY: '' }, lopend), false);

  // 4 · hervatten bouwt een NIEUWE subscription op het bestaande mandaat
  staat.aanroepen.length = 0;
  const sub = db.prepare('SELECT * FROM subscriptions ORDER BY id DESC LIMIT 1').get();
  if (sub) {
    ok('hervatten lukt',
      await hervatIncasso(env, { ...sub, mollie_customer_id: 'cst_nep', mollie_mandate_id: 'mdt_nep' },
        'https://visuails.com'), true);
    ok('en maakt een nieuwe subscription aan',
      staat.aanroepen.some((a) => a === 'POST /v2/customers/cst_nep/subscriptions'), true);
    ok('zonder opnieuw om een mandaatbetaling te vragen',
      staat.aanroepen.some((a) => a === 'POST /v2/payments'), false);

    // 5 · wissen gaat naar NULL, want '' botst op de partiële UNIQUE index
    await clearMollieSubscriptionId(env, sub.id);
    const na = db.prepare('SELECT mollie_subscription_id AS id FROM subscriptions WHERE id = ?').get(sub.id);
    ok('het Mollie-id is NULL en niet een lege string', na.id, null);
  }
}

/* ══ EN DE HANDLERS ROEPEN DAT OOK ECHT AAN ═══════════════════════════════
 * De functies hierboven kunnen kloppen terwijl niemand ze aanroept — dat was
 * letterlijk de fout. Deze controle gaat over de aanroep, en over de VOLGORDE:
 * de incasso stoppen staat vóór het bijwerken van de toestand, en bij een
 * mislukking wordt er teruggekeerd zonder de rij aan te raken.
 */
console.log('\nde handlers roepen het aan, en in de goede volgorde');
{
  const acc = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');

  ok('account.js importeert stopIncasso en hervatIncasso',
    /import \{[^}]*stopIncasso[^}]*hervatIncasso[^}]*\} from '\.\/subscribe\.js'/.test(acc), true);

  const cancel = acc.slice(acc.indexOf('async function handlePlanCancel'));
  const cancelBody = cancel.slice(0, cancel.indexOf('\n}\n'));
  ok('opzeggen roept stopIncasso aan', /stopIncasso\(env, state\.sub\)/.test(cancelBody), true);
  ok('en keert terug zodra dat mislukt',
    /if \(!await stopIncasso\([^)]*\)\) return seeOther/.test(cancelBody), true);
  ok('en stopIncasso staat vóór cancelSubscription',
    cancelBody.indexOf('stopIncasso') < cancelBody.indexOf('cancelSubscription'), true);

  const pause = acc.slice(acc.indexOf('async function handlePlanPause'));
  const pauseBody = pause.slice(0, pause.indexOf('\n}\n'));
  ok('pauzeren roept stopIncasso aan', /stopIncasso\(env, state\.sub\)/.test(pauseBody), true);
  ok('en staat vóór pauseSubscription',
    pauseBody.indexOf('stopIncasso') < pauseBody.indexOf('pauseSubscription'), true);
  ok('hervatten roept hervatIncasso aan', /hervatIncasso\(env, state\.sub/.test(pauseBody), true);
  ok('en staat vóór activateSubscription',
    pauseBody.indexOf('hervatIncasso') < pauseBody.indexOf('activateSubscription'), true);
  ok('pauzeren wist het Mollie-id', /clearMollieSubscriptionId\(env, state\.sub\.id\)/.test(pauseBody), true);
  // Niet via setMollieIds: die schrijft met COALESCE en kan geen NULL zetten.
  ok('en niet via setMollieIds', /setMollieIds\([^)]*subscriptionId/.test(pauseBody), false);
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * 11 · DE FOUTMELDING KOMT AAN, EN IN DE JUISTE TAAL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Twee dingen die op 18 augustus 2026 kapot bleken, allebei op de weg terug van
 * een mislukte poging om te betalen:
 *
 *   · terug() gaf altijd '/start/plan' — de Engelse pagina. Een Nederlandse
 *     klant die op een volle agenda stuitte, kwam in een andere taal terug.
 *   · /start/plan is statisch gebouwd (astro.config.mjs: output 'static'), dus
 *     `Astro.url.searchParams` is bij het bouwen leeg. De vijf zinnen die
 *     subscribe.js hierheen stuurt, zijn nooit door één bezoeker gelezen.
 *
 * Deze sectie leest de bron en niet de gebouwde pagina, want dat is waar de
 * fout in zat: een test tegen build/ zou pas omvallen ná een build, en dit is
 * precies het soort regel dat in een refactor stilletjes terugkomt.
 */
{
  const sub = readFileSync(new URL('../src/lib/subscribe.js', import.meta.url), 'utf8');
  const picker = readFileSync(new URL('../src/components/order/PlanPicker.astro', import.meta.url), 'utf8');
  const acc = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');

  // ── de taal ───────────────────────────────────────────────────────────────
  ok('terug() neemt de taal aan', /function terug\(reden, lang\)/.test(sub), true);
  ok('en kiest /nl/start/plan als het niet Engels is',
    /lang === 'en' \? '\/start\/plan' : '\/nl\/start\/plan'/.test(sub), true);

  const start = sub.slice(sub.indexOf('export async function handleSubscribeStart'));
  const startBodyRuw = start.slice(0, start.indexOf('\n}\n'));
  /* ZONDER COMMENTAAR, en dit is de vierde keer dat dit in deze repository
     misgaat. De volgordetoets hieronder vond `terug(` niet in de code maar in
     de zin die uitlegt waarom de taal daarboven wordt gelezen — en die zin
     staat er per definitie vóór. Een toets die zijn eigen toelichting leest,
     is geen toets. */
  const startBody = startBodyRuw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
  ok('geen enkele aanroep van terug() zonder taal',
    /terug\('[a-z]+'\s*\)/.test(startBody), false);
  // De taal moet gelezen zijn vóór de eerste terugval, anders is hij undefined.
  ok('de taal wordt gelezen vóór de eerste terugval',
    startBody.indexOf("form?.get('lang')") < startBody.indexOf('terug('), true);
  /* En de sabotagecontrole op die controle zelf: het commentaar dat hem eerder
     liet slagen, is er nog, dus als het strippen wegvalt komt de fout terug. */
  ok('de ruwe tekst noemt terug() inderdaad al in een comment',
    startBodyRuw.indexOf('terug(') < startBodyRuw.indexOf("form?.get('lang')"), true);
  ok('en account.js stuurt de mollie-terugval ook gelokaliseerd terug',
    /lang === 'en' \? '' : '\/nl'\}\/start\/plan\?fout=mollie/.test(acc), true);

  // ── de zinnen staan echt in de pagina ─────────────────────────────────────
  // Elke reden die subscribe.js kan sturen, moet in PlanPicker een blok hebben.
  const redenen = [...startBody.matchAll(/terug\('([a-z]+)'/g)].map((m) => m[1]);
  ok('subscribe.js kent meer dan één reden', redenen.length > 1, true);
  for (const r of new Set(redenen)) {
    ok(`de reden "${r}" heeft een blok in PlanPicker`,
      picker.includes(`data-plan-fout={id}`) && picker.includes(`${r}:`), true);
  }
  ok('de blokken worden verborgen gerenderd en niet weggelaten',
    /data-plan-fout=\{id\} hidden/.test(picker), true);
  ok('en een script zet er één aan', /data-plan-fout="' \+ reden \+ '"/.test(picker), true);

  // ── en het echot de URL niet ──────────────────────────────────────────────
  // Dit is de regel die van een foutmelding een lek maakt. Hij moet blijven.
  ok('de reden uit de URL wordt gefilterd voordat hij een selector wordt',
    /\/\^\[a-z\]\+\$\/\.test\(reden\)/.test(picker), true);
  ok('en er wordt niets uit de URL in de pagina geschreven',
    /innerHTML|insertAdjacentHTML|textContent\s*=\s*reden/.test(picker), false);

  /* ── HET GEKOZEN PLAN GAAT MEE, EN WORDT AANGEVINKT ─────────────────────
   *
   * De drie knoppen (destijds op /pricing, sinds 20 augustus op /plans) wezen
   * alle drie naar dezelfde kale URL, en
   * PlanPicker vinkt standaard het middelste plan aan. Klikken op de duurste
   * kaart leverde dus de middelste keuze op, op een formulier dat eindigt in
   * een doorlopende machtiging. */
  const plannen = readFileSync(new URL('../src/components/PlansPage.astro', import.meta.url), 'utf8');
  ok('de knop op /plans draagt het plan-id',
    /\$\{lp\('\/start\/plan'\)\}\?plan=\$\{p\.id\}/.test(plannen), true);
  ok('en PlanPicker leest plan én term uit de URL',
    /\['plan', 'term'\]\.forEach/.test(picker), true);
  ok('en zoekt daarmee een radio op in plaats van iets te schrijven',
    /input\[name="' \+ veld \+ '"\]\[value="' \+ waarde \+ '"\]/.test(picker), true);
  /* Dezelfde filter als bij de foutmelding: zonder deze regel zou een waarde
     als 'a"],[name' elke radio op de pagina tegelijk aanvinken. */
  ok('met dezelfde filter op de waarde',
    (picker.match(/\/\^\[a-z\]\+\$\//g) || []).length >= 2, true);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DE MAAND OP MAAT — 1 september 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Vierde unieke optie in abonnementskiezer maar zorg er wel voor dat als
 * mensen custom lifestyle of iets anders customs in het abonnement willen, ze
 * eerst contact met ons moeten opnemen."*
 *
 * Wat hier bewezen moet worden, op volgorde van wat het kost als het misgaat:
 *
 *   1 · HET BEDRAG KOMT NOOIT UIT DE BROWSER. Dit formulier eindigt in een
 *       doorlopende machtiging; een prijs die de klant kan meesturen, is een
 *       prijs die hij kan kiezen.
 *   2 · DE BUNDEL EN HET BEDRAG STAAN OP DE RIJ, bevroren. Verandert de ladder
 *       morgen, dan verandert de afschrijving van een lopend abonnement niet mee.
 *   3 · DE CAPACITEITSPOORT REKENT MET ZIJN EIGEN AANTAL. Een maand op maat heeft
 *       geen productsFor(); zou de poort daarop terugvallen, dan telt hij nul en
 *       is de poort voor deze vorm helemaal open.
 *   4 · ALTIJD MAANDELIJKS. De jaarkorting komt uit de vaste abonnementsprijzen
 *       en die heeft deze vorm niet.
 *   5 · EN DE CONTACTPOORT staat op de pagina, want dat is de belofte die Lucas
 *       maakte: het KAN, maar niet via dit formulier.
 */
console.log('\nde maand op maat');
{
  db.exec("INSERT INTO customers (id, email, brand) VALUES (9, 'maat@merk.test', 'MAAT')");
  const MAAT = { customer_id: 9, email: 'maat@merk.test', brand: 'MAAT' };

  const grenzen = [
    ['te weinig producten', { producten: '4' }],
    ['te veel producten', { producten: '999' }],
    ['geen aantal', { producten: '' }],
    ['meer carrousels dan producten', { producten: '6', carrousels: '7' }],
    ['een negatief aantal clips', { producten: '6', clips: '-2' }],
    ['iets dat geen getal is', { producten: 'zes' }],
  ];
  const voorGrenzen = staat.aanroepen.length;
  for (const [naam, velden] of grenzen) {
    const res = await start({ plan: 'maat', term: 'monthly', window_day: '8', lang: 'nl', ...velden }, MAAT);
    ok(`${naam} wordt geweigerd`, res.headers.get('location'), '/nl/start/plan?fout=maat');
  }
  ok('en geen van die pogingen raakte Mollie', staat.aanroepen.length, voorGrenzen);
  ok('en er staat geen abonnement voor deze klant',
    telling(db, 'SELECT COUNT(*) FROM subscriptions WHERE customer_id = 9'), 0);

  /* ── EEN GELDIGE MAAND ──────────────────────────────────────────────────── */
  const res = await start({
    plan: 'maat', term: 'monthly', window_day: '8', lang: 'nl',
    producten: '9', carrousels: '3', clips: '2',
    /* Meegestuurd en met opzet genegeerd: dit is het veld dat een klant zou
       verzinnen als de prijs uit de browser kwam. */
    amount_cents: '100', bedrag: '1', total: '1',
  }, MAAT);
  ok('een geldige maand gaat door naar Mollie', res.status, 303);

  const r = db.prepare('SELECT * FROM subscriptions WHERE customer_id = 9').get();
  ok('de rij draagt plan maat', r.plan, 'maat');
  ok('en loopt maandelijks', r.term, 'monthly');

  /* HET BEDRAG IS OPNIEUW UITGEREKEND EN NIET OVERGENOMEN. 9 catalogsets op de
     trede van negen plus 3 opslagen plus 2 clips — uit customMonthTotal(), hier
     opnieuw uitgerekend zodat een wijziging in de ladder deze toets meeneemt in
     plaats van hem te laten liegen. */
  const verwacht = Math.round(customMonthTotal({ products: 9, carousels: 3, clips: 2 }).total * 100);
  ok('het bedrag komt uit de ladder en niet uit het formulier', r.amount_cents, verwacht);
  ok('  en zeker niet uit het veld dat de klant meestuurde', r.amount_cents === 100, false);

  /* DE BUNDEL. Negen producten waarvan drie met carrousel is zes catalogslots en
     drie completeslots — een complete slot IS een catalogset plus de carrousel. */
  ok('de bundel staat op de rij', JSON.parse(r.slots_json),
    { catalog: 6, complete: 3, 'video-motion': 2 });
  ok('en customMonthSlots() zegt hetzelfde',
    JSON.parse(r.slots_json), customMonthSlots({ products: 9, carousels: 3, clips: 2 }));

  /* ── WAT HET SYSTEEM ERVAN MAAKT ────────────────────────────────────────── */
  const vol = db.prepare('SELECT * FROM subscriptions WHERE customer_id = 9').get();
  ok('subProducten() telt negen en niet nul', subProducten(vol), 9);
  ok('subMaandCents() geeft het bevroren bedrag', subMaandCents(vol), verwacht);
  ok('bundelVoor() geeft de eigen bundel', bundelVoor(vol), { catalog: 6, complete: 3, 'video-motion': 2 });
  /* En de vorm die het dashboard leest. Zonder de eigen tak in subscriptionShape()
     gooit planShape() hier op productsFor('maat') en geeft het dashboard een 500. */
  const vorm = subscriptionShape(vol);
  ok('subscriptionShape() valt niet om op een maand op maat', Boolean(vorm), true);
  ok('  en noemt het juiste aantal producten', vorm.products, 9);
  ok('  en het juiste aantal clips', vorm.clips, 2);
  ok('  en toont geen verzonnen besparing', vorm.ladderCents, vorm.monthlyCents);

  /* ── DE JAARTERMIJN WORDT AFGEDWONGEN NAAR MAANDELIJKS ──────────────────── */
  db.exec("INSERT INTO customers (id, email, brand) VALUES (10, 'jaar@merk.test', 'JAAR')");
  await start({
    plan: 'maat', term: 'yearly', window_day: '8', lang: 'nl', producten: '6',
  }, { customer_id: 10, email: 'jaar@merk.test', brand: 'JAAR' });
  const rj = db.prepare('SELECT * FROM subscriptions WHERE customer_id = 10').get();
  ok('een jaartermijn op een maand op maat wordt maandelijks', rj?.term, 'monthly');
  /* GEEN WEIGERING MAAR EEN CORRECTIE, en dat is een keuze: de jaarvorm staat niet
     op deze kaart, dus wie hem toch meestuurt heeft een oud formulier of een
     handgeschreven verzoek. Terugsturen met een foutmelding over een keuze die
     niet aangeboden werd, is een doodlopende weg. */
  ok('  en de klant krijgt geen foutmelding over een keuze die er niet was',
    rj?.status, 'pending');
}

console.log('\nde capaciteitspoort rekent met het eigen aantal');
{
  /* Zonder subProducten() telt een maand op maat als NUL in de bezetting, en dan
     is de poort voor elke volgende aanvraag te ruim — precies het tegenovergestelde
     van waar hij voor staat. */
  const bezet = db.prepare(
    "SELECT plan, slots_json FROM subscriptions WHERE status IN ('active','pending','paused')"
  ).all();
  const totaalProducten = bezet.reduce((n, x) => n + subProducten(x), 0);
  const viaPlan = bezet.reduce((n, x) => n + (x.plan === 'maat' ? 0 : productsFor(x.plan)), 0);
  ok('er staat minstens één maand op maat in de bezetting',
    bezet.some((x) => x.plan === 'maat'), true);
  ok('en die telt mee', totaalProducten > viaPlan, true);
  ok('  precies zijn eigen aantal',
    totaalProducten - viaPlan,
    bezet.filter((x) => x.plan === 'maat').reduce((n, x) => n + subProducten(x), 0));
}

console.log('\nde contactpoort voor alles wat eerst opgezet moet worden');
{
  /* Lucas' regel, letterlijk: het KAN, maar niet via dit formulier, want anders
     betaalt de klant vanaf de eerste maand voor een stijl die nog niet bestaat. */
  const picker = readFileSync(new URL('../src/components/order/PlanPicker.astro', import.meta.url), 'utf8');
  ok('de vierde optie staat in het formulier', /value=\{CUSTOM_MONTH_ID\}/.test(picker), true);
  ok('met drie velden en niet met een bedrag',
    ['producten', 'carrousels', 'clips'].every((n) => new RegExp(`name="${n}"`).test(picker)), true);
  /* GEEN PRIJSVELD. Een <input> met een bedrag erin zou precies het veld zijn dat
     §1 hierboven negeert — en een veld dat genegeerd wordt, hoort er niet te staan. */
  ok('en zonder enig veld dat een bedrag meestuurt',
    /name="(amount|bedrag|total|prijs)[^"]*"/.test(picker), false);

  ok('er staat een poort naar contact', /maatCustomCta/.test(picker), true);
  ok('en hij zegt dat het KAN', /kan wél in een abonnement/.test(picker), true);
  ok('en waarom niet hier', /nog niet bestaat/.test(picker), true);
  /* EN GEEN KEUZE DIE HET AANBIEDT EN DAARNA WEIGERT. Een radio of vinkje voor
     'custom lifestyle' zou de klant laten kiezen wat het formulier niet kan. */
  ok('geen invoerveld voor een custom stijl',
    /name="(custom|stijl|style|look)"/.test(picker), false);

  /* ── EN DE BELOFTE DIE NIET MEER VOOR ELKE BUNDEL GELDT ──────────────────
   *
   * "Elk product is een catalogset én een lifestyle-carousel" staat op het
   * dashboard onder het saldo. Dat is waar voor de drie pakketten — die geven
   * alleen `complete` slots — en onwaar zodra iemand een maand op maat met kale
   * catalogslots heeft. Dan belooft die regel een carrousel bij producten die er
   * geen krijgen, op precies het scherm waar de klant kijkt wat hij tegoed heeft.
   *
   * Wat elk slot wél inhoudt, staat er per soort al bij (kindPer), dus er valt
   * niets weg als de zin wegblijft. */
  const acc = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');
  ok('de zin over elk product staat achter een voorwaarde',
    /\$\{elkProduct \? `\$\{esc\(t\.planEachProduct\)\}/.test(acc), true);
  ok('en die voorwaarde leest de bundel van dit abonnement',
    /const productSoorten = Object\.keys\(bundelVoor\(state\.sub\)\)/.test(acc), true);
  /* ── EN ZONDER ÉÉN SOORT BIJ NAAM ────────────────────────────────────────
     Eerste opzet schreef `k === 'complete' || k === 'video-motion'` en viel
     daarmee over de regel die tests/subscription.test.mjs sinds migratie 0035
     aanhoudt: dit scherm mag geen soort kennen, anders tekent het het volgende
     plan half. De vraag "is dit een product" hoort in pricing.js thuis en niet
     hier — PRODUCT_SLOT_KINDS is afgeleid uit SLOT_KINDS, dus een nieuwe soort
     komt er vanzelf goed uit. */
  ok('en noemt daarbij geen enkele soort bij naam',
    /elkProduct[^\n]*'(complete|catalog|lifestyle|video-motion|hooks)'/.test(acc), false);
  ok('maar leunt op de afgeleide lijst uit pricing.js',
    /PRODUCT_SLOT_KINDS\.includes\(k\)/.test(acc), true);
  /* De regel over bijbestellen blijft juist wél staan: bij een zelf samengestelde
     maand is dat het antwoord op "ik wil er deze maand eentje meer". */
  ok('de regel over bijbestellen blijft onvoorwaardelijk',
    /\$\{esc\(t\.planExtraNote\)\}<\/p>/.test(acc), true);
}

globalThis.fetch = echteFetch;
console.log(`\n${ok_}/${totaal} geslaagd`);
if (ok_ !== totaal) process.exit(1);
