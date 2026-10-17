/**
 * Foto's nasturen per leeg vak — punt 2.05, 8 oktober 2026.
 *
 * Zonder server: de echte route (accountPost → handleOrderFotos) op een echte
 * SQLite-database met het echte schema (tests/lib/d1sqlite.mjs), een nep-R2 die
 * onthoudt wat erin gaat, en /admin via adminGet() op dezelfde database. Wat hier
 * vastligt:
 *
 *   · Studio toont per product de vier vakken, gevuld of leeg met een eigen veld,
 *     en bovenaan de ene lijst "wat ontbreekt" (ontbreekt.js); bij `null` niets.
 *   · Tot Geleverd (V31-1 = b); daarna geen blok en de route zegt "dicht".
 *   · Een nagestuurde foto komt in het juiste vak (product_key + shot), in R2
 *     onder aangeleverd/<kenmerk>/, met een regel op de tijdlijn.
 *   · Dezelfde keuring als /api/upload: te groot, verkeerd type, onleesbaar
 *     bestand weigeren; de daggrens per IP (o05); alleen de eigenaar; CSRF.
 *   · /admin: "2 foto's ontbreken" op de bestelrij, rood op het bord, de vaste
 *     tekst (NL/EN, zonder ik-vorm) met tel:, wa.me en mail, en "nagestuurd".
 */
import { accountPost, orderView, COPY } from '../src/lib/account.js';
import { adminGet, ontbreektKlantTekst, ontbreektLabel, ontbreektVoorAdmin } from '../src/lib/admin.js';
import { ontbrekendVoorOrder, aantalOntbrekend } from '../src/lib/ontbreekt.js';
import { UPLOAD_DAG } from '../functions/api/upload.js';
import { checkRate } from '../src/lib/ratelimit.js';
import { FOTO_WACHT_DAGEN } from '../src/data/termijnen.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt zonder fouten', mislukt.length === 0, mislukt.slice(0, 2).join(' | '));
const tel = (sql, ...b) => telling(db, sql, ...b);

/* Mails onderscheppen (de studiomail "Foto's binnen"). */
const echteFetch = globalThis.fetch;
const mails = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('resend')) {
    mails.push(JSON.parse(init?.body || '{}'));
    return new Response(JSON.stringify({ id: 'mail-1' }), { status: 200 });
  }
  return new Response('{}', { status: 200 });
};

/* Verzonnen merk, verzonnen adres; niets hiervan bestaat. */
const token = await mintToken();
const ander = await mintToken();
db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES
    (41, 'nasturen@voorbeeldmerk.test', 'Mara Jansen', 'VOORBEELDMERK', '+31 6 1234 5678', 'NL'),
    (42, 'ander@voorbeeldmerk.test', 'Ander', 'ANDER', NULL, 'BE');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone, total_cents, lang, product_count, details_json, payment_status, country)
    VALUES (501, 'VIS-TEST-0501', 41, 'catalog', 'in_production', 'Mara Jansen', 'VOORBEELDMERK', 'nasturen@voorbeeldmerk.test', '+31 6 1234 5678', 12000, 'nl', 3,
            '{"product_p1":"Hoodie zwart"}', 'paid', 'NL'),
           (502, 'VIS-TEST-0502', 41, 'catalog', 'delivered', 'Mara Jansen', 'VOORBEELDMERK', 'nasturen@voorbeeldmerk.test', NULL, 12000, 'nl', 1, '{}', 'paid', 'NL'),
           (503, 'VIS-TEST-0503', 41, 'lifestyle', 'received', 'Mara Jansen', 'VOORBEELDMERK', 'nasturen@voorbeeldmerk.test', NULL, 9000, 'en', 2, '{}', 'paid', 'NL');
  INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot) VALUES
    (501, 'upload', 'intake/b1/001-voor.jpg', 'voor.jpg', 1000, 'p1', 'front'),
    (501, 'upload', 'intake/b1/002-achter.jpg', 'achter.jpg', 1000, 'p1', 'back'),
    (501, 'upload', 'intake/b1/003-voor2.jpg', 'voor2.jpg', 1000, 'p2', 'front'),
    (501, 'upload', 'intake/b1/004-voor3.jpg', 'voor3.jpg', 1000, 'p3', 'front'),
    (501, 'upload', 'intake/b1/005-achter3.jpg', 'achter3.jpg', 1000, 'p3', 'back'),
    (501, 'upload', 'intake/b1/006-detail3.jpg', 'detail3.jpg', 1000, 'p3', 'detail');
