/*
 * VASTE LOOK EN GEGEVENS VULLEN ZICHZELF — punt 2.08 (ronde B, 8 oktober 2026)
 *   node tests/vaste-look-zelf.test.mjs        (geen server, geen browser)
 *
 *   1 · lookUitBestelling(): wat er uit een bestelling mee kan (en wat niet);
 *   2 · vulVasteLookAan(): na een betaalde bestelling (ook credits en de proef)
 *       wordt de vaste look gevuld als hij nog leeg is, nooit overschreven;
 *   3 · de haken: webhook (Mollie), order.js (credits, volledig tegoed);
 *   4 · Studio: geen videoblok meer, "Overgenomen uit VIS-…", geen nudge;
 *   5 · Je gegevens als samenvatting met "Wijzigen"; de Nu-zin zegt wat er
 *       voor de factuur mist.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { hashToken } from '../src/lib/token.js';
import { lookUitBestelling, vulVasteLookAan } from '../src/lib/vasteLook.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(70)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── 1 · WAT ER MEE KAN ────────────────────────────────────────────────── */
console.log('\n1 · lookUitBestelling()');
ok('catalog: achtergrond, verhouding, gezicht en kanalen', lookUitBestelling({ service: 'catalog', details_json: JSON.stringify({ background_hex: 'f7f5f1', ratio: 'portrait45', model: 'ava', channels: 'bol,nep,zalando' }) }),
  { dienst: 'catalog', velden: { background_hex: '#F7F5F1', ratio: 'portrait45', roster_model: 'ava', channels: lookUitBestelling({ service: 'catalog', details_json: '{"channels":"bol,zalando"}' }).velden.channels } });
ok('lifestyle: de huisstijl', lookUitBestelling({ service: 'lifestyle', details_json: '{"style":"glow","ratio":"story"}' }).velden, { look: 'glow', ratio: 'story' });
ok('de look "op aanvraag" gaat nooit mee (§17.18)', lookUitBestelling({ service: 'lifestyle', details_json: '{"style":"custom"}' }).velden, {});
ok('een eigen look (cs-…) wel', lookUitBestelling({ service: 'lifestyle', details_json: '{"style":"cs-4"}' }).velden, { look: 'cs-4' });
ok('"wij kiezen" is geen gezicht', 'roster_model' in lookUitBestelling({ service: 'catalog', details_json: '{"model":"any"}' }).velden, false);
ok('de €1-proef volgt zijn soort (lifestyle)', lookUitBestelling({ service: 'test-sample', details_json: '{"sample_type":"lifestyle","style":"dunes"}' }), { dienst: 'lifestyle', velden: { look: 'dunes' } });
ok('video heeft geen vaste look meer', lookUitBestelling({ service: 'video', details_json: '{}' }), null);

/* ── 2 · VULLEN ────────────────────────────────────────────────────────── */
console.log('\n2 · vulVasteLookAan()');
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema laadt niet:', mislukt.slice(0, 3)); process.exit(1); }
const env = { DB: d1(db) };
db.prepare("INSERT INTO customers (id, email, brand, name, first_name, last_name, phone, country, address_line1, postal_code, city) VALUES (1, 'mara@voorbeeld-volt.test', 'VOLT', 'Mara Visser', 'Mara', 'Visser', '0612345678', 'NL', 'Verzonnenstraat 1', '1234 AB', 'Nergenshuizen')").run();
db.prepare("INSERT INTO customers (id, email, brand, name, phone) VALUES (2, 'joris@voorbeeld-noord.test', 'NOORD', 'Joris Kade', '0611111111')").run();
const order = (id, klant, service, status, betaling, details) => db.prepare(
  `INSERT INTO orders (id, ref, customer_id, email, name, brand, service, status, payment_status, total_cents, lang, details_json, paid_at, created_at)
   VALUES (?, ?, ?, 'x@voorbeeld.test', 'X', 'VOLT', ?, ?, ?, 0, 'nl', ?, '2026-10-03 10:00:00', '2026-10-03 09:00:00')`
).run(id, `VIS-AA${id}0-B1C`, klant, service, status, betaling, JSON.stringify(details));
order(11, 1, 'catalog', 'in_production', 'paid', { background_hex: '#EDE4D8', ratio: 'square', model: 'ava', channels: 'bol' });
order(12, 1, 'catalog', 'in_production', 'paid', { background_hex: '#FFFFFF', ratio: 'portrait34', model: 'elias' });
order(13, 1, 'lifestyle', 'received', 'unpaid', { style: 'flash' });
order(14, 1, 'lifestyle', 'received', 'credits', { style: 'glow', ratio: 'portrait45' });
order(15, 2, 'test-sample', 'received', 'paid', { sample_type: 'catalog', background_hex: '#F7F5F1' });
const lock = (klant, stijl) => db.prepare('SELECT background_hex, look, ratio, roster_model, channels, bron_order_id FROM customer_style_locks WHERE customer_id = ? AND style = ?').get(klant, stijl);

