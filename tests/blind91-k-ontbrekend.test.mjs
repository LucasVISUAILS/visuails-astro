/* VISUAILS — ronde 91 (K-02), 9 november 2026: ontbrekende foto's zonder appen.
 * Lucas koos in lijst 85 (A2 = goed):
 *   1 · de bevestiging en de betaalmail noemen per product welke foto's ontbreken, met
 *       de knop "Foto's toevoegen" (naar de bestelpagina, #fotos);
 *   2 · op de privélink (de bestelpagina) vult de klant het lege vak zelf: dezelfde
 *       opslag als in Studio, het token als bewijs, een eigen grens, alleen vóór Geleverd.
 * (De regel in Nu doen doet bouwer W.)
 *
 * Echte SQLite (tests/lib/d1sqlite.mjs), R2 als Map, nep-Resend; de echte handlers.
 *   node tests/blind91-k-ontbrekend.test.mjs
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { portalGet, portalPost } from '../src/lib/portal.js';
import { hashToken, mintToken } from '../src/lib/token.js';
import { customerEmail } from '../functions/api/order.js';
import { invoiceEmail, betaalMailContext } from '../src/lib/invoiceMail.js';
import { nasturenOpen } from '../src/lib/nasturen.js';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return new Response('{"id":"m"}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const LINK = 'https://visuails.com/o/abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
const REGELS = ['Product 1 · Hoodie zwart: geen achterkant'];

console.log('1 · de mails');
{
  const nl = customerEmail('nl', 'VIS-TEST-0101', 'catalog', 'Sanne', { portal: LINK, ontbreekt: REGELS, fotosLink: `${LINK}#fotos`, details: {} });
  ok('bevestiging: per product wat ontbreekt', nl.includes('Er ontbreken nog foto’s:') && nl.includes('Product 1 · Hoodie zwart: geen achterkant'));
  ok('  met de knop "Foto’s toevoegen" naar de bestelpagina (#fotos)', new RegExp(`href="${LINK}#fotos"[^>]*>[\\s\\S]{0,200}Foto’s toevoegen`).test(nl));
  ok('  en zonder inloggen in Studio', /op je bestelpagina/.test(nl) && /Inloggen hoeft niet/.test(nl) && !/log in met dit e-mailadres/.test(nl));
  const en = customerEmail('en', 'VIS-TEST-0101', 'catalog', 'Sanne', { portal: LINK, ontbreekt: ['Product 1: no back'], fotosLink: `${LINK}#fotos`, details: {} });
  ok('EN: "Add photos" and "on your order page"', /Add photos/.test(en) && /on your order page/.test(en));
  const zonder = customerEmail('nl', 'VIS-TEST-0102', 'catalog', 'Sanne', { portal: LINK, details: {} });
  ok('niets ontbreekt: geen blok en geen knop', !zonder.includes('Er ontbreken nog foto’s') && !zonder.includes('#fotos'));

  const inv = invoiceEmail({ lang: 'nl', order: { ref: 'VIS-TEST-0101', name: 'Sanne', service: 'catalog' }, invoice: { number: 'VIS-2026-0001' }, snap: { netCents: 100, vatCents: 21, treatment: 'nl_standard' }, attached: true, link: LINK, levering: { soort: 'zsm' }, ontbreekt: REGELS, fotosLink: `${LINK}#fotos` });
  ok('betaalmail: dezelfde regels en dezelfde knop', inv.html.includes('Product 1 · Hoodie zwart: geen achterkant') && inv.html.includes(`href="${LINK}#fotos"`) && /Foto’s toevoegen/.test(inv.html));
  const invOud = invoiceEmail({ lang: 'nl', order: { ref: 'VIS-TEST-0101', name: 'Sanne', service: 'catalog' }, invoice: { number: 'VIS-2026-0001' }, snap: { netCents: 100, vatCents: 21, treatment: 'nl_standard' }, attached: true, link: LINK, levering: { soort: 'zsm' }, ontbreekt: REGELS });
  ok('  zonder link (de link lukte niet): de oude weg via Studio, geen knop', /log in met dit e-mailadres/.test(invOud.html) && !invOud.html.includes('#fotos'));

  const flow = lees('functions/api/order.js');
  ok('de bestelroute rekent de regels voor de bevestiging uit, in de taal van de klant', /const regels = ontbrekendRegels\(lijst, lang\);/.test(flow) && /fotosLink: portalLink \? `\$\{portalLink\}#fotos` : ''/.test(flow));
}

/* ── De database ──────────────────────────────────────────────────────────── */
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
const r2 = new Map();
const env = {
  DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
  UPLOADS: { async put(k, b, o) { r2.set(k, { bytes: b?.byteLength || 0, o }); }, async get(k) { return r2.has(k) ? { body: null } : null; }, async delete(k) { r2.delete(k); }, async head() { return null; } },
};
db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'klant@voorbeeld.test', 'TESTMERK')");
function bestelling(id, ref, { status = 'received', service = 'catalog' } = {}) {
  db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, name, lang, brand, total_cents, payment_status, paid_at, details_json)
              VALUES (?, ?, 1, ?, ?, 'unattended', 1, 'klant@voorbeeld.test', 'Sanne Test', 'nl', 'TESTMERK', 3900, 'paid', datetime('now'), ?)`)
    .run(id, ref, service, status, JSON.stringify({ product_p1: 'Hoodie zwart' }));
  /* Voorkant en detail zijn er; de achterkant ontbreekt. */
  db.prepare("INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot) VALUES (?, 'upload', ?, 'voor.jpg', 1000, 'p1', 'front')").run(id, `intake/${ref}/1.jpg`);
  db.prepare("INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot) VALUES (?, 'upload', ?, 'detail.jpg', 1000, 'p1', 'detail')").run(id, `intake/${ref}/2.jpg`);
}
async function token(orderId) {
  const t = mintToken();
  db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?, ?)').run(orderId, await hashToken(t));
  return t;
}
let ip = 1;
const ctx = (t, init = {}, pad = '') => ({ request: new Request(`https://visuails.com/o/${t}${pad}`, { ...init, headers: { 'cf-connecting-ip': `10.91.2.${ip++}`, ...(init.headers || {}) } }), env, waitUntil() {} });
/* Een echte JPEG-kop, zodat de beeldkeuring (isBeeldHandtekening) hem herkent. */
const jpeg = (naam = 'achter.jpg') => new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, ...new Array(2000).fill(7)])], naam, { type: 'image/jpeg' });
const stuur = (t, velden) => { const fd = new FormData(); for (const [k, v] of velden) fd.append(k, v); return portalPost(ctx(t, { method: 'POST', body: fd })); };

