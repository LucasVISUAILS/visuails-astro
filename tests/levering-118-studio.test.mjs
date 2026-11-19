/**
 * VISUAILS — levering 118 (17 november 2026), bouwer BG: Studio, facturen en de nachtelijke herinnering.
 *   B1-05  een bestelling zonder inlog op jouw adres staat pas in Studio na betalen (details.zonder_inlog)
 *   P5-11  een vooruitbetaald jaar: de factuurregel met periode en credits, en het juiste btw-label in Studio
 *   P4-10  een vastgelegd merkmodel zegt "staat vast", niet "je beelden staan klaar, alles goedgekeurd"
 *   P4-09  de termijn voor de richtingen, zodra MERKMODEL_RICHTINGEN_WERKDAGEN in termijnen.js staat
 *   P9-13  de creditherinnering noemt alleen diensten die met credits te bestellen zijn, en wat er vervalt
 * Zonder build: de functies zelf, en de bron waar een scherm in Astro staat.
 *   node tests/levering-118-studio.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { vreemdeOnbetaald, orderView, COPY } from '../src/lib/account.js';
/* levering 118 (integratie IA): het blok voor P12-04 is eruit gehaald; dat punt heeft advies "later" (lijst 127). */
import { jaarRegel, snapshotFromSubscription } from '../src/lib/invoice.js';
import { SERVICE_CREDITS, PLAN_CREDITS } from '../src/data/pricing.js';
import { kindLabel } from '../src/lib/slots.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

console.log('\nB1-05 · een bestelling van iemand anders op jouw adres');
const vreemd = { payment_status: 'unpaid', details_json: '{"zonder_inlog":1}' };
ok('zonder inlog en onbetaald: niet in Studio', vreemdeOnbetaald(vreemd) === true);
ok('zonder inlog maar betaald: wel', vreemdeOnbetaald({ ...vreemd, payment_status: 'paid' }) === false);
ok('met credits of terugbetaald: ook', vreemdeOnbetaald({ ...vreemd, payment_status: 'credits' }) === false && vreemdeOnbetaald({ ...vreemd, payment_status: 'refunded' }) === false);
ok('een gewone onbetaalde bestelling (zonder vinkje) blijft staan', vreemdeOnbetaald({ payment_status: 'unpaid', details_json: '{}' }) === false);
ok('kapotte details: blijft staan', vreemdeOnbetaald({ payment_status: 'unpaid', details_json: '{' }) === false);
const acc = lees('src/lib/account.js');
ok('loadOrders() filtert ze, voor elk Studio-scherm', /return \(await loadOrdersAlle\(env, customerId\)\)\.filter\(\(o\) => !vreemdeOnbetaald\(o\)\);/.test(acc));

console.log('\nP5-11 · een vooruitbetaald jaar');
const regel = jaarRegel('Merk', '2026-11-17', 12, PLAN_CREDITS.brand, 'nl');
ok('"12 maanden vooruit, 17 november 2026 tot 17 november 2027, … credits per maand"', regel === `Merk — 12 maanden vooruit, 17 november 2026 tot 17 november 2027, ${PLAN_CREDITS.brand} credits per maand`, regel);
const snap = snapshotFromSubscription({ sub: { plan: 'brand', term: 'prepaid', vat_treatment: 'eu_reverse_charge', ref: 'SUB-TEST' }, customer: { name: 'Test', brand: 'TEST BE BV' }, payment: { amount_cents: 1690000 }, month: '2026-11', lang: 'nl' }, {}, { number: 'PROEF-2026-0001', date: '2026-11-17' });
ok('de factuurregel van een prepaid-abonnement', /12 maanden vooruit, 17 november 2026 tot 17 november 2027/.test(snap.lines[0].description) && !/abonnement november 2026/.test(snap.lines[0].description), snap.lines[0].description);
const maand = snapshotFromSubscription({ sub: { plan: 'brand', term: 'monthly' }, customer: {}, payment: { amount_cents: 100 }, month: '2026-11', lang: 'nl' }, {}, { number: 'X', date: '2026-11-17' });
ok('een maandtermijn blijft "abonnement november 2026"', /abonnement november 2026/.test(maand.lines[0].description));
ok('Engels ook', /12 months in advance, 17 November 2026 to 17 November 2027/.test(jaarRegel('Brand', '2026-11-17', 12, 290, 'en')));
const metVies = snapshotFromSubscription({ sub: { plan: 'brand', term: 'prepaid', vat_treatment: 'eu_reverse_charge', vat_consultation: 'WAPIAAAAW1234567' }, customer: {}, payment: { amount_cents: 1690000 }, month: '2026-11', lang: 'nl' }, {}, { number: 'X', date: '2026-11-17' });
ok('het VIES-nummer van het abonnement op de factuur (migratie 0075)', metVies.viesConsultation === 'WAPIAAAAW1234567' && snap.viesConsultation === null);
ok('migratie 0075 voegt subscriptions.vat_consultation toe', /ALTER TABLE subscriptions ADD COLUMN vat_consultation TEXT;/.test(lees('migrations/0075-abonnement-vies.sql')));
ok('Studio: het btw-label volgt het abonnement (verlegd, buiten de EU)', /sub\.vat_treatment === VAT_TREATMENT\.reverseCharge \? \(L === 'nl' \? '· btw verlegd'/.test(acc) && !/subEersteBetalingBruto\(sub\), L\)\} \$\{btwLabel\('incl', L\)\}/.test(acc));
ok('Studio: "Loopt tot", niet "tot en met"', !/jaarTot: 'Loopt tot en met'/.test(acc) && /jaarTot: 'Loopt tot',/.test(acc));

