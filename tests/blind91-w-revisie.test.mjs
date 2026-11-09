/* VISUAILS — ronde 91, w5 (lijst 85, A5 = goed): revisie op één plek, één mail per ronde.
 *   node tests/blind91-w-revisie.test.mjs        (geen server, geen browser)
 *
 *   1 · de revisie staat op de bestelpagina, in het vakje op het bord (wat de klant zei, Vervangen, Geen nieuw
 *       beeld nodig met de vaste redenen); op het dashboard staan geen revisiekaarten meer;
 *   2 · "Geen nieuw beeld nodig" mailt niet meer per beeld;
 *   3 · valt er niets te vervangen: één mail "Antwoord op je revisieronde" met alle redenen, vanuit Nu doen of de
 *       bestelpagina; een tweede klik stuurt niets;
 *   4 · is er ook een nieuw beeld: de herlevermail ("Je revisie staat klaar") krijgt de redenen erbij — één mail.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost, revisieAntwoordEmail, redeliveryEmail } from '../src/lib/admin.js';
import { nuDoen, knopVoor, watTekst } from '../src/lib/nudoen.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? 'ok  ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) mails.push(JSON.parse(String(opts.body || '{}')));
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const env = { DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, vat_cents, lang, product_count, payment_status, country, created_at, paid_at, delivered_at, delivery_mailed_at) VALUES
    (91, 'VIS-WR-0091', 1, 'catalog', 'delivered', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 2, 'paid', 'NL', datetime('now','-9 days'), datetime('now','-9 days'), datetime('now','-4 days'), datetime('now','-4 days')),
    (92, 'VIS-WR-0092', 1, 'catalog', 'delivered', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 2, 'paid', 'NL', datetime('now','-9 days'), datetime('now','-9 days'), datetime('now','-4 days'), datetime('now','-4 days'));
  INSERT INTO files (id, order_id, kind, r2_key, filename, product_key, shot, review_state, review_note, reviewed_at, announced_at, superseded_at, created_at) VALUES
    -- 91: twee aangemerkt, niets te vervangen
    (911, 91, 'delivery', 'lever/91/a.jpg', 'a.jpg', 'p1', 'front', 'revision_requested', 'Het label is te zien', datetime('now','-2 days'), datetime('now','-4 days'), NULL, datetime('now','-4 days')),
    (912, 91, 'delivery', 'lever/91/b.jpg', 'b.jpg', 'p2', 'back',  'revision_requested', 'Kleur te fel', datetime('now','-2 days'), datetime('now','-4 days'), NULL, datetime('now','-4 days')),
    -- 92: één vervangen (het nieuwe beeld staat klaar), één nog aangemerkt
    (921, 92, 'delivery', 'lever/92/a.jpg',  'a.jpg',  'p1', 'front', 'revision_requested', 'Te donker', datetime('now','-2 days'), datetime('now','-4 days'), datetime('now','-2 hours'), datetime('now','-4 days')),
    (923, 92, 'delivery', 'lever/92/a2.jpg', 'a2.jpg', 'p1', 'front', 'pending', NULL, NULL, NULL, NULL, datetime('now','-2 hours')),
    (922, 92, 'delivery', 'lever/92/b.jpg',  'b.jpg',  'p2', 'back',  'revision_requested', 'Kreukel', datetime('now','-2 days'), datetime('now','-4 days'), NULL, datetime('now','-4 days'));
  INSERT INTO revision_requests (file_id, order_id, customer_id, note, created_at) VALUES
    (911, 91, 1, 'Het label is te zien', datetime('now','-2 days')),
    (912, 91, 1, 'Kleur te fel', datetime('now','-2 days')),
    (921, 92, 1, 'Te donker', datetime('now','-2 days')),
    (922, 92, 1, 'Kreukel', datetime('now','-2 days'));
`);
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
const post = async (pad, velden = {}) => {
  const res = await adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(velden).toString() }), env, waitUntil() {} });
  return { status: res.status, location: res.headers.get('location') };
};
const vakje = (html, id) => { const i = html.indexOf(`id="rev-${id}"`); if (i < 0) return ''; const j = html.indexOf('<div class="slot', i + 10); return html.slice(i, j > -1 ? j : i + 6000); };
const REDEN1 = 'Het label hoort bij het product en blijft zichtbaar.';
const REDEN2 = 'De kleur klopt met het staal dat je stuurde.';
const REDEN3 = 'Deze kreukel zit in de stof zelf.';

console.log('\n1 · op één plek: het vakje op het bord');
{
  const d = await get('/admin');
  ok('het dashboard heeft geen revisiekaarten meer', [/id="revisies"/.test(d.html), /id="rev-911"/.test(d.html), /Revisieverzoeken/.test(d.html)], [false, false, false]);
  ok('  Nu doen springt naar het vakje op de bestelpagina', /href="\/admin\/orders\/91\/files#rev-911">Revisie openen</.test(d.html), true);
  const b = await get('/admin/orders/91/files');
  const v = vakje(b.html, 911);
  ok('het vakje: wat de klant zei, Vervangen en Geen nieuw beeld nodig', [v.includes('“Het label is te zien”'), /type="submit">(?:<svg[^]*?<\/svg>)?Vervangen</.test(v), /action="\/admin\/revisions\/911\/resolve"[\s\S]*type="submit">(?:<svg[^]*?<\/svg>)?Geen nieuw beeld nodig</.test(v)] /* knoppensysteem lijst 88/89: met hun icoon */, [true, true, true]);
  ok('  met de drie vaste redenen als links op deze pagina', (v.match(/href="\/admin\/orders\/91\/files\?reden=911\.[a-z]+#rev-911"/g) || []).length, 3);
}

