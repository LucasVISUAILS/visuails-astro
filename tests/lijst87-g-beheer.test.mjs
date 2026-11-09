/*
 * LIJST 87 · BEHEER, CACHE EN MISBRUIK — 9 november 2026
 *
 *   B16  "Voorrang gemist, toeslag terugbetalen" in Nu doen (en dus in het nachtrapport), als
 *        delivered_at na voorrangDeadline() ligt en er nog niets is terugbetaald.
 *   B20  "Klaar voor live" noemt ook testtegoed en testcredits.
 *   C07  het formulier toont de echte dag van voorrang ("uiterlijk dinsdag 17 november om 17:00").
 *   C16  ?v=<teken uit de inhoud> achter elk beeld onder /img/hal (componenten en stylesheets).
 *   A06  zonder Turnstile-sleutels geldt de strenge grens (niet meer de ruime).
 *   A08  de checklistmail gaat alleen naar een nieuw adres.
 *
 *   node tests/lijst87-g-beheer.test.mjs
 */
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? ' ok  ' : ' FAIL'} ${naam}${p ? '' : `\n       verwacht ${JSON.stringify(wil)}\n       kreeg    ${JSON.stringify(kreeg)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const mails = [];
let turnstileJa = true;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.includes('challenges.cloudflare.com')) return json(turnstileJa ? { success: true } : { success: false, 'error-codes': ['invalid-input-response'] });
  if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') return json({ id: 'tr_L87G', status: 'open', _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_L87G' } } }, 201);
  if (u.includes('resend.com')) { try { const b = JSON.parse(String(opts.body)); mails.push({ to: b.to, subject: b.subject }); } catch { /* geen json */ } }
  return json({ id: 'msg_test' });
};

const schema = () => {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
  return db;
};

/* ══ B16 ══════════════════════════════════════════════════════════════════════ */
console.log('B16 · voorrang gemist in Nu doen');
{
  const { nuDoen, nuDoenTekst, soortLabel, NU_DOEN_SOORTEN, amsterdamMs } = await import('../src/lib/nudoen.js');
  ok('de soort staat vooraan, na btw en abonnement', NU_DOEN_SOORTEN.slice(0, 3), ['btw', 'abonnement', 'toeslag']);
  ok('amsterdamMs: 17:00 in november is 16:00 UTC', new Date(amsterdamMs('2026-11-17', 17)).toISOString(), '2026-11-17T16:00:00.000Z');
  ok('amsterdamMs: 17:00 in juli is 15:00 UTC', new Date(amsterdamMs('2026-07-14', 17)).toISOString(), '2026-07-14T15:00:00.000Z');

  const db = schema();
  db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'klant@voorbeeld.test', 'TESTMERK')");
  const opbouw = JSON.stringify([{ soort: 'producten', qty: 2, unitCents: 1900, totalCents: 3800 }, { soort: 'voorrang', qty: 1, unitCents: 4900, totalCents: 4900 }]);
  const best = (id, ref, { geleverd, terug = 0, voorrang = true }) => db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, product_count, email, name, lang, brand, total_cents, payment_status, paid_at, delivered_at, delivery_mailed_at, closed_at, refunded_cents, details_json)
      VALUES (?, ?, 1, 'catalog', 'delivered', 2, 'klant@voorbeeld.test', 'Test Klant', 'nl', 'TESTMERK', 8700, 'paid', '2026-11-13 14:30:00', ?, ?, ?, ?, ?)`)
    .run(id, ref, geleverd, geleverd, geleverd, terug, JSON.stringify(voorrang ? { voorrang: '1', opbouw: JSON.parse(opbouw) } : {}));
  /* Betaald vrijdag 13 november 15:30 (na 15:00): beloofd dinsdag 17 november 17:00 (16:00 UTC). */
  best(1, 'VIS-L87-TELAAT', { geleverd: '2026-11-17 16:30:00' });
  best(2, 'VIS-L87-OPTIJD', { geleverd: '2026-11-17 15:30:00' });
  best(3, 'VIS-L87-TERUG', { geleverd: '2026-11-18 09:00:00', terug: 5929 });
  best(4, 'VIS-L87-GEENVR', { geleverd: '2026-11-20 09:00:00', voorrang: false });
  const nu = Date.parse('2026-11-18T08:00:00Z');
  const lijst = await nuDoen(d1(db), { nu });
  ok('de lijst is te lezen', lijst.fout, null);
  const toeslag = lijst.regels.filter((r) => r.soort === 'toeslag');
  ok('alleen de te late levering staat erin', toeslag.map((r) => r.ref), ['VIS-L87-TELAAT']);
  ok('  bovenaan', lijst.regels[0]?.ref, 'VIS-L87-TELAAT');
  ok('  met "Voorrang gemist"', soortLabel(toeslag[0] || {}), 'Voorrang gemist');
  const tekst = nuDoenTekst(lijst, { nu }).join('\n');
  ok('het nachtrapport zegt wat er beloofd was en wat terug moet', /Voorrang gemist · VIS-L87-TELAAT \(TESTMERK\), beloofd di 17 nov om 17:00, geleverd .*; toeslag € 49,00 excl\. btw terugbetalen/.test(tekst), true);
  ok('  met een link naar de bestelling', /Toeslag terugbetalen: https:\/\/visuails\.com\/admin\/orders\/1\/files/.test(tekst), true);
  const een = await nuDoen(d1(db), { nu, orderId: 1 });
  ok('op de bestelpagina is het de volgende stap', een.regels[0]?.soort, 'toeslag');
}

