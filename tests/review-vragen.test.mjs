/* VISUAILS — review vragen met één klik uit /admin, alleen via WhatsApp (3.06).
 *   node tests/review-vragen.test.mjs          (geen server, geen browser)
 *
 *   · bij elke afgeronde bestelling, nooit gefilterd op score, de knop "Vraag om
 *     een review via WhatsApp" (een gewoon formulier, geen script);
 *   · de post schrijft "review gevraagd" in order_events (één keer) en stuurt
 *     door naar de wa.me-link met de tekst in de taal van de bestelling — via
 *     een tussenpagina, want form-action 'self' blokkeert een 303 naar buiten;
 *   · daarna is de knop grijs met de datum;
 *   · het nachtrapport noemt onder "Afgerond gisteren" wat nog gevraagd moet
 *     worden, ook wat vannacht stil is afgerond.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { adminGet, adminPost, REVIEW_GEVRAAGD } from '../src/lib/admin.js';
import { tasks } from '../cron/index.js';
import { reviewLink } from '../src/lib/waLink.js';
import { REVISIE_DAGEN } from '../src/data/pricing.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

globalThis.fetch = async () => new Response('{}', { status: 200 });
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const env = { DB: d1(db), PUBLIC_ORIGIN: 'https://visuails.com' };
db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES
    (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL'),
    (2, 'lena@muster-mode.test', 'Lena Muster', 'MUSTER', '+49 151 23456789', 'DE');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone, total_cents, lang, product_count, payment_status, country, delivered_at, delivery_mailed_at, closed_at)
    VALUES (21, 'VIS-TEST-0021', 1, 'catalog', 'delivered', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 'nl', 2, 'paid', 'NL', datetime('now', '-3 days'), datetime('now', '-3 days'), datetime('now', '-2 hours')),
           (22, 'VIS-TEST-0022', 2, 'catalog', 'delivered', 'Lena Muster', 'MUSTER', 'lena@muster-mode.test', '+49 151 23456789', 10000, 'en', 2, 'paid', 'DE', datetime('now', '-3 days'), datetime('now', '-3 days'), datetime('now', '-5 hours')),
           (23, 'VIS-TEST-0023', 1, 'catalog', 'delivered', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 'nl', 2, 'paid', 'NL', datetime('now', '-2 days'), datetime('now', '-2 days'), NULL),
           (24, 'VIS-TEST-0024', 1, 'catalog', 'delivered', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 'nl', 2, 'paid', 'NL', datetime('now', '-${REVISIE_DAGEN + 2} days'), datetime('now', '-${REVISIE_DAGEN + 2} days'), NULL);
  INSERT INTO order_feedback (order_id, customer_id, score) VALUES (22, 2, 1);
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
db.prepare("INSERT INTO files (order_id, kind, r2_key, created_at) VALUES (24, 'delivery', 'lever/24/1.jpg', datetime('now', ?))").run(`-${REVISIE_DAGEN + 2} days`);
const adminToken = await mintToken();
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
const post = async (pad, { origin = 'https://visuails.com' } = {}) => {
  const res = await adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { cookie: `vis_admin=${adminToken}`, ...(origin ? { origin } : {}), 'content-type': 'application/x-www-form-urlencoded' }, body: '' }), env, waitUntil() {} });
  return { status: res.status, html: await res.text(), location: res.headers.get('location'), csp: res.headers.get('content-security-policy') || '' };
};
const gevraagd = (id) => telling(db, "SELECT COUNT(*) FROM order_events WHERE order_id = ? AND note = ? AND actor = 'intern'", id, REVIEW_GEVRAAGD);

console.log('\n1 · de knop op de bestelpagina');
{
  const { status, html } = await get('/admin/orders/22/files');
  ok('afgerond (DE, score 1): de pagina laadt', status, 200);
  ok('de knop is een gewoon formulier naar /review-wa, in een nieuw tabblad',
    /<form method="post" action="\/admin\/orders\/22\/review-wa" target="_blank"><button class="btn btn-primary btn-sm" type="submit">Vraag om een review via WhatsApp<\/button><\/form>/.test(html));
  ok('nooit gefilterd op score: ook bij score 1', /review-wa/.test(html));
  ok('met de regel "bij elke score"', /vraag om een review, bij elke score/.test(html));
}
{
  const { html } = await get('/admin/orders/21/files');
  const blok = html.slice(html.indexOf('id="review"'), html.indexOf('id="review"') + 800);
  /* V27 = b (ronde B, 8 oktober 2026): review vragen gaat via WhatsApp, dus de
     reviewknop staat voorop, ook bij een Nederlandse klant; Bel staat ernaast. */
  ok('NL-klant: de reviewknop (WhatsApp) staat voorop, Bel ernaast', blok.indexOf('href="tel:+31612345678"') > -1 && blok.indexOf('review-wa') < blok.indexOf('href="tel:+31612345678"'));
}
{
  const { html } = await get('/admin/orders/23/files');
  ok('geleverd maar niet afgerond: geen reviewknop', /id="review"/.test(html), false);
}

