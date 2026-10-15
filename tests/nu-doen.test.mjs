/* VISUAILS — de Nu-doen-lijst bovenaan /admin en het nachtrapport (punt 4.05, V36 = a).
 *   node tests/nu-doen.test.mjs          (geen server, geen browser)
 *
 *   1 · de vaste volgorde: btw → leveren → revisie → oppakken → foto's → offerte
 *       → review; binnen een soort de oudste eerst, een vaste dag vóór de rest;
 *       onbetaald staat er niet in; hoogstens twee databaseverzoeken;
 *   2 · het dashboard: de lijst staat bovenaan (vóór de tegels), één knop per
 *       regel, de btw-chip is erin opgegaan; leeg zegt "Niets wacht op jou";
 *       een onleesbare lijst zegt dat, nooit "niets";
 *   3 · het nachtrapport: dezelfde regels in dezelfde volgorde, en het komt
 *       altijd — leeg met het onderwerp "… — niets open";
 *   4 · de bestelpagina begint met "Volgende stap: …", en de knop springt naar
 *       het blok dat hij noemt;
 *   5 · "N nieuwe beelden melden" vanuit de lijst gaat terug naar het dashboard
 *       met "gemeld aan de klant — N beelden", en de regel is weg.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import cron, { RAPPORT } from '../cron/index.js';
import { nuDoen, nuDoenHtml, nuDoenTekst, rapportOnderwerp, NU_DOEN_SOORTEN, FOTO_DIENSTEN, NIETS_WACHT } from '../src/lib/nudoen.js';
import { nieuweMeter, metMeter } from '../src/lib/meetlat.js';
import { REVIEW_GEVRAAGD } from '../src/lib/waLink.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

const gezien = [];
globalThis.fetch = async (url, opts = {}) => {
  gezien.push({ url: String(url), body: opts.body ? String(opts.body) : '' });
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const resendMails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));

const BASIS = { RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };

async function adminSessie(db, env) {
  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
  const token = await mintToken();
  db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(token));
  const get = async (pad) => {
    const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
    return { status: res.status, html: await res.text() };
  };
  const post = async (pad, velden = {}) => {
    const res = await adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(velden).toString() }), env, waitUntil() {} });
    return { status: res.status, html: await res.text(), location: res.headers.get('location') };
  };
  return { get, post };
}

/* ── De vulling: elke soort, plus wat er NIET in hoort ─────────────────────── */
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const env = { DB: d1(db), ...BASIS };
db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES
    (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL'),
    (2, 'lena@muster-mode.test', 'Lena Muster', 'MUSTER', '+49 151 23456789', 'DE');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone, total_cents, vat_cents, lang, product_count, payment_status, country, review_state, created_at, paid_at, window_start, delivered_at, delivery_mailed_at, closed_at) VALUES
    (31, 'VIS-ND-0031', 1, 'catalog',     'received',      'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'unpaid', 'NL', 'pending',  datetime('now','-5 hours'), NULL, NULL, NULL, NULL, NULL),
    (32, 'VIS-ND-0032', 1, 'catalog',     'human_check',   'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', datetime('now','-6 days'),  datetime('now','-6 days'), NULL, NULL, NULL, NULL),
    (33, 'VIS-ND-0033', 2, 'catalog',     'delivered',     'Lena Muster',     'MUSTER', 'lena@muster-mode.test',     '+49 151 23456789', 10000, 0, 'en', 2, 'paid', 'DE', 'approved', datetime('now','-9 days'),  datetime('now','-9 days'), NULL, datetime('now','-4 days'), datetime('now','-4 days'), NULL),
    (34, 'VIS-ND-0034', 1, 'catalog',     'delivered',     'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', datetime('now','-8 days'),  datetime('now','-8 days'), NULL, datetime('now','-3 days'), datetime('now','-3 days'), NULL),
    (35, 'VIS-ND-0035', 2, 'catalog',     'delivered',     'Lena Muster',     'MUSTER', 'lena@muster-mode.test',     '+49 151 23456789', 10000, 0, 'en', 1, 'paid', 'DE', 'approved', datetime('now','-8 days'),  datetime('now','-8 days'), NULL, datetime('now','-4 days'), datetime('now','-4 days'), NULL),
    (36, 'VIS-ND-0036', 1, 'brand-model', 'received',      'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 45000, 9450, 'nl', 1, 'paid',   'NL', 'approved', datetime('now','-50 hours'), datetime('now','-50 hours'), NULL, NULL, NULL, NULL),
    (37, 'VIS-ND-0037', 1, 'catalog',     'received',      'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', datetime('now','-1 hours'), datetime('now','-1 hours'), '2026-10-20', NULL, NULL, NULL),
    (38, 'VIS-ND-0038', 1, 'catalog',     'received',      'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', datetime('now','-49 hours'), datetime('now','-49 hours'), NULL, NULL, NULL, NULL),
    (39, 'VIS-ND-0039', 1, 'catalog',     'received',      'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', datetime('now','-3 hours'), datetime('now','-3 hours'), NULL, NULL, NULL, NULL),
    (40, 'VIS-ND-0040', 1, 'custom',      'received',      'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 0, 0,         'nl', 0, 'unpaid', 'NL', NULL,       datetime('now','-2 days'),  NULL, NULL, NULL, NULL, NULL),
    (41, 'VIS-ND-0041', 1, 'catalog',     'delivered',     'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', datetime('now','-20 days'), datetime('now','-20 days'), NULL, datetime('now','-10 days'), datetime('now','-10 days'), datetime('now','-2 hours')),
    (42, 'VIS-ND-0042', 1, 'catalog',     'received',      'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'unpaid', 'NL', 'approved', datetime('now','-2 days'),  NULL, NULL, NULL, NULL, NULL),
    (43, 'VIS-ND-0043', 1, 'catalog',     'delivered',     'Sanne Voorbeeld', 'VOLT',   'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', datetime('now','-20 days'), datetime('now','-20 days'), NULL, datetime('now','-10 days'), datetime('now','-10 days'), datetime('now','-3 hours'));
  INSERT INTO order_events (order_id, status, note, actor) VALUES (43, 'delivered', '${REVIEW_GEVRAAGD}', 'intern');
  -- 33: twee nieuwe beelden, en een revisie die na de laatste mail is afgehandeld
  INSERT INTO files (id, order_id, kind, r2_key, product_key, shot, review_state, announced_at, superseded_at, created_at) VALUES
    (330, 33, 'delivery', 'lever/33/oud.jpg',  'p1', 'front', 'approved', datetime('now','-4 days'), datetime('now','-1 days'), datetime('now','-4 days')),
    (331, 33, 'delivery', 'lever/33/a.jpg',    'p1', 'front', 'pending',  NULL, NULL, datetime('now','-20 hours')),
    (332, 33, 'delivery', 'lever/33/b.jpg',    'p2', 'back',  'pending',  NULL, NULL, datetime('now','-19 hours')),
    (340, 34, 'delivery', 'lever/34/a.jpg',    'p1', 'front', 'revision_requested', datetime('now','-3 days'), NULL, datetime('now','-3 days')),
    (350, 35, 'delivery', 'lever/35/a.jpg',    'p1', 'front', 'revision_requested', datetime('now','-4 days'), NULL, datetime('now','-4 days')),
    (380, 38, 'upload',   'intake/38/front.jpg', 'p1', 'front', 'pending', NULL, NULL, datetime('now','-49 hours')),
    (390, 39, 'upload',   'intake/39/front.jpg', 'p1', 'front', 'pending', NULL, NULL, datetime('now','-3 hours'));
  UPDATE files SET reviewed_at = datetime('now','-1 days') WHERE id = 340;
  UPDATE files SET reviewed_at = datetime('now','-3 days') WHERE id = 350;
  INSERT INTO revision_requests (file_id, order_id, customer_id, note, created_at, resolved_at, resolution_note) VALUES
    (330, 33, 2, 'The colour is off', datetime('now','-2 days'), NULL, NULL);
`);

/* ══ 1 · DE VASTE VOLGORDE ═══════════════════════════════════════════════════ */
console.log('\n1 · de vaste volgorde');
const meter = nieuweMeter();
const lijst = await nuDoen(metMeter(env, meter).DB);
ok('geen fout', lijst.fout, null);
const paren = lijst.regels.map((r) => `${r.soort}:${r.ref.slice(-2)}`);
ok('de volgorde van de regels', paren, [
  'btw:31', 'leveren:32', 'leveren:33', 'revisie:35', 'revisie:34',
  'oppakken:37', 'oppakken:36', 'oppakken:38', 'oppakken:39', 'fotos:38', 'offerte:40', 'review:41',
]);
ok('de soorten volgen NU_DOEN_SOORTEN', [...new Set(lijst.regels.map((r) => r.soort))], NU_DOEN_SOORTEN.filter((s) => lijst.regels.some((r) => r.soort === s)));
ok('revisies: de oudste eerst (35 vóór 34)', paren.indexOf('revisie:35') < paren.indexOf('revisie:34'));
ok('oppakken: een vaste dag eerst, dan de oudste', paren.filter((p) => p.startsWith('oppakken')), ['oppakken:37', 'oppakken:36', 'oppakken:38', 'oppakken:39']);
ok('foto\'s ontbreken: pas na een dag (39 is van vandaag)', paren.includes('fotos:39'), false);
ok('foto\'s ontbreken telt twee foto\'s bij 38', lijst.regels.find((r) => r.soort === 'fotos').n, 2);
ok('onbetaald staat er niet in (42)', lijst.regels.some((r) => r.id === 42), false);
ok('review al gevraagd staat er niet in (43)', lijst.regels.some((r) => r.id === 43), false);
const nieuw = lijst.regels.find((r) => r.id === 33);
ok('33: twee nieuwe beelden, revisie afgehandeld', [nieuw.extra, nieuw.n, nieuw.n2 > 0], ['nieuw', 2, true]);
ok('hoogstens twee databaseverzoeken (de nacht heeft er vijftig)', meter.d1 <= 2, true);
ok('NASTUUR_DIENSTEN in admin.js = FOTO_DIENSTEN', (() => {
  const m = /const NASTUUR_DIENSTEN = new Set\(\[([^\]]*)\]\)/.exec(readFileSync(new URL('../src/lib/admin.js', import.meta.url), 'utf8'));
  return m ? m[1].split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean) : null;
})(), [...FOTO_DIENSTEN]);

/* ══ 2 · HET DASHBOARD ═══════════════════════════════════════════════════════ */
console.log('\n2 · het dashboard');
const { get, post } = await adminSessie(db, env);
const dash = await get('/admin');
ok('dashboard laadt', dash.status, 200);
const h = dash.html;
ok('de lijst staat bovenaan: vóór de tegels en vóór de bestellingen', h.indexOf('id="nu-doen"') > -1 && h.indexOf('id="nu-doen"') < h.indexOf('class="stats"') && h.indexOf('id="nu-doen"') < h.indexOf('<h2>Bestellingen'));
const items = [...h.matchAll(/<li class="nd-regel"[\s\S]*?<\/li>/g)].map((m) => m[0]);
ok('één regel per item in de lijst', items.length, lijst.regels.length);
ok('één knop per regel', items.map((li) => (li.match(/<a |<button /g) || []).length), items.map(() => 1));
ok('de regels in dezelfde volgorde als nuDoen()', items.map((li) => /VIS-ND-00(\d\d)/.exec(li)[1]), lijst.regels.map((r) => r.ref.slice(-2)));
const knop = (id, soort) => items.find((li) => li.includes(`VIS-ND-00${id}`) && li.includes(`data-soort="${soort}"`)) || '';
ok('btw → Beoordelen (/admin/vat)', /href="\/admin\/vat">Beoordelen</.test(knop(31, 'btw')));
ok('In controle → Leverkeuring (bestelpagina, #melden)', /href="\/admin\/orders\/32\/files#melden">Leverkeuring</.test(knop(32, 'leveren')));
ok('afgehandeld, niet gemeld → een echte knop "2 nieuwe beelden melden" terug naar het dashboard',
  /<form class="nd-knop" method="post" action="\/admin\/orders\/33\/announce"><input type="hidden" name="terug" value="dashboard"><button[^>]*>2 nieuwe beelden melden<\/button><\/form>/.test(knop(33, 'leveren')));
ok('revisie → Revisie openen (de kaart op dit dashboard)', /href="#rev-350">Revisie openen</.test(knop(35, 'revisie')) && h.includes('id="rev-350"'));
/* Doorloop 27 (B03): Oppakken is één klik — hij zet de status zelf op In
   productie en landt op de bestelpagina. */
ok('betaald, niet opgepakt → Oppakken: een echte knop die de status op In productie zet',
  /<form class="nd-knop" method="post" action="\/admin\/orders\/36\/status"><input type="hidden" name="status" value="in_production"><input type="hidden" name="back" value="files"><button[^>]*>Oppakken<\/button><\/form>/.test(knop(36, 'oppakken')));
ok('foto\'s ontbreken → Foto’s vragen (#ontbreekt)', /href="\/admin\/orders\/38\/files#ontbreekt">Foto’s vragen</.test(knop(38, 'fotos')));
ok('aanvraag → Offerte maken (#offerte)', /href="\/admin\/orders\/40\/files#offerte">Offerte maken</.test(knop(40, 'offerte')));
ok('afgerond → Review vragen, het reviewformulier in een nieuw tabblad', /action="\/admin\/orders\/41\/review-wa" target="_blank">.*Review vragen/.test(knop(41, 'review')));
ok('de btw-chip bij de bewakers is opgegaan in de lijst', /href="\/admin\/vat">Btw-controle &middot;/.test(h), false);
ok('de zijkolom "Eerst af" blijft (planning, tests/planning-scherm)', /Eerst af/.test(h) && /db-aflopend/.test(h));

/* ══ 3 · HET NACHTRAPPORT ════════════════════════════════════════════════════ */
console.log('\n3 · het nachtrapport');
{
  gezien.length = 0;
  const uit = await RAPPORT.sendReport(env, ['iets uit het logboek'], [], lijst);
  const mail = resendMails()[0] || {};
  ok('één mail aan Lucas', resendMails().length, 1);
  ok('onderwerp: "Vandaag · … — 12 wachten op jou"', /^Vandaag · \S+ \d{1,2} \S+ — 12 wachten op jou$/.test(mail.subject || ''), true);
  ok('de tekst begint met NU DOEN', (mail.text || '').startsWith('NU DOEN — 12 dingen'), true);
  const refsMail = [...(mail.text || '').matchAll(/^\s+\d+\. .*?VIS-ND-00(\d\d)/gm)].map((m) => m[1]);
  ok('dezelfde regels in dezelfde volgorde als het dashboard', refsMail, items.map((li) => /VIS-ND-00(\d\d)/.exec(li)[1]));
  ok('elke regel met de knop als link', /Beoordelen: https:\/\/visuails\.com\/admin\/vat/.test(mail.text) && /2 nieuwe beelden melden: https:\/\/visuails\.com\/admin\/orders\/33\/files#melden/.test(mail.text) && /Review vragen: https:\/\/visuails\.com\/admin\/orders\/41\/files#review/.test(mail.text));
  ok('daarna het logboek', mail.text.indexOf('Wat er gebeurd is:') > mail.text.indexOf('NU DOEN'));
  ok('en niet meer "Geen mail betekent"', /Geen mail betekent/.test(mail.text), false);
  ok('sendReport geeft onderwerp en tekst terug', uit.onderwerp, mail.subject);
}
{
  const leeg = { regels: [], fout: null };
  ok('leeg: onderwerp "… — niets open"', /— niets open$/.test(rapportOnderwerp({ aantal: 0 })), true);
  ok('leeg met een fout in de nacht: "er ging iets mis · niets open"', /— er ging iets mis · niets open$/.test(rapportOnderwerp({ aantal: 0, problemen: 1 })), true);
  ok('één: "1 wacht op jou"', /— 1 wacht op jou$/.test(rapportOnderwerp({ aantal: 1 })), true);
  ok('onleesbare lijst: nooit "niets open"', /niets open/.test(rapportOnderwerp({ fout: true })), false);
  ok('leeg: de eerste regel zegt "Niets wacht op jou"', nuDoenTekst(leeg)[0], `NU DOEN — ${NIETS_WACHT} Nieuwe bestellingen komen hier vanzelf bij.`);
}
{
  /* De hele nacht op een lege database: het rapport komt toch. */
  const leeg = verseDb(new URL('../schema.sql', import.meta.url)).db;
  gezien.length = 0;
  const wachten = [];
  await cron.scheduled({}, { DB: d1(leeg), ...BASIS, PURGE_ENABLED: 'false', WORKERS_PLAN: 'gratis' }, { waitUntil(p) { wachten.push(p); } });
  await Promise.all(wachten);
  const rapport = resendMails().find((m) => /^Vandaag · /.test(m.subject || ''));
  ok('V36: niets open → het rapport komt toch', Boolean(rapport), true);
  ok('  met het onderwerp "… — niets open"', /— niets open$/.test(rapport?.subject || ''), true, rapport?.subject);
  ok('  en "Niets wacht op jou" bovenaan', (rapport?.text || '').startsWith(`NU DOEN — ${NIETS_WACHT}`), true);
}
{
  /* En met een vol bord: de nacht stuurt dezelfde lijst. */
  gezien.length = 0;
  const wachten = [];
  await cron.scheduled({}, { ...env, PURGE_ENABLED: 'false', WORKERS_PLAN: 'gratis' }, { waitUntil(p) { wachten.push(p); } });
  await Promise.all(wachten);
  const rapport = resendMails().find((m) => /^Vandaag · /.test(m.subject || ''));
  ok('vol: het onderwerp telt wat er wacht', /— (er ging iets mis · )?\d+ wachten op jou$/.test(rapport?.subject || ''), true, rapport?.subject);
  ok('  "Afgerond gisteren" staat er niet meer los in (zit in de lijst als Review vragen)', /Afgerond gisteren/.test(rapport?.text || ''), false);
  ok('  41 staat erin als Review vragen', /Afgerond · VIS-ND-0041/.test(rapport?.text || ''), true);
}

/* ══ 2b · LEEG EN ONLEESBAAR OP HET SCHERM ═══════════════════════════════════ */
console.log('\n2b · leeg en onleesbaar');
{
  const leegDb = verseDb(new URL('../schema.sql', import.meta.url)).db;
  const leegEnv = { DB: d1(leegDb), ...BASIS };
  const s = await adminSessie(leegDb, leegEnv);
  const { html } = await s.get('/admin');
  ok('lege lijst: "Niets wacht op jou."', html.includes(`<strong>${NIETS_WACHT}</strong> Nieuwe bestellingen komen hier vanzelf bij.`));
  ok('  en geen lijst-element', /class="nd-lijst"/.test(html), false);
  const stuk = nuDoenHtml(await nuDoen({ prepare() { throw new Error('no such table: orders'); } }));
  ok('onleesbaar: zegt dat, met de reden', /kon niet gelezen worden \(no such table: orders\)/.test(stuk));
  ok('  en nooit "Niets wacht op jou"', stuk.includes(NIETS_WACHT), false);
  ok('zonder database: een fout, geen lege lijst', (await nuDoen(null)).fout, 'geen database');
}

/* ══ 4 · VOLGENDE STAP OP DE BESTELPAGINA ════════════════════════════════════ */
console.log('\n4 · "Volgende stap" op de bestelpagina');
const stap = (html) => {
  const na = html.slice(html.indexOf('</h1>'));
  return na.slice(0, 900);
};
{
  const { status, html } = await get('/admin/orders/36/files');
  ok('bestelpagina laadt', status, 200);
  ok('de pagina begint (na de kop) met "Volgende stap:"', /^<\/h1>\s*<div class="volgende-stap"><p><strong>Volgende stap:<\/strong> Oppakken/.test(stap(html)));
  ok('  de knop zet de status zelf (één klik), en het lijstje blijft er voor de rest', /action="\/admin\/orders\/36\/status"><input type="hidden" name="status" value="in_production">/.test(stap(html)) && /<form class="controls kop-status" id="status"/.test(html));
}
{
  const { html } = await get('/admin/orders/38/files');
  ok('betaald en foto\'s mist: Oppakken, daarna foto’s vragen', /Volgende stap:<\/strong> Oppakken[\s\S]*Daarna: foto’s vragen/.test(stap(html)));
}
{
  const { html } = await get('/admin/orders/33/files');
  ok('afgehandelde revisie: "2 nieuwe beelden melden" → #melden', /Volgende stap:<\/strong> 2 nieuwe beelden melden[\s\S]*href="#melden"/.test(stap(html)) && /<h2 id="melden">/.test(html));
}
{
  /* Doorloop 27 (B10): op de bestelpagina springt "Revisie openen" naar het
     vakje zelf, niet terug naar het dashboard. */
  const { html } = await get('/admin/orders/35/files');
  ok('revisie: "Revisie openen" → het vakje op deze pagina (#rev-350)', /Volgende stap:<\/strong> Revisie openen[\s\S]*href="#rev-350"/.test(stap(html)) && /class="slot is-revising[^"]*" id="rev-350"/.test(html));
}
{
  const { html } = await get('/admin/orders/40/files');
  ok('aanvraag: "Offerte maken" → #offerte', /Volgende stap:<\/strong> Offerte maken[\s\S]*href="#offerte"/.test(stap(html)) && /<h3 id="offerte">Offerte<\/h3>/.test(html));
}
{
  const { html } = await get('/admin/orders/42/files');
  ok('onbetaald: "niets, de bestelling wacht op betaling"', /Volgende stap:<\/strong> niets, de bestelling wacht op betaling\./.test(stap(html)));
}
{
  const { html } = await get('/admin/orders/43/files');
  ok('afgerond en gevraagd: "niets, de bestelling is afgerond"', /Volgende stap:<\/strong> niets, de bestelling is afgerond\./.test(stap(html)));
}

/* ══ 5 · MELDEN VANUIT DE LIJST ══════════════════════════════════════════════ */
console.log('\n5 · melden vanuit de lijst');
{
  gezien.length = 0;
  const r = await post('/admin/orders/33/announce', { terug: 'dashboard' });
  ok('terug naar het dashboard met de bevestiging', [r.status, r.location], [303, '/admin?gemeld=VIS-ND-0033&n=2']);
  ok('de klant kreeg één mail (Engels, revisie)', resendMails().filter((m) => /Your revision is ready — VIS-ND-0033/.test(m.subject)).length, 1);
  const { html } = await get(r.location);
  ok('"VIS-ND-0033: gemeld aan de klant — 2 beelden."', html.includes('VIS-ND-0033: gemeld aan de klant &mdash; 2 beelden.'));
  ok('en de regel is weg uit de lijst', /data-soort="leveren"[\s\S]{0,400}VIS-ND-0033/.test(html), false);
  const nogEens = await post('/admin/orders/33/announce', { terug: 'dashboard' });
  ok('nog een keer: niets nieuws, geen mail, terug met "niets"', nogEens.location, '/admin?gemeld=niets');
  const zonder = await post('/admin/orders/32/announce', {});
  ok('zonder terug=dashboard blijft het gedrag van de bestelpagina', zonder.status, 400);
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
