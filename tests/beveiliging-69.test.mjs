/*
 * VISUAILS — DE BEVEILIGINGSNALOOP VAN LEVERING 69 (5 november 2026)
 *   node tests/beveiliging-69.test.mjs        (npm run test:beveiliging69)
 *
 * Wat sinds de veertien reparaties van 8 oktober bijkwam (bijkopen, overstappen,
 * pauze, terugboeking, formaten, de werkplaats, kopiëren, de complete look,
 * /admin/abonnees, proef dicht, e-Boekhouden, Turnstile) is per eindpunt en per
 * adminhandeling nagelopen (kladblok/LEVERING-69.md, §C). Vier dingen waren echt
 * mis; deze toets houdt ze dicht.
 *
 *   K1 · De kopie van de factuurmail en de welkomstmail ging als bcc mee, mét de
 *        privélink (/o/<token>) en de inlogknop (/account/verify/…, twee dagen
 *        geldig). Wie de postbus van INVOICE_BCC leest, kon zo in elke bestelling
 *        en in het Studio van elke nieuwe abonnee. Nu een eigen bericht zonder.
 *   K2 · /admin/security controleerde een TOTP-code zonder snelheidsgrens: met
 *        een overgenomen sessie was de code te raden, en daarna de tweede stap
 *        uit te zetten. Nu dezelfde emmers als /admin/code.
 *   K3 · Een mislukte verzending schreef het onderwerp in het log, en sinds
 *        14 oktober staat de inlogcode in het onderwerp. Nu ••••••.
 *   K4 · Het maximum van 100 bijgekochte credits per maand was "eerst kijken,
 *        dan schrijven": drie aankopen van 50 tegelijk gingen alle drie door.
 *        Nu draagt de INSERT de grens zelf.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let goed = 0; let fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  g ? goed++ : fout++;
  console.log(` ${g ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(84)}${g ? '' : ` verwacht ${JSON.stringify(wil)}, kreeg ${JSON.stringify(kreeg)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* Resend en Mollie, nagemaakt. `resendStatus` laat een verzending mislukken. */
