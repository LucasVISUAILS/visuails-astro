/* VISUAILS — ronde 91 (K-10), 9 november 2026: afronden met één vaste mail.
 * Lucas koos in lijst 85 (A6 = goed): bij afronden (alles goedgekeurd, of stil na de
 * revisietermijn) één mail "Je bestelling is afgerond", met tot wanneer hij kan
 * downloaden en de knoppen voor Google en Trustpilot. Eenmalig, niet gefilterd op
 * score; de WhatsApp-reviewknop in /admin blijft.
 *
 * Echte SQLite (tests/lib/d1sqlite.mjs) met schema.sql, nep-Resend.
 *   node tests/blind91-k-afrondmail.test.mjs
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { maybeCloseOrder, rondStilAf, heropenBestelling } from '../src/lib/close.js';
import { afrondEmail, mailAfgerond, AFROND_MAIL_NOTITIE } from '../src/lib/afrondMail.js';
import { REVIEW_PLATFORMS } from '../src/data/reviews.js';
import { leverDatumsVan } from '../src/lib/leverdatums.js';
import { datum } from '../src/lib/mailTemplate.js';
import { REVISIE_DAGEN } from '../src/data/pricing.js';
import { htmlToText } from '../src/lib/mail.js';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };

const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return new Response('{"id":"msg_test"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
const env = { DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@voorbeeld.test', PUBLIC_ORIGIN: 'https://visuails.com' };
const dagenTerug = (n) => db.prepare(`SELECT datetime(date('now', '-${n} days'), '+12 hours') AS t`).get().t;

let volg = 0;
function bestelling(ref, { service = 'catalog', lang = 'nl', gemaild = 2, review = 'approved' } = {}) {
  const id = ++volg;
  db.prepare(`INSERT INTO orders (id, ref, service, status, email, name, lang, payment_status, total_cents, delivered_at, delivery_mailed_at)
              VALUES (?, ?, ?, 'delivered', ?, 'Sanne Test', ?, 'paid', 4900, ?, ?)`)
    .run(id, ref, service, `${ref.toLowerCase()}@voorbeeld.test`, lang, dagenTerug(gemaild), dagenTerug(gemaild));
  db.prepare("INSERT INTO files (order_id, kind, r2_key, review_state, created_at) VALUES (?, 'delivery', ?, ?, ?)").run(id, `lever/${ref}/1.jpg`, review, dagenTerug(gemaild));
  return id;
}
const aan = (ref) => mails.filter((m) => JSON.stringify(m.to || '').includes(`${ref.toLowerCase()}@voorbeeld.test`));

console.log('1 · de mail zelf');
{
  const order = { ref: 'VIS-TEST-0001', name: 'Sanne Test', delivery_mailed_at: '2026-08-09 10:00:00' };
  const nl = afrondEmail({ lang: 'nl', order, link: 'https://visuails.com/o/abc', reden: 'goedgekeurd' });
  const en = afrondEmail({ lang: 'en', order, link: 'https://visuails.com/o/abc', reden: 'stil' });
  ok('NL-onderwerp "Je bestelling is afgerond — <kenmerk>"', nl.subject === 'Je bestelling is afgerond — VIS-TEST-0001', nl.subject);
  ok('EN-onderwerp "Your order is complete — <ref>"', en.subject === 'Your order is complete — VIS-TEST-0001', en.subject);
  const tot = datum(leverDatumsVan(order).bewaarTot, 'nl');
  ok(`tot wanneer hij kan downloaden (${tot}, dezelfde datum als de levermail)`, nl.html.includes(`tot en met <strong>${tot}</strong>`));
  for (const pl of REVIEW_PLATFORMS) {
    const href = pl.inviteUrl || pl.url;
    ok(`de knop voor ${pl.name}, met de link uit src/data/reviews.js`, nl.html.includes(`href="${href}"`) && nl.html.includes(`Review op ${pl.name}`) && en.html.includes(`Review on ${pl.name}`));
  }
  ok('de link naar de bestelpagina', nl.html.includes('href="https://visuails.com/o/abc"') && /Naar je bestelpagina/.test(nl.html));
  ok('bij stil afronden zegt hij waarom', /Your revision period has ended/.test(en.html));
  ok('geen bedrag en geen score in de mail', !/€|\bscore\b/i.test(htmlToText(nl.html)));
  const bron = readFileSync(new URL('../src/lib/afrondMail.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok('niet gefilterd op score (de code leest geen order_feedback)', !/order_feedback|score/.test(bron));
}

console.log('\n2 · alles goedgekeurd → één mail');
{
  const id = bestelling('VIS-GOED-0001');
  const af = await maybeCloseOrder(env, id);
  ok('de bestelling is afgerond', af === true && !!db.prepare('SELECT closed_at FROM orders WHERE id = ?').get(id).closed_at);
  const m = aan('VIS-GOED-0001');
  ok('de klant kreeg precies één mail: "Je bestelling is afgerond"', m.length === 1 && m[0].subject === 'Je bestelling is afgerond — VIS-GOED-0001', JSON.stringify(m.map((x) => x.subject)));
  ok('  met een werkende link naar zijn bestelpagina (een nieuw token)', /https:\/\/visuails\.com\/o\/[A-Za-z0-9_-]{43}/.test(m[0]?.html || '') && telling(db, 'SELECT COUNT(*) FROM order_tokens WHERE order_id = ?', id) === 1);
  ok('  en de interne regel die hem eenmalig maakt (niet op de tijdlijn van de klant)', telling(db, "SELECT COUNT(*) FROM order_events WHERE order_id = ? AND note = ? AND actor = 'intern'", id, AFROND_MAIL_NOTITIE) === 1);

  /* Weer openen en opnieuw afronden: geen tweede mail. */
  const h = await heropenBestelling(env, id);
  await maybeCloseOrder(env, id);
  ok('weer openen en opnieuw afronden: geen tweede mail (eenmalig)', h.ok && aan('VIS-GOED-0001').length === 1);
  ok('  en een losse tweede aanroep ook niet', (await mailAfgerond(env, id)) === false && aan('VIS-GOED-0001').length === 1);
}

