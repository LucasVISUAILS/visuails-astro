/*
 * LEVERING 119 · DE ACHTERKANT EN DE MAILS (bouwer C2)
 * 18 november 2026
 *
 *   node tests/levering-119-achterkant.test.mjs        (geen build nodig)
 *
 * Echte SQLite (schema.sql), nep-Mollie, nep-Resend, nep-R2, de echte /api/order, de echte webhook en de echte
 * nachttaken (cron/index.js `tasks`).
 *   W2-07  de melding "Nieuwe bestelling": de opbouw als tabel, geen "[object Object]";
 *   W2-09  VOORRANG in het onderwerp; bij "Betaald" met dag en uur;
 *   W2-11  de mail "in nakijken" noemt het bedrag en spreekt zichzelf niet tegen;
 *   W2-12  een aanvraag: de klant krijgt zijn brief terug, de melding toont gewone woorden;
 *   P9-05  één zin over het delen van de link;
 *   W2-06  de betaalmail na een eerst mislukte betaling heeft "Wat je bestelde";
 *   L-13   het merkmodel met het kenmerk bij Mollie;
 *   P5-15  een abonnement met verlegde btw: geen iDEAL bij de eerste betaling;
 *   P3-07  feestdagen standaard dicht in de agenda, met een uitzondering;
 *   B1-13  de verval- en annuleringsmail zeggen wat er met de foto's gebeurt;
 *   P1-12  de vervalmail van een proef gaat over de proef en stuurt naar /test-sample/;
 *   P5-14  "de enige herinnering voor deze credits", en eerlijk bij een jaar zonder bestelling;
 *   P8-09  de rekennoot in pricing.js klopt;
 *   P6-24  voorrang noemt geen clips zolang video op aanvraag is.
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 119 (C2): de achterkant en de mails\n');

const betalingen = new Map();
const mollieBodies = [];
const mails = [];
let volg = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const methode = String(opts.method || 'GET').toUpperCase();
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && methode === 'POST') {
    const p = JSON.parse(String(opts.body));
    mollieBodies.push(p);
    const id = `tr_${String(++volg).padStart(10, '0')}`;
    const rec = { id, mode: 'test', status: 'open', amount: p.amount, description: p.description, metadata: p.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
    betalingen.set(id, rec);
    return json(rec, 201);
  }
  const m = u.match(/\/v2\/payments\/(tr_[0-9a-zA-Z]+)$/);
  if (m) return betalingen.has(m[1]) ? json(betalingen.get(m[1])) : json({ status: 404 }, 404);
  if (u.includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return json({ id: 'msg_test' });
};
const stil = () => { const l = console.log, e = console.error, w = console.warn; console.log = console.error = console.warn = () => {}; return () => { console.log = l; console.error = e; console.warn = w; }; };

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
const emmer = new Map();
const env = {
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test',
  FROM_EMAIL: 'VISUAILS <orders@voorbeeld.test>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db),
  UPLOADS: {
    async put(k, b) { emmer.set(k, b); },
    async get(k) { return emmer.has(k) ? { body: emmer.get(k), text: async () => String(emmer.get(k)) } : null; },
    async delete(k) { emmer.delete(k); }, async head() { return null; }, async list() { return { objects: [] }; },
  },
};
const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
const { onRequestPost: webhookPost } = await import('../functions/api/webhook/mollie.js');
const { onRequestGet: betaalGet } = await import('../functions/api/order-pay.js');
const { uitgesteldSleutel, leesUitgesteld, stuurUitgesteld } = await import('../src/lib/uitgesteld.js');
const { voorrangStudio, voorrangKort } = await import('../src/lib/notify.js');
const P = await import('../src/data/pricing.js');
const { DEEL_ZIN } = await import('../src/lib/deelLink.js');

let ip = 1;
async function bestel(velden) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) if (v !== undefined) fd.append(k, v);
  const terug = stil();
  try {
    const res = await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.119.1.${ip++}` } }), env, waitUntil: () => {} });
    return await res.json().catch(() => ({}));
  } finally { terug(); }
}
const basis = (email, extra = {}) => ({
  service: 'catalog', products: '2', first_name: 'Testa', last_name: 'Proef', brand: 'PROEFMERK', email, phone: '+31 6 12345678',
  country: 'NL', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes',
  style: 'classic', background: 'studio-white',
  business_version: 'v1', no_vat_number: '1', reg_number: '12345678', product_p1: 'Product 1', product_p2: 'Product 2', mode: 'json', ...extra,
});
async function webhook(id, status) {
  const b = betalingen.get(id);
  b.status = status;
  if (status === 'paid') { b.method = 'ideal'; b.paidAt = new Date().toISOString(); }
  const fd = new FormData(); fd.append('id', id);
  const terug = stil();
  try { return await webhookPost({ request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: fd }), env, waitUntil: () => {} }); } finally { terug(); }
}
const betalingVan = (ref) => [...betalingen.values()].filter((b) => b.metadata?.order_ref === ref).map((b) => b.id).pop();
async function opnieuwBetalen(ref) {
  const terug = stil();
  try { return await betaalGet({ request: new Request(`https://visuails.com/api/order-pay?ref=${encodeURIComponent(ref)}&lang=nl`, { headers: { 'cf-connecting-ip': `10.119.2.${ip++}` } }), env, waitUntil: () => {} }); } finally { terug(); }
}
const naar = (adres) => (m) => (Array.isArray(m.to) ? m.to.includes(adres) : String(m.to) === adres);
const studioMail = (ref, woord = '') => mails.filter((m) => naar('studio@voorbeeld.test')(m) && String(m.subject || '').includes(ref) && String(m.subject || '').includes(woord)).pop();
const klantMail = (adres) => mails.filter(naar(adres)).pop();

/* ── W2-07 ──────────────────────────────────────────────────────────────── */
console.log('W2-07 · de opbouw in de melding');
{
  const b = await bestel(basis('opbouw@voorbeeldmerk.test', { 'angle_three-quarter': '1', extra_slots: 'extra1:three-quarter' }));
  const m = studioMail(b.ref, 'Nieuwe bestelling');
  ok('er is een melding', !!m, mails.map((x) => x.subject).join(' | ').slice(0, 200));
  ok('geen "[object Object]" in html of tekst', !/\[object Object\]/.test(`${m?.html || ''}${m?.text || ''}`));
  ok('de tabel "Opbouw van het bedrag" staat erin', /Opbouw van het bedrag/.test(m?.html || ''));
  const d = JSON.parse(db.prepare('SELECT details_json FROM orders WHERE ref = ?').get(b.ref).details_json);
  const html = m?.html || '';
  ok('met een regel per opbouwregel (producten en extra hoeken)', Array.isArray(d.opbouw) && d.opbouw.length >= 2 && /per product/.test(html) && /Extra hoek/.test(html), JSON.stringify(d.opbouw));
  ok('  boven de veldenlijst', html.indexOf('Opbouw van het bedrag') > 0 && html.indexOf('Opbouw van het bedrag') < html.lastIndexOf('product_p1'));
  ok('  en de veldenlijst heeft geen rij "opbouw" meer', !/>opbouw</.test(html));
}