/* ══ B20 ══════════════════════════════════════════════════════════════════════ */
console.log('\nB20 · klaar voor live: testtegoed en testcredits');
{
  const { klaarVoorLiveStand, klaarVoorLiveStappen } = await import('../src/lib/admin.js');
  const db = schema();
  db.exec("INSERT INTO customers (id, email, brand) VALUES (117, 'proef@voorbeeld.test', 'Studio Proefmerk'), (2, 'echt@voorbeeld.test', 'Echt BV')");
  db.exec("INSERT INTO orders (id, ref, email, service, status, total_cents, payment_status, testmodus, lang, customer_id) VALUES (10, 'VIS-PRF-T1', 'proef@voorbeeld.test', 'catalog', 'cancelled', 3800, 'paid', 1, 'nl', 117), (11, 'VIS-ECHT-T1', 'echt@voorbeeld.test', 'catalog', 'cancelled', 3800, 'paid', 0, 'nl', 2)");
  db.exec("INSERT INTO customer_credits (customer_id, delta_cents, reason, order_id) VALUES (117, 4598, 'Tegoed na annulering van VIS-PRF-T1', 10), (2, 4598, 'Tegoed na annulering van VIS-ECHT-T1', 11)");
  db.exec("INSERT INTO subscriptions (id, customer_id, ref, plan, status, testmodus) VALUES (50, 117, 'SUB-PRF-0001', 'studio', 'cancelled', 1), (51, 2, 'SUB-ECHT-001', 'studio', 'active', 0)");
  db.exec("INSERT INTO credit_boek (customer_id, subscription_id, aantal, reden, vervalt_op, rest, sleutel, door) VALUES (117, 50, 12, 'termijn', '2099-01-01 00:00:00', 12, 'l87:1', 'systeem'), (2, 51, 12, 'termijn', '2099-01-01 00:00:00', 12, 'l87:2', 'systeem'), (117, 50, 5, 'termijn', '2020-01-01 00:00:00', 5, 'l87:3', 'systeem')");
  const s = await klaarVoorLiveStand({ DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123' });
  ok('testtegoed: alleen de proefklant', (s.proefTegoed || []).map((r) => [r.customer_id, r.saldo]), [[117, 4598]]);
  ok('testcredits: alleen open, niet vervallen credits uit het testabonnement', (s.proefCredits || []).map((r) => [r.customer_id, r.credits]), [[117, 12]]);
  const stap1 = klaarVoorLiveStappen(s)[0].rijen;
  ok('stap 1 heeft vier regels', stap1.map((r) => r.wat), ['Testabonnementen', 'Open testbestellingen', 'Testtegoed', 'Testcredits']);
  ok('  testtegoed en testcredits staan op "te doen"', stap1.slice(2).map((r) => r.staat), ['te-doen', 'te-doen']);
  ok('  met een link naar de klant (tegoed en abonnement)', /href="\/admin\/customers\/117#tegoed">Studio Proefmerk<\/a> \(€ ?45,98\)/.test(stap1[2].uitleg) && /href="\/admin\/customers\/117#abonnement">Studio Proefmerk<\/a> \(12 credits\)/.test(stap1[3].uitleg), true);
  const stuk = await klaarVoorLiveStand({ DB: { prepare() { throw new Error('D1 weg'); } } });
  ok('een database die niet leest: onbekend, geen fout', klaarVoorLiveStappen(stuk)[0].rijen.slice(2).map((r) => r.staat), ['onbekend', 'onbekend']);
}

/* ══ C07 ══════════════════════════════════════════════════════════════════════ */
console.log('\nC07 · de echte dag van voorrang in het formulier');
{
  const { voorrangDeadline } = await import('../src/data/pricing.js');
  ok('vrijdag na 15:00 betaald: dinsdag', voorrangDeadline('2026-11-13T15:30:00+01:00'), { datum: '2026-11-17', uur: 17 });
  ok('zaterdag betaald: dinsdag', voorrangDeadline('2026-11-14T10:00:00+01:00'), { datum: '2026-11-17', uur: 17 });
  const flow = lees('src/components/order/OrderFlow.astro');
  ok('OrderFlow: een plek voor de zin, met het sjabloon in beide talen', /<p class="pl-voorrang-dag" data-pl-voorrang-dag data-sjabloon=\{WK\.voorrangDag\} hidden><\/p>/.test(flow)
    && /voorrangDag: 'Betaal je nu, dan is het uiterlijk \{dag\} om \{uur\}:00 klaar\.'/.test(flow) && /voorrangDag: 'Pay now and it is ready by \{uur\}:00 on \{dag\} at the latest\.'/.test(flow), true);
  const pl = lees('src/scripts/pipeline.js');
  ok('pipeline.js vult hem met voorrangDeadline() (dezelfde som als de server)', /import \{ voorrangDeadline \} from '\.\.\/data\/pricing\.js';/.test(pl) && /const d = aan \? voorrangDeadline\(null\) : null;/.test(pl), true);
  ok('  en verbergt hem als voorrang niet kan (dicht of te veel producten)', /dagZin\.hidden = !dag;/.test(pl), true);
  const dag = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date('2026-11-17T12:00:00Z'));
  ok(`de dagnaam leest als "${dag}"`, dag, 'dinsdag 17 november');
}

/* ══ C16 ══════════════════════════════════════════════════════════════════════ */
console.log('\nC16 · ?v= achter de beelden onder /img/hal');
{
  const { halV, halSrcsetV, metHalVersie, beeldTeken } = await import('../src/data/beeldVersie.js');
  const wortel = mkdtempSync(path.join(tmpdir(), 'beeldversie-'));
  mkdirSync(path.join(wortel, 'public', 'img', 'hal'), { recursive: true });
  const bestand = path.join(wortel, 'public', 'img', 'hal', 'masker.png');
  writeFileSync(bestand, 'eerste');
  const v1 = halV('/img/hal/masker.png', wortel);
  ok('halV: een teken van tien tekens', /^\/img\/hal\/masker\.png\?v=[0-9a-f]{10}$/.test(v1), true);
  const wortel2 = mkdtempSync(path.join(tmpdir(), 'beeldversie-'));
  mkdirSync(path.join(wortel2, 'public', 'img', 'hal'), { recursive: true });
  writeFileSync(path.join(wortel2, 'public', 'img', 'hal', 'masker.png'), 'tweede');
  ok('  andere inhoud, ander teken', halV('/img/hal/masker.png', wortel2) !== v1, true);
  ok('  dezelfde inhoud, hetzelfde teken', beeldTeken('/img/hal/masker.png', wortel), v1.split('=')[1]);
  ok('  een bestand dat er niet is: geen teken', halV('/img/hal/weg.png', wortel), '/img/hal/weg.png');
  ok('  een pad met al een ?v=: blijft staan', halV('/img/hal/masker.png?v=abc', wortel), '/img/hal/masker.png?v=abc');
  ok('  buiten /img/hal: blijft staan', halV('/img/anders.png', wortel), '/img/anders.png');
  ok('halSrcsetV: elk pad, de breedtes blijven', halSrcsetV('/img/hal/masker.png 1000w, /img/hal/weg.png 2000w', wortel), `${v1} 1000w, /img/hal/weg.png 2000w`);
  ok('metHalVersie: url() met en zonder aanhalingstekens', metHalVersie("a{mask:url(/img/hal/masker.png)} b{--x:url('/img/hal/masker.png')} c{x:url(/img/hal/masker.png?v=1)}", wortel),
    `a{mask:url(${v1})} b{--x:url('${v1}')} c{x:url(/img/hal/masker.png?v=1)}`);
  rmSync(wortel, { recursive: true, force: true }); rmSync(wortel2, { recursive: true, force: true });

  const cfg = lees('astro.config.mjs');
  ok('astro.config.mjs: de Vite-stap zet het teken in elke stylesheet', /import \{ metHalVersie \} from '\.\/src\/data\/beeldVersie\.js';/.test(cfg) && /name: 'visuails-hal-versie'/.test(cfg) && /return \{ code: metHalVersie\(code\), map: null \};/.test(cfg), true);
  ok('de componenten gaan door halV()', /src=\{halV\(`\/img\/hal\/rust\//.test(lees('src/components/HalMaken80.astro'))
    && /src=\{halV\(standPad\(lang, s, 1600\)\)\} srcset=\{halSrcsetV\(standSrcset\(lang, s\)\)\}/.test(lees('src/components/HalLaptop.astro')), true);
  /* Geen kaal /img/hal-pad meer in een component (de opening en de video hadden al een teken). HalLaptopSchermen
     niet: dat is de bron van de standfoto's (laptop-bron), zijn beelden staan op de foto en niet los op de site,
     en elke wijziging daar vraagt om nieuwe foto's (tests/laptop-standen.test.mjs). */
  const kaal = ['HalMaken80', 'HalLaptop'].filter((c) => /(src|srcset)="\/img\/hal\//.test(lees(`src/components/${c}.astro`)));
  ok('  en nergens meer src="/img/hal/…" zonder teken', kaal, []);
  const avif = lees('scripts/avif-naast-webp.mjs');
  ok('de avif-stap kent het teken (anders verloor het beeld zijn avif)', /const zonderVraag = \(p\) => String\(p\)\.split\('\?'\)\[0\];/.test(avif) && /pad\.replace\(\/\\\.webp\(\?=\\\?\|\$\)\/, '\.avif'\)/.test(avif), true);
  /* En het echte bestand: hal.css heeft het masker. */
  const echt = metHalVersie(lees('src/styles/hal.css'));
  ok('in hal.css krijgt masker-laptop.png een teken', /url\(\/img\/hal\/masker-laptop\.png\?v=[0-9a-f]{10}\)/.test(echt), true);
}

/* ══ A06 ══════════════════════════════════════════════════════════════════════ */
console.log('\nA06 · zonder sleutels de strenge grens');
{
  const { botcheckBesluit, botcheckMarkeren } = await import('../src/lib/turnstile.js');
  ok('uit (geen sleutels) is nu streng', botcheckBesluit('uit'), 'streng');
  ok('goed blijft door, ongeldig blijft weiger', [botcheckBesluit('goed'), botcheckBesluit('ongeldig')], ['door', 'weiger']);
  ok('uit wordt niet gemarkeerd in /admin; geen-token wel', [botcheckMarkeren('uit'), botcheckMarkeren('geen-token'), botcheckMarkeren('goed')], [false, true, false]);

  const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
  const db = schema();
  const basis = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com',
    UPLOADS: { async put() {}, async get() { return null; }, async delete() {}, async head() { return null; } } };
  let n = 0;
  const bestel = async (env, ip, extra = {}) => {
    n++;
    const fd = new FormData();
    for (const [k, v] of Object.entries({ service: 'catalog', mode: 'json', products: '2', name: 'Test Klant', first_name: 'Test', last_name: 'Klant', brand: 'TESTMERK', email: `grens${n}@voorbeeld.test`, phone: '+31 6 12345678', country: 'NL',
      address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes', business_version: 'v1', no_vat: '1', reg_number: '12345678', ...extra })) fd.append(k, v);
    const res = await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': ip } }), env, waitUntil() {} });
    return res.status;
  };
  const zonder = [];
  for (let i = 0; i < 4; i++) zonder.push(await bestel(basis, '10.87.6.1'));
  ok('zonder sleutels: drie bestellingen per 10 minuten, de vierde 429', zonder, [200, 200, 200, 429]);
  ok('  en zonder markering "botcheck" in de bestelling', db.prepare("SELECT COUNT(*) AS n FROM orders WHERE json_extract(details_json, '$.botcheck') IS NOT NULL").get().n, 0);
  const sleutels = { ...basis, TURNSTILE_SITE_KEY: '0x4AAAAAAAverzonnen', TURNSTILE_SECRET_KEY: '0x4AAAAAAAgeheimverzonnen' };
  const met = [];
  for (let i = 0; i < 4; i++) met.push(await bestel(sleutels, '10.87.6.2', { turnstile: 'goed-token' }));
  ok('met sleutels en een goedgekeurde botcheck: de vierde mag gewoon', met, [200, 200, 200, 200]);
  ok('de bron zegt het ook', /GEEN SLEUTELS, GEEN BOTCHECK — WEL DE STRENGE GRENS/.test(lees('src/lib/turnstile.js')), true);
}

/* ══ A08 ══════════════════════════════════════════════════════════════════════ */
console.log('\nA08 · de checklistmail alleen bij een nieuw adres');
{
  const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
  const db = schema();
  const env = { DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
  let ip = 1;
  const aanmelden = async (email) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ service: 'subscribe', email, phone: '+31 6 12345678', lang: 'nl', mode: 'json', subscribe: 'lead-magnet' })) fd.append(k, v);
    const res = await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.87.8.${ip++}` } }), env, waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  mails.length = 0;
  const eerste = await aanmelden('lezer@voorbeeld.test');
  ok('een nieuw adres: twee mails (de checklist en de melding aan de studio)', [eerste.status, mails.length], [200, 2]);
  mails.length = 0;
  const tweede = await aanmelden('lezer@voorbeeld.test');
  ok('hetzelfde adres nog eens: geen mail', mails.length, 0);
  ok('  maar hetzelfde antwoord (niets af te lezen)', [tweede.status, tweede.body?.ok, tweede.body?.redirect], [eerste.status, eerste.body?.ok, eerste.body?.redirect]);
  ok('  en één rij', db.prepare("SELECT COUNT(*) AS n FROM subscribers WHERE email = 'lezer@voorbeeld.test'").get().n, 1);
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
