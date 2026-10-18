/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * 4.02 · DE WERKMAP COMPLEET, EN VEILIG TERUG TE UPLOADEN — 8 oktober 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos V34 = b: hij haalt de klantfoto's nu per foto uit /admin. Na dit punt
 * staan ze per product in `_aangeleverd/` van de werkmap, en heeft elke
 * _briefing.txt vijf vaste blokken (INSTELLINGEN · PLAKREGEL · MAKEN · LET OP ·
 * NAKIJKEN). Terug uploaden weigert een map van een andere bestelling, en een
 * bestand dat byte voor byte gelijk is aan het levende beeld wordt overgeslagen.
 *
 * Deze toets maakt een werkmap van een testbestelling via de echte route
 * (/admin/orders/:id/scaffold, met het echte schema in node:sqlite en een R2 in het
 * geheugen), pakt de zip uit en kijkt naar de naam, de mappen en de brief. Daarna
 * gaat "Map uploaden" (POST /admin/orders/:id/deliver) met een map van een andere
 * bestelling, met een gelijk bestand en met een gewijzigd bestand.
 *
 * Verzonnen merk, verzonnen adres; niets hiervan bestaat.
 */
import sharp from 'sharp';
import { adminGet, adminPost } from '../src/lib/admin.js';
import {
  scaffoldFilename, werkmapNaam, kenmerkenInPad, kenmerkUitWerkbestand, vreemdKenmerk,
  briefingText, instellingen, plakRegel, klantFotoBestanden, isRawPath, NAKIJKEN,
} from '../src/lib/scaffold.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

/* ── 1 · NAAM, KENMERK EN VINGERAFDRUK ─────────────────────────────────────── */
ok('de zip heet "VIS-XXXX-XXX - Merknaam.zip"', scaffoldFilename('VIS-2608-4471', 'Atelier Noord') === 'VIS-2608-4471 - Atelier Noord.zip');
ok('tekens die Windows verbiedt vallen weg', scaffoldFilename('VIS-2608-4471', 'Studio: A/B "x"*?<>|.') === 'VIS-2608-4471 - Studio A B x.zip', scaffoldFilename('VIS-2608-4471', 'Studio: A/B "x"*?<>|.'));
ok('geen punt of spatie aan het eind', !/[ .]\.zip$/.test(scaffoldFilename('VIS-1-2', 'Merk...  ')));
ok('zonder merk alleen het kenmerk', scaffoldFilename('VIS-2608-4471', '') === 'VIS-2608-4471.zip');
ok('een lang merk wordt afgekapt (zip.js kapt mappen op 60)', werkmapNaam('VIS-2608-4471', 'x'.repeat(90)).length <= 60);
ok('kenmerk uit de wortelmap', kenmerkenInPad('VIS-AB12-C3D - Ander merk/p1 - Hoodie/1 voorkant/x.jpg').join() === 'VIS-AB12-C3D');
ok('kenmerk uit de naam die Photoshop maakt', kenmerkenInPad('map/p1 - Hoodie/1 voorkant/VIS-AB12-C3D-p1-voorkant.jpg').join() === 'VIS-AB12-C3D');
ok('NIET uit de productmap (dat is tekst van de klant)', kenmerkenInPad('eigen/p1 - VIS-AB12-C3D shirt/1 voorkant/a.jpg').length === 0);
ok('een afgeleid kenmerk (-R1) telt als eigen kenmerk', kenmerkenInPad('VIS-AB12-C3D-R1/p1 - x/1 voorkant/a.jpg').join() === 'VIS-AB12-C3D-R1');
ok('vingerafdruk: kenmerk= in de INSTELLINGEN-regel', kenmerkUitWerkbestand('VIS · p1\r\n\r\nINSTELLINGEN  kenmerk=VIS-AB12-C3D · product=p1\r\n') === 'VIS-AB12-C3D');
ok('vingerafdruk: de eerste regel van de leesmij', kenmerkUitWerkbestand('VISUAILS - werkmap voor bestelling VIS-AB12-C3D\r\n') === 'VIS-AB12-C3D');
ok('niet uit de notitie van de klant', kenmerkUitWerkbestand('LET OP\r\n  Notitie: zelfde als VIS-ZZZZ-999\r\n') === '');
ok('vreemd kenmerk gevonden', vreemdKenmerk('VIS-2608-4471', ['VIS-2608-4471', 'VIS-AB12-C3D']) === 'VIS-AB12-C3D');
ok('eigen kenmerk is niet vreemd', vreemdKenmerk('VIS-2608-4471', ['vis-2608-4471']) === '');
ok('_ruw/ is een werkmap, geen levering', isRawPath('VIS-1 - M/p1 - x/1 voorkant/_ruw/gen.png') && !isRawPath('VIS-1/p1 - x/1 voorkant/_ruw.png'));