/* ── P9-05 ──────────────────────────────────────────────────────────────── */
console.log('\nP9-05 · één zin over het delen van de link');
{
  const k = klantMail('opbouw@voorbeeldmerk.test') || mails.find(naar('opbouw@voorbeeldmerk.test'));
  const bewaard = [...emmer.entries()].filter(([key]) => key.startsWith('mail-uitgesteld/')).map(([, v]) => String(v)).join(' ');
  const tekst = `${k?.html || ''} ${bewaard}`;
  ok('de bevestiging gebruikt de ene zin', tekst.includes(DEEL_ZIN.nl), (k?.subject || 'geen klantmail'));
  ok('en niet meer "de sleutel tot je bestelling"', !/sleutel tot je bestelling/.test(lees('functions/api/order.js')));
  ok('de zin zegt zien én goedkeuren, en aan wie', /zien en goedkeuren/.test(DEEL_ZIN.nl) && /see and approve/.test(DEEL_ZIN.en));
}

/* ── W2-09 ──────────────────────────────────────────────────────────────── */
console.log('\nW2-09 · voorrang in het onderwerp');
{
  const b = await bestel(basis('voorrang@voorbeeldmerk.test', { voorrang: '1' }));
  const m = studioMail(b.ref, 'Nieuwe bestelling');
  ok('melding: "VOORRANG · " in het onderwerp', /VOORRANG · Nieuwe bestelling/.test(m?.subject || ''), m?.subject);
  const gewoon = studioMail(mails.length ? (db.prepare("SELECT ref FROM orders WHERE email = 'opbouw@voorbeeldmerk.test'").get() || {}).ref : '', 'Nieuwe bestelling');
  ok('een gewone bestelling niet', !/VOORRANG/.test(gewoon?.subject || ''), gewoon?.subject);
  /* Betaald: de termijn staat vast. Zonder foto's wacht hij op de foto's (levering 118, L-16). */
  await webhook(betalingVan(b.ref), 'paid');
  const p = studioMail(b.ref, 'Betaald');
  ok('"Betaald" zonder foto\'s: VOORRANG, termijn loopt zodra de foto\'s compleet zijn', /^VOORRANG \(loopt zodra de foto’s compleet zijn\) · Betaald · /.test(p?.subject || ''), p?.subject);
  ok('  en een rij "Voorrang" met de toeslag', /Voorrang/.test(p?.html || '') && /toeslag € \d/.test(p?.html || ''));
  /* Met alle foto's: de dag en het uur uit dezelfde som als /admin. */
  const o = { service: 'catalog', paid_at: '2026-11-17 09:00:00', payment_status: 'paid', details_json: JSON.stringify({ voorrang: '1', opbouw: [{ soort: 'voorrang', qty: 1, unitCents: 10400, totalCents: 10400 }] }) };
  const v = voorrangStudio(o);
  ok('betaald di 17 nov 10:00 (NL): "VOORRANG tot wo 18 nov 17:00 · "', v?.onderwerp === 'VOORRANG tot wo 18 nov 17:00 · ', v?.onderwerp);
  ok('  met de toeslag', /uiterlijk wo 18 nov 17:00 \(Nederlandse tijd\) · toeslag € 104,00 excl\. btw/.test(v?.regel || ''), v?.regel);
  ok('zelfde dag als voorrangDeadline()', voorrangKort(P.voorrangDeadline('2026-11-17 09:00:00')) === 'wo 18 nov 17:00');
  ok('over het weekend: vr 20 nov na 15:00 → di 24 nov', voorrangKort(P.voorrangDeadline('2026-11-20 15:30:00')) === 'di 24 nov 17:00', voorrangKort(P.voorrangDeadline('2026-11-20 15:30:00')));
  ok('een proef heeft nooit voorrang', voorrangStudio({ ...o, service: 'test-sample' }) === null);
  ok('zonder voorrang geen voorvoegsel', voorrangStudio({ ...o, details_json: '{}' }) === null);
}