`);
db.prepare('INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (41, ?, datetime(\'now\'), datetime(\'now\', \'+30 days\'))').run(await hashToken(token));
db.prepare('INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (42, ?, datetime(\'now\'), datetime(\'now\', \'+30 days\'))').run(await hashToken(ander));

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

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const TEKST = new TextEncoder().encode('dit is geen foto, maar tekst met een .jpg-naam');
const bestand = (bytes, naam, type = 'image/jpeg') => new File([bytes], naam, { type });

async function stuur(orderId, velden, { sessie = token, origin = 'https://visuails.com', ip = '203.0.113.7' } = {}) {
  const fd = new FormData();
  for (const [k, v] of velden) fd.append(k, v);
  const res = await accountPost({
    request: new Request(`https://visuails.com/account/orders/${orderId}/fotos`, {
      method: 'POST',
      headers: { cookie: `vis_account=${sessie}`, origin, 'cf-connecting-ip': ip },
      body: fd,
    }),
    env,
    waitUntil() {},
  });
  return { status: res.status, to: res.headers.get('location') || '' };
}

/* ── 1 · STUDIO: DE VAKKEN EN DE LIJST ─────────────────────────────────────── */
const rijen = () => db.prepare('SELECT * FROM files WHERE order_id = 501 ORDER BY id').all();
const kaart = (orderId, lang = 'nl', p = '') => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const files = db.prepare('SELECT * FROM files WHERE order_id = ?').all(orderId);
  return orderView(COPY[lang], lang, o, files, [], null, 0, p ? orderId : 0, p);
};
{
  const v = kaart(501).fotos;
  ok('Studio: het blok staat er tot de levering (in productie)', !!v && v.los === false);
  ok('Studio: de lijst "wat ontbreekt" staat bovenaan, uit ontbreekt.js',
    v.ontbreekt && v.ontbreekt.regels.join(' | ') === 'Product 1 · Hoodie zwart: geen detail | Product 2: geen achterkant, geen detail', JSON.stringify(v.ontbreekt?.regels));
  const p1 = v.producten.find((p) => p.key === 'p1');
  ok('Studio: een gevuld vak toont een kleine weergave (de bestandsroute)', /^\/account\/files\/\d+\/f$/.test(p1.vakken[0].gevuld?.href || ''));
  ok('Studio: een leeg verplicht vak heeft een eigen veld en zegt "Nog niet ontvangen"',
    p1.vakken[2].veld === 'vak_p1_detail' && p1.vakken[2].staat === 'Nog niet ontvangen' && p1.vakken[2].mist === true);
  ok('Studio: gedragen is optioneel ("Mag leeg") en telt niet als ontbrekend', p1.vakken[3].staat === 'Mag leeg' && p1.vakken[3].mist === false);
  ok('Studio: elk veld heeft een eigen naam voor schermlezers', /Detail voor Product 1 · Hoodie zwart/.test(p1.vakken[2].aria));
  ok('Studio: per product een veld "Andere foto"', p1.ander?.veld === 'ref_p1');
  ok('Studio: een compleet product staat ingeklapt onder de open producten', v.compleet.map((p) => p.key).join() === 'p3' && v.producten.map((p) => p.key).join() === 'p1,p2');
  ok('Studio: Engels heeft dezelfde vorm', kaart(501, 'en').fotos.ontbreekt.regels[1] === 'Product 2: no back, no detail');
}
{
  const v = kaart(503).fotos;
  ok('Studio: zonder uploads is de lijst onbekend (null) — geen lijst, geen "nog niet ontvangen"',
    v && v.ontbreekt === null && v.producten[0].vakken.every((x) => x.staat !== 'Nog niet ontvangen' || !x.verplicht) && v.producten[0].vakken[0].staat === '');
  ok('Studio: na de levering geen blok (V31-1 = b)', kaart(502).fotos === null);
}

