/* VISUAILS — revisie afhandelen op één plek, in de taal van de klant (punt 4.08, V37 = a).
 *   node tests/revisie-redenen.test.mjs          (geen server, geen browser)
 *
 *   1 · drie vaste redenen in één databestand (src/data/revisieRedenen.js), in
 *       NL en EN, zonder ik-vorm, binnen de lengte van het redenveld;
 *   2 · boven het redenveld staat de taal van de klant ("Deze klant leest
 *       Engels — schrijf je reden in het Engels."), met de drie redenen als
 *       links; één klik zet de reden in het veld, in de taal van de klant;
 *   3 · is de laatste kaart van een bestelling afgehandeld, dan blijft er één
 *       kaart met de knop "N nieuwe beelden melden" (het echte aantal); zolang er
 *       nog een kaart open is, niet;
 *   4 · de hele weg: laatste kaart afhandelen → de knop verschijnt → melden →
 *       terug op het dashboard met "gemeld aan de klant — N beelden".
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { REVISIE_REDENEN, revisieReden } from '../src/data/revisieRedenen.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ══ 1 · DE DRIE REDENEN ═════════════════════════════════════════════════════ */
console.log('\n1 · drie vaste redenen, NL en EN');
ok('precies drie', REVISIE_REDENEN.length, 3);
ok('elk met id, knop, nl en en', REVISIE_REDENEN.every((r) => r.id && r.knop && r.nl && r.en), true);
ok('ids zijn kort en uniek (ze staan in de link)', new Set(REVISIE_REDENEN.map((r) => r.id)).size === 3 && REVISIE_REDENEN.every((r) => /^[a-z]{1,20}$/.test(r.id)), true);
ok('binnen de 400 tekens van het redenveld', REVISIE_REDENEN.every((r) => r.nl.length <= 400 && r.en.length <= 400), true);
ok('geen ik-vorm (NL)', REVISIE_REDENEN.filter((r) => /\b(ik|mij|mijn|me)\b/i.test(r.nl)).map((r) => r.id), []);
ok('geen ik-vorm (EN)', REVISIE_REDENEN.filter((r) => /\b(I|my|me)\b/.test(r.en)).map((r) => r.id), []);
ok('geen "onze beeldredactie"', REVISIE_REDENEN.some((r) => /beeldredactie|image editors/i.test(r.nl + r.en)), false);
ok('revisieReden(id, "en") geeft het Engels, anders Nederlands', [revisieReden('kleur', 'en'), revisieReden('kleur', 'nl'), revisieReden('kleur', 'de'), revisieReden('bestaat-niet', 'en')], [REVISIE_REDENEN[0].en, REVISIE_REDENEN[0].nl, REVISIE_REDENEN[0].nl, '']);