console.log('\n2 · de betaalmail weet het uit de database');
{
  bestelling(10, 'VIS-TEST-0110');
  const c = await betaalMailContext(env, 'VIS-TEST-0110', 'nl');
  ok('betaalMailContext: de regels en een link naar #fotos', c.ontbreekt.length === 1 && /geen achterkant/.test(c.ontbreekt[0]) && /^https:\/\/visuails\.com\/o\/[A-Za-z0-9_-]{43}#fotos$/.test(c.fotosLink), JSON.stringify(c));
}

console.log('\n3 · de bestelpagina: het lege vak zelf vullen');
{
  bestelling(1, 'VIS-TEST-0001');
  const t = await token(1);
  let html = await (await portalGet(ctx(t))).text();
  ok('het blok "Voeg je foto’s toe" staat erop, met één veld: de achterkant van product 1', /<section class="fotos" id="fotos"/.test(html) && (html.match(/<input type="file" name="vak_p1_[a-z]+"/g) || []).length === 1 && /name="vak_p1_back"/.test(html));
  ok('  een gewoon formulier (multipart), geen script', /<form method="post" action="" enctype="multipart\/form-data">/.test(html) && !/<script/i.test(html));
  ok('  met de vaknaam en het product erbij', /Achterkant/.test(html) && /aria-label="Achterkant voor Product 1 · Hoodie zwart"/.test(html));
  ok('de knop bovenaan wijst naar #fotos en niet meer naar de inlog van Studio', /href="#fotos"/.test(html) && !/\/account\/orders\?order=1#fotos-1/.test(html));

  const voorMails = mails.length;
  const r = await stuur(t, [['action', 'fotos'], ['vak_p1_back', jpeg()]]);
  ok('versturen → 303 terug naar #fotos met het aantal', r.status === 303 && /\?fotos=1#fotos$/.test(r.headers.get('location') || ''), r.headers.get('location'));
  const rij = db.prepare("SELECT r2_key, product_key, shot, filename FROM files WHERE order_id = 1 AND kind = 'upload' AND shot = 'back'").get();
  ok('de foto staat in het goede vak (files: p1/back), zoals bij nasturen in Studio', !!rij && rij.product_key === 'p1' && /^aangeleverd\/VIS-TEST-0001\//.test(rij.r2_key));
  ok('  en in R2, met de bron erbij', r2.has(rij?.r2_key) && r2.get(rij?.r2_key).o?.customMetadata?.bron === 'privelink' && r2.get(rij?.r2_key).o?.customMetadata?.shot === 'back');
  ok('de tijdlijn zegt "Nagestuurd op de bestelpagina: Product 1 achterkant"', telling(db, "SELECT COUNT(*) FROM order_events WHERE order_id = 1 AND note = 'Nagestuurd op de bestelpagina: Product 1 achterkant' AND actor = 'customer'") === 1);
  ok('Lucas krijgt de studiomail "Foto’s binnen"', mails.slice(voorMails).some((m) => /^Foto's binnen · VIS-TEST-0001/.test(m.subject || '')));
  html = await (await portalGet(ctx(t, {}, '?fotos=1'))).text();
  ok('daarna: "de foto is binnen", en geen leeg vak meer', /Dank je, de foto is binnen/.test(html) && !/name="vak_p1_/.test(html));

  const vol = await stuur(t, [['action', 'fotos'], ['vak_p1_front', jpeg('nog-een-voorkant.jpg')]]);
  ok('een vol vak blijft vol (vervangen kan alleen in Studio)', /\?fotos=0#fotos$/.test(vol.headers.get('location') || '') && telling(db, "SELECT COUNT(*) FROM files WHERE order_id = 1 AND shot = 'front'") === 1);
  const raar = await stuur(t, [['action', 'fotos'], ['vak_p9_back', jpeg()], ['vak_p1_onzin', jpeg()]]);
  ok('een product of vak dat niet bestaat: niets opgeslagen', /\?fotos=0#fotos$/.test(raar.headers.get('location') || '') && telling(db, 'SELECT COUNT(*) FROM files WHERE order_id = 1') === 3);
  const geenBeeld = await stuur(t, [['action', 'fotos'], ['vak_p1_back', new File([new Uint8Array(500).fill(1)], 'virus.jpg', { type: 'image/jpeg' })]]);
  ok('geen echt beeld: geweigerd door dezelfde keuring als /api/upload', /\?fotos=0#fotos$/.test(geenBeeld.headers.get('location') || ''));
}

console.log('\n4 · alleen vóór Geleverd, en niet bij de proef');
{
  bestelling(2, 'VIS-TEST-0002', { status: 'delivered' });
  const t = await token(2);
  const html = await (await portalGet(ctx(t))).text();
  ok('geleverd: geen blok', !/id="fotos"/.test(html));
  const r = await stuur(t, [['action', 'fotos'], ['vak_p1_back', jpeg()]]);
  ok('  en een post wordt geweigerd (?fotos=dicht), niets opgeslagen', /\?fotos=dicht#fotos$/.test(r.headers.get('location') || '') && telling(db, "SELECT COUNT(*) FROM files WHERE order_id = 2 AND shot = 'back'") === 0);
  ok('dezelfde regel als Studio (nasturenOpen uit src/lib/nasturen.js)', /import \{ nasturenOpen \} from '\.\/nasturen\.js';/.test(lees('src/lib/account.js'))
    && nasturenOpen({ service: 'catalog', status: 'in_production' }) && !nasturenOpen({ service: 'catalog', status: 'delivered' }) && !nasturenOpen({ service: 'test-sample', status: 'received' }) && !nasturenOpen({ service: 'catalog', status: 'received', closed_at: 'x' }));
}

console.log('\n5 · een eigen grens per bestelling');
{
  bestelling(3, 'VIS-TEST-0003');
  const t = await token(3);
  let laatste = null;
  for (let i = 0; i < 11; i++) laatste = await stuur(t, [['action', 'fotos']]);
  ok('de elfde keer binnen een uur: ?fotos=vaak', /\?fotos=vaak#fotos$/.test(laatste.headers.get('location') || ''), laatste.headers.get('location'));
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