/* ── W2-11 ──────────────────────────────────────────────────────────────── */
console.log('\nW2-11 · de mail "in nakijken"');
{
  const adres = 'nakijk@voorbeeldmerk.test';
  const b = await bestel(basis(adres, { service: 'lifestyle', style: 'dunes', country: 'BE', postal_code: '1000', reg_number: '', vat: '' }));
  const rij = db.prepare('SELECT review_state, total_cents FROM orders WHERE ref = ?').get(b.ref);
  const k = klantMail(adres);
  ok('de bestelling staat op nakijken', rij?.review_state === 'pending', JSON.stringify(rij));
  const bedrag = P.euro(rij.total_cents / 100, 'nl');
  ok('een rij "Bedrag" met het netto bedrag en "btw volgt na controle"', /Bedrag/.test(k?.html || '') && /excl\. btw \(btw volgt na controle\)/.test(k?.html || ''), k?.subject);
  ok('  het bedrag klopt met de bestelling', (k?.html || '').includes(`€ ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(rij.total_cents / 100)}`), bedrag);
  ok('niet meer "Je hoeft zelf niets te doen"', !/Je hoeft zelf niets te doen/.test(k?.html || ''));
  ok('wel "Voor de betaling hoef je niets te doen; zet intussen je foto’s klaar"', /Voor de betaling hoef je niets te doen; zet intussen je foto’s klaar\./.test(k?.html || ''));
  const bron = lees('functions/api/order.js');
  ok('ook in het Engels', /Nothing is needed from you for the payment\$\{fotos \|\| ontbreekt \? '; in the meantime, get your photos ready' : ''\}/.test(bron) && /excl\. VAT \(VAT follows after the check\)/.test(bron));
  /* W2-06: deze bevestiging ging meteen; het overzicht blijft bewaard voor de betaalmail. */
  const bewaard = await leesUitgesteld(env, b.ref);
  ok('W2-06: het overzicht is bewaard voor de betaalmail (alleen overzicht)', !!bewaard?.alVerstuurd && /Wat je bestelde/.test(bewaard?.samenvatting || ''));
  ok('  zonder de nakijkregel "btw volgt na controle"', !/btw volgt na controle/.test(bewaard?.samenvatting || ''));
  const terug = stil();
  const tweede = await stuurUitgesteld(env, b.ref);
  terug();
  ok('  en het wordt nooit een tweede bevestiging', tweede === false && !!(await leesUitgesteld(env, b.ref)));
}

