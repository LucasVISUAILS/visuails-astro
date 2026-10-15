/**
 * Een bijbestelde hoek zonder foto ontbreekt, overal — 12 oktober 2026 (K6,
 * afvinklijst 4, k-hoeken = a: "overal melden, net als voorkant, achterkant en
 * detail").
 *
 *   node tests/hoeken-ontbreekt.test.mjs
 *
 * Zonder server, zoals tests/nasturen-per-vak.test.mjs: het echte schema op
 * SQLite (tests/lib/d1sqlite.mjs), een nep-R2 en onderschepte mail. Wat hier
 * vastligt:
 *   · ontbreekt.js telt een bijbestelde hoek (extra_slots + angle_<id>) als
 *     verplicht vak, met zijn naam ("driekwart", of wat de klant bij een eigen
 *     hoek typte); zonder angle_<id> telt hij niet; zonder hoeken is de vorm
 *     van de lijst dezelfde als vóór vandaag;
 *   · Studio toont het vak, met een eigen veld, en de route neemt de foto aan;
 *   · de betaalmail, de studiomail, de vaste klanttekst, de Nu-zin, en in
 *     /admin de bestelrij, het bord, de Nu-doen-lijst en de bestelpagina noemen
 *     de hoek;
 *   · het tussenscherm van stap 2 gebruikt ontbreekt.js en heeft geen eigen
 *     regel meer (de browserkant: tests/hoeken-ontbreekt-browser.test.mjs).
 * Verzonnen merk, verzonnen adres; niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { ontbrekendeFotos, ontbrekendRegels, aantalOntbrekend, ontbrekendVoorOrder, bijbesteldeHoeken, vakNaam } from '../src/lib/ontbreekt.js';
import { accountPost, orderView, COPY } from '../src/lib/account.js';
import { adminGet, ontbreektVoorAdmin, ontbreektKlantTekst, ontbreektLabel } from '../src/lib/admin.js';
import { betaalMailContext, invoiceEmail } from '../src/lib/invoiceMail.js';
import { eersteMistVan } from '../src/lib/nuzin.js';
import { nuDoen, watTekst } from '../src/lib/nudoen.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

/* ── 1 · ontbreekt.js ZELF ─────────────────────────────────────────────────── */
console.log('\n1 · ontbreekt.js');
const DET = {
  product_p1: 'Jas groen',
  extra_slots: 'extra1:three-quarter,extra2:eigen-ground',
  'angle_three-quarter': '1',
  'angle_eigen-ground': '1',
  'angle_note_eigen-ground': 'Binnenkant van de kraag',
};
const vol = (key, ...shots) => shots.map((shot) => ({ kind: 'upload', product_key: key, shot }));
{
  const files = [...vol('p1', 'front', 'back', 'detail', 'extra2'), ...vol('p2', 'front', 'back', 'extra1', 'extra2')];
  const lijst = ontbrekendeFotos({ productCount: 2, details: DET, files });
  ok('p1 mist de driekwart (extra1)', JSON.stringify(lijst[0].mist) === '["extra1"]', JSON.stringify(lijst));
  ok('p2 mist eerst het vaste vak, dan niets van de hoeken', JSON.stringify(lijst[1].mist) === '["detail"]', JSON.stringify(lijst[1]));
  ok('de namen reizen mee waar een hoek ontbreekt, en alleen daar', !!lijst[0].namen && !('namen' in lijst[1]));
  ok('NL-regel: "Product 1 · Jas groen: geen driekwart"', ontbrekendRegels(lijst, 'nl')[0] === 'Product 1 · Jas groen: geen driekwart', ontbrekendRegels(lijst, 'nl')[0]);
  ok('EN-regel: "Product 1 · Jas groen: no three-quarter"', ontbrekendRegels(lijst, 'en')[0] === 'Product 1 · Jas groen: no three-quarter', ontbrekendRegels(lijst, 'en')[0]);
  ok('de telling neemt de hoek mee', aantalOntbrekend(lijst) === 2);
  ok('vakNaam met namen: "driekwart"; zonder: de id', vakNaam('extra1', 'nl', lijst[0].namen) === 'driekwart' && vakNaam('extra1', 'nl') === 'extra1');
}
{
  const lijst = ontbrekendeFotos({ productCount: 1, details: DET, files: vol('p1', 'front', 'back', 'detail', 'extra1') });
  ok('een eigen hoek draagt wat de klant typte', ontbrekendRegels(lijst, 'nl')[0] === 'Product 1 · Jas groen: geen binnenkant van de kraag', ontbrekendRegels(lijst, 'nl')[0]);
  ok('volgorde: vaste vakken eerst, hoeken daarna (vaknummer)', JSON.stringify(ontbrekendeFotos({ productCount: 1, details: DET, files: vol('p1', 'front') })[0].mist) === '["back","detail","extra1","extra2"]');
}
{
  const zonderKeuze = { extra_slots: 'extra1:three-quarter' };
  ok('extra_slots zonder angle_<id> (niet gekozen, niet betaald) telt niet', JSON.stringify(ontbrekendeFotos({ productCount: 1, details: zonderKeuze, files: vol('p1', 'front', 'back', 'detail') })) === '[]');
  ok('bijbesteldeHoeken: leeg zonder details', bijbesteldeHoeken(null).length === 0 && bijbesteldeHoeken({}).length === 0);
  ok('zonder hoeken: dezelfde vorm als vóór vandaag', JSON.stringify(ontbrekendeFotos({ productCount: 1, details: {}, files: vol('p1', 'front') })) === '[{"key":"p1","index":1,"naam":"","mist":["back","detail"]}]');
  ok('zonder uploads blijft het onbekend (null)', ontbrekendeFotos({ productCount: 1, details: DET, files: [] }) === null);
  const al = ontbrekendeFotos({ productCount: 1, details: DET, files: vol('p1', 'front', 'back', 'detail', 'extra1', 'extra2') });
  ok('alles binnen, ook de hoeken: niets ontbreekt', JSON.stringify(al) === '[]');
}
ok('Nu-zin (privélink, Studio): het eerste lege vak is "driekwart"',
  eersteMistVan(ontbrekendeFotos({ productCount: 1, details: DET, files: vol('p1', 'front', 'back', 'detail', 'extra2') }), 'nl')?.vak === 'driekwart');

