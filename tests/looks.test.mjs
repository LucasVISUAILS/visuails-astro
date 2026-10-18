/**
 * De complete look — levering 60, 17 oktober 2026 (afvinklijst 38, alles "doen").
 *
 * Een look is een koppeling tussen twee of drie producten uit dezelfde
 * lifestylebestelling: € 50 per look (v38-prijs a), 4 credits per look
 * (v38-credits a), twee lookbeelden erbij (v38-beelden a), geen apart maximum
 * aantal looks en elk stuk in hooguit één look (v38-max a). Catalog en de proef
 * hebben geen looks (b-regels), en de oude outfittoeslag werd bij catalog door de
 * server wél gerekend als het veld meekwam (d-fouten). Hier ligt vast:
 *
 *   1  de regels (looks.js): wat past waar, wat een geldige look is, schoonLooks
 *   2  de prijs, de credits en de agenda (quote.js, creditKosten.js, capacity.js)
 *   3  /api/order: wat er in het dossier komt, ook bij een verouderde of
 *      zelfgebouwde post
 *   4  de levering: de twee vakjes van een look, de werkmap, het bord, de zip,
 *      Studio, de factuur en opnieuw bestellen
 *   5  de woorden: één verhaal op de site (d-teksten)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  pastOp, lookKlopt, schoonLooks, looksVan, lookAantal, lookPlekkenVan, lookRegels, lookCopy,
  LOOK_PRIJS, LOOK_CREDITS, LOOK_BEELDEN, LOOK_MAX, LOOK_PRODUCT_DEEL,
} from '../src/data/looks.js';
import { quoteOrder } from '../src/lib/quote.js';
import { creditKosten, watPast } from '../src/data/creditKosten.js';
import { rowPunten } from '../src/data/capacity.js';
import { LADDER, puntenVoor } from '../src/data/pricing.js';
import { LOOK_VAKKEN, isLookSleutel, lookSleutels, vakkenVoor, vakIdsVoor, vakNaam, vakWoord } from '../src/data/levervakken.js';
import { parseScaffoldPath, lookFolder, lookBriefingText, scaffoldFiles } from '../src/lib/scaffold.js';
import { deliveryEntries } from '../src/lib/delivery.js';
import { stylingVoor } from '../src/data/garments.js';
import { bestelInstellingen } from '../src/lib/herbestel.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0;
let fail = 0;
function ok(name, got, want, extra = '') {
  const goed = JSON.stringify(got) === JSON.stringify(want);
  if (goed) pass++; else fail++;
  console.log(`${goed ? ' ok  ' : ' FAIL'} ${name}${goed ? '' : ` — verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}${extra ? ` (${extra})` : ''}`}`);
}
const rate = (n) => LADDER.lifestyle.find(([lo, hi]) => n >= lo && (hi === null || n <= hi))[2];

/* ── 1 · DE REGELS ──────────────────────────────────────────────────────────── */
console.log('\n1 · de regels (src/data/looks.js)');
ok('een top past op Top, een broek op Broek, een schoen op Schoenen', [pastOp('top', 'top'), pastOp('bottom', 'trousers'), pastOp('shoes', 'shoes')], [true, true, true]);
ok('een broek past niet op Top', pastOp('top', 'trousers'), false);
ok('onder een hoodie past alleen een top (geen jurk)', [pastOp('underlayer', 'top'), pastOp('underlayer', 'dress')], [true, false]);
ok('een jas of tas vult geen plek in een ander beeld', [pastOp('top', 'outerwear'), pastOp('bottom', 'bag')], [false, false]);
const lid = (n, garment, context = {}) => ({ n, garment, context });
ok('hoodie + broek + sneaker is een look', lookKlopt([lid(1, 'top', { bottom: 'look' }), lid(2, 'trousers', { top: 'look', shoes: 'look' }), lid(3, 'shoes', { bottom: 'look' })]).ok, true);
ok('één stuk is geen look', lookKlopt([lid(1, 'top')]).waarom, 'aantal');
ok(`meer dan ${LOOK_MAX} stukken mag niet`, lookKlopt([lid(1, 'top'), lid(2, 'trousers'), lid(3, 'shoes'), lid(4, 'bag')]).waarom, 'aantal');
ok('twee broeken in één look kan niet', lookKlopt([lid(1, 'trousers'), lid(2, 'skirt')]).waarom, 'dubbel');
ok('twee tops wel, als de ene de laag onder de andere is', lookKlopt([lid(1, 'top', { underlayer: 'look' }), lid(2, 'top')]).ok, true);
ok('  en niet zonder', lookKlopt([lid(1, 'top'), lid(2, 'top')]).waarom, 'dubbel');
ok('een plek op "look" zonder stuk dat erop past', lookKlopt([lid(1, 'trousers', { shoes: 'look' }), lid(2, 'top')]).waarom, 'leeg');

