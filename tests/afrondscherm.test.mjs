/**
 * Het afrondscherm en de toestemming — punten 3.05 en 10.05, 8 oktober 2026.
 *
 * Zonder server (node:sqlite met het echte schema.sql, dus ook migratie 0055).
 * Wat hier vastligt:
 *   · een afgeronde bestelling opent op de privélink met het afrondblok
 *     (#afgerond): de map met de bewaardatum bovenaan, het tevredenheidsblok
 *     eronder, het raster pas daarna; Studio heeft hetzelfde blok;
 *   · één toestemmingsblok (je tekst · je beelden, elk met merknaam / zonder /
 *     liever niet), "Liever niet" staat aan, draagfoto's nooit, intrekken kan;
 *     het oude losse vinkje is weg;
 *   · na het versturen staat de eigen tekst klaar om te kopiëren (alleen-lezen
 *     tekstvak), met de reviewknoppen — bij ELKE score, Trustpilot groot en
 *     Google als link (REVIEW_VOORKEUR, om te draaien);
 *   · intrekken zet alles op nee, haalt de goedkeuring eraf en mailt Lucas;
 *   · /admin/testimonials heeft het filter "mag getoond worden" en "ingetrokken";
 *   · /privacy noemt toestemming, draagfoto's en intrekken, in NL en EN.
 */
import { readFileSync } from 'node:fs';
import { feedbackBlock, handleFeedbackPost, saveScore, saveToestemming, loadFeedback } from '../src/lib/feedback.js';
import { REVIEW_PLATFORMS, REVIEW_VOORKEUR } from '../src/data/reviews.js';
import { portalGet, portalPost } from '../src/lib/portal.js';
import { adminGet } from '../src/lib/admin.js';
import { hashToken, mintToken } from '../src/lib/token.js';
import { TOESTEMMING_WEG_DAGEN, termijnInWoorden } from '../src/data/termijnen.js';
import { verseDb, d1 } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const mails = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('resend')) mails.push(JSON.parse(init?.body || '{}'));
  return new Response(JSON.stringify({ id: 'm' }), { status: 200, headers: { 'content-type': 'application/json' } });
};

console.log('\nVISUAILS — afrondscherm en toestemming (3.05, 10.05)\n');

/* ── 1 · HET BLOK ZELF ─────────────────────────────────────────────────────── */
{
  const voor = feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 5 } });
  ok('hoge score: één toestemmingsblok met twee groepen', (voor.match(/class="fb-toon-groep"/g) || []).length === 2);
  ok('  elk met merknaam / zonder / liever niet', ['toon_tekst', 'toon_beelden'].every((n) => ['merk', 'zonder', 'nee'].every((w) => voor.includes(`name="${n}" value="${w}"`))));
  ok('  "Liever niet" staat standaard aan, en alleen dat', (voor.match(/ checked>/g) || []).length === 2 && /value="nee" checked/.test(voor) && !/value="merk" checked|value="zonder" checked/.test(voor));
  ok('  draagfoto\'s nooit, intrekken in Studio of per mail, binnen de termijn', voor.includes('draagt, laten we nooit zien') && voor.includes('in VISUAILS Studio of met een mail') && voor.includes(`binnen ${termijnInWoorden(TOESTEMMING_WEG_DAGEN, 'nl')} van de site en social`));
  ok('  het oude losse vinkje is weg', !voor.includes('quote_consent'));
  ok('  geen script', !/<script/i.test(voor));
  const en = feedbackBlock({ lang: 'en', action: '/x', feedback: { score: 4 } });
  ok('EN: hetzelfde blok in het Engels', en.includes('May we show this on visuails.com and social?') && en.includes('Yes, without brand name') && en.includes('We never show photos of someone wearing your product'));

  const na = feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 5, testimonial_text: 'Snel en precies <goed>', toon_tekst: 'zonder', toon_beelden: 'merk', toestemming_at: '2026-10-08 10:00:00', testimonial_consent: 1 } });
  ok('na het versturen: de eigen tekst in een alleen-lezen tekstvak', /<textarea class="fb-kopie" readonly[^>]*>Snel en precies &lt;goed&gt;<\/textarea>/.test(na));
  ok('  met de vraag naar de plek die voorop staat en "kopieer hem gerust"', na.includes('<h4>Wil je dit ook op Trustpilot zetten?</h4>') && na.includes('Je tekst staat hieronder; kopieer hem gerust.') && !na.includes('Dank je.'));
  const groot = REVIEW_PLATFORMS.find((p) => p.id === REVIEW_VOORKEUR);
  ok(`  ${groot.name} is de grote knop, de andere een link`, na.indexOf(`value="${REVIEW_VOORKEUR}"`) < na.indexOf(`value="${REVIEW_PLATFORMS.find((p) => p.id !== REVIEW_VOORKEUR).id}"`)
    && /class="btn btn-primary" type="submit">Review op Trustpilot/.test(na) && /class="btn-quiet fb-link" type="submit">Of op Google/.test(na));
  ok('  wat er gekozen is, en een knop om in te trekken', na.includes('Je tekst: ja, zonder merknaam') && na.includes('Je beelden: ja, met merknaam') && na.includes('value="intrekken"'));
  ok('REVIEW_VOORKEUR staat in reviews.js en is één van de platformen', /export const REVIEW_VOORKEUR = 'trustpilot';/.test(lees('src/data/reviews.js')) && !!groot);
  ok('Trustpilot opent meteen het reviewscherm (/evaluate/)', groot.url === 'https://www.trustpilot.com/evaluate/visuails.com');

  /* Nooit filteren op score: bij een 1 en een 3 staan beide plekken er ook. */
  for (const score of [1, 3]) {
    const b = feedbackBlock({ lang: 'nl', action: '/x', feedback: { score, private_note: 'x' } });
    ok(`score ${score}: beide reviewplekken staan er`, b.includes('value="trustpilot"') && b.includes('value="google"'));
  }
  const oud = feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 5, testimonial_consent: 1 } });
  ok('een rij van vóór vandaag (het oude vinkje) telt als verstuurd', oud.includes('voordat we het plaatsen') && !oud.includes('name="toon_tekst"'));
}