/* ── 2 · DE DATABASE, STUDIO EN DE MAILS ────────────────────────────────────── */
console.log('\n2 · Studio en de mails');
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt zonder fouten', mislukt.length === 0, mislukt.slice(0, 2).join(' | '));
const echteFetch = globalThis.fetch;
const mails = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('resend')) {
    mails.push(JSON.parse(init?.body || '{}'));
    return new Response(JSON.stringify({ id: 'mail-1' }), { status: 200 });
  }
  return new Response('{}', { status: 200 });
};
const token = await mintToken();
db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES
    (61, 'hoeken@voorbeeldmerk.test', 'Noor Visser', 'HOEKMERK', '+31 6 1111 2222', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone, total_cents, lang, product_count, details_json, payment_status, paid_at, country)
    VALUES (601, 'VIS-TEST-0601', 61, 'catalog', 'received', 'Noor Visser', 'HOEKMERK', 'hoeken@voorbeeldmerk.test', '+31 6 1111 2222', 15000, 'nl', 2,
            '${JSON.stringify(DET).replace(/'/g, "''")}', 'paid', '2026-10-01 10:00:00', 'NL');
  INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot) VALUES
    (601, 'upload', 'intake/h1/001.jpg', 'v1.jpg', 1000, 'p1', 'front'),
    (601, 'upload', 'intake/h1/002.jpg', 'a1.jpg', 1000, 'p1', 'back'),
    (601, 'upload', 'intake/h1/003.jpg', 'd1.jpg', 1000, 'p1', 'detail'),
    (601, 'upload', 'intake/h1/004.jpg', 'k1.jpg', 1000, 'p1', 'extra2'),
    (601, 'upload', 'intake/h1/005.jpg', 'v2.jpg', 1000, 'p2', 'front'),
    (601, 'upload', 'intake/h1/006.jpg', 'a2.jpg', 1000, 'p2', 'back'),
    (601, 'upload', 'intake/h1/007.jpg', 'd2.jpg', 1000, 'p2', 'detail'),
    (601, 'upload', 'intake/h1/008.jpg', 'dk2.jpg', 1000, 'p2', 'extra1');
