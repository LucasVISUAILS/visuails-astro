/**
 * "Bestel met dezelfde look" — punt 3.07, 8 oktober 2026.
 *
 * Zonder server. Wat hier vastligt:
 *   · één link met ALLEEN lookkeuzes (look, achtergrond, verhouding, gezicht),
 *     nooit naam, e-mail, KVK of adres (V28 = a);
 *   · de knop zegt wat de klant krijgt: "Catalog bestellen — Classic · gebroken
 *     wit · 4:5"; abonnees zien de credits per product uit pricing.js;
 *   · hij staat op de privélink na afronden en in Studio bij elke geleverde
 *     bestelling; niet bij video, eigen look op aanvraag of een merkmodel;
 *   · het formulier leest ?bg=, ?ratio= en ?face= (applyLookUitUrl in
 *     pipeline.js) en vergelijkt ze alleen met radio's die er al staan.
 */
import { readFileSync } from 'node:fs';
import { herbestelKnop, herbestelDienst, herbestelAllesKnop, bestelInstellingen } from '../src/lib/herbestel.js';
import { accountGet } from '../src/lib/account.js';
import { orderView, COPY } from '../src/lib/account.js';
import { creditsVoorDienst, ladderFloor, euro } from '../src/data/pricing.js';
import { portalGet } from '../src/lib/portal.js';
import { hashToken, mintToken } from '../src/lib/token.js';
import { verseDb, d1 } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — bestel met dezelfde look (3.07)\n');