/* ── W2-06 ──────────────────────────────────────────────────────────────── */
console.log('\nW2-06 · betaalmail na een tweede poging');
{
  const adres = 'tweede@voorbeeldmerk.test';
  const b = await bestel(basis(adres));
  await webhook(betalingVan(b.ref), 'failed');
  const niet = mails.filter(naar(adres)).find((m) => /^Nog niet betaald/.test(m.subject || ''));
  ok('na "mislukt": de mail "Nog niet betaald"', !!niet, mails.filter(naar(adres)).map((m) => m.subject).join(' | '));
  const bewaard = JSON.parse(String(emmer.get(uitgesteldSleutel(b.ref)) || 'null'));
  ok('  daarna staat alleen het overzicht nog in R2', !!bewaard?.alVerstuurd && !bewaard?.html && !bewaard?.to);
  await webhook(betalingVan(b.ref), 'failed');
  ok('  een tweede mislukking geeft geen tweede mail', mails.filter(naar(adres)).filter((m) => /^Nog niet betaald/.test(m.subject || '')).length === 1);
  const r = await opnieuwBetalen(b.ref);
  ok('opnieuw betalen: een nieuwe Mollie-betaling', r.status >= 300 && r.status < 400 && betalingVan(b.ref), String(r.status));
  await webhook(betalingVan(b.ref), 'paid');
  const betaald = mails.filter(naar(adres)).find((m) => /^Betaling ontvangen/.test(m.subject || ''));
  ok('de betaalmail heeft "Wat je bestelde"', /Wat je bestelde/.test(betaald?.html || ''), betaald?.subject || 'geen betaalmail');
  ok('  en daarna is het overzicht weg', !emmer.has(uitgesteldSleutel(b.ref)));
  /* Direct betaald blijft zoals het was. */
  const adres2 = 'direct@voorbeeldmerk.test';
  const b2 = await bestel(basis(adres2));
  await webhook(betalingVan(b2.ref), 'paid');
  const d2 = mails.filter(naar(adres2));
  ok('direct betaald: één mail, met "Wat je bestelde"', d2.length === 1 && /Wat je bestelde/.test(d2[0].html || ''), d2.map((m) => m.subject).join(' | '));
}