`);
db.prepare("INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (61, ?, datetime('now'), datetime('now', '+30 days'))").run(await hashToken(token));
const r2 = new Map();
const env = {
  DB: d1(db),
  UPLOADS: {
    async put(key, body, opts) { r2.set(key, { bytes: body?.byteLength ?? 0, opts }); },
    async get(key) { return r2.has(key) ? { body: null, httpMetadata: r2.get(key).opts?.httpMetadata } : null; },
    async list() { return { objects: [] }; },
    async delete(key) { r2.delete(key); },
  },
  RESEND_API_KEY: 're_test',
  FROM_EMAIL: 'VISUAILS <hallo@visuails.com>',
};
const kaart = (lang = 'nl') => {
  const o = db.prepare('SELECT * FROM orders WHERE id = 601').get();
  const files = db.prepare('SELECT * FROM files WHERE order_id = 601').all();
  return orderView(COPY[lang], lang, o, files, [], null, 0, 0, '');
};
{
  const lijst = await ontbrekendVoorOrder(env.DB, 601);
  ok('uit D1: p1 geen driekwart, p2 geen binnenkant van de kraag', ontbrekendRegels(lijst, 'nl').join(' | ') === 'Product 1 · Jas groen: geen driekwart | Product 2: geen binnenkant van de kraag', ontbrekendRegels(lijst, 'nl').join(' | '));
  const v = kaart().fotos;
  ok('Studio: de lijst bovenaan noemt de hoeken', v.ontbreekt && v.ontbreekt.regels.join(' | ') === 'Product 1 · Jas groen: geen driekwart | Product 2: geen binnenkant van de kraag', JSON.stringify(v.ontbreekt?.regels));
  const p1 = v.producten.find((p) => p.key === 'p1');
  const dk = p1.vakken.find((x) => x.shot === 'extra1');
  ok('Studio: p1 heeft een vak "Driekwart", leeg, met een eigen veld', dk && dk.naam === 'Driekwart' && dk.veld === 'vak_p1_extra1' && dk.mist === true && dk.staat === 'Nog niet ontvangen', JSON.stringify(dk));
  ok('Studio: de hoekvakken staan na de vaste vier', p1.vakken.map((x) => x.shot).join() === 'front,back,detail,worn,extra1,extra2');
  ok('Studio: het gevulde hoekvak van de eigen hoek draagt de getypte naam', p1.vakken[5].naam === 'Binnenkant van de kraag' && !!p1.vakken[5].gevuld);
  const en = kaart('en').fotos;
  ok('Studio (EN): "Three-quarter" en "no three-quarter"', en.producten[0].vakken[4].naam === 'Three-quarter' && en.ontbreekt.regels[0] === 'Product 1 · Jas groen: no three-quarter', en.ontbreekt.regels[0]);
}
{
  const ctx = await betaalMailContext(env, 'VIS-TEST-0601', 'nl');
  const html = invoiceEmail({ lang: 'nl', order: { ref: 'VIS-TEST-0601', service: 'catalog' }, invoice: { number: 'VIS-2026-0601' }, snap: {}, attached: true, ontbreekt: ctx.ontbreekt }).html;
  ok('betaalmail: "Er ontbreken nog foto’s" met de driekwart', /Er ontbreken nog foto’s:/.test(html) && html.includes('Product 1 · Jas groen: geen driekwart'), ctx.ontbreekt.join(' | '));
  const en = await betaalMailContext(env, 'VIS-TEST-0601', 'en');
  ok('betaalmail (EN): "no three-quarter"', en.ontbreekt[0] === 'Product 1 · Jas groen: no three-quarter', en.ontbreekt[0]);
}
{
  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01]);
  const fd = new FormData();
  fd.append('vak_p1_extra1', new File([JPEG], 'driekwart.jpg', { type: 'image/jpeg' }));
  fd.append('vak_p1_extra7', new File([JPEG], 'bestaat-niet.jpg', { type: 'image/jpeg' }));
  const res = await accountPost({
    request: new Request('https://visuails.com/account/orders/601/fotos', { method: 'POST', headers: { cookie: `vis_account=${token}`, origin: 'https://visuails.com', 'cf-connecting-ip': '203.0.113.61' }, body: fd }),
    env, waitUntil() {},
  });
  const to = res.headers.get('location') || '';
  ok('nasturen: één foto aangenomen, het niet-bestelde vak extra7 niet', res.status === 303 && /fotos=1&mis=1/.test(to), to);
  const rij = db.prepare("SELECT * FROM files WHERE order_id = 601 AND r2_key LIKE 'aangeleverd/%'").get();
  ok('nasturen: de foto staat in vak p1/extra1', rij && rij.product_key === 'p1' && rij.shot === 'extra1');
  const ev = db.prepare('SELECT note FROM order_events WHERE order_id = 601 ORDER BY id DESC LIMIT 1').get();
  ok('nasturen: de tijdlijn zegt "Product 1 driekwart"', ev?.note === 'Nagestuurd in Studio: Product 1 driekwart', ev?.note);
  const studiomail = mails.find((m) => /Foto's binnen/.test(m.subject || ''));
  ok('studiomail: noemt de hoek en wat er nog mist', !!studiomail && /Product 1 driekwart/.test(studiomail.html) && /Ontbreekt nog/.test(studiomail.html) && /geen binnenkant van de kraag/.test(studiomail.html));
  ok('Studio: daarna is het vak gevuld en mist p1 niets meer', kaart().fotos.compleet.some((p) => p.key === 'p1'));
}

/* ── 3 · /admin ─────────────────────────────────────────────────────────────── */
console.log('\n3 · /admin');
{
  const order = db.prepare('SELECT * FROM orders WHERE id = 601').get();
  const files = db.prepare("SELECT * FROM files WHERE order_id = 601 AND kind = 'upload'").all();
  const lijst = ontbreektVoorAdmin(order, files);
  ok('admin: "1 foto ontbreekt" (de eigen hoek van p2)', ontbreektLabel(lijst) === '1 foto ontbreekt', ontbreektLabel(lijst));
  const nl = ontbreektKlantTekst({ ref: 'VIS-TEST-0601', name: 'Noor Visser', lang: 'nl' }, lijst);
  const en = ontbreektKlantTekst({ ref: 'VIS-TEST-0601', name: 'Noor Visser', lang: 'en' }, lijst);
  ok('vaste klanttekst (NL) noemt de hoek bij naam', /product 2 \(binnenkant van de kraag\)/.test(nl), nl);
  ok('vaste klanttekst (EN) ook', /product 2 \(binnenkant van de kraag\)/.test(en), en);
}
const adminToken = await mintToken();
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x')");
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(adminToken));
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
/* Terug naar twee gaten: de nagestuurde driekwart weer weg. */
db.exec("DELETE FROM files WHERE order_id = 601 AND r2_key LIKE 'aangeleverd/%'");
{
  const { status, html } = await get('/admin/orders/601/files');
  ok('admin bord: de pagina laadt', status === 200, String(status));
  ok('admin bord: het blok bovenaan telt twee en noemt de driekwart', /2 foto’s ontbreken/.test(html) && /Product 1 · Jas groen: geen driekwart/.test(html));
  ok('admin bord: de kop van p1 zegt "mist driekwart"', /class="or-let is-rood">mist driekwart</.test(html));
  ok('admin bord: een rood leeg vak "Driekwart" bij het product', /class="brief-vak is-mist"><span class="brief-vak-l">Driekwart<\/span><span class="brief-mist">ontbreekt<\/span>/.test(html));
}
{
  const { status, html } = await get('/admin');
  ok('admin dashboard: de pagina laadt', status === 200, String(status));
  ok('admin dashboard: de bestelrij zegt "2 foto’s ontbreken"', /<span class="or-let is-rood" title="[^"]*geen driekwart[^"]*">2 foto’s ontbreken<\/span>/.test(html));
}
{
  const { regels, fout } = await nuDoen(env.DB, { nu: Date.parse('2026-10-12T09:00:00Z') });
  const r = regels.find((x) => x.soort === 'fotos' && x.id === 601);
  ok('Nu-doen: een regel "foto’s ontbreken" voor deze bestelling', !fout && !!r, fout || '');
  ok('Nu-doen: de tekst noemt de driekwart', r && /^2 foto’s ontbreken \(Product 1 · Jas groen: geen driekwart, …\)$/.test(watTekst(r, Date.parse('2026-10-12T09:00:00Z'))), r ? watTekst(r) : '');
  /* De bestelpagina is /admin/orders/<id>/files (het bord), met "Volgende stap" bovenaan. */
  const { status, html } = await get('/admin/orders/601/files');
  const stap = (/<div class="volgende-stap">[\s\S]*?<\/p>/.exec(html) || [''])[0];
  ok('bestelpagina: "Volgende stap" heeft de stap "foto’s vragen" (de regel uit Nu-doen)', status === 200 && /foto’s vragen/i.test(stap), stap.slice(0, 200));
  ok('bestelpagina: en het blok "ontbreekt" eronder noemt de driekwart', /id="ontbreekt"[\s\S]*?geen driekwart/.test(html));
}

/* ── 4 · HET FORMULIER (STAP 2) LEEST ontbreekt.js ─────────────────────────── */
console.log('\n4 · het tussenscherm van stap 2');
{
  const src = readFileSync(new URL('../src/scripts/pipeline.js', import.meta.url), 'utf8');
  const blok = src.slice(src.indexOf('function askMissing()'), src.indexOf('function naarProduct('));
  ok('askMissing geeft de hoeken mee aan ontbreekt.js (extra_slots, angle_<id>)', /details\.extra_slots = /.test(blok) && /details\[`angle_\$\{v\.hoek\}`\] = '1'/.test(blok));
  ok('en heeft geen eigen regel voor de hoeken meer', !/missingRequired\(card\)\.filter\(\(id\) => extraSlotNumber\(id\)\)/.test(blok));
}

globalThis.fetch = echteFetch;
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
