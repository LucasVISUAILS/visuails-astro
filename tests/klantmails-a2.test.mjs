/* VISUAILS — ronde A2: "Zo gaat het verder", de klantmails en de studiomail.
 *   node tests/klantmails-a2.test.mjs          (geen server, geen browser)
 *
 * Punten 1.05, 7.01, 7.02, 7.07 en 9.07 (8 oktober 2026). De bedankpagina in
 * de browser staat in tests/bedankpagina-standen.test.mjs; deze toets doet de
 * rest, tegen het echte schema met een nep-Mollie en een nep-Resend:
 *
 *   1 · het blok "Zo gaat het verder" komt uit één bron (src/lib/verder.js) en
 *       staat op de vier plekken: bedankpagina, betaalmail, bestelmail en de
 *       bevestiging van een bestelling die met tegoed betaald is;
 *   2 · de bestelmail begint met "je bestelling staat erin" en "al betaald bij
 *       Mollie?", pas daarna de betaalknop (V17 = a);
 *   3 · de onderwerpen: de inlogcode erin (V21-2), "Je btw-gegevens zijn
 *       goedgekeurd — VIS-…"; de levermail met twee datums; de herinnering van
 *       dag 3 met beide datums; de mail van dag 7 bestaat niet meer (V21-3);
 *       de contactenregel alleen in de eerste mail aan een nieuw adres (V21-1);
 *   4 · de studiomail zonder fotobijlagen en zonder R2-lezen, met per product
 *       één regel, wat er ontbreekt en de knop "Open in /admin" (V20 = a).
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { zoGaatHetVerder, leverregel, stilteRegel, verderBlokHtml, leveringVan } from '../src/lib/verder.js';
import { customerEmail } from '../functions/api/order.js';
import { invoiceEmail } from '../src/lib/invoiceMail.js';
import { deliveryEmail } from '../src/lib/admin.js';
import { inlogOnderwerp } from '../src/lib/account.js';
import { stuurBetaallink } from '../src/lib/betaallink.js';
import { mailNote } from '../src/data/mailNote.js';
import { mintToken } from '../src/lib/token.js';
import { batchPrefix } from '../src/lib/uploads.js';
import { tasks } from '../cron/index.js';
import { DELIVERY_DAYS } from '../src/lib/retention.js';
import { REVISIE_DAGEN } from '../src/data/pricing.js';
import { datum } from '../src/lib/mailTemplate.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const gelijk = JSON.stringify(w) === JSON.stringify(v);
  if (gelijk) goed++; else fout++;
  console.log(`${gelijk ? '  ok ' : 'FAIL'}  ${naam}${gelijk ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/* HTML-entiteiten terug naar tekst, zodat een zin met een apostrof vergelijkbaar is. */
const tekst = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const bevat = (html, zin) => tekst(html).includes(tekst(zin));

const QUOTE = { products: 3, netCents: 26700, vatCents: 5607, grossCents: 32307 };
const PAY = 'https://visuails.com/api/order-pay?ref=VIS-TEST-0001&lang=nl';

console.log('\nVISUAILS — ronde A2: verder-blok, klantmails, studiomail\n');