/* ── 2 · DE BRIEF IN VIJF VASTE BLOKKEN ────────────────────────────────────── */
const ORDER_TEKST = { ref: 'VIS-TEST-0401', service: 'catalog', kanaal: 'webshop', notes: 'Logo niet bijwerken.' };
const PRODUCT = {
  index: 2, name: 'Hoodie VOORBEELD 2026', garment: 'top', material: '100% katoen',
  colour: 'washed black #2B2B2B', background: '#F5F5F5', ratio: '4:5', model: 'Ava',
  uitsnede: 'heup en hoger', styling: 'effen broek, recht model', extras: [],
};
const brief = briefingText({ order: ORDER_TEKST, product: PRODUCT });
const posities = ['INSTELLINGEN  ', 'PLAKREGEL     ', '\r\nMAKEN\r\n', '\r\nLET OP\r\n', 'NAKIJKEN      '].map((k) => brief.indexOf(k));
ok('vijf blokken, in vaste volgorde', posities.every((p, i) => p > 0 && (i === 0 || p > posities[i - 1])), JSON.stringify(posities));
ok('de kop: kenmerk · product · naam', brief.startsWith('VIS-TEST-0401 · p2 · Hoodie VOORBEELD 2026\r\n'));
ok('INSTELLINGEN is één regel sleutel=waarde',
  /\r\nINSTELLINGEN  kenmerk=VIS-TEST-0401 · product=p2 · dienst=catalog · achtergrond=#F5F5F5 · verhouding=4:5 · lange_zijde=2048 · kanaal=webshop · photoshop=ja\r\n/.test(brief), brief.split('\r\n')[3]);
ok('de plakregel: type, kleur met code, materiaal', plakRegel(PRODUCT) === 'top, washed black (#2B2B2B), 100% katoen', plakRegel(PRODUCT));
ok('de plakregel noemt de productnaam NIET', !/VOORBEELD|Hoodie/i.test(brief.split('\r\n').find((r) => r.startsWith('PLAKREGEL'))));
ok('MAKEN: gezicht, uitsnede, styling', /  Gezicht     Ava\r\n  Uitsnede    heup en hoger\r\n  Styling     effen broek, recht model/.test(brief));
ok('LET OP: kleur leidend en de notitie', /Leidend als de foto afwijkt/.test(brief) && /Logo niet bijwerken\./.test(brief));
ok('NAKIJKEN: de vaste lijst', brief.includes(`NAKIJKEN      ${NAKIJKEN.join(' · ')}`));
ok('4K zet lange_zijde op 4096', instellingen(ORDER_TEKST, { ...PRODUCT, hoogRes: true }).some(([k, v]) => k === 'lange_zijde' && v === '4096'));
ok('lifestyle: photoshop=nee (V35 = b)', instellingen({ ...ORDER_TEKST, service: 'lifestyle' }, PRODUCT).some(([k, v]) => k === 'photoshop' && v === 'nee'));
ok('een eigen look met Photoshop: photoshop=ja', instellingen({ ...ORDER_TEKST, service: 'lifestyle', photoshop: true }, PRODUCT).some(([k, v]) => k === 'photoshop' && v === 'ja'));
ok('waarden bevatten nooit spatie, · of =', instellingen({ ...ORDER_TEKST, kanaal: 'web shop · x=y' }, PRODUCT).every(([, v]) => !/[\s·=]/.test(v)));
ok('CRLF voor Kladblok', brief.includes('\r\n') && !/[^\r]\n/.test(brief));

/* ── 3 · DE FOTO'S VAN DE KLANT EN DE GRENS ─────────────────────────────────── */
{
  const rijen = [
    { id: 1, product_key: 'p1', shot: 'front', filename: 'IMG_1.JPG', r2_key: 'intake/b/1.jpg', bytes: 600 },
    { id: 2, product_key: 'p1', shot: 'ref2', filename: 'x.heic', r2_key: 'intake/b/2.heic', bytes: 600 },
    { id: 3, product_key: 'p2', shot: 'ctx-shoes', filename: 'schoen.png', r2_key: 'intake/b/3.png', bytes: 600 },
    { id: 4, product_key: null, shot: null, filename: 'maattabel.pdf', r2_key: 'intake/b/4.pdf', bytes: 600 },
  ];
  const prods = [{ index: 1, name: 'Hoodie' }, { index: 2, name: 'Broek' }];
  const { ingangen, weg } = klantFotoBestanden('W', prods, rijen, async () => null);
  const namen = ingangen.map((f) => f.name);
  ok('p1-klant-voorkant.jpg in _aangeleverd/ van het product', namen.includes('W/p1 - Hoodie/_aangeleverd/p1-klant-voorkant.jpg'), namen.join(' | '));
  ok('een referentiefoto en een contextstuk krijgen een eigen woord', namen.includes('W/p1 - Hoodie/_aangeleverd/p1-klant-referentie-2.heic') && namen.includes('W/p2 - Broek/_aangeleverd/p2-klant-erbij-shoes.png'));
  ok('zonder product: in _aangeleverd/ van de hele bestelling', namen.includes('W/_aangeleverd/maattabel.pdf'));
  ok('binnen de grens gaat alles mee', weg.length === 0);
  const krap = klantFotoBestanden('W', prods, rijen, async () => null, { aantal: 10, bytes: 1300 });
  ok('boven de grens: de eerste in productvolgorde, de rest op een lijst', krap.ingangen.length === 2 && krap.weg.length === 2, JSON.stringify(krap.weg));
}

/* ── 4 · DE ROUTE: EEN WERKMAP VAN EEN TESTBESTELLING ───────────────────────── */
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 2).join(' | '));
const tel = (sql, ...b) => telling(db, sql, ...b);