console.log('\nP4-10 · een vastgelegd merkmodel');
const mm = { id: 9, ref: 'VIS-MM01-AAA', service: 'brand-model', status: 'delivered', closed_at: '2026-11-17 10:00:00', payment_status: 'paid', total_cents: 45000, lang: 'nl', details_json: '{}' };
const vw = orderView(COPY.nl, 'nl', mm, [], []);
const vwTekst = JSON.stringify(vw);
ok('zegt "Je merkmodel staat vast"', /Je merkmodel staat vast/.test(vwTekst));
ok('niet "Je beelden staan klaar" en niet "alles … goedgekeurd"', !/Je beelden staan klaar/.test(vwTekst) && !/alles in deze bestelling goedgekeurd/.test(vwTekst));
ok('en niet "Nog niet geleverd" bij wat wij leverden', !/"Nog niet geleverd\."/.test(vwTekst));
const vwEn = JSON.stringify(orderView(COPY.en, 'en', { ...mm, lang: 'en' }, [], []));
ok('Engels ook', /Your brand model is locked/.test(vwEn) && !/ready to download/.test(vwEn));
const cat = JSON.stringify(orderView(COPY.nl, 'nl', { ...mm, service: 'catalog' }, [], []));
ok('een catalogbestelling blijft zoals hij was', /alles in deze bestelling goedgekeurd/.test(cat));

console.log('\nP4-09 · de termijn voor de richtingen');
const TERMIJNEN = await import('../src/data/termijnen.js');
const n = Number(TERMIJNEN.MERKMODEL_RICHTINGEN_WERKDAGEN) || 0;
const ontvangen = JSON.stringify(orderView(COPY.nl, 'nl', { ...mm, status: 'received', closed_at: null }, [], []));
if (n) ok(`met de constante: "binnen ${n} werkdagen" in Studio`, ontvangen.includes(`binnen ${n} werkdagen`));
else ok('zonder de constante (nog niet in termijnen.js): geen verzonnen getal', !/binnen \d+ werkdagen/.test(ontvangen));
ok('Studio en de betaalmail lezen het getal uit termijnen.js, nergens getypt', /TERMIJNEN\.MERKMODEL_RICHTINGEN_WERKDAGEN/.test(acc) && /TERMIJNEN\.MERKMODEL_RICHTINGEN_WERKDAGEN/.test(lees('src/lib/invoiceMail.js')));

console.log('\nP9-13 · de creditherinnering');
const bron = lees('cron/index.js');
const knip = (naam) => {
  const start = bron.indexOf(`function ${naam}(`);
  let diep = 0; let i = bron.indexOf('{', start);
  for (; i < bron.length; i += 1) { if (bron[i] === '{') diep += 1; else if (bron[i] === '}') { diep -= 1; if (!diep) break; } }
  return bron.slice(start, i + 1);
};
const creditTips = new Function('SERVICE_CREDITS', 'kindLabel', 'VIDEO_OP_AANVRAAG', `${knip('creditTips')}\nreturn creditTips;`)(SERVICE_CREDITS, kindLabel, true);
const tips = creditTips(240, 'nl').join(' | ');
ok('geen hooks', !new RegExp(kindLabel('hooks', 'nl'), 'i').test(tips), tips);
ok('geen video zolang video op aanvraag is', !/clip|video/i.test(tips), tips);
ok('wel catalog of lifestyle', new RegExp(`${kindLabel('catalog', 'nl')}|${kindLabel('lifestyle', 'nl')}`, 'i').test(tips), tips);
const metVideo = new Function('SERVICE_CREDITS', 'kindLabel', 'VIDEO_OP_AANVRAAG', `${knip('creditTips')}\nreturn creditTips;`)(SERVICE_CREDITS, kindLabel, false);
ok('zet je video aan, dan mag Motion weer', metVideo(SERVICE_CREDITS['video-motion'], 'nl').some((x) => new RegExp(kindLabel('video-motion', 'nl'), 'i').test(x)));
ok('het onderwerp noemt wat vervalt, niet "Je hebt nog"', /vervallen over \$\{o\.dagen\} dagen/.test(bron) && !/`Je hebt nog \$\{o\.over\} credits/.test(bron));
ok('bijgekocht heet bijgekocht', /'bijgekochte credits' : 'credits'\} vervallen over/.test(bron));

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
