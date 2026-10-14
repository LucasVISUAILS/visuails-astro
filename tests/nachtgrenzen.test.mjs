/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE NACHT BINNEN DE GRENZEN — 8 oktober 2026 (punten 9.03 en 9.05)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos het gratis plan voor Workers (V3). Daar mag één nachtelijke run 50
 * databaseverzoeken doen; met PURGE_LIMIT = 400 liep het wissen van een
 * achterstand daar halverwege tegenaan. En de opruiming van de wachtruimte keek
 * alleen naar de eerste 1000 sleutels in R2. Deze test houdt vast:
 *
 *   1 · de meetlat telt wat er gebeurt en verandert er niets aan;
 *   2 · het wissen stopt vóór de grens, met een reserve, en zegt dat;
 *   3 · de wachtruimte wordt pagina voor pagina gelezen, ook voorbij 1000, en een
 *       batch die op de rand van een afgekapte lijst valt, blijft staan;
 *   4 · de hartslag schrijft op met welke sleutel en welke rem de nacht draaide;
 *   5 · een vervallen bestelling krijgt cancelled_at (§17.22);
 *   6 · PURGE_ENABLED is een gewone variabele in cron/wrangler.toml, op "false".
 *
 * Tegen het echte schema.sql, met R2 in het geheugen. Alle adressen verzonnen.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { tasks, INTAKE } from '../cron/index.js';
import cron from '../cron/index.js';
import {
  GRENZEN, RESEND_GRATIS, nieuweMeter, metMeter, meterVan, telFetch, ruimte, drukteRegel, meetRegel, plan,
} from '../src/lib/meetlat.js';

