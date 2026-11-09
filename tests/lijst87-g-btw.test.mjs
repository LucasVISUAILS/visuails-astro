/*
 * LIJST 87 · BTW — 9 november 2026
 *
 *   B09  goedkeuren op /admin/vat zonder zakelijke verklaring kan niet meer zonder dat Lucas
 *        aanvinkt dat de klant het bevestigde; de afwijsmail vraagt erom.
 *   B10  een postcode in een gebied van een EU-land buiten het btw-gebied (Canarische Eilanden,
 *        Åland, de Franse overzeese departementen …) zet de bestelling op de btw-lijst, met een
 *        reden. Het tarief verandert niet vanzelf.
 *   B21  een Frans btw-nummer dat met twee letters begint, zonder "FR": geen landcode.
 *
 * Echte SQLite en de echte routes (adminPost, /api/order).
 *   node tests/lijst87-g-btw.test.mjs
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? ' ok  ' : ' FAIL'} ${naam}${p ? '' : `\n       verwacht ${JSON.stringify(wil)}\n       kreeg    ${JSON.stringify(kreeg)}`}`);
};

const mails = [];
let betalingen = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') { betalingen++; return json({ id: 'tr_L87B', status: 'open', _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_L87B' } } }, 201); }
  if (u.includes('ec.europa.eu')) return json({ isValid: true, userError: 'VALID', requestDate: '2026-11-09T10:00:00Z', requestIdentifier: 'WAPITEST' });
  if (u.includes('resend.com')) { try { const b = JSON.parse(String(opts.body)); mails.push({ to: b.to, subject: b.subject, html: b.html || '' }); } catch { /* geen json */ } }
  return json({ id: 'msg_test' });
};

const { adminGet, adminPost, verklaringOntbreekt } = await import('../src/lib/admin.js');
const { normaliseVat, vatFormatOk, buitenBtwGebied, vatGate } = await import('../src/data/vat.js');
const { onRequestPost: bestelPost } = await import('../functions/api/order.js');

