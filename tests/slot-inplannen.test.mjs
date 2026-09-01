/*
 * ═══════════════════════════════════════════════════════════════════════════
 * EEN SLOT KRIJGT ZIJN EIGEN TWEE DAGEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 31 augustus 2026: *"Een klant kan wanneer hij een slot gebruikt niet de
 * komende 2 dagen kiezen ... er moeten altijd 2 dagen achter elkaar gekozen
 * worden ... de klant kan ook kiezen voor 'Zo snel mogelijk'."*
 *
 * Dit draait tegen een ECHTE sqlite met schema.sql erin, want de drie dingen die
 * hier fout kunnen gaan, gaan alledrie stil fout:
 *
 *   1. de browser stuurt een dag die niet kan, en de server neemt hem over;
 *   2. een concept houdt dagen bezet, waarna één klant de agenda kan dichtzetten
 *      met plannen die hij nooit uitvoert;
 *   3. "zo snel mogelijk" laat de oude dagen staan, en dan is de agenda voller
 *      dan de studio is.
 */

import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { accountPost } from '../src/lib/account.js';
import { loadQueue } from '../src/lib/subscription.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { readCalendar } from '../src/lib/agenda.js';
import { startPlanWindow } from '../src/lib/planStart.js';
import {
  ATTENDED_IMAGES_PER_DAY, WINDOW_DAYS,
  addDays, firstOfferableDay, windowFor,
} from '../src/data/capacity.js';
import { KIND_IMAGES } from '../src/data/pricing.js';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }
const env = { DB: d1(db), UPLOADS: { async put() {} } };

const VANDAAG = new Date().toISOString().slice(0, 10);
const EERSTE = firstOfferableDay(VANDAAG);

