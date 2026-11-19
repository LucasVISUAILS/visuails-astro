/*
 * LEVERING 119 · /admin en Studio — W1-08 W1-11 A0-01 P9-11 P9-03 P9-06 P9-07 P12-09 P5-16
 * 18 november 2026 (bouwer C3)
 *
 *   node tests/levering-119-admin-studio.test.mjs        (geen build nodig)
 *
 * Echte SQLite (schema.sql), nep-Resend, de echte adminGet/adminPost en accountPost.
 *   W1-08  "N wachten op betaling" en het lijstje eronder: de zin zegt waarom het lijstje korter is; ?f=unpaid toont
 *          hetzelfde getal, en de statuschips tellen met het filter mee (en houden het vast in hun link).
 *   W1-11  /admin/customers: testklanten met een label, filters Alle / Zonder test / Alleen test, en "Testklanten
 *          opruimen" (verbergt hun bestellingen, de lijst toont daarna Zonder test; terug te zetten).
 *   A0-01  de aanhef uit het veld Voornaam ("Hallo Jan Willem,"), alleen zonder voornaam het eerste woord.
 *   P9-06  na vijf foute codes een eigen zin, ook voor de goede code; een onbekend adres krijgt dezelfde zin.
 *   P12-09 /js/op-maat.js maakt bij het openen geen aanvraag meer, pas bij de eerste wijziging.
 *   P9-03 P9-07 P9-11 P5-16  teksten en opmaak, uit de bron.
 * D1-13 zit in src/components/Studiobrief.astro (niet van C3): zie lv119/notities-C3.md.
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 119: /admin en Studio (C3)\n');

const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return new Response(JSON.stringify({ id: 'msg_test' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const stil = () => { const e = console.error, w = console.warn; console.error = console.warn = () => {}; return () => { console.error = e; console.warn = w; }; };

const { adminGet, adminPost, deliveryEmail, tegoedMail, klantAanhef } = await import('../src/lib/admin.js');
const { accountPost } = await import('../src/lib/account.js');
const { aanvraagOntvangenMail } = await import('../src/lib/opMaatMail.js');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));

/* Klanten. 10 echt (betaald), 11 en 12 test (testmodus), 13 "TEST · Pieter" zonder bestelling, 14 "Testament" (geen
   test: na TEST komt een letter), 15 een merk met alleen onbetaalde echte bestellingen (geen test). */