/* ── W2-12 ──────────────────────────────────────────────────────────────── */
console.log('\nW2-12 · een aanvraag: de brief terug, gewone woorden in de melding');
{
  const adres = 'fatima@voorbeeldmerk.test';
  const b = await bestel({
    service: 'custom', request: 'custom-look', first_name: 'Fatima', last_name: 'Test', brand: 'PROEFMERK', email: adres,
    phone: '+31 6 12345678', country: 'NL', lang: 'nl', mode: 'json',
    look_concept: 'us', look_service: 'both', look_world: 'Een zomeravond op een dak.\nWarm licht.', look_references: 'https://voorbeeld.test/a',
    look_avoid: 'Studio-wit', look_products: '10-19', look_when: 'month', message: 'Graag snel.',
  });
  const k = klantMail(adres);
  const s = studioMail(b.ref || 'VIS-', 'Nieuwe aanvraag');
  ok('er is een klantmail en een melding', !!k && !!s, `${k?.subject} | ${s?.subject} | ${JSON.stringify(b).slice(0, 120)}`);
  ok('klant: het blok "Wat je ons vroeg"', /Wat je ons vroeg/.test(k?.html || ''));
  ok('  met de woorden van het formulier', /Bedenk het voor ons/.test(k?.html || '') && /Allebei/.test(k?.html || '') && /10 tot 19/.test(k?.html || '') && /Binnen een maand/.test(k?.html || ''));
  /* levering 119 (18 november 2026, hersteller H10, besluit Lucas o04): vrije tekst en links gaan niet meer terug naar de
     klant; deze regel pinde het oude gedrag ("de wereld met zijn regels" in de klantmail). Nu staan ze alleen in de melding. */
  ok('  zonder de wereld, de link en het bericht (o04)', !/zomeravond|voorbeeld\.test\/a|Studio-wit|Graag snel/.test(k?.html || ''));
  ok('  die staan wel in de melding aan Lucas', /zomeravond/.test(s?.html || '') && /voorbeeld\.test\/a/.test(s?.html || ''));
  ok('  de link heet "je aanvraag" en niet "de sleutel tot je bestelling"', /Iedereen met deze link kan je aanvraag zien/.test(k?.html || '') && !/sleutel tot je bestelling/.test(k?.html || ''));
  ok('melding: gewone woorden', /Wij bedenken het concept/.test(s?.html || '') && /Kiesbaar bij/.test(s?.html || '') && /10 tot 19/.test(s?.html || '') && /Binnen een maand/.test(s?.html || ''));
  ok('  geen codes meer', !/look_concept|look_service|look_products|look_when/.test(s?.html || ''));
}

/* ── L-13 ───────────────────────────────────────────────────────────────── */
console.log('\nL-13 · het merkmodel met kenmerk bij Mollie');
{
  const { paymentDescription } = await import('../src/lib/quote.js');
  ok('NL: "VISUAILS merkmodel VIS-…"', paymentDescription({ service: 'brand-model', products: 1, ref: 'VIS-TEST-001' }, 'nl') === 'VISUAILS merkmodel VIS-TEST-001');
  ok('EN: "VISUAILS Brand Model VIS-…"', paymentDescription({ service: 'brand-model', products: 1, ref: 'VIS-TEST-001' }, 'en') === 'VISUAILS Brand Model VIS-TEST-001');
  ok('zonder kenmerk: zoals het was', paymentDescription({ service: 'brand-model', products: 1 }, 'nl') === 'VISUAILS merkmodel');
  ok('/api/order geeft het kenmerk mee', /description: paymentDescription\(\{ \.\.\.quote, ref \}, lang\)/.test(lees('functions/api/order.js')));
  ok('de proef had het al (createTestSampleMolliePayment)', /'VISUAILS proef' : 'VISUAILS test sample'\}\$\{ref \? ` \$\{ref\}` : ''\}/.test(lees('src/lib/mollie.js')));
}

/* ── P5-15 ──────────────────────────────────────────────────────────────── */
console.log('\nP5-15 · eerste abonnementsbetaling zonder iDEAL bij verlegde btw');
{
  const { createFirstPayment } = await import('../src/lib/mollie.js');
  const arg = { subscriptionRef: 'SUB-TEST', mollieCustomerId: 'cst_test', valueEuros: 100, description: 'x', lang: 'nl', successUrl: 'https://visuails.com/x', webhookUrl: 'https://visuails.com/y' };
  mollieBodies.length = 0;
  const terug = stil();
  try {
    await createFirstPayment(env, arg);
    await createFirstPayment(env, { ...arg, excludeIdeal: true });
    await createFirstPayment(env, { ...arg, excludeIdeal: true, buitenEu: true });
    await createFirstPayment(env, { ...arg, excludeIdeal: true, oneOff: true });
  } finally { terug(); }
  const [gewoon, verlegd, buiten, jaar] = mollieBodies;
  ok('Nederlandse btw: geen beperking (iDEAL kan)', gewoon && !('method' in gewoon), JSON.stringify(gewoon?.method));
  ok('verlegd: kaart en Bancontact, geen iDEAL', JSON.stringify(verlegd?.method) === '["creditcard","bancontact"]', JSON.stringify(verlegd?.method));
  ok('buiten de EU: alleen de kaart', JSON.stringify(buiten?.method) === '["creditcard"]', JSON.stringify(buiten?.method));
  ok('vooruitbetaald jaar verlegd: de 0%-lijst zonder iDEAL, met overboeking', Array.isArray(jaar?.method) && !jaar.method.includes('ideal') && jaar.method.includes('banktransfer'), JSON.stringify(jaar?.method));
  ok('  en sequenceType blijft first / oneoff', verlegd?.sequenceType === 'first' && jaar?.sequenceType === 'oneoff');
  const sub = lees('src/lib/subscribe.js');
  ok('subscribe.js geeft excludeIdeal mee bij een andere behandeling dan standaard', /excludeIdeal: \(bedrijf\?\.btw\?\.treatment \|\| VAT_TREATMENT\.standard\) !== VAT_TREATMENT\.standard/.test(sub)
    && /buitenEu: bedrijf\?\.btw\?\.treatment === VAT_TREATMENT\.outsideScope/.test(sub));
}

