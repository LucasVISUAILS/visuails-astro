/*
 * CREDITS IN /ADMIN EN STUDIO — ronde B, 8 oktober 2026 (§28.2, 6.08)
 *
 * Een bestelling die met credits betaald is, tegen het echte schema.sql en de
 * echte /admin-routes (met een echte adminsessie):
 *   · de pil "Credits" naast het kenmerk, in de lijst en op de bestelpagina;
 *   · annuleren vraagt "credits terug / niets", en "terug" zet ze als nieuwe
 *     partij op het saldo, minstens 3 maanden geldig, met tijdlijn en mail
 *     (spaarplafond, 12 oktober 2026: bij een lopend abonnement zonder datum);
 *   · "niet gemaakt": een deel terug, nooit meer dan er afging;
 *   · een creditbestelling is niet te verwijderen;
 *   · "Credits bijstellen" vraagt een reden en gaat nooit onder nul;
 *   · Studio zet de pil, de levermail noemt geen bedrag.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost, deliveryEmail } from '../src/lib/admin.js';
import { orderView, COPY } from '../src/lib/account.js';
import { cancelEmail } from '../src/lib/cancelMail.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { boekBij, betaalBestellingMetCredits, creditsBeschikbaar, vervaldatum, CREDIT_REDEN } from '../src/lib/creditboek.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(74)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

const gezien = [];
globalThis.fetch = async (url, opts = {}) => {
  gezien.push({ url: String(url), body: opts.body ? String(opts.body) : '' });
  return new Response(JSON.stringify({ id: 'em_1' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));
const tekst = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema laadt', mislukt, []);
const env = { DB: d1(db), RESEND_API_KEY: 're_x', FROM_EMAIL: 'x@y.z', NOTIFY_EMAIL: 'studio@visuails.test' };

db.prepare("INSERT INTO customers (id, email, name, brand) VALUES (1, 'inkoop@proefmerk.test', 'Testa Proef', 'Proefmerk')").run();
db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at)
            VALUES (5, 1, 'SUB-PROEF', 'studio', 'monthly', 'active', '2026-09-20 10:00:00')`).run();
await boekBij(env, { customerId: 1, subscriptionId: 5, aantal: 120, reden: CREDIT_REDEN.termijn, sleutel: 'termijn:5:x' });

let volg = 200;
async function creditBestelling(credits, n = 12) {
  volg += 1;
  db.prepare(`INSERT INTO orders (id, ref, customer_id, service, email, name, brand, total_cents, vat_cents, product_count, lang, status)
              VALUES (?, ?, 1, 'catalog', 'inkoop@proefmerk.test', 'Testa Proef', 'Proefmerk', 61200, 12852, ?, 'nl', 'received')`)
    .run(volg, `VIS-CR${volg}`, n);
  const r = await betaalBestellingMetCredits(env, { orderId: volg, customerId: 1, aantal: credits });
  if (!r.ok) throw new Error(`afboeken mislukt: ${r.reden}`);
  return volg;
}

const token = await mintToken();
db.prepare("INSERT INTO admin_users (email, password_hash) VALUES ('lucas@visuails.test', 'x')").run();
const adminId = db.prepare('SELECT id FROM admin_users ORDER BY id DESC LIMIT 1').get().id;
db.prepare("INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 day'))").run(adminId, await hashToken(token));
const kop = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };
const get = (pad) => adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: kop }), env, waitUntil() {} }).then((r) => r.text());
const post = (pad, velden) => adminPost({
  request: new Request(`https://visuails.com${pad}`, {
    method: 'POST', headers: { ...kop, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(velden).toString(),
  }), env, waitUntil() {},
});
const vandaag = new Date().toISOString().slice(0, 10);

console.log('\nde pil "Credits" in /admin');
{
  const id = await creditBestelling(48);
  const lijst = await get('/admin');
  ok('in de lijst naast het kenmerk', new RegExp(`VIS-CR${id}</span><span class="credits-pil"`).test(lijst), true);
  const pagina = await get(`/admin/orders/${id}/files`);
  ok('op de bestelpagina in de kop', /<h1>VIS-CR\d+<span class="credits-pil"/.test(pagina), true);
  ok('  met "betaald met credits" in het betaalblok', /betaald met credits/.test(pagina), true);
  ok('het annuleerscherm vraagt wat er met de credits gebeurt', /<select name="credits" required>/.test(pagina), true);
  ok('  en vraagt niet naar geld', /<select name="payment"/.test(pagina), false);
  ok('"credits terug" voor een product dat niet gemaakt kan worden', /\/admin\/orders\/\d+\/credits-terug/.test(pagina), true);
  ok('verwijderen kan niet', /Niet mogelijk: deze bestelling is betaald/.test(pagina), true);
}

console.log('\nannuleren: credits terug (6.08)');
{
  const id = await creditBestelling(48);
  const voor = await creditsBeschikbaar(env, 1);
  ok('zonder keuze over de credits: geweigerd', (await post(`/admin/orders/${id}/cancel`, { reason: 'Klant wil het niet meer' })).status, 400);
  ok('  en niet geannuleerd', db.prepare('SELECT status FROM orders WHERE id = ?').get(id).status, 'received');
  const voorMails = mails().length;
  const r = await post(`/admin/orders/${id}/cancel`, { reason: 'Klant wil het niet meer', credits: 'terug' });
  ok('met "credits terug": gelukt', r.status, 303);
  const o = db.prepare('SELECT status, cancel_payment FROM orders WHERE id = ?').get(id);
  ok('  geannuleerd, cancel_payment = credits', [o.status, o.cancel_payment], ['cancelled', 'credits']);
  ok('  48 credits terug op het saldo', await creditsBeschikbaar(env, 1), voor + 48);
  const regel = db.prepare("SELECT aantal, vervalt_op, toelichting FROM credit_boek WHERE order_id = ? AND reden = 'annulering'").get(id);
  ok('  een regel "annulering" in het creditboek, 3 maanden vanaf vandaag', [regel.aantal, regel.vervalt_op], [48, vervaldatum(vandaag)]);
  ok('  met de reden erbij', regel.toelichting, 'Klant wil het niet meer');
  ok('  de klant leest het op zijn tijdlijn', !!db.prepare("SELECT 1 FROM order_events WHERE order_id = ? AND note LIKE '48 credits staan weer op je saldo%'").get(id), true);
  const mail = mails().slice(voorMails).find((m) => /geannuleerd/.test(m.subject || ''));
  /* Spaarplafond (12 oktober 2026): het abonnement loopt, dus geen datum —
     die schuift bij de volgende termijn mee (terugZin in creditWeergave.js). */
  ok('  en in de annuleringsmail (lopend abonnement: zonder datum)', /Je betaalde deze bestelling met credits\. 48 credits staan weer op je saldo\./.test(tekst(mail && mail.html)) && !/geldig tot/.test(tekst(mail && mail.html)), true);
  ok('  zonder eurobedrag', /€/.test(tekst(mail && mail.html)), false);
}