{
  const types = { 1: 'top', 2: 'trousers', 3: 'shoes', 4: 'top', 5: 'trousers' };
  const d = {
    look_p2: 'C', look_p1: 'C', look_p3: 'C', look_p4: 'q', look_p5: 'B',
    context_bottom_p1: 'look', context_top_p2: 'look', context_shoes_p2: 'look', context_bottom_p3: 'look',
    context_bottom_p4: 'look', look_notitie_C: '  hoodie   los over de tailleband  ', look_notitie_B: 'weg', look_p9: 'C',
  };
  const r = schoonLooks(d, { service: 'lifestyle', aantal: 5, typeVan: (i) => types[i] });
  ok('schoonLooks: de letters op volgorde van het eerste product', r.looks.map((l) => [l.letter, l.producten]), [['A', [1, 2, 3]]]);
  ok('  de notitie mee onder de nieuwe letter, met gewone spaties', d.look_notitie_A, 'hoodie los over de tailleband');
  ok('  een letter die geen letter is, valt weg', d.look_p4, undefined);
  ok('  een look van één stuk valt weg, met zijn notitie', [d.look_p5, d.look_notitie_B], [undefined, undefined]);
  ok('  een plek op "look" zonder look wordt "wij kiezen"', d.context_bottom_p4, 'ours');
  ok('  een product boven het aantal bestaat niet', d.look_p9, undefined);
  ok('  en wat er weg is, staat in de reden', r.weg.map((w) => w.waarom).sort(), ['aantal', 'letter']);
  ok('lookPlekkenVan: de broek draagt product 1 als Top en 3 als Schoenen', lookPlekkenVan(d, 2, 5, (i) => types[i]), { shoes: 3, top: 1 });
  ok('lookAantal', lookAantal(d, 5), 1);
  const c = { look_p1: 'A', look_p2: 'A', context_shoes_p1: 'look' };
  const rc = schoonLooks(c, { service: 'catalog', aantal: 2, typeVan: () => 'trousers' });
  ok('catalog: geen looks, en "look" wordt "wij kiezen"', [rc.looks, c.look_p1, c.context_shoes_p1], [[], undefined, 'ours']);
  const dubbel = { look_p1: 'A', look_p2: 'A' };
  ok('twee broeken: de look valt weg', schoonLooks(dubbel, { service: 'lifestyle', aantal: 2, typeVan: () => 'trousers' }).looks, []);
}

/* ── 2 · PRIJS, CREDITS EN AGENDA ───────────────────────────────────────────── */
console.log('\n2 · de prijs, de credits en de agenda');
ok(`€ ${LOOK_PRIJS} per look en ${LOOK_CREDITS} credits (v38-prijs a, v38-credits a)`, [LOOK_PRIJS, LOOK_CREDITS, LOOK_BEELDEN], [50, 4, 2]);
ok('hoodie + broek + sneaker: 3 × €109 + €50 = €377 (zoals in afvinklijst 38)', quoteOrder({ service: 'lifestyle', products: 3, looks: 1 }).netCents, (3 * rate(3) + 50) * 100);
ok('tien stukken in drie looks: 10 × €64 + 3 × €50 = €790', quoteOrder({ service: 'lifestyle', products: 10, looks: 3 }).netCents, (10 * rate(10) + 150) * 100);
ok('catalog rekent geen looks, ook niet als het veld meekomt (d-fouten)', quoteOrder({ service: 'catalog', products: 3, looks: 1 }).netCents, quoteOrder({ service: 'catalog', products: 3 }).netCents);
ok('nooit meer looks dan er van twee in passen', quoteOrder({ service: 'lifestyle', products: 3, looks: 9 }).looks, 1);
ok('de offerte noemt het aantal looks', quoteOrder({ service: 'lifestyle', products: 4, looks: 2 }).looks, 2);
ok('credits: 2 × 5 + 4 en het kan', [creditKosten({ service: 'lifestyle', products: 2, looks: 1 }).credits, creditKosten({ service: 'lifestyle', products: 2, looks: 1 }).kan], [14, true]);
ok('  met een regel voor de look', creditKosten({ service: 'lifestyle', products: 2, looks: 1 }).regels.at(-1), { soort: 'look', aantal: 1, per: 4, credits: 4 });
ok('watPast houdt de looks mee', watPast({ service: 'lifestyle', products: 4, looks: 2, saldo: 20 }), { past: 3, eraf: 1 });
ok(`agenda: een look telt als een half product (${LOOK_PRODUCT_DEEL})`, rowPunten({ service: 'lifestyle', product_count: 3, details_json: JSON.stringify({ lifestyle_beelden: '4', look_p1: 'A', look_p2: 'A', look_p3: 'A' }) }), puntenVoor('lifestyle', 3) + puntenVoor('lifestyle', 1) / 2);
ok('  zonder looks precies wat het was', rowPunten({ service: 'lifestyle', product_count: 3, details_json: JSON.stringify({ lifestyle_beelden: '4' }) }), puntenVoor('lifestyle', 3));