console.log('\n2 · de post: de regel en het doorsturen');
{
  const zonder = await post('/admin/orders/22/review-wa', { origin: 'https://elders.example' });
  ok('van een andere site: geweigerd (403), niets geschreven', [zonder.status, gevraagd(22)], [403, 0]);
  const r = await post('/admin/orders/22/review-wa');
  ok('de post geeft een tussenpagina (200), geen 303 naar buiten', [r.status, r.location], [200, null]);
  ok('met een meta refresh naar wa.me/49… en de Engelse tekst',
    /<meta http-equiv="refresh" content="0; url=https:\/\/wa\.me\/4915123456789\?text=Hi%20Lena%2C%20your%20order%20VIS-TEST-0022%20is%20complete/.test(r.html));
  ok('de reviewlink staat in de tekst', r.html.includes(encodeURIComponent(reviewLink())));
  ok('onder dezelfde strenge CSP (form-action self)', /form-action 'self'/.test(r.csp));
  ok('"review gevraagd" staat één keer in order_events (intern)', gevraagd(22), 1);
  await post('/admin/orders/22/review-wa');
  ok('nog een keer: geen tweede regel', gevraagd(22), 1);
  const nl = await post('/admin/orders/21/review-wa');
  ok('NL-bestelling: de tekst in het Nederlands', /url=https:\/\/wa\.me\/31612345678\?text=Hoi%20Sanne%2C%20je%20bestelling%20VIS-TEST-0021%20is%20afgerond/.test(nl.html));
  const open = await post('/admin/orders/23/review-wa');
  ok('niet afgerond: terug naar de bestelpagina, niets geschreven', [open.status, open.location, gevraagd(23)], [303, '/admin/orders/23/files#review', 0]);
}
{
  const { html } = await get('/admin/orders/22/files');
  const vandaag = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' }).format(new Date());
  ok('daarna: grijs met de datum', html.includes(`<span class="is-gevraagd">Review gevraagd op ${vandaag} via WhatsApp</span>`));
  ok('  en geen knop meer', /action="\/admin\/orders\/22\/review-wa"/.test(html), false);
}

console.log('\n3 · het nachtrapport: "Afgerond gisteren"');
{
  db.exec(`DELETE FROM order_events WHERE order_id = 21`);
  await tasks.stilAfronden(env);
  const regel = await tasks.afgerondGisteren(env);
  ok('noemt de afgeronde bestelling die nog niet gevraagd is', /VIS-TEST-0021 \(VOLT\): https:\/\/visuails\.com\/admin\/orders\/21\/files#review/.test(regel || ''), true);
  ok('ook wat vannacht stil is afgerond', /VIS-TEST-0024/.test(regel || ''));
  ok('niet wat al gevraagd is', /VIS-TEST-0022/.test(regel || ''), false);
  ok('niet wat nog open is', /VIS-TEST-0023/.test(regel || ''), false);
  ok('met de kop "Afgerond gisteren"', /^Afgerond gisteren — vraag om een review via WhatsApp/.test(regel || ''));
  db.exec(`UPDATE orders SET closed_at = datetime('now', '-3 days') WHERE id IN (21, 24)`);
  ok('een dag later staat hij er niet meer', await tasks.afgerondGisteren(env), null);
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