console.log('\nannuleren: niets');
{
  const id = await creditBestelling(8, 2);
  const voor = await creditsBeschikbaar(env, 1);
  const r = await post(`/admin/orders/${id}/cancel`, { reason: 'Afgesproken met de klant', credits: 'niets' });
  ok('met "niets": gelukt', r.status, 303);
  ok('  cancel_payment = none', db.prepare('SELECT cancel_payment FROM orders WHERE id = ?').get(id).cancel_payment, 'none');
  ok('  saldo onveranderd', await creditsBeschikbaar(env, 1), voor);
  ok('  geen regel terug', db.prepare("SELECT COUNT(*) AS n FROM credit_boek WHERE order_id = ? AND aantal > 0").get(id).n, 0);
}

console.log('\nniet gemaakt: een deel terug (6.08)');
{
  const id = await creditBestelling(20, 5);
  const voor = await creditsBeschikbaar(env, 1);
  ok('zonder reden: geweigerd', (await post(`/admin/orders/${id}/credits-terug`, { credits: '4' })).status, 400);
  ok('4 terug met reden', (await post(`/admin/orders/${id}/credits-terug`, { credits: '4', reason: 'Product 3 kwam niet aan' })).status, 303);
  ok('  saldo +4', await creditsBeschikbaar(env, 1), voor + 4);
  ok('  regel "niet-gemaakt" met de reden', db.prepare("SELECT aantal, toelichting FROM credit_boek WHERE order_id = ? AND reden = 'niet-gemaakt'").get(id), { aantal: 4, toelichting: 'Product 3 kwam niet aan' });
  ok('meer dan er nog open staat: geweigerd', (await post(`/admin/orders/${id}/credits-terug`, { credits: '17', reason: 'x' })).status, 400);
  ok('  saldo niet geraakt', await creditsBeschikbaar(env, 1), voor + 4);
  ok('verwijderen van een creditbestelling: geweigerd', (await post(`/admin/orders/${id}/delete`, { confirm: `VIS-CR${id}` })).status, 400);
}