/* ── P3-07 ──────────────────────────────────────────────────────────────── */
console.log('\nP3-07 · feestdagen standaard dicht');
{
  const { feestdagenTussen, clearedWindows } = await import('../src/data/capacity.js');
  const { readCalendar, zetFeestdagOpen, leesFeestdagOpen } = await import('../src/lib/agenda.js');
  const f = feestdagenTussen('2026-12-20', '2027-01-05');
  ok('kerst en nieuwjaar 2026–2027', [...f].join(',') === '2026-12-25,2026-12-26,2027-01-01', [...f].join(','));
  ok('dezelfde lijst als voorrang (feestdagenNL)', [...P.feestdagenNL(2027)].every((d) => feestdagenTussen('2027-01-01', '2027-12-31').has(d)));
  const kal = await readCalendar(env, '2026-12-20');
  ok('readCalendar zet ze bij de dichte dagen', ['2026-12-25', '2026-12-26', '2027-01-01'].every((d) => kal.blackouts.has(d)));
  const { windows } = clearedWindows({ today: '2026-12-20', products: 12, service: 'catalog', booked: kal.booked, blackouts: kal.blackouts, limit: 12 });
  const dagen = windows.flatMap((w) => [w.start, w.end]);
  ok('de agenda biedt 25, 26 december en 1 januari niet aan', windows.length > 0 && !dagen.some((d) => ['2026-12-25', '2026-12-26', '2027-01-01'].includes(d)), dagen.join(','));
  const z = await zetFeestdagOpen(env, '2026-12-26', true, '2026-11-18');
  ok('uitzondering: 26 december open zetten', z.ok && (await leesFeestdagOpen(env)).has('2026-12-26'));
  const kal2 = await readCalendar(env, '2026-12-20');
  ok('  dan is 26 december open en 25 december nog dicht', !kal2.blackouts.has('2026-12-26') && kal2.blackouts.has('2026-12-25'));
  ok('een gewone dag kun je niet als feestdag openzetten', (await zetFeestdagOpen(env, '2026-12-23', true, '2026-11-18')).ok === false);
  await zetFeestdagOpen(env, '2026-12-26', false, '2026-11-18');
  ok('en weer dicht', (await readCalendar(env, '2026-12-20')).blackouts.has('2026-12-26'));
  db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('agenda.feestdag_open', 'kapot')").run();
  ok('een kapotte waarde: geen uitzonderingen, feestdagen dicht', (await readCalendar(env, '2026-12-20')).blackouts.has('2026-12-25'));
}