const CAT = {
  service: 'catalog',
  details_json: JSON.stringify({
    background: 'off-white', background_hex: '#F7F5F1', ratio: 'portrait45', model: 'ava',
    company: 'Voorbeeld Mode BV', kvk: '12345678', address_line1: 'Verzonnenstraat 1', email: 'x@voorbeeld.nl', voorrang: '1', angle_p1_side: '1',
  }),
};
{
  const k = herbestelKnop(CAT, { lang: 'nl' });
  ok('catalog: de knop zegt wat je krijgt', k.label === 'Catalog bestellen — Classic · gebroken wit · 4:5', k.label);
  ok('  de link: formulier met achtergrond, verhouding en gezicht', k.href === '/nl/start/catalog/?bg=F7F5F1&ratio=portrait45&face=ava', k.href);
  ok('  geen naam, KVK, adres, e-mail, voorrang of hoeken in de link (V28 = a)', !/company|kvk|address|email|voorrang|angle|Voorbeeld|12345678/i.test(k.href));
  ok('  geen credits zonder abonnement', k.credits === '');
  const en = herbestelKnop(CAT, { lang: 'en', abonnee: true });
  ok('EN: "Order Catalog — Classic · off-white · 4:5", Engelse route', en.label === 'Order Catalog — Classic · off-white · 4:5' && en.href.startsWith('/start/catalog/?'), en.label);
  ok('abonnee: credits per product uit pricing.js (catalog)', en.credits === `${creditsVoorDienst('catalog', 1)} credits per product`);
  const eigen = herbestelKnop({ service: 'catalog', details_json: JSON.stringify({ background: 'custom', background_hex: '#123ABC', ratio: 'square' }) }, { lang: 'nl' });
  ok('een eigen achtergrondkleur reist mee als hexcode', /bg=123ABC/.test(eigen.href) && eigen.label.includes('#123ABC'));
}
{
  const k = herbestelKnop({ service: 'lifestyle', details_json: JSON.stringify({ style: 'dunes', ratio: 'story', model: 'any' }) }, { lang: 'nl', abonnee: true });
  ok('lifestyle: look en verhouding, geen "any" als gezicht', k.label === 'Lifestyle bestellen — Dunes · 9:16' && k.href === '/nl/start/lifestyle/?style=dunes&ratio=story', `${k.label} ${k.href}`);
  ok('abonnee lifestyle: de credits van lifestyle', k.credits === `${creditsVoorDienst('lifestyle', 1)} credits per product`);
  const eigen = herbestelKnop({ service: 'lifestyle', details_json: JSON.stringify({ style: 'cs-12' }) }, { lang: 'en' });
  ok('een eigen look gaat mee als cs-<id> (addOwnStyles leest hem)', eigen.href === '/start/lifestyle/?style=cs-12' && eigen.label === 'Order Lifestyle — own look');
  const raar = herbestelKnop({ service: 'lifestyle', details_json: JSON.stringify({ style: 'a"],[b', ratio: '<x>', model: '../../x' }) }, { lang: 'nl' });
  ok('rare waarden vallen weg in plaats van door te lekken', raar.href === '/nl/start/lifestyle/');
}
for (const service of ['video', 'custom', 'brand-model', 'complete']) {
  ok(`${service}: geen knop`, herbestelKnop({ service, details_json: '{}' }) === null && herbestelDienst({ service }) === null);
}
{
  const p = herbestelKnop({ service: 'test-sample', details_json: JSON.stringify({ sample_type: 'catalog', background_hex: '#FFFFFF', ratio: 'square' }) }, { lang: 'nl' });
  ok('proef: "Bestel in deze look", naar het catalogformulier', p.label === 'Bestel in deze look' && p.href.startsWith('/nl/start/catalog/?bg=FFFFFF'));
  ok('proef: "catalogfoto’s vanaf €39 per product" uit de staffel, niet getypt', p.vanaf === `catalogfoto’s vanaf ${euro(ladderFloor('catalog'), 'nl')} per product`);
  const pl = herbestelKnop({ service: 'test-sample', details_json: JSON.stringify({ sample_type: 'lifestyle', style: 'glow' }) }, { lang: 'en' });
  ok('proef lifestyle: naar het lifestyleformulier, met het lifestylebedrag', pl.href === '/start/lifestyle/?style=glow' && pl.vanaf === `lifestyle carousels from ${euro(ladderFloor('lifestyle'), 'en')} per product`);
}
ok('geen getypt bedrag of getal in herbestel.js', !/€\s?\d|\d+\s?credits/.test(lees('src/lib/herbestel.js').replace(/\/\*[\s\S]*?\*\//g, '')));

/* Studio: bij elke geleverde bestelling, ook nog niet afgerond; niet ervoor. */
{
  const files = [{ id: 1, kind: 'delivery', review_state: 'pending', product_key: 'p1' }];
  const geleverd = orderView(COPY.nl, 'nl', { id: 5, ref: 'VIS-5', status: 'delivered', payment_status: 'paid', total_cents: 9800, ...CAT }, files, [], null, 0, 0, '', { abonnee: true });
  ok('Studio: geleverd → de knop, met credits voor de abonnee', geleverd.herbestel?.label === 'Catalog bestellen — Classic · gebroken wit · 4:5' && geleverd.herbestel.credits === '4 credits per product');
  const bezig = orderView(COPY.nl, 'nl', { id: 6, ref: 'VIS-6', status: 'in_production', payment_status: 'paid', total_cents: 9800, ...CAT }, [], [], null, 0);
  ok('Studio: nog in productie → geen knop', bezig.herbestel === null);
  const kaart = lees('src/components/studio/Bestelling.astro');
  ok('Studio: de knop is een gewone link, geen script', /class=\{`btn \$\{v\.herbestel\.proef \? 'btn-primary' : 'btn-2nd'\} btn-sm`\} href=\{v\.herbestel\.href\}/.test(kaart) && !/<script/.test(kaart));
}

/* De privélink na afronden. */
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'studio@voorbeeld-volt.nl', 'VOLT')");
  db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, lang, brand, total_cents, payment_status, delivery_mailed_at, closed_at, details_json)
    VALUES (1, 'VIS-TEST-3007', 1, 'catalog', 'delivered', 'unattended', 1, 'studio@voorbeeld-volt.nl', 'nl', 'VOLT', 9800, 'paid', datetime('now'), datetime('now'), ?)`).run(CAT.details_json);
  db.exec("INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at, amount_cents) VALUES (1, 1, 'SUB-TEST-1', 'studio', 'monthly', 'active', 8, '2026-07-01', 79000)");
  db.exec("INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot) VALUES (1, 1, 'delivery', 'k1', 'b1.jpg', 1000, 'approved', 'p1', 'front')");
  const token = mintToken();
  db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (1, ?)').run(await hashToken(token));
  const html = await (await portalGet({ request: new Request(`https://visuails.com/o/${token}`), env: { DB: d1(db) }, waitUntil() {} })).text();
  ok('privélink na afronden: de knop in het afrondblok', html.indexOf('class="herbestel"') > html.indexOf('id="afgerond"') && html.indexOf('class="herbestel"') < html.indexOf('class="facts"'));
  ok('  met de echte keuzes van de bestelling', html.includes('href="/nl/start/catalog/?bg=F7F5F1&amp;ratio=portrait45&amp;face=ava">Catalog bestellen — Classic · gebroken wit · 4:5</a>'));
  ok('  en de credits voor een abonnee', html.includes('4 credits per product'));
}