/* ── 3 · /api/order ─────────────────────────────────────────────────────────── */
console.log('\n3 · /api/order');
{
  const { onRequestPost } = await import('../functions/api/order.js');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: 'x' }), { status: 200, headers: { 'content-type': 'application/json' } });
  const geplaatst = [];
  const db = {
    prepare(sql) {
      const st = {
        bind(...args) { if (sql.includes('INSERT INTO orders')) geplaatst.push({ sql, args }); return st; },
        async first() { return null; },
        async run() { return { success: true }; },
        async all() { return { results: [] }; },
      };
      return st;
    },
  };
  const stuur = async (extra) => {
    geplaatst.length = 0;
    const fd = new FormData();
    const all = {
      service: 'lifestyle', style: 'glow', email: 'klant@proefmerk.test', name: 'Testa Proef', brand: 'Proefmerk',
      products: '3', country: 'NL', back: '/thank-you', phone: '+31 6 00000000',
      business_declaration: 'yes', business_version: 'business-v1-2026-08', no_vat: '1', reg_number: '12345678', ...extra,
    };
    for (const [k, v] of Object.entries(all)) fd.append(k, v);
    await onRequestPost({
      request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'CF-Connecting-IP': '203.0.113.60' } }),
      env: { DB: db, RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@proefmerk.test', FROM_EMAIL: 'VISUAILS <orders@proefmerk.test>' },
      waitUntil: () => {},
    });
    const rij = geplaatst[0];
    if (!rij) return null;
    return rij.args.filter((a) => typeof a === 'string' && a.startsWith('{')).map((a) => { try { return JSON.parse(a); } catch { return null; } }).find((o) => o && typeof o === 'object') || null;
  };
  const look = { garment_p1: 'top', garment_p2: 'trousers', garment_p3: 'shoes', look_p1: 'A', look_p2: 'A', look_p3: 'A', context_bottom_p1: 'look', context_top_p2: 'look', context_shoes_p2: 'look', context_bottom_p3: 'look', look_notitie_A: 'Hoodie los' };
  const d = await stuur(look);
  ok('de look staat in het dossier', d && [d.look_p1, d.look_p2, d.look_p3, d.look_notitie_A], ['A', 'A', 'A', 'Hoodie los']);
  ok('  met "look" op de plekken die de look vult', d && [d.context_bottom_p1, d.context_top_p2, d.context_shoes_p2, d.context_bottom_p3], ['look', 'look', 'look', 'look']);
  ok('  en "wij kiezen" waar niets uit de look staat', d && d.context_underlayer_p1, 'ours');
  const oud = await stuur({ outfit_count: '2' });
  ok('een oud formulier met outfit_count: het veld komt niet in het dossier', oud && [oud.outfit_count, oud.outfits], [undefined, undefined]);
  const cat = await stuur({ ...look, service: 'catalog', style: '', outfit_count: '1' });
  ok('catalog met lookvelden: geen look, geen outfit (d-fouten)', cat && [cat.look_p1, cat.context_top_p2, cat.outfit_count], [undefined, 'ours', undefined]);
  const twee = await stuur({ garment_p1: 'trousers', garment_p2: 'skirt', look_p1: 'A', look_p2: 'A', context_top_p1: 'look' });
  ok('een zelfgebouwde look met twee broeken valt weg', twee && [twee.look_p1, twee.context_top_p1], [undefined, 'ours']);
  const src = lees('functions/api/order.js');
  ok('quoteOrder krijgt het aantal looks uit het dossier', /looks: lookCount,/.test(src) && /lookAantal\(details, products\)/.test(src), true);
  ok('en creditKosten ook', /looks: quote\.looks,/.test(src), true);
  globalThis.fetch = realFetch;
}

