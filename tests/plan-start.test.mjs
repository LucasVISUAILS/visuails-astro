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
import { d1, verseDb, zetLook } from './lib/d1sqlite.mjs';
import { startPlanWindow, klaarOmTeStarten } from '../src/lib/planStart.js';
import {
  createSubscriptionRow, activateSubscription, pauseSubscription,
  queueAdd, queueLock, planState, monthKey,
} from '../src/lib/subscription.js';
import { grantSlots, slotBalans, creditsPerSoort, verbruikSlot, geefSlotTerug } from '../src/lib/slots.js';
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
zetLook(db, 1);
const { row: sub } = await createSubscriptionRow(env, { customerId: 1, planId: 'studio', termId: 'monthly', windowDay: 8 });
await activateSubscription(env, sub.id);

/* De maand moet toegekend zijn, anders is er niets te besteden — dat is precies
   wat er in productie gebeurt zodra de eerste incasso binnenkomt. */
const maand = monthKey();
const toegekend = productsFor('studio');
db.prepare('INSERT INTO subscription_months (subscription_id, month, granted, used) VALUES (?, ?, ?, 0)')
  .run(sub.id, maand, toegekend);
/* En de slots per soort — migratie 0035. Sinds die migratie gaat het verbruik
   via subscription_slots; de twee tellers hierboven blijven staan voor de
   factuur en de geschiedenis. */
await grantSlots(env, sub.id, maand, 'studio');

console.log('\nalleen wat VASTGEZET is telt mee');
/* ── DIT BLOK IS OMGEZET — migratie 0035, 29 augustus 2026 ──────────────────
 *
 * Het toetste hiervoor het oude model: alles met foto's ging mee, en het saldo
 * werd HIER afgeschreven. Sinds Lucas' slotmodel gebeurt dat afschrijven bij het
 * vastzetten door de klant, en pakt de week alleen op wat vastgezet is.
 *
 * Wat deze toets daarom nu bewijst is precies het omgekeerde van eerst: dat
 * startPlanWindow() NIETS meer afschrijft. Zou dat wél gebeuren, dan betaalt een
 * klant twee keer voor hetzelfde product — één keer bij het vastzetten en één
 * keer als wij het maken — en dat is onzichtbaar tot iemand zijn saldo natelt. */
/* a1 is sinds 19 september een LIFESTYLE-product en niet meer een complete
   bundel: die dienst bestaat niet meer, en de lifestylekant is precies wat het
   lookblok hieronder wil toetsen. */
const a1 = await queueAdd(env, 1, { name: 'Winterjas, zwart', uploadBatch: 'b-001', kind: 'lifestyle' });
const a2 = await queueAdd(env, 1, { name: 'Gebreide trui', uploadBatch: '' });      // geen foto's
/* Met een eigen gezicht (migratie 0050): 'ava' uit de bibliotheek. */
const a3 = await queueAdd(env, 1, { name: 'Cargobroek, sand', uploadBatch: 'b-002', model: 'ava' });

