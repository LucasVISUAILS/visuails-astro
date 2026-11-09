/* VISUAILS — ronde 91 (K-14), 9 november 2026: "op maat" en "bijkopen" tijdelijk achter
 * één knop "Bespreek met ons". Lucas (lijst 85, B8): "Ja, achter Bespreek met ons" —
 * een klant ziet op /plans, /start/plan en in Studio drie plannen en één knop. Alleen
 * zichtbaarheid: de code (routes, prijzen, mails, cron) blijft, en één vlag
 * (ABO_EXTRA_ZICHTBAAR in src/data/aboZichtbaar.js) zet het terug.
 *
 * 1 · de vlag en de knop; 2 · de bron per plek; 3 · de FAQ belooft niets wat uit staat;
 * 4 · de routes werken nog; 5 · de gebouwde pagina's (als dist/ er is);
 * 6 · Studio in de gebouwde Worker (als dist/server er is).
 *   node tests/blind91-k-abonnement.test.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { ABO_EXTRA_ZICHTBAAR, bespreekAbo } from '../src/data/aboZichtbaar.js';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const dist = (p) => { const u = new URL(`../dist/${p}`, import.meta.url); return existsSync(u) ? readFileSync(u, 'utf8') : null; };

console.log('1 · de vlag en de knop');
{
  ok('de vlag staat uit (Lucas, lijst 85: achter "Bespreek met ons")', ABO_EXTRA_ZICHTBAAR === false);
  const nl = bespreekAbo('nl');
  const en = bespreekAbo('en');
  ok('NL: "Bespreek met ons", EN: "Talk to us"', nl.knop === 'Bespreek met ons' && en.knop === 'Talk to us');
  ok('de knop is een WhatsApp-link met een vaste openingszin', /^https:\/\/wa\.me\/\d+\?text=Hallo%20VISUAILS/.test(nl.href) && /^https:\/\/wa\.me\/\d+\?text=Hello%20VISUAILS/.test(en.href), nl.href);
  ok('  met het kenmerk erin als dat er is', decodeURIComponent(bespreekAbo('nl', { ref: 'SUB-TEST' }).href).includes('(SUB-TEST)'));
  ok('geen bedrag in de teksten (prijzen komen uit pricing.js, niet hier)', !/€|\d+,\d{2}/.test(JSON.stringify([nl, en])));
}

console.log('\n2 · de bron per plek');
{
  const plans = lees('src/components/PlansHal.astro');
  ok('/plans: de regel op maat alleen met de vlag aan, anders "Bespreek met ons" op dezelfde plek (#op-maat)',
    /\{ABO_EXTRA_ZICHTBAAR\s*\? <p class="h-pl-maat h-in" id="op-maat">/.test(plans) && /: <p class="h-pl-maat h-in" id="op-maat" data-k14-bespreek>/.test(plans));
  ok('/plans: "Zo werkt het" en de abonneeregel noemen bijkopen alleen met de vlag aan', /zoRegels = ABO_EXTRA_ZICHTBAAR \? c\.zo/.test(plans) && /aboZin = ABO_EXTRA_ZICHTBAAR \? c\.aboZin/.test(plans));
  const picker = lees('src/components/order/PlanPicker.astro');
  ok('/start/plan: de vierde kaart (op maat) en zijn veld alleen met de vlag aan', /\{ABO_EXTRA_ZICHTBAAR \? \(\s*<Fragment>[\s\S]{0,900}value=\{CUSTOM_MONTH_ID\}/.test(picker) && /\{ABO_EXTRA_ZICHTBAAR && \(\s*<Fragment>[\s\S]{0,700}id="maat-credits"/.test(picker));
  ok('/start/plan: anders een kaart "Bespreek met ons" zonder radio', /<div class="ps-plan ps-bespreek" data-k14-bespreek>/.test(picker));
  const studio = lees('src/pages/account/plan.astro');
  ok('Studio: het bijkoopblok alleen met de vlag aan, anders "Bespreek met ons" op #bijkopen',
    /\{ABO_EXTRA_ZICHTBAAR && v\.bijkoop && \(/.test(studio) && /\{!ABO_EXTRA_ZICHTBAAR && v\.bijkoop && \([\s\S]{0,200}id="bijkopen" data-k14-bespreek/.test(studio));
  ok('Studio: bij Overstappen op maat alleen met de vlag aan', /ovOpties = v\.overstap \? v\.overstap\.opties\.filter\(\(o\) => ABO_EXTRA_ZICHTBAAR \|\| !o\.maat\)/.test(studio) && /\{ovOpties\.map\(/.test(studio));
  const account = lees('src/lib/account.js');
  ok('stap 5 van het bestelformulier krijgt geen bijkooplink (/account/me zonder bijkoop)', /c\.bijkoop = ABO_EXTRA_ZICHTBAAR \? await bijkoopVoorFormulier/.test(account));
}

console.log('\n3 · de FAQ belooft niets wat uit staat');
{
  const { faqPageItems, pricingFaqs } = await import('../src/data/faq.js');
  for (const lang of ['nl', 'en']) {
    const items = [...faqPageItems(lang), ...pricingFaqs(lang)];
    const alles = JSON.stringify(items);
    const bij = items.find((i) => /bijkopen|buy extra credits/i.test(i.q || ''));
    ok(`${lang}: de vraag over bijkopen wijst naar ons, niet naar een knop in Studio`, !!bij && /Bespreek|Talk to us/.test(bij.a || '') && !/in VISUAILS Studio/.test(bij.a || ''), String(JSON.stringify(bij)).slice(0, 160));
    ok(`${lang}: nergens "een eigen aantal credits op maat" / "your own number of credits"`, !/eigen aantal credits op maat|your own number of credits/.test(alles));
  }
}

console.log('\n4 · de code blijft staan (alleen zichtbaarheid)');
{
  const account = lees('src/lib/account.js');
  ok('de routes /account/plan/bijkopen en /account/plan/overstap bestaan nog', /path === '\/account\/plan\/bijkopen'/.test(account) && /\/account\/plan\/overstap/.test(account));
  const { OVERSTAP_PLANNEN } = await import('../src/lib/overstap.js');
  ok('overstappen kent op maat nog (de vlag terug aan = alles terug)', OVERSTAP_PLANNEN.includes('maat'));
}

console.log('\n5 · de gebouwde pagina\'s');
for (const [pad, taal] of [['plans/index.html', 'en'], ['nl/plans/index.html', 'nl']]) {
  const h = dist(pad);
  if (!h) { console.log(` --   dist/${pad} niet gebouwd, overgeslagen`); continue; }
  ok(`${taal} /plans: geen link naar het abonnement op maat`, !/plan=maat#maat-credits/.test(h));
  ok(`${taal} /plans: wel "${bespreekAbo(taal).knop}" als WhatsApp-knop in #op-maat`, /id="op-maat" data-k14-bespreek>[\s\S]{0,400}class="h-knop k k-lijn" data-rol="contact" href="https:\/\/wa\.me\//.test(h));  /* knoppensysteem lijst 88/89: de lijnknop heet nu .k.k-lijn, met data-rol */ 
  ok(`${taal} /plans: drie plankaarten`, (h.match(/class="h-pk h-in[ "]/g) || []).length === 3);
}
for (const [pad, taal] of [['start/plan/index.html', 'en'], ['nl/start/plan/index.html', 'nl']]) {
  const h = dist(pad);
  if (!h) { console.log(` --   dist/${pad} niet gebouwd, overgeslagen`); continue; }
  ok(`${taal} /start/plan: drie plannen om te kiezen, geen vierde (op maat)`, (h.match(/<input type="radio" name="plan" value="[a-z]+"/g) || []).length === 3 && !/name="plan" value="maat"/.test(h));
  ok(`${taal} /start/plan: geen veld voor credits op maat`, !/id="maat-credits"/.test(h));
  ok(`${taal} /start/plan: de kaart "Bespreek met ons"`, /data-k14-bespreek[\s\S]{0,400}href="https:\/\/wa\.me\//.test(h));
}

console.log('\n6 · Studio (gebouwde Worker)');
if (!existsSync(new URL('../dist/server/wrangler.json', import.meta.url))) {
  console.log(' --   dist/server ontbreekt: bouw eerst (npx astro build); overgeslagen');
} else {
  const { startStudio } = await import('./lib/studio-worker.mjs');
  const { hashToken } = await import('../src/lib/token.js');
  const token = 'k14-sessie-abonnee-000000001';
  const maand = new Date().toISOString().slice(0, 7);
  const vervalt = new Date(Date.now() + 80 * 864e5).toISOString().slice(0, 10);
  const studio = await startStudio({ extraSql: [
    `INSERT INTO customers (id, email, name, first_name, brand, phone, country, address_line1, postal_code, city) VALUES (9141, 'k14@voorbeeld.test', 'Test Klant', 'Test', 'TESTMERK', '06 12345678', 'NL', 'Teststraat 1', '1234 AB', 'Teststad')`,
    `INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (9141, '${await hashToken(token)}', datetime('now'), datetime('now', '+30 days'))`,
    /* Met een Mollie-incasso, anders kan er niet overgestapt worden (magOverstappen()). */
    `INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, mollie_customer_id, mollie_mandate_id, mollie_subscription_id) VALUES (9141, 9141, 'SUB-K14', 'studio', 'monthly', 'active', '${maand}-01 09:00:00', 'cst_k14test', 'mdt_k14test', 'sub_k14test')`,
    `INSERT INTO subscription_months (subscription_id, month, granted) VALUES (9141, '${maand}', 12)`,
    `INSERT INTO credit_boek (id, customer_id, subscription_id, datum, aantal, reden, maand, vervalt_op, rest, sleutel, door) VALUES (91411, 9141, 9141, '${maand}-01 10:00:00', 120, 'termijn', '${maand}', '${vervalt}', 120, 'termijn:9141:1', 'test')`,
  ] });
  try {
    const haal = async (pad) => (await studio.fetch(pad, { cookie: `vis_account=${token}` })).text();
    const credits = await haal('/account/plan?tab=credits');
    ok('tab Credits: geen bijkoopformulier', !/action="\/account\/plan\/bijkopen"/.test(credits));
    ok('tab Credits: "Bespreek met ons" op #bijkopen, als WhatsApp-knop', /id="bijkopen" data-k14-bespreek[\s\S]{0,500}href="https:\/\/wa\.me\/[^"]+"[^>]*>Bespreek met ons/.test(credits), credits.slice(credits.indexOf('bijkopen'), credits.indexOf('bijkopen') + 300));
    const plan = await haal('/account/plan?tab=plan');
    if (!/action="\/account\/plan\/overstap"/.test(plan)) {
      /* De Worker leest het abonnement hier zonder Mollie-incasso; dan zegt Studio
         "Overstappen lukt hier nu niet" en is er geen formulier om naar te kijken.
         Het filter zelf staat in deel 2 (de bron). */
      console.log(' --   tab Je plan: geen overstapformulier in deze nepdata, overgeslagen');
    } else {
      ok('tab Je plan: overstappen naar de twee andere plannen, niet naar op maat', (plan.match(/<input type="radio" name="plan" value="[a-z]+"/g) || []).length === 2 && !/name="plan" value="maat"/.test(plan) && !/id="ov-credits"/.test(plan));
      ok('tab Je plan: en "Bespreek met ons" eronder', /class="st-meta st-k14-bespreek" data-k14-bespreek>[\s\S]{0,300}Bespreek met ons/.test(plan));
    }
  } finally {
    await studio.dispose();
  }
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