/* ── 4 · DE LEVERING ────────────────────────────────────────────────────────── */
console.log('\n4 · de levering, de werkmap, Studio en de factuur');
ok('twee vakjes per look: van top tot teen, en de stukken samen', LOOK_VAKKEN.map((v) => v.id), ['look-geheel', 'look-samen']);
ok('de sleutel van een look is lA, niet p…', [isLookSleutel('lA'), isLookSleutel('p1'), isLookSleutel('la'), isLookSleutel('lK')], [true, false, false, false]);
ok('lookSleutels uit het dossier', lookSleutels({ look_p1: 'A', look_p2: 'A', look_p3: 'B', look_p4: 'B' }, 4), ['lA', 'lB']);
ok('vakkenVoor een look: de twee lookvakken', vakIdsVoor('lifestyle', {}, 'lA'), ['look-geheel', 'look-samen']);
ok('  en bij een product die van de dienst', vakkenVoor('lifestyle', { lifestyle_beelden: '4' }, 'p1').map((v) => v.id), ['front', 'back', 'product', 'detail']);
ok('de naam en het woord van een lookvak', [vakNaam('lifestyle', {}, 'look-geheel'), vakWoord('lifestyle', {}, 'look-samen')], ['Look · van top tot teen', 'stukken-samen']);
ok('de werkmap: de map van een look leest terug als lA + vak', parseScaffoldPath('VIS-1 - Merk/lA - Look A/1 van-top-tot-teen [look-geheel]/beeld.jpg'), { product: 'lA', shot: 'look-geheel', loose: false });
ok('  en een productmap blijft een productmap', parseScaffoldPath('VIS-1 - Merk/p2 - Broek/1 model-voorkant [front]/x.jpg').product, 'p2');
ok('de mapnaam van een look', lookFolder('A'), 'lA - Look A');
{
  const order = { ref: 'VIS-2610-0060', brand: 'Proefmerk', lang: 'nl', service: 'lifestyle', looks: [{ letter: 'A', notitie: 'los', stukken: [{ index: 1, name: 'Hoodie', garment: 'top' }, { index: 2, name: 'Broek', garment: 'trousers' }] }] };
  const products = [{ index: 1, name: 'Hoodie', look: { letter: 'A', met: [{ index: 2, name: 'Broek' }] } }, { index: 2, name: 'Broek' }];
  const files = scaffoldFiles(order, products, { vakken: vakkenVoor('lifestyle', { lifestyle_beelden: '4' }, 'p1') }).map((f) => f.name);
  ok('de werkmap heeft een map per look met zijn briefing en twee vakken', files.filter((n) => n.includes('/lA - Look A/')).map((n) => n.split('/lA - Look A/')[1]), ['_briefing.txt', '_aangeleverd/', '1 van-top-tot-teen [look-geheel]/', '2 stukken-samen [look-samen]/']);
  const brief = lookBriefingText({ order, look: order.looks[0] });
  ok('  de briefing noemt de stukken, de werkwijze en de notitie', /p1 - Hoodie/.test(brief) && /p2 - Broek/.test(brief) && /Eerst het lookbeeld/.test(brief) && /HOE GEDRAGEN\r?\n  los/.test(brief), true);
  ok('  met het kenmerk, voor de controle bij het uploaden', /^INSTELLINGEN {2}kenmerk=VIS-2610-0060/m.test(brief), true);
  const productBrief = files.find((n) => n.includes('/p1 - Hoodie/_briefing.txt'));
  ok('  en de productmap zegt in welke look het stuk zit', !!productBrief, true);
}
ok('de styling noemt het stuk uit de look bij naam', stylingVoor('trousers', { top: 'look', shoes: 'ours' }, 'nl', { top: 'p1 Hoodie' }).regel, 'blanco sneaker of lage schoen · p1 Hoodie');
{
  const entries = deliveryEntries([
    { id: 1, product_key: 'p1', shot: 'front', assets: [{ format: 'jpg', r2_key: 'a' }] },
    { id: 2, product_key: 'lA', shot: 'look-samen', assets: [{ format: 'jpg', r2_key: 'b' }] },
    { id: 3, product_key: 'lA', shot: 'look-geheel', assets: [{ format: 'jpg', r2_key: 'c' }] },
  ], 'nl', { service: 'lifestyle', details: { lifestyle_beelden: '4' }, ref: 'VIS-1', productNames: { p1: 'Hoodie' } });
  ok('de zip: de lookbeelden in een map "Look A", na de producten', entries.map((e) => e.name), ['VISUAILS-VIS-1/01 - Hoodie/JPG/1-model-voorkant.jpg', 'VISUAILS-VIS-1/Look A/JPG/1-van-top-tot-teen.jpg', 'VISUAILS-VIS-1/Look A/JPG/2-stukken-samen.jpg']);
}
{
  const admin = await import('../src/lib/admin.js');
  ok('een bestandsnaam met lA wordt de look', admin.guessProductShot('VIS-2608-4471-lA-van-top-tot-teen.jpg'), { product: 'lA', shot: 'look-geheel' });
  const src = lees('src/lib/admin.js');
  ok('het bord heeft een rij per look met zijn twee vakjes', /const lookRow = \(key\)/.test(src) && /lookOptions\.map\(lookRow\)/.test(src), true);
  ok('  "maak eerst het lookbeeld" (d-werk)', /Maak eerst het lookbeeld;/.test(src), true);
  ok('  en het uploaden en indelen kennen de look', /isLookSleutel\(productVeld\)/.test(src) && /isLookSleutel\(product\) \? LOOK_VAK_IDS : TOEGESTAAN/.test(src), true);
  ok('"Wat de klant koos" heeft een regel per look', /rij\('Complete looks'/.test(src), true);
}
{
  const { productView } = await import('../src/lib/account.js');
  const t = { lookLabel: (l) => `Look ${l}`, lookMet: (n) => `Complete look met ${n}`, lookPart: (l) => `In look ${l}`, prodLabel: (n) => `Product ${n}`, prodOther: 'Overige', prodDelivered: (n) => `${n} geleverd`, prodApproved: (n) => `${n} goed`, prodApproveAll: (n) => `Alle ${n}`, prodNothingYet: 'nog niets', prodFotosBeheer: 'Je foto’s' };
  const o = { id: 1, ref: 'VIS-1', product_count: 2, service: 'lifestyle', status: 'delivered', details_json: JSON.stringify({ product_p1: 'Hoodie', product_p2: 'Broek', look_p1: 'A', look_p2: 'A' }) };
  const v = productView(t, 'nl', o, { key: 'lA', delivered: [], uploaded: [] });
  ok('Studio: de map van de look heet "Look A" en noemt de stukken', [v.label, v.facts.split(' · ')[0]], ['Look A', 'Complete look met Hoodie en Broek']);
  ok('  een stuk zegt in welke look het zit', productView(t, 'nl', o, { key: 'p2', delivered: [], uploaded: [] }).facts.split(' · ')[0], 'In look A');
  const src = lees('src/lib/account.js');
  ok('  de stukken van een look staan bij elkaar, met de map van de look erachter', /groupByProduct\(delivered, uploaded, o\)/.test(src) && /l\.producten\[0\], 1e3/.test(src), true);
}
ok('de factuur en de bevestiging: een regel per look', lookRegels({ product_p1: 'Hoodie', product_p2: 'Broek', product_p3: 'Sneaker', look_p1: 'A', look_p2: 'A', look_p3: 'A' }, 'nl', 3), ['A · Hoodie, Broek, Sneaker · €50']);
ok('  de factuur leest hem', /lookRegels\(d, lang, Number\(order\.product_count\) \|\| 0\)/.test(lees('src/lib/invoice.js')), true);
ok('opnieuw bestellen: de indeling gaat mee (d-kopie)', bestelInstellingen({ id: 5, ref: 'VIS-1', service: 'lifestyle', status: 'delivered', product_count: 3, details_json: JSON.stringify({ look_p1: 'A', look_p3: 'A' }) }).looks, [[1, 3]]);

/* ── 5 · DE WOORDEN ─────────────────────────────────────────────────────────── */
console.log('\n5 · één verhaal op de site (d-teksten)');
const zin = lookCopy('nl').prijs('€50');
ok('de zin', zin, '€50 per look, bovenop de stukken. Elk stuk houdt zijn eigen beelden.');
for (const p of ['src/data/faq.js', 'src/components/PricingHal.astro', 'src/components/LifestyleHal.astro']) {
  ok(`${p} leest de zin uit looks.js`, /lookCopy\('(nl|en)'\)\.prijs\(/.test(lees(p)), true);
}
ok('de FAQ vraagt niet meer om iets "aan te vinken"', /vink het aan in het bestelformulier|tick it in the order form/.test(lees('src/data/faq.js')), false);
ok('de keuzelijst "Zitten er outfits bij?" is weg', /name="outfit_count"/.test(lees('src/components/order/OrderFlow.astro')), false);
ok('  en de regel onder het aantal staat er (c-stap1)', /class="wk-lookzin" data-pl-lookzin/.test(lees('src/components/order/OrderFlow.astro')), true);

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