console.log('\nzonder look geen vastzetten — ronde 4, 19 september 2026');
{
  /* Lucas: "Toestaan als de look gezet is." De look van klant 1 staat (zetLook);
     haal de lifestylekant weg en een lifestyleproduct mag niet meer vast — met
     de dienst erbij, zodat het scherm naar de juiste kaart kan wijzen. */
  db.exec("DELETE FROM customer_style_locks WHERE customer_id = 1 AND style = 'lifestyle'");
  const dicht = await queueLock(env, 1, a1.id);
  ok('de poort is dicht', dicht.ok, false);
  ok('met de reden geen-look', dicht.reden, 'geen-look');
  ok('en zegt welke dienst open staat', dicht.ontbreekt, ['lifestyle']);
  const balans0 = (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits');
  ok('en er zijn géén credits afgeschreven', balans0.verbruikt, 0);
  /* Een look zonder huisstijl telt niet als gezet. */
  db.exec("INSERT INTO customer_style_locks (customer_id, style, ratio) VALUES (1, 'lifestyle', 'portrait45')");
  ok('een lifestyle-rij zonder look houdt de poort dicht', (await queueLock(env, 1, a1.id)).reden, 'geen-look');
  db.exec("UPDATE customer_style_locks SET look = 'dunes' WHERE customer_id = 1 AND style = 'lifestyle'");
}

let st = await planState(env, 1);
ok('drie op de lijst, nog niets vastgezet', klaarOmTeStarten(st).items.length, 0);
ok('en drie concepten', klaarOmTeStarten(st).concepten, 3);

ok('vastzetten van de eerste lukt', (await queueLock(env, 1, a1.id)).ok, true);
ok('de tweede kan niet — geen foto\u2019s', (await queueLock(env, 1, a2.id)).reden, 'geen-fotos');
ok('de derde lukt weer', (await queueLock(env, 1, a3.id)).ok, true);

/* De twee vastgezette producten zijn a1 (lifestyle) en a3 (catalog, de
   standaardsoort). Uitgerekend uit de tabel en niet als 9 ingetypt: een getal
   hier zou de dag dat pricing.js verandert stil verkeerd worden. */
const KOSTEN_VAST = creditsPerSoort('lifestyle') + creditsPerSoort('catalog');
const naVast = (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits');
ok('er zijn credits afgeschreven bij het VASTZETTEN', naVast.verbruikt, KOSTEN_VAST);

st = await planState(env, 1);
const klaar = klaarOmTeStarten(st);
ok('en nu staan er twee klaar', klaar.items.length, 2);
ok('met één concept eronder', klaar.concepten, 1);

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

console.log('\nde vaste look gaat mee in de bestelling — ronde 4');
/* Zie src/lib/vasteLook.js: dezelfde sleutels als het bestelformulier, zodat
   /admin en de werkmap de bestelling lezen als elke andere. */
ok('de achtergrond van de catalogkant staat erin', details.background_hex, '#FFFFFF');
ok('met de id uit backgrounds.js', details.background, 'white');
ok('de huisstijl van de lifestylekant als style', details.style, 'dunes');
ok('het gezicht per product staat als model_pN', details.model_p2, 'ava');
ok('en een product zonder eigen gezicht heeft er geen', 'model_p1' in details, false);
ok('de soort staat per product', details.kind_p1, 'lifestyle');

console.log('\nde lijst loopt mee, en het saldo wordt NIET nog een keer geraakt');
const rijen = db.prepare('SELECT name, taken_at, order_id FROM plan_queue ORDER BY position').all();
ok('de twee vastgezette zijn opgepakt',
  rijen.filter((q) => q.taken_at).map((q) => q.name), ['Winterjas, zwart', 'Cargobroek, sand']);
ok('en hangen aan de bestelling',
  rijen.filter((q) => q.order_id).every((q) => q.order_id === r.orderId), true);
ok('het concept staat er nog',
  rijen.find((q) => q.name === 'Gebreide trui').taken_at, null);

const naStart = (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits');
ok('nog steeds hetzelfde verbruikt en niet het dubbele', naStart.verbruikt, KOSTEN_VAST);

console.log('\ntwee keer drukken pakt niets dubbel');
const nog = await startPlanWindow(env, 1);
ok('de tweede keer valt er niets te starten', nog.ok, false);
ok('en dat is "niets klaar"', nog.reden, 'niets-klaar');
ok('het saldo is niet geraakt',
  (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits').verbruikt, KOSTEN_VAST);
ok('en er is geen tweede bestelling',
  db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 1);

console.log('\nvastzetten kan niet meer dan er credits zijn');
{
  /* ── HET SALDO LEEGTREKKEN — omgeschreven 19 september 2026 ──────────────
     Hier stond een lus die één product per slot toevoegde. Met credits is een
     product niet meer één eenheid maar vier, en een lus die 111 keer draait
     loopt tegen QUEUE_MAX (veertig) aan — dan geeft queueAdd() null terug en
     valt de toets om op iets wat niets met het saldo te maken heeft.
     Nu: het saldo rechtstreeks leegschrijven, want wát het opmaakt is hierboven
     al getoetst. Deze toets gaat over de POORT en niet over de boekhouding. */
  const over = (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits').saldo;
  await verbruikSlot(env, sub.id, 1, 'credits', over);
  ok('het saldo staat op nul',
    (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits').saldo, 0);
  const teveel = await queueAdd(env, 1, { name: 'Eentje te veel', uploadBatch: 'v-x' });
  const v = await queueLock(env, 1, teveel.id);
  ok('en dan weigert vastzetten', v.ok, false);
  ok('met de reden erbij', v.reden, 'geen-credits');
  ok('en met de prijs, zodat het scherm kan zeggen hoeveel je tekortkomt',
    v.kosten, creditsPerSoort('catalog'));
  ok('het item blijft een concept',
    db.prepare('SELECT locked_at FROM plan_queue WHERE id = ?').get(teveel.id).locked_at, null);
  /* Opruimen: het saldo terug en de lijst leeg, zodat het blok hieronder van
     een schone lei begint. */
  await geefSlotTerug(env, sub.id, 1, 'credits', over);
  db.exec("DELETE FROM plan_queue WHERE taken_at IS NULL");
}

console.log('\neen gepauzeerd abonnement start niets');
{
  db.prepare('UPDATE subscription_slots SET used = 0 WHERE subscription_id = ?').run(sub.id);
  const q = await queueAdd(env, 1, { name: 'Bodywarmer, groen', uploadBatch: 'b-006' });
  await queueLock(env, 1, q.id);
  await pauseSubscription(env, sub.id, 'payment_failed');
  const gepauzeerd = await startPlanWindow(env, 1);
  ok('geweigerd', gepauzeerd.ok, false);
  ok('met de reden erbij', gepauzeerd.reden, 'abonnement-paused');
  ok('en er is niets opgepakt',
    db.prepare('SELECT COUNT(*) AS n FROM plan_queue WHERE taken_at IS NOT NULL').get().n, 2);
}

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
/* Een item ZONDER foto's blijft staan: het adminpaneel hoort te melden dat er
   iets op de lijst staat dat nog niet mee kan. */
await queueAdd(env, 1, { name: 'Sjaal zonder beeld', uploadBatch: '' });

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
/* ── HET PANEEL SPREEKT DE TAAL VAN HET CREDITMODEL — 19 september 2026 ───────
 *
 * Deze toets is twee keer omgedraaid en dat is precies waarom hij bestaat.
 *
 * Tot 29 augustus stond er "12 credits over" bij een knop die geen credits
 * aanraakte — toen kwam het slotmodel en werd de toets: NIET over credits
 * praten. Sinds 19 september is er weer één pot, en klopt het woord weer.
 *
 * Wat in alle drie de versies hetzelfde is gebleven, en het eigenlijke punt:
 * deze knop schrijft NIETS af. Dat gebeurde al toen de klant vastzette. Een
 * paneel dat anders suggereert, geeft Lucas een verkeerd beeld van zijn eigen
 * systeem. Die regel staat er dus nog woordelijk onder. */
ok('het paneel toont het saldo in credits',
  /credits over/.test(voor), true);
ok('de lijst noemt vastgezet en concept', /vastgezet &middot;|concept,/.test(voor), true);
ok('en de knop belooft niet dat hij nog iets afschrijft',
  /schrijft evenveel credits af/.test(voor), false);

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

console.log('\ndie week annuleren geeft de slots \u00e9n de producten terug');
/* ── HET GAT VAN 29 AUGUSTUS 2026 ───────────────────────────────────────────
 *
 * Losmaken en weghalen op de klantlijst gaven het slot terug; annuleren in
 * /admin niet. De klant had zijn slot betaald met zijn maandtermijn, het product
 * was niet gemaakt, en zowel het slot als het item waren weg — twee keer betalen
 * voor niets, en van buiten niet te zien.
 *
 * Deze toets loopt over de ECHTE route en niet over de functie: het gat zat niet
 * in het terugboeken (dat bestond) maar in het feit dat de annulering hem niet
 * aanriep. Precies de fout van de revisieronde, één laag verder.
 *
 * Het vierde punt is de invariant waar het model op rust: locked_at gezet ⟺ er
 * is een slot afgeschreven. Komt een item terug als VASTGEZET terwijl het slot
 * terugging, dan staat er een rij die beweert betaald te zijn en is de
 * administratie stil scheef.
 *
 * EIGEN OPSTELLING, want alles hierboven heeft aan dezelfde tellers gezeten.
 * Een toets die op de restanten van de vorige leunt, valt om zodra iemand daar
 * iets bijzet — en dan wijst hij de verkeerde kant op. */
{
  db.exec('DELETE FROM plan_queue');
  db.prepare('UPDATE subscription_slots SET used = 0 WHERE subscription_id = ?').run(sub.id);
  db.prepare("UPDATE subscriptions SET status = 'active' WHERE id = ?").run(sub.id);

  const x1 = await queueAdd(env, 1, { name: 'Regenjas, olijf', uploadBatch: 'b-a1' });
  const x2 = await queueAdd(env, 1, { name: 'Laarzen, bruin', uploadBatch: 'b-a2' });
  ok('twee vastzetten lukt',
    [(await queueLock(env, 1, x1.id)).ok, (await queueLock(env, 1, x2.id)).ok], [true, true]);
  const verbruiktNaVast = (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits').verbruikt;
  ok('en er staan credits op verbruikt', verbruiktNaVast, creditsPerSoort('catalog') * 2);

  const week = await startPlanWindow(env, 1);
  ok('de week start met twee producten', [week.ok, week.aantal], [true, 2]);
  ok('het verbruik is daardoor niet opgelopen',
    (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits').verbruikt, verbruiktNaVast);

  const res = await adminPost({
    request: new Request(`https://visuails.com/admin/orders/${week.orderId}/cancel`, {
      method: 'POST',
      headers: { ...kop, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ reason: 'Merk stopt met de lijn.' }).toString(),
    }), env, waitUntil() {},
  });
  ok('de annulering gaat door zonder dat er een geldkeuze gevraagd wordt', res.status, 303);
  ok('de bestelling staat op geannuleerd',
    db.prepare('SELECT status FROM orders WHERE id = ?').get(week.orderId).status, 'cancelled');

  ok('de twee slots zijn teruggeboekt',
    (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits').verbruikt, 0);

  const rijen = db.prepare('SELECT id, locked_at, taken_at, order_id FROM plan_queue WHERE id IN (?, ?)')
    .all(x1.id, x2.id);
  ok('de producten staan weer op de lijst',
    rijen.length === 2 && rijen.every((r) => r.order_id === null && r.taken_at === null), true);
  ok('en wel als CONCEPT, want het slot is terug',
    rijen.every((r) => r.locked_at === null), true);

  /* De klant leest de tijdlijn. Daar stond "Nothing was paid" — over werk waar
     hij via zijn maandtermijn wel degelijk voor betaald heeft. */
  const tijdlijn = db.prepare("SELECT note FROM order_events WHERE order_id = ? AND status = 'cancelled'")
    .all(week.orderId).map((r) => r.note).join(' | ');
  ok('de tijdlijn zegt niet dat er niets betaald is', /Nothing was paid/.test(tijdlijn), false);
  ok('maar dat het uit het abonnement kwam', /subscription/i.test(tijdlijn), true);
  ok('en dat zijn producten terugstaan', /op je lijst/.test(tijdlijn), true);

  ok('de handeling staat in het logboek',
    db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE action LIKE 'plan-slots-terug%'").get().n, 1);

  /* TWEE KEER ANNULEREN MAG GEEN TWEEDE KEER TERUGBOEKEN. De UPDATE draagt zijn
     eigen voorwaarde, dus de tweede ronde vindt niets — geen vlag, geen teller.
     Zou dit wel dubbel boeken, dan krijgt de klant slots die hij nooit gekocht
     heeft, en dat is de andere kant van dezelfde stille fout. */
  await adminPost({
    request: new Request(`https://visuails.com/admin/orders/${week.orderId}/cancel`, {
      method: 'POST',
      headers: { ...kop, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ reason: 'Per ongeluk nog een keer.' }).toString(),
    }), env, waitUntil() {},
  });
  ok('een tweede annulering boekt niets extra terug',
    (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits').verbruikt, 0);
  ok('en zet de producten niet nog een keer terug',
    db.prepare('SELECT COUNT(*) AS n FROM plan_queue').get().n, 2);
}

console.log('\nslots met de hand bijstellen in /admin');
/* Werklijst §3, sinds 6 augustus open: "er gaat een keer iets mis en dan wil je
   het kunnen rechtzetten". Sinds het slotmodel is dat geen luxe — een mislukte
   incasso die later alsnog binnenkomt laat een klant met nul slots achter, en
   het alternatief zonder deze knop is met de hand een UPDATE op D1 typen. Dat is
   precies het soort handeling dat niemand vastlegt.

   Wat hier bewezen moet worden is niet dat het getal verandert maar dat het NIET
   verandert waar dat oneerlijk zou zijn: onder wat er al vastgezet is, want daar
   staat werk tegenover dat de klant beloofd is. */
{
  const slotUrl = 'https://visuails.com/admin/customers/1/slots';
  const post = (velden) => adminPost({
    request: new Request(slotUrl, {
      method: 'POST', headers: { ...kop, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(velden).toString(),
    }), env, waitUntil() {},
  });
  const saldo = async () => (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits');

  ok('de knop staat op de klantpagina', (await adminGet({
    request: new Request('https://visuails.com/admin/customers/1', { headers: kop }), env, waitUntil() {},
  }).then((r) => r.text())).includes('/admin/customers/1/slots'), true);

  const voor = await saldo();
  ok('drie erbij lukt', (await post({ kind: 'credits', delta: '3', reason: 'incasso van juli kwam alsnog binnen' })).status, 303);
  ok('en het saldo loopt mee', (await saldo()).saldo, voor.saldo + 3);
  ok('de bijstelling staat met reden en al in het logboek',
    db.prepare("SELECT detail FROM admin_log WHERE action = 'plan-slots-correctie' ORDER BY id DESC LIMIT 1")
      .get().detail.includes('incasso van juli'), true);

  ok('zonder reden gaat het niet door', (await post({ kind: 'credits', delta: '3' })).status, 400);
  ok('nul is geen bijstelling', (await post({ kind: 'credits', delta: '0', reason: 'x' })).status, 400);
  ok('en meer dan het maximum ook niet', (await post({ kind: 'credits', delta: '9999', reason: 'x' })).status, 400);
  /* Het formulier post `kind` sinds 19 september als verborgen veld met de
     vaste waarde 'credits' — er valt niets meer te kiezen. Wat hier getoetst
     wordt is dus dat de route zelf hem nog steeds eist en niet aanneemt. */
  ok('zonder soort evenmin', (await post({ delta: '1', reason: 'x' })).status, 400);
  ok('het saldo is door al die weigeringen niet geraakt', (await saldo()).saldo, voor.saldo + 3);

  /* En de grens die er echt toe doet. Eerst iets vastzetten, dan proberen die
     slots af te nemen: dat mag niet, want er staat werk tegenover. */
  const y = await queueAdd(env, 1, { name: 'Trui, ecru', uploadBatch: 'b-y' });
  await queueLock(env, 1, y.id);
  const vast = (await saldo()).verbruikt;
  ok('er staat iets vastgezet', vast > 0, true);
  const teVeel = -((await saldo()).toegekend);
  ok('alles afnemen wordt geweigerd', (await post({ kind: 'credits', delta: String(teVeel), reason: 'te veel' })).status, 400);
  ok('en de weigering staat ook in het logboek',
    db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE action = 'plan-slots-correctie.geweigerd'").get().n, 1);
  ok('het saldo staat er nog ongeschonden bij', (await saldo()).verbruikt, vast);

  /* Wat wél mag: eraf halen tot precies aan wat vastgezet staat. */
  const over = (await saldo()).saldo;
  ok('tot aan het vastgezette mag het wel', (await post({ kind: 'credits', delta: String(-over), reason: 'correctie te ruim gegeven' })).status, 303);
  ok('en dan is er niets meer over', (await saldo()).saldo, 0);
  ok('maar staat er nog steeds vastgezet wat vastgezet was', (await saldo()).verbruikt, vast);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
