/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE WEEK STARTEN — HET GELDPAD DAT ER NIET WAS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * startPlanWindow() in src/lib/planStart.js maakt van de bovenste items op de
 * lijst van een abonnee één bestelling, hangt de items eraan en schrijft het
 * saldo af. Zie de kop van dat bestand voor waarom die functie er niet was en
 * waarom hij een ADMINhandeling is en geen nachtelijke taak.
 *
 * ── WAAROM TEGEN EEN ECHTE SQLITE ───────────────────────────────────────────
 *
 * Dezelfde reden als bij tests/subscription.test.mjs, en hier zwaarder: deze
 * functie doet een INSERT op `orders`, een tabel met NOT NULL-kolommen en een
 * UNIQUE op `ref`. Een stub die alles slikt, bewijst dat de functie draait — niet
 * dat de database de rij accepteert. Precies dát was de fout die migratie 0030
 * bij `payments.order_id` beschrijft: een INSERT die de database weigerde, een
 * catch die "constraint" doorliet, en saldo dat werd toegekend zonder spoor.
 *
 * ── WAT HIER BEWEZEN MOET WORDEN ────────────────────────────────────────────
 *
 *   · een item ZONDER foto's wordt overgeslagen en blijft op de lijst staan;
 *   · er wordt nooit meer opgepakt dan het saldo toelaat, en de rest blijft
 *     wachten in plaats van dat de hele handeling wordt geweigerd;
 *   · twee keer starten pakt niets dubbel — de knop kan per ongeluk twee keer
 *     ingedrukt worden;
 *   · de bestelling draagt GEEN bedrag en staat op payment_status 'plan', zodat
 *     geen omzetsom de maand dubbel telt en de klant geen betaalknop krijgt;
 *   · een gepauzeerd abonnement start niets.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { startPlanWindow, klaarOmTeStarten } from '../src/lib/planStart.js';
import {
  createSubscriptionRow, activateSubscription, pauseSubscription,
  queueAdd, planState, monthKey,
} from '../src/lib/subscription.js';
import { productsFor } from '../src/data/plans.js';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }
const env = { DB: d1(db) };

db.exec("INSERT INTO customers (id, email, brand, name) VALUES (1, 'mara@volt.test', 'VOLT', 'Mara')");
const { row: sub } = await createSubscriptionRow(env, { customerId: 1, planId: 'studio', termId: 'monthly', windowDay: 8 });
await activateSubscription(env, sub.id);

/* De maand moet toegekend zijn, anders is er niets te besteden — dat is precies
   wat er in productie gebeurt zodra de eerste incasso binnenkomt. */
const maand = monthKey();
const toegekend = productsFor('studio');
db.prepare('INSERT INTO subscription_months (subscription_id, month, granted, used) VALUES (?, ?, ?, 0)')
  .run(sub.id, maand, toegekend);

console.log('\nwat er klaarstaat, en wat niet');
await queueAdd(env, 1, { name: 'Winterjas, zwart', uploadBatch: 'b-001' });
await queueAdd(env, 1, { name: 'Gebreide trui', uploadBatch: '' });      // geen foto's
await queueAdd(env, 1, { name: 'Cargobroek, sand', uploadBatch: 'b-002' });

let st = await planState(env, 1);
const klaar = klaarOmTeStarten(st);
ok('drie op de lijst, twee met foto’s', klaar.items.length, 2);
ok('en één telt als "zonder foto’s"', klaar.zonderFotos, 1);

console.log('\nde week starten maakt één bestelling');
const r = await startPlanWindow(env, 1);
ok('het lukt', r.ok, true);
ok('met twee producten', r.aantal, 2);
ok('en een kenmerk in de bestelvorm', /^VIS-[0-9A-Z]{4}-[0-9A-Z]{3}$/.test(r.ref || ''), true);

const bestelling = db.prepare('SELECT * FROM orders WHERE id = ?').get(r.orderId);
ok('de bestelling staat in de database', Boolean(bestelling), true);
ok('zonder bedrag', bestelling.total_cents, 0);
ok('en op payment_status "plan"', bestelling.payment_status, 'plan');
ok('met het aantal producten erop', bestelling.product_count, 2);
ok('de klant hangt eraan', bestelling.customer_id, 1);

const details = JSON.parse(bestelling.details_json);
ok('de producten staan als product_pN', [details.product_p1, details.product_p2],
  ['Winterjas, zwart', 'Cargobroek, sand']);
ok('en de bestelling weet van welk abonnement hij komt', details.abonnement, sub.ref);

console.log('\nde lijst en het saldo lopen mee');
const rijen = db.prepare('SELECT name, taken_at, order_id FROM plan_queue ORDER BY position').all();
ok('de twee met foto’s zijn opgepakt',
  rijen.filter((q) => q.taken_at).map((q) => q.name), ['Winterjas, zwart', 'Cargobroek, sand']);
ok('en hangen aan de bestelling',
  rijen.filter((q) => q.order_id).every((q) => q.order_id === r.orderId), true);
ok('het item zonder foto’s staat er nog',
  rijen.find((q) => q.name === 'Gebreide trui').taken_at, null);

const m = db.prepare('SELECT used FROM subscription_months WHERE subscription_id = ? AND month = ?')
  .get(sub.id, maand);
ok('er is twee keer saldo afgeschreven', m.used, 2);

