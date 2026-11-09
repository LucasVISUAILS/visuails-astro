/* VISUAILS — ronde 91, w4 (lijst 85, B1 = goed): één statuspad met knoppen, "In controle" weg.
 *   node tests/blind91-w-statuspad.test.mjs        (geen server, geen browser)
 *
 *   1 · geen statuslijstje meer, niet op de dashboardrij en niet op de bestelpagina; "In controle" (en zijn
 *       andere namen) staat nergens meer; een bestaande rij op human_check heet en telt als In productie;
 *   2 · de leverknop schrijft "Nagekeken en geleverd" op de tijdlijn (in de taal van de klant);
 *   3 · onder Onomkeerbaar één kleine knop "Terug naar In productie": daarna is leveren weer een echte levering,
 *       met de mail dat het klaarstaat; "In controle" zetten kan niet meer (400);
 *   4 · de klant (Studio, de privélink via nuzin.js, de melding op de site): drie stappen, geen "Wordt nagekeken".
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { statusPad, nuZin, standKort } from '../src/lib/nuzin.js';
import { COPY } from '../src/lib/account.js';
import { KLANT } from '../src/data/klant.js';
import { nuDoen } from '../src/lib/nudoen.js';
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
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES
    (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL'),
    (2, 'lena@muster-mode.test', 'Lena Muster', 'MUSTER', NULL, 'DE');
  INSERT INTO orders (id, ref, customer_id, service, status, tier, name, brand, email, total_cents, vat_cents, lang, product_count, payment_status, country, created_at, paid_at, delivered_at, delivery_mailed_at) VALUES
    (61, 'VIS-WS-0061', 1, 'catalog', 'human_check',   'unattended', 'Sanne', 'VOLT',   'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid', 'NL', datetime('now','-3 days'), datetime('now','-3 days'), NULL, NULL),
    (62, 'VIS-WS-0062', 1, 'catalog', 'in_production', 'unattended', 'Sanne', 'VOLT',   'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid', 'NL', datetime('now','-2 days'), datetime('now','-2 days'), NULL, NULL),
    (63, 'VIS-WS-0063', 2, 'catalog', 'in_production', 'unattended', 'Lena',  'MUSTER', 'lena@muster-mode.test',     10000, 0,    'en', 1, 'paid', 'DE', datetime('now','-2 days'), datetime('now','-2 days'), NULL, NULL);
  INSERT INTO files (id, order_id, kind, r2_key, filename, product_key, shot, review_state, created_at) VALUES
    (621, 62, 'delivery', 'lever/62/a.jpg', 'a.jpg', 'p1', 'front', 'pending', datetime('now','-1 hours')),
    (631, 63, 'delivery', 'lever/63/a.jpg', 'a.jpg', 'p1', 'front', 'pending', datetime('now','-1 hours'));
`);
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
const post = async (pad, velden = {}) => {
  const res = await adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(velden).toString() }), env, waitUntil() {} });
  return { status: res.status, html: await res.text(), location: res.headers.get('location') };
};
const zichtbaar = (h) => h.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const OUDE_NAMEN = /In controle|wordt nagekeken|Leverkeuring|Klaar om te leveren|Status bijwerken/i;

console.log('\n1 · geen lijstje, geen "In controle"');
{
  const { html } = await get('/admin');
  ok('het dashboard heeft geen statuslijstje meer', /<select name="status"/.test(html), false);
  ok('  en nergens "In controle", "wordt nagekeken", "Leverkeuring" of "Status bijwerken"', (zichtbaar(html).match(OUDE_NAMEN) || [null])[0], null);
  ok('de statuschips: Binnen, In productie, Geleverd, Geannuleerd (geen human_check)', [...((/<nav class="fl" aria-label="Bestellingen filteren op status">[\s\S]*?<\/nav>/.exec(html) || [''])[0]).matchAll(/href="\/admin\?status=([a-z_]+)"/g)].map((m) => m[1]), ['received', 'in_production', 'delivered', 'cancelled']);
  ok('In productie telt de oude human_check-rij mee (3)', /href="\/admin\?status=in_production">In productie <span class="fl-n">3<\/span>/.test(html), true);
  const rij = (/<details class="or" id="order-61">[\s\S]*?<\/summary>/.exec(html) || [''])[0];
  ok('de rij op human_check heet "In productie"', />In productie</.test(rij) && !/In controle/.test(rij), true);
  const f = await get('/admin?status=in_production');
  ok('het filter In productie toont ook de oude human_check-rij', [f.html.includes('VIS-WS-0061'), f.html.includes('VIS-WS-0062')], [true, true]);
  const oud = await get('/admin?status=human_check');
  ok('een oude link ?status=human_check geeft In productie', /fl-chip is-active" aria-current="true">In productie/.test(oud.html) && oud.html.includes('VIS-WS-0061'), true);
  const b = await get('/admin/orders/61/files');
  ok('de bestelpagina: geen statuslijstje, de pil zegt In productie', [/<select name="status"/.test(b.html), /bestel-kop-pillen">[^\n]*>In productie</.test(b.html)], [false, true]);
  ok('  en nergens een oude naam', (zichtbaar(b.html).match(OUDE_NAMEN) || [null])[0], null);
  const lijst = await nuDoen(env.DB, { orderId: 61 });
  ok('Nu doen: de oude human_check-rij is werk In productie (geen Leverkeuring)', lijst.regels.map((r) => r.soort), ['productie']);
}

console.log('\n2 · leveren: "Nagekeken en geleverd" op de tijdlijn');
{
  mails.length = 0;
  const r = await post('/admin/orders/62/status', { status: 'delivered', back: 'files' });
  ok('de leverknop: terug op de bestelpagina, mail gelukt', [r.status, r.location], [303, '/admin/orders/62/files?mail=ok']);
  const ev = db.prepare("SELECT note FROM order_events WHERE order_id = 62 AND status = 'delivered' ORDER BY id DESC LIMIT 1").get();
  ok('de tijdlijn van de klant: "Nagekeken en geleverd."', ev?.note, 'Nagekeken en geleverd.');
  ok('  de klant kreeg de mail dat het klaarstaat', mails.filter((m) => (m.to || []).includes?.('sanne@voorbeeld-volt.test') || m.to === 'sanne@voorbeeld-volt.test').length, 1);
  await post('/admin/orders/63/status', { status: 'delivered', back: 'files' });
  ok('in het Engels voor een Engelse klant: "Checked and delivered."', db.prepare("SELECT note FROM order_events WHERE order_id = 63 AND status = 'delivered'").get()?.note, 'Checked and delivered.');
  await post('/admin/orders/63/status', { status: 'delivered', back: 'files', note: 'Alles gecontroleerd door Lucas' });
  ok('een eigen notitie gaat voor (en een tweede keer leveren schrijft geen "Nagekeken" meer)', db.prepare("SELECT note FROM order_events WHERE order_id = 63 AND status = 'delivered' ORDER BY id DESC LIMIT 1").get()?.note, 'Alles gecontroleerd door Lucas');
}

console.log('\n3 · Terug naar In productie');
{
  const b = await get('/admin/orders/62/files');
  const onomkeerbaar = b.html.slice(b.html.indexOf('<h2 id="annuleren">Onomkeerbaar</h2>'));
  ok('onder Onomkeerbaar: één kleine knop "Terug naar In productie"', /<form class="danger-klein" method="post" action="\/admin\/orders\/62\/status" id="terug-productie">\s*<input type="hidden" name="status" value="in_production">[\s\S]*?<button class="btn btn-ghost btn-sm" data-rol="terugnemen" type="submit">(?:<svg[^]*?<\/svg>)?Terug naar In productie<\/button>/.test(onomkeerbaar), true);  /* knoppensysteem lijst 88/89: Terugnemen, met de terugboog */ 
  ok('  alleen daar (één keer op de pagina)', (b.html.match(/Terug naar In productie<\/button>/g) || []).length, 1);
  ok('  niet bij een bestelling die nog niet geleverd is', /Terug naar In productie/.test((await get('/admin/orders/61/files')).html), false);
  const r = await post('/admin/orders/62/status', { status: 'in_production', back: 'files' });
  const rij = db.prepare('SELECT status, delivered_at, delivery_mailed_at FROM orders WHERE id = 62').get();
  ok('terug: In productie, en de levering telt niet meer', [r.location, rij.status, rij.delivered_at, rij.delivery_mailed_at], ['/admin/orders/62/files', 'in_production', null, null]);
  const na = await get('/admin/orders/62/files');
  ok('  de knop "Leveren en klant mailen" staat er weer', /type="submit">Leveren en klant mailen(?:<svg[^]*?<\/svg>)?<\/button>/.test(na.html), true);  /* knoppensysteem lijst 88/89: met de pijl */ 
  mails.length = 0;
  await post('/admin/orders/62/status', { status: 'delivered', back: 'files' });
  ok('  opnieuw leveren: de klant krijgt weer de mail dat het klaarstaat', mails.length >= 1 && /klaar/i.test(mails.map((m) => m.subject).join(' ')), true);
  const geweigerd = await post('/admin/orders/62/status', { status: 'human_check', back: 'files' });
  ok('"In controle" zetten kan niet meer (een oud tabblad): 400 met de uitleg', [geweigerd.status, /bestaat niet meer als stand/.test(geweigerd.html)], [400, true]);
  ok('  en de stand is niet veranderd', db.prepare('SELECT status FROM orders WHERE id = 62').get().status, 'delivered');
}