/* ══ B09 ══════════════════════════════════════════════════════════════════════ */
console.log('B09 · geen betaallink zonder zakelijke verklaring');
{
  ok('verklaringOntbreekt: alleen "MISSING" telt', [verklaringOntbreekt('{"business_declaration":"MISSING"}'), verklaringOntbreekt('{"business_declaration":"v1"}'), verklaringOntbreekt('{}'), verklaringOntbreekt('kapot')], [true, false, false, false]);

  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const token = await mintToken();
  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'admin@voorbeeld.test', 'x')");
  db.prepare("INSERT INTO admin_sessions (admin_id, token_hash, expires_at, issued_at, last_used_at) VALUES (1, ?, '2099-01-01 00:00:00', datetime('now'), datetime('now'))").run(await hashToken(token));
  const env = { DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123' };
  const bestelling = (id, ref, verklaring) => db.prepare(`INSERT INTO orders (id, ref, service, status, product_count, email, name, lang, brand, total_cents, vat_cents, vat_rate, vat_treatment, payment_status, review_state, review_reason, details_json, created_at)
     VALUES (?, ?, 'catalog', 'received', 2, 'klant@voorbeeld.test', 'Test Klant', 'nl', 'TESTMERK', 3800, 0, 0, 'outside_scope', 'unpaid', 'pending', 'test', ?, datetime('now'))`)
    .run(id, ref, JSON.stringify({ business_declaration: verklaring }));
  bestelling(1, 'VIS-L87-0001', 'MISSING');
  bestelling(2, 'VIS-L87-0002', 'business-v2-2026-09');
  bestelling(3, 'VIS-L87-0003', 'MISSING');
  const post = (id, velden) => adminPost({ request: new Request(`https://visuails.com/admin/orders/${id}/vat`, { method: 'POST', headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' }, body: new URLSearchParams(velden) }), env, waitUntil() {} });
  const rij = (id) => db.prepare('SELECT review_state, details_json FROM orders WHERE id = ?').get(id);

  const pagina = await (await adminGet({ request: new Request('https://visuails.com/admin/vat', { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} })).text();
  ok('/admin/vat zegt "Zakelijke verklaring · ontbreekt" bij de bestelling zonder vinkje', /VIS-L87-0001[\s\S]*?Zakelijke verklaring<\/th><td><span class="pill danger">ontbreekt/.test(pagina));
  ok('  met een verplicht vinkje in de goedkeurknop', /<input type="checkbox" name="verklaring" value="bevestigd" required> De klant bevestigde/.test(pagina));
  ok('  en niet bij een bestelling mét verklaring', (pagina.match(/name="verklaring"/g) || []).length, 4 /* twee bestellingen zonder, elk goedkeuren + btw rekenen */);

  mails.length = 0;
  let r = await post(1, { action: 'approve' });
  ok('goedkeuren zonder het vinkje: terug met uit=verklaring', [r.status, r.headers.get('location')], [303, '/admin/vat?ref=VIS-L87-0001&uit=verklaring']);
  ok('  en er is niets veranderd, geen mail', [rij(1).review_state, mails.length], ['pending', 0]);
  r = await post(1, { action: 'charge_vat' });
  ok('btw alsnog rekenen zonder het vinkje: ook niet', rij(1).review_state, 'pending');
  const terug = await (await adminGet({ request: new Request('https://visuails.com/admin/vat?ref=VIS-L87-0001&uit=verklaring', { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} })).text();
  ok('  de melding zegt waarom', /is NIET goedgekeurd: de klant heeft nog niet bevestigd dat hij als bedrijf bestelt/.test(terug));

  r = await post(1, { action: 'approve', verklaring: 'bevestigd' });
  ok('met het vinkje: goedgekeurd', rij(1).review_state, 'approved');
  ok('  en de bevestiging staat in de bestelling', /^bevestigd-via-admin:admin@voorbeeld\.test$/.test(JSON.parse(rij(1).details_json).business_declaration));
  ok('  en de betaallink is gemaild', mails.some((m) => /Je btw-gegevens zijn goedgekeurd/.test(m.subject || '')));

  r = await post(2, { action: 'approve' });
  ok('een bestelling mét verklaring: gewoon goedkeuren, zoals altijd', rij(2).review_state, 'approved');

  mails.length = 0;
  r = await post(3, { action: 'reject' });
  ok('afwijzen zonder verklaring: de mail vraagt om de bevestiging', rij(3).review_state === 'rejected' && mails.some((m) => /zet in je antwoord erbij dat je deze bestelling als bedrijf plaatst/.test(m.html)));
}

/* ══ B10 ══════════════════════════════════════════════════════════════════════ */
console.log('\nB10 · gebieden buiten het btw-gebied');
{
  const gevallen = [
    ['ES', '35001', 'de Canarische Eilanden (Las Palmas)'], ['ES', 'E-38001', 'de Canarische Eilanden (Santa Cruz de Tenerife)'],
    ['ES', '51001', 'Ceuta'], ['ES', '52001', 'Melilla'], ['ES', '28001', null],
    ['FI', '22100', 'Åland'], ['FI', 'AX-22100', 'Åland'], ['FI', '00100', null],
    ['DE', '27498', 'Helgoland'], ['DE', '78266', 'Büsingen am Hochrhein'], ['DE', '10115', null],
    ['FR', '97400', 'een Frans overzees departement'], ['FR', '97150', 'een Frans overzees departement'], ['FR', '98000', null], ['FR', '75001', null],
    ['GR', '63086', 'de berg Athos'], ['IT', '23041', 'Livigno'], ['IT', '22061', 'Campione d’Italia'], ['IT', '00100', null],
    ['NL', '1234 AB', null], ['ES', '', null],
  ];
  for (const [land, pc, wil] of gevallen) ok(`${land} ${pc || '(leeg)'}: ${wil || 'gewoon btw-gebied'}`, buitenBtwGebied(land, pc), wil);
  const g = vatGate({ country: 'ES', treatment: 'eu_reverse_charge', vatValid: true, confirmed: true, hadNumber: true, postcode: '35001' });
  ok('vatGate: op de btw-lijst, niet meteen te betalen', [g.needsReview, g.payableNow], [true, false]);
  ok('  met een reden die Lucas leest', /Postcode in de Canarische Eilanden \(Las Palmas\): hoort bij ES, maar niet bij het btw-gebied/.test(g.reasons[0] || ''));
  ok('vatGate: Madrid blijft zoals het was', vatGate({ country: 'ES', treatment: 'eu_reverse_charge', vatValid: true, confirmed: true, hadNumber: true, postcode: '28001' }), { needsReview: false, payableNow: true, reasons: [] });

  /* Door /api/order heen. */
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const env = { MOLLIE_API_KEY: 'live_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db),
    UPLOADS: { async put() {}, async get() { return null; }, async delete() {}, async head() { return null; } } };
  let ip = 1;
  const bestel = async (velden) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ service: 'catalog', products: '2', name: 'Test Klant', first_name: 'Test', last_name: 'Klant', brand: 'TESTMERK', email: `gebied${ip}@voorbeeld.test`, phone: '+34 600 000 000',
      address_line1: 'Teststraat 1', city: 'Teststad', lang: 'nl', business_declaration: 'yes', business_version: 'v1', vat_confirmed: 'yes', ...velden })) fd.append(k, v);
    await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.87.10.${ip++}` } }), env, waitUntil() {} });
    return db.prepare('SELECT review_state, review_reason, vat_treatment, vat_rate FROM orders ORDER BY id DESC LIMIT 1').get();
  };
  const voor = betalingen;
  const canarisch = await bestel({ country: 'ES', postal_code: '35001', vat: 'ESA12345674' });
  ok('/api/order: Las Palmas met een geldig nummer gaat op de btw-lijst', [canarisch.review_state, /Canarische Eilanden/.test(canarisch.review_reason || '')], ['pending', true]);
  ok('  zonder betaling vooraf', betalingen - voor, 0);
  ok('  en het tarief is niet vanzelf veranderd (dat beslist Lucas)', [canarisch.vat_treatment, canarisch.vat_rate], ['eu_reverse_charge', 0]);
  const madrid = await bestel({ country: 'ES', postal_code: '28001', vat: 'ESA12345674' });
  ok('/api/order: Madrid niet', madrid.review_state, null);
}

/* ══ B21 ══════════════════════════════════════════════════════════════════════ */
console.log('\nB21 · een Frans btw-nummer met letters vooraan');
ok('AB123456789 bij Frankrijk: alles is het nummer', normaliseVat('AB123456789', 'FR'), { country: null, number: 'AB123456789' });
ok('  en de vorm klopt', vatFormatOk('FR', 'AB 123 456 789'), true);
ok('FRAB123456789: FR is de landcode, zoals altijd', normaliseVat('FRAB123456789', 'FR'), { country: 'FR', number: 'AB123456789' });
ok('DE123456789 bij Frankrijk: DE blijft een landcode, dus fout land', vatFormatOk('FR', 'DE123456789'), false);
ok('EL… bij Frankrijk ook (Griekse btw-code)', normaliseVat('EL123456789', 'FR').country, 'EL');
ok('bij een ander land verandert er niets', [normaliseVat('AB123456789', 'BE').country, vatFormatOk('BE', 'AB123456789')], ['AB', false]);
ok('zonder land (oude aanroep) ook niet', normaliseVat('AB123456789').country, 'AB');

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