ok('eerste betaalde catalogbestelling: gevuld', await vulVasteLookAan(env, 11), { dienst: 'catalog', gevuld: true });
ok('  met de keuzes van die bestelling en de bron', { ...lock(1, 'catalog') }, { background_hex: '#EDE4D8', look: null, ratio: 'square', roster_model: 'ava', channels: 'bol', bron_order_id: 11 });
ok('een tweede bestelling overschrijft niets', [(await vulVasteLookAan(env, 12)).reden, lock(1, 'catalog').background_hex, lock(1, 'catalog').bron_order_id], ['al-gezet', '#EDE4D8', 11]);
ok('een onbetaalde bestelling vult niets', (await vulVasteLookAan(env, 13)).gevuld, false);
ok('een creditsbestelling wel', [(await vulVasteLookAan(env, 14)).gevuld, lock(1, 'lifestyle').look, lock(1, 'lifestyle').ratio], [true, 'glow', 'portrait45']);
ok('de €1-proef ook', [(await vulVasteLookAan(env, 15)).gevuld, lock(2, 'catalog').background_hex], [true, '#F7F5F1']);
/* Een rij die er al is maar niet "gezet" (bijv. alleen een gezicht): lege velden vullen, de rest blijft. */
db.prepare("INSERT INTO customer_style_locks (customer_id, style, roster_model) VALUES (2, 'lifestyle', 'aaron')").run();
order(16, 2, 'lifestyle', 'in_production', 'paid', { style: 'dunes', model: 'ava', ratio: 'story' });
await vulVasteLookAan(env, 16);
ok('halve rij: look en verhouding erbij, het gekozen gezicht blijft', [lock(2, 'lifestyle').look, lock(2, 'lifestyle').ratio, lock(2, 'lifestyle').roster_model], ['dunes', 'story', 'aaron']);

/* ── 3 · DE HAKEN ──────────────────────────────────────────────────────── */
console.log('\n3 · waar het gebeurt');
const webhook = lees('functions/api/webhook/mollie.js');
ok('webhook: na notifyPaid()', webhook.indexOf('await vulVasteLookAan(env, order.id);') > webhook.indexOf('await notifyPaid(env, order.id);'), true);
const orderJs = lees('functions/api/order.js');
ok('order.js: na een creditsbetaling', /if \(metCredits\) await safe\(\(\) => vulVasteLookAan\(env, orderId\)\);/.test(orderJs), true);
ok('order.js: na volledig met tegoed betaald', /if \(betaaldMetTegoed\) await safe\(\(\) => vulVasteLookAan\(env, orderId\)\);/.test(orderJs), true);

/* ── 4 · STUDIO ────────────────────────────────────────────────────────── */
console.log('\n4 · Je vaste look in Studio');
db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken('volt-token'));
db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (2, ?, '2099-01-01T00:00:00Z')`).run(await hashToken('noord-token'));
const { studioScreen } = await import('../src/lib/account.js');
const scherm = async (sectie, path, tok = 'volt-token') => studioScreen({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_account=${tok}; vis_lang=nl` } }), env, waitUntil() {} }, sectie);
let s = await scherm('brand', '/account/brand-kit');
ok('geen videoblok meer: catalog en lifestyle', s.v.kaarten.map((k) => k.style), ['catalog', 'lifestyle']);
ok('"Overgenomen uit VIS-… (datum). Je volgende bestelling begint hiermee."', /^Overgenomen uit VIS-AA110-B1C \(3 okt\)\. Je volgende bestelling begint hiermee\.$/.test(s.v.kaarten[0].bron), true);
ok('VasteLook.astro tekent de bron', /k\.bron && <span class="st-vl-bron">/.test(lees('src/components/studio/VasteLook.astro')), true);
const plan = await scherm('plan', '/account/plan');
ok('de abonnementspagina kent geen "leg je look vast"-nudge meer', 'nudge' in (plan.v || {}), false);

/* ── 5 · JE GEGEVENS EN DE NU-ZIN ──────────────────────────────────────── */
console.log('\n5 · Je gegevens als samenvatting; de Nu-zin zegt wat er mist');
s = await scherm('details', '/account/details');
ok('compleet: samenvatting, formulier dicht', [s.v.kort.kop, s.v.kort.regels[0], s.v.kort.mist, s.v.open], ['Dit komt op je volgende factuur', 'VOLT', '', false]);
ok('met adres en land in de samenvatting', s.v.kort.regels.includes('Verzonnenstraat 1, 1234 AB Nergenshuizen') && s.v.kort.regels.includes('Nederland'), true);
const pagina = lees('src/pages/account/details.astro');
ok('details.astro: <details> met "Wijzigen" om het formulier', /<details class="st-gegevens" open=\{v\.open\}>/.test(pagina) && /\{v\.kort\.wijzig\}/.test(pagina), true);
s = await scherm('details', '/account/details', 'noord-token');
ok('adres mist: melding en formulier open', [s.v.kort.mist, s.v.open], ['Je adres ontbreekt nog — dat moet op je factuur.', true]);
/* Een aanvraag (video) van de klant zonder adres: de Nu-zin zegt het. */
order(17, 2, 'video', 'received', 'unpaid', { request: 'Een korte clip van onze jas' });
s = await scherm('orders', '/account/orders', 'noord-token');
const kaart = s.v.kaarten.find((k) => k.o.id === 17);
ok('Nu-zin: "Vul je adres aan — dat moet op je factuur voor VIS-…"', kaart.view.nu.zin, 'Vul je adres aan — dat moet op je factuur voor VIS-AA170-B1C.');
ok('met de knop naar Je gegevens', kaart.view.nu.knop, { label: 'Gegevens aanvullen', href: '/account/details' });
const gewoon = s.v.kaarten.find((k) => k.o.id === 15);
ok('een gewone bestelling krijgt die zin niet', gewoon.view.nu.soort === 'gegevensMist', false);

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