const jpg = (kleur) => sharp({ create: { width: 16, height: 20, channels: 3, background: kleur } }).jpeg({ quality: 80 }).toBuffer();
const KLANT_VOOR = await jpg('#a03030');
const KLANT_ACHTER = await jpg('#3030a0');
const AF_VOOR = await jpg('#f7f5f1');
const AF_ACHTER = await jpg('#202020');

const r2 = new Map();
async function alleBytes(body) {
  if (body == null) return new Uint8Array(0);
  if (body instanceof ArrayBuffer) return new Uint8Array(body.slice(0));
  if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));
  if (typeof body.getReader === 'function') return new Uint8Array(await new Response(body).arrayBuffer());
  return new TextEncoder().encode(String(body));
}
const env = {
  DB: d1(db),
  ADMIN_ORIGIN: 'https://visuails.com',
  UPLOADS: {
    async put(key, body, opts) { r2.set(key, { bytes: await alleBytes(body), opts }); },
    async get(key) {
      const o = r2.get(key);
      if (!o) return null;
      return { body: new Blob([o.bytes]).stream(), httpMetadata: o.opts?.httpMetadata, arrayBuffer: async () => o.bytes.slice().buffer };
    },
    async head(key) { return r2.has(key) ? { size: r2.get(key).bytes.length } : null; },
    async list() { return { objects: [] }; },
    async delete(key) { r2.delete(key); },
  },
};
r2.set('intake/b9/001-voor.jpg', { bytes: new Uint8Array(KLANT_VOOR) });
r2.set('intake/b9/002-achter.jpg', { bytes: new Uint8Array(KLANT_ACHTER) });