console.log('\n2 · geen mail per beeld');
{
  mails.length = 0;
  const r1 = await post('/admin/revisions/911/resolve', { fixed: REDEN1 });
  ok('de eerste reden: terug naar het volgende open vakje', r1.location, '/admin/orders/91/files#rev-912');
  const r2 = await post('/admin/revisions/912/resolve', { fixed: REDEN2 });
  ok('de tweede: terug naar Leveren (de ronde is rond)', r2.location, '/admin/orders/91/files#melden');
  ok('  er ging geen enkele mail uit', mails.length, 0);
  ok('  de redenen staan wel op het verzoek', db.prepare('SELECT COUNT(*) AS n FROM revision_requests WHERE order_id = 91 AND resolution_note IS NOT NULL').get().n, 2);
}

console.log('\n3 · niets te vervangen: één mail met alle redenen');
{
  const lijst = await nuDoen(env.DB, { orderId: 91 });
  const r = lijst.regels[0] || {};
  ok('Nu doen: "Revisie afgehandeld" met de knop "Antwoord sturen"', [r.soort, knopVoor(r).label, watTekst(r)], ['leveren', 'Antwoord sturen', 'geen nieuw beeld nodig, het antwoord is nog niet gestuurd']);
  const b = await get('/admin/orders/91/files');
  const lev = b.html.slice(b.html.indexOf('<h2 id="melden">'));
  ok('bij Leveren: de ronde per beeld en de knop "Antwoord op de revisieronde sturen"', [/class="rev-ronde"/.test(lev), lev.includes(REDEN1.replace(/'/g, '&#39;')), /type="submit">Antwoord op de revisieronde sturen</.test(lev)], [true, true, true]);
  mails.length = 0;
  const s = await post('/admin/orders/91/announce', { terug: 'dashboard' });
  ok('versturen vanuit Nu doen: terug naar het dashboard', s.location, '/admin?gemeld=VIS-WR-0091&n=0');
  ok('  één mail, "Antwoord op je revisieronde"', mails.map((m) => m.subject), ['Antwoord op je revisieronde — VIS-WR-0091']);
  ok('  met beide redenen erin', [mails[0]?.html.includes(REDEN1), mails[0]?.html.includes(REDEN2)], [true, true]);
  const rij = db.prepare('SELECT redelivery_mailed_at, COALESCE(redelivery_count, 0) AS n FROM orders WHERE id = 91').get();
  ok('  de ronde is verstuurd (redelivery_mailed_at), maar telt niet als herlevering', [!!rij.redelivery_mailed_at, rij.n], [true, 0]);
  const dash = await get(s.location);
  ok('  het dashboard zegt het', dash.html.includes('VIS-WR-0091: het antwoord op de revisieronde is naar de klant gestuurd.'), true);
  ok('  en 91 staat niet meer in Nu doen', /<li class="nd-regel"[^>]*>[\s\S]{0,300}VIS-WR-0091/.test(dash.html), false);
  mails.length = 0;
  const nog = await post('/admin/orders/91/announce', {});
  ok('een tweede klik stuurt niets', [nog.location, mails.length], ['/admin/orders/91/files?announced=none', 0]);
}

console.log('\n4 · ook een nieuw beeld: de redenen gaan mee in de herlevermail');
{
  mails.length = 0;
  await post('/admin/revisions/922/resolve', { fixed: REDEN3 });
  ok('geen mail bij de reden', mails.length, 0);
  const lijst = await nuDoen(env.DB, { orderId: 92 });
  ok('Nu doen: "1 nieuw beeld sturen" (de vervanging), Revisie afgehandeld', [lijst.regels[0]?.soort, knopVoor(lijst.regels[0] || {}).label], ['leveren', '1 nieuw beeld sturen']);
  await post('/admin/orders/92/announce', {});
  ok('één mail: "Je revisie staat klaar"', mails.map((m) => m.subject), ['Je revisie staat klaar — VIS-WR-0092']);
  ok('  met de reden bij het beeld dat niet vervangen hoefde', [/Bij dit beeld hoefde niets te veranderen/.test(mails[0]?.html || ''), (mails[0]?.html || '').includes(REDEN3)], [true, true]);
}

console.log('\n5 · de mails zelf');
{
  const en = revisieAntwoordEmail({ order: { ref: 'VIS-WR-0093', name: 'Lena', lang: 'en' }, link: 'https://visuails.com/o/abc', antwoorden: [{ wat: 'Product 1 · Back', reden: 'The label stays.' }] });
  ok('Engels: "An answer to your revision round", de reden en de knop', [/An answer to your revision round/.test(en), en.includes('The label stays.'), /See your images/.test(en)], [true, true, true]);
  const zonder = redeliveryEmail({ order: { ref: 'VIS-WR-0094', name: 'Sanne', lang: 'nl' }, link: 'https://visuails.com/o/abc', n: 2 });
  ok('de herlevermail zonder redenen blijft zoals hij was (geen lege kop)', /hoefde niets te veranderen/.test(zonder), false);
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
