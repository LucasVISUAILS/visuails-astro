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
  ok('een onbekend plan wordt geweigerd',
    (await start({ plan: 'goud', term: 'monthly' })).headers.get('location'), '/start/plan?fout=plan');
  ok('een onbekende termijn ook',
    (await start({ plan: 'studio', term: 'kwartaal' })).headers.get('location'), '/start/plan?fout=termijn');
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
  ok('een nieuwe aanvraag wordt geweigerd', res.headers.get('location'), '/start/plan?fout=vol');
  ok('en er is niets naar Mollie gegaan', staat.aanroepen.length, voor);
  ok('en er staat geen nieuwe rij',
    telling(db, "SELECT COUNT(*) FROM subscriptions WHERE customer_id = 7"), 0);
}

console.log('\nals Mollie stuk is, gebeurt er niets stils');
{
  db.exec("DELETE FROM subscriptions");
  staat.stuk = '/v2/payments';
  const res = await start({ plan: 'starter', term: 'monthly' });
  ok('de klant gaat terug met een reden', res.headers.get('location'), '/start/plan?fout=mollie');
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
  const prijs = readFileSync(new URL('../src/components/PricingPage.astro', import.meta.url), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  ok('en de knop op de prijspagina wijst naar de keuzepagina',
    /lp\('\/start\/plan'\)/.test(prijs), true);
  ok('en niet meer naar het contactformulier', /pack-cta[^>]*\/contact/.test(prijs), false);
}

globalThis.fetch = echteFetch;
console.log(`\n${ok_}/${totaal} geslaagd`);
if (ok_ !== totaal) process.exit(1);
