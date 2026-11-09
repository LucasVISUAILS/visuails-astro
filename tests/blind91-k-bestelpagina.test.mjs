/* VISUAILS — ronde 91 (K-03), 9 november 2026: de privélink wordt dé bestelpagina.
 * Lucas koos in lijst 85 (A3 = goed): bekijken, goedkeuren, revisieronde, foto's
 * nasturen (K-02) en PNG/WebP aanvragen kunnen allemaal op de privélink; Studio houdt
 * wat over het account gaat. Plus het klantdeel van B3: de klantpagina heet overal
 * "je bestelpagina" / "your order page".
 *
 * Echte SQLite, de echte handlers (portalGet/portalPost, formaatMail).
 *   node tests/blind91-k-bestelpagina.test.mjs
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { portalGet, portalPost, portalVoorvertoning } from '../src/lib/portal.js';
import { hashToken, mintToken } from '../src/lib/token.js';
import { formaatMail } from '../src/lib/formaten.js';
import { TIPS } from '../src/data/tips.js';
import { sendMail } from '../src/lib/mail.js';
import * as mailTpl from '../src/lib/mailTemplate.js';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };

const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return new Response('{"id":"m"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
const env = { DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'klant@voorbeeld.test', 'TESTMERK')");
function bestelling(id, ref, { status = 'delivered', service = 'catalog', lang = 'nl' } = {}) {
  db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, name, lang, brand, total_cents, payment_status, delivery_mailed_at, details_json)
              VALUES (?, ?, 1, ?, ?, 'unattended', 1, 'klant@voorbeeld.test', 'Sanne Test', ?, 'TESTMERK', 3900, 'paid', datetime('now'), '{}')`).run(id, ref, service, status, lang);
  db.prepare("INSERT INTO files (order_id, kind, r2_key, filename, bytes, review_state, product_key, shot, announced_at) VALUES (?, 'delivery', ?, 'b1.jpg', 1000, 'pending', 'p1', 'front', datetime('now'))").run(id, `lever/${ref}/1.jpg`);
}
async function token(orderId) {
  const t = mintToken();
  db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?, ?)').run(orderId, await hashToken(t));
  return t;
}
let ip = 1;
const ctx = (t, init = {}, pad = '') => ({ request: new Request(`https://visuails.com/o/${t}${pad}`, { ...init, headers: { 'cf-connecting-ip': `10.91.3.${ip++}`, ...(init.headers || {}) } }), env, waitUntil() {} });
const post = (t, velden) => portalPost(ctx(t, { method: 'POST', body: new URLSearchParams(velden) }));

console.log('1 · PNG/WebP aanvragen op de bestelpagina');
{
  bestelling(1, 'VIS-TEST-0301');
  const t = await token(1);
  let html = await (await portalGet(ctx(t))).text();
  ok('het blok "Andere formaten" staat er, met "Ook als PNG" en "Ook als WebP"', /<section class="formaten" id="formaten"/.test(html) && /name="formaat" value="png"[^>]*>(?:<svg[^]*?<\/svg>)?Ook als PNG</.test(html) && /name="formaat" value="webp"[^>]*>(?:<svg[^]*?<\/svg>)?Ook als WebP</.test(html));  /* knoppensysteem lijst 88/89: met het download-icoon ervoor */ 
  ok('  een gewoon formulier, geen script', /<form method="post" action="" class="formaten-knoppen"><input type="hidden" name="action" value="formaat">/.test(html) && !/<script/i.test(html));
  const r = await post(t, { action: 'formaat', formaat: 'png' });
  ok('"Ook als PNG" → 303 naar #formaten met ?formaat=png', r.status === 303 && /\?formaat=png#formaten$/.test(r.headers.get('location') || ''), r.headers.get('location'));
  ok('het verzoek staat in formaat_verzoeken, aan de bestelling (zoals vanuit Studio)', telling(db, "SELECT COUNT(*) FROM formaat_verzoeken WHERE order_id = 1 AND formaat = 'png' AND klaar_at IS NULL") === 1);
  await post(t, { action: 'formaat', formaat: 'png' });
  ok('nog een klik: nog steeds één verzoek', telling(db, 'SELECT COUNT(*) FROM formaat_verzoeken WHERE order_id = 1') === 1);
  html = await (await portalGet(ctx(t, {}, '?formaat=png'))).text();
  ok('daarna: "Genoteerd" en "PNG aangevraagd · <datum>", geen PNG-knop meer', /Genoteerd: we maken de beelden van deze bestelling ook als PNG\./.test(html) && /class="formaat-staat">PNG aangevraagd · \d+ [a-z]+</.test(html) && !/value="png"/.test(html));
  const raar = await post(t, { action: 'formaat', formaat: 'tiff' });
  ok('een onbekend formaat doet niets', /\/o\/[^?#]+$/.test(raar.headers.get('location') || '') && telling(db, 'SELECT COUNT(*) FROM formaat_verzoeken') === 1);
}

console.log('\n2 · niet vóór de levering en niet bij de proef');
{
  bestelling(2, 'VIS-TEST-0302', { status: 'in_production' });
  const t = await token(2);
  const html = await (await portalGet(ctx(t))).text();
  ok('in productie: geen formatenblok', !/id="formaten"/.test(html));
  await post(t, { action: 'formaat', formaat: 'webp' });
  ok('  en een post zet niets', telling(db, 'SELECT COUNT(*) FROM formaat_verzoeken WHERE order_id = 2') === 0);
  bestelling(3, 'VIS-TEST-0303', { service: 'test-sample' });
  const tp = await token(3);
  const proef = await (await portalGet(ctx(tp))).text();
  ok('de €1-proef: geen formatenblok (zoals in Studio)', !/id="formaten"/.test(proef));
}

console.log('\n3 · "Bekijken zoals de klant het ziet" toont het ook');
{
  const o = db.prepare("SELECT o.id AS order_id, o.* FROM orders o WHERE o.id = 1").get();
  const html = await (await portalVoorvertoning(env, { ...o, token_id: null }, 'nl')).text();
  ok('de voorvertoning in /admin heeft het blok, met uitgeschakelde knoppen', /id="formaten"/.test(html) && !/value="webp"(?![^>]*disabled)/.test(html));
}

console.log('\n4 · de pagina heet "je bestelpagina"');
{
  const t = await token(1);
  const html = await (await portalGet(ctx(t))).text();
  ok('de tab: "Je bestelpagina — VISUAILS"', /<title>Je bestelpagina — VISUAILS<\/title>/.test(html));
  ok('de tip noemt hem zo', TIPS.nl.privelink.startsWith('Tip: dit is je bestelpagina.') && TIPS.en.privelink.startsWith('Tip: this is your order page.'));
  bestelling(4, 'VIS-TEST-0304', { lang: 'en' });
  const te = await token(4);
  const en = await (await portalGet(ctx(te))).text();
  ok('EN: "Your order page — VISUAILS"', /<title>Your order page — VISUAILS<\/title>/.test(en));
  const kaal = await (await portalGet({ request: new Request('https://visuails.com/o', { headers: { 'accept-language': 'nl' } }), env, waitUntil() {} })).text();
  ok('/o zonder link: "Je bestelpagina heeft een eigen link"', /Je bestelpagina heeft een eigen link/.test(kaal), kaal.slice(0, 200));
}

console.log('\n5 · de mail na "Klaar" in /admin wijst naar de bestelpagina');
{
  db.exec("UPDATE formaat_verzoeken SET klaar_at = datetime('now') WHERE order_id = 1");
  const id = db.prepare('SELECT id FROM formaat_verzoeken WHERE order_id = 1').get().id;
  const voor = mails.length;
  const r = await formaatMail(env, id, { origin: 'https://visuails.com', sendMail, mail: mailTpl });
  const m = mails[voor];
  ok('verstuurd, met de knop "Naar je bestelpagina" en een eigen link /o/<token>', r.ok && /Naar je bestelpagina/.test(m?.html || '') && /href="https:\/\/visuails\.com\/o\/[A-Za-z0-9_-]{43}"/.test(m?.html || ''));
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