/* ── 2 · NASTUREN: IN HET JUISTE VAK ──────────────────────────────────────── */
const voor = aantalOntbrekend(await ontbrekendVoorOrder(env.DB, 501));
{
  const r = await stuur(501, [
    ['vak_p2_back', bestand(JPEG, 'achterkant hoodie.jpg')],
    ['vak_p1_detail', bestand(TEKST, 'nep.jpg')],          // geen beeld: geweigerd
    ['vak_p1_front', bestand(JPEG, 'tweede-voor.jpg')],    // vak al vol: blijft vol
    ['ref_p3', bestand(PNG, 'label.png', 'image/png')],
    ['vak_p9_back', bestand(JPEG, 'bestaat-niet.jpg')],    // geen product 9
    ['vak_p2_detail', bestand(JPEG, 'notitie.pdf', 'application/pdf')], // verkeerd type
  ]);
  ok('nasturen: 303 terug naar dezelfde bestelling, met de telling', r.status === 303 && /\/account\/orders\?order=501&fotos=2&mis=4#order-501$/.test(r.to), r.to);
  const nieuw = rijen().filter((f) => f.r2_key.startsWith('aangeleverd/'));
  ok('nasturen: de achterkant van p2 staat in vak p2/back', nieuw.some((f) => f.product_key === 'p2' && f.shot === 'back' && f.kind === 'upload'));
  ok('nasturen: "Andere foto" wordt de eerste referentie van dat product', nieuw.some((f) => f.product_key === 'p3' && f.shot === 'ref1'));
  ok('nasturen: niets onleesbaars, geen pdf, geen tweede voorkant', nieuw.length === 2, String(nieuw.length));
  ok('nasturen: R2-sleutel volgt de Studio-conventie aangeleverd/<kenmerk>/nnn-…',
    nieuw.every((f) => /^aangeleverd\/VIS-TEST-0501\/\d{3}-[0-9a-f]{8}-/.test(f.r2_key)) && [...r2.keys()].length === 2);
  ok('nasturen: product en vak reizen mee in de R2-metadata', [...r2.values()].some((x) => x.opts?.customMetadata?.product === 'p2' && x.opts?.customMetadata?.shot === 'back'));
  const ev = db.prepare("SELECT note, actor FROM order_events WHERE order_id = 501 ORDER BY id DESC LIMIT 1").get();
  ok('nasturen: een regel op de tijdlijn, met de vakken', ev?.actor === 'customer' && ev?.note === 'Nagestuurd in Studio: Product 2 achterkant, Product 3 extra foto 1', ev?.note);
  const na = aantalOntbrekend(await ontbrekendVoorOrder(env.DB, 501));
  ok('nasturen: de lijst "wat ontbreekt" wordt korter', na === voor - 1, `${voor} → ${na}`);
  const studiomail = mails.find((m) => /Foto's binnen/.test(m.subject || ''));
  ok('nasturen: de studiomail noemt de vakken en wat er nog mist', !!studiomail && /Product 2 achterkant/.test(studiomail.html) && /Ontbreekt nog/.test(studiomail.html));
  ok('Studio: na het nasturen is het vak gevuld', kaart(501).fotos.producten.find((p) => p.key === 'p2').vakken[1].gevuld !== null);
}

/* ── 2b · EXTRA FOTO'S VERVANGEN EN VERWIJDEREN — 15 oktober 2026 (werklijst 14) ── */
{
  const extraRij = () => db.prepare("SELECT * FROM files WHERE order_id = 501 AND product_key = 'p3' AND shot LIKE 'ref%' ORDER BY id").all();
  const [eerste] = extraRij();
  const v3 = kaart(501).fotos.compleet.find((p) => p.key === 'p3') || kaart(501).fotos.producten.find((p) => p.key === 'p3');
  ok('extra: Studio toont de extra foto met "Vervangen" en "Verwijderen"', v3?.extra?.length === 1 && v3.extra[0].vervang === `vervang_${eerste.id}` && v3.extra[0].naam === 'Extra foto 1' && v3.extra[0].wegLabel === 'Verwijderen');
  ok('extra: de vaste vakken hebben geen van beide', v3.vakken.every((x) => !('vervang' in x)));
  ok('extra: ?p=p3 zet een compleet product bovenaan open', kaart(501, 'nl', 'p3').fotos.producten.some((p) => p.key === 'p3'));
  /* Vervangen: dezelfde plek, het nieuwe bestand; de oude rij en het oude bestand weg. */
  const oudeSleutel = eerste.r2_key;
  r2.set(oudeSleutel, { bytes: 1 });
  let r = await stuur(501, [[`vervang_${eerste.id}`, bestand(JPEG, 'nieuw-label.jpg')]]);
  ok('extra: vervangen geeft vv=1', /fotos=0&vv=1#order-501$/.test(r.to), r.to);
  const na = extraRij();
  ok('extra: één extra foto, op ref1, met het nieuwe bestand', na.length === 1 && na[0].shot === 'ref1' && na[0].filename === 'nieuw-label.jpg' && na[0].id !== eerste.id, JSON.stringify(na.map((f) => [f.shot, f.filename])));
  ok('extra: het oude bestand is uit R2', !r2.has(oudeSleutel));
  /* Een vast vak vervangen kan niet: het veld bestaat niet en de route weigert het. */
  const voor = db.prepare("SELECT id FROM files WHERE order_id = 501 AND product_key = 'p3' AND shot = 'front'").get();
  r = await stuur(501, [[`vervang_${voor.id}`, bestand(JPEG, 'andere-voorkant.jpg')]]);
  ok('extra: een vaste foto vervangen wordt geweigerd', /fotos=0/.test(r.to) && db.prepare("SELECT filename FROM files WHERE id = ?").get(voor.id)?.filename === 'voor3.jpg', r.to);
  r = await stuur(501, [['weg', String(voor.id)]]);
  ok('extra: een vaste foto verwijderen wordt geweigerd', !!db.prepare('SELECT 1 FROM files WHERE id = ?').get(voor.id), r.to);
  /* Een tweede extra erbij, dan de eerste weg: de volgende nieuwe krijgt het vrije nummer. */
  await stuur(501, [['ref_p3', bestand(PNG, 'tweede.png', 'image/png')]]);
  const twee = extraRij();
  r = await stuur(501, [['weg', String(twee[0].id)]]);
  ok('extra: verwijderen geeft weg=1', /fotos=0&weg=1#order-501$/.test(r.to), r.to);
  ok('extra: de rij is weg, de andere blijft', extraRij().map((f) => f.shot).join(',') === 'ref2', extraRij().map((f) => f.shot).join(','));
  await stuur(501, [['ref_p3', bestand(PNG, 'derde.png', 'image/png')]]);
  ok('extra: een nieuwe extra foto krijgt het vrije nummer (ref1), geen dubbele ref2', extraRij().map((f) => f.shot).sort().join(',') === 'ref1,ref2', extraRij().map((f) => f.shot).join(','));
  const ev = db.prepare("SELECT note FROM order_events WHERE order_id = 501 AND note LIKE 'Verwijderd%' ORDER BY id DESC LIMIT 1").get();
  ok('extra: de tijdlijn zegt wat er verwijderd is', ev?.note === 'Verwijderd in Studio: Product 3 extra foto 1', ev?.note);
  ok('extra: de studiomail heet "Foto\'s gewijzigd" en noemt het', mails.some((m) => /Foto's gewijzigd/.test(m.subject || '') && /Verwijderd/.test(m.html)));
  /* Een andere klant kan geen foto van deze bestelling weghalen. */
  const nu = extraRij()[0];
  await stuur(501, [['weg', String(nu.id)]], { sessie: ander });
  ok('extra: een andere klant kan niets verwijderen', !!db.prepare('SELECT 1 FROM files WHERE id = ?').get(nu.id));
}

/* ── 3 · DE GRENZEN ──────────────────────────────────────────────────────── */
{
  const r = await stuur(501, [['vak_p2_detail', bestand(JPEG, 'detail.jpg')]], { sessie: ander });
  ok('grens: een andere klant komt niet bij deze bestelling', r.status === 303 && r.to === '/account/orders' && tel("SELECT COUNT(*) FROM files WHERE order_id = 501 AND shot = 'detail' AND product_key = 'p2'") === 0, r.to);
}
{
  const r = await stuur(501, [['vak_p2_detail', bestand(JPEG, 'detail.jpg')]], { origin: 'https://kwaadwillend.example' });
  ok('grens: een POST van een andere site wordt geweigerd (CSRF)', r.status === 403 && tel("SELECT COUNT(*) FROM files WHERE order_id = 501 AND shot = 'detail' AND product_key = 'p2'") === 0, String(r.status));
}
{
  const r = await stuur(502, [['vak_p1_back', bestand(JPEG, 'achter.jpg')]]);
  ok('grens: na Geleverd zegt de route "dicht"', /fotos=dicht/.test(r.to) && tel('SELECT COUNT(*) FROM files WHERE order_id = 502') === 0, r.to);
}
{
  /* De daggrens per IP: dezelfde teller als /api/upload. Vol zetten met één
     zware stap, dan nog één foto. */
  await checkRate(env, { ip: '198.51.100.4', action: 'upload-bestanden-dag', limit: UPLOAD_DAG.bestanden, windowSeconds: 86400, gewicht: UPLOAD_DAG.bestanden });
  const r = await stuur(501, [['vak_p2_detail', bestand(JPEG, 'detail.jpg')]], { ip: '198.51.100.4' });
  ok('grens: de daggrens per internetaansluiting (o05) geldt ook hier', /fotos=dag/.test(r.to) && tel("SELECT COUNT(*) FROM files WHERE order_id = 501 AND shot = 'detail' AND product_key = 'p2'") === 0, r.to);
}
{
  const groot = new File([JPEG, new Uint8Array(25 * 1024 * 1024)], 'groot.jpg', { type: 'image/jpeg' });
  const r = await stuur(501, [['vak_p2_detail', groot]]);
  ok('grens: groter dan MAX_FILE_BYTES wordt geweigerd', /fotos=0/.test(r.to), r.to);
}

/* ── 4 · /admin ──────────────────────────────────────────────────────────── */
const adminToken = await mintToken();
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
{
  const lijst = ontbreektVoorAdmin(db.prepare('SELECT * FROM orders WHERE id = 501').get(), rijen());
  ok('admin: het label telt de ontbrekende foto’s', ontbreektLabel(lijst) === '2 foto’s ontbreken', ontbreektLabel(lijst));
  ok('admin: na de levering geen lijst', ontbreektVoorAdmin({ service: 'catalog', status: 'delivered', product_count: 1 }, []) === null);
  const nl = ontbreektKlantTekst({ ref: 'VIS-TEST-0501', name: 'Mara Jansen', lang: 'nl' }, lijst);
  const en = ontbreektKlantTekst({ ref: 'VIS-TEST-0501', name: 'Mara Jansen', lang: 'en' }, lijst);
  ok('admin: de vaste tekst noemt wat er ontbreekt (NL)', /Hoodie zwart \(detail\)/.test(nl) && /product 2 \(detail\)/.test(nl), nl);
  ok('admin: en dat we na een dag zonder antwoord maken wat er is', FOTO_WACHT_DAGEN === 1 ? /na een dag niets gehoord, dan maken we je beelden met wat er is/.test(nl) : true, nl);
  ok('admin: en waar de klant ze kwijt kan (Studio)', /VISUAILS Studio/.test(nl) && /VISUAILS Studio/.test(en));
  ok('admin: de tekst in het Engels voor een Engelse klant', /^(Good morning|Good afternoon|Good evening|Hello) Mara, about VIS-TEST-0501: we are still missing photos of/.test(en) && /after a day/.test(en), en);
  ok('admin: zonder ik-vorm', !/\b(ik|mij|mijn|I|me|my)\b/.test(nl.replace(/VISUAILS/g, '')) && !/\b(I|me|my)\b/.test(en), nl);
}
{
  const { status, html } = await get('/admin/orders/501/files');
  ok('admin bord: de pagina laadt', status === 200, String(status));
  ok('admin bord: bovenaan het blok met de telling en de regels', /class="warnline is-rood ontbreekt-blok" id="ontbreekt"/.test(html) && /2 foto’s ontbreken/.test(html));
  ok('admin bord: bellen (NL-klant, dus voorop) en appen met de tekst erin', /href="tel:\+31612345678"/.test(html) && /href="https:\/\/wa\.me\/31612345678\?text=(Goedemorgen|Goedemiddag|Goedenavond|Hallo)%20Mara/.test(html) && html.indexOf('href="tel:') < html.indexOf('href="https://wa.me/'));
  ok('admin bord: een rood leeg vak bij het product ("ontbreekt")', /class="brief-vak is-mist"><span class="brief-vak-l">Detail<\/span><span class="brief-mist">ontbreekt<\/span>/.test(html));
  ok('admin bord: de kop van het product zegt wat er mist', /class="or-let is-rood">mist detail</.test(html));
  ok('admin bord: een nagestuurde foto draagt "nagestuurd"', /<span class="brief-nagestuurd">nagestuurd<\/span>/.test(html));
}
{
  const { status, html } = await get('/admin');
  ok('admin dashboard: de pagina laadt', status === 200, String(status));
  ok('admin dashboard: de bestelrij zegt "2 foto’s ontbreken", rood', /<span class="or-let is-rood" title="[^"]*">2 foto’s ontbreken<\/span>/.test(html));
  ok('admin dashboard: met een link naar het bord om de klant te benaderen', /href="\/admin\/orders\/501\/files#ontbreekt"/.test(html));
  ok('admin dashboard: geen label bij een bestelling zonder uploads (onbekend)', !/VIS-TEST-0503<\/span>[^<]*<span class="or-let is-rood"/.test(html));
}

globalThis.fetch = echteFetch;
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