db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (61, 'werkmap@voorbeeldmerk.test', 'Noor Visser', 'Voorbeeld/Merk', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, details_json, payment_status, country)
    VALUES (601, 'VIS-TEST-0601', 61, 'catalog', 'in_production', 'Noor Visser', 'Voorbeeld/Merk', 'werkmap@voorbeeldmerk.test', 12000, 'nl', 2,
            '${JSON.stringify({ product_p1: 'Hoodie VOORBEELD', garment_p1: 'top', colour_p1: 'zand #D8C7A8', material_p1: 'katoen', background_hex: '#F5F5F5', ratio: 'portrait45', channels: 'webshop', model: 'ava' })}', 'paid', 'NL');
  INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot) VALUES
    (601, 'upload', 'intake/b9/001-voor.jpg', 'IMG_2201.JPG', ${KLANT_VOOR.length}, 'p1', 'front'),
    (601, 'upload', 'intake/b9/002-achter.jpg', 'IMG_2202.JPG', ${KLANT_ACHTER.length}, 'p1', 'back');
`);
const adminToken = await mintToken();
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const koekje = { cookie: `vis_admin=${adminToken}` };

/** Een STORE-zip uitlezen: naam → bytes, via de lokale headers. */
function unzip(buf) {
  const uit = new Map();
  let i = 0;
  while (i + 30 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const size = buf.readUInt32LE(i + 18);
    const nlen = buf.readUInt16LE(i + 26);
    const xlen = buf.readUInt16LE(i + 28);
    const naam = buf.subarray(i + 30, i + 30 + nlen).toString('utf8');
    const start = i + 30 + nlen + xlen;
    uit.set(naam, buf.subarray(start, start + size));
    i = start + size;
  }
  return uit;
}

{
  const res = await adminGet({ request: new Request('https://visuails.com/admin/orders/601/scaffold', { headers: koekje }), env, waitUntil() {} });
  ok('de werkmap downloadt (200, zip)', res.status === 200 && res.headers.get('content-type') === 'application/zip', String(res.status));
  const cd = res.headers.get('content-disposition') || '';
  ok('zipnaam: VIS-TEST-0601 - Voorbeeld Merk.zip', cd.includes("filename*=UTF-8''VIS-TEST-0601%20-%20Voorbeeld%20Merk.zip"), cd);
  const zip = unzip(Buffer.from(await res.arrayBuffer()));
  const namen = [...zip.keys()];
  const root = 'VIS-TEST-0601 - Voorbeeld Merk/';
  ok('alles onder de wortelmap met merk', namen.every((n) => n.startsWith(root)), namen.find((n) => !n.startsWith(root)));
  const voor = zip.get(`${root}p1 - Hoodie VOORBEELD/_aangeleverd/p1-klant-voorkant.jpg`);
  ok('de klantfoto staat in _aangeleverd/, byte voor byte uit R2', !!voor && Buffer.compare(voor, KLANT_VOOR) === 0);
  ok('de achterkant ook', zip.has(`${root}p1 - Hoodie VOORBEELD/_aangeleverd/p1-klant-achterkant.jpg`));
  ok('p2 heeft een lege _aangeleverd/ (er kwam niets)', zip.has(`${root}p2 - product 2/_aangeleverd/`) && !namen.some((n) => n.startsWith(`${root}p2 - product 2/_aangeleverd/p2`)));
  ok('de vakken staan er nog', zip.has(`${root}p1 - Hoodie VOORBEELD/1 voorkant/`) && zip.has(`${root}p2 - product 2/4 op-model/`));
  const b1 = zip.get(`${root}p1 - Hoodie VOORBEELD/_briefing.txt`).toString('utf8');
  ok('de brief: INSTELLINGEN uit de bestelling', /INSTELLINGEN  kenmerk=VIS-TEST-0601 · product=p1 · dienst=catalog · achtergrond=#F5F5F5 · verhouding=4:5 · lange_zijde=2048 · kanaal=webshop · photoshop=ja\r\n/.test(b1), b1.split('\r\n')[3]);
  ok('de brief: plakregel zonder productnaam', /\r\nPLAKREGEL     top, zand \(#D8C7A8\), katoen\r\n/.test(b1), b1.split('\r\n')[5]);
  ok('de brief: MAKEN met het gezicht en wat wij erbij zetten', /  Gezicht     Ava\r\n/.test(b1) && /  Styling     /.test(b1));

  const zonder = await adminGet({ request: new Request('https://visuails.com/admin/orders/601/scaffold?fotos=nee', { headers: koekje }), env, waitUntil() {} });
  const z2 = unzip(Buffer.from(await zonder.arrayBuffer()));
  ok('?fotos=nee: dezelfde map zonder de foto\'s', ![...z2.keys()].some((n) => n.endsWith('.jpg')) && z2.has(`${root}p1 - Hoodie VOORBEELD/_briefing.txt`));

  const bord = await (await adminGet({ request: new Request('https://visuails.com/admin/orders/601/files', { headers: koekje }), env, waitUntil() {} })).text();
  ok('het bord zegt hoeveel foto\'s er meegaan', /De werkmap &mdash; met 2 foto&rsquo;s van de klant/.test(bord));
  ok('en biedt de lichte variant', bord.includes('href="/admin/orders/601/scaffold?fotos=nee"'));
}

/* ── 5 · TERUG UPLOADEN ─────────────────────────────────────────────────────── */
async function upload(velden) {
  const fd = new FormData();
  for (const [naam, bytes] of velden) fd.append('files', new File([bytes], naam, { type: naam.endsWith('.txt') ? 'text/plain' : 'image/jpeg' }));
  const res = await adminPost({
    request: new Request('https://visuails.com/admin/orders/601/deliver', { method: 'POST', headers: { ...koekje, origin: 'https://visuails.com' }, body: fd }),
    env, waitUntil() {},
  });
  return { status: res.status, html: await res.text(), to: res.headers.get('location') || '' };
}
const levering = () => tel("SELECT COUNT(*) FROM files WHERE order_id = 601 AND kind = 'delivery'");
const W = 'VIS-TEST-0601 - Voorbeeld Merk';
{
  const r = await upload([[`VIS-AB12-C3D - Ander merk/p1 - Hoodie/1 voorkant/export.jpg`, AF_VOOR]]);
  ok('een map van een andere bestelling wordt geweigerd (409)', r.status === 409, String(r.status));
  ok('met de rode zin', /Deze map hoort bij VIS-AB12-C3D, niet bij deze bestelling \(VIS-TEST-0601\)\. Er is niets geüpload\./.test(r.html));
  ok('en er staat niets in de database of R2', levering() === 0 && ![...r2.keys()].some((k) => k.startsWith('delivery/')));
}
{
  /* Een map zonder kenmerk in de naam, maar met de brief van een andere bestelling. */
  const r = await upload([
    ['Mijn map/p1 - Hoodie/_briefing.txt', new TextEncoder().encode('VIS-AB12-C3D · p1 · x\r\n\r\nINSTELLINGEN  kenmerk=VIS-AB12-C3D · product=p1\r\n')],
    ['Mijn map/p1 - Hoodie/1 voorkant/export.jpg', AF_VOOR],
  ]);
  ok('de vingerafdruk in _briefing.txt is genoeg om te weigeren', r.status === 409 && levering() === 0, String(r.status));
}
{
  /* Een gekopieerd bestand uit een andere bestelling, los in een vak. */
  const r = await upload([[`${W}/p1 - Hoodie VOORBEELD/1 voorkant/VIS-AB12-C3D-p1-voorkant.jpg`, AF_VOOR]]);
  ok('een bestandsnaam met een ander kenmerk: ook geweigerd', r.status === 409 && levering() === 0, String(r.status));
}
{
  const r = await upload([
    [`${W}/LEESMIJ.txt`, new TextEncoder().encode('VISUAILS - werkmap voor bestelling VIS-TEST-0601\r\n')],
    [`${W}/p1 - Hoodie VOORBEELD/_briefing.txt`, new TextEncoder().encode('INSTELLINGEN  kenmerk=VIS-TEST-0601 · product=p1\r\n')],
    [`${W}/p1 - Hoodie VOORBEELD/_aangeleverd/p1-klant-voorkant.jpg`, KLANT_VOOR],
    [`${W}/p1 - Hoodie VOORBEELD/1 voorkant/VIS-TEST-0601-p1-voorkant.jpg`, AF_VOOR],
    [`${W}/p1 - Hoodie VOORBEELD/1 voorkant/_ruw/magnific_0042.jpg`, KLANT_ACHTER],
    [`${W}/p1 - Hoodie VOORBEELD/2 achterkant/export_v3.jpg`, AF_ACHTER],
  ]);
  ok('de eigen map gaat erin', r.status === 200 && levering() === 2, `${r.status} ${levering()}`);
  ok('_aangeleverd/, _ruw/ en de werkbestanden overgeslagen', /1 (bestand )?uit\s+<code>_aangeleverd\/<\/code>/.test(r.html) && /3 werkbestanden van de werkmap/.test(r.html), r.html.slice(0, 400));
  ok('het ruwe beeld uit _ruw/ staat niet in R2', ![...r2.values()].some((o) => Buffer.compare(Buffer.from(o.bytes), KLANT_ACHTER) === 0 && o !== r2.get('intake/b9/002-achter.jpg')));
}
/* De klant keurt de voorkant goed; daarna gaat de hele map opnieuw omhoog, met
   alleen een nieuwe achterkant. */
db.exec("UPDATE files SET review_state = 'approved', announced_at = datetime('now') WHERE order_id = 601 AND kind = 'delivery' AND shot = 'front'");
const voorId = tel("SELECT id FROM files WHERE order_id = 601 AND kind = 'delivery' AND shot = 'front' AND superseded_at IS NULL");
const AF_ACHTER_2 = await jpg('#404040');
{
  const r = await upload([
    [`${W}/p1 - Hoodie VOORBEELD/1 voorkant/VIS-TEST-0601-p1-voorkant.jpg`, AF_VOOR],
    [`${W}/p1 - Hoodie VOORBEELD/2 achterkant/export_v4.jpg`, AF_ACHTER_2],
  ]);
  ok('het gelijke bestand wordt overgeslagen ("ongewijzigd")', /1 ongewijzigd|1 bestand is ongewijzigd/.test(r.html), r.html.slice(0, 300));
  ok('de goedgekeurde voorkant blijft staan, met zijn goedkeuring',
    tel("SELECT id FROM files WHERE order_id = 601 AND kind = 'delivery' AND shot = 'front' AND superseded_at IS NULL") === voorId
    && tel('SELECT review_state FROM files WHERE id = ?', voorId) === 'approved');
  ok('de gewijzigde achterkant vervangt de oude', tel("SELECT COUNT(*) FROM files WHERE order_id = 601 AND kind = 'delivery' AND shot = 'back'") === 2
    && tel("SELECT COUNT(*) FROM files WHERE order_id = 601 AND kind = 'delivery' AND shot = 'back' AND superseded_at IS NULL") === 1);
}
{
  /* Een upload uit één vakje met precies hetzelfde beeld: geen vervanging, en een regel. */
  const fd = new FormData();
  fd.append('product', 'p1'); fd.append('shot', 'front');
  fd.append('files', new File([AF_VOOR], 'nog-een-keer.jpg', { type: 'image/jpeg' }));
  const res = await adminPost({ request: new Request('https://visuails.com/admin/orders/601/deliver', { method: 'POST', headers: { ...koekje, origin: 'https://visuails.com' }, body: fd }), env, waitUntil() {} });
  const naar = res.headers.get('location') || '';
  ok('vakje: gelijk beeld → terug met "ongewijzigd"', /ongewijzigd=1/.test(naar), naar);
  const bord = await (await adminGet({ request: new Request(`https://visuails.com${naar}`, { headers: koekje }), env, waitUntil() {} })).text();
  ok('het bord zegt het in één regel', /Ongewijzigd: dit beeld stond er al precies zo/.test(bord));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