console.log('\n4 · de klant: drie stappen');
{
  const pad = statusPad({ status: 'human_check', payment_status: 'paid', total_cents: 100 }, { lang: 'nl' });
  ok('het statuspad (Studio en de privélink): Ontvangen · In productie · Geleverd', pad.map((s) => s.label), ['Ontvangen', 'In productie', 'Geleverd']);
  ok('  een oude rij op human_check staat op In productie', pad.find((s) => s.state === 'is-now')?.label, 'In productie');
  ok('  in het Engels ook zonder "Being checked"', statusPad({ status: 'delivered', payment_status: 'paid' }, { lang: 'en' }).map((s) => s.label), ['Received', 'In production', 'Delivered']);
  ok('de zin bij een oude human_check-rij is die van In productie', [nuZin({ status: 'human_check', payment_status: 'paid', total_cents: 100 }, {}, 'nl').zin, nuZin({ status: 'in_production', payment_status: 'paid', total_cents: 100 }, {}, 'nl').zin].reduce((a, b) => a === b), true);
  ok('de korte stand (de melding op de site): In productie', standKort('inDeMaak', 'nl', { status: 'human_check' }), 'In productie');
  ok('Studio (account.js) noemt nergens "Wordt nagekeken" of "Being checked" als stap', [COPY.nl.flowStep.human_check, COPY.en.flowStep.human_check, COPY.nl.flowNow.human_check === COPY.nl.flowNow.in_production], ['In productie', 'In production', true]);
  ok('de melding op de site: drie stappen', [KLANT.nl.stappen, KLANT.en.stappen], [['Ontvangen', 'In productie', 'Geleverd'], ['Received', 'In production', 'Delivered']]);
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
