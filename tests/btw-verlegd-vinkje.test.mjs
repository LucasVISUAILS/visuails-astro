/*
 * 8.06 · HET APARTE 0%-VINKJE WEG, DE VERLEGGINGSZIN IN HET ZAKELIJK-VINKJE
 * — 8 oktober 2026 (V19 = a)
 *
 * De regel, op de server: een door VIES bevestigd btw-nummer PLUS het
 * zakelijk-vinkje met de verleggingszin is 0% verlegd. Zonder dat vinkje geen 0%:
 * gewoon 21%, meteen te betalen (geen btw-lijst meer). Een bestelling die Lucas in
 * /admin namens de klant zet, houdt de oude weg. Het o16-gedrag (land buiten de
 * EU, ip in de EU → eerst nakijken) blijft.
 *
 * Draait de ECHTE route (functions/api/order.js) tegen een verse SQLite-database
 * met schema.sql, met VIES, Mollie en Resend nagebootst via fetch. Geen server,
 * geen browser: node tests/btw-verlegd-vinkje.test.mjs
 *
 * Daarnaast de formulieren: het aparte vinkje is weg uit stap 3 en uit het
 * abonnementsformulier, en de zin staat in het zakelijk-vinkje.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { onRequestPost as orderPost } from '../functions/api/order.js';
import { VAT_TREATMENT, verleggingTelt, vatDecision } from '../src/data/vat.js';
import { verleggingZin, BUSINESS_VERSION, VERLEGGING_TEXT, VERLEGGING_VERSION } from '../src/data/business.js';
import { VAT_RATE } from '../src/data/pricing.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(74)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\n8.06 — 0% alleen met VIES én het zakelijk-vinkje met de verleggingszin\n');

/* ── 1 · DE REGEL ZELF ────────────────────────────────────────────────────── */
console.log('de regel');
ok('VIES geldig + vinkje → telt', verleggingTelt({ vatValid: true, bevestigd: true }), true);
ok('VIES geldig zonder vinkje → telt niet', verleggingTelt({ vatValid: true, bevestigd: false }), false);
ok('vinkje zonder geldig nummer → telt niet', verleggingTelt({ vatValid: false, bevestigd: true }), false);
ok('VIES onbereikbaar (null) + vinkje → telt niet', verleggingTelt({ vatValid: null, bevestigd: true }), false);
ok('namens de klant (admin) met geldig nummer → telt, en gaat via de btw-lijst', verleggingTelt({ vatValid: true, bevestigd: false, namensKlant: true }), true);
ok('in vatDecision: zonder vinkje 21%', vatDecision({ country: 'DE', vatValid: verleggingTelt({ vatValid: true, bevestigd: false }) }).rate, VAT_RATE);
ok('in vatDecision: met vinkje 0% verlegd', vatDecision({ country: 'DE', vatValid: verleggingTelt({ vatValid: true, bevestigd: true }) }).treatment, VAT_TREATMENT.reverseCharge);

console.log('\nde zin');
ok('NL, ingevuld met merk en nummer (de tekst die Lucas koos)',
  verleggingZin('nl', { merk: 'Proefmerk GmbH', btw: 'DE123456789' }),
  'Ik bestel zakelijk voor Proefmerk GmbH, het btw-nummer DE123456789 is van dit bedrijf, en de btw wordt verlegd naar mijn bedrijf.');
ok('EN, ingevuld', verleggingZin('en', { merk: 'Proefmerk GmbH', btw: 'DE123456789' }),
  'I am ordering as a business for Proefmerk GmbH, the VAT number DE123456789 belongs to this company, and the VAT is reverse-charged to my company.');
ok('zonder merk geen zin', verleggingZin('nl', { merk: '', btw: 'DE123456789' }), null);
ok('zonder nummer geen zin', verleggingZin('nl', { merk: 'X', btw: ' ' }), null);
ok('de versie staat vast en heeft beide talen', !!(VERLEGGING_TEXT[VERLEGGING_VERSION]?.nl && VERLEGGING_TEXT[VERLEGGING_VERSION]?.en), true);

