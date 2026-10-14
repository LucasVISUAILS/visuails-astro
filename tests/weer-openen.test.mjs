/* VISUAILS — een afgeronde bestelling weer openen vanuit /admin (11 oktober 2026, w2 = b).
 *   node tests/weer-openen.test.mjs          (geen server, geen browser)
 *
 *   · de knop staat alleen bij een afgeronde, geleverde bestelling (geen proef,
 *     niet geannuleerd), ingeklapt, met een verplicht vinkje en zonder script;
 *   · de post (sessie + Origin, zoals elke /admin-actie) zet closed_at leeg en
 *     reopened_at op nu, haalt de wisdatum van de bronfoto's weg, schrijft één
 *     regel "Weer geopend door VISUAILS op …" op de tijdlijn en mailt niemand;
 *   · het stille afronden telt vanaf het weer openen: op de laatste revisiedag
 *     nog open, de nacht erna dicht, met een nieuwe wisdatum vanaf dat moment;
 *   · Studio en de privélink noemen de revisiedatum vanaf het weer openen.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { adminGet, adminPost, weerOpenenBlok } from '../src/lib/admin.js';
import { tasks } from '../cron/index.js';
import { kanHeropenen, heropenBestelling, heropenNotitie, STIL_AFGEROND_NOTITIE } from '../src/lib/close.js';
import { leverDatumsVan, leverDatums } from '../src/lib/leverdatums.js';
import { nuDatums, nuZin } from '../src/lib/nuzin.js';
import { EXPIRED_FILES_SQL, UPLOAD_DAYS } from '../src/lib/retention.js';
import { REVISIE_DAGEN, SAMPLE_SERVICE } from '../src/data/pricing.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { orderView, COPY } from '../src/lib/account.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

const gezien = [];
globalThis.fetch = async (url) => { gezien.push(String(url)); return new Response('{}', { status: 200 }); };
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt (met migratie 0066)', mislukt.length, 0);
const env = { DB: d1(db), PUBLIC_ORIGIN: 'https://visuails.com', RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@voorbeeld.test' };
const R = REVISIE_DAGEN;
const dagenTerug = (n) => db.prepare(`SELECT datetime(date('now', '-${n} days'), '+12 hours') AS t`).get().t;

db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES
    (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL');
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const order = (id, { service = 'catalog', status = 'delivered', gesloten = dagenTerug(R + 20), lang = 'nl', ronde = null } = {}) => {
  db.prepare(
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, lang, product_count, payment_status, total_cents, delivered_at, delivery_mailed_at, closed_at, revision_round_at)
     VALUES (?, ?, 1, ?, ?, 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', ?, 2, 'paid', 10000, ?, ?, ?, ?)`
  ).run(id, `VIS-TEST-${String(id).padStart(4, '0')}`, service, status, lang, dagenTerug(R + 21), dagenTerug(R + 21), gesloten, ronde);
  db.prepare("INSERT INTO files (order_id, kind, r2_key, created_at, announced_at, review_state) VALUES (?, 'delivery', ?, ?, ?, 'approved')")
    .run(id, `lever/${id}/1.jpg`, dagenTerug(R + 21), dagenTerug(R + 21));
  db.prepare("INSERT INTO files (order_id, kind, r2_key, created_at, expires_at) VALUES (?, 'upload', ?, ?, datetime(?, '+90 days'))")
    .run(id, `intake/${id}/1.jpg`, dagenTerug(R + 30), gesloten || dagenTerug(0));
  return id;
};
const STIL = order(31);                                   // stil afgerond, 4 weken geleden
const EN = order(32, { lang: 'en' });                     // Engelse klant
const PROEF = order(33, { service: SAMPLE_SERVICE });     // de €1-proef: nooit weer openen
const OPEN = order(34, { gesloten: null });               // nog open
const GEANNULEERD = order(35, { status: 'cancelled' });   // geannuleerd
const RONDE = order(36, { ronde: dagenTerug(R + 18) });   // ronde al gebruikt
const OUD = order(37, { gesloten: dagenTerug(UPLOAD_DAYS + 5) }); // bronfoto's zouden vannacht weg mogen

const adminToken = await mintToken();
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
const post = async (pad, body = 'ja=1', { origin = 'https://visuails.com' } = {}) => {
  const res = await adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { cookie: `vis_admin=${adminToken}`, ...(origin ? { origin } : {}), 'content-type': 'application/x-www-form-urlencoded' }, body }), env, waitUntil() {} });
  return { status: res.status, html: await res.text(), location: res.headers.get('location') };
};
const rij = (id) => db.prepare('SELECT closed_at, reopened_at, status FROM orders WHERE id = ?').get(id);
const regels = (id) => db.prepare("SELECT note, actor FROM order_events WHERE order_id = ? AND note LIKE 'Weer geopend%' OR (order_id = ? AND note LIKE 'Reopened%')").all(id, id);
const bronWisdatum = (id) => db.prepare("SELECT expires_at FROM files WHERE order_id = ? AND kind = 'upload'").get(id).expires_at;

console.log('\n1 · wanneer de knop er staat');
ok('afgerond en geleverd: ja', kanHeropenen(rij(STIL) && { ...rij(STIL), service: 'catalog' }));
ok('de €1-proef: nee', kanHeropenen({ closed_at: 'x', status: 'delivered', service: SAMPLE_SERVICE }), false);
ok('nog open: nee', kanHeropenen({ closed_at: null, status: 'delivered', service: 'catalog' }), false);
ok('geannuleerd: nee', kanHeropenen({ closed_at: 'x', status: 'cancelled', service: 'catalog' }), false);
{
  const { status, html } = await get(`/admin/orders/${STIL}/files`);
  ok('de bestelpagina laadt', status, 200);
  const blok = (html.match(/<details class="ingeklapt weer-openen"[\s\S]*?<\/details>/) || [''])[0];
  ok('ingeklapte knop "Weer openen"', /<summary class="btn btn-ghost btn-sm">Weer openen<\/summary>/.test(blok));
  ok('een gewoon formulier naar /weer-openen', new RegExp(`<form class="stack" method="post" action="/admin/orders/${STIL}/weer-openen">`).test(blok));
  ok('met een verplicht vinkje "Ja, weer openen"', /<input type="checkbox" name="ja" value="1" required> Ja, weer openen/.test(blok));
  ok('zonder script of dialoog', /onclick|onsubmit|confirm\(|<script/i.test(blok), false);
  ok('zegt dat er geen mail uitgaat', /Er gaat geen mail uit/.test(blok));
  ok('noemt de nieuwe revisiedatum', blok.includes('tot en met ') && blok.includes('een revisieronde aanvragen'));
}
for (const [naam, id] of [['proef', PROEF], ['nog open', OPEN], ['geannuleerd', GEANNULEERD]]) {
  const { html } = await get(`/admin/orders/${id}/files`);
  ok(`${naam}: geen knop`, /weer-openen"/.test(html) && /action="\/admin\/orders\/\d+\/weer-openen"/.test(html), false);
}
{
  const { html } = await get(`/admin/orders/${RONDE}/files`);
  ok('ronde al gebruikt: dat staat er vóór de klik', /De revisieronde is al gebruikt .*geen tweede ronde indienen/.test(html));
}
ok('zonder kolom reopened_at (vóór 0066): geen knop', weerOpenenBlok({ id: 9, status: 'delivered', closed_at: '2026-10-01 10:00:00', service: 'catalog' }), '');

console.log('\n2 · de post');
{
  const zonderOrigin = await post(`/admin/orders/${STIL}/weer-openen`, 'ja=1', { origin: 'https://elders.example' });
  ok('van een andere site: geweigerd', zonderOrigin.status, 403);
  ok('  en niets veranderd', !!rij(STIL).closed_at, true);
  const zonderVinkje = await post(`/admin/orders/${STIL}/weer-openen`, '');
  ok('zonder vinkje: terug, niets veranderd', [zonderVinkje.status, !!rij(STIL).closed_at], [303, true]);
  const r = await post(`/admin/orders/${STIL}/weer-openen`);
  ok('met vinkje: terug naar de bestelling', [r.status, r.location], [303, `/admin/orders/${STIL}/files#weer-openen`]);
  const na = rij(STIL);
  ok('closed_at leeg', na.closed_at, null);
  ok('reopened_at gezet (vandaag)', String(na.reopened_at || '').slice(0, 10), new Date().toISOString().slice(0, 10));
  ok('status blijft geleverd', na.status, 'delivered');
  ok('de wisdatum van de bronfoto’s is weg', bronWisdatum(STIL), null);
  const rg = regels(STIL);
  ok('één regel op de tijdlijn, zichtbaar voor de klant', rg.length === 1 && rg[0].actor === 'admin');
  ok('  "Weer geopend door VISUAILS op <datum>."', /^Weer geopend door VISUAILS op \d{1,2} [a-z]+ \d{4}\.$/.test(rg[0]?.note || ''));
  ok('in het logboek van /admin', telling(db, "SELECT COUNT(*) FROM admin_log WHERE action = 'order.weer-geopend' AND order_id = ?", STIL), 1);
  ok('er ging geen mail (geen enkele fetch)', gezien.length, 0);
  const tweede = await post(`/admin/orders/${STIL}/weer-openen`);
  ok('een tweede klik doet niets', [tweede.status, regels(STIL).length], [303, 1]);
  const { html } = await get(`/admin/orders/${STIL}/files`);
  ok('daarna: de regel "Weer geopend op … · geen mail"', /<p class="okline weer-geopend" id="weer-openen">Weer geopend op [^<]+ de klant kan tot en met [^<]+ een revisieronde aanvragen &middot; er ging geen mail uit, neem zelf contact op\.<\/p>/.test(html));
  ok('  en geen knop meer', /action="\/admin\/orders\/\d+\/weer-openen"/.test(html), false);
}
{
  await post(`/admin/orders/${EN}/weer-openen`);
  ok('Engelse klant: de regel in het Engels', /^Reopened by VISUAILS on \d{1,2} [A-Z][a-z]+ \d{4}\.$/.test(regels(EN)[0]?.note || ''));
  const p = await post(`/admin/orders/${PROEF}/weer-openen`);
  ok('proef: de post doet niets', [p.status, !!rij(PROEF).closed_at, rij(PROEF).reopened_at], [303, true, null]);
  const g = await heropenBestelling(env, GEANNULEERD);
  ok('geannuleerd: de functie weigert', [g.ok, rij(GEANNULEERD).reopened_at], [false, null]);
  const o = await heropenBestelling(env, OPEN);
  ok('al open: de functie doet niets', [o.ok, o.reden], [false, 'al-open']);
}
ok('heropenNotitie: Nederlandse tijd', heropenNotitie('2026-10-10 23:30:00', 'nl'), 'Weer geopend door VISUAILS op 11 oktober 2026.');

console.log('\n3 · de wisdatum van de bronfoto’s');
{
  const voor = db.prepare(EXPIRED_FILES_SQL).all(500).filter((f) => f.order_id === OUD && f.kind === 'upload').length;
  ok(`afgerond ${UPLOAD_DAYS + 5} dagen geleden: de bronfoto zou vannacht weg mogen`, voor, 1);
  await heropenBestelling(env, OUD);
  const na = db.prepare(EXPIRED_FILES_SQL).all(500).filter((f) => f.order_id === OUD && f.kind === 'upload').length;
  ok('na weer openen: niet meer (closed_at leeg, wisdatum weg)', na, 0);
}

console.log('\n4 · het stille afronden telt vanaf het weer openen');
{
  await tasks.stilAfronden(env);
  ok('de nacht na het weer openen: blijft open (levering is weken oud)', rij(STIL).closed_at, null);
  db.prepare('UPDATE orders SET reopened_at = ? WHERE id = ?').run(dagenTerug(R), STIL);
  await tasks.stilAfronden(env);
  ok(`${R} dagen na weer openen (de laatste revisiedag): nog open`, rij(STIL).closed_at, null);
  db.prepare('UPDATE orders SET reopened_at = ? WHERE id = ?').run(dagenTerug(R + 1), STIL);
  await tasks.stilAfronden(env);
  ok('de nacht erna: stil afgerond', !!rij(STIL).closed_at, true);
  ok('  met de gewone interne regel', telling(db, "SELECT COUNT(*) FROM order_events WHERE order_id = ? AND note = ? AND actor = 'intern'", STIL, STIL_AFGEROND_NOTITIE), 1);
  ok('  en een nieuwe wisdatum vanaf dat nieuwe closed_at',
    bronWisdatum(STIL), db.prepare(`SELECT datetime(closed_at, '+${UPLOAD_DAYS} days') AS d FROM orders WHERE id = ?`).get(STIL).d);
  ok('  en geen mail', gezien.length, 0);
  ok('weer openen kan daarna opnieuw', (await heropenBestelling(env, STIL)).ok, true);
}

console.log('\n5 · Studio en de privélink: de revisiedatum vanaf het weer openen');
{
  const lever = { delivery_mailed_at: '2026-09-01 10:00:00' };
  ok('zonder weer openen: zoals de levermail', leverDatumsVan(lever), leverDatums('2026-09-01 10:00:00'));
  const weer = leverDatumsVan({ ...lever, reopened_at: '2026-10-11 09:00:00' });
  ok('na weer openen: revisie tot en met weer openen + REVISIE_DAGEN', weer.revisieTot, leverDatums('2026-10-11 09:00:00').revisieTot);
  ok('  de bewaardatum blijft vanaf de levering', weer.bewaarTot, leverDatums('2026-09-01 10:00:00').bewaarTot);
  const o = { status: 'delivered', service: 'catalog', closed_at: null, revision_round_at: null, ...lever, reopened_at: '2026-10-11 09:00:00' };
  const files = [{ kind: 'delivery', expires_at: '2026-11-30 10:00:00', superseded_at: null }];
  const zinnen = nuDatums(o, { files, lang: 'nl', vandaag: '2026-10-12' });
  ok('Studio noemt de revisiedatum weer', zinnen.some((z) => /revisie/i.test(z)));
  ok('nuZin geeft de nieuwe revisiedatum door', nuZin(o, { files, vandaag: '2026-10-12' }, 'nl').revisieTot, weer.revisieTot);
  ok('zonder weer openen: geen revisiedatum meer (voorbij)', nuDatums({ ...o, reopened_at: null }, { files, lang: 'nl', vandaag: '2026-10-12' }).some((z) => /revisie/i.test(z)), false);
  /* De bestelkaart in Studio zelf (orderView), zoals bestelkaart-studio.test.mjs. */
  const nu = new Date();
  const sql = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  const kaartBasis = { id: 77, ref: 'VIS-TEST-0077', service: 'catalog', product_count: 2, details_json: '{}', total_cents: 9800, lang: 'nl', status: 'delivered', payment_status: 'paid',
    delivery_mailed_at: sql(new Date(nu.getTime() - 30 * 86400000)), delivered_at: sql(new Date(nu.getTime() - 30 * 86400000)) };
  const beelden = [{ id: 1, kind: 'delivery', product_key: 'p1', shot: 'front', filename: 'p1.webp', review_state: 'approved' }];
  const kaart = (o) => orderView(COPY.nl, 'nl', { ...kaartBasis, ...o }, beelden, [], null, 1, 0, '');
  const tot = leverDatums(nu).revisieTot;
  const datumRegel = COPY.nl.datumRevisie(`${Number(tot.slice(8, 10))} ${['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][Number(tot.slice(5, 7)) - 1]}`);
  const weerOpen = kaart({ closed_at: null, reopened_at: sql(nu) });
  ok('Studio-kaart na weer openen: de revisiedatum vanaf nu', weerOpen.datums.includes(datumRegel), true);
  const nogDicht = kaart({ closed_at: sql(new Date(nu.getTime() - 20 * 86400000)) });
  ok('  en afgerond (vóór weer openen): geen revisiedatum', nogDicht.datums.some((z) => z === datumRegel), false);
  const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  ok('Studio leest reopened_at mee (loadOrders)', /credits_used,\s*--[^\n]*\n\s*reopened_at,/.test(lees('src/lib/account.js')));
  ok('de privélink ook, met terugval vóór 0066', /const WEER_KOLOM = 'o\.reopened_at,';/.test(lees('src/lib/portal.js')) && /\.replace\(WEER_KOLOM, metRonde \? WEER_KOLOM : ''\)/.test(lees('src/lib/portal.js')));
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