/* ══ 1 · ÉÉN BRON, VIER PLEKKEN ════════════════════════════════════════════ */
console.log('1 · "Zo gaat het verder" op de vier plekken');
for (const lang of ['nl', 'en']) {
  const blok = (factuur, levering = { soort: 'zsm' }) => zoGaatHetVerder({ lang, levering, factuur });
  const heeftBlok = (html, b) => bevat(html, b.kop) && b.regels.every((r) => bevat(html, r));

  const besteld = customerEmail(lang, 'VIS-TEST-0001', 'catalog', 'Sanne', { tier: 'unattended', pay: PAY, quote: QUOTE });
  ok(`${lang} bestelmail: het blok, met "na de factuur"`, heeftBlok(besteld, blok('na-factuur')));

  const tegoed = customerEmail(lang, 'VIS-TEST-0002', 'catalog', 'Sanne', { tier: 'unattended', quote: QUOTE, tegoed: QUOTE.grossCents, betaaldMetTegoed: true });
  ok(`${lang} bevestiging met tegoed (zonder Mollie): het blok, "je factuur komt zo"`, heeftBlok(tegoed, blok('volgt')));

  const betaald = invoiceEmail({ lang, order: { ref: 'VIS-TEST-0003', service: 'catalog', name: 'Sanne' }, invoice: { number: 'VIS-2026-0001' }, snap: { netCents: 26700, vatCents: 5607 }, attached: true, link: 'https://visuails.com/o/abc' }).html;
  ok(`${lang} betaalmail: de knop "Bekijk je bestelling" naar de privélink`, betaald.includes('href="https://visuails.com/o/abc"') && tekst(betaald).includes(lang === 'nl' ? 'Bekijk je bestelling' : 'See your order'));
  ok(`${lang} betaalmail: het blok, "je krijgt weer een mail als…"`, heeftBlok(betaald, blok('bijgevoegd')));

  const metGat = invoiceEmail({ lang, order: { ref: 'VIS-TEST-0007', service: 'catalog' }, invoice: { number: 'VIS-2026-0002' }, snap: {}, attached: true, ontbreekt: ['Product 4 · Hoodie zwart: geen achterkant'] }).html;
  ok(`${lang} betaalmail: ontbrekende foto's worden genoemd`, tekst(metGat).includes('Product 4 · Hoodie zwart: geen achterkant'));
  const zonderGat = invoiceEmail({ lang, order: { ref: 'VIS-TEST-0008', service: 'catalog' }, invoice: { number: 'VIS-2026-0003' }, snap: {}, attached: true, ontbreekt: [] }).html;
  ok(`${lang} betaalmail: zonder gat (of onbekend) geen regel, ook geen "alles compleet"`, /ontbreken nog|still missing|compleet binnen|all complete/i.test(tekst(zonderGat)), false);

  const gedateerd = customerEmail(lang, 'VIS-TEST-0004', 'catalog', 'Sanne', { tier: 'attended', window: { start: '2026-10-14', end: '2026-10-15' }, pay: PAY, quote: { ...QUOTE, products: 12 } });
  ok(`${lang} bestelmail met datum: de gereserveerde dagen staan in het blok`, bevat(gedateerd, leverregel({ lang, levering: { soort: 'datum', van: '2026-10-14', tot: '2026-10-15' } })));

  const voorrang = customerEmail(lang, 'VIS-TEST-0005', 'catalog', 'Sanne', { tier: 'unattended', voorrang: true, pay: PAY, quote: QUOTE });
  ok(`${lang} bestelmail met voorrang: de voorrangsregel, niet "zo snel mogelijk"`, bevat(voorrang, leverregel({ lang, levering: { soort: 'voorrang' } })) && !bevat(voorrang, leverregel({ lang, levering: { soort: 'zsm' } })));

  const aanvraag = customerEmail(lang, 'VIS-TEST-0006', 'video', 'Sanne', { aanvraag: true, details: { request: 'video' } });
  ok(`${lang} een aanvraag krijgt het blok niet (er is nog geen levering)`, bevat(aanvraag, blok('na-factuur').kop), false);
}
{
  const ty = lees('src/components/ThankYouPage.astro');
  ok('bedankpagina: de tekst komt uit src/lib/verder.js', /from '\.\.\/lib\/verder\.js'/.test(ty) && /zoGaatHetVerder\(/.test(ty));
  ok('  en geen eigen getypte levertijd in het blok', /data-ty-verder[\s\S]{0,600}binnen een dag/.test(ty), false);
  ok('leveringVan: dagen > voorrang > datum volgt > zo snel mogelijk',
    [leveringVan({ window_start: '2026-10-14' }).soort, leveringVan({ details_json: '{"voorrang":"1"}' }).soort, leveringVan({ tier: 'attended' }).soort, leveringVan({}).soort],
    ['datum', 'voorrang', 'datum-volgt', 'zsm']);
  ok('geen termijn getypt in verder.js (de levertijd komt uit turnaround())', /binnen een dag|within a day/.test(lees('src/lib/verder.js').replace(/\/\*[\s\S]*?\*\//g, '')), false);
}

/* ══ 2 · DE BESTELMAIL BEGINT MET WAAR DE BESTELLING STAAT ═════════════════ */
console.log('\n2 · de bestelmail: eerst "staat erin", dan de betaalknop');
for (const [lang, erin, alBetaald] of [['nl', 'Je bestelling staat erin', 'Al betaald bij Mollie? Dan hoef je niets te doen'], ['en', 'Your order is in', 'Already paid at Mollie? Then there is nothing you need to do']]) {
  const m = customerEmail(lang, 'VIS-TEST-0010', 'catalog', 'Sanne', { tier: 'unattended', pay: PAY, quote: QUOTE });
  const t = tekst(m);
  ok(`${lang}: kop "${erin}"`, t.includes(erin));
  ok(`${lang}: "${alBetaald}" staat vóór de betaalknop`, t.indexOf(alBetaald) > -1 && t.indexOf(alBetaald) < m.indexOf(PAY.replace(/&/g, '&amp;')) && t.indexOf(alBetaald) < t.indexOf(lang === 'nl' ? 'Betaal je bestelling' : 'Pay for your order'));
  ok(`${lang}: de betaalknop staat er nog`, m.includes(PAY.replace(/&/g, '&amp;')));
  ok(`${lang}: de vragenregel onderaan`, (lang === 'nl' ? /Vragen\? Antwoord op deze mail of app ons ?\./ : /Questions\? Reply to this email or WhatsApp us ?\./).test(t));
  const review = customerEmail(lang, 'VIS-TEST-0011', 'catalog', 'Sanne', { tier: 'unattended', quote: QUOTE, inReview: true });
  ok(`${lang}: zonder betaallink (btw-controle) geen "al betaald bij Mollie"`, tekst(review).includes(alBetaald), false);
  ok(`${lang}: en dan in het blok "na je betaling de factuur"`, bevat(review, stilteRegel({ lang, factuur: 'na-betaling' })));
}

/* ══ 3 · ONDERWERPEN, DATUMS, DE MAIL VAN DAG 7, DE CONTACTENREGEL ═════════ */
console.log('\n3 · onderwerpen en datums');
ok('inlogmail NL: de code in het onderwerp', inlogOnderwerp('nl', '482913'), '482913 is je inlogcode voor VISUAILS');
ok('inlogmail EN: idem', inlogOnderwerp('en', '482913'), '482913 is your VISUAILS sign-in code');
ok('zonder code (migratie 0017 ontbreekt): de link', inlogOnderwerp('nl', null), 'Je inloglink voor VISUAILS');
ok('account.js gebruikt die functie voor het onderwerp', /subject: inlogOnderwerp\(lang, withCode \? code : null\)/.test(lees('src/lib/account.js')));

{
  const nu = new Date('2026-10-06T10:00:00Z');
  for (const lang of ['nl', 'en']) {
    const m = deliveryEmail({ order: { ref: 'VIS-TEST-0020', name: 'Sanne', lang, service: 'catalog' }, link: 'https://visuails.com/o/abc', n: 12, nu });
    const revisie = datum(new Date(nu.getTime() + REVISIE_DAGEN * 86400000).toISOString().slice(0, 10), lang);
    const bewaar = datum(new Date(nu.getTime() + DELIVERY_DAYS * 86400000).toISOString().slice(0, 10), lang);
    ok(`levermail ${lang}: de revisiedatum als datum (${revisie})`, tekst(m).includes(revisie));
    ok(`levermail ${lang}: de bewaardatum als datum (${bewaar})`, tekst(m).includes(bewaar));
    ok(`levermail ${lang}: geen "binnen ${DELIVERY_DAYS} dagen"`, /binnen \d+ dagen|within \d+ days/.test(tekst(m)), false);
    ok(`levermail ${lang}: geen contactenregel meer`, /orders@visuails\.com/.test(m), false);
  }
}

/* De btw-mail en de herinnering, tegen het echte schema. */
{
  const gezien = [];
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    gezien.push({ url: String(url), body: opts.body ? String(opts.body) : '' });
    return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.join(' | '));
  const env = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
  db.exec("INSERT INTO customers (id, email, brand, name, country) VALUES (1, 'studio@voorbeeld-volt.nl', 'VOLT', 'Mara', 'NL')");
  const rij = (id, ref, lang, extra = '') => db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, lang, name, brand, total_cents, vat_cents, vat_rate, payment_status, created_at${extra ? `, ${extra.split('=')[0]}` : ''})
    VALUES (${id}, '${ref}', 1, 'catalog', 'received', 'attended', 12, 'studio@voorbeeld-volt.nl', '${lang}', 'Mara', 'VOLT', 106800, 22428, 0.21, 'unpaid', '2026-10-06 10:00:00'${extra ? `, ${extra.split('=')[1]}` : ''})`);
  rij(1, 'VIS-BTW-0001', 'nl', "review_state='approved'");
  rij(2, 'VIS-BTW-0002', 'en', "review_state='approved'");
  db.exec("UPDATE orders SET reviewed_at = '2026-10-06 12:00:00' WHERE id IN (1, 2)");
  await stuurBetaallink(env, 1, { origin: 'https://visuails.com' });
  await stuurBetaallink(env, 2, { origin: 'https://visuails.com' });
  const [nl, en] = mails();
  ok('btw-mail NL: "Je btw-gegevens zijn goedgekeurd — VIS-…"', nl?.subject, 'Je btw-gegevens zijn goedgekeurd — VIS-BTW-0001');
  ok('btw-mail EN: idem', en?.subject, 'Your VAT details have been approved — VIS-BTW-0002');
  ok('  zonder contactenregel', /orders@visuails\.com/.test(nl?.html || ''), false);

  rij(3, 'VIS-HER-0003', 'nl', "window_start='2026-10-20'");
  db.exec("UPDATE orders SET window_end = '2026-10-21', window_expires_at = '2026-10-13 10:00:00' WHERE id = 3");
  const voor = mails().length;
  await stuurBetaallink(env, 3, { origin: 'https://visuails.com', herinnering: true });
  const her = mails()[voor];
  ok('herinnering dag 3: tot wanneer de leverdatum vaststaat (13 oktober)', /houden we vast tot <strong>13 oktober<\/strong>/.test(her?.html || ''));
  ok('  en wanneer de bestelling vervalt (20 oktober, VERVAL_DAG na het bestellen)', /vervalt de bestelling na <strong>20 oktober<\/strong>/.test(her?.html || ''));

  /* De mail van dag 7 is weg (V21-3 = a). */
  db.exec("UPDATE orders SET window_expires_at = datetime('now', '-1 hours') WHERE id = 3");
  const voorVrij = mails().length;
  const regel = await tasks.releaseExpiredWindows(env);
  ok('de vrijgave gebeurt nog', /VIS-HER-0003/.test(regel || ''));
  ok('  maar zonder mail aan de klant', mails().length, voorVrij);
  ok('  en de cron kent de mail niet meer', /leverdatum is vrijgegeven —|date has been released —/.test(lees('cron/index.js')), false);
  globalThis.fetch = echteFetch;
}

console.log('\n  de contactenregel (V21-1)');
ok('eerste bestelling op een adres: wel', /orders@visuails\.com/.test(customerEmail('nl', 'VIS-TEST-0030', 'catalog', 'Sanne', { pay: PAY, quote: QUOTE, nieuwAdres: true })));
ok('een volgende: niet', /orders@visuails\.com/.test(customerEmail('nl', 'VIS-TEST-0031', 'catalog', 'Sanne', { pay: PAY, quote: QUOTE, nieuwAdres: false })), false);
ok('betaalmail: niet', /orders@visuails\.com/.test(invoiceEmail({ lang: 'nl', order: { ref: 'VIS-X' }, invoice: { number: 'N-1' }, snap: {}, attached: true }).html), false);
ok('het scherm (bedankpagina, "kijk in je mail"): wel, NL en EN', /zet orders@visuails\.com in je contacten/.test(mailNote('nl')) && /add orders@visuails\.com to your contacts/.test(mailNote('en')));

/* ══ 4 · DE STUDIOMAIL EN DE BESTELMAIL, DOOR DE ECHTE ROUTE ═══════════════ */
console.log('\n4 · de studiomail zonder bijlagen (9.07), met de bestelmail ernaast');
{
  const gezien = [];
  const echteFetch = globalThis.fetch;
  let volg = 0;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    gezien.push({ url: u, body: opts.body ? String(opts.body) : '' });
    if (u.endsWith('/v2/payments')) {
      const id = `tr_${String(++volg).padStart(10, '0')}`;
      return new Response(JSON.stringify({ id, status: 'open', _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));
  const inhoud = new Map();
  let gelezen = 0;
  const bucket = {
    async put(key, body, o) { inhoud.set(key, { bytes: 1000, opts: o, body: typeof body === 'string' ? body : '' }); return { key }; },
    async get() { gelezen += 1; return { arrayBuffer: async () => new ArrayBuffer(1000) }; },
    async head(key) { return inhoud.has(key) ? {} : null; },
    async delete(key) { inhoud.delete(key); },
    async list({ prefix = '' } = {}) {
      return { objects: [...inhoud.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, size: v.bytes, customMetadata: v.opts?.customMetadata || {} })) };
    },
  };
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.join(' | '));
  const env = { DB: d1(db), UPLOADS: bucket, MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@visuails.com', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
  const { onRequestPost } = await import('../functions/api/order.js');

  const klaarzetten = () => {
    const batch = mintToken();
    const zet = (product, shot, naam) => inhoud.set(`${batchPrefix(batch)}${naam}`, { bytes: 2_000_000, opts: { customMetadata: { product, shot, original: naam } } });
    zet('p1', 'front', 'p1-voor.jpg'); zet('p1', 'back', 'p1-achter.jpg'); zet('p1', 'detail', 'p1-detail.jpg');
    zet('p1', 'ref1', 'p1-ref1.jpg'); zet('p1', 'ref2', 'p1-ref2.jpg');
    zet('p2', 'front', 'p2-voor.jpg'); zet('p2', 'detail', 'p2-detail.jpg');
    zet('p3', 'front', 'p3-voor.jpg'); zet('p3', 'back', 'p3-achter.jpg'); zet('p3', 'detail', 'p3-detail.jpg'); zet('p3', 'worn', 'p3-draag.jpg');
    return batch;
  };
  const bestel = async (email) => {
    const fd = new FormData();
    const velden = {
      service: 'catalog', products: '3', name: 'Sanne Voorbeeld', brand: 'VOORBEELD', email, phone: '+31 6 12345678',
      country: 'NL', address_line1: 'Voorbeeldstraat 1', postal_code: '1234 AB', city: 'Voorbeeldstad', lang: 'nl',
      style: 'classic', background: 'studio-white', product_p1: 'Hoodie zwart', product_p2: 'Shirt wit', product_p3: 'Jas groen',
      business_declaration: 'yes', business_version: 'v1', no_vat_number: '1', reg_number: '99999999',
      upload_batch: klaarzetten(), back: '/nl/thank-you',
    };
    for (const [k, v] of Object.entries(velden)) fd.append(k, v);
    return onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }), env, waitUntil: () => {} });
  };

  const res = await bestel('sanne@voorbeeld-kleding.nl');
  ok('de bestelling gaat door', [200, 302, 303].includes(res.status));
  const eerste = mails();
  const studio = eerste.find((m) => /Nieuwe bestelling/.test(m.subject || ''));
  const klant = eerste.find((m) => /We hebben je bestelling/.test(m.subject || ''));
  ok('er is een studiomail', !!studio);
  ok('  zonder bijlagen', !studio?.attachments || studio.attachments.length === 0);
  ok('  en zonder één foto uit R2 te lezen', gelezen, 0);
  const s = tekst(studio?.html || '');
  const orderId = db.prepare("SELECT id FROM orders WHERE email = 'sanne@voorbeeld-kleding.nl'").get()?.id;
  ok('  met de knop "Open in /admin" naar de bestelling', (studio?.html || '').includes(`/admin/orders/${orderId}/files`) && s.includes('Open in /admin'));
  ok('  kenmerk, dienst, aantal en bedrag', /Referentie VIS-/.test(s) && /Dienst Catalog/.test(s) && /Aantal 3 producten/.test(s) && /Bedrag € /.test(s));
  ok('  per product één regel: "p1 Hoodie zwart · voorkant, achterkant, detail · 2 referenties"', s.includes('p1 Hoodie zwart · voorkant, achterkant, detail · 2 referenties'));
  ok('  p3 met de draagfoto erbij', s.includes('p3 Jas groen · voorkant, achterkant, detail, gedragen'));
  ok('  wat ontbreekt: "Product 2 · Shirt wit: geen achterkant"', s.includes('Wat ontbreekt') && s.includes('Product 2 · Shirt wit: geen achterkant'));
  ok('  geen bestandstabel met R2-sleutels meer', /alleen R2|als bijlage in deze mail/.test(s), false);

  /* ── DOORLOOP 27 (B04): DE BEVESTIGING WACHT OP DE BETAALSTATUS ──────────
     Deze klant gaat meteen naar Mollie. De bevestiging gaat dan niet nu uit,
     maar staat in R2 (mail-uitgesteld/<ref>.json): de webhook stuurt hem bij
     mislukt/afgebroken/verlopen, en bij betaald krijgt de factuurmail het
     overzicht. */
  const ref1 = db.prepare("SELECT ref FROM orders WHERE email = 'sanne@voorbeeld-kleding.nl'").get()?.ref;
  ok('de bestelmail gaat niet meteen uit (de klant zit aan de kassa)', !!klant, false);
  const bewaard = (ref) => { const r = inhoud.get(`mail-uitgesteld/${ref}.json`); return r ? JSON.parse(r.body || 'null') : null; };
  const b1 = bewaard(ref1);
  ok('  maar staat klaar in R2, voor de webhook', !!b1 && b1.to === 'sanne@voorbeeld-kleding.nl' && /We hebben je bestelling/.test(b1.subject));
  ok('  de bewaarde mail: "Je bestelling staat erin"', tekst(b1?.html || '').includes('Je bestelling staat erin'));
  ok('    zegt dat de betaling nog niet gelukt is (niet "al betaald?")', tekst(b1?.html || '').includes('De betaling is nog niet gelukt') && !tekst(b1?.html || '').includes('Al betaald bij Mollie'));
  ok('    met "Zo gaat het verder"', tekst(b1?.html || '').includes('Zo gaat het verder'));
  ok('    en, bij de eerste bestelling op dit adres, de contactenregel', /orders@visuails\.com in je contacten/.test(b1?.html || ''));
  ok('  en het overzicht voor de betaalmail ("Wat je bestelde")', tekst(b1?.samenvatting || '').includes('Wat je bestelde') && tekst(b1?.samenvatting || '').includes('Catalog'));
  ok('  nieuwAdres reist mee', b1?.nieuwAdres, true);

  const voor = mails().length;
  await bestel('sanne@voorbeeld-kleding.nl');
  const ref2 = db.prepare("SELECT ref FROM orders WHERE email = 'sanne@voorbeeld-kleding.nl' ORDER BY id DESC LIMIT 1").get()?.ref;
  const tweede = bewaard(ref2);
  ok('  bij de tweede bestelling op hetzelfde adres niet meer', /orders@visuails\.com in je contacten/.test(tweede?.html || ''), false);
  ok('  en ook die tweede ging niet meteen uit', mails().slice(voor).some((m) => /We hebben je bestelling/.test(m.subject || '')), false);
  ok('order.js leest geen foto’s meer voor de mail', /packAttachments\(|MAIL_ATTACH_MAX/.test(lees('functions/api/order.js').replace(/\/\*[\s\S]*?\*\//g, '')), false);
  globalThis.fetch = echteFetch;
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