db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'mara@volt.test', 'VOLT')");
db.exec(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status)
         VALUES (1, 1, 'ABO-TEST-1', 'studio', 'monthly', 'active')`);
const maand = VANDAAG.slice(0, 7);
db.prepare(`INSERT INTO subscription_slots (subscription_id, month, kind, granted, used)
            VALUES (1, ?, 'complete', 12, 0)`).run(maand);
db.exec(`INSERT INTO plan_queue (id, customer_id, position, name, upload_batch, kind)
         VALUES (7, 1, 0, 'Winterjas, zwart', 'b-7', 'complete')`);

const token = await mintToken();
db.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, datetime('now','+1 day'))")
  .run(await hashToken(token));

async function post(velden) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.set(k, String(v));
  const request = new Request('https://visuails.com/account/plan/queue', {
    method: 'POST',
    headers: { cookie: `vis_account=${token}`, origin: 'https://visuails.com' },
    body: fd,
  });
  return accountPost({ request, env, waitUntil() {} });
}
const rij = async () => (await loadQueue(env, 1))[0];

/* ══ 1 · DE STANDAARD IS ZO SNEL MOGELIJK ═════════════════════════════════ */
console.log('\neen nieuw item heeft geen dag, en dat is de bedoeling');
{
  const q = await rij();
  ok('asap staat aan', q.asap, 1);
  ok('en er staat geen dag', [q.window_start, q.window_end], [null, null]);
}

/* ══ 2 · DE AANLOOP IS NIET TE OMZEILEN ═══════════════════════════════════ */
console.log('\nde eerste dagen zijn niet aan te wijzen, ook niet met een eigen POST');
{
  const teVroeg = addDays(VANDAAG, 1);
  const res = await post({ do: 'plan', id: 7, dag: teVroeg });
  ok('de post gaat terug naar het inplanscherm met een reden',
    res.headers.get('location'), '/account/plan?tab=bestellen&kies=7&fout=vol');
  const q = await rij();
  ok('  en er is niets vastgelegd', [q.window_start, q.window_end], [null, null]);

  const rommel = await post({ do: 'plan', id: 7, dag: 'morgen graag' });
  ok('een dag die geen datum is, wordt geweigerd op vorm',
    rommel.headers.get('location'), '/account/plan?tab=bestellen&kies=7&fout=dag');
}

/* ══ 3 · HET PAAR WORDT UITGEREKEND EN NIET AANGENOMEN ════════════════════ */
console.log('\nde server bepaalt zelf welke tweede dag erbij hoort');
{
  const res = await post({ do: 'plan', id: 7, dag: EERSTE });
  ok('de post gaat terug naar de lijst', res.headers.get('location'), '/account/plan?tab=bestellen');

  const q = await rij();
  const verwacht = windowFor(EERSTE, KIND_IMAGES.complete, {}, new Set());
  ok('de eerste dag is de aangewezen dag', q.window_start, EERSTE);
  ok('en de tweede komt uit windowFor()', q.window_end, verwacht[verwacht.length - 1]);
  ok('het zijn er WINDOW_DAYS', verwacht.length, WINDOW_DAYS);
  ok('en asap staat uit', q.asap, 0);
}

/* ══ 4 · EEN CONCEPT HOUDT NIETS BEZET ════════════════════════════════════ */
console.log('\nalleen een vastgezet item houdt zijn dagen');
{
  const q = await rij();
  const voor = await readCalendar(env, VANDAAG);
  ok('een concept met dagen telt niet mee in de agenda',
    voor.booked[q.window_start] || 0, 0);

  db.prepare("UPDATE plan_queue SET locked_at = datetime('now') WHERE id = 7").run();
  const na = await readCalendar(env, VANDAAG);
  ok('en zodra het vastgezet is, wel',
    na.booked[q.window_start], Math.ceil(KIND_IMAGES.complete / WINDOW_DAYS));
  ok('  op allebei de dagen',
    na.booked[q.window_end], Math.ceil(KIND_IMAGES.complete / WINDOW_DAYS));
}

/* ══ 5 · TERUG NAAR ZO SNEL MOGELIJK LAAT DE DAGEN ECHT LOS ══════════════ */
console.log('\nzo snel mogelijk maakt de dagen leeg en negeert ze niet');
{
  const voor = await rij();
  await post({ do: 'asap', id: 7 });
  const q = await rij();
  ok('de dagen zijn weg', [q.window_start, q.window_end], [null, null]);
  ok('en asap staat weer aan', q.asap, 1);

  const na = await readCalendar(env, VANDAAG);
  ok('de agenda is die dag weer vrij', na.booked[voor.window_start] || 0, 0);
}

/* ══ 6 · EEN VOLLE DAG KAN GEEN EERSTE DAG ZIJN ══════════════════════════ */
console.log('\neen dag die vol zit, wordt niet aangeboden en niet aangenomen');
{
  // Een bestelling die de vroegste dag helemaal vult.
  db.prepare(`INSERT INTO orders (ref, service, status, tier, name, email, product_count,
                                  window_start, window_end, payment_status)
              VALUES ('VIS-TEST-1', 'drop', 'received', 'attended', 'Test', 'test@volt.test', 30, ?, ?, 'paid')`)
    .run(EERSTE, addDays(EERSTE, 1));

  const { booked } = await readCalendar(env, VANDAAG);
  ok('de dag zit aan het plafond', booked[EERSTE] >= ATTENDED_IMAGES_PER_DAY, true);

  const res = await post({ do: 'plan', id: 7, dag: EERSTE });
  ok('en de poort weigert hem als begindag',
    res.headers.get('location'), '/account/plan?tab=bestellen&kies=7&fout=vol');
  ok('  er staat nog steeds geen dag op het item', (await rij()).window_start, null);
}

/* ══ 7 · HET SCHERM ZELF ═════════════════════════════════════════════════ */
console.log('\nhet inplanscherm is een formulier en geen widget');
{
  const bron = (await import('node:fs')).readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');
  /* Dit dashboard draait geen JavaScript — de CSP heeft geen script-src. Een
     kalender die op een klik reageert, moet dus een submit-knop zijn. Deze regel
     is wat voorkomt dat iemand er ooit een handler in schrijft die stil niets doet. */
  ok('elke aanwijsbare dag is een submit-knop',
    /class="kal-dag is-vrij[^"]*" type="submit" name="dag"/.test(bron), true);
  ok('en er staat geen enkele klikafhandeling in dit bestand',
    /addEventListener|onclick=/.test(bron), false);
  /* De inline stijl. Op de rest van dit bestand zoeken helpt niet: er staan twee
     lange noten in die `style="width:58%"` letterlijk citeren, juist omdat het
     daar een keer misging. De vraag geldt dus het inplanscherm zelf, en niet het
     bestand eromheen. */
  const kaart = bron.slice(bron.indexOf('function kalenderKaart'), bron.indexOf('function planBody'));
  ok('de bezetting komt als klasse binnen',  /kal-vul-\$\{/.test(kaart), true);
  ok('en er staat geen inline stijl in het scherm', /style="/.test(kaart), false);
}

/* ══ 8 · ELK GEKOZEN PAAR WORDT ZIJN EIGEN BESTELLING ════════════════════
 *
 * Lucas' keuze, 31 augustus 2026: *"Elk paar zijn eigen bestelling."*
 *
 * DE FOUT DIE DIT REPAREERT WAS VAN MIJ. De klant koos twee dagen, die dagen
 * werden ook echt bezet gehouden — en op het moment dat Lucas op "start deze week"
 * drukte, maakte startPlanWindow() er één bestelling van ZONDER venster. De dagen
 * gingen verloren, en erger: src/lib/agenda.js telt een wachtrij-item alleen mee
 * zolang `taken_at` leeg is, dus de capaciteit kwam vrij op precies het moment dat
 * het werk begon.
 *
 * Er wordt hier dus twee dingen tegelijk nagelezen: dat er per paar één bestelling
 * ontstaat mét die dagen, en dat de agenda die dagen na de overgang nog steeds
 * bezet ziet — nu op de bestelling in plaats van op het wachtrij-item.
 */
console.log('\nelk gekozen dagenpaar wordt zijn eigen bestelling, met de dagen erop');
{
  const eersteDag = EERSTE;
  const paarA = windowFor(eersteDag, KIND_IMAGES.complete, {}, new Set());
  const laterDag = addDays(eersteDag, 10);
  const paarB = windowFor(laterDag, KIND_IMAGES.complete, {}, new Set());

  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM plan_queue');
  db.prepare(`INSERT INTO plan_queue (id, customer_id, position, name, upload_batch, kind, locked_at, window_start, window_end, asap)
              VALUES (11, 1, 0, 'Jas', 'b-11', 'complete', datetime('now'), ?, ?, 0)`).run(paarA[0], paarA[1]);
  db.prepare(`INSERT INTO plan_queue (id, customer_id, position, name, upload_batch, kind, locked_at, window_start, window_end, asap)
              VALUES (12, 1, 1, 'Sjaal', 'b-12', 'complete', datetime('now'), ?, ?, 0)`).run(paarA[0], paarA[1]);
  db.prepare(`INSERT INTO plan_queue (id, customer_id, position, name, upload_batch, kind, locked_at, window_start, window_end, asap)
              VALUES (13, 1, 2, 'Muts', 'b-13', 'complete', datetime('now'), ?, ?, 0)`).run(paarB[0], paarB[1]);
  db.exec(`INSERT INTO plan_queue (id, customer_id, position, name, upload_batch, kind, locked_at, asap)
           VALUES (14, 1, 3, 'Wanten', 'b-14', 'complete', datetime('now'), 1)`);

  const uit = await startPlanWindow(env, 1);
  ok('het starten lukt', uit.ok, true);
  ok('en levert drie bestellingen op', uit.bestellingen?.length, 3);
  ok('met alle vier de producten erin', uit.aantal, 4);

  const orders = db.prepare('SELECT ref, tier, product_count, window_start, window_end FROM orders ORDER BY id ASC').all();
  ok('het eerste paar draagt twee producten', [orders[0].product_count, orders[0].window_start, orders[0].window_end],
    [2, paarA[0], paarA[1]]);
  ok('  en is een gereserveerd venster', orders[0].tier, 'attended');
  ok('het tweede paar draagt er één', [orders[1].product_count, orders[1].window_start, orders[1].window_end],
    [1, paarB[0], paarB[1]]);
  ok('en zo snel mogelijk staat achteraan, zonder dagen',
    [orders[2].product_count, orders[2].window_start, orders[2].window_end], [1, null, null]);
  /* GEEN 'attended' ZONDER DATUM. Dat stond er wel: elke abonnementsbestelling
     kreeg 'attended' terwijl er geen venster in zat, en dat is een gereserveerde
     week zonder week. */
  ok('  en heet dan ook geen gereserveerd venster', orders[2].tier, 'unattended');

  /* ── EN DE DAGEN BLIJVEN BEZET OVER DE OVERGANG HEEN ────────────────────── */
  const na = await readCalendar(env, VANDAAG);
  const perDag = Math.ceil((2 * KIND_IMAGES.complete) / WINDOW_DAYS);
  ok('de agenda ziet de dagen nog steeds bezet', na.booked[paarA[0]], perDag);
  ok('  op allebei de dagen van het paar', na.booked[paarA[1]], perDag);
  ok('en het latere paar ook', na.booked[paarB[0]], Math.ceil(KIND_IMAGES.complete / WINDOW_DAYS));

  /* De wachtrij is leeg: alles is opgepakt en aan een bestelling gehangen. Zou er
     iets zijn blijven staan, dan telde het dubbel — één keer als wachtrij-item en
     één keer als bestelling. */
  ok('er staat niets meer open in de wachtrij',
    telling(db, 'SELECT COUNT(*) FROM plan_queue WHERE taken_at IS NULL'), 0);
  ok('en elk item hangt aan een bestelling',
    telling(db, 'SELECT COUNT(*) FROM plan_queue WHERE order_id IS NULL'), 0);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
