/*
 * LEVERING 117 · P5-04 (keuze a) — /admin/vat KAN EEN MET DE HAND GECONTROLEERD NUMMER VERLEGGEN
 * 17 november 2026
 *
 *   node tests/levering-117-btw-verleggen.test.mjs        (geen build nodig)
 *
 * Formulier en twee mails beloven bij een btw-nummer dat VIES afkeurt: "klopt het toch, dan wordt de
 * btw verlegd". /admin/vat kon alleen 21% goedkeuren of afwijzen. Nu is er een derde knop "Nummer
 * klopt (met de hand gecontroleerd) — btw verleggen", met een verplichte notitie hoe; wie het deed
 * komt uit de sessie. (Lucas stemt dit af met zijn boekhouder.)
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117 P5-04: btw verleggen na een handmatige controle\n');

const mails = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'inkoop@proefmerk.test', 'Testa Proef', 'PROEFMERK', 'BE');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, lang, product_count, total_cents, vat_cents, vat_rate,
                      vat_treatment, country, vat_number, payment_status, review_state, review_reason, details_json, tier)
  VALUES (11704, 'VIS-TEST-11704', 1, 'catalog', 'received', 'Testa Proef', 'PROEFMERK', 'inkoop@proefmerk.test', 'nl', 3, 30000, 6300, 0.21,
          'nl_standard', 'BE', 'BE0123456789', 'unpaid', 'pending', 'VIES keurde het nummer af', '{"business_declaration":"v1"}', 'unattended'),
         (11705, 'VIS-TEST-11705', 1, 'catalog', 'received', 'Testa Proef', 'PROEFMERK', 'inkoop@proefmerk.test', 'nl', 3, 30000, 6300, 0.21,
          'nl_standard', 'NL', 'NL123456789B01', 'unpaid', 'pending', 'geen KVK', '{"business_declaration":"v1"}', 'unattended');
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
const env = {
  DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
  UPLOADS: { async put() {}, async get() { return null; }, async head() { return null; }, async delete() {}, async list() { return { objects: [] }; } },
};
const headers = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };
const post = (id, velden) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.set(k, v);
  return adminPost({ request: new Request(`https://visuails.com/admin/orders/${id}/vat`, { method: 'POST', body: fd, headers }), env, waitUntil() {} });
};

console.log('1 · /admin/vat toont de derde knop');
{
  const r = await adminGet({ request: new Request('https://visuails.com/admin/vat', { headers }), env, waitUntil() {} });
  const html = await r.text();
  const kaart = (ref) => { const i = html.indexOf(ref); return i < 0 ? '' : html.slice(i, html.indexOf('</div>\n</div>', i) > 0 ? html.indexOf('class="card"', i + 10) : i + 6000); };
  ok('bij een Belgisch nummer: "Nummer klopt (met de hand gecontroleerd) — btw verleggen"', /Nummer klopt \(met de hand gecontroleerd\) &mdash; btw verleggen/.test(kaart('VIS-TEST-11704')));
  ok('  met een verplicht veld "hoe"', /name="hoe"[^>]*required/.test(kaart('VIS-TEST-11704')));
  ok('bij een Nederlandse klant niet (geen verlegging binnen NL)', kaart('VIS-TEST-11705').length > 100 && !/btw verleggen/.test(kaart('VIS-TEST-11705')));
}

console.log('\n2 · zonder notitie gebeurt er niets');
{
  const r = await post(11704, { action: 'verleggen', hoe: '   ' });
  ok('terug met uit=hoe', /uit=hoe/.test(r.headers.get('location') || ''), r.headers.get('location'));
  const o = db.prepare('SELECT vat_treatment, vat_cents, review_state FROM orders WHERE id = 11704').get();
  ok('de bestelling is onveranderd', o.vat_treatment === 'nl_standard' && o.vat_cents === 6300 && o.review_state === 'pending', JSON.stringify(o));
}

console.log('\n3 · met notitie: verlegd, 0%, wie en hoe vastgelegd, betaallink');
{
  const voor = mails.length;
  const r = await post(11704, { action: 'verleggen', hoe: 'VIES opnieuw op 17-11, nu geldig' });
  ok('terug met uit=verlegd', /uit=verlegd/.test(r.headers.get('location') || ''), r.headers.get('location'));
  const o = db.prepare('SELECT * FROM orders WHERE id = 11704').get();
  ok('verlegd, btw 0, netto ongewijzigd', o.vat_treatment === 'eu_reverse_charge' && o.vat_cents === 0 && Number(o.vat_rate) === 0 && o.total_cents === 30000, JSON.stringify({ t: o.vat_treatment, v: o.vat_cents, n: o.total_cents }));
  ok('goedgekeurd door de admin uit de sessie', o.review_state === 'approved' && o.reviewed_by === 'studio@voorbeeld.test');
  const d = JSON.parse(o.details_json || '{}');
  ok('details_json.btw_handmatig: door en hoe', d.btw_handmatig?.door === 'studio@voorbeeld.test' && d.btw_handmatig?.hoe === 'VIES opnieuw op 17-11, nu geldig' && !!d.btw_handmatig?.op, JSON.stringify(d.btw_handmatig));
  const log = db.prepare("SELECT detail FROM admin_log WHERE action = 'vat:verleggen' AND order_id = 11704").get();
  ok('in het logboek met wie en hoe', !!log && /studio@voorbeeld\.test/.test(log.detail) && /VIES opnieuw/.test(log.detail), log?.detail);
  ok('de klant ziet een neutrale tijdlijnregel', !!db.prepare("SELECT 1 FROM order_events WHERE order_id = 11704 AND note LIKE '%btw is verlegd%'").get());
  const link = mails.slice(voor).find((m) => /VIS-TEST-11704/.test(m.subject || ''));
  ok('de betaallink is gemaild', !!link, mails.slice(voor).map((m) => m.subject).join(' | '));
  ok('  zonder btw erop', !!link && !/incl\. € [0-9]/.test(link.html || '') && /btw verlegd/.test(link.html || ''));
}

console.log('\n4 · een Nederlandse bestelling kan niet verlegd worden (ook niet met een gesleuteld formulier)');
{
  await post(11705, { action: 'verleggen', hoe: 'gesleuteld' });
  const o = db.prepare('SELECT vat_treatment, vat_cents, review_state FROM orders WHERE id = 11705').get();
  ok('onveranderd', o.vat_treatment === 'nl_standard' && o.vat_cents === 6300 && o.review_state === 'pending', JSON.stringify(o));
}

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