const mails = [];
let resendStatus = 200;
let volg = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com')) {
    if (resendStatus !== 200) return new Response('{"message":"te druk"}', { status: resendStatus });
    mails.push(JSON.parse(String(opts.body || '{}')));
    return new Response('{"id":"m"}', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('api.mollie.com') && (opts.method || 'GET') === 'POST') {
    volg += 1;
    const id = `tr_Bev69${String(volg).padStart(5, '0')}`;
    return new Response(JSON.stringify({ id, status: 'open', _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } }), { status: 201, headers: { 'content-type': 'application/json' } });
  }
  return new Response('{}', { status: 200 });
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.join(' | '));
const env = {
  DB: d1(db), RESEND_API_KEY: 're_test', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
  INVOICE_BCC: 'administratie@voorbeeld.test',
};
db.exec("INSERT INTO customers (id, email, brand, name, country) VALUES (1, 'hello+k1@visuails.com', 'Teststad Merk', 'Sanne', 'NL')");
db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, lang, name, brand, total_cents, vat_cents, vat_rate, payment_status, created_at)
  VALUES (1, 'VIS-K1AA-001', 1, 'catalog', 'received', 'attended', 3, 'hello+k1@visuails.com', 'nl', 'Sanne', 'Teststad Merk', 26700, 5607, 0.21, 'paid', '2026-11-05 08:00:00')`);

/* ── K1 ──────────────────────────────────────────────────────────────────── */
console.log('K1 · de kopie voor de administratie draagt geen privélink of inlogknop');
{
  const { mailInvoice, mailSubscriptionInvoice } = await import('../src/lib/invoiceMail.js');
  const voor = mails.length;
  const gelukt = await mailInvoice(env, {
    order: { id: 1, ref: 'VIS-K1AA-001', email: 'hello+k1@visuails.com', lang: 'nl', name: 'Sanne', service: 'catalog' },
    invoice: { number: 'VIS-2026-0001', lang: 'nl', snapshot_json: JSON.stringify({ netCents: 26700, vatCents: 5607, grossCents: 32307, date: '2026-11-05' }) },
  });
  const [klant, kopie] = mails.slice(voor);
  ok('de factuurmail gaat uit', gelukt, true);
  ok('  aan de klant, met de privélink', [].concat(klant?.to)[0] === 'hello+k1@visuails.com' && /\/o\/[A-Za-z0-9_-]{20,}/.test(klant?.html || ''), true);
  ok('  zonder bcc op de mail van de klant', 'bcc' in (klant || {}), false);
  ok('  en een eigen kopie aan INVOICE_BCC', [].concat(kopie?.to)[0], 'administratie@voorbeeld.test');
  ok('  zonder privélink in de kopie', /\/o\/[A-Za-z0-9_-]{8,}/.test(kopie?.html || ''), false);
  ok('  met hetzelfde onderwerp (de administratie vindt hem terug)', kopie?.subject, klant?.subject);

  const voorAbo = mails.length;
  await mailSubscriptionInvoice(env, {
    sub: { ref: 'SUB-K1AA-001', plan: 'studio', term: 'monthly' },
    customer: { email: 'hello+k1@visuails.com', lang: 'nl', name: 'Sanne', country: 'NL' },
    invoice: { number: 'VIS-2026-0002', lang: 'nl', month: '2026-11', snapshot_json: JSON.stringify({ netCents: 79000, vatCents: 16590, grossCents: 95590, date: '2026-11-05' }) },
    planNaam: 'Studio', credits: 160, eerste: true,
    loginLink: 'https://visuails.com/account/verify/abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG?lang=nl&naar=plan',
  });
  const [welkom, welkomKopie] = mails.slice(voorAbo);
  ok('de welkomstmail aan de klant heeft de inlogknop', /\/account\/verify\//.test(welkom?.html || ''), true);
  ok('  zonder bcc', 'bcc' in (welkom || {}), false);
  ok('  de kopie aan INVOICE_BCC heeft hem niet', [].concat(welkomKopie?.to)[0] === 'administratie@voorbeeld.test' && !/\/account\/verify\//.test(welkomKopie?.html || ''), true);
  ok('  en geen enkele mail met een bcc draagt een dragerlink', mails.filter((m) => m.bcc).some((m) => /\/o\/|\/account\/verify\//.test(m.html || '')), false);
}

/* ── K2 ──────────────────────────────────────────────────────────────────── */
console.log('\nK2 · /admin/security: een grens op het raden van de code');
{
  const bron = lees('src/lib/admin.js');
  const i = bron.indexOf('async function handleSecurityPost(');
  const stuk = bron.slice(i, bron.indexOf('\n}\n', i));
  const grens = stuk.indexOf("key: `admin-code|${admin.admin_id}`, action: 'admin-code-id', limit: 10, windowSeconds: 900");
  const eersteCode = stuk.indexOf('gebruikTotp(');
  ok('dezelfde emmer per account als /admin/code (10 per kwartier)', grens > 0, true);
  ok('  en de emmer per IP', /checkRate\(env, \{ ip: clientIp\(request\), action: 'admin-code', limit: 20 \}\)/.test(stuk), true);
  ok('  vóór de eerste codecontrole', grens > 0 && grens < eersteCode, true);
  ok('  te veel pogingen geeft 429', /status: 429/.test(stuk), true);
}

/* ── K3 ──────────────────────────────────────────────────────────────────── */
console.log('\nK3 · geen inlogcode in het logboek');
{
  const { sendMail, zonderCode } = await import('../src/lib/mail.js');
  ok('zes cijfers worden ••••••', zonderCode('482913 is je inlogcode voor VISUAILS'), '•••••• is je inlogcode voor VISUAILS');
  ok('  een kenmerk blijft leesbaar', zonderCode('Je bestelling — VIS-AB12-CD3'), 'Je bestelling — VIS-AB12-CD3');
  const gelogd = [];
  const echteError = console.error;
  console.error = (...a) => { gelogd.push(a.join(' ')); };
  resendStatus = 429;
  await sendMail(env, { to: 'hello+k3@visuails.com', subject: '482913 is je inlogcode voor VISUAILS', html: '<p>x</p>' }).catch(() => {});
  await sendMail({ ...env, RESEND_API_KEY: '' }, { to: 'hello+k3@visuails.com', subject: '771204 is your VISUAILS sign-in code', html: '<p>x</p>' }).catch(() => {});
  resendStatus = 200;
  console.error = echteError;
  ok('Resend 429: er staat een regel in het log', gelogd.length >= 1, true);
  ok('  zonder de code', gelogd.some((r) => /482913|771204/.test(r)), false);
  ok('  wel met wat er misging', gelogd.some((r) => /Resend 429/.test(r)) && gelogd.some((r) => /RESEND_API_KEY is niet ingesteld/.test(r)), true);
}

/* ── K4 ──────────────────────────────────────────────────────────────────── */
console.log('\nK4 · hoogstens 100 bijgekochte credits per maand, ook tegelijk');
{
  const { maakAankoop, bijkoopRuimte } = await import('../src/lib/bijkopen.js');
  const { BIJKOOP_MAX_PER_MAAND } = await import('../src/data/pricing.js');
  db.exec("INSERT INTO customers (id, email, brand, name, country) VALUES (2, 'hello+k4@visuails.com', 'Teststad Merk', 'Mara', 'NL')");
  db.exec("INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, vat_treatment, vat_rate, vat_country, started_at) VALUES (7, 2, 'SUB-K4AA-001', 'studio', 'monthly', 'active', 'nl_standard', 0.21, 'NL', '2026-11-01 08:00:00')");
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = 7').get();
  const nu = new Date('2026-11-05T09:00:00Z');
  const drie = await Promise.all([1, 2, 3].map(() => maakAankoop(env, { customerId: 2, sub, pakket: 50, lang: 'nl', origin: 'https://visuails.com', nu })));
  ok('drie keer 50 tegelijk: twee lukken', drie.filter((r) => r.ok).length, 2);
  ok('  de derde zegt "te veel"', drie.filter((r) => !r.ok).map((r) => r.reden), ['te-veel']);
  ok(`  en er staan hoogstens ${BIJKOOP_MAX_PER_MAAND} credits open`, db.prepare("SELECT COALESCE(SUM(pakket), 0) AS n FROM credit_aankopen WHERE customer_id = 2").get().n <= BIJKOOP_MAX_PER_MAAND, true);
  ok('  de ruimte is op', (await bijkoopRuimte(env.DB, 2, nu)).ruimte, 0);
  ok('  de grens staat in de INSERT zelf', /INSERT INTO credit_aankopen[\s\S]{0,300}SELECT[\s\S]{0,400}<= \?12/.test(lees('src/lib/bijkopen.js')), true);
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