console.log('\ntwee keer drukken pakt niets dubbel');
const nog = await startPlanWindow(env, 1);
ok('de tweede keer valt er niets te starten', nog.ok, false);
ok('en dat is "niets klaar" en niet "geen saldo"', nog.reden, 'niets-klaar');
ok('het saldo is niet nog een keer afgeschreven',
  db.prepare('SELECT used FROM subscription_months WHERE subscription_id = ? AND month = ?')
    .get(sub.id, maand).used, 2);
ok('en er is geen tweede bestelling',
  db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 1);

console.log('\nmeer op de lijst dan saldo: de rest wacht, niets wordt geweigerd');
/* Het saldo op één zetten en drie nieuwe items met foto's neerleggen. */
db.prepare('UPDATE subscription_months SET used = ? WHERE subscription_id = ? AND month = ?')
  .run(toegekend - 1, sub.id, maand);
await queueAdd(env, 1, { name: 'Sjaal', uploadBatch: 'b-003' });
await queueAdd(env, 1, { name: 'Muts', uploadBatch: 'b-004' });
await queueAdd(env, 1, { name: 'Handschoenen', uploadBatch: 'b-005' });

st = await planState(env, 1);
ok('er is nog één credit', st.saldo, 1);
const kap = await startPlanWindow(env, 1);
ok('en er wordt één product opgepakt', [kap.ok, kap.aantal], [true, 1]);
ok('de andere twee blijven wachten',
  db.prepare("SELECT COUNT(*) AS n FROM plan_queue WHERE taken_at IS NULL AND upload_batch <> ''").get().n, 2);
ok('het saldo staat op nul',
  (await planState(env, 1)).saldo, 0);
const opNul = await startPlanWindow(env, 1);
ok('en dan start er niets meer', [opNul.ok, opNul.reden], [false, 'geen-saldo']);

console.log('\neen gepauzeerd abonnement start niets');
db.prepare('UPDATE subscription_months SET used = 0 WHERE subscription_id = ? AND month = ?')
  .run(sub.id, maand);
await pauseSubscription(env, sub.id, 'payment_failed');
const gepauzeerd = await startPlanWindow(env, 1);
ok('geweigerd', gepauzeerd.ok, false);
ok('met de reden erbij', gepauzeerd.reden, 'abonnement-paused');
ok('en er is nog steeds één bestelling per gestarte week',
  db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 2);

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EN DAN DE ECHTE ROUTE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Alles hierboven roept de functie rechtstreeks aan. Dat bewijst de rekensom en
 * niet de KNOP: een handler kan perfect werken terwijl de route hem nooit
 * bereikt, of terwijl het paneel de knop niet toont. Precies dat was de fout bij
 * de revisieronde — het vervangen van een foto werkte end to end, alleen zat er
 * geen formulier omheen.
 *
 * Dus: een echte admin-sessie, een echte POST met een Origin die klopt, en de
 * klantpagina erna nagelezen op wat er nu staat.
 */
console.log('\nde knop in /admin doet hetzelfde');
db.prepare("UPDATE subscriptions SET status = 'active', paused_at = NULL, pause_reason = NULL WHERE id = ?").run(sub.id);
db.prepare('UPDATE subscription_months SET used = 0 WHERE subscription_id = ? AND month = ?').run(sub.id, maand);
await queueAdd(env, 1, { name: 'Bodywarmer', uploadBatch: 'b-006' });

const token = await mintToken();
db.prepare("INSERT INTO admin_users (email, password_hash) VALUES ('lucas@visuails.com', 'x')").run();
const adminId = db.prepare('SELECT id FROM admin_users ORDER BY id DESC LIMIT 1').get().id;
db.prepare("INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 day'))")
  .run(adminId, await hashToken(token));

const kop = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };

const voor = await adminGet({
  request: new Request('https://visuails.com/admin/customers/1', { headers: kop }), env, waitUntil() {},
}).then((r) => r.text());
ok('de klantpagina toont het abonnementspaneel', voor.includes('Abonnementsweek'), true);
ok('met de knop erin', voor.includes('/admin/customers/1/week'), true);
ok('en de lijst van de klant erboven', voor.includes('Bodywarmer'), true);

const bestellingenVoor = db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
const antwoord = await adminPost({
  request: new Request('https://visuails.com/admin/customers/1/week', {
    method: 'POST', headers: { ...kop, 'content-type': 'application/x-www-form-urlencoded' }, body: '',
  }), env, waitUntil() {},
});
ok('de POST stuurt terug naar de klantpagina', antwoord.status, 303);
ok('en er is een bestelling bij gekomen',
  db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, bestellingenVoor + 1);
ok('de handeling staat in het logboek',
  db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE action = 'plan-week-start'").get().n, 1);

/* Niet "de lijst is leeg": het item zonder foto's staat er nog steeds en hoort
   er te staan. Wat er wél moet kloppen is dat er niets meer KLAAR staat — alles
   met foto's is opgepakt. Dat is de bewering die iets zegt. */
ok('er staat daarna niets meer klaar met foto’s',
  db.prepare("SELECT COUNT(*) AS n FROM plan_queue WHERE taken_at IS NULL AND upload_batch <> ''").get().n, 0);
const na = await adminGet({
  request: new Request('https://visuails.com/admin/customers/1', { headers: kop }), env, waitUntil() {},
}).then((r) => r.text());
ok('en het paneel zegt dat er niets te starten valt',
  na.includes('Er valt nu niets te starten.'), true);
ok('het item zonder foto’s staat er nog wel', na.includes('nog geen foto'), true);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