/* ── 2 · OPSLAAN, INTREKKEN, DE MAIL AAN LUCAS ─────────────────────────────── */
{
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  ok('schema.sql laadt met migratie 0055', mislukt.length === 0, mislukt.join(' | '));
  db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'studio@voorbeeld-volt.nl', 'VOLT')");
  db.exec("INSERT INTO orders (id, ref, customer_id, service, status, email, lang, brand, closed_at) VALUES (7, 'VIS-TEST-0007', 1, 'catalog', 'delivered', 'studio@voorbeeld-volt.nl', 'nl', 'VOLT', '2026-10-08 10:00:00')");
  const env = { DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@visuails.com' };
  await saveScore(env, 7, 1, 5);
  const form = (o) => ({ get: (k) => (Object.prototype.hasOwnProperty.call(o, k) ? String(o[k]) : null) });
  await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'quote', quote: 'Precies wat we zochten', quote_name: 'VOLT', toon_tekst: 'merk', toon_beelden: 'zonder' }) });
  let rij = await loadFeedback(env, 7);
  ok('toestemming opgeslagen: tekst met merknaam, beelden zonder', rij.toon_tekst === 'merk' && rij.toon_beelden === 'zonder' && !!rij.toestemming_at);
  ok('  de tekst mag getoond worden: testimonial_consent = 1, naam erbij', rij.testimonial_consent === 1 && rij.testimonial_name === 'VOLT' && rij.testimonial_text === 'Precies wat we zochten');
  ok('  goedkeuren blijft een aparte stap', rij.testimonial_approved === 0);
  await saveToestemming(env, 7, { text: 'Anders', name: 'VOLT', toonTekst: 'zonder', toonBeelden: 'nee' });
  rij = await loadFeedback(env, 7);
  ok('"zonder merknaam": geen naam bewaard', rij.testimonial_name === null && rij.testimonial_consent === 1);
  await saveToestemming(env, 7, { text: 'Alleen voor jullie', name: 'VOLT', toonTekst: 'nee', toonBeelden: 'nee' });
  rij = await loadFeedback(env, 7);
  ok('"liever niet": de tekst blijft (om te kopiëren) maar mag nergens heen', rij.testimonial_text === 'Alleen voor jullie' && rij.testimonial_consent === 0);
  await saveToestemming(env, 7, { text: 'x', toonTekst: 'hack', toonBeelden: "merk'); DROP" });
  rij = await loadFeedback(env, 7);
  ok('een verzonnen waarde wordt "nee"', rij.toon_tekst === 'nee' && rij.toon_beelden === 'nee');

  await saveToestemming(env, 7, { text: 'Top', toonTekst: 'merk', toonBeelden: 'merk' });
  db.exec('UPDATE order_feedback SET testimonial_approved = 1 WHERE order_id = 7');
  const voorMails = mails.length;
  await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'intrekken' }) });
  rij = await loadFeedback(env, 7);
  ok('intrekken: alles op nee, goedkeuring eraf, datum gezet', rij.toon_tekst === 'nee' && rij.toon_beelden === 'nee' && rij.testimonial_consent === 0 && rij.testimonial_approved === 0 && !!rij.ingetrokken_at);
  const mail = mails[mails.length - 1];
  ok('  Lucas krijgt één mail: binnen de termijn weghalen', mails.length === voorMails + 1 && /^Toestemming ingetrokken bij VIS-TEST-0007/.test(mail?.subject || '') && (mail?.to === 'studio@visuails.com' || (Array.isArray(mail?.to) && mail.to.includes('studio@visuails.com'))));
  await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'intrekken' }) });
  ok('  nog een keer intrekken mailt niet opnieuw', mails.length === voorMails + 1);
  const na = feedbackBlock({ lang: 'nl', action: '/x', feedback: rij });
  ok('  het blok zegt dat het is ingetrokken, zonder intrekknop', na.includes('Je hebt je toestemming ingetrokken') && !na.includes('value="intrekken"'));
}