db.exec(`
  INSERT INTO customers (id, email, name, first_name, brand, country) VALUES
    (10, 'echt@voorbeeld.test', 'Echte Klant', 'Echte', 'ECHTMERK', 'NL'),
    (11, 'proef1@voorbeeld.test', 'Proef Een', 'Proef', 'PROEFMERK', 'NL'),
    (12, 'proef2@voorbeeld.test', 'Proef Twee', 'Proef', 'TEST Lotte BV', 'NL'),
    (13, 'pieter@voorbeeld.test', 'TEST · Pieter', NULL, NULL, 'NL'),
    (14, 'testament@voorbeeld.test', 'Tess Ament', 'Tess', 'Testament', 'NL'),
    (15, 'wacht@voorbeeld.test', 'Wim Wacht', 'Wim', 'WACHTMERK', 'NL');
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const order = (velden) => {
  const k = Object.keys(velden);
  db.prepare(`INSERT INTO orders (${k.join(', ')}) VALUES (${k.map(() => '?').join(', ')})`).run(...k.map((x) => velden[x]));
};
const basis = { status: 'received', lang: 'nl', service: 'catalog', product_count: 1, tier: 'unattended', details_json: '{}', total_cents: 9000, vat_cents: 1890 };
/* W1-08: acht onbetaald met een betaallink, twee op de btw-controle, één geleverd en onbetaald, één betaald. */
for (let i = 1; i <= 8; i++) {
  order({ ...basis, id: 200 + i, ref: `VIS-W108-${i}`, customer_id: 15, email: 'wacht@voorbeeld.test', name: 'Wim Wacht', brand: 'WACHTMERK',
    payment_status: 'unpaid', created_at: `2026-11-1${i % 9} 09:00:00` });
}
order({ ...basis, id: 209, ref: 'VIS-W108-BTW1', customer_id: 15, email: 'wacht@voorbeeld.test', name: 'Wim Wacht', brand: 'WACHTMERK', payment_status: 'unpaid', review_state: 'pending' });
order({ ...basis, id: 210, ref: 'VIS-W108-BTW2', customer_id: 15, email: 'wacht@voorbeeld.test', name: 'Wim Wacht', brand: 'WACHTMERK', payment_status: 'unpaid', review_state: 'pending' });
order({ ...basis, id: 211, ref: 'VIS-W108-GELEV', customer_id: 15, email: 'wacht@voorbeeld.test', name: 'Wim Wacht', brand: 'WACHTMERK', payment_status: 'unpaid', status: 'delivered' });
order({ ...basis, id: 212, ref: 'VIS-ECHT-1', customer_id: 10, email: 'echt@voorbeeld.test', name: 'Echte Klant', brand: 'ECHTMERK', payment_status: 'paid', paid_at: '2026-11-10 09:00:00', status: 'delivered' });
/* W1-11: testbestellingen (testmodus) van 11 en 12. */
order({ ...basis, id: 220, ref: 'VIS-PROEF-1', customer_id: 11, email: 'proef1@voorbeeld.test', name: 'Proef Een', brand: 'PROEFMERK', payment_status: 'paid', paid_at: '2026-11-10 09:00:00', status: 'delivered', testmodus: 1 });
order({ ...basis, id: 221, ref: 'VIS-PROEF-2', customer_id: 12, email: 'proef2@voorbeeld.test', name: 'Proef Twee', brand: 'TEST Lotte BV', payment_status: 'paid', paid_at: '2026-11-10 09:00:00', status: 'delivered', testmodus: 1 });

const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
const env = {
  DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com', PORTAL_SALT: 'zout',
  UPLOADS: { async put() {}, async get() { return null; }, async head() { return null; }, async delete() {}, async list() { return { objects: [] }; } },
};
const headers = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };
const get = async (pad) => {
  const herstel = stil();
  try { return await (await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers }), env, waitUntil() {} })).text(); } finally { herstel(); }
};
const post = async (pad, velden) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.set(k, v);
  const herstel = stil();
  try { return await adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', body: fd, headers }), env, waitUntil() {} }); } finally { herstel(); }
};
const zonderTags = (h) => h.replace(/<[^>]+>/g, '').replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/&lsquo;|&rsquo;/g, "'").replace(/\s+/g, ' ');
const rijen = (h) => (h.match(/class="or-ref"/g) || []).length;

console.log('W1-08 · het getal en de lijst');
{
  const html = await get('/admin');
  const rand = zonderTags(html.slice(html.indexOf('class="db-rand"')));
  ok('"10 bestellingen wachten op betaling" (geleverd en betaald tellen niet)', /10 bestellingen wachten op betaling — bekijken/.test(rand), rand.slice(0, 300));
  ok('  "Hieronder de 6 oudste met een betaallink; nog 2 achter \'bekijken\'"', /Hieronder de 6 oudste met een betaallink; nog 2 achter 'bekijken'\./.test(rand), rand.slice(0, 400));
  ok('  "2 wachten nog op de btw-controle en kregen nog geen link"', /2 wachten nog op de btw-controle en kregen nog geen link\./.test(rand));
  ok('  het lijstje heeft 6 regels', (html.slice(html.indexOf('class="db-wacht"')).match(/<li>/g) || []).length === 6);
  const f = await get('/admin?f=unpaid');
  ok('?f=unpaid: 10 regels, zoals het getal', rijen(f) === 10, String(rijen(f)));
  ok('  de geleverde onbetaalde staat er niet (eigen chip "Geleverd, niet betaald")', !f.includes('VIS-W108-GELEV'));
  const alles = /Alles <span class="fl-n">(\d+)<\/span>/.exec(f);
  ok('  de chip Alles telt mee met het filter (10, niet 15)', alles && alles[1] === '10', alles && alles[1]);
  ok('  de statuschips houden het filter vast in hun link', /href="\/admin\?status=received&amp;f=unpaid"/.test(f));
  const zonder = await get('/admin');
  ok('zonder filter blijft de link precies /admin?status=received', /href="\/admin\?status=received">/.test(zonder));
  const q = await get('/admin?q=ECHTMERK');
  const a2 = /Alles <span class="fl-n">(\d+)<\/span>/.exec(q);
  ok('met een zoekterm tellen de chips de gevonden bestellingen (1)', a2 && a2[1] === '1' && rijen(q) === 1, a2 && a2[1]);
}

console.log('\nW1-11 · testklanten');
{
  const h = await get('/admin/customers');
  const rij = (merk) => { const i = h.indexOf(`>${merk}</a>`); return i < 0 ? '' : h.slice(i, h.indexOf('</td>', i)); };
  ok('PROEFMERK (testbestelling) heeft het label test', /or-let is-proef">test</.test(rij('PROEFMERK')));
  ok('"TEST Lotte BV" heeft het label', /or-let is-proef">test</.test(rij('TEST Lotte BV')));
  ok('"TEST · Pieter" zonder bestelling heeft het label', /or-let is-proef">test</.test(h.slice(h.indexOf('TEST · Pieter'), h.indexOf('TEST · Pieter') + 120)));
  ok('ECHTMERK, Testament en WACHTMERK niet', !/is-proef/.test(rij('ECHTMERK')) && !/is-proef/.test(rij('Testament')) && !/is-proef/.test(rij('WACHTMERK')));
  ok('chips: Alle klanten 6 · Zonder test 3 · Alleen test 3', /Alle klanten <span class="fl-n">6/.test(h) && /Zonder test <span class="fl-n">3/.test(h) && /Alleen test <span class="fl-n">3/.test(h));
  ok('een knop "Testklanten opruimen (3)"', /Testklanten opruimen \(3\)/.test(h));
  const z = await get('/admin/customers?f=echt');
  ok('?f=echt: geen testklant in de tabel', !/PROEFMERK|TEST Lotte BV|TEST · Pieter/.test(z.slice(z.indexOf('<table'))) && z.includes('ECHTMERK'));
  const r = await post('/admin/customers/test-opruimen', { actie: 'opruimen' });
  ok('opruimen: terug naar /admin/customers', r.status === 303 && r.headers.get('location') === '/admin/customers');
  ok('  de bestellingen van testklanten zijn verborgen', telling(db, "SELECT COUNT(*) FROM orders WHERE id IN (220, 221) AND hidden_at IS NOT NULL") === 2);
  ok('  die van echte klanten niet', telling(db, 'SELECT COUNT(*) FROM orders WHERE customer_id IN (10, 15) AND hidden_at IS NOT NULL') === 0);
  ok('  de klanten bestaan nog', telling(db, 'SELECT COUNT(*) FROM customers') === 6);
  const na = await get('/admin/customers');
  ok('daarna toont de lijst Zonder test (actief), zonder testklanten', /fl-chip is-active" aria-current="true">Zonder test/.test(na) && !/PROEFMERK/.test(na.slice(na.indexOf('<table'))));
  ok('  met "3 testklanten niet getoond"', /3 testklanten niet getoond/.test(zonderTags(na)));
  const t = await get('/admin/customers?f=test');
  ok('?f=test toont ze nog', t.slice(t.indexOf('<table')).includes('PROEFMERK'));
  await post('/admin/customers/test-opruimen', { actie: 'tonen' });
  const terug = await get('/admin/customers');
  ok('"weer gewoon tonen": de lijst toont weer alles', /fl-chip is-active" aria-current="true">Alle klanten/.test(terug));
  const log = zonderTags(await get('/admin/log'));
  ok('het logboek noemt het', /Testklanten opgeruimd/.test(log));
}

console.log('\nA0-01 · de aanhef uit het veld Voornaam');
{
  const o = { ref: 'VIS-A001', lang: 'nl', email: 'jw@voorbeeld.test', name: 'Jan Willem de Vries', first_name: 'Jan Willem', service: 'catalog', details_json: '{}' };
  ok('klantAanhef: "Hallo Jan Willem,"', klantAanhef(o) === 'Hallo Jan Willem,', klantAanhef(o));
  ok('  zonder voornaam het oude gedrag: "Hallo Jan,"', klantAanhef({ ...o, first_name: null }) === 'Hallo Jan,');
  ok('  Engels: "Hello Anne Marie,"', klantAanhef({ ...o, lang: 'en', first_name: 'Anne Marie' }) === 'Hello Anne Marie,');
  ok('  de voornaam wordt geëscaped', klantAanhef({ ...o, first_name: '<b>Jo</b>' }).includes('&lt;b&gt;Jo&lt;/b&gt;'));
  const herstel = stil();
  let lever = '';
  try { lever = String(deliveryEmail({ order: o, link: 'https://visuails.com/o/x', n: 4 })); } finally { herstel(); }
  ok('de levermail zegt "Hallo Jan Willem,"', lever.includes('Hallo Jan Willem,'));
  const tegoed = tegoedMail({ naam: 'Jan Willem de Vries', voornaam: 'Jan Willem', lang: 'nl', cents: 1500, reden: 'Test.', saldoCents: 1500, studio: 'https://visuails.com/account' });
  ok('de tegoedmail ook', tegoed.includes('Hallo Jan Willem,'));
  const om = aanvraagOntvangenMail({ id: 1, dienst: 'hooks', taal: 'nl', inhoud: {}, email: 'a@voorbeeld.test', name: 'Anne Marie Test', first_name: 'Anne Marie' }, 'https://visuails.com');
  ok('de mail op maat ook ("Hallo Anne Marie,")', JSON.stringify(om).includes('Hallo Anne Marie,'));
  const admin = lees('src/lib/admin.js');
  ok('de mails lezen first_name in hun SELECT (levermail, nieuwe link, aankondiging, btw)',
    /SELECT id, ref, email, name, first_name, lang, service, details_json, delivery_mailed_at FROM orders/.test(admin)
    && /'SELECT id, ref, email, name, first_name, lang, status, delivery_mailed_at FROM orders WHERE id = \?1'/.test(admin)
    && /lang, email, name, first_name, details_json, payment_status, country/.test(admin));
  ok('geen mailGreeting(order.name meer in admin.js', !/mailGreeting\(order\.name/.test(admin));
}

console.log('\nP9-06 · te vaak geprobeerd');
{
  db.exec(`INSERT INTO customers (id, email, name) VALUES (30, 'code@voorbeeld.test', 'Kees')`);
  const CODE = '048210';
  db.exec('DELETE FROM account_tokens; DELETE FROM rate_limits;');
  db.prepare('INSERT INTO account_tokens (id, customer_id, token_hash, expires_at, code_hash, code_expires_at) VALUES (1, 30, ?, ?, ?, ?)')
    .run('link-p906', new Date(Date.now() + 3600e3).toISOString(), await hashToken(`30:${CODE}`), new Date(Date.now() + 600e3).toISOString());
  let ip = 0;
  const raad = async (email, code) => {
    const herstel = stil();
    try {
      const r = await accountPost({ request: new Request('https://visuails.com/account/code', {
        method: 'POST', body: new URLSearchParams({ email, code, lang: 'nl' }),
        headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://visuails.com', 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': `203.0.113.${++ip}` },
      }), env, waitUntil: () => {} });
      return { status: r.status, tekst: zonderTags(await r.text()) };
    } finally { herstel(); }
  };
  const eerst = await raad('code@voorbeeld.test', '111111');
  ok('één foute code: de gewone zin', /Die code klopt niet of is verlopen/.test(eerst.tekst) && !/Te vaak geprobeerd/.test(eerst.tekst));
  for (let i = 0; i < 4; i++) await raad('code@voorbeeld.test', `22222${i}`);
  const goed = await raad('code@voorbeeld.test', CODE);
  ok('na vijf foute codes zegt de goede code "Te vaak geprobeerd"', goed.status !== 303 && /Te vaak geprobeerd\. Na vijf pogingen werkt deze code niet meer, ook de goede niet\./.test(goed.tekst), goed.tekst.slice(0, 200));
  ok('  en niet "klopt niet"', !/Die code klopt niet/.test(goed.tekst));
  for (let i = 0; i < 5; i++) await raad('onbekend@voorbeeld.test', `33333${i}`);
  const onbekend = await raad('onbekend@voorbeeld.test', '444444');
  ok('een onbekend adres krijgt na vijf pogingen dezelfde zin (niets te lezen over het account)', /Te vaak geprobeerd/.test(onbekend.tekst));
  const acc = lees('src/lib/account.js');
  ok('NL en EN', /codeTeVaak: 'Too many tries\./.test(acc) && /codeTeVaak: 'Te vaak geprobeerd\./.test(acc));
}

console.log('\nP12-09 · alleen kijken maakt geen aanvraag');
{
  const bron = lees('public/js/op-maat.js');
  const maak = (dienst) => {
    const aanroepen = [];
    const luisteraars = {};
    const leeg = { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, textContent: '' };
    const om = { dataset: { dienst, id: '', versie: '', taal: 'nl', bewerk: '1' } };
    const form = { addEventListener: (soort, fn) => { luisteraars[soort] = fn; }, querySelectorAll: () => [], querySelector: () => null };
    const document = {
      getElementById: (id) => (id === 'om' ? om : id === 'om-form' ? form : id === 'om-stand' ? { textContent: '' } : null),
      querySelector: () => null, querySelectorAll: () => [],
    };
    let volgnr = 0;
    const fetch = (url, opts = {}) => {
      const body = opts.body ? JSON.parse(opts.body) : null;
      aanroepen.push(body ? body.doe : `GET ${url}`);
      const antwoord = body && body.doe === 'begin' ? { ok: true, aanvraag: { id: 77, versie: 1, inhoud: {} } } : { ok: true, aanvraag: { versie: 2 + (volgnr++) } };
      return Promise.resolve({ status: 200, json: () => Promise.resolve(antwoord) });
    };
    const history = { pad: '', replaceState(_a, _b, p) { this.pad = p; } };
    const location = { replace(p) { aanroepen.push(`replace ${p}`); } };
    vm.runInNewContext(bron, { document, fetch, history, location, setTimeout, clearTimeout, Promise, JSON, Number, Math, Object, Array, String, Event: class {}, console }, { filename: 'op-maat.js' });
    return { aanroepen, luisteraars, history, leeg };
  };
  const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
  const k = maak('hooks');
  await wacht(50);
  ok('openen met ?dienst=hooks: geen enkele POST (geen begin, geen merk)', k.aanroepen.length === 0, k.aanroepen.join(','));
  k.luisteraars.input({ target: { matches: () => false } });
  await wacht(700);
  ok('de eerste wijziging: eerst begin, dan opslaan', k.aanroepen[0] === 'begin' && k.aanroepen.includes('opslaan'), k.aanroepen.join(','));
  ok('  en de adresbalk wijst naar de nieuwe aanvraag', k.history.pad === '/account/op-maat?id=77');
  ok('  één keer begin, ook bij meer wijzigingen', (k.luisteraars.input({ target: { matches: () => false } }), await wacht(700), k.aanroepen.filter((x) => x === 'begin').length === 1), k.aanroepen.join(','));
  const acc = lees('src/lib/account.js');
  ok('Studio opent een bestaand concept van die dienst zelf (seeOther naar ?id=)', /a\.dienst === gevraagd && a\.stand === 'concept'/.test(acc) && /return seeOther\(`\/account\/op-maat\?id=\$\{concept\.id\}`\)/.test(acc));
}

console.log('\nP5-16 · Op maat noemt alleen prijzen van de site');
{
  const astro = lees('src/pages/account/op-maat.astro');
  const tegels = astro.slice(astro.indexOf('<div class="om-tegels">'), astro.indexOf('</div>', astro.indexOf('<div class="om-tegels">')));
  ok('geen "per set van 4", geen €… per seconde en geen LADDER-trede op de tegels', !/per set van 4|VIDEO_PER_SECONDE|LADDER/.test(tegels));
  ok('catalog en lifestyle: het vanaf-bedrag van de site (ladderFloor)', /euro\(ladderFloor\('catalog'\), taal\)/.test(astro) && /euro\(ladderFloor\('lifestyle'\), taal\)/.test(astro));
  ok('video: videoPrijsLabel() ("op aanvraag" zolang VIDEO_OP_AANVRAAG aanstaat)', /videoPrijsLabel\(taal/.test(astro) && /<b>Video<\/b><span>\{videoTegel\}<\/span>/.test(tegels));
  ok('hooks: "vanaf", zoals /hooks', /daarna vanaf \$\{vanaf\.hooks\} per hook/.test(tegels));
  const { videoPrijsLabel, ladderFloor, euro } = await import('../src/data/pricing.js');
  ok('  de woorden zelf: "vanaf €40" en "op aanvraag"', euro(ladderFloor('catalog'), 'nl') === '€40' && videoPrijsLabel('nl') === 'op aanvraag', `${euro(ladderFloor('catalog'), 'nl')} / ${videoPrijsLabel('nl')}`);
  ok('de schuif bij video noemt geen bedrag per seconde zolang video op aanvraag is', /VIDEO_OP_AANVRAAG \? L\(`minimaal \$\{VIDEO_MIN_SECONDEN\}`/.test(astro));
  const js = lees('public/js/op-maat.js');
  ok('een geweigerde referentie zegt waarom (soort, groot, vol)', /case 'soort': return T\('Niet toegevoegd: dit soort bestand kan niet\. Alleen jpg, png, webp, heic, mp4 of mov\.'/.test(js) && /case 'groot'/.test(js) && /case 'vol'/.test(js));
  ok('  de grenzen komen uit REF_BYTES en REF_MAX (data-max-mb, data-max-n)', /data-max-mb=\{refMb\} data-max-n=\{REF_MAX\}/.test(astro) && /REF_BYTES \/ \(1024 \* 1024\)/.test(astro));
}

console.log('\nP9-03 · P9-07 · P9-11 · teksten in Studio');
{
  const acc = lees('src/lib/account.js');
  ok('P9-03: geen "stap 5" of "step 5" meer in de teksten van Studio', !/In stap 5|in stap 5|In step 5|in step 5/.test(acc));
  ok('  "in de laatste stap, Betalen" / "the last step, Pay"', /in de laatste stap, Betalen/.test(acc) && /the last step, Pay/.test(acc));
  ok('P9-07: in Studio "Je bent ingelogd, dus je gegevens staan er al in"', /Je bent ingelogd, dus je gegevens staan er al in\./.test(acc) && /herbestel: o\.status === 'delivered' && !ingetrokken \? studioHerbestel\(/.test(acc));
  const { herbestelKnop } = await import('../src/lib/herbestel.js');
  ok('  de privélink (herbestel.js) houdt zijn eigen tekst', /of je logt in/.test(herbestelKnop({ service: 'catalog', details_json: '{}' }, { lang: 'nl' }).uitleg));
  const plan = lees('src/pages/account/plan.astro');
  ok('P9-11: met een klaargezette overstap staat de lijst in <details> onder "Toch een ander plan kiezen"', /const OvWikkel = v\.overstap\?\.klaar \? 'details' : 'div';/.test(plan) && /<summary class="st-link">\{v\.overstap\.klaar\.anders\}<\/summary>/.test(plan) && /anders: L === 'nl' \? 'Toch een ander plan kiezen' : 'Choose another plan after all'/.test(acc));
}

console.log(`\n${pass} goed, ${fail} fout`);
if (fail) process.exit(1);