/* Het formulier leest ?bg=, ?ratio= en ?face=. */
{
  const pl = lees('src/scripts/pipeline.js');
  const fn = pl.slice(pl.indexOf('function applyLookUitUrl('), pl.indexOf('function applyVanBestelling('));
  ok('pipeline.js: applyLookUitUrl leest bg, ratio en face', /qs\.get\('bg'\)/.test(fn) && /qs\.get\('ratio'\)/.test(fn) && /qs\.get\('face'\)/.test(fn));
  ok('  filtert eerst en vergelijkt alleen met radio\'s die er staan', /\^\[0-9A-F\]\{6\}\$/.test(fn) && /qa\('input\[name="ratio"\]'\)\.find/.test(fn) && /qa\('input\[name="model"\]'\)\.find/.test(fn));
  ok('  zet nooit HTML uit de URL op de pagina', !/innerHTML|insertAdjacentHTML|textContent\s*=/.test(fn));
  ok('  slaat een uitgezette radio over', /r\.disabled/.test(fn));
  ok('  draait na het binden en opnieuw voor een eigen merkmodel na /account/me', /bindModel\(\);\s*\/\*[\s\S]*?\*\/\s*applyLookUitUrl\(\);/.test(pl) && /applyBrandKit\(me\);\s*\/\*[\s\S]*?\*\/\s*applyLookUitUrl\(\{ alleenGezicht: true \}\);/.test(pl));
  ok('StylePicker leest ?style= al (niet dubbel gebouwd)', /get\('style'\)/.test(lees('src/components/order/StylePicker.astro')) && !/get\('style'\)/.test(fn));
}

