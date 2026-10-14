/* VISUAILS — kleurtrouw: de opgegeven kleur is leidend (punt 5.03, V32 = a).
 *   node tests/kleurtrouw.test.mjs          (geen server, geen browser)
 *
 *   1 · stap 2: het bestaande kleurveld per product vraagt de kleur zoals in de
 *       webshop, met Pantone- of hexcode; wijkt de foto af, dan geldt die kleur;
 *   2 · de kleur, de code en een kleurvlakje uit één lezer (src/lib/kleurcode.js);
 *   3 · de server bewaart het in de details van het product;
 *   4 · de brief: het bord in /admin (met kleurvlakje) en _briefing.txt in de werkmap;
 *   5 · de revisieregel "kleur ten opzichte van de kleur die je opgaf" in /terms
 *       (NL en EN) en in de FAQ; de tip met het witte vel staat al in de fotogids.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { productQuestion } from '../src/data/attributes.js';
import { kleurInfo, hexUit, pantoneUit, rgbVan } from '../src/lib/kleurcode.js';
import { revisiebeleid } from '../src/data/pricing.js';
import { briefingText } from '../src/lib/scaffold.js';
import { adminGet, kleurFeit } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { batchPrefix } from '../src/lib/uploads.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\n1 · het kleurveld in stap 2');
const q = productQuestion('colour');
ok('er is één kleurveld per product (geen tweede bijgebouwd)', !!q && q.type === 'text' && !productQuestion('kleur'));
ok('label NL: "Kleur, zoals in je webshop"', q.name.nl, 'Kleur, zoals in je webshop');
ok('label EN: "Colour, as in your webshop"', q.name.en, 'Colour, as in your webshop');
ok('hint NL: Pantone of hex, en wijkt de foto af dan geldt deze kleur', /\(Pantone of hex\)/.test(q.buys.nl) && /Wijkt je foto af van je product, dan houden we deze kleur aan\./.test(q.buys.nl));
ok('hint EN: gelijkwaardig', /\(Pantone or hex\)/.test(q.buys.en) && /If your photo differs from your product, we go by this colour\./.test(q.buys.en));
ok('het blijft optioneel en vrije tekst, ruim genoeg voor naam én code', [q.required ?? false, q.maxLength >= 44], [false, true]);
ok('het kleurvlakje in het formulier leest de code ook midden in de tekst', /const hex = hexUit\(ctrl\.value\)/.test(lees('src/scripts/pipeline.js')));

console.log('\n2 · één lezer voor naam, hex en Pantone');
ok('"bosgroen, #1B3A2F"', kleurInfo('bosgroen, #1B3A2F'), { tekst: 'bosgroen, #1B3A2F', naam: 'bosgroen', hex: '#1B3A2F', pantone: '' });
ok('alleen een code, zonder #', hexUit('1b3a2f'), '#1B3A2F');
ok('drie cijfers worden er zes', hexUit('zwart #000'), '#000000');
ok('een woord van zes hexletters is geen code ("facade")', hexUit('facade grijs'), '');
ok('Pantone met TCX', pantoneUit('bosgroen · Pantone 19-5513 TCX'), 'Pantone 19-5513 TCX');
ok('PMS 342 C', pantoneUit('PMS 342 C, donkergroen'), 'Pantone 342 C');
ok('een kapotte code geeft geen vlakje', hexUit('#12345'), '');
ok('RGB voor de kleurkiezer', rgbVan('#1B3A2F'), [27, 58, 47]);

console.log('\n3 · de server bewaart het per product');
const KLEUR = 'bosgroen · Pantone 19-5513 TCX · #1B3A2F';
let orderId;
{
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url) => (String(url).endsWith('/v2/payments')
    ? new Response(JSON.stringify({ id: 'tr_test000001', status: 'open', _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_test000001' } } }), { status: 201, headers: { 'content-type': 'application/json' } })
    : new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } }));
  const inhoud = new Map();
  const bucket = {
    async put(key, body, o) { inhoud.set(key, { bytes: 1000, opts: o }); return { key }; },
    async get() { return { arrayBuffer: async () => new ArrayBuffer(1000) }; },
    async head(key) { return inhoud.has(key) ? {} : null; },
    async delete(key) { inhoud.delete(key); },
    async list({ prefix = '' } = {}) {
      return { objects: [...inhoud.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, size: v.bytes, customMetadata: v.opts?.customMetadata || {} })) };
    },
  };
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  ok('het schema laadt', mislukt.length, 0);
  const env = { DB: d1(db), UPLOADS: bucket, MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
  const { onRequestPost } = await import('../functions/api/order.js');
  const batch = mintToken();
  for (const [shot, naam] of [['front', 'p1-voor.jpg'], ['back', 'p1-achter.jpg'], ['detail', 'p1-detail.jpg']]) {
    inhoud.set(`${batchPrefix(batch)}${naam}`, { bytes: 2_000_000, opts: { customMetadata: { product: 'p1', shot, original: naam } } });
  }
  const fd = new FormData();
  const velden = {
    service: 'catalog', products: '1', name: 'Sanne Voorbeeld', brand: 'VOORBEELD', email: 'sanne@voorbeeld-kleding.test', phone: '+31 6 12345678',
    country: 'NL', address_line1: 'Voorbeeldstraat 1', postal_code: '1234 AB', city: 'Voorbeeldstad', lang: 'nl',
    style: 'classic', background: 'studio-white', product_p1: 'Hoodie', colour_p1: KLEUR, material_p1: 'zware fleece',
    business_declaration: 'yes', business_version: 'v1', no_vat_number: '1', reg_number: '99999999',
    upload_batch: batch, back: '/nl/thank-you',
  };
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  const res = await onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }), env, waitUntil: () => {} });
  ok('de bestelling gaat door', [200, 302, 303].includes(res.status));
  const rij = db.prepare("SELECT id, details_json FROM orders WHERE email = 'sanne@voorbeeld-kleding.test'").get();
  orderId = rij?.id;
  ok('colour_p1 staat in de details, zoals getypt', JSON.parse(rij?.details_json || '{}').colour_p1, KLEUR);

  /* 4 · het bord in /admin, op dezelfde database */
  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
  const adminToken = await mintToken();
  db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
  const r = await adminGet({ request: new Request(`https://visuails.com/admin/orders/${orderId}/files`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });
  const html = await r.text();
  console.log('\n4 · de brief');
  ok('bord: de pagina laadt', r.status, 200);
  ok('bord: kleur met kleurvlakje (svg met fill, geen inline style), naam en codes',
    html.includes('kleur: <svg class="kleurstaal" viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10" fill="#1B3A2F"/></svg><b>bosgroen</b> <span class="meta">#1B3A2F &middot; Pantone 19-5513 TCX</span>'));
  ok('bord: "leidend als de foto afwijkt"', /leidend als de foto afwijkt/.test(html));
  ok('bord: geen style="background', /style="background:#1B3A2F/i.test(html), false);
  globalThis.fetch = echteFetch;
}
ok('zonder code: alleen de naam, geen vlakje', /kleurstaal/.test(kleurFeit('cognac')), false);
{
  const t = briefingText({ order: { ref: 'VIS-TEST-0001' }, product: { folder: '01 Hoodie', name: 'Hoodie', colour: KLEUR } });
  ok('werkmap: "Kleur       bosgroen"', t.includes('Kleur       bosgroen\r\n'));
  ok('werkmap: de codes met RGB', t.includes('Kleurcode   #1B3A2F (RGB 27, 58, 47) / Pantone 19-5513 TCX'));
  ok('werkmap: en de afspraak', /Leidend als de foto afwijkt/.test(t));
  const zonder = briefingText({ order: { ref: 'VIS-TEST-0001' }, product: { folder: '02 Shirt', name: 'Shirt', colour: 'cognac' } });
  ok('werkmap zonder code: geen regel Kleurcode', [zonder.includes('Kleur       cognac'), zonder.includes('Kleurcode')], [true, false]);
}

console.log('\n5 · de revisieregel in /terms en de FAQ');
const nl = revisiebeleid('nl').map(([k, r]) => `${k} ${r}`).join(' ');
const en = revisiebeleid('en').map(([k, r]) => `${k} ${r}`).join(' ');
ok('revisiebeleid NL: kleur ten opzichte van de kleur die je opgaf', /een kleur die afwijkt van de kleur die je opgaf \(of van je foto’s, als je geen kleur opgaf\)/.test(nl));
ok('revisiebeleid EN: gelijkwaardig', /a colour that differs from the colour you gave us \(or from your photos, if you gave none\)/.test(en));
ok('/terms NL en EN lezen het revisiebeleid (§10)', /revisiebeleid\('nl'\)\.map/.test(lees('src/pages/nl/terms.astro')) && /revisiebeleid\('en'\)\.map/.test(lees('src/pages/terms.astro')));
const faq = lees('src/data/faq.js');
ok('FAQ: de catalog- en lifestylevraag noemen de opgegeven kleur (NL en EN, twee keer)',
  [faq.split('een kleur die afwijkt van de kleur die je opgaf').length - 1, faq.split('a colour that differs from the colour you gave us').length - 1], [2, 2]);
ok('FAQ: de revisievraag leest het revisiebeleid', /revisiebeleid\('nl'\)\.map/.test(faq) && /revisiebeleid\('en'\)\.map/.test(faq));
/* 5.03 zegt: de tip staat bij de close-up (8 okt, na de controle tegen afvinklijst 1). */
ok('de tip met het witte vel staat in de fotogids én bij het close-upvak in stap 2', /wit vel printpapier half in beeld/.test(lees('src/data/fotogids.js')) && /wit vel printpapier half in beeld/.test(lees('src/data/shots.js')) && /white printer paper half in the frame/.test(lees('src/data/shots.js')));

console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
