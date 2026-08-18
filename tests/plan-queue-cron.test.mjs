/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE ABONNEMENTSWACHT IN DE NACHTELIJKE TAAK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * checkPlanQueues() in cron/index.js stuurt een klant vijf dagen voor zijn vaste
 * week een bericht als er niets klaarstaat, en zet de uitzonderingen in het
 * nachtverslag van Lucas. Zie ABONNEMENT-ONTWERP.md §7: het normale pad mag hem
 * niet bereiken, alleen uitzonderingen.
 *
 * ── WAAROM TEGEN EEN ECHTE SQLITE EN NIET TEGEN EEN STUB ────────────────────
 *
 * Deze taak bestaat uit drie queries en nul logica. Een stub die op SQL-tekst
 * matcht, bewijst dan alleen dat ik mijn eigen strings kan herkennen. De eerste
 * versie van de INSERT gebruikte een kolom `updated_at` die op app_settings niet
 * bestaat — precies het soort fout dat een tekstmatchende stub vrolijk laat
 * passeren en die in productie elke nacht stil zou falen: nul mails, geen
 * melding, en geen enkele manier om te zien dat er iets mis was.
 *
 * De schemacontrole is dus het halve punt van dit bestand.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { tasks, QUEUE_WATCH } from '../cron/index.js';