/* ── OPNIEUW BESTELLEN MET ALLE INSTELLINGEN — 15 oktober 2026 (werklijst 33) ── */
console.log('\nopnieuw bestellen met alle instellingen (werklijst 33)');
{
  const det = { background: 'custom', background_hex: '#EFEFEF', ratio: 'portrait45', model: 'ava', channels: 'own,social',
    angle_inside: '1', 'angle_three-quarter': '1', 'angle_eigen-ground': '1', 'angle_note_eigen-ground': 'Binnenkant van de kraag',
    'angle_flat-lay': '1', name: 'Mara', email: 'mara@voorbeeldmerk.test', vat: 'NL000000000B01', voorrang: '1' };
  const o = { id: 42, ref: 'VIS-TEST-0042', service: 'catalog', status: 'in_production', details_json: JSON.stringify(det) };
  const k = herbestelAllesKnop(o, { lang: 'nl' });
  ok('Studio-link: lookkeuzes plus ?van=<id>, verder niets', k && k.href === '/nl/start/catalog/?bg=EFEFEF&ratio=portrait45&face=ava&van=42', k?.href);
  ok('  ook bij een bestelling die nog loopt', !!k);
  ok('  niet bij een proef, een geannuleerde of video', !herbestelAllesKnop({ ...o, service: 'test-sample' }) && !herbestelAllesKnop({ ...o, status: 'cancelled' }) && !herbestelAllesKnop({ ...o, service: 'video' }));
  ok('  de uitleg noemt wat er meegaat, per dienst', /extra hoeken/.test(k.uitleg) && /notitie/.test(herbestelAllesKnop({ ...o, service: 'lifestyle', details_json: '{}' }, { lang: 'nl' }).uitleg));
  const inst = bestelInstellingen(o);
  ok('instellingen: achtergrond, verhouding, model, kanalen', [inst.bg, inst.ratio, inst.model, inst.kanalen.join(',')].join('|') === 'EFEFEF|portrait45|ava|own,social', JSON.stringify(inst));
  ok('  de extra hoeken met de eigen naam; flat lay (vervallen) niet', inst.hoeken.map((h) => h.id).sort().join(',') === 'eigen-ground,inside,three-quarter' && inst.hoeken.find((h) => h.id === 'eigen-ground').note === 'Binnenkant van de kraag', JSON.stringify(inst.hoeken));
  ok('  nooit naam, e-mail, btw-nummer of voorrang', !/Mara|mara@|NL000000000B01/.test(JSON.stringify(inst)) && !('voorrang' in inst));
  /* De route: alleen de eigenaar. */
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'studio@voorbeeld-volt.nl', 'VOLT'), (2, 'iemand@anders.test', 'ANDERS')");
  db.prepare("INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, details_json) VALUES (42, 'VIS-TEST-0042', 1, 'catalog', 'in_production', 'Mara', 'VOLT', 'studio@voorbeeld-volt.nl', 0, 'nl', 2, ?)").run(JSON.stringify(det));
  const eigen = await mintToken(); const ander = await mintToken();
  db.prepare("INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (1, ?, datetime('now'), datetime('now', '+30 days'))").run(await hashToken(eigen));
  db.prepare("INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (2, ?, datetime('now'), datetime('now', '+30 days'))").run(await hashToken(ander));
  const vraag = async (tok) => accountGet({ request: new Request('https://visuails.com/account/orders/42/instellingen', { headers: tok ? { cookie: `vis_account=${tok}` } : {} }), env: { DB: d1(db) }, waitUntil() {} });
  const r1 = await vraag(eigen);
  const j = await r1.json();
  ok('route: de eigenaar krijgt de instellingen als JSON, niet gecachet', r1.status === 200 && j.ref === 'VIS-TEST-0042' && j.hoeken.length === 3 && r1.headers.get('cache-control') === 'no-store', `${r1.status}`);
  ok('route: een andere klant krijgt 404', (await vraag(ander)).status === 404);
  ok('route: uitgelogd 401', (await vraag('')).status === 401);
  /* Het formulier. */
  const pl = lees('src/scripts/pipeline.js');
  const fn = pl.slice(pl.indexOf('function applyVanBestelling('), pl.indexOf('function applyBrandKit('));
  ok('formulier: haalt de instellingen op bij de eigen route, met de sessie', /fetch\(`\/account\/orders\/\$\{id\}\/instellingen`/.test(fn) && /credentials: 'same-origin'/.test(fn));
  ok('  zet nooit HTML uit het antwoord op de pagina', !/innerHTML|insertAdjacentHTML/.test(fn));
  ok('  vergelijkt alleen met velden die de pagina tekent', /qa\('input\[name="style"\]'\)\.find/.test(fn) && /q\(`input\[name="angle_\$\{h\.id\}"\]`\)/.test(fn));
  ok('  het blok is weg te klikken (knop en Esc)', /data-pl-van-sluit/.test(fn) && /Escape/.test(fn));
  ok('  draait na de brand kit (de keuzes van toen gaan voor)', /applyLookUitUrl\(\{ alleenGezicht: true \}\);\s*\/\*[\s\S]*?\*\/\s*applyVanBestelling\(me\);/.test(pl));
  const of = lees('src/components/order/OrderFlow.astro');
  ok('  het blok staat in het formulier, verborgen tot het gevuld is', /<div class="pl-lost pl-open pl-van" data-pl-van hidden role="status">/.test(of));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