/* ── B1-13 en P1-12 ─────────────────────────────────────────────────────── */
console.log('\nB1-13 · P1-12 · de vervalmail');
{
  const { UPLOAD_DAYS } = await import('../src/lib/retention.js');
  const { tasks } = await import('../cron/index.js');
  const { cancelEmail } = await import('../src/lib/cancelMail.js');
  db.prepare(`INSERT INTO orders (ref, service, email, name, lang, total_cents, vat_cents, product_count, status, payment_status, created_at)
              VALUES ('VIS-PROEF-OUD', 'test-sample', 'proef-oud@voorbeeldmerk.test', 'Pieter', 'nl', 100, 21, 1, 'received', 'unpaid', datetime('now', '-40 days'))`).run();
  db.prepare(`INSERT INTO orders (ref, service, email, name, lang, total_cents, vat_cents, product_count, status, payment_status, created_at)
              VALUES ('VIS-BEST-OUD', 'catalog', 'best-oud@voorbeeldmerk.test', 'Pieter', 'en', 13000, 0, 2, 'received', 'unpaid', datetime('now', '-40 days'))`).run();
  const terug = stil();
  let regel = '';
  try { regel = await tasks.cancelStaleApprovals(env); } finally { terug(); }
  ok('de nachttaak laat beide vervallen', /VIS-PROEF-OUD/.test(regel || '') && /VIS-BEST-OUD/.test(regel || ''), regel);
  const pm = klantMail('proef-oud@voorbeeldmerk.test');
  const proefNaam = `Je proef van ${P.euro(P.AMOUNT.testSample, 'nl')}`;
  ok(`P1-12: onderwerp "${proefNaam} is vervallen — VIS-…"`, pm?.subject === `${proefNaam} is vervallen — VIS-PROEF-OUD`, pm?.subject);
  ok('  de knop gaat naar /nl/test-sample/', /href="https:\/\/visuails\.com\/nl\/test-sample\/"/.test(pm?.html || '') && !/\/nl\/start"/.test(pm?.html || ''));
  ok(`B1-13: "Die bewaren we nog ${UPLOAD_DAYS} dagen" en "Antwoord dan op deze mail"`, (pm?.html || '').includes(`Die bewaren we nog ${UPLOAD_DAYS} dagen, voor als je opnieuw bestelt.`) && /Antwoord dan op deze mail\./.test(pm?.html || ''));
  const bm = klantMail('best-oud@voorbeeldmerk.test');
  ok('een gewone bestelling (EN) houdt "Your order has expired" en /start', /^Your order has expired — VIS-BEST-OUD$/.test(bm?.subject || '') && /href="https:\/\/visuails\.com\/start"/.test(bm?.html || ''), bm?.subject);
  ok(`  en zegt het ook: "We keep them for another ${UPLOAD_DAYS} days"`, (bm?.html || '').includes(`We keep them for another ${UPLOAD_DAYS} days`));
  const c = cancelEmail({ order: { ref: 'VIS-X', name: 'Pieter', lang: 'nl' }, reason: 'Op verzoek', money: 'unpaid' });
  ok('B1-13: de annuleringsmail zegt het ook', c.html.includes(`Die bewaren we nog ${UPLOAD_DAYS} dagen`));
  const ce = cancelEmail({ order: { ref: 'VIS-X', name: 'Pieter', lang: 'en' }, reason: 'On request', money: 'unpaid' });
  ok('  ook in het Engels', ce.html.includes(`We keep them for another ${UPLOAD_DAYS} days`));
  ok(`  en ${UPLOAD_DAYS} is de termijn van de opruimtaak`, /OR \(f\.kind = 'upload' AND o\.status = 'cancelled'[\s\S]*?'\+\$\{UPLOAD_DAYS\} days'/.test(lees('src/lib/retention.js')));
}

/* ── P5-14 ──────────────────────────────────────────────────────────────── */
console.log('\nP5-14 · de enige herinnering voor deze credits');
{
  const { boekTermijnBij } = await import('../src/lib/creditboek.js');
  const { tasks } = await import('../cron/index.js');
  const dag = (s, uur = '12:00:00') => new Date(`${s}T${uur}Z`);
  const starter = P.PLAN_CREDITS.starter;
  db.prepare("INSERT INTO customers (id, email, name) VALUES (9001, 'stil@voorbeeldmerk.test', 'Fatima')").run();
  db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at)
              VALUES (9001, 9001, 'SUB-STIL', 'starter', 'monthly', 'active', '2026-10-08 09:00:00')`).run();
  db.prepare("INSERT INTO customers (id, email, name) VALUES (9002, 'bezig@voorbeeldmerk.test', 'Noor')").run();
  db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at)
              VALUES (9002, 9002, 'SUB-BEZIG', 'starter', 'monthly', 'active', '2026-10-08 09:00:00')`).run();
  for (const id of [9001, 9002]) {
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
    for (const [m, d] of [['2026-10', '2026-10-08'], ['2026-11', '2026-11-08'], ['2026-12', '2026-12-08']]) await boekTermijnBij(env, sub, m, `tr_${id}_${m}`, dag(d));
  }
  /* Noor bestelde dit jaar wel iets (geannuleerd telt niet). */
  db.prepare(`INSERT INTO orders (ref, customer_id, service, email, total_cents, vat_cents, product_count, lang, status, created_at)
              VALUES ('VIS-NOOR-1', 9002, 'catalog', 'bezig@voorbeeldmerk.test', 0, 0, 1, 'nl', 'delivered', '2026-11-20 10:00:00')`).run();
  const voor = mails.length;
  const terug = stil();
  try { await tasks.herinnerCredits(env, dag('2027-01-01', '03:00:00')); } finally { terug(); }
  const nieuw = mails.slice(voor);
  const fm = nieuw.find(naar('stil@voorbeeldmerk.test'));
  const nm = nieuw.find(naar('bezig@voorbeeldmerk.test'));
  ok('beide klanten krijgen de plafondmail', !!fm && !!nm, nieuw.map((m) => `${m.to}: ${m.subject}`).join(' | '));
  ok('"Dit is de enige herinnering voor deze credits."', /Dit is de enige herinnering voor deze credits\./.test(fm?.html || '') && !/Dit is de enige herinnering\./.test(fm?.html || ''));
  ok(`een jaar zonder bestelling: "vallen er elke maand ${starter} credits weg"`, (fm?.html || '').includes(`vallen er elke maand ${starter} credits weg`), (fm?.html || '').replace(/<[^>]+>/g, ' ').slice(0, 0));
  ok('wie wel bestelde, krijgt die zin niet', !/vallen er elke maand/.test(nm?.html || ''));
  const bron = lees('cron/index.js');
  ok('ook de vervalmail en het Engels', !/enige herinnering\.'/.test(bron) && !/the only reminder\.'/.test(bron) && /this is the only reminder for these credits\./.test(bron));
}