let ok_ = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const goed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (goed) ok_ += 1;
  console.log(` ${goed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(60)}${goed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
/* `mislukt` is een ARRAY. `if (mislukt)` is op een lege array waar, en dan
   stopt deze test met de melding dat het schema niet laadde terwijl het prima
   laadde. Eén keer in gelopen; vandaar .length. */
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }

/* De dag waarop de week over vijf dagen begint, uitgerekend met dezelfde functie
   die de taak gebruikt. Niet een vast getal: dan zou deze test op vijf dagen per
   maand slagen en de rest van de maand ook, om de verkeerde reden. */
const nu = new Date();
const over5 = new Date(nu.getTime());
over5.setUTCDate(over5.getUTCDate() + QUEUE_WATCH.QUEUE_WARN_DAYS);
const WEEKDAG = over5.getUTCDate();
const ANDERE_DAG = WEEKDAG === 1 ? 2 : 1;

db.prepare("INSERT INTO customers (id, email, brand) VALUES (1, 'mara@volt.test', 'VOLT')").run();
db.prepare("INSERT INTO customers (id, email, brand) VALUES (2, 'sam@ander.test', 'ANDER')").run();
db.prepare("INSERT INTO customers (id, email, brand) VALUES (3, 'kim@derde.test', 'DERDE')").run();
db.prepare("INSERT INTO customers (id, email, brand) VALUES (4, 'jo@vierde.test', 'VIERDE')").run();

const abo = (id, cust, ref, status, dag, reden = null) =>
  db.prepare(`INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, pause_reason)
              VALUES (?, ?, ?, 'studio', 'monthly', ?, ?, ?)`).run(id, cust, ref, status, dag, reden);

abo(1, 1, 'SUB-LEEG', 'active', WEEKDAG);                       // week komt eraan, niets klaar
abo(2, 2, 'SUB-VOL', 'active', WEEKDAG);                        // week komt eraan, wél klaar
abo(3, 3, 'SUB-VER', 'active', ANDERE_DAG);                     // week nog lang niet
abo(4, 4, 'SUB-STUK', 'paused', WEEKDAG, 'payment_failed');     // gepauzeerd op incasso

// Klant 2 heeft één item mét foto's; klant 1 heeft er één ZONDER foto's.
db.prepare("INSERT INTO plan_queue (customer_id, position, name, upload_batch) VALUES (2, 0, 'Winterjas', 'batch-abc')").run();
db.prepare("INSERT INTO plan_queue (customer_id, position, name, upload_batch) VALUES (1, 0, 'Sjaal', NULL)").run();
// En klant 3 heeft een item dat al is opgepakt — dat telt niet meer mee.
db.prepare("INSERT INTO orders (id, ref, service, status, email) VALUES (77, 'VIS-X', 'catalog', 'delivered', 'kim@derde.test')").run();
db.prepare("INSERT INTO plan_queue (customer_id, position, name, upload_batch, order_id) VALUES (3, 0, 'Broek', 'batch-x', 77)").run();

const gemaild = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = (url, init) => {
  gemaild.push(JSON.parse(init.body).to[0]);
  return Promise.resolve(new Response('{"id":"m"}', { status: 200 }));
};
const env = { DB: d1(db), RESEND_API_KEY: 're_nep', FROM_EMAIL: 'VISUAILS <o@visuails.com>', NOTIFY_EMAIL: 'hello@visuails.com' };

console.log('\nwie er een bericht krijgt, en wie niet');
const regel = await tasks.checkPlanQueues(env);

ok('de klant met een lege wachtrij krijgt bericht', gemaild.includes('mara@volt.test'));
ok('de klant die wel iets klaar heeft staan niet', gemaild.includes('sam@ander.test'), false);
ok('en de klant wiens week nog niet in zicht is ook niet', gemaild.includes('kim@derde.test'), false);
ok('een gepauzeerd abonnement krijgt geen wachtrijmail', gemaild.includes('jo@vierde.test'), false);
ok('precies één mail dus', gemaild.length, 1);

console.log('\nwat er in het nachtverslag komt');
ok('de lege wachtrij staat erin', /SUB-LEEG/.test(regel));
ok('de mislukte incasso ook', /SUB-STUK/.test(regel));
ok('en de gezonde abonnementen niet', /SUB-VOL|SUB-VER/.test(regel), false);

console.log('\néén mail per maand, ook als de taak elke nacht draait');
{
  gemaild.length = 0;
  await tasks.checkPlanQueues(env);
  ok('de tweede nacht gaat er geen tweede mail uit', gemaild.length, 0);
  const rijen = db.prepare("SELECT COUNT(*) AS n FROM app_settings WHERE key LIKE 'queue_warn:%'").get().n;
  ok('en er staat precies één geheugenrij', rijen, 1);
}

console.log('\nde schemacontrole — de kolommen die deze taak aanraakt bestaan echt');
{
  /* Dit is de reden dat dit bestand tegen een echte SQLite draait. De eerste
     versie schreef `updated_at` naar app_settings, en die kolom bestaat daar
     niet. Zonder deze controle zou de taak elke nacht stil omvallen. */
  const kolommen = (tabel) => db.prepare(`PRAGMA table_info(${tabel})`).all().map((r) => r.name);
  const appset = kolommen('app_settings');
  ok('app_settings heeft key en value', appset.includes('key') && appset.includes('value'));
  ok('en géén updated_at — daar ging het mis', appset.includes('updated_at'), false);
  const q = kolommen('plan_queue');
  for (const k of ['customer_id', 'order_id', 'upload_batch']) ok(`plan_queue heeft ${k}`, q.includes(k));
  const s = kolommen('subscriptions');
  for (const k of ['window_day', 'status', 'pause_reason', 'ref']) ok(`subscriptions heeft ${k}`, s.includes(k));
}

console.log('\nzonder database of zonder sleutel valt er niets om');
{
  ok('geen DB: geen regel, geen fout', await tasks.checkPlanQueues({}), '');
  gemaild.length = 0;
  const zonderSleutel = { DB: d1(db), FROM_EMAIL: 'x', NOTIFY_EMAIL: 'y' };
  await tasks.checkPlanQueues(zonderSleutel);
  ok('geen RESEND_API_KEY: geen mail en geen exceptie', gemaild.length, 0);
}

console.log('\nde datumregel klopt over een maandgrens heen');
{
  const w = QUEUE_WATCH.weekBeginntOver;
  // 27 januari + 5 dagen = 1 februari. Geen enkele maandlengte in de som.
  ok('27 jan → 1 feb', w(1, 5, new Date(Date.UTC(2027, 0, 27))));
  ok('en niet de 27e zelf', w(27, 5, new Date(Date.UTC(2027, 0, 27))), false);
  // 24 februari + 5 = 1 maart, ook in een schrikkeljaar (2028 heeft 29 dagen).
  ok('25 feb → 1 mrt in een schrikkeljaar', w(1, 5, new Date(Date.UTC(2028, 1, 25))));
}

globalThis.fetch = echteFetch;
console.log(`\n${ok_}/${totaal} geslaagd`);
if (ok_ !== totaal) process.exit(1);
