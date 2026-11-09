/* VISUAILS — ronde 91, w1 en w11 (lijst 85, A1 en D32 = goed): Nu doen is de enige werklijst.
 *   node tests/blind91-w-nu-doen.test.mjs        (geen server, geen browser)
 *
 *   1 · met een vaste klok (do 26 november 2026, 10:00 in Amsterdam):
 *       · VOORRANG bovenaan de hele lijst, met de echte voorrangstijd (voorrangDeadline: betaald woensdag na
 *         15:00 → vrijdag 17:00);
 *       · oppakken en In productie samen op de dag waarop het af moet; In productie alleen vanaf "morgen af" of
 *         te laat (een vaste dag volgende week staat er niet in, op de bestelpagina wel);
 *       · één regel per bestelling: In productie mét ontbrekende foto's is één regel met "ook: foto's vragen";
 *       · "Foto's ontbreken" blijft na Oppakken staan tot er geleverd is (w2);
 *       · open PNG/WebP-verzoeken ("PNG/WebP gevraagd" → Formaten);
 *       · de maandset (w11): vanaf de 25e de set van volgende maand, zolang er lopende abonnementen zijn; de set
 *         van deze maand altijd; zonder abonnees niets;
 *       · hoogstens twee databaseverzoeken (de nacht heeft er vijftig);
 *   2 · het nachtrapport leest dezelfde lijst, met "ook …" eronder;
 *   3 · het dashboard (echte klok): "Eerst af" is weg, In productie staat in Nu doen, de Formaten-chip bij de
 *       bewakers is opgegaan in de lijst; de planning heeft geen lijst Aflopend meer.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { nuDoen, nuDoenHtml, nuDoenTekst, soortLabel, watTekst, knopVoor, volgendeStapHtml, NU_DOEN_SOORTEN } from '../src/lib/nudoen.js';
import { agendaUiterlijk } from '../src/lib/agenda.js';
import { nieuweMeter, metMeter } from '../src/lib/meetlat.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? 'ok  ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

/* ══ 1 · MET EEN VASTE KLOK ══════════════════════════════════════════════════ */
console.log('\n1 · de lijst op donderdag 26 november 2026, 10:00');
const NU = Date.parse('2026-11-26T09:00:00Z');
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const env = { DB: d1(db) };
db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, tier, name, brand, email, total_cents, vat_cents, lang, product_count, payment_status, country, review_state, created_at, paid_at, window_start, window_end, delivered_at, delivery_mailed_at, details_json) VALUES
    (101, 'VIS-W-0101', 1, 'catalog', 'received',      'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', '2026-11-25 15:55:00', '2026-11-25 16:00:00', NULL, NULL, NULL, NULL, '{"voorrang":1,"product_p1":"Jas"}'),
    (102, 'VIS-W-0102', 1, 'catalog', 'received',      'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 0,    'nl', 1, 'unpaid', 'NL', 'pending',  '2026-11-26 07:00:00', NULL, NULL, NULL, NULL, NULL, NULL),
    (103, 'VIS-W-0103', 1, 'catalog', 'in_production', 'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', '2026-11-24 10:00:00', '2026-11-24 10:00:00', NULL, NULL, NULL, NULL, NULL),
    (104, 'VIS-W-0104', 1, 'catalog', 'in_production', 'attended',   'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 12, 'paid',  'NL', 'approved', '2026-11-20 10:00:00', '2026-11-20 10:00:00', '2026-12-01', '2026-12-02', NULL, NULL, NULL),
    (105, 'VIS-W-0105', 1, 'catalog', 'in_production', 'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', '2026-11-26 08:00:00', '2026-11-26 08:00:00', NULL, NULL, NULL, NULL, NULL),
    (106, 'VIS-W-0106', 1, 'catalog', 'received',      'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', '2026-11-25 10:00:00', '2026-11-25 10:00:00', NULL, NULL, NULL, NULL, NULL),
    (107, 'VIS-W-0107', 1, 'catalog', 'in_production', 'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', '2026-11-24 12:00:00', '2026-11-24 12:00:00', NULL, NULL, NULL, NULL, '{"product_p1":"Broek"}'),
    (108, 'VIS-W-0108', 1, 'catalog', 'in_production', 'attended',   'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 10, 'paid',  'NL', 'approved', '2026-11-20 09:00:00', '2026-11-20 09:00:00', '2026-12-03', '2026-12-04', NULL, NULL, '{"product_p1":"Trui"}'),
    (109, 'VIS-W-0109', 1, 'catalog', 'delivered',     'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', '2026-11-10 09:00:00', '2026-11-10 09:00:00', NULL, NULL, '2026-11-12 09:00:00', '2026-11-12 09:00:00', NULL),
    (110, 'VIS-W-0110', 1, 'catalog', 'delivered',     'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid',   'NL', 'approved', '2026-11-10 09:00:00', '2026-11-10 09:00:00', NULL, NULL, '2026-11-12 09:00:00', '2026-11-12 09:00:00', NULL);
  -- 101, 103, 105, 106: alle foto's binnen; 107 en 108 missen er (catalog: voor, achter, detail …)
  INSERT INTO files (id, order_id, kind, r2_key, product_key, shot, created_at) VALUES
    (1011, 101, 'upload', 'intake/101/f.jpg', 'p1', 'front', '2026-11-25 15:50:00'), (1012, 101, 'upload', 'intake/101/b.jpg', 'p1', 'back', '2026-11-25 15:50:00'),
    (1031, 103, 'upload', 'intake/103/f.jpg', 'p1', 'front', '2026-11-24 09:00:00'), (1032, 103, 'upload', 'intake/103/b.jpg', 'p1', 'back', '2026-11-24 09:00:00'),
    (1051, 105, 'upload', 'intake/105/f.jpg', 'p1', 'front', '2026-11-26 07:50:00'), (1052, 105, 'upload', 'intake/105/b.jpg', 'p1', 'back', '2026-11-26 07:50:00'),
    (1061, 106, 'upload', 'intake/106/f.jpg', 'p1', 'front', '2026-11-25 09:00:00'), (1062, 106, 'upload', 'intake/106/b.jpg', 'p1', 'back', '2026-11-25 09:00:00'),
    (1071, 107, 'upload', 'intake/107/f.jpg', 'p1', 'front', '2026-11-24 11:00:00'),
    (1081, 108, 'upload', 'intake/108/f.jpg', 'p1', 'front', '2026-11-20 08:00:00'),
    (1035, 103, 'delivery', 'lever/103/a.jpg', 'p1', 'front', '2026-11-26 08:30:00');
  INSERT INTO formaat_verzoeken (order_id, formaat, aangevraagd_at) VALUES (109, 'webp', '2026-11-24 10:00:00'), (109, 'png', '2026-11-23 10:00:00');
  INSERT INTO formaat_verzoeken (order_id, formaat, aangevraagd_at, klaar_at) VALUES (110, 'png', '2026-11-20 10:00:00', '2026-11-21 10:00:00');
  INSERT INTO subscriptions (id, customer_id, ref, plan, status, started_at) VALUES (1, 1, 'SUB-W-0001', 'studio', 'active', '2026-10-01 10:00:00');
  INSERT INTO shared_sets (id, month, published_at) VALUES (1, '2026-11', '2026-11-01 08:00:00');
`);

const meter = nieuweMeter();
const lijst = await nuDoen(metMeter(env, meter).DB, { nu: NU });
ok('geen fout', lijst.fout, null);
const paren = lijst.regels.map((r) => `${r.soort}:${r.ref.replace(/^VIS-W-0/, '')}`);
ok('de volgorde: voorrang, btw, het werk op de dag waarop het af moet, foto’s, formaten, maandset', paren, [
  'oppakken:101', 'btw:102', 'productie:103', 'productie:107', 'oppakken:106', 'productie:105',
  'fotos:108', 'formaten:109', 'maandset:december 2026',
]);
ok('de soorten bestaan in NU_DOEN_SOORTEN', ['productie', 'formaten', 'maandset'].every((s) => NU_DOEN_SOORTEN.includes(s)), true);
ok('hoogstens twee databaseverzoeken', meter.d1 <= 2, true);
const regel = (id) => lijst.regels.find((r) => r.id === id) || {};

/* Voorrang: betaald woensdag 25 november om 17:00 (na 15:00) → vrijdag 27 november, 17:00. */
const v = regel(101);
ok('voorrang bovenaan, met de echte termijn', [soortLabel(v), v.uiterlijk, v.uur], ['Voorrang, niet opgepakt', '2026-11-27', 17]);
ok('  de tekst noemt de dag en het uur', /voorrang: uiterlijk morgen om 17:00/.test(watTekst(v, NU)), true);
ok('  agendaUiterlijk rekent hetzelfde (de planning ook)', agendaUiterlijk({ details_json: '{"voorrang":1}', paid_at: '2026-11-25 16:00:00', created_at: '2026-11-25 15:55:00' }), { dag: '2026-11-27', manier: 'voorrang', uur: 17 });
ok('  zonder betaling geen voorrangstermijn (de termijn loopt vanaf de betaling)', 'uur' in agendaUiterlijk({ details_json: '{"voorrang":1}', created_at: '2026-11-25 15:55:00' }), false);

ok('In productie, te laat: "gisteren, te laat", knop "Leveren" (er staat al een beeld in het bord)',
  [soortLabel(regel(103)), watTekst(regel(103), NU), knopVoor(regel(103)).label, knopVoor(regel(103)).href], ['In productie', 'gisteren, te laat', 'Leveren', '/admin/orders/103/files#melden']);
ok('In productie, af morgen: "af morgen", knop "Naar het bord"', [watTekst(regel(105), NU), knopVoor(regel(105)).label, knopVoor(regel(105)).href], ['af morgen', 'Naar het bord', '/admin/orders/105/files#bord']);
ok('oppakken toont ook de dag waarop het af moet', /^betaald .*; af vandaag$/.test(watTekst(regel(106), NU)), true);
ok('In productie met een vaste dag volgende week staat er (nog) niet in', paren.some((p) => p.endsWith(':104')), false);
ok('één regel per bestelling: 107 (In productie) draagt "foto’s ontbreken" als ook', (regel(107).daarna || []).map((d) => d.soort), ['fotos']);
ok('foto’s ontbreken blijft na Oppakken staan: 108 (In productie, vaste dag later) met Foto’s vragen', [soortLabel(regel(108)), knopVoor(regel(108)).label], ['Foto’s ontbreken', 'Foto’s vragen']);
ok('PNG/WebP gevraagd: beide formaten, één regel, naar Formaten', [soortLabel(regel(109)), watTekst(regel(109), NU).startsWith('PNG en WebP, gevraagd'), knopVoor(regel(109)).href], ['PNG/WebP gevraagd', true, '/admin/formaten']);
ok('  een verzoek dat klaar is, staat er niet in (110)', paren.some((p) => p.endsWith(':110')), false);
const m = lijst.regels.find((r) => r.soort === 'maandset') || {};
ok('maandset (w11): vanaf de 25e "december 2026", met het aantal abonnees, naar de maandset',
  [m.ref, watTekst(m, NU), knopVoor(m).label, knopVoor(m).href], ['december 2026', 'ontbreekt nog (1 abonnee)', 'Maandset maken', '/admin/maandset']);

{
  const bestel = await nuDoen(env.DB, { nu: NU, orderId: 104 });
  ok('op de bestelpagina staat In productie altijd, met de vaste dag', [bestel.regels[0]?.soort, bestel.regels[0]?.uiterlijk], ['productie', '2026-12-02']);
  const stap = volgendeStapHtml({ id: 107, status: 'in_production' }, await nuDoen(env.DB, { nu: NU, orderId: 107 }), NU);
  ok('  en "Volgende stap" noemt wat daarna komt (foto’s vragen)', /Volgende stap:<\/strong> Naar het bord[\s\S]*Daarna: foto’s vragen/.test(stap), true);
}

console.log('\n1b · de maandset op andere dagen');
{
  const voor25 = await nuDoen(env.DB, { nu: Date.parse('2026-11-20T09:00:00Z') });
  ok('vóór de 25e, november gepubliceerd: geen maandsetregel', voor25.regels.some((r) => r.soort === 'maandset'), false);
  db.exec("UPDATE shared_sets SET published_at = NULL WHERE month = '2026-11'");
  const nov = await nuDoen(env.DB, { nu: Date.parse('2026-11-20T09:00:00Z') });
  ok('de set van deze maand niet gepubliceerd: "november 2026" (ook vóór de 25e)', nov.regels.filter((r) => r.soort === 'maandset').map((r) => r.ref), ['november 2026']);
  const beide = await nuDoen(env.DB, { nu: NU });
  ok('na de 25e en beide niet gepubliceerd: eerst november, dan december', beide.regels.filter((r) => r.soort === 'maandset').map((r) => r.ref), ['november 2026', 'december 2026']);
  db.exec("INSERT INTO shared_sets (month, published_at) VALUES ('2026-12', '2026-11-26 08:00:00'); UPDATE shared_sets SET published_at = '2026-11-01 08:00:00' WHERE month = '2026-11'");
  ok('allebei gepubliceerd: weg', (await nuDoen(env.DB, { nu: NU })).regels.some((r) => r.soort === 'maandset'), false);
  db.exec("DELETE FROM shared_sets WHERE month = '2026-12'; UPDATE subscriptions SET status = 'cancelled'");
  ok('zonder lopend abonnement: geen maandsetregel, ook niet na de 25e', (await nuDoen(env.DB, { nu: NU })).regels.some((r) => r.soort === 'maandset'), false);
  ok('januari volgt op december (31 december)', await (async () => {
    db.exec("UPDATE subscriptions SET status = 'active'; INSERT INTO shared_sets (month, published_at) VALUES ('2026-12', '2026-12-01 08:00:00')");
    const r = await nuDoen(env.DB, { nu: Date.parse('2026-12-28T09:00:00Z') });
    return r.regels.filter((x) => x.soort === 'maandset').map((x) => x.ref);
  })(), ['januari 2027']);
}

/* ══ 2 · HET NACHTRAPPORT ════════════════════════════════════════════════════ */
console.log('\n2 · het nachtrapport leest dezelfde lijst');
{
  const tekst = nuDoenTekst(lijst, { origin: 'https://visuails.com', nu: NU }).join('\n');
  if (process.env.TOON) console.log(tekst);
  const refs = [...tekst.matchAll(/^ {2}\d+\. (.*?) · (.*?)[,(]/gm)].map((x) => x[1]);
  ok('dezelfde regels in dezelfde volgorde', refs, lijst.regels.map((r) => soortLabel(r)));
  ok('voorrang met dag en uur', /1\. Voorrang, niet opgepakt · VIS-W-0101 \(VOLT\), betaald [^\n]*voorrang: uiterlijk morgen om 17:00/.test(tekst), true);
  ok('wat er bij dezelfde bestelling ook wacht, staat eronder', /In productie · VIS-W-0107[^\n]*\n {5}Naar het bord: https:\/\/visuails\.com\/admin\/orders\/107\/files#bord\n {5}ook foto’s vragen · 2 foto’s ontbreken .*: https:\/\/visuails\.com\/admin\/orders\/107\/files#ontbreekt/.test(tekst), true);
  ok('de maandset en de formaten met hun link', /Maandset · december 2026, ontbreekt nog \(1 abonnee\)\n {5}Maandset maken: https:\/\/visuails\.com\/admin\/maandset/.test(tekst) && /Formaten: https:\/\/visuails\.com\/admin\/formaten/.test(tekst), true);
  const h = nuDoenHtml(lijst, NU);
  ok('het dashboardblok: één knop per regel, "ook" als link', [...h.matchAll(/<li class="nd-regel"[\s\S]*?<\/li>/g)].map((x) => (x[0].match(/<a class="btn|<button /g) || []).length).every((n) => n === 1)
    && /class="nd-ook">ook: <a href="\/admin\/orders\/107\/files#ontbreekt">foto’s vragen<\/a>/.test(h), true);
}

/* ══ 3 · HET DASHBOARD EN DE PLANNING (echte klok) ═══════════════════════════ */
console.log('\n3 · het dashboard en de planning');
{
  const { db: db2 } = verseDb(new URL('../schema.sql', import.meta.url));
  const env2 = { DB: d1(db2) };
  db2.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
  const token = await mintToken();
  db2.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
  db2.exec(`
    INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'lena@muster-mode.test', 'Lena Muster', 'MUSTER', 'DE');
    INSERT INTO orders (id, ref, customer_id, service, status, tier, name, brand, email, total_cents, lang, product_count, payment_status, country, created_at, paid_at, delivered_at, delivery_mailed_at) VALUES
      (201, 'VIS-W-0201', 1, 'catalog', 'in_production', 'unattended', 'Lena', 'MUSTER', 'lena@muster-mode.test', 10000, 'en', 1, 'paid', 'DE', datetime('now','-3 days'), datetime('now','-3 days'), NULL, NULL),
      (202, 'VIS-W-0202', 1, 'catalog', 'delivered',     'unattended', 'Lena', 'MUSTER', 'lena@muster-mode.test', 10000, 'en', 1, 'paid', 'DE', datetime('now','-9 days'), datetime('now','-9 days'), datetime('now','-5 days'), datetime('now','-5 days'));
    INSERT INTO formaat_verzoeken (order_id, formaat) VALUES (202, 'png');
  `);
  const get = async (pad) => {
    const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env: env2, waitUntil() {} });
    return { status: res.status, html: await res.text() };
  };
  const { html } = await get('/admin');
  ok('"Eerst af" staat niet meer op het dashboard', [/Eerst af/.test(html), /db-aflopend/.test(html)], [false, false]);
  ok('In productie (te laat) staat in Nu doen, met de knop naar het bord', /<li class="nd-regel" data-soort="productie">[\s\S]*?VIS-W-0201[\s\S]*?te laat[\s\S]*?href="\/admin\/orders\/201\/files#bord">Naar het bord</.test(html), true);
  ok('PNG/WebP gevraagd staat in Nu doen', /data-soort="formaten">[\s\S]*?VIS-W-0202[\s\S]*?href="\/admin\/formaten">Formaten</.test(html), true);
  ok('  en niet meer als chip bij de bewakers', /class="fl-chip" href="\/admin\/formaten">Formaten &middot;/.test(html), false);
  const p = await get('/admin/planning');
  ok('de planning: geen lijst Aflopend meer', [/<h2>Aflopend<\/h2>/.test(p.html), /class="pl-item/.test(p.html)], [false, false]);
  const b = await get('/admin/orders/201/files');
  ok('de bestelpagina: het bord heeft een anker (#bord), en de contactknoppen staan bij Wanneer', /<h2 id="bord">Het bord<\/h2>/.test(b.html) && /De klant laten weten dat het later wordt/.test(b.html), true);
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