/* ── P8-09 ──────────────────────────────────────────────────────────────── */
console.log('\nP8-09 · de rekennoot in pricing.js');
{
  const n = P.VOORRANG.maxProducten;
  const trede = P.LADDER.lifestyle.find(([van, tot]) => n >= van && (tot === null || n <= tot));
  const grootste = n * trede[2];
  const toeslag = Math.ceil(grootste * P.VOORRANG.deel);
  const bron = lees('src/data/pricing.js');
  ok(`de noot noemt ${n} lifestyleproducten à € ${trede[2]} = € ${grootste}`, bron.includes(`${n} lifestyleproducten à € ${trede[2]}`) && bron.includes(`= € ${grootste};`));
  ok(`  20% = € ${toeslag}, onder het plafond van € ${P.VOORRANG.plafond}`, bron.includes(`20% = € ${toeslag}`) && toeslag < P.VOORRANG.plafond);
  ok('  en de oude getallen staan er alleen nog als correctie', !/geeft 20% = € 244, onder € 249\./.test(bron));
}

/* ── P6-24 ──────────────────────────────────────────────────────────────── */
console.log('\nP6-24 · voorrang zonder clips zolang video op aanvraag is');
{
  ok('video is op aanvraag', P.VIDEO_OP_AANVRAAG === true);
  ok('VOORRANG_COPY.limits noemt geen clips (NL en EN)', !/clips/.test(P.VOORRANG_COPY.nl.limits) && !/clips/.test(P.VOORRANG_COPY.en.limits), P.VOORRANG_COPY.nl.limits);
  ok(`  wel "tot ${P.VOORRANG.maxProducten} producten"`, P.VOORRANG_COPY.nl.limits.startsWith(`Mogelijk tot ${P.VOORRANG.maxProducten} producten, op een stijl`) && P.VOORRANG_COPY.en.limits.startsWith(`Available up to ${P.VOORRANG.maxProducten} products, on a style`));
  ok('voorrangGrens() is de woordgroep voor andere plekken', P.voorrangGrens('nl') === `${P.VOORRANG.maxProducten} producten` && P.voorrangGrens('en') === `${P.VOORRANG.maxProducten} products`);
  ok('voorrangKan kent de clips nog (voor als video te bestellen is)', P.voorrangKan({ kind: 'hooks', clips: P.VOORRANG.maxClips }) === true);
}

console.log(`\n${pass} goed, ${fail} fout`);
if (fail) process.exit(1);