/* ── 3 · DE PRIVÉLINK: #afgerond ───────────────────────────────────────────── */
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'studio@voorbeeld-volt.nl', 'VOLT')");
  db.exec("INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, lang, brand, total_cents, payment_status, delivery_mailed_at, details_json) VALUES (1, 'VIS-TEST-3005', 1, 'catalog', 'delivered', 'unattended', 2, 'studio@voorbeeld-volt.nl', 'nl', 'VOLT', 9800, 'paid', datetime('now'), '{}')");
  db.exec("INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot) VALUES (1, 1, 'delivery', 'k1', 'b1.jpg', 1000, 'pending', 'p1', 'front'), (2, 1, 'delivery', 'k2', 'b2.jpg', 1000, 'pending', 'p2', 'front')");
  const token = mintToken();
  db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (1, ?)').run(await hashToken(token));
  const env = { DB: d1(db), RESEND_API_KEY: '', NOTIFY_EMAIL: '' };
  const ctx = (init) => ({ request: new Request(`https://visuails.com/o/${token}`, init), env, waitUntil() {} });
  const post = (velden) => portalPost(ctx({ method: 'POST', body: new URLSearchParams(velden) }));

  const r = await post({ action: 'approve-all', naar: 'afgerond' });
  ok('"Alles goed" → 303 naar #afgerond', r.status === 303 && /#afgerond$/.test(r.headers.get('location')));
  let html = await (await portalGet(ctx())).text();
  const blok = html.indexOf('id="afgerond"');
  ok('het afrondblok staat bovenaan: na het wat-nu-blok, vóór de feiten en het raster', blok > html.indexOf('class="nu"') && blok < html.indexOf('class="facts"') && blok < html.indexOf('class="work"'));
  ok('  eerst de map, dan het tevredenheidsblok', html.indexOf('class="folder"', blok) < html.indexOf('class="fb"', blok));
  ok('  de map noemt de bewaardatum', /class="folder-datum">Je beelden staan hier tot en met \d+ \w+\./.test(html));
  ok('  "hieronder" en niet "hierboven" (het raster staat er nu onder)', html.includes('voorbeeldweergaven') && html.includes('De foto&#39;s hieronder'));
  ok('  de map en de vraag staan er maar één keer', (html.match(/class="folder"/g) || []).length === 1 && (html.match(/id="fb-h"/g) || []).length === 1);
  const s = await post({ fb: 'score', score: '5' });
  ok('een score geven blijft op het afrondblok (#fb-h)', /#fb-h$/.test(s.headers.get('location')));
  await post({ fb: 'quote', quote: 'Mooie set', quote_name: 'VOLT', toon_tekst: 'merk', toon_beelden: 'merk' });
  html = await (await portalGet(ctx())).text();
  ok('na het versturen: de tekst om te kopiëren op de privélink', /<textarea class="fb-kopie" readonly[^>]*>Mooie set<\/textarea>/.test(html));
  ok('  geen script op de pagina', !/<script/i.test(html));
}

/* ── 4 · STUDIO ────────────────────────────────────────────────────────────── */
{
  const kaart = lees('src/components/studio/Bestelling.astro');
  ok('Studio: het afrondblok heet afgerond-<id> en draagt map én tevredenheid', /id=\{v\.afrondScherm \? `afgerond-\$\{v\.id\}`/.test(kaart) && kaart.indexOf('st-afrond') < kaart.indexOf('v.afrondScherm && v.feedbackHtml'));
  const acc = lees('src/lib/account.js');
  ok('Studio: "Alles goed" stuurt naar #afgerond-<id> als het daarmee af is', /#\$\{dicht \? 'afgerond' : 'order'\}-\$\{orderId\}/.test(acc));
  ok('Studio: na de tevredenheidsvraag terug naar het afrondblok', /seeOther\(`\$\{home\}\?order=\$\{orderId\}#afgerond-\$\{orderId\}`\)/.test(acc));
}

/* ── 5 · /admin: "MAG GETOOND WORDEN" ──────────────────────────────────────── */
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const adminToken = mintToken();
  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x')");
  db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(adminToken));
  db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'a@voorbeeld-volt.nl', 'VOLT'), (2, 'b@voorbeeld-noord.nl', 'NOORD')");
  db.exec("INSERT INTO orders (id, ref, customer_id, service, status, email, lang, brand) VALUES (1, 'VIS-JA-0001', 1, 'catalog', 'delivered', 'a@voorbeeld-volt.nl', 'nl', 'VOLT'), (2, 'VIS-WEG-0002', 2, 'lifestyle', 'delivered', 'b@voorbeeld-noord.nl', 'en', 'NOORD'), (3, 'VIS-NEE-0003', 2, 'catalog', 'delivered', 'b@voorbeeld-noord.nl', 'en', 'NOORD')");
  db.exec(`INSERT INTO order_feedback (order_id, customer_id, score, toon_tekst, toon_beelden, toestemming_at, ingetrokken_at) VALUES
    (1, 1, 5, 'nee', 'zonder', '2026-10-08 10:00:00', NULL),
    (2, 2, 5, 'nee', 'nee', '2026-10-07 10:00:00', '2026-10-08 09:00:00'),
    (3, 2, 4, 'nee', 'nee', '2026-10-08 10:00:00', NULL)`);
  const env = { DB: d1(db) };
  const haal = async (pad) => (await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} }));
  const res = await haal('/admin/testimonials?filter=toonbaar');
  const h = await res.text();
  ok('/admin/testimonials?filter=toonbaar: 200', res.status === 200, String(res.status));
  ok('  toont wie ja zei (beelden zonder merknaam)', h.includes('VIS-JA-0001') && h.includes('zonder merknaam'));
  ok('  niet wie liever niet zei, niet wie introk', !h.includes('VIS-NEE-0003') && !h.includes('VIS-WEG-0002'));
  ok('  en zegt dat er niets gepubliceerd wordt, en dat draagfoto\'s nooit mogen', h.includes('Er wordt niets gepubliceerd') && h.includes('Draagfoto'));
  const weg = await (await haal('/admin/testimonials?filter=ingetrokken')).text();
  ok('?filter=ingetrokken: wie introk, met de termijn', weg.includes('VIS-WEG-0002') && weg.includes(`binnen ${termijnInWoorden(TOESTEMMING_WEG_DAGEN, 'nl')}`));
  const alles = await (await haal('/admin/testimonials')).text();
  ok('de gewone lijst heeft de filterlinks', alles.includes('?filter=toonbaar') && alles.includes('Mag getoond worden (1)') && alles.includes('Ingetrokken (1)'));
}