/* ── De vulling ──────────────────────────────────────────────────────────── */
const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) mails.push(JSON.parse(String(opts.body || '{}')));
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const env = { DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES
    (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL'),
    (2, 'lena@muster-mode.test', 'Lena Muster', 'MUSTER', '+49 151 23456789', 'DE');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, vat_cents, lang, product_count, payment_status, country, review_state, created_at, paid_at, delivered_at, delivery_mailed_at) VALUES
    (51, 'VIS-RR-0051', 2, 'catalog', 'delivered', 'Lena Muster', 'MUSTER', 'lena@muster-mode.test', 10000, 0, 'en', 2, 'paid', 'DE', 'approved', datetime('now','-9 days'), datetime('now','-9 days'), datetime('now','-4 days'), datetime('now','-4 days')),
    (52, 'VIS-RR-0052', 1, 'catalog', 'delivered', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-9 days'), datetime('now','-9 days'), datetime('now','-4 days'), datetime('now','-4 days')),
    (53, 'VIS-RR-0053', 2, 'catalog', 'delivered', 'Lena Muster', 'MUSTER', 'lena@muster-mode.test', 10000, 0, 'en', 3, 'paid', 'DE', 'approved', datetime('now','-9 days'), datetime('now','-9 days'), datetime('now','-4 days'), datetime('now','-4 days')),
    (54, 'VIS-RR-0054', 2, 'catalog', 'delivered', 'Lena Muster', 'MUSTER', 'lena@muster-mode.test', 10000, 0, 'en', 2, 'paid', 'DE', 'approved', datetime('now','-9 days'), datetime('now','-9 days'), datetime('now','-4 days'), datetime('now','-4 days'));
  INSERT INTO files (id, order_id, kind, r2_key, product_key, shot, review_state, reviewed_at, announced_at, superseded_at, created_at) VALUES
    (510, 51, 'delivery', 'lever/51/a.jpg', 'p1', 'front', 'revision_requested', datetime('now','-2 days'), datetime('now','-4 days'), NULL, datetime('now','-4 days')),
    (520, 52, 'delivery', 'lever/52/a.jpg', 'p1', 'front', 'revision_requested', datetime('now','-1 days'), datetime('now','-4 days'), NULL, datetime('now','-4 days')),
    -- 53: twee beelden vervangen, één met "geen nieuw beeld nodig"; geen kaart meer open
    (530, 53, 'delivery', 'lever/53/a.jpg',  'p1', 'front', 'revision_requested', datetime('now','-2 days'), datetime('now','-4 days'), datetime('now','-3 hours'), datetime('now','-4 days')),
    (531, 53, 'delivery', 'lever/53/a2.jpg', 'p1', 'front', 'pending', NULL, NULL, NULL, datetime('now','-3 hours')),
    (533, 53, 'delivery', 'lever/53/b.jpg',  'p2', 'back',  'revision_requested', datetime('now','-2 days'), datetime('now','-4 days'), datetime('now','-2 hours'), datetime('now','-4 days')),
    (534, 53, 'delivery', 'lever/53/b2.jpg', 'p2', 'back',  'pending', NULL, NULL, NULL, datetime('now','-2 hours')),
    (532, 53, 'delivery', 'lever/53/c.jpg',  'p3', 'front', 'pending', NULL, datetime('now','-4 days'), NULL, datetime('now','-4 days')),
    -- 54: één vervangen, één nog open
    (540, 54, 'delivery', 'lever/54/a.jpg',  'p1', 'front', 'revision_requested', datetime('now','-2 days'), datetime('now','-4 days'), NULL, datetime('now','-4 days')),
    (541, 54, 'delivery', 'lever/54/b.jpg',  'p2', 'back',  'revision_requested', datetime('now','-2 days'), datetime('now','-4 days'), datetime('now','-1 hours'), datetime('now','-4 days')),
    (542, 54, 'delivery', 'lever/54/b2.jpg', 'p2', 'back',  'pending', NULL, NULL, NULL, datetime('now','-1 hours'));
  INSERT INTO revision_requests (file_id, order_id, customer_id, note, created_at, resolved_at, resolution_note) VALUES
    (510, 51, 2, 'The sleeve looks too short', datetime('now','-2 days'), NULL, NULL),
    (520, 52, 1, 'De kleur is te fel', datetime('now','-1 days'), NULL, NULL),
    (530, 53, 2, 'Wrong shade', datetime('now','-2 days'), NULL, NULL),
    (533, 53, 2, 'Crop is off', datetime('now','-2 days'), NULL, NULL),
    (532, 53, 2, 'Label is visible', datetime('now','-2 days'), datetime('now','-1 hours'), 'The label is part of the product and stays visible.'),
    (540, 54, 2, 'Too dark', datetime('now','-2 days'), NULL, NULL),
    (541, 54, 2, 'Wrinkle', datetime('now','-2 days'), NULL, NULL);
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
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
const kaart = (html, id) => {
  const i = html.indexOf(`id="${id}"`);
  if (i < 0) return '';
  const j = html.indexOf('<div class="card', i + 10);
  return html.slice(i, j > -1 ? j : i + 6000);
};

/* ══ 2 · DE TAALREGEL EN DE DRIE REDENEN ═════════════════════════════════════ */
console.log('\n2 · de taal van de klant boven het redenveld');
{
  const { status, html } = await get('/admin');
  ok('dashboard laadt', status, 200);
  const en = kaart(html, 'rev-510');
  const nl = kaart(html, 'rev-520');
  ok('Engelse klant: "Deze klant leest Engels — schrijf je reden in het Engels."', en.includes('<p class="rev-taal">Deze klant leest Engels &mdash; schrijf je reden in het Engels.</p>'));
  ok('Nederlandse klant: "Deze klant leest Nederlands — schrijf je reden in het Nederlands."', nl.includes('<p class="rev-taal">Deze klant leest Nederlands &mdash; schrijf je reden in het Nederlands.</p>'));
  const vorm = en.slice(en.indexOf('action="/admin/revisions/510/resolve"'));
  ok('de taalregel staat in het formulier, boven het redenveld', vorm.indexOf('rev-taal') > -1 && vorm.indexOf('rev-taal') < vorm.indexOf('name="fixed"'));
  ok('het redenveld is een tekstvak, verplicht, hoogstens 400 tekens', /<textarea id="fixed-510" name="fixed" maxlength="400" required/.test(vorm));
  ok('en het is leeg zolang er geen reden gekozen is', /<textarea id="fixed-510"[^>]*><\/textarea>/.test(vorm));
  for (const r of REVISIE_REDENEN) {
    ok(`reden "${r.knop}" is een link die het veld vult`, en.includes(`<a class="fl-chip" href="/admin?reden=510.${r.id}#rev-510">${esc(r.knop)}</a>`));
  }
  ok('de knop "Geen nieuw beeld nodig" blijft', /type="submit">Geen nieuw beeld nodig</.test(vorm));
}
{
  const { html } = await get('/admin?reden=510.keuze');
  const en = kaart(html, 'rev-510');
  ok('na één klik: de Engelse tekst staat in het veld van 510', en.includes(`>${esc(revisieReden('keuze', 'en'))}</textarea>`));
  ok('  en niet in het veld van een andere kaart', /<textarea id="fixed-520"[^>]*><\/textarea>/.test(kaart(html, 'rev-520')));
  const nlKlik = await get('/admin?reden=520.kleur');
  ok('bij de Nederlandse klant: de Nederlandse tekst', kaart(nlKlik.html, 'rev-520').includes(`>${esc(revisieReden('kleur', 'nl'))}</textarea>`));
  const gefilterd = await get('/admin?status=delivered');
  ok('met een filter aan houdt de link het filter vast', kaart(gefilterd.html, 'rev-510').includes('href="/admin?status=delivered&amp;reden=510.kleur#rev-510"'));
  const onzin = await get('/admin?reden=510.%3Cscript%3E');
  ok('een onbekende reden: leeg veld, geen fout', [onzin.status, /<textarea id="fixed-510"[^>]*><\/textarea>/.test(kaart(onzin.html, 'rev-510'))], [200, true]);
}

/* ══ 3 · DE KNOP IN DE KAART ═════════════════════════════════════════════════ */
console.log('\n3 · "N nieuwe beelden melden" in de afgehandelde kaart');
{
  const { html } = await get('/admin');
  const af = kaart(html, 'rev-o53');
  ok('53 (laatste kaart afgehandeld): de kaart blijft staan', af.length > 0);
  ok('  met de knop "2 nieuwe beelden melden" (het echte aantal)', /<button class="btn btn-primary" type="submit">2 nieuwe beelden melden<\/button>/.test(af));
  ok('  die naar dezelfde route post, terug naar het dashboard', /action="\/admin\/orders\/53\/announce"/.test(af) && /name="terug" value="dashboard"/.test(af));
  ok('  met per beeld wat er gedaan is', /Product 1 &middot; [^<]+<\/strong> &mdash; nieuw beeld geüpload/.test(af) && /geen nieuw beeld nodig: &ldquo;The label is part of the product and stays visible\.&rdquo;/.test(af));
  ok('  en de taal boven het notitieveld', af.includes('Deze klant leest Engels &mdash; schrijf je notitie in het Engels.'));
  ok('54 (nog een kaart open): geen meldknop', kaart(html, 'rev-o54'), '');
  ok('  de open kaart van 54 staat er wel', kaart(html, 'rev-540').length > 0);
}

/* ══ 4 · DE HELE WEG ═════════════════════════════════════════════════════════ */
console.log('\n4 · laatste kaart afhandelen, melden, klaar');
{
  mails.length = 0;
  const r = await post('/admin/revisions/540/resolve', { fixed: revisieReden('kleur', 'en') });
  ok('"Geen nieuw beeld nodig" met de Engelse reden', [r.status, r.location], [303, '/admin']);
  const mail = mails.find((m) => /An answer to your revision — VIS-RR-0054/.test(m.subject || ''));
  ok('de klant krijgt het antwoord in het Engels, met de reden erin', Boolean(mail) && mail.html.includes(esc(revisieReden('kleur', 'en')).replace(/&#39;/g, '&#39;')));
  const { html } = await get('/admin');
  const af = kaart(html, 'rev-o54');
  ok('nu verschijnt in de kaart van 54 de knop "1 nieuw beeld melden"', /type="submit">1 nieuw beeld melden<\/button>/.test(af));
  ok('  en de open kaart is weg', kaart(html, 'rev-540'), '');
  mails.length = 0;
  const m = await post('/admin/orders/54/announce', { terug: 'dashboard', note: 'Both images were checked again.' });
  ok('melden vanuit de kaart: terug naar het dashboard', [m.status, m.location], [303, '/admin?gemeld=VIS-RR-0054&n=1']);
  ok('  één mail aan de klant ("Your revision is ready")', mails.filter((x) => /Your revision is ready — VIS-RR-0054/.test(x.subject || '')).length, 1);
  const na = await get(m.location);
  ok('  "VIS-RR-0054: gemeld aan de klant — 1 beeld."', na.html.includes('VIS-RR-0054: gemeld aan de klant &mdash; 1 beeld.'));
  ok('  en de kaart is weg', kaart(na.html, 'rev-o54'), '');
  ok('  de bestelling staat niet meer in Nu doen', /<li class="nd-regel"[^>]*>[\s\S]{0,300}VIS-RR-0054/.test(na.html), false);
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