/* ── 2 · DE ROUTE ────────────────────────────────────────────────────────── */
console.log('\nde route (functions/api/order.js)');
const echteFetch = globalThis.fetch;
let vies = 'VALID';
let mollie = 0;
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('ec.europa.eu')) {
    return new Response(JSON.stringify({
      isValid: vies === 'VALID', userError: vies, requestDate: '2026-10-08T10:00:00Z',
      requestIdentifier: 'WAPIAAAAX0000001', name: '---', address: '---',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('mollie')) {
    mollie += 1;
    return new Response(JSON.stringify({ id: `tr_${mollie}`, _links: { checkout: { href: `https://pay.mollie.test/tr_${mollie}` } } }),
      { status: 201, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ id: 'em_1' }), { status: 200, headers: { 'content-type': 'application/json' } });
};

let teller = 0;
async function bestel(velden, { ipLand = '' } = {}) {
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  teller += 1;
  const fd = new FormData();
  const alles = {
    service: 'catalog', products: '3', lang: 'nl', mode: 'json', redirect: '/nl/thank-you',
    first_name: 'Testa', last_name: 'Proef', name: 'Testa Proef', brand: 'Proefmerk GmbH',
    email: `inkoop${teller}@proefmerk.test`, phone: '+49 30 0000000',
    address_line1: 'Verzonnenstraße 1', postal_code: '10115', city: 'Musterstadt', country: 'DE',
    vat: 'DE123456789',
    business_declaration: 'yes', business_version: BUSINESS_VERSION,
    ...velden,
  };
  for (const [k, v] of Object.entries(alles)) if (v !== null) fd.append(k, v);
  const request = new Request('https://visuails.com/api/order', {
    method: 'POST', body: fd, headers: { Origin: 'https://visuails.com', 'CF-Connecting-IP': `203.0.113.${teller}` },
  });
  if (ipLand) Object.defineProperty(request, 'cf', { value: { country: ipLand } });
  const voor = mollie;
  const res = await orderPost({
    request,
    env: {
      DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123',
      RESEND_API_KEY: 're_x', NOTIFY_EMAIL: 'studio@visuails.test', FROM_EMAIL: 'x@y.z',
      VISUAILS_VAT: 'NL000099998B57', // verzonnen, alleen zodat de log stil is
    },
    waitUntil: () => {},
  });
  const rij = db.prepare('SELECT vat_treatment, vat_rate, review_state, review_reason, vat_confirmed, details_json FROM orders ORDER BY id DESC LIMIT 1').get();
  const details = rij ? JSON.parse(rij.details_json || '{}') : {};
  return { status: res.status, rij, details, betaling: mollie > voor };
}

{
  vies = 'VALID';
  const a = await bestel({ vat_confirmed: 'yes' });
  ok('DE, VIES geldig, zakelijk-vinkje met verleggingszin → 0% verlegd', a.rij && a.rij.vat_treatment, VAT_TREATMENT.reverseCharge);
  ok('  tarief 0', a.rij && Number(a.rij.vat_rate), 0);
  ok('  meteen te betalen (geen btw-lijst)', a.betaling && !(a.rij && a.rij.review_state === 'pending'), true);
  ok('  de bevestiging is vastgelegd', a.rij && Number(a.rij.vat_confirmed), 1);
  ok('  de verleggingszin staat ingevuld bij de bestelling',
    a.details.vat_declaration, verleggingZin('nl', { merk: 'Proefmerk GmbH', btw: 'DE123456789' }));

  const b = await bestel({ vat_confirmed: null });
  ok('DE, VIES geldig, zónder de zin (geen vat_confirmed) → 21%', b.rij && b.rij.vat_treatment, VAT_TREATMENT.standard);
  ok('  tarief 21%', b.rij && Number(b.rij.vat_rate), VAT_RATE);
  ok('  en meteen te betalen, niet op de btw-lijst', b.betaling && !(b.rij && b.rij.review_state === 'pending'), true);
  ok('  geen verleggingszin vastgelegd', b.details.vat_declaration === undefined, true);

  const c = await bestel({ vat_confirmed: 'yes', business_declaration: null });
  ok('verborgen veld zonder het vinkje zelf → geen 0%', c.rij && c.rij.vat_treatment, VAT_TREATMENT.standard);

  const d = await bestel({ vat_confirmed: 'yes', vat_declaration: 'nep van de klant' }, {});
  ok('de klant kan de zin niet zelf meesturen (de server vult hem in)',
    d.details.vat_declaration, verleggingZin('nl', { merk: 'Proefmerk GmbH', btw: 'DE123456789' }));

  vies = 'INVALID';
  const e = await bestel({ vat_confirmed: 'yes' });
  ok('VIES keurt af, vinkje gezet → 21%', e.rij && e.rij.vat_treatment, VAT_TREATMENT.standard);
  vies = 'VALID';

  const f = await bestel({ vat_confirmed: null, business_version: 'admin-namens-klant' });
  ok('namens de klant (admin) zonder Lucas\' vinkje → oude weg: verlegd, maar eerst de btw-lijst',
    f.rij && [f.rij.vat_treatment, f.rij.review_state], [VAT_TREATMENT.reverseCharge, 'pending']);

  const g = await bestel({ country: 'NL', vat: 'NL000099998B57', vat_confirmed: 'yes', reg_number: '99999999', postal_code: '1234 AB' });
  ok('Nederland met vinkje blijft 21% (geen binnenlandse verlegging)', g.rij && Number(g.rij.vat_rate), VAT_RATE);

  const h = await bestel({ country: 'US', vat: '', no_vat: '1', postal_code: '10001', vat_confirmed: null }, { ipLand: 'NL' });
  ok('o16 blijft: VS gekozen vanaf een NL-ip → eerst nakijken', h.rij && h.rij.review_state, 'pending');
  const i = await bestel({ country: 'US', vat: '', no_vat: '1', postal_code: '10001', vat_confirmed: null }, { ipLand: 'US' });
  ok('VS vanaf een VS-ip → 0% buiten de heffing, meteen betalen', i.rij && [i.rij.vat_treatment, i.betaling], [VAT_TREATMENT.outsideScope, true]);

  /* N2 (8 okt 2026): het merkmodelformulier post naar dezelfde route en volgt
     dezelfde regel — 0% alleen met VIES-geldig nummer PLUS het zakelijk-vinkje. */
  const merk = { service: 'brand-model', products: '1', redirect: '/nl/thank-you', bm_track: 'ours', bm_audience: 'Proefpubliek' };
  const j = await bestel({ ...merk, vat_confirmed: 'yes' });
  ok('merkmodel: DE, VIES geldig, zakelijk-vinkje met de zin → 0% verlegd', j.rij && j.rij.vat_treatment, VAT_TREATMENT.reverseCharge);
  ok('  de zin staat ingevuld bij de bestelling',
    j.details.vat_declaration, verleggingZin('nl', { merk: 'Proefmerk GmbH', btw: 'DE123456789' }));
  const k = await bestel({ ...merk, vat_confirmed: null });
  ok('merkmodel: zonder de zin (geen vat_confirmed) → 21%', k.rij && [k.rij.vat_treatment, Number(k.rij.vat_rate)], [VAT_TREATMENT.standard, VAT_RATE]);
  const l = await bestel({ ...merk, vat_confirmed: 'yes', business_declaration: null });
  ok('merkmodel: verborgen veld zonder het vinkje zelf → geen 0%', !l.rij || l.rij.vat_treatment !== VAT_TREATMENT.reverseCharge, true);
}
globalThis.fetch = echteFetch;

/* ── 3 · DE FORMULIEREN ──────────────────────────────────────────────────── */
console.log('\nde formulieren');
const flow = lees('src/components/order/OrderFlow.astro');
const pipe = lees('src/scripts/pipeline.js');
const plan = lees('src/components/order/PlanPicker.astro');
ok('stap 3: het aparte verklaringsvinkje is weg', !/data-pl-vatconfirm|name="vat_confirmed" value="yes"/.test(flow));
ok('stap 5: het verborgen veld vat_confirmed staat naast het zakelijk-vinkje', /<input type="hidden" name="vat_confirmed" value="" data-pl-verlegd-veld \/>\s*<label class="pl-consent">/.test(flow));
ok('stap 5: de zin staat IN het zakelijk-vinkje, vóór de zakelijke verklaring', /<span><span class="pl-verlegd" data-pl-verlegd hidden><\/span>\{currentBusiness\(lang\)\}<\/span>/.test(flow));
ok('pipeline: zin en veld alleen bij EU (niet NL) met nummer en zonder "geen btw-nummer"',
  /const applies = !!up && up !== HOME_COUNTRY && isEu\(up\) && !!vat && !noVat;/.test(pipe)
  && /if \(veld\) veld\.value = tekst \? 'yes' : '';/.test(pipe));
ok('pipeline: de zin komt uit verleggingZin() met merk en nummer', /verleggingZin\(cfg\.lang, \{ merk, btw: vat \}\)/.test(pipe));
ok('pipeline: het merk zet de zin ook bij', /n === 'no_vat' \|\| n === 'brand'\) syncVatConfirm\(\)/.test(pipe));
ok('abonnement: het aparte vinkje is weg', !/data-ps-btwverklaring|gegBtwVerklaring/.test(plan));
ok('abonnement: dezelfde zin in het zakelijk-vinkje, met verborgen veld',
  /data-ps-verlegd data-tekst=\{VERLEGGING_TEXT\[VERLEGGING_VERSION\]/.test(plan) && /name="vat_confirmed" value="" data-ps-verlegd-veld/.test(plan));
const sub = lees('src/lib/subscribe.js');
ok('abonnement (server): ook daar alleen met het zakelijk-vinkje', /t\('vat_confirmed', 5\) === 'yes' && t\('business_declaration', 5\) === 'yes'/.test(sub));
const bm = lees('src/components/BrandModelBrief.astro');
ok('merkmodel: het aparte 0%-vinkje is weg', !/data-bm-vatconfirm|type="checkbox"[^>]*name="vat_confirmed"/.test(bm));
ok('merkmodel: verborgen veld vat_confirmed naast het zakelijk-vinkje, de zin erin',
  /<input type="hidden" name="vat_confirmed" value="" data-bm-verlegd-veld \/>\s*<label class="bm-check">/.test(bm)
  && /<span><span class="bm-verlegd" data-bm-verlegd hidden><\/span>\{currentBusiness\(lang\)\}<\/span>/.test(bm));
ok('merkmodel: de zin komt uit verleggingZin(), het veld alleen "yes" als de zin er staat',
  /verleggingZin\(/.test(bm) && /verlegdVeld\.value = zin \? 'yes' : '';/.test(bm));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