/* ── 6 · PRIVACY EN MIGRATIE ───────────────────────────────────────────────── */
{
  for (const [p, re] of [['src/pages/privacy.astro', /Photos of someone wearing your product are never shown[\s\S]*withdraw your permission at any time, in VISUAILS Studio or with one email[\s\S]*TOESTEMMING_WEG_DAGEN/], ['src/pages/nl/privacy.astro', /Foto’s waarop iemand je product draagt, laten we nooit zien[\s\S]*intrekken, in VISUAILS Studio of met één mail[\s\S]*TOESTEMMING_WEG_DAGEN/]]) {
    ok(`${p}: toestemming, draagfoto's en intrekken`, re.test(lees(p)));
  }
  const mig = lees('migrations/0055-toestemming-tonen.sql').replace(/--.*$/gm, '');
  ok('migratie 0055: alleen ALTER … ADD COLUMN', (mig.match(/ALTER TABLE order_feedback ADD COLUMN/g) || []).length === 4 && !/DROP|DELETE|UPDATE|RENAME/i.test(mig));
  ok('schema.sql heeft dezelfde vier kolommen', ['toon_tekst', 'toon_beelden', 'toestemming_at', 'ingetrokken_at'].every((k) => lees('schema.sql').includes(`ALTER TABLE order_feedback ADD COLUMN ${k} TEXT`)));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