console.log('\nCredits bijstellen (6.08)');
{
  const voor = await creditsBeschikbaar(env, 1);
  ok('zonder reden: geweigerd', (await post('/admin/customers/1/slots', { delta: '10' })).status, 400);
  ok('+10 met reden', (await post('/admin/customers/1/slots', { delta: '10', reason: 'incasso van juli kwam alsnog binnen' })).status, 303);
  ok('  saldo +10', await creditsBeschikbaar(env, 1), voor + 10);
  ok('  regel "bijstelling" met de reden en wie', db.prepare("SELECT aantal, toelichting, door FROM credit_boek WHERE reden = 'bijstelling' ORDER BY id DESC LIMIT 1").get(),
    { aantal: 10, toelichting: 'incasso van juli kwam alsnog binnen', door: 'lucas@visuails.test' });
  ok('eraf, meer dan er is: geweigerd (nooit onder nul)', (await post('/admin/customers/1/slots', { delta: '-300', reason: 'te veel' })).status, 400);
  ok('−5 met reden', (await post('/admin/customers/1/slots', { delta: '-5', reason: 'dubbel gegeven' })).status, 303);
  ok('  saldo +5', await creditsBeschikbaar(env, 1), voor + 5);
}

console.log('\nStudio en de mails');
{
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(201);
  for (const lang of ['nl', 'en']) {
    const v = orderView(COPY[lang], lang, o, [], []);
    ok(`orderView ${lang}: credits = true`, v.credits, true);
  }
  ok('orderView: een gewone bestelling niet', orderView(COPY.nl, 'nl', { ...o, payment_status: 'paid' }, [], []).credits, false);
  const kaart = readFileSync(new URL('../src/components/studio/Bestelling.astro', import.meta.url), 'utf8');
  ok('Bestelling.astro zet de pil naast het kenmerk', /v\.credits && <span class="credits-pil"/.test(kaart), true);
  ok('de pil heet "Credits", voluit "Paid with subscription credits"', [COPY.nl.pilCredits, COPY.en.pilCreditsTitel], ['Credits', 'Paid with subscription credits']);
  for (const lang of ['nl', 'en']) {
    const m = deliveryEmail({ order: { ...o, lang }, link: 'https://visuails.com/o/abc', n: 48 });
    ok(`levermail ${lang} bij een creditbestelling: geen bedrag`, /€/.test(tekst(m)), false);
  }
  const niets = cancelEmail({ order: { ref: 'VIS-X', lang: 'en' }, reason: 'x', money: 'credits-niets' });
  ok('annuleringsmail EN "niets": de credits blijven gebruikt', /They stay used/.test(tekst(niets.html)), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