console.log('\n3 · stil afgerond na de revisietermijn → dezelfde mail');
{
  const id = bestelling('VIS-STIL-0001', { gemaild: REVISIE_DAGEN + 1, review: 'pending', lang: 'en' });
  ok('rondStilAf rondt af', (await rondStilAf(env, id)) === true);
  const m = aan('VIS-STIL-0001');
  ok('de klant kreeg één mail, in zijn taal', m.length === 1 && m[0].subject === 'Your order is complete — VIS-STIL-0001', JSON.stringify(m.map((x) => x.subject)));
  ok('  die zegt dat de revisietermijn voorbij is', /revision period has ended/.test(m[0]?.html || ''));
}

console.log('\n4 · niet bij de €1-proef');
{
  const id = bestelling('VIS-PROEF-0001', { service: 'test-sample', review: 'pending' });
  ok('de proef rondt af bij levering', (await maybeCloseOrder(env, id)) === true);
  ok('  zonder afrondmail (de levermail van de proef zegt het al)', aan('VIS-PROEF-0001').length === 0);
}

console.log('\n5 · een mislukte mail laat het afronden staan en kan later nog');
{
  const echt = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"message":"stuk"}', { status: 500 });
  const id = bestelling('VIS-STUK-0001');
  const af = await maybeCloseOrder(env, id);
  globalThis.fetch = echt;
  ok('afgerond, ook al ging de mail mis', af === true && !!db.prepare('SELECT closed_at FROM orders WHERE id = ?').get(id).closed_at);
  ok('  en de claim is weer weg', telling(db, 'SELECT COUNT(*) FROM order_events WHERE order_id = ? AND note = ?', id, AFROND_MAIL_NOTITIE) === 0);
  ok('  zodat hij later alsnog kan', (await mailAfgerond(env, id)) === true && aan('VIS-STUK-0001').length === 1);
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