let goed = 0, fout = 0;
function ok(naam, kreeg, verwacht = true, toon) {
  const p = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(toon ?? kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function vers() {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.join(' | '));
  return db;
}

/* Een R2-emmer met list() zoals R2 hem geeft: hoogstens `limit`, alfabetisch,
   met truncated en een cursor. */
function emmer() {
  const objecten = new Map();
  const weg = [];
  let lijsten = 0;
  return {
    objecten, weg,
    get lijsten() { return lijsten; },
    zet(key, dagenOud = 30) { objecten.set(key, { key, size: 1000, uploaded: new Date(Date.now() - dagenOud * 864e5) }); },
    async list({ prefix = '', limit = 1000, cursor } = {}) {
      lijsten++;
      const alle = [...objecten.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const stuk = alle.slice(start, start + Math.min(limit, 1000));
      const verder = start + stuk.length < alle.length;
      return { objects: stuk.map((k) => objecten.get(k)), truncated: verder, ...(verder ? { cursor: String(start + stuk.length) } : {}) };
    },
    async delete(key) { weg.push(key); objecten.delete(key); },
    async get() { return null; },
  };
}

console.log('\nVISUAILS — de nacht binnen de grenzen\n');

/* ══ 1 · DE MEETLAT ═════════════════════════════════════════════════════════ */
console.log('1 · de meetlat telt en verandert niets');
{
  ok('de gratis grenzen staan erin: 50 databaseverzoeken per run', GRENZEN.gratis.d1PerAanroep, 50);
  ok('en 50 verzoeken naar buiten', GRENZEN.gratis.externPerAanroep, 50);
  ok('en 10 ms rekentijd', GRENZEN.gratis.cpuMsPerAanroep, 10);
  ok('Resend gratis: 100 per dag en 3.000 per maand', [RESEND_GRATIS.perDag, RESEND_GRATIS.perMaand], [100, 3000]);
  ok('zonder WORKERS_PLAN geldt het gratis plan', plan({}).naam, 'gratis');
  ok('met WORKERS_PLAN = "betaald" het betaalde', plan({ WORKERS_PLAN: 'betaald' }).naam, 'betaald');
  ok('de bronnen staan in het bestand', /developers\.cloudflare\.com\/workers\/platform\/limits/.test(lees('src/lib/meetlat.js'))
    && /resend\.com\/pricing/.test(lees('src/lib/meetlat.js')), true);

  const db = vers();
  db.exec("INSERT INTO app_settings (key, value) VALUES ('x', 'y')");
  const b = emmer();
  b.zet('intake/aaa/1.jpg');
  const m = nieuweMeter();
  const env = metMeter({ DB: d1(db), UPLOADS: b, ANDERS: 'blijft' }, m);
  const rij = await env.DB.prepare('SELECT value FROM app_settings WHERE key = ?1').bind('x').first();
  await env.DB.prepare('SELECT 1').all();
  await env.DB.batch([env.DB.prepare("INSERT INTO app_settings (key, value) VALUES ('z', 'w')")]);
  await env.UPLOADS.list({ prefix: 'intake/' });
  await env.UPLOADS.delete('intake/aaa/1.jpg');
  ok('de database geeft gewoon antwoord', rij?.value, 'y');
  ok('een batch komt gewoon aan', db.prepare("SELECT value FROM app_settings WHERE key = 'z'").get()?.value, 'w');
  ok('drie databaseverzoeken geteld (batch = één)', m.d1, 3);
  ok('twee R2-verzoeken geteld', m.r2, 2);
  ok('de rest van env blijft staan', env.ANDERS, 'blijft');
  ok('de meter is op te vragen bij het omhulde env', meterVan(env) === m, true);
  ok('en niet bij een los env', meterVan({}), null);

  const echt = globalThis.fetch;
  const nep = async () => new Response('{}');
  globalThis.fetch = nep;
  await telFetch(m, async () => { await fetch('https://voorbeeld.test/a'); await fetch('https://voorbeeld.test/b'); });
  const naderhand = globalThis.fetch;
  globalThis.fetch = echt;
  ok('fetch geteld tijdens het werk', m.extern, 2);
  ok('en daarna staat fetch weer zoals hij stond', naderhand === nep, true);

  ok('een rustige nacht levert geen drukteregel', drukteRegel(nieuweMeter(), {}), null);
  const druk = { ...nieuweMeter(), d1: 40 };
  ok('40 van 50 wel', /40 van de 50 databaseverzoeken/.test(drukteRegel(druk, {}) || ''), true, drukteRegel(druk, {}));
  ok('de meetregel noemt het plan', /plan gratis/.test(meetRegel(druk, {})), true, meetRegel(druk, {}));
  ok('zonder meter is er altijd ruimte', ruimte({}, { d1: 999 }), true);
  const vol = metMeter({}, { ...nieuweMeter(), d1: 31 });
  ok('met 31 gebruikt en 20 reserve: nog één erbij kan niet', ruimte(vol, { d1: 1 }), false);
  const half = metMeter({}, { ...nieuweMeter(), d1: 10 });
  ok('met 10 gebruikt wel', ruimte(half, { d1: 1 }), true);
  ok('op het betaalde plan is 31 niets', ruimte(metMeter({ WORKERS_PLAN: 'betaald' }, { ...nieuweMeter(), d1: 31 }), { d1: 1 }), true);
}

/* ══ 2 · HET WISSEN STOPT VÓÓR DE GRENS ════════════════════════════════════ */
console.log('\n2 · het wissen stopt op tijd');
{
  const db = vers();
  db.exec("INSERT INTO orders (id, ref, email, service, status, closed_at, lang) VALUES (1, 'VIS-OUD-0001', 'klant@voorbeeld.test', 'catalog', 'delivered', datetime('now','-100 days'), 'nl')");
  const b = emmer();
  for (let i = 0; i < 30; i++) {
    db.prepare("INSERT INTO files (order_id, kind, r2_key, filename, bytes) VALUES (1, 'upload', ?, 'f.jpg', 10)").run(`intake/oud/${i}.jpg`);
    b.zet(`intake/oud/${i}.jpg`, 120);
  }
  /* De nacht heeft al 20 databaseverzoeken gebruikt vóór het wissen begint. */
  const m = { ...nieuweMeter(), d1: 20 };
  const env = metMeter({ DB: d1(db), UPLOADS: b, PURGE_ENABLED: 'true' }, m);
  const regel = await tasks.purgeExpiredFiles(env);
  const over = db.prepare('SELECT COUNT(*) AS n FROM files').get().n;
  ok('er is gewist', over < 30, true, over);
  ok('maar niet alles: er bleef ruimte over', over > 0, true, over);
  ok('de meter bleef binnen de grens min de reserve', m.d1 <= GRENZEN.gratis.d1PerAanroep - 20 + 2, true, m.d1);
  ok('elk gewist object is ook zijn rij kwijt', b.weg.length, 30 - over);
  ok('het verslag zegt dat hij op de grens stopte', /Gestopt na \d+ van de 30 op de grens van het gratis plan/.test(regel || ''), true, regel);
  ok('en de meter weet het voor het nachtrapport', m.gestopt.includes('het opruimen'), true);
  ok('de drukteregel noemt het', /het opruimen stopte op tijd/.test(drukteRegel(m, env) || ''), true, drukteRegel(m, env));

  /* Zonder meter (zoals in tests/retention.test.mjs) blijft het gedrag zoals het was. */
  const db2 = vers();
  db2.exec("INSERT INTO orders (id, ref, email, service, status, closed_at, lang) VALUES (1, 'VIS-OUD-0002', 'klant@voorbeeld.test', 'catalog', 'delivered', datetime('now','-100 days'), 'nl')");
  const b2 = emmer();
  for (let i = 0; i < 30; i++) {
    db2.prepare("INSERT INTO files (order_id, kind, r2_key, filename, bytes) VALUES (1, 'upload', ?, 'f.jpg', 10)").run(`intake/oud2/${i}.jpg`);
  }
  await tasks.purgeExpiredFiles({ DB: d1(db2), UPLOADS: b2, PURGE_ENABLED: 'true' });
  ok('zonder meter gaan alle 30 in één keer', db2.prepare('SELECT COUNT(*) AS n FROM files').get().n, 0);

  /* De verslagmodus wijst naar de variabele, niet meer naar een secret. */
  const db3 = vers();
  db3.exec("INSERT INTO orders (id, ref, email, service, status, closed_at, lang) VALUES (1, 'VIS-OUD-0003', 'klant@voorbeeld.test', 'catalog', 'delivered', datetime('now','-100 days'), 'nl')");
  db3.exec("INSERT INTO files (order_id, kind, r2_key, filename, bytes) VALUES (1, 'upload', 'intake/x/1.jpg', 'f.jpg', 10)");
  const verslag = await tasks.purgeExpiredFiles({ DB: d1(db3), UPLOADS: emmer() });
  ok('verslagmodus noemt cron/wrangler.toml', /PURGE_ENABLED in cron\/wrangler\.toml/.test(verslag || ''), true, verslag);
  ok('en niet meer "wrangler secret put"', /secret put/.test(verslag || ''), false, verslag);
  ok('en wijst naar de stappenkaart', /kladblok\/LIVE-STAPPEN\.md/.test(verslag || ''), true, verslag);
}

/* ══ 3 · DE WACHTRUIMTE, VOORBIJ DE EERSTE 1000 ═════════════════════════════ */
console.log('\n3 · de wachtruimte wordt helemaal gelezen');
{
  ok('list() vraagt 1000 per keer', INTAKE.INTAKE_SCAN_LIMIT, 1000);
  ok('en hoogstens een begrensd aantal pagina\'s per nacht', INTAKE.INTAKE_MAX_PAGINAS >= 2 && INTAKE.INTAKE_MAX_PAGINAS <= 50, true, INTAKE.INTAKE_MAX_PAGINAS);

  const db = vers();
  /* Een bestelling die naar batch "bbb-gekoppeld" verwijst: die mag nooit weg. */
  db.exec(`INSERT INTO orders (id, ref, email, service, status, details_json, lang) VALUES (1, 'VIS-WACHT-001', 'klant@voorbeeld.test', 'catalog', 'received', '{"uploads":"bbb-gekoppeld"}', 'nl')`);
  const b = emmer();
  /* 1500 recente bestanden in batch "aaa-…" (alfabetisch vooraan), dan een
     gekoppelde oude batch, dan een verlaten oude batch die pas op pagina 2 staat. */
  for (let i = 0; i < 1500; i++) b.zet(`intake/aaa-recent/${String(i).padStart(4, '0')}.jpg`, 1);
  for (let i = 0; i < 3; i++) b.zet(`intake/bbb-gekoppeld/${i}.jpg`, 30);
  for (let i = 0; i < 4; i++) b.zet(`intake/zzz-verlaten/${i}.jpg`, 30);

  const regel = await tasks.sweepAbandonedIntake({ DB: d1(db), UPLOADS: b });
  ok('de verlaten batch op pagina 2 wordt gevonden', /1 verlaten upload/.test(regel || ''), true, regel);
  ok('met zijn vier bestanden', /4 bestanden/.test(regel || ''), true, regel);
  ok('in verslagmodus wordt niets weggegooid', b.weg.length, 0);
  ok('er zijn twee lijsten opgehaald', b.lijsten, 2);

  const regel2 = await tasks.sweepAbandonedIntake({ DB: d1(db), UPLOADS: b, PURGE_ENABLED: 'true' });
  ok('met de rem los gaat precies die batch weg', b.weg.slice().sort(), ['intake/zzz-verlaten/0.jpg', 'intake/zzz-verlaten/1.jpg', 'intake/zzz-verlaten/2.jpg', 'intake/zzz-verlaten/3.jpg'], b.weg);
  ok('de gekoppelde blijft staan', b.objecten.has('intake/bbb-gekoppeld/0.jpg'), true);
  ok('de recente ook', b.objecten.has('intake/aaa-recent/0000.jpg'), true);
  ok('het verslag noemt het', /4 achtergelaten bestanden/.test(regel2 || ''), true, regel2);
}
{
  /* Afgekapt: de meetlat geeft na één lijst geen ruimte meer. De batch die op de
     rand van pagina 1 valt, kan op pagina 2 doorlopen en blijft dus staan. */
  const db = vers();
  const b = emmer();
  for (let i = 0; i < 998; i++) b.zet(`intake/aaa-oud/${String(i).padStart(4, '0')}.jpg`, 30);
  for (let i = 0; i < 5; i++) b.zet(`intake/bbb-rand/${i}.jpg`, 30);  // 2 op pagina 1, 3 op pagina 2
  const m = { ...nieuweMeter(), d1: 0, r2: GRENZEN.gratis.internPerAanroep - 100 - 1 };
  const env = metMeter({ DB: d1(db), UPLOADS: b }, m);
  const regel = await tasks.sweepAbandonedIntake(env);
  ok('na één lijst gestopt', b.lijsten, 1);
  ok('de batch op de rand telt niet mee', /bbb-rand/.test(regel || '') || / 1000 bestanden/.test(regel || ''), false, regel);
  ok('de meter weet dat de wachtruimte vroeg stopte', m.gestopt.includes('de wachtruimte'), true, m.gestopt);
}

/* ══ 4 · DE HARTSLAG ZEGT MET WELKE SLEUTEL ════════════════════════════════ */
console.log('\n4 · de hartslag schrijft de stand van de nacht weg');
{
  const db = vers();
  const echt = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 200 });
  await cron.scheduled({}, {
    DB: d1(db), UPLOADS: emmer(), MOLLIE_API_KEY: 'live_abcdefghijklmnopqrstuvwxyz0123', PURGE_ENABLED: 'false', WORKERS_PLAN: 'gratis',
  }, { waitUntil() {} });
  globalThis.fetch = echt;
  const lees2 = (k) => db.prepare('SELECT value FROM app_settings WHERE key = ?').get(k)?.value ?? null;
  const modus = JSON.parse(lees2('cron_modus') || '{}');
  ok('cron_last_run staat er', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} · /.test(lees2('cron_last_run') || ''), true, lees2('cron_last_run'));
  ok('cron_modus zegt: mollie live', modus.mollie, 'live');
  ok('en wissen uit', modus.wissen, false);
  ok('en het plan', modus.plan, 'gratis');
  ok('en geen sleutel in de waarde', /abcdefghij/.test(lees2('cron_modus') || ''), false);
  const meting = JSON.parse(lees2('cron_meting') || '{}');
  ok('cron_meting telt de databaseverzoeken van de nacht', meting.d1 > 5 && meting.d1 < 50, true, meting.d1);

  await tasks.heartbeat({ DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', PURGE_ENABLED: 'true' }, 0, 0);
  const m2 = JSON.parse(lees2('cron_modus') || '{}');
  ok('met de testsleutel: mollie test', m2.mollie, 'test');
  ok('met de rem los: wissen aan', m2.wissen, true);
  await tasks.heartbeat({ DB: d1(db) }, 0, 0);
  ok('zonder sleutel: geen', JSON.parse(lees2('cron_modus') || '{}').mollie, 'geen');
}

/* ══ 5 · EEN VERVALLEN BESTELLING KRIJGT cancelled_at (§17.22) ═══════════════ */
console.log('\n5 · vervallen krijgt een datum');
{
  const db = vers();
  db.exec("INSERT INTO customers (id, email, name) VALUES (1, 'klant@voorbeeld.test', 'Proef')");
  db.exec(`INSERT INTO orders (id, ref, customer_id, email, service, status, total_cents, vat_cents, payment_status, created_at, lang)
           VALUES (1, 'VIS-VERVAL-01', 1, 'klant@voorbeeld.test', 'catalog', 'received', 26700, 5607, 'unpaid', datetime('now','-20 days'), 'nl')`);
  db.exec(`INSERT INTO orders (id, ref, customer_id, email, service, status, total_cents, vat_cents, payment_status, created_at, lang, cancelled_at)
           VALUES (2, 'VIS-VERVAL-02', 1, 'klant@voorbeeld.test', 'catalog', 'received', 26700, 5607, 'unpaid', datetime('now','-20 days'), 'nl', '2026-01-01 10:00:00')`);
  const regel = await tasks.cancelStaleApprovals({ DB: d1(db) });
  ok('beide vervallen', /2 onbetaalde bestellingen vervallen/.test(regel || ''), true, regel);
  const r1 = db.prepare('SELECT status, cancelled_at FROM orders WHERE id = 1').get();
  ok('status cancelled', r1.status, 'cancelled');
  ok('en cancelled_at is gezet', /^\d{4}-\d{2}-\d{2} /.test(r1.cancelled_at || ''), true, r1.cancelled_at);
  ok('een datum die er al stond blijft staan', db.prepare('SELECT cancelled_at FROM orders WHERE id = 2').get().cancelled_at, '2026-01-01 10:00:00');
}

/* ══ 6 · DE REM STAAT IN GIT ═══════════════════════════════════════════════ */
console.log('\n6 · PURGE_ENABLED is een gewone variabele');
{
  const toml = lees('cron/wrangler.toml');
  const zonderCommentaar = toml.replace(/^\s*#.*$/gm, '');
  const vars = zonderCommentaar.split(/^\[vars\]\s*$/m)[1]?.split(/^\[/m)[0] || '';
  ok('PURGE_ENABLED staat onder [vars]', /^PURGE_ENABLED\s*=\s*"(true|false)"\s*$/m.test(vars), true);
  ok('en staat op "false" tot na de back-up', /^PURGE_ENABLED\s*=\s*"false"\s*$/m.test(vars), true);
  ok('WORKERS_PLAN staat op "gratis" (V3)', /^WORKERS_PLAN\s*=\s*"gratis"\s*$/m.test(vars), true);
  ok('de botsing met een oud secret staat erbij uitgelegd', /Binding name already in use/.test(toml), true);
  ok('en hoe hij op "true" gaat', /"false"\s*\n?#?\s*wordt "true"/.test(toml), true);
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
